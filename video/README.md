# Database normalization, step by step (video)

Remotion project for a ~6-minute educational video (English, 1920×1080, 30 fps, on-screen text only).

- Script and timeline: [`SCRIPT.md`](SCRIPT.md)
- Scene timing (single source): `src/timeline.ts`
- Scenes: `src/scenes/`, reusable pieces: `src/components/` (`DataTable`, `DependencyArrow`, `Caption`, `Ladder`, `AnomalyCallout`)

## Setup

```bash
npm i
```

## Preview

```bash
npx remotion studio
```

The main composition is `Normalization`; each scene is also registered in the `Scenes` folder.

## Render

```bash
npx remotion render Normalization out/normalization-v1.mp4
```

A single frame: `npx remotion still Normalization out/stills/frame.png --frame=1155`.

For the website (`../assets/video/`, committed and served by GitHub Pages):

```bash
npm run render:site   # 720p H.264 (~19 MB), poster frame and WebVTT captions
npm run captions      # only the captions, from src/narration.json + src/timeline.ts
```

`out/` stays gitignored; the site copy lives in `assets/video/`. If the scenes change, also update the chapter times in `js/normalization-section.js`.

## Audio (voice-over + music)

- Narration text and timing: `src/narration.json` (start times are local to each scene).
- Regenerate the voice (Microsoft neural voice via edge-tts; sends the text to Microsoft's online TTS):

  ```bash
  pip install edge-tts
  python scripts/tts.py          # writes public/audio/vo/<id>.mp3 + durations, validates fit
  ```

- Regenerate the background music (synthesized, royalty-free; needs numpy):

  ```bash
  python scripts/music.py        # writes public/audio/music.wav
  ```

- If a segment no longer fits, shorten its text, or add a tail hold for that scene in `HOLDS` (`src/timeline.ts`).
