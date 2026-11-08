// Validates the competitive bank (docs/game-quiz.md §15.4–§15.5) with the SAME engine the server grades with
// (supabase/functions/_shared/engine.js on sql.js, js/oracle-dialect.js, js/game-core.js), on the public dataset
// and on the hidden one, and prepares the rows tools/comp-upload.mjs sends to Supabase. Nothing public is written:
// since round 7 the questions, solutions and texts live only in tools/comp/private/ and on the server.
//
// FILES (all PRIVATE, git-ignored under tools/comp/private/)
//   <mode>.json                 { "_about", "questions": [ { id, ordered?, checks?, clause:[…], template, solution,
//                               traps:[…], alts:[…], hidden_traps?:[…], main_only?, level? } ] }  (a bare array works too)
//   texts/{en,es}-<mode>.js     { id: { prompt, clause, templateNote } } merged into DATA.<lang>.GAME_TEXT.compQuestions
//   hidden-seed.txt, hidden-setup.sql   the hidden dataset (tools/comp-hidden.mjs)
//   tools/comp/solutions.enc    (committed) all of the above, encrypted: AES-256-GCM, key = scrypt(COMP_KEY)
//
// For every question, on BOTH datasets (the hidden one is skipped for a question marked main_only):
//   the solution is accepted (checkAnswer, unsafe, oracleCheck), runs, gives rows / changes something, and gives the
//   same result on the database built with the INSERTs reversed (deterministic); the traps grade wrong; the alts
//   grade right; the hidden_traps (answers right on the public data only, such as a hard-coded id list) grade wrong; the template is an answer of the mode that does not grade right; the texts exist in EN and ES.
// A question that only fails on the hidden dataset (an empty result there, an alt that is right only on the public
// data, a result that depends on the insert order there…) is a main_only candidate: it is listed, and --mark
// writes "main_only": true into its private file. A question that needs rewording is listed for its author.
//
//   cd tools && node comp-build.mjs                    validate everything, print the report (exit 1 on a problem)
//   cd tools && node comp-build.mjs --mode select      one mode
//   cd tools && node comp-build.mjs --mark             also set main_only on the candidates (private files)
//   node comp-build.mjs --new-key                                 prints a strong random COMP_KEY once (password manager!)
//   COMP_KEY='<passphrase>' node comp-build.mjs --encrypt          private files → tools/comp/solutions.enc (commit it);
//                                                                  COMP_KEY: 20+ characters, 3 of a-z A-Z 0-9 symbols
//   COMP_KEY='<passphrase>' node comp-build.mjs --decrypt [--force] solutions.enc → private files (another machine)
//   (PowerShell: $env:COMP_KEY='<passphrase>'; node comp-build.mjs --encrypt)
// Then: node comp-upload.mjs (see its header and supabase/README-deploy.md).
//
// The teacher's deploy, step by step (region, SMTP, email code, login, link, db push, functions deploy, auth hook,
// upload, teacher role, anon key): supabase/README-deploy.md.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash, randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { makeEngine } from '../supabase/functions/_shared/engine.js';
import { readHidden, HIDDEN_FILE } from './comp-hidden.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const require = createRequire(import.meta.url);
export const MODES = ['select', 'insert', 'update', 'delete', 'ddl'];
export const PREFIX = { select: 'cs', insert: 'ci', update: 'cu', delete: 'cd', ddl: 'ck' };
export const PRIVATE_DIR = join(HERE, 'comp/private');
export const TEXT_DIR = join(PRIVATE_DIR, 'texts');
export const ENC_FILE = join(HERE, 'comp/solutions.enc');
const privateFile = (mode) => join(PRIVATE_DIR, `${mode}.json`);

/* ---- Private files ------------------------------------------------------------------------------ */

export function readPrivate(mode) {
  const f = privateFile(mode);
  if (!existsSync(f)) return null;
  const j = JSON.parse(readFileSync(f, 'utf8'));
  return Array.isArray(j) ? j : j.questions || [];
}

/* { en: { id: {prompt, clause, templateNote} }, es: {…} } for the modes whose text files exist. */
export function readTexts(modes = MODES) {
  const ctx = { DATA: { en: { GAME_TEXT: {} }, es: { GAME_TEXT: {} } } };
  vm.createContext(ctx);
  ['en', 'es'].forEach((l) => modes.forEach((m) => {
    const f = join(TEXT_DIR, `${l}-${m}.js`);
    if (existsSync(f)) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
  }));
  return { en: ctx.DATA.en.GAME_TEXT.compQuestions || {}, es: ctx.DATA.es.GAME_TEXT.compQuestions || {} };
}

/* ---- The engine (the server's, on Node) --------------------------------------------------------------- */

let ENGINE = null;
export async function engine() {
  if (ENGINE) return ENGINE;
  const O = require(join(ROOT, 'js/oracle-dialect.js'));
  const G = require(join(ROOT, 'js/game-core.js'));
  const BANK = require(join(ROOT, 'data/game-bank.js'));
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs({ locateFile: (f) => join(HERE, 'node_modules/sql.js/dist', f) });
  const E = makeEngine({ SQL, O, G, schema: BANK.schema });
  const reversed = (setup) => {
    const lines = setup.split('\n');
    const head = lines.filter((l) => !/^INSERT INTO/.test(l));
    const byTable = {};
    lines.filter((l) => /^INSERT INTO/.test(l)).forEach((l) => { const tb = /^INSERT INTO (\w+)/.exec(l)[1]; (byTable[tb] = byTable[tb] || []).push(l.replace(/;?$/, ';')); });
    return [...head, ...Object.values(byTable).flatMap((ls) => [...ls].reverse())].join('\n').replace(/;$/, '');
  };
  ENGINE = { O, G, BANK, SQL, E, reversed, MAIN: BANK.setup, HIDDEN: readHidden() };
  return ENGINE;
}

/* The server's question row from a private item and its texts. */
export function rowOf(mode, p, tx) {
  const m = new RegExp(`^${PREFIX[mode]}(\\d{2})[ab]$`).exec(String(p.id || ''));
  const t = { en: (tx.en || {})[p.id] || {}, es: (tx.es || {})[p.id] || {} };
  return {
    id: p.id, mode, level: p.level === undefined ? (m ? +m[1] : 0) : p.level,
    prompt_en: t.en.prompt || '', prompt_es: t.es.prompt || '', clause_en: t.en.clause || '', clause_es: t.es.clause || '',
    template: p.template || '', template_note_en: t.en.templateNote || '', template_note_es: t.es.templateNote || '',
    ordered: mode === 'select' ? !!p.ordered : false,
    checks: mode === 'select' ? null : (Array.isArray(p.checks) ? p.checks : null),
    keywords: Array.isArray(p.clause) ? p.clause : [],
    solution: p.solution || '', traps: Array.isArray(p.traps) ? p.traps : [], alts: Array.isArray(p.alts) ? p.alts : [],
    hidden_traps: Array.isArray(p.hidden_traps) ? p.hidden_traps : [],
    main_only: !!p.main_only,
  };
}

/* ---- Validation of one mode ----------------------------------------------------------------------- */

/* Returns { mode, rows, problems, notes, candidates: [{ id, why }] (main_only), reword: [{ id, why }] }. */
export async function buildMode(mode, { texts = null } = {}) {
  const X = await engine();
  const { G, E, MAIN, HIDDEN } = X;
  const tx = texts || readTexts([mode]);
  const problems = [];
  const notes = [];
  const candidates = [];
  const reword = [];
  const items = readPrivate(mode);
  if (!items) return { mode, rows: [], problems: [`no private file ${privateFile(mode)}`], notes, candidates, reword };
  if (!HIDDEN) problems.push(`no hidden dataset (${HIDDEN_FILE}): run node comp-hidden.mjs`);
  const re = new RegExp(`^${PREFIX[mode]}(\\d{2})[ab]$`);
  const seen = new Set();
  const rows = [];
  for (const p of items) {
    const bad = (msg) => problems.push(`[${p.id || '?'}] ${msg}`);
    const m = re.exec(String(p.id || ''));
    if (!m) { bad(`id must be ${PREFIX[mode]}NN(a|b)`); continue; }
    if (seen.has(p.id)) { bad('duplicate id'); continue; }
    seen.add(p.id);
    const q = rowOf(mode, p, tx);
    const start = problems.length;
    if (q.level !== +m[1] || q.level < 1 || q.level > 15) bad(`level ${q.level} does not match the id`);
    for (const f of ['solution', 'template']) if (typeof p[f] !== 'string' || !p[f].trim()) bad(`${f} is missing`);
    if (!q.keywords.length) bad('clause: a list of keywords is missing');
    if (!q.traps.length) bad('traps: at least one is needed');
    if (p.alts !== undefined && !Array.isArray(p.alts)) bad('alts must be a list');
    if (mode === 'ddl' && !(Array.isArray(p.checks) && p.checks.length)) bad('a DDL question needs its own checks (probes)');
    if (mode !== 'select' && p.checks !== undefined && p.checks !== null && !Array.isArray(p.checks)) bad('checks must be null or a list');
    for (const l of ['en', 'es']) for (const f of ['prompt', 'clause', 'templateNote']) if (!String(((tx[l] || {})[p.id] || {})[f] || '').trim()) bad(`text ${l}.${f} is missing (tools/comp/private/texts/${l}-${mode}.js)`);
    if (problems.length > start) continue;

    // 1. The solution is an answer the server accepts.
    const ref = E.refusal(q, q.solution);
    if (ref) { bad(`solution refused: ${ref.reason} ${JSON.stringify(ref.detail || '')}`); continue; }
    if (/;\s*$/.test(q.solution)) bad('solution: no final ;');
    q.keywords.forEach((c) => { if (!new RegExp(`\\b${c.trim().split(/\s+/).join('\\s+')}\\b`, 'i').test(q.solution)) bad(`clause ${c} is not in the solution`); });
    const probes = E.probesOf(q);
    probes.forEach((pr, i) => { if (G.unsafe(pr) || X.O.script(pr).some((u) => u.unsupported)) bad(`probe ${i + 1} cannot run in the sandbox`); });

    // 2. On each dataset: it runs, means something, and is deterministic.
    const onData = (setup) => {
      const issues = [];
      const res = mode === 'select' ? E.execute(setup, q.solution) : E.executeChecks(setup, q.solution, probes);
      if (res.error) return { issues: [`the solution fails: ${res.error.code || ''} ${res.error.text}`], res };
      if (mode === 'select') {
        if (!res.rows.length) issues.push('the solution returns no rows');
        const rev = E.execute(X.reversed(setup), q.solution);
        if (rev.error || !G.grade(rev, res, q.ordered).ok) issues.push('not deterministic: another result when the rows are inserted in reverse order');
      } else {
        if (mode !== 'ddl' && !(res.changes >= 1)) issues.push('the solution modifies no row');
        const base = E.executeChecks(setup, '', probes);
        if (G.gradeChecks(res, base).ok) issues.push('the solution changes nothing the probes see');
        const rev = E.executeChecks(X.reversed(setup), q.solution, probes);
        if (!G.gradeChecks(rev, res).ok) issues.push('not deterministic: another result when the rows are inserted in reverse order');
      }
      return { issues, res };
    };
    const onMain = onData(MAIN);
    onMain.issues.forEach((x) => bad(`public dataset: ${x}`));
    if (onMain.res.error) continue;
    if (mode === 'select' && onMain.res.rows.length > 12) notes.push(`[${p.id}] ${onMain.res.rows.length} rows (prefer 1–8)`);
    let hiddenWhy = [];
    let hiddenOk = false;
    if (HIDDEN) {
      const onHidden = onData(HIDDEN);
      hiddenOk = !onHidden.res.error;
      hiddenWhy = onHidden.issues.map((x) => `hidden dataset: ${x}`);
      if (!onHidden.res.error && !hiddenWhy.length) {
        const same = mode === 'select' ? G.grade(onHidden.res, onMain.res, q.ordered).ok : G.gradeChecks(onHidden.res, onMain.res).ok;
        if (same) notes.push(`[${p.id}] same result on both datasets: a hard-coded answer is not caught by the hidden one`);
      }
    }

    // 3. Traps wrong, alts right, template not right; each graded on both datasets as the server does.
    const both = (sql, only) => E.judge({ ...q, main_only: only }, sql, { main: MAIN, hidden: HIDDEN });
    for (const [i, t] of q.traps.entries()) {
      const c = G.checkAnswer(t, mode);
      if (!c.ok) { bad(`trap ${i + 1} is refused by checkAnswer (${c.reason}): a trap must be a plausible answer`); continue; }
      const j = both(t, true);
      if (j.refusal) { bad(`trap ${i + 1} is refused (${j.refusal.reason}): a trap must be a plausible answer`); continue; }
      if (j.ok) bad(`trap ${i + 1} grades RIGHT on the public dataset`);
      else if (HIDDEN && hiddenOk && !q.main_only) {
        const h = E.judge({ ...q, main_only: true }, t, { main: HIDDEN });   // the hidden dataset alone
        if (h.ok) notes.push(`[${p.id}] trap ${i + 1} is right on the hidden dataset (it does not tell them apart there)`);
      }
    }
    for (const [i, a] of q.alts.entries()) {
      const j = both(a, true);
      if (j.refusal) { bad(`alt ${i + 1} is refused (${j.refusal.reason} ${JSON.stringify(j.refusal.detail || '')})`); continue; }
      if (!j.ok) { bad(`alt ${i + 1} grades wrong on the public dataset (${j.main.reason})`); continue; }
      if (HIDDEN && hiddenOk) {
        const h = both(a, false);
        if (!h.ok) hiddenWhy.push(`hidden dataset: alt ${i + 1} grades wrong there (${h.hidden ? h.hidden.reason : 'error'})`);
      }
    }
    // Hidden traps: right on the public data only (hard-coded ids, a lucky equivalent filter…): wrong on both.
    if (q.hidden_traps.length && q.main_only) bad('hidden_traps on a main_only question: they could never be caught');
    for (const [i, t] of (HIDDEN && hiddenOk ? q.hidden_traps : []).entries()) {
      const j = both(t, false);
      if (j.refusal) { bad(`hidden trap ${i + 1} is refused (${j.refusal.reason}): it must be a plausible answer`); continue; }
      if (!j.main.ok) notes.push(`[${p.id}] hidden trap ${i + 1} is already wrong on the public dataset (a plain trap)`);
      if (j.ok) bad(`hidden trap ${i + 1} grades RIGHT on both datasets`);
    }
    const tc = G.checkAnswer(q.template, mode);
    if (!tc.ok) bad(`template refused by checkAnswer (${tc.reason})`);
    else {
      const tj = both(q.template, true);
      if (!tj.refusal && tj.error && mode === 'select') bad(`template fails: ${tj.error.code || tj.error.text}`);
      if (tj.ok) bad('template grades right: it gives the answer away');
    }
    if (q.template.replace(/\s+/g, ' ').trim() === q.solution.replace(/\s+/g, ' ').trim()) bad('template is the solution');

    // 4. Hidden-dataset issues: fine when main_only, else a candidate (or, when even main_only cannot help, reword).
    if (hiddenWhy.length && !q.main_only) {
      candidates.push({ id: p.id, why: hiddenWhy.join('; ') });
      bad(`${hiddenWhy.join('; ')} → main_only candidate (node comp-build.mjs --mark), or reword it`);
    }
    if (q.main_only) notes.push(`[${p.id}] main_only: graded on the public dataset only`);
    if (problems.length === start) rows.push(q);
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  return { mode, rows, problems, notes, candidates, reword };
}

/* Everything comp-upload.mjs sends: { rows, meta: { version, main_setup, hidden_setup, schema }, problems }. */
export async function collect(modes = MODES) {
  const X = await engine();
  const texts = readTexts(modes);
  const out = { rows: [], problems: [], notes: [] };
  for (const m of modes) {
    const r = await buildMode(m, { texts });
    out.rows.push(...r.rows);
    out.problems.push(...r.problems.map((x) => `${m} ${x}`));
    out.notes.push(...r.notes.map((x) => `${m} ${x}`));
  }
  const version = createHash('sha256').update(JSON.stringify([out.rows, X.MAIN, X.HIDDEN, X.BANK.schema])).digest('hex').slice(0, 16);
  out.meta = { version, main_setup: X.MAIN, hidden_setup: X.HIDDEN, schema: X.BANK.schema };
  return out;
}

/* Writes "main_only": true into the private file for these ids (keeps the file's layout as JSON with 2 spaces). */
function markMainOnly(mode, ids) {
  const f = privateFile(mode);
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const qs = Array.isArray(j) ? j : j.questions;
  qs.forEach((q) => { if (ids.includes(q.id)) q.main_only = true; });
  writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
}

/* ---- Encryption of the private files (AES-256-GCM, scrypt) ------------------------------------------ */

// scrypt N = 2^17, r = 8: about 128 MB and a fraction of a second per guess (older backups keep their own N).
const KDF = { N: 2 ** 17, r: 8, p: 1, maxmem: 512 * 1024 * 1024 };
/* A passphrase strong enough for a file that is public on GitHub: 20 characters or more, with at least three of
   lower case, upper case, digits and symbols. Returns the reason it is not, or null. */
export function weakKey(k) {
  const s = String(k || '');
  if (s.length < 20) return 'COMP_KEY must have 20 characters or more';
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(s)).length;
  return classes < 3 ? 'COMP_KEY must mix at least three of: lower case, upper case, digits, symbols' : null;
}
export const newKey = () => `${randomBytes(18).toString('base64url')}-${randomBytes(6).toString('hex').toUpperCase()}`;
export function encryptBundle(bundle, passphrase) {
  const weak = weakKey(passphrase);
  if (weak) throw new Error(`${weak} (or run: node comp-build.mjs --new-key, and keep it in a password manager)`);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(String(passphrase), salt, 32, KDF);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([c.update(JSON.stringify(bundle), 'utf8'), c.final()]);
  return JSON.stringify({ v: 1, alg: 'aes-256-gcm', kdf: 'scrypt', N: KDF.N, r: KDF.r, p: KDF.p, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') }, null, 1);
}
export function decryptBundle(text, passphrase) {
  const e = JSON.parse(text);
  const key = scryptSync(String(passphrase), Buffer.from(e.salt, 'base64'), 32, { N: e.N, r: e.r, p: e.p, maxmem: KDF.maxmem });
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(e.iv, 'base64'));
  d.setAuthTag(Buffer.from(e.tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(e.data, 'base64')), d.final()]).toString('utf8'));
}
// The private files besides <mode>.json that the backup carries (paths relative to tools/comp/private/).
function extraFiles() {
  const out = {};
  ['hidden-seed.txt', 'hidden-setup.sql'].forEach((f) => { if (existsSync(join(PRIVATE_DIR, f))) out[f] = readFileSync(join(PRIVATE_DIR, f), 'utf8'); });
  if (existsSync(TEXT_DIR)) readdirSync(TEXT_DIR).filter((f) => /^(en|es)-\w+\.js$/.test(f)).forEach((f) => { out[`texts/${f}`] = readFileSync(join(TEXT_DIR, f), 'utf8'); });
  return out;
}

/* ---- CLI ---------------------------------------------------------------------------------------- */

async function main(argv) {
  const has = (f) => argv.includes(f);
  const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
  if (has('--new-key')) {
    console.log(`A new COMP_KEY (shown once: store it in a password manager now, then use it for --encrypt / --decrypt):
${newKey()}`);
    return 0;
  }
  if (has('--encrypt')) {
    const bundle = { v: 2, modes: {}, files: extraFiles() };
    MODES.forEach((m) => { if (existsSync(privateFile(m))) bundle.modes[m] = readFileSync(privateFile(m), 'utf8'); });
    if (!Object.keys(bundle.modes).length) { console.log('no private files to encrypt'); return 1; }
    writeFileSync(ENC_FILE, encryptBundle(bundle, process.env.COMP_KEY));
    console.log(`encrypted ${Object.keys(bundle.modes).join(', ')} + ${Object.keys(bundle.files).length} other file(s) → tools/comp/solutions.enc`);
    return 0;
  }
  if (has('--decrypt')) {
    const bundle = decryptBundle(readFileSync(ENC_FILE, 'utf8'), process.env.COMP_KEY);
    mkdirSync(TEXT_DIR, { recursive: true });
    const all = { ...Object.fromEntries(Object.entries(bundle.modes).map(([m, t]) => [`${m}.json`, t])), ...(bundle.files || {}) };
    for (const [rel, text] of Object.entries(all)) {
      const f = join(PRIVATE_DIR, rel);
      if (existsSync(f) && !has('--force')) { console.log(`kept ${rel} (exists; --force overwrites)`); continue; }
      writeFileSync(f, text);
      console.log(`wrote tools/comp/private/${rel}`);
    }
    return 0;
  }
  const only = val('--mode');
  if (only && !MODES.includes(only)) { console.log(`unknown mode ${only}: ${MODES.join(', ')}`); return 1; }
  const modes = only ? [only] : MODES.filter((m) => existsSync(privateFile(m)));
  const texts = readTexts(modes);
  let failed = 0;
  const allCand = [];
  for (const m of modes) {
    const r = await buildMode(m, { texts });
    r.notes.forEach((n) => console.log(`note ${m} ${n}`));
    if (has('--mark') && r.candidates.length) {
      markMainOnly(m, r.candidates.map((c) => c.id));
      r.candidates.forEach((c) => console.log(`MARK ${m} [${c.id}] main_only (${c.why})`));
      const again = await buildMode(m, { texts });
      again.problems.forEach((p) => console.log(`FAIL ${m} ${p}`));
      failed += again.problems.length;
      console.log(`${m}: ${again.rows.length} question(s) ok, ${again.problems.length} problem(s) after marking`);
      allCand.push(...r.candidates.map((c) => ({ mode: m, ...c })));
      continue;
    }
    r.problems.forEach((p) => console.log(`FAIL ${m} ${p}`));
    failed += r.problems.length;
    allCand.push(...r.candidates.map((c) => ({ mode: m, ...c })));
    console.log(`${m}: ${r.rows.length} question(s) ok${r.problems.length ? `, ${r.problems.length} problem(s)` : ''}`);
  }
  if (allCand.length) console.log(`\nmain_only candidates (${allCand.length}): ${allCand.map((c) => c.id).join(', ')}`);
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(e); process.exit(1); });
}
