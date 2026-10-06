'use strict';
/* ER / EER concept quiz, Spanish translation of data/en/er-quiz.js (source: Quiz 2, Block II).
   No Spanish original of Quiz 2 exists (quizzes/*.md and scripts/build_quizzes_qti.js are
   English only), so the questions are translated here, using the wording of the original
   Spanish course notes content/translations/tema2-mcd/extracted.md and the tema2-mcd /
   tema3-mld glossaries. Items marked `extra: true` are grounded in extracted.md. */

DATA.es.ER_QUIZ_TOPICS = {
  basics: 'Fundamentos del modelado',
  attributes: 'Atributos y claves',
  relationships: 'Relaciones',
  cardinality: 'Cardinalidad',
  weak: 'Entidades débiles',
  eer: 'Jerarquías y M E/R extendido',
  steps: 'Construcción del modelo',
};

DATA.es.ER_QUIZ = [
  // Q1
  { type: 'mc', topic: 'basics',
    q: 'En el modelado conceptual, ¿cuáles de estas son las **propiedades estáticas** de una aplicación?',
    choices: [
      'Las entidades, sus atributos y las relaciones entre ellas',
      'Las operaciones que se realizan sobre entidades y atributos',
      'Las reglas de integridad sobre las entidades y las operaciones',
      'Los índices y las organizaciones de ficheros usados en tiempo de ejecución',
    ],
    answer: 0,
    why: 'Las propiedades estáticas son las entidades, los atributos y las relaciones; las propiedades dinámicas son las operaciones; las reglas de integridad son la tercera categoría.' },

  // Q2
  { type: 'mc', topic: 'basics',
    q: 'Durante las primeras etapas del ciclo de vida, un ingeniero de datos debe centrarse en:',
    choices: [
      'Seleccionar el SGBD y el hardware',
      'Definir y especificar la semántica del problema: el **¿Qué?**, no el **¿Cómo?**',
      'Elegir la organización de almacenamiento de cada tabla',
      'Escribir el DDL del esquema',
    ],
    answer: 1,
    why: 'Es la fase de Análisis / Planificación del Sistema de Información: se modela el problema como tal, sin introducir visiones o sesgos asociados a una determinada solución (el ¿Cómo?).' },

  // Q3
  { type: 'mc', topic: 'basics',
    q: '¿Cuál de estas **NO** es una alternativa o evolución documentada del modelo E/R?',
    choices: [
      'El modelo E/R extendido (M E/R ext.)',
      'El diagrama de clases de UML',
      'El diagrama de Bachman (diagrama de estructura de datos)',
      'El cálculo relacional',
    ],
    answer: 3,
    why: 'El modelo E/R de Chen, su extensión M E/R ext., los diagramas de clases de UML y los diagramas de Bachman y de Martin son notaciones de modelado; el cálculo relacional es una formalización de consultas relacionales, no una alternativa al E/R.' },

  // Q4
  { type: 'mc', topic: 'attributes',
    q: 'Una entidad tiene los atributos `DNI`, `Email`, `Nombre`, `FechaNacimiento`; tanto `DNI` como `Email` identifican de forma única a un empleado. ¿Cómo se denominan `DNI` y `Email`?',
    choices: [
      'Atributos descriptores',
      'Claves candidatas (alternativas)',
      'Subesquemas',
      'Atributos débiles',
    ],
    answer: 1,
    why: 'Todas las claves que podrían identificar la entidad son claves candidatas o alternativas; la elegida pasa a ser la clave primaria.' },

  // Q5
  { type: 'mc', topic: 'attributes',
    q: '¿Qué atributo solo **caracteriza** una ocurrencia sin distinguirla de las demás?',
    choices: [
      'Una clave primaria',
      'Un atributo descriptor',
      'Una clave múltiple',
      'Un dominio',
    ],
    answer: 1,
    why: 'Un descriptor (p. ej., la categoría profesional) describe una ocurrencia pero no la identifica; una clave la identifica de forma única.' },

  // Q6 (figure: fig-attributes)
  { type: 'mc', topic: 'attributes',
    q: 'En la figura, `Teléfono` se dibuja con una **elipse doble**. ¿Qué significa esta notación?',
    diagram: {
      w: 480, h: 280,
      nodes: [
        { id: 'P', cx: 0.15, cy: 0.5, type: 'entity', label: 'PERSONA' },
        { id: 'id', cx: 0.72, cy: 0.13, type: 'attribute', label: 'DNI', kind: 'key' },
        { id: 'name', cx: 0.72, cy: 0.38, type: 'attribute', label: 'Nombre' },
        { id: 'phone', cx: 0.72, cy: 0.63, type: 'attribute', label: 'Teléfono', kind: 'multivalued' },
        { id: 'age', cx: 0.72, cy: 0.88, type: 'attribute', label: 'Edad', kind: 'derived' },
      ],
      edges: [
        { from: 'P', to: 'id' },
        { from: 'P', to: 'name' },
        { from: 'P', to: 'phone' },
        { from: 'P', to: 'age', dashed: true },
      ],
    },
    choices: [
      'Es un atributo simple y univaluado',
      'Es un atributo multivaluado: puede tomar más de un valor por ocurrencia',
      'Es un atributo derivado',
      'Es la clave primaria',
    ],
    answer: 1,
    why: 'Una elipse doble indica un atributo multivaluado; en la misma figura `DNI` es la clave (subrayada) y `Edad` es derivado (discontinuo).' },

  // Q7
  { type: 'mc', topic: 'attributes',
    q: 'Un atributo `Dirección` engloba calle, número, ciudad, provincia y código postal. Se trata de un:',
    choices: [
      'Atributo univaluado',
      'Atributo compuesto',
      'Atributo derivado',
      'Atributo obligatorio',
    ],
    answer: 1,
    why: 'Un atributo compuesto puede subdividirse en atributos más elementales (los hijos cuelgan de la elipse del padre).' },

  // Q8
  { type: 'mc', topic: 'attributes',
    q: '`Edad` puede calcularse a partir de `Fecha_Nacimiento`. ¿Qué exige el curso que hagas con `Edad` en el esquema?',
    choices: [
      'Mantenerlo como atributo almacenado y obligatorio',
      'Convertirlo en la clave primaria',
      'Eliminarlo del esquema; mantenerlo solo por razones de eficiencia',
      'Convertirlo en un atributo multivaluado',
    ],
    answer: 2,
    why: 'Los atributos derivados son redundantes y deben eliminarse del esquema; solo pueden conservarse por razones de eficiencia (se dibujan con línea discontinua).' },

  // Q9 (figure: fig-cardinality-1n)
  { type: 'mc', topic: 'cardinality',
    q: 'Con el convenio de **lectura cruzada**, ¿cuál es el tipo de correspondencia de esta relación?',
    diagram: {
      w: 560, h: 140,
      nodes: [
        { id: 'D', cx: 0.14, cy: 0.5, type: 'entity', label: 'DEPARTAMENTO' },
        { id: 'R', cx: 0.5, cy: 0.5, type: 'relationship', label: 'ofrece' },
        { id: 'C', cx: 0.87, cy: 0.5, type: 'entity', label: 'CURSO' },
      ],
      edges: [
        { from: 'D', to: 'R', card: '(1,1)' },
        { from: 'C', to: 'R', card: '(0,N)', total: true },
      ],
    },
    choices: [
      '1:1',
      '1:N',
      'M:N',
      'No puede determinarse a partir de las tuplas',
    ],
    answer: 1,
    why: '`DEPARTAMENTO` tiene `máx = 1` (el lado “uno”) y `CURSO` tiene `máx = N` (el lado “muchos”) ⇒ 1:N.' },

  // Q10
  { type: 'mc', topic: 'relationships',
    q: '“Un empleado dirige a otros empleados.” ¿Cuál es el **grado** de la relación `Dirige`?',
    choices: [
      'Unaria (reflexiva)',
      'Binaria',
      'Ternaria',
      'Cuaternaria',
    ],
    answer: 0,
    why: 'El grado es el número de tipos de entidad que se relacionan; una entidad relacionada consigo misma da una relación unaria.' },

  // Q11 (figure: fig-ternary)
  { type: 'mc', topic: 'relationships',
    q: '¿Cuántos tipos de entidad participan en la relación `suministra` de la figura y cuál es su **grado**?',
    diagram: {
      w: 560, h: 280,
      nodes: [
        { id: 'S', cx: 0.14, cy: 0.14, type: 'entity', label: 'PROVEEDOR' },
        { id: 'P', cx: 0.14, cy: 0.86, type: 'entity', label: 'PIEZA' },
        { id: 'J', cx: 0.86, cy: 0.5, type: 'entity', label: 'PROYECTO' },
        { id: 'R', cx: 0.5, cy: 0.5, type: 'relationship', label: 'suministra' },
      ],
      edges: [
        { from: 'S', to: 'R', card: '(0,N)' },
        { from: 'P', to: 'R', card: '(0,N)' },
        { from: 'J', to: 'R', card: '(1,N)' },
      ],
    },
    choices: [
      'Dos tipos de entidad: binaria',
      'Tres tipos de entidad: ternaria',
      'Un tipo de entidad: unaria',
      'Cuatro tipos de entidad: cuaternaria',
    ],
    answer: 1,
    why: 'El grado cuenta los tipos de entidad que conecta la relación; tres tipos de entidad ⇒ ternaria (en cada extremo se muestran las tuplas con lectura cruzada).' },

  // Cardinalidad ternaria (tarjeta: ternary)
  { type: 'mc', topic: 'relationships', extra: true,
    q: 'ESTUDIANTE, ASIGNATURA y PROFESOR participan en la ternaria `cursa`. ¿Qué cuenta el (mín,máx) escrito junto a **ESTUDIANTE**?',
    choices: [
      'Cuántos estudiantes van con una asignatura **y** un profesor a la vez',
      'Cuántas asignaturas cursa un estudiante',
      'Cuántos estudiantes tiene un profesor, sea cual sea la asignatura',
      'Cuántos profesores tiene un estudiante',
    ],
    answer: 0,
    why: 'Lectura cruzada con los otros extremos fijos: en una ternaria, la tupla de una entidad cuenta sus ocurrencias para una combinación de las otras dos.' },

  { type: 'mc', topic: 'relationships', extra: true,
    q: 'La ternaria ESTUDIANTE (1,N) — ASIGNATURA (1,N) — PROFESOR (1,1) es M:N:1. ¿Qué combinación identifica una ocurrencia de la relación?',
    choices: [
      'El par (estudiante, asignatura)',
      'El par (asignatura, profesor)',
      'Solo el estudiante',
      'Solo las tres juntas',
    ],
    answer: 0,
    why: 'El máximo 1 está en PROFESOR: un estudiante y una asignatura determinan el profesor, así que (estudiante, asignatura) es la clave. Las tres solo hacen falta cuando todos los extremos son N (M:N:P).' },

  { type: 'tf', topic: 'relationships', extra: true,
    q: 'Una relación ternaria siempre puede sustituirse por tres relaciones binarias entre sus entidades sin perder información.',
    answer: false,
    why: 'Al reunir de nuevo las tres relaciones de pares pueden aparecer combinaciones que nunca ocurrieron (filas espurias). Mantén la ternaria salvo que una regla explícita permita separarla.' },

  // Q12 (figure: fig-weak-entity)
  { type: 'mc', topic: 'weak',
    q: 'En la figura, `CLASE` es un **rectángulo doble** al que se llega mediante el **rombo de doble contorno** `tiene`. ¿Qué te indica esto?',
    diagram: {
      w: 560, h: 140,
      nodes: [
        { id: 'C', cx: 0.13, cy: 0.5, type: 'entity', label: 'CURSO' },
        { id: 'R', cx: 0.5, cy: 0.5, type: 'relationship', label: 'tiene', identifying: true },
        { id: 'W', cx: 0.87, cy: 0.5, type: 'entity', label: 'CLASE', weak: true },
      ],
      edges: [
        { from: 'C', to: 'R', card: '(1,1)' },
        { from: 'W', to: 'R', card: '(0,N)', total: true },
      ],
    },
    choices: [
      '`CLASE` es una entidad fuerte con su propia clave independiente',
      '`CLASE` es una entidad débil: no puede existir sin `CURSO` y se identifica a través de la relación `tiene`',
      '`tiene` es una relación normal sin ningún significado especial',
      '`CLASE` es un atributo multivaluado de `CURSO`',
    ],
    answer: 1,
    why: 'El rectángulo doble es una entidad débil y el rombo doble es su relación identificadora: juntos expresan dependencia de existencia y de identificación.' },

  // Q13
  { type: 'mc', topic: 'weak',
    q: 'El `MOVIMIENTO` de un banco no tiene clave propia; se identifica por el número de su `CUENTA` **más** una fecha de movimiento dentro de esa cuenta. ¿Cuál es la clave primaria resultante?',
    choices: [
      '`Fecha` sola',
      '`NumeroCuenta` solo',
      '`NumeroCuenta + Fecha`',
      'Solo un nuevo identificador artificial `IdMovimiento`',
    ],
    answer: 2,
    why: 'Es una dependencia de identificación: la CP de la entidad débil = CP de la propietaria (clave ajena identificadora) + su clave parcial.' },

  // Q14
  { type: 'mc', topic: 'cardinality',
    q: 'Con el convenio de **lectura cruzada**, en `Camionero (1,1) — Entrega — Paquete (0,N)`, ¿qué significa el `(1,1)` junto a `Camionero`?',
    choices: [
      'Cada camionero entrega cero o más paquetes',
      'Cada paquete lo entrega exactamente un camionero',
      'Cada camionero entrega exactamente un paquete',
      'Cada paquete lo entregan muchos camioneros',
    ],
    answer: 1,
    why: 'La tupla junto a `E` indica cuántas `E` pueden relacionarse con **una ocurrencia de la entidad opuesta**; `(1,1)` junto a Camionero ⇒ cada Paquete tiene exactamente un Camionero.' },

  // Q15
  { type: 'mc', topic: 'cardinality',
    q: 'En la relación `Camionero (1,1) — Entrega — Paquete (0,N)`, ¿por qué `Paquete` lleva una **línea doble** (participación total)?',
    choices: [
      'Porque su propia tupla es `(0,N)`',
      'Porque la tupla del extremo **opuesto** (`Camionero`) tiene `mín = 1`',
      'Porque `N` significa “muchos”',
      'Porque es una entidad débil',
    ],
    answer: 1,
    why: 'La participación se lee en el `mín` de la tupla opuesta: `mín = 1` junto a Camionero significa que todo Paquete debe ser entregado ⇒ línea doble en Paquete.' },

  // Q16
  { type: 'mc', topic: 'cardinality',
    q: 'Los dos extremos de una relación llevan la tupla `(0,N)`. ¿Cuál es el tipo de correspondencia?',
    choices: [
      '1:1',
      '1:N',
      'M:N',
      'Indefinido',
    ],
    answer: 2,
    why: 'Cada ocurrencia de cualquiera de las dos entidades puede relacionarse con muchas de la otra ⇒ muchos a muchos (la correspondencia depende solo de los valores `máx`).' },

  // Q17
  { type: 'mc', topic: 'eer',
    q: 'Abstraer hacia arriba los tipos comunes `PROFESOR` y `ESTUDIANTE` para obtener un supertipo `PERSONA` se denomina:',
    choices: [
      'Especialización',
      'Generalización',
      'Categorización',
      'Agregación',
    ],
    answer: 1,
    why: 'La generalización es la abstracción ascendente de un supertipo a partir de varios subtipos; la especialización es la operación inversa, descendente.' },

  // Q18
  { type: 'mc', topic: 'eer',
    q: 'Dados los tipos `PERSONA` y `EMPRESA`, necesitas un subtipo `PROPIETARIO` que sea la **unión** de ambos para poder relacionarlo con `VEHÍCULO`. Esta construcción es una:',
    choices: [
      'Jerarquía con `d`',
      'Categoría (unión)',
      'Entidad débil',
      'Reflexión',
    ],
    answer: 1,
    why: 'Una categoría es el subtipo que resulta de la unión de varios tipos de entidad: varios supertipos y un solo subtipo (marcado con `U`).' },

  // Q19 (figure: fig-hierarchy)
  { type: 'mc', topic: 'eer',
    q: 'En la figura, el triángulo de la jerarquía lleva la letra **`d`** y un atributo discriminante `tipo`. ¿Qué significa `d`?',
    diagram: {
      w: 420, h: 300,
      nodes: [
        { id: 'P', cx: 0.5, cy: 0.15, type: 'entity', label: 'PERSONA' },
        { id: 'h', cx: 0.5, cy: 0.48, type: 'isa', label: 'd' },
        { id: 't', cx: 0.82, cy: 0.48, type: 'attribute', label: 'tipo' },
        { id: 'S', cx: 0.25, cy: 0.85, type: 'entity', label: 'ESTUDIANTE' },
        { id: 'T', cx: 0.75, cy: 0.85, type: 'entity', label: 'PROFESOR' },
      ],
      edges: [
        { from: 'P', to: 'h' },
        { from: 'h', to: 'S' },
        { from: 'h', to: 'T' },
        { from: 'h', to: 't', dashed: true },
      ],
    },
    choices: [
      'Los subtipos se solapan: una ocurrencia puede ser de ambos',
      'Los subtipos son disjuntos: una ocurrencia es como máximo de uno de ellos',
      'La jerarquía es una categoría unión',
      'Los subtipos se derivan del supertipo',
    ],
    answer: 1,
    why: '`d` = disjunta (exclusiva), `o` = solapada, `U` = unión/categoría. El círculo `tipo` unido con una línea punteada es el atributo discriminante.' },

  // Q20
  { type: 'mc', topic: 'eer',
    q: '¿Por qué es necesaria la **agregación** en el modelo E/R extendido?',
    choices: [
      'Para permitir una relación entre tipos de relación, que de otro modo no está permitida',
      'Para convertir una relación M:N en dos relaciones 1:N',
      'Para eliminar los atributos derivados',
      'Para dar a una entidad débil su clave parcial',
    ],
    answer: 0,
    why: 'Como no se permite la relación entre tipos de relación, se agregan `EMPRESA` + `ENTREVISTA` + `SOLICITANTE` en una entidad que después puede relacionarse con `OFERTA DE EMPLEO`.' },

  // Q21
  { type: 'tf', topic: 'weak',
    q: 'La dependencia en existencia siempre implica dependencia en identificación.',
    answer: false,
    why: 'Sucede lo inverso: la dependencia en identificación siempre implica dependencia en existencia, pero una entidad puede depender en existencia y aun así tener su propia clave suficiente (existencia sin identificación).' },

  // Q22
  { type: 'tf', topic: 'weak',
    q: 'En una relación con cardinalidad M:N es extraordinario que haya entidades débiles.',
    answer: true,
    why: 'El curso afirma que en una interrelación M:N es extraordinario que haya entidades débiles: una entidad débil normalmente participa en el lado “muchos” de una relación identificadora 1:N.' },

  // Q23
  { type: 'tf', topic: 'attributes',
    q: 'Un atributo derivado debe almacenarse siempre para que las consultas sean más rápidas.',
    answer: false,
    why: 'Los atributos derivados son redundantes y deben eliminarse del esquema; mantener uno solo se permite como medida opcional de eficiencia, no es una obligación.' },

  // Q24
  { type: 'tf', topic: 'cardinality',
    q: 'Con el convenio de lectura cruzada, el `(mín,máx)` escrito junto a la entidad `E` indica cuántas ocurrencias de `E` pueden relacionarse con **una** ocurrencia de la otra entidad que participa en la relación.',
    answer: true,
    why: 'Esa es la definición de la cardinalidad con lectura cruzada: se lee a través del rombo hacia la entidad opuesta.' },

  // Q25
  { type: 'fib', topic: 'weak',
    q: 'Una entidad débil se representa con un rectángulo ____ (con un contorno interior).',
    accept: ['doble', 'dobles', 'de doble contorno', 'doble contorno', 'de doble linea', 'doble linea', 'double'],
    why: 'Una entidad débil es un rectángulo doble; su relación identificadora es un rombo de doble contorno.' },

  // Q26
  { type: 'fib', topic: 'eer',
    q: 'El atributo discriminante de una jerarquía se representa como un ____ unido al triángulo por una línea punteada.',
    accept: ['circulo', 'un circulo', 'circulos', 'circulo discriminante', 'circunferencia', 'circle'],
    why: 'El discriminante es un círculo etiquetado con el atributo discriminante, unido al triángulo de la jerarquía por una línea punteada.' },

  // Q27
  { type: 'fib', topic: 'eer',
    q: 'Dentro del triángulo de la jerarquía, la letra `o` significa que los subtipos están ____.',
    accept: ['solapados', 'solapado', 'solapadas', 'solapada', 'superpuestos', 'superpuestas', 'solapamiento', 'overlapping'],
    why: '`o` = solapada (una ocurrencia puede pertenecer a varios subtipos, del inglés *overlapping*); `d` = disjunta; `U` = unión/categoría.' },

  // Q28
  { type: 'fib', topic: 'weak',
    q: 'La prueba que se usa para decidir si una entidad tiene dependencia de existencia respecto de otra es la prueba del ____.',
    accept: ['borrado', 'borrar', 'de borrado', 'eliminacion', 'eliminado', 'deletion'],
    why: 'La pregunta de la prueba es: “¿Se debe borrar alguna ocurrencia de la entidad A si se borra una ocurrencia de la entidad B?”. Si la respuesta es afirmativa, existe la dependencia de existencia.' },

  // ---- Extra questions (grounded in extracted.md) ----
  { type: 'mc', topic: 'basics', extra: true,
    q: '¿Cuál de estas **NO** es una de las reglas que, según el curso, debe cumplir una entidad?',
    choices: [
      'Tiene que tener existencia propia',
      'Cada ocurrencia debe poder distinguirse de las demás',
      'Todas las ocurrencias deben tener los mismos tipos de características (atributos)',
      'Debe participar al menos en una relación',
    ],
    answer: 3,
    why: 'Las tres reglas son: existencia propia, ocurrencias distinguibles y los mismos tipos de atributos para todas las ocurrencias. Participar en una relación no es una regla para ser entidad.' },

  { type: 'mc', topic: 'relationships', extra: true,
    q: 'Un empleado es **o bien** empleado en plantilla que pertenece a un departamento, **o bien** está en prácticas y asignado a un grupo de prácticas, pero nunca ambas cosas a la vez. ¿Qué tipo de restricción entre las dos relaciones es esta?',
    choices: [
      'Una relación de exclusividad',
      'Una relación de inclusividad',
      'Una relación de inclusión',
      'Una agregación',
    ],
    answer: 0,
    why: 'En una relación de exclusividad, E1 está relacionada o bien con E2 o bien con E3 mediante R1 o R2, pero no pueden darse ambas relaciones simultáneamente.' },

  { type: 'tf', topic: 'relationships', extra: true,
    q: '“Para que se formalice un divorcio, previamente ha tenido que haber un casamiento” es un ejemplo de relación de **inclusión**.',
    answer: true,
    why: 'En una relación de inclusión, para que E1 participe en R2 debe haber participado previamente una vez en R1. (Si tuviera que participar un determinado número de veces, p. ej. asistir al menos a dos cursos antes de trabajar como diseñador, sería una relación de inclusividad).' },

  { type: 'mc', topic: 'steps', extra: true,
    q: 'Según el curso, ¿cuál es el **primer** paso para crear el modelo E/R extendido?',
    choices: [
      'Dibujar el modelo conceptual de datos',
      'Identificar las entidades dentro del sistema',
      'Establecer las relaciones entre las entidades, describiendo su grado',
      'Describir cada atributo en el diccionario de datos',
    ],
    answer: 1,
    why: 'Los pasos son: (1) identificar las entidades, (2) determinar sus claves, (3) establecer las relaciones y su grado, (4) dibujar el modelo, (5) identificar y describir los atributos de cada entidad en el diccionario de datos.' },

  { type: 'mc', topic: 'steps', extra: true,
    q: 'Añades un atributo `Fecha_Inicio` a una relación M:N para recoger la dimensión temporal. Según el curso, ¿qué debes verificar?',
    choices: [
      'Que la fecha se almacena como atributo derivado',
      'Que el resultado no incumple el principio de acceso único a las ocurrencias de esa relación una vez transformado al modelo lógico',
      'Que la relación pasa a ser ternaria',
      'Que las dos entidades pasan a ser entidades débiles',
    ],
    answer: 1,
    why: 'Añadir fechas a relaciones de muchos a muchos puede permitir que el mismo par se repita en el tiempo; debes comprobar que cada ocurrencia de la relación sigue siendo accesible de forma única tras la transformación al modelo lógico.' },
];
