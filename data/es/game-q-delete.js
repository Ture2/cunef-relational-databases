'use strict';
/* Una consulta por un millón, modo DELETE: textos de data/game-bank-delete.js, añadidos a GAME_TEXT.questions.
   Mismos campos y reglas md que data/es/game.js (§6). Los valores ('Portugal'), los nombres del esquema y las fechas
   (`2024-03-01`) se escriben como en SQL. Mismos ids que data/en/game-q-delete.js. */
(() => {
  Object.assign(DATA.es.GAME_TEXT.questions, {
    del01a: {
      prompt: 'La venta 53 se registró por error. Bórrala de `sales`.',
      clause: '**DELETE FROM** `sales` con un **WHERE** sobre `sale_id`.',
      templateNote: 'Borra un cliente que nunca compró nada.',
      explain: '**DELETE** sin **WHERE** vacía la tabla entera. `WHERE sale_id = 53` borra exactamente una fila.',
    },
    del01b: {
      prompt: 'La clienta 18, Elena Paredes, cerró su cuenta sin llegar a comprar nada. Bórrala de `customers`.',
      clause: '**DELETE FROM** `customers` con un **WHERE** sobre `customer_id`.',
      templateNote: 'Borra por su clave un juego que nunca se vendió.',
      explain: 'Un filtro sobre la clave primaria toca exactamente una fila. La clienta 18 no tiene ventas, así que ninguna clave ajena impide el borrado.',
    },
    del02a: {
      prompt: 'El juego `\'Slam Court Kings\'` no ha vendido ni una copia y sale del catálogo. Bórralo de `games` usando su `title`.',
      clause: 'Un **WHERE** sobre `title`, con el texto entre comillas simples, tal y como está guardado.',
      templateNote: 'Borra un cliente buscándolo por `name`.',
      explain: 'En Oracle las comparaciones de texto distinguen mayúsculas: `\'slam court kings\'` no encuentra nada. Borrar todos los juegos `\'Sports\'` falla con ORA-02292, porque uno tiene ventas.',
    },
    del02b: {
      prompt: 'La clienta 19 reclama todas sus compras. Borra todas las ventas con `customer_id` 19 de `sales`, pero conserva a la clienta.',
      clause: '**DELETE FROM** `sales`, no `customers`, con un **WHERE** sobre `customer_id`.',
      templateNote: 'Borra todas las ventas de un juego.',
      explain: 'Un **WHERE** sobre una columna que no es la clave puede borrar varias filas: aquí, 3. Borrar a la clienta falla con ORA-02292 mientras existan sus ventas.',
    },
    del03a: {
      prompt: 'Los pedidos grandes pasan a otro sistema. Borra las ventas con una `quantity` de 3 unidades o más.',
      clause: 'Compara `quantity` con **>=** en el **WHERE**.',
      templateNote: 'Borra las ventas de los juegos con id 23 o mayor.',
      explain: '"3 o más" incluye el 3: `quantity >= 3`. `quantity > 3` no borra nada, porque ninguna venta tiene más de 3 unidades.',
    },
    del03b: {
      prompt: 'Algunas ventas de prueba se guardaron con importes ridículos. Borra las ventas cuyo `total_paid` sea menor que 5.',
      clause: 'Un **WHERE** con **<** sobre `total_paid`.',
      templateNote: 'Borra las ventas que pagaron más de 130.',
      explain: '`total_paid < 5` borra las cinco ventas de 4.99. Cuidado con el sentido del signo: `> 5` borraría casi toda la tabla.',
    },
    del04a: {
      prompt: 'Las copias sueltas del juego 10 se vendieron por error. Borra las ventas con `game_id` 10 cuya `quantity` sea 1 y conserva las más grandes.',
      clause: 'Une las dos condiciones con **AND**.',
      templateNote: 'Borra las ventas de un cliente y un juego concretos.',
      explain: '**AND** exige que se cumplan las dos condiciones: 5 filas. Con **OR** borrarías todas las ventas del juego 10 y todas las de una unidad de la tienda.',
    },
    del04b: {
      prompt: 'El cliente 2 devolvió todas las compras de más de 1 unidad. Borra las ventas con `customer_id` 2 y una `quantity` mayor que 1.',
      clause: 'Dos condiciones con **AND**: el cliente y la `quantity`.',
      templateNote: 'Borra las ventas de una sola unidad del cliente 7.',
      explain: '`quantity > 1` atrapa las ventas de 2 y de 3 unidades. `quantity > 2` se dejaría la de 2.',
    },
    del05a: {
      prompt: 'Un fallo duplicó las ventas con `sale_id` del 50 al 53, ambas incluidas. Bórralas.',
      clause: '**BETWEEN** incluye los dos extremos.',
      templateNote: 'Borra las ventas que pagaron entre 40 y 50.',
      explain: '`BETWEEN 50 AND 53` incluye los dos límites: 4 filas. `> 50 AND < 53` se deja fuera la 50 y la 53.',
    },
    del05b: {
      prompt: 'Borra los clientes de `\'Portugal\'` cuyo `vip_level` sea 0.',
      clause: 'Dos condiciones con **AND**; el país es texto y va entre comillas simples.',
      templateNote: 'Borra los juegos `\'Adventure\'` con exactamente 5 copias en stock.',
      explain: 'Solo cumple Nuno Barros, que nunca compró. Borrar a todos los clientes portugueses falla con ORA-02292: João Ventura tiene ventas.',
    },
    del06a: {
      prompt: 'Borra las ventas anteriores al 1 de marzo de 2024, es decir, con una `sale_date` anterior a `2024-03-01`.',
      clause: 'Compara `sale_date` con **<** y un literal **DATE**.',
      templateNote: 'Borra las ventas posteriores al 1 de noviembre de 2025.',
      explain: '`sale_date < DATE \'2024-03-01\'` deja fuera el 1 de marzo: 3 ventas. `<= DATE \'2024-03-31\'` se llevaría también las ventas de marzo.',
    },
    del06b: {
      prompt: 'Borra todas las ventas de junio de 2025: del `2025-06-01` al `2025-06-30`, ambos días incluidos.',
      clause: '**BETWEEN** con dos literales **DATE**, o bien **>=** y **<**.',
      templateNote: 'Borra las ventas de julio de 2024.',
      explain: 'Hay una venta justo el 1 de junio. `> DATE \'2025-06-01\'` se la salta; **BETWEEN** incluye los dos extremos.',
    },
    del07a: {
      prompt: 'Tres juegos no se han vendido nunca: `\'Moonmoss Hollow\'`, `\'Embers of Valdren\'` y `\'Slam Court Kings\'`. Borra los tres por su `title` en una sola sentencia.',
      clause: '**IN** con la lista de los tres títulos.',
      templateNote: 'Borra dos clientes por su `name` con **IN**.',
      explain: '`title IN (…)` significa un título u otro. Si encadenas los títulos con **AND** no encuentras nada: una fila no puede tener tres títulos a la vez.',
    },
    del07b: {
      prompt: 'Borra los juegos sin `rating` de los géneros `\'Adventure\'` y `\'RPG\'`.',
      clause: '**IS NULL** para la valoración que falta e **IN** para los géneros.',
      templateNote: 'Borra los juegos sin valoración que cuestan más de 50.',
      explain: '`rating = NULL` nunca es cierto, así que no borra nada. Sin el filtro de género tocas también dos juegos sin valoración que tienen ventas: ORA-02292.',
    },
    del08a: {
      prompt: 'Borra las ventas con `customer_id` 7, salvo las de los juegos 10 y 21.',
      clause: '**NOT IN** con una lista de dos valores de `game_id`.',
      templateNote: 'Borra las ventas del juego 15, salvo las de los clientes 1 y 2.',
      explain: '`game_id NOT IN (10, 21)` respeta los dos juegos. `game_id <> 10 OR game_id <> 21` siempre es cierto, así que borra las cinco ventas del cliente 7.',
    },
    del08b: {
      prompt: 'Borra los clientes que se dieron de alta el `2025-03-01` o después y tienen un `vip_level` menor que 2.',
      clause: 'Usa **>=** sobre `signup_date` con un literal **DATE**, y **AND** para el nivel.',
      templateNote: 'Borra los juegos de más de 50 que no tienen stock.',
      explain: 'Cumplen Elena Paredes y Kai Neumann, y ninguno de los dos compró nada. Sin el filtro de nivel entra Ximena Robles (nivel 2, con ventas) y salta ORA-02292.',
    },
    del09a: {
      prompt: 'Los juegos 10 y 11 tuvieron un error de precio en 2025. Borra sus ventas desde el `2025-01-01` y conserva las de 2024.',
      clause: 'Pon los dos juegos en una lista **IN** (o entre paréntesis) y añade la fecha con **AND**.',
      templateNote: 'Borra las ventas de 2024 de los clientes 1 y 2.',
      explain: '**AND** se evalúa antes que **OR**: `game_id = 10 OR game_id = 11 AND …` borra todas las ventas del juego 10. **IN** o los paréntesis mantienen la lógica.',
    },
    del09b: {
      prompt: 'Borra todas las ventas hechas en diciembre (mes 12), de cualquier año.',
      clause: '`EXTRACT(MONTH FROM sale_date)` da el número del mes.',
      templateNote: 'Borra todas las ventas hechas en febrero.',
      explain: 'Hay ventas de diciembre en 2024 y en 2025: 4 filas. `EXTRACT(MONTH …) = 12` atrapa los dos años; un rango de fechas de un solo año se deja el otro.',
    },
    del10a: {
      prompt: 'Haz limpieza en los juegos `\'Adventure\'`, `\'RPG\'` y `\'Sports\'` que no tienen `rating` o tienen un `rating` menor que 7. Bórralos.',
      clause: '`rating` **IS NULL** **OR** menor que 7, entre paréntesis, unido con **AND** a los géneros.',
      templateNote: 'Borra los juegos `\'Adventure\'` sin valoración o con menos de 6 copias.',
      explain: '`rating < 7` a secas se salta las valoraciones NULL. Sin paréntesis, **AND** va primero y `OR rating < 7` alcanza juegos de otros géneros con ventas: ORA-02292.',
    },
    del10b: {
      prompt: 'Borra las ventas de 2025 de más de 1 unidad o de más de 100 pagados (`total_paid`), salvo las del cliente 12.',
      clause: 'Pon el **OR** entre paréntesis y une todo lo demás con **AND**.',
      templateNote: 'El mismo filtro sobre 2024, con otros límites y otro cliente.',
      explain: 'Sin paréntesis, **AND** va primero y el **OR** se escapa del año y del cliente: también caería la venta 29 del cliente 12.',
    },
    del11a: {
      prompt: 'Borra todas las ventas de los juegos `\'Puzzle\'`. Los juegos se quedan.',
      clause: '**IN** con una subconsulta que devuelve el `game_id` de los juegos de puzles.',
      templateNote: 'Borra las ventas de los clientes de `\'Chile\'`.',
      explain: '`sales` no tiene `genre`: la subconsulta encuentra los cuatro juegos de puzles e **IN** borra sus 13 ventas. Borrar en `games` falla con ORA-02292.',
    },
    del11b: {
      prompt: 'Borra los clientes que nunca han comprado nada, es decir, que no tienen ninguna fila en `sales`.',
      clause: '**NOT IN** (o **NOT EXISTS**) con una subconsulta sobre `sales`.',
      templateNote: 'Borra las ventas de los juegos sin stock.',
      explain: 'La subconsulta lista a todos los compradores; **NOT IN** se queda con los otros tres clientes. Con **IN** irías a por los compradores y fallaría con ORA-02292.',
    },
    del12a: {
      prompt: 'Borra los juegos que no se han vendido nunca.',
      clause: 'Un **NOT EXISTS** correlacionado: busca una venta con el mismo `game_id`.',
      templateNote: 'Borra las ventas de los clientes con `vip_level` 0.',
      explain: 'La subconsulta se ejecuta para cada juego `g`. Sin `s.game_id = g.game_id` solo pregunta si `sales` tiene alguna fila, y no borra nada.',
    },
    del12b: {
      prompt: 'Borra las ventas de todos los juegos que no tienen `rating`.',
      clause: '**IN** con una subconsulta que usa **IS NULL**.',
      templateNote: 'Borra las ventas de los juegos con una valoración menor que 7.',
      explain: 'Dentro de la subconsulta, `rating = NULL` nunca es cierto y la lista sale vacía. `rating IS NULL` encuentra cuatro juegos; dos tienen ventas, 3 filas en total.',
    },
    del13a: {
      prompt: 'Borra todas las ventas del juego más barato de la tienda, el de menor `price`.',
      clause: 'Subconsultas anidadas: el **MIN** de `price` y luego el `game_id` de ese juego.',
      templateNote: 'Borra las ventas del juego más caro.',
      explain: 'Dos ventas de ese juego fueron de 3 unidades, así que su `total_paid` no es el precio: si comparas `total_paid` con el precio mínimo se te escapan. Busca el `game_id`.',
    },
    del13b: {
      prompt: 'Para cada cliente de `\'France\'`, borra solo su venta más reciente.',
      clause: 'Una subconsulta correlacionada: el **MAX** de `sale_date` del mismo cliente.',
      templateNote: 'Borra la primera venta de cada juego `\'Racing\'`.',
      explain: 'La subconsulta está correlacionada (`s2.customer_id = s.customer_id`): una última fecha por cliente, 3 filas. Sin correlación, **MAX** es la última venta de toda la tienda, que no es francesa.',
    },
    del14a: {
      prompt: 'Hugo Lacroix, el cliente 17, pide que borremos todos sus datos. Borra sus ventas y después al cliente: dos sentencias, en el orden correcto.',
      clause: 'Dos **DELETE FROM**: primero los hijos (`sales`) y luego el padre (`customers`).',
      templateNote: 'Borra al cliente 11 y sus ventas, primero los hijos.',
      explain: 'Mientras una venta apunte al cliente, borrarlo falla con ORA-02292. Borra primero los hijos y después el padre.',
    },
    del14b: {
      prompt: 'Retira el juego `\'Skyline Overdrive\'`: borra sus ventas y después el propio juego, buscándolo por su `title`.',
      clause: 'Una subconsulta encuentra su `game_id` para el primer **DELETE FROM**; el segundo borra el juego.',
      templateNote: 'Retira `\'Neon Ronin\'` de la misma forma.',
      explain: 'El orden importa: primero las ventas y luego el juego. Si borras antes el juego, Oracle se para con ORA-02292.',
    },
    del15a: {
      prompt: 'La tienda deja `\'Portugal\'`. Borra a todos los clientes de ese país junto con todas sus ventas.',
      clause: 'Primero las ventas, con **IN** y una subconsulta sobre `customers`; después los clientes.',
      templateNote: 'Hace lo mismo con los clientes de `\'Uruguay\'`.',
      explain: 'Se van dos clientes y las tres ventas de uno de ellos. Si solo borras los clientes sin ventas, João Ventura se queda.',
    },
    del15b: {
      prompt: 'Retira todos los juegos sin stock (`stock` 0), junto con sus ventas.',
      clause: 'Borra en `sales` con **IN** y una subconsulta, y después en `games`.',
      templateNote: 'Retira los juegos `\'Sports\'` y sus ventas.',
      explain: 'Cuatro juegos no tienen stock y tres de ellos tienen ventas. Borra primero esas 4 ventas; después pueden irse los cuatro juegos.',
    },
  });
})();
