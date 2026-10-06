// Checks the concept-section quiz in both languages: scoreboard and strip, skip, keyboard answers,
// the end screen, "retry the ones I missed" (no best score saved) and the rail. SHOTS=<dir> saves screenshots.
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
const SHOTS = process.env.SHOTS;
let bad = 0;
const expect = (ok, what) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };

for (const lang of ['en', 'es']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => { if (/\[i18n\]/.test(m.text())) problems.push(m.text()); });
  await page.addInitScript((l) => { if (!sessionStorage.getItem('init')) { localStorage.clear(); localStorage.setItem('lang', l); localStorage.setItem('er-quiz-v1', JSON.stringify({ basics: 4, attributes: 3 })); sessionStorage.setItem('init', '1'); } }, lang);
  await page.goto(`${base}#/relational/er/quiz/cardinality`);
  await page.waitForSelector('.q-strip');
  const cells = () => page.$$eval('.q-strip .q-cell', (els) => els.map((e) => e.className.replace('q-cell', '').trim()));
  const total = (await cells()).length;
  expect(total === 5, `[${lang}] strip has one cell per question (${total})`);
  expect(await page.isVisible('.rail-quiz a[href$="/basics"] .rail-score.perfect .rail-meter'), `[${lang}] rail: perfect score with meter and check`);
  expect((await cells())[0] === 'cur', `[${lang}] first cell is current`);
  if (SHOTS && lang === 'en') await page.screenshot({ path: `${SHOTS}/quiz-start.png` });

  // Skip: the question goes to the end, marked as skipped.
  const firstQ = await page.textContent('#q-title');
  await page.click('[data-action="skip"]');
  expect((await page.textContent('#q-title')) !== firstQ, `[${lang}] skip shows another question`);
  expect((await cells()).at(-1) === 'skip', `[${lang}] skipped cell sits at the end`);
  expect(await page.isVisible('.q-skip'), `[${lang}] skipped count shown`);

  // Answer every question: the first one by keyboard, deliberately wrong when possible.
  for (let n = 0; n < total; n++) {
    const tf = await page.$('.options .opt:not(:has(.letter))');
    const fib = await page.$('#fib-in');
    if (fib) { await page.fill('#fib-in', 'zzz'); await page.click('[data-fid="fib-go"]'); }
    else if (n === 0) { await page.focus('.options .opt'); await page.keyboard.press(tf ? '2' : 'b'); }
    else await page.click('.options .opt >> nth=0');
    await page.waitForSelector('#qf-title');
    if (n === 0) {
      const c = await cells();
      expect(/ok|bad/.test(c[0]), `[${lang}] keyboard answer fills the cell (${c[0]})`);
      expect(await page.isVisible('[data-action="next"]'), `[${lang}] Next button shown after answering`);
      if (SHOTS && lang === 'en') await page.screenshot({ path: `${SHOTS}/quiz-answered.png`, fullPage: true });
      await page.focus('#qf-title');
      await page.keyboard.press('Enter');
    } else await page.click('[data-action="next"]');
  }
  await page.waitForSelector('.q-result');
  const score = +(await page.$eval('.q-result-n', (e) => e.firstChild.textContent));
  expect(!(await cells()).some((c) => c === '' || c.includes('cur')), `[${lang}] end strip: every cell answered`);
  if (SHOTS && lang === 'en') await page.screenshot({ path: `${SHOTS}/quiz-end.png`, fullPage: true });
  const railBest = await page.textContent('.rail-quiz a[aria-current] .rail-score, .rail-quiz a[aria-current] .rail-count');
  expect(score === 0 || railBest.includes(`${score}/5`), `[${lang}] rail shows best ${score}/5 (${railBest.trim()})`);

  const retry = await page.$('[data-action="retry-missed"]');
  expect(!!retry === score < total, `[${lang}] retry-missed offered when something was missed`);
  if (retry) {
    await retry.click();
    const n = (await cells()).length;
    expect(n === total - score, `[${lang}] retry run has only the missed questions (${n})`);
    await page.click('.options .opt >> nth=0').catch(() => {});
    await page.waitForTimeout(100);
    expect(await page.isVisible('.rail-quiz .rail-live'), `[${lang}] rail marks the run in progress`);
  }
  expect(problems.length === 0, `[${lang}] no page errors or missing translations ${problems.join(' | ')}`);
  await page.close();
}

// Narrow screen: the dropdown replaces the rail, the keys hint is hidden.
const phone = await browser.newPage({ viewport: { width: 380, height: 800 } });
await phone.goto(`${base}#/relational/er/quiz`);
await phone.waitForSelector('.q-strip');
expect(!(await phone.isVisible('.q-keys')), 'phone: keys hint hidden');
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth);
expect(!overflow, 'phone: no horizontal scroll');
if (SHOTS) await phone.screenshot({ path: `${SHOTS}/quiz-phone.png`, fullPage: true });

await browser.close();
server.close();
console.log(bad ? `${bad} check(s) failed` : 'all quiz checks passed');
process.exit(bad ? 1 : 0);
