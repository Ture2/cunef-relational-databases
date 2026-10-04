// Runs every runnable SQL card (and the sandbox examples) of the website in headless Chromium, in
// both languages, and reports the ones that fail unexpectedly (or do not fail when expectError is set).
// Needs network access: the SQL engine (sql.js) loads from cdnjs.
//
//   cd tools && npm i && node check-cards.mjs [en|es] [cardId ...]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const [, , ...argv] = process.argv;
const LANGS = argv.filter((a) => a === 'en' || a === 'es');
const ONLY = argv.filter((a) => a !== 'en' && a !== 'es');

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

for (const lang of LANGS.length ? LANGS : ['en', 'es']) {
  const context = await browser.newContext({ locale: lang });
  await context.addInitScript((l) => { localStorage.setItem('lang', l); }, lang);
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => { if (/\[i18n\]/.test(m.text())) problems.push(m.text()); });
  await page.goto(base);
  const cards = await page.evaluate(() => SQL_CONCEPTS.filter((c) => c.sql).map((c) => ({ id: c.id, expectError: !!c.sql.expectError })));
  const examples = await page.evaluate(() => SQL_SANDBOX.examples.map((e, i) => ({ id: `sandbox-${i}`, i })));
  console.log(`[${lang}] ${cards.length} cards, ${examples.length} sandbox examples`);

  for (const c of cards.filter((x) => !ONLY.length || ONLY.includes(x.id))) {
    await page.goto(`${base}#/relational/sql/${c.id}`);
    await page.waitForSelector('[data-action="sql-run"]');
    await page.click('[data-action="sql-run"]');
    await page.waitForSelector('.sql-time', { timeout: 60000 });
    const failed = await page.locator('.sql-out .feedback.bad').count();
    const unsupported = await page.locator('.sql-out .feedback.mixed').count();
    const warn = await page.locator('.sql-warn').count();
    const msg = failed ? await page.locator('.sql-out .feedback.bad').first().innerText() : '';
    // An expected error must come from the LAST statement: the rest of the script has to run.
    const lastFails = failed > 0 && (await page.evaluate((id) => {
      const total = OracleDialect.script(SQL_CONCEPTS.find((x) => x.id === id).sql.query).filter((u) => !u.silent).length;
      const shown = [...document.querySelectorAll('.sql-out .sql-n')].map((e) => +e.textContent);
      return shown.length === total;
    }, c.id));
    const ok = c.expectError ? lastFails : failed === 0 && warn === 0 && unsupported === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.id}${c.expectError ? ' (expects an error)' : ''}${msg ? ` → ${msg.replace(/\s+/g, ' ')}` : ''}${warn ? ' [lint warning]' : ''}${unsupported ? ' [unsupported]' : ''}`);
  }
  for (const ex of examples.filter((x) => !ONLY.length || ONLY.includes(x.id))) {
    await page.goto(`${base}#/relational/sql/practice`);
    await page.waitForSelector('[data-action="sql-example"]');
    await page.locator('[data-action="sql-example"]').nth(ex.i).click();
    await page.waitForSelector('.sql-time', { timeout: 60000 });
    const failed = await page.locator('.sql-out .feedback.bad').count();
    const warn = await page.locator('.sql-warn').count();
    if (failed || warn) { bad++; console.log(`FAIL ${ex.id} ${failed ? 'error' : ''} ${warn ? 'lint warning' : ''}`); } else console.log(`ok   ${ex.id}`);
  }
  // Every challenge: its reference solution passes its own check, and a wrong query does not.
  const challenges = await page.evaluate(() => SQL_CHALLENGES.map((c, i) => ({ id: c.id, n: i + 1, solution: c.solution })));
  await page.evaluate(() => localStorage.removeItem('sql-challenges-v1'));
  for (const c of challenges.filter((x) => !ONLY.length || ONLY.includes(x.id))) {
    await page.goto(`${base}#/relational/sql/practice/${c.n}`);
    await page.reload();
    await page.waitForSelector('#ch-editor');
    await page.fill('#ch-editor', 'SELECT 1 FROM dual;');
    await page.click('[data-action="ch-check"]');
    await page.waitForSelector('#feedback .feedback');
    const wrongRejected = await page.locator('#feedback .feedback.bad').count();
    await page.fill('#ch-editor', c.solution);
    await page.click('[data-action="ch-check"]');
    await page.waitForSelector('#feedback .feedback.ok', { timeout: 20000 }).catch(() => {});
    const accepted = await page.locator('#feedback .feedback.ok').count();
    if (!wrongRejected || !accepted) bad++;
    console.log(`${wrongRejected && accepted ? 'ok  ' : 'FAIL'} challenge ${c.id}${wrongRejected ? '' : ' (wrong query accepted)'}${accepted ? '' : ' (solution rejected)'}`);
  }
  // The DDL generated for every ER → logical exercise must run through the Oracle layer.
  const ddl = await page.evaluate(() => LOGICAL_EXERCISES.map((ex) => ({ id: ex.id, sql: LogicalSection.sqlFor(LogicalSection.variantToStudent(LogicalEngine.variants(ex)[0])) })));
  const { DatabaseSync } = await import('node:sqlite');
  const Oracle = (await import('node:module')).createRequire(import.meta.url)('../js/oracle-dialect.js');
  for (const d of ddl) {
    const db = new DatabaseSync(':memory:');
    try {
      Oracle.script(d.sql, { finish: true }).forEach((u) => u.sqls.forEach((q) => db.exec(q)));
      if (!/ VARCHAR2\(/.test(d.sql) || /\bVARCHAR\(/.test(d.sql)) throw new Error('not Oracle types');
    } catch (e) { bad++; console.log(`FAIL ddl ${d.id}: ${e.message}`); }
    db.close();
  }
  console.log(`[${lang}] ${ddl.length} generated DDL scripts checked`);
  if (problems.length) { bad++; console.log('page problems:', [...new Set(problems)].slice(0, 8)); }
  await context.close();
}
await browser.close();
server.close();
console.log(bad ? `${bad} problem(s)` : 'all cards run');
process.exit(bad ? 1 : 0);
