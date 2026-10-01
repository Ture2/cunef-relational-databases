import type React from 'react';
import {SceneNarration} from '../components/Narration';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog, window01} from '../anim';
import {Caption} from '../components/Caption';
import {colX, DataTable, ROW_H} from '../components/DataTable';
import {Heading, SceneShell} from '../components/Shell';
import {rowsOf, WIDE_KEYS} from '../data';
import {
  COURSE,
  COURSE_DEDUPE,
  COURSE_KEYS,
  COURSE_ROWS_RAW,
  ENROLL,
  STUDENT,
  STUDENT_DEDUPE,
  STUDENT_KEYS,
  STUDENT_ROWS_RAW,
  WIDE,
  wideColLeft,
} from '../layout';
import {C, TONES} from '../theme';

const WIDE_ROWS = rowsOf(WIDE_KEYS);
const STUDENT_COLS = new Set([2]);
const COURSE_COLS = new Set([3, 4, 6, 7]);

/** Animation of one group of columns flying out of the wide table and deduplicating. */
const flyGroup = (
  f: number,
  t0: number,
  newIndex: (number | null)[],
) => {
  const fly = prog(f, t0, t0 + 2.7);
  const dupFade = prog(f, t0 + 3, t0 + 3.7);
  const collapse = prog(f, t0 + 3.7, t0 + 4.7);
  return {
    visible: f >= t0 * 30,
    fly,
    rowOpacity: (r: number) => (newIndex[r] === null ? 1 - dupFade : 1),
    rowOffset: (r: number) => {
      const ni = newIndex[r];
      if (ni === null) return 0;
      return -(r - ni) * ROW_H * collapse;
    },
    title: prog(f, t0 + 4.2, t0 + 4.9),
    tint: 1 - prog(f, t0 + 4.7, t0 + 5.5),
  };
};

const SecondNFSceneInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame;

  const tintIn = prog(f, 1.5, 2.3);
  const stu = flyGroup(f, 6.3, STUDENT_DEDUPE.newIndex);
  const crs = flyGroup(f, 13.3, COURSE_DEDUPE.newIndex);
  // While the student group leaves, the key columns slide right and close the gap.
  const shiftKeys = (ENROLL.x - WIDE.x) * stu.fly;
  // While the course group leaves, grade slides left next to the key.
  const gradeX = ENROLL.x + colX(ENROLL.columns, 2) - (WIDE.x + colX(WIDE.columns, 5));
  const shiftGrade = gradeX * crs.fly;
  const fk = prog(f, 24.5, 25.3);
  const once = window01(f, 29.3, 35);
  // Flying groups arc upwards so they pass over the columns that stay.
  const arc = (t: number) => -Math.sin(Math.PI * t) * 70;
  const keyShift = (k: string) => (k === 'student_id' || k === 'course_id' ? ENROLL.x - WIDE.x : 0);

  return (
    <SceneShell style={style}>
      <SceneNarration scene="nf2" />
      <Heading name="Heading" premountFor={fps}>
        Second normal form (2NF)
      </Heading>

      {/* The wide table: loses columns, then closes up into Enrollment. */}
      <div
        style={{
          position: 'absolute',
          left: WIDE.x + shiftKeys,
          top: WIDE.y - 50,
          fontSize: 32,
          fontWeight: 700,
          color: C.ink,
          opacity: prog(f, 0.2, 1),
        }}
      >
        Enrollment
      </div>
      <DataTable
        name="Enrollment (wide → 2NF)"
        x={WIDE.x}
        y={WIDE.y}
        columns={WIDE.columns}
        rows={WIDE_ROWS}
        style={{opacity: prog(f, 0.2, 1)}}
        colOpacity={(c) => {
          if (STUDENT_COLS.has(c) && stu.visible) return 0;
          if (COURSE_COLS.has(c) && crs.visible) return 0;
          return 1;
        }}
        colOffset={(c) => {
          if (c <= 1) return {x: shiftKeys, y: 0};
          if (c === 5) return {x: shiftGrade, y: 0};
          return {x: 0, y: 0};
        }}
        header={(c) => (c <= 1 ? {fk} : undefined)}
        cell={(r, c) => {
          if (STUDENT_COLS.has(c) && tintIn > 0) return {bg: TONES.blue.soft};
          if (COURSE_COLS.has(c) && tintIn > 0) return {bg: TONES.orange.soft};
          return undefined;
        }}
      />

      {/* Student: student_id (copy) + student_name */}
      <DataTable
        name="Student (flying)"
        title="Student"
        titleOpacity={stu.title}
        x={STUDENT.x}
        y={STUDENT.y}
        columns={STUDENT.columns}
        rows={STUDENT_ROWS_RAW}
        style={{opacity: stu.visible ? 1 : 0}}
        colOffset={(c) => ({
          x: (wideColLeft(STUDENT_KEYS[c]) - (STUDENT.x + colX(STUDENT.columns, c))) * (1 - stu.fly),
          y: (WIDE.y - STUDENT.y) * (1 - stu.fly) + arc(stu.fly),
        })}
        rowOpacity={stu.rowOpacity}
        rowOffset={stu.rowOffset}
        cell={(r, c) => {
          if (c === 1 && r === 0 && once > 0) return {bg: TONES.blue.soft, outline: once};
          return c === 1 && stu.tint > 0 ? {bg: TONES.blue.soft, opacity: 1} : undefined;
        }}
      />

      {/* Course: course_id (copy) + course columns */}
      <DataTable
        name="Course (flying)"
        title="Course"
        titleOpacity={crs.title}
        x={COURSE.x}
        y={COURSE.y}
        columns={COURSE.columns}
        rows={COURSE_ROWS_RAW}
        style={{opacity: crs.visible ? 1 : 0}}
        colOffset={(c) => ({
          x:
            (wideColLeft(COURSE_KEYS[c]) + keyShift(COURSE_KEYS[c]) - (COURSE.x + colX(COURSE.columns, c))) *
            (1 - crs.fly),
          y: (WIDE.y - COURSE.y) * (1 - crs.fly) + arc(crs.fly),
        })}
        rowOpacity={crs.rowOpacity}
        rowOffset={crs.rowOffset}
        cell={(r, c) => {
          if (c === 1 && r === 0 && once > 0) return {bg: TONES.orange.soft, outline: once};
          return c > 0 && crs.tint > 0 ? {bg: TONES.orange.soft} : undefined;
        }}
      />

      <Caption name="C1 rule" from={0} durationInFrames={180} premountFor={fps}>
        2NF: 1NF, and no non-key attribute depends on only part of the key.
      </Caption>
      <Caption name="C2 student" from={180} durationInFrames={210} premountFor={fps}>
        `student_name` depends on `student_id` alone: it moves to Student.
      </Caption>
      <Caption name="C3 course" from={390} durationInFrames={240} premountFor={fps}>
        The course columns depend on `course_id` alone: they move to Course.
      </Caption>
      <Caption name="C4 enrollment" from={630} durationInFrames={240} premountFor={fps}>
        Enrollment keeps the full key and grade. Both key columns are now foreign keys.
      </Caption>
      <Caption name="C5 once" from={870} durationInFrames={180} premountFor={fps}>
        Each student and each course is now stored once.
      </Caption>
      <Caption name="C6 anomalies gone" from={1050} durationInFrames={150} premountFor={fps}>
        New courses need no students; a rename touches one row.
      </Caption>
    </SceneShell>
  );
};

export const SecondNFScene = Interactive.withSchema({
  Component: SecondNFSceneInner,
  componentName: '<SecondNFScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
