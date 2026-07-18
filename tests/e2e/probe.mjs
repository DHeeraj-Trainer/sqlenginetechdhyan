import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const ctx = await b.newContext();
await ctx.addInitScript(() => { window.__wbEnableTestBridge = true; });
const p = await ctx.newPage();
await p.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !!window.__wb, null, { timeout: 60000 });
await p.evaluate(() => window.__wb.switchEngine('mysql'));
await p.waitForFunction(() => window.__wb && window.__wb.engineId === 'mysql' && window.__wb.status === 'ready', null, { timeout: 90000, polling: 200 });
await p.evaluate(() => window.__wb.runQuery(`
  DROP TABLE IF EXISTS names;
  CREATE TABLE names (id INT PRIMARY KEY, name VARCHAR(64));
  INSERT INTO names VALUES (1,'apple'),(2,'Banana'),(3,NULL),(4,'cherry'),(5,'BLUEBERRY'),(6,NULL),(7,'avocado');
`));
for (const q of [
  "SELECT id, name FROM names ORDER BY (UPPER(name) COLLATE utf8mb4_bin) ASC NULLS LAST, id ASC;",
  "SELECT id, name FROM names ORDER BY (name COLLATE utf8mb4_bin) ASC NULLS LAST, id ASC;",
  "SELECT id, name FROM names ORDER BY name COLLATE utf8mb4_unicode_ci DESC NULLS FIRST, id ASC;",
  "SELECT id, name FROM names WHERE name IS NOT NULL ORDER BY UPPER(name) COLLATE utf8mb4_bin ASC, id ASC;",
  "SELECT id, name FROM names WHERE name IS NOT NULL ORDER BY (name) COLLATE utf8mb4_unicode_ci DESC, id ASC;",
]) {
  const r = await p.evaluate((s) => window.__wb.runQuery(s), q);
  console.log('---', q);
  console.log(JSON.stringify(r.results?.[0]?.rows ?? r.error));
}
await b.close();
