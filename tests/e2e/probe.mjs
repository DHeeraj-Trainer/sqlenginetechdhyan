import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const ctx = await b.newContext();
await ctx.addInitScript(() => { window.__wbEnableTestBridge = true; });
const p = await ctx.newPage();
await p.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !!window.__wb, null, { timeout: 60000 });
await p.evaluate(() => window.__wb.switchEngine('mysql'));
await p.waitForFunction(() => window.__wb && window.__wb.engineId === 'mysql' && window.__wb.status === 'ready', null, { timeout: 90000, polling: 200 });
const seed = await p.evaluate(() => window.__wb.runQuery(`
  DROP TABLE IF EXISTS orders;
  CREATE TABLE orders (id INT PRIMARY KEY, customer VARCHAR(32), note VARCHAR(32));
  INSERT INTO orders VALUES (1,'alice','first'),(2,'bob',NULL),(3,'carol','vip'),(4,'dave',NULL),(5,'erin','promo');
`));
console.log('seed', JSON.stringify(seed));
for (const q of [
  "SELECT id, customer, note FROM orders ORDER BY 2 ASC NULLS LAST, LENGTH(customer) DESC;",
  "SELECT id, customer, note FROM orders ORDER BY note ASC NULLS LAST, LENGTH(customer) DESC;",
  "SELECT id, customer, note FROM orders ORDER BY 3 ASC NULLS LAST, LENGTH(customer) DESC;",
  "SELECT id, customer, note FROM orders ORDER BY 3 ASC NULLS LAST, 2 DESC;",
]) {
  const r = await p.evaluate((s) => window.__wb.runQuery(s), q);
  console.log(q, '=>', JSON.stringify(r.rows || r.error));
}
await b.close();
