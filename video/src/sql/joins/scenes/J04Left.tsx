import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {COURSE_TITLE, ENROLMENT, Null} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {Narration, Venn} from '../shared';

const LEFT = `SELECT c.title, e.student_id, e.grade
FROM course c
LEFT JOIN enrolment e
  ON e.course_id = c.course_id;`;
const ANTI = `SELECT c.title, e.student_id, e.grade
FROM course c
LEFT JOIN enrolment e
  ON e.course_id = c.course_id
WHERE e.course_id IS NULL;`;

const RESULT_COLS: Column[] = [
  {key: 'title', label: 'title', width: 190, tone: 'orange'},
  {key: 'student_id', label: 'student_id', width: 180, tone: 'blue'},
  {key: 'grade', label: 'grade', width: 120, tone: 'maroon'},
];
const MARKETING = 3;
const ROWS: React.ReactNode[][] = [
  ...[0, 2, 4].map((r) => [COURSE_TITLE[ENROLMENT[r][1]], ENROLMENT[r][0], ENROLMENT[r][2]]),
  ['Marketing', <Null key="s" />, <Null key="g" />],
  ...[3, 5, 1].map((r) => [COURSE_TITLE[ENROLMENT[r][1]], ENROLMENT[r][0], ENROLMENT[r][2]]),
];

// 0.8 every course, even the empty ones · 6.8 keeps every row of the left table; Marketing
// comes back with NULLs · 16 keep the rows where the enrolment side is NULL: anti-join · 25.2 Marketing
const LeftInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const anti = prog(f, 16.2, 17);
  const dim = prog(f, 19, 20);
  const nulls = prog(f, 11.6, 12.4);
  return (
    <SceneShell style={style}>
      <Narration scene="left" />
      <Heading name="Heading" premountFor={fps}>
        LEFT JOIN
      </Heading>
      <SqlCode
        name="Left join"
        code={LEFT}
        x={100}
        y={200}
        width={1080}
        opacity={prog(f, 0.8, 1.4) * (1 - anti)}
        line={(i) => ({highlight: i === 2 ? prog(f, 6.8, 7.4) * (1 - prog(f, 14, 14.6)) : 0})}
      />
      <SqlCode
        name="Anti-join"
        code={ANTI}
        x={100}
        y={200}
        width={1080}
        opacity={anti}
        line={(i) => ({highlight: i === 4 ? prog(f, 17, 17.6) : 0})}
      />
      <Venn name="Venn left" x={140} y={570} labels={['course', 'enrolment']} a={prog(f, 7.4, 8.2)} both={prog(f, 3, 3.8) * (1 - prog(f, 18.4, 19.2))} b={0} opacity={prog(f, 2.4, 3)} />
      <DataTable
        name="Result"
        title="Result"
        x={1260}
        y={530}
        columns={RESULT_COLS}
        rows={ROWS}
        style={{opacity: prog(f, 2.4, 3)}}
        rowOpacity={(r) => (r === MARKETING ? prog(f, 9.4, 10) : prog(f, 2.8 + r * 0.25, 3.3 + r * 0.25) * (1 - 0.8 * dim))}
        cell={(r, c) => (r === MARKETING ? {bg: c > 0 && nulls > 0 ? TONES.orange.soft : undefined, outline: prog(f, 20, 20.6)} : undefined)}
      />
      <Chip tone="orange" size={34} style={{left: 660, top: 640, opacity: prog(f, 9.4, 10.2) * (1 - anti)}}>
        Every course is kept
      </Chip>
      <Chip tone="teal" size={34} style={{left: 660, top: 640, opacity: prog(f, 20.6, 21.4)}}>
        Anti-join: no partner
      </Chip>
      <Chip tone="neutral" size={34} style={{left: 660, top: 740, opacity: prog(f, 25.2, 26)}}>
        Nobody takes Marketing
      </Chip>
    </SceneShell>
  );
};

export const LeftScene = Interactive.withSchema({
  Component: LeftInner,
  componentName: '<LeftScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
