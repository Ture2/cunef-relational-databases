# Joins: script and timeline

- English · 1920×1080 · 30 fps · British English voice-over (no subtitles) + the same soft music as the other videos.
- Total: **02:59** (5 370 frames). The single source of timing is `src/sql/joins/timeline.ts`; the narration is `src/sql/joins/narration.json`.
- Times inside a scene are **local** (seconds from the scene start).
- Source: the SQL cards `inner-join`, `outer-joins` and `cross-self-join` of the website (`data/<lang>/sql.js`), on the SCHOOL schema. Oracle syntax.
- Same style as the other videos (`SCRIPT-ternary.md`). Colour coding: blue = student, orange = course, teal = department, maroon = enrolment; orange outline = the rows being discussed. Venn diagrams: shaded = the part of each table the join keeps.
- The video sits on the website card `inner-join` (`video: 'sql-joins'` in `data/<lang>/sql.js`); `js/sql.js` (`SQL_VIDEOS['sql-joins'].chapters`) holds the chapter start times.

## Dataset
SCHOOL (`src/sql/common/school.tsx`): `student` S01 Ana Ruiz, S02 Luis Gil, S03 Eva Sanz (no email); `course` C10 Databases, C11 Python, C20 Statistics, C30 Marketing; `enrolment` (S01 C10 8.5) (S01 C20 7.0) (S02 C10 6.5) (S02 C11 9.0) (S03 C10 5.0) (S03 C11 7.5). Nobody takes Marketing.

## Scenes
| # | Scene | Start | Length | What it shows |
|---|---|---|---|---|
| 1 | Title | 00:00 | 8 s | Logo, "Joins", chips INNER · LEFT · RIGHT · FULL · CROSS · SELF |
| 2 | Why join? | 00:08 | 22 s | student, enrolment and course tables; enrolment's two FKs arc back to their parents; S01 · C10 · Databases light up: a join pairs the rows whose keys match |
| 3 | INNER JOIN | 00:30 | 30 s | `course JOIN enrolment ON e.course_id = c.course_id`; lines link each course to its enrolments (Databases ×3, Python ×2, Statistics ×1) while the 6 result rows appear; Marketing is struck out; "JOIN = INNER JOIN" |
| 4 | LEFT JOIN and anti-join | 01:00 | 30 s | LEFT JOIN: the left circle is shaded, Marketing returns with NULLs; `WHERE e.course_id IS NULL` keeps only Marketing (anti-join) |
| 5 | RIGHT and FULL | 01:30 | 24 s | `A RIGHT JOIN B = B LEFT JOIN A`; FULL OUTER JOIN of Statistics vs Python students: three rows, each with a NULL |
| 6 | CROSS JOIN | 01:54 | 18 s | 3 students × 4 courses grid filling 1…12; `FROM student s, course c` is the accidental version |
| 7 | Self-join | 02:12 | 22 s | `enrolment a JOIN enrolment b ON same course AND a.student_id < b.student_id`; the C10 rows light up in both copies; 4 pairs of classmates |
| 8 | Summary | 02:34 | 16 s | Six cards: INNER, LEFT, RIGHT, FULL (with Venns), CROSS, self-join |
| 9 | Outro | 02:50 | 9 s | "Practise it", Combining tables in the SQL section, logo |

## Narration
The narration lives in `src/sql/joins/narration.json` (segment ids `jn<scene>-<n>`). After editing it, run `python scripts/tts.py --video sql/joins`. The script regenerates the MP3s and checks that every segment fits its scene.
