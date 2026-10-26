# Beyond 3NF (BCNF, 4NF and 5NF): script and timeline

- English · 1920×1080 · 30 fps · British English voice-over (no subtitles) + the same soft music as the other videos.
- Total: **02:59** (5 370 frames). The single source of timing is `src/nfadv/timeline.ts`; the narration is `src/nfadv/narration.json`.
- Times inside a scene are **local** (seconds from the scene start).
- The narrator speaks as a database engineer reviewing a schema. Every term is defined on screen before it is used: determinant and candidate key (scene 3), multivalued dependency (scene 5), join dependency (scene 6).
- Source: the cards `mvd`, `jd`, `bcnf`, `nf4` and `nf5` of `data/<lang>/normalization-theory.js`, with the same data, gathered into one case. Colour coding: blue = people (student, teacher, lecturer), orange = subject/course, maroon = tutor/campus, teal = book. Orange outline = the rows being discussed, orange fill = a problem.
- The video sits at the top of the **Normal forms** group of the normalization section. `js/normalization-section.js` (`VIDEO_ADVANCED.chapters`) holds the chapter start times.

## Dataset
A department's teaching schema, already in 3NF (`src/nfadv/shared.tsx`):
- `Tutoring(student, subject, tutor)`: (Ana, Maths, Pérez) (Luis, Maths, Pérez) (Eva, Maths, Pérez) (Ana, Physics, Gómez). `student, subject → tutor` and `tutor → subject`; the candidate keys are {student, subject} and {student, tutor}.
- `CourseMaterial(course, teacher, book)`: Databases × {Ruiz, Gil} × {Elmasri, Date}. `course ↠ teacher | book`, all key.
- `Teaching(lecturer, course, campus)`: (Ruiz, Databases, Online) (Ruiz, Statistics, Madrid) (Gil, Databases, Madrid) (Ruiz, Databases, Madrid), under the cyclic rule "lecturer teaches course, course runs on campus, lecturer works at campus ⇒ lecturer teaches course at campus". LecturerCourse ⋈ CourseCampus adds the false row (Gil, Databases, Online), which LecturerCampus removes.

## Scenes
| # | Scene | Start | Length | What it shows |
|---|---|---|---|---|
| 1 | Title | 00:00 | 6 s | Logo, kicker NORMALIZATION, "Beyond 3NF", chips BCNF → 4NF → 5NF |
| 2 | The case | 00:06 | 14 s | The three tables, each "3NF ✓", then "BCNF?", "4NF?", "5NF?"; "Are we done? Not quite." |
| 3 | Determinant and candidate key | 00:20 | 26 s | Determinant card; the arrows `student, subject → tutor` and `tutor → subject` on Tutoring; candidate key card (minimal; {student, subject, tutor} is only a superkey); student alone repeats Ana; the two candidate keys light up |
| 4 | BCNF | 00:46 | 35 s | Rule "every determinant is a candidate key"; each dependency checked (key ✓ / not a key ✗); 3NF allowed it because subject is prime; Pérez moves to Statistics: three rows change; split into TutorSubject + Tutoring; BCNF ✓; the price: `student, subject → tutor` spans two tables |
| 5 | 4NF | 01:21 | 26 s | Every teacher × every book (four lines); multivalued dependency card; a third book adds two rows; split into CourseTeacher + CourseBook; 4NF ✓; one new book = one row |
| 6 | 5NF | 01:47 | 35 s | Teaching; the rule as a triangle (teaches, runs on, works at); join dependency card; the three pairs; the join of two pairs gives five rows with the invented one; LecturerCampus (Gil works only at Madrid) strikes it out; "5NF ✓ = Teaching"; only if the rule always holds |
| 7 | Recap | 02:22 | 9 s | Staircase 3NF → BCNF → 4NF → 5NF with one rule each; "In practice: aim for BCNF, check 4NF and 5NF when a table is all key" |
| 8 | Open questions | 02:31 | 21 s | "Think about it": three open questions, with no answers |
| 9 | Outro | 02:52 | 7 s | "Practise it", Normal forms in the Normalization section, logo |

## Narration
The narration lives in `src/nfadv/narration.json` (segment ids `na<scene>-<n>`). After editing it, run `python scripts/tts.py --video nfadv`. The script regenerates the MP3s and checks that every segment fits its scene. Render with `npm run render:nf-advanced`.
