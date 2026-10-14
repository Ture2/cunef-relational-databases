# Triggers: script and timeline

- English · 1920×1080 · 30 fps · British English voice-over (no subtitles) + the same soft music as the other videos.
- Total: **03:13** (5 790 frames). The single source of timing is `src/sql/triggers/timeline.ts`; the narration is `src/sql/triggers/narration.json`.
- Times inside a scene are **local** (seconds from the scene start).
- Source: the SQL card `triggers` of the website (`data/<lang>/sql.js`): `trg_grade_check` (BEFORE row), `trg_grade_audit` (AFTER row with WHEN, writes `grade_audit`), `trg_grade_notice` (AFTER statement), on the SCHOOL schema. Oracle PL/SQL syntax.
- Same style as the other videos (`SCRIPT-ternary.md`). Colour coding: blue = student, orange = course, maroon = enrolment and its grades (and `:OLD` / `:NEW` in the code); teal = BEFORE / accepted, orange = the event / the change / rejected, maroon = AFTER; orange outline = the row or step being discussed.
- The video sits on the website card `triggers` (`video: 'sql-triggers'` in `data/<lang>/sql.js`); `js/sql.js` (`SQL_VIDEOS['sql-triggers'].chapters`) holds the chapter start times.

## Dataset
SCHOOL (`src/sql/common/school.tsx`): the Databases (C10) enrolments (S01 C10 8.5) (S02 C10 6.5) (S03 C10 5.0). `grade_audit` (student_id, course_id, old_grade, new_grade; the card's table also has audit_id, changed_by and changed_at). The running UPDATE raises every C10 grade by 0.5: 9.0, 7.0, 5.5.

## Scenes
| # | Scene | Start | Length | What it shows |
|---|---|---|---|---|
| 1 | Title | 00:00 | 8 s | Logo, "Triggers", chips BEFORE · AFTER · FOR EACH ROW · :OLD · :NEW |
| 2 | What is a trigger? | 00:08 | 25 s | A motion-sensor light switches on when an UPDATE walks in ("Nobody calls it"); the header of `trg_grade_check`, one line each for timing, event and level; cards Event / Timing / Level |
| 3 | BEFORE row trigger | 00:33 | 32 s | `trg_grade_check`: `SET grade = 11` → `:NEW.grade = 11` → ORA-20010 "A grade cannot be above 10", the row keeps 8.5; `SET grade = 7.46` passes the check, ROUND makes `:NEW.grade` 7.5, stored |
| 4 | AFTER row trigger: audit | 01:05 | 35 s | `trg_grade_audit` with WHEN; `grade + 0.5` on C10 changes 3 rows and `grade_audit` gains 3 lines (old, new); setting S01 to 9 again: 9.0 → 9.0, WHEN is false, no audit line |
| 5 | :OLD and :NEW | 01:40 | 26 s | The S02 row before (`:OLD`, 6.5) and after (`:NEW`, 7.0) an UPDATE; grid UPDATE / INSERT / DELETE: INSERT has a NULL `:OLD`, DELETE a NULL `:NEW`; `WHEN (NEW.grade <> OLD.grade)`: no colon inside WHEN |
| 6 | Statement vs row level | 02:06 | 31 s | `trg_grade_notice` (no FOR EACH ROW: once per UPDATE); the C10 UPDATE touches 3 rows: statement trigger once, each row trigger 3 times; firing order BEFORE statement → (BEFORE row, change, AFTER row) × 3 → AFTER statement |
| 7 | Pitfalls | 02:37 | 27 s | A row trigger that queries `enrolment` → ORA-04091 table is mutating; "Hidden logic" card; "Keep triggers small"; prefer `CHECK (grade BETWEEN 0 AND 10)` |
| 8 | Outro | 03:04 | 9 s | "Practise it", PL/SQL in the SQL section, logo |

## Narration
The narration lives in `src/sql/triggers/narration.json` (segment ids `tg<scene>-<n>`). After editing it, run `python scripts/tts.py --video sql/triggers`. The script regenerates the MP3s and checks that every segment fits its scene.
