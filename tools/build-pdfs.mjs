// Builds the summary PDF of every section, in every language, from the site's own
// summary sheets (#/relational/<section>/summary), with headless Chromium.
// Output: ../assets/pdf/<section>-<lang>.pdf. Re-run after editing anything in data/.
//
//   cd tools && npm i && npm run pdfs
//
// Browser: $CHROME_PATH, else an installed Chrome / Edge, else Playwright's Chromium
// (`npx playwright install chromium`).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'pdf');
const SECTIONS = ['theory', 'er', 'logical', 'normalization', 'sql'];
const LANGS = ['en', 'es'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

/* A static server for the repository (the site has no build step). */
function serve() {
  const server = createServer((req, res) => {
    let file = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

function browserPath() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  return candidates.find((p) => p && existsSync(p));
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}/`;
const executablePath = browserPath();
const browser = await chromium.launch(executablePath ? { executablePath } : {});
mkdirSync(OUT, { recursive: true });
let failed = false;

for (const lang of LANGS) {
  const context = await browser.newContext({ colorScheme: 'light', locale: lang });
  await context.addInitScript((l) => { localStorage.setItem('lang', l); localStorage.setItem('theme', 'light'); }, lang);
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || /\[i18n\]/.test(m.text())) problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(e.message));

  for (const id of SECTIONS) {
    problems.length = 0;
    await page.goto(`${base}#/relational/${id}/summary`);
    await page.waitForSelector('.summary-sheet');
    await page.evaluate(() => document.fonts.ready);
    const { section, footer } = await page.evaluate(() => ({
      section: document.querySelector('.ss-head h1').textContent,
      footer: document.querySelector('.ss-course').textContent,
    }));
    const date = new Date().toISOString().slice(0, 10);
    const file = join(OUT, `${id}-${lang}.pdf`);
    await page.pdf({
      path: file,
      format: 'A4',
      printBackground: true,
      scale: 0.8,                       // a denser sheet: about 12 px body text on A4
      margin: { top: '18mm', bottom: '16mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true,
      headerTemplate: `<div style="width:100%;padding:0 14mm;font:8px Arial,sans-serif;color:#6b6f9a;display:flex;justify-content:space-between"><span>CUNEF Universidad · ${esc(footer)}</span><span>${esc(section)}</span></div>`,
      footerTemplate: `<div style="width:100%;padding:0 14mm;font:8px Arial,sans-serif;color:#6b6f9a;display:flex;justify-content:space-between"><span>${date}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });
    const kb = Math.round(statSync(file).size / 1024);
    if (problems.length) { failed = true; console.error(`✗ ${id}-${lang}.pdf: ${problems.join(' | ')}`); } else console.log(`✓ ${id}-${lang}.pdf (${kb} KB)`);
  }
  await context.close();
}

await browser.close();
server.close();
if (failed) process.exit(1);
