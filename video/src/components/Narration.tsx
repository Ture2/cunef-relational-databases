import {Audio} from '@remotion/media';
import type React from 'react';
import {staticFile, useVideoConfig} from 'remotion';
import {segmentsOf, type SceneKey} from '../narration';

/** The voice-over segments of one scene, each placed at its local start time. */
export const SceneNarration: React.FC<{readonly scene: SceneKey}> = ({scene}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {segmentsOf(scene).map((seg) => (
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
