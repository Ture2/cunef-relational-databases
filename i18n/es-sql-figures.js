'use strict';
/* Spanish interface text: SQL figures (js/sql-figures.js). Keys are the English text.
   Two-line figure labels use '|' to separate the lines. '1 row' and '{n} rows' are in es-normalization.js. */
Object.assign(UI.es, {
  /* ---- SELECT ---- */
  'SELECT title, credits, credits * 25 AS hours FROM course: the columns title and credits are taken from the course table, a new column hours is computed, and all four rows are kept.':
    'SELECT title, credits, credits * 25 AS hours FROM course: se toman las columnas title y credits de la tabla course, se calcula una columna nueva, hours, y se conservan las cuatro filas.',
  'result: 4 rows': 'resultado: 4 filas',
  'SELECT chooses the columns and can compute new ones (hours = credits * 25).': 'SELECT elige las columnas y puede calcular otras nuevas (hours = credits * 25).',
  'Every row is kept: choosing rows is the job of WHERE.': 'Se conservan todas las filas: elegir filas es cosa de WHERE.',

  /* ---- Order of the clauses ---- */
  'tables and JOINs': 'tablas y JOIN',
  'keeps rows': 'filtra filas',
  'makes groups': 'forma grupos',
  'keeps groups': 'filtra grupos',
  'columns; aliases are born': 'columnas; nacen los alias',
  'sorts; can use aliases': 'ordena; ve los alias',
  'A query is written SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, but evaluated FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY. WHERE runs before SELECT and cannot use its aliases; ORDER BY runs after it and can.':
    'Una consulta se escribe SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, pero se evalúa FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY. WHERE se ejecuta antes que SELECT y no puede usar sus alias; ORDER BY se ejecuta después y sí puede.',
  'As you write it': 'Como la escribes',
  'As it runs': 'Como se ejecuta',
  'WHERE runs before SELECT: it cannot use a column alias of the SELECT.': 'WHERE se ejecuta antes que SELECT: no puede usar un alias de columna del SELECT.',
  'ORDER BY runs after SELECT: it can.': 'ORDER BY se ejecuta después de SELECT: sí puede.',

  /* ---- AND / OR precedence ---- */
  'Without parentheses, dept_id = D01 OR dept_id = D02 AND credits >= 6 is read as D01 OR (D02 AND credits >= 6) and keeps Databases, Python and Statistics. With (D01 OR D02) AND credits >= 6 it keeps only Databases and Statistics: Python, with 4.5 credits, makes the difference.':
    'Sin paréntesis, dept_id = D01 OR dept_id = D02 AND credits >= 6 se lee D01 OR (D02 AND credits >= 6) y conserva Databases, Python y Statistics. Con (D01 OR D02) AND credits >= 6 solo conserva Databases y Statistics: Python, con 4,5 créditos, marca la diferencia.',
  'NOT first, then AND, then OR, like × before + in arithmetic': 'Primero NOT, luego AND y después OR, como × antes que + en aritmética',
  '1 · As written: AND is evaluated first': '1 · Tal como está escrita: AND se evalúa primero',
  '2 · With the parentheses we meant': '2 · Con los paréntesis que queríamos',
  'Python is in D01,|so query 1 keeps it;|it has 4.5 credits,|so query 2 drops it.': 'Python es de D01:|la consulta 1 la deja;|tiene 4,5 créditos:|la consulta 2 la quita.',

  /* ---- NULL ---- */
  'TRUE': 'VERDADERO',
  'FALSE': 'FALSO',
  'UNKNOWN': 'DESCONOCIDO',
  'T': 'V',
  'F': 'F',
  'U': 'D',
  'Three-valued logic. email = NULL is UNKNOWN for every student, so WHERE returns no row; email IS NULL is TRUE only for Eva Sanz. Truth tables: TRUE AND UNKNOWN is UNKNOWN, FALSE AND UNKNOWN is FALSE, TRUE OR UNKNOWN is TRUE, FALSE OR UNKNOWN is UNKNOWN.':
    'Lógica de tres valores. email = NULL es DESCONOCIDO para todos los estudiantes, así que WHERE no devuelve ninguna fila; email IS NULL solo es VERDADERO para Eva Sanz. Tablas de verdad: VERDADERO AND DESCONOCIDO es DESCONOCIDO, FALSO AND DESCONOCIDO es FALSO, VERDADERO OR DESCONOCIDO es VERDADERO, FALSO OR DESCONOCIDO es DESCONOCIDO.',
  'WHERE keeps a row only when the test is TRUE': 'WHERE solo conserva una fila si la prueba es VERDADERO',
  '= NULL is UNKNOWN for every row, even for Eva: no rows.': '= NULL es DESCONOCIDO en todas, incluso en Eva: 0 filas.',
  'IS NULL is the test that works: it returns Eva.': 'IS NULL es la prueba que funciona: devuelve a Eva.',
  'NOT UNKNOWN is still UNKNOWN.': 'NOT DESCONOCIDO sigue siendo DESCONOCIDO.',
  'T true · F false · U unknown': 'V verdadero · F falso · D desconocido',

  /* ---- INNER JOIN ---- */
  'INNER JOIN of course and department on dept_id: Databases and Python match Computing (D01), Statistics and Marketing match Maths (D02). Each course finds its department, so the result has 4 rows.':
    'INNER JOIN de course y department por dept_id: Databases y Python casan con Computing (D01), Statistics y Marketing con Maths (D02). Cada asignatura encuentra su departamento, así que el resultado tiene 4 filas.',
  'Each course row is paired with|the department whose key|matches its dept_id.': 'Cada fila de course se empareja|con el departamento cuya clave|coincide con su dept_id.',
  'A row with no partner would be|dropped: see the outer joins.': 'Una fila sin pareja se perdería:|mira las combinaciones externas.',

  /* ---- Outer joins ---- */
  'Joins of course (left) and enrolment (right) as set diagrams: INNER keeps the 6 matching rows, LEFT 7, RIGHT 6, FULL 7, and the anti-join (LEFT JOIN … WHERE e.course_id IS NULL) 1. The LEFT JOIN result keeps Marketing, which has no enrolment, with NULL in the enrolment columns.':
    'Combinaciones de course (izquierda) y enrolment (derecha) como diagramas de conjuntos: INNER conserva las 6 filas que casan, LEFT 7, RIGHT 6, FULL 7 y el anti-join (LEFT JOIN … WHERE e.course_id IS NULL) 1. El resultado del LEFT JOIN conserva Marketing, que no tiene matrículas, con NULL en las columnas de enrolment.',
  'anti-join': 'anti-join',
  'c = course (left table) · e = enrolment (right table)': 'c = course (tabla izquierda) · e = enrolment (tabla derecha)',
  'Marketing has no enrolment:': 'Marketing no tiene matrículas:',
  'INNER drops it;': 'INNER la pierde;',
  'LEFT keeps it, with NULL on the right;': 'LEFT la conserva, con NULL a la derecha;',
  'the anti-join keeps only it.': 'el anti-join solo conserva esa.',
  'Careful: WHERE e.grade >= 5 removes it': 'Cuidado: WHERE e.grade >= 5 la vuelve',
  'again (NULL >= 5 is UNKNOWN).': 'a quitar (NULL >= 5 es DESCONOCIDO).',
  'Put that condition in the ON.': 'Esa condición va en el ON.',

  /* ---- CROSS JOIN and self-join ---- */
  'Left: CROSS JOIN of 3 students and 4 courses gives 12 rows, every possible pair; filled dots are real enrolments. Right: a self-join of enrolment for course C10 pairs S01 with S02, S01 with S03 and S02 with S03, each pair once, because a.student_id < b.student_id.':
    'Izquierda: el CROSS JOIN de 3 estudiantes y 4 asignaturas da 12 filas, todas las parejas posibles; los puntos rellenos son matrículas reales. Derecha: una autocombinación de enrolment para la asignatura C10 empareja S01 con S02, S01 con S03 y S02 con S03, cada pareja una vez, porque a.student_id < b.student_id.',
  'CROSS JOIN: every pair': 'CROSS JOIN: todas las parejas',
  '3 students × 4 courses = 12 rows': '3 estudiantes × 4 asignaturas = 12 filas',
  '● enrolled · ○ not enrolled:': '● matriculado · ○ no matriculado:',
  'the CROSS JOIN lists both.': 'el CROSS JOIN da los dos.',
  'Self-join: enrolment a, enrolment b': 'Autocombinación de enrolment',
  'Course C10: pairs of classmates': 'Asignatura C10: parejas de compañeros',
  '3 pairs, each one once;|nobody is paired with themselves.': '3 parejas, cada una una vez;|nadie se empareja consigo mismo.',

  /* ---- Aggregates ---- */
  'Seven grades, one of them NULL. COUNT(*) is 7, COUNT(grade) is 6, AVG(grade) is 7.25 (43.5 / 6, the NULL is skipped) and AVG(NVL(grade, 0)) is 6.21 (43.5 / 7, the NULL counted as 0).':
    'Siete notas, una de ellas NULL. COUNT(*) es 7, COUNT(grade) es 6, AVG(grade) es 7,25 (43,5 / 6, se ignora el NULL) y AVG(NVL(grade, 0)) es 6,21 (43,5 / 7, el NULL cuenta como 0).',
  'every row, NULL included': 'todas las filas, NULL incluido',
  'only the known grades': 'solo las notas conocidas',
  '43.5 / 6: the NULL is skipped': '43.5 / 6: se ignora el NULL',
  '43.5 / 7: the NULL counts as 0': '43.5 / 7: el NULL vale 0',
  'SUM, AVG, MIN and MAX skip NULLs too;': 'SUM, AVG, MIN y MAX también ignoran los NULL;',
  'only COUNT(*) counts rows, whatever they hold.': 'solo COUNT(*) cuenta filas, tengan lo que tengan.',

  /* ---- GROUP BY / HAVING ---- */
  'GROUP BY course_id folds the six enrolment rows into one row per course: C10 with 3 rows and average 6.67, C11 with 2 rows and average 8.25, C20 with 1 row and average 7.00. HAVING AVG(grade) >= 7 then drops the C10 group.':
    'GROUP BY course_id pliega las seis filas de enrolment en una fila por asignatura: C10 con 3 filas y media 6,67, C11 con 2 filas y media 8,25, C20 con 1 fila y media 7,00. Después HAVING AVG(grade) >= 7 descarta el grupo C10.',
  'one row per group': 'una fila por grupo',
  'GROUP BY folds the rows of each course into one row,': 'GROUP BY pliega las filas de cada asignatura en una sola,',
  'and COUNT and AVG are computed once per group.': 'y COUNT y AVG se calculan una vez por grupo.',
  'HAVING then filters the groups: C10 (average 6.67) is dropped.': 'Después HAVING filtra los grupos: C10 (media 6.67) se descarta.',

  /* ---- Subqueries ---- */
  'Where a subquery goes changes its role. In WHERE it returns one value to compare with (the average, 7.25). In FROM it is an inline view, a temporary table with one average per course. In SELECT it adds one value to every row.':
    'El sitio de una subconsulta cambia su papel. En WHERE devuelve un valor con el que comparar (la media, 7,25). En FROM es una vista en línea, una tabla temporal con una media por asignatura. En SELECT añade un valor a cada fila.',
  'In WHERE: one value to compare with': 'En WHERE: un valor con el que comparar',
  'In FROM: an inline view, queried like a table': 'En FROM: una vista en línea, consultada como una tabla',
  'In SELECT: a scalar value added to every row': 'En SELECT: un valor escalar añadido a cada fila',
  'one value,|computed once': 'un valor,|una sola vez',

  /* ---- IN / ANY / ALL ---- */
  'Grades on a line from 4 to 10. The Databases (C10) grades are 5.0, 6.5 and 8.5. > ANY of them means above the smallest, 5.0; > ALL means above the largest, 8.5. Of the other grades, 7.0, 7.5 and 9.0 pass > ANY, and only 9.0 passes > ALL.':
    'Notas en una recta del 4 al 10. Las notas de Databases (C10) son 5,0, 6,5 y 8,5. > ANY de ellas significa por encima de la menor, 5,0; > ALL, por encima de la mayor, 8,5. De las demás notas, 7,0, 7,5 y 9,0 cumplen > ANY, y solo 9,0 cumple > ALL.',
  'C10 grades': 'Notas de C10',
  'Other grades': 'Otras notas',
  'above the smallest': 'mayor que la menor',
  'above the largest': 'mayor que la mayor',
  '7.0, 7.5 and 9.0 pass > ANY; only 9.0 passes > ALL.': '7.0, 7.5 y 9.0 cumplen > ANY; solo 9.0 cumple > ALL.',
  'NOT IN (…, NULL) is never TRUE: one NULL in the list and no row passes.': 'NOT IN (…, NULL) nunca es VERDADERO: un NULL en la lista y no pasa ninguna fila.',

  /* ---- Correlated subqueries ---- */
  'A correlated subquery runs once per outer row. For each course, EXISTS (SELECT 1 FROM enrolment e WHERE e.course_id = c.course_id) is run with that course id: C10 finds 3 rows, C11 2, C20 1 and C30 none. EXISTS keeps Databases, Python and Statistics; NOT EXISTS keeps Marketing.':
    'Una subconsulta correlacionada se ejecuta una vez por cada fila exterior. Para cada asignatura, EXISTS (SELECT 1 FROM enrolment e WHERE e.course_id = c.course_id) se ejecuta con el id de esa asignatura: C10 encuentra 3 filas, C11 2, C20 1 y C30 ninguna. EXISTS conserva Databases, Python y Statistics; NOT EXISTS conserva Marketing.',
  'The inner query runs again for each outer row': 'La consulta interior se repite para cada fila exterior',
  'row by row': 'fila a fila',

  /* ---- Set operators ---- */
  'Set operators on the students of Databases (C10: S01, S02, S03) and of Python (C11: S02, S03). UNION gives S01, S02, S03; INTERSECT gives S02, S03; MINUS gives S01. UNION ALL keeps the repeats: 5 rows.':
    'Operadores de conjuntos sobre los estudiantes de Databases (C10: S01, S02, S03) y de Python (C11: S02, S03). UNION da S01, S02, S03; INTERSECT da S02, S03; MINUS da S01. UNION ALL conserva los repetidos: 5 filas.',
  'C10: students of Databases · C11: students of Python': 'C10: estudiantes de Databases · C11: estudiantes de Python',
  'UNION ALL keeps the repeats: 3 + 2 = 5 rows.': 'UNION ALL conserva los repetidos: 3 + 2 = 5 filas.',

  /* ---- Sub-languages ---- */
  'The four sub-languages of SQL. DDL (CREATE, ALTER, DROP, TRUNCATE) acts on the schema; DML (SELECT, INSERT, UPDATE, DELETE, MERGE) acts on the rows; DCL (GRANT, REVOKE) acts on users and privileges; TCL (COMMIT, ROLLBACK, SAVEPOINT) decides when changes become permanent.':
    'Los cuatro sublenguajes de SQL. DDL (CREATE, ALTER, DROP, TRUNCATE) actúa sobre el esquema; DML (SELECT, INSERT, UPDATE, DELETE, MERGE), sobre las filas; DCL (GRANT, REVOKE), sobre los usuarios y sus privilegios; TCL (COMMIT, ROLLBACK, SAVEPOINT) decide cuándo los cambios son permanentes.',
  'data definition': 'definición de datos',
  'acts on: the schema': 'actúa sobre: el esquema',
  'data manipulation': 'manipulación de datos',
  'acts on: the rows': 'actúa sobre: las filas',
  'data control': 'control de datos',
  'acts on: users and|privileges': 'actúa sobre: usuarios y|privilegios',
  'transaction control': 'control de transacciones',
  'acts on: when changes|become permanent': 'decide cuándo los cambios|son permanentes',

  /* ---- Transactions ---- */
  'Timeline of one transaction: DELETE and INSERT move S03 from Python to Statistics, SAVEPOINT before_grades marks a point, an UPDATE sets every grade to 10 by mistake, ROLLBACK TO the savepoint undoes only that UPDATE, and COMMIT makes the move permanent.':
    'Línea de tiempo de una transacción: DELETE e INSERT pasan a S03 de Python a Statistics, SAVEPOINT before_grades marca un punto, un UPDATE pone por error un 10 a todas las notas, ROLLBACK TO al punto de guardado deshace solo ese UPDATE y COMMIT hace permanente el cambio de asignatura.',
  'S03 leaves|Python': 'S03 deja|Python',
  'S03 joins|Statistics': 'S03 entra en|Statistics',
  'a mark:|before_grades': 'una marca:|before_grades',
  'oops: every|grade = 10': 'uy: todas las|notas = 10',
  'undoes only|the UPDATE': 'deshace solo|el UPDATE',
  'the move is|permanent': 'el cambio es|permanente',
  'back to the mark': 'vuelta a la marca',
  'One transaction: it opens with the first change and ends at COMMIT.': 'Una transacción: empieza con el primer cambio y termina en el COMMIT.',

  /* ---- Views ---- */
  'A view stores only its query. Reading course_average runs SELECT course_id, ROUND(AVG(grade), 2) FROM enrolment GROUP BY course_id on the current rows of enrolment and shows C10 6.67, C11 8.25 and C20 7.00; no rows are stored in the view.':
    'Una vista solo guarda su consulta. Leer course_average ejecuta SELECT course_id, ROUND(AVG(grade), 2) FROM enrolment GROUP BY course_id sobre las filas actuales de enrolment y muestra C10 6,67, C11 8,25 y C20 7,00; la vista no guarda ninguna fila.',
  'Stored in the data dictionary: only the query': 'Guardado en el diccionario de datos: solo la consulta',
  'enrolment: rows stored': 'enrolment: filas guardadas',
  'course_average: a view': 'course_average: una vista',
  'runs the query|on every read': 'ejecuta la consulta|en cada lectura',
  'Nothing is copied: change a grade in|enrolment and the next read shows it.': 'No se copia nada: cambia una nota en|enrolment y la siguiente lectura lo verá.',

  /* ---- CTEs ---- */
  'Chained common table expressions: per_student computes each student\'s average (S01 7.75, S02 7.75, S03 6.25); overall uses it to compute the class average, 7.25; the final SELECT uses both and returns Ana Ruiz and Luis Gil.':
    'Expresiones de tabla comunes encadenadas: per_student calcula la media de cada estudiante (S01 7,75, S02 7,75, S03 6,25); overall la usa para calcular la media de la clase, 7,25; el SELECT final usa las dos y devuelve a Ana Ruiz y Luis Gil.',
  'class average': 'media de la clase',
  'Each named step can use the ones before it; the final SELECT uses both.': 'Cada paso con nombre puede usar los anteriores; el SELECT final usa los dos.',

  /* ---- PL/SQL block ---- */
  'Structure of a PL/SQL block: an optional DECLARE section with variables, a required BEGIN section with the statements, which can contain other blocks, an optional EXCEPTION section with the error handlers, and END;. A / alone on the next line runs it in a script.':
    'Estructura de un bloque PL/SQL: una sección DECLARE opcional con las variables, una sección BEGIN obligatoria con las sentencias, que puede contener otros bloques, una sección EXCEPTION opcional con los manejadores de errores, y END;. Una / sola en la línea siguiente lo ejecuta en un script.',
  'Ingredients': 'Ingredientes',
  'variables, constants,|cursors · optional': 'variables, constantes,|cursores · opcional',
  'Steps': 'Pasos',
  'SQL and PL/SQL|statements · required': 'sentencias SQL y|PL/SQL · obligatoria',
  'If something goes wrong': 'Si algo sale mal',
  'the error handlers|· optional': 'manejadores de|errores · opcional',
  'a block can contain other blocks': 'un bloque puede contener otros bloques',
  'alone on the next line: run the block': 'sola en la línea siguiente: ejecuta el bloque',

  /* ---- Cursors ---- */
  'Lifecycle of an explicit cursor: DECLARE, OPEN, then FETCH in a loop until %NOTFOUND, then CLOSE. The cursor c_grades points at the second of six rows after two FETCHes; the first row has been processed (4.0 became 5.0), %ROWCOUNT is 2 and %FOUND is TRUE.':
    'Ciclo de vida de un cursor explícito: DECLARE, OPEN, después FETCH en un bucle hasta %NOTFOUND y por último CLOSE. Tras dos FETCH, el cursor c_grades señala la segunda de seis filas; la primera ya se ha procesado (el 4,0 pasó a 5,0), %ROWCOUNT vale 2 y %FOUND es TRUE.',
  'Lifecycle': 'Ciclo de vida',
  'loop': 'bucle',
  'c_grades: the rows of its SELECT': 'c_grades: las filas de su SELECT',
  'end of the list': 'fin de la lista',
  '← current row': '← fila actual',
  'A cursor FOR loop does the OPEN, FETCH, EXIT and CLOSE for you.': 'Un bucle FOR de cursor hace el OPEN, FETCH, EXIT y CLOSE por ti.',

  /* ---- Exceptions ---- */
  'Exception propagation. Inside an inner block, SELECT INTO finds no row and raises NO_DATA_FOUND; the rest of the inner block is skipped. Its handler WHEN TOO_MANY_ROWS does not match, so the exception goes up to the outer block, whose WHEN NO_DATA_FOUND handler catches it. If no block handled it, the error would reach the caller.':
    'Propagación de excepciones. Dentro de un bloque interior, SELECT INTO no encuentra ninguna fila y lanza NO_DATA_FOUND; el resto del bloque interior no se ejecuta. Su manejador WHEN TOO_MANY_ROWS no la reconoce, así que la excepción sube al bloque exterior, cuyo manejador WHEN NO_DATA_FOUND la captura. Si ningún bloque la manejara, el error llegaría a quien hizo la llamada.',
  'SELECT INTO finds no row:|NO_DATA_FOUND is raised': 'SELECT INTO no encuentra|fila: salta NO_DATA_FOUND',
  'the rest of the block|is skipped': 'el resto del bloque|no se ejecuta',
  'no handler matches:|it goes up one level': 'ningún manejador la|reconoce: sube un nivel',
  'caught here: the outer|block ends normally': 'se captura aquí: el bloque|exterior acaba bien',
  'If no block handles it, the error reaches the caller and the script stops.': 'Si ningún bloque la maneja, el error llega a quien llamó y el script se detiene.',

  /* ---- Procedures and functions ---- */
  'A procedure such as enrol_student receives IN parameters, does something (inserts a row in enrolment) and hands a message back in an OUT parameter. A function such as letter_grade returns one value and can be used inside a SELECT: 8.5 gives B, 4.5 gives F and NULL gives -.':
    'Un procedimiento como enrol_student recibe parámetros IN, hace algo (inserta una fila en enrolment) y devuelve un mensaje en un parámetro OUT. Una función como letter_grade devuelve un valor y se puede usar dentro de un SELECT: 8,5 da B, 4,5 da F y NULL da -.',
  'Procedure: does something': 'Procedimiento: hace algo',
  'caller: a block or EXEC': 'quien llama: un bloque o EXEC',
  'Called as a statement; it hands|results back in OUT parameters.': 'Se llama como una sentencia; devuelve|resultados en parámetros OUT.',
  'Function: returns a value': 'Función: devuelve un valor',
  'One value per call, usable inside|expressions and SQL queries.': 'Un valor por llamada, que se puede|usar en expresiones y consultas.',

  /* ---- Triggers ---- */
  'Firing order of triggers for an UPDATE that changes two rows: the BEFORE statement trigger once, then for each row a BEFORE row trigger, the change and an AFTER row trigger (S02 from 9.0 to 9.5, S03 from 7.5 to 8.0), and finally the AFTER statement trigger once.':
    'Orden de disparo para un UPDATE que cambia dos filas: el disparador BEFORE de sentencia una vez; después, para cada fila, el disparador BEFORE de fila, el cambio y el disparador AFTER de fila (S02 de 9,0 a 9,5, S03 de 7,5 a 8,0); y al final el disparador AFTER de sentencia una vez.',
  'Statement level: once per statement': 'Nivel de sentencia: una vez por sentencia',
  'BEFORE|statement': 'BEFORE|sentencia',
  'AFTER|statement': 'AFTER|sentencia',
  'FOR EACH ROW: once per changed row': 'FOR EACH ROW: una vez por fila cambiada',
  'change': 'cambio',
  'row {id}': 'fila {id}',
  'BEFORE row can check or change :NEW; AFTER row sees the final values,': 'BEFORE de fila puede comprobar o cambiar :NEW; AFTER de fila ve los valores',
  'for example to write a line in grade_audit.': 'finales, por ejemplo para escribir una línea en grade_audit.',

  /* ---- Packages ---- */
  'A package grades_pkg. Its specification is public: letter, curve_course and the constant c_max_grade, which other programs can call. Its body is private: the code of letter and curve_course and the helper safe_points, which only curve_course can call; programs outside the package cannot reach it.':
    'Un paquete grades_pkg. Su especificación es pública: letter, curve_course y la constante c_max_grade, que otros programas pueden usar. Su cuerpo es privado: el código de letter y curve_course y la función auxiliar safe_points, que solo curve_course puede llamar; los programas de fuera del paquete no llegan a ella.',
  'other|programs': 'otros|programas',
  'Specification (public): the menu': 'Especificación (pública): la carta',
  'Body (private): the kitchen': 'Cuerpo (privado): la cocina',
  'private: only the|body can call it': 'privada: solo la|llama el cuerpo',
  'cannot|call it': 'no puede|llamarla',
  'Change the body without touching the specification: callers keep working.': 'Cambia el cuerpo sin tocar la especificación: quien lo llama sigue funcionando.',
});
