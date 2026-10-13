'use strict';
/* SQL: concept cards (js/sql.js), quiz and sandbox.
   Card fields: those of js/concept-section.js, plus
     sql      { setup, query, expectError? }: a runnable example written in ORACLE (the course practises on
              freesql.com); js/oracle-dialect.js translates it to SQLite in the browser. The setup runs first
              in a fresh database; the query is what the student edits. expectError marks examples whose
              last statement fails on purpose (tools/check-cards.mjs uses it).
     code + dialect   a static Oracle example for features the sandbox cannot simulate (roles, partitions…).
   The runnable examples share the enrolment schema of the Normalization section (student, course,
   department, enrolment); the efficiency cards add a customer / orders table with many rows. */
(() => {
  const SCHOOL = `CREATE TABLE department (
  dept_id VARCHAR2(3) PRIMARY KEY,
  name    VARCHAR2(30) NOT NULL UNIQUE
);
CREATE TABLE student (
  student_id VARCHAR2(3) PRIMARY KEY,
  name       VARCHAR2(40) NOT NULL,
  email      VARCHAR2(40) UNIQUE
);
CREATE TABLE course (
  course_id VARCHAR2(3) PRIMARY KEY,
  title     VARCHAR2(40) NOT NULL,
  credits   NUMBER(3,1) NOT NULL CHECK (credits > 0),
  dept_id   VARCHAR2(3) NOT NULL REFERENCES department (dept_id)
);
CREATE TABLE enrolment (
  student_id VARCHAR2(3) REFERENCES student (student_id) ON DELETE CASCADE,
  course_id  VARCHAR2(3) REFERENCES course (course_id),
  grade      NUMBER(4,2) CHECK (grade BETWEEN 0 AND 10),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO department VALUES ('D01', 'Computing');
INSERT INTO department VALUES ('D02', 'Maths');
INSERT INTO student VALUES ('S01', 'Ana Ruiz', 'ana@uni.es');
INSERT INTO student VALUES ('S02', 'Luis Gil', 'luis@uni.es');
INSERT INTO student VALUES ('S03', 'Eva Sanz', NULL);
INSERT INTO course VALUES ('C10', 'Databases', 6, 'D01');
INSERT INTO course VALUES ('C11', 'Python', 4.5, 'D01');
INSERT INTO course VALUES ('C20', 'Statistics', 6, 'D02');
INSERT INTO course VALUES ('C30', 'Marketing', 3, 'D02');
INSERT INTO enrolment VALUES ('S01', 'C10', 8.5);
INSERT INTO enrolment VALUES ('S01', 'C20', 7.0);
INSERT INTO enrolment VALUES ('S02', 'C10', 6.5);
INSERT INTO enrolment VALUES ('S02', 'C11', 9.0);
INSERT INTO enrolment VALUES ('S03', 'C10', 5.0);
INSERT INTO enrolment VALUES ('S03', 'C11', 7.5);
COMMIT;`;

  /* 50,000 customers and 100,000 orders, generated with CONNECT BY LEVEL (about 0.2 s). */
  const SHOP = `CREATE TABLE customer (
  customer_id NUMBER(6) PRIMARY KEY,
  email       VARCHAR2(60) NOT NULL,
  city        VARCHAR2(20) NOT NULL,
  signup_date DATE NOT NULL
);
CREATE TABLE orders (
  order_id    NUMBER(7) PRIMARY KEY,
  customer_id NUMBER(6) NOT NULL REFERENCES customer (customer_id),
  order_date  DATE NOT NULL,
  total       NUMBER(8,2) NOT NULL
);
INSERT INTO customer
SELECT LEVEL, 'user' || LEVEL || '@mail.com',
       CASE MOD(LEVEL, 5) WHEN 0 THEN 'Madrid' WHEN 1 THEN 'Barcelona' WHEN 2 THEN 'Valencia' WHEN 3 THEN 'Sevilla' ELSE 'Bilbao' END,
       DATE '2020-01-01' + MOD(LEVEL, 1500)
FROM dual CONNECT BY LEVEL <= 50000;
INSERT INTO orders
SELECT LEVEL, 1 + MOD(LEVEL * 7919, 50000), DATE '2023-01-01' + MOD(LEVEL, 700), ROUND(5 + MOD(LEVEL, 400) * 0.75, 2)
FROM dual CONNECT BY LEVEL <= 100000;
COMMIT;`;

  DATA.en.SQL_CONCEPTS = [
    /* ───────────── Oracle and FreeSQL ───────────── */
    {
      id: 'freesql',
      hub: 'oracle',
      topic: 'oracle',
      title: 'Practising on Oracle with FreeSQL',
      summary: '**FreeSQL** (freesql.com) is Oracle\'s free online worksheet: you write Oracle SQL in the browser and run it on a real Oracle database, with nothing to install. It is where you practise in this course.',
      body: [
        'Every runnable example of this website is written in **Oracle SQL**. The page runs a browser simulation so you get an instant answer, but the reference is the real thing: use the **Copy and open FreeSQL** button under any example and paste the script in the worksheet.',
        'In the worksheet you choose the **database version** (use 23ai or 26ai: the scripts of this site use features from 23ai such as `DROP TABLE IF EXISTS`), write your SQL, and run a single statement or the whole script. Signing in with a free Oracle account lets you save and share your scripts and get a connection string for tools such as SQL Developer.',
        'The scripts copied from this site start by dropping the tables they create, so you can run them again and again on a clean slate.',
      ],
      points: [
        'Run one statement: put the cursor in it and run. Run the whole script: use the script option of the worksheet.',
        'Your schema persists between sessions: drop what you no longer need.',
        'The simulation here does not support PL/SQL, partitioning, sequences or privileges: for those, FreeSQL is the only place to run them.',
      ],
      mistake: 'Trusting only the simulation. It translates a subset of Oracle to a different engine: when its result surprises you, check it in FreeSQL.',
    },
    {
      id: 'oracle-dialect',
      hub: 'oracle',
      topic: 'oracle',
      title: 'Oracle compared with other SQL dialects',
      summary: 'SQL is a standard, but every DBMS has its own dialect. Most errors of students who learned SQL elsewhere come from a few differences: row limiting, types, dates, empty strings and transactions.',
      body: [
        'The sandbox warns you when the code you typed would not work on Oracle (for example, if you write `LIMIT`) and shows the error as Oracle would report it, such as `ORA-00942: table or view does not exist`.',
      ],
      table: {
        caption: 'Oracle versus SQLite, PostgreSQL and MySQL',
        head: ['Topic', 'Oracle', 'Others'],
        rows: [
          ['First n rows', '`FETCH FIRST n ROWS ONLY`', '`LIMIT n`'],
          ['Set difference', '`MINUS`', '`EXCEPT`'],
          ['Text type', '`VARCHAR2(n)`, `CLOB`', '`TEXT`, `VARCHAR(n)`'],
          ['Numbers', '`NUMBER(p, s)`', '`INTEGER`, `NUMERIC`, `REAL`'],
          ['Auto number', '`GENERATED ALWAYS AS IDENTITY`', '`AUTOINCREMENT`, `SERIAL`, `AUTO_INCREMENT`'],
          ['Current date', '`SYSDATE`', '`date(\'now\')`, `CURRENT_DATE`, `NOW()`'],
          ['Date literal', '`DATE \'2024-01-31\'`, `TO_DATE(…)`', 'A plain string'],
          ['Null replacement', '`NVL(a, b)`, `COALESCE`', '`IFNULL(a, b)`'],
          ['Empty string', 'Is **NULL**', 'Is an empty string'],
          ['Select without table', '`SELECT 1 FROM dual`', '`SELECT 1`'],
          ['Transactions', 'Start with the first DML; DDL commits', '`BEGIN` / `START TRANSACTION`'],
          ['Data dictionary', '`USER_TABLES`, `USER_TAB_COLUMNS`', '`sqlite_master`, `information_schema`'],
          ['Execution plan', '`EXPLAIN PLAN FOR` + `DBMS_XPLAN`', '`EXPLAIN`'],
        ],
      },
      mistake: 'Writing a comparison like `WHERE signup_date >= \'2024-01-01\'` against a DATE column. It relies on the session\'s date format and often fails (ORA-01861); write `DATE \'2024-01-01\'`.',
    },

    /* ───────────── Querying ───────────── */
    {
      id: 'select-basics',
      hub: 'querying',
      topic: 'querying',
      title: 'SELECT: columns, expressions and aliases',
      summary: 'A **SELECT** names the columns you want to see, **FROM** names the table they come from. Each column can be a stored value, a calculation or a piece of glued text, and an **alias** gives it a readable name.',
      body: [
        '`SELECT *` returns every column in the order of the table. It is handy to explore a table, but in a real query list the columns you need: the result is clearer and does not change if someone adds a column.',
        'A column can be an **expression**: arithmetic (`credits * 25`), a function (`ROUND(x, 1)`, `UPPER(name)`) or text glued with the concatenation operator `||` (`name || \' (\' || country || \')\'`). Text values always go in **single quotes**.',
        'An **alias** renames a result column: `credits * 25 AS hours`. `AS` is optional. Without quotes Oracle shows the alias in capitals; write it in double quotes (`AS "Study hours"`) to keep spaces or lower case.',
        '**DISTINCT** removes duplicate rows from the result. It applies to the whole row: `SELECT DISTINCT dept_id, credits` keeps each different **pair** once.',
      ],
      points: [
        'Order of a basic query: `SELECT columns FROM table`; the clauses you will add later (WHERE, ORDER BY) come after FROM.',
        'Single quotes are for text values; double quotes are for names (aliases, columns).',
        'An alias only renames the output: it does not change the table.',
      ],
      example: '`SELECT title, credits * 25 AS hours FROM course` shows each course with its study hours (1 ECTS credit ≈ 25 hours).',
      mistake: 'Gluing text with `+` (`name + \' \' + email`). In Oracle `+` is only arithmetic and fails with ORA-01722 (invalid number): use `||`.',
      sql: {
        setup: SCHOOL,
        query: `SELECT title, credits, credits * 25 AS hours
FROM course;
SELECT student_id || ' - ' || name AS student_label
FROM student;
SELECT DISTINCT dept_id
FROM course;`,
      },
    },
    {
      id: 'order-by',
      hub: 'querying',
      topic: 'querying',
      title: 'Sorting results with ORDER BY',
      summary: 'Without **ORDER BY** a table has no guaranteed order: the rows come in whatever order the DBMS finds them. ORDER BY sorts the result by one or more keys, ascending (**ASC**, the default) or descending (**DESC**).',
      body: [
        'With several keys the second one only breaks ties of the first: `ORDER BY credits DESC, title` sorts by credits from high to low and, inside the same credits, by title A→Z. Each key has its own ASC/DESC.',
        'You can sort by a column you do not show, by an expression or by an **alias** of the SELECT (ORDER BY is evaluated after SELECT).',
        'In Oracle **NULLs are the largest value**: they go **last** in ascending order and first in descending order. Change it with `NULLS FIRST` or `NULLS LAST` after the key.',
        'To keep only the first rows of the sorted result, finish with `FETCH FIRST n ROWS ONLY`. Oracle has no `LIMIT`.',
      ],
      points: [
        'ORDER BY is always the last clause of the query (FETCH FIRST goes after it).',
        'Text is sorted character by character: in Oracle\'s default binary sort, capital letters come before lower-case ones.',
        'If two rows tie on every key their order is not defined: add a key that makes it unique.',
      ],
      example: '`ORDER BY grade DESC FETCH FIRST 3 ROWS ONLY` gives the three best grades.',
      mistake: 'Writing `DESC` once and expecting it to apply to every key. In `ORDER BY credits, title DESC` only the title is descending.',
      sql: {
        setup: SCHOOL,
        query: `SELECT title, credits
FROM course
ORDER BY credits DESC, title;
SELECT name, email
FROM student
ORDER BY email NULLS FIRST;
SELECT student_id, course_id, grade
FROM enrolment
ORDER BY grade DESC
FETCH FIRST 3 ROWS ONLY;`,
      },
    },
    {
      id: 'where-logic',
      hub: 'querying',
      topic: 'querying',
      title: 'Filtering with WHERE, AND, OR and NOT',
      summary: '**WHERE** keeps only the rows for which a condition is true. Conditions compare values (`=`, `<>`, `<`, `<=`, `>`, `>=`) and combine with **AND**, **OR** and **NOT**.',
      body: [
        '`AND` needs both conditions to be true; `OR` needs at least one; `NOT` reverses a condition. "Different from" is written `<>` (Oracle also accepts `!=`).',
        'The operators have a **precedence**, like × and + in arithmetic: first `NOT`, then `AND`, then `OR`. So `a OR b AND c` means `a OR (b AND c)`.',
        'When you mix AND and OR, **write the parentheses** you mean. The two queries of the example differ only in the parentheses, and they return different rows.',
        'WHERE runs on the rows of the table, **before** SELECT: you cannot use a column alias of the SELECT inside the WHERE.',
      ],
      points: [
        'Text comparisons are case-sensitive in Oracle: `\'spain\'` is not `\'Spain\'`.',
        'Numbers are written without quotes: `credits >= 6`.',
        'Read your WHERE aloud with the parentheses: if the sentence is not what the question asks, the query is wrong.',
      ],
      example: '`WHERE (dept_id = \'D01\' OR dept_id = \'D02\') AND credits >= 6` keeps the 6-credit courses of either department.',
      mistake: 'Leaving out the parentheses in a mix of AND and OR. `dept_id = \'D01\' OR dept_id = \'D02\' AND credits >= 6` returns **every** D01 course, whatever its credits.',
      sql: {
        setup: SCHOOL,
        query: `-- Without parentheses: AND is evaluated first
SELECT course_id, title, credits, dept_id
FROM course
WHERE dept_id = 'D01' OR dept_id = 'D02' AND credits >= 6;
-- With parentheses: what we actually meant
SELECT course_id, title, credits, dept_id
FROM course
WHERE (dept_id = 'D01' OR dept_id = 'D02') AND credits >= 6;
SELECT title
FROM course
WHERE NOT dept_id = 'D01';`,
      },
    },
    {
      id: 'where-predicates',
      hub: 'querying',
      topic: 'querying',
      title: 'BETWEEN, IN and LIKE',
      summary: 'Three shortcuts for common filters: **BETWEEN** for ranges, **IN** for lists of values and **LIKE** for text patterns.',
      body: [
        '`x BETWEEN a AND b` is `x >= a AND x <= b`: **both ends are included**. It works with numbers, text and dates; for dates write literals as `DATE \'2024-01-31\'`.',
        '`x IN (\'A\', \'B\', \'C\')` is a short way of writing `x = \'A\' OR x = \'B\' OR x = \'C\'`. `NOT IN` keeps the rest.',
        '`LIKE` compares text with a pattern: `%` stands for **any number** of characters (zero included) and `_` for **exactly one**. `\'Ma%\'` begins with Ma, `\'%ez\'` ends with ez, `\'_a%\'` has an a as second letter.',
        'LIKE is case-sensitive in Oracle. To ignore case compare in capitals: `UPPER(name) LIKE \'%RUIZ%\'`.',
      ],
      points: [
        '`BETWEEN 2020 AND 2021` on a DATE column is wrong: compare with dates, `BETWEEN DATE \'2020-01-01\' AND DATE \'2021-12-31\'`.',
        'Watch out for spaces in patterns: `\'The %\'` (the word "The") is not `\'The%\'` (which also matches "Theo").',
        'The browser simulation ignores case in LIKE; Oracle does not. Check case-sensitive patterns on FreeSQL.',
      ],
      example: '`WHERE grade BETWEEN 7 AND 8.5` returns the grades 7.0, 7.5 and 8.5: both limits are included.',
      mistake: 'Writing a pattern with `=`: `name = \'A%\'` looks for a name that is literally "A%". Patterns need LIKE.',
      sql: {
        setup: SCHOOL,
        query: `SELECT student_id, course_id, grade
FROM enrolment
WHERE grade BETWEEN 7 AND 8.5;
SELECT course_id, title
FROM course
WHERE course_id IN ('C10', 'C30');
SELECT name
FROM student
WHERE name LIKE '%z';`,
      },
    },
    {
      id: 'null-values',
      hub: 'querying',
      topic: 'querying',
      title: 'Working with NULL',
      summary: '**NULL** means "unknown" or "missing": it is not zero and not an empty text. Any comparison with NULL is unknown, so `= NULL` never finds anything: use **IS NULL** and **IS NOT NULL**.',
      body: [
        'SQL uses three-valued logic: a condition can be true, false or **unknown**. WHERE only keeps the rows where the condition is **true**, so rows that give unknown disappear.',
        '`email = NULL` is unknown for every row, even for the rows whose email is missing. The right test is `email IS NULL`; its opposite is `email IS NOT NULL`.',
        'Arithmetic and concatenation with NULL: `NULL + 1` is NULL. To show a value instead of NULL use `NVL(email, \'no email\')` (or the standard `COALESCE`).',
        'In Oracle an **empty string `\'\'` is NULL**. Other DBMSs treat it as a text of length zero.',
      ],
      points: [
        '`NOT (email = NULL)` is still unknown: negating unknown does not make it true.',
        'A condition such as `grade <> 5` also skips the rows where grade is NULL.',
        'With ORDER BY, Oracle puts NULLs last in ascending order (see the ORDER BY card).',
      ],
      example: '`SELECT name FROM student WHERE email IS NULL` returns the students without an email.',
      mistake: 'Writing `WHERE email = NULL` or `WHERE email = \'\'`: neither returns a row. Use `IS NULL`.',
      sql: {
        setup: SCHOOL,
        query: `-- Returns nothing: a comparison with NULL is never true
SELECT name, email FROM student WHERE email = NULL;
SELECT name FROM student WHERE email IS NULL;
SELECT name, NVL(email, 'no email') AS email FROM student;`,
      },
    },
    {
      id: 'inner-join',
      hub: 'querying',
      topic: 'querying',
      title: 'Joining tables with INNER JOIN',
      summary: 'A **JOIN** combines rows of two tables that are related. The **ON** condition says how they match, almost always by following a **foreign key** to the primary key it references.',
      body: [
        '`FROM course c JOIN department d ON d.dept_id = c.dept_id` pairs each course with the department whose key matches its `dept_id`. `JOIN` and `INNER JOIN` are the same thing.',
        '**Table aliases** (`c`, `d`) shorten the query. When a column name exists in both tables, you must say which one you mean: `c.dept_id` or `d.dept_id`; otherwise Oracle fails with ORA-00918 (column ambiguously defined).',
        'To join three tables, add one JOIN per relationship: `enrolment` links to `student` and to `course` through its two foreign keys.',
        'An INNER JOIN keeps only the rows that **find a partner**. A course with no enrolments does not appear when you join course with enrolment. Keeping those rows needs an OUTER JOIN (see the **Outer joins** card).',
      ],
      points: [
        'One JOIN per foreign key you follow: n tables need n − 1 join conditions.',
        'WHERE and ORDER BY come after all the JOINs and can use columns of any joined table.',
        'Without the ON condition every row would be paired with every row of the other table (a Cartesian product).',
      ],
      example: '`SELECT s.name, c.title FROM enrolment e JOIN student s ON s.student_id = e.student_id JOIN course c ON c.course_id = e.course_id` lists who is enrolled in what.',
      mistake: 'Joining on the wrong columns (`ON c.course_id = d.dept_id`). The query runs but the rows are nonsense or missing: the ON must follow a foreign key.',
      sql: {
        setup: SCHOOL,
        query: `SELECT c.title, d.name AS department
FROM course c
JOIN department d ON d.dept_id = c.dept_id
ORDER BY d.name, c.title;
SELECT s.name, c.title, e.grade
FROM enrolment e
JOIN student s ON s.student_id = e.student_id
JOIN course  c ON c.course_id  = e.course_id
WHERE e.grade >= 7
ORDER BY s.name, c.title;`,
      },
    },

    /* ───────────── Combining tables ───────────── */
    {
      id: 'outer-joins',
      hub: 'joins',
      topic: 'joins',
      title: 'Outer joins: LEFT, RIGHT and FULL',
      summary: 'An **OUTER JOIN** also keeps the rows that find no partner, and fills the missing side with NULL. **LEFT** keeps every row of the left table, **RIGHT** every row of the right one, **FULL** every row of both.',
      body: [
        'Think of the class list and the pile of handed-in assignments. An INNER JOIN shows only the students who handed something in; a LEFT JOIN starts from the class list and leaves a blank next to the ones who did not. That blank is NULL.',
        '`FROM course c LEFT JOIN enrolment e ON e.course_id = c.course_id` keeps Marketing, which nobody takes, with NULL in every enrolment column. `RIGHT JOIN` is the mirror image (`A RIGHT JOIN B` is `B LEFT JOIN A`), so most people only write LEFT JOINs. `FULL OUTER JOIN` keeps the unmatched rows of both sides.',
        'The **anti-join** finds rows with **no** partner: LEFT JOIN, then keep the rows where a column of the right table that is never NULL came back NULL (`WHERE e.course_id IS NULL`). Courses nobody takes, customers with no orders, products never sold.',
      ],
      points: [
        'A condition on the right table goes in the **ON** if you want to keep the unmatched rows; in the WHERE it removes them again.',
        'To count partners, count a column of the right table (`COUNT(e.course_id)`): an unmatched course still produces one row, and `COUNT(*)` would count it as 1.',
        'Oracle\'s old `(+)` syntax (`WHERE c.course_id = e.course_id(+)`) is a LEFT JOIN: read it in old code, write the ANSI form.',
      ],
      example: '`SELECT c.title FROM course c LEFT JOIN enrolment e ON e.course_id = c.course_id WHERE e.course_id IS NULL` lists the courses nobody has enrolled in: Marketing.',
      mistake: 'Filtering the right table in the WHERE: `LEFT JOIN enrolment e ON … WHERE e.grade >= 5` drops the courses without enrolments again, because their grade is NULL. Move the condition into the ON: `ON e.course_id = c.course_id AND e.grade >= 5`.',
      sql: {
        setup: SCHOOL,
        query: `-- INNER: Marketing (no enrolments) disappears
SELECT c.title, e.student_id, e.grade
FROM course c
JOIN enrolment e ON e.course_id = c.course_id
ORDER BY c.title;
-- LEFT: every course, with NULL where nobody is enrolled
SELECT c.title, e.student_id, e.grade
FROM course c
LEFT JOIN enrolment e ON e.course_id = c.course_id
ORDER BY c.title;
-- Anti-join: the courses nobody takes
SELECT c.course_id, c.title
FROM course c
LEFT JOIN enrolment e ON e.course_id = c.course_id
WHERE e.course_id IS NULL;
-- FULL: who takes Statistics (C20), who takes Python (C11), and who takes both
SELECT st.student_id AS in_statistics, py.student_id AS in_python
FROM (SELECT student_id FROM enrolment WHERE course_id = 'C20') st
FULL OUTER JOIN (SELECT student_id FROM enrolment WHERE course_id = 'C11') py
  ON py.student_id = st.student_id;`,
      },
    },
    {
      id: 'cross-self-join',
      hub: 'joins',
      topic: 'joins',
      title: 'CROSS JOIN, self-joins, USING and NATURAL',
      summary: 'A **CROSS JOIN** pairs every row with every row of another table. A **self-join** joins a table with itself under two aliases. **USING** and **NATURAL JOIN** are shortcuts for joins on columns with the same name.',
      body: [
        'A CROSS JOIN is the set menu of a restaurant: 3 starters × 4 main courses = 12 possible meals. With 3 students and 4 courses, `student CROSS JOIN course` returns 12 rows, every possible enrolment: useful to build a timetable grid or to see which combinations are missing.',
        'A **self-join** compares rows of the same table, like laying two copies of the class photo side by side. Give the table two aliases and say how they relate: `enrolment a JOIN enrolment b ON b.course_id = a.course_id AND a.student_id < b.student_id` lists each pair of classmates once (the `<` stops a student being paired with themselves, and each pair appearing twice). The classic case is an employee table whose `manager_id` points to another employee.',
        '`JOIN department USING (dept_id)` joins on the column with that name in both tables and shows it once; in Oracle you then write it without a table prefix. **NATURAL JOIN** goes further: it joins on **every** column whose name matches, without saying which.',
      ],
      points: [
        'n rows × m rows: a CROSS JOIN grows fast; 1,000 × 1,000 is a million rows.',
        'Forgetting the join condition of an old-style join (`FROM a, b`) produces an accidental CROSS JOIN.',
        'Prefer `ON` (or `USING`) to NATURAL JOIN: the join condition is written where everyone can read it.',
      ],
      example: 'Every student with every course: `SELECT s.name, c.title FROM student s CROSS JOIN course c` (3 × 4 = 12 rows).',
      mistake: 'Relying on NATURAL JOIN in code that has to last. In the example, adding a harmless `name` column to `course` makes `course NATURAL JOIN department` match on `dept_id` **and** `name`, and it silently returns no rows.',
      sql: {
        setup: SCHOOL,
        query: `SELECT s.name, c.title
FROM student s
CROSS JOIN course c
ORDER BY s.name, c.title;
-- Self-join: pairs of classmates in the same course
SELECT a.course_id, a.student_id AS student_1, b.student_id AS student_2
FROM enrolment a
JOIN enrolment b ON b.course_id = a.course_id AND a.student_id < b.student_id
ORDER BY a.course_id;
SELECT dept_id, d.name AS department, c.title
FROM course c
JOIN department d USING (dept_id);
SELECT title, name FROM course NATURAL JOIN department;
-- A new column with a common name changes the NATURAL JOIN
ALTER TABLE course ADD (name VARCHAR2(30));
SELECT title, name FROM course NATURAL JOIN department;`,
      },
    },

    /* ───────────── Aggregation ───────────── */
    {
      id: 'aggregate-functions',
      hub: 'aggregation',
      topic: 'aggregation',
      title: 'Aggregate functions: COUNT, SUM, AVG, MIN and MAX',
      summary: 'An **aggregate function** turns many rows into one value: how many, the total, the average, the smallest, the largest. Without GROUP BY, all the rows (after the WHERE) form one group and the result is a single row.',
      body: [
        'Aggregates are the totals at the bottom of a supermarket receipt: many lines above, one number below. `SELECT COUNT(*), AVG(grade) FROM enrolment` returns one row, however many enrolments there are.',
        '`COUNT(*)` counts **rows**. `COUNT(email)` counts the rows where email is **not NULL**. `COUNT(DISTINCT course_id)` counts **different** values. On `student` the first gives 3 and the second 2, because Eva has no email.',
        '`SUM`, `AVG`, `MIN` and `MAX` also **ignore NULLs**. A missing grade is not a zero: `AVG(grade)` averages only the known grades. If missing grades must count as 0, say so: `AVG(NVL(grade, 0))`.',
      ],
      points: [
        'MIN and MAX also work on text (alphabetical order) and dates (earliest, latest); SUM and AVG need numbers.',
        'On an empty set COUNT returns 0, but SUM, AVG, MIN and MAX return NULL.',
        'An aggregate and a plain column cannot be mixed without GROUP BY: `SELECT name, COUNT(*) FROM student` fails with ORA-00937 (not a single-group group function).',
      ],
      example: '`SELECT COUNT(*) AS enrolments, ROUND(AVG(grade), 2) AS average, MAX(grade) AS best FROM enrolment` sums up the whole table in one row.',
      mistake: 'Using `COUNT(*)` to count values that may be missing. To know how many students have an email, count the column: `COUNT(email)`.',
      sql: {
        setup: SCHOOL,
        query: `SELECT COUNT(*) AS students, COUNT(email) AS with_email
FROM student;
SELECT COUNT(*) AS enrolments, COUNT(DISTINCT course_id) AS courses_taken,
       MIN(grade) AS lowest, MAX(grade) AS highest, ROUND(AVG(grade), 2) AS average
FROM enrolment;
-- A missing grade is ignored, not counted as zero
INSERT INTO enrolment VALUES ('S01', 'C11', NULL);
SELECT COUNT(*) AS enrolments, COUNT(grade) AS graded,
       ROUND(AVG(grade), 2) AS avg_known, ROUND(AVG(NVL(grade, 0)), 2) AS avg_as_zero
FROM enrolment;`,
      },
    },
    {
      id: 'group-by-having',
      hub: 'aggregation',
      topic: 'aggregation',
      title: 'GROUP BY and HAVING',
      summary: '**GROUP BY** splits the rows into groups that share a value and computes the aggregates once per group. **HAVING** filters the groups, as WHERE filters the rows.',
      body: [
        'GROUP BY is sorting the laundry into piles by colour and then counting each pile. `GROUP BY course_id` makes one pile per course; `COUNT(*)` and `AVG(grade)` are computed for each pile, and each pile gives one row of the result.',
        'The **logical order** of evaluation explains most errors: `FROM` (and the JOINs) → `WHERE` (rows) → `GROUP BY` → `HAVING` (groups) → `SELECT` → `ORDER BY`. That is why WHERE cannot use an aggregate (the groups do not exist yet) and ORDER BY can use an alias of the SELECT.',
        'The rule of the SELECT list: every column that is **not inside an aggregate** must appear in the **GROUP BY**. Each group returns one row, so a plain column must have a single value per group. `SELECT d.name, COUNT(*) … GROUP BY d.name` is fine; leaving `d.name` out of the GROUP BY fails with ORA-00979 (not a GROUP BY expression).',
      ],
      points: [
        'WHERE filters rows **before** grouping (`WHERE grade >= 6`: only those grades count); HAVING filters groups **after** it (`HAVING COUNT(*) >= 2`: only groups with two or more rows).',
        'You can group by several columns: one group per different combination of values.',
        'A condition without an aggregate belongs in WHERE: it is clearer and discards rows earlier.',
      ],
      example: '`SELECT course_id, ROUND(AVG(grade), 2) FROM enrolment GROUP BY course_id HAVING AVG(grade) >= 7` keeps the courses whose average is at least 7.',
      mistake: 'Writing `WHERE AVG(grade) > 7`, which fails with ORA-00934 (group function is not allowed here). Conditions on aggregates go in HAVING.',
      sql: {
        setup: SCHOOL,
        query: `SELECT course_id, COUNT(*) AS students, ROUND(AVG(grade), 2) AS average
FROM enrolment
GROUP BY course_id
ORDER BY course_id;
-- Per department: JOIN first, then group by a column of the joined table
SELECT d.name AS department, COUNT(*) AS courses, SUM(c.credits) AS credits
FROM course c
JOIN department d ON d.dept_id = c.dept_id
GROUP BY d.name;
-- WHERE (rows) and HAVING (groups) together
SELECT course_id, COUNT(*) AS grades_6_or_more
FROM enrolment
WHERE grade >= 6
GROUP BY course_id
HAVING COUNT(*) >= 2
ORDER BY course_id;`,
      },
    },

    /* ───────────── Subqueries and set operators ───────────── */
    {
      id: 'subqueries',
      hub: 'subqueries',
      topic: 'subqueries',
      title: 'Subqueries in WHERE, FROM and SELECT',
      summary: 'A **subquery** is a SELECT inside another statement, in parentheses. It answers a question the outer query needs first: "what is the average grade?", then "who is above it?".',
      body: [
        'A subquery is like asking a colleague for a figure before you can finish your own report: you cannot say who is above the average until someone has worked out the average. In `WHERE grade > (SELECT AVG(grade) FROM enrolment)` the inner query runs first and its result is used as a value.',
        'A **single-row** subquery returns one value, so it can go next to `=`, `<` or `>`. Where it goes changes its role: in **WHERE** it is a value to compare with; in **FROM** it is an **inline view**, a temporary table with an alias; in **SELECT** it is a **scalar subquery** that adds one value to each row.',
        'An inline view lets you query a result: compute the average per course, then join or filter it like any table. Give it an alias (`FROM (SELECT …) avg_c`), and remember that Oracle does not accept `AS` before a table alias.',
      ],
      points: [
        'If a single-row subquery returns several rows, Oracle fails with ORA-01427 (single-row subquery returns more than one row).',
        'If it returns no row, its value is NULL, and a comparison with NULL keeps nothing.',
        'A scalar subquery in SELECT must return at most one row and one column.',
      ],
      example: '`SELECT title FROM course WHERE credits = (SELECT MAX(credits) FROM course)` lists the courses with the most credits.',
      mistake: 'Writing `WHERE grade > AVG(grade)`. An aggregate cannot go in WHERE; compute it in a subquery: `WHERE grade > (SELECT AVG(grade) FROM enrolment)`.',
      sql: {
        setup: SCHOOL,
        query: `-- In WHERE: the grades above the overall average
SELECT student_id, course_id, grade
FROM enrolment
WHERE grade > (SELECT AVG(grade) FROM enrolment)
ORDER BY grade DESC;
-- In FROM (inline view): the average per course, then filtered and joined
SELECT c.title, avg_c.average
FROM (SELECT course_id, ROUND(AVG(grade), 2) AS average
      FROM enrolment
      GROUP BY course_id) avg_c
JOIN course c ON c.course_id = avg_c.course_id
WHERE avg_c.average >= 7;
-- In SELECT (scalar): each grade compared with the overall average
SELECT student_id, course_id, grade,
       grade - (SELECT AVG(grade) FROM enrolment) AS above_average
FROM enrolment;`,
      },
    },
    {
      id: 'multirow-subqueries',
      hub: 'subqueries',
      topic: 'subqueries',
      title: 'Multi-row subqueries: IN, ANY and ALL',
      summary: 'When a subquery returns **a list** of values, compare with **IN** (equal to one of them), **ANY** (true for at least one) or **ALL** (true for every one). `NOT IN` hides a trap: one NULL in the list and no row is returned.',
      body: [
        'A multi-row subquery is the guest list at the door of a party: `IN` asks "is your name on the list?". `WHERE student_id IN (SELECT student_id FROM enrolment WHERE course_id = \'C11\')` keeps the students enrolled in Python.',
        '`> ANY (…)` means "greater than at least one" (greater than the smallest); `> ALL (…)` means "greater than every one" (greater than the largest). `= ANY` is the same as IN, and `<> ALL` the same as NOT IN.',
        '**The NOT IN trap**: `x NOT IN (a, b, NULL)` means `x <> a AND x <> b AND x <> NULL`, and the last comparison is unknown, so no row passes. If the subquery can return NULLs, filter them out (`AND grade IS NOT NULL`) or use NOT EXISTS (next card).',
      ],
      points: [
        'A subquery after `=` that returns several rows fails (ORA-01427); use IN.',
        '`> ALL` with an empty list is true for every row; `> ANY` with an empty list is false.',
        'IN with a subquery often reads better than a join when you only need the columns of the outer table.',
      ],
      example: 'The students who take some course of less than 5 credits: `WHERE student_id IN (SELECT e.student_id FROM enrolment e JOIN course c ON c.course_id = e.course_id WHERE c.credits < 5)`.',
      mistake: 'Using NOT IN with a subquery that can return NULL. In the example, a single Python enrolment without a grade is enough for "the grades nobody got in Python" to return no rows at all.',
      sql: {
        setup: SCHOOL,
        query: `SELECT name
FROM student
WHERE student_id IN (SELECT student_id FROM enrolment WHERE course_id = 'C11');
-- Better than every grade of Databases (C10)
SELECT student_id, course_id, grade
FROM enrolment
WHERE grade > ALL (SELECT grade FROM enrolment WHERE course_id = 'C10');
-- Better than at least one grade of Databases
SELECT student_id, course_id, grade
FROM enrolment
WHERE course_id <> 'C10'
  AND grade > ANY (SELECT grade FROM enrolment WHERE course_id = 'C10');
-- The NOT IN trap: the grades nobody got in Python (C11)...
SELECT student_id, course_id, grade
FROM enrolment
WHERE grade NOT IN (SELECT grade FROM enrolment WHERE course_id = 'C11');
-- ...stop working as soon as one Python grade is NULL
INSERT INTO enrolment VALUES ('S01', 'C11', NULL);
SELECT student_id, course_id, grade
FROM enrolment
WHERE grade NOT IN (SELECT grade FROM enrolment WHERE course_id = 'C11');`,
      },
    },
    {
      id: 'correlated-subqueries',
      hub: 'subqueries',
      topic: 'subqueries',
      title: 'Correlated subqueries and EXISTS',
      summary: 'A **correlated** subquery uses a column of the outer query, so it is evaluated again for **each outer row**. **EXISTS** asks whether a subquery returns at least one row; **NOT EXISTS**, whether it returns none.',
      body: [
        'A correlated subquery is a tutor going down the class list and, for each student, opening that student\'s own file: the inner question changes with every row. In `WHERE e.grade > (SELECT AVG(x.grade) FROM enrolment x WHERE x.course_id = e.course_id)` the average is the one of **that row\'s course**: who beat the average of their own class.',
        '`EXISTS (subquery)` is true as soon as the subquery finds one row; what it selects does not matter, so people write `SELECT 1`. `NOT EXISTS` finds what has **no** related rows: courses with no enrolments, customers with no orders. Unlike NOT IN, it is not fooled by NULLs.',
        '**Top per group**: the best grade of each course is `WHERE e.grade = (SELECT MAX(x.grade) FROM enrolment x WHERE x.course_id = e.course_id)`. Ties return several rows, which is usually what you want.',
      ],
      points: [
        'Give the inner table its own alias (`x`), so it is clear which columns belong to the outer row (`e`).',
        'EXISTS can stop at the first match, and the optimizer often turns EXISTS and IN into joins anyway.',
        'NOT EXISTS is the safe way to write "has no …"; NOT IN breaks with NULLs.',
      ],
      example: 'The students not enrolled in Statistics: `SELECT name FROM student s WHERE NOT EXISTS (SELECT 1 FROM enrolment e WHERE e.student_id = s.student_id AND e.course_id = \'C20\')`.',
      mistake: 'Forgetting the correlation condition (`e.course_id = c.course_id`). The subquery then ignores the outer row, and EXISTS is true (or false) for every row at once.',
      sql: {
        setup: SCHOOL,
        query: `-- Who beat the average of their own course
SELECT e.student_id, e.course_id, e.grade
FROM enrolment e
WHERE e.grade > (SELECT AVG(x.grade) FROM enrolment x WHERE x.course_id = e.course_id)
ORDER BY e.course_id;
-- Courses with at least one enrolment, and courses with none
SELECT c.title FROM course c
WHERE EXISTS (SELECT 1 FROM enrolment e WHERE e.course_id = c.course_id);
SELECT c.title FROM course c
WHERE NOT EXISTS (SELECT 1 FROM enrolment e WHERE e.course_id = c.course_id);
-- Top per group: the best grade of each course
SELECT e.course_id, e.student_id, e.grade
FROM enrolment e
WHERE e.grade = (SELECT MAX(x.grade) FROM enrolment x WHERE x.course_id = e.course_id)
ORDER BY e.course_id;`,
      },
    },
    {
      id: 'set-operators',
      hub: 'subqueries',
      topic: 'subqueries',
      title: 'Set operators: UNION, INTERSECT and MINUS',
      summary: 'Set operators combine the **results** of two queries: **UNION** (rows in either), **INTERSECT** (rows in both) and **MINUS** (rows in the first but not in the second). **UNION ALL** keeps the duplicates.',
      body: [
        'Think of the guest lists of two people throwing a party together. UNION is everyone invited by either (each name once); UNION ALL staples the two lists together, repeated names included; INTERSECT is the guests both invited; MINUS is who the first invited and the second did not.',
        'The two queries must be **compatible**: the same number of columns, of compatible types, in the same order. The column names of the result come from the **first** query.',
        '`ORDER BY` goes once, at the **end**, and sorts the combined result, using the column names (or aliases) of the first query. UNION, INTERSECT and MINUS remove duplicates, which costs a sort; UNION ALL does not, so it is faster when duplicates are impossible or wanted.',
      ],
      points: [
        'Oracle calls the difference **MINUS**; the standard and other DBMSs call it EXCEPT (recent Oracle versions accept both, MINUS works in all of them).',
        'Set operators compare whole rows, and here two NULLs count as equal.',
        'To put columns of two tables side by side you need a JOIN; set operators stack rows.',
      ],
      example: 'The students of Databases or Statistics: `SELECT student_id FROM enrolment WHERE course_id = \'C10\' UNION SELECT student_id FROM enrolment WHERE course_id = \'C20\'`.',
      mistake: 'Writing an ORDER BY inside the first query of a UNION. Oracle fails with ORA-00933 (SQL command not properly ended): sort once, after the last query.',
      sql: {
        setup: SCHOOL,
        query: `-- Students of Databases (C10) and of Python (C11)
SELECT student_id FROM enrolment WHERE course_id = 'C10'
UNION
SELECT student_id FROM enrolment WHERE course_id = 'C11';
SELECT student_id FROM enrolment WHERE course_id = 'C10'
UNION ALL
SELECT student_id FROM enrolment WHERE course_id = 'C11';
SELECT student_id FROM enrolment WHERE course_id = 'C10'
INTERSECT
SELECT student_id FROM enrolment WHERE course_id = 'C11';
SELECT student_id FROM enrolment WHERE course_id = 'C10'
MINUS
SELECT student_id FROM enrolment WHERE course_id = 'C11';
-- One list of names from two tables, sorted once at the end
SELECT name, 'student' AS kind FROM student
UNION
SELECT name, 'department' FROM department
ORDER BY name;`,
      },
    },

    /* ───────────── Functions ───────────── */
    {
      id: 'text-functions',
      hub: 'functions',
      topic: 'functions',
      title: 'Text functions',
      summary: '**Single-row functions** transform one value per row. The **text** functions change case, cut, search, measure, trim, pad and replace strings; `||` glues them together.',
      body: [
        'Text functions are the "change case", "find and replace" and "trim" buttons of a word processor, applied to a whole column. `UPPER(name)`, `LOWER(email)` and `INITCAP(\'ana RUIZ\')` (Ana Ruiz) fix capitalisation; they are also the way to compare text ignoring case: `WHERE UPPER(name) = \'ANA RUIZ\'`.',
        '`SUBSTR(text, start, length)` cuts a piece (positions start at 1; a negative start counts from the end). `INSTR(text, \'@\')` returns the position of the first `@` (0 if there is none; optional arguments give the starting position and the occurrence). `LENGTH` counts the characters. Together they split an email into user and domain.',
        '`TRIM` removes leading and trailing spaces (`TRIM(LEADING \'0\' FROM code)` removes other characters; LTRIM and RTRIM work on one side). `LPAD(x, 4, \'0\')` and `RPAD` pad to a fixed width, as in `0010`. `REPLACE(text, \'old\', \'new\')` replaces every occurrence.',
      ],
      points: [
        'Functions can be nested; the innermost runs first: `UPPER(SUBSTR(name, 1, 1))`.',
        'In Oracle `LENGTH(\'\')` is NULL, not 0, because the empty string is NULL.',
        'A function on a column in the WHERE can stop an index from being used (see the Efficiency cards).',
      ],
      example: '`SUBSTR(email, INSTR(email, \'@\') + 1)` returns the domain of an email: `uni.es`.',
      mistake: 'Counting positions from 0. In Oracle the first character is position 1: `SUBSTR(\'Oracle\', 1, 3)` is `Ora`.',
      sql: {
        setup: SCHOOL,
        query: `SELECT name,
       UPPER(name) AS shouting,
       LOWER(name) AS quiet,
       LENGTH(name) AS letters,
       SUBSTR(name, 1, INSTR(name, ' ') - 1) AS first_name
FROM student;
-- Split an email into user and domain
SELECT email,
       INITCAP(SUBSTR(email, 1, INSTR(email, '@') - 1)) AS user_part,
       SUBSTR(email, INSTR(email, '@') + 1) AS domain,
       REPLACE(email, 'uni.es', 'cunef.edu') AS new_email
FROM student
WHERE email IS NOT NULL;
-- Pad and glue: a table of contents with dot leaders
SELECT LPAD(SUBSTR(course_id, 2), 4, '0') AS code,
       RPAD(title, 14, '.') || LPAD(credits, 4, '.') AS line
FROM course;
SELECT '[' || TRIM('   Databases   ') || ']' AS trimmed FROM dual;`,
      },
    },
    {
      id: 'number-date-functions',
      hub: 'functions',
      topic: 'functions',
      title: 'Number and date functions',
      summary: '**ROUND**, **TRUNC**, **MOD**, **CEIL** and **FLOOR** shape numbers. **SYSDATE**, date arithmetic, **ADD_MONTHS**, **MONTHS_BETWEEN** and **EXTRACT** work with dates.',
      body: [
        'Rounding is what a till does with the cents: `ROUND(7.456, 2)` is 7.46, while `TRUNC(7.456, 2)` just chops to 7.45. `CEIL` always goes up (`CEIL(11.25)` is 12: the weeks you need to fit 112.5 hours at 10 a week) and `FLOOR` always down. `MOD(17, 5)` is the remainder, 2: handy for "every third row" or "is it even?".',
        'In Oracle a `DATE` holds a date **and** a time, and `SYSDATE` is now. Dates work like a calendar you count on: `date + 7` is a week later and `date1 - date2` is the **number of days** between them. Months have different lengths, so use `ADD_MONTHS(date, n)` and `MONTHS_BETWEEN(later, earlier)` for them.',
        '`EXTRACT(YEAR FROM date)` (also MONTH and DAY) returns one part as a number. `TRUNC(date)` drops the time, and `TRUNC(date, \'MM\')` goes back to the first day of the month.',
      ],
      points: [
        '`ADD_MONTHS(DATE \'2026-01-31\', 1)` is 28 February: Oracle keeps you at the end of the month.',
        '`MONTHS_BETWEEN` returns a fraction; wrap it in TRUNC or ROUND for whole months.',
        'Date literals are written `DATE \'2026-09-14\'`, always year-month-day.',
      ],
      example: 'The days left until the end of the semester: `DATE \'2027-01-22\' - TRUNC(SYSDATE)`.',
      mistake: 'Adding 30 days to move "one month on". Months have 28 to 31 days: use `ADD_MONTHS`.',
      sql: {
        setup: SCHOOL,
        query: `SELECT ROUND(7.456, 2) AS round_2, TRUNC(7.456, 2) AS trunc_2, ROUND(7.5) AS round_0,
       CEIL(4.1) AS up, FLOOR(4.9) AS down, MOD(17, 5) AS remainder
FROM dual;
-- Whole weeks of study at 10 hours a week (1 ECTS credit = 25 hours)
SELECT title, credits * 25 AS hours, CEIL(credits * 25 / 10) AS weeks_at_10h
FROM course;
SELECT DATE '2026-09-14' + 7 AS one_week_later,
       DATE '2027-01-22' - DATE '2026-09-14' AS semester_days,
       ADD_MONTHS(DATE '2026-01-31', 1) AS end_of_february,
       TRUNC(MONTHS_BETWEEN(DATE '2027-06-30', DATE '2026-09-14')) AS whole_months,
       EXTRACT(YEAR FROM DATE '2026-09-14') AS year_part
FROM dual;
SELECT TRUNC(SYSDATE) AS today, TRUNC(SYSDATE, 'MM') AS first_of_month,
       EXTRACT(MONTH FROM SYSDATE) AS month_number
FROM dual;`,
      },
    },
    {
      id: 'conversion-functions',
      hub: 'functions',
      topic: 'functions',
      title: 'Conversion, NULL functions, CASE and DECODE',
      summary: '**TO_CHAR**, **TO_DATE** and **TO_NUMBER** convert between text, dates and numbers with a **format model**. **NVL**, **NVL2** and **COALESCE** replace NULLs, and **CASE** (or Oracle\'s **DECODE**) picks a value by conditions.',
      body: [
        'A format model is like telling a friend how to read a date: "09/10/2026" is 9 October in Spain and September 10 in the USA. `TO_DATE(\'15/09/2026\', \'DD/MM/YYYY\')` says how to **read** the text; `TO_CHAR(date, \'DD/MM/YYYY\')` says how to **write** the date. Common elements: `YYYY`, `MM`, `DD`, `HH24`, `MI`, `SS`, `Month`, `Day`; for numbers `9` (a digit), `0` (a digit shown even if it is zero), `.` and `FM` (no padding spaces).',
        '`NVL(x, y)` returns y when x is NULL. `NVL2(x, a, b)` returns a when x is **not** NULL and b when it is. `COALESCE(x, y, z, …)` returns the first value that is not NULL.',
        '`CASE` is the "if … then … else" of SQL. The **searched** form tests its conditions in order and returns the first one that is true: `CASE WHEN grade >= 9 THEN \'A\' WHEN grade >= 7 THEN \'B\' … ELSE \'F\' END`. `DECODE(x, v1, r1, v2, r2, default)` is Oracle\'s older shorthand for a CASE that only compares x for equality.',
      ],
      points: [
        'To compare dates use `TO_DATE` or a `DATE \'…\'` literal; never rely on an implicit text-to-date conversion.',
        'A CASE without ELSE that matches nothing returns NULL.',
        'Every branch of a CASE must return the same type.',
      ],
      example: '`CASE WHEN grade >= 5 THEN \'pass\' ELSE \'fail\' END` turns each grade into a result anyone understands.',
      mistake: 'Ordering the WHEN clauses badly. `WHEN grade >= 5 THEN \'pass\' WHEN grade >= 9 THEN \'distinction\'` never says distinction, because the first true branch wins: put the strictest condition first.',
      sql: {
        setup: SCHOOL,
        query: `SELECT TO_CHAR(TO_DATE('15/09/2026', 'DD/MM/YYYY'), 'YYYY-MM-DD') AS iso_date,
       TO_CHAR(DATE '2026-09-14', 'DD/MM/YYYY') AS spanish_date,
       TO_NUMBER('12.5') * 2 AS doubled,
       TO_CHAR(8.5, 'FM990.00') AS two_decimals
FROM dual;
SELECT name,
       NVL(email, 'no email') AS email,
       NVL2(email, 'yes', 'no') AS has_email,
       COALESCE(email, name, 'unknown') AS contact
FROM student;
SELECT student_id, course_id, grade,
       CASE
         WHEN grade >= 9 THEN 'A'
         WHEN grade >= 7 THEN 'B'
         WHEN grade >= 5 THEN 'C'
         ELSE 'F'
       END AS letter,
       DECODE(course_id, 'C10', 'Databases', 'C11', 'Python', 'other') AS course_name
FROM enrolment
ORDER BY grade DESC;`,
      },
    },

    /* ───────────── SQL languages ───────────── */
    {
      id: 'sql-languages',
      hub: 'languages',
      topic: 'languages',
      title: 'The sub-languages of SQL',
      summary: 'SQL is one language with several **sub-languages**, grouped by what a statement does: define the structure, work with the data, control who can do what, and group changes into transactions.',
      body: [
        'Every statement you write belongs to one group. The DBMS treats them differently: a DDL statement changes the **data dictionary** (the schema), a DML statement changes or reads **rows**, a DCL statement changes **permissions**, and TCL decides when a group of changes becomes permanent.',
        'Some books split SELECT out of DML as **DQL** (data query language), because it only reads. In this course SELECT is part of DML.',
      ],
      table: {
        caption: 'The four groups',
        head: ['Sub-language', 'Statements', 'What it acts on'],
        rows: [
          ['**DDL** · data definition', '`CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME`', 'The schema: tables, columns, constraints, indexes, views'],
          ['**DML** · data manipulation', '`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `MERGE`', 'The rows stored in the tables'],
          ['**DCL** · data control', '`GRANT`, `REVOKE`', 'Users, roles and their privileges'],
          ['**TCL** · transaction control', '`BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`', 'When changes become permanent or are undone'],
        ],
      },
      example: '`CREATE TABLE student (…)` is DDL; `INSERT INTO student VALUES (…)` is DML; `GRANT SELECT ON student TO teacher` is DCL; `COMMIT` is TCL.',
      mistake: 'Thinking `TRUNCATE` is the same as `DELETE` without WHERE. `TRUNCATE` is DDL: it empties the table at once, usually cannot be filtered, and in many DBMSs commits implicitly.',
    },
    {
      id: 'ddl',
      hub: 'languages',
      topic: 'languages',
      title: 'DDL: defining the schema',
      summary: '**CREATE** builds an object, **ALTER** changes it and **DROP** removes it, data included. DDL turns the logical model into real tables.',
      body: [
        'A `CREATE TABLE` lists the columns with their **types** and the **constraints** that every row must respect: primary key, foreign keys, NOT NULL, UNIQUE, CHECK. Writing them in the schema means the DBMS enforces them for every program that uses the data.',
        '`ALTER TABLE` adds or removes columns and constraints on a table that already has data. `DROP TABLE` deletes the definition and all its rows. Run the example, then query `USER_TABLES` after the DROP: the table is gone.',
        'In Oracle every DDL statement **commits** the open transaction before and after it, so a DDL cannot be rolled back.',
      ],
      points: [
        'Oracle types: `VARCHAR2(n)` for text, `NUMBER(p, s)` for every number, `DATE` (it also stores the time), `TIMESTAMP`, `CLOB`, `BLOB`. From 23ai there is also `BOOLEAN`.',
        'Auto-numbered keys use `GENERATED ALWAYS AS IDENTITY`; there is no AUTOINCREMENT.',
        'Each DDL statement updates the data dictionary, which you can query: `USER_TABLES`, `USER_TAB_COLUMNS`, `USER_INDEXES`, `USER_CONSTRAINTS`.',
      ],
      mistake: 'Dropping and re-creating a table to change one column. `ALTER TABLE` keeps the rows; `DROP` loses them.',
      sql: {
        setup: '',
        query: `CREATE TABLE course (
  course_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title     VARCHAR2(40) NOT NULL,
  credits   NUMBER(3,1) NOT NULL
);
ALTER TABLE course ADD (semester NUMBER(1));
INSERT INTO course (title, credits, semester) VALUES ('Databases', 6, 1);
SELECT * FROM course;
SELECT table_name FROM user_tables;
DROP TABLE course;
SELECT table_name FROM user_tables;`,
      },
    },
    {
      id: 'create-table',
      hub: 'languages',
      topic: 'languages',
      title: 'CREATE TABLE step by step',
      summary: 'A **CREATE TABLE** gives each column a name, a **type** and its **constraints**. A constraint can be written next to its column (**inline**) or after the last column (**out-of-line**), where it can cover several columns.',
      body: [
        'Creating a table is like designing a paper form before anyone fills it in: each box has a label (the column), a kind of answer (the type: text, number, date) and rules ("required", "one of these values", "must be an existing team"). Each filled-in form is a row.',
        'Types: `VARCHAR2(n)` for text of up to n characters, `NUMBER(p, s)` for numbers of p digits, s of them decimals (`NUMBER(5,2)` goes up to 999.99), `DATE` for dates and `CHAR(n)` for fixed-length codes. **Inline** constraints follow their column (`team_id NUMBER(4) PRIMARY KEY`); **out-of-line** ones come after the last column and are required for composite keys (`CONSTRAINT uq_team_shirt UNIQUE (team_id, shirt)`).',
        'Create the **parent** table first: a foreign key can only reference a table (and its primary key or a UNIQUE column) that already exists. Dropping goes the other way: children first.',
      ],
      points: [
        'Name your constraints (`CONSTRAINT fk_player_team …`): error messages and the data dictionary then show a readable name instead of something like `SYS_C008123`.',
        'A foreign key column has the same type as the key it references.',
        'In Oracle `DEFAULT` goes before `NOT NULL`: `pos CHAR(1) DEFAULT \'M\' NOT NULL`.',
      ],
      example: '`team` is the parent and `player` the child: every player belongs to an existing team, and a shirt number cannot be repeated within a team.',
      mistake: 'Creating the child table before its parent. Its FOREIGN KEY fails with ORA-00942 (table or view does not exist), because the referenced table is not there yet.',
      sql: {
        setup: '',
        expectError: true,
        query: `CREATE TABLE team (
  team_id NUMBER(4)    PRIMARY KEY,
  name    VARCHAR2(40) NOT NULL UNIQUE,
  city    VARCHAR2(30)
);
CREATE TABLE player (
  player_id NUMBER(6)    GENERATED ALWAYS AS IDENTITY,
  full_name VARCHAR2(60) NOT NULL,
  shirt     NUMBER(2)    CHECK (shirt BETWEEN 1 AND 99),
  pos       CHAR(1)      DEFAULT 'M' NOT NULL,
  born      DATE,
  team_id   NUMBER(4)    NOT NULL,
  CONSTRAINT pk_player PRIMARY KEY (player_id),
  CONSTRAINT fk_player_team FOREIGN KEY (team_id) REFERENCES team (team_id),
  CONSTRAINT uq_team_shirt UNIQUE (team_id, shirt),
  CONSTRAINT ck_player_pos CHECK (pos IN ('G', 'D', 'M', 'F'))
);
INSERT INTO team VALUES (1, 'Lions', 'Madrid');
INSERT INTO player (full_name, shirt, pos, born, team_id) VALUES ('Lucia Mora', 9, 'F', DATE '2004-03-12', 1);
INSERT INTO player (full_name, shirt, team_id) VALUES ('Pablo Ruiz', 4, 1);
SELECT * FROM player;
SELECT column_name FROM user_tab_columns WHERE table_name = 'PLAYER' ORDER BY column_id;
INSERT INTO player (full_name, shirt, team_id) VALUES ('Nobody', 7, 99);   -- team 99 does not exist`,
      },
    },
    {
      id: 'alter-drop',
      hub: 'languages',
      topic: 'languages',
      title: 'ALTER, DROP and TRUNCATE',
      summary: '**ALTER TABLE** changes a table that already holds data: it adds, modifies, renames or drops columns and constraints. **DROP TABLE** removes the table; **TRUNCATE** empties it and keeps its structure.',
      body: [
        'ALTER is renovating a house with people living in it: you can add a room (ADD), enlarge one (MODIFY), relabel a door (RENAME COLUMN) or knock a wall down (DROP COLUMN), and the furniture, the rows, stays. MODIFY must respect the data already there: you cannot make a column shorter than its longest value, or NOT NULL while some rows are NULL.',
        '`DROP TABLE` sends the table to Oracle\'s **recycle bin**, like the bin of your desktop: `FLASHBACK TABLE x TO BEFORE DROP` brings it back. `DROP TABLE x PURGE` skips the bin: gone for good. If other tables reference it, `CASCADE CONSTRAINTS` drops their foreign keys too.',
        '`TRUNCATE TABLE` empties a table at once. It is DDL, so it commits and **cannot be rolled back**; it fires no triggers and is very fast. `DELETE` without WHERE removes the same rows one by one, can be rolled back and fires triggers. Run the example: ROLLBACK undoes the DELETE, but not the TRUNCATE.',
      ],
      points: [
        '`ADD`, `RENAME COLUMN` and `DROP COLUMN` run in the browser simulation; `MODIFY`, `ADD CONSTRAINT` and the recycle bin only on FreeSQL (the static script below).',
        '`ALTER TABLE … ADD CONSTRAINT` checks the existing rows first: it fails if any of them breaks the rule.',
        'Every ALTER, DROP and TRUNCATE commits the open transaction.',
      ],
      example: '`ALTER TABLE member ADD (email VARCHAR2(60))` adds a column to a table that already has members: their email is NULL until someone fills it in.',
      dialect: 'Oracle · run it on FreeSQL',
      code: `DROP TABLE IF EXISTS member PURGE;
CREATE TABLE member (
  member_id NUMBER(4) PRIMARY KEY,
  full_name VARCHAR2(40) NOT NULL,
  email     VARCHAR2(60)
);
INSERT INTO member VALUES (1, 'Ana Ruiz', 'ana@uni.es');
INSERT INTO member VALUES (2, 'Luis Gil', 'luis@uni.es');
COMMIT;

ALTER TABLE member MODIFY (full_name VARCHAR2(80));         -- make the column longer
ALTER TABLE member MODIFY (email NOT NULL);                  -- works: every row has an email
ALTER TABLE member ADD CONSTRAINT uq_member_email UNIQUE (email);
ALTER TABLE member DROP CONSTRAINT uq_member_email;

DROP TABLE member;                                           -- to the recycle bin
SELECT object_name, original_name FROM user_recyclebin;
FLASHBACK TABLE member TO BEFORE DROP;                       -- back again, rows included
SELECT * FROM member;
DROP TABLE member PURGE;                                     -- gone for good`,
      mistake: 'Using TRUNCATE "to try something" on real data. It cannot be rolled back; when in doubt, DELETE and check before you COMMIT.',
      sql: {
        setup: '',
        query: `CREATE TABLE member (
  member_id NUMBER(4) PRIMARY KEY,
  full_name VARCHAR2(40) NOT NULL
);
INSERT INTO member VALUES (1, 'Ana Ruiz');
INSERT INTO member VALUES (2, 'Luis Gil');
ALTER TABLE member ADD (email VARCHAR2(60), fee NUMBER(5,2) DEFAULT 20 NOT NULL);
ALTER TABLE member RENAME COLUMN full_name TO member_name;
SELECT * FROM member;
ALTER TABLE member DROP COLUMN fee;
-- DELETE can be undone...
DELETE FROM member;
ROLLBACK;
SELECT COUNT(*) AS after_delete_and_rollback FROM member;
-- ...TRUNCATE cannot: it is DDL and commits
TRUNCATE TABLE member;
ROLLBACK;
SELECT COUNT(*) AS after_truncate_and_rollback FROM member;
DROP TABLE member PURGE;`,
      },
    },
    {
      id: 'dml',
      hub: 'languages',
      topic: 'languages',
      title: 'DML: reading and changing rows',
      summary: '**SELECT** reads, **INSERT** adds rows, **UPDATE** changes them and **DELETE** removes them. UPDATE and DELETE affect **every row** that matches the WHERE.',
      body: [
        'A SELECT is evaluated in a fixed logical order: `FROM` and `JOIN` build the rows, `WHERE` filters them, `GROUP BY` groups them, `HAVING` filters the groups, `SELECT` picks the columns and `ORDER BY` sorts the result.',
        'UPDATE and DELETE without a WHERE change the whole table. Before running one, write the same WHERE in a SELECT and check which rows it returns.',
        'In Oracle the changes of INSERT, UPDATE and DELETE stay **uncommitted** until you run `COMMIT`; other sessions do not see them yet.',
      ],
      points: [
        'Joins follow the foreign keys: `enrolment.course_id = course.course_id`.',
        'The runner shows how many rows each INSERT, UPDATE or DELETE changed.',
        'To keep only the first rows of a result use `FETCH FIRST n ROWS ONLY`; Oracle has no `LIMIT`.',
      ],
      example: 'The average grade per course is `SELECT course_id, AVG(grade) FROM enrolment GROUP BY course_id`.',
      mistake: 'Filtering an aggregate with WHERE (`WHERE AVG(grade) > 7`). WHERE runs before grouping; use `HAVING AVG(grade) > 7`.',
      sql: {
        setup: SCHOOL,
        query: `INSERT INTO enrolment VALUES ('S03', 'C20', 6.0);
UPDATE enrolment SET grade = grade + 0.5 WHERE course_id = 'C10' AND grade < 6;
DELETE FROM enrolment WHERE student_id = 'S02' AND course_id = 'C11';
SELECT s.name, c.title, e.grade
FROM enrolment e
JOIN student s ON s.student_id = e.student_id
JOIN course  c ON c.course_id  = e.course_id
ORDER BY s.name, c.title;
SELECT c.title, COUNT(*) AS students, ROUND(AVG(e.grade), 2) AS average
FROM enrolment e JOIN course c ON c.course_id = e.course_id
GROUP BY c.title
HAVING COUNT(*) >= 2;`,
      },
    },
    {
      id: 'insert-rows',
      hub: 'languages',
      topic: 'languages',
      title: 'INSERT in practice',
      summary: '**INSERT** adds rows. Name the columns you fill, let **DEFAULT** and **identity** columns fill themselves, add several rows in one statement, or copy the rows of a query with **INSERT … SELECT**.',
      body: [
        'Inserting is filling in the form designed with CREATE TABLE. Writing the **column list** is like writing each answer next to its label: `INSERT INTO student (student_id, name) VALUES (\'S04\', \'Marta Paz\')` keeps working if someone adds a column or changes the column order, and every column you leave out gets its DEFAULT, or NULL.',
        'Several rows at once: Oracle 23ai accepts `VALUES (…), (…), (…)` (older versions need one INSERT per row, or `INSERT ALL`). `INSERT INTO t (columns) SELECT …` copies the rows a query returns, with no VALUES at all: to fill an archive, a summary or a list of honours.',
        'An **identity** column (`GENERATED ALWAYS AS IDENTITY`) numbers the rows by itself: leave it out of the list. On FreeSQL you can also write the keyword `DEFAULT` as a value (`VALUES (\'S05\', DEFAULT)`); leaving the column out does the same and also works in the simulation.',
      ],
      points: [
        'Text and dates go in quotes, numbers without: `\'S04\'`, `DATE \'2026-09-14\'`, `6.5`.',
        'An INSERT that breaks a constraint is rejected whole: with several rows, none of them is inserted.',
        'The new rows are not permanent until COMMIT.',
      ],
      example: 'The honours list: `INSERT INTO honours (student_id, course_id) SELECT student_id, course_id FROM enrolment WHERE grade >= 8.5` copies the best results; the id and the date fill themselves.',
      mistake: 'Leaving out the column list: `INSERT INTO student VALUES (\'S04\', \'Marta Paz\')` fails with ORA-00947 (not enough values), and every INSERT written that way breaks when the table gains a column.',
      sql: {
        setup: SCHOOL,
        query: `INSERT INTO student (student_id, name) VALUES ('S04', 'Marta Paz');
SELECT * FROM student;
-- Several rows in one statement (Oracle 23ai)
INSERT INTO course (course_id, title, credits, dept_id) VALUES
  ('C40', 'Cloud computing', 6, 'D01'),
  ('C41', 'Ethics', 3, 'D02');
SELECT * FROM course;
-- INSERT ... SELECT: the identity column and the DEFAULT fill themselves
CREATE TABLE honours (
  honours_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id VARCHAR2(3) NOT NULL,
  course_id  VARCHAR2(3) NOT NULL,
  awarded    DATE DEFAULT SYSDATE NOT NULL
);
INSERT INTO honours (student_id, course_id)
SELECT student_id, course_id FROM enrolment WHERE grade >= 8.5;
SELECT * FROM honours;`,
      },
    },
    {
      id: 'update-delete',
      hub: 'languages',
      topic: 'languages',
      title: 'UPDATE and DELETE in practice',
      summary: '**UPDATE** changes columns of the rows that match its WHERE, with values that can be expressions or subqueries. **DELETE** removes the matching rows. Before running either one, run its WHERE as a SELECT.',
      body: [
        'An UPDATE is a teacher correcting a grade book: first find the right lines (WHERE), then write the new value (SET). The new value can use the old one (`SET grade = grade + 0.5`), change several columns at once (`SET a = …, b = …`) or come from a **subquery** (`SET credits = (SELECT credits FROM course WHERE course_id = \'C10\')`). The WHERE can use subqueries too: "every enrolment of a Computing course".',
        '**The habit that saves you**: write the WHERE as a SELECT first. `SELECT * FROM enrolment WHERE …` shows exactly the rows the UPDATE or DELETE will touch. When the list looks right, replace `SELECT *` with `UPDATE … SET …` or `DELETE`, and keep the WHERE as it is.',
        'DELETE removes whole rows, never single columns (to empty a column, UPDATE it to NULL). Foreign keys still apply: deleting a parent with children fails unless the foreign key says ON DELETE CASCADE.',
      ],
      points: [
        'The runner shows how many rows each statement changed: compare it with the rows the SELECT returned.',
        '`LEAST(grade + 0.5, 10)` raises a grade without passing the maximum; `GREATEST` does the opposite.',
        'Until COMMIT, ROLLBACK can still undo a wrong UPDATE or DELETE.',
      ],
      example: '`UPDATE course SET credits = credits * 1.5 WHERE dept_id = \'D02\'` multiplies the credits of every Maths course by 1.5.',
      mistake: 'Running an UPDATE or DELETE without WHERE, or with a WHERE you never tested. `UPDATE enrolment SET grade = 10` gives everybody a 10.',
      sql: {
        setup: SCHOOL,
        query: `-- 1. Run the WHERE as a SELECT: which rows will change?
SELECT * FROM enrolment
WHERE course_id IN (SELECT course_id FROM course WHERE dept_id = 'D01')
  AND grade < 7;
-- 2. The same WHERE in the UPDATE: +0.5, never above 10
UPDATE enrolment
SET grade = LEAST(grade + 0.5, 10)
WHERE course_id IN (SELECT course_id FROM course WHERE dept_id = 'D01')
  AND grade < 7;
-- A value taken from a subquery: Marketing gets as many credits as Databases
UPDATE course
SET credits = (SELECT credits FROM course WHERE course_id = 'C10')
WHERE course_id = 'C30';
-- DELETE with a subquery: the enrolments of every Maths course
DELETE FROM enrolment
WHERE course_id IN (SELECT course_id FROM course WHERE dept_id = 'D02');
SELECT * FROM enrolment ORDER BY student_id, course_id;
SELECT course_id, title, credits FROM course;
-- Not convinced? Undo it all
ROLLBACK;`,
      },
    },
    {
      id: 'dcl',
      hub: 'languages',
      topic: 'languages',
      title: 'DCL: users, roles and privileges',
      summary: '**GRANT** gives a privilege on an object to a user or role; **REVOKE** takes it away. Give each role only what it needs: the **least privilege** principle.',
      body: [
        'Privileges are actions on objects: `SELECT`, `INSERT`, `UPDATE`, `DELETE` on a table or view, `EXECUTE` on a function, `CREATE` in a schema. Grant them to **roles** (teacher, secretary, reporting app) rather than to each person, then make users members of roles.',
        'A **view** plus GRANT is a classic way to hide data: the reporting role can read a view with averages per course, but not the table with each student\'s grades.',
        'The browser sandbox has a single user, so this example is not runnable here. On FreeSQL you work in your own schema: try the GRANTs on your tables, but creating users needs an administrator account.',
      ],
      points: [
        '`WITH GRANT OPTION` lets the receiver grant the same privilege to others; use it sparingly.',
        'REVOKE removes the privilege from that role; members lose it unless another role still grants it.',
        'Oracle names objects as `schema.table`: `GRANT SELECT ON hr.enrolment TO teacher` refers to the table of the schema `hr`.',
      ],
      dialect: 'Oracle · not runnable here',
      code: `CREATE ROLE teacher;
CREATE ROLE reporting;
CREATE USER ana IDENTIFIED BY "change-me";
GRANT CREATE SESSION TO ana;
GRANT teacher TO ana;

GRANT SELECT, INSERT, UPDATE ON enrolment TO teacher;
GRANT SELECT ON student TO teacher;
GRANT SELECT ON course  TO teacher;

CREATE VIEW course_average AS
  SELECT course_id, AVG(grade) AS average FROM enrolment GROUP BY course_id;
GRANT SELECT ON course_average TO reporting;      -- no access to individual grades

REVOKE UPDATE ON enrolment FROM teacher;`,
      mistake: 'Letting the application connect as the database owner. A bug or an SQL injection can then drop tables; with a role limited to DML on its tables, it cannot.',
    },
    {
      id: 'tcl',
      hub: 'languages',
      topic: 'languages',
      title: 'TCL: transactions',
      summary: 'A **transaction** groups statements that must succeed or fail together. **COMMIT** makes them permanent, **ROLLBACK** undoes them, and a **SAVEPOINT** marks a point you can roll back to.',
      body: [
        'Transactions give the ACID properties of the Theory section: atomicity (all or nothing), consistency (constraints hold at commit), isolation (others do not see half-done work) and durability (a committed change survives a crash).',
        'In Oracle there is **no BEGIN**: a transaction opens by itself with your first INSERT, UPDATE or DELETE and lasts until `COMMIT` or `ROLLBACK`. (In Oracle, `BEGIN` starts a PL/SQL block.) A DDL statement commits implicitly, and so does a normal exit from the client.',
        'In the example, moving a student from one course to another is a delete plus an insert: both must happen, or neither.',
      ],
      points: [
        '`SAVEPOINT name` … `ROLLBACK TO SAVEPOINT name` undoes only the work after the savepoint.',
        'Keep transactions short: while one is open, it may hold locks that make others wait.',
        'Oracle readers never block writers (it keeps old versions of rows), and by default a query sees the data committed when the query started.',
      ],
      example: 'The second block changes a grade by mistake and rolls back to the savepoint: the move between courses is kept, the wrong grade is not.',
      mistake: 'Running DDL in the middle of a transaction and expecting to roll back. A DDL statement commits everything before it, so the earlier changes can no longer be undone.',
      sql: {
        setup: SCHOOL,
        query: `DELETE FROM enrolment WHERE student_id = 'S03' AND course_id = 'C11';
INSERT INTO enrolment VALUES ('S03', 'C20', NULL);
SAVEPOINT before_grades;
UPDATE enrolment SET grade = 10;              -- oops: every row
ROLLBACK TO SAVEPOINT before_grades;
COMMIT;
SELECT * FROM enrolment WHERE student_id = 'S03';
DELETE FROM enrolment;
SELECT COUNT(*) AS rows_inside_transaction FROM enrolment;
ROLLBACK;
SELECT COUNT(*) AS rows_after_rollback FROM enrolment;`,
      },
    },

    /* ───────────── Constraints ───────────── */
    {
      id: 'keys-unique',
      hub: 'constraints',
      topic: 'constraints',
      title: 'PRIMARY KEY, UNIQUE and NOT NULL',
      summary: 'The **primary key** identifies each row: unique and never NULL. **UNIQUE** forbids duplicates in other candidate keys, and **NOT NULL** makes a column mandatory.',
      body: [
        'These are the keys of the logical model written into the schema. The DBMS checks them on every INSERT and UPDATE and rejects the statement that would break them, whatever program sends it.',
        'A table has one primary key, but it can have several UNIQUE constraints: the student id is the key, and the e-mail is also unique. In standard SQL, UNIQUE allows several NULLs, because NULL is not equal to anything, so it does not count as a duplicate.',
        'The DBMS builds an index for each primary key and UNIQUE constraint, because it needs one to check duplicates quickly.',
      ],
      points: [
        'Composite key: `PRIMARY KEY (student_id, course_id)`.',
        'The last statement of the example fails on purpose: read the error message.',
      ],
      mistake: 'Using only a surrogate id and forgetting the natural key. With `id` as PK and no `UNIQUE (email)`, the same student can be inserted twice.',
      sql: {
        setup: SCHOOL,
        expectError: true,
        query: `INSERT INTO student VALUES ('S04', 'Marta Paz', NULL);   -- a second NULL e-mail is allowed
SELECT * FROM student;
INSERT INTO student VALUES ('S05', 'Ana Ruiz', 'ana@uni.es');  -- duplicate e-mail`,
      },
    },
    {
      id: 'foreign-keys',
      hub: 'constraints',
      topic: 'constraints',
      title: 'FOREIGN KEY and referential actions',
      summary: 'A **foreign key** only accepts values that exist in the referenced key. Its **referential action** says what happens to child rows when the parent row is deleted or its key changes.',
      body: [
        'The foreign key keeps references valid (**referential integrity**): an enrolment cannot point to a course that does not exist.',
        'When the parent row is deleted, the action decides. In Oracle you choose between `ON DELETE CASCADE` (the children are deleted too), `ON DELETE SET NULL` (the FK of the children becomes NULL) and writing nothing, which rejects the delete while children exist (error ORA-02292).',
        'Oracle has no `ON UPDATE` action and no `RESTRICT` or `SET DEFAULT` keywords: other DBMSs (PostgreSQL, MySQL) do. Primary keys should not change anyway.',
        'In the sample schema, deleting a student cascades to their enrolments, but a course with enrolments cannot be deleted.',
      ],
      points: [
        'CASCADE fits parts that make no sense alone (an enrolment without its student, an order line without its order).',
        'No action (the default) protects reference data (a course, a department).',
        'Inserting a child with a missing parent fails with ORA-02291 (parent key not found); deleting a parent with children fails with ORA-02292 (child record found).',
      ],
      mistake: 'Using CASCADE everywhere. Deleting one department could then silently delete its courses and all their enrolments.',
      sql: {
        setup: SCHOOL,
        expectError: true,
        query: `DELETE FROM student WHERE student_id = 'S01';     -- CASCADE: Ana's enrolments go too
SELECT * FROM enrolment ORDER BY student_id;
DELETE FROM course WHERE course_id = 'C10';       -- C10 still has enrolments: rejected`,
      },
    },
    {
      id: 'check-default',
      hub: 'constraints',
      topic: 'constraints',
      title: 'CHECK and DEFAULT',
      summary: '**CHECK** states a condition each row must meet, such as a grade between 0 and 10. **DEFAULT** gives a column its value when the INSERT does not say one.',
      body: [
        'CHECK constraints write business rules in the schema: `credits > 0`, `end_date >= start_date`, `status IN (\'open\', \'closed\')`. A CHECK can use several columns of the same row, but not other rows or other tables (that needs a trigger or a foreign key).',
        'DEFAULT fills mandatory columns sensibly: the current date, a status of \'pending\', a counter starting at 0. In Oracle, DEFAULT goes **before** NOT NULL (`days NUMBER(2) DEFAULT 15 NOT NULL`).',
        'Give constraints a name (`CONSTRAINT grade_range CHECK (…)`): error messages then say which rule was broken.',
      ],
      points: [
        'A CHECK passes when the condition is true **or unknown** (NULL); add NOT NULL if the value is required.',
      ],
      mistake: 'Checking ranges only in the application. Data loaded with a script or another program then skips the rule.',
      sql: {
        setup: '',
        expectError: true,
        query: `CREATE TABLE loan (
  loan_id   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book      VARCHAR2(60) NOT NULL,
  loan_date DATE DEFAULT SYSDATE NOT NULL,
  days      NUMBER(2) DEFAULT 15 NOT NULL,
  status    VARCHAR2(10) DEFAULT 'open' NOT NULL,
  CONSTRAINT days_range CHECK (days BETWEEN 1 AND 60),
  CONSTRAINT status_values CHECK (status IN ('open', 'returned', 'lost'))
);
INSERT INTO loan (book) VALUES ('Don Quixote');
INSERT INTO loan (book, days, status) VALUES ('Ficciones', 30, 'returned');
SELECT * FROM loan;
INSERT INTO loan (book, days) VALUES ('Hopscotch', 90);       -- breaks days_range`,
      },
    },

    /* ───────────── Views and schema objects ───────────── */
    {
      id: 'views',
      hub: 'objects',
      topic: 'objects',
      title: 'Views',
      summary: 'A **view** is a stored query with a name. You query it like a table, but it stores **the query, not the rows**: every time you read it, the query runs again on the current data.',
      body: [
        'A view is a **window** onto the tables: it frames one part of the house, and when something moves inside you see it through the window at once. Nothing is copied. In the example a grade changes in `enrolment`, and the view shows the new value without being touched.',
        'Views simplify (a three-table join becomes `SELECT * FROM student_grades`), give a stable name to a calculation, and protect data: grant SELECT on a view of averages per course, not on the table with every grade. `CREATE OR REPLACE VIEW` changes the definition without dropping the view, so its grants are kept.',
        'A **simple** view (one table, no GROUP BY, DISTINCT or aggregates) is usually **updatable**: an INSERT or UPDATE on the view changes the base table. `WITH CHECK OPTION` rejects changes through the view that the view itself could not see; `WITH READ ONLY` forbids any change through it. Both only run on FreeSQL: see the static script.',
      ],
      points: [
        'A view with a join, GROUP BY or DISTINCT is normally not updatable directly.',
        '`DROP VIEW name` removes the view; its tables and rows are untouched.',
        'A **materialized view** does store rows and is refreshed from time to time: a photograph of the room, not a window.',
      ],
      example: '`CREATE OR REPLACE VIEW course_average AS SELECT course_id, ROUND(AVG(grade), 2) AS average FROM enrolment GROUP BY course_id` gives everybody the averages without showing a single grade.',
      dialect: 'Oracle · run it on FreeSQL',
      code: `DROP TABLE IF EXISTS product PURGE;
CREATE TABLE product (
  product_id NUMBER(4) PRIMARY KEY,
  name       VARCHAR2(40) NOT NULL,
  price      NUMBER(6,2) NOT NULL,
  on_sale    CHAR(1) DEFAULT 'N' NOT NULL
);
INSERT INTO product VALUES (1, 'Notebook', 3.50, 'Y');
INSERT INTO product VALUES (2, 'Pen', 1.20, 'N');
COMMIT;

-- An updatable view that only lets you work on the products on sale
CREATE OR REPLACE VIEW sale_items AS
  SELECT product_id, name, price, on_sale FROM product WHERE on_sale = 'Y'
  WITH CHECK OPTION;
UPDATE sale_items SET price = 3.00 WHERE product_id = 1;    -- changes the table
INSERT INTO sale_items VALUES (3, 'Ruler', 2.10, 'Y');       -- visible through the view: accepted
INSERT INTO sale_items VALUES (4, 'Glue', 1.80, 'N');        -- ORA-01402: view WITH CHECK OPTION where-clause violation
SELECT * FROM product;

-- A view nobody can write through
CREATE OR REPLACE VIEW price_list AS
  SELECT name, price FROM product
  WITH READ ONLY;
UPDATE price_list SET price = 0;                             -- ORA-42399: cannot perform a DML operation on a read-only view`,
      mistake: 'Thinking a view is a copy that must be refreshed. A normal view always shows the current data, and it is exactly as fast as the query inside it.',
      sql: {
        setup: SCHOOL,
        query: `CREATE OR REPLACE VIEW student_grades AS
SELECT s.name, c.title, e.grade
FROM enrolment e
JOIN student s ON s.student_id = e.student_id
JOIN course  c ON c.course_id  = e.course_id;
SELECT * FROM student_grades WHERE grade >= 7 ORDER BY grade DESC;
-- The view stores the query, not the rows: change a grade in the table...
UPDATE enrolment SET grade = 9.5 WHERE student_id = 'S03' AND course_id = 'C10';
-- ...and the view shows it at once
SELECT * FROM student_grades WHERE name = 'Eva Sanz';
CREATE OR REPLACE VIEW course_average AS
SELECT course_id, COUNT(*) AS students, ROUND(AVG(grade), 2) AS average
FROM enrolment
GROUP BY course_id;
SELECT * FROM course_average;`,
      },
    },
    {
      id: 'ctes',
      hub: 'objects',
      topic: 'objects',
      title: 'WITH: common table expressions',
      summary: 'The **WITH** clause gives a name to a subquery at the start of a statement, a **common table expression** (CTE), and the main query uses it like a table. Several CTEs can be chained, each one using the ones before it.',
      body: [
        'A CTE is a recipe that lists its preparations first: "1. make the sauce; 2. cook the pasta; 3. mix them". Each step has a name and the last step uses them. A nested subquery is the same recipe written inside-out, like a sentence full of brackets.',
        '`WITH course_avg AS (SELECT course_id, AVG(grade) AS average FROM enrolment GROUP BY course_id) SELECT …` defines `course_avg` once; the main query can join it, filter it or use it twice. Several CTEs are separated by commas: `WITH a AS (…), b AS (… FROM a …) SELECT … FROM b`.',
        'A CTE only exists during its statement; it is not stored like a view. Use a CTE to make one long query readable, and a view when many queries need the same definition.',
      ],
      points: [
        'One WITH per statement, at the start; the CTEs are separated by commas and the main SELECT comes last.',
        'A CTE can be used several times in the main query, instead of repeating the same subquery.',
        'A CTE that refers to itself (a recursive CTE) walks hierarchies such as an organisation chart.',
      ],
      example: 'The students whose average is above the class average: one CTE with the average of each student, another with the overall average, and a final SELECT that compares them.',
      mistake: 'Writing a semicolon or a second WITH between the CTEs. They are one statement: `WITH a AS (…), b AS (…) SELECT …`.',
      sql: {
        setup: SCHOOL,
        query: `WITH course_avg AS (
  SELECT course_id, ROUND(AVG(grade), 2) AS average
  FROM enrolment
  GROUP BY course_id
)
SELECT c.title, ca.average
FROM course_avg ca
JOIN course c ON c.course_id = ca.course_id
ORDER BY ca.average DESC;
-- Chained CTEs: each step uses the previous one
WITH per_student AS (
  SELECT student_id, AVG(grade) AS average
  FROM enrolment
  GROUP BY student_id
),
overall AS (
  SELECT AVG(average) AS class_average FROM per_student
)
SELECT s.name, ROUND(p.average, 2) AS average, ROUND(o.class_average, 2) AS class_average
FROM per_student p
JOIN student s ON s.student_id = p.student_id
CROSS JOIN overall o
WHERE p.average > o.class_average;`,
      },
    },
    {
      id: 'sequences-synonyms',
      hub: 'objects',
      topic: 'objects',
      title: 'Sequences and synonyms',
      summary: 'A **sequence** hands out unique numbers, one after another, to any session that asks. A **synonym** is another name for an object, often for a table of another schema.',
      body: [
        'A sequence is the ticket dispenser at the deli counter: each customer pulls the next number, two customers never get the same one, and a ticket pulled and not used is simply lost. `seq.NEXTVAL` pulls a new number; `seq.CURRVAL` repeats the last number **your session** pulled.',
        'Since Oracle 12c an **identity** column (`GENERATED ALWAYS AS IDENTITY`) does the same job for one table, more simply: Oracle creates and uses a hidden sequence for you. Use an explicit sequence when several tables share one numbering, or when you need the number before the INSERT.',
        'A synonym is a **nickname**: `CREATE SYNONYM grades FOR hr.enrolment` lets you write `grades` instead of the full name. A PUBLIC synonym is visible to every user. A synonym grants nothing: you still need the SELECT privilege on the table.',
      ],
      points: [
        'Sequences can leave **gaps** (rollbacks, cached numbers lost when the database restarts): never use them to count rows.',
        '`CACHE 20` keeps numbers in memory for speed; `NOCYCLE` (the default) stops at MAXVALUE instead of starting again.',
        'The browser simulation cannot run sequences or synonyms: run the script on FreeSQL.',
      ],
      table: {
        caption: 'Sequence or identity column?',
        head: ['', 'Sequence', 'Identity column'],
        rows: [
          ['Belongs to', 'The schema: any table can use it', 'One column of one table'],
          ['How to use it', '`seq.NEXTVAL` in the INSERT, or as the column DEFAULT', 'Leave the column out of the INSERT'],
          ['Shared numbering', 'Yes', 'No'],
          ['Gaps', 'Possible', 'Possible (it uses a sequence inside)'],
        ],
      },
      dialect: 'Oracle · run it on FreeSQL',
      code: `DROP TABLE IF EXISTS ticket PURGE;
DROP SEQUENCE IF EXISTS ticket_seq;
CREATE SEQUENCE ticket_seq START WITH 100 INCREMENT BY 1 NOCACHE;
CREATE TABLE ticket (
  ticket_no NUMBER DEFAULT ticket_seq.NEXTVAL PRIMARY KEY,
  customer  VARCHAR2(30) NOT NULL
);
INSERT INTO ticket (customer) VALUES ('Ana');                                    -- 100, from the DEFAULT
INSERT INTO ticket (ticket_no, customer) VALUES (ticket_seq.NEXTVAL, 'Luis');     -- 101
SELECT ticket_seq.CURRVAL AS last_ticket FROM dual;                              -- 101 again, in this session
SELECT * FROM ticket;

-- A synonym: a nickname for the table
CREATE OR REPLACE SYNONYM queue FOR ticket;
SELECT * FROM queue;
DROP SYNONYM queue;`,
      mistake: 'Expecting a sequence without gaps, such as invoice numbers 1, 2, 3… with none missing. A rolled-back INSERT still used its number; if the law requires consecutive numbers, generate them another way.',
    },

    /* ───────────── PL/SQL ───────────── */
    {
      id: 'plsql-blocks',
      hub: 'plsql',
      topic: 'plsql',
      title: 'PL/SQL blocks, variables and SELECT INTO',
      summary: '**PL/SQL** is Oracle\'s procedural language: SQL plus variables, conditions, loops and error handling. Code is written in **blocks**: an optional DECLARE section, a BEGIN … END body and an optional EXCEPTION section.',
      body: [
        'SQL says **what** you want; PL/SQL says **how**, step by step, like a recipe card: the ingredients (**DECLARE**: variables and constants), the steps (**BEGIN**) and what to do if something goes wrong (**EXCEPTION**). The block ends with `END;`, and in a script a `/` alone on the next line tells the tool to run it.',
        'Each variable has a type: `v_total NUMBER := 0;`. `CONSTANT` fixes a value (`c_pass CONSTANT NUMBER := 5;`). **%TYPE** copies the type of a column (`v_grade enrolment.grade%TYPE`) and **%ROWTYPE** the structure of a whole row (`r_student student%ROWTYPE`): if the column changes, the code follows it.',
        '`SELECT … INTO` puts the result of a query that returns **exactly one row** into variables. `DBMS_OUTPUT.PUT_LINE` prints a line: FreeSQL shows it under the script (in SQL*Plus or SQL Developer, run `SET SERVEROUTPUT ON` first).',
      ],
      points: [
        '`:=` assigns and `=` compares; every statement ends with `;`.',
        'Prefix the names (`v_` variable, `c_` constant, `r_` record) so they never clash with column names.',
        'If SELECT INTO finds no row it raises NO_DATA_FOUND; if it finds several, TOO_MANY_ROWS (see the exceptions card).',
      ],
      example: 'The block of the example reads one student and their average into variables and prints a sentence about them, which a single SELECT cannot do.',
      dialect: 'Oracle PL/SQL · run it on FreeSQL',
      code: `DROP TABLE IF EXISTS enrolment CASCADE CONSTRAINTS PURGE;
DROP TABLE IF EXISTS student CASCADE CONSTRAINTS PURGE;
CREATE TABLE student (
  student_id VARCHAR2(3) PRIMARY KEY,
  name       VARCHAR2(40) NOT NULL
);
CREATE TABLE enrolment (
  student_id VARCHAR2(3) REFERENCES student (student_id),
  course_id  VARCHAR2(3),
  grade      NUMBER(4,2),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO student VALUES ('S01', 'Ana Ruiz');
INSERT INTO enrolment VALUES ('S01', 'C10', 8.5);
INSERT INTO enrolment VALUES ('S01', 'C20', 7.0);
COMMIT;

DECLARE
  c_pass    CONSTANT NUMBER := 5;
  r_student student%ROWTYPE;              -- a whole row of student
  v_average enrolment.grade%TYPE;         -- the type of the grade column
  v_courses PLS_INTEGER;
BEGIN
  SELECT * INTO r_student FROM student WHERE student_id = 'S01';
  SELECT AVG(grade), COUNT(*) INTO v_average, v_courses
  FROM enrolment
  WHERE student_id = r_student.student_id;

  DBMS_OUTPUT.PUT_LINE(r_student.name || ' takes ' || v_courses || ' courses.');
  DBMS_OUTPUT.PUT_LINE('Average: ' || TO_CHAR(v_average, 'FM90.00'));
  IF v_average >= c_pass THEN
    DBMS_OUTPUT.PUT_LINE('On track to pass.');
  END IF;
END;
/`,
      mistake: 'Giving a variable the name of a column (`name`). In `WHERE name = name` both sides mean the column, so the condition is true for every row. Call it `v_name`.',
    },
    {
      id: 'plsql-control',
      hub: 'plsql',
      topic: 'plsql',
      title: 'Control flow: IF, CASE and loops',
      summary: 'PL/SQL decides with **IF … ELSIF … ELSE** and **CASE**, and repeats with three loops: the basic **LOOP** with **EXIT WHEN**, **WHILE**, and the numeric **FOR**.',
      body: [
        'IF is a fork in the road: the first condition that is true chooses the path, and ELSE takes the rest. Mind the spelling **ELSIF** (one word, no second E) and the closing `END IF;`. A CASE statement chooses among many paths, by a value or by conditions, and ends with `END CASE;`.',
        'Loops are laps of a running track. `LOOP … EXIT WHEN condition; … END LOOP;` runs until you decide to stop; `WHILE condition LOOP` checks before every lap; `FOR i IN 1 .. 10 LOOP` counts the laps for you (the counter `i` is declared automatically and cannot be assigned; `REVERSE` counts down).',
        'A condition that is NULL counts as false in IF and WHILE, as in WHERE: `IF v_grade >= 5` with a NULL grade goes to the ELSE.',
      ],
      points: [
        'Every loop needs a way out: a basic LOOP without EXIT runs forever.',
        '`CONTINUE WHEN condition;` skips to the next lap.',
        'In real programs the loop usually walks through rows: that is what cursors are for (next card).',
      ],
      example: 'Grading a mark: `IF v_grade >= 9 THEN … ELSIF v_grade >= 7 THEN … ELSIF v_grade >= 5 THEN … ELSE … END IF;`.',
      dialect: 'Oracle PL/SQL · run it on FreeSQL',
      code: `DECLARE
  v_grade   NUMBER := 7.5;
  v_label   VARCHAR2(20);
  v_balance NUMBER := 1000;
  v_years   PLS_INTEGER := 0;
BEGIN
  -- IF / ELSIF / ELSE: the first true branch wins
  IF v_grade >= 9 THEN
    v_label := 'Outstanding';
  ELSIF v_grade >= 7 THEN
    v_label := 'Good';
  ELSIF v_grade >= 5 THEN
    v_label := 'Pass';
  ELSE
    v_label := 'Fail';
  END IF;
  DBMS_OUTPUT.PUT_LINE(v_grade || ' is ' || v_label);

  -- CASE statement on a value
  CASE v_label
    WHEN 'Fail' THEN DBMS_OUTPUT.PUT_LINE('See you at the resit.');
    WHEN 'Pass' THEN DBMS_OUTPUT.PUT_LINE('Just made it.');
    ELSE DBMS_OUTPUT.PUT_LINE('Well done!');
  END CASE;

  -- FOR: a counted loop
  FOR i IN 1 .. 5 LOOP
    DBMS_OUTPUT.PUT_LINE('7 x ' || i || ' = ' || 7 * i);
  END LOOP;

  -- WHILE: years until 1,000 euros at 5% a year reach 1,500
  WHILE v_balance < 1500 LOOP
    v_balance := v_balance * 1.05;
    v_years := v_years + 1;
  END LOOP;
  DBMS_OUTPUT.PUT_LINE(v_years || ' years: ' || ROUND(v_balance, 2) || ' euros');

  -- LOOP ... EXIT WHEN: a countdown
  LOOP
    DBMS_OUTPUT.PUT_LINE('Countdown: ' || v_years);
    v_years := v_years - 3;
    EXIT WHEN v_years <= 0;
  END LOOP;
END;
/`,
      mistake: 'Writing `ELSE IF` or `ELSEIF`. PL/SQL wants `ELSIF`; `ELSE IF` opens a new IF that needs its own `END IF;`.',
    },
    {
      id: 'cursors',
      hub: 'plsql',
      topic: 'plsql',
      title: 'Cursors: walking through the rows one by one',
      summary: 'A **cursor** points at the rows of a query so PL/SQL can process them **one at a time**. Oracle opens an **implicit** cursor for every SQL statement; you declare an **explicit** cursor when you need to visit the rows of a SELECT one by one.',
      body: [
        'A cursor is your finger running down a printed class list: you place it on the first line, read it, do something (tick the name, correct the grade), move down to the next line, and stop at the end. The list is the result of the SELECT, the finger is the cursor, and the line under it is the current row.',
        'An explicit cursor has a fixed **lifecycle**: **DECLARE** it with its query; **OPEN** it (the query runs and the finger is placed before the first row); **FETCH** one row after another into variables inside a loop, with **EXIT WHEN cursor%NOTFOUND** at the end of the list; and **CLOSE** it to free its memory. The **cursor FOR loop** (`FOR r IN c LOOP … END LOOP;`) does the opening, fetching, exit test and closing for you.',
        '**The real-world story**: a teacher curves the grades with a different rule per course. In Databases (C10) a grade below 5 gets +1 point and one below 7 gets +0.5; in Statistics (C20), much harder this year, everyone gets +1; other courses stay as they are; and no grade passes 10. The cursor is declared `FOR UPDATE` (it locks those rows), and each change is written with `UPDATE … WHERE CURRENT OF`, "the row under my finger".',
      ],
      points: [
        'After any INSERT, UPDATE or DELETE, the implicit cursor tells you how many rows changed (`SQL%ROWCOUNT`) and whether any did (`SQL%FOUND`).',
        '`FOR UPDATE` locks the rows until COMMIT or ROLLBACK, so nobody changes them halfway through; commit after closing the cursor, not inside the loop.',
        'In a cursor FOR loop the record `r` is declared for you, and the cursor is always closed, even after an error.',
      ],
      table: {
        caption: 'Cursor attributes',
        head: ['Attribute', 'Means', 'Typical use'],
        rows: [
          ['`c%ISOPEN`', 'The cursor is open', '`IF NOT c%ISOPEN THEN OPEN c; END IF;`'],
          ['`c%FOUND`', 'The last FETCH returned a row', 'Process the row'],
          ['`c%NOTFOUND`', 'The last FETCH found nothing: the end of the list', '`EXIT WHEN c%NOTFOUND;`'],
          ['`c%ROWCOUNT`', 'Rows fetched so far', 'Number the lines of a report'],
          ['`SQL%ROWCOUNT`', 'Rows changed by the last SQL statement (implicit cursor)', '`DBMS_OUTPUT.PUT_LINE(SQL%ROWCOUNT || \' rows\')`'],
        ],
      },
      example: 'S01\'s 4 in Databases becomes 5, S02\'s 6.5 becomes 7 and the 8.5 stays; in Statistics everyone gains a point, but the 9.5 stops at 10.',
      dialect: 'Oracle PL/SQL · run it on FreeSQL',
      code: `DROP TABLE IF EXISTS enrolment CASCADE CONSTRAINTS PURGE;
CREATE TABLE enrolment (
  student_id VARCHAR2(3),
  course_id  VARCHAR2(3),
  grade      NUMBER(4,2) CHECK (grade BETWEEN 0 AND 10),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO enrolment VALUES ('S01', 'C10', 4.0);
INSERT INTO enrolment VALUES ('S02', 'C10', 6.5);
INSERT INTO enrolment VALUES ('S03', 'C10', 8.5);
INSERT INTO enrolment VALUES ('S03', 'C11', 7.5);
INSERT INTO enrolment VALUES ('S01', 'C20', 9.5);
INSERT INTO enrolment VALUES ('S02', 'C20', 3.0);
COMMIT;

-- 1. Explicit cursor: DECLARE -> OPEN -> FETCH in a loop -> CLOSE
DECLARE
  CURSOR c_grades IS
    SELECT student_id, course_id, grade
    FROM enrolment
    ORDER BY course_id, student_id
    FOR UPDATE OF grade;
  r     c_grades%ROWTYPE;
  v_new enrolment.grade%TYPE;
BEGIN
  OPEN c_grades;
  LOOP
    FETCH c_grades INTO r;
    EXIT WHEN c_grades%NOTFOUND;              -- the finger reached the end of the list
    v_new := CASE
               WHEN r.course_id = 'C10' AND r.grade < 5 THEN r.grade + 1
               WHEN r.course_id = 'C10' AND r.grade < 7 THEN r.grade + 0.5
               WHEN r.course_id = 'C20'                 THEN r.grade + 1
               ELSE r.grade
             END;
    v_new := LEAST(v_new, 10);                -- never above 10
    IF v_new <> r.grade THEN
      UPDATE enrolment SET grade = v_new WHERE CURRENT OF c_grades;
      DBMS_OUTPUT.PUT_LINE(c_grades%ROWCOUNT || '. ' || r.student_id || ' ' || r.course_id || ': ' || r.grade || ' -> ' || v_new);
    END IF;
  END LOOP;
  DBMS_OUTPUT.PUT_LINE(c_grades%ROWCOUNT || ' rows read');
  CLOSE c_grades;
  COMMIT;
END;
/

-- 2. The cursor FOR loop: OPEN, FETCH, EXIT and CLOSE are automatic
DECLARE
  CURSOR c_list IS
    SELECT student_id, course_id, grade FROM enrolment ORDER BY course_id, student_id;
BEGIN
  FOR r IN c_list LOOP
    DBMS_OUTPUT.PUT_LINE(r.course_id || ' ' || r.student_id || ': ' || r.grade);
  END LOOP;
  -- The implicit cursor of a plain UPDATE
  UPDATE enrolment SET grade = LEAST(grade + 0.25, 10) WHERE course_id = 'C11';
  DBMS_OUTPUT.PUT_LINE(SQL%ROWCOUNT || ' Python grade(s) raised');
  COMMIT;
END;
/

-- 3. The curve of block 1 as ONE set-based statement (prefer it when a formula is enough):
-- UPDATE enrolment
-- SET grade = LEAST(10, grade + CASE
--                                 WHEN course_id = 'C10' AND grade < 5 THEN 1
--                                 WHEN course_id = 'C10' AND grade < 7 THEN 0.5
--                                 WHEN course_id = 'C20' THEN 1
--                                 ELSE 0
--                               END);`,
      mistake: 'Writing a cursor loop when **one set-based UPDATE** would do. If each row only needs a formula on its own values, `UPDATE enrolment SET grade = LEAST(10, grade + CASE … END)` changes the whole table in one statement, much faster. Keep cursors for work SQL cannot express in one statement: several steps per row, calls to procedures, messages or decisions that depend on earlier rows.',
    },
    {
      id: 'plsql-exceptions',
      hub: 'plsql',
      topic: 'plsql',
      title: 'Exceptions: handling errors',
      summary: 'When a statement fails inside PL/SQL, Oracle **raises an exception** and jumps to the **EXCEPTION** section of the block. There you catch errors by name and deal with them, and the program carries on instead of stopping.',
      body: [
        'Exceptions are the safety net under a trapeze: if a trick goes wrong you fall into the net (the EXCEPTION section) instead of hitting the floor (an error that stops the whole script). Each `WHEN name THEN` is a part of the net for one kind of fall, and `WHEN OTHERS` catches everything else.',
        'Oracle names the most common errors (the **predefined** exceptions of the table). You can declare your own (`e_too_many_credits EXCEPTION;`) and **RAISE** it when a business rule is broken. `RAISE_APPLICATION_ERROR(-20001, \'message\')` stops with your own error number (from -20000 to -20999) and text, which the calling application receives like any Oracle error.',
        '`SQLCODE` and `SQLERRM` give the number and the message of the current error: log them in WHEN OTHERS. After a handler runs, its block ends normally, and the statements after the one that failed are **not** run. A nested `BEGIN … EXCEPTION … END` around one risky step lets the rest of the program go on.',
      ],
      points: [
        'Put the specific handlers first and WHEN OTHERS last.',
        'An exception that a block does not handle passes to the enclosing block, and in the end to the caller.',
        'Inside a loop, a nested block handles the error of one row and the loop continues with the next.',
      ],
      table: {
        caption: 'Common predefined exceptions',
        head: ['Exception', 'Error', 'Raised when'],
        rows: [
          ['`NO_DATA_FOUND`', 'ORA-01403', 'A SELECT INTO returns no row'],
          ['`TOO_MANY_ROWS`', 'ORA-01422', 'A SELECT INTO returns more than one row'],
          ['`ZERO_DIVIDE`', 'ORA-01476', 'A number is divided by zero'],
          ['`DUP_VAL_ON_INDEX`', 'ORA-00001', 'An INSERT or UPDATE repeats a primary key or UNIQUE value'],
          ['`VALUE_ERROR`', 'ORA-06502', 'A value does not fit its variable (too long, wrong type)'],
          ['`INVALID_NUMBER`', 'ORA-01722', 'Text that is not a number is used as one in SQL'],
        ],
      },
      example: 'Looking up a student who does not exist prints "No student S99", and the script carries on with the next step.',
      dialect: 'Oracle PL/SQL · run it on FreeSQL',
      code: `DROP TABLE IF EXISTS student CASCADE CONSTRAINTS PURGE;
CREATE TABLE student (
  student_id VARCHAR2(3) PRIMARY KEY,
  name       VARCHAR2(40) NOT NULL,
  credits    NUMBER(3) DEFAULT 0 NOT NULL
);
INSERT INTO student VALUES ('S01', 'Ana Ruiz', 60);
INSERT INTO student VALUES ('S02', 'Luis Gil', 0);
COMMIT;

DECLARE
  v_name    student.name%TYPE;
  v_credits student.credits%TYPE;
  e_too_many_credits EXCEPTION;               -- a user-defined exception
BEGIN
  BEGIN                                       -- NO_DATA_FOUND
    SELECT name INTO v_name FROM student WHERE student_id = 'S99';
  EXCEPTION
    WHEN NO_DATA_FOUND THEN DBMS_OUTPUT.PUT_LINE('No student S99');
  END;

  BEGIN                                       -- TOO_MANY_ROWS
    SELECT name INTO v_name FROM student;
  EXCEPTION
    WHEN TOO_MANY_ROWS THEN DBMS_OUTPUT.PUT_LINE('More than one student: use a cursor');
  END;

  BEGIN                                       -- ZERO_DIVIDE: Luis has 0 credits
    SELECT credits INTO v_credits FROM student WHERE student_id = 'S02';
    DBMS_OUTPUT.PUT_LINE('Hours per credit: ' || 150 / v_credits);
  EXCEPTION
    WHEN ZERO_DIVIDE THEN DBMS_OUTPUT.PUT_LINE('Cannot divide by zero credits');
  END;

  BEGIN                                       -- DUP_VAL_ON_INDEX: S01 already exists
    INSERT INTO student (student_id, name) VALUES ('S01', 'Ana again');
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN DBMS_OUTPUT.PUT_LINE('S01 already exists');
  END;

  BEGIN                                       -- a business rule with a user exception
    SELECT credits INTO v_credits FROM student WHERE student_id = 'S01';
    IF v_credits + 30 > 78 THEN
      RAISE e_too_many_credits;
    END IF;
  EXCEPTION
    WHEN e_too_many_credits THEN DBMS_OUTPUT.PUT_LINE('No more than 78 credits a year');
  END;

  BEGIN                                       -- your own error number, caught by WHEN OTHERS
    RAISE_APPLICATION_ERROR(-20001, 'Enrolment is closed');
  EXCEPTION
    WHEN OTHERS THEN DBMS_OUTPUT.PUT_LINE('Error ' || SQLCODE || ': ' || SQLERRM);
  END;
END;
/`,
      mistake: 'Writing `WHEN OTHERS THEN NULL;`. It swallows every error in silence: the program seems to work and the data is wrong. At least log SQLERRM, or re-raise the error with `RAISE;`.',
    },
    {
      id: 'procedures-functions',
      hub: 'plsql',
      topic: 'plsql',
      title: 'Stored procedures and functions',
      summary: 'A **procedure** is a named PL/SQL block, stored in the database, that **does** something. A **function** **returns** a value and can be used inside SQL. Both take **parameters**.',
      body: [
        'A procedure is a vending machine: you put in a coin and make a choice (IN parameters), it **does** something (drops a can) and may hand back change (OUT parameters). A function is a calculator: you give it some numbers and it **returns** one answer, which you can use inside a bigger expression, even inside a SELECT.',
        '`CREATE OR REPLACE PROCEDURE name (p_x IN type, p_y OUT type) IS … BEGIN … END;` stores it, compiled, in your schema. Parameter modes: **IN** (read only, the default), **OUT** (the procedure writes it) and **IN OUT** (both). Parameter types have no length: `VARCHAR2`, not `VARCHAR2(40)`.',
        'Call a procedure from a block (`enrol_student(\'S03\', \'C10\', v_msg);`) or with `EXEC` in a script. A function that returns a SQL type can be used in a query: `SELECT grade, letter_grade(grade) FROM enrolment`. Logic stored in the database is shared: every application uses the same rules.',
      ],
      points: [
        'If it compiles with errors, Oracle stores it as INVALID; `SHOW ERRORS` (or the `USER_ERRORS` view) says why.',
        'A function called from SQL should not change data.',
        'Prefix parameters with `p_` so they never clash with column names.',
      ],
      example: '`letter_grade(8.5)` returns `B`, and `SELECT student_id, grade, letter_grade(grade) FROM enrolment` applies it to every row.',
      dialect: 'Oracle PL/SQL · run it on FreeSQL',
      code: `DROP TABLE IF EXISTS enrolment CASCADE CONSTRAINTS PURGE;
CREATE TABLE enrolment (
  student_id VARCHAR2(3),
  course_id  VARCHAR2(3),
  grade      NUMBER(4,2),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO enrolment VALUES ('S01', 'C10', 8.5);
INSERT INTO enrolment VALUES ('S02', 'C10', 4.5);
COMMIT;

-- A function: a calculator that returns a value
CREATE OR REPLACE FUNCTION letter_grade (p_grade IN NUMBER) RETURN VARCHAR2 IS
BEGIN
  RETURN CASE
           WHEN p_grade IS NULL THEN '-'
           WHEN p_grade >= 9 THEN 'A'
           WHEN p_grade >= 7 THEN 'B'
           WHEN p_grade >= 5 THEN 'C'
           ELSE 'F'
         END;
END letter_grade;
/

-- A procedure: a vending machine that does something and hands back a message
CREATE OR REPLACE PROCEDURE enrol_student (
  p_student IN  VARCHAR2,
  p_course  IN  VARCHAR2,
  p_message OUT VARCHAR2
) IS
BEGIN
  INSERT INTO enrolment (student_id, course_id) VALUES (p_student, p_course);
  p_message := p_student || ' enrolled in ' || p_course;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    p_message := p_student || ' was already enrolled in ' || p_course;
END enrol_student;
/

-- Calling both from a block...
DECLARE
  v_msg VARCHAR2(100);
BEGIN
  enrol_student('S03', 'C10', v_msg);
  DBMS_OUTPUT.PUT_LINE(v_msg);
  enrol_student('S01', 'C10', v_msg);
  DBMS_OUTPUT.PUT_LINE(v_msg);
  DBMS_OUTPUT.PUT_LINE('8.5 is a ' || letter_grade(8.5));
  COMMIT;
END;
/

-- ...and the function from SQL
SELECT student_id, grade, letter_grade(grade) AS letter
FROM enrolment
ORDER BY student_id;`,
      mistake: 'Writing a procedure where a function is needed, or the opposite. If you want a value to use in an expression or a query, write a function; if you want an action, a procedure.',
    },
    {
      id: 'triggers',
      hub: 'plsql',
      topic: 'plsql',
      title: 'Triggers',
      summary: 'A **trigger** is PL/SQL that Oracle runs **automatically** when something happens to a table: before or after an INSERT, UPDATE or DELETE, once per statement or once **for each row**.',
      body: [
        'A trigger is a motion-sensor light: nobody presses a switch, the event (someone walks in) turns it on. You never call a trigger: an INSERT, UPDATE or DELETE on its table fires it, whatever program sends the statement.',
        '**BEFORE** triggers run before the change and can check or adjust the new values; **AFTER** triggers run once the change is done, for example to write an audit log. A **statement-level** trigger fires once per statement; a **row-level** one (`FOR EACH ROW`) fires once per affected row and can read the `:OLD` values (before) and the `:NEW` values (after). `WHEN (condition)` limits the rows that fire it (inside WHEN, write `OLD` and `NEW` without the colon).',
        'Firing order for one statement: BEFORE statement → for each row (BEFORE row → the change → AFTER row) → AFTER statement. An **INSTEAD OF** trigger is defined on a view and runs instead of the INSERT, UPDATE or DELETE on it, which can make a join view updatable.',
      ],
      points: [
        'In an INSERT the `:OLD` values are NULL; in a DELETE the `:NEW` values are.',
        'Typical uses are audit trails, derived values and rules across tables; simple rules belong in constraints.',
        'A trigger runs inside the transaction of its statement: if the statement is rolled back, so is the trigger\'s work.',
      ],
      example: 'Every change of a grade writes a line in `grade_audit` with who, when, the old grade and the new one, without the application doing anything.',
      dialect: 'Oracle PL/SQL · run it on FreeSQL',
      code: `DROP TABLE IF EXISTS grade_audit PURGE;
DROP TABLE IF EXISTS enrolment CASCADE CONSTRAINTS PURGE;
CREATE TABLE enrolment (
  student_id VARCHAR2(3),
  course_id  VARCHAR2(3),
  grade      NUMBER(4,2),
  PRIMARY KEY (student_id, course_id)
);
CREATE TABLE grade_audit (
  audit_id   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id VARCHAR2(3),
  course_id  VARCHAR2(3),
  old_grade  NUMBER(4,2),
  new_grade  NUMBER(4,2),
  changed_by VARCHAR2(128) DEFAULT USER,
  changed_at DATE DEFAULT SYSDATE
);
INSERT INTO enrolment VALUES ('S01', 'C10', 4.5);
INSERT INTO enrolment VALUES ('S02', 'C10', 6.0);
COMMIT;

-- BEFORE ... FOR EACH ROW: check and adjust the new value
CREATE OR REPLACE TRIGGER trg_grade_check
BEFORE INSERT OR UPDATE OF grade ON enrolment
FOR EACH ROW
BEGIN
  IF :NEW.grade > 10 THEN
    RAISE_APPLICATION_ERROR(-20010, 'A grade cannot be above 10');
  END IF;
  :NEW.grade := ROUND(:NEW.grade, 1);          -- keep one decimal
END;
/

-- AFTER ... FOR EACH ROW with WHEN: audit only real changes
CREATE OR REPLACE TRIGGER trg_grade_audit
AFTER UPDATE OF grade ON enrolment
FOR EACH ROW
WHEN (NEW.grade <> OLD.grade OR (OLD.grade IS NULL AND NEW.grade IS NOT NULL))
BEGIN
  INSERT INTO grade_audit (student_id, course_id, old_grade, new_grade)
  VALUES (:OLD.student_id, :OLD.course_id, :OLD.grade, :NEW.grade);
END;
/

-- AFTER, statement level: once, however many rows changed
CREATE OR REPLACE TRIGGER trg_grade_notice
AFTER UPDATE OF grade ON enrolment
BEGIN
  DBMS_OUTPUT.PUT_LINE('Grades updated at ' || TO_CHAR(SYSDATE, 'HH24:MI'));
END;
/

UPDATE enrolment SET grade = grade + 0.54 WHERE course_id = 'C10';
COMMIT;
SELECT * FROM enrolment;
SELECT student_id, old_grade, new_grade, changed_by, TO_CHAR(changed_at, 'DD/MM/YYYY HH24:MI') AS changed_at
FROM grade_audit;`,
      mistake: 'Hiding business logic in triggers, or querying the same table from a row-level trigger. Chains of invisible actions are hard to debug, and reading the table being changed fails with ORA-04091 (table is mutating). Keep triggers small: auditing and checks that constraints cannot express.',
    },
    {
      id: 'packages',
      hub: 'plsql',
      topic: 'plsql',
      title: 'Packages',
      summary: 'A **package** groups related procedures, functions, constants and cursors under one name. It has two parts: the **specification**, its public interface, and the **body**, the hidden implementation.',
      body: [
        'A package is a restaurant. The **specification** is the **menu**: what customers can order and what each dish includes. The **body** is the **kitchen**: where the recipes live and customers never go. The chef can change a recipe (the body) without reprinting the menu, and the orders of the customers (the programs that call the package) keep working.',
        'Everything declared in the specification is **public**: callers write `package.item` (`grades_pkg.letter(8.5)`). What is declared only in the body is **private**: helpers that only the package can use. Create the specification first, then the body.',
        'Packages organise large code bases (one package per business area), are loaded as a unit, and their package-level variables keep their value during the whole session. Oracle\'s own utilities are packages: `DBMS_OUTPUT.PUT_LINE` is the procedure PUT_LINE of the package DBMS_OUTPUT.',
      ],
      points: [
        'Changing only the body does not invalidate the programs that call the package.',
        'Two subprograms of a package can share a name if their parameters differ (overloading).',
        'Grant EXECUTE on the package, not on each procedure.',
      ],
      example: '`grades_pkg` publishes `letter` and `curve_course`; the rule that a curve is between 0 and 2 points is a private function that nobody outside the package can call or skip.',
      dialect: 'Oracle PL/SQL · run it on FreeSQL',
      code: `DROP TABLE IF EXISTS enrolment CASCADE CONSTRAINTS PURGE;
CREATE TABLE enrolment (
  student_id VARCHAR2(3),
  course_id  VARCHAR2(3),
  grade      NUMBER(4,2),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO enrolment VALUES ('S01', 'C10', 4.5);
INSERT INTO enrolment VALUES ('S02', 'C10', 7.25);
COMMIT;

-- Specification: the menu (public)
CREATE OR REPLACE PACKAGE grades_pkg IS
  c_max_grade CONSTANT NUMBER := 10;
  FUNCTION  letter (p_grade IN NUMBER) RETURN VARCHAR2;
  PROCEDURE curve_course (p_course IN VARCHAR2, p_points IN NUMBER);
END grades_pkg;
/

-- Body: the kitchen (private details)
CREATE OR REPLACE PACKAGE BODY grades_pkg IS
  -- Private: not in the specification, so only this body can use it
  FUNCTION safe_points (p_points IN NUMBER) RETURN NUMBER IS
  BEGIN
    RETURN LEAST(GREATEST(p_points, 0), 2);      -- a curve is between 0 and 2 points
  END safe_points;

  FUNCTION letter (p_grade IN NUMBER) RETURN VARCHAR2 IS
  BEGIN
    RETURN CASE WHEN p_grade >= 9 THEN 'A' WHEN p_grade >= 7 THEN 'B'
                WHEN p_grade >= 5 THEN 'C' ELSE 'F' END;
  END letter;

  PROCEDURE curve_course (p_course IN VARCHAR2, p_points IN NUMBER) IS
    v_points NUMBER := safe_points(p_points);
  BEGIN
    UPDATE enrolment
    SET grade = LEAST(grade + v_points, c_max_grade)
    WHERE course_id = p_course;
    DBMS_OUTPUT.PUT_LINE(SQL%ROWCOUNT || ' grades curved by ' || v_points || ' in ' || p_course);
  END curve_course;
END grades_pkg;
/

BEGIN
  grades_pkg.curve_course('C10', 5);           -- asks for 5; the private rule allows 2
  COMMIT;
END;
/
SELECT student_id, grade, grades_pkg.letter(grade) AS letter FROM enrolment;`,
      mistake: 'Putting every helper in the specification. Whatever is public becomes a promise: other code starts using it and you can no longer change it freely. Publish only what callers need.',
    },

    /* ───────────── Indexes ───────────── */
    {
      id: 'index-basics',
      hub: 'indexes',
      topic: 'indexes',
      title: 'What an index is',
      summary: 'An **index** is a separate, sorted structure (usually a **B+ tree**) that maps the values of some columns to their rows. With it, the DBMS can **search** instead of **scanning** the whole table.',
      body: [
        'Without an index on `email`, finding one customer means reading all 50,000 rows: the plan says **TABLE ACCESS FULL**. After `CREATE INDEX`, the plan says **INDEX RANGE SCAN** followed by **TABLE ACCESS BY INDEX ROWID**, and the DBMS goes down the tree in a few steps (see the B+ tree card of the Theory section).',
        'The runner shows the time of each statement. Compare the two identical SELECTs, before and after the index.',
        '`EXPLAIN PLAN FOR <query>` stores the plan without running the query, and `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY)` prints it. (The sandbox words its own plan the same way; FreeSQL also shows the cost.)',
      ],
      points: [
        'The primary key and each UNIQUE constraint already have an index.',
        'Foreign keys do **not** get one automatically in Oracle; index them if you join or filter by them.',
      ],
      mistake: 'Thinking an index changes the result. It only changes how fast the DBMS finds the rows; the query returns exactly the same data.',
      sql: {
        setup: SHOP,
        query: `EXPLAIN PLAN FOR SELECT * FROM customer WHERE email = 'user43210@mail.com';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
SELECT * FROM customer WHERE email = 'user43210@mail.com';
CREATE INDEX idx_customer_email ON customer (email);
EXPLAIN PLAN FOR SELECT * FROM customer WHERE email = 'user43210@mail.com';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
SELECT * FROM customer WHERE email = 'user43210@mail.com';`,
      },
    },
    {
      id: 'composite-index',
      hub: 'indexes',
      topic: 'indexes',
      title: 'Composite and covering indexes',
      summary: 'A **composite** index sorts by several columns, in order. It helps queries that filter on its **leftmost** columns. A **covering** index contains every column a query needs, so the table is not read at all.',
      body: [
        'An index on `(city, signup_date)` is sorted like a phone book by surname, then name: it finds "Madrid, from 2023" fast, and also "Madrid" alone. It cannot help with "from 2023" alone, because those dates are spread across every city: that query scans.',
        'Put first the column compared with **equality**, then the one used for **ranges** or sorting.',
        'When the query only uses columns that are in the index, the DBMS answers from the index and never visits the table: the plan has an **INDEX RANGE SCAN** with no TABLE ACCESS step.',
      ],
      points: [
        'Leftmost-prefix rule: `(a, b, c)` serves filters on `a`, `a, b` and `a, b, c`.',
        'One composite index can replace several single-column ones.',
      ],
      mistake: 'Creating `(signup_date, city)` for queries that always fix the city and give a date range. With the range first, the second column cannot narrow the search.',
      sql: {
        setup: SHOP,
        query: `CREATE INDEX idx_city_date ON customer (city, signup_date);
EXPLAIN PLAN FOR SELECT * FROM customer WHERE city = 'Madrid' AND signup_date >= DATE '2023-01-01';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
EXPLAIN PLAN FOR SELECT * FROM customer WHERE signup_date >= DATE '2023-01-01';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
EXPLAIN PLAN FOR SELECT city, signup_date FROM customer WHERE city = 'Sevilla';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
SELECT COUNT(*) AS madrid_since_2023 FROM customer WHERE city = 'Madrid' AND signup_date >= DATE '2023-01-01';`,
      },
    },
    {
      id: 'index-cost',
      hub: 'indexes',
      topic: 'indexes',
      title: 'What indexes cost',
      summary: 'Indexes speed up reads but slow down writes: every INSERT, UPDATE or DELETE must also update **each index** of the table. They also take disk and memory.',
      body: [
        'In the example, the same 20,000 rows are inserted twice: into a table without indexes and into one with three. Compare the time of the two INSERT statements.',
        'An index pays off when queries filter, join or sort by its columns and those queries return a **small fraction** of the rows (high **selectivity**). On a column with very few distinct values, such as a yes/no flag, a plain B-tree index rarely helps: half the table matches anyway.',
      ],
      table: {
        caption: 'When to index a column',
        head: ['Usually yes', 'Usually no'],
        rows: [
          ['Foreign keys used in joins', 'Columns never used in WHERE, JOIN or ORDER BY'],
          ['Columns filtered with = or ranges that return few rows', 'Low-selectivity columns (gender, yes/no)'],
          ['Columns used to sort large results (ORDER BY … LIMIT)', 'Small tables that fit in a few blocks'],
          ['Search keys of frequent queries', 'Tables with heavy writes and rare reads (logs)'],
        ],
      },
      mistake: 'Indexing every column "just in case". Each index slows every write and the optimizer still uses only the useful ones.',
      sql: {
        setup: `CREATE TABLE plain_log (id NUMBER(6) PRIMARY KEY, user_id NUMBER(4), action VARCHAR2(12), at DATE);
CREATE TABLE indexed_log (id NUMBER(6) PRIMARY KEY, user_id NUMBER(4), action VARCHAR2(12), at DATE);
CREATE INDEX il_user ON indexed_log (user_id);
CREATE INDEX il_action ON indexed_log (action);
CREATE INDEX il_at ON indexed_log (at);`,
        query: `INSERT INTO plain_log
SELECT LEVEL, MOD(LEVEL, 997), 'action' || MOD(LEVEL, 13), DATE '2024-01-01' + MOD(LEVEL, 365)
FROM dual CONNECT BY LEVEL <= 20000;
INSERT INTO indexed_log
SELECT LEVEL, MOD(LEVEL, 997), 'action' || MOD(LEVEL, 13), DATE '2024-01-01' + MOD(LEVEL, 365)
FROM dual CONNECT BY LEVEL <= 20000;
SELECT index_name AS indexes_on_indexed_log FROM user_indexes WHERE table_name = 'INDEXED_LOG';`,
      },
    },
    {
      id: 'index-types',
      hub: 'indexes',
      topic: 'indexes',
      title: 'Kinds of index',
      summary: 'The **B-tree** is the default and serves equality, ranges and sorting. Other kinds solve specific problems: **hash** for equality only, **bitmap** for few distinct values, **GIN** for values inside a document or array, **BRIN** for huge, naturally ordered tables.',
      body: [
        'Oracle calls an index built on an **expression** (`LOWER(email)`) a **function-based index**: a query that uses the same expression can use it. Oracle has no partial indexes with a WHERE clause (PostgreSQL does); a common trick is a function-based index that is NULL for the rows you do not want, because Oracle does not index rows whose key is entirely NULL.',
        'Which kinds exist depends on the DBMS: Oracle has B-tree (the default), **bitmap** and **reverse-key** indexes and supports text and JSON search indexes; PostgreSQL adds hash, GIN and BRIN; MySQL InnoDB uses B-trees almost exclusively.',
      ],
      table: {
        caption: 'Main index kinds',
        head: ['Kind', 'Good for', 'Not for'],
        rows: [
          ['B-tree / B+ tree', '=, <, >, BETWEEN, ORDER BY, prefix LIKE \'abc%\'', 'Searching inside text or arrays'],
          ['Hash', 'Equality only (=) (PostgreSQL, MySQL MEMORY)', 'Ranges and sorting'],
          ['Bitmap', 'Columns with few distinct values in read-mostly tables (data warehouses)', 'Tables with many concurrent writes'],
          ['Reverse key (Oracle)', 'Monotonic keys (sequence numbers) inserted by many sessions at once: spreads the hot right-hand leaf', 'Range scans: it destroys the key order'],
          ['GIN / inverted', 'Full-text search, JSON keys, array elements', 'Simple scalar columns'],
          ['BRIN', 'Very large tables ordered by insertion (dates in a log) (PostgreSQL)', 'Randomly ordered data'],
        ],
      },
      dialect: 'Oracle · not runnable here',
      code: `CREATE INDEX orders_customer_idx ON orders (customer_id);                -- B-tree (default)
CREATE BITMAP INDEX customer_city_bix ON customer (city);                -- few distinct values, data warehouse
CREATE INDEX orders_id_rev ON orders (order_id) REVERSE;                 -- reverse-key
CREATE INDEX customer_email_ci ON customer (LOWER(email));               -- function-based
CREATE UNIQUE INDEX open_order_uq ON orders (CASE WHEN status = 'OPEN' THEN customer_id END);  -- "partial" unique`,
      mistake: 'Creating a bitmap index on a table that many sessions update at once. Each change locks a whole range of rows in the bitmap, so writers wait for each other.',
    },

    /* ───────────── Clustering ───────────── */
    {
      id: 'clustered-index',
      hub: 'clustering',
      topic: 'clustering',
      title: 'Clustered and non-clustered indexes',
      summary: 'In a **clustered** index the table rows themselves are stored in the order of the key, inside the index. A table can have only **one**. Every other index is **non-clustered**: it stores the key plus a pointer to the row.',
      body: [
        'Because neighbouring keys are stored together, a clustered index is excellent for ranges on its key: all the enrolments of course C10 sit in the same few blocks. A non-clustered index finds each row, then jumps to wherever it is stored.',
        'MySQL InnoDB and SQL Server cluster each table by its primary key by default. In InnoDB every secondary index stores the PK value as its pointer, so a long PK makes every index bigger.',
        'Oracle tables are heaps by default, but it offers the **index-organized table** (IOT): `ORGANIZATION INDEX` stores the rows in the primary-key B-tree. In the example the plan searches the primary key directly, with no extra lookup.',
      ],
      points: [
        'Choose a clustering key that is short, does not change, and matches frequent range queries.',
        'Random keys (such as random UUIDs) scatter inserts all over a clustered index; increasing keys append at the end.',
      ],
      mistake: 'Confusing a **clustered index** with a **database cluster**. The second is a group of servers working together (replication, high availability), an unrelated meaning of the word.',
      sql: {
        setup: '',
        query: `CREATE TABLE enrolment_by_course (
  course_id  VARCHAR2(3),
  student_id VARCHAR2(3),
  grade      NUMBER(4,2),
  PRIMARY KEY (course_id, student_id)
) ORGANIZATION INDEX;
INSERT INTO enrolment_by_course VALUES ('C20', 'S01', 7.0);
INSERT INTO enrolment_by_course VALUES ('C10', 'S03', 5.0);
INSERT INTO enrolment_by_course VALUES ('C10', 'S01', 8.5);
INSERT INTO enrolment_by_course VALUES ('C11', 'S02', 9.0);
INSERT INTO enrolment_by_course VALUES ('C10', 'S02', 6.5);
SELECT * FROM enrolment_by_course;           -- stored in key order (without ORDER BY the order is never guaranteed)
EXPLAIN PLAN FOR SELECT * FROM enrolment_by_course WHERE course_id = 'C10';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);`,
      },
    },
    {
      id: 'physical-order',
      hub: 'clustering',
      topic: 'clustering',
      title: 'Table clusters in Oracle (and CLUSTER in PostgreSQL)',
      summary: 'An Oracle **table cluster** stores the rows of several tables that share a key (a department and its employees) in the same blocks, which speeds up joins on that key. PostgreSQL has no such thing: its `CLUSTER` command rewrites a table once, in the order of an index.',
      body: [
        'In a cluster, the **cluster key** value is stored once and all the rows of every table with that key sit together: reading a department and its courses touches few blocks. The price is slower inserts and full scans of one table, because its rows are spread among the other tables\' rows. Use it for tables that are almost always joined and rarely updated.',
        'Oracle **index-organized tables** (previous card) behave like a clustered index. PostgreSQL tables are unordered heaps: after `CLUSTER orders USING orders_date_idx` rows of the same date sit together, but new rows go wherever there is room, so the order decays and the command, which locks the table, must be repeated.',
      ],
      dialect: 'Oracle · not runnable here',
      code: `CREATE CLUSTER dept_cluster (dept_id VARCHAR2(3));
CREATE INDEX dept_cluster_idx ON CLUSTER dept_cluster;      -- a cluster needs its index

CREATE TABLE department (
  dept_id VARCHAR2(3) PRIMARY KEY,
  name    VARCHAR2(30) NOT NULL
) CLUSTER dept_cluster (dept_id);

CREATE TABLE course (
  course_id VARCHAR2(3) PRIMARY KEY,
  title     VARCHAR2(40) NOT NULL,
  dept_id   VARCHAR2(3) NOT NULL REFERENCES department (dept_id)
) CLUSTER dept_cluster (dept_id);                           -- same blocks as its department`,
      mistake: 'Clustering tables that are updated all the time or often read alone. Clusters only pay off for stable data that is read together.',
    },

    /* ───────────── Partitioning ───────────── */
    {
      id: 'partitioning',
      hub: 'partitioning',
      topic: 'partitioning',
      title: 'Horizontal partitioning',
      summary: '**Partitioning** splits one big table into smaller pieces, the **partitions**, according to a **partition key**. Queries still use the single table name; the DBMS sends each row to its partition.',
      body: [
        '**Range** partitioning puts each interval of the key in a partition (one per month of orders). **List** partitioning uses explicit values (one per country). **Hash** partitioning spreads rows evenly by a hash of the key, when there is no natural range.',
        'Each partition is a real table with its own storage and indexes, so maintenance works on one piece at a time.',
        'Partitioning is an Oracle option that the browser sandbox cannot simulate; FreeSQL does run it. Since Oracle 12c you can even use **interval** partitioning: the DBMS creates a new partition by itself when a row arrives outside the existing ones.',
      ],
      table: {
        caption: 'Choosing the method',
        head: ['Method', 'Typical key', 'Use it when'],
        rows: [
          ['Range', 'Date, id ranges', 'Queries and data retention go by time'],
          ['List', 'Country, region, status', 'A few known values separate the data'],
          ['Hash', 'Customer id', 'You need even sizes and there is no natural range'],
        ],
      },
      dialect: 'Oracle · not runnable here',
      code: `CREATE TABLE orders (
  order_id    NUMBER(10),
  customer_id NUMBER(10) NOT NULL,
  order_date  DATE NOT NULL,
  total       NUMBER(10,2) NOT NULL
)
PARTITION BY RANGE (order_date) (
  PARTITION p2025_01 VALUES LESS THAN (DATE '2025-02-01'),
  PARTITION p2025_02 VALUES LESS THAN (DATE '2025-03-01'),
  PARTITION p_max    VALUES LESS THAN (MAXVALUE)             -- rows outside every range
);

-- Oracle creates the monthly partitions by itself:
-- PARTITION BY RANGE (order_date) INTERVAL (NUMTOYMINTERVAL(1, 'MONTH')) (PARTITION p_first VALUES LESS THAN (DATE '2025-01-01'))

CREATE INDEX orders_customer_ix ON orders (customer_id) LOCAL;   -- one index segment per partition`,
      mistake: 'Partitioning a small table. Below many millions of rows, a good index is usually simpler and just as fast.',
    },
    {
      id: 'pruning',
      hub: 'partitioning',
      topic: 'partitioning',
      title: 'Partition pruning and maintenance',
      summary: 'When the WHERE fixes the partition key, the optimizer reads only the matching partitions: **partition pruning**. Old data can then be removed by dropping a whole partition instead of deleting millions of rows.',
      body: [
        'With monthly partitions, a query for February 2025 reads only partition `p2025_02`: the Oracle plan shows `PARTITION RANGE SINGLE` with `Pstart = Pstop = 2`. A query that does not filter on `order_date` must visit every partition (`PARTITION RANGE ALL`), which can be slower than one big indexed table.',
        'Retention becomes cheap: `ALTER TABLE … DROP PARTITION` or `EXCHANGE PARTITION` the oldest one. That takes milliseconds, while `DELETE … WHERE order_date < …` writes every deleted row to the undo and redo logs.',
      ],
      points: [
        'Choose the partition key from the most frequent filters.',
        'A **local** index has one segment per partition and is kept valid when you drop a partition; a unique index must include the partition key to be local.',
      ],
      dialect: 'Oracle · not runnable here',
      code: `EXPLAIN PLAN FOR SELECT SUM(total) FROM orders
WHERE order_date >= DATE '2025-02-01' AND order_date < DATE '2025-03-01';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
-- | Id | Operation              | Name   | Pstart | Pstop |
-- |  2 |  PARTITION RANGE SINGLE|        |      2 |     2 |    <- only one partition is read
-- |  3 |   TABLE ACCESS FULL    | ORDERS |      2 |     2 |

ALTER TABLE orders DROP PARTITION p2025_01 UPDATE INDEXES;   -- remove a whole month at once
ALTER TABLE orders EXCHANGE PARTITION p2025_01 WITH TABLE orders_2025_01_archive;  -- …or swap it out as a table`,
      mistake: 'Partitioning by a column the queries rarely filter on. Without pruning, every query visits every partition.',
    },
    {
      id: 'vertical-sharding',
      hub: 'partitioning',
      topic: 'partitioning',
      title: 'Vertical partitioning and sharding',
      summary: '**Vertical** partitioning splits the **columns** of a table into two tables with the same key. **Sharding** splits the **rows** across different **servers**, each with its own database.',
      body: [
        'Vertical partitioning moves rarely used or very large columns (a photo, a long biography) to a 1:1 table, so the frequently read part of each row is small and more rows fit in each block. It is the same 1:1 transformation of the ER → Logical section, used for performance.',
        'Sharding is horizontal partitioning across machines: customers A–M on one server, N–Z on another. It scales writes and storage beyond one server, but joins and transactions across shards become hard, and the application or a middleware must route each query.',
      ],
      table: {
        caption: 'Three ways to split',
        head: ['Technique', 'Splits', 'Where the pieces live', 'Main cost'],
        rows: [
          ['Horizontal partitioning', 'Rows', 'Same database', 'Queries without the key visit every partition'],
          ['Vertical partitioning', 'Columns', 'Same database', 'A join to read the whole row'],
          ['Sharding', 'Rows', 'Different servers', 'Cross-shard joins and transactions'],
        ],
      },
      mistake: 'Sharding before it is needed. Indexes, partitioning, read replicas and a bigger server solve most problems with far less complexity.',
    },

    /* ───────────── Efficiency ───────────── */
    {
      id: 'query-plan',
      hub: 'efficiency',
      topic: 'efficiency',
      title: 'Reading a query plan',
      summary: 'SQL says **what** you want; the **optimizer** decides **how**: which index, which join order, which algorithm. **EXPLAIN PLAN** shows that plan, and the plan is where slow queries are understood.',
      body: [
        'The optimizer estimates the cost of several plans from **statistics** about the data (number of rows, distinct values) and picks the cheapest. Oracle gathers them automatically at night; refresh them yourself after big changes with `EXEC DBMS_STATS.GATHER_TABLE_STATS(USER, \'ORDERS\')` (`ANALYZE` in PostgreSQL, `ANALYZE TABLE` in MySQL).',
        'Look for a **TABLE ACCESS FULL** (full table read) on a big table inside a join or a selective filter: it usually means a missing index. In the example, the join of each customer with their orders reads all of `orders` until the foreign key is indexed.',
        'To see real times and row counts next to the estimates, run the query with the hint `/*+ GATHER_PLAN_STATISTICS */` and print the plan with `DBMS_XPLAN.DISPLAY_CURSOR` (PostgreSQL: `EXPLAIN ANALYZE`).',
      ],
      points: [
        'TABLE ACCESS FULL = read every row; INDEX RANGE SCAN / INDEX UNIQUE SCAN = go down an index.',
        'SORT ORDER BY = an extra sort; an index in that order avoids it.',
      ],
      mistake: 'Optimizing by intuition. Read the plan first: the slow part is often not where you expect.',
      sql: {
        setup: SHOP,
        query: `EXPLAIN PLAN FOR
SELECT c.city, SUM(o.total) FROM customer c JOIN orders o ON o.customer_id = c.customer_id
WHERE c.customer_id BETWEEN 100 AND 200 GROUP BY c.city;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
SELECT c.city, ROUND(SUM(o.total), 2) AS spent FROM customer c JOIN orders o ON o.customer_id = c.customer_id
WHERE c.customer_id BETWEEN 100 AND 200 GROUP BY c.city;
CREATE INDEX idx_orders_customer ON orders (customer_id);
EXEC DBMS_STATS.GATHER_TABLE_STATS(USER, 'ORDERS');
EXPLAIN PLAN FOR
SELECT c.city, SUM(o.total) FROM customer c JOIN orders o ON o.customer_id = c.customer_id
WHERE c.customer_id BETWEEN 100 AND 200 GROUP BY c.city;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
SELECT c.city, ROUND(SUM(o.total), 2) AS spent FROM customer c JOIN orders o ON o.customer_id = c.customer_id
WHERE c.customer_id BETWEEN 100 AND 200 GROUP BY c.city;`,
      },
    },
    {
      id: 'sargable',
      hub: 'efficiency',
      topic: 'efficiency',
      title: 'Conditions that can use an index',
      summary: 'An index on a column only helps when the condition compares the **bare column**. Wrapping it in a function or calculation hides it from the index: the query scans.',
      body: [
        'A condition that can use an index is called **sargable** (from search argument). `signup_date >= DATE \'2024-01-01\'` is sargable; `TO_CHAR(signup_date, \'YYYY\') = \'2024\'` is not, even though it means the same, because the index is sorted by `signup_date`, not by its first four characters.',
        'Rewrite the condition on the column (a date range instead of extracting the year), or create an **expression index** on exactly the expression you query, as with `LOWER(email)` in the example (Oracle calls it a function-based index).',
        'Read the first plan carefully: it may say **INDEX FAST FULL SCAN**. The DBMS reads the whole index instead of the whole table, because the index is smaller, but it still visits every entry. Only an **INDEX RANGE SCAN** means it went straight to the matching part.',
        'The same happens with `LIKE \'%text\'` (a leading wildcard) and with arithmetic on the column (`price * 1.21 > 100`).',
      ],
      mistake: 'Adding an index and assuming the query will use it. Check the plan; a function on the column is enough to make the index useless.',
      sql: {
        setup: `${SHOP}
CREATE INDEX idx_signup ON customer (signup_date);
CREATE INDEX idx_email ON customer (email);`,
        query: `EXPLAIN PLAN FOR SELECT COUNT(*) FROM customer WHERE TO_CHAR(signup_date, 'YYYY') = '2023';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
EXPLAIN PLAN FOR SELECT COUNT(*) FROM customer WHERE signup_date >= DATE '2023-01-01' AND signup_date < DATE '2024-01-01';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
EXPLAIN PLAN FOR SELECT * FROM customer WHERE LOWER(email) = 'user77@mail.com';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
CREATE INDEX idx_email_lower ON customer (LOWER(email));
EXPLAIN PLAN FOR SELECT * FROM customer WHERE LOWER(email) = 'user77@mail.com';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);`,
      },
    },
    {
      id: 'efficient-queries',
      hub: 'efficiency',
      topic: 'efficiency',
      title: 'Writing efficient queries',
      summary: 'Ask the database for exactly what you need, in **one set-based statement**, and let it do the work near the data: filter, join and aggregate in SQL, not row by row in the application.',
      body: [
        'The **N+1 problem**: a program reads 100 customers, then runs one query per customer to get its orders, 101 queries in all. One join or one `IN (…)` query returns the same data in a single round trip.',
        'A set-based UPDATE changes thousands of rows in one statement; a loop that updates them one at a time pays the statement overhead each time, and holds the transaction open longer.',
      ],
      points: [
        'Select only the columns you use; `SELECT *` reads and sends more data and stops covering indexes from helping.',
        'Use `EXISTS` to ask "is there any?" instead of `COUNT(*) > 0`: it can stop at the first match.',
        'Paginate with `ORDER BY … FETCH FIRST n ROWS ONLY` (`OFFSET m ROWS` to skip), ideally on an indexed column.',
        'Join and filter on indexed keys, and keep transactions short.',
      ],
      example: 'The last query of the example answers "top 5 cities by spending in 2024" with one statement, instead of reading every order into the program.',
      mistake: 'Fetching a whole table to filter it in the application. The database can use indexes and send only the matching rows; the program can do neither.',
      sql: {
        setup: `${SHOP}
CREATE INDEX idx_orders_customer ON orders (customer_id);`,
        query: `-- "Has customer 42 ordered anything?": EXISTS can stop at the first order
SELECT CASE WHEN EXISTS (SELECT 1 FROM orders WHERE customer_id = 42) THEN 'yes' ELSE 'no' END AS has_orders FROM dual;
-- One set-based statement instead of a loop over every order
UPDATE orders SET total = ROUND(total * 0.9, 2) WHERE order_date < DATE '2023-02-01';
COMMIT;
-- Only the columns and rows needed, aggregated in the database
SELECT c.city, COUNT(*) AS orders, ROUND(SUM(o.total), 2) AS spent
FROM orders o JOIN customer c ON c.customer_id = o.customer_id
WHERE o.order_date BETWEEN DATE '2024-01-01' AND DATE '2024-12-31'
GROUP BY c.city
ORDER BY spent DESC
FETCH FIRST 5 ROWS ONLY;`,
      },
    },
  ];

  DATA.en.SQL_QUIZ_TOPICS = {
    oracle: 'Oracle and FreeSQL',
    querying: 'Querying',
    joins: 'Combining tables',
    aggregation: 'Aggregation',
    subqueries: 'Subqueries & sets',
    functions: 'Functions',
    languages: 'SQL languages',
    constraints: 'Constraints',
    objects: 'Views & schema objects',
    plsql: 'PL/SQL',
    indexes: 'Indexes',
    clustering: 'Clustering',
    partitioning: 'Partitioning',
    efficiency: 'Efficiency',
  };

  DATA.en.SQL_QUIZ = [
    { topic: 'oracle', type: 'mc', q: 'Which statement is valid Oracle for "the 3 best grades"?', choices: ['`… ORDER BY grade DESC LIMIT 3`', '`… ORDER BY grade DESC FETCH FIRST 3 ROWS ONLY`', '`SELECT TOP 3 … ORDER BY grade DESC`', '`… ORDER BY grade DESC LIMIT 0, 3`'], answer: 1, why: 'FETCH FIRST is the standard syntax that Oracle supports; LIMIT and TOP belong to other DBMSs.' },
    { topic: 'oracle', type: 'fib', q: 'To run a query without a table in Oracle you select from the dummy table ___.', accept: ['dual', 'DUAL'], why: '`SELECT SYSDATE FROM dual`. (Oracle 23ai also accepts a SELECT without FROM.)' },
    { topic: 'oracle', type: 'mc', q: 'What does `SELECT name FROM student WHERE email = \'\'` return in Oracle?', choices: ['The students with an empty e-mail', 'The students with a NULL e-mail', 'No rows at all', 'An error'], answer: 2, why: 'In Oracle \'\' is NULL, and a comparison with NULL is never true. Use IS NULL.' },
    { topic: 'oracle', type: 'tf', q: 'FreeSQL runs your SQL on a real Oracle database in the cloud.', answer: true, why: 'It is Oracle\'s free online worksheet; nothing is installed.' },
    { topic: 'oracle', type: 'mc', q: 'Which error does Oracle give when you query a table that does not exist?', choices: ['ORA-00904', 'ORA-00942', 'ORA-00001', 'ORA-02291'], answer: 1, why: 'ORA-00942: table or view does not exist. ORA-00904 is an invalid column name.' },
    { topic: 'querying', type: 'mc', q: 'Which query lists each department id of `course` only once?', choices: ['`SELECT dept_id FROM course`', '`SELECT DISTINCT dept_id FROM course`', '`SELECT UNIQUE(dept_id) FROM course`', '`SELECT dept_id FROM course ORDER BY dept_id`'], answer: 1, why: 'DISTINCT removes duplicate rows from the result. ORDER BY only sorts them; the duplicates stay.' },
    { topic: 'querying', type: 'fib', q: 'In Oracle, two texts are glued together with the operator ___.', accept: ['||'], why: '`name || \' (\' || country || \')\'`. The `+` operator is only arithmetic in Oracle (ORA-01722).' },
    { topic: 'querying', type: 'mc', q: 'With `ORDER BY email` (ascending), where does Oracle put the rows whose email is NULL?', choices: ['First', 'Last', 'Nowhere: they are filtered out', 'In a random position'], answer: 1, why: 'Oracle treats NULL as the largest value: last in ascending order, first in descending order. `NULLS FIRST` changes it.' },
    { topic: 'querying', type: 'mc', q: 'How does Oracle read `WHERE a = 1 OR b = 2 AND c = 3`?', choices: ['`(a = 1 OR b = 2) AND c = 3`', '`a = 1 OR (b = 2 AND c = 3)`', 'It fails: parentheses are required', 'From left to right, whatever the operators'], answer: 1, why: 'AND has higher precedence than OR, as × over +. Write the parentheses you mean.' },
    { topic: 'querying', type: 'mc', q: 'Which grades does `WHERE grade BETWEEN 7 AND 8.5` keep?', choices: ['7 < grade < 8.5', '7 <= grade < 8.5', '7 <= grade <= 8.5', '7 < grade <= 8.5'], answer: 2, why: 'BETWEEN includes both limits: it is `grade >= 7 AND grade <= 8.5`.' },
    { topic: 'querying', type: 'mc', q: 'Which pattern finds the band names that begin with the **word** "The" (and not "Theo Grant")?', choices: ['`LIKE \'The%\'`', '`LIKE \'The %\'`', '`LIKE \'%The%\'`', '`= \'The%\'`'], answer: 1, why: '`%` matches any characters, so `\'The%\'` also matches "Theo". The space after The requires the whole word. With `=` the % is not a wildcard.' },
    { topic: 'querying', type: 'fib', q: 'To keep the students without an email, write `WHERE email ___`.', accept: ['IS NULL', 'is null', 'Is Null'], why: 'A comparison with NULL (`= NULL`) is unknown for every row, so it never returns anything.' },
    { topic: 'querying', type: 'mc', q: '`course` has a course with no enrolments. What happens to it in `course JOIN enrolment ON …`?', choices: ['It appears once with NULL enrolment columns', 'It does not appear', 'It appears once per student', 'The query fails'], answer: 1, why: 'An INNER JOIN only keeps rows that find a partner. Keeping it needs an OUTER JOIN.' },
    { topic: 'joins', type: 'mc', q: 'Which join keeps every course, including the ones with no enrolments?', choices: ['`course c JOIN enrolment e ON …`', '`course c LEFT JOIN enrolment e ON …`', '`course c RIGHT JOIN enrolment e ON …`', '`course c CROSS JOIN enrolment e`'], answer: 1, why: 'LEFT JOIN keeps every row of the left table (course) and fills the enrolment columns with NULL; RIGHT JOIN would keep every enrolment instead.' },
    { topic: 'joins', type: 'fib', q: 'To list the customers with no orders: `customer c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_id IS ___`.', accept: ['NULL', 'null'], why: 'This is an anti-join: an unmatched customer gets NULL in every column of orders, even in its primary key.' },
    { topic: 'joins', type: 'mc', q: '`student` has 3 rows and `course` has 4. How many rows does `student CROSS JOIN course` return?', choices: ['3', '4', '7', '12'], answer: 3, why: 'A CROSS JOIN pairs every row with every row: 3 × 4 = 12.' },
    { topic: 'joins', type: 'tf', q: '`A RIGHT JOIN B ON …` returns the same rows as `B LEFT JOIN A ON …`.', answer: true, why: 'They are mirror images, which is why most people only write LEFT JOINs.' },
    { topic: 'joins', type: 'mc', q: 'Why is NATURAL JOIN risky?', choices: ['It is slower than JOIN … ON', 'It joins on every column with the same name, so a new column can silently change the result', 'Oracle does not support it', 'It always returns a Cartesian product'], answer: 1, why: 'The join condition is implicit: add a `name` column to one table and the join suddenly compares names too.' },
    { topic: 'aggregation', type: 'mc', q: '`student` has 3 rows and one of them has a NULL email. What do `COUNT(*)` and `COUNT(email)` return?', choices: ['3 and 3', '3 and 2', '2 and 2', '2 and 3'], answer: 1, why: 'COUNT(*) counts rows; COUNT(column) counts the values that are not NULL.' },
    { topic: 'aggregation', type: 'tf', q: '`AVG(grade)` counts a NULL grade as 0.', answer: false, why: 'Aggregates ignore NULLs. To count missing grades as 0, write `AVG(NVL(grade, 0))`.' },
    { topic: 'aggregation', type: 'mc', q: 'Which is the logical order of evaluation of a query?', choices: ['SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY', 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY', 'FROM → GROUP BY → WHERE → SELECT → HAVING → ORDER BY', 'WHERE → FROM → SELECT → GROUP BY → ORDER BY → HAVING'], answer: 1, why: 'Rows are built and filtered, then grouped, the groups filtered, the columns chosen and finally sorted.' },
    { topic: 'aggregation', type: 'mc', q: '`SELECT dept_id, title, COUNT(*) FROM course GROUP BY dept_id` fails. Why?', choices: ['COUNT(*) needs a column', '`title` is neither aggregated nor in the GROUP BY', 'GROUP BY always needs HAVING', '`dept_id` must be inside an aggregate'], answer: 1, why: 'Each group returns one row, so every column outside an aggregate must be in the GROUP BY (ORA-00979).' },
    { topic: 'aggregation', type: 'fib', q: 'To keep only the courses with at least two enrolments after grouping, write `___ COUNT(*) >= 2`.', accept: ['HAVING', 'having'], why: 'HAVING filters groups; WHERE runs before grouping and cannot use aggregates.' },
    { topic: 'subqueries', type: 'mc', q: '`WHERE grade = (SELECT grade FROM enrolment WHERE course_id = \'C10\')` fails because C10 has three enrolments. Which operator means "equal to one of them"?', choices: ['`=`', '`IN`', '`LIKE`', '`BETWEEN`'], answer: 1, why: 'A single-row comparison cannot take a list (ORA-01427); IN (or = ANY) can.' },
    { topic: 'subqueries', type: 'tf', q: '`WHERE x NOT IN (SELECT …)` returns no rows at all if the subquery returns a NULL.', answer: true, why: '`x <> NULL` is unknown, so the AND of all the comparisons is never true. Filter the NULLs out or use NOT EXISTS.' },
    { topic: 'subqueries', type: 'mc', q: '`grade > ALL (SELECT grade FROM enrolment WHERE course_id = \'C10\')` means that the grade is…', choices: ['greater than the lowest C10 grade', 'greater than the highest C10 grade', 'equal to some C10 grade', 'greater than the average C10 grade'], answer: 1, why: 'ALL must hold for every value of the list, so the grade must beat the largest one. `> ANY` would only need to beat the smallest.' },
    { topic: 'subqueries', type: 'mc', q: 'What makes a subquery **correlated**?', choices: ['It is written in the FROM clause', 'It uses a column of the outer query, so it is evaluated for each outer row', 'It returns several rows', 'It uses GROUP BY'], answer: 1, why: 'For example `WHERE x.course_id = e.course_id`, where `e` belongs to the outer query.' },
    { topic: 'subqueries', type: 'mc', q: 'Which set operator keeps duplicate rows?', choices: ['UNION', 'UNION ALL', 'INTERSECT', 'MINUS'], answer: 1, why: 'UNION ALL just appends the second result to the first; the others remove duplicates.' },
    { topic: 'functions', type: 'mc', q: 'What does `SUBSTR(\'Database\', 1, 4)` return?', choices: ['`Data`', '`atab`', '`Dat`', '`base`'], answer: 0, why: 'Positions start at 1: four characters from the first one.' },
    { topic: 'functions', type: 'mc', q: 'Which expression returns 28 February 2026?', choices: ['`DATE \'2026-01-31\' + 30`', '`ADD_MONTHS(DATE \'2026-01-31\', 1)`', '`TRUNC(DATE \'2026-01-31\', \'MM\')`', '`DATE \'2026-01-31\' + 1`'], answer: 1, why: 'ADD_MONTHS moves by calendar months and stays at the end of the month; adding 30 days gives 2 March.' },
    { topic: 'functions', type: 'fib', q: 'The Oracle function that returns its second argument when the first one is NULL is ___.', accept: ['NVL', 'nvl'], why: '`NVL(email, \'no email\')`. COALESCE does the same with any number of arguments.' },
    { topic: 'functions', type: 'mc', q: 'What does `CASE WHEN grade >= 5 THEN \'pass\' WHEN grade >= 9 THEN \'distinction\' ELSE \'fail\' END` return for a 9.5?', choices: ['pass', 'distinction', 'fail', 'NULL'], answer: 0, why: 'CASE returns the first branch that is true. Put the strictest condition first.' },
    { topic: 'functions', type: 'tf', q: '`ROUND(7.456, 2)` and `TRUNC(7.456, 2)` return the same value.', answer: false, why: 'ROUND gives 7.46; TRUNC just cuts the extra digits and gives 7.45.' },
    { topic: 'objects', type: 'tf', q: 'A normal view stores a copy of the rows its query returns.', answer: false, why: 'A view stores the query; it runs again on the current data each time. A materialized view is the one that stores rows.' },
    { topic: 'objects', type: 'mc', q: 'What does `WITH CHECK OPTION` do on a view?', choices: ['It forbids every change through the view', 'It rejects inserts and updates through the view that produce rows the view cannot see', 'It checks the constraints of the base table', 'It refreshes the view'], answer: 1, why: 'Changes through the view must stay inside its WHERE. WITH READ ONLY is the option that forbids every change.' },
    { topic: 'objects', type: 'mc', q: 'Your session has just used the sequence `s`. Which expression returns the same number again, without pulling a new one?', choices: ['`s.NEXTVAL`', '`s.CURRVAL`', '`s.LASTVAL`', '`SEQUENCE(s)`'], answer: 1, why: 'CURRVAL is the last number your session pulled with NEXTVAL.' },
    { topic: 'objects', type: 'fib', q: 'A common table expression (CTE) starts with the keyword ___.', accept: ['WITH', 'with'], why: '`WITH name AS (SELECT …) SELECT … FROM name`.' },
    { topic: 'objects', type: 'mc', q: 'What is a synonym?', choices: ['A copy of a table', 'Another name for an object', 'A read-only view', 'A sequence shared by several tables'], answer: 1, why: 'A nickname such as `grades` for `hr.enrolment`. It grants no privileges by itself.' },
    { topic: 'plsql', type: 'mc', q: 'Which is the lifecycle of an explicit cursor?', choices: ['OPEN → DECLARE → FETCH → CLOSE', 'DECLARE → OPEN → FETCH (in a loop) → CLOSE', 'DECLARE → FETCH → OPEN → CLOSE', 'FETCH → OPEN → CLOSE → DECLARE'], answer: 1, why: 'Declare the query, open it, fetch row after row until %NOTFOUND, and close it. A cursor FOR loop does the middle steps for you.' },
    { topic: 'plsql', type: 'fib', q: 'A `SELECT … INTO` that finds no row raises the exception ___.', accept: ['NO_DATA_FOUND', 'no_data_found', 'no data found'], why: 'If it finds several rows, it raises TOO_MANY_ROWS.' },
    { topic: 'plsql', type: 'tf', q: 'In a row-level trigger, `:OLD` holds the values of the row before the change.', answer: true, why: '`:NEW` holds the values after it. In an INSERT the :OLD values are NULL.' },
    { topic: 'plsql', type: 'mc', q: 'What is the difference between a function and a procedure?', choices: ['Only a function can have parameters', 'A function returns a value and can be used in an expression or a query', 'Only a procedure is stored in the database', 'A procedure is always faster'], answer: 1, why: 'A function is a calculator that returns an answer; a procedure is a machine that does something.' },
    { topic: 'plsql', type: 'mc', q: 'Every grade must become `LEAST(grade + 1, 10)`. What is the best way?', choices: ['A cursor loop that updates one row at a time', 'One UPDATE statement', 'A trigger on enrolment', 'A package variable'], answer: 1, why: 'When a formula on the row\'s own values is enough, one set-based UPDATE is simpler and much faster than a cursor loop.' },
    { topic: 'languages', type: 'mc', q: 'Which sub-language does `ALTER TABLE` belong to?', choices: ['DDL', 'DML', 'DCL', 'TCL'], answer: 0, why: 'It changes the structure of a table, so it is data definition.' },
    { topic: 'languages', type: 'mc', q: 'Which statement is part of DCL?', choices: ['`COMMIT`', '`GRANT`', '`TRUNCATE`', '`MERGE`'], answer: 1, why: 'GRANT and REVOKE control privileges. COMMIT is TCL, TRUNCATE is DDL and MERGE is DML.' },
    { topic: 'languages', type: 'tf', q: 'A `DELETE` without a WHERE clause removes every row of the table.', answer: true, why: 'With no filter, every row matches.' },
    { topic: 'languages', type: 'fib', q: 'To undo all the changes of the current transaction you run ___.', accept: ['ROLLBACK', 'rollback'], why: 'ROLLBACK undoes everything since the transaction started; ROLLBACK TO SAVEPOINT undoes only what came after the savepoint.' },
    { topic: 'languages', type: 'mc', q: 'In Oracle, when does a transaction start?', choices: ['With the BEGIN statement', 'With your first INSERT, UPDATE or DELETE', 'With every SELECT', 'Only after SET TRANSACTION'], answer: 1, why: 'Oracle has no BEGIN for transactions (BEGIN starts a PL/SQL block): the first DML statement opens one, and COMMIT or ROLLBACK ends it.' },
    { topic: 'languages', type: 'tf', q: 'In Oracle, a CREATE TABLE in the middle of a transaction can be undone with ROLLBACK.', answer: false, why: 'DDL commits the open transaction before and after it, so nothing before it can be rolled back any more.' },
    { topic: 'languages', type: 'mc', q: 'Which query returns the first 5 rows in Oracle?', choices: ['`SELECT * FROM t LIMIT 5`', '`SELECT TOP 5 * FROM t`', '`SELECT * FROM t FETCH FIRST 5 ROWS ONLY`', '`SELECT * FROM t LIMIT 0, 5`'], answer: 2, why: 'LIMIT and TOP belong to other DBMSs. Oracle uses the standard FETCH FIRST … ROWS ONLY (12c onwards).' },
    { topic: 'languages', type: 'fib', q: 'Oracle\'s name for the set operator that SQLite and PostgreSQL call EXCEPT is ___.', accept: ['MINUS', 'minus'], why: 'Oracle uses MINUS (newer versions also accept EXCEPT).' },
    { topic: 'languages', type: 'mc', q: 'Where must you filter groups by an aggregate, such as `AVG(grade) > 7`?', choices: ['WHERE', 'HAVING', 'ORDER BY', 'FROM'], answer: 1, why: 'WHERE runs before grouping; HAVING filters the groups after it.' },
    { topic: 'languages', type: 'mc', q: 'Which of these statements can be undone with ROLLBACK?', choices: ['`TRUNCATE TABLE member`', '`DELETE FROM member`', '`DROP TABLE member PURGE`', '`ALTER TABLE member DROP COLUMN fee`'], answer: 1, why: 'DELETE is DML and waits for COMMIT. The other three are DDL: they commit at once.' },
    { topic: 'languages', type: 'tf', q: 'A composite primary key, such as `(team_id, shirt)`, must be written as an out-of-line constraint, after the columns.', answer: true, why: 'An inline constraint belongs to one column; a key over several columns goes after the column list.' },
    { topic: 'languages', type: 'mc', q: 'Which habit protects you before running an UPDATE or a DELETE?', choices: ['Running it twice', 'Running its WHERE as a SELECT first', 'Writing COMMIT before it', 'Dropping the indexes'], answer: 1, why: 'The SELECT shows exactly the rows the statement will change; then keep the same WHERE.' },
    { topic: 'constraints', type: 'tf', q: 'A table can have several UNIQUE constraints but only one primary key.', answer: true, why: 'There is one primary key; any other candidate key is declared UNIQUE.' },
    { topic: 'constraints', type: 'mc', q: 'An enrolment references a student with `ON DELETE CASCADE`. What happens when that student is deleted?', choices: ['The delete is rejected', 'Their enrolments are deleted too', 'The FK in their enrolments becomes NULL', 'Nothing: enrolments keep the old id'], answer: 1, why: 'CASCADE propagates the delete to the child rows.' },
    { topic: 'constraints', type: 'mc', q: 'In Oracle, what happens when you delete a parent row that has children and the foreign key has no ON DELETE clause?', choices: ['The children are deleted', 'The children\'s FK becomes NULL', 'The delete fails with ORA-02292', 'The parent is marked as deleted'], answer: 2, why: 'With no action, Oracle rejects the delete while children exist: "child record found".' },
    { topic: 'constraints', type: 'mc', q: 'Which ON DELETE actions does Oracle support?', choices: ['CASCADE, SET NULL and no action', 'CASCADE, RESTRICT and SET DEFAULT', 'Only CASCADE', 'It supports ON UPDATE CASCADE too'], answer: 0, why: 'Oracle has no RESTRICT, SET DEFAULT or ON UPDATE actions.' },
    { topic: 'constraints', type: 'tf', q: '`CHECK (grade BETWEEN 0 AND 10)` rejects a row whose grade is NULL.', answer: false, why: 'A CHECK fails only when the condition is false; with NULL it is unknown, so it passes. Add NOT NULL to require a value.' },
    { topic: 'constraints', type: 'fib', q: 'The clause that gives a column its value when an INSERT does not mention it is ___.', accept: ['DEFAULT', 'default'], why: 'For example `status VARCHAR2(10) DEFAULT \'open\' NOT NULL`.' },
    { topic: 'constraints', type: 'tf', q: 'In Oracle, an empty string \'\' is stored as NULL.', answer: true, why: 'Oracle does not distinguish the empty string from NULL: `WHERE name = \'\'` never matches any row.' },
    { topic: 'indexes', type: 'mc', q: 'Without any index on `email`, how does the DBMS find `WHERE email = \'x\'`?', choices: ['Binary search on the table', 'It reads every row (full scan)', 'It uses the primary key', 'It cannot answer the query'], answer: 1, why: 'The rows are not sorted by email, so every one must be checked.' },
    { topic: 'indexes', type: 'mc', q: 'With an index on `(city, signup_date)`, which filter can NOT use it to narrow the search?', choices: ['`city = \'Madrid\'`', '`city = \'Madrid\' AND signup_date > DATE \'2024-01-01\'`', '`signup_date > DATE \'2024-01-01\'`', '`city IN (\'Madrid\', \'Bilbao\')`'], answer: 2, why: 'Leftmost-prefix rule: without the first column the dates are spread all over the index.' },
    { topic: 'indexes', type: 'tf', q: 'Adding indexes makes INSERT and UPDATE faster.', answer: false, why: 'Each write must also update every index of the table, so writes get slower.' },
    { topic: 'indexes', type: 'mc', q: 'A query is answered from the index alone, without reading the table. That index is…', choices: ['clustered', 'covering for that query', 'a hash index', 'partial'], answer: 1, why: 'It contains every column the query needs.' },
    { topic: 'indexes', type: 'mc', q: 'Which Oracle index suits a column with 3 distinct values in a read-mostly data warehouse?', choices: ['Bitmap', 'Reverse key', 'Unique B-tree', 'None: Oracle has no such index'], answer: 0, why: 'Bitmap indexes are compact for low-cardinality columns, but they hurt concurrent writes.' },
    { topic: 'indexes', type: 'mc', q: 'Which index kind can answer `WHERE price BETWEEN 10 AND 20 ORDER BY price`?', choices: ['Hash', 'B-tree', 'GIN', 'None'], answer: 1, why: 'Only a sorted structure such as a B-tree serves ranges and ordering.' },
    { topic: 'indexes', type: 'tf', q: 'An index on a yes/no column usually helps a query that returns half of the table.', answer: false, why: 'With such low selectivity, reading the table directly is as cheap as going through the index.' },
    { topic: 'clustering', type: 'mc', q: 'How many clustered indexes can a table have?', choices: ['None', 'One', 'One per column', 'As many as needed'], answer: 1, why: 'The rows can be stored in only one physical order.' },
    { topic: 'clustering', type: 'tf', q: 'In MySQL InnoDB each table is clustered by its primary key.', answer: true, why: 'InnoDB stores the rows inside the primary-key B+ tree; secondary indexes point to the PK.' },
    { topic: 'clustering', type: 'mc', q: 'Which Oracle structure stores the rows of a table inside its primary-key B-tree?', choices: ['Table cluster', 'Index-organized table (ORGANIZATION INDEX)', 'Bitmap index', 'Partitioned table'], answer: 1, why: 'An IOT behaves like a clustered index.' },
    { topic: 'clustering', type: 'mc', q: 'After `CLUSTER orders USING orders_date_idx` in PostgreSQL, new rows…', choices: ['are kept in date order automatically', 'go wherever there is space, so the order decays', 'are rejected until CLUSTER runs again', 'go to a separate partition'], answer: 1, why: 'CLUSTER is a one-off rewrite; PostgreSQL tables are heaps.' },
    { topic: 'partitioning', type: 'mc', q: 'One partition per month of `order_date` is…', choices: ['range partitioning', 'list partitioning', 'hash partitioning', 'vertical partitioning'], answer: 0, why: 'Each partition holds an interval of the key.' },
    { topic: 'partitioning', type: 'fib', q: 'When the optimizer reads only the partitions that can match the WHERE, it is called partition ___.', accept: ['pruning'], why: 'Partition pruning skips every partition outside the filtered range.' },
    { topic: 'partitioning', type: 'tf', q: 'Dropping an old partition is usually much faster than deleting its rows with DELETE.', answer: true, why: 'Dropping removes a whole table at once; DELETE writes every row to the log.' },
    { topic: 'partitioning', type: 'mc', q: 'Spreading the rows of a table across several servers is…', choices: ['vertical partitioning', 'sharding', 'clustering', 'replication'], answer: 1, why: 'Sharding is horizontal partitioning across machines.' },
    { topic: 'efficiency', type: 'mc', q: 'With an index on `signup_date`, which condition can use it?', choices: ['`TO_CHAR(signup_date, \'YYYY\') = \'2024\'`', '`signup_date >= DATE \'2024-01-01\' AND signup_date < DATE \'2025-01-01\'`', '`TRUNC(signup_date, \'YYYY\') = DATE \'2024-01-01\'`', '`EXTRACT(YEAR FROM signup_date) = 2024`'], answer: 1, why: 'Only the bare column can be searched in the index; functions on it force a scan.' },
    { topic: 'efficiency', type: 'mc', q: 'A program reads 100 customers and then runs one query per customer for its orders. This is…', choices: ['a deadlock', 'the N+1 problem', 'partition pruning', 'a covering query'], answer: 1, why: '101 queries where one join would do.' },
    { topic: 'efficiency', type: 'tf', q: 'The optimizer chooses a plan using statistics about the data.', answer: true, why: 'It estimates costs from row counts and value distributions; ANALYZE refreshes them.' },
    { topic: 'efficiency', type: 'fib', q: 'In Oracle, the statement that stores the plan of a query without running it is EXPLAIN ___ FOR.', accept: ['PLAN', 'plan'], why: 'Then SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY) prints it. PostgreSQL and MySQL use plain EXPLAIN.' },
    { topic: 'efficiency', type: 'mc', q: 'An Oracle plan shows TABLE ACCESS FULL on a big table inside a selective join. The usual fix is…', choices: ['a bitmap index on every column', 'an index on the filtered or joined column', 'COMMIT before the query', 'SELECT *'], answer: 1, why: 'A full scan on a big table usually means a missing index on the filter or join column.' },
  ];

  DATA.en.SQL_SANDBOX = {
    intro: 'Write Oracle SQL against the sample tables of the course: `department`, `student`, `course` and `enrolment`. Open **Setup** to see how they are defined, or start from one of the examples.',
    setup: SCHOOL,
    examples: [
      { label: 'Students and grades', sql: `SELECT s.name, c.title, e.grade
FROM enrolment e
JOIN student s ON s.student_id = e.student_id
JOIN course  c ON c.course_id  = e.course_id
ORDER BY s.name;` },
      { label: 'Average per course', sql: `SELECT c.title, COUNT(e.student_id) AS students, ROUND(AVG(e.grade), 2) AS average
FROM course c LEFT JOIN enrolment e ON e.course_id = c.course_id
GROUP BY c.title
ORDER BY average DESC;` },
      { label: 'Courses with no students', sql: `SELECT c.course_id, c.title
FROM course c
WHERE NOT EXISTS (SELECT 1 FROM enrolment e WHERE e.course_id = c.course_id);` },
      { label: 'A transaction', sql: `UPDATE enrolment SET grade = grade + 1 WHERE course_id = 'C10';
SELECT * FROM enrolment WHERE course_id = 'C10';
ROLLBACK;
SELECT * FROM enrolment WHERE course_id = 'C10';` },
      { label: 'A query plan', sql: `EXPLAIN PLAN FOR
SELECT * FROM enrolment WHERE course_id = 'C10';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
CREATE INDEX idx_enrolment_course ON enrolment (course_id);
EXPLAIN PLAN FOR
SELECT * FROM enrolment WHERE course_id = 'C10';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);` },
      { label: 'Top 2 by grade', sql: `SELECT s.name, e.grade
FROM enrolment e JOIN student s ON s.student_id = e.student_id
ORDER BY e.grade DESC
FETCH FIRST 2 ROWS ONLY;` },
      { label: 'Set difference', sql: `SELECT student_id FROM student
MINUS
SELECT student_id FROM enrolment WHERE course_id = 'C20';` },
    ],
  };
})();
