// Checks the question banks of Query for a Million (data/game-bank.js and data/game-bank-{insert,update,delete,ddl}.js)
// and the pure game logic (js/game-core.js) against docs/game-quiz.md §3–§5, §7, §11 and §13.
//  1. Database: the setup builds on sql.js through OracleDialect (tools/game-sql.mjs, the browser's engine); schema
//     and types match the tables; the designed facts hold (never-buyers, never-sold games, unrated games).
//  2. Select questions: 45 ids, 3 per rung; each solution is one Oracle SELECT (checkQuery, no Oracle-only errors),
//     returns 1–8 rows, gives the same result on a database built with the INSERTs in reverse order, and respects its
//     band; traps fail, templates run and differ; clause words appear in the solution; grading as Oracle would.
//  3. Mode questions (insert, update, delete, ddl): see the section header. While C1/C2 fill the banks a mode may have
//     fewer than its 30 questions: the count is reported ('n of 30') and fails only with FULL=1 or once 30 exist.
//  4. GameCore: ladder, bands, prizes, draw, state transitions (pure), checkQuery, oracleCheck, grade, diagnose,
//     checkAnswer, gradeChecks, drawMixed, mixedUnlocked, migrateV1, and the executeChecks semantics.
// Run from tools/: node check-game-bank.mjs   (VERBOSE=1 prints the passing checks and every result too; FULL=1
// demands complete banks)
import { loadGame } from './game-sql.mjs';

const { O, G, BANK, build, execute, executeChecks, reversedSetup } = await loadGame();

let bad = 0;
let good = 0;
const VERBOSE = !!process.env.VERBOSE;
const expect = (ok, what) => {
  if (ok) good++; else bad++;
  if (!ok || VERBOSE) console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  return ok;
};
const section = (name) => console.log(`\n## ${name}`);
const show = (r) => (r.error ? `ERROR ${r.error.code || ''} ${r.error.text}` : `${r.rows.length} row(s): ${r.rows.map((x) => x.join(' | ')).join(' ; ')}`);

/* ---- 1. Database ---------------------------------------------------------------------------- */
section('Database');
let db;
let db2;
try {
  db = build(BANK.setup);
  db2 = build(reversedSetup(BANK.setup));
  expect(true, 'the setup builds (and again with the INSERTs reversed)');
} catch (e) { expect(false, `the setup builds (${e.message})`); console.log(`\n${bad} check(s) failed`); process.exit(1); }
const one = (sql) => db.exec(sql)[0].values[0][0];
const tables = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")[0].values.map((r) => r[0]);
expect(JSON.stringify(tables) === JSON.stringify(Object.keys(BANK.schema).sort()), `tables are exactly ${Object.keys(BANK.schema).join(', ')}`);
Object.entries(BANK.schema).forEach(([t, cols]) => {
  const got = db.exec(`SELECT name FROM pragma_table_info('${t}') ORDER BY cid`)[0].values.map((r) => r[0]);
  expect(JSON.stringify(got) === JSON.stringify(cols), `schema.${t} matches the table: ${got.join(', ')}`);
  const types = BANK.types[t] || [];
  expect(types.length === cols.length, `types.${t} has one type per column`);
  const block = new RegExp(`CREATE TABLE ${t} \\(([\\s\\S]*?)\\n\\);`).exec(BANK.setup);
  cols.forEach((c, i) => expect(!!block && new RegExp(`^\\s*${c}\\s+${(types[i] || '?').replace(/[()]/g, '\\$&')}(\\s|,|$)`, 'm').test(block[1]), `types.${t}.${c} is ${types[i]} in the DDL`));
});
const counts = Object.fromEntries(Object.keys(BANK.schema).map((t) => [t, one(`SELECT COUNT(*) FROM ${t}`)]));
console.log(`rows: ${Object.entries(counts).map(([t, n]) => `${t} ${n}`).join(', ')}`);
expect(counts.customers >= 18 && counts.games >= 20 && counts.sales >= 50, 'about 20 customers, 24 games, 50+ sales');
expect(one('SELECT COUNT(*) FROM customers c WHERE NOT EXISTS (SELECT 1 FROM sales s WHERE s.customer_id = c.customer_id)') >= 2, 'some customers never bought anything');
expect(one('SELECT COUNT(*) FROM games g WHERE NOT EXISTS (SELECT 1 FROM sales s WHERE s.game_id = g.game_id)') >= 2, 'some games never sold');
expect(one('SELECT COUNT(*) FROM games WHERE rating IS NULL') >= 2, 'some games have no rating');
expect(one("SELECT COUNT(*) FROM sales WHERE sale_date < '2024-01-01' OR sale_date > '2025-12-31'") === 0, 'every sale is in 2024–2025');
expect(one('SELECT COUNT(*) FROM sales s JOIN customers c ON c.customer_id = s.customer_id WHERE s.sale_date < c.signup_date') === 0, 'nobody buys before signing up');
expect(one("SELECT COUNT(DISTINCT genre) FROM games WHERE genre IN ('Action', 'Adventure', 'Puzzle', 'RPG', 'Racing', 'Sports', 'Strategy')") === 7
  && one("SELECT COUNT(*) FROM games WHERE genre NOT IN ('Action', 'Adventure', 'Puzzle', 'RPG', 'Racing', 'Sports', 'Strategy')") === 0, 'the seven genres, and only those');
expect(one('SELECT COUNT(*) FROM games WHERE price < 4.99 OR price > 69.99') === 0, 'prices between 4.99 and 69.99');
const discounted = one('SELECT COUNT(*) FROM sales s JOIN games g ON g.game_id = s.game_id WHERE abs(s.total_paid - s.quantity * g.price) > 0.001');
expect(discounted >= 1 && discounted <= 4, `total_paid = quantity × price except a few discounted sales (${discounted})`);
expect(one('SELECT COUNT(*) FROM sales s JOIN games g ON g.game_id = s.game_id WHERE s.total_paid > s.quantity * g.price + 0.001') === 0, 'a discount never raises the price');
expect(!/\bLIMIT\b/i.test(BANK.setup) && O.lint(BANK.setup.replace(/^INSERT[^\n]*$/gm, '')).length === 0, 'the setup is plain Oracle');

/* ---- 2. Questions --------------------------------------------------------------------------- */
section('Questions');
const Q = BANK.questions.filter((q) => G.modeOf(q) === 'select');
const ids = Q.map((q) => q.id);
const want = [];
for (let n = 1; n <= 15; n++) ['a', 'b', 'c'].forEach((l) => want.push(`r${String(n).padStart(2, '0')}${l}`));
expect(JSON.stringify(ids) === JSON.stringify(want), '45 ids r01a … r15c, in order, 3 per rung');
const flatSql = (s) => s.replace(/\s+/g, ' ').trim();
const hasSub = (s) => /\(\s*SELECT\b/i.test(s);
const hasAgg = (s) => /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(s);
const RESULTS = {};

Q.forEach((q) => {
  const tag = `[${q.id}]`;
  expect(q.level === +q.id.slice(1, 3), `${tag} level ${q.level} matches the id`);
  expect(typeof q.ordered === 'boolean' && Array.isArray(q.clause) && q.clause.length >= 1 && Array.isArray(q.traps) && q.traps.length >= 1 && q.traps.length <= 3
    && typeof q.solution === 'string' && typeof q.template === 'string', `${tag} has solution, ordered, clause, template and 1–3 traps`);
  const s = q.solution;

  // The solution: one Oracle SELECT, no trailing ;, no LIMIT, nothing Oracle would refuse.
  const cq = G.checkQuery(s);
  expect(cq.ok, `${tag} solution passes checkQuery${cq.ok ? '' : ` (${cq.reason} ${JSON.stringify(cq.detail || '')})`}`);
  expect(!/;\s*$/.test(s) && !/\bLIMIT\b/i.test(s), `${tag} solution has no trailing ; and no LIMIT`);
  const oc = G.oracleCheck(s, BANK.schema);
  expect(!oc, `${tag} solution: nothing Oracle refuses${oc ? ` (${oc.code} ${oc.column || ''})` : ''}`);
  expect(!/[^/*]\/[^/*]/.test(s.replace(/'[^']*'/g, '')), `${tag} solution has no division (SQLite divides integers)`);
  expect(!/\bNULLS\s+(FIRST|LAST)\b/i.test(s), `${tag} solution relies on no NULL ordering`);

  // Band rules.
  if (q.level <= 5) expect(!/\bGROUP\s+BY\b|\bJOIN\b/i.test(s) && !hasSub(s) && !hasAgg(s), `${tag} easy: no GROUP BY, JOIN, subquery or aggregate`);
  else if (q.level <= 10) expect(hasAgg(s) && !/\bJOIN\b/i.test(s) && !hasSub(s), `${tag} medium: an aggregate, no JOIN, no subquery`);
  else expect(/\bJOIN\b/i.test(s) || hasSub(s), `${tag} hard: a JOIN or a subquery`);
  expect(!q.ordered || /\bORDER\s+BY\b/i.test(s), `${tag} ordered questions have an ORDER BY`);

  // The result: 1–8 rows, the same on the reversed database with Oracle's case-sensitive LIKE.
  const r = execute(db, s);
  RESULTS[q.id] = r;
  if (VERBOSE) console.log(`     ${q.id}: ${show(r)}`);
  expect(!r.error && r.rows.length >= 1 && r.rows.length <= 8, `${tag} solution returns 1–8 rows (${r.error ? r.error.text : r.rows.length})`);
  const r2 = execute(db2, s);
  const g2 = G.grade(r2, r, q.ordered);
  expect(g2.ok, `${tag} same result (in the same order when ordered) with the INSERTs reversed and case-sensitive LIKE${g2.ok ? '' : ` (${g2.reason}: ${show(r2)})`}`);
  expect(!r.error && r.rows.every((row) => row.every((v) => v !== null)), `${tag} the answer has no NULLs (clear on screen)`);

  // Key clause: every keyword appears in the solution.
  q.clause.forEach((c) => expect(new RegExp(`\\b${c.trim().split(/\s+/).join('\\s+')}\\b`, 'i').test(s), `${tag} clause ${c} appears in the solution`));

  // Traps: each errors, is refused by Oracle, or grades wrong.
  q.traps.forEach((tr, i) => {
    const t = execute(db, tr);
    const ora = G.oracleCheck(tr, BANK.schema);
    const gr = t.error ? null : G.grade(t, r, q.ordered);
    const fails = !!t.error || !!ora || !gr.ok;
    expect(fails, `${tag} trap ${i + 1} does not pass: ${t.error ? `error ${t.error.code || t.error.text}` : ora ? ora.code : gr.reason}`);
    expect(flatSql(tr) !== flatSql(s), `${tag} trap ${i + 1} is not the solution`);
  });

  // Template: same kind of query, runs, returns rows, is not the solution and does not give its result away.
  const tc = G.checkQuery(q.template);
  expect(tc.ok && !G.oracleCheck(q.template, BANK.schema), `${tag} template passes checkQuery and Oracle's rules`);
  const tr = execute(db, q.template);
  expect(!tr.error && tr.rows.length >= 1, `${tag} template runs and returns rows (${tr.error ? tr.error.text : tr.rows.length})`);
  expect(flatSql(q.template) !== flatSql(s) && (tr.error || !G.grade(tr, r, false).ok), `${tag} template is not the solution and returns something else`);
  expect(!q.level || (q.level <= 10 ? !/\bJOIN\b/i.test(q.template) || q.level > 10 : true), `${tag} template stays in its band`);
});

// Other correct ways a student may write the answer: each must grade ok (the prompt pins one result, not one query).
const ALTS = {
  r03b: ['SELECT title, price FROM games WHERE price >= 19.99 AND price <= 29.99'],
  r04b: ['SELECT country FROM customers WHERE vip_level > 1 GROUP BY country'],
  r05b: ['SELECT name, signup_date FROM customers WHERE vip_level > 0 ORDER BY signup_date DESC FETCH FIRST 3 ROWS ONLY'],
  r05c: ["SELECT title, genre, price FROM games WHERE genre = 'Action' OR genre = 'Adventure' ORDER BY price ASC FETCH FIRST 3 ROWS ONLY"],
  r07a: ['SELECT COUNT(*) FROM games WHERE rating IS NOT NULL'],
  r07b: ["SELECT SUM(quantity), SUM(total_paid) FROM sales WHERE sale_date BETWEEN DATE '2025-01-01' AND DATE '2025-12-31'"],
  r10a: ['SELECT game_id, SUM(quantity) AS units FROM sales GROUP BY game_id ORDER BY units DESC FETCH FIRST 3 ROWS ONLY'],
  r10b: ['SELECT EXTRACT(YEAR FROM sale_date) AS y, COUNT(sale_id), ROUND(SUM(total_paid), 2) FROM sales GROUP BY EXTRACT(YEAR FROM sale_date) ORDER BY 1'],
  r11c: ['SELECT title FROM games WHERE game_id IN (SELECT game_id FROM sales WHERE customer_id = 7)'],
  r12a: ['SELECT name, country FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM sales)',
    'SELECT c.name, c.country FROM customers c WHERE NOT EXISTS (SELECT 1 FROM sales s WHERE s.customer_id = c.customer_id)'],
  r12b: ['SELECT g.title, g.stock FROM games g LEFT JOIN sales s ON s.game_id = g.game_id WHERE s.sale_id IS NULL'],
  r12c: ["SELECT name, country FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM sales WHERE sale_date BETWEEN DATE '2024-01-01' AND DATE '2024-12-31')"],
  r13b: ["SELECT DISTINCT g.title FROM games g JOIN sales s ON s.game_id = g.game_id JOIN customers c ON c.customer_id = s.customer_id WHERE c.country = 'France'"],
  r13c: ['SELECT sale_id, total_paid FROM sales WHERE EXTRACT(YEAR FROM sale_date) = 2025 AND total_paid > ALL (SELECT total_paid FROM sales WHERE EXTRACT(YEAR FROM sale_date) = 2024)'],
  r14a: ["SELECT c.name, COUNT(s.sale_id) FROM customers c LEFT JOIN sales s ON c.customer_id = s.customer_id WHERE c.country = 'Spain' GROUP BY c.customer_id, c.name"],
  r14c: ['SELECT g.genre, g.title, g.price FROM games g JOIN (SELECT genre, MAX(price) AS top FROM games GROUP BY genre) m ON m.genre = g.genre AND m.top = g.price ORDER BY g.genre'],
  r15a: ['WITH t AS (SELECT customer_id, SUM(total_paid) AS total FROM sales GROUP BY customer_id) SELECT c.name, ROUND(t.total, 2) FROM t JOIN customers c ON c.customer_id = t.customer_id WHERE t.total > (SELECT AVG(total) FROM t)'],
  // (HAVING SUM(…) >= ALL (…) is valid Oracle too, but OracleDialect's ALL rewrite cannot run it on SQLite.)
  r15b: ['SELECT DISTINCT g.title FROM games g JOIN sales s ON s.game_id = g.game_id WHERE s.customer_id IN (SELECT customer_id FROM (SELECT customer_id, SUM(total_paid) AS spent FROM sales GROUP BY customer_id ORDER BY spent DESC) FETCH FIRST 1 ROWS ONLY)'],
  r15c: ["SELECT c.country, SUM(s.total_paid) FROM sales s JOIN customers c ON c.customer_id = s.customer_id GROUP BY c.country HAVING SUM(s.total_paid) > (SELECT SUM(total_paid) FROM sales WHERE customer_id IN (SELECT customer_id FROM customers WHERE country = 'Spain'))"],
};
Object.entries(ALTS).forEach(([id, list]) => list.forEach((alt, i) => {
  const q = Q.find((x) => x.id === id);
  const r = execute(db, alt);
  const okQ = G.checkQuery(alt).ok && !G.oracleCheck(alt, BANK.schema);
  const gr = r.error ? null : G.grade(r, RESULTS[id], q.ordered);
  expect(okQ && gr && gr.ok, `[${id}] another correct query also passes (${i + 1})${gr && !gr.ok ? `: ${gr.reason}` : r.error ? `: ${r.error.text}` : okQ ? '' : ': refused'}`);
}));

/* ---- Grading as Oracle would ---------------------------------------------------------------- */
// The page's path: checkQuery first (a refusal costs nothing), then run, then oracleCheck turns what Oracle would
// reject into an error, then grade. A valid Oracle answer must pass; a query Oracle rejects or answers otherwise
// must not; what the sandbox cannot simulate must be refused.
section('Grading as Oracle would');
const page = (sql) => {
  const chk = G.checkQuery(sql);
  if (!chk.ok) return { refused: chk.reason, detail: chk.detail };
  const r = execute(db, sql);
  if (r.error) return r;
  const ora = G.oracleCheck(sql, BANK.schema);
  return ora ? { error: ora } : r;
};
const verdict = (id, sql) => {
  const q = Q.find((x) => x.id === id);
  const r = page(sql);
  if (r.refused) return `refused:${r.refused}`;
  if (r.error) return `error:${r.error.code || r.error.text}`;
  const g = G.grade(r, RESULTS[id], q.ordered);
  return g.ok ? 'pass' : `wrong:${g.reason}`;
};
const ORACLE_RIGHT = [
  ['r03a', "SELECT title, price FROM games WHERE UPPER(title) LIKE 'SKY%'", 'UPPER(…) LIKE'],
  ['r04b', 'SELECT UNIQUE country FROM customers WHERE vip_level >= 2', 'SELECT UNIQUE'],
  ['r07b', "SELECT SUM(quantity), ROUND(SUM(total_paid), 2) FROM sales WHERE TO_CHAR(sale_date, 'YYYY') = 2025", 'TO_CHAR(…) = number'],
  ['r07b', "SELECT SUM(quantity), ROUND(SUM(total_paid), 2) FROM sales WHERE TO_CHAR(sale_date, 'YYYY') = '2025'", 'TO_CHAR(…) = text'],
  ['r07b', "SELECT SUM(quantity), ROUND(SUM(total_paid), 2) FROM sales WHERE sale_date >= TO_DATE('01-JAN-2025', 'DD-MON-YYYY')", "TO_DATE 'DD-MON-YYYY'"],
  ['r07b', "SELECT SUM(quantity), ROUND(SUM(total_paid), 2) FROM sales WHERE sale_date >= TO_DATE('01-jan-25', 'DD-MON-YY')", "TO_DATE 'DD-MON-YY', lower case"],
  ['r07b', "SELECT SUM(quantity), ROUND(SUM(total_paid), 2) FROM sales WHERE sale_date BETWEEN TO_DATE('2025-01-01', 'YYYY-MM-DD') AND TO_DATE('31/12/2025', 'DD/MM/YYYY')", 'TO_DATE ISO and DD/MM/YYYY'],
  ['r07b', "SELECT SUM(quantity), ROUND(SUM(total_paid), 2) FROM sales WHERE TRUNC(sale_date, 'YYYY') = DATE '2025-01-01'", 'TRUNC to the year'],
  ['r10b', "SELECT TO_CHAR(sale_date, 'YYYY'), COUNT(*), ROUND(SUM(total_paid), 2) FROM sales GROUP BY TO_CHAR(sale_date, 'YYYY') ORDER BY 1", 'TO_CHAR year column'],
  ['r10b', 'SELECT EXTRACT(YEAR FROM sale_date) AS yr, COUNT(*), ROUND(SUM(total_paid), 2) FROM sales GROUP BY yr ORDER BY yr', 'GROUP BY alias (23ai)'],
  ['r09a', 'SELECT genre, COUNT(*) AS n FROM games GROUP BY genre HAVING n > 3', 'HAVING alias (23ai)'],
  ['r09c', 'SELECT genre, ROUND(AVG(price), 2) AS "Average" FROM games GROUP BY genre HAVING AVG(price) > 30 ORDER BY "Average"', 'quoted alias, defined and used'],
  ['r01a', 'SELECT "TITLE", price FROM games WHERE genre = \'Puzzle\'', 'quoted upper-case column name'],
  ['r12c', "SELECT c.name, c.country FROM customers c WHERE NOT EXISTS (SELECT 1 FROM sales s WHERE s.customer_id = c.customer_id AND TO_CHAR(s.sale_date, 'YYYY') = 2024)", 'TO_CHAR = number in a subquery'],
  ['r15a', 'SELECT c.name, ROUND(SUM(s.total_paid), 2) FROM customers c JOIN sales s ON s.customer_id = c.customer_id GROUP BY c.name HAVING SUM(s.total_paid) > (SELECT AVG(SUM(total_paid)) FROM sales GROUP BY customer_id)', 'AVG(SUM()) nested aggregate'],
  ['r15a', 'WITH t AS (SELECT customer_id, SUM(total_paid) AS total FROM sales GROUP BY customer_id) SELECT c.name, ROUND(t.total, 2) AS total FROM t JOIN customers c ON c.customer_id = t.customer_id WHERE t.total > (SELECT AVG(total) FROM t)', 'CTE column named like an alias'],
  ['r15b', 'SELECT g.title FROM games g JOIN sales s ON s.game_id = g.game_id WHERE s.customer_id = (SELECT customer_id FROM sales GROUP BY customer_id HAVING SUM(total_paid) = (SELECT MAX(SUM(total_paid)) FROM sales GROUP BY customer_id))', 'MAX(SUM()) nested aggregate'],
  ['r14a', 'SELECT c.name, COUNT(s.sale_id) FROM customers c LEFT OUTER JOIN sales s ON s.customer_id = c.customer_id WHERE c.country = \'Spain\' GROUP BY c.name', 'LEFT OUTER JOIN'],
  ['r11a', 'SELECT sale_date, title, quantity FROM sales JOIN games USING (game_id) WHERE quantity >= 2', 'JOIN USING'],
  ['r14c', 'SELECT g.genre, g.title, g.price FROM games g WHERE g.price = (SELECT MAX(g2.price) FROM games g2 WHERE g2.genre = g.genre) ORDER BY g.genre ASC', 'ORDER BY … ASC'],
];
const ORACLE_WRONG = [
  ['r03a', "SELECT title, price FROM games WHERE title LIKE 'sky%'", 'lower-case LIKE finds nothing in Oracle'],
  ['r03a', "SELECT title, price FROM games WHERE title LIKE 'SKY%'", 'upper-case LIKE finds nothing in Oracle'],
  ['r01a', 'SELECT title, price FROM games WHERE genre = "Puzzle"', 'a double-quoted string is a name: ORA-00904'],
  ['r01a', 'SELECT "title", price FROM games WHERE genre = \'Puzzle\'', 'a quoted lower-case name: ORA-00904'],
  ['r01c', 'SELECT title, stock AS s FROM games WHERE s < 5', 'an alias in WHERE: ORA-00904'],
  ['r10b', 'SELECT EXTRACT(YEAR FROM sale_date), COUNT(*), ROUND(SUM(total_paid), 2) FROM sales GROUP BY 1 ORDER BY 1', 'GROUP BY 1 groups by a constant on Oracle: ORA-00979'],
  ['r14a', "SELECT c.name, COUNT(s.sale_id) FROM customers AS c LEFT JOIN sales s ON s.customer_id = c.customer_id WHERE c.country = 'Spain' GROUP BY c.name", 'AS before a table alias: ORA-00933'],
  ['r11b', "SELECT c.name, s.sale_date FROM customers c, sales AS s WHERE s.customer_id = c.customer_id AND c.country = 'Portugal'", 'AS in a comma join: ORA-00933'],
  ['r14c', 'SELECT g.genre, g.title, g.price FROM games g WHERE g.price = (SELECT MAX(g2.price) FROM games g2 WHERE g2.genre = g.genre) ORDER BY UPPER(g.genre)', 'case-insensitive order is another order'],
  ['r14c', 'SELECT genre, title, MAX(price) FROM games GROUP BY genre ORDER BY genre', 'title not grouped: ORA-00979'],
  ['r06a', "SELECT COUNT(*) FROM sales s JOIN games g ON g.game_id = s.game_id WHERE g.genre = 'RPG'", 'counts sales, not games'],
  ['r15b', 'SELECT customer_id, MAX(SUM(total_paid)) FROM sales GROUP BY customer_id', 'a nested aggregate next to a column: ORA-00937'],
  ['r07b', "SELECT SUM(quantity), ROUND(SUM(total_paid), 2) FROM sales WHERE sale_date >= TO_DATE('2025-13-01', 'YYYY-MM-DD')", 'a TO_DATE literal that is no date: ORA-01861'],
];
const SANDBOX_REFUSES = [
  ['r07b', "SELECT SUM(quantity), ROUND(SUM(total_paid), 2) FROM sales WHERE sale_date LIKE '2025%'", 'LIKE on a DATE column'],
  ['r10a', 'SELECT game_id, SUM(quantity) FROM sales GROUP BY game_id ORDER BY SUM(quantity) DESC FETCH FIRST 3 ROWS WITH TIES', 'FETCH … WITH TIES'],
  ['r05a', 'SELECT title, price FROM games WHERE stock > 0 ORDER BY price DESC FETCH FIRST 10 PERCENT ROWS ONLY', 'FETCH … PERCENT'],
  ['r06a', 'WITH t (n) AS (SELECT 1 FROM dual UNION ALL SELECT n + 1 FROM t) SELECT COUNT(*) FROM t', 'recursive WITH'],
  ['r07b', "SELECT SUM(quantity), ROUND(SUM(total_paid), 2) FROM sales WHERE sale_date >= TO_DATE(sale_date, 'MM/DD/YYYY')", 'TO_DATE format it cannot read on a column'],
  ['r05a', 'SELECT * FROM (SELECT title, price FROM games WHERE stock > 0 ORDER BY price DESC) WHERE ROWNUM <= 3', 'ROWNUM'],
  ['r01a', "SELECT title, price FROM games WHERE genre == 'Puzzle'", '== (lint)'],
];
ORACLE_RIGHT.forEach(([id, sql, what]) => { const v = verdict(id, sql); expect(v === 'pass', `[${id}] valid Oracle passes: ${what} (${v})`); });
ORACLE_WRONG.forEach(([id, sql, what]) => { const v = verdict(id, sql); expect(v.startsWith('wrong') || v.startsWith('error'), `[${id}] graded wrong, as on Oracle: ${what} (${v})`); });
SANDBOX_REFUSES.forEach(([id, sql, what]) => { const v = verdict(id, sql); expect(v.startsWith('refused:unsupported') || v.startsWith('refused:lint'), `[${id}] refused without cost: ${what} (${v})`); });

// unsafe(): the exact contract the page relies on before Run.
const RECURSIVE = 'WITH t (n) AS (SELECT 1 FROM dual UNION ALL SELECT n + 1 FROM t) SELECT COUNT(*) FROM t';
const us = G.unsafe(RECURSIVE);
expect(us && us.reason === 'recursive' && typeof us.text === 'string' && us.text.length > 20 && Object.keys(us).sort().join() === 'reason,text', 'unsafe(recursive WITH) → { reason: "recursive", text }');
[
  'WITH RECURSIVE t (n) AS (SELECT 1 FROM dual UNION ALL SELECT n + 1 FROM t WHERE n < 5) SELECT n FROM t',
  'WITH a AS (SELECT 1 AS x FROM dual), b (n) AS (SELECT x FROM a UNION ALL SELECT n FROM b JOIN a ON 1 = 1) SELECT * FROM b',
  'SELECT * FROM (WITH t (n) AS (SELECT 1 FROM dual UNION ALL SELECT n + 1 FROM t) SELECT n FROM t)',
].forEach((sql) => expect(G.unsafe(sql) && G.unsafe(sql).reason === 'recursive', `unsafe: ${sql.slice(0, 60)}… → recursive`));
[
  'WITH t AS (SELECT customer_id, SUM(total_paid) AS total FROM sales GROUP BY customer_id) SELECT * FROM t',
  'WITH a AS (SELECT * FROM games), b AS (SELECT * FROM a) SELECT * FROM b',
  'SELECT * FROM customers, games, sales',
  "SELECT 'WITH t AS (SELECT 1 FROM t)' FROM dual",
  BANK.questions.find((q) => q.id === 'r15a').solution,
].forEach((sql) => expect(G.unsafe(sql) === null, `unsafe: ${sql.slice(0, 60)}… → null`));
expect(G.checkQuery(RECURSIVE).reason === 'unsupported' && G.checkQuery(RECURSIVE).detail === us.text, 'checkQuery refuses a recursive WITH as unsupported, with unsafe().text');
Q.forEach((q) => expect(G.unsafe(q.solution) === null && G.unsafe(q.template) === null, `[${q.id}] solution and template are safe`));

// grade(): a text that reads as a number equals that number.
expect(G.grade({ cols: ['y'], rows: [['2025'], ['2024']] }, { cols: ['y'], rows: [[2024], [2025]] }, false).ok
  && !G.grade({ cols: ['y'], rows: [['2025x']] }, { cols: ['y'], rows: [[2025]] }, false).ok
  && !G.grade({ cols: ['d'], rows: [['2025-01-01']] }, { cols: ['d'], rows: [[2025]] }, false).ok, 'grade: \'2025\' equals 2025; \'2025x\' and dates do not');
// useLifeline on a saved state of an older shape: missing keys mean unused.
const oldShape = { ...G.newRun(BANK, 3), used: {}, shown: undefined };
const ol = G.useLifeline(oldShape, 'clause');
expect(ol.used.clause === true && ol.used.template === false && ol.shown.clause === oldShape.ids[0], 'useLifeline: an older state without used/shown keys still works');
// diagnose: a double-quoted string is reported as a name, flagged quoted, with no suggestion.
const dq = G.diagnose({ sql: 'SELECT title FROM games WHERE genre = "Puzzle"', schema: BANK.schema });
expect(dq[0] && dq[0].code === 'unknown-name' && dq[0].quoted === true && dq[0].name === 'Puzzle' && dq[0].suggest === null, `diagnose: "Puzzle" → unknown-name, quoted (${JSON.stringify(dq)})`);

// Variety: within a rung, three different solutions.
for (let n = 1; n <= 15; n++) {
  const rung = Q.filter((q) => q.level === n).map((q) => flatSql(q.solution));
  expect(new Set(rung).size === 3, `rung ${n}: three different solutions`);
}

/* ---- 3. Mode questions (insert, update, delete, ddl) ----------------------------------------- */
// Ids <prefix><rung><a|b>, 2 per rung, 30 per mode. Each solution passes checkAnswer of its mode, runs without error
// and changes the state (some probe differs from the untouched database); its probes give the same results on the
// reversed-insert database; every trap is refused, fails or grades wrong; the template passes checkAnswer, runs,
// is not the solution and does not produce the solution's state. Insert questions only use new ids (customers and
// games from 101, sales from 1001). DDL questions bring their own probes.
const FULL = !!process.env.FULL;
const MODE_KEYS = ['insert', 'update', 'delete', 'ddl'];
const PREFIX = Object.fromEntries(G.MODES.map((m) => [m.key, m.prefix]));
const NEW_ID = { customers: 101, games: 101, sales: 1001 };
const REV = reversedSetup(BANK.setup);
const BASE = {};   // probes run on the untouched database, per probe list
const baseOf = (probes) => { const k = JSON.stringify(probes); if (!BASE[k]) BASE[k] = executeChecks(BANK.setup, '', probes); return BASE[k]; };
const allIds = BANK.questions.map((q) => q.id);
expect(new Set(allIds).size === allIds.length, `question ids are unique across the five banks (${allIds.length})`);
MODE_KEYS.forEach((mode) => {
  section(`Mode ${mode}`);
  const qs = BANK.questions.filter((q) => G.modeOf(q) === mode);
  const re = new RegExp(`^${PREFIX[mode]}(\\d{2})([ab])$`);
  const complete = qs.length === 30;
  console.log(`${mode}: ${qs.length} of 30 questions${complete ? '' : FULL ? '' : ' (partial bank: FULL=1 makes this fail)'}`);
  if (FULL || complete) expect(complete, `[${mode}] 30 questions`);
  qs.forEach((q) => expect(re.test(q.id) && +re.exec(q.id)[1] === q.level && q.level >= 1 && q.level <= 15, `[${q.id}] id ${PREFIX[mode]}NN(a|b) matches level ${q.level}`));
  for (let n = 1; n <= 15; n++) {
    const k = qs.filter((q) => q.level === n).length;
    expect(complete ? k === 2 : k <= 2, `[${mode}] rung ${n}: ${complete ? 'exactly' : 'at most'} 2 questions (${k})`);
  }
  const everyRung = Array.from({ length: 15 }, (_, i) => i + 1).every((l) => qs.some((q) => q.level === l));
  expect(G.ready(BANK, mode) === everyRung, `[${mode}] ready() is ${everyRung}: ${everyRung ? 'every rung has a question' : 'some rung has none yet'}`);

  qs.forEach((q) => {
    const tag = `[${q.id}]`;
    expect(q.mode === mode && typeof q.solution === 'string' && typeof q.template === 'string' && Array.isArray(q.clause) && q.clause.length >= 1
      && Array.isArray(q.traps) && q.traps.length >= 1 && q.traps.length <= 3 && (q.checks === null || q.checks === undefined || Array.isArray(q.checks)),
    `${tag} has mode, solution, checks (null or a list), clause, template and 1–3 traps`);
    if (mode === 'ddl') expect(Array.isArray(q.checks) && q.checks.length >= 1, `${tag} DDL brings its own probes`);
    const probes = G.defaultChecks(q);
    const ca = G.checkAnswer(q.solution, mode);
    expect(ca.ok, `${tag} solution passes checkAnswer('${mode}')${ca.ok ? '' : ` (${ca.reason} ${JSON.stringify(ca.detail || '')})`}`);
    expect(!/;\s*$/.test(q.solution), `${tag} solution has no final ;`);
    expect(!G.oracleCheck(q.solution, BANK.schema), `${tag} solution: nothing Oracle refuses`);
    probes.forEach((p, i) => expect(G.unsafe(p) === null && O.script(p).every((u) => !u.unsupported) && /^\s*(SELECT|WITH|INSERT|UPDATE|DELETE)\b/i.test(p), `${tag} probe ${i + 1} is a query or DML the sandbox runs`));
    q.clause.forEach((c) => expect(new RegExp(`\\b${c.trim().split(/\s+/).join('\\s+')}\\b`, 'i').test(q.solution), `${tag} clause ${c} appears in the solution`));

    const want = executeChecks(BANK.setup, q.solution, probes);
    if (VERBOSE) console.log(`     ${q.id}: changes ${want.changes}; ${want.error ? `ERROR ${want.error.code || want.error.text}` : want.results.map((r) => (r.error ? r.error.code : `${r.rows.length} rows`)).join(', ')}`);
    expect(!want.error, `${tag} solution runs${want.error ? ` (${want.error.code || ''} ${want.error.text})` : ''}`);
    if (want.error) return;
    if (mode !== 'ddl') expect(want.changes >= 1, `${tag} solution modifies rows (${want.changes})`);
    expect(!G.gradeChecks(want, baseOf(probes)).ok, `${tag} solution changes what the probes see`);
    const rev = executeChecks(REV, q.solution, probes);
    const gr = G.gradeChecks(rev, want);
    expect(gr.ok, `${tag} same probe results on the reversed-insert database${gr.ok ? '' : ` (probe ${gr.probe + 1}: ${JSON.stringify(gr.detail).slice(0, 120)})`}`);
    if (mode === 'insert') {
      probes.forEach((p, i) => {
        const tb = /\bFROM\s+(\w+)\s+ORDER\s+BY\s+\w+$/i.exec(p);
        const before = baseOf(probes).results[i];
        const after = want.results[i];
        if (!tb || !NEW_ID[tb[1]] || !after || after.error) return;
        const old = new Set(before.rows.map((r) => r[0]));
        const added = after.rows.map((r) => r[0]).filter((id) => !old.has(id));
        expect(added.every((id) => id >= NEW_ID[tb[1]]), `${tag} new ${tb[1]} ids start at ${NEW_ID[tb[1]]} (${added.join(', ') || 'none added'})`);
      });
    }
    q.traps.forEach((tr, i) => {
      const c = G.checkAnswer(tr, mode);
      const got = c.ok ? executeChecks(BANK.setup, tr, probes) : null;
      const g = got ? G.gradeChecks(got, want) : null;
      expect(!c.ok || !g.ok, `${tag} trap ${i + 1} does not pass: ${!c.ok ? `refused (${c.reason})` : g.ok ? 'it gives the same state as the solution' : g.reason === 'error' ? `error ${g.detail.gotError && (g.detail.gotError.code || g.detail.gotError.text)}` : `probe ${g.probe + 1} differs`}`);
      expect(c.ok, `${tag} trap ${i + 1} is a plausible ${mode} answer (passes checkAnswer)`);
    });
    const tc = G.checkAnswer(q.template, mode);
    const tres = executeChecks(BANK.setup, q.template, mode === 'ddl' ? [] : probes);
    expect(tc.ok && !tres.error && (mode === 'ddl' || tres.changes >= 1), `${tag} template passes checkAnswer and runs${tres.error ? ` (${tres.error.code || tres.error.text})` : ''}`);
    expect(q.template.replace(/\s+/g, ' ').trim() !== q.solution.replace(/\s+/g, ' ').trim() && !G.gradeChecks(executeChecks(BANK.setup, q.template, probes), want).ok, `${tag} template is not the solution and gives another result`);
  });
});

// Other correct ways to write a mode answer: each must give the solution's state.
section('Mode answers written another way');
const MODE_ALTS = [
  ['ins04a', "INSERT INTO sales VALUES (1002, 5, 23, DATE '2025-12-01', 2, 2 * 44.99)", 'arithmetic in VALUES'],
  ['ins02b', "INSERT INTO customers VALUES (102, 'Malik Haddad', 'France', DATE '2025-10-15', 1)", 'no column list'],
  ['ins03a', "INSERT INTO sales VALUES (1001, 13, 8, TO_DATE('20-DEC-2025', 'DD-MON-YYYY'), 1, 14.99)", 'TO_DATE DD-MON-YYYY'],
  ['ins07a', "INSERT INTO customers (customer_id, name, country, signup_date, vip_level) VALUES (105, 'Camila Rojas', 'Chile', DATE '2025-12-10', 0), (106, 'Matías Soto', 'Chile', DATE '2025-12-10', 0), (107, 'Javiera Pino', 'Chile', DATE '2025-12-10', 0)", 'one INSERT, three VALUES rows (23ai)'],
  ['ins07a', "INSERT ALL INTO customers VALUES (105, 'Camila Rojas', 'Chile', DATE '2025-12-10', 0) INTO customers VALUES (106, 'Matías Soto', 'Chile', DATE '2025-12-10', 0) INTO customers VALUES (107, 'Javiera Pino', 'Chile', DATE '2025-12-10', 0) SELECT * FROM dual", 'INSERT ALL'],
  ['ins08b', "INSERT INTO games VALUES (107, 'Glass Labyrinth Deluxe', 'Puzzle', 12.99 * 1.25, 20, NULL)", 'no ROUND: NUMBER(6,2) rounds on storage'],
  ['ins12a', "INSERT INTO sales SELECT 1100 + g.game_id, 7, g.game_id, DATE '2026-01-05', 1, g.price FROM games g WHERE g.game_id IN (SELECT game_id FROM sales WHERE customer_id = 7)", 'IN instead of JOIN + DISTINCT'],
  ['ins13b', "INSERT INTO games SELECT 112, 'Genre Sampler', 'Strategy', AVG(price), 0, NULL FROM games", 'no ROUND: NUMBER(6,2) rounds on storage'],
  ['ins14a', "INSERT INTO sales SELECT 3000 + customer_id, customer_id, 10, DATE '2026-02-01', 1, 0 FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM sales)", 'NOT IN'],
  ['upd01b', "UPDATE customers SET country = 'Portugal' WHERE name = 'Pablo Serrano'", 'by name'],
  ['upd03b', "UPDATE sales SET sale_date = TO_DATE('29-JUN-2024', 'DD-MON-YYYY') WHERE sale_id = 12", 'TO_DATE'],
  ['upd07a', "UPDATE games SET price = price * 1.1 WHERE genre = 'Racing'", 'no ROUND: NUMBER(6,2) rounds on storage'],
  ['upd09a', 'UPDATE customers SET vip_level = LEAST(vip_level + 1, 3) WHERE signup_date < DATE \'2024-01-01\'', 'LEAST and a date range'],
  ['upd12a', "UPDATE games SET stock = (SELECT NVL(SUM(quantity), 0) FROM sales s WHERE s.game_id = games.game_id) WHERE genre = 'RPG'", 'no table alias'],
  ['upd12a', "UPDATE games g SET g.stock = NVL((SELECT SUM(s.quantity) FROM sales s WHERE s.game_id = g.game_id), 0) WHERE g.genre = 'RPG'", 'NVL outside, qualified SET column'],
  ['upd06a', "UPDATE games SET price = price + 1 WHERE genre = 'Puzzle';\nCOMMIT", 'with COMMIT'],
  ['ins04b', "INSERT INTO games VALUES (104, q'[Captain's Tide]', 'Adventure', 27.5, 12, 8)", "q'[…]' quoting"],
  ['ins03a', "INSERT INTO sales VALUES (1001, 13, 8, TIMESTAMP '2025-12-20 00:00:00', 1, 14.99)", 'TIMESTAMP literal at midnight'],
  ['ins03a', "INSERT INTO sales VALUES (1001, 13, 8, TO_DATE('2025-12-20', 'YYYY-MM-DD'), 1, 14.99)", 'TO_DATE ISO'],
  ['ddl07a', 'ALTER TABLE games ADD pegi NUMBER(2) DEFAULT ON NULL 12', 'DEFAULT ON NULL'],
  ['ddl01a', 'CREATE TABLE genres (genre_id INTEGER PRIMARY KEY, name VARCHAR2(20) NOT NULL)', 'INTEGER (valid Oracle: lint advice does not refuse)'],
  ['ddl01a', 'CREATE TABLE "GENRES" ("GENRE_ID" NUMBER(2) PRIMARY KEY, "NAME" VARCHAR2(20) NOT NULL)', 'quoted names in upper case'],
];
MODE_ALTS.forEach(([id, sql, what]) => {
  const q = BANK.questions.find((x) => x.id === id);
  const probes = G.defaultChecks(q);
  const c = G.checkAnswer(sql, q.mode);
  const g = c.ok ? G.gradeChecks(executeChecks(BANK.setup, sql, probes), executeChecks(BANK.setup, q.solution, probes)) : null;
  expect(c.ok && g.ok, `[${id}] another correct answer passes: ${what}${!c.ok ? ` (refused: ${c.reason} ${JSON.stringify(c.detail || '')})` : g.ok ? '' : ` (${g.reason} ${JSON.stringify(g.detail).slice(0, 100)})`}`);
});

// Mode answers Oracle refuses or answers otherwise: graded wrong (an ORA error from oracleCheck, as the page's judge
// does, or another state). And what the sandbox cannot reproduce: refused without cost (unsupported).
section('Mode answers as Oracle would grade them');
const MODE_WRONG = [
  ['ins15b', "INSERT INTO sales SELECT 5000 + g.game_id, 1, g.game_id, DATE '2026-03-15', 1, g.price FROM games g LEFT JOIN sales s ON s.game_id = g.game_id WHERE g.genre = 'Adventure' GROUP BY g.game_id HAVING NVL(SUM(s.quantity), 0) < 3", 'INSERT … SELECT, price not grouped (ORA-00979)', 'ORA-00979'],
  ['ddl13b', 'CREATE VIEW customer_purchases AS SELECT c.customer_id, c.name, COUNT(s.sale_id) AS purchases FROM customers c LEFT JOIN sales s ON s.customer_id = c.customer_id GROUP BY c.customer_id', 'CREATE VIEW, name not grouped (ORA-00979)', 'ORA-00979'],
  ['ins01b', 'INSERT INTO games VALUES (101, "Lumen Drift", "Racing", 24.99, 30, 7.5)', 'double-quoted strings (ORA-00904)', 'ORA-00904'],
  ['ins01b', "INSERT OR REPLACE INTO games VALUES (101, 'Lumen Drift', 'Racing', 24.99, 30, 7.5)", 'INSERT OR REPLACE (ORA-00925)', 'ORA-00925'],
  ['upd06a', 'UPDATE games SET price = price + 1 WHERE genre = "Puzzle"', 'double-quoted value in WHERE (ORA-00904)', 'ORA-00904'],
  ['upd06a', "UPDATE games AS g SET price = price + 1 WHERE g.genre = 'Puzzle'", 'UPDATE t AS a (ORA-00971)', 'ORA-00971'],
  ['upd06a', "UPDATE OR REPLACE games SET price = price + 1 WHERE genre = 'Puzzle'", 'UPDATE OR REPLACE (ORA-00903)', 'ORA-00903'],
  ['ddl01b', 'ALTER TABLE games ADD COLUMN release_year NUMBER(4)', 'ADD COLUMN (ORA-00904)', 'ORA-00904'],
  ['del01a', 'WITH x AS (SELECT 53 AS id FROM dual) DELETE FROM sales WHERE sale_id IN (SELECT id FROM x)', 'WITH … DELETE (ORA-00928)', 'ORA-00928'],
  ['del01a', 'DELETE FROM sales AS s WHERE s.sale_id = 53', 'DELETE FROM t AS a (ORA-00933)', 'ORA-00933'],
  ['upd06a', "UPDATE games SET price = price + 1 WHERE genre = 'Action';\nUPDATE games AS g SET price = price + 1 WHERE g.genre = 'Puzzle'", 'the second statement of a script is checked too', 'ORA-00971'],
  ['ddl12a', 'CREATE TABLE sales_detail AS SELECT s.sale_id, c.name, g.title, s.total_paid FROM sales s JOIN customers c ON c.customer_id = s.customer_id JOIN games g ON g.game_id = s.game_id', 'a table, not a view', null],
  ['ddl13a', 'CREATE TABLE genre_sales AS SELECT g.genre, COUNT(*) AS sales_count, SUM(s.total_paid) AS revenue FROM games g JOIN sales s ON s.game_id = g.game_id GROUP BY g.genre', 'a table, not a view', null],
];
MODE_WRONG.forEach(([id, sql, what, code]) => {
  const q = BANK.questions.find((x) => x.id === id);
  const probes = G.defaultChecks(q);
  const c = G.checkAnswer(sql, q.mode);
  const got = executeChecks(BANK.setup, sql, probes);
  const g = G.gradeChecks(got, executeChecks(BANK.setup, q.solution, probes));
  expect(c.ok && !g.ok && (!code || (got.error && got.error.code === code)), `[${id}] graded wrong: ${what}${c.ok ? '' : ` (refused: ${c.reason})`}${g.ok ? ' (graded right!)' : ''}${code && !(got.error && got.error.code === code) ? ` (error ${JSON.stringify(got.error)})` : ''}`);
});
const MODE_REFUSED = [
  ['ins03a', "INSERT INTO sales VALUES (1001, 13, 8, '2025-12-20', 1, 14.99)", 'a date as ISO text'],
  ['ins03a', "INSERT INTO sales VALUES (1001, 13, 8, '20-DEC-2025', 1, 14.99)", 'a date as NLS text'],
  ['upd03b', "UPDATE sales SET sale_date = '2024-06-29' WHERE sale_id = 12", 'a date as text in SET'],
  ['upd12b', 'UPDATE (SELECT s.total_paid, s.quantity, g.price FROM sales s JOIN games g ON g.game_id = s.game_id WHERE s.customer_id = 7) SET total_paid = quantity * price', 'UPDATE of an inline view'],
  ['del01a', 'DELETE FROM (SELECT * FROM sales WHERE sale_id = 53)', 'DELETE from an inline view'],
  ['ins11a', "INSERT INTO sales SELECT 5000 + LEVEL, 1, 1, DATE '2025-01-01', 1, 0 FROM dual CONNECT BY LEVEL <= 100000000", 'CONNECT BY LEVEL in the millions'],
  ['ddl01a', 'CREATE TABLE "genres" (genre_id NUMBER(2) PRIMARY KEY, name VARCHAR2(20) NOT NULL)', 'a quoted lower-case table name'],
  ['ddl01a', 'CREATE TABLE genres ("genre_id" NUMBER(2) PRIMARY KEY, "name" VARCHAR2(20) NOT NULL)', 'quoted lower-case column names'],
];
MODE_REFUSED.forEach(([id, sql, what]) => {
  const q = BANK.questions.find((x) => x.id === id);
  const c = G.checkAnswer(sql, q.mode);
  expect(!c.ok && c.reason === 'unsupported' && typeof c.detail === 'string', `[${id}] refused without cost: ${what} (${c.ok ? 'accepted' : `${c.reason}: ${String(c.detail).slice(0, 60)}`})`);
});
expect(G.checkAnswer("INSERT INTO sales SELECT 5000 + LEVEL, 1, 1, DATE '2025-01-01', 1, 0 FROM dual CONNECT BY LEVEL <= 3", 'insert').ok, 'a small CONNECT BY LEVEL generator is still fine');
expect(G.checkAnswer("INSERT INTO customers VALUES (101, '2025-12-20', 'Spain', DATE '2025-12-20', 0)", 'insert').reason === 'unsupported', 'a date-looking text anywhere in DML is refused (it would be a DATE in this game)');
const mg = G.migrateV1({ ...G.newRun(BANK, 2), level: 3 }, { prize: 20000, date: '2026-01-01' });
expect(mg.reached.select === 8, `migrateV1: reached is the larger of the last run (2) and the best prize's rung (8) (${mg.reached.select})`);
expect(G.migrateV1(null, { prize: 2500 }).reached.select === 5 && G.migrateV1(null, null).reached.select === undefined, 'migrateV1: a best score alone sets reached; nothing sets nothing');

/* ---- 4. GameCore ----------------------------------------------------------------------------- */
section('GameCore');
const L = G.LADDER;
expect(L.length === 15 && L[0] === 100 && L[14] === 1000000 && L.every((x, i) => !i || x > L[i - 1]), 'LADDER: 15 rising prizes, 100 to 1,000,000');
expect(JSON.stringify(G.SAFE) === '[5,10]', 'SAFE is [5, 10]');
expect(JSON.stringify(G.BANDS) === JSON.stringify([{ key: 'easy', from: 1, to: 5 }, { key: 'medium', from: 6, to: 10 }, { key: 'hard', from: 11, to: 15 }]), 'BANDS easy 1–5, medium 6–10, hard 11–15');
expect([1, 5, 6, 10, 11, 15].map(G.band).join() === 'easy,easy,medium,medium,hard,hard', 'band() at the edges');
expect(G.prize(0) === 0 && G.prize(1) === 100 && G.prize(15) === 1000000, 'prize(0) = 0, prize(1) = 100, prize(15) = 1,000,000');
expect([0, 4, 5, 9, 10, 14, 15].map(G.safePrize).join() === '0,0,2500,2500,75000,75000,75000', 'safePrize: 0 before rung 5, then the last safe rung');

const r1 = G.rng(42);
const seq = [r1(), r1(), r1()];
const r1b = G.rng(42);
expect(seq.every((x) => x >= 0 && x < 1) && seq.join() === [r1b(), r1b(), r1b()].join() && seq[0] !== G.rng(43)(), 'rng: deterministic, in [0, 1), seed-dependent');
const d1 = G.draw(BANK, 7);
expect(JSON.stringify(d1) === JSON.stringify(G.draw(BANK, 7)), 'draw: the same seed gives the same ids');
expect(d1.length === 15 && d1.every((id, i) => Q.find((q) => q.id === id).level === i + 1), 'draw: 15 ids, one per level, in order');
const seen = new Set();
for (let s = 0; s < 400; s++) G.draw(BANK, s).forEach((id) => seen.add(id));
expect(seen.size === 45, `draw: every question comes up over 400 seeds (${seen.size})`);

const deepFreeze = (o) => { Object.values(o).forEach((v) => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const run0 = G.newRun(BANK, 123);
expect(run0.v === 1 && run0.seed === 123 && run0.level === 1 && run0.status === 'playing' && run0.prize === 0 && run0.ids.length === 15
  && JSON.stringify(run0.used) === '{"clause":false,"template":false,"review":false}' && run0.answers.length === 0
  && JSON.stringify(run0.shown) === '{"clause":null,"template":null}' && !Number.isNaN(Date.parse(run0.started)), 'newRun: the §7 state');
expect(JSON.stringify(run0.ids) === JSON.stringify(G.draw(BANK, 123)), 'newRun: ids = draw(bank, seed)');
deepFreeze(run0);
const before = JSON.stringify(run0);
let st = G.pass(run0, 'SELECT 1 FROM dual');
expect(st.level === 2 && st.answers.length === 1 && st.answers[0].ok === true && st.answers[0].id === run0.ids[0] && JSON.stringify(run0) === before, 'pass: next level, answer recorded, argument untouched');
for (let i = 2; i <= 6; i++) st = G.pass(st, `q${i}`);
expect(st.level === 7 && st.status === 'playing', 'pass ×6: level 7');
const lost = G.fail(st, 'bad');
expect(lost.status === 'lost' && lost.prize === 2500 && lost.answers.length === 7 && lost.answers[6].ok === false && st.status === 'playing', 'fail on rung 7: lost with the rung-5 prize, argument untouched');
expect(G.fail(run0, 'x').prize === 0, 'fail on rung 1: nothing');
const lifeA = G.useLifeline(st, 'clause');
expect(lifeA.used.clause && lifeA.shown.clause === st.ids[6] && !st.used.clause, 'useLifeline(clause): used, shown on the current question');
const lifeB = G.useLifeline(lifeA, 'template');
expect(lifeB.used.template && lifeB.shown.template === st.ids[6], 'useLifeline(template): used, shown');
let threw = false;
try { G.useLifeline(lifeA, 'clause'); } catch { threw = true; }
expect(threw, 'useLifeline throws when the lifeline is already used');
threw = false;
try { G.useLifeline(lost, 'template'); } catch { threw = true; }
expect(threw, 'useLifeline throws when the run is over');
const res = G.rescue(st, 'wrong');
expect(res.status === 'playing' && res.level === 7 && res.used.review && res.answers.length === 7 && res.answers[6].ok === false && !st.used.review, 'rescue: miss recorded, Review used, same level');
threw = false;
try { G.rescue(res, 'again'); } catch { threw = true; }
expect(threw, 'rescue throws when Review is used');
const walked = G.walkAway(st);
expect(walked.status === 'walked' && walked.prize === G.prize(6) && G.walkAway(run0).prize === 0, 'walkAway: the prize of the last rung answered');
let top = G.newRun(BANK, 9);
for (let i = 1; i <= 15; i++) top = G.pass(top, `q${i}`);
expect(top.status === 'won' && top.prize === 1000000 && top.level === 15 && top.answers.length === 15, 'pass on rung 15: won the million');
threw = false;
try { G.pass(top, 'more'); } catch { threw = true; }
expect(threw, 'pass throws once the run is over');
const tenth = (() => { let x = G.newRun(BANK, 5); for (let i = 1; i <= 12; i++) x = G.pass(x, 'q'); return G.fail(x, 'no'); })();
expect(tenth.prize === 75000, 'fail on rung 13: the rung-10 prize');

const CQ = [
  ['', 'empty'], ['   ', 'empty'], ['-- only a comment\n', 'empty'], [';', 'empty'],
  ['SELECT title FROM games;', true], ['SELECT title FROM games', true], ['/* hi */ SELECT title FROM games -- bye', true],
  ['WITH t AS (SELECT genre FROM games) SELECT genre FROM t', true], ['(SELECT title FROM games)', true],
  ['SELECT 1 FROM dual; SELECT 2 FROM dual', 'many'], ["DELETE FROM games WHERE genre = 'Puzzle'", 'not-query'],
  ["INSERT INTO games VALUES (99, 'X', 'Puzzle', 1, 1, NULL)", 'not-query'], ['CREATE TABLE x (a NUMBER)', 'not-query'],
  ['UPDATE games SET price = 0', 'not-query'], ['SELECT title FROM games WHERE ROWNUM <= 3', 'unsupported'],
  ['SELECT title FROM games LIMIT 3', 'lint'], ['SELECT IFNULL(rating, 0) FROM games', 'lint'],
];
CQ.forEach(([sql, wantR]) => {
  const got = G.checkQuery(sql);
  expect(wantR === true ? got.ok === true : got.ok === false && got.reason === wantR, `checkQuery(${JSON.stringify(sql)}) → ${wantR === true ? 'ok' : wantR}${(wantR === true ? got.ok : got.reason === wantR) ? '' : ` (got ${JSON.stringify(got)})`}`);
});

const OC = [
  ['SELECT genre, COUNT(*) FROM games GROUP BY genre ORDER BY COUNT(*) DESC', null],
  ['SELECT EXTRACT(YEAR FROM sale_date) y, COUNT(*) FROM sales GROUP BY EXTRACT(YEAR FROM sale_date) ORDER BY y', null],
  ['SELECT genre, COUNT(*) AS n FROM games GROUP BY genre ORDER BY n DESC, genre', null],
  ['SELECT g.genre, MAX(g.price) FROM games g GROUP BY genre', null],
  ['SELECT COUNT(*), MAX(price) FROM games', null],
  ["SELECT 'x', COUNT(*) FROM games", null],
  ['SELECT title FROM games WHERE price > (SELECT AVG(price) FROM games)', null],
  ['SELECT title, MAX(price) FROM games', 'ORA-00937'],
  ['SELECT genre, title, COUNT(*) FROM games GROUP BY genre', 'ORA-00979'],
  ['SELECT * FROM games GROUP BY genre', 'ORA-00979'],
  ['SELECT genre, COUNT(*) FROM games GROUP BY genre HAVING price > 10', 'ORA-00979'],
  ['SELECT genre, COUNT(*) FROM games GROUP BY genre ORDER BY price', 'ORA-00979'],
  ['SELECT g.title FROM games AS g', 'ORA-00933'],
  ['SELECT t.n FROM (SELECT COUNT(*) AS n FROM games) AS t', 'ORA-00933'],
  ['SELECT COUNT(*) AS n FROM games', null],
  // Subqueries in HAVING (and the select list) may read the grouped column, or anything inside their own scope.
  ['SELECT genre, COUNT(*) FROM games g GROUP BY genre HAVING COUNT(*) > (SELECT COUNT(*) FROM games g2 WHERE g2.genre = g.genre AND g2.rating > 8)', null],
  ['SELECT genre, COUNT(*) FROM games g GROUP BY genre HAVING EXISTS (SELECT 1 FROM games g2 WHERE g2.genre = g.genre AND g2.rating > 8)', null],
  ['SELECT genre, COUNT(*) FROM games g GROUP BY genre HAVING genre IN (SELECT g2.genre FROM games g2 WHERE g2.rating > 8)', null],
  ['SELECT genre, COUNT(*) FROM games g GROUP BY genre HAVING COUNT(*) > ALL (SELECT COUNT(*) FROM games g2 WHERE g2.genre <> g.genre GROUP BY g2.genre)', null],
  ['SELECT genre, (SELECT MAX(g2.price) FROM games g2 WHERE g2.genre = g.genre) FROM games g GROUP BY genre', null],
  ['SELECT genre, COUNT(*) FROM games g GROUP BY genre HAVING price IN (SELECT g2.price FROM games g2)', 'ORA-00979'],
  ['SELECT genre, title, COUNT(*) FROM games g WHERE EXISTS (SELECT 1 FROM sales s WHERE s.game_id = g.game_id) GROUP BY genre', 'ORA-00979'],
  ['SELECT genre, COUNT(*) FROM games g GROUP BY genre HAVING EXISTS (SELECT 1 FROM sales s WHERE s.game_id = g.game_id) AND stock > 3', 'ORA-00979'],
];
OC.forEach(([sql, code]) => {
  const got = G.oracleCheck(sql, BANK.schema);
  expect(code === null ? got === null : !!got && got.code === code, `oracleCheck(${sql}) → ${code || 'null'}${(code === null ? got === null : got && got.code === code) ? '' : ` (got ${JSON.stringify(got)})`}`);
});

const A = { cols: ['TITLE', 'PRICE'], rows: [['A', 1.5], ['B', 2]] };
const gradeCase = (got, wantRes, ordered, reason, what) => {
  const r = G.grade(got, wantRes, ordered);
  expect(r.ok === (reason === null) && r.reason === reason, `grade: ${what} → ${reason || 'ok'}${r.reason === reason ? '' : ` (got ${r.reason})`}`);
};
gradeCase({ cols: ['x', 'y'], rows: [['B', 2], ['A', 1.5]] }, A, false, null, 'same rows, other order, unordered, other column names');
gradeCase({ cols: ['x', 'y'], rows: [['B', 2], ['A', 1.5]] }, A, true, 'order', 'same rows, other order, ordered');
gradeCase({ cols: ['x', 'y'], rows: [['A', 1.50000001], ['B', 2.00004]] }, A, true, null, 'numbers equal to 4 decimals');
gradeCase({ cols: ['x', 'y'], rows: [['A', 1.5], ['B', 2.001]] }, A, false, 'values', 'a value differs');
gradeCase({ cols: ['x'], rows: [['A'], ['B']] }, A, false, 'cols', 'one column short');
gradeCase({ cols: ['x', 'y'], rows: [['A', 1.5]] }, A, false, 'rows', 'one row short');
gradeCase({ cols: [], rows: [] }, A, false, 'rows', 'no rows at all (sql.js gives no columns either)');
gradeCase({ cols: ['x', 'y'], rows: [['A', 1.5], ['A', 1.5]] }, A, false, 'values', 'a duplicated row instead of another');
gradeCase({ error: { text: 'boom' } }, A, false, 'error', 'an error');
const frozenA = deepFreeze(JSON.parse(JSON.stringify(A)));
const gg = G.grade(frozenA, frozenA, true);
expect(gg.ok && gg.got.rows !== frozenA.rows && JSON.stringify(gg.want) === JSON.stringify(A), 'grade: pure, returns copies of got and want');

const S = BANK.schema;
const dg = (args) => G.diagnose({ schema: S, ...args });
const codes = (list) => list.map((x) => x.code).join(',');
let d = dg({ sql: 'SELECT title FROM games LIMIT 3' });
expect(codes(d) === 'limit', `diagnose: LIMIT → limit (${codes(d)})`);
d = dg({ sql: 'SELECT titel FROM games', error: { code: 'ORA-00904', text: '"TITEL": invalid identifier' } });
expect(d.length === 1 && d[0].code === 'unknown-name' && d[0].name === 'titel' && d[0].suggest === 'title', `diagnose: ORA-00904 "TITEL" → unknown-name, suggest title (${JSON.stringify(d)})`);
d = dg({ sql: 'SELECT g.prise FROM games g', error: { text: 'no such column: g.prise' } });
expect(d[0].code === 'unknown-name' && d[0].name === 'prise' && d[0].suggest === 'price', 'diagnose: "no such column: g.prise" → suggest price');
d = dg({ sql: 'SELECT * FROM game', error: { code: 'ORA-00942', text: 'table or view does not exist' } });
expect(d[0].code === 'unknown-name' && d[0].name === 'game' && d[0].suggest === 'games' && d[0].kind === 'table', `diagnose: ORA-00942 on FROM game → suggest games (${JSON.stringify(d)})`);
d = dg({ sql: 'SELECT banana FROM games', error: { code: 'ORA-00904', text: '"BANANA": invalid identifier' } });
expect(d[0].code === 'unknown-name' && d[0].suggest === null, 'diagnose: a name far from every column → no suggestion');
d = dg({ sql: 'SELECT s.title FROM sales s', error: { text: 'no such column: s.title' } });
expect(d[0].code === 'unknown-name' && d[0].suggest === null && JSON.stringify(d[0].tables) === '["games"]', 'diagnose: a real column of another table → no suggestion, names its table');
d = dg({ sql: 'SELECT genre, title, COUNT(*) FROM games GROUP BY genre', grade: { ok: false, reason: 'cols', got: { cols: [1, 2, 3], rows: [] }, want: { cols: [1, 2], rows: [] } } });
expect(d[0].code === 'group-by' && d[0].column === 'title', `diagnose: a column not grouped → group-by first (${codes(d)})`);
d = dg({ sql: 'x', error: { code: 'ORA-00979', text: 'not a GROUP BY expression' } });
expect(codes(d) === 'group-by', 'diagnose: ORA-00979 → group-by');
d = dg({ sql: 'SELECT FROM', error: { code: 'ORA-00900', text: 'invalid SQL statement' } });
expect(d[0].code === 'error' && d[0].ora === 'ORA-00900' && d[0].text === 'invalid SQL statement', 'diagnose: any other error → error {ora, text}');
// The real engine's messages, through the same path as the page (execute → error {code?, text} + raw).
const live = (sql) => { const r = execute(db, sql); return dg({ sql, error: { ...r.error, raw: r.raw } }); };
d = live('SELECT customer_id FROM customers c JOIN sales s ON s.customer_id = c.customer_id');
expect(d[0].code === 'error' && d[0].ora === 'ORA-00918' && d[0].name === 'customer_id', `diagnose (engine): ambiguous column → ORA-00918 (${JSON.stringify(d)})`);
d = live('SELECT title FROM games WHERE price > AVG(price)');
expect(d[0].code === 'error' && d[0].ora === 'ORA-00934', `diagnose (engine): aggregate in WHERE → ORA-00934 (${JSON.stringify(d)})`);
d = live('SELECT titel FROM games');
expect(d[0].code === 'unknown-name' && d[0].suggest === 'title', `diagnose (engine): misspelled column → suggest title (${JSON.stringify(d)})`);
d = live('SELECT * FROM sale');
expect(d[0].code === 'unknown-name' && d[0].kind === 'table' && d[0].suggest === 'sales', `diagnose (engine): misspelled table → suggest sales (${JSON.stringify(d)})`);
d = dg({ sql: 'SELECT g.title FROM games AS g' });
expect(d[0].code === 'error' && d[0].ora === 'ORA-00933', 'diagnose: a table alias with AS → error ORA-00933');
const W = { cols: ['a', 'b'], rows: [['secret-1', 111.11], ['secret-2', 222.22]] };
[
  [{ cols: ['a'], rows: [['x']] }, 'cols'], [{ cols: ['a', 'b'], rows: [['x', 1]] }, 'rows'],
  [{ cols: ['a', 'b'], rows: [['secret-2', 222.22], ['secret-1', 111.11]] }, 'order'], [{ cols: ['a', 'b'], rows: [['x', 1], ['y', 2]] }, 'values'], [W, 'match'],
].forEach(([got, code]) => {
  const out = dg({ sql: 'SELECT a, b FROM t', grade: G.grade(got, W, true) });
  expect(codes(out) === code, `diagnose: grade ${code} → ${code} (${codes(out)})`);
  expect(!/secret|111\.11|222\.22/.test(JSON.stringify(out)), `diagnose (${code}) shows no value of the reference result`);
});
d = dg({ sql: 'SELECT a FROM t', grade: G.grade({ cols: ['a'], rows: [['x']] }, W, false) });
expect(d[0].got === 1 && d[0].want === 2, 'diagnose cols: {got: 1, want: 2}');
expect(G.nearest('GENRE', ['title', 'genre']) === 'genre' && G.nearest('qwerty', ['title']) === null && G.nearest('', ['a']) === null, 'nearest: case-insensitive, null when far or empty');

/* ---- 5. Modes in GameCore (§13) ------------------------------------------------------------- */
section('GameCore modes');
expect(JSON.stringify(G.MODES.map((m) => m.key)) === '["select","insert","update","delete","ddl","mixed"]'
  && JSON.stringify(G.MODES.map((m) => m.kind)) === '["SELECT","INSERT","UPDATE","DELETE","CREATE","MIX"]', 'MODES: select, insert, update, delete, ddl, mixed with their kinds');
expect(G.modeOf({ id: 'r01a' }) === 'select' && G.modeOf({ mode: 'ddl' }) === 'ddl', 'modeOf: no mode means select');
// Select draws are unchanged by the mode banks.
expect(G.draw(BANK, 7).every((id) => /^r\d\da$|^r\d\d[bc]$/.test(id)) && JSON.stringify(G.draw(BANK, 7)) === JSON.stringify(G.draw(BANK, 7, 'select')), 'draw: select only draws select questions');
const sel = G.newRun(BANK, 11);
expect(sel.mode === 'select' && sel.v === 1 && JSON.stringify(G.newRun(BANK, 11, 'select').ids) === JSON.stringify(sel.ids), 'newRun(bank, seed) = newRun(bank, seed, "select"), with mode');

// A full synthetic bank: every mode at every level (2 questions each), to test the draws.
const FAKE = { questions: [] };
['select', 'insert', 'update', 'delete', 'ddl'].forEach((m) => { for (let l = 1; l <= 15; l++) ['a', 'b'].forEach((x) => FAKE.questions.push({ id: `${m}${l}${x}`, mode: m === 'select' ? undefined : m, level: l })); });
const mode = (id) => G.modeOf(FAKE.questions.find((q) => q.id === id));
const lvl = (id) => FAKE.questions.find((q) => q.id === id).level;
['insert', 'ddl'].forEach((m) => {
  const r = G.newRun(FAKE, 5, m);
  expect(r.mode === m && r.ids.every((id, i) => mode(id) === m && lvl(id) === i + 1), `newRun(…, '${m}'): 15 ${m} questions, one per level`);
});
let bandsOk = true;
let orders = new Set();
for (let s = 0; s < 200; s++) {
  const ids = G.drawMixed(FAKE, s);
  if (ids.length !== 15 || !ids.every((id, i) => lvl(id) === i + 1)) bandsOk = false;
  [0, 5, 10].forEach((b) => { const ms = ids.slice(b, b + 5).map(mode); if (new Set(ms).size !== 5) bandsOk = false; orders.add(ms.join()); });
}
expect(bandsOk, 'drawMixed: 15 ids, level by level, each of the five modes exactly once in every band (200 seeds)');
expect(orders.size > 20 && JSON.stringify(G.drawMixed(FAKE, 9)) === JSON.stringify(G.drawMixed(FAKE, 9)), `drawMixed: seeded and varied (${orders.size} band orders seen)`);
const mixed = G.newRun(FAKE, 9, 'mixed');
expect(mixed.mode === 'mixed' && JSON.stringify(mixed.ids) === JSON.stringify(G.drawMixed(FAKE, 9)), 'newRun(…, "mixed") uses drawMixed');
expect(G.drawMixed(BANK, 3).length === 15, 'drawMixed on the partial real bank still gives 15 ids (missing levels fall back to select)');
expect(G.ready(FAKE, 'mixed') && G.ready(BANK, 'select') && !G.ready({ questions: [] }, 'insert'), 'ready(): a mode is ready when every rung has a question');
expect(G.mixedUnlocked({ select: 5, insert: 7, update: 15, delete: 5, ddl: 6 }) && !G.mixedUnlocked({ select: 15, insert: 15, update: 15, delete: 15, ddl: 4 })
  && !G.mixedUnlocked({ select: 15 }) && !G.mixedUnlocked(null), 'mixedUnlocked: rung 5 reached in all five base modes');
expect(G.answered({ status: 'won', level: 15 }) === 15 && G.answered({ status: 'lost', level: 7 }) === 6 && G.answered({ status: 'walked', level: 3 }) === 2 && G.answered(null) === 0, 'answered(state): highest rung answered right');
const v1run = { ...G.newRun(BANK, 4) };
delete v1run.mode;
v1run.level = 8;
const mig = G.migrateV1(v1run, { prize: 20000, date: '2026-01-02' });
expect(mig.v === 2 && mig.runs.select.mode === 'select' && mig.runs.select.level === 8 && mig.reached.select === 8 && mig.best.select.prize === 20000
  && JSON.stringify(G.migrateV1(null, null)) === '{"v":2,"runs":{},"best":{},"reached":{}}' && v1run.mode === undefined, 'migrateV1: run → runs.select, best.select, reached.select = max(run 7, best prize rung 8) (argument untouched)');

// checkAnswer per mode.
const CA = [
  ['select', 'SELECT title FROM games', true], ['select', "DELETE FROM sales WHERE sale_id = 1", 'wrong-kind', 'SELECT'],
  ['insert', "INSERT INTO games VALUES (101, 'A', 'Puzzle', 1, 1, NULL)", true],
  ['insert', "INSERT INTO games VALUES (101, 'A', 'Puzzle', 1, 1, NULL);\nINSERT INTO games VALUES (102, 'B', 'Puzzle', 1, 1, NULL);\nCOMMIT;", true],
  ['insert', "INSERT INTO games (game_id, title, genre, price, stock) SELECT 101, 'Copy', genre, price, 0 FROM games WHERE game_id = 1", true],
  ['insert', 'SELECT * FROM games', 'wrong-kind', 'INSERT'], ['insert', 'COMMIT', 'wrong-kind', 'INSERT'],
  ['insert', "INSERT INTO games VALUES (101, 'A', 'Puzzle', 1, 1, NULL); DELETE FROM sales", 'wrong-kind', 'INSERT'],
  ['update', 'UPDATE games SET stock = 1 WHERE game_id = 1', true], ['update', 'UPDATE games SET stock = 1; ROLLBACK', 'wrong-kind', 'UPDATE'],
  ['delete', 'DELETE FROM sales WHERE sale_id = 1', true], ['delete', 'TRUNCATE TABLE sales', 'wrong-kind', 'DELETE'],
  ['delete', "DELETE FROM sales WHERE sale_date LIKE '2024%'", 'unsupported'],
  ['ddl', 'CREATE TABLE t (a NUMBER(3) PRIMARY KEY)', true], ['ddl', 'ALTER TABLE games ADD (discount NUMBER(3))', true],
  ['ddl', 'ALTER TABLE games DROP COLUMN rating', true], ['ddl', 'ALTER TABLE games DROP (rating)', true],
  ['ddl', "CREATE OR REPLACE VIEW v AS SELECT title FROM games WHERE genre = 'RPG'", true], ['ddl', 'CREATE INDEX i ON games (genre)', true],
  ['ddl', 'DROP VIEW v', true], ['ddl', 'DROP INDEX i', true], ['ddl', 'CREATE UNIQUE INDEX i ON games (title, genre); COMMIT', true],
  ['ddl', 'DROP TABLE sales', 'wrong-kind', 'CREATE'], ['ddl', 'ALTER TABLE games MODIFY (title VARCHAR2(80))', 'unsupported'],
  ['ddl', 'ALTER TABLE games RENAME COLUMN stock TO units', 'wrong-kind', 'CREATE'], ['ddl', "INSERT INTO games VALUES (101, 'A', 'Puzzle', 1, 1, NULL)", 'wrong-kind', 'CREATE'],
  ['ddl', 'CREATE TABLE t (a TEXT)', 'lint'], ['update', '', 'empty'], ['ddl', '-- nothing', 'empty'],
];
CA.forEach(([m, sql, wantR, kind]) => {
  const r = G.checkAnswer(sql, m);
  const ok = wantR === true ? r.ok === true : r.ok === false && r.reason === wantR && (!kind || r.expected === kind);
  expect(ok, `checkAnswer(${JSON.stringify(sql.slice(0, 60))}, '${m}') → ${wantR === true ? 'ok' : wantR}${kind ? ` (expected ${kind})` : ''}${ok ? '' : ` (got ${JSON.stringify(r)})`}`);
});
expect(G.checkAnswer('SELECT * FROM games', 'insert').detail === 'SELECT' && G.checkAnswer('DROP TABLE sales', 'ddl').detail === 'DROP TABLE', 'checkAnswer: detail names the kind found');
expect(G.defaultChecks({ mode: 'delete', checks: null }).length === 3 && G.defaultChecks({ mode: 'insert' }).every((p, i) => p.endsWith(['ORDER BY customer_id', 'ORDER BY game_id', 'ORDER BY sale_id'][i])) && /ROUND\(price, 2\)/.test(G.defaultChecks({ mode: 'update' })[1])
  && JSON.stringify(G.defaultChecks({ mode: 'ddl', checks: ['SELECT 1 FROM dual'] })) === '["SELECT 1 FROM dual"]' && G.defaultChecks({ id: 'r01a' }).length === 0, 'defaultChecks: the three snapshots for DML, the own probes otherwise');

// executeChecks semantics (OracleDialect.runChecks, shared by the browser and Node).
const SETUP = BANK.setup;
let ec = executeChecks(SETUP, "INSERT INTO sales VALUES (1001, 1, 1, DATE '2025-12-31', 2, 119.98);\nUPDATE games SET stock = stock - 2 WHERE game_id = 1", [
  'SELECT COUNT(*) FROM sales', 'DELETE FROM sales', 'SELECT COUNT(*) FROM sales', "INSERT INTO customers VALUES (1, 'X', 'Spain', DATE '2025-01-01', 0)", 'SELECT stock FROM games WHERE game_id = 1']);
expect(ec.changes === 2 && !ec.error, `executeChecks: changes counts the rows modified by the answer (${ec.changes})`);
expect(ec.results[0].rows[0][0] === 54 && ec.results[1].cols.length === 0 && ec.results[2].rows[0][0] === 54, 'executeChecks: each probe runs in a savepoint (a DELETE probe does not affect the next)');
expect(ec.results[3].error && ec.results[3].error.code === 'ORA-00001' && ec.results[4].rows[0][0] === 12, 'executeChecks: a probe error is that probe\'s result, and later probes still run');
ec = executeChecks(SETUP, 'DELETE FROM games WHERE game_id = 1', ['SELECT COUNT(*) FROM games']);
expect(ec.error && ec.error.code === 'ORA-02292' && ec.results.length === 0, 'executeChecks: an answer error (ORA-02292 child record found) stops before the probes');
const codeOf = (text, probes = []) => { const r = executeChecks(SETUP, text, probes); return r.error ? r.error.code : r.results.map((x) => (x.error ? x.error.code : 'ok')).join(); };
expect(codeOf('UPDATE sales SET game_id = 999 WHERE sale_id = 1') === 'ORA-02291', 'UPDATE of a child key to a missing parent → ORA-02291');
expect(codeOf('UPDATE games SET game_id = 999 WHERE game_id = 1') === 'ORA-02292', 'UPDATE of a parent key with children → ORA-02292');
expect(codeOf('UPDATE games SET title = NULL WHERE game_id = 1') === 'ORA-01407', 'UPDATE to NULL on a NOT NULL column → ORA-01407');
expect(codeOf('UPDATE customers SET vip_level = 7 WHERE customer_id = 1') === 'ORA-02290', 'CHECK violated → ORA-02290');
expect(codeOf("INSERT INTO sales VALUES (1001, 999, 1, DATE '2025-01-01', 1, 1)") === 'ORA-02291', 'INSERT with a missing parent → ORA-02291');
expect(codeOf('COMMIT', ['DELETE FROM customers WHERE customer_id = 1', 'UPDATE sales SET customer_id = 999 WHERE sale_id = 1', 'DELETE FROM customers WHERE customer_id = 20'])
  === 'ORA-02292,ORA-02291,ok', 'probe errors are mapped with the probe\'s own text (02292 / 02291)');
ec = executeChecks(SETUP, "CREATE TABLE reviews (review_id NUMBER(5) PRIMARY KEY, game_id NUMBER(4) NOT NULL REFERENCES games (game_id), stars NUMBER(1) DEFAULT 3 NOT NULL CHECK (stars BETWEEN 1 AND 5), note VARCHAR2(40));\nCREATE INDEX idx_reviews_game ON reviews (game_id, stars);\nCREATE UNIQUE INDEX idx_games_title_genre ON games (title, genre);\nCREATE OR REPLACE VIEW v_rpg AS SELECT title, price FROM games WHERE genre = 'RPG';\nALTER TABLE customers ADD (email VARCHAR2(60), phone VARCHAR2(20));\nALTER TABLE customers DROP (phone)", [
  "SELECT column_name, nullable FROM user_tab_columns WHERE table_name = 'REVIEWS' ORDER BY column_id",
  "SELECT index_name, uniqueness FROM user_indexes WHERE index_name NOT LIKE 'SYS%' ORDER BY index_name",
  "SELECT column_name, column_position FROM user_ind_columns WHERE index_name = 'IDX_REVIEWS_GAME' ORDER BY column_position",
  "SELECT view_name FROM user_views", 'SELECT * FROM v_rpg ORDER BY title',
  "SELECT column_name FROM user_tab_columns WHERE table_name = 'CUSTOMERS' ORDER BY column_id",
  "SELECT table_name FROM user_tables ORDER BY table_name", 'INSERT INTO reviews (review_id, game_id) VALUES (1, 1)', 'INSERT INTO reviews VALUES (2, 1, 9, NULL)']);
const j = (k) => JSON.stringify(ec.results[k].rows);
expect(!ec.error && j(0) === '[["REVIEW_ID","N"],["GAME_ID","N"],["STARS","N"],["NOTE","Y"]]', `dictionary: user_tab_columns with nullable (${ec.error ? ec.error.text : j(0)})`);
expect(j(1) === '[["IDX_GAMES_TITLE_GENRE","UNIQUE"],["IDX_REVIEWS_GAME","NONUNIQUE"]]' && j(2) === '[["GAME_ID",1],["STARS",2]]', 'dictionary: user_indexes (uniqueness) and user_ind_columns (positions)');
expect(j(3) === '[["V_RPG"]]' && ec.results[4].rows.length === 4, 'dictionary: user_views; the view answers');
expect(j(5) === '[["CUSTOMER_ID"],["NAME"],["COUNTRY"],["SIGNUP_DATE"],["VIP_LEVEL"],["EMAIL"]]' && j(6) === '[["CUSTOMERS"],["GAMES"],["REVIEWS"],["SALES"]]', 'ALTER TABLE ADD (a, b) and DROP (b); user_tables');
expect(ec.results[7].cols.length === 0 && !ec.results[7].error && ec.results[8].error.code === 'ORA-02290', 'behaviour probes: DEFAULT fills a column, CHECK refuses (ORA-02290)');

// gradeChecks and the DML / DDL diagnosis.
const snap = G.defaultChecks({ mode: 'delete' });
const ref = executeChecks(SETUP, 'DELETE FROM sales WHERE sale_id = 53', snap);
const gcase = (text) => G.gradeChecks(executeChecks(SETUP, text, snap), ref);
expect(gcase('DELETE FROM sales WHERE sale_id = 53').ok && gcase('DELETE FROM sales WHERE sale_id >= 53').ok, 'gradeChecks: the same final state passes, whatever the query');
const g2 = gcase('DELETE FROM sales WHERE sale_id = 52');
expect(!g2.ok && g2.reason === 'probe' && g2.probe === 2 && g2.detail.reason === 'values', `gradeChecks: another row deleted → probe 3 (sales) differs by values (${JSON.stringify(g2).slice(0, 80)})`);
const g3 = gcase('DELETE FROM games WHERE game_id = 1');
expect(!g3.ok && g3.reason === 'error' && g3.detail.gotError.code === 'ORA-02292', 'gradeChecks: an answer error → reason error with gotError');
expect(G.gradeChecks({ changes: 0, results: [{ error: { code: 'ORA-00001', text: 'a' } }] }, { changes: 0, results: [{ error: { code: 'ORA-00001', text: 'b' } }] }).ok
  && !G.gradeChecks({ changes: 0, results: [{ error: { code: 'ORA-00001' } }] }, { changes: 0, results: [{ error: { code: 'ORA-02291' } }] }).ok
  && !G.gradeChecks({ changes: 0, results: [{ cols: [], rows: [] }] }, { changes: 0, results: [{ cols: [], rows: [] }, { cols: [], rows: [] }] }).ok, 'gradeChecks: errors compared by ORA code only; probe counts must match');
const dgc = (text) => G.diagnose({ sql: text, schema: BANK.schema, checks: { got: executeChecks(SETUP, text, snap), want: ref, probes: snap } });
let dd = dgc('DELETE FROM sales');
expect(dd.length === 1 && dd[0].code === 'table' && dd[0].table === 'sales' && dd[0].got === 0 && dd[0].want === 52, `diagnose: a table's row count differs → table {got, want} (${JSON.stringify(dd)})`);
dd = dgc('UPDATE sales SET quantity = 9 WHERE sale_id = 53');
expect(dd.some((x) => x.code === 'table' && x.table === 'sales'), 'diagnose: rows of another count');
dd = G.diagnose({ sql: 'x', schema: BANK.schema, checks: { got: executeChecks(SETUP, 'UPDATE games SET stock = 1 WHERE game_id = 2', snap), want: executeChecks(SETUP, 'UPDATE games SET stock = 1 WHERE game_id = 3', snap), probes: snap } });
expect(dd.length === 1 && dd[0].code === 'table-values' && dd[0].table === 'games' && !/Neon|Rust/.test(JSON.stringify(dd)), 'diagnose: same counts, other values → table-values {table}, no values shown');
dd = dgc('DELETE FROM games WHERE game_id = 1');
expect(dd[0].code === 'constraint' && dd[0].ora === 'ORA-02292', 'diagnose: a constraint error → constraint {ora}');
expect(dgc('DELETE FROM sales WHERE sale_id = 53').some((x) => x.code === 'match'), 'diagnose: the same state → match');
const ddlq = BANK.questions.find((q) => q.id === 'ddl01a');
const dwant = executeChecks(SETUP, ddlq.solution, ddlq.checks);
dd = G.diagnose({ sql: ddlq.traps[0], schema: BANK.schema, checks: { got: executeChecks(SETUP, ddlq.traps[0], ddlq.checks), want: dwant, probes: ddlq.checks } });
expect(dd.length === 1 && dd[0].code === 'probe' && dd[0].index === 2 && dd[0].expectError === true, `diagnose (DDL): the probe that should fail does not → probe {index, expectError} (${JSON.stringify(dd)})`);

console.log(bad ? `\n${bad} check(s) failed, ${good} ok` : `\nall game bank checks ok (${good})`);
process.exit(bad ? 1 : 0);
