// Scene timing of the "Ternary relationships" video. Keep in sync with SCRIPT-ternary.md and the
// chapter list in js/er.js (TERNARY_VIDEO.chapters).
export const FPS = 30;

const s = (seconds: number) => Math.round(seconds * FPS);

type SceneTiming = {
  readonly name: string;
  readonly from: number; // global start frame
  readonly durationInFrames: number;
};

const DURATIONS = {
  title: s(8),
  fact: s(24),
  read: s(30),
  keys: s(22),
  pairs: s(19),
  split: s(32),
  tables: s(16),
  outro: s(9),
} as const;

const NAMES: Record<keyof typeof DURATIONS, string> = {
  title: '01 Title',
  fact: '02 One fact, three entities',
  read: '03 Fix two, look at the third',
  keys: '04 Ratios and keys',
  pairs: '05 Pairs are M:N',
  split: '06 Not three binaries',
  tables: '07 To tables',
  outro: '08 Outro',
};

type SceneId = keyof typeof DURATIONS;

// Extra seconds that hold a scene's final state (added for the narration).
const HOLDS: Partial<Record<SceneId, number>> = {};

const total = (id: SceneId) => DURATIONS[id] + s(HOLDS[id] ?? 0);

const build = (): Record<SceneId, SceneTiming> => {
  let from = 0;
  const out = {} as Record<SceneId, SceneTiming>;
  for (const id of Object.keys(DURATIONS) as SceneId[]) {
    out[id] = {name: NAMES[id], from, durationInFrames: total(id)};
    from += total(id);
  }
  return out;
};

export const TIMELINE = build();

export const TOTAL_FRAMES = (Object.keys(DURATIONS) as SceneId[]).reduce((a, id) => a + total(id), 0);
