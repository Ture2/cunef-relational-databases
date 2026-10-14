import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {Arrow} from '../../common/ui';
import {CodeBox, codeSpan, Mark, Narration, Val, ValuePanel} from '../shared';

const CODE = `SELECT student_id, course_id, grade
FROM enrolment
WHERE grade > (SELECT AVG(grade) FROM enrolment)
ORDER BY grade DESC;`;

const CX = 100;
const CY = 200;
const INNER = codeSpan(CX, CY, 2, 14, 34);
const Y = 600;
/* The rows above 7.25 and, in result order (grade DESC), when the voice names them. */
const ABOVE = [0, 3, 5];
const RESULT = [
  {r: 3, at: 21.6},
  {r: 0, at: 22.6},
  {r: 5, at: 24},
];

// 0.8 which grades are above the average? ask a colleague for the figure · 9.8 the inner query runs
// first; the average of the six grades is 7.25; that value takes its place · 20.4 three grades beat it
const ScalarInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const grades = prog(f, 12.6, 13.2) * (1 - prog(f, 19.6, 20.2));
  const beat = prog(f, 20.8, 21.4);
  return (
    <SceneShell style={style}>
      <Narration scene="scalar" />
      <Heading name="Heading" premountFor={fps}>
        A subquery in WHERE
      </Heading>
      <SqlCode
        name="Query"
        code={CODE}
        x={CX}
        y={CY}
        width={1080}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({opacity: prog(f, 0.8 + i * 0.5, 1.3 + i * 0.5)})}
      />
      <CodeBox name="Inner query" box={INNER} outline={prog(f, 5.2, 5.8)} replace={prog(f, 17, 17.8)} value="7.25" />
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={100}
        y={Y}
        columns={ENROLMENT_COLS}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 2.4, 3.2)}}
        cell={(r, c) => {
          if (c === 2 && grades > 0) return {bg: TONES.maroon.soft};
          if (ABOVE.indexOf(r) >= 0 && beat > 0) return {bg: TONES.teal.soft, outline: beat};
          return undefined;
        }}
      />
      <ValuePanel name="Inner result" title="The inner query runs first" x={680} y={Y + 20} width={500} opacity={prog(f, 10, 10.8)} outline={prog(f, 15.6, 16.2) * (1 - prog(f, 19, 19.6))}>
        <Val t={prog(f, 10.4, 11)}>AVG(grade)</Val>
        <br />
        <Val t={prog(f, 13, 13.6)}>= 43.5 / 6</Val>
        <br />
        <Val t={prog(f, 15, 15.6)} color={TONES.orange.strong}>
          <b>= 7.25</b>
        </Val>
      </ValuePanel>
      <Arrow name="Value to query" from={{x: 900, y: Y + 10}} to={{x: INNER.left + INNER.width / 2, y: INNER.top + INNER.height + 8}} progress={prog(f, 16.4, 17.2)} />
      {ABOVE.map((r) => (
        <Mark key={r} name={`Above ${r}`} ok x={590} y={Y + 64 + r * 58 + 29} opacity={beat} size={40} />
      ))}
      <DataTable
        name="Result"
        title="Result: 3 rows"
        titleOpacity={prog(f, 21, 21.6)}
        x={1260}
        y={Y}
        columns={ENROLMENT_COLS}
        rows={RESULT.map(({r}) => [...ENROLMENT[r]])}
        style={{opacity: prog(f, 20.6, 21.2)}}
        rowOpacity={(i) => prog(f, RESULT[i].at, RESULT[i].at + 0.6)}
      />
      <Chip tone="maroon" size={34} style={{left: 1260, top: 230, opacity: prog(f, 10, 10.8)}}>
        Inner query first
      </Chip>
      <Chip tone="orange" size={34} style={{left: 1260, top: 330, opacity: prog(f, 17.4, 18.2)}}>
        One value: 7.25
      </Chip>
    </SceneShell>
  );
};

export const ScalarScene = Interactive.withSchema({
  Component: ScalarInner,
  componentName: '<ScalarScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
