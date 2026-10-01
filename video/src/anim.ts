import {Easing, interpolate} from 'remotion';
import {FPS} from './timeline';

const ease = Easing.bezier(0.16, 1, 0.3, 1);

/** 0→1 progress between two local times in seconds (clamped, eased). */
export const prog = (frame: number, startSec: number, endSec: number) =>
  interpolate(frame, [startSec * FPS, endSec * FPS], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

/** Fade in at [a, a+fade], hold, fade out at [b-fade, b]. Seconds. */
export const window01 = (frame: number, a: number, b: number, fade = 0.4) =>
  Math.min(prog(frame, a, a + fade), 1 - prog(frame, b - fade, b));

export const lerp = (t: number, a: number, b: number) => a + (b - a) * t;
