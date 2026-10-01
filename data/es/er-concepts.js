'use strict';
/* ER concept cards, Spanish translation of data/en/er-concepts.js.
   Wording taken from the original Spanish course notes
   content/translations/tema2-mcd/extracted.md (Tema 2, MCD) and the
   tema2-mcd / tema3-mld glossaries. `topic` keys match ER_QUIZ_TOPICS. */

DATA.es.ER_CONCEPTS = [
  { id: 'entity', title: 'Entidad', topic: 'basics',
    summary: 'Un objeto real o abstracto de interés en una organización y acerca del cual se puede y se quiere obtener una determinada información.',
    body: [
      'Personas, cosas, lugares, conceptos o sucesos pueden ser entidades. Un conjunto de entidades con las mismas características forma un **tipo de entidad** (es habitual utilizar indistintamente los términos entidad y tipo de entidad), y cada realización concreta es una **ocurrencia de entidad**: para el tipo de entidad LIBRO, una ocurrencia será “El Quijote”.',
      'La entidad se representa mediante un rectángulo con su nombre en el interior. El modelo E/R se construye con solo tres elementos —**entidades**, **atributos** e **interrelaciones**—, que juntos forman las **propiedades estáticas** de una aplicación (las operaciones son las propiedades dinámicas, y las reglas de integridad, la tercera categoría).',
    ],
    points: [
      'Regla i: tiene que tener **existencia propia**.',
      'Regla ii: cada ocurrencia debe poder **distinguirse** de las demás.',
      'Regla iii: todas las ocurrencias deben tener los **mismos tipos de atributos**.',
      'Nombra los tipos de entidad con un sustantivo en singular (LIBRO, no LIBROS).',
    ],
    example: 'En una biblioteca, LIBRO es un tipo de entidad, “El Quijote” es una de sus ocurrencias y Título es uno de sus atributos.',
    mistake: 'Convertir una sola propiedad (un teléfono, un color) en entidad. Si no tiene existencia propia ni nada que describir más allá de su valor, es un atributo.',
    diagram: {
      w: 400, h: 160,
      nodes: [
        { id: 'B', cx: 0.2, cy: 0.5, type: 'entity', label: 'LIBRO' },
        { id: 'isbn', cx: 0.7, cy: 0.25, type: 'attribute', label: 'ISBN', kind: 'key' },
        { id: 'title', cx: 0.7, cy: 0.75, type: 'attribute', label: 'Título' },
      ],
      edges: [
        { from: 'B', to: 'isbn' },
        { from: 'B', to: 'title' },
      ],
    },
    caption: 'El tipo de entidad LIBRO (rectángulo) con el atributo clave ISBN (subrayado) y el atributo descriptor Título.' },

  { id: 'attributes', title: 'Atributos y sus tipos', topic: 'attributes',
    summary: 'Una propiedad o característica asociada a una entidad y común a todas sus ocurrencias: una unidad básica de información que sirve para identificarla o describirla.',
    body: [
      'Cada atributo toma sus valores de un **dominio**: un conjunto con nombre de valores homogéneos, p. ej. TECNOLOGÍAS_IMPRESORAS = {Inyección, Matricial, Láser, Sublimación}. Según su papel, un atributo es **identificador** (forma parte de una clave) o **descriptor**, que caracteriza una ocurrencia sin distinguirla de las demás.',
      'Las restricciones clasifican además los atributos. Cada tipo tiene su símbolo: una elipse simple para el simple, elipses hijas colgando del padre para el compuesto, una **elipse doble** para el multivaluado y una **elipse discontinua** con conector discontinuo para el derivado.',
    ],
    points: [
      '**Simple** (indivisible) frente a **compuesto** (Dirección = calle, número, ciudad, provincia, código postal).',
      '**Univaluado** (un valor por ocurrencia) frente a **multivaluado** (varios teléfonos).',
      '**Obligatorio**: tiene que tomar al menos un valor para todas y cada una de las ocurrencias.',
      '**Derivado**: se calcula a partir de otros atributos (Edad a partir de Fecha_Nacimiento); es redundante, así que se elimina y solo se mantiene por razones de eficiencia.',
    ],
    example: 'PERSONA(DNI, Nombre, Fecha_Nacimiento, Teléfono, Edad): DNI identifica, Nombre es compuesto (nombre de pila + apellidos), Teléfono es multivaluado y Edad es derivado.',
    mistake: 'Guardar un atributo derivado como si fuera obligatorio. El curso indica que los atributos derivados deben eliminarse del esquema y solo pueden mantenerse, de forma opcional, por razones de eficiencia.',
    diagram: {
      w: 600, h: 300,
      nodes: [
        { id: 'P', cx: 0.14, cy: 0.5, type: 'entity', label: 'PERSONA' },
        { id: 'id', cx: 0.5, cy: 0.1, type: 'attribute', label: 'DNI', kind: 'key' },
        { id: 'name', cx: 0.5, cy: 0.3, type: 'attribute', label: 'Nombre' },
        { id: 'fn', cx: 0.83, cy: 0.12, type: 'attribute', label: 'Nombre_pila' },
        { id: 'sn', cx: 0.83, cy: 0.38, type: 'attribute', label: 'Apellido' },
        { id: 'bd', cx: 0.5, cy: 0.5, type: 'attribute', label: 'Fecha_Nacimiento' },
        { id: 'ph', cx: 0.5, cy: 0.7, type: 'attribute', label: 'Teléfono', kind: 'multivalued' },
        { id: 'age', cx: 0.5, cy: 0.9, type: 'attribute', label: 'Edad', kind: 'derived' },
      ],
      edges: [
        { from: 'P', to: 'id' },
        { from: 'P', to: 'name' },
        { from: 'name', to: 'fn' },
        { from: 'name', to: 'sn' },
        { from: 'P', to: 'bd' },
        { from: 'P', to: 'ph' },
        { from: 'P', to: 'age', dashed: true },
      ],
    },
    caption: 'Clave DNI (subrayada), Nombre compuesto con sus componentes, Fecha_Nacimiento simple, Teléfono multivaluado (elipse doble) y Edad derivado (discontinuo).' },

  { id: 'keys', title: 'Claves: candidata, primaria, compuesta', topic: 'attributes',
    summary: 'Una clave primaria es un atributo, o un conjunto mínimo de atributos, que permite el acceso único a cada ocurrencia de una entidad.',
    body: [
      'Al principio puedes encontrar varios atributos (o conjuntos) capaces de identificar una ocurrencia: todos ellos son las **claves candidatas** o **alternativas**. De entre ellas eliges una como **clave primaria**, que se representa subrayada (o con un círculo relleno).',
      'Una clave debe ser **mínima**: la eliminación de cualquiera de sus atributos le haría perder su carácter identificador. Una clave de un único atributo es una **clave simple**; la formada por varios atributos es una clave **múltiple** o concatenada.',
    ],
    points: [
      'Claves candidatas: todos los conjuntos de atributos que pueden identificar una ocurrencia.',
      'Clave primaria: la candidata que eliges.',
      'Clave múltiple: varios atributos que identifican juntos, y solo juntos.',
      'Descriptor: caracteriza, pero no identifica.',
    ],
    example: 'EMPLEADO(DNI, Email, Nombre, FechaNacimiento): DNI y Email son claves candidatas; al elegir DNI, este pasa a ser la clave primaria y Email queda como clave alternativa.',
    mistake: 'Añadir atributos a una clave “por si acaso”. DNI + Nombre no es clave, porque no es mínima: DNI por sí solo ya identifica al empleado.',
    diagram: {
      w: 460, h: 240,
      nodes: [
        { id: 'E', cx: 0.18, cy: 0.5, type: 'entity', label: 'EMPLEADO' },
        { id: 'ssn', cx: 0.72, cy: 0.13, type: 'attribute', label: 'DNI', kind: 'key' },
        { id: 'email', cx: 0.72, cy: 0.38, type: 'attribute', label: 'Email' },
        { id: 'name', cx: 0.72, cy: 0.63, type: 'attribute', label: 'Nombre' },
        { id: 'bd', cx: 0.72, cy: 0.88, type: 'attribute', label: 'FechaNacimiento' },
      ],
      edges: [
        { from: 'E', to: 'ssn' },
        { from: 'E', to: 'email' },
        { from: 'E', to: 'name' },
        { from: 'E', to: 'bd' },
      ],
    },
    caption: 'Se ha elegido DNI como clave primaria (subrayada); Email es una clave alternativa; Nombre y FechaNacimiento son descriptores.' },

  { id: 'relationships', title: 'Relaciones y grado', topic: 'relationships',
    summary: 'Una asociación entre entidades, caracterizada por unas restricciones que determinan qué entidades participan en ella.',
    body: [
      'Una relación se representa con un rombo y un nombre verbal (EMPLEADO **trabaja en** DEPARTAMENTO, MOVIMIENTO **pertenece a** CUENTA). Una **ocurrencia de relación** es una asociación concreta: “Pepe Pérez” trabaja en el “Departamento de Contabilidad”. Una relación puede tener atributos descriptores propios, que cuelgan del rombo.',
      'Toda relación queda caracterizada por tres propiedades: un **nombre** único, un **grado** (número de tipos de entidad que relaciona) y un **tipo de correspondencia** (1:1, 1:N o M:N).',
    ],
    points: [
      '**Unaria** (reflexiva): una entidad se relaciona consigo misma; un empleado dirige a otros empleados.',
      '**Binaria**: entidades relacionadas dos a dos; EMPLEADO trabaja en DEPARTAMENTO.',
      '**Ternaria**: tres tipos de entidad; PROVEEDOR suministra PIEZA a PROYECTO.',
      'Los atributos de la relación (una fecha `desde`) pertenecen al rombo, no a ninguna de las entidades.',
    ],
    mistake: 'Contar ocurrencias en lugar de tipos de entidad al dar el grado. “Dirige” enlaza muchos empleados, pero un único tipo de entidad, así que es unaria.',
    diagram: {
      w: 560, h: 200,
      nodes: [
        { id: 'E', cx: 0.13, cy: 0.66, type: 'entity', label: 'EMPLEADO' },
        { id: 'R', cx: 0.5, cy: 0.66, type: 'relationship', label: 'trabaja en' },
        { id: 'D', cx: 0.86, cy: 0.66, type: 'entity', label: 'DEPARTAMENTO' },
        { id: 's', cx: 0.5, cy: 0.17, type: 'attribute', label: 'desde' },
      ],
      edges: [
        { from: 'E', to: 'R', card: '(0,N)', total: true },
        { from: 'D', to: 'R', card: '(1,1)' },
        { from: 'R', to: 's' },
      ],
    },
    caption: 'Una relación binaria “trabaja en” con su propio atributo “desde”. Cada empleado trabaja exactamente en un departamento; un departamento tiene cero o más empleados.' },

  { id: 'correspondence', title: 'Tipo de correspondencia: 1:1, 1:N, M:N', topic: 'cardinality',
    summary: 'El número máximo de ocurrencias de una entidad asociadas a una ocurrencia de otra entidad a través de una relación.',
    body: [
      'Para una relación entre A y B existen tres posibilidades. **1:1**: una ocurrencia de A se asocia como máximo con una de B, y viceversa. **1:N**: una ocurrencia de A se asocia con un número indeterminado de B, pero una de B se asocia como máximo con una de A. **M:N**: un número indeterminado en ambos sentidos.',
      'En el curso la correspondencia no se dibuja en un diagrama binario: se **deduce** de las dos tuplas (con lectura cruzada) y se indica en el texto. Depende solo de los valores **máximos**: el lado cuya tupla tiene máx = 1 es el lado “uno”; máx = N es el lado “muchos”.',
    ],
    points: [
      '(1,1) con (0,N) ⇒ 1:N.',
      '(0,N) con (0,N) ⇒ M:N.',
      '(0,1) o (1,1) en ambos extremos ⇒ 1:1.',
      'Los mínimos no cambian la correspondencia; indican la participación.',
    ],
    example: 'ESTUDIANTE (0,N) — se matricula en — CURSO (0,N): los dos máximos son N, así que la correspondencia es M:N.',
    mistake: 'Escribir “1:N” o “M:N” junto al rombo de una relación binaria. Los diagramas del curso solo llevan las tuplas (mín,máx); la correspondencia se deduce de ellas.',
    diagram: {
      w: 560, h: 140,
      nodes: [
        { id: 'S', cx: 0.13, cy: 0.5, type: 'entity', label: 'ESTUDIANTE' },
        { id: 'R', cx: 0.5, cy: 0.5, type: 'relationship', label: 'se matricula en' },
        { id: 'C', cx: 0.87, cy: 0.5, type: 'entity', label: 'CURSO' },
      ],
      edges: [
        { from: 'S', to: 'R', card: '(0,N)' },
        { from: 'C', to: 'R', card: '(0,N)' },
      ],
    },
    caption: 'Las dos tuplas tienen máx = N, así que la relación es de muchos a muchos (M:N). Los dos mínimos son 0, así que ambas participaciones son parciales.' },

  { id: 'cardinality', title: 'Cardinalidad (lectura cruzada) y participación', topic: 'cardinality',
    summary: 'El (mín,máx) junto a la entidad E indica cuántas ocurrencias de E pueden relacionarse con UNA ocurrencia de la otra entidad.',
    body: [
      'La cardinalidad de un tipo de entidad es el número mínimo y máximo de ocurrencias de ese tipo que pueden estar relacionadas con una ocurrencia del otro, u otros, tipos de entidad. Se escribe (0,1), (1,1), (0,N) o (1,N) en el extremo de cada conector y se lee **a través** del rombo: “dada una ocurrencia de la otra entidad, ¿cuántas de E?”.',
      'La **participación** (clase de pertenencia) indica si toda ocurrencia debe participar. Como cada tupla cuenta la entidad de su propio extremo para una ocurrencia de la opuesta, la participación se lee en la tupla **opuesta**: mín = 1 allí significa que E participa de forma **total** (obligatoria, línea doble en E); mín = 0, de forma **parcial** (opcional, línea simple).',
    ],
    points: [
      'máx = 1 en E ⇒ E es el lado “uno”; máx = N ⇒ el lado “muchos”.',
      'mín = 1 en E ⇒ toda ocurrencia opuesta se relaciona con al menos una E.',
      'El mín = 1 y la línea doble están en **extremos opuestos**.',
      'Correspondencia a partir de los dos máximos: (1,1)/(0,N) ⇒ 1:N.',
    ],
    example: 'Camionero (1,1) — Entrega — Paquete (0,N): cada Paquete lo entrega exactamente un Camionero; cada Camionero entrega cero o más Paquetes. Paquete participa de forma total (línea doble) y Camionero, de forma parcial.',
    mistake: 'Leer la tupla con lectura directa (desde el propio lado): interpretar el (1,1) junto a Camionero como “cada camionero entrega exactamente un paquete”. Significa lo contrario: cada paquete tiene exactamente un camionero.',
    diagram: {
      w: 560, h: 140,
      nodes: [
        { id: 'T', cx: 0.13, cy: 0.5, type: 'entity', label: 'Camionero' },
        { id: 'R', cx: 0.5, cy: 0.5, type: 'relationship', label: 'Entrega' },
        { id: 'P', cx: 0.87, cy: 0.5, type: 'entity', label: 'Paquete' },
      ],
      edges: [
        { from: 'T', to: 'R', card: '(1,1)' },
        { from: 'P', to: 'R', card: '(0,N)', total: true },
      ],
    },
    caption: 'El (1,1) junto a Camionero hace que Paquete sea total (línea doble); el (0,N) junto a Paquete deja a Camionero parcial. Máximos 1 y N ⇒ 1:N.' },

  { id: 'weak-entity', title: 'Entidades débiles', topic: 'weak',
    summary: 'Una entidad que depende de otra (su propietaria) para existir; se representa con un rectángulo doble.',
    body: [
      'La entidad B tiene **dependencia de existencia** de A cuando, sin A, B carecería de sentido. La prueba del curso es la pregunta del **borrado**: “¿Se debe borrar alguna ocurrencia de la entidad A si se borra una ocurrencia de la entidad B?”. Si la respuesta es afirmativa, existe la dependencia. Una entidad sin ella es **fuerte** (regular).',
      'Con **dependencia de identificación**, la entidad además no tiene suficientes atributos para formar su clave: se identifica por su relación con la propietaria, que aporta la parte de clave que le falta. Su CP = CP de la propietaria + su **clave parcial** (subrayado discontinuo). El vínculo con la propietaria es la **relación identificadora**, que se dibuja como un rombo de doble contorno.',
    ],
    points: [
      'Dependencia por existencia: depende de la propietaria, pero tiene su propia clave suficiente.',
      'La dependencia en identificación siempre implica dependencia en existencia, pero no al revés.',
      'El contrato del curso solo dibuja un rectángulo doble cuando se dan **ambas** dependencias.',
      'Es extraordinario que haya entidades débiles en relaciones M:N; se sitúan en el lado “muchos” de una 1:N.',
    ],
    example: 'Un MOVIMIENTO bancario no tiene clave propia; se identifica por el número de su CUENTA más su fecha, así que CP = NumeroCuenta + Fecha.',
    mistake: 'Marcar una entidad como débil solo porque “pertenece a” otra. Si tiene su propia clave natural (una factura con un número de factura único), es fuerte.',
    diagram: {
      w: 600, h: 200,
      nodes: [
        { id: 'A', cx: 0.13, cy: 0.66, type: 'entity', label: 'CUENTA' },
        { id: 'R', cx: 0.5, cy: 0.66, type: 'relationship', label: 'pertenece a', identifying: true },
        { id: 'M', cx: 0.87, cy: 0.66, type: 'entity', label: 'MOVIMIENTO', weak: true },
        { id: 'an', cx: 0.13, cy: 0.17, type: 'attribute', label: 'NumeroCuenta', kind: 'key' },
        { id: 'amt', cx: 0.66, cy: 0.17, type: 'attribute', label: 'Importe' },
        { id: 'dt', cx: 0.87, cy: 0.17, type: 'attribute', label: 'Fecha', kind: 'partial' },
      ],
      edges: [
        { from: 'A', to: 'R', card: '(1,1)' },
        { from: 'M', to: 'R', card: '(0,N)', total: true },
        { from: 'A', to: 'an' },
        { from: 'M', to: 'amt' },
        { from: 'M', to: 'dt' },
      ],
    },
    caption: 'MOVIMIENTO (rectángulo doble) se identifica a través de la relación identificadora “pertenece a” (rombo doble): CP = NumeroCuenta + Fecha (clave parcial).' },

  { id: 'relationship-constraints', title: 'Relaciones de exclusividad, inclusividad e inclusión', topic: 'relationships',
    summary: 'Restricciones entre dos tipos de relación R1 y R2 respecto a una misma entidad E1.',
    body: [
      'A veces la participación de una entidad en una relación depende de su participación en otra. El curso distingue tres casos, todos ellos entre dos tipos de relación R1 y R2 respecto a una entidad E1.',
    ],
    points: [
      '**Exclusividad**: E1 está relacionada o bien con E2 (mediante R1) o bien con E3 (mediante R2), pero no pueden darse ambas relaciones simultáneamente.',
      '**Inclusividad**: para participar en R2, E1 debe haber participado previamente en R1 un **determinado número de veces** (al menos dos cursos antes de trabajar como diseñador de productos).',
      '**Inclusión**: para participar en R2, E1 debe haber participado previamente **una vez** en R1 (un casamiento antes de un divorcio).',
    ],
    example: 'Un empleado es o bien empleado en plantilla, que pertenece a un departamento, o bien está realizando prácticas, asignado a un grupo de prácticas y sin pertenecer a ningún departamento: una relación de exclusividad.',
    mistake: 'Confundir inclusividad con inclusión: la diferencia está en si la participación previa se exige un determinado número de veces (inclusividad) o una sola vez (inclusión).',
    diagram: {
      w: 600, h: 240,
      nodes: [
        { id: 'E', cx: 0.13, cy: 0.5, type: 'entity', label: 'EMPLEADO' },
        { id: 'R1', cx: 0.49, cy: 0.2, type: 'relationship', label: 'pertenece a' },
        { id: 'R2', cx: 0.49, cy: 0.8, type: 'relationship', label: 'asignado a' },
        { id: 'D', cx: 0.86, cy: 0.2, type: 'entity', label: 'DEPARTAMENTO' },
        { id: 'G', cx: 0.86, cy: 0.8, type: 'entity', label: 'GRUPO PRÁCTICAS' },
      ],
      edges: [
        { from: 'E', to: 'R1', card: '(1,N)' },
        { from: 'D', to: 'R1', card: '(0,1)', total: true },
        { from: 'E', to: 'R2', card: '(1,N)' },
        { from: 'G', to: 'R2', card: '(0,1)', total: true },
      ],
    },
    caption: 'EMPLEADO participa o bien en “pertenece a” o bien en “asignado a”, pero no en ambas (exclusividad). La exclusividad es una restricción entre las dos relaciones y se anota junto al diagrama.' },

  { id: 'hierarchy', title: 'Generalización y especialización', topic: 'eer',
    summary: 'Una jerarquía conecta un supertipo con sus subtipos mediante un triángulo invertido; los subtipos heredan los atributos y relaciones del supertipo.',
    body: [
      'La **generalización** es ascendente: abstrae un supertipo a partir de varios tipos de entidad y le asigna sus atributos y relaciones comunes (PROFESOR + ESTUDIANTE ⇒ PERSONA). La **especialización** es la operación inversa, descendente: un supertipo se descompone en subtipos que heredan todo y añaden lo suyo propio (EMPLEADO ⇒ SECRETARIA, TÉCNICO, INGENIERO).',
      'La letra del triángulo indica la restricción: **d** = disjunta (una ocurrencia pertenece como máximo a un subtipo), **o** = solapada (puede pertenecer a varios). Si la división en subtipos viene determinada por los valores de un **atributo discriminante**, este se representa como un círculo unido al triángulo por una línea punteada. El texto de estudio de Elmasri y Navathe pregunta además si la especialización es **total** (toda ocurrencia está en algún subtipo) o **parcial**.',
    ],
    points: [
      'Supertipo arriba, base del triángulo paralela a él, subtipos debajo.',
      '`d` disjunta · `o` solapada · `U` unión (categoría).',
      'Discriminante: un círculo con una línea punteada hasta el triángulo.',
      'Total frente a parcial: ¿toda ocurrencia del supertipo debe pertenecer a un subtipo?',
    ],
    example: 'EMPLEADO especializado en SECRETARIA, TÉCNICO e INGENIERO, de forma disjunta, con Tipo_puesto como discriminante.',
    mistake: 'Crear subtipos que no aportan nada. Un subtipo se justifica por sus propios atributos o relaciones; si no, basta con un atributo descriptor.',
    diagram: {
      w: 560, h: 300,
      nodes: [
        { id: 'E', cx: 0.5, cy: 0.15, type: 'entity', label: 'EMPLEADO' },
        { id: 'h', cx: 0.5, cy: 0.48, type: 'isa', label: 'd' },
        { id: 'jt', cx: 0.8, cy: 0.48, type: 'attribute', label: 'Tipo_puesto' },
        { id: 'S', cx: 0.17, cy: 0.85, type: 'entity', label: 'SECRETARIA' },
        { id: 'T', cx: 0.5, cy: 0.85, type: 'entity', label: 'TÉCNICO' },
        { id: 'N', cx: 0.83, cy: 0.85, type: 'entity', label: 'INGENIERO' },
      ],
      edges: [
        { from: 'E', to: 'h' },
        { from: 'h', to: 'S' },
        { from: 'h', to: 'T' },
        { from: 'h', to: 'N' },
        { from: 'h', to: 'jt', dashed: true },
      ],
    },
    caption: 'Una especialización disjunta (d) de EMPLEADO; el atributo discriminante Tipo_puesto se une al triángulo con una línea punteada.' },

  { id: 'category', title: 'Categorías (tipos unión)', topic: 'eer',
    summary: 'Una categoría es el subtipo que resulta de la unión de varios tipos de entidad: varios supertipos y un solo subtipo.',
    body: [
      'Una categoría tiene la forma inversa de una jerarquía normal. En lugar de un supertipo que se divide en varios subtipos, varios supertipos se reúnen en un único subtipo, marcado con **U** en el triángulo.',
      'Se usa cuando una relación debe alcanzar a “cualquiera de” varios tipos de entidad distintos. Cada ocurrencia de la categoría procede exactamente de uno de los supertipos.',
    ],
    example: 'Si se tienen los tipos PERSONA y EMPRESA y es necesario establecer una relación con VEHÍCULO, se crea PROPIETARIO como subtipo unión de los dos: un vehículo pertenece a un PROPIETARIO, que es o una persona o una empresa.',
    mistake: 'Dibujar PROPIETARIO como supertipo de PERSONA y EMPRESA. Eso significaría que toda persona y toda empresa son propietarios; la categoría dice que todo propietario es una persona o una empresa.',
    diagram: {
      w: 600, h: 300,
      nodes: [
        { id: 'P', cx: 0.2, cy: 0.15, type: 'entity', label: 'PERSONA' },
        { id: 'C', cx: 0.55, cy: 0.15, type: 'entity', label: 'EMPRESA' },
        { id: 'u', cx: 0.375, cy: 0.48, type: 'isa', label: 'U' },
        { id: 'O', cx: 0.375, cy: 0.85, type: 'entity', label: 'PROPIETARIO' },
        { id: 'R', cx: 0.68, cy: 0.85, type: 'relationship', label: 'posee' },
        { id: 'V', cx: 0.9, cy: 0.85, type: 'entity', label: 'VEHÍCULO' },
      ],
      edges: [
        { from: 'P', to: 'u' },
        { from: 'C', to: 'u' },
        { from: 'u', to: 'O' },
        { from: 'O', to: 'R', card: '(1,1)' },
        { from: 'V', to: 'R', card: '(0,N)', total: true },
      ],
    },
    caption: 'PROPIETARIO es la unión (U) de PERSONA y EMPRESA, de modo que una única relación “posee” puede enlazarlo con VEHÍCULO.' },

  { id: 'aggregation', title: 'Agregación', topic: 'eer',
    summary: 'Construye un nuevo tipo de entidad como composición de otros tipos de entidad y su tipo de relación, para poder manejarlo en un nivel de abstracción mayor.',
    body: [
      'El modelo E/R no permite **relaciones entre tipos de relación**. Cuando una relación necesita participar a su vez en otra relación, la agregas: las entidades participantes y su relación se tratan como una sola entidad de nivel superior, que después puede relacionarse como cualquier otra entidad.',
      'El proceso inverso se denomina **desagregación**. Al transformar el modelo en tablas, el agregado se convierte en su propia relación y la relación exterior lo referencia como a una entidad normal.',
    ],
    example: 'Los tipos de entidad EMPRESA y SOLICITANTE DE EMPLEO se relacionan mediante ENTREVISTA, pero es necesario que cada entrevista se corresponda con una determinada OFERTA DE EMPLEO. Se agrega EMPRESA + ENTREVISTA + SOLICITANTE en un tipo de entidad y se relaciona con OFERTA DE EMPLEO.',
    mistake: 'Trazar una línea directamente de un rombo a otro. Una relación no puede conectarse con otra relación; la agregación es la construcción que lo hace posible.' },

  { id: 'time', title: 'La dimensión temporal', topic: 'steps',
    summary: 'Decide si los datos deben verse a lo largo del tiempo y recoge los hitos temporales con atributos de tipo fecha.',
    body: [
      'Revisa la semántica para determinar si es necesario considerar la visión de los datos con proyección al presente y al futuro (y a su historia). En ese caso, valora añadir **atributos de tipo fecha** que permitan establecer los hitos temporales objeto de estudio.',
      'Ten cuidado con las fechas en relaciones de **muchos a muchos**: verifica que el resultado no incumpla el principio de **acceso único** a las ocurrencias de dicha relación una vez transformado el modelo conceptual al modelo lógico.',
    ],
    example: 'Un empleado puede trabajar en el mismo proyecto en varios periodos. Una Fecha_Inicio en “trabaja en” registra cada periodo, pero el par (empleado, proyecto) por sí solo ya no identifica una ocurrencia.',
    diagram: {
      w: 560, h: 200,
      nodes: [
        { id: 'E', cx: 0.13, cy: 0.66, type: 'entity', label: 'EMPLEADO' },
        { id: 'R', cx: 0.5, cy: 0.66, type: 'relationship', label: 'trabaja en' },
        { id: 'P', cx: 0.87, cy: 0.66, type: 'entity', label: 'PROYECTO' },
        { id: 'sd', cx: 0.5, cy: 0.17, type: 'attribute', label: 'Fecha_Inicio' },
      ],
      edges: [
        { from: 'E', to: 'R', card: '(0,N)' },
        { from: 'P', to: 'R', card: '(0,N)' },
        { from: 'R', to: 'sd' },
      ],
    },
    caption: 'Un atributo fecha en una relación M:N registra cuándo se produjo cada ocurrencia; comprueba que cada ocurrencia siga siendo accesible de forma única.' },

  { id: 'steps', title: 'Pasos para construir el modelo', topic: 'steps',
    summary: 'Los cinco pasos del curso para crear el modelo E/R extendido, desde el enunciado hasta un diagrama documentado.',
    body: [
      'El modelado conceptual responde al **¿Qué?**, nunca al **¿Cómo?**: describe solo el problema, sin sesgos hacia un SGBD, unas tablas o un almacenamiento. El ingeniero de datos refina la semántica del problema (ambigua, en lenguaje natural) recogida de los expertos hasta que sea precisa.',
      'El trabajo es iterativo: tras dibujar el modelo, vuelve al enunciado y comprueba con él cada entidad, clave, relación y cardinalidad.',
    ],
    points: [
      '1. Identificar las **entidades** dentro del sistema.',
      '2. Determinar las **claves** o identificadores de las entidades.',
      '3. Establecer las **relaciones** entre las entidades, describiendo su grado.',
      '4. **Dibujar** el modelo conceptual de datos.',
      '5. Identificar los **atributos** de cada entidad y describirlos en el diccionario de datos.',
    ],
    mistake: 'Empezar por las tablas y las claves ajenas. Eso es el modelo lógico (el ¿Cómo?); el modelo conceptual va primero y es independiente de él.' },
];
