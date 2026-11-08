'use strict';
/* Una consulta por un millón, modo Estructura (DDL): textos de data/game-bank-ddl.js, añadidos a
   GAME_TEXT.questions. Mismos campos y reglas md que data/es/game.js (§6). Cada enunciado fija los nombres de tabla
   y columnas, su orden, cuáles son obligatorias, las claves, el rango del CHECK, el valor por defecto y las columnas
   de la vista, porque las sondas corrigen exactamente eso. Mismos ids que data/en/game-q-ddl.js. */
(() => {
  Object.assign(DATA.es.GAME_TEXT.questions, {
    ddl01a: {
      prompt: 'Crea la tabla `genres` con dos columnas: `genre_id` (`NUMBER(2)`, la clave primaria) y `name` (`VARCHAR2(20)`, obligatoria).',
      clause: '**CREATE TABLE** con **PRIMARY KEY** en `genre_id` y **NOT NULL** en `name`.',
      templateNote: 'Crea una tabla de idiomas con la misma forma.',
      explain: '**PRIMARY KEY** hace que `genre_id` sea única y obligatoria: un id repetido falla con ORA-00001. **NOT NULL** rechaza un `name` vacío.',
    },
    ddl01b: {
      prompt: 'Añade a `games` una columna opcional `release_year` de tipo `NUMBER(4)`.',
      clause: '**ALTER TABLE** `games` **ADD** con la columna nueva.',
      templateNote: 'Añade a `customers` una columna opcional `city`.',
      explain: 'La columna nueva va al final y queda vacía (NULL) en los 24 juegos existentes. Una columna **NOT NULL** sin valor por defecto no se puede añadir a una tabla con filas: ORA-01758.',
    },
    ddl02a: {
      prompt: 'Crea `suppliers` con, en este orden: `supplier_id` (`NUMBER(4)`, clave primaria), `name` (`VARCHAR2(40)`, obligatoria) y `country` (`VARCHAR2(30)`, opcional).',
      clause: '**PRIMARY KEY**, **NOT NULL** en las obligatorias y nada en la opcional.',
      templateNote: 'Crea `publishers` con una clave, un nombre obligatorio y una ciudad opcional.',
      explain: 'Una columna sin restricciones admite NULL. Las columnas de una tabla quedan en el orden en que las escribes.',
    },
    ddl02b: {
      prompt: 'La tienda deja de mostrar valoraciones. Elimina la columna `rating` de `games`.',
      clause: '**ALTER TABLE** … **DROP COLUMN**.',
      templateNote: 'Elimina `vip_level` de `customers`.',
      explain: '**DROP COLUMN** elimina la columna con todos sus valores; las demás columnas se quedan. En Oracle también puedes escribir `DROP (rating)`.',
    },
    ddl03a: {
      prompt: 'Crea `events`: `event_id` (`NUMBER(5)`, clave primaria), `title` (`VARCHAR2(60)`, obligatoria), `event_date` (`DATE`, obligatoria) y `city` (`VARCHAR2(30)`, opcional), en este orden.',
      clause: '**CREATE TABLE** con una columna **DATE** y **NOT NULL** en las obligatorias.',
      templateNote: 'Crea `tournaments` con una clave, un nombre, una fecha de inicio y un premio opcional.',
      explain: 'Las fechas usan el tipo **DATE**. Cada columna obligatoria necesita su propio **NOT NULL**; `city` no lo tiene, así que admite NULL.',
    },
    ddl03b: {
      prompt: 'Añade a `customers` dos columnas opcionales, en este orden: `email` (`VARCHAR2(60)`) y `phone` (`VARCHAR2(20)`).',
      clause: 'Un solo **ALTER TABLE** … **ADD** con las dos columnas entre paréntesis.',
      templateNote: 'Añade a `games` dos columnas de texto opcionales.',
      explain: '`ADD (a …, b …)` añade varias columnas a la vez, al final y en el orden escrito. Dos sentencias **ADD** separadas hacen lo mismo.',
    },
    ddl04a: {
      prompt: 'Crea `price_history` con cuatro columnas obligatorias: `game_id` (`NUMBER(4)`), `old_price` y `new_price` (`NUMBER(6,2)`) y `changed_on` (`DATE`). Sin clave primaria: un juego puede cambiar de precio muchas veces.',
      clause: '**CREATE TABLE** con **NOT NULL** en todas las columnas y sin **PRIMARY KEY**.',
      templateNote: 'Crea un registro de stock: tres columnas obligatorias y ninguna clave.',
      explain: 'Un histórico repite `game_id`, así que no puede ser la clave primaria: el segundo cambio de precio de un juego fallaría con ORA-00001.',
    },
    ddl04b: {
      prompt: 'Elimina las columnas `signup_date` y `vip_level` de `customers`.',
      clause: '**ALTER TABLE** … **DROP** con las dos columnas entre paréntesis.',
      templateNote: 'Elimina `genre` y `stock` de `games`.',
      explain: '`DROP (signup_date, vip_level)` elimina las dos en una sola sentencia. Dos sentencias **DROP COLUMN** también sirven.',
    },
    ddl05a: {
      prompt: 'Crea `countries`: `country_code` (`CHAR(2)`, clave primaria, como `\'ES\'`), `name` (`VARCHAR2(30)`, obligatoria) y `region` (`VARCHAR2(20)`, opcional).',
      clause: 'La **PRIMARY KEY** puede ser una columna de texto.',
      templateNote: 'Crea `currencies`, con un código de tres letras como clave.',
      explain: 'Una clave no tiene por qué ser un número: `CHAR(2)` guarda códigos como `\'ES\'`. Un código repetido falla con ORA-00001.',
    },
    ddl05b: {
      prompt: 'Sustituye `rating` en `games` por una columna nueva y vacía `score` (`NUMBER(3,1)`, opcional): añade `score` y después elimina `rating`. Las valoraciones antiguas no se conservan.',
      clause: 'Dos sentencias: **ALTER TABLE** … **ADD** y después **ALTER TABLE** … **DROP COLUMN**.',
      templateNote: 'Sustituye `vip_level` en `customers` por una columna nueva `tier`.',
      explain: 'Cada **ALTER TABLE** hace una sola cosa. `score` queda la última, detrás de `stock`, y empieza vacía en todos los juegos.',
    },
    ddl06a: {
      prompt: 'Crea `platforms`: `platform_id` (`NUMBER(3)`, clave primaria), `name` (`VARCHAR2(30)`, obligatoria y sin repetirse nunca) y `maker` (`VARCHAR2(30)`, opcional, puede repetirse).',
      clause: '**UNIQUE** en `name`, además de **NOT NULL**.',
      templateNote: 'Crea `studios` con un nombre obligatorio y único.',
      explain: '**UNIQUE** prohíbe repetir `name` (ORA-00001), pero admite varias plataformas del mismo `maker`. **NOT NULL** sigue haciendo falta: **UNIQUE** a solas acepta NULL.',
    },
    ddl06b: {
      prompt: 'Crea `promotions`: `promo_id` (`NUMBER(4)`, clave primaria), `name` (`VARCHAR2(40)`, obligatoria) y `discount` (`NUMBER(2)`, obligatoria, de 5 a 50, ambos incluidos).',
      clause: 'Un **CHECK** con **BETWEEN** sobre `discount`.',
      templateNote: 'Crea `bundles` de entre 2 y 10 juegos.',
      explain: '`CHECK (discount BETWEEN 5 AND 50)` acepta 5 y 50 y rechaza 4 o 51 con ORA-02290. `> 5 AND < 50` rechazaría los límites.',
    },
    ddl07a: {
      prompt: 'Añade a `games` una columna obligatoria `pegi` (`NUMBER(2)`) cuyo valor por defecto sea 12, para que los juegos existentes reciban 12.',
      clause: '**DEFAULT** 12 antes de **NOT NULL** en el **ADD**.',
      templateNote: 'Añade a `customers` un `language` obligatorio, `\'en\'` por defecto.',
      explain: 'El **DEFAULT** rellena las 24 filas existentes y cada juego nuevo que no indique `pegi`. Sin él, una columna **NOT NULL** no se puede añadir a una tabla con filas: ORA-01758.',
    },
    ddl07b: {
      prompt: 'Crea `stores`: `store_id` (`NUMBER(3)`, clave primaria), `city` (`VARCHAR2(30)`, obligatoria) y `country` (`VARCHAR2(30)`, obligatoria, `\'Spain\'` si no se indica).',
      clause: '`country` necesita un **DEFAULT** y **NOT NULL**.',
      templateNote: 'Crea `warehouses` con una capacidad de 1000 por defecto.',
      explain: 'Un **INSERT** que no indica `country` recibe `\'Spain\'`. Sin el **DEFAULT**, ese insert falla con ORA-01400.',
    },
    ddl08a: {
      prompt: 'Crea `game_tags`: `tag_id` (`NUMBER(6)`, clave primaria), `game_id` (`NUMBER(4)`, obligatoria, un juego de `games`) y `tag` (`VARCHAR2(20)`, obligatoria).',
      clause: '**REFERENCES** `games (game_id)` en la columna `game_id`.',
      templateNote: 'Crea notas que apuntan a `customers`.',
      explain: 'La clave ajena rechaza una etiqueta para un juego que no existe (ORA-02291). Tiene que apuntar a `games`, no a otra tabla con ids parecidos.',
    },
    ddl08b: {
      prompt: 'Añade a `customers` una columna opcional `favourite_game` (`NUMBER(4)`) que tiene que ser un `game_id` de `games`.',
      clause: '**ALTER TABLE** … **ADD** con **REFERENCES** `games (game_id)`.',
      templateNote: 'Añade a `sales` una columna opcional que apunta a `customers`.',
      explain: '**ADD** puede traer su propia clave ajena. La columna queda a NULL hasta que alguien la rellene y solo admite juegos que existen (ORA-02291).',
    },
    ddl09a: {
      prompt: 'Crea `consoles`: `console_id` (`NUMBER(3)`, clave primaria), `name` (`VARCHAR2(30)`, obligatoria) y `kind` (`VARCHAR2(10)`, obligatoria, solo `\'home\'`, `\'handheld\'` o `\'hybrid\'`).',
      clause: 'Un **CHECK** con **IN** y los tres valores permitidos.',
      templateNote: 'Crea `tickets` cuyo `status` es `\'open\'` o `\'closed\'`.',
      explain: '`CHECK (kind IN (…))` rechaza cualquier otro valor con ORA-02290, y el texto distingue mayúsculas: `\'Home\'` también se rechaza.',
    },
    ddl09b: {
      prompt: 'Añade a `games` una columna obligatoria `discount` (`NUMBER(2)`), 0 por defecto, que solo admita valores de 0 a 50.',
      clause: '**DEFAULT**, **NOT NULL** y un **CHECK** en el mismo **ADD**.',
      templateNote: 'Añade a `customers` unos `credits` obligatorios: 100 por defecto y nunca negativos.',
      explain: 'El **DEFAULT** rellena con 0 los juegos existentes, así que **NOT NULL** es posible. El **CHECK** rechaza 51 y -1 con ORA-02290.',
    },
    ddl10a: {
      prompt: 'Crea `campaigns`: `campaign_id` (`NUMBER(4)`, clave primaria), `game_id` (`NUMBER(4)`, obligatoria, un juego de `games`), `start_date` y `end_date` (`DATE`, obligatorias). `end_date` tiene que ser posterior a `start_date`.',
      clause: 'Un **CHECK** a nivel de tabla que compara las dos fechas.',
      templateNote: 'Crea rebajas de precio, donde el precio nuevo tiene que ser menor que el antiguo.',
      explain: 'Un **CHECK** sobre dos columnas va detrás de ellas, como restricción de tabla. `end_date > start_date` rechaza fechas iguales; `>=` las aceptaría.',
    },
    ddl10b: {
      prompt: 'Crea `loyalty_cards`: `card_id` (`NUMBER(6)`, clave primaria), `customer_id` (`NUMBER(4)`, obligatoria, un cliente de `customers`, como mucho una tarjeta cada uno) y `points` (`NUMBER(6)`, obligatoria, 0 por defecto).',
      clause: '`customer_id` con **NOT NULL**, **UNIQUE** y **REFERENCES**; `points` con **DEFAULT** 0.',
      templateNote: 'Crea un manual por juego, con 1 página por defecto.',
      explain: '**UNIQUE** sobre la clave ajena hace la relación uno a uno: una segunda tarjeta para el mismo cliente falla con ORA-00001.',
    },
    ddl11a: {
      prompt: 'Crea `game_platforms`: `game_id` (`NUMBER(4)`, un juego de `games`), `platform` (`VARCHAR2(10)`) y `launch_price` (`NUMBER(6,2)`, obligatoria). La clave primaria es la pareja (`game_id`, `platform`).',
      clause: 'Una clave compuesta: **PRIMARY KEY** (`game_id`, `platform`) detrás de las columnas.',
      templateNote: 'Crea insignias por cliente, con el cliente y la insignia como clave.',
      explain: 'Un juego puede estar en varias plataformas, pero cada pareja solo una vez. Dos **PRIMARY KEY** en línea son un error: una tabla tiene una sola clave primaria.',
    },
    ddl11b: {
      prompt: 'Crea `reviews`: `customer_id` (`NUMBER(4)`, de `customers`), `game_id` (`NUMBER(4)`, de `games`) y `stars` (`NUMBER(1)`, obligatoria, de 1 a 5). La clave primaria es (`customer_id`, `game_id`).',
      clause: 'Una **PRIMARY KEY** compuesta, dos **REFERENCES** y un **CHECK** con **BETWEEN**.',
      templateNote: 'Crea listas de deseos con las mismas claves y una prioridad de 1 a 3.',
      explain: 'Cada columna apunta a su tabla, así que `reviews` une `customers` y `games`, con una reseña por pareja. El **CHECK** rechaza 0 y 6 con ORA-02290.',
    },
    ddl12a: {
      prompt: 'Crea la vista `sales_detail` con, para cada venta, `sale_id`, el `name` del cliente, el `title` del juego y `total_paid`, en ese orden.',
      clause: '**CREATE VIEW** … **AS** un **SELECT** con dos **JOIN**.',
      templateNote: 'Crea una vista de cada venta con su juego y el país del comprador.',
      explain: 'Una vista guarda la consulta, no las filas, así que siempre muestra los datos actuales. Cada unión va por su clave: `customer_id` con `customers` y `game_id` con `games`.',
    },
    ddl12b: {
      prompt: 'Dos clientes no pueden compartir el mismo `name`. Crea un índice único sobre `customers (name)`.',
      clause: '**CREATE UNIQUE INDEX** … **ON** `customers (name)`.',
      templateNote: 'Crea un índice único sobre dos columnas de `games`.',
      explain: 'Un índice único rechaza un `name` repetido con ORA-00001 y además acelera las búsquedas por nombre. Un índice normal solo las acelera.',
    },
    ddl13a: {
      prompt: 'Crea la vista `genre_sales` con `genre`, `sales_count` (su número de ventas) y `revenue` (la suma de `total_paid`), en ese orden, una fila por género.',
      clause: '**JOIN** de `games` y `sales`, y después **GROUP BY** `genre` con **COUNT** y **SUM**.',
      templateNote: 'Crea el mismo resumen por país del cliente.',
      explain: 'Cuenta ventas, no unidades: `SUM(quantity)` cuenta copias. El dinero está en `sales`, así que `SUM(price)` ignoraría cantidades y descuentos.',
    },
    ddl13b: {
      prompt: 'Crea la vista `customer_purchases` con `customer_id`, `name` y `purchases` (su número de ventas), en ese orden, para todos los clientes, con 0 para los que nunca compraron.',
      clause: '**LEFT JOIN** de `customers` a `sales`, y cuenta `s.sale_id`.',
      templateNote: 'Crea el número de ventas de cada juego, incluidos los no vendidos.',
      explain: 'Un **JOIN** interno pierde a los tres clientes sin ventas. Con **LEFT JOIN**, `COUNT(*)` les daría 1; `COUNT(s.sale_id)` les da 0.',
    },
    ddl14a: {
      prompt: 'Las búsquedas por cliente y después por fecha van lentas. Crea un solo índice sobre `sales` con `customer_id` y `sale_date`, en ese orden.',
      clause: '**CREATE INDEX** … **ON** `sales` con dos columnas entre paréntesis.',
      templateNote: 'Crea un índice sobre `sales` con el juego y la fecha.',
      explain: 'En un índice compuesto el orden importa: (`customer_id`, `sale_date`) ayuda a buscar por cliente. Dos índices separados no son lo mismo.',
    },
    ddl14b: {
      prompt: 'Crea `game_screenshots`: `shot_id` (`NUMBER(6)`, clave primaria), `game_id` (`NUMBER(4)`, obligatoria, un juego de `games`; al borrar el juego se borran sus capturas) y `url` (`VARCHAR2(100)`, obligatoria, única).',
      clause: '**REFERENCES** `games (game_id)` con **ON DELETE CASCADE**.',
      templateNote: 'Crea correos de cliente que desaparecen con su cliente.',
      explain: 'Con **ON DELETE CASCADE**, borrar un juego borra también sus capturas. Sin él, borrar el juego falla con ORA-02292 mientras haya capturas.',
    },
    ddl15a: {
      prompt: 'Crea la vista `premium_games` con `title`, `genre` y `price` de los juegos que cuestan más que el `price` medio de su propio género.',
      clause: 'Una subconsulta correlacionada con el **AVG** del mismo género, en el **WHERE**.',
      templateNote: 'Crea una vista de las ventas por encima de la media de su cliente.',
      explain: 'La subconsulta se ejecuta para cada juego con su propio género. Si comparas con la media de toda la tienda, sale otra lista.',
    },
    ddl15b: {
      prompt: 'Crea `platforms` (`platform_id` `NUMBER(3)` clave primaria, `name` `VARCHAR2(30)` obligatoria). Después añade a `sales` un `platform_id` opcional (`NUMBER(3)`) que referencie `platforms` y crea un índice sobre él.',
      clause: 'Tres sentencias: **CREATE TABLE**, **ALTER TABLE** … **ADD** con **REFERENCES** y **CREATE INDEX**.',
      templateNote: 'Crea `stores`, enlaza `customers` con ellas e indexa el enlace.',
      explain: 'La tabla padre tiene que existir antes de que una clave ajena apunte a ella. La columna nueva queda opcional: las 53 ventas existentes no tienen plataforma.',
    },
  });
})();
