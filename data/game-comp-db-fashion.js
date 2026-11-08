'use strict';
/* Query for a Million, competitive side: the fashion retail chain database (docs/game-quiz.md §16). Same contract as
   data/game-comp-db-shop.js: { key, name, setup, schema, types, join }. The questions stay private
   (tools/comp/private/fashion/); tools/comp-hidden/fashion.mjs derives the hidden dataset from this setup.
   A fictional chain: 20 stores, 24 products, 57 sales in 2024–2025. Every product name is invented; the cities and
   countries are real places, nothing else is.
   The data is built for the questions: stores 13, 17 and 20 never sold anything; products 9, 17 and 22 never sold;
   products 5, 9, 13 and 17 have no rating (NULL: no reviews yet); products 2, 12, 17 and 20 are out of stock (0);
   two sales were made with 20% off (19 and 50), every other amount is units × price; every sale_date, every
   opened_on, every price and every rating is different, so every ordered answer is unique.
   New rows in the DML and DDL questions take ids from 101 (stores, products) and 1001 (sales). */
// eslint-disable-next-line no-var, no-use-before-define
var GAME_COMP_DBS = typeof GAME_COMP_DBS !== 'undefined' ? GAME_COMP_DBS : {};
GAME_COMP_DBS.fashion = {
  key: 'fashion',
  name: { en: 'Fashion retail chain', es: 'Cadena de moda' },
  setup: `CREATE TABLE stores (
  store_id   NUMBER(4)    PRIMARY KEY,
  city       VARCHAR2(40) NOT NULL UNIQUE,
  country    VARCHAR2(30) NOT NULL,
  opened_on  DATE         NOT NULL,
  floors     NUMBER(1)    NOT NULL CHECK (floors BETWEEN 1 AND 4)
);
CREATE TABLE products (
  product_id  NUMBER(4)    PRIMARY KEY,
  name        VARCHAR2(60) NOT NULL UNIQUE,
  category    VARCHAR2(20) NOT NULL,
  section     VARCHAR2(10) NOT NULL CHECK (section IN ('Woman', 'Man', 'Kids')),
  price       NUMBER(6,2)  NOT NULL CHECK (price > 0),
  stock       NUMBER(4)    NOT NULL,
  rating      NUMBER(2,1)  CHECK (rating BETWEEN 1 AND 5)
);
CREATE TABLE sales (
  sale_id     NUMBER(5)   PRIMARY KEY,
  store_id    NUMBER(4)   NOT NULL REFERENCES stores (store_id),
  product_id  NUMBER(4)   NOT NULL REFERENCES products (product_id),
  sale_date   DATE        NOT NULL,
  units       NUMBER(3)   NOT NULL CHECK (units > 0),
  amount      NUMBER(8,2) NOT NULL
);
INSERT INTO stores VALUES (1, 'Madrid', 'Spain', DATE '2020-03-14', 3);
INSERT INTO stores VALUES (2, 'Milan', 'Italy', DATE '2020-06-02', 2);
INSERT INTO stores VALUES (3, 'Lyon', 'France', DATE '2020-09-21', 4);
INSERT INTO stores VALUES (4, 'Guadalajara', 'Mexico', DATE '2021-01-18', 1);
INSERT INTO stores VALUES (5, 'Munich', 'Germany', DATE '2021-04-07', 3);
INSERT INTO stores VALUES (6, 'Porto', 'Portugal', DATE '2021-07-26', 2);
INSERT INTO stores VALUES (7, 'Buenos Aires', 'Argentina', DATE '2021-10-11', 4);
INSERT INTO stores VALUES (8, 'Valencia', 'Spain', DATE '2022-02-03', 1);
INSERT INTO stores VALUES (9, 'Paris', 'France', DATE '2022-05-16', 2);
INSERT INTO stores VALUES (10, 'Santiago', 'Chile', DATE '2022-08-29', 3);
INSERT INTO stores VALUES (11, 'Hamburg', 'Germany', DATE '2022-11-08', 1);
INSERT INTO stores VALUES (12, 'Monterrey', 'Mexico', DATE '2023-02-20', 2);
INSERT INTO stores VALUES (13, 'Lisbon', 'Portugal', DATE '2025-10-06', 1);
INSERT INTO stores VALUES (14, 'Barcelona', 'Spain', DATE '2023-09-12', 4);
INSERT INTO stores VALUES (15, 'Turin', 'Italy', DATE '2023-12-04', 1);
INSERT INTO stores VALUES (16, 'Montevideo', 'Uruguay', DATE '2024-03-19', 2);
INSERT INTO stores VALUES (17, 'Marseille', 'France', DATE '2025-07-08', 1);
INSERT INTO stores VALUES (18, 'Malaga', 'Spain', DATE '2024-10-22', 2);
INSERT INTO stores VALUES (19, 'Puebla', 'Mexico', DATE '2025-01-27', 3);
INSERT INTO stores VALUES (20, 'Cologne', 'Germany', DATE '2025-11-03', 1);
INSERT INTO products VALUES (1, 'Poppy Field Midi Dress', 'Dresses', 'Woman', 99.95, 14, 4.2);
INSERT INTO products VALUES (2, 'Ink Satin Slip Dress', 'Dresses', 'Woman', 59.95, 0, 3.7);
INSERT INTO products VALUES (3, 'Sundial Shirt Dress', 'Dresses', 'Woman', 29.95, 31, 3.2);
INSERT INTO products VALUES (4, 'Daisy Jersey Dress', 'Dresses', 'Kids', 15.95, 52, 3.4);
INSERT INTO products VALUES (5, 'Velvet Evening Gown', 'Dresses', 'Woman', 79.95, 3, NULL);
INSERT INTO products VALUES (6, 'Oxford Linen Shirt', 'Shirts', 'Man', 39.95, 18, 4.6);
INSERT INTO products VALUES (7, 'Riviera Poplin Shirt', 'Shirts', 'Woman', 49.95, 9, 4.4);
INSERT INTO products VALUES (8, 'Gingham Camp Shirt', 'Shirts', 'Man', 22.95, 27, 4);
INSERT INTO products VALUES (9, 'Corduroy Overshirt', 'Shirts', 'Man', 25.95, 5, NULL);
INSERT INTO products VALUES (10, 'Striped Cotton Socks', 'Accessories', 'Kids', 5.95, 80, 3.6);
INSERT INTO products VALUES (11, 'Silk Knot Scarf', 'Accessories', 'Woman', 9.95, 46, 4.1);
INSERT INTO products VALUES (12, 'Braided Leather Belt', 'Accessories', 'Man', 19.95, 0, 4.5);
INSERT INTO products VALUES (13, 'Wide Brim Sun Hat', 'Accessories', 'Kids', 12.95, 33, NULL);
INSERT INTO products VALUES (14, 'Charcoal Wool Overcoat', 'Coats', 'Man', 119, 7, 4.9);
INSERT INTO products VALUES (15, 'Alpine Puffer Jacket', 'Coats', 'Kids', 65.95, 22, 4.7);
INSERT INTO products VALUES (16, 'Packable Rain Jacket', 'Coats', 'Woman', 35.95, 2, 3.8);
INSERT INTO products VALUES (17, 'Shearling Aviator Coat', 'Coats', 'Man', 89.95, 0, NULL);
INSERT INTO products VALUES (18, 'Slim Indigo Jeans', 'Jeans', 'Woman', 42.95, 16, 3.3);
INSERT INTO products VALUES (19, 'Straight Stone Jeans', 'Jeans', 'Man', 52.95, 12, 3.5);
INSERT INTO products VALUES (20, 'Wide Leg Ecru Jeans', 'Jeans', 'Woman', 27.95, 0, 3);
INSERT INTO products VALUES (21, 'Canvas Court Sneakers', 'Shoes', 'Kids', 75.95, 20, 3.9);
INSERT INTO products VALUES (22, 'Suede Chelsea Boots', 'Shoes', 'Man', 55.95, 8, 3.1);
INSERT INTO products VALUES (23, 'Quilted Shoulder Bag', 'Bags', 'Woman', 69.95, 15, 4.8);
INSERT INTO products VALUES (24, 'Woven Straw Tote', 'Bags', 'Woman', 45.95, 24, 4.3);
INSERT INTO sales VALUES (1, 1, 14, DATE '2024-01-12', 1, 119);
INSERT INTO sales VALUES (2, 2, 1, DATE '2024-01-29', 1, 99.95);
INSERT INTO sales VALUES (3, 3, 6, DATE '2024-02-16', 1, 39.95);
INSERT INTO sales VALUES (4, 7, 10, DATE '2024-03-01', 3, 17.85);
INSERT INTO sales VALUES (5, 4, 3, DATE '2024-03-15', 1, 29.95);
INSERT INTO sales VALUES (6, 5, 23, DATE '2024-03-28', 1, 69.95);
INSERT INTO sales VALUES (7, 10, 18, DATE '2024-04-10', 1, 42.95);
INSERT INTO sales VALUES (8, 6, 8, DATE '2024-04-24', 1, 22.95);
INSERT INTO sales VALUES (9, 2, 11, DATE '2024-05-08', 2, 19.9);
INSERT INTO sales VALUES (10, 11, 7, DATE '2024-05-21', 1, 49.95);
INSERT INTO sales VALUES (11, 7, 15, DATE '2024-06-04', 1, 65.95);
INSERT INTO sales VALUES (12, 1, 4, DATE '2024-06-18', 1, 15.95);
INSERT INTO sales VALUES (13, 12, 21, DATE '2024-07-02', 1, 75.95);
INSERT INTO sales VALUES (14, 14, 2, DATE '2024-07-16', 1, 59.95);
INSERT INTO sales VALUES (15, 3, 19, DATE '2024-07-31', 1, 52.95);
INSERT INTO sales VALUES (16, 10, 6, DATE '2024-08-05', 1, 39.95);
INSERT INTO sales VALUES (17, 8, 10, DATE '2024-08-13', 1, 5.95);
INSERT INTO sales VALUES (18, 15, 24, DATE '2024-08-27', 1, 45.95);
INSERT INTO sales VALUES (19, 16, 1, DATE '2024-09-10', 1, 79.96);
INSERT INTO sales VALUES (20, 5, 12, DATE '2024-09-24', 1, 19.95);
INSERT INTO sales VALUES (21, 10, 4, DATE '2024-10-08', 2, 31.9);
INSERT INTO sales VALUES (22, 16, 16, DATE '2024-10-21', 1, 35.95);
INSERT INTO sales VALUES (23, 4, 5, DATE '2024-11-05', 1, 79.95);
INSERT INTO sales VALUES (24, 6, 20, DATE '2024-11-19', 1, 27.95);
INSERT INTO sales VALUES (25, 2, 12, DATE '2024-11-28', 1, 19.95);
INSERT INTO sales VALUES (26, 7, 6, DATE '2024-12-03', 1, 39.95);
INSERT INTO sales VALUES (27, 2, 13, DATE '2024-12-17', 1, 12.95);
INSERT INTO sales VALUES (28, 14, 10, DATE '2024-12-30', 2, 11.9);
INSERT INTO sales VALUES (29, 2, 2, DATE '2025-01-05', 1, 59.95);
INSERT INTO sales VALUES (30, 9, 10, DATE '2025-01-14', 1, 5.95);
INSERT INTO sales VALUES (31, 1, 15, DATE '2025-01-27', 1, 65.95);
INSERT INTO sales VALUES (32, 9, 3, DATE '2025-02-10', 1, 29.95);
INSERT INTO sales VALUES (33, 12, 14, DATE '2025-02-24', 2, 238);
INSERT INTO sales VALUES (34, 10, 23, DATE '2025-03-10', 1, 69.95);
INSERT INTO sales VALUES (35, 7, 19, DATE '2025-03-24', 1, 52.95);
INSERT INTO sales VALUES (36, 3, 11, DATE '2025-04-07', 1, 9.95);
INSERT INTO sales VALUES (37, 14, 7, DATE '2025-04-21', 1, 49.95);
INSERT INTO sales VALUES (38, 19, 6, DATE '2025-05-05', 1, 39.95);
INSERT INTO sales VALUES (39, 15, 18, DATE '2025-05-19', 1, 42.95);
INSERT INTO sales VALUES (40, 5, 4, DATE '2025-06-02', 2, 31.9);
INSERT INTO sales VALUES (41, 11, 1, DATE '2025-06-16', 1, 99.95);
INSERT INTO sales VALUES (42, 16, 10, DATE '2025-06-30', 3, 17.85);
INSERT INTO sales VALUES (43, 9, 19, DATE '2025-07-14', 1, 52.95);
INSERT INTO sales VALUES (44, 6, 7, DATE '2025-07-28', 1, 49.95);
INSERT INTO sales VALUES (45, 2, 15, DATE '2025-08-11', 3, 197.85);
INSERT INTO sales VALUES (46, 8, 8, DATE '2025-08-25', 1, 22.95);
INSERT INTO sales VALUES (47, 10, 21, DATE '2025-09-08', 1, 75.95);
INSERT INTO sales VALUES (48, 19, 23, DATE '2025-09-22', 1, 69.95);
INSERT INTO sales VALUES (49, 4, 10, DATE '2025-10-06', 1, 5.95);
INSERT INTO sales VALUES (50, 7, 21, DATE '2025-10-20', 1, 60.76);
INSERT INTO sales VALUES (51, 12, 11, DATE '2025-11-03', 1, 9.95);
INSERT INTO sales VALUES (52, 14, 2, DATE '2025-11-17', 1, 59.95);
INSERT INTO sales VALUES (53, 15, 3, DATE '2025-12-01', 1, 29.95);
INSERT INTO sales VALUES (54, 9, 13, DATE '2025-12-09', 1, 12.95);
INSERT INTO sales VALUES (55, 16, 15, DATE '2025-12-15', 1, 65.95);
INSERT INTO sales VALUES (56, 18, 10, DATE '2025-12-22', 1, 5.95);
INSERT INTO sales VALUES (57, 19, 4, DATE '2025-12-29', 2, 31.9);`,
  schema: {
    stores: ['store_id', 'city', 'country', 'opened_on', 'floors'],
    products: ['product_id', 'name', 'category', 'section', 'price', 'stock', 'rating'],
    sales: ['sale_id', 'store_id', 'product_id', 'sale_date', 'units', 'amount'],
  },
  types: {
    stores: ['NUMBER(4)', 'VARCHAR2(40)', 'VARCHAR2(30)', 'DATE', 'NUMBER(1)'],
    products: ['NUMBER(4)', 'VARCHAR2(60)', 'VARCHAR2(20)', 'VARCHAR2(10)', 'NUMBER(6,2)', 'NUMBER(4)', 'NUMBER(2,1)'],
    sales: ['NUMBER(5)', 'NUMBER(4)', 'NUMBER(4)', 'DATE', 'NUMBER(3)', 'NUMBER(8,2)'],
  },
  join: 'SELECT <columns>\nFROM sales s\nJOIN products p ON p.product_id = s.product_id;',
};
if (typeof module !== 'undefined') module.exports = GAME_COMP_DBS.fashion;
