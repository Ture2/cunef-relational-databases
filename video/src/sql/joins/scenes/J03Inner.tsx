import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {COURSE, COURSE_COLS, COURSE_TITLE, ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {Links, Narration} from '../shared';

const CODE = `SELECT c.title, e.student_id, e.grade
FROM course c
JOIN enrolment e
  ON e.course_id = c.course_id;`;

const Y = 560;
const CO = {x: 100, cols: COURSE_COLS.slice(0, 2)};
const EN = {x: 620, cols: ENROLMENT_COLS};
const gC = geom(CO.cols, CO.x, Y);
const gE = geom(EN.cols, EN.x, Y);

const RESULT_COLS: Column[] = [
  {key: 'title', label: 'title', width: 190, tone: 'orange'},
  {key: 'student_id', label: 'student_id', width: 180, tone: 'blue'},
  {key: 'grade', label: 'grade', width: 120, tone: 'maroon'},
];
/* Each course row, the enrolment rows it matches, and when its links are drawn. */
const MATCHES = [
  {course: 0, rows: [0, 2, 4], at: 10.6},
  {course: 1, rows: [3, 5], at: 13.2},
  {course: 2, rows: [1], at: 15},
];
/* The result, ordered by title: [enrolment row, appears with course] */
const RESULT = [0, 2, 4, 3, 5, 1].map((r) => ({r, course: MATCHES.findIndex((m) => m.rows.indexOf(r) >= 0)}));

// 0.8 the query; ON matches the course ids · 10 Databases ×3, Python ×2, Statistics ×1
// · 18.6 Marketing finds no partner and disappears · 25.8 JOIN = INNER JOIN
const InnerInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const gone = prog(f, 19.4, 20.4);
  const links = MATCHES.flatMap((m) =>
    m.rows.map((r, i) => ({x1: gC.left(1) + CO.cols[1].width, y1: gC.rowCy(m.course), x2: gE.left(0), y2: gE.rowCy(r), t: prog(f, m.at + i * 0.3, m.at + i * 0.3 + 0.6)})),
  );
  return (
    <SceneShell style={style}>
      <Narration scene="inner" />
      <Heading name="Heading" premountFor={fps}>
        INNER JOIN
      </Heading>
      <SqlCode
        name="Query"
        code={CODE}
        x={100}
        y={200}
        width={1080}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({opacity: prog(f, 0.8 + i * 0.5, 1.3 + i * 0.5), highlight: i === 3 ? prog(f, 5.6, 6.2) * (1 - prog(f, 9.4, 10)) : i === 2 ? prog(f, 26, 26.6) : 0})}
      />
      <DataTable
        name="Course"
        title="course"
        x={CO.x}
        y={Y}
        columns={CO.cols}
        rows={COURSE.map((r) => [r[0], r[1]])}
        style={{opacity: prog(f, 2.6, 3.4)}}
        header={(c) => ({outline: c === 0 ? prog(f, 6.2, 6.8) * (1 - prog(f, 9.4, 10)) : 0})}
        cell={(r) => (r === 3 && gone > 0 ? {bg: TONES.orange.soft, outline: gone, strike: prog(f, 20.4, 21.2)} : undefined)}
      />
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={EN.x}
        y={Y}
        columns={EN.cols}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 3.2, 4)}}
        header={(c) => ({outline: c === 1 ? prog(f, 6.2, 6.8) * (1 - prog(f, 9.4, 10)) : 0})}
      />
      <Links name="Matches" links={links} />
      <DataTable
        name="Result"
        title="Result: 6 rows"
        titleOpacity={prog(f, 16, 16.6)}
        x={1260}
        y={Y}
        columns={RESULT_COLS}
        rows={RESULT.map(({r}) => [COURSE_TITLE[ENROLMENT[r][1]], ENROLMENT[r][0], ENROLMENT[r][2]])}
        style={{opacity: prog(f, 10, 10.6)}}
        rowOpacity={(i) => prog(f, MATCHES[RESULT[i].course].at + 0.8, MATCHES[RESULT[i].course].at + 1.4)}
      />
      <Chip tone="orange" size={30} style={{left: 100, top: 880, opacity: gone}}>
        No partner: dropped
      </Chip>
      <Chip tone="teal" size={36} style={{left: 1240, top: 230, opacity: prog(f, 22.4, 23.2)}}>
        Only the rows that match
      </Chip>
      <Chip tone="neutral" size={36} style={{left: 1240, top: 330, opacity: prog(f, 26, 26.8)}}>
        JOIN = INNER JOIN
      </Chip>
    </SceneShell>
  );
};

export const InnerScene = Interactive.withSchema({
  Component: InnerInner,
  componentName: '<InnerScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
