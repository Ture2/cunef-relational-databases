import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, FONT, TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {MONO, SqlCode} from '../../common/SqlCode';
import {Pointer} from '../../common/ui';
import {CodeBox, codeSpan, Mark, Narration} from '../shared';

const CODE = `SELECT e.course_id, e.student_id, e.grade
FROM enrolment e
WHERE e.grade = (SELECT MAX(x.grade)
                 FROM enrolment x
                 WHERE x.course_id = e.course_id)
ORDER BY e.course_id;`;

const CX = 100;
const CY = 200;
const SIZE = 28;
const OUTER_COL = codeSpan(CX, CY, 4, 37, 11, SIZE);

const TX = 140;
const Y = 590;
const gE = geom(ENROLMENT_COLS, TX, Y);
const MAX: Record<string, string> = {C10: '8.5', C11: '9.0', C20: '7.0'};
/* The tutor's walk: when each outer row is visited. */
const STEP = 1.7;
const T0 = 11.4;
const at = (r: number) => T0 + r * STEP;
const best = (r: number) => ENROLMENT[r][2] === MAX[ENROLMENT[r][1]];

const RESULT_COLS: Column[] = [
  {key: 'course_id', label: 'course_id', width: 170, tone: 'orange'},
  {key: 'student_id', label: 'student_id', width: 180, tone: 'blue'},
  {key: 'grade', label: 'grade', width: 120, tone: 'maroon'},
];
/* ORDER BY e.course_id: the enrolment row behind each result row. */
const RESULT = [0, 3, 1];

const FILE_W = 470;
const FILE_H = 116;

// 0.8 uses a column of the outer query; a tutor opening each student's file: runs again for every
// row · 10.8 for each enrolment, the best grade of that row's course; kept if equal (walk 11.4–21)
// · 22.4 the top student of each course; a tie returns several rows
const CorrelatedInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  // Current row of the walk, and the pointer's y (eased between rows).
  let row = 0;
  let py = gE.rowCy(0);
  for (let r = 1; r < ENROLMENT.length; r++) {
    py += (gE.rowCy(r) - gE.rowCy(r - 1)) * prog(f, at(r) - 0.4, at(r));
    if (f >= (at(r) - 0.2) * fps) row = r;
  }
  const walking = prog(f, T0 - 0.6, T0) * (1 - prog(f, at(5) + 1.2, at(5) + 1.8));
  const fileTop = Math.min(Math.max(py - FILE_H / 2, Y), 1000 - FILE_H);
  const course = ENROLMENT[row][1];
  return (
    <SceneShell style={style}>
      <Narration scene="correlated" />
      <Heading name="Heading" premountFor={fps}>
        Correlated subquery
      </Heading>
      <SqlCode
        name="Query"
        code={CODE}
        x={CX}
        y={CY}
        width={950}
        size={SIZE}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({opacity: prog(f, 0.8 + i * 0.3, 1.3 + i * 0.3), highlight: i >= 2 && i <= 4 ? prog(f, 11, 11.6) * (1 - prog(f, 21.4, 22)) : 0, tone: 'maroon'})}
      />
      <CodeBox name="Outer column" box={OUTER_COL} outline={prog(f, 3, 3.6)} />
      <DataTable
        name="Enrolment e"
        title="enrolment e"
        x={TX}
        y={Y}
        columns={ENROLMENT_COLS}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 4.4, 5)}}
        cell={(r, c) => {
          if (walking > 0 && r === row) return {bg: TONES.orange.soft, outline: c === 1 ? 1 : 0};
          if (best(r) && f >= (at(r) + 0.9) * fps) return {bg: TONES.teal.soft};
          return undefined;
        }}
      />
      <Pointer name="Tutor" x={TX - 48} y={py} opacity={prog(f, 5.6, 6.2) * (1 - prog(f, at(5) + 1.2, at(5) + 1.8))} />
      {ENROLMENT.map((_, r) => (
        <Mark key={r} name={`Check ${r}`} ok={best(r)} x={TX + gE.width + 18} y={gE.rowCy(r)} opacity={prog(f, at(r) + 0.8, at(r) + 1.2)} size={40} />
      ))}
      <Interactive.Div
        name="Inner run"
        style={{
          position: 'absolute',
          left: 730,
          top: fileTop,
          width: FILE_W,
          height: FILE_H,
          boxSizing: 'border-box',
          padding: '12px 20px',
          borderRadius: 12,
          backgroundColor: C.surface,
          border: `2px solid ${C.rule}`,
          borderLeft: `8px solid ${TONES.maroon.strong}`,
          boxShadow: '0 4px 18px rgba(26, 31, 108, 0.12)',
          fontFamily: MONO,
          fontSize: 28,
          lineHeight: 1.5,
          color: C.ink,
          opacity: walking,
        }}
      >
        <div>
          x.course_id = <span style={{color: TONES.orange.strong}}>&apos;{course}&apos;</span>
        </div>
        <div>
          MAX(x.grade) = <b style={{color: TONES.maroon.strong}}>{MAX[course]}</b>
        </div>
      </Interactive.Div>
      <DataTable
        name="Result"
        title="Result: the best grade per course"
        titleOpacity={prog(f, 22.4, 23)}
        x={1290}
        y={Y}
        columns={RESULT_COLS}
        rows={RESULT.map((r) => [ENROLMENT[r][1], ENROLMENT[r][0], ENROLMENT[r][2]])}
        style={{opacity: prog(f, 11.6, 12.2)}}
        rowOpacity={(i) => prog(f, at(RESULT[i]) + 1, at(RESULT[i]) + 1.6)}
        cell={() => ({outline: prog(f, 22.6, 23.2) * (1 - prog(f, 25.6, 26.2))})}
      />
      <Chip tone="orange" size={32} style={{left: 1110, top: 220, opacity: prog(f, 3.4, 4)}}>
        Uses <span style={{fontFamily: MONO}}>e.course_id</span> of the outer row
      </Chip>
      <Chip tone="maroon" size={32} style={{left: 1110, top: 315, opacity: prog(f, 8.4, 9)}}>
        Runs again for every outer row
      </Chip>
      <Chip tone="neutral" size={32} style={{left: 1110, top: 410, opacity: prog(f, 26, 26.6), fontFamily: FONT}}>
        A tie: several rows
      </Chip>
    </SceneShell>
  );
};

export const CorrelatedScene = Interactive.withSchema({
  Component: CorrelatedInner,
  componentName: '<CorrelatedScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
