# Database normalization, step by step — script and timeline

- Language: English · 1920×1080 · 30 fps · British English voice-over (no subtitles) + soft synthesized music (see "Narration" at the end)
- Total: **05:58** (10 740 frames). The single source of timing is `src/timeline.ts`.
- Captions: none are rendered. The "Caption" column of each scene below is the beat the narration explains, kept as the storyboard.
  Times inside a scene are **local** (seconds from the scene start).
- Style: CUNEF brand. Beige background `#f0ece8`, ink blue `#1a1f6c` text,
  orange `#ff5700` only for non-text accents (arrows, key underlines, highlight outlines),
  beige rules `#d6d1c4`, white table surfaces, Arial. Table colour coding
  (strong/soft): teal `#067B86/#D5EEF0` = enrollment facts, blue `#1A1F6C/#D2E0F3` = student,
  orange `#B84000/#FFE3D1` = course, maroon `#AE3C7C/#F3DCEA` = department,
  yellow `#8A5300/#FDE9CF` = 1NF / BCNF side examples.

## Dataset (used from scene 2 to scene 11)

`Enrollment` — key **(student_id, course_id)**

| **student_id** | **course_id** | student_name | course_name | credits | grade | dept_id | dept_name |
|---|---|---|---|---|---|---|---|
| S01 | C10 | Ana Ruiz | Databases | 6 | 8.5 | D01 | Computing |
| S01 | C20 | Ana Ruiz | Statistics | 6 | 7.0 | D02 | Maths |
| S02 | C10 | Luis Gil | Databases | 6 | 6.5 | D01 | Computing |
| S02 | C11 | Luis Gil | Python | 4.5 | 9.0 | D01 | Computing |
| S03 | C10 | Eva Sanz | Databases | 6 | 5.0 | D01 | Computing |
| S03 | C11 | Eva Sanz | Python | 4.5 | 7.5 | D01 | Computing |

Dependencies: `student_id → student_name`; `course_id → course_name, credits, dept_id`;
`dept_id → dept_name`; `(student_id, course_id) → grade`.
Redundancy: Ana Ruiz ×2, Databases ×3, Computing ×5. Statistics (C20) has a single enrollment.

Final 3NF design: `Student(student_id, student_name)`, `Course(course_id, course_name, credits, dept_id FK)`,
`Department(dept_id, dept_name)`, `Enrollment(student_id FK, course_id FK, grade)`.

---

## Scene 1 — Title · 00:00–00:12 (12 s)

- **On screen:** CUNEF Universidad logo (top centre, untouched, with its clear space);
  title **"Database normalization, step by step"**; subtitle **"From one wide table to a clean relational design"**;
  chips **1NF → 2NF → 3NF → BCNF**.
- **No caption box.**
- **Animation:** 0–1.5 logo fades in · 1–2.5 title rises and fades in · 2.5–4 orange bar grows under the title ·
  3.5–5 subtitle fades in · 5–7 the four chips pop in one after another · scene fades out in the last 0.3 s.

## Scene 2 — The problem: one wide table · 00:12–01:05 (53 s)

- **Heading:** "The problem: one wide table"
- **Visual:** the 8-column `Enrollment` table (6 rows). Key headers underlined in orange.
  Header tones: student columns blue, course columns orange, dept columns maroon, grade teal.

| Local | Caption | Animation |
|---|---|---|
| 0.5–6 | A university stores all its enrollments in one wide table. | Heading fades in; rows fade/slide in one by one. |
| 6–12 | Its key is (student_id, course_id): one row per student and course. | The two key header cells get an orange outline pulse. |
| 12–19 | Look closer: Ana Ruiz appears twice, Databases three times, Computing five times. | Repeated cells highlight in turn: Ana Ruiz (blue), Databases (orange), Computing (maroon). |
| 19–24.5 | That is redundancy: one fact stored many times. It leads to three anomalies. | Highlights stay, then fade at 24. |
| 24.5–29 | Update anomaly: we rename course C10 in just one row… | Callout "Update anomaly". Row 1 course_name flips "Databases" → "Databases I" (orange outline). |
| 29–34 | …so C10 now has two different names. The data is inconsistent. | The other two "Databases" cells get an orange outline too. |
| 34–38.5 | Insert anomaly: a new course, C30 Marketing, has no students yet. | Callout "Insert anomaly". A dashed ghost row slides in: `? · C30 · ? · Marketing · 6 · ? · D03 · Business`. |
| 38.5–43.5 | It can't be stored: student_id is part of the key, so it can't be empty. | The empty student_id cell gets an orange outline; the ghost row is crossed out, then fades. |
| 43.5–48 | Delete anomaly: Ana drops Statistics, the course's only enrollment. | Callout "Delete anomaly". Row S01·C20 highlights. |
| 48–53 | Deleting that row also erases course C20 and the Maths department. | The row is struck through and fades; "Statistics / Maths" lost. |

## Scene 3 — What normalization is · 01:05–01:40 (35 s)

- **Heading:** "What is normalization?"
- **Visual:** definition card: *"Decompose tables, guided by functional dependencies, so that each fact is stored once."*
  Two columns: **Pros** (teal) — Less redundancy · Integrity: no anomalies · Simpler updates · Less storage.
  **Cons** (orange) — More tables and joins · Slower reads for some queries · More design effort.
  Banner (maroon): *"Denormalization: a deliberate trade-off for read-heavy analytics."*

| Local | Caption | Animation |
|---|---|---|
| 0–6.5 | Normalization decomposes a table into smaller tables, guided by functional dependencies. | Heading and definition card fade in. |
| 6.5–11 | The goal: every fact is stored once, in one place. | "stored once" bar under the card grows. |
| 11–19 | Pros: less redundancy, no anomalies, simpler updates and less storage. | Pros items slide in at 11, 12.5, 14, 15.5. |
| 19–27 | Cons: more tables and joins, slower reads for some queries, and design effort. | Cons items slide in at 19, 20.5, 22. |
| 27–35 | Denormalizing on purpose is a valid trade-off for read-heavy analytics. | Denormalization banner rises in. |

## Scene 4 — Functional dependency X → Y · 01:40–02:25 (45 s)

- **Heading:** "Functional dependency  X → Y"
- **Visual:** left, a 5-column view of Enrollment (student_id, course_id, student_name, course_name, grade);
  right, a card with "X → Y" and a growing list of checked statements.

| Local | Caption | Animation |
|---|---|---|
| 0–6 | A functional dependency X → Y: each value of X determines exactly one Y. | Table and card fade in. |
| 6–12.5 | Rows with student_id S01 always carry the same name: Ana Ruiz. | Rows S01 highlight (blue) on student_id and student_name. |
| 12.5–18.5 | The same holds for S02 and S03. So student_id → student_name. | S02 rows (12.5), S03 rows (15.5); orange arrow student_id → student_name draws 14–17; card line "student_id → student_name ✓". |
| 18.5–25 | student_id is the determinant; student_name is the dependent. | Labels "determinant" / "dependent" appear under the two columns. |
| 25–32 | Counter-example: S01 has grade 8.5 in one row and 7.0 in another. | S01 grade cells highlight (maroon, orange outline); crossed arrow student_id ↛ grade; card line "student_id ↛ grade ✗". |
| 32–38 | So student_id does not determine grade: grade needs the whole key (student_id, course_id). | Crossed arrow fades, student_name arrow dims; bracket over both key columns, teal arrow to grade; card line "(student_id, course_id) → grade ✓". |
| 38–45 | Dependencies come from the meaning of the data, not from one sample. | Everything holds. |

## Scene 5 — Full vs partial dependency · 02:25–02:55 (30 s)

- **Heading:** "Full vs partial dependency"
- **Visual:** header strip of Enrollment (8 columns). Arrows above = full, below = partial.

| Local | Caption | Animation |
|---|---|---|
| 0–6 | The key of Enrollment is composite: (student_id, course_id). | Strip fades in; orange bracket "key" over the two key headers. |
| 6–12 | grade depends on the whole key. That is a full dependency. | Teal arrow from the bracket to grade, label "full". |
| 12–18.5 | student_name depends on student_id alone, just part of the key: a partial dependency. | Blue arrow below: student_id → student_name, label "partial". |
| 18.5–25 | course_name, credits, dept_id and dept_name depend on course_id alone: partial too. | Orange line from course_id runs below the strip; four arrow heads rise into the four columns, label "partial". |
| 25–30 | 2NF removes partial dependencies. | Chip "→ 2NF" appears. |

## Scene 6 — Transitive dependency · 02:55–03:20 (25 s)

- **Heading:** "Transitive dependency"
- **Visual:** 4-column view (course_id, course_name, dept_id, dept_name), 6 rows.

| Local | Caption | Animation |
|---|---|---|
| 0–6 | Now follow a chain: course_id → dept_id → dept_name. | Arrow course_id → dept_id (1–3), then dept_id → dept_name (3–5). |
| 6–12 | dept_name describes the department, not the course. | D01 / Computing cells highlight (maroon). |
| 12–19 | It depends on the key only through dept_id, which is not a key attribute. | Dashed arrow course_id ⇢ dept_name, label "only via dept_id". |
| 19–25 | That is a transitive dependency. 3NF removes it. | Chip "→ 3NF" appears. |

## Scene 7 — First normal form (1NF) · 03:20–03:45 (25 s)

- **Heading:** "First normal form (1NF)"
- **Visual:** `Student` table with a multi-valued `phones` cell: S01 · Ana Ruiz · "611 111 111, 622 222 222".

| Local | Caption | Animation |
|---|---|---|
| 0–6 | 1NF: every cell holds a single, atomic value. No lists, no repeating groups. | Table fades in. |
| 6–12 | Here one cell holds two phone numbers. That breaks 1NF. | The phones cell gets a yellow highlight + orange outline. |
| 12–19 | Split it: one row per phone. Now every value is atomic. | Rows below slide down; second phone slides into a new row; header becomes "phone"; key becomes (student_id, phone). |
| 19–25 | Our Enrollment table already met 1NF: one value in every cell. | Badge "1NF ✓". |

## Scene 8 — Second normal form (2NF) · 03:45–04:25 (40 s)

- **Heading:** "Second normal form (2NF)"
- **Visual:** wide Enrollment → Student (left) · Enrollment (centre) · Course (right). Keys underlined, FK badges.

| Local | Caption | Animation |
|---|---|---|
| 0–6 | 2NF: 1NF, and no non-key attribute depends on only part of the key. | Wide table fades in; partially dependent columns tint (blue / orange). |
| 6–13 | student_name depends on student_id alone: it moves to Student. | student_id (copy) + student_name fly (small arc) to `Student`; the key columns slide right to close the gap; duplicate rows fade and collapse (6 → 3 rows). |
| 13–21 | The course columns depend on course_id alone: they move to Course. | course_id (copy) + course_name, credits, dept_id, dept_name fly to `Course` while grade slides next to the key; dedupe 6 → 3. |
| 21–29 | Enrollment keeps the full key and grade. Both key columns are now foreign keys. | FK badges appear on Enrollment.student_id and Enrollment.course_id. |
| 29–35 | Each student and each course is now stored once. | "Ana Ruiz" (Student) and "Databases" (Course) get an orange outline. |
| 35–40 | New courses need no students; a rename touches one row. | Hold. |

## Scene 9 — Third normal form (3NF) · 04:25–05:00 (35 s)

- **Heading:** "Third normal form (3NF)"
- **Visual:** starts from the 2NF layout.

| Local | Caption | Animation |
|---|---|---|
| 0–6 | 3NF: 2NF, and no non-key attribute depends on another non-key attribute. | Hold the 2NF layout. |
| 6–13 | In Course, dept_name depends on dept_id, not directly on course_id. | Chain arrows below Course: course_id → dept_id → dept_name. |
| 13–21 | Move it to Department, keyed by dept_id. Course keeps dept_id as a foreign key. | dept_id (copy) + dept_name drop down into `Department`; dedupe 3 → 2; dept_name leaves Course; FK badge on Course.dept_id. |
| 21–28 | Computing is now stored once: renaming a department is one update. | "Computing" cell highlights. |
| 28–35 | Four tables, each fact in exactly one place. The design is in 3NF. | Badge "3NF ✓". |

## Scene 10 — Boyce–Codd normal form (BCNF) · 05:00–05:25 (25 s)

- **Heading:** "Boyce–Codd normal form (BCNF)"
- **Visual:** `Tutoring(student, subject, teacher)`, key (student, subject):
  Ana·Databases·Prof. Mora · Ana·Statistics·Prof. Vidal · Luis·Databases·Prof. Mora · Eva·Databases·Prof. Castro.

| Local | Caption | Animation |
|---|---|---|
| 0–6 | BCNF is stricter than 3NF: every determinant must be a candidate key. | Table fades in. |
| 6–12 | Rule: each teacher teaches one subject, so teacher → subject. | Arrow teacher → subject. |
| 12–18 | But teacher is not a candidate key: Prof. Mora appears in two rows. | Mora rows highlight. |
| 18–25 | Split on it: Teaches (teacher, subject) and Tutoring (student, teacher). | Two new tables fade in on the right; the original dims. |

## Scene 11 — Lossless join and recap · 05:25–05:48 (23 s)

- **Heading:** "Lossless join" → "Recap"
- **Visual:** formula `Enrollment ⋈ Student ⋈ Course ⋈ Department`, then the original wide table rebuilds row by row; then a 4-step ladder.

| Local | Caption | Animation |
|---|---|---|
| 0–5.5 | Lossless join: join the tables back on their keys… | Formula chips appear one by one. |
| 5.5–11 | …and exactly the original six rows reappear. Nothing lost, nothing invented. | Wide table rows appear one by one; "6 rows = 6 rows ✓". |
| 11–17 | Recap: each normal form removes one kind of problem. | Table fades; ladder steps rise: 1NF "One atomic value per cell" · 2NF "No partial dependencies" · 3NF "No transitive dependencies" · BCNF "Every determinant is a candidate key". |
| 17–23 | Each step builds on the previous one: 1NF → 2NF → 3NF → BCNF. | Hold the ladder. |

## Scene 12 — Outro · 05:48–05:58 (10 s)

- **On screen:** **"Practise it"** · "the Normalization section of the Databases practice site" · CUNEF logo.
- **No caption box.**
- **Animation:** 0–1.5 text fades in · 1–2.5 logo fades in · scene fades out in the last 0.3 s.

---

## Narration (voice-over)

- Voice: **en-GB-SoniaNeural** (Microsoft neural, via edge-tts), rate +0%. Each segment is loudness-normalised to −16 LUFS.
- Source of truth: `src/narration.json` (id, scene, startSec local to the scene, text, measured durationSec).
  Regenerate with `python scripts/tts.py`; it fails if a segment ends < 0.4 s before the next one or runs past its scene.
- Music: `public/audio/music.wav`, synthesized by `python scripts/music.py` (C–G–Am–F pad + soft arpeggio, low-passed, 2 s fade-in, 4 s fade-out).
  Level 0.12, ducked to 0.05 under the voice with 0.3 s ramps (`src/components/Music.tsx`).
- Each segment starts at or just after the caption/animation it explains. The voice may say more or less than the caption, never something different.
- No scene durations changed: every segment fits inside the existing timeline.


### Scene 1 — Title

| Id | Local start | Global | Length | Spoken text |
|---|---|---|---|---|
| s01-01 | 1.0 s | 00:01.0 | 8.9 s | Database normalization, step by step. In this video, we'll take one messy table and turn it into a clean relational design. |

### Scene 2 — The problem

| Id | Local start | Global | Length | Spoken text |
|---|---|---|---|---|
| s02-01 | 0.5 s | 00:12.5 | 4.9 s | Imagine a university that stores all its enrollments in one wide table. |
| s02-02 | 6.0 s | 00:18.0 | 4.7 s | The key is student ID plus course ID: one row per enrollment. |
| s02-03 | 12.0 s | 00:24.0 | 6.5 s | Look closer: Ana Ruiz twice, Databases three times, Computing five times. |
| s02-04 | 19.0 s | 00:31.0 | 3.7 s | That's redundancy, and it causes three anomalies. |
| s02-05 | 24.5 s | 00:36.5 | 8.3 s | First, the update anomaly. We rename course C10 in just one row, and now the same course has two different names. |
| s02-06 | 34.0 s | 00:46.0 | 9.1 s | Insert anomaly: course C30, Marketing, has no students yet. It can't be stored, because the key needs a student ID. |
| s02-07 | 43.5 s | 00:55.5 | 8.5 s | Delete anomaly: Ana drops Statistics. Deleting that one row also erases course C20 and the Maths department. |

### Scene 3 — What normalization is

| Id | Local start | Global | Length | Spoken text |
|---|---|---|---|---|
| s03-01 | 0.3 s | 01:05.3 | 6.2 s | Normalization decomposes a table into smaller ones, guided by functional dependencies. |
| s03-02 | 7.0 s | 01:12.0 | 2.9 s | The goal: store each fact once. |
| s03-03 | 11.0 s | 01:16.0 | 6.2 s | The benefits: less redundancy, no anomalies, simpler updates, and less storage. |
| s03-04 | 19.0 s | 01:24.0 | 6.5 s | The costs: more tables and more joins, slower reads for some queries, and more design effort. |
| s03-05 | 27.0 s | 01:32.0 | 7.1 s | That's why some systems denormalize on purpose: for read-heavy analytics, it can be a sensible trade-off. |

### Scene 4 — Functional dependency

| Id | Local start | Global | Length | Spoken text |
|---|---|---|---|---|
| s04-01 | 0.3 s | 01:40.3 | 5.0 s | X determines Y means each value of X fixes exactly one Y. |
| s04-02 | 6.3 s | 01:46.3 | 5.8 s | Look at student S01. Both rows show the same name: Ana Ruiz. |
| s04-03 | 12.5 s | 01:52.5 | 5.0 s | The same goes for every student: student ID determines student name. |
| s04-04 | 18.7 s | 01:58.7 | 4.9 s | Student ID is the determinant, and student name is the dependent. |
| s04-05 | 25.0 s | 02:05.0 | 5.8 s | Counter-example: S01 got eight point five in one course, and seven in another. |
| s04-06 | 32.0 s | 02:12.0 | 4.9 s | So student ID alone doesn't determine grade: it needs the whole key. |
| s04-07 | 38.3 s | 02:18.3 | 5.8 s | Remember: dependencies come from what the data means, not from one sample of rows. |

### Scene 5 — Full vs partial

| Id | Local start | Global | Length | Spoken text |
|---|---|---|---|---|
| s05-01 | 0.3 s | 02:25.3 | 5.1 s | Enrollment has a composite key: student ID and course ID together. |
| s05-02 | 6.3 s | 02:31.3 | 4.2 s | Grade depends on the whole key. That's a full dependency. |
| s05-03 | 12.3 s | 02:37.3 | 4.9 s | Student name depends on student ID alone: a partial dependency. |
| s05-04 | 18.6 s | 02:43.6 | 4.1 s | The course and department columns depend on course ID alone. |
| s05-05 | 25.0 s | 02:50.0 | 4.1 s | Second normal form removes these partial dependencies. |

### Scene 6 — Transitive

| Id | Local start | Global | Length | Spoken text |
|---|---|---|---|---|
| s06-01 | 0.3 s | 02:55.3 | 5.4 s | Follow the chain: course ID, then department ID, then department name. |
| s06-02 | 6.3 s | 03:01.3 | 4.1 s | Department name describes the department, not the course. |
| s06-03 | 12.2 s | 03:07.2 | 5.0 s | It reaches the key only through department ID, which isn't a key attribute. |
| s06-04 | 19.0 s | 03:14.0 | 4.7 s | That's a transitive dependency, and third normal form removes it. |

### Scene 7 — 1NF

| Id | Local start | Global | Length | Spoken text |
|---|---|---|---|---|
| s07-01 | 0.3 s | 03:20.3 | 5.0 s | First normal form: one atomic value per cell. No lists. |
| s07-02 | 6.3 s | 03:26.3 | 5.0 s | Here, one cell holds two phone numbers. That breaks the rule. |
| s07-03 | 12.3 s | 03:32.3 | 5.2 s | We split it: one row per phone. Now every value is atomic. |
| s07-04 | 19.0 s | 03:39.0 | 3.8 s | Our Enrollment table already meets first normal form. |

### Scene 8 — 2NF

| Id | Local start | Global | Length | Spoken text |
|---|---|---|---|---|
| s08-01 | 0.3 s | 03:45.3 | 5.4 s | Second normal form: no non-key attribute may depend on just part of the key. |
| s08-02 | 6.3 s | 03:51.3 | 5.5 s | Student name depends on student ID alone, so it moves to a new Student table. |
| s08-03 | 13.3 s | 03:58.3 | 6.2 s | The course columns depend on course ID alone, so they move to a Course table, one row per course. |
| s08-04 | 21.3 s | 04:06.3 | 6.1 s | Enrollment keeps the full key and the grade. Its two key columns are now foreign keys. |
| s08-05 | 29.3 s | 04:14.3 | 4.5 s | Now each student, and each course, is stored exactly once. |
| s08-06 | 35.0 s | 04:20.0 | 4.4 s | New courses need no students, and renames touch one row. |

### Scene 9 — 3NF

| Id | Local start | Global | Length | Spoken text |
|---|---|---|---|---|
| s09-01 | 0.3 s | 04:25.3 | 5.4 s | Third normal form: no non-key attribute depends on another non-key attribute. |
| s09-02 | 6.3 s | 04:31.3 | 6.0 s | In Course, department name depends on department ID, not directly on course ID. |
| s09-03 | 13.3 s | 04:38.3 | 6.1 s | It moves to a Department table keyed by department ID, which Course keeps as a foreign key. |
| s09-04 | 21.3 s | 04:46.3 | 5.4 s | Computing is now stored once, so renaming a department is a single update. |
| s09-05 | 28.3 s | 04:53.3 | 5.4 s | Four tables, each fact in one place: the design is in third normal form. |

### Scene 10 — BCNF

| Id | Local start | Global | Length | Spoken text |
|---|---|---|---|---|
| s10-01 | 0.3 s | 05:00.3 | 5.4 s | Boyce-Codd normal form is stricter: every determinant must be a candidate key. |
| s10-02 | 6.3 s | 05:06.3 | 5.2 s | Here, each teacher teaches one subject, so teacher determines subject. |
| s10-03 | 12.3 s | 05:12.3 | 5.1 s | But teacher isn't a candidate key: Professor Mora appears in two rows. |
| s10-04 | 18.4 s | 05:18.4 | 6.3 s | So we split: Teaches, with teacher and subject, and Tutoring, with student and teacher. |

### Scene 11 — Lossless join + recap

| Id | Local start | Global | Length | Spoken text |
|---|---|---|---|---|
| s11-01 | 0.3 s | 05:25.3 | 3.0 s | Now join the tables back on their keys, |
| s11-02 | 5.5 s | 05:30.5 | 3.5 s | and exactly the original six rows come back. |
| s11-03 | 11.0 s | 05:36.0 | 4.2 s | To recap: each normal form removes one kind of problem. |
| s11-04 | 17.0 s | 05:42.0 | 3.9 s | Each form builds on the previous one, up to Boyce-Codd. |

### Scene 12 — Outro

| Id | Local start | Global | Length | Spoken text |
|---|---|---|---|---|
| s12-01 | 0.5 s | 05:48.5 | 5.4 s | Now practise it, in the Normalization section of the Databases practice site. |
