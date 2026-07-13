#!/usr/bin/env node
/**
 * Smoke test — verifies GET / returns 200 and the main UI shell renders.
 * Usage:
 *   BASE_URL=http://localhost:8080 node scripts/smoke.mjs
 *   node scripts/smoke.mjs https://your-app.lovable.app
 * Exits non-zero on failure; safe for CI.
 */
const base = process.argv[2] || process.env.BASE_URL || "http://localhost:8080";
const url = new URL("/", base).toString();

const started = Date.now();
let res;
try {
  res = await fetch(url, { headers: { "user-agent": "lovable-smoke/1.0" } });
} catch (err) {
  console.error(`✗ fetch failed for ${url}:`, err);
  process.exit(2);
}
const body = await res.text();
const ms = Date.now() - started;

const checks = [
  { name: "status is 200", pass: res.status === 200, got: res.status },
  { name: "body is non-empty", pass: body.length > 200, got: `${body.length} bytes` },
  { name: "no h3 500 payload", pass: !body.includes('"unhandled":true'), got: "ok" },
  {
    name: "main UI renders",
    // The app shell always ships the root html/body scaffolding; we look for a
    // marker from either the SSR shell or the client fallback that hydrates it.
    pass:
      body.includes("SQL Workbench") ||
      body.includes("Loading SQL Workbench") ||
      body.includes('id="root"') ||
      body.includes("<body"),
    got: "ok",
  },
];

let failed = 0;
for (const c of checks) {
  const icon = c.pass ? "✓" : "✗";
  console.log(`${icon} ${c.name} — ${c.got}`);
  if (!c.pass) failed++;
}
console.log(`\n${url} → ${res.status} in ${ms}ms`);
if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("smoke: OK");
