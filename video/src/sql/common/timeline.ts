// Shared timing helpers of the SQL videos. Each video keeps its own literal DURATIONS and HOLDS
// blocks in src/sql/<topic>/timeline.ts (scripts/tts.py parses them with a regex) and builds the
// timeline with buildTimeline.
export const FPS = 30;

export const s = (seconds: number) => Math.round(seconds * FPS);

export type SceneTiming = {
  readonly name: string;
  readonly from: number; // global start frame
  readonly durationInFrames: number;
};

export const buildTimeline = <K extends string>(
  durations: Readonly<Record<K, number>>,
  names: Readonly<Record<K, string>>,
  holds: Readonly<Partial<Record<K, number>>>,
) => {
  const total = (id: K) => durations[id] + s(holds[id] ?? 0);
  let from = 0;
  const timeline = {} as Record<K, SceneTiming>;
  for (const id of Object.keys(durations) as K[]) {
    timeline[id] = {name: names[id], from, durationInFrames: total(id)};
    from += total(id);
  }
  return {TIMELINE: timeline as Readonly<Record<K, SceneTiming>>, TOTAL_FRAMES: from};
};
