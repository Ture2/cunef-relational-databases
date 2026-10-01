'use strict';
/* SQL: fichas de conceptos (js/sql.js), test y entorno de pruebas, en español.
   Campos de cada ficha: los de js/concept-section.js, más
     sql      { setup, query, expectError? }: un ejemplo ejecutable en SQLite (js/sql-runner.js). El setup
              se ejecuta primero en una base de datos nueva; la query es lo que edita el estudiante.
              expectError marca los ejemplos cuya última sentencia falla a propósito (la usa la
              autocomprobación del README).
     code + dialect   un ejemplo estático para funciones que SQLite no tiene (roles, particiones…).
   Los ejemplos ejecutables comparten el esquema de matrículas de la sección de Normalización (student,
   course, department, enrolment); las fichas de eficiencia añaden una tabla customer / orders con muchas
   filas. El código SQL (identificadores, datos y sentencias) es idéntico al de data/en/sql.js; solo se
   traducen los comentarios. Mismos ids, orden y respuestas que data/en/sql.js. */
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

  /* 50.000 clientes y 100.000 pedidos, generados con una consulta recursiva (unos 0,2 s). */
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

  DATA.es.SQL_CONCEPTS = [
    /* ───────────── Lenguajes de SQL ───────────── */
    {
      id: 'sql-languages',
      hub: 'languages',
      topic: 'languages',
      title: 'Los sublenguajes de SQL',
      summary: 'SQL es un solo lenguaje con varios **sublenguajes**, agrupados según lo que hace cada sentencia: definir la estructura, trabajar con los datos, controlar quién puede hacer qué y agrupar los cambios en transacciones.',
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
      hub: 'languages',
      topic: 'languages',
      title: 'DDL: definir el esquema',
      summary: '**CREATE** crea un objeto, **ALTER** lo modifica y **DROP** lo elimina, datos incluidos. Con DDL el modelo lógico se convierte en tablas reales.',
      body: [
        'Un `CREATE TABLE` enumera las columnas con sus **tipos** y las **restricciones** que debe cumplir cada fila: clave primaria, claves ajenas, NOT NULL, UNIQUE, CHECK. Al escribirlas en el esquema, el SGBD las hace cumplir a todos los programas que usan los datos.',
        '`ALTER TABLE` añade o quita columnas y restricciones en una tabla que ya tiene datos. `DROP TABLE` borra la definición y todas sus filas. Ejecuta el ejemplo y prueba después `SELECT * FROM course;` tras el DROP: la tabla ya no existe.',
      ],
      points: [
        'Tipos: `INTEGER`, `NUMERIC(p, s)`, `VARCHAR(n)` / `TEXT`, `DATE`, `TIMESTAMP`, `BOOLEAN`… (cada SGBD tiene su propia lista).',
        'Cada sentencia DDL actualiza el diccionario de datos, que se puede consultar: aquí, `sqlite_master`.',
      ],
      mistake: 'Borrar y volver a crear una tabla para cambiar una columna. `ALTER TABLE` conserva las filas; `DROP` las pierde.',
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
      title: 'DML: leer y modificar filas',
      summary: '**SELECT** lee, **INSERT** añade filas, **UPDATE** las modifica y **DELETE** las elimina. UPDATE y DELETE afectan a **todas las filas** que cumplen el WHERE.',
      body: [
        'Un SELECT se evalúa en un orden lógico fijo: `FROM` y `JOIN` construyen las filas, `WHERE` las filtra, `GROUP BY` las agrupa, `HAVING` filtra los grupos, `SELECT` elige las columnas y `ORDER BY` ordena el resultado.',
        'UPDATE y DELETE sin WHERE modifican la tabla entera. Antes de ejecutar uno, escribe el mismo WHERE en un SELECT y comprueba qué filas devuelve.',
      ],
      points: [
        'Las combinaciones (JOIN) siguen las claves ajenas: `enrolment.course_id = course.course_id`.',
        'El ejecutor muestra cuántas filas ha cambiado cada INSERT, UPDATE o DELETE.',
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
      id: 'dcl',
      hub: 'languages',
      topic: 'languages',
      title: 'DCL: usuarios, roles y privilegios',
      summary: '**GRANT** concede un privilegio sobre un objeto a un usuario o rol; **REVOKE** lo retira. Da a cada rol solo lo que necesita: el **principio de mínimo privilegio**.',
      body: [
        'Los privilegios son acciones sobre objetos: `SELECT`, `INSERT`, `UPDATE`, `DELETE` sobre una tabla o vista, `EXECUTE` sobre una función, `CREATE` en un esquema. Concédelos a **roles** (profesor, secretaría, aplicación de informes) en lugar de a cada persona, y haz a los usuarios miembros de esos roles.',
        'Una **vista** más un GRANT es una forma clásica de ocultar datos: el rol de informes puede leer una vista con las medias por asignatura, pero no la tabla con las notas de cada estudiante.',
        'SQLite es una base de datos embebida y monousuario, sin usuarios, así que este ejemplo es de PostgreSQL y no se puede ejecutar aquí.',
      ],
      points: [
        '`WITH GRANT OPTION` permite a quien lo recibe conceder ese mismo privilegio a otros; úsalo con moderación.',
        'REVOKE retira el privilegio a ese rol; sus miembros lo pierden salvo que otro rol se lo siga concediendo.',
      ],
      dialect: 'PostgreSQL · no se ejecuta aquí',
      code: `CREATE ROLE teacher;
CREATE ROLE reporting;
CREATE USER ana PASSWORD 'change-me' IN ROLE teacher;

GRANT SELECT, INSERT, UPDATE ON enrolment TO teacher;
GRANT SELECT ON student, course TO teacher;

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
      body: [
        'Las transacciones proporcionan las propiedades ACID de la sección de Teoría: atomicidad (todo o nada), consistencia (las restricciones se cumplen al confirmar), aislamiento (los demás no ven el trabajo a medias) y durabilidad (un cambio confirmado sobrevive a una caída).',
        'La mayoría de los clientes trabajan en modo **autocommit**: cada sentencia es su propia transacción. `BEGIN` abre una transacción explícita que dura hasta el COMMIT o el ROLLBACK.',
        'En el ejemplo, cambiar a un estudiante de una asignatura a otra es un borrado más una inserción: deben ocurrir las dos, o ninguna.',
      ],
      points: [
        '`SAVEPOINT nombre` … `ROLLBACK TO nombre` deshace solo el trabajo posterior al punto de guardado.',
        'Mantén las transacciones cortas: mientras una está abierta, puede retener bloqueos que hacen esperar a las demás.',
      ],
      example: 'El segundo bloque cambia una nota por error y vuelve al punto de guardado: el cambio de asignatura se conserva, la nota errónea no.',
      mistake: 'Ejecutar un script largo en modo autocommit. Si falla a mitad, la primera mitad queda aplicada y la base de datos se queda en un estado que nadie había previsto.',
      sql: {
        setup: SCHOOL,
        query: `BEGIN;
DELETE FROM enrolment WHERE student_id = 'S03' AND course_id = 'C11';
INSERT INTO enrolment VALUES ('S03', 'C20', NULL);
SAVEPOINT before_grades;
UPDATE enrolment SET grade = 10;              -- ¡uy!: todas las filas
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

    /* ───────────── Restricciones ───────────── */
    {
      id: 'keys-unique',
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
        'Al borrar la fila padre, la acción decide: `RESTRICT` / `NO ACTION` (la opción por defecto) rechaza el borrado mientras haya hijas; `CASCADE` borra también las hijas; `SET NULL` deja vacía la clave ajena en las hijas; `SET DEFAULT` le asigna su valor por defecto. Las mismas opciones existen `ON UPDATE` de la clave padre.',
        'En el esquema de ejemplo, borrar un estudiante borra en cascada sus matrículas, pero no se puede borrar una asignatura que tiene matrículas.',
      ],
      points: [
        'CASCADE encaja con partes que no tienen sentido solas (una matrícula sin su estudiante, una línea de pedido sin su pedido).',
        'RESTRICT protege los datos de referencia (una asignatura, un departamento).',
        'SQLite solo comprueba las claves ajenas tras `PRAGMA foreign_keys = ON`; el ejecutor lo activa.',
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
        'DEFAULT rellena con sensatez las columnas obligatorias: la fecha actual, un estado \'pending\', un contador que empieza en 0.',
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
INSERT INTO loan (book, days) VALUES ('Hopscotch', 90);       -- incumple days_range`,
      },
    },

    /* ───────────── Índices ───────────── */
    {
      id: 'index-basics',
      hub: 'indexes',
      topic: 'indexes',
      title: 'Qué es un índice',
      summary: 'Un **índice** es una estructura aparte y ordenada (normalmente un **árbol B+**) que asocia los valores de algunas columnas con sus filas. Gracias a él, el SGBD puede **buscar** en lugar de **recorrer** toda la tabla.',
      body: [
        'Sin un índice sobre `email`, encontrar un cliente supone leer las 50.000 filas: el plan dice **SCAN customer**. Tras el `CREATE INDEX`, el plan dice **SEARCH customer USING INDEX** y el SGBD baja por el árbol en pocos pasos (consulta la ficha del árbol B+ en la sección de Teoría).',
        'El ejecutor muestra el tiempo de cada sentencia. Compara los dos SELECT idénticos, antes y después del índice.',
        '`EXPLAIN QUERY PLAN` (SQLite) o `EXPLAIN` (PostgreSQL, MySQL) muestra el plan de ejecución sin ejecutar la consulta.',
      ],
      points: [
        'La clave primaria y cada restricción UNIQUE ya tienen un índice.',
        'Las claves ajenas normalmente **no** reciben uno automáticamente; indéxalas si combinas o filtras por ellas.',
      ],
      mistake: 'Pensar que un índice cambia el resultado. Solo cambia la rapidez con que el SGBD encuentra las filas; la consulta devuelve exactamente los mismos datos.',
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
      title: 'Índices compuestos y de cobertura',
      summary: 'Un índice **compuesto** ordena por varias columnas, en orden. Ayuda a las consultas que filtran por sus columnas **más a la izquierda**. Un índice **de cobertura** contiene todas las columnas que necesita una consulta, de modo que no hace falta leer la tabla.',
      body: [
        'Un índice sobre `(city, signup_date)` está ordenado como una guía telefónica por apellido y luego por nombre: encuentra rápido «Madrid, desde 2023», y también «Madrid» a secas. No sirve para «desde 2023» a secas, porque esas fechas están repartidas entre todas las ciudades: esa consulta recorre la tabla.',
        'Pon primero la columna que se compara por **igualdad** y después la que se usa en **rangos** u ordenación.',
        'Cuando la consulta solo usa columnas que están en el índice, el SGBD responde desde el índice: el plan dice **USING COVERING INDEX**.',
      ],
      points: [
        'Regla del prefijo izquierdo: `(a, b, c)` sirve para filtros sobre `a`, `a, b` y `a, b, c`.',
        'Un índice compuesto puede sustituir a varios de una sola columna.',
      ],
      mistake: 'Crear `(signup_date, city)` para consultas que siempre fijan la ciudad y dan un rango de fechas. Con el rango primero, la segunda columna no puede acotar la búsqueda.',
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
      title: 'Tipos de índice',
      summary: 'El **árbol B** es el tipo por defecto y sirve para igualdad, rangos y ordenación. Otros tipos resuelven problemas concretos: **hash** solo para igualdad, **bitmap** para pocos valores distintos, **GIN** para valores dentro de un documento o un array y **BRIN** para tablas enormes ordenadas de forma natural.',
      body: [
        'Los índices también pueden ser **parciales** (solo las filas que cumplen un WHERE, como los pedidos abiertos) o construirse sobre una **expresión** (`lower(email)`), de modo que una consulta que use la misma expresión pueda aprovechar el índice.',
        'Los tipos disponibles dependen del SGBD: PostgreSQL tiene todos los de la tabla salvo bitmap (construye mapas de bits al ejecutar la consulta); Oracle tiene índices bitmap; MySQL InnoDB usa casi exclusivamente árboles B.',
      ],
      table: {
        caption: 'Principales tipos de índice',
        head: ['Tipo', 'Adecuado para', 'No sirve para'],
        rows: [
          ['Árbol B / árbol B+', '=, <, >, BETWEEN, ORDER BY, LIKE con prefijo \'abc%\'', 'Buscar dentro de textos o arrays'],
          ['Hash', 'Solo igualdad (=)', 'Rangos y ordenación'],
          ['Bitmap', 'Columnas con pocos valores distintos en tablas casi solo de lectura (almacenes de datos)', 'Tablas con muchas escrituras concurrentes'],
          ['GIN / invertido', 'Búsqueda de texto completo, claves JSON, elementos de arrays', 'Columnas escalares simples'],
          ['BRIN', 'Tablas muy grandes ordenadas por inserción (fechas de un registro)', 'Datos en orden aleatorio'],
        ],
      },
      dialect: 'PostgreSQL · no se ejecuta aquí',
      code: `CREATE INDEX orders_customer_idx ON orders (customer_id);            -- árbol B (por defecto)
CREATE INDEX session_token_idx  ON session USING hash (token);        -- solo igualdad
CREATE INDEX product_tags_idx   ON product USING gin (tags);          -- tags es text[]
CREATE INDEX log_at_brin        ON access_log USING brin (at);        -- enorme, solo se añade al final
CREATE INDEX open_orders_idx    ON orders (order_date) WHERE status = 'open';   -- parcial
CREATE INDEX customer_email_ci  ON customer (lower(email));           -- sobre expresión`,
      mistake: 'Elegir un índice hash para una columna que se usa en rangos u ORDER BY. No puede resolver ninguno de los dos; solo un árbol B puede.',
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
        'SQLite lo hace con las tablas `WITHOUT ROWID`: las filas se guardan en el árbol B de la clave primaria. En el ejemplo, el plan busca `USING PRIMARY KEY`, sin ninguna consulta adicional a la tabla.',
      ],
      points: [
        'Elige una clave de agrupamiento corta, que no cambie y que coincida con las consultas por rango frecuentes.',
        'Las claves aleatorias (como los UUID aleatorios) dispersan las inserciones por todo el índice agrupado; las claves crecientes se añaden al final.',
      ],
      mistake: 'Confundir un **índice agrupado** (clustered index) con un **clúster de bases de datos**. Lo segundo es un grupo de servidores que trabajan juntos (replicación, alta disponibilidad), un significado de la palabra que no tiene nada que ver.',
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
SELECT * FROM enrolment_by_course;           -- se guarda, y se devuelve, en el orden de la clave
EXPLAIN QUERY PLAN SELECT * FROM enrolment_by_course WHERE course_id = 'C10';`,
      },
    },
    {
      id: 'physical-order',
      hub: 'clustering',
      topic: 'clustering',
      title: 'El orden físico en PostgreSQL y Oracle',
      summary: 'PostgreSQL guarda las tablas como **montículos** (heaps) sin orden. Su orden `CLUSTER` reescribe una vez la tabla en el orden de un índice, pero las filas nuevas no mantienen ese orden. Oracle ofrece tablas organizadas por índice y **clústeres de tablas**.',
      body: [
        'Tras `CLUSTER orders USING orders_date_idx`, las filas de la misma fecha quedan juntas, así que un rango de fechas lee pocos bloques. Las filas nuevas y las actualizadas van donde haya hueco, de modo que el orden se degrada; vuelve a ejecutar CLUSTER en una ventana de mantenimiento. Bloquea la tabla mientras la reescribe.',
        'Las **tablas organizadas por índice** (IOT) de Oracle se comportan como un índice agrupado. Sus **clústeres de tablas** van más allá: las filas de varias tablas que comparten una clave (un departamento y sus empleados) se guardan en los mismos bloques, lo que acelera las combinaciones por esa clave.',
      ],
      dialect: 'PostgreSQL · no se ejecuta aquí',
      code: `CREATE INDEX orders_date_idx ON orders (order_date);
CLUSTER orders USING orders_date_idx;     -- reescribe la tabla en orden de fecha (la bloquea)
ANALYZE orders;                           -- actualiza las estadísticas tras la reescritura

-- Hasta qué punto el orden físico sigue a una columna (1 = perfectamente ordenada):
SELECT attname, correlation FROM pg_stats
WHERE tablename = 'orders' AND attname = 'order_date';`,
      mistake: 'Esperar que CLUSTER mantenga la tabla ordenada. Es una reescritura puntual; solo un verdadero índice agrupado conserva el orden a medida que llegan filas.',
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
        'SQLite no tiene particionado, así que el ejemplo es de PostgreSQL.',
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
      dialect: 'PostgreSQL · no se ejecuta aquí',
      code: `CREATE TABLE orders (
  order_id    bigint,
  customer_id bigint NOT NULL,
  order_date  date   NOT NULL,
  total       numeric(10, 2) NOT NULL,
  PRIMARY KEY (order_id, order_date)          -- la clave de particionado debe formar parte de ella
) PARTITION BY RANGE (order_date);

CREATE TABLE orders_2025_01 PARTITION OF orders
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE orders_2025_02 PARTITION OF orders
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE orders_default PARTITION OF orders DEFAULT;   -- filas fuera de todos los rangos

CREATE INDEX ON orders (customer_id);       -- se crea en cada partición`,
      mistake: 'Particionar una tabla pequeña. Por debajo de muchos millones de filas, un buen índice suele ser más sencillo e igual de rápido.',
    },
    {
      id: 'pruning',
      hub: 'partitioning',
      topic: 'partitioning',
      title: 'Poda de particiones y mantenimiento',
      summary: 'Cuando el WHERE fija la clave de particionado, el optimizador lee solo las particiones que coinciden: la **poda de particiones** (partition pruning). Los datos antiguos se pueden eliminar entonces borrando una partición entera en lugar de millones de filas.',
      body: [
        'Con particiones mensuales, una consulta sobre febrero de 2025 lee solo `orders_2025_02`; el plan ni siquiera menciona los otros meses. Una consulta que no filtra por `order_date` tiene que visitar todas las particiones, lo que puede ser más lento que una única tabla grande e indexada.',
        'La retención sale barata: `DETACH` o `DROP` de la partición más antigua. Eso tarda milisegundos, mientras que `DELETE … WHERE order_date < …` escribe cada fila borrada en el registro (log) y deja espacio muerto.',
      ],
      points: [
        'Elige la clave de particionado a partir de los filtros más frecuentes.',
        'Las restricciones de unicidad y la clave primaria deben incluir la clave de particionado.',
      ],
      dialect: 'PostgreSQL · no se ejecuta aquí',
      code: `EXPLAIN SELECT SUM(total) FROM orders
WHERE order_date >= '2025-02-01' AND order_date < '2025-03-01';
--  Aggregate
--    ->  Seq Scan on orders_2025_02 orders     <- solo se lee una partición

ALTER TABLE orders DETACH PARTITION orders_2025_01;   -- se conserva como tabla normal…
DROP TABLE orders_2025_01;                            -- …o se elimina un mes entero de una vez`,
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
      summary: 'SQL dice **qué** quieres; el **optimizador** decide **cómo**: qué índice, qué orden de combinación, qué algoritmo. **EXPLAIN** muestra ese plan, y en el plan es donde se entienden las consultas lentas.',
      body: [
        'El optimizador estima el coste de varios planes a partir de **estadísticas** sobre los datos (número de filas, valores distintos) y elige el más barato. Actualízalas tras cambios grandes: `ANALYZE` en SQLite y PostgreSQL, `ANALYZE TABLE` en MySQL.',
        'Busca un **SCAN** (lectura completa de la tabla) sobre una tabla grande dentro de una combinación o de un filtro selectivo: suele indicar que falta un índice. En el ejemplo, la combinación de cada cliente con sus pedidos recorre `orders` hasta que se indexa la clave ajena.',
        '`EXPLAIN ANALYZE` de PostgreSQL además ejecuta la consulta y muestra los tiempos y el número de filas reales junto a las estimaciones.',
      ],
      points: [
        'SCAN = leer todas las filas; SEARCH … USING INDEX = bajar por un índice.',
        'USE TEMP B-TREE FOR ORDER BY = una ordenación adicional; un índice en ese orden la evita.',
      ],
      mistake: 'Optimizar por intuición. Lee primero el plan: la parte lenta a menudo no está donde esperas.',
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
      title: 'Condiciones que pueden usar un índice',
      summary: 'Un índice sobre una columna solo ayuda cuando la condición compara la **columna tal cual**. Envolverla en una función o un cálculo la oculta al índice: la consulta recorre la tabla.',
      body: [
        'Una condición que puede usar un índice se llama **sargable** (de *search argument*, argumento de búsqueda). `signup_date >= \'2024-01-01\'` es sargable; `substr(signup_date, 1, 4) = \'2024\'` no lo es, aunque signifique lo mismo, porque el índice está ordenado por `signup_date`, no por sus cuatro primeros caracteres.',
        'Reescribe la condición sobre la columna (un rango de fechas en lugar de extraer el año) o crea un **índice sobre expresión** con exactamente la expresión que consultas, como con `lower(email)` en el ejemplo.',
        'Lee con atención el primer plan: dice **SCAN** … USING COVERING INDEX. El SGBD lee el índice entero en lugar de la tabla entera, porque el índice es más pequeño, pero sigue visitando todas las entradas. Solo **SEARCH** significa que ha ido directamente a la parte que coincide.',
        'Lo mismo ocurre con `LIKE \'%texto\'` (un comodín al principio) y con operaciones aritméticas sobre la columna (`price * 1.21 > 100`).',
      ],
      mistake: 'Añadir un índice y dar por hecho que la consulta lo usará. Comprueba el plan; basta una función sobre la columna para que el índice no sirva.',
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
      title: 'Escribir consultas eficientes',
      summary: 'Pide a la base de datos exactamente lo que necesitas, en **una sola sentencia orientada a conjuntos**, y deja que haga el trabajo cerca de los datos: filtra, combina y agrega en SQL, no fila a fila en la aplicación.',
      body: [
        'El **problema N+1**: un programa lee 100 clientes y luego lanza una consulta por cliente para obtener sus pedidos, 101 consultas en total. Una sola combinación o una consulta con `IN (…)` devuelve los mismos datos en un único viaje de ida y vuelta.',
        'Un UPDATE orientado a conjuntos modifica miles de filas en una sentencia; un bucle que las actualiza de una en una paga cada vez el coste fijo de la sentencia y mantiene la transacción abierta más tiempo.',
      ],
      points: [
        'Selecciona solo las columnas que usas; `SELECT *` lee y envía más datos e impide que los índices de cobertura ayuden.',
        'Usa `EXISTS` para preguntar «¿hay alguno?» en lugar de `COUNT(*) > 0`: puede detenerse en la primera coincidencia.',
        'Pagina con `ORDER BY … LIMIT`, idealmente sobre una columna indexada.',
        'Combina y filtra por claves indexadas, y mantén las transacciones cortas.',
      ],
      example: 'La última consulta del ejemplo responde a «las 5 ciudades con más gasto en 2024» con una sola sentencia, en lugar de cargar todos los pedidos en el programa.',
      mistake: 'Traer una tabla entera para filtrarla en la aplicación. La base de datos puede usar índices y enviar solo las filas que coinciden; el programa no puede hacer ninguna de las dos cosas.',
      sql: {
        setup: `${SHOP}
CREATE INDEX idx_orders_customer ON orders (customer_id);`,
        query: `-- «¿Ha hecho algún pedido el cliente 42?»: EXISTS puede detenerse en el primer pedido
SELECT EXISTS (SELECT 1 FROM orders WHERE customer_id = 42) AS has_orders;
-- Una sentencia orientada a conjuntos en lugar de un bucle sobre cada pedido
UPDATE orders SET total = round(total * 0.9, 2) WHERE order_date < '2023-02-01';
-- Solo las columnas y filas necesarias, agregadas en la base de datos
SELECT c.city, COUNT(*) AS orders, ROUND(SUM(o.total), 2) AS spent
FROM orders o JOIN customer c ON c.customer_id = o.customer_id
WHERE o.order_date BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY c.city
ORDER BY spent DESC
LIMIT 5;`,
      },
    },
  ];

  DATA.es.SQL_QUIZ_TOPICS = {
    languages: 'Lenguajes de SQL',
    constraints: 'Restricciones',
    indexes: 'Índices',
    clustering: 'Agrupamiento',
    partitioning: 'Particionado',
    efficiency: 'Eficiencia',
  };

  DATA.es.SQL_QUIZ = [
    { topic: 'languages', type: 'mc', q: '¿A qué sublenguaje pertenece `ALTER TABLE`?', choices: ['DDL', 'DML', 'DCL', 'TCL'], answer: 0, why: 'Cambia la estructura de una tabla, así que es definición de datos.' },
    { topic: 'languages', type: 'mc', q: '¿Qué sentencia forma parte de DCL?', choices: ['`COMMIT`', '`GRANT`', '`TRUNCATE`', '`MERGE`'], answer: 1, why: 'GRANT y REVOKE controlan los privilegios. COMMIT es TCL, TRUNCATE es DDL y MERGE es DML.' },
    { topic: 'languages', type: 'tf', q: 'Un `DELETE` sin cláusula WHERE elimina todas las filas de la tabla.', answer: true, why: 'Sin filtro, todas las filas cumplen la condición.' },
    { topic: 'languages', type: 'fib', q: 'Para deshacer todos los cambios de la transacción actual se ejecuta ___.', accept: ['ROLLBACK', 'rollback'], why: 'ROLLBACK deshace todo desde el BEGIN; ROLLBACK TO deshace solo lo posterior a un punto de guardado.' },
    { topic: 'languages', type: 'mc', q: 'En modo autocommit…', choices: ['no se guarda nada hasta el COMMIT', 'cada sentencia es una transacción en sí misma', 'solo se confirma el DDL', 'los puntos de guardado se crean automáticamente'], answer: 1, why: 'Cada sentencia se confirma en cuanto tiene éxito; BEGIN abre una transacción más larga.' },
    { topic: 'languages', type: 'mc', q: '¿Dónde hay que filtrar los grupos por un agregado, como `AVG(grade) > 7`?', choices: ['WHERE', 'HAVING', 'ORDER BY', 'FROM'], answer: 1, why: 'WHERE se aplica antes de agrupar; HAVING filtra los grupos después.' },
    { topic: 'constraints', type: 'tf', q: 'Una tabla puede tener varias restricciones UNIQUE pero solo una clave primaria.', answer: true, why: 'Hay una única clave primaria; cualquier otra clave candidata se declara UNIQUE.' },
    { topic: 'constraints', type: 'mc', q: 'Una matrícula referencia a un estudiante con `ON DELETE CASCADE`. ¿Qué ocurre al borrar ese estudiante?', choices: ['Se rechaza el borrado', 'Se borran también sus matrículas', 'La clave ajena de sus matrículas pasa a NULL', 'Nada: las matrículas conservan el identificador antiguo'], answer: 1, why: 'CASCADE propaga el borrado a las filas hijas.' },
    { topic: 'constraints', type: 'mc', q: '¿Qué acción referencial es la opción por defecto en SQL estándar?', choices: ['CASCADE', 'SET NULL', 'NO ACTION / RESTRICT', 'SET DEFAULT'], answer: 2, why: 'Por defecto no se puede borrar una fila padre que tiene hijas.' },
    { topic: 'constraints', type: 'tf', q: '`CHECK (grade BETWEEN 0 AND 10)` rechaza una fila cuya nota es NULL.', answer: false, why: 'Un CHECK solo falla cuando la condición es falsa; con NULL es desconocida, así que se supera. Añade NOT NULL para exigir un valor.' },
    { topic: 'constraints', type: 'fib', q: 'La cláusula que da su valor a una columna cuando un INSERT no la menciona es ___.', accept: ['DEFAULT', 'default'], why: 'Por ejemplo, `status TEXT DEFAULT \'open\'`.' },
    { topic: 'indexes', type: 'mc', q: 'Sin ningún índice sobre `email`, ¿cómo resuelve el SGBD `WHERE email = \'x\'`?', choices: ['Búsqueda binaria en la tabla', 'Lee todas las filas (recorrido completo)', 'Usa la clave primaria', 'No puede responder a la consulta'], answer: 1, why: 'Las filas no están ordenadas por email, así que hay que comprobarlas todas.' },
    { topic: 'indexes', type: 'mc', q: 'Con un índice sobre `(city, signup_date)`, ¿qué filtro NO puede usarlo para acotar la búsqueda?', choices: ['`city = \'Madrid\'`', '`city = \'Madrid\' AND signup_date > \'2024-01-01\'`', '`signup_date > \'2024-01-01\'`', '`city IN (\'Madrid\', \'Bilbao\')`'], answer: 2, why: 'Regla del prefijo izquierdo: sin la primera columna, las fechas están repartidas por todo el índice.' },
    { topic: 'indexes', type: 'tf', q: 'Añadir índices hace más rápidos los INSERT y los UPDATE.', answer: false, why: 'Cada escritura debe actualizar también todos los índices de la tabla, así que las escrituras se vuelven más lentas.' },
    { topic: 'indexes', type: 'mc', q: 'Una consulta se responde solo con el índice, sin leer la tabla. Ese índice es…', choices: ['agrupado', 'de cobertura para esa consulta', 'un índice hash', 'parcial'], answer: 1, why: 'Contiene todas las columnas que necesita la consulta.' },
    { topic: 'indexes', type: 'mc', q: '¿Qué tipo de índice puede resolver `WHERE price BETWEEN 10 AND 20 ORDER BY price`?', choices: ['Hash', 'Árbol B', 'GIN', 'Ninguno'], answer: 1, why: 'Solo una estructura ordenada como un árbol B sirve para rangos y ordenación.' },
    { topic: 'indexes', type: 'tf', q: 'Un índice sobre una columna sí/no suele ayudar a una consulta que devuelve la mitad de la tabla.', answer: false, why: 'Con una selectividad tan baja, leer la tabla directamente cuesta lo mismo que pasar por el índice.' },
    { topic: 'clustering', type: 'mc', q: '¿Cuántos índices agrupados puede tener una tabla?', choices: ['Ninguno', 'Uno', 'Uno por columna', 'Tantos como hagan falta'], answer: 1, why: 'Las filas solo se pueden guardar en un orden físico.' },
    { topic: 'clustering', type: 'tf', q: 'En MySQL InnoDB cada tabla está agrupada por su clave primaria.', answer: true, why: 'InnoDB guarda las filas dentro del árbol B+ de la clave primaria; los índices secundarios apuntan a la PK.' },
    { topic: 'clustering', type: 'mc', q: 'Tras `CLUSTER orders USING orders_date_idx` en PostgreSQL, las filas nuevas…', choices: ['se mantienen en orden de fecha automáticamente', 'van donde haya hueco, así que el orden se degrada', 'se rechazan hasta que vuelva a ejecutarse CLUSTER', 'van a una partición aparte'], answer: 1, why: 'CLUSTER es una reescritura puntual; las tablas de PostgreSQL son montículos (heaps).' },
    { topic: 'partitioning', type: 'mc', q: 'Una partición por cada mes de `order_date` es…', choices: ['particionado por rango', 'particionado por lista', 'particionado por hash', 'particionado vertical'], answer: 0, why: 'Cada partición contiene un intervalo de la clave.' },
    { topic: 'partitioning', type: 'fib', q: 'Cuando el optimizador lee solo las particiones que pueden cumplir el WHERE, se habla de ___ de particiones.', accept: ['poda', 'pruning'], why: 'La poda de particiones (partition pruning) se salta todas las particiones fuera del rango filtrado.' },
    { topic: 'partitioning', type: 'tf', q: 'Eliminar una partición antigua suele ser mucho más rápido que borrar sus filas con DELETE.', answer: true, why: 'Eliminarla quita una tabla entera de golpe; DELETE escribe cada fila en el registro (log).' },
    { topic: 'partitioning', type: 'mc', q: 'Repartir las filas de una tabla entre varios servidores es…', choices: ['particionado vertical', 'sharding', 'agrupamiento (clustering)', 'replicación'], answer: 1, why: 'El sharding es particionado horizontal entre máquinas.' },
    { topic: 'efficiency', type: 'mc', q: 'Con un índice sobre `signup_date`, ¿qué condición puede usarlo?', choices: ['`substr(signup_date, 1, 4) = \'2024\'`', '`signup_date >= \'2024-01-01\' AND signup_date < \'2025-01-01\'`', '`signup_date || \'\' = \'2024-05-01\'`', '`strftime(\'%Y\', signup_date) = \'2024\'`'], answer: 1, why: 'Solo la columna tal cual se puede buscar en el índice; las funciones sobre ella obligan a recorrer.' },
    { topic: 'efficiency', type: 'mc', q: 'Un programa lee 100 clientes y luego lanza una consulta por cliente para sus pedidos. Esto es…', choices: ['un interbloqueo (deadlock)', 'el problema N+1', 'poda de particiones', 'una consulta de cobertura'], answer: 1, why: '101 consultas donde bastaría una combinación.' },
    { topic: 'efficiency', type: 'tf', q: 'El optimizador elige un plan usando estadísticas sobre los datos.', answer: true, why: 'Estima los costes a partir del número de filas y de la distribución de los valores; ANALYZE las actualiza.' },
    { topic: 'efficiency', type: 'fib', q: 'La sentencia que muestra el plan de una consulta sin ejecutarla es ___ (en PostgreSQL y MySQL).', accept: ['EXPLAIN', 'explain'], why: 'SQLite usa EXPLAIN QUERY PLAN; PostgreSQL añade EXPLAIN ANALYZE, que además la ejecuta.' },
  ];

  DATA.es.SQL_SANDBOX = {
    intro: 'Escribe cualquier SQL sobre las tablas de ejemplo del curso: `department`, `student`, `course` y `enrolment`. Despliega el bloque de **tablas y filas de ejemplo** para ver cómo están definidas, o parte de uno de los ejemplos.',
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
      { label: 'Una transacción', sql: `BEGIN;
UPDATE enrolment SET grade = grade + 1 WHERE course_id = 'C10';
SELECT * FROM enrolment WHERE course_id = 'C10';
ROLLBACK;
SELECT * FROM enrolment WHERE course_id = 'C10';` },
      { label: 'Un plan de ejecución', sql: `EXPLAIN QUERY PLAN
SELECT * FROM enrolment WHERE course_id = 'C10';
CREATE INDEX idx_enrolment_course ON enrolment (course_id);
EXPLAIN QUERY PLAN
SELECT * FROM enrolment WHERE course_id = 'C10';` },
    ],
  };
})();
