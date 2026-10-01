'use strict';
/* Theory (Topic 1, Introduction to databases): concept cards and quiz.
   Sources: content/translations/tema1-introduccion/translated.md (English notes),
   extracted.md (Spanish original) and glossary.json; quiz questions transcribed from
   quizzes/Quiz_1_Block_I_Introduction_to_Databases_and_DBMS.md and checked against
   scripts/build_quizzes_qti.js (essays skipped). Items marked `extra: true` are not in
   Quiz 1; they are grounded in the notes. `hub` and `topic` keys match THEORY_QUIZ_TOPICS. */

DATA.en.THEORY_QUIZ_TOPICS = {
  info: 'Information systems',
  files: 'Files vs databases',
  dbms: 'The DBMS',
  acid: 'Transactions (ACID)',
  levels: 'Abstraction levels',
  storage: 'Storage and efficiency',
  index: 'File organization and indexes',
  lifecycle: 'Data lifecycle',
};

DATA.en.THEORY_CONCEPTS = [
  /* ---- 1. Information systems ------------------------------------------------ */
  { id: 'information-system', hub: 'info', topic: 'info', title: 'Information system',
    summary: 'The set of elements, ordered and related to one another, that follow rules and give an organization the information it needs to fulfil its purpose.',
    body: [
      '**Data** are the raw entities and facts needed to communicate, internal or external to the organization. An **entity** is a concrete element with its own characteristics (a customer, a product); a **fact** is an action, transaction or relationship between entities (a purchase, a transfer). **Information** is data made intelligible: it increases or refines our knowledge of something.',
      'Data usually reach the information system through **ETL** processes (Extract, Load and Transform): they are pulled from sources such as apps, sensors or partner files, loaded and transformed into a usable shape.',
      'An organization needs information that is **complete** (completeness) and **reliable** (reliability); only then can it manage its resources effectively.',
    ],
    points: [
      '**Completeness**: nothing that is needed is missing, neither data nor functional information such as business rules.',
      '**Reliability** has three facets: **data accuracy** (stored values and calculations are correct), **availability** (the system is up as much of the time as possible, agreed in an SLA, Service Level Agreement) and **consistency** (the same data look the same everywhere and business rules are applied uniformly).',
    ],
    example: 'A **99.999%** availability SLA leaves 0.001% of a year for failures: 0.00001 × 525,600 minutes ≈ **5.26 minutes of downtime per year**. A 99.9% SLA would allow about 8.76 hours.',
    mistake: 'Treating data and information as synonyms. "Balance = 1,250" is a datum; "this customer has had a balance under 2,000 for six months, so offer a credit card" is information.' },

  { id: 'is-components', hub: 'info', topic: 'info', title: 'Components of an information system',
    summary: 'An information system is made of contents, physical equipment, logical equipment and people.',
    body: [
      'Building an information system is also a project: its managers set stages and strategies to guarantee the quality of the software and the data structures within reasonable deadlines and costs, and to give the whole organization a homogeneous frame of reference (standards).',
    ],
    points: [
      '**Contents**: the data and information, internal and/or external to the organization.',
      '**Physical equipment (hardware)**: servers, networks, storage. Either **on-premise** (you buy the hardware) or **cloud** (pay as you go).',
      '**Logical equipment (software)**: architectures, cloud computing and specialized software, e.g. a **multi-layer architecture** with independent layers vs **SOA** (Service-Oriented Architecture, microservices).',
      '**People (human resources)**: system users, DBA (database administrator), data engineer, data analyst, data architect and data scientist.',
    ],
    example: 'An online bookshop: **contents** = catalogue, customers, orders and the publishers\' price lists; **hardware** = two cloud database servers rented by the hour; **software** = a web shop, a payments microservice and the DBMS; **people** = customers and staff (users), a DBA, a data engineer who loads the publishers\' files every night and an analyst who builds the sales dashboard.' },

  { id: 'is-pyramid', hub: 'info', topic: 'info', title: 'The information system pyramid',
    summary: 'The hierarchical levels of information in an organization: the higher the level, the more summarized the information.',
    body: [
      'At the base, the **operational level** (TPS/OLTP, Transaction Processing System / Online Transactional Processing) processes transactions. Above it, the **knowledge level** (MIS, Management Information System) tracks and controls; the **tactical level** (DSS, Decision Support System) analyses and simulates; and the **strategic level** (EIS/ESS, Executive Information/Support System) delivers strategic information to top management.',
      'Going up, volume and detail decrease while the time horizon grows: from real time to years.',
    ],
    table: {
      caption: 'Levels of the pyramid, with a bank and a retailer as examples',
      head: ['Level', 'Volume · detail · use · horizon', 'Bank', 'Retailer'],
      rows: [
        ['Operational (TPS/OLTP)', 'Very high · maximum · continuous · real time', 'Records each card payment and ATM withdrawal the instant it happens', 'Each till sale updates the stock of the store'],
        ['Knowledge (MIS)', 'High · medium · daily/weekly · days/weeks', 'Daily report of payments and overdrafts per branch', 'Weekly sales and stock-out report per store'],
        ['Tactical (DSS)', 'Medium · low · monthly · months/years', 'Simulates the effect of raising the mortgage rate 0.5 points', 'Analyses which products to promote next quarter'],
        ['Strategic (EIS/ESS)', 'Low · minimum · quarterly · years', 'Board dashboard: market share and risk per country', 'Decides whether to open 20 stores in Portugal'],
      ],
    },
    example: 'One card payment of 42.50 € at a supermarket is a single OLTP row. The MIS adds up the day (1.2 million payments); the DSS compares months; the EIS shows the board one number: card revenue grew 6% this year.',
    figure: { kind: 'pyramid' },
    caption: 'Each level summarizes the one below: fewer, more aggregated data and a longer time horizon as you go up.' },

  /* ---- 2. Files vs databases ------------------------------------------------- */
  { id: 'file-problems', hub: 'files', topic: 'files', title: 'Problems of file-based systems',
    summary: 'Managing an information system with separate files (xlsx, txt, csv...) leads to redundancy, inconsistency, structural dependence, no integrity and limited access.',
    body: [
      'Each department keeps its own files, written for its own programs. Nothing ties them together, so the same fact is stored several times and nobody checks it. It is data processing without control, as if everything were written on paper.',
    ],
    points: [
      '**Redundancy**: the same data are repeated in different files.',
      '**Inconsistency**: one thing is referred to in different ways ("Alberto López" in one file, "A. López" in another), or a copy is updated and the other is not.',
      '**Isolation of data**: data scattered across files with different formats are hard to combine in one query.',
      '**Dependence on the file structure**: programs know the exact layout of each file; adding a field means rewriting every program that reads it.',
      '**No data integrity**: there are no validations, so an age of -20 or a sale of a non-existent product is accepted.',
      '**Limited access (concurrency)**: only one application or user can modify a file at a time.',
    ],
    example: 'HR keeps `employees_hr.csv` and Payroll keeps `employees_payroll.xlsx`, both with the employee\'s address. Ana López moves; HR updates its file, Payroll does not. In March her payslip goes to the old address: **redundancy** (two copies) caused an **inconsistency** (two different truths). Joining both files to list "salary per department" needs a hand-written script (**isolation**), and when Payroll adds an IBAN column, the HR report program breaks (**dependence**).',
    widget: 'files-vs-db' },

  { id: 'database', hub: 'files', topic: 'files', title: 'What a database adds',
    summary: 'A database is a set of related data that together support the information system of an organization: exhaustive, non-redundant and structured.',
    body: [
      'The data are **exhaustive** (everything needed is there), **non-redundant** (nothing is repeated) and **structured** (fixed, predictable format). They are centralized in a DBMS, and several applications access them simultaneously under centralized control and quality rules: data processing with a supervisor that checks everything automatically.',
    ],
    points: [
      '**No redundancy**: each datum is stored once.',
      '**Consistency**: data are uniform for everybody.',
      '**Independence**: changes of structure do not affect the programs.',
      '**Concurrent access**: several users at the same time.',
      '**Integrity**: automatic validations and relationships between the data.',
    ],
    example: 'HR and Payroll now share one table `employees` with one row for Ana López (id 1043). When HR changes her address, Payroll reads the new one in the next query, because there is only one copy. A rule `CHECK (salary > 0)` rejects a negative salary from any application, and both departments can update different employees at the same moment.',
    figure: { kind: 'files-vs-db' },
    caption: 'Above: each department keeps its own copy of the data. Below: all applications go through one DBMS to a single shared copy.' },

  { id: 'schema-languages', hub: 'files', topic: 'files', title: 'Schema, sub-schemas and languages (DDL / DML)',
    summary: 'The schema is the conceptual organization of the database; sub-schemas are the parts that each user or application sees; DDL defines them and DML works with the data.',
    body: [
      'The **schema** is the conceptual organization of the whole database, under the responsibility of the DBA. A **sub-schema** is the part of the database that a user or application sees, with its own criteria and restrictions. The terms come from the CODASYL DBTG (Data Base Task Group of the Conference on Data Systems Languages).',
      'The **Data Management Language** covers the management and manipulation of data. Its **DDL** (Data Definition Language) defines the elements of the schema (and, with a sub-schema DDL, of the sub-schemas): `CREATE`, `ALTER`, `RENAME`, `COMMENT`, `TRUNCATE`, `DROP`. Its **DML** (Data Manipulation Language) works with the data: `SELECT`, `INSERT`, `UPDATE`, `DELETE`.',
    ],
    table: {
      caption: 'DDL commands (structure)',
      head: ['Command', 'What it does', 'Syntax'],
      rows: [
        ['`CREATE`', 'Creates a table and its columns with their data types', '`CREATE TABLE`'],
        ['`ALTER`', 'Renames columns, adds or removes a column', '`ALTER TABLE`'],
        ['`RENAME`', 'Changes the name of the table', '`RENAME TABLE`'],
        ['`COMMENT`', 'Adds an explanation to the SQL code for other team members', '`--` or `/* ... */`'],
        ['`TRUNCATE`', 'Deletes the data of a table without deleting the table', '`TRUNCATE TABLE`'],
        ['`DROP`', 'Deletes the table together with its data', '`DROP TABLE`'],
      ],
    },
    code: `-- DDL: define the structure
CREATE TABLE employees (
  id         INT           PRIMARY KEY,
  name       VARCHAR(50)   NOT NULL,
  department INT,
  salary     DECIMAL(10,2)
);

-- DML: work with the data
INSERT INTO employees (id, name, department, salary)
VALUES (1, 'Ana', 10, 2000.00),
       (2, 'Luis', 10, 2500.00),
       (3, 'Marta', 20, 3000.00);

UPDATE employees SET salary = salary * 1.05 WHERE department = 10;

SELECT name, salary FROM employees WHERE department = 10;
-- Ana 2100.00, Luis 2625.00`,
    example: 'A sub-schema for the reception app of a gym could be a view with only `name` and `membership_status` of each member: reception never sees bank details. The `UPDATE` above raises only department 10; without `WHERE` it would raise all three employees.',
    mistake: 'Confusing `TRUNCATE`/`DELETE` with `DROP`. After `TRUNCATE TABLE employees` the empty table is still there; after `DROP TABLE employees` it has to be created again.' },

  /* ---- 3. The DBMS ------------------------------------------------------------ */
  { id: 'dbms', hub: 'dbms', topic: 'dbms', title: 'The DBMS and its architecture',
    summary: 'A DBMS is a coordinated set of programs, procedures and languages that gives both non-technical users and data specialists the means to describe, retrieve and manipulate data, keeping their integrity, confidentiality and security.',
    body: [
      'Internally, a DBMS has two big parts. The **query processor** receives what users write: the **DDL interpreter** turns schema definitions into entries of the **data dictionary**; the **DML compiler** (using statistics from the disk) turns queries into an execution plan; the **embedded DML precompiler** handles SQL inside application programs, producing **object code**; and the **query evaluation engine** runs the plans.',
      'The **storage manager** connects them with the disk: the **transaction manager** (ACID), the **buffer manager** (which blocks are kept in memory) and the **file manager** (data files and indexes on disk).',
    ],
    points: [
      'Security management; installation and configuration of the database; communication management.',
      'Creation and specification of the data dictionary; creating and administering the physical structure of the database.',
      'Data manipulation and creation of user applications.',
      'Export and import of data to and from other systems.',
      'Creating and restoring backups; recovery in case of disaster.',
    ],
    example: 'A cashier\'s app runs `SELECT balance FROM accounts WHERE account_id = \'A123\'`. The DML compiler checks the data dictionary (the table and column exist), uses the statistics to choose the index on `account_id`, the evaluation engine asks the buffer manager for the block, and the file manager reads it from disk only if it is not already in memory.',
    figure: { kind: 'dbms-architecture' },
    caption: 'Users at the top, the DBMS in the middle (query processor and storage manager) and the disk at the bottom (data dictionary, statistics, indexes and data files).' },

  { id: 'dbms-properties', hub: 'dbms', topic: 'dbms', title: 'Properties of a DBMS',
    summary: 'A DBMS is self-describing, isolates programs from data, offers an abstract view and several views of the data, shares data among users, and provides security and efficiency.',
    points: [
      '**Self-describing**: the definition of the database is kept in a special database, the **catalog**, which stores the structure as **metadata**.',
      '**Program-data isolation**: the structure is separate from the programs, so the database can change without modifying (all) the programs that use it.',
      '**Abstract view of data**: a conceptual representation that hides storage details and how operations are implemented.',
      '**Several views of the data**: a subset (a teacher sees only the students enrolled in their subject), a partial view (confidential data hidden by user type) or virtual data derived from others (totals and summaries not stored in the database).',
      '**Data sharing among many users**: one single store; **transactions** (units of work that group one or more operations and guarantee the ACID properties) control concurrent access.',
      '**Security** against unauthorized access and system failures.',
      '**Efficiency**: validations, simultaneous access, etc.',
    ],
    code: `-- The catalog is itself queryable (metadata, not user data)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'employees';

-- A view: a subset plus derived data that is not stored
CREATE VIEW dept_payroll AS
SELECT department, COUNT(*) AS staff, SUM(salary) AS total
FROM employees
GROUP BY department;`,
    example: 'Querying the catalog for `employees` returns rows such as (`id`, `int`) and (`salary`, `decimal`): data about the data. The view `dept_payroll` returns (10, 2, 4725.00) although no table stores the number 4725.' },

  { id: 'dbms-roles', hub: 'dbms', topic: 'dbms', title: 'Actors and roles',
    summary: 'Many people work with a database, each through a different door: from end users who only see an app to the DBA who keeps the whole system alive.',
    body: [
      'The notes name the actors of a DBMS: **end users** (use the database through applications with preconfigured SQL queries), **sophisticated users** (use an advanced query language or SQL directly), **application developers** (program applications that use DML), **database designers** (design the conceptual and logical structure) and **database administrators** (define and modify the schema; define storage, access and physical organization; grant access rights to roles and users; maintain security, backup & recovery and efficiency: indexes, resource use). In industry the data team also includes data architects, data engineers, data analysts and data scientists.',
    ],
    table: {
      caption: 'Who does what, with a day-to-day example',
      head: ['Role', 'What they do', 'A typical day'],
      rows: [
        ['**DBA** (database administrator)', 'Schema changes, physical storage, users and permissions, backups, recovery, tuning', 'In a hospital, schedules the nightly backup at 02:00, grants the reception app `SELECT` on `Patients` only, and adds an index because the appointments search takes 4 s'],
        ['**Database designer / data architect**', 'Conceptual and logical design; the architect also decides the overall data platform', 'Draws the ER model of a new loyalty programme: CUSTOMER, CARD, POINTS_MOVEMENT, and decides it goes in the same PostgreSQL cluster as sales'],
        ['**Application developer**', 'Writes programs that embed DML', 'Codes the "book a class" button of a gym app: `INSERT INTO bookings ...` inside a transaction that also decrements the free places'],
        ['**Data engineer**', 'Builds ETL pipelines that move and transform data between systems', 'Loads every night the 300,000 card payments of the day from the OLTP database into the data warehouse and fixes the job when a supplier changes its CSV format'],
        ['**Data analyst**', 'Queries and summarizes data for decisions (a sophisticated user)', 'Writes a `GROUP BY` query showing that sales of umbrellas grew 40% in rainy weeks and puts it in the weekly dashboard'],
        ['**Data scientist**', 'Builds statistical and machine-learning models on the data', 'Trains a churn model on two years of member visits to predict who will cancel the gym membership'],
        ['**End user**', 'Uses applications with preconfigured queries; never writes SQL', 'A bank customer checks the balance in the mobile app; a receptionist searches a patient by ID card number'],
      ],
    },
    example: 'In the hospital above, the receptionist (end user) can read `Patients`, but when she tries to open `Diagnoses` the DBMS refuses, because the DBA granted the reception role only `SELECT` on `Patients`.',
    mistake: 'Thinking the DBA designs the conceptual model or writes the apps. The DBA owns the schema in production, the physical organization, permissions and maintenance; design and app code belong to other roles.' },

  /* ---- 4. Transactions (ACID) --------------------------------------------- */
  { id: 'atomicity', hub: 'acid', topic: 'acid', title: 'Transactions and atomicity',
    summary: 'A transaction groups several operations into one unit of work. Atomicity: either all of them are done or none is.',
    body: [
      'Relational DBMSs group several data modifications into a **transaction**. Enrolling a student in a subject, for instance, must decrement the free places of the chosen group, record the subject in the student\'s enrolment and update the accounts to charge the fee: all three or nothing. A DBMS guarantees the **ACID** properties over transactions: Atomicity, Consistency, Isolation and Durability.',
      '**Atomicity**: everything is executed or nothing is. If anything fails before `COMMIT`, the DBMS undoes (rolls back) whatever was already done.',
    ],
    points: [
      'Step 1: `BEGIN TRANSACTION`. A123 has 5,000 €, B456 has 2,000 €.',
      'Step 2: the first `UPDATE` debits 1,000 € from A123 (4,000 €, still not committed).',
      'Step 3: the second `UPDATE` fails: B456 does not exist, the power goes out...',
      'Step 4: the DBMS rolls back the first `UPDATE`. On restart A123 has 5,000 € again and B456 2,000 €: the money is never debited without being credited.',
      'If step 3 succeeds, `COMMIT` makes both changes valid together: A123 4,000 €, B456 3,000 €.',
    ],
    code: `BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 1000 WHERE account_id = 'A123';
UPDATE accounts SET balance = balance + 1000 WHERE account_id = 'B456';
COMMIT;

-- Another example: an order, its stock and its invoice
BEGIN TRANSACTION;
INSERT INTO orders (customer_id, total) VALUES (123, 500);
UPDATE inventory SET stock = stock - 5 WHERE product_id = 'P001';
INSERT INTO billing (order_id, amount) VALUES (LAST_INSERT_ID(), 500);
COMMIT;`,
    example: 'In the order example, if the invoice `INSERT` fails, the order for customer 123 disappears and the 5 units go back to stock: there is never an order without an invoice.',
    widget: 'acid-transfer' },

  { id: 'consistency', hub: 'acid', topic: 'acid', title: 'Consistency',
    summary: 'The data keep their integrity: a transaction takes the database from one valid state to another, and the DBMS rejects operations that break its rules.',
    body: [
      'The notes define it from the reader\'s side too: a query must be consistent with the state of the database at the instant it starts, so it never mixes data from before and after another transaction.',
      'In practice, the DBMS enforces the integrity rules declared in the schema: `CHECK` constraints (business rules), `NOT NULL`, keys and **referential integrity** (foreign keys).',
    ],
    points: [
      'Rule: `CHECK (balance >= 0)` on `accounts`.',
      'Step 1: A123 has 600 €. A transfer of 1,000 € to B456 begins.',
      'Step 2: the debit would leave A123 at -400 €: the DBMS raises an error.',
      'Step 3: the transaction is rolled back; A123 keeps 600 € and B456 is unchanged. The total money of the bank (600 + 2,000) is the same before and after.',
    ],
    code: `-- This transaction FAILS because it breaks the rule "age must be positive"
BEGIN TRANSACTION;
UPDATE students SET age = -20 WHERE student_id = 'A123';
-- ERROR: the database rejects this operation
ROLLBACK;

-- Referential integrity: you cannot delete a customer with active orders
DELETE FROM customers WHERE customer_id = 123;
-- ERROR: violates the foreign key in table orders`,
    example: 'Customer 123 has two open orders. `DELETE FROM customers WHERE customer_id = 123` is rejected, because otherwise the orders would point to a customer that no longer exists.' },

  { id: 'isolation', hub: 'acid', topic: 'acid', title: 'Isolation',
    summary: 'Transactions do not interfere with one another: a transaction that has not committed is invisible to the rest of the world.',
    body: [
      'Without isolation, two concurrent transactions can read the same old value and overwrite each other (a **lost update**), or one can see half-done changes of the other.',
    ],
    points: [
      'A123 has 1,000 €. Transfer T1 (300 € to B456) and transfer T2 (500 € to C789) start at the same time.',
      'Without isolation: T1 reads 1,000, T2 reads 1,000; T1 writes 700, T2 writes 500. Final balance 500 €: T1\'s debit was **lost** and the bank gave away 300 €.',
      'With isolation: T2\'s `UPDATE` on A123 waits (is **blocked**) until T1 commits; then it reads 700 and writes 200. Final balance 200 € = 1,000 - 300 - 500.',
    ],
    code: `-- User A
BEGIN TRANSACTION;
SELECT stock FROM products WHERE id = 'P001';   -- sees stock = 1
-- takes a while to decide...
UPDATE products SET stock = 0 WHERE id = 'P001';
INSERT INTO orders (product_id, quantity) VALUES ('P001', 1);
COMMIT;

-- User B, at the same time
BEGIN TRANSACTION;
SELECT stock FROM products WHERE id = 'P001';   -- also sees stock = 1
UPDATE products SET stock = 0 WHERE id = 'P001'; -- BLOCKED until A finishes
-- one of the two transactions will fail for insufficient stock`,
    example: 'Two customers try to buy the last unit of product P001 at the same instant. Isolation makes the second wait until the first commits, so the last unit is not sold twice (no **overselling**).' },

  { id: 'durability', hub: 'acid', topic: 'acid', title: 'Durability',
    summary: 'Committed changes are permanent: once a transaction ends with COMMIT, the database cannot lose it.',
    body: [
      'Immediately after the `COMMIT`, even if the power goes out, the server restarts, the network drops or the hardware fails, the change will be there when the system recovers. DBMSs achieve it by writing the change to non-volatile storage (typically a log) before confirming the `COMMIT`.',
    ],
    points: [
      'Step 1: the transfer of 1,000 € from A123 to B456 executes both `UPDATE`s.',
      'Step 2: `COMMIT` returns "OK" and the app shows "Transfer completed".',
      'Step 3: one second later the power goes out; the new balances may not have been written to the data files yet.',
      'Step 4: on restart the DBMS replays the log: A123 has 4,000 € and B456 3,000 €, exactly what the customer was told.',
    ],
    code: `-- Payment confirmation
BEGIN TRANSACTION;
UPDATE orders SET status = 'PAID' WHERE order_id = 12345;
INSERT INTO payments (order_id, amount, date) VALUES (12345, 250.00, NOW());
COMMIT; -- Confirmed!`,
    example: 'The payment of 250.00 € for order 12345 is still recorded after a power cut that happens right after the `COMMIT`. Before the `COMMIT`, the same power cut would undo it (atomicity).',
    mistake: 'Thinking that durability means "the data are already in the data files". What it guarantees is that a committed transaction survives any failure; how (log, replicas) is the DBMS\'s business.' },

  /* ---- 5. Abstraction levels -------------------------------------------------- */
  { id: 'ansi-sparc', hub: 'levels', topic: 'levels', title: 'The ANSI/X3/SPARC architecture',
    summary: 'The standard, also known as the three-schema architecture, that separates a database into an external, a conceptual and an internal level.',
    body: [
      'Abstraction levels are organizational layers that separate different aspects of data management: they simplify the complexity of the system, provide independence between levels, allow several views of the same data and make maintenance and evolution easier. The standard was defined by ANSI (American National Standards Institute).',
    ],
    points: [
      '**External level** (users\' view): partial views of the database shown to users and/or applications.',
      '**Conceptual level** (global logical view): the complete schema; it reflects the structure and relationships of the real-world data to be stored, and isolates the external and internal levels from each other.',
      '**Internal level** (physical view): specifies what, how and where the data are physically stored on disk.',
    ],
    table: {
      caption: 'The three levels for a university database',
      head: ['Level', 'What it contains'],
      rows: [
        ['External', 'Teacher\'s view: name and mark of the students in her subject. Secretary\'s view: name, ID card and fees paid, no marks.'],
        ['Conceptual', '`STUDENT(student_id, name, id_card, email)`, `SUBJECT(code, title)`, `ENROLMENT(student_id, code, mark)` with their keys and constraints.'],
        ['Internal', '`ENROLMENT` stored as a B+ tree on `(student_id, code)` in 8 KB blocks, in file `enrol.dat` on an SSD, with an extra index on `code`.'],
      ],
    },
    example: 'When a teacher opens "My students" she sees 3 columns of 45 rows; she does not know that `ENROLMENT` has 60,000 rows, nor that it lives in a B+ tree on an SSD.',
    figure: { kind: 'ansi-sparc' },
    caption: 'Several external views on top of one conceptual schema, stored by one internal schema. The boundaries between levels give logical and physical independence.' },

  { id: 'data-independence', hub: 'levels', topic: 'levels', title: 'Logical and physical independence',
    summary: 'Changing one level does not force changes in the level above: physical independence separates the internal level from the conceptual one; logical independence separates the conceptual level from the external one.',
    body: [
      '**Physical independence**: you can change the internal schema (file organization, indexes, disks, block size) without altering the conceptual schema or the applications.',
      '**Logical independence**: you can change the conceptual schema (add a table or a column, split a table) without altering the external views and the programs that use them.',
    ],
    code: `-- Physical independence: a new index changes HOW data are stored and found
CREATE INDEX idx_enrol_code ON enrolment (code);
-- The teachers' app still runs exactly the same SELECT, only faster.

-- Logical independence: the conceptual schema grows
ALTER TABLE student ADD phone VARCHAR(20);
-- The view the teachers use does not mention phone, so it keeps working:
CREATE VIEW my_students AS
SELECT s.name, e.mark
FROM student s JOIN enrolment e ON e.student_id = s.student_id
WHERE e.code = 'DB241';`,
    example: 'Moving `ENROLMENT` from an HDD to an SSD, or adding `idx_enrol_code`, does not change one line of the app (physical). Adding the column `phone` to `student` does not break the view `my_students` (logical).',
    mistake: 'Swapping the two. Remember: **physical** = internal ↔ conceptual (storage changes); **logical** = conceptual ↔ external (schema changes).' },

  /* ---- 6. Storage and efficiency ---------------------------------------------- */
  { id: 'fixed-records', hub: 'storage', topic: 'storage', title: 'Files, records and fixed-length records',
    summary: 'A database is stored as a collection of files; each file is a sequence of records, and each record is made of fields. Records can be of fixed or variable length.',
    body: [
      'In a **fixed-length** record every field always takes its maximum size. Every record takes the same space, so the position of any record can be computed directly: record number k starts at byte k × size.',
    ],
    table: {
      caption: 'Byte layout of a record of `customers_fixed` (97 bytes)',
      head: ['Field', 'Type', 'Bytes', 'Offset'],
      rows: [
        ['`id`', '`INT`', '4', '0–3'],
        ['`name`', '`CHAR(30)`', '30', '4–33'],
        ['`email`', '`CHAR(40)`', '40', '34–73'],
        ['`phone`', '`CHAR(15)`', '15', '74–88'],
        ['`balance`', '`DECIMAL(10,2)`', '8', '89–96'],
      ],
    },
    code: `CREATE TABLE customers_fixed (
  id      INT,            -- 4 bytes
  name    CHAR(30),
  email   CHAR(40),
  phone   CHAR(15),
  balance DECIMAL(10,2)   -- 8 bytes
);
-- Total per record: 97 bytes (always)`,
    points: [
      '**Predictable**: all records take the same space.',
      '**Fast access**: easy to compute the position of any record.',
      '**Simplicity**: simpler memory management.',
      '**Waste**: unused space in fields whose content varies.',
      '**Rigid limits**: a value cannot exceed the maximum size.',
    ],
    example: 'Record number 1,000 (counting from 0) starts at byte 1,000 × 97 = **97,000**, with no need to read the previous ones. But the name "Ana" uses 3 of its 30 bytes: 27 bytes are padding.',
    figure: { kind: 'record-layout', variant: 'fixed' },
    caption: 'Fixed-length records: every field has its maximum width, so every record starts at a multiple of 97 bytes.' },

  { id: 'variable-records', hub: 'storage', topic: 'storage', title: 'Variable-length records',
    summary: 'Fields such as VARCHAR take only the bytes they need plus a length marker, so records have different sizes.',
    code: `CREATE TABLE customers_variable (
  id      INT,            -- 4 bytes
  name    VARCHAR(100),   -- 1-100 bytes + length
  email   VARCHAR(255),   -- 1-255 bytes + length
  phone   VARCHAR(20),    -- 1-20 bytes + length
  balance DECIMAL(10,2)   -- 8 bytes
);`,
    table: {
      caption: 'One record: (7, \'Ana Ruiz\', \'ana@cunef.edu\', \'600123456\', 150.00), with a 1-byte length before each VARCHAR',
      head: ['Field', 'Stored as', 'Bytes'],
      rows: [
        ['`id`', '7', '4'],
        ['`name`', 'length 8 + "Ana Ruiz"', '1 + 8 = 9'],
        ['`email`', 'length 13 + "ana@cunef.edu"', '1 + 13 = 14'],
        ['`phone`', 'length 9 + "600123456"', '1 + 9 = 10'],
        ['`balance`', '150.00', '8'],
        ['**Total**', '', '**45** (vs 97 in the fixed table)'],
      ],
    },
    points: [
      '**Efficiency**: no space is wasted.',
      '**Flexibility**: fields can grow as needed.',
      '**Realism**: better for real-world data.',
      '**Complexity**: harder to manage.',
      '**Slow access**: the position of a record cannot be computed directly; you must read the lengths (or keep a slot directory).',
    ],
    example: 'The next record, for "Bartolomé Fernández-Villaverde", is longer, so record 2 does not start at a fixed offset. If Ana changes her email to a longer one, her record grows and may have to move.',
    figure: { kind: 'record-layout', variant: 'variable' },
    caption: 'Variable-length records: each VARCHAR is preceded by its length, so records have different sizes and must be walked to be located.' },

  { id: 'storage-media', hub: 'storage', topic: 'storage', title: 'Storage media and blocks',
    summary: 'Databases must live on non-volatile storage; because that storage is slow, data are read and written in large blocks.',
    body: [
      '**Non-volatile storage principle**: primary storage is the hard disk (HDD/SSD); RAM acts as an optional cache for speed, but it is volatile and limited in capacity.',
      '**The speed problem**: non-volatile storage is slow because every access means I/O (input/output) operations, intervention of the operating system, disk controllers and I/O hardware, and processing by the DBMS.',
      '**Optimization strategy**: since the time of an I/O is almost independent of the amount of data moved, we read/write large blocks (typically 4 KB), minimize the number of I/O operations and maximize the transfer per operation.',
      'Memory is divided into blocks, and each record of a file has the **bucket address** (block address) of the block that holds it.',
    ],
    example: 'With 97-byte records and 4 KB (4,096-byte) blocks, one block holds ⌊4,096 / 97⌋ = **42 records**. Reading 4,200 customers sequentially takes 100 I/Os instead of 4,200.',
    figure: { kind: 'storage-hierarchy' },
    caption: 'The closer to the CPU, the faster, smaller, more expensive and volatile the memory; the database lives on the non-volatile levels and is cached in RAM.' },

  { id: 'access-time', hub: 'storage', topic: 'storage', title: 'Response time: Ts = α + βb',
    summary: 'The time to read or write a block is a fixed seek time plus a transfer time proportional to the block size.',
    body: [
      '**α** is the seek time (average time to locate the information), **β** the transfer rate expressed as time per unit of data (β = 1 / speed) and **b** the block size. For small blocks α dominates; β·b grows linearly with b.',
      '**HDD**: α = 8 ms, 100 MB/s → β = 1/100 s/MB = 10 ms/MB, b = 4 KB = 0.004 MB → Ts = 8 + 10 × 0.004 = **8.04 ms**. Time is dominated by the seek, not by the transfer. Choose it when cost is critical, you store large volumes of historical data and queries are mainly sequential.',
      '**SSD**: α = 0.1 ms, 500 MB/s → β = 2 ms/MB, b = 0.004 MB → Ts = 0.1 + 2 × 0.004 = **0.108 ms**. Much faster. Choose it when performance is critical, there are many random queries and read-intensive workloads.',
    ],
    table: {
      caption: 'Worked example: 10 million transaction records, 100,000 random queries per hour, 2 KB records (b = 0.002 MB)',
      head: ['', 'HDD (α = 10 ms, 80 MB/s)', 'SSD (α = 0.05 ms, 300 MB/s)'],
      rows: [
        ['Time per query', 'T = 10 ms + (80 MB/s)⁻¹ × 0.002 MB = 10 ms + 0.025 ms ≈ **10 ms**', 'T = 0.05 ms + (300 MB/s)⁻¹ × 0.002 MB = 0.05 ms + 0.0067 ms ≈ **0.05 ms**'],
        ['Load per hour', '100,000 × 10 ms = 1,000,000 ms = **1,000 s** of disk time per hour', '100,000 × 0.05 ms = 5,000 ms = **5 s** per hour'],
        ['Can it cope?', 'Viable: uses 1,000 / 3,600 = **27.78%** of the time', 'Very viable: uses 5 / 3,600 = **0.1389%** of the time'],
      ],
    },
    example: 'In the worked example the transfer term is tiny: (80 MB/s)⁻¹ × 0.002 MB = 0.000025 s = 0.025 ms against a 10 ms seek. Doubling the record to 4 KB would add only another 0.025 ms on the HDD: that is why reading bigger blocks pays off.',
    mistake: 'Mixing units. β must be in time per MB (or per KB) and b in the same unit: 4 KB = 0.004 MB, and 1/(100 MB/s) = 0.01 s/MB = 10 ms/MB.',
    widget: 'access-time' },

  /* ---- 7. File organization and indexes ---------------------------------------- */
  { id: 'file-organization', hub: 'index', topic: 'index', title: 'File organizations at a glance',
    summary: 'The organization of a file is how its information is distributed and located inside it: sequential, heap, hash, B+ tree, clustered or ISAM.',
    body: [
      'Each organization makes some operations cheap and others expensive. Choosing one means knowing the size of the database and its main operation: bulk inserts, searches by key, sorted or range queries, or joins.',
    ],
    table: {
      caption: 'Summary of the six organizations',
      head: ['Organization', 'Description', 'Advantages', 'Drawbacks', 'Use cases'],
      rows: [
        ['**Sequential**', 'Records stored **one after another** in order; new ones at the end or with full re-sorting', 'Fast for contiguous data; simple; cheap storage', 'High read time; deletion fragments; sorting very slow', 'Backup files, bulk loads, historical data'],
        ['**Heap**', '**Unordered** records with a unique ID and a bucket address; inserted at the end', 'Very fast insertion; good for small DBs; no sorting', 'Slow for large DBs; wastes memory; sequential search', 'Small DBs, system logs, bulk insertion'],
        ['**Hash**', 'A **hash function** computes the location from the primary key', 'Very fast direct access; no sorting; constant time', 'Can delete data by mistake; non-consecutive memory; hash collisions', 'Medium DBs, access by key, frequent transactions'],
        ['**B+ tree**', '**Balanced tree**: data in the leaves, internal nodes are navigation pointers', 'Efficient search; balanced; dynamic; fast traversal', 'Balancing cost; high complexity; pointer overhead', 'Large DBs, many updates, sorted queries'],
        ['**Clustered**', '**Combines several tables** in the same block using a common identifier (index or hash)', 'Excellent for JOINs; efficient 1:M; fewer disk accesses', 'Bad for 1:1; not for large DBs; inefficient without JOINs', 'Frequent 1:M, many JOINs, related tables'],
        ['**ISAM**', 'Separate **index file** that points to the real location of each record', 'Range searches; search patterns; large DBs', 'Extra storage for indexes; indexes grow with data; complex maintenance', 'Very large DBs, complex searches, range queries'],
      ],
    },
    example: 'A shop with 2,000 products that are bought by ID: hash. The same shop with 50 million order lines queried by date range: B+ tree. A nightly copy of the whole database that is only ever read from start to end: sequential.' },

  { id: 'sequential', hub: 'index', topic: 'index', title: 'Sequential file organization',
    summary: 'Records are stored one after another. In a pile file each new record goes to the end; in a sorted file it is added at the end and then the file is re-sorted.',
    points: [
      '**Insert**: pile file, write at the end (cheap); sorted file, append and re-sort the whole file through an auxiliary file (excessively slow).',
      '**Search**: read records in order until the key appears; on average half the file.',
      '**Advantages**: fast when accessing contiguous records; simple to implement; data can be kept on cheap storage devices.',
      '**Drawbacks**: high average read time; deletion can cause internal fragmentation; sorting needs a full pass over all records.',
      '**Use**: bulk-load files where speed of access and of updates is not critical. Uncommon in DBMSs.',
    ],
    example: 'A sorted file of 1,000,000 bank movements ordered by date: printing March is fast (contiguous records), but finding movement 834,201 by its ID means reading about 500,000 records on average, and inserting one movement of 2 January forces rewriting the whole file.',
    figure: { kind: 'file-organization', org: 'sequential' },
    caption: 'Pile file: each new record goes to the end. Sorted file: it is appended and then the file is re-sorted.' },

  { id: 'heap', hub: 'index', topic: 'index', title: 'Heap file organization',
    summary: 'An unordered file organization: each record has a unique ID linked to a bucket address, and new records are inserted at the end without reordering.',
    points: [
      '**Pointers**: each record is linked to its location in memory.',
      '**No order**: records follow no particular order.',
      '**Flexibility**: any free block can be used for new records; the DBMS manages allocation, storage and administration automatically.',
      '**Insert**: append to the end (or any free block), no reorganization: very fast.',
      '**Search**: scan the file; fast for a small database, slow for a large one.',
      '**Drawback**: "memory wastage", the gaps left in blocks holding records that do not fill them.',
      '**Use**: small databases with constant updates or insertions; bulk loads, if there is enough memory.',
    ],
    example: 'A web server writes 5,000 log lines per minute into a heap table `access_log`: each line is just appended. Searching "all requests from IP 10.0.0.7" in a table of 200 million lines, though, means reading every block.',
    figure: { kind: 'file-organization', org: 'heap' },
    caption: 'Heap file: records go into any free block in arrival order; each has a bucket address but no order is kept.' },

  { id: 'hash', hub: 'index', topic: 'index', title: 'Hash file organization',
    summary: 'A hash function computes the bucket address of each record from its primary key; the locations it generates are called data buckets or data blocks.',
    points: [
      '**Insert**: compute h(key) and write the record in that bucket. The function can be simple or complex; computing it takes constant time, whatever the state of the file.',
      '**Search by key**: compute h(key) again and go straight to the bucket: no sorting and no scanning.',
      '**Drawbacks**: accidental deletion if the key is badly chosen (repeated values hash to the same bucket); memory is not used efficiently because records are not consecutive; **collisions**; and no efficient range queries, because neighbouring keys end up in unrelated buckets.',
      '**Use**: medium databases with constant updates or insertions and access by key.',
    ],
    example: 'With 5 buckets and h(id) = id mod 5: employee 1027 goes to bucket 1027 mod 5 = **2**, employee 1030 to bucket **0**. Finding 1027 reads only bucket 2. But "employees with id between 1000 and 1100" must read all 5 buckets. Hashing by `employee_name` would be risky: two employees called "Luis Pérez" fall in the same bucket and a delete by name could remove both; combining the name with the department or the ID card number avoids it.',
    figure: { kind: 'file-organization', org: 'hash' },
    caption: 'The hash function turns each key into a bucket address; the record is stored and later found in that bucket.' },

  { id: 'btree', hub: 'index', topic: 'index', title: 'B+ tree file organization',
    summary: 'A balanced search tree in which every node can have many children: all records are in the leaf nodes, and internal nodes are pointers that lead to them.',
    body: [
      'B+ trees are like binary search trees but with more than two children per node, which keeps them very shallow. They are an extension of ISAM files. The leaves are built from an index field (the record ID), contain the link to the bucket address of each key and are chained together, so after finding the first key you can walk the following ones in order.',
    ],
    points: [
      '**Search**: from the root, follow at each level the pointer whose range contains the key, down to a leaf. Cost = height of the tree.',
      '**Insert/delete**: go down to the right leaf; if it overflows, split it and push a key up. The tree stays **balanced**: all branches have the same depth.',
      '**Advantages**: efficient search; insertions, deletions and updates do not degrade performance; easy, fast traversal; the size grows or shrinks dynamically.',
      '**Drawback**: the cost of the balancing operations that keep all branches at the same depth.',
      '**Use**: large databases with high update rates.',
    ],
    example: 'A table of 1,000,000 customers. A full scan compares up to 1,000,000 rows; binary search on a sorted file about log₂ 1,000,000 ≈ **20** steps. A B+ tree with 100 keys per node needs only **3 levels** (100 × 100 × 100 = 1,000,000), that is 3 block reads, and "customers with id between 5,000 and 5,099" continues along the chained leaves.',
    figure: { kind: 'btree' },
    caption: 'Internal nodes only guide the search; every record is reached at the same depth, in the linked leaves.',
    widget: 'index-search' },

  { id: 'clustered', hub: 'index', topic: 'index', title: 'Clustered file organization',
    summary: 'Records of two or more tables are combined in the same block according to an identifier/index or the result of a hash function: the cluster ID.',
    points: [
      '**Indexed clusters**: the cluster ID is taken directly from the identifier/index value.',
      '**Hash clusters**: the cluster ID is obtained by applying a hash function to the index.',
      '**Insert**: the new row goes into the block of its cluster ID, next to its related rows of the other table.',
      '**Advantages**: good performance for joins between tables; very efficient for 1:M relationships; fewer disk accesses.',
      '**Drawbacks**: inefficient when joins are not frequent and for 1:1 relationships; not suitable for large databases.',
      '**Use**: 1:N relationships, e.g. many students can take one course, and frequent joins.',
    ],
    example: 'Course DB241 and its 45 students are stored in the same block, keyed by `course_id = DB241`. "List the students of DB241" reads one block instead of one block for the course plus up to 45 scattered blocks for the students.',
    figure: { kind: 'file-organization', org: 'clustered' },
    caption: 'Rows of two tables that share a cluster ID live in the same block, so the join is already done on disk.' },

  { id: 'isam', hub: 'index', topic: 'index', title: 'ISAM (Indexed Sequential Access Method)',
    summary: 'An advanced file organization: from the ID of each record an index entry is created in a separate index file, which points to the bucket address of the block that holds the record.',
    points: [
      '**Search**: look up the key (or the start of the range) in the small sorted index file, follow the pointer to the data block, then read on sequentially.',
      '**Insert**: write the record and add its entry to the index file.',
      '**Advantages**: makes range searches and search patterns easy.',
      '**Drawbacks**: extra storage for the index; as records grow, so does the index; more complex maintenance.',
      '**Use**: large databases, thanks to the efficiency of the indexes for fast access to the data.',
    ],
    example: '"All students whose surname starts with Gar": the index finds the first entry ≥ "Gar" (García, Ana → block 812), and reading on through García, Garrido... stops at the first surname that no longer starts with "Gar". Only a few blocks are read out of thousands.',
    figure: { kind: 'file-organization', org: 'isam' },
    caption: 'The index file holds sorted keys with pointers to the data blocks; a range search finds its start in the index and then reads sequentially.' },

  { id: 'choosing-organization', hub: 'index', topic: 'index', title: 'Choosing a file organization',
    summary: 'Pick the organization from the size of the database and its main operation.',
    table: {
      caption: 'By main operation (by size: small < 10K records → heap, alternative sequential; medium 10K–1M → hash, alternative B+ tree; large > 1M → B+ tree, alternative ISAM)',
      head: ['Main operation', 'Best option', 'Why?'],
      rows: [
        ['Bulk insertion', 'Heap file', 'Does not reorganize, very fast'],
        ['Search by ID', 'Hash file', 'Constant direct access'],
        ['Sorted searches', 'B+ tree', 'Data naturally ordered'],
        ['Frequent JOINs', 'Clustered file', 'Tables physically together'],
        ['Range searches', 'ISAM', 'Optimized indexes'],
        ['Read only', 'Sequential file', 'Simple and efficient'],
      ],
    },
    example: 'A gym chain: the turnstile log (2 million inserts a day, rarely read) → heap; looking up a member by card number among 300,000 → hash; the 40-million-row table of visits queried "per month" and updated constantly → B+ tree; each class with its bookings, always read together → clustered.',
    mistake: 'Choosing hash for a table that is mostly queried by ranges ("orders from 1 to 15 May"). Hashing scatters neighbouring keys, so every range query becomes a full scan.' },

  /* ---- 8. Data lifecycle --------------------------------------------------------- */
  { id: 'data-model', hub: 'lifecycle', topic: 'lifecycle', title: 'Data models and why we use them',
    summary: 'A data model is a set of steps, tasks and representation techniques to obtain data structures that solve a problem in a methodical and simple way.',
    body: [
      'It is an instrument to represent the user\'s needs, with mathematically well-defined concepts to express the static and dynamic properties of an application\'s data.',
    ],
    points: [
      '**Error control**: errors are detected and corrected before implementation.',
      '**Independence**: data structures are kept separate from the physical and logical environment.',
      '**Improved maintenance**: the system is easier to manage and update.',
      '**Better problem understanding**: models make the needs clear.',
      '**Facilitates communication**: improves collaboration among the members of the development team.',
    ],
    example: 'Drawing the model of a gym chain, the team notices that one member can belong to several gyms. Fixing a line in the diagram costs minutes; discovering it after launch, with 300,000 members stored with a single `gym_id`, means migrating data and rewriting queries.' },

  { id: 'lifecycle-stages', hub: 'lifecycle', topic: 'lifecycle', title: 'The data modelling lifecycle',
    summary: 'From the semantics/requirements, through conceptual, logical and physical design, each producing its model; software engineering techniques loop back from the physical design to the requirements.',
    body: [
      'Going from requirements to the conceptual design is a **complex abstraction**: deciding what matters (the What, not the How). Each design stage produces a model: the **conceptual model** (E/R), the **logical model** (tables) and the **physical model** (storage on a concrete DBMS). Maintenance feeds new requirements back into the cycle.',
    ],
    table: {
      caption: 'Running example: a gym chain, "FitRed"',
      head: ['Stage', 'What is done', 'FitRed'],
      rows: [
        ['Semantics / requirements', 'Interview users, collect business rules', 'Members join one or more gyms; gyms offer classes; a member books classes; a class has at most 20 places; staff need visits per month'],
        ['Conceptual design → conceptual model', 'E/R diagram, independent of any DBMS', 'Entities MEMBER, GYM, CLASS; relationship BOOKS (MEMBER M:N CLASS); OFFERS (GYM 1:N CLASS)'],
        ['Logical design → logical model', 'Tables, keys, foreign keys', '`member(member_id PK, name, email)`, `class(class_id PK, gym_id FK, start, places)`, `booking(member_id FK, class_id FK, PK(member_id, class_id))`'],
        ['Physical design → physical model', 'DBMS, types, indexes, file organization', 'PostgreSQL on SSD; `CHECK (places <= 20)`; B+ tree index on `booking(class_id)`; heap table for turnstile logs'],
        ['Maintenance (back to requirements)', 'Monitor, tune, absorb new needs', 'FitRed adds personal trainers: new entity TRAINER and relationship TRAINS, and the cycle starts again'],
      ],
    },
    example: 'In FitRed, the rule "a class has at most 20 places" appears in the requirements, becomes an attribute `places` of CLASS in the conceptual model, a column in the logical model and a `CHECK` constraint plus a transaction in the physical design.',
    figure: { kind: 'lifecycle' },
    caption: 'Requirements → conceptual → logical → physical design, each producing its model; maintenance loops back to the requirements.' },
];

DATA.en.THEORY_QUIZ = [
  // Q1
  { type: 'mc', topic: 'dbms',
    q: 'You inspect a DBMS and find a system structure that holds the definition of every table (column names, data types, constraints) separately from the rows themselves. What is stored there is best called:',
    choices: ['user data', 'metadata (the catalog / data dictionary)', 'a sub-schema', 'a bucket address'],
    answer: 1,
    why: 'A DBMS is **self-describing**: the schema lives in the catalog, and what the catalog stores is metadata, not user data.' },
  // Q2
  { type: 'mc', topic: 'info',
    q: 'The operations team signs a **99.999% availability SLA**. Roughly how much downtime per year does that allow?',
    choices: ['~5.26 minutes', '~52.6 minutes', '~8.76 hours', '~5.26 hours'],
    answer: 0,
    why: '99.999% leaves 0.001% of a year ≈ 5.26 minutes. Availability is one of the three facets of reliability (with accuracy and consistency).' },
  // Q3
  { type: 'mc', topic: 'info',
    q: 'A bank\'s core system records every card payment the instant it happens, at very high volume and maximum detail. Which information-system level is that?',
    choices: ['Operational level (TPS / OLTP)', 'Knowledge level (MIS)', 'Tactical level (DSS)', 'Strategic level (EIS / ESS)'],
    answer: 0,
    why: 'The operational level processes transactions in real time: highest volume, maximum detail, shortest horizon.' },
  // Q4
  { type: 'mc', topic: 'info',
    q: 'Which level supports analysis and **simulation**, at a monthly cadence over a horizon of months to years?',
    choices: ['Operational level (TPS / OLTP)', 'Knowledge level (MIS)', 'Tactical level (DSS)', 'Strategic level (EIS / ESS)'],
    answer: 2,
    why: 'The tactical level (Decision Support System) is for analysis and simulation; the strategic level is lower-volume and longer-horizon still.' },
  // Q5
  { type: 'mc', topic: 'dbms',
    q: 'Which actor defines and modifies the schema, chooses the storage structure and access methods, and grants access rights to roles and users?',
    choices: ['End user', 'Application developer', 'Database administrator (DBA)', 'Sophisticated user'],
    answer: 2,
    why: 'Those four duties (schema, physical organization, rights, maintenance) are exactly the DBA\'s remit.' },
  // Q6
  { type: 'mc', topic: 'files',
    q: 'A team keeps customer data in several `.csv` files. One file spells a person "Alberto López" and another "A. López". Which file-management problem is this?',
    choices: ['Redundancy', 'Inconsistency', 'Limited access', 'Structural dependence'],
    answer: 1,
    why: 'Redundancy is the **repetition**; inconsistency is the **same fact referred to in different ways**, which is what breaks here.' },
  // Q7
  { type: 'mc', topic: 'files',
    q: 'Which command removes a table **together with its structure**, so the table must be recreated before it can be used again?',
    choices: ['`TRUNCATE TABLE`', '`DROP TABLE`', '`DELETE FROM`', '`ALTER TABLE`'],
    answer: 1,
    why: '`DROP` removes structure and data; `TRUNCATE`/`DELETE` only remove rows and keep the table.' },
  // Q8
  { type: 'mc', topic: 'files',
    q: 'Which of these is a DML statement whose job is to **modify data inside existing rows**?',
    choices: ['`CREATE`', '`ALTER`', '`UPDATE`', '`RENAME`'],
    answer: 2,
    why: '`CREATE`, `ALTER` and `RENAME` are DDL (structure). DML is `SELECT` / `INSERT` / `UPDATE` / `DELETE`: data.' },
  // Q9
  { type: 'mc', topic: 'dbms',
    q: 'You rename a column in the database and the application programs that query it keep working without changes. Which DBMS property provides this?',
    choices: ['Self-describing catalog', 'Program-data isolation', 'Multiple views of the data', 'Security against unauthorized access'],
    answer: 1,
    why: 'Program-data isolation keeps the database structure separate from the programs, so structure can change without rewriting every program.' },
  // Q10
  { type: 'mc', topic: 'acid',
    q: 'A transfer must debit account A and credit account B. The system crashes after the debit; on restart **neither** change is present. Which ACID property produced that outcome?',
    choices: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
    answer: 0,
    why: 'Atomicity = all operations run or none run; an incomplete transaction is rolled back as a whole.' },
  // Q11
  { type: 'mc', topic: 'acid',
    q: 'Two customers try to buy the last unit of a product at the same instant. The DBMS makes the second wait until the first commits, so the unit is never sold twice. Which property is at work?',
    choices: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
    answer: 2,
    why: 'Isolation keeps an uncommitted transaction invisible, so concurrent buyers cannot both read the same available stock.' },
  // Q12
  { type: 'mc', topic: 'acid',
    q: 'The power fails immediately after a `COMMIT`; when the server comes back the payment is still recorded. Which property guarantees this?',
    choices: ['Isolation', 'Durability', 'Atomicity', 'Consistency'],
    answer: 1,
    why: 'Durability makes a committed transaction permanent even across power loss, restart, network loss or hardware failure.' },
  // Q13
  { type: 'mc', topic: 'acid',
    q: 'The DBMS rejects an `UPDATE` that would set an age to `-20`, because it breaks a business rule. Which ACID property is being enforced?',
    choices: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
    answer: 1,
    why: 'Consistency (integrity rules, including referential integrity) means the database refuses operations that would violate its rules.' },
  // Q14
  { type: 'mc', topic: 'levels',
    q: 'Which ANSI/SPARC level specifies **what, how and where** the data will be physically stored?',
    choices: ['External level', 'Conceptual level', 'Internal level', 'View level'],
    answer: 2,
    why: 'The internal level describes physical storage; external is partial user views; conceptual is the global logical view.' },
  // Q15
  { type: 'mc', topic: 'levels',
    q: 'You change the file organization on disk **without** altering the conceptual schema or the applications. Which independence makes this possible?',
    choices: ['Logical independence', 'Physical independence', 'Referential integrity', 'Semantic independence'],
    answer: 1,
    why: 'Physical independence is the separation between the conceptual and internal levels; logical independence separates external from conceptual.' },
  // Q16
  { type: 'mc', topic: 'storage',
    q: 'A fixed-length `CHAR` table gives every row a 97-byte record. What is the **main** advantage of that predictability?',
    choices: ['It saves storage space in variable fields', 'The position of any record can be computed directly, so access is fast', 'It makes multi-valued fields efficient', 'It removes the need for an index'],
    answer: 1,
    why: 'Fixed length is fast and simple to address; the trade-off is wasted space and rigid limits.' },
  // Q17
  { type: 'mc', topic: 'storage',
    q: 'In the response-time model `Ts = α + β·b`, a query on an HDD that reads a small block is dominated by which term?',
    choices: ['α, the seek time', 'β, the transfer rate', 'b, the block size', 'None; they cancel out'],
    answer: 0,
    why: 'For small blocks the fixed seek time α dominates the transfer term β·b; this is why HDD performance is dominated by seeks.' },
  // Q18
  { type: 'mc', topic: 'index',
    q: 'A table holds **more than a million rows**, is updated constantly, and is frequently queried in sorted order by range. Which file organization fits best?',
    choices: ['Heap file', 'Sequential file', 'B+ tree', 'Clustered file'],
    answer: 2,
    why: 'For large databases with high update rates and sorted queries, the balanced, dynamic B+ tree is the recommended organization.' },
  // Q19
  { type: 'mc', topic: 'index',
    q: 'Two tables are always joined together in a 1:N relationship. Which organization physically co-locates their related rows in the same memory block?',
    choices: ['Hash file', 'Clustered file', 'ISAM', 'Heap file'],
    answer: 1,
    why: 'Clustered organization combines related rows of different tables in one block, giving excellent 1:M join performance.' },
  // Q20
  { type: 'mc', topic: 'index',
    q: 'What is a genuine **drawback** of hash file organization?',
    choices: ['It cannot locate a record by its primary key', 'It cannot serve range queries efficiently', 'It always requires a full re-sort on every insert', 'It cannot use a hash key'],
    answer: 1,
    why: 'Hashing gives constant-time key access but destroys neighbouring order, so it is poor for range/pattern searches.' },
  // Q21
  { type: 'mc', topic: 'files',
    q: 'In the schema/languages vocabulary of the course, what is a **sub-schema**?',
    choices: ['The global logical view of the entire database', 'The part of the database that a given user or application is allowed to see', 'The physical layout of files on disk', 'The system catalog of metadata'],
    answer: 1,
    why: 'The schema is the conceptual organization guarded by the DBA; sub-schemas are the user/app views, with their own criteria and restrictions.' },
  // Q22
  { type: 'tf', topic: 'info',
    q: 'The knowledge level (MIS) tracks and controls information with a daily/weekly cadence over a time horizon of days to weeks.',
    answer: true,
    why: 'MIS sits above OLTP: lower volume, medium detail, day/week horizon. Above it are the tactical (DSS) and strategic (EIS/ESS) levels.' },
  // Q23
  { type: 'tf', topic: 'files',
    q: 'A file-based system lets several users modify the same data at the same time with the same control a DBMS provides.',
    answer: false,
    why: 'File systems suffer **limited access** (one app/user modifying at a time) and **uncontrolled** processing; controlled concurrency is a DBMS advantage.' },
  // Q24
  { type: 'tf', topic: 'lifecycle',
    q: 'A data model is useful only **after** implementation, to document the finished schema.',
    answer: false,
    why: 'A core benefit is **error control**: errors are detected and corrected **before** implementation. The others are independence, maintenance, understanding and communication.' },
  // Q25
  { type: 'tf', topic: 'storage',
    q: 'In `Ts = α + β·b`, for a fixed transfer rate the transfer term grows linearly with the block size `b`.',
    answer: true,
    why: 'β·b is linear in `b`; because I/O time is nearly independent of the amount moved, we read large blocks (typically 4 KB) to amortize the fixed α.' },
  // Q26
  { type: 'fib', topic: 'index',
    q: 'A file organization computes the **bucket address** of a record from its primary key using a ____ function.',
    accept: ['hash', 'hashing', 'hash function'],
    why: 'In hash file organization, h(key) gives the bucket (data block) where the record is stored and found.' },
  // Q27
  { type: 'fib', topic: 'storage',
    q: 'In `Ts = α + β·b`, the term **α** is the ____ time: the average time to locate the information on the disk.',
    accept: ['seek', 'seek time'],
    why: 'α is the seek time; β is the transfer rate (time per unit of data) and b the block size.' },
  // Q28
  { type: 'fib', topic: 'files',
    q: 'The DDL command that deletes a table together with its data is ____.',
    accept: ['DROP', 'DROP TABLE'],
    why: '`DROP TABLE` removes the table and its data; `TRUNCATE TABLE` empties it but keeps the structure.' },

  // Extra questions grounded in the notes
  { type: 'mc', topic: 'info', extra: true,
    q: 'Which of these is a component of an information system according to the notes?',
    choices: ['Only the database', 'Contents, physical equipment, logical equipment and people', 'Only hardware and software', 'The ER diagram and the SQL scripts'],
    answer: 1,
    why: 'An information system is made of contents (data), physical equipment (hardware, on-premise or cloud), logical equipment (software, architectures) and people (users, DBA, data engineer...).' },
  { type: 'tf', topic: 'files', extra: true,
    q: 'Storing the same employee address in the HR file and in the Payroll file is redundancy, and it can lead to inconsistency when only one copy is updated.',
    answer: true,
    why: 'Redundancy is the repetition; inconsistency is the consequence when the copies diverge. A database stores the address once.' },
  { type: 'mc', topic: 'dbms', extra: true,
    q: 'Inside the DBMS, which component of the storage manager decides which disk blocks are kept in memory?',
    choices: ['DDL interpreter', 'Buffer manager', 'Query evaluation engine', 'Embedded DML precompiler'],
    answer: 1,
    why: 'The storage manager contains the transaction manager, the buffer manager (memory blocks) and the file manager (disk files); the other three belong to the query processor.' },
  { type: 'fib', topic: 'acid', extra: true,
    q: 'A transaction becomes permanent, and visible to other transactions, when it ends with ____.',
    accept: ['COMMIT'],
    why: 'Until `COMMIT` the transaction is invisible (isolation) and can be undone (atomicity); after it, it cannot be lost (durability).' },
  { type: 'mc', topic: 'levels', extra: true,
    q: 'You add a column `phone` to the table `student`, and the view the teachers use keeps working unchanged. Which property is this?',
    choices: ['Physical independence', 'Logical independence', 'Durability', 'Referential integrity'],
    answer: 1,
    why: 'Logical independence separates the conceptual level from the external level: the conceptual schema changed, the external view did not.' },
  { type: 'tf', topic: 'levels', extra: true,
    q: 'In the ANSI/X3/SPARC architecture, the conceptual level is the complete schema of the database and isolates the external and internal levels from each other.',
    answer: true,
    why: 'The conceptual level is the global logical view: it reflects the real-world data structure and sits between the user views and physical storage.' },
  { type: 'mc', topic: 'storage', extra: true,
    q: 'HDD with α = 8 ms, 100 MB/s and blocks of 4 KB (0.004 MB). What is Ts = α + β·b?',
    choices: ['8.004 ms', '8.04 ms', '8.4 ms', '48 ms'],
    answer: 1,
    why: 'β = 1/100 s/MB = 10 ms/MB, so β·b = 10 × 0.004 = 0.04 ms and Ts = 8 + 0.04 = 8.04 ms: dominated by the seek.' },
  { type: 'mc', topic: 'index', extra: true,
    q: 'A system writes millions of log lines and almost never searches them. Which organization do the notes recommend for this bulk insertion?',
    choices: ['Heap file', 'Hash file', 'ISAM', 'Clustered file'],
    answer: 0,
    why: 'A heap file just appends new records without reorganizing, which makes insertion very fast.' },
  { type: 'mc', topic: 'index', extra: true,
    q: 'Which organization makes it easy to find "all students whose surname starts with Gar"?',
    choices: ['Hash file', 'Heap file', 'ISAM', 'Pile file'],
    answer: 2,
    why: 'ISAM keeps a sorted index file: it finds the first key ≥ "Gar" and reads on sequentially. Hashing scatters neighbouring keys.' },
  { type: 'mc', topic: 'lifecycle', extra: true,
    q: 'What is the correct order of the data modelling lifecycle?',
    choices: ['Logical → conceptual → physical design', 'Requirements → conceptual → logical → physical design', 'Physical → logical → conceptual design', 'Requirements → physical → logical → conceptual design'],
    answer: 1,
    why: 'From the semantics/requirements, each design stage produces its model: conceptual (E/R), logical (tables) and physical (concrete DBMS).' },
  { type: 'fib', topic: 'lifecycle', extra: true,
    q: 'The design stage that produces the E/R diagram, independent of any DBMS, is the ____ design.',
    accept: ['conceptual'],
    why: 'Conceptual design yields the conceptual model; the logical design turns it into tables and the physical design into storage on a concrete DBMS.' },
  { type: 'tf', topic: 'lifecycle', extra: true,
    q: 'Going from the requirements to the conceptual design focuses on the What, not the How: choosing indexes belongs to the physical design.',
    answer: true,
    why: 'The first stages define the semantics of the problem; types, indexes and file organizations are decided in the physical design.' },
];
