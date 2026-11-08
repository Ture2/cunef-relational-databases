'use strict';
/* Query for a Million, INSERT mode: the texts of data/game-bank-insert.js, merged into GAME_TEXT.questions.
   Same fields and md rules as data/en/game.js (§6): prompt, clause, templateNote, explain. Values ('Spain'),
   schema names and dates (`2025-09-01`) stay as written in SQL. Every prompt pins every value, so only one final
   state is right. The Spanish file data/es/game-q-insert.js has the same ids. Checked by tools/check-game-text.mjs. */
(() => {
  Object.assign(DATA.en.GAME_TEXT.questions, {
    ins01a: {
      prompt: 'A new customer signs up: id 101, `name` `\'Nora Lindqvist\'`, `country` `\'Sweden\'`, `signup_date` `2025-09-01` and `vip_level` 0. Add her to `customers`.',
      clause: '**INSERT INTO** `customers` with a **VALUES** list in the order of the columns.',
      templateNote: 'Adds a new game to `games`, naming every column.',
      explain: 'Name the columns and give one value per column, in the same order. A date is written `DATE \'2025-09-01\'`.',
    },
    ins01b: {
      prompt: 'Add game 101 to `games`: `title` `\'Lumen Drift\'`, `genre` `\'Racing\'`, `price` 24.99, `stock` 30 and `rating` 7.5.',
      clause: '**INSERT INTO** `games` **VALUES** (…): without a column list, one value per column in table order.',
      templateNote: 'Adds a customer without naming the columns.',
      explain: 'Without a column list the values follow the table: `game_id`, `title`, `genre`, `price`, `stock`, `rating`. Swapping `price` and `stock` still runs, but stores the wrong data.',
    },
    ins02a: {
      prompt: 'Add game 102: `title` `\'Paper Comets\'`, `genre` `\'Puzzle\'`, `price` 5.99 and `stock` 60. It has no rating yet, so `rating` stays empty.',
      clause: 'List only the columns you fill: the missing `rating` becomes **NULL**.',
      templateNote: 'Adds a sale, naming every column.',
      explain: 'A column left out of the list gets **NULL** (or its default). A rating of 0 is not the same as no rating at all.',
    },
    ins02b: {
      prompt: 'Add customer 102: `\'Malik Haddad\'` from `\'France\'`, signed up on `2025-10-15`, VIP level 1. Try naming the columns in another order than the table\'s.',
      clause: 'With a column list, the values follow your list, in the order you chose.',
      templateNote: 'Adds a game, listing its columns in another order.',
      explain: 'When you name the columns, the order is yours: the values only have to follow it. The date is `DATE \'2025-10-15\'`.',
    },
    ins03a: {
      prompt: 'Nuno Barros (customer 13) buys one copy of game 8 on `2025-12-20` and pays 14.99. Record it as sale 1001.',
      clause: 'A **DATE** literal: `DATE \'YYYY-MM-DD\'`.',
      templateNote: 'Records another sale with its date.',
      explain: '`DATE \'2025-12-20\'` is a date literal. `customer_id` must exist in `customers`: a wrong id fails with ORA-02291.',
    },
    ins03b: {
      prompt: 'Add game 103: `\'Harbor Lights\'`, genre `\'Adventure\'`, price 19.99, `stock` 0 (not arrived yet) and no rating. Write all six values, with **NULL** where there is none.',
      clause: 'Write **NULL** in the place of the missing `rating`.',
      templateNote: 'Adds a game with no rating yet.',
      explain: '**NULL** means no value. `stock` is **NOT NULL**, so a **NULL** there fails with ORA-01400, while 0 is a real number.',
    },
    ins04a: {
      prompt: 'Sofia Brandt (customer 5) buys 2 copies of Kingdoms of Brass (game 23, 44.99 each) on `2025-12-01`. Record sale 1002 with the right `total_paid`.',
      clause: '`total_paid` is the quantity times the price: 2 × 44.99.',
      templateNote: 'Records a sale of 3 copies.',
      explain: '`total_paid` holds the whole sale: 2 × 44.99 = 89.98. You may even write `2 * 44.99` inside **VALUES**.',
    },
    ins04b: {
      prompt: 'Add game 104 titled `Captain\'s Tide` (with the apostrophe): genre `\'Adventure\'`, price 27.50, `stock` 12, rating 8.0.',
      clause: 'Inside a text, a single quote is written twice: `\'Captain\'\'s Tide\'`.',
      templateNote: 'Adds a customer whose name has an apostrophe.',
      explain: 'A quote ends a text in SQL, so a quote inside it is doubled. Without the apostrophe the title is a different one.',
    },
    ins05a: {
      prompt: 'Kai Neumann (customer 20) buys 3 copies of Tile Tide (game 10, 4.99 each) on `2025-12-24`, with 1.00 off the whole sale. Record sale 1003.',
      clause: 'Compute `total_paid` as 3 × 4.99 − 1.00.',
      templateNote: 'Records a sale of 2 copies.',
      explain: '3 × 4.99 = 14.97, minus the 1.00 discount: 13.97. `total_paid` is what the customer really paid.',
    },
    ins05b: {
      prompt: 'Add customer 104, `\'Tobias Krämer\'` from `\'Germany\'`, signed up on `2025-12-02`, at the highest VIP level the shop has.',
      clause: '`vip_level` has a **CHECK** between 0 and 3.',
      templateNote: 'Adds a game with a rating.',
      explain: 'The **CHECK** on `vip_level` only accepts 0 to 3, so the highest level is 3. A 4 fails with ORA-02290.',
    },
    ins06a: {
      prompt: 'Elena Paredes (customer 18) makes her first purchases on `2025-12-05`: one copy of game 6 (29.99) as sale 1004 and two copies of game 13 (8.99 each) as sale 1005.',
      clause: 'Two **INSERT** statements, one per sale, separated by `;`.',
      templateNote: 'Two sales for another customer.',
      explain: 'Each row needs its own values. The second total is 2 × 8.99 = 17.98.',
    },
    ins06b: {
      prompt: 'Add two games: 105 `\'Copper Canyon Rally\'` (`\'Racing\'`, 34.99, `stock` 15, not rated) and 106 `\'Pocket Riddle Box\'` (`\'Puzzle\'`, 3.99, `stock` 100, rating 7).',
      clause: 'One **INSERT** per game, with **NULL** for the missing rating.',
      templateNote: 'Adds two customers.',
      explain: 'Each row gets its own values: **NULL** for the unrated game, 7 for the other.',
    },
    ins07a: {
      prompt: 'Three friends from `\'Chile\'` sign up on `2025-12-10`, all at VIP level 0: 105 `\'Camila Rojas\'`, 106 `\'Matías Soto\'` and 107 `\'Javiera Pino\'`.',
      clause: 'Three rows: three **INSERT** statements, or one with three rows of values.',
      templateNote: 'Adds three games of a series.',
      explain: 'Every row needs its own key. Oracle 23ai also takes one **INSERT** with several rows, `VALUES (…), (…), (…)`, and every version takes `INSERT ALL`.',
    },
    ins07b: {
      prompt: 'Oskar Lind signs up as customer 108 (`\'Sweden\'`, `2025-12-12`, VIP level 0) and, the same day, buys one copy of game 15 (44.99): sale 1006.',
      clause: 'The customer must exist before the sale that points to him.',
      templateNote: 'Adds a game and then a sale of it.',
      explain: '`sales.customer_id` references `customers`: inserting the sale first fails with ORA-02291. The parent row goes first.',
    },
    ins08a: {
      prompt: 'Camille Dufour (customer 3, VIP 3) buys 2 copies of game 14 (69.99 each) on `2025-12-15`: sale 1007. VIP 3 customers get 10% off; round `total_paid` to 2 decimals.',
      clause: 'Compute the total inside **VALUES**, with `ROUND(x, 2)`.',
      templateNote: 'Records a sale with 15% off.',
      explain: '10% off means paying 90%: 2 × 69.99 × 0.9 = 125.982, rounded to 125.98.',
    },
    ins08b: {
      prompt: 'Add game 107 `\'Glass Labyrinth Deluxe\'` (`\'Puzzle\'`, `stock` 20, not rated), priced 25% above Glass Labyrinth\'s 12.99 and rounded to 2 decimals.',
      clause: 'Compute the price with `ROUND(x, 2)` inside **VALUES**.',
      templateNote: 'Adds a gold edition that costs half as much again.',
      explain: '12.99 × 1.25 = 16.2375. **ROUND** gives 16.24, and Oracle would round the same way when storing it in `NUMBER(6,2)`. `TRUNC` would cut it to 16.23.',
    },
    ins09a: {
      prompt: 'Neon Ronin comes back: add game 109 `\'Neon Ronin Remastered\'` (`\'Action\'`, 29.99, `stock` 10) with the same rating as the original, 7.6.',
      clause: '`title` is **UNIQUE**: the new title must differ from the old one.',
      templateNote: 'Adds a remastered Puzzle game.',
      explain: '`title` has a **UNIQUE** constraint: reusing `\'Neon Ronin\'` fails with ORA-00001.',
    },
    ins09b: {
      prompt: 'Greta Vogel (customer 11) buys on `2025-12-18`: one copy of game 2 (39.99) as sale 1008 and two copies of game 24 (32.99 each) as sale 1009. Name all six columns.',
      clause: 'Every **NOT NULL** column needs a value, `quantity` included.',
      templateNote: 'Two sales for another customer, naming the columns.',
      explain: 'Leaving `quantity` out of the column list tries a **NULL** and fails with ORA-01400. The second total is 2 × 32.99 = 65.98.',
    },
    ins10a: {
      prompt: 'Launch game 110 `\'Starlit Racers\'` (`\'Racing\'`, 22.50, `stock` 50, not rated) and record its first sales on `2025-12-28`: sale 1010, customer 2, one copy; sale 1011, customer 7, two copies.',
      clause: 'Three **INSERT** statements, the game first.',
      templateNote: 'A new customer and two of their sales.',
      explain: 'Both sales point to game 110, so the game goes first. The second sale pays 2 × 22.50 = 45.',
    },
    ins10b: {
      prompt: 'Add customers 109 `\'Léon Garnier\'` (`\'France\'`, `2025-12-20`, VIP 2) and 110 `\'Ada Moretti\'` (`\'Italy\'`, `2025-12-21`, VIP 3), then Ada\'s first sale: 1012, one copy of game 14 at 69.99 on `2025-12-21`.',
      clause: 'Customers first, then the sale that references customer 110.',
      templateNote: 'A new game and a sale of it.',
      explain: 'The order matters only for the foreign key: the sale needs customer 110 to exist. VIP levels must stay between 0 and 3.',
    },
    ins11a: {
      prompt: 'Christmas gift: every customer from `\'Spain\'` gets one free copy of game 10 on `2025-12-31` (`total_paid` 0). Each `sale_id` is 1000 + the `customer_id`. Use one **INSERT** … **SELECT**.',
      clause: '**INSERT INTO** `sales` **SELECT** … **FROM** `customers` **WHERE** the country.',
      templateNote: 'Gifts for the customers from Italy.',
      explain: '**INSERT** … **SELECT** adds one row per row of the query: four Spanish customers, four sales, with ids 1001, 1008, 1014 and 1018.',
    },
    ins11b: {
      prompt: 'Add a deluxe edition of every `\'Strategy\'` game: `game_id` + 100, the title followed by `\' Deluxe\'`, the same genre, the price plus 10, `stock` 5 and no rating.',
      clause: '**SELECT** from `games` the computed values of each new row.',
      templateNote: 'Lite editions of the Sports games.',
      explain: 'The **SELECT** builds each new row from an old one: `title || \' Deluxe\'` keeps the space, and the rating starts empty (**NULL**).',
    },
    ins12a: {
      prompt: 'Customer 7 orders again, on `2026-01-05`, one copy of every game she has bought before (each game once), at today\'s `price`. Each `sale_id` is 1100 + the `game_id`.',
      clause: '**JOIN** `sales` with `games` for the price, and **DISTINCT** for each game once.',
      templateNote: 'The same reorder for customer 2.',
      explain: 'Customer 7 bought Tile Tide twice: without **DISTINCT** sale 1110 would go in twice (ORA-00001). The price comes from `games`, not from the old `total_paid`.',
    },
    ins12b: {
      prompt: 'For each 2025 sale of a `\'Racing\'` game, the same customer gets a free copy of game 18 on `2026-01-10`: `sale_id` = the old `sale_id` + 1000, quantity 1, `total_paid` 0.',
      clause: '**JOIN** `sales` with `games` to filter by genre, and filter the year too.',
      templateNote: 'Gifts for the 2024 buyers of Strategy games.',
      explain: 'The genre lives in `games`, so the **JOIN** is needed. `EXTRACT(YEAR FROM s.sale_date) = 2025` keeps only sales 35 and 39.',
    },
    ins13a: {
      prompt: 'Loyalty gift: every customer who has spent more than 150 in total gets a free copy of game 10 on `2026-01-15` (`total_paid` 0). `sale_id` = 2000 + `customer_id`.',
      clause: '**GROUP BY** `customer_id` with **HAVING** on the sum of `total_paid`.',
      templateNote: 'A gift sale for each best-selling game.',
      explain: '**HAVING** `SUM(total_paid) > 150` keeps customers 2 and 12. A **WHERE** `total_paid > 150` would look at single sales and find none.',
    },
    ins13b: {
      prompt: 'Add game 112 `\'Genre Sampler\'` (`\'Strategy\'`, `stock` 0, not rated), priced at the average price of all games, rounded to 2 decimals. Compute it with **INSERT** … **SELECT**.',
      clause: '`ROUND(AVG(price), 2)` from `games`, inside the **SELECT**.',
      templateNote: 'A game priced like the cheapest Puzzle game.',
      explain: 'An aggregate **SELECT** returns one row, so one game is added, priced 32.14. Rounding to one decimal, or averaging only Strategy games, gives another price.',
    },
    ins14a: {
      prompt: 'Welcome back: every customer who has never bought anything gets a free copy of game 10 on `2026-02-01` (`total_paid` 0). `sale_id` = 3000 + `customer_id`.',
      clause: '**NOT EXISTS** with a subquery on the sales of the same customer.',
      templateNote: 'A sale for each game never sold.',
      explain: '**NOT EXISTS** keeps customers 13, 18 and 20. With **EXISTS** the gift would go to the 17 buyers instead.',
    },
    ins14b: {
      prompt: 'Every game that sold more than 5 units in total gets a bundle edition: `game_id` + 200, the title followed by `\' Bundle\'`, the same genre, double price rounded to 2 decimals, `stock` 10, no rating.',
      clause: '`game_id` **IN** a subquery with **GROUP BY** and **HAVING** on `SUM(quantity)`.',
      templateNote: 'Classic editions of the games with at least 4 buyers.',
      explain: 'Units are `SUM(quantity)`: games 10, 4 and 15. Counting sales with `COUNT(*)` would keep only game 10.',
    },
    ins15a: {
      prompt: 'Every customer who bought both in 2024 and in 2025 gets a gift sale on `2026-03-01`: game 13, `quantity` = their number of purchases in 2025, `total_paid` 0, `sale_id` = 4000 + `customer_id`.',
      clause: '**GROUP BY** the customer over the 2025 sales, with an **IN** subquery for the 2024 buyers.',
      templateNote: 'One sale per game bought at least twice in 2024.',
      explain: 'The **WHERE** keeps the 2025 sales of 2024 buyers, then `COUNT(*)` per customer gives the quantity. Customers 17 and 19 bought only in 2025, so they get nothing.',
    },
    ins15b: {
      prompt: 'Customer 1 buys, on `2026-03-15`, one copy of every `\'Adventure\'` game that has sold fewer than 3 units in total, games never sold included. `sale_id` = 5000 + `game_id`; `total_paid` = the current price.',
      clause: '**LEFT JOIN** to `sales`, **GROUP BY** the game, **HAVING** with **NVL** for games without sales.',
      templateNote: 'A gift for each Spanish customer with fewer than 3 purchases.',
      explain: 'Moonmoss Hollow (game 9) never sold: only a **LEFT JOIN** keeps it, and `NVL(SUM(s.quantity), 0)` turns its **NULL** sum into 0. The result: games 8 and 9.',
    },
  });
})();
