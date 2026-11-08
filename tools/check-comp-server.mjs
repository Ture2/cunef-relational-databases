// Checks the competitive server (docs/game-quiz.md §15).
//
// PART 1, Node only (always): the grading engine the Edge Function uses (supabase/functions/_shared/engine.js with
// js/oracle-dialect.js, js/game-core.js and sql.js), on the public AND the hidden dataset, for all 150 questions of
// the private bank: every solution right, every trap wrong, every alt right, every hidden trap wrong; a hard-coded
// literal answer (the public reference written out as literals / ids) right on the public data and wrong on the
// hidden one wherever the hidden reference differs; refusals, flags, shapes, Review codes; the game transitions; the
// synced copies in supabase/functions/_shared match js/.
//
// PART 2, end to end against the LOCAL stack (with --e2e; needs `npx supabase start --workdir ..` and Docker):
// uploads the bank (comp-upload --local), creates users through the local auth admin API and one through the
// email code (Mailpit), and checks RLS, the @cunef.edu hook, the daily limit, expiry, the rate limit, teacher-only
// ops, test attempts, a won attempt giving a badge and a lost one not, and that no student response ever contains
// a solution (compared with the private files).
//
//   cd tools && node check-comp-server.mjs            part 1
//   cd tools && node check-comp-server.mjs --e2e      parts 1 and 2 (VERBOSE=1 prints the passing checks)
//
// The teacher's deploy, step by step (region, SMTP, email code, login, link, db push, functions deploy, auth hook,
// upload, teacher role, anon key): supabase/README-deploy.md.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { engine, readTexts, readPrivate, rowOf, MODES } from './comp-build.mjs';
import { compare as compareCopies } from './supabase-sync.mjs';
import { localStack, upload } from './comp-upload.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const E2E = process.argv.includes('--e2e');
let bad = 0;
let good = 0;
const expect = (ok, what) => {
  if (ok) good++; else bad++;
  if (!ok || process.env.VERBOSE) console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  return ok;
};
const section = (n) => console.log(`\n## ${n}`);

const X = await engine();
const { G, E, MAIN, HIDDEN } = X;
const texts = readTexts();
const Q = new Map();
MODES.forEach((m) => (readPrivate(m) || []).forEach((p) => Q.set(p.id, rowOf(m, p, texts))));

/* ---- 1. Copies --------------------------------------------------------------------------------- */
section('Synced engine copies');
compareCopies().forEach((c) => expect(c.ok, `${c.file} equals its original (node supabase-sync.mjs)`));
expect(!!HIDDEN, 'the hidden dataset exists (node comp-hidden.mjs)');

/* ---- 2. The bank on both datasets ------------------------------------------------------------------ */
section('Bank: 150 questions on both datasets');
expect(Q.size === 150, `150 questions (${Q.size})`);
MODES.forEach((m) => expect([...Q.values()].filter((q) => q.mode === m).length === 30, `[${m}] 30 questions`));
const judge = (q, sql) => E.judge(q, sql, { main: MAIN, hidden: HIDDEN });
let nTraps = 0; let nAlts = 0; let nHidden = 0;
for (const q of Q.values()) {
  if (!q.main_only) {
    const h = q.mode === 'select' ? E.execute(HIDDEN, q.solution) : E.executeChecks(HIDDEN, q.solution, E.probesOf(q));
    expect(!h.error, `[${q.id}] the reference runs on the hidden dataset${h.error ? ` (${h.error.code || h.error.text})` : ''}`);
  }
  let s;
  try { s = judge(q, q.solution); } catch (e) { expect(false, `[${q.id}] grading throws: ${e.message}`); continue; }
  expect(s.ok && (q.main_only || (s.hidden && s.hidden.ok)), `[${q.id}] the solution is right${q.main_only ? ' (main_only)' : ' on both datasets'}`);
  q.traps.forEach((t, i) => { nTraps++; expect(!judge(q, t).ok, `[${q.id}] trap ${i + 1} is wrong`); });
  q.alts.forEach((a, i) => { nAlts++; const j = judge(q, a); expect(j.ok, `[${q.id}] alt ${i + 1} is right${j.refusal ? ` (refused: ${j.refusal.reason})` : ''}`); });
  q.hidden_traps.forEach((t, i) => { nHidden++; const j = judge(q, t); expect(j.main && j.main.ok && !j.ok, `[${q.id}] hidden trap ${i + 1}: right on the public data, wrong on the hidden data`); });
}
console.log(`${nTraps} traps, ${nAlts} alts, ${nHidden} hidden traps graded`);

/* ---- 3. Hard-coded literal answers ---------------------------------------------------------------- */
section('Hard-coded answers are caught by the hidden dataset');
const lit = (v) => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : /^\d{4}-\d{2}-\d{2}$/.test(v) ? `DATE '${v}'` : `'${String(v).replace(/'/g, "''")}'`);
const SNAP = G.defaultChecks({ mode: 'insert' });
const TABLES = ['customers', 'games', 'sales'];
const PK = { customers: 'customer_id', games: 'game_id', sales: 'sale_id' };
const COLS = X.BANK.schema;
function literalAnswer(q) {
  if (q.mode === 'select') {
    const r = E.execute(MAIN, q.solution);
    const sel = (row) => `SELECT ${row.map((v, i) => `${lit(v)} AS c${i + 1}`).join(', ')} FROM dual`;
    return `${r.rows.map(sel).join(' UNION ALL ')}${q.ordered ? ' ORDER BY 1' : ''}`.replace(/ ORDER BY 1$/, '');
  }
  if (q.mode === 'ddl') return null;
  const before = E.executeChecks(MAIN, '', SNAP);
  const after = E.executeChecks(MAIN, q.solution, SNAP);
  const out = [];
  const del = [];
  TABLES.forEach((t, i) => {
    const a = new Map(before.results[i].rows.map((r) => [r[0], r]));
    const b = new Map(after.results[i].rows.map((r) => [r[0], r]));
    a.forEach((row, k) => { if (!b.has(k)) del.push(`DELETE FROM ${t} WHERE ${PK[t]} = ${k}`); });
    b.forEach((row, k) => {
      if (!a.has(k)) out.push(`INSERT INTO ${t} VALUES (${row.map(lit).join(', ')})`);
      else if (JSON.stringify(row) !== JSON.stringify(a.get(k))) {
        const sets = COLS[t].map((c, j) => (JSON.stringify(row[j]) !== JSON.stringify(a.get(k)[j]) ? `${c} = ${lit(row[j])}` : null)).filter(Boolean);
        out.push(`UPDATE ${t} SET ${sets.join(', ')} WHERE ${PK[t]} = ${k}`);
      }
    });
  });
  // Children first when deleting (sales before games and customers); parents first when inserting.
  const ordered = [...del.filter((x) => / sales /.test(x)), ...del.filter((x) => !/ sales /.test(x)), ...out.filter((x) => /^INSERT INTO (customers|games)/.test(x)), ...out.filter((x) => !/^INSERT INTO (customers|games)/.test(x))];
  const kind = { insert: /^INSERT/, update: /^UPDATE/, delete: /^DELETE/ }[q.mode];
  return ordered.length && ordered.every((x) => kind.test(x)) ? ordered.join(';\n') : null;
}
// Does the hidden dataset change WHICH rows the reference touches (DML) or what it returns (select)? Then a
// hard-coded answer written from the public data must fail there.
function affected(q, setup) {
  const before = E.executeChecks(setup, '', SNAP);
  const after = E.executeChecks(setup, q.solution, SNAP);
  return TABLES.map((t, i) => {
    const a = new Map(before.results[i].rows.map((r) => [r[0], JSON.stringify(r)]));
    const b = new Map(after.results[i].rows.map((r) => [r[0], JSON.stringify(r)]));
    return [...new Set([...a.keys(), ...b.keys()])].filter((k) => a.get(k) !== b.get(k)).sort((x, y) => x - y).join(',');
  }).join('|');
}
const sensitive = (q) => (q.mode === 'select'
  ? !G.grade(E.execute(HIDDEN, q.solution), E.execute(MAIN, q.solution), q.ordered).ok
  : affected(q, HIDDEN) !== affected(q, MAIN));
let caught = 0; let exempt = 0; let skipped = 0;
for (const q of Q.values()) {
  const L = literalAnswer(q);
  if (!L) { skipped++; continue; }
  const j = judge(q, L);
  if (j.refusal || !j.main.ok) { skipped++; if (process.env.VERBOSE) console.log(`skip [${q.id}] literal answer not right on main (${j.refusal ? j.refusal.reason : j.main.reason})`); continue; }
  if (q.main_only || !sensitive(q)) { exempt++; if (!j.ok) caught++; continue; }
  if (expect(!j.ok, `[${q.id}] a hard-coded answer is wrong on the hidden dataset`)) caught++;
}
console.log(`hard-coded answers: ${caught} caught by the hidden dataset; ${exempt} questions where the hidden data does not change which rows the answer touches, or main_only (checked only where it does); ${skipped} not generated (DDL, or not expressible as literals)`);
// The id-list shortcut on value filters: a sample written by hand.
const idList = { cu06a: 'UPDATE games SET stock = stock + 8 WHERE game_id IN (7, 9)', cd11b: 'DELETE FROM sales WHERE game_id IN (1, 14)', cs02a: null };
Object.entries(idList).filter(([, s]) => s).forEach(([id, s]) => { const j = judge(Q.get(id), s); expect(j.main.ok && !j.ok, `[${id}] the id-list answer is right on the public data and wrong on the hidden data`); });

/* ---- 4. Refusals, flags, shape, Review ---------------------------------------------------------- */
section('Refusals, flags, shape, Review');
const qs = Q.get('cs05a') || [...Q.values()].find((q) => q.mode === 'select');
const qd = [...Q.values()].find((q) => q.mode === 'update');
const qk = [...Q.values()].find((q) => q.mode === 'ddl');
expect(E.refusal(qs, 'UPDATE games SET stock = 0').reason === 'wrong-kind', 'a statement of another kind is refused (wrong-kind)');
expect(E.refusal(qs, 'SELECT 1 FROM dual; SELECT 2 FROM dual').reason === 'many', 'two queries are refused in select mode (many)');
expect(E.refusal(qs, 'SELECT title FROM games LIMIT 3').reason === 'lint', 'LIMIT is refused (lint)');
expect(E.refusal(qs, 'SELECT genre, title FROM games GROUP BY genre').reason === 'oracle', 'a column outside GROUP BY is refused (oracle, ORA-00979)');
expect(E.refusal(qs, 'WITH r (n) AS (SELECT n FROM r) SELECT * FROM r').reason === 'unsupported', 'a recursive WITH is refused (unsupported)');
expect(E.refusal(qd, 'DELETE FROM games').reason === 'wrong-kind' && E.refusal(qd, 'DELETE FROM games').expected === 'UPDATE', 'in update mode a DELETE is refused, expecting UPDATE');
expect(E.refusal(qs, qs.solution) === null, 'the solution is not refused');
const fq = { ...qs, level: 7, keywords: ['GROUP BY'] };
const f1 = E.flags(fq, "SELECT 'x' FROM dual", { runs: 0, paste: 2, blur: 3 }, 30000);
expect(['fast', 'self:no-runs', 'self:pasted', 'self:left-tab', 'no-table', 'no-clause'].every((f) => f1.includes(f)), `flags: fast, no-table, no-clause (server) and self:no-runs, self:pasted, self:left-tab (page-reported) (${f1.join(' ')})`);
const f2 = E.flags(fq, 'SELECT genre, COUNT(*) FROM games WHERE game_id IN (1, 2, 3) GROUP BY genre', { runs: 3, paste: 0, blur: 0 }, 120000);
expect(f2.join() === 'literal-list', `flags: only literal-list for an IN list of 3 ids (${f2.join(' ')})`);
expect(E.flags({ ...qs, level: 3 }, qs.solution, { runs: 1 }, 1000).length === 0 || !E.flags({ ...qs, level: 3 }, qs.solution, { runs: 1 }, 1000).includes('fast'), 'fast is only flagged from rung 6');
// Bounded execution: heavy SQL is refused statically (GameCore.unsafe, so the page agrees) or stopped by the
// engine's limits (ticks per row read): refused at no cost, and never longer than a fraction of a second.
const qv = { id: 'ck01a', mode: 'ddl', level: 1, checks: ['SELECT * FROM v'], solution: 'CREATE VIEW v AS SELECT title FROM games', keywords: [], main_only: false };
const qn = { id: 'ci01a', mode: 'insert', level: 1, checks: null, solution: "INSERT INTO customers VALUES (101, 'X', 'Spain', DATE '2025-01-01', 0)", keywords: [], main_only: false };
const HEAVY = [
  [qs, 'SELECT COUNT(*) FROM sales a, sales b, sales c, sales d, sales e', 'static'],
  [qs, 'SELECT COUNT(*) FROM sales a JOIN sales b ON 1=1 JOIN sales c ON 1=1 JOIN sales d ON 1=1', 'static'],
  [qs, 'WITH "r"(x) AS (SELECT 1 FROM dual UNION ALL SELECT x+1 FROM "r") SELECT COUNT(*) FROM "r"', 'static'],
  [qs, 'SELECT COUNT(*) FROM dual CONNECT BY LEVEL <= 100000', 'static'],
  [qs, "SELECT LENGTH(zeroblob(1000000000)) FROM dual", 'static'],
  [qs, 'WITH t AS (SELECT a.sale_id FROM sales a, sales b, sales c) SELECT COUNT(*) FROM t x, t y', 'limit'],
  [qs, 'SELECT COUNT(*) FROM (SELECT a.sale_id FROM sales a, sales b) x, (SELECT a.sale_id FROM sales a, sales b) y, (SELECT a.sale_id FROM sales a, sales b) z', 'limit'],
  [qs, 'SELECT a.*, b.*, c.* FROM sales a, sales b, sales c', 'limit'],
  [qs, 'SELECT COUNT(*) FROM sales a WHERE EXISTS (SELECT 1 FROM sales b, sales c, sales d WHERE b.sale_id + c.sale_id + d.sale_id = a.sale_id * 1000)', 'limit'],
  [qv, 'CREATE VIEW v AS WITH t AS (SELECT a.sale_id FROM sales a, sales b, sales c) SELECT COUNT(*) AS n FROM t x, t y', 'limit'],
  [qn, "INSERT INTO customers SELECT a.sale_id * 10000 + b.sale_id * 100 + c.sale_id + 100000, 'x', 'y', DATE '2025-01-01', 0 FROM sales a, sales b, sales c", 'limit'],
];
for (const [hq, sql, how] of HEAVY) {
  const t0 = Date.now();
  let j;
  try { j = E.judge(hq, sql, { main: MAIN, hidden: HIDDEN }); } catch (e) { j = { threw: e.message }; }
  const ms = Date.now() - t0;
  expect(j.refusal && j.refusal.reason === 'unsupported' && ms < 1200 && (how !== 'static' || G.unsafe(sql)), `heavy SQL refused at no cost (${how}, ${ms} ms): ${sql.slice(0, 70)}`);
}
expect(E.diagnose(qs, 'WITH t AS (SELECT a.sale_id FROM sales a, sales b, sales c) SELECT COUNT(*) FROM t x, t y', MAIN) === null, 'Review of a heavy query: not run (null, the lifeline is not spent)');
expect(String(E.execute(MAIN, "SELECT RPAD('x', 900000000, 'y') FROM dual").rows[0][0]).length === 4000, 'RPAD is capped at 4000 characters (Oracle VARCHAR2 in SQL)');
const sh = E.shape(qs, MAIN);
const ref = E.execute(MAIN, qs.solution);
expect(sh && sh.cols === ref.cols.length && sh.rows === ref.rows.length, `shape (select): ${JSON.stringify(sh)}`);
const shd = E.shape(qd, MAIN);
expect(shd && shd.changes >= 1 && Object.values(shd.tables).reduce((a, b) => a + b, 0) >= 1, `shape (update): ${JSON.stringify(shd)}`);
expect(E.shape(qk, MAIN) === null, 'shape (ddl): null');
const allowed = new Set(['limit', 'unknown-name', 'group-by', 'error', 'cols', 'rows', 'order', 'values', 'match', 'table', 'table-values', 'constraint', 'probe']);
let diagOk = true;
for (const q of Q.values()) {
  for (const t of q.traps) {
    const d = E.diagnose(q, t, MAIN);
    if (!Array.isArray(d) || !d.every((x) => allowed.has(x.code))) diagOk = false;
    const want = q.mode === 'select' ? E.execute(MAIN, q.solution) : null;
    // A Review item never carries a value of the reference result (only counts, names of tables and ORA codes).
    if (want && !want.error) {
      const vals = new Set(want.rows.flat().filter((v) => typeof v === 'string' && v.length > 3));
      if (JSON.stringify(d).match(/"[^"]{4,}"/g)?.some((s) => vals.has(s.slice(1, -1)))) diagOk = false;
    }
  }
}
expect(diagOk, 'Review on every trap gives known codes and never a value of the reference');

/* ---- 5. Transitions (GameCore, as the function applies them) ---------------------------------------- */
section('Transitions');
const bankLite = { questions: [...Q.values()].map((q) => ({ id: q.id, mode: q.mode, level: q.level })) };
MODES.forEach((m) => {
  const ids = G.draw(bankLite, 12345, m);
  expect(ids.length === 15 && ids.every((id, i) => Q.get(id).mode === m && Q.get(id).level === i + 1), `[${m}] the draw: 15 ids of the mode, one per rung`);
});
const st0 = { v: 1, mode: 'select', seed: 0, ids: G.draw(bankLite, 7, 'select'), level: 1, status: 'playing', prize: 0, used: { clause: false, template: false, review: false }, shown: { clause: null, template: null }, answers: [] };
let st = st0;
for (let i = 0; i < 15; i++) st = G.pass(st, 'x');
expect(st.status === 'won' && st.prize === 1000000, 'fifteen right answers win the million');
st = st0; for (let i = 0; i < 6; i++) st = G.pass(st, 'x');
st = G.fail(st, 'y');
expect(st.status === 'lost' && st.prize === G.prize(5), `wrong on rung 7 with Review used: lost, the prize of safe rung 5 (${st.prize})`);
st = st0; for (let i = 0; i < 3; i++) st = G.pass(st, 'x');
st = G.rescue(st, 'y');
expect(st.status === 'playing' && st.level === 4 && st.used.review, 'the rescue spends Review and keeps the rung');
let threw = false; try { G.rescue(st, 'z'); } catch (e) { threw = true; }
expect(threw, 'a second rescue is impossible');
st = G.walkAway(st);
expect(st.status === 'walked' && st.prize === G.prize(3), 'walking away on rung 4 keeps the prize of rung 3');
st = G.useLifeline(st0, 'clause');
expect(st.used.clause && st.shown.clause === st0.ids[0], 'Key clause is spent and remembers the question');
threw = false; try { G.useLifeline(st, 'clause'); } catch (e) { threw = true; }
expect(threw, 'a lifeline cannot be used twice');
expect(G.safePrize(9) === G.prize(5) && G.safePrize(10) === G.prize(10) && G.safePrize(4) === 0, 'safe prizes: rung 5 and rung 10');

/* ---- 6. End to end against the local stack ---------------------------------------------------------- */
if (E2E) await e2e();

async function e2e() {
  section('End to end (local stack)');
  let L;
  try { L = localStack(); } catch (e) { expect(false, 'the local stack is running (cd tools && npx supabase start --workdir ..)'); return; }
  const API = L.API_URL;
  const ANON = L.ANON_KEY;
  const SERVICE = L.SERVICE_ROLE_KEY;
  const MAIL = L.MAILPIT_URL || L.INBUCKET_URL;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const req = async (method, path, { key = ANON, jwt = null, body, headers = {} } = {}) => {
    const r = await fetch(`${API}${path}`, { method, headers: { apikey: key, Authorization: `Bearer ${jwt || key}`, 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await r.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    return { status: r.status, data: data || {}, text };
  };
  const svc = (method, path, body, headers) => req(method, `/rest/v1/${path}`, { key: SERVICE, body, headers });
  const studentText = [];
  const comp = async (jwt, body) => {
    const r = await req('POST', '/functions/v1/comp', { jwt, body });
    if (!/^t-/.test(body.op)) studentText.push(r.text);
    return r;
  };
  const err = (r) => (r.data && r.data.error ? r.data.error.code : null);

  await upload({ url: API, key: SERVICE, log: () => {} });
  expect(true, 'the bank is uploaded (comp-upload --local)');
  const ts = Date.now().toString(36);
  const PW = `Pw-${ts}-x9!`;
  const mk = (who) => `${who}-${ts}@cunef.edu`;

  // The @cunef.edu hook, on every way in.
  const adminCreate = (email) => req('POST', '/auth/v1/admin/users', { key: SERVICE, body: { email, password: PW, email_confirm: true } });
  let r = await req('POST', '/auth/v1/otp', { body: { email: `outsider2-${ts}@example.com`, create_user: true } });
  expect(r.status >= 400, `a non-cunef email is refused by the hook (email code: HTTP ${r.status})`);
  r = await req('POST', '/auth/v1/signup', { body: { email: `outsider3-${ts}@cunef.edu.evil.com`, password: PW } });
  expect(r.status >= 400, `a look-alike domain is refused (sign-up: HTTP ${r.status})`);

  // Every player signs in as the page does: the 6-digit code by email (Mailpit), verifyOtp. Mixed case: kept lower.
  const codeFor = async (email) => {
    for (let i = 0; i < 30; i++) {
      await wait(400);
      const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${email.toLowerCase()}`)}`)).json().catch(() => null);
      const m = list && list.messages && list.messages[0];
      if (m) { const msg = await (await fetch(`${MAIL}/api/v1/message/${m.ID}`)).json(); const c = (/\b(\d{6})\b/.exec(msg.Text || msg.HTML || '') || [])[1]; if (c) return c; }
    }
    return null;
  };
  const otpUser = async (email) => {
    const o = await req('POST', '/auth/v1/otp', { body: { email, create_user: true } });
    const code = o.status === 200 ? await codeFor(email) : null;
    const v = code ? await req('POST', '/auth/v1/verify', { body: { type: 'email', email, token: code } }) : { data: {} };
    return { id: v.data.user && v.data.user.id, email: email.toLowerCase(), jwt: v.data.access_token, code, otpStatus: o.status };
  };
  const user = (who) => otpUser(mk(who));
  const s3 = await otpUser(`S3-Otp-${ts}@cunef.edu`);
  expect(s3.otpStatus === 200, `the email code is sent to a cunef address (HTTP ${s3.otpStatus})`);
  expect(!!s3.code, 'the email carries a 6-digit code ({{ .Token }})');
  expect(!!s3.jwt, 'verifyOtp with the code signs in');
  r = await comp(s3.jwt, { op: 'status' });
  expect(r.status === 200 && r.data.who && r.data.who.email === s3.email && r.data.who.role === 'student', 'the profile is created on sign-up, email lower-cased, role student');
  const [s1, s2, T] = [await user('s1'), await user('s2'), await user('teacher')];
  expect(s1.jwt && s2.jwt && T.jwt, 'three more @cunef.edu users sign in with the email code');
  r = await svc('PATCH', `profiles?email=eq.${encodeURIComponent(T.email)}`, { role: 'teacher' }, { Prefer: 'return=representation' });
  expect(r.status === 200 && r.data.length === 1, 'the teacher role is set by hand (as supabase/seed-teacher.sql does)');

  // One account per mailbox: a +tag address is refused by the hook.
  r = await req('POST', '/auth/v1/otp', { body: { email: `s1+${ts}@cunef.edu`, create_user: true } });
  expect(r.status >= 400, `a +tag address is refused by the hook (HTTP ${r.status})`);
  // Sessions not from the email code: a password account (made with the admin API, which skips the hook) is
  // refused by the function, cunef or not; an unconfirmed password sign-up gets no session at all.
  for (const [email, code] of [[`pw-${ts}@cunef.edu`, 'auth'], [`outsider-${ts}@gmail.com`, 'domain'], [`pw+tag-${ts}@cunef.edu`, 'domain']]) {
    await adminCreate(email);
    const t = await req('POST', '/auth/v1/token?grant_type=password', { body: { email, password: PW } });
    if (!t.data.access_token) { expect(true, `${email}: no password session at all`); continue; }
    r = await comp(t.data.access_token, { op: 'status' });
    expect(r.status >= 400 && err(r) === code, `a password session of ${email} is refused by the function (${err(r)})`);
  }
  r = await req('POST', '/auth/v1/signup', { body: { email: `pw2-${ts}@cunef.edu`, password: PW } });
  expect(!r.data.access_token, `a password sign-up gets no session before the mailbox confirms it (HTTP ${r.status})`);
  // An email change in Auth reaches the profile.
  const s5 = await user('s5');
  r = await req('PUT', `/auth/v1/admin/users/${s5.id}`, { key: SERVICE, body: { email: `s5-new-${ts}@cunef.edu`, email_confirm: true } });
  const pr = (await svc('GET', `profiles?user_id=eq.${s5.id}&select=email`)).data[0];
  expect(pr && pr.email === `s5-new-${ts}@cunef.edu`, `an email change in Auth updates profiles.email (${pr && pr.email})`);
  const s4 = await user('s4');

  // RLS: a student reads nothing but their own profile.
  for (const t of ['comp_questions', 'comp_meta', 'attempts', 'answers', 'badges']) {
    r = await req('GET', `/rest/v1/${t}?select=*`, { jwt: s1.jwt });
    expect(r.status >= 400 || (Array.isArray(r.data) && !r.data.length), `RLS: a student cannot read ${t} (HTTP ${r.status})`);
    r = await req('GET', `/rest/v1/${t}?select=*`);
    expect(r.status >= 400 || (Array.isArray(r.data) && !r.data.length), `RLS: anon cannot read ${t} (HTTP ${r.status})`);
  }
  r = await req('GET', '/rest/v1/profiles?select=*', { jwt: s1.jwt });
  expect(r.status === 200 && r.data.length === 1 && r.data[0].email === s1.email, 'RLS: a student reads only their own profile');
  r = await req('GET', '/rest/v1/profiles?select=*');
  expect(r.status >= 400 || (Array.isArray(r.data) && !r.data.length), 'RLS: anon reads no profile');
  r = await req('PATCH', `/rest/v1/profiles?user_id=eq.${s1.id}`, { jwt: s1.jwt, body: { name: 'Student One' }, headers: { Prefer: 'return=representation' } });
  expect(r.status === 200 && r.data.length === 1 && r.data[0].name === 'Student One', 'a student sets their own name');
  r = await req('PATCH', `/rest/v1/profiles?user_id=eq.${s1.id}`, { jwt: s1.jwt, body: { role: 'teacher' } });
  expect(r.status >= 400, `a student cannot change their role (HTTP ${r.status})`);
  r = await req('PATCH', `/rest/v1/profiles?user_id=eq.${s2.id}`, { jwt: s1.jwt, body: { name: 'Hacked' }, headers: { Prefer: 'return=representation' } });
  expect(r.status >= 400 || (Array.isArray(r.data) && !r.data.length), 'a student cannot rename another student');
  r = await req('POST', '/rest/v1/badges', { jwt: s1.jwt, body: { user_id: s1.id, mode: 'select', attempt_id: s1.id } });
  expect(r.status >= 400, `a student cannot insert a badge (HTTP ${r.status})`);
  r = await req('POST', '/rest/v1/rpc/comp_start', { jwt: s1.jwt, body: { p_user: s1.id, p_mode: 'select', p_ids: [], p_test: false, p_minutes: 600, p_daily: 99 } });
  expect(r.status >= 400, `a student cannot call comp_start directly (HTTP ${r.status})`);

  // The API: errors.
  r = await req('POST', '/functions/v1/comp', { body: { op: 'status' } });
  expect(r.status === 401 && err(r) === 'auth' && !!r.data.serverTime, 'no user token: error auth, with serverTime');
  r = await req('POST', '/functions/v1/comp', { jwt: 'not-a-token', body: { op: 'status' } });
  expect(r.status === 401 && err(r) === 'auth', 'a forged token: error auth');
  for (const op of ['t-list', 't-attempt', 't-oral', 't-csv', 't-jump', 't-force']) {
    r = await comp(s1.jwt, { op, attemptId: s1.id, userId: s1.id, level: 15 });
    expect(r.status === 403 && err(r) === 'forbidden', `${op} is forbidden to a student`);
  }
  r = await comp(s1.jwt, { op: 'start', mode: 'select', test: true });
  expect(err(r) === 'forbidden', 'a student cannot start a test attempt');
  r = await comp(s1.jwt, { op: 'start', mode: 'mixed' });
  expect(err(r) === 'bad-request', 'an unknown mode is a bad request');

  // A full won attempt (select), with the three lifelines, a refusal and the rate limit.
  r = await comp(s1.jwt, { op: 'status' });
  expect(r.status === 200 && r.data.limits.daily === 3 && r.data.limits.minutes === 60 && r.data.modes.select.left === 3 && r.data.modes.select.badge === null, 'status: 3 left today, no badge');
  r = await comp(s1.jwt, { op: 'start', mode: 'select' });
  let A = r.data.attempt;
  expect(r.status === 200 && A && A.level === 1 && A.status === 'playing' && A.question && A.question.level === 1 && !('ids' in A), 'start: the view, rung 1, no id list');
  if (!A) return;
  expect(Date.parse(A.deadline) - Date.parse(r.data.serverTime) > 59 * 60000, 'start: the deadline is 60 minutes away (server time)');
  r = await comp(s1.jwt, { op: 'start', mode: 'select' });
  expect(err(r) === 'state', 'a second start of a running mode is refused (state)');
  const ids = (await svc('GET', `attempts?id=eq.${A.id}&select=ids`)).data[0].ids;
  let last = null;
  for (let lv = 1; lv <= 15; lv++) {
    const q = Q.get(ids[lv - 1]);
    const lastText = studentText[studentText.length - 1];
    expect(A.question && A.question.id === q.id && ids.slice(lv).every((id) => !lastText.includes(`"${id}"`)), `rung ${lv}: the view shows ${q.id} and no later question id`);
    if (lv === 1) {
      r = await comp(s1.jwt, { op: 'lifeline', attemptId: A.id, name: 'clause' });
      expect(r.status === 200 && r.data.text.en === q.clause_en && r.data.shape && r.data.shape.cols >= 1 && r.data.attempt.question.clause, 'Key clause: the text and the shape (counts), then in the view');
      r = await comp(s1.jwt, { op: 'lifeline', attemptId: A.id, name: 'clause' });
      expect(err(r) === 'state', 'Key clause cannot be used twice');
      r = await comp(s1.jwt, { op: 'submit', attemptId: A.id, sql: 'UPDATE games SET stock = 0', tele: { ms: 1000, runs: 1, paste: 0, blur: 0 } });
      expect(r.status === 200 && r.data.verdict === 'refused' && r.data.refusal.reason === 'wrong-kind' && r.data.attempt.level === 1, 'a refused answer costs nothing');
      r = await comp(s1.jwt, { op: 'submit', attemptId: A.id, sql: q.solution, tele: {} });
      expect(err(r) === 'limit', 'two submits within 2 s: the second is rate-limited');
    }
    if (lv === 2) {
      r = await comp(s1.jwt, { op: 'lifeline', attemptId: A.id, name: 'template' });
      expect(r.status === 200 && r.data.sql === q.template && r.data.attempt.question.template.sql === q.template, 'Insert template: the template, then in the view of that question');
    }
    if (lv === 3) {
      r = await comp(s1.jwt, { op: 'lifeline', attemptId: A.id, name: 'review' });
      expect(r.status === 200 && r.data.diag === null && !r.data.attempt.used.review, 'Review with no SQL is not spent');
      await wait(2100);   // Review runs SQL: one run per user every 2 s
      r = await comp(s1.jwt, { op: 'lifeline', attemptId: A.id, name: 'review', sql: q.traps[0] });
      expect(r.status === 200 && Array.isArray(r.data.diag) && r.data.diag.length && r.data.attempt.used.review, `Review on a trap: codes ${(r.data.diag || []).map((d) => d.code).join(' ')}`);
    }
    await wait(2100);
    r = await comp(s1.jwt, { op: 'submit', attemptId: A.id, sql: q.solution, tele: { ms: 90000, runs: 2, paste: 0, blur: 0 } });
    last = r;
    if (!expect(r.status === 200 && r.data.verdict === (lv === 15 ? 'won' : 'pass'), `rung ${lv}: the solution passes (${r.data.verdict || JSON.stringify(r.data.error)})`)) break;
    A = r.data.attempt;
  }
  expect(last && last.data.attempt && last.data.attempt.status === 'won' && last.data.attempt.prize === 1000000 && last.data.attempt.question === null, 'the attempt is won: the million, no question');
  r = await svc('GET', `badges?user_id=eq.${s1.id}&select=mode,attempt_id`);
  expect(r.data.length === 1 && r.data[0].mode === 'select' && r.data[0].attempt_id === A.id, 'a won attempt gives the badge');
  r = await comp(s1.jwt, { op: 'status' });
  expect(r.data.modes.select.badge && r.data.modes.select.startedToday === 1 && r.data.modes.select.left === 2 && r.data.modes.select.active === null, 'status: the badge, 1 started today, 2 left');
  r = await comp(s1.jwt, { op: 'submit', attemptId: A.id, sql: 'SELECT 1 FROM dual' });
  expect(err(r) === 'state', 'a finished attempt takes no more answers');
  r = await svc('GET', `answers?attempt_id=eq.${A.id}&select=level,ok,flags,shown_at,answered_at&order=id`);
  expect(r.data.filter((x) => x.ok).length === 15 && r.data.every((x) => x.shown_at && x.answered_at), 'answers: 15 right, each with shown_at and answered_at');

  // A lost attempt: wrong, rescue, wrong again.
  r = await comp(s1.jwt, { op: 'start', mode: 'insert' });
  const B = r.data.attempt;
  const qi = Q.get(B.question.id);
  await wait(2100);   // the last SQL run of s1 (rung 15) was just now
  r = await comp(s1.jwt, { op: 'submit', attemptId: B.id, sql: qi.traps[0], tele: { ms: 5000, runs: 0, paste: 1, blur: 4 } });
  expect(r.data.verdict === 'pending' && r.data.attempt.status === 'pending', 'wrong with Review unused: pending');
  r = await comp(s1.jwt, { op: 'lifeline', attemptId: B.id, name: 'clause' });
  expect(err(r) === 'state', 'no lifeline while the rescue waits');
  r = await comp(s1.jwt, { op: 'rescue', attemptId: B.id, use: true });
  expect(r.status === 200 && r.data.attempt.status === 'playing' && r.data.attempt.used.review && Array.isArray(r.data.diag) && Array.isArray(r.data.checks), 'the rescue: Review spent, its codes and probes, same rung');
  await wait(2100);
  r = await comp(s1.jwt, { op: 'submit', attemptId: B.id, sql: qi.traps[0], tele: {} });
  expect(r.data.verdict === 'lost' && r.data.attempt.status === 'lost' && r.data.attempt.prize === 0, 'wrong again: lost, no prize');
  r = await svc('GET', `badges?user_id=eq.${s1.id}&mode=eq.insert`);
  expect(r.data.length === 0, 'a lost attempt gives no badge');
  r = await svc('GET', `answers?attempt_id=eq.${B.id}&select=flags,reason,ok&order=id`);
  expect(r.data[0].flags.includes('self:pasted') && r.data[0].flags.includes('self:left-tab') && r.data[0].flags.includes('self:no-runs') && r.data[0].ok === false && !!r.data[0].reason, `flags stored with the answer (${r.data[0].flags.join(' ')}; ${r.data[0].reason})`);

  // Daily limit (Europe/Madrid day).
  for (let i = 1; i <= 3; i++) {
    r = await comp(s2.jwt, { op: 'start', mode: 'update' });
    r = await comp(s2.jwt, { op: 'walk', attemptId: r.data.attempt && r.data.attempt.id });
    expect(r.data.attempt && r.data.attempt.status === 'walked', `attempt ${i} of the day started and walked away`);
  }
  r = await comp(s2.jwt, { op: 'start', mode: 'update' });
  expect(r.status === 429 && err(r) === 'limit', 'the 4th attempt of the day is refused (limit)');
  r = await comp(s2.jwt, { op: 'status' });
  expect(r.data.modes.update.left === 0 && r.data.modes.update.startedToday === 3 && r.data.modes.delete.left === 3, 'status: 0 left in update, 3 in delete');

  // Expiry.
  r = await comp(s2.jwt, { op: 'start', mode: 'delete' });
  const C = r.data.attempt;
  await svc('PATCH', `attempts?id=eq.${C.id}`, { deadline: new Date(Date.now() - 1000).toISOString() });
  r = await comp(s2.jwt, { op: 'submit', attemptId: C.id, sql: Q.get(C.question.id).solution });
  expect(err(r) === 'expired', 'an answer after the deadline is refused (expired)');
  r = await comp(s2.jwt, { op: 'current', attemptId: C.id });
  expect(r.data.attempt && r.data.attempt.status === 'expired' && r.data.attempt.question === null, 'the attempt is expired, with no question');
  r = await comp(s1.jwt, { op: 'current', attemptId: C.id });
  expect(err(r) === 'not-found', "another student's attempt is not found");

  // My attempts (my-stats): only your own real attempts, newest first, counts and no SQL.
  r = await comp(s1.jwt, { op: 'my-stats' });
  const ms = r.data || {};
  const msIds = (ms.attempts || []).map((a) => a.id);
  expect(r.status === 200 && msIds.length === 2 && msIds[0] === B.id && msIds[1] === A.id && !msIds.includes(C.id), `my-stats: the student's two attempts, newest first, none of another student (${msIds.length})`);
  const msWon = (ms.attempts || []).find((a) => a.id === A.id) || {};
  const msLost = (ms.attempts || []).find((a) => a.id === B.id) || {};
  expect(msWon.status === 'won' && msWon.rung === 15 && msWon.badge && msWon.right === 15 && msWon.prize === 1000000, 'my-stats: the won attempt (rung 15, badge, 15 right, the million)');
  expect(msLost.status === 'lost' && msLost.rung === 0 && !msLost.badge && msLost.answered >= 1 && msLost.right === 0, `my-stats: the lost attempt (rung 0, no badge, 0/${msLost.answered} right)`);
  expect(ms.modes && ms.modes.select.count === 1 && ms.modes.select.best === 15 && ms.modes.select.badge && ms.modes.insert.count === 1 && ms.modes.insert.best === 0 && !ms.modes.insert.badge && ms.modes.ddl.count === 0 && ms.modes.ddl.last === null, 'my-stats: per mode count, best rung, badge');
  expect(!/"(sql|solution|ids|question)"/.test(JSON.stringify(ms)), 'my-stats: no SQL, solutions or questions');
  r = await comp(s2.jwt, { op: 'my-stats' });
  expect(r.status === 200 && r.data.attempts.length === 4 && r.data.attempts[0].id === C.id && r.data.attempts[0].status === 'expired' && r.data.modes.update.count === 3, 'my-stats: the other student sees only theirs (3 walked, 1 expired)');
  r = await req('POST', '/functions/v1/comp', { body: { op: 'my-stats' } });
  expect(r.status === 401, `my-stats without a token: 401 (${r.status})`);

  // Teacher.
  r = await comp(T.jwt, { op: 'start', mode: 'select' });
  const TA = r.data.attempt;
  r = await comp(T.jwt, { op: 't-force', attemptId: TA.id });
  expect(err(r) === 'forbidden', 't-force is refused on a non-test attempt');
  r = await comp(T.jwt, { op: 't-jump', attemptId: TA.id, level: 15 });
  expect(err(r) === 'forbidden', 't-jump is refused on a non-test attempt');
  r = await comp(T.jwt, { op: 'start', mode: 'ddl', test: true });
  const TT = r.data.attempt;
  expect(TT && TT.test === true, 'the teacher starts a test attempt');
  r = await comp(T.jwt, { op: 't-jump', attemptId: TT.id, level: 15 });
  expect(r.data.attempt && r.data.attempt.level === 15 && r.data.attempt.question.level === 15, 't-jump to rung 15');
  r = await comp(T.jwt, { op: 't-force', attemptId: TT.id });
  expect(r.data.verdict === 'won' && r.data.attempt.status === 'won', 't-force on rung 15 wins the test attempt');
  r = await svc('GET', `badges?user_id=eq.${T.id}`);
  expect(r.data.length === 0, 'a test attempt never gives a badge');
  r = await comp(T.jwt, { op: 't-list' });
  const me1 = r.data.students && r.data.students.find((x) => x.email === s1.email);
  expect(me1 && me1.name === 'Student One' && me1.badges.select && me1.attempts.select.count === 1 && me1.attempts.select.best === 15 && me1.attempts.insert.best === 0, 't-list: names, badges, attempts (count, best rung)');
  r = await comp(T.jwt, { op: 't-attempt', attemptId: A.id });
  expect(r.data.questions && r.data.questions.length === 15 && r.data.questions.every((x) => x.solution && x.answers.length && x.answers[0].shown_at && x.answers[0].answered_at), 't-attempt: every question with the solution, the SQL and server times');
  r = await comp(T.jwt, { op: 't-oral', userId: s1.id });
  expect(r.data.picks && r.data.picks.length === 2 && r.data.picks.every((p) => p.sql && p.solution), 't-oral: two right answers of the badge attempt');
  r = await comp(T.jwt, { op: 't-list' });
  const atl = r.data.attempts || [];
  const won1 = atl.find((x) => x.id === A.id);
  const test1 = atl.find((x) => x.id === TT.id);
  expect(won1 && won1.role === 'student' && !won1.test && won1.badge && won1.rung === 15 && won1.right === 15 && won1.email === s1.email, 't-list attempts: the student\'s won attempt (role, badge, rung, right answers)');
  expect(test1 && test1.role === 'teacher' && test1.test && !test1.badge && test1.email === T.email, 't-list attempts: the teacher\'s test attempt is listed, marked test and teacher');
  expect(atl.length >= 2 && atl.every((x, i) => i === 0 || atl[i - 1].started_at >= x.started_at),'t-list attempts: newest first');
  r = await comp(T.jwt, { op: 't-csv' });
  const sumLines = (r.data.csv || '').trim().split('\n');
  expect(sumLines[0].startsWith('email,name,role,select_badge,select_attempts,select_best_rung,select_tests,insert_badge') && sumLines[0].endsWith(',badges,all_five'), 't-csv summary: the header');
  expect(sumLines.some((l) => l.startsWith(`${s1.email},Student One,student,`)) && sumLines.some((l) => l.startsWith(`${T.email},`) && l.includes(',teacher,')), 't-csv summary: a line per account, students and teachers, with the role');
  r = await comp(T.jwt, { op: 't-csv', kind: 'answers' });
  const ansLines = (r.data.csv || '').trim().split('\n');
  expect(ansLines[0] === 'role,email,name,attempt_id,mode,test,status,rung,prize,badge,started_at,deadline,finished_at,minutes,used_clause,used_template,used_review,level,question_id,ok,reason,shown_at,answered_at,seconds,runs,flags,bank_version,sql', 't-csv answers: the header');
  expect(ansLines.filter((l) => l.includes(A.id)).length >= 15 && ansLines.some((l) => l.includes(TT.id) && l.includes(',yes,') && l.startsWith('teacher,')), 't-csv answers: every answer of the won attempt, and the teacher\'s test attempt');

  // Fail closed: the engine refuses to grade a non-main_only question without the hidden dataset.
  const anyQ = [...Q.values()].find((q) => !q.main_only);
  let threwE = false; try { E.judge(anyQ, anyQ.solution, { main: MAIN }); } catch (e) { threwE = true; }
  expect(threwE, 'the engine refuses to grade a non-main_only question without the hidden dataset');

  // A hidden trap through the real function: right on the public data, graded wrong (teacher test attempts until
  // the drawn question has one).
  let HT = null;
  for (let i = 0; i < 30 && !HT; i++) {
    const lv = [3, 15][i % 2];
    r = await comp(T.jwt, { op: 'start', mode: 'select', test: true });
    const ta = r.data.attempt;
    r = await comp(T.jwt, { op: 't-jump', attemptId: ta.id, level: lv });
    const qq = Q.get(r.data.attempt.question.id);
    if (qq.hidden_traps.length && !qq.main_only) HT = { a: ta, q: qq };
    else await comp(T.jwt, { op: 'walk', attemptId: ta.id });
  }
  if (expect(!!HT, 'a test attempt shows a question with a hidden trap')) {
    r = await comp(T.jwt, { op: 'submit', attemptId: HT.a.id, sql: HT.q.hidden_traps[0], tele: {} });
    expect(r.data.verdict === 'pending', `[${HT.q.id}] its hidden trap is graded wrong by the function (${r.data.verdict || JSON.stringify(r.data.error)})`);
    const ans = (await svc('GET', `answers?attempt_id=eq.${HT.a.id}&answered_at=not.is.null&select=reason,version,graded_solution&order=id.desc&limit=1`)).data[0];
    expect(ans && /^hidden:/.test(ans.reason) && ans.version && ans.graded_solution === HT.q.solution, `the answer records why (${ans && ans.reason}), the bank version and the solution it was graded with`);
    await comp(T.jwt, { op: 'rescue', attemptId: HT.a.id, use: false });
  }

  // Re-uploading a changed question: the next grading (on a warm instance) uses it at once.
  r = await comp(s4.jwt, { op: 'start', mode: 'update' });
  const D = r.data.attempt;
  const qd0 = Q.get(D.question.id);
  const newSol = qd0.traps.find((t) => !E.executeChecks(MAIN, t, E.probesOf(qd0)).error && !E.executeChecks(HIDDEN, t, E.probesOf(qd0)).error);
  r = await comp(s4.jwt, { op: 'current', attemptId: D.id });   // warm
  const up = await upload({ url: API, key: SERVICE, log: () => {}, mutate: (rows) => rows.map((x) => (x.id === qd0.id ? { ...x, solution: newSol } : x)) });
  r = await comp(s4.jwt, { op: 'submit', attemptId: D.id, sql: newSol, tele: {} });
  expect(r.data.verdict === 'pass', `[${qd0.id}] after a re-upload that changes its solution, the new solution is graded right at once (${r.data.verdict || JSON.stringify(r.data.error)})`);
  const ans4 = (await svc('GET', `answers?attempt_id=eq.${D.id}&answered_at=not.is.null&select=version,graded_solution`)).data[0];
  expect(ans4 && ans4.version === up.version && ans4.graded_solution === newSol, 'the answer records the new version and solution');
  const back = await upload({ url: API, key: SERVICE, log: () => {} });
  expect(back.version !== up.version, `the version is a content hash: a changed question changes it (${up.version} → ${back.version})`);
  r = await comp(T.jwt, { op: 't-attempt', attemptId: D.id });
  const det = r.data.questions && r.data.questions[0].answers.find((x) => x.answered_at);
  expect(det && det.stale === true && det.graded_solution === newSol && r.data.questions[0].solution === qd0.solution, 't-attempt: an answer graded with an older bank is marked stale, with the solution it was graded with');

  // No hidden dataset in comp_meta: grading refuses with a server error and spends nothing.
  r = await comp(s4.jwt, { op: 'current', attemptId: D.id });
  const before = r.data.attempt;
  const qd1 = Q.get(before.question.id);
  if (qd1.main_only) expect(true, `[${qd1.id}] is main_only: the missing-hidden-dataset check needs another draw (skipped this run)`);
  else {
    await svc('DELETE', 'comp_meta?key=eq.hidden_setup');
    await wait(2100);
    r = await comp(s4.jwt, { op: 'submit', attemptId: D.id, sql: qd1.solution, tele: {} });
    expect(r.status === 500 && err(r) === 'server', `without the hidden dataset, grading refuses with a server error (HTTP ${r.status} ${err(r)})`);
    r = await comp(s4.jwt, { op: 'current', attemptId: D.id });
    expect(r.data.attempt.level === before.level && r.data.attempt.status === 'playing' && r.data.attempt.answered.length === before.answered.length, 'nothing was spent');
    await upload({ url: API, key: SERVICE, log: () => {} });
    await wait(2100);
    r = await comp(s4.jwt, { op: 'submit', attemptId: D.id, sql: qd1.solution, tele: {} });
    expect(r.data.verdict === 'pass', `after the upload restores it, grading works again (${r.data.verdict || JSON.stringify(r.data.error)})`);
  }

  // Abuse: parallel submits (one SQL run per user every 2 s, claimed atomically), heavy SQL through the function,
  // a formula in a name (CSV injection).
  const s6 = await user('s6');
  r = await comp(s6.jwt, { op: 'start', mode: 'select' });
  const P = r.data.attempt;
  const qp = Q.get(P.question.id);
  const par = await Promise.all(Array.from({ length: 6 }, () => comp(s6.jwt, { op: 'submit', attemptId: P.id, sql: qp.traps[0], tele: {} })));
  const graded = par.filter((x) => x.status === 200);
  expect(graded.length === 1 && graded[0].data.verdict === 'pending' && par.filter((x) => ['limit', 'state'].includes(err(x))).length === 5, `six parallel submits: one graded, five refused (limit, or state once the first made it pending) (${par.map((x) => x.data.verdict || err(x)).join(' ')})`);
  await wait(2100);
  await comp(s6.jwt, { op: 'rescue', attemptId: P.id, use: false });
  r = await comp(s6.jwt, { op: 'start', mode: 'select' });
  const P2 = r.data.attempt;
  for (const [sql, label] of [['SELECT COUNT(*) FROM sales a, sales b, sales c, sales d, sales e', 'five tables (static)'], ['WITH t AS (SELECT a.sale_id FROM sales a, sales b, sales c) SELECT COUNT(*) FROM t x, t y', 'a product of WITH results (stopped)']]) {
    await wait(2100);
    const t0 = Date.now();
    r = await comp(s6.jwt, { op: 'submit', attemptId: P2.id, sql, tele: {} });
    expect(r.status === 200 && r.data.verdict === 'refused' && r.data.refusal.reason === 'unsupported' && Date.now() - t0 < 3000, `heavy SQL through the function, ${label}: refused at no cost in ${Date.now() - t0} ms`);
  }
  await wait(2100);
  r = await comp(s6.jwt, { op: 'lifeline', attemptId: P2.id, name: 'review', sql: 'WITH t AS (SELECT a.sale_id FROM sales a, sales b, sales c) SELECT COUNT(*) FROM t x, t y' });
  expect(r.status === 200 && r.data.diag === null && r.data.refusal && !r.data.attempt.used.review, 'Review of heavy SQL: not run, not spent');
  r = await req('PATCH', `/rest/v1/profiles?user_id=eq.${s6.id}`, { jwt: s6.jwt, body: { name: '=HYPERLINK("http://x","y")' } });
  r = await comp(T.jwt, { op: 't-csv' });
  expect(r.data.csv.includes(`"'=HYPERLINK(""http://x"",""y"")"`) && !/,=HYPERLINK/.test(r.data.csv), 't-csv: a name starting with = is written as text (leading quote)');

  // No student response ever carried a solution (compared with the private files).
  const norm = (s) => String(s).replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const all = norm(studentText.join('\n'));
  const leaks = [...Q.values()].filter((q) => all.includes(norm(JSON.stringify(q.solution).slice(1, -1))) || all.includes(norm(q.solution)));
  expect(studentText.length > 40 && !leaks.length, `no student response contains a solution (${studentText.length} responses${leaks.length ? `; LEAK ${leaks.map((q) => q.id).join(' ')}` : ''})`);
  expect(!/"(solution|ids|traps|alts|hidden_setup|main_setup|keywords)"/.test(studentText.join('')), 'no student response has a solution, ids, traps, alts, keywords or dataset field');
}

console.log(`\n${good} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
