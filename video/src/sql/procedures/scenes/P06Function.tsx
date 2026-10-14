import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {cells} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {ENROL_ROWS, letterGrade, NEW_ROW, Narration} from '../shared';

const FUNC = `CREATE OR REPLACE FUNCTION letter_grade
  (p_grade IN NUMBER) RETURN VARCHAR2 IS
BEGIN
  RETURN CASE
           WHEN p_grade IS NULL THEN '-'
           WHEN p_grade >= 9 THEN 'A'
           WHEN p_grade >= 7 THEN 'B'
           WHEN p_grade >= 5 THEN 'C'
           ELSE 'F'
         END;
END letter_grade;
/`;
const QUERY = `SELECT student_id, course_id, grade,
       letter_grade(grade) AS letter
FROM enrolment
ORDER BY student_id, course_id;`;

const SIZE = 26;
const QY = 760;
const RESULT_COLS: Column[] = [
  {key: 'student_id', label: 'student_id', width: 180, tone: 'blue'},
  {key: 'course_id', label: 'course_id', width: 170, tone: 'orange'},
  {key: 'grade', label: 'grade', width: 120, tone: 'maroon'},
  {key: 'letter', label: 'letter', width: 130, tone: 'teal'},
];
const RX = 1080;
const RY = 300;
const gR = geom(RESULT_COLS, RX, RY);
const ROWS = cells(ENROL_ROWS.map((r) => [...r, letterGrade(r[2])]));
/* Rows the voice points at: 8.5 → B, 9.0 → A, the new row → '-'. */
const CALLOUTS = [
  {row: 0, at: 20.8},
  {row: 3, at: 22.3},
  {row: NEW_ROW, at: 24.6},
];
/* CASE branches A, B, C, F and when the voice reads each one. */
const BRANCHES = [
  {line: 5, at: 5.8},
  {line: 6, at: 6.9},
  {line: 7, at: 8},
  {line: 8, at: 9.2},
];

// 0.8 a function returns a value · 2.9 takes a grade, returns a letter · 5.8 A from 9, B from 7, C from 5, else F
// · 11.6 it returns a SQL type: call it inside a query · 15.2 like a built-in function
// · 18.8 each enrolment gets its letter · 20.5 8.5 is a B · 22.1 9 is an A · 23.4 the new row, no grade: a dash
const FunctionInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const hl = (i: number) => {
    if (i === 1) return prog(f, 1.8, 2.3) * (1 - prog(f, 4.6, 5.1));
    if (i === 3) return prog(f, 4.4, 4.9) * (1 - prog(f, 10.4, 10.9));
    const b = BRANCHES.find((x) => x.line === i);
    if (b) return prog(f, b.at, b.at + 0.4) * (1 - prog(f, 10.4, 10.9));
    return 0;
  };
  return (
    <SceneShell style={style}>
      <Narration scene="func" />
      <Heading name="Heading" premountFor={fps}>
        A function returns a value
      </Heading>
      <SqlCode name="Function" code={FUNC} x={100} y={210} width={860} size={SIZE} opacity={prog(f, 0.8, 1.4)} line={(i) => ({highlight: hl(i), tone: 'teal'})} />
      <SqlCode
        name="Query"
        code={QUERY}
        x={100}
        y={QY}
        width={860}
        size={SIZE}
        opacity={prog(f, 12, 12.6)}
        line={(i) => ({highlight: i === 1 ? prog(f, 12.8, 13.3) : 0, tone: 'teal'})}
      />
      <DataTable
        name="Result"
        title="Result: 7 rows"
        titleOpacity={prog(f, 18.8, 19.4)}
        x={RX}
        y={RY}
        columns={RESULT_COLS}
        rows={ROWS}
        style={{opacity: prog(f, 18.6, 19.2)}}
        rowOpacity={(r) => prog(f, 18.8 + r * 0.22, 19.3 + r * 0.22)}
        colOpacity={(c) => (c === 3 ? prog(f, 19.4, 20.2) : 1)}
        cell={(r, c) => {
          const co = CALLOUTS.find((x) => x.row === r);
          if (!co || c < 2) return undefined;
          const t = prog(f, co.at, co.at + 0.5);
          return t > 0 ? {bg: TONES.teal.soft, outline: t} : undefined;
        }}
      />
      <Chip tone="teal" size={30} style={{left: RX, top: gR.bottom(7) + 30, opacity: prog(f, 15.4, 16.1)}}>
        Used like a built-in function
      </Chip>
    </SceneShell>
  );
};

export const FunctionScene = Interactive.withSchema({
  Component: FunctionInner,
  componentName: '<FunctionScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
