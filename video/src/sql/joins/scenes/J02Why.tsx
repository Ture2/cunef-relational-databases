import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom} from '../../../components/DataTable';
import {DependencyArrow} from '../../../components/DependencyArrow';
import {Caption, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {cells, COURSE, COURSE_COLS, ENROLMENT, ENROLMENT_COLS, STUDENT, STUDENT_COLS} from '../../common/school';
import {Narration} from '../shared';

const Y = 330;
const ST = {x: 80, cols: STUDENT_COLS};
const EN = {x: 760, cols: ENROLMENT_COLS};
const CO = {x: 1330, cols: COURSE_COLS.slice(0, 2)};
const gS = geom(ST.cols, ST.x, Y);
const gE = geom(EN.cols, EN.x, Y);
const gC = geom(CO.cols, CO.x, Y);

// 0.8 students in one table, courses in another · 8 enrolment stores the two ids as FKs
// · 12 follow the keys back · 16.3 a join pairs the rows whose keys match (S01 · C10)
const WhyInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const match = prog(f, 16.6, 17.4);
  const hl = (r: number) => (r === 0 && match > 0 ? {bg: TONES.orange.soft, outline: match} : undefined);
  return (
    <SceneShell style={style}>
      <Narration scene="why" />
      <Heading name="Heading" premountFor={fps}>
        Why join?
      </Heading>
      <DataTable name="Student" title="student" x={ST.x} y={Y} columns={ST.cols} rows={cells(STUDENT)} style={{opacity: prog(f, 0.8, 1.6)}} cell={hl} />
      <DataTable
        name="Course"
        title="course"
        x={CO.x}
        y={Y}
        columns={CO.cols}
        rows={COURSE.map((r) => [r[0], r[1]])}
        style={{opacity: prog(f, 4.2, 5)}}
        cell={hl}
      />
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={EN.x}
        y={Y}
        columns={EN.cols}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 8, 8.8)}}
        header={(c) => ({fk: c < 2 ? prog(f, 10, 10.6) : 0})}
        cell={(r, c) => (c < 2 ? hl(r) : undefined)}
      />
      <DependencyArrow name="FK to student" from={{x: gE.cx(0), y: gE.headTop - 54}} to={{x: gS.cx(0), y: gS.headTop - 54}} bend={50} progress={prog(f, 12.2, 13.6)} />
      <DependencyArrow name="FK to course" from={{x: gE.cx(1), y: gE.headTop - 54}} to={{x: gC.cx(0), y: gC.headTop - 54}} bend={50} progress={prog(f, 13, 14.4)} />
      <Caption name="Join pairs rows" top={830} opacity={prog(f, 16.4, 17.2)} size={46}>
        A <b>join</b> pairs the rows whose keys match
      </Caption>
    </SceneShell>
  );
};

export const WhyScene = Interactive.withSchema({
  Component: WhyInner,
  componentName: '<WhyScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
