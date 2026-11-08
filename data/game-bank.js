'use strict';
/* Query for a Million (#/game): the question bank, language-neutral. Contract: docs/game-quiz.md §3, §5.
   A fictional video-game shop: 20 customers, 24 games, 53 sales in 2024–2025. Every name and title is invented.
   The data is built for the questions: customers 13, 18 and 20 never bought; games 9, 17 and 22 never sold;
   games 5, 9, 13 and 17 have no rating; no ties on any column a question sorts or cuts by.
   Each question: id (rung + letter), level 1–15, solution (one Oracle SELECT), ordered (rows compared in order),
   clause (the SQL keywords the Key clause lifeline names), template (same shape, other data), traps (typical
   wrong answers that give a different result). The texts live in data/{en,es}/game.js.
   Checked by tools/check-game-bank.mjs. */
const GAME_BANK = {
  setup: `CREATE TABLE customers (
  customer_id  NUMBER(4)    PRIMARY KEY,
  name         VARCHAR2(40) NOT NULL,
  country      VARCHAR2(30) NOT NULL,
  signup_date  DATE         NOT NULL,
  vip_level    NUMBER(1)    NOT NULL CHECK (vip_level BETWEEN 0 AND 3)
);
CREATE TABLE games (
  game_id  NUMBER(4)    PRIMARY KEY,
  title    VARCHAR2(60) NOT NULL UNIQUE,
  genre    VARCHAR2(20) NOT NULL,
  price    NUMBER(6,2)  NOT NULL,
  stock    NUMBER(4)    NOT NULL,
  rating   NUMBER(3,1)
);
CREATE TABLE sales (
  sale_id      NUMBER(5)   PRIMARY KEY,
  customer_id  NUMBER(4)   NOT NULL REFERENCES customers (customer_id),
  game_id      NUMBER(4)   NOT NULL REFERENCES games (game_id),
  sale_date    DATE        NOT NULL,
  quantity     NUMBER(3)   NOT NULL,
  total_paid   NUMBER(8,2) NOT NULL
);
INSERT INTO customers VALUES (1, 'Inés Calvo', 'Spain', DATE '2023-02-11', 2);
INSERT INTO customers VALUES (2, 'Mateo Rinaldi', 'Italy', DATE '2023-03-27', 1);
INSERT INTO customers VALUES (3, 'Camille Dufour', 'France', DATE '2023-04-15', 3);
INSERT INTO customers VALUES (4, 'Diego Arriaga', 'Mexico', DATE '2023-06-02', 0);
INSERT INTO customers VALUES (5, 'Sofia Brandt', 'Germany', DATE '2023-07-19', 2);
INSERT INTO customers VALUES (6, 'João Ventura', 'Portugal', DATE '2023-09-08', 1);
INSERT INTO customers VALUES (7, 'Valentina Ocampo', 'Argentina', DATE '2023-10-30', 3);
INSERT INTO customers VALUES (8, 'Pablo Serrano', 'Spain', DATE '2023-12-05', 0);
INSERT INTO customers VALUES (9, 'Léa Moreau', 'France', DATE '2024-01-22', 1);
INSERT INTO customers VALUES (10, 'Tomás Huerta', 'Chile', DATE '2024-02-14', 2);
INSERT INTO customers VALUES (11, 'Greta Vogel', 'Germany', DATE '2024-03-30', 0);
INSERT INTO customers VALUES (12, 'Renata Quiroga', 'Mexico', DATE '2024-05-17', 1);
INSERT INTO customers VALUES (13, 'Nuno Barros', 'Portugal', DATE '2024-06-25', 0);
INSERT INTO customers VALUES (14, 'Alba Montero', 'Spain', DATE '2024-08-09', 3);
INSERT INTO customers VALUES (15, 'Bruno Castelli', 'Italy', DATE '2024-09-13', 0);
INSERT INTO customers VALUES (16, 'Martina Sosa', 'Uruguay', DATE '2024-11-02', 1);
INSERT INTO customers VALUES (17, 'Hugo Lacroix', 'France', DATE '2025-01-18', 0);
INSERT INTO customers VALUES (18, 'Elena Paredes', 'Spain', DATE '2025-03-06', 1);
INSERT INTO customers VALUES (19, 'Ximena Robles', 'Mexico', DATE '2025-04-21', 2);
INSERT INTO customers VALUES (20, 'Kai Neumann', 'Germany', DATE '2025-06-10', 0);
INSERT INTO games VALUES (1, 'Ironclad Vanguard', 'Action', 59.99, 14, 8.1);
INSERT INTO games VALUES (2, 'Neon Ronin', 'Action', 39.99, 0, 7.6);
INSERT INTO games VALUES (3, 'Rust Canyon Outlaws', 'Action', 24.99, 31, 6.9);
INSERT INTO games VALUES (4, 'Pixel Brawlers', 'Action', 9.99, 52, 7.2);
INSERT INTO games VALUES (5, 'Hollow Siege', 'Action', 49.99, 3, NULL);
INSERT INTO games VALUES (6, 'Lantern of the Deep', 'Adventure', 29.99, 18, 8.7);
INSERT INTO games VALUES (7, 'Skyward Cartographer', 'Adventure', 34.99, 9, 8.3);
INSERT INTO games VALUES (8, 'The Paper Lighthouse', 'Adventure', 14.99, 27, 7.9);
INSERT INTO games VALUES (9, 'Moonmoss Hollow', 'Adventure', 19.99, 5, NULL);
INSERT INTO games VALUES (10, 'Tile Tide', 'Puzzle', 4.99, 80, 7.4);
INSERT INTO games VALUES (11, 'Quantum Knots', 'Puzzle', 6.99, 46, 8.0);
INSERT INTO games VALUES (12, 'Glass Labyrinth', 'Puzzle', 12.99, 0, 8.6);
INSERT INTO games VALUES (13, 'Sky Garden Riddles', 'Puzzle', 8.99, 33, NULL);
INSERT INTO games VALUES (14, 'Chronicles of Ashveil', 'RPG', 69.99, 7, 9.1);
INSERT INTO games VALUES (15, 'Starforge Wanderer', 'RPG', 44.99, 22, 8.8);
INSERT INTO games VALUES (16, 'Bramble Knight', 'RPG', 27.99, 2, 7.7);
INSERT INTO games VALUES (17, 'Embers of Valdren', 'RPG', 54.99, 0, NULL);
INSERT INTO games VALUES (18, 'Turbo Lynx GP', 'Racing', 31.99, 16, 7.0);
INSERT INTO games VALUES (19, 'Blue Sky Derby', 'Racing', 36.99, 12, 7.3);
INSERT INTO games VALUES (20, 'Skyline Overdrive', 'Racing', 19.99, 0, 6.5);
INSERT INTO games VALUES (21, 'Pitchside Heroes', 'Sports', 47.99, 20, 7.8);
INSERT INTO games VALUES (22, 'Slam Court Kings', 'Sports', 39.49, 8, 6.8);
INSERT INTO games VALUES (23, 'Kingdoms of Brass', 'Strategy', 44.99, 15, 8.9);
INSERT INTO games VALUES (24, 'Sky Harbor Tycoon', 'Strategy', 32.99, 24, 8.2);
INSERT INTO sales VALUES (1, 1, 14, DATE '2024-01-15', 1, 69.99);
INSERT INTO sales VALUES (2, 2, 1, DATE '2024-02-03', 1, 59.99);
INSERT INTO sales VALUES (3, 3, 6, DATE '2024-02-20', 1, 29.99);
INSERT INTO sales VALUES (4, 7, 10, DATE '2024-03-04', 3, 14.97);
INSERT INTO sales VALUES (5, 4, 3, DATE '2024-03-18', 1, 24.99);
INSERT INTO sales VALUES (6, 5, 23, DATE '2024-04-02', 1, 44.99);
INSERT INTO sales VALUES (7, 10, 18, DATE '2024-04-12', 1, 31.99);
INSERT INTO sales VALUES (8, 6, 8, DATE '2024-04-29', 1, 14.99);
INSERT INTO sales VALUES (9, 2, 11, DATE '2024-05-10', 2, 13.98);
INSERT INTO sales VALUES (10, 9, 7, DATE '2024-05-23', 1, 34.99);
INSERT INTO sales VALUES (11, 7, 15, DATE '2024-06-06', 1, 44.99);
INSERT INTO sales VALUES (12, 1, 4, DATE '2024-06-19', 1, 9.99);
INSERT INTO sales VALUES (13, 11, 21, DATE '2024-07-01', 1, 47.99);
INSERT INTO sales VALUES (14, 12, 2, DATE '2024-07-14', 1, 39.99);
INSERT INTO sales VALUES (15, 3, 19, DATE '2024-07-30', 1, 36.99);
INSERT INTO sales VALUES (16, 8, 10, DATE '2024-08-11', 1, 4.99);
INSERT INTO sales VALUES (17, 14, 24, DATE '2024-08-25', 1, 32.99);
INSERT INTO sales VALUES (18, 15, 1, DATE '2024-09-20', 1, 53.99);
INSERT INTO sales VALUES (19, 5, 12, DATE '2024-10-03', 1, 12.99);
INSERT INTO sales VALUES (20, 10, 4, DATE '2024-10-17', 2, 19.98);
INSERT INTO sales VALUES (21, 16, 16, DATE '2024-11-08', 1, 27.99);
INSERT INTO sales VALUES (22, 4, 5, DATE '2024-11-22', 1, 49.99);
INSERT INTO sales VALUES (23, 6, 20, DATE '2024-12-05', 1, 19.99);
INSERT INTO sales VALUES (24, 7, 6, DATE '2024-12-19', 1, 29.99);
INSERT INTO sales VALUES (25, 2, 13, DATE '2024-12-28', 1, 8.99);
INSERT INTO sales VALUES (26, 17, 10, DATE '2025-01-25', 1, 4.99);
INSERT INTO sales VALUES (27, 1, 15, DATE '2025-02-02', 1, 44.99);
INSERT INTO sales VALUES (28, 9, 3, DATE '2025-02-14', 1, 24.99);
INSERT INTO sales VALUES (29, 12, 14, DATE '2025-02-27', 2, 139.98);
INSERT INTO sales VALUES (30, 10, 23, DATE '2025-03-08', 1, 44.99);
INSERT INTO sales VALUES (31, 7, 10, DATE '2025-03-21', 1, 4.99);
INSERT INTO sales VALUES (32, 3, 11, DATE '2025-04-04', 1, 6.99);
INSERT INTO sales VALUES (33, 14, 7, DATE '2025-04-15', 1, 34.99);
INSERT INTO sales VALUES (34, 19, 6, DATE '2025-04-28', 1, 29.99);
INSERT INTO sales VALUES (35, 15, 18, DATE '2025-05-09', 1, 31.99);
INSERT INTO sales VALUES (36, 5, 4, DATE '2025-05-20', 2, 19.98);
INSERT INTO sales VALUES (37, 11, 1, DATE '2025-06-01', 1, 59.99);
INSERT INTO sales VALUES (38, 16, 10, DATE '2025-06-14', 3, 14.97);
INSERT INTO sales VALUES (39, 17, 19, DATE '2025-06-27', 1, 36.99);
INSERT INTO sales VALUES (40, 6, 7, DATE '2025-07-08', 1, 34.99);
INSERT INTO sales VALUES (41, 2, 15, DATE '2025-07-19', 3, 134.97);
INSERT INTO sales VALUES (42, 8, 8, DATE '2025-08-02', 1, 14.99);
INSERT INTO sales VALUES (43, 10, 21, DATE '2025-08-15', 1, 47.99);
INSERT INTO sales VALUES (44, 19, 23, DATE '2025-08-29', 1, 44.99);
INSERT INTO sales VALUES (45, 4, 10, DATE '2025-09-10', 1, 4.99);
INSERT INTO sales VALUES (46, 7, 21, DATE '2025-09-23', 1, 43.19);
INSERT INTO sales VALUES (47, 12, 11, DATE '2025-10-04', 1, 6.99);
INSERT INTO sales VALUES (48, 14, 2, DATE '2025-10-16', 1, 39.99);
INSERT INTO sales VALUES (49, 15, 3, DATE '2025-10-29', 1, 24.99);
INSERT INTO sales VALUES (50, 9, 13, DATE '2025-11-07', 1, 8.99);
INSERT INTO sales VALUES (51, 16, 15, DATE '2025-11-18', 1, 44.99);
INSERT INTO sales VALUES (52, 17, 10, DATE '2025-11-30', 1, 4.99);
INSERT INTO sales VALUES (53, 19, 4, DATE '2025-12-12', 2, 19.98);`,

  schema: {
    customers: ['customer_id', 'name', 'country', 'signup_date', 'vip_level'],
    games: ['game_id', 'title', 'genre', 'price', 'stock', 'rating'],
    sales: ['sale_id', 'customer_id', 'game_id', 'sale_date', 'quantity', 'total_paid'],
  },
  types: {
    customers: ['NUMBER(4)', 'VARCHAR2(40)', 'VARCHAR2(30)', 'DATE', 'NUMBER(1)'],
    games: ['NUMBER(4)', 'VARCHAR2(60)', 'VARCHAR2(20)', 'NUMBER(6,2)', 'NUMBER(4)', 'NUMBER(3,1)'],
    sales: ['NUMBER(5)', 'NUMBER(4)', 'NUMBER(4)', 'DATE', 'NUMBER(3)', 'NUMBER(8,2)'],
  },

  questions: [
    /* ───── Easy (1–5): SELECT, WHERE, ORDER BY, FETCH FIRST, DISTINCT, IS NULL, LIKE, BETWEEN, IN ───── */
    { id: 'r01a', level: 1, ordered: false, clause: ['WHERE'],
      solution: "SELECT title, price FROM games WHERE genre = 'Puzzle'",
      template: "SELECT name, country FROM customers WHERE country = 'Italy'",
      traps: ["SELECT title FROM games WHERE genre = 'Puzzle'", "SELECT title, price FROM games WHERE genre = 'puzzle'"] },
    { id: 'r01b', level: 1, ordered: false, clause: ['WHERE'],
      solution: "SELECT name, signup_date FROM customers WHERE country = 'Mexico'",
      template: "SELECT title, stock FROM games WHERE genre = 'Racing'",
      traps: ["SELECT name, country FROM customers WHERE country = 'Mexico'", "SELECT name, signup_date FROM customers WHERE country = 'MEXICO'"] },
    { id: 'r01c', level: 1, ordered: false, clause: ['WHERE'],
      solution: 'SELECT title, stock FROM games WHERE stock < 5',
      template: 'SELECT name, vip_level FROM customers WHERE vip_level < 1',
      traps: ['SELECT title, stock FROM games WHERE stock <= 5', 'SELECT title, stock FROM games WHERE stock = 0'] },

    { id: 'r02a', level: 2, ordered: true, clause: ['WHERE', 'ORDER BY', 'DESC'],
      solution: "SELECT title, price FROM games WHERE genre = 'Racing' ORDER BY price DESC",
      template: "SELECT name, signup_date FROM customers WHERE country = 'France' ORDER BY signup_date DESC",
      traps: ["SELECT title, price FROM games WHERE genre = 'Racing' ORDER BY price", "SELECT title, price FROM games WHERE genre = 'Racing' ORDER BY title"] },
    { id: 'r02b', level: 2, ordered: true, clause: ['WHERE', 'ORDER BY'],
      solution: "SELECT name, signup_date FROM customers WHERE country = 'Spain' ORDER BY signup_date",
      template: "SELECT title, price FROM games WHERE genre = 'Puzzle' ORDER BY price",
      traps: ["SELECT name, signup_date FROM customers WHERE country = 'Spain' ORDER BY signup_date DESC", "SELECT name, signup_date FROM customers WHERE country = 'Spain' ORDER BY name"] },
    { id: 'r02c', level: 2, ordered: true, clause: ['WHERE', 'ORDER BY'],
      solution: 'SELECT name, country FROM customers WHERE vip_level = 3 ORDER BY name',
      template: 'SELECT title, genre FROM games WHERE stock = 0 ORDER BY title',
      traps: ['SELECT name, country FROM customers WHERE vip_level = 3 ORDER BY name DESC', 'SELECT name, country FROM customers WHERE vip_level = 3 ORDER BY customer_id'] },

    { id: 'r03a', level: 3, ordered: false, clause: ['LIKE'],
      solution: "SELECT title, price FROM games WHERE title LIKE 'Sky%'",
      template: "SELECT name, country FROM customers WHERE name LIKE 'M%'",
      traps: ["SELECT title, price FROM games WHERE title LIKE '%Sky%'", "SELECT title, price FROM games WHERE title LIKE 'Sky %'"] },
    { id: 'r03b', level: 3, ordered: false, clause: ['BETWEEN'],
      solution: 'SELECT title, price FROM games WHERE price BETWEEN 19.99 AND 29.99',
      template: "SELECT name, signup_date FROM customers WHERE signup_date BETWEEN DATE '2024-01-01' AND DATE '2024-06-30'",
      traps: ['SELECT title, price FROM games WHERE price > 19.99 AND price < 29.99', 'SELECT title, price FROM games WHERE price BETWEEN 20 AND 30'] },
    { id: 'r03c', level: 3, ordered: false, clause: ['IN'],
      solution: "SELECT name, country FROM customers WHERE country IN ('Argentina', 'Chile', 'Uruguay')",
      template: "SELECT title, genre FROM games WHERE genre IN ('Sports', 'Strategy')",
      traps: ["SELECT name, country FROM customers WHERE country IN ('Argentina', 'Chile')", "SELECT name, country FROM customers WHERE country NOT IN ('Argentina', 'Chile', 'Uruguay')"] },

    { id: 'r04a', level: 4, ordered: false, clause: ['IS NULL'],
      solution: 'SELECT title, genre FROM games WHERE rating IS NULL',
      template: 'SELECT title, price FROM games WHERE rating IS NOT NULL AND price > 50',
      traps: ['SELECT title, genre FROM games WHERE rating = NULL', 'SELECT title, genre FROM games WHERE rating = 0'] },
    { id: 'r04b', level: 4, ordered: false, clause: ['DISTINCT'],
      solution: 'SELECT DISTINCT country FROM customers WHERE vip_level >= 2',
      template: 'SELECT DISTINCT genre FROM games WHERE stock = 0',
      traps: ['SELECT country FROM customers WHERE vip_level >= 2', 'SELECT DISTINCT country FROM customers WHERE vip_level > 2'] },
    { id: 'r04c', level: 4, ordered: false, clause: ['DISTINCT'],
      solution: 'SELECT DISTINCT genre FROM games WHERE price < 10',
      template: 'SELECT DISTINCT country FROM customers WHERE vip_level = 0',
      traps: ['SELECT genre FROM games WHERE price < 10', 'SELECT DISTINCT genre, title FROM games WHERE price < 10'] },

    { id: 'r05a', level: 5, ordered: true, clause: ['ORDER BY', 'FETCH FIRST'],
      solution: 'SELECT title, price FROM games WHERE stock > 0 ORDER BY price DESC FETCH FIRST 3 ROWS ONLY',
      template: 'SELECT name, signup_date FROM customers WHERE vip_level > 0 ORDER BY signup_date FETCH FIRST 2 ROWS ONLY',
      traps: ['SELECT title, price FROM games ORDER BY price DESC FETCH FIRST 3 ROWS ONLY', 'SELECT title, price FROM games WHERE stock > 0 ORDER BY price FETCH FIRST 3 ROWS ONLY'] },
    { id: 'r05b', level: 5, ordered: true, clause: ['ORDER BY', 'FETCH FIRST'],
      solution: 'SELECT name, signup_date FROM customers WHERE vip_level >= 1 ORDER BY signup_date DESC FETCH FIRST 3 ROWS ONLY',
      template: 'SELECT title, stock FROM games WHERE genre = \'Action\' ORDER BY stock DESC FETCH FIRST 2 ROWS ONLY',
      traps: ['SELECT name, signup_date FROM customers ORDER BY signup_date DESC FETCH FIRST 3 ROWS ONLY', 'SELECT name, signup_date FROM customers WHERE vip_level > 1 ORDER BY signup_date DESC FETCH FIRST 3 ROWS ONLY'] },
    { id: 'r05c', level: 5, ordered: true, clause: ['IN', 'ORDER BY', 'FETCH FIRST'],
      solution: "SELECT title, genre, price FROM games WHERE genre IN ('Action', 'Adventure') ORDER BY price FETCH FIRST 3 ROWS ONLY",
      template: "SELECT name, country, signup_date FROM customers WHERE country IN ('Italy', 'Germany') ORDER BY signup_date FETCH FIRST 2 ROWS ONLY",
      traps: ["SELECT title, genre, price FROM games WHERE genre IN ('Action', 'Adventure') ORDER BY price DESC FETCH FIRST 3 ROWS ONLY", 'SELECT title, genre, price FROM games ORDER BY price FETCH FIRST 3 ROWS ONLY'] },

    /* ───── Medium (6–10): COUNT, SUM, AVG, MIN, MAX, GROUP BY, HAVING, ROUND, one table ───── */
    { id: 'r06a', level: 6, ordered: false, clause: ['COUNT'],
      solution: "SELECT COUNT(*) FROM games WHERE genre = 'RPG'",
      template: "SELECT COUNT(*) FROM customers WHERE country = 'France'",
      traps: ["SELECT COUNT(rating) FROM games WHERE genre = 'RPG'", 'SELECT COUNT(*) FROM games'] },
    { id: 'r06b', level: 6, ordered: false, clause: ['AVG', 'ROUND'],
      solution: 'SELECT ROUND(AVG(price), 2) FROM games',
      template: 'SELECT ROUND(AVG(total_paid), 2) FROM sales',
      traps: ['SELECT AVG(price) FROM games', 'SELECT ROUND(AVG(price)) FROM games'] },
    { id: 'r06c', level: 6, ordered: false, clause: ['MIN', 'MAX'],
      solution: "SELECT MIN(price), MAX(price) FROM games WHERE genre = 'Adventure'",
      template: "SELECT MIN(signup_date), MAX(signup_date) FROM customers WHERE country = 'Spain'",
      traps: ['SELECT MIN(price), MAX(price) FROM games', "SELECT MAX(price), MIN(price) FROM games WHERE genre = 'Adventure'"] },

    { id: 'r07a', level: 7, ordered: false, clause: ['COUNT'],
      solution: 'SELECT COUNT(rating) FROM games',
      template: "SELECT COUNT(rating) FROM games WHERE genre = 'Puzzle'",
      traps: ['SELECT COUNT(*) FROM games', 'SELECT COUNT(*) FROM games WHERE rating IS NULL'] },
    { id: 'r07b', level: 7, ordered: false, clause: ['SUM', 'EXTRACT'],
      solution: 'SELECT SUM(quantity), ROUND(SUM(total_paid), 2) FROM sales WHERE EXTRACT(YEAR FROM sale_date) = 2025',
      template: 'SELECT SUM(quantity), SUM(total_paid) FROM sales WHERE game_id = 10',
      traps: ['SELECT COUNT(*), SUM(total_paid) FROM sales WHERE EXTRACT(YEAR FROM sale_date) = 2025', 'SELECT SUM(quantity), SUM(total_paid) FROM sales'] },
    { id: 'r07c', level: 7, ordered: false, clause: ['COUNT', 'DISTINCT'],
      solution: 'SELECT COUNT(DISTINCT customer_id) FROM sales',
      template: 'SELECT COUNT(DISTINCT genre) FROM games WHERE price > 40',
      traps: ['SELECT COUNT(customer_id) FROM sales', 'SELECT COUNT(*) FROM customers'] },

    { id: 'r08a', level: 8, ordered: false, clause: ['GROUP BY'],
      solution: 'SELECT genre, COUNT(*) FROM games GROUP BY genre',
      template: 'SELECT country, COUNT(*) FROM customers GROUP BY country',
      traps: ['SELECT genre, COUNT(rating) FROM games GROUP BY genre', 'SELECT COUNT(*) FROM games'] },
    { id: 'r08b', level: 8, ordered: false, clause: ['GROUP BY'],
      solution: 'SELECT vip_level, COUNT(*) FROM customers GROUP BY vip_level',
      template: 'SELECT game_id, COUNT(*) FROM sales GROUP BY game_id',
      traps: ['SELECT DISTINCT vip_level FROM customers', 'SELECT vip_level, SUM(vip_level) FROM customers GROUP BY vip_level'] },
    { id: 'r08c', level: 8, ordered: false, clause: ['GROUP BY', 'SUM'],
      solution: 'SELECT genre, SUM(stock) FROM games GROUP BY genre',
      template: 'SELECT customer_id, SUM(quantity) FROM sales GROUP BY customer_id',
      traps: ['SELECT genre, COUNT(stock) FROM games GROUP BY genre', 'SELECT genre, MAX(stock) FROM games GROUP BY genre'] },

    { id: 'r09a', level: 9, ordered: false, clause: ['GROUP BY', 'HAVING'],
      solution: 'SELECT genre, COUNT(*) FROM games GROUP BY genre HAVING COUNT(*) > 3',
      template: 'SELECT country, COUNT(*) FROM customers GROUP BY country HAVING COUNT(*) > 2',
      traps: ['SELECT genre, COUNT(*) FROM games GROUP BY genre HAVING COUNT(*) >= 3', 'SELECT genre, COUNT(*) FROM games WHERE stock > 3 GROUP BY genre'] },
    { id: 'r09b', level: 9, ordered: false, clause: ['GROUP BY', 'HAVING'],
      solution: 'SELECT customer_id, COUNT(*) FROM sales GROUP BY customer_id HAVING COUNT(*) >= 4',
      template: 'SELECT game_id, COUNT(*) FROM sales GROUP BY game_id HAVING COUNT(*) >= 3',
      traps: ['SELECT customer_id, COUNT(*) FROM sales GROUP BY customer_id HAVING COUNT(*) > 4', 'SELECT customer_id, SUM(quantity) FROM sales GROUP BY customer_id HAVING SUM(quantity) >= 4'] },
    { id: 'r09c', level: 9, ordered: false, clause: ['GROUP BY', 'HAVING', 'AVG'],
      solution: 'SELECT genre, ROUND(AVG(price), 2) FROM games GROUP BY genre HAVING AVG(price) > 30',
      template: 'SELECT country, ROUND(AVG(vip_level), 2) FROM customers GROUP BY country HAVING AVG(vip_level) > 1',
      traps: ['SELECT genre, ROUND(AVG(price), 2) FROM games WHERE price > 30 GROUP BY genre', 'SELECT genre, ROUND(AVG(price), 2) FROM games GROUP BY genre HAVING MAX(price) > 30'] },

    { id: 'r10a', level: 10, ordered: true, clause: ['GROUP BY', 'ORDER BY', 'FETCH FIRST'],
      solution: 'SELECT game_id, SUM(quantity) FROM sales GROUP BY game_id ORDER BY SUM(quantity) DESC FETCH FIRST 3 ROWS ONLY',
      template: 'SELECT country, COUNT(*) FROM customers GROUP BY country ORDER BY COUNT(*) DESC FETCH FIRST 1 ROWS ONLY',
      traps: ['SELECT game_id, COUNT(*) FROM sales GROUP BY game_id ORDER BY COUNT(*) DESC FETCH FIRST 3 ROWS ONLY', 'SELECT game_id, SUM(quantity) FROM sales GROUP BY game_id ORDER BY SUM(quantity) FETCH FIRST 3 ROWS ONLY'] },
    { id: 'r10b', level: 10, ordered: true, clause: ['EXTRACT', 'GROUP BY', 'ORDER BY'],
      solution: 'SELECT EXTRACT(YEAR FROM sale_date), COUNT(*), ROUND(SUM(total_paid), 2) FROM sales GROUP BY EXTRACT(YEAR FROM sale_date) ORDER BY EXTRACT(YEAR FROM sale_date)',
      template: 'SELECT EXTRACT(YEAR FROM signup_date), COUNT(*) FROM customers GROUP BY EXTRACT(YEAR FROM signup_date) ORDER BY EXTRACT(YEAR FROM signup_date)',
      traps: ['SELECT EXTRACT(YEAR FROM sale_date), SUM(quantity), SUM(total_paid) FROM sales GROUP BY EXTRACT(YEAR FROM sale_date) ORDER BY EXTRACT(YEAR FROM sale_date)', 'SELECT EXTRACT(YEAR FROM sale_date), COUNT(*), SUM(total_paid) FROM sales GROUP BY EXTRACT(YEAR FROM sale_date) ORDER BY EXTRACT(YEAR FROM sale_date) DESC'] },
    { id: 'r10c', level: 10, ordered: true, clause: ['GROUP BY', 'HAVING', 'ORDER BY'],
      solution: 'SELECT customer_id, ROUND(SUM(total_paid), 2) FROM sales GROUP BY customer_id HAVING SUM(total_paid) > 120 ORDER BY SUM(total_paid) DESC',
      template: 'SELECT genre, SUM(stock) FROM games GROUP BY genre HAVING SUM(stock) > 50 ORDER BY SUM(stock) DESC',
      traps: ['SELECT customer_id, SUM(total_paid) FROM sales WHERE total_paid > 120 GROUP BY customer_id ORDER BY SUM(total_paid) DESC', 'SELECT customer_id, SUM(total_paid) FROM sales GROUP BY customer_id HAVING SUM(total_paid) > 120 ORDER BY SUM(total_paid)'] },

    /* ───── Hard (11–15): INNER JOIN, LEFT JOIN, subqueries, joins + GROUP BY ───── */
    { id: 'r11a', level: 11, ordered: false, clause: ['JOIN'],
      solution: 'SELECT s.sale_date, g.title, s.quantity FROM sales s JOIN games g ON g.game_id = s.game_id WHERE s.quantity >= 2',
      template: 'SELECT s.sale_date, c.name FROM sales s JOIN customers c ON c.customer_id = s.customer_id WHERE s.total_paid > 100',
      traps: ['SELECT s.sale_date, g.title, s.quantity FROM sales s JOIN games g ON g.game_id = s.game_id WHERE s.quantity > 2', 'SELECT s.sale_date, s.game_id, s.quantity FROM sales s WHERE s.quantity >= 2'] },
    { id: 'r11b', level: 11, ordered: false, clause: ['JOIN'],
      solution: "SELECT c.name, s.sale_date FROM customers c JOIN sales s ON s.customer_id = c.customer_id WHERE c.country = 'Portugal'",
      template: "SELECT g.title, s.sale_date FROM games g JOIN sales s ON s.game_id = g.game_id WHERE g.genre = 'Strategy'",
      traps: ["SELECT c.name, s.sale_date FROM customers c LEFT JOIN sales s ON s.customer_id = c.customer_id WHERE c.country = 'Portugal'", "SELECT c.name, s.sale_date FROM customers c JOIN sales s ON s.sale_id = c.customer_id WHERE c.country = 'Portugal'"] },
    { id: 'r11c', level: 11, ordered: false, clause: ['JOIN', 'DISTINCT'],
      solution: 'SELECT DISTINCT g.title FROM games g JOIN sales s ON s.game_id = g.game_id WHERE s.customer_id = 7',
      template: 'SELECT DISTINCT c.country FROM customers c JOIN sales s ON s.customer_id = c.customer_id WHERE s.game_id = 10',
      traps: ['SELECT g.title FROM games g JOIN sales s ON s.game_id = g.game_id WHERE s.customer_id = 7', 'SELECT DISTINCT g.title FROM games g JOIN sales s ON s.game_id = g.game_id WHERE g.game_id = 7'] },

    { id: 'r12a', level: 12, ordered: false, clause: ['LEFT JOIN', 'IS NULL'],
      solution: 'SELECT c.name, c.country FROM customers c LEFT JOIN sales s ON s.customer_id = c.customer_id WHERE s.sale_id IS NULL',
      template: "SELECT g.title, s.sale_id FROM games g LEFT JOIN sales s ON s.game_id = g.game_id WHERE g.genre = 'RPG'",
      traps: ['SELECT c.name, c.country FROM customers c JOIN sales s ON s.customer_id = c.customer_id WHERE s.sale_id IS NULL', 'SELECT c.name, c.country FROM customers c LEFT JOIN sales s ON s.customer_id = c.customer_id'] },
    { id: 'r12b', level: 12, ordered: false, clause: ['NOT IN'],
      solution: 'SELECT title, stock FROM games WHERE game_id NOT IN (SELECT game_id FROM sales)',
      template: 'SELECT name, country FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM sales WHERE game_id = 10)',
      traps: ['SELECT title, stock FROM games WHERE game_id IN (SELECT game_id FROM sales)', 'SELECT title, stock FROM games WHERE stock = 0'] },
    { id: 'r12c', level: 12, ordered: false, clause: ['NOT EXISTS'],
      solution: 'SELECT c.name, c.country FROM customers c WHERE NOT EXISTS (SELECT 1 FROM sales s WHERE s.customer_id = c.customer_id AND EXTRACT(YEAR FROM s.sale_date) = 2024)',
      template: 'SELECT g.title, g.genre FROM games g WHERE NOT EXISTS (SELECT 1 FROM sales s WHERE s.game_id = g.game_id AND s.quantity >= 2)',
      traps: ['SELECT c.name, c.country FROM customers c WHERE NOT EXISTS (SELECT 1 FROM sales s WHERE s.customer_id = c.customer_id)', 'SELECT c.name, c.country FROM customers c WHERE EXISTS (SELECT 1 FROM sales s WHERE s.customer_id = c.customer_id AND EXTRACT(YEAR FROM s.sale_date) = 2025)'] },

    { id: 'r13a', level: 13, ordered: false, clause: ['AVG'],
      solution: "SELECT title, price FROM games WHERE genre = 'RPG' AND price > (SELECT AVG(price) FROM games)",
      template: "SELECT name, signup_date FROM customers WHERE country = 'Spain' AND signup_date > (SELECT MIN(signup_date) FROM customers WHERE country = 'Mexico')",
      traps: ["SELECT title, price FROM games WHERE genre = 'RPG' AND price > (SELECT AVG(price) FROM games WHERE genre = 'RPG')", "SELECT title, price FROM games WHERE genre = 'RPG' AND price > AVG(price)"] },
    { id: 'r13b', level: 13, ordered: false, clause: ['IN'],
      solution: "SELECT title FROM games WHERE game_id IN (SELECT game_id FROM sales WHERE customer_id IN (SELECT customer_id FROM customers WHERE country = 'France'))",
      template: "SELECT name FROM customers WHERE customer_id IN (SELECT customer_id FROM sales WHERE game_id IN (SELECT game_id FROM games WHERE genre = 'Racing'))",
      traps: ["SELECT g.title FROM games g JOIN sales s ON s.game_id = g.game_id JOIN customers c ON c.customer_id = s.customer_id WHERE c.country = 'France'", "SELECT title FROM games WHERE game_id IN (SELECT game_id FROM sales WHERE customer_id NOT IN (SELECT customer_id FROM customers WHERE country = 'France'))"] },
    { id: 'r13c', level: 13, ordered: false, clause: ['MAX', 'EXTRACT'],
      solution: 'SELECT sale_id, total_paid FROM sales WHERE EXTRACT(YEAR FROM sale_date) = 2025 AND total_paid > (SELECT MAX(total_paid) FROM sales WHERE EXTRACT(YEAR FROM sale_date) = 2024)',
      template: "SELECT title, price FROM games WHERE genre = 'Racing' AND price > (SELECT MAX(price) FROM games WHERE genre = 'Puzzle')",
      traps: ['SELECT sale_id, total_paid FROM sales WHERE EXTRACT(YEAR FROM sale_date) = 2025 AND total_paid > (SELECT AVG(total_paid) FROM sales WHERE EXTRACT(YEAR FROM sale_date) = 2024)', 'SELECT sale_id, total_paid FROM sales WHERE EXTRACT(YEAR FROM sale_date) = 2025 AND total_paid > (SELECT MAX(total_paid) FROM sales)'] },

    { id: 'r14a', level: 14, ordered: false, clause: ['LEFT JOIN', 'GROUP BY', 'COUNT'],
      solution: "SELECT c.name, COUNT(s.sale_id) FROM customers c LEFT JOIN sales s ON s.customer_id = c.customer_id WHERE c.country = 'Spain' GROUP BY c.name",
      template: "SELECT g.title, COUNT(s.sale_id) FROM games g LEFT JOIN sales s ON s.game_id = g.game_id WHERE g.genre = 'Sports' GROUP BY g.title",
      traps: ["SELECT c.name, COUNT(s.sale_id) FROM customers c JOIN sales s ON s.customer_id = c.customer_id WHERE c.country = 'Spain' GROUP BY c.name", "SELECT c.name, COUNT(*) FROM customers c LEFT JOIN sales s ON s.customer_id = c.customer_id WHERE c.country = 'Spain' GROUP BY c.name"] },
    { id: 'r14b', level: 14, ordered: true, clause: ['JOIN', 'GROUP BY', 'ORDER BY'],
      solution: 'SELECT g.genre, ROUND(SUM(s.total_paid), 2) FROM games g JOIN sales s ON s.game_id = g.game_id GROUP BY g.genre ORDER BY SUM(s.total_paid) DESC',
      template: 'SELECT c.country, SUM(s.quantity) FROM customers c JOIN sales s ON s.customer_id = c.customer_id GROUP BY c.country ORDER BY SUM(s.quantity) DESC',
      traps: ['SELECT g.genre, SUM(g.price) FROM games g JOIN sales s ON s.game_id = g.game_id GROUP BY g.genre ORDER BY SUM(g.price) DESC', 'SELECT g.genre, SUM(s.total_paid) FROM games g JOIN sales s ON s.game_id = g.game_id GROUP BY g.genre ORDER BY SUM(s.total_paid)'] },
    { id: 'r14c', level: 14, ordered: true, clause: ['MAX', 'ORDER BY'],
      solution: 'SELECT g.genre, g.title, g.price FROM games g WHERE g.price = (SELECT MAX(g2.price) FROM games g2 WHERE g2.genre = g.genre) ORDER BY g.genre',
      template: 'SELECT c.country, c.name, c.signup_date FROM customers c WHERE c.signup_date = (SELECT MIN(c2.signup_date) FROM customers c2 WHERE c2.country = c.country) ORDER BY c.country',
      traps: ['SELECT genre, title, MAX(price) FROM games GROUP BY genre ORDER BY genre', 'SELECT g.genre, g.title, g.price FROM games g WHERE g.price = (SELECT MAX(g2.price) FROM games g2) ORDER BY g.genre'] },

    { id: 'r15a', level: 15, ordered: false, clause: ['GROUP BY', 'HAVING', 'AVG'],
      solution: 'SELECT c.name, ROUND(SUM(s.total_paid), 2) FROM customers c JOIN sales s ON s.customer_id = c.customer_id GROUP BY c.name HAVING SUM(s.total_paid) > (SELECT AVG(t.total) FROM (SELECT SUM(total_paid) AS total FROM sales GROUP BY customer_id) t)',
      template: 'SELECT g.genre, SUM(g.stock) FROM games g GROUP BY g.genre HAVING SUM(g.stock) > (SELECT AVG(stock) FROM games)',
      traps: ['SELECT c.name, SUM(s.total_paid) FROM customers c JOIN sales s ON s.customer_id = c.customer_id GROUP BY c.name HAVING SUM(s.total_paid) > (SELECT AVG(total_paid) FROM sales)', 'SELECT c.name, SUM(s.total_paid) FROM customers c JOIN sales s ON s.customer_id = c.customer_id WHERE s.total_paid > (SELECT AVG(total_paid) FROM sales) GROUP BY c.name'] },
    { id: 'r15b', level: 15, ordered: false, clause: ['JOIN', 'GROUP BY', 'FETCH FIRST'],
      solution: 'SELECT g.title FROM games g JOIN sales s ON s.game_id = g.game_id WHERE s.customer_id = (SELECT customer_id FROM sales GROUP BY customer_id ORDER BY SUM(total_paid) DESC FETCH FIRST 1 ROWS ONLY)',
      template: 'SELECT c.name FROM customers c JOIN sales s ON s.customer_id = c.customer_id WHERE s.game_id = (SELECT game_id FROM sales GROUP BY game_id ORDER BY SUM(quantity) DESC FETCH FIRST 1 ROWS ONLY)',
      traps: ['SELECT g.title FROM games g JOIN sales s ON s.game_id = g.game_id WHERE s.customer_id = (SELECT customer_id FROM sales GROUP BY customer_id ORDER BY COUNT(*) DESC FETCH FIRST 1 ROWS ONLY)', 'SELECT g.title FROM games g JOIN sales s ON s.game_id = g.game_id WHERE s.customer_id = (SELECT customer_id FROM sales ORDER BY total_paid DESC FETCH FIRST 1 ROWS ONLY)'] },
    { id: 'r15c', level: 15, ordered: false, clause: ['JOIN', 'GROUP BY', 'HAVING'],
      solution: "SELECT c.country, ROUND(SUM(s.total_paid), 2) FROM customers c JOIN sales s ON s.customer_id = c.customer_id GROUP BY c.country HAVING SUM(s.total_paid) > (SELECT SUM(s2.total_paid) FROM sales s2 JOIN customers c2 ON c2.customer_id = s2.customer_id WHERE c2.country = 'Spain')",
      template: "SELECT g.genre, SUM(s.quantity) FROM games g JOIN sales s ON s.game_id = g.game_id GROUP BY g.genre HAVING SUM(s.quantity) > (SELECT SUM(s2.quantity) FROM sales s2 JOIN games g2 ON g2.game_id = s2.game_id WHERE g2.genre = 'Racing')",
      traps: ["SELECT c.country, SUM(s.total_paid) FROM customers c JOIN sales s ON s.customer_id = c.customer_id GROUP BY c.country HAVING SUM(s.total_paid) > (SELECT MAX(s2.total_paid) FROM sales s2 JOIN customers c2 ON c2.customer_id = s2.customer_id WHERE c2.country = 'Spain')", "SELECT c.country, SUM(s.total_paid) FROM customers c JOIN sales s ON s.customer_id = c.customer_id WHERE c.country <> 'Spain' GROUP BY c.country"] },
  ],
};
if (typeof module !== 'undefined') module.exports = GAME_BANK;
