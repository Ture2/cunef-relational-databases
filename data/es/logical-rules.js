'use strict';
/* Reglas de transformación ER → lógico — traducción al español de data/en/logical-rules.js.
   Una tarjeta por regla, con un pequeño ejemplo resuelto.
   `model` tiene la forma de un ejercicio (data/<lang>/logical.js): js/logical-section.js lo dibuja con
   ErDiagram.modelSvg y deriva las tablas resultantes con LogicalEngine.variants, de modo que el ejemplo
   siempre coincide con el corrector. Cuando un modelo admite varios resultados (lado de la clave ajena
   en una 1:1, estrategia de jerarquía) la tarjeta permite al lector alternar entre ellos.
   `exercise` indica el ejercicio de Nivel 1 que practica la regla. Los ejemplos usan dominios distintos
   de los de los ejercicios, así que leer una tarjeta nunca desvela un ejercicio.
   Las cardinalidades son de lectura cruzada: la cardinalidad en la entidad E = cuántas E por cada ocurrencia del otro lado. */
DATA.es.LOGICAL_RULES = [
  /* ───────────── Entidades y atributos ───────────── */
  {
    id: 'entity',
    hub: 'basics',
    title: 'Entidad → tabla, identificador → clave primaria',
    summary: 'Cada tipo de entidad se convierte en una **tabla** con el mismo nombre, y su identificador pasa a ser la **clave primaria** de la tabla.',
    body: [
      'Cada ocurrencia de la entidad se convierte en una fila de la tabla. Cada atributo simple se convierte en una columna (regla 2).',
      'El atributo clave de la entidad (subrayado en el diagrama) pasa a ser la clave primaria (regla 3). Debe ser único y nunca NULL. Si el identificador tiene varios atributos, la clave primaria es el conjunto de todos ellos.',
    ],
    points: [
      'Regla 1: **entidad → tabla**, con el nombre de la entidad.',
      'Regla 2: **atributo → columna** de esa tabla.',
      'Regla 3: **identificador → clave primaria**.',
    ],
    example: 'La entidad `Libro` con ISBN, título y año se convierte en `Libro(ISBN, título, año)`. Una fila por libro, y el ISBN lo identifica.',
    mistake: 'Añadir una columna id artificial cuando la entidad ya tiene identificador. Si el modelo dice que el ISBN identifica un libro, el ISBN es la clave primaria.',
    exercise: 'teams-players',
    model: {
      entities: [
        { id: 'Libro', at: [0, 0], attrs: [{ name: 'ISBN', kind: 'key' }, { name: 'título' }, { name: 'año' }] },
      ],
      relationships: [],
    },
  },
  {
    id: 'attributes',
    hub: 'basics',
    title: 'Atributos compuestos y derivados',
    summary: 'Un atributo **compuesto** se descompone en una columna por cada parte. Un atributo **derivado** se omite, porque puede calcularse.',
    body: [
      'Una columna relacional guarda un único valor atómico, así que un atributo compuesto como una dirección no puede almacenarse en una sola columna. Sus partes (calle, ciudad, código postal) se convierten en columnas separadas de la misma tabla.',
      'Un atributo derivado (marcado con una barra, como /edad) se calcula a partir de otros datos, por ejemplo la edad a partir de la fecha de nacimiento. Almacenarlo duplicaría información que puede quedar desactualizada, así que no recibe columna. Una consulta o una vista lo calcula cuando hace falta.',
    ],
    points: [
      '**Compuesto** → sus partes se convierten en columnas; el nombre del compuesto desaparece.',
      '**Derivado** → sin columna; se calcula en las consultas.',
    ],
    example: '`Cliente(id cliente, nombre, fecha nacimiento, dirección(calle, ciudad, código postal), /edad)` se convierte en `Cliente(id cliente, nombre, fecha nacimiento, calle, ciudad, código postal)`.',
    mistake: 'Mantener una columna `edad` junto a `fecha nacimiento`. Al cabo de un año la edad almacenada es incorrecta, mientras que la fecha de nacimiento sigue siendo correcta.',
    exercise: 'person-attributes',
    model: {
      entities: [
        { id: 'Cliente', at: [0, 0], attrs: [
          { name: 'id cliente', kind: 'key' }, { name: 'nombre' }, { name: 'fecha nacimiento' },
          { name: 'dirección', kind: 'composite', parts: ['calle', 'ciudad', 'código postal'] },
          { name: 'edad', kind: 'derived' },
        ] },
      ],
      relationships: [],
    },
  },
  {
    id: 'multivalued',
    hub: 'basics',
    title: 'Atributo multivaluado → tabla propia',
    summary: 'Un atributo **multivaluado** se convierte en una tabla nueva. Su clave primaria es la clave de la entidad propietaria más el valor.',
    body: [
      'Una celda guarda un solo valor, así que una lista de valores (varios e-mails, varios teléfonos) no cabe en la tabla de la entidad propietaria. Cada valor se convierte en una fila de una tabla nueva, que repite la clave de la propietaria como clave ajena.',
      'El par (clave de la propietaria, valor) identifica cada fila. Un mismo e-mail aparece solo una vez por cliente, pero dos clientes pueden compartirlo.',
    ],
    points: [
      'Tabla nueva, normalmente con el nombre de la propietaria + el del atributo (`ClienteEmail`).',
      'Columnas: la clave de la propietaria (**PK y FK**) + el valor (**PK**).',
      'La tabla de la propietaria conserva sus demás atributos y pierde el multivaluado.',
    ],
    example: '`Cliente(id cliente, nombre, {email})` se convierte en `Cliente(id cliente, nombre)` y `ClienteEmail(id cliente → Cliente, email)`.',
    mistake: 'Añadir las columnas email1, email2, email3. Eso fija un límite arbitrario, deja NULLs y obliga a buscar un e-mail en tres sitios.',
    exercise: 'person-attributes',
    model: {
      entities: [
        { id: 'Cliente', at: [0, 0], attrs: [{ name: 'id cliente', kind: 'key' }, { name: 'nombre' }, { name: 'email', kind: 'multivalued' }] },
      ],
      relationships: [],
    },
  },

  /* ───────────── Relaciones binarias ───────────── */
  {
    id: 'one-to-many',
    hub: 'binary',
    title: 'Relación 1:N → clave ajena en el lado N',
    summary: 'Una relación uno a muchos **no tiene tabla propia**. La clave del lado "uno" pasa al lado "muchos" como **clave ajena**.',
    body: [
      'Cada fila del lado N se relaciona como mucho con una fila del lado 1, así que basta una sola columna en el lado N para guardar ese vínculo. Cada empleado trabaja en un departamento, así que `Empleado` recibe una columna `id departamento` que referencia a `Departamento`.',
      'La dirección contraria no funcionaría: un departamento tiene muchos empleados, y una columna de `Departamento` no puede guardar una lista.',
      'Los atributos de una relación 1:N también van al lado N, junto a la clave ajena.',
    ],
    points: [
      'Regla 5: **1:N → FK en el lado N**, que referencia al lado 1.',
      'La FK es **NOT NULL** cuando el mínimo en el lado 1 es 1 (ver "Participación").',
    ],
    example: 'Departamento (1,1) — TrabajaEn — (0,N) Empleado se convierte en `Empleado(id empleado, nombre, id departamento → Departamento)`.',
    mistake: 'Poner la clave ajena en el lado "uno", por ejemplo un id empleado en `Departamento`. Solo podría guardar un empleado por departamento.',
    exercise: 'teams-players',
    model: {
      entities: [
        { id: 'Departamento', at: [0, 0], attrs: [{ name: 'id departamento', kind: 'key' }, { name: 'nombre' }] },
        { id: 'Empleado', at: [2, 0], attrs: [{ name: 'id empleado', kind: 'key' }, { name: 'nombre' }] },
      ],
      relationships: [
        { id: 'TrabajaEn', ends: [{ entity: 'Departamento', card: '(1,1)' }, { entity: 'Empleado', card: '(0,N)' }] },
      ],
    },
  },
  {
    id: 'many-to-many',
    hub: 'binary',
    title: 'Relación M:N → tabla propia',
    summary: 'Una relación muchos a muchos se convierte en una **tabla nueva**. Su clave primaria combina las claves de las dos entidades, y cada una de ellas es además clave ajena.',
    body: [
      'Ninguno de los dos lados puede guardar el vínculo en una sola columna: un estudiante cursa muchas asignaturas y una asignatura tiene muchos estudiantes. La tabla nueva, a menudo llamada tabla intermedia o tabla puente, tiene una fila por cada par relacionado.',
      'Los atributos de la relación, como la nota que obtiene un estudiante en una asignatura, describen el par. Van en esta tabla nueva.',
    ],
    points: [
      'Regla 4: **M:N → tabla** con el nombre de la relación.',
      'PK = **las dos claves ajenas juntas**.',
      'Los atributos de la relación se convierten en columnas de esta tabla.',
    ],
    example: 'Estudiante (0,N) — Cursa(nota) — (1,N) Asignatura se convierte en `Cursa(id estudiante → Estudiante, id asignatura → Asignatura, nota)`.',
    mistake: 'Hacer clave primaria solo a una de las dos claves ajenas. Entonces un estudiante solo podría aparecer en una asignatura.',
    exercise: 'toys-parts',
    model: {
      entities: [
        { id: 'Estudiante', at: [0, 0], attrs: [{ name: 'id estudiante', kind: 'key' }, { name: 'nombre' }] },
        { id: 'Asignatura', at: [2, 0], attrs: [{ name: 'id asignatura', kind: 'key' }, { name: 'título' }] },
      ],
      relationships: [
        { id: 'Cursa', ends: [{ entity: 'Estudiante', card: '(0,N)' }, { entity: 'Asignatura', card: '(1,N)' }], attrs: [{ name: 'nota' }] },
      ],
    },
  },
  {
    id: 'one-to-one',
    hub: 'binary',
    title: 'Relación 1:1 → la clave pasa a uno de los lados',
    summary: 'En una relación uno a uno la clave de **cualquiera** de los dos lados puede pasar al otro. Con (0,1)/(1,1), la regla del curso la pasa al lado **opcional**.',
    body: [
      'Las dos direcciones son posibles, porque cada fila se relaciona como mucho con una fila del otro lado.',
      'El **lado opcional** es la entidad cuya participación es parcial: el mínimo en el extremo opuesto es 0. Aquí una persona puede no tener pasaporte (la cardinalidad en Pasaporte es (0,1)), así que `Persona` es el lado opcional y recibe `número pasaporte` como clave ajena. Esa FK es NULL para las personas sin pasaporte.',
      'La otra dirección, un `id persona` NOT NULL en `Pasaporte`, también es un diseño correcto, y el corrector lo acepta. Esté donde esté, marca la clave ajena como única: eso es lo que mantiene la relación como 1:1 y no 1:N.',
    ],
    points: [
      'Regla 6: **1:1 → la clave de cualquiera de los lados pasa al otro**.',
      'Regla 7: con (0,1)/(1,1), **la clave pasa al lado opcional** (el que tiene mín 0 en el extremo opuesto).',
      'Usa el selector de abajo para ver los dos diseños aceptados.',
    ],
    example: 'Persona (1,1) — Posee — (0,1) Pasaporte se convierte en `Persona(id persona, nombre, número pasaporte → Pasaporte)`, con una FK que admite NULL.',
    mistake: 'Fusionar las dos entidades en una sola tabla. A veces es aceptable, pero no es la regla del curso, y deja columnas vacías para cada persona sin pasaporte.',
    exercise: 'warehouse-location',
    model: {
      entities: [
        { id: 'Persona', at: [0, 0], attrs: [{ name: 'id persona', kind: 'key' }, { name: 'nombre' }] },
        { id: 'Pasaporte', at: [2, 0], attrs: [{ name: 'número pasaporte', kind: 'key' }, { name: 'caducidad' }] },
      ],
      relationships: [
        { id: 'Posee', ends: [{ entity: 'Persona', card: '(1,1)' }, { entity: 'Pasaporte', card: '(0,1)' }] },
      ],
    },
  },
  {
    id: 'participation',
    hub: 'binary',
    title: 'Participación → NOT NULL en la clave ajena',
    summary: 'La cardinalidad **mínima** decide si una clave ajena puede ser NULL. Se lee **cruzando** la relación, en el extremo al que apunta la FK.',
    body: [
      'Con cardinalidades de lectura cruzada, la cardinalidad escrita en la entidad E indica cuántas E se relacionan con una ocurrencia de la otra entidad. La cardinalidad en `Cliente` indica cuántos clientes tiene un pedido.',
      'Si ese mínimo es **1**, todo pedido debe tener cliente, así que la FK `id cliente` de `Pedido` es **NOT NULL**. Si es **0**, un pedido puede existir sin él, y la FK admite NULL. En este ejemplo un pedido puede quedar a la espera sin repartidor, así que `id repartidor` puede ser NULL.',
    ],
    points: [
      'Mín **1** en el lado referenciado → FK **NOT NULL**.',
      'Mín **0** en el lado referenciado → la FK **puede ser NULL** (se marca con ? en la notación).',
      'Las columnas de la clave primaria son siempre NOT NULL.',
    ],
    example: 'Cliente (1,1) — Realiza — (0,N) Pedido y Repartidor (0,1) — Reparte — (0,N) Pedido se convierten en `Pedido(id pedido, fecha, id cliente → Cliente NOT NULL, id repartidor → Repartidor NULL)`.',
    mistake: 'Leer la cardinalidad en el lado equivocado. La cardinalidad junto a `Pedido` indica cuántos pedidos tiene un cliente. No decide nada sobre la FK de `Pedido`.',
    exercise: 'teams-players',
    model: {
      entities: [
        { id: 'Cliente', at: [0, 0], attrs: [{ name: 'id cliente', kind: 'key' }, { name: 'nombre' }] },
        { id: 'Pedido', at: [2, 0], attrs: [{ name: 'id pedido', kind: 'key' }, { name: 'fecha' }] },
        { id: 'Repartidor', at: [4, 0], attrs: [{ name: 'id repartidor', kind: 'key' }, { name: 'nombre' }] },
      ],
      relationships: [
        { id: 'Realiza', ends: [{ entity: 'Cliente', card: '(1,1)' }, { entity: 'Pedido', card: '(0,N)' }] },
        { id: 'Reparte', ends: [{ entity: 'Repartidor', card: '(0,1)' }, { entity: 'Pedido', card: '(0,N)' }] },
      ],
    },
  },

  /* ───────────── Casos especiales ───────────── */
  {
    id: 'weak',
    hub: 'special',
    title: 'Entidad débil → clave de la propietaria + clave parcial',
    summary: 'Una entidad **débil** no puede identificarse por sí sola. Su clave primaria es la **clave de la entidad propietaria** (también clave ajena) más su **clave parcial**.',
    body: [
      'La sala número 101 existe en muchos edificios, así que el número por sí solo no basta. Solo identifica una sala junto con su edificio. La clave parcial se marca con un subrayado discontinuo, y la relación identificadora con un rombo doble.',
      'La tabla de la entidad débil toma la clave de la propietaria como clave ajena y la incluye en su clave primaria. La relación identificadora no tiene tabla propia.',
    ],
    points: [
      'PK = **clave de la propietaria (FK)** + **clave parcial**.',
      'La FK es siempre NOT NULL, porque forma parte de la PK.',
      'Al borrar la propietaria se suelen borrar sus filas débiles (ON DELETE CASCADE).',
    ],
    example: 'Edificio (1,1) ═ Contiene ═ (1,N) Sala(número, planta) se convierte en `Sala(id edificio → Edificio, número, planta)`.',
    mistake: 'Usar solo la clave parcial como clave primaria. Dos edificios con una sala 101 entrarían en conflicto.',
    exercise: 'course-classes',
    model: {
      entities: [
        { id: 'Edificio', at: [0, 0], attrs: [{ name: 'id edificio', kind: 'key' }, { name: 'dirección' }] },
        { id: 'Sala', at: [2, 0], weak: true, attrs: [{ name: 'número', kind: 'partial' }, { name: 'planta' }] },
      ],
      relationships: [
        { id: 'Contiene', identifying: true, ends: [{ entity: 'Edificio', card: '(1,1)' }, { entity: 'Sala', card: '(1,N)' }] },
      ],
    },
  },
  {
    id: 'unary',
    hub: 'special',
    title: 'Relación unaria (reflexiva)',
    summary: 'Cuando una entidad se relaciona **consigo misma**, se aplica la regla habitual de 1:N o de M:N. Las claves ajenas apuntan a la **misma tabla** y reciben el nombre de los **roles**.',
    body: [
      '**1:N** (cada persona tiene como mucho un mentor): se añade a la misma tabla una columna FK con el nombre del rol (`mentor`), que referencia la clave de la propia tabla. Suele ser opcional, porque hay quien no tiene mentor.',
      '**M:N** (una asignatura tiene muchos prerrequisitos y es prerrequisito de muchas): se crea una tabla nueva con **dos** FK a la entidad, una por rol. Las dos juntas forman la PK.',
      'Los nombres de rol son necesarios porque, si no, las dos columnas tendrían el mismo nombre.',
    ],
    points: [
      'Unaria 1:N → **una FK a la misma tabla**, con el nombre del rol.',
      'Unaria M:N → **una tabla con dos FK** a la entidad, una por rol.',
    ],
    example: 'Asignatura (0,N) como prerrequisito — Requiere — (0,N) como asignatura se convierte en `Requiere(prerrequisito → Asignatura, asignatura → Asignatura)`.',
    mistake: 'Crear una segunda tabla para la misma entidad, como `Mentor` junto a `Persona`. Un mentor es una persona, así que el rol es una columna, no una tabla.',
    exercise: 'employee-manager',
    model: {
      entities: [
        { id: 'Asignatura', at: [0, 0], attrs: [{ name: 'código', kind: 'key' }, { name: 'título' }] },
      ],
      relationships: [
        { id: 'Requiere', at: [1, 1], ends: [{ entity: 'Asignatura', card: '(0,N)', role: 'prerrequisito' }, { entity: 'Asignatura', card: '(0,N)', role: 'asignatura' }] },
      ],
    },
  },
  {
    id: 'ternary',
    hub: 'special',
    title: 'Relación ternaria → tabla con tres FK',
    summary: 'Una relación entre **tres** entidades siempre se convierte en una tabla propia, con una clave ajena a cada una de ellas.',
    body: [
      'Ninguna entidad puede absorber una relación ternaria: cada hecho vincula a la vez un médico, un paciente y un tratamiento. La tabla nueva tiene una fila por combinación, más los atributos de la relación.',
      'Cuando todos los extremos son "muchos", la PK son las tres FK juntas. Cuando un extremo tiene máx 1, esa FK puede quedar fuera de la PK, porque las otras dos ya la determinan. El corrector acepta las dos opciones.',
    ],
    points: [
      'Ternaria → **tabla** con **una FK por entidad**.',
      'PK: las FK de los extremos "muchos" (las tres si todos los extremos son N).',
    ],
    example: 'Médico, Paciente, Tratamiento — Prescribe(fecha) se convierte en `Prescribe(id médico → Médico, id paciente → Paciente, id tratamiento → Tratamiento, fecha)`.',
    mistake: 'Dividir la ternaria en tres relaciones binarias. Se pierde qué médico prescribió qué tratamiento a qué paciente.',
    exercise: 'supplier-part-project',
    model: {
      entities: [
        { id: 'Médico', at: [0, 0], attrs: [{ name: 'id médico', kind: 'key' }, { name: 'nombre' }] },
        { id: 'Tratamiento', at: [4, 0], attrs: [{ name: 'id tratamiento', kind: 'key' }, { name: 'nombre' }] },
        { id: 'Paciente', at: [2, 2], attrs: [{ name: 'id paciente', kind: 'key' }, { name: 'nombre' }] },
      ],
      relationships: [
        { id: 'Prescribe', at: [2, 1], ends: [{ entity: 'Médico', card: '(0,N)' }, { entity: 'Tratamiento', card: '(0,N)' }, { entity: 'Paciente', card: '(0,N)' }], attrs: [{ name: 'fecha' }] },
      ],
    },
  },

  /* ───────────── Jerarquías ───────────── */
  {
    id: 'hierarchy',
    hub: 'hierarchy',
    title: 'Jerarquía: las tres estrategias',
    summary: 'Una generalización (supertipo y subtipos) puede transformarse en tablas de **tres** maneras. Usa el selector de abajo para ver las tablas que produce cada una.',
    body: [
      '**Supertipo + subtipos** (la opción por defecto del curso): una tabla para el supertipo y una por subtipo. La tabla de cada subtipo reutiliza la PK del supertipo, que además es FK a él. Sirve para cualquier jerarquía.',
      '**Una sola tabla**: una tabla para toda la jerarquía, con todos los atributos, más una columna **discriminante** que indica a qué subtipo pertenece cada fila. Las columnas de cada subtipo son NULL en las demás filas.',
      '**Solo subtipos**: sin tabla para el supertipo. La tabla de cada subtipo repite los atributos del supertipo. Solo es posible cuando la jerarquía es **total** (toda ocurrencia pertenece a un subtipo) y nada más referencia al supertipo.',
    ],
    points: [
      'Supertipo + subtipos: sin NULLs; leer una fila completa requiere un join.',
      'Una sola tabla: sin joins; NULLs en las columnas de los subtipos.',
      'Solo subtipos: sin joins y sin NULLs, pero no se puede referenciar el supertipo en su conjunto.',
    ],
    example: 'Cuenta(número, fecha apertura) es o bien una CuentaAhorro(tipo interés) o bien una CuentaCorriente(descubierto), así que la jerarquía es total y disjunta.',
    mistake: 'Elegir "solo subtipos" para una jerarquía parcial. Las cuentas que no son ni de ahorro ni corrientes no tendrían dónde ir.',
    exercise: 'vehicle-hierarchy',
    model: {
      entities: [
        { id: 'Cuenta', at: [2, 0], attrs: [{ name: 'número', kind: 'key' }, { name: 'fecha apertura' }] },
        { id: 'CuentaAhorro', at: [0, 2], attrs: [{ name: 'tipo interés' }] },
        { id: 'CuentaCorriente', at: [4, 2], attrs: [{ name: 'descubierto' }] },
      ],
      relationships: [],
      hierarchies: [
        { id: 'TiposCuenta', super: 'Cuenta', subs: ['CuentaAhorro', 'CuentaCorriente'], disjoint: true, total: true, discriminator: 'tipo cuenta', at: [2, 1] },
      ],
    },
  },
  {
    id: 'hierarchy-choice',
    hub: 'hierarchy',
    title: 'Cómo elegir una estrategia de jerarquía',
    summary: 'Las tres estrategias son correctas. Elige una según cómo se **usan** los datos: relaciones compartidas, cuántos atributos propios tienen los subtipos y si la jerarquía es total.',
    body: [
      'Si otras entidades se relacionan con el **supertipo** (toda cuenta tiene un titular), conserva una tabla para el supertipo para que la clave ajena tenga algo que referenciar. Usa "supertipo + subtipos" o "una sola tabla".',
      'Si los subtipos tienen **pocos atributos propios** y se suelen consultar juntos, una sola tabla es sencilla y rápida.',
      'Si los subtipos tienen **muchos atributos y relaciones propios**, las tablas separadas evitan filas largas llenas de NULLs.',
    ],
    table: {
      caption: 'Ventajas e inconvenientes de las tres estrategias',
      head: ['Estrategia', 'NULLs', 'Joins para leer una fila', 'Requiere jerarquía total'],
      rows: [
        ['Supertipo + subtipos', 'No', 'Sí (supertipo ⋈ subtipo)', 'No'],
        ['Una sola tabla', 'Sí, en las columnas de los subtipos', 'No', 'No'],
        ['Solo subtipos', 'No', 'No (pero hace falta un UNION para listarlos todos)', 'Sí'],
      ],
    },
    mistake: 'Omitir el discriminante en la estrategia de una sola tabla. Sin él, una fila con todas las columnas de los subtipos a NULL no puede clasificarse.',
    exercise: 'vehicle-hierarchy',
  },
];
