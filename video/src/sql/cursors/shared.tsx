import type React from 'react';
import {Interactive} from 'remotion';
import type {Column} from '../../components/DataTable';
import {Chip} from '../../components/Shell';
import {C, FONT, TONES, type Tone} from '../../theme';
import {MONO} from '../common/SqlCode';

export {Narration} from './narration';

/* ---- The enrolment rows of the website card `cursors`, in the cursor's ORDER BY course_id, student_id ---- */

export const GRADES = [
  ['S01', 'C10', '4.0'],
  ['S02', 'C10', '6.5'],
  ['S03', 'C10', '8.5'],
  ['S03', 'C11', '7.5'],
  ['S01', 'C20', '9.5'],
  ['S02', 'C20', '3.0'],
] as const;

/** The grades after the curve: C10 below 5 +1, below 7 +0.5; C20 +1; never above 10. */
export const CURVED = ['5.0', '7.0', '8.5', '7.5', '10.0', '4.0'] as const;

export const GRADE_COLS: Column[] = [
  {key: 'student_id', label: 'student_id', width: 180, tone: 'blue'},
  {key: 'course_id', label: 'course_id', width: 170, tone: 'orange'},
  {key: 'grade', label: 'grade', width: 120, tone: 'maroon'},
];

export const gradeRows = () => GRADES.map((r) => [...r] as React.ReactNode[]);

/** Monospace text inside a table cell or chip. */
export const Mono: React.FC<{readonly children: React.ReactNode; readonly size?: number; readonly color?: string}> = ({children, size = 26, color}) => (
  <span style={{fontFamily: MONO, fontSize: size, fontWeight: 700, color}}>{children}</span>
);

/** A PL/SQL record (e.g. r) holding the row just fetched: its name, then one cell per value. */
export const RecordBox: React.FC<{
  readonly name: string;
  readonly label: string;
  readonly values: readonly React.ReactNode[];
  readonly widths: readonly number[];
  readonly x: number;
  readonly y: number;
  readonly opacity?: number;
  /** 0..1 orange flash (the values just changed). */
  readonly flash?: number;
}> = ({name, label, values, widths, x, y, opacity = 1, flash = 0}) => (
  <Interactive.Div name={name} style={{position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 18, opacity, fontFamily: FONT}}>
    <span style={{fontFamily: MONO, fontSize: 34, fontWeight: 700, color: TONES.maroon.strong}}>{label}</span>
    <div
      style={{
        display: 'flex',
        borderRadius: 10,
        overflow: 'hidden',
        border: `2px solid ${C.rule}`,
        boxShadow: flash > 0 ? `0 0 0 ${5 * flash}px ${C.accent}` : '0 4px 18px rgba(26, 31, 108, 0.08)',
      }}
    >
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            width: widths[i],
            height: 58,
            boxSizing: 'border-box',
            borderLeft: i > 0 ? `2px solid ${C.rule}` : undefined,
            backgroundColor: C.surface,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            fontSize: 28,
            color: C.ink,
            whiteSpace: 'nowrap',
          }}
        >
          {v}
        </div>
      ))}
    </div>
  </Interactive.Div>
);

/** What DBMS_OUTPUT printed: a dark console strip. */
export const Output: React.FC<{
  readonly name: string;
  readonly lines: readonly string[];
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly opacity?: number;
}> = ({name, lines, x, y, width, opacity = 1}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      boxSizing: 'border-box',
      padding: '14px 26px',
      borderRadius: 14,
      backgroundColor: C.ink,
      color: C.surface,
      fontFamily: MONO,
      fontSize: 28,
      lineHeight: 1.45,
      opacity,
    }}
  >
    <div style={{fontFamily: FONT, fontSize: 22, fontWeight: 700, letterSpacing: 2, color: TONES.blue.soft, marginBottom: 4}}>OUTPUT</div>
    {lines.map((l) => (
      <div key={l}>{l}</div>
    ))}
  </Interactive.Div>
);

/** DECLARE → OPEN → FETCH → CLOSE, each step lit (0..1) while it is being explained. */
export const STEPS: readonly {readonly label: string; readonly tone: Tone}[] = [
  {label: 'DECLARE', tone: 'teal'},
  {label: 'OPEN', tone: 'blue'},
  {label: 'FETCH', tone: 'orange'},
  {label: 'CLOSE', tone: 'maroon'},
];

export const StepStrip: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly active: (i: number) => number;
  readonly opacity?: number;
}> = ({name, x, y, active, opacity = 1}) => (
  <Interactive.Div name={name} style={{position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 16, opacity}}>
    {STEPS.map((st, i) => {
      const a = active(i);
      return (
        <div key={st.label} style={{display: 'flex', alignItems: 'center', gap: 16}}>
          {i > 0 ? <div style={{fontSize: 36, fontWeight: 700, color: C.accent, fontFamily: FONT}}>→</div> : null}
          <Chip tone={st.tone} size={28} style={{position: 'relative', opacity: 0.35 + 0.65 * a, boxShadow: a > 0 ? `0 0 0 ${4 * a}px ${C.accent}` : undefined}}>
            {st.label}
          </Chip>
        </div>
      );
    })}
  </Interactive.Div>
);
