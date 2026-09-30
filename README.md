# Database normalization: interactive practice

A static site (HTML, CSS and JavaScript, no dependencies and no server) for practicing normalization from 2NF to 5NF.

- **Normalize**: the student decomposes a table by assigning attributes to new tables and marking their primary keys. Each exercise is solved **step by step**, one normal form at a time (2NF, 3NF, BCNF, 4NF, 5NF), and each step starts from the tables the student left in the previous one. The preview shows each table's data live, tells the student whether joining the tables produces rows that never existed, and the checker explains what fails.
- **Diagnose**: a quiz of tables in random order ("which normal form does it reach?") with an explanation for each answer. **Basic** level (1NF to 3NF, 10 tables) and **Advanced** level (BCNF to 5NF, 6 tables).

## Help for each transformation

At each step the student has three levels of help:

1. **What this normal form asks for**: a card with the rule and a "How to take this step" drop-down with the questions to ask in that specific transformation (for example, from 3NF to 4NF: look for independent facts about the same determinant and store each in its own table). It lives in `NF_INFO`, inside `exercises.js`.
2. **Exercise hints**, three per step, from vaguest to most concrete.
3. **Checker messages**, specific to each normal form: partial dependency (2NF), transitive dependency (3NF), determinant that is not a key (BCNF), multivalued dependency `X ↠ Y | Z` (4NF) and join dependency (5NF), with an "invented" example row when the decomposition loses information.

"Show solution" also has a "Load into my design" button so the student can move on to the next step when stuck.

## SQL for the design

When a step is passed, a **"SQL for this design"** drop-down appears with the `CREATE TABLE` statements for the student's tables: primary keys, foreign keys (a table references another when it contains that table's primary key) and referenced tables first. Types (`INTEGER`, `DECIMAL`, `DATE`, `VARCHAR`) are inferred from the sample rows, so the script itself says they must be reviewed. It includes a "Copy SQL" button. It is standard SQL; it was verified by loading it into SQLite with foreign keys enabled and inserting the sample rows.

## Saved progress

The browser stores (in `localStorage`, on that device only):

- solved exercises and the best score of each quiz (key `normalization-en-v1`);
- the **intermediate state** of each exercise: current step, tables, open hints and completed steps (key `normalization-en-work-v1`). When the page is reopened the student continues where they left off.

Safeguards:

- **Per-exercise version.** Every saved state carries a signature of the exercise's attributes, dependencies, row count and steps. If you edit `exercises.js` and any of them changes, the old state is discarded instead of breaking the page.
- **Nothing is taken on trust.** Steps saved as "done" are checked again on load; a tampered or corrupt state is ignored.
- **"Clear my progress" button** (next to the exercise counter), with confirmation. Useful on shared classroom computers.
- If the browser blocks `localStorage` (private browsing, institutional policies), the tool works the same but saves nothing.

Storage is per browser and device, and all pages under `user.github.io` share an origin: the keys carry the `normalization-en-` prefix.

## Publish on GitHub Pages

1. Create a repository and upload `index.html`, `styles.css`, `app.js` and `exercises.js` to its root.
2. In **Settings → Pages**, choose **Deploy from a branch**, branch `main` and folder `/ (root)`.
3. In a minute it will be at `https://<user>.github.io/<repository>/`.

To try it locally, just open `index.html` in the browser.

Direct links, handy for sharing in class: `.../#/normalize/3` (exercise 3), `.../#/diagnose` and `.../#/diagnose/advanced`.

## Adding or editing exercises

All the content is in `exercises.js`; there is no need to touch `app.js`. Copy an object from `EXERCISES` and change:

| Field    | Meaning                                                                                          |
|----------|--------------------------------------------------------------------------------------------------|
| `title`  | Exercise title                                                                                   |
| `short`  | Short title for the list                                                                         |
| `story`  | Statement                                                                                        |
| `attrs`  | Columns of the original table (no spaces)                                                        |
| `pk`     | Primary key of the original table                                                                |
| `fds`    | Functional dependencies: `'order_id, product_id -> quantity'` (`[]` if none)                     |
| `mvds`   | (optional) Multivalued dependencies: `'employee ->> skill'`. Whatever is in neither side forms the other (`X ↠ Y \| Z`) |
| `jds`    | (optional) Join dependencies: `'supplier, part \| part, project \| supplier, project'`. The sides must cover every attribute |
| `rows`   | Sample rows, in the order of `attrs`. They must satisfy **all** the declared dependencies        |
| `steps`  | List of steps, in increasing normal-form order (see below)                                       |

`mvds` and `jds` also accept `{ def: '...', show: 'text to display' }` to control how the dependency looks (useful when the sides of a join are long).

Each element of `steps`:

| Field       | Meaning                                                                                        |
|-------------|------------------------------------------------------------------------------------------------|
| `nf`        | `'2NF'`, `'3NF'`, `'BCNF'`, `'4NF'` or `'5NF'`                                                |
| `solution`  | A valid solution for that step: `[{ name, attrs, pk }]`                                        |
| `hints`     | Hints for the step, from vaguest to most concrete                                              |
| `insight`   | Key idea shown when the step is solved                                                         |
| `allowLoss` | (optional) `true` if losing a functional dependency is unavoidable (typical of BCNF). It warns, but does not fail |
| `vacuous`   | (optional) `true` if the step does not require splitting anything (a "trap" exercise)         |

A minimal two-step example: `full-orders` (2NF and 3NF). A complete 1NF-to-5NF exercise: `suppliers-1nf-5nf`.

The quiz questions are in `QUESTIONS`. Basic: `answer` 0 = fails 1NF, 1 = meets 1NF but not 2NF, 2 = meets 2NF but not 3NF, 3 = meets 3NF. Advanced (`adv: true`): 0 = 3NF but not BCNF, 1 = BCNF but not 4NF, 2 = 4NF but not 5NF, 3 = 5NF. In the advanced ones, `mvds` and `jds` are not displayed: they let the console verify the answer.

When the page opens, the browser console (F12) warns if:

- the rows violate a declared dependency (functional, multivalued or join);
- a step's solution does not pass the check;
- a step requires no change (and is not marked `vacuous`);
- a question's answer does not match what the engine computes.

## What it checks

The checker does not compare against the solution: it validates any decomposition, so it accepts correct alternatives. For every attempt it checks:

1. Every attribute of the original table appears in some table.
2. Every table has a valid primary key (it identifies the row and is minimal).
3. Every table meets the step's normal form, including the previous ones (computed from the declared dependencies).
4. The join is lossless: the tableau algorithm (*chase*) with functional, multivalued and join dependencies. If it fails, it shows a row that would appear in excess when joining the data.
5. Functional dependencies are preserved (except in steps with `allowLoss`).

If the attempt is correct but there are redundant tables (contained in another, or mergeable without breaking the normal form), it flags it as "correct, though it could be better".

### Engine limits (important)

- **Multivalued and join dependencies are declared, not discovered.** Sample data cannot prove them: a rule that holds in the current rows may be a coincidence. That is why the statement must say the rule always holds, and 5NF is only correct under that condition.
- The 4NF and 5NF checks work on the declared dependencies and their projections onto each table. They do not compute every embedded dependency that could be implied, so a new exercise should be tested with the console open and with some incorrect decompositions.
- Every exercise starts from a table in 1NF: there is no 1NF step. 1NF is practiced in the quiz.
- BCNF is an extra rung between 3NF and 4NF (4NF presupposes it). It sometimes requires losing a functional dependency; the step flags this with `allowLoss`.

## Notes

- Everything saved (see "Saved progress") stays in the student's browser; it is not sent anywhere.
- There are no third-party requests: it uses system fonts, no CDN and no analytics.
