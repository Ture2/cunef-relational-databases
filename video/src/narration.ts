// Voice-over segments. Source of truth: src/narration.json (edit the text there, then run
// `python scripts/tts.py` to regenerate public/audio/vo/<id>.mp3 and the measured durations).
import data from './narration.json';
import {FPS, TIMELINE} from './timeline';

export type SceneKey = keyof typeof TIMELINE;

export type Segment = {
  readonly id: string;
  readonly scene: SceneKey;
  /** Start, in seconds, local to the scene. */
  readonly startSec: number;
  readonly text: string;
  /** Measured length of the MP3 (written by scripts/tts.py). */
  readonly durationSec: number;
};

export const SEGMENTS = data.segments as Segment[];

export const segmentsOf = (scene: SceneKey) => SEGMENTS.filter((s) => s.scene === scene);

/** Global [start, end] frames of every segment, for ducking the music. */
export const SPEECH_INTERVALS = SEGMENTS.map((s) => {
  const from = TIMELINE[s.scene].from + Math.round(s.startSec * FPS);
  return [from, from + Math.ceil(s.durationSec * FPS)] as const;
});
