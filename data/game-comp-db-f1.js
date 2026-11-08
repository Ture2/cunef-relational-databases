'use strict';
/* Query for a Million, competitive side: the Formula 1 team database (docs/game-quiz.md §16). Every driver, team
   and person is invented; the places (countries, cities, circuits) are real.
   An invented team over the 2024 and 2025 seasons: 20 drivers (race, reserve and junior), 28 races, 48 results.
   The data is built for the questions:
     - drivers 1–5 raced (1 every race but one, 2 in 2024, 3 in 2025, reserve 4 three times as a stand-in, junior 5
       twice); drivers 6–20 never raced;
     - races 7 (cancelled), 26, 27 and 28 (not run yet) have no results; track_temp is NULL for those four and for
       race 22 (not recorded);
     - results: position NULL = did not finish (7 rows, 0 points); grid NULL = started from the pit lane (2 rows);
       points follow the position (25-18-15-12-10-8-6-4-2-1); a finisher from P11 down is one lap down;
     - no ties on any column a question sorts or cuts by (race_date, length_km, track_temp, joined_on, names).
   New rows in the questions: drivers and races from 101, results from 1001.
   The hidden dataset the server also grades with is derived from `setup` by tools/comp-hidden/f1.mjs. */
// eslint-disable-next-line no-var, no-use-before-define
var GAME_COMP_DBS = typeof GAME_COMP_DBS !== 'undefined' ? GAME_COMP_DBS : {};
GAME_COMP_DBS.f1 = {
  key: 'f1',
  name: { en: 'Formula 1 team', es: 'Escudería de Fórmula 1' },
  setup: `CREATE TABLE drivers (
  driver_id       NUMBER(3)    PRIMARY KEY,
  name            VARCHAR2(40) NOT NULL,
  country         VARCHAR2(30) NOT NULL,
  role            VARCHAR2(8)  NOT NULL CHECK (role IN ('Race', 'Reserve', 'Junior')),
  joined_on       DATE         NOT NULL,
  penalty_points  NUMBER(2)    NOT NULL CHECK (penalty_points BETWEEN 0 AND 12)
);
CREATE TABLE races (
  race_id     NUMBER(3)    PRIMARY KEY,
  grand_prix  VARCHAR2(40) NOT NULL UNIQUE,
  region      VARCHAR2(15) NOT NULL,
  race_date   DATE         NOT NULL,
  total_laps  NUMBER(3)    NOT NULL CHECK (total_laps > 0),
  length_km   NUMBER(5,3)  NOT NULL,
  track_temp  NUMBER(3,1)
);
CREATE TABLE results (
  result_id  NUMBER(4)   PRIMARY KEY,
  driver_id  NUMBER(3)   NOT NULL REFERENCES drivers (driver_id),
  race_id    NUMBER(3)   NOT NULL REFERENCES races (race_id),
  grid       NUMBER(2)   CHECK (grid BETWEEN 1 AND 20),
  position   NUMBER(2)   CHECK (position BETWEEN 1 AND 20),
  laps       NUMBER(3)   NOT NULL,
  pit_stops  NUMBER(1)   NOT NULL,
  points     NUMBER(4,1) NOT NULL,
  UNIQUE (driver_id, race_id)
);
INSERT INTO drivers VALUES (1, 'Tomás Arregui', 'Spain', 'Race', DATE '2022-11-14', 4);
INSERT INTO drivers VALUES (2, 'Henrik Lindqvist', 'Sweden', 'Reserve', DATE '2022-12-05', 7);
INSERT INTO drivers VALUES (3, 'Rafael Monteiro', 'Brazil', 'Race', DATE '2024-10-21', 2);
INSERT INTO drivers VALUES (4, 'Kenta Mizuno', 'Japan', 'Reserve', DATE '2023-03-13', 0);
INSERT INTO drivers VALUES (5, 'Elio Santangelo', 'Italy', 'Junior', DATE '2023-09-04', 3);
INSERT INTO drivers VALUES (6, 'Amélie Roussel', 'France', 'Junior', DATE '2024-01-15', 0);
INSERT INTO drivers VALUES (7, 'Callum Hargreaves', 'United Kingdom', 'Reserve', DATE '2023-06-19', 5);
INSERT INTO drivers VALUES (8, 'Nils Brandvold', 'Norway', 'Junior', DATE '2024-03-11', 1);
INSERT INTO drivers VALUES (9, 'Mateo Lizarraga', 'Argentina', 'Junior', DATE '2024-05-06', 0);
INSERT INTO drivers VALUES (10, 'Priya Raman', 'India', 'Junior', DATE '2024-07-22', 2);
INSERT INTO drivers VALUES (11, 'Jonas Achterberg', 'Netherlands', 'Junior', DATE '2024-08-26', 0);
INSERT INTO drivers VALUES (12, 'Sebastián Ugarte', 'Chile', 'Junior', DATE '2024-09-30', 6);
INSERT INTO drivers VALUES (13, 'Pau Ferrer', 'Spain', 'Junior', DATE '2024-12-09', 0);
INSERT INTO drivers VALUES (14, 'Lucía Benavente', 'Mexico', 'Junior', DATE '2025-01-20', 1);
INSERT INTO drivers VALUES (15, 'Finn Kaltenbach', 'Germany', 'Reserve', DATE '2025-02-17', 3);
INSERT INTO drivers VALUES (16, 'Harriet Cole', 'United Kingdom', 'Junior', DATE '2025-03-24', 0);
INSERT INTO drivers VALUES (17, 'Diego Saldaña', 'Mexico', 'Junior', DATE '2025-04-28', 4);
INSERT INTO drivers VALUES (18, 'Haruto Sakai', 'Japan', 'Junior', DATE '2025-06-02', 0);
INSERT INTO drivers VALUES (19, 'Chloé Marchand', 'France', 'Junior', DATE '2025-07-14', 2);
INSERT INTO drivers VALUES (20, 'Marco Brambilla', 'Italy', 'Junior', DATE '2025-09-08', 0);
INSERT INTO races VALUES (1, 'Sakhir Grand Prix', 'Middle East', DATE '2024-03-02', 57, 5.412, 24.6);
INSERT INTO races VALUES (2, 'Jeddah Grand Prix', 'Middle East', DATE '2024-03-09', 50, 6.174, 27.3);
INSERT INTO races VALUES (3, 'Melbourne Grand Prix', 'Oceania', DATE '2024-03-24', 58, 5.278, 19.8);
INSERT INTO races VALUES (4, 'Suzuka Grand Prix', 'Asia', DATE '2024-04-07', 53, 5.807, 18.2);
INSERT INTO races VALUES (5, 'Shanghai Grand Prix', 'Asia', DATE '2024-04-21', 56, 5.451, 21.5);
INSERT INTO races VALUES (6, 'Miami Grand Prix', 'North America', DATE '2024-05-05', 57, 5.41, 31.4);
INSERT INTO races VALUES (7, 'Imola Grand Prix', 'Europe', DATE '2024-05-19', 63, 4.909, NULL);
INSERT INTO races VALUES (8, 'Monaco Grand Prix', 'Europe', DATE '2024-05-26', 78, 3.337, 22.1);
INSERT INTO races VALUES (9, 'Montreal Grand Prix', 'North America', DATE '2024-06-09', 70, 4.361, 17.4);
INSERT INTO races VALUES (10, 'Barcelona Grand Prix', 'Europe', DATE '2024-06-23', 66, 4.657, 28.9);
INSERT INTO races VALUES (11, 'Silverstone Grand Prix', 'Europe', DATE '2024-07-07', 52, 5.891, 16.7);
INSERT INTO races VALUES (12, 'Spa Grand Prix', 'Europe', DATE '2024-07-28', 44, 7.004, 15.9);
INSERT INTO races VALUES (13, 'Monza Grand Prix', 'Europe', DATE '2024-09-01', 53, 5.793, 26.2);
INSERT INTO races VALUES (14, 'Sao Paulo Grand Prix', 'South America', DATE '2024-11-03', 71, 4.309, 23.8);
INSERT INTO races VALUES (15, 'Lusail Grand Prix', 'Middle East', DATE '2025-03-16', 57, 5.419, 25.7);
INSERT INTO races VALUES (16, 'Sepang Grand Prix', 'Asia', DATE '2025-03-30', 56, 5.543, 32.6);
INSERT INTO races VALUES (17, 'Singapore Grand Prix', 'Asia', DATE '2025-04-13', 62, 4.94, 29.5);
INSERT INTO races VALUES (18, 'Austin Grand Prix', 'North America', DATE '2025-05-04', 56, 5.513, 27.9);
INSERT INTO races VALUES (19, 'Zandvoort Grand Prix', 'Europe', DATE '2025-05-25', 72, 4.259, 18.9);
INSERT INTO races VALUES (20, 'Spielberg Grand Prix', 'Europe', DATE '2025-06-29', 71, 4.318, 20.4);
INSERT INTO races VALUES (21, 'Budapest Grand Prix', 'Europe', DATE '2025-07-20', 70, 4.381, 30.8);
INSERT INTO races VALUES (22, 'Baku Grand Prix', 'Asia', DATE '2025-08-03', 51, 6.003, NULL);
INSERT INTO races VALUES (23, 'Mexico City Grand Prix', 'North America', DATE '2025-09-07', 71, 4.304, 21.2);
INSERT INTO races VALUES (24, 'Buenos Aires Grand Prix', 'South America', DATE '2025-09-28', 72, 4.28, 14.6);
INSERT INTO races VALUES (25, 'Portimão Grand Prix', 'Europe', DATE '2025-10-19', 66, 4.653, 19.3);
INSERT INTO races VALUES (26, 'Las Vegas Grand Prix', 'North America', DATE '2025-11-22', 50, 6.201, NULL);
INSERT INTO races VALUES (27, 'Yas Marina Grand Prix', 'Middle East', DATE '2025-12-07', 58, 5.281, NULL);
INSERT INTO races VALUES (28, 'Riyadh Grand Prix', 'Middle East', DATE '2025-12-14', 50, 6.12, NULL);
INSERT INTO results VALUES (1, 1, 1, 3, 2, 57, 2, 18);
INSERT INTO results VALUES (2, 2, 1, 11, 9, 57, 2, 2);
INSERT INTO results VALUES (3, 1, 2, 5, 4, 50, 1, 12);
INSERT INTO results VALUES (4, 2, 2, 14, 12, 49, 1, 0);
INSERT INTO results VALUES (5, 1, 3, 2, NULL, 12, 0, 0);
INSERT INTO results VALUES (6, 2, 3, 10, 8, 58, 2, 4);
INSERT INTO results VALUES (7, 1, 4, 6, 5, 53, 2, 10);
INSERT INTO results VALUES (8, 2, 4, 12, 6, 53, 2, 8);
INSERT INTO results VALUES (9, 1, 5, 4, 3, 56, 2, 15);
INSERT INTO results VALUES (10, 2, 5, 15, NULL, 23, 1, 0);
INSERT INTO results VALUES (11, 1, 6, 8, 6, 57, 1, 8);
INSERT INTO results VALUES (12, 2, 6, 9, 11, 56, 1, 0);
INSERT INTO results VALUES (13, 1, 8, 1, 1, 78, 1, 25);
INSERT INTO results VALUES (14, 4, 8, 10, 4, 78, 1, 12);
INSERT INTO results VALUES (15, 1, 9, 7, 7, 70, 2, 6);
INSERT INTO results VALUES (16, 4, 9, 13, 5, 70, 2, 10);
INSERT INTO results VALUES (17, 1, 10, 3, 5, 66, 2, 10);
INSERT INTO results VALUES (18, 2, 10, 13, 11, 65, 2, 0);
INSERT INTO results VALUES (19, 1, 11, 9, NULL, 38, 1, 0);
INSERT INTO results VALUES (20, 2, 11, 6, 5, 52, 2, 10);
INSERT INTO results VALUES (21, 1, 12, 5, 4, 44, 1, 12);
INSERT INTO results VALUES (22, 2, 12, 16, 13, 43, 1, 0);
INSERT INTO results VALUES (23, 1, 13, 2, 8, 53, 1, 4);
INSERT INTO results VALUES (24, 2, 13, 12, NULL, 7, 0, 0);
INSERT INTO results VALUES (25, 1, 14, NULL, 7, 71, 2, 6);
INSERT INTO results VALUES (26, 2, 14, 8, 4, 71, 3, 12);
INSERT INTO results VALUES (27, 1, 15, 2, 2, 57, 2, 18);
INSERT INTO results VALUES (28, 3, 15, 8, 7, 57, 2, 6);
INSERT INTO results VALUES (29, 1, 16, 4, 6, 56, 3, 8);
INSERT INTO results VALUES (30, 3, 16, 6, 4, 56, 2, 12);
INSERT INTO results VALUES (31, 1, 17, 1, 1, 62, 1, 25);
INSERT INTO results VALUES (32, 3, 17, 9, NULL, 41, 1, 0);
INSERT INTO results VALUES (33, 1, 18, 6, 4, 56, 2, 12);
INSERT INTO results VALUES (34, 3, 18, 5, 3, 56, 2, 15);
INSERT INTO results VALUES (35, 1, 19, 3, NULL, 55, 2, 0);
INSERT INTO results VALUES (36, 3, 19, 7, 5, 72, 2, 10);
INSERT INTO results VALUES (37, 1, 20, 5, 3, 71, 2, 15);
INSERT INTO results VALUES (38, 3, 20, 10, 8, 71, 1, 4);
INSERT INTO results VALUES (39, 4, 21, 11, 3, 70, 2, 15);
INSERT INTO results VALUES (40, 3, 21, 4, 2, 70, 2, 18);
INSERT INTO results VALUES (41, 1, 22, 2, 2, 51, 1, 18);
INSERT INTO results VALUES (42, 3, 22, NULL, 10, 51, 1, 1);
INSERT INTO results VALUES (43, 1, 23, 7, 6, 71, 2, 8);
INSERT INTO results VALUES (44, 3, 23, 6, NULL, 29, 1, 0);
INSERT INTO results VALUES (45, 1, 24, 4, 2, 72, 2, 18);
INSERT INTO results VALUES (46, 5, 24, 12, 5, 72, 2, 10);
INSERT INTO results VALUES (47, 1, 25, 3, 4, 66, 1, 12);
INSERT INTO results VALUES (48, 5, 25, 9, 5, 66, 2, 10);
`,
  schema: {
    drivers: ['driver_id', 'name', 'country', 'role', 'joined_on', 'penalty_points'],
    races: ['race_id', 'grand_prix', 'region', 'race_date', 'total_laps', 'length_km', 'track_temp'],
    results: ['result_id', 'driver_id', 'race_id', 'grid', 'position', 'laps', 'pit_stops', 'points'],
  },
  types: {
    drivers: ['NUMBER(3)', 'VARCHAR2(40)', 'VARCHAR2(30)', 'VARCHAR2(8)', 'DATE', 'NUMBER(2)'],
    races: ['NUMBER(3)', 'VARCHAR2(40)', 'VARCHAR2(15)', 'DATE', 'NUMBER(3)', 'NUMBER(5,3)', 'NUMBER(3,1)'],
    results: ['NUMBER(4)', 'NUMBER(3)', 'NUMBER(3)', 'NUMBER(2)', 'NUMBER(2)', 'NUMBER(3)', 'NUMBER(1)', 'NUMBER(4,1)'],
  },
  join: 'SELECT <columns>\nFROM results r\nJOIN drivers d ON d.driver_id = r.driver_id;',
};
if (typeof module !== 'undefined') module.exports = GAME_COMP_DBS.f1;
