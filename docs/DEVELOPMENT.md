# Developer guide

Everything about how the site is built, its data formats, checks and deployment. For a quick overview, see the [README](../README.md).

A static site (HTML, CSS and JavaScript, no build step and no server; the only external code is SQLite for the runnable SQL examples, loaded from cdnjs on the SQL tab) for practising the databases course. Students choose a course at the top of the page:

- **Relational databases**, in sections in teaching order (Theory comes first):
  1. **ER concepts**: concept cards (entities, attributes, keys, relationships, correspondence, look-across cardinality, weak entities, relationship constraints, hierarchies, categories, aggregation, the time dimension, modelling steps), each with a small Chen diagram. They are followed by a **Test yourself** quiz of 33 multiple-choice, true/false and fill-in questions, which can be filtered by topic, and by a **Practice** hub of 15 modelling exercises from the lab sessions: the student builds the ER / EER model of a statement and the checker compares it with the official solution (see [ER practice](#er-practice)).
  2. **ER → Logical**: the student reads an ER model (diagram plus a text version) and builds the relational tables. For each table they give its name and columns, mark the primary key, pick a foreign key's target, and mark NOT NULL on the foreign keys. The checker explains every mistake in terms of the course's transformation rules. There are 21 exercises: 9 at level 1 (one rule at a time) and 12 at level 2 (complete models from the lab sessions).
  3. **Normalization**: the existing normalization practice from 2NF to 5NF, in two modes, Normalize and Diagnose (described below).
  4. **SQL**, organised by sub-language in 60 cards:
     - **Getting started**: the sub-languages of SQL with DDL, DML, DCL and TCL compared (what each acts on, implicit commit, DELETE vs TRUNCATE vs DROP), then Oracle and FreeSQL.
     - **DDL** (core): CREATE TABLE, Oracle data types, identity columns, ALTER / DROP / TRUNCATE, the data dictionary with COMMENT and RENAME, constraints (keys, foreign keys, CHECK / DEFAULT, managing them with ALTER TABLE), views, sequences and synonyms.
     - **DML** (core): querying (SELECT, ORDER BY, WHERE, NULL, joins), aggregation, subqueries, CTEs and set operators, functions, and changing data (INSERT, UPDATE, DELETE).
     - **Advanced**: DCL (users, system and object privileges, roles), TCL (transactions, savepoints, implicit commit and autocommit), and PL/SQL (blocks, control flow, cursors, exceptions, procedures and functions, triggers, packages).
     - **Performance**: indexes, clustering, partitioning and efficiency.

     Most examples run in the browser on SQLite (sql.js) and show results, timings and query plans; PL/SQL, privileges and other server-only features come as self-contained scripts to run on FreeSQL. Every snippet can be downloaded as a `.sql` file. A 133-question quiz (with one topic per sub-language: DDL, DML, DCL, TCL), 22 auto-checked challenges in 4 levels and a free **SQL sandbox** on the course's sample tables follow.
- **Summary PDFs**: each section's rail has a **Summary (PDF)** download (in the current language), with the key points, examples, diagrams and tables of every card.
- **Progress** (in the account menu, the round button at the right of the app bar): cards read, exercises solved and best quiz scores of every section, with a Continue link to the next unfinished step.
- **Non-relational databases**: for now an overview of the four NoSQL families. The route (`#/nosql`) is ready for practice once the course material exists.

The content comes from the G241 course material (Topic 2 and 3 translations, Quiz 2, the lab sessions and the ER model contract).

## Navigation and brand

- **App bar:** full window width: the CUNEF logo, the sections of the current course as tabs, the search box, **Ask Claude** and one round **account** button (`js/account.js`). The button reads two ways: its centre is an outline person when signed out of the competition, or your initials when signed in; its border carries the overall course progress as an arc. It opens one menu: the account (Sign in, or your name, today's competitive attempts and badges, **My attempts** and Sign out), the progress (with a link to `#/progress`) and the **Settings**: language (Español / English), course (relational / non-relational) and theme (Light / Dark / System, the default). The theme is saved in `localStorage['theme']` and applied before the first paint.
- **ER concepts:** a navigation rail on the left edge, in the style of a project portal. Hubs (Basics, Relationships, Weak entities and constraints, Extended ER model, Building the model, Test yourself) each have an icon in Chen notation. The active hub lists its concepts; the other hubs open a flyout on hover or keyboard focus (→ opens it, ← or Escape closes it, ↑ / ↓ move through the rail), placed next to its hub and kept inside the window. The rail is as tall as the window and scrolls on its own. Each concept read gets a ✓, and each hub and closed part shows how many of its concepts are read. **Test yourself** is one row; the quiz page has a topic picker that shows the best score of each topic. In SQL the rail shows its five parts as **tabs** that follow the sub-languages: Start, DDL (core), DML (core), Advanced (DCL · TCL) and Perf. (`parts` in `js/sql.js`). Under the tabs, every group of the chosen part is a heading (a link to the group's page) over all its concepts: two levels and no flyouts. The tab of the concept being read is chosen; on the overview, quiz and practice pages the rail shows the last tab chosen by hand. The tab row stays at the top while the rail scrolls; ← / → / Home / End move between tabs and ↓ enters the panel. Collapsed to icons, the SQL rail shows one icon per part with its short name under it (Start, DDL, DML, Adv., Perf.; `icon` and `short` in `parts`), and each opens a flyout with the part's groups and all their concepts, as in its tab. Flyouts never start above the rail, so the app bar cannot cover them; a long one scrolls inside. On the overview the groups are listed under the same parts, with a **Core** chip on DDL and DML. Sections without parts keep the hubs and flyouts described above. The section menu in the top bar lists only the section's destinations: Overview, its practice pages and the quiz. **Collapse**, at the bottom, reduces the rail to icons, and the choice is remembered. Each section opens on an **overview**: its videos, then every group with its concepts and their one-sentence definitions. Each group has its own page: the group's videos first (a card that plays in place), then its concepts as an accordion (one open at a time, or **Show all concepts**), with Previous / Next between groups. Runnable SQL examples start closed in a **Try it** box. On narrow screens a dropdown replaces the rail: it stays under the app bar while the page scrolls and lists the concepts of the group being read. The hubs are defined in `GROUPS` in `js/er.js`.
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
- **Switching:** Settings (in the account menu, the round button at the right of the app bar) changes the language. The page reloads on the same route, and the choice is remembered on that device.
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
index.html              page shell: app bar (CUNEF logo, section tabs, search, Ask Claude, the account menu with the settings), #view
assets/cunef-logo.png   official CUNEF Universidad logo (orange positive, transparent margin trimmed)
styles.css              all styles
game.css                Query for a Million: the arcade-cabinet styles of #/game (always light, game-first layout, the mode select screen), contract in docs/game-visual.md
game-intro.css          Query for a Million: the onboarding tour (veil, spotlight, screens)
js/i18n.js              language (LANG), t() for interface text, nfLabel(), setLang(); loaded first
i18n/es-app.js          Spanish interface text: shell, ER concepts, ER → Logical, NoSQL, checker messages
i18n/es-normalization.js  Spanish interface text: normalization
i18n/es-game.js         Spanish interface text: Query for a Million (select screen, page, dialogs, Run diffs, Review diagnoses, end screen)
js/core.js              binds the course data of the current language; shared helpers (escaping, storage, focus, check lists)
js/er-diagram.js        ER diagrams as inline SVG (Chen notation)
js/er.js                ER concepts and quiz
js/er-practice.js       ER practice: statement, model builder, preview, feedback and official solution (drawn inside the ER section)
js/er-drawio.js         ER models to and from diagrams.net (.drawio): export, import, starter file
js/er-practice-engine.js  ER practice checker: compares a student's model with the official one (no DOM; also runs in Node)
js/logical-engine.js    ER → logical rules and checker (no DOM; also runs in Node)
js/concept-section.js   shared rail + overview + group pages engine (Theory, ER concepts, ER → Logical, Normalization, SQL), optional quiz and practice slot
js/video-html.js        course video markup: the briefing card on a group page, the list on an overview
js/video-player.js      course video playback: play in place, chapters, resume point, watched at 90 %
js/logical.js           ER → logical exercises (drawn inside the rules section)
js/logical-section.js   ER → logical rule cards; their tables are derived by js/logical-engine.js
js/normalization.js     normalization engine, exercises and diagnose quiz (drawn inside the theory section)
js/normalization-section.js  normalization theory cards and the two course videos
js/sql.js               SQL concept cards, quiz and sandbox
js/sql-runner.js        runnable SQL examples: loads sql.js (SQLite in WebAssembly) on first use, runs, shows plans, downloads .sql
js/home.js              landing page (#/): resume, section cards, shortcuts, and the game's arcade banner (Play now, or Continue playing when a run is in progress)
js/game-core.js         Query for a Million: the rules (ladder, safe rungs, the six modes, seeded draw and the Mixed draw, run state, lifelines, Lock in checks per mode, grading of queries and of DML/DDL probes, Review diagnoses, the v1 migration; no DOM, also runs in Node)
js/game-intro.js        Query for a Million: the onboarding tour (attract screen, then five screens on the select screen or six in a run: the game, six ways to play, the loop, the spotlight, lifelines, a live example)
js/game.js              Query for a Million (#/game): the mode select screen (Study | Competitive), the runs, the competitive attempts and teacher mode (talking to the competition server) (question card and kind chip, lifelines, SQL console with DML diffs and DDL columns, schema, prize ladder, dialogs, end screen, saves per mode); contract in docs/game-quiz.md
js/progress.js          progress page (#/progress) and the overall percentage (drawn as the account button's ring)
js/account.js           the app bar's account button and menu: competition sign-in state, today's attempts, progress, settings
js/nosql.js             non-relational overview
js/main.js              router and start-up
data/en/, data/es/      course data, one folder per language, same files and shape:
  er-concepts.js        ER_CONCEPTS
  er-quiz.js            ER_QUIZ, ER_QUIZ_TOPICS
  er-practice.js        ER_PRACTICE (modelling exercises; most share their model with LOGICAL_EXERCISES)
  logical.js            LOGICAL_EXERCISES
  logical-rules.js      LOGICAL_RULES (transformation rule cards, each with a small ER model)
  normalization.js      NF_INFO, EXERCISES, ADV_OPTIONS, QUESTIONS
  normalization-theory.js  NORM_THEORY (normalization theory cards)
  sql.js                SQL_CONCEPTS, SQL_QUIZ, SQL_QUIZ_TOPICS, SQL_SANDBOX (runnable examples use the same SQL in both languages)
  game.js               GAME_TEXT (Query for a Million: title, SQL-Bot's lines, bands, the six modes, lifelines, the 45 select questions' prompts, hints and explanations, end screen)
  game-q-<mode>.js      the texts of the insert, update, delete and ddl questions, merged into GAME_TEXT.questions
  game-tour.js          GAME_TOUR (the onboarding tour of #/game; the example SQL is the same in both languages)
data/game-bank.js       GAME_BANK (language-neutral: the shop database script, schema and types, the 45 select questions with solution, template and traps)
data/game-comp-config.js  GAME_COMP_CONFIG: where the competition server is (supabaseUrl, the public anon key) and the limits shown before it answers
data/game-bank-<mode>.js  the insert, update, delete and ddl questions (30 each, with their probes), appended to GAME_BANK.questions; also load in Node
assets/pdf/             summary PDF of each section and language (<section>-<lang>.pdf), built with tools/build-pdfs.mjs
assets/og-preview.png   link preview image (1200×630: title and the ER diagram editor), built with tools/build-og.mjs
tools/                  build and check tools (Node, outside the site): build-pdfs.mjs, build-og.mjs, check-*.mjs, er-review-report.mjs, game-sql.mjs (the game's SQL engine in Node: sql.js + OracleDialect + the banks, shared by the game checks)
tools/comp-build.mjs, comp-hidden.mjs, comp-upload.mjs, supabase-sync.mjs  the competitive bank: validation on both datasets, the hidden dataset, the upload to Supabase, the engine copies for the server
tools/comp/private/     PRIVATE and git-ignored: the competitive questions with their solutions, traps and alternatives (<mode>.json), their texts (texts/), the hidden dataset and its seed
tools/comp/solutions.enc  the private folder encrypted (AES-256-GCM, key from the COMP_KEY passphrase): the only form in which it is committed
supabase/               the competition server: migrations (tables, RLS, the @cunef.edu hook), the `comp` Edge Function and its grading engine, the code email, seed-teacher.sql; the teacher's steps in supabase/README-deploy.md
tools/fixtures/hand-drawn.drawio  a hand-drawn draw.io model (banking), used by check-er-practice.mjs
docs/game-quiz.md       Query for a Million: the contract between the game modules (rules, bank, text, page hooks, tour, tests; the modes in §13)
docs/game-visual.md     the visual direction of #/game (arcade cabinet, tokens, the ladder, the tour)
docs/er-solutions-review.md  review of the published lab-session ER solutions (generated by tools/er-review-report.mjs)
assets/video/           rendered course videos (MP4 and poster, no subtitles): normalization, normalization-advanced (BCNF, 4NF, 5NF), ternary and ten SQL videos (sql-*.mp4); built from video/ with npm run render:site, render:nf-advanced, render:ternary and render:sql
.claude/skills/cunef-brand/  CUNEF brand skill (manual, logo, Word and PowerPoint templates)
```

Direct links, handy for sharing in class:

- `#/relational/er` (first concept), `#/relational/er/<conceptId>` (one concept, e.g. `#/relational/er/cardinality`), `#/relational/er/quiz/weak` (quiz filtered to one topic) and `#/relational/er/practice/6` (modelling exercise 6)
- `#/relational/logical` (the transformation rules), `#/relational/logical/<ruleId>` (e.g. `#/relational/logical/weak`) and `#/relational/logical/practice/17` (exercise 17)
- `#/relational/normalization` (theory), `#/relational/normalization/video`, `#/relational/normalization/practice/3`, `#/relational/normalization/diagnose` and `#/relational/normalization/diagnose/advanced`
- `#/relational/sql`, `#/relational/sql/<cardId>` (e.g. `#/relational/sql/composite-index`), `#/relational/sql/quiz/indexes` and `#/relational/sql/practice` (the sandbox)
- `#/` — landing page (default)
- `#/progress`
- `#/game` — Query for a Million / Una consulta por un millón: the mode select screen, with a Study | Competitive switch (remembered in `game-side-v1`). Each mode is a quiz ladder of 15 SQL questions on a video-game shop database, with three lifelines per run, safe rungs 5 and 10 and a walk away: `#/game/select` (queries), `#/game/insert`, `#/game/update`, `#/game/delete` (graded by snapshots of the tables), `#/game/ddl` (tables, columns, views and indexes, graded by probes) and `#/game/mixed`, which opens once rung 5 is reached in all five and asks for one statement kind per rung, each kind once per band; an unknown mode or a locked Mixed goes back to `#/game`; `#/game/comp/<mode>` is a competitive attempt, `#/game/historial` the student's own competitive record (My attempts), `#/game/entrar` the Competitive side from the header's Sign in, and `#/game/profesor` teacher mode (see "Competitive side (Supabase)") (saved in this browser: `game-quiz-v2` = `{ v: 2, runs, best, reached }` per mode, `game-quiz-draft-v2` and `game-quiz-pending-v2` per mode for the console text and a wrong lock-in waiting for the Review rescue, `game-intro-seen` once the tour has been seen; competitive: the sign-in session `game-comp-auth`, a summary of the last status for the header's account menu `game-comp-status`, the console text `game-comp-draft-v2` and the current question's indicators `game-comp-tele-v2`, everything else on the server; the v1 keys `game-quiz-v1`, `game-best-v1`, `game-quiz-draft-v1` and `game-quiz-pending-v1` are moved into the select mode once, `reached.select` being the higher of the rungs answered and the rung of the old best prize, then deleted). It is reached from the **Arcade** tab at the end of the app bar's section tabs (a destination of its own, set apart from the course sections, `js/main.js`) and from the arcade banner on the home page, which says **Play now**, or **Continue playing** when a run of any mode is in progress
- `#/nosql`

Old links (`#/normalize/3`, `#/diagnose`, `#/diagnose/advanced`, `#/relational/logical/17`, `#/relational/normalization/3`) are redirected to the new ones.

## Competitive side (Supabase)

The game's **Competitive** side (`#/game`, then Competitive) gives a badge per base mode (select, insert, update, delete, ddl) for reaching €1,000,000 in one attempt; five badges add 0.5 to the lab grade after the teacher's oral check. A static site cannot keep a competition honest (anything in the page can be read or forged), so this side runs on the teacher's **Supabase** project. Study mode stays 100 % in the browser and needs none of it. Contract: `docs/game-quiz.md` §15.

- **On the server** (`supabase/`): sign-in with a 6-digit email code, only for `@cunef.edu` (an auth hook); the questions with their solutions, never sent to the page; the draw, the 60-minute clock and the daily limit (3 attempts per mode and day, Madrid time); the grading of every Lock in on the public dataset and on a hidden one with other values (so hard-coded answers fail); Key clause, Insert template and Review; the indicators for the teacher (time per question measured by the server, Runs, paste attempts, leaving the tab, literal id lists, no table read, none of the key clause words); the badges. Row Level Security denies everything to the page except reading one's own profile and setting one's name; all the rest goes through the `comp` Edge Function.
- **In the page** (`js/game.js`, `data/game-comp-config.js`): the sign-in form, the tiles with each badge and "n of 3 left today", the attempt with its countdown, Run on a local copy of the public dataset (free, as in study), paste and drop blocked, and a printable certificate for a won badge (for information: the badge is the server's record). `data/game-comp-config.js` holds only the project URL and the public anon key; until the key is there, Competitive says the competition is not set up.
- **Teacher mode** (`#/game/profesor`, for accounts with the teacher role): every student with their badges and attempts, an attempt in detail (each answer with the reference solution, server times and indicators), **Pick 2 at random** for the oral check, a CSV of the badges, and test attempts with **Jump to rung 15** and **Force right** that never give a badge.
- **The private files:** the questions, solutions, traps, accepted alternatives, texts and the hidden dataset live in `tools/comp/private/` (git-ignored); `tools/comp/solutions.enc` is their encrypted backup (`COMP_KEY='…' node comp-build.mjs --encrypt`, and `--decrypt` on another machine). `node check-no-secrets.mjs` fails if a private file, a service key or a database password would be committed.
- **Setting it up and running the course** (region, email sending, the code email, the database, the function, the auth hook, the upload of the bank, the teacher role, the anon key): **[supabase/README-deploy.md](../supabase/README-deploy.md)**.
- **Local development** (Docker): `cd tools && npx supabase start --workdir ..`, then `node supabase-sync.mjs` and `node comp-upload.mjs --local`; the codes arrive in Mailpit (`http://127.0.0.1:54324`). Details, and how to try the page against the local stack without committing its keys, in the same guide.

## Publish on GitHub Pages

1. Upload `index.html`, `styles.css`, `theory.css`, `game.css`, `game-intro.css` and the `assets/`, `js/`, `data/` and `i18n/` folders to the root of the repository.
2. In **Settings → Pages**, choose **Deploy from a branch**, branch `main` and folder `/ (root)`.
3. In a minute it will be at `https://<user>.github.io/<repository>/`.

To try it locally, just open `index.html` in the browser.

**Link previews:** the Open Graph and Twitter tags in `index.html` use absolute URLs on `https://ture2.github.io/cunef-relational-databases/`, because crawlers do not resolve relative ones. Update them if the site moves. The image, `assets/og-preview.png`, is a capture of the ER diagram editor (practice exercise 5 with its official solution) next to the title. Rebuild it with `cd tools && node build-og.mjs` after changing the look of the editor.

**The video** is a normal committed file (`assets/video/normalization.mp4`, about 18 MB), not Git LFS: GitHub Pages does not serve LFS files from a branch deploy, and git refuses files over 100 MB. Pages serves it as `video/mp4` with byte ranges, so the player can seek. To rebuild it after changing the Remotion project: `cd video && npm i && npm run render:site` (720p H.264 and the poster frame). The video has no subtitles of any kind: the narration is in English and the diagrams carry the on-screen text. A second, 3-minute video (`assets/video/normalization-advanced.mp4`) takes a 3NF schema through BCNF, 4NF and 5NF and ends with open questions; it sits at the top of the Normal forms group (`VIDEO_ADVANCED` in `js/normalization-section.js`); rebuild it with `npm run render:nf-advanced`. The ten SQL videos (`assets/video/sql-*.mp4`, about 3 minutes each) sit on their SQL cards (`video: 'sql-<topic>'` in `data/<lang>/sql.js`, chapters in `SQL_VIDEOS` in `js/sql.js`); rebuild them with `npm run render:sql`.

## Summary PDFs

Each section has a printable summary sheet at `#/relational/<section>/summary` (title, summary, key points, example, common mistake, figure, tables and code of every card). `tools/build-pdfs.mjs` prints those sheets with headless Chrome into `assets/pdf/<section>-<lang>.pdf` (5 sections × 2 languages, A4, about 200–450 KB each), and the rail links to them. **Re-run it after editing anything in `data/`**, so the PDFs match the site:

```bash
cd tools && npm i && npm run pdfs    # uses $CHROME_PATH, an installed Chrome/Edge, or `npx playwright install chromium`
```

The script fails if a page logs an error or a missing translation.

## Saved progress

Everything is stored in `localStorage`, on that device only, and never sent anywhere. If storage is blocked, the site works the same but saves nothing.

| Key | Content |
|---|---|
| `er-quiz-v1` | Best ER quiz score for each topic |
| `er-practice-v1` | Solved ER practice exercises and the best score of each |
| `er-practice-work-v1` (`-es` in Spanish) | The model built in each ER practice exercise. It is kept when the official model is corrected and discarded only when the statement changes |
| `er-logical-v1` | Solved ER → logical exercises |
| `er-logical-work-v1` (`-es` in Spanish) | The tables of each ER → logical exercise. They are discarded when the exercise's ER model changes |
| `normalization-en-v1`, `normalization-en-work-v1` (`-es` in Spanish) | Normalization progress and work (the `en` in the name is historical; progress is shared by both languages) |
| `er-ui-v1` | Layout choices shared by every section: rail collapsed to icons, all concepts of a group shown, "Try it" boxes open, rail parts opened by hand (`openParts`, per section), the last rail tab chosen (`railTab`, per section) |
| `video-progress-v1`, `video-watched-v2` | Where each course video was left, and the videos watched |
| `lang` | The chosen language, `es` or `en` |
| `theme` | `light`, `dark` or `system` |
| `theory-quiz-v1` | Best Theory quiz score for each topic |
| `sql-quiz-v1` | Best SQL quiz score for each topic |
| `read-v1` | The concepts read in each section (opened, or scrolled to their end; for the progress page) |
| `sql-sandbox-v1` | The text of the SQL sandbox |
| `sql-challenges-v1`, `sql-challenges-work-v1` (`-es` in Spanish) | Solved SQL challenges and the text of each |

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

## ER practice

`#/relational/er/practice/N` shows a statement from the lab sessions (hands-on exercises 1–4 and solved activities 1–11 of the course repository, `lab-sessions/…/STATEMENT.md` §1). The student builds the model in three blocks:

- **Entities**: name, *Weak* toggle, and attributes with a kind (simple, key, partial key, multivalued, derived, composite with its parts).
- **Relationships**: name, *Identifying* toggle, two or more ends (entity, min 0–3, max 1 or N, optional role) and attributes. Under each end the look-across reading is written out ("For one Branch, at least one Account").
- **Hierarchies**: supertype, subtypes, d / o, total / partial and an optional discriminator.

A preview draws the model with the course notation as it is typed (`ErPracticeEngine.autoLayout` places it on the grid). **Check** compares it with the official model; **Show solution** reveals the official diagram, the model as text, why each element is there, the accepted alternatives, the assumptions and the differences from the published course solution. The page also points to diagrams.net (with a starter `.drawio` file holding the statement and the course's Chen shapes), ERDPlus and the Ask Claude button.

**draw.io (diagrams.net)** (`js/er-drawio.js`):

- **Download my model** writes the student's model as an editable Chen diagram: entities, diamonds and triangles as shapes, attributes as ellipses around their owner (composite parts linked to the composite), look-across `(min,max)` labels on the lines, and a double line for total participation (at E when the other end's min is ≥ 1). The official solution can be downloaded the same way from the solution panel.
- **Import from draw.io** reads a `.drawio` (plain or compressed) back into the builder, replacing the model after a confirmation; then **Check** works as usual.
  - Shapes exported by the site carry `er-*` attributes (`er-kind`, `er-card`, `er-role`, …), which draw.io keeps, so they come back exactly.
  - Shapes drawn by hand are read from their style: rhombus → relationship (double → identifying), ellipse → attribute (underlined text → key, dashed underline → partial key, double → multivalued, dashed → derived), triangle → hierarchy, any other box → entity (double → weak). A line's card is its value, a label on it, or a `(min,max)` text box next to the entity end.
  - Whatever cannot be read (an unlinked ellipse, a line without a card, …) is listed under the buttons, so nothing is lost silently.
  - The positions of the imported shapes are saved with the model, so the next export keeps the student's arrangement.

**The checker** (`js/er-practice-engine.js`) matches the student's entities by name (accents, case, plural, word order, typos and the exercise's aliases are tolerated), then by shared attributes and by their place in the relationships; relationships are matched by their participants, not by their names. It reports, without naming an element the student has not modelled (a quote from the statement is given instead): missing or extra entities, relationships and hierarchies; misplaced attributes (on an entity instead of the relationship, or the other way round); attributes that repeat a related entity (foreign keys in a conceptual model); keys, weak entities, partial keys and identifying relationships; each end's (min,max), with one message for a swapped (look-here) pair; and hierarchy properties. Naming differences and accepted variants are notes, not errors. An exercise is solved when nothing is left to fix; a score is shown too.

**Data** (`ER_PRACTICE`): `{ id, group: 'handson' | 'solved', title, short, source, focus, statement: [lines; '- ' lines become a list], model, names, optional, accept, alternatives, why, quote, notInModel, assumptions, corrections, hints }`.

- `model` is the id of the ER → Logical exercise that shares the model (12 of them), or an inline model in the `ErDiagram.modelSvg` shape. A shared model is corrected once for both sections.
- The keys of `names`, `optional`, `accept`, `why` and `quote` are built from the **English** element names in both languages: `Entity`, `Entity.attr`, `Rel`, `Rel.attr`, `Rel@Entity` (`Rel@role` for an end of a unary relationship), `HierarchyId`.
- `accept`: other cardinalities of an end (`'Rel@Entity': ['(1,N)']`), other attribute kinds (`{ kinds: [''] }`), or `{ weak | identifying | total | disjoint: 'either' }`.
- `alternatives`: whole models that are also right, as a patch of the official one: `{ id, label, patch: { remove: [key], set: { key: props }, add: { entities, relationships, hierarchies, attrs: { key: [attr] } } }, names }`. The student is compared with every variant and the closest one is reported.
- `corrections` lists how the model differs from the published solution; `node tools/er-review-report.mjs` turns them into `docs/er-solutions-review.md`, the review to apply in the course repository.

**Checks**: `node tools/check-er-practice.mjs` (`--no-browser` for the Node part only) verifies the en / es parity, that every metadata key names an element, that every official model and alternative passes its own check, that typical mistakes are caught (missing entity, wrong max, look-here, weak left strong, misplaced attribute, foreign key as attribute), that aliases still pass, the Spanish of every message, every ER → Logical exercise, and then, in Chromium, every exercise in both languages (official solution loaded and checked, a stray entity reported, every official model exported to draw.io and imported back, plain and compressed, the hand-drawn fixture, a download and re-import through the page, no page errors, no horizontal scroll on a phone). The page also runs `ErPractice.selfTest` when idle (console warnings only).

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

## SQL: Oracle first, challenges and site search

- **Oracle, not SQLite.** The course practises on Oracle (freesql.com), so every runnable example is written in Oracle SQL (`VARCHAR2`, `NUMBER`, `FETCH FIRST`, `MINUS`, `DUAL`, `CONNECT BY LEVEL`, `EXPLAIN PLAN`…). `js/oracle-dialect.js` (no DOM, also loadable in Node) translates that subset to SQLite for the in-browser engine, emulates Oracle's implicit transactions (no `BEGIN`; DDL commits), maps engine errors to `ORA-xxxxx`, words query plans like Oracle, and **lints** what a student types (`LIMIT`, `EXCEPT`, `TEXT`, string dates…: "would not run on Oracle"). PL/SQL, partitions, sequences and privileges are reported as "not simulated: try it in FreeSQL". **Copy and open FreeSQL** copies the script (with a clean-slate `DROP TABLE IF EXISTS`) and opens freesql.com/worksheet; the generated DDL of the ER → Logical and Normalization sections is Oracle too (reserved words such as `DATE` are quoted).
- **Challenges** (`js/sql-challenges.js`, `data/<lang>/sql-challenges.js`, route `#/relational/sql/practice/N`; the sandbox stays at `…/practice`): 22 goals in 4 levels. "Check" runs the student's SQL and the reference on the same fresh database and compares results (rows as a set unless `ordered`; for INSERT/UPDATE/DELETE/CREATE the `verify` SELECT is compared). Solved ids: `sql-challenges-v1`.
- **Search** (`js/search.js`): an inverted index built in the browser from every card, quiz question, exercise and challenge, per language (accent- and case-insensitive, prefix matching on a sorted term list, TF×IDF with title/summary/body weights, phrase bonus, one-typo tolerance). `/` or Ctrl+K focuses the box; opening a result highlights the searched words in the page.
- **Checks** (`cd tools && npm i`, which also installs sql.js for the game checks): `node check-oracle.mjs` (translator cases), `node check-cards.mjs [en|es]` (runs every SQL card, sandbox example and challenge solution, and the generated DDL, in headless Chromium; needs network for sql.js), `node check-quiz.mjs`, `node check-search.mjs`, `node check-home.mjs`, `node check-er-practice.mjs`, and for Query for a Million (on `tools/game-sql.mjs`, the browser's engine in Node) `node check-game-bank.mjs` (the shop database builds, schema and types match it; the 45 select questions, 3 per rung: every solution passes the Lock in check, returns rows, gives the same result on a database built in reverse order and respects its band, every trap grades wrong, every template runs and is not the solution; the insert, update, delete and ddl banks, 30 questions each, graded through their probes; GameCore: ladder, safe prizes, seeded and Mixed draws, state transitions, Lock in checks per mode, grading, Review diagnoses, the v1 migration), `node check-game-text.mjs` (GAME_TEXT and the per-mode question texts in both languages: same keys, every question, the six modes, md rules, word limits, sentence case, none of the TV show's catchphrases), `node check-comp-server.mjs` (the competition server's grading engine on both datasets for the 750 private questions of the five competitive databases (docs/game-quiz.md §16): solutions right, traps and alternatives as expected, hard-coded answers caught by the hidden dataset, refusals, flags, shapes, Review codes, the game transitions, the engine copies in sync; with `--e2e`, the API end to end against the local stack: RLS, the @cunef.edu hook, the email code, the daily limit, expiry, the rate limit, teacher-only operations, test attempts, badges, and no solution in any student response), `node check-no-secrets.mjs` (no service key, database password or private file in git), `node check-game-tour.mjs` (GAME_TOUR in both languages: same shape, the six spotlight ids, word limits, the example SQL passes the Lock in check) and `node check-game.mjs [en|es]` (the page in headless Chromium, about a minute per language, played through the page as a student would: the select screen (six tiles with their keywords, no best score until a run ends, Continue · rung n, Mixed open from the start, unknown modes redirected to `#/game`); for each of the five modes a seeded run (the ids of `GameCore.draw`, the keyword chip, ← Modes), Run of the reference solution (a table, a diff of the touched table with added, changed or deleted rows and the unchanged ones hidden, or the new columns), a statement of the wrong kind refused at no cost, the reference passing, Key clause ("The answer inserts n rows" in DML), a known trap of `GAME_BANK` opening the Review rescue and Review explaining it; saves, drafts and lifelines per mode across a reload and mode switches; a select run in depth (the loop above the fold at 1440 × 900, no Walk away at rung 1, the lifeline descriptions, Oracle's rules in Run, the Lock in refusals, the confirm dialog with its focus trap and the marquee tools disabled, the suspense, the three lifelines, reload, leaving and coming back, walking away with the best score on its tile, Play again and Choose another mode), the rescue coming back after a reload and a loss at rung 7; Delete played to a full win and Structure to rung 6 (`reached`), Mixed with no unlock (`GameCore.drawMixed`, each kind once per band, the big chip, a pass and a wrong-kind refusal); the migration of the v1 keys; the onboarding tour (first visit on the select screen, Skip, not again after a reload, n of 6 there with "Six ways to play" (the screens are read from GAME_TOUR), n of 6 in a run with the spotlight over each of its six targets at 1440 and 390 px, the example's end state with reduced motion, Replay, Play, Esc, Tab kept inside); always light on a dark site; snippets, schema names typed at the cursor and the language switch (same run, schema in English); the phone ladder strip and Show prizes; no horizontal scroll at 1440 and 390 px on a light and a dark site for the select screen, the tour, a run, a DML diff and the end screen; fixed questions through `localStorage['game-seed']`, the tour suppressed through `localStorage['game-intro-seen']` except in its own checks, sql.js served from `tools/node_modules`; `SHOTS=<dir>` saves screenshots, including `visual-{tour,select,game,end}-{light,dark}-{1440,390}-{en,es}.png` and `visual-diff-{1440,390}-{en,es}.png`; with `COMP=1` (or `--comp`) also the competitive side against the LOCAL Supabase stack, which it starts if needed (Docker), syncs and uploads the bank to, giving the page the local URL and key through a route (nothing is written to the repository): no anon key ("not set up"), a server that does not answer ("not responding, it may be paused"), sign-in with the email code from Mailpit, other domains refused, a wrong code refused, the name asked once, the tiles with "n of 3 left today", an attempt (the countdown, paste and drop blocked and counted, Run local, Key clause, a refusal at no cost, a wrong answer, the rescue with the server's Review, a loss, a new draw), expiry after the deadline is moved in the database, the daily limit ("Come back tomorrow" and the server's refusal of a fourth start), the million played with the private solutions (the certificate, the badge on the tile and its row in the database), no private solution in the DOM, the storage or any response of the comp function, teacher mode (a student refused; the teacher, given the role by `supabase/seed-teacher.sql`, sees the list, an attempt with its references and indicators, Pick 2, the CSV, and a test attempt with Jump and Force and no badge), and no horizontal scroll at 390 px for sign-in, tiles, an attempt, the certificate and the teacher's list; without Docker, the stack, the private bank or jsDelivr these checks are skipped with a message and the study checks still run; `visual-comp-*` and `visual-teacher-*` screenshots).

## Notes

- Everything saved (see "Saved progress") stays in the student's browser; it is not sent anywhere.
- There are no third-party requests: it uses system fonts, no CDN and no analytics.
