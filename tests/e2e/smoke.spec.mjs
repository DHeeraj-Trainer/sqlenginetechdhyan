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
  const browser = await chromium.launch({ headless: true });
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

  await browser.close();

  console.log(`\n${BASE} — ${failed} failure(s)`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("smoke crashed:", err);
  process.exit(2);
});
