// Derives the HIDDEN dataset of the competitive game (docs/game-quiz.md §15.5) from the public setup
// (data/game-bank.js). The server grades every answer on the public setup AND on this one, so an answer that
// hard-codes what the public data looks like (a list of ids, a literal total, a fixed date) fails.
//
// What stays: the three tables and their constraints, every id, customer name, game title and every key
// relationship (each sale keeps its customer and its game), the NULL count of rating, the zero count of stock.
// What changes (seeded, reproducible):
//   customers  country and vip_level shuffled among customers; signup_date regenerated (before the first purchase)
//   games      genre, stock and rating (NULLs included) shuffled among games; price shuffled, then moved ±1–3
//   sales      quantity shuffled; sale_date shuffled, then moved ±0–9 days (2024–2025, all different);
//              total_paid = quantity × the hidden price × the sale's discount in the public data (rounded to cents)
// Every column the public data keeps free of ties stays free of ties.
//
// FILES (both PRIVATE, git-ignored under tools/comp/private/):
//   hidden-seed.txt   the seed; created at random on the first run. Keep it: the same seed gives the same dataset.
//   hidden-setup.sql  the result (CREATE TABLE + INSERT, Oracle text, same layout as the public setup).
//
//   cd tools && node comp-hidden.mjs                 (re)write the hidden setup of every database from its seed
//   cd tools && node comp-hidden.mjs --db f1         one database
//   cd tools && node comp-hidden.mjs --check         exit 1 when a hidden setup is not what its seed gives
//
// SEVERAL DATABASES (docs/game-quiz.md §16): the shop (above) and the others of DBS below. Another database <key> has
//   data/game-comp-db-<key>.js                  its public setup (GAME_COMP_DBS.<key>)
//   tools/comp-hidden/<key>.mjs                 export function hiddenSetup(publicSetup, seedText, H): its own
//                                               perturbation, written with the helpers H (HELPERS below)
//   tools/comp/private/<key>/hidden-seed.txt    its seed, and hidden-setup.sql its result (both private)
// Then: node comp-build.mjs (validates every question on both datasets) and node comp-upload.mjs (uploads it).
//
// The teacher's deploy, step by step (region, SMTP, email code, login, link, db push, functions deploy, auth hook,
// upload, teacher role, anon key): supabase/README-deploy.md.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const require = createRequire(import.meta.url);
export const PRIVATE_DIR = join(HERE, 'comp/private');
export const SEED_FILE = join(PRIVATE_DIR, 'hidden-seed.txt');
export const HIDDEN_FILE = join(PRIVATE_DIR, 'hidden-setup.sql');
// The competitive databases (§16): the shop keeps the original paths; every other one keeps its files in a folder.
export const DBS = ['shop', 'f1', 'fashion', 'bank', 'law'];
export const dbDir = (db = 'shop') => (db === 'shop' ? PRIVATE_DIR : join(PRIVATE_DIR, db));
export const seedFile = (db = 'shop') => join(dbDir(db), 'hidden-seed.txt');
export const hiddenFile = (db = 'shop') => join(dbDir(db), 'hidden-setup.sql');
export const dbFile = (db) => join(ROOT, `data/game-comp-db-${db}.js`);
/* The public definition of a database ({ key, name, setup, schema, types, join }), or null when it has no file yet. */
export function dbDef(db = 'shop') {
  const f = dbFile(db);
  return existsSync(f) ? require(f) : null;
}
export const availableDbs = () => DBS.filter((d) => existsSync(dbFile(d)));
const rel = (f) => `tools/${f.slice(HERE.length + 1).split('\\').join('/')}`;

/* ---- Parsing the public INSERT lines ---------------------------------------------------------- */

function parseValues(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    while (s[i] === ' ' || s[i] === ',') i++;
    if (i >= s.length) break;
    if (s.startsWith("DATE '", i)) { const j = s.indexOf("'", i + 6); out.push({ date: s.slice(i + 6, j) }); i = j + 1; continue; }
    if (s[i] === "'") {
      let j = i + 1;
      let v = '';
      for (; j < s.length; j++) {
        if (s[j] === "'" && s[j + 1] === "'") { v += "'"; j++; } else if (s[j] === "'") break; else v += s[j];
      }
      out.push(v);
      i = j + 1;
      continue;
    }
    const m = /^[^,]+/.exec(s.slice(i));
    const tok = m[0].trim();
    out.push(tok === 'NULL' ? null : Number(tok));
    i += m[0].length;
  }
  return out;
}

/* { head (every line but the INSERTs), rows: { table: [[values…]] } } with the tables in the order they are filled.
   Each INSERT is one line: INSERT INTO t VALUES (…); values are numbers, 'text', DATE 'YYYY-MM-DD' ({date}) or NULL. */
export function parseSetup(setup) {
  const lines = setup.split('\n');
  const head = lines.filter((l) => !/^INSERT INTO/.test(l)).join('\n');
  const rows = {};
  lines.filter((l) => /^INSERT INTO/.test(l)).forEach((l) => {
    const m = /^INSERT INTO (\w+) VALUES \((.*)\);?$/.exec(l);
    if (!m) throw new Error(`each INSERT must be one line, INSERT INTO t VALUES (…): ${l.slice(0, 80)}`);
    (rows[m[1]] = rows[m[1]] || []).push(parseValues(m[2]));
  });
  return { head, rows };
}

const lit = (v) => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : v && v.date ? `DATE '${v.date}'` : `'${String(v).replace(/'/g, "''")}'`);
/* The setup text again, the tables in the key order of `rows` (keep parseSetup's order: the foreign keys need it). */
export function writeSetup(head, rows) {
  const ins = Object.keys(rows).flatMap((t) => rows[t].map((r) => `INSERT INTO ${t} VALUES (${r.map(lit).join(', ')});`));
  return `${head.replace(/\s+$/, '')}\n${ins.join('\n')}`.replace(/;$/, '');
}

/* ---- Seeded randomness ---------------------------------------------------------------------- */

function rngFrom(seedText) {
  const h = createHash('sha256').update(String(seedText).trim()).digest();
  let a = h.readUInt32LE(0);
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = (r, xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// A shuffle that moves every value it can (no position keeps its public value, unless all values are equal).
function derange(r, xs) {
  for (let k = 0; k < 200; k++) {
    const a = shuffle(r, xs);
    if (a.every((v, i) => JSON.stringify(v) !== JSON.stringify(xs[i]) || xs.every((x) => JSON.stringify(x) === JSON.stringify(v)))) return a;
  }
  return shuffle(r, xs);
}
const DAY = 86400000;
const toDay = (s) => Date.parse(`${s}T00:00:00Z`);
const fromDay = (n) => new Date(n).toISOString().slice(0, 10);
const round2 = (x) => Math.round(x * 100) / 100;

/* ---- The hidden dataset -------------------------------------------------------------------------- */

export function hiddenSetup(publicSetup, seedText) {
  const r = rngFrom(seedText);
  const { head, rows } = parseSetup(publicSetup);
  const C = rows.customers.map((x) => [...x]);   // customer_id, name, country, signup_date, vip_level
  const G = rows.games.map((x) => [...x]);       // game_id, title, genre, price, stock, rating
  const S = rows.sales.map((x) => [...x]);       // sale_id, customer_id, game_id, sale_date, quantity, total_paid

  // Games.
  const genres = derange(r, G.map((g) => g[2]));
  const stocks = derange(r, G.map((g) => g[4]));
  const ratings = derange(r, G.map((g) => g[5]));
  const pubPrice = new Map(G.map((g) => [g[0], g[3]]));
  const prices = derange(r, G.map((g) => g[3]));
  const usedP = new Set();
  G.forEach((g, i) => {
    g[2] = genres[i];
    g[4] = stocks[i];
    g[5] = ratings[i];
    let p;
    for (let k = 0; k < 50; k++) {
      const d = (1 + Math.floor(r() * 3)) * (r() < 0.5 ? -1 : 1);
      p = round2(prices[i] + d);
      if (p >= 2 && p < 100 && !usedP.has(p) && p !== pubPrice.get(g[0])) break;
    }
    usedP.add(p);
    g[3] = p;
  });
  const price = new Map(G.map((g) => [g[0], g[3]]));

  // Sales: quantities and dates shuffled; totals recomputed with the public discount of the sale.
  const qty = derange(r, S.map((s) => s[4]));
  const dates = derange(r, S.map((s) => s[3].date));
  const usedD = new Set();
  const lo = toDay('2024-01-02');
  const hi = toDay('2025-12-30');
  S.forEach((s, i) => {
    const disc = s[5] / (s[4] * pubPrice.get(s[2]));
    let d;
    for (let k = 0; k < 50; k++) {
      d = Math.min(hi, Math.max(lo, toDay(dates[i]) + (Math.floor(r() * 19) - 9) * DAY));
      if (!usedD.has(d)) break;
    }
    usedD.add(d);
    s[3] = { date: fromDay(d) };
    s[4] = qty[i];
    s[5] = round2(s[4] * price.get(s[2]) * (Math.abs(disc - 1) < 0.005 ? 1 : disc));
  });

  // Customers: country and VIP level shuffled; signed up 2–14 months before the first purchase (or, with no
  // purchase, at a random day of 2023–2025), every date different.
  const countries = derange(r, C.map((c) => c[2]));
  const vips = derange(r, C.map((c) => c[4]));
  const usedS = new Set();
  C.forEach((c, i) => {
    c[2] = countries[i];
    c[4] = vips[i];
    const firsts = S.filter((s) => s[1] === c[0]).map((s) => toDay(s[3].date));
    let d;
    for (let k = 0; k < 50; k++) {
      d = firsts.length ? Math.min(...firsts) - (60 + Math.floor(r() * 365)) * DAY : toDay('2023-01-10') + Math.floor(r() * 990) * DAY;
      if (!usedS.has(d)) break;
    }
    usedS.add(d);
    c[3] = { date: fromDay(d) };
  });
  return writeSetup(head, { customers: C, games: G, sales: S });
}

export function readSeed({ create = false, db = 'shop' } = {}) {
  const f = seedFile(db);
  if (existsSync(f)) return readFileSync(f, 'utf8').trim();
  if (!create) return null;
  mkdirSync(dbDir(db), { recursive: true });
  const seed = randomBytes(16).toString('hex');
  writeFileSync(f, `${seed}\n`);
  console.log(`created ${rel(f)} (keep it: it is in the encrypted backup too)`);
  return seed;
}

export function publicSetup(db = 'shop') {
  if (db === 'shop') return require(join(ROOT, 'data/game-bank.js')).setup;
  const d = dbDef(db);
  if (!d) throw new Error(`no public database file data/game-comp-db-${db}.js`);
  return d.setup;
}

/* The hidden setup on disk (null when it was never generated). */
export function readHidden(db = 'shop') {
  const f = hiddenFile(db);
  return existsSync(f) ? readFileSync(f, 'utf8') : null;
}

// What a database's own generator (tools/comp-hidden/<key>.mjs) receives as H.
export const HELPERS = { parseSetup, writeSetup, parseValues, rngFrom, shuffle, derange, DAY, toDay, fromDay, round2 };

/* The hidden setup that a database's seed gives. */
export async function hiddenSetupOf(db, seed) {
  if (db === 'shop') return hiddenSetup(publicSetup('shop'), seed);
  const f = join(HERE, 'comp-hidden', `${db}.mjs`);
  if (!existsSync(f)) throw new Error(`no generator ${rel(f)} for the hidden dataset of ${db}`);
  const mod = await import(pathToFileURL(f).href);
  return mod.hiddenSetup(publicSetup(db), seed, HELPERS);
}

async function main(argv) {
  const i = argv.indexOf('--db');
  const only = i >= 0 ? argv[i + 1] : null;
  if (only && !DBS.includes(only)) { console.log(`unknown database ${only}: ${DBS.join(', ')}`); return 1; }
  const check = argv.includes('--check');
  let failed = 0;
  for (const db of only ? [only] : availableDbs()) {
    const seed = readSeed({ create: !check, db });
    if (!seed) { console.log(`FAIL ${db}: no ${rel(seedFile(db))}`); failed++; continue; }
    const text = await hiddenSetupOf(db, seed);
    if (check) {
      const ok = readHidden(db) === text;
      console.log(ok ? `ok   ${db}: ${rel(hiddenFile(db))} is the dataset of the seed` : `FAIL ${db}: ${rel(hiddenFile(db))} differs from what the seed gives (node comp-hidden.mjs --db ${db})`);
      if (!ok) failed++;
      continue;
    }
    writeFileSync(hiddenFile(db), text);
    console.log(`wrote ${rel(hiddenFile(db))} (${text.split('\n').filter((l) => l.startsWith('INSERT')).length} rows)`);
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
}
