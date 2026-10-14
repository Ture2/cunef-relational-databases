import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom} from '../../../components/DataTable';
import {DependencyArrow} from '../../../components/DependencyArrow';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {COURSE, COURSE_COLS, ENROLMENT, ENROLMENT_COLS, STUDENT, STUDENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {OraError} from '../../common/ui';
import {Narration} from '../shared';

const Y = 330;
const ST = {x: 100, cols: STUDENT_COLS.slice(0, 2)};
const EN = {x: 700, cols: ENROLMENT_COLS};
const CO = {x: 1340, cols: COURSE_COLS.slice(0, 2)};
const gS = geom(ST.cols, ST.x, Y);
const gE = geom(EN.cols, EN.x, Y);
const gC = geom(CO.cols, CO.x, Y);

const ORPHAN = `INSERT INTO enrolment VALUES ('S09', 'C10', 6.0);`;
const PARENT = `DELETE FROM course WHERE course_id = 'C10';`;

// 0.8 a foreign key links a child row to its parent · 3.8 an existing student · 6.4 an existing course
// · 9.3 enrol S09, who does not exist: ORA-02291 · 19.2 delete C10, which has enrolments: ORA-02292
const ForeignKeyInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = prog(f, 19.2, 19.8);
  const noS09 = prog(f, 11.6, 12.2) * (1 - second);
  const c10 = prog(f, 21, 21.6);
  const kids = prog(f, 22.2, 22.8);
  return (
    <SceneShell style={style}>
      <Narration scene="fk" />
      <Heading name="Heading" premountFor={fps}>
        FOREIGN KEY
      </Heading>
      <DataTable
        name="Student"
        title="student (parent)"
        x={ST.x}
        y={Y}
        columns={ST.cols}
        rows={STUDENT.map((r) => [r[0], r[1]])}
        style={{opacity: prog(f, 0.8, 1.6)}}
        header={(c) => ({outline: c === 0 ? noS09 : 0})}
      />
      <DataTable
        name="Enrolment"
        title="enrolment (child)"
        x={EN.x}
        y={Y}
        columns={EN.cols}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 1.2, 2)}}
        header={(c) => ({fk: c < 2 ? prog(f, 2.4, 3) : 0})}
        cell={(r, c) => (c === 1 && r % 2 === 0 && kids > 0 ? {bg: TONES.orange.soft, outline: kids} : undefined)}
      />
      <DataTable
        name="Course"
        title="course (parent)"
        x={CO.x}
        y={Y}
        columns={CO.cols}
        rows={COURSE.map((r) => [r[0], r[1]])}
        style={{opacity: prog(f, 1.6, 2.4)}}
        cell={(r) => (r === 0 && c10 > 0 ? {bg: TONES.orange.soft, outline: c10} : undefined)}
      />
      <DependencyArrow name="FK to student" from={{x: gE.cx(0), y: gE.headTop - 54}} to={{x: gS.cx(0), y: gS.headTop - 54}} bend={46} progress={prog(f, 4, 5.4)} />
      <DependencyArrow name="FK to course" from={{x: gE.cx(1), y: gE.headTop - 54}} to={{x: gC.cx(0), y: gC.headTop - 54}} bend={46} progress={prog(f, 6.6, 8)} />
      <SqlCode name="Orphan insert" code={ORPHAN} x={100} y={790} width={1000} size={28} opacity={prog(f, 9.4, 10) * (1 - second)} />
      <OraError
        name="ORA-02291"
        code="ORA-02291"
        message="integrity constraint violated - parent key not found"
        x={100}
        y={910}
        width={1160}
        size={26}
        opacity={prog(f, 13, 13.6) * (1 - second)}
      />
      <Chip tone="blue" size={30} style={{left: 100, top: 610, opacity: noS09}}>
        No S09 in student
      </Chip>
      <SqlCode name="Delete parent" code={PARENT} x={100} y={790} width={1000} size={28} opacity={prog(f, 19.6, 20.2)} />
      <OraError
        name="ORA-02292"
        code="ORA-02292"
        message="integrity constraint violated - child record found"
        x={100}
        y={910}
        width={1160}
        size={26}
        opacity={prog(f, 24, 24.6)}
      />
      <Chip tone="orange" size={30} style={{left: 1340, top: 800, opacity: kids}}>
        C10 has 3 children
      </Chip>
    </SceneShell>
  );
};

export const ForeignKeyScene = Interactive.withSchema({
  Component: ForeignKeyInner,
  componentName: '<ForeignKeyScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
