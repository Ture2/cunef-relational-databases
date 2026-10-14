'use strict';
/* SQL: fichas de conceptos (js/sql.js), test y entorno de pruebas, en español.
   Campos de cada ficha: los de js/concept-section.js, más
     sql      { setup, query, expectError? }: un ejemplo ejecutable escrito en ORACLE (el curso practica en
              freesql.com); js/oracle-dialect.js lo traduce a SQLite en el navegador. El setup se ejecuta
              primero en una base de datos nueva; la query es lo que edita el estudiante. expectError marca
              los ejemplos cuya última sentencia falla a propósito (la usa tools/check-cards.mjs).
     code + dialect   un ejemplo estático de Oracle para funciones que el entorno no puede simular (roles, particiones…).
   Los ejemplos ejecutables comparten el esquema de matrículas de la sección de Normalización (student,
   course, department, enrolment); las fichas de eficiencia añaden una tabla customer / orders con muchas
   filas. El código SQL (identificadores, datos y sentencias) es idéntico al de data/en/sql.js; solo se
   traducen los comentarios. Mismos ids, orden y respuestas que data/en/sql.js. */
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

  /* 50.000 clientes y 100.000 pedidos, generados con CONNECT BY LEVEL (unos 0,2 s). */
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

  DATA.es.SQL_CONCEPTS = [
    /* ───────────── Oracle y FreeSQL ───────────── */
    {
      id: 'freesql',
      hub: 'oracle',
      topic: 'oracle',
      title: 'Practicar con Oracle en FreeSQL',
      summary: '**FreeSQL** (freesql.com) es la hoja de trabajo en línea y gratuita de Oracle: escribes SQL de Oracle en el navegador y se ejecuta en una base de datos Oracle real, sin instalar nada. Es donde se practica en este curso.',
      body: [
        'Todos los ejemplos ejecutables de este sitio están escritos en **SQL de Oracle**. La página ejecuta una simulación en el navegador para darte una respuesta inmediata, pero la referencia es la base de datos real: usa el botón **Copiar y abrir FreeSQL** que hay bajo cualquier ejemplo y pega el script en la hoja de trabajo.',
        'En la hoja de trabajo eliges la **versión de la base de datos** (usa 23ai o 26ai: los scripts de este sitio usan funciones de 23ai, como `DROP TABLE IF EXISTS`), escribes tu SQL y ejecutas una sola sentencia o el script entero. Si inicias sesión con una cuenta de Oracle gratuita puedes guardar y compartir tus scripts y obtener una cadena de conexión para herramientas como SQL Developer.',
        'Los scripts que se copian desde este sitio empiezan borrando las tablas que crean, de modo que puedes ejecutarlos una y otra vez desde cero.',
      ],
      points: [
        'Ejecutar una sentencia: coloca el cursor en ella y ejecuta. Ejecutar todo el script: usa la opción de script de la hoja de trabajo.',
        'Tu esquema se conserva entre sesiones: borra lo que ya no necesites.',
        'La simulación de esta página no admite PL/SQL, particionado, secuencias ni privilegios: para eso, FreeSQL es el único sitio donde ejecutarlo.',
      ],
      mistake: 'Fiarse solo de la simulación. Traduce un subconjunto de Oracle a otro motor distinto: cuando su resultado te sorprenda, compruébalo en FreeSQL.',
    },
    {
      id: 'oracle-dialect',
      hub: 'oracle',
      topic: 'oracle',
      title: 'Oracle frente a otros dialectos de SQL',
      summary: 'SQL es un estándar, pero cada SGBD tiene su propio dialecto. La mayoría de los errores de quien aprendió SQL en otro sitio vienen de unas pocas diferencias: limitar filas, tipos, fechas, cadenas vacías y transacciones.',
      body: [
        'El entorno te avisa cuando el código que has escrito no funcionaría en Oracle (por ejemplo, si escribes `LIMIT`) y muestra el error como lo daría Oracle, como `ORA-00942: table or view does not exist`.',
      ],
      table: {
        caption: 'Oracle frente a SQLite, PostgreSQL y MySQL',
        head: ['Tema', 'Oracle', 'Otros'],
        rows: [
          ['Primeras n filas', '`FETCH FIRST n ROWS ONLY`', '`LIMIT n`'],
          ['Diferencia de conjuntos', '`MINUS`', '`EXCEPT`'],
          ['Tipo de texto', '`VARCHAR2(n)`, `CLOB`', '`TEXT`, `VARCHAR(n)`'],
          ['Números', '`NUMBER(p, s)`', '`INTEGER`, `NUMERIC`, `REAL`'],
          ['Numeración automática', '`GENERATED ALWAYS AS IDENTITY`', '`AUTOINCREMENT`, `SERIAL`, `AUTO_INCREMENT`'],
          ['Fecha actual', '`SYSDATE`', '`date(\'now\')`, `CURRENT_DATE`, `NOW()`'],
          ['Literal de fecha', '`DATE \'2024-01-31\'`, `TO_DATE(…)`', 'Una cadena de texto'],
          ['Sustituir NULL', '`NVL(a, b)`, `COALESCE`', '`IFNULL(a, b)`'],
          ['Cadena vacía', 'Es **NULL**', 'Es una cadena vacía'],
          ['SELECT sin tabla', '`SELECT 1 FROM dual`', '`SELECT 1`'],
          ['Transacciones', 'Empiezan con el primer DML; el DDL confirma', '`BEGIN` / `START TRANSACTION`'],
          ['Diccionario de datos', '`USER_TABLES`, `USER_TAB_COLUMNS`', '`sqlite_master`, `information_schema`'],
          ['Plan de ejecución', '`EXPLAIN PLAN FOR` + `DBMS_XPLAN`', '`EXPLAIN`'],
        ],
      },
      mistake: 'Escribir una comparación como `WHERE signup_date >= \'2024-01-01\'` contra una columna DATE. Depende del formato de fecha de la sesión y a menudo falla (ORA-01861); escribe `DATE \'2024-01-01\'`.',
    },

    /* ───────────── Consultas ───────────── */
    {
      id: 'select-basics',
      hub: 'querying',
      topic: 'querying',
      title: 'SELECT: columnas, expresiones y alias',
      summary: 'Un **SELECT** nombra las columnas que quieres ver y **FROM** la tabla de la que salen. Cada columna puede ser un valor guardado, un cálculo o un texto concatenado, y un **alias** le da un nombre legible.',
      figure: { kind: 'select-pick' },
      caption: 'SELECT elige las columnas y puede calcular otras nuevas; todas las filas de la tabla se mantienen.',
      body: [
        '`SELECT *` devuelve todas las columnas en el orden de la tabla. Es útil para explorar una tabla, pero en una consulta real enumera las columnas que necesitas: el resultado es más claro y no cambia si alguien añade una columna.',
        'Una columna puede ser una **expresión**: aritmética (`credits * 25`), una función (`ROUND(x, 1)`, `UPPER(name)`) o texto unido con el operador de concatenación `||` (`name || \' (\' || country || \')\'`). Los valores de texto van siempre entre **comillas simples**.',
        'Un **alias** renombra una columna del resultado: `credits * 25 AS hours`. `AS` es opcional. Sin comillas Oracle muestra el alias en mayúsculas; escríbelo entre comillas dobles (`AS "Horas de estudio"`) para conservar espacios o minúsculas.',
        '**DISTINCT** elimina las filas repetidas del resultado. Se aplica a la fila entera: `SELECT DISTINCT dept_id, credits` conserva cada **pareja** distinta una vez.',
      ],
      points: [
        'Orden de una consulta básica: `SELECT columnas FROM tabla`; las cláusulas que añadirás después (WHERE, ORDER BY) van detrás de FROM.',
        'Las comillas simples son para valores de texto; las dobles, para nombres (alias, columnas).',
        'Un alias solo renombra la salida: no cambia la tabla.',
      ],
      example: '`SELECT title, credits * 25 AS hours FROM course` muestra cada asignatura con sus horas de estudio (1 crédito ECTS ≈ 25 horas).',
      mistake: 'Unir texto con `+` (`name + \' \' + email`). En Oracle `+` es solo aritmético y falla con ORA-01722 (número no válido): usa `||`.',
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
      title: 'Ordenar resultados con ORDER BY',
      summary: 'Sin **ORDER BY** una tabla no tiene un orden garantizado: las filas salen en el orden en que el SGBD las encuentra. ORDER BY ordena el resultado por una o más claves, ascendente (**ASC**, por defecto) o descendente (**DESC**).',
      figure: { kind: 'clause-order' },
      caption: 'El orden en que escribes las cláusulas no es el orden en que se ejecutan: SELECT va en quinto lugar, así que solo ORDER BY ve sus alias.',
      body: [
        'Con varias claves, la segunda solo deshace los empates de la primera: `ORDER BY credits DESC, title` ordena por créditos de mayor a menor y, dentro de los mismos créditos, por título de la A a la Z. Cada clave lleva su propio ASC/DESC.',
        'Puedes ordenar por una columna que no muestras, por una expresión o por un **alias** del SELECT (ORDER BY se evalúa después del SELECT).',
        'En Oracle **NULL es el valor más grande**: va **al final** en orden ascendente y al principio en descendente. Cámbialo con `NULLS FIRST` o `NULLS LAST` detrás de la clave.',
        'Para quedarte solo con las primeras filas del resultado ordenado, termina con `FETCH FIRST n ROWS ONLY`. Oracle no tiene `LIMIT`.',
      ],
      points: [
        'ORDER BY es siempre la última cláusula de la consulta (FETCH FIRST va detrás).',
        'El texto se ordena carácter a carácter: con la ordenación binaria por defecto de Oracle, las mayúsculas van antes que las minúsculas.',
        'Si dos filas empatan en todas las claves su orden no está definido: añade una clave que lo haga único.',
      ],
      example: '`ORDER BY grade DESC FETCH FIRST 3 ROWS ONLY` da las tres mejores notas.',
      mistake: 'Escribir `DESC` una vez y esperar que se aplique a todas las claves. En `ORDER BY credits, title DESC` solo el título es descendente.',
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
      title: 'Filtrar con WHERE, AND, OR y NOT',
      summary: '**WHERE** conserva solo las filas para las que una condición es verdadera. Las condiciones comparan valores (`=`, `<>`, `<`, `<=`, `>`, `>=`) y se combinan con **AND**, **OR** y **NOT**.',
      figure: { kind: 'where-precedence' },
      caption: 'Las mismas tres condiciones, con y sin paréntesis. Solo Python cambia de lado.',
      body: [
        '`AND` exige que se cumplan las dos condiciones; `OR`, al menos una; `NOT` invierte una condición. "Distinto de" se escribe `<>` (Oracle también acepta `!=`).',
        'Los operadores tienen **precedencia**, como × y + en aritmética: primero `NOT`, luego `AND` y por último `OR`. Así, `a OR b AND c` significa `a OR (b AND c)`.',
        'Cuando mezcles AND y OR, **escribe los paréntesis** que quieres decir. Las dos consultas del ejemplo solo se diferencian en los paréntesis y devuelven filas distintas.',
        'WHERE trabaja sobre las filas de la tabla, **antes** del SELECT: no puedes usar un alias de columna del SELECT dentro del WHERE.',
      ],
      points: [
        'Las comparaciones de texto distinguen mayúsculas en Oracle: `\'spain\'` no es `\'Spain\'`.',
        'Los números se escriben sin comillas: `credits >= 6`.',
        'Lee tu WHERE en voz alta con los paréntesis: si la frase no es lo que pide el enunciado, la consulta está mal.',
      ],
      example: '`WHERE (dept_id = \'D01\' OR dept_id = \'D02\') AND credits >= 6` conserva las asignaturas de 6 créditos de cualquiera de los dos departamentos.',
      mistake: 'Omitir los paréntesis al mezclar AND y OR. `dept_id = \'D01\' OR dept_id = \'D02\' AND credits >= 6` devuelve **todas** las asignaturas de D01, tengan los créditos que tengan.',
      sql: {
        setup: SCHOOL,
        query: `-- Sin paréntesis: AND se evalúa primero
SELECT course_id, title, credits, dept_id
FROM course
WHERE dept_id = 'D01' OR dept_id = 'D02' AND credits >= 6;
-- Con paréntesis: lo que realmente queríamos
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
      title: 'BETWEEN, IN y LIKE',
      summary: 'Tres atajos para filtros habituales: **BETWEEN** para rangos, **IN** para listas de valores y **LIKE** para patrones de texto.',
      body: [
        '`x BETWEEN a AND b` equivale a `x >= a AND x <= b`: **los dos extremos se incluyen**. Funciona con números, texto y fechas; para fechas escribe literales como `DATE \'2024-01-31\'`.',
        '`x IN (\'A\', \'B\', \'C\')` es una forma corta de escribir `x = \'A\' OR x = \'B\' OR x = \'C\'`. `NOT IN` conserva el resto.',
        '`LIKE` compara un texto con un patrón: `%` representa **cualquier número** de caracteres (incluido ninguno) y `_` **exactamente uno**. `\'Ma%\'` empieza por Ma, `\'%ez\'` termina en ez y `\'_a%\'` tiene una a como segunda letra.',
        'LIKE distingue mayúsculas en Oracle. Para ignorarlas compara en mayúsculas: `UPPER(name) LIKE \'%RUIZ%\'`.',
      ],
      points: [
        '`BETWEEN 2020 AND 2021` sobre una columna DATE es un error: compara con fechas, `BETWEEN DATE \'2020-01-01\' AND DATE \'2021-12-31\'`.',
        'Cuidado con los espacios en los patrones: `\'The %\'` (la palabra "The") no es `\'The%\'` (que también encuentra "Theo").',
        'La simulación del navegador ignora las mayúsculas en LIKE; Oracle no. Comprueba en FreeSQL los patrones que dependen de ellas.',
      ],
      example: '`WHERE grade BETWEEN 7 AND 8.5` devuelve las notas 7.0, 7.5 y 8.5: los dos límites se incluyen.',
      mistake: 'Escribir un patrón con `=`: `name = \'A%\'` busca un nombre que sea literalmente "A%". Los patrones necesitan LIKE.',
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
      title: 'Trabajar con NULL',
      summary: '**NULL** significa "desconocido" o "falta": no es cero ni un texto vacío. Cualquier comparación con NULL es desconocida, así que `= NULL` nunca encuentra nada: usa **IS NULL** e **IS NOT NULL**.',
      figure: { kind: 'three-valued' },
      caption: 'Comparar con NULL da DESCONOCIDO, y WHERE descarta las filas desconocidas igual que las falsas.',
      body: [
        'SQL usa una lógica de tres valores: una condición puede ser verdadera, falsa o **desconocida**. WHERE solo conserva las filas en las que la condición es **verdadera**, así que las que dan desconocido desaparecen.',
        '`email = NULL` es desconocido para todas las filas, incluso para las que no tienen email. La prueba correcta es `email IS NULL`; su contraria es `email IS NOT NULL`.',
        'Aritmética y concatenación con NULL: `NULL + 1` es NULL. Para mostrar un valor en lugar de NULL usa `NVL(email, \'sin email\')` (o el estándar `COALESCE`).',
        'En Oracle una **cadena vacía `\'\'` es NULL**. Otros SGBD la tratan como un texto de longitud cero.',
      ],
      points: [
        '`NOT (email = NULL)` sigue siendo desconocido: negar lo desconocido no lo hace verdadero.',
        'Una condición como `grade <> 5` también descarta las filas en las que grade es NULL.',
        'Con ORDER BY, Oracle coloca los NULL al final en orden ascendente (mira la tarjeta de ORDER BY).',
      ],
      example: '`SELECT name FROM student WHERE email IS NULL` devuelve los estudiantes sin email.',
      mistake: 'Escribir `WHERE email = NULL` o `WHERE email = \'\'`: ninguna devuelve filas. Usa `IS NULL`.',
      sql: {
        setup: SCHOOL,
        query: `-- No devuelve nada: una comparación con NULL nunca es verdadera
SELECT name, email FROM student WHERE email = NULL;
SELECT name FROM student WHERE email IS NULL;
SELECT name, NVL(email, 'sin email') AS email FROM student;`,
      },
    },
    {
      id: 'inner-join',
      video: 'sql-joins',
      hub: 'querying',
      topic: 'querying',
      title: 'Combinar tablas con INNER JOIN',
      summary: 'Un **JOIN** combina filas de dos tablas relacionadas. La condición **ON** indica cómo emparejarlas, casi siempre siguiendo una **clave ajena** hasta la clave primaria a la que apunta.',
      figure: { kind: 'join-match' },
      caption: 'La condición ON sigue la clave ajena dept_id hasta el departamento al que referencia.',
      body: [
        '`FROM course c JOIN department d ON d.dept_id = c.dept_id` empareja cada asignatura con el departamento cuya clave coincide con su `dept_id`. `JOIN` e `INNER JOIN` son lo mismo.',
        'Los **alias de tabla** (`c`, `d`) acortan la consulta. Cuando un nombre de columna existe en las dos tablas, hay que decir cuál quieres: `c.dept_id` o `d.dept_id`; si no, Oracle falla con ORA-00918 (columna definida de forma ambigua).',
        'Para combinar tres tablas, añade un JOIN por cada relación: `enrolment` enlaza con `student` y con `course` a través de sus dos claves ajenas.',
        'Un INNER JOIN conserva solo las filas que **encuentran pareja**. Una asignatura sin matrículas no aparece al combinar course con enrolment. Conservar esas filas necesita un OUTER JOIN (mira la tarjeta **Combinaciones externas**).',
      ],
      points: [
        'Un JOIN por cada clave ajena que sigues: n tablas necesitan n − 1 condiciones de combinación.',
        'WHERE y ORDER BY van después de todos los JOIN y pueden usar columnas de cualquier tabla combinada.',
        'Sin la condición ON cada fila se emparejaría con todas las filas de la otra tabla (un producto cartesiano).',
      ],
      example: '`SELECT s.name, c.title FROM enrolment e JOIN student s ON s.student_id = e.student_id JOIN course c ON c.course_id = e.course_id` lista quién está matriculado en qué.',
      mistake: 'Combinar por columnas equivocadas (`ON c.course_id = d.dept_id`). La consulta se ejecuta, pero las filas no tienen sentido o faltan: el ON debe seguir una clave ajena.',
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

    /* ───────────── Combinar tablas ───────────── */
    {
      id: 'outer-joins',
      hub: 'joins',
      topic: 'joins',
      title: 'Combinaciones externas: LEFT, RIGHT y FULL',
      summary: 'Un **OUTER JOIN** conserva también las filas que no encuentran pareja y rellena con NULL el lado que falta. **LEFT** conserva todas las filas de la tabla de la izquierda, **RIGHT** todas las de la derecha y **FULL** todas las de ambas.',
      figure: { kind: 'join-venn' },
      caption: 'Sombreado: las filas que conserva cada combinación, contadas en las tablas de ejemplo. Solo Marketing se queda sin pareja.',
      body: [
        'Piensa en la lista de clase y en el montón de trabajos entregados. Un INNER JOIN solo muestra a quienes han entregado algo; un LEFT JOIN parte de la lista de clase y deja un hueco en blanco junto a quienes no lo han hecho. Ese hueco es NULL.',
        '`FROM course c LEFT JOIN enrolment e ON e.course_id = c.course_id` conserva Marketing, que no cursa nadie, con NULL en todas las columnas de enrolment. `RIGHT JOIN` es la imagen en el espejo (`A RIGHT JOIN B` equivale a `B LEFT JOIN A`), por eso casi todo el mundo escribe solo LEFT JOIN. `FULL OUTER JOIN` conserva las filas sin pareja de los dos lados.',
        'La **anticombinación** (anti-join) encuentra las filas **sin** pareja: LEFT JOIN y luego te quedas con las filas en las que una columna de la tabla derecha que nunca es NULL ha llegado como NULL (`WHERE e.course_id IS NULL`). Asignaturas que no cursa nadie, clientes sin pedidos, productos que nunca se han vendido.',
      ],
      points: [
        'Una condición sobre la tabla derecha va en el **ON** si quieres conservar las filas sin pareja; en el WHERE las vuelve a eliminar.',
        'Para contar parejas, cuenta una columna de la tabla derecha (`COUNT(e.course_id)`): una asignatura sin pareja sigue produciendo una fila, y `COUNT(*)` la contaría como 1.',
        'La antigua sintaxis `(+)` de Oracle (`WHERE c.course_id = e.course_id(+)`) es un LEFT JOIN: reconócela en código antiguo, pero escribe la forma ANSI.',
      ],
      example: '`SELECT c.title FROM course c LEFT JOIN enrolment e ON e.course_id = c.course_id WHERE e.course_id IS NULL` lista las asignaturas en las que no se ha matriculado nadie: Marketing.',
      mistake: 'Filtrar la tabla derecha en el WHERE: `LEFT JOIN enrolment e ON … WHERE e.grade >= 5` vuelve a eliminar las asignaturas sin matrículas, porque su nota es NULL. Lleva la condición al ON: `ON e.course_id = c.course_id AND e.grade >= 5`.',
      sql: {
        setup: SCHOOL,
        query: `-- INNER: Marketing (sin matrículas) desaparece
SELECT c.title, e.student_id, e.grade
FROM course c
JOIN enrolment e ON e.course_id = c.course_id
ORDER BY c.title;
-- LEFT: todas las asignaturas, con NULL donde no hay nadie matriculado
SELECT c.title, e.student_id, e.grade
FROM course c
LEFT JOIN enrolment e ON e.course_id = c.course_id
ORDER BY c.title;
-- Anticombinación: las asignaturas que no cursa nadie
SELECT c.course_id, c.title
FROM course c
LEFT JOIN enrolment e ON e.course_id = c.course_id
WHERE e.course_id IS NULL;
-- FULL: quién cursa Statistics (C20), quién cursa Python (C11) y quién cursa las dos
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
      title: 'CROSS JOIN, autocombinaciones, USING y NATURAL',
      summary: 'Un **CROSS JOIN** empareja cada fila con todas las filas de otra tabla. Una **autocombinación** (self-join) combina una tabla consigo misma con dos alias. **USING** y **NATURAL JOIN** son atajos para combinar por columnas que se llaman igual.',
      figure: { kind: 'cross-self' },
      caption: 'Un CROSS JOIN enumera todas las combinaciones; una autocombinación empareja filas de una misma tabla con dos alias.',
      body: [
        'Un CROSS JOIN es el menú del día de un restaurante: 3 primeros × 4 segundos = 12 menús posibles. Con 3 estudiantes y 4 asignaturas, `student CROSS JOIN course` devuelve 12 filas, todas las matrículas posibles: útil para montar la cuadrícula de un horario o para ver qué combinaciones faltan.',
        'Una **autocombinación** compara filas de la misma tabla, como poner dos copias de la orla de clase una al lado de la otra. Da a la tabla dos alias y di cómo se relacionan: `enrolment a JOIN enrolment b ON b.course_id = a.course_id AND a.student_id < b.student_id` lista cada pareja de compañeros una sola vez (el `<` evita emparejar a alguien consigo mismo y que cada pareja salga dos veces). El caso clásico es una tabla de empleados cuyo `manager_id` apunta a otro empleado.',
        '`JOIN department USING (dept_id)` combina por la columna que se llama así en las dos tablas y la muestra una sola vez; en Oracle se escribe entonces sin prefijo de tabla. **NATURAL JOIN** va más allá: combina por **todas** las columnas que se llaman igual, sin decir cuáles.',
      ],
      points: [
        'n filas × m filas: un CROSS JOIN crece muy deprisa; 1.000 × 1.000 es un millón de filas.',
        'Olvidar la condición de combinación con la sintaxis antigua (`FROM a, b`) produce un CROSS JOIN accidental.',
        'Prefiere `ON` (o `USING`) a NATURAL JOIN: la condición de combinación queda escrita a la vista de todos.',
      ],
      example: 'Cada estudiante con cada asignatura: `SELECT s.name, c.title FROM student s CROSS JOIN course c` (3 × 4 = 12 filas).',
      mistake: 'Confiar en NATURAL JOIN en código que tiene que durar. En el ejemplo, añadir a `course` una columna inofensiva llamada `name` hace que `course NATURAL JOIN department` combine por `dept_id` **y** por `name`, y deje de devolver filas sin avisar.',
      sql: {
        setup: SCHOOL,
        query: `SELECT s.name, c.title
FROM student s
CROSS JOIN course c
ORDER BY s.name, c.title;
-- Autocombinación: parejas de compañeros en la misma asignatura
SELECT a.course_id, a.student_id AS student_1, b.student_id AS student_2
FROM enrolment a
JOIN enrolment b ON b.course_id = a.course_id AND a.student_id < b.student_id
ORDER BY a.course_id;
SELECT dept_id, d.name AS department, c.title
FROM course c
JOIN department d USING (dept_id);
SELECT title, name FROM course NATURAL JOIN department;
-- Una columna nueva con un nombre común cambia el NATURAL JOIN
ALTER TABLE course ADD (name VARCHAR2(30));
SELECT title, name FROM course NATURAL JOIN department;`,
      },
    },

    /* ───────────── Agregación ───────────── */
    {
      id: 'aggregate-functions',
      hub: 'aggregation',
      topic: 'aggregation',
      title: 'Funciones de agregado: COUNT, SUM, AVG, MIN y MAX',
      summary: 'Una **función de agregado** convierte muchas filas en un solo valor: cuántas hay, el total, la media, la menor, la mayor. Sin GROUP BY, todas las filas (tras el WHERE) forman un único grupo y el resultado es una sola fila.',
      figure: { kind: 'aggregate-null' },
      caption: 'Los agregados ignoran los NULL; solo COUNT(*) cuenta todas las filas.',
      body: [
        'Los agregados son los totales al pie del tique del supermercado: muchas líneas arriba y un número abajo. `SELECT COUNT(*), AVG(grade) FROM enrolment` devuelve una fila, haya las matrículas que haya.',
        '`COUNT(*)` cuenta **filas**. `COUNT(email)` cuenta las filas en las que email **no es NULL**. `COUNT(DISTINCT course_id)` cuenta valores **distintos**. En `student` el primero da 3 y el segundo 2, porque Eva no tiene email.',
        '`SUM`, `AVG`, `MIN` y `MAX` también **ignoran los NULL**. Una nota que falta no es un cero: `AVG(grade)` promedia solo las notas conocidas. Si las que faltan deben contar como 0, dilo: `AVG(NVL(grade, 0))`.',
      ],
      points: [
        'MIN y MAX funcionan también con texto (orden alfabético) y fechas (la más antigua, la más reciente); SUM y AVG necesitan números.',
        'Sobre un conjunto vacío COUNT devuelve 0, pero SUM, AVG, MIN y MAX devuelven NULL.',
        'No se puede mezclar un agregado con una columna normal sin GROUP BY: `SELECT name, COUNT(*) FROM student` falla con ORA-00937 (not a single-group group function).',
      ],
      example: '`SELECT COUNT(*) AS enrolments, ROUND(AVG(grade), 2) AS average, MAX(grade) AS best FROM enrolment` resume toda la tabla en una fila.',
      mistake: 'Usar `COUNT(*)` para contar valores que pueden faltar. Para saber cuántos estudiantes tienen email, cuenta la columna: `COUNT(email)`.',
      sql: {
        setup: SCHOOL,
        query: `SELECT COUNT(*) AS students, COUNT(email) AS with_email
FROM student;
SELECT COUNT(*) AS enrolments, COUNT(DISTINCT course_id) AS courses_taken,
       MIN(grade) AS lowest, MAX(grade) AS highest, ROUND(AVG(grade), 2) AS average
FROM enrolment;
-- Una nota que falta se ignora, no cuenta como cero
INSERT INTO enrolment VALUES ('S01', 'C11', NULL);
SELECT COUNT(*) AS enrolments, COUNT(grade) AS graded,
       ROUND(AVG(grade), 2) AS avg_known, ROUND(AVG(NVL(grade, 0)), 2) AS avg_as_zero
FROM enrolment;`,
      },
    },
    {
      id: 'group-by-having',
      video: 'sql-aggregation',
      hub: 'aggregation',
      topic: 'aggregation',
      title: 'GROUP BY y HAVING',
      summary: '**GROUP BY** reparte las filas en grupos que comparten un valor y calcula los agregados una vez por grupo. **HAVING** filtra los grupos, igual que WHERE filtra las filas.',
      figure: { kind: 'group-fold' },
      caption: 'Un montón por asignatura y una fila de resultado por montón; después HAVING descarta montones enteros.',
      body: [
        'GROUP BY es separar la colada en montones por colores y luego contar cada montón. `GROUP BY course_id` hace un montón por asignatura; `COUNT(*)` y `AVG(grade)` se calculan para cada montón, y cada montón da una fila del resultado.',
        'El **orden lógico** de evaluación explica la mayoría de los errores: `FROM` (y los JOIN) → `WHERE` (filas) → `GROUP BY` → `HAVING` (grupos) → `SELECT` → `ORDER BY`. Por eso WHERE no puede usar un agregado (los grupos aún no existen) y ORDER BY sí puede usar un alias del SELECT.',
        'La regla de la lista del SELECT: toda columna que **no esté dentro de un agregado** debe aparecer en el **GROUP BY**. Cada grupo devuelve una fila, así que una columna normal debe tener un único valor por grupo. `SELECT d.name, COUNT(*) … GROUP BY d.name` es correcto; dejar `d.name` fuera del GROUP BY falla con ORA-00979 (not a GROUP BY expression).',
      ],
      points: [
        'WHERE filtra filas **antes** de agrupar (`WHERE grade >= 6`: solo cuentan esas notas); HAVING filtra grupos **después** (`HAVING COUNT(*) >= 2`: solo los grupos con dos filas o más).',
        'Se puede agrupar por varias columnas: un grupo por cada combinación distinta de valores.',
        'Una condición sin agregado va en WHERE: queda más clara y descarta las filas antes.',
      ],
      example: '`SELECT course_id, ROUND(AVG(grade), 2) FROM enrolment GROUP BY course_id HAVING AVG(grade) >= 7` conserva las asignaturas cuya media es al menos 7.',
      mistake: 'Escribir `WHERE AVG(grade) > 7`, que falla con ORA-00934 (group function is not allowed here). Las condiciones sobre agregados van en HAVING.',
      sql: {
        setup: SCHOOL,
        query: `SELECT course_id, COUNT(*) AS students, ROUND(AVG(grade), 2) AS average
FROM enrolment
GROUP BY course_id
ORDER BY course_id;
-- Por departamento: primero el JOIN, luego agrupar por una columna de la tabla combinada
SELECT d.name AS department, COUNT(*) AS courses, SUM(c.credits) AS credits
FROM course c
JOIN department d ON d.dept_id = c.dept_id
GROUP BY d.name;
-- WHERE (filas) y HAVING (grupos) a la vez
SELECT course_id, COUNT(*) AS grades_6_or_more
FROM enrolment
WHERE grade >= 6
GROUP BY course_id
HAVING COUNT(*) >= 2
ORDER BY course_id;`,
      },
    },

    /* ───────────── Subconsultas y operadores de conjuntos ───────────── */
    {
      id: 'subqueries',
      video: 'sql-subqueries',
      hub: 'subqueries',
      topic: 'subqueries',
      title: 'Subconsultas en WHERE, FROM y SELECT',
      summary: 'Una **subconsulta** es un SELECT dentro de otra sentencia, entre paréntesis. Responde a una pregunta que la consulta exterior necesita antes: «¿cuál es la nota media?» y, después, «¿quién está por encima?».',
      figure: { kind: 'subquery-nest' },
      caption: 'La consulta interior resaltada se ejecuta primero; el sitio donde está decide para qué se usa su resultado.',
      body: [
        'Una subconsulta es como pedirle un dato a un compañero antes de poder terminar tu propio informe: no puedes decir quién supera la media hasta que alguien la ha calculado. En `WHERE grade > (SELECT AVG(grade) FROM enrolment)` la consulta interior se ejecuta primero y su resultado se usa como un valor.',
        'Una subconsulta **de una fila** devuelve un solo valor, así que puede ir junto a `=`, `<` o `>`. Su papel depende de dónde va: en **WHERE** es un valor con el que comparar; en **FROM** es una **vista en línea**, una tabla temporal con un alias; en **SELECT** es una **subconsulta escalar** que añade un valor a cada fila.',
        'Una vista en línea te permite consultar un resultado: calcula la media por asignatura y luego combínala o fíltrala como cualquier tabla. Ponle un alias (`FROM (SELECT …) avg_c`) y recuerda que Oracle no admite `AS` delante de un alias de tabla.',
      ],
      points: [
        'Si una subconsulta de una fila devuelve varias, Oracle falla con ORA-01427 (single-row subquery returns more than one row).',
        'Si no devuelve ninguna fila, su valor es NULL, y una comparación con NULL no conserva nada.',
        'Una subconsulta escalar en el SELECT debe devolver como mucho una fila y una columna.',
      ],
      example: '`SELECT title FROM course WHERE credits = (SELECT MAX(credits) FROM course)` lista las asignaturas con más créditos.',
      mistake: 'Escribir `WHERE grade > AVG(grade)`. Un agregado no puede ir en el WHERE; calcúlalo en una subconsulta: `WHERE grade > (SELECT AVG(grade) FROM enrolment)`.',
      sql: {
        setup: SCHOOL,
        query: `-- En WHERE: las notas por encima de la media global
SELECT student_id, course_id, grade
FROM enrolment
WHERE grade > (SELECT AVG(grade) FROM enrolment)
ORDER BY grade DESC;
-- En FROM (vista en línea): la media por asignatura, luego filtrada y combinada
SELECT c.title, avg_c.average
FROM (SELECT course_id, ROUND(AVG(grade), 2) AS average
      FROM enrolment
      GROUP BY course_id) avg_c
JOIN course c ON c.course_id = avg_c.course_id
WHERE avg_c.average >= 7;
-- En SELECT (escalar): cada nota comparada con la media global
SELECT student_id, course_id, grade,
       grade - (SELECT AVG(grade) FROM enrolment) AS above_average
FROM enrolment;`,
      },
    },
    {
      id: 'multirow-subqueries',
      hub: 'subqueries',
      topic: 'subqueries',
      title: 'Subconsultas de varias filas: IN, ANY y ALL',
      summary: 'Cuando una subconsulta devuelve **una lista** de valores, se compara con **IN** (igual a uno de ellos), **ANY** (cierto para al menos uno) o **ALL** (cierto para todos). `NOT IN` esconde una trampa: basta un NULL en la lista para que no salga ninguna fila.',
      figure: { kind: 'in-any-all' },
      caption: '`> ANY` significa por encima del menor valor de la lista; `> ALL`, por encima del mayor.',
      body: [
        'Una subconsulta de varias filas es la lista de invitados en la puerta de una fiesta: `IN` pregunta «¿estás en la lista?». `WHERE student_id IN (SELECT student_id FROM enrolment WHERE course_id = \'C11\')` conserva a los estudiantes matriculados en Python.',
        '`> ANY (…)` significa «mayor que al menos uno» (mayor que el menor); `> ALL (…)` significa «mayor que todos» (mayor que el mayor). `= ANY` equivale a IN, y `<> ALL` equivale a NOT IN.',
        '**La trampa de NOT IN**: `x NOT IN (a, b, NULL)` significa `x <> a AND x <> b AND x <> NULL`, y la última comparación es desconocida, así que no pasa ninguna fila. Si la subconsulta puede devolver NULL, descártalos (`AND grade IS NOT NULL`) o usa NOT EXISTS (siguiente tarjeta).',
      ],
      points: [
        'Una subconsulta tras `=` que devuelve varias filas falla (ORA-01427); usa IN.',
        '`> ALL` con una lista vacía es cierto para todas las filas; `> ANY` con una lista vacía es falso.',
        'IN con una subconsulta suele leerse mejor que un JOIN cuando solo necesitas columnas de la tabla exterior.',
      ],
      example: 'Los estudiantes que cursan alguna asignatura de menos de 5 créditos: `WHERE student_id IN (SELECT e.student_id FROM enrolment e JOIN course c ON c.course_id = e.course_id WHERE c.credits < 5)`.',
      mistake: 'Usar NOT IN con una subconsulta que puede devolver NULL. En el ejemplo basta una matrícula de Python sin nota para que «las notas que nadie ha sacado en Python» no devuelvan ninguna fila.',
      sql: {
        setup: SCHOOL,
        query: `SELECT name
FROM student
WHERE student_id IN (SELECT student_id FROM enrolment WHERE course_id = 'C11');
-- Mejor que todas las notas de Databases (C10)
SELECT student_id, course_id, grade
FROM enrolment
WHERE grade > ALL (SELECT grade FROM enrolment WHERE course_id = 'C10');
-- Mejor que al menos una nota de Databases
SELECT student_id, course_id, grade
FROM enrolment
WHERE course_id <> 'C10'
  AND grade > ANY (SELECT grade FROM enrolment WHERE course_id = 'C10');
-- La trampa de NOT IN: las notas que nadie ha sacado en Python (C11)...
SELECT student_id, course_id, grade
FROM enrolment
WHERE grade NOT IN (SELECT grade FROM enrolment WHERE course_id = 'C11');
-- ...dejan de funcionar en cuanto una nota de Python es NULL
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
      title: 'Subconsultas correlacionadas y EXISTS',
      summary: 'Una subconsulta **correlacionada** usa una columna de la consulta exterior, así que se vuelve a evaluar para **cada fila exterior**. **EXISTS** pregunta si una subconsulta devuelve al menos una fila; **NOT EXISTS**, si no devuelve ninguna.',
      figure: { kind: 'correlated-loop' },
      caption: 'La consulta interior se vuelve a ejecutar con el id de cada fila exterior.',
      body: [
        'Una subconsulta correlacionada es un tutor que recorre la lista de clase y, para cada estudiante, abre el expediente de ese estudiante: la pregunta interior cambia en cada fila. En `WHERE e.grade > (SELECT AVG(x.grade) FROM enrolment x WHERE x.course_id = e.course_id)` la media es la de **la asignatura de esa fila**: quién ha superado la media de su propia clase.',
        '`EXISTS (subconsulta)` es cierto en cuanto la subconsulta encuentra una fila; lo que selecciona da igual, por eso se suele escribir `SELECT 1`. `NOT EXISTS` encuentra lo que **no** tiene filas relacionadas: asignaturas sin matrículas, clientes sin pedidos. A diferencia de NOT IN, no se deja engañar por los NULL.',
        '**El primero de cada grupo**: la mejor nota de cada asignatura es `WHERE e.grade = (SELECT MAX(x.grade) FROM enrolment x WHERE x.course_id = e.course_id)`. Los empates devuelven varias filas, que suele ser lo que quieres.',
      ],
      points: [
        'Da a la tabla interior su propio alias (`x`), para que quede claro qué columnas son de la fila exterior (`e`).',
        'EXISTS puede parar en la primera coincidencia, y el optimizador suele convertir EXISTS e IN en combinaciones de todos modos.',
        'NOT EXISTS es la forma segura de escribir «no tiene ningún …»; NOT IN falla con los NULL.',
      ],
      example: 'Los estudiantes no matriculados en Statistics: `SELECT name FROM student s WHERE NOT EXISTS (SELECT 1 FROM enrolment e WHERE e.student_id = s.student_id AND e.course_id = \'C20\')`.',
      mistake: 'Olvidar la condición de correlación (`e.course_id = c.course_id`). La subconsulta ignora entonces la fila exterior, y EXISTS es cierto (o falso) para todas las filas a la vez.',
      sql: {
        setup: SCHOOL,
        query: `-- Quién ha superado la media de su propia asignatura
SELECT e.student_id, e.course_id, e.grade
FROM enrolment e
WHERE e.grade > (SELECT AVG(x.grade) FROM enrolment x WHERE x.course_id = e.course_id)
ORDER BY e.course_id;
-- Asignaturas con al menos una matrícula, y asignaturas sin ninguna
SELECT c.title FROM course c
WHERE EXISTS (SELECT 1 FROM enrolment e WHERE e.course_id = c.course_id);
SELECT c.title FROM course c
WHERE NOT EXISTS (SELECT 1 FROM enrolment e WHERE e.course_id = c.course_id);
-- El primero de cada grupo: la mejor nota de cada asignatura
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
      title: 'Operadores de conjuntos: UNION, INTERSECT y MINUS',
      summary: 'Los operadores de conjuntos combinan los **resultados** de dos consultas: **UNION** (filas de cualquiera de las dos), **INTERSECT** (filas de ambas) y **MINUS** (filas de la primera que no están en la segunda). **UNION ALL** conserva los duplicados.',
      figure: { kind: 'set-venn' },
      caption: 'Los operadores de conjuntos comparan filas completas del resultado: aquí, los id de los estudiantes de dos asignaturas.',
      body: [
        'Piensa en las listas de invitados de dos personas que organizan juntas una fiesta. UNION es todo el que ha invitado cualquiera de las dos (cada nombre una vez); UNION ALL grapa las dos listas, con los nombres repetidos; INTERSECT son los invitados de ambas; MINUS es a quién invitó la primera y no la segunda.',
        'Las dos consultas deben ser **compatibles**: el mismo número de columnas, de tipos compatibles y en el mismo orden. Los nombres de las columnas del resultado son los de la **primera** consulta.',
        '`ORDER BY` va una sola vez, **al final**, y ordena el resultado combinado con los nombres de columna (o alias) de la primera consulta. UNION, INTERSECT y MINUS eliminan duplicados, lo que cuesta una ordenación; UNION ALL no, así que es más rápido cuando los duplicados son imposibles o se quieren conservar.',
      ],
      points: [
        'Oracle llama **MINUS** a la diferencia; el estándar y otros SGBD la llaman EXCEPT (las versiones recientes de Oracle aceptan las dos, y MINUS funciona en todas).',
        'Los operadores de conjuntos comparan filas completas, y aquí dos NULL cuentan como iguales.',
        'Para poner columnas de dos tablas una al lado de otra hace falta un JOIN; los operadores de conjuntos apilan filas.',
      ],
      example: 'Los estudiantes de Databases o de Statistics: `SELECT student_id FROM enrolment WHERE course_id = \'C10\' UNION SELECT student_id FROM enrolment WHERE course_id = \'C20\'`.',
      mistake: 'Escribir un ORDER BY dentro de la primera consulta de un UNION. Oracle falla con ORA-00933 (SQL command not properly ended): ordena una sola vez, tras la última consulta.',
      sql: {
        setup: SCHOOL,
        query: `-- Estudiantes de Databases (C10) y de Python (C11)
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
-- Una sola lista de nombres de dos tablas, ordenada una vez al final
SELECT name, 'student' AS kind FROM student
UNION
SELECT name, 'department' FROM department
ORDER BY name;`,
      },
    },

    /* ───────────── Funciones ───────────── */
    {
      id: 'text-functions',
      hub: 'functions',
      topic: 'functions',
      title: 'Funciones de texto',
      summary: 'Las **funciones de una fila** transforman un valor por fila. Las de **texto** cambian mayúsculas y minúsculas, recortan, buscan, miden, quitan espacios, rellenan y sustituyen cadenas; `||` las concatena.',
      body: [
        'Las funciones de texto son los botones «cambiar mayúsculas», «buscar y reemplazar» y «quitar espacios» de un procesador de textos, aplicados a toda una columna. `UPPER(name)`, `LOWER(email)` e `INITCAP(\'ana RUIZ\')` (Ana Ruiz) arreglan las mayúsculas; también son la forma de comparar texto sin distinguir mayúsculas: `WHERE UPPER(name) = \'ANA RUIZ\'`.',
        '`SUBSTR(texto, inicio, longitud)` recorta un trozo (las posiciones empiezan en 1; un inicio negativo cuenta desde el final). `INSTR(texto, \'@\')` devuelve la posición de la primera `@` (0 si no hay; los argumentos opcionales indican la posición de inicio y la aparición). `LENGTH` cuenta los caracteres. Juntas separan un correo en usuario y dominio.',
        '`TRIM` quita los espacios del principio y del final (`TRIM(LEADING \'0\' FROM code)` quita otros caracteres; LTRIM y RTRIM trabajan por un solo lado). `LPAD(x, 4, \'0\')` y `RPAD` rellenan hasta un ancho fijo, como en `0010`. `REPLACE(texto, \'viejo\', \'nuevo\')` sustituye todas las apariciones.',
      ],
      points: [
        'Las funciones se pueden anidar; la más interior se ejecuta primero: `UPPER(SUBSTR(name, 1, 1))`.',
        'En Oracle `LENGTH(\'\')` es NULL, no 0, porque la cadena vacía es NULL.',
        'Una función sobre una columna en el WHERE puede impedir que se use un índice (mira las tarjetas de Eficiencia).',
      ],
      example: '`SUBSTR(email, INSTR(email, \'@\') + 1)` devuelve el dominio de un correo: `uni.es`.',
      mistake: 'Contar las posiciones desde 0. En Oracle el primer carácter es la posición 1: `SUBSTR(\'Oracle\', 1, 3)` es `Ora`.',
      sql: {
        setup: SCHOOL,
        query: `SELECT name,
       UPPER(name) AS shouting,
       LOWER(name) AS quiet,
       LENGTH(name) AS letters,
       SUBSTR(name, 1, INSTR(name, ' ') - 1) AS first_name
FROM student;
-- Separar un correo en usuario y dominio
SELECT email,
       INITCAP(SUBSTR(email, 1, INSTR(email, '@') - 1)) AS user_part,
       SUBSTR(email, INSTR(email, '@') + 1) AS domain,
       REPLACE(email, 'uni.es', 'cunef.edu') AS new_email
FROM student
WHERE email IS NOT NULL;
-- Rellenar y concatenar: un índice con puntos guía
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
      title: 'Funciones numéricas y de fecha',
      summary: '**ROUND**, **TRUNC**, **MOD**, **CEIL** y **FLOOR** dan forma a los números. **SYSDATE**, la aritmética de fechas, **ADD_MONTHS**, **MONTHS_BETWEEN** y **EXTRACT** trabajan con fechas.',
      body: [
        'Redondear es lo que hace la caja registradora con los céntimos: `ROUND(7.456, 2)` es 7,46, mientras que `TRUNC(7.456, 2)` simplemente corta en 7,45. `CEIL` siempre sube (`CEIL(11.25)` es 12: las semanas que necesitas para 112,5 horas a 10 por semana) y `FLOOR` siempre baja. `MOD(17, 5)` es el resto, 2: útil para «una de cada tres filas» o «¿es par?».',
        'En Oracle un `DATE` guarda una fecha **y** una hora, y `SYSDATE` es ahora mismo. Las fechas funcionan como un calendario en el que cuentas: `fecha + 7` es una semana después y `fecha1 - fecha2` es el **número de días** entre ellas. Los meses tienen longitudes distintas, así que para ellos usa `ADD_MONTHS(fecha, n)` y `MONTHS_BETWEEN(posterior, anterior)`.',
        '`EXTRACT(YEAR FROM fecha)` (también MONTH y DAY) devuelve una parte como número. `TRUNC(fecha)` quita la hora, y `TRUNC(fecha, \'MM\')` vuelve al primer día del mes.',
      ],
      points: [
        '`ADD_MONTHS(DATE \'2026-01-31\', 1)` es el 28 de febrero: Oracle te mantiene en el final de mes.',
        '`MONTHS_BETWEEN` devuelve una fracción; envuélvelo en TRUNC o ROUND para tener meses enteros.',
        'Los literales de fecha se escriben `DATE \'2026-09-14\'`, siempre año-mes-día.',
      ],
      example: 'Los días que quedan para el final del cuatrimestre: `DATE \'2027-01-22\' - TRUNC(SYSDATE)`.',
      mistake: 'Sumar 30 días para «pasar al mes siguiente». Los meses tienen de 28 a 31 días: usa `ADD_MONTHS`.',
      sql: {
        setup: SCHOOL,
        query: `SELECT ROUND(7.456, 2) AS round_2, TRUNC(7.456, 2) AS trunc_2, ROUND(7.5) AS round_0,
       CEIL(4.1) AS up, FLOOR(4.9) AS down, MOD(17, 5) AS remainder
FROM dual;
-- Semanas completas de estudio a 10 horas por semana (1 crédito ECTS = 25 horas)
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
      title: 'Conversión, funciones para NULL, CASE y DECODE',
      summary: '**TO_CHAR**, **TO_DATE** y **TO_NUMBER** convierten entre texto, fechas y números con un **modelo de formato**. **NVL**, **NVL2** y **COALESCE** sustituyen los NULL, y **CASE** (o **DECODE**, propio de Oracle) elige un valor según condiciones.',
      body: [
        'Un modelo de formato es como explicarle a un amigo cómo leer una fecha: «09/10/2026» es el 9 de octubre en España y el 10 de septiembre en Estados Unidos. `TO_DATE(\'15/09/2026\', \'DD/MM/YYYY\')` dice cómo **leer** el texto; `TO_CHAR(fecha, \'DD/MM/YYYY\')` dice cómo **escribir** la fecha. Elementos habituales: `YYYY`, `MM`, `DD`, `HH24`, `MI`, `SS`, `Month`, `Day`; para números, `9` (un dígito), `0` (un dígito que se muestra aunque sea cero), `.` y `FM` (sin espacios de relleno).',
        '`NVL(x, y)` devuelve y cuando x es NULL. `NVL2(x, a, b)` devuelve a cuando x **no** es NULL y b cuando lo es. `COALESCE(x, y, z, …)` devuelve el primer valor que no es NULL.',
        '`CASE` es el «si … entonces … si no» de SQL. La forma **buscada** prueba sus condiciones en orden y devuelve la primera que es cierta: `CASE WHEN grade >= 9 THEN \'A\' WHEN grade >= 7 THEN \'B\' … ELSE \'F\' END`. `DECODE(x, v1, r1, v2, r2, por_defecto)` es el atajo antiguo de Oracle para un CASE que solo compara x por igualdad.',
      ],
      points: [
        'Para comparar fechas usa `TO_DATE` o un literal `DATE \'…\'`; no confíes nunca en una conversión implícita de texto a fecha.',
        'Un CASE sin ELSE que no encaja con nada devuelve NULL.',
        'Todas las ramas de un CASE deben devolver el mismo tipo.',
      ],
      example: '`CASE WHEN grade >= 5 THEN \'pass\' ELSE \'fail\' END` convierte cada nota en un resultado que entiende cualquiera.',
      mistake: 'Ordenar mal las cláusulas WHEN. `WHEN grade >= 5 THEN \'pass\' WHEN grade >= 9 THEN \'distinction\'` nunca dice distinction, porque gana la primera rama cierta: pon primero la condición más estricta.',
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

    /* ───────────── Lenguajes de SQL ───────────── */
    {
      id: 'sql-languages',
      hub: 'languages',
      topic: 'languages',
      title: 'Los sublenguajes de SQL',
      summary: 'SQL es un solo lenguaje con varios **sublenguajes**, agrupados según lo que hace cada sentencia: definir la estructura, trabajar con los datos, controlar quién puede hacer qué y agrupar los cambios en transacciones.',
      figure: { kind: 'sql-families' },
      caption: 'Cada sublenguaje actúa sobre algo distinto.',
      body: [
        'Cada sentencia que escribes pertenece a un grupo. El SGBD los trata de forma distinta: una sentencia DDL cambia el **diccionario de datos** (el esquema), una DML lee o cambia **filas**, una DCL cambia **permisos** y TCL decide cuándo un conjunto de cambios pasa a ser permanente.',
        'En español también se usan las siglas **LDD** (lenguaje de definición de datos), **LMD** (de manipulación), **LCD** (de control) y **LCT** (de control de transacciones). En este curso usamos las siglas inglesas: DDL, DML, DCL y TCL.',
        'Algunos libros separan SELECT de DML como **DQL** (lenguaje de consulta de datos), porque solo lee. En este curso SELECT forma parte de DML.',
      ],
      table: {
        caption: 'Los cuatro grupos',
        head: ['Sublenguaje', 'Sentencias', 'Sobre qué actúa'],
        rows: [
          ['**DDL** · definición de datos', '`CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME`', 'El esquema: tablas, columnas, restricciones, índices, vistas'],
          ['**DML** · manipulación de datos', '`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `MERGE`', 'Las filas almacenadas en las tablas'],
          ['**DCL** · control de datos', '`GRANT`, `REVOKE`', 'Usuarios, roles y sus privilegios'],
          ['**TCL** · control de transacciones', '`BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`', 'Cuándo los cambios pasan a ser permanentes o se deshacen'],
        ],
      },
      example: '`CREATE TABLE student (…)` es DDL; `INSERT INTO student VALUES (…)` es DML; `GRANT SELECT ON student TO teacher` es DCL; `COMMIT` es TCL.',
      mistake: 'Pensar que `TRUNCATE` es lo mismo que `DELETE` sin WHERE. `TRUNCATE` es DDL: vacía la tabla de golpe, normalmente no admite filtro y en muchos SGBD confirma la transacción de forma implícita.',
    },
    {
      id: 'ddl',
      video: 'sql-ddl',
      hub: 'languages',
      topic: 'languages',
      title: 'DDL: definir el esquema',
      summary: '**CREATE** crea un objeto, **ALTER** lo modifica y **DROP** lo elimina, datos incluidos. Con DDL el modelo lógico se convierte en tablas reales.',
      body: [
        'Un `CREATE TABLE` enumera las columnas con sus **tipos** y las **restricciones** que debe cumplir cada fila: clave primaria, claves ajenas, NOT NULL, UNIQUE, CHECK. Al escribirlas en el esquema, el SGBD las hace cumplir a todos los programas que usan los datos.',
        '`ALTER TABLE` añade o quita columnas y restricciones en una tabla que ya tiene datos. `DROP TABLE` borra la definición y todas sus filas. Ejecuta el ejemplo y fíjate en `USER_TABLES` tras el DROP: la tabla ya no existe.',
        'En Oracle cada sentencia DDL **confirma** la transacción abierta antes y después de ejecutarse, así que un DDL no se puede deshacer con ROLLBACK.',
      ],
      points: [
        'Tipos de Oracle: `VARCHAR2(n)` para texto, `NUMBER(p, s)` para todos los números, `DATE` (también guarda la hora), `TIMESTAMP`, `CLOB`, `BLOB`. Desde 23ai existe también `BOOLEAN`.',
        'Las claves autonuméricas usan `GENERATED ALWAYS AS IDENTITY`; no existe AUTOINCREMENT.',
        'Cada sentencia DDL actualiza el diccionario de datos, que se puede consultar: `USER_TABLES`, `USER_TAB_COLUMNS`, `USER_INDEXES`, `USER_CONSTRAINTS`.',
      ],
      mistake: 'Borrar y volver a crear una tabla para cambiar una columna. `ALTER TABLE` conserva las filas; `DROP` las pierde.',
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
      title: 'CREATE TABLE paso a paso',
      summary: 'Un **CREATE TABLE** da a cada columna un nombre, un **tipo** y sus **restricciones**. Una restricción se puede escribir junto a su columna (**en línea**) o tras la última columna (**fuera de línea**), donde puede abarcar varias columnas.',
      body: [
        'Crear una tabla es como diseñar un formulario en papel antes de que nadie lo rellene: cada casilla tiene una etiqueta (la columna), un tipo de respuesta (el tipo: texto, número, fecha) y unas reglas («obligatorio», «uno de estos valores», «debe ser un equipo que exista»). Cada formulario relleno es una fila.',
        'Tipos: `VARCHAR2(n)` para texto de hasta n caracteres, `NUMBER(p, s)` para números de p dígitos, s de ellos decimales (`NUMBER(5,2)` llega hasta 999,99), `DATE` para fechas y `CHAR(n)` para códigos de longitud fija. Las restricciones **en línea** siguen a su columna (`team_id NUMBER(4) PRIMARY KEY`); las de **fuera de línea** van tras la última columna y son obligatorias para claves compuestas (`CONSTRAINT uq_team_shirt UNIQUE (team_id, shirt)`).',
        'Crea primero la tabla **padre**: una clave ajena solo puede apuntar a una tabla (y a su clave primaria o a una columna UNIQUE) que ya exista. Para borrar se va al revés: primero las hijas.',
      ],
      points: [
        'Pon nombre a tus restricciones (`CONSTRAINT fk_player_team …`): los mensajes de error y el diccionario de datos muestran entonces un nombre legible en lugar de algo como `SYS_C008123`.',
        'Una columna de clave ajena tiene el mismo tipo que la clave a la que apunta.',
        'En Oracle `DEFAULT` va antes de `NOT NULL`: `pos CHAR(1) DEFAULT \'M\' NOT NULL`.',
      ],
      example: '`team` es la tabla padre y `player` la hija: cada jugador pertenece a un equipo que existe, y un dorsal no se puede repetir dentro del mismo equipo.',
      mistake: 'Crear la tabla hija antes que su padre. Su FOREIGN KEY falla con ORA-00942 (table or view does not exist), porque la tabla referenciada aún no está.',
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
INSERT INTO player (full_name, shirt, team_id) VALUES ('Nobody', 7, 99);   -- el equipo 99 no existe`,
      },
    },
    {
      id: 'alter-drop',
      video: 'sql-delete',
      hub: 'languages',
      topic: 'languages',
      title: 'ALTER, DROP y TRUNCATE',
      summary: '**ALTER TABLE** cambia una tabla que ya tiene datos: añade, modifica, renombra o elimina columnas y restricciones. **DROP TABLE** elimina la tabla; **TRUNCATE** la vacía y conserva su estructura.',
      body: [
        'ALTER es reformar una casa con la gente viviendo dentro: puedes añadir una habitación (ADD), ampliar otra (MODIFY), cambiar el rótulo de una puerta (RENAME COLUMN) o tirar un tabique (DROP COLUMN), y los muebles, las filas, se quedan. MODIFY tiene que respetar los datos que ya hay: no puedes acortar una columna por debajo de su valor más largo ni hacerla NOT NULL mientras haya filas con NULL.',
        '`DROP TABLE` manda la tabla a la **papelera de reciclaje** de Oracle, como la papelera de tu escritorio: `FLASHBACK TABLE x TO BEFORE DROP` la recupera. `DROP TABLE x PURGE` se salta la papelera: desaparece para siempre. Si otras tablas la referencian, `CASCADE CONSTRAINTS` elimina también sus claves ajenas.',
        '`TRUNCATE TABLE` vacía una tabla de golpe. Es DDL, así que confirma la transacción y **no se puede deshacer**; no dispara disparadores y es muy rápido. `DELETE` sin WHERE elimina las mismas filas una a una, se puede deshacer y dispara los disparadores. Ejecuta el ejemplo: ROLLBACK deshace el DELETE, pero no el TRUNCATE.',
      ],
      points: [
        '`ADD`, `RENAME COLUMN` y `DROP COLUMN` funcionan en la simulación del navegador; `MODIFY`, `ADD CONSTRAINT` y la papelera, solo en FreeSQL (el script estático de abajo).',
        '`ALTER TABLE … ADD CONSTRAINT` comprueba antes las filas que ya existen: falla si alguna incumple la regla.',
        'Cada ALTER, DROP y TRUNCATE confirma la transacción abierta.',
      ],
      example: '`ALTER TABLE member ADD (email VARCHAR2(60))` añade una columna a una tabla que ya tiene socios: su email es NULL hasta que alguien lo rellene.',
      dialect: 'Oracle · ejecútalo en FreeSQL',
      code: `DROP TABLE IF EXISTS member PURGE;
CREATE TABLE member (
  member_id NUMBER(4) PRIMARY KEY,
  full_name VARCHAR2(40) NOT NULL,
  email     VARCHAR2(60)
);
INSERT INTO member VALUES (1, 'Ana Ruiz', 'ana@uni.es');
INSERT INTO member VALUES (2, 'Luis Gil', 'luis@uni.es');
COMMIT;

ALTER TABLE member MODIFY (full_name VARCHAR2(80));         -- alarga la columna
ALTER TABLE member MODIFY (email NOT NULL);                  -- funciona: todas las filas tienen email
ALTER TABLE member ADD CONSTRAINT uq_member_email UNIQUE (email);
ALTER TABLE member DROP CONSTRAINT uq_member_email;

DROP TABLE member;                                           -- a la papelera de reciclaje
SELECT object_name, original_name FROM user_recyclebin;
FLASHBACK TABLE member TO BEFORE DROP;                       -- vuelve, con sus filas
SELECT * FROM member;
DROP TABLE member PURGE;                                     -- desaparece para siempre`,
      mistake: 'Usar TRUNCATE «para probar algo» con datos reales. No se puede deshacer; ante la duda, usa DELETE y comprueba antes del COMMIT.',
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
-- DELETE se puede deshacer...
DELETE FROM member;
ROLLBACK;
SELECT COUNT(*) AS after_delete_and_rollback FROM member;
-- ...TRUNCATE no: es DDL y confirma
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
      title: 'DML: leer y modificar filas',
      summary: '**SELECT** lee, **INSERT** añade filas, **UPDATE** las modifica y **DELETE** las elimina. UPDATE y DELETE afectan a **todas las filas** que cumplen el WHERE.',
      body: [
        'Un SELECT se evalúa en un orden lógico fijo: `FROM` y `JOIN` construyen las filas, `WHERE` las filtra, `GROUP BY` las agrupa, `HAVING` filtra los grupos, `SELECT` elige las columnas y `ORDER BY` ordena el resultado.',
        'UPDATE y DELETE sin WHERE modifican la tabla entera. Antes de ejecutar uno, escribe el mismo WHERE en un SELECT y comprueba qué filas devuelve.',
        'En Oracle los cambios de INSERT, UPDATE y DELETE quedan **sin confirmar** hasta que ejecutas `COMMIT`; las demás sesiones aún no los ven.',
      ],
      points: [
        'Las combinaciones (JOIN) siguen las claves ajenas: `enrolment.course_id = course.course_id`.',
        'El ejecutor muestra cuántas filas ha cambiado cada INSERT, UPDATE o DELETE.',
        'Para quedarte con las primeras filas de un resultado usa `FETCH FIRST n ROWS ONLY`; Oracle no tiene `LIMIT`.',
      ],
      example: 'La nota media por asignatura es `SELECT course_id, AVG(grade) FROM enrolment GROUP BY course_id`.',
      mistake: 'Filtrar un agregado con WHERE (`WHERE AVG(grade) > 7`). WHERE se aplica antes de agrupar; usa `HAVING AVG(grade) > 7`.',
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
      title: 'INSERT en la práctica',
      summary: '**INSERT** añade filas. Nombra las columnas que rellenas, deja que las columnas con **DEFAULT** e **identidad** se rellenen solas, añade varias filas en una sentencia o copia las filas de una consulta con **INSERT … SELECT**.',
      body: [
        'Insertar es rellenar el formulario diseñado con CREATE TABLE. Escribir la **lista de columnas** es como poner cada respuesta junto a su etiqueta: `INSERT INTO student (student_id, name) VALUES (\'S04\', \'Marta Paz\')` sigue funcionando si alguien añade una columna o cambia su orden, y cada columna que omites recibe su DEFAULT, o NULL.',
        'Varias filas a la vez: Oracle 23ai admite `VALUES (…), (…), (…)` (las versiones anteriores necesitan un INSERT por fila, o `INSERT ALL`). `INSERT INTO t (columnas) SELECT …` copia las filas que devuelve una consulta, sin VALUES: para llenar un archivo histórico, un resumen o un cuadro de honor.',
        'Una columna de **identidad** (`GENERATED ALWAYS AS IDENTITY`) numera las filas sola: déjala fuera de la lista. En FreeSQL también puedes escribir la palabra `DEFAULT` como valor (`VALUES (\'S05\', DEFAULT)`); omitir la columna hace lo mismo y además funciona en la simulación.',
      ],
      points: [
        'El texto y las fechas van entre comillas, los números sin ellas: `\'S04\'`, `DATE \'2026-09-14\'`, `6.5`.',
        'Un INSERT que incumple una restricción se rechaza entero: si lleva varias filas, no se inserta ninguna.',
        'Las filas nuevas no son permanentes hasta el COMMIT.',
      ],
      example: 'El cuadro de honor: `INSERT INTO honours (student_id, course_id) SELECT student_id, course_id FROM enrolment WHERE grade >= 8.5` copia los mejores resultados; el identificador y la fecha se rellenan solos.',
      mistake: 'Omitir la lista de columnas: `INSERT INTO student VALUES (\'S04\', \'Marta Paz\')` falla con ORA-00947 (not enough values), y todo INSERT escrito así se rompe cuando la tabla gana una columna.',
      sql: {
        setup: SCHOOL,
        query: `INSERT INTO student (student_id, name) VALUES ('S04', 'Marta Paz');
SELECT * FROM student;
-- Varias filas en una sentencia (Oracle 23ai)
INSERT INTO course (course_id, title, credits, dept_id) VALUES
  ('C40', 'Cloud computing', 6, 'D01'),
  ('C41', 'Ethics', 3, 'D02');
SELECT * FROM course;
-- INSERT ... SELECT: la columna de identidad y el DEFAULT se rellenan solos
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
      title: 'UPDATE y DELETE en la práctica',
      summary: '**UPDATE** cambia columnas de las filas que cumplen su WHERE, con valores que pueden ser expresiones o subconsultas. **DELETE** elimina las filas que lo cumplen. Antes de ejecutar cualquiera de los dos, ejecuta su WHERE como un SELECT.',
      body: [
        'Un UPDATE es un profesor corrigiendo el cuaderno de notas: primero localiza las líneas correctas (WHERE) y luego escribe el valor nuevo (SET). El valor nuevo puede usar el antiguo (`SET grade = grade + 0.5`), cambiar varias columnas a la vez (`SET a = …, b = …`) o salir de una **subconsulta** (`SET credits = (SELECT credits FROM course WHERE course_id = \'C10\')`). El WHERE también puede usar subconsultas: «todas las matrículas de una asignatura de Computing».',
        '**El hábito que te salva**: escribe primero el WHERE en un SELECT. `SELECT * FROM enrolment WHERE …` muestra exactamente las filas que tocará el UPDATE o el DELETE. Cuando la lista sea la correcta, cambia `SELECT *` por `UPDATE … SET …` o por `DELETE`, y deja el WHERE tal cual.',
        'DELETE elimina filas enteras, nunca columnas sueltas (para vaciar una columna, haz un UPDATE a NULL). Las claves ajenas siguen aplicándose: borrar un padre con hijas falla salvo que la clave ajena diga ON DELETE CASCADE.',
      ],
      points: [
        'El ejecutor muestra cuántas filas ha cambiado cada sentencia: compáralo con las filas que devolvió el SELECT.',
        '`LEAST(grade + 0.5, 10)` sube una nota sin pasar del máximo; `GREATEST` hace lo contrario.',
        'Hasta el COMMIT, ROLLBACK todavía puede deshacer un UPDATE o un DELETE equivocado.',
      ],
      example: '`UPDATE course SET credits = credits * 1.5 WHERE dept_id = \'D02\'` multiplica por 1,5 los créditos de todas las asignaturas de Maths.',
      mistake: 'Ejecutar un UPDATE o un DELETE sin WHERE, o con un WHERE que nunca has probado. `UPDATE enrolment SET grade = 10` pone un 10 a todo el mundo.',
      sql: {
        setup: SCHOOL,
        query: `-- 1. Ejecuta el WHERE como SELECT: ¿qué filas cambiarán?
SELECT * FROM enrolment
WHERE course_id IN (SELECT course_id FROM course WHERE dept_id = 'D01')
  AND grade < 7;
-- 2. El mismo WHERE en el UPDATE: +0,5, nunca por encima de 10
UPDATE enrolment
SET grade = LEAST(grade + 0.5, 10)
WHERE course_id IN (SELECT course_id FROM course WHERE dept_id = 'D01')
  AND grade < 7;
-- Un valor sacado de una subconsulta: Marketing pasa a tener los créditos de Databases
UPDATE course
SET credits = (SELECT credits FROM course WHERE course_id = 'C10')
WHERE course_id = 'C30';
-- DELETE con una subconsulta: las matrículas de todas las asignaturas de Maths
DELETE FROM enrolment
WHERE course_id IN (SELECT course_id FROM course WHERE dept_id = 'D02');
SELECT * FROM enrolment ORDER BY student_id, course_id;
SELECT course_id, title, credits FROM course;
-- ¿No te convence? Deshazlo todo
ROLLBACK;`,
      },
    },
    {
      id: 'dcl',
      hub: 'languages',
      topic: 'languages',
      title: 'DCL: usuarios, roles y privilegios',
      summary: '**GRANT** concede un privilegio sobre un objeto a un usuario o rol; **REVOKE** lo retira. Da a cada rol solo lo que necesita: el **principio de mínimo privilegio**.',
      body: [
        'Los privilegios son acciones sobre objetos: `SELECT`, `INSERT`, `UPDATE`, `DELETE` sobre una tabla o vista, `EXECUTE` sobre una función, `CREATE` en un esquema. Concédelos a **roles** (profesor, secretaría, aplicación de informes) en lugar de a cada persona, y haz a los usuarios miembros de esos roles.',
        'Una **vista** más un GRANT es una forma clásica de ocultar datos: el rol de informes puede leer una vista con las medias por asignatura, pero no la tabla con las notas de cada estudiante.',
        'El entorno del navegador tiene un solo usuario, así que este ejemplo no se puede ejecutar aquí. En FreeSQL trabajas en tu propio esquema: prueba los GRANT sobre tus tablas, pero crear usuarios requiere una cuenta de administrador.',
      ],
      points: [
        '`WITH GRANT OPTION` permite a quien lo recibe conceder ese mismo privilegio a otros; úsalo con moderación.',
        'REVOKE retira el privilegio a ese rol; sus miembros lo pierden salvo que otro rol se lo siga concediendo.',
        'Oracle nombra los objetos como `esquema.tabla`: `GRANT SELECT ON hr.enrolment TO teacher` se refiere a la tabla del esquema `hr`.',
      ],
      dialect: 'Oracle · no se ejecuta aquí',
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
GRANT SELECT ON course_average TO reporting;      -- sin acceso a las notas individuales

REVOKE UPDATE ON enrolment FROM teacher;`,
      mistake: 'Dejar que la aplicación se conecte como propietaria de la base de datos. Un fallo o una inyección SQL puede entonces borrar tablas; con un rol limitado a DML sobre sus tablas, no puede.',
    },
    {
      id: 'tcl',
      hub: 'languages',
      topic: 'languages',
      title: 'TCL: transacciones',
      summary: 'Una **transacción** agrupa sentencias que deben tener éxito o fallar juntas. **COMMIT** las confirma (las hace permanentes), **ROLLBACK** las deshace y un **SAVEPOINT** (punto de guardado) marca un punto al que se puede volver.',
      figure: { kind: 'tx-timeline' },
      caption: 'ROLLBACK TO SAVEPOINT deshace solo el trabajo posterior a la marca; COMMIT hace permanente el resto.',
      body: [
        'Las transacciones proporcionan las propiedades ACID de la sección de Teoría: atomicidad (todo o nada), consistencia (las restricciones se cumplen al confirmar), aislamiento (los demás no ven el trabajo a medias) y durabilidad (un cambio confirmado sobrevive a una caída).',
        'En Oracle **no existe BEGIN**: la transacción se abre sola con tu primer INSERT, UPDATE o DELETE y dura hasta el `COMMIT` o el `ROLLBACK`. (En Oracle, `BEGIN` inicia un bloque PL/SQL.) Una sentencia DDL confirma de forma implícita, y también lo hace la salida normal del cliente.',
        'En el ejemplo, cambiar a un estudiante de una asignatura a otra es un borrado más una inserción: deben ocurrir las dos, o ninguna.',
      ],
      points: [
        '`SAVEPOINT nombre` … `ROLLBACK TO SAVEPOINT nombre` deshace solo el trabajo posterior al punto de guardado.',
        'Mantén las transacciones cortas: mientras una está abierta, puede retener bloqueos que hacen esperar a las demás.',
        'En Oracle los lectores nunca bloquean a los escritores (conserva versiones antiguas de las filas) y, por defecto, una consulta ve los datos confirmados en el momento en que empezó.',
      ],
      example: 'El segundo bloque cambia una nota por error y vuelve al punto de guardado: el cambio de asignatura se conserva, la nota errónea no.',
      mistake: 'Ejecutar un DDL en mitad de una transacción y esperar poder deshacer. Una sentencia DDL confirma todo lo anterior, así que los cambios previos ya no se pueden deshacer.',
      sql: {
        setup: SCHOOL,
        query: `DELETE FROM enrolment WHERE student_id = 'S03' AND course_id = 'C11';
INSERT INTO enrolment VALUES ('S03', 'C20', NULL);
SAVEPOINT before_grades;
UPDATE enrolment SET grade = 10;              -- ¡uy!: todas las filas
ROLLBACK TO SAVEPOINT before_grades;
COMMIT;
SELECT * FROM enrolment WHERE student_id = 'S03';
DELETE FROM enrolment;
SELECT COUNT(*) AS rows_inside_transaction FROM enrolment;
ROLLBACK;
SELECT COUNT(*) AS rows_after_rollback FROM enrolment;`,
      },
    },

    /* ───────────── Restricciones ───────────── */
    {
      id: 'keys-unique',
      video: 'sql-keys',
      hub: 'constraints',
      topic: 'constraints',
      title: 'PRIMARY KEY, UNIQUE y NOT NULL',
      summary: 'La **clave primaria** identifica cada fila: única y nunca NULL. **UNIQUE** prohíbe duplicados en otras claves candidatas y **NOT NULL** hace obligatoria una columna.',
      body: [
        'Son las claves del modelo lógico escritas en el esquema. El SGBD las comprueba en cada INSERT y UPDATE y rechaza la sentencia que las incumpla, sea cual sea el programa que la envía.',
        'Una tabla tiene una sola clave primaria, pero puede tener varias restricciones UNIQUE: el identificador del estudiante es la clave y el correo electrónico también es único. En SQL estándar, UNIQUE admite varios NULL, porque NULL no es igual a nada y por tanto no cuenta como duplicado.',
        'El SGBD crea un índice para cada clave primaria y cada restricción UNIQUE, porque lo necesita para comprobar duplicados con rapidez.',
      ],
      points: [
        'Clave compuesta: `PRIMARY KEY (student_id, course_id)`.',
        'La última sentencia del ejemplo falla a propósito: lee el mensaje de error.',
      ],
      mistake: 'Usar solo un identificador artificial y olvidar la clave natural. Con `id` como PK y sin `UNIQUE (email)`, el mismo estudiante se puede insertar dos veces.',
      sql: {
        setup: SCHOOL,
        expectError: true,
        query: `INSERT INTO student VALUES ('S04', 'Marta Paz', NULL);   -- se admite un segundo correo NULL
SELECT * FROM student;
INSERT INTO student VALUES ('S05', 'Ana Ruiz', 'ana@uni.es');  -- correo duplicado`,
      },
    },
    {
      id: 'foreign-keys',
      hub: 'constraints',
      topic: 'constraints',
      title: 'FOREIGN KEY y acciones referenciales',
      summary: 'Una **clave ajena** solo acepta valores que existen en la clave referenciada. Su **acción referencial** indica qué ocurre con las filas hijas cuando se borra la fila padre o cambia su clave.',
      body: [
        'La clave ajena mantiene válidas las referencias (**integridad referencial**): una matrícula no puede apuntar a una asignatura que no existe.',
        'Al borrar la fila padre, la acción decide. En Oracle eliges entre `ON DELETE CASCADE` (se borran también las hijas), `ON DELETE SET NULL` (la clave ajena de las hijas pasa a NULL) y no escribir nada, lo que rechaza el borrado mientras haya hijas (error ORA-02292).',
        'Oracle no tiene acción `ON UPDATE` ni las palabras `RESTRICT` o `SET DEFAULT`: otros SGBD (PostgreSQL, MySQL) sí. De todos modos, las claves primarias no deberían cambiar.',
        'En el esquema de ejemplo, borrar un estudiante borra en cascada sus matrículas, pero no se puede borrar una asignatura que tiene matrículas.',
      ],
      points: [
        'CASCADE encaja con partes que no tienen sentido solas (una matrícula sin su estudiante, una línea de pedido sin su pedido).',
        'Sin acción (la opción por defecto) protege los datos de referencia (una asignatura, un departamento).',
        'Insertar una fila hija sin padre falla con ORA-02291 (clave padre no encontrada); borrar un padre con hijas falla con ORA-02292 (registro hijo encontrado).',
      ],
      mistake: 'Usar CASCADE en todas partes. Borrar un departamento podría entonces borrar sin avisar sus asignaturas y todas sus matrículas.',
      sql: {
        setup: SCHOOL,
        expectError: true,
        query: `DELETE FROM student WHERE student_id = 'S01';     -- CASCADE: también se van las matrículas de Ana
SELECT * FROM enrolment ORDER BY student_id;
DELETE FROM course WHERE course_id = 'C10';       -- C10 aún tiene matrículas: rechazado`,
      },
    },
    {
      id: 'check-default',
      hub: 'constraints',
      topic: 'constraints',
      title: 'CHECK y DEFAULT',
      summary: '**CHECK** establece una condición que debe cumplir cada fila, como una nota entre 0 y 10. **DEFAULT** da su valor a una columna cuando el INSERT no indica ninguno.',
      body: [
        'Las restricciones CHECK escriben reglas de negocio en el esquema: `credits > 0`, `end_date >= start_date`, `status IN (\'open\', \'closed\')`. Un CHECK puede usar varias columnas de la misma fila, pero no otras filas ni otras tablas (para eso hace falta un disparador o una clave ajena).',
        'DEFAULT rellena con sensatez las columnas obligatorias: la fecha actual, un estado \'pending\', un contador que empieza en 0. En Oracle, DEFAULT va **antes** de NOT NULL (`days NUMBER(2) DEFAULT 15 NOT NULL`).',
        'Pon nombre a las restricciones (`CONSTRAINT grade_range CHECK (…)`): así los mensajes de error dicen qué regla se ha incumplido.',
      ],
      points: [
        'Un CHECK se supera cuando la condición es verdadera **o desconocida** (NULL); añade NOT NULL si el valor es obligatorio.',
      ],
      mistake: 'Comprobar los rangos solo en la aplicación. Los datos cargados con un script o desde otro programa se saltan entonces la regla.',
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
INSERT INTO loan (book, days) VALUES ('Hopscotch', 90);       -- incumple days_range`,
      },
    },

    /* ───────────── Vistas y objetos del esquema ───────────── */
    {
      id: 'views',
      hub: 'objects',
      topic: 'objects',
      title: 'Vistas',
      summary: 'Una **vista** es una consulta guardada con nombre. Se consulta como una tabla, pero guarda **la consulta, no las filas**: cada vez que la lees, la consulta se vuelve a ejecutar sobre los datos actuales.',
      figure: { kind: 'view-window' },
      caption: 'Una vista es una ventana: guarda la consulta, y las filas salen de la tabla base en cada lectura.',
      body: [
        'Una vista es una **ventana** a las tablas: enmarca una parte de la casa y, cuando algo se mueve dentro, lo ves a través de la ventana al instante. No se copia nada. En el ejemplo cambia una nota en `enrolment` y la vista muestra el valor nuevo sin que nadie la toque.',
        'Las vistas simplifican (una combinación de tres tablas se convierte en `SELECT * FROM student_grades`), dan un nombre estable a un cálculo y protegen los datos: concede SELECT sobre una vista con las medias por asignatura, no sobre la tabla con todas las notas. `CREATE OR REPLACE VIEW` cambia la definición sin borrar la vista, así que conserva sus permisos.',
        'Una vista **sencilla** (una tabla, sin GROUP BY, DISTINCT ni agregados) suele ser **actualizable**: un INSERT o un UPDATE sobre la vista cambia la tabla base. `WITH CHECK OPTION` rechaza los cambios a través de la vista que la propia vista no podría ver; `WITH READ ONLY` prohíbe cualquier cambio a través de ella. Las dos solo funcionan en FreeSQL: mira el script estático.',
      ],
      points: [
        'Una vista con un JOIN, GROUP BY o DISTINCT normalmente no es actualizable directamente.',
        '`DROP VIEW nombre` elimina la vista; sus tablas y sus filas no se tocan.',
        'Una **vista materializada** sí guarda filas y se refresca cada cierto tiempo: una fotografía de la habitación, no una ventana.',
      ],
      example: '`CREATE OR REPLACE VIEW course_average AS SELECT course_id, ROUND(AVG(grade), 2) AS average FROM enrolment GROUP BY course_id` da a todo el mundo las medias sin enseñar ni una sola nota.',
      dialect: 'Oracle · ejecútalo en FreeSQL',
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

-- Una vista actualizable que solo deja trabajar con los productos en oferta
CREATE OR REPLACE VIEW sale_items AS
  SELECT product_id, name, price, on_sale FROM product WHERE on_sale = 'Y'
  WITH CHECK OPTION;
UPDATE sale_items SET price = 3.00 WHERE product_id = 1;    -- cambia la tabla
INSERT INTO sale_items VALUES (3, 'Ruler', 2.10, 'Y');       -- visible a través de la vista: se acepta
INSERT INTO sale_items VALUES (4, 'Glue', 1.80, 'N');        -- ORA-01402: view WITH CHECK OPTION where-clause violation
SELECT * FROM product;

-- Una vista a través de la cual nadie puede escribir
CREATE OR REPLACE VIEW price_list AS
  SELECT name, price FROM product
  WITH READ ONLY;
UPDATE price_list SET price = 0;                             -- ORA-42399: cannot perform a DML operation on a read-only view`,
      mistake: 'Pensar que una vista es una copia que hay que refrescar. Una vista normal muestra siempre los datos actuales, y es exactamente igual de rápida que la consulta que lleva dentro.',
      sql: {
        setup: SCHOOL,
        query: `CREATE OR REPLACE VIEW student_grades AS
SELECT s.name, c.title, e.grade
FROM enrolment e
JOIN student s ON s.student_id = e.student_id
JOIN course  c ON c.course_id  = e.course_id;
SELECT * FROM student_grades WHERE grade >= 7 ORDER BY grade DESC;
-- La vista guarda la consulta, no las filas: cambia una nota en la tabla...
UPDATE enrolment SET grade = 9.5 WHERE student_id = 'S03' AND course_id = 'C10';
-- ...y la vista la muestra al instante
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
      title: 'WITH: expresiones de tabla comunes',
      summary: 'La cláusula **WITH** da nombre a una subconsulta al principio de una sentencia, una **expresión de tabla común** (CTE), y la consulta principal la usa como una tabla. Se pueden encadenar varias CTE, cada una usando las anteriores.',
      figure: { kind: 'cte-pipeline' },
      caption: 'Cada CTE es un paso con nombre; los pasos siguientes y el SELECT final lo usan como una tabla.',
      body: [
        'Una CTE es una receta que enumera primero sus preparaciones: «1. haz la salsa; 2. cuece la pasta; 3. mézclalas». Cada paso tiene un nombre y el último los usa. Una subconsulta anidada es la misma receta escrita de dentro hacia fuera, como una frase llena de paréntesis.',
        '`WITH course_avg AS (SELECT course_id, AVG(grade) AS average FROM enrolment GROUP BY course_id) SELECT …` define `course_avg` una vez; la consulta principal puede combinarla, filtrarla o usarla dos veces. Varias CTE se separan con comas: `WITH a AS (…), b AS (… FROM a …) SELECT … FROM b`.',
        'Una CTE solo existe durante su sentencia; no se guarda como una vista. Usa una CTE para que una consulta larga se lea bien, y una vista cuando muchas consultas necesitan la misma definición.',
      ],
      points: [
        'Un solo WITH por sentencia, al principio; las CTE se separan con comas y el SELECT principal va al final.',
        'Una CTE se puede usar varias veces en la consulta principal, en lugar de repetir la misma subconsulta.',
        'Una CTE que se refiere a sí misma (recursiva) recorre jerarquías, como un organigrama.',
      ],
      example: 'Los estudiantes cuya media supera la media de la clase: una CTE con la media de cada estudiante, otra con la media global y un SELECT final que las compara.',
      mistake: 'Escribir un punto y coma o un segundo WITH entre las CTE. Forman una sola sentencia: `WITH a AS (…), b AS (…) SELECT …`.',
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
-- CTE encadenadas: cada paso usa el anterior
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
      title: 'Secuencias y sinónimos',
      summary: 'Una **secuencia** reparte números únicos, uno tras otro, a cualquier sesión que los pida. Un **sinónimo** es otro nombre para un objeto, a menudo para una tabla de otro esquema.',
      body: [
        'Una secuencia es el dispensador de números del mostrador de la charcutería: cada cliente saca el siguiente número, dos clientes nunca reciben el mismo y un número que se saca y no se usa simplemente se pierde. `seq.NEXTVAL` saca un número nuevo; `seq.CURRVAL` repite el último número que sacó **tu sesión**.',
        'Desde Oracle 12c una columna de **identidad** (`GENERATED ALWAYS AS IDENTITY`) hace el mismo trabajo para una tabla, de forma más sencilla: Oracle crea y usa por ti una secuencia oculta. Usa una secuencia explícita cuando varias tablas comparten una misma numeración, o cuando necesitas el número antes del INSERT.',
        'Un sinónimo es un **apodo**: `CREATE SYNONYM grades FOR hr.enrolment` te permite escribir `grades` en lugar del nombre completo. Un sinónimo PUBLIC es visible para todos los usuarios. Un sinónimo no concede nada: sigues necesitando el privilegio SELECT sobre la tabla.',
      ],
      points: [
        'Las secuencias pueden dejar **huecos** (ROLLBACK, números en caché que se pierden al reiniciar la base de datos): nunca las uses para contar filas.',
        '`CACHE 20` guarda números en memoria para ir más rápido; `NOCYCLE` (por defecto) se detiene en MAXVALUE en lugar de volver a empezar.',
        'La simulación del navegador no puede ejecutar secuencias ni sinónimos: ejecuta el script en FreeSQL.',
      ],
      table: {
        caption: '¿Secuencia o columna de identidad?',
        head: ['', 'Secuencia', 'Columna de identidad'],
        rows: [
          ['Pertenece a', 'El esquema: cualquier tabla puede usarla', 'Una columna de una tabla'],
          ['Cómo se usa', '`seq.NEXTVAL` en el INSERT, o como DEFAULT de la columna', 'Se deja la columna fuera del INSERT'],
          ['Numeración compartida', 'Sí', 'No'],
          ['Huecos', 'Posibles', 'Posibles (usa una secuencia por dentro)'],
        ],
      },
      dialect: 'Oracle · ejecútalo en FreeSQL',
      code: `DROP TABLE IF EXISTS ticket PURGE;
DROP SEQUENCE IF EXISTS ticket_seq;
CREATE SEQUENCE ticket_seq START WITH 100 INCREMENT BY 1 NOCACHE;
CREATE TABLE ticket (
  ticket_no NUMBER DEFAULT ticket_seq.NEXTVAL PRIMARY KEY,
  customer  VARCHAR2(30) NOT NULL
);
INSERT INTO ticket (customer) VALUES ('Ana');                                    -- 100, del DEFAULT
INSERT INTO ticket (ticket_no, customer) VALUES (ticket_seq.NEXTVAL, 'Luis');     -- 101
SELECT ticket_seq.CURRVAL AS last_ticket FROM dual;                              -- otra vez 101, en esta sesión
SELECT * FROM ticket;

-- Un sinónimo: un apodo para la tabla
CREATE OR REPLACE SYNONYM queue FOR ticket;
SELECT * FROM queue;
DROP SYNONYM queue;`,
      mistake: 'Esperar una secuencia sin huecos, como números de factura 1, 2, 3… sin que falte ninguno. Un INSERT deshecho con ROLLBACK ya gastó su número; si la ley exige números consecutivos, genéralos de otra forma.',
    },

    /* ───────────── PL/SQL ───────────── */
    {
      id: 'plsql-blocks',
      hub: 'plsql',
      topic: 'plsql',
      title: 'Bloques PL/SQL, variables y SELECT INTO',
      summary: '**PL/SQL** es el lenguaje procedimental de Oracle: SQL más variables, condiciones, bucles y gestión de errores. El código se escribe en **bloques**: una sección DECLARE opcional, un cuerpo BEGIN … END y una sección EXCEPTION opcional.',
      figure: { kind: 'plsql-block' },
      caption: 'Las partes de un bloque. Solo BEGIN … END es obligatorio.',
      body: [
        'SQL dice **qué** quieres; PL/SQL dice **cómo**, paso a paso, como una ficha de receta: los ingredientes (**DECLARE**: variables y constantes), los pasos (**BEGIN**) y qué hacer si algo sale mal (**EXCEPTION**). El bloque termina con `END;`, y en un script una `/` sola en la línea siguiente le dice a la herramienta que lo ejecute.',
        'Cada variable tiene un tipo: `v_total NUMBER := 0;`. `CONSTANT` fija un valor (`c_pass CONSTANT NUMBER := 5;`). **%TYPE** copia el tipo de una columna (`v_grade enrolment.grade%TYPE`) y **%ROWTYPE** la estructura de una fila entera (`r_student student%ROWTYPE`): si la columna cambia, el código la sigue.',
        '`SELECT … INTO` guarda en variables el resultado de una consulta que devuelve **exactamente una fila**. `DBMS_OUTPUT.PUT_LINE` imprime una línea: FreeSQL la muestra bajo el script (en SQL*Plus o SQL Developer, ejecuta antes `SET SERVEROUTPUT ON`).',
      ],
      points: [
        '`:=` asigna y `=` compara; cada sentencia termina en `;`.',
        'Pon prefijos a los nombres (`v_` variable, `c_` constante, `r_` registro) para que nunca choquen con nombres de columnas.',
        'Si SELECT INTO no encuentra ninguna fila lanza NO_DATA_FOUND; si encuentra varias, TOO_MANY_ROWS (mira la tarjeta de excepciones).',
      ],
      example: 'El bloque del ejemplo lee un estudiante y su media en variables e imprime una frase sobre él, algo que un único SELECT no puede hacer.',
      dialect: 'Oracle PL/SQL · ejecútalo en FreeSQL',
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
  r_student student%ROWTYPE;              -- una fila entera de student
  v_average enrolment.grade%TYPE;         -- el tipo de la columna grade
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
      mistake: 'Dar a una variable el nombre de una columna (`name`). En `WHERE name = name` los dos lados son la columna, así que la condición es cierta para todas las filas. Llámala `v_name`.',
    },
    {
      id: 'plsql-control',
      hub: 'plsql',
      topic: 'plsql',
      title: 'Control de flujo: IF, CASE y bucles',
      summary: 'PL/SQL decide con **IF … ELSIF … ELSE** y **CASE**, y repite con tres bucles: el **LOOP** básico con **EXIT WHEN**, **WHILE** y el **FOR** numérico.',
      body: [
        'IF es una bifurcación en el camino: la primera condición cierta elige el camino y ELSE se queda con el resto. Ojo a la ortografía **ELSIF** (una sola palabra, sin la segunda E) y al cierre `END IF;`. Una sentencia CASE elige entre muchos caminos, por un valor o por condiciones, y termina con `END CASE;`.',
        'Los bucles son vueltas a una pista de atletismo. `LOOP … EXIT WHEN condición; … END LOOP;` corre hasta que decides parar; `WHILE condición LOOP` comprueba antes de cada vuelta; `FOR i IN 1 .. 10 LOOP` cuenta las vueltas por ti (el contador `i` se declara solo y no se le puede asignar nada; `REVERSE` cuenta hacia atrás).',
        'Una condición NULL cuenta como falsa en IF y en WHILE, igual que en WHERE: `IF v_grade >= 5` con una nota NULL va al ELSE.',
      ],
      points: [
        'Todo bucle necesita una salida: un LOOP básico sin EXIT no termina nunca.',
        '`CONTINUE WHEN condición;` salta a la siguiente vuelta.',
        'En los programas reales el bucle suele recorrer filas: para eso están los cursores (siguiente tarjeta).',
      ],
      example: 'Calificar una nota: `IF v_grade >= 9 THEN … ELSIF v_grade >= 7 THEN … ELSIF v_grade >= 5 THEN … ELSE … END IF;`.',
      dialect: 'Oracle PL/SQL · ejecútalo en FreeSQL',
      code: `DECLARE
  v_grade   NUMBER := 7.5;
  v_label   VARCHAR2(20);
  v_balance NUMBER := 1000;
  v_years   PLS_INTEGER := 0;
BEGIN
  -- IF / ELSIF / ELSE: gana la primera rama cierta
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

  -- Sentencia CASE sobre un valor
  CASE v_label
    WHEN 'Fail' THEN DBMS_OUTPUT.PUT_LINE('See you at the resit.');
    WHEN 'Pass' THEN DBMS_OUTPUT.PUT_LINE('Just made it.');
    ELSE DBMS_OUTPUT.PUT_LINE('Well done!');
  END CASE;

  -- FOR: un bucle que cuenta
  FOR i IN 1 .. 5 LOOP
    DBMS_OUTPUT.PUT_LINE('7 x ' || i || ' = ' || 7 * i);
  END LOOP;

  -- WHILE: años hasta que 1.000 euros al 5 % anual lleguen a 1.500
  WHILE v_balance < 1500 LOOP
    v_balance := v_balance * 1.05;
    v_years := v_years + 1;
  END LOOP;
  DBMS_OUTPUT.PUT_LINE(v_years || ' years: ' || ROUND(v_balance, 2) || ' euros');

  -- LOOP ... EXIT WHEN: una cuenta atrás
  LOOP
    DBMS_OUTPUT.PUT_LINE('Countdown: ' || v_years);
    v_years := v_years - 3;
    EXIT WHEN v_years <= 0;
  END LOOP;
END;
/`,
      mistake: 'Escribir `ELSE IF` o `ELSEIF`. PL/SQL quiere `ELSIF`; `ELSE IF` abre un IF nuevo que necesita su propio `END IF;`.',
    },
    {
      id: 'cursors',
      video: 'sql-cursors',
      hub: 'plsql',
      topic: 'plsql',
      title: 'Cursores: recorrer las filas una a una',
      summary: 'Un **cursor** señala las filas de una consulta para que PL/SQL las procese **de una en una**. Oracle abre un cursor **implícito** para cada sentencia SQL; declaras un cursor **explícito** cuando necesitas visitar una a una las filas de un SELECT.',
      figure: { kind: 'cursor-life' },
      caption: 'El cursor es un dedo sobre las filas de su SELECT: cada FETCH lo baja una fila.',
      body: [
        'Un cursor es tu dedo recorriendo una lista de clase impresa: lo pones en la primera línea, la lees, haces algo (marcas el nombre, corriges la nota), bajas a la siguiente línea y paras al final. La lista es el resultado del SELECT, el dedo es el cursor y la línea que tiene debajo es la fila actual.',
        'Un cursor explícito tiene un **ciclo de vida** fijo: lo **DECLARAS** con su consulta; lo **ABRES** con OPEN (la consulta se ejecuta y el dedo se coloca antes de la primera fila); haces **FETCH** de una fila tras otra en variables dentro de un bucle, con **EXIT WHEN cursor%NOTFOUND** al llegar al final de la lista; y lo **CIERRAS** con CLOSE para liberar su memoria. El **bucle FOR de cursor** (`FOR r IN c LOOP … END LOOP;`) abre, recupera, comprueba el final y cierra por ti.',
        '**La historia real**: una profesora ajusta las notas con una regla distinta por asignatura. En Databases (C10) una nota por debajo de 5 sube 1 punto y una por debajo de 7 sube 0,5; en Statistics (C20), mucho más difícil este año, todo el mundo sube 1; las demás asignaturas se quedan igual; y ninguna nota pasa de 10. El cursor se declara `FOR UPDATE` (bloquea esas filas) y cada cambio se escribe con `UPDATE … WHERE CURRENT OF`, «la fila que tengo bajo el dedo».',
      ],
      points: [
        'Tras cualquier INSERT, UPDATE o DELETE, el cursor implícito dice cuántas filas han cambiado (`SQL%ROWCOUNT`) y si ha cambiado alguna (`SQL%FOUND`).',
        '`FOR UPDATE` bloquea las filas hasta el COMMIT o el ROLLBACK, para que nadie las cambie a medias; confirma después de cerrar el cursor, no dentro del bucle.',
        'En un bucle FOR de cursor el registro `r` se declara solo y el cursor siempre se cierra, incluso tras un error.',
      ],
      table: {
        caption: 'Atributos de cursor',
        head: ['Atributo', 'Significa', 'Uso típico'],
        rows: [
          ['`c%ISOPEN`', 'El cursor está abierto', '`IF NOT c%ISOPEN THEN OPEN c; END IF;`'],
          ['`c%FOUND`', 'El último FETCH devolvió una fila', 'Procesar la fila'],
          ['`c%NOTFOUND`', 'El último FETCH no encontró nada: el final de la lista', '`EXIT WHEN c%NOTFOUND;`'],
          ['`c%ROWCOUNT`', 'Filas recuperadas hasta ahora', 'Numerar las líneas de un informe'],
          ['`SQL%ROWCOUNT`', 'Filas cambiadas por la última sentencia SQL (cursor implícito)', '`DBMS_OUTPUT.PUT_LINE(SQL%ROWCOUNT || \' rows\')`'],
        ],
      },
      example: 'El 4 de S01 en Databases pasa a 5, el 6,5 de S02 pasa a 7 y el 8,5 se queda igual; en Statistics todo el mundo gana un punto, pero el 9,5 se queda en 10.',
      dialect: 'Oracle PL/SQL · ejecútalo en FreeSQL',
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

-- 1. Cursor explícito: DECLARE -> OPEN -> FETCH en un bucle -> CLOSE
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
    EXIT WHEN c_grades%NOTFOUND;              -- el dedo ha llegado al final de la lista
    v_new := CASE
               WHEN r.course_id = 'C10' AND r.grade < 5 THEN r.grade + 1
               WHEN r.course_id = 'C10' AND r.grade < 7 THEN r.grade + 0.5
               WHEN r.course_id = 'C20'                 THEN r.grade + 1
               ELSE r.grade
             END;
    v_new := LEAST(v_new, 10);                -- nunca por encima de 10
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

-- 2. El bucle FOR de cursor: OPEN, FETCH, EXIT y CLOSE son automáticos
DECLARE
  CURSOR c_list IS
    SELECT student_id, course_id, grade FROM enrolment ORDER BY course_id, student_id;
BEGIN
  FOR r IN c_list LOOP
    DBMS_OUTPUT.PUT_LINE(r.course_id || ' ' || r.student_id || ': ' || r.grade);
  END LOOP;
  -- El cursor implícito de un UPDATE normal
  UPDATE enrolment SET grade = LEAST(grade + 0.25, 10) WHERE course_id = 'C11';
  DBMS_OUTPUT.PUT_LINE(SQL%ROWCOUNT || ' Python grade(s) raised');
  COMMIT;
END;
/

-- 3. El ajuste del bloque 1 como UNA sola sentencia de conjunto (prefiérela si basta una fórmula):
-- UPDATE enrolment
-- SET grade = LEAST(10, grade + CASE
--                                 WHEN course_id = 'C10' AND grade < 5 THEN 1
--                                 WHEN course_id = 'C10' AND grade < 7 THEN 0.5
--                                 WHEN course_id = 'C20' THEN 1
--                                 ELSE 0
--                               END);`,
      mistake: 'Escribir un bucle con cursor cuando bastaría **un único UPDATE de conjunto**. Si cada fila solo necesita una fórmula sobre sus propios valores, `UPDATE enrolment SET grade = LEAST(10, grade + CASE … END)` cambia toda la tabla en una sentencia, y mucho más deprisa. Reserva los cursores para el trabajo que SQL no puede expresar en una sentencia: varios pasos por fila, llamadas a procedimientos, mensajes o decisiones que dependen de filas anteriores.',
    },
    {
      id: 'plsql-exceptions',
      hub: 'plsql',
      topic: 'plsql',
      title: 'Excepciones: gestionar los errores',
      summary: 'Cuando una sentencia falla dentro de PL/SQL, Oracle **lanza una excepción** y salta a la sección **EXCEPTION** del bloque. Ahí capturas los errores por su nombre y los tratas, y el programa sigue en lugar de detenerse.',
      figure: { kind: 'exception-flow' },
      caption: 'Una excepción salta al manejador más cercano que la reconoce; si ninguno lo hace, sube al bloque que lo contiene.',
      body: [
        'Las excepciones son la red de seguridad bajo un trapecio: si un número sale mal, caes en la red (la sección EXCEPTION) en lugar de estrellarte contra el suelo (un error que detiene todo el script). Cada `WHEN nombre THEN` es una parte de la red preparada para un tipo de caída, y `WHEN OTHERS` recoge todo lo demás.',
        'Oracle da nombre a los errores más habituales (las excepciones **predefinidas** de la tabla). Puedes declarar las tuyas (`e_too_many_credits EXCEPTION;`) y lanzarlas con **RAISE** cuando se incumple una regla de negocio. `RAISE_APPLICATION_ERROR(-20001, \'mensaje\')` se detiene con tu propio número de error (de -20000 a -20999) y tu texto, que la aplicación que llama recibe como cualquier error de Oracle.',
        '`SQLCODE` y `SQLERRM` dan el número y el mensaje del error actual: regístralos en WHEN OTHERS. Cuando se ejecuta un manejador, su bloque termina con normalidad, y las sentencias que venían después de la que falló **no** se ejecutan. Un `BEGIN … EXCEPTION … END` anidado alrededor de un paso arriesgado permite que el resto del programa continúe.',
      ],
      points: [
        'Pon primero los manejadores específicos y WHEN OTHERS al final.',
        'Una excepción que un bloque no trata pasa al bloque que lo contiene y, al final, a quien lo llamó.',
        'Dentro de un bucle, un bloque anidado trata el error de una fila y el bucle continúa con la siguiente.',
      ],
      table: {
        caption: 'Excepciones predefinidas habituales',
        head: ['Excepción', 'Error', 'Se lanza cuando'],
        rows: [
          ['`NO_DATA_FOUND`', 'ORA-01403', 'Un SELECT INTO no devuelve ninguna fila'],
          ['`TOO_MANY_ROWS`', 'ORA-01422', 'Un SELECT INTO devuelve más de una fila'],
          ['`ZERO_DIVIDE`', 'ORA-01476', 'Se divide un número entre cero'],
          ['`DUP_VAL_ON_INDEX`', 'ORA-00001', 'Un INSERT o UPDATE repite un valor de clave primaria o UNIQUE'],
          ['`VALUE_ERROR`', 'ORA-06502', 'Un valor no cabe en su variable (demasiado largo, tipo incorrecto)'],
          ['`INVALID_NUMBER`', 'ORA-01722', 'En SQL se usa como número un texto que no lo es'],
        ],
      },
      example: 'Buscar un estudiante que no existe imprime «No student S99», y el script sigue con el paso siguiente.',
      dialect: 'Oracle PL/SQL · ejecútalo en FreeSQL',
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
  e_too_many_credits EXCEPTION;               -- una excepción definida por el usuario
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

  BEGIN                                       -- ZERO_DIVIDE: Luis tiene 0 créditos
    SELECT credits INTO v_credits FROM student WHERE student_id = 'S02';
    DBMS_OUTPUT.PUT_LINE('Hours per credit: ' || 150 / v_credits);
  EXCEPTION
    WHEN ZERO_DIVIDE THEN DBMS_OUTPUT.PUT_LINE('Cannot divide by zero credits');
  END;

  BEGIN                                       -- DUP_VAL_ON_INDEX: S01 ya existe
    INSERT INTO student (student_id, name) VALUES ('S01', 'Ana again');
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN DBMS_OUTPUT.PUT_LINE('S01 already exists');
  END;

  BEGIN                                       -- una regla de negocio con una excepción propia
    SELECT credits INTO v_credits FROM student WHERE student_id = 'S01';
    IF v_credits + 30 > 78 THEN
      RAISE e_too_many_credits;
    END IF;
  EXCEPTION
    WHEN e_too_many_credits THEN DBMS_OUTPUT.PUT_LINE('No more than 78 credits a year');
  END;

  BEGIN                                       -- tu propio número de error, capturado por WHEN OTHERS
    RAISE_APPLICATION_ERROR(-20001, 'Enrolment is closed');
  EXCEPTION
    WHEN OTHERS THEN DBMS_OUTPUT.PUT_LINE('Error ' || SQLCODE || ': ' || SQLERRM);
  END;
END;
/`,
      mistake: 'Escribir `WHEN OTHERS THEN NULL;`. Se traga todos los errores en silencio: el programa parece funcionar y los datos están mal. Como mínimo, registra SQLERRM o vuelve a lanzar el error con `RAISE;`.',
    },
    {
      id: 'procedures-functions',
      video: 'sql-procedures',
      hub: 'plsql',
      topic: 'plsql',
      title: 'Procedimientos y funciones almacenados',
      summary: 'Un **procedimiento** es un bloque PL/SQL con nombre, guardado en la base de datos, que **hace** algo. Una **función** **devuelve** un valor y se puede usar dentro de SQL. Los dos reciben **parámetros**.',
      figure: { kind: 'proc-vs-func' },
      caption: 'Un procedimiento se llama como una sentencia; una función devuelve un valor y se puede usar en SQL.',
      body: [
        'Un procedimiento es una máquina expendedora: metes una moneda y eliges (parámetros IN), **hace** algo (suelta una lata) y quizá te devuelve el cambio (parámetros OUT). Una función es una calculadora: le das unos números y **devuelve** una respuesta, que puedes usar dentro de una expresión mayor, incluso dentro de un SELECT.',
        '`CREATE OR REPLACE PROCEDURE nombre (p_x IN tipo, p_y OUT tipo) IS … BEGIN … END;` lo guarda, compilado, en tu esquema. Modos de los parámetros: **IN** (solo lectura, el modo por defecto), **OUT** (el procedimiento lo escribe) e **IN OUT** (las dos cosas). Los tipos de los parámetros no llevan longitud: `VARCHAR2`, no `VARCHAR2(40)`.',
        'Un procedimiento se llama desde un bloque (`enrol_student(\'S03\', \'C10\', v_msg);`) o con `EXEC` en un script. Una función que devuelve un tipo SQL se puede usar en una consulta: `SELECT grade, letter_grade(grade) FROM enrolment`. La lógica guardada en la base de datos es compartida: todas las aplicaciones usan las mismas reglas.',
      ],
      points: [
        'Si compila con errores, Oracle la guarda como INVALID; `SHOW ERRORS` (o la vista `USER_ERRORS`) dice por qué.',
        'Una función que se llama desde SQL no debería modificar datos.',
        'Pon a los parámetros el prefijo `p_` para que nunca choquen con nombres de columnas.',
      ],
      example: '`letter_grade(8.5)` devuelve `B`, y `SELECT student_id, grade, letter_grade(grade) FROM enrolment` la aplica a cada fila.',
      dialect: 'Oracle PL/SQL · ejecútalo en FreeSQL',
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

-- Una función: una calculadora que devuelve un valor
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

-- Un procedimiento: una máquina expendedora que hace algo y devuelve un mensaje
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

-- Las dos llamadas desde un bloque...
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

-- ...y la función desde SQL
SELECT student_id, grade, letter_grade(grade) AS letter
FROM enrolment
ORDER BY student_id;`,
      mistake: 'Escribir un procedimiento donde hace falta una función, o al revés. Si quieres un valor para usarlo en una expresión o en una consulta, escribe una función; si quieres una acción, un procedimiento.',
    },
    {
      id: 'triggers',
      video: 'sql-triggers',
      hub: 'plsql',
      topic: 'plsql',
      title: 'Disparadores (triggers)',
      summary: 'Un **disparador** es código PL/SQL que Oracle ejecuta **automáticamente** cuando le pasa algo a una tabla: antes o después de un INSERT, UPDATE o DELETE, una vez por sentencia o una vez **por cada fila**.',
      figure: { kind: 'trigger-timing' },
      caption: 'Orden de disparo para un UPDATE que cambia dos filas.',
      body: [
        'Un disparador es una luz con sensor de movimiento: nadie pulsa el interruptor, es el evento (alguien entra) lo que la enciende. A un disparador nunca se le llama: lo dispara un INSERT, UPDATE o DELETE sobre su tabla, venga del programa que venga la sentencia.',
        'Los disparadores **BEFORE** se ejecutan antes del cambio y pueden comprobar o ajustar los valores nuevos; los **AFTER** se ejecutan cuando el cambio ya está hecho, por ejemplo para escribir un registro de auditoría. Un disparador **de sentencia** se dispara una vez por sentencia; uno **de fila** (`FOR EACH ROW`) se dispara una vez por cada fila afectada y puede leer los valores `:OLD` (antes) y `:NEW` (después). `WHEN (condición)` limita las filas que lo disparan (dentro de WHEN se escriben `OLD` y `NEW` sin los dos puntos).',
        'Orden de disparo en una sentencia: BEFORE de sentencia → para cada fila (BEFORE de fila → el cambio → AFTER de fila) → AFTER de sentencia. Un disparador **INSTEAD OF** se define sobre una vista y se ejecuta en lugar del INSERT, UPDATE o DELETE sobre ella, lo que permite actualizar una vista con JOIN.',
      ],
      points: [
        'En un INSERT los valores `:OLD` son NULL; en un DELETE lo son los `:NEW`.',
        'Los usos típicos son las auditorías, los valores derivados y las reglas entre tablas; las reglas sencillas van en restricciones.',
        'Un disparador se ejecuta dentro de la transacción de su sentencia: si la sentencia se deshace, el trabajo del disparador también.',
      ],
      example: 'Cada cambio de una nota escribe una línea en `grade_audit` con quién, cuándo, la nota anterior y la nueva, sin que la aplicación haga nada.',
      dialect: 'Oracle PL/SQL · ejecútalo en FreeSQL',
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

-- BEFORE ... FOR EACH ROW: comprueba y ajusta el valor nuevo
CREATE OR REPLACE TRIGGER trg_grade_check
BEFORE INSERT OR UPDATE OF grade ON enrolment
FOR EACH ROW
BEGIN
  IF :NEW.grade > 10 THEN
    RAISE_APPLICATION_ERROR(-20010, 'A grade cannot be above 10');
  END IF;
  :NEW.grade := ROUND(:NEW.grade, 1);          -- guarda un solo decimal
END;
/

-- AFTER ... FOR EACH ROW con WHEN: audita solo los cambios reales
CREATE OR REPLACE TRIGGER trg_grade_audit
AFTER UPDATE OF grade ON enrolment
FOR EACH ROW
WHEN (NEW.grade <> OLD.grade OR (OLD.grade IS NULL AND NEW.grade IS NOT NULL))
BEGIN
  INSERT INTO grade_audit (student_id, course_id, old_grade, new_grade)
  VALUES (:OLD.student_id, :OLD.course_id, :OLD.grade, :NEW.grade);
END;
/

-- AFTER, de sentencia: una vez, cambien las filas que cambien
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
      mistake: 'Esconder lógica de negocio en disparadores, o consultar la misma tabla desde un disparador de fila. Las cadenas de acciones invisibles son difíciles de depurar, y leer la tabla que se está modificando falla con ORA-04091 (table is mutating). Mantén los disparadores pequeños: auditoría y comprobaciones que las restricciones no pueden expresar.',
    },
    {
      id: 'packages',
      hub: 'plsql',
      topic: 'plsql',
      title: 'Paquetes',
      summary: 'Un **paquete** agrupa procedimientos, funciones, constantes y cursores relacionados bajo un nombre. Tiene dos partes: la **especificación**, su interfaz pública, y el **cuerpo**, la implementación oculta.',
      figure: { kind: 'package-spec-body' },
      caption: 'Quien llama solo ve la especificación; el cuerpo y sus ayudantes privados quedan ocultos.',
      body: [
        'Un paquete es un restaurante. La **especificación** es la **carta**: lo que los clientes pueden pedir y lo que lleva cada plato. El **cuerpo** es la **cocina**: donde están las recetas y adonde los clientes nunca entran. El cocinero puede cambiar una receta (el cuerpo) sin reimprimir la carta, y los pedidos de los clientes (los programas que llaman al paquete) siguen funcionando.',
        'Todo lo que se declara en la especificación es **público**: quien llama escribe `paquete.elemento` (`grades_pkg.letter(8.5)`). Lo que solo se declara en el cuerpo es **privado**: utilidades que solo puede usar el propio paquete. Crea primero la especificación y luego el cuerpo.',
        'Los paquetes organizan bases de código grandes (un paquete por área de negocio), se cargan como una unidad y sus variables de paquete conservan su valor durante toda la sesión. Las utilidades del propio Oracle son paquetes: `DBMS_OUTPUT.PUT_LINE` es el procedimiento PUT_LINE del paquete DBMS_OUTPUT.',
      ],
      points: [
        'Cambiar solo el cuerpo no invalida los programas que llaman al paquete.',
        'Dos subprogramas de un paquete pueden llamarse igual si sus parámetros son distintos (sobrecarga).',
        'Concede EXECUTE sobre el paquete, no sobre cada procedimiento.',
      ],
      example: '`grades_pkg` publica `letter` y `curve_course`; la regla de que un ajuste está entre 0 y 2 puntos es una función privada que nadie fuera del paquete puede llamar ni saltarse.',
      dialect: 'Oracle PL/SQL · ejecútalo en FreeSQL',
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

-- Especificación: la carta (pública)
CREATE OR REPLACE PACKAGE grades_pkg IS
  c_max_grade CONSTANT NUMBER := 10;
  FUNCTION  letter (p_grade IN NUMBER) RETURN VARCHAR2;
  PROCEDURE curve_course (p_course IN VARCHAR2, p_points IN NUMBER);
END grades_pkg;
/

-- Cuerpo: la cocina (detalles privados)
CREATE OR REPLACE PACKAGE BODY grades_pkg IS
  -- Privada: no está en la especificación, así que solo este cuerpo puede usarla
  FUNCTION safe_points (p_points IN NUMBER) RETURN NUMBER IS
  BEGIN
    RETURN LEAST(GREATEST(p_points, 0), 2);      -- un ajuste va de 0 a 2 puntos
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
  grades_pkg.curve_course('C10', 5);           -- pide 5; la regla privada permite 2
  COMMIT;
END;
/
SELECT student_id, grade, grades_pkg.letter(grade) AS letter FROM enrolment;`,
      mistake: 'Poner todas las utilidades en la especificación. Todo lo público se convierte en una promesa: otro código empieza a usarlo y ya no puedes cambiarlo con libertad. Publica solo lo que necesitan quienes llaman.',
    },

    /* ───────────── Índices ───────────── */
    {
      id: 'index-basics',
      video: 'sql-indexes',
      hub: 'indexes',
      topic: 'indexes',
      title: 'Qué es un índice',
      summary: 'Un **índice** es una estructura aparte y ordenada (normalmente un **árbol B+**) que asocia los valores de algunas columnas con sus filas. Gracias a él, el SGBD puede **buscar** en lugar de **recorrer** toda la tabla.',
      body: [
        'Sin un índice sobre `email`, encontrar un cliente supone leer las 50.000 filas: el plan dice **TABLE ACCESS FULL**. Tras el `CREATE INDEX`, el plan dice **INDEX RANGE SCAN** seguido de **TABLE ACCESS BY INDEX ROWID** y el SGBD baja por el árbol en pocos pasos (consulta la ficha del árbol B+ en la sección de Teoría).',
        'El ejecutor muestra el tiempo de cada sentencia. Compara los dos SELECT idénticos, antes y después del índice.',
        '`EXPLAIN PLAN FOR <consulta>` guarda el plan sin ejecutar la consulta, y `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY)` lo muestra. (El entorno redacta su propio plan igual; FreeSQL muestra además el coste.)',
      ],
      points: [
        'La clave primaria y cada restricción UNIQUE ya tienen un índice.',
        'En Oracle las claves ajenas **no** reciben uno automáticamente; indéxalas si combinas o filtras por ellas.',
      ],
      mistake: 'Pensar que un índice cambia el resultado. Solo cambia la rapidez con que el SGBD encuentra las filas; la consulta devuelve exactamente los mismos datos.',
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
      title: 'Índices compuestos y de cobertura',
      summary: 'Un índice **compuesto** ordena por varias columnas, en orden. Ayuda a las consultas que filtran por sus columnas **más a la izquierda**. Un índice **de cobertura** contiene todas las columnas que necesita una consulta, de modo que no hace falta leer la tabla.',
      body: [
        'Un índice sobre `(city, signup_date)` está ordenado como una guía telefónica por apellido y luego por nombre: encuentra rápido «Madrid, desde 2023», y también «Madrid» a secas. No sirve para «desde 2023» a secas, porque esas fechas están repartidas entre todas las ciudades: esa consulta recorre la tabla.',
        'Pon primero la columna que se compara por **igualdad** y después la que se usa en **rangos** u ordenación.',
        'Cuando la consulta solo usa columnas que están en el índice, el SGBD responde desde el índice y nunca visita la tabla: el plan tiene un **INDEX RANGE SCAN** sin paso de TABLE ACCESS.',
      ],
      points: [
        'Regla del prefijo izquierdo: `(a, b, c)` sirve para filtros sobre `a`, `a, b` y `a, b, c`.',
        'Un índice compuesto puede sustituir a varios de una sola columna.',
      ],
      mistake: 'Crear `(signup_date, city)` para consultas que siempre fijan la ciudad y dan un rango de fechas. Con el rango primero, la segunda columna no puede acotar la búsqueda.',
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
      title: 'Lo que cuestan los índices',
      summary: 'Los índices aceleran las lecturas pero ralentizan las escrituras: cada INSERT, UPDATE o DELETE debe actualizar también **cada índice** de la tabla. Además, ocupan disco y memoria.',
      body: [
        'En el ejemplo se insertan dos veces las mismas 20.000 filas: en una tabla sin índices y en otra con tres. Compara el tiempo de las dos sentencias INSERT.',
        'Un índice compensa cuando las consultas filtran, combinan u ordenan por sus columnas y esas consultas devuelven una **pequeña fracción** de las filas (alta **selectividad**). En una columna con muy pocos valores distintos, como un indicador sí/no, un índice de árbol B normal rara vez ayuda: de todos modos coincide la mitad de la tabla.',
      ],
      table: {
        caption: 'Cuándo indexar una columna',
        head: ['Normalmente sí', 'Normalmente no'],
        rows: [
          ['Claves ajenas usadas en combinaciones (JOIN)', 'Columnas que nunca se usan en WHERE, JOIN u ORDER BY'],
          ['Columnas filtradas con = o rangos que devuelven pocas filas', 'Columnas de baja selectividad (sexo, sí/no)'],
          ['Columnas usadas para ordenar resultados grandes (ORDER BY … LIMIT)', 'Tablas pequeñas que caben en pocos bloques'],
          ['Claves de búsqueda de consultas frecuentes', 'Tablas con muchas escrituras y pocas lecturas (registros, logs)'],
        ],
      },
      mistake: 'Indexar todas las columnas «por si acaso». Cada índice ralentiza todas las escrituras y el optimizador solo usa los útiles.',
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
      title: 'Tipos de índice',
      summary: 'El **árbol B** es el tipo por defecto y sirve para igualdad, rangos y ordenación. Otros tipos resuelven problemas concretos: **hash** solo para igualdad, **bitmap** para pocos valores distintos, **GIN** para valores dentro de un documento o un array y **BRIN** para tablas enormes ordenadas de forma natural.',
      body: [
        'Oracle llama **índice basado en funciones** al que se construye sobre una **expresión** (`LOWER(email)`): una consulta que use la misma expresión puede aprovecharlo. Oracle no tiene índices parciales con cláusula WHERE (PostgreSQL sí); un truco habitual es un índice basado en funciones que valga NULL para las filas que no quieres, porque Oracle no indexa las filas cuya clave es toda NULL.',
        'Los tipos disponibles dependen del SGBD: Oracle tiene árbol B (el predeterminado), **bitmap** y de **clave inversa**, y admite índices de búsqueda de texto y JSON; PostgreSQL añade hash, GIN y BRIN; MySQL InnoDB usa casi exclusivamente árboles B.',
      ],
      table: {
        caption: 'Principales tipos de índice',
        head: ['Tipo', 'Adecuado para', 'No sirve para'],
        rows: [
          ['Árbol B / árbol B+', '=, <, >, BETWEEN, ORDER BY, LIKE con prefijo \'abc%\'', 'Buscar dentro de textos o arrays'],
          ['Hash', 'Solo igualdad (=) (PostgreSQL, MySQL MEMORY)', 'Rangos y ordenación'],
          ['Bitmap', 'Columnas con pocos valores distintos en tablas casi solo de lectura (almacenes de datos)', 'Tablas con muchas escrituras concurrentes'],
          ['Clave inversa (Oracle)', 'Claves crecientes (números de secuencia) insertadas por muchas sesiones a la vez: reparte la hoja caliente de la derecha', 'Recorridos por rango: destruye el orden de la clave'],
          ['GIN / invertido', 'Búsqueda de texto completo, claves JSON, elementos de arrays', 'Columnas escalares simples'],
          ['BRIN', 'Tablas muy grandes ordenadas por inserción (fechas de un registro) (PostgreSQL)', 'Datos en orden aleatorio'],
        ],
      },
      dialect: 'Oracle · no se ejecuta aquí',
      code: `CREATE INDEX orders_customer_idx ON orders (customer_id);                -- árbol B (por defecto)
CREATE BITMAP INDEX customer_city_bix ON customer (city);                -- pocos valores distintos, almacén de datos
CREATE INDEX orders_id_rev ON orders (order_id) REVERSE;                 -- clave inversa
CREATE INDEX customer_email_ci ON customer (LOWER(email));               -- basado en funciones
CREATE UNIQUE INDEX open_order_uq ON orders (CASE WHEN status = 'OPEN' THEN customer_id END);  -- único «parcial»`,
      mistake: 'Crear un índice bitmap en una tabla que muchas sesiones actualizan a la vez. Cada cambio bloquea un rango entero de filas del mapa de bits, así que los escritores se esperan unos a otros.',
    },

    /* ───────────── Agrupamiento (clustering) ───────────── */
    {
      id: 'clustered-index',
      hub: 'clustering',
      topic: 'clustering',
      title: 'Índices agrupados y no agrupados',
      summary: 'En un índice **agrupado** (clustered), las propias filas de la tabla se guardan en el orden de la clave, dentro del índice. Una tabla solo puede tener **uno**. Todos los demás índices son **no agrupados**: guardan la clave más un puntero a la fila.',
      body: [
        'Como las claves cercanas se guardan juntas, un índice agrupado es excelente para rangos sobre su clave: todas las matrículas de la asignatura C10 están en los mismos pocos bloques. Un índice no agrupado encuentra cada fila y luego salta a donde esté almacenada.',
        'MySQL InnoDB y SQL Server agrupan por defecto cada tabla por su clave primaria. En InnoDB cada índice secundario guarda el valor de la PK como puntero, así que una PK larga agranda todos los índices.',
        'Las tablas de Oracle son montículos por defecto, pero ofrece la **tabla organizada por índice** (IOT): `ORGANIZATION INDEX` guarda las filas en el árbol B de la clave primaria. En el ejemplo, el plan busca directamente por la clave primaria, sin ninguna consulta adicional a la tabla.',
      ],
      points: [
        'Elige una clave de agrupamiento corta, que no cambie y que coincida con las consultas por rango frecuentes.',
        'Las claves aleatorias (como los UUID aleatorios) dispersan las inserciones por todo el índice agrupado; las claves crecientes se añaden al final.',
      ],
      mistake: 'Confundir un **índice agrupado** (clustered index) con un **clúster de bases de datos**. Lo segundo es un grupo de servidores que trabajan juntos (replicación, alta disponibilidad), un significado de la palabra que no tiene nada que ver.',
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
SELECT * FROM enrolment_by_course;           -- se guarda en el orden de la clave (sin ORDER BY el orden nunca está garantizado)
EXPLAIN PLAN FOR SELECT * FROM enrolment_by_course WHERE course_id = 'C10';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);`,
      },
    },
    {
      id: 'physical-order',
      hub: 'clustering',
      topic: 'clustering',
      title: 'Clústeres de tablas en Oracle (y CLUSTER en PostgreSQL)',
      summary: 'Un **clúster de tablas** de Oracle guarda en los mismos bloques las filas de varias tablas que comparten una clave (un departamento y sus empleados), lo que acelera las combinaciones por esa clave. PostgreSQL no tiene algo así: su orden `CLUSTER` reescribe una vez la tabla en el orden de un índice.',
      body: [
        'En un clúster, el valor de la **clave del clúster** se guarda una sola vez y todas las filas de cada tabla con esa clave quedan juntas: leer un departamento y sus asignaturas toca pocos bloques. El precio son inserciones más lentas y recorridos completos de una sola tabla más costosos, porque sus filas están mezcladas con las de las demás. Úsalo para tablas que casi siempre se combinan y rara vez se modifican.',
        'Las **tablas organizadas por índice** de Oracle (ficha anterior) se comportan como un índice agrupado. Las tablas de PostgreSQL son montículos sin orden: tras `CLUSTER orders USING orders_date_idx`, las filas de la misma fecha quedan juntas, pero las nuevas van donde haya hueco, así que el orden se degrada y el comando, que bloquea la tabla, hay que repetirlo.',
      ],
      dialect: 'Oracle · no se ejecuta aquí',
      code: `CREATE CLUSTER dept_cluster (dept_id VARCHAR2(3));
CREATE INDEX dept_cluster_idx ON CLUSTER dept_cluster;      -- un clúster necesita su índice

CREATE TABLE department (
  dept_id VARCHAR2(3) PRIMARY KEY,
  name    VARCHAR2(30) NOT NULL
) CLUSTER dept_cluster (dept_id);

CREATE TABLE course (
  course_id VARCHAR2(3) PRIMARY KEY,
  title     VARCHAR2(40) NOT NULL,
  dept_id   VARCHAR2(3) NOT NULL REFERENCES department (dept_id)
) CLUSTER dept_cluster (dept_id);                           -- en los mismos bloques que su departamento`,
      mistake: 'Agrupar tablas que se actualizan constantemente o que se leen a menudo por separado. Los clústeres solo compensan con datos estables que se leen juntos.',
    },

    /* ───────────── Particionado ───────────── */
    {
      id: 'partitioning',
      hub: 'partitioning',
      topic: 'partitioning',
      title: 'Particionado horizontal',
      summary: 'El **particionado** divide una tabla grande en trozos más pequeños, las **particiones**, según una **clave de particionado**. Las consultas siguen usando el nombre de la tabla única; el SGBD envía cada fila a su partición.',
      body: [
        'El particionado **por rango** pone cada intervalo de la clave en una partición (una por mes de pedidos). El particionado **por lista** usa valores explícitos (una por país). El particionado **por hash** reparte las filas de forma uniforme según un hash de la clave, cuando no hay un rango natural.',
        'Cada partición es una tabla real con su propio almacenamiento e índices, así que el mantenimiento trabaja sobre un trozo cada vez.',
        'El particionado es una opción de Oracle que el entorno del navegador no puede simular; FreeSQL sí lo ejecuta. Desde Oracle 12c puedes usar incluso particionado por **intervalo**: el SGBD crea solo una partición nueva cuando llega una fila fuera de las existentes.',
      ],
      table: {
        caption: 'Cómo elegir el método',
        head: ['Método', 'Clave típica', 'Úsalo cuando'],
        rows: [
          ['Por rango', 'Fecha, rangos de identificadores', 'Las consultas y la retención de datos van por tiempo'],
          ['Por lista', 'País, región, estado', 'Unos pocos valores conocidos separan los datos'],
          ['Por hash', 'Identificador de cliente', 'Necesitas tamaños parecidos y no hay un rango natural'],
        ],
      },
      dialect: 'Oracle · no se ejecuta aquí',
      code: `CREATE TABLE orders (
  order_id    NUMBER(10),
  customer_id NUMBER(10) NOT NULL,
  order_date  DATE NOT NULL,
  total       NUMBER(10,2) NOT NULL
)
PARTITION BY RANGE (order_date) (
  PARTITION p2025_01 VALUES LESS THAN (DATE '2025-02-01'),
  PARTITION p2025_02 VALUES LESS THAN (DATE '2025-03-01'),
  PARTITION p_max    VALUES LESS THAN (MAXVALUE)             -- filas fuera de todos los rangos
);

-- Oracle crea solo las particiones mensuales:
-- PARTITION BY RANGE (order_date) INTERVAL (NUMTOYMINTERVAL(1, 'MONTH')) (PARTITION p_first VALUES LESS THAN (DATE '2025-01-01'))

CREATE INDEX orders_customer_ix ON orders (customer_id) LOCAL;   -- un segmento de índice por partición`,
      mistake: 'Particionar una tabla pequeña. Por debajo de muchos millones de filas, un buen índice suele ser más sencillo e igual de rápido.',
    },
    {
      id: 'pruning',
      hub: 'partitioning',
      topic: 'partitioning',
      title: 'Poda de particiones y mantenimiento',
      summary: 'Cuando el WHERE fija la clave de particionado, el optimizador lee solo las particiones que coinciden: la **poda de particiones** (partition pruning). Los datos antiguos se pueden eliminar entonces borrando una partición entera en lugar de millones de filas.',
      body: [
        'Con particiones mensuales, una consulta sobre febrero de 2025 lee solo la partición `p2025_02`: el plan de Oracle muestra `PARTITION RANGE SINGLE` con `Pstart = Pstop = 2`. Una consulta que no filtra por `order_date` tiene que visitar todas las particiones (`PARTITION RANGE ALL`), lo que puede ser más lento que una única tabla grande e indexada.',
        'La retención sale barata: `ALTER TABLE … DROP PARTITION` o `EXCHANGE PARTITION` sobre la más antigua. Eso tarda milisegundos, mientras que `DELETE … WHERE order_date < …` escribe cada fila borrada en los registros de deshacer y rehacer (undo y redo).',
      ],
      points: [
        'Elige la clave de particionado a partir de los filtros más frecuentes.',
        'Un índice **local** tiene un segmento por partición y se mantiene válido al borrar una partición; un índice único debe incluir la clave de particionado para ser local.',
      ],
      dialect: 'Oracle · no se ejecuta aquí',
      code: `EXPLAIN PLAN FOR SELECT SUM(total) FROM orders
WHERE order_date >= DATE '2025-02-01' AND order_date < DATE '2025-03-01';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
-- | Id | Operation              | Name   | Pstart | Pstop |
-- |  2 |  PARTITION RANGE SINGLE|        |      2 |     2 |    <- solo se lee una partición
-- |  3 |   TABLE ACCESS FULL    | ORDERS |      2 |     2 |

ALTER TABLE orders DROP PARTITION p2025_01 UPDATE INDEXES;   -- se elimina un mes entero de una vez
ALTER TABLE orders EXCHANGE PARTITION p2025_01 WITH TABLE orders_2025_01_archive;  -- …o se saca como tabla`,
      mistake: 'Particionar por una columna por la que las consultas casi nunca filtran. Sin poda, cada consulta visita todas las particiones.',
    },
    {
      id: 'vertical-sharding',
      hub: 'partitioning',
      topic: 'partitioning',
      title: 'Particionado vertical y sharding',
      summary: 'El particionado **vertical** divide las **columnas** de una tabla en dos tablas con la misma clave. El **sharding** (fragmentación horizontal entre servidores) reparte las **filas** entre distintos **servidores**, cada uno con su propia base de datos.',
      body: [
        'El particionado vertical lleva las columnas poco usadas o muy grandes (una foto, una biografía larga) a una tabla 1:1, de modo que la parte de cada fila que se lee con frecuencia es pequeña y caben más filas en cada bloque. Es la misma transformación 1:1 de la sección ER → Lógico, usada por rendimiento.',
        'El sharding es particionado horizontal entre máquinas: los clientes de la A a la M en un servidor y de la N a la Z en otro. Escala las escrituras y el almacenamiento más allá de un servidor, pero las combinaciones y las transacciones entre shards se complican, y la aplicación o un middleware tiene que dirigir cada consulta.',
      ],
      table: {
        caption: 'Tres formas de dividir',
        head: ['Técnica', 'Divide', 'Dónde están los trozos', 'Coste principal'],
        rows: [
          ['Particionado horizontal', 'Filas', 'La misma base de datos', 'Las consultas sin la clave visitan todas las particiones'],
          ['Particionado vertical', 'Columnas', 'La misma base de datos', 'Una combinación para leer la fila completa'],
          ['Sharding', 'Filas', 'Servidores distintos', 'Combinaciones y transacciones entre shards'],
        ],
      },
      mistake: 'Recurrir al sharding antes de necesitarlo. Los índices, el particionado, las réplicas de lectura y un servidor más potente resuelven la mayoría de los problemas con mucha menos complejidad.',
    },

    /* ───────────── Eficiencia ───────────── */
    {
      id: 'query-plan',
      hub: 'efficiency',
      topic: 'efficiency',
      title: 'Leer un plan de ejecución',
      summary: 'SQL dice **qué** quieres; el **optimizador** decide **cómo**: qué índice, qué orden de combinación, qué algoritmo. **EXPLAIN PLAN** muestra ese plan, y en el plan es donde se entienden las consultas lentas.',
      body: [
        'El optimizador estima el coste de varios planes a partir de **estadísticas** sobre los datos (número de filas, valores distintos) y elige el más barato. Oracle las recopila automáticamente por la noche; actualízalas tú tras cambios grandes con `EXEC DBMS_STATS.GATHER_TABLE_STATS(USER, \'ORDERS\')` (`ANALYZE` en PostgreSQL, `ANALYZE TABLE` en MySQL).',
        'Busca un **TABLE ACCESS FULL** (lectura completa de la tabla) sobre una tabla grande dentro de una combinación o de un filtro selectivo: suele indicar que falta un índice. En el ejemplo, la combinación de cada cliente con sus pedidos lee todo `orders` hasta que se indexa la clave ajena.',
        'Para ver tiempos y número de filas reales junto a las estimaciones, ejecuta la consulta con la pista `/*+ GATHER_PLAN_STATISTICS */` y muestra el plan con `DBMS_XPLAN.DISPLAY_CURSOR` (PostgreSQL: `EXPLAIN ANALYZE`).',
      ],
      points: [
        'TABLE ACCESS FULL = leer todas las filas; INDEX RANGE SCAN / INDEX UNIQUE SCAN = bajar por un índice.',
        'SORT ORDER BY = una ordenación adicional; un índice en ese orden la evita.',
      ],
      mistake: 'Optimizar por intuición. Lee primero el plan: la parte lenta a menudo no está donde esperas.',
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
      title: 'Condiciones que pueden usar un índice',
      summary: 'Un índice sobre una columna solo ayuda cuando la condición compara la **columna tal cual**. Envolverla en una función o un cálculo la oculta al índice: la consulta recorre la tabla.',
      body: [
        'Una condición que puede usar un índice se llama **sargable** (de *search argument*, argumento de búsqueda). `signup_date >= DATE \'2024-01-01\'` es sargable; `TO_CHAR(signup_date, \'YYYY\') = \'2024\'` no lo es, aunque signifique lo mismo, porque el índice está ordenado por `signup_date`, no por sus cuatro primeros caracteres.',
        'Reescribe la condición sobre la columna (un rango de fechas en lugar de extraer el año) o crea un **índice sobre expresión** con exactamente la expresión que consultas, como con `LOWER(email)` en el ejemplo (Oracle lo llama índice basado en funciones).',
        'Lee con atención el primer plan: puede decir **INDEX FAST FULL SCAN**. El SGBD lee el índice entero en lugar de la tabla entera, porque el índice es más pequeño, pero sigue visitando todas las entradas. Solo un **INDEX RANGE SCAN** significa que ha ido directamente a la parte que coincide.',
        'Lo mismo ocurre con `LIKE \'%texto\'` (un comodín al principio) y con operaciones aritméticas sobre la columna (`price * 1.21 > 100`).',
      ],
      mistake: 'Añadir un índice y dar por hecho que la consulta lo usará. Comprueba el plan; basta una función sobre la columna para que el índice no sirva.',
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
      title: 'Escribir consultas eficientes',
      summary: 'Pide a la base de datos exactamente lo que necesitas, en **una sola sentencia orientada a conjuntos**, y deja que haga el trabajo cerca de los datos: filtra, combina y agrega en SQL, no fila a fila en la aplicación.',
      body: [
        'El **problema N+1**: un programa lee 100 clientes y luego lanza una consulta por cliente para obtener sus pedidos, 101 consultas en total. Una sola combinación o una consulta con `IN (…)` devuelve los mismos datos en un único viaje de ida y vuelta.',
        'Un UPDATE orientado a conjuntos modifica miles de filas en una sentencia; un bucle que las actualiza de una en una paga cada vez el coste fijo de la sentencia y mantiene la transacción abierta más tiempo.',
      ],
      points: [
        'Selecciona solo las columnas que usas; `SELECT *` lee y envía más datos e impide que los índices de cobertura ayuden.',
        'Usa `EXISTS` para preguntar «¿hay alguno?» en lugar de `COUNT(*) > 0`: puede detenerse en la primera coincidencia.',
        'Pagina con `ORDER BY … FETCH FIRST n ROWS ONLY` (`OFFSET m ROWS` para saltar filas), idealmente sobre una columna indexada.',
        'Combina y filtra por claves indexadas, y mantén las transacciones cortas.',
      ],
      example: 'La última consulta del ejemplo responde a «las 5 ciudades con más gasto en 2024» con una sola sentencia, en lugar de cargar todos los pedidos en el programa.',
      mistake: 'Traer una tabla entera para filtrarla en la aplicación. La base de datos puede usar índices y enviar solo las filas que coinciden; el programa no puede hacer ninguna de las dos cosas.',
      sql: {
        setup: `${SHOP}
CREATE INDEX idx_orders_customer ON orders (customer_id);`,
        query: `-- «¿Ha hecho algún pedido el cliente 42?»: EXISTS puede detenerse en el primer pedido
SELECT CASE WHEN EXISTS (SELECT 1 FROM orders WHERE customer_id = 42) THEN 'yes' ELSE 'no' END AS has_orders FROM dual;
-- Una sentencia orientada a conjuntos en lugar de un bucle sobre cada pedido
UPDATE orders SET total = ROUND(total * 0.9, 2) WHERE order_date < DATE '2023-02-01';
COMMIT;
-- Solo las columnas y filas necesarias, agregadas en la base de datos
SELECT c.city, COUNT(*) AS orders, ROUND(SUM(o.total), 2) AS spent
FROM orders o JOIN customer c ON c.customer_id = o.customer_id
WHERE o.order_date BETWEEN DATE '2024-01-01' AND DATE '2024-12-31'
GROUP BY c.city
ORDER BY spent DESC
FETCH FIRST 5 ROWS ONLY;`,
      },
    },
  ];

  DATA.es.SQL_QUIZ_TOPICS = {
    oracle: 'Oracle y FreeSQL',
    querying: 'Consultas',
    joins: 'Combinar tablas',
    aggregation: 'Agregación',
    subqueries: 'Subconsultas y conjuntos',
    functions: 'Funciones',
    languages: 'Lenguajes de SQL',
    constraints: 'Restricciones',
    objects: 'Vistas y objetos del esquema',
    plsql: 'PL/SQL',
    indexes: 'Índices',
    clustering: 'Agrupamiento',
    partitioning: 'Particionado',
    efficiency: 'Eficiencia',
  };

  DATA.es.SQL_QUIZ = [
    { topic: 'oracle', type: 'mc', q: '¿Qué sentencia es Oracle válido para «las 3 mejores notas»?', choices: ['`… ORDER BY grade DESC LIMIT 3`', '`… ORDER BY grade DESC FETCH FIRST 3 ROWS ONLY`', '`SELECT TOP 3 … ORDER BY grade DESC`', '`… ORDER BY grade DESC LIMIT 0, 3`'], answer: 1, why: 'FETCH FIRST es la sintaxis estándar que admite Oracle; LIMIT y TOP son de otros SGBD.' },
    { topic: 'oracle', type: 'fib', q: 'Para ejecutar una consulta sin tabla en Oracle se selecciona de la tabla ficticia ___.', accept: ['dual', 'DUAL'], why: '`SELECT SYSDATE FROM dual`. (Oracle 23ai también admite un SELECT sin FROM.)' },
    { topic: 'oracle', type: 'mc', q: '¿Qué devuelve en Oracle `SELECT name FROM student WHERE email = \'\'`?', choices: ['Los estudiantes con el correo vacío', 'Los estudiantes con el correo NULL', 'Ninguna fila', 'Un error'], answer: 2, why: 'En Oracle \'\' es NULL, y una comparación con NULL nunca es verdadera. Usa IS NULL.' },
    { topic: 'oracle', type: 'tf', q: 'FreeSQL ejecuta tu SQL en una base de datos Oracle real en la nube.', answer: true, why: 'Es la hoja de trabajo en línea y gratuita de Oracle; no se instala nada.' },
    { topic: 'oracle', type: 'mc', q: '¿Qué error da Oracle cuando consultas una tabla que no existe?', choices: ['ORA-00904', 'ORA-00942', 'ORA-00001', 'ORA-02291'], answer: 1, why: 'ORA-00942: table or view does not exist. ORA-00904 es un nombre de columna no válido.' },
    { topic: 'querying', type: 'mc', q: '¿Qué consulta lista cada identificador de departamento de `course` una sola vez?', choices: ['`SELECT dept_id FROM course`', '`SELECT DISTINCT dept_id FROM course`', '`SELECT UNIQUE(dept_id) FROM course`', '`SELECT dept_id FROM course ORDER BY dept_id`'], answer: 1, why: 'DISTINCT elimina las filas repetidas del resultado. ORDER BY solo las ordena; los duplicados se quedan.' },
    { topic: 'querying', type: 'fib', q: 'En Oracle, dos textos se concatenan con el operador ___.', accept: ['||'], why: '`name || \' (\' || country || \')\'`. En Oracle el operador `+` es solo aritmético (ORA-01722).' },
    { topic: 'querying', type: 'mc', q: 'Con `ORDER BY email` (ascendente), ¿dónde coloca Oracle las filas cuyo email es NULL?', choices: ['Al principio', 'Al final', 'En ningún sitio: se filtran', 'En una posición aleatoria'], answer: 1, why: 'Oracle trata NULL como el valor más grande: al final en orden ascendente y al principio en descendente. `NULLS FIRST` lo cambia.' },
    { topic: 'querying', type: 'mc', q: '¿Cómo interpreta Oracle `WHERE a = 1 OR b = 2 AND c = 3`?', choices: ['`(a = 1 OR b = 2) AND c = 3`', '`a = 1 OR (b = 2 AND c = 3)`', 'Falla: los paréntesis son obligatorios', 'De izquierda a derecha, sean cuales sean los operadores'], answer: 1, why: 'AND tiene más precedencia que OR, como × sobre +. Escribe los paréntesis que quieres decir.' },
    { topic: 'querying', type: 'mc', q: '¿Qué notas conserva `WHERE grade BETWEEN 7 AND 8.5`?', choices: ['7 < grade < 8.5', '7 <= grade < 8.5', '7 <= grade <= 8.5', '7 < grade <= 8.5'], answer: 2, why: 'BETWEEN incluye los dos límites: equivale a `grade >= 7 AND grade <= 8.5`.' },
    { topic: 'querying', type: 'mc', q: '¿Qué patrón encuentra los grupos cuyo nombre empieza por la **palabra** "The" (y no "Theo Grant")?', choices: ['`LIKE \'The%\'`', '`LIKE \'The %\'`', '`LIKE \'%The%\'`', '`= \'The%\'`'], answer: 1, why: '`%` admite cualquier carácter, así que `\'The%\'` también encuentra "Theo". El espacio tras The exige la palabra completa. Con `=` el % no es comodín.' },
    { topic: 'querying', type: 'fib', q: 'Para quedarte con los estudiantes sin email escribe `WHERE email ___`.', accept: ['IS NULL', 'is null', 'Is Null'], why: 'Una comparación con NULL (`= NULL`) es desconocida para todas las filas, así que nunca devuelve nada.' },
    { topic: 'querying', type: 'mc', q: '`course` tiene una asignatura sin matrículas. ¿Qué le pasa en `course JOIN enrolment ON …`?', choices: ['Aparece una vez con las columnas de enrolment a NULL', 'No aparece', 'Aparece una vez por estudiante', 'La consulta falla'], answer: 1, why: 'Un INNER JOIN solo conserva las filas que encuentran pareja. Para conservarla hace falta un OUTER JOIN.' },
    { topic: 'joins', type: 'mc', q: '¿Qué combinación conserva todas las asignaturas, incluidas las que no tienen matrículas?', choices: ['`course c JOIN enrolment e ON …`', '`course c LEFT JOIN enrolment e ON …`', '`course c RIGHT JOIN enrolment e ON …`', '`course c CROSS JOIN enrolment e`'], answer: 1, why: 'LEFT JOIN conserva todas las filas de la tabla izquierda (course) y rellena con NULL las columnas de enrolment; RIGHT JOIN conservaría en cambio todas las matrículas.' },
    { topic: 'joins', type: 'fib', q: 'Para listar los clientes sin pedidos: `customer c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_id IS ___`.', accept: ['NULL', 'null'], why: 'Es una anticombinación: un cliente sin pareja recibe NULL en todas las columnas de orders, incluso en su clave primaria.' },
    { topic: 'joins', type: 'mc', q: '`student` tiene 3 filas y `course` tiene 4. ¿Cuántas filas devuelve `student CROSS JOIN course`?', choices: ['3', '4', '7', '12'], answer: 3, why: 'Un CROSS JOIN empareja cada fila con todas las demás: 3 × 4 = 12.' },
    { topic: 'joins', type: 'tf', q: '`A RIGHT JOIN B ON …` devuelve las mismas filas que `B LEFT JOIN A ON …`.', answer: true, why: 'Son imágenes en el espejo; por eso casi todo el mundo escribe solo LEFT JOIN.' },
    { topic: 'joins', type: 'mc', q: '¿Por qué es arriesgado NATURAL JOIN?', choices: ['Es más lento que JOIN … ON', 'Combina por todas las columnas que se llaman igual, así que una columna nueva puede cambiar el resultado sin avisar', 'Oracle no lo admite', 'Siempre devuelve un producto cartesiano'], answer: 1, why: 'La condición de combinación es implícita: añade una columna `name` a una tabla y la combinación empieza a comparar también los nombres.' },
    { topic: 'aggregation', type: 'mc', q: '`student` tiene 3 filas y una de ellas tiene el email NULL. ¿Qué devuelven `COUNT(*)` y `COUNT(email)`?', choices: ['3 y 3', '3 y 2', '2 y 2', '2 y 3'], answer: 1, why: 'COUNT(*) cuenta filas; COUNT(columna) cuenta los valores que no son NULL.' },
    { topic: 'aggregation', type: 'tf', q: '`AVG(grade)` cuenta una nota NULL como 0.', answer: false, why: 'Los agregados ignoran los NULL. Para contar como 0 las notas que faltan, escribe `AVG(NVL(grade, 0))`.' },
    { topic: 'aggregation', type: 'mc', q: '¿Cuál es el orden lógico de evaluación de una consulta?', choices: ['SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY', 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY', 'FROM → GROUP BY → WHERE → SELECT → HAVING → ORDER BY', 'WHERE → FROM → SELECT → GROUP BY → ORDER BY → HAVING'], answer: 1, why: 'Se construyen y filtran las filas, se agrupan, se filtran los grupos, se eligen las columnas y por último se ordena.' },
    { topic: 'aggregation', type: 'mc', q: '`SELECT dept_id, title, COUNT(*) FROM course GROUP BY dept_id` falla. ¿Por qué?', choices: ['COUNT(*) necesita una columna', '`title` no está agregada ni en el GROUP BY', 'GROUP BY siempre necesita HAVING', '`dept_id` debe ir dentro de un agregado'], answer: 1, why: 'Cada grupo devuelve una fila, así que toda columna fuera de un agregado debe estar en el GROUP BY (ORA-00979).' },
    { topic: 'aggregation', type: 'fib', q: 'Para quedarte solo con las asignaturas con al menos dos matrículas tras agrupar, escribe `___ COUNT(*) >= 2`.', accept: ['HAVING', 'having'], why: 'HAVING filtra grupos; WHERE se aplica antes de agrupar y no puede usar agregados.' },
    { topic: 'subqueries', type: 'mc', q: '`WHERE grade = (SELECT grade FROM enrolment WHERE course_id = \'C10\')` falla porque C10 tiene tres matrículas. ¿Qué operador significa «igual a una de ellas»?', choices: ['`=`', '`IN`', '`LIKE`', '`BETWEEN`'], answer: 1, why: 'Una comparación de una fila no admite una lista (ORA-01427); IN (o = ANY) sí.' },
    { topic: 'subqueries', type: 'tf', q: '`WHERE x NOT IN (SELECT …)` no devuelve ninguna fila si la subconsulta devuelve un NULL.', answer: true, why: '`x <> NULL` es desconocido, así que el AND de todas las comparaciones nunca es cierto. Descarta los NULL o usa NOT EXISTS.' },
    { topic: 'subqueries', type: 'mc', q: '`grade > ALL (SELECT grade FROM enrolment WHERE course_id = \'C10\')` significa que la nota es…', choices: ['mayor que la nota más baja de C10', 'mayor que la nota más alta de C10', 'igual a alguna nota de C10', 'mayor que la nota media de C10'], answer: 1, why: 'ALL debe cumplirse para todos los valores de la lista, así que la nota tiene que superar la mayor. `> ANY` solo necesitaría superar la menor.' },
    { topic: 'subqueries', type: 'mc', q: '¿Qué hace que una subconsulta sea **correlacionada**?', choices: ['Que está escrita en la cláusula FROM', 'Que usa una columna de la consulta exterior, así que se evalúa para cada fila exterior', 'Que devuelve varias filas', 'Que usa GROUP BY'], answer: 1, why: 'Por ejemplo `WHERE x.course_id = e.course_id`, donde `e` pertenece a la consulta exterior.' },
    { topic: 'subqueries', type: 'mc', q: '¿Qué operador de conjuntos conserva las filas repetidas?', choices: ['UNION', 'UNION ALL', 'INTERSECT', 'MINUS'], answer: 1, why: 'UNION ALL simplemente añade el segundo resultado al primero; los demás eliminan los duplicados.' },
    { topic: 'functions', type: 'mc', q: '¿Qué devuelve `SUBSTR(\'Database\', 1, 4)`?', choices: ['`Data`', '`atab`', '`Dat`', '`base`'], answer: 0, why: 'Las posiciones empiezan en 1: cuatro caracteres a partir del primero.' },
    { topic: 'functions', type: 'mc', q: '¿Qué expresión devuelve el 28 de febrero de 2026?', choices: ['`DATE \'2026-01-31\' + 30`', '`ADD_MONTHS(DATE \'2026-01-31\', 1)`', '`TRUNC(DATE \'2026-01-31\', \'MM\')`', '`DATE \'2026-01-31\' + 1`'], answer: 1, why: 'ADD_MONTHS avanza meses de calendario y se queda en el final de mes; sumar 30 días da el 2 de marzo.' },
    { topic: 'functions', type: 'fib', q: 'La función de Oracle que devuelve su segundo argumento cuando el primero es NULL es ___.', accept: ['NVL', 'nvl'], why: '`NVL(email, \'no email\')`. COALESCE hace lo mismo con cualquier número de argumentos.' },
    { topic: 'functions', type: 'mc', q: '¿Qué devuelve `CASE WHEN grade >= 5 THEN \'pass\' WHEN grade >= 9 THEN \'distinction\' ELSE \'fail\' END` para un 9,5?', choices: ['pass', 'distinction', 'fail', 'NULL'], answer: 0, why: 'CASE devuelve la primera rama que es cierta. Pon primero la condición más estricta.' },
    { topic: 'functions', type: 'tf', q: '`ROUND(7.456, 2)` y `TRUNC(7.456, 2)` devuelven el mismo valor.', answer: false, why: 'ROUND da 7,46; TRUNC simplemente corta los dígitos que sobran y da 7,45.' },
    { topic: 'objects', type: 'tf', q: 'Una vista normal guarda una copia de las filas que devuelve su consulta.', answer: false, why: 'Una vista guarda la consulta; se vuelve a ejecutar cada vez sobre los datos actuales. La que guarda filas es la vista materializada.' },
    { topic: 'objects', type: 'mc', q: '¿Qué hace `WITH CHECK OPTION` en una vista?', choices: ['Prohíbe cualquier cambio a través de la vista', 'Rechaza los INSERT y UPDATE a través de la vista que producen filas que la vista no puede ver', 'Comprueba las restricciones de la tabla base', 'Refresca la vista'], answer: 1, why: 'Los cambios a través de la vista deben quedar dentro de su WHERE. La opción que prohíbe todo cambio es WITH READ ONLY.' },
    { topic: 'objects', type: 'mc', q: 'Tu sesión acaba de usar la secuencia `s`. ¿Qué expresión vuelve a dar el mismo número sin sacar uno nuevo?', choices: ['`s.NEXTVAL`', '`s.CURRVAL`', '`s.LASTVAL`', '`SEQUENCE(s)`'], answer: 1, why: 'CURRVAL es el último número que sacó tu sesión con NEXTVAL.' },
    { topic: 'objects', type: 'fib', q: 'Una expresión de tabla común (CTE) empieza por la palabra clave ___.', accept: ['WITH', 'with'], why: '`WITH nombre AS (SELECT …) SELECT … FROM nombre`.' },
    { topic: 'objects', type: 'mc', q: '¿Qué es un sinónimo?', choices: ['Una copia de una tabla', 'Otro nombre para un objeto', 'Una vista de solo lectura', 'Una secuencia compartida por varias tablas'], answer: 1, why: 'Un apodo como `grades` para `hr.enrolment`. Por sí solo no concede ningún privilegio.' },
    { topic: 'plsql', type: 'mc', q: '¿Cuál es el ciclo de vida de un cursor explícito?', choices: ['OPEN → DECLARE → FETCH → CLOSE', 'DECLARE → OPEN → FETCH (en un bucle) → CLOSE', 'DECLARE → FETCH → OPEN → CLOSE', 'FETCH → OPEN → CLOSE → DECLARE'], answer: 1, why: 'Declara la consulta, ábrela, recupera fila tras fila hasta %NOTFOUND y ciérrala. Un bucle FOR de cursor hace los pasos intermedios por ti.' },
    { topic: 'plsql', type: 'fib', q: 'Un `SELECT … INTO` que no encuentra ninguna fila lanza la excepción ___.', accept: ['NO_DATA_FOUND', 'no_data_found', 'no data found'], why: 'Si encuentra varias filas, lanza TOO_MANY_ROWS.' },
    { topic: 'plsql', type: 'tf', q: 'En un disparador de fila, `:OLD` contiene los valores de la fila antes del cambio.', answer: true, why: '`:NEW` contiene los valores de después. En un INSERT los valores :OLD son NULL.' },
    { topic: 'plsql', type: 'mc', q: '¿En qué se diferencian una función y un procedimiento?', choices: ['Solo una función puede tener parámetros', 'Una función devuelve un valor y se puede usar en una expresión o en una consulta', 'Solo un procedimiento se guarda en la base de datos', 'Un procedimiento siempre es más rápido'], answer: 1, why: 'Una función es una calculadora que devuelve una respuesta; un procedimiento es una máquina que hace algo.' },
    { topic: 'plsql', type: 'mc', q: 'Todas las notas deben pasar a ser `LEAST(grade + 1, 10)`. ¿Cuál es la mejor forma?', choices: ['Un bucle con cursor que actualice las filas de una en una', 'Una sola sentencia UPDATE', 'Un disparador sobre enrolment', 'Una variable de paquete'], answer: 1, why: 'Cuando basta una fórmula sobre los valores de la propia fila, un único UPDATE de conjunto es más sencillo y mucho más rápido que un bucle con cursor.' },
    { topic: 'languages', type: 'mc', q: '¿A qué sublenguaje pertenece `ALTER TABLE`?', choices: ['DDL', 'DML', 'DCL', 'TCL'], answer: 0, why: 'Cambia la estructura de una tabla, así que es definición de datos.' },
    { topic: 'languages', type: 'mc', q: '¿Qué sentencia forma parte de DCL?', choices: ['`COMMIT`', '`GRANT`', '`TRUNCATE`', '`MERGE`'], answer: 1, why: 'GRANT y REVOKE controlan los privilegios. COMMIT es TCL, TRUNCATE es DDL y MERGE es DML.' },
    { topic: 'languages', type: 'tf', q: 'Un `DELETE` sin cláusula WHERE elimina todas las filas de la tabla.', answer: true, why: 'Sin filtro, todas las filas cumplen la condición.' },
    { topic: 'languages', type: 'fib', q: 'Para deshacer todos los cambios de la transacción actual se ejecuta ___.', accept: ['ROLLBACK', 'rollback'], why: 'ROLLBACK deshace todo desde que empezó la transacción; ROLLBACK TO SAVEPOINT deshace solo lo posterior al punto de guardado.' },
    { topic: 'languages', type: 'mc', q: 'En Oracle, ¿cuándo empieza una transacción?', choices: ['Con la sentencia BEGIN', 'Con tu primer INSERT, UPDATE o DELETE', 'Con cada SELECT', 'Solo tras SET TRANSACTION'], answer: 1, why: 'Oracle no tiene BEGIN para transacciones (BEGIN inicia un bloque PL/SQL): el primer DML abre una, y COMMIT o ROLLBACK la cierra.' },
    { topic: 'languages', type: 'tf', q: 'En Oracle, un CREATE TABLE en mitad de una transacción se puede deshacer con ROLLBACK.', answer: false, why: 'El DDL confirma la transacción abierta antes y después de ejecutarse, así que ya no se puede deshacer nada de lo anterior.' },
    { topic: 'languages', type: 'mc', q: '¿Qué consulta devuelve las 5 primeras filas en Oracle?', choices: ['`SELECT * FROM t LIMIT 5`', '`SELECT TOP 5 * FROM t`', '`SELECT * FROM t FETCH FIRST 5 ROWS ONLY`', '`SELECT * FROM t LIMIT 0, 5`'], answer: 2, why: 'LIMIT y TOP son de otros SGBD. Oracle usa el estándar FETCH FIRST … ROWS ONLY (desde 12c).' },
    { topic: 'languages', type: 'fib', q: 'El nombre en Oracle del operador de conjuntos que SQLite y PostgreSQL llaman EXCEPT es ___.', accept: ['MINUS', 'minus'], why: 'Oracle usa MINUS (las versiones recientes también aceptan EXCEPT).' },
    { topic: 'languages', type: 'mc', q: '¿Dónde hay que filtrar los grupos por un agregado, como `AVG(grade) > 7`?', choices: ['WHERE', 'HAVING', 'ORDER BY', 'FROM'], answer: 1, why: 'WHERE se aplica antes de agrupar; HAVING filtra los grupos después.' },
    { topic: 'languages', type: 'mc', q: '¿Cuál de estas sentencias se puede deshacer con ROLLBACK?', choices: ['`TRUNCATE TABLE member`', '`DELETE FROM member`', '`DROP TABLE member PURGE`', '`ALTER TABLE member DROP COLUMN fee`'], answer: 1, why: 'DELETE es DML y espera al COMMIT. Las otras tres son DDL: confirman en el acto.' },
    { topic: 'languages', type: 'tf', q: 'Una clave primaria compuesta, como `(team_id, shirt)`, debe escribirse como restricción fuera de línea, tras las columnas.', answer: true, why: 'Una restricción en línea pertenece a una sola columna; una clave de varias columnas va después de la lista de columnas.' },
    { topic: 'languages', type: 'mc', q: '¿Qué hábito te protege antes de ejecutar un UPDATE o un DELETE?', choices: ['Ejecutarlo dos veces', 'Ejecutar primero su WHERE como un SELECT', 'Escribir COMMIT antes', 'Borrar los índices'], answer: 1, why: 'El SELECT muestra exactamente las filas que cambiará la sentencia; después mantén el mismo WHERE.' },
    { topic: 'constraints', type: 'tf', q: 'Una tabla puede tener varias restricciones UNIQUE pero solo una clave primaria.', answer: true, why: 'Hay una única clave primaria; cualquier otra clave candidata se declara UNIQUE.' },
    { topic: 'constraints', type: 'mc', q: 'Una matrícula referencia a un estudiante con `ON DELETE CASCADE`. ¿Qué ocurre al borrar ese estudiante?', choices: ['Se rechaza el borrado', 'Se borran también sus matrículas', 'La clave ajena de sus matrículas pasa a NULL', 'Nada: las matrículas conservan el identificador antiguo'], answer: 1, why: 'CASCADE propaga el borrado a las filas hijas.' },
    { topic: 'constraints', type: 'mc', q: 'En Oracle, ¿qué ocurre al borrar una fila padre con hijas si la clave ajena no tiene cláusula ON DELETE?', choices: ['Se borran las hijas', 'La clave ajena de las hijas pasa a NULL', 'El borrado falla con ORA-02292', 'El padre se marca como borrado'], answer: 2, why: 'Sin acción, Oracle rechaza el borrado mientras haya hijas: «child record found».' },
    { topic: 'constraints', type: 'mc', q: '¿Qué acciones ON DELETE admite Oracle?', choices: ['CASCADE, SET NULL y ninguna acción', 'CASCADE, RESTRICT y SET DEFAULT', 'Solo CASCADE', 'Admite también ON UPDATE CASCADE'], answer: 0, why: 'Oracle no tiene acciones RESTRICT, SET DEFAULT ni ON UPDATE.' },
    { topic: 'constraints', type: 'tf', q: '`CHECK (grade BETWEEN 0 AND 10)` rechaza una fila cuya nota es NULL.', answer: false, why: 'Un CHECK solo falla cuando la condición es falsa; con NULL es desconocida, así que se supera. Añade NOT NULL para exigir un valor.' },
    { topic: 'constraints', type: 'fib', q: 'La cláusula que da su valor a una columna cuando un INSERT no la menciona es ___.', accept: ['DEFAULT', 'default'], why: 'Por ejemplo, `status VARCHAR2(10) DEFAULT \'open\' NOT NULL`.' },
    { topic: 'constraints', type: 'tf', q: 'En Oracle, una cadena vacía \'\' se almacena como NULL.', answer: true, why: 'Oracle no distingue la cadena vacía de NULL: `WHERE name = \'\'` nunca coincide con ninguna fila.' },
    { topic: 'indexes', type: 'mc', q: 'Sin ningún índice sobre `email`, ¿cómo resuelve el SGBD `WHERE email = \'x\'`?', choices: ['Búsqueda binaria en la tabla', 'Lee todas las filas (recorrido completo)', 'Usa la clave primaria', 'No puede responder a la consulta'], answer: 1, why: 'Las filas no están ordenadas por email, así que hay que comprobarlas todas.' },
    { topic: 'indexes', type: 'mc', q: 'Con un índice sobre `(city, signup_date)`, ¿qué filtro NO puede usarlo para acotar la búsqueda?', choices: ['`city = \'Madrid\'`', '`city = \'Madrid\' AND signup_date > DATE \'2024-01-01\'`', '`signup_date > DATE \'2024-01-01\'`', '`city IN (\'Madrid\', \'Bilbao\')`'], answer: 2, why: 'Regla del prefijo izquierdo: sin la primera columna, las fechas están repartidas por todo el índice.' },
    { topic: 'indexes', type: 'tf', q: 'Añadir índices hace más rápidos los INSERT y los UPDATE.', answer: false, why: 'Cada escritura debe actualizar también todos los índices de la tabla, así que las escrituras se vuelven más lentas.' },
    { topic: 'indexes', type: 'mc', q: 'Una consulta se responde solo con el índice, sin leer la tabla. Ese índice es…', choices: ['agrupado', 'de cobertura para esa consulta', 'un índice hash', 'parcial'], answer: 1, why: 'Contiene todas las columnas que necesita la consulta.' },
    { topic: 'indexes', type: 'mc', q: '¿Qué índice de Oracle conviene para una columna con 3 valores distintos en un almacén de datos de solo lectura?', choices: ['Bitmap', 'De clave inversa', 'Árbol B único', 'Ninguno: Oracle no tiene ese índice'], answer: 0, why: 'Los índices bitmap son compactos para columnas de baja cardinalidad, pero perjudican las escrituras concurrentes.' },
    { topic: 'indexes', type: 'mc', q: '¿Qué tipo de índice puede resolver `WHERE price BETWEEN 10 AND 20 ORDER BY price`?', choices: ['Hash', 'Árbol B', 'GIN', 'Ninguno'], answer: 1, why: 'Solo una estructura ordenada como un árbol B sirve para rangos y ordenación.' },
    { topic: 'indexes', type: 'tf', q: 'Un índice sobre una columna sí/no suele ayudar a una consulta que devuelve la mitad de la tabla.', answer: false, why: 'Con una selectividad tan baja, leer la tabla directamente cuesta lo mismo que pasar por el índice.' },
    { topic: 'clustering', type: 'mc', q: '¿Cuántos índices agrupados puede tener una tabla?', choices: ['Ninguno', 'Uno', 'Uno por columna', 'Tantos como hagan falta'], answer: 1, why: 'Las filas solo se pueden guardar en un orden físico.' },
    { topic: 'clustering', type: 'tf', q: 'En MySQL InnoDB cada tabla está agrupada por su clave primaria.', answer: true, why: 'InnoDB guarda las filas dentro del árbol B+ de la clave primaria; los índices secundarios apuntan a la PK.' },
    { topic: 'clustering', type: 'mc', q: '¿Qué estructura de Oracle guarda las filas de una tabla dentro de su árbol B de clave primaria?', choices: ['Clúster de tablas', 'Tabla organizada por índice (ORGANIZATION INDEX)', 'Índice bitmap', 'Tabla particionada'], answer: 1, why: 'Una IOT se comporta como un índice agrupado.' },
    { topic: 'clustering', type: 'mc', q: 'Tras `CLUSTER orders USING orders_date_idx` en PostgreSQL, las filas nuevas…', choices: ['se mantienen en orden de fecha automáticamente', 'van donde haya hueco, así que el orden se degrada', 'se rechazan hasta que vuelva a ejecutarse CLUSTER', 'van a una partición aparte'], answer: 1, why: 'CLUSTER es una reescritura puntual; las tablas de PostgreSQL son montículos (heaps).' },
    { topic: 'partitioning', type: 'mc', q: 'Una partición por cada mes de `order_date` es…', choices: ['particionado por rango', 'particionado por lista', 'particionado por hash', 'particionado vertical'], answer: 0, why: 'Cada partición contiene un intervalo de la clave.' },
    { topic: 'partitioning', type: 'fib', q: 'Cuando el optimizador lee solo las particiones que pueden cumplir el WHERE, se habla de ___ de particiones.', accept: ['poda', 'pruning'], why: 'La poda de particiones (partition pruning) se salta todas las particiones fuera del rango filtrado.' },
    { topic: 'partitioning', type: 'tf', q: 'Eliminar una partición antigua suele ser mucho más rápido que borrar sus filas con DELETE.', answer: true, why: 'Eliminarla quita una tabla entera de golpe; DELETE escribe cada fila en el registro (log).' },
    { topic: 'partitioning', type: 'mc', q: 'Repartir las filas de una tabla entre varios servidores es…', choices: ['particionado vertical', 'sharding', 'agrupamiento (clustering)', 'replicación'], answer: 1, why: 'El sharding es particionado horizontal entre máquinas.' },
    { topic: 'efficiency', type: 'mc', q: 'Con un índice sobre `signup_date`, ¿qué condición puede usarlo?', choices: ['`TO_CHAR(signup_date, \'YYYY\') = \'2024\'`', '`signup_date >= DATE \'2024-01-01\' AND signup_date < DATE \'2025-01-01\'`', '`TRUNC(signup_date, \'YYYY\') = DATE \'2024-01-01\'`', '`EXTRACT(YEAR FROM signup_date) = 2024`'], answer: 1, why: 'Solo la columna tal cual se puede buscar en el índice; las funciones sobre ella obligan a recorrer.' },
    { topic: 'efficiency', type: 'mc', q: 'Un programa lee 100 clientes y luego lanza una consulta por cliente para sus pedidos. Esto es…', choices: ['un interbloqueo (deadlock)', 'el problema N+1', 'poda de particiones', 'una consulta de cobertura'], answer: 1, why: '101 consultas donde bastaría una combinación.' },
    { topic: 'efficiency', type: 'tf', q: 'El optimizador elige un plan usando estadísticas sobre los datos.', answer: true, why: 'Estima los costes a partir del número de filas y de la distribución de los valores; ANALYZE las actualiza.' },
    { topic: 'efficiency', type: 'fib', q: 'En Oracle, la sentencia que guarda el plan de una consulta sin ejecutarla es EXPLAIN ___ FOR.', accept: ['PLAN', 'plan'], why: 'Después SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY) lo muestra. PostgreSQL y MySQL usan EXPLAIN a secas.' },
    { topic: 'efficiency', type: 'mc', q: 'Un plan de Oracle muestra TABLE ACCESS FULL sobre una tabla grande dentro de una combinación selectiva. La solución habitual es…', choices: ['un índice bitmap en todas las columnas', 'un índice sobre la columna filtrada o combinada', 'hacer COMMIT antes de la consulta', 'SELECT *'], answer: 1, why: 'Una lectura completa de una tabla grande suele indicar que falta un índice en la columna del filtro o de la combinación.' },
  ];

  DATA.es.SQL_SANDBOX = {
    intro: 'Escribe SQL de Oracle sobre las tablas de ejemplo del curso: `department`, `student`, `course` y `enrolment`. Despliega el bloque de **tablas y filas de ejemplo** para ver cómo están definidas, o parte de uno de los ejemplos.',
    setup: SCHOOL,
    examples: [
      { label: 'Estudiantes y notas', sql: `SELECT s.name, c.title, e.grade
FROM enrolment e
JOIN student s ON s.student_id = e.student_id
JOIN course  c ON c.course_id  = e.course_id
ORDER BY s.name;` },
      { label: 'Media por asignatura', sql: `SELECT c.title, COUNT(e.student_id) AS students, ROUND(AVG(e.grade), 2) AS average
FROM course c LEFT JOIN enrolment e ON e.course_id = c.course_id
GROUP BY c.title
ORDER BY average DESC;` },
      { label: 'Asignaturas sin estudiantes', sql: `SELECT c.course_id, c.title
FROM course c
WHERE NOT EXISTS (SELECT 1 FROM enrolment e WHERE e.course_id = c.course_id);` },
      { label: 'Una transacción', sql: `UPDATE enrolment SET grade = grade + 1 WHERE course_id = 'C10';
SELECT * FROM enrolment WHERE course_id = 'C10';
ROLLBACK;
SELECT * FROM enrolment WHERE course_id = 'C10';` },
      { label: 'Un plan de ejecución', sql: `EXPLAIN PLAN FOR
SELECT * FROM enrolment WHERE course_id = 'C10';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
CREATE INDEX idx_enrolment_course ON enrolment (course_id);
EXPLAIN PLAN FOR
SELECT * FROM enrolment WHERE course_id = 'C10';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);` },
      { label: 'Las 2 mejores notas', sql: `SELECT s.name, e.grade
FROM enrolment e JOIN student s ON s.student_id = e.student_id
ORDER BY e.grade DESC
FETCH FIRST 2 ROWS ONLY;` },
      { label: 'Diferencia de conjuntos', sql: `SELECT student_id FROM student
MINUS
SELECT student_id FROM enrolment WHERE course_id = 'C20';` },
    ],
  };
})();
