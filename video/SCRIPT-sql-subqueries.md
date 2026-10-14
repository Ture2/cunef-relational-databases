# Subqueries: script and timeline

- English · 1920×1080 · 30 fps · British English voice-over (no subtitles) + the same soft music as the other videos.
- Total: **03:29** (6 270 frames). The single source of timing is `src/sql/subqueries/timeline.ts`; the narration is `src/sql/subqueries/narration.json`.
- Times inside a scene are **local** (seconds from the scene start).
- Source: the SQL cards `subqueries`, `multirow-subqueries` and `correlated-subqueries` of the website (`data/<lang>/sql.js`), on the SCHOOL schema. Oracle syntax.
- Same style as the other videos (`SCRIPT-ternary.md`, `SCRIPT-sql-joins.md`). Colour coding: blue = student, orange = course, maroon = enrolment and the value or list a subquery returns; teal = the rows that pass; orange outline = the part of the query or the rows being discussed.
- The video sits on the website card `subqueries` (`video: 'sql-subqueries'` in `data/<lang>/sql.js`); `js/sql.js` (`SQL_VIDEOS['sql-subqueries'].chapters`) holds the chapter start times.

## Dataset
SCHOOL (`src/sql/common/school.tsx`): `student` S01 Ana Ruiz, S02 Luis Gil, S03 Eva Sanz; `course` C10 Databases, C11 Python, C20 Statistics, C30 Marketing; `enrolment` (S01 C10 8.5) (S01 C20 7.0) (S02 C10 6.5) (S02 C11 9.0) (S03 C10 5.0) (S03 C11 7.5). Average grade 43.5 / 6 = 7.25. Averages per course: C10 6.67, C11 8.25, C20 7. Nobody takes Marketing.

## Scenes
| # | Scene | Start | Length | What it shows |
|---|---|---|---|---|
| 1 | Title | 00:00 | 8 s | Logo, "Subqueries", "A query inside a query", chips WHERE · IN · ANY · ALL · Correlated · EXISTS · FROM |
| 2 | A subquery in WHERE | 00:08 | 26 s | `WHERE grade > (SELECT AVG(grade) FROM enrolment)`: the inner query runs first (AVG = 43.5 / 6 = 7.25), the value replaces it in the code; 9.0, 8.5 and 7.5 pass (3 rows, grade DESC) |
| 3 | IN with a list | 00:34 | 24 s | `student_id IN (SELECT student_id FROM enrolment WHERE course_id = 'C11')`: the guest list S02, S03; a pointer checks each student at the door; Luis Gil, Eva Sanz; `=` with a list gives ORA-01427 |
| 4 | ANY and ALL | 00:58 | 29 s | Number line with the Databases grades 5.0, 6.5, 8.5 and the others 7.0, 7.5, 9.0. `> ALL`: above the largest (8.5), only S02 C11 9.0. `> ANY` (with `course_id <> 'C10'`): above the smallest (5.0), all three rows |
| 5 | The NOT IN trap | 01:27 | 32 s | `grade NOT IN (Python grades)`: list 9.0, 7.5, 4 rows; `INSERT … ('S01', 'C11', NULL)` adds NULL to the list: no rows selected; `8.5 <> 9.0 AND 8.5 <> 7.5 AND 8.5 <> NULL` = true, true, unknown; fix: `AND grade IS NOT NULL` or NOT EXISTS |
| 6 | Correlated subquery | 01:59 | 29 s | `e.grade = (SELECT MAX(x.grade) … WHERE x.course_id = e.course_id)`: the pointer (the tutor) walks the six rows, the inner query re-runs with each row's course (MAX C10 8.5, C20 7.0, C11 9.0); result C10 S01 8.5, C11 S02 9.0, C20 S01 7.0; a tie gives several rows |
| 7 | EXISTS and NOT EXISTS | 02:28 | 25 s | `EXISTS (SELECT 1 …)`: rows found 3, 2, 1, 0 → true, true, true, false; what it selects does not matter; NOT EXISTS flips the column: Marketing; not fooled by NULLs |
| 8 | Inline view in FROM | 02:53 | 27 s | `FROM (SELECT course_id, ROUND(AVG(grade), 2) AS average … GROUP BY course_id) avg_c`: dashed temporary table C10 6.67, C11 8.25, C20 7; alias without AS; join to course, `WHERE avg_c.average >= 7`: Python 8.25, Statistics 7 |
| 9 | Outro | 03:20 | 9 s | "Practise it", Subqueries & sets in the SQL section, logo |

## Narration
The narration lives in `src/sql/subqueries/narration.json` (segment ids `sq<scene>-<n>`). After editing it, run `python scripts/tts.py --video sql/subqueries`. The script regenerates the MP3s and checks that every segment fits its scene.
