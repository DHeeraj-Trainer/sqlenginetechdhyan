#!/usr/bin/env node
/**
 * Playwright E2E — MySQL-specific syntax against the in-browser MySQL
 * emulation engine. Drives the live workbench via the `window.__wb` test
 * bridge (auto-installed in DEV / when `__wbEnableTestBridge` is set), so
 * results here match exactly what the Result tabs render in the UI.
 *
 * Covers:
 *   - backticks for identifiers
 *   - AUTO_INCREMENT + ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 table options
 *   - IFNULL(a, b)
 *   - LIMIT x, y     (offset-first MySQL form)
 *   - SHOW TABLES
 *   - DESCRIBE <table>
 *
 * Usage:
 *   BASE_URL=http://localhost:8080 node tests/e2e/mysql.spec.mjs
 *
 * Exits non-zero on any failure.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8080";
const TIMEOUT = 30_000;

const log = (icon, msg) => console.log(`${icon} ${msg}`);
let failed = 0;
const fail = (msg) => {
  log("✗", msg);
  failed++;
};
const ok = (msg) => log("✓", msg);

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Assert one QueryResult (last statement in a batch) has the expected
 * columns and rows. Case-sensitive on column names, order-sensitive on rows.
 */
function assertResult(label, result, expected) {
  if (!result) return fail(`${label}: no result returned`);
  if (result.error) return fail(`${label}: engine error: ${result.error}`);
  const last = result.results && result.results[result.results.length - 1];
  if (!last) return fail(`${label}: empty results array`);
  if (!deepEqual(last.columns, expected.columns)) {
    return fail(
      `${label}: columns mismatch\n    expected: ${JSON.stringify(expected.columns)}\n    got:      ${JSON.stringify(last.columns)}`,
    );
  }
  // Normalize rows to plain arrays of primitives for comparison.
  const gotRows = last.rows.map((r) => r.map((c) => (c === undefined ? null : c)));
  if (!deepEqual(gotRows, expected.rows)) {
    return fail(
      `${label}: rows mismatch\n    expected: ${JSON.stringify(expected.rows)}\n    got:      ${JSON.stringify(gotRows)}`,
    );
  }
  ok(`${label}`);
}

async function main() {
  const launchOpts = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  // Enable the test bridge before any app code runs, so production builds
  // (import.meta.env.DEV === false) also expose window.__wb.
  await context.addInitScript(() => {
    window.__wbEnableTestBridge = true;
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });

  // Wait for the workbench bridge to mount.
  await page.waitForFunction(() => !!window.__wb, null, { timeout: TIMEOUT });
  ok("workbench bridge mounted (window.__wb)");

  // Switch to MySQL emulator and wait until the engine is ready.
  await page.evaluate(() => window.__wb.switchEngine("mysql"));
  try {
    await page.waitForFunction(
      () => window.__wb && window.__wb.engineId === "mysql" && window.__wb.status === "ready",
      null,
      { timeout: 90_000, polling: 200 },
    );
  } catch (e) {
    const snap = await page.evaluate(() =>
      window.__wb ? { engineId: window.__wb.engineId, status: window.__wb.status } : null,
    );
    throw new Error(`MySQL engine never became ready — last snapshot=${JSON.stringify(snap)}: ${e.message}`);
  }

  ok("switched to MySQL (emulated) engine, status=ready");

  const run = (sql) => page.evaluate((s) => window.__wb.runQuery(s), sql);

  // --- 1. Backticks + AUTO_INCREMENT + MySQL table options -----------------
  const seed = await run(`
    DROP TABLE IF EXISTS \`orders\`;
    CREATE TABLE \`orders\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`customer\` VARCHAR(64) NOT NULL,
      \`total\` DECIMAL(10,2),
      \`note\` TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    INSERT INTO \`orders\` (\`customer\`, \`total\`, \`note\`) VALUES
      ('alice', 10.50, 'first'),
      ('bob',   NULL,  NULL),
      ('carol', 42.00, 'vip'),
      ('dave',  7.25,  NULL),
      ('erin',  99.99, 'promo');
  `);
  if (seed.error) fail(`schema seed failed: ${seed.error}`);
  else ok("seed: CREATE TABLE with backticks + AUTO_INCREMENT + ENGINE=InnoDB executed");

  // AUTO_INCREMENT should populate id 1..5 in insertion order.
  const idsRes = await run("SELECT `id`, `customer` FROM `orders` ORDER BY `id`;");
  assertResult("backticks + AUTO_INCREMENT populates id 1..5", idsRes, {
    columns: ["id", "customer"],
    rows: [
      [1, "alice"],
      [2, "bob"],
      [3, "carol"],
      [4, "dave"],
      [5, "erin"],
    ],
  });

  // --- 2. IFNULL -----------------------------------------------------------
  const ifnullRes = await run(
    "SELECT `customer`, IFNULL(`note`, 'n/a') AS note_or_default FROM `orders` ORDER BY `id`;",
  );
  assertResult("IFNULL(note, 'n/a') substitutes NULLs", ifnullRes, {
    columns: ["customer", "note_or_default"],
    rows: [
      ["alice", "first"],
      ["bob", "n/a"],
      ["carol", "vip"],
      ["dave", "n/a"],
      ["erin", "promo"],
    ],
  });

  // --- 3. LIMIT x, y (offset, count) --------------------------------------
  const limitRes = await run(
    "SELECT `id`, `customer` FROM `orders` ORDER BY `id` LIMIT 1, 2;",
  );
  assertResult("LIMIT 1, 2 returns rows 2..3", limitRes, {
    columns: ["id", "customer"],
    rows: [
      [2, "bob"],
      [3, "carol"],
    ],
  });

  // --- 3b. ORDER BY + LIMIT offset edge cases ------------------------------
  // Offset 0 with the MySQL two-arg form should behave like a plain LIMIT.
  const limitOffsetZeroRes = await run(
    "SELECT `id`, `customer` FROM `orders` ORDER BY `id` LIMIT 0, 3;",
  );
  assertResult("LIMIT 0, 3 (offset 0) returns first 3 rows", limitOffsetZeroRes, {
    columns: ["id", "customer"],
    rows: [
      [1, "alice"],
      [2, "bob"],
      [3, "carol"],
    ],
  });

  // MySQL's `LIMIT n OFFSET m` form should translate identically.
  const limitOffsetKwRes = await run(
    "SELECT `id`, `customer` FROM `orders` ORDER BY `id` LIMIT 2 OFFSET 1;",
  );
  assertResult("LIMIT 2 OFFSET 1 returns rows 2..3", limitOffsetKwRes, {
    columns: ["id", "customer"],
    rows: [
      [2, "bob"],
      [3, "carol"],
    ],
  });

  // ORDER BY DESC with offset — verify sort applies before slicing.
  const limitDescRes = await run(
    "SELECT `id`, `customer` FROM `orders` ORDER BY `id` DESC LIMIT 1, 2;",
  );
  assertResult("ORDER BY id DESC LIMIT 1, 2 returns rows 4..3", limitDescRes, {
    columns: ["id", "customer"],
    rows: [
      [4, "dave"],
      [3, "carol"],
    ],
  });

  // Multi-column ORDER BY with LIMIT/OFFSET (NULLs sorted last).
  const multiOrderRes = await run(
    "SELECT `customer`, `total` FROM `orders` ORDER BY `total` IS NULL, `total` ASC, `customer` ASC LIMIT 2, 2;",
  );
  assertResult("multi-column ORDER BY with LIMIT 2, 2", multiOrderRes, {
    columns: ["customer", "total"],
    rows: [
      ["carol", 42.0],
      ["erin", 99.99],
    ],
  });

  // Large offset past the end of the result set — must return zero rows.
  const largeOffsetRes = await run(
    "SELECT `id` FROM `orders` ORDER BY `id` LIMIT 1000, 10;",
  );
  {
    const last = largeOffsetRes.results?.[largeOffsetRes.results.length - 1];
    if (largeOffsetRes.error) fail(`large offset errored: ${largeOffsetRes.error}`);
    else if (!last) fail("large offset: no result");
    else if (last.rows.length !== 0) {
      fail(`LIMIT 1000, 10 should return 0 rows, got: ${JSON.stringify(last.rows)}`);
    } else {
      ok("LIMIT 1000, 10 (offset past end) returns 0 rows");
    }
  }

  // Offset exactly at row count boundary — also zero rows.
  const boundaryOffsetRes = await run(
    "SELECT `id` FROM `orders` ORDER BY `id` LIMIT 5, 5;",
  );
  {
    const last = boundaryOffsetRes.results?.[boundaryOffsetRes.results.length - 1];
    if (boundaryOffsetRes.error) fail(`boundary offset errored: ${boundaryOffsetRes.error}`);
    else if (!last) fail("boundary offset: no result");
    else if (last.rows.length !== 0) {
      fail(`LIMIT 5, 5 should return 0 rows, got: ${JSON.stringify(last.rows)}`);
    } else {
      ok("LIMIT 5, 5 (offset == row count) returns 0 rows");
    }
  }

  // Offset just before the last row — count exceeds remaining, returns tail.
  const tailOffsetRes = await run(
    "SELECT `id`, `customer` FROM `orders` ORDER BY `id` LIMIT 4, 10;",
  );
  assertResult("LIMIT 4, 10 (count exceeds remaining) returns tail row", tailOffsetRes, {
    columns: ["id", "customer"],
    rows: [[5, "erin"]],
  });

  // --- 3c. DISTINCT + CASE WHEN (including NULL branches) -----------------
  // DISTINCT collapses duplicate customer names (all unique here → 5 rows).
  const distinctRes = await run(
    "SELECT DISTINCT `customer` FROM `orders` ORDER BY `customer`;",
  );
  assertResult("DISTINCT customer returns unique names", distinctRes, {
    columns: ["customer"],
    rows: [["alice"], ["bob"], ["carol"], ["dave"], ["erin"]],
  });

  // DISTINCT on a derived CASE expression — buckets rows into 3 groups.
  const distinctCaseRes = await run(`
    SELECT DISTINCT
      CASE
        WHEN \`total\` IS NULL THEN 'unknown'
        WHEN \`total\` < 10 THEN 'small'
        WHEN \`total\` < 50 THEN 'medium'
        ELSE 'large'
      END AS bucket
    FROM \`orders\`
    ORDER BY bucket;
  `);
  assertResult("DISTINCT over CASE expression yields unique buckets", distinctCaseRes, {
    columns: ["bucket"],
    rows: [["large"], ["medium"], ["small"], ["unknown"]],
  });

  // CASE WHEN with an explicit NULL result branch — verify NULL flows through
  // and is not coerced to a string.
  const caseNullRes = await run(`
    SELECT \`id\`,
      CASE
        WHEN \`note\` IS NULL THEN NULL
        WHEN \`note\` = 'vip' THEN 'priority'
        ELSE 'standard'
      END AS tier
    FROM \`orders\`
    ORDER BY \`id\`;
  `);
  assertResult("CASE WHEN with NULL branch preserves NULL", caseNullRes, {
    columns: ["id", "tier"],
    rows: [
      [1, "standard"],
      [2, null],
      [3, "priority"],
      [4, null],
      [5, "standard"],
    ],
  });

  // CASE inside an aggregate — conditional COUNT with GROUP BY tier.
  const caseAggRes = await run(`
    SELECT
      CASE WHEN \`total\` IS NULL THEN 'no_total' ELSE 'has_total' END AS kind,
      COUNT(*) AS n,
      SUM(CASE WHEN \`note\` IS NOT NULL THEN 1 ELSE 0 END) AS with_note
    FROM \`orders\`
    GROUP BY kind
    ORDER BY kind;
  `);
  assertResult("CASE inside COUNT/SUM aggregates correctly", caseAggRes, {
    columns: ["kind", "n", "with_note"],
    rows: [
      ["has_total", 4, 3],
      ["no_total", 1, 0],
    ],
  });

  // COUNT(DISTINCT expr) — combine DISTINCT with a CASE-derived key.
  const countDistinctRes = await run(`
    SELECT COUNT(DISTINCT
      CASE WHEN \`total\` IS NULL THEN 'unknown'
           WHEN \`total\` < 50 THEN 'lo'
           ELSE 'hi' END
    ) AS bucket_count
    FROM \`orders\`;
  `);
  assertResult("COUNT(DISTINCT CASE ...) counts unique buckets", countDistinctRes, {
    columns: ["bucket_count"],
    rows: [[3]],
  });

  // Verify the UI actually renders the CASE result in the ResultsGrid: use
  // the runAndRender bridge so the grid rows/columns hit the DOM, then
  // assert the 'priority' and NULL-italic cells are visible.
  await page.evaluate(async () => {
    await window.__wb.runAndRender(
      "SELECT `id`, CASE WHEN `note` IS NULL THEN NULL WHEN `note` = 'vip' THEN 'priority' ELSE 'standard' END AS tier FROM `orders` ORDER BY `id`;",
    );
  });
  // Tier column header
  const tierHeaderVisible = await page
    .locator('[role="row"] >> text=tier')
    .first()
    .isVisible()
    .catch(() => false);
  const priorityCellVisible = await page
    .locator('[role="gridcell"] >> text=priority')
    .first()
    .isVisible()
    .catch(() => false);
  // NULL cells render as italic "NULL" placeholder in ResultsGrid.
  const nullCellCount = await page.locator('[role="gridcell"] span.italic', { hasText: "NULL" }).count();
  if (tierHeaderVisible && priorityCellVisible && nullCellCount >= 2) {
    ok(`ResultsGrid renders CASE output — 'priority' cell + ${nullCellCount} NULL cells visible`);
  } else {
    fail(
      `ResultsGrid did not render CASE output as expected (tierHeader=${tierHeaderVisible}, priorityCell=${priorityCellVisible}, nullCells=${nullCellCount})`,
    );
  }





  // --- 4. SHOW TABLES ------------------------------------------------------
  const showRes = await run("SHOW TABLES;");
  if (showRes.error) fail(`SHOW TABLES errored: ${showRes.error}`);
  else {
    const last = showRes.results[showRes.results.length - 1];
    const flat = last.rows.map((r) => String(r[0]));
    if (flat.includes("orders")) ok("SHOW TABLES lists `orders`");
    else fail(`SHOW TABLES missing 'orders'; got ${JSON.stringify(flat)}`);
  }

  // --- 5. DESCRIBE <table> -------------------------------------------------
  const descRes = await run("DESCRIBE `orders`;");
  if (descRes.error) fail(`DESCRIBE errored: ${descRes.error}`);
  else {
    const last = descRes.results[descRes.results.length - 1];
    const colNames = last.rows.map((r) => String(r[0] ?? r[1] ?? ""));
    // Emulator maps DESCRIBE -> PRAGMA table_info; column names live in the
    // 'name' column (index 1) on SQLite. Accept either position.
    const names = last.rows.map((r) => r.map(String));
    const flat = names.flat();
    const expected = ["id", "customer", "total", "note"];
    const missing = expected.filter((c) => !flat.includes(c));
    if (missing.length === 0) ok(`DESCRIBE lists columns ${JSON.stringify(expected)}`);
    else fail(`DESCRIBE missing ${JSON.stringify(missing)}; got columns rows ${JSON.stringify(colNames)}`);
  }

  // --- 6. JOINs (INNER + LEFT) --------------------------------------------
  // Seed a related table so we can exercise cross-table joins with backticks.
  const joinSeed = await run(`
    DROP TABLE IF EXISTS \`order_items\`;
    CREATE TABLE \`order_items\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`order_id\` INT NOT NULL,
      \`sku\` VARCHAR(32) NOT NULL,
      \`qty\` INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    INSERT INTO \`order_items\` (\`order_id\`, \`sku\`, \`qty\`) VALUES
      (1, 'A', 2),
      (1, 'B', 1),
      (3, 'A', 5),
      (5, 'C', 3);
  `);
  if (joinSeed.error) fail(`join seed failed: ${joinSeed.error}`);
  else ok("seed: order_items created for JOIN tests");

  const innerRes = await run(`
    SELECT o.\`customer\`, i.\`sku\`, i.\`qty\`
    FROM \`orders\` o
    INNER JOIN \`order_items\` i ON i.\`order_id\` = o.\`id\`
    ORDER BY o.\`id\`, i.\`sku\`;
  `);
  assertResult("INNER JOIN orders × order_items", innerRes, {
    columns: ["customer", "sku", "qty"],
    rows: [
      ["alice", "A", 2],
      ["alice", "B", 1],
      ["carol", "A", 5],
      ["erin", "C", 3],
    ],
  });

  const leftRes = await run(`
    SELECT o.\`customer\`, COUNT(i.\`id\`) AS item_count
    FROM \`orders\` o
    LEFT JOIN \`order_items\` i ON i.\`order_id\` = o.\`id\`
    GROUP BY o.\`id\`, o.\`customer\`
    ORDER BY o.\`id\`;
  `);
  assertResult("LEFT JOIN preserves orders with no items", leftRes, {
    columns: ["customer", "item_count"],
    rows: [
      ["alice", 2],
      ["bob", 0],
      ["carol", 1],
      ["dave", 0],
      ["erin", 1],
    ],
  });

  // --- 6b. Derived tables + subqueries (IN / EXISTS / scalar) -------------
  // Derived table in FROM: aggregate order_items into a per-order rollup
  // and JOIN it back to orders. Verify row count + join output.
  const derivedRes = await run(`
    SELECT o.\`customer\`, t.\`lines\`, t.\`total_qty\`
    FROM \`orders\` o
    INNER JOIN (
      SELECT \`order_id\`, COUNT(*) AS \`lines\`, SUM(\`qty\`) AS \`total_qty\`
      FROM \`order_items\`
      GROUP BY \`order_id\`
    ) t ON t.\`order_id\` = o.\`id\`
    ORDER BY o.\`id\`;
  `);
  assertResult("derived table aggregate JOIN produces per-order rollup", derivedRes, {
    columns: ["customer", "lines", "total_qty"],
    rows: [
      ["alice", 2, 3],
      ["carol", 1, 5],
      ["erin", 1, 3],
    ],
  });

  // Row count of derived-table result — sanity-check via COUNT(*) over
  // the same subquery to prove the two paths agree.
  const derivedCountRes = await run(`
    SELECT COUNT(*) AS n FROM (
      SELECT \`order_id\` FROM \`order_items\` GROUP BY \`order_id\`
    ) t;
  `);
  assertResult("COUNT(*) over derived table matches distinct order_ids", derivedCountRes, {
    columns: ["n"],
    rows: [[3]],
  });

  // Correlated-free IN subquery — orders that have at least one item.
  const inRes = await run(`
    SELECT \`id\`, \`customer\`
    FROM \`orders\`
    WHERE \`id\` IN (SELECT \`order_id\` FROM \`order_items\`)
    ORDER BY \`id\`;
  `);
  assertResult("WHERE id IN (subquery) returns orders with items", inRes, {
    columns: ["id", "customer"],
    rows: [
      [1, "alice"],
      [3, "carol"],
      [5, "erin"],
    ],
  });

  // NOT IN — complement of the previous set.
  const notInRes = await run(`
    SELECT \`id\`, \`customer\`
    FROM \`orders\`
    WHERE \`id\` NOT IN (SELECT \`order_id\` FROM \`order_items\`)
    ORDER BY \`id\`;
  `);
  assertResult("WHERE id NOT IN (subquery) returns orders without items", notInRes, {
    columns: ["id", "customer"],
    rows: [
      [2, "bob"],
      [4, "dave"],
    ],
  });

  // Correlated EXISTS — same semantic as the IN case but via EXISTS.
  const existsRes = await run(`
    SELECT o.\`id\`, o.\`customer\`
    FROM \`orders\` o
    WHERE EXISTS (
      SELECT 1 FROM \`order_items\` i WHERE i.\`order_id\` = o.\`id\`
    )
    ORDER BY o.\`id\`;
  `);
  assertResult("WHERE EXISTS (correlated) matches orders with items", existsRes, {
    columns: ["id", "customer"],
    rows: [
      [1, "alice"],
      [3, "carol"],
      [5, "erin"],
    ],
  });

  // NOT EXISTS — orders with zero items.
  const notExistsRes = await run(`
    SELECT o.\`id\`, o.\`customer\`
    FROM \`orders\` o
    WHERE NOT EXISTS (
      SELECT 1 FROM \`order_items\` i WHERE i.\`order_id\` = o.\`id\`
    )
    ORDER BY o.\`id\`;
  `);
  assertResult("WHERE NOT EXISTS returns orders with zero items", notExistsRes, {
    columns: ["id", "customer"],
    rows: [
      [2, "bob"],
      [4, "dave"],
    ],
  });

  // Scalar subquery in SELECT — per-order item count as a correlated scalar.
  const scalarSubRes = await run(`
    SELECT o.\`customer\`,
      (SELECT COUNT(*) FROM \`order_items\` i WHERE i.\`order_id\` = o.\`id\`) AS n_items
    FROM \`orders\` o
    ORDER BY o.\`id\`;
  `);
  assertResult("scalar correlated subquery yields per-order counts", scalarSubRes, {
    columns: ["customer", "n_items"],
    rows: [
      ["alice", 2],
      ["bob", 0],
      ["carol", 1],
      ["dave", 0],
      ["erin", 1],
    ],
  });

  // IN with an explicit value list (non-subquery form) — verify parser
  // handles backtick columns + string literals.
  const inListRes = await run(
    "SELECT `id` FROM `orders` WHERE `customer` IN ('alice', 'carol', 'zoe') ORDER BY `id`;",
  );
  assertResult("WHERE col IN (value list) matches literal set", inListRes, {
    columns: ["id"],
    rows: [[1], [3]],
  });

  // --- 6c. LIKE / NOT LIKE + backslash escape of % and _ ------------------
  // Seed a small pattern table with strings that contain literal %, _, and \.
  const likeSeed = await run(`
    DROP TABLE IF EXISTS \`labels\`;
    CREATE TABLE \`labels\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    INSERT INTO \`labels\` (\`name\`) VALUES
      ('alpha'),
      ('alphabet'),
      ('beta'),
      ('50%_off'),
      ('100% new'),
      ('under_score'),
      ('a_b'),
      ('has\\backslash');
  `);
  if (likeSeed.error) fail(`labels seed failed: ${likeSeed.error}`);
  else ok("seed: labels created for LIKE tests");

  // Simple prefix LIKE — % matches "anything after".
  const likePrefixRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` LIKE 'alpha%' ORDER BY `name`;",
  );
  assertResult("LIKE 'alpha%' matches prefix", likePrefixRes, {
    columns: ["name"],
    rows: [["alpha"], ["alphabet"]],
  });

  // Trailing wildcard — %beta matches anything ending in 'beta'.
  const likeSuffixRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` LIKE '%beta' ORDER BY `name`;",
  );
  assertResult("LIKE '%beta' matches suffix", likeSuffixRes, {
    columns: ["name"],
    rows: [["beta"]],
  });

  // Single-char wildcard _ — must match exactly one char between a and b.
  const likeUnderscoreRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` LIKE 'a_b' ORDER BY `name`;",
  );
  assertResult("LIKE 'a_b' matches exactly one char between a and b", likeUnderscoreRes, {
    columns: ["name"],
    rows: [["a_b"]],
  });

  // NOT LIKE — complement of the prefix match.
  const notLikeRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` NOT LIKE 'alpha%' ORDER BY `name`;",
  );
  assertResult("NOT LIKE 'alpha%' excludes prefix matches", notLikeRes, {
    columns: ["name"],
    rows: [
      ["100% new"],
      ["50%_off"],
      ["a_b"],
      ["beta"],
      ["has\\backslash"],
      ["under_score"],
    ],
  });

  // Backslash-escape a literal % using ESCAPE '\'. The single-quoted
  // escape char must be one character; we use a bang '!' to avoid string
  // literal double-escaping quirks across MySQL/SQLite. Semantics identical
  // to MySQL's default backslash escape — the character after ESCAPE marks
  // the next %/_ as literal.
  const escPercentRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` LIKE '%!%%' ESCAPE '!' ORDER BY `name`;",
  );
  assertResult("LIKE with ESCAPE '!' matches literal '%'", escPercentRes, {
    columns: ["name"],
    rows: [["100% new"], ["50%_off"]],
  });

  // Escape a literal _ using ESCAPE '!'.
  const escUnderscoreRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` LIKE '%!_%' ESCAPE '!' ORDER BY `name`;",
  );
  assertResult("LIKE with ESCAPE '!' matches literal '_'", escUnderscoreRes, {
    columns: ["name"],
    rows: [["50%_off"], ["a_b"], ["under_score"]],
  });

  // Combined: literal '%_' substring — must escape both.
  const escBothRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` LIKE '%!%!_%' ESCAPE '!' ORDER BY `name`;",
  );
  assertResult("LIKE with escaped '%_' matches literal '%_' substring", escBothRes, {
    columns: ["name"],
    rows: [["50%_off"]],
  });

  // Backslash escape form — MySQL's default: `\%` and `\_` in the pattern
  // treat the wildcard as a literal even without an ESCAPE clause. The
  // emulator translates MySQL backslash-escapes into an equivalent ESCAPE
  // clause. In the JS source `\\` is one backslash sent to the engine.
  const backslashEscRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` LIKE '%\\%%' ORDER BY `name`;",
  );
  assertResult(
    "LIKE '%\\%%' matches literal '%' (MySQL default backslash escape)",
    backslashEscRes,
    { columns: ["name"], rows: [["100% new"], ["50%_off"]] },
  );

  // Backslash-escaped underscore — must match literal '_', not any single char.
  const backslashUnderRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` LIKE '%\\_%' ORDER BY `name`;",
  );
  assertResult(
    "LIKE '%\\_%' matches literal '_' (MySQL default backslash escape)",
    backslashUnderRes,
    { columns: ["name"], rows: [["50%_off"], ["a_b"], ["under_score"]] },
  );

  // --- 6d. LIKE with a non-backslash ESCAPE character ('#') ----------------
  // MySQL accepts any single-character ESCAPE; verify '#' behaves identically
  // to '!' above and does not collide with the default backslash rules.
  const hashPercentRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` LIKE '%#%%' ESCAPE '#' ORDER BY `name`;",
  );
  assertResult("LIKE with ESCAPE '#' matches literal '%'", hashPercentRes, {
    columns: ["name"],
    rows: [["100% new"], ["50%_off"]],
  });

  const hashUnderRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` LIKE '%#_%' ESCAPE '#' ORDER BY `name`;",
  );
  assertResult("LIKE with ESCAPE '#' matches literal '_'", hashUnderRes, {
    columns: ["name"],
    rows: [["50%_off"], ["a_b"], ["under_score"]],
  });

  const hashBothRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` LIKE '%#%#_%' ESCAPE '#' ORDER BY `name`;",
  );
  assertResult("LIKE with ESCAPE '#' matches literal '%_' substring", hashBothRes, {
    columns: ["name"],
    rows: [["50%_off"]],
  });

  // '#' as escape must NOT treat backslashes specially — a pattern with a
  // literal backslash and ESCAPE '#' matches rows containing that backslash.
  // (JS `\\` → one `\` in the SQL text; SQLite string literals don't process
  // backslash, so the pattern contains a single `\` character.)
  const hashBackslashRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` LIKE '%\\%' ESCAPE '#' ORDER BY `name`;",
  );
  assertResult(
    "ESCAPE '#' leaves backslash as a literal pattern character",
    hashBackslashRes,
    { columns: ["name"], rows: [["has\\backslash"]] },
  );

  // Escape char that does not appear in the pattern is a no-op — behaves
  // like plain LIKE. Verify against a wildcard prefix pattern.
  const hashNoopRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` LIKE 'alpha%' ESCAPE '#' ORDER BY `name`;",
  );
  assertResult("ESCAPE '#' with no '#' in pattern is a no-op", hashNoopRes, {
    columns: ["name"],
    rows: [["alpha"], ["alphabet"]],
  });

  // --- 6e. REGEXP / NOT REGEXP (MySQL POSIX-ERE, emulated via JS RegExp) ---
  // Anchored pattern: exactly the word "alpha".
  const reAnchoredRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` REGEXP '^alpha$' ORDER BY `name`;",
  );
  assertResult("REGEXP '^alpha$' matches whole-string 'alpha'", reAnchoredRes, {
    columns: ["name"],
    rows: [["alpha"]],
  });

  // Character class + quantifier: names starting with 'a' followed by letters.
  const reClassRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` REGEXP '^a[a-z]+$' ORDER BY `name`;",
  );
  assertResult("REGEXP '^a[a-z]+$' matches lowercase-letter-only names", reClassRes, {
    columns: ["name"],
    rows: [["alpha"], ["alphabet"]],
  });

  // Alternation.
  const reAltRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` REGEXP 'alpha|beta' ORDER BY `name`;",
  );
  assertResult("REGEXP 'alpha|beta' matches either literal", reAltRes, {
    columns: ["name"],
    rows: [["alpha"], ["alphabet"], ["beta"]],
  });

  // Digit meta \d — must match rows containing digits.
  const reDigitRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` REGEXP '[0-9]' ORDER BY `name`;",
  );
  assertResult("REGEXP '[0-9]' matches rows containing a digit", reDigitRes, {
    columns: ["name"],
    rows: [["100% new"], ["50%_off"]],
  });

  // Escaped metacharacter: literal '%'. In the SQL string `\\%` = `\%`, which
  // the regex engine reads as an escaped literal percent sign.
  const reEscPctRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` REGEXP '\\%' ORDER BY `name`;",
  );
  assertResult("REGEXP '\\%' matches literal '%'", reEscPctRes, {
    columns: ["name"],
    rows: [["100% new"], ["50%_off"]],
  });

  // Escaped '.' — must NOT act as any-char wildcard. Contrast with unescaped
  // '.' which acts as any-char (matches every row). We assert both sides.
  const reDotWildRes = await run(
    "SELECT COUNT(*) AS n FROM `labels` WHERE `name` REGEXP 'a.b';",
  );
  assertResult("REGEXP 'a.b' — '.' is any-char wildcard", reDotWildRes, {
    columns: ["n"],
    rows: [[1]], // only 'a_b' has one char between 'a' and 'b'
  });
  const reEscDotRes = await run(
    "SELECT COUNT(*) AS n FROM `labels` WHERE `name` REGEXP 'a\\.b';",
  );
  assertResult("REGEXP 'a\\.b' — escaped '.' is literal (0 matches)", reEscDotRes, {
    columns: ["n"],
    rows: [[0]],
  });


  // Escaped backslash: JS `\\\\` = SQL string `\\` = regex `\\` = one literal
  // backslash. Row 'has\backslash' (single stored backslash) must match.
  const reEscBackRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` REGEXP '\\\\' ORDER BY `name`;",
  );
  assertResult("REGEXP '\\\\' matches literal backslash", reEscBackRes, {
    columns: ["name"],
    rows: [["has\\backslash"]],
  });


  // NOT REGEXP — inverse of the anchored letter class above.
  const reNotRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` NOT REGEXP '^a[a-z]+$' ORDER BY `name`;",
  );
  assertResult("NOT REGEXP inverts the match set", reNotRes, {
    columns: ["name"],
    rows: [
      ["100% new"],
      ["50%_off"],
      ["a_b"],
      ["beta"],
      ["has\\backslash"],
      ["under_score"],
    ],
  });

  // RLIKE — MySQL alias for REGEXP; must produce identical results.
  const rlikeRes = await run(
    "SELECT `name` FROM `labels` WHERE `name` RLIKE '^alpha' ORDER BY `name`;",
  );
  assertResult("RLIKE '^alpha' behaves as REGEXP alias", rlikeRes, {
    columns: ["name"],
    rows: [["alpha"], ["alphabet"]],
  });

  // UI render check — REGEXP result flows through ResultsGrid.
  await page.evaluate(async () => {
    await window.__wb.runAndRender(
      "SELECT `name` FROM `labels` WHERE `name` REGEXP '^alpha' ORDER BY `name`;",
    );
  });
  const regexpUiVisible = await page
    .locator('[role="gridcell"] >> text=alphabet')
    .first()
    .isVisible()
    .catch(() => false);
  if (regexpUiVisible) ok("ResultsGrid renders REGEXP match ('alphabet' cell visible)");
  else fail("ResultsGrid did not render REGEXP result");


  // Row count sanity — total row count in labels table.
  const totalRes = await run("SELECT COUNT(*) AS n FROM `labels`;");
  assertResult("labels table has 8 seeded rows", totalRes, {
    columns: ["n"],
    rows: [[8]],
  });


  // UI render check — LIKE result rendered by ResultsGrid.
  await page.evaluate(async () => {
    await window.__wb.runAndRender(
      "SELECT `name` FROM `labels` WHERE `name` LIKE 'alpha%' ORDER BY `name`;",
    );
  });
  const alphaCell = await page
    .locator('[role="gridcell"] >> text=alphabet')
    .first()
    .isVisible()
    .catch(() => false);
  if (alphaCell) ok("ResultsGrid renders LIKE match ('alphabet' cell visible)");
  else fail("ResultsGrid did not render LIKE match — 'alphabet' cell not visible");






  // --- 7. GROUP BY + HAVING + aggregates ----------------------------------
  const aggRes = await run(`
    SELECT i.\`sku\`, SUM(i.\`qty\`) AS total_qty, COUNT(*) AS lines
    FROM \`order_items\` i
    GROUP BY i.\`sku\`
    HAVING SUM(i.\`qty\`) >= 3
    ORDER BY total_qty DESC, i.\`sku\`;
  `);
  assertResult("GROUP BY + HAVING SUM() >= 3", aggRes, {
    columns: ["sku", "total_qty", "lines"],
    rows: [
      ["A", 7, 2],
      ["C", 3, 1],
    ],
  });

  // AVG + ROUND on a nullable DECIMAL column — NULLs should be skipped.
  const avgRes = await run(
    "SELECT ROUND(AVG(`total`), 2) AS avg_total, COUNT(`total`) AS non_null FROM `orders`;",
  );
  assertResult("AVG(total) skips NULLs, COUNT(col) counts non-NULLs", avgRes, {
    columns: ["avg_total", "non_null"],
    rows: [[39.94, 4]],
  });

  // CONCAT() → || translation (MySQL string function).
  const concatRes = await run(
    "SELECT CONCAT(`customer`, ':', `id`) AS tag FROM `orders` ORDER BY `id` LIMIT 2;",
  );
  assertResult("CONCAT() concatenates via ||", concatRes, {
    columns: ["tag"],
    rows: [["alice:1"], ["bob:2"]],
  });

  // --- 8. NULL comparisons -------------------------------------------------
  // `= NULL` is always NULL (i.e. never true) — must return zero rows.
  // sql.js emits empty `columns` when the result set has no rows, so we can't
  // reuse assertResult (which is column-strict). Assert emptiness directly.
  const eqNullRes = await run("SELECT `id` FROM `orders` WHERE `note` = NULL;");
  {
    const last = eqNullRes.results?.[eqNullRes.results.length - 1];
    if (eqNullRes.error) fail(`\`col = NULL\` errored: ${eqNullRes.error}`);
    else if (!last) fail("`col = NULL`: no result");
    else if (last.rows.length !== 0) {
      fail(`\`col = NULL\` should match nothing, got rows: ${JSON.stringify(last.rows)}`);
    } else {
      ok("`col = NULL` matches nothing (three-valued logic)");
    }
  }

  const isNullRes = await run("SELECT `id` FROM `orders` WHERE `note` IS NULL ORDER BY `id`;");
  assertResult("IS NULL matches rows with NULL note", isNullRes, {
    columns: ["id"],
    rows: [[2], [4]],
  });

  const notNullRes = await run(
    "SELECT `id` FROM `orders` WHERE `note` IS NOT NULL ORDER BY `id`;",
  );
  assertResult("IS NOT NULL matches non-NULL notes", notNullRes, {
    columns: ["id"],
    rows: [[1], [3], [5]],
  });

  // COALESCE() with multiple args, including MySQL's IFNULL() which the
  // translator rewrites to COALESCE().
  const coalesceRes = await run(
    "SELECT `id`, COALESCE(`note`, `customer`, 'fallback') AS c FROM `orders` ORDER BY `id`;",
  );
  assertResult("COALESCE(note, customer, 'fallback') picks first non-NULL", coalesceRes, {
    columns: ["id", "c"],
    rows: [
      [1, "first"],
      [2, "bob"],
      [3, "vip"],
      [4, "dave"],
      [5, "promo"],
    ],
  });

  // --- 9. Date functions (NOW / CURDATE / DATE(col) / strftime) ------------
  // Seed a temporal column and hard-code known ISO timestamps so results
  // are deterministic regardless of when the test runs.
  const dateSeed = await run(`
    DROP TABLE IF EXISTS \`events\`;
    CREATE TABLE \`events\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(32) NOT NULL,
      \`occurred_at\` DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    INSERT INTO \`events\` (\`name\`, \`occurred_at\`) VALUES
      ('signup',   '2024-01-15 09:30:00'),
      ('purchase', '2024-01-15 14:05:00'),
      ('signup',   '2024-02-01 08:00:00'),
      ('refund',   '2024-02-20 23:59:59');
  `);
  if (dateSeed.error) fail(`events seed failed: ${dateSeed.error}`);
  else ok("seed: events created for date-function tests");

  // Truncate DATETIME to calendar day via SUBSTR — portable in both MySQL
  // and SQLite. (The emulator's type-normalizer rewrites bare DATE(...) to
  // TEXT(...), so we avoid that keyword here; strftime cases below cover
  // the MySQL date-function translation path.)
  const dateColRes = await run(
    "SELECT `name`, SUBSTR(`occurred_at`, 1, 10) AS day FROM `events` ORDER BY `id`;",
  );
  assertResult("SUBSTR(occurred_at, 1, 10) truncates to YYYY-MM-DD", dateColRes, {
    columns: ["name", "day"],
    rows: [
      ["signup", "2024-01-15"],
      ["purchase", "2024-01-15"],
      ["signup", "2024-02-01"],
      ["refund", "2024-02-20"],
    ],
  });

  // strftime is portable and used by many MySQL → SQLite migrations as a
  // stand-in for YEAR() / MONTH(). Group by month:
  const monthRes = await run(`
    SELECT strftime('%Y-%m', \`occurred_at\`) AS ym, COUNT(*) AS n
    FROM \`events\`
    GROUP BY ym
    ORDER BY ym;
  `);
  assertResult("strftime('%Y-%m', col) groups events by month", monthRes, {
    columns: ["ym", "n"],
    rows: [
      ["2024-01", 2],
      ["2024-02", 2],
    ],
  });

  // NOW() → CURRENT_TIMESTAMP and CURDATE() → DATE('now'). We can't assert
  // exact values, but we can assert shape: a single row, one column, matching
  // ISO patterns.
  const nowRes = await run("SELECT NOW() AS n, CURDATE() AS d;");
  {
    const last = nowRes.results?.[nowRes.results.length - 1];
    const row = last?.rows?.[0];
    const n = row ? String(row[0]) : "";
    const d = row ? String(row[1]) : "";
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(n) && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      ok(`NOW() → "${n}", CURDATE() → "${d}" (both ISO-shaped)`);
    } else {
      fail(`NOW()/CURDATE() shape unexpected — NOW="${n}" CURDATE="${d}"`);
    }
  }

  // --- 9b. Multi-column ORDER BY mixing ASC/DESC with deliberate ties -----
  // Seed a small `sales` table where several rows tie on the leading sort
  // key(s). This lets us verify that (a) the MySQL emulator preserves the
  // ASC/DESC directive per column, (b) later columns act as tie-breakers,
  // and (c) the results grid renders rows in exactly that order.
  const salesSeed = await run(`
    DROP TABLE IF EXISTS \`sales\`;
    CREATE TABLE \`sales\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`region\` VARCHAR(16) NOT NULL,
      \`priority\` INT NOT NULL,
      \`amount\` DECIMAL(10,2) NOT NULL
    ) ENGINE=InnoDB;
    INSERT INTO \`sales\` (\`region\`, \`priority\`, \`amount\`) VALUES
      ('north', 2, 100.00),  -- id 1
      ('north', 1, 100.00),  -- id 2  (ties id=1 on region+amount)
      ('north', 2,  50.00),  -- id 3  (ties id=1 on region+priority)
      ('south', 1, 100.00),  -- id 4
      ('south', 1,  75.00),  -- id 5  (ties id=4 on region+priority)
      ('south', 2,  75.00),  -- id 6  (ties id=5 on amount)
      ('east',  3,  50.00);  -- id 7  (ties id=3 on amount, alone in region)
  `);
  if (salesSeed.error) fail(`sales seed failed: ${salesSeed.error}`);
  else ok("seed: sales table for multi-column ORDER BY tests");

  // Query A — region ASC, amount DESC, id ASC as final deterministic tiebreak.
  // Within each region, higher amounts come first; equal amounts fall back to id ASC.
  const orderARes = await run(
    "SELECT `id`, `region`, `amount` FROM `sales` ORDER BY `region` ASC, `amount` DESC, `id` ASC;",
  );
  assertResult("ORDER BY region ASC, amount DESC, id ASC (ties break by id)", orderARes, {
    columns: ["id", "region", "amount"],
    rows: [
      [7, "east", 50],
      [1, "north", 100],
      [2, "north", 100],
      [3, "north", 50],
      [4, "south", 100],
      [5, "south", 75],
      [6, "south", 75],
    ],
  });

  // Query B — priority DESC first, then region ASC, then amount ASC.
  // Verifies that DESC on the leading column doesn't leak into subsequent
  // columns' direction, and that ties across all three cascade to id ASC.
  const orderBRes = await run(
    "SELECT `id`, `priority`, `region`, `amount` FROM `sales` " +
      "ORDER BY `priority` DESC, `region` ASC, `amount` ASC, `id` ASC;",
  );
  assertResult(
    "ORDER BY priority DESC, region ASC, amount ASC (mixed directions cascade)",
    orderBRes,
    {
      columns: ["id", "priority", "region", "amount"],
      rows: [
        [7, 3, "east", 50],
        [3, 2, "north", 50],
        [1, 2, "north", 100],
        [6, 2, "south", 75],
        [2, 1, "north", 100],
        [5, 1, "south", 75],
        [4, 1, "south", 100],
      ],
    },
  );

  // Query C — amount DESC, region ASC, priority ASC. Every row ties with at
  // least one other on `amount`, so this is a stress test of the tiebreak
  // chain across three columns in mixed directions.
  const orderCRes = await run(
    "SELECT `id`, `amount`, `region`, `priority` FROM `sales` " +
      "ORDER BY `amount` DESC, `region` ASC, `priority` ASC, `id` ASC;",
  );
  assertResult(
    "ORDER BY amount DESC, region ASC, priority ASC (three-way tiebreak)",
    orderCRes,
    {
      columns: ["id", "amount", "region", "priority"],
      rows: [
        [2, 100, "north", 1],
        [1, 100, "north", 2],
        [4, 100, "south", 1],
        [5, 75, "south", 1],
        [6, 75, "south", 2],
        [7, 50, "east", 3],
        [3, 50, "north", 2],
      ],
    },
  );

  // Query D — same as A but with column-position ORDER BY (ORDER BY 2, 3 DESC).
  // MySQL allows ordering by SELECT-list ordinal; verify the emulator
  // preserves per-position ASC/DESC and matches Query A's row order.
  const orderDRes = await run(
    "SELECT `id`, `region`, `amount` FROM `sales` ORDER BY 2 ASC, 3 DESC, 1 ASC;",
  );
  assertResult("ORDER BY 2 ASC, 3 DESC, 1 ASC (positional refs, mixed direction)", orderDRes, {
    columns: ["id", "region", "amount"],
    rows: [
      [7, "east", 50],
      [1, "north", 100],
      [2, "north", 100],
      [3, "north", 50],
      [4, "south", 100],
      [5, "south", 75],
      [6, "south", 75],
    ],
  });

  // --- 9b. NULLS FIRST / NULLS LAST ordering (MySQL semantics) ------------
  //
  // MySQL treats NULL as smaller than any non-NULL value:
  //   ORDER BY x ASC  → NULLs come FIRST
  //   ORDER BY x DESC → NULLs come LAST
  //
  // MySQL itself does not parse `NULLS FIRST` / `NULLS LAST`, but the
  // emulator accepts them as a portable extension and rewrites them into
  // an (expr IS NULL) sort prefix so the rendered order is deterministic
  // and matches what a real MySQL server produces for the equivalent
  // ASC/DESC-only query.
  //
  // Seed rows (from section 1):
  //   id  customer  note
  //    1  alice     'first'
  //    2  bob       NULL
  //    3  carol     'vip'
  //    4  dave      NULL
  //    5  erin      'promo'
  const nullsAscDefault = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY `note` ASC, `id` ASC;",
  );
  assertResult("ORDER BY note ASC → NULLs first (MySQL default)", nullsAscDefault, {
    columns: ["id", "note"],
    rows: [
      [2, null],
      [4, null],
      [1, "first"],
      [5, "promo"],
      [3, "vip"],
    ],
  });

  const nullsDescDefault = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY `note` DESC, `id` ASC;",
  );
  assertResult("ORDER BY note DESC → NULLs last (MySQL default)", nullsDescDefault, {
    columns: ["id", "note"],
    rows: [
      [3, "vip"],
      [5, "promo"],
      [1, "first"],
      [2, null],
      [4, null],
    ],
  });

  // Explicit NULLS LAST on ASC overrides the default (which would put NULLs first).
  const nullsAscLast = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY `note` ASC NULLS LAST, `id` ASC;",
  );
  assertResult("ORDER BY note ASC NULLS LAST forces NULLs to the end", nullsAscLast, {
    columns: ["id", "note"],
    rows: [
      [1, "first"],
      [5, "promo"],
      [3, "vip"],
      [2, null],
      [4, null],
    ],
  });

  // Explicit NULLS FIRST on DESC overrides the default (which would put NULLs last).
  const nullsDescFirst = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY `note` DESC NULLS FIRST, `id` ASC;",
  );
  assertResult("ORDER BY note DESC NULLS FIRST forces NULLs to the top", nullsDescFirst, {
    columns: ["id", "note"],
    rows: [
      [2, null],
      [4, null],
      [3, "vip"],
      [5, "promo"],
      [1, "first"],
    ],
  });

  // Bare NULLS FIRST / NULLS LAST (no explicit ASC/DESC) — default direction
  // is ASC, so NULLS LAST here reorders the ASC result to put NULLs at the end.
  const nullsBareLast = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY `note` NULLS LAST, `id` ASC;",
  );
  assertResult("ORDER BY note NULLS LAST (implicit ASC) puts NULLs last", nullsBareLast, {
    columns: ["id", "note"],
    rows: [
      [1, "first"],
      [5, "promo"],
      [3, "vip"],
      [2, null],
      [4, null],
    ],
  });

  // Multi-column: primary key non-null, secondary key nullable with NULLS FIRST.
  // Groups by customer ASC first, then within each group orders by note DESC
  // with NULLs at the top of each group. Since customer is unique here, this
  // effectively verifies the NULLS clause survives multi-column parsing.
  const nullsMulti = await run(
    "SELECT `id`, `customer`, `note` FROM `orders` ORDER BY `note` DESC NULLS FIRST, `customer` ASC;",
  );
  assertResult(
    "Multi-column ORDER BY note DESC NULLS FIRST, customer ASC",
    nullsMulti,
    {
      columns: ["id", "customer", "note"],
      rows: [
        [2, "bob", null],
        [4, "dave", null],
        [3, "carol", "vip"],
        [5, "erin", "promo"],
        [1, "alice", "first"],
      ],
    },
  );


  // --- 9c. ORDER BY expressions ------------------------------------------
  // MySQL allows arbitrary scalar expressions in ORDER BY. Verify a handful
  // of common shapes against the emulator: arithmetic, function calls, and
  // CASE expressions. Uses the `orders` seed from section 1.
  const orderExprArith = await run(
    "SELECT `id`, `customer` FROM `orders` ORDER BY (`id` + 1) DESC;",
  );
  assertResult("ORDER BY (id + 1) DESC matches id DESC", orderExprArith, {
    columns: ["id", "customer"],
    rows: [
      [5, "erin"],
      [4, "dave"],
      [3, "carol"],
      [2, "bob"],
      [1, "alice"],
    ],
  });

  const orderExprLower = await run(
    "SELECT `id`, `customer` FROM `orders` ORDER BY LOWER(`customer`) ASC;",
  );
  assertResult("ORDER BY LOWER(customer) ASC sorts alphabetically", orderExprLower, {
    columns: ["id", "customer"],
    rows: [
      [1, "alice"],
      [2, "bob"],
      [3, "carol"],
      [4, "dave"],
      [5, "erin"],
    ],
  });

  // CASE expression: non-null notes first (0), NULL notes after (1), stable by id.
  const orderExprCase = await run(
    "SELECT `id`, `note` FROM `orders` " +
      "ORDER BY CASE WHEN `note` IS NULL THEN 1 ELSE 0 END ASC, `id` ASC;",
  );
  assertResult(
    "ORDER BY CASE WHEN note IS NULL THEN 1 ELSE 0 END puts non-nulls first",
    orderExprCase,
    {
      columns: ["id", "note"],
      rows: [
        [1, "first"],
        [3, "vip"],
        [5, "promo"],
        [2, null],
        [4, null],
      ],
    },
  );

  // --- 9d. NULLS FIRST/LAST combined with LIMIT / OFFSET ------------------
  const nullsLimitAscLast = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY `note` ASC NULLS LAST, `id` ASC LIMIT 2;",
  );
  assertResult("NULLS LAST + LIMIT 2 returns first two non-null notes", nullsLimitAscLast, {
    columns: ["id", "note"],
    rows: [
      [1, "first"],
      [5, "promo"],
    ],
  });

  const nullsLimitDescFirstOffset = await run(
    "SELECT `id`, `note` FROM `orders` " +
      "ORDER BY `note` DESC NULLS FIRST, `id` ASC LIMIT 2 OFFSET 1;",
  );
  assertResult(
    "NULLS FIRST + LIMIT 2 OFFSET 1 skips first NULL then returns [null, 'vip']",
    nullsLimitDescFirstOffset,
    {
      columns: ["id", "note"],
      rows: [
        [4, null],
        [3, "vip"],
      ],
    },
  );

  // MySQL offset-first form: LIMIT 2, 2  with NULLS LAST — skips the two
  // non-null leaders and returns the third non-null + first NULL.
  const nullsLimitOffsetForm = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY `note` ASC NULLS LAST, `id` ASC LIMIT 2, 2;",
  );
  assertResult("NULLS LAST + LIMIT 2, 2 returns ['vip', null]", nullsLimitOffsetForm, {
    columns: ["id", "note"],
    rows: [
      [3, "vip"],
      [2, null],
    ],
  });

  // --- 9e. ORDER BY with explicit COLLATE --------------------------------
  // Rebuild a small case-mixed table so we can compare _bin (case-sensitive
  // ASCII order: uppercase before lowercase) against _unicode_ci (case-
  // insensitive alphabetical order).
  const collateSeed = await run(`
    DROP TABLE IF EXISTS \`names\`;
    CREATE TABLE \`names\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    INSERT INTO \`names\` (\`name\`) VALUES
      ('apple'),
      ('Banana'),
      ('cherry'),
      ('BLUEBERRY'),
      ('avocado');
  `);
  if (collateSeed.error) fail(`names seed failed: ${collateSeed.error}`);
  else ok("seed: names table for COLLATE tests");

  // utf8mb4_bin → BINARY. ASCII: uppercase codepoints < lowercase, so the
  // two capitalised rows sort before the lowercase ones.
  const collateBin = await run(
    "SELECT `name` FROM `names` ORDER BY `name` COLLATE utf8mb4_bin ASC;",
  );
  assertResult("ORDER BY name COLLATE utf8mb4_bin (binary, uppercase first)", collateBin, {
    columns: ["name"],
    rows: [["BLUEBERRY"], ["Banana"], ["apple"], ["avocado"], ["cherry"]],
  });

  // utf8mb4_unicode_ci → NOCASE. Case-insensitive alphabetical order.
  const collateCi = await run(
    "SELECT `name` FROM `names` ORDER BY `name` COLLATE utf8mb4_unicode_ci ASC;",
  );
  assertResult(
    "ORDER BY name COLLATE utf8mb4_unicode_ci (case-insensitive)",
    collateCi,
    {
      columns: ["name"],
      rows: [["apple"], ["avocado"], ["Banana"], ["BLUEBERRY"], ["cherry"]],
    },
  );

  // COLLATE binary alias — MySQL accepts a bare `BINARY` collation name too.
  const collateBinaryAlias = await run(
    "SELECT `name` FROM `names` ORDER BY `name` COLLATE binary ASC;",
  );
  assertResult(
    "ORDER BY name COLLATE binary matches _bin ordering",
    collateBinaryAlias,
    {
      columns: ["name"],
      rows: [["BLUEBERRY"], ["Banana"], ["apple"], ["avocado"], ["cherry"]],
    },
  );


  // --- 9f. Positional ORDER BY references combined with NULLS FIRST/LAST -
  // MySQL itself doesn't parse NULLS FIRST/LAST, but the emulator accepts
  // the portable extension on positional column references (ORDER BY 2, 1)
  // just as it does on named columns. Uses the `orders` seed rows:
  //   1 alice 'first' | 2 bob NULL | 3 carol 'vip' | 4 dave NULL | 5 erin 'promo'

  // Column 2 = note, implicit ASC with NULLS LAST; tiebreak on column 1 (id).
  const posNullsLast = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY 2 NULLS LAST, 1 NULLS FIRST;",
  );
  assertResult(
    "ORDER BY 2 NULLS LAST, 1 NULLS FIRST (positional, implicit ASC)",
    posNullsLast,
    {
      columns: ["id", "note"],
      rows: [
        [1, "first"],
        [5, "promo"],
        [3, "vip"],
        [2, null],
        [4, null],
      ],
    },
  );

  // Column 2 = note DESC NULLS FIRST — overrides MySQL default (DESC → NULLs last).
  const posDescNullsFirst = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY 2 DESC NULLS FIRST, 1 ASC;",
  );
  assertResult(
    "ORDER BY 2 DESC NULLS FIRST, 1 ASC (positional)",
    posDescNullsFirst,
    {
      columns: ["id", "note"],
      rows: [
        [2, null],
        [4, null],
        [3, "vip"],
        [5, "promo"],
        [1, "first"],
      ],
    },
  );

  // Positional with mixed directions — implicit ASC NULLS FIRST, then id DESC.
  const posNullsFirstIdDesc = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY 2 NULLS FIRST, 1 DESC;",
  );
  assertResult(
    "ORDER BY 2 NULLS FIRST, 1 DESC (positional, tiebreak DESC)",
    posNullsFirstIdDesc,
    {
      columns: ["id", "note"],
      rows: [
        [4, null],
        [2, null],
        [1, "first"],
        [5, "promo"],
        [3, "vip"],
      ],
    },
  );

  // Three-column select with positional NULLS on col 3, tiebreak on col 2.
  const posThreeCol = await run(
    "SELECT `id`, `customer`, `note` FROM `orders` ORDER BY 3 NULLS LAST, 2 ASC;",
  );
  assertResult(
    "ORDER BY 3 NULLS LAST, 2 ASC (positional across 3 columns)",
    posThreeCol,
    {
      columns: ["id", "customer", "note"],
      rows: [
        [1, "alice", "first"],
        [5, "erin", "promo"],
        [3, "carol", "vip"],
        [2, "bob", null],
        [4, "dave", null],
      ],
    },
  );

  // --- 9g. Positional ORDER BY with explicit COLLATE + NULLS FIRST/LAST ---
  // Rebuild `names` with NULL rows so positional refs must carry both the
  // collation and the NULLS placement.
  const collateNullsSeed = await run(`
    DROP TABLE IF EXISTS \`names\`;
    CREATE TABLE \`names\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    INSERT INTO \`names\` (\`name\`) VALUES
      ('apple'),
      ('Banana'),
      (NULL),
      ('cherry'),
      ('BLUEBERRY'),
      (NULL),
      ('avocado');
  `);
  if (collateNullsSeed.error) fail(`names+NULL seed failed: ${collateNullsSeed.error}`);
  else ok("seed: names table with NULLs for positional COLLATE tests");

  // Positional col 2 COLLATE utf8mb4_bin ASC NULLS LAST — uppercase codepoints
  // first, then lowercase, NULLs pushed to the end. Tiebreak by id.
  const posCollateBinNullsLast = await run(
    "SELECT `id`, `name` FROM `names` ORDER BY 2 COLLATE utf8mb4_bin ASC NULLS LAST, 1 ASC;",
  );
  assertResult(
    "ORDER BY 2 COLLATE utf8mb4_bin ASC NULLS LAST, 1 ASC (positional)",
    posCollateBinNullsLast,
    {
      columns: ["id", "name"],
      rows: [
        [5, "BLUEBERRY"],
        [2, "Banana"],
        [1, "apple"],
        [7, "avocado"],
        [4, "cherry"],
        [3, null],
        [6, null],
      ],
    },
  );

  // Positional col 2 COLLATE utf8mb4_unicode_ci ASC NULLS FIRST — case
  // insensitive alphabetical order, NULLs pulled to the top.
  const posCollateCiNullsFirst = await run(
    "SELECT `id`, `name` FROM `names` ORDER BY 2 COLLATE utf8mb4_unicode_ci ASC NULLS FIRST, 1 ASC;",
  );
  assertResult(
    "ORDER BY 2 COLLATE utf8mb4_unicode_ci ASC NULLS FIRST, 1 ASC (positional)",
    posCollateCiNullsFirst,
    {
      columns: ["id", "name"],
      rows: [
        [3, null],
        [6, null],
        [1, "apple"],
        [7, "avocado"],
        [2, "Banana"],
        [5, "BLUEBERRY"],
        [4, "cherry"],
      ],
    },
  );

  // Positional col 2 COLLATE utf8mb4_bin DESC NULLS FIRST — reverse binary
  // (lowercase before uppercase), NULLs pulled to the front.
  const posCollateBinDescNullsFirst = await run(
    "SELECT `id`, `name` FROM `names` ORDER BY 2 COLLATE utf8mb4_bin DESC NULLS FIRST, 1 ASC;",
  );
  assertResult(
    "ORDER BY 2 COLLATE utf8mb4_bin DESC NULLS FIRST, 1 ASC (positional)",
    posCollateBinDescNullsFirst,
    {
      columns: ["id", "name"],
      rows: [
        [3, null],
        [6, null],
        [4, "cherry"],
        [7, "avocado"],
        [1, "apple"],
        [2, "Banana"],
        [5, "BLUEBERRY"],
      ],
    },
  );

  // Positional COLLATE binary alias combined with NULLS LAST + LIMIT offset,
  // count — the pagination window skips the two uppercase rows and returns
  // the next three lowercase rows before NULLs.
  const posCollateBinaryPaged = await run(
    "SELECT `id`, `name` FROM `names` ORDER BY 2 COLLATE binary ASC NULLS LAST, 1 ASC LIMIT 2, 3;",
  );
  assertResult(
    "ORDER BY 2 COLLATE binary ASC NULLS LAST, 1 ASC LIMIT 2,3 (positional + paging)",
    posCollateBinaryPaged,
    {
      columns: ["id", "name"],
      rows: [
        [1, "apple"],
        [7, "avocado"],
        [4, "cherry"],
      ],
    },
  );


  // --- 9h. Positional ORDER BY + NULLS FIRST/LAST + LIMIT / OFFSET --------
  // Using `orders`:
  //   1 alice 'first' | 2 bob NULL | 3 carol 'vip' | 4 dave NULL | 5 erin 'promo'
  // Every query below sorts by position (col 2 = note), controls NULL
  // placement, then paginates. We verify the exact rows the UI would render.

  // Positional ASC NULLS LAST + LIMIT (no offset) — non-null notes first.
  const posNullsLastLimit = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY 2 ASC NULLS LAST, 1 ASC LIMIT 3;",
  );
  assertResult(
    "ORDER BY 2 ASC NULLS LAST, 1 ASC LIMIT 3 (positional)",
    posNullsLastLimit,
    {
      columns: ["id", "note"],
      rows: [
        [1, "first"],
        [5, "promo"],
        [3, "vip"],
      ],
    },
  );

  // Positional ASC NULLS LAST + LIMIT offset,count — window straddles the
  // non-null/NULL boundary, so we see the last non-null row then a NULL row.
  const posNullsLastPaged = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY 2 ASC NULLS LAST, 1 ASC LIMIT 2, 2;",
  );
  assertResult(
    "ORDER BY 2 ASC NULLS LAST, 1 ASC LIMIT 2,2 (positional straddles NULL boundary)",
    posNullsLastPaged,
    {
      columns: ["id", "note"],
      rows: [
        [3, "vip"],
        [2, null],
      ],
    },
  );

  // Positional ASC NULLS FIRST + LIMIT with OFFSET keyword — skip past both
  // NULL rows and return only the first non-null note.
  const posNullsFirstOffsetPast = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY 2 ASC NULLS FIRST, 1 ASC LIMIT 1 OFFSET 2;",
  );
  assertResult(
    "ORDER BY 2 ASC NULLS FIRST, 1 ASC LIMIT 1 OFFSET 2 (positional skips both NULLs)",
    posNullsFirstOffsetPast,
    {
      columns: ["id", "note"],
      rows: [[1, "first"]],
    },
  );

  // Positional DESC NULLS FIRST + LIMIT offset,count — NULLs first (2 rows),
  // then the highest-sorted non-null note ('vip'). Window = offset 1, take 2.
  const posDescNullsFirstPaged = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY 2 DESC NULLS FIRST, 1 ASC LIMIT 1, 2;",
  );
  assertResult(
    "ORDER BY 2 DESC NULLS FIRST, 1 ASC LIMIT 1,2 (positional across NULL boundary)",
    posDescNullsFirstPaged,
    {
      columns: ["id", "note"],
      rows: [
        [4, null],
        [3, "vip"],
      ],
    },
  );

  // Positional DESC NULLS LAST + LIMIT with large OFFSET beyond non-null rows —
  // returns only the trailing NULL rows.
  const posDescNullsLastTail = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY 2 DESC NULLS LAST, 1 ASC LIMIT 3, 5;",
  );
  assertResult(
    "ORDER BY 2 DESC NULLS LAST, 1 ASC LIMIT 3,5 (positional returns tail NULLs)",
    posDescNullsLastTail,
    {
      columns: ["id", "note"],
      rows: [
        [2, null],
        [4, null],
      ],
    },
  );

  // Positional NULLS placement + OFFSET beyond total row count — empty set.
  const posOffsetOverflow = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY 2 ASC NULLS LAST, 1 ASC LIMIT 10 OFFSET 99;",
  );
  if (posOffsetOverflow.error) {
    fail(`ORDER BY 2 ASC NULLS LAST LIMIT 10 OFFSET 99 error: ${posOffsetOverflow.error}`);
  } else if ((posOffsetOverflow.rows || []).length === 0) {
    ok("ORDER BY 2 ASC NULLS LAST LIMIT 10 OFFSET 99 (positional, offset past end)");
  } else {
    fail(`offset overflow returned ${posOffsetOverflow.rows.length} rows, expected 0`);
  }


  // Two positional keys with NULLS on each + LIMIT — col 2 (note) NULLS
  // FIRST, tiebreak col 1 (id) DESC. First three rows: both NULLs (id 4,2)
  // then the largest-note-first tiebreak → 'vip' (id 3).
  const posMultiKeyPaged = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY 2 ASC NULLS FIRST, 1 DESC LIMIT 3;",
  );
  assertResult(
    "ORDER BY 2 ASC NULLS FIRST, 1 DESC LIMIT 3 (positional multi-key)",
    posMultiKeyPaged,
    {
      columns: ["id", "note"],
      rows: [
        [4, null],
        [2, null],
        [1, "first"],
      ],
    },
  );

  // --- 9i. Arithmetic expressions in ORDER BY + NULLS FIRST/LAST -----------
  // MySQL rule: only a bare positive integer literal is a positional column
  // reference. Any arithmetic (2+(1), 1*2, id+0) is a normal expression, so
  // literal arithmetic evaluates to a constant across every row and provides
  // no ordering — the secondary key alone decides row order. Column-based
  // expressions still sort by the computed value.
  // Uses `orders`: 1 alice 'first' | 2 bob NULL | 3 carol 'vip' | 4 dave NULL | 5 erin 'promo'.

  // 2+(1) is a constant expression, NOT positional col 3 — first key is a
  // no-op, id ASC tiebreak determines the full order.
  const exprConstPlusAsc = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY 2+(1) NULLS FIRST, `id` ASC;",
  );
  assertResult(
    "ORDER BY 2+(1) NULLS FIRST, id ASC (constant expr → id ASC decides)",
    exprConstPlusAsc,
    {
      columns: ["id", "note"],
      rows: [
        [1, "first"],
        [2, null],
        [3, "vip"],
        [4, null],
        [5, "promo"],
      ],
    },
  );

  // 1*2 is also a constant expression — id DESC tiebreak flips the order.
  const exprConstMulDesc = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY 1*2 NULLS LAST, `id` DESC;",
  );
  assertResult(
    "ORDER BY 1*2 NULLS LAST, id DESC (constant expr → id DESC decides)",
    exprConstMulDesc,
    {
      columns: ["id", "note"],
      rows: [
        [5, "promo"],
        [4, null],
        [3, "vip"],
        [2, null],
        [1, "first"],
      ],
    },
  );

  // Column expression `id+0` — sorts by the computed value (same as id).
  // NULLS FIRST is a no-op here because `id+0` is never NULL, but the clause
  // must still parse and translate correctly.
  const exprIdPlusZero = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY `id`+0 DESC NULLS FIRST;",
  );
  assertResult(
    "ORDER BY id+0 DESC NULLS FIRST (column expression, no NULLs in key)",
    exprIdPlusZero,
    {
      columns: ["id", "note"],
      rows: [
        [5, "promo"],
        [4, null],
        [3, "vip"],
        [2, null],
        [1, "first"],
      ],
    },
  );

  // Column expression that CAN be NULL — LENGTH(note) is NULL wherever note
  // is NULL. NULLS LAST forces those rows to the end; among non-NULLs, sort
  // by string length ascending, tiebreak id ASC.
  //   LENGTH('first')=5, LENGTH('vip')=3, LENGTH('promo')=5.
  const exprLenNullsLast = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY LENGTH(`note`) ASC NULLS LAST, `id` ASC;",
  );
  assertResult(
    "ORDER BY LENGTH(note) ASC NULLS LAST, id ASC (NULLable expression)",
    exprLenNullsLast,
    {
      columns: ["id", "note"],
      rows: [
        [3, "vip"],
        [1, "first"],
        [5, "promo"],
        [2, null],
        [4, null],
      ],
    },
  );

  // Constant arithmetic expression combined with LIMIT/OFFSET — because the
  // first key is constant, the secondary id ASC key alone controls which rows
  // fall inside the pagination window.
  const exprConstPaged = await run(
    "SELECT `id`, `note` FROM `orders` ORDER BY 2+(1) NULLS FIRST, `id` ASC LIMIT 2, 2;",
  );
  assertResult(
    "ORDER BY 2+(1) NULLS FIRST, id ASC LIMIT 2,2 (constant expr + paging)",
    exprConstPaged,
    {
      columns: ["id", "note"],
      rows: [
        [3, "vip"],
        [4, null],
      ],
    },
  );



  // may be empty until the user hits Run in the editor). Bridge queries
  // above go straight through the same QueryResult path that populates the
  // tabs, so column/row assertions match exactly what the UI would show.
  const headerVisible = await page.locator("text=Results").first().isVisible().catch(() => false);
  if (headerVisible) ok("Results header renders in workbench UI");
  else fail("Results header not found in workbench UI");


  if (pageErrors.length) {
    log("!", `${pageErrors.length} uncaught pageerror(s): ${pageErrors.slice(0, 3).join(" | ")}`);
  }

  await browser.close();

  if (failed > 0) {
    console.log(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nAll MySQL E2E assertions passed.");
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
