# Databases practice

A static site (HTML, CSS and JavaScript, no build step and no server; the only external code is SQLite for the runnable SQL examples, loaded from cdnjs on the SQL tab) for practising the databases course. Students choose a course at the top of the page:

- **Relational databases**, in sections in teaching order (Theory comes first):
  1. **ER concepts**: concept cards (entities, attributes, keys, relationships, correspondence, look-across cardinality, weak entities, relationship constraints, hierarchies, categories, aggregation, the time dimension, modelling steps), each with a small Chen diagram. They are followed by a **Test yourself** quiz of 33 multiple-choice, true/false and fill-in questions, which can be filtered by topic.
  2. **ER → Logical**: the student reads an ER model (diagram plus a text version) and builds the relational tables. For each table they give its name and columns, mark the primary key, pick a foreign key's target, and mark NOT NULL on the foreign keys. The checker explains every mistake in terms of the course's transformation rules. There are 21 exercises: 9 at level 1 (one rule at a time) and 12 at level 2 (complete models from the lab sessions).
  3. **Normalization**: the existing normalization practice from 2NF to 5NF, in two modes, Normalize and Diagnose (described below).
  4. **SQL**: the sub-languages (DDL, DML, DCL, TCL), constraints, indexes, clustering, partitioning and efficiency, in 20 cards. Most examples run in the browser on SQLite (sql.js) and show results, timings and query plans; every snippet can be downloaded as a `.sql` file. A 28-question quiz and a free **SQL sandbox** on the course's sample tables follow.
- **Progress** (the button next to the settings): cards read, exercises solved and best quiz scores of every section, with a Continue link to the next unfinished step.
- **Non-relational databases**: for now an overview of the four NoSQL families. The route (`#/nosql`) is ready for practice once the course material exists.

The content comes from the G241 course material (Topic 2 and 3 translations, Quiz 2, the lab sessions and the ER model contract).

## Navigation and brand

- **App bar:** full window width: the CUNEF logo, the sections of the current course as tabs, and a gear button that opens **Settings**: language (Español / English), course (relational / non-relational) and theme (Light / Dark / System, the default). The theme is saved in `localStorage['theme']` and applied before the first paint.
- **ER concepts:** a navigation rail on the left edge, in the style of a project portal. Hubs (Basics, Relationships, Weak entities and constraints, Extended ER model, Building the model, Test yourself) each have an icon in Chen notation. The active hub lists its concepts or quiz topics, with best scores; the other hubs open a flyout on hover or keyboard focus. **Collapse**, at the bottom, reduces the rail to icons, and the choice is remembered. Each concept has its own page with Previous / Next links. On narrow screens a dropdown replaces the rail. The hubs are defined in `GROUPS` in `js/er.js`.
- **ER → Logical:** Level 1 / Level 2 tabs, then numbered tabs for the exercises of that level, plus ‹ › arrows. A dot marks a solved exercise.
- **Normalization:** numbered tabs in the same style.

The styling follows the CUNEF Universidad brand manual (the `cunef-brand-v1` kit):
- **Colours:** blue `#1a1f6c` for headings and controls, light beige `#f0ece8` for the background and beige `#d6d1c4` for rules.
- **Orange** `#ff5700` is used only for the logo and non-text accents, because it does not reach text contrast on light backgrounds.
- **Font:** Arial, the brand's system typeface.
- **Table colours** are shades of the brand hues that keep 4.5:1 contrast with white text.

## Languages

The whole site is available in Spanish and English: interface, course data and diagrams.

**Choosing the language**
- **First visit:** the site follows the browser, Spanish when it is set to Spanish and English otherwise.
- **Switching:** Settings (the gear in the app bar) changes the language. The page reloads on the same route, and the choice is remembered on that device.
- **Links:** `?lang=es` or `?lang=en` in a link forces the language, for example `index.html?lang=es#/relational/logical/4`.

**How it is built**
- **Interface text** goes through `t('English text', { params })`. The English text is the key, and the Spanish is in `i18n/es-*.js`. When a Spanish key is missing, the console shows `[i18n] missing es: …` and the English text is used.
- **Normal forms** are shown with `nfLabel()`: 2FN, 3FN, FNBC, 4FN and 5FN in Spanish. Internally they stay `2NF`, `BCNF`, and so on.
- **Course data** lives in `data/en/` and `data/es/`, with the same ids, order and structure. Only the text and the names differ: tables, attributes, entities and diagram labels.
- **Diagrams** are drawn from the data, so a translated label redraws the diagram.
- **Adding or changing an exercise:** edit both languages. The ER → logical self-test runs in each language: when the page opens, the console warns if the derived solution disagrees with `expect`.
- **Progress** (solved exercises and best quiz scores) is shared between languages, because ids are the same. The tables a student builds are saved per language, because their names differ.
- **Terminology** follows the course's Spanish originals and their glossaries (`content/translations/tema2-mcd` and `tema3-mld` in the course repository): clave ajena, entidad débil, correspondencia, lectura cruzada for look-across, dependencia de reunión, and so on.

## Files

```
index.html              page shell: app bar (CUNEF logo, section tabs, ES | EN switch, course switch), #view
assets/cunef-logo.png   official CUNEF Universidad logo (orange positive, transparent margin trimmed)
styles.css              all styles
js/i18n.js              language (LANG), t() for interface text, nfLabel(), setLang(); loaded first
i18n/es-app.js          Spanish interface text: shell, ER concepts, ER → Logical, NoSQL, checker messages
i18n/es-normalization.js  Spanish interface text: normalization
js/core.js              binds the course data of the current language; shared helpers (escaping, storage, focus, check lists)
js/er-diagram.js        ER diagrams as inline SVG (Chen notation)
js/er.js                ER concepts and quiz
js/logical-engine.js    ER → logical rules and checker (no DOM; also runs in Node)
js/concept-section.js   shared rail + concept cards engine (Theory, ER concepts, ER → Logical, Normalization), optional quiz and practice slot
js/logical.js           ER → logical exercises (drawn inside the rules section)
js/logical-section.js   ER → logical rule cards; their tables are derived by js/logical-engine.js
js/normalization.js     normalization engine, exercises and diagnose quiz (drawn inside the theory section)
js/normalization-section.js  normalization theory cards and the course video
js/sql.js               SQL concept cards, quiz and sandbox
js/sql-runner.js        runnable SQL examples: loads sql.js (SQLite in WebAssembly) on first use, runs, shows plans, downloads .sql
js/progress.js          progress page (#/progress) and the app-bar ring
js/nosql.js             non-relational overview
js/main.js              router and start-up
data/en/, data/es/      course data, one folder per language, same files and shape:
  er-concepts.js        ER_CONCEPTS
  er-quiz.js            ER_QUIZ, ER_QUIZ_TOPICS
  logical.js            LOGICAL_EXERCISES
  logical-rules.js      LOGICAL_RULES (transformation rule cards, each with a small ER model)
  normalization.js      NF_INFO, EXERCISES, ADV_OPTIONS, QUESTIONS
  normalization-theory.js  NORM_THEORY (normalization theory cards)
  sql.js                SQL_CONCEPTS, SQL_QUIZ, SQL_QUIZ_TOPICS, SQL_SANDBOX (runnable examples use the same SQL in both languages)
assets/video/           rendered course video (MP4 and poster, no subtitles); built from video/ with npm run render:site
.claude/skills/cunef-brand/  CUNEF brand skill (manual, logo, Word and PowerPoint templates)
```

Direct links, handy for sharing in class:

- `#/relational/er` (first concept), `#/relational/er/<conceptId>` (one concept, e.g. `#/relational/er/cardinality`) and `#/relational/er/quiz/weak` (quiz filtered to one topic)
- `#/relational/logical` (the transformation rules), `#/relational/logical/<ruleId>` (e.g. `#/relational/logical/weak`) and `#/relational/logical/practice/17` (exercise 17)
- `#/relational/normalization` (theory), `#/relational/normalization/video`, `#/relational/normalization/practice/3`, `#/relational/normalization/diagnose` and `#/relational/normalization/diagnose/advanced`
- `#/relational/sql`, `#/relational/sql/<cardId>` (e.g. `#/relational/sql/composite-index`), `#/relational/sql/quiz/indexes` and `#/relational/sql/practice` (the sandbox)
- `#/progress`
- `#/nosql`

Old links (`#/normalize/3`, `#/diagnose`, `#/diagnose/advanced`, `#/relational/logical/17`, `#/relational/normalization/3`) are redirected to the new ones.

## Publish on GitHub Pages

1. Upload `index.html`, `styles.css`, `theory.css` and the `assets/`, `js/`, `data/` and `i18n/` folders to the root of the repository.
2. In **Settings → Pages**, choose **Deploy from a branch**, branch `main` and folder `/ (root)`.
3. In a minute it will be at `https://<user>.github.io/<repository>/`.

To try it locally, just open `index.html` in the browser.

**The video** is a normal committed file (`assets/video/normalization.mp4`, about 18 MB), not Git LFS: GitHub Pages does not serve LFS files from a branch deploy, and git refuses files over 100 MB. Pages serves it as `video/mp4` with byte ranges, so the player can seek. To rebuild it after changing the Remotion project: `cd video && npm i && npm run render:site` (720p H.264 and the poster frame). The video has no subtitles of any kind: the narration is in English and the diagrams carry the on-screen text.

## Saved progress

Everything is stored in `localStorage`, on that device only, and never sent anywhere. If storage is blocked, the site works the same but saves nothing.

| Key | Content |
|---|---|
| `er-quiz-v1` | Best ER quiz score for each topic |
| `er-logical-v1` | Solved ER → logical exercises |
| `er-logical-work-v1` (`-es` in Spanish) | The tables of each ER → logical exercise. They are discarded when the exercise's ER model changes |
| `normalization-en-v1`, `normalization-en-work-v1` (`-es` in Spanish) | Normalization progress and work (the `en` in the name is historical; progress is shared by both languages) |
| `er-ui-v1` | Whether the ER concepts rail is collapsed to icons |
| `lang` | The chosen language, `es` or `en` |
| `theme` | `light`, `dark` or `system` |
| `theory-quiz-v1` | Best Theory quiz score for each topic |
| `sql-quiz-v1` | Best SQL quiz score for each topic |
| `read-v1` | The concept cards opened in each section (for the progress page) |
| `sql-sandbox-v1` | The text of the SQL sandbox |

The progress page's **Clear all progress** removes every key above except `lang`, `theme` and `er-ui-v1`.

## ER concepts and quiz

**Concept cards** (`ER_CONCEPTS`): `{ id, title, topic, summary, body: [...], points?, example?, mistake?, diagram?, caption? }`. `topic` is a key of `ER_QUIZ_TOPICS`; the card links to the quiz filtered by that topic.

**Quiz questions** (`ER_QUIZ`):

- `{ type: 'mc', topic, q, choices, answer, why }`, where `answer` is the 0-based index of the correct choice;
- `{ type: 'tf', topic, q, answer: true | false, why }`;
- `{ type: 'fib', topic, q, accept: [...], why }`. `q` contains a `____` blank, and the student's answer is compared against `accept`, ignoring case, accents and punctuation.

Any question can carry a `diagram`. Text fields can use `**bold**` and `` `code` ``.

**Diagram spec** (used by cards and questions, drawn by `ErDiagram.chenSvg`):

```js
{ w: 560, h: 240,
  nodes: [{ id, cx, cy, type: 'entity' | 'relationship' | 'attribute' | 'isa', label,
            weak?, identifying?, kind?: 'key' | 'partial' | 'multivalued' | 'derived' }],
  edges: [{ from, to, card?: '(1,1)', total?, dashed? }] }
```

`cx` and `cy` are node centres, normalized from 0 to 1. The `card` label is drawn next to the `from` end and follows the course's look-across convention.

## ER → Logical exercises

Each element of `LOGICAL_EXERCISES` describes only the ER model. `js/logical-engine.js` derives the expected tables from it by applying the course rules:

1. Every entity becomes a table.
2. Every attribute becomes a column. Composite attributes are split into their parts; derived attributes are left out.
3. The identifier becomes the primary key.
4. An M:N relationship becomes a table whose PK combines both keys.
5. In 1:N, the key of the 1 side goes to the N side.
6. In 1:1, the key of either side passes to the other.
7. In (0,1)/(1,1), the key passes to the optional side.

It also handles:

- weak entities: PK = the owner's key + the partial key;
- multivalued attributes: a table of their own;
- unary relationships: a self FK, or a junction table for M:N;
- ternary relationships;
- hierarchies, with any of the three strategies;
- NOT NULL, taken from the `min` at the opposite end.

```js
{ id, level: 1 | 2, title, short, source, statement, focus: ['1:N', ...],
  entities: [{ id, at: [col, row], weak?, attrs: [{ name, kind?: 'key' | 'partial' | 'multivalued' | 'derived' | 'composite', parts? }] }],
  relationships: [{ id, at?, identifying?, attrs?, ends: [{ entity, card: '(0,N)', role? }] }],
  hierarchies?: [{ id, super, subs: [...], disjoint, total, discriminator?, at? }],
  prefer?: { oneToOne: { Rel: 'EntityWithTheFK' }, hierarchy: { Id: 'super+subs' | 'single' | 'subs' } },
  hints: [...], note?,
  expect: [{ name, cols: [{ n, pk?, fk?: 'Table.col', nn? }] }] }   // the course's reference solution
```

- **Cardinalities are look-across:** the `card` of an end is the number of occurrences of that end's entity for one occurrence of the other entity.
- **Diagram layout:** `at` places things on a grid. Entities usually go on even cells and relationship diamonds between them; a relationship's position defaults to the midpoint of its entities.
- **Accepted solutions:** when the course accepts several solutions, the checker accepts all of them and adds a note naming the course's preferred one. This covers the side of a 1:1 foreign key, the three hierarchy strategies, and the key of a ternary that has a (1,1) end.
- **Table matching:** tables are matched by name and content, so junction tables can be named freely. Foreign keys are matched by the table and column they reference, not by their name.
- **Self-test:** when the page opens, the console warns if the derived solution disagrees with `expect`. Check it after adding or editing an exercise.

What the checker reports, each with the rule and the ER element behind it:

- missing or extra tables, including a table for a 1:N relationship that should have been a foreign key;
- missing columns, including composite attributes that were not split;
- derived attributes that were kept (as a note) and multivalued attributes kept as a column;
- wrong primary keys, for example a weak entity without the owner's key;
- missing foreign keys, or foreign keys on the wrong side;
- foreign keys that do not point to a primary key;
- the wrong NULL / NOT NULL on a foreign key.

## Normalization

The student decomposes a table by assigning attributes to new tables and marking their primary keys.

- **Normalize**: each exercise is solved **step by step**, one normal form at a time (2NF, 3NF, BCNF, 4NF, 5NF), and each step starts from the tables the student left in the previous one. The preview shows each table's data live, tells the student whether joining the tables produces rows that never existed, and the checker explains what fails.
- **Diagnose**: a quiz of tables in random order ("which normal form does it reach?") with an explanation for each answer. It has a **Basic** level (1NF to 3NF, 10 tables) and an **Advanced** level (BCNF to 5NF, 6 tables).

### Help for each transformation

At each step the student has three levels of help:

1. **What this normal form asks for**: a card with the rule and a "How to take this step" drop-down with the questions to ask in that specific transformation (for example, from 3NF to 4NF: look for independent facts about the same determinant and store each in its own table). It lives in `NF_INFO`, inside `data/normalization.js`.
2. **Exercise hints**, three per step, from vaguest to most concrete.
3. **Checker messages**, specific to each normal form: partial dependency (2NF), transitive dependency (3NF), determinant that is not a key (BCNF), multivalued dependency `X ↠ Y | Z` (4NF) and join dependency (5NF), with an "invented" example row when the decomposition loses information.

"Show solution" also has a "Load into my design" button so the student can move on to the next step when stuck.

### SQL for the design

When a step is passed, a **"SQL for this design"** drop-down appears with the `CREATE TABLE` statements for the student's tables: primary keys, foreign keys (a table references another when it contains that table's primary key) and referenced tables first. Types (`INTEGER`, `DECIMAL`, `DATE`, `VARCHAR`) are inferred from the sample rows, so the script itself says they must be reviewed. It includes a "Copy SQL" button. It is standard SQL; it was verified by loading it into SQLite with foreign keys enabled and inserting the sample rows.

### Adding or editing exercises

All the content is in `data/normalization.js`; there is no need to touch `js/normalization.js`. Copy an object from `EXERCISES` and change:

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

### What it checks

The checker does not compare against the solution: it validates any decomposition, so it accepts correct alternatives. For every attempt it checks:

1. Every attribute of the original table appears in some table.
2. Every table has a valid primary key (it identifies the row and is minimal).
3. Every table meets the step's normal form, including the previous ones (computed from the declared dependencies).
4. The join is lossless: the tableau algorithm (*chase*) with functional, multivalued and join dependencies. If it fails, it shows a row that would appear in excess when joining the data.
5. Functional dependencies are preserved (except in steps with `allowLoss`).

If the attempt is correct but there are redundant tables (contained in another, or mergeable without breaking the normal form), it flags it as "correct, though it could be better".

#### Engine limits (important)

- **Multivalued and join dependencies are declared, not discovered.** Sample data cannot prove them: a rule that holds in the current rows may be a coincidence. That is why the statement must say the rule always holds, and 5NF is only correct under that condition.
- The 4NF and 5NF checks work on the declared dependencies and their projections onto each table. They do not compute every embedded dependency that could be implied, so a new exercise should be tested with the console open and with some incorrect decompositions.
- Every exercise starts from a table in 1NF: there is no 1NF step. 1NF is practiced in the quiz.
- BCNF is an extra rung between 3NF and 4NF (4NF presupposes it). It sometimes requires losing a functional dependency; the step flags this with `allowLoss`.

## Notes

- Everything saved (see "Saved progress") stays in the student's browser; it is not sent anywhere.
- There are no third-party requests: it uses system fonts, no CDN and no analytics.
