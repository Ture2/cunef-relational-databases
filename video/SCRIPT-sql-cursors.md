# Cursors: script and timeline

- English · 1920×1080 · 30 fps · British English voice-over (no subtitles) + the same soft music as the other videos.
- Total: **03:26** (6 180 frames). The single source of timing is `src/sql/cursors/timeline.ts`; the narration is `src/sql/cursors/narration.json`.
- Times inside a scene are **local** (seconds from the scene start).
- Source: the SQL card `cursors` of the website (`data/<lang>/sql.js`), with `plsql-blocks` for context. Oracle PL/SQL syntax.
- Same style as the other videos (`SCRIPT-sql-joins.md`). Colour coding: blue = student_id, orange = course_id, maroon = grade and the record `r`; the orange ▶ is the cursor (the finger on the class list); orange outline = the row under the pointer; yellow tint = rows locked by FOR UPDATE. Lifecycle chips: teal DECLARE, blue OPEN, orange FETCH, maroon CLOSE.
- The video sits on the website card `cursors` (`video: 'sql-cursors'` in `data/<lang>/sql.js`); `js/sql.js` (`SQL_VIDEOS['sql-cursors'].chapters`) holds the chapter start times.

## Dataset
The `enrolment` rows of the card `cursors`, in the cursor's `ORDER BY course_id, student_id`: (S01 C10 4.0) (S02 C10 6.5) (S03 C10 8.5) (S03 C11 7.5) (S01 C20 9.5) (S02 C20 3.0). The curve: C10 below 5 +1, below 7 +0.5; C20 +1; never above 10 → 5.0, 7.0, 8.5, 7.5, 10.0, 4.0.

## Scenes
| # | Scene | Start | Length | What it shows |
|---|---|---|---|---|
| 1 | Title | 00:00 | 8 s | Logo, "Cursors", chips DECLARE → OPEN → FETCH → CLOSE |
| 2 | Sets and rows | 00:08 | 24 s | `UPDATE … WHERE course_id = 'C10'` lights its 3 rows at once; a second copy of the table with a ▶ pointer visiting one row at a time; "A cursor is a pointer over the result of a query"; "A finger on the class list" |
| 3 | Implicit cursors | 00:32 | 22 s | INSERT · UPDATE · DELETE → an implicit cursor named SQL; the card's C11 update (7.5 → 7.75) and `DBMS_OUTPUT.PUT_LINE(SQL%ROWCOUNT …)`; output "1 Python grade(s) raised"; `SQL%ROWCOUNT = 1`, `SQL%FOUND = TRUE` |
| 4 | Explicit cursor lifecycle | 00:54 | 36 s | DECLARE / OPEN / LOOP FETCH … EXIT WHEN %NOTFOUND / CLOSE code; OPEN shows the result set with the pointer "before row 1"; six FETCHes move it down while the record `r` fills; the seventh finds "no row": `c_grades%NOTFOUND = TRUE → EXIT`; CLOSE frees it |
| 5 | Cursor attributes | 01:30 | 22 s | The card's table: %ISOPEN, %FOUND, %NOTFOUND, %ROWCOUNT, SQL%ROWCOUNT, each lit as the voice names it; explicit `c_grades%FOUND` vs implicit `SQL%FOUND` |
| 6 | Cursor FOR loop | 01:52 | 22 s | The same cursor written by hand (r, OPEN, FETCH, EXIT, CLOSE highlighted) next to `FOR r IN c_list LOOP … END LOOP;`; OPEN, FETCH, EXIT, CLOSE automatic; r declared for you; always closed, even after an error |
| 7 | FOR UPDATE and WHERE CURRENT OF | 02:14 | 36 s | The card's curve as a cursor FOR loop with `FOR UPDATE OF grade` and `UPDATE … WHERE CURRENT OF c_grades`; rows tinted as locked; the pointer walks the rows and a "curved" column fills: 4.0 → 5.0, 6.5 → 7.0, 9.5 → 10.0, 3.0 → 4.0, the others unchanged |
| 8 | Prefer set-based SQL | 02:50 | 27 s | The row-by-row loop (dimmed) vs the card's single `UPDATE enrolment SET grade = LEAST(10, grade + CASE … END)`; "The whole table at once", "Much faster"; keep cursors for several steps per row, procedure calls, decisions that depend on earlier rows |
| 9 | Outro | 03:17 | 9 s | "Practise it", PL/SQL in the SQL section, logo |

## Narration
The narration lives in `src/sql/cursors/narration.json` (segment ids `cu<scene>-<n>`). After editing it, run `python scripts/tts.py --video sql/cursors`. The script regenerates the MP3s and checks that every segment fits its scene.
