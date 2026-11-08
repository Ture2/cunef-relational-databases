'use strict';
/* Query for a Million, Structure (DDL) mode: the texts of data/game-bank-ddl.js, merged into GAME_TEXT.questions.
   Same fields and md rules as data/en/game.js (§6). Every prompt pins the table and column names, the column
   order, which columns are required, the keys, the CHECK range, the default and the view's columns, because the
   probes grade exactly that. Same ids as data/es/game-q-ddl.js. */
(() => {
  Object.assign(DATA.en.GAME_TEXT.questions, {
    ddl01a: {
      prompt: 'Create the table `genres` with two columns: `genre_id` (`NUMBER(2)`, the primary key) and `name` (`VARCHAR2(20)`, required).',
      clause: '**CREATE TABLE** with **PRIMARY KEY** on `genre_id` and **NOT NULL** on `name`.',
      templateNote: 'Creates a table of languages with the same shape.',
      explain: '**PRIMARY KEY** makes `genre_id` unique and required: a repeated id fails with ORA-00001. **NOT NULL** refuses an empty `name`.',
    },
    ddl01b: {
      prompt: 'Add to `games` an optional column `release_year` of type `NUMBER(4)`.',
      clause: '**ALTER TABLE** `games` **ADD** the new column.',
      templateNote: 'Adds an optional `city` column to `customers`.',
      explain: 'The new column goes at the end and is empty (NULL) in the 24 existing games. A **NOT NULL** column without a default cannot be added to a table with rows: ORA-01758.',
    },
    ddl02a: {
      prompt: 'Create `suppliers` with, in this order: `supplier_id` (`NUMBER(4)`, primary key), `name` (`VARCHAR2(40)`, required) and `country` (`VARCHAR2(30)`, optional).',
      clause: '**PRIMARY KEY**, **NOT NULL** where required, and nothing on the optional column.',
      templateNote: 'Creates `publishers` with a key, a required name and an optional city.',
      explain: 'A column with no constraint accepts NULL. The columns of a table keep the order in which you write them.',
    },
    ddl02b: {
      prompt: 'The shop stops showing ratings. Remove the column `rating` from `games`.',
      clause: '**ALTER TABLE** … **DROP COLUMN**.',
      templateNote: 'Removes `vip_level` from `customers`.',
      explain: '**DROP COLUMN** removes the column and all its values; the other columns stay. In Oracle you can also write `DROP (rating)`.',
    },
    ddl03a: {
      prompt: 'Create `events`: `event_id` (`NUMBER(5)`, primary key), `title` (`VARCHAR2(60)`, required), `event_date` (`DATE`, required) and `city` (`VARCHAR2(30)`, optional), in this order.',
      clause: '**CREATE TABLE** with a **DATE** column and **NOT NULL** on the required ones.',
      templateNote: 'Creates `tournaments` with a key, a name, a start date and an optional prize.',
      explain: 'Dates use the type **DATE**. Every required column needs its own **NOT NULL**; `city` has none, so it accepts NULL.',
    },
    ddl03b: {
      prompt: 'Add two optional columns to `customers`, in this order: `email` (`VARCHAR2(60)`) and `phone` (`VARCHAR2(20)`).',
      clause: 'One **ALTER TABLE** … **ADD** with both columns in parentheses.',
      templateNote: 'Adds two optional text columns to `games`.',
      explain: '`ADD (a …, b …)` adds several columns at once, at the end and in the order written. Two separate **ADD** statements do the same.',
    },
    ddl04a: {
      prompt: 'Create `price_history` with four required columns: `game_id` (`NUMBER(4)`), `old_price` and `new_price` (`NUMBER(6,2)`) and `changed_on` (`DATE`). No primary key: a game can change price many times.',
      clause: '**CREATE TABLE** with **NOT NULL** on every column and no **PRIMARY KEY**.',
      templateNote: 'Creates a stock log: three required columns and no key.',
      explain: 'A history table repeats `game_id`, so it cannot be the primary key: the second price change of a game would fail with ORA-00001.',
    },
    ddl04b: {
      prompt: 'Remove the columns `signup_date` and `vip_level` from `customers`.',
      clause: '**ALTER TABLE** … **DROP** with both columns in parentheses.',
      templateNote: 'Removes `genre` and `stock` from `games`.',
      explain: '`DROP (signup_date, vip_level)` removes both in one statement. Two **DROP COLUMN** statements also work.',
    },
    ddl05a: {
      prompt: 'Create `countries`: `country_code` (`CHAR(2)`, primary key, such as `\'ES\'`), `name` (`VARCHAR2(30)`, required) and `region` (`VARCHAR2(20)`, optional).',
      clause: 'The **PRIMARY KEY** can be a text column.',
      templateNote: 'Creates `currencies`, keyed by a three-letter code.',
      explain: 'A key does not have to be a number: `CHAR(2)` holds codes like `\'ES\'`. A repeated code fails with ORA-00001.',
    },
    ddl05b: {
      prompt: 'Replace `rating` in `games` with a new empty column `score` (`NUMBER(3,1)`, optional): add `score`, then drop `rating`. The old ratings are not kept.',
      clause: 'Two statements: **ALTER TABLE** … **ADD**, then **ALTER TABLE** … **DROP COLUMN**.',
      templateNote: 'Replaces `vip_level` in `customers` with a new column `tier`.',
      explain: 'Each **ALTER TABLE** does one job. `score` ends up last, after `stock`, and starts empty in every game.',
    },
    ddl06a: {
      prompt: 'Create `platforms`: `platform_id` (`NUMBER(3)`, primary key), `name` (`VARCHAR2(30)`, required, never repeated) and `maker` (`VARCHAR2(30)`, optional, may repeat).',
      clause: '**UNIQUE** on `name`, besides **NOT NULL**.',
      templateNote: 'Creates `studios` with a required, unique name.',
      explain: '**UNIQUE** forbids a repeated `name` (ORA-00001) but allows several platforms of the same `maker`. **NOT NULL** is still needed: **UNIQUE** alone accepts NULL.',
    },
    ddl06b: {
      prompt: 'Create `promotions`: `promo_id` (`NUMBER(4)`, primary key), `name` (`VARCHAR2(40)`, required) and `discount` (`NUMBER(2)`, required, from 5 to 50, both included).',
      clause: 'A **CHECK** with **BETWEEN** on `discount`.',
      templateNote: 'Creates `bundles` of between 2 and 10 games.',
      explain: '`CHECK (discount BETWEEN 5 AND 50)` accepts 5 and 50 and refuses 4 or 51 with ORA-02290. `> 5 AND < 50` would refuse the limits.',
    },
    ddl07a: {
      prompt: 'Add to `games` a required column `pegi` (`NUMBER(2)`) whose default value is 12, so the existing games get 12.',
      clause: '**DEFAULT** 12 before **NOT NULL** in the **ADD**.',
      templateNote: 'Adds a required `language` to `customers`, `\'en\'` by default.',
      explain: 'The **DEFAULT** fills the 24 existing rows and every new game that leaves `pegi` out. Without it, a **NOT NULL** column cannot be added to a table with rows: ORA-01758.',
    },
    ddl07b: {
      prompt: 'Create `stores`: `store_id` (`NUMBER(3)`, primary key), `city` (`VARCHAR2(30)`, required) and `country` (`VARCHAR2(30)`, required, `\'Spain\'` when not given).',
      clause: '`country` needs a **DEFAULT** and **NOT NULL**.',
      templateNote: 'Creates `warehouses` with a capacity of 1000 by default.',
      explain: 'An **INSERT** that leaves `country` out gets `\'Spain\'`. Without the **DEFAULT**, that insert fails with ORA-01400.',
    },
    ddl08a: {
      prompt: 'Create `game_tags`: `tag_id` (`NUMBER(6)`, primary key), `game_id` (`NUMBER(4)`, required, a game of `games`) and `tag` (`VARCHAR2(20)`, required).',
      clause: '**REFERENCES** `games (game_id)` on the `game_id` column.',
      templateNote: 'Creates notes that point to `customers`.',
      explain: 'The foreign key refuses a tag for a game that does not exist (ORA-02291). It must point to `games`, not to another table with similar ids.',
    },
    ddl08b: {
      prompt: 'Add to `customers` an optional column `favourite_game` (`NUMBER(4)`) that must be a `game_id` of `games`.',
      clause: '**ALTER TABLE** … **ADD** with **REFERENCES** `games (game_id)`.',
      templateNote: 'Adds to `sales` an optional column that points to `customers`.',
      explain: '**ADD** can bring its own foreign key. The column stays NULL until someone fills it, and it only accepts existing games (ORA-02291).',
    },
    ddl09a: {
      prompt: 'Create `consoles`: `console_id` (`NUMBER(3)`, primary key), `name` (`VARCHAR2(30)`, required) and `kind` (`VARCHAR2(10)`, required, only `\'home\'`, `\'handheld\'` or `\'hybrid\'`).',
      clause: 'A **CHECK** with **IN** and the three allowed values.',
      templateNote: 'Creates `tickets` whose `status` is `\'open\'` or `\'closed\'`.',
      explain: '`CHECK (kind IN (…))` refuses any other value with ORA-02290, and text is case-sensitive: `\'Home\'` is refused too.',
    },
    ddl09b: {
      prompt: 'Add to `games` a required column `discount` (`NUMBER(2)`), 0 by default, that only accepts values from 0 to 50.',
      clause: '**DEFAULT**, **NOT NULL** and a **CHECK** in the same **ADD**.',
      templateNote: 'Adds required `credits` to `customers`: 100 by default and never negative.',
      explain: 'The **DEFAULT** fills the existing games with 0, so **NOT NULL** is allowed. The **CHECK** refuses 51 and -1 with ORA-02290.',
    },
    ddl10a: {
      prompt: 'Create `campaigns`: `campaign_id` (`NUMBER(4)`, primary key), `game_id` (`NUMBER(4)`, required, a game of `games`), `start_date` and `end_date` (`DATE`, required). `end_date` must be later than `start_date`.',
      clause: 'A table-level **CHECK** that compares the two dates.',
      templateNote: 'Creates price drops, where the new price must be lower than the old one.',
      explain: 'A **CHECK** on two columns goes after them, as a table constraint. `end_date > start_date` refuses equal dates; `>=` would accept them.',
    },
    ddl10b: {
      prompt: 'Create `loyalty_cards`: `card_id` (`NUMBER(6)`, primary key), `customer_id` (`NUMBER(4)`, required, a customer of `customers`, one card at most each) and `points` (`NUMBER(6)`, required, 0 by default).',
      clause: '`customer_id` with **NOT NULL**, **UNIQUE** and **REFERENCES**; `points` with **DEFAULT** 0.',
      templateNote: 'Creates one manual per game, with 1 page by default.',
      explain: '**UNIQUE** on the foreign key makes the link one-to-one: a second card for the same customer fails with ORA-00001.',
    },
    ddl11a: {
      prompt: 'Create `game_platforms`: `game_id` (`NUMBER(4)`, a game of `games`), `platform` (`VARCHAR2(10)`) and `launch_price` (`NUMBER(6,2)`, required). The primary key is the pair (`game_id`, `platform`).',
      clause: 'A composite key: **PRIMARY KEY** (`game_id`, `platform`) after the columns.',
      templateNote: 'Creates badges per customer, keyed by customer and badge.',
      explain: 'A game can be on several platforms, but each pair only once. Two inline **PRIMARY KEY** clauses are an error: a table has a single primary key.',
    },
    ddl11b: {
      prompt: 'Create `reviews`: `customer_id` (`NUMBER(4)`, of `customers`), `game_id` (`NUMBER(4)`, of `games`) and `stars` (`NUMBER(1)`, required, from 1 to 5). The primary key is (`customer_id`, `game_id`).',
      clause: 'A composite **PRIMARY KEY**, two **REFERENCES** and a **CHECK** with **BETWEEN**.',
      templateNote: 'Creates wishlists with the same keys and a priority from 1 to 3.',
      explain: 'Each column points to its own table, so `reviews` links `customers` and `games`, one review per pair. The **CHECK** refuses 0 and 6 with ORA-02290.',
    },
    ddl12a: {
      prompt: 'Create the view `sales_detail` with, for each sale, `sale_id`, the customer\'s `name`, the game\'s `title` and `total_paid`, in that order.',
      clause: '**CREATE VIEW** … **AS** a **SELECT** with two **JOIN** clauses.',
      templateNote: 'Creates a view of each sale with its game and the buyer\'s country.',
      explain: 'A view stores the query, not the rows, so it always shows the current data. Each join goes through its own key: `customer_id` to `customers`, `game_id` to `games`.',
    },
    ddl12b: {
      prompt: 'No two customers may share the same `name`. Create a unique index on `customers (name)`.',
      clause: '**CREATE UNIQUE INDEX** … **ON** `customers (name)`.',
      templateNote: 'Creates a unique index on two columns of `games`.',
      explain: 'A unique index refuses a repeated `name` with ORA-00001 and also speeds up searches by name. A plain index only speeds them up.',
    },
    ddl13a: {
      prompt: 'Create the view `genre_sales` with `genre`, `sales_count` (its number of sales) and `revenue` (the sum of `total_paid`), in that order, one row per genre.',
      clause: '**JOIN** `games` and `sales`, then **GROUP BY** `genre` with **COUNT** and **SUM**.',
      templateNote: 'Creates the same summary per customer country.',
      explain: 'Count sales, not units: `SUM(quantity)` counts copies. The money is in `sales`, so `SUM(price)` would ignore quantities and discounts.',
    },
    ddl13b: {
      prompt: 'Create the view `customer_purchases` with `customer_id`, `name` and `purchases` (their number of sales), in that order, for every customer, with 0 for those who never bought.',
      clause: '**LEFT JOIN** from `customers` to `sales`, and count `s.sale_id`.',
      templateNote: 'Creates the number of sales of every game, unsold ones included.',
      explain: 'An inner **JOIN** drops the three customers without sales. With **LEFT JOIN**, `COUNT(*)` would give them 1; `COUNT(s.sale_id)` gives 0.',
    },
    ddl14a: {
      prompt: 'Searches by customer and then by date are slow. Create one index on `sales` over `customer_id` and `sale_date`, in that order.',
      clause: '**CREATE INDEX** … **ON** `sales` with two columns in parentheses.',
      templateNote: 'Creates an index on `sales` over the game and the date.',
      explain: 'In a composite index the order matters: (`customer_id`, `sale_date`) helps a search by customer. Two separate indexes are not the same thing.',
    },
    ddl14b: {
      prompt: 'Create `game_screenshots`: `shot_id` (`NUMBER(6)`, primary key), `game_id` (`NUMBER(4)`, required, a game of `games`; deleting the game deletes its screenshots) and `url` (`VARCHAR2(100)`, required, unique).',
      clause: '**REFERENCES** `games (game_id)` with **ON DELETE CASCADE**.',
      templateNote: 'Creates customer emails that disappear with their customer.',
      explain: 'With **ON DELETE CASCADE**, deleting a game also deletes its screenshots. Without it, deleting the game fails with ORA-02292 while screenshots exist.',
    },
    ddl15a: {
      prompt: 'Create the view `premium_games` with `title`, `genre` and `price` of the games that cost more than the average `price` of their own genre.',
      clause: 'A correlated subquery with the **AVG** of the same genre, in the **WHERE**.',
      templateNote: 'Creates a view of the sales above that customer\'s average.',
      explain: 'The subquery runs for each game with its own genre. Comparing with the average of the whole shop gives another list.',
    },
    ddl15b: {
      prompt: 'Create `platforms` (`platform_id` `NUMBER(3)` primary key, `name` `VARCHAR2(30)` required). Then add to `sales` an optional `platform_id` (`NUMBER(3)`) that references `platforms`, and create an index on it.',
      clause: 'Three statements: **CREATE TABLE**, **ALTER TABLE** … **ADD** with **REFERENCES**, and **CREATE INDEX**.',
      templateNote: 'Creates `stores`, links `customers` to them and indexes the link.',
      explain: 'The parent table must exist before a foreign key points to it. The new column stays optional: the 53 existing sales have no platform.',
    },
  });
})();
