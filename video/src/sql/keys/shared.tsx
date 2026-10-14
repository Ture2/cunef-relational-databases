import type React from 'react';
import {Interactive} from 'remotion';
import {C, FONT, TONES, type Tone} from '../../theme';
import {MONO} from '../common/SqlCode';

export {Narration} from './narration';

/** A big operator glyph ("=", "+") between the chips of an equation (inside a flex row). */
export const Op: React.FC<{readonly children: string; readonly opacity?: number}> = ({children, opacity = 1}) => (
  <div style={{fontFamily: FONT, fontSize: 56, fontWeight: 700, color: C.accent, opacity, lineHeight: 1}}>{children}</div>
);

/** One row of the USER_CONSTRAINTS legend: a letter badge and what it means. */
export const TypeRow: React.FC<{
  readonly name: string;
  readonly letter: string;
  readonly x: number;
  readonly y: number;
  readonly tone: Tone;
  readonly opacity?: number;
  /** 0..1 orange outline around the badge (the type being discussed). */
  readonly outline?: number;
  readonly children: React.ReactNode;
}> = ({name, letter, x, y, tone, opacity = 1, outline = 0, children}) => (
  <Interactive.Div
    name={name}
    style={{position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 22, fontFamily: FONT, opacity, translate: `${(1 - opacity) * 16}px 0px`}}
  >
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: TONES[tone].soft,
        border: `3px solid ${TONES[tone].strong}`,
        boxShadow: outline > 0 ? `0 0 0 ${5 * outline}px ${C.accent}` : undefined,
        fontFamily: MONO,
        fontSize: 40,
        fontWeight: 700,
        color: TONES[tone].strong,
      }}
    >
      {letter}
    </div>
    <div style={{fontSize: 34, color: C.ink, whiteSpace: 'nowrap'}}>{children}</div>
  </Interactive.Div>
);
