import type React from 'react';
import {Interactive} from 'remotion';
import type {Column} from '../../components/DataTable';
import {C, FONT, TONES, type Tone} from '../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../common/school';
import {MONO} from '../common/SqlCode';

export {Narration} from './narration';

/* ---- The enrolment table of the video: SCHOOL's six rows + the row enrol_student adds -------------- */

export const ENROL_COLS: Column[] = ENROLMENT_COLS;
/** Index of the row added by enrol_student('S03', 'C20', …): no grade yet. */
export const NEW_ROW = 6;
export const ENROL_ROWS: (readonly (string | null)[])[] = [...ENROLMENT.map((r) => [...r]), ['S03', 'C20', null]];

/** letter_grade of the site card: NULL → '-', ≥ 9 A, ≥ 7 B, ≥ 5 C, else F. */
export const letterGrade = (g: string | null) => {
  if (g === null) return '-';
  const n = Number(g);
  return n >= 9 ? 'A' : n >= 7 ? 'B' : n >= 5 ? 'C' : 'F';
};

/** What DBMS_OUTPUT prints (or what an OUT variable holds): a white box with a small label. */
export const OutputBox: React.FC<{
  readonly name: string;
  readonly label: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly opacity?: number;
  readonly tone?: Tone;
  readonly size?: number;
}> = ({name, label, text, x, y, width, opacity = 1, tone = 'teal', size = 30}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '14px 22px',
      borderRadius: 12,
      backgroundColor: C.surface,
      border: `3px solid ${TONES[tone].strong}`,
      opacity,
      translate: `0px ${(1 - opacity) * 14}px`,
    }}
  >
    <span style={{fontFamily: FONT, fontSize: 24, fontWeight: 700, color: TONES[tone].strong, whiteSpace: 'nowrap'}}>{label}</span>
    <span style={{fontFamily: MONO, fontSize: size, color: C.ink, whiteSpace: 'nowrap'}}>{text}</span>
  </Interactive.Div>
);

/** A labelled rounded box (an application, the database…). */
export const Box: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly tone?: Tone;
  readonly opacity?: number;
  readonly outline?: number;
  readonly children?: React.ReactNode;
  readonly style?: React.CSSProperties;
}> = ({name, x, y, width, height, tone = 'neutral', opacity = 1, outline = 0, children, style}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      boxSizing: 'border-box',
      borderRadius: 16,
      backgroundColor: TONES[tone].soft,
      border: `3px solid ${TONES[tone].strong}`,
      boxShadow: outline > 0 ? `0 0 0 ${5 * outline}px ${C.accent}` : undefined,
      fontFamily: FONT,
      color: tone === 'neutral' ? C.ink : TONES[tone].strong,
      opacity,
      ...style,
    }}
  >
    {children}
  </Interactive.Div>
);

/** A vending machine: a coin goes in, a can drops out. drop 0..1 moves the can down. */
export const VendingIcon: React.FC<{readonly name: string; readonly x: number; readonly y: number; readonly opacity?: number; readonly drop?: number}> = ({
  name,
  x,
  y,
  opacity = 1,
  drop = 0,
}) => (
  <Interactive.Svg name={name} width={170} height={230} viewBox="0 0 170 230" style={{position: 'absolute', left: x, top: y, opacity, overflow: 'visible'}}>
    <rect x={4} y={4} width={162} height={222} rx={14} fill={TONES.orange.soft} stroke={TONES.orange.strong} strokeWidth={5} />
    <rect x={20} y={22} width={92} height={120} rx={6} fill={C.surface} stroke={TONES.orange.strong} strokeWidth={3} />
    {[0, 1, 2].map((r) =>
      [0, 1].map((c) => <rect key={`${r}${c}`} x={30 + c * 40} y={32 + r * 38} width={30} height={28} rx={4} fill={TONES.orange.strong} opacity={0.35} />),
    )}
    <rect x={126} y={30} width={26} height={8} rx={4} fill={TONES.orange.strong} />
    {[0, 1, 2].map((i) => (
      <circle key={i} cx={139} cy={62 + i * 26} r={9} fill={C.surface} stroke={TONES.orange.strong} strokeWidth={3} />
    ))}
    <rect x={20} y={165} width={130} height={44} rx={6} fill={C.ink} opacity={0.85} />
    <rect x={64} y={124 + drop * 50} width={30} height={34} rx={5} fill={C.accent} opacity={drop > 0 ? 1 : 0} />
  </Interactive.Svg>
);

/** A calculator: a display and a grid of keys. */
export const CalculatorIcon: React.FC<{readonly name: string; readonly x: number; readonly y: number; readonly opacity?: number; readonly answer?: string}> = ({
  name,
  x,
  y,
  opacity = 1,
  answer = '',
}) => (
  <Interactive.Svg name={name} width={170} height={230} viewBox="0 0 170 230" style={{position: 'absolute', left: x, top: y, opacity, overflow: 'visible'}}>
    <rect x={4} y={4} width={162} height={222} rx={14} fill={TONES.teal.soft} stroke={TONES.teal.strong} strokeWidth={5} />
    <rect x={20} y={20} width={130} height={46} rx={6} fill={C.surface} stroke={TONES.teal.strong} strokeWidth={3} />
    <text x={138} y={55} textAnchor="end" fontFamily={MONO} fontSize={32} fontWeight={700} fill={C.ink}>
      {answer}
    </text>
    {[0, 1, 2, 3].map((r) =>
      [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={22 + c * 44} y={82 + r * 35} width={36} height={27} rx={5} fill={TONES.teal.strong} opacity={r === 3 && c === 2 ? 0.9 : 0.3} />
      )),
    )}
  </Interactive.Svg>
);
