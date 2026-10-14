# Stored procedures and functions: script and timeline

- English · 1920×1080 · 30 fps · British English voice-over (no subtitles) + the same soft music as the other videos.
- Total: **03:16** (5 880 frames). The single source of timing is `src/sql/procedures/timeline.ts`; the narration is `src/sql/procedures/narration.json`.
- Times inside a scene are **local** (seconds from the scene start).
- Source: the SQL cards `procedures-functions`, `plsql-blocks`, `plsql-exceptions` and `packages` of the website (`data/<lang>/sql.js`), on the SCHOOL schema. Oracle PL/SQL syntax as on the cards (`letter_grade`, `enrol_student`, `grades_pkg`).
- Same style as the other videos (`SCRIPT-sql-joins.md`). Colour coding: blue = student, orange = course, maroon = enrolment / OUT parameter, teal = function and handled exception; orange outline = the rows or lines being discussed; orange highlight bar = the code line the voice is on.
- The video sits on the website card `procedures-functions` (`video: 'sql-procedures'` in `data/<lang>/sql.js`); `js/sql.js` (`SQL_VIDEOS['sql-procedures'].chapters`) holds the chapter start times.

## Dataset
SCHOOL `enrolment` (`src/sql/common/school.tsx`): (S01 C10 8.5) (S01 C20 7.0) (S02 C10 6.5) (S02 C11 9.0) (S03 C10 5.0) (S03 C11 7.5). `enrol_student('S03', 'C20', …)` adds (S03 C20 NULL): the card's procedure inserts only the two ids. `letter_grade`: NULL → '-', ≥ 9 A, ≥ 7 B, ≥ 5 C, else F, so the letters are B, B, C, A, C, B, -.

## Scenes
| # | Scene | Start | Length | What it shows |
|---|---|---|---|---|
| 1 | Title | 00:00 | 8 s | Logo, "Procedures and functions", chips PROCEDURE · FUNCTION · IN · OUT · EXCEPTION · PACKAGE |
| 2 | From block to subprogram | 00:08 | 26 s | An anonymous block (DECLARE, BEGIN, EXCEPTION, END light up): runs once, not stored. Named, it lives in the database as `PROCEDURE enrol_student`: stored, compiled once, reusable; web app, mobile app and report call it; `GRANT EXECUTE ON enrol_student TO web_app;` |
| 3 | CREATE PROCEDURE | 00:34 | 29 s | `CREATE OR REPLACE PROCEDURE enrol_student (p_student IN, p_course IN, p_message OUT VARCHAR2)`; IN = read only, OUT = written and handed back; types without length; the body INSERTs, then sets the message (the EXCEPTION part is dimmed for scene 5) |
| 4 | Calling it | 01:03 | 24 s | `DECLARE v_msg … BEGIN enrol_student('S03', 'C20', v_msg); …`, or `EXEC enrol_student('S03', 'C20', :msg)` in a script; enrolment gains (S03 C20 NULL); v_msg = "S03 enrolled in C20" |
| 5 | Handling the error | 01:27 | 24 s | The same call again: an execution pointer stops on the INSERT, ORA-00001 / DUP_VAL_ON_INDEX, jumps to EXCEPTION → WHEN DUP_VAL_ON_INDEX → the second message; v_msg = "S03 was already enrolled in C20"; the table still has 7 rows |
| 6 | A function | 01:51 | 29 s | `CREATE OR REPLACE FUNCTION letter_grade (p_grade IN NUMBER) RETURN VARCHAR2`, the CASE branches light up; `SELECT student_id, course_id, grade, letter_grade(grade) AS letter FROM enrolment`; 8.5 → B, 9.0 → A, NULL → '-' |
| 7 | Procedure or function? | 02:20 | 28 s | Vending machine (IN coin and choice, does something, OUT change) vs calculator (IN numbers, RETURN one answer, usable in SQL); "An action? Write a procedure" · "A value? Write a function" |
| 8 | Packages | 02:48 | 19 s | `grades_pkg` specification (the menu: what callers see) and blurred body (the kitchen: hidden code); callers write `grades_pkg.letter(8.5)` |
| 9 | Outro | 03:07 | 9 s | "Practise it", PL/SQL in the SQL section, logo |

## Narration
The narration lives in `src/sql/procedures/narration.json` (segment ids `pr<scene>-<n>`). After editing it, run `python scripts/tts.py --video sql/procedures`. The script regenerates the MP3s and checks that every segment fits its scene.
