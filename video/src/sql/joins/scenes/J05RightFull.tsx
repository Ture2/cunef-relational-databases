import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {Null} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {Narration, Venn} from '../shared';

const RIGHT = `FROM enrolment e
RIGHT JOIN course c ON e.course_id = c.course_id
-- the same rows as
FROM course c
LEFT JOIN enrolment e ON e.course_id = c.course_id`;
const FULL = `SELECT st.student_id, py.student_id
FROM (... WHERE course_id = 'C20') st
FULL OUTER JOIN
     (... WHERE course_id = 'C11') py
  ON py.student_id = st.student_id;`;

const RESULT_COLS: Column[] = [
  {key: 'st', label: 'in Statistics', width: 230, tone: 'orange'},
  {key: 'py', label: 'in Python', width: 230, tone: 'maroon'},
];
const ROWS: React.ReactNode[][] = [
  ['S01', <Null key="a" />],
  [<Null key="b" />, 'S02'],
  [<Null key="c" />, 'S03'],
];

// 0.8 RIGHT keeps every row of the right table; swap the tables and write LEFT
// · 10.4 FULL keeps the unmatched rows of both sides; Statistics vs Python: every row has a NULL
const RightFullInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const full = prog(f, 10.4, 11.2);
  return (
    <SceneShell style={style}>
      <Narration scene="rightfull" />
      <Heading name="Heading" premountFor={fps}>
        {full < 0.5 ? 'RIGHT JOIN' : 'FULL OUTER JOIN'}
      </Heading>
      <SqlCode
        name="Right join"
        code={RIGHT}
        x={100}
        y={200}
        width={1180}
        opacity={prog(f, 0.8, 1.4) * (1 - full)}
        line={(i) => ({opacity: i < 2 ? 1 : prog(f, 5.6 + (i - 2) * 0.4, 6.2 + (i - 2) * 0.4), highlight: i === 1 ? prog(f, 1.4, 2) : i === 4 ? prog(f, 6.8, 7.4) : 0})}
      />
      <SqlCode
        name="Full join"
        code={FULL}
        x={100}
        y={200}
        width={1180}
        opacity={full}
        line={(i) => ({highlight: i === 2 ? prog(f, 11.4, 12) : 0})}
      />
      <Venn
        name="Venn right full"
        x={160}
        y={590}
        labels={full < 0.5 ? ['enrolment', 'course'] : ['Statistics', 'Python']}
        tones={full < 0.5 ? ['maroon', 'orange'] : ['orange', 'maroon']}
        a={full}
        both={1}
        b={1}
        opacity={prog(f, 1.6, 2.2)}
      />
      <Chip tone="neutral" size={34} style={{left: 760, top: 700, opacity: prog(f, 7.2, 8) * (1 - full)}}>
        A RIGHT JOIN B = B LEFT JOIN A
      </Chip>
      <DataTable
        name="Full result"
        title="Result"
        x={1340}
        y={600}
        columns={RESULT_COLS}
        rows={ROWS}
        style={{opacity: prog(f, 14, 14.6)}}
        rowOpacity={(r) => prog(f, 14.6 + r * 0.6, 15.2 + r * 0.6)}
        cell={(r, c) => ((r === 0 && c === 1) || (r > 0 && c === 0) ? {bg: prog(f, 18.4, 19) > 0 ? TONES.orange.soft : undefined, outline: prog(f, 18.4, 19)} : undefined)}
      />
      <Chip tone="teal" size={34} style={{left: 760, top: 700, opacity: prog(f, 18.4, 19.2)}}>
        Nobody takes both
      </Chip>
    </SceneShell>
  );
};

export const RightFullScene = Interactive.withSchema({
  Component: RightFullInner,
  componentName: '<RightFullScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
