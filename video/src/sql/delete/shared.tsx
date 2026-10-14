import type React from 'react';
import {Interactive} from 'remotion';
import type {Column} from '../../components/DataTable';
import {Chip} from '../../components/Shell';
import {C, FONT, TONES, type Tone} from '../../theme';

export {Narration} from './narration';

/* Colour of each command, the same in every scene: teal = DELETE (DML), yellow = TRUNCATE, orange = DROP. */
export const CMD_TONE = {DELETE: 'teal', TRUNCATE: 'yellow', DROP: 'orange'} as const satisfies Record<string, Tone>;

/* The member table of the website card alter-drop. */
export const MEMBER = [
  ['1', 'Ana Ruiz', 'ana@uni.es'],
  ['2', 'Luis Gil', 'luis@uni.es'],
] as const;

export const MEMBER_COLS: Column[] = [
  {key: 'member_id', label: 'member_id', width: 180, tone: 'neutral', pk: true},
  {key: 'full_name', label: 'full_name', width: 190, tone: 'neutral'},
  {key: 'email', label: 'email', width: 210, tone: 'neutral'},
];

/** A row of chips laid out by flexbox, each fading in with its own opacity. */
export const ChipRow: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly chips: readonly {readonly label: React.ReactNode; readonly tone: Tone; readonly opacity: number}[];
  readonly size?: number;
  readonly gap?: number;
}> = ({name, x, y, chips, size = 30, gap = 18}) => (
  <Interactive.Div name={name} style={{position: 'absolute', left: x, top: y, display: 'flex', gap, alignItems: 'center'}}>
    {chips.map((c, i) => (
      <Chip key={i} tone={c.tone} size={size} style={{position: 'relative', opacity: c.opacity, translate: `0px ${(1 - c.opacity) * 10}px`}}>
        {c.label}
      </Chip>
    ))}
  </Interactive.Div>
);

/** Oracle's recycle bin: an open bin with a label. */
export const RecycleBin: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
  /** 0..1 orange glow while a table goes in or out. */
  readonly glow?: number;
}> = ({name, x, y, opacity, glow = 0}) => (
  <Interactive.Svg
    name={name}
    width={420}
    height={380}
    viewBox="0 0 420 380"
    style={{position: 'absolute', left: x, top: y, opacity, overflow: 'visible'}}
  >
    <rect x={30} y={28} width={360} height={22} rx={8} fill={TONES.neutral.soft} stroke={C.ink} strokeWidth={5} />
    <rect x={170} y={8} width={80} height={24} rx={8} fill="none" stroke={C.ink} strokeWidth={5} />
    <path d="M 50 62 L 80 330 L 340 330 L 370 62" fill={C.surface} stroke={glow > 0 ? C.accent : C.ink} strokeWidth={5 + 3 * glow} strokeLinejoin="round" />
    {[130, 210, 290].map((lx) => (
      <line key={lx} x1={lx} y1={92} x2={lx + (lx - 210) * 0.12} y2={300} stroke={C.rule} strokeWidth={6} strokeLinecap="round" />
    ))}
    <text x={210} y={372} textAnchor="middle" fontFamily={FONT} fontSize={32} fontWeight={700} fill={C.ink}>
      recycle bin
    </text>
  </Interactive.Svg>
);

/** The storage of a table: a grid of blocks, filled (data) or freed. */
export const Storage: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
  /** 1 = every block holds rows, 0 = every block freed. */
  readonly fill: number;
  readonly cols?: number;
  readonly rows?: number;
  readonly cell?: number;
}> = ({name, x, y, opacity, fill, cols = 8, rows = 4, cell = 64}) => {
  const gap = 10;
  const w = cols * cell + (cols - 1) * gap;
  const h = rows * cell + (rows - 1) * gap;
  return (
    <Interactive.Svg name={name} width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: x, top: y, opacity, overflow: 'visible'}}>
      {Array.from({length: cols * rows}, (_, i) => (
        <g key={i}>
          <rect
            x={(i % cols) * (cell + gap)}
            y={Math.floor(i / cols) * (cell + gap)}
            width={cell}
            height={cell}
            rx={8}
            fill={C.surface}
            stroke={C.rule}
            strokeWidth={3}
            strokeDasharray={fill < 1 ? '8 6' : undefined}
          />
          <rect
            x={(i % cols) * (cell + gap)}
            y={Math.floor(i / cols) * (cell + gap)}
            width={cell}
            height={cell}
            rx={8}
            fill={TONES.maroon.soft}
            stroke={TONES.maroon.strong}
            strokeWidth={3}
            opacity={fill}
          />
        </g>
      ))}
    </Interactive.Svg>
  );
};
