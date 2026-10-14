# Aggregation: script and timeline

- English · 1920×1080 · 30 fps · British English voice-over (no subtitles) + the same soft music as the other videos.
- Total: **03:16** (5 880 frames). The single source of timing is `src/sql/aggregation/timeline.ts`; the narration is `src/sql/aggregation/narration.json`.
- Times inside a scene are **local** (seconds from the scene start).
- Source: the SQL cards `aggregate-functions` and `group-by-having` of the website (`data/<lang>/sql.js`), on the SCHOOL schema. Oracle syntax.
- Same style as the other videos (`SCRIPT-sql-joins.md`). Colour coding: blue = student, orange = course, teal = department, maroon = enrolment (and its grades); orange outline = the rows or values being discussed. Piles (groups): C10 blue, C11 yellow, C20 teal.
- The video sits on the website card `group-by-having` (`video: 'sql-aggregation'` in `data/<lang>/sql.js`); `js/sql.js` (`SQL_VIDEOS['sql-aggregation'].chapters`) holds the chapter start times.

## Dataset
SCHOOL (`src/sql/common/school.tsx`): `student` S01 Ana Ruiz, S02 Luis Gil, S03 Eva Sanz (no email); `enrolment` (S01 C10 8.5) (S01 C20 7.0) (S02 C10 6.5) (S02 C11 9.0) (S03 C10 5.0) (S03 C11 7.5).
Results used: COUNT(*) = 3 and COUNT(email) = 2 on student; on enrolment COUNT(*) 6, MIN 5, MAX 9, SUM 43.5, AVG 7.25; per course C10 3 rows avg 6.67, C11 2 rows avg 8.25, C20 1 row avg 7; with `WHERE grade >= 6 … HAVING COUNT(*) >= 2`: C10 2, C11 2.

## Scenes
| # | Scene | Start | Length | What it shows |
|---|---|---|---|---|
| 1 | Title | 00:00 | 8 s | Logo, "Aggregation", chips COUNT · SUM · AVG · MIN · MAX · GROUP BY · HAVING |
| 2 | Many rows, one value | 00:08 | 18 s | A supermarket receipt: six lines, one TOTAL; `SELECT COUNT(*), AVG(grade) FROM enrolment`: the six enrolment rows fold into one result row (6, 7.25) |
| 3 | COUNT(*) and COUNT(column) | 00:26 | 21 s | On `student`: COUNT(*) counts 1, 2, 3 rows; COUNT(email) counts 2, Eva's NULL is struck; chips "COUNT(*): every row", "COUNT(column): skips NULLs" |
| 4 | SUM, AVG, MIN and MAX | 00:47 | 22 s | Grades of enrolment: lowest 5, highest 9, total 43.5, average 7.25 (43.5 / 6); "NULLs are skipped", "a missing grade is not a 0" |
| 5 | GROUP BY | 01:09 | 34 s | `GROUP BY course_id`: the enrolment rows slide into three piles (C10 ×3, C11 ×2, C20 ×1); each pile folds into one result row beside it: C10 3 6.67, C11 2 8.25, C20 1 7 |
| 6 | WHERE and HAVING | 01:43 | 33 s | `WHERE grade >= 6` strikes Eva's 5.0 before grouping; piles C10 (2), C11 (2), C20 (1); `HAVING COUNT(*) >= 2` strikes the C20 pile; result C10 2, C11 2; "aggregate: HAVING", "everything else: WHERE" |
| 7 | The logical order | 02:16 | 21 s | FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY (rows / groups / output); WHERE cannot use an aggregate, ORDER BY can use a SELECT alias |
| 8 | Three common errors | 02:37 | 30 s | ORA-00937 (`SELECT name, COUNT(*) FROM student`), ORA-00979 (`SELECT student_id, COUNT(*) … GROUP BY course_id`), ORA-00934 (`WHERE AVG(grade) > 7`; fix: HAVING) |
| 9 | Outro | 03:07 | 9 s | "Practise it", Aggregation in the SQL section, logo |

## Narration
The narration lives in `src/sql/aggregation/narration.json` (segment ids `ag<scene>-<n>`). After editing it, run `python scripts/tts.py --video sql/aggregation`. The script regenerates the MP3s and checks that every segment fits its scene.
