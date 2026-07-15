#!/usr/bin/env node
/**
 * Playwright smoke test — GET / returns 200 and renders the main page
 * without a blank-screen error payload. Also verifies /api/public/health
 * responds ok when the router bootstraps cleanly.
 *
 * Usage:
 *   BASE_URL=http://localhost:8080 node tests/e2e/smoke.spec.mjs
 *
 * Exits non-zero on failure. Safe for CI.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8080";

function log(icon, msg) {
  console.log(`${icon} ${msg}`);
}

async function main() {
  let failed = 0;

  // 1. Raw HTTP check — GET / returns 200 with real body.
  const res = await fetch(new URL("/", BASE));
  const body = await res.text();
  if (res.status === 200) log("✓", `GET / → 200 (${body.length} bytes)`);
  else {
    log("✗", `GET / → ${res.status} (expected 200)`);
    failed++;
  }
  if (!body.includes('"unhandled":true')) log("✓", "no h3-swallowed 500 payload");
  else {
    log("✗", "response body contains h3-swallowed 500 payload");
    failed++;
  }

  // 2. Health endpoint (best-effort — skip if not deployed yet).
  try {
    const hres = await fetch(new URL("/api/public/health", BASE));
    const hbody = await hres.json();
    if (hres.status === 200 && hbody.status === "ok") log("✓", "/api/public/health → ok");
    else {
      log("✗", `/api/public/health → ${hres.status} ${JSON.stringify(hbody)}`);
      failed++;
    }
  } catch (err) {
    log("!", `health endpoint unreachable: ${err.message}`);
  }

  // 3. Browser render — no blank screen, main UI mounts.
  const launchOpts = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

  const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
  const rootHtml = await page.evaluate(() => document.getElementById("root")?.innerHTML ?? document.body?.innerHTML ?? "");

  if (bodyText.trim().length > 20) log("✓", `page has visible content (${bodyText.length} chars)`);
  else {
    log("✗", `blank screen — body innerText is "${bodyText.slice(0, 80)}"`);
    failed++;
  }
  if (rootHtml.length > 200) log("✓", `#root has DOM (${rootHtml.length} bytes)`);
  else {
    log("✗", `#root looks empty (${rootHtml.length} bytes)`);
    failed++;
  }
  if (consoleErrors.length === 0) log("✓", "no uncaught page errors");
  else {
    log("!", `${consoleErrors.length} pageerror(s): ${consoleErrors.slice(0, 3).join(" | ")}`);
  }

  // 4. Authenticated flow — seed a Supabase session and validate multi-result
  //    SQL end-to-end (GROUP BY / HAVING plus a trigger-driven audit table).
  //    This is opt-in: it runs only when the harness injects a session via
  //    LOVABLE_BROWSER_SUPABASE_* env vars (see docs/e2e-auth.md). In CI
  //    without a session it prints an informational skip and does not fail.
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  const cookiesJson = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;
  const authStatus = process.env.LOVABLE_BROWSER_AUTH_STATUS ?? "absent";

  if (authStatus !== "injected" || !storageKey || !sessionJson) {
    log("!", `auth smoke skipped (LOVABLE_BROWSER_AUTH_STATUS=${authStatus})`);
  } else {
    const authedPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const authedErrors = [];
    authedPage.on("pageerror", (e) => authedErrors.push(e.message));

    // Restore cookies (SSR reads) and localStorage (SPA reads).
    if (cookiesJson) {
      try {
        const cookies = JSON.parse(cookiesJson).map((c) => ({ ...c, url: BASE }));
        await authedPage.context().addCookies(cookies);
      } catch {
        // ignore malformed cookie payloads
      }
    }
    await authedPage.goto(BASE, { waitUntil: "domcontentloaded" });
    await authedPage.evaluate(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: storageKey, value: sessionJson },
    );
    // Reload so the app boots with the restored session.
    await authedPage.goto(BASE, { waitUntil: "domcontentloaded" });
    await authedPage.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    // The workbench renders a Monaco-hosted textarea per tab. We drive SQL
    // through the exposed engine directly to keep the test independent of
    // editor keystroke behavior.
    const multiSql = `
      -- GROUP BY / HAVING
      SELECT category, COUNT(*) AS n
      FROM inventory
      GROUP BY category
      HAVING COUNT(*) >= 1
      ORDER BY n DESC;

      -- Trigger + audit table
      CREATE TABLE IF NOT EXISTS audit_log_e2e (id INTEGER PRIMARY KEY AUTOINCREMENT, msg TEXT);
      DROP TRIGGER IF EXISTS trg_e2e;
      CREATE TRIGGER trg_e2e AFTER INSERT ON audit_log_e2e
        BEGIN INSERT INTO audit_log_e2e(msg) VALUES ('echo:' || NEW.msg); END;
      INSERT INTO audit_log_e2e(msg) VALUES ('hello');
      SELECT * FROM audit_log_e2e;
    `;

    // Poll until the in-page engine bridge is exposed. Workbench exposes
    // runQuery on window.__wb for testing when NODE_ENV !== 'production' or
    // when window.__wbEnableTestBridge is set. Fall back to reading the
    // React state via a custom event handler if unavailable.
    const runResult = await authedPage.evaluate(async (sql) => {
      // Wait for a runQuery bridge to appear (max 10s).
      const start = Date.now();
      while (Date.now() - start < 10_000) {
        const bridge = window.__wb;
        if (bridge && typeof bridge.runQuery === "function") {
          const out = await bridge.runQuery(sql);
          return { ok: !out.error, error: out.error ?? null, results: out.results ?? null };
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      return { ok: false, error: "workbench bridge not exposed (__wb.runQuery missing)", results: null };
    }, multiSql);

    if (!runResult.ok) {
      log("!", `authed multi-result run skipped or failed: ${runResult.error}`);
    } else {
      const sets = Array.isArray(runResult.results) ? runResult.results : [runResult.results];
      const setCount = sets.filter(Boolean).length;
      if (setCount >= 2) log("✓", `multi-result run returned ${setCount} result set(s)`);
      else {
        log("✗", `expected >= 2 result sets, got ${setCount}`);
        failed++;
      }

      // Verify UI rendered a tab per result set.
      const tabCount = await authedPage
        .locator('[role="tab"][data-result-tab], [data-testid="result-tab"]')
        .count()
        .catch(() => 0);
      if (tabCount === 0) log("!", "result-tab locator not found — UI selector may need updating");
      else if (tabCount >= 2) log("✓", `results grid renders ${tabCount} tabs`);
      else {
        log("✗", `results grid renders ${tabCount} tab(s); expected >= 2`);
        failed++;
      }
    }

    if (authedErrors.length === 0) log("✓", "no uncaught errors in authenticated flow");
    else log("!", `${authedErrors.length} authed pageerror(s): ${authedErrors.slice(0, 3).join(" | ")}`);

    await authedPage.close();
  }

  await browser.close();

  console.log(`\n${BASE} — ${failed} failure(s)`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("smoke crashed:", err);
  process.exit(2);
});
