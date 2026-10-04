// Checks the site search in both languages: results, accents, typos, highlighting in the opened page.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  let file = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/`;
const candidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const executablePath = candidates.find((p) => p && existsSync(p));
const browser = await chromium.launch(executablePath ? { executablePath } : {});
let bad = 0;
const expect = (ok, what) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };
for (const [lang, q, typo, accentQ] of [['en', 'foreign key', 'forein key', 'normalisation'], ['es', 'clave ajena', 'clabe ajena', 'indice']]) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => { if (/\[i18n\]/.test(m.text())) problems.push(m.text()); });
  await page.addInitScript((l) => localStorage.setItem('lang', l), lang);
  await page.goto(base);
  await page.waitForSelector('#site-search input');
  const stats = await page.evaluate(() => SearchIndex.size());
  console.log(`[${lang}] index: ${stats.docs} documents, ${stats.terms} terms`);
  const results = async (text) => {
    await page.fill('#site-search input', text);
    return page.$$eval('.search-item', (els) => els.map((e) => e.querySelector('.search-title').textContent));
  };
  const r1 = await results(q);
  expect(r1.length > 0, `[${lang}] "${q}" → ${r1.length} results, first: ${r1[0]}`);
  const r2 = await results(typo);
  expect(r2.length > 0, `[${lang}] typo "${typo}" still finds ${r2.length} results`);
  const r3 = await results(accentQ);
  expect(r3.length > 0, `[${lang}] "${accentQ}" → ${r3.length} results`);
  const r4 = await results('zzzqqq');
  expect((await page.locator('.search-none').count()) === 1 && r4.length === 0, `[${lang}] nonsense gives "no results"`);
  await results(q);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForSelector('mark.search-hit', { timeout: 5000 }).catch(() => {});
  const marks = await page.locator('#view mark.search-hit').count();
  expect(marks > 0, `[${lang}] opening a result highlights ${marks} matches in the page (${await page.evaluate(() => location.hash)})`);
  await page.keyboard.press('Escape');
  expect(!problems.length, `[${lang}] no page errors${problems.length ? `: ${problems.slice(0, 3).join(' | ')}` : ''}`);
  if (lang === 'en') { await page.fill('#site-search input', 'foreign key'); await page.waitForSelector('.search-item'); await page.screenshot({ path: process.argv[2] || 'search.png', clip: { x: 0, y: 0, width: 1200, height: 520 } }); }
  await page.close();
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
