import type React from 'react';
import {Interactive} from 'remotion';
import {C, FONT, TONES, type Tone} from '../../theme';
import {MONO} from '../common/SqlCode';

export {Narration} from './narration';

/* ---- The analogy: a motion-sensor light that switches itself on ----------------------------------- */

export const LIGHT_W = 440;
export const LIGHT_H = 560;

/** A wall lamp with a motion sensor; on 0..1 lights the bulb and the cone below it. */
export const MotionLight: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly on: number;
  readonly opacity?: number;
}> = ({name, x, y, on, opacity = 1}) => {
  const rays = [-60, -30, 0, 30, 60];
  return (
    <Interactive.Svg
      name={name}
      width={LIGHT_W}
      height={LIGHT_H}
      viewBox={`0 0 ${LIGHT_W} ${LIGHT_H}`}
      style={{position: 'absolute', left: x, top: y, opacity, overflow: 'visible'}}
    >
      <polygon points="120,170 320,170 430,540 10,540" fill={TONES.yellow.soft} opacity={on} />
      <rect x={150} y={0} width={140} height={22} rx={6} fill={C.ink} />
      <rect x={210} y={22} width={20} height={40} fill={C.ink} />
      <path d="M 140 62 L 300 62 L 345 160 L 95 160 Z" fill={C.ink} />
      <circle cx={220} cy={168} r={34} fill={on > 0.5 ? '#FFC94A' : C.rule} stroke={C.ink} strokeWidth={4} />
      {rays.map((a) => {
        const r = (a * Math.PI) / 180;
        const dx = Math.sin(r);
        const dy = Math.cos(r);
        return (
          <line
            key={a}
            x1={220 + dx * 52}
            y1={168 + dy * 52}
            x2={220 + dx * (52 + 40 * on)}
            y2={168 + dy * (52 + 40 * on)}
            stroke={C.accent}
            strokeWidth={6}
            strokeLinecap="round"
            opacity={on}
          />
        );
      })}
      <circle cx={330} cy={30} r={16} fill={C.muted} />
      <text x={358} y={38} fontFamily={FONT} fontSize={24} fontWeight={700} fill={C.muted}>
        sensor
      </text>
    </Interactive.Svg>
  );
};

/* ---- A rounded box with a label (the firing-order diagram) ------------------------------------------ */

/** A box of the firing-order diagram: dim until lit (0..1), then tinted with its tone and outlined. */
export const Step: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly tone: Tone;
  readonly opacity: number;
  readonly lit: number;
  /** 0..1 orange outline (default: lit). */
  readonly glow?: number;
  readonly size?: number;
  readonly sub?: string;
  readonly children: React.ReactNode;
}> = ({name, x, y, width, height, tone, opacity, lit, glow = lit, size = 28, sub, children}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      boxSizing: 'border-box',
      borderRadius: 14,
      border: `3px solid ${lit > 0.5 ? TONES[tone].strong : C.rule}`,
      backgroundColor: lit > 0.5 ? TONES[tone].soft : C.surface,
      boxShadow: glow > 0 ? `0 0 0 ${5 * glow}px ${C.accent}` : undefined,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 700,
      textAlign: 'center',
      lineHeight: 1.2,
      color: lit > 0.5 ? TONES[tone].strong : C.ink,
      opacity,
    }}
  >
    <div>{children}</div>
    {sub ? <div style={{fontFamily: MONO, fontSize: 20, fontWeight: 400, color: C.muted}}>{sub}</div> : null}
  </Interactive.Div>
);

/** A grade cell that changes value: shows `to` (with an orange outline) once t passes 0.5. */
export const changed = (from: string, to: string, t: number) =>
  t > 0
    ? {
        content: t > 0.5 ? to : from,
        bg: TONES.orange.soft,
        outline: t,
      }
    : undefined;
