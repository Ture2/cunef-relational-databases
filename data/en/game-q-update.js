'use strict';
/* Query for a Million, UPDATE mode: the texts of data/game-bank-update.js, merged into GAME_TEXT.questions.
   Same fields and md rules as data/en/game.js (§6). Every prompt pins which rows change and to what, so only one
   final state is right. Same ids as data/es/game-q-update.js. Checked by tools/check-game-text.mjs. */
(() => {
  Object.assign(DATA.en.GAME_TEXT.questions, {
    upd01a: {
      prompt: 'New copies of Skyward Cartographer (game 7) have arrived. Set its `stock` to 15.',
      clause: '**UPDATE** `games` **SET** the new value, and a **WHERE** that picks only game 7.',
      templateNote: 'Changes the VIP level of one customer.',
      explain: 'Without **WHERE**, **UPDATE** changes every row of the table. `stock = 15` sets the value; `stock + 15` would add to it.',
    },
    upd01b: {
      prompt: 'Pablo Serrano (customer 8) has moved: set his `country` to `\'Portugal\'`.',
      clause: '**UPDATE** `customers` **SET** the country **WHERE** `customer_id` is 8.',
      templateNote: 'Changes the genre of one game.',
      explain: 'A **WHERE** on the primary key picks exactly one row. Without it, every customer would move to Portugal.',
    },
    upd02a: {
      prompt: 'Hollow Siege (game 5) gets its first `rating`, 7.9, and a new `price`, 44.99. Change both in one **UPDATE**.',
      clause: '**SET** takes several assignments separated by commas.',
      templateNote: 'Changes two columns of one customer.',
      explain: '`SET rating = 7.9, price = 44.99` changes both. Joining them with **AND** is not valid Oracle: it is read as one condition, not two assignments.',
    },
    upd02b: {
      prompt: 'Hugo Lacroix (customer 17) moves to `\'Belgium\'` and reaches VIP level 1. Update both columns.',
      clause: 'One **UPDATE** with two assignments in **SET**.',
      templateNote: 'Changes the price and the stock of one game.',
      explain: 'Both changes go in the same **SET**, separated by a comma, and the **WHERE** picks customer 17 by its key.',
    },
    upd03a: {
      prompt: 'The rating of Pixel Brawlers (game 4) has been withdrawn: leave its `rating` empty.',
      clause: '`SET rating = NULL` empties a value.',
      templateNote: 'Empties the rating of another game.',
      explain: 'In **SET**, `= NULL` assigns no value (only comparisons need **IS NULL**). A rating of 0 would be a real, very bad, rating.',
    },
    upd03b: {
      prompt: 'Sale 12 was recorded with the wrong date: it happened on `2024-06-29`. Fix its `sale_date`.',
      clause: 'Assign a **DATE** literal: `DATE \'YYYY-MM-DD\'`.',
      templateNote: 'Corrects the sign-up date of a customer.',
      explain: '`SET sale_date = DATE \'2024-06-29\'` with `WHERE sale_id = 12`. The old date was 2024-06-19.',
    },
    upd04a: {
      prompt: '20 more copies of `\'Bramble Knight\'` have arrived. Add them to its `stock`, finding the game by its `title`.',
      clause: '`stock = stock + 20`, with a **WHERE** on `title`.',
      templateNote: 'Takes two units off the stock of Tile Tide.',
      explain: 'On the right of `=`, `stock` is the old value, so 2 becomes 22. Text comparisons are case-sensitive: `\'Bramble knight\'` finds no row.',
    },
    upd04b: {
      prompt: 'Léa Moreau goes up one VIP level. Find her by `name` (`\'Léa Moreau\'`) and add 1 to her current level.',
      clause: '`vip_level = vip_level + 1`, with a **WHERE** on `name`.',
      templateNote: 'Lowers the VIP level of Sofia Brandt by one.',
      explain: 'The new value comes from the old one: Léa goes from 1 to 2. Writing `= 1` would leave her where she was.',
    },
    upd05a: {
      prompt: 'Ironclad Vanguard (game 1) is on sale: lower its `price` by 5.00.',
      clause: 'Subtract from the current value: `price - 5`.',
      templateNote: 'Raises the price of another game by 3.',
      explain: '`price = price - 5` turns 59.99 into 54.99. Without **WHERE**, every game would be 5 cheaper.',
    },
    upd05b: {
      prompt: 'Sale 46 was really for 2 copies, not 1. Set its `quantity` to 2 and double its `total_paid`, keeping the discount it had.',
      clause: 'Two assignments: the quantity, and `total_paid * 2`.',
      templateNote: 'Turns another sale into 3 copies.',
      explain: 'Doubling the old `total_paid` keeps the discount: 2 × 43.19 = 86.38. Using the list price, 2 × 47.99, would lose it.',
    },
    upd06a: {
      prompt: 'Every `\'Puzzle\'` game goes up by 1.00.',
      clause: 'A **WHERE** on `genre` picks the group of rows.',
      templateNote: 'Five more units for every Sports game.',
      explain: 'One **UPDATE** changes every row its **WHERE** keeps: the four Puzzle games. The value must match exactly: `\'puzzle\'` changes nothing.',
    },
    upd06b: {
      prompt: 'All customers from `\'Mexico\'` move to VIP level 2.',
      clause: 'Assign the fixed level 2, with a **WHERE** on `country`.',
      templateNote: 'All the German customers move to level 1.',
      explain: 'Customers 4, 12 and 19 end at level 2. Adding 2 to each level would push customer 19 to 4 and break the **CHECK** (ORA-02290).',
    },
    upd07a: {
      prompt: 'All `\'Racing\'` games go up 10%, rounded to 2 decimals.',
      clause: '`ROUND(price * 1.1, 2)` in **SET**.',
      templateNote: 'Strategy games 10% cheaper, rounded.',
      explain: '31.99 × 1.1 = 35.189, rounded to 35.19. Oracle would also round it when storing it in `NUMBER(6,2)`, but `ROUND(x)` without decimals rounds to a whole number.',
    },
    upd07b: {
      prompt: 'Every game that is out of stock (`stock` 0) gets 10 new units: set its `stock` to 10.',
      clause: 'A **WHERE** on `stock = 0` picks the group.',
      templateNote: 'Customers at VIP level 0 move to level 1.',
      explain: 'Four games have no stock. `stock < 5` would also refill Hollow Siege and Bramble Knight, which still have a few.',
    },
    upd08a: {
      prompt: 'Every `\'Action\'` and `\'Adventure\'` game without a rating gets the rating 5; the others keep theirs.',
      clause: '`NVL(rating, 5)` keeps a rating and fills an empty one.',
      templateNote: 'Fills the missing ratings of the Puzzle games with 6.',
      explain: '`NVL(rating, 5)` returns the rating when there is one, and 5 when it is **NULL**: only Hollow Siege and Moonmoss Hollow change.',
    },
    upd08b: {
      prompt: 'Games out of stock (`stock` 0) are 20% off: multiply their `price` by 0.8, rounded to 2 decimals.',
      clause: '`ROUND(price * 0.8, 2)` with a **WHERE** on `stock`.',
      templateNote: 'Games with plenty of stock 5% cheaper.',
      explain: '20% off is paying 80%: 39.99 × 0.8 = 31.992, rounded to 31.99. Multiplying by 0.2 would leave only the discount.',
    },
    upd09a: {
      prompt: 'Customers who signed up in 2023 go up one VIP level, but nobody goes beyond 3 (those at 3 stay at 3).',
      clause: '**CASE** decides the new level, and `EXTRACT(YEAR FROM signup_date)` picks the customers.',
      templateNote: 'Customers who signed up in 2025 go down one level, never below 0.',
      explain: 'Customers 3 and 7 are already at 3: a plain `vip_level + 1` would give 4 and break the **CHECK**. `LEAST(vip_level + 1, 3)` also works.',
    },
    upd09b: {
      prompt: 'New price list for every game: those under 10 go up by 1.00; the rest go up 5%, rounded to 2 decimals.',
      clause: 'A **CASE** in **SET** chooses the formula for each row.',
      templateNote: 'Games with fewer than 10 units get 10 more.',
      explain: '**CASE WHEN** `price < 10` **THEN** `price + 1` **ELSE** `ROUND(price * 1.05, 2)` **END**. Without **WHERE**, all 24 games change.',
    },
    upd10a: {
      prompt: 'Every 2024 sale of 2 or more copies gets a 5% refund: its `total_paid` becomes 95% of what it was, rounded to 2 decimals.',
      clause: 'Two conditions in **WHERE**: the quantity and `EXTRACT(YEAR FROM sale_date)`.',
      templateNote: 'A 2% surcharge on some single-copy sales of 2025.',
      explain: 'Three sales match: 4, 9 and 20. Without the year, the multi-copy sales of 2025 would change too.',
    },
    upd10b: {
      prompt: 'Rating review: unrated games get 6; games rated under 7 get 0.5 more; the rest keep their rating.',
      clause: 'A **CASE** with **IS NULL** first, then the comparison.',
      templateNote: 'Changes the stock of games by their rating.',
      explain: '`rating = NULL` is never true, so the empty ratings need `WHEN rating IS NULL`. Four games get 6, and three rise by 0.5.',
    },
    upd11a: {
      prompt: 'Games that have never been sold get 10% off, rounded to 2 decimals.',
      clause: 'A **WHERE** with **NOT IN** a subquery on `sales`.',
      templateNote: 'Customers who never bought go back to VIP level 0.',
      explain: 'The subquery lists the games sold; **NOT IN** keeps games 9, 17 and 22. **IN** would discount the 21 others.',
    },
    upd11b: {
      prompt: 'Customers at VIP level 0 who bought something in 2024 move to level 1.',
      clause: 'Two conditions: `vip_level = 0` and `customer_id` **IN** the 2024 buyers.',
      templateNote: 'One more unit for games sold in multiples in 2025.',
      explain: 'Customers 4, 8, 11 and 15 change. Without the year, customer 17, who only bought in 2025, would move too.',
    },
    upd12a: {
      prompt: 'For every `\'RPG\'` game, set `stock` to the number of units of it ever sold (0 if it never sold).',
      clause: 'A correlated subquery in **SET**, with **NVL** for the games with no sales.',
      templateNote: 'The VIP level of French customers becomes their number of purchases, at most 3.',
      explain: '`SUM` over no rows is **NULL**, and `stock` is **NOT NULL**: without **NVL**, Embers of Valdren fails with ORA-01407. Units are `SUM(quantity)`, not `COUNT(*)`.',
    },
    upd12b: {
      prompt: 'Recompute every sale of customer 7 at list price: `total_paid` = `quantity` × the game\'s current `price`.',
      clause: 'In **SET**, multiply by a subquery that reads the price from `games`.',
      templateNote: 'Sets each sale of customer 3 to one copy\'s price.',
      explain: 'Only sale 46 changes (it had a discount): 43.19 becomes 47.99. Forgetting `quantity` would undercharge sale 4, which had three copies.',
    },
    upd13a: {
      prompt: 'Games that sold at least as many units as they have in stock get a restock: add twice their total units sold to `stock`.',
      clause: 'The same correlated subquery on `sales`, in **SET** and in **WHERE**.',
      templateNote: 'Customers with 5 or more purchases reach VIP level 3.',
      explain: 'Only games 2, 12 and 20 sold at least their stock. Without the correlation (`s.game_id = g.game_id`) the subquery sums every sale of the shop.',
    },
    upd13b: {
      prompt: 'Customers who have spent more than 150 in total reach VIP level 3.',
      clause: '`customer_id` **IN** a subquery with **GROUP BY** and **HAVING**.',
      templateNote: '10 more units for the games that sold 6 or more.',
      explain: 'Customers 2 and 12 spent more than 150. Filtering single sales above 150 finds none, so nobody would change.',
    },
    upd14a: {
      prompt: 'Take the units sold in 2025 off the `stock` of every `\'Puzzle\'` game; a game with no 2025 sales keeps its stock.',
      clause: 'Subtract a correlated **SUM** for 2025, wrapped in **NVL**.',
      templateNote: 'Adds the number of 2024 sales to each Action game\'s stock.',
      explain: 'Tile Tide loses 7 units. Glass Labyrinth sold nothing in 2025: without **NVL** the result is **NULL** and fails with ORA-01407.',
    },
    upd14b: {
      prompt: 'Customers who bought nothing in 2024 drop one VIP level, but never below 0.',
      clause: '**NOT EXISTS** a 2024 sale, and `GREATEST(vip_level - 1, 0)`.',
      templateNote: 'Games with no 2025 sales lose 5 units, never below 0.',
      explain: 'Elena Paredes and Ximena Robles drop a level; the others are already at 0. A plain `vip_level - 1` would reach −1 and break the **CHECK**.',
    },
    upd15a: {
      prompt: 'Recompute every VIP level from the total each customer has spent: 3 if above 150, 2 if above 100, 1 if above 50, otherwise 0 (customers who never bought included).',
      clause: 'A **CASE** over a correlated **SUM**, with **NVL** for customers without sales; test the biggest threshold first.',
      templateNote: '20 more units for the games that sold 5 or more.',
      explain: '**CASE** returns the first branch that is true, so the order of the **WHEN** matters: testing `> 50` first would put everybody at level 1.',
    },
    upd15b: {
      prompt: 'Games with 3 or more sales get as `price` the average price really paid per unit: their total `total_paid` divided by their total `quantity`, rounded to 2 decimals.',
      clause: 'A correlated subquery in **SET** and a `COUNT(*)` subquery in **WHERE**.',
      templateNote: 'Rates games with 4 or more sales by their average copies per sale.',
      explain: 'Only discounted games change: Ironclad Vanguard to 57.99 and Pitchside Heroes to 46.39. Without **WHERE**, unsold games would get **NULL** (ORA-01407).',
    },
  });
})();
