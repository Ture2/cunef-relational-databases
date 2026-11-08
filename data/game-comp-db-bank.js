'use strict';
/* Query for a Million, competitive side: the retail-bank database (docs/game-quiz.md §16). An attempt may draw it.
   A fictional retail bank: 9 branches, 22 clients, 36 accounts and 69 transactions in 2024–2025. Every name is
   invented; the cities and countries are real. Accounts belong to one client and one branch; transactions to one
   account. The data is built for the questions:
     - branch 6 (Bridge, Porto) has no account; clients 9, 20 and 22 have no account;
     - accounts 18, 25, 32 and 36 have no transaction; accounts 13, 21 and 26 only have transactions in 2024;
     - clients 7, 9, 15 and 20 have no risk_score (not assessed yet); accounts 6, 12, 17, 18, 22 and 25 have no
       interest_rate (not set yet); accounts 5, 12, 18, 19, 26 and 30 charge no monthly_fee;
     - client 1 has accounts at 3 branches of one country; clients 8 and 12 have accounts in 3 countries;
     - no ties on any column a question sorts or cuts by: branch staff, client since, account opened, balance and
       interest_rate, transaction txn_date and amount are all different.
   New rows in DML questions: branches, clients and accounts from 101, transactions from 1001.
   The questions stay private (tools/comp/private/bank/); the hidden dataset is tools/comp-hidden/bank.mjs. */
// eslint-disable-next-line no-var, no-use-before-define
var GAME_COMP_DBS = typeof GAME_COMP_DBS !== 'undefined' ? GAME_COMP_DBS : {};
GAME_COMP_DBS.bank = {
  key: 'bank',
  name: { en: 'Retail bank', es: 'Banco minorista' },
  setup: `CREATE TABLE branches (
  branch_id  NUMBER(3)    PRIMARY KEY,
  name       VARCHAR2(30) NOT NULL UNIQUE,
  city       VARCHAR2(30) NOT NULL,
  country    VARCHAR2(30) NOT NULL,
  staff      NUMBER(3)    NOT NULL
);
CREATE TABLE clients (
  client_id   NUMBER(4)    PRIMARY KEY,
  name        VARCHAR2(40) NOT NULL,
  country     VARCHAR2(30) NOT NULL,
  segment     VARCHAR2(10) NOT NULL CHECK (segment IN ('RETAIL', 'PREMIUM', 'PRIVATE', 'YOUTH')),
  since       DATE         NOT NULL,
  risk_score  NUMBER(1)    CHECK (risk_score BETWEEN 1 AND 5)
);
CREATE TABLE accounts (
  account_id     NUMBER(5)    PRIMARY KEY,
  client_id      NUMBER(4)    NOT NULL REFERENCES clients (client_id),
  branch_id      NUMBER(3)    NOT NULL REFERENCES branches (branch_id),
  acc_type       VARCHAR2(10) NOT NULL CHECK (acc_type IN ('CHECKING', 'SAVINGS', 'PAYROLL', 'BUSINESS')),
  opened         DATE         NOT NULL,
  balance        NUMBER(10,2) NOT NULL,
  monthly_fee    NUMBER(5,2)  NOT NULL,
  interest_rate  NUMBER(4,2)
);
CREATE TABLE transactions (
  txn_id      NUMBER(6)    PRIMARY KEY,
  account_id  NUMBER(5)    NOT NULL REFERENCES accounts (account_id),
  txn_date    DATE         NOT NULL,
  kind        VARCHAR2(10) NOT NULL CHECK (kind IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE')),
  amount      NUMBER(10,2) NOT NULL
);
INSERT INTO branches VALUES (1, 'Central', 'Madrid', 'Spain', 24);
INSERT INTO branches VALUES (2, 'Riverside', 'Seville', 'Spain', 11);
INSERT INTO branches VALUES (3, 'Old Town', 'Barcelona', 'Spain', 17);
INSERT INTO branches VALUES (4, 'Harbour', 'Valencia', 'Spain', 9);
INSERT INTO branches VALUES (5, 'Avenue', 'Lisbon', 'Portugal', 14);
INSERT INTO branches VALUES (6, 'Bridge', 'Porto', 'Portugal', 7);
INSERT INTO branches VALUES (7, 'Plaza', 'Mexico City', 'Mexico', 19);
INSERT INTO branches VALUES (8, 'North Gate', 'London', 'United Kingdom', 12);
INSERT INTO branches VALUES (9, 'Market Square', 'Warsaw', 'Poland', 8);
INSERT INTO clients VALUES (1, 'Lucía Ferrer', 'Spain', 'PREMIUM', DATE '2016-03-14', 2);
INSERT INTO clients VALUES (2, 'Martín Álvarez', 'Spain', 'RETAIL', DATE '2018-06-02', 3);
INSERT INTO clients VALUES (3, 'Beatriz Lopes', 'Portugal', 'RETAIL', DATE '2019-01-21', 2);
INSERT INTO clients VALUES (4, 'Diego Ramírez', 'Mexico', 'PREMIUM', DATE '2017-09-05', 4);
INSERT INTO clients VALUES (5, 'Carmen Vidal', 'Spain', 'PRIVATE', DATE '2015-11-30', 1);
INSERT INTO clients VALUES (6, 'João Pereira', 'Portugal', 'PREMIUM', DATE '2020-04-17', 3);
INSERT INTO clients VALUES (7, 'Valentina Rojas', 'Chile', 'RETAIL', DATE '2021-02-08', NULL);
INSERT INTO clients VALUES (8, 'Oliver Bennett', 'United Kingdom', 'PRIVATE', DATE '2019-07-23', 2);
INSERT INTO clients VALUES (9, 'Sofía Hernández', 'Mexico', 'YOUTH', DATE '2023-05-12', NULL);
INSERT INTO clients VALUES (10, 'Tomasz Nowak', 'Poland', 'RETAIL', DATE '2020-10-01', 4);
INSERT INTO clients VALUES (11, 'Ana Morales', 'Spain', 'YOUTH', DATE '2022-08-19', 5);
INSERT INTO clients VALUES (12, 'Rafael Gómez', 'Argentina', 'PREMIUM', DATE '2018-02-27', 3);
INSERT INTO clients VALUES (13, 'Inez Kowalska', 'Poland', 'RETAIL', DATE '2021-06-15', 2);
INSERT INTO clients VALUES (14, 'Mateus Costa', 'Brazil', 'RETAIL', DATE '2017-04-09', 5);
INSERT INTO clients VALUES (15, 'Paula Ortiz', 'Spain', 'RETAIL', DATE '2024-01-16', NULL);
INSERT INTO clients VALUES (16, 'Emily Clarke', 'United Kingdom', 'RETAIL', DATE '2022-03-03', 1);
INSERT INTO clients VALUES (17, 'Andrés Castillo', 'Chile', 'PRIVATE', DATE '2016-12-12', 3);
INSERT INTO clients VALUES (18, 'Gabriela Souza', 'Brazil', 'YOUTH', DATE '2023-09-28', 4);
INSERT INTO clients VALUES (19, 'Javier Méndez', 'Mexico', 'RETAIL', DATE '2019-05-06', 2);
INSERT INTO clients VALUES (20, 'Elena Navarro', 'Spain', 'PREMIUM', DATE '2024-06-21', NULL);
INSERT INTO clients VALUES (21, 'Rodrigo Silva', 'Portugal', 'YOUTH', DATE '2025-02-11', 1);
INSERT INTO clients VALUES (22, 'Luis Herrera', 'Mexico', 'RETAIL', DATE '2024-11-04', 3);
INSERT INTO accounts VALUES (1, 1, 1, 'CHECKING', DATE '2023-01-17', 3240.55, 3, 0.1);
INSERT INTO accounts VALUES (2, 1, 4, 'SAVINGS', DATE '2023-06-05', 18750, 2, 2.1);
INSERT INTO accounts VALUES (3, 2, 3, 'CHECKING', DATE '2023-02-09', 1520.3, 4.5, 0.05);
INSERT INTO accounts VALUES (4, 2, 3, 'SAVINGS', DATE '2024-03-22', 6400.75, 1.5, 1.85);
INSERT INTO accounts VALUES (5, 3, 5, 'PAYROLL', DATE '2023-03-14', 2875.4, 0, 0.35);
INSERT INTO accounts VALUES (6, 4, 7, 'CHECKING', DATE '2023-04-03', 4120.9, 6, NULL);
INSERT INTO accounts VALUES (7, 4, 7, 'SAVINGS', DATE '2024-07-18', 25300, 2, 2.45);
INSERT INTO accounts VALUES (8, 4, 2, 'CHECKING', DATE '2025-01-08', 9875.2, 4.5, 0.15);
INSERT INTO accounts VALUES (9, 5, 1, 'PAYROLL', DATE '2023-05-26', 7310.65, 1.5, 0.4);
INSERT INTO accounts VALUES (10, 5, 1, 'SAVINGS', DATE '2023-08-11', 41200, 3, 2.8);
INSERT INTO accounts VALUES (11, 6, 5, 'CHECKING', DATE '2023-07-02', 1985.15, 3, 0.2);
INSERT INTO accounts VALUES (12, 6, 5, 'SAVINGS', DATE '2024-02-14', 9120.4, 0, NULL);
INSERT INTO accounts VALUES (13, 7, 4, 'CHECKING', DATE '2023-09-19', 640.25, 1.5, 0.12);
INSERT INTO accounts VALUES (14, 8, 8, 'CHECKING', DATE '2023-10-06', 5530.8, 6, 0.25);
INSERT INTO accounts VALUES (15, 8, 1, 'SAVINGS', DATE '2024-01-29', 30875.5, 4.5, 3.05);
INSERT INTO accounts VALUES (16, 8, 5, 'BUSINESS', DATE '2024-09-03', 12640, 9, 1.35);
INSERT INTO accounts VALUES (17, 10, 9, 'PAYROLL', DATE '2023-11-27', 2210.7, 1.5, NULL);
INSERT INTO accounts VALUES (18, 10, 9, 'SAVINGS', DATE '2025-03-10', 4730.35, 0, NULL);
INSERT INTO accounts VALUES (19, 11, 3, 'CHECKING', DATE '2023-12-15', 815.6, 0, 0.08);
INSERT INTO accounts VALUES (20, 12, 7, 'BUSINESS', DATE '2023-04-28', 15980.45, 12, 1.1);
INSERT INTO accounts VALUES (21, 12, 3, 'SAVINGS', DATE '2024-05-07', 8460.1, 2, 2.25);
INSERT INTO accounts VALUES (22, 12, 9, 'CHECKING', DATE '2024-10-21', 3375.95, 4.5, NULL);
INSERT INTO accounts VALUES (23, 13, 9, 'SAVINGS', DATE '2023-08-30', 5210, 2, 1.95);
INSERT INTO accounts VALUES (24, 14, 8, 'CHECKING', DATE '2023-06-21', 1210.85, 3, 0.18);
INSERT INTO accounts VALUES (25, 14, 8, 'BUSINESS', DATE '2025-04-14', 7745.3, 9, NULL);
INSERT INTO accounts VALUES (26, 15, 1, 'PAYROLL', DATE '2024-02-02', 1890.25, 0, 0.45);
INSERT INTO accounts VALUES (27, 16, 3, 'SAVINGS', DATE '2023-03-31', 3980.6, 1.5, 1.6);
INSERT INTO accounts VALUES (28, 17, 2, 'CHECKING', DATE '2023-05-09', 2640.35, 6, 0.22);
INSERT INTO accounts VALUES (29, 17, 2, 'SAVINGS', DATE '2023-11-08', 22410.8, 3, 3.4);
INSERT INTO accounts VALUES (30, 18, 4, 'CHECKING', DATE '2024-04-25', 455.9, 0, 0.06);
INSERT INTO accounts VALUES (31, 19, 7, 'PAYROLL', DATE '2023-07-24', 3090.15, 1.5, 0.5);
INSERT INTO accounts VALUES (32, 19, 2, 'SAVINGS', DATE '2025-06-17', 2560.45, 2, 1.4);
INSERT INTO accounts VALUES (33, 21, 5, 'CHECKING', DATE '2025-03-03', 970.4, 1.5, 0.28);
INSERT INTO accounts VALUES (34, 3, 4, 'SAVINGS', DATE '2025-01-27', 1740, 2, 1.75);
INSERT INTO accounts VALUES (35, 1, 2, 'BUSINESS', DATE '2024-11-12', 6125.35, 9, 1.05);
INSERT INTO accounts VALUES (36, 16, 8, 'CHECKING', DATE '2025-08-04', 1365.2, 3, 0.14);
INSERT INTO transactions VALUES (1, 1, DATE '2024-01-08', 'DEPOSIT', 1250);
INSERT INTO transactions VALUES (2, 10, DATE '2024-01-19', 'DEPOSIT', 4800);
INSERT INTO transactions VALUES (3, 3, DATE '2024-01-31', 'WITHDRAWAL', 300);
INSERT INTO transactions VALUES (4, 20, DATE '2024-02-12', 'TRANSFER', 3420.5);
INSERT INTO transactions VALUES (5, 6, DATE '2024-02-23', 'DEPOSIT', 980.75);
INSERT INTO transactions VALUES (6, 26, DATE '2024-03-05', 'DEPOSIT', 1640);
INSERT INTO transactions VALUES (7, 13, DATE '2024-03-18', 'WITHDRAWAL', 120);
INSERT INTO transactions VALUES (8, 15, DATE '2024-03-29', 'DEPOSIT', 6000);
INSERT INTO transactions VALUES (9, 9, DATE '2024-04-09', 'DEPOSIT', 2150.3);
INSERT INTO transactions VALUES (10, 1, DATE '2024-04-22', 'FEE', 3);
INSERT INTO transactions VALUES (11, 29, DATE '2024-05-03', 'DEPOSIT', 2500);
INSERT INTO transactions VALUES (12, 30, DATE '2024-05-16', 'DEPOSIT', 350);
INSERT INTO transactions VALUES (13, 5, DATE '2024-05-28', 'WITHDRAWAL', 420.6);
INSERT INTO transactions VALUES (14, 21, DATE '2024-06-10', 'DEPOSIT', 1000);
INSERT INTO transactions VALUES (15, 14, DATE '2024-06-21', 'TRANSFER', 760.4);
INSERT INTO transactions VALUES (16, 11, DATE '2024-07-03', 'WITHDRAWAL', 210);
INSERT INTO transactions VALUES (17, 23, DATE '2024-07-15', 'DEPOSIT', 1320);
INSERT INTO transactions VALUES (18, 7, DATE '2024-07-29', 'DEPOSIT', 8500);
INSERT INTO transactions VALUES (19, 6, DATE '2024-08-08', 'WITHDRAWAL', 640);
INSERT INTO transactions VALUES (20, 17, DATE '2024-08-20', 'DEPOSIT', 1985);
INSERT INTO transactions VALUES (21, 2, DATE '2024-09-02', 'TRANSFER', 2750);
INSERT INTO transactions VALUES (22, 24, DATE '2024-09-13', 'FEE', 15);
INSERT INTO transactions VALUES (23, 16, DATE '2024-09-25', 'DEPOSIT', 4250);
INSERT INTO transactions VALUES (24, 19, DATE '2024-10-04', 'DEPOSIT', 180);
INSERT INTO transactions VALUES (25, 10, DATE '2024-10-17', 'WITHDRAWAL', 1500);
INSERT INTO transactions VALUES (26, 13, DATE '2024-10-28', 'FEE', 1.5);
INSERT INTO transactions VALUES (27, 26, DATE '2024-11-08', 'WITHDRAWAL', 95.2);
INSERT INTO transactions VALUES (28, 22, DATE '2024-11-19', 'DEPOSIT', 820);
INSERT INTO transactions VALUES (29, 28, DATE '2024-11-29', 'TRANSFER', 1150);
INSERT INTO transactions VALUES (30, 20, DATE '2024-12-06', 'FEE', 12);
INSERT INTO transactions VALUES (31, 35, DATE '2024-12-13', 'DEPOSIT', 3000);
INSERT INTO transactions VALUES (32, 31, DATE '2024-12-20', 'WITHDRAWAL', 250);
INSERT INTO transactions VALUES (33, 20, DATE '2025-01-10', 'TRANSFER', 5200);
INSERT INTO transactions VALUES (34, 8, DATE '2025-01-21', 'DEPOSIT', 2300);
INSERT INTO transactions VALUES (35, 3, DATE '2025-02-03', 'WITHDRAWAL', 450);
INSERT INTO transactions VALUES (36, 34, DATE '2025-02-14', 'DEPOSIT', 1700);
INSERT INTO transactions VALUES (37, 5, DATE '2025-02-25', 'DEPOSIT', 1875.4);
INSERT INTO transactions VALUES (38, 14, DATE '2025-03-07', 'WITHDRAWAL', 380);
INSERT INTO transactions VALUES (39, 33, DATE '2025-03-18', 'DEPOSIT', 600);
INSERT INTO transactions VALUES (40, 16, DATE '2025-03-27', 'TRANSFER', 2890);
INSERT INTO transactions VALUES (41, 28, DATE '2025-04-08', 'FEE', 6);
INSERT INTO transactions VALUES (42, 1, DATE '2025-04-19', 'TRANSFER', 540);
INSERT INTO transactions VALUES (43, 10, DATE '2025-04-30', 'DEPOSIT', 7500);
INSERT INTO transactions VALUES (44, 22, DATE '2025-05-12', 'WITHDRAWAL', 310);
INSERT INTO transactions VALUES (45, 6, DATE '2025-05-23', 'FEE', 18);
INSERT INTO transactions VALUES (46, 29, DATE '2025-06-04', 'TRANSFER', 1960);
INSERT INTO transactions VALUES (47, 12, DATE '2025-06-16', 'DEPOSIT', 2200);
INSERT INTO transactions VALUES (48, 8, DATE '2025-06-27', 'WITHDRAWAL', 1200);
INSERT INTO transactions VALUES (49, 23, DATE '2025-07-08', 'WITHDRAWAL', 530);
INSERT INTO transactions VALUES (50, 3, DATE '2025-07-18', 'FEE', 4.5);
INSERT INTO transactions VALUES (51, 17, DATE '2025-07-29', 'TRANSFER', 690);
INSERT INTO transactions VALUES (52, 15, DATE '2025-08-08', 'TRANSFER', 3750);
INSERT INTO transactions VALUES (53, 30, DATE '2025-08-19', 'WITHDRAWAL', 140);
INSERT INTO transactions VALUES (54, 4, DATE '2025-08-29', 'DEPOSIT', 850);
INSERT INTO transactions VALUES (55, 20, DATE '2025-09-09', 'DEPOSIT', 6350);
INSERT INTO transactions VALUES (56, 11, DATE '2025-09-19', 'FEE', 7.5);
INSERT INTO transactions VALUES (57, 24, DATE '2025-09-30', 'TRANSFER', 415);
INSERT INTO transactions VALUES (58, 7, DATE '2025-10-10', 'WITHDRAWAL', 2100);
INSERT INTO transactions VALUES (59, 27, DATE '2025-10-21', 'DEPOSIT', 2630);
INSERT INTO transactions VALUES (60, 31, DATE '2025-10-31', 'DEPOSIT', 1525.5);
INSERT INTO transactions VALUES (61, 2, DATE '2025-11-07', 'DEPOSIT', 3300);
INSERT INTO transactions VALUES (62, 14, DATE '2025-11-14', 'DEPOSIT', 1100);
INSERT INTO transactions VALUES (63, 9, DATE '2025-11-21', 'WITHDRAWAL', 875);
INSERT INTO transactions VALUES (64, 16, DATE '2025-11-28', 'WITHDRAWAL', 1650);
INSERT INTO transactions VALUES (65, 33, DATE '2025-12-03', 'DEPOSIT', 160);
INSERT INTO transactions VALUES (66, 35, DATE '2025-12-09', 'TRANSFER', 2475);
INSERT INTO transactions VALUES (67, 28, DATE '2025-12-12', 'DEPOSIT', 1280);
INSERT INTO transactions VALUES (68, 19, DATE '2025-12-16', 'DEPOSIT', 225);
INSERT INTO transactions VALUES (69, 5, DATE '2025-12-19', 'WITHDRAWAL', 510);`,
  schema: {
    branches: ['branch_id', 'name', 'city', 'country', 'staff'],
    clients: ['client_id', 'name', 'country', 'segment', 'since', 'risk_score'],
    accounts: ['account_id', 'client_id', 'branch_id', 'acc_type', 'opened', 'balance', 'monthly_fee', 'interest_rate'],
    transactions: ['txn_id', 'account_id', 'txn_date', 'kind', 'amount'],
  },
  types: {
    branches: ['NUMBER(3)', 'VARCHAR2(30)', 'VARCHAR2(30)', 'VARCHAR2(30)', 'NUMBER(3)'],
    clients: ['NUMBER(4)', 'VARCHAR2(40)', 'VARCHAR2(30)', 'VARCHAR2(10)', 'DATE', 'NUMBER(1)'],
    accounts: ['NUMBER(5)', 'NUMBER(4)', 'NUMBER(3)', 'VARCHAR2(10)', 'DATE', 'NUMBER(10,2)', 'NUMBER(5,2)', 'NUMBER(4,2)'],
    transactions: ['NUMBER(6)', 'NUMBER(5)', 'DATE', 'VARCHAR2(10)', 'NUMBER(10,2)'],
  },
  join: 'SELECT <columns>\nFROM accounts a\nJOIN clients c ON c.client_id = a.client_id;',
};
if (typeof module !== 'undefined') module.exports = GAME_COMP_DBS.bank;
