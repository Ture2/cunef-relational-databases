import type React from 'react';
import {Interactive} from 'remotion';
import {C, FONT, TONES, type Tone} from '../../theme';

export {Narration} from './narration';

/* ---- A two-circle Venn diagram: which part of each table a join keeps ---------------------------- */

export const VENN_W = 520;
export const VENN_H = 310;
const A = {x: 190, y: 140};
const B = {x: 330, y: 140};
const R = 120;

/**
 * a, both, b: 0..1 shading of the left-only part, the overlap and the right-only part.
 * The left circle is the left table of the join, the right circle the right table.
 */
export const Venn: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly a: number;
  readonly both: number;
  readonly b: number;
  readonly labels: readonly [string, string];
  readonly tones?: readonly [Tone, Tone];
  readonly scale?: number;
  readonly opacity?: number;
}> = ({name, x, y, a, both, b, labels, tones = ['orange', 'maroon'], scale = 1, opacity = 1}) => {
  const id = name.replace(/[^A-Za-z0-9]/g, '');
  const shade = (t: number) => ({fill: C.accent, fillOpacity: 0.5 * t});
  return (
    <Interactive.Svg
      name={name}
      width={VENN_W}
      height={VENN_H}
      viewBox={`0 0 ${VENN_W} ${VENN_H}`}
      style={{position: 'absolute', left: x, top: y, opacity, scale: `${scale}`, transformOrigin: '0 0', overflow: 'visible'}}
    >
      <defs>
        <mask id={`${id}-notB`}>
          <rect width={VENN_W} height={VENN_H} fill="white" />
          <circle cx={B.x} cy={B.y} r={R} fill="black" />
        </mask>
        <mask id={`${id}-notA`}>
          <rect width={VENN_W} height={VENN_H} fill="white" />
          <circle cx={A.x} cy={A.y} r={R} fill="black" />
        </mask>
        <clipPath id={`${id}-inB`}>
          <circle cx={B.x} cy={B.y} r={R} />
        </clipPath>
      </defs>
      <circle cx={A.x} cy={A.y} r={R} fill={C.surface} />
      <circle cx={B.x} cy={B.y} r={R} fill={C.surface} />
      <circle cx={A.x} cy={A.y} r={R} mask={`url(#${id}-notB)`} {...shade(a)} />
      <circle cx={B.x} cy={B.y} r={R} mask={`url(#${id}-notA)`} {...shade(b)} />
      <circle cx={A.x} cy={A.y} r={R} clipPath={`url(#${id}-inB)`} {...shade(both)} />
      <circle cx={A.x} cy={A.y} r={R} fill="none" stroke={TONES[tones[0]].strong} strokeWidth={5} />
      <circle cx={B.x} cy={B.y} r={R} fill="none" stroke={TONES[tones[1]].strong} strokeWidth={5} />
      <text x={A.x - 40} y={VENN_H - 8} textAnchor="middle" fontFamily={FONT} fontSize={30} fontWeight={700} fill={TONES[tones[0]].strong}>
        {labels[0]}
      </text>
      <text x={B.x + 40} y={VENN_H - 8} textAnchor="middle" fontFamily={FONT} fontSize={30} fontWeight={700} fill={TONES[tones[1]].strong}>
        {labels[1]}
      </text>
    </Interactive.Svg>
  );
};

/** Straight lines between points in scene coordinates (row-matching links), each with its own progress. */
export const Links: React.FC<{
  readonly name: string;
  readonly links: readonly {readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly t: number}[];
  readonly color?: string;
  readonly opacity?: number;
}> = ({name, links, color = C.accent, opacity = 1}) => (
  <Interactive.Svg
    name={name}
    width={1920}
    height={1080}
    viewBox="0 0 1920 1080"
    style={{position: 'absolute', left: 0, top: 0, opacity, overflow: 'visible', pointerEvents: 'none'}}
  >
    {links.map((l, i) =>
      l.t > 0 ? (
        <g key={i}>
          <line x1={l.x1} y1={l.y1} x2={l.x1 + (l.x2 - l.x1) * l.t} y2={l.y1 + (l.y2 - l.y1) * l.t} stroke={color} strokeWidth={4} strokeLinecap="round" />
          <circle cx={l.x1} cy={l.y1} r={7} fill={color} />
          <circle cx={l.x2} cy={l.y2} r={7} fill={color} opacity={l.t >= 1 ? 1 : 0} />
        </g>
      ) : null,
    )}
  </Interactive.Svg>
);
