// Checks Query for a Million (#/game) in headless Chromium, in both languages, playing only through the page
// as a student would. Contract: docs/game-quiz.md (§8 hooks, §11 tests, §13 modes) and docs/game-visual.md.
//   1. The select screen (#/game): six tiles with their keywords, no best score until there is one, Mixed open
//      from the start (a link, no lock), unknown modes redirected to #/game.
//   2. Each of the five modes (#/game/<mode>): the seeded draw, Run of the reference (a table, a diff of the
//      touched table, or the new columns), a statement of the wrong kind refused at no cost, the reference
//      passing, Key clause, a known trap of GAME_BANK opening the rescue, Review; per-mode saves, drafts and
//      lifelines across reloads and mode switches.
//   3. A select run in depth (round 4): the loop above the fold at 1440 × 900, no Walk away at rung 1, the
//      lifeline descriptions, Oracle's rules in Run, the Lock in refusals and dialog, the suspense, the three
//      lifelines, reload, walking away, Play again and Choose another mode; then a rescue and a loss at rung 7.
//   4. Delete played to a full win and Structure to rung 6 (reached); Mixed played from a fresh progress (no
//      unlock needed): one statement kind per band, the big chip, a pass and a wrong-kind refusal.
//   5. Migration of the v1 keys; the onboarding tour on the select screen (n of 6, with "Study or competitive")
//      and in a run (n of 6, the spotlight); always light on a dark site; snippets, schema names and the language
//      switch; the layout at 1440 and 390 px, light and dark site: select screen, tour, run and end screen.
//   6. Competitive on Supabase (§15), with COMP=1 (or --comp) only, against the LOCAL stack (Docker): the set-up
//      messages (no anon key, a server that does not answer), sign-in with the email code (Mailpit) and the
//      @cunef.edu rule, the name asked once, the tiles with "n of 3 left today", an attempt (the countdown, paste
//      and drop blocked and counted, Run local, Key clause, a refusal at no cost, the rescue and Review, a loss, a
//      new draw), expiry, the daily limit, the million played with the private solutions (the certificate, the
//      badge on the tile and in the database), no private solution in the DOM, the storage or any response of the
//      comp function; teacher mode (a student refused; the list, an attempt with its references and flags, Pick 2,
//      CSV, a test attempt with Jump and Force and no badge); 390 px. Skipped with a message when Docker, the
//      stack, the private bank or jsDelivr is missing.
// Run from tools/: node check-game.mjs [en|es] [--comp]  (default both languages; SHOTS=<dir> saves screenshots;
// COMP=1 or --comp adds the competitive checks; needs `npm i` in tools/ once).
//
// Deterministic: the page reads localStorage 'game-seed' when it starts a run (js/game.js, newSeed()); this
// check sets it to SEED, so the same questions are drawn every time. The answers come from the page itself:
// GAME_BANK (data/game-bank*.js) holds the reference solution and the traps of every question.
// sql.js is served from tools/node_modules (same pinned version as the CDN), so no network is needed.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 1;
const SQLJS_DIR = join(ROOT, 'tools', 'node_modules', 'sql.js', 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
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
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const ARGS = process.argv.slice(2);
const LANGS = ARGS.filter((a) => a === 'en' || a === 'es').length ? ARGS.filter((a) => a === 'en' || a === 'es') : ['en', 'es'];
const COMP = process.env.COMP === '1' || ARGS.includes('--comp');
let bad = 0;
const expect = (ok, what) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };
const t0 = Date.now();

const BASE_MODES = ['select', 'insert', 'update', 'delete', 'ddl'];
const MODES = [...BASE_MODES, 'mixed'];
const KW = { select: 'SELECT', insert: 'INSERT', update: 'UPDATE', delete: 'DELETE', ddl: 'CREATE', mixed: 'MIX' };
// A statement of another kind for each mode (Lock in must refuse it without cost) and the message the page shows.
const WRONG = {
  select: ['DELETE FROM sales WHERE sale_id = 1', 'This question takes a SELECT query.'],
  insert: ['SELECT * FROM games', 'This question takes INSERT statements.'],
  update: ['DELETE FROM sales WHERE sale_id = 1', 'This question takes UPDATE statements.'],
  delete: ["UPDATE games SET stock = 1 WHERE game_id = 1", 'This question takes DELETE statements.'],
  ddl: ["INSERT INTO customers VALUES (101, 'Ana Ruiz', 'Spain', DATE '2025-01-01', 0)", 'This question takes CREATE, ALTER or DROP statements.'],
};
// Statements of the right kind that the sandbox cannot grade like Oracle: refused at no cost too.
const EXTRA = {
  insert: ["INSERT INTO sales VALUES (1001, 1, 1, '2025-01-01', 1, 59.99)"],                 // text where a DATE goes
  update: ['UPDATE (SELECT stock FROM games WHERE game_id = 1) SET stock = 2'],               // an inline view
};
const V1_KEYS =['game-quiz-v1', 'game-best-v1', 'game-quiz-draft-v1', 'game-quiz-pending-v1'];

/* A fresh browser context: storage cleared once, language and seed set, sql.js served locally.
   seen: false leaves 'game-intro-seen' unset, so the onboarding tour opens over the page (js/game-intro.js). */
async function open(lang, { width = 1440, height = 900, reduced = true, scale = 1, seen = true, scheme = 'light', comp = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, reducedMotion: reduced ? 'reduce' : 'no-preference', colorScheme: scheme });
  // comp: { url, anon }: the page gets this competition server instead of the one in data/game-comp-config.js
  // (the local stack's URL and demo key; nothing is written to the repository).
  if (comp) {
    const js = `'use strict';\nconst GAME_COMP_CONFIG = ${JSON.stringify({ supabaseUrl: comp.url, anonKey: comp.anon, limitMinutes: 60, dailyAttempts: 3 })};\n`;
    await context.route('**/data/game-comp-config.js', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: js }));
  }
  if (existsSync(join(SQLJS_DIR, 'sql-wasm.wasm'))) {
    await context.route('https://cdnjs.cloudflare.com/ajax/libs/sql.js/**', (route) => {
      const file = join(SQLJS_DIR, basename(new URL(route.request().url()).pathname));
      return existsSync(file) ? route.fulfill({ path: file }) : route.continue();
    });
  }
  await context.addInitScript(([l, seed, skip]) => {
    if (!sessionStorage.getItem('init')) {
      localStorage.clear(); localStorage.setItem('lang', l); localStorage.setItem('game-seed', String(seed)); sessionStorage.setItem('init', '1');
      if (skip) localStorage.setItem('game-intro-seen', '1');
    }
  }, [lang, SEED, seen]);
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => { if (/\[i18n\]/.test(m.text())) problems.push(m.text()); });
  return { context, page, problems };
}

/* ---- Page helpers ------------------------------------------------------------------------ */
// The select screen, or the run of a mode, drawn and ready.
const ready = (page, m = null) => page.waitForSelector(m === null ? '#view section.wr-game #wr-hud' : m ? `#view section.wr-game[data-mode="${m}"] #wr-ladder` : '#view section.wr-game[data-mode=""] #wr-modes', { timeout: 30000 });
const hash = (page) => page.evaluate(() => location.hash);
/* Goes to a route in the same document (a hash change: the page module renders it) and waits for it. */
async function go(page, route, m) {
  if (await hash(page) === route) await page.reload(); else await page.evaluate((r) => { location.hash = r; }, route);
  await ready(page, m);
}
const state = (page) => page.evaluate(() => GamePage.debug());
const store = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('game-quiz-v2') || 'null'));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const norm = (s) => String(s || '').replace(/\*\*|`/g, '').replace(/\s+/g, '');
// The current question of the bank (solution, template, traps, mode), read in the page.
const current = (page) => page.evaluate(() => {
  const s = GamePage.debug();
  const id = s.ids[s.level - 1];
  const q = GAME_BANK.questions.find((x) => x.id === id);
  return { ...q, kind: GameCore.modeOf(q), text: GAME_TEXT.questions[id] };
});
// Prize text as the contract formats it (docs/game-quiz.md §8), computed here, not by the page.
const money = (lang, n) => new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' }).format(n);
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const nbsp = (s) => String(s).replace(/[\u00a0\u202f]/g, ' ');
const tr = (page, key, params) => page.evaluate(([k, p]) => t(k, p), [key, params || null]);

/* Types SQL into the console and runs it (button or Ctrl+Enter); waits for the fresh output. */
async function run(page, sql, { keys = false } = {}) {
  await page.$eval('#wr-out', (el) => { el.innerHTML = ''; });
  await page.fill('#wr-sql', sql);
  if (keys) await page.press('#wr-sql', 'Control+Enter');
  else await page.click('[data-fid="game-run"]');
  await page.waitForSelector('#wr-out .wr-time', { state: 'attached', timeout: 15000 });
  return page.textContent('#wr-out');
}
const resultRows = (page) => page.$$eval('#wr-out table tbody tr', (l) => l.length);

/* After a lock-in: the verdict is saved before the suspense ends, so wait for the page to show it too
   (the rescue dialog, the end screen, or the ladder on the new rung with Lock in enabled again). */
const settled = (page, n) => page.waitForFunction((k) => {
  if (document.querySelector('#wr-rescue')) return true;
  const s = GamePage.debug();
  if (s.answers.length <= k) return false;
  if (s.status !== 'playing') return !!document.querySelector('#wr-end');
  const cur = document.querySelector('#wr-ladder li.is-current');
  const lock = document.querySelector('[data-fid="game-lock"]');
  return !!cur && Number(cur.dataset.level) === s.level && !!lock && !lock.disabled;
}, n, { timeout: 20000 });
/* Lock in: the confirm dialog, Yes, then wait for the verdict. */
async function lockIn(page, sql) {
  const n = (await state(page)).answers.length;
  await page.fill('#wr-sql', sql);
  await page.click('[data-fid="game-lock"]');
  await page.waitForSelector('#wr-confirm[data-kind="lock"]', { timeout: 5000 });
  await page.click('[data-fid="game-confirm-yes"]');
  await settled(page, n);
  return state(page);
}
/* Plays with the reference solutions until the given rung is the current one (or the run ends). */
async function playTo(page, level) {
  let s = await state(page);
  while (s.status === 'playing' && s.level < level) {
    const lvl = s.level;
    s = await lockIn(page, (await current(page)).solution);
    if (s.status === 'playing' && s.level !== lvl + 1) break;              // a reference that failed: stop
  }
  return s;
}
/* A known trap of the current question that Lock in accepts for its kind. */
const trapOf = (page) => page.evaluate(() => {
  const st = GamePage.debug();
  const q = GAME_BANK.questions.find((x) => x.id === st.ids[st.level - 1]);
  return { id: q.id, trap: (q.traps || []).find((x) => GameCore.checkAnswer(x, GameCore.modeOf(q)).ok) || null };
});
/* Lock in refused: a message in #wr-out (.wr-check), no dialog, nothing spent. */
async function refused(page, sql) {
  const before = await state(page);
  await page.$eval('#wr-out', (el) => { el.innerHTML = ''; });
  await page.fill('#wr-sql', sql);
  await page.click('[data-fid="game-lock"]');
  await page.waitForTimeout(80);
  const o = await page.$eval('#wr-out', (x) => ({ check: !!x.querySelector('.wr-check'), text: x.textContent.replace(/\s+/g, ' ').trim() }));
  const dialog = await modalOpen(page);
  if (dialog) await page.click('[data-fid="game-confirm-no"]');   // keep going after a failure
  return { ...o, dialog, same: same(await state(page), before) };
}
const ladderInfo = (page) => page.$$eval('#wr-ladder > li', (l) => l.map((li) => ({
  level: Number(li.dataset.level), cur: li.classList.contains('is-current'), done: li.classList.contains('is-done'),
  safe: li.classList.contains('is-safe'), aria: li.getAttribute('aria-current'),
})));
const hostLine = (page) => page.textContent('#wr-host-line').then(flat);
const modalOpen = (page) => page.evaluate(() => !!document.querySelector('#view .wr-modal'));
const focusIn = (page, sel) => page.evaluate((s) => { const m = document.querySelector(s); return !!m && m.contains(document.activeElement); }, sel);
const activeFid = (page) => page.evaluate(() => (document.activeElement && document.activeElement.dataset.fid) || '');
const chip = (page) => page.$eval('#wr-question .wr-kind', (c) => ({ text: c.textContent.replace(/^.*?:\s*/, '').trim(), cls: c.className, big: c.classList.contains('is-big') })).catch(() => null);
const endInfo = (page) => page.evaluate(() => {
  const e = document.querySelector('#wr-end');
  if (!e) return null;
  return {
    status: e.dataset.status, prize: document.querySelector('#wr-end-prize').textContent.trim(),
    best: (e.querySelector('.wr-end-best') || {}).textContent || '',
    choose: (e.querySelector('[data-fid="game-choose"]') || {}).getAttribute ? e.querySelector('[data-fid="game-choose"]').getAttribute('href') : null,
    again: !!e.querySelector('[data-fid="game-again"]'),
    items: [...e.querySelectorAll('.wr-rev-list > li')].map((li) => ({ codes: [...li.querySelectorAll('pre code')].map((c) => c.textContent), ok: li.classList.contains('is-ok') })),
  };
});
/* The select screen's tiles. */
const tiles = (page) => page.$$eval('#wr-modes .wr-tile', (l) => l.map((x) => ({
  fid: x.dataset.fid, tag: x.tagName, href: x.getAttribute('href'), kw: (x.querySelector('.wr-tile-kw') || {}).textContent.trim(),
  name: (x.querySelector('.wr-tile-name') || {}).textContent.trim(), go: ((x.querySelector('.wr-tile-go') || {}).textContent || '').trim(),
  best: ((x.querySelector('.wr-tile-best') || {}).textContent || '').trim(), live: x.classList.contains('is-live'),
  locked: x.classList.contains('is-locked'), off: x.classList.contains('is-off'),
  ticks: [...x.querySelectorAll('.wr-ticks li')].map((li) => `${li.textContent.replace(/:.*$/, '').trim()}${li.classList.contains('is-on') ? '+' : '-'}`),
})));
const tileOf = async (page, m) => (await tiles(page)).find((x) => x.fid === `game-mode-${m}`) || {};

/* ---- Competitive side on the local Supabase stack (§15) -------------------------------------------- */
// Off by default, so that the study checks run anywhere. COMP=1 (or --comp) turns them on: they need Docker, the
// Supabase CLI (a dev dependency in tools/), the private bank (git-ignored tools/comp/private/) and the network for
// @supabase/supabase-js (jsDelivr). Anything missing skips them with a message; the study checks still run.
// The stack is started when it is not running (npx supabase start --workdir ..), new migrations are applied
// (npx supabase migration up --local), the engine copies are synced (node supabase-sync.mjs) and the bank is
// uploaded (comp-upload.mjs --local). The page gets the LOCAL URL and anon
// key through a Playwright route on data/game-comp-config.js: no local value is ever written to the repository.
const TOOLS = join(ROOT, 'tools');
const PRIV = {};
if (COMP) {
  // Every competitive database (docs/game-quiz.md §16): the shop's files and tools/comp/private/<db>/<mode>.json.
  for (const dir of ['', 'f1', 'fashion', 'bank', 'law']) {
    for (const m of BASE_MODES) {
      const f = join(TOOLS, 'comp', 'private', dir, `${m}.json`);
      if (!existsSync(f)) continue;
      const j = JSON.parse(readFileSync(f, 'utf8'));
      (Array.isArray(j) ? j : j.questions || []).forEach((q) => { PRIV[q.id] = q; });
    }
  }
}
// Every private SQL text (solutions and accepted alternatives): none may reach a student's page, storage or responses.
const SECRETS = Object.values(PRIV).flatMap((q) => [q.solution, ...(q.alts || [])].filter(Boolean).map((sql) => ({ id: q.id, sql })));
const SB_SRC = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const DB_CONTAINER = (() => {
  const m = /^project_id\s*=\s*"([^"]+)"/m.exec(existsSync(join(ROOT, 'supabase/config.toml')) ? readFileSync(join(ROOT, 'supabase/config.toml'), 'utf8') : '');
  return `supabase_db_${m ? m[1] : 'cunef-comp'}`;
})();

/* The local stack, ready for the page: { API, ANON, SERVICE, MAIL }, or null with the reason printed. */
async function compStack() {
  const skip = (why) => { console.log(`skip: the competitive checks (COMP=1): ${why}. The study checks run.`); return null; };
  if (!SECRETS.length) return skip('the private bank tools/comp/private/<mode>.json is missing (it is git-ignored; COMP_KEY=… node comp-build.mjs --decrypt restores it)');
  let mod;
  try { mod = await import('./comp-upload.mjs'); } catch (e) { return skip(`tools/comp-upload.mjs cannot load (${e.message})`); }
  const status = () => { try { return mod.localStack(); } catch (e) { return null; } };
  let L = status();
  if (!L) {
    try { execSync('docker info', { stdio: 'ignore', timeout: 30000 }); } catch (e) { return skip('Docker is not running'); }
    console.log('starting the local Supabase stack (npx supabase start --workdir ..; the first time pulls the images)…');
    try { execSync('npx supabase start --workdir ..', { cwd: TOOLS, stdio: 'ignore', timeout: 20 * 60000 }); } catch (e) { return skip('npx supabase start failed'); }
    L = status();
    if (!L) return skip('the local stack does not answer npx supabase status');
  }
  // Migrations added since the stack was started (idempotent), then the engine copies and the bank.
  try { execSync('npx supabase migration up --local --workdir ..', { cwd: TOOLS, stdio: 'ignore', timeout: 5 * 60000 }); } catch (e) { return skip('npx supabase migration up --local failed (a migration that does not apply: npx supabase db reset --local --workdir ..)'); }
  try { execSync('node supabase-sync.mjs', { cwd: TOOLS, stdio: 'ignore', timeout: 60000 }); } catch (e) { return skip('node supabase-sync.mjs failed'); }
  try { await mod.upload({ url: L.API_URL, key: L.SERVICE_ROLE_KEY, log: () => {} }); } catch (e) { return skip(`the bank upload failed (${e.message})`); }
  const S = { API: L.API_URL, ANON: L.ANON_KEY || L.PUBLISHABLE_KEY, SERVICE: L.SERVICE_ROLE_KEY, MAIL: L.MAILPIT_URL || L.INBUCKET_URL };
  try {
    const r = await fetch(`${S.API}/functions/v1/comp`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: S.ANON }, body: '{"op":"status"}' });
    const j = await r.json();
    if (!(j && j.error && j.error.code === 'auth' && j.serverTime)) return skip(`the comp function answers oddly (${JSON.stringify(j).slice(0, 120)})`);
  } catch (e) { return skip(`the comp function does not answer (${e.message})`); }
  try { const r = await fetch(SB_SRC, { method: 'HEAD' }); if (!r.ok) throw new Error(`HTTP ${r.status}`); } catch (e) { return skip(`@supabase/supabase-js cannot be fetched from jsDelivr (${e.message})`); }
  return S;
}
const STACK = COMP ? await compStack() : null;
if (!COMP) console.log('note: the competitive checks are off (COMP=1 node check-game.mjs runs them against the local Supabase stack)');

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
/* The REST API with the local service key (the tests' stand-in for the SQL editor). */
async function svc(method, path, body, headers = {}) {
  const r = await fetch(`${STACK.API}/rest/v1/${path}`, { method, headers: { apikey: STACK.SERVICE, Authorization: `Bearer ${STACK.SERVICE}`, 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  return { status: r.status, data };
}
/* The comp function called directly with a student's token (to use up a day's attempts quickly). */
async function compApi(token, body) {
  const r = await fetch(`${STACK.API}/functions/v1/comp`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: STACK.ANON, Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
/* The 6-digit code of the newest email to `email` that is not in `seen` (Mailpit). */
const mailSearch = async (email) => ((await fetch(`${STACK.MAIL}/api/v1/search?query=${encodeURIComponent(`to:${email.toLowerCase()}`)}`).then((r) => r.json()).catch(() => null)) || {}).messages || [];
async function mailCode(email, seen) {
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const m = (await mailSearch(email)).find((x) => !seen.has(x.ID));
    if (!m) continue;
    const msg = await fetch(`${STACK.MAIL}/api/v1/message/${m.ID}`).then((r) => r.json()).catch(() => ({}));
    const code = (/\b(\d{6})\b/.exec(msg.Text || msg.HTML || '') || [])[1];
    if (code) return code;
  }
  return null;
}
/* The local stack sends one code per address per minute: wait out the gap before asking for another. */
const lastOtp = new Map();
async function otpGap(email) {
  const gap = 61000 - (Date.now() - (lastOtp.get(email) || 0));
  if (gap > 0) await sleep(gap);
  lastOtp.set(email, Date.now());
}
/* The server allows one run of student SQL per user every 2 s (Lock in, Review, the rescue): wait it out. */
async function sqlGap(page) {
  const gap = 2200 - (Date.now() - (lastSubmit.get(page) || 0));
  if (gap > 0) await sleep(gap);
  lastSubmit.set(page, Date.now());
}
/* Signs in through the page (email, the code from Mailpit, the name when asked). Ends on the screen after. */
async function signIn(page, email, name) {
  await page.waitForSelector('#wr-login-email', { timeout: 30000 });
  await page.fill('#wr-login-email', email);
  const seen = new Set((await mailSearch(email)).map((x) => x.ID));
  await otpGap(email);
  await page.click('[data-fid="game-login-send"]');
  await page.waitForSelector('#wr-login-code', { timeout: 30000 });
  const code = await mailCode(email, seen);
  await page.fill('#wr-login-code', code || '');
  await page.click('[data-fid="game-login-verify"]');
  await page.waitForSelector('#wr-name, #wr-modes .wr-tile.is-comp, .wr-board, .wr-srv-off', { timeout: 30000 });
  if (name && await page.$('#wr-name')) {
    await page.fill('#wr-name', name);
    await page.click('[data-fid="game-name-save"]');
    await page.waitForSelector('#wr-modes .wr-tile.is-comp, .wr-board, .wr-srv-off', { timeout: 30000 });
  }
  return code;
}
/* The signed-in user's id and token, from the library's session in localStorage. */
const sessionOf = (page) => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('game-comp-auth') || 'null'); return s ? { id: s.user && s.user.id, token: s.access_token } : null; });
/* The submit rate limit (one per attempt every 2 s): wait before each lock-in. */
const lastSubmit = new WeakMap();
async function compLockIn(page, sql) {
  const gap = 2150 - (Date.now() - (lastSubmit.get(page) || 0));
  if (gap > 0) await sleep(gap);
  const n = (await state(page)).answers.length;
  await page.fill('#wr-sql', sql);
  await page.click('[data-fid="game-lock"]');
  await page.waitForSelector('#wr-confirm[data-kind="lock"]', { timeout: 5000 });
  await page.click('[data-fid="game-confirm-yes"]');
  lastSubmit.set(page, Date.now());
  await page.waitForFunction((k) => {
    if (document.querySelector('#wr-rescue') || document.querySelector('#wr-end')) return true;
    const s = GamePage.debug();
    if (!s || s.answers.length <= k) return false;
    const cur = document.querySelector('#wr-ladder li.is-current');
    const lock = document.querySelector('[data-fid="game-lock"]');
    return !!cur && Number(cur.dataset.level) === s.level && !!lock && !lock.disabled;
  }, n, { timeout: 30000 });
  return state(page);
}
/* The current competitive question's id (the view's question; the rest of the ids are placeholders). */
const compQid = (page) => page.evaluate(() => { const s = GamePage.debug(); return s ? s.ids[s.level - 1] : null; });
/* A wrong answer of the right kind: a private trap that Lock in accepts (or a generic wrong statement). */
async function compWrong(page, avoid = []) {
  const id = await compQid(page);
  const q = PRIV[id] || {};
  const bare = String(id || '').replace(/^[a-z0-9]+_/, '');   // f1_cs01a → cs01a (§16)
  const mode = /^cs/.test(bare) ? 'select' : /^ci/.test(bare) ? 'insert' : /^cu/.test(bare) ? 'update' : /^cd/.test(bare) ? 'delete' : 'ddl';
  const fallback = { select: 'SELECT 1 FROM dual', insert: "INSERT INTO customers VALUES (199, 'Zed Test', 'Spain', DATE '2025-01-01', 0)", update: 'UPDATE games SET stock = stock + 1', delete: 'DELETE FROM sales WHERE sale_id = 1', ddl: 'CREATE TABLE zz_test (id NUMBER(4))' }[mode];
  return page.evaluate(([list, md, skip]) => list.find((x) => !skip.includes(x) && GameCore.checkAnswer(x, md).ok) || null, [[...(q.traps || []), fallback], mode, avoid]);
}
/* Private SQL found in the page: DOM text, form values, attributes, local and session storage (JSON unpacked).
   `typed`: what the test itself typed into the console (skipped). */
const leaks = (page, typed = []) => page.evaluate(([secrets, mine]) => {
  // Whitespace only, case kept: a trap may differ from a solution in the case of a text value alone ('strategy').
  const n = (s) => String(s || '').replace(/;\s*$/, '').replace(/\s+/g, ' ').trim();
  const hay = [document.documentElement.textContent];
  document.querySelectorAll('input, textarea').forEach((e) => hay.push(e.value));
  document.querySelectorAll('*').forEach((e) => { for (const a of e.attributes) hay.push(a.value); });
  const walk = (v) => {
    if (typeof v === 'string') { hay.push(v); try { const j = JSON.parse(v); if (j && typeof j === 'object') walk(j); } catch (e) { /* plain text */ } } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  for (let i = 0; i < localStorage.length; i++) walk(localStorage.getItem(localStorage.key(i)));
  for (let i = 0; i < sessionStorage.length; i++) walk(sessionStorage.getItem(sessionStorage.key(i)));
  const text = n(hay.join(' \u0001 '));
  const skip = new Set(mine.map(n));
  return [...new Set(secrets.filter((s) => !skip.has(n(s.sql)) && text.includes(n(s.sql))).map((s) => s.id))];
}, [SECRETS, typed]);
/* The same scan over the bodies of the comp function's responses (JSON: \n and \" unescaped first). */
function netLeaks(bodies) {
  const n = (s) => String(s || '').replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/;\s*$/, '').replace(/\s+/g, ' ').trim();
  const text = n(bodies.join('\n'));
  return [...new Set(SECRETS.filter((s) => text.includes(n(s.sql))).map((s) => s.id))];
}
/* Collects the comp function's responses of a page (student pages only). */
function captureComp(page) {
  const bodies = [];
  const pending = [];
  page.on('response', (r) => { if (r.url().includes('/functions/v1/comp')) pending.push(r.text().then((x) => bodies.push(x), () => {})); });
  return { all: async () => { await Promise.all(pending); return bodies; }, count: () => pending.length };
}
const readyView = (page, v, sd) => page.waitForSelector(`#view section.wr-game[data-view="${v}"]${sd ? `[data-side="${sd}"]` : ''}`, { timeout: 30000 });
const clockText = (page) => page.$eval('#wr-clock-t', (e) => e.textContent.trim()).catch(() => '');
const clockSecs = (s) => { const m = /^(\d+):(\d\d)$/.exec(s || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
const compTiles = (page) => page.$$eval('#wr-modes .wr-tile.is-comp', (l) => l.map((x) => ({
  fid: x.dataset.fid, tag: x.tagName, off: x.classList.contains('is-off'), medal: (x.querySelector('.wr-medal') || { getAttribute: () => '' }).getAttribute('class') || '',
  go: ((x.querySelector('.wr-tile-go') || {}).textContent || '').trim(), left: ((x.querySelector('.wr-tile-left') || {}).textContent || '').trim(),
  badge: ((x.querySelector('.wr-tile-badge') || {}).textContent || '').trim(),
})));

/* ---- Tour, theme, layout helpers ------------------------------------------------------- */
const LIGHT = { panel: '#ffffff', bg: 'rgb(232, 238, 252)' };     // --wr-panel and the background in game.css (always light)
const gameBg = (page) => page.$eval('.wr-game', (el) => getComputedStyle(el).backgroundColor);
const wrToken = (page, name) => page.$eval('.wr-game', (el, n) => getComputedStyle(el).getPropertyValue(n).trim().toLowerCase(), name);
const pressed = (page, fid) => page.$eval(`[data-fid="${fid}"]`, (b) => b.getAttribute('aria-pressed'));
const noHScroll = (page) => page.evaluate(() => ({ sw: document.scrollingElement.scrollWidth, iw: innerWidth }));
const tourGone = (page) => page.waitForSelector('.gi', { state: 'detached', timeout: 5000 }).then(() => true, () => false);
// The tour's spotlight targets (TARGETS in js/game-intro.js), keyed by GAME_TOUR.screen.spots[i].id; first visible wins.
const SPOT_TARGETS = {
  ladder: ['#wr-ladder', '#wr-ladder-card', '.wr-ladder-card', '.wr-side'], question: ['#wr-question'], lifelines: ['#wr-lifelines'],
  console: ['.wr-console'], lock: ['[data-fid="game-lock"]'], schema: ['#wr-schema'],
};
/* The cut-out of the blur layer (the hole of the .gi-veil clip-path polygon) against the target's
   visible box: ratio = the part of the visible target inside the hole. */
const spotState = (page, sels) => page.evaluate((list) => {
  const veil = document.querySelector('.gi-veil');
  const pts = [...String(veil && veil.style.clipPath).matchAll(/(-?[\d.]+)px (-?[\d.]+)px/g)].map((m) => [+m[1], +m[2]]);
  const hole = pts.length >= 10 ? { left: pts[5][0], top: pts[5][1], right: pts[7][0], bottom: pts[7][1] } : null;
  let el = null;
  for (const sel of list) {
    const e = [...document.querySelectorAll(sel)].find((x) => !x.closest('.gi'));
    if (e) { const r = e.getBoundingClientRect(); if (r.width > 0 && r.height > 0) { el = e; break; } }
  }
  if (!el || !hole) return { ratio: 0, hole, what: el ? el.id || el.className : 'none' };
  const r = el.getBoundingClientRect();
  const v = { left: Math.max(0, r.left), top: Math.max(0, r.top), right: Math.min(innerWidth, r.right), bottom: Math.min(innerHeight, r.bottom) };
  const area = (b) => Math.max(0, b.right - b.left) * Math.max(0, b.bottom - b.top);
  const inter = { left: Math.max(v.left, hole.left), top: Math.max(v.top, hole.top), right: Math.min(v.right, hole.right), bottom: Math.min(v.bottom, hole.bottom) };
  return { ratio: area(v) ? area(inter) / area(v) : 0, hole, box: [r.left, r.top, r.right, r.bottom].map(Math.round), what: el.id || el.dataset.fid || el.className, title: (document.querySelector('.gi-spot-h') || {}).textContent };
}, sels);
/* On the spot screen: every spot in turn, the cut-out frames the real element. Ends on the next screen. */
async function walkSpots(page, shot) {
  const spots = await page.evaluate(() => GAME_TOUR.screen.spots.map((s) => ({ id: s.id, title: s.title })));
  const out = [];
  for (let i = 0; i < spots.length; i++) {
    const sels = SPOT_TARGETS[spots[i].id] || [];
    await page.waitForFunction((l) => {
      const veil = document.querySelector('.gi-veil');
      const pts = [...String(veil && veil.style.clipPath).matchAll(/(-?[\d.]+)px (-?[\d.]+)px/g)].map((m) => [+m[1], +m[2]]);
      if (pts.length < 10) return false;
      const el = l.map((s) => [...document.querySelectorAll(s)].find((x) => !x.closest('.gi') && x.getBoundingClientRect().width > 0)).find(Boolean);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return pts[5][0] < Math.min(innerWidth, r.right) && pts[7][0] > Math.max(0, r.left) && pts[5][1] < Math.min(innerHeight, r.bottom) && pts[7][1] > Math.max(0, r.top);
    }, sels, { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(150);
    out.push({ ...(await spotState(page, sels)), id: spots[i].id, want: spots[i].title });
    if (shot && spots[i].id === 'console') await shot();
    await page.click('.gi [data-intro="next"]');
  }
  return out;
}
/* The tour card on show is the screen called `name`, numbered "n of total". */
const screenIs = (page, name, n, total) => page.evaluate(([nm, k, tot]) => {
  const card = document.querySelector('.gi-card');
  const count = card && card.querySelector('.gi-count');
  const want = GAME_TOUR.nav.step.replace('{n}', k).replace('{total}', tot);
  return !!card && card.classList.contains(`is-${nm}`) && !!count && count.textContent.trim() === want;
}, [name, n, total]);

for (const lang of LANGS) {
  const L = `[${lang}]`;
  const M = (n) => money(lang, n);

  /* ---- 1. The select screen, then each of the five modes ---------------------------------- */
  {
    const { context, page, problems } = await open(lang);
    await page.goto(`${base}#/game`);
    await ready(page, '');
    const T = await page.evaluate(() => GAME_TEXT.modes);
    let ts = await tiles(page);
    expect(ts.map((x) => x.fid).join() === MODES.map((m) => `game-mode-${m}`).join(), `${L} select screen: six tiles in order (${ts.map((x) => x.fid.slice(10)).join(', ')})`);
    expect(ts.every((x, i) => x.kw === KW[MODES[i]] && x.name === T[MODES[i]].name), `${L} select screen: each tile shows its keyword and name (${ts.map((x) => `${x.kw} ${x.name}`).join(' · ')})`);
    expect(ts.every((x) => !x.off), `${L} select screen: every bank is ready (no "Coming soon")`);
    const play = await page.evaluate(() => (LANG === 'es' ? 'Jugar' : 'Play'));
    expect(ts.slice(0, 5).every((x, i) => x.tag === 'A' && x.href === `#/game/${BASE_MODES[i]}` && x.go === play && !x.live), `${L} select screen: the five base tiles link to #/game/<mode> and say "${play}"`);
    expect(ts.every((x) => !x.best), `${L} select screen: no best score on any tile before a run ends`);
    const mix = ts[5];
    expect(!mix.locked && mix.tag === 'A' && mix.href === '#/game/mixed' && mix.go === play && mix.ticks.length === 0,
      `${L} select screen: Mixed is open from the start (a link that says "${play}", no boxes)`);
    expect(await page.$('[data-fid="game-modes"]') === null && await state(page) === null, `${L} select screen: no "← Modes" button and no run on show`);
    expect(await wrToken(page, '--wr-panel') === LIGHT.panel, `${L} select screen: light`);
    // Redirects: an unknown mode; Mixed opens straight away.
    await page.evaluate(() => { location.hash = '#/game/bogus'; });
    await ready(page, '');
    expect(await hash(page) === '#/game', `${L} #/game/bogus goes back to the select screen (${await hash(page)})`);
    await page.evaluate(() => { location.hash = '#/game/mixed'; });
    await ready(page, 'mixed');
    expect(await hash(page) === '#/game/mixed', `${L} #/game/mixed opens with no progress (${await hash(page)})`);
    await page.evaluate(() => { location.hash = '#/game'; });
    await ready(page, '');

    // Each base mode: start, Run the reference, a wrong kind refused, pass, Key clause, a trap, the rescue.
    for (const m of BASE_MODES) {
      const W = `${L} ${m}:`;
      await page.click(`[data-fid="game-mode-${m}"]`);
      await ready(page, m);
      let s = await state(page);
      const drawn = await page.evaluate(([seed, k]) => GameCore.draw(GAME_BANK, seed, k), [SEED, m]);
      expect(await hash(page) === `#/game/${m}` && s.mode === m && s.level === 1 && s.status === 'playing' && same(s.ids, drawn), `${W} the tile opens #/game/${m}: rung 1, ids = GameCore.draw(seed ${SEED}, ${m}) (${s.ids.slice(0, 2).join(',')}…)`);
      expect(await page.evaluate((k) => GamePage.debug().ids.every((id) => GameCore.modeOf(GAME_BANK.questions.find((q) => q.id === id)) === k), m), `${W} every drawn question is a ${m} question`);
      const c = await chip(page);
      expect(c && c.text === KW[m] && !c.big, `${W} the question card's chip says ${c && c.text}`);
      expect(await page.$('[data-fid="game-modes"]') !== null && !(await page.$eval('[data-fid="game-modes"]', (b) => b.disabled)), `${W} "← Modes" in the marquee`);
      expect(s.used.clause === false && s.used.template === false && s.used.review === false, `${W} its own lifelines, all unused`);
      let q = await current(page);
      // Run the reference: the feedback of its kind; nothing is kept.
      const before = await state(page);
      await run(page, q.solution);
      const fb = await page.evaluate(() => {
        const o = document.querySelector('#wr-out');
        return {
          table: o.querySelectorAll(':scope > .scroll table tbody tr, :scope > table tbody tr, .sql-table tbody tr').length,
          diffs: [...o.querySelectorAll('.wr-diff')].map((d) => ({ name: d.querySelector('.wr-diff-h code').textContent, tags: [...d.querySelectorAll('.wr-dtag')].map((x) => x.textContent.trim()), add: d.querySelectorAll('tr.is-add').length, chg: d.querySelectorAll('tr.is-chg').length, del: d.querySelectorAll('tr.is-del').length, marks: d.querySelectorAll('tr.is-chg mark').length, same: (d.querySelector('.wr-diff-same') || {}).textContent || '', text: d.textContent })),
          head: (o.querySelector('.wr-done-msg') || {}).textContent || '', err: !!o.querySelector('.wr-msg.is-err'),
        };
      });
      if (m === 'select') {
        expect(fb.table > 0 && !fb.err && !fb.diffs.length, `${W} Run of the reference shows a result table (${fb.table} rows)`);
      } else if (m === 'ddl') {
        const d = fb.diffs[0] || { tags: [], text: '' };
        const want = await tr(page, 'columns');
        const col = (/ADD\s+(\w+)/i.exec(q.solution) || /CREATE\s+(?:TABLE|VIEW|INDEX)\s+(\w+)/i.exec(q.solution) || ['', ''])[1];
        expect(!fb.err && fb.diffs.length >= 1 && d.tags.includes(want) && new RegExp(col, 'i').test(d.text), `${W} Run of the reference shows the table's columns, the new one included (${d.name}: ${d.tags.join(',')}, ${col})`);
      } else {
        const key = { insert: ['add', '1 row inserted', '{n} rows inserted'], update: ['chg', '1 row updated', '{n} rows updated'], delete: ['del', '1 row deleted', '{n} rows deleted'] }[m];
        const n = fb.diffs.reduce((a, d) => a + d[key[0]], 0);
        const others = fb.diffs.reduce((a, d) => a + d.add + d.chg + d.del, 0) - n;
        const head = await tr(page, n === 1 ? key[1] : key[2], { n });
        const hidden = fb.diffs.every((d) => /\d/.test(d.same));
        expect(!fb.err && n > 0 && others === 0 && flat(fb.head) === flat(head), `${W} Run of the reference: "${flat(fb.head)}", a diff of ${fb.diffs.map((d) => d.name).join(', ')} with ${n} ${key[0]} row(s)`);
        expect(hidden && (m !== 'update' || fb.diffs.every((d) => d.marks >= d.chg)), `${W} the diff hides the unchanged rows ("${flat(fb.diffs[0] && fb.diffs[0].same)}")${m === 'update' ? ' and marks the changed cells' : ''}`);
        if (m === 'insert') {
          await run(page, 'SELECT COUNT(*) FROM games');
          expect((await page.$$eval('#wr-out table tbody td', (l) => l.map((x) => x.textContent.trim())))[0] === '24', `${W} the next Run starts from a fresh copy (24 games again)`);
        }
      }
      expect(same(await state(page), before), `${W} Run does not change the run`);
      // A statement of the wrong kind: refused at no cost.
      const want = await tr(page, WRONG[m][1]);
      let r = await refused(page, WRONG[m][0]);
      expect(r.check && r.text.includes(want) && !r.dialog && r.same, `${W} Lock in refuses "${WRONG[m][0].slice(0, 36)}" at no cost ("${want}")`);
      for (const sql of EXTRA[m] || []) {
        r = await refused(page, sql);
        expect(r.check && !r.dialog && r.same, `${W} Lock in refuses "${sql.slice(0, 50)}" at no cost ("${r.text.slice(0, 60)}")`);
      }
      // The reference passes.
      s = await lockIn(page, q.solution);
      expect(s.level === 2 && s.answers.length === 1 && s.answers[0].ok, `${W} the reference solution of ${q.id} passes: rung 2`);
      // Key clause at rung 2: the hint, and for DML the number of rows the answer changes.
      q = await current(page);
      await page.click('[data-fid="game-life-clause"]');
      await page.waitForSelector('#wr-life-out .is-clause');
      if (m === 'select') {
        await page.waitForFunction(() => /\d/.test((document.querySelector('#wr-shape') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
        expect(/\d/.test(await page.textContent('#wr-shape')), `${W} Key clause: the hint and the shape ("${flat(await page.textContent('#wr-shape'))}")`);
      } else if (m === 'ddl') {
        expect(norm(await page.textContent('#wr-life-out .is-clause .wr-life-body')) === norm(q.text.clause), `${W} Key clause: the hint of ${q.id}`);
      } else {
        const n = await page.evaluate((id) => { const qq = GAME_BANK.questions.find((x) => x.id === id); return SqlRunner.executeChecks(GAME_BANK.setup, qq.solution, GameCore.defaultChecks(qq)).then((x) => x.changes); }, q.id);
        const verb = { insert: 'inserts', update: 'updates', delete: 'deletes' }[m];
        const wantShape = await tr(page, n === 1 ? `The answer ${verb} 1 row.` : `The answer ${verb} {n} rows.`, { n });
        await page.waitForFunction((w) => ((document.querySelector('#wr-shape') || {}).textContent || '') === w, wantShape, { timeout: 8000 }).catch(() => {});
        expect(norm(await page.textContent('#wr-life-out .is-clause .wr-life-body')) === norm(q.text.clause) && await page.textContent('#wr-shape') === wantShape,
          `${W} Key clause: the hint of ${q.id} and "${wantShape}"`);
      }
      // A known trap: graded wrong, the rescue (Review unused) and its pending verdict per mode.
      const trap = await trapOf(page);
      expect(!!trap.trap, `${W} ${trap.id} has a trap that Lock in accepts ("${String(trap.trap).slice(0, 50)}")`);
      s = await lockIn(page, trap.trap);
      const pend = await page.evaluate(() => JSON.parse(localStorage.getItem('game-quiz-pending-v2') || '{}'));
      expect(await page.$('#wr-rescue') !== null && s.level === 2 && s.answers.length === 1 && pend[m] && pend[m].id === trap.id, `${W} the trap is graded wrong: the rescue dialog, the verdict pending under game-quiz-pending-v2.${m}`);
      await page.click('[data-fid="game-rescue-yes"]');
      await page.waitForSelector('#wr-life-out .is-review');
      s = await state(page);
      const rev = await page.$$eval('#wr-life-out .is-review .wr-review li', (l) => l.map((x) => ({ t: x.textContent.trim(), ok: x.classList.contains('is-ok') })));
      expect(s.level === 2 && s.used.review && s.answers.length === 2 && !s.answers[1].ok && rev.length >= 1 && rev.every((x) => !x.ok && x.t.length > 0), `${W} Review explains the miss without the answer ("${flat(rev[0] && rev[0].t).slice(0, 70)}")`);
      expect(!(await page.evaluate((k) => JSON.parse(localStorage.getItem('game-quiz-pending-v2') || '{}')[k], m)), `${W} the pending verdict is cleared`);
      await page.fill('#wr-sql', `-- draft ${m}`);
      await page.waitForTimeout(50);
      // Back to the select screen: the tile continues the run.
      await page.click('[data-fid="game-modes"]');
      await ready(page, '');
      const tl = await tileOf(page, m);
      const cont = await tr(page, 'Continue · rung {n}', { n: 2 });
      expect(await hash(page) === '#/game' && tl.go === cont && tl.live, `${W} "← Modes" goes back; the tile says "${tl.go}"`);
    }

    // Per-mode saves, drafts and lifelines across a reload and mode switches.
    await page.reload();
    await ready(page, '');
    ts = await tiles(page);
    const cont = await tr(page, 'Continue · rung {n}', { n: 2 });
    expect(ts.slice(0, 5).every((x) => x.go === cont), `${L} reload: every base tile continues at rung 2`);
    const v2 = await store(page);
    expect(v2 && v2.v === 2 && BASE_MODES.every((m) => v2.runs[m] && v2.runs[m].mode === m && v2.runs[m].level === 2 && v2.reached[m] === 1), `${L} game-quiz-v2: one run per mode at rung 2, reached 1 each`);
    const drafts = await page.evaluate(() => JSON.parse(localStorage.getItem('game-quiz-draft-v2') || '{}'));
    expect(BASE_MODES.every((m) => drafts[m] === `-- draft ${m}`), `${L} game-quiz-draft-v2 keeps one draft per mode`);
    for (const m of ['update', 'select', 'ddl']) {
      await go(page, `#/game/${m}`, m);
      const s = await state(page);
      expect(s.level === 2 && s.used.clause && s.used.review && !s.used.template && await page.inputValue('#wr-sql') === `-- draft ${m}`, `${L} ${m} after the reload and a switch: rung 2, its own lifelines (Key clause and Review used) and its own draft`);
    }
    expect(problems.length === 0, `${L} select screen and modes: no page errors or missing translations ${problems.join(' | ')}`);
    await context.close();
  }

  /* ---- 2. A select run in depth, animations on: round-4 layout, Run, Lock in, lifelines, reload, walk away -- */
  {
    const { context, page, problems } = await open(lang, { reduced: false });
    await page.goto(`${base}#/game/select`);
    await ready(page, 'select');
    let s = await state(page);
    const lad = await ladderInfo(page);
    expect(lad.length === 15 && lad.filter((r) => r.safe).map((r) => r.level).join() === '10,5' && lad.filter((r) => r.cur).map((r) => r.level).join() === '1' && lad.find((r) => r.level === 1).aria === 'step',
      `${L} ladder: 15 rungs, safe 5 and 10, rung 1 current`);
    const rungPrizes = await page.$$eval('#wr-ladder > li .wr-rung-p', (l) => l.map((x) => x.textContent.trim()));
    expect(nbsp(rungPrizes[0]) === nbsp(M(1000000)) && nbsp(rungPrizes[14]) === nbsp(M(100)), `${L} ladder prizes formatted for the language (${rungPrizes[0]} … ${rungPrizes[14]})`);
    expect(await page.$('[data-fid="game-walk"]') === null, `${L} rung 1: no Walk away (there is nothing to take yet)`);
    const fold = await page.evaluate(() => ['#wr-prompt', '#wr-sql', '[data-fid="game-run"]', '[data-fid="game-lock"]'].map((sel) => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return { sel, ok: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && r.height > 0, b: Math.round(r.bottom) };
    }));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/game-start-${lang}.png` });
    expect(fold.every((x) => x.ok), `${L} 1440 × 900, rung 1: the prompt, the console, Run and Lock in are on screen without scrolling (${fold.map((x) => `${x.sel} ${x.b}`).join(', ')})`);
    const lifeDesc = await page.evaluate(() => [...document.querySelectorAll('#wr-lifelines .wr-life')].map((b) => {
      const d = document.getElementById(b.getAttribute('aria-describedby') || '');
      const blurb = GAME_TEXT.lifelines[b.dataset.life].blurb.replace(/\*\*|`/g, '');
      return { title: b.getAttribute('title') || '', desc: d ? d.textContent.trim() : '', blurb, hidden: !!d && d.classList.contains('sr-only') };
    }));
    expect(lifeDesc.length === 3 && lifeDesc.every((x) => x.title.includes(x.blurb) && x.desc === x.blurb && x.hidden),
      `${L} lifelines: each button has its blurb as a tooltip and as a visually hidden description`);
    let q = await current(page);
    await page.waitForFunction((want) => document.querySelector('#wr-prompt').textContent.replace(/\s+/g, '') === want, norm(q.text.prompt), { timeout: 8000 }).catch(() => {});
    expect(norm(await page.textContent('#wr-prompt')) === norm(q.text.prompt), `${L} the prompt of ${q.id} is typed in full`);

    // Run: Oracle's rules; the state never changes.
    const before = await state(page);
    const err = await run(page, 'SELEC title FROM games', { keys: true });
    expect(await page.$('#wr-out .wr-msg.is-err') !== null && /ORA-\d{5}/.test(err), `${L} Ctrl+Enter runs; a syntax error shows an ORA code (${(/ORA-\d{5}/.exec(err) || ['none'])[0]})`);
    expect(/ORA-00979/.test(await run(page, 'SELECT genre, title, COUNT(*) FROM games GROUP BY genre')), `${L} Run follows Oracle on GROUP BY (ORA-00979)`);
    await run(page, 'SELECT title FROM games LIMIT 3');
    expect(await page.$('#wr-out .wr-msg.is-warn') !== null, `${L} LIMIT is flagged`);
    await run(page, "SELECT title FROM games WHERE title LIKE 'neon%'");
    const lower = await resultRows(page);
    await run(page, "SELECT title FROM games WHERE title LIKE 'Neon%'");
    expect(lower === 0 && await resultRows(page) === 1, `${L} LIKE is case-sensitive as in Oracle`);
    await run(page, 'SELECT genre AS g, COUNT(*) FROM games GROUP BY g');
    expect(await resultRows(page) > 0, `${L} a select-list alias in GROUP BY is accepted`);
    for (const sql of ['SELECT title, price * 2 AS twice FROM games WHERE twice > 100', 'SELECT title FROM games WHERE genre = "Puzzle"', 'WITH n (k) AS (SELECT 1 FROM dual UNION ALL SELECT k + 1 FROM n WHERE k < 5) SELECT k FROM n']) {
      const txt = await run(page, sql);
      expect(await resultRows(page) === 0 && await page.$('#wr-out .wr-msg.is-err, #wr-out .wr-msg.is-warn') !== null, `${L} Run refuses "${sql.slice(0, 44)}" ("${flat(txt).slice(0, 50)}")`);
    }
    expect(same(await state(page), before), `${L} Run does not change the state`);
    for (const [sql, key] of [['', 'Write a query first.'], ['SELECT title FROM games; SELECT name FROM customers', 'Lock in takes one statement.'], ['SELECT title FROM games LIMIT 3', 'Oracle would reject this:'], ["SELECT title FROM games WHERE genre == 'Puzzle'", 'Oracle would reject this:'], ['WITH n (k) AS (SELECT 1 FROM dual UNION ALL SELECT k + 1 FROM n WHERE k < 5) SELECT k FROM n', null]]) {
      const r = await refused(page, sql);
      const want = key ? await tr(page, key) : '';
      expect(r.check && r.text.includes(want) && !r.dialog && r.same, `${L} Lock in refuses ${sql ? `"${sql.slice(0, 40)}"` : 'an empty console'} at no cost ("${(want || r.text).slice(0, 50)}")`);
    }

    // The confirm dialog, then the suspense.
    await page.fill('#wr-sql', q.solution);
    await page.click('[data-fid="game-lock"]');
    await page.waitForSelector('#wr-confirm[data-kind="lock"]');
    const dlg = await page.evaluate(() => ({ role: document.querySelector('#wr-confirm').getAttribute('role'), modal: document.querySelector('#wr-confirm').getAttribute('aria-modal'), code: document.querySelector('#wr-confirm pre code').textContent, inert: !!document.querySelector('#view .wr-grid[inert]') }));
    expect(dlg.role === 'dialog' && dlg.modal === 'true' && dlg.code === q.solution && dlg.inert && await focusIn(page, '#wr-confirm'), `${L} Lock in opens the confirm dialog: modal, shows the SQL, focus inside, the game inert`);
    let trapped = true;
    for (let k = 0; k < 5; k++) { await page.keyboard.press('Tab'); trapped = trapped && await focusIn(page, '#wr-confirm'); }
    for (let k = 0; k < 5; k++) { await page.keyboard.press('Shift+Tab'); trapped = trapped && await focusIn(page, '#wr-confirm'); }
    expect(trapped, `${L} confirm: Tab and Shift+Tab stay inside the dialog`);
    const toolsOff = () => page.$$eval('[data-fid="game-help"], [data-action="game-lang"], [data-fid="game-modes"]', (l) => l.length === 4 && l.every((b) => b.disabled));
    expect(await toolsOff(), `${L} confirm: ← Modes, How to play and EN|ES are disabled while the dialog is open`);
    await page.keyboard.press('Escape');
    expect(!(await modalOpen(page)) && await activeFid(page) === 'game-lock' && same(await state(page), before) && !(await page.$('#view [inert]')), `${L} confirm: Esc cancels, focus back on Lock in, nothing spent`);
    const host0 = await hostLine(page);
    await page.click('[data-fid="game-lock"]');
    await page.waitForSelector('#wr-confirm[data-kind="lock"]');
    await page.click('[data-fid="game-confirm-yes"]');
    const sus = await page.evaluate(() => ({
      blink: document.querySelector('#wr-ladder li[data-level="1"]').classList.contains('is-suspense'),
      locked: document.querySelector('[data-fid="game-lock"]').disabled && document.querySelector('[data-fid="game-run"]').disabled,
      host: document.querySelector('#wr-host-line').textContent.trim(), want: GAME_TEXT.host.suspense,
    }));
    expect(sus.blink && sus.locked && flat(sus.host) === flat(sus.want), `${L} suspense: rung 1 blinks, Run and Lock in disabled, SQL-Bot says "${sus.host}"`);
    expect(await toolsOff(), `${L} suspense: the marquee tools are disabled while busy`);
    await settled(page, 0);
    s = await state(page);
    const lad2 = await ladderInfo(page);
    expect(s.level === 2 && lad2.find((r) => r.level === 1).done && lad2.find((r) => r.level === 2).cur, `${L} the reference passes: rung 1 done, rung 2 current`);
    const host1 = await hostLine(page);
    expect(host1 !== host0 && host1.length > 0, `${L} SQL-Bot's line changes ("${host1.slice(0, 50)}")`);

    // The three lifelines at rung 2.
    q = await current(page);
    await page.click('[data-fid="game-life-clause"]');
    await page.waitForSelector('#wr-life-out .is-clause');
    await page.waitForFunction(() => { const e = document.querySelector('#wr-shape'); return e && /\d/.test(e.textContent); }, null, { timeout: 8000 }).catch(() => {});
    const ref = await page.evaluate((sql) => SqlRunner.execute(GAME_BANK.setup, sql).then((r) => ({ cols: r.cols.length, rows: r.rows.length })), q.solution);
    const shape = await page.textContent('#wr-shape');
    expect(norm(await page.textContent('#wr-life-out .is-clause .wr-life-body')) === norm(q.text.clause) && shape.includes(String(ref.cols)) && shape.includes(String(ref.rows)), `${L} Key clause: the hint of ${q.id} and the shape "${flat(shape)}"`);
    await page.click('[data-fid="game-life-template"]');
    await page.waitForSelector('#wr-life-out .is-template');
    expect(await page.textContent('#wr-life-out .is-template pre code') === q.template, `${L} Template shows the template SQL of ${q.id}`);
    const tray = await page.evaluate(() => [...document.querySelectorAll('#wr-life-out [data-action="game-tray"]')].map((b) => `${b.dataset.life}:${b.getAttribute('aria-pressed')}`));
    expect(tray.join() === 'clause:false,template:true', `${L} the tray shows the most recent output, with tabs for the others (${tray})`);
    await page.click('[data-fid="game-insert-template"]');
    expect(await page.inputValue('#wr-sql') === q.template, `${L} Insert template fills the console`);
    await page.click('[data-fid="game-life-review"]');
    await page.waitForTimeout(100);
    expect(!(await state(page)).used.review && await page.$('#wr-life-out .wr-msg.is-warn') !== null, `${L} Review before a Run on this question: a note, Review still unused`);
    await run(page, 'SELECT titel, price FROM games');
    await page.click('[data-fid="game-life-review"]');
    await page.waitForSelector('#wr-life-out .is-review');
    const rev = await page.$$eval('#wr-life-out .is-review .wr-review li', (l) => l.map((x) => x.textContent));
    expect(rev.some((x) => x.includes('titel') && x.includes('title')), `${L} Review after a wrong Run: the misspelled column and the suggestion`);
    s = await state(page);
    const used = await page.$$eval('#wr-lifelines [data-action="game-lifeline"]', (l) => l.map((b) => b.disabled && b.classList.contains('is-used')));
    expect(s.used.clause && s.used.template && s.used.review && used.every(Boolean), `${L} the three lifelines are used once and disabled`);
    if (SHOTS) { await page.evaluate(() => document.querySelector('#wr-question').scrollIntoView()); await page.screenshot({ path: `${SHOTS}/game-lifelines-${lang}.png` }); }

    // Reload mid-run: the run, the outputs and the draft come back; the stale war save is removed.
    await page.fill('#wr-sql', '-- my draft');
    await page.evaluate(() => localStorage.setItem('game-v1', '{"turn":3}'));
    await page.waitForTimeout(200);
    const keep = await state(page);
    await page.reload();
    await ready(page, 'select');
    expect(same(await state(page), keep), `${L} reload: the same run (rung 2, lifelines used)`);
    expect(await page.evaluate(() => localStorage.getItem('game-v1')) === null, `${L} reload: the stale game-v1 key is removed`);
    const tplBack = (await page.$eval('#wr-life-out .is-template pre code', (c) => c.textContent).catch(() => '')) === q.template;
    expect(tplBack && await page.inputValue('#wr-sql') === '-- my draft', `${L} reload: the Template output and the console draft are back`);

    // Leaving and coming back.
    await page.goto(`${base}#/`);
    await page.waitForSelector('.home');
    await page.goto(`${base}#/game/select`);
    await ready(page, 'select');
    expect(same(await state(page), keep) && await page.$$eval('section.wr-game', (l) => l.length) === 1, `${L} back from home: the run is intact, one game section`);

    // Walk away from rung 4: the dialog (Esc cancels), then the end screen with the prize of rung 3.
    s = await playTo(page, 4);
    expect(s.level === 4 && norm(await page.textContent('[data-fid="game-walk"]')).includes(norm(M(500))), `${L} rung 4: Walk away shows ${M(500)}`);
    await page.click('[data-fid="game-walk"]');
    await page.waitForSelector('#wr-confirm[data-kind="walk"]');
    expect(await activeFid(page) === 'game-confirm-no', `${L} walk away: the dialog opens on "Keep playing"`);
    await page.keyboard.press('Escape');
    expect(!(await modalOpen(page)) && await activeFid(page) === 'game-walk', `${L} walk away: Esc cancels, focus back on Walk away`);
    await page.click('[data-fid="game-walk"]');
    await page.waitForSelector('#wr-confirm[data-kind="walk"]');
    await page.click('[data-fid="game-confirm-yes"]');
    await page.waitForSelector('#wr-end');
    s = await state(page);
    const e = await endInfo(page);
    expect(e.status === 'walked' && s.prize === 500 && nbsp(e.prize) === nbsp(M(500)) && e.items.length === 3, `${L} walked away: data-status=walked, ${e.prize}, 3 answers reviewed`);
    expect(norm(e.best).includes(norm(M(500))) && (await store(page)).best.select.prize === 500, `${L} the best score ${M(500)} is shown and saved in best.select`);
    expect(e.again && e.choose === '#/game', `${L} the end screen offers Play again and Choose another mode (#/game)`);
    await page.click('[data-fid="game-choose"]');
    await ready(page, '');
    const ts = await tiles(page);
    const bestTxt = await tr(page, 'Best {prize}', { prize: M(500) });
    expect(nbsp(ts[0].best) === nbsp(bestTxt) && ts.slice(1).every((x) => !x.best), `${L} select screen: only the select tile shows "${ts[0].best}"`);
    await page.click('[data-fid="game-mode-select"]');
    await ready(page, 'select');
    await page.waitForSelector('#wr-end');
    await page.click('[data-fid="game-again"]');
    await page.waitForSelector('#wr-question');
    s = await state(page);
    expect(s.status === 'playing' && s.level === 1 && s.answers.length === 0 && !s.used.clause && !s.used.review, `${L} Play again: a fresh select run at rung 1, lifelines back`);
    expect(problems.length === 0, `${L} select run: no page errors or missing translations ${problems.join(' | ')}`);
    await context.close();
  }

  /* ---- 3. Rescue after a reload, then a loss at rung 7 (select, reduced motion) ------------ */
  {
    const { context, page, problems } = await open(lang);
    await page.goto(`${base}#/game/select`);
    await ready(page, 'select');
    let tr0 = await trapOf(page);
    let s = await lockIn(page, tr0.trap);
    expect(await page.$('#wr-rescue') !== null && await focusIn(page, '#wr-rescue'), `${L} a trap of ${tr0.id}: the rescue dialog, focus inside`);
    await page.keyboard.press('Escape');
    expect(await page.$('#wr-rescue') !== null, `${L} rescue: Esc does not dismiss it`);
    await page.reload();
    await ready(page, 'select');
    const back = await page.waitForSelector('#wr-rescue', { timeout: 5000 }).then(() => true, () => false);
    s = await state(page);
    expect(back && s.level === 1 && !s.used.review && s.answers.length === 0, `${L} rescue: after a reload the dialog is back, Review unused, nothing advanced`);
    await page.click('[data-fid="game-rescue-yes"]');
    await page.waitForSelector('#wr-life-out .is-review');
    s = await playTo(page, 7);
    tr0 = await trapOf(page);
    s = await lockIn(page, tr0.trap);
    await page.waitForSelector('#wr-end', { timeout: 5000 }).catch(() => {});
    const e = await endInfo(page);
    expect(await page.$('#wr-rescue') === null && e && e.status === 'lost' && s.prize === 2500 && nbsp(e.prize) === nbsp(M(2500)), `${L} a wrong lock-in at rung 7 without Review: lost, the safe prize ${e && e.prize}`);
    expect(e && e.items.length === 8 && e.items.filter((x) => !x.ok).length === 2, `${L} the review list has 8 entries, 2 of them misses`);
    expect((await store(page)).reached.select === 6, `${L} reached.select counts the 6 rungs answered before the loss`);
    expect(problems.length === 0, `${L} rescue and loss: no page errors or missing translations ${problems.join(' | ')}`);
    await context.close();
  }

  /* ---- 4. Delete to a full win, Structure to rung 6; Mixed with no unlock ------------------- */
  {
    const { context, page, problems } = await open(lang);
    await page.goto(`${base}#/game/delete`);
    await ready(page, 'delete');
    const sqls = [];
    let s = await state(page);
    while (s.status === 'playing') {
      const q = await current(page);
      sqls.push(q.solution);
      const lvl = s.level;
      s = await lockIn(page, q.solution);
      if (s.status === 'playing' && s.level !== lvl + 1) break;
    }
    await page.waitForSelector('#wr-end', { timeout: 5000 }).catch(() => {});
    let e = await endInfo(page);
    expect(s.status === 'won' && e && e.status === 'won' && nbsp(e.prize) === nbsp(M(1000000)), `${L} delete: all 15 reference solutions win (${e && e.prize}${s.status !== 'won' ? `, stopped at rung ${s.level}` : ''})`);
    expect(e && e.items.length === 15 && e.items.every((x, i) => x.ok && x.codes[0] === sqls[i] && x.codes[1] === sqls[i]), `${L} delete: the review list has 15 entries with your SQL and the reference`);
    if (SHOTS) { await page.mouse.move(0, 0); await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `${SHOTS}/game-won-delete-${lang}.png` }); }
    await go(page, '#/game/ddl', 'ddl');
    s = await playTo(page, 6);
    expect(s.level === 6, `${L} ddl: the reference solutions climb to rung 6 (rung ${s.level})`);
    const v2 = await store(page);
    expect(v2.reached.delete === 15 && v2.reached.ddl === 5 && v2.best.delete.prize === 1000000, `${L} reached: delete 15, ddl 5; best.delete 1,000,000`);
    await go(page, '#/game', '');
    let mix = await tileOf(page, 'mixed');
    expect(!mix.locked && mix.tag === 'A', `${L} the Mixed tile stays open`);
    expect(nbsp((await tileOf(page, 'delete')).best) === nbsp(await tr(page, 'Best {prize}', { prize: M(1000000) })), `${L} the delete tile shows its best score`);
    // Mixed needs no unlock: rung 5 was reached in only two modes.
    mix = await tileOf(page, 'mixed');
    expect(!mix.locked && mix.tag === 'A' && mix.href === '#/game/mixed', `${L} Mixed is a link with rung 5 reached in only two modes`);
    await page.click('[data-fid="game-mode-mixed"]');
    await ready(page, 'mixed');
    s = await state(page);
    const mx = await page.evaluate((seed) => {
      const ids = GameCore.drawMixed(GAME_BANK, seed);
      const qs = GamePage.debug().ids.map((id) => GAME_BANK.questions.find((q) => q.id === id));
      return { ids, modes: qs.map((q) => GameCore.modeOf(q)), levels: qs.map((q) => q.level) };
    }, SEED);
    const bands = [0, 5, 10].map((i) => mx.modes.slice(i, i + 5).sort().join());
    expect(s.mode === 'mixed' && same(s.ids, mx.ids) && bands.every((b) => b === [...BASE_MODES].sort().join()), `${L} mixed: 15 ids = GameCore.drawMixed, each mode once per band (${mx.modes.join(' ')})`);
    expect(mx.levels.every((lv, i) => lv === i + 1), `${L} mixed: each question sits at its own level`);
    let c = await chip(page);
    expect(c && c.big && c.text === KW[mx.modes[0]], `${L} mixed: the big chip shows the drawn kind of rung 1 (${c && c.text})`);
    const k0 = mx.modes[0];
    const r = await refused(page, WRONG[k0][0]);
    expect(r.check && r.text.includes(await tr(page, WRONG[k0][1])) && !r.dialog && r.same, `${L} mixed: a statement of another kind is refused at no cost (${k0})`);
    s = await lockIn(page, (await current(page)).solution);
    c = await chip(page);
    expect(s.level === 2 && c && c.text === KW[mx.modes[1]], `${L} mixed: the reference passes; rung 2's chip says ${c && c.text}`);
    expect(problems.length === 0, `${L} delete, ddl and mixed: no page errors or missing translations ${problems.join(' | ')}`);
    await context.close();
  }

  /* ---- 5. Migration of the v1 keys ------------------------------------------------------- */
  {
    const { context, page, problems } = await open(lang);
    await page.goto(`${base}#/`);
    await page.waitForSelector('.home');
    const v1 = await page.evaluate(() => {
      let s = GameCore.newRun(GAME_BANK, 7);
      delete s.mode;
      for (let k = 0; k < 2; k++) s = GameCore.pass(s, GAME_BANK.questions.find((q) => q.id === s.ids[s.level - 1]).solution);
      delete s.mode;
      localStorage.setItem('game-quiz-v1', JSON.stringify(s));
      localStorage.setItem('game-best-v1', JSON.stringify({ prize: 1000, date: '2026-01-01T00:00:00.000Z' }));
      localStorage.setItem('game-quiz-draft-v1', JSON.stringify({ sql: '-- old draft' }));
      return s;
    });
    await page.evaluate(() => { location.hash = '#/game'; });
    await ready(page, '');
    const gone = await page.evaluate((keys) => keys.filter((k) => localStorage.getItem(k) !== null), V1_KEYS);
    const v2 = await store(page);
    expect(gone.length === 0, `${L} migration: the v1 keys are deleted${gone.length ? ` (left: ${gone})` : ''}`);
    expect(v2 && v2.v === 2 && v2.runs.select && same(v2.runs.select.ids, v1.ids) && v2.runs.select.level === 3 && v2.reached.select === 4 && v2.best.select.prize === 1000, `${L} migration: the v1 run lands in runs.select (rung 3); reached.select = max(2 answered, rung 4 of the best prize) = ${v2 && v2.reached.select}; best.select 1000`);
    const tl = await tileOf(page, 'select');
    expect(tl.go === await tr(page, 'Continue · rung {n}', { n: 3 }) && nbsp(tl.best) === nbsp(await tr(page, 'Best {prize}', { prize: M(1000) })), `${L} migration: the select tile says "${tl.go}" and "${tl.best}"`);
    await page.click('[data-fid="game-mode-select"]');
    await ready(page, 'select');
    const s = await state(page);
    expect(s.level === 3 && same(s.ids, v1.ids) && await page.inputValue('#wr-sql') === '-- old draft', `${L} migration: the run goes on at rung 3 with the old console draft`);
    await page.reload();
    await ready(page, 'select');
    expect((await state(page)).level === 3 && (await page.evaluate((keys) => keys.filter((k) => localStorage.getItem(k) !== null), V1_KEYS)).length === 0, `${L} migration happens once: the same run after a reload`);
    expect(problems.length === 0, `${L} migration: no page errors or missing translations ${problems.join(' | ')}`);
    await context.close();
  }

  /* ---- 6. Onboarding tour: on the select screen (n of 6, with "Study or competitive"), then in a run (n of 6,
          the spotlight) -- */
  {
    const { context, page, problems } = await open(lang, { seen: false });
    await page.goto(`${base}#/game`);
    await ready(page, '');
    const opened = await page.waitForSelector('.gi[role="dialog"]', { timeout: 10000 }).then(() => true, () => false);
    const a = opened ? await page.evaluate(() => {
      const gi = document.querySelector('.gi');
      const rest = [...gi.parentElement.children].filter((c) => c !== gi);
      return {
        host: gi.parentElement.matches('section.wr-game'), modal: gi.getAttribute('aria-modal'),
        label: (document.getElementById(gi.getAttribute('aria-labelledby')) || {}).textContent,
        attract: gi.classList.contains('is-attract') && !!gi.querySelector('.gi-card.is-screen-0 [data-intro="start"]'),
        focus: gi.contains(document.activeElement) ? document.activeElement.dataset.intro : 'outside',
        inert: rest.length > 0 && rest.every((c) => c.inert), blur: getComputedStyle(gi.querySelector('.gi-veil')).backdropFilter,
      };
    }) : {};
    const title = await page.evaluate(() => GAME_TEXT.title);
    expect(opened && a.host && a.modal === 'true' && a.label === title && a.inert, `${L} tour: opens on the first visit to the select screen, a modal dialog over an inert page ("${a.label}")`);
    expect(a.attract && a.focus === 'start' && /blur/.test(a.blur), `${L} tour: the attract screen over the blurred page, focus on Start`);
    await page.click('.gi-card.is-screen-0 [data-intro="skip"]');
    expect(await tourGone(page) && await page.evaluate(() => localStorage.getItem('game-intro-seen')) === '1' && await page.$$eval('#view [inert]', (l) => l.length) === 0, `${L} tour: Skip closes it, sets game-intro-seen, nothing left inert`);
    await page.reload();
    await ready(page, '');
    await page.waitForTimeout(500);
    expect(await page.$('.gi') === null, `${L} tour: a reload does not show it again`);
    // The select screen: six numbered screens, no spotlight; the modes screen lists the six modes, then
    // "Study or competitive".
    await page.click('[data-fid="game-help"]');
    await page.waitForSelector('.gi.is-attract');
    await page.click('.gi [data-intro="start"]');
    const sel6 = [];
    const names6 = await page.evaluate(() => ['game', 'modes', ...(GAME_TOUR.comp ? ['comp'] : []), 'loop', 'options', 'example']);
    for (let i = 0; i < names6.length; i++) {
      sel6.push(await screenIs(page, names6[i], i + 1, names6.length));
      if (names6[i] === 'modes') {
        const items = await page.$$eval('.gi-card .gi-mode .gi-kw', (l) => l.map((x) => x.textContent.trim()));
        expect(items.join() === 'SELECT,INSERT,UPDATE,DELETE,CREATE,MIX', `${L} tour: "Six ways to play" lists the six modes (${items.join(' ')})`);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/tour-modes-${lang}.png` });
      }
      if (names6[i] === 'comp') {
        const c = await page.evaluate(() => ({ h: (document.querySelector('.gi-card.is-comp h2, .gi-card.is-comp h3, .gi-card.is-comp [id]') || {}).textContent || '', want: GAME_TOUR.comp.title, text: document.querySelector('.gi-card').textContent }));
        expect(c.text.includes(c.want), `${L} tour: the "${c.want}" screen on the select screen`);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/tour-comp-${lang}.png` });
      }
      if (i < names6.length - 1) await page.click('.gi [data-intro="next"]');
    }
    expect(sel6.every(Boolean), `${L} tour on the select screen: ${names6.join(', ')} as "n of ${names6.length}" (${sel6})`);
    await page.click('.gi [data-intro="play"]');
    expect(await tourGone(page) && await activeFid(page) === 'game-help', `${L} tour: Play closes it, focus back on How to play`);
    // In a run: six numbered screens, the spotlight on screen 4.
    await page.click('[data-fid="game-mode-select"]');
    await ready(page, 'select');
    expect(await page.$('.gi') === null, `${L} tour: opening a run does not show it again`);
    await page.click('[data-fid="game-help"]');
    await page.waitForSelector('.gi.is-attract');
    await page.click('.gi [data-intro="start"]');
    const run6 = [await screenIs(page, 'game', 1, 6)];
    await page.click('.gi [data-intro="next"]');
    run6.push(await screenIs(page, 'modes', 2, 6));
    await page.click('.gi [data-intro="next"]');
    run6.push(await screenIs(page, 'loop', 3, 6));
    await page.click('.gi [data-intro="next"]');
    run6.push(await screenIs(page, 'spot', 4, 6) && await page.evaluate(() => document.querySelector('.gi').classList.contains('is-spot')));
    const spots = await walkSpots(page, async () => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/tour-spot-${lang}.png` }); });
    expect(spots.map((x) => x.id).join() === 'ladder,question,lifelines,console,lock,schema', `${L} tour in a run: six spotlight targets`);
    for (const x of spots) {
      expect(x.ratio >= 0.9 && x.title === x.want, `${L} tour 1440: spotlight on ${x.id}: the cut-out frames ${x.what} [${x.box}] (${Math.round(x.ratio * 100)}%), caption "${x.title}"`);
    }
    run6.push(await screenIs(page, 'options', 5, 6));
    await page.click('.gi [data-intro="next"]');
    run6.push(await screenIs(page, 'example', 6, 6));
    expect(run6.every(Boolean), `${L} tour in a run: game, modes, loop, spot, options, example as "n of 6" (${run6})`);
    await page.waitForSelector('.gi-card.is-example .gi-res tbody tr', { timeout: 8000 }).catch(() => {});
    const ex = await page.evaluate(() => {
      const card = document.querySelector('.gi-card.is-example');
      const x = card && card.querySelector('.gi-ex');
      if (!x) return { phase: 'none' };
      const r1 = card.querySelector('.gi-ml li[data-level="1"] .is-check');
      return { phase: x.dataset.phase, won: x.classList.contains('is-won'), typed: card.querySelector('.gi-typed').textContent, sql: GAME_TOUR.example.sql, rows: card.querySelectorAll('.gi-res tbody tr').length, lit: !!r1 && getComputedStyle(r1).visibility === 'visible' };
    });
    expect(ex.phase === 'done' && ex.won && ex.typed === ex.sql && ex.rows >= 1 && ex.rows <= 4 && ex.lit, `${L} tour: the example's end state with reduced motion (${ex.rows} rows, rung 1 lit)`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/tour-example-${lang}.png` });
    await page.click('.gi [data-intro="replay"]');
    const startPhase = await page.$eval('.gi-ex', (x) => x.dataset.phase);
    const replayed = await page.waitForFunction(() => { const x = document.querySelector('.gi-ex'); return x && x.dataset.phase === 'done' && x.classList.contains('is-won'); }, null, { timeout: 12000 }).then(() => true, () => false);
    expect(startPhase !== 'done' && replayed, `${L} tour: Replay steps through the example again`);
    await page.click('.gi [data-intro="play"]');
    expect(await tourGone(page) && await activeFid(page) === 'game-help', `${L} tour: Play closes it, focus back on How to play`);
    await page.click('[data-fid="game-help"]');
    await page.waitForSelector('.gi.is-attract');
    const inside = () => page.evaluate(() => !!document.querySelector('.gi') && document.querySelector('.gi').contains(document.activeElement));
    let trapped = true;
    for (const where of ['attract', 'screen 1']) {
      if (where === 'screen 1') await page.click('.gi [data-intro="start"]');
      for (let k = 0; k < 7; k++) { await page.keyboard.press('Tab'); trapped = trapped && await inside(); }
      for (let k = 0; k < 7; k++) { await page.keyboard.press('Shift+Tab'); trapped = trapped && await inside(); }
    }
    expect(trapped, `${L} tour: Tab and Shift+Tab stay inside the dialog`);
    await page.keyboard.press('ArrowRight');
    expect(await screenIs(page, 'modes', 2, 6), `${L} tour: the right arrow goes to the next screen`);
    await page.keyboard.press('Escape');
    expect(await tourGone(page) && await activeFid(page) === 'game-help' && await page.$$eval('#view [inert]', (l) => l.length) === 0, `${L} tour: Esc closes it, focus back on How to play`);
    expect(problems.length === 0, `${L} tour: no page errors or missing translations ${problems.join(' | ')}`);
    await context.close();
  }

  /* ---- 7. Always light: a dark site leaves the select screen, the run and the tour light ----- */
  {
    const { context, page, problems } = await open(lang, { scheme: 'dark' });
    await page.goto(`${base}#/game`);
    await ready(page, '');
    const look = async () => ({ panel: await wrToken(page, '--wr-panel'), bg: await gameBg(page), scheme: await page.$eval('.wr-game', (el) => getComputedStyle(el).colorScheme) });
    let k = await look();
    expect(k.panel === LIGHT.panel && k.bg === LIGHT.bg && k.scheme === 'light', `${L} light: the select screen stays light on a dark system (${k.bg})`);
    await go(page, '#/game/insert', 'insert');
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await page.waitForTimeout(100);
    k = await look();
    expect(k.panel === LIGHT.panel && k.bg === LIGHT.bg && k.scheme === 'light' && await page.$('[data-action="game-theme"]') === null, `${L} light: a run stays light with html[data-theme=dark], no theme switch`);
    await page.click('[data-fid="game-help"]');
    await page.waitForSelector('.gi.is-attract');
    const gi = await page.$eval('.gi', (el) => ({ panel: getComputedStyle(el).getPropertyValue('--gi-panel').trim().toLowerCase(), scheme: getComputedStyle(el).colorScheme }));
    expect(gi.panel === LIGHT.panel && gi.scheme === 'light', `${L} light: the tour stays light on a dark site`);
    await page.keyboard.press('Escape');
    expect(problems.length === 0, `${L} always light: no page errors or missing translations ${problems.join(' | ')}`);
    await context.close();
  }

  /* ---- 8. Snippets, schema names, then the language switch --------------------------------- */
  {
    const { context, page, problems } = await open(lang);
    await page.goto(`${base}#/game/select`);
    await ready(page, 'select');
    const snip = async (v) => {
      await page.click(`[data-fid="game-snippet-${v}"]`);
      return page.evaluate(() => { const ed = document.querySelector('#wr-sql'); return { sql: ed.value, sel: ed.value.slice(ed.selectionStart, ed.selectionEnd), focus: document.activeElement === ed }; });
    };
    let c = await snip('games');
    expect(c.sql === 'SELECT *\nFROM games\nFETCH FIRST 5 ROWS ONLY;' && c.focus, `${L} snippet games: a peek at the table, focused`);
    c = await snip('count');
    expect(c.sel === '<table>', `${L} snippet count: <table> selected`);
    await page.fill('#wr-sql', 'SELECT ');
    await page.click('[data-fid="game-name-games-title"]');
    await page.keyboard.type(' FROM ');
    await page.click('[data-fid="game-name-games"]');
    const typed = await page.evaluate(() => ({ v: document.querySelector('#wr-sql').value, focus: document.activeElement === document.querySelector('#wr-sql') }));
    expect(typed.v === 'SELECT title FROM games' && typed.focus, `${L} schema: clicking a column, then a table, types them at the cursor ("${typed.v}")`);
    await lockIn(page, (await current(page)).solution);
    await page.click('[data-fid="game-life-clause"]');
    await page.waitForSelector('#wr-life-out .is-clause');
    const other = lang === 'en' ? 'es' : 'en';
    const help = { en: 'How to play', es: 'Cómo se juega' };
    await page.fill('#wr-sql', '-- before the switch');
    const keep = await state(page);
    const schema = () => page.$$eval('#wr-schema .wr-tbl', (l) => l.map((tb) => `${tb.querySelector('.wr-tbl-h code').textContent}(${[...tb.querySelectorAll('.wr-col code')].map((x) => x.textContent).join(',')})`).join(' '));
    const schemaBefore = await schema();
    await Promise.all([page.waitForURL(new RegExp(`[?&]lang=${other}`), { timeout: 15000 }), page.click(`[data-fid="game-lang-${other}"]`)]);
    await ready(page, 'select');
    expect(await page.evaluate(() => LANG) === other && (await page.textContent('[data-fid="game-help"]')).includes(help[other]) && await pressed(page, `game-lang-${other}`) === 'true' && await hash(page) === '#/game/select',
      `${L} language: ${other.toUpperCase()} reloads the run in ${other}`);
    expect(same(await state(page), keep) && await page.inputValue('#wr-sql') === '-- before the switch', `${L} language: the run survives (rung ${keep.level}, Key clause used, console text)`);
    const schemaAfter = await schema();
    expect(schemaAfter === schemaBefore && /^customers\(customer_id,.*\) games\(game_id,.*\) sales\(sale_id,.*\)$/.test(schemaAfter), `${L} language: the schema stays in English`);
    await go(page, '#/game', '');
    const T = await page.evaluate(() => GAME_TEXT.modes);
    expect((await tiles(page)).every((x, i) => x.name === T[MODES[i]].name), `${L} language: the select screen speaks ${other} (${(await tiles(page)).map((x) => x.name).join(', ')})`);
    expect(problems.length === 0, `${L} snippets and language: no page errors or missing translations ${problems.join(' | ')}`);
    await context.close();
  }

  /* ---- 10. Competitive on the local Supabase stack (COMP=1): set-up messages, sign-in, tiles, an attempt,
          the daily limit, expiry, a won attempt and its badge; then teacher mode; then 390 px -------------- */
  if (STACK) {
    const ts = `${Date.now().toString(36)}-${lang}`;
    const student = `ana-${ts}@cunef.edu`;
    const local = { url: STACK.API, anon: STACK.ANON };
    const W = `${L} comp:`;
    const shotAs = async (page, name, width = 1440) => { if (SHOTS) { await page.mouse.move(0, 0); await page.screenshot({ path: `${SHOTS}/${name}-${width}-${lang}.png`, fullPage: true }); } };
    const toComp = async (page) => {
      await page.goto(`${base}#/game`);
      await readyView(page, 'select');
      if (await page.$('[data-fid="game-side-comp"][aria-pressed="false"]')) await page.click('[data-fid="game-side-comp"]');
      await page.waitForSelector('#wr-login-email, #wr-modes .wr-tile.is-comp, .wr-srv-off, .wr-id', { timeout: 30000 });
    };

    // No anon key: "not set up". A server that does not answer: "not responding (it may be paused)".
    {
      const { context, page, problems } = await open(lang, { comp: { url: STACK.API, anon: '' } });
      await toComp(page);
      expect(flat(await page.textContent('.wr-srv-off').catch(() => '')) === flat(await tr(page, 'The competition is not set up yet.')), `${W} with no anon key, Competitive says the competition is not set up`);
      await context.close();
      const dead = await open(lang, { comp: { url: 'http://127.0.0.1:9', anon: STACK.ANON } });
      await toComp(dead.page);
      await dead.page.fill('#wr-login-email', student);
      await dead.page.click('[data-fid="game-login-send"]');
      const want = await tr(dead.page, 'The competition server is not responding (it may be paused). Try again in a few minutes.');
      const got = await dead.page.waitForFunction((w) => (document.querySelector('#wr-id-msg') || {}).textContent === w, want, { timeout: 30000 }).then(() => true, () => false);
      expect(got, `${W} a server that does not answer: "${want}"`);
      expect(problems.length === 0 && dead.problems.length === 0, `${W} set-up messages: no page errors or missing translations ${[...problems, ...dead.problems].join(' | ')}`);
      await dead.context.close();
    }

    // A student: sign-in, name, tiles, an attempt, the daily limit, expiry, the million.
    let studentId = null;
    let wonAttempt = null;
    {
      const { context, page, problems } = await open(lang, { comp: local });
      const net = captureComp(page);
      await toComp(page);
      await shotAs(page, 'visual-comp-login');
      for (const bad of ['ana@gmail.com', 'ana@cunef.edu.es', 'ana+1@cunef.edu']) {
        const before = (await mailSearch(bad)).length;
        await page.fill('#wr-login-email', bad);
        await page.click('[data-fid="game-login-send"]');
        await page.waitForTimeout(300);
        const msg = flat(await page.textContent('#wr-id-msg'));
        expect(/cunef\.edu/.test(msg) && await page.$('#wr-login-code') === null && (await mailSearch(bad)).length === before, `${W} ${bad} is refused before any email is sent ("${msg.slice(0, 70)}")`);
      }
      // The code by email (Mailpit); a wrong code first.
      await page.fill('#wr-login-email', student.toUpperCase().replace('@CUNEF.EDU', '@cunef.edu'));
      const seen = new Set((await mailSearch(student)).map((x) => x.ID));
      await otpGap(student);
      await page.click('[data-fid="game-login-send"]');
      await page.waitForSelector('#wr-login-code', { timeout: 30000 });
      const code = await mailCode(student, seen);
      expect(/^\d{6}$/.test(code || ''), `${W} the 6-digit code arrives by email (Mailpit)`);
      await page.fill('#wr-login-code', code === '000000' ? '111111' : '000000');
      await page.click('[data-fid="game-login-verify"]');
      const wrongCode = await tr(page, 'That code is not right, or it has expired.');
      const refusedCode = await page.waitForFunction((w) => (document.querySelector('#wr-id-msg') || {}).textContent === w, wrongCode, { timeout: 20000 }).then(() => true, () => false);
      expect(refusedCode && await page.$('#wr-login-code') !== null, `${W} a wrong code is refused ("${wrongCode}")`);
      await page.fill('#wr-login-code', code || '');
      await page.click('[data-fid="game-login-verify"]');
      await page.waitForSelector('#wr-name', { timeout: 30000 });
      await shotAs(page, 'visual-comp-name');
      await page.fill('#wr-name', 'A');
      await page.click('[data-fid="game-name-save"]');
      await page.waitForTimeout(150);
      expect(flat(await page.textContent('#wr-id-msg')) === flat(await tr(page, 'Write your name.')), `${W} a one-letter name is refused`);
      await page.fill('#wr-name', 'Ana Ruiz');
      await page.click('[data-fid="game-name-save"]');
      await page.waitForSelector('#wr-modes .wr-tile.is-comp', { timeout: 30000 });
      const who = await page.textContent('.wr-who');
      expect(who.includes('Ana Ruiz') && who.includes(student), `${W} signed in as Ana Ruiz, ${student} (the email lower-cased)`);
      let ct = await compTiles(page);
      const left3 = await tr(page, '{n} of {total} left today', { n: 3, total: 3 });
      expect(ct.length === 5 && ct.every((x, i) => x.fid === `game-comp-${BASE_MODES[i]}` && x.tag === 'A' && flat(x.left) === flat(left3) && /is-none/.test(x.medal) && !x.badge),
        `${W} five tiles, "${left3}", grey medals, no badge`);
      expect(flat(await page.textContent('.wr-who-badges')) === flat(await tr(page, '{n} of 5 badges', { n: 0 })), `${W} "0 of 5 badges"`);
      await shotAs(page, 'visual-comp-select');
      // The name is asked once: after a reload the tiles come straight back.
      await page.reload();
      await page.waitForSelector('#wr-modes .wr-tile.is-comp, #wr-name, #wr-login-email', { timeout: 30000 });
      expect(await page.$('#wr-modes .wr-tile.is-comp') !== null && await page.$('#wr-name') === null, `${W} after a reload: still signed in, the name is not asked again`);
      const ses = await sessionOf(page);
      studentId = ses && ses.id;
      const prof = await svc('GET', `profiles?user_id=eq.${studentId}&select=email,name,role`);
      expect(prof.data && prof.data[0] && prof.data[0].email === student && prof.data[0].name === 'Ana Ruiz' && prof.data[0].role === 'student', `${W} the profiles row: email, name, role student`);

      // An attempt (select): rules, clock, paste blocked, a local Run, Key clause, a refusal, a wrong answer, the rescue,
      // Review, a second wrong answer: lost.
      await page.click('[data-fid="game-comp-select"]');
      await readyView(page, 'start', 'comp');
      const rules = await page.evaluate(() => ({ n: document.querySelectorAll('.wr-rules li').length, h: document.querySelector('#wr-rules-h').textContent.trim(), start: !!document.querySelector('[data-fid="game-comp-start"]') }));
      expect(rules.n === 5 && flat(rules.h) === flat(left3) && rules.start, `${W} the rules first: 5 lines (one says the database is drawn), "${rules.h}", Start`);
      await shotAs(page, 'visual-comp-start');
      await page.click('[data-fid="game-comp-start"]');
      await readyView(page, 'run', 'comp');
      const c0 = await clockText(page);
      await page.waitForTimeout(1300);
      const c1 = await clockText(page);
      expect(clockSecs(c0) >= 59 * 60 && clockSecs(c0) <= 3600 && clockSecs(c1) < clockSecs(c0), `${W} the countdown from the server's deadline is visible and moving (${c0} → ${c1})`);
      await page.fill('#wr-sql', 'SELECT title FROM games');
      const pd = await page.evaluate(() => {
        const ed = document.getElementById('wr-sql');
        const dt = new DataTransfer();
        dt.setData('text/plain', 'SELECT * FROM sales');
        const p = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
        ed.dispatchEvent(p);
        const dt2 = new DataTransfer();
        dt2.setData('text/plain', 'DELETE FROM sales');
        const d = new DragEvent('drop', { dataTransfer: dt2, bubbles: true, cancelable: true });
        ed.dispatchEvent(d);
        return { p: p.defaultPrevented, d: d.defaultPrevented, v: ed.value, note: !!document.getElementById('wr-paste'), tele: JSON.parse(localStorage.getItem('game-comp-tele-v2') || '{}') };
      });
      expect(pd.p && pd.d && pd.v === 'SELECT title FROM games' && pd.note && pd.tele.paste === 2, `${W} a paste and a drop are blocked: the editor unchanged, a note, counted (paste ${pd.tele.paste})`);
      const callsBefore = net.count();
      // A query on the drawn database (§16): its first table, as the schema panel lists it.
      const firstTable = await page.$eval('#wr-schema .wr-tbl-h code', (e) => e.textContent.trim());
      const shownDb = await page.$eval('#wr-schema', (e) => ({ db: e.dataset.db, name: ((e.querySelector('.wr-db-name') || {}).textContent || '').trim() }));
      expect(!!shownDb.db && shownDb.name.length > 10, `${W} the schema panel names the drawn database (${shownDb.db}: "${shownDb.name}")`);
      await run(page, `SELECT * FROM ${firstTable}`);
      const tl = await page.evaluate(() => JSON.parse(localStorage.getItem('game-comp-tele-v2') || '{}'));
      expect(await resultRows(page) > 0 && net.count() === callsBefore && tl.runs === 1, `${W} Run is local (rows, no call to the server) and counted (runs ${tl.runs})`);
      await page.click('[data-fid="game-life-clause"]');
      await page.waitForSelector('#wr-life-out .is-clause', { timeout: 20000 });
      await page.waitForFunction(() => /\d/.test((document.querySelector('#wr-shape') || {}).textContent || ''), null, { timeout: 10000 }).catch(() => {});
      expect(/\d/.test(await page.textContent('#wr-shape').catch(() => '')) && (await page.textContent('#wr-life-out .is-clause')).length > 20, `${W} Key clause from the server: the hint and the shape ("${flat(await page.textContent('#wr-shape').catch(() => ''))}")`);
      let lk = await leaks(page);
      expect(lk.length === 0, `${W} no private solution in the DOM or the storage during an attempt${lk.length ? ` (${lk.join(', ')})` : ''}`);
      await shotAs(page, 'visual-comp-run');
      let s0 = await state(page);
      const ref = await refused(page, WRONG.select[0]);
      let s1 = await state(page);
      expect(ref.check && !ref.dialog && s1.level === s0.level && s1.answers.length === s0.answers.length, `${W} a statement of another kind is refused at no cost ("${ref.text.slice(0, 50)}")`);
      const w1 = await compWrong(page);
      s1 = await compLockIn(page, w1);
      expect(await page.$('#wr-rescue') !== null && s1.level === 1, `${W} a wrong lock-in (a private trap) opens the rescue`);
      // "Use Review" at once, as a quick student would (the rescue is exempt from the 2 s SQL slot).
      const t0r = Date.now() - (lastSubmit.get(page) || 0);
      await page.click('[data-fid="game-rescue-yes"]');
      const gotReview = await page.waitForSelector('#wr-life-out .is-review', { timeout: 20000 }).then(() => true, () => false);
      const rv = await page.$$eval('#wr-life-out .is-review .wr-review li', (l) => l.map((x) => ({ t: x.textContent.trim(), ok: x.classList.contains('is-ok') })));
      const srvErr = await page.$$eval('#view .wr-srv, #wr-out .wr-msg.is-err.wr-srv', (l) => l.map((x) => x.textContent.trim()).join(' | '));
      s1 = await state(page);
      expect(gotReview && !srvErr && t0r < 2000, `${W} "Use Review" clicked ${t0r} ms after the wrong lock-in works: no error, the Review card shows${srvErr ? ` (error: ${srvErr})` : ''}`);
      expect(rv.length >= 1 && rv.every((x) => !x.ok && x.t) && s1.used.review && s1.level === 1, `${W} the rescue spends Review: the server's diagnosis ("${flat(rv[0] && rv[0].t).slice(0, 60)}"), same rung`);
      const w2 = await compWrong(page, [w1]) || w1;
      s1 = await compLockIn(page, w2);
      await page.waitForSelector('#wr-end', { timeout: 20000 }).catch(() => {});
      const lost = await page.evaluate(() => { const x = document.querySelector('#wr-end'); return x && { status: x.dataset.status, codes: x.querySelectorAll('pre code').length, again: (x.querySelector('[data-fid="game-again"]') || {}).textContent || '', left: (x.querySelector('.wr-end-left') || {}).textContent || '' }; });
      expect(lost && lost.status === 'lost' && lost.codes === 0 && flat(lost.again) === flat(await tr(page, 'Try again (new questions)')) && flat(lost.left) === flat(await tr(page, '{n} of {total} left today', { n: 2, total: 3 })),
        `${W} a second wrong answer: lost, no SQL on the end screen, Try again, "${flat(lost && lost.left)}"`);
      lk = await leaks(page, [w1, w2]);
      expect(lk.length === 0, `${W} no private solution on the loss screen or in the storage${lk.length ? ` (${lk.join(', ')})` : ''}`);
      await shotAs(page, 'visual-comp-lost');
      // Try again: a new attempt, a new draw on the server.
      await page.click('[data-fid="game-again"]');
      await readyView(page, 'start', 'comp');
      await page.click('[data-fid="game-comp-start"]');
      await readyView(page, 'run', 'comp');
      const atts = await svc('GET', `attempts?user_id=eq.${studentId}&mode=eq.select&select=id,ids,status&order=started_at`);
      expect(atts.data.length === 2 && atts.data[0].status === 'lost' && atts.data[1].status === 'playing' && JSON.stringify(atts.data[0].ids) !== JSON.stringify(atts.data[1].ids),
        `${W} Try again starts attempt 2 with another draw (${atts.data[1] ? atts.data[1].ids.filter((id, i) => id !== atts.data[0].ids[i]).length : 0} of 15 differ)`);
      // Expiry: the deadline moved into the past in the database; the next Lock in finds the attempt expired.
      await svc('PATCH', `attempts?id=eq.${atts.data[1].id}`, { deadline: new Date(Date.now() - 1000).toISOString() });
      await page.fill('#wr-sql', await compWrong(page));
      await page.click('[data-fid="game-lock"]');
      await page.waitForSelector('#wr-confirm[data-kind="lock"]');
      await page.click('[data-fid="game-confirm-yes"]');
      await page.waitForSelector('#wr-end', { timeout: 20000 }).catch(() => {});
      expect(flat(await page.textContent('#wr-end-h').catch(() => '')) === flat(await tr(page, 'Time is up')) && await page.$('#wr-clock') === null, `${W} after the deadline (moved in the database) the attempt ends: "Time is up"`);
      // The daily limit: the third attempt of the day (through the API), then the tile and the server refuse a fourth.
      let r = await compApi(ses.token, { op: 'start', mode: 'select' });
      r = await compApi(ses.token, { op: 'walk', attemptId: r.data.attempt && r.data.attempt.id });
      r = await compApi(ses.token, { op: 'start', mode: 'select' });
      expect(r.status === 429 && r.data.error && r.data.error.code === 'limit', `${W} the server refuses a 4th attempt in a day (HTTP ${r.status} ${r.data.error && r.data.error.code})`);
      await page.goto(`${base}#/game`);
      await page.reload();                                // the third start happened elsewhere (the API): ask the server again
      await page.waitForSelector('#wr-modes .wr-tile.is-comp', { timeout: 30000 });
      const sel = (await compTiles(page)).find((x) => x.fid === 'game-comp-select');
      const tomorrow = await tr(page, 'Come back tomorrow');
      expect(sel && sel.off && flat(sel.go) === flat(tomorrow) && flat(sel.left) === flat(await tr(page, '{n} of {total} left today', { n: 0, total: 3 })), `${W} the select tile says "${tomorrow}" and "0 of 3 left today"`);
      await page.goto(`${base}#/game/comp/select`);
      await readyView(page, 'start', 'comp');
      expect(await page.$('[data-fid="game-comp-start"]') === null && flat(await page.textContent('.wr-tomorrow').catch(() => '')) === flat(tomorrow), `${W} #/game/comp/select: no Start, "${tomorrow}"`);
      // The million in update, typing the private solutions: the certificate, the badge on the tile and in the database.
      await page.goto(`${base}#/game`);
      await page.waitForSelector('#wr-modes .wr-tile.is-comp', { timeout: 30000 });
      await page.click('[data-fid="game-comp-update"]');
      await readyView(page, 'start', 'comp');
      await page.click('[data-fid="game-comp-start"]');
      await readyView(page, 'run', 'comp');
      const typed = [];
      let sw = await state(page);
      while (sw.status === 'playing') {
        const id = await compQid(page);
        const sql = PRIV[id] && PRIV[id].solution;
        if (!sql) break;
        typed.push(sql);
        const lvl = sw.level;
        sw = await compLockIn(page, sql);
        if (sw.status === 'playing' && sw.level !== lvl + 1) break;
      }
      await page.waitForSelector('#wr-end.is-diploma', { timeout: 20000 }).catch(() => {});
      const cert = await page.evaluate(() => ({ name: (document.querySelector('.wr-cert-name') || {}).textContent, mail: (document.querySelector('.wr-cert-mail') || {}).textContent, stamp: (document.querySelector('.wr-cert .wr-stamp') || {}).textContent, test: !!document.querySelector('.wr-cert.is-test'), print: !!document.querySelector('[data-fid="game-print"]'), codes: document.querySelectorAll('#wr-end pre code').length }));
      expect(sw.status === 'won' && cert.name === 'Ana Ruiz' && cert.mail === student && cert.stamp === 'UPDATE' && !cert.test && cert.print && cert.codes === 0,
        `${W} 15 private solutions in update win: the certificate (Ana Ruiz, stamp UPDATE, Print, no SQL)${sw.status !== 'won' ? ` [stopped at rung ${sw.level}]` : ''}`);
      const badge = await svc('GET', `badges?user_id=eq.${studentId}&select=mode,attempt_id`);
      wonAttempt = badge.data && badge.data[0] && badge.data[0].attempt_id;
      expect(badge.data && badge.data.length === 1 && badge.data[0].mode === 'update', `${W} the badges row is in the database (mode update)`);
      lk = await leaks(page, typed);
      expect(lk.length === 0, `${W} on the certificate, no other private solution in the DOM or the storage${lk.length ? ` (${lk.join(', ')})` : ''}`);
      await shotAs(page, 'visual-comp-cert');
      await page.goto(`${base}#/game`);
      await page.waitForSelector('#wr-modes .wr-tile.is-comp', { timeout: 30000 });
      ct = await compTiles(page);
      const up = ct.find((x) => x.fid === 'game-comp-update');
      expect(up && /is-earned/.test(up.medal) && up.badge.length > 0 && flat(await page.textContent('.wr-who-badges')) === flat(await tr(page, '{n} of 5 badges', { n: 1 })), `${W} the update tile shows the badge ("${up && up.badge}"), 1 of 5 badges`);
      // The header's account menu: the initials, today's attempts and the badge from the cached status; My attempts.
      const acct = await page.evaluate(() => ({
        face: document.querySelector('#account-btn .account-face').textContent.trim(), label: document.querySelector('#account-btn').getAttribute('aria-label'),
      }));
      expect(acct.face === 'AR' && acct.label.includes('Ana Ruiz'), `${W} the header's account button shows the initials AR (${acct.label})`);
      await page.click('#account-btn');
      const panel = await page.evaluate(() => ({
        rows: document.querySelectorAll('#account-comp .account-modes li').length,
        earned: [...document.querySelectorAll('#account-comp .account-modes li')].filter((li) => li.querySelector('.account-badge.is-earned')).map((li) => li.querySelector('.account-kw').textContent),
        out: !document.querySelector('#account-out').hidden,
      }));
      expect(panel.rows === 5 && panel.earned.length === 1 && panel.out, `${W} the account menu: 5 modes today, one badge (${panel.earned.join(', ')}), Sign out`);
      await page.click('#account-comp a[href="#/game/historial"]');
      await page.waitForSelector('.wr-hmodes', { timeout: 30000 });
      const hs = await page.evaluate(() => ({
        modes: [...document.querySelectorAll('.wr-hmode')].map((li) => ({ earned: li.classList.contains('is-earned'), done: li.querySelectorAll('.wr-hcell.is-done').length })),
        rows: [...document.querySelectorAll('.wr-hatts .wr-trow')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()),
        panelHidden: document.querySelector('#account-panel').hidden,
      }));
      const wonText = await tr(page, 'Won');
      const upIdx = BASE_MODES.indexOf('update');
      expect(hs.panelHidden && hs.modes.length === 5 && hs.modes[upIdx].earned && hs.modes[upIdx].done === 15 && hs.modes.filter((x) => x.earned).length === 1,
        `${W} My attempts: five modes, update with the badge and all 15 rungs`);
      expect(hs.rows.length >= 1 && hs.rows[0].includes(wonText), `${W} My attempts: ${hs.rows.length} attempt(s), the newest is the won one ("${(hs.rows[0] || '').slice(0, 80)}")`);
      await shotAs(page, 'visual-comp-history');
      // A student is not let into teacher mode.
      await page.goto(`${base}#/game/profesor`);
      await readyView(page, 'teacher');
      await page.waitForSelector('.wr-srv-off, .wr-board', { timeout: 30000 });
      expect(flat(await page.textContent('.wr-srv-off').catch(() => '')) === flat(await tr(page, 'This area is for teachers.')) && await page.$('.wr-board') === null, `${W} a student at #/game/profesor: "This area is for teachers."`);
      const bodies = await net.all();
      const nl = netLeaks(bodies);
      expect(bodies.length >= 25 && nl.length === 0, `${W} no private solution in any of the ${bodies.length} responses of the comp function${nl.length ? ` (LEAK ${nl.join(', ')})` : ''}`);
      // Sign out from the header's account menu: back to the outline, the session gone.
      await page.click('#account-btn');
      await page.click('#account-out [data-account="logout"]');
      await page.waitForFunction(() => !document.querySelector('#account-btn').classList.contains('is-in'), null, { timeout: 30000 }).catch(() => {});
      const gone = await page.evaluate(() => ({ face: document.querySelector('#account-btn .account-face').textContent.trim(), auth: localStorage.getItem('game-comp-auth'), cache: localStorage.getItem('game-comp-status'), signIn: !!document.querySelector('#account-who a[href="#/game/entrar"]') }));
      expect(gone.face === '' && !gone.auth && !gone.cache && gone.signIn, `${W} Sign out from the account menu: the outline again, no stored session or cached status`);
      expect(problems.length === 0, `${W} student: no page errors or missing translations ${problems.join(' | ')}`);
      await context.close();
    }

    // The teacher (local: alberto.turegano@cunef.edu, given the role by supabase/seed-teacher.sql).
    {
      const { context, page, problems } = await open(lang, { comp: local });
      const T = 'alberto.turegano@cunef.edu';
      await toComp(page);
      await signIn(page, T, 'Alberto Turégano');
      let seeded = true;
      try { execSync(`docker exec -i ${DB_CONTAINER} psql -U postgres -v ON_ERROR_STOP=1 -q`, { input: readFileSync(join(ROOT, 'supabase/seed-teacher.sql')), stdio: ['pipe', 'ignore', 'ignore'], timeout: 30000 }); } catch (e) { seeded = false; }
      expect(seeded, `${L} teacher: supabase/seed-teacher.sql gives ${T} the teacher role (docker exec … psql)`);
      await page.goto(`${base}#/game/profesor`);
      await page.reload();
      await readyView(page, 'teacher');
      await page.waitForSelector('.wr-board, .wr-srv-off', { timeout: 30000 }).catch(() => {});
      // The accounts on the left: the search narrows the list; a click opens the account's record on the right.
      const typeSearch = async (q) => { await page.fill('#wr-tsearch', q); await page.waitForTimeout(80); };
      await typeSearch(student);
      const listed = await page.$$eval('#wr-plist .wr-person', (l) => l.map((b) => ({ fid: b.dataset.fid, text: b.textContent })));
      expect(listed.length === 1 && listed[0].text.includes(student), `${L} teacher: the search narrows the accounts to the student (${listed.length})`);
      expect(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'wr-tsearch', `${L} teacher: the search field keeps the focus while the list updates`);
      if (listed[0]) await page.click(`[data-fid="${listed[0].fid}"]`);
      const rec = await page.evaluate(() => ({
        name: (document.querySelector('#wr-fh') || {}).textContent || '',
        badges: [...document.querySelectorAll('.wr-fb.is-on [data-action="game-teacher-attempt"]')].map((b) => b.dataset.value),
        oral: (document.querySelector('.wr-fhead [data-action="game-teacher-oral"]') || { dataset: {} }).dataset.value || '',
        current: !!document.querySelector('#wr-plist .wr-person[aria-current="true"]'),
      }));
      expect(rec.current && rec.badges.length === 1 && rec.badges[0] === wonAttempt && rec.oral, `${L} teacher: the student's record: one badge (update) and Pick 2 at random`);
      await typeSearch('');
      await shotAs(page, 'visual-teacher-list');
      if (rec.badges[0]) {
        // The badge opens its attempt under its row; Close and Esc close it and give the focus back to the row.
        await page.click(`[data-fid="game-tatt-${rec.badges[0]}"]`);
        await page.waitForSelector('.wr-trow.is-open .wr-tdetail .wr-va', { timeout: 20000 });
        const det = await page.evaluate(() => ({ n: document.querySelectorAll('.wr-tdetail .wr-va').length, refs: [...document.querySelectorAll('.wr-tdetail .is-ref code')].map((c) => c.textContent), flags: document.querySelectorAll('.wr-tdetail .wr-flags li').length, bar: (document.querySelector('.wr-trow.is-open .wr-tr-res') || {}).textContent || '', closes: document.querySelectorAll('.wr-trow.is-open button').length }));
        const sols = new Set(Object.values(PRIV).map((q) => q.solution));
        expect(det.n === 15 && det.refs.length === 15 && det.refs.every((x) => sols.has(x)) && det.flags > 0, `${L} teacher: the attempt opens under its row: 15 questions, each with the reference solution, and the flags (${det.flags})`);
        expect(flat(det.bar) === flat(await tr(page, 'Won')), `${L} teacher: the attempt's state is translated ("${flat(det.bar)}")`);
        expect(det.closes === 1, `${L} teacher: the open attempt has one Close button, on its row (${det.closes})`);
        await shotAs(page, 'visual-teacher-detail');
        await page.keyboard.press('Escape');
        const afterEsc = await page.evaluate(() => ({ open: !!document.querySelector('.wr-tdetail'), focus: document.activeElement && document.activeElement.dataset.fid }));
        expect(!afterEsc.open && afterEsc.focus === `game-tatt-row-${rec.badges[0]}`, `${L} teacher: Esc closes the attempt and the focus goes back to its row (${afterEsc.focus})`);
        await page.click(`[data-fid="game-tatt-row-${rec.badges[0]}"]`);
        await page.waitForSelector('.wr-tdetail', { timeout: 20000 });
        expect(await page.getAttribute(`[data-fid="game-tatt-row-${rec.badges[0]}"]`, 'aria-expanded') === 'true', `${L} teacher: Open on the row opens the attempt (aria-expanded)`);
        await page.click(`[data-fid="game-tatt-row-${rec.badges[0]}"]`);
        expect(await page.$('.wr-tdetail') === null, `${L} teacher: Close closes the attempt`);
      }
      if (rec.oral) {
        await page.click(`[data-fid="game-oral-${rec.oral}"]`);
        await page.waitForSelector('.wr-oral-card', { timeout: 20000 });
        expect(await page.$$eval('.wr-oral-card .wr-va.is-oral', (l) => l.length) === 2, `${L} teacher: Pick 2 at random shows two of the student's right answers`);
        await page.click('[data-fid="game-oral-close"]');
        expect(await page.$('.wr-oral-card') === null, `${L} teacher: the oral check closes`);
      }
      // Export: a menu with the two downloads; it closes after a choice.
      await page.click('[data-fid="game-teacher-export"]');
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), page.click('[data-fid="game-teacher-csv"]')]);
      const csv = dl ? readFileSync(await dl.path(), 'utf8') : '';
      expect(csv.startsWith('email,name,role,select_badge,') && csv.split('\n').some((l) => l.startsWith(`${student},`) && l.includes(',student,')), `${L} teacher: Export → summary (${dl ? dl.suggestedFilename() : 'none'}): the header and the student's line`);
      expect(await page.evaluate(() => !document.getElementById('wr-export').open), `${L} teacher: the Export menu closes after a download`);
      await page.click('[data-fid="game-teacher-export"]');
      const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), page.click('[data-fid="game-teacher-csv-answers"]')]);
      const csv2 = dl2 ? readFileSync(await dl2.path(), 'utf8') : '';
      expect(csv2.startsWith('role,email,name,attempt_id,') && csv2.includes(wonAttempt), `${L} teacher: Export → every answer (${dl2 ? dl2.suggestedFilename() : 'none'}): the header and the won attempt`);
      // The filters: who (the accounts) and the attempt kind (the record's attempts).
      const people = () => page.$$eval('#wr-plist .wr-person', (l) => l.map((b) => b.textContent));
      const rows = () => page.$$eval('.wr-trow', (l) => l.map((x) => ({ test: x.classList.contains('is-test') })));
      expect((await rows()).length > 0, `${L} teacher: the record lists the student's attempts`);
      await page.click('[data-fid="game-tf-kind-test"]');
      expect((await rows()).every((x) => x.test), `${L} teacher: the Test filter shows only test attempts`);
      await page.click('[data-fid="game-tf-kind-real"]');
      expect((await rows()).length > 0 && (await rows()).every((x) => !x.test), `${L} teacher: the Real filter shows no test attempt`);
      await page.click('[data-fid="game-tf-kind-all"]');
      await page.click('[data-fid="game-tf-role-teacher"]');
      const teachersOnly = await people();
      expect(teachersOnly.some((x) => x.includes(T)) && !teachersOnly.some((x) => x.includes(student)), `${L} teacher: the Teachers filter lists teachers only`);
      await page.click('[data-fid="game-tf-role-all"]');
      await typeSearch('no-such-account-zz');
      expect(await page.$('#wr-plist .wr-pnone') !== null, `${L} teacher: a search with no match says so`);
      await typeSearch('');
      // A test attempt: Jump to rung 15, Force right, the TEST certificate, no badge.
      await page.click('[data-fid="game-teacher-tab-test"]');
      await page.click('[data-fid="game-test-ddl"]');
      await readyView(page, 'start', 'test');
      await page.click('[data-fid="game-comp-start"]');
      await readyView(page, 'run', 'test');
      expect(await page.$('.wr-testbar .wr-stamp.is-test') !== null, `${L} teacher: a test attempt with the TEST bar`);
      await page.click('[data-fid="game-test-jump"]');
      await page.waitForFunction(() => GamePage.debug() && GamePage.debug().level === 15, null, { timeout: 20000 }).catch(() => {});
      expect((await state(page)).level === 15, `${L} teacher: Jump to rung 15`);
      await sqlGap(page);
      await page.click('[data-fid="game-test-force"]');
      await page.waitForSelector('#wr-end.is-diploma', { timeout: 20000 }).catch(() => {});
      expect(await page.$('.wr-cert.is-test') !== null && flat(await page.textContent('.wr-cert .wr-stamp').catch(() => '')) === 'TEST', `${L} teacher: Force right on rung 15 gives a certificate stamped TEST`);
      const tid = (await sessionOf(page)).id;
      const tb = await svc('GET', `badges?user_id=eq.${tid}&select=mode`);
      expect(Array.isArray(tb.data) && tb.data.length === 0, `${L} teacher: a test attempt gives no badge`);
      await shotAs(page, 'visual-teacher-cert');
      expect(problems.length === 0, `${L} teacher: no page errors or missing translations ${problems.join(' | ')}`);
      await context.close();
    }

    // 390 px: sign-in, tiles, an attempt (a new student); the teacher's list and a TEST certificate.
    {
      const fits = async (page, what, name) => {
        await page.evaluate(() => scrollTo(0, 0));
        await page.mouse.move(0, 0);
        await page.waitForTimeout(120);
        const m = await noHScroll(page);
        expect(m.sw <= m.iw, `${L} 390px comp: ${what}: no horizontal scroll (${m.sw} <= ${m.iw})`);
        if (SHOTS && name) await page.screenshot({ path: `${SHOTS}/${name}-390-${lang}.png`, fullPage: true });
      };
      const a = await open(lang, { comp: local, width: 390, height: 844, scale: 2 });
      await toComp(a.page);
      await fits(a.page, 'sign-in', 'visual-comp-login');
      await signIn(a.page, `bea-${ts}@cunef.edu`, 'Bea Soto');
      await fits(a.page, 'tiles', 'visual-comp-select');
      await a.page.click('[data-fid="game-comp-insert"]');
      await readyView(a.page, 'start', 'comp');
      await fits(a.page, 'rules', 'visual-comp-start');
      await a.page.click('[data-fid="game-comp-start"]');
      await readyView(a.page, 'run', 'comp');
      expect(await a.page.isVisible('#wr-clock') && clockSecs(await clockText(a.page)) > 0, `${L} 390px comp: the countdown is visible on a phone`);
      await fits(a.page, 'attempt', 'visual-comp-run');
      expect(a.problems.length === 0, `${L} 390px comp: student: no page errors or missing translations ${a.problems.join(' | ')}`);
      await a.context.close();
      const b = await open(lang, { comp: local, width: 390, height: 844, scale: 2 });
      await toComp(b.page);
      await signIn(b.page, 'alberto.turegano@cunef.edu', 'Alberto Turégano');
      await b.page.goto(`${base}#/game/profesor`);
      await readyView(b.page, 'teacher');
      await b.page.waitForSelector('.wr-board', { timeout: 30000 }).catch(() => {});
      await fits(b.page, 'teacher list', 'visual-teacher-list');
      await b.page.click('[data-fid="game-teacher-tab-test"]');
      await b.page.click('[data-fid="game-test-select"]');
      await readyView(b.page, 'start', 'test');
      await b.page.click('[data-fid="game-comp-start"]');
      await readyView(b.page, 'run', 'test');
      await b.page.click('[data-fid="game-test-jump"]');
      await b.page.waitForFunction(() => GamePage.debug() && GamePage.debug().level === 15, null, { timeout: 20000 }).catch(() => {});
      await sqlGap(b.page);
      await b.page.click('[data-fid="game-test-force"]');
      await b.page.waitForSelector('#wr-end.is-diploma', { timeout: 20000 }).catch(() => {});
      await fits(b.page, 'certificate', 'visual-comp-cert');
      expect(b.problems.length === 0, `${L} 390px comp: teacher: no page errors or missing translations ${b.problems.join(' | ')}`);
      await b.context.close();
    }
  }

  /* ---- 9. Layout: 1440 and 390, light and dark site: select screen, tour, run, end screen ---- */
  for (const width of [1440, 390]) {
    const { context, page, problems } = await open(lang, { width, height: width === 390 ? 844 : 900, scale: width === 390 ? 2 : 1, seen: false });
    const phone = width === 390;
    for (const theme of ['light', 'dark']) {
      const W = `${L} ${width}px ${theme} site:`;
      await page.emulateMedia({ colorScheme: theme });
      if (theme === 'light') await page.goto(`${base}#/game`);
      else { await page.evaluate(() => { localStorage.removeItem('game-intro-seen'); location.hash = '#/game'; }); await page.reload(); }
      await ready(page, '');
      const tour = await page.waitForSelector('.gi[role="dialog"]', { timeout: 10000 }).then(() => true, () => false);
      let m = await noHScroll(page);
      const card = await page.$eval('.gi-card', (x) => { const r = x.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }).catch(() => [0, 0]);
      expect(tour && m.sw <= m.iw && card[0] >= 0 && card[1] <= m.iw, `${W} tour on the select screen: no horizontal scroll (${m.sw} <= ${m.iw}), the card fits (${card})`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/visual-tour-${theme}-${width}-${lang}.png` });
      await page.click('.gi-card.is-screen-0 [data-intro="skip"]');
      await tourGone(page);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(150);
      m = await noHScroll(page);
      expect(m.sw <= m.iw && await wrToken(page, '--wr-panel') === LIGHT.panel, `${W} select screen: light, no horizontal scroll (${m.sw} <= ${m.iw})`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/visual-select-${theme}-${width}-${lang}.png`, fullPage: true });
      await go(page, '#/game/select', 'select');
      if (phone && theme === 'light') {
        // The spotlight on a phone: the targets are scrolled to and framed one by one.
        await page.click('[data-fid="game-help"]');
        await page.waitForSelector('.gi.is-attract');
        await page.click('.gi [data-intro="start"]');
        for (let k = 0; k < 3; k++) await page.click('.gi [data-intro="next"]');
        const spots = await walkSpots(page);
        const badSpots = spots.filter((x) => x.ratio < 0.9 || x.title !== x.want);
        expect(spots.length === 6 && badSpots.length === 0, `${W} tour: the spotlight frames all six targets on a phone (${spots.map((x) => `${x.id} ${Math.round(x.ratio * 100)}%`).join(', ')})`);
        m = await noHScroll(page);
        expect(m.sw <= m.iw, `${W} tour in a run: no horizontal scroll (${m.sw} <= ${m.iw})`);
        await page.keyboard.press('Escape');
        await tourGone(page);
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.mouse.move(0, 0);
      await page.waitForTimeout(150);
      m = await noHScroll(page);
      expect(m.sw <= m.iw && await wrToken(page, '--wr-panel') === LIGHT.panel, `${W} run: light, no horizontal scroll (${m.sw} <= ${m.iw})`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/visual-game-${theme}-${width}-${lang}.png`, fullPage: true });
    }
    // The ladder: a strip of 15 squares and "Show prizes" on a phone; the full list on a desktop.
    const strip = await page.evaluate(() => {
      const lis = [...document.querySelectorAll('#wr-ladder > li')].map((li) => li.getBoundingClientRect());
      const tog = document.querySelector('[data-fid="game-ladder"]');
      const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
      return { n: lis.length, maxW: Math.max(...lis.map((r) => r.width)), rows: new Set(lis.map((r) => Math.round(r.top))).size, toggle: vis(tog), prize: vis(document.querySelector('#wr-ladder .wr-rung-p')) };
    });
    if (phone) {
      expect(strip.n === 15 && strip.maxW < 48 && strip.rows <= 2 && !strip.prize && strip.toggle, `${L} 390px: the ladder is a strip of 15 small squares with Show prizes`);
      await page.click('[data-fid="game-ladder"]');
      const o = await page.evaluate(() => ({ exp: document.querySelector('[data-fid="game-ladder"]').getAttribute('aria-expanded'), prize: getComputedStyle(document.querySelector('#wr-ladder .wr-rung-p')).display !== 'none', sw: document.scrollingElement.scrollWidth, iw: innerWidth }));
      expect(o.exp === 'true' && o.prize && o.sw <= o.iw, `${L} 390px: Show prizes opens the full ladder, no horizontal scroll`);
      await page.click('[data-fid="game-ladder"]');
    } else {
      expect(strip.n === 15 && !strip.toggle && strip.prize && strip.rows === 15, `${L} 1440px: the full ladder, one row per rung, no Show prizes button`);
    }
    // A DML run's diff on this width, then the end screen in both themes.
    await go(page, '#/game/update', 'update');
    await run(page, (await current(page)).solution);
    const md = await noHScroll(page);
    expect(await page.$('#wr-out .wr-diff') !== null && md.sw <= md.iw, `${L} ${width}px: an update's diff, no horizontal scroll (${md.sw} <= ${md.iw})`);
    if (SHOTS) { await page.$eval('#wr-out', (el) => el.scrollIntoView({ block: 'center' })); await page.screenshot({ path: `${SHOTS}/visual-diff-${width}-${lang}.png` }); }
    await go(page, '#/game/select', 'select');
    await playTo(page, 3);
    await page.click('[data-fid="game-walk"]');
    await page.waitForSelector('#wr-confirm[data-kind="walk"]');
    await page.click('[data-fid="game-confirm-yes"]');
    await page.waitForSelector('#wr-end');
    for (const theme of ['dark', 'light']) {
      await page.emulateMedia({ colorScheme: theme });
      await page.evaluate(() => scrollTo(0, 0));
      await page.mouse.move(0, 0);
      await page.waitForTimeout(150);
      const mm = await noHScroll(page);
      expect(mm.sw <= mm.iw && await wrToken(page, '--wr-panel') === LIGHT.panel, `${L} ${width}px ${theme} site: end screen, light, no horizontal scroll (${mm.sw} <= ${mm.iw})`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/visual-end-${theme}-${width}-${lang}.png`, fullPage: true });
    }
    expect(problems.length === 0, `${L} ${width}px: no page errors or missing translations ${problems.join(' | ')}`);
    await context.close();
  }
}

await browser.close();
server.close();
console.log(`${bad ? `${bad} check(s) failed` : 'all game checks passed'} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(bad ? 1 : 0);
