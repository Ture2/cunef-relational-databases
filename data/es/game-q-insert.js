'use strict';
/* Una consulta por un millón, modo INSERT: textos de data/game-bank-insert.js, añadidos a GAME_TEXT.questions.
   Mismos campos y reglas md que data/es/game.js (§6). Los valores ('Spain'), los nombres del esquema y las fechas
   (`2025-09-01`) quedan como en SQL. Cada enunciado fija todos los valores, así que solo un estado final es el
   correcto. Mismos ids que data/en/game-q-insert.js. Lo comprueba tools/check-game-text.mjs. */
(() => {
  Object.assign(DATA.es.GAME_TEXT.questions, {
    ins01a: {
      prompt: 'Se da de alta un cliente nuevo: id 101, `name` `\'Nora Lindqvist\'`, `country` `\'Sweden\'`, `signup_date` `2025-09-01` y `vip_level` 0. Añádelo a `customers`.',
      clause: '**INSERT INTO** `customers` con una lista **VALUES** en el orden de las columnas.',
      templateNote: 'Añade un juego nuevo a `games`, nombrando todas las columnas.',
      explain: 'Nombra las columnas y da un valor por columna, en el mismo orden. Una fecha se escribe `DATE \'2025-09-01\'`.',
    },
    ins01b: {
      prompt: 'Añade el juego 101 a `games`: `title` `\'Lumen Drift\'`, `genre` `\'Racing\'`, `price` 24.99, `stock` 30 y `rating` 7.5.',
      clause: '**INSERT INTO** `games` **VALUES** (…): sin lista de columnas, un valor por columna en el orden de la tabla.',
      templateNote: 'Añade un cliente sin nombrar las columnas.',
      explain: 'Sin lista de columnas, los valores siguen la tabla: `game_id`, `title`, `genre`, `price`, `stock`, `rating`. Si cambias `price` por `stock` funciona, pero guarda datos erróneos.',
    },
    ins02a: {
      prompt: 'Añade el juego 102: `title` `\'Paper Comets\'`, `genre` `\'Puzzle\'`, `price` 5.99 y `stock` 60. Aún no tiene valoración, así que `rating` queda vacía.',
      clause: 'Nombra solo las columnas que rellenas: la `rating` que falta queda en **NULL**.',
      templateNote: 'Añade una venta nombrando todas las columnas.',
      explain: 'Una columna que no está en la lista recibe **NULL** (o su valor por defecto). Una valoración de 0 no es lo mismo que no tener valoración.',
    },
    ins02b: {
      prompt: 'Añade el cliente 102: `\'Malik Haddad\'`, de `\'France\'`, dado de alta el `2025-10-15`, nivel VIP 1. Prueba a nombrar las columnas en otro orden que el de la tabla.',
      clause: 'Con lista de columnas, los valores siguen tu lista, en el orden que elijas.',
      templateNote: 'Añade un juego con sus columnas en otro orden.',
      explain: 'Cuando nombras las columnas, el orden lo eliges tú: los valores solo tienen que seguirlo. La fecha es `DATE \'2025-10-15\'`.',
    },
    ins03a: {
      prompt: 'Nuno Barros (cliente 13) compra una copia del juego 8 el `2025-12-20` y paga 14.99. Regístrala como la venta 1001.',
      clause: 'Un literal **DATE**: `DATE \'AAAA-MM-DD\'`.',
      templateNote: 'Registra otra venta con su fecha.',
      explain: '`DATE \'2025-12-20\'` es un literal de fecha. El `customer_id` debe existir en `customers`: un id erróneo falla con ORA-02291.',
    },
    ins03b: {
      prompt: 'Añade el juego 103: `\'Harbor Lights\'`, género `\'Adventure\'`, precio 19.99, `stock` 0 (aún no ha llegado) y sin valoración. Escribe los seis valores, con **NULL** donde no hay.',
      clause: 'Escribe **NULL** en el lugar de la `rating` que falta.',
      templateNote: 'Añade un juego todavía sin valoración.',
      explain: '**NULL** significa sin valor. `stock` es **NOT NULL**, así que un **NULL** ahí falla con ORA-01400, mientras que 0 es un número de verdad.',
    },
    ins04a: {
      prompt: 'Sofia Brandt (cliente 5) compra 2 copias de Kingdoms of Brass (juego 23, a 44.99 cada una) el `2025-12-01`. Registra la venta 1002 con el `total_paid` correcto.',
      clause: '`total_paid` es la cantidad por el precio: 2 × 44.99.',
      templateNote: 'Registra una venta de 3 copias.',
      explain: '`total_paid` guarda la venta entera: 2 × 44.99 = 89.98. Incluso puedes escribir `2 * 44.99` dentro de **VALUES**.',
    },
    ins04b: {
      prompt: 'Añade el juego 104 con el título `Captain\'s Tide` (con el apóstrofo): género `\'Adventure\'`, precio 27.50, `stock` 12 y valoración 8.0.',
      clause: 'Dentro de un texto, la comilla simple se escribe dos veces: `\'Captain\'\'s Tide\'`.',
      templateNote: 'Añade un cliente con un apóstrofo en el nombre.',
      explain: 'Una comilla cierra el texto en SQL, así que la comilla de dentro se duplica. Sin el apóstrofo, el título sería otro.',
    },
    ins05a: {
      prompt: 'Kai Neumann (cliente 20) compra 3 copias de Tile Tide (juego 10, a 4.99 cada una) el `2025-12-24`, con 1.00 de descuento sobre toda la venta. Registra la venta 1003.',
      clause: 'Calcula `total_paid` como 3 × 4.99 − 1.00.',
      templateNote: 'Registra una venta de 2 copias.',
      explain: '3 × 4.99 = 14.97, menos el descuento de 1.00: 13.97. `total_paid` es lo que el cliente pagó de verdad.',
    },
    ins05b: {
      prompt: 'Añade el cliente 104, `\'Tobias Krämer\'`, de `\'Germany\'`, dado de alta el `2025-12-02`, con el nivel VIP más alto que tiene la tienda.',
      clause: '`vip_level` tiene un **CHECK** entre 0 y 3.',
      templateNote: 'Añade un juego con valoración.',
      explain: 'El **CHECK** de `vip_level` solo acepta de 0 a 3, así que el nivel más alto es 3. Un 4 falla con ORA-02290.',
    },
    ins06a: {
      prompt: 'Elena Paredes (cliente 18) hace sus primeras compras el `2025-12-05`: una copia del juego 6 (29.99) como venta 1004 y dos copias del juego 13 (8.99 cada una) como venta 1005.',
      clause: 'Dos sentencias **INSERT**, una por venta, separadas por `;`.',
      templateNote: 'Dos ventas de otro cliente.',
      explain: 'Cada fila necesita sus propios valores. El segundo total es 2 × 8.99 = 17.98.',
    },
    ins06b: {
      prompt: 'Añade dos juegos: el 105, `\'Copper Canyon Rally\'` (`\'Racing\'`, 34.99, `stock` 15, sin valorar), y el 106, `\'Pocket Riddle Box\'` (`\'Puzzle\'`, 3.99, `stock` 100, valoración 7).',
      clause: 'Un **INSERT** por juego, con **NULL** en la valoración que falta.',
      templateNote: 'Añade dos clientes.',
      explain: 'Cada fila lleva sus valores: **NULL** para el juego sin valorar y 7 para el otro.',
    },
    ins07a: {
      prompt: 'Tres amigos de `\'Chile\'` se dan de alta el `2025-12-10`, todos con nivel VIP 0: 105 `\'Camila Rojas\'`, 106 `\'Matías Soto\'` y 107 `\'Javiera Pino\'`.',
      clause: 'Tres filas: tres sentencias **INSERT**, o una con tres filas de valores.',
      templateNote: 'Añade tres juegos de una saga.',
      explain: 'Cada fila necesita su propia clave. Oracle 23ai también admite un **INSERT** con varias filas, `VALUES (…), (…), (…)`, y todas las versiones admiten `INSERT ALL`.',
    },
    ins07b: {
      prompt: 'Oskar Lind se da de alta como cliente 108 (`\'Sweden\'`, `2025-12-12`, nivel VIP 0) y ese mismo día compra una copia del juego 15 (44.99): la venta 1006.',
      clause: 'El cliente debe existir antes que la venta que apunta a él.',
      templateNote: 'Añade un juego y después una venta suya.',
      explain: '`sales.customer_id` hace referencia a `customers`: si insertas antes la venta, falla con ORA-02291. La fila padre va primero.',
    },
    ins08a: {
      prompt: 'Camille Dufour (cliente 3, VIP 3) compra 2 copias del juego 14 (69.99 cada una) el `2025-12-15`: la venta 1007. Los VIP 3 tienen un 10% de descuento; redondea `total_paid` a 2 decimales.',
      clause: 'Calcula el total dentro de **VALUES**, con `ROUND(x, 2)`.',
      templateNote: 'Registra una venta con un 15% de descuento.',
      explain: 'Un 10% de descuento es pagar el 90%: 2 × 69.99 × 0.9 = 125.982, que redondeado da 125.98.',
    },
    ins08b: {
      prompt: 'Añade el juego 107 `\'Glass Labyrinth Deluxe\'` (`\'Puzzle\'`, `stock` 20, sin valorar), con un precio un 25% mayor que los 12.99 de Glass Labyrinth, redondeado a 2 decimales.',
      clause: 'Calcula el precio con `ROUND(x, 2)` dentro de **VALUES**.',
      templateNote: 'Añade una edición dorada que cuesta la mitad más.',
      explain: '12.99 × 1.25 = 16.2375. **ROUND** da 16.24, y Oracle redondearía igual al guardarlo en `NUMBER(6,2)`. `TRUNC` lo cortaría en 16.23.',
    },
    ins09a: {
      prompt: 'Vuelve Neon Ronin: añade el juego 109 `\'Neon Ronin Remastered\'` (`\'Action\'`, 29.99, `stock` 10) con la misma valoración que el original, 7.6.',
      clause: '`title` es **UNIQUE**: el título nuevo debe ser distinto del antiguo.',
      templateNote: 'Añade un juego de puzles remasterizado.',
      explain: '`title` tiene una restricción **UNIQUE**: repetir `\'Neon Ronin\'` falla con ORA-00001.',
    },
    ins09b: {
      prompt: 'Greta Vogel (cliente 11) compra el `2025-12-18`: una copia del juego 2 (39.99) como venta 1008 y dos copias del juego 24 (32.99 cada una) como venta 1009. Nombra las seis columnas.',
      clause: 'Toda columna **NOT NULL** necesita un valor, `quantity` incluida.',
      templateNote: 'Dos ventas de otro cliente, nombrando las columnas.',
      explain: 'Si dejas `quantity` fuera de la lista, se intenta un **NULL** y falla con ORA-01400. El segundo total es 2 × 32.99 = 65.98.',
    },
    ins10a: {
      prompt: 'Lanza el juego 110 `\'Starlit Racers\'` (`\'Racing\'`, 22.50, `stock` 50, sin valorar) y registra sus primeras ventas el `2025-12-28`: la 1010, cliente 2, una copia; la 1011, cliente 7, dos copias.',
      clause: 'Tres sentencias **INSERT**, primero el juego.',
      templateNote: 'Un cliente nuevo y dos ventas suyas.',
      explain: 'Las dos ventas apuntan al juego 110, así que el juego va primero. La segunda venta paga 2 × 22.50 = 45.',
    },
    ins10b: {
      prompt: 'Añade los clientes 109 `\'Léon Garnier\'` (`\'France\'`, `2025-12-20`, VIP 2) y 110 `\'Ada Moretti\'` (`\'Italy\'`, `2025-12-21`, VIP 3), y después la primera venta de Ada: la 1012, una copia del juego 14 a 69.99 el `2025-12-21`.',
      clause: 'Primero los clientes y después la venta que hace referencia al cliente 110.',
      templateNote: 'Un juego nuevo y una venta suya.',
      explain: 'El orden solo importa por la clave ajena: la venta necesita que exista el cliente 110. Los niveles VIP deben quedar entre 0 y 3.',
    },
    ins11a: {
      prompt: 'Regalo de Navidad: cada cliente de `\'Spain\'` recibe una copia gratis del juego 10 el `2025-12-31` (`total_paid` 0). Cada `sale_id` es 1000 + el `customer_id`. Usa un solo **INSERT** … **SELECT**.',
      clause: '**INSERT INTO** `sales` **SELECT** … **FROM** `customers` **WHERE** el país.',
      templateNote: 'Regalos para los clientes de Italia.',
      explain: '**INSERT** … **SELECT** añade una fila por cada fila de la consulta: cuatro clientes españoles, cuatro ventas, con ids 1001, 1008, 1014 y 1018.',
    },
    ins11b: {
      prompt: 'Añade una edición deluxe de cada juego `\'Strategy\'`: `game_id` + 100, el título seguido de `\' Deluxe\'`, el mismo género, el precio más 10, `stock` 5 y sin valoración.',
      clause: '**SELECT** desde `games` los valores calculados de cada fila nueva.',
      templateNote: 'Ediciones lite de los juegos de deportes.',
      explain: 'El **SELECT** construye cada fila nueva a partir de una antigua: `title || \' Deluxe\'` conserva el espacio y la valoración empieza vacía (**NULL**).',
    },
    ins12a: {
      prompt: 'La clienta 7 vuelve a pedir, el `2026-01-05`, una copia de cada juego que ya compró (cada juego una vez), al `price` actual. Cada `sale_id` es 1100 + el `game_id`.',
      clause: '**JOIN** de `sales` con `games` para el precio, y **DISTINCT** para cada juego una vez.',
      templateNote: 'El mismo pedido repetido para el cliente 2.',
      explain: 'La clienta 7 compró Tile Tide dos veces: sin **DISTINCT** la venta 1110 entraría dos veces (ORA-00001). El precio sale de `games`, no del `total_paid` antiguo.',
    },
    ins12b: {
      prompt: 'Por cada venta de 2025 de un juego `\'Racing\'`, el mismo cliente recibe una copia gratis del juego 18 el `2026-01-10`: `sale_id` = el `sale_id` antiguo + 1000, cantidad 1, `total_paid` 0.',
      clause: '**JOIN** de `sales` con `games` para filtrar por género, y filtra también el año.',
      templateNote: 'Regalos para quienes compraron juegos de estrategia en 2024.',
      explain: 'El género está en `games`, así que hace falta el **JOIN**. `EXTRACT(YEAR FROM s.sale_date) = 2025` deja solo las ventas 35 y 39.',
    },
    ins13a: {
      prompt: 'Regalo de fidelidad: cada cliente que ha gastado más de 150 en total recibe una copia gratis del juego 10 el `2026-01-15` (`total_paid` 0). `sale_id` = 2000 + `customer_id`.',
      clause: '**GROUP BY** `customer_id` con **HAVING** sobre la suma de `total_paid`.',
      templateNote: 'Una venta de regalo por cada juego muy vendido.',
      explain: '**HAVING** `SUM(total_paid) > 150` deja a los clientes 2 y 12. Un **WHERE** `total_paid > 150` miraría ventas sueltas y no encontraría ninguna.',
    },
    ins13b: {
      prompt: 'Añade el juego 112 `\'Genre Sampler\'` (`\'Strategy\'`, `stock` 0, sin valorar), con el precio medio de todos los juegos redondeado a 2 decimales. Calcúlalo con **INSERT** … **SELECT**.',
      clause: '`ROUND(AVG(price), 2)` desde `games`, dentro del **SELECT**.',
      templateNote: 'Un juego con el precio del juego de puzles más barato.',
      explain: 'Un **SELECT** con agregado devuelve una fila, así que se añade un juego, a 32.14. Redondear a un decimal, o promediar solo los de estrategia, da otro precio.',
    },
    ins14a: {
      prompt: 'Bienvenida: cada cliente que nunca ha comprado nada recibe una copia gratis del juego 10 el `2026-02-01` (`total_paid` 0). `sale_id` = 3000 + `customer_id`.',
      clause: '**NOT EXISTS** con una subconsulta sobre las ventas del mismo cliente.',
      templateNote: 'Una venta por cada juego que nunca se vendió.',
      explain: '**NOT EXISTS** deja a los clientes 13, 18 y 20. Con **EXISTS** el regalo iría a los 17 compradores.',
    },
    ins14b: {
      prompt: 'Cada juego que ha vendido más de 5 unidades en total recibe una edición pack: `game_id` + 200, el título seguido de `\' Bundle\'`, el mismo género, el doble de precio redondeado a 2 decimales, `stock` 10 y sin valoración.',
      clause: '`game_id` **IN** una subconsulta con **GROUP BY** y **HAVING** sobre `SUM(quantity)`.',
      templateNote: 'Ediciones clásicas de los juegos con al menos 4 compradores.',
      explain: 'Las unidades son `SUM(quantity)`: los juegos 10, 4 y 15. Contar ventas con `COUNT(*)` dejaría solo el juego 10.',
    },
    ins15a: {
      prompt: 'Cada cliente que compró tanto en 2024 como en 2025 recibe una venta de regalo el `2026-03-01`: juego 13, `quantity` = su número de compras de 2025, `total_paid` 0, `sale_id` = 4000 + `customer_id`.',
      clause: '**GROUP BY** cliente sobre las ventas de 2025, con una subconsulta **IN** para los compradores de 2024.',
      templateNote: 'Una venta por cada juego comprado al menos dos veces en 2024.',
      explain: 'El **WHERE** deja las ventas de 2025 de quienes compraron en 2024, y `COUNT(*)` por cliente da la cantidad. Los clientes 17 y 19 solo compraron en 2025: no reciben nada.',
    },
    ins15b: {
      prompt: 'El cliente 1 compra, el `2026-03-15`, una copia de cada juego `\'Adventure\'` que ha vendido menos de 3 unidades en total, incluidos los que nunca se vendieron. `sale_id` = 5000 + `game_id`; `total_paid` = el precio actual.',
      clause: '**LEFT JOIN** a `sales`, **GROUP BY** el juego y **HAVING** con **NVL** para los juegos sin ventas.',
      templateNote: 'Un regalo para cada cliente español con menos de 3 compras.',
      explain: 'Moonmoss Hollow (juego 9) nunca se vendió: solo un **LEFT JOIN** lo conserva, y `NVL(SUM(s.quantity), 0)` convierte su suma **NULL** en 0. Resultado: los juegos 8 y 9.',
    },
  });
})();
