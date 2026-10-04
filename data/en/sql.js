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
    languages: 'SQL languages',
    constraints: 'Constraints',
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
    { topic: 'languages', type: 'mc', q: 'Which sub-language does `ALTER TABLE` belong to?', choices: ['DDL', 'DML', 'DCL', 'TCL'], answer: 0, why: 'It changes the structure of a table, so it is data definition.' },
    { topic: 'languages', type: 'mc', q: 'Which statement is part of DCL?', choices: ['`COMMIT`', '`GRANT`', '`TRUNCATE`', '`MERGE`'], answer: 1, why: 'GRANT and REVOKE control privileges. COMMIT is TCL, TRUNCATE is DDL and MERGE is DML.' },
    { topic: 'languages', type: 'tf', q: 'A `DELETE` without a WHERE clause removes every row of the table.', answer: true, why: 'With no filter, every row matches.' },
    { topic: 'languages', type: 'fib', q: 'To undo all the changes of the current transaction you run ___.', accept: ['ROLLBACK', 'rollback'], why: 'ROLLBACK undoes everything since the transaction started; ROLLBACK TO SAVEPOINT undoes only what came after the savepoint.' },
    { topic: 'languages', type: 'mc', q: 'In Oracle, when does a transaction start?', choices: ['With the BEGIN statement', 'With your first INSERT, UPDATE or DELETE', 'With every SELECT', 'Only after SET TRANSACTION'], answer: 1, why: 'Oracle has no BEGIN for transactions (BEGIN starts a PL/SQL block): the first DML statement opens one, and COMMIT or ROLLBACK ends it.' },
    { topic: 'languages', type: 'tf', q: 'In Oracle, a CREATE TABLE in the middle of a transaction can be undone with ROLLBACK.', answer: false, why: 'DDL commits the open transaction before and after it, so nothing before it can be rolled back any more.' },
    { topic: 'languages', type: 'mc', q: 'Which query returns the first 5 rows in Oracle?', choices: ['`SELECT * FROM t LIMIT 5`', '`SELECT TOP 5 * FROM t`', '`SELECT * FROM t FETCH FIRST 5 ROWS ONLY`', '`SELECT * FROM t LIMIT 0, 5`'], answer: 2, why: 'LIMIT and TOP belong to other DBMSs. Oracle uses the standard FETCH FIRST … ROWS ONLY (12c onwards).' },
    { topic: 'languages', type: 'fib', q: 'Oracle\'s name for the set operator that SQLite and PostgreSQL call EXCEPT is ___.', accept: ['MINUS', 'minus'], why: 'Oracle uses MINUS (newer versions also accept EXCEPT).' },
    { topic: 'languages', type: 'mc', q: 'Where must you filter groups by an aggregate, such as `AVG(grade) > 7`?', choices: ['WHERE', 'HAVING', 'ORDER BY', 'FROM'], answer: 1, why: 'WHERE runs before grouping; HAVING filters the groups after it.' },
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
