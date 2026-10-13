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
];
let bad = 0;
const fn = O.functions;
[[fn.ora_initcap('ana RUIZ-gil o\'neil'), 'Ana Ruiz-Gil O\'Neil'], [fn.ora_lpad('7', 3, '0'), '007'], [fn.ora_rpad('abc', 2, '*'), 'ab'], [fn.ora_lpad('x', 4, 'ab'), 'abax']].forEach(([got, want]) => {
  if (got !== want) { bad++; console.log('FAIL function', got, 'want', want); }
});
const view = O.script('CREATE VIEW v AS SELECT a FROM t WITH CHECK OPTION;')[0];
if (!view.unsupported) { bad++; console.log('FAIL WITH CHECK OPTION should be unsupported'); }
for (const [src, want] of cases) {
  const got = O.script(src).flatMap((u) => u.sqls).join(' | ');
  if (!got.includes(want)) { bad++; console.log('FAIL', src, '\n  got ', got, '\n  want', want); }
}
const tx = O.script("DELETE FROM t; SAVEPOINT a; UPDATE t SET x = 1; ROLLBACK TO a; COMMIT; CREATE TABLE z (a NUMBER); INSERT INTO z VALUES (1); CREATE INDEX i ON z (a);").flatMap((u) => u.sqls);
console.log(tx.join(' ; '));
console.log(O.lint("SELECT * FROM t LIMIT 3; BEGIN;"), O.oraError('FOREIGN KEY constraint failed', 'DELETE FROM x'));
console.log(bad ? `${bad} failed` : 'all translation cases ok');
process.exit(bad ? 1 : 0);
