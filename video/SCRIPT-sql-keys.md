# Primary and foreign keys: script and timeline

- English · 1920×1080 · 30 fps · British English voice-over (no subtitles) + the same soft music as the other videos.
- Total: **03:27** (6 210 frames). The single source of timing is `src/sql/keys/timeline.ts`; the narration is `src/sql/keys/narration.json`.
- Times inside a scene are **local** (seconds from the scene start).
- Source: the SQL cards `keys-unique`, `foreign-keys`, `check-default` and `create-table` of the website (`data/<lang>/sql.js`), on the SCHOOL schema. Oracle syntax. The cards do not show `ADD`/`DROP`/`DISABLE`/`ENABLE CONSTRAINT` for keys, nor `USER_CONSTRAINTS`: scenes 7 and 8 fill that gap.
- Same style as the other videos (`SCRIPT-ternary.md`, `SCRIPT-sql-joins.md`). Colour coding: blue = student, orange = course, maroon = enrolment; orange underline = primary key column, FK badge = foreign key column; orange outline = the rows or cells being discussed; orange boxes = Oracle errors.
- The video sits on the website card `keys-unique` (`video: 'sql-keys'` in `data/<lang>/sql.js`); `js/sql.js` (`SQL_VIDEOS['sql-keys'].chapters`) holds the chapter start times.

## Dataset
SCHOOL (`src/sql/common/school.tsx`): `student` S01 Ana Ruiz, S02 Luis Gil, S03 Eva Sanz (no email); `course` C10 Databases, C11 Python, C20 Statistics, C30 Marketing; `enrolment` (S01 C10 8.5) (S01 C20 7.0) (S02 C10 6.5) (S02 C11 9.0) (S03 C10 5.0) (S03 C11 7.5). `student_id` is the PK of student, `email` is UNIQUE; enrolment has the composite PK (student_id, course_id), an FK to student `ON DELETE CASCADE` and an FK to course with no action.

## Scenes
| # | Scene | Start | Length | What it shows |
|---|---|---|---|---|
| 1 | Title | 00:00 | 8 s | Logo, "Primary and foreign keys", chips PRIMARY KEY · UNIQUE · FOREIGN KEY · ON DELETE · CONSTRAINT |
| 2 | PRIMARY KEY | 00:08 | 24 s | `CREATE TABLE student` with `student_id … PRIMARY KEY`; the student_id column is underlined; PRIMARY KEY = UNIQUE + NOT NULL; many UNIQUE columns but one PK per table; Oracle builds an index on it |
| 3 | Composite key | 00:32 | 27 s | `PRIMARY KEY (student_id, course_id)` out-of-line; S01 ×2 and C10 ×3 light up, but every pair appears once; inserting (S01, C10) again fails with ORA-00001 |
| 4 | UNIQUE and NULL | 00:59 | 26 s | Eva's NULL email; `INSERT … ('S04', 'Marta Paz', NULL)` is accepted (a second NULL is never a duplicate); `INSERT … (NULL, …)` fails with ORA-01400: a PK is never NULL |
| 5 | FOREIGN KEY | 01:25 | 30 s | student, enrolment (FK badges) and course, FK arrows back to the parents; inserting an S09 enrolment fails with ORA-02291 (parent key not found); deleting C10 (3 enrolments) fails with ORA-02292 (child record found) |
| 6 | ON DELETE | 01:55 | 31 s | SCHOOL's enrolment with `ON DELETE CASCADE` on student_id; deleting S01 strikes Ana's two enrolments; cards CASCADE · SET NULL · nothing (default: rejected); Oracle has no ON UPDATE |
| 7 | Named constraints | 02:26 | 24 s | `CONSTRAINT pk_enrolment PRIMARY KEY …`, `fk_enrolment_student`, `ck_enrolment_grade` vs an unnamed SYS_C008123; `ALTER TABLE enrolment ADD CONSTRAINT fk_enrolment_course FOREIGN KEY (course_id) REFERENCES course (course_id)`; existing rows are checked first |
| 8 | Managing constraints | 02:50 | 28 s | `SELECT constraint_name, constraint_type, status FROM user_constraints`; legend P · R · U · C; `DISABLE CONSTRAINT` turns FK_ENROLMENT_COURSE DISABLED, `ENABLE` re-checks the rows, `DROP CONSTRAINT` removes it |
| 9 | Outro | 03:18 | 9 s | "Practise it", Constraints in the SQL section, logo |

## Narration
The narration lives in `src/sql/keys/narration.json` (segment ids `ky<scene>-<n>`). After editing it, run `python scripts/tts.py --video sql/keys`. The script regenerates the MP3s and checks that every segment fits its scene.
