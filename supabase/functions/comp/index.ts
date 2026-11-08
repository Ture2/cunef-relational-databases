// Query for a Million, competitive side: the API (docs/game-quiz.md §15.3).
//   POST /functions/v1/comp   Authorization: Bearer <the user's access token>   body { op, ... }
// Every response is JSON with `serverTime`; errors are { error: { code, message } } with code auth | domain |
// limit | expired | not-found | forbidden | state | bad-request | server.
// The database is reached with the service role (RLS denies the API roles everything); the grading engine is
// ../_shared/engine.js on sql.js, with byte-for-byte copies of js/oracle-dialect.js and js/game-core.js.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { loadEngine } from '../_shared/load.js';

const MODES = ['select', 'insert', 'update', 'delete', 'ddl'];
const LIMIT_MINUTES = 60;
const DAILY = 3;
const SQL_GAP_MS = 2000;         // rate limit: one run of student SQL per user every 2 s (claimed atomically)
const MAX_SQL = 20000;           // characters
// One account per mailbox: plain addresses only (no +tags). The same rule as the auth hook and the page.
const EMAIL_RULE = /^[a-z0-9._-]+@cunef\.edu$/;
const AMR_OK = ['otp', 'magiclink'];   // sessions from the email code (or link); never a password

const URL_ = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const db = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const HTTP: Record<string, number> = { auth: 401, domain: 403, forbidden: 403, 'not-found': 404, limit: 429, expired: 409, state: 409, 'bad-request': 400, server: 500 };

class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}
const fail = (code: string, message: string): never => { throw new ApiError(code, message); };
const json = (body: any, status = 200) => new Response(JSON.stringify({ ...body, serverTime: new Date().toISOString() }), {
  status, headers: { ...CORS, 'Content-Type': 'application/json' },
});
const must = (r: any, what: string) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

/* ---- The bank, the datasets and the engine (cached per warm instance) ----------------------------- */

// Every request checks the bank's signature (the keys and updated_at of comp_meta, the latest updated_at of
// comp_questions: two tiny queries) and reloads on any change, so grading, views and the teacher's detail always
// use the bank that is in the database now. (comp-upload's version is a content hash; updated_at moves on any edit.)
let cache: any = null;
async function bank() {
  const [metaSig, qSig] = await Promise.all([
    db.from('comp_meta').select('key, updated_at').order('key'),
    db.from('comp_questions').select('updated_at').order('updated_at', { ascending: false }).limit(1),
  ]);
  const sig = JSON.stringify([must(metaSig, 'comp_meta'), must(qSig, 'comp_questions')]);
  if (cache && cache.sig === sig) return cache;
  const meta = must(await db.from('comp_meta').select('key, value'), 'comp_meta');
  const M: any = Object.fromEntries(meta.map((r: any) => [r.key, r.value]));
  if (!M.main_setup) fail('server', 'The competition bank is not uploaded yet.');
  if (!M.hidden_setup) console.error('comp_meta.hidden_setup is missing: only main_only questions can be graded');
  const rows = must(await db.from('comp_questions').select('*'), 'comp_questions');
  const Q = new Map(rows.map((r: any) => [r.id, r]));
  const E = await loadEngine(M.schema || null);
  cache = { sig, version: M.version || null, Q, main: M.main_setup, hidden: M.hidden_setup || null, E };
  return cache;
}
const question = (B: any, id: string) => B.Q.get(id) || fail('server', `question ${id} is missing from the bank`);

/* ---- Game state <-> rows ------------------------------------------------------------------------ */

const G = () => (globalThis as any).GameCore;
// A GameCore state from an attempt row ('pending' is GameCore's 'playing' with a wrong answer waiting).
const stateOf = (a: any) => ({ v: 1, mode: a.mode, seed: 0, ids: a.ids, level: a.level, status: a.status === 'pending' ? 'playing' : a.status, prize: a.prize, used: { ...a.used }, shown: { ...a.shown }, answers: [], started: a.started_at });
const live = (a: any) => a.status === 'playing' || a.status === 'pending';

async function loadAttempt(id: any, me: any, { anyOwner = false } = {}) {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) fail('bad-request', 'attemptId is missing or malformed.');
  const a = must(await db.from('attempts').select('*').eq('id', id).maybeSingle(), 'attempt');
  if (!a || (!anyOwner && a.user_id !== me.user_id)) fail('not-found', 'No such attempt.');
  return a;
}
async function answersOf(attemptId: string) {
  return must(await db.from('answers').select('*').eq('attempt_id', attemptId).order('id'), 'answers');
}

/* Writes the new columns if nobody changed the attempt meanwhile (rev); returns the new row. */
async function save(a: any, patch: any) {
  const r = must(await db.from('attempts').update({ ...patch, rev: a.rev + 1 }).eq('id', a.id).eq('rev', a.rev).select('*'), 'attempt update');
  if (!r.length) fail('state', 'The attempt changed meanwhile: reload it.');
  return r[0];
}

/* An attempt past its deadline ends as expired (the prize of the last safe rung), when it is next touched. */
async function expireIfDue(a: any) {
  if (!live(a) || Date.now() <= Date.parse(a.deadline)) return a;
  try {
    return await save(a, { status: 'expired', prize: G().safePrize(a.level - 1), finished_at: a.deadline });
  } catch (e) {
    if (e instanceof ApiError) { const again = must(await db.from('attempts').select('*').eq('id', a.id).single(), 'attempt'); return again; }
    throw e;
  }
}

/* The student's view: never the solution, the template (unless that lifeline was used on this question), the
   other question ids or any expected result. */
function view(a: any, answers: any[], B: any) {
  const qid = live(a) ? a.ids[a.level - 1] : null;
  let qv: any = null;
  if (qid) {
    const q = question(B, qid);
    qv = { id: q.id, mode: q.mode, level: q.level, prompt: { en: q.prompt_en, es: q.prompt_es }, ordered: !!q.ordered };
    if (a.used.clause && a.shown.clause === qid) qv.clause = { text: { en: q.clause_en, es: q.clause_es }, shape: B.E.shape(q, B.main) };
    if (a.used.template && a.shown.template === qid) qv.template = { sql: q.template, note: { en: q.template_note_en, es: q.template_note_es } };
  }
  return {
    id: a.id, mode: a.mode, level: a.level, status: a.status, prize: a.prize, used: a.used, deadline: a.deadline,
    startedAt: a.started_at, finishedAt: a.finished_at, test: a.test, question: qv,
    answered: answers.filter((x) => x.answered_at).map((x) => ({ level: x.level, ok: !!x.ok })),
  };
}
async function viewOf(a: any, B: any) { return view(a, await answersOf(a.id), B); }

/* Opens the answer row of the question now shown (its shown_at is the server's clock for the `fast` flag). */
async function openQuestion(a: any) {
  must(await db.from('answers').insert({ attempt_id: a.id, level: a.level, question_id: a.ids[a.level - 1] }), 'answers insert');
}
async function openRow(a: any) {
  const rows = must(await db.from('answers').select('*').eq('attempt_id', a.id).eq('level', a.level).is('answered_at', null).order('id', { ascending: false }).limit(1), 'answers');
  if (rows.length) return rows[0];
  const r = must(await db.from('answers').insert({ attempt_id: a.id, level: a.level, question_id: a.ids[a.level - 1] }).select('*'), 'answers insert');
  return r[0];
}

async function awardBadge(a: any) {
  if (a.test) return;
  must(await db.from('badges').upsert({ user_id: a.user_id, mode: a.mode, attempt_id: a.id, earned_at: new Date().toISOString() }, { onConflict: 'user_id,mode', ignoreDuplicates: true }), 'badge');
}

/* A right answer: climb, or win on rung 15. */
async function passFrom(a: any, sql: string, extra: any = {}) {
  const s = G().pass(stateOf(a), sql);
  const won = s.status === 'won';
  const n = await save(a, { ...extra, ...(won ? { status: 'won', prize: s.prize, finished_at: new Date().toISOString() } : { level: s.level, status: 'playing' }) });
  if (won) await awardBadge(n); else await openQuestion(n);
  return n;
}

/* ---- Student operations ------------------------------------------------------------------------- */

async function opStatus(me: any) {
  const B = await bank();
  const today = madridDay();
  let atts = must(await db.from('attempts').select('*').eq('user_id', me.user_id).or(`status.in.(playing,pending),day.eq.${today}`), 'attempts');
  atts = await Promise.all(atts.map(expireIfDue));
  const badges = must(await db.from('badges').select('mode, earned_at').eq('user_id', me.user_id), 'badges');
  const modes: any = {};
  for (const m of MODES) {
    const startedToday = atts.filter((a: any) => a.mode === m && !a.test && a.day === today).length;
    const act = atts.find((a: any) => a.mode === m && !a.test && live(a));
    const b = badges.find((x: any) => x.mode === m);
    modes[m] = { badge: b ? { earned_at: b.earned_at } : null, startedToday, left: Math.max(0, DAILY - startedToday), active: act ? await viewOf(act, B) : null };
    if (me.role === 'teacher') {
      const t = atts.find((a: any) => a.mode === m && a.test && live(a));
      modes[m].testActive = t ? await viewOf(t, B) : null;
    }
  }
  return { who: { email: me.email, name: me.name, role: me.role }, limits: { minutes: LIMIT_MINUTES, daily: DAILY }, modes };
}

async function opStart(me: any, body: any) {
  const mode = body.mode;
  if (!MODES.includes(mode)) fail('bad-request', `mode must be one of ${MODES.join(', ')}.`);
  const test = !!body.test;
  if (test && me.role !== 'teacher') fail('forbidden', 'Test attempts are for teachers.');
  const B = await bank();
  // Stale attempts of this mode end first, so they do not block the new one.
  const act = must(await db.from('attempts').select('*').eq('user_id', me.user_id).eq('mode', mode).in('status', ['playing', 'pending']), 'attempts');
  await Promise.all(act.map(expireIfDue));
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const ids = G().draw({ questions: [...B.Q.values()].map((q: any) => ({ id: q.id, mode: q.mode, level: q.level })) }, seed, mode);
  const r = must(await db.rpc('comp_start', { p_user: me.user_id, p_mode: mode, p_ids: ids, p_test: test, p_minutes: LIMIT_MINUTES, p_daily: DAILY }), 'comp_start');
  if (r.error === 'limit') fail('limit', `You have used today's ${DAILY} attempts for this mode. Come back tomorrow.`);
  if (r.error === 'state') fail('state', 'An attempt of this mode is already running: continue it.');
  const a = await loadAttempt(r.id, me);
  return { attempt: await viewOf(a, B) };
}

async function opCurrent(me: any, body: any) {
  const B = await bank();
  const a = await expireIfDue(await loadAttempt(body.attemptId, me));
  return { attempt: await viewOf(a, B) };
}

async function liveAttempt(me: any, body: any, want: string[]) {
  let a = await loadAttempt(body.attemptId, me);
  a = await expireIfDue(a);
  if (a.status === 'expired' && want.length) fail('expired', 'Time is up: the attempt has ended.');
  if (!want.includes(a.status)) fail('state', `The attempt is ${a.status}.`);
  return a;
}

async function opSubmit(me: any, body: any) {
  const B = await bank();
  const sql = body.sql;
  if (typeof sql !== 'string' || !sql.trim()) fail('bad-request', 'sql is missing.');
  if (sql.length > MAX_SQL) fail('bad-request', `The answer is longer than ${MAX_SQL} characters.`);
  let a = await liveAttempt(me, body, ['playing']);
  const q = question(B, a.ids[a.level - 1]);
  // Fail closed: a question that is not main_only is never graded without the hidden dataset (nothing is spent).
  if (!q.main_only && !B.hidden) { console.error(`submit ${q.id}: no hidden dataset`); fail('server', 'The competition bank is incomplete: try again later.'); }
  await claimSql(me);
  const now = new Date();
  const j = B.E.judge(q, sql, { main: B.main, hidden: B.hidden });
  if (j.refusal) return { verdict: 'refused', refusal: j.refusal, attempt: await viewOf(a, B) };
  const row = await openRow(a);
  const ms = now.getTime() - Date.parse(row.shown_at);
  const t = body.tele && typeof body.tele === 'object' ? body.tele : {};
  const tele = { ms: Number(t.ms) || 0, runs: Number(t.runs) || 0, paste: Number(t.paste) || 0, blur: Number(t.blur) || 0, serverMs: ms };
  const flags = B.E.flags(q, sql, tele, ms);
  // Server-measured: the third answer in a row given under a minute after its question was shown.
  const prev = must(await db.from('answers').select('tele').eq('attempt_id', a.id).not('answered_at', 'is', null).order('id', { ascending: false }).limit(2), 'answers');
  if (ms < 60000 && prev.length === 2 && prev.every((x: any) => x.tele && Number(x.tele.serverMs) < 60000)) flags.push('streak');
  const reason = j.ok ? null : j.main.ok ? `hidden:${j.hidden ? j.hidden.reason : 'error'}` : j.main.reason;
  let verdict: string;
  if (j.ok) {
    a = await passFrom(a, sql);
    await writeAnswer(row, { sql, ok: true, reason, answered_at: now.toISOString(), tele, flags, version: B.version, graded_solution: q.solution });
    verdict = a.status === 'won' ? 'won' : 'pass';
  } else if (!a.used.review) {
    a = await save(a, { status: 'pending' });
    await writeAnswer(row, { sql, ok: false, reason, answered_at: now.toISOString(), tele, flags, version: B.version, graded_solution: q.solution });
    verdict = 'pending';
  } else {
    const s = G().fail(stateOf(a), sql);
    a = await save(a, { status: 'lost', prize: s.prize, finished_at: now.toISOString() });
    await writeAnswer(row, { sql, ok: false, reason, answered_at: now.toISOString(), tele, flags, version: B.version, graded_solution: q.solution });
    verdict = 'lost';
  }
  return { verdict, attempt: await viewOf(a, B) };
}
async function writeAnswer(row: any, patch: any) {
  must(await db.from('answers').update(patch).eq('id', row.id), 'answer update');
}

async function opRescue(me: any, body: any) {
  const B = await bank();
  let a = await liveAttempt(me, body, ['pending']);
  const q = question(B, a.ids[a.level - 1]);
  const last = must(await db.from('answers').select('*').eq('attempt_id', a.id).eq('level', a.level).not('answered_at', 'is', null).order('id', { ascending: false }).limit(1), 'answers')[0];
  if (body.use === true) {
    // No SQL slot here: the rescue re-runs only the answer already submitted (once per attempt, bounded by the engine).
    const s = G().rescue(stateOf(a), last ? last.sql : '');
    a = await save(a, { status: 'playing', used: s.used });
    await openQuestion(a);   // the retry on the same rung gets its own row and clock
    const out: any = { attempt: await viewOf(a, B), diag: last && last.sql ? (B.E.diagnose(q, last.sql, B.main) || []) : [] };
    if (q.mode !== 'select') out.checks = B.E.probesOf(q);
    return out;
  }
  if (body.use !== false) fail('bad-request', 'use must be true or false.');
  const s = G().fail(stateOf(a), last ? last.sql : '');
  a = await save(a, { status: 'lost', prize: s.prize, finished_at: new Date().toISOString() });
  return { attempt: await viewOf(a, B) };
}

async function opLifeline(me: any, body: any) {
  const B = await bank();
  const name = body.name;
  if (!['clause', 'template', 'review'].includes(name)) fail('bad-request', 'name must be clause, template or review.');
  let a = await liveAttempt(me, body, ['playing']);
  if (a.used[name]) fail('state', `${name} is already used in this attempt.`);
  const q = question(B, a.ids[a.level - 1]);
  if (name === 'review') {
    const sql = typeof body.sql === 'string' ? body.sql : '';
    if (!sql.trim()) return { attempt: await viewOf(a, B), diag: null };   // nothing to review: not spent
    if (sql.length > MAX_SQL) fail('bad-request', `The query is longer than ${MAX_SQL} characters.`);
    await claimSql(me);
    const diag = B.E.diagnose(q, sql, B.main);
    // Too heavy to run (refused statically or stopped by the limits): Review is not spent.
    if (diag === null) return { attempt: await viewOf(a, B), diag: null, refusal: { reason: 'unsupported', detail: 'This query is too heavy to run here: join fewer tables at once.' } };
    const s = G().useLifeline(stateOf(a), 'review');
    a = await save(a, { used: s.used });
    const out: any = { attempt: await viewOf(a, B), diag };
    if (q.mode !== 'select') out.checks = B.E.probesOf(q);
    return out;
  }
  const s = G().useLifeline(stateOf(a), name);
  a = await save(a, { used: s.used, shown: s.shown });
  if (name === 'clause') return { attempt: await viewOf(a, B), text: { en: q.clause_en, es: q.clause_es }, shape: B.E.shape(q, B.main) };
  return { attempt: await viewOf(a, B), sql: q.template, note: { en: q.template_note_en, es: q.template_note_es } };
}

async function opWalk(me: any, body: any) {
  const B = await bank();
  let a = await liveAttempt(me, body, ['playing']);
  const s = G().walkAway(stateOf(a));
  a = await save(a, { status: 'walked', prize: s.prize, finished_at: new Date().toISOString() });
  return { attempt: await viewOf(a, B) };
}

const rungOf = (a: any) => (a.status === 'won' ? 15 : Math.max(0, a.level - 1));

/* My attempts (the student's own record, #/game/historial): per mode the count, the last start, the best rung and the
   badge; then every real attempt, newest first, with its answer counts. Counts only: no SQL, no questions. */
async function opMyStats(me: any) {
  let atts = await fetchAll('attempts', () => db.from('attempts').select('id, mode, status, level, prize, used, test, started_at, deadline, finished_at, rev')
    .eq('user_id', me.user_id).eq('test', false).order('started_at').order('id'));
  atts = await Promise.all(atts.map(expireIfDue));
  const badges = must(await db.from('badges').select('mode, earned_at, attempt_id').eq('user_id', me.user_id), 'badges');
  const ids = atts.map((a: any) => a.id);
  const answers = ids.length
    ? await fetchAll('answers', () => db.from('answers').select('id, attempt_id, ok, answered_at').in('attempt_id', ids).order('id'))
    : [];
  const counts = new Map<string, { answered: number; right: number }>();
  for (const x of answers) {
    const c = counts.get(x.attempt_id) || { answered: 0, right: 0 };
    if (x.answered_at) { c.answered++; if (x.ok) c.right++; }
    counts.set(x.attempt_id, c);
  }
  const modes: any = {};
  for (const m of MODES) {
    const am = atts.filter((a: any) => a.mode === m);
    const b = badges.find((x: any) => x.mode === m);
    modes[m] = {
      count: am.length, last: am.length ? am[am.length - 1].started_at : null,
      best: am.reduce((x: number, a: any) => Math.max(x, rungOf(a)), 0), badge: b ? { earned_at: b.earned_at } : null,
    };
  }
  const badgeOf = new Set(badges.map((b: any) => b.attempt_id));
  const attempts = atts.slice().reverse().map((a: any) => {
    const c = counts.get(a.id) || { answered: 0, right: 0 };
    return {
      id: a.id, mode: a.mode, status: a.status, rung: rungOf(a), prize: a.prize, badge: badgeOf.has(a.id),
      answered: c.answered, right: c.right, used: a.used, started_at: a.started_at, finished_at: a.finished_at,
    };
  });
  return { modes, attempts };
}

/* ---- Teacher operations ----------------------------------------------------------------------- */

/* Every row of a query, page by page: the hosted API returns at most 1000 rows per request. build() must give a
   query with a stable order. */
async function fetchAll(label: string, build: () => any, page = 1000) {
  const out: any[] = [];
  for (let from = 0; ; from += page) {
    const rows = must(await build().range(from, from + page - 1), label);
    out.push(...rows);
    if (rows.length < page) return out;
  }
}

/* Everything the teacher's views and exports need: profiles, attempts (real and test), badges, answers. */
async function teacherData(answerCols: string) {
  const profiles = await fetchAll('profiles', () => db.from('profiles').select('user_id, email, name, role, created_at').order('email').order('user_id'));
  const atts = await fetchAll('attempts', () => db.from('attempts').select('id, user_id, mode, status, level, prize, used, test, started_at, deadline, finished_at').order('started_at').order('id'));
  const badges = await fetchAll('badges', () => db.from('badges').select('user_id, mode, earned_at, attempt_id').order('user_id').order('mode'));
  const answers = await fetchAll('answers', () => db.from('answers').select(answerCols).order('id'));
  return { profiles, atts, badges, answers };
}

async function opTList() {
  const { profiles, atts, badges, answers } = await teacherData('attempt_id, ok, answered_at');
  const byUser = new Map(profiles.map((p: any) => [p.user_id, p]));
  const students = profiles.map((p: any) => {
    const mine = atts.filter((a: any) => a.user_id === p.user_id);
    const attempts: any = {};
    const bs: any = {};
    for (const m of MODES) {
      const am = mine.filter((a: any) => a.mode === m && !a.test);
      attempts[m] = {
        count: am.length, last: am.reduce((x: any, a: any) => (!x || a.started_at > x ? a.started_at : x), null),
        best: am.reduce((x: number, a: any) => Math.max(x, rungOf(a)), 0), tests: mine.filter((a: any) => a.mode === m && a.test).length,
      };
      const b = badges.find((x: any) => x.user_id === p.user_id && x.mode === m);
      bs[m] = b ? { earned_at: b.earned_at, attempt_id: b.attempt_id } : null;
    }
    return { user_id: p.user_id, email: p.email, name: p.name, role: p.role, badges: bs, all_five: MODES.every((m) => bs[m]), attempts };
  });
  // Every attempt, newest first, real and test, with its owner's role and its answer counts.
  const counts = new Map<string, { answered: number; right: number }>();
  for (const x of answers) {
    const c = counts.get(x.attempt_id) || { answered: 0, right: 0 };
    if (x.answered_at) { c.answered++; if (x.ok) c.right++; }
    counts.set(x.attempt_id, c);
  }
  const badgeOf = new Set(badges.map((b: any) => b.attempt_id));
  const attempts = atts.slice().reverse().map((a: any) => {
    const p: any = byUser.get(a.user_id) || {};
    const c = counts.get(a.id) || { answered: 0, right: 0 };
    return {
      id: a.id, user_id: a.user_id, email: p.email, name: p.name, role: p.role, mode: a.mode, status: a.status, test: a.test,
      rung: rungOf(a), prize: a.prize, badge: badgeOf.has(a.id), answered: c.answered, right: c.right, used: a.used,
      started_at: a.started_at, deadline: a.deadline, finished_at: a.finished_at,
    };
  });
  return { students, attempts };
}

async function opTAttempt(body: any) {
  const B = await bank();
  const a = await expireIfDue(await loadAttempt(body.attemptId, null, { anyOwner: true }));
  const p = must(await db.from('profiles').select('email, name').eq('user_id', a.user_id).single(), 'profile');
  const answers = await answersOf(a.id);
  const questions = a.ids.map((id: string, i: number) => {
    const q = question(B, id);
    return {
      level: i + 1, id, prompt: { en: q.prompt_en, es: q.prompt_es }, solution: q.solution, main_only: q.main_only,
      answers: answers.filter((x: any) => x.level === i + 1).map((x: any) => ({
        sql: x.sql, ok: x.ok, reason: x.reason, shown_at: x.shown_at, answered_at: x.answered_at, tele: x.tele, flags: x.flags,
        // The bank this answer was graded with: when the question changed since, graded_solution is the reference used.
        version: x.version, graded_solution: x.graded_solution, stale: !!(x.answered_at && x.version && x.version !== B.version),
      })),
    };
  });
  return {
    attempt: { id: a.id, user_id: a.user_id, email: p.email, name: p.name, mode: a.mode, status: a.status, level: a.level, prize: a.prize, used: a.used, test: a.test, started_at: a.started_at, deadline: a.deadline, finished_at: a.finished_at },
    version: B.version,
    questions,
  };
}

async function opTOral(body: any) {
  const B = await bank();
  if (typeof body.userId !== 'string') fail('bad-request', 'userId is missing.');
  const badges = must(await db.from('badges').select('attempt_id, mode').eq('user_id', body.userId), 'badges');
  if (!badges.some((b: any) => b.attempt_id)) return { picks: [] };   // none, or purged
  const rows = must(await db.from('answers').select('attempt_id, level, question_id, sql, flags, answered_at').in('attempt_id', badges.map((b: any) => b.attempt_id).filter(Boolean)).eq('ok', true), 'answers');
  const pool = [...rows];
  const picks: any[] = [];
  while (pool.length && picks.length < 2) {
    const i = crypto.getRandomValues(new Uint32Array(1))[0] % pool.length;
    const x = pool.splice(i, 1)[0];
    const q = question(B, x.question_id);
    picks.push({ attempt_id: x.attempt_id, mode: q.mode, level: x.level, question_id: x.question_id, prompt: { en: q.prompt_en, es: q.prompt_es }, sql: x.sql, solution: q.solution, flags: x.flags, answered_at: x.answered_at });
  }
  return { picks };
}

// A cell that a spreadsheet would read as a formula (= + - @, tab, CR) gets a leading ' (CSV injection).
const csvCell = (v: any) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvOf = (rows: any[][]) => `${rows.map((r) => r.map(csvCell).join(',')).join('\n')}\n`;
const minutesBetween = (a: string | null, b: string | null) => (a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 60000) : '');

/* kind 'summary' (default): one line per account (students first, then teachers), the badges and the attempts per
   mode. kind 'answers': every answer of every attempt (real and test), with its attempt and its owner. */
async function opTCsv(body: any = {}) {
  if (body.kind === 'answers') {
    const { profiles, atts, badges, answers } = await teacherData('id, attempt_id, level, question_id, sql, ok, reason, shown_at, answered_at, tele, flags, version');
    const byUser = new Map(profiles.map((p: any) => [p.user_id, p]));
    const badgeOf = new Set(badges.map((b: any) => b.attempt_id));
    const byAttempt = new Map<string, any[]>();
    for (const x of answers) { if (!byAttempt.has(x.attempt_id)) byAttempt.set(x.attempt_id, []); byAttempt.get(x.attempt_id)!.push(x); }
    const rows: any[][] = [['role', 'email', 'name', 'attempt_id', 'mode', 'test', 'status', 'rung', 'prize', 'badge', 'started_at', 'deadline', 'finished_at', 'minutes',
      'used_clause', 'used_template', 'used_review', 'level', 'question_id', 'ok', 'reason', 'shown_at', 'answered_at', 'seconds', 'runs', 'flags', 'bank_version', 'sql']];
    for (const a of atts) {
      const p: any = byUser.get(a.user_id) || {};
      const head = [p.role, p.email, p.name, a.id, a.mode, a.test ? 'yes' : 'no', a.status, rungOf(a), a.prize, badgeOf.has(a.id) ? 'yes' : 'no',
        a.started_at, a.deadline, a.finished_at, minutesBetween(a.started_at, a.finished_at),
        a.used && a.used.clause ? 'yes' : 'no', a.used && a.used.template ? 'yes' : 'no', a.used && a.used.review ? 'yes' : 'no'];
      const list = byAttempt.get(a.id) || [];
      if (!list.length) rows.push([...head, '', '', '', '', '', '', '', '', '', '', '']);
      for (const x of list) {
        const secs = x.answered_at ? Math.round((Date.parse(x.answered_at) - Date.parse(x.shown_at)) / 1000) : '';
        rows.push([...head, x.level, x.question_id, x.answered_at ? (x.ok ? 'yes' : 'no') : '', x.reason, x.shown_at, x.answered_at, secs,
          x.tele && x.tele.runs !== undefined ? x.tele.runs : '', (x.flags || []).join(' '), x.version, x.sql]);
      }
    }
    return { csv: csvOf(rows) };
  }
  const { students } = await opTList();
  const rows: any[][] = [['email', 'name', 'role', ...MODES.flatMap((m) => [`${m}_badge`, `${m}_attempts`, `${m}_best_rung`, `${m}_tests`]), 'badges', 'all_five']];
  const ordered = [...students.filter((s: any) => s.role !== 'teacher'), ...students.filter((s: any) => s.role === 'teacher')];
  for (const s of ordered) {
    rows.push([s.email, s.name, s.role, ...MODES.flatMap((m) => [s.badges[m] ? s.badges[m].earned_at : '', s.attempts[m].count, s.attempts[m].best, s.attempts[m].tests]),
      MODES.filter((m) => s.badges[m]).length, s.all_five ? 'yes' : 'no']);
  }
  return { csv: csvOf(rows) };
}

async function testAttempt(me: any, body: any) {
  const a = await loadAttempt(body.attemptId, me);
  if (!a.test) fail('forbidden', 'Only test attempts can be jumped or forced.');
  if (!live(a)) fail('state', `The attempt is ${a.status}.`);
  return a;
}
async function opTJump(me: any, body: any) {
  const B = await bank();
  let a = await testAttempt(me, body);
  const level = Number(body.level);
  if (!Number.isInteger(level) || level < 1 || level > 15) fail('bad-request', 'level must be 1–15.');
  a = await save(a, { level, status: 'playing' });
  must(await db.from('answers').delete().eq('attempt_id', a.id).is('answered_at', null), 'answers');
  await openQuestion(a);
  return { attempt: await viewOf(a, B) };
}
async function opTForce(me: any, body: any) {
  const B = await bank();
  let a = await testAttempt(me, body);
  if (a.status !== 'playing') fail('state', 'Answer the rescue first.');
  const row = await openRow(a);
  await writeAnswer(row, { sql: '-- forced by the teacher (test attempt)', ok: true, reason: 'forced', answered_at: new Date().toISOString(), flags: ['forced'] });
  a = await passFrom(a, '-- forced');
  return { verdict: a.status === 'won' ? 'won' : 'pass', attempt: await viewOf(a, B) };
}

/* ---- The request ---------------------------------------------------------------------------- */

/* The sign-in methods of a session (the `amr` claim of the access token, already verified by getUser). */
function amrOf(jwt: string): string[] {
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(part.padEnd(Math.ceil(part.length / 4) * 4, '='));
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    return (Array.isArray(p.amr) ? p.amr : []).map((x: any) => String((x && x.method) || x));
  } catch (_e) { return []; }
}

/* One run of student SQL per user every SQL_GAP_MS, claimed atomically before it runs (parallel requests fail). */
async function claimSql(me: any) {
  const ok = must(await db.rpc('comp_claim', { p_user: me.user_id, p_gap_ms: SQL_GAP_MS }), 'comp_claim');
  if (ok !== true) fail('limit', 'Too fast: wait a moment and try again.');
}

function madridDay(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

async function who(req: Request) {
  const h = req.headers.get('Authorization') || '';
  const jwt = /^Bearer\s+(.+)$/i.exec(h)?.[1];
  if (!jwt) fail('auth', 'Sign in first.');
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data?.user) fail('auth', 'Your session has expired: sign in again.');
  const u = data.user;
  const email = String(u.email || '').toLowerCase();
  if (!EMAIL_RULE.test(email)) fail('domain', 'Only plain @cunef.edu accounts (no +tags) can play the competition.');
  // A mailbox the student controls: confirmed, and signed in with the email code (the JWT's amr), not a password.
  if (!u.email_confirmed_at) fail('auth', 'Confirm your email first: sign in with the code we email you.');
  if (!amrOf(jwt as string).some((m: string) => AMR_OK.includes(m))) fail('auth', 'Sign in with the code we email you.');
  let p = must(await db.from('profiles').select('*').eq('user_id', u.id).maybeSingle(), 'profile');
  if (!p) p = must(await db.from('profiles').upsert({ user_id: u.id, email }).select('*').single(), 'profile');
  return p;
}

const STUDENT_OPS: Record<string, (me: any, body: any) => Promise<any>> = {
  status: (me) => opStatus(me), 'my-stats': (me) => opMyStats(me), start: opStart, current: opCurrent, submit: opSubmit, rescue: opRescue, lifeline: opLifeline, walk: opWalk,
};
const TEACHER_OPS: Record<string, (me: any, body: any) => Promise<any>> = {
  't-list': () => opTList(), 't-attempt': (_me, b) => opTAttempt(b), 't-oral': (_me, b) => opTOral(b), 't-csv': (_me, b) => opTCsv(b), 't-jump': opTJump, 't-force': opTForce,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (req.method !== 'POST') fail('bad-request', 'Use POST.');
    let body: any;
    try { body = await req.json(); } catch (_e) { fail('bad-request', 'The body must be JSON.'); }
    if (!body || typeof body !== 'object' || typeof body.op !== 'string') fail('bad-request', 'op is missing.');
    const me = await who(req);
    if (STUDENT_OPS[body.op]) return json(await STUDENT_OPS[body.op](me, body));
    if (TEACHER_OPS[body.op]) {
      if (me.role !== 'teacher') fail('forbidden', 'Teachers only.');
      return json(await TEACHER_OPS[body.op](me, body));
    }
    fail('bad-request', `Unknown op ${body.op}.`);
  } catch (e) {
    if (e instanceof ApiError) return json({ error: { code: e.code, message: e.message } }, HTTP[e.code] || 400);
    console.error(e);
    return json({ error: { code: 'server', message: 'The server failed. Try again in a moment.' } }, 500);
  }
  return json({ error: { code: 'server', message: 'unreachable' } }, 500);
});
