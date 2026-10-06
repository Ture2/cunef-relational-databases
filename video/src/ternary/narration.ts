// Voice-over of the ternary video. Source of truth: src/ternary/narration.json (edit the text there,
// then run `python scripts/tts.py --video ternary` to regenerate the MP3s and the measured durations).
import data from './narration.json';
import {FPS, TIMELINE} from './timeline';

export type TernaryScene = keyof typeof TIMELINE;

type Segment = {
  readonly id: string;
  readonly scene: TernaryScene;
  readonly startSec: number;
  readonly text: string;
  readonly durationSec: number;
};

const SEGMENTS = data.segments as Segment[];

export const segmentsOf = (scene: TernaryScene) => SEGMENTS.filter((s) => s.scene === scene);

/** Global [start, end] frames of every segment, for ducking the music. */
export const SPEECH_INTERVALS = SEGMENTS.map((s) => {
  const from = TIMELINE[s.scene].from + Math.round(s.startSec * FPS);
  return [from, from + Math.ceil(s.durationSec * FPS)] as const;
});
