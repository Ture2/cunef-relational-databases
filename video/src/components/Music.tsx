import {Audio} from '@remotion/media';
import type React from 'react';
import {interpolate, staticFile, useVideoConfig} from 'remotion';
import {SPEECH_INTERVALS} from '../narration';

const BED = 0.12; // music level between narration
const DUCKED = 0.05; // music level under the voice
const RAMP_SEC = 0.3;

/** Background music for the whole video, ducked smoothly under every voice segment. */
export const Music: React.FC = () => {
  const {fps} = useVideoConfig();
  const ramp = RAMP_SEC * fps;
  const volume = (f: number) => {
    let duck = 0;
    for (const [start, end] of SPEECH_INTERVALS) {
      if (f < start - ramp || f > end + ramp) continue;
      const d = Math.min(
        interpolate(f, [start - ramp, start], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        interpolate(f, [end, end + ramp], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
      );
      duck = Math.max(duck, d);
    }
    return BED + (DUCKED - BED) * duck;
  };
  return <Audio name="Music" src={staticFile('audio/music.wav')} volume={volume} />;
};
