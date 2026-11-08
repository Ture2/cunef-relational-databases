'use strict';
/* Query for a Million, competitive side: the law-firm database (docs/game-quiz.md §16), one of the databases an
   attempt can draw. Same entry shape as data/game-comp-db-shop.js: { key, name, setup, schema, types, join }.
   A fictional law firm: 21 lawyers, 22 clients, 30 cases opened in 2024–2025 and 66 time entries. Every firm,
   case and person is invented (the countries are real).
   The data is built for the questions:
   - lawyers 16, 17, 20 and 21 never logged hours; clients 18, 21 and 22 have no case; case 30 has no time entry;
   - review_score is NULL for the lawyers not reviewed yet (17–21); closed is NULL for the 10 cases still open
     (4, 9, 13, 16, 19, 23, 26, 27, 29, 30);
   - amount = hours × the lawyer's hourly_rate for a billable entry ('Y'), 0 for a non-billable one ('N'); two
     entries were written down (17: 90 %, 51: 80 %);
   - every time entry falls inside its case's life (opened ≤ work_date ≤ closed) and after the lawyer's hire_date;
   - no ties on any column a question sorts or cuts by: hourly_rate, review_score, fee, opened, work_date, hire_date,
     client_since and every non-zero amount are all different;
   - roles (CHECK): Partner 1–4 and 6, Counsel 5 and 7–9, Associate 10–17, Trainee 18–21; tier (CHECK) 1–4;
     billable (CHECK) 'Y' or 'N'; cases.title is UNIQUE.
   New rows in DML questions: lawyers and clients from 101, cases from 101, time entries from 1001.
   The hidden dataset the server also grades with is derived from `setup` by tools/comp-hidden/law.mjs. */
// eslint-disable-next-line no-var, no-use-before-define
var GAME_COMP_DBS = typeof GAME_COMP_DBS !== 'undefined' ? GAME_COMP_DBS : {};
GAME_COMP_DBS.law = {
  key: 'law',
  name: { en: 'Law firm', es: 'Bufete de abogados' },
  setup: `CREATE TABLE lawyers (
  lawyer_id     NUMBER(3)    PRIMARY KEY,
  name          VARCHAR2(40) NOT NULL,
  practice_area VARCHAR2(20) NOT NULL,
  role          VARCHAR2(10) NOT NULL CHECK (role IN ('Partner', 'Counsel', 'Associate', 'Trainee')),
  hire_date     DATE         NOT NULL,
  hourly_rate   NUMBER(6,2)  NOT NULL,
  review_score  NUMBER(3,1)
);
CREATE TABLE clients (
  client_id     NUMBER(4)    PRIMARY KEY,
  name          VARCHAR2(50) NOT NULL,
  sector        VARCHAR2(20) NOT NULL,
  country       VARCHAR2(30) NOT NULL,
  client_since  DATE         NOT NULL,
  tier          NUMBER(1)    NOT NULL CHECK (tier BETWEEN 1 AND 4)
);
CREATE TABLE cases (
  case_id         NUMBER(4)    PRIMARY KEY,
  client_id       NUMBER(4)    NOT NULL REFERENCES clients (client_id),
  lead_lawyer_id  NUMBER(3)    NOT NULL REFERENCES lawyers (lawyer_id),
  title           VARCHAR2(60) NOT NULL UNIQUE,
  area            VARCHAR2(20) NOT NULL,
  opened          DATE         NOT NULL,
  closed          DATE,
  fee             NUMBER(9,2)  NOT NULL
);
CREATE TABLE time_entries (
  entry_id   NUMBER(5)   PRIMARY KEY,
  lawyer_id  NUMBER(3)   NOT NULL REFERENCES lawyers (lawyer_id),
  case_id    NUMBER(4)   NOT NULL REFERENCES cases (case_id),
  work_date  DATE        NOT NULL,
  hours      NUMBER(3,1) NOT NULL,
  billable   CHAR(1)     NOT NULL CHECK (billable IN ('Y', 'N')),
  amount     NUMBER(8,2) NOT NULL
);
INSERT INTO lawyers VALUES (1, 'Carmen Olivares', 'Corporate', 'Partner', DATE '2009-03-02', 395.00, 9.1);
INSERT INTO lawyers VALUES (2, 'Javier Montalbán', 'Tax', 'Partner', DATE '2011-09-12', 360.00, 8.7);
INSERT INTO lawyers VALUES (3, 'Lucía Ibáñez', 'Litigation', 'Partner', DATE '2012-01-16', 410.00, 8.9);
INSERT INTO lawyers VALUES (4, 'Henrik Aalto', 'IP', 'Partner', DATE '2014-05-05', 340.00, 8.4);
INSERT INTO lawyers VALUES (5, 'Beatriz Olmo', 'Labour', 'Counsel', DATE '2015-10-19', 265.00, 8);
INSERT INTO lawyers VALUES (6, 'Marco Ferrante', 'Real Estate', 'Partner', DATE '2013-02-25', 330.00, 7.6);
INSERT INTO lawyers VALUES (7, 'Inés Valcárcel', 'Corporate', 'Counsel', DATE '2016-06-13', 285.00, 8.2);
INSERT INTO lawyers VALUES (8, 'Álvaro Méndez', 'Litigation', 'Counsel', DATE '2017-04-03', 250.00, 7.3);
INSERT INTO lawyers VALUES (9, 'Sophie Laurent', 'Tax', 'Counsel', DATE '2018-01-08', 240.00, 8.6);
INSERT INTO lawyers VALUES (10, 'Tomás Rivero', 'Corporate', 'Associate', DATE '2019-09-02', 195.00, 7.8);
INSERT INTO lawyers VALUES (11, 'Lorenzo Bassi', 'IP', 'Associate', DATE '2020-02-17', 180.00, 7.1);
INSERT INTO lawyers VALUES (12, 'Nerea Gaztelu', 'Labour', 'Associate', DATE '2020-10-05', 165.00, 7.9);
INSERT INTO lawyers VALUES (13, 'Rocío Benítez', 'Litigation', 'Associate', DATE '2021-03-22', 175.00, 6.8);
INSERT INTO lawyers VALUES (14, 'Daniel Kovač', 'Tax', 'Associate', DATE '2021-11-15', 155.00, 7.5);
INSERT INTO lawyers VALUES (15, 'Clara Weiss', 'Real Estate', 'Associate', DATE '2022-05-09', 150.00, 7);
INSERT INTO lawyers VALUES (16, 'Pablo Arenas', 'Corporate', 'Associate', DATE '2023-01-23', 145.00, 7.4);
INSERT INTO lawyers VALUES (17, 'Marta Quintana', 'Litigation', 'Associate', DATE '2023-09-04', 140.00, NULL);
INSERT INTO lawyers VALUES (18, 'Zoe Hartmann', 'Tax', 'Trainee', DATE '2024-09-02', 95.00, NULL);
INSERT INTO lawyers VALUES (19, 'Iker Sagasta', 'Corporate', 'Trainee', DATE '2024-09-16', 90.00, NULL);
INSERT INTO lawyers VALUES (20, 'Laura Peñalver', 'Labour', 'Trainee', DATE '2025-02-03', 85.00, NULL);
INSERT INTO lawyers VALUES (21, 'Gonzalo Ruiz-Tapia', 'IP', 'Trainee', DATE '2025-09-01', 80.00, NULL);
INSERT INTO clients VALUES (1, 'Altamar Shipping', 'Logistics', 'Spain', DATE '2015-04-20', 3);
INSERT INTO clients VALUES (2, 'Riberalta Capital', 'Banking', 'Spain', DATE '2012-11-05', 4);
INSERT INTO clients VALUES (3, 'Solenne Énergies', 'Energy', 'France', DATE '2017-02-14', 3);
INSERT INTO clients VALUES (4, 'Mercado Lusitano', 'Retail', 'Portugal', DATE '2019-06-03', 1);
INSERT INTO clients VALUES (5, 'Nordwind Technik', 'Technology', 'Germany', DATE '2016-09-26', 2);
INSERT INTO clients VALUES (6, 'Clínica Alborada', 'Health', 'Spain', DATE '2018-03-12', 2);
INSERT INTO clients VALUES (7, 'Andrés Pineda', 'Private', 'Mexico', DATE '2021-01-18', 1);
INSERT INTO clients VALUES (8, 'Ferrovie Azzurre', 'Logistics', 'Italy', DATE '2014-07-07', 2);
INSERT INTO clients VALUES (9, 'Lumen Datacloud', 'Technology', 'Ireland', DATE '2020-05-25', 3);
INSERT INTO clients VALUES (10, 'Cordillera Solar', 'Energy', 'Chile', DATE '2019-10-14', 2);
INSERT INTO clients VALUES (11, 'Casa Rinaldi', 'Retail', 'Italy', DATE '2022-02-07', 1);
INSERT INTO clients VALUES (12, 'Teresa Albuquerque', 'Private', 'Portugal', DATE '2023-04-03', 1);
INSERT INTO clients VALUES (13, 'Bergmann Pharma', 'Health', 'Germany', DATE '2013-08-19', 4);
INSERT INTO clients VALUES (14, 'Grupo Tolteca', 'Retail', 'Mexico', DATE '2020-11-30', 3);
INSERT INTO clients VALUES (15, 'Maré Capital', 'Banking', 'Portugal', DATE '2021-06-21', 2);
INSERT INTO clients VALUES (16, 'Robotique Ardent', 'Technology', 'France', DATE '2022-09-12', 2);
INSERT INTO clients VALUES (17, 'Viñedos Laguna Alta', 'Retail', 'Chile', DATE '2023-01-09', 1);
INSERT INTO clients VALUES (18, 'Ignacio Barrenetxea', 'Private', 'Spain', DATE '2024-02-05', 1);
INSERT INTO clients VALUES (19, 'Eolica Tramontana', 'Energy', 'Italy', DATE '2024-06-17', 3);
INSERT INTO clients VALUES (20, 'Medisur Andina', 'Health', 'Chile', DATE '2024-10-01', 2);
INSERT INTO clients VALUES (21, 'Sinéad Gallagher', 'Private', 'Ireland', DATE '2025-03-10', 1);
INSERT INTO clients VALUES (22, 'Torvald Logistik', 'Logistics', 'Germany', DATE '2025-05-19', 2);
INSERT INTO cases VALUES (1, 1, 3, 'Altamar cargo claim', 'Litigation', DATE '2024-01-15', DATE '2024-11-28', 48000.00);
INSERT INTO cases VALUES (2, 2, 1, 'Riberalta bond issue', 'Corporate', DATE '2024-01-29', DATE '2024-06-14', 65000.00);
INSERT INTO cases VALUES (3, 3, 2, 'Solenne tax audit', 'Tax', DATE '2024-02-12', DATE '2025-03-31', 38500.00);
INSERT INTO cases VALUES (4, 5, 4, 'Nordwind patent dispute', 'IP', DATE '2024-02-26', NULL, 72000.00);
INSERT INTO cases VALUES (5, 6, 5, 'Alborada staff restructuring', 'Labour', DATE '2024-03-11', DATE '2024-09-20', 21000.00);
INSERT INTO cases VALUES (6, 8, 6, 'Azzurre depot lease', 'Real Estate', DATE '2024-03-25', DATE '2024-08-02', 16500.00);
INSERT INTO cases VALUES (7, 13, 1, 'Bergmann merger', 'Corporate', DATE '2024-04-08', DATE '2025-02-21', 118000.00);
INSERT INTO cases VALUES (8, 4, 8, 'Mercado Lusitano supplier suit', 'Litigation', DATE '2024-04-22', DATE '2025-01-17', 27500.00);
INSERT INTO cases VALUES (9, 9, 9, 'Lumen transfer pricing', 'Tax', DATE '2024-05-06', NULL, 44000.00);
INSERT INTO cases VALUES (10, 2, 7, 'Riberalta board advisory', 'Corporate', DATE '2024-05-20', DATE '2024-12-13', 20000.00);
INSERT INTO cases VALUES (11, 7, 13, 'Pineda inheritance claim', 'Litigation', DATE '2024-06-03', DATE '2025-05-30', 9500.00);
INSERT INTO cases VALUES (12, 10, 2, 'Cordillera VAT refund', 'Tax', DATE '2024-06-17', DATE '2025-04-11', 31000.00);
INSERT INTO cases VALUES (13, 14, 12, 'Tolteca collective agreement', 'Labour', DATE '2024-07-01', NULL, 18500.00);
INSERT INTO cases VALUES (14, 1, 6, 'Altamar warehouse purchase', 'Real Estate', DATE '2024-07-15', DATE '2025-01-31', 26000.00);
INSERT INTO cases VALUES (15, 5, 11, 'Nordwind trademark filing', 'IP', DATE '2024-07-29', DATE '2024-12-20', 7800.00);
INSERT INTO cases VALUES (16, 3, 3, 'Solenne grid arbitration', 'Litigation', DATE '2024-08-12', NULL, 96000.00);
INSERT INTO cases VALUES (17, 13, 9, 'Bergmann tax ruling', 'Tax', DATE '2024-08-26', DATE '2025-06-27', 24500.00);
INSERT INTO cases VALUES (18, 11, 15, 'Rinaldi shop leases', 'Real Estate', DATE '2024-09-09', DATE '2025-03-14', 12500.00);
INSERT INTO cases VALUES (19, 8, 3, 'Azzurre rail accident claims', 'Litigation', DATE '2024-09-23', NULL, 54000.00);
INSERT INTO cases VALUES (20, 6, 10, 'Alborada clinic acquisition', 'Corporate', DATE '2024-10-07', DATE '2025-07-25', 39000.00);
INSERT INTO cases VALUES (21, 12, 14, 'Albuquerque estate tax', 'Tax', DATE '2024-10-21', DATE '2025-02-07', 6200.00);
INSERT INTO cases VALUES (22, 9, 4, 'Lumen software licensing', 'IP', DATE '2024-11-04', DATE '2025-09-19', 33500.00);
INSERT INTO cases VALUES (23, 15, 7, 'Maré fund launch', 'Corporate', DATE '2024-11-18', NULL, 58000.00);
INSERT INTO cases VALUES (24, 16, 11, 'Ardent design rights', 'IP', DATE '2025-01-13', DATE '2025-10-24', 15000.00);
INSERT INTO cases VALUES (25, 17, 12, 'Laguna Alta seasonal staff', 'Labour', DATE '2025-02-10', DATE '2025-08-29', 8800.00);
INSERT INTO cases VALUES (26, 19, 1, 'Tramontana wind farm finance', 'Corporate', DATE '2025-03-10', NULL, 87000.00);
INSERT INTO cases VALUES (27, 14, 8, 'Tolteca franchise dispute', 'Litigation', DATE '2025-04-07', NULL, 41000.00);
INSERT INTO cases VALUES (28, 4, 9, 'Mercado Lusitano customs', 'Tax', DATE '2025-05-05', DATE '2025-11-14', 13500.00);
INSERT INTO cases VALUES (29, 20, 5, 'Medisur dismissal appeal', 'Labour', DATE '2025-06-09', NULL, 11200.00);
INSERT INTO cases VALUES (30, 10, 6, 'Cordillera land rights', 'Real Estate', DATE '2025-08-11', NULL, 29500.00);
INSERT INTO time_entries VALUES (1, 3, 1, DATE '2024-01-22', 5.5, 'Y', 2255.00);
INSERT INTO time_entries VALUES (2, 1, 2, DATE '2024-02-05', 6.0, 'Y', 2370.00);
INSERT INTO time_entries VALUES (3, 2, 3, DATE '2024-02-19', 3.5, 'Y', 1260.00);
INSERT INTO time_entries VALUES (4, 1, 2, DATE '2024-03-04', 4.0, 'Y', 1580.00);
INSERT INTO time_entries VALUES (5, 4, 4, DATE '2024-03-13', 2.5, 'Y', 850.00);
INSERT INTO time_entries VALUES (6, 5, 5, DATE '2024-03-20', 3.0, 'Y', 795.00);
INSERT INTO time_entries VALUES (7, 6, 6, DATE '2024-04-03', 4.5, 'Y', 1485.00);
INSERT INTO time_entries VALUES (8, 3, 1, DATE '2024-04-16', 2.0, 'N', 0.00);
INSERT INTO time_entries VALUES (9, 1, 7, DATE '2024-04-24', 7.5, 'Y', 2962.50);
INSERT INTO time_entries VALUES (10, 15, 6, DATE '2024-05-08', 3.5, 'Y', 525.00);
INSERT INTO time_entries VALUES (11, 5, 5, DATE '2024-05-21', 5.0, 'Y', 1325.00);
INSERT INTO time_entries VALUES (12, 10, 3, DATE '2024-05-29', 2.0, 'Y', 390.00);
INSERT INTO time_entries VALUES (13, 9, 9, DATE '2024-06-05', 4.0, 'Y', 960.00);
INSERT INTO time_entries VALUES (14, 7, 10, DATE '2024-06-12', 3.0, 'Y', 855.00);
INSERT INTO time_entries VALUES (15, 1, 10, DATE '2024-06-26', 1.5, 'Y', 592.50);
INSERT INTO time_entries VALUES (16, 13, 11, DATE '2024-07-03', 4.5, 'Y', 787.50);
INSERT INTO time_entries VALUES (17, 2, 12, DATE '2024-07-10', 6.5, 'Y', 2106.00);
INSERT INTO time_entries VALUES (18, 10, 10, DATE '2024-07-24', 2.5, 'Y', 487.50);
INSERT INTO time_entries VALUES (19, 5, 13, DATE '2024-08-07', 1.0, 'N', 0.00);
INSERT INTO time_entries VALUES (20, 6, 14, DATE '2024-08-20', 5.5, 'Y', 1815.00);
INSERT INTO time_entries VALUES (21, 11, 15, DATE '2024-08-28', 3.0, 'Y', 540.00);
INSERT INTO time_entries VALUES (22, 3, 16, DATE '2024-09-04', 8.0, 'Y', 3280.00);
INSERT INTO time_entries VALUES (23, 15, 18, DATE '2024-09-18', 2.5, 'Y', 375.00);
INSERT INTO time_entries VALUES (24, 18, 9, DATE '2024-09-25', 5.5, 'Y', 522.50);
INSERT INTO time_entries VALUES (25, 7, 10, DATE '2024-10-02', 4.0, 'Y', 1140.00);
INSERT INTO time_entries VALUES (26, 19, 14, DATE '2024-10-09', 3.5, 'Y', 315.00);
INSERT INTO time_entries VALUES (27, 3, 19, DATE '2024-10-16', 1.5, 'Y', 615.00);
INSERT INTO time_entries VALUES (28, 4, 4, DATE '2024-10-23', 7.0, 'Y', 2380.00);
INSERT INTO time_entries VALUES (29, 10, 14, DATE '2024-10-30', 2.0, 'N', 0.00);
INSERT INTO time_entries VALUES (30, 15, 18, DATE '2024-11-06', 4.5, 'Y', 675.00);
INSERT INTO time_entries VALUES (31, 18, 16, DATE '2024-11-13', 5.0, 'Y', 475.00);
INSERT INTO time_entries VALUES (32, 7, 16, DATE '2024-11-20', 1.0, 'N', 0.00);
INSERT INTO time_entries VALUES (33, 9, 17, DATE '2024-11-27', 3.0, 'Y', 720.00);
INSERT INTO time_entries VALUES (34, 19, 13, DATE '2024-12-04', 3.0, 'Y', 270.00);
INSERT INTO time_entries VALUES (35, 13, 11, DATE '2024-12-11', 6.0, 'Y', 1050.00);
INSERT INTO time_entries VALUES (36, 10, 20, DATE '2024-12-18', 3.5, 'Y', 682.50);
INSERT INTO time_entries VALUES (37, 8, 8, DATE '2025-01-09', 2.0, 'Y', 500.00);
INSERT INTO time_entries VALUES (38, 1, 7, DATE '2025-01-16', 3.0, 'Y', 1185.00);
INSERT INTO time_entries VALUES (39, 14, 21, DATE '2025-01-23', 5.0, 'Y', 775.00);
INSERT INTO time_entries VALUES (40, 18, 22, DATE '2025-01-30', 4.0, 'Y', 380.00);
INSERT INTO time_entries VALUES (41, 2, 3, DATE '2025-02-06', 1.0, 'Y', 360.00);
INSERT INTO time_entries VALUES (42, 8, 11, DATE '2025-02-13', 3.5, 'Y', 875.00);
INSERT INTO time_entries VALUES (43, 12, 13, DATE '2025-02-20', 2.0, 'Y', 330.00);
INSERT INTO time_entries VALUES (44, 19, 18, DATE '2025-02-27', 4.5, 'Y', 405.00);
INSERT INTO time_entries VALUES (45, 18, 9, DATE '2025-03-08', 1.0, 'Y', 95.00);
INSERT INTO time_entries VALUES (46, 14, 12, DATE '2025-03-19', 2.5, 'Y', 387.50);
INSERT INTO time_entries VALUES (47, 2, 12, DATE '2025-03-27', 4.0, 'Y', 1440.00);
INSERT INTO time_entries VALUES (48, 1, 26, DATE '2025-04-09', 6.5, 'Y', 2567.50);
INSERT INTO time_entries VALUES (49, 11, 24, DATE '2025-04-28', 3.5, 'Y', 630.00);
INSERT INTO time_entries VALUES (50, 12, 25, DATE '2025-05-20', 5.5, 'Y', 907.50);
INSERT INTO time_entries VALUES (51, 8, 27, DATE '2025-05-27', 7.0, 'Y', 1400.00);
INSERT INTO time_entries VALUES (52, 19, 17, DATE '2025-05-30', 2.0, 'Y', 180.00);
INSERT INTO time_entries VALUES (53, 5, 29, DATE '2025-06-18', 2.5, 'Y', 662.50);
INSERT INTO time_entries VALUES (54, 4, 22, DATE '2025-06-25', 3.5, 'Y', 1190.00);
INSERT INTO time_entries VALUES (55, 14, 9, DATE '2025-07-02', 3.0, 'Y', 465.00);
INSERT INTO time_entries VALUES (56, 10, 20, DATE '2025-07-09', 5.0, 'Y', 975.00);
INSERT INTO time_entries VALUES (57, 7, 23, DATE '2025-07-23', 2.0, 'Y', 570.00);
INSERT INTO time_entries VALUES (58, 12, 29, DATE '2025-08-06', 4.0, 'Y', 660.00);
INSERT INTO time_entries VALUES (59, 9, 28, DATE '2025-08-20', 5.5, 'Y', 1320.00);
INSERT INTO time_entries VALUES (60, 11, 4, DATE '2025-09-03', 1.5, 'N', 0.00);
INSERT INTO time_entries VALUES (61, 3, 19, DATE '2025-09-17', 9.0, 'Y', 3690.00);
INSERT INTO time_entries VALUES (62, 8, 27, DATE '2025-10-01', 2.5, 'Y', 625.00);
INSERT INTO time_entries VALUES (63, 1, 26, DATE '2025-10-15', 5.0, 'Y', 1975.00);
INSERT INTO time_entries VALUES (64, 9, 9, DATE '2025-11-05', 3.5, 'Y', 840.00);
INSERT INTO time_entries VALUES (65, 7, 23, DATE '2025-11-19', 1.5, 'Y', 427.50);
INSERT INTO time_entries VALUES (66, 13, 19, DATE '2025-12-03', 2.0, 'Y', 350.00)`,
  schema: {
    lawyers: ['lawyer_id', 'name', 'practice_area', 'role', 'hire_date', 'hourly_rate', 'review_score'],
    clients: ['client_id', 'name', 'sector', 'country', 'client_since', 'tier'],
    cases: ['case_id', 'client_id', 'lead_lawyer_id', 'title', 'area', 'opened', 'closed', 'fee'],
    time_entries: ['entry_id', 'lawyer_id', 'case_id', 'work_date', 'hours', 'billable', 'amount'],
  },
  types: {
    lawyers: ['NUMBER(3)', 'VARCHAR2(40)', 'VARCHAR2(20)', 'VARCHAR2(10)', 'DATE', 'NUMBER(6,2)', 'NUMBER(3,1)'],
    clients: ['NUMBER(4)', 'VARCHAR2(50)', 'VARCHAR2(20)', 'VARCHAR2(30)', 'DATE', 'NUMBER(1)'],
    cases: ['NUMBER(4)', 'NUMBER(4)', 'NUMBER(3)', 'VARCHAR2(60)', 'VARCHAR2(20)', 'DATE', 'DATE', 'NUMBER(9,2)'],
    time_entries: ['NUMBER(5)', 'NUMBER(3)', 'NUMBER(4)', 'DATE', 'NUMBER(3,1)', 'CHAR(1)', 'NUMBER(8,2)'],
  },
  join: 'SELECT <columns>\nFROM time_entries t\nJOIN lawyers l ON l.lawyer_id = t.lawyer_id;',
};
if (typeof module !== 'undefined') module.exports = GAME_COMP_DBS.law;
