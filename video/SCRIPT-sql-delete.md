# DELETE vs TRUNCATE vs DROP: script and timeline

- English · 1920×1080 · 30 fps · British English voice-over (no subtitles) + the same soft music as the other videos.
- Total: **03:06** (5 580 frames). The single source of timing is `src/sql/delete/timeline.ts`; the narration is `src/sql/delete/narration.json`.
- Times inside a scene are **local** (seconds from the scene start).
- Source: the SQL cards `alter-drop` (DELETE + ROLLBACK vs TRUNCATE + ROLLBACK, recycle bin, FLASHBACK TABLE … TO BEFORE DROP, DROP … PURGE, CASCADE CONSTRAINTS), `update-delete`, `tcl` and `sql-languages` of the website (`data/<lang>/sql.js`), plus the quiz question "Which of these statements can be undone with ROLLBACK?". SCHOOL schema and the `member` table of `alter-drop`. Oracle syntax.
- Same style as the other videos (`SCRIPT-ternary.md`, `SCRIPT-sql-joins.md`). Colour coding: teal = DELETE (DML), yellow = TRUNCATE, orange = DROP; blue = student, maroon = enrolment; orange outline = the rows or columns being discussed; struck-through rows = deleted.
- The video sits on the website card `alter-drop` (`video: 'sql-delete'` in `data/<lang>/sql.js`); `js/sql.js` (`SQL_VIDEOS['sql-delete'].chapters`) holds the chapter start times.

## Dataset
SCHOOL (`src/sql/common/school.tsx`): `student` S01 Ana Ruiz, S02 Luis Gil, S03 Eva Sanz; `enrolment` (S01 C10 8.5) (S01 C20 7.0) (S02 C10 6.5) (S02 C11 9.0) (S03 C10 5.0) (S03 C11 7.5); `enrolment.student_id` references `student` with ON DELETE CASCADE. `member` (card `alter-drop`, in `src/sql/delete/shared.tsx`): 1 Ana Ruiz ana@uni.es, 2 Luis Gil luis@uni.es.

## Scenes
| # | Scene | Start | Length | What it shows |
|---|---|---|---|---|
| 1 | Title | 00:00 | 8 s | Logo, "Three ways to delete", chips DELETE · TRUNCATE · DROP |
| 2 | Three levels | 00:08 | 20 s | enrolment three times: DELETE strikes the two C11 rows (`WHERE course_id = 'C11'`), TRUNCATE empties it and keeps the header, DROP removes the whole table (dashed ghost) |
| 3 | DELETE | 00:28 | 30 s | `DELETE FROM student WHERE student_id = 'S03';` Eva is struck, the ON DELETE CASCADE arrow strikes her two enrolments; chips DML, WHERE optional, row by row, fires DELETE triggers; `ROLLBACK;` brings the three rows back (undo kept) |
| 4 | TRUNCATE | 00:58 | 26 s | `TRUNCATE TABLE enrolment;` every row vanishes at once, the header stays (columns, constraints and indexes); the storage grid is freed at once: very fast, no triggers; implicit COMMIT; `ROLLBACK;` still 0 rows |
| 5 | TRUNCATE a parent | 01:24 | 20 s | `TRUNCATE TABLE student;` enrolment is empty but its foreign key is enabled: ORA-02266; disable the foreign key first, or use DELETE |
| 6 | DROP and the recycle bin | 01:44 | 28 s | `DROP TABLE member;` rows, columns, indexes, constraints; the table drops into the recycle bin; `FLASHBACK TABLE member TO BEFORE DROP;` brings it back, rows included; `DROP TABLE member PURGE;` skips the bin: gone for good |
| 7 | CASCADE CONSTRAINTS | 02:12 | 20 s | `DROP TABLE student;` fails with ORA-02449; `DROP TABLE student CASCADE CONSTRAINTS;` drops student and the foreign key to it; the enrolment rows stay, unchecked |
| 8 | Summary | 02:32 | 25 s | Comparison table: language, WHERE, row triggers, ROLLBACK (DROP: no, but FLASHBACK), table kept, speed; "When in doubt: DELETE, check, then COMMIT" |
| 9 | Outro | 02:57 | 9 s | "Practise it", SQL languages in the SQL section, logo |

## Narration
The narration lives in `src/sql/delete/narration.json` (segment ids `dl<scene>-<n>`). After editing it, run `python scripts/tts.py --video sql/delete`. The script regenerates the MP3s and checks that every segment fits its scene.
