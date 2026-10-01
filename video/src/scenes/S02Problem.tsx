import type React from 'react';
import {SceneNarration} from '../components/Narration';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {AnomalyCallout} from '../components/AnomalyCallout';
import {Caption} from '../components/Caption';
import {DataTable, ROW_H} from '../components/DataTable';
import {Heading, SceneShell} from '../components/Shell';
import {cols, rowsOf, WIDE_KEYS} from '../data';
import {prog, window01} from '../anim';
import {TONES} from '../theme';

const COLUMNS = cols(WIDE_KEYS, ['student_id', 'course_id']);
const GHOST = ['', 'C30', '', 'Marketing', '6', '', 'D03', 'Business'];
const ROWS = [...rowsOf(WIDE_KEYS), GHOST];
const GHOST_ROW = 6;

const ProblemSceneInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame;

  // redundancy highlights
  const redund = (startSec: number) => Math.min(prog(f, startSec, startSec + 0.6), 1 - prog(f, 23.5, 24.3));
  const anaOn = redund(12.5);
  const dbOn = redund(14.5);
  const compOn = redund(16.5);

  // update anomaly
  const renamed = f >= 25.5 * fps && f < 34 * fps;
  const updOwn = window01(f, 25.5, 34);
  const updOthers = window01(f, 29.5, 34);

  // insert anomaly
  const ghost = window01(f, 34.6, 43.4);
  const ghostKey = window01(f, 39, 43.4);
  const ghostStrike = prog(f, 40.5, 41.8);

  // delete anomaly
  const delHi = window01(f, 44, 51.5);
  const delStrike = prog(f, 48.5, 49.8);
  const delGone = prog(f, 50.5, 51.5);
  const closeUp = prog(f, 51.2, 52.4);

  return (
    <SceneShell style={style}>
      <SceneNarration scene="problem" />
      <Heading name="Heading" premountFor={fps}>
        The problem: one wide table
      </Heading>
      <DataTable
        name="Enrollment (wide)"
        title="Enrollment"
        x={290}
        y={230}
        columns={COLUMNS}
        rows={ROWS}
        rowOpacity={(r) => {
          if (r === GHOST_ROW) return ghost;
          const appear = prog(f, 0.6 + r * 0.25, 1.1 + r * 0.25);
          if (r === 1) return appear * (1 - delGone);
          return appear;
        }}
        rowOffset={(r) => {
          if (r === GHOST_ROW) return (1 - ghost) * 20 - closeUp * ROW_H;
          const enter = (1 - prog(f, 0.6 + r * 0.25, 1.1 + r * 0.25)) * 20;
          return enter + (r > 1 ? -closeUp * ROW_H : 0);
        }}
        header={(c) => (c <= 1 ? {outline: window01(f, 6.3, 11.6)} : undefined)}
        cell={(r, c) => {
          if (r === GHOST_ROW) {
            return {
              dashed: true,
              bg: TONES.neutral.soft,
              outline: c === 0 ? ghostKey : 0,
              content: c === 0 || c === 2 || c === 5 ? '?' : undefined,
              strike: ghostStrike,
            };
          }
          if (r === 1 && (delHi > 0 || delStrike > 0)) {
            return {bg: TONES.orange.soft, outline: delHi, strike: delStrike};
          }
          if (c === 2 && r <= 1 && anaOn > 0) return {bg: TONES.blue.soft, outline: anaOn * 0.75};
          if (c === 3 && (r === 0 || r === 2 || r === 4)) {
            if (r === 0 && renamed) return {content: 'Databases I', bg: TONES.orange.soft, outline: updOwn};
            if (updOthers > 0) return {bg: TONES.orange.soft, outline: updOthers};
            if (dbOn > 0) return {bg: TONES.orange.soft, outline: dbOn * 0.75};
          }
          if (c === 7 && r !== 1 && compOn > 0) return {bg: TONES.maroon.soft, outline: compOn * 0.75};
          return undefined;
        }}
      />

      <AnomalyCallout name="Update anomaly" from={735} durationInFrames={285} premountFor={fps} title="Update anomaly" style={{left: 290, top: 730}}>
        one course, two names
      </AnomalyCallout>
      <AnomalyCallout name="Insert anomaly" from={1020} durationInFrames={285} premountFor={fps} title="Insert anomaly" style={{left: 290, top: 730}}>
        no course without a student
      </AnomalyCallout>
      <AnomalyCallout name="Delete anomaly" from={1305} durationInFrames={285} premountFor={fps} title="Delete anomaly" style={{left: 290, top: 730}}>
        one delete erases unrelated facts
      </AnomalyCallout>

      <Caption name="C1 wide table" from={15} durationInFrames={165} premountFor={fps}>
        A university stores all its enrollments in one wide table.
      </Caption>
      <Caption name="C2 key" from={180} durationInFrames={180} premountFor={fps}>
        Its key is (`student_id`, `course_id`): one row per student and course.
      </Caption>
      <Caption name="C3 look closer" from={360} durationInFrames={210} premountFor={fps}>
        Look closer: Ana Ruiz appears twice, Databases three times, Computing five times.
      </Caption>
      <Caption name="C4 redundancy" from={570} durationInFrames={165} premountFor={fps}>
        That is redundancy: one fact stored many times. It leads to three anomalies.
      </Caption>
      <Caption name="C5 update" from={735} durationInFrames={135} premountFor={fps}>
        Update anomaly: we rename course C10 in just one row…
      </Caption>
      <Caption name="C6 update result" from={870} durationInFrames={150} premountFor={fps}>
        …so C10 now has two different names. The data is inconsistent.
      </Caption>
      <Caption name="C7 insert" from={1020} durationInFrames={135} premountFor={fps}>
        Insert anomaly: a new course, C30 Marketing, has no students yet.
      </Caption>
      <Caption name="C8 insert result" from={1155} durationInFrames={150} premountFor={fps}>
        It can't be stored: `student_id` is part of the key, so it can't be empty.
      </Caption>
      <Caption name="C9 delete" from={1305} durationInFrames={135} premountFor={fps}>
        Delete anomaly: Ana drops Statistics, the course's only enrollment.
      </Caption>
      <Caption name="C10 delete result" from={1440} durationInFrames={150} premountFor={fps}>
        Deleting that row also erases course C20 and the Maths department.
      </Caption>
    </SceneShell>
  );
};

export const ProblemScene = Interactive.withSchema({
  Component: ProblemSceneInner,
  componentName: '<ProblemScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
