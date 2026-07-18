import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const p = await b.newPage();
await p.goto('http://localhost:8080/workbench', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__wb && window.__wb.runQuery, null, { timeout: 20000 });
const seed = await p.evaluate(() => window.__wb.runQuery(`
  DROP TABLE IF EXISTS orders;
  CREATE TABLE orders (id INT PRIMARY KEY, customer VARCHAR(32), note VARCHAR(32));
  INSERT INTO orders VALUES (1,'alice','first'),(2,'bob',NULL),(3,'carol','vip'),(4,'dave',NULL),(5,'erin','promo');
`));
console.log('seed', JSON.stringify(seed));
const r1 = await p.evaluate(() => window.__wb.runQuery("SELECT id, customer, note FROM orders ORDER BY 2 ASC NULLS LAST, LENGTH(customer) DESC;"));
console.log('r1', JSON.stringify(r1));
const r2 = await p.evaluate(() => window.__wb.runQuery("SELECT id, customer, note FROM orders ORDER BY note ASC NULLS LAST, LENGTH(customer) DESC;"));
console.log('r2', JSON.stringify(r2));
const r3 = await p.evaluate(() => window.__wb.runQuery("SELECT id, customer, note FROM orders ORDER BY 3 ASC NULLS LAST, LENGTH(customer) DESC;"));
console.log('r3', JSON.stringify(r3));
await b.close();
