# The game's visual system (arcade cabinet)

> **Round 4 (current):** game-first and always light. The page is the SQL quiz "Query for a Million"
> (`docs/game-quiz.md`). The light tokens, type and shapes below still apply; **the dark tokens are gone**
> (the game and its tour never follow a dark site theme). The layout is in "Round 4: game-first, light only"
> at the end of this file; rounds 2 and 3 are history.

## Round 2 (history): Operation SELECT

Brief from the teacher, in their words:
1. An onboarding that familiarises students with the game: explain the game, a blurred first screen that lets
   students jump into the game, transitions explaining the mode, the options, the controls… and one little example.
2. Better visuals: not "AI slop"; more intuitive at first sight.
3. A real light theme (today the game is dark only). Not a "futuristic" style: a classic arcade style.
4. Spanish too. The schema (table names, columns, codes such as 'BLUE', 'MOVE') stays in English.

The game rules, the database layer and the save format do not change. `docs/game-design.md` stays the contract
for those.

## Direction: "arcade cabinet and its instruction card"

A classic 1980s arcade game, not a sci-fi HUD. Flat primary colours, thick ink outlines, hard offset shadows
(no blur, no glow, no gradients, no scanlines, no neon), chunky bitmap type for short display text, pixel
details (stepped corners, dithered fog). The light theme reads like the printed instruction card glued to a
cabinet; the dark theme is the same cabinet in a dark arcade hall. Both themes use the same shapes. Only the
colours change.

**Where the boldness goes: the marquee and the map.** The marquee is the yellow title band at the top of the
game. Everything else stays quiet: cards are flat with a 2px ink border and no shadow. Only the primary buttons
and the map frame get the hard offset shadow.

### Colour tokens (CSS custom properties on `.wr-game`; the renderer has the same values in JS)

Round 4: the **Dark** column is gone. The game uses the Light values only, whatever the site's theme.

| Token | Light (instruction card) | Dark (gone in round 4) | Use |
|---|---|---|---|
| `--wr-bg` | `#e8eefc` | `#17123a` | game background around the cards |
| `--wr-panel` | `#ffffff` | `#241c57` | cards |
| `--wr-ink` | `#1c1838` | `#f5f2ff` | text |
| `--wr-edge` | `#1c1838` | `#6a5fc4` | 2px card borders, outlines |
| `--wr-shadow` | `#1c1838` | `#09061f` | hard offset shadow (`4px 4px 0`) |
| `--wr-muted` | `#4f4a72` | `#c1b9ec` | secondary text (≥ 4.5:1 on panel) |
| `--wr-p1` | `#1660e8` | `#5aa8ff` | BLUE, the player (text-safe on panel) |
| `--wr-p2` | `#d61f3a` | `#ff6377` | RED, the enemy (text-safe on panel) |
| `--wr-coin` | `#ffc21a` | `#ffc21a` | gold fills (ink text on it) |
| `--wr-coin-text` | `#8a5a00` | `#ffd34d` | gold as text |
| `--wr-ok` | `#127a43` | `#4fe08f` | success text |
| `--wr-marquee` | `#ffcf1f` | `#ffcf1f` | title band (ink `#1c1838` text in both themes) |
| `--wr-start` | `#ff5700` | `#ff5700` | the End turn "start button" (ink `#1c1838` text, 5.5:1) |
| `--wr-screen` | `#f4f7ff` | `#120e2e` | console textarea and query results |

~~The theme follows the site: light by default; dark under the site's selectors.~~ Round 4: always light;
`color-scheme: light` is pinned on `.wr-game` and `.gi`, and there are no dark-theme blocks in `game.css` or
`game-intro.css`.

### Type
- **Silkscreen** (Google Fonts, weights 400 and 700, `display=swap`; it has Latin-ext for á é í ó ú ñ ¿ ¡). Used
  for short display text only: the title, HUD numbers, button labels, card headings, step numbers and the
  canvas banner. Use mixed case, not all caps, with letter-spacing of 0 to .02em.
  Fallback: `"Arial Black", Arial, sans-serif`.
- Body text: the site's `--sans`. SQL and data: the site's `--mono`.
- Scale: title 2rem (1.5rem on phones), card headings 1.05rem, HUD numbers 1.5rem, body .95rem/1.55.

### Shapes
- Corners are 0, or a 4px stepped "pixel" notch (`clip-path` polygon) on buttons and the marquee. No pill
  shapes, except the small status badges.
- Buttons are flat fills with a 2px ink border and a `3px 3px 0` hard shadow. When pressed, they move by
  `translate(2px, 2px)` and the shadow shrinks to `1px 1px 0`.
- Focus: a 3px outline in `--wr-p1`, offset 2px, always visible with the keyboard.

### Layout (must stay recognisable; ids and `data-fid` hooks are kept)
```
┌ marquee ─────────────────────────────────────────────────────────────────────────────┐
│ OPERATION SELECT   Turn 3 │ Gold 120 +20 │ Units 5 │ Enemies 2 │ HQ 80/80   [?][EN|ES][☀☾] │
├ controls ────────────────────────────────────────────────────────────────────────────┤
│ [New game] [Undo turn]                                              [ End turn ▶▶ ] │
├──────────────── map 3fr ──────────────────┬──────────── side 2fr ────────────────────┤
│ canvas (coordinates on the edges)          │ Mission card 3/8 (steps, goal, hints)    │
│ legend: unit glyphs + terrain swatches     │ Turn loop: 1 Look → 2 Order → 3 End turn │
│ info line (hover/click)                    │ Console: snippet chips, textarea, Run    │
│ turn report                                │ Intel: schema                            │
└────────────────────────────────────────────┴──────────────────────────────────────────┘
```

### Making it intuitive at first sight
- **Map legend** under the map: each unit glyph with its name, the five terrain swatches, "fog = not seen".
  The legend is HTML, drawn with the same colours.
- **Turn loop strip** above the console. It is a real sequence, so it is numbered: 1 Look (`SELECT`),
  2 Order (`INSERT INTO orders`), 3 End turn. A strip step is highlighted when it applies: "Look" after a
  SELECT runs, "Order" after a row goes into orders or recruits, and "End turn" while there are pending
  orders.
- **Snippet chips** above the textarea, each inserting ready SQL that the student can edit: "My units",
  "Enemies in sight", "Order a move", "Recruit", "My gold". "Order a move" uses the selected BLUE unit and the
  clicked cell when there are some, and placeholders otherwise.
- The HUD gets a **How to play** button (it reopens the onboarding), a language switch (EN | ES, calling the
  global `setLang`) and a theme switch (light or dark, calling the global `setTheme`, then repainting the
  canvas).

## Onboarding (`js/game-intro.js` → global `GameIntro`, styles in `game-intro.css`)
```
GameIntro.open({ onClose })   // shows the overlay over the live game page; onClose(reason: 'play'|'skip')
GameIntro.close()             // closes without calling onClose a second time
GameIntro.isOpen() → bool
GameIntro.seen() → bool       // localStorage 'game-intro-seen' === '1' (try/catch; false if storage blocked)
GameIntro.markSeen()
```
- It is opened by `GamePage` after the page mounts, when `!GameIntro.seen()`, and by the **How to play**
  button. The overlay is appended inside `section.wr-game` (so it uses the colour tokens) with
  `position: fixed`.
- **Screen 0 (attract screen):** the live game, blurred behind (`backdrop-filter: blur(8px)` plus a
  translucent `--wr-bg`). On top: the marquee title, the tagline, a primary **Start the briefing** button and
  a secondary **Skip to the game** button.
- **Screens 1 to 5**, with a dots or step indicator "2 of 5", Back and Next buttons, the arrow keys, and Esc to
  skip:
  1. *The game*: who you are, who the enemy is, how you win or lose, and that it is played in turns.
  2. *How you play*: you never drag units. You command with SQL, and the tables are your army. The loop:
     Look → Order → End turn.
  3. *The screen and controls*: a spotlight on each real element in turn. The overlay keeps the blur
     everywhere except a clear cut-out around the element (a `clip-path` polygon with a hole). Elements, in
     order: `.wr-stats` (HUD), `.wr-board-frame` (the map: hover to inspect, click to type x, y),
     `#wr-mission` (the mission card: hint, example, reward), `.wr-console` (Run, or Ctrl+Enter),
     `[data-fid="game-end"]` (End turn), and `#wr-intel` (the tables you can read and write). Each element
     gets one short caption, placed next to the cut-out.
  4. *Your options*: missions and gold rewards, hints, Insert example, Undo turn, New game, How to play,
     language and theme.
  5. *A little example*: a mini board (CSS grid, about 7×4 cells) with one blue and one red token. It types
     `SELECT unit_id, x, y FROM units WHERE side = 'RED';`, shows a two-column result, types
     `INSERT INTO orders (unit_id, action, target_x, target_y) VALUES (2, 'MOVE', 4, 1);`, presses a fake End
     turn, and the blue token slides. There is a Replay button. The last button is **Play**.
- **Transitions:** one slide or fade of about 280ms between screens, and the spotlight moves smoothly. With
  `prefers-reduced-motion` (`reduceMotion` from `js/core.js`): no movement, the example shows its end state,
  and Replay steps through it instantly.
- **Accessibility:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby`; focus is trapped inside; focus
  returns to the How to play button, or the game title, when it closes; the spotlight captions are real text.
- **Texts:** `GAME_TEXT.tour` in `data/en/game.js` and `data/es/game.js` (button labels included, so no `t()`
  keys are needed). The SQL in the example stays in English.

## Canvas (`js/game-render.js`)
- New option `create(canvas, { …, theme: 'light' | 'dark' })` and new method `r.setTheme(theme)`, which
  repaints the cached layers. The default is `'light'`. The rest of the §7 API is unchanged.
- Arcade tiles: flat colour per terrain with a small pixel-step texture and 1px tile seams. Forest: chunky
  round trees with an ink outline. Hill: stepped contour blocks. Ruins: broken blocks. Water: two-tone with
  pixel wave dashes. No soft gradients or vignettes.
  - Light: plain `#9ed36a`, forest `#3f9a4a`, hill `#d8b46a`, ruins `#b9a99a`, water `#4cb4ff`.
  - Dark (dusk): plain `#3f7a3c`, forest `#1f5233`, hill `#8a6d3b`, ruins `#6b6158`, water `#1f5fa8`.
- **Fog = dither**: a 2×2 checkerboard of the fog colour over unseen cells (light `#e8eefc`, dark `#17123a`),
  plus a 50% flat wash, so terrain shows through faintly.
- **Units**: a flat token in the side colour with a 2px ink outline and a hard 2px drop shadow; a white glyph
  with an ink outline; the HQ is larger. HP bar: a blocky 3-segment colour bar with an ink outline.
  The selected unit gets a blinking pixel bracket (static with reduced motion).
- **Effects**: tracers as pixel dashes, hits as square pixel particles, a destroyed unit as a 3-frame pixel
  burst. No bloom. Screen shake: keep it, but small.
- **Banner**: Silkscreen if `document.fonts.check('16px Silkscreen')`, else the heavy fallback; drawn on a
  yellow marquee strip with ink text.
- Coordinates on the map edges stay, and are larger. Students query by x and y.

## Who owns what in this round (no file has two owners)
- **R (canvas)**: `js/game-render.js`.
- **U (page)**: `game.css`, `js/game.js`, `i18n/es-game.js`, `index.html` (the Silkscreen link, plus the
  `game-intro.css` link and the `js/game-intro.js` script before `js/game.js`).
- **O (onboarding)**: `js/game-intro.js` (new), `game-intro.css` (new), `data/en/game.js`, `data/es/game.js`
  (`tour` only), `tools/check-game-text.mjs` (accept and check `tour`).
- **T (tests, after R, U and O)**: `tools/check-game.mjs`, README test notes.

## Progress log (for resuming after a stop)
- [x] R canvas  - [x] U page  - [x] O onboarding  - [x] T tests  - [x] review and screenshots
- 2026-11-03: R, U and O launched in parallel (scratch output in the session scratchpad r\, u\, o\).
- 2026-11-04: all three stopped at the 5-hour usage limit mid-task, and were resumed when it reset.
- R done: arcade canvas, `theme` option, `setTheme()`. U done: page redesign; check-game with the tour suppressed
  is 129 ok. The orchestrator collapsed the mission card's Command briefing whenever GameIntro exists.
  Waiting on O, then T: add `game-intro-seen` to check-game's init script, plus tour, theme and language checks.
- O done: GameIntro tour; check-game-text passes; its own harness passes 64/64. T launched to update check-game.mjs
  and run every suite.
- T done: every suite passes, and check-game is 269 ok (en + es). T found the tour title white on yellow in the
  dark theme; the orchestrator fixed the selector in game-intro.css and verified it is ink (#1c1838).
  Round complete; nothing committed.


## Round 3: the quiz (contract for this round)

Same cabinet, new game. Where the boldness goes now: **the marquee and the prize ladder.** The ladder replaces the
map as the one loud element; everything else stays quiet (flat cards, 2px ink borders, no shadow).

### Layout
```
┌ marquee ─────────────────────────────────────────────────────────────────────────────────┐
│ QUERY FOR A MILLION   SQL-Bot: "Rung 7 for 10,000 €. Medium band."        [?][EN|ES][☀☾] │
├──────────────────────── main 3fr ─────────────────────────┬────────── ladder 1fr ────────┤
│ Question card: [7] 10,000 € · Medium                       │ 15  1,000,000 €              │
│   prompt (typed), columns in `code`                        │ 14    600,000 €              │
│ Lifelines: [key] Key clause  [▤] Template  [?] Review      │ …                            │
│   lifeline output (when used)                              │ 10     75,000 €  SAFE        │
│ Console: snippet chips · textarea · [Run] [LOCK IN ▶]      │ ▶7     10,000 €  ← current   │
│   result / messages                                        │ 5       2,500 €  SAFE        │
│ Schema: customers · games · sales (columns, types)         │ 1         100 €  ✓           │
│                                                            │ [Walk away with 5,000 €]     │
└────────────────────────────────────────────────────────────┴──────────────────────────────┘
```
Phones (< 720px): the ladder becomes a compact strip under the marquee ("Rung 7 · 10,000 € · safe 2,500 €")
with a `details` that opens the full ladder; the main column follows.

### Components
- **Ladder rungs**: a row per rung, rung number in Silkscreen on the left, prize right-aligned (tabular).
  - Current: `--wr-marquee` fill, ink text, 2px ink border, the `3px 3px 0` hard shadow and a pixel ▶.
  - Done: muted text and a pixel check.
  - Safe rungs (5, 10): a 2px double ink border and a small "Safe" badge.
  - Top rung (15): one size larger.
  - Under the ladder: Walk away, a secondary button that shows the amount you would take.
- **Lifeline buttons**: three square arcade buttons (about 64px) with a small inline-SVG pixel icon (a key, a
  stencil sheet, a magnifier) and the name below in Silkscreen.
  - Used: muted, with a 2px ink diagonal strike (a pseudo-element, not a gradient), `disabled`.
  - Their output appears in a flat card under the buttons.
- **Lock in**: the orange `--wr-start` "start button" (it was End turn), the one primary action. Run is a
  secondary button.
- **Suspense**: the current rung blinks in 3 hard steps (`steps()`, no easing), while the host line reads
  "Let's ask the database…".
  - Correct: the rung flashes `--wr-ok` once and the ▶ climbs.
  - Wrong: the rung flashes `--wr-p2`.
  - No shake and no particles. Reduced motion: no blink, the result at once.
- **Confirm and rescue dialogs**: a flat panel with a marquee-yellow header strip, 2px ink border and hard
  shadow, over a dimmed (not blurred) game.
- **End screen**: replaces the main column. A marquee plate with the prize in Silkscreen (3rem), a status line
  (won, kept the safe prize, walked away), the best score, Play again (primary), then the review list: one flat
  card per question played, with the prompt, your SQL and the reference SQL in `--wr-screen` boxes, and the
  explanation.
- **Host line**: in the marquee, ink on yellow, `aria-live="polite"`, Silkscreen for the name "SQL-Bot", body
  font for the line.


## Round 4: game-first, light only (current)

Teacher's brief: evaluate the experience as a game designer; remove undesired text and focus on the game;
the student should see how to play at once, and click a help button for anything more (the onboarding tour);
the dark theme is not beautiful, keep it always light.

### Principles
- **The loop above the fold.** At 1440 × 900 on rung 1 the prompt, the console, Run and Lock in are on screen
  without scrolling (`tools/check-game.mjs` checks it).
- **No rules on the screen.** Rules live in How to play (the tour): safe rungs, lifelines once each, Run is free
  and Lock in counts, Ctrl+Enter, walking away from rung 2. The screen keeps only what answers an action (Run
  results, errors, refusals, lifeline output, SQL-Bot's short line), each in one line, with no repeated headings.
- **Always light.** No Light | Dark switch; the tokens are not redefined for a dark site; `color-scheme: light`.
- **One bold element: the marquee.** The ladder is a white panel with a 2px ink border; its current rung is the
  marquee-yellow block with the hard shadow; safe rungs keep the double ink border.

### Layout
```
┌ marquee ───────────────────────────────────────────────────────────────────────────────┐
│ QUERY FOR A MILLION ┊ [bot] SQL-Bot's line (≤ 2 rows)                [? How to play][EN|ES] │
├──────────────────────────── stage 1fr ────────────────────────┬────── side 300px ───────┤
│ [7] €10,000                                        (Medium)   │ [key] [tpl] [mag]       │
│ The question, 1.16rem                                         │ Key clause Template Rev │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │ ladder (15 rungs)       │
│ [customers][games][sales][Count rows][Join two tables]        │  ▶ current: yellow      │
│ SQL> textarea                                                 │  5, 10: double border   │
│ [▶ Run  Ctrl+Enter]                              [LOCK IN ▶▶] │ [Walk away with …]      │
│ lifeline tray (latest output; tabs for the others)            │  (from rung 2)          │
│ result (table / ORA error), "n rows in m ms"                  │ Best €X (when there is) │
├───────────────────────────────────────────────────────────────┤                         │
│ schema: customers · games · sales; every name is a button     │                         │
└───────────────────────────────────────────────────────────────┴─────────────────────────┘
```
- `#wr-question` (hero + prompt) and `.wr-console` (chips, editor, actions, `#wr-life-out`, `#wr-out`) sit in one
  card, `.wr-stage`. `#wr-schema` follows it; `#wr-lifelines` and `#wr-ladder` are in the side column.
- **Lifelines**: square yellow arcade buttons (56px) with a pixel icon and the name below; no blurbs on screen.
  The blurb is the `title` tooltip and a visually hidden `aria-describedby` text. Used: grey, ink diagonal strike.
- **Tray**: only the most recent lifeline output shows, in a flat coin-tinted card; small tabs switch to the others.
- **Run** is secondary with a `kbd` keycap "Ctrl+Enter" (hidden on phones); **Lock in** is the orange start button.
- **Schema**: table names are ink chips, columns are small chips (PK / FK marks; the type in the tooltip and for
  screen readers). A click types the name at the cursor (at the end if the console was not used yet).
- **Walk away** only from rung 2 (it would pay nothing on rung 1). **Best €X** only when there is one.
- Phones (< 720px): one column, opened with `display: contents`: the ladder strip ("Rung n: prize. Safe: …" and
  Show prizes), the stage, the lifelines, the schema. The marquee stacks title, tools, SQL-Bot.
- The end screen keeps the prize plate, the heading, Play again and the review list; only a lost run gets a
  one-line reason (the safe prize).

### Removed from the screen (round 4)
The rules line under the prompt; "Question n of 15" (the rung badge says it; screen readers still hear it);
the Lifelines heading and "n left, once each per game"; the lifeline blurbs; the console heading and "Oracle SQL.
Run as often as you like…"; "Peek or start from:"; "Run only shows the result. Lock in is your answer…"; the
"or Ctrl + Enter" sentence (now a keycap); the Prize ladder heading (now an `aria-label`); "No best score yet";
"3 tables, the same in every question"; the end screen's explanatory line under "Your answers"; the Light | Dark
switch; the "Safe" badge text on rungs (the double border marks them; screen readers hear "safe").


### My attempts (`#/game/historial`, styles at the end of `game.css`)
```
┌ marquee (← Modes, How to play, EN|ES) ──────────────────────────────────────────────────┐
│ My attempts                                                                              │
│ Ana Ruiz  ana.ruiz@cunef.edu                                                             │
│ ▌[medal] SELECT Queries        ▮▮▮▮▮▮▯▯▯▯▯▯▯▯▯              3 attempts, the last on …   │
│ ▌        Best: rung 6 of 15 (€2,000)                                                     │
│ ▌ … one row per mode, the left edge and the filled cells in the mode's colour            │
│ Attempts (n)                                                                             │
│ date · [KIND] · result (medal if it gave the badge) · Rung n · prize · r/a right · min   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
- The strip is the ladder of the game in 15 flat cells: reached cells filled with the mode colour, the safe rungs
  (5, 10) outlined in ink. A row with the badge is coin-tinted and shows all 15 cells filled.
- The attempt rows reuse the teacher's `.wr-tatts` / `.wr-trow` (no Open button: the student never sees answers).
- Phones (< 720px): the strip and the count drop below the medal and the name.
