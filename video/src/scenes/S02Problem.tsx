import type React from 'react';
import {SceneNarration} from '../components/Narration';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {AnomalyCallout} from '../components/AnomalyCallout';
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
         
    </SceneShell>
  );
};

export const ProblemScene = Interactive.withSchema({
  Component: ProblemSceneInner,
  componentName: '<ProblemScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
