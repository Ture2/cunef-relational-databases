# Course videos

Remotion project for the course videos (English, 1920×1080, 30 fps, British English voice-over and soft music, no subtitles):

- **Database normalization, step by step** (~6 min, composition `Normalization`)
  - Script and timeline: [`SCRIPT.md`](SCRIPT.md)
  - Scene timing (single source): `src/timeline.ts`
  - Scenes: `src/scenes/`
- **Ternary relationships** (~2:40, composition `Ternary`)
  - Script and timeline: [`SCRIPT-ternary.md`](SCRIPT-ternary.md)
  - Everything else is in `src/ternary/` (timing, narration and scenes)
- Reusable pieces: `src/components/` (`DataTable`, `DependencyArrow`, `Ladder`, `AnomalyCallout`, `VoiceOver`, `Music`)

## Setup

```bash
npm i
```

## Preview

```bash
npx remotion studio
```

The main compositions are `Normalization` and `Ternary`. Each scene is also registered on its own, in the `Scenes` and `Ternary-scenes` folders.

## Render

```bash
npx remotion render Normalization out/normalization-v1.mp4
```

A single frame: `npx remotion still Normalization out/stills/frame.png --frame=1155`.

For the website (`../assets/video/`, committed and served by GitHub Pages):

```bash
npm run render:site      # normalization: 720p H.264 (~18 MB) and the poster frame
npm run render:ternary   # ternary relationships: the same, as assets/video/ternary.mp4
```

`out/` stays gitignored; the site copy lives in `assets/video/`. If the scenes change, also update the chapter times: `js/normalization-section.js` for normalization, `TERNARY_VIDEO` in `js/er.js` for the ternary video.

## Audio (voice-over + music)

- Narration text and timing: `src/narration.json`, and `src/ternary/narration.json` for the ternary video. Start times are local to each scene.
- Regenerate the voice (Microsoft neural voice via edge-tts; sends the text to Microsoft's online TTS):

  ```bash
  pip install edge-tts
  python scripts/tts.py                  # writes public/audio/vo/<id>.mp3 + durations, validates fit
  python scripts/tts.py --video ternary  # the same for the ternary video
  ```

- Regenerate the background music (synthesized, royalty-free; needs numpy):

  ```bash
  python scripts/music.py        # writes public/audio/music.wav
  ```

- If a segment no longer fits, shorten its text, or add a tail hold for that scene in `HOLDS` (`src/timeline.ts` or `src/ternary/timeline.ts`).
