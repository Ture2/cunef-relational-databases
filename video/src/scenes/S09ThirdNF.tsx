import type React from 'react';
import {SceneNarration} from '../components/Narration';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog, window01} from '../anim';
import {DataTable, geom} from '../components/DataTable';
import {DependencyArrow} from '../components/DependencyArrow';
import {Chip, Heading, SceneShell} from '../components/Shell';
import {
  COURSE,
  COURSE_ROWS,
  DEPT,
  DEPT_DEDUPE,
  DEPT_ROWS_RAW,
  ENROLL,
  ENROLL_ROWS,
  STUDENT,
  STUDENT_ROWS,
} from '../layout';
import {TONES} from '../theme';

const CG = geom(COURSE.columns, COURSE.x, COURSE.y);

const ThirdNFSceneInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame;
  const fly = prog(f, 13.3, 15.8);
  const flying = f >= 13.3 * fps;
  const dupFade = prog(f, 16.2, 16.9);
  const deptTitle = prog(f, 16.5, 17.2);
  const fk = prog(f, 18, 18.8);
  const chainOut = 1 - prog(f, 12.6, 13.2);
  const below = CG.bottom(COURSE_ROWS.length) + 6;
  const compHi = window01(f, 21.3, 28);

  return (
    <SceneShell style={style}>
      <SceneNarration scene="nf3" />
      <Heading name="Heading" premountFor={fps}>
        Third normal form (3NF)
      </Heading>
      <DataTable
        name="Student"
        title="Student"
        x={STUDENT.x}
        y={STUDENT.y}
        columns={STUDENT.columns}
        rows={STUDENT_ROWS}
      />
      <DataTable
        name="Enrollment"
        title="Enrollment"
        x={ENROLL.x}
        y={ENROLL.y}
        columns={ENROLL.columns}
        rows={ENROLL_ROWS}
      />
      <DataTable
        name="Course"
        title="Course"
        x={COURSE.x}
        y={COURSE.y}
        columns={COURSE.columns}
        rows={COURSE_ROWS}
        colOpacity={(c) => (c === 4 && flying ? 0 : 1)}
        header={(c) => (c === 3 ? {fk} : undefined)}
        cell={(r, c) => {
          if (c === 4 && f >= 6.3 * fps && f < 13.3 * fps) return {bg: TONES.maroon.soft, outline: window01(f, 6.3, 13.3) * 0.7};
          return undefined;
        }}
      />
      <DependencyArrow
        name="course_id → dept_id"
        from={{x: CG.cx(0), y: below}}
        to={{x: CG.cx(3) - 16, y: below}}
        bend={-55}
        progress={prog(f, 6.5, 8.5)}
        opacity={chainOut}
        color={TONES.orange.strong}
      />
      <DependencyArrow
        name="dept_id → dept_name"
        from={{x: CG.cx(3) + 16, y: below}}
        to={{x: CG.cx(4), y: below}}
        bend={-40}
        progress={prog(f, 8.5, 10)}
        opacity={chainOut}
        color={TONES.maroon.strong}
      />
      <DataTable
        name="Department (flying)"
        title="Department"
        titleOpacity={deptTitle}
        x={DEPT.x}
        y={DEPT.y}
        columns={DEPT.columns}
        rows={DEPT_ROWS_RAW}
        style={{opacity: flying ? 1 : 0}}
        colOffset={() => ({x: 0, y: (COURSE.y - DEPT.y) * (1 - fly)})}
        rowOpacity={(r) => (DEPT_DEDUPE.newIndex[r] === null ? 1 - dupFade : 1)}
        cell={(r, c) => {
          if (c === 1 && r === 0 && compHi > 0) return {bg: TONES.maroon.soft, outline: compHi};
          return c === 1 && fly < 1 ? {bg: TONES.maroon.soft} : undefined;
        }}
      />
      <Chip tone="maroon" style={{left: 85, top: 600, opacity: prog(f, 28.3, 29), scale: `${0.8 + 0.2 * prog(f, 28.3, 29)}`}}>
        3NF ✓
      </Chip>
    
    </SceneShell>
  );
};

export const ThirdNFScene = Interactive.withSchema({
  Component: ThirdNFSceneInner,
  componentName: '<ThirdNFScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
