# DDL: script and timeline

- English · 1920×1080 · 30 fps · British English voice-over (no subtitles) + the same soft music as the other videos.
- Total: **03:23** (6 090 frames). The single source of timing is `src/sql/ddl/timeline.ts`; the narration is `src/sql/ddl/narration.json`.
- Times inside a scene are **local** (seconds from the scene start).
- Source: the SQL cards `sql-languages`, `ddl`, `create-table` and `alter-drop` of the website (`data/<lang>/sql.js`): the `team`/`player` tables of `create-table` and the `member` table of `alter-drop`. Oracle syntax.
- Same style as the other videos (`SCRIPT-ternary.md`, `SCRIPT-sql-joins.md`). Colour coding: teal = DDL, structure, data types and inline constraints; blue = DML and the rows; maroon = DCL, out-of-line constraints and what gets dropped; yellow = TCL; orange outline = what is being discussed. Inside `member`, a grey row under the header holds each column's type.
- The video sits on the website card `ddl` (`video: 'sql-ddl'` in `data/<lang>/sql.js`); `js/sql.js` (`SQL_VIDEOS['sql-ddl'].chapters`) holds the chapter start times.

## Dataset
From the cards, not SCHOOL (except the `student` table of scene 2). `team` (team_id PK, name, city) is the parent of `player` (player_id identity, full_name, shirt, pos, born, team_id FK; UNIQUE (team_id, shirt)). `member` (member_id, full_name) holds 1 Ana Ruiz and 2 Luis Gil; `ADD (email VARCHAR2(60), fee NUMBER(5,2) DEFAULT 20 NOT NULL)`, `MODIFY (full_name VARCHAR2(80))`, `RENAME COLUMN full_name TO member_name`, `DROP COLUMN fee`; then 3 Eva Sanz is inserted.

## Scenes
| # | Scene | Start | Length | What it shows |
|---|---|---|---|---|
| 1 | Title | 00:00 | 8 s | Logo, "DDL", chips CREATE · ALTER · DROP |
| 2 | DDL, DML, DCL, TCL | 00:08 | 26 s | Four cards (statements and what each acts on); on `student`, the header lights up for "DDL defines the structure", the rows for "DML reads and changes the rows" |
| 3 | CREATE TABLE and types | 00:34 | 35 s | `CREATE TABLE player`: name · type · constraints; cards VARCHAR2(60), NUMBER(p, s) (NUMBER(5,2) ≤ 999.99), CHAR(1), DATE, GENERATED ALWAYS AS IDENTITY (no AUTOINCREMENT) as each line lights up |
| 4 | Inline and out-of-line constraints | 01:09 | 26 s | Same code: NOT NULL and CHECK next to their columns (inline); PRIMARY KEY, FOREIGN KEY and UNIQUE (team_id, shirt) after the last column (out-of-line); named constraints instead of SYS_C… |
| 5 | Parent table first | 01:35 | 24 s | `player` created before `team`: ORA-00942 table or view does not exist; then team = 1, player = 2, FK arrow; `DROP TABLE player; DROP TABLE team;` (children first) |
| 6 | ALTER TABLE | 01:59 | 33 s | Four ALTERs on `member` with their house metaphor (add a room, enlarge a room, relabel a door, knock a wall down): email NULL and fee 20 appear, VARCHAR2(40) → (80), full_name → member_name, fee struck out; "The rows stay" |
| 7 | DDL commits | 02:32 | 15 s | INSERT Eva (pending, dashed) · implicit COMMIT · ALTER … ADD CONSTRAINT uq_member_email · implicit COMMIT · ROLLBACK: Eva's row is already permanent, nothing to undo |
| 8 | Data dictionary and DROP | 02:47 | 27 s | `USER_TABLES` → TEAM, PLAYER, MEMBER; `USER_TAB_COLUMNS` for MEMBER → MEMBER_ID, MEMBER_NAME, EMAIL (no FEE); `DROP TABLE member;` strikes MEMBER; pointer to the DROP/TRUNCATE/DELETE video |
| 9 | Outro | 03:14 | 9 s | "Practise it", SQL languages in the SQL section, logo |

## Narration
The narration lives in `src/sql/ddl/narration.json` (segment ids `dd<scene>-<n>`). After editing it, run `python scripts/tts.py --video sql/ddl`. The script regenerates the MP3s and checks that every segment fits its scene.
