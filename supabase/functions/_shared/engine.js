// The competitive grading engine (docs/game-quiz.md §15.4). Pure: it receives sql.js and the two game modules, so
// the same file runs in the Edge Function (Deno, supabase/functions/_shared/load.js wires it) and in Node
// (tools/check-comp-server.mjs, tools/comp-build.mjs wire it with tools/node_modules/sql.js and js/*.js).
//
//   const E = makeEngine({ SQL, O: OracleDialect, G: GameCore, schema, types })   one engine per database (§16):
//                                      schema/types of that database; without them, the shop's three tables
//   E.build(setup)                     a sql.js database with `setup` run (cached image per setup, per instance)
//   E.execute(setup, sql)              { cols, rows } | { error: { code?, text }, raw }  (a SELECT answer)
//   E.executeChecks(setup, sql, probes){ error?, changes, results }                   (a DML / DDL answer)
//   E.refusal(q, sql)                  null | { reason, expected?, detail? }: checkAnswer, unsafe, oracleCheck
//   E.judge(q, sql, { main, hidden })  { refusal } | { ok, main: {ok, reason}, hidden: {ok, reason} | null, error }
//                                      hidden is skipped only when q.main_only (or the answer is already wrong on
//                                      main); no hidden setup, or a reference that fails, THROWS (fail closed)
//   E.diagnose(q, sql, main)           GameCore.diagnose codes on the main dataset (never reference values); null
//                                      when the SQL is unsafe or stopped by LIMITS (Review is then not spent)
//   E.shape(q, main)                   select { cols, rows } | DML { changes, tables: { name: n } } | DDL null
//   E.flags(q, sql, tele, ms)          the indicator flags of one answer (§15.4 step 4); the page-reported ones
//                                      are prefixed self: (self:no-runs, self:pasted, self:left-tab)
//
// q is a server question: { id, mode, level, ordered, checks, solution, keywords, main_only }.
export const BASE_TABLES = ['customers', 'games', 'sales'];   // the shop's (the default database)

/* ---- Bounded execution ------------------------------------------------------------------------------
   sql.js cannot interrupt a running statement (no progress handler), so every FROM / JOIN source of every statement
   is rewritten to call ora_tick() once per row it reads: a base table as (SELECT * FROM t WHERE ora_tick(rowid)),
   any other source (view, WITH name, derived table) as (SELECT q.* FROM src AS q CROSS JOIN ora_ticker k
   WHERE ora_tick(k.rowid)) (the CROSS JOIN keeps the one-row ticker inside the source's loop). The ticks follow the
   real work of the joins, and ora_tick throws ORA-01013 past LIMITS (time or ticks): the run stops, nothing hangs.
   Results are capped at LIMITS.rows rows per statement (memory). The results are unchanged otherwise. */
export const LIMITS = { ms: 450, ticks: 2500000, rows: 20000 };
export const TIMEOUT = 'ORA-01013';
const STOP = `${TIMEOUT}: user requested cancel of current operation`;
export const SLOW_TEXT = 'This query takes too long to run here (it reads far more rows than the game needs). Join fewer tables at once, or filter first.';
const ALIAS_STOP = new Set('WHERE ON USING JOIN INNER LEFT RIGHT FULL CROSS NATURAL OUTER GROUP ORDER HAVING LIMIT UNION EXCEPT INTERSECT WINDOW SET VALUES RETURNING AND OR INDEXED NOT'.split(' '));

export function makeEngine({ SQL, O, G, schema = null, types = null }) {
  const TABLES = schema ? Object.keys(schema) : BASE_TABLES;
  const DB = schema ? { schema, types } : null;   // GameCore.defaultChecks(q, DB): the snapshots of these tables
  let budget = null;   // { until, ticks } while a run is bounded
  const tick = (_row) => {   // one argument (a rowid): sql.js registers the arity from fn.length
    if (budget) {
      budget.ticks += 1;
      if (budget.ticks > LIMITS.ticks || ((budget.ticks & 4095) === 0 && Date.now() > budget.until)) throw STOP;   // eslint-disable-line no-throw-literal
    }
    return 1;
  };
  const connect = (db) => {
    Object.entries(O.functions).forEach(([name, fn]) => db.create_function(name, fn));
    db.create_function('ora_tick', tick);
    db.run('PRAGMA foreign_keys = ON;');
    db.run('PRAGMA case_sensitive_like = ON;');
    // A one-row table in the main schema (a view cannot read the temp schema): equal in every copy, so the probes of
    // the student and of the reference see the same dictionary.
    db.run('CREATE TABLE IF NOT EXISTS ora_ticker (x); INSERT INTO ora_ticker SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM ora_ticker);');
    return db;
  };
  const images = new Map();
  function build(setup) {
    if (!images.has(setup)) {
      const d = connect(new SQL.Database());
      try {
        O.script(setup, { finish: true }).forEach((u) => u.sqls.forEach((q) => d.run(q)));
        images.set(setup, d.export());
      } finally { d.close(); }
    }
    return connect(new SQL.Database(images.get(setup)));
  }

  /* The SQLite statement with every FROM / JOIN source ticking (see above). */
  function arm(db, sql) {
    if (!/\b(FROM|JOIN)\b/i.test(sql)) return sql;
    const { out, lits } = O.mask(String(sql));
    const kinds = new Map();
    db.exec("SELECT lower(name), type FROM sqlite_master WHERE type IN ('table', 'view')").forEach((r) => r.values.forEach(([n, t]) => kinds.set(n, t)));
    const ctes = new Set([...out.matchAll(/(?:\bWITH\b(?:\s+RECURSIVE\b)?|,)\s*([A-Za-z_][\w$]*|§\d+§)\s*(?:\([^()]*\))?\s*AS\s*(?:NOT\s+)?(?:MATERIALIZED\s*)?\(/gi)].map((m) => m[1].toLowerCase()));
    ['connect_by_n'].forEach((n) => ctes.add(n));
    const nameOf = (tok) => (/^§\d+§$/.test(tok) ? lits[+tok.slice(1, -1)].replace(/^"|"$/g, '') : tok).toLowerCase();
    const closeAt = (s, open) => { let d = 0; for (let i = open; i < s.length; i++) { if (s[i] === '(') d++; else if (s[i] === ')') { d--; if (!d) return i; } } return -1; };
    let s = out;
    const hits = [...out.matchAll(/\b(FROM|JOIN)\b/gi)].map((m) => ({ at: m.index, kw: m[1].toUpperCase() })).reverse();
    for (const h of hits) {
      if (h.kw === 'FROM' && /\bDELETE\s*$/i.test(s.slice(0, h.at))) continue;   // DELETE FROM t: the target, not a source
      let p = h.at + h.kw.length;
      for (let n = 0; n < 50; n++) {
        while (/\s/.test(s[p] || '')) p++;
        let src = null;
        let end = p;
        let base = false;
        if (s[p] === '(') {
          const c = closeAt(s, p);
          if (c < 0) break;
          if (!/^\(\s*(SELECT|WITH|VALUES)\b/i.test(s.slice(p, c + 1))) break;   // a parenthesized join: left as is
          src = s.slice(p, c + 1);
          end = c + 1;
        } else {
          const m = /^((?:[A-Za-z_][\w$]*|§\d+§)(?:\s*\.\s*(?:[A-Za-z_][\w$]*|§\d+§))?)/.exec(s.slice(p));
          if (!m) break;
          end = p + m[0].length;
          if (/^\s*\(/.test(s.slice(end))) break;   // a table-valued function (pragma_table_info(…))
          const name = nameOf(m[1].split('.').pop().trim());
          if (/^(sqlite_|pragma_)/.test(name) || ALIAS_STOP.has(name.toUpperCase())) break;
          if (!ctes.has(name) && !kinds.has(name)) break;   // unknown: SQLite reports it as it is
          base = !ctes.has(name) && kinds.get(name) === 'table';
          src = m[1];
        }
        // The alias: [AS] name, unless the next word is a keyword.
        const am = /^\s+(?:AS\s+)?([A-Za-z_][\w$]*|§\d+§)/i.exec(s.slice(end));
        let alias = null;
        let stop = end;
        if (am && !ALIAS_STOP.has(am[1].toUpperCase())) { alias = am[1]; stop = end + am[0].length; }
        if (!alias && !src.startsWith('(')) alias = src.split('.').pop().trim();
        const wrapped = base
          ? `(SELECT * FROM ${src} WHERE ora_tick(rowid))`
          : `(SELECT ora_q.* FROM ${src} AS ora_q CROSS JOIN ora_ticker ora_k WHERE ora_tick(ora_k.rowid))`;
        const rep = `${wrapped}${alias ? ` ${alias}` : ''}`;
        s = s.slice(0, p) + rep + s.slice(stop);
        p += rep.length;
        if (h.kw !== 'FROM') break;
        const comma = /^\s*,/.exec(s.slice(p));
        if (!comma) break;
        p += comma[0].length;
      }
    }
    return O.unmask(s, lits);
  }

  /* db.exec with the sources armed and at most LIMITS.rows rows per statement. */
  function execCapped(db, sql) {
    const out = [];
    for (const st of db.iterateStatements(arm(db, sql))) {
      try {
        const rows = [];
        while (st.step()) {
          rows.push(st.get());
          if (rows.length > LIMITS.rows) throw STOP;   // eslint-disable-line no-throw-literal
        }
        if (rows.length) out.push({ columns: st.getColumnNames(), values: rows });
      } finally { st.free(); }
    }
    return out;
  }
  // What OracleDialect.runChecks sees: the same database, with bounded exec.
  const bounded = (db) => ({ exec: (q) => execCapped(db, q), getRowsModified: () => db.getRowsModified(), run: (q) => { execCapped(db, q); } });
  function within(fn) {
    budget = { until: Date.now() + LIMITS.ms, ticks: 0 };
    try { return fn(); } finally { budget = null; }
  }

  function execute(setup, text) {
    const db = build(setup);
    try {
      return within(() => {
        let res = null;
        for (const u of O.script(String(text))) {
          if (u.unsupported) return { error: { text: `unsupported: ${u.unsupported}` }, raw: 'unsupported' };
          let r = [];
          u.sqls.forEach((q) => { r = execCapped(db, q); });
          if (u.sqls.length) res = r.length ? r[0] : null;
        }
        return { cols: res ? res.columns : [], rows: res ? res.values : [] };
      });
    } catch (e) {
      const msg = String(e && e.message !== undefined ? e.message : e);
      const ora = O.oraError(msg, text, db);
      return { error: ora ? { code: ora.code, text: ora.text } : { text: msg }, raw: msg };
    } finally { db.close(); }
  }

  function executeChecks(setup, text, probes) {
    const db = build(setup);
    try { return within(() => O.runChecks(bounded(db), String(text), probes || [])); } catch (e) {
      const msg = String(e && e.message !== undefined ? e.message : e);
      const ora = O.oraError(msg, '', null);
      return { error: ora ? { code: ora.code, text: ora.text } : { text: msg }, changes: 0, results: [] };
    } finally { db.close(); }
  }
  // A run stopped by the limits (the answer, or any probe of it).
  const timedOut = (r) => !!r && ((r.error && r.error.code === TIMEOUT) || (Array.isArray(r.results) && r.results.some((x) => x && x.error && x.error.code === TIMEOUT)));

  const isSelect = (q) => G.modeOf(q) === 'select';
  const probesOf = (q) => G.defaultChecks(q, DB);
  const runOn = (q, setup, sql) => (isSelect(q) ? execute(setup, sql) : executeChecks(setup, sql, probesOf(q)));

  // Reference results, per question and setup (a warm instance runs each solution once per dataset).
  const refs = new Map();
  function reference(q, setup) {
    if (!refs.has(setup)) refs.set(setup, new Map());
    const per = refs.get(setup);
    const key = `${q.id}\u0000${q.solution}\u0000${JSON.stringify(q.checks || null)}`;
    if (!per.has(key)) per.set(key, runOn(q, setup, q.solution));
    return per.get(key);
  }

  /* Refused before it runs, at no cost (§15.4 step 1). */
  function refusal(q, sql) {
    const ca = G.checkAnswer(sql, G.modeOf(q));
    if (!ca.ok) {
      const r = { reason: ca.reason };
      if (ca.expected) r.expected = ca.expected;
      if (ca.detail !== undefined) r.detail = ca.detail;
      return r;
    }
    const u = G.unsafe(sql);
    if (u) return { reason: 'unsupported', detail: u.text };
    const ora = G.oracleCheck(sql, schema);
    if (ora) return { reason: 'oracle', detail: { code: ora.code || null, text: ora.text, column: ora.column || null } };
    return null;
  }

  function gradeOn(q, sql, setup, { hidden = false } = {}) {
    const want = reference(q, setup);
    // The reference must run on both datasets (comp-build checks it; a question that does not fit the hidden data is
    // main_only). If it fails anyway, grading stops with an error (fail closed): the server answers 'server' and
    // the student loses nothing.
    if (want.error) throw new Error(`reference ${q.id} fails on the ${hidden ? 'hidden' : 'public'} dataset: ${want.error.code || ''} ${want.error.text}`);
    const got = runOn(q, setup, sql);
    const g = isSelect(q) ? (got.error ? null : G.grade(got, want, !!q.ordered)) : G.gradeChecks(got, want);
    return { ok: !!(g && g.ok), reason: got.error ? 'error' : (g ? g.reason : 'error'), got, want, grade: g };
  }

  /* The verdict on both datasets (§15.4 steps 2–3). */
  function judge(q, sql, { main, hidden = null }) {
    const ref = refusal(q, sql);
    if (ref) return { refusal: ref };
    if (!q.main_only && !hidden) throw new Error(`no hidden dataset to grade ${q.id} (only main_only questions skip it)`);
    const m = gradeOn(q, sql, main);
    const h = !q.main_only && m.ok ? gradeOn(q, sql, hidden, { hidden: true }) : null;
    // Stopped by the limits: refused at no cost, as the static guard (GameCore.unsafe) would.
    if (timedOut(m.got) || (h && timedOut(h.got))) return { refusal: { reason: 'unsupported', detail: SLOW_TEXT } };
    return {
      ok: m.ok && (!h || h.ok),
      main: { ok: m.ok, reason: m.reason },
      hidden: h ? { ok: h.ok, reason: h.reason } : null,
      error: m.got.error || null,
    };
  }

  /* Review: GameCore.diagnose on the main dataset, as study mode does (codes only). */
  function diagnose(q, sql, main) {
    if (G.unsafe(sql)) return null;   // never run (Review is not spent)
    const want = reference(q, main);
    const ora = G.oracleCheck(sql, schema);
    if (isSelect(q)) {
      const got = ora ? { error: { code: ora.code, text: ora.text, column: ora.column || null, quoted: !!ora.quoted } } : execute(main, sql);
      if (timedOut(got)) return null;
      const g = got.error || want.error ? null : G.grade(got, want, !!q.ordered);
      return G.diagnose({ sql, error: got.error ? { ...got.error, raw: got.raw || '' } : null, grade: g, schema: schema || {} });
    }
    const got = ora ? { error: { code: ora.code, text: ora.text, column: ora.column || null, quoted: !!ora.quoted }, changes: 0, results: [] } : executeChecks(main, sql, probesOf(q));
    if (timedOut(got)) return null;
    return G.diagnose({ sql, error: got.error || null, grade: null, schema: schema || {}, checks: { got, want, probes: probesOf(q) } });
  }

  /* Key clause: the shape of the answer (counts only, on the main dataset). */
  const SNAP = TABLES.map((t, i) => [t, G.defaultChecks({ mode: 'insert' }, DB)[i]]);
  function shape(q, main) {
    const mode = G.modeOf(q);
    if (mode === 'select') {
      const r = reference(q, main);
      return r.error ? null : { cols: r.cols.length, rows: r.rows.length };
    }
    if (mode === 'ddl') return null;
    const probes = SNAP.map((x) => x[1]);
    const before = executeChecks(main, '', probes);
    const after = executeChecks(main, q.solution, probes);
    if (after.error) return null;
    const tables = {};
    SNAP.forEach(([t], i) => {
      const key = (row) => JSON.stringify(row[0]);
      const a = new Map(before.results[i].rows.map((r) => [key(r), JSON.stringify(r)]));
      const b = new Map(after.results[i].rows.map((r) => [key(r), JSON.stringify(r)]));
      let n = 0;
      a.forEach((v, k) => { if (!b.has(k) || b.get(k) !== v) n++; });
      b.forEach((v, k) => { if (!a.has(k)) n++; });
      if (n) tables[t] = n;
    });
    return { changes: after.changes, tables };
  }

  /* Indicator flags (stored for the teacher, never shown to the student). Measured by the server: fast (ms from the
     question shown to the answer), no-table, literal-list, no-clause (and streak, added by the function). Reported by
     the page, so only as trustworthy as the student's browser: self:no-runs, self:pasted, self:left-tab. */
  function flags(q, sql, tele, ms) {
    const f = [];
    const t = tele || {};
    const mode = G.modeOf(q);
    if (q.level >= 6 && Number.isFinite(ms) && ms < 60000) f.push('fast');
    if (!(Number(t.runs) > 0)) f.push('self:no-runs');
    if (Number(t.paste) > 0) f.push('self:pasted');
    if (Number(t.blur) >= 3) f.push('self:left-tab');
    const code = String(sql || '').replace(/'(?:[^']|'')*'|--[^\n]*|\/\*[\s\S]*?\*\//g, ' ');   // strings and comments aside
    if (mode !== 'ddl' && !new RegExp(`\\b(${TABLES.join('|')})\\b`, 'i').test(code)) f.push('no-table');
    if (/\bIN\s*\(\s*-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?){2,}\s*\)/i.test(code)) f.push('literal-list');
    const kws = Array.isArray(q.keywords) ? q.keywords : [];
    if (kws.length && !kws.some((k) => new RegExp(`\\b${String(k).trim().split(/\s+/).join('\\s+')}\\b`, 'i').test(code))) f.push('no-clause');
    return f;
  }

  return { build, execute, executeChecks, reference, refusal, judge, diagnose, shape, flags, probesOf, arm, timedOut, tables: TABLES };
}
