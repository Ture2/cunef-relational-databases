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
   ========================================================================== */

const OracleDialect = (() => {
  /* ---- Masking: strings, quoted names and comments are hidden while we rewrite -------- */

  function mask(sql) {
    const lits = [];
    const out = sql.replace(/'(?:[^']|'')*'|"[^"]*"|--[^\n]*|\/\*[\s\S]*?\*\//g, (m) => { lits.push(m); return `§${lits.length - 1}§`; });
    return { out, lits };
  }
  const unmask = (s, lits) => s.replace(/§(\d+)§/g, (_, i) => lits[+i]);
  const isComment = (l) => l.startsWith('--') || l.startsWith('/*');

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

  /* ---- Translation of one statement ---------------------------------------------------- */

  const FORMAT = [['YYYY', '%Y'], ['YY', '%y'], ['MM', '%m'], ['DD', '%d'], ['HH24', '%H'], ['MI', '%M'], ['SS', '%S']];
  const sqliteFormat = (f) => FORMAT.reduce((s, [o, n]) => s.replace(new RegExp(o, 'gi'), n), f);

  const KIND = {
    DML: /^(INSERT|UPDATE|DELETE|MERGE)\b/i,
    DDL: /^(CREATE|ALTER|DROP|TRUNCATE|RENAME|ANALYZE)\b/i,
    PLSQL: /^(DECLARE\b|CREATE\s+(OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION|TRIGGER|PACKAGE|TYPE)\b|BEGIN\s+(?!TRANSACTION\b)\S)/i,
  };

  /* Returns { sqls, note?, unsupported? } for one masked statement. */
  function translate(masked, lits) {
    let s = masked.trim();
    for (let m; (m = /^§(\d+)§\s*/.exec(s)) && isComment(lits[+m[1]]);) s = s.slice(m[0].length);   // leading comments
    const done = (sqls, extra) => ({ sqls: [].concat(sqls).map((x) => unmask(x, lits)), ...extra });
    if (!s) return { sqls: [] };

    if (KIND.PLSQL.test(s)) return done([], { unsupported: 'PL/SQL blocks, procedures and triggers' });
    if (/^BEGIN(\s+TRANSACTION)?$/i.test(s)) return done([], { note: 'Oracle starts a transaction by itself with the first INSERT, UPDATE or DELETE: BEGIN is not needed.' });
    if (/^SELECT\s+\*\s+FROM\s+TABLE\s*\(\s*DBMS_XPLAN/i.test(s)) return done([], { note: 'The plan is shown above, under EXPLAIN PLAN FOR.' });
    if (/^EXEC(UTE)?\s+DBMS_STATS\./i.test(s) || /^ANALYZE\s+TABLE\b/i.test(s)) return done('ANALYZE', { note: 'Statistics gathered (DBMS_STATS).' });
    if (/^(GRANT|REVOKE|CREATE\s+(ROLE|USER)|ALTER\s+USER|COMMENT\s+ON|CREATE\s+(SEQUENCE|BITMAP|CLUSTER|MATERIALIZED|SYNONYM)|ALTER\s+TABLE\s+\w+\s+(MODIFY|ADD\s+CONSTRAINT|DROP\s+CONSTRAINT|RENAME\s+CONSTRAINT))/i.test(s)) {
      return done([], { unsupported: 'this statement (privileges, sequences, bitmap indexes, MODIFY or ADD CONSTRAINT)' });
    }
    if (/\bPARTITION\s+BY\b/i.test(s)) return done([], { unsupported: 'partitioned tables' });
    if (/\bROWNUM\b|\(\+\)|\bCONNECT\s+BY\b(?!\s+LEVEL\s*<=)|\bSTART\s+WITH\b|\bPIVOT\b|\bXMLTABLE\b|\bJSON_TABLE\b|\.NEXTVAL\b|\.CURRVAL\b/i.test(s)) {
      return done([], { unsupported: 'ROWNUM, (+) joins, hierarchical queries or sequences' });
    }

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
    s = s.replace(/\bFROM\s+USER_INDEXES\b/gi, "FROM (SELECT upper(name) AS index_name, upper(tbl_name) AS table_name FROM sqlite_master WHERE type = 'index')");
    s = s.replace(/\bFROM\s+USER_TAB_COLUMNS\b/gi, "FROM (SELECT upper(m.name) AS table_name, upper(p.name) AS column_name, p.cid + 1 AS column_id FROM sqlite_master m, pragma_table_info(m.name) p WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%')");

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
      return fmt && /[YMDH]/i.test(fmt) ? `strftime('${sqliteFormat(fmt.slice(1, -1))}', ${x})` : `CAST(${x} AS TEXT)`;
    });
    s = rewriteCalls(s, 'TO_DATE', ([x, f]) => {
      const fmt = f && /^§(\d+)§$/.test(f) ? lits[+f.slice(1, -1)].slice(1, -1).toUpperCase() : 'YYYY-MM-DD';
      if (fmt === 'DD/MM/YYYY' || fmt === 'DD-MM-YYYY') return `(substr(${x}, 7, 4) || '-' || substr(${x}, 4, 2) || '-' || substr(${x}, 1, 2))`;
      return `date(${x})`;
    });
    s = rewriteCalls(s, 'TO_NUMBER', ([x]) => `CAST(${x} AS REAL)`);
    s = rewriteCalls(s, 'EXTRACT', ([x]) => {
      const m = /^(YEAR|MONTH|DAY)\s+FROM\s+(.+)$/is.exec(x);
      return m ? `CAST(strftime('${{ YEAR: '%Y', MONTH: '%m', DAY: '%d' }[m[1].toUpperCase()]}', ${m[2]}) AS INTEGER)` : `EXTRACT(${x})`;
    });
    s = rewriteCalls(s, 'LISTAGG', ([x, sep]) => `group_concat(${x}${sep ? `, ${sep}` : ''})`);
    s = s.replace(/\bWITHIN\s+GROUP\s*\([^)]*\)/gi, '');

    // Dates
    s = dateArithmetic(s, '\\bDATE\\s+(§\\d+§)', (m) => m[1]);
    s = dateArithmetic(s, '\\b(SYSDATE|CURRENT_DATE)\\b', () => "'now'");
    s = s.replace(/\bDEFAULT\s+(SYSDATE|CURRENT_DATE)\b/gi, 'DEFAULT CURRENT_DATE');
    s = s.replace(/\bDEFAULT\s+(SYSTIMESTAMP|CURRENT_TIMESTAMP)\b/gi, 'DEFAULT CURRENT_TIMESTAMP');
    s = s.replace(/\b(?:DATE|TIMESTAMP)\s+(§\d+§)/gi, '$1');
    s = s.replace(/(?<!DEFAULT\s+)\b(SYSDATE|CURRENT_DATE)\b/gi, "date('now')").replace(/(?<!DEFAULT\s+)\b(SYSTIMESTAMP|CURRENT_TIMESTAMP)\b/gi, "datetime('now')");
    s = s.replace(/(?<!\b(?:BEGIN|SET)\s+)\bTRANSACTION\b/gi, '"transaction"');   // a keyword in SQLite, a plain name in Oracle

    // Row limiting and set operators
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
      if (KIND.PLSQL.test(cur.trim())) {
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
    { re: /\bEXCEPT\b/i, level: 'warn', msg: 'Oracle calls the set difference MINUS.', fix: 'Replace EXCEPT with MINUS.' },
    { re: /\bAUTOINCREMENT\b/i, level: 'warn', msg: 'Oracle has no AUTOINCREMENT.', fix: 'Use id NUMBER GENERATED ALWAYS AS IDENTITY.' },
    { re: /\bTEXT\b/i, level: 'warn', msg: 'TEXT is not an Oracle type.', fix: 'Use VARCHAR2(n) (or CLOB for long text).' },
    { re: /\b(INTEGER|REAL)\b\s*(PRIMARY|NOT|,|\)|DEFAULT)/i, level: 'warn', msg: 'Oracle prefers NUMBER: INTEGER is accepted but REAL is not.', fix: 'Use NUMBER(p), NUMBER(p, s) or FLOAT.' },
    { re: /\bILIKE\b/i, level: 'warn', msg: 'ILIKE is PostgreSQL.', fix: 'Use LOWER(col) LIKE LOWER(\'…\').' },
    { re: /\bIFNULL\s*\(/i, level: 'warn', msg: 'IFNULL is MySQL / SQLite.', fix: 'Use NVL(a, b) or COALESCE(a, b).' },
    { re: /\bdatetime\s*\(|\bstrftime\s*\(|\bdate\s*\(\s*'now'/i, level: 'warn', msg: 'date(), datetime() and strftime() are SQLite functions.', fix: 'Use SYSDATE, TO_CHAR(d, \'YYYY-MM-DD\') and TO_DATE().' },
    { re: /\bSUBSTRING\s*\(/i, level: 'warn', msg: 'Oracle names it SUBSTR.', fix: 'Use SUBSTR(text, start, length).' },
    { re: /\bsqlite_master\b|\bPRAGMA\b/i, level: 'warn', msg: 'sqlite_master and PRAGMA are SQLite.', fix: 'Query the data dictionary: USER_TABLES, USER_TAB_COLUMNS, USER_INDEXES.' },
    { re: /\bBEGIN\s*(TRANSACTION)?\s*;/i, level: 'warn', msg: 'In Oracle, BEGIN starts a PL/SQL block, not a transaction.', fix: 'Just run your INSERT, UPDATE or DELETE: the transaction opens by itself.' },
    { re: /\bEXPLAIN\s+QUERY\s+PLAN\b/i, level: 'warn', msg: 'EXPLAIN QUERY PLAN is SQLite.', fix: 'Use EXPLAIN PLAN FOR … followed by SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY).' },
    { re: /\bANALYZE\s*;/i, level: 'warn', msg: 'A bare ANALYZE is SQLite.', fix: 'Use EXEC DBMS_STATS.GATHER_TABLE_STATS(USER, \'TABLE_NAME\').' },
    { re: /\b(WHERE|AND|OR)\s+[\w.]+\s*(?:>=?|<=?|=|BETWEEN)\s*'\d{4}-\d{2}-\d{2}'/i, level: 'warn', msg: 'Comparing a date column with the text \'2024-01-01\' depends on NLS settings and often fails (ORA-01861).', fix: 'Write a date literal: DATE \'2024-01-01\'.' },
    { re: /\bCREATE\s+(OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION|TRIGGER|PACKAGE)\b|\bDECLARE\b/i, level: 'unsupported', msg: 'PL/SQL cannot run in the browser sandbox.', fix: 'Copy it to FreeSQL.' },
    { re: /\bROWNUM\b/i, level: 'unsupported', msg: 'ROWNUM is not simulated here.', fix: 'Use FETCH FIRST n ROWS ONLY, which also works on Oracle.' },
    { re: /\(\+\)/, level: 'unsupported', msg: 'The (+) outer-join syntax is not simulated here.', fix: 'Use LEFT JOIN / RIGHT JOIN, the ANSI syntax that Oracle also accepts.' },
  ];

  function lint(sql) {
    const { out } = mask(sql);
    const seen = new Set();
    const found = [];
    for (const r of RULES) {
      if (r.re.test(out) && !seen.has(r.msg)) { seen.add(r.msg); found.push({ level: r.level, msg: r.msg, fix: r.fix }); }
    }
    return found;
  }

  /* ---- Errors and plans ---------------------------------------------------------------- */

  function oraError(message, sql = '') {
    const m = String(message);
    let r;
    if ((r = /no such table: (\w+)/i.exec(m))) return { code: 'ORA-00942', text: 'table or view does not exist', name: r[1] };
    if ((r = /no such column: ([\w.]+)/i.exec(m))) return { code: 'ORA-00904', text: `"${r[1].split('.').pop().toUpperCase()}": invalid identifier` };
    if ((r = /UNIQUE constraint failed: ([\w.]+)/i.exec(m))) return { code: 'ORA-00001', text: `unique constraint (${r[1].toUpperCase().replace('.', '_')}) violated` };
    if ((r = /NOT NULL constraint failed: (\w+)\.(\w+)/i.exec(m))) return { code: 'ORA-01400', text: `cannot insert NULL into ("${r[1].toUpperCase()}"."${r[2].toUpperCase()}")` };
    if (/FOREIGN KEY constraint failed/i.test(m)) {
      return /^\s*(DELETE|UPDATE)/i.test(sql) ? { code: 'ORA-02292', text: 'integrity constraint violated - child record found' } : { code: 'ORA-02291', text: 'integrity constraint violated - parent key not found' };
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

  /* Oracle reserved words (V$RESERVED_WORDS): cannot be table or column names unless quoted. */
  const RESERVED = new Set(('ACCESS ADD ALL ALTER AND ANY AS ASC AUDIT BETWEEN BY CHAR CHECK CLUSTER COLUMN COMMENT COMPRESS CONNECT CREATE CURRENT DATE DECIMAL DEFAULT DELETE DESC DISTINCT DROP ELSE EXCLUSIVE EXISTS FILE FLOAT FOR FROM GRANT GROUP HAVING IDENTIFIED IMMEDIATE IN INCREMENT INDEX INITIAL INSERT INTEGER INTERSECT INTO IS LEVEL LIKE LOCK LONG MAXEXTENTS MINUS MODE MODIFY NOAUDIT NOCOMPRESS NOT NOWAIT NULL NUMBER OF OFFLINE ON ONLINE OPTION OR ORDER PCTFREE PRIOR PUBLIC RAW RENAME RESOURCE REVOKE ROW ROWID ROWNUM ROWS SELECT SESSION SET SHARE SIZE SMALLINT START SUCCESSFUL SYNONYM SYSDATE TABLE THEN TO TRIGGER UID UNION UNIQUE UPDATE USER VALIDATE VALUES VARCHAR VARCHAR2 VIEW WHENEVER WHERE WITH').split(' '));
  const isReserved = (name) => RESERVED.has(String(name).toUpperCase());

  return { script, lint, oraError, planLine, cleanup, mask, unmask, isReserved };
})();

if (typeof module !== 'undefined') module.exports = OracleDialect;
