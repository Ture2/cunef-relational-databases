'use strict';

/* ==========================================================================
   Query for a Million (#/game): the pure game logic. No DOM, no t(): it also
   runs in Node (tools/check-game-bank.mjs). Contract: docs/game-quiz.md §4, §7.

   LADDER, SAFE, BANDS            the prize ladder, the safe rungs, the three bands
   band(level) / prize(level) / safePrize(answered)
   rng(seed)                      mulberry32: () => float in [0, 1)
   draw(bank, seed)               15 question ids, one per level
   newRun(bank, seed)             a fresh state
   pass / fail / rescue / walkAway / useLifeline   new state (never mutate the argument)
   checkQuery(sql)                is this one Oracle SELECT we can run and grade? 'unsupported' also covers what
                                  unsafe() flags and LIKE on a DATE column (refused without cost)
   unsafe(sql)                    null | { reason: 'recursive', text }: a query that could run without end
                                  (a WITH that reads itself); call it before Run
   oracleCheck(sql, schema?)      errors Oracle raises that SQLite does not, found statically: a column neither
                                  grouped nor aggregated (ORA-00937 / ORA-00979, with `column`), AS before a
                                  table alias (ORA-00933). { code, text, column } or null when fine
   grade(got, want, ordered)      the student's result against the reference; reason null | 'cols' | 'rows' |
                                  'order' | 'values', or 'error' when `got` carries an error
   diagnose({ sql, error, grade, schema })   what went wrong, as codes (never values of the reference):
                                  limit | unknown-name {name, kind, suggest, tables?} | group-by {column} |
                                  error {ora, text} | cols / rows {got, want} | order | values | match
   nearest(name, candidates)      the closest name by Levenshtein distance (<= 2), or null

   Modes (§13):
   MODES                          [{ key, kind, prefix }]: select SELECT r, insert INSERT ins, update UPDATE upd,
                                  delete DELETE del, ddl CREATE ddl, mixed MIX
   modeOf(q) / ready(bank, mode)  a question's mode (none = select) / every rung of the mode has a question
   draw(bank, seed, mode='select') / drawMixed(bank, seed) / newRun(bank, seed, mode='select')  (state.mode)
   mixedUnlocked(reached)         reached[m] >= 5 for the five base modes
   answered(state)                the highest rung a run answered right (for reached[mode])
   migrateV1(oldRun, oldBest)     { v: 2, runs: { select }, best: { select }, reached: { select } } (partial)
   kindOf(statementText)          'SELECT' | 'INSERT' | … | 'CREATE TABLE' | 'ALTER TABLE ADD' | 'DROP TABLE' …
   checkAnswer(sql, mode)         { ok } | { ok: false, reason: 'empty' | 'many' | 'wrong-kind' | 'unsupported' |
                                  'lint', expected?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE', detail? }
   defaultChecks(q)               the probes that grade q (DML: snapshots of the three tables)
   gradeChecks(got, want)         { ok, reason: null | 'error' | 'probe', probe, detail } on executeChecks results
   diagnose({ …, checks: { got, want, probes } })   adds table {table, got, want} | table-values {table} |
                                  constraint {ora} | probe {index, expectError}
   ========================================================================== */

const GameCore = (() => {
  // In the browser OracleDialect is a global (js/oracle-dialect.js loads first); in Node, require it.
  // eslint-disable-next-line no-undef
  const OD = typeof OracleDialect !== 'undefined' ? OracleDialect : require('./oracle-dialect.js');

  /* ---- Ladder ------------------------------------------------------------------------- */

  const LADDER = [100, 250, 500, 1000, 2500, 5000, 10000, 20000, 40000, 75000, 125000, 250000, 400000, 600000, 1000000];
  const SAFE = [5, 10];
  const BANDS = [{ key: 'easy', from: 1, to: 5 }, { key: 'medium', from: 6, to: 10 }, { key: 'hard', from: 11, to: 15 }];
  const TOP = LADDER.length;

  const band = (level) => (BANDS.find((b) => level >= b.from && level <= b.to) || (level < 1 ? BANDS[0] : BANDS[BANDS.length - 1])).key;
  const prize = (level) => (level >= 1 ? LADDER[Math.min(level, TOP) - 1] : 0);
  const safePrize = (answered) => prize(SAFE.filter((s) => s <= answered).pop() || 0);

  /* ---- Random draw -------------------------------------------------------------------- */

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---- Modes (§13) --------------------------------------------------------------------- */

  // The five playable modes, in tile order, then the mixed mode. `kind` is the statement the mode accepts.
  const MODES = [
    { key: 'select', kind: 'SELECT', prefix: 'r' },
    { key: 'insert', kind: 'INSERT', prefix: 'ins' },
    { key: 'update', kind: 'UPDATE', prefix: 'upd' },
    { key: 'delete', kind: 'DELETE', prefix: 'del' },
    { key: 'ddl', kind: 'CREATE', prefix: 'ddl' },
    { key: 'mixed', kind: 'MIX', prefix: null },
  ];
  const BASE = MODES.filter((m) => m.key !== 'mixed').map((m) => m.key);
  const modeOf = (q) => (q && q.mode) || 'select';   // the select questions of data/game-bank.js have no mode
  const questionsOf = (bank, mode) => bank.questions.filter((q) => modeOf(q) === mode);
  // Every rung of the mode has at least one question (a bank still being written may not).
  const ready = (bank, mode) => (mode === 'mixed' ? BASE.every((m) => ready(bank, m))
    : Array.from({ length: TOP }, (_, i) => i + 1).every((l) => questionsOf(bank, mode).some((q) => q.level === l)));

  function draw(bank, seed, mode = 'select') {
    if (mode === 'mixed') return drawMixed(bank, seed);
    const r = rng(seed);
    const ids = [];
    const all = questionsOf(bank, mode);
    for (let level = 1; level <= TOP; level++) {
      const pool = all.filter((q) => q.level === level);
      if (!pool.length) throw new Error(`GameCore.draw: no ${mode} question for level ${level}`);
      ids.push(pool[Math.floor(r() * pool.length)].id);
    }
    return ids;
  }

  /* Mixed: in each band every base mode once, in a seeded order; the question of that mode is drawn at that level.
     While a bank is incomplete, a level that mode lacks falls back to a select question of that level. */
  function drawMixed(bank, seed) {
    const r = rng(seed);
    const ids = [];
    BANDS.forEach((b) => {
      const order = [...BASE];
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      order.forEach((m, i) => {
        const level = b.from + i;
        let pool = questionsOf(bank, m).filter((q) => q.level === level);
        if (!pool.length) pool = questionsOf(bank, 'select').filter((q) => q.level === level);
        if (!pool.length) throw new Error(`GameCore.drawMixed: no question for level ${level}`);
        ids.push(pool[Math.floor(r() * pool.length)].id);
      });
    });
    return ids;
  }

  // reached = { <mode>: highest rung answered right in any run }; mixed opens at rung 5 of every base mode.
  const mixedUnlocked = (reached) => BASE.every((m) => Number((reached || {})[m]) >= 5);
  // The highest rung answered right in a run (a loss or a walk-away keeps what was answered).
  const answered = (state) => (!state ? 0 : state.status === 'won' ? TOP : Math.max(0, (state.level || 1) - 1));

  /* v1 → v2 (§13.4): the old run becomes runs.select (with its mode), its answered rungs reached.select, the old best
     best.select. Returns a partial v2 store; the page merges it and deletes the v1 keys. */
  // The highest rung whose prize is at most `p` (0 for no prize): the rung a best score proves was reached.
  const rungOf = (p) => LADDER.filter((x) => x <= (Number(p) || 0)).length;
  function migrateV1(oldRun, oldBest) {
    const out = { v: 2, runs: {}, best: {}, reached: {} };
    let rung = 0;
    if (oldRun && typeof oldRun === 'object' && Array.isArray(oldRun.ids)) {
      out.runs.select = { ...copy(oldRun), mode: 'select' };
      rung = answered(oldRun);
    }
    if (oldBest && Number.isFinite(oldBest.prize)) {
      out.best.select = { prize: oldBest.prize, date: oldBest.date || null };
      rung = Math.max(rung, rungOf(oldBest.prize));   // an earlier, better run counts too
    }
    if (rung || out.runs.select) out.reached.select = rung;
    return out;
  }

  /* ---- State -------------------------------------------------------------------------- */

  const copy = (state) => JSON.parse(JSON.stringify(state));
  const current = (state) => state.ids[state.level - 1];
  function playing(state, what) {
    if (!state || state.status !== 'playing') throw new Error(`GameCore.${what}: the run is not being played`);
    return copy(state);
  }

  function newRun(bank, seed, mode = 'select') {
    const s = seed >>> 0;
    return {
      v: 1,
      mode,
      seed: s,
      ids: draw(bank, s, mode),
      level: 1,
      status: 'playing',
      prize: 0,
      used: { clause: false, template: false, review: false },
      answers: [],
      shown: { clause: null, template: null },
      started: new Date().toISOString(),
    };
  }

  function pass(state, sql) {
    const s = playing(state, 'pass');
    s.answers.push({ id: current(s), sql: String(sql), ok: true });
    if (s.level >= TOP) { s.status = 'won'; s.prize = prize(TOP); } else s.level += 1;
    return s;
  }

  function fail(state, sql) {
    const s = playing(state, 'fail');
    s.answers.push({ id: current(s), sql: String(sql), ok: false });
    s.status = 'lost';
    s.prize = safePrize(s.level - 1);
    return s;
  }

  function rescue(state, sql) {
    const s = playing(state, 'rescue');
    if (s.used.review) throw new Error('GameCore.rescue: Review is already used');
    s.answers.push({ id: current(s), sql: String(sql), ok: false });
    s.used.review = true;
    return s;
  }

  function walkAway(state) {
    const s = playing(state, 'walkAway');
    s.status = 'walked';
    s.prize = prize(s.level - 1);
    return s;
  }

  function useLifeline(state, name) {
    const s = playing(state, 'useLifeline');
    if (!['clause', 'template', 'review'].includes(name)) throw new Error(`GameCore.useLifeline: unknown lifeline ${name}`);
    // A saved state of an older shape may lack some keys: missing means unused / not shown.
    s.used = { clause: false, template: false, review: false, ...(s.used || {}) };
    s.shown = { clause: null, template: null, ...(s.shown || {}) };
    if (s.used[name]) throw new Error(`GameCore.useLifeline: ${name} is already used`);
    s.used[name] = true;
    if (name in s.shown) s.shown[name] = current(s);
    return s;
  }

  /* ---- SQL text helpers ---------------------------------------------------------------- */

  // The text with strings masked (§n§) and comments blanked.
  function bare(sql) {
    const { out, lits } = OD.mask(String(sql));
    return { text: out.replace(/§(\d+)§/g, (x, i) => (/^(--|\/\*)/.test(lits[+i]) ? ' ' : x)), lits };
  }

  // The same text with everything inside parentheses replaced by '_' (same length): depth-0 view.
  function flat(s) {
    let d = 0;
    let out = '';
    for (const ch of s) {
      if (ch === '(') { out += d ? '_' : ch; d++; } else if (ch === ')') { d = Math.max(0, d - 1); out += d ? '_' : ch; } else out += d ? '_' : ch;
    }
    return out;
  }

  function splitTop(s) {
    const parts = [];
    let d = 0;
    let cur = '';
    for (const ch of s) {
      if (ch === '(') d++;
      if (ch === ')') d--;
      if (ch === ',' && d === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  function closeOf(s, open) {
    let d = 0;
    for (let i = open; i < s.length; i++) {
      if (s[i] === '(') d++;
      else if (s[i] === ')') { d--; if (!d) return i; }
    }
    return s.length - 1;
  }

  // Replace every (SELECT …) group, and every call of one of `names`, with ' 0 '.
  function dropGroups(s, test) {
    for (let guard = 0; guard < 200; guard++) {
      let hit = null;
      const re = /(\b[A-Za-z_]\w*\s*)?\(/g;
      let m;
      while ((m = re.exec(s))) {
        const open = m.index + m[0].length - 1;
        if (test(m[1] ? m[1].trim() : '', s.slice(open + 1))) { hit = { start: m.index, open }; break; }
      }
      if (!hit) break;
      s = `${s.slice(0, hit.start)} 0 ${s.slice(closeOf(s, hit.open) + 1)}`;
    }
    return s;
  }
  const AGG = /^(COUNT|SUM|AVG|MIN|MAX|LISTAGG|STDDEV|VARIANCE|MEDIAN)$/i;
  // A subquery is (SELECT …) after an operator, or after EXISTS / IN / ANY / ALL / SOME (keywords, not functions).
  const noSubqueries = (s) => dropGroups(s, (name, rest) => (!name || /^(EXISTS|IN|ANY|ALL|SOME)$/i.test(name)) && /^\s*(SELECT|WITH)\b/i.test(rest));
  const noAggregates = (s) => dropGroups(s, (name) => AGG.test(name));
  const hasAggregate = (s) => /\b(COUNT|SUM|AVG|MIN|MAX|LISTAGG|STDDEV|VARIANCE|MEDIAN)\s*\(/i.test(noSubqueries(s));

  const WORDS = new Set(('SELECT FROM WHERE AND OR NOT NULL IS IN LIKE ESCAPE BETWEEN AS CASE WHEN THEN ELSE END DISTINCT '
    + 'ALL ANY SOME EXISTS YEAR MONTH DAY HOUR MINUTE SECOND DATE TIMESTAMP INTERVAL ASC DESC NULLS FIRST LAST ON JOIN '
    + 'SYSDATE CURRENT_DATE SYSTIMESTAMP ROWNUM LEVEL DUAL TRUE FALSE OVER PARTITION BY').split(' '));
  const norm = (s) => s.replace(/\s+/g, ' ').replace(/\s*([(),.*+\-/|=<>])\s*/g, '$1').trim().toLowerCase();
  const stripPrefix = (c) => c.split('.').pop().toLowerCase();
  // Column references: names that are not keywords, not function names, not masked strings.
  function columnRefs(s) {
    const out = [];
    const re = /(§\d+§)|\b([A-Za-z_][\w$#]*(?:\.[A-Za-z_][\w$#]*)?)\b(\s*\()?/g;
    let m;
    while ((m = re.exec(s))) {
      if (m[1] || m[3] || WORDS.has(m[2].toUpperCase()) || /^\d/.test(m[2])) continue;
      out.push(stripPrefix(m[2]));
    }
    return out;
  }
  function stripAlias(item) {
    const m = /^([\s\S]*?\S)\s+(?:AS\s+)?("[^"]*"|[A-Za-z_][\w$#]*)$/i.exec(item.trim());
    if (m && !WORDS.has(m[2].toUpperCase()) && !/(^|[\s(,])(AS|[-+*/|=<>,(])$/i.test(m[1])) return { expr: m[1].trim(), alias: m[2].replace(/"/g, '').toLowerCase() };
    return { expr: item.trim(), alias: null };
  }

  // The schema to check names against: the argument, else the page's GAME_BANK (browser), else none.
  // eslint-disable-next-line no-undef
  const schemaOf = (schema) => schema || (typeof GAME_BANK !== 'undefined' && GAME_BANK && GAME_BANK.schema) || null;
  const isDateColumn = (name) => /(^|_)date$/i.test(name);

  /* The table references of every FROM clause, at any depth: [{ name, alias?, as }] where `as` says the alias was
     written with AS (Oracle refuses that). A derived table (SELECT …) has name '(…)'. `groups`, when given, gets one
     entry per FROM clause: the number of sources it lists (tables, derived tables, joins). */
  function tableRefs(text, groups = null) {
    const out = [];
    const re = /\bFROM\b/gi;
    let m;
    while ((m = re.exec(text))) {
      let d = 0;
      let j = m.index + m[0].length;
      for (; j < text.length; j++) {
        if (text[j] === '(') d++;
        else if (text[j] === ')') { if (!d) break; d--; } else if (!d && (text[j] === ';' || /^\b(WHERE|GROUP|HAVING|ORDER|FETCH|OFFSET|UNION|INTERSECT|MINUS|EXCEPT|CONNECT|START|WINDOW)\b/i.test(text.slice(j, j + 10)) && /\W/.test(text[j - 1] || ' '))) break;
      }
      const list = flat(text.slice(m.index + m[0].length, j));
      if (groups && !/\(\s*(YEAR|MONTH|DAY|HOUR|MINUTE|SECOND)\s*$/i.test(text.slice(0, m.index))) groups.push(list.split(/,|\bJOIN\b/i).length);   // not EXTRACT(… FROM …)
      list.split(/,|\b(?:NATURAL\s+|INNER\s+|CROSS\s+|(?:LEFT|RIGHT|FULL)\s+(?:OUTER\s+)?)?JOIN\b/i).forEach((piece) => {
        const ref = piece.split(/\b(?:ON|USING)\b/i)[0].trim();
        const r = /^(\([_\s]*\)|[A-Za-z_][\w$#.]*)(?:\s+(AS\s+)?("?[A-Za-z_][\w$#]*"?))?$/i.exec(ref);
        if (r) out.push({ name: r[1].startsWith('(') ? '(…)' : r[1].toLowerCase(), alias: r[3] ? r[3].replace(/"/g, '').toLowerCase() : null, as: !!r[2] });
      });
    }
    return out;
  }

  /* Queries that could run without end in the browser: a WITH that reads itself (recursive CTE), also when its
     name is written in double quotes. */
  const RECURSIVE_TEXT = 'A recursive WITH (a query that reads its own result) can run without end in the browser sandbox, so it is not run here. Copy it to FreeSQL to try it.';
  /* Queries too heavy to run here (neither the sandbox nor the competition server can stop a query once it runs):
     more than MAX_SOURCES sources in one FROM (a product of many tables), a CONNECT BY generator above MAX_LEVEL
     rows, or SQLite functions that build huge values (zeroblob, randomblob, printf / format). The game needs none. */
  const MAX_SOURCES = 3;
  const MAX_LEVEL = 1000;
  const HEAVY_TEXT = `This query could run for minutes: it joins more than ${MAX_SOURCES} tables in one FROM, or generates too many rows. Join fewer tables at once (a subquery can filter first).`;
  function unsafe(sql) {
    const { text: raw, lits } = bare(sql);
    // Quoted names ("r") read as plain names here, so that a quoted recursive WITH is caught too.
    const text = raw.replace(/§(\d+)§/g, (x, i) => (/^"/.test(lits[+i]) ? lits[+i].slice(1, -1).replace(/[^\w$#]/g, '_') || '_' : x));
    const re = /(?:\bWITH\b(?:\s+RECURSIVE\b)?|,)\s*([A-Za-z_][\w$#]*)\s*(?:\([^()]*\))?\s*AS\s*\(/gi;
    let m;
    while ((m = re.exec(text))) {
      const open = m.index + m[0].length - 1;
      const body = text.slice(open + 1, closeOf(text, open));
      if (tableRefs(body).some((t) => t.name === m[1].toLowerCase())) return { reason: 'recursive', text: RECURSIVE_TEXT };
    }
    const groups = [];
    tableRefs(text, groups);
    if (groups.some((n) => n > MAX_SOURCES)) return { reason: 'heavy', text: HEAVY_TEXT };
    const lv = /\bCONNECT\s+BY\b[\s\S]*?\bLEVEL\s*(<=?)\s*(\d+)/i.exec(text);
    if (lv && +lv[2] - (lv[1] === '<' ? 1 : 0) > MAX_LEVEL) return { reason: 'heavy', text: HEAVY_TEXT };
    if (/\b(zeroblob|randomblob|printf|format)\s*\(/i.test(text)) return { reason: 'heavy', text: HEAVY_TEXT };
    return null;
  }

  /* Things the sandbox cannot reproduce, refused before they run (checkQuery 'unsupported'): LIKE on a DATE
     column compares Oracle's date text (such as 15-JAN-25 under the default NLS format), not YYYY-MM-DD. */
  const DATE_LIKE_TEXT = 'LIKE on a DATE column: Oracle compares the date as text in its own format (such as 15-JAN-25), which this sandbox does not reproduce. Use EXTRACT(YEAR FROM …) or a range of DATE literals.';
  function dateLike(text) {
    return [...text.matchAll(/\b(?:[A-Za-z_]\w*\.)?([A-Za-z_]\w*)\s+(?:NOT\s+)?LIKE\b/gi)].some((x) => isDateColumn(x[1]));
  }

  /* Errors that Oracle raises and SQLite does not, found statically (null when there is none):
     - AS before a table alias (games AS g, (SELECT …) AS t): ORA-00933;
     - a double-quoted name that is not a real name ("Puzzle" written as a string, "title" in lower case): ORA-00904;
     - a select-list alias used in WHERE: ORA-00904 (aliases are fine in GROUP BY, HAVING and ORDER BY on 23ai);
     - a selected (or ordered, or HAVING) column neither grouped nor aggregated: ORA-00937 / ORA-00979;
     - LIKE on a DATE column: code null, not reproducible here (see DATE_LIKE_TEXT).
     The names come from `schema` (or GAME_BANK.schema in the page); without one the name checks are skipped.
     A script is checked statement by statement (DML and DDL answers); each statement also meets the SQLite-only
     forms Oracle refuses: INSERT OR … (ORA-00925), UPDATE OR … (ORA-00903), UPDATE t AS a (ORA-00971),
     ALTER TABLE … ADD COLUMN (ORA-00904) and WITH … INSERT | UPDATE | DELETE (ORA-00928). */
  function oracleCheck(sql, schema) {
    let units = [];
    try { units = OD.script(String(sql == null ? '' : sql)); } catch (e) { units = []; }
    if (units.length > 1) {
      for (const u of units) { const r = oracleCheckOne(u.text, schema); if (r) return r; }
      return null;
    }
    return oracleCheckOne(sql, schema);
  }
  const ORA = (code, text) => ({ code, text, column: null });
  function oracleCheckOne(sql, schema) {
    const { text, lits } = bare(sql);
    const head = text.trim().replace(/^\(+\s*/, '').replace(/\s+/g, ' ');
    if (/^INSERT OR\b/i.test(head)) return ORA('ORA-00925', 'missing INTO keyword');
    if (/^UPDATE OR\b/i.test(head)) return ORA('ORA-00903', 'invalid table name');
    if (/^UPDATE [\w$#.]+ AS\b/i.test(head)) return ORA('ORA-00971', 'missing SET keyword');
    if (/^ALTER TABLE [\w$#.]+ ADD COLUMN\b/i.test(head)) return ORA('ORA-00904', ': invalid identifier');
    if (/^WITH\b/i.test(head) && kindOf(sql) !== 'SELECT') return ORA('ORA-00928', 'missing SELECT keyword');
    const isDDL = /^(CREATE|ALTER|DROP)\b/i.test(head);
    const S = schemaOf(schema);
    const tables = S ? Object.keys(S) : [];
    const cols = S ? new Set(Object.values(S).flat().map((c) => c.toLowerCase())) : null;
    if (tableRefs(text).some((t) => t.as)) return { code: 'ORA-00933', text: 'SQL command not properly ended', column: null };
    if (dateLike(text)) return { code: null, text: DATE_LIKE_TEXT, column: null };

    // Double-quoted names: Oracle keeps their case, so only "TITLE" (upper case) names the column title. A quoted
    // alias being defined (AS "Total", or right before a comma or FROM) is fine, and so are references to it.
    // DDL defines names: its quoted names are judged by checkAnswer (QUOTED_TEXT), not here.
    if (S && !isDDL) {
      const defined = new Set();
      const quoted = [];
      text.replace(/§(\d+)§/g, (x, i, at) => {
        const lit = lits[+i];
        if (!/^"/.test(lit)) return x;
        const name = lit.slice(1, -1);
        const before = text.slice(0, at);
        // An alias follows an expression: after AS, or after a name / ) / literal and before a comma or FROM.
        const afterExpr = /[\w)§]\s+$/.test(before) && !/\b(SELECT|DISTINCT|UNIQUE|ALL)\s+$/i.test(before);
        if (/\bAS\s*$/i.test(before) || (afterExpr && /^\s*(,|\bFROM\b)/i.test(text.slice(at + x.length)))) defined.add(name);
        else quoted.push(name);
        return x;
      });
      const names = new Set([...tables, ...cols]);
      tableRefs(text).forEach((t) => t.alias && names.add(t.alias));
      const badName = quoted.find((n) => !defined.has(n) && !(n === n.toUpperCase() && names.has(n.toLowerCase())));
      if (badName !== undefined) return { code: 'ORA-00904', text: `"${badName}": invalid identifier`, column: badName, quoted: true };
    }

    const f = flat(text);
    const sel = /\bSELECT\b/i.exec(f);
    if (!sel) return null;
    const after = sel.index + sel[0].length;
    const endM = /\b(UNION|INTERSECT|MINUS|EXCEPT)\b/i.exec(f.slice(after));
    const end = endM ? after + endM.index : f.length;
    const seg = text.slice(after, end);
    const fseg = f.slice(after, end);
    const pos = (re) => { const m = re.exec(fseg); return m ? { at: m.index, len: m[0].length } : null; };
    const kw = {
      from: pos(/\bFROM\b/i), where: pos(/\bWHERE\b/i), group: pos(/\bGROUP\s+BY\b/i), having: pos(/\bHAVING\b/i),
      order: pos(/\bORDER\s+BY\b/i), fetch: pos(/\b(FETCH|OFFSET)\b/i),
    };
    if (!kw.from) return null;
    const stops = Object.values(kw).filter(Boolean).map((k) => k.at).concat(seg.length);
    const body = (k) => (k ? seg.slice(k.at + k.len, Math.min(...stops.filter((x) => x > k.at))) : '');
    const list = seg.slice(0, kw.from.at).replace(/^\s*(DISTINCT|UNIQUE|ALL)\b/i, '');
    const items = splitTop(list);
    // Select-list aliases (a name that is also a real column means the column, as in Oracle).
    // Column names a query may read besides the schema's: those defined inside parentheses (CTE and derived-table
    // columns: AS name, or a CTE's column list).
    const inner = new Set();
    [...text.matchAll(/\bAS\s+"?([A-Za-z_][\w$#]*)/gi)].forEach((x) => { if (f[x.index] === '_') inner.add(x[1].toLowerCase()); });
    [...text.matchAll(/\b[A-Za-z_]\w*\s*\(([^()]*)\)\s*AS\s*\(/gi)].forEach((x) => x[1].split(',').forEach((c) => inner.add(c.trim().toLowerCase())));
    const real = (name) => (cols && cols.has(name)) || inner.has(name);
    const aliasExpr = new Map();
    items.forEach((it) => {
      const { expr, alias } = stripAlias(it);
      if (alias && !real(alias)) aliasExpr.set(alias, expr);
    });
    const plainNames = (s) => [...s.matchAll(/(^|[^.\w$#§])([A-Za-z_][\w$#]*)\b(?!\s*[.(])/g)].map((x) => x[2].toLowerCase()).filter((n) => !WORDS.has(n.toUpperCase()));
    const unalias = (s) => s.replace(/(^|[^.\w$#§])([A-Za-z_][\w$#]*)\b(?!\s*[.(])/g, (x, pre, name) => (aliasExpr.has(name.toLowerCase()) ? `${pre}(${aliasExpr.get(name.toLowerCase())})` : x));
    if (cols && kw.where) {
      const used = plainNames(noSubqueries(body(kw.where))).find((n) => aliasExpr.has(n));
      if (used) return { code: 'ORA-00904', text: `"${used.toUpperCase()}": invalid identifier`, column: used };
    }
    const groups = kw.group ? splitTop(body(kw.group)).map((g) => {
      const a = aliasExpr.get(norm(g).replace(/"/g, ''));
      return norm(a || g);
    }) : [];
    const groupCols = new Set(groups.flatMap((g) => columnRefs(g)));
    const having = unalias(body(kw.having));
    const order = kw.order ? splitTop(body(kw.order)) : [];
    const aggregated = !!kw.group || items.some(hasAggregate) || hasAggregate(having);
    if (!aggregated) return null;
    const err = kw.group ? { code: 'ORA-00979', text: 'not a GROUP BY expression' } : { code: 'ORA-00937', text: 'not a single-group group function' };
    const aliases = new Set();
    const bad = (expr) => {
      if (/\bOVER\s*\(/i.test(expr)) return false;
      if (groups.includes(norm(expr))) return false;
      const rest = noAggregates(noSubqueries(expr));
      if (/^(\w+\s*\.\s*)?\*$/.test(rest.trim())) return true;   // SELECT * / t.*
      return columnRefs(rest).some((c) => !groupCols.has(c));
    };
    for (const it of items) {
      const { expr, alias } = stripAlias(it);
      if (alias) aliases.add(alias);
      if (bad(expr)) return { ...err, column: columnRefs(noAggregates(noSubqueries(expr))).find((c) => !groupCols.has(c)) || '*' };
    }
    if (having && columnRefs(noAggregates(noSubqueries(having))).some((c) => !groupCols.has(c))) {
      return { ...err, column: columnRefs(noAggregates(noSubqueries(having))).find((c) => !groupCols.has(c)) };
    }
    for (const o of order) {
      const expr = o.replace(/\s+NULLS\s+(FIRST|LAST)\s*$/i, '').replace(/\s+(ASC|DESC)\s*$/i, '').trim();
      if (/^\d+$/.test(expr) || aliases.has(expr.replace(/"/g, '').toLowerCase())) continue;
      if (bad(expr)) return { ...err, column: columnRefs(noAggregates(noSubqueries(expr))).find((c) => !groupCols.has(c)) };
    }
    return null;
  }

  /* ---- Is it one query we can grade? ------------------------------------------------------ */

  function checkQuery(sql) {
    const text = String(sql == null ? '' : sql);
    if (!bare(text).text.replace(/;/g, '').trim()) return { ok: false, reason: 'empty' };
    const units = OD.script(text);
    if (!units.length) return { ok: false, reason: 'empty' };
    if (units.length > 1) return { ok: false, reason: 'many', detail: units.length };
    const u = units[0];
    const head = bare(u.text).text.trim().replace(/^\(+\s*/, '');
    const word = (/^[A-Za-z]+/.exec(head) || [''])[0].toUpperCase();
    const isQuery = word === 'SELECT' || (word === 'WITH' && !/\b(INSERT|UPDATE|DELETE|MERGE)\b/i.test(head));
    if (!isQuery && !u.unsupported) return { ok: false, reason: 'not-query', detail: word };
    if (u.unsupported) return { ok: false, reason: 'unsupported', detail: u.unsupported };
    if (!isQuery || u.sqls.length !== 1) return { ok: false, reason: 'not-query', detail: word };
    const risky = unsafe(text);
    if (risky) return { ok: false, reason: 'unsupported', detail: risky.text };
    if (dateLike(bare(text).text)) return { ok: false, reason: 'unsupported', detail: DATE_LIKE_TEXT };
    const lint = refusing(OD.lint(text));
    if (lint.length) return { ok: false, reason: 'lint', detail: lint };
    return { ok: true };
  }

  /* ---- Is it an answer of this mode? (§13)-------------------------------------------------- */

  // The kind of one statement, as the student wrote it.
  function kindOf(unitText) {
    const h = bare(unitText).text.trim().replace(/^\(+\s*/, '').replace(/\s+/g, ' ');
    if (/^(SELECT|WITH)\b/i.test(h)) {
      const dml = /\b(INSERT|UPDATE|DELETE|MERGE)\b/i.exec(h);
      return /^WITH/i.test(h) && dml ? dml[1].toUpperCase() : 'SELECT';
    }
    if (/^CREATE (GLOBAL TEMPORARY )?TABLE\b/i.test(h)) return 'CREATE TABLE';
    if (/^CREATE (OR REPLACE )?((NO)?FORCE )?VIEW\b/i.test(h)) return 'CREATE VIEW';
    if (/^CREATE (UNIQUE |BITMAP )?INDEX\b/i.test(h)) return 'CREATE INDEX';
    if (/^ALTER TABLE \S+ ADD\b/i.test(h)) return 'ALTER TABLE ADD';
    if (/^ALTER TABLE \S+ DROP (COLUMN\b|\()/i.test(h)) return 'ALTER TABLE DROP COLUMN';
    if (/^ALTER TABLE \S+ \w+/i.test(h)) return `ALTER TABLE ${/^ALTER TABLE \S+ (\w+)/i.exec(h)[1].toUpperCase()}`;
    const two = /^(\w+)(?: (\w+))?/.exec(h) || ['', ''];
    if (/^(CREATE|DROP)$/i.test(two[1]) && two[2]) return `${two[1]} ${two[2]}`.toUpperCase();
    return (two[1] || '').toUpperCase();
  }
  const ACCEPT = {
    insert: ['INSERT'],
    update: ['UPDATE'],
    delete: ['DELETE'],
    ddl: ['CREATE TABLE', 'ALTER TABLE ADD', 'ALTER TABLE DROP COLUMN', 'CREATE VIEW', 'CREATE INDEX', 'DROP VIEW', 'DROP INDEX'],
  };
  const KIND = Object.fromEntries(MODES.map((m) => [m.key, m.kind]));

  /* checkAnswer(sql, mode): can this text be locked in as an answer of `mode`? { ok: true } or { ok: false, reason,
     detail?, expected? } with reason 'empty' | 'many' (select only) | 'wrong-kind' (expected: 'SELECT' | 'INSERT' |
     'UPDATE' | 'DELETE' | 'CREATE'; detail: the kind found) | 'unsupported' | 'lint'. Select keeps checkQuery's rules
     ('not-query' becomes 'wrong-kind'); the other modes take one or more statements of their kind, plus COMMIT. */
  function checkAnswer(sql, mode = 'select') {
    if (mode === 'select') {
      const r = checkQuery(sql);
      return r.reason === 'not-query' ? { ok: false, reason: 'wrong-kind', expected: 'SELECT', detail: r.detail } : r;
    }
    if (!ACCEPT[mode]) throw new Error(`GameCore.checkAnswer: unknown mode ${mode}`);
    const text = String(sql == null ? '' : sql);
    if (!bare(text).text.replace(/;/g, '').trim()) return { ok: false, reason: 'empty' };
    const units = OD.script(text);
    if (!units.length) return { ok: false, reason: 'empty' };
    const bad = units.find((u) => u.unsupported);
    if (bad) return { ok: false, reason: 'unsupported', detail: bad.unsupported };
    const kinds = units.map((u) => kindOf(u.text));
    const wrong = kinds.find((k) => k !== 'COMMIT' && !ACCEPT[mode].includes(k));
    if (wrong !== undefined) return { ok: false, reason: 'wrong-kind', expected: KIND[mode], detail: wrong };
    if (!kinds.some((k) => k !== 'COMMIT')) return { ok: false, reason: 'wrong-kind', expected: KIND[mode], detail: 'COMMIT' };
    const risky = unsafe(text);
    if (risky) return { ok: false, reason: 'unsupported', detail: risky.text };
    if (dateLike(bare(text).text)) return { ok: false, reason: 'unsupported', detail: DATE_LIKE_TEXT };
    if (textDate(text)) return { ok: false, reason: 'unsupported', detail: DATE_TEXT_TEXT };
    if (mode === 'ddl' && quotedMixedCase(text)) return { ok: false, reason: 'unsupported', detail: QUOTED_TEXT };
    const lint = refusing(OD.lint(text));
    if (lint.length) return { ok: false, reason: 'lint', detail: lint };
    return { ok: true };
  }

  // Lint findings that are advice only (INTEGER is valid Oracle) never refuse an answer.
  const refusing = (lint) => lint.filter((x) => !x.advice);

  /* A date written as text ('2025-12-20', '20-DEC-2025') where a DATE goes: Oracle converts it with the session's
     NLS format (DD-MON-RR by default), so '2025-12-20' raises ORA-01861 there and the sandbox cannot reproduce
     either case. Refused without cost, with a hint; DATE, TIMESTAMP and TO_DATE literals are fine. */
  const DATE_TEXT_TEXT = 'A date written as text depends on the session\'s date format in Oracle (with the default one, \'2025-12-20\' fails with ORA-01861). Write a date literal: DATE \'2025-12-20\'.';
  function textDate(sql) {
    const { text, lits } = bare(sql);
    let found = false;
    text.replace(/§(\d+)§/g, (x, i, at) => {
      const lit = lits[+i];
      if (/^'(\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?|\d{1,2}-[A-Za-z]{3}-\d{2,4})'$/.test(lit)
        && !/\b(DATE|TIMESTAMP)\s*$/i.test(text.slice(0, at)) && !/\bTO_(DATE|TIMESTAMP|CHAR)\s*\(\s*$/i.test(text.slice(0, at))) found = true;
      return x;
    });
    return found;
  }

  /* A double-quoted name with lower case letters in DDL ("genres"): Oracle keeps its case, so it is not GENRES
     and nothing else in the game would find it. Refused without cost: write names without quotes. */
  const QUOTED_TEXT = 'A name in double quotes keeps its exact case in Oracle ("genres" is not GENRES). Write table and column names without quotes.';
  function quotedMixedCase(sql) {
    const { lits } = bare(sql);
    return lits.some((l) => /^"/.test(l) && l !== l.toUpperCase());
  }

  /* The probes that grade a DML or DDL question: its own checks, or (insert, update, delete) a snapshot of every
     base table, ordered by its key. Select questions have none ([]). */
  // Every column of the three tables, numbers rounded to their declared scale: Oracle rounds a value when it stores
  // it in NUMBER(6,2) (31.99 * 1.1 is kept as 35.19), SQLite keeps 35.189, so the snapshot rounds as Oracle stores.
  const SNAPSHOT = [
    'SELECT customer_id, name, country, signup_date, ROUND(vip_level) AS vip_level FROM customers ORDER BY customer_id',
    'SELECT game_id, title, genre, ROUND(price, 2) AS price, ROUND(stock) AS stock, ROUND(rating, 1) AS rating FROM games ORDER BY game_id',
    'SELECT sale_id, customer_id, game_id, sale_date, ROUND(quantity) AS quantity, ROUND(total_paid, 2) AS total_paid FROM sales ORDER BY sale_id',
  ];
  const snapshotTable = (probe) => { const i = SNAPSHOT.indexOf(probe); return i < 0 ? null : ['customers', 'games', 'sales'][i]; };
  const defaultChecks = (q) => (q && Array.isArray(q.checks) ? [...q.checks] : ['insert', 'update', 'delete'].includes(modeOf(q)) ? [...SNAPSHOT] : []);

  /* gradeChecks(got, want): two executeChecks results. Right when neither answer failed, both have the same number of
     probes and every probe is equal: rows by grade(…, ordered = true), errors by ORA code only.
     { ok, reason: null | 'error' | 'probe', probe: index | null, detail: grade() result | { gotError, wantError } | null } */
  const errCode = (e) => (e ? e.code || e.text || 'error' : null);
  function gradeChecks(got, want) {
    const gErr = got && got.error ? got.error : null;
    const wErr = want && want.error ? want.error : null;
    if (!got || gErr || wErr) return { ok: false, reason: 'error', probe: null, detail: { gotError: gErr, wantError: wErr } };
    const gr = got.results || [];
    const wr = (want && want.results) || [];
    for (let i = 0; i < Math.max(gr.length, wr.length); i++) {
      const a = gr[i];
      const b = wr[i];
      if (!a || !b || a.error || b.error) {
        if (a && b && a.error && b.error && errCode(a.error) === errCode(b.error)) continue;
        return { ok: false, reason: 'probe', probe: i, detail: { gotError: (a && a.error) || null, wantError: (b && b.error) || null } };
      }
      const g = grade(a, b, true);
      if (!g.ok) return { ok: false, reason: 'probe', probe: i, detail: g };
    }
    return { ok: true, reason: null, probe: null, detail: null };
  }

  /* ---- Grading ---------------------------------------------------------------------------- */

  // A number, or a text that reads as one ('2025' from TO_CHAR(d, 'YYYY')), compares as that number (4 decimals).
  const cell = (v) => {
    if (v === null || v === undefined) return null;
    const n = typeof v === 'number' ? v : /^\s*-?\d+(\.\d+)?\s*$/.test(String(v)) ? Number(v) : null;
    return n === null ? String(v) : Math.round(n * 10000) / 10000;
  };
  const rowKey = (row) => JSON.stringify(row.map(cell));
  const sameList = (a, b) => a.length === b.length && a.every((k, i) => k === b[i]);
  const result = (r) => ({ cols: [...((r && r.cols) || [])], rows: ((r && r.rows) || []).map((row) => [...row]) });

  function grade(got, want, ordered) {
    const g = result(got);
    const w = result(want);
    const out = (ok, reason) => ({ ok, reason, got: g, want: w });
    if (!got || got.error) return out(false, 'error');
    // A query with no rows comes back with no columns either (sql.js): judge it by its rows.
    if (g.rows.length && g.cols.length !== w.cols.length) return out(false, 'cols');
    if (!g.rows.length && g.cols.length && g.cols.length !== w.cols.length) return out(false, 'cols');
    if (g.rows.length !== w.rows.length) return out(false, 'rows');
    const a = g.rows.map(rowKey);
    const b = w.rows.map(rowKey);
    if (!sameList([...a].sort(), [...b].sort())) return out(false, 'values');
    if (ordered && !sameList(a, b)) return out(false, 'order');
    return out(true, null);
  }

  /* ---- Diagnosis --------------------------------------------------------------------------- */

  function levenshtein(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  }

  function nearest(name, candidates) {
    const n = String(name || '').toLowerCase();
    if (!n) return null;
    let best = null;
    let bestD = 3;
    for (const c of candidates || []) {
      const dist = levenshtein(n, String(c).toLowerCase());
      if (dist < bestD) { best = c; bestD = dist; }
    }
    return best;
  }

  /* checks = { got, want, probes } for DML and DDL (two executeChecks results and the probe texts). */
  function diagnose({ sql = '', error: err = null, grade: g = null, schema = {}, checks = null } = {}) {
    const out = [];
    const { text } = bare(sql);
    const error = err || (checks && checks.got && checks.got.error) || null;
    if (/\bLIMIT\s+\d+/i.test(text)) out.push({ code: 'limit' });
    const tables = Object.keys(schema || {});
    const columns = [...new Set(Object.values(schema || {}).flat())];
    if (error) {
      const e = typeof error === 'string' ? { text: error } : error;
      const msg = `${e.code || ''} ${e.text || ''} ${e.raw || ''} ${e.message || ''}`;
      let r;
      let name = null;
      let kind = null;
      if ((r = /no such column: ([\w.]+)/i.exec(msg)) || (r = /ORA-00904[^"]*"([^"]+)"/i.exec(msg))) { name = stripPrefix(r[1]); kind = 'column'; } else if ((r = /no such table: ([\w.]+)/i.exec(msg))) { name = stripPrefix(r[1]); kind = 'table'; } else if (/ORA-00942|table or view does not exist/i.test(msg)) {
        kind = 'table';
        const used = [...text.matchAll(/\b(?:FROM|JOIN)\s+([A-Za-z_]\w*)/gi)].map((x) => x[1].toLowerCase());
        name = used.find((x) => !tables.includes(x)) || null;
      }
      if (kind === 'column' && e.quoted) {
        // "Puzzle" in double quotes is a name for Oracle, not a text: the page can say "use single quotes".
        out.push({ code: 'unknown-name', name: e.column || name, kind, suggest: null, quoted: true });
      } else if (kind) {
        const pool = kind === 'table' ? tables : columns;
        const exact = pool.find((c) => c.toLowerCase() === name);
        const item = { code: 'unknown-name', name, kind, suggest: exact ? null : nearest(name, pool) };
        if (kind === 'column' && exact) item.tables = tables.filter((tb) => schema[tb].includes(exact));
        out.push(item);
      } else if (/ORA-00979|ORA-00937|not a (single-group )?group/i.test(msg)) {
        out.push({ code: 'group-by', column: e.column || null });
      } else if ((r = /ambiguous column name: ([\w.]+)/i.exec(msg))) {
        out.push({ code: 'error', ora: 'ORA-00918', text: 'column ambiguously defined', name: stripPrefix(r[1]) });
      } else if (/misuse of aggregate/i.test(msg)) {
        out.push({ code: 'error', ora: 'ORA-00934', text: 'group function is not allowed here' });
      } else if ((r = /ORA-(00001|01400|02290|02291|02292)\b/.exec(msg))) {
        out.push({ code: 'constraint', ora: `ORA-${r[1]}` });
      } else {
        out.push({ code: 'error', ora: e.code || null, text: e.text || e.message || String(error) });
      }
      return out;
    }
    const ora = sql ? oracleCheck(sql, schema && Object.keys(schema).length ? schema : null) : null;
    if (ora) {
      if (/ORA-009(79|37)/.test(ora.code || '')) out.push({ code: 'group-by', column: ora.column || null });
      else if (ora.quoted) out.push({ code: 'unknown-name', name: ora.column, kind: 'column', suggest: null, quoted: true });
      else out.push({ code: 'error', ora: ora.code, text: ora.text });
    }
    if (g) {
      if (g.ok) out.push({ code: 'match' });
      else if (g.reason === 'cols') out.push({ code: 'cols', got: g.got.cols.length, want: g.want.cols.length });
      else if (g.reason === 'rows') out.push({ code: 'rows', got: g.got.rows.length, want: g.want.rows.length });
      else if (g.reason === 'order') out.push({ code: 'order' });
      else if (g.reason === 'values') out.push({ code: 'values' });
      else if (g.reason === 'error') out.push({ code: 'error', ora: null, text: '' });
    }
    if (checks && checks.got && checks.want) {
      const gc = gradeChecks(checks.got, checks.want);
      if (gc.ok) out.push({ code: 'match' });
      else {
        const gr = checks.got.results || [];
        const wr = checks.want.results || [];
        const probes = checks.probes || [];
        for (let i = 0; i < Math.max(gr.length, wr.length); i++) {
          const a = gr[i];
          const b = wr[i];
          const m = /^\s*SELECT\s+\*\s+FROM\s+(\w+)\s+ORDER\s+BY\b/i.exec(probes[i] || '');
          const snap = snapshotTable(probes[i]) || (m && m[1].toLowerCase());
          if (a && b && !a.error && !b.error && snap) {
            // A table snapshot: say which table differs, by row count or by values; never which values.
            if (a.rows.length !== b.rows.length) out.push({ code: 'table', table: snap, got: a.rows.length, want: b.rows.length });
            else if (!grade(a, b, true).ok) out.push({ code: 'table-values', table: snap });
          } else {
            const same = a && b && (a.error || b.error ? !!(a.error && b.error) && errCode(a.error) === errCode(b.error) : grade(a, b, true).ok);
            if (!same) out.push({ code: 'probe', index: i, expectError: !!(b && b.error) });
          }
        }
      }
    }
    return out;
  }

  return {
    LADDER, SAFE, BANDS, band, prize, safePrize, rng, draw, newRun, pass, fail, rescue, walkAway, useLifeline,
    checkQuery, unsafe, oracleCheck, grade, diagnose, nearest,
    MODES, modeOf, ready, drawMixed, mixedUnlocked, answered, migrateV1, kindOf, checkAnswer, defaultChecks, gradeChecks,
  };
})();

if (typeof module !== 'undefined') module.exports = GameCore;
else globalThis.GameCore = GameCore;   // loaded as an ES module (Deno: supabase/functions/_shared/engine.js)
