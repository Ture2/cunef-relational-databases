import type React from 'react';
import {Interactive} from 'remotion';
import {C, FONT, TONES, type Tone} from '../../theme';
import {MONO} from './SqlCode';

/** An Oracle error as the database prints it, e.g. ORA-02291 + its message. */
export const OraError: React.FC<{
  readonly name: string;
  readonly code: string;
  readonly message: string;
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly opacity?: number;
  readonly size?: number;
}> = ({name, code, message, x, y, width = 900, opacity = 1, size = 28}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      boxSizing: 'border-box',
      padding: '16px 24px',
      borderRadius: 12,
      backgroundColor: TONES.orange.soft,
      border: `3px solid ${TONES.orange.strong}`,
      fontFamily: MONO,
      fontSize: size,
      lineHeight: 1.4,
      color: TONES.orange.strong,
      opacity,
      translate: `${(1 - opacity) * 12}px 0px`,
    }}
  >
    <b>{code}</b>: {message}
  </Interactive.Div>
);

/** A white card with a coloured top band, a bold title and a short body. */
export const InfoCard: React.FC<{
  readonly name: string;
  readonly title: React.ReactNode;
  readonly children?: React.ReactNode;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height?: number;
  readonly tone?: Tone;
  readonly opacity?: number;
  readonly titleSize?: number;
  readonly size?: number;
  /** 0..1 orange outline (the card being discussed). */
  readonly outline?: number;
  readonly style?: React.CSSProperties;
}> = ({name, title, children, x, y, width, height, tone = 'blue', opacity = 1, titleSize = 40, size = 30, outline = 0, style}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      boxSizing: 'border-box',
      padding: '22px 28px',
      borderRadius: 16,
      backgroundColor: C.surface,
      border: `2px solid ${C.rule}`,
      borderTop: `10px solid ${TONES[tone].strong}`,
      boxShadow: outline > 0 ? `0 0 0 ${5 * outline}px ${C.accent}` : '0 4px 18px rgba(26, 31, 108, 0.08)',
      fontFamily: FONT,
      color: C.ink,
      opacity,
      ...style,
    }}
  >
    <div style={{fontSize: titleSize, fontWeight: 700, color: TONES[tone].strong, marginBottom: children ? 12 : 0}}>{title}</div>
    {children ? <div style={{fontSize: size, lineHeight: 1.35}}>{children}</div> : null}
  </Interactive.Div>
);

/** A straight arrow in scene coordinates, drawn on with progress 0..1. */
export const Arrow: React.FC<{
  readonly name: string;
  readonly from: {readonly x: number; readonly y: number};
  readonly to: {readonly x: number; readonly y: number};
  readonly progress: number;
  readonly color?: string;
  readonly width?: number;
  readonly dashed?: boolean;
  readonly opacity?: number;
}> = ({name, from, to, progress, color = C.accent, width = 5, dashed = false, opacity = 1}) => {
  const ex = from.x + (to.x - from.x) * progress;
  const ey = from.y + (to.y - from.y) * progress;
  const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const ux = (to.x - from.x) / len;
  const uy = (to.y - from.y) / len;
  const head = 20;
  const wing = 11;
  const bx = ex - ux * head;
  const by = ey - uy * head;
  const headOp = Math.max(0, Math.min(1, (progress - 0.8) / 0.2));
  return (
    <Interactive.Svg
      name={name}
      width={1920}
      height={1080}
      viewBox="0 0 1920 1080"
      style={{position: 'absolute', left: 0, top: 0, opacity, overflow: 'visible', pointerEvents: 'none'}}
    >
      {progress > 0 ? (
        <>
          <line
            x1={from.x}
            y1={from.y}
            x2={progress < 1 ? ex : bx + ux * 2}
            y2={progress < 1 ? ey : by + uy * 2}
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
            strokeDasharray={dashed ? '12 10' : undefined}
          />
          <polygon points={`${ex},${ey} ${bx - uy * wing},${by + ux * wing} ${bx + uy * wing},${by - ux * wing}`} fill={color} opacity={headOp} />
        </>
      ) : null}
    </Interactive.Svg>
  );
};

/** A row pointer (▶) that sits left of a table row or code line. */
export const Pointer: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly opacity?: number;
  readonly label?: string;
}> = ({name, x, y, opacity = 1, label}) => (
  <Interactive.Div
    name={name}
    style={{position: 'absolute', left: x, top: y - 22, height: 44, display: 'flex', alignItems: 'center', gap: 10, opacity, fontFamily: FONT}}
  >
    {label ? <span style={{fontSize: 26, fontWeight: 700, color: TONES.orange.strong, whiteSpace: 'nowrap'}}>{label}</span> : null}
    <svg width={34} height={40} viewBox="0 0 34 40">
      <polygon points="0,0 34,20 0,40" fill={C.accent} />
    </svg>
  </Interactive.Div>
);
