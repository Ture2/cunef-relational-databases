import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {COURSE, COURSE_COLS} from '../../common/school';
import {MONO, SqlCode} from '../../common/SqlCode';
import {Arrow} from '../../common/ui';
import {CodeBox, codeSpan, Narration} from '../shared';

const CODE = `SELECT c.title, avg_c.average
FROM (SELECT course_id, ROUND(AVG(grade), 2) AS average
      FROM enrolment
      GROUP BY course_id) avg_c
JOIN course c ON c.course_id = avg_c.course_id
WHERE avg_c.average >= 7;`;

const CX = 100;
const CY = 200;
const SIZE = 28;
const INNER_LINE = codeSpan(CX, CY, 1, 5, 52, SIZE);
const INNER = {...INNER_LINE, height: INNER_LINE.height * 3};
const ALIAS = codeSpan(CX, CY, 3, 26, 5, SIZE);

const Y = 620;
/* avg_c: ROUND(AVG(grade), 2) per course: (8.5 + 6.5 + 5.0) / 3, (9.0 + 7.5) / 2, 7.0 / 1. */
const AVG_C = [
  {id: 'C10', avg: '6.67', at: 13.6, keep: false},
  {id: 'C11', avg: '8.25', at: 15.6, keep: true},
  {id: 'C20', avg: '7', at: 17.6, keep: true},
];
const AVG_COLS: Column[] = [
  {key: 'course_id', label: 'course_id', width: 170, tone: 'orange'},
  {key: 'average', label: 'average', width: 160, tone: 'maroon'},
];
const CO_COLS = COURSE_COLS.slice(0, 2);
const RESULT_COLS: Column[] = [
  {key: 'title', label: 'title', width: 190, tone: 'orange'},
  {key: 'average', label: 'average', width: 160, tone: 'maroon'},
];
const RESULT = [
  ['Python', '8.25'],
  ['Statistics', '7'],
];

// 0.8 an inline view: a temporary table you can query, with an alias; no AS before it · 10.8 the
// average per course: 6.67, 8.25, 7 · 20.2 join it to course, keep averages of 7 or more
const FromInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const join = prog(f, 20.8, 21.4);
  const drop = prog(f, 22.6, 23.4);
  return (
    <SceneShell style={style}>
      <Narration scene="from" />
      <Heading name="Heading" premountFor={fps}>
        A subquery in FROM
      </Heading>
      <SqlCode
        name="Query"
        code={CODE}
        x={CX}
        y={CY}
        width={1000}
        size={SIZE}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({opacity: prog(f, 0.8 + i * 0.25, 1.3 + i * 0.25), highlight: i === 4 ? prog(f, 20.2, 20.8) * (1 - prog(f, 21.8, 22.4)) : i === 5 ? prog(f, 21.8, 22.4) : 0})}
      />
      <CodeBox name="Inline view" box={INNER} outline={prog(f, 1.8, 2.4) * (1 - prog(f, 5.6, 6.2))} />
      <CodeBox name="Alias" box={ALIAS} outline={prog(f, 5.8, 6.4)} />
      <DataTable
        name="avg_c"
        title="avg_c (inline view)"
        x={100}
        y={Y}
        columns={AVG_COLS}
        rows={AVG_C.map((r) => [r.id, r.avg])}
        style={{opacity: prog(f, 3.6, 4.2)}}
        rowOpacity={(r) => prog(f, AVG_C[r].at, AVG_C[r].at + 0.6)}
        cell={(r) => ({
          dashed: true,
          bg: !AVG_C[r].keep && drop > 0 ? TONES.orange.soft : AVG_C[r].keep && drop > 0 ? TONES.teal.soft : undefined,
          strike: AVG_C[r].keep ? 0 : prog(f, 23, 23.6),
        })}
      />
      <DataTable
        name="Course"
        title="course c"
        x={560}
        y={Y}
        columns={CO_COLS}
        rows={COURSE.map((r) => [r[0], r[1]])}
        style={{opacity: prog(f, 20.2, 20.8)}}
        cell={(r) => (r < 3 && join > 0 ? {bg: TONES.orange.soft, outline: join * (1 - prog(f, 22.4, 23))} : undefined)}
        rowOpacity={(r) => (r === 3 ? 1 - 0.6 * join : 1)}
      />
      <Arrow name="To result" from={{x: 950, y: Y + 150}} to={{x: 1250, y: Y + 150}} progress={prog(f, 23.4, 24)} />
      <DataTable
        name="Result"
        title="Result: 2 rows"
        titleOpacity={prog(f, 23.6, 24.2)}
        x={1300}
        y={Y}
        columns={RESULT_COLS}
        rows={RESULT}
        style={{opacity: prog(f, 23.6, 24.2)}}
        rowOpacity={(i) => prog(f, 24 + i * 0.8, 24.6 + i * 0.8)}
      />
      <Chip tone="maroon" size={32} style={{left: 1160, top: 220, opacity: prog(f, 4.2, 4.8)}}>
        A temporary table, with an alias
      </Chip>
      <Chip tone="orange" size={32} style={{left: 1160, top: 315, opacity: prog(f, 8.2, 8.8)}}>
        <span style={{fontFamily: MONO}}>) avg_c</span> not <span style={{fontFamily: MONO, textDecoration: 'line-through'}}>AS avg_c</span>
      </Chip>
    </SceneShell>
  );
};

export const FromScene = Interactive.withSchema({
  Component: FromInner,
  componentName: '<FromScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
