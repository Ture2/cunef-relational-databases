'use strict';
/* Query for a Million, Structure (DDL) mode: questions appended to GAME_BANK.questions. Contract: docs/game-quiz.md
   §13. Pattern: see data/game-bank-insert.js (the same in the four mode files). Ids 'ddl01a' … 'ddl15b'.
   Every DDL question gives its own checks (probes), run one by one after the answer, each rolled back:
   - dictionary: SELECT column_name, nullable FROM user_tab_columns WHERE table_name = 'X' ORDER BY column_id
     (also user_tables, user_views, user_indexes, user_ind_columns; names in upper case);
   - views: SELECT … FROM v ORDER BY … (always ORDER BY: rows are compared in order);
   - behaviour: an INSERT / UPDATE / DELETE that must succeed or must fail (compared by ORA code only). A probe may
     be several statements; its result is the last one's (INSERT …; SELECT … reads a DEFAULT back).
   Column types are not compared (SQLite does not keep them). Texts: data/{en,es}/game-q-ddl.js.
   Fair grading: the probes never look at constraint or index names, data_default text or types, so inline or
   out-of-line constraints, named or not, all pass; column names, column order, nullability, keys, CHECK ranges,
   defaults and view rows do matter, and the prompt states each of them.
   Sandbox limits the probes stay clear of: NULL into a one-column primary key is accepted (the dictionary probe
   shows nullable 'N' instead); a foreign key to a table that does not exist yet is accepted.
   Rungs: 1–5 CREATE TABLE with a primary key and NOT NULL, ALTER TABLE ADD / DROP COLUMN; 6–10 UNIQUE, CHECK,
   DEFAULT, REFERENCES; 11–15 composite keys, two foreign keys, views (JOIN, GROUP BY, LEFT JOIN, correlated
   subquery), indexes, ON DELETE CASCADE, several statements. Checked by tools/check-game-bank.mjs. */
(() => {
  // eslint-disable-next-line no-undef
  const bank = typeof GAME_BANK !== 'undefined' ? GAME_BANK : require('./game-bank.js');
  const cols = (t) => `SELECT column_name, nullable FROM user_tab_columns WHERE table_name = '${t}' ORDER BY column_id`;
  const IDX = "SELECT table_name, uniqueness FROM user_indexes WHERE index_name NOT LIKE 'SYS%' ORDER BY table_name, uniqueness";
  const IDX_COLS = "SELECT table_name, column_name, column_position FROM user_ind_columns WHERE index_name NOT LIKE 'SYS%' ORDER BY table_name, column_position, column_name";
  const QUESTIONS = [
    /* ───── 1–5: tables, columns, primary keys ───── */
    { id: 'ddl01a', mode: 'ddl', level: 1, clause: ['CREATE TABLE', 'PRIMARY KEY'],
      solution: 'CREATE TABLE genres (\n  genre_id  NUMBER(2)    PRIMARY KEY,\n  name      VARCHAR2(20) NOT NULL\n)',
      checks: [
        cols('GENRES'),
        "INSERT INTO genres VALUES (1, 'Action')",
        "INSERT INTO genres SELECT 2, 'Puzzle' FROM dual UNION ALL SELECT 2, 'RPG' FROM dual",
      ],
      template: 'CREATE TABLE languages (\n  lang_id  NUMBER(2)    PRIMARY KEY,\n  name     VARCHAR2(20) NOT NULL\n)',
      traps: [
        'CREATE TABLE genres (genre_id NUMBER(2) NOT NULL, name VARCHAR2(20) NOT NULL)',
        'CREATE TABLE genres (genre_id NUMBER(2) PRIMARY KEY, name VARCHAR2(20))',
        'CREATE TABLE genres (genre_id NUMBER(2) PRIMARY KEY, genre VARCHAR2(20) NOT NULL)',
      ] },
    { id: 'ddl01b', mode: 'ddl', level: 1, clause: ['ALTER TABLE', 'ADD'],
      solution: 'ALTER TABLE games ADD release_year NUMBER(4)',
      checks: [cols('GAMES')],
      template: 'ALTER TABLE customers ADD city VARCHAR2(30)',
      traps: [
        'ALTER TABLE games ADD release_year NUMBER(4) NOT NULL',
        'ALTER TABLE customers ADD release_year NUMBER(4)',
        'ALTER TABLE games ADD year NUMBER(4)',
      ] },
    { id: 'ddl02a', mode: 'ddl', level: 2, clause: ['CREATE TABLE', 'PRIMARY KEY', 'NOT NULL'],
      solution: 'CREATE TABLE suppliers (\n  supplier_id  NUMBER(4)    PRIMARY KEY,\n  name         VARCHAR2(40) NOT NULL,\n  country      VARCHAR2(30)\n)',
      checks: [
        cols('SUPPLIERS'),
        "INSERT INTO suppliers VALUES (1, 'Pixel Forge', NULL)",
        "INSERT INTO suppliers SELECT 2, 'Byte Barn', 'Spain' FROM dual UNION ALL SELECT 2, 'Loot Crate Co', 'France' FROM dual",
      ],
      template: 'CREATE TABLE publishers (\n  publisher_id  NUMBER(4)    PRIMARY KEY,\n  name          VARCHAR2(40) NOT NULL,\n  city          VARCHAR2(30)\n)',
      traps: [
        'CREATE TABLE suppliers (supplier_id NUMBER(4) PRIMARY KEY, name VARCHAR2(40) NOT NULL, country VARCHAR2(30) NOT NULL)',
        'CREATE TABLE suppliers (supplier_id NUMBER(4) PRIMARY KEY, country VARCHAR2(30), name VARCHAR2(40) NOT NULL)',
        'CREATE TABLE suppliers (supplier_id NUMBER(4), name VARCHAR2(40) NOT NULL, country VARCHAR2(30))',
      ] },
    { id: 'ddl02b', mode: 'ddl', level: 2, clause: ['ALTER TABLE', 'DROP COLUMN'],
      solution: 'ALTER TABLE games DROP COLUMN rating',
      checks: [cols('GAMES')],
      template: 'ALTER TABLE customers DROP COLUMN vip_level',
      traps: ['ALTER TABLE games DROP COLUMN stock', 'ALTER TABLE games DROP (rating, stock)'] },
    { id: 'ddl03a', mode: 'ddl', level: 3, clause: ['CREATE TABLE', 'NOT NULL'],
      solution: 'CREATE TABLE events (\n  event_id    NUMBER(5)    PRIMARY KEY,\n  title       VARCHAR2(60) NOT NULL,\n  event_date  DATE         NOT NULL,\n  city        VARCHAR2(30)\n)',
      checks: [
        cols('EVENTS'),
        "INSERT INTO events VALUES (1, 'Pixel Fest', DATE '2025-10-04', NULL)",
        "INSERT INTO events SELECT 2, 'Retro Night', DATE '2025-11-08', 'Madrid' FROM dual UNION ALL SELECT 2, 'Speedrun Cup', DATE '2025-12-13', 'Lyon' FROM dual",
      ],
      template: 'CREATE TABLE tournaments (\n  tournament_id  NUMBER(5)    PRIMARY KEY,\n  name           VARCHAR2(60) NOT NULL,\n  start_date     DATE         NOT NULL,\n  prize          NUMBER(8,2)\n)',
      traps: [
        'CREATE TABLE events (event_id NUMBER(5) PRIMARY KEY, title VARCHAR2(60) NOT NULL, event_date DATE, city VARCHAR2(30))',
        'CREATE TABLE events (event_id NUMBER(5) PRIMARY KEY, title VARCHAR2(60) NOT NULL, city VARCHAR2(30), event_date DATE NOT NULL)',
        'CREATE TABLE events (event_id NUMBER(5), title VARCHAR2(60) NOT NULL, event_date DATE NOT NULL, city VARCHAR2(30))',
      ] },
    { id: 'ddl03b', mode: 'ddl', level: 3, clause: ['ALTER TABLE', 'ADD'],
      solution: 'ALTER TABLE customers ADD (email VARCHAR2(60), phone VARCHAR2(20))',
      checks: [cols('CUSTOMERS')],
      template: 'ALTER TABLE games ADD (developer VARCHAR2(40), publisher VARCHAR2(40))',
      traps: [
        'ALTER TABLE customers ADD email VARCHAR2(60)',
        'ALTER TABLE customers ADD (phone VARCHAR2(20), email VARCHAR2(60))',
        'ALTER TABLE customers ADD (email VARCHAR2(60) NOT NULL, phone VARCHAR2(20))',
      ] },
    { id: 'ddl04a', mode: 'ddl', level: 4, clause: ['CREATE TABLE', 'NOT NULL'],
      solution: 'CREATE TABLE price_history (\n  game_id     NUMBER(4)   NOT NULL,\n  old_price   NUMBER(6,2) NOT NULL,\n  new_price   NUMBER(6,2) NOT NULL,\n  changed_on  DATE        NOT NULL\n)',
      checks: [
        cols('PRICE_HISTORY'),
        "INSERT INTO price_history SELECT 1, 59.99, 49.99, DATE '2025-01-10' FROM dual UNION ALL SELECT 1, 49.99, 39.99, DATE '2025-06-10' FROM dual",
      ],
      template: 'CREATE TABLE stock_log (\n  game_id    NUMBER(4) NOT NULL,\n  units      NUMBER(4) NOT NULL,\n  logged_on  DATE      NOT NULL\n)',
      traps: [
        'CREATE TABLE price_history (game_id NUMBER(4) PRIMARY KEY, old_price NUMBER(6,2) NOT NULL, new_price NUMBER(6,2) NOT NULL, changed_on DATE NOT NULL)',
        'CREATE TABLE price_history (game_id NUMBER(4) NOT NULL, old_price NUMBER(6,2) NOT NULL, new_price NUMBER(6,2) NOT NULL, changed_on DATE)',
        'CREATE TABLE price_history (game_id NUMBER(4) NOT NULL, new_price NUMBER(6,2) NOT NULL, changed_on DATE NOT NULL)',
      ] },
    { id: 'ddl04b', mode: 'ddl', level: 4, clause: ['ALTER TABLE', 'DROP'],
      solution: 'ALTER TABLE customers DROP (signup_date, vip_level)',
      checks: [cols('CUSTOMERS')],
      template: 'ALTER TABLE games DROP (genre, stock)',
      traps: ['ALTER TABLE customers DROP COLUMN vip_level', 'ALTER TABLE customers DROP (country, vip_level)'] },
    { id: 'ddl05a', mode: 'ddl', level: 5, clause: ['CREATE TABLE', 'PRIMARY KEY'],
      solution: 'CREATE TABLE countries (\n  country_code  CHAR(2)      PRIMARY KEY,\n  name          VARCHAR2(30) NOT NULL,\n  region        VARCHAR2(20)\n)',
      checks: [
        cols('COUNTRIES'),
        "INSERT INTO countries SELECT 'ES', 'Spain', 'Europe' FROM dual UNION ALL SELECT 'MX', 'Mexico', NULL FROM dual",
        "INSERT INTO countries SELECT 'FR', 'France', 'Europe' FROM dual UNION ALL SELECT 'FR', 'French Guiana', 'America' FROM dual",
      ],
      template: 'CREATE TABLE currencies (\n  currency_code  CHAR(3)      PRIMARY KEY,\n  name           VARCHAR2(30) NOT NULL,\n  symbol         VARCHAR2(5)\n)',
      traps: [
        'CREATE TABLE countries (country_code CHAR(2), name VARCHAR2(30) NOT NULL, region VARCHAR2(20))',
        'CREATE TABLE countries (country_code CHAR(2) PRIMARY KEY, name VARCHAR2(30) NOT NULL, region VARCHAR2(20) NOT NULL)',
        'CREATE TABLE countries (country_code CHAR(2) PRIMARY KEY, name VARCHAR2(30), region VARCHAR2(20))',
      ] },
    { id: 'ddl05b', mode: 'ddl', level: 5, clause: ['ADD', 'DROP COLUMN'],
      solution: 'ALTER TABLE games ADD score NUMBER(3,1);\nALTER TABLE games DROP COLUMN rating',
      checks: [cols('GAMES'), 'SELECT COUNT(score) FROM games'],
      template: 'ALTER TABLE customers ADD tier NUMBER(1);\nALTER TABLE customers DROP COLUMN vip_level',
      traps: ['ALTER TABLE games ADD score NUMBER(3,1)', 'ALTER TABLE games DROP COLUMN rating', 'ALTER TABLE games ADD rating_score NUMBER(3,1);\nALTER TABLE games DROP COLUMN rating'] },

    /* ───── 6–10: UNIQUE, CHECK, DEFAULT, REFERENCES ───── */
    { id: 'ddl06a', mode: 'ddl', level: 6, clause: ['UNIQUE'],
      solution: 'CREATE TABLE platforms (\n  platform_id  NUMBER(3)    PRIMARY KEY,\n  name         VARCHAR2(30) NOT NULL UNIQUE,\n  maker        VARCHAR2(30)\n)',
      checks: [
        cols('PLATFORMS'),
        "INSERT INTO platforms SELECT 1, 'Orbit', 'Acme' FROM dual UNION ALL SELECT 2, 'Pocket', 'Acme' FROM dual",
        "INSERT INTO platforms SELECT 3, 'Nimbus', NULL FROM dual UNION ALL SELECT 4, 'Nimbus', NULL FROM dual",
        "INSERT INTO platforms SELECT 5, 'Flip', NULL FROM dual UNION ALL SELECT 5, 'Tower', NULL FROM dual",
      ],
      template: 'CREATE TABLE studios (\n  studio_id  NUMBER(4)    PRIMARY KEY,\n  name       VARCHAR2(40) NOT NULL UNIQUE,\n  city       VARCHAR2(30)\n)',
      traps: [
        'CREATE TABLE platforms (platform_id NUMBER(3) PRIMARY KEY, name VARCHAR2(30) NOT NULL, maker VARCHAR2(30))',
        'CREATE TABLE platforms (platform_id NUMBER(3) PRIMARY KEY, name VARCHAR2(30) NOT NULL, maker VARCHAR2(30) UNIQUE)',
        'CREATE TABLE platforms (platform_id NUMBER(3) PRIMARY KEY, name VARCHAR2(30) UNIQUE, maker VARCHAR2(30))',
      ] },
    { id: 'ddl06b', mode: 'ddl', level: 6, clause: ['CHECK', 'BETWEEN'],
      solution: 'CREATE TABLE promotions (\n  promo_id  NUMBER(4)    PRIMARY KEY,\n  name      VARCHAR2(40) NOT NULL,\n  discount  NUMBER(2)    NOT NULL CHECK (discount BETWEEN 5 AND 50)\n)',
      checks: [
        cols('PROMOTIONS'),
        "INSERT INTO promotions SELECT 1, 'Spring deal', 5 FROM dual UNION ALL SELECT 2, 'Summer deal', 50 FROM dual",
        "INSERT INTO promotions VALUES (3, 'Tiny deal', 4)",
        "INSERT INTO promotions VALUES (4, 'Huge deal', 51)",
      ],
      template: 'CREATE TABLE bundles (\n  bundle_id    NUMBER(4)    PRIMARY KEY,\n  name         VARCHAR2(40) NOT NULL,\n  games_count  NUMBER(2)    NOT NULL CHECK (games_count BETWEEN 2 AND 10)\n)',
      traps: [
        'CREATE TABLE promotions (promo_id NUMBER(4) PRIMARY KEY, name VARCHAR2(40) NOT NULL, discount NUMBER(2) NOT NULL CHECK (discount > 5 AND discount < 50))',
        'CREATE TABLE promotions (promo_id NUMBER(4) PRIMARY KEY, name VARCHAR2(40) NOT NULL, discount NUMBER(2) NOT NULL)',
        'CREATE TABLE promotions (promo_id NUMBER(4) PRIMARY KEY, name VARCHAR2(40) NOT NULL, discount NUMBER(2) CHECK (discount BETWEEN 5 AND 50))',
      ] },
    { id: 'ddl07a', mode: 'ddl', level: 7, clause: ['DEFAULT', 'NOT NULL'],
      solution: 'ALTER TABLE games ADD pegi NUMBER(2) DEFAULT 12 NOT NULL',
      checks: [
        cols('GAMES'),
        'SELECT COUNT(*) FROM games WHERE pegi = 12',
        "INSERT INTO games (game_id, title, genre, price, stock) VALUES (101, 'Tiny Tactics', 'Strategy', 9.99, 10);\nSELECT pegi FROM games WHERE game_id = 101",
      ],
      template: "ALTER TABLE customers ADD language VARCHAR2(2) DEFAULT 'en' NOT NULL",
      traps: [
        'ALTER TABLE games ADD pegi NUMBER(2) DEFAULT 12',
        'ALTER TABLE games ADD pegi NUMBER(2) NOT NULL',
        'ALTER TABLE games ADD pegi NUMBER(2) DEFAULT 18 NOT NULL',
      ] },
    { id: 'ddl07b', mode: 'ddl', level: 7, clause: ['DEFAULT'],
      solution: "CREATE TABLE stores (\n  store_id  NUMBER(3)    PRIMARY KEY,\n  city      VARCHAR2(30) NOT NULL,\n  country   VARCHAR2(30) DEFAULT 'Spain' NOT NULL\n)",
      checks: [
        cols('STORES'),
        "INSERT INTO stores (store_id, city) VALUES (1, 'Madrid');\nSELECT country FROM stores",
        "INSERT INTO stores VALUES (2, 'Lyon', 'France');\nSELECT country FROM stores",
      ],
      template: 'CREATE TABLE warehouses (\n  warehouse_id  NUMBER(3)    PRIMARY KEY,\n  city          VARCHAR2(30) NOT NULL,\n  capacity      NUMBER(6)    DEFAULT 1000 NOT NULL\n)',
      traps: [
        'CREATE TABLE stores (store_id NUMBER(3) PRIMARY KEY, city VARCHAR2(30) NOT NULL, country VARCHAR2(30) NOT NULL)',
        "CREATE TABLE stores (store_id NUMBER(3) PRIMARY KEY, city VARCHAR2(30) NOT NULL, country VARCHAR2(30) DEFAULT 'Spain')",
        "CREATE TABLE stores (store_id NUMBER(3) PRIMARY KEY, city VARCHAR2(30) NOT NULL, country VARCHAR2(30) DEFAULT 'SPAIN' NOT NULL)",
      ] },
    { id: 'ddl08a', mode: 'ddl', level: 8, clause: ['REFERENCES'],
      solution: 'CREATE TABLE game_tags (\n  tag_id   NUMBER(6)    PRIMARY KEY,\n  game_id  NUMBER(4)    NOT NULL REFERENCES games (game_id),\n  tag      VARCHAR2(20) NOT NULL\n)',
      checks: [
        cols('GAME_TAGS'),
        "INSERT INTO game_tags VALUES (1, 24, 'city builder')",
        "INSERT INTO game_tags VALUES (2, 99, 'cozy')",
        "INSERT INTO game_tags SELECT 3, 6, 'cozy' FROM dual UNION ALL SELECT 3, 8, 'story' FROM dual",
      ],
      template: 'CREATE TABLE customer_notes (\n  note_id      NUMBER(6)     PRIMARY KEY,\n  customer_id  NUMBER(4)     NOT NULL REFERENCES customers (customer_id),\n  note         VARCHAR2(200) NOT NULL\n)',
      traps: [
        'CREATE TABLE game_tags (tag_id NUMBER(6) PRIMARY KEY, game_id NUMBER(4) NOT NULL, tag VARCHAR2(20) NOT NULL)',
        'CREATE TABLE game_tags (tag_id NUMBER(6) PRIMARY KEY, game_id NUMBER(4) NOT NULL REFERENCES customers (customer_id), tag VARCHAR2(20) NOT NULL)',
        'CREATE TABLE game_tags (tag_id NUMBER(6) PRIMARY KEY, game_id NUMBER(4) REFERENCES games (game_id), tag VARCHAR2(20) NOT NULL)',
      ] },
    { id: 'ddl08b', mode: 'ddl', level: 8, clause: ['ALTER TABLE', 'REFERENCES'],
      solution: 'ALTER TABLE customers ADD favourite_game NUMBER(4) REFERENCES games (game_id)',
      checks: [
        cols('CUSTOMERS'),
        'UPDATE customers SET favourite_game = 24 WHERE customer_id = 1',
        'UPDATE customers SET favourite_game = 99 WHERE customer_id = 1',
      ],
      template: 'ALTER TABLE sales ADD referrer_id NUMBER(4) REFERENCES customers (customer_id)',
      traps: [
        'ALTER TABLE customers ADD favourite_game NUMBER(4)',
        'ALTER TABLE customers ADD favourite_game NUMBER(4) NOT NULL REFERENCES games (game_id)',
        'ALTER TABLE customers ADD favourite_game NUMBER(4) REFERENCES customers (customer_id)',
      ] },
    { id: 'ddl09a', mode: 'ddl', level: 9, clause: ['CHECK', 'IN'],
      solution: "CREATE TABLE consoles (\n  console_id  NUMBER(3)    PRIMARY KEY,\n  name        VARCHAR2(30) NOT NULL,\n  kind        VARCHAR2(10) NOT NULL CHECK (kind IN ('home', 'handheld', 'hybrid'))\n)",
      checks: [
        cols('CONSOLES'),
        "INSERT INTO consoles SELECT 1, 'Orbit', 'home' FROM dual UNION ALL SELECT 2, 'Pocket', 'handheld' FROM dual UNION ALL SELECT 3, 'Flip', 'hybrid' FROM dual",
        "INSERT INTO consoles VALUES (4, 'Slate', 'tablet')",
        "INSERT INTO consoles VALUES (5, 'Tower', 'Home')",
      ],
      template: "CREATE TABLE tickets (\n  ticket_id  NUMBER(6)    PRIMARY KEY,\n  subject    VARCHAR2(60) NOT NULL,\n  status     VARCHAR2(10) NOT NULL CHECK (status IN ('open', 'closed'))\n)",
      traps: [
        "CREATE TABLE consoles (console_id NUMBER(3) PRIMARY KEY, name VARCHAR2(30) NOT NULL, kind VARCHAR2(10) NOT NULL CHECK (kind IN ('home', 'handheld')))",
        'CREATE TABLE consoles (console_id NUMBER(3) PRIMARY KEY, name VARCHAR2(30) NOT NULL, kind VARCHAR2(10) NOT NULL)',
        "CREATE TABLE consoles (console_id NUMBER(3) PRIMARY KEY, name VARCHAR2(30) NOT NULL, kind VARCHAR2(10) CHECK (kind IN ('home', 'handheld', 'hybrid')))",
      ] },
    { id: 'ddl09b', mode: 'ddl', level: 9, clause: ['DEFAULT', 'CHECK'],
      solution: 'ALTER TABLE games ADD discount NUMBER(2) DEFAULT 0 NOT NULL CHECK (discount BETWEEN 0 AND 50)',
      checks: [
        cols('GAMES'),
        'SELECT COUNT(*) FROM games WHERE discount = 0',
        'UPDATE games SET discount = 50 WHERE game_id = 1',
        'UPDATE games SET discount = 51 WHERE game_id = 1',
        'UPDATE games SET discount = -1 WHERE game_id = 1',
      ],
      template: 'ALTER TABLE customers ADD credits NUMBER(5) DEFAULT 100 NOT NULL CHECK (credits >= 0)',
      traps: [
        'ALTER TABLE games ADD discount NUMBER(2) DEFAULT 0 NOT NULL',
        'ALTER TABLE games ADD discount NUMBER(2) NOT NULL CHECK (discount BETWEEN 0 AND 50)',
        'ALTER TABLE games ADD discount NUMBER(2) DEFAULT 0 NOT NULL CHECK (discount < 50)',
      ] },
    { id: 'ddl10a', mode: 'ddl', level: 10, clause: ['CHECK', 'REFERENCES'],
      solution: 'CREATE TABLE campaigns (\n  campaign_id  NUMBER(4) PRIMARY KEY,\n  game_id      NUMBER(4) NOT NULL REFERENCES games (game_id),\n  start_date   DATE      NOT NULL,\n  end_date     DATE      NOT NULL,\n  CHECK (end_date > start_date)\n)',
      checks: [
        cols('CAMPAIGNS'),
        "INSERT INTO campaigns VALUES (1, 1, DATE '2025-01-01', DATE '2025-01-31')",
        "INSERT INTO campaigns VALUES (2, 1, DATE '2025-03-01', DATE '2025-03-01')",
        "INSERT INTO campaigns VALUES (3, 1, DATE '2025-05-10', DATE '2025-05-01')",
        "INSERT INTO campaigns VALUES (4, 99, DATE '2025-01-01', DATE '2025-01-31')",
      ],
      template: 'CREATE TABLE price_drops (\n  drop_id    NUMBER(5)   PRIMARY KEY,\n  game_id    NUMBER(4)   NOT NULL REFERENCES games (game_id),\n  old_price  NUMBER(6,2) NOT NULL,\n  new_price  NUMBER(6,2) NOT NULL,\n  CHECK (new_price < old_price)\n)',
      traps: [
        'CREATE TABLE campaigns (campaign_id NUMBER(4) PRIMARY KEY, game_id NUMBER(4) NOT NULL REFERENCES games (game_id), start_date DATE NOT NULL, end_date DATE NOT NULL, CHECK (end_date >= start_date))',
        'CREATE TABLE campaigns (campaign_id NUMBER(4) PRIMARY KEY, game_id NUMBER(4) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, CHECK (end_date > start_date))',
        'CREATE TABLE campaigns (campaign_id NUMBER(4) PRIMARY KEY, game_id NUMBER(4) NOT NULL REFERENCES games (game_id), start_date DATE NOT NULL, end_date DATE NOT NULL)',
      ] },
    { id: 'ddl10b', mode: 'ddl', level: 10, clause: ['UNIQUE', 'REFERENCES', 'DEFAULT'],
      solution: 'CREATE TABLE loyalty_cards (\n  card_id      NUMBER(6) PRIMARY KEY,\n  customer_id  NUMBER(4) NOT NULL UNIQUE REFERENCES customers (customer_id),\n  points       NUMBER(6) DEFAULT 0 NOT NULL\n)',
      checks: [
        cols('LOYALTY_CARDS'),
        'INSERT INTO loyalty_cards (card_id, customer_id) VALUES (1, 5);\nSELECT points FROM loyalty_cards',
        'INSERT INTO loyalty_cards SELECT 2, 7, 10 FROM dual UNION ALL SELECT 3, 7, 20 FROM dual',
        'INSERT INTO loyalty_cards VALUES (4, 99, 0)',
      ],
      template: 'CREATE TABLE game_manuals (\n  manual_id  NUMBER(6) PRIMARY KEY,\n  game_id    NUMBER(4) NOT NULL UNIQUE REFERENCES games (game_id),\n  pages      NUMBER(4) DEFAULT 1 NOT NULL\n)',
      traps: [
        'CREATE TABLE loyalty_cards (card_id NUMBER(6) PRIMARY KEY, customer_id NUMBER(4) NOT NULL REFERENCES customers (customer_id), points NUMBER(6) DEFAULT 0 NOT NULL)',
        'CREATE TABLE loyalty_cards (card_id NUMBER(6) PRIMARY KEY, customer_id NUMBER(4) NOT NULL UNIQUE REFERENCES customers (customer_id), points NUMBER(6) NOT NULL)',
        'CREATE TABLE loyalty_cards (card_id NUMBER(6) PRIMARY KEY, customer_id NUMBER(4) NOT NULL UNIQUE, points NUMBER(6) DEFAULT 0 NOT NULL)',
      ] },

    /* ───── 11–15: composite keys, views, indexes, cascades ───── */
    { id: 'ddl11a', mode: 'ddl', level: 11, clause: ['PRIMARY KEY', 'REFERENCES'],
      solution: 'CREATE TABLE game_platforms (\n  game_id       NUMBER(4)    REFERENCES games (game_id),\n  platform      VARCHAR2(10),\n  launch_price  NUMBER(6,2)  NOT NULL,\n  PRIMARY KEY (game_id, platform)\n)',
      checks: [
        cols('GAME_PLATFORMS'),
        "INSERT INTO game_platforms SELECT 1, 'pc', 59.99 FROM dual UNION ALL SELECT 1, 'console', 59.99 FROM dual UNION ALL SELECT 2, 'pc', 39.99 FROM dual",
        "INSERT INTO game_platforms SELECT 3, 'pc', 24.99 FROM dual UNION ALL SELECT 3, 'pc', 19.99 FROM dual",
        "INSERT INTO game_platforms VALUES (99, 'pc', 9.99)",
      ],
      template: 'CREATE TABLE customer_badges (\n  customer_id  NUMBER(4)    REFERENCES customers (customer_id),\n  badge        VARCHAR2(20),\n  earned_on    DATE         NOT NULL,\n  PRIMARY KEY (customer_id, badge)\n)',
      traps: [
        'CREATE TABLE game_platforms (game_id NUMBER(4) PRIMARY KEY REFERENCES games (game_id), platform VARCHAR2(10) NOT NULL, launch_price NUMBER(6,2) NOT NULL)',
        'CREATE TABLE game_platforms (game_id NUMBER(4), platform VARCHAR2(10), launch_price NUMBER(6,2) NOT NULL, PRIMARY KEY (game_id, platform))',
        'CREATE TABLE game_platforms (game_id NUMBER(4) PRIMARY KEY REFERENCES games (game_id), platform VARCHAR2(10) PRIMARY KEY, launch_price NUMBER(6,2) NOT NULL)',
      ] },
    { id: 'ddl11b', mode: 'ddl', level: 11, clause: ['PRIMARY KEY', 'REFERENCES', 'CHECK'],
      solution: 'CREATE TABLE reviews (\n  customer_id  NUMBER(4) REFERENCES customers (customer_id),\n  game_id      NUMBER(4) REFERENCES games (game_id),\n  stars        NUMBER(1) NOT NULL CHECK (stars BETWEEN 1 AND 5),\n  PRIMARY KEY (customer_id, game_id)\n)',
      checks: [
        cols('REVIEWS'),
        'INSERT INTO reviews SELECT 1, 14, 5 FROM dual UNION ALL SELECT 1, 4, 3 FROM dual UNION ALL SELECT 2, 14, 1 FROM dual',
        'INSERT INTO reviews SELECT 3, 6, 4 FROM dual UNION ALL SELECT 3, 6, 2 FROM dual',
        'INSERT INTO reviews VALUES (4, 3, 0)',
        'INSERT INTO reviews VALUES (4, 3, 6)',
        'INSERT INTO reviews VALUES (99, 3, 4)',
        'INSERT INTO reviews VALUES (4, 99, 4)',
      ],
      template: 'CREATE TABLE wishlists (\n  customer_id  NUMBER(4) REFERENCES customers (customer_id),\n  game_id      NUMBER(4) REFERENCES games (game_id),\n  priority     NUMBER(1) NOT NULL CHECK (priority BETWEEN 1 AND 3),\n  PRIMARY KEY (customer_id, game_id)\n)',
      traps: [
        'CREATE TABLE reviews (customer_id NUMBER(4) REFERENCES customers (customer_id), game_id NUMBER(4) REFERENCES games (game_id), stars NUMBER(1) NOT NULL CHECK (stars BETWEEN 0 AND 5), PRIMARY KEY (customer_id, game_id))',
        'CREATE TABLE reviews (customer_id NUMBER(4), game_id NUMBER(4) REFERENCES games (game_id), stars NUMBER(1) NOT NULL CHECK (stars BETWEEN 1 AND 5), PRIMARY KEY (customer_id, game_id))',
        'CREATE TABLE reviews (customer_id NUMBER(4) PRIMARY KEY REFERENCES customers (customer_id), game_id NUMBER(4) NOT NULL REFERENCES games (game_id), stars NUMBER(1) NOT NULL CHECK (stars BETWEEN 1 AND 5))',
      ] },
    { id: 'ddl12a', mode: 'ddl', level: 12, clause: ['CREATE VIEW', 'JOIN'],
      solution: 'CREATE VIEW sales_detail AS\nSELECT s.sale_id, c.name, g.title, s.total_paid\nFROM sales s\nJOIN customers c ON c.customer_id = s.customer_id\nJOIN games g ON g.game_id = s.game_id',
      checks: [cols('SALES_DETAIL'), 'SELECT * FROM sales_detail ORDER BY sale_id', "SELECT view_name FROM user_views WHERE view_name = 'SALES_DETAIL'"],
      template: 'CREATE VIEW game_buyers AS\nSELECT s.sale_id, g.title, c.country\nFROM sales s\nJOIN games g ON g.game_id = s.game_id\nJOIN customers c ON c.customer_id = s.customer_id',
      traps: [
        'CREATE VIEW sales_detail AS SELECT s.sale_id, c.name, g.title FROM sales s JOIN customers c ON c.customer_id = s.customer_id JOIN games g ON g.game_id = s.game_id',
        'CREATE VIEW sales_detail AS SELECT s.sale_id, g.title, c.name, s.total_paid FROM sales s JOIN customers c ON c.customer_id = s.customer_id JOIN games g ON g.game_id = s.game_id',
        'CREATE TABLE sales_detail AS SELECT s.sale_id, c.name, g.title, s.total_paid FROM sales s JOIN customers c ON c.customer_id = s.customer_id JOIN games g ON g.game_id = s.game_id',
      ] },
    { id: 'ddl12b', mode: 'ddl', level: 12, clause: ['CREATE UNIQUE INDEX'],
      solution: 'CREATE UNIQUE INDEX customers_name_ux ON customers (name)',
      checks: [
        IDX,
        IDX_COLS,
        "INSERT INTO customers VALUES (101, 'Inés Calvo', 'Italy', DATE '2025-07-01', 0)",
      ],
      template: 'CREATE UNIQUE INDEX games_genre_price_ux ON games (genre, price)',
      traps: [
        'CREATE INDEX customers_name_ix ON customers (name)',
        'CREATE UNIQUE INDEX customers_name_ux ON customers (name, country)',
        'CREATE INDEX customers_country_ix ON customers (country)',
      ] },
    { id: 'ddl13a', mode: 'ddl', level: 13, clause: ['CREATE VIEW', 'GROUP BY'],
      solution: 'CREATE VIEW genre_sales AS\nSELECT g.genre, COUNT(*) AS sales_count, SUM(s.total_paid) AS revenue\nFROM games g\nJOIN sales s ON s.game_id = g.game_id\nGROUP BY g.genre',
      checks: [cols('GENRE_SALES'), 'SELECT * FROM genre_sales ORDER BY genre', "SELECT view_name FROM user_views WHERE view_name = 'GENRE_SALES'"],
      template: 'CREATE VIEW country_sales AS\nSELECT c.country, COUNT(*) AS sales_count, SUM(s.total_paid) AS revenue\nFROM customers c\nJOIN sales s ON s.customer_id = c.customer_id\nGROUP BY c.country',
      traps: [
        'CREATE VIEW genre_sales AS SELECT g.genre, SUM(s.quantity) AS sales_count, SUM(s.total_paid) AS revenue FROM games g JOIN sales s ON s.game_id = g.game_id GROUP BY g.genre',
        'CREATE VIEW genre_sales AS SELECT g.genre, COUNT(*) AS sales_count, SUM(g.price) AS revenue FROM games g JOIN sales s ON s.game_id = g.game_id GROUP BY g.genre',
        'CREATE TABLE genre_sales AS SELECT g.genre, COUNT(*) AS sales_count, SUM(s.total_paid) AS revenue FROM games g JOIN sales s ON s.game_id = g.game_id GROUP BY g.genre',
      ] },
    { id: 'ddl13b', mode: 'ddl', level: 13, clause: ['CREATE VIEW', 'LEFT JOIN'],
      solution: 'CREATE VIEW customer_purchases AS\nSELECT c.customer_id, c.name, COUNT(s.sale_id) AS purchases\nFROM customers c\nLEFT JOIN sales s ON s.customer_id = c.customer_id\nGROUP BY c.customer_id, c.name',
      checks: [cols('CUSTOMER_PURCHASES'), 'SELECT * FROM customer_purchases ORDER BY customer_id', "SELECT view_name FROM user_views WHERE view_name = 'CUSTOMER_PURCHASES'"],
      template: 'CREATE VIEW game_sales_count AS\nSELECT g.game_id, g.title, COUNT(s.sale_id) AS sales_count\nFROM games g\nLEFT JOIN sales s ON s.game_id = g.game_id\nGROUP BY g.game_id, g.title',
      traps: [
        'CREATE VIEW customer_purchases AS SELECT c.customer_id, c.name, COUNT(s.sale_id) AS purchases FROM customers c JOIN sales s ON s.customer_id = c.customer_id GROUP BY c.customer_id, c.name',
        'CREATE VIEW customer_purchases AS SELECT c.customer_id, c.name, COUNT(*) AS purchases FROM customers c LEFT JOIN sales s ON s.customer_id = c.customer_id GROUP BY c.customer_id, c.name',
        'CREATE TABLE customer_purchases AS SELECT c.customer_id, c.name, COUNT(s.sale_id) AS purchases FROM customers c LEFT JOIN sales s ON s.customer_id = c.customer_id GROUP BY c.customer_id, c.name',
      ] },
    { id: 'ddl14a', mode: 'ddl', level: 14, clause: ['CREATE INDEX'],
      solution: 'CREATE INDEX sales_cust_date_ix ON sales (customer_id, sale_date)',
      checks: [IDX, IDX_COLS],
      template: 'CREATE INDEX sales_game_date_ix ON sales (game_id, sale_date)',
      traps: [
        'CREATE INDEX sales_date_cust_ix ON sales (sale_date, customer_id)',
        'CREATE INDEX sales_cust_ix ON sales (customer_id);\nCREATE INDEX sales_date_ix ON sales (sale_date)',
        'CREATE UNIQUE INDEX sales_cust_date_ix ON sales (customer_id, sale_date)',
      ] },
    { id: 'ddl14b', mode: 'ddl', level: 14, clause: ['ON DELETE CASCADE'],
      solution: 'CREATE TABLE game_screenshots (\n  shot_id  NUMBER(6)     PRIMARY KEY,\n  game_id  NUMBER(4)     NOT NULL REFERENCES games (game_id) ON DELETE CASCADE,\n  url      VARCHAR2(100) NOT NULL UNIQUE\n)',
      checks: [
        cols('GAME_SCREENSHOTS'),
        "INSERT INTO game_screenshots VALUES (1, 9, 'moonmoss-1.png');\nDELETE FROM games WHERE game_id = 9;\nSELECT COUNT(*) FROM game_screenshots",
        "INSERT INTO game_screenshots SELECT 2, 6, 'shared.png' FROM dual UNION ALL SELECT 3, 7, 'shared.png' FROM dual",
        "INSERT INTO game_screenshots VALUES (4, 99, 'ghost.png')",
      ],
      template: 'CREATE TABLE customer_emails (\n  email_id     NUMBER(6)    PRIMARY KEY,\n  customer_id  NUMBER(4)    NOT NULL REFERENCES customers (customer_id) ON DELETE CASCADE,\n  email        VARCHAR2(60) NOT NULL UNIQUE\n)',
      traps: [
        'CREATE TABLE game_screenshots (shot_id NUMBER(6) PRIMARY KEY, game_id NUMBER(4) NOT NULL REFERENCES games (game_id), url VARCHAR2(100) NOT NULL UNIQUE)',
        'CREATE TABLE game_screenshots (shot_id NUMBER(6) PRIMARY KEY, game_id NUMBER(4) NOT NULL REFERENCES games (game_id) ON DELETE CASCADE, url VARCHAR2(100) NOT NULL)',
      ] },
    { id: 'ddl15a', mode: 'ddl', level: 15, clause: ['CREATE VIEW', 'AVG'],
      solution: 'CREATE VIEW premium_games AS\nSELECT g.title, g.genre, g.price\nFROM games g\nWHERE g.price > (SELECT AVG(g2.price) FROM games g2 WHERE g2.genre = g.genre)',
      checks: [cols('PREMIUM_GAMES'), 'SELECT * FROM premium_games ORDER BY title', "SELECT view_name FROM user_views WHERE view_name = 'PREMIUM_GAMES'"],
      template: 'CREATE VIEW big_sales AS\nSELECT s.sale_id, s.customer_id, s.total_paid\nFROM sales s\nWHERE s.total_paid > (SELECT AVG(s2.total_paid) FROM sales s2 WHERE s2.customer_id = s.customer_id)',
      traps: [
        'CREATE VIEW premium_games AS SELECT g.title, g.genre, g.price FROM games g WHERE g.price > (SELECT AVG(price) FROM games)',
        'CREATE VIEW premium_games AS SELECT g.title, g.genre, g.price FROM games g WHERE g.price < (SELECT AVG(g2.price) FROM games g2 WHERE g2.genre = g.genre)',
        'CREATE TABLE premium_games AS SELECT g.title, g.genre, g.price FROM games g WHERE g.price > (SELECT AVG(g2.price) FROM games g2 WHERE g2.genre = g.genre)',
      ] },
    { id: 'ddl15b', mode: 'ddl', level: 15, clause: ['CREATE TABLE', 'REFERENCES', 'CREATE INDEX'],
      solution: 'CREATE TABLE platforms (\n  platform_id  NUMBER(3)    PRIMARY KEY,\n  name         VARCHAR2(30) NOT NULL\n);\nALTER TABLE sales ADD platform_id NUMBER(3) REFERENCES platforms (platform_id);\nCREATE INDEX sales_platform_ix ON sales (platform_id)',
      checks: [
        cols('PLATFORMS'),
        cols('SALES'),
        "INSERT INTO platforms VALUES (1, 'PC');\nUPDATE sales SET platform_id = 1 WHERE sale_id = 1;\nSELECT sale_id, platform_id FROM sales WHERE platform_id IS NOT NULL",
        'UPDATE sales SET platform_id = 7 WHERE sale_id = 2',
        IDX_COLS,
      ],
      template: 'CREATE TABLE stores (\n  store_id  NUMBER(3)    PRIMARY KEY,\n  city      VARCHAR2(30) NOT NULL\n);\nALTER TABLE customers ADD store_id NUMBER(3) REFERENCES stores (store_id);\nCREATE INDEX customers_store_ix ON customers (store_id)',
      traps: [
        'CREATE TABLE platforms (platform_id NUMBER(3) PRIMARY KEY, name VARCHAR2(30) NOT NULL);\nALTER TABLE sales ADD platform_id NUMBER(3) REFERENCES platforms (platform_id)',
        'CREATE TABLE platforms (platform_id NUMBER(3) PRIMARY KEY, name VARCHAR2(30) NOT NULL);\nALTER TABLE sales ADD platform_id NUMBER(3);\nCREATE INDEX sales_platform_ix ON sales (platform_id)',
        'CREATE TABLE platforms (platform_id NUMBER(3) PRIMARY KEY, name VARCHAR2(30) NOT NULL);\nALTER TABLE sales ADD platform_id NUMBER(3) NOT NULL REFERENCES platforms (platform_id);\nCREATE INDEX sales_platform_ix ON sales (platform_id)',
      ] },
  ];
  QUESTIONS.forEach((q) => { if (!bank.questions.some((x) => x.id === q.id)) bank.questions.push(q); });
  if (typeof module !== 'undefined') module.exports = QUESTIONS;
})();
