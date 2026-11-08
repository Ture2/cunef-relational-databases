'use strict';

/* ==========================================================================
   Oracle dialect layer for the SQL sandbox. No DOM: it also runs in Node
   (tools/check-oracle.mjs). The course teaches Oracle (freesql.com), the
   browser engine is SQLite, so the text on screen is always Oracle and this
   module translates the subset the course uses before it runs.

   script(sql, { finish })   split an Oracle script into units:
                             { text, sqls: [SQLite statements], note?, unsupported? }
                             Oracle's implicit transactions are emulated: the first DML opens
                             one, a DDL statement commits, COMMIT / ROLLBACK end it.
   lint(sql)                 [{ level: 'warn' | 'unsupported', msg, fix? }] for the student's text:
                             'warn' = SQLite-ism that fails on Oracle, 'unsupported' = Oracle
                             feature the sandbox cannot simulate (PL/SQL, ROWNUM, (+)…)
   oraError(message, sql)    SQLite error → { code: 'ORA-00942', text } (closest Oracle message)
   planLine(detail)          SQLite EXPLAIN QUERY PLAN line → Oracle-style operation text
   cleanup(sql)              DROP TABLE IF EXISTS … for every table the script creates
   runChecks(db, text, checks)  run an answer, then probes each in SAVEPOINT … ROLLBACK TO (game DML/DDL)
   ========================================================================== */

const OracleDialect = (() => {
  /* ---- Masking: strings, quoted names and comments are hidden while we rewrite -------- */

  function mask(sql) {
    const lits = [];
    // q'[…]' (also q'(…)', q'{…}', q'<…>', q'!…!') is Oracle's alternative quoting: it becomes an ordinary literal.
    const out = sql.replace(/(?<![\w$#])[nN]?[qQ]'(?:\[[\s\S]*?\]|\([\s\S]*?\)|\{[\s\S]*?\}|<[\s\S]*?>|([^\s[({<'])[\s\S]*?\1)'|'(?:[^']|'')*'|"[^"]*"|--[^\n]*|\/\*[\s\S]*?\*\//g, (m) => {
      const q = /^[nN]?[qQ]'/.exec(m);
      lits.push(q ? `'${m.slice(q[0].length + 1, -2).replace(/'/g, "''")}'` : m);
      return `§${lits.length - 1}§`;
    });
    return { out, lits };
  }
  const unmask = (s, lits) => s.replace(/§(\d+)§/g, (_, i) => lits[+i]);
  const isComment = (l) => l.startsWith('--') || l.startsWith('/*');
  // Masked text with the comments taken out (strings stay masked): what the statement-kind and
  // unsupported tests read, so that CREATE/**/TRIGGER or CREATE -- x (newline) TRIGGER cannot slip past them.
  const uncomment = (masked, lits) => masked.replace(/§(\d+)§/g, (x, i) => (isComment(lits[+i]) ? ' ' : x));

  function findClose(s, open) {
    let d = 0;
    for (let i = open; i < s.length; i++) {
      if (s[i] === '(') d++;
      else if (s[i] === ')') { d--; if (d === 0) return i; }
    }
    return -1;
  }

  function splitArgs(s) {
    const a = [];
    let d = 0;
    let cur = '';
    for (const ch of s) {
      if (ch === '(') d++;
      if (ch === ')') d--;
      if (ch === ',' && d === 0) { a.push(cur.trim()); cur = ''; } else cur += ch;
    }
    a.push(cur.trim());
    return a;
  }

  /* Rewrite every call name(args) with fn(args), innermost first (the last match has no call of the same name inside). */
  function rewriteCalls(text, name, fn) {
    const re = new RegExp(`\\b${name}\\s*\\(`, 'gi');
    for (let guard = 0; guard < 500; guard++) {
      let last = null;
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(text))) last = m;
      if (!last) break;
      const open = last.index + last[0].length - 1;
      const close = findClose(text, open);
      if (close < 0) break;
      text = text.slice(0, last.index) + fn(splitArgs(text.slice(open + 1, close))) + text.slice(close + 1);
    }
    return text;
  }

  /* End index of the operand that starts at i: a number, a name, or name(...) / (...). */
  function operandEnd(s, i) {
    let j = i;
    while (s[j] === ' ') j++;
    if (s[j] === '(') { const c = findClose(s, j); return c < 0 ? s.length : c + 1; }
    const m = /^[\w.§]+/.exec(s.slice(j));
    if (!m) return j;
    j += m[0].length;
    while (s[j] === ' ') j++;
    if (s[j] === '(') { const c = findClose(s, j); return c < 0 ? s.length : c + 1; }
    return j;
  }

  /* Start index of the operand that ends just before i: a number, a name, or name(...) / (...). */
  function operandStart(s, i) {
    let j = i;
    while (j > 0 && /\s/.test(s[j - 1])) j--;
    if (s[j - 1] === ')') {
      let d = 0;
      for (let k = j - 1; k >= 0; k--) {
        if (s[k] === ')') d++;
        else if (s[k] === '(') { d--; if (d === 0) { j = k; break; } }
      }
      const name = /[\w.]+$/.exec(s.slice(0, j));
      return name ? j - name[0].length : j;
    }
    const m = /[\w.§]+$/.exec(s.slice(0, j));
    return m ? j - m[0].length : j;
  }

  /* x op ALL (subquery | list)  →  NOT EXISTS (… WHERE NOT (x op v) …);  x op ANY / SOME (…)  →  EXISTS (… WHERE x op v).
     SQLite has no quantified comparisons. A NULL in the set (or a NULL x) makes ALL fail, as in Oracle's WHERE. */
  const QUANT_AGG = /\b(AVG|SUM|MIN|MAX|COUNT|STDDEV|VARIANCE|MEDIAN)\s*\(/i;
  function quantified(text) {
    const re = /(<>|!=|>=|<=|=|>|<)\s*(ALL|ANY|SOME)\s*\(/i;
    for (let n = 0; n < 50; n++) {
      const m = re.exec(text);
      if (!m) break;
      const open = m.index + m[0].length - 1;
      const close = findClose(text, open);
      if (close < 0) break;
      const start = operandStart(text, m.index);
      const x = text.slice(start, m.index).trim();
      const inner = text.slice(open + 1, close).trim();
      const set = /^(SELECT|WITH)\b/i.test(inner) ? inner : `VALUES ${splitArgs(inner).map((v) => `(${v})`).join(', ')}`;
      const q = `ora_q${n}`;
      const cte = `WITH ${q}(ora_v) AS (${set}) SELECT 1 FROM ${q}`;
      const op = m[1] === '!=' ? '<>' : m[1];
      if (QUANT_AGG.test(x)) {
        // An aggregate (HAVING COUNT(…) >= ALL (…)) cannot go inside the subquery (SQLite: misuse of aggregate):
        // compare it with the set's COUNT / MIN / MAX instead, with Oracle's three-valued result (1, 0 or NULL):
        // ALL is true on an empty set, ANY false; a NULL in the set or a NULL x leaves an undecided case unknown.
        const S = (agg) => `(WITH ${q}(ora_v) AS (${set}) SELECT ${agg} FROM ${q})`;
        const X = `(${x})`;
        const [c, cn, mn, mx] = [S('COUNT(*)'), S('COUNT(ora_v)'), S('MIN(ora_v)'), S('MAX(ora_v)')];
        const inSet = `${X} IN (WITH ${q}(ora_v) AS (${set}) SELECT ora_v FROM ${q})`;
        const unknown = `${cn} < ${c} OR ${X} IS NULL`;
        const out = /^ALL$/i.test(m[2])
          ? `(CASE WHEN ${c} = 0 THEN 1 WHEN ${{ '>': `${mx} >= ${X}`, '>=': `${mx} > ${X}`, '<': `${mn} <= ${X}`, '<=': `${mn} < ${X}`, '=': `(${mn} <> ${X} OR ${mx} <> ${X})`, '<>': inSet }[op]} THEN 0 WHEN ${unknown} THEN NULL ELSE 1 END)`
          : `(CASE WHEN ${c} = 0 THEN 0 WHEN ${{ '>': `${X} > ${mn}`, '>=': `${X} >= ${mn}`, '<': `${X} < ${mx}`, '<=': `${X} <= ${mx}`, '=': inSet, '<>': `(${X} <> ${mn} OR ${X} <> ${mx})` }[op]} THEN 1 WHEN ${unknown} THEN NULL ELSE 0 END)`;
        text = text.slice(0, start) + out + text.slice(close + 1);
        continue;
      }
      const out = /^ALL$/i.test(m[2])
        ? `NOT EXISTS (${cte} WHERE NOT ((${x}) ${op} ${q}.ora_v) OR ${q}.ora_v IS NULL OR (${x}) IS NULL)`
        : `EXISTS (${cte} WHERE (${x}) ${op} ${q}.ora_v)`;
      text = text.slice(0, start) + out + text.slice(close + 1);
    }
    return text;
  }

  /* <base> ± <days>  →  date(base, '±' || (days) || ' days') */
  function dateArithmetic(text, baseRe, baseOf) {
    const re = new RegExp(`${baseRe}\\s*([+-])\\s*`, 'i');
    for (let guard = 0; guard < 200; guard++) {
      const m = re.exec(text);
      if (!m) break;
      const start = m.index + m[0].length;
      const end = operandEnd(text, start);
      const operand = text.slice(start, end).trim();
      text = `${text.slice(0, m.index)}date(${baseOf(m)}, '${m[m.length - 1]}' || (${operand}) || ' days')${text.slice(end)}`;
    }
    return text;
  }

  /* TO_DATE of a text literal, read here with Oracle's rules: 'YYYY-MM-DD' (ISO) or undefined when the format
     has an element we do not read, null when the text does not match it (Oracle: ORA-01861).
     Elements: YYYY, RRRR, YY (this century), RR (00–49 → 20xx, 50–99 → 19xx), MM, MON, MONTH, DD; any
     punctuation separates them, as Oracle's lenient matching does. */
  const TO_DATE_FORMAT = 'TO_DATE with this format (use DATE \'YYYY-MM-DD\', or TO_DATE with \'YYYY-MM-DD\' or \'DD-MON-YYYY\')';
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function parseDate(text, format) {
    const parts = format.toUpperCase().match(/YYYY|RRRR|YY|RR|MONTH|MON|MM|DD|[^A-Z0-9]+|[A-Z0-9]+/g) || [];
    const ELEM = { YYYY: '(\\d{4})', RRRR: '(\\d{2,4})', YY: '(\\d{2})', RR: '(\\d{2})', MONTH: '([A-Za-z]+)', MON: '([A-Za-z]{3})', MM: '(\\d{1,2})', DD: '(\\d{1,2})' };
    const names = [];
    let re = '';
    for (const p of parts) {
      if (ELEM[p]) { names.push(p); re += ELEM[p]; } else if (/^[^A-Z0-9]+$/.test(p)) re += '[\\s\\-/.,:;]+';
      else return undefined;
    }
    const m = new RegExp(`^\\s*${re}\\s*$`, 'i').exec(text);
    if (!m) return null;
    let y = null;
    let mo = null;
    let d = 1;
    names.forEach((n, i) => {
      const v = m[i + 1];
      if (n === 'YYYY' || (n === 'RRRR' && v.length === 4)) y = +v;
      else if (n === 'YY') y = 2000 + +v;
      else if (n === 'RR' || n === 'RRRR') y = +v < 50 ? 2000 + +v : 1900 + +v;
      else if (n === 'MM') mo = +v;
      else if (n === 'MON' || n === 'MONTH') mo = MONTHS.indexOf(v.slice(0, 3).toUpperCase()) + 1 || null;
      else if (n === 'DD') d = +v;
    });
    if (y === null || !mo || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return null;
    return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  /* Nested aggregates, Oracle's AVG(SUM(x)) … GROUP BY k: one row computed over the groups. SQLite has none, so
     SELECT AGG1(AGG2(x)) FROM … GROUP BY k  →  SELECT AGG1(ora_n0) FROM (SELECT AGG2(x) AS ora_n0 FROM … GROUP BY k).
     Applied to every query level (subqueries too) whose select list is made only of nested aggregates and that has
     a GROUP BY; anything else is left as it is (Oracle refuses it too: ORA-00937 / ORA-00978). */
  const AGG_CALL = /\b(AVG|SUM|MIN|MAX|COUNT|STDDEV|VARIANCE|MEDIAN)\s*\(/gi;
  const depth0 = (s) => {
    let d = 0;
    let out = '';
    for (const ch of s) {
      if (ch === '(') { out += d ? '_' : ch; d++; } else if (ch === ')') { d = Math.max(0, d - 1); out += d ? '_' : ch; } else out += d ? '_' : ch;
    }
    return out;
  };
  function nestedAggregates(text) {
    let out = '';
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '(' && /^\(\s*(SELECT|WITH)\b/i.test(text.slice(i, i + 64))) {
        const c = findClose(text, i);
        if (c < 0) { out += text.slice(i); break; }
        out += `(${nestedAggregates(text.slice(i + 1, c))})`;
        i = c;
      } else out += text[i];
    }
    return nestedLevel(out);
  }
  function nestedLevel(s) {
    const f = depth0(s);
    const sel = /\bSELECT\s+(?:(DISTINCT|ALL)\s+)?/i.exec(f);
    if (!sel) return s;
    const from = /\bFROM\b/i.exec(f.slice(sel.index + sel[0].length));
    if (!from || !/\bGROUP\s+BY\b/i.test(f)) return s;
    const listStart = sel.index + sel[0].length;
    const fromAt = listStart + from.index;
    const items = splitArgs(s.slice(listStart, fromAt));
    const inner = [];
    const rewritten = items.map((item) => {
      // Aggregate calls and their spans; the inner ones sit inside another aggregate's parentheses.
      const calls = [];
      let m;
      AGG_CALL.lastIndex = 0;
      while ((m = AGG_CALL.exec(item))) {
        const open = m.index + m[0].length - 1;
        calls.push({ start: m.index, end: findClose(item, open) + 1 });
      }
      const nested = calls.filter((c) => calls.some((o) => o !== c && o.start < c.start && c.end <= o.end));
      const top = nested.filter((c) => !nested.some((o) => o !== c && o.start < c.start && c.end <= o.end));
      if (!top.length) return null;
      let out = item;
      [...top].sort((a, b) => b.start - a.start).forEach((c) => {
        const name = `ora_n${inner.length}`;
        inner.push(`${item.slice(c.start, c.end)} AS ${name}`);
        out = out.slice(0, c.start) + name + out.slice(c.end);
      });
      return out;
    });
    if (rewritten.some((x) => x === null)) return s;
    const rest = s.slice(fromAt);
    const fr = depth0(rest);
    const order = /\bORDER\s+BY\b/i.exec(fr);
    const fetch = /\b(OFFSET|FETCH)\b/i.exec(fr);
    const cut = Math.min(order ? order.index : rest.length, fetch ? fetch.index : rest.length);
    const tail = fetch ? ` ${rest.slice(fetch.index).trim()}` : '';
    return `${s.slice(0, sel.index)}SELECT ${sel[1] ? `${sel[1]} ` : ''}${rewritten.join(', ')} FROM (SELECT ${inner.join(', ')} ${rest.slice(0, cut).trim()}) ora_nested${tail}`;
  }

  /* ---- Arithmetic on DATE columns ---------------------------------------------------------- */

  /* SQLite stores a DATE as text, so sale_date + 3 would add 3 to '2024-01-15' (2027). The columns declared DATE or
     TIMESTAMP in every CREATE TABLE / ALTER TABLE … ADD translated here are remembered (a setup always runs before
     the queries on it), and arithmetic on them is rewritten. A column only named like a date is left alone. */
  const DATE_COLUMNS = new Set();
  function noteDateColumns(bareStmt) {
    if (!/^(CREATE\s+(GLOBAL\s+TEMPORARY\s+)?TABLE|ALTER\s+TABLE)\b/i.test(bareStmt)) return;
    for (const m of bareStmt.matchAll(/(?:\(|,|\bADD\b)\s*"?([A-Za-z_][\w$#]*)"?\s+(?:DATE|TIMESTAMP)\b/gi)) DATE_COLUMNS.add(m[1].toLowerCase());
  }
  const escapeRe = (x) => x.replace(/[$#]/g, '\\$&');
  /* col ± operand → ora_date_add(col, ±(operand)); col - date → julianday difference; n + col too. A left operand
     can also be a date(…) / ora_date_add(…) call (ADD_MONTHS, literals, a previous rewrite) when the right one is a
     number expression: date(…) - n. */
  function dateColumnArithmetic(text) {
    if (!DATE_COLUMNS.size) return text;
    const names = [...DATE_COLUMNS].map(escapeRe).join('|');
    const colRe = `(?:[A-Za-z_][\\w$#]*\\.)?(?:${names})`;
    const isDateOperand = (x) => new RegExp(`^(${colRe}|(?:DATE|TIMESTAMP)\\s+§\\d+§|SYSDATE|CURRENT_DATE|(?:date|ora_date_add)\\s*\\([\\s\\S]*\\))$`, 'i').test(x.trim());
    let s = text.replace(new RegExp(`(^|[^\\w.$#§])(\\d+(?:\\.\\d+)?)\\s*\\+\\s*(${colRe})\\b(?!\\s*\\()`, 'gi'), '$1ora_date_add($3, $2)');
    // The right operand at i: DATE '…' / TIMESTAMP '…' as one operand, else a number, name, call or (…).
    const rightAt = (i) => {
      const lit = /^\s*(?:DATE|TIMESTAMP)\s+§\d+§/i.exec(s.slice(i));
      const end = lit ? i + lit[0].length : i + s.slice(i, operandEnd(s, i)).trimEnd().length;
      return { right: s.slice(i, end).trim(), end };
    };
    // The next date operand followed by + or -: a DATE column, or a date call (TRUNC only of a date).
    const nextLeft = () => {
      const m = new RegExp(`(^|[^\\w.$#§])(${colRe})\\b(?!\\s*[.(])\\s*([+-])\\s*`, 'i').exec(s);
      if (m) return { start: m.index + m[1].length, left: m[2], op: m[3], rStart: m.index + m[0].length };
      const callRe = /\b(ora_date_add|date|TRUNC)\s*\(/gi;
      let k;
      while ((k = callRe.exec(s))) {
        const close = findClose(s, k.index + k[0].length - 1);
        if (close < 0) return null;
        if (/^TRUNC$/i.test(k[1]) && !isDateOperand(splitArgs(s.slice(k.index + k[0].length, close))[0] || '')) continue;
        const after = /^\s*([+-])\s*(?!')/.exec(s.slice(close + 1));
        if (after) return { start: k.index, left: s.slice(k.index, close + 1), op: after[1], rStart: close + 1 + after[0].length };
      }
      return null;
    };
    for (let guard = 0; guard < 200; guard++) {
      const L = nextLeft();
      if (!L) break;
      const { right, end } = rightAt(L.rStart);
      if (!right) break;
      const rep = L.op === '-' && isDateOperand(right) ? `(julianday(${L.left}) - julianday(${right}))` : `ora_date_add(${L.left}, ${L.op}(${right}))`;
      s = s.slice(0, L.start) + rep + s.slice(end);
    }
    return s;
  }

  /* ---- Translation of one statement ---------------------------------------------------- */

  const FORMAT = [['YYYY', '%Y'], ['YY', '%y'], ['MM', '%m'], ['DD', '%d'], ['HH24', '%H'], ['MI', '%M'], ['SS', '%S']];
  const sqliteFormat = (f) => FORMAT.reduce((s, [o, n]) => s.replace(new RegExp(o, 'gi'), n), f);

  const KIND = {
    DML: /^(INSERT|UPDATE|DELETE|MERGE)\b/i,
    DDL: /^(CREATE|ALTER|DROP|TRUNCATE|RENAME|ANALYZE)\b/i,
    // TEMP / TEMPORARY: SQLite's CREATE TEMP TRIGGER is refused too.
    PLSQL: /^(DECLARE\b|CREATE\s+(OR\s+REPLACE\s+)?((EDITIONABLE|NONEDITIONABLE|TEMP|TEMPORARY)\s+)?(PROCEDURE|FUNCTION|TRIGGER|PACKAGE|TYPE)\b|BEGIN\s+(?!TRANSACTION\b)\S)/i,
  };

  /* Returns { sqls, note?, unsupported? } for one masked statement. */
  function translate(masked, lits) {
    let s = masked.trim();
    for (let m; (m = /^§(\d+)§\s*/.exec(s)) && isComment(lits[+m[1]]);) s = s.slice(m[0].length);   // leading comments
    const done = (sqls, extra) => ({ sqls: [].concat(sqls).map((x) => unmask(x, lits)), ...extra });
    if (!s) return { sqls: [] };

    // The kind and unsupported tests read the statement without its comments (bare); s keeps them.
    const bare = uncomment(s, lits).trim();
    if (KIND.PLSQL.test(bare)) return done([], { unsupported: 'PL/SQL blocks, procedures and triggers' });
    noteDateColumns(bare);
    if (/^BEGIN(\s+TRANSACTION)?$/i.test(bare)) return done([], { note: 'Oracle starts a transaction by itself with the first INSERT, UPDATE or DELETE: BEGIN is not needed.' });
    if (/^SELECT\s+\*\s+FROM\s+TABLE\s*\(\s*DBMS_XPLAN/i.test(bare)) return done([], { note: 'The plan is shown above, under EXPLAIN PLAN FOR.' });
    if (/^EXEC(UTE)?\s+DBMS_STATS\./i.test(bare) || /^ANALYZE\s+TABLE\b/i.test(bare)) return done('ANALYZE', { note: 'Statistics gathered (DBMS_STATS).' });
    if (/^(GRANT|REVOKE|CREATE\s+(ROLE|USER)|ALTER\s+USER|COMMENT\s+ON|CREATE\s+(SEQUENCE|BITMAP|CLUSTER|MATERIALIZED|SYNONYM)|ALTER\s+TABLE\s+\w+\s+(MODIFY|ADD\s+CONSTRAINT|DROP\s+CONSTRAINT|RENAME\s+CONSTRAINT))/i.test(bare)) {
      return done([], { unsupported: 'this statement (privileges, sequences, bitmap indexes, MODIFY or ADD CONSTRAINT)' });
    }
    if (/\bPARTITION\s+BY\b/i.test(bare)) return done([], { unsupported: 'partitioned tables' });
    if (/\bWITH\s+(CHECK\s+OPTION|READ\s+ONLY)\b/i.test(bare)) return done([], { unsupported: 'views WITH CHECK OPTION or WITH READ ONLY' });
    if (/\bROWNUM\b|\(\+\)|\bCONNECT\s+BY\b(?!\s+LEVEL\s*<=)|\bSTART\s+WITH\b|\bPIVOT\b|\bXMLTABLE\b|\bJSON_TABLE\b|\.NEXTVAL\b|\.CURRVAL\b/i.test(bare)) {
      return done([], { unsupported: 'ROWNUM, (+) joins, hierarchical queries or sequences' });
    }
    if (/\bFETCH\s+(?:FIRST|NEXT)\s+\S+\s+(?:PERCENT\b|ROWS?\s+WITH\s+TIES\b)/i.test(bare)) {
      return done([], { unsupported: 'FETCH FIRST … WITH TIES or PERCENT' });
    }
    // UPDATE (SELECT … JOIN …) SET … and DELETE FROM (SELECT …): Oracle changes the rows behind an inline view.
    if (/^UPDATE\s*\(/i.test(bare) || /^DELETE\s+(FROM\s+)?\(/i.test(bare)) {
      return done([], { unsupported: 'UPDATE or DELETE through an inline view (SELECT …)' });
    }
    // The 1…N generator runs here row by row (100000 rows take about 0.2 s): far beyond, it would freeze the page.
    const gen = /\bCONNECT\s+BY\s+LEVEL\s*<=\s*(\d+)/i.exec(bare);
    if (gen && +gen[1] > 200000) return done([], { unsupported: 'CONNECT BY LEVEL above 200000 rows' });
    let refused = null;   // set by a rewrite below that meets something it cannot simulate

    // INSERT ALL INTO t [(cols)] VALUES (…) INTO … SELECT * FROM dual  →  one INSERT per INTO (unconditional only).
    if (/^INSERT\s+ALL\s+INTO\b/i.test(bare)) {
      const tail = /\s+SELECT\s+\*\s+FROM\s+DUAL\s*$/i.exec(s);
      const intos = [];
      let rest = tail ? s.slice(0, tail.index).replace(/^INSERT\s+ALL\s+/i, '') : null;
      while (rest) {
        const m = /^INTO\s+([\w$#]+)\s*(\([^()]*\))?\s*VALUES\s*\(/i.exec(rest);
        if (!m) break;
        const open = m.index + m[0].length - 1;
        const close = findClose(rest, open);
        if (close < 0) break;
        intos.push(`INSERT INTO ${m[1]} ${m[2] ? `${m[2]} ` : ''}VALUES ${rest.slice(open, close + 1)}`);
        rest = rest.slice(close + 1).trim();
      }
      if (!tail || rest || !intos.length) return done([], { unsupported: 'INSERT ALL with conditions or a query (use one INSERT per row)' });
      return done(intos.map((x) => translate(x, lits).sqls).flat());
    }
    // A table alias in UPDATE / DELETE (UPDATE games g SET …, DELETE FROM sales s WHERE …): SQLite wants AS.
    // DELETE without FROM (DELETE games WHERE …) is Oracle too.
    s = s.replace(/^UPDATE\s+([\w$#]+)\s+(?!SET\b)([\w$#]+)\s+SET\b/i, 'UPDATE $1 AS $2 SET');
    // SET g.stock = … (a qualified target column): SQLite wants the bare name. Only the targets at depth 0 change.
    const up = /^UPDATE\s+([\w$#]+)(?:\s+AS\s+([\w$#]+))?\s+SET\b/i.exec(s);
    if (up) {
      const names = [up[1], up[2]].filter(Boolean).map((x) => x.toLowerCase());
      let d = 0;
      let out = s.slice(0, up[0].length);
      let atTarget = true;
      for (let i = up[0].length; i < s.length; i++) {
        const ch = s[i];
        if (ch === '(') d++;
        if (ch === ')') d--;
        if (!d && atTarget) {
          const m = /^\s*([\w$#]+)\.([\w$#]+)(?=\s*=)/.exec(s.slice(i));
          if (m && names.includes(m[1].toLowerCase())) { out += ` ${m[2]}`; i += m[0].length - 1; atTarget = false; continue; }
          if (/\S/.test(ch)) atTarget = false;
        }
        if (!d && ch === ',') atTarget = true;
        if (!d && /^\bWHERE\b/i.test(s.slice(i, i + 6)) && /\W/.test(s[i - 1] || ' ')) { out += s.slice(i); break; }
        out += ch;
      }
      s = out;
    }
    s = s.replace(/^DELETE\s+(?!FROM\b)([\w$#]+)/i, 'DELETE FROM $1');
    s = s.replace(/^DELETE\s+FROM\s+([\w$#]+)\s+(?!WHERE\b)([\w$#]+)(?=\s+WHERE\b|\s*$)/i, 'DELETE FROM $1 AS $2');

    // The empty string is NULL in Oracle (except next to ||).
    s = s.replace(/(\|\|\s*)?§(\d+)§(\s*\|\|)?/g, (m, a, i, b) => (!a && !b && lits[+i] === "''" ? 'NULL' : m));

    // 1…N generator: FROM dual CONNECT BY LEVEL <= N  →  recursive CTE
    let cte = '';
    s = s.replace(/\s+FROM\s+DUAL\s+CONNECT\s+BY\s+LEVEL\s*<=\s*(\d+)\s*$/i, (m, n) => {
      cte = `WITH RECURSIVE connect_by_n(level) AS (SELECT 1 UNION ALL SELECT level + 1 FROM connect_by_n WHERE level < ${n}) `;
      return ' FROM connect_by_n';
    });
    s = s.replace(/\bFROM\s+DUAL\b/gi, '');

    // Data dictionary views
    s = s.replace(/\bFROM\s+USER_TABLES\b/gi, "FROM (SELECT upper(name) AS table_name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%')");
    // Indexes a constraint creates by itself (UNIQUE, a non-INTEGER primary key) get Oracle-like SYS_C_ names.
    const IDX_NAME = "upper(CASE WHEN m.name LIKE 'sqlite_autoindex_%' THEN 'SYS_C_' || substr(m.name, 18) ELSE m.name END)";
    s = s.replace(/\bFROM\s+USER_INDEXES\b/gi, `FROM (SELECT ${IDX_NAME} AS index_name, upper(m.tbl_name) AS table_name, CASE WHEN il."unique" = 1 THEN 'UNIQUE' ELSE 'NONUNIQUE' END AS uniqueness FROM sqlite_master m JOIN pragma_index_list(m.tbl_name) il ON il.name = m.name WHERE m.type = 'index')`);
    s = s.replace(/\bFROM\s+USER_IND_COLUMNS\b/gi, `FROM (SELECT ${IDX_NAME} AS index_name, upper(m.tbl_name) AS table_name, upper(ii.name) AS column_name, ii.seqno + 1 AS column_position FROM sqlite_master m, pragma_index_info(m.name) ii WHERE m.type = 'index')`);
    s = s.replace(/\bFROM\s+USER_VIEWS\b/gi, "FROM (SELECT upper(name) AS view_name FROM sqlite_master WHERE type = 'view')");
    // nullable: 'N' for NOT NULL and primary-key columns, as Oracle shows them; data_default: the DEFAULT text.
    s = s.replace(/\bFROM\s+USER_TAB_COLUMNS\b/gi, "FROM (SELECT upper(m.name) AS table_name, upper(p.name) AS column_name, p.cid + 1 AS column_id, CASE WHEN p.\"notnull\" = 1 OR p.pk > 0 THEN 'N' ELSE 'Y' END AS nullable, p.dflt_value AS data_default FROM sqlite_master m, pragma_table_info(m.name) p WHERE m.type IN ('table', 'view') AND m.name NOT LIKE 'sqlite_%')");

    // SELECT UNIQUE is Oracle's old spelling of SELECT DISTINCT.
    s = s.replace(/\bSELECT\s+UNIQUE\b/gi, 'SELECT DISTINCT');

    // Functions
    s = s.replace(/\bNVL\s*\(/gi, 'IFNULL(');
    s = s.replace(/\bLEAST\s*\(/gi, 'MIN(').replace(/\bGREATEST\s*\(/gi, 'MAX(');   // SQLite: scalar MIN / MAX with 2+ arguments
    s = rewriteCalls(s, 'NVL2', ([a, b, c]) => `CASE WHEN ${a} IS NOT NULL THEN ${b} ELSE ${c} END`);
    s = rewriteCalls(s, 'MOD', ([a, b]) => `((${a}) % (${b}))`);
    s = rewriteCalls(s, 'DECODE', (args) => {
      const [x, ...rest] = args;
      let out = `CASE ${x}`;
      for (let i = 0; i + 1 < rest.length; i += 2) out += ` WHEN ${rest[i]} THEN ${rest[i + 1]}`;
      if (rest.length % 2) out += ` ELSE ${rest[rest.length - 1]}`;
      return `${out} END`;
    });
    s = rewriteCalls(s, 'TO_CHAR', ([x, f]) => {
      if (!f) return `CAST(${x} AS TEXT)`;
      const fmt = /^§(\d+)§$/.test(f) ? lits[+f.slice(1, -1)] : null;
      const num = fmt && /^'(FM)?([09]+)(?:\.([09]+))?'$/i.exec(fmt);   // number format model: 990.00, FM9990.0
      if (num) {
        const dec = num[3] ? num[3].length : 0;
        return num[1] ? `printf('%.${dec}f', ${x})` : `printf('%${num[2].length + (num[3] ? dec + 1 : 0) + 1}.${dec}f', ${x})`;
      }
      // A date as text, typed TEXT so that TO_CHAR(d, 'YYYY') = 2025 compares '2025' with '2025', as Oracle's
      // implicit conversion does (SQLite would otherwise compare a text with a number and say no).
      return fmt && /[YMDH]/i.test(fmt) ? `CAST(strftime('${sqliteFormat(fmt.slice(1, -1))}', ${x}) AS TEXT)` : `CAST(${x} AS TEXT)`;
    });
    s = rewriteCalls(s, 'TO_DATE', ([x, f]) => {
      const fmtLit = f && /^§(\d+)§$/.test(f) ? lits[+f.slice(1, -1)].slice(1, -1).toUpperCase() : null;
      if (f && fmtLit === null) { refused = refused || TO_DATE_FORMAT; return 'NULL'; }
      const lit = /^§(\d+)§$/.test(x) && /^'/.test(lits[+x.slice(1, -1)]) ? lits[+x.slice(1, -1)].slice(1, -1) : null;
      if (lit !== null) {   // a literal: parse it here, with Oracle's rules (month names, YY, RR)
        const iso = parseDate(lit, fmtLit || (/^\d{4}-\d{2}-\d{2}$/.test(lit) ? 'YYYY-MM-DD' : 'DD-MON-RR'));
        if (iso === undefined) { refused = refused || TO_DATE_FORMAT; return 'NULL'; }
        if (iso === null) return "ora_error('ORA-01861: literal does not match format string')";
        lits.push(`'${iso}'`);
        return `DATE §${lits.length - 1}§`;   // still a date: TO_DATE('…') + 1 is date arithmetic
      }
      const fmt = fmtLit || 'YYYY-MM-DD';
      if (fmt === 'YYYY-MM-DD') return `date(${x})`;
      if (fmt === 'DD/MM/YYYY' || fmt === 'DD-MM-YYYY') return `(substr(${x}, 7, 4) || '-' || substr(${x}, 4, 2) || '-' || substr(${x}, 1, 2))`;
      if (/^DD-MON-(YYYY|YY|RR)$/.test(fmt)) {
        const mon = `CASE upper(substr(${x}, 4, 3)) ${MONTHS.map((m, i) => `WHEN '${m}' THEN '${String(i + 1).padStart(2, '0')}'`).join(' ')} END`;
        const year = fmt.endsWith('YYYY') ? `substr(${x}, 8, 4)`
          : fmt.endsWith('YY') && !fmt.endsWith('RR') ? `('20' || substr(${x}, 8, 2))`
            : `(CASE WHEN CAST(substr(${x}, 8, 2) AS INTEGER) < 50 THEN '20' ELSE '19' END || substr(${x}, 8, 2))`;
        return `(${year} || '-' || ${mon} || '-' || substr(${x}, 1, 2))`;
      }
      refused = refused || TO_DATE_FORMAT;
      return 'NULL';
    });
    s = rewriteCalls(s, 'TO_NUMBER', ([x]) => `CAST(${x} AS REAL)`);
    s = rewriteCalls(s, 'CHR', ([x]) => `ora_chr(${x})`);
    s = rewriteCalls(s, 'EXTRACT', ([x]) => {
      const m = /^(YEAR|MONTH|DAY)\s+FROM\s+(.+)$/is.exec(x);
      return m ? `CAST(strftime('${{ YEAR: '%Y', MONTH: '%m', DAY: '%d' }[m[1].toUpperCase()]}', ${m[2]}) AS INTEGER)` : `EXTRACT(${x})`;
    });
    s = rewriteCalls(s, 'LISTAGG', ([x, sep]) => `group_concat(${x}${sep ? `, ${sep}` : ''})`);
    s = s.replace(/\bWITHIN\s+GROUP\s*\([^)]*\)/gi, '');
    // Text functions SQLite lacks: JavaScript versions (FUNCTIONS below) registered by js/sql-runner.js.
    s = rewriteCalls(s, 'INITCAP', ([x]) => `ora_initcap(${x})`);
    s = rewriteCalls(s, 'LPAD', ([x, n, p]) => `ora_lpad(${x}, ${n}, ${p || "' '"})`);
    s = rewriteCalls(s, 'RPAD', ([x, n, p]) => `ora_rpad(${x}, ${n}, ${p || "' '"})`);
    s = rewriteCalls(s, 'CEIL', ([x]) => `(CAST(${x} AS INTEGER) + ((${x}) > CAST(${x} AS INTEGER)))`);
    s = rewriteCalls(s, 'FLOOR', ([x]) => `(CAST(${x} AS INTEGER) - ((${x}) < CAST(${x} AS INTEGER)))`);
    // Months: the 'floor' modifier keeps Oracle's end-of-month rule (31 Jan + 1 month = 28/29 Feb).
    s = rewriteCalls(s, 'ADD_MONTHS', ([d, n]) => `date(${d}, (${n}) || ' months', 'floor')`);
    s = rewriteCalls(s, 'MONTHS_BETWEEN', ([a, b]) => {
      const part = (f, x) => `CAST(strftime('${f}', ${x}) AS INTEGER)`;
      return `((${part('%Y', a)} - ${part('%Y', b)}) * 12 + ${part('%m', a)} - ${part('%m', b)} + (${part('%d', a)} - ${part('%d', b)}) / 31.0)`;
    });

    // Dates
    // TIMESTAMP '2025-12-20 00:00:00' is the same day as DATE '2025-12-20' (a DATE column keeps no fraction).
    s = s.replace(/\bTIMESTAMP\s+§(\d+)§/gi, (m, i) => {
      const t = /^'(\d{4}-\d{2}-\d{2})(?:[ T]00:00(?::00(?:\.0+)?)?)?'$/.exec(lits[+i]);
      if (!t) return m;
      lits.push(`'${t[1]}'`);
      return `DATE §${lits.length - 1}§`;
    });
    // DEFAULT ON NULL x: an explicit NULL also gets the default, and the column is NOT NULL. SQLite's
    // NOT NULL ON CONFLICT REPLACE does exactly that (it stores the default instead of the NULL).
    s = s.replace(/\bDEFAULT\s+ON\s+NULL\s+(§\d+§|-?\d+(?:\.\d+)?|\([^()]*\)|[A-Za-z_]\w*(?:\s*\([^()]*\))?)/gi, 'DEFAULT $1 NOT NULL ON CONFLICT REPLACE');
    // Arithmetic on DATE columns (known from the CREATE TABLE / ALTER TABLE this module translated):
    // col ± n → ora_date_add(col, ±n) (days, fractions included; the time is kept), date - date → days between.
    s = dateColumnArithmetic(s);
    // date - date = the days between them (when the right-hand side is a date literal or SYSDATE)
    s = s.replace(/(\bDATE\s+§\d+§|\b(?:SYSDATE|CURRENT_DATE)\b|\b[A-Za-z_][\w.]*)\s*-\s*(DATE\s+§\d+§|\b(?:SYSDATE|CURRENT_DATE)\b)/gi, '(julianday($1) - julianday($2))');
    s = dateArithmetic(s, '\\bDATE\\s+(§\\d+§)', (m) => m[1]);
    s = dateArithmetic(s, '\\b(SYSDATE|CURRENT_DATE)\\b', () => "'now'");
    s = s.replace(/\bDEFAULT\s+(SYSDATE|CURRENT_DATE)\b/gi, 'DEFAULT CURRENT_DATE');
    s = s.replace(/\bDEFAULT\s+(SYSTIMESTAMP|CURRENT_TIMESTAMP)\b/gi, 'DEFAULT CURRENT_TIMESTAMP');
    s = s.replace(/\b(?:DATE|TIMESTAMP)\s+(§\d+§)/gi, '$1');
    s = s.replace(/(?<!DEFAULT\s+)\b(SYSDATE|CURRENT_DATE)\b/gi, "date('now')").replace(/(?<!DEFAULT\s+)\b(SYSTIMESTAMP|CURRENT_TIMESTAMP)\b/gi, "datetime('now')");
    s = s.replace(/(?<!\b(?:BEGIN|SET)\s+)\bTRANSACTION\b/gi, '"transaction"');   // a keyword in SQLite, a plain name in Oracle
    // TRUNC: of a date (stored as text here) to the day, month or year; of a number to n decimals
    s = rewriteCalls(s, 'TRUNC', ([x, f]) => {
      const fmt = f && /^§(\d+)§$/.test(f) ? lits[+f.slice(1, -1)].slice(1, -1).toUpperCase() : null;
      if (fmt !== null) return `date(${x}${/^(MM|MON|MONTH)$/.test(fmt) ? ", 'start of month'" : /^(Y+|YEAR)$/.test(fmt) ? ", 'start of year'" : ''})`;
      if (f && /^-?\d+$/.test(f)) return `(CAST(round((${x}) * 1e${f}, 9) AS INTEGER) / 1e${f})`;
      return `(CASE WHEN typeof(${x}) = 'text' THEN date(${x}) ELSE CAST(${x} AS INTEGER) END)`;
    });

    // Row limiting, quantified comparisons, nested aggregates and set operators
    s = quantified(s);
    s = nestedAggregates(s);
    if (refused) return done([], { unsupported: refused });
    s = s.replace(/\bOFFSET\s+(\d+)\s+ROWS?\s+FETCH\s+(?:FIRST|NEXT)\s+(\d+)\s+ROWS?\s+ONLY\b/gi, 'LIMIT $2 OFFSET $1');
    s = s.replace(/\bFETCH\s+(?:FIRST|NEXT)\s+(\d+)\s+ROWS?\s+ONLY\b/gi, 'LIMIT $1');
    s = s.replace(/\bOFFSET\s+(\d+)\s+ROWS?\b/gi, 'LIMIT -1 OFFSET $1');
    s = s.replace(/\bMINUS\b/gi, 'EXCEPT');

    // Types
    s = s.replace(/(\w+)\s+NUMBER(?:\s*\(\s*\d+\s*(?:,\s*\d+\s*)?\))?\s+GENERATED\b[^,)]*?\bAS\s+IDENTITY(\s*\([^)]*\))?/gi, '$1 INTEGER');
    s = s.replace(/\bN?(?:VAR)?CHAR2?\s*\(\s*\d+(?:\s+(?:CHAR|BYTE))?\s*\)/gi, 'TEXT');
    s = s.replace(/\bN?CLOB\b/gi, 'TEXT');
    s = s.replace(/\bNUMBER\s*\(\s*\d+\s*(?:,\s*0\s*)?\)/gi, 'INTEGER');
    s = s.replace(/\bNUMBER(?:\s*\(\s*\d+\s*,\s*\d+\s*\))?/gi, 'REAL');
    s = s.replace(/\b(DATE|TIMESTAMP)\b(?!\s*\()/gi, 'TEXT');

    // DDL details
    s = s.replace(/\bDROP\s+(TABLE|INDEX|VIEW)\s+(IF\s+EXISTS\s+)?([\w§]+|"\w+")(\s+CASCADE\s+CONSTRAINTS)?(\s+PURGE)?/gi, 'DROP $1 $2$3');
    s = s.replace(/^TRUNCATE\s+TABLE\s+(\w+)/i, 'DELETE FROM $1');
    s = s.replace(/\bORGANIZATION\s+INDEX\b/gi, 'WITHOUT ROWID');
    s = s.replace(/^EXPLAIN\s+PLAN\s+(?:SET\s+STATEMENT_ID\s*=\s*§\d+§\s+)?FOR\s+/i, 'EXPLAIN QUERY PLAN ');

    // ALTER TABLE … ADD
    let m = /^ALTER\s+TABLE\s+(\w+)\s+ADD\s*\(([\s\S]*)\)\s*$/i.exec(s);
    if (m) return done(splitArgs(m[2]).map((c) => `ALTER TABLE ${m[1]} ADD COLUMN ${c}`));
    m = /^ALTER\s+TABLE\s+(\w+)\s+ADD\s+(?!COLUMN\b|CONSTRAINT\b|PRIMARY\b|FOREIGN\b|UNIQUE\b|CHECK\b)(.+)$/is.exec(s);
    if (m) s = `ALTER TABLE ${m[1]} ADD COLUMN ${m[2]}`;
    // ALTER TABLE … DROP (a, b)  →  one DROP COLUMN per column
    m = /^ALTER\s+TABLE\s+(\w+)\s+DROP\s*\(([\s\S]*)\)\s*$/i.exec(s);
    if (m) return done(splitArgs(m[2]).map((c) => `ALTER TABLE ${m[1]} DROP COLUMN ${c}`));

    // CREATE OR REPLACE VIEW  →  DROP VIEW IF EXISTS + CREATE VIEW
    m = /^CREATE\s+OR\s+REPLACE\s+(?:(?:NO)?FORCE\s+)?VIEW\s+(\w+)/i.exec(s);
    if (m) return done([`DROP VIEW IF EXISTS ${m[1]}`, s.replace(/^CREATE\s+OR\s+REPLACE\s+(?:(?:NO)?FORCE\s+)?VIEW/i, 'CREATE VIEW')]);

    return done(cte + s.trim());
  }

  /* ---- Scripts ------------------------------------------------------------------------ */

  /* Split on ; outside strings and comments; PL/SQL blocks stay in one piece. */
  function split(sql) {
    const { out, lits } = mask(sql.replace(/^[ \t]*\/[ \t]*$/gm, ';'));
    const pieces = out.split(';');
    const stmts = [];
    for (let i = 0; i < pieces.length; i++) {
      let cur = pieces[i];
      if (KIND.PLSQL.test(uncomment(cur, lits).trim())) {
        const opens = (x) => (x.match(/\bBEGIN\b/gi) || []).length;
        const closes = (x) => (x.match(/\bEND\b(?!\s+(IF|LOOP|CASE)\b)/gi) || []).length;
        while (i + 1 < pieces.length && (opens(cur) > closes(cur) || !closes(cur))) cur += `;${pieces[++i]}`;
      }
      if (cur.replace(/§\d+§/g, (x) => (isComment(lits[+x.slice(1, -1)]) ? '' : x)).trim()) stmts.push(cur);
    }
    return { stmts, lits };
  }

  function script(sql, { finish = false } = {}) {
    const { stmts, lits } = split(sql);
    const units = [];
    let inTx = false;
    for (const raw of stmts) {
      const text = unmask(raw, lits).trim();
      const body = raw.replace(/§(\d+)§/g, (x, i) => (isComment(lits[+i]) ? ' ' : x)).trim();
      const tr = translate(raw, lits);
      const pre = [];
      const head = body.replace(/^\(+/, '');
      if (tr.sqls.length) {
        if (KIND.DDL.test(head) && !/^ANALYZE/i.test(head)) { if (inTx) { pre.push('COMMIT'); inTx = false; } } else if (KIND.DML.test(head) || /^SAVEPOINT\b/i.test(head) || /^WITH\b[\s\S]*\b(INSERT|UPDATE|DELETE)\b/i.test(head)) { if (!inTx) { pre.push('BEGIN'); inTx = true; } } else if (/^(COMMIT|ROLLBACK)\b(?!\s+TO\b)/i.test(head)) {
          if (!inTx) { units.push({ text, sqls: [], note: 'No transaction was open.' }); continue; }
          inTx = false;
        }
      }
      units.push({ text, ...tr, sqls: [...pre, ...tr.sqls] });
    }
    if (finish && inTx) units.push({ text: '', sqls: ['COMMIT'], silent: true });
    return units;
  }

  /* Table names created by a script, for a clean re-run on FreeSQL. */
  function cleanup(sql) {
    const { out, lits } = mask(sql);
    const names = [...out.matchAll(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+|§\d+§)/gi)].map((m) => unmask(m[1], lits));
    return [...new Set(names)].reverse().map((n) => `DROP TABLE IF EXISTS ${n} CASCADE CONSTRAINTS PURGE;`).join('\n');
  }

  /* ---- Lint: what the student typed, judged as Oracle ----------------------------------- */

  const RULES = [
    { re: /\bLIMIT\s+\d+/i, level: 'warn', msg: 'Oracle has no LIMIT (it fails with ORA-00933).', fix: 'Use FETCH FIRST n ROWS ONLY at the end of the query.' },
    { re: /==/, level: 'warn', msg: 'Oracle has no == operator.', fix: 'Compare with a single =.' },
    { re: /\bFETCH\s+(?:FIRST|NEXT)\s+\S+\s+(?:PERCENT\b|ROWS?\s+WITH\s+TIES\b)/i, level: 'unsupported', msg: 'FETCH FIRST … WITH TIES and PERCENT are not simulated here.', fix: 'Use FETCH FIRST n ROWS ONLY, or copy the query to FreeSQL.' },
    { re: /\bEXCEPT\b/i, level: 'warn', msg: 'Oracle calls the set difference MINUS.', fix: 'Replace EXCEPT with MINUS.' },
    { re: /\bAUTOINCREMENT\b/i, level: 'warn', msg: 'Oracle has no AUTOINCREMENT.', fix: 'Use id NUMBER GENERATED ALWAYS AS IDENTITY.' },
    { re: /\bTEXT\b/i, level: 'warn', msg: 'TEXT is not an Oracle type.', fix: 'Use VARCHAR2(n) (or CLOB for long text).' },
    // REAL is not an Oracle type; INTEGER is valid Oracle (advice only: the game never refuses it). REAL first: the
    // two share their message, and a REAL must be reported as a real error.
    { re: /\bREAL\b\s*(PRIMARY|NOT|,|\)|DEFAULT)/i, level: 'warn', msg: 'Oracle prefers NUMBER: INTEGER is accepted but REAL is not.', fix: 'Use NUMBER(p), NUMBER(p, s) or FLOAT.' },
    { re: /\bINTEGER\b\s*(PRIMARY|NOT|,|\)|DEFAULT)/i, level: 'warn', advice: true, msg: 'Oracle prefers NUMBER: INTEGER is accepted but REAL is not.', fix: 'Use NUMBER(p), NUMBER(p, s) or FLOAT.' },
    { re: /\bILIKE\b/i, level: 'warn', msg: 'ILIKE is PostgreSQL.', fix: 'Use LOWER(col) LIKE LOWER(\'…\').' },
    { re: /\bIFNULL\s*\(/i, level: 'warn', msg: 'IFNULL is MySQL / SQLite.', fix: 'Use NVL(a, b) or COALESCE(a, b).' },
    { re: /\bdatetime\s*\(|\bstrftime\s*\(|\bdate\s*\(\s*'now'/i, level: 'warn', msg: 'date(), datetime() and strftime() are SQLite functions.', fix: 'Use SYSDATE, TO_CHAR(d, \'YYYY-MM-DD\') and TO_DATE().' },
    { re: /\bSUBSTRING\s*\(/i, level: 'warn', msg: 'Oracle names it SUBSTR.', fix: 'Use SUBSTR(text, start, length).' },
    { re: /\bsqlite_master\b|\bPRAGMA\b/i, level: 'warn', msg: 'sqlite_master and PRAGMA are SQLite.', fix: 'Query the data dictionary: USER_TABLES, USER_TAB_COLUMNS, USER_INDEXES.' },
    { re: /\bBEGIN\s*(TRANSACTION)?\s*;/i, level: 'warn', msg: 'In Oracle, BEGIN starts a PL/SQL block, not a transaction.', fix: 'Just run your INSERT, UPDATE or DELETE: the transaction opens by itself.' },
    { re: /\bEXPLAIN\s+QUERY\s+PLAN\b/i, level: 'warn', msg: 'EXPLAIN QUERY PLAN is SQLite.', fix: 'Use EXPLAIN PLAN FOR … followed by SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY).' },
    { re: /\bANALYZE\s*;/i, level: 'warn', msg: 'A bare ANALYZE is SQLite.', fix: 'Use EXEC DBMS_STATS.GATHER_TABLE_STATS(USER, \'TABLE_NAME\').' },
    { re: /\b(WHERE|AND|OR)\s+[\w.]+\s*(?:>=?|<=?|=|BETWEEN)\s*'\d{4}-\d{2}-\d{2}'/i, level: 'warn', msg: 'Comparing a date column with the text \'2024-01-01\' depends on NLS settings and often fails (ORA-01861).', fix: 'Write a date literal: DATE \'2024-01-01\'.' },
    { re: /\bCREATE\s+(OR\s+REPLACE\s+)?((EDITIONABLE|NONEDITIONABLE|TEMP|TEMPORARY)\s+)?(PROCEDURE|FUNCTION|TRIGGER|PACKAGE)\b|\bDECLARE\b/i, level: 'unsupported', msg: 'PL/SQL cannot run in the browser sandbox.', fix: 'Copy it to FreeSQL.' },
    { re: /\bROWNUM\b/i, level: 'unsupported', msg: 'ROWNUM is not simulated here.', fix: 'Use FETCH FIRST n ROWS ONLY, which also works on Oracle.' },
    { re: /\(\+\)/, level: 'unsupported', msg: 'The (+) outer-join syntax is not simulated here.', fix: 'Use LEFT JOIN / RIGHT JOIN, the ANSI syntax that Oracle also accepts.' },
  ];

  function lint(sql) {
    const { out: masked, lits } = mask(sql);
    const out = uncomment(masked, lits);
    const seen = new Set();
    const found = [];
    for (const r of RULES) {
      if (r.re.test(out) && !seen.has(r.msg)) { seen.add(r.msg); found.push({ level: r.level, msg: r.msg, fix: r.fix, ...(r.advice ? { advice: true } : {}) }); }
    }
    return found;
  }

  /* ---- Errors and plans ---------------------------------------------------------------- */

  /* `sql` is the statement that failed (its first word picks between some codes); `db`, optional, is the sql.js
     database it failed on: with it, an UPDATE that breaks a foreign key is told apart (the child's key column
     changed: ORA-02291, parent key not found; the parent's key changed: ORA-02292, child record found). */
  function oraError(message, sql = '', db = null) {
    const m = String(message);
    let r;
    const { out: masked, lits } = mask(String(sql));
    const head = uncomment(masked, lits).trim().replace(/^\(+\s*/, '');
    const isUpdate = /^UPDATE\b/i.test(head);
    if ((r = /(ORA-\d{5}): ([^\n]*)/.exec(m))) return { code: r[1], text: r[2] };
    if ((r = /no such (?:table|view): (\w+)/i.exec(m))) return { code: 'ORA-00942', text: 'table or view does not exist', name: r[1] };
    if (/Cannot add a NOT NULL column with default value NULL/i.test(m)) return { code: 'ORA-01758', text: 'table must be empty to add mandatory (NOT NULL) column' };
    if ((r = /no such column: ([\w.]+)/i.exec(m))) return { code: 'ORA-00904', text: `"${r[1].split('.').pop().toUpperCase()}": invalid identifier` };
    if ((r = /UNIQUE constraint failed: ([\w.]+)/i.exec(m))) return { code: 'ORA-00001', text: `unique constraint (${r[1].toUpperCase().replace('.', '_')}) violated` };
    if ((r = /NOT NULL constraint failed: (\w+)\.(\w+)/i.exec(m))) {
      const where = `("${r[1].toUpperCase()}"."${r[2].toUpperCase()}")`;
      return isUpdate ? { code: 'ORA-01407', text: `cannot update ${where} to NULL` } : { code: 'ORA-01400', text: `cannot insert NULL into ${where}` };
    }
    if (/FOREIGN KEY constraint failed/i.test(m)) {
      const parent = { code: 'ORA-02291', text: 'integrity constraint violated - parent key not found' };
      const child = { code: 'ORA-02292', text: 'integrity constraint violated - child record found' };
      if (/^DELETE\b/i.test(head)) return child;
      if (!isUpdate) return parent;
      const u = /^UPDATE\s+(\w+)(?:\s+\w+)?\s+SET\s+([\s\S]*?)(?:\bWHERE\b|$)/i.exec(head);
      if (u && db) {
        try {
          const set = [...u[2].matchAll(/(?:^|,)\s*(?:\w+\.)?(\w+)\s*=/g)].map((x) => x[1].toLowerCase());
          const res = db.exec(`SELECT "from" FROM pragma_foreign_key_list('${u[1].replace(/'/g, '')}')`);
          const fkCols = res.length ? res[0].values.map((x) => String(x[0]).toLowerCase()) : [];
          return set.some((c) => fkCols.includes(c)) ? parent : child;
        } catch (e) { return child; }
      }
      return child;
    }
    if ((r = /CHECK constraint failed: ?(\w*)/i.exec(m))) return { code: 'ORA-02290', text: `check constraint (${(r[1] || 'CHECK').toUpperCase()}) violated` };
    if (/(table|index|view) \w+ already exists/i.test(m)) return { code: 'ORA-00955', text: 'name is already used by an existing object' };
    if (/no such index/i.test(m)) return { code: 'ORA-01418', text: 'specified index does not exist' };
    if (/syntax error|incomplete input/i.test(m)) return { code: 'ORA-00900', text: 'invalid SQL statement' };
    if (/cannot start a transaction within a transaction|no transaction is active/i.test(m)) return { code: 'ORA-01453', text: 'SET TRANSACTION must be first statement of transaction' };
    return null;
  }

  /* SQLite plan line → what Oracle's EXPLAIN PLAN would call it. */
  function planLine(detail) {
    let m;
    if ((m = /^SCAN (\w+)(?: USING COVERING INDEX (\w+))?/.exec(detail))) return m[2] ? `INDEX FAST FULL SCAN (${m[2]}) · no table access` : `TABLE ACCESS FULL (${m[1]})`;
    if ((m = /^SEARCH (\w+) USING COVERING INDEX (\w+)/.exec(detail))) return `INDEX RANGE SCAN (${m[2]}) · covering, no table access`;
    if ((m = /^SEARCH (\w+) USING INTEGER PRIMARY KEY/.exec(detail))) return `INDEX UNIQUE SCAN (primary key) → TABLE ACCESS BY INDEX ROWID (${m[1]})`;
    if ((m = /^SEARCH (\w+) USING PRIMARY KEY/.exec(detail))) return `INDEX RANGE SCAN (primary key of ${m[1]}) · rows live in the index, no table access (index-organized)`;
    if ((m = /^SEARCH (\w+) USING INDEX (\w+)/.exec(detail))) return `INDEX RANGE SCAN (${/^sqlite_autoindex/.test(m[2]) ? `SYS_C_${m[1]}` : m[2]}) → TABLE ACCESS BY INDEX ROWID (${m[1]})`;
    if (/USE TEMP B-TREE FOR (ORDER BY|GROUP BY|DISTINCT)/.test(detail)) return `SORT ${/ORDER/.test(detail) ? 'ORDER BY' : /GROUP/.test(detail) ? 'GROUP BY' : 'UNIQUE'}`;
    if (/^CO-ROUTINE|^MATERIALIZE|^LIST SUBQUERY|^SCALAR SUBQUERY/.test(detail)) return detail.replace(/^(\w+[- ]?\w*)/, (x) => x);
    return detail;
  }

  /* ---- Grading a DML / DDL answer by probes (docs/game-quiz.md §13.2) --------------------------- */

  /* runChecks(db, text, checks): on a sql.js database already holding the setup, runs the Oracle `text` (one or more
     statements, with Oracle's transaction emulation), then each probe inside SAVEPOINT … ROLLBACK TO, so probes
     never see each other's changes. Returns { error?: {code?, text}, changes, results: [{cols, rows} | {error}] }:
     `error` is the answer's own error (then no probe runs); a probe's error is that probe's result; `changes` is
     the number of rows the answer's INSERT / UPDATE / DELETE statements modified. Errors are mapped to ORA codes
     with the failing statement's text (and the database, for foreign keys). Used by SqlRunner.executeChecks in the
     browser and by tools/game-sql.mjs in Node, so both grade the same way. */
  function runChecks(db, text, checks = []) {
    const toError = (e, stmt) => {
      const msg = String(e && e.message !== undefined ? e.message : e);
      const ora = oraError(msg, stmt, db);
      return ora ? { code: ora.code, text: ora.text } : { text: msg };
    };
    let changes = 0;
    for (const u of script(String(text))) {
      if (u.unsupported) return { error: { text: `unsupported: ${u.unsupported}` }, changes, results: [] };
      try {
        const { out, lits } = mask(u.text);
        const dml = KIND.DML.test(uncomment(out, lits).trim());
        // One Oracle statement may become several (INSERT ALL): count the rows of each.
        u.sqls.forEach((q) => { db.exec(q); if (dml && !/^(BEGIN|COMMIT)$/i.test(q)) changes += db.getRowsModified(); });
      } catch (e) { return { error: toError(e, u.text), changes, results: [] }; }
    }
    const results = (checks || []).map((probe) => {
      db.exec('SAVEPOINT ora_probe');
      try {
        let res = null;
        for (const u of script(String(probe))) {
          if (u.unsupported) return { error: { text: `unsupported: ${u.unsupported}` } };
          // The probe runs inside the savepoint: no BEGIN / COMMIT of its own.
          const qs = u.sqls.filter((q) => !/^(BEGIN|COMMIT)$/i.test(q));
          let r = [];
          try { qs.forEach((q) => { r = db.exec(q); }); } catch (e) { return { error: toError(e, u.text) }; }
          if (qs.length) res = r.length ? r[0] : null;
        }
        return { cols: res ? res.columns : [], rows: res ? res.values : [] };
      } finally {
        db.exec('ROLLBACK TO ora_probe');
        db.exec('RELEASE ora_probe');
      }
    });
    return { changes, results };
  }

  /* Oracle reserved words (V$RESERVED_WORDS): cannot be table or column names unless quoted. */
  const RESERVED = new Set(('ACCESS ADD ALL ALTER AND ANY AS ASC AUDIT BETWEEN BY CHAR CHECK CLUSTER COLUMN COMMENT COMPRESS CONNECT CREATE CURRENT DATE DECIMAL DEFAULT DELETE DESC DISTINCT DROP ELSE EXCLUSIVE EXISTS FILE FLOAT FOR FROM GRANT GROUP HAVING IDENTIFIED IMMEDIATE IN INCREMENT INDEX INITIAL INSERT INTEGER INTERSECT INTO IS LEVEL LIKE LOCK LONG MAXEXTENTS MINUS MODE MODIFY NOAUDIT NOCOMPRESS NOT NOWAIT NULL NUMBER OF OFFLINE ON ONLINE OPTION OR ORDER PCTFREE PRIOR PUBLIC RAW RENAME RESOURCE REVOKE ROW ROWID ROWNUM ROWS SELECT SESSION SET SHARE SIZE SMALLINT START SUCCESSFUL SYNONYM SYSDATE TABLE THEN TO TRIGGER UID UNION UNIQUE UPDATE USER VALIDATE VALUES VARCHAR VARCHAR2 VIEW WHENEVER WHERE WITH').split(' '));
  const isReserved = (name) => RESERVED.has(String(name).toUpperCase());

  /* Oracle text functions SQLite lacks, as plain JavaScript; js/sql-runner.js registers them on every
     connection (db.create_function) and translate() rewrites INITCAP / LPAD / RPAD to these names. */
  const pad = (left) => (x, n, p) => {
    if (x === null || n === null || p === null || n < 1 || p === '') return null;
    const s = String(x);
    const len = Math.min(Math.trunc(n), 4000);   // Oracle's VARCHAR2 result is at most 4000 bytes in SQL (and no huge strings here)
    if (s.length >= len) return s.slice(0, len);
    const fill = String(p).repeat(Math.ceil((len - s.length) / String(p).length)).slice(0, len - s.length);
    return left ? fill + s : s + fill;
  };
  const FUNCTIONS = {
    ora_initcap: (x) => (x === null ? null : String(x).toLowerCase().replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())),
    ora_lpad: pad(true),
    ora_rpad: pad(false),
    // Raises an Oracle error from inside a statement (a TO_DATE literal that does not match its format…):
    // sql.js turns the exception into the statement's error (it keeps the text of a thrown string, not of an
    // Error object), and oraError() reads the code back.
    ora_error: (msg) => { throw String(msg); },   // eslint-disable-line no-throw-literal
    ora_chr: (n) => (n === null || n === undefined ? null : String.fromCharCode(Number(n))),   // CHR(n)
    // A DATE ('YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS') plus n days (fractions too, as in Oracle); the time is kept,
    // and shown only when there is one. Used by the rewrite of date_column ± n.
    ora_date_add: (d, n) => {
      if (d === null || d === undefined || n === null || n === undefined) return null;
      const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(d));
      if (!m || !Number.isFinite(Number(n))) return null;
      const x = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) + Math.round(Number(n) * 86400) * 1000);
      const p = (v) => String(v).padStart(2, '0');
      const day = `${String(x.getUTCFullYear()).padStart(4, '0')}-${p(x.getUTCMonth() + 1)}-${p(x.getUTCDate())}`;
      const time = m[4] !== undefined || x.getUTCHours() || x.getUTCMinutes() || x.getUTCSeconds();
      return time ? `${day} ${p(x.getUTCHours())}:${p(x.getUTCMinutes())}:${p(x.getUTCSeconds())}` : day;
    },
  };

  return { script, lint, oraError, planLine, cleanup, mask, unmask, isReserved, runChecks, functions: FUNCTIONS };
})();

if (typeof module !== 'undefined') module.exports = OracleDialect;
else globalThis.OracleDialect = OracleDialect;   // loaded as an ES module (Deno: supabase/functions/_shared/engine.js)
