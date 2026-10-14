import type React from 'react';
import {Interactive} from 'remotion';
import {CODE_PAD, lineHeight, MONO} from '../common/SqlCode';
import {C, FONT, TONES, type Tone} from '../../theme';

export {Narration} from './narration';

/** Width of one Consolas character at a font size (monospace advance ≈ 0.55 em). */
const CHAR = 0.55;

/**
 * Scene box around characters [col, col + len) of line `line` of a SqlCode panel at (x, y),
 * e.g. to outline the inner query or replace it with its value.
 */
export const codeSpan = (x: number, y: number, line: number, col: number, len: number, size = 30) => ({
  left: x + 2 + CODE_PAD + col * CHAR * size,
  top: y + 2 + CODE_PAD + line * lineHeight(size),
  width: len * CHAR * size,
  height: lineHeight(size),
});

/** An outline (and optional replacement text) drawn over part of a code line. */
export const CodeBox: React.FC<{
  readonly name: string;
  readonly box: {readonly left: number; readonly top: number; readonly width: number; readonly height: number};
  readonly outline: number;
  /** 0..1: covers the code with `value`, centred. */
  readonly replace?: number;
  readonly value?: string;
  readonly size?: number;
  readonly tone?: Tone;
}> = ({name, box, outline, replace = 0, value, size = 30, tone = 'orange'}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: box.left - 4,
      top: box.top + 2,
      width: box.width + 8,
      height: box.height - 4,
      borderRadius: 8,
      boxSizing: 'border-box',
      border: `4px solid ${C.accent}`,
      opacity: Math.max(outline, replace),
    }}
  >
    {replace > 0 ? (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 4,
          backgroundColor: TONES[tone].soft,
          opacity: replace,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: MONO,
          fontSize: size,
          fontWeight: 700,
          color: TONES[tone].strong,
        }}
      >
        {value}
      </div>
    ) : null}
  </Interactive.Div>
);

/** A round tick (passes) or cross (fails) mark. */
export const Mark: React.FC<{
  readonly name: string;
  readonly ok: boolean;
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
  readonly size?: number;
}> = ({name, ok, x, y, opacity, size = 44}) => {
  const tone = ok ? TONES.teal : TONES.orange;
  return (
    <Interactive.Svg
      name={name}
      width={size}
      height={size}
      viewBox="0 0 44 44"
      style={{position: 'absolute', left: x, top: y - size / 2, opacity, scale: `${0.6 + 0.4 * opacity}`}}
    >
      <circle cx={22} cy={22} r={20} fill={tone.soft} stroke={tone.strong} strokeWidth={3} />
      {ok ? (
        <polyline points="12,23 19,30 32,15" fill="none" stroke={tone.strong} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <g stroke={tone.strong} strokeWidth={5} strokeLinecap="round">
          <line x1={14} y1={14} x2={30} y2={30} />
          <line x1={30} y1={14} x2={14} y2={30} />
        </g>
      )}
    </Interactive.Svg>
  );
};

/** A white panel with a small title and monospace lines: the value or list a subquery returns. */
export const ValuePanel: React.FC<{
  readonly name: string;
  readonly title: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly opacity: number;
  readonly children: React.ReactNode;
  readonly outline?: number;
}> = ({name, title, x, y, width, opacity, children, outline = 0}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      boxSizing: 'border-box',
      padding: '16px 24px 20px',
      borderRadius: 14,
      backgroundColor: C.surface,
      border: `2px solid ${C.rule}`,
      borderTop: `8px solid ${TONES.maroon.strong}`,
      boxShadow: outline > 0 ? `0 0 0 ${5 * outline}px ${C.accent}` : '0 4px 18px rgba(26, 31, 108, 0.08)',
      fontFamily: FONT,
      color: C.ink,
      opacity,
    }}
  >
    <div style={{fontSize: 26, fontWeight: 700, color: C.muted, marginBottom: 10, whiteSpace: 'nowrap'}}>{title}</div>
    <div style={{fontFamily: MONO, fontSize: 34, lineHeight: 1.35}}>{children}</div>
  </Interactive.Div>
);

/** A value that fades in inside a ValuePanel (or any inline context). */
export const Val: React.FC<{readonly t: number; readonly children: React.ReactNode; readonly color?: string}> = ({t, children, color}) => (
  <span style={{opacity: t, color, display: 'inline-block', translate: `0px ${(1 - t) * 10}px`}}>{children}</span>
);
