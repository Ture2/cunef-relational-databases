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
];
let bad = 0;
for (const [src, want] of cases) {
  const got = O.script(src).flatMap((u) => u.sqls).join(' | ');
  if (!got.includes(want)) { bad++; console.log('FAIL', src, '\n  got ', got, '\n  want', want); }
}
const tx = O.script("DELETE FROM t; SAVEPOINT a; UPDATE t SET x = 1; ROLLBACK TO a; COMMIT; CREATE TABLE z (a NUMBER); INSERT INTO z VALUES (1); CREATE INDEX i ON z (a);").flatMap((u) => u.sqls);
console.log(tx.join(' ; '));
console.log(O.lint("SELECT * FROM t LIMIT 3; BEGIN;"), O.oraError('FOREIGN KEY constraint failed', 'DELETE FROM x'));
console.log(bad ? `${bad} failed` : 'all translation cases ok');
process.exit(bad ? 1 : 0);
