import type React from 'react';
import {Interactive} from 'remotion';
import {C, FONT} from '../theme';

type Pt = {readonly x: number; readonly y: number};

type Props = {
  readonly name: string;
  readonly from: Pt;
  readonly to: Pt;
  /** Arc height in px (apex distance). Positive bends upwards, negative downwards. */
  readonly bend?: number;
  /** 0..1 draw-on progress. */
  readonly progress: number;
  readonly color?: string;
  readonly label?: string;
  /** 0..1 opacity of a cross over the middle: X does NOT determine Y. */
  readonly crossed?: number;
  readonly dashed?: boolean;
  readonly opacity?: number;
  readonly labelSize?: number;
};

/** Curved arrow X → Y drawn in scene coordinates (full-frame SVG). */
export const DependencyArrow: React.FC<Props> = ({
  name,
  from,
  to,
  bend = 80,
  progress,
  color = C.accent,
  label,
  crossed = 0,
  dashed = false,
  opacity = 1,
  labelSize = 28,
}) => {
  // Quadratic control point so that the apex sits `bend` px from the chord.
  const cx = (from.x + to.x) / 2;
  const cy = (from.y + to.y) / 2 - bend * 2;
  const d = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
  const tx = to.x - cx;
  const ty = to.y - cy;
  const len = Math.hypot(tx, ty) || 1;
  const ux = tx / len;
  const uy = ty / len;
  const head = 22;
  const wing = 12;
  // Shorten the visible tip so the arrow lands just outside the target.
  const bx = to.x - ux * head;
  const by = to.y - uy * head;
  const headPts = `${to.x},${to.y} ${bx - uy * wing},${by + ux * wing} ${bx + uy * wing},${by - ux * wing}`;
  const ax = 0.25 * from.x + 0.5 * cx + 0.25 * to.x;
  const ay = 0.25 * from.y + 0.5 * cy + 0.25 * to.y;
  const headOpacity = Math.max(0, Math.min(1, (progress - 0.85) / 0.15));
  const labelY = bend >= 0 ? ay - 16 : ay + labelSize + 8;
  return (
    <Interactive.Svg
      name={name}
      width={1920}
      height={1080}
      viewBox="0 0 1920 1080"
      style={{position: 'absolute', left: 0, top: 0, opacity, pointerEvents: 'none'}}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={dashed ? '0.025 0.018' : '1 1'}
        strokeDashoffset={dashed ? 0 : 1 - progress}
        opacity={dashed ? progress : 1}
      />
      <polygon points={headPts} fill={color} opacity={headOpacity} />
      {crossed > 0 ? (
        <g opacity={crossed} stroke={C.accent} strokeWidth={8} strokeLinecap="round">
          <line x1={ax - 22} y1={ay - 22} x2={ax + 22} y2={ay + 22} />
          <line x1={ax + 22} y1={ay - 22} x2={ax - 22} y2={ay + 22} />
        </g>
      ) : null}
      {label ? (
        <text
          x={ax}
          y={labelY}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={labelSize}
          fontWeight={700}
          fill={C.ink}
          opacity={headOpacity}
          paintOrder="stroke"
          stroke={C.bg}
          strokeWidth={8}
        >
          {label}
        </text>
      ) : null}
    </Interactive.Svg>
  );
};
