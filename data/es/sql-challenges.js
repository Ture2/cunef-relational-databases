'use strict';
/* Retos de SQL (js/sql-challenges.js), en SQL de Oracle, sobre las tablas de ejemplo del entorno SQL
   (department, student, course, enrolment: SQL_SANDBOX.setup). Mismos ids, orden, soluciones y comprobaciones
   que data/en/sql-challenges.js; solo se traducen los textos. */
(() => {
  DATA.es.SQL_CHALLENGES_LEVELS = { 1: 'consultas', 2: 'combinaciones y grupos', 3: 'modificar datos', 4: 'subconsultas, conjuntos y funciones' };

  DATA.es.SQL_CHALLENGES = [
    /* ───────────── Nivel 1: consultas ───────────── */
    {
      id: 'six-credits',
      level: 1,
      title: 'Asignaturas de seis créditos',
      short: 'Seis créditos',
      focus: ['SELECT', 'WHERE'],
      statement: 'Muestra el **título** de cada asignatura que vale exactamente 6 créditos.',
      solution: `SELECT title FROM course WHERE credits = 6;`,
      hints: [
        'La tabla es `course`; el filtro es una condición sobre `credits`.',
        'Usa `WHERE credits = 6`.',
      ],
    },
    {
      id: 'no-email',
      level: 1,
      title: 'Estudiantes sin correo',
      short: 'Sin correo',
      focus: ['NULL'],
      statement: 'Muestra el **nombre** de los estudiantes que no tienen correo electrónico (la columna es NULL).',
      solution: `SELECT name FROM student WHERE email IS NULL;`,
      hints: [
        'NULL no es un valor: `email = NULL` nunca es verdadero.',
        'Usa `IS NULL`. (En Oracle `email = \'\'` tampoco funciona: la cadena vacía es NULL y la comparación sigue sin ser verdadera.)',
      ],
    },
    {
      id: 'nvl-email',
      level: 1,
      title: 'Un texto para el correo que falta',
      short: 'NVL',
      focus: ['NVL'],
      statement: 'Para cada estudiante muestra el **nombre** y el correo, o el texto `no e-mail` cuando es NULL.',
      solution: `SELECT name, NVL(email, 'no e-mail') FROM student;`,
      hints: [
        'Oracle sustituye NULL con `NVL(valor, sustituto)` (`COALESCE` también sirve).',
        '`SELECT name, NVL(email, \'no e-mail\') FROM student`.',
      ],
    },
    {
      id: 'course-department',
      level: 1,
      title: 'Asignaturas con su departamento',
      short: 'Combinación',
      focus: ['JOIN'],
      statement: 'Muestra el **título** de cada asignatura y el **nombre de su departamento**.',
      solution: `SELECT c.title, d.name
FROM course c JOIN department d ON d.dept_id = c.dept_id;`,
      hints: [
        'La clave ajena es `course.dept_id`, que referencia a `department.dept_id`.',
        '`FROM course c JOIN department d ON d.dept_id = c.dept_id`.',
      ],
    },
    {
      id: 'top-three',
      level: 1,
      title: 'Las tres mejores notas',
      short: 'Top 3',
      focus: ['ORDER BY', 'FETCH FIRST'],
      statement: 'Muestra el **nombre del estudiante** y la **nota** de las 3 notas más altas, de mayor a menor. Oracle no tiene `LIMIT`.',
      ordered: true,
      solution: `SELECT s.name, e.grade
FROM enrolment e JOIN student s ON s.student_id = e.student_id
ORDER BY e.grade DESC
FETCH FIRST 3 ROWS ONLY;`,
      hints: [
        'Combina `enrolment` con `student` y ordena por nota, de mayor a menor.',
        'Para quedarse con las primeras filas, Oracle usa `FETCH FIRST 3 ROWS ONLY` al final de la consulta.',
      ],
    },

    /* ───────────── Nivel 2: combinaciones y grupos ───────────── */
    {
      id: 'average-course',
      level: 2,
      title: 'Nota media por asignatura',
      short: 'AVG',
      focus: ['GROUP BY', 'AVG'],
      statement: 'Muestra el **título** de cada asignatura que tiene notas y su **nota media redondeada a 2 decimales**.',
      solution: `SELECT c.title, ROUND(AVG(e.grade), 2)
FROM course c JOIN enrolment e ON e.course_id = c.course_id
GROUP BY c.title;`,
      hints: [
        'Combina `course` con `enrolment` y agrupa por asignatura.',
        '`GROUP BY c.title`, y `ROUND(AVG(e.grade), 2)` en la lista del SELECT.',
      ],
    },
    {
      id: 'busy-courses',
      level: 2,
      title: 'Asignaturas con al menos dos estudiantes',
      short: 'HAVING',
      focus: ['HAVING', 'COUNT'],
      statement: 'Muestra el **título** y el **número de estudiantes** de las asignaturas con 2 o más matrículas.',
      solution: `SELECT c.title, COUNT(*)
FROM course c JOIN enrolment e ON e.course_id = c.course_id
GROUP BY c.title
HAVING COUNT(*) >= 2;`,
      hints: [
        'WHERE filtra filas antes de agrupar; para filtrar grupos hace falta otra cláusula.',
        'Añade `HAVING COUNT(*) >= 2` después del GROUP BY.',
      ],
    },
    {
      id: 'empty-courses',
      level: 2,
      title: 'Asignaturas que nadie cursa',
      short: 'Sin estudiantes',
      focus: ['LEFT JOIN', 'NOT EXISTS'],
      statement: 'Muestra el **título** de las asignaturas que no tienen ninguna matrícula.',
      solution: `SELECT c.title
FROM course c LEFT JOIN enrolment e ON e.course_id = c.course_id
WHERE e.course_id IS NULL;`,
      hints: [
        'Una combinación interna descarta las asignaturas sin matrículas: necesitas conservarlas.',
        'Usa un LEFT JOIN y quédate con las filas donde el lado de la matrícula es NULL (o usa `NOT EXISTS`).',
      ],
    },
    {
      id: 'above-average',
      level: 2,
      title: 'Notas por encima de la media',
      short: 'Subconsulta',
      focus: ['subconsulta'],
      statement: 'Muestra el **nombre del estudiante**, el **título de la asignatura** y la **nota** de cada matrícula cuya nota está por encima de la media de todas las notas.',
      solution: `SELECT s.name, c.title, e.grade
FROM enrolment e
JOIN student s ON s.student_id = e.student_id
JOIN course  c ON c.course_id  = e.course_id
WHERE e.grade > (SELECT AVG(grade) FROM enrolment);`,
      hints: [
        'La media de todas las notas es un valor que puedes calcular en una subconsulta.',
        '`WHERE e.grade > (SELECT AVG(grade) FROM enrolment)`.',
      ],
    },
    {
      id: 'not-statistics',
      level: 2,
      title: 'Estudiantes que no cursan Statistics',
      short: 'MINUS',
      focus: ['MINUS', 'operadores de conjuntos'],
      statement: 'Muestra los **identificadores** de los estudiantes que **no** están matriculados en la asignatura `C20`. Usa el operador de conjuntos que Oracle llama MINUS (o `NOT IN` / `NOT EXISTS`).',
      solution: `SELECT student_id FROM student
MINUS
SELECT student_id FROM enrolment WHERE course_id = 'C20';`,
      hints: [
        'Todos los estudiantes, menos los que están matriculados en C20.',
        'En Oracle la diferencia de dos consultas es `MINUS`; `EXCEPT` es de otros SGBD.',
      ],
    },
    {
      id: 'credits-per-student',
      level: 2,
      title: 'Créditos por estudiante',
      short: 'SUM',
      focus: ['JOIN', 'SUM'],
      statement: 'Muestra el **nombre** de cada estudiante y el **total de créditos** de las asignaturas en las que está matriculado.',
      solution: `SELECT s.name, SUM(c.credits)
FROM student s
JOIN enrolment e ON e.student_id = s.student_id
JOIN course    c ON c.course_id  = e.course_id
GROUP BY s.name;`,
      hints: [
        'Intervienen tres tablas: `student`, `enrolment` y `course` (donde están los créditos).',
        'Combina las tres y usa `SUM(c.credits)` agrupando por estudiante.',
      ],
    },

    /* ───────────── Nivel 3: modificar datos ───────────── */
    {
      id: 'raise-grades',
      level: 3,
      title: 'Sube las notas de Databases',
      short: 'UPDATE',
      focus: ['UPDATE', 'LEAST'],
      statement: 'Suma 0,5 a todas las notas de la asignatura `C10`, pero sin pasar nunca de 10. Escribe solo el UPDATE: el comprobador compara después toda la tabla `enrolment`.',
      verify: `SELECT student_id, course_id, grade FROM enrolment ORDER BY student_id, course_id;`,
      solution: `UPDATE enrolment SET grade = LEAST(grade + 0.5, 10) WHERE course_id = 'C10';`,
      hints: [
        'No olvides el WHERE: sin él cambian todas las notas.',
        '`LEAST(a, b)` devuelve el menor de sus argumentos: `grade = LEAST(grade + 0.5, 10)`.',
      ],
    },
    {
      id: 'new-student',
      level: 3,
      title: 'Matricula a una nueva estudiante',
      short: 'INSERT',
      focus: ['INSERT'],
      statement: 'Inserta al estudiante `S04`, **Marta Paz**, con el correo `marta@uni.es`.',
      verify: `SELECT * FROM student ORDER BY student_id;`,
      solution: `INSERT INTO student VALUES ('S04', 'Marta Paz', 'marta@uni.es');`,
      hints: [
        'Las columnas de `student` son, por orden: `student_id`, `name`, `email`.',
        '`INSERT INTO student VALUES (…, …, …)`, con los valores de texto entre comillas simples.',
      ],
    },
    {
      id: 'remove-eva',
      level: 3,
      title: 'Elimina las matrículas de una estudiante',
      short: 'DELETE',
      focus: ['DELETE'],
      statement: 'Borra todas las matrículas de la estudiante `S03` (Eva Sanz). Deja la fila de la estudiante.',
      verify: `SELECT student_id, course_id FROM enrolment ORDER BY student_id, course_id;`,
      solution: `DELETE FROM enrolment WHERE student_id = 'S03';`,
      hints: [
        'Las matrículas están en la tabla `enrolment`, identificadas por `student_id`.',
        '`DELETE FROM enrolment WHERE student_id = \'S03\'`.',
      ],
    },
    {
      id: 'create-book',
      level: 3,
      title: 'Crea una tabla',
      short: 'CREATE TABLE',
      focus: ['CREATE TABLE', 'restricciones'],
      statement: 'Crea la tabla `book` con `book_id` (un número, clave primaria), `title` (hasta 60 caracteres, obligatorio) y `price` (hasta 6 dígitos con 2 decimales, nunca negativo). Después inserta dos libros: `1`, **Ficciones**, `12.5` y `2`, **Rayuela**, `15`.',
      verify: `SELECT book_id, title, price FROM book ORDER BY book_id;`,
      solution: `CREATE TABLE book (
  book_id NUMBER PRIMARY KEY,
  title   VARCHAR2(60) NOT NULL,
  price   NUMBER(6,2) CHECK (price >= 0)
);
INSERT INTO book VALUES (1, 'Ficciones', 12.5);
INSERT INTO book VALUES (2, 'Rayuela', 15);`,
      hints: [
        'Tipos de Oracle: `NUMBER`, `VARCHAR2(60)`, `NUMBER(6,2)`. Oracle no tiene `TEXT`, `INTEGER AUTOINCREMENT` ni `REAL`.',
        'Restricciones: `PRIMARY KEY`, `NOT NULL` y `CHECK (price >= 0)`. Inserta las filas con dos sentencias INSERT.',
      ],
    },
    {
      id: 'undo-delete',
      level: 3,
      title: 'Borra y deshaz',
      short: 'ROLLBACK',
      focus: ['ROLLBACK', 'transacciones'],
      statement: 'Borra las matrículas del estudiante `S02` y después **deshazlo**, de modo que la tabla `enrolment` quede exactamente como estaba. Oracle abre la transacción por sí solo: no escribas `BEGIN`.',
      verify: `SELECT COUNT(*) FROM enrolment;`,
      requires: ['DELETE', 'ROLLBACK'],
      solution: `DELETE FROM enrolment WHERE student_id = 'S02';
ROLLBACK;`,
      hints: [
        'El DELETE inicia una transacción que no es permanente hasta que haces COMMIT.',
        'Un `ROLLBACK;` después del DELETE deja la tabla como estaba.',
      ],
    },

    /* ───────────── Nivel 4: subconsultas, conjuntos y funciones ───────────── */
    {
      id: 'students-per-course',
      level: 4,
      title: 'Estudiantes por asignatura, ceros incluidos',
      short: 'Contar con ceros',
      focus: ['LEFT JOIN', 'COUNT'],
      statement: 'Muestra el **título** de **todas** las asignaturas y su **número de estudiantes matriculados**. Una asignatura sin estudiantes debe aparecer con `0`.',
      solution: `SELECT c.title, COUNT(e.student_id)
FROM course c LEFT JOIN enrolment e ON e.course_id = c.course_id
GROUP BY c.title;`,
      hints: [
        'Una combinación interna descarta la asignatura que nadie cursa; un LEFT JOIN la conserva, con NULL en el lado de la matrícula.',
        '`COUNT(*)` cuenta esa fila rellena de NULL como 1. Cuenta mejor una columna de la matrícula: `COUNT(e.student_id)` ignora los NULL.',
        '`FROM course c LEFT JOIN enrolment e ON e.course_id = c.course_id GROUP BY c.title`.',
      ],
    },
    {
      id: 'best-per-course',
      level: 4,
      title: 'La mejor nota de cada asignatura',
      short: 'Máximo por grupo',
      focus: ['subconsulta correlacionada', 'MAX'],
      statement: 'Para cada asignatura que tiene notas, muestra el **título de la asignatura**, el **nombre del estudiante** con la nota más alta en ella y esa **nota**.',
      solution: `SELECT c.title, s.name, e.grade
FROM enrolment e
JOIN student s ON s.student_id = e.student_id
JOIN course  c ON c.course_id  = e.course_id
WHERE e.grade = (SELECT MAX(e2.grade)
                 FROM enrolment e2
                 WHERE e2.course_id = e.course_id);`,
      hints: [
        'Quédate con una matrícula cuando su nota es igual a la nota más alta **de su propia asignatura**, no de toda la tabla.',
        'Una subconsulta correlacionada se recalcula para cada fila exterior: dentro de ella, `e2.course_id = e.course_id` la enlaza con la matrícula que se está comprobando.',
        '`WHERE e.grade = (SELECT MAX(e2.grade) FROM enrolment e2 WHERE e2.course_id = e.course_id)`.',
      ],
    },
    {
      id: 'beat-eva',
      level: 4,
      title: 'Mejor que todas las notas de Eva',
      short: '> ALL',
      focus: ['ALL', 'subconsulta'],
      statement: 'Muestra el **nombre del estudiante**, el **título de la asignatura** y la **nota** de las matrículas cuya nota es mayor que **todas** las notas de la estudiante `S03` (Eva Sanz). Compara con `> ALL`.',
      requires: ['ALL'],
      solution: `SELECT s.name, c.title, e.grade
FROM enrolment e
JOIN student s ON s.student_id = e.student_id
JOIN course  c ON c.course_id  = e.course_id
WHERE e.grade > ALL (SELECT grade FROM enrolment WHERE student_id = 'S03');`,
      hints: [
        'La subconsulta devuelve varias filas (todas las notas de Eva), así que un `>` sin más no basta.',
        '`> ALL (…)` es verdadero cuando el valor supera a todas las filas de la subconsulta; con `> ANY (…)` bastaría con superar a una.',
        '`WHERE e.grade > ALL (SELECT grade FROM enrolment WHERE student_id = \'S03\')`.',
      ],
    },
    {
      id: 'databases-and-python',
      level: 4,
      title: 'Estudiantes que cursan Databases y Python',
      short: 'INTERSECT',
      focus: ['INTERSECT', 'operadores de conjuntos'],
      statement: 'Muestra los **identificadores** de los estudiantes matriculados en la asignatura `C10` **y también** en la `C11`. Usa un operador de conjuntos.',
      solution: `SELECT student_id FROM enrolment WHERE course_id = 'C10'
INTERSECT
SELECT student_id FROM enrolment WHERE course_id = 'C11';`,
      hints: [
        '`WHERE course_id = \'C10\' AND course_id = \'C11\'` no devuelve nada: una misma fila nunca tiene los dos valores.',
        'Escribe una consulta para cada asignatura y quédate con los identificadores que aparecen en los dos resultados.',
        'El operador que conserva las filas comunes de dos consultas es `INTERSECT`.',
      ],
    },
    {
      id: 'grade-bands',
      level: 4,
      title: 'Tramos de nota por departamento',
      short: 'CASE',
      focus: ['CASE', 'UPPER', 'GROUP BY'],
      statement: 'Para cada departamento, muestra su **nombre en mayúsculas**, un **tramo** (`high` cuando la nota es 7 o más, `low` en otro caso) y el **número de matrículas** de ese tramo.',
      solution: `SELECT UPPER(d.name),
       CASE WHEN e.grade >= 7 THEN 'high' ELSE 'low' END,
       COUNT(*)
FROM enrolment e
JOIN course     c ON c.course_id = e.course_id
JOIN department d ON d.dept_id   = c.dept_id
GROUP BY UPPER(d.name), CASE WHEN e.grade >= 7 THEN 'high' ELSE 'low' END;`,
      hints: [
        'Tres tablas: la nota está en `enrolment` y al departamento se llega a través de `course`.',
        '`CASE WHEN e.grade >= 7 THEN \'high\' ELSE \'low\' END` convierte cada nota en su tramo; `UPPER(d.name)` da las mayúsculas.',
        'Agrupa por las dos expresiones, escritas completas: los alias de columna en el GROUP BY solo funcionan desde Oracle 23ai.',
      ],
    },
    {
      id: 'best-average',
      level: 4,
      title: 'La mejor media, paso a paso',
      short: 'WITH',
      focus: ['WITH', 'CTE'],
      statement: 'Muestra el **nombre** y la **nota media** del estudiante o los estudiantes con la media más alta (puede haber empate). Constrúyelo con `WITH`: una consulta con nombre con la media de cada estudiante y otra con la más alta de esas medias.',
      requires: ['WITH'],
      solution: `WITH student_avg AS (
  SELECT student_id, AVG(grade) AS avg_grade
  FROM enrolment
  GROUP BY student_id
),
best AS (
  SELECT MAX(avg_grade) AS best_avg FROM student_avg
)
SELECT s.name, a.avg_grade
FROM student_avg a
JOIN best    b ON a.avg_grade = b.best_avg
JOIN student s ON s.student_id = a.student_id;`,
      hints: [
        '`WITH nombre AS (SELECT …)` define una consulta que después usas como una tabla; si hay varias, se separan con comas.',
        '`ORDER BY … FETCH FIRST 1 ROW ONLY` se quedaría con un solo estudiante si hay empate: compara con el máximo.',
        '`student_avg` agrupa `enrolment` por estudiante; `best` es `SELECT MAX(avg_grade) FROM student_avg`; combina las dos (y `student`, para el nombre).',
      ],
    },
  ];
})();
