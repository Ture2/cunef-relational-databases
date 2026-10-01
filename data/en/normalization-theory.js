'use strict';
/* Normalization theory: one card per concept, read before the exercises (js/normalization-section.js).
   Card fields: those of js/concept-section.js, plus
     nf      a normal form id ('2NF'...): the card shows NF_INFO[nf].how and links to an exercise of that form
     video   true: the card embeds the course video (assets/video/) with its chapters
   Tables: the first column is a row header; **bold** headers are primary-key columns.
   The running example is the enrolment table of the video (Ana Ruiz, Databases, Computing). */
DATA.en.NORM_THEORY = [
  /* ───────────── Why normalize ───────────── */
  {
    id: 'anomalies',
    hub: 'why',
    title: 'Redundancy and anomalies',
    summary: 'A table that mixes several facts **repeats** data. Every repetition invites three **anomalies**: update, insertion and deletion.',
    body: [
      'This table stores all enrolments in one place. Its key is (student id, course id), one row per enrolment. But the student\'s name repeats in every course they take, and the course title, credits and department repeat for every student enrolled.',
    ],
    points: [
      '**Update anomaly**: rename course C10 in one row only, and the same course now has two titles.',
      '**Insertion anomaly**: a new course with no students yet cannot be stored, because course id alone is not a key and student id cannot be NULL.',
      '**Deletion anomaly**: delete the last enrolment of a course, and the course\'s title and credits disappear with it.',
    ],
    table: {
      caption: 'Enrolment: one wide table (bold = primary key)',
      head: ['**student id**', '**course id**', 'student name', 'course title', 'credits', 'dept', 'grade'],
      rows: [
        ['S01', 'C10', 'Ana Ruiz', 'Databases', '6', 'Computing', '8.5'],
        ['S01', 'C20', 'Ana Ruiz', 'Statistics', '6', 'Maths', '7.0'],
        ['S02', 'C10', 'Luis Gil', 'Databases', '6', 'Computing', '6.5'],
        ['S03', 'C10', 'Eva Sanz', 'Databases', '6', 'Computing', '5.0'],
      ],
    },
    example: 'Normalization splits this table so each fact is stored once: students in one table, courses in another, departments in a third, and enrolments (student, course, grade) linking them.',
    mistake: 'Thinking redundancy only wastes space. The real cost is inconsistency: two rows that should agree can come to disagree.',
  },
  {
    id: 'video',
    hub: 'why',
    title: 'Video: normalization step by step',
    summary: 'A six-minute walk-through of the whole path, from one messy table to 1NF, 2NF, 3NF and BCNF, with the same example as these cards.',
    body: [
      'Watch it once before the cards, or use the chapters to jump to the step you need.',
    ],
    video: true,
  },

  /* ───────────── Dependencies ───────────── */
  {
    id: 'fd',
    hub: 'deps',
    title: 'Functional dependency',
    summary: '`X → Y` (X **determines** Y) means: two rows that agree on X always agree on Y. Knowing X, there is only one possible Y.',
    body: [
      'Dependencies come from the **meaning** of the data, not from one sample. Each student has one name, so `student id → student name`. A course has one title and one number of credits, so `course id → course title, credits`.',
      'Data can **refute** a dependency but never prove it. If two rows have the same course id and different titles, `course id → course title` is false. If they happen to agree, that is only consistent with it.',
      'X, the **determinant**, can be several attributes. The grade depends on the student and the course together: `student id, course id → grade`.',
    ],
    points: [
      'Read `X → Y` as "for each X, a single Y".',
      'Trivial: `X → Y` when Y is part of X (it always holds).',
      'Every key determines every attribute of its table.',
    ],
    example: 'In the enrolment table: `student id → student name`, `course id → course title, credits, dept`, and `student id, course id → grade`.',
    mistake: 'Reading the arrow backwards. `student id → student name` does not mean the name determines the id: two students can share a name.',
  },
  {
    id: 'keys',
    hub: 'deps',
    title: 'Keys and attribute closure',
    summary: 'A **candidate key** is a minimal set of attributes that determines all the others. The **closure** X⁺ (everything X determines) is how you test it.',
    body: [
      'To compute X⁺: start with X. Then, while some dependency `A → B` has all of A inside the set, add B. When nothing more can be added, the set is X⁺.',
      'X is a **superkey** if X⁺ contains every attribute. It is a **candidate key** if, in addition, no smaller part of X is a superkey. The **primary key** is the candidate key you choose. Attributes that belong to some candidate key are **prime**.',
    ],
    points: [
      '{student id}⁺ = {student id, student name}: not a key.',
      '{course id}⁺ = {course id, course title, credits, dept}: not a key.',
      '{student id, course id}⁺ = every attribute, and neither part alone is enough, so it is a **candidate key**.',
    ],
    example: 'With `student id → name`, `course id → title, credits, dept` and `student id, course id → grade`, the only candidate key of Enrolment is (student id, course id).',
    mistake: 'Calling any set that identifies rows a key. (student id, course id, grade) also identifies rows, but it is a superkey, not a candidate key, because grade is unnecessary.',
  },
  {
    id: 'partial',
    hub: 'deps',
    title: 'Full and partial dependency',
    summary: 'An attribute depends **fully** on a composite key when it needs the whole key. It depends **partially** when part of the key is enough.',
    body: [
      'With the key (student id, course id), the grade needs both: a student has a grade per course. That is a **full** dependency.',
      'The student name needs only student id, and the course title needs only course id. These are **partial** dependencies, and they are exactly what 2NF removes.',
      'Partial dependencies can only exist when the key has two or more attributes.',
    ],
    points: [
      'Full: `student id, course id → grade`.',
      'Partial: `student id → student name`, `course id → course title, credits`.',
    ],
    tables: [{
      caption: 'Which part of the key each attribute needs',
      head: ['Attribute', 'Depends on', 'Kind'],
      rows: [
        ['grade', 'student id + course id', 'Full'],
        ['student name', 'student id', 'Partial'],
        ['course title, credits, dept', 'course id', 'Partial'],
      ],
    }],
    mistake: 'Looking for partial dependencies in a table with a single-attribute key. There are none, so such a table in 1NF is already in 2NF.',
  },
  {
    id: 'transitive',
    hub: 'deps',
    title: 'Transitive dependency',
    summary: 'A **transitive** dependency is a chain: the key determines A, and A, which is not a key, determines B. B depends on the key only **through** A.',
    body: [
      'In the Course table (course id, title, credits, dept id, dept name) the key course id determines dept id, and dept id determines dept name. The department name is a fact about the department, not about the course.',
      'Each course of the same department repeats the department name. Renaming the department means updating every course. This is what 3NF removes.',
    ],
    points: [
      'Pattern: `key → A → B`, where A is **not** a key and B is not part of a key.',
      'Fix: move A and B to their own table, with A as its key, and keep A in the original table as a foreign key.',
    ],
    example: '`course id → dept id` and `dept id → dept name`, so `course id → dept name` is transitive.',
    mistake: 'Calling every chain transitive. If A is a candidate key, `key → A → B` causes no redundancy.',
  },
  {
    id: 'mvd',
    hub: 'deps',
    title: 'Multivalued dependency',
    summary: '`X ↠ Y` means: X determines a **set** of Y values, independent of the rest of the row. It appears when one table holds two independent lists about X.',
    body: [
      'A course has several teachers and several recommended books, and any teacher may use any book. In a table (course, teacher, book) every teacher must be combined with every book of the course, or the table would wrongly suggest that a teacher uses only some of them.',
      'This is written `course ↠ teacher | book`: for each course, the teachers and the books are independent. There is no functional dependency here, and all three attributes form the key, yet the data is still redundant.',
    ],
    tables: [{
      caption: 'Course offering: every teacher × every book (bold = key)',
      head: ['**course**', '**teacher**', '**book**'],
      rows: [
        ['Databases', 'Ruiz', 'Elmasri'],
        ['Databases', 'Ruiz', 'Date'],
        ['Databases', 'Gil', 'Elmasri'],
        ['Databases', 'Gil', 'Date'],
      ],
    }],
    example: 'Adding a third book to Databases needs two new rows, one per teacher. That is the redundancy 4NF removes.',
    mistake: 'Seeing a multivalued dependency whenever an attribute has several values. It needs **two** lists that are independent of each other.',
  },
  {
    id: 'jd',
    hub: 'deps',
    title: 'Join dependency',
    summary: 'A table has a **join dependency** when it can be rebuilt exactly by joining some of its projections. Multivalued dependencies are the two-part case.',
    body: [
      'Some business rules link three things in a cycle: "if a supplier supplies a part, the part is used in a project and the supplier works for that project, then the supplier supplies that part to that project". Under such a rule the three-way table (supplier, part, project) is the join of its three pairs.',
      'It is written `⋈{(supplier, part), (part, project), (supplier, project)}`. The pairs must all be kept: joining only two of them produces rows that never existed.',
    ],
    points: [
      'It only holds if the business rule **always** holds, never just because of the current data.',
      'It is removed by 5NF, which stores the pairs instead of the triple.',
    ],
    mistake: 'Decomposing a ternary table into pairs without such a rule. Without the rule, the join of the pairs invents combinations and the decomposition is not lossless.',
  },

  /* ───────────── Normal forms ───────────── */
  {
    id: 'nf1',
    hub: 'forms',
    nf: '1NF',
    title: 'First normal form (1NF)',
    summary: '**One cell, one value.** Every attribute is atomic, there are no repeating groups, and the table has a primary key.',
    body: [
      'A cell such as "Databases, Statistics" or a set of columns course1, course2, course3 breaks 1NF. You cannot query, index or constrain the values inside a list.',
      'Fix it with one row per value, and extend the key so that it still identifies each row. Alternatively, move the list to a table of its own with the owner\'s key.',
    ],
    tables: [
      {
        caption: 'Not in 1NF: a list in one cell',
        head: ['**student id**', 'student name', 'courses'],
        rows: [['S01', 'Ana Ruiz', 'C10, C20'], ['S02', 'Luis Gil', 'C10, C11']],
      },
      {
        caption: 'In 1NF: one course per row, key (student id, course id)',
        head: ['**student id**', '**course id**', 'student name'],
        rows: [['S01', 'C10', 'Ana Ruiz'], ['S01', 'C20', 'Ana Ruiz'], ['S02', 'C10', 'Luis Gil'], ['S02', 'C11', 'Luis Gil']],
      },
    ],
    mistake: 'Thinking 1NF is the end. The 1NF table above repeats each name per course: it now has a partial dependency, which 2NF removes.',
  },
  {
    id: 'nf2',
    hub: 'forms',
    nf: '2NF',
    title: 'Second normal form (2NF)',
    summary: '**The whole key.** In 1NF, and every non-key attribute depends on the **entire** key, with no partial dependencies.',
    body: [
      'Each partial dependency becomes a table of its own, keyed by the part of the key it depends on. The original table keeps the full key and the attributes that need all of it.',
    ],
    tables: [
      {
        caption: 'Enrolment after 2NF (bold = key)',
        head: ['Table', 'Columns'],
        rows: [
          ['Student', '**student id**, student name'],
          ['Course', '**course id**, course title, credits, dept id, dept name'],
          ['Enrolment', '**student id**, **course id**, grade'],
        ],
      },
    ],
    example: 'Ana Ruiz\'s name is now stored once, and a course can exist without enrolments.',
    mistake: 'Forgetting to keep the key parts in the original table. Enrolment must keep student id and course id: they are the foreign keys that link the pieces back.',
  },
  {
    id: 'nf3',
    hub: 'forms',
    nf: '3NF',
    title: 'Third normal form (3NF)',
    summary: '**Nothing but the key.** In 2NF, and no non-key attribute depends on another non-key attribute: there are no transitive dependencies.',
    body: [
      'The Course table still has the chain `course id → dept id → dept name`. Department becomes its own table, and Course keeps dept id as a foreign key.',
      'Formally, a table is in 3NF if, for every non-trivial `X → A`, X is a superkey **or** A is a prime attribute. That last escape is what BCNF removes.',
    ],
    tables: [
      {
        caption: 'After 3NF (bold = key)',
        head: ['Table', 'Columns'],
        rows: [
          ['Student', '**student id**, student name'],
          ['Department', '**dept id**, dept name'],
          ['Course', '**course id**, course title, credits, dept id → Department'],
          ['Enrolment', '**student id**, **course id**, grade'],
        ],
      },
    ],
    example: '"Every non-key attribute depends on the key, the whole key, and nothing but the key."',
    mistake: 'Removing dept id from Course as well. Then nothing says which department a course belongs to: the decomposition loses information.',
  },
  {
    id: 'bcnf',
    hub: 'forms',
    nf: 'BCNF',
    title: 'Boyce-Codd normal form (BCNF)',
    summary: '**Every determinant is a key.** For every non-trivial `X → Y`, X must be a superkey. There are no exceptions for prime attributes.',
    body: [
      'Tutoring: each student takes each subject with one tutor, and each tutor teaches a single subject. So `student, subject → tutor` and `tutor → subject`. The key is (student, subject), and the table is in 3NF because subject is prime. But tutor is a determinant and not a key, so the tutor\'s subject repeats for each of their students.',
      'Split on the bad determinant: `TutorSubject(tutor, subject)` and `Tutoring(student, tutor)`. The dependency `student, subject → tutor` can no longer be checked inside one table. That is the price BCNF sometimes asks.',
    ],
    tables: [
      {
        caption: 'In 3NF but not BCNF: tutor → subject (bold = key)',
        head: ['**student**', '**subject**', 'tutor'],
        rows: [['Ana', 'Maths', 'Pérez'], ['Luis', 'Maths', 'Pérez'], ['Ana', 'Physics', 'Gómez']],
      },
    ],
    mistake: 'Assuming every 3NF table is in BCNF. They differ only when there are overlapping candidate keys, but then the difference is real.',
  },
  {
    id: 'nf4',
    hub: 'forms',
    nf: '4NF',
    title: 'Fourth normal form (4NF)',
    summary: '**One fact per table.** In BCNF, and for every non-trivial multivalued dependency `X ↠ Y`, X is a superkey.',
    body: [
      'The table (course, teacher, book) holds two independent facts: who teaches each course, and which books each course uses. Store each in its own table.',
      'Joining the two tables on course gives back exactly the original rows, so nothing is lost.',
    ],
    tables: [
      {
        caption: 'After 4NF (bold = key)',
        head: ['Table', 'Columns'],
        rows: [['CourseTeacher', '**course**, **teacher**'], ['CourseBook', '**course**, **book**']],
      },
    ],
    example: 'Adding a third book to Databases is now one row in CourseBook, whatever the number of teachers.',
    mistake: 'Splitting a triple that is not independent. If each teacher uses their own books, (course, teacher, book) is a single fact and is already in 4NF.',
  },
  {
    id: 'nf5',
    hub: 'forms',
    nf: '5NF',
    title: 'Fifth normal form (5NF)',
    summary: '**Nothing that can be rebuilt from its parts.** In 4NF, and every join dependency is implied by the candidate keys.',
    body: [
      'Under the cyclic rule of suppliers, parts and projects, the table (supplier, part, project) equals the join of its three pairs. Store the three pairs: (supplier, part), (part, project) and (supplier, project).',
      'All three are needed. Joining any two of them produces combinations that never existed, which the third one filters out.',
    ],
    tables: [
      {
        caption: 'After 5NF (bold = key)',
        head: ['Table', 'Columns'],
        rows: [['SupplierPart', '**supplier**, **part**'], ['PartProject', '**part**, **project**'], ['SupplierProject', '**supplier**, **project**']],
      },
    ],
    mistake: 'Applying 5NF because the current rows happen to decompose. Without a business rule that guarantees it, the next row inserted breaks the join.',
  },

  /* ───────────── Decomposition ───────────── */
  {
    id: 'lossless',
    hub: 'decomp',
    title: 'Lossless-join decomposition',
    summary: 'A decomposition is **lossless** when joining the pieces gives back **exactly** the original table: no rows lost and no spurious rows.',
    body: [
      'Test for two pieces R1 and R2: the decomposition is lossless if their **common attributes** are a key of R1 or of R2. That is why every normalization step keeps the determinant in both tables.',
      'Splitting Enrolment into (student id, student name) and (student id, course id, grade) is lossless: student id is common, and it is the key of the first piece. Splitting it into (student id, grade) and (course id, grade) is not. The only common attribute is grade, and the join would match every student to every course with the same grade.',
    ],
    points: [
      'Lossless ⇔ (R1 ∩ R2) → R1 or (R1 ∩ R2) → R2.',
      'Spurious rows mean information is lost: you can no longer tell which rows were real.',
    ],
    mistake: 'Checking only that every attribute appears in some piece. Having every column is not enough; the pieces must join back correctly.',
  },
  {
    id: 'preservation',
    hub: 'decomp',
    title: 'Dependency preservation',
    summary: 'A decomposition **preserves dependencies** when every dependency can still be checked inside a single table, without joins.',
    body: [
      'The 2NF and 3NF steps of the enrolment example keep every dependency inside some table, so the DBMS can enforce each one with a key or a unique constraint.',
      'The BCNF split of Tutoring loses `student, subject → tutor`: student and subject end up in different tables. Checking it would need a join or a trigger.',
      '**3NF** can always be reached with a decomposition that is lossless **and** preserves dependencies. **BCNF** is always lossless, but not always preserving. When it is not, many designs stop at 3NF.',
    ],
    tables: [{
      caption: 'What each target guarantees',
      head: ['Target', 'Lossless', 'Preserves dependencies', 'Redundancy from FDs'],
      rows: [['3NF', 'Always', 'Always possible', 'Some may remain'], ['BCNF', 'Always', 'Not always', 'None']],
    }],
    mistake: 'Believing higher is always better. Each form trades checks that are easy to enforce against redundancy. Choose with the business rules in mind.',
  },
];
