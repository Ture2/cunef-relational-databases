'use strict';
/* SQL: concept cards (js/sql.js), quiz and sandbox.
   Card fields: those of js/concept-section.js, plus
     sql      { setup, query, expectError? }: a runnable SQLite example (js/sql-runner.js). The setup
              runs first in a fresh database; the query is what the student edits. expectError marks
              examples whose last statement fails on purpose (the self-check in the README uses it).
     code + dialect   a static example for features SQLite does not have (roles, partitions…).
   The runnable examples share the enrolment schema of the Normalization section (student, course,
   department, enrolment); the efficiency cards add a customer / orders table with many rows. */
(() => {
  const SCHOOL = `CREATE TABLE department (
  dept_id TEXT PRIMARY KEY,
  name    TEXT NOT NULL UNIQUE
);
CREATE TABLE student (
  student_id TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE
);
CREATE TABLE course (
  course_id TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  credits   REAL NOT NULL CHECK (credits > 0),
  dept_id   TEXT NOT NULL REFERENCES department (dept_id)
);
CREATE TABLE enrolment (
  student_id TEXT REFERENCES student (student_id) ON DELETE CASCADE,
  course_id  TEXT REFERENCES course (course_id),
  grade      REAL CHECK (grade BETWEEN 0 AND 10),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO department VALUES ('D01', 'Computing'), ('D02', 'Maths');
INSERT INTO student VALUES ('S01', 'Ana Ruiz', 'ana@uni.es'), ('S02', 'Luis Gil', 'luis@uni.es'), ('S03', 'Eva Sanz', NULL);
INSERT INTO course VALUES ('C10', 'Databases', 6, 'D01'), ('C11', 'Python', 4.5, 'D01'), ('C20', 'Statistics', 6, 'D02'), ('C30', 'Marketing', 3, 'D02');
INSERT INTO enrolment VALUES ('S01', 'C10', 8.5), ('S01', 'C20', 7.0), ('S02', 'C10', 6.5), ('S02', 'C11', 9.0), ('S03', 'C10', 5.0), ('S03', 'C11', 7.5);`;

  /* 50,000 customers and 100,000 orders, generated with a recursive query (about 0.2 s). */
  const SHOP = `CREATE TABLE customer (
  customer_id INTEGER PRIMARY KEY,
  email       TEXT NOT NULL,
  city        TEXT NOT NULL,
  signup_date TEXT NOT NULL
);
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customer (customer_id),
  order_date  TEXT NOT NULL,
  total       REAL NOT NULL
);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 50000)
INSERT INTO customer
SELECT i, 'user' || i || '@mail.com',
       CASE i % 5 WHEN 0 THEN 'Madrid' WHEN 1 THEN 'Barcelona' WHEN 2 THEN 'Valencia' WHEN 3 THEN 'Sevilla' ELSE 'Bilbao' END,
       date('2020-01-01', '+' || (i % 1500) || ' days')
FROM n;
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 100000)
INSERT INTO orders
SELECT i, 1 + (i * 7919) % 50000, date('2023-01-01', '+' || (i % 700) || ' days'), round(5 + (i % 400) * 0.75, 2)
FROM n;`;

  DATA.en.SQL_CONCEPTS = [
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
        '`ALTER TABLE` adds or removes columns and constraints on a table that already has data. `DROP TABLE` deletes the definition and all its rows. Run the example, then try `SELECT * FROM course;` after the DROP: the table is gone.',
      ],
      points: [
        'Types: `INTEGER`, `NUMERIC(p, s)`, `VARCHAR(n)` / `TEXT`, `DATE`, `TIMESTAMP`, `BOOLEAN`… (each DBMS has its own list).',
        'Each DDL statement updates the data dictionary, which you can query: here, `sqlite_master`.',
      ],
      mistake: 'Dropping and re-creating a table to change one column. `ALTER TABLE` keeps the rows; `DROP` loses them.',
      sql: {
        setup: '',
        query: `CREATE TABLE course (
  course_id TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  credits   REAL NOT NULL
);
ALTER TABLE course ADD COLUMN semester INTEGER;
INSERT INTO course VALUES ('C10', 'Databases', 6, 1);
SELECT * FROM course;
SELECT name, sql FROM sqlite_master WHERE type = 'table';
DROP TABLE course;
SELECT name FROM sqlite_master WHERE type = 'table';`,
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
      ],
      points: [
        'Joins follow the foreign keys: `enrolment.course_id = course.course_id`.',
        'The runner shows how many rows each INSERT, UPDATE or DELETE changed.',
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
        'SQLite is a single-user, embedded database and has no users, so this example is PostgreSQL and cannot run here.',
      ],
      points: [
        '`WITH GRANT OPTION` lets the receiver grant the same privilege to others; use it sparingly.',
        'REVOKE removes the privilege from that role; members lose it unless another role still grants it.',
      ],
      dialect: 'PostgreSQL · not runnable here',
      code: `CREATE ROLE teacher;
CREATE ROLE reporting;
CREATE USER ana PASSWORD 'change-me' IN ROLE teacher;

GRANT SELECT, INSERT, UPDATE ON enrolment TO teacher;
GRANT SELECT ON student, course TO teacher;

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
        'Most clients run in **autocommit** mode: each statement is its own transaction. `BEGIN` opens an explicit one that lasts until COMMIT or ROLLBACK.',
        'In the example, moving a student from one course to another is a delete plus an insert: both must happen, or neither.',
      ],
      points: [
        '`SAVEPOINT name` … `ROLLBACK TO name` undoes only the work after the savepoint.',
        'Keep transactions short: while one is open, it may hold locks that make others wait.',
      ],
      example: 'The second block changes a grade by mistake and rolls back to the savepoint: the move between courses is kept, the wrong grade is not.',
      mistake: 'Running a long script in autocommit mode. If it fails halfway, the first half stays applied and the database is left in a state nobody planned.',
      sql: {
        setup: SCHOOL,
        query: `BEGIN;
DELETE FROM enrolment WHERE student_id = 'S03' AND course_id = 'C11';
INSERT INTO enrolment VALUES ('S03', 'C20', NULL);
SAVEPOINT before_grades;
UPDATE enrolment SET grade = 10;              -- oops: every row
ROLLBACK TO before_grades;
COMMIT;
SELECT * FROM enrolment WHERE student_id = 'S03';
BEGIN;
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
        'When the parent row is deleted, the action decides: `RESTRICT` / `NO ACTION` (the default) rejects the delete while children exist; `CASCADE` deletes the children too; `SET NULL` empties the FK in the children; `SET DEFAULT` sets its default. The same choices exist `ON UPDATE` of the parent key.',
        'In the sample schema, deleting a student cascades to their enrolments, but a course with enrolments cannot be deleted.',
      ],
      points: [
        'CASCADE fits parts that make no sense alone (an enrolment without its student, an order line without its order).',
        'RESTRICT protects reference data (a course, a department).',
        'SQLite only checks foreign keys after `PRAGMA foreign_keys = ON`; the runner turns it on.',
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
        'DEFAULT fills mandatory columns sensibly: the current date, a status of \'pending\', a counter starting at 0.',
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
  loan_id   INTEGER PRIMARY KEY,
  book      TEXT NOT NULL,
  loan_date TEXT NOT NULL DEFAULT (date('now')),
  days      INTEGER NOT NULL DEFAULT 15,
  status    TEXT NOT NULL DEFAULT 'open',
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
        'Without an index on `email`, finding one customer means reading all 50,000 rows: the plan says **SCAN customer**. After `CREATE INDEX`, the plan says **SEARCH customer USING INDEX**, and the DBMS goes down the tree in a few steps (see the B+ tree card of the Theory section).',
        'The runner shows the time of each statement. Compare the two identical SELECTs, before and after the index.',
        '`EXPLAIN QUERY PLAN` (SQLite) or `EXPLAIN` (PostgreSQL, MySQL) shows the plan without running the query.',
      ],
      points: [
        'The primary key and each UNIQUE constraint already have an index.',
        'Foreign keys usually do **not** get one automatically; index them if you join or filter by them.',
      ],
      mistake: 'Thinking an index changes the result. It only changes how fast the DBMS finds the rows; the query returns exactly the same data.',
      sql: {
        setup: SHOP,
        query: `EXPLAIN QUERY PLAN SELECT * FROM customer WHERE email = 'user43210@mail.com';
SELECT * FROM customer WHERE email = 'user43210@mail.com';
CREATE INDEX idx_customer_email ON customer (email);
EXPLAIN QUERY PLAN SELECT * FROM customer WHERE email = 'user43210@mail.com';
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
        'When the query only uses columns that are in the index, the DBMS answers from the index: the plan says **USING COVERING INDEX**.',
      ],
      points: [
        'Leftmost-prefix rule: `(a, b, c)` serves filters on `a`, `a, b` and `a, b, c`.',
        'One composite index can replace several single-column ones.',
      ],
      mistake: 'Creating `(signup_date, city)` for queries that always fix the city and give a date range. With the range first, the second column cannot narrow the search.',
      sql: {
        setup: SHOP,
        query: `CREATE INDEX idx_city_date ON customer (city, signup_date);
EXPLAIN QUERY PLAN SELECT * FROM customer WHERE city = 'Madrid' AND signup_date >= '2023-01-01';
EXPLAIN QUERY PLAN SELECT * FROM customer WHERE signup_date >= '2023-01-01';
EXPLAIN QUERY PLAN SELECT city, signup_date FROM customer WHERE city = 'Sevilla';
SELECT COUNT(*) AS madrid_since_2023 FROM customer WHERE city = 'Madrid' AND signup_date >= '2023-01-01';`,
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
        setup: `CREATE TABLE plain_log (id INTEGER PRIMARY KEY, user_id INTEGER, action TEXT, at TEXT);
CREATE TABLE indexed_log (id INTEGER PRIMARY KEY, user_id INTEGER, action TEXT, at TEXT);
CREATE INDEX il_user ON indexed_log (user_id);
CREATE INDEX il_action ON indexed_log (action);
CREATE INDEX il_at ON indexed_log (at);`,
        query: `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 20000)
INSERT INTO plain_log SELECT i, i % 997, 'action' || (i % 13), datetime('2024-01-01', '+' || i || ' minutes') FROM n;
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 20000)
INSERT INTO indexed_log SELECT i, i % 997, 'action' || (i % 13), datetime('2024-01-01', '+' || i || ' minutes') FROM n;
SELECT name AS indexes_on_indexed_log FROM sqlite_master WHERE type = 'index' AND tbl_name = 'indexed_log';`,
      },
    },
    {
      id: 'index-types',
      hub: 'indexes',
      topic: 'indexes',
      title: 'Kinds of index',
      summary: 'The **B-tree** is the default and serves equality, ranges and sorting. Other kinds solve specific problems: **hash** for equality only, **bitmap** for few distinct values, **GIN** for values inside a document or array, **BRIN** for huge, naturally ordered tables.',
      body: [
        'Indexes can also be **partial** (only the rows that match a WHERE, such as open orders) or built on an **expression** (`lower(email)`), so a query that uses the same expression can use the index.',
        'Which kinds exist depends on the DBMS: PostgreSQL has all of those below except bitmap (it builds bitmaps at query time); Oracle has bitmap indexes; MySQL InnoDB uses B-trees almost exclusively.',
      ],
      table: {
        caption: 'Main index kinds',
        head: ['Kind', 'Good for', 'Not for'],
        rows: [
          ['B-tree / B+ tree', '=, <, >, BETWEEN, ORDER BY, prefix LIKE \'abc%\'', 'Searching inside text or arrays'],
          ['Hash', 'Equality only (=)', 'Ranges and sorting'],
          ['Bitmap', 'Columns with few distinct values in read-mostly tables (data warehouses)', 'Tables with many concurrent writes'],
          ['GIN / inverted', 'Full-text search, JSON keys, array elements', 'Simple scalar columns'],
          ['BRIN', 'Very large tables ordered by insertion (dates in a log)', 'Randomly ordered data'],
        ],
      },
      dialect: 'PostgreSQL · not runnable here',
      code: `CREATE INDEX orders_customer_idx ON orders (customer_id);            -- B-tree (default)
CREATE INDEX session_token_idx  ON session USING hash (token);        -- equality only
CREATE INDEX product_tags_idx   ON product USING gin (tags);          -- tags is text[]
CREATE INDEX log_at_brin        ON access_log USING brin (at);        -- huge, append-only
CREATE INDEX open_orders_idx    ON orders (order_date) WHERE status = 'open';   -- partial
CREATE INDEX customer_email_ci  ON customer (lower(email));           -- expression`,
      mistake: 'Choosing a hash index for a column used in ranges or ORDER BY. It cannot answer either; only a B-tree can.',
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
        'SQLite does it with `WITHOUT ROWID` tables: the rows are stored in the primary-key B-tree. In the example the plan searches `USING PRIMARY KEY`, with no extra lookup.',
      ],
      points: [
        'Choose a clustering key that is short, does not change, and matches frequent range queries.',
        'Random keys (such as random UUIDs) scatter inserts all over a clustered index; increasing keys append at the end.',
      ],
      mistake: 'Confusing a **clustered index** with a **database cluster**. The second is a group of servers working together (replication, high availability), an unrelated meaning of the word.',
      sql: {
        setup: '',
        query: `CREATE TABLE enrolment_by_course (
  course_id  TEXT,
  student_id TEXT,
  grade      REAL,
  PRIMARY KEY (course_id, student_id)
) WITHOUT ROWID;
INSERT INTO enrolment_by_course VALUES
  ('C20', 'S01', 7.0), ('C10', 'S03', 5.0), ('C10', 'S01', 8.5), ('C11', 'S02', 9.0), ('C10', 'S02', 6.5);
SELECT * FROM enrolment_by_course;           -- stored, and returned, in key order
EXPLAIN QUERY PLAN SELECT * FROM enrolment_by_course WHERE course_id = 'C10';`,
      },
    },
    {
      id: 'physical-order',
      hub: 'clustering',
      topic: 'clustering',
      title: 'Physical order in PostgreSQL and Oracle',
      summary: 'PostgreSQL stores tables as unordered **heaps**. Its `CLUSTER` command rewrites a table once in the order of an index, but new rows are not kept in that order. Oracle offers index-organized tables and **table clusters**.',
      body: [
        'After `CLUSTER orders USING orders_date_idx`, rows of the same date sit together, so a date range reads few blocks. New and updated rows go wherever there is room, so the order decays; run CLUSTER again in a maintenance window. It locks the table while it rewrites it.',
        'Oracle **index-organized tables** behave like a clustered index. Its **table clusters** go further: rows of several tables that share a key (a department and its employees) are stored in the same blocks, which speeds up joins on that key.',
      ],
      dialect: 'PostgreSQL · not runnable here',
      code: `CREATE INDEX orders_date_idx ON orders (order_date);
CLUSTER orders USING orders_date_idx;     -- rewrites the table in date order (locks it)
ANALYZE orders;                           -- refresh statistics after the rewrite

-- How well the physical order follows a column (1 = perfectly sorted):
SELECT attname, correlation FROM pg_stats
WHERE tablename = 'orders' AND attname = 'order_date';`,
      mistake: 'Expecting CLUSTER to keep the table sorted. It is a one-off rewrite; only a true clustered index keeps the order as rows arrive.',
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
        'SQLite has no partitioning, so the example is PostgreSQL.',
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
      dialect: 'PostgreSQL · not runnable here',
      code: `CREATE TABLE orders (
  order_id    bigint,
  customer_id bigint NOT NULL,
  order_date  date   NOT NULL,
  total       numeric(10, 2) NOT NULL,
  PRIMARY KEY (order_id, order_date)          -- the partition key must be part of it
) PARTITION BY RANGE (order_date);

CREATE TABLE orders_2025_01 PARTITION OF orders
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE orders_2025_02 PARTITION OF orders
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE orders_default PARTITION OF orders DEFAULT;   -- rows outside every range

CREATE INDEX ON orders (customer_id);       -- created on every partition`,
      mistake: 'Partitioning a small table. Below many millions of rows, a good index is usually simpler and just as fast.',
    },
    {
      id: 'pruning',
      hub: 'partitioning',
      topic: 'partitioning',
      title: 'Partition pruning and maintenance',
      summary: 'When the WHERE fixes the partition key, the optimizer reads only the matching partitions: **partition pruning**. Old data can then be removed by dropping a whole partition instead of deleting millions of rows.',
      body: [
        'With monthly partitions, a query for February 2025 reads only `orders_2025_02`; the plan does not even mention the other months. A query that does not filter on `order_date` must visit every partition, which can be slower than one big indexed table.',
        'Retention becomes cheap: `DETACH` or `DROP` the oldest partition. That takes milliseconds, while `DELETE … WHERE order_date < …` writes every deleted row to the log and leaves dead space behind.',
      ],
      points: [
        'Choose the partition key from the most frequent filters.',
        'Unique constraints and the primary key must include the partition key.',
      ],
      dialect: 'PostgreSQL · not runnable here',
      code: `EXPLAIN SELECT SUM(total) FROM orders
WHERE order_date >= '2025-02-01' AND order_date < '2025-03-01';
--  Aggregate
--    ->  Seq Scan on orders_2025_02 orders     <- only one partition is read

ALTER TABLE orders DETACH PARTITION orders_2025_01;   -- keep it as a normal table…
DROP TABLE orders_2025_01;                            -- …or remove a whole month at once`,
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
      summary: 'SQL says **what** you want; the **optimizer** decides **how**: which index, which join order, which algorithm. **EXPLAIN** shows that plan, and the plan is where slow queries are understood.',
      body: [
        'The optimizer estimates the cost of several plans from **statistics** about the data (number of rows, distinct values) and picks the cheapest. Refresh them after big changes: `ANALYZE` in SQLite and PostgreSQL, `ANALYZE TABLE` in MySQL.',
        'Look for a **SCAN** (full table read) on a big table inside a join or a selective filter: it usually means a missing index. In the example, the join of each customer with their orders scans `orders` until the foreign key is indexed.',
        'PostgreSQL\'s `EXPLAIN ANALYZE` also runs the query and shows real times and row counts next to the estimates.',
      ],
      points: [
        'SCAN = read every row; SEARCH … USING INDEX = go down an index.',
        'USE TEMP B-TREE FOR ORDER BY = an extra sort; an index in that order avoids it.',
      ],
      mistake: 'Optimizing by intuition. Read the plan first: the slow part is often not where you expect.',
      sql: {
        setup: SHOP,
        query: `EXPLAIN QUERY PLAN
SELECT c.city, SUM(o.total) FROM customer c JOIN orders o ON o.customer_id = c.customer_id
WHERE c.customer_id BETWEEN 100 AND 200 GROUP BY c.city;
SELECT c.city, ROUND(SUM(o.total), 2) AS spent FROM customer c JOIN orders o ON o.customer_id = c.customer_id
WHERE c.customer_id BETWEEN 100 AND 200 GROUP BY c.city;
CREATE INDEX idx_orders_customer ON orders (customer_id);
ANALYZE;
EXPLAIN QUERY PLAN
SELECT c.city, SUM(o.total) FROM customer c JOIN orders o ON o.customer_id = c.customer_id
WHERE c.customer_id BETWEEN 100 AND 200 GROUP BY c.city;
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
        'A condition that can use an index is called **sargable** (from search argument). `signup_date >= \'2024-01-01\'` is sargable; `substr(signup_date, 1, 4) = \'2024\'` is not, even though it means the same, because the index is sorted by `signup_date`, not by its first four characters.',
        'Rewrite the condition on the column (a date range instead of extracting the year), or create an **expression index** on exactly the expression you query, as with `lower(email)` in the example.',
        'Read the first plan carefully: it says **SCAN** … USING COVERING INDEX. The DBMS reads the whole index instead of the whole table, because the index is smaller, but it still visits every entry. Only **SEARCH** means it went straight to the matching part.',
        'The same happens with `LIKE \'%text\'` (a leading wildcard) and with arithmetic on the column (`price * 1.21 > 100`).',
      ],
      mistake: 'Adding an index and assuming the query will use it. Check the plan; a function on the column is enough to make the index useless.',
      sql: {
        setup: `${SHOP}
CREATE INDEX idx_signup ON customer (signup_date);
CREATE INDEX idx_email ON customer (email);`,
        query: `EXPLAIN QUERY PLAN SELECT COUNT(*) FROM customer WHERE substr(signup_date, 1, 4) = '2023';
EXPLAIN QUERY PLAN SELECT COUNT(*) FROM customer WHERE signup_date >= '2023-01-01' AND signup_date < '2024-01-01';
EXPLAIN QUERY PLAN SELECT * FROM customer WHERE lower(email) = 'user77@mail.com';
CREATE INDEX idx_email_lower ON customer (lower(email));
EXPLAIN QUERY PLAN SELECT * FROM customer WHERE lower(email) = 'user77@mail.com';`,
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
        'Paginate with `ORDER BY … LIMIT`, ideally on an indexed column.',
        'Join and filter on indexed keys, and keep transactions short.',
      ],
      example: 'The last query of the example answers "top 5 cities by spending in 2024" with one statement, instead of reading every order into the program.',
      mistake: 'Fetching a whole table to filter it in the application. The database can use indexes and send only the matching rows; the program can do neither.',
      sql: {
        setup: `${SHOP}
CREATE INDEX idx_orders_customer ON orders (customer_id);`,
        query: `-- "Has customer 42 ordered anything?": EXISTS can stop at the first order
SELECT EXISTS (SELECT 1 FROM orders WHERE customer_id = 42) AS has_orders;
-- One set-based statement instead of a loop over every order
UPDATE orders SET total = round(total * 0.9, 2) WHERE order_date < '2023-02-01';
-- Only the columns and rows needed, aggregated in the database
SELECT c.city, COUNT(*) AS orders, ROUND(SUM(o.total), 2) AS spent
FROM orders o JOIN customer c ON c.customer_id = o.customer_id
WHERE o.order_date BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY c.city
ORDER BY spent DESC
LIMIT 5;`,
      },
    },
  ];

  DATA.en.SQL_QUIZ_TOPICS = {
    languages: 'SQL languages',
    constraints: 'Constraints',
    indexes: 'Indexes',
    clustering: 'Clustering',
    partitioning: 'Partitioning',
    efficiency: 'Efficiency',
  };

  DATA.en.SQL_QUIZ = [
    { topic: 'languages', type: 'mc', q: 'Which sub-language does `ALTER TABLE` belong to?', choices: ['DDL', 'DML', 'DCL', 'TCL'], answer: 0, why: 'It changes the structure of a table, so it is data definition.' },
    { topic: 'languages', type: 'mc', q: 'Which statement is part of DCL?', choices: ['`COMMIT`', '`GRANT`', '`TRUNCATE`', '`MERGE`'], answer: 1, why: 'GRANT and REVOKE control privileges. COMMIT is TCL, TRUNCATE is DDL and MERGE is DML.' },
    { topic: 'languages', type: 'tf', q: 'A `DELETE` without a WHERE clause removes every row of the table.', answer: true, why: 'With no filter, every row matches.' },
    { topic: 'languages', type: 'fib', q: 'To undo all the changes of the current transaction you run ___.', accept: ['ROLLBACK', 'rollback'], why: 'ROLLBACK undoes everything since BEGIN; ROLLBACK TO undoes only what came after a savepoint.' },
    { topic: 'languages', type: 'mc', q: 'In autocommit mode…', choices: ['nothing is saved until COMMIT', 'each statement is a transaction of its own', 'only DDL is committed', 'savepoints are created automatically'], answer: 1, why: 'Every statement commits as soon as it succeeds; BEGIN opens a longer transaction.' },
    { topic: 'languages', type: 'mc', q: 'Where must you filter groups by an aggregate, such as `AVG(grade) > 7`?', choices: ['WHERE', 'HAVING', 'ORDER BY', 'FROM'], answer: 1, why: 'WHERE runs before grouping; HAVING filters the groups after it.' },
    { topic: 'constraints', type: 'tf', q: 'A table can have several UNIQUE constraints but only one primary key.', answer: true, why: 'There is one primary key; any other candidate key is declared UNIQUE.' },
    { topic: 'constraints', type: 'mc', q: 'An enrolment references a student with `ON DELETE CASCADE`. What happens when that student is deleted?', choices: ['The delete is rejected', 'Their enrolments are deleted too', 'The FK in their enrolments becomes NULL', 'Nothing: enrolments keep the old id'], answer: 1, why: 'CASCADE propagates the delete to the child rows.' },
    { topic: 'constraints', type: 'mc', q: 'Which referential action is the default in standard SQL?', choices: ['CASCADE', 'SET NULL', 'NO ACTION / RESTRICT', 'SET DEFAULT'], answer: 2, why: 'By default a parent row with children cannot be deleted.' },
    { topic: 'constraints', type: 'tf', q: '`CHECK (grade BETWEEN 0 AND 10)` rejects a row whose grade is NULL.', answer: false, why: 'A CHECK fails only when the condition is false; with NULL it is unknown, so it passes. Add NOT NULL to require a value.' },
    { topic: 'constraints', type: 'fib', q: 'The clause that gives a column its value when an INSERT does not mention it is ___.', accept: ['DEFAULT', 'default'], why: 'For example `status TEXT DEFAULT \'open\'`.' },
    { topic: 'indexes', type: 'mc', q: 'Without any index on `email`, how does the DBMS find `WHERE email = \'x\'`?', choices: ['Binary search on the table', 'It reads every row (full scan)', 'It uses the primary key', 'It cannot answer the query'], answer: 1, why: 'The rows are not sorted by email, so every one must be checked.' },
    { topic: 'indexes', type: 'mc', q: 'With an index on `(city, signup_date)`, which filter can NOT use it to narrow the search?', choices: ['`city = \'Madrid\'`', '`city = \'Madrid\' AND signup_date > \'2024-01-01\'`', '`signup_date > \'2024-01-01\'`', '`city IN (\'Madrid\', \'Bilbao\')`'], answer: 2, why: 'Leftmost-prefix rule: without the first column the dates are spread all over the index.' },
    { topic: 'indexes', type: 'tf', q: 'Adding indexes makes INSERT and UPDATE faster.', answer: false, why: 'Each write must also update every index of the table, so writes get slower.' },
    { topic: 'indexes', type: 'mc', q: 'A query is answered from the index alone, without reading the table. That index is…', choices: ['clustered', 'covering for that query', 'a hash index', 'partial'], answer: 1, why: 'It contains every column the query needs.' },
    { topic: 'indexes', type: 'mc', q: 'Which index kind can answer `WHERE price BETWEEN 10 AND 20 ORDER BY price`?', choices: ['Hash', 'B-tree', 'GIN', 'None'], answer: 1, why: 'Only a sorted structure such as a B-tree serves ranges and ordering.' },
    { topic: 'indexes', type: 'tf', q: 'An index on a yes/no column usually helps a query that returns half of the table.', answer: false, why: 'With such low selectivity, reading the table directly is as cheap as going through the index.' },
    { topic: 'clustering', type: 'mc', q: 'How many clustered indexes can a table have?', choices: ['None', 'One', 'One per column', 'As many as needed'], answer: 1, why: 'The rows can be stored in only one physical order.' },
    { topic: 'clustering', type: 'tf', q: 'In MySQL InnoDB each table is clustered by its primary key.', answer: true, why: 'InnoDB stores the rows inside the primary-key B+ tree; secondary indexes point to the PK.' },
    { topic: 'clustering', type: 'mc', q: 'After `CLUSTER orders USING orders_date_idx` in PostgreSQL, new rows…', choices: ['are kept in date order automatically', 'go wherever there is space, so the order decays', 'are rejected until CLUSTER runs again', 'go to a separate partition'], answer: 1, why: 'CLUSTER is a one-off rewrite; PostgreSQL tables are heaps.' },
    { topic: 'partitioning', type: 'mc', q: 'One partition per month of `order_date` is…', choices: ['range partitioning', 'list partitioning', 'hash partitioning', 'vertical partitioning'], answer: 0, why: 'Each partition holds an interval of the key.' },
    { topic: 'partitioning', type: 'fib', q: 'When the optimizer reads only the partitions that can match the WHERE, it is called partition ___.', accept: ['pruning'], why: 'Partition pruning skips every partition outside the filtered range.' },
    { topic: 'partitioning', type: 'tf', q: 'Dropping an old partition is usually much faster than deleting its rows with DELETE.', answer: true, why: 'Dropping removes a whole table at once; DELETE writes every row to the log.' },
    { topic: 'partitioning', type: 'mc', q: 'Spreading the rows of a table across several servers is…', choices: ['vertical partitioning', 'sharding', 'clustering', 'replication'], answer: 1, why: 'Sharding is horizontal partitioning across machines.' },
    { topic: 'efficiency', type: 'mc', q: 'With an index on `signup_date`, which condition can use it?', choices: ['`substr(signup_date, 1, 4) = \'2024\'`', '`signup_date >= \'2024-01-01\' AND signup_date < \'2025-01-01\'`', '`signup_date || \'\' = \'2024-05-01\'`', '`strftime(\'%Y\', signup_date) = \'2024\'`'], answer: 1, why: 'Only the bare column can be searched in the index; functions on it force a scan.' },
    { topic: 'efficiency', type: 'mc', q: 'A program reads 100 customers and then runs one query per customer for its orders. This is…', choices: ['a deadlock', 'the N+1 problem', 'partition pruning', 'a covering query'], answer: 1, why: '101 queries where one join would do.' },
    { topic: 'efficiency', type: 'tf', q: 'The optimizer chooses a plan using statistics about the data.', answer: true, why: 'It estimates costs from row counts and value distributions; ANALYZE refreshes them.' },
    { topic: 'efficiency', type: 'fib', q: 'The statement that shows the plan of a query without running it is ___ (in PostgreSQL and MySQL).', accept: ['EXPLAIN', 'explain'], why: 'SQLite uses EXPLAIN QUERY PLAN; PostgreSQL adds EXPLAIN ANALYZE to also run it.' },
  ];

  DATA.en.SQL_SANDBOX = {
    intro: 'Write any SQL against the sample tables of the course: `department`, `student`, `course` and `enrolment`. Open **Setup** to see how they are defined, or start from one of the examples.',
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
      { label: 'A transaction', sql: `BEGIN;
UPDATE enrolment SET grade = grade + 1 WHERE course_id = 'C10';
SELECT * FROM enrolment WHERE course_id = 'C10';
ROLLBACK;
SELECT * FROM enrolment WHERE course_id = 'C10';` },
      { label: 'A query plan', sql: `EXPLAIN QUERY PLAN
SELECT * FROM enrolment WHERE course_id = 'C10';
CREATE INDEX idx_enrolment_course ON enrolment (course_id);
EXPLAIN QUERY PLAN
SELECT * FROM enrolment WHERE course_id = 'C10';` },
    ],
  };
})();
