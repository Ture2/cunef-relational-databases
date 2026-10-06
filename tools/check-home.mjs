// Checks the landing page in both languages: cards, Continue target, links and missing translations.
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
for (const lang of ['en', 'es']) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => { if (/\[i18n\]/.test(m.text())) problems.push(m.text()); });
  await page.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('lang', l); sessionStorage.setItem('seeded', '1'); } }, lang);
  await page.goto(base);
  await page.waitForSelector('.home');
  expect((await page.$$('.home-card')).length === 5, `[${lang}] five section cards`);
  expect((await page.getAttribute('.home-resume .btn', 'href')) === '#/relational/theory', `[${lang}] fresh Continue goes to theory`);
  await page.click('.home-card a.btn.ghost >> nth=0');
  expect(page.url().endsWith('#/relational/theory/quiz'), `[${lang}] quiz link opens`);
  await page.click('.brand');
  await page.waitForSelector('.home');
  expect((await page.getAttribute('.home-resume .btn', 'href')) === '#/relational/theory/quiz', `[${lang}] Continue resumes last place`);
  // Section menus in the top bar: every section has one; ER lists the diagram editor, SQL the sandbox.
  expect((await page.$$('#section-nav .mode-more')).length === 5, `[${lang}] every section in the top bar has a tools menu`);
  const menuOf = async (id) => {
    await page.click(`.mode-more[data-menu="${id}"]`);
    return page.$$eval('#section-menu:not([hidden]) a', (l) => l.map((a) => a.getAttribute('href')));
  };
  const er = await menuOf('er');
  const sql = await menuOf('sql');
  expect(er.includes('#/relational/er/practice/draw') && er.includes('#/relational/er/quiz'), `[${lang}] the ER menu lists the diagram editor and the quiz (${er.length} links)`);
  expect(sql.includes('#/relational/sql/practice') && await page.getAttribute('.mode-more[data-menu="er"]', 'aria-expanded') === 'false', `[${lang}] the SQL menu lists the sandbox, and opening it closes the ER menu`);
  await page.keyboard.press('Escape');
  expect(await page.$('#section-menu[hidden]') && await page.evaluate(() => document.activeElement.dataset.menu === 'sql'), `[${lang}] Escape closes the menu and gives the focus back to its button`);
  await page.focus('.mode-more[data-menu="er"]');
  await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => document.activeElement.closest('#section-menu') !== null), `[${lang}] ArrowDown opens the menu and focuses its first link`);
  await page.hover('#section-nav .mode[data-mode="logical"] a');
  await page.waitForTimeout(250);
  expect(await page.getAttribute('.mode-more[data-menu="logical"]', 'aria-expanded') === 'true', `[${lang}] a mouse resting on a tab opens its menu`);
  await page.click('#section-menu li:last-child a');
  await page.waitForFunction(() => location.hash.startsWith('#/relational/logical/practice'));
  const hidden = await page.waitForSelector('#section-menu', { state: 'hidden', timeout: 1000 }).then(() => true, () => false);
  expect(hidden, `[${lang}] choosing a link opens it and closes the menu`);
  expect(problems.length === 0, `[${lang}] no errors/missing i18n ${problems.join('; ')}`);
  await page.close();
}
// On a phone the menu is a sheet across the width, without horizontal scroll.
{
  const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
  await page.goto(`${base}#/relational/er`);
  await page.waitForSelector('.concept');
  await page.click('.mode-more[data-menu="er"]');
  const m = await page.evaluate(() => ({ w: document.querySelector('#section-menu').getBoundingClientRect().width, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
  expect(m.w >= 370 && m.overflow <= 1, `[375px] the section menu spans the screen (${Math.round(m.w)}px) without horizontal scroll`);
  await page.close();
}
// App bar layout: Progress, Ask Claude and Settings form one group at the right end, evenly spaced;
// on narrow screens the summary PDF shares a row with the "Go to" menu.
for (const width of [375, 768, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.goto(`${base}?lang=en#/relational/er/cardinality`);
  await page.waitForSelector('.concept');
  const m = await page.evaluate(() => {
    const r = (sel) => document.querySelector(sel).getBoundingClientRect();
    const bar = r('.appbar .appbar-row');
    const items = ['#progress-btn', '#ask-btn', '#settings-btn'].map(r);
    const gaps = items.slice(1).map((b, i) => b.left - items[i].right);
    const side = document.querySelector('#side-go');
    const pdf = document.querySelector('.side-select .side-pdf');
    const sameRow = side && pdf && side.offsetParent && Math.abs(side.getBoundingClientRect().top - pdf.getBoundingClientRect().top) < 4;
    return { right: bar.right - items[2].right, gaps, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, sameRow, sideShown: !!(side && side.offsetParent) };
  });
  expect(m.right >= 0 && m.right <= 20, `[${width}px] the app bar actions sit at the right end (${Math.round(m.right)}px from it)`);
  expect(m.gaps.every((g) => g >= 6 && g <= 12), `[${width}px] even gaps between Progress, Ask Claude and Settings (${m.gaps.map(Math.round).join(', ')}px)`);
  expect(m.overflow <= 1, `[${width}px] no horizontal scroll`);
  if (m.sideShown) expect(m.sameRow, `[${width}px] the summary PDF is on the same row as the "Go to" menu`);
  await page.close();
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
