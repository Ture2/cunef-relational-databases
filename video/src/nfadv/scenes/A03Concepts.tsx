import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog, window01} from '../../anim';
import {DataTable, geom} from '../../components/DataTable';
import {DependencyArrow} from '../../components/DependencyArrow';
import {Chip, Heading, SceneShell} from '../../components/Shell';
import {InfoCard} from '../../sql/common/ui';
import {C, TONES} from '../../theme';
import {Narration, TUTORING_COLS, TUTORING_ROWS} from '../shared';

const TX = 100;
const TY = 330;
const G = geom(TUTORING_COLS, TX, TY);
const CX = 760;
const CW = 1060;

// 0.4 determinant · 5.8 student, subject → tutor · 8.6 tutor → subject · 12.3 candidate key ·
// 17.0 drop a column: student alone repeats Ana · 20.2 two candidate keys
const ConceptsInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dropDemo = window01(f, 17.0, 20.0);
  const key1 = window01(f, 20.6, 23.0);
  const key2 = prog(f, 23.0, 23.6);
  return (
    <SceneShell style={style}>
      <Narration scene="concepts" />
      <Heading name="Heading" kicker="Two ideas first" premountFor={fps}>
        Determinant and candidate key
      </Heading>
      <DataTable
        name="Tutoring"
        title="Tutoring"
        x={TX}
        y={TY}
        columns={TUTORING_COLS}
        rows={TUTORING_ROWS}
        style={{opacity: prog(f, 0.2, 1)}}
        header={(c) => {
          const on = (c <= 1 ? key1 : 0) + (c === 0 || c === 2 ? key2 : 0);
          return on > 0 ? {outline: Math.min(1, on)} : undefined;
        }}
        cell={(r, c) => (c === 0 && (r === 0 || r === 3) && dropDemo > 0 ? {bg: TONES.orange.soft, outline: dropDemo} : undefined)}
      />
      <DependencyArrow
        name="student, subject → tutor"
        from={{x: G.left(1), y: TY - 6}}
        to={{x: G.cx(2), y: TY - 6}}
        bend={60}
        progress={prog(f, 5.8, 7.6)}
        color={TONES.maroon.strong}
        label="student, subject → tutor"
      />
      <DependencyArrow
        name="tutor → subject"
        from={{x: G.cx(2), y: G.bottom(4) + 6}}
        to={{x: G.cx(1), y: G.bottom(4) + 6}}
        bend={-50}
        progress={prog(f, 8.6, 10.2)}
        color={TONES.maroon.strong}
        label="tutor → subject"
      />
      <Chip tone="orange" size={28} style={{left: TX, top: 800, opacity: dropDemo}}>
        student alone: Ana twice ✗
      </Chip>
      <InfoCard name="Determinant card" title="Determinant" x={CX} y={200} width={CW} tone="maroon" opacity={prog(f, 0.6, 1.4)}>
        If knowing <b>X</b> fixes <b>Y</b>, we write <b>X → Y</b>.
        <br />
        <b>X</b> is the <i>determinant</i>.
      </InfoCard>
      <InfoCard name="Candidate key card" title="Candidate key" x={CX} y={440} width={CW} tone="blue" opacity={prog(f, 12.3, 13.1)}>
        A <i>minimal</i> set of columns that identifies each row: drop any column and it no longer does.
        <div style={{marginTop: 12, fontSize: 26, color: C.muted, opacity: prog(f, 15.2, 16.0)}}>
          {'{student, subject, tutor}'} also identifies each row, but is not minimal: it is only a <i>superkey</i>.
        </div>
      </InfoCard>
      <Chip tone="blue" style={{left: CX, top: 780, opacity: prog(f, 20.6, 21.2)}}>
        {'{student, subject}'}
      </Chip>
      <Chip tone="blue" style={{left: CX + 380, top: 780, opacity: key2}}>
        {'{student, tutor}'}
      </Chip>
    </SceneShell>
  );
};

export const ConceptsScene = Interactive.withSchema({
  Component: ConceptsInner,
  componentName: '<ConceptsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
