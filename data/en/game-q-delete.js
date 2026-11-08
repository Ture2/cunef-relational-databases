'use strict';
/* Query for a Million, DELETE mode: the texts of data/game-bank-delete.js, merged into GAME_TEXT.questions.
   Same fields and md rules as data/en/game.js (§6). Values ('Portugal'), schema names and dates (`2024-03-01`)
   stay as written in SQL. Same ids as data/es/game-q-delete.js. */
(() => {
  Object.assign(DATA.en.GAME_TEXT.questions, {
    del01a: {
      prompt: 'Sale 53 was registered by mistake. Delete it from `sales`.',
      clause: '**DELETE FROM** `sales` with a **WHERE** on `sale_id`.',
      templateNote: 'Deletes one customer who never bought anything.',
      explain: '**DELETE** without **WHERE** empties the whole table. `WHERE sale_id = 53` removes exactly one row.',
    },
    del01b: {
      prompt: 'Customer 18, Elena Paredes, closed her account before buying anything. Delete her from `customers`.',
      clause: '**DELETE FROM** `customers` with a **WHERE** on `customer_id`.',
      templateNote: 'Deletes one game that never sold, by its key.',
      explain: 'A filter on the primary key hits exactly one row. Customer 18 has no sales, so no foreign key stops the delete.',
    },
    del02a: {
      prompt: 'The game `\'Slam Court Kings\'` never sold a copy and leaves the catalogue. Delete it from `games` using its `title`.',
      clause: 'A **WHERE** on `title`, with the text in single quotes, exactly as stored.',
      templateNote: 'Deletes a customer found by `name`.',
      explain: 'Text comparisons are case-sensitive in Oracle: `\'slam court kings\'` finds nothing. Deleting every `\'Sports\'` game fails with ORA-02292, because one of them has sales.',
    },
    del02b: {
      prompt: 'Customer 19 disputes all her purchases. Delete every sale of `customer_id` 19 from `sales`, but keep the customer.',
      clause: '**DELETE FROM** `sales`, not `customers`, with a **WHERE** on `customer_id`.',
      templateNote: 'Deletes every sale of one game.',
      explain: 'A **WHERE** on a column that is not the key may remove several rows: here 3. Deleting the customer instead fails with ORA-02292 while her sales exist.',
    },
    del03a: {
      prompt: 'Bulk orders move to another system. Delete the sales with a `quantity` of 3 or more units.',
      clause: 'Compare `quantity` with **>=** in the **WHERE**.',
      templateNote: 'Deletes the sales of the games with an id of 23 or more.',
      explain: '"3 or more" includes 3: `quantity >= 3`. `quantity > 3` deletes nothing, because no sale has more than 3 units.',
    },
    del03b: {
      prompt: 'Some test sales were stored with tiny amounts. Delete the sales whose `total_paid` is less than 5.',
      clause: 'A **WHERE** with **<** on `total_paid`.',
      templateNote: 'Deletes the sales that paid more than 130.',
      explain: '`total_paid < 5` removes the five sales of 4.99. Mind the direction of the sign: `> 5` would delete almost the whole table.',
    },
    del04a: {
      prompt: 'Single copies of game 10 were sold by mistake. Delete the sales of `game_id` 10 whose `quantity` is 1, and keep its bigger sales.',
      clause: 'Join both conditions with **AND**.',
      templateNote: 'Deletes the sales of one customer and one game.',
      explain: '**AND** needs both conditions to be true: 5 rows. **OR** would delete every sale of game 10 and every single-unit sale of the shop.',
    },
    del04b: {
      prompt: 'Customer 2 returned every purchase of more than 1 unit. Delete the sales of `customer_id` 2 with a `quantity` above 1.',
      clause: 'Two conditions with **AND**: the customer and the `quantity`.',
      templateNote: 'Deletes the single-unit sales of customer 7.',
      explain: '`quantity > 1` catches the sales of 2 and of 3 units. `quantity > 2` would miss the sale of 2.',
    },
    del05a: {
      prompt: 'A bug duplicated the sales with a `sale_id` from 50 to 53, both included. Delete them.',
      clause: '**BETWEEN** includes both ends.',
      templateNote: 'Deletes the sales that paid between 40 and 50.',
      explain: '`BETWEEN 50 AND 53` keeps both limits: 4 rows. `> 50 AND < 53` leaves out 50 and 53.',
    },
    del05b: {
      prompt: 'Delete the customers from `\'Portugal\'` whose `vip_level` is 0.',
      clause: 'Two conditions with **AND**; the country is text, in single quotes.',
      templateNote: 'Deletes the `\'Adventure\'` games with exactly 5 copies in stock.',
      explain: 'Only Nuno Barros matches, and he never bought. Deleting every Portuguese customer fails with ORA-02292: João Ventura has sales.',
    },
    del06a: {
      prompt: 'Delete the sales made before 1 March 2024, that is, with a `sale_date` earlier than `2024-03-01`.',
      clause: 'Compare `sale_date` with **<** and a **DATE** literal.',
      templateNote: 'Deletes the sales made after 1 November 2025.',
      explain: '`sale_date < DATE \'2024-03-01\'` leaves 1 March out: 3 sales. `<= DATE \'2024-03-31\'` would also take the March sales.',
    },
    del06b: {
      prompt: 'Delete every sale of June 2025: from `2025-06-01` to `2025-06-30`, both days included.',
      clause: '**BETWEEN** two **DATE** literals, or **>=** and **<**.',
      templateNote: 'Deletes the sales of July 2024.',
      explain: 'There is a sale on 1 June itself. `> DATE \'2025-06-01\'` misses it; **BETWEEN** includes both ends.',
    },
    del07a: {
      prompt: 'Three games never sold: `\'Moonmoss Hollow\'`, `\'Embers of Valdren\'` and `\'Slam Court Kings\'`. Delete the three of them by `title`, in one statement.',
      clause: '**IN** with a list of the three titles.',
      templateNote: 'Deletes two customers by `name` with **IN**.',
      explain: '`title IN (…)` means one title or another. Chaining the titles with **AND** finds nothing: one row cannot have three titles at once.',
    },
    del07b: {
      prompt: 'Delete the games with no `rating` in the `\'Adventure\'` and `\'RPG\'` genres.',
      clause: '**IS NULL** for the missing rating and **IN** for the genres.',
      templateNote: 'Deletes the unrated games priced over 50.',
      explain: '`rating = NULL` is never true, so it deletes nothing. Without the genre filter you also hit two unrated games with sales: ORA-02292.',
    },
    del08a: {
      prompt: 'Delete the sales of `customer_id` 7 except those of games 10 and 21.',
      clause: '**NOT IN** with a list of two `game_id` values.',
      templateNote: 'Deletes the sales of game 15, except those of customers 1 and 2.',
      explain: '`game_id NOT IN (10, 21)` spares both games. `game_id <> 10 OR game_id <> 21` is always true, so it deletes all five sales of customer 7.',
    },
    del08b: {
      prompt: 'Delete the customers who signed up on `2025-03-01` or later and have a `vip_level` below 2.',
      clause: 'Use **>=** on `signup_date` with a **DATE** literal, and **AND** for the level.',
      templateNote: 'Deletes the games priced over 50 with no stock.',
      explain: 'Elena Paredes and Kai Neumann match, and neither bought anything. Without the level filter, Ximena Robles (level 2, with sales) breaks it: ORA-02292.',
    },
    del09a: {
      prompt: 'Games 10 and 11 had a pricing error in 2025. Delete their sales from `2025-01-01` onwards and keep those of 2024.',
      clause: 'Put the two games in an **IN** list (or in parentheses), then add the date with **AND**.',
      templateNote: 'Deletes the 2024 sales of customers 1 and 2.',
      explain: '**AND** binds tighter than **OR**: `game_id = 10 OR game_id = 11 AND …` deletes every sale of game 10. **IN** or parentheses keep the logic right.',
    },
    del09b: {
      prompt: 'Delete every sale made in December (month 12), in any year.',
      clause: '`EXTRACT(MONTH FROM sale_date)` gives the month number.',
      templateNote: 'Deletes every sale made in February.',
      explain: 'There are December sales in 2024 and in 2025: 4 rows. `EXTRACT(MONTH …) = 12` catches both years; a date range for one year misses the other.',
    },
    del10a: {
      prompt: 'Clean up the `\'Adventure\'`, `\'RPG\'` and `\'Sports\'` games that have no `rating` or a `rating` below 7. Delete them.',
      clause: '`rating` **IS NULL** **OR** below 7, in parentheses, joined with **AND** to the genres.',
      templateNote: 'Deletes the `\'Adventure\'` games with no rating or fewer than 6 copies.',
      explain: '`rating < 7` alone skips the NULL ratings. Without parentheses, **AND** binds first and `OR rating < 7` reaches games of other genres that have sales: ORA-02292.',
    },
    del10b: {
      prompt: 'Delete the 2025 sales of more than 1 unit or of more than 100 paid (`total_paid`), except those of customer 12.',
      clause: 'Put the **OR** in parentheses, then join everything with **AND**.',
      templateNote: 'The same filter on 2024, with other limits and another customer.',
      explain: 'Without parentheses, **AND** binds first and the **OR** escapes the year and the customer: sale 29 of customer 12 would go too.',
    },
    del11a: {
      prompt: 'Delete every sale of the `\'Puzzle\'` games. The games themselves stay.',
      clause: '**IN** with a subquery that returns the `game_id` of the Puzzle games.',
      templateNote: 'Deletes the sales of the customers from `\'Chile\'`.',
      explain: '`sales` has no `genre`: the subquery finds the four Puzzle games and **IN** deletes their 13 sales. Deleting from `games` fails with ORA-02292.',
    },
    del11b: {
      prompt: 'Delete the customers who never bought anything, that is, who have no row in `sales`.',
      clause: '**NOT IN** (or **NOT EXISTS**) with a subquery on `sales`.',
      templateNote: 'Deletes the sales of the games that are out of stock.',
      explain: 'The subquery lists every buyer; **NOT IN** keeps the other three customers. **IN** would aim at the buyers and fail with ORA-02292.',
    },
    del12a: {
      prompt: 'Delete the games that have never been sold.',
      clause: 'A correlated **NOT EXISTS**: look for a sale of the same `game_id`.',
      templateNote: 'Deletes the sales of the customers with `vip_level` 0.',
      explain: 'The subquery runs for each game `g`. Without `s.game_id = g.game_id` it only asks whether `sales` has any row at all, and deletes nothing.',
    },
    del12b: {
      prompt: 'Delete the sales of every game that has no `rating`.',
      clause: '**IN** with a subquery that uses **IS NULL**.',
      templateNote: 'Deletes the sales of the games rated below 7.',
      explain: 'Inside the subquery, `rating = NULL` is never true and the list is empty. `rating IS NULL` finds four games; two of them have sales, 3 rows in all.',
    },
    del13a: {
      prompt: 'Delete every sale of the cheapest game in the shop, the one with the lowest `price`.',
      clause: 'Nested subqueries: the **MIN** of `price`, then the `game_id` of that game.',
      templateNote: 'Deletes the sales of the most expensive game.',
      explain: 'Two sales of that game had 3 units, so their `total_paid` is not the price: comparing `total_paid` with the lowest price misses them. Look for the `game_id` instead.',
    },
    del13b: {
      prompt: 'For each customer from `\'France\'`, delete only their most recent sale.',
      clause: 'A correlated subquery: the **MAX** of `sale_date` for the same customer.',
      templateNote: 'Deletes the first sale of each `\'Racing\'` game.',
      explain: 'The subquery is correlated (`s2.customer_id = s.customer_id`): one latest date per customer, 3 rows. Without it, **MAX** is the latest sale of the whole shop, which is not French.',
    },
    del14a: {
      prompt: 'Hugo Lacroix, customer 17, asks to be erased with all his data. Delete his sales and then the customer: two statements, in the right order.',
      clause: 'Two **DELETE FROM**: first the children (`sales`), then the parent (`customers`).',
      templateNote: 'Erases customer 11 and their sales, children first.',
      explain: 'While a sale points to the customer, deleting the customer fails with ORA-02292. Delete the children first, then the parent.',
    },
    del14b: {
      prompt: 'Retire the game `\'Skyline Overdrive\'`: delete its sales and then the game itself, finding it by its `title`.',
      clause: 'A subquery finds its `game_id` for the first **DELETE FROM**; the second one deletes the game.',
      templateNote: 'Retires `\'Neon Ronin\'` the same way.',
      explain: 'The order matters: the sales first, then the game. Delete the game first and Oracle stops with ORA-02292.',
    },
    del15a: {
      prompt: 'The shop leaves `\'Portugal\'`. Delete every customer from that country together with all their sales.',
      clause: 'First the sales, with **IN** and a subquery on `customers`; then the customers.',
      templateNote: 'Does the same for the customers from `\'Uruguay\'`.',
      explain: 'Two customers go, plus the three sales of one of them. Deleting only the customers without sales leaves João Ventura behind.',
    },
    del15b: {
      prompt: 'Retire every game that is out of stock (`stock` 0), together with its sales.',
      clause: 'Delete from `sales` with **IN** and a subquery, then delete from `games`.',
      templateNote: 'Retires the `\'Sports\'` games and their sales.',
      explain: 'Four games have no stock and three of them have sales. Delete those 4 sales first; then all four games can go.',
    },
  });
})();
