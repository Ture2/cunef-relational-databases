'use strict';
/* Teoría de la normalización: una tarjeta por concepto, para leer antes de los ejercicios (js/normalization-section.js).
   Campos de cada tarjeta: los de js/concept-section.js, más
     nf      id de una forma normal ('2NF'...): la tarjeta muestra NF_INFO[nf].how y enlaza con un ejercicio de esa forma
     video   true: la tarjeta incrusta el vídeo del curso (assets/video/) con sus capítulos
   Tablas: la primera columna es una cabecera de fila; las cabeceras en **negrita** son columnas de la clave primaria.
   El ejemplo conductor es la tabla de matrículas del vídeo (Ana Ruiz, Bases de datos, Informática). */
DATA.es.NORM_THEORY = [
  /* ───────────── Por qué normalizar ───────────── */
  {
    id: 'anomalies',
    hub: 'why',
    title: 'Redundancia y anomalías',
    summary: 'Una tabla que mezcla varios hechos **repite** datos. Cada repetición abre la puerta a tres **anomalías**: de actualización, de inserción y de borrado.',
    body: [
      'Esta tabla guarda todas las matrículas en un solo sitio. Su clave es (id estudiante, id asignatura): una fila por matrícula. Pero el nombre del estudiante se repite en cada asignatura que cursa, y el nombre de la asignatura, sus créditos y su departamento se repiten por cada estudiante matriculado.',
    ],
    points: [
      '**Anomalía de actualización**: si cambias el nombre de la asignatura C10 en una sola fila, la misma asignatura pasa a tener dos nombres.',
      '**Anomalía de inserción**: no se puede guardar una asignatura nueva que aún no tiene estudiantes, porque id asignatura por sí solo no es clave e id estudiante no puede ser NULL.',
      '**Anomalía de borrado**: si borras la última matrícula de una asignatura, su nombre y sus créditos desaparecen con ella.',
    ],
    table: {
      caption: 'Matrícula: una sola tabla ancha (negrita = clave primaria)',
      head: ['**id estudiante**', '**id asignatura**', 'nombre estudiante', 'nombre asignatura', 'créditos', 'dpto', 'nota'],
      rows: [
        ['S01', 'C10', 'Ana Ruiz', 'Bases de datos', '6', 'Informática', '8,5'],
        ['S01', 'C20', 'Ana Ruiz', 'Estadística', '6', 'Matemáticas', '7,0'],
        ['S02', 'C10', 'Luis Gil', 'Bases de datos', '6', 'Informática', '6,5'],
        ['S03', 'C10', 'Eva Sanz', 'Bases de datos', '6', 'Informática', '5,0'],
      ],
    },
    example: 'La normalización divide esta tabla para que cada hecho se guarde una sola vez: los estudiantes en una tabla, las asignaturas en otra, los departamentos en una tercera y las matrículas (estudiante, asignatura, nota) enlazándolas.',
    mistake: 'Pensar que la redundancia solo desperdicia espacio. El coste real es la inconsistencia: dos filas que deberían coincidir pueden acabar contradiciéndose.',
  },
  {
    id: 'video',
    hub: 'why',
    title: 'Vídeo: la normalización paso a paso',
    summary: 'Un recorrido de seis minutos por todo el camino, desde una tabla desordenada hasta 1FN, 2FN, 3FN y FNBC, con el mismo ejemplo que estas tarjetas.',
    body: [
      'Míralo una vez antes de las tarjetas, o usa los capítulos para saltar al paso que necesites. Los subtítulos están en inglés.',
    ],
    video: true,
  },

  /* ───────────── Dependencias ───────────── */
  {
    id: 'fd',
    hub: 'deps',
    title: 'Dependencia funcional',
    summary: '`X → Y` (X **determina** Y) significa: dos filas que coinciden en X coinciden siempre en Y. Conocido X, solo hay un Y posible.',
    body: [
      'Las dependencias salen del **significado** de los datos, no de una muestra. Cada estudiante tiene un solo nombre, así que `id estudiante → nombre estudiante`. Una asignatura tiene un solo nombre y un solo número de créditos, así que `id asignatura → nombre asignatura, créditos`.',
      'Los datos pueden **refutar** una dependencia, pero nunca demostrarla. Si dos filas tienen el mismo id asignatura y nombres distintos, `id asignatura → nombre asignatura` es falsa. Si da la casualidad de que coinciden, eso solo es compatible con ella.',
      'X, el **determinante**, puede tener varios atributos. La nota depende del estudiante y de la asignatura a la vez: `id estudiante, id asignatura → nota`.',
    ],
    points: [
      'Lee `X → Y` como "para cada X, un único Y".',
      'Trivial: `X → Y` cuando Y forma parte de X (se cumple siempre).',
      'Toda clave determina todos los atributos de su tabla.',
    ],
    example: 'En la tabla de matrículas: `id estudiante → nombre estudiante`, `id asignatura → nombre asignatura, créditos, dpto` e `id estudiante, id asignatura → nota`.',
    mistake: 'Leer la flecha al revés. `id estudiante → nombre estudiante` no significa que el nombre determine el id: dos estudiantes pueden llamarse igual.',
  },
  {
    id: 'keys',
    hub: 'deps',
    title: 'Claves y cierre de atributos',
    summary: 'Una **clave candidata** es un conjunto mínimo de atributos que determina todos los demás. El **cierre** X⁺ (todo lo que X determina) es la forma de comprobarlo.',
    body: [
      'Para calcular X⁺: empieza con X. Después, mientras alguna dependencia `A → B` tenga todo A dentro del conjunto, añade B. Cuando ya no se pueda añadir nada, el conjunto es X⁺.',
      'X es una **superclave** si X⁺ contiene todos los atributos. Es una **clave candidata** si, además, ninguna parte más pequeña de X es superclave. La **clave primaria** es la clave candidata que eliges. Los atributos que pertenecen a alguna clave candidata son **primos**.',
    ],
    points: [
      '{id estudiante}⁺ = {id estudiante, nombre estudiante}: no es clave.',
      '{id asignatura}⁺ = {id asignatura, nombre asignatura, créditos, dpto}: no es clave.',
      '{id estudiante, id asignatura}⁺ = todos los atributos, y ninguna de las dos partes basta por sí sola, así que es una **clave candidata**.',
    ],
    example: 'Con `id estudiante → nombre`, `id asignatura → nombre asignatura, créditos, dpto` e `id estudiante, id asignatura → nota`, la única clave candidata de Matrícula es (id estudiante, id asignatura).',
    mistake: 'Llamar clave a cualquier conjunto que identifique las filas. (id estudiante, id asignatura, nota) también las identifica, pero es una superclave, no una clave candidata, porque nota sobra.',
  },
  {
    id: 'partial',
    hub: 'deps',
    title: 'Dependencia completa y parcial',
    summary: 'Un atributo depende **completamente** de una clave compuesta cuando necesita la clave entera. Depende **parcialmente** cuando basta con una parte de la clave.',
    body: [
      'Con la clave (id estudiante, id asignatura), la nota necesita las dos partes: un estudiante tiene una nota por asignatura. Es una dependencia **completa**.',
      'El nombre del estudiante solo necesita id estudiante, y el nombre de la asignatura solo necesita id asignatura. Son dependencias **parciales**, y son exactamente lo que elimina 2FN.',
      'Solo puede haber dependencias parciales cuando la clave tiene dos o más atributos.',
    ],
    points: [
      'Completa: `id estudiante, id asignatura → nota`.',
      'Parciales: `id estudiante → nombre estudiante`, `id asignatura → nombre asignatura, créditos`.',
    ],
    tables: [{
      caption: 'Qué parte de la clave necesita cada atributo',
      head: ['Atributo', 'Depende de', 'Tipo'],
      rows: [
        ['nota', 'id estudiante + id asignatura', 'Completa'],
        ['nombre estudiante', 'id estudiante', 'Parcial'],
        ['nombre asignatura, créditos, dpto', 'id asignatura', 'Parcial'],
      ],
    }],
    mistake: 'Buscar dependencias parciales en una tabla con clave de un solo atributo. No las hay, así que esa tabla, si está en 1FN, ya está en 2FN.',
  },
  {
    id: 'transitive',
    hub: 'deps',
    title: 'Dependencia transitiva',
    summary: 'Una dependencia **transitiva** es una cadena: la clave determina A, y A, que no es clave, determina B. B depende de la clave solo **a través de** A.',
    body: [
      'En la tabla Asignatura (id asignatura, nombre, créditos, id dpto, nombre dpto), la clave id asignatura determina id dpto, e id dpto determina nombre dpto. El nombre del departamento es un dato del departamento, no de la asignatura.',
      'Cada asignatura del mismo departamento repite el nombre del departamento. Cambiar el nombre del departamento obliga a actualizar todas sus asignaturas. Esto es lo que elimina 3FN.',
    ],
    points: [
      'Patrón: `clave → A → B`, donde A **no** es clave y B no forma parte de ninguna clave.',
      'Solución: lleva A y B a su propia tabla, con A como clave, y deja A en la tabla original como clave ajena.',
    ],
    example: '`id asignatura → id dpto` e `id dpto → nombre dpto`, así que `id asignatura → nombre dpto` es transitiva.',
    mistake: 'Llamar transitiva a cualquier cadena. Si A es una clave candidata, `clave → A → B` no causa redundancia.',
  },
  {
    id: 'mvd',
    hub: 'deps',
    title: 'Dependencia multivaluada',
    summary: '`X ↠ Y` significa: X determina un **conjunto** de valores de Y, independiente del resto de la fila. Aparece cuando una tabla guarda dos listas independientes sobre X.',
    body: [
      'Una asignatura tiene varios profesores y varios libros recomendados, y cualquier profesor puede usar cualquier libro. En una tabla (asignatura, profesor, libro), cada profesor tiene que combinarse con cada libro de la asignatura; si no, la tabla sugeriría, sin razón, que un profesor solo usa algunos.',
      'Se escribe `asignatura ↠ profesor | libro`: para cada asignatura, los profesores y los libros son independientes. Aquí no hay ninguna dependencia funcional y los tres atributos forman la clave, pero los datos siguen siendo redundantes.',
    ],
    tables: [{
      caption: 'Oferta de asignaturas: cada profesor × cada libro (negrita = clave)',
      head: ['**asignatura**', '**profesor**', '**libro**'],
      rows: [
        ['Bases de datos', 'Ruiz', 'Elmasri'],
        ['Bases de datos', 'Ruiz', 'Date'],
        ['Bases de datos', 'Gil', 'Elmasri'],
        ['Bases de datos', 'Gil', 'Date'],
      ],
    }],
    example: 'Añadir un tercer libro a Bases de datos exige dos filas nuevas, una por profesor. Esa es la redundancia que elimina 4FN.',
    mistake: 'Ver una dependencia multivaluada siempre que un atributo tiene varios valores. Hacen falta **dos** listas independientes entre sí.',
  },
  {
    id: 'jd',
    hub: 'deps',
    title: 'Dependencia de reunión',
    summary: 'Una tabla tiene una **dependencia de reunión** cuando puede reconstruirse exactamente reuniendo algunas de sus proyecciones. Las dependencias multivaluadas son el caso de dos partes.',
    body: [
      'Algunas reglas de negocio enlazan tres cosas en un ciclo: "si un proveedor suministra una pieza, la pieza se usa en un proyecto y el proveedor trabaja para ese proyecto, entonces el proveedor suministra esa pieza a ese proyecto". Con una regla así, la tabla ternaria (proveedor, pieza, proyecto) es la reunión de sus tres parejas.',
      'Se escribe `⋈{(proveedor, pieza), (pieza, proyecto), (proveedor, proyecto)}`. Hay que conservar todas las parejas: reunir solo dos de ellas produce filas que nunca existieron.',
    ],
    points: [
      'Solo se cumple si la regla de negocio se cumple **siempre**, nunca solo por los datos actuales.',
      'La elimina 5FN, que guarda las parejas en lugar de la terna.',
    ],
    mistake: 'Descomponer una tabla ternaria en parejas sin una regla así. Sin la regla, la reunión de las parejas se inventa combinaciones y la descomposición no es sin pérdida.',
  },

  /* ───────────── Formas normales ───────────── */
  {
    id: 'nf1',
    hub: 'forms',
    nf: '1NF',
    title: 'Primera forma normal (1FN)',
    summary: '**Una celda, un valor.** Todos los atributos son atómicos, no hay grupos repetitivos y la tabla tiene clave primaria.',
    body: [
      'Una celda como "Bases de datos, Estadística" o un conjunto de columnas asignatura1, asignatura2, asignatura3 incumple 1FN. No se puede consultar, indexar ni restringir los valores que hay dentro de una lista.',
      'Se corrige con una fila por valor, ampliando la clave para que siga identificando cada fila. Otra opción es llevar la lista a su propia tabla, con la clave de su propietario.',
    ],
    tables: [
      {
        caption: 'No está en 1FN: una lista en una celda',
        head: ['**id estudiante**', 'nombre estudiante', 'asignaturas'],
        rows: [['S01', 'Ana Ruiz', 'C10, C20'], ['S02', 'Luis Gil', 'C10, C11']],
      },
      {
        caption: 'En 1FN: una asignatura por fila, clave (id estudiante, id asignatura)',
        head: ['**id estudiante**', '**id asignatura**', 'nombre estudiante'],
        rows: [['S01', 'C10', 'Ana Ruiz'], ['S01', 'C20', 'Ana Ruiz'], ['S02', 'C10', 'Luis Gil'], ['S02', 'C11', 'Luis Gil']],
      },
    ],
    mistake: 'Pensar que 1FN es el final. La tabla en 1FN de arriba repite cada nombre por asignatura: ahora tiene una dependencia parcial, que elimina 2FN.',
  },
  {
    id: 'nf2',
    hub: 'forms',
    nf: '2NF',
    title: 'Segunda forma normal (2FN)',
    summary: '**Toda la clave.** Está en 1FN y todo atributo no clave depende de la clave **completa**, sin dependencias parciales.',
    body: [
      'Cada dependencia parcial pasa a ser una tabla propia, cuya clave es la parte de la clave de la que depende. La tabla original conserva la clave completa y los atributos que la necesitan entera.',
    ],
    tables: [
      {
        caption: 'Matrícula después de 2FN (negrita = clave)',
        head: ['Tabla', 'Columnas'],
        rows: [
          ['Estudiante', '**id estudiante**, nombre estudiante'],
          ['Asignatura', '**id asignatura**, nombre asignatura, créditos, id dpto, nombre dpto'],
          ['Matrícula', '**id estudiante**, **id asignatura**, nota'],
        ],
      },
    ],
    example: 'El nombre de Ana Ruiz se guarda ahora una sola vez, y una asignatura puede existir sin matrículas.',
    mistake: 'Olvidar conservar las partes de la clave en la tabla original. Matrícula debe conservar id estudiante e id asignatura: son las claves ajenas que vuelven a enlazar las piezas.',
  },
  {
    id: 'nf3',
    hub: 'forms',
    nf: '3NF',
    title: 'Tercera forma normal (3FN)',
    summary: '**Nada más que la clave.** Está en 2FN y ningún atributo no clave depende de otro atributo no clave: no hay dependencias transitivas.',
    body: [
      'La tabla Asignatura todavía tiene la cadena `id asignatura → id dpto → nombre dpto`. Departamento pasa a ser una tabla propia, y Asignatura conserva id dpto como clave ajena.',
      'Formalmente, una tabla está en 3FN si, para toda dependencia no trivial `X → A`, X es superclave **o** A es un atributo primo. Esa última vía de escape es la que elimina FNBC.',
    ],
    tables: [
      {
        caption: 'Después de 3FN (negrita = clave)',
        head: ['Tabla', 'Columnas'],
        rows: [
          ['Estudiante', '**id estudiante**, nombre estudiante'],
          ['Departamento', '**id dpto**, nombre dpto'],
          ['Asignatura', '**id asignatura**, nombre asignatura, créditos, id dpto → Departamento'],
          ['Matrícula', '**id estudiante**, **id asignatura**, nota'],
        ],
      },
    ],
    example: '"Todo atributo no clave depende de la clave, de toda la clave y nada más que de la clave."',
    mistake: 'Quitar también id dpto de Asignatura. Entonces nada indica a qué departamento pertenece cada asignatura: la descomposición pierde información.',
  },
  {
    id: 'bcnf',
    hub: 'forms',
    nf: 'BCNF',
    title: 'Forma normal de Boyce-Codd (FNBC)',
    summary: '**Todo determinante es clave.** Para toda dependencia no trivial `X → Y`, X debe ser superclave. No hay excepciones para los atributos primos.',
    body: [
      'Tutorías: cada estudiante cursa cada asignatura con un solo tutor, y cada tutor imparte una sola asignatura. Así que `estudiante, asignatura → tutor` y `tutor → asignatura`. La clave es (estudiante, asignatura), y la tabla está en 3FN porque asignatura es un atributo primo. Pero tutor es un determinante y no es clave, así que la asignatura del tutor se repite por cada uno de sus estudiantes.',
      'Divide por el determinante problemático: `TutorAsignatura(tutor, asignatura)` y `Tutoría(estudiante, tutor)`. La dependencia `estudiante, asignatura → tutor` ya no puede comprobarse dentro de una sola tabla. Ese es el precio que a veces exige FNBC.',
    ],
    tables: [
      {
        caption: 'En 3FN pero no en FNBC: tutor → asignatura (negrita = clave)',
        head: ['**estudiante**', '**asignatura**', 'tutor'],
        rows: [['Ana', 'Matemáticas', 'Pérez'], ['Luis', 'Matemáticas', 'Pérez'], ['Ana', 'Física', 'Gómez']],
      },
    ],
    mistake: 'Suponer que toda tabla en 3FN está en FNBC. Solo difieren cuando hay claves candidatas solapadas, pero en ese caso la diferencia es real.',
  },
  {
    id: 'nf4',
    hub: 'forms',
    nf: '4NF',
    title: 'Cuarta forma normal (4FN)',
    summary: '**Un hecho por tabla.** Está en FNBC y, para toda dependencia multivaluada no trivial `X ↠ Y`, X es superclave.',
    body: [
      'La tabla (asignatura, profesor, libro) guarda dos hechos independientes: quién imparte cada asignatura y qué libros usa cada asignatura. Guarda cada uno en su propia tabla.',
      'Al reunir las dos tablas por asignatura se recuperan exactamente las filas originales, así que no se pierde nada.',
    ],
    tables: [
      {
        caption: 'Después de 4FN (negrita = clave)',
        head: ['Tabla', 'Columnas'],
        rows: [['AsignaturaProfesor', '**asignatura**, **profesor**'], ['AsignaturaLibro', '**asignatura**, **libro**']],
      },
    ],
    example: 'Añadir un tercer libro a Bases de datos es ahora una sola fila en AsignaturaLibro, haya los profesores que haya.',
    mistake: 'Dividir una terna que no es independiente. Si cada profesor usa sus propios libros, (asignatura, profesor, libro) es un solo hecho y ya está en 4FN.',
  },
  {
    id: 'nf5',
    hub: 'forms',
    nf: '5NF',
    title: 'Quinta forma normal (5FN)',
    summary: '**Nada que se pueda reconstruir a partir de sus partes.** Está en 4FN y toda dependencia de reunión está implicada por las claves candidatas.',
    body: [
      'Con la regla cíclica de proveedores, piezas y proyectos, la tabla (proveedor, pieza, proyecto) es igual a la reunión de sus tres parejas. Guarda las tres parejas: (proveedor, pieza), (pieza, proyecto) y (proveedor, proyecto).',
      'Hacen falta las tres. Reunir dos cualesquiera de ellas produce combinaciones que nunca existieron, y la tercera es la que las filtra.',
    ],
    tables: [
      {
        caption: 'Después de 5FN (negrita = clave)',
        head: ['Tabla', 'Columnas'],
        rows: [['ProveedorPieza', '**proveedor**, **pieza**'], ['PiezaProyecto', '**pieza**, **proyecto**'], ['ProveedorProyecto', '**proveedor**, **proyecto**']],
      },
    ],
    mistake: 'Aplicar 5FN porque da la casualidad de que las filas actuales se descomponen. Sin una regla de negocio que lo garantice, la siguiente fila que se inserte rompe la reunión.',
  },

  /* ───────────── Descomposición ───────────── */
  {
    id: 'lossless',
    hub: 'decomp',
    title: 'Descomposición sin pérdida',
    summary: 'Una descomposición es **sin pérdida** cuando al reunir las partes se obtiene **exactamente** la tabla original: no falta ninguna fila y no aparecen filas espurias.',
    body: [
      'Prueba para dos partes R1 y R2: la descomposición es sin pérdida si sus **atributos comunes** son clave de R1 o de R2. Por eso cada paso de normalización deja el determinante en las dos tablas.',
      'Dividir Matrícula en (id estudiante, nombre estudiante) y (id estudiante, id asignatura, nota) es sin pérdida: id estudiante es común y es la clave de la primera parte. Dividirla en (id estudiante, nota) e (id asignatura, nota) no lo es. El único atributo común es nota, y la reunión emparejaría a cada estudiante con cada asignatura que tenga la misma nota.',
    ],
    points: [
      'Sin pérdida ⇔ (R1 ∩ R2) → R1 o (R1 ∩ R2) → R2.',
      'Las filas espurias significan que se pierde información: ya no se puede saber qué filas eran reales.',
    ],
    mistake: 'Comprobar solo que cada atributo aparece en alguna parte. Tener todas las columnas no basta: las partes tienen que volver a reunirse correctamente.',
  },
  {
    id: 'preservation',
    hub: 'decomp',
    title: 'Conservación de dependencias',
    summary: 'Una descomposición **conserva las dependencias** cuando cada dependencia puede seguir comprobándose dentro de una sola tabla, sin reuniones.',
    body: [
      'Los pasos a 2FN y 3FN del ejemplo de matrículas mantienen cada dependencia dentro de alguna tabla, así que el SGBD puede garantizar cada una con una clave o una restricción de unicidad.',
      'La división en FNBC de Tutorías pierde `estudiante, asignatura → tutor`: estudiante y asignatura acaban en tablas distintas. Comprobarla exigiría una reunión o un disparador.',
      '**3FN** siempre puede alcanzarse con una descomposición sin pérdida **y** que conserve las dependencias. **FNBC** siempre es sin pérdida, pero no siempre conserva las dependencias. Cuando no las conserva, muchos diseños se quedan en 3FN.',
    ],
    tables: [{
      caption: 'Qué garantiza cada objetivo',
      head: ['Objetivo', 'Sin pérdida', 'Conserva las dependencias', 'Redundancia por dependencias funcionales'],
      rows: [['3FN', 'Siempre', 'Siempre posible', 'Puede quedar alguna'], ['FNBC', 'Siempre', 'No siempre', 'Ninguna']],
    }],
    mistake: 'Creer que cuanto más alta, mejor. Cada forma cambia comprobaciones fáciles de garantizar por menos redundancia. Elige teniendo en cuenta las reglas de negocio.',
  },
];
