// Builds the link preview image (Open Graph / Twitter card), 1200×630: the title
// and a capture of the ER diagram editor (#/relational/er/practice/<EXERCISE>, official solution
// loaded into the builder), with headless Chromium.
// Output: ../assets/og-preview.png. Re-run after changing the look of the editor.
//
//   cd tools && npm i && node build-og.mjs
//
// Browser: $CHROME_PATH, else an installed Chrome / Edge, else Playwright's Chromium
// (`npx playwright install chromium`).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'og-preview.png');
const EXERCISE = 5;   // a small model that stays readable at preview size
const LANG = 'es';
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

const dataUri = (buf) => `data:image/png;base64,${buf.toString('base64')}`;

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}/`;
const executablePath = browserPath();
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const problems = [];

/* 1. The editor, at 2× so it stays sharp once scaled into the card. */
const context = await browser.newContext({ viewport: { width: 1240, height: 640 }, deviceScaleFactor: 2, colorScheme: 'light', locale: LANG });
await context.addInitScript((l) => { localStorage.clear(); localStorage.setItem('lang', l); localStorage.setItem('theme', 'light'); }, LANG);
const page = await context.newPage();
page.on('pageerror', (e) => problems.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(`${base}#/relational/er/practice/${EXERCISE}`);
await page.waitForSelector('#ex-title');
await page.click('[data-action="solution"]');
await page.waitForSelector('#sol-h');
await page.click('[data-action="use-solution"]');
await page.waitForSelector('#erp-preview svg');
const close = await page.$('[data-action="close-insp"]');
if (close) await close.click();
// A narrow list leaves the room to the diagram; Fit then sizes the model to the canvas.
await page.addStyleTag({ content: '.appbar { position: static !important; } .erp-board { --erp-list: 300px !important; }' });
await page.locator('.erp-toolbar').scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await page.click('[data-action="zoom-fit"]');
await page.waitForTimeout(300);
const { x, y, width, height } = await page.evaluate(() => {
  const tb = document.querySelector('.erp-toolbar').getBoundingClientRect();
  const bd = document.querySelector('.erp-board').getBoundingClientRect();
  const pad = 14;
  return { x: bd.left - pad + scrollX, y: tb.top - pad + scrollY, width: bd.width + 2 * pad, height: bd.bottom - tb.top + pad + 2 };
});
const editor = await page.screenshot({ fullPage: true, clip: { x, y, width, height } });
await context.close();

/* 2. The card. */
const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await card.setContent(`<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; position: relative; background: #f0ece8; font-family: Arial, Helvetica, sans-serif; color: #1a1f6c; }
  /* One row, centred: the text column takes the capture's height, so the title's cap line meets the
     capture's top edge and the address's baseline its bottom edge. Same 64px margin on both sides. */
  .row { position: absolute; left: 64px; right: 64px; top: 50%; transform: translateY(-50%); display: flex; gap: 44px; align-items: stretch; }
  .text { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
  h1 { margin: -6px 0 0; font-size: 54px; line-height: 1.05; letter-spacing: -0.5px; }
  .sub { margin: 20px 0 0; font-size: 23px; line-height: 1.35; color: #3a3f7e; }
  .en { margin: 14px 0 0; font-size: 19px; color: #5b5f8f; }
  .bar { width: 56px; height: 6px; background: #ff5700; margin-bottom: 14px; }
  .url { margin-bottom: -4px; font-size: 19px; font-weight: 700; }
  .shot { flex: 0 0 612px; align-self: center; border: 1px solid #d6d1c4; border-radius: 10px; background: #fff; overflow: hidden;
          box-shadow: 0 22px 50px rgba(26, 31, 108, .18), 0 3px 10px rgba(26, 31, 108, .08); }
  .shot img { display: block; width: 100%; height: auto; }
</style></head><body>
  <div class="row">
    <div class="text">
      <div>
        <h1>Práctica de bases de datos</h1>
        <p class="sub">Diagramas E/R, paso a tablas, normalización y SQL, con corrección al instante.</p>
        <p class="en">Databases practice · Español / English</p>
      </div>
      <div><div class="bar"></div><p class="url">ture2.github.io/cunef-relational-databases</p></div>
    </div>
    <div class="shot"><img src="${dataUri(editor)}" alt=""></div>
  </div>
</body></html>`);
await card.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
await card.screenshot({ path: OUT });

await browser.close();
server.close();
if (problems.length) { console.error(`✗ og-preview.png: ${problems.join(' | ')}`); process.exit(1); }
console.log(`✓ og-preview.png (${Math.round(statSync(OUT).size / 1024)} KB)`);
