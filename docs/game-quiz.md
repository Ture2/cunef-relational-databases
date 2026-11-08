# Query for a Million / Una consulta por un millón — contract

The SQL quiz-ladder game at `#/game`. It replaces the war game "Operation SELECT" (its rules, map database,
canvas and tests are deleted). Everything that is not gameplay is kept: the arcade look (`game.css`, Silkscreen,
light and dark themes, `docs/game-visual.md`), the onboarding tour shell (`js/game-intro.js`, `game-intro.css`),
the EN|ES and Light|Dark switches, How to play, the SQL console and its snippet chips, the route, the home and
search entries, and the Playwright harness in `tools/check-game.mjs`.

This file is the frozen contract between the agents of this round. Change it only through the orchestrator.

## 1. The game in one paragraph

SQL-Bot, the host, asks 15 questions of rising difficulty about a fictional video-game shop database. The student
answers each one by writing an Oracle `SELECT`. **Run** is free and unlimited (it only shows the result). **Lock
in** asks "Lock it in?", holds a short suspense beat, then compares the student's result with the reference
solution's result. Right: climb one rung. Wrong: the game ends and the student keeps the prize of the last safe
rung reached (rungs 5 and 10), unless the Review lifeline is still unused, in which case it is offered as a rescue.
The student may **walk away** at any time with the prize of the last rung answered. Three lifelines, once each per
game: **Key clause**, **Template**, **Review**.

Naming: our own title, host and lines. Do not use the TV show's name, catchphrases ("final answer", "phone a
friend", "ask the audience", "50:50"), music, or its look (no purple stage, no hexagon answer bars).
- Title: EN `Query for a Million`, ES `Una consulta por un millón`.
- Host: `SQL-Bot`. Own lines, e.g. EN "Lock it in?" / "Let's ask the database…"; ES "¿La fijamos?" /
  "Veamos qué dice la base de datos…".
- Lifelines: EN `Key clause`, `Template`, `Review`; ES `Cláusula clave`, `Plantilla`, `Revisión`.

## 2. Files and owners

| File | Owner | Notes |
|---|---|---|
| `docs/game-quiz.md`, `docs/game-visual.md` | orchestrator | contracts |
| `js/core.js`, `index.html`, `js/search.js` | orchestrator | wiring (done in phase 0) |
| `data/game-bank.js` | A | global `GAME_BANK`, language-neutral; also `module.exports` |
| `data/en/game.js`, `data/es/game.js` | A | `GAME_TEXT` (§6) |
| `js/game-core.js` | A | global `GameCore`, pure; also `module.exports` (§7) |
| `tools/check-game-bank.mjs`, `tools/check-game-text.mjs` | A | Node checks (§11) |
| `js/game.js`, `game.css`, `i18n/es-game.js` | B | the page (§8) |
| `js/game-intro.js`, `game-intro.css` | C | the tour (§9) |
| `data/en/game-tour.js`, `data/es/game-tour.js` | C | `GAME_TOUR` (§9) |
| `tools/check-game-tour.mjs` | C | Node check of `GAME_TOUR` |
| `tools/check-game.mjs`, `README.md` | T | browser checks (§11), docs |

Load order in `index.html` (already wired): `i18n/es-game.js` → `data/game-bank.js` → `data/{en,es}/game.js`
→ `data/{en,es}/game-tour.js` → … `js/oracle-dialect.js` → `js/sql-runner.js` → `js/game-core.js` →
`js/game-intro.js` → `js/game.js`. `js/core.js` binds `GAME_TEXT = langData('GAME_TEXT')` and
`GAME_TOUR = langData('GAME_TOUR')`.

Deleted: `js/game-rules.js`, `js/game-db.js`, `js/game-render.js`, `tools/check-game-rules.mjs`,
`tools/check-game-db.mjs`, `tools/check-game-campaign.mjs`, `docs/game-design.md`.

## 3. The database (Oracle text, English names, fictional data)

```sql
CREATE TABLE customers (
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
  rating   NUMBER(3,1)              -- NULL: not rated yet
);
CREATE TABLE sales (
  sale_id      NUMBER(5)   PRIMARY KEY,
  customer_id  NUMBER(4)   NOT NULL REFERENCES customers (customer_id),
  game_id      NUMBER(4)   NOT NULL REFERENCES games (game_id),
  sale_date    DATE        NOT NULL,
  quantity     NUMBER(3)   NOT NULL,
  total_paid   NUMBER(8,2) NOT NULL
);
```

Data (A designs it; ~20 customers, ~24 games, ~60 sales in 2024–2025):
- Invented game titles only (no real games, brands or people). Genres from: Action, Adventure, Puzzle, RPG,
  Racing, Sports, Strategy. Countries in English (Spain, Mexico, France, …). Customer names are invented, varied.
- Dates as `DATE 'YYYY-MM-DD'` literals. `total_paid` = quantity × price, except a few discounted sales.
- Built for questions: some customers never bought anything; some games never sold; some games have `rating`
  NULL; no ties on any column a question sorts or cuts by (`FETCH FIRST`), so every ordered answer is unique.
- `GAME_BANK.setup` is the full Oracle script (CREATE + INSERT); run through `SqlRunner.execute(setup, sql)` in
  the browser (fresh copy per call, cached image) and through `OracleDialect.script` + sql.js in Node.

## 4. The ladder

`GameCore.LADDER = [100, 250, 500, 1000, 2500, 5000, 10000, 20000, 40000, 75000, 125000, 250000, 400000, 600000, 1000000]`
(euros). `GameCore.SAFE = [5, 10]` (1-based rungs). Bands:

| Rungs | Band key | Topics |
|---|---|---|
| 1–5 | `easy` | SELECT, WHERE, ORDER BY, FETCH FIRST n ROWS ONLY, DISTINCT, IS NULL, LIKE, BETWEEN, IN |
| 6–10 | `medium` | COUNT, SUM, AVG, MIN, MAX, GROUP BY, HAVING, ROUND (single table) |
| 11–15 | `hard` | INNER JOIN, LEFT JOIN, subqueries (scalar, IN, NOT IN / NOT EXISTS, correlated), joins + GROUP BY |

Difficulty also rises inside each band (rung 11 is an easy join; rung 15 is a join + group + subquery).

## 5. The bank: `data/game-bank.js`

```js
const GAME_BANK = {
  setup: `CREATE TABLE customers (...); ... INSERT INTO sales VALUES (...);`,
  schema: { customers: ['customer_id', 'name', 'country', 'signup_date', 'vip_level'],
            games: ['game_id', 'title', 'genre', 'price', 'stock', 'rating'],
            sales: ['sale_id', 'customer_id', 'game_id', 'sale_date', 'quantity', 'total_paid'] },
  types:  { customers: ['NUMBER(4)', 'VARCHAR2(40)', ...], games: [...], sales: [...] },   // for the schema panel
  questions: [
    { id: 'r01a', level: 1, solution: 'SELECT title, price FROM games WHERE genre = \'Puzzle\'',
      ordered: false,                 // true when the prompt asks for an order: rows compared in order
      clause: ['WHERE'],              // the key clause(s) the Key clause lifeline names (SQL keywords, English)
      template: 'SELECT name, country FROM customers WHERE vip_level = 3',  // same shape, other table/data
      traps: ['SELECT title FROM games WHERE genre = \'Puzzle\''] },        // 1–3 typical wrong answers
    ...
  ],
};
if (typeof module !== 'undefined') module.exports = GAME_BANK;
```

- 45 questions, ids `r01a r01b r01c … r15a r15b r15c` (rung number + letter), 3 per rung.
- Every `solution` is one Oracle `SELECT` (or `WITH … SELECT`), no trailing `;`, no `LIMIT`, passes
  `OracleDialect.lint` with no findings, and returns at least one row. Use Oracle syntax (`FETCH FIRST n ROWS
  ONLY`, `||`, `NVL`, `EXTRACT(YEAR FROM d)`, `ROUND(x, 2)`), never SQLite-only syntax.
- Prefer questions with small results (1–8 rows) so the student can check them on screen.
- `template` uses the same SQL structure as the solution on a different table or filter, and is never the
  solution nor gives the answer away. It runs and returns rows.
- `traps` are plausible student mistakes that must give a **different** result (INNER instead of LEFT JOIN,
  WHERE instead of HAVING, missing DISTINCT, wrong sort direction, COUNT(*) vs COUNT(col) on NULLs…).

## 6. Text: `data/{en,es}/game.js`

```js
DATA.en.GAME_TEXT = {
  title: 'Query for a Million',
  tagline: '15 questions, one database, a million on the line.',
  intro: 'md: 2 short paragraphs (what the game is; Run is free, Lock in counts)',
  host: {                      // SQL-Bot's lines; arrays are picked at random (seeded)
    welcome: '…', ask: ['…', '…', '…'], lock: 'Lock it in?', suspense: 'Let\'s ask the database…',
    correct: ['…', '…', '…'], wrong: '…', rescue: '…', safe: '… {prize} …', walk: '… {prize} …',
    win: '…', bands: { easy: '…', medium: '…', hard: '…' },  // said when a band starts
  },
  bands: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
  lifelines: { clause: { name, blurb }, template: { name, blurb }, review: { name, blurb } },
  questions: { r01a: { prompt, clause, templateNote, explain }, … },   // all 45 ids
  end: { won, lost, walked, best, review, again },   // headings and md lead-ins of the end screen
};
```

- `prompt` (md, ≤ 45 words): the business question. It must say which columns to return, in which order, and
  how to sort (when `ordered`) so that a correct query is unambiguous. Name columns in `code`.
- `clause` (md, ≤ 22 words): the Key clause hint, e.g. "You need a **LEFT JOIN** from `customers` to `sales`."
- `templateNote` (≤ 25 words): what the template query does.
- `explain` (md, ≤ 40 words): shown on the end screen with the reference solution.
- md: only `**bold**` and `` `code` ``, paragraphs separated by `\n\n`. Sentence case. Schema names, SQL and
  values (`'Puzzle'`, `'Spain'`) stay in English in both languages.

## 7. `js/game-core.js` (global `GameCore`, no DOM, no `t()`, runs in Node)

```js
GameCore.LADDER, GameCore.SAFE, GameCore.BANDS          // §4; BANDS = [{key:'easy',from:1,to:5}, …]
GameCore.band(level) -> 'easy'|'medium'|'hard'
GameCore.prize(level) -> LADDER[level-1]  (0 for level 0)
GameCore.safePrize(answered) -> prize of the highest safe rung <= answered (0 if none)
GameCore.rng(seed) -> () => float in [0,1)   (mulberry32; seed is a uint32)
GameCore.draw(bank, seed) -> [15 question ids, one per level, chosen with rng(seed)]
GameCore.newRun(bank, seed) -> state
GameCore.pass(state, sql) / fail(state, sql) / rescue(state, sql) / walkAway(state) / useLifeline(state, name)
  -> new state (pure: never mutate the argument). useLifeline throws if already used or not playing.
GameCore.checkQuery(sql) -> { ok:true } | { ok:false, reason:'empty'|'many'|'not-query'|'unsupported'|'lint', detail? }
  // one statement (OracleDialect.script gives exactly 1 unit with 1 sql), a SELECT/WITH query, no unsupported
  // unit, OracleDialect.lint empty. A trailing ';' is fine. Comments are fine.
GameCore.grade(got, want, ordered) -> { ok, reason: null|'cols'|'rows'|'order'|'values', got:{cols,rows}, want:{cols,rows} }
  // got/want = {cols:[...], rows:[[...]]} as SqlRunner.execute returns. Same rule as js/sql-challenges.js
  // compare(): column count, row count, multiset of rows (numbers rounded to 4 decimals), order if `ordered`.
  // Column names never matter.
GameCore.diagnose({ sql, error, grade, schema }) -> [{ code, ...params }]
  // codes: 'limit' (LIMIT used), 'unknown-name' {name, suggest} (from ORA-00904 / "no such column|table",
  // nearest schema name by Levenshtein <= 2), 'group-by' (ORA-00979/00937: a selected column not grouped),
  // 'error' {code, text} (any other error), 'cols' {got, want}, 'rows' {got, want}, 'order', 'values', 'match'.
  // Never returns values from the reference result.
GameCore.nearest(name, candidates) -> string|null
```

State (what `game.js` saves under `makeStore('game-quiz-v1')`):

```js
{ v: 1, seed, ids: [15 ids], level: 1,            // level = the rung being played (1..15)
  status: 'playing'|'won'|'lost'|'walked',
  prize: 0,                                       // final prize once status != 'playing'
  used: { clause: false, template: false, review: false },
  answers: [{ id, sql, ok }],                     // every lock-in, including a rescued miss (ok:false)
  shown: { clause: null|id, template: null|id },  // which question a lifeline was shown on (to redisplay after reload)
  started: 'ISO date' }
```

- `pass`: push `{id, sql, ok:true}`; level 15 → status `won`, prize 1,000,000; else level+1.
- `fail`: push `{id, sql, ok:false}`; status `lost`, prize = `safePrize(level-1)`.
- `rescue`: requires `used.review === false`; push the miss; `used.review = true`; stays on the same level.
- `walkAway`: status `walked`, prize = `prize(level-1)`.
- Best score: `makeStore('game-best-v1')` → `{ prize, date }`, updated by `game.js` when a run ends.

## 8. The page: `js/game.js`, `game.css`, `i18n/es-game.js`

Keep the old page's skeleton and generic parts (read the current `js/game.js` before rewriting it): the module
contract `{ render, onClick, onInput, onKeydown, wide: true }`, `boot()` with `SqlRunner.load()`, the loading and
broken cards (`guard`, `showBroken`), the teardown on `hashchange`, the marquee and its tools (`game-help`,
`game-lang-en|es`, `game-theme-light|dark`, `aria-pressed`), `currentTheme` / `watchTheme`, opening `GameIntro`
on a first visit and `markSeen` on close (focus back to How to play), the console markup, `resultHtml` with
`SqlRunner.tableHtml`, Ctrl+Enter, snippet chips that select their `<placeholder>`, the typewriter for the
prompt (instant under reduced motion), `announce()` for screen readers.

Remove the war parts: stats, map key, loop strip, canvas, turn report, orders, undo, audit, intel of units.

Seed: `localStorage['game-seed']` (a number) if present, else random. A new run is made when there is no saved
run or after Play again. Remove the stale `game-v1` key on boot.

Stable hooks (tests and the tour depend on them; keep the `wr-` prefix):

| Hook | What |
|---|---|
| `section.wr-game` | page root (tour mounts here) |
| `#wr-host` | SQL-Bot's line, `aria-live="polite"` |
| `#wr-question` | question card: rung number, prize, band, prompt `#wr-prompt` |
| `#wr-lifelines` | three buttons `data-action="game-lifeline" data-life="clause|template|review"`, `data-fid="game-life-<name>"`; used → `disabled` + class `is-used` |
| `#wr-life-out` | what a lifeline shows (Key clause text + result shape; Template SQL + note + an "Insert template" button `game-insert-template`; Review list) |
| `.wr-console`, `#wr-sql`, `#wr-out` | console; `[data-fid="game-run"]` Run (also Ctrl+Enter); `[data-fid="game-lock"]` Lock in |
| `game-snippet` chips | `data-snip`: `customers`, `games`, `sales` (a `SELECT * FROM … FETCH FIRST 5 ROWS ONLY`), `count` (`SELECT COUNT(*) FROM <table>`), `join` (a JOIN skeleton) |
| `#wr-schema` | the three tables: columns and types from `GAME_BANK.schema/types` |
| `#wr-ladder` | `ol`, 15 `li[data-level]` top prize first; classes `is-current`, `is-done`, `is-safe`; `aria-current="step"` on the current; `[data-fid="game-walk"]` Walk away |
| `#wr-confirm` | modal dialog for Lock in and Walk away: `[data-fid="game-confirm-yes"]`, `[data-fid="game-confirm-no"]`; Esc = no; focus trapped; returns focus |
| `#wr-rescue` | modal after a wrong lock-in while Review is unused: `[data-fid="game-rescue-yes"]` (use Review, stay), `[data-fid="game-rescue-no"]` (end the game) |
| `#wr-end` | end screen, `data-status="won|lost|walked"`, `#wr-end-prize`, best score, the review list (each question: prompt, your SQL, reference solution, explain), `[data-fid="game-again"]` |
| `GamePage.debug()` | returns a deep copy of the state (tests only) |

Lock in flow: `checkQuery` fails → message in `#wr-out`, nothing spent. Else confirm → suspense (host line
`suspense`, the current rung blinks in steps; 1200 ms, 0 ms under reduced motion) → `SqlRunner.execute(setup,
sql)` and the reference → `grade` → pass (rung flashes `--wr-ok`, host `correct`, next prompt typed) / wrong (rung
flashes `--wr-p2`; rescue dialog if Review unused, else `fail` → end screen). A runtime error at lock-in counts as
wrong (it was confirmed), but the Review rescue explains it.

Prize text: `Intl.NumberFormat(LANG === 'es' ? 'es-ES' : 'en-GB', { style: 'currency', currency: 'EUR',
maximumFractionDigits: 0 })`.

All UI strings through `t()`; every new string has its Spanish in `i18n/es-game.js` (the browser check fails on a
missing one). Delete the war strings from `i18n/es-game.js`.

## 9. The tour: `js/game-intro.js`, `game-intro.css`, `data/{en,es}/game-tour.js`

Keep the shell (API `open({onClose})`, `close`, `isOpen`, `seen`, `markSeen`, key `game-intro-seen`; veil with
backdrop blur, the game behind made `inert`, focus trap, Back/Next/arrows, Esc skips, dots, reduced motion, the
spotlight ring that cuts a hole in the blur). Replace the war-coupled screens:

0. **Attract**: the title over the blurred live game, a small pixel ladder graphic instead of the terrain strip;
   "Start the briefing" / "Skip to the game".
1. **The game**: 15 questions, 3 bands, safe rungs 5 and 10, walk away.
2. **How you play**: Read → Query (Run, free, as often as you like) → Lock in (counts).
3. **The screen and controls**: spotlight targets `ladder: #wr-ladder`, `question: #wr-question`,
   `lifelines: #wr-lifelines`, `console: .wr-console`, `lock: [data-fid="game-lock"]`, `schema: #wr-schema`.
4. **Lifelines and walking away**.
5. **A little example**: a mini console types `example.sql`, shows its result (run live with
   `SqlRunner.execute(GAME_BANK.setup, sql)`, first 4 rows; a static fallback line if the engine is not ready),
   a fake Lock in is pressed, the host says the suspense line, rung 1 of a mini ladder lights up. Replay button.

`GAME_TOUR` keeps the old `tour` object's structure where it still fits (`attract`, `nav`, `game`, `loop`,
`screen.spots`, `options`, `example`), with the six spot ids above. Title and tagline come from `GAME_TEXT`.

## 10. Visual direction for the new parts

See `docs/game-visual.md` §"Round 3: the quiz". Same tokens, same type, same shapes.

## 11. Tests

- `tools/check-game-bank.mjs` (A, Node + sql.js from `tools/node_modules`, `OracleDialect` and `GameCore` via
  `require`): the setup builds; `schema`/`types` match the database (`pragma_table_info`); 45 ids, 3 per rung;
  each solution: `checkQuery` ok, returns ≥ 1 row, same result on a second database built with the INSERTs in
  reverse order (catches ties and order dependence), respects its band (1–5: no GROUP BY, JOIN or subquery;
  6–10: an aggregate, no JOIN; 11–15: a JOIN or a subquery); each trap runs or errors and does not grade ok
  against the solution; each template runs, returns rows and is not the solution; `clause` words appear in the
  solution. `GameCore`: ladder, safePrize, band, draw determinism and one id per level, the state transitions
  (pure), checkQuery cases, grade cases, diagnose cases (LIMIT, misspelled column → suggestion, GROUP BY error).
- `tools/check-game-text.mjs` (A): same keys in EN and ES; all 45 question ids; md rules; word limits; sentence
  case; no TV-show catchphrases.
- `tools/check-game-tour.mjs` (C): `GAME_TOUR` shape EN = ES, the six spot ids, word limits, the example SQL
  passes `GameCore.checkQuery`.
- `tools/check-game.mjs` (T, Playwright, EN and ES; keep the harness: static server, sql.js from
  `tools/node_modules`, init script with `game-seed` and `game-intro-seen`, `SHOTS=<dir>`). See the plan.

## 13. Modes (round 5): frozen contract

Five modes of 15 rungs plus a final mixed mode. Everything in §1–§12 still holds for each run: the ladder, safe
rungs, each lifeline once per run, walk away, suspense, rescue, always light, game-first layout.

| key | Name EN / ES | Keyword on the tile | Bank | Accepted at Lock in (`checkAnswer`) |
|---|---|---|---|---|
| `select` | Query / Consultar | SELECT | 45 (r01a…r15c, existing) | exactly one SELECT/WITH query (today's `checkQuery`) |
| `insert` | Insert / Insertar | INSERT | 30 `ins01a ins01b … ins15b` | one or more INSERT (VALUES or INSERT…SELECT); COMMIT allowed |
| `update` | Update / Modificar | UPDATE | 30 `upd01a …` | one or more UPDATE; COMMIT allowed |
| `delete` | Delete / Borrar | DELETE | 30 `del01a …` | one or more DELETE; COMMIT allowed |
| `ddl` | Structure / Estructura | CREATE | 30 `ddl01a …` | CREATE TABLE, ALTER TABLE ADD / DROP COLUMN, CREATE [OR REPLACE] VIEW, CREATE INDEX, DROP VIEW/INDEX; COMMIT allowed |
| `mixed` | Mixed / Mixto | MIX | draws from all five | the rules of the drawn question's mode |

Any other kind of statement is refused without cost, with reason `'wrong-kind'` and the expected kind. The
existing refusals (unsupported, unsafe recursion, lint) apply in every mode. Run accepts anything, always on a
fresh copy.

### 13.1 Question shape (DML and DDL)

```js
{ id: 'ins07a', mode: 'insert', level: 7,
  solution: "INSERT INTO games (...) VALUES (...);\nINSERT INTO games (...) VALUES (...)",  // may be several statements
  checks: null | ['SELECT ...', 'INSERT INTO reviews VALUES (1, 1, 7)', ...],         // probes; null = default
  clause: ['INSERT', 'VALUES'], template: '...', traps: ['...'] }
```

- **Bank files:** `data/game-bank-<mode>.js` appends to `GAME_BANK.questions` in the browser and also works in
  Node. Agent E chooses the pattern and documents it at the top of each file.
- **Texts:** `data/{en,es}/game-q-<mode>.js` merges `{ id: { prompt, clause, templateNote, explain } }` into
  `GAME_TEXT.questions`, with the same field rules as §6.
- **New ids** are explicit numbers, because there are no sequences. New customers start at 101, games at 101 and
  sales at 1001, so they never clash with the setup rows (ids up to 20, 24 and 53).
- **Default checks** (`GameCore.defaultChecks(q)`): for insert, update and delete, a full snapshot of every base
  table: `SELECT * FROM customers ORDER BY customer_id`, `… games ORDER BY game_id`, `… sales ORDER BY sale_id`.
- **DDL checks:** every DDL question gives its own probes:
  - dictionary probes, such as `SELECT column_name, nullable FROM user_tab_columns WHERE table_name = 'REVIEWS'
    ORDER BY column_id` and `SELECT index_name … FROM user_indexes …`;
  - view probes, such as `SELECT * FROM v ORDER BY …`;
  - behaviour probes: an INSERT that must succeed, or must fail with a given ORA code.

  Column types are not compared, because SQLite does not keep them.

### 13.2 Grading

`SqlRunner.executeChecks(setup, text, checks)` returns `{ error?: {code?, text}, changes, results: [ {cols, rows}
| { error: {code, text} } ] }`:
1. It makes one fresh copy of the database.
2. It runs `text`. An error here is the answer's error.
3. It runs each probe inside `SAVEPOINT` … `ROLLBACK TO`, so probes never affect each other. A probe's error
   becomes that probe's result.

`changes` is the total number of rows modified by `text`.

`GameCore.gradeChecks(got, want)` returns `{ ok, reason: null | 'error' | 'probe', probe: index, detail }`.
`detail` is the `grade()` result for that probe, or `{gotError, wantError}`. The answer is right when both have
the same number of probes and every probe is equal: rows by `grade(…, ordered=true)`, errors by ORA code only.
Select mode keeps using `grade`.

Review (`diagnose`) for DML and DDL adds these codes to the existing error codes:
- `{code:'table', table, got, want}`: the row counts differ in that table.
- `{code:'table-values', table}`: the same rows but different values.
- `{code:'constraint', ora}`: the answer failed on ORA-00001, 01400, 02290, 02291 or 02292, explained.
- `{code:'probe', index, expectError: bool}`: in DDL, which behaviour differs.

It never reveals reference values.

### 13.3 Mixed mode

`GameCore.drawMixed(bank, seed)` returns 15 ids. In each band (1–5, 6–10, 11–15), each of the five modes appears
exactly once, in a seeded order, and the question of that mode is drawn at that level.

The mode is unlocked when `GameCore.mixedUnlocked(reached)` is true: `reached[m] >= 5` for all five modes.
`reached[m]` is the highest rung answered right in any run of mode `m`; a walk-away or a loss still counts what
was answered.

### 13.4 Store v2 and routes

- **Routes:** `#/game` is the mode select screen ("choose your stage"); `#/game/<mode>` is a run of that mode.
  `js/main.js` passes the mode as `rest`. An unknown mode, or the mixed mode while it is locked, redirects to
  `#/game`.
- **Store:** `makeStore('game-quiz-v2')` holds `{ v: 2, runs: { <mode>: state }, best: { <mode>: {prize, date}
  }, reached: { <mode>: n } }`. Each state is as in §7, plus `mode`.
- **Migration from v1** on first load: the `game-quiz-v1` run goes to `runs.select` and its answered rungs to
  `reached.select`, and `game-best-v1` goes to `best.select`. Then the v1 keys are deleted.
- **Draft and pending rescue** become per mode: `game-quiz-draft-v2` and `game-quiz-pending-v2`, each
  `{ <mode>: … }`.
- `GameCore.newRun(bank, seed, mode)` draws only that mode's questions; the mixed mode uses `drawMixed`.

### 13.5 Run feedback in DML and DDL modes

- **After a DML Run:** "n rows inserted / updated / deleted", plus a diff of each touched table against the setup:
  - added rows in the ok colour;
  - changed rows in the coin colour, with the changed cells marked;
  - deleted rows struck through, in the p2 colour;
  - unchanged rows hidden and counted.
- **After a DDL Run:** the columns of the created or altered table (from `user_tab_columns`), or the first rows of
  the view.

### 13.6 Owners (round 5)

| Files | Agent |
|---|---|
| `js/main.js` (route), `index.html` (script tags), this section | orchestrator (done) |
| `js/sql-runner.js` (`executeChecks`), `js/game-core.js`, `tools/game-sql.mjs`, `tools/check-game-bank.mjs`; the first version of `data/game-bank-{insert,update,delete,ddl}.js` and `data/{en,es}/game-q-*.js`, with ONE sample question per mode (level 1) | E |
| `data/game-bank-{insert,update}.js`, `data/{en,es}/game-q-{insert,update}.js`, `data/{en,es}/game.js` (modes, host lines per mode, select-screen copy), `tools/check-game-text.mjs` | C1 |
| `data/game-bank-{delete,ddl}.js`, `data/{en,es}/game-q-{delete,ddl}.js` | C2 |
| `js/game.js`, `game.css`, `i18n/es-game.js`, `js/game-intro.js`, `game-intro.css`, `data/{en,es}/game-tour.js`, `tools/check-game-tour.mjs` | P |
| `tools/check-game.mjs`, `README.md` | T |

## 14. Study and competitive (round 6): frozen contract

The arcade has two sides:
- **Study** is everything in §1–§13 (five modes plus mixed, solutions shown at the end). It is unchanged.
- **Competitive** gives a **badge** per base mode (select, insert, update, delete, ddl; mixed has none) for
  reaching €1,000,000 in one attempt. Students who earn all five badges get +0.5 on the lab grade, after the
  teacher's oral check.

The student plays at home on their own computer, so nothing here can prevent AI use. The design closes the easy
cheats, records indicators for the teacher, and gives the teacher what they need for the oral check.

### 14.1 Routes and screens
- **`#/game`:** the select screen gets a segmented control, Study | Competitive. It is remembered in
  `game-side-v1`, and Study is the default.
  - Study shows the six tiles as now.
  - Competitive shows the five base tiles, each with its badge state: none, earned (not sent) or sent.
  - The first visit to Competitive asks for the name and an email that must end in `@cunef.edu` (exactly that
    domain, case-insensitive). Both are saved; a change of email starts a new identity.
- **`#/game/comp/<mode>`:** a competitive attempt. Before the clock starts, a dialog shows the rules (4 short
  lines) with "Start the attempt".
- **`#/game/profesor`:** teacher mode, behind a key (§14.6).
- `js/main.js` passes `rest` = `'comp/insert'` or `'profesor'`. An unknown mode redirects to `#/game`.

### 14.2 An attempt
- **The draw:** the ids come from `GameComp.seedFor(email, mode, attempt)`, a uint32 from SHA-256 of
  `email.toLowerCase()|mode|attempt`, through the same draw as study (`GameCore.draw` with the competitive bank).
  `attempt` starts at 1 and goes up each time a new attempt starts.
- **The clock:** 60 minutes (`GAME_COMP_CONFIG.limitMinutes`) from the moment the attempt starts. The deadline is
  saved, a visible countdown runs, and an attempt past its deadline ends as lost when it is next touched or
  loaded.
- **The editor:** paste and drop are blocked in `#wr-sql` (each attempt to paste is counted). Snippets, schema
  names and Insert template still insert text.
- **Lifelines:** the same three, once each per attempt, Review rescue included. Key clause shows the shape from
  `expect` (§14.3).
- **Reference solutions are never in the page:** not in the DOM, not on the end screen, not in the data.
- **The end:** a loss, walk-away or timeout gives no badge, with no solutions shown. The student can start a new
  attempt with a new draw. The million gives the diploma (§14.5).
- **The store:** `makeStore('game-comp-v1')` holds `{ v:1, who:{name, email}, attempts:{mode:n},
  runs:{mode:state}, badges:{mode:{code, date, sent:bool}} }`. Each state is as in §7, plus `mode`, `attempt`,
  `started`, `deadline`, `test:bool` and `tele:[per question {ms, runs, paste, blur, locks}]`. `blur` counts
  `visibilitychange` to hidden plus window blur while that question is current. The draft and the pending
  rescue use separate keys: `game-comp-draft-v1` and `game-comp-pending-v1`.

### 14.3 The competitive bank (generated, public)
- **Files:** `data/game-comp-<mode>.js` (select, insert, update, delete, ddl) define or append to the global
  `GAME_COMP_BANK = { setup: GAME_BANK.setup, schema, types, questions: [...] }`. They also work in Node.
  `tools/comp-build.mjs` writes them; never edit them by hand.
- **Ids:** `cs01a cs01b … cs15b` (select), `ci…` (insert), `cu…` (update), `cd…` (delete), `ck…` (ddl), 2 per
  rung.
- **A question:** `{ id, mode, level, ordered, checks (DML/DDL probes or null for the default), clause:[words],
  template, expect }`.
- **`expect` for select:**
  - `{ cols, rows, hash, hashSet }`, where `hash` is SHA-256 of the canonical normalized result, in order if
    `ordered`, otherwise rows sorted;
  - `hashSet` is always the sorted version, so Review can tell `order` from `values`;
  - normalization is as in `grade` (numbers rounded to 4 decimals, `'2025'` equals 2025).
- **`expect` for DML/DDL:** `{ probes: [ { hash, cols, rows } | { error: 'ORA-xxxxx' } ], tables: { name:
  {rows, hash} } }` for the default snapshots, used by Review.
- **Texts:** `data/{en,es}/game-comp-q-<mode>.js` merge `{ id: { prompt, clause, templateNote } }` into
  `GAME_TEXT.compQuestions`. There is no `explain`, because nothing is shown at the end.
- **Kept private:**
  - `tools/comp/private/<mode>.json`, git-ignored, holds `[ { id, solution, traps:[...], alts:[...] } ]`;
  - `tools/comp/solutions.enc`, committed, holds all five files encrypted with AES-256-GCM, key from scrypt
    of the `COMP_KEY` passphrase;
  - no public file may contain a solution's SQL text (checked).

### 14.4 `js/game-comp.js` (global `GameComp`, pure, also loaded in Node)

`hashResult`, `gradeHashed(got, expect, ordered)` and `gradeChecksHashed(gotChecks, expect)` return the same
shapes and reason codes as `GameCore.grade` and `gradeChecks`. `diagnoseHashed(...)` returns the same codes as
`GameCore.diagnose`. Also: `seedFor`, `drawComp(bank, seed, mode)`, `encodeDiploma(obj)` / `decodeDiploma(code)`
(async, deflate through CompressionStream or zlib, base64url), and `verifyDiploma(code, bank)`, async.
`verifyDiploma` returns `{ ok, test, reasons:[...], who, mode, attempt, started, ended, minutes, answers:[{id,
sql, ok, tele, flags:[...]}], oral: id }`:
- **Steps:** decode, check the checksum, recompute the ids from email, mode and attempt, re-grade every SQL
  against `expect`, check that the duration is within the limit, and flag the indicators.
- **Flags:**
  - `fast`: under 60 s on rung 6 or above;
  - `no-runs`: no exploration Run;
  - `pasted`: one or more blocked pastes;
  - `left-tab`: left the tab 3 times or more;
  - `no-table`: the answer reads no base table.
- **`oral`:** the suggested question for the oral check, the hardest answer with the most flags.
- **The diploma payload:** `{ v:1, test, mode, name, email, attempt, started, ended, ids, sql:[15], tele:[15],
  sum }`. `sum` is an obfuscated checksum (a deterrent only, since the site is public). The code must stay under
  4,000 characters, and the encoder trims nothing.

### 14.5 Diploma and sending
The diploma screen shows the name, email, mode, date, duration, attempt and the code, with **Send diploma** and
**Copy code**.

**Send diploma:**
1. If the prefilled URL `GAME_COMP_CONFIG.formUrl + '&' + prefillParam + '=' + encodeURIComponent(code)` is
   ≤ 2000 characters, open it.
2. Otherwise copy the code to the clipboard, open `formUrl`, and show "Paste the code into the form".
3. Then mark the badge as `sent`. Sending again stays possible.

`data/game-comp-config.js` holds `GAME_COMP_CONFIG = { formUrl, prefillParam, teacherKeyHash, emailDomain:
'cunef.edu', limitMinutes: 60 }`. Placeholders are allowed until the teacher fills them in; with no `formUrl`,
Send shows the code and says the form is not set up.

### 14.6 Teacher mode (`#/game/profesor`)
A key prompt compares the SHA-256 of the key with `teacherKeyHash` and remembers the result for the session.
`tools/comp-build.mjs --teacher-key <key>` writes the hash. The key is a deterrent only. The mode has two tabs:
- **Verify:** paste one code, or many (one per line, as copied from the Excel column), and see one card per code:
  valid or invalid with the reasons; the identity, mode, attempt, dates and duration; the 15 prompts with the
  student's SQL and right or wrong; the flags; and the suggested oral question highlighted.
- **Test:** a competitive attempt of any mode with "Jump to rung 15" and "Force right" buttons, then the diploma
  and Send through the real form. Anything played here has `test: true`, shows a TEST stamp, and
  `verifyDiploma` reports `test` and never `ok` for it.

### 14.7 Owners (round 6)

| Files | Agent |
|---|---|
| this section, `js/main.js` route, `index.html` tags, `tools/.gitignore` | orchestrator (done) |
| `js/game-comp.js`, `tools/comp-build.mjs`, `tools/check-game-comp.mjs`, `data/game-comp-config.js`, the first `data/game-comp-*.js` + `data/{en,es}/game-comp-q-*.js` with ONE sample per mode, `tools/comp/private/*.json` samples | K |
| `tools/comp/private/{select,insert}.json`, `data/{en,es}/game-comp-q-{select,insert}.js` (then run the build) | Q1 |
| `tools/comp/private/{update,delete}.json`, `data/{en,es}/game-comp-q-{update,delete}.js` | Q2 |
| `tools/comp/private/ddl.json`, `data/{en,es}/game-comp-q-ddl.js` | Q3 |
| `js/game.js`, `game.css`, `i18n/es-game.js`, `js/game-intro.js`, `game-intro.css`, `data/{en,es}/game-tour.js`, `tools/check-game-tour.mjs` | P |
| `tools/check-game.mjs`, `README.md` | T |

Only `tools/comp-build.mjs` writes the generated `data/game-comp-*.js`; Q1–Q3 run it after editing their
private files.

## 15. Competitive on Supabase (round 7): frozen contract, supersedes the static parts of §14

A security review showed that, on a static site, the competitive badge cannot be trusted:
- diplomas can be forged offline;
- the whole bank is public, so it can be solved in advance;
- the draw is predictable;
- the clock and telemetry can be edited;
- small answers can be brute-forced from the public hashes.

The competitive side therefore moves to the teacher's Supabase project `mbumfoxhmsrlytjwuypb` (free plan). Study
mode stays 100 % local and unchanged. The site stays static on GitHub Pages.

**Removed from the client:**
- the hash banks `data/game-comp-<mode>.js` (deleted);
- the public competitive texts, now in `tools/comp/private/texts/{en,es}-<mode>.js` (git-ignored);
- the diploma code, Microsoft Forms and verification by code.

**Kept:**
- `data/game-comp-config.js`, now holding `{ supabaseUrl, anonKey, limitMinutes: 60, dailyAttempts: 3 }` (the
  anon key is public by design);
- `js/game-comp.js`, as client helpers only. Whatever P no longer needs in it can be removed.
- `tools/comp/private/<mode>.json`, still the source of truth for solutions, traps and alts;
- the encrypted backup `tools/comp/solutions.enc`.

### 15.1 Identity
- **Login:** Supabase Auth with a one-time **6-digit email code**: `signInWithOtp({ email, options:{
  shouldCreateUser: true } })`, then `verifyOtp({ email, token, type: 'email' })`. A magic link is not used,
  because its redirect clashes with the `#/` router.
- **Domain:** only `@cunef.edu` (lower-cased) may sign up. A "before user created" auth hook (a Postgres
  function) enforces it; the client also checks first, for a quick message.
- **`profiles`:** `(user_id pk → auth.users, email, name, role 'student'|'teacher', created_at)`. A trigger
  creates the row on sign-up. The name is asked once after the first login and can be edited. The teacher role
  is set by hand: `update profiles set role='teacher' where email='alberto.turegano@cunef.edu';`, prepared in
  `supabase/seed-teacher.sql`.

### 15.2 Data (Postgres; RLS on, students read nothing directly)
- **`comp_questions`:**
  - `id`, `mode`, `level`;
  - the texts: `prompt_en`, `prompt_es`, `clause_en`, `clause_es`, `template`, `template_note_en`,
    `template_note_es`;
  - `ordered`, `checks jsonb`, `solution`, `traps jsonb`, `alts jsonb`;
  - `main_only bool`: grade only on the main dataset, for a question whose meaning depends on concrete values.
- **`comp_meta`** `(key, value jsonb)`: `hidden_setup` (the perturbed dataset) and `version`.
- **`attempts`:**
  - `id uuid`, `user_id`, `mode`, `ids text[]` (15), `level`;
  - `status` (playing, pending, won, lost, walked, expired), `prize`;
  - `used jsonb`, `shown jsonb`;
  - `started_at`, `deadline` (server time + 60 min), `finished_at`;
  - `test bool`: teacher test attempts, never a badge.
- **`answers`:** `(id, attempt_id, level, question_id, sql, ok, reason, shown_at, answered_at, tele jsonb,
  flags text[])`.
- **`badges`:** `(user_id, mode, attempt_id, earned_at)`, unique `(user_id, mode)`; inserted only by the server.
- **Daily limit:** at most 3 non-test attempts started per user and mode per calendar day in Europe/Madrid.
- **Access:** all writes and reads go through the Edge Function, using the service role internally. RLS denies
  everything to `anon` and `authenticated`, except reading one's own `profiles` row and updating its `name`.

### 15.3 Edge Function `comp` (Deno)
- **Calls:** `POST /functions/v1/comp` with the user's JWT and a body `{ op, ... }`.
- **Errors:** `{ error: { code, message } }`, where `code` is one of `auth`, `domain`, `limit`, `expired`,
  `not-found`, `forbidden`, `state`, `bad-request` or `server`.
- **Server time:** every response carries `serverTime`.

**Student operations**

| op | input | output |
|---|---|---|
| `status` | – | `{ who:{email, name, role}, limits:{minutes, daily}, modes:{ <m>:{ badge:{earned_at}\|null, startedToday:n, left:n, active:<view>\|null } } }` |
| `start` | `{ mode, test? }` | `{ attempt:<view> }`; `limit` when the day is used up; `test` only for teachers |
| `current` | `{ attemptId }` | `{ attempt:<view> }`, after expiring it if past the deadline |
| `submit` | `{ attemptId, sql, tele:{ms, runs, paste, blur} }` | `{ verdict, refusal?, attempt:<view> }` |
| `rescue` | `{ attemptId, use:bool }` | `{ attempt:<view> }` |
| `lifeline` | `{ attemptId, name:'clause'\|'template'\|'review', sql? }` | see below |
| `walk` | `{ attemptId }` | `{ attempt:<view> }` |
| `my-stats` | – | `{ modes:{ <m>:{ count, last, best, badge:{earned_at}\|null } }, attempts:[{ id, mode, status, rung, prize, badge, answered, right, used, started_at, finished_at }] }`: the student's own real attempts (no test ones), newest first, after expiring any past its deadline; counts only, never SQL or questions (My attempts, `#/game/historial`) |

- **`submit` verdicts:**
  - `refused`: `checkAnswer`, `unsafe` or `oracleCheck` refuses the statement before it runs. It costs nothing,
    and `refusal` carries `{ reason, expected?, detail? }`.
  - `pass`: the answer is right; climb one rung.
  - `pending`: wrong, with Review unused; the client offers the rescue.
  - `lost`: wrong, with Review already used.
  - `won`: right on rung 15; the server inserts the badge (unless `test`).
- **`lifeline`:**
  - `clause` returns `{ text:{en,es}, shape }`. For select, `shape` is the number of columns and rows; for DML
    and DDL it is the rows changed per table.
  - `template` returns `{ sql, note:{en,es} }`.
  - `review` needs the student's last SQL (`sql`). The server runs it and returns `{ diag:[codes as
    GameCore.diagnose] }`. With no `sql`, the lifeline is not spent.
- **The view** that every op returns is `{ id, mode, level, status, prize, used, deadline, test, question:{ id,
  mode, level, prompt:{en,es}, ordered } | null, answered:[{ level, ok }] }`. It never contains solutions,
  templates (unless that lifeline was used), future question ids or expected results.

**Teacher operations** (role `teacher` required)

| op | input | output |
|---|---|---|
| `t-list` | – | every student: email, name, badges per mode with dates, attempts (count, last, best rung) |
| `t-attempt` | `{ attemptId }` | the full attempt: each question's prompt, the student's SQL, `ok`, the reference solution, server timestamps (`shown_at` and `answered_at` for every question), `tele` and `flags` |
| `t-oral` | `{ userId }` | 2 random answered-right questions from that student's badge attempts |
| `t-csv` | – | CSV text with email, name, the five badge dates and `all_five` |
| `t-jump` / `t-force` | `{ attemptId, level }` / `{ attemptId }` | only on `test` attempts: jump to a rung, or force a right answer |

### 15.4 Grading on the server
`supabase/functions/_shared/engine.js` loads `npm:sql.js` and evaluates synced copies of `js/oracle-dialect.js`
and `js/game-core.js`; `tools/supabase-sync.mjs` copies them into `_shared/`, with a check that the copies
match. The steps:
1. **Refusals:** `GameCore.checkAnswer(sql, mode)`, `unsafe` and `oracleCheck` → `refused`.
2. **Grading on the main dataset (the public setup):** select uses `grade` against the reference; DML and DDL use
   `runChecks` with `gradeChecks`.
3. **The same on the hidden dataset** (`comp_meta.hidden_setup`), unless the question is `main_only`. Both must
   be right.
4. **Flags** (stored, for the teacher):
   - `fast`: rung 6 or above in under 60 s, measured by the server;
   - `no-runs`;
   - `pasted`;
   - `left-tab`;
   - `no-table`: the answer reads no base table;
   - `literal-list`: an IN list of three or more literal ids in WHERE;
   - `no-clause`: none of the question's clause keywords appears.

**Caching:** the built database images (main and hidden) are cached per warm instance.

**Prototype first:** before building the API, prove that the engine fits the Edge Function limits (CPU per
request, memory, cold start).

### 15.5 Hidden dataset and upload
- **`tools/comp-hidden.mjs`** derives the hidden setup from the public one: the same tables, ids, names, titles
  and key relationships, and different prices, stock, ratings, dates, quantities, totals, countries, genres and
  VIP levels.
  - The values are generated with a fixed private seed, stored in `tools/comp/private/hidden-seed.txt`.
  - The result is written to `tools/comp/private/hidden-setup.sql`.
- **`tools/comp-build.mjs`** is extended. For every competitive question:
  - the solution is deterministic on the hidden dataset too;
  - the traps are graded wrong and the alts graded right on both datasets;
  - if the hidden dataset makes a question meaningless (an empty result, or the prompt naming concrete values),
    the question is set to `main_only` or reworded, with a report.
- **`tools/comp-upload.mjs`**, with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment (never
  in a file): it upserts `comp_questions` from the private JSON and texts, and `comp_meta` from the hidden
  setup and version.

### 15.6 Client (P)
- **The library:** `@supabase/supabase-js` pinned (UMD from jsDelivr), loaded only when Competitive is opened.
- **Server not responding:** a clear message, "The competition server is not responding (it may be paused).
  Try again in a few minutes."
- **The flow:**
  - login (email, then code), then a name if missing;
  - tiles with the server badges and "n of 3 left today";
  - an attempt: the clock from `deadline` minus `serverTime`, the offset applied locally;
  - Run stays local on the public setup;
  - Lock in calls `submit`, and the rescue calls `rescue`;
  - lifelines call `lifeline`, and Review sends the last Run's SQL;
  - paste and drop are blocked and counted, and the telemetry goes with each submit;
  - the end shows no solutions; a won badge shows a printable certificate, for information only.
- **My attempts `#/game/historial`:** after sign-in, `my-stats` loaded on every visit: per mode the medal, the best
  rung as a strip of the 15 ladder cells (safe rungs outlined), the count and the last date; then every real attempt,
  newest first, in the teacher's row style (date, mode, result, rung, prize, right/answered, minutes). Reached from
  the student's strip on the Competitive screen and from the header's account menu.
- **The header's account menu (`js/account.js`):** reads the stored session (`game-comp-auth`) without loading the
  library, and `game-comp-status`, a summary of the last `status` the page received (email, name, role, the day,
  per mode the attempts left and the badge), written by `js/game.js` and removed at sign-out. The page fires
  `comp-auth-change` when the session or that summary changes. `#/game/entrar` opens the Competitive side (the
  sign-in) from the menu; Sign out there calls `GamePage.logout()`, which loads the library if needed so the server
  ends the session too.
- **Teacher area `#/game/profesor`:** login, then role `teacher`. It holds the list, the attempt detail, Pick 2
  at random, CSV, and the test attempt with jump and force.

### 15.7 Local development and tests
- **The local stack:** `supabase/config.toml` for `supabase start` (Docker). Inbucket catches the OTP emails.
- **The CLI:** the Supabase CLI is a dev dependency in `tools/package.json`.
- **Secrets:** never in the repo. `tools/check-no-secrets.mjs` fails on a service-role JWT, a `postgres://`
  URL with a password, or any private file tracked by git.

### 15.8 Owners (round 7)

| Files | Agent |
|---|---|
| this section, file moves, `index.html` | orchestrator (done) |
| `supabase/**`, `tools/supabase-sync.mjs`, `tools/comp-hidden.mjs`, `tools/comp-upload.mjs`, `tools/comp-build.mjs` (extend), `tools/check-comp-server.mjs` (Node tests of the engine and transitions), `tools/check-no-secrets.mjs`, `tools/package.json` (CLI) | S |
| `js/game.js`, `game.css`, `i18n/es-game.js`, `js/game-comp.js`, `data/game-comp-config.js`, `js/game-intro.js`, `data/{en,es}/game-tour.js` | P |
| `tools/check-game.mjs`, `README.md` (including the teacher's setup steps) | T |
