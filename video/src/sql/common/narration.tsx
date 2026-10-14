// Voice-over helpers of the SQL videos. The source of truth of each video is
// src/sql/<topic>/narration.json (edit the text there, then run
// `python scripts/tts.py --video sql/<topic>` to regenerate the MP3s and the measured durations).
import type React from 'react';
import {VoiceOver} from '../../components/Narration';
import {FPS, type SceneTiming} from './timeline';

type RawSegment = {
  readonly id: string;
  readonly scene: string;
  readonly startSec: number;
  readonly text: string;
  readonly durationSec?: number;
};

type Segment<K extends string> = {
  readonly id: string;
  readonly scene: K;
  readonly startSec: number;
  readonly text: string;
  readonly durationSec: number;
};

export const makeNarration = <K extends string>(raw: readonly RawSegment[], timeline: Readonly<Record<K, SceneTiming>>) => {
  const segments = raw.map((r) => ({...r, durationSec: r.durationSec ?? 0})) as Segment<K>[];
  const segmentsOf = (scene: K) => segments.filter((seg) => seg.scene === scene);
  /** Global [start, end] frames of every segment, for ducking the music. */
  const SPEECH_INTERVALS = segments.map((seg) => {
    const from = timeline[seg.scene].from + Math.round(seg.startSec * FPS);
    return [from, from + Math.ceil(seg.durationSec * FPS)] as const;
  });
  const Narration: React.FC<{readonly scene: K}> = ({scene}) => <VoiceOver segments={segmentsOf(scene)} />;
  return {segmentsOf, SPEECH_INTERVALS, Narration};
};
