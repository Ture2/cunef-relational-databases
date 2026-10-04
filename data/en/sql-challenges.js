'use strict';
/* SQL challenges (js/sql-challenges.js), in Oracle SQL, over the sample tables of the SQL sandbox
   (department, student, course, enrolment: SQL_SANDBOX.setup).
   Fields: id, level 1–3, title, short, focus [], statement (md),
     solution   the reference Oracle statement(s); the student's result is compared with the one it returns
     verify     (optional) a SELECT run after the student's statements and after the reference, to compare the
                final state of the tables (for INSERT / UPDATE / DELETE / CREATE TABLE challenges)
     ordered    true when the order of the rows is part of the answer
     hints [].  The checker also rejects anything that would not run on Oracle (LIMIT, EXCEPT…). */
(() => {
  DATA.en.SQL_CHALLENGES_LEVELS = { 1: 'queries', 2: 'joins and groups', 3: 'changing data' };

  DATA.en.SQL_CHALLENGES = [
    /* ───────────── Level 1: queries ───────────── */
    {
      id: 'six-credits',
      level: 1,
      title: 'Six-credit courses',
      short: 'Six credits',
      focus: ['SELECT', 'WHERE'],
      statement: 'List the **title** of every course worth exactly 6 credits.',
      solution: `SELECT title FROM course WHERE credits = 6;`,
      hints: [
        'The table is `course`; the filter is a condition on `credits`.',
        'Use `WHERE credits = 6`.',
      ],
    },
    {
      id: 'no-email',
      level: 1,
      title: 'Students without an e-mail',
      short: 'No e-mail',
      focus: ['NULL'],
      statement: 'List the **name** of the students that have no e-mail (the column is NULL).',
      solution: `SELECT name FROM student WHERE email IS NULL;`,
      hints: [
        'NULL is not a value: `email = NULL` is never true.',
        'Use `IS NULL`. (In Oracle `email = \'\'` does not work either: the empty string is NULL, and the comparison is still never true.)',
      ],
    },
    {
      id: 'nvl-email',
      level: 1,
      title: 'A text for the missing e-mail',
      short: 'NVL',
      focus: ['NVL'],
      statement: 'For every student show the **name** and the e-mail, or the text `no e-mail` when it is NULL.',
      solution: `SELECT name, NVL(email, 'no e-mail') FROM student;`,
      hints: [
        'Oracle replaces NULL with `NVL(value, replacement)` (`COALESCE` also works).',
        '`SELECT name, NVL(email, \'no e-mail\') FROM student`.',
      ],
    },
    {
      id: 'course-department',
      level: 1,
      title: 'Courses with their department',
      short: 'Join',
      focus: ['JOIN'],
      statement: 'Show the **title** of each course and the **name of its department**.',
      solution: `SELECT c.title, d.name
FROM course c JOIN department d ON d.dept_id = c.dept_id;`,
      hints: [
        'The foreign key is `course.dept_id`, which references `department.dept_id`.',
        '`FROM course c JOIN department d ON d.dept_id = c.dept_id`.',
      ],
    },
    {
      id: 'top-three',
      level: 1,
      title: 'The three best grades',
      short: 'Top 3',
      focus: ['ORDER BY', 'FETCH FIRST'],
      statement: 'Show the **student name** and the **grade** of the 3 highest grades, the highest first. Oracle has no `LIMIT`.',
      ordered: true,
      solution: `SELECT s.name, e.grade
FROM enrolment e JOIN student s ON s.student_id = e.student_id
ORDER BY e.grade DESC
FETCH FIRST 3 ROWS ONLY;`,
      hints: [
        'Join `enrolment` with `student` and sort by grade, descending.',
        'To keep only the first rows Oracle uses `FETCH FIRST 3 ROWS ONLY` at the end of the query.',
      ],
    },

    /* ───────────── Level 2: joins and groups ───────────── */
    {
      id: 'average-course',
      level: 2,
      title: 'Average grade per course',
      short: 'AVG',
      focus: ['GROUP BY', 'AVG'],
      statement: 'Show the **title** of each course that has grades and its **average grade rounded to 2 decimals**.',
      solution: `SELECT c.title, ROUND(AVG(e.grade), 2)
FROM course c JOIN enrolment e ON e.course_id = c.course_id
GROUP BY c.title;`,
      hints: [
        'Join `course` with `enrolment` and group by the course.',
        '`GROUP BY c.title`, and `ROUND(AVG(e.grade), 2)` in the SELECT list.',
      ],
    },
    {
      id: 'busy-courses',
      level: 2,
      title: 'Courses with at least two students',
      short: 'HAVING',
      focus: ['HAVING', 'COUNT'],
      statement: 'Show the **title** and the **number of students** of the courses with 2 or more enrolments.',
      solution: `SELECT c.title, COUNT(*)
FROM course c JOIN enrolment e ON e.course_id = c.course_id
GROUP BY c.title
HAVING COUNT(*) >= 2;`,
      hints: [
        'WHERE filters rows before grouping; to filter groups you need another clause.',
        'Add `HAVING COUNT(*) >= 2` after the GROUP BY.',
      ],
    },
    {
      id: 'empty-courses',
      level: 2,
      title: 'Courses nobody takes',
      short: 'No students',
      focus: ['LEFT JOIN', 'NOT EXISTS'],
      statement: 'List the **title** of the courses with no enrolments at all.',
      solution: `SELECT c.title
FROM course c LEFT JOIN enrolment e ON e.course_id = c.course_id
WHERE e.course_id IS NULL;`,
      hints: [
        'An inner join drops the courses without enrolments: you need to keep them.',
        'Use a LEFT JOIN and keep the rows where the enrolment side is NULL (or use `NOT EXISTS`).',
      ],
    },
    {
      id: 'above-average',
      level: 2,
      title: 'Grades above the average',
      short: 'Subquery',
      focus: ['subquery'],
      statement: 'Show the **student name**, the **course title** and the **grade** of every enrolment whose grade is above the average of all grades.',
      solution: `SELECT s.name, c.title, e.grade
FROM enrolment e
JOIN student s ON s.student_id = e.student_id
JOIN course  c ON c.course_id  = e.course_id
WHERE e.grade > (SELECT AVG(grade) FROM enrolment);`,
      hints: [
        'The average of all grades is a value you can compute in a subquery.',
        '`WHERE e.grade > (SELECT AVG(grade) FROM enrolment)`.',
      ],
    },
    {
      id: 'not-statistics',
      level: 2,
      title: 'Students not taking Statistics',
      short: 'MINUS',
      focus: ['MINUS', 'set operators'],
      statement: 'List the **ids** of the students that are **not** enrolled in course `C20`. Use the set operator that Oracle calls MINUS (or `NOT IN` / `NOT EXISTS`).',
      solution: `SELECT student_id FROM student
MINUS
SELECT student_id FROM enrolment WHERE course_id = 'C20';`,
      hints: [
        'All students, minus the students that are enrolled in C20.',
        'In Oracle the difference of two queries is `MINUS`; `EXCEPT` is for other DBMSs.',
      ],
    },
    {
      id: 'credits-per-student',
      level: 2,
      title: 'Credits per student',
      short: 'SUM',
      focus: ['JOIN', 'SUM'],
      statement: 'Show the **name** of each student and the **total credits** of the courses they are enrolled in.',
      solution: `SELECT s.name, SUM(c.credits)
FROM student s
JOIN enrolment e ON e.student_id = s.student_id
JOIN course    c ON c.course_id  = e.course_id
GROUP BY s.name;`,
      hints: [
        'Three tables are involved: `student`, `enrolment` and `course` (where the credits are).',
        'Join the three and use `SUM(c.credits)` grouped by the student.',
      ],
    },

    /* ───────────── Level 3: changing data ───────────── */
    {
      id: 'raise-grades',
      level: 3,
      title: 'Raise the Databases grades',
      short: 'UPDATE',
      focus: ['UPDATE', 'LEAST'],
      statement: 'Add 0.5 to every grade of course `C10`, but never go above 10. Write only the UPDATE: the checker compares the whole `enrolment` table afterwards.',
      verify: `SELECT student_id, course_id, grade FROM enrolment ORDER BY student_id, course_id;`,
      solution: `UPDATE enrolment SET grade = LEAST(grade + 0.5, 10) WHERE course_id = 'C10';`,
      hints: [
        'Do not forget the WHERE: without it every grade changes.',
        '`LEAST(a, b)` returns the smaller of its arguments: `grade = LEAST(grade + 0.5, 10)`.',
      ],
    },
    {
      id: 'new-student',
      level: 3,
      title: 'Enrol a new student',
      short: 'INSERT',
      focus: ['INSERT'],
      statement: 'Insert the student `S04`, **Marta Paz**, with the e-mail `marta@uni.es`.',
      verify: `SELECT * FROM student ORDER BY student_id;`,
      solution: `INSERT INTO student VALUES ('S04', 'Marta Paz', 'marta@uni.es');`,
      hints: [
        'The columns of `student` are, in order: `student_id`, `name`, `email`.',
        '`INSERT INTO student VALUES (…, …, …)`, with the text values in single quotes.',
      ],
    },
    {
      id: 'remove-eva',
      level: 3,
      title: 'Remove a student\'s enrolments',
      short: 'DELETE',
      focus: ['DELETE'],
      statement: 'Delete all the enrolments of student `S03` (Eva Sanz). Leave the student row itself.',
      verify: `SELECT student_id, course_id FROM enrolment ORDER BY student_id, course_id;`,
      solution: `DELETE FROM enrolment WHERE student_id = 'S03';`,
      hints: [
        'The enrolments are in the table `enrolment`, identified by `student_id`.',
        '`DELETE FROM enrolment WHERE student_id = \'S03\'`.',
      ],
    },
    {
      id: 'create-book',
      level: 3,
      title: 'Create a table',
      short: 'CREATE TABLE',
      focus: ['CREATE TABLE', 'constraints'],
      statement: 'Create the table `book` with `book_id` (a number, primary key), `title` (up to 60 characters, mandatory) and `price` (up to 6 digits with 2 decimals, never negative). Then insert two books: `1`, **Ficciones**, `12.5` and `2`, **Rayuela**, `15`.',
      verify: `SELECT book_id, title, price FROM book ORDER BY book_id;`,
      solution: `CREATE TABLE book (
  book_id NUMBER PRIMARY KEY,
  title   VARCHAR2(60) NOT NULL,
  price   NUMBER(6,2) CHECK (price >= 0)
);
INSERT INTO book VALUES (1, 'Ficciones', 12.5);
INSERT INTO book VALUES (2, 'Rayuela', 15);`,
      hints: [
        'Oracle types: `NUMBER`, `VARCHAR2(60)`, `NUMBER(6,2)`. Oracle has no `TEXT`, `INTEGER AUTOINCREMENT` or `REAL`.',
        'Constraints: `PRIMARY KEY`, `NOT NULL` and `CHECK (price >= 0)`. Insert the rows with two INSERT statements.',
      ],
    },
    {
      id: 'undo-delete',
      level: 3,
      title: 'Delete and undo',
      short: 'ROLLBACK',
      focus: ['ROLLBACK', 'transactions'],
      statement: 'Delete the enrolments of student `S02` and then **undo** it, so the `enrolment` table ends exactly as it started. Oracle opens the transaction by itself: do not write `BEGIN`.',
      verify: `SELECT COUNT(*) FROM enrolment;`,
      requires: ['DELETE', 'ROLLBACK'],
      solution: `DELETE FROM enrolment WHERE student_id = 'S02';
ROLLBACK;`,
      hints: [
        'The DELETE starts a transaction that is not permanent until you COMMIT.',
        'A `ROLLBACK;` after the DELETE leaves the table as it was.',
      ],
    },
  ];
})();
