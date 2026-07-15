#!/usr/bin/env node
/**
 * Playwright E2E — MySQL-specific error rendering in the workbench.
 *
 * Two layers of assertion, so a regression in either the diagnostic
 * encoding OR the ErrorPanel rendering is caught:
 *
 *  A. Structural (via __wb.runQuery): every failing MySQL query returns a
 *     QueryResult whose `.error` carries an encoded MysqlDiagnostic with
 *     original, translated, message, reason, and suggestion.
 *
 *  B. Visual (via __wb.runAndRender): the same query is pushed through the
 *     runActive code path so the results area renders <ErrorPanel/>. We then
 *     assert the DOM contains the "Query failed" header, the reason and
 *     suggestion text, the translated SQLite query, and the original SQL.
 *
 * Covers three MySQL error classes:
 *   1. Syntax errors           (matched by the "syntax error" rule)
 *   2. Missing tables/columns  (matched by "no such table" / "no such column")
 *   3. Constraint violations   (falls through to the default diagnostic)
 *
 * Usage:
 *   BASE_URL=http://localhost:8080 node tests/e2e/mysql-errors.spec.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8080";
const TIMEOUT = 30_000;
// Same marker chars used by src/lib/db/engines/mysql-diagnostics.ts.
const MYSQL_DIAG_MARKER = "\u0001MYSQL_DIAG\u0001";

let failed = 0;
const ok = (m) => console.log("✓", m);
const fail = (m) => {
  console.log("✗", m);
  failed++;
};

function extractDiagnostic(text) {
  if (typeof text !== "string") return null;
  const start = text.indexOf(MYSQL_DIAG_MARKER);
  if (start === -1) return null;
  const end = text.indexOf(MYSQL_DIAG_MARKER, start + MYSQL_DIAG_MARKER.length);
  if (end === -1) return null;
  try {
    return JSON.parse(text.slice(start + MYSQL_DIAG_MARKER.length, end));
  } catch {
    return null;
  }
}

/** Assert the QueryResult.error carries an encoded diagnostic and the reason
 *  matches a substring we expect from mysql-diagnostics RULES. */
function assertDiagnostic(label, result, expected) {
  if (!result) return fail(`${label}: no result`);
  if (!result.error) return fail(`${label}: expected an error, got success`);
  const diag = extractDiagnostic(result.error);
  if (!diag) return fail(`${label}: error missing MYSQL_DIAG marker — raw="${String(result.error).slice(0, 120)}"`);
  if (!diag.original || !diag.translated) {
    return fail(`${label}: diagnostic missing original/translated`);
  }
  if (expected.reasonIncludes && !diag.reason.includes(expected.reasonIncludes)) {
    return fail(
      `${label}: reason mismatch\n    expected substring: ${JSON.stringify(expected.reasonIncludes)}\n    got reason:         ${JSON.stringify(diag.reason)}`,
    );
  }
  if (expected.suggestionIncludes && !diag.suggestion.includes(expected.suggestionIncludes)) {
    return fail(
      `${label}: suggestion mismatch\n    expected substring: ${JSON.stringify(expected.suggestionIncludes)}\n    got suggestion:     ${JSON.stringify(diag.suggestion)}`,
    );
  }
  if (expected.messageMatches && !expected.messageMatches.test(diag.message)) {
    return fail(
      `${label}: raw message doesn't match ${expected.messageMatches}\n    got: ${JSON.stringify(diag.message)}`,
    );
  }
  ok(`${label} → diagnostic { reason: "${diag.reason.slice(0, 60)}…" }`);
  return diag;
}

/** After a runAndRender call, wait for ErrorPanel and assert its contents. */
async function assertErrorPanel(page, label, expected) {
  try {
    await page.getByText("Query failed").first().waitFor({ state: "visible", timeout: 10_000 });
  } catch {
    return fail(`${label}: "Query failed" header never appeared in results area`);
  }

  const bodyText = await page.locator("body").innerText();
  const has = (needle) => bodyText.includes(needle);

  if (!has("Why this failed (MySQL emulation)")) {
    return fail(`${label}: missing "Why this failed (MySQL emulation)" section`);
  }
  if (!has("Suggested alternative")) {
    return fail(`${label}: missing "Suggested alternative" section`);
  }
  if (!has("Translated SQLite query")) {
    return fail(`${label}: missing "Translated SQLite query" section`);
  }
  if (!has("Your MySQL statement")) {
    return fail(`${label}: missing "Your MySQL statement" section`);
  }
  if (expected.reasonIncludes && !has(expected.reasonIncludes)) {
    return fail(`${label}: reason text "${expected.reasonIncludes}" not rendered`);
  }
  if (expected.suggestionIncludes && !has(expected.suggestionIncludes)) {
    return fail(`${label}: suggestion text "${expected.suggestionIncludes}" not rendered`);
  }
  if (expected.translatedIncludes && !has(expected.translatedIncludes)) {
    return fail(`${label}: translated SQL "${expected.translatedIncludes}" not rendered`);
  }
  if (expected.originalIncludes && !has(expected.originalIncludes)) {
    return fail(`${label}: original SQL "${expected.originalIncludes}" not rendered`);
  }
  ok(`${label} → ErrorPanel rendered with reason + suggestion + translated + original`);
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

  await context.addInitScript(() => {
    window.__wbEnableTestBridge = true;
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__wb, null, { timeout: TIMEOUT });
  ok("workbench bridge mounted");

  await page.evaluate(() => window.__wb.switchEngine("mysql"));
  await page.waitForFunction(
    () => window.__wb && window.__wb.engineId === "mysql" && window.__wb.status === "ready",
    null,
    { timeout: 90_000, polling: 200 },
  );
  ok("MySQL emulator ready");

  const runRaw = (sql) => page.evaluate((s) => window.__wb.runQuery(s), sql);
  const runUI = (sql) => page.evaluate((s) => window.__wb.runAndRender(s), sql);

  // Seed a schema we can violate.
  const seed = await runRaw(`
    DROP TABLE IF EXISTS \`orders\`;
    CREATE TABLE \`orders\` (
      \`id\` INT PRIMARY KEY,
      \`email\` VARCHAR(120) NOT NULL UNIQUE,
      \`total\` DECIMAL(10,2)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    INSERT INTO \`orders\` (\`id\`, \`email\`, \`total\`) VALUES
      (1, 'a@x.com', 10.00),
      (2, 'b@x.com', 20.00);
  `);
  if (seed.error) return fail(`seed failed: ${seed.error}`);
  ok("seed schema created");

  // --- 1. Syntax error ----------------------------------------------------
  {
    const sql = "SELCT * FROM `orders`;";
    const res = await runRaw(sql);
    assertDiagnostic("syntax error → diagnostic", res, {
      reasonIncludes: "SQLite's parser rejected",
      suggestionIncludes: "Simplify the statement",
      messageMatches: /syntax error|near/i,
    });
    await runUI(sql);
    await assertErrorPanel(page, "syntax error → ErrorPanel", {
      reasonIncludes: "SQLite's parser rejected",
      suggestionIncludes: "Simplify the statement",
      originalIncludes: "SELCT",
    });
  }

  // --- 2a. Missing table --------------------------------------------------
  {
    const sql = "SELECT * FROM `no_such_table`;";
    const res = await runRaw(sql);
    assertDiagnostic("missing table → diagnostic", res, {
      reasonIncludes: "SQLite couldn't find the referenced table",
      suggestionIncludes: "Load a sample dataset",
      messageMatches: /no such table/i,
    });
    await runUI(sql);
    await assertErrorPanel(page, "missing table → ErrorPanel", {
      reasonIncludes: "SQLite couldn't find the referenced table",
      suggestionIncludes: "Load a sample dataset",
      originalIncludes: "no_such_table",
      translatedIncludes: '"no_such_table"',
    });
  }

  // --- 2b. Missing column -------------------------------------------------
  {
    const sql = "SELECT `does_not_exist` FROM `orders`;";
    const res = await runRaw(sql);
    assertDiagnostic("missing column → diagnostic", res, {
      reasonIncludes: "SQLite couldn't resolve a column name",
      suggestionIncludes: "Verify the column name",
      messageMatches: /no such column/i,
    });
    await runUI(sql);
    await assertErrorPanel(page, "missing column → ErrorPanel", {
      reasonIncludes: "SQLite couldn't resolve a column name",
      suggestionIncludes: "Verify the column name",
      originalIncludes: "does_not_exist",
    });
  }

  // --- 3a. Primary-key constraint violation -------------------------------
  {
    const sql = "INSERT INTO `orders` (`id`, `email`, `total`) VALUES (1, 'dup@x.com', 5.00);";
    const res = await runRaw(sql);
    const diag = assertDiagnostic("PK constraint violation → diagnostic", res, {
      messageMatches: /UNIQUE constraint failed|constraint failed/i,
    });
    if (diag && !/orders\.id/i.test(diag.message)) {
      fail(`PK constraint violation: expected "orders.id" in raw message, got ${JSON.stringify(diag.message)}`);
    }
    await runUI(sql);
    await assertErrorPanel(page, "PK constraint violation → ErrorPanel", {
      originalIncludes: "dup@x.com",
    });
  }

  // --- 3b. UNIQUE (secondary) constraint violation ------------------------
  {
    const sql = "INSERT INTO `orders` (`id`, `email`, `total`) VALUES (99, 'a@x.com', 5.00);";
    const res = await runRaw(sql);
    assertDiagnostic("UNIQUE constraint violation → diagnostic", res, {
      messageMatches: /UNIQUE constraint failed.*orders\.email/i,
    });
    await runUI(sql);
    await assertErrorPanel(page, "UNIQUE constraint violation → ErrorPanel", {
      originalIncludes: "a@x.com",
    });
  }

  // --- 3c. NOT NULL constraint violation ----------------------------------
  {
    const sql = "INSERT INTO `orders` (`id`, `total`) VALUES (100, 1.00);";
    const res = await runRaw(sql);
    assertDiagnostic("NOT NULL constraint violation → diagnostic", res, {
      messageMatches: /NOT NULL constraint failed.*orders\.email/i,
    });
    await runUI(sql);
    await assertErrorPanel(page, "NOT NULL constraint violation → ErrorPanel", {
      originalIncludes: "INSERT INTO",
    });
  }

  if (pageErrors.length) {
    console.log("!", `${pageErrors.length} uncaught pageerror(s): ${pageErrors.slice(0, 3).join(" | ")}`);
  }

  await browser.close();

  if (failed > 0) {
    console.log(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nAll MySQL error-rendering assertions passed.");
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
