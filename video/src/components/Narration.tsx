import {Audio} from '@remotion/media';
import type React from 'react';
import {staticFile, useVideoConfig} from 'remotion';
import {segmentsOf, type SceneKey} from '../narration';

/** A voice-over segment: public/audio/vo/<id>.mp3, placed at a start time local to its scene. */
export type VoiceSegment = {
  readonly id: string;
  readonly startSec: number;
  readonly durationSec: number;
};

/** The given voice-over segments of one scene, each placed at its local start time. */
export const VoiceOver: React.FC<{readonly segments: readonly VoiceSegment[]}> = ({segments}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {segments.map((seg) => (
        <Audio
          key={seg.id}
          name={`VO ${seg.id}`}
          src={staticFile(`audio/vo/${seg.id}.mp3`)}
          from={Math.round(seg.startSec * fps)}
          durationInFrames={Math.ceil(seg.durationSec * fps) + 2}
          premountFor={fps}
          volume={1}
        />
      ))}
    </>
  );
};

/** The voice-over segments of one scene of the normalization video. */
export const SceneNarration: React.FC<{readonly scene: SceneKey}> = ({scene}) => (
  <VoiceOver segments={segmentsOf(scene)} />
);
