# Databases practice

**Learn relational databases by doing: read a short card, run the SQL, check your model, get told exactly what to fix.**

The free, bilingual (English / Spanish) practice site of the CUNEF *Databases I* course.

**Open it:** https://ture2.github.io/cunef-relational-databases/

## What it does

| Section | You get |
| --- | --- |
| **Theory** | Information systems, the DBMS, transactions (ACID), abstraction levels, storage and indexes |
| **ER concepts** | Concept cards with Chen diagrams, a quiz, and 15 modelling exercises checked against the official solution |
| **ER → Logical** | 21 exercises: turn an ER model into tables, with every mistake explained by the transformation rules |
| **Normalization** | Normalize or diagnose schemas from 2NF to 5NF |
| **SQL** | 60 cards in tabs by sub-language (DDL, DML, Advanced: DCL, TCL, PL/SQL), runnable Oracle examples, a 133-question quiz, 22 auto-checked challenges and a sandbox |
| **Arcade** | *Query for a Million*: 15-question SQL ladders in six modes; the Competitive side (sign in with your @cunef.edu email) awards a badge per mode, and the account menu shows your attempts |

## Why it helps

- **Instant feedback.** Checkers point to the exact entity, table or query that is wrong, and say why.
- **Nothing to install.** SQL runs in the browser; Oracle-only features come as scripts for [FreeSQL](https://freesql.com).
- **Built for revision.** Short videos, a summary PDF per section, and progress saved in your browser.

## How to use it

**Students:** open the site, pick a section, and follow the cards. Use *Try it* to run examples, *Test yourself* for the quiz and *Practice* for the exercises. Press `/` to search the whole course.

**Teachers and contributors:**

```bash
# run it: open index.html in a browser (no build step, no server)

# after editing content in data/en and data/es (keep both languages in sync)
cd tools && npm i
node check-cards.mjs     # every SQL example, in both languages
npm run pdfs             # rebuild the summary PDFs
```

Push to `main` and GitHub Pages publishes it in about a minute.

Data formats, every check and the build tools are in the [developer guide](docs/DEVELOPMENT.md).
