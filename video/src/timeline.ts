// Single source of truth for scene timing. Keep in sync with SCRIPT.md.
export const FPS = 30;

const s = (seconds: number) => Math.round(seconds * FPS);

type SceneTiming = {
  readonly name: string;
  readonly from: number; // global start frame
  readonly durationInFrames: number;
};

const DURATIONS = {
  title: s(12),
  problem: s(53),
  whatIs: s(35),
  fd: s(45),
  partial: s(30),
  transitive: s(25),
  nf1: s(25),
  nf2: s(40),
  nf3: s(35),
  bcnf: s(25),
  lossless: s(23),
  outro: s(10),
} as const;

const NAMES: Record<keyof typeof DURATIONS, string> = {
  title: '01 Title',
  problem: '02 The problem',
  whatIs: '03 What is normalization',
  fd: '04 Functional dependency',
  partial: '05 Full vs partial',
  transitive: '06 Transitive',
  nf1: '07 1NF',
  nf2: '08 2NF',
  nf3: '09 3NF',
  bcnf: '10 BCNF',
  lossless: '11 Lossless join + recap',
  outro: '12 Outro',
};

type SceneId = keyof typeof DURATIONS;

// Extra seconds that hold a scene's final state (added for the narration).
// Internal animation timings are unchanged; only the scene gets longer.
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
