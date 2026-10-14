import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {Narration} from '../shared';

const CODE = `SELECT a.course_id, a.student_id, b.student_id
FROM enrolment a
JOIN enrolment b
  ON b.course_id = a.course_id
 AND a.student_id < b.student_id;`;

const COLS = ENROLMENT_COLS.slice(0, 2);
const ROWS = ENROLMENT.map((r) => [r[0], r[1]]);
const C10 = [0, 2, 4];
const RESULT_COLS: Column[] = [
  {key: 'course', label: 'course_id', width: 170, tone: 'orange'},
  {key: 's1', label: 'student_1', width: 170, tone: 'blue'},
  {key: 's2', label: 'student_2', width: 170, tone: 'blue'},
];
const PAIRS = [
  ['C10', 'S01', 'S02'],
  ['C10', 'S01', 'S03'],
  ['C10', 'S02', 'S03'],
  ['C11', 'S02', 'S03'],
];

// 0.8 a table joined with itself, two aliases · 5.8 pair the enrolments of the same course
// · 9.6 a.student_id < b.student_id: no self-pairs, each pair once · 14 the 4 pairs of classmates
const SelfInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const same = prog(f, 7.2, 7.8) * (1 - prog(f, 13.4, 14));
  const cell = (r: number) => (C10.indexOf(r) >= 0 && same > 0 ? {bg: TONES.teal.soft, outline: same} : undefined);
  const hl = (i: number) => {
    if (i === 1 || i === 2) return prog(f, 2.4, 3) * (1 - prog(f, 5.4, 6));
    if (i === 3) return prog(f, 6.2, 6.8) * (1 - prog(f, 9.4, 10));
    if (i === 4) return prog(f, 10, 10.6);
    return 0;
  };
  return (
    <SceneShell style={style}>
      <Narration scene="self" />
      <Heading name="Heading" premountFor={fps}>
        Self-join
      </Heading>
      <SqlCode
        name="Query"
        code={CODE}
        x={100}
        y={200}
        width={1080}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({opacity: i < 3 ? 1 : prog(f, 5.8 + (i - 3) * 3.6, 6.4 + (i - 3) * 3.6), highlight: hl(i)})}
      />
      <DataTable name="Enrolment a" title="enrolment a" x={100} y={590} columns={COLS} rows={ROWS} style={{opacity: prog(f, 2, 2.6)}} cell={cell} />
      <DataTable name="Enrolment b" title="enrolment b" x={540} y={590} columns={COLS} rows={ROWS} style={{opacity: prog(f, 2.8, 3.4)}} cell={cell} />
      <DataTable
        name="Result"
        title="Result: pairs of classmates"
        x={1120}
        y={590}
        columns={RESULT_COLS}
        rows={PAIRS}
        style={{opacity: prog(f, 13.6, 14.2)}}
        rowOpacity={(r) => prog(f, 14 + r * 0.6, 14.6 + r * 0.6)}
      />
      <Chip tone="teal" size={32} style={{left: 1250, top: 230, opacity: prog(f, 11.6, 12.4)}}>
        No S01 – S01
      </Chip>
      <Chip tone="teal" size={32} style={{left: 1250, top: 330, opacity: prog(f, 15, 15.8)}}>
        S01 – S02 once, not twice
      </Chip>
    </SceneShell>
  );
};

export const SelfScene = Interactive.withSchema({
  Component: SelfInner,
  componentName: '<SelfScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
