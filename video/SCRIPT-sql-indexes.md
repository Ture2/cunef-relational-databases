# Indexes: script and timeline

- English · 1920×1080 · 30 fps · British English voice-over (no subtitles) + the same soft music as the other videos.
- Total: **03:10** (5 700 frames). The single source of timing is `src/sql/indexes/timeline.ts`; the narration is `src/sql/indexes/narration.json`.
- Times inside a scene are **local** (seconds from the scene start).
- Source: the SQL cards `index-basics`, `composite-index`, `index-cost`, `query-plan` and `sargable` of the website (`data/<lang>/sql.js`), and the Theory card `btree` (`data/<lang>/theory.js`), on the SHOP schema. Oracle syntax.
- Same style as the other videos (`SCRIPT-sql-joins.md`). Colour coding: blue = the customer table and its rows, teal = index structures and index access (B-tree nodes, INDEX RANGE SCAN), orange = full scans, the search path and the rows being discussed; yellow = row-by-row scan progress.
- The video sits on the website card `index-basics` (`video: 'sql-indexes'` in `data/<lang>/sql.js`); `js/sql.js` (`SQL_VIDEOS['sql-indexes'].chapters`) holds the chapter start times.

## Dataset
SHOP (`data/<lang>/sql.js`, `SHOP`): `customer` has 50,000 rows generated with `CONNECT BY LEVEL`: `customer_id` = n, `email` = `'user' || n || '@mail.com'`, `city` = Madrid/Barcelona/Valencia/Sevilla/Bilbao by `MOD(n, 5)`, `signup_date` = `DATE '2020-01-01' + MOD(n, 1500)`. The search target is `user43210@mail.com` (Madrid, 2023-04-25). Every row and date shown is a real row of that setup (`customerRow` in `src/sql/indexes/shared.tsx`).

## Scenes
| # | Scene | Start | Length | What it shows |
|---|---|---|---|---|
| 1 | Title | 00:00 | 8 s | Logo, "Indexes", chips Full scan · B-tree · ROWID · EXPLAIN PLAN · Composite |
| 2 | Phone book | 00:08 | 18 s | A–Z tabs: "Read every page?" is struck out, R lights up and page R opens on Ruiz; then an index on email (sorted as strings: user1, user10, user2, user3) points to the customer rows |
| 3 | Full table scan | 00:26 | 22 s | customer (50,000 rows) and `WHERE email = 'user43210@mail.com'`; a pointer reads every row while a counter runs to 50,000 (the match is found on the way but the scan goes on); plan: TABLE ACCESS FULL |
| 4 | CREATE INDEX and the B-tree | 00:48 | 32 s | `CREATE INDEX idx_customer_email ON customer (email);` The tree is built bottom-up: sorted, chained leaf blocks, then branch and root guide keys; the search goes root → branch → leaf, the leaf gives the ROWID (object · file · block · row) and the ROWID gives the customer row. "A few steps, not 50,000 rows" |
| 5 | EXPLAIN PLAN | 01:20 | 29 s | `EXPLAIN PLAN FOR …` + `DBMS_XPLAN.DISPLAY`; before: TABLE ACCESS FULL; after: INDEX RANGE SCAN on IDX_CUSTOMER_EMAIL then TABLE ACCESS BY INDEX ROWID; same result; PRIMARY KEY and UNIQUE get an index automatically |
| 6 | Composite index | 01:49 | 28 s | `CREATE INDEX idx_city_date ON customer (city, signup_date);` entries sorted by city then date; Madrid from 2023 and Madrid alone are contiguous (✓), dates from 2023 alone are spread across every city (✗): the leftmost prefix rule |
| 7 | What indexes cost | 02:17 | 20 s | One INSERT writes the table plus the PK index, idx_customer_email and idx_city_date (+1 each); UPDATE and DELETE too; disk space; index what you filter, join or sort by, not every column |
| 8 | Functions hide the index | 02:37 | 24 s | `WHERE LOWER(email) = 'user77@mail.com'`: the email index is sorted by email, not LOWER(email), so the plan is TABLE ACCESS FULL; the fix `CREATE INDEX idx_email_lower ON customer (LOWER(email));` gives INDEX RANGE SCAN |
| 9 | Outro | 03:01 | 9 s | "Practise it", Indexes in the SQL section, logo |

## Narration
The narration lives in `src/sql/indexes/narration.json` (segment ids `ix<scene>-<n>`). After editing it, run `python scripts/tts.py --video sql/indexes`. The script regenerates the MP3s and checks that every segment fits its scene.
