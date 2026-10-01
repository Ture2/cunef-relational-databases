'use strict';

/*
  Spanish translation of data/en/normalization.js (same shape and ids).
  The data schema is documented in the English file.
*/

DATA.es.NF_INFO = {
  '2NF': {
    name: 'Segunda forma normal',
    rule: 'Todo atributo no clave depende de la clave completa, no solo de una parte de ella.',
    how: [
      'Mira la clave primaria. Si tiene un solo atributo, ya se cumple 2FN.',
      'Si es compuesta, pregúntate por cada atributo no clave: ¿basta con una parte de la clave para conocerlo?',
      'Lleva los que dependen de una parte de la clave a una tabla nueva cuya clave sea esa parte.',
      'En la tabla de origen deja la clave completa y solo lo que depende de toda ella.',
    ],
  },
  '3NF': {
    name: 'Tercera forma normal',
    rule: 'Ningún atributo no clave depende de otro atributo no clave.',
    how: [
      'Busca cadenas: la clave determina A y A determina B. Entonces B depende de A, no de la clave.',
      'Lleva A y B a una tabla nueva cuya clave sea A.',
      'Deja A también en la tabla de origen: es la referencia (clave ajena) que las enlaza.',
      'Repite mientras queden cadenas: cada eslabón acaba con su propia tabla.',
    ],
  },
  BCNF: {
    name: 'Forma normal de Boyce-Codd',
    rule: 'Todo determinante es clave: si un atributo (o grupo) determina otros, debe identificar cada fila.',
    how: [
      'Anota la parte izquierda de cada dependencia funcional.',
      'Pregúntate por cada una: ¿identifica por sí sola cada fila de la tabla? Si no, es un problema, aunque lo que determina forme parte de una clave (3FN lo tolera, FNBC no).',
      'Lleva el determinante y lo que determina a una tabla nueva, con el determinante como clave.',
      'En la tabla de origen deja el determinante (como referencia) y quita lo que determina.',
      'Cuidado: puede que alguna dependencia deje de poder comprobarse dentro de una sola tabla. A veces es inevitable.',
    ],
  },
  '4NF': {
    name: 'Cuarta forma normal',
    rule: 'Una tabla no mezcla dos hechos independientes sobre lo mismo. Si X ↠ Y | Z, entonces X debe ser clave.',
    how: [
      'Busca tablas en las que casi todo es clave: el mismo X con varios valores de Y y varios valores de Z.',
      'Pregúntate: para un mismo X, ¿se combinan los valores de Y y de Z de todas las formas, sin relación entre ellos? Si es así, hay una dependencia multivaluada X ↠ Y | Z.',
      'Guarda cada hecho en su propia tabla: una con X e Y, otra con X y Z. La clave de cada una son sus dos atributos.',
      'Comprueba que no se pierde nada: la reunión de las dos tablas por X debe dar exactamente la tabla original.',
    ],
  },
  '5NF': {
    name: 'Quinta forma normal',
    rule: 'Ninguna tabla puede reconstruirse reuniendo tablas más pequeñas, salvo a través de sus claves.',
    how: [
      'Busca tablas con tres o más atributos que son todos clave y no tienen dependencias multivaluadas.',
      'Pregúntate: ¿hay una regla del tipo "si se cumplen A–B, B–C y A–C, entonces se cumple A–B–C"? Entonces la tabla puede reconstruirse a partir de sus parejas.',
      'Sustitúyela por una tabla por pareja: (A, B), (B, C) y (A, C).',
      'Comprueba que con solo dos de las tres parejas aparecen filas que nunca existieron: hacen falta todas.',
      'Cuidado: esto solo es correcto si la regla se cumple siempre. Si es una casualidad de los datos actuales, la tabla con los tres atributos es la correcta.',
    ],
  },
};

DATA.es.EXERCISES = [
  {
    id: 'order-lines',
    title: 'Líneas de pedido',
    short: 'Líneas de pedido',
    story: 'Una tienda guarda cada línea de pedido en una sola tabla. Llévala a 2FN.',
    attrs: ['id_pedido', 'id_producto', 'cantidad', 'nombre_producto', 'precio'],
    pk: ['id_pedido', 'id_producto'],
    fds: [
      'id_pedido, id_producto -> cantidad',
      'id_producto -> nombre_producto, precio',
    ],
    rows: [
      [1, 'P1', 2, 'Teclado', 30],
      [1, 'P2', 1, 'Ratón', 15],
      [2, 'P1', 5, 'Teclado', 30],
      [3, 'P3', 1, 'Monitor', 180],
      [3, 'P2', 2, 'Ratón', 15],
      [4, 'P1', 1, 'Teclado', 30],
    ],
    steps: [
      {
        nf: '2NF',
        solution: [
          { name: 'LíneaPedido', attrs: ['id_pedido', 'id_producto', 'cantidad'], pk: ['id_pedido', 'id_producto'] },
          { name: 'Producto', attrs: ['id_producto', 'nombre_producto', 'precio'], pk: ['id_producto'] },
        ],
        hints: [
          'La clave tiene dos atributos. Por cada uno de los demás, pregúntate: ¿basta con una parte de la clave para conocerlo?',
          'nombre_producto y precio se conocen solo con id_producto: dependen de una parte de la clave.',
          'Llévalos a su propia tabla, con id_producto como clave. La tabla original se queda con id_pedido, id_producto y cantidad.',
        ],
        insight:
          'El nombre y el precio de un producto se guardaban una vez por cada línea en la que aparecía. Ahora viven en una sola fila de Producto: cambiar un precio es una sola actualización.',
      },
    ],
  },

  {
    id: 'employees-departments',
    title: 'Empleados y departamentos',
    short: 'Empleados',
    story: 'Una empresa guarda sus empleados junto con los datos de su departamento. Llévala a 3FN.',
    attrs: ['id_empleado', 'nombre', 'id_dpto', 'nombre_dpto', 'ubicacion'],
    pk: ['id_empleado'],
    fds: [
      'id_empleado -> nombre, id_dpto',
      'id_dpto -> nombre_dpto, ubicacion',
    ],
    rows: [
      [1, 'Ana', 'D1', 'Ventas', 'Planta 1'],
      [2, 'Luis', 'D1', 'Ventas', 'Planta 1'],
      [3, 'Eva', 'D2', 'Informática', 'Planta 3'],
      [4, 'Marc', 'D1', 'Ventas', 'Planta 1'],
      [5, 'Lucía', 'D3', 'Contabilidad', 'Planta 2'],
    ],
    steps: [
      {
        nf: '3NF',
        solution: [
          { name: 'Empleado', attrs: ['id_empleado', 'nombre', 'id_dpto'], pk: ['id_empleado'] },
          { name: 'Departamento', attrs: ['id_dpto', 'nombre_dpto', 'ubicacion'], pk: ['id_dpto'] },
        ],
        hints: [
          'La clave es un solo atributo, así que no puede haber dependencias parciales. Busca atributos que dependan de otro atributo que no es la clave.',
          'id_dpto determina nombre_dpto y ubicacion, e id_dpto no es la clave de la tabla.',
          'Llévalos a otra tabla con id_dpto como clave, pero deja también id_dpto en Empleado para poder enlazar ambas.',
        ],
        insight:
          'id_empleado → id_dpto → nombre_dpto es una dependencia transitiva. Si un departamento cambiaba de planta, había que corregir una fila por empleado; ahora es una sola fila.',
      },
    ],
  },

  {
    id: 'enrollments',
    title: 'Matrículas',
    short: 'Matrículas',
    story: 'Una universidad guarda las matrículas junto con los datos de cada estudiante y de cada asignatura. Llévala a 2FN.',
    attrs: ['id_estudiante', 'id_asignatura', 'nombre_estudiante', 'nombre_asignatura', 'creditos', 'nota'],
    pk: ['id_estudiante', 'id_asignatura'],
    fds: [
      'id_estudiante, id_asignatura -> nota',
      'id_estudiante -> nombre_estudiante',
      'id_asignatura -> nombre_asignatura, creditos',
    ],
    rows: [
      ['A1', 'BD', 'Ana', 'Bases de datos', 6, 8],
      ['A1', 'PRG', 'Ana', 'Programación', 6, 7],
      ['A2', 'BD', 'Luis', 'Bases de datos', 6, 6],
      ['A2', 'RED', 'Luis', 'Redes', 4, 7],
      ['A3', 'PRG', 'Eva', 'Programación', 6, 9],
      ['A3', 'BD', 'Eva', 'Bases de datos', 6, 5],
    ],
    steps: [
      {
        nf: '2NF',
        solution: [
          { name: 'Estudiante', attrs: ['id_estudiante', 'nombre_estudiante'], pk: ['id_estudiante'] },
          { name: 'Asignatura', attrs: ['id_asignatura', 'nombre_asignatura', 'creditos'], pk: ['id_asignatura'] },
          { name: 'Matrícula', attrs: ['id_estudiante', 'id_asignatura', 'nota'], pk: ['id_estudiante', 'id_asignatura'] },
        ],
        hints: [
          'Por cada atributo no clave, pregúntate: ¿puede conocerse solo con id_estudiante? ¿Solo con id_asignatura?',
          'nombre_estudiante depende solo de id_estudiante; nombre_asignatura y creditos, solo de id_asignatura. Únicamente nota necesita las dos partes de la clave.',
          'Tres tablas: Estudiante, Asignatura y Matrícula (con la nota y las dos claves).',
        ],
        insight:
          'Solo la nota describe la pareja estudiante–asignatura. Lo demás describe a un estudiante o a una asignatura, y se repetía en cada matrícula.',
      },
    ],
  },

  {
    id: 'medical-appointments',
    title: 'Citas médicas',
    short: 'Citas',
    story: 'Una clínica registra cada cita junto con los datos del paciente y del médico. Llévala a 3FN.',
    attrs: ['id_cita', 'fecha', 'id_paciente', 'nombre_paciente', 'id_medico', 'nombre_medico', 'especialidad'],
    pk: ['id_cita'],
    fds: [
      'id_cita -> fecha, id_paciente, id_medico',
      'id_paciente -> nombre_paciente',
      'id_medico -> nombre_medico, especialidad',
    ],
    rows: [
      [101, '2026-10-05', 'P1', 'Marta Gil', 'M1', 'Dr. Ruiz', 'Cardiología'],
      [102, '2026-10-05', 'P2', 'Pablo León', 'M1', 'Dr. Ruiz', 'Cardiología'],
      [103, '2026-10-06', 'P1', 'Marta Gil', 'M2', 'Dra. Soto', 'Dermatología'],
      [104, '2026-10-07', 'P3', 'Irene Sanz', 'M2', 'Dra. Soto', 'Dermatología'],
      [105, '2026-10-08', 'P2', 'Pablo León', 'M1', 'Dr. Ruiz', 'Cardiología'],
    ],
    steps: [
      {
        nf: '3NF',
        solution: [
          { name: 'Cita', attrs: ['id_cita', 'fecha', 'id_paciente', 'id_medico'], pk: ['id_cita'] },
          { name: 'Paciente', attrs: ['id_paciente', 'nombre_paciente'], pk: ['id_paciente'] },
          { name: 'Médico', attrs: ['id_medico', 'nombre_medico', 'especialidad'], pk: ['id_medico'] },
        ],
        hints: [
          'id_cita identifica la cita, pero la fila describe también a un paciente y a un médico. ¿Qué datos pertenecen a cada uno?',
          'nombre_paciente depende de id_paciente, y nombre_medico y especialidad, de id_medico. Ninguno de los dos es la clave de la tabla.',
          'Necesitas tres tablas. Cita conserva id_paciente e id_medico como referencias.',
        ],
        insight:
          'Los datos del médico se repetían en cada una de sus citas. Ahora, si cambia su especialidad, se actualiza una sola fila.',
      },
    ],
  },

  {
    id: 'customers',
    title: 'Clientes',
    short: 'Clientes',
    story:
      'Un club guarda sus socios en una sola tabla. Déjala en 3FN, pero sin dividir más de lo necesario: divide solo si una dependencia lo justifica.',
    attrs: ['id_cliente', 'nombre', 'email', 'ciudad'],
    pk: ['id_cliente'],
    fds: ['id_cliente -> nombre, email, ciudad'],
    rows: [
      [1, 'Ana Ruiz', 'ana@mail.com', 'Madrid'],
      [2, 'Luis Pérez', 'luis@mail.com', 'Madrid'],
      [3, 'Eva Soto', 'eva@mail.com', 'Sevilla'],
      [4, 'Marc Puig', 'marc@mail.com', 'Barcelona'],
    ],
    steps: [
      {
        nf: '3NF',
        vacuous: true,
        solution: [
          { name: 'Cliente', attrs: ['id_cliente', 'nombre', 'email', 'ciudad'], pk: ['id_cliente'] },
        ],
        hints: [
          'Antes de dividir, busca dependencias: ¿algún atributo depende de otro que no sea id_cliente?',
          'ciudad se repite, pero no determina ningún otro atributo. Repetir un valor no es lo mismo que depender de otro.',
          'Si no encuentras ninguna dependencia, la tabla ya está en 3FN y no hay nada que separar: déjala como una sola tabla.',
        ],
        insight:
          'ciudad se repite, pero no determina ningún otro atributo: repetir un valor no es lo mismo que depender de otro. Dividir aquí no evita ninguna anomalía. Una tabla de ciudades sería una decisión de diseño (por ejemplo, para evitar erratas), no una exigencia de 3FN.',
      },
    ],
  },

  {
    id: 'library',
    title: 'Préstamos de biblioteca',
    short: 'Biblioteca',
    story:
      'Una biblioteca registra cada préstamo con los datos del socio, del libro y del autor. Cada préstamo es de un solo libro y cada libro tiene un solo autor. Llévala a 3FN.',
    attrs: ['id_prestamo', 'fecha', 'id_socio', 'nombre_socio', 'id_libro', 'titulo', 'id_autor', 'nombre_autor'],
    pk: ['id_prestamo'],
    fds: [
      'id_prestamo -> fecha, id_socio, id_libro',
      'id_socio -> nombre_socio',
      'id_libro -> titulo, id_autor',
      'id_autor -> nombre_autor',
    ],
    rows: [
      [1, '2026-09-01', 'S1', 'Ana', 'L1', 'Don Quijote', 'A1', 'Cervantes'],
      [2, '2026-09-03', 'S2', 'Luis', 'L1', 'Don Quijote', 'A1', 'Cervantes'],
      [3, '2026-09-05', 'S1', 'Ana', 'L2', 'La Regenta', 'A2', 'Clarín'],
      [4, '2026-09-08', 'S3', 'Eva', 'L3', 'Fortunata y Jacinta', 'A3', 'Galdós'],
      [5, '2026-09-09', 'S2', 'Luis', 'L2', 'La Regenta', 'A2', 'Clarín'],
    ],
    steps: [
      {
        nf: '3NF',
        solution: [
          { name: 'Préstamo', attrs: ['id_prestamo', 'fecha', 'id_socio', 'id_libro'], pk: ['id_prestamo'] },
          { name: 'Socio', attrs: ['id_socio', 'nombre_socio'], pk: ['id_socio'] },
          { name: 'Libro', attrs: ['id_libro', 'titulo', 'id_autor'], pk: ['id_libro'] },
          { name: 'Autor', attrs: ['id_autor', 'nombre_autor'], pk: ['id_autor'] },
        ],
        hints: [
          'Cada fila mezcla cuatro cosas distintas: un préstamo, un socio, un libro y un autor.',
          'Hay una cadena de dependencias: id_prestamo → id_libro → id_autor → nombre_autor. Cada eslabón necesita su propia tabla.',
          'Cuatro tablas: Préstamo, Socio, Libro y Autor. Las referencias (id_socio, id_libro, id_autor) se quedan en la tabla que apunta a la otra.',
        ],
        insight:
          'Cuatro cosas distintas vivían en la misma fila. Ahora cada una tiene su propia tabla, y las claves ajenas (id_socio, id_libro, id_autor) las conectan.',
      },
    ],
  },

  {
    id: 'full-orders',
    title: 'Pedidos completos',
    short: 'Pedidos',
    story:
      'Una tienda online guarda todo en una sola tabla. Llévala a 3FN en dos pasos: primero separa lo que depende de una parte de la clave (2FN) y después las cadenas de dependencias (3FN).',
    attrs: ['id_pedido', 'id_producto', 'cantidad', 'id_cliente', 'nombre_cliente', 'cp', 'ciudad', 'nombre_producto', 'precio'],
    pk: ['id_pedido', 'id_producto'],
    fds: [
      'id_pedido, id_producto -> cantidad',
      'id_pedido -> id_cliente',
      'id_cliente -> nombre_cliente, cp',
      'cp -> ciudad',
      'id_producto -> nombre_producto, precio',
    ],
    rows: [
      [1, 'P1', 2, 'C1', 'Ana', '28001', 'Madrid', 'Teclado', 30],
      [1, 'P2', 1, 'C1', 'Ana', '28001', 'Madrid', 'Ratón', 15],
      [2, 'P1', 1, 'C2', 'Luis', '08001', 'Barcelona', 'Teclado', 30],
      [3, 'P3', 1, 'C1', 'Ana', '28001', 'Madrid', 'Monitor', 180],
      [3, 'P2', 3, 'C1', 'Ana', '28001', 'Madrid', 'Ratón', 15],
      [4, 'P2', 1, 'C3', 'Eva', '28040', 'Madrid', 'Ratón', 15],
    ],
    steps: [
      {
        nf: '2NF',
        solution: [
          { name: 'LíneaPedido', attrs: ['id_pedido', 'id_producto', 'cantidad'], pk: ['id_pedido', 'id_producto'] },
          { name: 'Pedido', attrs: ['id_pedido', 'id_cliente', 'nombre_cliente', 'cp', 'ciudad'], pk: ['id_pedido'] },
          { name: 'Producto', attrs: ['id_producto', 'nombre_producto', 'precio'], pk: ['id_producto'] },
        ],
        hints: [
          'La clave es (id_pedido, id_producto). Por cada atributo pregúntate: ¿lo conozco solo con id_pedido? ¿Solo con id_producto?',
          'Con id_pedido conoces el cliente y todo lo del cliente (nombre, código postal, ciudad). Con id_producto, el nombre y el precio del producto.',
          'Tres tablas: LíneaPedido (con la cantidad), Pedido (con todo lo del cliente, de momento) y Producto.',
        ],
        insight:
          '2FN separa por partes de la clave: lo que describe el pedido, lo que describe el producto y lo que describe la línea (la cantidad). Pedido todavía arrastra una cadena de dependencias: eso es tarea de 3FN.',
      },
      {
        nf: '3NF',
        solution: [
          { name: 'LíneaPedido', attrs: ['id_pedido', 'id_producto', 'cantidad'], pk: ['id_pedido', 'id_producto'] },
          { name: 'Pedido', attrs: ['id_pedido', 'id_cliente'], pk: ['id_pedido'] },
          { name: 'Cliente', attrs: ['id_cliente', 'nombre_cliente', 'cp'], pk: ['id_cliente'] },
          { name: 'CódigoPostal', attrs: ['cp', 'ciudad'], pk: ['cp'] },
          { name: 'Producto', attrs: ['id_producto', 'nombre_producto', 'precio'], pk: ['id_producto'] },
        ],
        hints: [
          'Las tablas con clave simple ya cumplen 2FN. Busca en ellas atributos que dependan de otro atributo que no es clave.',
          'En Pedido hay una cadena: id_pedido → id_cliente → nombre_cliente, cp → ciudad. Cada eslabón es un atributo no clave que determina otros.',
          'Lleva nombre_cliente y cp a Cliente (clave id_cliente) y ciudad a CódigoPostal (clave cp). Deja id_cliente en Pedido y cp en Cliente para enlazarlas.',
        ],
        insight:
          '3FN rompe la cadena pedido → cliente → código postal → ciudad: cada eslabón tiene su propia tabla. Cinco tablas, y cada dato vive exactamente en un lugar.',
      },
    ],
  },

  {
    id: 'tutoring',
    title: 'Tutorías',
    short: 'Tutorías',
    story:
      'Cada estudiante se apunta a asignaturas y recibe tutoría de un profesor. Un profesor tutoriza una sola asignatura, pero una asignatura puede tener varios profesores. Un estudiante tiene como mucho un profesor por asignatura. La tabla ya está en 3FN: llévala a FNBC.',
    attrs: ['estudiante', 'asignatura', 'profesor'],
    pk: ['estudiante', 'asignatura'],
    fds: [
      'estudiante, asignatura -> profesor',
      'profesor -> asignatura',
    ],
    rows: [
      ['Ana', 'BD', 'Ruiz'],
      ['Ana', 'PRG', 'Soto'],
      ['Luis', 'BD', 'Ruiz'],
      ['Luis', 'PRG', 'Soto'],
      ['Eva', 'BD', 'Mora'],
      ['Eva', 'RED', 'Lara'],
    ],
    steps: [
      {
        nf: 'BCNF',
        allowLoss: true,
        solution: [
          { name: 'Profesor', attrs: ['profesor', 'asignatura'], pk: ['profesor'] },
          { name: 'Tutoría', attrs: ['estudiante', 'profesor'], pk: ['estudiante', 'profesor'] },
        ],
        hints: [
          'La tabla ya cumple 3FN, pero FNBC es más estricta. Fíjate en la parte izquierda de cada dependencia: ¿es siempre una clave de la tabla?',
          'profesor → asignatura: el profesor determina la asignatura, pero no identifica una fila por sí solo (un profesor tiene varios estudiantes).',
          'Lleva profesor y asignatura a una tabla con clave profesor. En la otra, deja estudiante y profesor, que juntos forman la clave.',
        ],
        insight:
          'La asignatura de un profesor se repetía en cada una de sus tutorías. Ahora vive en una sola fila. El precio: la regla "un estudiante tiene un profesor por asignatura" ya no cabe en una sola tabla y hay que garantizarla de otra forma. Es el caso clásico en el que FNBC no conserva todas las dependencias.',
      },
    ],
  },

  {
    id: 'skills-languages',
    title: 'Habilidades e idiomas',
    short: 'Habilidades',
    story:
      'Recursos Humanos guarda las habilidades y los idiomas de cada empleado. No hay relación entre las habilidades de un empleado y sus idiomas: se guardan todas las combinaciones. Llévala a 4FN.',
    attrs: ['empleado', 'habilidad', 'idioma'],
    pk: ['empleado', 'habilidad', 'idioma'],
    fds: [],
    mvds: ['empleado ->> habilidad'],
    rows: [
      ['Ana', 'SQL', 'Inglés'],
      ['Ana', 'SQL', 'Francés'],
      ['Ana', 'Python', 'Inglés'],
      ['Ana', 'Python', 'Francés'],
      ['Luis', 'Redes', 'Inglés'],
      ['Luis', 'Redes', 'Alemán'],
      ['Eva', 'Java', 'Inglés'],
      ['Eva', 'SQL', 'Inglés'],
    ],
    steps: [
      {
        nf: '4NF',
        solution: [
          { name: 'Habilidad', attrs: ['empleado', 'habilidad'], pk: ['empleado', 'habilidad'] },
          { name: 'Idioma', attrs: ['empleado', 'idioma'], pk: ['empleado', 'idioma'] },
        ],
        hints: [
          'No hay dependencias funcionales: la clave son los tres atributos. Aun así, hay redundancia. Fíjate en cómo se repiten los datos de cada empleado.',
          'Para cada empleado, sus habilidades y sus idiomas se combinan de todas las formas. Son dos hechos independientes: empleado ↠ habilidad y empleado ↠ idioma.',
          'Guarda cada hecho en su propia tabla: (empleado, habilidad) y (empleado, idioma), con los dos atributos de cada una como clave.',
        ],
        insight:
          'Ana tenía 2 habilidades y 2 idiomas, así que ocupaba 4 filas: añadir un idioma suponía añadir una fila por habilidad. Ahora es una sola fila en Idioma. Separar los hechos independientes elimina esa multiplicación.',
      },
    ],
  },

  {
    id: 'suppliers-parts',
    title: 'Proveedores, piezas y proyectos',
    short: 'Suministros',
    story:
      'Una constructora registra qué proveedor suministra qué pieza a qué proyecto. Siempre se cumple esta regla: si un proveedor suministra una pieza, esa pieza se usa en un proyecto y ese proveedor trabaja para ese proyecto, entonces el proveedor suministra esa pieza a ese proyecto. Llévala a 5FN.',
    attrs: ['proveedor', 'pieza', 'proyecto'],
    pk: ['proveedor', 'pieza', 'proyecto'],
    fds: [],
    jds: ['proveedor, pieza | pieza, proyecto | proveedor, proyecto'],
    rows: [
      ['Acme', 'Tornillo', 'Puente'],
      ['Acme', 'Tuerca', 'Puente'],
      ['Beta', 'Tornillo', 'Torre'],
      ['Beta', 'Arandela', 'Torre'],
      ['Gamma', 'Tuerca', 'Puente'],
      ['Gamma', 'Arandela', 'Torre'],
    ],
    steps: [
      {
        nf: '5NF',
        solution: [
          { name: 'ProveedorPieza', attrs: ['proveedor', 'pieza'], pk: ['proveedor', 'pieza'] },
          { name: 'PiezaProyecto', attrs: ['pieza', 'proyecto'], pk: ['pieza', 'proyecto'] },
          { name: 'ProveedorProyecto', attrs: ['proveedor', 'proyecto'], pk: ['proveedor', 'proyecto'] },
        ],
        hints: [
          'No hay dependencias funcionales ni multivaluadas: la tabla ya está en 4FN. Pero la regla del enunciado dice que puede reconstruirse a partir de sus parejas de atributos.',
          'Prueba a dividirla en dos tablas, por ejemplo (proveedor, pieza) y (pieza, proyecto), y a reunirlas: aparecen filas que no estaban. Hacen falta las tres parejas.',
          'Tres tablas: (proveedor, pieza), (pieza, proyecto) y (proveedor, proyecto), cada una con sus dos atributos como clave.',
        ],
        insight:
          'La regla permite reconstruir la tabla original reuniendo las tres parejas, pero dos cualesquiera de ellas por sí solas se inventan filas. Es una dependencia de reunión, y 5FN la elimina. Cuidado: solo es correcto si la regla se cumple siempre; si fuera una casualidad de los datos actuales, la tabla con los tres atributos sería la correcta.',
      },
    ],
  },

  {
    id: 'suppliers-1nf-5nf',
    title: 'De 1FN a 5FN: suministros',
    short: 'De 1FN a 5FN',
    story:
      'Una constructora guarda en una sola tabla los datos de sus proveedores, las piezas que suministran y los proyectos en los que trabajan. Cada proveedor tiene varias certificaciones, independientes de lo que suministra. Además, siempre se cumple esta regla: si un proveedor suministra una pieza, esa pieza se usa en un proyecto y el proveedor trabaja en ese proyecto, entonces suministra esa pieza a ese proyecto. Llévala de 1FN a 5FN, paso a paso.',
    attrs: ['id_proveedor', 'nombre_proveedor', 'id_ciudad', 'nombre_ciudad', 'certificacion', 'id_pieza', 'nombre_pieza', 'id_proyecto'],
    pk: ['id_proveedor', 'certificacion', 'id_pieza', 'id_proyecto'],
    fds: [
      'id_proveedor -> nombre_proveedor, id_ciudad',
      'id_ciudad -> nombre_ciudad',
      'id_pieza -> nombre_pieza',
    ],
    mvds: [{ def: 'id_proveedor ->> certificacion', show: 'id_proveedor ↠ certificacion' }],
    jds: [
      {
        def:
          'id_proveedor, nombre_proveedor, id_ciudad, nombre_ciudad, certificacion | id_proveedor, nombre_proveedor, id_ciudad, nombre_ciudad, id_pieza, nombre_pieza | id_pieza, nombre_pieza, id_proyecto | id_proveedor, nombre_proveedor, id_ciudad, nombre_ciudad, id_proyecto',
        show: '{id_proveedor, id_pieza} ⋈ {id_pieza, id_proyecto} ⋈ {id_proveedor, id_proyecto}',
      },
    ],
    rows: [
      ['V1', 'Acme', 'C1', 'Madrid', 'ISO 9001', 'P1', 'Tornillo', 'J2'],
      ['V1', 'Acme', 'C1', 'Madrid', 'ISO 14001', 'P1', 'Tornillo', 'J2'],
      ['V1', 'Acme', 'C1', 'Madrid', 'ISO 9001', 'P1', 'Tornillo', 'J3'],
      ['V1', 'Acme', 'C1', 'Madrid', 'ISO 14001', 'P1', 'Tornillo', 'J3'],
      ['V2', 'Beta', 'C1', 'Madrid', 'ISO 9001', 'P1', 'Tornillo', 'J3'],
      ['V2', 'Beta', 'C1', 'Madrid', 'ISO 9001', 'P2', 'Tuerca', 'J1'],
      ['V3', 'Gamma', 'C2', 'Bilbao', 'ISO 14001', 'P2', 'Tuerca', 'J2'],
    ],
    steps: [
      {
        nf: '2NF',
        solution: [
          { name: 'Proveedor', attrs: ['id_proveedor', 'nombre_proveedor', 'id_ciudad', 'nombre_ciudad'], pk: ['id_proveedor'] },
          { name: 'Pieza', attrs: ['id_pieza', 'nombre_pieza'], pk: ['id_pieza'] },
          { name: 'Suministro', attrs: ['id_proveedor', 'certificacion', 'id_pieza', 'id_proyecto'], pk: ['id_proveedor', 'certificacion', 'id_pieza', 'id_proyecto'] },
        ],
        hints: [
          'La clave son cuatro atributos: proveedor, certificación, pieza y proyecto. Busca los atributos que pueden conocerse solo con una parte de ella.',
          'Con id_proveedor conoces el nombre del proveedor y todo lo de su ciudad. Con id_pieza, el nombre de la pieza.',
          'Saca Proveedor (con todo lo del proveedor, de momento) y Pieza. Suministro conserva los cuatro atributos de la clave.',
        ],
        insight:
          'Cada dato descriptivo (nombre del proveedor, de la pieza, de la ciudad) se repetía en todas las filas de su proveedor o pieza. 2FN los envía a la entidad que describen. Suministro sigue siendo una tabla toda clave: por partes de la clave no queda nada que quitar.',
      },
      {
        nf: '3NF',
        solution: [
          { name: 'Proveedor', attrs: ['id_proveedor', 'nombre_proveedor', 'id_ciudad'], pk: ['id_proveedor'] },
          { name: 'Ciudad', attrs: ['id_ciudad', 'nombre_ciudad'], pk: ['id_ciudad'] },
          { name: 'Pieza', attrs: ['id_pieza', 'nombre_pieza'], pk: ['id_pieza'] },
          { name: 'Suministro', attrs: ['id_proveedor', 'certificacion', 'id_pieza', 'id_proyecto'], pk: ['id_proveedor', 'certificacion', 'id_pieza', 'id_proyecto'] },
        ],
        hints: [
          'Proveedor tiene clave simple, así que no hay dependencias parciales. Busca atributos que dependan de otro que no es clave.',
          'id_proveedor → id_ciudad → nombre_ciudad: el nombre de la ciudad depende de la ciudad, no del proveedor.',
          'Lleva nombre_ciudad a una tabla Ciudad (clave id_ciudad) y deja id_ciudad en Proveedor para enlazarlas.',
        ],
        insight:
          'Dos proveedores de Madrid repetían "Madrid". Rota la cadena proveedor → ciudad → nombre de la ciudad, cada nombre vive en una sola fila.',
      },
      {
        nf: '4NF',
        solution: [
          { name: 'Proveedor', attrs: ['id_proveedor', 'nombre_proveedor', 'id_ciudad'], pk: ['id_proveedor'] },
          { name: 'Ciudad', attrs: ['id_ciudad', 'nombre_ciudad'], pk: ['id_ciudad'] },
          { name: 'Pieza', attrs: ['id_pieza', 'nombre_pieza'], pk: ['id_pieza'] },
          { name: 'Certificación', attrs: ['id_proveedor', 'certificacion'], pk: ['id_proveedor', 'certificacion'] },
          { name: 'Suministro', attrs: ['id_proveedor', 'id_pieza', 'id_proyecto'], pk: ['id_proveedor', 'id_pieza', 'id_proyecto'] },
        ],
        hints: [
          'No quedan dependencias funcionales que romper. Fíjate en Suministro: ¿qué les pasa a sus filas cuando un proveedor obtiene una certificación nueva?',
          'Las certificaciones de un proveedor no dependen de lo que suministra: se combinan con todas sus filas pieza–proyecto. Eso es id_proveedor ↠ certificacion.',
          'Lleva (id_proveedor, certificacion) a su propia tabla, con los dos atributos como clave. Suministro conserva id_proveedor, id_pieza e id_proyecto.',
        ],
        insight:
          'Un proveedor con dos certificaciones repetía cada suministro dos veces. Las certificaciones son un hecho independiente de lo que suministra: cada hecho en su propia tabla.',
      },
      {
        nf: '5NF',
        solution: [
          { name: 'Proveedor', attrs: ['id_proveedor', 'nombre_proveedor', 'id_ciudad'], pk: ['id_proveedor'] },
          { name: 'Ciudad', attrs: ['id_ciudad', 'nombre_ciudad'], pk: ['id_ciudad'] },
          { name: 'Pieza', attrs: ['id_pieza', 'nombre_pieza'], pk: ['id_pieza'] },
          { name: 'Certificación', attrs: ['id_proveedor', 'certificacion'], pk: ['id_proveedor', 'certificacion'] },
          { name: 'ProveedorPieza', attrs: ['id_proveedor', 'id_pieza'], pk: ['id_proveedor', 'id_pieza'] },
          { name: 'PiezaProyecto', attrs: ['id_pieza', 'id_proyecto'], pk: ['id_pieza', 'id_proyecto'] },
          { name: 'ProveedorProyecto', attrs: ['id_proveedor', 'id_proyecto'], pk: ['id_proveedor', 'id_proyecto'] },
        ],
        hints: [
          'Suministro ya no tiene dependencias multivaluadas, pero cumple una regla más sutil: puede reconstruirse a partir de sus parejas de atributos.',
          'La regla del enunciado: si el proveedor suministra la pieza, la pieza se usa en el proyecto y el proveedor trabaja en él, entonces suministra esa pieza a ese proyecto. Con solo dos parejas aparecen filas inventadas.',
          'Sustituye Suministro por tres tablas: (id_proveedor, id_pieza), (id_pieza, id_proyecto) e (id_proveedor, id_proyecto), cada una con sus dos atributos como clave.',
        ],
        insight:
          'La tabla ternaria guardaba información que ya se deduce de tres hechos más simples. Siete tablas después, cada dato vive en un solo lugar y cada tabla dice una sola cosa. Recuerda la advertencia: 5FN solo es correcta si la regla se cumple siempre.',
      },
    ],
  },
];

DATA.es.ADV_OPTIONS = ['Cumple 3FN, pero no FNBC', 'Cumple FNBC, pero no 4FN', 'Cumple 4FN, pero no 5FN', 'Cumple 5FN'];

DATA.es.QUESTIONS = [
  {
    name: 'Estudiante',
    cols: ['id_estudiante', 'nombre', 'telefonos'],
    pk: ['id_estudiante'],
    rows: [
      ['A1', 'Ana', '611 111 111, 622 222 222'],
      ['A2', 'Luis', '633 333 333'],
    ],
    answer: 0,
    why: 'La columna telefonos contiene varios valores en una sola celda. Una celda, un valor: cada teléfono debería ir en su propia fila.',
  },
  {
    name: 'Matrícula',
    cols: ['id_estudiante', 'id_asignatura', 'nota', 'nombre_asignatura'],
    pk: ['id_estudiante', 'id_asignatura'],
    rows: [
      ['A1', 'BD', 8, 'Bases de datos'],
      ['A2', 'BD', 6, 'Bases de datos'],
      ['A1', 'RED', 7, 'Redes'],
    ],
    fds: ['id_estudiante, id_asignatura -> nota', 'id_asignatura -> nombre_asignatura'],
    answer: 1,
    why: 'nombre_asignatura depende solo de id_asignatura, que es parte de la clave. Es una dependencia parcial e incumple 2FN.',
  },
  {
    name: 'Libro',
    cols: ['id_libro', 'titulo', 'id_editorial', 'pais_editorial'],
    pk: ['id_libro'],
    rows: [
      ['L1', 'Don Quijote', 'E1', 'España'],
      ['L2', 'La Regenta', 'E1', 'España'],
      ['L3', 'Ficciones', 'E2', 'Argentina'],
    ],
    fds: ['id_libro -> titulo, id_editorial', 'id_editorial -> pais_editorial'],
    answer: 2,
    why: 'La clave es un solo atributo, así que se cumple 2FN. Pero id_libro → id_editorial → pais_editorial es una dependencia transitiva e incumple 3FN.',
  },
  {
    name: 'Cliente',
    cols: ['id_cliente', 'nombre', 'email'],
    pk: ['id_cliente'],
    rows: [
      ['C1', 'Ana', 'ana@mail.com'],
      ['C2', 'Luis', 'luis@mail.com'],
    ],
    fds: ['id_cliente -> nombre, email'],
    answer: 3,
    why: 'Todos los atributos dependen de la clave, de toda la clave y nada más que de la clave. No hay nada que corregir.',
  },
  {
    name: 'Pedido',
    cols: ['id_pedido', 'producto1', 'producto2', 'producto3'],
    pk: ['id_pedido'],
    rows: [
      [1, 'Teclado', 'Ratón', ''],
      [2, 'Monitor', '', ''],
      [3, 'Teclado', 'Monitor', 'Ratón'],
    ],
    answer: 0,
    why: 'producto1, producto2 y producto3 son un grupo repetitivo: incumple 1FN. No hay un número fijo de productos por pedido; deberían ser filas, no columnas.',
  },
  {
    name: 'LíneaPedido',
    cols: ['id_pedido', 'id_producto', 'cantidad', 'precio_venta'],
    pk: ['id_pedido', 'id_producto'],
    rows: [
      [1, 'P1', 2, 28],
      [2, 'P1', 1, 30],
      [2, 'P2', 1, 15],
    ],
    fds: ['id_pedido, id_producto -> cantidad, precio_venta'],
    note: 'precio_venta es el precio aplicado en esa línea, y puede cambiar de un pedido a otro.',
    answer: 3,
    why: 'precio_venta describe esa línea concreta (P1 vendido a 28 y a 30), así que depende de toda la clave. No hay dependencias parciales ni transitivas.',
  },
  {
    name: 'Horario',
    cols: ['id_aula', 'hora', 'asignatura', 'capacidad'],
    pk: ['id_aula', 'hora'],
    rows: [
      ['A1', '09:00', 'Bases de datos', 40],
      ['A1', '11:00', 'Programación', 40],
      ['A2', '09:00', 'Redes', 25],
    ],
    fds: ['id_aula, hora -> asignatura', 'id_aula -> capacidad'],
    answer: 1,
    why: 'capacidad depende solo de id_aula, parte de la clave. Es una dependencia parcial e incumple 2FN.',
  },
  {
    name: 'Vehículo',
    cols: ['matricula', 'marca', 'modelo', 'potencia'],
    pk: ['matricula'],
    rows: [
      ['1234 ABC', 'Seat', 'Ibiza', 95],
      ['5678 DEF', 'Seat', 'Ibiza', 95],
      ['9012 GHI', 'Ford', 'Focus', 125],
    ],
    fds: ['matricula -> marca, modelo, potencia', 'modelo -> potencia'],
    answer: 2,
    why: 'matricula → modelo → potencia es una dependencia transitiva: potencia depende de modelo, que no es clave. Incumple 3FN.',
  },
  {
    name: 'Participación',
    cols: ['id_estudiante', 'id_proyecto', 'rol', 'horas'],
    pk: ['id_estudiante', 'id_proyecto'],
    rows: [
      ['A1', 'PR1', 'Líder', 40],
      ['A2', 'PR1', 'Analista', 25],
      ['A1', 'PR2', 'Analista', 30],
    ],
    fds: ['id_estudiante, id_proyecto -> rol, horas'],
    answer: 3,
    why: 'rol y horas describen la participación de un estudiante en un proyecto: dependen de toda la clave y de nada más.',
  },
  {
    name: 'Expediente',
    cols: ['id_estudiante', 'id_asignatura', 'nota', 'resultado'],
    pk: ['id_estudiante', 'id_asignatura'],
    rows: [
      ['A1', 'BD', 8, 'Aprobado'],
      ['A2', 'BD', 4, 'Suspenso'],
      ['A1', 'RED', 6, 'Aprobado'],
    ],
    fds: ['id_estudiante, id_asignatura -> nota', 'nota -> resultado'],
    note: 'resultado es Aprobado si la nota es 5 o más, y Suspenso si es menor.',
    answer: 2,
    why: 'Ningún atributo depende de una parte de la clave, así que se cumple 2FN. Pero resultado depende de nota, que no es clave: es una dependencia transitiva e incumple 3FN.',
  },

  /* ---- Avanzadas: FNBC, 4FN y 5FN --------------------------------------- */
  {
    adv: true,
    name: 'Cita',
    cols: ['id_paciente', 'especialidad', 'id_medico'],
    pk: ['id_paciente', 'especialidad'],
    rows: [
      ['P1', 'Cardiología', 'M1'],
      ['P2', 'Cardiología', 'M1'],
      ['P1', 'Dermatología', 'M2'],
      ['P3', 'Cardiología', 'M3'],
    ],
    fds: ['id_paciente, especialidad -> id_medico', 'id_medico -> especialidad'],
    answer: 0,
    why: 'id_medico → especialidad, pero id_medico no es clave de la tabla. Como especialidad forma parte de una clave, 3FN lo tolera; FNBC no: todo determinante debe ser clave.',
  },
  {
    adv: true,
    name: 'Equipo',
    cols: ['id_proyecto', 'id_empleado', 'lenguaje'],
    pk: ['id_proyecto', 'id_empleado', 'lenguaje'],
    rows: [
      ['PR1', 'E1', 'Java'],
      ['PR1', 'E1', 'SQL'],
      ['PR1', 'E2', 'Java'],
      ['PR1', 'E2', 'SQL'],
      ['PR2', 'E1', 'Python'],
    ],
    fds: [],
    mvds: ['id_proyecto ->> id_empleado'],
    note: 'Los lenguajes de un proyecto no dependen de qué empleados trabajan en él, ni al revés: se dan todas las combinaciones.',
    answer: 1,
    why: 'No hay dependencias funcionales, así que cumple FNBC. Pero id_proyecto ↠ id_empleado | lenguaje: los empleados y los lenguajes de un proyecto son hechos independientes que se multiplican en la misma tabla. Incumple 4FN.',
  },
  {
    adv: true,
    name: 'Venta',
    cols: ['vendedor', 'producto', 'cliente'],
    pk: ['vendedor', 'producto', 'cliente'],
    rows: [
      ['Ana', 'Seguro', 'Textil S.A.'],
      ['Ana', 'Fondo', 'Gráficas Sur'],
      ['Bruno', 'Seguro', 'Textil S.A.'],
      ['Bruno', 'Hipoteca', 'Textil S.A.'],
      ['Carla', 'Hipoteca', 'Gráficas Sur'],
    ],
    fds: [],
    jds: ['vendedor, producto | producto, cliente | vendedor, cliente'],
    note: 'Regla: si un vendedor vende un producto, un cliente compra ese producto y el vendedor atiende a ese cliente, entonces el vendedor vende ese producto a ese cliente.',
    answer: 2,
    why: 'No hay dependencias funcionales ni multivaluadas: cumple 4FN. Pero la regla permite reconstruir la tabla reuniendo sus tres parejas (vendedor–producto, producto–cliente y vendedor–cliente): es una dependencia de reunión e incumple 5FN.',
  },
  {
    adv: true,
    name: 'Matrícula',
    cols: ['id_estudiante', 'id_asignatura', 'nota'],
    pk: ['id_estudiante', 'id_asignatura'],
    rows: [
      ['A1', 'BD', 8],
      ['A2', 'BD', 6],
      ['A1', 'RED', 7],
    ],
    fds: ['id_estudiante, id_asignatura -> nota'],
    answer: 3,
    why: 'La única dependencia parte de toda la clave, y no hay hechos independientes ni reglas que permitan reconstruir la tabla a partir de otras más pequeñas. Cumple 5FN.',
  },
  {
    adv: true,
    name: 'Contacto',
    cols: ['id_persona', 'telefono', 'email'],
    pk: ['id_persona', 'telefono', 'email'],
    rows: [
      ['P1', '611 111 111', 'ana@casa.com'],
      ['P1', '611 111 111', 'ana@trabajo.com'],
      ['P1', '622 222 222', 'ana@casa.com'],
      ['P1', '622 222 222', 'ana@trabajo.com'],
      ['P2', '633 333 333', 'luis@casa.com'],
    ],
    fds: [],
    mvds: ['id_persona ->> telefono'],
    note: 'Los teléfonos de una persona no tienen relación con sus direcciones de correo.',
    answer: 1,
    why: 'Sin dependencias funcionales, cumple FNBC. Pero id_persona ↠ telefono | email: dos hechos independientes en la misma tabla, y P1 ocupa 4 filas para 2 teléfonos y 2 correos. Incumple 4FN.',
  },
  {
    adv: true,
    name: 'Sigue',
    cols: ['id_usuario', 'id_canal'],
    pk: ['id_usuario', 'id_canal'],
    rows: [
      ['U1', 'C1'],
      ['U1', 'C2'],
      ['U2', 'C1'],
      ['U3', 'C3'],
    ],
    fds: [],
    answer: 3,
    why: 'Una tabla de dos columnas que forman toda la clave no puede descomponerse sin perder información: no tiene hechos independientes ni reglas de reunión. Cumple 5FN.',
  },
];
