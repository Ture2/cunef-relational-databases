'use strict';

/*
  PRACTICE DATA
  ---------------------------------------------------------------------------
  A "Normalize" exercise is solved in steps: each step takes the decomposition
  one rung higher (2NF, 3NF, BCNF, 4NF, 5NF) and starts from the tables the
  student left in the previous step. To add an exercise, copy one from
  EXERCISES and change:

    title     Full title (exercise heading)
    short     Short title (exercise list)
    story     Statement
    attrs     Columns of the original table (no spaces)
    pk        Primary key of the original table
    fds       Functional dependencies as text: 'a, b -> c, d'  ([] if none)
    mvds      (optional) Multivalued dependencies: 'x ->> y'. Whatever is in
              neither x nor y forms the other side (z): x ↠ y | z.
    jds       (optional) Join dependencies: 'a, b | b, c | a, c'. The sides
              must cover every attribute of the original table.
              mvds and jds also accept { def: '...', show: 'text to display' }.
    rows      Sample rows, in the order of attrs (they must satisfy every
              declared dependency)
    steps     List of steps, in order. Each step:
                nf         '2NF' | '3NF' | 'BCNF' | '4NF' | '5NF'
                solution   A valid solution: [{ name, attrs, pk }]
                hints      Hints for the step, from vaguest to most concrete
                insight    Key idea shown when the step is solved
                allowLoss  (optional) true if losing a functional dependency
                           is unavoidable in this step (it warns, but does not fail)
                vacuous    (optional) true if the step does not require splitting anything

  The checker does NOT compare against the solution: it validates any
  decomposition (keys, normal form, lossless join and preserved dependencies),
  so declaring attributes and dependencies is enough. When the page opens, the
  browser console warns if any data is inconsistent, if a step requires
  nothing, or if a step's solution does not pass the check.

  For "Diagnose", add objects to QUESTIONS (answer: 0 = fails 1NF,
  1 = meets 1NF but not 2NF, 2 = meets 2NF but not 3NF, 3 = meets 3NF).
  Questions with adv: true use ADV_OPTIONS (0 = 3NF but not BCNF,
  1 = BCNF but not 4NF, 2 = 4NF but not 5NF, 3 = 5NF); their mvds and jds
  are only used so the console can verify the answer: they are not shown.
*/

DATA.en.NF_INFO = {
  '2NF': {
    name: 'Second normal form',
    rule: 'Every non-key attribute depends on the whole key, not just part of it.',
    how: [
      'Look at the primary key. If it has a single attribute, 2NF already holds.',
      'If it is composite, ask about each non-key attribute: is part of the key enough to know it?',
      'Move the ones that depend on part of the key to a new table whose key is that part.',
      'In the source table keep the full key and only what depends on all of it.',
    ],
  },
  '3NF': {
    name: 'Third normal form',
    rule: 'No non-key attribute depends on another non-key attribute.',
    how: [
      'Look for chains: the key determines A and A determines B. Then B depends on A, not on the key.',
      'Move A and B to a new table whose key is A.',
      'Keep A in the source table too: it is the reference (foreign key) that links them.',
      'Repeat while chains remain: each link ends up with its own table.',
    ],
  },
  BCNF: {
    name: 'Boyce-Codd normal form',
    rule: 'Every determinant is a key: if an attribute (or group) determines others, it must identify each row.',
    how: [
      'Write down the left-hand side of every functional dependency.',
      'For each one ask: does it identify each row of the table by itself? If not, it is a problem, even if what it determines is part of a key (3NF tolerates it, BCNF does not).',
      'Move the determinant and what it determines to a new table, with the determinant as its key.',
      'In the source table keep the determinant (as a reference) and remove what it determines.',
      'Watch out: some dependency may stop being checkable within a single table. Sometimes that is unavoidable.',
    ],
  },
  '4NF': {
    name: 'Fourth normal form',
    rule: 'A table does not mix two independent facts about the same thing. If X ↠ Y | Z, then X must be a key.',
    how: [
      'Look for tables where almost everything is key: the same X with several values of Y and several values of Z.',
      'Ask: for the same X, are the values of Y and Z combined every way, with no relationship between them? If so, there is a multivalued dependency X ↠ Y | Z.',
      'Store each fact in its own table: one with X and Y, another with X and Z. The key of each is its two attributes.',
      'Check that nothing is lost: joining the two tables on X must give exactly the original table.',
    ],
  },
  '5NF': {
    name: 'Fifth normal form',
    rule: 'No table can be rebuilt by joining smaller tables, except through its keys.',
    how: [
      'Look for tables with three or more attributes that are all key and have no multivalued dependencies.',
      'Ask: is there a rule of the form "if A–B, B–C and A–C all hold, then A–B–C holds"? Then the table can be rebuilt from its pairs.',
      'Replace it with one table per pair: (A, B), (B, C) and (A, C).',
      'Check that with only two of the three pairs, rows that never existed appear: all of them are needed.',
      'Careful: this is only correct if the rule always holds. If it is a coincidence of the current data, the table with all three attributes is the right one.',
    ],
  },
};

DATA.en.EXERCISES = [
  {
    id: 'order-lines',
    title: 'Order lines',
    short: 'Order lines',
    story: 'A shop stores every order line in a single table. Take it to 2NF.',
    attrs: ['order_id', 'product_id', 'quantity', 'product_name', 'price'],
    pk: ['order_id', 'product_id'],
    fds: [
      'order_id, product_id -> quantity',
      'product_id -> product_name, price',
    ],
    rows: [
      [1, 'P1', 2, 'Keyboard', 30],
      [1, 'P2', 1, 'Mouse', 15],
      [2, 'P1', 5, 'Keyboard', 30],
      [3, 'P3', 1, 'Monitor', 180],
      [3, 'P2', 2, 'Mouse', 15],
      [4, 'P1', 1, 'Keyboard', 30],
    ],
    steps: [
      {
        nf: '2NF',
        solution: [
          { name: 'OrderLine', attrs: ['order_id', 'product_id', 'quantity'], pk: ['order_id', 'product_id'] },
          { name: 'Product', attrs: ['product_id', 'product_name', 'price'], pk: ['product_id'] },
        ],
        hints: [
          'The key has two attributes. For each of the others, ask: is part of the key enough to know it?',
          'product_name and price are known from product_id alone: they depend on part of the key.',
          'Move them to their own table, with product_id as the key. The original table keeps order_id, product_id and quantity.',
        ],
        insight:
          'A product’s name and price were stored once for every line it appeared in. Now they live in a single Product row: changing a price is one update.',
      },
    ],
  },

  {
    id: 'employees-departments',
    title: 'Employees and departments',
    short: 'Employees',
    story: 'A company stores its employees together with their department’s data. Take it to 3NF.',
    attrs: ['employee_id', 'name', 'dept_id', 'dept_name', 'location'],
    pk: ['employee_id'],
    fds: [
      'employee_id -> name, dept_id',
      'dept_id -> dept_name, location',
    ],
    rows: [
      [1, 'Ana', 'D1', 'Sales', 'Floor 1'],
      [2, 'Luis', 'D1', 'Sales', 'Floor 1'],
      [3, 'Eva', 'D2', 'IT', 'Floor 3'],
      [4, 'Marc', 'D1', 'Sales', 'Floor 1'],
      [5, 'Lucía', 'D3', 'Accounting', 'Floor 2'],
    ],
    steps: [
      {
        nf: '3NF',
        solution: [
          { name: 'Employee', attrs: ['employee_id', 'name', 'dept_id'], pk: ['employee_id'] },
          { name: 'Department', attrs: ['dept_id', 'dept_name', 'location'], pk: ['dept_id'] },
        ],
        hints: [
          'The key is a single attribute, so there can be no partial dependencies. Look for attributes that depend on another attribute that is not the key.',
          'dept_id determines dept_name and location, and dept_id is not the table’s key.',
          'Move them to another table with dept_id as the key, but keep dept_id in Employee as well so the two can be linked.',
        ],
        insight:
          'employee_id → dept_id → dept_name is a transitive dependency. If a department moves floors, it used to mean fixing one row per employee; now it is a single row.',
      },
    ],
  },

  {
    id: 'enrollments',
    title: 'Enrollments',
    short: 'Enrollments',
    story: 'A university stores enrollments together with the data of each student and each course. Take it to 2NF.',
    attrs: ['student_id', 'course_id', 'student_name', 'course_name', 'credits', 'grade'],
    pk: ['student_id', 'course_id'],
    fds: [
      'student_id, course_id -> grade',
      'student_id -> student_name',
      'course_id -> course_name, credits',
    ],
    rows: [
      ['A1', 'DB', 'Ana', 'Databases', 6, 8],
      ['A1', 'PRG', 'Ana', 'Programming', 6, 7],
      ['A2', 'DB', 'Luis', 'Databases', 6, 6],
      ['A2', 'NET', 'Luis', 'Networks', 4, 7],
      ['A3', 'PRG', 'Eva', 'Programming', 6, 9],
      ['A3', 'DB', 'Eva', 'Databases', 6, 5],
    ],
    steps: [
      {
        nf: '2NF',
        solution: [
          { name: 'Student', attrs: ['student_id', 'student_name'], pk: ['student_id'] },
          { name: 'Course', attrs: ['course_id', 'course_name', 'credits'], pk: ['course_id'] },
          { name: 'Enrollment', attrs: ['student_id', 'course_id', 'grade'], pk: ['student_id', 'course_id'] },
        ],
        hints: [
          'For each non-key attribute, ask: can it be known from student_id alone? From course_id alone?',
          'student_name depends only on student_id; course_name and credits only on course_id. Only grade needs both parts of the key.',
          'Three tables: Student, Course and Enrollment (with the grade and both keys).',
        ],
        insight:
          'Only the grade describes the student–course pair. The rest describes a student or a course, and it was repeated in every enrollment.',
      },
    ],
  },

  {
    id: 'medical-appointments',
    title: 'Medical appointments',
    short: 'Appointments',
    story: 'A clinic records each appointment together with the patient’s and the doctor’s data. Take it to 3NF.',
    attrs: ['appointment_id', 'date', 'patient_id', 'patient_name', 'doctor_id', 'doctor_name', 'specialty'],
    pk: ['appointment_id'],
    fds: [
      'appointment_id -> date, patient_id, doctor_id',
      'patient_id -> patient_name',
      'doctor_id -> doctor_name, specialty',
    ],
    rows: [
      [101, '2026-10-05', 'P1', 'Marta Gil', 'M1', 'Dr. Ruiz', 'Cardiology'],
      [102, '2026-10-05', 'P2', 'Pablo León', 'M1', 'Dr. Ruiz', 'Cardiology'],
      [103, '2026-10-06', 'P1', 'Marta Gil', 'M2', 'Dr. Soto', 'Dermatology'],
      [104, '2026-10-07', 'P3', 'Irene Sanz', 'M2', 'Dr. Soto', 'Dermatology'],
      [105, '2026-10-08', 'P2', 'Pablo León', 'M1', 'Dr. Ruiz', 'Cardiology'],
    ],
    steps: [
      {
        nf: '3NF',
        solution: [
          { name: 'Appointment', attrs: ['appointment_id', 'date', 'patient_id', 'doctor_id'], pk: ['appointment_id'] },
          { name: 'Patient', attrs: ['patient_id', 'patient_name'], pk: ['patient_id'] },
          { name: 'Doctor', attrs: ['doctor_id', 'doctor_name', 'specialty'], pk: ['doctor_id'] },
        ],
        hints: [
          'appointment_id identifies the appointment, but the row also describes a patient and a doctor. Which data belongs to each?',
          'patient_name depends on patient_id, and doctor_name and specialty on doctor_id. Neither is the table’s key.',
          'You need three tables. Appointment keeps patient_id and doctor_id as references.',
        ],
        insight:
          'The doctor’s data was repeated in each of their appointments. Now, if their specialty changes, a single row is updated.',
      },
    ],
  },

  {
    id: 'customers',
    title: 'Customers',
    short: 'Customers',
    story:
      'A club stores its members in a single table. Leave it in 3NF, but without splitting more than needed: split only if a dependency justifies it.',
    attrs: ['customer_id', 'name', 'email', 'city'],
    pk: ['customer_id'],
    fds: ['customer_id -> name, email, city'],
    rows: [
      [1, 'Ana Ruiz', 'ana@mail.com', 'Madrid'],
      [2, 'Luis Pérez', 'luis@mail.com', 'Madrid'],
      [3, 'Eva Soto', 'eva@mail.com', 'Seville'],
      [4, 'Marc Puig', 'marc@mail.com', 'Barcelona'],
    ],
    steps: [
      {
        nf: '3NF',
        vacuous: true,
        solution: [
          { name: 'Customer', attrs: ['customer_id', 'name', 'email', 'city'], pk: ['customer_id'] },
        ],
        hints: [
          'Before splitting, look for dependencies: does any attribute depend on another one that is not customer_id?',
          'city repeats, but it determines no other attribute. Repeating a value is not the same as depending on another.',
          'If you find no dependency, the table is already in 3NF and there is nothing to separate: leave it as a single table.',
        ],
        insight:
          'city repeats, but it determines no other attribute: repeating a value is not the same as depending on another. Splitting here prevents no anomaly. A cities table would be a design decision (for example, to avoid typos), not a 3NF requirement.',
      },
    ],
  },

  {
    id: 'library',
    title: 'Library loans',
    short: 'Library',
    story:
      'A library records each loan with the data of the member, the book and the author. Each loan is for a single book and each book has a single author. Take it to 3NF.',
    attrs: ['loan_id', 'date', 'member_id', 'member_name', 'book_id', 'title', 'author_id', 'author_name'],
    pk: ['loan_id'],
    fds: [
      'loan_id -> date, member_id, book_id',
      'member_id -> member_name',
      'book_id -> title, author_id',
      'author_id -> author_name',
    ],
    rows: [
      [1, '2026-09-01', 'S1', 'Ana', 'L1', 'Don Quixote', 'A1', 'Cervantes'],
      [2, '2026-09-03', 'S2', 'Luis', 'L1', 'Don Quixote', 'A1', 'Cervantes'],
      [3, '2026-09-05', 'S1', 'Ana', 'L2', 'The Regent’s Wife', 'A2', 'Clarín'],
      [4, '2026-09-08', 'S3', 'Eva', 'L3', 'Fortunata and Jacinta', 'A3', 'Galdós'],
      [5, '2026-09-09', 'S2', 'Luis', 'L2', 'The Regent’s Wife', 'A2', 'Clarín'],
    ],
    steps: [
      {
        nf: '3NF',
        solution: [
          { name: 'Loan', attrs: ['loan_id', 'date', 'member_id', 'book_id'], pk: ['loan_id'] },
          { name: 'Member', attrs: ['member_id', 'member_name'], pk: ['member_id'] },
          { name: 'Book', attrs: ['book_id', 'title', 'author_id'], pk: ['book_id'] },
          { name: 'Author', attrs: ['author_id', 'author_name'], pk: ['author_id'] },
        ],
        hints: [
          'Each row mixes four different things: a loan, a member, a book and an author.',
          'There is a chain of dependencies: loan_id → book_id → author_id → author_name. Each link needs its own table.',
          'Four tables: Loan, Member, Book and Author. The references (member_id, book_id, author_id) stay in the table that points to the other.',
        ],
        insight:
          'Four different things lived in the same row. Each now has its own table, and the foreign keys (member_id, book_id, author_id) connect them.',
      },
    ],
  },

  {
    id: 'full-orders',
    title: 'Full orders',
    short: 'Orders',
    story:
      'An online shop stores everything in a single table. Take it to 3NF in two steps: first separate what depends on part of the key (2NF), then the chains of dependencies (3NF).',
    attrs: ['order_id', 'product_id', 'quantity', 'customer_id', 'customer_name', 'zip', 'city', 'product_name', 'price'],
    pk: ['order_id', 'product_id'],
    fds: [
      'order_id, product_id -> quantity',
      'order_id -> customer_id',
      'customer_id -> customer_name, zip',
      'zip -> city',
      'product_id -> product_name, price',
    ],
    rows: [
      [1, 'P1', 2, 'C1', 'Ana', '28001', 'Madrid', 'Keyboard', 30],
      [1, 'P2', 1, 'C1', 'Ana', '28001', 'Madrid', 'Mouse', 15],
      [2, 'P1', 1, 'C2', 'Luis', '08001', 'Barcelona', 'Keyboard', 30],
      [3, 'P3', 1, 'C1', 'Ana', '28001', 'Madrid', 'Monitor', 180],
      [3, 'P2', 3, 'C1', 'Ana', '28001', 'Madrid', 'Mouse', 15],
      [4, 'P2', 1, 'C3', 'Eva', '28040', 'Madrid', 'Mouse', 15],
    ],
    steps: [
      {
        nf: '2NF',
        solution: [
          { name: 'OrderLine', attrs: ['order_id', 'product_id', 'quantity'], pk: ['order_id', 'product_id'] },
          { name: 'Orders', attrs: ['order_id', 'customer_id', 'customer_name', 'zip', 'city'], pk: ['order_id'] },
          { name: 'Product', attrs: ['product_id', 'product_name', 'price'], pk: ['product_id'] },
        ],
        hints: [
          'The key is (order_id, product_id). For each attribute ask: do I know it from order_id alone? From product_id alone?',
          'From order_id you know the customer and everything about the customer (name, zip, city). From product_id, the product’s name and price.',
          'Three tables: OrderLine (with the quantity), Orders (with everything about the customer, for now) and Product.',
        ],
        insight:
          '2NF separates by parts of the key: what describes the order, what describes the product and what describes the line (the quantity). Orders still carries a chain of dependencies: that is 3NF’s job.',
      },
      {
        nf: '3NF',
        solution: [
          { name: 'OrderLine', attrs: ['order_id', 'product_id', 'quantity'], pk: ['order_id', 'product_id'] },
          { name: 'Orders', attrs: ['order_id', 'customer_id'], pk: ['order_id'] },
          { name: 'Customer', attrs: ['customer_id', 'customer_name', 'zip'], pk: ['customer_id'] },
          { name: 'ZipCode', attrs: ['zip', 'city'], pk: ['zip'] },
          { name: 'Product', attrs: ['product_id', 'product_name', 'price'], pk: ['product_id'] },
        ],
        hints: [
          'Tables with a simple key already meet 2NF. Look in them for attributes that depend on another attribute that is not a key.',
          'In Orders there is a chain: order_id → customer_id → customer_name, zip → city. Each link is a non-key attribute that determines others.',
          'Move customer_name and zip to Customer (key customer_id) and city to ZipCode (key zip). Keep customer_id in Orders and zip in Customer to link them.',
        ],
        insight:
          '3NF breaks the chain order → customer → zip code → city: each link has its own table. Five tables, and every piece of data lives in exactly one place.',
      },
    ],
  },

  {
    id: 'tutoring',
    title: 'Tutoring',
    short: 'Tutoring',
    story:
      'Each student signs up for subjects and gets tutoring from a teacher. A teacher tutors only one subject, but a subject can have several teachers. A student has at most one teacher per subject. The table is already in 3NF: take it to BCNF.',
    attrs: ['student', 'subject', 'teacher'],
    pk: ['student', 'subject'],
    fds: [
      'student, subject -> teacher',
      'teacher -> subject',
    ],
    rows: [
      ['Ana', 'DB', 'Ruiz'],
      ['Ana', 'PRG', 'Soto'],
      ['Luis', 'DB', 'Ruiz'],
      ['Luis', 'PRG', 'Soto'],
      ['Eva', 'DB', 'Mora'],
      ['Eva', 'NET', 'Lara'],
    ],
    steps: [
      {
        nf: 'BCNF',
        allowLoss: true,
        solution: [
          { name: 'Teacher', attrs: ['teacher', 'subject'], pk: ['teacher'] },
          { name: 'Tutoring', attrs: ['student', 'teacher'], pk: ['student', 'teacher'] },
        ],
        hints: [
          'The table already meets 3NF, but BCNF is stricter. Look at the left-hand side of every dependency: is it always a key of the table?',
          'teacher → subject: the teacher determines the subject, but does not identify a row by itself (a teacher has several students).',
          'Move teacher and subject to a table keyed by teacher. In the other, keep student and teacher, which together form the key.',
        ],
        insight:
          'A teacher’s subject was repeated in each of their tutoring sessions. Now it lives in a single row. The price: the rule "a student has one teacher per subject" no longer fits in a single table and has to be enforced some other way. It is the classic case where BCNF does not preserve every dependency.',
      },
    ],
  },

  {
    id: 'skills-languages',
    title: 'Skills and languages',
    short: 'Skills',
    story:
      'Human Resources stores each employee’s skills and languages. There is no relationship between an employee’s skills and their languages: all combinations are stored. Take it to 4NF.',
    attrs: ['employee', 'skill', 'language'],
    pk: ['employee', 'skill', 'language'],
    fds: [],
    mvds: ['employee ->> skill'],
    rows: [
      ['Ana', 'SQL', 'English'],
      ['Ana', 'SQL', 'French'],
      ['Ana', 'Python', 'English'],
      ['Ana', 'Python', 'French'],
      ['Luis', 'Networking', 'English'],
      ['Luis', 'Networking', 'German'],
      ['Eva', 'Java', 'English'],
      ['Eva', 'SQL', 'English'],
    ],
    steps: [
      {
        nf: '4NF',
        solution: [
          { name: 'Skill', attrs: ['employee', 'skill'], pk: ['employee', 'skill'] },
          { name: 'Language', attrs: ['employee', 'language'], pk: ['employee', 'language'] },
        ],
        hints: [
          'There are no functional dependencies: the key is all three attributes. Even so, there is redundancy. Look at how each employee’s data repeats.',
          'For each employee, their skills and their languages are combined every way. They are two independent facts: employee ↠ skill and employee ↠ language.',
          'Store each fact in its own table: (employee, skill) and (employee, language), with both attributes of each as the key.',
        ],
        insight:
          'Ana had 2 skills and 2 languages, so she took up 4 rows: adding a language meant adding one row per skill. Now it is a single row in Language. Separating independent facts removes that multiplication.',
      },
    ],
  },

  {
    id: 'suppliers-parts',
    title: 'Suppliers, parts and projects',
    short: 'Supplies',
    story:
      'A construction company records which supplier supplies which part to which project. This rule always holds: if a supplier supplies a part, that part is used in a project and that supplier works for that project, then the supplier supplies that part to that project. Take it to 5NF.',
    attrs: ['supplier', 'part', 'project'],
    pk: ['supplier', 'part', 'project'],
    fds: [],
    jds: ['supplier, part | part, project | supplier, project'],
    rows: [
      ['Acme', 'Screw', 'Bridge'],
      ['Acme', 'Nut', 'Bridge'],
      ['Beta', 'Screw', 'Tower'],
      ['Beta', 'Washer', 'Tower'],
      ['Gamma', 'Nut', 'Bridge'],
      ['Gamma', 'Washer', 'Tower'],
    ],
    steps: [
      {
        nf: '5NF',
        solution: [
          { name: 'SupplierPart', attrs: ['supplier', 'part'], pk: ['supplier', 'part'] },
          { name: 'PartProject', attrs: ['part', 'project'], pk: ['part', 'project'] },
          { name: 'SupplierProject', attrs: ['supplier', 'project'], pk: ['supplier', 'project'] },
        ],
        hints: [
          'There are no functional or multivalued dependencies: the table is already in 4NF. But the rule in the statement says it can be rebuilt from its pairs of attributes.',
          'Try splitting into two tables, for example (supplier, part) and (part, project), and joining them: rows appear that were not there. All three pairs are needed.',
          'Three tables: (supplier, part), (part, project) and (supplier, project), each with its two attributes as the key.',
        ],
        insight:
          'The rule lets you rebuild the original table by joining the three pairs, but any two of them on their own invent rows. It is a join dependency, and 5NF removes it. Careful: it is only correct if the rule always holds; if it were a coincidence of the current data, the table with all three attributes would be the right one.',
      },
    ],
  },

  {
    id: 'suppliers-1nf-5nf',
    title: 'From 1NF to 5NF: supplies',
    short: '1NF to 5NF',
    story:
      'A construction company stores in a single table the data of its suppliers, the parts they supply and the projects they work on. Each supplier has several certifications, independent of what they supply. In addition, this rule always holds: if a supplier supplies a part, that part is used in a project and the supplier works on that project, then they supply that part to that project. Take it from 1NF to 5NF, step by step.',
    attrs: ['supplier_id', 'supplier_name', 'city_id', 'city_name', 'certification', 'part_id', 'part_name', 'project_id'],
    pk: ['supplier_id', 'certification', 'part_id', 'project_id'],
    fds: [
      'supplier_id -> supplier_name, city_id',
      'city_id -> city_name',
      'part_id -> part_name',
    ],
    mvds: [{ def: 'supplier_id ->> certification', show: 'supplier_id ↠ certification' }],
    jds: [
      {
        def:
          'supplier_id, supplier_name, city_id, city_name, certification | supplier_id, supplier_name, city_id, city_name, part_id, part_name | part_id, part_name, project_id | supplier_id, supplier_name, city_id, city_name, project_id',
        show: '{supplier_id, part_id} ⋈ {part_id, project_id} ⋈ {supplier_id, project_id}',
      },
    ],
    rows: [
      ['V1', 'Acme', 'C1', 'Madrid', 'ISO 9001', 'P1', 'Screw', 'J2'],
      ['V1', 'Acme', 'C1', 'Madrid', 'ISO 14001', 'P1', 'Screw', 'J2'],
      ['V1', 'Acme', 'C1', 'Madrid', 'ISO 9001', 'P1', 'Screw', 'J3'],
      ['V1', 'Acme', 'C1', 'Madrid', 'ISO 14001', 'P1', 'Screw', 'J3'],
      ['V2', 'Beta', 'C1', 'Madrid', 'ISO 9001', 'P1', 'Screw', 'J3'],
      ['V2', 'Beta', 'C1', 'Madrid', 'ISO 9001', 'P2', 'Nut', 'J1'],
      ['V3', 'Gamma', 'C2', 'Bilbao', 'ISO 14001', 'P2', 'Nut', 'J2'],
    ],
    steps: [
      {
        nf: '2NF',
        solution: [
          { name: 'Supplier', attrs: ['supplier_id', 'supplier_name', 'city_id', 'city_name'], pk: ['supplier_id'] },
          { name: 'Part', attrs: ['part_id', 'part_name'], pk: ['part_id'] },
          { name: 'Supply', attrs: ['supplier_id', 'certification', 'part_id', 'project_id'], pk: ['supplier_id', 'certification', 'part_id', 'project_id'] },
        ],
        hints: [
          'The key is four attributes: supplier, certification, part and project. Look for the attributes that can be known from just part of it.',
          'From supplier_id you know the supplier’s name and everything about their city. From part_id, the part’s name.',
          'Move out Supplier (with everything about the supplier, for now) and Part. Supply keeps the four attributes of the key.',
        ],
        insight:
          'Every descriptive piece of data (name of the supplier, of the part, of the city) was repeated in every row of its supplier or part. 2NF sends them to the entity they describe. Supply is still an all-key table: by parts of the key there is nothing left to remove.',
      },
      {
        nf: '3NF',
        solution: [
          { name: 'Supplier', attrs: ['supplier_id', 'supplier_name', 'city_id'], pk: ['supplier_id'] },
          { name: 'City', attrs: ['city_id', 'city_name'], pk: ['city_id'] },
          { name: 'Part', attrs: ['part_id', 'part_name'], pk: ['part_id'] },
          { name: 'Supply', attrs: ['supplier_id', 'certification', 'part_id', 'project_id'], pk: ['supplier_id', 'certification', 'part_id', 'project_id'] },
        ],
        hints: [
          'Supplier has a simple key, so there are no partial dependencies. Look for attributes that depend on another one that is not a key.',
          'supplier_id → city_id → city_name: the city’s name depends on the city, not on the supplier.',
          'Move city_name to a City table (key city_id) and keep city_id in Supplier to link them.',
        ],
        insight:
          'Two suppliers in Madrid repeated "Madrid". With the chain supplier → city → city name broken, each name lives in a single row.',
      },
      {
        nf: '4NF',
        solution: [
          { name: 'Supplier', attrs: ['supplier_id', 'supplier_name', 'city_id'], pk: ['supplier_id'] },
          { name: 'City', attrs: ['city_id', 'city_name'], pk: ['city_id'] },
          { name: 'Part', attrs: ['part_id', 'part_name'], pk: ['part_id'] },
          { name: 'Certification', attrs: ['supplier_id', 'certification'], pk: ['supplier_id', 'certification'] },
          { name: 'Supply', attrs: ['supplier_id', 'part_id', 'project_id'], pk: ['supplier_id', 'part_id', 'project_id'] },
        ],
        hints: [
          'No functional dependencies are left to break. Look at Supply: what happens to its rows when a supplier gets a new certification?',
          'A supplier’s certifications do not depend on what they supply: they are combined with all of their part–project rows. That is supplier_id ↠ certification.',
          'Move (supplier_id, certification) to its own table, with both attributes as the key. Supply keeps supplier_id, part_id and project_id.',
        ],
        insight:
          'A supplier with two certifications repeated each supply twice. Certifications are a fact independent of what they supply: each fact in its own table.',
      },
      {
        nf: '5NF',
        solution: [
          { name: 'Supplier', attrs: ['supplier_id', 'supplier_name', 'city_id'], pk: ['supplier_id'] },
          { name: 'City', attrs: ['city_id', 'city_name'], pk: ['city_id'] },
          { name: 'Part', attrs: ['part_id', 'part_name'], pk: ['part_id'] },
          { name: 'Certification', attrs: ['supplier_id', 'certification'], pk: ['supplier_id', 'certification'] },
          { name: 'SupplierPart', attrs: ['supplier_id', 'part_id'], pk: ['supplier_id', 'part_id'] },
          { name: 'PartProject', attrs: ['part_id', 'project_id'], pk: ['part_id', 'project_id'] },
          { name: 'SupplierProject', attrs: ['supplier_id', 'project_id'], pk: ['supplier_id', 'project_id'] },
        ],
        hints: [
          'Supply no longer has multivalued dependencies, but it satisfies a subtler rule: it can be rebuilt from its pairs of attributes.',
          'The rule in the statement: if the supplier supplies the part, the part is used in the project and the supplier works on it, then they supply that part to that project. With only two pairs, invented rows appear.',
          'Replace Supply with three tables: (supplier_id, part_id), (part_id, project_id) and (supplier_id, project_id), each with its two attributes as the key.',
        ],
        insight:
          'The ternary table was storing information that is already implied by three simpler facts. Seven tables later, every piece of data lives in one place and every table says one thing. Remember the caveat: 5NF is only correct if the rule always holds.',
      },
    ],
  },
];

DATA.en.ADV_OPTIONS = ['Meets 3NF, but not BCNF', 'Meets BCNF, but not 4NF', 'Meets 4NF, but not 5NF', 'Meets 5NF'];

DATA.en.QUESTIONS = [
  {
    name: 'Student',
    cols: ['student_id', 'name', 'phones'],
    pk: ['student_id'],
    rows: [
      ['A1', 'Ana', '611 111 111, 622 222 222'],
      ['A2', 'Luis', '633 333 333'],
    ],
    answer: 0,
    why: 'The phones column holds several values in a single cell. One cell, one value: each phone should go in its own row.',
  },
  {
    name: 'Enrollment',
    cols: ['student_id', 'course_id', 'grade', 'course_name'],
    pk: ['student_id', 'course_id'],
    rows: [
      ['A1', 'DB', 8, 'Databases'],
      ['A2', 'DB', 6, 'Databases'],
      ['A1', 'NET', 7, 'Networks'],
    ],
    fds: ['student_id, course_id -> grade', 'course_id -> course_name'],
    answer: 1,
    why: 'course_name depends only on course_id, which is part of the key. It is a partial dependency and breaks 2NF.',
  },
  {
    name: 'Book',
    cols: ['book_id', 'title', 'publisher_id', 'publisher_country'],
    pk: ['book_id'],
    rows: [
      ['L1', 'Don Quixote', 'E1', 'Spain'],
      ['L2', 'The Regent’s Wife', 'E1', 'Spain'],
      ['L3', 'Ficciones', 'E2', 'Argentina'],
    ],
    fds: ['book_id -> title, publisher_id', 'publisher_id -> publisher_country'],
    answer: 2,
    why: 'The key is a single attribute, so 2NF holds. But book_id → publisher_id → publisher_country is a transitive dependency and breaks 3NF.',
  },
  {
    name: 'Customer',
    cols: ['customer_id', 'name', 'email'],
    pk: ['customer_id'],
    rows: [
      ['C1', 'Ana', 'ana@mail.com'],
      ['C2', 'Luis', 'luis@mail.com'],
    ],
    fds: ['customer_id -> name, email'],
    answer: 3,
    why: 'Every attribute depends on the key, the whole key and nothing but the key. There is nothing to fix.',
  },
  {
    name: 'Order',
    cols: ['order_id', 'product1', 'product2', 'product3'],
    pk: ['order_id'],
    rows: [
      [1, 'Keyboard', 'Mouse', ''],
      [2, 'Monitor', '', ''],
      [3, 'Keyboard', 'Monitor', 'Mouse'],
    ],
    answer: 0,
    why: 'product1, product2 and product3 are a repeating group: it breaks 1NF. There is no fixed number of products per order; they should be rows, not columns.',
  },
  {
    name: 'OrderLine',
    cols: ['order_id', 'product_id', 'quantity', 'sale_price'],
    pk: ['order_id', 'product_id'],
    rows: [
      [1, 'P1', 2, 28],
      [2, 'P1', 1, 30],
      [2, 'P2', 1, 15],
    ],
    fds: ['order_id, product_id -> quantity, sale_price'],
    note: 'sale_price is the price applied on that line, and it can change from one order to another.',
    answer: 3,
    why: 'sale_price describes that particular line (P1 sold at 28 and at 30), so it depends on the whole key. There are no partial or transitive dependencies.',
  },
  {
    name: 'Schedule',
    cols: ['room_id', 'time', 'subject', 'capacity'],
    pk: ['room_id', 'time'],
    rows: [
      ['A1', '09:00', 'Databases', 40],
      ['A1', '11:00', 'Programming', 40],
      ['A2', '09:00', 'Networks', 25],
    ],
    fds: ['room_id, time -> subject', 'room_id -> capacity'],
    answer: 1,
    why: 'capacity depends only on room_id, part of the key. It is a partial dependency and breaks 2NF.',
  },
  {
    name: 'Vehicle',
    cols: ['plate', 'brand', 'model', 'power'],
    pk: ['plate'],
    rows: [
      ['1234 ABC', 'Seat', 'Ibiza', 95],
      ['5678 DEF', 'Seat', 'Ibiza', 95],
      ['9012 GHI', 'Ford', 'Focus', 125],
    ],
    fds: ['plate -> brand, model, power', 'model -> power'],
    answer: 2,
    why: 'plate → model → power is a transitive dependency: power depends on model, which is not a key. It breaks 3NF.',
  },
  {
    name: 'Participation',
    cols: ['student_id', 'project_id', 'role', 'hours'],
    pk: ['student_id', 'project_id'],
    rows: [
      ['A1', 'PR1', 'Leader', 40],
      ['A2', 'PR1', 'Analyst', 25],
      ['A1', 'PR2', 'Analyst', 30],
    ],
    fds: ['student_id, project_id -> role, hours'],
    answer: 3,
    why: 'role and hours describe a student’s participation in a project: they depend on the whole key and on nothing else.',
  },
  {
    name: 'Record',
    cols: ['student_id', 'course_id', 'grade', 'result'],
    pk: ['student_id', 'course_id'],
    rows: [
      ['A1', 'DB', 8, 'Pass'],
      ['A2', 'DB', 4, 'Fail'],
      ['A1', 'NET', 6, 'Pass'],
    ],
    fds: ['student_id, course_id -> grade', 'grade -> result'],
    note: 'result is Pass if the grade is 5 or more, and Fail if it is lower.',
    answer: 2,
    why: 'No attribute depends on part of the key, so 2NF holds. But result depends on grade, which is not a key: a transitive dependency, and 3NF is broken.',
  },

  /* ---- Advanced: BCNF, 4NF and 5NF -------------------------------------- */
  {
    adv: true,
    name: 'Appointment',
    cols: ['patient_id', 'specialty', 'doctor_id'],
    pk: ['patient_id', 'specialty'],
    rows: [
      ['P1', 'Cardiology', 'M1'],
      ['P2', 'Cardiology', 'M1'],
      ['P1', 'Dermatology', 'M2'],
      ['P3', 'Cardiology', 'M3'],
    ],
    fds: ['patient_id, specialty -> doctor_id', 'doctor_id -> specialty'],
    answer: 0,
    why: 'doctor_id → specialty, but doctor_id is not a key of the table. Since specialty is part of a key, 3NF tolerates it; BCNF does not: every determinant must be a key.',
  },
  {
    adv: true,
    name: 'Team',
    cols: ['project_id', 'employee_id', 'language'],
    pk: ['project_id', 'employee_id', 'language'],
    rows: [
      ['PR1', 'E1', 'Java'],
      ['PR1', 'E1', 'SQL'],
      ['PR1', 'E2', 'Java'],
      ['PR1', 'E2', 'SQL'],
      ['PR2', 'E1', 'Python'],
    ],
    fds: [],
    mvds: ['project_id ->> employee_id'],
    note: 'The languages of a project do not depend on which employees work on it, nor the other way round: all combinations occur.',
    answer: 1,
    why: 'There are no functional dependencies, so it meets BCNF. But project_id ↠ employee_id | language: a project’s employees and languages are independent facts that multiply in the same table. It breaks 4NF.',
  },
  {
    adv: true,
    name: 'Sale',
    cols: ['salesperson', 'product', 'client'],
    pk: ['salesperson', 'product', 'client'],
    rows: [
      ['Ana', 'Insurance', 'Textile Inc'],
      ['Ana', 'Fund', 'South Print'],
      ['Bruno', 'Insurance', 'Textile Inc'],
      ['Bruno', 'Mortgage', 'Textile Inc'],
      ['Carla', 'Mortgage', 'South Print'],
    ],
    fds: [],
    jds: ['salesperson, product | product, client | salesperson, client'],
    note: 'Rule: if a salesperson sells a product, a client buys that product and the salesperson serves that client, then the salesperson sells that product to that client.',
    answer: 2,
    why: 'There are no functional or multivalued dependencies: it meets 4NF. But the rule lets you rebuild the table by joining its three pairs (salesperson–product, product–client and salesperson–client): it is a join dependency and breaks 5NF.',
  },
  {
    adv: true,
    name: 'Enrollment',
    cols: ['student_id', 'course_id', 'grade'],
    pk: ['student_id', 'course_id'],
    rows: [
      ['A1', 'DB', 8],
      ['A2', 'DB', 6],
      ['A1', 'NET', 7],
    ],
    fds: ['student_id, course_id -> grade'],
    answer: 3,
    why: 'The only dependency starts from the whole key, and there are no independent facts or rules that let you rebuild the table from smaller ones. It meets 5NF.',
  },
  {
    adv: true,
    name: 'Contact',
    cols: ['person_id', 'phone', 'email'],
    pk: ['person_id', 'phone', 'email'],
    rows: [
      ['P1', '611 111 111', 'ana@home.com'],
      ['P1', '611 111 111', 'ana@work.com'],
      ['P1', '622 222 222', 'ana@home.com'],
      ['P1', '622 222 222', 'ana@work.com'],
      ['P2', '633 333 333', 'luis@home.com'],
    ],
    fds: [],
    mvds: ['person_id ->> phone'],
    note: 'A person’s phones have no relationship with their email addresses.',
    answer: 1,
    why: 'With no functional dependencies, it meets BCNF. But person_id ↠ phone | email: two independent facts in the same table, and P1 takes up 4 rows for 2 phones and 2 emails. It breaks 4NF.',
  },
  {
    adv: true,
    name: 'Follows',
    cols: ['user_id', 'channel_id'],
    pk: ['user_id', 'channel_id'],
    rows: [
      ['U1', 'C1'],
      ['U1', 'C2'],
      ['U2', 'C1'],
      ['U3', 'C3'],
    ],
    fds: [],
    answer: 3,
    why: 'A two-column table whose columns form the whole key cannot be decomposed without losing information: it has neither independent facts nor join rules. It meets 5NF.',
  },
];
