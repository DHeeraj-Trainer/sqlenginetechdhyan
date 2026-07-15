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

  // --- 6. Result tab wiring — sanity-check the tab bar exists in DOM ------
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
