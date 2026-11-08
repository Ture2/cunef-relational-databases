'use strict';
/* Una consulta por un millón, modo UPDATE: textos de data/game-bank-update.js, añadidos a GAME_TEXT.questions.
   Mismos campos y reglas md que data/es/game.js (§6). Cada enunciado fija qué filas cambian y a qué valor, así que
   solo un estado final es el correcto. Mismos ids que data/en/game-q-update.js. Lo comprueba tools/check-game-text.mjs. */
(() => {
  Object.assign(DATA.es.GAME_TEXT.questions, {
    upd01a: {
      prompt: 'Han llegado copias nuevas de Skyward Cartographer (juego 7). Pon su `stock` a 15.',
      clause: '**UPDATE** de `games` con **SET** y un **WHERE** que elija solo el juego 7.',
      templateNote: 'Cambia el nivel VIP de un cliente.',
      explain: 'Sin **WHERE**, **UPDATE** cambia todas las filas de la tabla. `stock = 15` fija el valor; `stock + 15` lo sumaría.',
    },
    upd01b: {
      prompt: 'Pablo Serrano (cliente 8) se ha mudado: pon su `country` a `\'Portugal\'`.',
      clause: '**UPDATE** de `customers` con **SET** del país y **WHERE** `customer_id` igual a 8.',
      templateNote: 'Cambia el género de un juego.',
      explain: 'Un **WHERE** sobre la clave primaria elige exactamente una fila. Sin él, todos los clientes se mudarían a Portugal.',
    },
    upd02a: {
      prompt: 'Hollow Siege (juego 5) recibe su primera `rating`, 7.9, y un `price` nuevo, 44.99. Cambia las dos cosas en un solo **UPDATE**.',
      clause: '**SET** admite varias asignaciones separadas por comas.',
      templateNote: 'Cambia dos columnas de un cliente.',
      explain: '`SET rating = 7.9, price = 44.99` cambia las dos. Unirlas con **AND** no es Oracle válido: se lee como una sola condición, no como dos asignaciones.',
    },
    upd02b: {
      prompt: 'Hugo Lacroix (cliente 17) se muda a `\'Belgium\'` y llega al nivel VIP 1. Actualiza las dos columnas.',
      clause: 'Un solo **UPDATE** con dos asignaciones en el **SET**.',
      templateNote: 'Cambia el precio y el stock de un juego.',
      explain: 'Los dos cambios van en el mismo **SET**, separados por una coma, y el **WHERE** elige al cliente 17 por su clave.',
    },
    upd03a: {
      prompt: 'La valoración de Pixel Brawlers (juego 4) se ha retirado: deja su `rating` vacía.',
      clause: '`SET rating = NULL` vacía un valor.',
      templateNote: 'Vacía la valoración de otro juego.',
      explain: 'En el **SET**, `= NULL` asigna la ausencia de valor (solo las comparaciones necesitan **IS NULL**). Una valoración de 0 sería una nota real, y pésima.',
    },
    upd03b: {
      prompt: 'La venta 12 se registró con una fecha errónea: fue el `2024-06-29`. Corrige su `sale_date`.',
      clause: 'Asigna un literal **DATE**: `DATE \'AAAA-MM-DD\'`.',
      templateNote: 'Corrige la fecha de alta de un cliente.',
      explain: '`SET sale_date = DATE \'2024-06-29\'` con `WHERE sale_id = 12`. La fecha antigua era el 2024-06-19.',
    },
    upd04a: {
      prompt: 'Han llegado 20 copias más de `\'Bramble Knight\'`. Súmalas a su `stock`, buscando el juego por su `title`.',
      clause: '`stock = stock + 20`, con un **WHERE** sobre `title`.',
      templateNote: 'Quita dos unidades del stock de Tile Tide.',
      explain: 'A la derecha del `=`, `stock` es el valor antiguo, así que 2 pasa a 22. Las comparaciones de texto distinguen mayúsculas: `\'Bramble knight\'` no encuentra ninguna fila.',
    },
    upd04b: {
      prompt: 'Léa Moreau sube un nivel VIP. Búscala por `name` (`\'Léa Moreau\'`) y suma 1 a su nivel actual.',
      clause: '`vip_level = vip_level + 1`, con un **WHERE** sobre `name`.',
      templateNote: 'Baja un nivel VIP a Sofia Brandt.',
      explain: 'El valor nuevo sale del antiguo: Léa pasa de 1 a 2. Escribir `= 1` la dejaría donde estaba.',
    },
    upd05a: {
      prompt: 'Ironclad Vanguard (juego 1) está de oferta: baja su `price` en 5.00.',
      clause: 'Resta al valor actual: `price - 5`.',
      templateNote: 'Sube 3 el precio de otro juego.',
      explain: '`price = price - 5` convierte 59.99 en 54.99. Sin **WHERE**, todos los juegos bajarían 5.',
    },
    upd05b: {
      prompt: 'La venta 46 era en realidad de 2 copias, no de 1. Pon su `quantity` a 2 y duplica su `total_paid`, manteniendo el descuento que tenía.',
      clause: 'Dos asignaciones: la cantidad y `total_paid * 2`.',
      templateNote: 'Convierte otra venta en 3 copias.',
      explain: 'Duplicar el `total_paid` antiguo conserva el descuento: 2 × 43.19 = 86.38. Con el precio de tarifa, 2 × 47.99, se perdería.',
    },
    upd06a: {
      prompt: 'Todos los juegos `\'Puzzle\'` suben 1.00.',
      clause: 'Un **WHERE** sobre `genre` elige el grupo de filas.',
      templateNote: 'Cinco unidades más para cada juego de deportes.',
      explain: 'Un **UPDATE** cambia todas las filas que deja su **WHERE**: los cuatro juegos de puzles. El valor debe coincidir exactamente: `\'puzzle\'` no cambia nada.',
    },
    upd06b: {
      prompt: 'Todos los clientes de `\'Mexico\'` pasan al nivel VIP 2.',
      clause: 'Asigna el nivel fijo 2, con un **WHERE** sobre `country`.',
      templateNote: 'Todos los clientes alemanes pasan al nivel 1.',
      explain: 'Los clientes 4, 12 y 19 acaban en el nivel 2. Sumar 2 a cada nivel llevaría al cliente 19 a 4 y violaría el **CHECK** (ORA-02290).',
    },
    upd07a: {
      prompt: 'Todos los juegos `\'Racing\'` suben un 10%, redondeado a 2 decimales.',
      clause: '`ROUND(price * 1.1, 2)` en el **SET**.',
      templateNote: 'Los juegos de estrategia, un 10% más baratos, redondeados.',
      explain: '31.99 × 1.1 = 35.189, que redondeado da 35.19. Oracle también lo redondearía al guardarlo en `NUMBER(6,2)`, pero `ROUND(x)` sin decimales redondea a un entero.',
    },
    upd07b: {
      prompt: 'Cada juego agotado (`stock` 0) recibe 10 unidades nuevas: pon su `stock` a 10.',
      clause: 'Un **WHERE** con `stock = 0` elige el grupo.',
      templateNote: 'Los clientes de nivel VIP 0 pasan al nivel 1.',
      explain: 'Hay cuatro juegos sin stock. Con `stock < 5` también se repondrían Hollow Siege y Bramble Knight, a los que aún les quedan unidades.',
    },
    upd08a: {
      prompt: 'Cada juego `\'Action\'` o `\'Adventure\'` sin valoración recibe la valoración 5; los demás conservan la suya.',
      clause: '`NVL(rating, 5)` conserva una valoración y rellena la vacía.',
      templateNote: 'Rellena con 6 las valoraciones que faltan en los juegos de puzles.',
      explain: '`NVL(rating, 5)` devuelve la valoración cuando la hay y 5 cuando es **NULL**: solo cambian Hollow Siege y Moonmoss Hollow.',
    },
    upd08b: {
      prompt: 'Los juegos agotados (`stock` 0) tienen un 20% de descuento: multiplica su `price` por 0.8, redondeado a 2 decimales.',
      clause: '`ROUND(price * 0.8, 2)` con un **WHERE** sobre `stock`.',
      templateNote: 'Los juegos con mucho stock, un 5% más baratos.',
      explain: 'Un 20% de descuento es pagar el 80%: 39.99 × 0.8 = 31.992, que redondeado da 31.99. Multiplicar por 0.2 dejaría solo el descuento.',
    },
    upd09a: {
      prompt: 'Los clientes que se dieron de alta en 2023 suben un nivel VIP, pero nadie pasa de 3 (quien está en 3 se queda en 3).',
      clause: '**CASE** decide el nivel nuevo y `EXTRACT(YEAR FROM signup_date)` elige los clientes.',
      templateNote: 'Los clientes dados de alta en 2025 bajan un nivel, nunca por debajo de 0.',
      explain: 'Los clientes 3 y 7 ya están en 3: un simple `vip_level + 1` daría 4 y violaría el **CHECK**. `LEAST(vip_level + 1, 3)` también sirve.',
    },
    upd09b: {
      prompt: 'Nueva tarifa para todos los juegos: los de menos de 10 suben 1.00; el resto sube un 5%, redondeado a 2 decimales.',
      clause: 'Un **CASE** en el **SET** elige la fórmula de cada fila.',
      templateNote: 'Los juegos con menos de 10 unidades reciben 10 más.',
      explain: '**CASE WHEN** `price < 10` **THEN** `price + 1` **ELSE** `ROUND(price * 1.05, 2)` **END**. Sin **WHERE**, cambian los 24 juegos.',
    },
    upd10a: {
      prompt: 'Cada venta de 2024 de 2 o más copias recibe un reembolso del 5%: su `total_paid` pasa a ser el 95% de lo que era, redondeado a 2 decimales.',
      clause: 'Dos condiciones en el **WHERE**: la cantidad y `EXTRACT(YEAR FROM sale_date)`.',
      templateNote: 'Un recargo del 2% en algunas ventas de una copia de 2025.',
      explain: 'Cumplen tres ventas: la 4, la 9 y la 20. Sin el año, cambiarían también las ventas de varias copias de 2025.',
    },
    upd10b: {
      prompt: 'Revisión de valoraciones: los juegos sin valorar reciben un 6; los valorados por debajo de 7 suben 0.5; el resto conserva su valoración.',
      clause: 'Un **CASE** con **IS NULL** primero y después la comparación.',
      templateNote: 'Cambia el stock de los juegos según su valoración.',
      explain: '`rating = NULL` nunca es cierto, así que las valoraciones vacías necesitan `WHEN rating IS NULL`. Cuatro juegos reciben un 6 y tres suben 0.5.',
    },
    upd11a: {
      prompt: 'Los juegos que nunca se han vendido tienen un 10% de descuento, redondeado a 2 decimales.',
      clause: 'Un **WHERE** con **NOT IN** una subconsulta sobre `sales`.',
      templateNote: 'Los clientes que nunca compraron vuelven al nivel VIP 0.',
      explain: 'La subconsulta lista los juegos vendidos; **NOT IN** deja los juegos 9, 17 y 22. Con **IN** se rebajarían los otros 21.',
    },
    upd11b: {
      prompt: 'Los clientes de nivel VIP 0 que compraron algo en 2024 pasan al nivel 1.',
      clause: 'Dos condiciones: `vip_level = 0` y `customer_id` **IN** los compradores de 2024.',
      templateNote: 'Una unidad más para los juegos vendidos de varios en varios en 2025.',
      explain: 'Cambian los clientes 4, 8, 11 y 15. Sin el año, también subiría el cliente 17, que solo compró en 2025.',
    },
    upd12a: {
      prompt: 'En cada juego `\'RPG\'`, pon como `stock` el número de unidades que se han vendido de él (0 si nunca se vendió).',
      clause: 'Una subconsulta correlacionada en el **SET**, con **NVL** para los juegos sin ventas.',
      templateNote: 'El nivel VIP de los clientes franceses pasa a ser su número de compras, como mucho 3.',
      explain: 'La `SUM` sobre ninguna fila es **NULL**, y `stock` es **NOT NULL**: sin **NVL**, Embers of Valdren falla con ORA-01407. Las unidades son `SUM(quantity)`, no `COUNT(*)`.',
    },
    upd12b: {
      prompt: 'Recalcula a precio de tarifa todas las ventas de la clienta 7: `total_paid` = `quantity` × el `price` actual del juego.',
      clause: 'En el **SET**, multiplica por una subconsulta que lee el precio de `games`.',
      templateNote: 'Pone cada venta del cliente 3 al precio de una copia.',
      explain: 'Solo cambia la venta 46 (tenía descuento): 43.19 pasa a 47.99. Si olvidas `quantity`, la venta 4, de tres copias, saldría demasiado barata.',
    },
    upd13a: {
      prompt: 'Los juegos que han vendido al menos tantas unidades como tienen en stock se reponen: suma a su `stock` el doble de sus unidades vendidas.',
      clause: 'La misma subconsulta correlacionada sobre `sales`, en el **SET** y en el **WHERE**.',
      templateNote: 'Los clientes con 5 compras o más llegan al nivel VIP 3.',
      explain: 'Solo los juegos 2, 12 y 20 vendieron al menos su stock. Sin la correlación (`s.game_id = g.game_id`) la subconsulta suma todas las ventas de la tienda.',
    },
    upd13b: {
      prompt: 'Los clientes que han gastado más de 150 en total llegan al nivel VIP 3.',
      clause: '`customer_id` **IN** una subconsulta con **GROUP BY** y **HAVING**.',
      templateNote: '10 unidades más para los juegos que vendieron 6 o más.',
      explain: 'Los clientes 2 y 12 gastaron más de 150. Filtrar ventas sueltas de más de 150 no encuentra ninguna, así que nadie cambiaría.',
    },
    upd14a: {
      prompt: 'Resta del `stock` de cada juego `\'Puzzle\'` las unidades vendidas en 2025; un juego sin ventas en 2025 conserva su stock.',
      clause: 'Resta una **SUM** correlacionada de 2025, envuelta en **NVL**.',
      templateNote: 'Suma al stock de cada juego de acción su número de ventas de 2024.',
      explain: 'Tile Tide pierde 7 unidades. Glass Labyrinth no vendió nada en 2025: sin **NVL** el resultado es **NULL** y falla con ORA-01407.',
    },
    upd14b: {
      prompt: 'Los clientes que no compraron nada en 2024 bajan un nivel VIP, pero nunca por debajo de 0.',
      clause: '**NOT EXISTS** una venta de 2024, y `GREATEST(vip_level - 1, 0)`.',
      templateNote: 'Los juegos sin ventas en 2025 pierden 5 unidades, nunca por debajo de 0.',
      explain: 'Elena Paredes y Ximena Robles bajan un nivel; los demás ya están en 0. Un simple `vip_level - 1` llegaría a −1 y violaría el **CHECK**.',
    },
    upd15a: {
      prompt: 'Recalcula todos los niveles VIP según lo que ha gastado cada cliente en total: 3 si pasa de 150, 2 si pasa de 100, 1 si pasa de 50 y 0 en otro caso (también quien nunca compró).',
      clause: 'Un **CASE** sobre una **SUM** correlacionada, con **NVL** para quien no tiene ventas; prueba primero el umbral más alto.',
      templateNote: '20 unidades más para los juegos que vendieron 5 o más.',
      explain: '**CASE** devuelve la primera rama que se cumple, así que el orden de los **WHEN** importa: probar antes `> 50` pondría a todos en el nivel 1.',
    },
    upd15b: {
      prompt: 'Los juegos con 3 ventas o más reciben como `price` el precio medio pagado de verdad por unidad: la suma de su `total_paid` dividida por la suma de su `quantity`, redondeada a 2 decimales.',
      clause: 'Una subconsulta correlacionada en el **SET** y una subconsulta con `COUNT(*)` en el **WHERE**.',
      templateNote: 'Valora los juegos con 4 ventas o más por sus copias medias por venta.',
      explain: 'Solo cambian los juegos con descuentos: Ironclad Vanguard pasa a 57.99 y Pitchside Heroes a 46.39. Sin **WHERE**, los juegos sin ventas recibirían **NULL** (ORA-01407).',
    },
  });
})();
