'use strict';
/* Una consulta por un millón (#/game): todos los textos del concurso. Mismas claves que data/en/game.js
   (contrato: docs/game-quiz.md §6). El SQL, las soluciones y los datos están en data/game-bank.js.
   Los campos md solo usan **negrita** y `código`; los párrafos se separan con una línea en blanco (\n\n). Los
   nombres del esquema, el SQL y los valores ('Puzzle', 'Spain') quedan en inglés. js/game.js rellena {prize}.
   Lo comprueba tools/check-game-text.mjs. */
(() => {
  DATA.es.GAME_TEXT = {
    title: 'Una consulta por un millón',
    tagline: '15 preguntas, una base de datos y un millón en juego.',
    intro: 'SQL-Bot te hace **15 preguntas** sobre la base de datos de una tienda de videojuegos: `customers`, `games` y `sales`. Respondes cada una con un `SELECT` de Oracle, y cada acierto te sube un peldaño hacia el millón de euros.\n\n'
      + '**Ejecutar** es gratis: prueba tu consulta tantas veces como quieras. **Fijar respuesta** es tu respuesta y cuenta: un fallo termina la partida, salvo que te salve la Revisión. Los peldaños 5 y 10 son seguros, y puedes plantarte cuando quieras.',

    host: {
      welcome: '¡Bienvenido! Quince preguntas hasta el millón. ¡A jugar!',
      ask: ['Aquí tienes tu pregunta.', 'Léela dos veces y consulta una.', 'La base de datos te escucha.', 'La siguiente. Sin prisa.', '¿Qué haces con esta?'],
      lock: '¿La fijamos?',
      suspense: 'Veamos qué dice la base de datos…',
      correct: ['¡Correcto! Las filas coinciden.', '¡Exacto! Subes un peldaño.', '¡La base de datos te da la razón!', '¡Perfecto! Al siguiente peldaño.'],
      wrong: 'Vaya… ese no es el resultado.',
      rescue: '¡Espera! La revisión aún puede salvarte. ¿Lo intentas otra vez?',
      safe: '¡Peldaño seguro! {prize} ya es tuyo.',
      walk: 'Sabia decisión. Te vas con {prize}.',
      win: '¡Un millón de euros! ¡Menuda consulta!',
      bands: {
        easy: 'Nivel fácil: una tabla cada vez.',
        medium: 'Nivel medio: contar y agrupar.',
        hard: 'Nivel difícil: ¡a unir tablas!',
      },
      // Lo dice al empezar una partida de ese modo.
      modes: {
        select: 'Esta noche preguntas a la tienda y lees sus respuestas.',
        insert: 'Esta noche añades filas. ¡Cada valor cuenta!',
        update: 'Esta noche cambias filas. ¡Ojo con el WHERE!',
        delete: 'Esta noche borras filas. ¡Cuidado, aquí no hay vuelta atrás!',
        ddl: 'Esta noche construyes tablas, vistas e índices.',
        mixed: 'Fase mixta: todo tipo de SQL en una sola partida.',
      },
    },

    bands: { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' },

    // Las fichas de la pantalla de fases: nombre, palabra clave de la ficha y descripción emergente (≤ 12 palabras).
    // welcome repite host.modes.<modo> (js/game.js lee cualquiera de los dos).
    modes: {
      select: { name: 'Consultar', keyword: 'SELECT', blurb: 'Lee la tienda: filtra, ordena, cuenta, agrupa y une.', welcome: 'Esta noche preguntas a la tienda y lees sus respuestas.' },
      insert: { name: 'Insertar', keyword: 'INSERT', blurb: 'Añade clientes, juegos y ventas, de una fila o de varias.', welcome: 'Esta noche añades filas. ¡Cada valor cuenta!' },
      update: { name: 'Modificar', keyword: 'UPDATE', blurb: 'Cambia precios, stock y niveles con SET y WHERE.', welcome: 'Esta noche cambias filas. ¡Ojo con el WHERE!' },
      delete: { name: 'Borrar', keyword: 'DELETE', blurb: 'Borra justo las filas correctas, si las claves ajenas lo permiten.', welcome: 'Esta noche borras filas. ¡Cuidado, aquí no hay vuelta atrás!' },
      ddl: { name: 'Estructura', keyword: 'CREATE', blurb: 'Crea tablas, columnas, vistas e índices.', welcome: 'Esta noche construyes tablas, vistas e índices.' },
      mixed: { name: 'Mixto', keyword: 'MIX', blurb: 'Los cinco tipos juntos. Se abre con el peldaño 5 en todas.', welcome: 'Fase mixta: todo tipo de SQL en una sola partida.' },
    },
    stage: { title: 'Elige tu fase', locked: 'Llega al peldaño 5 en todas las fases para desbloquearla.' },

    lifelines: {
      clause: { name: 'Cláusula clave', blurb: 'SQL-Bot te dice qué cláusula necesita la respuesta y la forma del resultado.' },
      template: { name: 'Plantilla', blurb: 'Una consulta con la misma forma sobre otros datos, lista para insertar y adaptar.' },
      review: { name: 'Revisión', blurb: 'Analiza tu última consulta y te dice qué falla. Mientras no la uses, te perdona un fallo al fijar.' },
    },

    questions: {
      /* ───── Fácil ───── */
      r01a: {
        prompt: 'Lista los juegos del género `\'Puzzle\'`: muestra `title` y `price`.',
        clause: 'Filtra las filas con **WHERE** sobre la columna `genre`.',
        templateNote: 'Clientes de Italia: el mismo tipo de filtro sobre otra tabla.',
        explain: '**WHERE** deja solo las filas que cumplen la condición. Los textos van entre comillas simples y Oracle distingue mayúsculas: `\'puzzle\'` no encuentra nada.',
      },
      r01b: {
        prompt: 'Muestra los clientes de `\'Mexico\'`: su `name` y su `signup_date`.',
        clause: 'Un **WHERE** sobre `country` deja un solo país.',
        templateNote: 'Los juegos de carreras y su stock: un filtro sobre `games`.',
        explain: '`WHERE country = \'Mexico\'` deja tres clientes. El valor debe coincidir exactamente, mayúsculas incluidas: `\'MEXICO\'` no devuelve filas.',
      },
      r01c: {
        prompt: '¿Qué juegos se están agotando? Muestra `title` y `stock` de los juegos con menos de 5 unidades en stock.',
        clause: 'Usa **WHERE** con una comparación sobre `stock`.',
        templateNote: 'Clientes con un nivel VIP inferior a 1.',
        explain: 'Menos de 5 es `stock < 5`. Con `<= 5` se colaría un juego que tiene justo 5 unidades.',
      },
      r02a: {
        prompt: 'Muestra `title` y `price` de los juegos `\'Racing\'`, del más caro al más barato.',
        clause: 'Filtra con **WHERE** y ordena con **ORDER BY** `price` **DESC**.',
        templateNote: 'Clientes de Francia, del alta más reciente a la más antigua.',
        explain: '**ORDER BY** ordena el resultado y **DESC** pone primero el valor más alto. Sin **DESC** el orden es ascendente: primero el más barato.',
      },
      r02b: {
        prompt: 'Lista los clientes de `\'Spain\'` con su `name` y su `signup_date`, del alta más antigua a la más reciente.',
        clause: '**WHERE** para el país y **ORDER BY** `signup_date` (es ascendente por defecto).',
        templateNote: 'Juegos de puzles, del más barato al más caro.',
        explain: 'Las fechas se ordenan como números: la más antigua es la menor. **ORDER BY** es ascendente salvo que escribas **DESC**.',
      },
      r02c: {
        prompt: 'Muestra `name` y `country` de los clientes con nivel VIP 3 (`vip_level`), por orden alfabético de `name`.',
        clause: '**WHERE** sobre `vip_level` y después **ORDER BY** `name`.',
        templateNote: 'Juegos agotados, ordenados por título.',
        explain: '**ORDER BY** `name` ordena el texto de la A a la Z. Sin él, las filas salen en el orden en que la base de datos las encuentra, a menudo por id.',
      },
      r03a: {
        prompt: 'Busca los juegos cuyo `title` empieza por `Sky`. Muestra `title` y `price`.',
        clause: 'Usa **LIKE** con el comodín `%`.',
        templateNote: 'Clientes cuyo nombre empieza por M.',
        explain: '`LIKE \'Sky%\'` significa que empieza por Sky: `%` vale por cualquier texto. Con `\'%Sky%\'` saldría también Blue Sky Derby, que solo lo contiene.',
      },
      r03b: {
        prompt: 'Muestra `title` y `price` de los juegos que cuestan de `19.99` a `29.99`, ambos precios incluidos.',
        clause: '**BETWEEN** incluye los dos extremos del intervalo.',
        templateNote: 'Clientes que se dieron de alta en el primer semestre de 2024.',
        explain: '`price BETWEEN 19.99 AND 29.99` equivale a `price >= 19.99 AND price <= 29.99`. Con `>` y `<` se pierden los juegos que cuestan justo 19.99 o 29.99.',
      },
      r03c: {
        prompt: 'Lista los clientes de `\'Argentina\'`, `\'Chile\'` o `\'Uruguay\'`: muestra `name` y `country`.',
        clause: '**IN** compara un valor con una lista.',
        templateNote: 'Juegos de deportes y de estrategia: **IN** con dos géneros.',
        explain: '`country IN (\'Argentina\', \'Chile\', \'Uruguay\')` es una forma corta de escribir tres condiciones unidas con **OR**.',
      },
      r04a: {
        prompt: 'Algunos juegos aún no tienen valoración. Muestra `title` y `genre` de los juegos sin `rating`.',
        clause: 'Los valores que faltan son **NULL**: se comprueban con **IS NULL**.',
        templateNote: 'Juegos con valoración que cuestan más de 50.',
        explain: '**NULL** no es un valor, así que `rating = NULL` nunca es cierto y no devuelve nada. Solo **IS NULL** encuentra las valoraciones que faltan.',
      },
      r04b: {
        prompt: '¿De qué países hay clientes con nivel VIP 2 o más (`vip_level`)? Muestra cada `country` una sola vez.',
        clause: '**DISTINCT** elimina las filas repetidas.',
        templateNote: 'Los géneros con algún juego agotado, cada uno una vez.',
        explain: 'España tiene dos clientes así, de modo que sin **DISTINCT** saldría dos veces. «2 o más» es `>= 2`.',
      },
      r04c: {
        prompt: '¿Qué géneros tienen al menos un juego que cueste menos de 10? Muestra cada `genre` una sola vez.',
        clause: '**DISTINCT** justo después de **SELECT** muestra cada género una vez.',
        templateNote: 'Los países con clientes de nivel VIP 0, cada uno una vez.',
        explain: 'Hay cuatro juegos por debajo de 10, pero son solo de dos géneros. **DISTINCT** junta las repeticiones en una fila.',
      },
      r05a: {
        prompt: 'Muestra `title` y `price` de los 3 juegos más caros que tienen stock (`stock` mayor que 0), del más caro al más barato.',
        clause: 'Ordena con **ORDER BY** … **DESC** y quédate con 3 filas con **FETCH FIRST**.',
        templateNote: 'Las dos altas más antiguas entre los clientes VIP.',
        explain: 'Primero filtras, luego ordenas y al final cortas: `FETCH FIRST 3 ROWS ONLY` deja los 3 primeros. Embers of Valdren cuesta más, pero no tiene stock.',
      },
      r05b: {
        prompt: 'Muestra `name` y `signup_date` de las 3 altas más recientes con nivel VIP 1 o más (`vip_level`), de la más reciente a la más antigua.',
        clause: '**ORDER BY** `signup_date` **DESC** y **FETCH FIRST** 3 filas.',
        templateNote: 'Los dos juegos de acción con más stock.',
        explain: 'Lo más reciente primero es **DESC** sobre la fecha. Oracle no tiene **LIMIT**: el corte lo hace `FETCH FIRST 3 ROWS ONLY`.',
      },
      r05c: {
        prompt: 'Muestra `title`, `genre` y `price` de los 3 juegos más baratos de los géneros `\'Action\'` o `\'Adventure\'`, del más barato al más caro.',
        clause: '**IN** para los dos géneros, **ORDER BY** `price` y **FETCH FIRST** 3 filas.',
        templateNote: 'Las dos primeras altas de Italia o Alemania.',
        explain: '**IN** deja los dos géneros, el orden ascendente pone arriba el más barato y **FETCH FIRST** se queda con 3.',
      },

      /* ───── Medio ───── */
      r06a: {
        prompt: '¿Cuántos juegos del género `\'RPG\'` tiene la tienda en su catálogo? Devuelve un solo número.',
        clause: '`COUNT(*)` cuenta filas.',
        templateNote: 'Cuántos clientes son de Francia.',
        explain: '`COUNT(*)` cuenta todas las filas que pasan el **WHERE**. `COUNT(rating)` se saltaría el RPG sin valoración y diría 3.',
      },
      r06b: {
        prompt: '¿Cuál es el `price` medio de todos los juegos, redondeado a 2 decimales? Devuelve un solo número.',
        clause: '**AVG** calcula la media y `ROUND(x, 2)` deja 2 decimales.',
        templateNote: 'El importe medio pagado por venta, redondeado.',
        explain: '`ROUND(AVG(price), 2)` da 32.14. Sin **ROUND** sale 32.1358…, y `ROUND(x)` sin segundo argumento redondea a un número entero.',
      },
      r06c: {
        prompt: '¿Cuáles son el `price` más bajo y el más alto de los juegos `\'Adventure\'`? Devuelve dos columnas: primero el más bajo y luego el más alto.',
        clause: '**MIN** y **MAX**, con un **WHERE** sobre el género.',
        templateNote: 'La primera y la última fecha de alta de los clientes de España.',
        explain: 'Un agregado sin **GROUP BY** devuelve una sola fila para toda la tabla filtrada. El orden de las columnas importa: primero **MIN**.',
      },
      r07a: {
        prompt: '¿Cuántos juegos tienen valoración? Devuelve un solo número.',
        clause: '`COUNT(columna)` se salta los valores **NULL**.',
        templateNote: 'Cuántos juegos de puzles tienen valoración.',
        explain: '`COUNT(rating)` cuenta solo las filas en las que `rating` no es **NULL**: 20 de 24. `COUNT(*)` las cuenta todas.',
      },
      r07b: {
        prompt: 'En 2025, ¿cuántas unidades se vendieron en total (`quantity`) y cuánto dinero entró (`total_paid`)? Devuelve los dos números en ese orden; redondea el dinero a 2 decimales.',
        clause: '**SUM** de las dos columnas, y 2025 con `EXTRACT(YEAR FROM sale_date)`.',
        templateNote: 'Unidades y dinero de las ventas del juego 10.',
        explain: 'Las unidades son `SUM(quantity)`, no `COUNT(*)`: una venta puede llevar varias copias. `EXTRACT(YEAR FROM sale_date) = 2025` selecciona el año.',
      },
      r07c: {
        prompt: '¿Cuántos clientes distintos han comprado al menos una vez? Devuelve un solo número.',
        clause: 'Cuenta los `customer_id` distintos de `sales` con `COUNT(DISTINCT …)`.',
        templateNote: 'Cuántos géneros tienen algún juego de más de 40.',
        explain: '`COUNT(DISTINCT customer_id)` cuenta cada comprador una vez: 17. `COUNT(customer_id)` cuenta las 53 ventas.',
      },
      r08a: {
        prompt: '¿Cuántos juegos tiene cada género? Muestra `genre` y el número de juegos.',
        clause: '**GROUP BY** `genre` con `COUNT(*)`.',
        templateNote: 'Cuántos clientes tiene cada país.',
        explain: '**GROUP BY** crea una fila por género, y `COUNT(*)` cuenta los juegos de cada grupo.',
      },
      r08b: {
        prompt: '¿Cuántos clientes hay en cada nivel VIP? Muestra `vip_level` y el número de clientes.',
        clause: '**GROUP BY** `vip_level` y cuenta.',
        templateNote: 'Cuántas ventas tiene cada juego.',
        explain: 'Un grupo por cada valor de `vip_level`, del 0 al 3, cada uno con su `COUNT(*)`.',
      },
      r08c: {
        prompt: '¿Cuántas unidades hay en stock de cada género? Muestra `genre` y el total de `stock`.',
        clause: '**GROUP BY** `genre` con la **SUM** de `stock`.',
        templateNote: 'Las unidades que ha comprado cada cliente.',
        explain: '**SUM** suma el stock de los juegos de cada grupo. `COUNT(stock)` contaría juegos, no unidades.',
      },
      r09a: {
        prompt: '¿Qué géneros tienen más de 3 juegos? Muestra `genre` y el número de juegos.',
        clause: 'Filtra los grupos con **HAVING**, no con **WHERE**.',
        templateNote: 'Países con más de 2 clientes.',
        explain: '**WHERE** filtra filas antes de agrupar; **HAVING** filtra grupos después. «Más de 3» es `> 3`: Racing, con 3 justos, se queda fuera.',
      },
      r09b: {
        prompt: '¿Qué clientes han hecho al menos 4 compras? Muestra `customer_id` y su número de compras (filas de `sales`).',
        clause: '**GROUP BY** `customer_id` y **HAVING** sobre el recuento; «al menos» es `>=`.',
        templateNote: 'Juegos vendidos al menos 3 veces.',
        explain: '«Al menos 4» incluye el 4, así que es `>= 4`. Con `> 4` desaparecerían los clientes 2 y 10, que tienen 4 justas.',
      },
      r09c: {
        prompt: '¿Qué géneros tienen un `price` medio superior a 30? Muestra `genre` y esa media redondeada a 2 decimales.',
        clause: 'La condición es sobre una media, así que va en **HAVING**.',
        templateNote: 'Países cuyo nivel VIP medio supera 1.',
        explain: '`WHERE price > 30` quitaría los juegos baratos antes de calcular la media, y la cambiaría. `HAVING AVG(price) > 30` juzga cada género completo.',
      },
      r10a: {
        prompt: '¿Qué 3 juegos vendieron más unidades? Muestra `game_id` y el total de `quantity` vendida, de mayor a menor.',
        clause: '**GROUP BY** `game_id`, **ORDER BY** la **SUM** descendente y **FETCH FIRST** 3 filas.',
        templateNote: 'El país con más clientes.',
        explain: 'Las unidades son `SUM(quantity)`. Puedes ordenar por un agregado, `ORDER BY SUM(quantity) DESC`, y después cortar con **FETCH FIRST**.',
      },
      r10b: {
        prompt: 'Para cada año de ventas, muestra el año, el número de ventas y los ingresos (`total_paid`) redondeados a 2 decimales, por orden de año.',
        clause: 'Agrupa por `EXTRACT(YEAR FROM sale_date)` y ordena por la misma expresión.',
        templateNote: 'Altas de clientes por año.',
        explain: 'Puedes agrupar por una expresión: `EXTRACT(YEAR FROM sale_date)` da un grupo por año. Repite la misma expresión en **SELECT**, **GROUP BY** y **ORDER BY**.',
      },
      r10c: {
        prompt: '¿Qué clientes han gastado más de 120 en total? Muestra `customer_id` y su total de `total_paid` redondeado a 2 decimales, de mayor a menor gasto.',
        clause: '**HAVING** sobre `SUM(total_paid)` y después **ORDER BY** esa suma **DESC**.',
        templateNote: 'Géneros con más de 50 unidades en stock, de más a menos.',
        explain: 'El 120 se aplica a la suma de cada cliente, así que va en **HAVING**. `WHERE total_paid > 120` dejaría solo las ventas sueltas de más de 120.',
      },

      /* ───── Difícil ───── */
      r11a: {
        prompt: 'Para cada venta de 2 o más copias (`quantity`), muestra `sale_date`, el `title` del juego y `quantity`.',
        clause: '**JOIN** de `sales` con `games` por `game_id`.',
        templateNote: 'Ventas de más de 100 con el nombre del cliente.',
        explain: '`sales` solo guarda el `game_id`; el **JOIN** por `game_id` trae el `title` desde `games`. «2 o más» es `>= 2`.',
      },
      r11b: {
        prompt: 'Lista todas las compras de los clientes de `\'Portugal\'`: el `name` del cliente y la `sale_date`.',
        clause: '**JOIN** de `customers` y `sales` por `customer_id`.',
        templateNote: 'Ventas de juegos de estrategia con sus fechas.',
        explain: 'Un **JOIN** interno deja solo los clientes con ventas. Un **LEFT JOIN** añadiría a Nuno Barros, que nunca compró, con la fecha vacía.',
      },
      r11c: {
        prompt: '¿Qué juegos distintos ha comprado el cliente 7? Muestra cada `title` una sola vez.',
        clause: '**JOIN** de `games` y `sales`, y **DISTINCT**.',
        templateNote: 'Los países de los clientes que compraron el juego 10.',
        explain: 'El cliente 7 compró Tile Tide dos veces. El **JOIN** devuelve una fila por venta, así que hace falta **DISTINCT** para ver cada título una vez.',
      },
      r12a: {
        prompt: '¿Qué clientes no han comprado nunca nada? Muestra `name` y `country`.',
        clause: 'Un **LEFT JOIN** de `customers` a `sales`, con las filas cuya venta **IS NULL**.',
        templateNote: 'Juegos RPG con sus ventas; un juego sin vender muestra `sale_id` vacío.',
        explain: 'Un **LEFT JOIN** conserva todos los clientes; los que no tienen ventas reciben **NULL** en las columnas de `sales`. `WHERE s.sale_id IS NULL` deja justo esos.',
      },
      r12b: {
        prompt: '¿Qué juegos no se han vendido nunca? Muestra `title` y `stock`.',
        clause: '**NOT IN** con una subconsulta sobre `sales`.',
        templateNote: 'Clientes que nunca compraron el juego 10.',
        explain: 'La subconsulta lista cada `game_id` que aparece en `sales`; **NOT IN** deja los juegos que no están en esa lista.',
      },
      r12c: {
        prompt: '¿Qué clientes no compraron nada durante 2024? Incluye a los que no han comprado nunca. Muestra `name` y `country`.',
        clause: '**NOT EXISTS** con una subconsulta que busca una venta de 2024 del mismo cliente.',
        templateNote: 'Juegos que nunca se vendieron de dos en dos o más.',
        explain: 'La subconsulta está correlacionada: se ejecuta para cada cliente `c`. **NOT EXISTS** deja los clientes para los que no encuentra ninguna venta de 2024.',
      },
      r13a: {
        prompt: '¿Qué juegos `\'RPG\'` cuestan más que el `price` medio de todos los juegos? Muestra `title` y `price`.',
        clause: 'Compara `price` con una subconsulta que calcula el **AVG** de todos los juegos.',
        templateNote: 'Clientes de España que se dieron de alta después del primer cliente de México.',
        explain: 'Un agregado no puede ir directamente en **WHERE**: `price > AVG(price)` falla. Una subconsulta escalar calcula antes la media (32.14).',
      },
      r13b: {
        prompt: '¿Qué juegos han comprado los clientes de `\'France\'`? Muestra cada `title` una sola vez.',
        clause: 'Anida dos subconsultas **IN**: clientes → ventas → juegos.',
        templateNote: 'Clientes que compraron un juego de carreras.',
        explain: 'Cada subconsulta **IN** devuelve una lista de ids. A diferencia de un **JOIN**, **IN** nunca repite un juego, aunque lo compraran dos clientes franceses.',
      },
      r13c: {
        prompt: '¿Qué ventas de 2025 pagaron más que la mayor venta individual de 2024? Muestra `sale_id` y `total_paid`.',
        clause: 'Una subconsulta calcula el **MAX** de `total_paid` en 2024.',
        templateNote: 'Juegos de carreras más caros que cualquier juego de puzles.',
        explain: 'La subconsulta devuelve un solo número, el récord de 2024 (69.99). La consulta exterior deja las ventas de 2025 que lo superan, con `EXTRACT(YEAR FROM sale_date)` en las dos.',
      },
      r14a: {
        prompt: '¿Cuántas compras ha hecho cada cliente de `\'Spain\'`? Muestra `name` y el número de compras, incluidos los clientes con 0.',
        clause: '**LEFT JOIN** a `sales`, **GROUP BY** por cliente y cuenta `s.sale_id`.',
        templateNote: 'Ventas de cada juego de deportes, incluido uno que no tiene ninguna.',
        explain: 'El **LEFT JOIN** conserva a Elena Paredes, que nunca compró. `COUNT(s.sale_id)` le da 0; `COUNT(*)` contaría su fila y diría 1.',
      },
      r14b: {
        prompt: '¿Cuánto ha ingresado (`total_paid`) cada género? Muestra `genre` y los ingresos redondeados a 2 decimales, de mayor a menor.',
        clause: '**JOIN** de `games` y `sales`, **GROUP BY** `genre` y **ORDER BY** la suma.',
        templateNote: 'Unidades compradas por país, de más a menos.',
        explain: 'El género está en `games` y el dinero en `sales`: primero unes y después agrupas. `SUM(price)` ignoraría cantidades y descuentos.',
      },
      r14c: {
        prompt: 'Para cada género, muestra su juego más caro: `genre`, `title` y `price`, ordenados por `genre` con un `ORDER BY` simple (Oracle pone `\'RPG\'` antes que `\'Racing\'`).',
        clause: 'Una subconsulta correlacionada busca el **MAX** del precio en el mismo género.',
        templateNote: 'El primer cliente que se dio de alta en cada país.',
        explain: 'Para cada juego, la subconsulta calcula el precio máximo de su propio género. `SELECT genre, title, MAX(price) … GROUP BY genre` falla en Oracle: `title` no está agrupado.',
      },
      r15a: {
        prompt: '¿Qué clientes gastaron más que el cliente medio? Calcula el total de `total_paid` de cada comprador y compáralo con la media de esos totales. Muestra `name` y el total redondeado a 2 decimales.',
        clause: '**GROUP BY** por cliente y **HAVING** contra una subconsulta que promedia los totales.',
        templateNote: 'Géneros cuyo stock total supera el stock medio de un juego.',
        explain: 'La media de los totales por cliente (103.56) no es la venta media (33.22). La subconsulta agrupa primero por cliente y después **AVG** promedia esas sumas.',
      },
      r15b: {
        prompt: '¿Qué juegos compró el cliente que más ha gastado, es decir, el de mayor total de `total_paid`? Muestra cada `title`.',
        clause: 'Una subconsulta con **GROUP BY**, **ORDER BY** la suma y **FETCH FIRST** 1 fila encuentra al cliente.',
        templateNote: 'Los clientes que compraron el juego más vendido.',
        explain: 'La subconsulta agrupa `sales` por cliente, ordena por `SUM(total_paid)` y se queda con 1 fila: el cliente 2. El **JOIN** exterior lista sus juegos.',
      },
      r15c: {
        prompt: '¿En qué países gastaron los clientes, en total, más que todos los clientes de `\'Spain\'` juntos? Muestra `country` y su total de `total_paid` redondeado a 2 decimales.',
        clause: '**GROUP BY** `country` y **HAVING** contra una subconsulta con el total de España.',
        templateNote: 'Géneros que vendieron más unidades que todos los juegos de carreras juntos.',
        explain: 'Los clientes de España gastaron 252.92 entre todos. La subconsulta calcula ese número, y **HAVING** compara con él la suma de cada país.',
      },
    },

    end: {
      won: '¡Has ganado el millón!',
      lost: 'Fin de la partida',
      walked: 'Te has plantado',
      best: 'Mejor marca',
      review: 'Tus respuestas',
      again: 'Jugar otra vez',
    },
  };
})();
