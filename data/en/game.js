'use strict';
/* Query for a Million (#/game): every player-facing text of the quiz. Contract: docs/game-quiz.md §6.
   The SQL, the questions' solutions and the data live in data/game-bank.js (language-neutral).
   md fields use only **bold** and `code`; paragraphs are separated by a blank line (\n\n). Schema names, SQL and
   values ('Puzzle', 'Spain') stay in English. {prize} is filled by js/game.js.
   Checked by tools/check-game-text.mjs (keys, md, word limits, sentence case, no TV-show catchphrases). */
(() => {
  DATA.en.GAME_TEXT = {
    title: 'Query for a Million',
    tagline: '15 questions, one database, a million on the line.',
    intro: 'SQL-Bot asks you **15 questions** about the database of a video-game shop: `customers`, `games` and `sales`. You answer each one with an Oracle `SELECT`, and every right answer climbs one rung towards a million euros.\n\n'
      + '**Run** is free: try your query as often as you like. **Lock in** is your answer and it counts: a wrong one ends the game, unless Review saves you. Rungs 5 and 10 are safe, and you can walk away at any time.',

    host: {
      welcome: 'Welcome! Fifteen questions to a million. Let\'s play.',
      ask: ['Here is your question.', 'Read it twice, query once.', 'The database is listening.', 'Next one. Take your time.', 'What do you make of this one?'],
      lock: 'Lock it in?',
      suspense: 'Let\'s ask the database…',
      correct: ['Correct! The rows match.', 'Spot on! Up you go.', 'The database agrees!', 'Exactly right. Next rung!'],
      wrong: 'Oh no… that is not the result.',
      rescue: 'Wait! Review can still save you. Try again?',
      safe: 'Safe rung! {prize} is yours.',
      walk: 'A wise move. You leave with {prize}.',
      win: 'One million euros! What a query!',
      bands: {
        easy: 'Easy band: one table at a time.',
        medium: 'Medium band: count and group.',
        hard: 'Hard band: time to join tables!',
      },
      // Said when a run of that mode starts.
      modes: {
        select: 'Questions tonight: ask the shop and read its answers.',
        insert: 'Tonight you add rows. Every value counts!',
        update: 'Tonight you change rows. Mind your WHERE!',
        delete: 'Tonight you delete rows. Careful, no undo here!',
        ddl: 'Tonight you build tables, views and indexes.',
        mixed: 'Mixed stage: every kind of SQL, all in one run!',
      },
    },

    bands: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },

    // The stage tiles of the select screen: name, keyword on the tile, tooltip (≤ 12 words).
    // welcome repeats host.modes.<mode> (js/game.js reads either).
    modes: {
      select: { name: 'Query', keyword: 'SELECT', blurb: 'Read the shop: filter, sort, count, group and join.', welcome: 'Questions tonight: ask the shop and read its answers.' },
      insert: { name: 'Insert', keyword: 'INSERT', blurb: 'Add new customers, games and sales, one row or many.', welcome: 'Tonight you add rows. Every value counts!' },
      update: { name: 'Update', keyword: 'UPDATE', blurb: 'Change prices, stock and levels with SET and WHERE.', welcome: 'Tonight you change rows. Mind your WHERE!' },
      delete: { name: 'Delete', keyword: 'DELETE', blurb: 'Remove exactly the right rows, foreign keys permitting.', welcome: 'Tonight you delete rows. Careful, no undo here!' },
      ddl: { name: 'Structure', keyword: 'CREATE', blurb: 'Create tables, columns, views and indexes.', welcome: 'Tonight you build tables, views and indexes.' },
      mixed: { name: 'Mixed', keyword: 'MIX', blurb: 'All five kinds in one run. Reach rung 5 everywhere first.', welcome: 'Mixed stage: every kind of SQL, all in one run!' },
    },
    stage: { title: 'Choose your stage', locked: 'Reach rung 5 in every stage to unlock it.' },

    lifelines: {
      clause: { name: 'Key clause', blurb: 'SQL-Bot names the clause the answer needs and the shape of the result.' },
      template: { name: 'Template', blurb: 'A query with the same shape on other data, ready to insert and adapt.' },
      review: { name: 'Review', blurb: 'Checks your last query and says what is off. While unused, it forgives one wrong lock-in.' },
    },

    questions: {
      /* ───── Easy ───── */
      r01a: {
        prompt: 'List the games of the genre `\'Puzzle\'`: show `title` and `price`.',
        clause: 'Filter the rows with **WHERE** on the column `genre`.',
        templateNote: 'Customers from Italy: the same kind of filter on another table.',
        explain: '**WHERE** keeps only the rows that meet the condition. Text values go in single quotes, and Oracle tells capitals apart: `\'puzzle\'` finds nothing.',
      },
      r01b: {
        prompt: 'Show the customers from `\'Mexico\'`: their `name` and `signup_date`.',
        clause: 'A **WHERE** on `country` keeps a single country.',
        templateNote: 'Racing games and their stock: one filter on `games`.',
        explain: '`WHERE country = \'Mexico\'` keeps three customers. The value must match exactly, capitals included: `\'MEXICO\'` returns no rows.',
      },
      r01c: {
        prompt: 'Which games are running out? Show the `title` and `stock` of the games with fewer than 5 units in stock.',
        clause: 'Use **WHERE** with a comparison on `stock`.',
        templateNote: 'Customers whose VIP level is below 1.',
        explain: 'Fewer than 5 is `stock < 5`. With `<= 5`, a game with exactly 5 units would sneak in.',
      },
      r02a: {
        prompt: 'Show the `title` and `price` of the `\'Racing\'` games, from the most expensive to the cheapest.',
        clause: 'Filter with **WHERE**, then sort with **ORDER BY** `price` **DESC**.',
        templateNote: 'Customers from France, most recent sign-up first.',
        explain: '**ORDER BY** sorts the result and **DESC** puts the highest value first. Without **DESC** the order is ascending: cheapest first.',
      },
      r02b: {
        prompt: 'List the customers from `\'Spain\'` with their `name` and `signup_date`, from the oldest sign-up to the newest.',
        clause: '**WHERE** for the country and **ORDER BY** `signup_date` (ascending is the default).',
        templateNote: 'Puzzle games from the cheapest to the most expensive.',
        explain: 'Dates sort like numbers: the oldest is the smallest. **ORDER BY** is ascending unless you write **DESC**.',
      },
      r02c: {
        prompt: 'Show the `name` and `country` of the customers with VIP level 3 (`vip_level`), in alphabetical order of `name`.',
        clause: '**WHERE** on `vip_level`, then **ORDER BY** `name`.',
        templateNote: 'Out-of-stock games, sorted by title.',
        explain: '**ORDER BY** `name` sorts text from A to Z. Without it, the rows come in whatever order the database finds them, often by id.',
      },
      r03a: {
        prompt: 'Find the games whose `title` starts with `Sky`. Show `title` and `price`.',
        clause: 'Use **LIKE** with the wildcard `%`.',
        templateNote: 'Customers whose name starts with M.',
        explain: '`LIKE \'Sky%\'` means “starts with Sky”: `%` stands for any text. With `\'%Sky%\'` you would also get Blue Sky Derby, which only contains it.',
      },
      r03b: {
        prompt: 'Show the `title` and `price` of the games that cost from `19.99` to `29.99`, both prices included.',
        clause: '**BETWEEN** includes both ends of the range.',
        templateNote: 'Customers who signed up in the first half of 2024.',
        explain: '`price BETWEEN 19.99 AND 29.99` is the same as `price >= 19.99 AND price <= 29.99`. With `>` and `<`, the games at exactly 19.99 or 29.99 drop out.',
      },
      r03c: {
        prompt: 'List the customers from `\'Argentina\'`, `\'Chile\'` or `\'Uruguay\'`: show `name` and `country`.',
        clause: '**IN** checks a value against a list.',
        templateNote: 'Sports and Strategy games: **IN** with two genres.',
        explain: '`country IN (\'Argentina\', \'Chile\', \'Uruguay\')` is a short way to write three conditions joined by **OR**.',
      },
      r04a: {
        prompt: 'Some games have not been rated yet. Show the `title` and `genre` of the games with no `rating`.',
        clause: 'Missing values are **NULL**: test them with **IS NULL**.',
        templateNote: 'Rated games that cost more than 50.',
        explain: '**NULL** is not a value, so `rating = NULL` is never true and returns nothing. Only **IS NULL** finds the missing ratings.',
      },
      r04b: {
        prompt: 'Which countries have customers with VIP level 2 or more (`vip_level`)? Show each `country` once.',
        clause: '**DISTINCT** removes repeated rows.',
        templateNote: 'The genres that have a game out of stock, each once.',
        explain: 'Spain has two such customers, so without **DISTINCT** it would appear twice. “2 or more” is `>= 2`.',
      },
      r04c: {
        prompt: 'Which genres have at least one game that costs less than 10? Show each `genre` once.',
        clause: '**DISTINCT** right after **SELECT** shows each genre once.',
        templateNote: 'The countries with customers at VIP level 0, each once.',
        explain: 'Four games cost less than 10, but they belong to only two genres. **DISTINCT** folds the repeats into one row each.',
      },
      r05a: {
        prompt: 'Show the `title` and `price` of the 3 most expensive games that are in stock (`stock` above 0), most expensive first.',
        clause: 'Sort with **ORDER BY** … **DESC**, then keep 3 rows with **FETCH FIRST**.',
        templateNote: 'The two oldest sign-ups among VIP customers.',
        explain: 'Filter, then sort, then cut: `FETCH FIRST 3 ROWS ONLY` keeps the top 3. Embers of Valdren costs more, but it has no stock.',
      },
      r05b: {
        prompt: 'Show the `name` and `signup_date` of the 3 most recent sign-ups with VIP level 1 or more (`vip_level`), newest first.',
        clause: '**ORDER BY** `signup_date` **DESC** and **FETCH FIRST** 3 rows.',
        templateNote: 'The two Action games with the most stock.',
        explain: 'Newest first means **DESC** on the date. Oracle has no **LIMIT**: `FETCH FIRST 3 ROWS ONLY` does the cut.',
      },
      r05c: {
        prompt: 'Show the `title`, `genre` and `price` of the 3 cheapest games in the genres `\'Action\'` or `\'Adventure\'`, cheapest first.',
        clause: '**IN** for the two genres, **ORDER BY** `price`, then **FETCH FIRST** 3 rows.',
        templateNote: 'The two earliest sign-ups from Italy or Germany.',
        explain: '**IN** keeps both genres, the ascending sort puts the cheapest on top, and **FETCH FIRST** keeps 3.',
      },

      /* ───── Medium ───── */
      r06a: {
        prompt: 'How many games of the genre `\'RPG\'` does the shop have in its catalogue? Return one number.',
        clause: '`COUNT(*)` counts rows.',
        templateNote: 'How many customers come from France.',
        explain: '`COUNT(*)` counts every row that passes the **WHERE**. `COUNT(rating)` would skip the RPG with no rating and say 3.',
      },
      r06b: {
        prompt: 'What is the average `price` of all the games, rounded to 2 decimals? Return one number.',
        clause: '**AVG** computes the average and `ROUND(x, 2)` keeps 2 decimals.',
        templateNote: 'The average amount paid per sale, rounded.',
        explain: '`ROUND(AVG(price), 2)` gives 32.14. Without **ROUND** you get 32.1358…, and `ROUND(x)` with no second argument rounds to a whole number.',
      },
      r06c: {
        prompt: 'What are the lowest and the highest `price` among the `\'Adventure\'` games? Return two columns: the lowest first, then the highest.',
        clause: '**MIN** and **MAX**, with a **WHERE** on the genre.',
        templateNote: 'The first and the last sign-up dates of the customers from Spain.',
        explain: 'An aggregate without **GROUP BY** returns one row for the whole filtered table. The order of the columns matters: **MIN** first.',
      },
      r07a: {
        prompt: 'How many games have a rating? Return one number.',
        clause: '`COUNT(column)` skips the **NULL** values.',
        templateNote: 'How many Puzzle games have a rating.',
        explain: '`COUNT(rating)` counts only the rows where `rating` is not **NULL**: 20 of 24. `COUNT(*)` counts every row.',
      },
      r07b: {
        prompt: 'In 2025, how many units were sold in total (`quantity`) and how much money came in (`total_paid`)? Return the two numbers in that order; round the money to 2 decimals.',
        clause: '**SUM** both columns, and keep 2025 with `EXTRACT(YEAR FROM sale_date)`.',
        templateNote: 'Units and money from the sales of game 10.',
        explain: 'Units are `SUM(quantity)`, not `COUNT(*)`: one sale can carry several copies. `EXTRACT(YEAR FROM sale_date) = 2025` keeps the year.',
      },
      r07c: {
        prompt: 'How many different customers have bought at least once? Return one number.',
        clause: 'Count the distinct `customer_id` values of `sales` with `COUNT(DISTINCT …)`.',
        templateNote: 'How many genres have a game that costs more than 40.',
        explain: '`COUNT(DISTINCT customer_id)` counts each buyer once: 17. `COUNT(customer_id)` counts the 53 sales.',
      },
      r08a: {
        prompt: 'How many games does each genre have? Show `genre` and the number of games.',
        clause: '**GROUP BY** `genre` with `COUNT(*)`.',
        templateNote: 'How many customers each country has.',
        explain: '**GROUP BY** makes one row per genre, and `COUNT(*)` counts the games in each group.',
      },
      r08b: {
        prompt: 'How many customers are there at each VIP level? Show `vip_level` and the number of customers.',
        clause: '**GROUP BY** `vip_level` and count.',
        templateNote: 'How many sales each game has.',
        explain: 'One group per value of `vip_level`, from 0 to 3, each with its `COUNT(*)`.',
      },
      r08c: {
        prompt: 'How many units are in stock for each genre? Show `genre` and the total `stock`.',
        clause: '**GROUP BY** `genre` with the **SUM** of `stock`.',
        templateNote: 'The units bought by each customer.',
        explain: '**SUM** adds up the stock of the games in each group. `COUNT(stock)` would count games, not units.',
      },
      r09a: {
        prompt: 'Which genres have more than 3 games? Show `genre` and the number of games.',
        clause: 'Filter the groups with **HAVING**, not **WHERE**.',
        templateNote: 'Countries with more than 2 customers.',
        explain: '**WHERE** filters rows before grouping; **HAVING** filters groups after it. “More than 3” is `> 3`: Racing, with exactly 3, stays out.',
      },
      r09b: {
        prompt: 'Which customers have made at least 4 purchases? Show `customer_id` and their number of purchases (rows in `sales`).',
        clause: '**GROUP BY** `customer_id` and **HAVING** on the count; “at least” is `>=`.',
        templateNote: 'Games sold at least 3 times.',
        explain: '“At least 4” includes 4, so it is `>= 4`. With `> 4`, customers 2 and 10, who have exactly 4, would disappear.',
      },
      r09c: {
        prompt: 'Which genres have an average `price` above 30? Show `genre` and that average rounded to 2 decimals.',
        clause: 'The condition is on an average, so it goes in **HAVING**.',
        templateNote: 'Countries whose average VIP level is above 1.',
        explain: '`WHERE price > 30` would drop the cheap games before averaging and change the averages. `HAVING AVG(price) > 30` judges each whole genre.',
      },
      r10a: {
        prompt: 'Which 3 games sold the most units? Show `game_id` and the total `quantity` sold, highest first.',
        clause: '**GROUP BY** `game_id`, **ORDER BY** the **SUM** descending, then **FETCH FIRST** 3 rows.',
        templateNote: 'The country with the most customers.',
        explain: 'Units are `SUM(quantity)`. You can sort by an aggregate, `ORDER BY SUM(quantity) DESC`, and then cut with **FETCH FIRST**.',
      },
      r10b: {
        prompt: 'For each year of sales, show the year, the number of sales and the revenue (`total_paid`) rounded to 2 decimals, in order of year.',
        clause: 'Group by `EXTRACT(YEAR FROM sale_date)` and sort by the same expression.',
        templateNote: 'Customer sign-ups per year.',
        explain: 'You can group by an expression: `EXTRACT(YEAR FROM sale_date)` gives one group per year. Repeat the same expression in **SELECT**, **GROUP BY** and **ORDER BY**.',
      },
      r10c: {
        prompt: 'Which customers have spent more than 120 in total? Show `customer_id` and their total `total_paid` rounded to 2 decimals, biggest spender first.',
        clause: '**HAVING** on `SUM(total_paid)`, then **ORDER BY** that sum **DESC**.',
        templateNote: 'Genres with more than 50 units in stock, most stock first.',
        explain: 'The 120 applies to the sum per customer, so it goes in **HAVING**. `WHERE total_paid > 120` would keep only single sales above 120.',
      },

      /* ───── Hard ───── */
      r11a: {
        prompt: 'For every sale of 2 or more copies (`quantity`), show the `sale_date`, the game\'s `title` and the `quantity`.',
        clause: '**JOIN** `sales` with `games` on `game_id`.',
        templateNote: 'Sales above 100 with the name of the customer.',
        explain: '`sales` only holds the `game_id`; the **JOIN** on `game_id` brings the `title` from `games`. “2 or more” is `>= 2`.',
      },
      r11b: {
        prompt: 'List every purchase made by customers from `\'Portugal\'`: the customer\'s `name` and the `sale_date`.',
        clause: '**JOIN** `customers` and `sales` on `customer_id`.',
        templateNote: 'Sales of Strategy games with their dates.',
        explain: 'An inner **JOIN** keeps only the customers with matching sales. A **LEFT JOIN** would add Nuno Barros, who never bought, with an empty date.',
      },
      r11c: {
        prompt: 'Which different games has customer 7 bought? Show each `title` once.',
        clause: '**JOIN** `games` and `sales`, and use **DISTINCT**.',
        templateNote: 'The countries of the customers who bought game 10.',
        explain: 'Customer 7 bought Tile Tide twice. The **JOIN** returns one row per sale, so **DISTINCT** is needed to show each title once.',
      },
      r12a: {
        prompt: 'Which customers have never bought anything? Show `name` and `country`.',
        clause: 'A **LEFT JOIN** from `customers` to `sales`, keeping the rows whose sale **IS NULL**.',
        templateNote: 'RPG games with their sales; an unsold game shows an empty `sale_id`.',
        explain: 'A **LEFT JOIN** keeps every customer; those without sales get **NULL** in the columns of `sales`. `WHERE s.sale_id IS NULL` keeps exactly them.',
      },
      r12b: {
        prompt: 'Which games have never been sold? Show `title` and `stock`.',
        clause: '**NOT IN** with a subquery on `sales`.',
        templateNote: 'Customers who never bought game 10.',
        explain: 'The subquery lists every `game_id` that appears in `sales`; **NOT IN** keeps the games outside that list.',
      },
      r12c: {
        prompt: 'Which customers bought nothing during 2024? Include those who have never bought. Show `name` and `country`.',
        clause: '**NOT EXISTS** with a subquery that looks for a 2024 sale of the same customer.',
        templateNote: 'Games never sold two or more copies at a time.',
        explain: 'The subquery is correlated: it runs for each customer `c`. **NOT EXISTS** keeps the customers for whom it finds no sale in 2024.',
      },
      r13a: {
        prompt: 'Which `\'RPG\'` games cost more than the average `price` of all games? Show `title` and `price`.',
        clause: 'Compare `price` with a subquery that computes the **AVG** of all games.',
        templateNote: 'Customers from Spain who signed up after the first customer from Mexico.',
        explain: 'An aggregate cannot go straight into **WHERE**: `price > AVG(price)` fails. A scalar subquery computes the average first (32.14).',
      },
      r13b: {
        prompt: 'Which games have been bought by customers from `\'France\'`? Show each `title` once.',
        clause: 'Nest two **IN** subqueries: customers → sales → games.',
        templateNote: 'Customers who bought a Racing game.',
        explain: 'Each **IN** subquery returns a list of ids. Unlike a **JOIN**, **IN** never repeats a game, even when two French customers bought it.',
      },
      r13c: {
        prompt: 'Which 2025 sales paid more than the biggest single sale of 2024? Show `sale_id` and `total_paid`.',
        clause: 'A subquery computes the **MAX** of `total_paid` over 2024.',
        templateNote: 'Racing games that cost more than every Puzzle game.',
        explain: 'The subquery returns one number, the 2024 record (69.99). The outer query keeps the 2025 sales above it, with `EXTRACT(YEAR FROM sale_date)` in both.',
      },
      r14a: {
        prompt: 'How many purchases has each customer from `\'Spain\'` made? Show `name` and the number of purchases, including customers with 0.',
        clause: '**LEFT JOIN** to `sales`, **GROUP BY** the customer, and count `s.sale_id`.',
        templateNote: 'Sales per Sports game, including a game with none.',
        explain: 'The **LEFT JOIN** keeps Elena Paredes, who never bought. `COUNT(s.sale_id)` gives her 0; `COUNT(*)` would count her row and say 1.',
      },
      r14b: {
        prompt: 'What is the revenue (`total_paid`) of each genre? Show `genre` and the revenue rounded to 2 decimals, highest first.',
        clause: '**JOIN** `games` and `sales`, **GROUP BY** `genre`, then **ORDER BY** the sum.',
        templateNote: 'Units bought per country, most first.',
        explain: 'The genre lives in `games` and the money in `sales`: join first, then group. `SUM(price)` would ignore quantities and discounts.',
      },
      r14c: {
        prompt: 'For each genre, show its most expensive game: `genre`, `title` and `price`, sorted by `genre` with a plain `ORDER BY` (Oracle sorts `\'RPG\'` before `\'Racing\'`).',
        clause: 'A correlated subquery finds the **MAX** price of the same genre.',
        templateNote: 'The first customer to sign up in each country.',
        explain: 'For each game, the subquery computes the top price of its own genre. `SELECT genre, title, MAX(price) … GROUP BY genre` fails in Oracle: `title` is not grouped.',
      },
      r15a: {
        prompt: 'Which customers spent more than the average customer? Compute each buyer\'s total `total_paid`, then compare it with the average of those totals. Show `name` and the total rounded to 2 decimals.',
        clause: '**GROUP BY** customer and **HAVING** against a subquery that averages the totals.',
        templateNote: 'Genres whose total stock is above the average stock of a game.',
        explain: 'The average total per customer (103.56) is not the average sale (33.22). The subquery groups by customer first, then **AVG** averages those sums.',
      },
      r15b: {
        prompt: 'Which games did the biggest spender buy, that is, the customer with the highest total `total_paid`? Show each `title`.',
        clause: 'A subquery with **GROUP BY**, **ORDER BY** the sum and **FETCH FIRST** 1 row finds the customer.',
        templateNote: 'The customers who bought the best-selling game.',
        explain: 'The subquery groups `sales` by customer, sorts by `SUM(total_paid)` and keeps 1 row: customer 2. The outer **JOIN** lists that customer\'s games.',
      },
      r15c: {
        prompt: 'In which countries did the customers spend more in total than all the customers from `\'Spain\'` together? Show `country` and its total `total_paid` rounded to 2 decimals.',
        clause: '**GROUP BY** `country` and **HAVING** against a subquery with the total of Spain.',
        templateNote: 'Genres that sold more units than all the Racing games together.',
        explain: 'The customers from Spain spent 252.92 together. The subquery computes that number, and **HAVING** compares the sum of each country with it.',
      },
    },

    end: {
      won: 'You won the million!',
      lost: 'Game over',
      walked: 'You walked away',
      best: 'Best score',
      review: 'Your answers',
      again: 'Play again',
    },
  };
})();
