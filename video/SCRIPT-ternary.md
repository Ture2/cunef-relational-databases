# Ternary relationships: script and timeline

- English · 1920×1080 · 30 fps · British English voice-over (no subtitles) + the same soft music as the normalization video.
- Total: **02:40** (4 800 frames). The single source of timing is `src/ternary/timeline.ts`; the narration is `src/ternary/narration.json`.
- Times inside a scene are **local** (seconds from the scene start).
- Source: Jones & Song, *Analysis of binary/ternary cardinality combinations in ER modeling* (DKE 19, 1996), reduced to what a first course needs. The rule names of the paper (IBC, EBP, IBO) are not used.
- Same style as the normalization video (`SCRIPT.md`). Colour coding: blue = student, orange = course, teal = instructor. In the diagram, blue marks the entities held fixed and orange the one being counted.
- The website card `ternary` (`data/<lang>/er-concepts.js`) uses the same example, and `js/er.js` (`TERNARY_VIDEO.chapters`) holds the chapter start times.

## Dataset

`takes(student, course, instructor)`, ratio M:N:1 (Student (1,N), Course (1,N), Instructor (1,1)):

| student | course | instructor |
|---|---|---|
| Mike | Physics | Jones |
| Mike | Chemistry | Song |
| Anne | Physics | Song |

Joining its three pair projections back adds the spurious row **Mike · Physics · Song**.

## Scenes

| # | Scene | Start | Length | What it shows |
|---|---|---|---|---|
| 1 | Title | 00:00 | 8 s | Logo, "Ternary relationships", STUDENT + COURSE + INSTRUCTOR |
| 2 | One fact, three entities | 00:08 | 24 s | A binary diagram gains a third entity. "Mike · Physics · Jones" appears; with Jones dropped the fact is incomplete. The third line is drawn: ternary. With four entities it would be quaternary. |
| 3 | Fix two, look at the third | 00:32 | 30 s | Student + course are held fixed, giving (1,1) at Instructor. Course + instructor are held fixed, giving (1,N) at Student. The (1,N) at Course follows. The ratio is M : N : 1. |
| 4 | Ratios and keys | 01:02 | 22 s | Four shapes: 1:1:1, 1:1:N, 1:M:N, M:N:P. A 1 means the other entities decide that end, so they form the key: (student, course). |
| 5 | Pairs are many-to-many | 01:24 | 19 s | Mike goes with two courses and Physics with two instructors. Every pair is M:N. A pair rule has to be stated separately. |
| 6 | Not three binaries | 01:43 | 32 s | The table is split into three pair tables and joined back. The spurious row and its three source pairs are highlighted. Conclusion: keep the ternary. |
| 7 | To tables | 02:15 | 16 s | `Takes`: a FK to each entity, PK (student, course) |
| 8 | Outro | 02:31 | 9 s | "Practise it", ER concepts section, logo |

## Narration

The narration lives in `src/ternary/narration.json` (segment ids `t<scene>-<n>`). After editing it, run `python scripts/tts.py --video ternary`. The script regenerates the MP3s and checks that every segment fits its scene.
