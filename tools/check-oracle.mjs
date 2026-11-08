import { createRequire } from 'node:module';
const O = createRequire(import.meta.url)('../js/oracle-dialect.js');
const cases = [
  ["SELECT * FROM t FETCH FIRST 5 ROWS ONLY;", "SELECT * FROM t LIMIT 5"],
  ["SELECT a FROM x MINUS SELECT a FROM y;", "SELECT a FROM x EXCEPT SELECT a FROM y"],
  ["SELECT NVL(a, 0), MOD(7, 2) FROM DUAL;", "SELECT IFNULL(a, 0), ((7) % (2))"],
  ["CREATE TABLE t (id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, n VARCHAR2(30 CHAR), p NUMBER(6,2), q NUMBER(3), d DATE);", "CREATE TABLE t (id INTEGER PRIMARY KEY, n TEXT, p REAL, q INTEGER, d TEXT)"],
  ["SELECT DATE '2024-01-01' + 3 FROM dual;", "date('2024-01-01', '+' || (3) || ' days')"],
  ["SELECT TO_CHAR(d, 'YYYY-MM') FROM t;", "strftime('%Y-%m', d)"],
  ["INSERT INTO t SELECT LEVEL, 'x' FROM dual CONNECT BY LEVEL <= 10;", "WITH RECURSIVE connect_by_n(level)"],
  ["INSERT INTO t VALUES (1, '');", "VALUES (1, NULL)"],
  ["ALTER TABLE c ADD (a NUMBER(1), b VARCHAR2(5));", "ALTER TABLE c ADD COLUMN a INTEGER"],
  ["DROP TABLE c CASCADE CONSTRAINTS PURGE;", "DROP TABLE c"],
  ["SELECT DECODE(x, 1, 'a', 'b') FROM t;", "CASE x WHEN 1 THEN 'a' ELSE 'b' END"],
  ["SELECT a FROM t WHERE a > ALL (SELECT b FROM u);", "NOT EXISTS (WITH ora_q0(ora_v) AS (SELECT b FROM u) SELECT 1 FROM ora_q0 WHERE NOT ((a) > ora_q0.ora_v)"],
  ["SELECT a FROM t WHERE ROUND(t.a, 1) = ANY (1, 2);", "EXISTS (WITH ora_q0(ora_v) AS (VALUES (1), (2)) SELECT 1 FROM ora_q0 WHERE (ROUND(t.a, 1)) = ora_q0.ora_v)"],
  // Functions and views used by the Functions and Views cards
  ["SELECT INITCAP(n), LPAD(c, 5, '0'), RPAD(n, 8) FROM t;", "SELECT ora_initcap(n), ora_lpad(c, 5, '0'), ora_rpad(n, 8, ' ')"],
  ["SELECT CEIL(2.1), FLOOR(x) FROM t;", "(CAST(2.1 AS INTEGER) + ((2.1) > CAST(2.1 AS INTEGER)))"],
  ["SELECT TRUNC(8.567, 2), TRUNC(DATE '2026-09-14', 'MM') FROM dual;", "(CAST(round((8.567) * 1e2, 9) AS INTEGER) / 1e2), date('2026-09-14', 'start of month')"],
  ["SELECT ADD_MONTHS(DATE '2026-01-31', 1) FROM dual;", "date('2026-01-31', (1) || ' months', 'floor')"],
  ["SELECT DATE '2027-01-20' - DATE '2026-09-14' FROM dual;", "(julianday('2027-01-20') - julianday('2026-09-14'))"],
  ["SELECT TO_CHAR(8.5, 'FM990.00'), TO_CHAR(8.5, '990.00') FROM dual;", "printf('%.2f', 8.5), printf('%7.2f', 8.5)"],
  ["CREATE OR REPLACE VIEW v AS SELECT a FROM t;", "DROP VIEW IF EXISTS v | CREATE VIEW v AS SELECT a FROM t"],
  // SELECT UNIQUE, TO_CHAR of a date typed as text (so = 2025 compares as Oracle's implicit conversion does)
  ["SELECT UNIQUE country FROM c;", "SELECT DISTINCT country FROM c"],
  ["SELECT 1 FROM s WHERE TO_CHAR(d, 'YYYY') = 2025;", "WHERE CAST(strftime('%Y', d) AS TEXT) = 2025"],
  // TO_DATE with month names (DD-MON-YYYY / YY / RR, any case), literals read here, columns read in SQL
  ["SELECT TO_DATE('01-JAN-2025', 'DD-MON-YYYY') FROM dual;", "SELECT '2025-01-01'"],
  ["SELECT TO_DATE('5-feb-25', 'DD-MON-YY'), TO_DATE('31-DEC-99', 'DD-MON-RR') FROM dual;", "SELECT '2025-02-05', '1999-12-31'"],
  ["SELECT TO_DATE('15-MAR-24') FROM dual;", "SELECT '2024-03-15'"],
  ["SELECT TO_DATE('2025/03/07', 'YYYY/MM/DD') FROM dual;", "SELECT '2025-03-07'"],
  ["SELECT TO_DATE('2025-13-01', 'YYYY-MM-DD') FROM dual;", "ora_error('ORA-01861: literal does not match format string')"],
  ["SELECT TO_DATE(x, 'DD-MON-YYYY') FROM t;", "CASE upper(substr(x, 4, 3)) WHEN 'JAN' THEN '01'"],
  // Nested aggregates: computed over the groups of a derived table, at any query level
  ["SELECT AVG(SUM(p)) FROM s GROUP BY c;", "SELECT AVG(ora_n0) FROM (SELECT SUM(p) AS ora_n0 FROM s GROUP BY c) ora_nested"],
  ["SELECT ROUND(MAX(COUNT(*)), 2) AS m FROM s GROUP BY c ORDER BY 1;", "SELECT ROUND(MAX(ora_n0), 2) AS m FROM (SELECT COUNT(*) AS ora_n0 FROM s GROUP BY c) ora_nested"],
  ["SELECT c FROM s GROUP BY c HAVING SUM(p) = (SELECT MAX(SUM(p)) FROM s GROUP BY c);", "HAVING SUM(p) = (SELECT MAX(ora_n0) FROM (SELECT SUM(p) AS ora_n0 FROM s GROUP BY c) ora_nested)"],
  ["SELECT c, MAX(SUM(p)) FROM s GROUP BY c;", "SELECT c, MAX(SUM(p)) FROM s GROUP BY c"],
  // DDL the game's Structure mode relies on, and the dictionary views it probes
  ["ALTER TABLE c DROP (a, b);", "ALTER TABLE c DROP COLUMN a | ALTER TABLE c DROP COLUMN b"],
  ["SELECT view_name FROM user_views;", "FROM (SELECT upper(name) AS view_name FROM sqlite_master WHERE type = 'view')"],
  ["SELECT column_name, nullable FROM user_tab_columns;", "THEN 'N' ELSE 'Y' END AS nullable"],
  ["SELECT column_name FROM user_ind_columns;", "pragma_index_info(m.name)"],
  // DML forms Oracle takes and SQLite needs spelled otherwise: table aliases, qualified SET targets, INSERT ALL
  ["UPDATE games g SET g.stock = (SELECT COUNT(*) FROM sales s WHERE s.game_id = g.game_id), price = 1 WHERE g.game_id = 1;", "UPDATE games AS g SET stock = (SELECT COUNT(*) FROM sales s WHERE s.game_id = g.game_id), price = 1 WHERE g.game_id = 1"],
  ["DELETE FROM sales s WHERE s.sale_id = 1;", "DELETE FROM sales AS s WHERE s.sale_id = 1"],
  ["DELETE sales WHERE sale_id = 1;", "DELETE FROM sales WHERE sale_id = 1"],
  ["INSERT ALL INTO t VALUES (1, 'a') INTO t (a) VALUES (2) SELECT * FROM dual;", "INSERT INTO t VALUES (1, 'a') | INSERT INTO t (a) VALUES (2)"],
  // q-quotes become ordinary literals; TIMESTAMP at midnight is that day; DEFAULT ON NULL
  ["SELECT q'[Captain's Tide]', Q'{a}b}', q'!it's!' FROM dual;", "SELECT 'Captain''s Tide', 'a}b', 'it''s'"],
  ["INSERT INTO s VALUES (1, TIMESTAMP '2025-12-20 00:00:00', TIMESTAMP '2025-12-20 10:30:00');", "VALUES (1, '2025-12-20', '2025-12-20 10:30:00')"],
  ["ALTER TABLE g ADD pegi NUMBER(2) DEFAULT ON NULL 12;", "ADD COLUMN pegi INTEGER DEFAULT 12 NOT NULL ON CONFLICT REPLACE"],
];
let bad = 0;
const fn = O.functions;
[[fn.ora_initcap('ana RUIZ-gil o\'neil'), 'Ana Ruiz-Gil O\'Neil'], [fn.ora_lpad('7', 3, '0'), '007'], [fn.ora_rpad('abc', 2, '*'), 'ab'], [fn.ora_lpad('x', 4, 'ab'), 'abax']].forEach(([got, want]) => {
  if (got !== want) { bad++; console.log('FAIL function', got, 'want', want); }
});
const view = O.script('CREATE VIEW v AS SELECT a FROM t WITH CHECK OPTION;')[0];
if (!view.unsupported) { bad++; console.log('FAIL WITH CHECK OPTION should be unsupported'); }
// Triggers are refused even with a comment between the words (the tests read the text without comments),
// as SQLite's TEMP triggers, and the whole block stays one statement.
for (const src of [
  'CREATE/**/TRIGGER t AFTER INSERT ON r BEGIN DELETE FROM o; END;',
  'CREATE -- x\nTRIGGER t AFTER INSERT ON r BEGIN DELETE FROM o; END;',
  'CREATE TEMP TRIGGER t AFTER INSERT ON r BEGIN DELETE FROM o; END;',
  'CREATE TEMPORARY TRIGGER t AFTER INSERT ON r BEGIN DELETE FROM o; END;',
  '/* lead */ CREATE OR REPLACE /* mid */ TRIGGER t BEFORE INSERT ON r FOR EACH ROW BEGIN NULL; END;',
]) {
  const units = O.script(src);
  if (units.length !== 1 || !units[0].unsupported || units[0].sqls.length) { bad++; console.log('FAIL trigger not refused:', JSON.stringify(src), JSON.stringify(units)); }
  if (!O.lint(src).some((l) => l.level === 'unsupported')) { bad++; console.log('FAIL lint misses trigger:', JSON.stringify(src)); }
}
// A comment that only mentions a trigger is not one.
if (O.script('SELECT 1 /* CREATE TRIGGER */ FROM dual;')[0].unsupported) { bad++; console.log('FAIL comment mentioning a trigger refused'); }
for (const [src, want] of cases) {
  const got = O.script(src).flatMap((u) => u.sqls).join(' | ');
  if (!got.includes(want)) { bad++; console.log('FAIL', src, '\n  got ', got, '\n  want', want); }
}
// Refused without cost (unsupported) and linted: what the sandbox cannot simulate, and SQLite-only ==.
for (const src of ['UPDATE (SELECT s.a, g.b FROM s JOIN g ON g.id = s.g) SET a = b;', 'DELETE FROM (SELECT * FROM s WHERE a = 1);', 'DELETE (SELECT * FROM s);',
  "INSERT INTO s SELECT LEVEL FROM dual CONNECT BY LEVEL <= 100000000;"]) {
  if (!O.script(src)[0].unsupported) { bad++; console.log('FAIL should be unsupported:', src); }
}
if (O.script('INSERT INTO s SELECT LEVEL FROM dual CONNECT BY LEVEL <= 100000;')[0].unsupported) { bad++; console.log('FAIL a 100000-row generator is fine'); }
// INTEGER is valid Oracle: its lint is advice only; REAL is reported as a real error.
{
  const li = O.lint('CREATE TABLE t (a INTEGER PRIMARY KEY, b NUMBER)');
  const lr = O.lint('CREATE TABLE t (a REAL, b INTEGER NOT NULL)');
  if (!(li.length === 1 && li[0].advice) || !(lr.length === 1 && !lr[0].advice)) { bad++; console.log('FAIL INTEGER advice / REAL error', JSON.stringify(li), JSON.stringify(lr)); }
}
for (const src of ['SELECT a FROM t ORDER BY a FETCH FIRST 3 ROWS WITH TIES;','SELECT a FROM t ORDER BY a FETCH FIRST 10 PERCENT ROWS ONLY;', "SELECT TO_DATE(x, 'MM/DD/YYYY') FROM t;", "SELECT TO_DATE('1 Jan 2025', 'DD Month YYYY HH24') FROM dual;"]) {
  if (!O.script(src)[0].unsupported) { bad++; console.log('FAIL should be unsupported:', src); }
}
if (!O.lint('SELECT a FROM t ORDER BY a FETCH FIRST 3 ROWS WITH TIES').some((l) => l.level === 'unsupported')) { bad++; console.log('FAIL lint misses WITH TIES'); }
if (!O.lint("SELECT a FROM t WHERE b == 'x'").length || O.lint("SELECT a FROM t WHERE b = '=='").length) { bad++; console.log('FAIL lint == (outside strings only)'); }
if (JSON.stringify(O.oraError('ORA-01861: literal does not match format string')) !== '{"code":"ORA-01861","text":"literal does not match format string"}') { bad++; console.log('FAIL oraError reads an ORA code back'); }
// Error codes chosen by the failing statement (comments ahead of it do not count).
[
  ['NOT NULL constraint failed: t.a', 'INSERT INTO t VALUES (NULL)', 'ORA-01400'],
  ['NOT NULL constraint failed: t.a', '-- set it\nUPDATE t SET a = NULL', 'ORA-01407'],
  ['FOREIGN KEY constraint failed', '/* x */ DELETE FROM p', 'ORA-02292'],
  ['FOREIGN KEY constraint failed', 'INSERT INTO c VALUES (1, 9)', 'ORA-02291'],
  ['FOREIGN KEY constraint failed', 'UPDATE p SET id = 9', 'ORA-02292'],   // without the database: the parent side
  ['no such view: v', 'DROP VIEW v', 'ORA-00942'],
  ['Cannot add a NOT NULL column with default value NULL', 'ALTER TABLE t ADD (c NUMBER NOT NULL)', 'ORA-01758'],
].forEach(([msg, sql, code]) => { if (O.oraError(msg, sql).code !== code) { bad++; console.log('FAIL oraError', msg, JSON.stringify(sql), '→', O.oraError(msg, sql).code, 'want', code); } });

// The same on the engine: the translations give Oracle's answers.
const initSqlJs = createRequire(import.meta.url)('sql.js');
const SQL = await initSqlJs();
const db = new SQL.Database();
Object.entries(O.functions).forEach(([name, fn]) => db.create_function(name, fn));
db.run('PRAGMA case_sensitive_like = ON;');
const run = (text) => { let r = []; O.script(text, { finish: true }).forEach((u) => u.sqls.forEach((q) => { r = db.exec(q); })); return r.length ? r[0].values : []; };
run("CREATE TABLE s (c NUMBER, p NUMBER(6,2), d DATE, n VARCHAR2(20)); INSERT INTO s VALUES (1, 10, DATE '2025-01-05', 'Sky Box'); INSERT INTO s VALUES (1, 20, DATE '2024-03-01', 'Blue'); INSERT INTO s VALUES (2, 5, DATE '2025-07-09', 'sky low');");
run("CREATE TABLE dn (k NUMBER(2) PRIMARY KEY, a NUMBER(2) DEFAULT ON NULL 12); INSERT INTO dn VALUES (1, NULL); INSERT INTO dn (k) VALUES (2); INSERT INTO dn VALUES (3, q'[7]');");
// Arithmetic on DATE columns (the dialect learns them from CREATE TABLE / ALTER TABLE ADD).
run("CREATE TABLE ev2 (id NUMBER(3) PRIMARY KEY, starts DATE, ends DATE, due_date VARCHAR2(10)); INSERT INTO ev2 VALUES (1, DATE '2025-01-30', DATE '2025-02-04', '2025-01-01'); ALTER TABLE ev2 ADD (closes TIMESTAMP);");
run("UPDATE ev2 SET closes = TIMESTAMP '2025-02-10 18:30:00';");
run('CREATE TABLE oq_e (v NUMBER); CREATE TABLE oq_n (v NUMBER); INSERT INTO oq_n VALUES (1); INSERT INTO oq_n VALUES (NULL);');   // quantified comparisons: an empty set, a set with a NULL
for (const [src, want] of [
  ['SELECT due_date + 1 FROM ev2;', 'SELECT due_date + 1 FROM ev2'],   // a column only named like a date: untouched
  ['SELECT e.starts - 3 FROM ev2 e;', 'ora_date_add(e.starts, -(3))'],
  ['SELECT ends - starts FROM ev2;', '(julianday(ends) - julianday(starts))'],
]) {
  const got = O.script(src).flatMap((u) => u.sqls).join(' | ');
  if (!got.includes(want)) { bad++; console.log('FAIL date arithmetic translation', src, '\n  got ', got, '\n  want', want); }
}
const runtime = [
  ['SELECT starts + 3, starts - 30, 2 + starts FROM ev2', [['2025-02-02', '2024-12-31', '2025-02-01']]],
  ['SELECT ends - starts, e.ends - DATE \'2025-01-01\', ends - TO_DATE(\'01-JAN-2025\', \'DD-MON-YYYY\') FROM ev2 e', [[5, 34, 34]]],
  ['SELECT COUNT(*) FROM ev2 WHERE starts + 5 >= ends AND starts - 1 < DATE \'2025-02-01\'', [[1]]],
  ['SELECT starts + 0.5, closes + 1, ADD_MONTHS(starts, 1) + 1, TRUNC(closes) - 1 FROM ev2', [['2025-01-30 12:00:00', '2025-02-11 18:30:00', '2025-03-01', '2025-02-09']]],
  ['SELECT id FROM ev2 ORDER BY starts - id', [[1]]],
  ['SELECT CHR(65) || CHR(66) FROM dual', [['AB']]],
  ['SELECT k, a FROM dn ORDER BY k', [[1, 12], [2, 12], [3, 7]]],   // DEFAULT ON NULL: an explicit NULL gets the default too
  ["SELECT COUNT(*) FROM s WHERE TO_CHAR(d, 'YYYY') = 2025", [[2]]],
  ["SELECT COUNT(*) FROM s WHERE d >= TO_DATE('01-jan-2025', 'DD-MON-YYYY')", [[2]]],
  ["SELECT COUNT(*) FROM s WHERE d < TO_DATE('01-JUN-25', 'DD-MON-RR')", [[2]]],
  ['SELECT AVG(SUM(p)) FROM s GROUP BY c', [[17.5]]],
  ['SELECT c FROM s GROUP BY c HAVING SUM(p) = (SELECT MAX(SUM(p)) FROM s GROUP BY c)', [[1]]],
  ["SELECT COUNT(*) FROM s WHERE n LIKE 'Sky%'", [[1]]],
  ['SELECT UNIQUE c FROM s ORDER BY c', [[1], [2]]],
  // Quantified comparisons (ALL / ANY / SOME) in WHERE and in HAVING (an aggregate against the set): Oracle's
  // results, an empty set (ALL true, ANY false) and a NULL in the set (unknown unless decided).
  ['SELECT p FROM s WHERE p >= ALL (SELECT p FROM s)', [[20]]],
  ['SELECT p FROM s WHERE p < ANY (SELECT p FROM s) ORDER BY p', [[5], [10]]],
  ['SELECT p FROM s WHERE p <> ALL (SELECT p FROM s WHERE c = 1)', [[5]]],
  ['SELECT COUNT(*) FROM s WHERE p > ALL (SELECT v FROM oq_e)', [[3]]],
  ['SELECT COUNT(*) FROM s WHERE p = ANY (SELECT v FROM oq_e)', [[0]]],
  ['SELECT c FROM s GROUP BY c HAVING SUM(p) >= ALL (SELECT SUM(p) FROM s GROUP BY c)', [[1]]],
  ['SELECT c FROM s GROUP BY c HAVING SUM(p) <= ALL (SELECT SUM(p) FROM s GROUP BY c)', [[2]]],
  ['SELECT c FROM s GROUP BY c HAVING SUM(p) = ANY (SELECT SUM(p) FROM s WHERE c = 2 GROUP BY c)', [[2]]],
  ['SELECT c FROM s GROUP BY c HAVING SUM(p) = ALL (SELECT SUM(p) FROM s GROUP BY c)', []],
  ['SELECT c FROM s GROUP BY c HAVING SUM(p) <> ALL (SELECT SUM(p) FROM s WHERE c = 2 GROUP BY c)', [[1]]],
  ['SELECT c FROM s GROUP BY c HAVING SUM(p) <> ANY (SELECT SUM(p) FROM s GROUP BY c) ORDER BY c', [[1], [2]]],
  ['SELECT c FROM s GROUP BY c HAVING SUM(p) > SOME (SELECT SUM(p) FROM s GROUP BY c)', [[1]]],
  ['SELECT c FROM s GROUP BY c HAVING COUNT(*) > ALL (SELECT v FROM oq_e) ORDER BY c', [[1], [2]]],
  ['SELECT c FROM s GROUP BY c HAVING COUNT(*) = ANY (SELECT v FROM oq_e)', []],
  ['SELECT c FROM s GROUP BY c HAVING SUM(p) > ALL (SELECT v FROM oq_n)', []],
  ['SELECT c FROM s GROUP BY c HAVING SUM(p) > ANY (SELECT v FROM oq_n) ORDER BY c', [[1], [2]]],
  ['SELECT c FROM s GROUP BY c HAVING NOT (SUM(p) < ALL (SELECT v FROM oq_n)) ORDER BY c', [[1], [2]]],
  ['SELECT c FROM s GROUP BY c HAVING NOT (SUM(p) > ALL (SELECT v FROM oq_n))', []],
  ['SELECT c FROM s GROUP BY c HAVING COUNT(DISTINCT p) >= ALL (SELECT COUNT(DISTINCT p) FROM s GROUP BY c)', [[1]]],
];
for (const [q, want] of runtime) {
  let got;
  try { got = run(q); } catch (e) { got = e.message; }
  if (JSON.stringify(got) !== JSON.stringify(want)) { bad++; console.log('FAIL runtime', q, '\n  got ', JSON.stringify(got), '\n  want', JSON.stringify(want)); }
}
run('UPDATE ev2 SET ends = ends + 1 WHERE id = 1');   // date arithmetic in SET
if (JSON.stringify(run('SELECT ends, due_date FROM ev2')) !== '[["2025-02-05","2025-01-01"]]') { bad++; console.log('FAIL date arithmetic in SET', JSON.stringify(run('SELECT ends, due_date FROM ev2'))); }
try { run("SELECT COUNT(*) FROM s WHERE d > TO_DATE('2025-13-01', 'YYYY-MM-DD')"); bad++; console.log('FAIL a bad TO_DATE literal should raise'); } catch (e) {
  if ((O.oraError(e.message) || {}).code !== 'ORA-01861') { bad++; console.log('FAIL bad TO_DATE raised', e.message); }
}

const tx = O.script("DELETE FROM t; SAVEPOINT a; UPDATE t SET x = 1; ROLLBACK TO a; COMMIT; CREATE TABLE z (a NUMBER); INSERT INTO z VALUES (1); CREATE INDEX i ON z (a);").flatMap((u) => u.sqls);
console.log(tx.join(' ; '));
console.log(O.lint("SELECT * FROM t LIMIT 3; BEGIN;"), O.oraError('FOREIGN KEY constraint failed', 'DELETE FROM x'));
console.log(bad ? `${bad} failed` : 'all translation cases ok');
process.exit(bad ? 1 : 0);
