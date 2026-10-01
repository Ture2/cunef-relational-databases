'use strict';
/* Theory (Topic 1, Introduction to databases): Spanish concept cards and quiz.
   Sources: content/translations/tema1-introduccion/extracted.md (Spanish original notes,
   whose wording is followed here) and glossary.json. No Spanish original of Quiz 1 exists
   (quizzes/Quiz_1_*.md and scripts/build_quizzes_qti.js are English only), so its
   questions are translated here; essays are skipped. Items marked `extra: true` are not
   in Quiz 1; they are grounded in extracted.md. Same ids, order and answers as
   data/en/theory.js. */

DATA.es.THEORY_QUIZ_TOPICS = {
  info: 'Sistemas de información',
  files: 'Ficheros vs bases de datos',
  dbms: 'El SGBD',
  acid: 'Transacciones (ACID)',
  levels: 'Niveles de abstracción',
  storage: 'Almacenamiento y eficiencia',
  index: 'Organización de ficheros e índices',
  lifecycle: 'Ciclo de vida de los datos',
};

DATA.es.THEORY_CONCEPTS = [
  /* ---- 1. Sistemas de información --------------------------------------------- */
  { id: 'information-system', hub: 'info', topic: 'info', title: 'Sistema de información',
    summary: 'Conjunto de elementos ordenadamente relacionados entre sí, que cumplen reglas y aportan a la organización la información necesaria para el cumplimiento de sus fines.',
    body: [
      'Los **datos** son las entidades o hechos necesarios para comunicar, internos o externos a la organización. Una **entidad** representa elementos concretos, con características propias (un cliente, un producto); un **hecho** son acciones, transacciones o relaciones que ocurren entre entidades (una compra, una transferencia). La **información** es un conjunto de datos inteligibles que aumentan o perfeccionan el conocimiento de algo.',
      'Los datos suelen llegar al sistema de información mediante procesos **ETL** (Extract, Load and Transform): se extraen de fuentes como aplicaciones, sensores o ficheros de socios, se cargan y se transforman en una forma útil.',
      'La organización necesita información **completa** (completeness) y **fiable** (reliability): así se garantiza la gestión eficaz de sus recursos.',
    ],
    points: [
      '**Completitud**: tener toda la información necesaria, que no falte nada: información de datos y funcional (por ejemplo, reglas de negocio).',
      '**Fiabilidad**: el sistema funciona correctamente y de manera consistente. Tiene tres facetas: **exactitud de datos** (la información almacenada es correcta y los cálculos no son erróneos), **disponibilidad** (el sistema está operativo el mayor tiempo posible, pactado en un SLA, Service Level Agreement) y **consistencia** (los mismos datos aparecen igual en distintas partes del sistema y las reglas de negocio se aplican de manera uniforme).',
    ],
    example: 'Un SLA de disponibilidad del **99,999 %** deja un 0,001 % del año para fallos: 0,00001 × 525.600 minutos ≈ **5,26 minutos de caída al año**. Un SLA del 99,9 % permitiría unas 8,76 horas.',
    mistake: 'Tratar datos e información como sinónimos. "Saldo = 1.250" es un dato; "este cliente lleva seis meses con saldo inferior a 2.000, así que ofrécele una tarjeta de crédito" es información.' },

  { id: 'is-components', hub: 'info', topic: 'info', title: 'Componentes de un sistema de información',
    summary: 'Un sistema de información se compone de contenidos, equipo físico, equipo lógico y equipo humano.',
    body: [
      'Construir un sistema de información también es un proyecto: sus responsables de dirección fijan etapas y estrategias para asegurar la calidad en la construcción del software y de la estructura de datos, con plazos y costes razonables, y para elaborar un marco de referencia homogéneo dentro de la organización (estándares).',
    ],
    points: [
      '**Contenidos**: datos e información internos y/o externos a la organización.',
      '**Equipo físico**: servidores, redes, almacenamiento. **On premise** (local, compra de hardware) o **cloud** (pay as you go).',
      '**Equipo lógico**: arquitecturas, cloud computing y software especializado, por ejemplo una **arquitectura multicapa** con capas independientes frente a **SOA** (Service Oriented Architecture, microservicios).',
      '**Equipo humano (recursos humanos)**: usuarios del sistema, DBA (administrador de la base de datos), data engineer, data analyst, data architect y data scientist.',
    ],
    example: 'Una librería online: **contenidos** = catálogo, clientes, pedidos y las tarifas de las editoriales; **equipo físico** = dos servidores de base de datos en la nube alquilados por horas; **equipo lógico** = la tienda web, un microservicio de pagos y el SGBD; **equipo humano** = clientes y empleados (usuarios), un DBA, un data engineer que carga cada noche los ficheros de las editoriales y un analista que construye el cuadro de mando de ventas.' },

  { id: 'is-pyramid', hub: 'info', topic: 'info', title: 'Pirámide de un sistema de información',
    summary: 'Niveles jerárquicos de información en una organización: a medida que subimos de nivel, la información se resume cada vez más.',
    body: [
      'En la base, el **nivel operativo** (TPS/OLTP, Transaction Processing System / Online Transactional Processing) procesa transacciones. Por encima, el **nivel de conocimiento** (MIS, Management Information System) hace seguimiento y control de la información; el **nivel táctico** (DSS, Decision Support System) hace análisis y simulaciones; y el **nivel estratégico** (EIS/ESS, Executive Information System / Executive Support System) ofrece información estratégica a la dirección.',
      'Al subir, el volumen y el detalle disminuyen y el horizonte temporal crece: desde tiempo real hasta años.',
    ],
    table: {
      caption: 'Niveles de la pirámide, con un banco y una cadena de tiendas como ejemplo',
      head: ['Nivel', 'Volumen · detalle · uso · horizonte', 'Banco', 'Cadena de tiendas'],
      rows: [
        ['Operativo (TPS/OLTP)', 'Muy alto · máximo · continuo · tiempo real', 'Registra cada pago con tarjeta y cada retirada en cajero en el instante en que ocurre', 'Cada venta en caja actualiza el stock de la tienda'],
        ['Conocimiento (MIS)', 'Alto · medio · diario/semanal · días/semanas', 'Informe diario de pagos y descubiertos por oficina', 'Informe semanal de ventas y roturas de stock por tienda'],
        ['Táctico (DSS)', 'Medio · bajo · mensual · meses/años', 'Simula el efecto de subir 0,5 puntos el tipo de las hipotecas', 'Analiza qué productos promocionar el próximo trimestre'],
        ['Estratégico (EIS/ESS)', 'Bajo · mínimo · trimestral · años', 'Cuadro de mando del consejo: cuota de mercado y riesgo por país', 'Decide si abrir 20 tiendas en Portugal'],
      ],
    },
    example: 'Un pago con tarjeta de 42,50 € en un supermercado es una sola fila OLTP. El MIS suma el día (1,2 millones de pagos); el DSS compara meses; el EIS le muestra al consejo un único número: los ingresos por tarjeta han crecido un 6 % este año.',
    figure: { kind: 'pyramid' },
    caption: 'Cada nivel resume el inferior: menos datos, más agregados y con un horizonte temporal más largo a medida que subes.' },

  /* ---- 2. Ficheros vs bases de datos --------------------------------------------- */
  { id: 'file-problems', hub: 'files', topic: 'files', title: 'Problemas de los sistemas basados en ficheros',
    summary: 'Gestionar un sistema de información con ficheros sueltos (xlsx, txt, csv o los que sean) provoca redundancia, inconsistencia, dependencia de la estructura, falta de integridad y acceso limitado.',
    body: [
      'Cada departamento mantiene sus propios ficheros, escritos para sus propios programas. Nada los relaciona, así que el mismo hecho se guarda varias veces y nadie lo comprueba. Es un procesamiento de datos sin control, como si lo escribiéramos todo en papel.',
    ],
    points: [
      '**Redundancia**: los datos pueden estar repetidos en diferentes archivos.',
      '**Inconsistencia**: puedo referirme a una cosa de formas diferentes (en un archivo "Alberto López", en otro "A. López"), o se actualiza una copia y la otra no.',
      '**Aislamiento de los datos**: datos repartidos en ficheros con formatos distintos son difíciles de combinar en una consulta.',
      '**Dependencia de la estructura de los archivos**: los programas conocen el formato exacto de cada fichero; añadir un campo obliga a reescribir todos los programas que lo leen.',
      '**Sin integridad de datos** al no haber validaciones: se acepta una edad de -20 o la venta de un producto que no existe.',
      '**Acceso limitado (concurrencia)**: solo una aplicación o un usuario puede modificar a la vez.',
    ],
    example: 'Recursos Humanos mantiene `empleados_rrhh.csv` y Nóminas mantiene `empleados_nominas.xlsx`, ambos con la dirección del empleado. Ana López se muda; RR. HH. actualiza su fichero y Nóminas no. En marzo su nómina llega a la dirección antigua: la **redundancia** (dos copias) ha provocado una **inconsistencia** (dos verdades distintas). Cruzar ambos ficheros para listar "salario por departamento" exige un script hecho a mano (**aislamiento**), y cuando Nóminas añade una columna IBAN, el programa de informes de RR. HH. falla (**dependencia**).',
    widget: 'files-vs-db' },

  { id: 'database', hub: 'files', topic: 'files', title: 'Qué aporta una base de datos',
    summary: 'Una base de datos es un conjunto de datos relacionados que sustentan entre sí el sistema de información de una organización: exhaustivos, no redundantes y estructurados.',
    body: [
      'Los datos son **exhaustivos** (tienen todo lo necesario), **no redundantes** (no se repiten) y **estructurados** (tienen un formato fijo y predecible). Están centralizados en un SGBD y múltiples aplicaciones acceden a ellos de manera simultánea, con control centralizado y reglas de calidad: es un procesamiento de datos como si tuviéramos un supervisor que revisa todo automáticamente.',
    ],
    points: [
      '**Sin redundancia**: un dato se guarda una sola vez.',
      '**Consistencia**: datos uniformes para todos.',
      '**Independencia**: los cambios de estructura no afectan a los programas.',
      '**Acceso concurrente**: varios usuarios a la vez.',
      '**Integridad**: validaciones automáticas y relaciones entre los datos.',
    ],
    example: 'RR. HH. y Nóminas comparten ahora una única tabla `empleados` con una fila para Ana López (id 1043). Cuando RR. HH. cambia su dirección, Nóminas lee la nueva en la siguiente consulta, porque solo hay una copia. Una regla `CHECK (salario > 0)` rechaza un salario negativo venga de la aplicación que venga, y ambos departamentos pueden modificar empleados distintos en el mismo instante.',
    figure: { kind: 'files-vs-db' },
    caption: 'Arriba: cada departamento guarda su propia copia de los datos. Abajo: todas las aplicaciones pasan por un único SGBD hasta una sola copia compartida.' },

  { id: 'schema-languages', hub: 'files', topic: 'files', title: 'Esquema, sub-esquemas y lenguajes (DDL / DML)',
    summary: 'El esquema es la organización conceptual de la base de datos; los sub-esquemas son las partes que ve cada usuario o aplicación; el DDL los define y el DML trabaja con los datos.',
    body: [
      'El **esquema** es la organización conceptual de toda la base de datos, responsabilidad del DBA (DataBase Admin). Un **sub-esquema** es la parte de la base de datos que ven los usuarios o las aplicaciones, con sus propios criterios y restricciones. Los términos proceden del DBTG de CODASYL (Data Base Task Group de la Conference on Data Systems Languages).',
      'El **Data Management Language** se ocupa de la gestión y manipulación de los datos. Su **DDL** (Data Definition Language) define los elementos del esquema (y, con un DDL de sub-esquemas, los de los sub-esquemas): `CREATE`, `ALTER`, `RENAME`, `COMMENT`, `TRUNCATE`, `DROP`. Su **DML** (Data Manipulation Language) trabaja con los datos: `SELECT`, `INSERT`, `UPDATE`, `DELETE`.',
    ],
    table: {
      caption: 'Comandos DDL (estructura)',
      head: ['Comando', 'Qué hace', 'Sintaxis'],
      rows: [
        ['`CREATE`', 'Crea una tabla y sus columnas junto con su tipo de datos', '`CREATE TABLE`'],
        ['`ALTER`', 'Modifica los nombres de las columnas y añade o elimina una columna', '`ALTER TABLE`'],
        ['`RENAME`', 'Cambia el nombre de la tabla', '`RENAME TABLE`'],
        ['`COMMENT`', 'Añade una explicación al código SQL para que la revisen otros miembros del equipo', '`--` o `/* ... */`'],
        ['`TRUNCATE`', 'Elimina los datos de una tabla sin borrar la tabla', '`TRUNCATE TABLE`'],
        ['`DROP`', 'Elimina la tabla con sus datos', '`DROP TABLE`'],
      ],
    },
    code: `-- DDL: definir la estructura
CREATE TABLE empleados (
  id           INT           PRIMARY KEY,
  nombre       VARCHAR(50)   NOT NULL,
  departamento INT,
  salario      DECIMAL(10,2)
);

-- DML: trabajar con los datos
INSERT INTO empleados (id, nombre, departamento, salario)
VALUES (1, 'Ana', 10, 2000.00),
       (2, 'Luis', 10, 2500.00),
       (3, 'Marta', 20, 3000.00);

UPDATE empleados SET salario = salario * 1.05 WHERE departamento = 10;

SELECT nombre, salario FROM empleados WHERE departamento = 10;
-- Ana 2100.00, Luis 2625.00`,
    example: 'Un sub-esquema para la aplicación de recepción de un gimnasio podría ser una vista con solo el `nombre` y el `estado_cuota` de cada socio: recepción nunca ve los datos bancarios. El `UPDATE` de arriba sube el sueldo solo al departamento 10; sin `WHERE` se lo subiría a los tres empleados.',
    mistake: 'Confundir `TRUNCATE`/`DELETE` con `DROP`. Tras `TRUNCATE TABLE empleados` la tabla vacía sigue existiendo; tras `DROP TABLE empleados` hay que volver a crearla.' },

  /* ---- 3. El SGBD ------------------------------------------------------------------- */
  { id: 'dbms', hub: 'dbms', topic: 'dbms', title: 'El SGBD y su arquitectura',
    summary: 'Un SGBD es un conjunto coordinado de programas, procedimientos, lenguajes, etc. que suministra, tanto a los usuarios no informáticos como a los técnicos especializados en el tratamiento de datos, los medios necesarios para describir, recuperar y manipular los datos almacenados en la base, manteniendo su integridad, confidencialidad y seguridad.',
    body: [
      'Por dentro, un SGBD tiene dos grandes partes. El **procesador de consultas** recibe lo que escriben los usuarios: el **intérprete del DDL** convierte las definiciones del esquema en entradas del **diccionario de datos**; el **compilador del DML** (con ayuda de los datos estadísticos del disco) convierte las consultas en un plan de ejecución; el **precompilador del DML incorporado** trata el SQL dentro de los programas de aplicación y genera **código objeto**; y el **motor de evaluación de consultas** ejecuta los planes.',
      'El **gestor de almacenamiento** los conecta con el disco: el **gestor de transacciones** (ACID), el **gestor de memoria intermedia** (qué bloques se mantienen en memoria) y el **gestor de ficheros** (ficheros de datos e índices en disco).',
    ],
    points: [
      'Gestión de la seguridad; instalación y configuración de la base de datos; gestión de la comunicación de la base de datos.',
      'Creación y especificación del diccionario de datos; administrar y crear la estructura física de la base de datos.',
      'Manipulación de datos y creación de aplicaciones de usuario.',
      'Exportación e importación de datos a/o desde otros sistemas.',
      'Creación y restablecimiento de copias de seguridad; recuperación en caso de desastre.',
    ],
    example: 'La aplicación de un cajero ejecuta `SELECT saldo FROM cuentas WHERE cuenta_id = \'A123\'`. El compilador del DML consulta el diccionario de datos (la tabla y la columna existen), usa los datos estadísticos para elegir el índice sobre `cuenta_id`, el motor de evaluación pide el bloque al gestor de memoria intermedia y el gestor de ficheros solo lo lee del disco si no está ya en memoria.',
    figure: { kind: 'dbms-architecture' },
    caption: 'Usuarios arriba, el SGBD en el centro (procesador de consultas y gestor de almacenamiento) y el disco abajo (diccionario de datos, datos estadísticos, índices y ficheros de datos).' },

  { id: 'dbms-properties', hub: 'dbms', topic: 'dbms', title: 'Propiedades de un SGBD',
    summary: 'Un SGBD es autodescriptivo, aísla programas y datos, ofrece una visión abstracta y varias vistas de los datos, comparte los datos entre usuarios y aporta seguridad y eficiencia.',
    points: [
      '**Autodescriptivo**: para la definición de la BD se utiliza una BD especial denominada **catálogo**, que contiene la estructura de la BD: **metadatos**.',
      '**Aislamiento entre programas y datos**: la estructura de la BD está separada de los programas; es posible modificar la BD sin necesidad de modificar (todos) los programas que acceden a ella.',
      '**Visión abstracta de los datos**: una representación conceptual que oculta los detalles de almacenamiento o de implementación de las operaciones.',
      '**Varias vistas de los datos**: un subconjunto (para un profesor, solo los alumnos matriculados en la asignatura que imparte), una vista parcial (según el tipo de usuario, ocultando datos confidenciales) o datos virtuales derivados de otros (totales, resúmenes, etc. que no están almacenados en la BD).',
      '**Compartición de datos entre múltiples usuarios**: un único almacén; las **transacciones** (unidades de trabajo que agrupan una o más operaciones y garantizan las propiedades ACID) controlan los accesos concurrentes.',
      '**Seguridad** frente a accesos no autorizados y fallos del sistema.',
      '**Eficiencia**: validaciones, accesos simultáneos, etc.',
    ],
    code: `-- El catálogo también se puede consultar (metadatos, no datos de usuario)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'empleados';

-- Una vista: un subconjunto más datos derivados que no se almacenan
CREATE VIEW nomina_departamento AS
SELECT departamento, COUNT(*) AS plantilla, SUM(salario) AS total
FROM empleados
GROUP BY departamento;`,
    example: 'Consultar el catálogo para `empleados` devuelve filas como (`id`, `int`) y (`salario`, `decimal`): datos sobre los datos. La vista `nomina_departamento` devuelve (10, 2, 4725.00) aunque ninguna tabla guarda el número 4725.' },

  { id: 'dbms-roles', hub: 'dbms', topic: 'dbms', title: 'Actores y roles',
    summary: 'Mucha gente trabaja con una base de datos, cada uno por una puerta distinta: desde los usuarios finales que solo ven una aplicación hasta el DBA que mantiene vivo todo el sistema.',
    body: [
      'Los apuntes enumeran los actores que intervienen en un SGBD: **usuarios finales** (utilizan la BD mediante aplicaciones con consultas SQL preconfiguradas), **usuarios avanzados** (utilizan un lenguaje de consulta más avanzado o directamente SQL), **desarrolladores de aplicaciones** (programan aplicaciones que utilizan DML), **diseñadores de BD** (diseñan la estructura conceptual y lógica de la base de datos) y **administradores de BD** (definen y modifican el esquema; definen la estructura de almacenamiento, acceso y organización física; asignan derechos de acceso a roles y usuarios; y se ocupan del mantenimiento: seguridad, backup & recovery y eficiencia: índices, consumo de recursos, etc.). En la industria, el equipo de datos incluye además data architects, data engineers, data analysts y data scientists.',
    ],
    table: {
      caption: 'Quién hace qué, con un ejemplo del día a día',
      head: ['Rol', 'Qué hace', 'Un día cualquiera'],
      rows: [
        ['**DBA** (administrador de la base de datos)', 'Cambios de esquema, almacenamiento físico, usuarios y permisos, copias de seguridad, recuperación, optimización', 'En un hospital, programa la copia de seguridad nocturna a las 02:00, concede a la aplicación de recepción solo `SELECT` sobre `Pacientes` y añade un índice porque la búsqueda de citas tarda 4 s'],
        ['**Diseñador de BD / data architect**', 'Diseño conceptual y lógico; el arquitecto decide además la plataforma de datos global', 'Dibuja el modelo E/R de un nuevo programa de fidelización: CLIENTE, TARJETA, MOVIMIENTO_PUNTOS, y decide que va en el mismo clúster PostgreSQL que las ventas'],
        ['**Desarrollador de aplicaciones**', 'Programa aplicaciones que incorporan DML', 'Programa el botón "reservar clase" de la app de un gimnasio: `INSERT INTO reservas ...` dentro de una transacción que también resta las plazas libres'],
        ['**Data engineer**', 'Construye procesos ETL que mueven y transforman datos entre sistemas', 'Carga cada noche los 300.000 pagos con tarjeta del día desde la BD OLTP al data warehouse y arregla el proceso cuando un proveedor cambia el formato de su CSV'],
        ['**Data analyst**', 'Consulta y resume datos para tomar decisiones (un usuario avanzado)', 'Escribe una consulta con `GROUP BY` que muestra que la venta de paraguas crece un 40 % las semanas de lluvia y la añade al cuadro de mando semanal'],
        ['**Data scientist**', 'Construye modelos estadísticos y de machine learning sobre los datos', 'Entrena un modelo de abandono con dos años de visitas de los socios para predecir quién se dará de baja del gimnasio'],
        ['**Usuario final**', 'Usa aplicaciones con consultas preconfiguradas; nunca escribe SQL', 'Un cliente del banco consulta su saldo en la app; una recepcionista busca a un paciente por su DNI'],
      ],
    },
    example: 'En el hospital anterior, la recepcionista (usuaria final) puede leer `Pacientes`, pero cuando intenta abrir `Diagnosticos` el SGBD se lo impide, porque el DBA solo concedió al rol de recepción `SELECT` sobre `Pacientes`.',
    mistake: 'Pensar que el DBA diseña el modelo conceptual o programa las aplicaciones. El DBA es responsable del esquema en producción, la organización física, los permisos y el mantenimiento; el diseño y el código de las aplicaciones corresponden a otros roles.' },

  /* ---- 4. Transacciones (ACID) ------------------------------------------------------ */
  { id: 'atomicity', hub: 'acid', topic: 'acid', title: 'Transacciones y atomicidad',
    summary: 'Una transacción agrupa varias operaciones en una unidad de trabajo. Atomicidad: todo se ejecuta o nada se ejecuta.',
    body: [
      'Los SGBD relacionales agrupan varias operaciones de modificación de datos en una **transacción**. Por ejemplo, en el sistema de matrícula de la universidad, al matricular a un alumno en una asignatura se debe decrementar el número de plazas disponibles en el grupo elegido, registrar la asignatura en los datos de matrícula del alumno y actualizar la contabilidad para realizar el cobro: las tres cosas o ninguna. Un SGBD debe proporcionar las propiedades **ACID** sobre las transacciones: Atomicidad, Consistencia, Aislamiento (Isolation) y Durabilidad.',
      '**Atomicidad**: en una transacción, todas las operaciones se terminan, o bien no se realiza ninguna. Si algo falla antes del `COMMIT`, el SGBD deshace (rollback) lo que ya se hubiera hecho.',
    ],
    points: [
      'Paso 1: `BEGIN TRANSACTION`. A123 tiene 5.000 €, B456 tiene 2.000 €.',
      'Paso 2: el primer `UPDATE` descuenta 1.000 € de A123 (4.000 €, todavía sin confirmar).',
      'Paso 3: el segundo `UPDATE` falla: la cuenta B456 no existe, se va la luz...',
      'Paso 4: el SGBD revierte automáticamente el primer `UPDATE`. Al reiniciar, A123 vuelve a tener 5.000 € y B456 2.000 €: nunca te quedarás con el dinero descontado de una cuenta sin haberse acreditado en la otra.',
      'Si el paso 3 tiene éxito, el `COMMIT` valida los dos cambios a la vez: A123 4.000 €, B456 3.000 €.',
    ],
    code: `BEGIN TRANSACTION;
UPDATE cuentas SET saldo = saldo - 1000 WHERE cuenta_id = 'A123';
UPDATE cuentas SET saldo = saldo + 1000 WHERE cuenta_id = 'B456';
COMMIT;

-- Otro ejemplo: un pedido, su stock y su factura
BEGIN TRANSACTION;
INSERT INTO pedidos (cliente_id, total) VALUES (123, 500);
UPDATE inventario SET stock = stock - 5 WHERE producto_id = 'P001';
INSERT INTO facturacion (pedido_id, monto) VALUES (LAST_INSERT_ID(), 500);
COMMIT;`,
    example: 'En el ejemplo del pedido, si falla el `INSERT` de la factura, el pedido del cliente 123 desaparece y las 5 unidades vuelven al stock: nunca hay un pedido sin factura.',
    widget: 'acid-transfer' },

  { id: 'consistency', hub: 'acid', topic: 'acid', title: 'Consistencia',
    summary: 'Los datos mantienen su integridad: una transacción lleva la base de datos de un estado válido a otro, y el SGBD rechaza las operaciones que violan sus reglas.',
    body: [
      'Los apuntes la definen también desde el lado de quien lee: una consulta debe ser consistente con el estado de la base de datos en el instante de inicio de su ejecución, de modo que nunca mezcla datos de antes y de después de otra transacción.',
      'En la práctica, el SGBD hace cumplir las reglas de integridad declaradas en el esquema: restricciones `CHECK` (reglas de negocio), `NOT NULL`, claves e **integridad referencial** (claves foráneas).',
    ],
    points: [
      'Regla: `CHECK (saldo >= 0)` en `cuentas`.',
      'Paso 1: A123 tiene 600 €. Empieza una transferencia de 1.000 € a B456.',
      'Paso 2: el cargo dejaría A123 en -400 €: el SGBD lanza un error.',
      'Paso 3: la transacción se revierte; A123 conserva sus 600 € y B456 no cambia. El dinero total del banco (600 + 2.000) es el mismo antes y después.',
    ],
    code: `-- Esta transacción FALLA porque viola la regla de edad positiva
BEGIN TRANSACTION;
UPDATE alumnos SET edad = -20 WHERE alumno_id = 'A123';
-- ERROR: la base de datos rechaza esta operación
ROLLBACK;

-- Integridad referencial: no puedes eliminar un cliente que tiene pedidos activos
DELETE FROM clientes WHERE cliente_id = 123;
-- ERROR: viola la clave foránea en la tabla pedidos`,
    example: 'El cliente 123 tiene dos pedidos abiertos. `DELETE FROM clientes WHERE cliente_id = 123` se rechaza, porque si no los pedidos apuntarían a un cliente que ya no existe.' },

  { id: 'isolation', hub: 'acid', topic: 'acid', title: 'Aislamiento',
    summary: 'Las transacciones no se interfieren entre sí: una transacción no completada (con commit) es invisible al resto del mundo.',
    body: [
      'Sin aislamiento, dos transacciones concurrentes pueden leer el mismo valor antiguo y pisarse la una a la otra (una **actualización perdida**), o una puede ver los cambios a medias de la otra.',
    ],
    points: [
      'A123 tiene 1.000 €. La transferencia T1 (300 € a B456) y la transferencia T2 (500 € a C789) empiezan a la vez.',
      'Sin aislamiento: T1 lee 1.000, T2 lee 1.000; T1 escribe 700, T2 escribe 500. Saldo final 500 €: el cargo de T1 se ha **perdido** y el banco ha regalado 300 €.',
      'Con aislamiento: el `UPDATE` de T2 sobre A123 espera (queda **bloqueado**) hasta que T1 hace commit; entonces lee 700 y escribe 200. Saldo final 200 € = 1.000 - 300 - 500.',
    ],
    code: `-- Usuario A
BEGIN TRANSACTION;
SELECT stock FROM productos WHERE id = 'P001';   -- ve stock = 1
-- tarda un rato en decidirse...
UPDATE productos SET stock = 0 WHERE id = 'P001';
INSERT INTO pedidos (producto_id, cantidad) VALUES ('P001', 1);
COMMIT;

-- Usuario B, a la vez
BEGIN TRANSACTION;
SELECT stock FROM productos WHERE id = 'P001';   -- también ve stock = 1
UPDATE productos SET stock = 0 WHERE id = 'P001'; -- BLOQUEADO hasta que A termine
-- una de las dos transacciones fallará por stock insuficiente`,
    example: 'Dos usuarios intentan comprar a la vez la última unidad del producto P001. El aislamiento hace que el segundo espere a que el primero confirme, así que la última unidad no se vende dos veces (no hay **sobreventa**).' },

  { id: 'durability', hub: 'acid', topic: 'acid', title: 'Durabilidad',
    summary: 'Los cambios confirmados son permanentes: cuando se completa una transacción con commit, es imposible que la base de datos la pierda.',
    body: [
      'Inmediatamente después del `COMMIT`, aunque se vaya la luz, se reinicie el servidor, se caiga la red o haya un fallo de hardware, el cambio estará ahí cuando el sistema se recupere. Los SGBD lo consiguen escribiendo el cambio en almacenamiento no volátil (normalmente un registro o log) antes de confirmar el `COMMIT`.',
    ],
    points: [
      'Paso 1: la transferencia de 1.000 € de A123 a B456 ejecuta los dos `UPDATE`.',
      'Paso 2: el `COMMIT` devuelve "OK" y la app muestra "Transferencia realizada".',
      'Paso 3: un segundo después se va la luz; puede que los nuevos saldos aún no estén escritos en los ficheros de datos.',
      'Paso 4: al reiniciar, el SGBD reaplica el log: A123 tiene 4.000 € y B456 3.000 €, exactamente lo que se le dijo al cliente.',
    ],
    code: `-- Confirmación de pago
BEGIN TRANSACTION;
UPDATE pedidos SET estado = 'PAGADO' WHERE pedido_id = 12345;
INSERT INTO pagos (pedido_id, monto, fecha) VALUES (12345, 250.00, NOW());
COMMIT; -- ¡Confirmado!`,
    example: 'El pago de 250,00 € del pedido 12345 sigue registrado tras un corte de luz que ocurre justo después del `COMMIT`. Antes del `COMMIT`, el mismo corte lo desharía (atomicidad).',
    mistake: 'Pensar que durabilidad significa "los datos ya están en los ficheros de datos". Lo que garantiza es que una transacción confirmada sobrevive a cualquier fallo; cómo lo consigue (log, réplicas) es cosa del SGBD.' },

  /* ---- 5. Niveles de abstracción -------------------------------------------------- */
  { id: 'ansi-sparc', hub: 'levels', topic: 'levels', title: 'La arquitectura ANSI/X3/SPARC',
    summary: 'El estándar, también conocido como arquitectura de tres esquemas, que separa una base de datos en nivel externo, nivel conceptual y nivel interno.',
    body: [
      'Los niveles de abstracción en bases de datos son capas organizativas que separan diferentes aspectos del manejo de datos: simplifican la complejidad del sistema, proporcionan independencia entre niveles, permiten múltiples vistas de los mismos datos y facilitan el mantenimiento y la evolución. El estándar lo definió ANSI (American National Standards Institute).',
    ],
    points: [
      '**Nivel externo** (vista de los usuarios): vistas parciales de la base de datos que se muestran a los usuarios y/o aplicaciones.',
      '**Nivel conceptual** (vista lógica global): el esquema completo; refleja la estructura y relaciones existentes entre los datos del mundo real que se van a guardar en la base de datos, aislando entre sí los niveles externo e interno.',
      '**Nivel interno** (vista física): especifica qué, cómo y dónde se van a almacenar los datos físicamente en disco.',
    ],
    table: {
      caption: 'Los tres niveles en la base de datos de una universidad',
      head: ['Nivel', 'Qué contiene'],
      rows: [
        ['Externo', 'Vista de la profesora: nombre y nota de los alumnos de su asignatura. Vista de secretaría: nombre, DNI y tasas pagadas, sin notas.'],
        ['Conceptual', '`ALUMNO(alumno_id, nombre, dni, email)`, `ASIGNATURA(codigo, titulo)`, `MATRICULA(alumno_id, codigo, nota)` con sus claves y restricciones.'],
        ['Interno', '`MATRICULA` almacenada como árbol B+ sobre `(alumno_id, codigo)` en bloques de 8 KB, en el fichero `matric.dat` de un SSD, con un índice adicional sobre `codigo`.'],
      ],
    },
    example: 'Cuando una profesora abre "Mis alumnos" ve 3 columnas y 45 filas; no sabe que `MATRICULA` tiene 60.000 filas ni que vive en un árbol B+ sobre un SSD.',
    figure: { kind: 'ansi-sparc' },
    caption: 'Varias vistas externas sobre un único esquema conceptual, almacenado mediante un único esquema interno. Las fronteras entre niveles dan la independencia lógica y la física.' },

  { id: 'data-independence', hub: 'levels', topic: 'levels', title: 'Independencia lógica y física',
    summary: 'Cambiar un nivel no obliga a cambiar el nivel superior: la independencia física separa el nivel interno del conceptual; la independencia lógica separa el nivel conceptual del externo.',
    body: [
      '**Independencia física**: puedes cambiar el esquema interno (organización de ficheros, índices, discos, tamaño de bloque) sin alterar el esquema conceptual ni las aplicaciones.',
      '**Independencia lógica**: puedes cambiar el esquema conceptual (añadir una tabla o una columna, dividir una tabla) sin alterar las vistas externas ni los programas que las usan.',
    ],
    code: `-- Independencia física: un índice nuevo cambia CÓMO se guardan y encuentran los datos
CREATE INDEX idx_matricula_codigo ON matricula (codigo);
-- La app de los profesores ejecuta exactamente el mismo SELECT, solo que más rápido.

-- Independencia lógica: el esquema conceptual crece
ALTER TABLE alumno ADD telefono VARCHAR(20);
-- La vista que usan los profesores no menciona telefono, así que sigue funcionando:
CREATE VIEW mis_alumnos AS
SELECT a.nombre, m.nota
FROM alumno a JOIN matricula m ON m.alumno_id = a.alumno_id
WHERE m.codigo = 'DB241';`,
    example: 'Pasar `MATRICULA` de un HDD a un SSD, o añadir `idx_matricula_codigo`, no cambia ni una línea de la aplicación (física). Añadir la columna `telefono` a `alumno` no rompe la vista `mis_alumnos` (lógica).',
    mistake: 'Confundir las dos. Recuerda: **física** = interno ↔ conceptual (cambios de almacenamiento); **lógica** = conceptual ↔ externo (cambios de esquema).' },

  /* ---- 6. Almacenamiento y eficiencia --------------------------------------------- */
  { id: 'fixed-records', hub: 'storage', topic: 'storage', title: 'Ficheros, registros y registros de longitud fija',
    summary: 'La base de datos se almacena como una colección de ficheros; cada fichero es una secuencia de registros, y los registros se componen de múltiples campos. Los registros pueden ser de longitud fija o variable.',
    body: [
      'En un registro de **longitud fija** cada campo ocupa siempre su tamaño máximo. Todos los registros ocupan lo mismo, así que la posición de cualquier registro se calcula directamente: el registro número k empieza en el byte k × tamaño.',
    ],
    table: {
      caption: 'Disposición en bytes de un registro de `clientes_fijo` (97 bytes)',
      head: ['Campo', 'Tipo', 'Bytes', 'Desplazamiento'],
      rows: [
        ['`id`', '`INT`', '4', '0–3'],
        ['`nombre`', '`CHAR(30)`', '30', '4–33'],
        ['`email`', '`CHAR(40)`', '40', '34–73'],
        ['`telefono`', '`CHAR(15)`', '15', '74–88'],
        ['`saldo`', '`DECIMAL(10,2)`', '8', '89–96'],
      ],
    },
    code: `CREATE TABLE clientes_fijo (
  id       INT,            -- 4 bytes
  nombre   CHAR(30),
  email    CHAR(40),
  telefono CHAR(15),
  saldo    DECIMAL(10,2)   -- 8 bytes
);
-- Total por registro: 97 bytes (siempre)`,
    points: [
      '**Predecible**: todos los registros ocupan el mismo espacio.',
      '**Acceso rápido**: es fácil calcular la posición de cualquier registro.',
      '**Simplicidad**: gestión de memoria más sencilla.',
      '**Desperdicio**: espacios no utilizados en campos de contenido variable.',
      '**Límites rígidos**: no se puede exceder el tamaño máximo.',
    ],
    example: 'El registro número 1.000 (contando desde 0) empieza en el byte 1.000 × 97 = **97.000**, sin necesidad de leer los anteriores. Pero el nombre "Ana" usa 3 de sus 30 bytes: 27 bytes son relleno.',
    figure: { kind: 'record-layout', variant: 'fixed' },
    caption: 'Registros de longitud fija: cada campo tiene su anchura máxima, así que cada registro empieza en un múltiplo de 97 bytes.' },

  { id: 'variable-records', hub: 'storage', topic: 'storage', title: 'Registros de longitud variable',
    summary: 'Campos como VARCHAR ocupan solo los bytes que necesitan más una marca de longitud, así que los registros tienen tamaños distintos.',
    code: `CREATE TABLE clientes_variable (
  id       INT,            -- 4 bytes
  nombre   VARCHAR(100),   -- 1-100 bytes + longitud
  email    VARCHAR(255),   -- 1-255 bytes + longitud
  telefono VARCHAR(20),    -- 1-20 bytes + longitud
  saldo    DECIMAL(10,2)   -- 8 bytes
);`,
    table: {
      caption: 'Un registro: (7, \'Ana Ruiz\', \'ana@cunef.edu\', \'600123456\', 150.00), con 1 byte de longitud antes de cada VARCHAR',
      head: ['Campo', 'Se guarda como', 'Bytes'],
      rows: [
        ['`id`', '7', '4'],
        ['`nombre`', 'longitud 8 + "Ana Ruiz"', '1 + 8 = 9'],
        ['`email`', 'longitud 13 + "ana@cunef.edu"', '1 + 13 = 14'],
        ['`telefono`', 'longitud 9 + "600123456"', '1 + 9 = 10'],
        ['`saldo`', '150.00', '8'],
        ['**Total**', '', '**45** (frente a 97 en la tabla fija)'],
      ],
    },
    points: [
      '**Eficiencia**: no desperdicia espacio.',
      '**Flexibilidad**: los campos pueden crecer según necesidad.',
      '**Realismo**: mejor para datos del mundo real.',
      '**Complejidad**: gestión más difícil.',
      '**Acceso lento**: no se puede calcular la posición directamente; hay que leer las longitudes (o mantener un directorio de posiciones).',
    ],
    example: 'El siguiente registro, de "Bartolomé Fernández-Villaverde", es más largo, así que el registro 2 no empieza en un desplazamiento fijo. Si Ana cambia su email por uno más largo, su registro crece y puede que haya que moverlo.',
    figure: { kind: 'record-layout', variant: 'variable' },
    caption: 'Registros de longitud variable: cada VARCHAR va precedido de su longitud, así que los registros tienen tamaños distintos y hay que recorrerlos para localizarlos.' },

  { id: 'storage-media', hub: 'storage', topic: 'storage', title: 'Soportes de almacenamiento y bloques',
    summary: 'Las bases de datos deben residir en almacenamiento no volátil; como ese almacenamiento es lento, los datos se leen y escriben en bloques grandes.',
    body: [
      '**Principio de almacenamiento no volátil**: el almacenamiento principal es el disco duro (HDD/SSD); la memoria RAM actúa como caché opcional para ganar velocidad, pero es volátil y tiene capacidad limitada.',
      '**Problema de velocidad del almacenamiento**: el almacenamiento no volátil es típicamente lento porque implica operaciones de E/S (entrada/salida), intervención del sistema operativo, controladoras de disco y hardware de E/S, y procesamiento por el SGBD.',
      '**Estrategia de optimización**: como el tiempo de E/S es prácticamente independiente de la cantidad de datos, leemos/escribimos bloques grandes (típicamente 4 KB), minimizamos el número de operaciones de E/S y maximizamos la transferencia por operación.',
      'La memoria se divide en bloques, y cada registro del fichero tiene la **bucket address** (dirección de bloque) del bloque que lo contiene.',
    ],
    example: 'Con registros de 97 bytes y bloques de 4 KB (4.096 bytes), en un bloque caben ⌊4.096 / 97⌋ = **42 registros**. Leer 4.200 clientes de forma secuencial cuesta 100 operaciones de E/S en lugar de 4.200.',
    figure: { kind: 'storage-hierarchy' },
    caption: 'Cuanto más cerca de la CPU, más rápida, pequeña, cara y volátil es la memoria; la base de datos vive en los niveles no volátiles y se guarda en caché en la RAM.' },

  { id: 'access-time', hub: 'storage', topic: 'storage', title: 'Tiempo de respuesta: Ts = α + βb',
    summary: 'El tiempo de leer o escribir un bloque es un tiempo de búsqueda fijo más un tiempo de transferencia proporcional al tamaño del bloque.',
    body: [
      '**α** es el tiempo de búsqueda (tiempo medio para localizar la información), **β** la tasa de transferencia expresada como tiempo por cada unidad de datos (β = 1 / velocidad) y **b** el tamaño del bloque. Con bloques pequeños domina α; β·b crece linealmente con b.',
      '**Disco magnético (HDD)**: α = 8 ms, operaciones a 100 MB/s → β = 1/100 s/MB = 10 ms/MB, b = 4 KB = 0,004 MB → Ts = 8 + 10 × 0,004 = **8,04 ms**. El tiempo está dominado por la búsqueda (α), no por la transferencia. Elígelo cuando el coste es un factor crítico, almacenas grandes volúmenes de datos históricos y las consultas son principalmente secuenciales.',
      '**Disco sólido (SSD)**: α = 0,1 ms, operaciones a 500 MB/s → β = 2 ms/MB, b = 0,004 MB → Ts = 0,1 + 2 × 0,004 = **0,108 ms**. Significativamente más rápido que el HDD. Elígelo cuando el rendimiento es crítico, tienes muchas consultas aleatorias y operaciones de lectura intensivas.',
    ],
    table: {
      caption: 'Ejemplo resuelto: 10 millones de registros de transacciones, 100.000 consultas aleatorias por hora, registros de 2 KB (b = 0,002 MB)',
      head: ['', 'HDD (α = 10 ms, 80 MB/s)', 'SSD (α = 0,05 ms, 300 MB/s)'],
      rows: [
        ['Tiempo por consulta', 'T = 10 ms + (80 MB/s)⁻¹ × 0,002 MB = 10 ms + 0,025 ms ≈ **10 ms**', 'T = 0,05 ms + (300 MB/s)⁻¹ × 0,002 MB = 0,05 ms + 0,0067 ms ≈ **0,05 ms**'],
        ['Carga por hora', '100.000 × 10 ms = 1.000.000 ms = **1.000 s** de disco por hora', '100.000 × 0,05 ms = 5.000 ms = **5 s** por hora'],
        ['¿Puede con la carga?', 'Viable: usa 1.000 / 3.600 = **27,78 %** del tiempo', 'Muy viable: usa 5 / 3.600 = **0,1389 %** del tiempo'],
      ],
    },
    example: 'En el ejemplo resuelto el término de transferencia es minúsculo: (80 MB/s)⁻¹ × 0,002 MB = 0,000025 s = 0,025 ms frente a 10 ms de búsqueda. Duplicar el registro a 4 KB solo añadiría otros 0,025 ms en el HDD: por eso compensa leer bloques más grandes.',
    mistake: 'Mezclar unidades. β debe ir en tiempo por MB (o por KB) y b en la misma unidad: 4 KB = 0,004 MB, y 1/(100 MB/s) = 0,01 s/MB = 10 ms/MB.',
    widget: 'access-time' },

  /* ---- 7. Organización de ficheros e índices --------------------------------------- */
  { id: 'file-organization', hub: 'index', topic: 'index', title: 'Las organizaciones de ficheros de un vistazo',
    summary: 'La organización de un fichero es cómo se distribuye y localiza la información dentro de él: secuencial, heap, hash, árbol B+, agrupada (clustered) o ISAM.',
    body: [
      'Cada organización abarata unas operaciones y encarece otras. Elegir una exige conocer el tamaño de la base de datos y su operación principal: inserciones masivas, búsquedas por clave, consultas ordenadas o por rango, o joins.',
    ],
    table: {
      caption: 'Resumen de las seis organizaciones',
      head: ['Organización', 'Descripción', 'Ventajas', 'Inconvenientes', 'Casos de uso'],
      rows: [
        ['**Secuencial**', 'Los registros se almacenan **uno tras otro** en orden; nuevos registros al final o con reordenación completa', 'Rápido para datos contiguos; simple de implementar; almacenamiento barato', 'Tiempo de lectura alto; el borrado causa fragmentación; ordenación muy lenta', 'Archivos de respaldo, cargas masivas, datos históricos'],
        ['**Heap**', 'Registros **desordenados** con ID único; cada registro tiene una dirección (bucket address); inserción al final', 'Inserción muy rápida; bueno para BD pequeñas; no requiere ordenación', 'Lento para BD grandes; desperdicia memoria; búsqueda secuencial', 'BD pequeñas, logs de sistema, inserción masiva'],
        ['**Hash**', 'Usa una **función hash** para calcular la ubicación del registro a partir de su clave primaria', 'Acceso directo muy rápido; no necesita ordenación; tiempo constante', 'Puede borrar datos por error; memoria no consecutiva; colisiones hash', 'BD medianas, acceso por clave, transacciones frecuentes'],
        ['**Árbol B+**', '**Árbol equilibrado** donde los datos están en las hojas y los nodos internos son punteros para navegar', 'Búsqueda eficiente; árbol equilibrado; dinámico (crece/decrece); recorrido rápido', 'Coste de equilibrado; complejidad alta; overhead de punteros', 'BD grandes, muchas actualizaciones, consultas ordenadas'],
        ['**Agrupada (clustered)**', '**Combina múltiples tablas** en el mismo bloque usando un identificador común (índice o hash)', 'Excelente para JOINs; eficiente en relaciones 1:M; reduce accesos a disco', 'Malo para relaciones 1:1; no apto para BD grandes; ineficiente sin JOINs', 'Relaciones 1:M frecuentes, muchas operaciones JOIN, tablas relacionadas'],
        ['**ISAM**', 'Crea un **archivo de índices** separado del archivo de datos; el índice apunta a la ubicación real del registro', 'Búsquedas por rangos; patrones de búsqueda; BD grandes', 'Almacenamiento extra para índices; los índices crecen con los datos; mantenimiento complejo', 'BD muy grandes, búsquedas complejas, consultas por rangos'],
      ],
    },
    example: 'Una tienda con 2.000 productos que se compran por ID: hash. La misma tienda con 50 millones de líneas de pedido consultadas por rango de fechas: árbol B+. Una copia nocturna de toda la base de datos que solo se lee de principio a fin: secuencial.' },

  { id: 'sequential', hub: 'index', topic: 'index', title: 'Organización secuencial (Sequential File Organization)',
    summary: 'Los registros se guardan uno tras otro. En un archivo de pila cada nuevo registro va siempre al final; en un archivo ordenado se añade al final y después se ordena el fichero.',
    points: [
      '**Inserción**: archivo de pila, se escribe al final (barato); archivo ordenado, se añade y se reordena todo el fichero usando un fichero auxiliar (operación excesivamente lenta).',
      '**Búsqueda**: leer los registros en orden hasta encontrar la clave; de media, la mitad del fichero.',
      '**Ventajas**: rapidez siempre que se acceda a registros contiguos; método sencillo de implementar; los datos se pueden guardar en dispositivos de almacenamiento baratos.',
      '**Inconvenientes**: tiempo medio de lectura alto; el borrado puede provocar fragmentación interna del fichero; la ordenación requiere un tratamiento integral de todos los registros.',
      '**Aplicación**: ficheros de carga masiva de información en los que la rapidez de acceso y de las operaciones de actualización no sean factores críticos. Poco habituales en SGBD.',
    ],
    example: 'Un archivo ordenado de 1.000.000 de movimientos bancarios ordenados por fecha: imprimir marzo es rápido (registros contiguos), pero encontrar el movimiento 834.201 por su ID supone leer de media unos 500.000 registros, e insertar un movimiento del 2 de enero obliga a reescribir el fichero entero.',
    figure: { kind: 'file-organization', org: 'sequential' },
    caption: 'Archivo de pila: cada nuevo registro va al final. Archivo ordenado: se añade al final y después se ordena el fichero.' },

  { id: 'heap', hub: 'index', topic: 'index', title: 'Organización heap (Heap File Organization)',
    summary: 'Organización de archivo desordenado: cada registro tiene un ID único enlazado a una bucket address, y los nuevos registros se insertan al final del fichero sin reordenación.',
    points: [
      '**Punteros**: cada registro se enlaza con su ubicación en memoria.',
      '**Sin ordenación**: los registros no siguen ningún orden particular.',
      '**Flexibilidad**: cualquier bloque disponible puede usarse para nuevos registros; el SGBD gestiona automáticamente la asignación, el almacenamiento y la administración.',
      '**Inserción**: se añade al final (o en cualquier bloque libre), sin reorganizar: muy rápida.',
      '**Búsqueda**: recorrer el fichero; rápida en una base de datos pequeña, lenta en una grande.',
      '**Inconveniente**: el efecto "memory wastage", al desperdiciar los huecos que dejan los bloques que almacenan registros que no se ajustan al tamaño máximo del bloque.',
      '**Aplicación**: bases de datos pequeñas con constantes operaciones de actualización o inserción; cargas masivas, si se dispone de suficiente memoria.',
    ],
    example: 'Un servidor web escribe 5.000 líneas de log por minuto en una tabla heap `log_accesos`: cada línea simplemente se añade. Pero buscar "todas las peticiones de la IP 10.0.0.7" en una tabla de 200 millones de líneas obliga a leer todos los bloques.',
    figure: { kind: 'file-organization', org: 'heap' },
    caption: 'Fichero heap: los registros van a cualquier bloque libre en orden de llegada; cada uno tiene su bucket address, pero no se mantiene ningún orden.' },

  { id: 'hash', hub: 'index', topic: 'index', title: 'Organización hash (Hash File Organization)',
    summary: 'Una función hash genera la bucket address de cada registro a partir de su clave primaria; las localizaciones que genera se denominan data buckets o data blocks.',
    points: [
      '**Inserción**: se calcula h(clave) y se escribe el registro en ese bucket. La función puede ser una función matemática simple o una compleja; calcularla lleva un tiempo constante que no depende del estado de la memoria o del archivo.',
      '**Búsqueda por clave**: se vuelve a calcular h(clave) y se va directamente al bucket: sin ordenación y sin recorridos.',
      '**Inconvenientes**: eliminación accidental de datos si la clave está mal elegida (valores repetidos dan el mismo bucket); la memoria no se usa de manera eficiente porque los registros no están en ubicaciones consecutivas; **colisiones**; y no sirve bien para búsquedas por rango, porque claves vecinas acaban en buckets sin relación.',
      '**Aplicación**: bases de datos medianas con constantes operaciones de actualización o inserción y acceso por clave.',
    ],
    example: 'Con 5 buckets y h(id) = id mod 5: el empleado 1027 va al bucket 1027 mod 5 = **2** y el empleado 1030 al bucket **0**. Encontrar el 1027 lee solo el bucket 2. Pero "empleados con id entre 1000 y 1100" tiene que leer los 5 buckets. Usar `employee_name` como clave hash sería arriesgado: dos empleados llamados "Luis Pérez" caen en el mismo bucket y un borrado por nombre podría eliminar a los dos; combinar el nombre con el departamento o el NIF lo evita.',
    figure: { kind: 'file-organization', org: 'hash' },
    caption: 'La función hash convierte cada clave en una bucket address; el registro se guarda y después se encuentra en ese bucket.' },

  { id: 'btree', hub: 'index', topic: 'index', title: 'Organización en árbol B+ (B+ tree File Organization)',
    summary: 'Un árbol de búsqueda equilibrado en el que cada nodo puede tener muchos descendientes: todos los registros están en los nodos hoja, y los nodos intermedios actúan como punteros que conducen a ellos.',
    body: [
      'Los árboles B+ son parecidos a los árboles de búsqueda binaria, pero pueden tener más de dos nodos descendientes, lo que los hace muy poco profundos. Son una extensión de los ficheros ISAM. Las hojas se construyen a partir de un campo índice (el ID del registro), contienen el enlace a la bucket address de cada clave y están encadenadas, así que, tras encontrar la primera clave, puedes recorrer las siguientes en orden.',
    ],
    points: [
      '**Búsqueda**: desde la raíz, sigue en cada nivel el puntero cuyo rango contiene la clave, hasta llegar a una hoja. Coste = altura del árbol.',
      '**Inserción/borrado**: se baja hasta la hoja correcta; si se desborda, se divide y se sube una clave. El árbol se mantiene **equilibrado**: todas las ramas tienen la misma profundidad.',
      '**Ventajas**: búsqueda eficiente; las eliminaciones, inserciones o actualizaciones no afectan al rendimiento general; recorrido fácil y relativamente rápido; el tamaño crece o se reduce dinámicamente.',
      '**Inconveniente**: el coste de las operaciones de equilibrado para que la profundidad de todas las ramas se mantenga constante.',
      '**Aplicación**: grandes bases de datos con altas tasas de actualización.',
    ],
    example: 'Una tabla de 1.000.000 de clientes. Un recorrido completo compara hasta 1.000.000 de filas; la búsqueda binaria en un fichero ordenado, unos log₂ 1.000.000 ≈ **20** pasos. Un árbol B+ con 100 claves por nodo solo necesita **3 niveles** (100 × 100 × 100 = 1.000.000), es decir, 3 lecturas de bloque, y "clientes con id entre 5.000 y 5.099" continúa por las hojas encadenadas.',
    figure: { kind: 'btree' },
    caption: 'Los nodos intermedios solo guían la búsqueda; todos los registros se alcanzan a la misma profundidad, en las hojas enlazadas.',
    widget: 'index-search' },

  { id: 'clustered', hub: 'index', topic: 'index', title: 'Organización agrupada (Clustered File Organization)',
    summary: 'Dos o más registros/tablas se combinan en un solo bloque teniendo en cuenta un identificador/índice o el resultado de una función hash: el clúster ID.',
    points: [
      '**Indexed Clusters**: el clúster ID se obtiene directamente a partir del valor identificador/índice del fichero.',
      '**Hash Clusters**: el clúster ID se obtiene aplicando una función hash sobre los índices.',
      '**Inserción**: la nueva fila va al bloque de su clúster ID, junto a sus filas relacionadas de la otra tabla.',
      '**Ventajas**: buen rendimiento ante operaciones de join entre tablas; muy eficiente para implementar relaciones 1:M; reduce accesos a disco.',
      '**Inconvenientes**: ineficiente cuando no son necesarias operaciones frecuentes de join y en relaciones uno a uno; no es adecuado para grandes bases de datos.',
      '**Aplicación**: relaciones 1:N, por ejemplo muchos estudiantes pueden optar a un curso, y uso frecuente de join.',
    ],
    example: 'El curso DB241 y sus 45 estudiantes se guardan en el mismo bloque, con clúster ID `curso_id = DB241`. "Lista los estudiantes de DB241" lee un bloque en lugar de un bloque para el curso más hasta 45 bloques dispersos para los estudiantes.',
    figure: { kind: 'file-organization', org: 'clustered' },
    caption: 'Las filas de dos tablas que comparten clúster ID viven en el mismo bloque, así que el join ya está hecho en disco.' },

  { id: 'isam', hub: 'index', topic: 'index', title: 'ISAM (Indexed Sequential Access Method)',
    summary: 'Una organización de ficheros avanzada: a partir del ID de cada registro se genera una entrada en un archivo de índices separado, que apunta a la bucket address del bloque de memoria que contiene el registro.',
    points: [
      '**Búsqueda**: se busca la clave (o el inicio del rango) en el archivo de índices, pequeño y ordenado, se sigue el puntero al bloque de datos y se continúa leyendo de forma secuencial.',
      '**Inserción**: se escribe el registro y se añade su entrada al archivo de índices.',
      '**Ventajas**: facilita las búsquedas a partir de rangos de valores o patrones de búsqueda.',
      '**Inconvenientes**: necesita almacenamiento extra para los índices; cuando los registros aumentan en número, también aumentan los índices; mantenimiento más complejo.',
      '**Aplicación**: bases de datos de gran tamaño, dada la eficiencia de los índices para el acceso rápido a los datos.',
    ],
    example: '"Todos los estudiantes cuyo apellido empiece por Gar": el índice encuentra la primera entrada ≥ "Gar" (García, Ana → bloque 812), y la lectura sigue por García, Garrido... hasta el primer apellido que ya no empieza por "Gar". Solo se leen unos pocos bloques de entre miles.',
    figure: { kind: 'file-organization', org: 'isam' },
    caption: 'El archivo de índices guarda las claves ordenadas con punteros a los bloques de datos; una búsqueda por rango encuentra su inicio en el índice y después lee secuencialmente.' },

  { id: 'choosing-organization', hub: 'index', topic: 'index', title: 'Cómo elegir la organización de ficheros',
    summary: 'Elige la organización según el tamaño de la base de datos y su operación principal.',
    table: {
      caption: 'Según la operación principal (según el tamaño: pequeña < 10K registros → heap, alternativa secuencial; mediana 10K–1M → hash, alternativa árbol B+; grande > 1M → árbol B+, alternativa ISAM)',
      head: ['Operación principal', 'Mejor opción', '¿Por qué?'],
      rows: [
        ['Inserción masiva', 'Heap', 'No reorganiza, muy rápido'],
        ['Búsqueda por ID', 'Hash', 'Acceso directo constante'],
        ['Búsquedas ordenadas', 'Árbol B+', 'Datos naturalmente ordenados'],
        ['JOINs frecuentes', 'Agrupada (clustered)', 'Tablas juntas físicamente'],
        ['Búsquedas por rango', 'ISAM', 'Índices optimizados'],
        ['Solo lectura', 'Secuencial', 'Simple y eficiente'],
      ],
    },
    example: 'Una cadena de gimnasios: el registro de los tornos (2 millones de inserciones al día, casi nunca leído) → heap; buscar a un socio por su número de tarjeta entre 300.000 → hash; la tabla de 40 millones de visitas consultada "por mes" y actualizada constantemente → árbol B+; cada clase con sus reservas, que siempre se leen juntas → agrupada.',
    mistake: 'Elegir hash para una tabla que se consulta sobre todo por rangos ("pedidos del 1 al 15 de mayo"). El hash dispersa las claves vecinas, así que cada consulta por rango se convierte en un recorrido completo.' },

  /* ---- 8. Ciclo de vida de los datos ------------------------------------------------ */
  { id: 'data-model', hub: 'lifecycle', topic: 'lifecycle', title: 'Modelos de datos y para qué sirven',
    summary: 'Un modelo de datos es un conjunto de pasos, tareas y técnicas de representación para obtener estructuras de datos que resuelvan un problema de forma metódica y sencilla.',
    body: [
      'Es un instrumento que permite representar las necesidades del usuario. Incluye conceptos matemáticamente bien definidos para expresar propiedades estáticas y dinámicas de los datos de una aplicación.',
    ],
    points: [
      '**Control de errores**: se detectan y corrigen antes de la implementación.',
      '**Independencia**: las estructuras de datos se mantienen separadas del entorno físico y lógico.',
      '**Mejora del mantenimiento**: facilita la gestión y actualización del sistema.',
      '**Mejor comprensión del problema**: los modelos ayudan a entender claramente las necesidades.',
      '**Facilita la comunicación**: mejora la colaboración entre los miembros del equipo de desarrollo.',
    ],
    example: 'Al dibujar el modelo de una cadena de gimnasios, el equipo se da cuenta de que un socio puede pertenecer a varios gimnasios. Corregir una línea del diagrama cuesta minutos; descubrirlo después del lanzamiento, con 300.000 socios guardados con un único `gimnasio_id`, obliga a migrar datos y reescribir consultas.' },

  { id: 'lifecycle-stages', hub: 'lifecycle', topic: 'lifecycle', title: 'El ciclo de vida del modelado de datos',
    summary: 'Desde la semántica/requisitos, pasando por el diseño conceptual, lógico y físico, cada uno con su modelo; las técnicas de ingeniería del software cierran el ciclo desde el diseño físico hasta los requisitos.',
    body: [
      'Pasar de los requisitos al diseño conceptual es una **abstracción compleja**: decidir qué importa (el Qué, no el Cómo). Cada etapa de diseño produce un modelo: el **modelo conceptual** (E/R), el **modelo lógico** (tablas) y el **modelo físico** (almacenamiento en un SGBD concreto). El mantenimiento devuelve nuevos requisitos al ciclo.',
    ],
    table: {
      caption: 'Ejemplo conductor: una cadena de gimnasios, "FitRed"',
      head: ['Etapa', 'Qué se hace', 'FitRed'],
      rows: [
        ['Semántica / requisitos', 'Entrevistar a los usuarios, recoger las reglas de negocio', 'Los socios se apuntan a uno o más gimnasios; los gimnasios ofrecen clases; un socio reserva clases; una clase tiene como máximo 20 plazas; la dirección necesita las visitas por mes'],
        ['Diseño conceptual → modelo conceptual', 'Diagrama E/R, independiente del SGBD', 'Entidades SOCIO, GIMNASIO, CLASE; relación RESERVA (SOCIO M:N CLASE); OFRECE (GIMNASIO 1:N CLASE)'],
        ['Diseño lógico → modelo lógico', 'Tablas, claves, claves foráneas', '`socio(socio_id PK, nombre, email)`, `clase(clase_id PK, gimnasio_id FK, inicio, plazas)`, `reserva(socio_id FK, clase_id FK, PK(socio_id, clase_id))`'],
        ['Diseño físico → modelo físico', 'SGBD, tipos, índices, organización de ficheros', 'PostgreSQL sobre SSD; `CHECK (plazas <= 20)`; índice árbol B+ sobre `reserva(clase_id)`; tabla heap para los registros de los tornos'],
        ['Mantenimiento (vuelta a los requisitos)', 'Monitorizar, optimizar, incorporar nuevas necesidades', 'FitRed añade entrenadores personales: nueva entidad ENTRENADOR y relación ENTRENA, y el ciclo vuelve a empezar'],
      ],
    },
    example: 'En FitRed, la regla "una clase tiene como máximo 20 plazas" aparece en los requisitos, se convierte en un atributo `plazas` de CLASE en el modelo conceptual, en una columna en el modelo lógico y en una restricción `CHECK` más una transacción en el diseño físico.',
    figure: { kind: 'lifecycle' },
    caption: 'Requisitos → diseño conceptual → lógico → físico, cada uno con su modelo; el mantenimiento vuelve a los requisitos.' },
];

DATA.es.THEORY_QUIZ = [
  // Q1
  { type: 'mc', topic: 'dbms',
    q: 'Inspeccionas un SGBD y encuentras una estructura del sistema que guarda la definición de cada tabla (nombres de columnas, tipos de datos, restricciones) separada de las propias filas. Lo que se guarda ahí se llama:',
    choices: ['datos de usuario', 'metadatos (el catálogo / diccionario de datos)', 'un sub-esquema', 'una bucket address'],
    answer: 1,
    why: 'Un SGBD es **autodescriptivo**: el esquema vive en el catálogo, y lo que guarda el catálogo son metadatos, no datos de usuario.' },
  // Q2
  { type: 'mc', topic: 'info',
    q: 'El equipo de operaciones firma un **SLA de disponibilidad del 99,999 %**. ¿Cuánto tiempo de caída al año permite, aproximadamente?',
    choices: ['~5,26 minutos', '~52,6 minutos', '~8,76 horas', '~5,26 horas'],
    answer: 0,
    why: 'El 99,999 % deja un 0,001 % del año ≈ 5,26 minutos. La disponibilidad es una de las tres facetas de la fiabilidad (junto con la exactitud y la consistencia).' },
  // Q3
  { type: 'mc', topic: 'info',
    q: 'El sistema central de un banco registra cada pago con tarjeta en el instante en que ocurre, con un volumen muy alto y el máximo detalle. ¿Qué nivel del sistema de información es?',
    choices: ['Nivel operativo (TPS / OLTP)', 'Nivel de conocimiento (MIS)', 'Nivel táctico (DSS)', 'Nivel estratégico (EIS / ESS)'],
    answer: 0,
    why: 'El nivel operativo procesa transacciones en tiempo real: el mayor volumen, el máximo detalle y el horizonte más corto.' },
  // Q4
  { type: 'mc', topic: 'info',
    q: '¿Qué nivel da soporte al análisis y la **simulación**, con frecuencia mensual y un horizonte de meses a años?',
    choices: ['Nivel operativo (TPS / OLTP)', 'Nivel de conocimiento (MIS)', 'Nivel táctico (DSS)', 'Nivel estratégico (EIS / ESS)'],
    answer: 2,
    why: 'El nivel táctico (Decision Support System) sirve para análisis y simulaciones; el nivel estratégico tiene todavía menos volumen y un horizonte más largo.' },
  // Q5
  { type: 'mc', topic: 'dbms',
    q: '¿Qué actor define y modifica el esquema, elige la estructura de almacenamiento y los métodos de acceso, y asigna derechos de acceso a roles y usuarios?',
    choices: ['Usuario final', 'Desarrollador de aplicaciones', 'Administrador de la base de datos (DBA)', 'Usuario avanzado'],
    answer: 2,
    why: 'Esas cuatro tareas (esquema, organización física, derechos y mantenimiento) son exactamente las responsabilidades del DBA.' },
  // Q6
  { type: 'mc', topic: 'files',
    q: 'Un equipo guarda los datos de clientes en varios ficheros `.csv`. Uno escribe a una persona como "Alberto López" y otro como "A. López". ¿Qué problema de la gestión con ficheros es este?',
    choices: ['Redundancia', 'Inconsistencia', 'Acceso limitado', 'Dependencia de la estructura'],
    answer: 1,
    why: 'La redundancia es la **repetición**; la inconsistencia es **referirse al mismo hecho de formas diferentes**, que es lo que falla aquí.' },
  // Q7
  { type: 'mc', topic: 'files',
    q: '¿Qué comando elimina una tabla **junto con su estructura**, de modo que hay que volver a crearla para poder usarla?',
    choices: ['`TRUNCATE TABLE`', '`DROP TABLE`', '`DELETE FROM`', '`ALTER TABLE`'],
    answer: 1,
    why: '`DROP` elimina la estructura y los datos; `TRUNCATE`/`DELETE` solo eliminan filas y conservan la tabla.' },
  // Q8
  { type: 'mc', topic: 'files',
    q: '¿Cuál de estas es una sentencia DML cuya función es **modificar datos dentro de filas existentes**?',
    choices: ['`CREATE`', '`ALTER`', '`UPDATE`', '`RENAME`'],
    answer: 2,
    why: '`CREATE`, `ALTER` y `RENAME` son DDL (estructura). El DML es `SELECT` / `INSERT` / `UPDATE` / `DELETE`: datos.' },
  // Q9
  { type: 'mc', topic: 'dbms',
    q: 'Cambias el nombre de una columna en la base de datos y los programas de aplicación que la consultan siguen funcionando sin cambios. ¿Qué propiedad del SGBD lo hace posible?',
    choices: ['Catálogo autodescriptivo', 'Aislamiento entre programas y datos', 'Varias vistas de los datos', 'Seguridad frente a accesos no autorizados'],
    answer: 1,
    why: 'El aislamiento entre programas y datos mantiene la estructura de la BD separada de los programas, así que la estructura puede cambiar sin reescribir todos los programas.' },
  // Q10
  { type: 'mc', topic: 'acid',
    q: 'Una transferencia debe cargar la cuenta A y abonar la cuenta B. El sistema se cae después del cargo; al reiniciar **no** está ninguno de los dos cambios. ¿Qué propiedad ACID ha producido ese resultado?',
    choices: ['Atomicidad', 'Consistencia', 'Aislamiento', 'Durabilidad'],
    answer: 0,
    why: 'Atomicidad = todas las operaciones se ejecutan o ninguna; una transacción incompleta se revierte entera.' },
  // Q11
  { type: 'mc', topic: 'acid',
    q: 'Dos clientes intentan comprar la última unidad de un producto en el mismo instante. El SGBD hace que el segundo espere hasta que el primero confirme, así que la unidad nunca se vende dos veces. ¿Qué propiedad actúa?',
    choices: ['Atomicidad', 'Consistencia', 'Aislamiento', 'Durabilidad'],
    answer: 2,
    why: 'El aislamiento hace invisible una transacción no confirmada, así que dos compradores concurrentes no pueden leer ambos el mismo stock disponible.' },
  // Q12
  { type: 'mc', topic: 'acid',
    q: 'Se va la luz justo después de un `COMMIT`; cuando el servidor vuelve, el pago sigue registrado. ¿Qué propiedad lo garantiza?',
    choices: ['Aislamiento', 'Durabilidad', 'Atomicidad', 'Consistencia'],
    answer: 1,
    why: 'La durabilidad hace permanente una transacción confirmada aunque haya un corte de luz, un reinicio, una caída de la red o un fallo de hardware.' },
  // Q13
  { type: 'mc', topic: 'acid',
    q: 'El SGBD rechaza un `UPDATE` que pondría una edad a `-20`, porque viola una regla de negocio. ¿Qué propiedad ACID se está haciendo cumplir?',
    choices: ['Atomicidad', 'Consistencia', 'Aislamiento', 'Durabilidad'],
    answer: 1,
    why: 'Consistencia (reglas de integridad, incluida la integridad referencial): la base de datos rechaza las operaciones que violarían sus reglas.' },
  // Q14
  { type: 'mc', topic: 'levels',
    q: '¿Qué nivel ANSI/SPARC especifica **qué, cómo y dónde** se van a almacenar físicamente los datos?',
    choices: ['Nivel externo', 'Nivel conceptual', 'Nivel interno', 'Nivel de vistas'],
    answer: 2,
    why: 'El nivel interno describe el almacenamiento físico; el externo son las vistas parciales de los usuarios; el conceptual es la vista lógica global.' },
  // Q15
  { type: 'mc', topic: 'levels',
    q: 'Cambias la organización de los ficheros en disco **sin** alterar el esquema conceptual ni las aplicaciones. ¿Qué independencia lo hace posible?',
    choices: ['Independencia lógica', 'Independencia física', 'Integridad referencial', 'Independencia semántica'],
    answer: 1,
    why: 'La independencia física es la separación entre el nivel conceptual y el interno; la independencia lógica separa el externo del conceptual.' },
  // Q16
  { type: 'mc', topic: 'storage',
    q: 'Una tabla de longitud fija con `CHAR` da a cada fila un registro de 97 bytes. ¿Cuál es la **principal** ventaja de esa previsibilidad?',
    choices: ['Ahorra espacio de almacenamiento en los campos variables', 'La posición de cualquier registro se puede calcular directamente, así que el acceso es rápido', 'Hace eficientes los campos multivaluados', 'Elimina la necesidad de un índice'],
    answer: 1,
    why: 'La longitud fija es rápida y sencilla de direccionar; a cambio, desperdicia espacio y tiene límites rígidos.' },
  // Q17
  { type: 'mc', topic: 'storage',
    q: 'En el modelo de tiempo de respuesta `Ts = α + β·b`, ¿qué término domina una consulta sobre un HDD que lee un bloque pequeño?',
    choices: ['α, el tiempo de búsqueda', 'β, la tasa de transferencia', 'b, el tamaño del bloque', 'Ninguno; se compensan'],
    answer: 0,
    why: 'Con bloques pequeños el tiempo de búsqueda fijo α domina sobre el término de transferencia β·b; por eso el rendimiento de un HDD está dominado por las búsquedas.' },
  // Q18
  { type: 'mc', topic: 'index',
    q: 'Una tabla tiene **más de un millón de filas**, se actualiza constantemente y se consulta a menudo de forma ordenada por rangos. ¿Qué organización de ficheros encaja mejor?',
    choices: ['Heap', 'Secuencial', 'Árbol B+', 'Agrupada (clustered)'],
    answer: 2,
    why: 'Para bases de datos grandes con altas tasas de actualización y consultas ordenadas, la organización recomendada es el árbol B+, equilibrado y dinámico.' },
  // Q19
  { type: 'mc', topic: 'index',
    q: 'Dos tablas se combinan siempre con join en una relación 1:N. ¿Qué organización coloca físicamente sus filas relacionadas en el mismo bloque de memoria?',
    choices: ['Hash', 'Agrupada (clustered)', 'ISAM', 'Heap'],
    answer: 1,
    why: 'La organización agrupada combina en un bloque filas relacionadas de distintas tablas, lo que da un rendimiento excelente en los joins 1:M.' },
  // Q20
  { type: 'mc', topic: 'index',
    q: '¿Cuál es un **inconveniente** real de la organización hash?',
    choices: ['No puede localizar un registro por su clave primaria', 'No puede atender búsquedas por rango de forma eficiente', 'Siempre exige reordenar todo el fichero en cada inserción', 'No puede usar una clave hash'],
    answer: 1,
    why: 'El hash da acceso por clave en tiempo constante, pero destruye el orden entre claves vecinas, así que es malo para búsquedas por rango o por patrón.' },
  // Q21
  { type: 'mc', topic: 'files',
    q: 'En el vocabulario de esquemas y lenguajes de la asignatura, ¿qué es un **sub-esquema**?',
    choices: ['La vista lógica global de toda la base de datos', 'La parte de la base de datos que un usuario o aplicación concretos pueden ver', 'La disposición física de los ficheros en disco', 'El catálogo de metadatos del sistema'],
    answer: 1,
    why: 'El esquema es la organización conceptual a cargo del DBA; los sub-esquemas son las vistas de usuarios y aplicaciones, con sus propios criterios y restricciones.' },
  // Q22
  { type: 'tf', topic: 'info',
    q: 'El nivel de conocimiento (MIS) hace seguimiento y control de la información con frecuencia diaria/semanal y un horizonte temporal de días a semanas.',
    answer: true,
    why: 'El MIS está por encima del OLTP: menos volumen, detalle medio y horizonte de días/semanas. Por encima están el nivel táctico (DSS) y el estratégico (EIS/ESS).' },
  // Q23
  { type: 'tf', topic: 'files',
    q: 'Un sistema basado en ficheros permite que varios usuarios modifiquen los mismos datos a la vez con el mismo control que ofrece un SGBD.',
    answer: false,
    why: 'Los sistemas de ficheros sufren **acceso limitado** (solo una aplicación o usuario modifica a la vez) y un procesamiento **sin control**; la concurrencia controlada es una ventaja del SGBD.' },
  // Q24
  { type: 'tf', topic: 'lifecycle',
    q: 'Un modelo de datos solo es útil **después** de la implementación, para documentar el esquema terminado.',
    answer: false,
    why: 'Una ventaja clave es el **control de errores**: los errores se detectan y corrigen **antes** de la implementación. Las demás son independencia, mantenimiento, comprensión y comunicación.' },
  // Q25
  { type: 'tf', topic: 'storage',
    q: 'En `Ts = α + β·b`, para una tasa de transferencia fija, el término de transferencia crece linealmente con el tamaño de bloque `b`.',
    answer: true,
    why: 'β·b es lineal en `b`; como el tiempo de E/S es casi independiente de la cantidad de datos, leemos bloques grandes (típicamente 4 KB) para amortizar el α fijo.' },
  // Q26
  { type: 'fib', topic: 'index',
    q: 'Una organización de ficheros calcula la **bucket address** de un registro a partir de su clave primaria usando una función ____.',
    accept: ['hash', 'hashing', 'función hash', 'hash function'],
    why: 'En la organización hash, h(clave) da el bucket (bloque de datos) donde se guarda y se encuentra el registro.' },
  // Q27
  { type: 'fib', topic: 'storage',
    q: 'En `Ts = α + β·b`, el término **α** es el tiempo de ____: el tiempo medio para localizar la información en el disco.',
    accept: ['búsqueda', 'tiempo de búsqueda', 'seek', 'seek time'],
    why: 'α es el tiempo de búsqueda; β es la tasa de transferencia (tiempo por unidad de datos) y b el tamaño del bloque.' },
  // Q28
  { type: 'fib', topic: 'files',
    q: 'El comando DDL que elimina una tabla junto con sus datos es ____.',
    accept: ['DROP', 'DROP TABLE'],
    why: '`DROP TABLE` elimina la tabla y sus datos; `TRUNCATE TABLE` la vacía pero conserva la estructura.' },

  // Preguntas adicionales basadas en los apuntes
  { type: 'mc', topic: 'info', extra: true,
    q: '¿Cuál de estos es un componente de un sistema de información según los apuntes?',
    choices: ['Solo la base de datos', 'Contenidos, equipo físico, equipo lógico y equipo humano', 'Solo el hardware y el software', 'El diagrama E/R y los scripts SQL'],
    answer: 1,
    why: 'Un sistema de información se compone de contenidos (datos), equipo físico (hardware, on premise o cloud), equipo lógico (software, arquitecturas) y equipo humano (usuarios, DBA, data engineer...).' },
  { type: 'tf', topic: 'files', extra: true,
    q: 'Guardar la misma dirección de un empleado en el fichero de RR. HH. y en el de Nóminas es redundancia, y puede provocar inconsistencia cuando solo se actualiza una de las copias.',
    answer: true,
    why: 'La redundancia es la repetición; la inconsistencia es la consecuencia cuando las copias divergen. Una base de datos guarda la dirección una sola vez.' },
  { type: 'mc', topic: 'dbms', extra: true,
    q: 'Dentro del SGBD, ¿qué componente del gestor de almacenamiento decide qué bloques del disco se mantienen en memoria?',
    choices: ['Intérprete del DDL', 'Gestor de memoria intermedia', 'Motor de evaluación de consultas', 'Precompilador del DML incorporado'],
    answer: 1,
    why: 'El gestor de almacenamiento contiene el gestor de transacciones, el gestor de memoria intermedia (bloques en memoria) y el gestor de ficheros (ficheros en disco); los otros tres pertenecen al procesador de consultas.' },
  { type: 'fib', topic: 'acid', extra: true,
    q: 'Una transacción se vuelve permanente, y visible para las demás transacciones, cuando termina con ____.',
    accept: ['COMMIT'],
    why: 'Hasta el `COMMIT` la transacción es invisible (aislamiento) y se puede deshacer (atomicidad); después, no se puede perder (durabilidad).' },
  { type: 'mc', topic: 'levels', extra: true,
    q: 'Añades una columna `telefono` a la tabla `alumno` y la vista que usan los profesores sigue funcionando sin cambios. ¿Qué propiedad es esta?',
    choices: ['Independencia física', 'Independencia lógica', 'Durabilidad', 'Integridad referencial'],
    answer: 1,
    why: 'La independencia lógica separa el nivel conceptual del externo: el esquema conceptual ha cambiado y la vista externa no.' },
  { type: 'tf', topic: 'levels', extra: true,
    q: 'En la arquitectura ANSI/X3/SPARC, el nivel conceptual es el esquema completo de la base de datos y aísla entre sí los niveles externo e interno.',
    answer: true,
    why: 'El nivel conceptual es la vista lógica global: refleja la estructura de los datos del mundo real y se sitúa entre las vistas de los usuarios y el almacenamiento físico.' },
  { type: 'mc', topic: 'storage', extra: true,
    q: 'HDD con α = 8 ms, operaciones a 100 MB/s y bloques de 4 KB (0,004 MB). ¿Cuánto vale Ts = α + β·b?',
    choices: ['8,004 ms', '8,04 ms', '8,4 ms', '48 ms'],
    answer: 1,
    why: 'β = 1/100 s/MB = 10 ms/MB, así que β·b = 10 × 0,004 = 0,04 ms y Ts = 8 + 0,04 = 8,04 ms: dominado por la búsqueda.' },
  { type: 'mc', topic: 'index', extra: true,
    q: 'Un sistema escribe millones de líneas de log y casi nunca las busca. ¿Qué organización recomiendan los apuntes para esta inserción masiva?',
    choices: ['Heap', 'Hash', 'ISAM', 'Agrupada (clustered)'],
    answer: 0,
    why: 'Un fichero heap simplemente añade los nuevos registros al final sin reorganizar, lo que hace la inserción muy rápida.' },
  { type: 'mc', topic: 'index', extra: true,
    q: '¿Qué organización facilita encontrar "todos los estudiantes cuyo apellido empiece por Gar"?',
    choices: ['Hash', 'Heap', 'ISAM', 'Archivo de pila'],
    answer: 2,
    why: 'ISAM mantiene un archivo de índices ordenado: encuentra la primera clave ≥ "Gar" y sigue leyendo secuencialmente. El hash dispersa las claves vecinas.' },
  { type: 'mc', topic: 'lifecycle', extra: true,
    q: '¿Cuál es el orden correcto del ciclo de vida del modelado de datos?',
    choices: ['Diseño lógico → conceptual → físico', 'Requisitos → diseño conceptual → lógico → físico', 'Diseño físico → lógico → conceptual', 'Requisitos → diseño físico → lógico → conceptual'],
    answer: 1,
    why: 'Desde la semántica/requisitos, cada etapa de diseño produce su modelo: conceptual (E/R), lógico (tablas) y físico (SGBD concreto).' },
  { type: 'fib', topic: 'lifecycle', extra: true,
    q: 'La etapa de diseño que produce el diagrama E/R, independiente de cualquier SGBD, es el diseño ____.',
    accept: ['conceptual'],
    why: 'El diseño conceptual da el modelo conceptual; el diseño lógico lo convierte en tablas y el físico en almacenamiento en un SGBD concreto.' },
  { type: 'tf', topic: 'lifecycle', extra: true,
    q: 'Pasar de los requisitos al diseño conceptual se centra en el Qué, no en el Cómo: elegir los índices corresponde al diseño físico.',
    answer: true,
    why: 'Las primeras etapas definen la semántica del problema; los tipos, los índices y las organizaciones de ficheros se deciden en el diseño físico.' },
];
