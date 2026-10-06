import type React from 'react';
import {Interactive} from 'remotion';
import type {Column} from '../components/DataTable';
import {VoiceOver} from '../components/Narration';
import {C, FONT, TONES} from '../theme';
import {segmentsOf, type TernaryScene} from './narration';

// The running example of the ternary video. Consistent with SCRIPT-ternary.md and the "ternary" card
// of the website (data/en/er-concepts.js): three real facts, and the spurious fourth one that
// the join of the pairs adds.
export const FACTS = [
  ['Mike', 'Physics', 'Jones'],
  ['Mike', 'Chemistry', 'Song'],
  ['Anne', 'Physics', 'Song'],
] as const;
export const SPURIOUS = ['Mike', 'Physics', 'Song'] as const;

export const COLS: Column[] = [
  {key: 'student', label: 'student', width: 190, tone: 'blue'},
  {key: 'course', label: 'course', width: 200, tone: 'orange'},
  {key: 'instructor', label: 'instructor', width: 200, tone: 'teal'},
];

export const Narration: React.FC<{readonly scene: TernaryScene}> = ({scene}) => (
  <VoiceOver segments={segmentsOf(scene)} />
);

/* ---- The Chen diagram: STUDENT, COURSE, INSTRUCTOR around the diamond "takes" ---------------- */

type Role = 'fixed' | 'count' | undefined;

const ENTS = [
  {label: 'STUDENT', x: 200, y: 130, card: {x: 440, y: 232}},
  {label: 'COURSE', x: 200, y: 570, card: {x: 440, y: 492}},
  {label: 'INSTRUCTOR', x: 1000, y: 350, card: {x: 770, y: 330}},
] as const;
const D = {x: 560, y: 350, hw: 130, hh: 80};
const EW = 300;
const EH = 100;

export const DIAGRAM_W = 1200;
export const DIAGRAM_H = 700;

type Three<T> = readonly [T, T, T];

export const TernaryDiagram: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  readonly opacity?: number;
  /** Opacity of each entity box. */
  readonly show?: Three<number>;
  /** 0..1 drawing progress of each line, from the entity to the diamond. */
  readonly spoke?: Three<number>;
  readonly cards?: Three<string>;
  readonly cardOp?: Three<number>;
  /** 'fixed' (blue) for the entities held fixed, 'count' (orange) for the one being counted. */
  readonly role?: Three<Role>;
  readonly roleT?: number;
}> = ({name, x, y, scale = 1, opacity = 1, show = [1, 1, 1], spoke = [1, 1, 1], cards, cardOp = [1, 1, 1], role = [undefined, undefined, undefined], roleT = 0}) => (
  <Interactive.Svg
    name={name}
    width={DIAGRAM_W}
    height={DIAGRAM_H}
    viewBox={`0 0 ${DIAGRAM_W} ${DIAGRAM_H}`}
    style={{position: 'absolute', left: x, top: y, opacity, scale: `${scale}`, transformOrigin: '0 0', overflow: 'visible'}}
  >
    {ENTS.map((e, i) => (
      <line
        key={`l${e.label}`}
        x1={e.x}
        y1={e.y}
        x2={e.x + (D.x - e.x) * spoke[i]}
        y2={e.y + (D.y - e.y) * spoke[i]}
        stroke={C.ink}
        strokeWidth={4}
      />
    ))}
    <polygon
      points={`${D.x},${D.y - D.hh} ${D.x + D.hw},${D.y} ${D.x},${D.y + D.hh} ${D.x - D.hw},${D.y}`}
      fill={C.surface}
      stroke={C.ink}
      strokeWidth={4}
    />
    <text x={D.x} y={D.y + 12} textAnchor="middle" fontFamily={FONT} fontSize={34} fontWeight={700} fill={C.ink}>
      takes
    </text>
    {ENTS.map((e, i) => {
      const r = role[i];
      const tone = r === 'fixed' ? TONES.blue : r === 'count' ? TONES.orange : null;
      const fill = tone && roleT > 0 ? tone.soft : C.surface;
      const stroke = tone && roleT > 0 ? tone.strong : C.ink;
      return (
        <g key={e.label} opacity={show[i]}>
          <rect
            x={e.x - EW / 2}
            y={e.y - EH / 2}
            width={EW}
            height={EH}
            rx={6}
            fill={fill}
            stroke={stroke}
            strokeWidth={4 + 4 * (tone ? roleT : 0)}
          />
          <text x={e.x} y={e.y + 12} textAnchor="middle" fontFamily={FONT} fontSize={34} fontWeight={700} fill={C.ink}>
            {e.label}
          </text>
          {cards ? (
            <text
              x={e.card.x}
              y={e.card.y}
              textAnchor="middle"
              fontFamily={FONT}
              fontSize={36}
              fontWeight={700}
              fill={TONES.orange.strong}
              opacity={cardOp[i]}
            >
              {cards[i]}
            </text>
          ) : null}
        </g>
      );
    })}
  </Interactive.Svg>
);

/** A centred line of text at a fixed top, for questions and short statements. */
export const Caption: React.FC<{
  readonly name: string;
  readonly top: number;
  readonly left?: number;
  readonly width?: number;
  readonly opacity: number;
  readonly size?: number;
  readonly children: React.ReactNode;
}> = ({name, top, left = 0, width = 1920, opacity, size = 44, children}) => (
  <Interactive.Div
    name={name}
    style={{position: 'absolute', left, top, width, textAlign: 'center', fontSize: size, lineHeight: 1.3, color: C.ink, opacity, fontFamily: FONT}}
  >
    {children}
  </Interactive.Div>
);
