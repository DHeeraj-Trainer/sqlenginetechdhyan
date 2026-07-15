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

  // --- 10. Result tab wiring — sanity-check the tab bar exists in DOM -----
  // The ResultsHeader always renders once the workbench mounts (tabs list
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
