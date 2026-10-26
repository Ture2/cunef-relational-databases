import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog, window01} from '../../anim';
import {DataTable, geom} from '../../components/DataTable';
import {DependencyArrow} from '../../components/DependencyArrow';
import {Chip, Heading, SceneShell} from '../../components/Shell';
import {InfoCard} from '../../sql/common/ui';
import {TONES} from '../../theme';
import {
  CheckLine,
  Narration,
  TUTOR_SUBJECT_COLS,
  TUTOR_SUBJECT_ROWS,
  TUTORING_BCNF_COLS,
  TUTORING_BCNF_ROWS,
  TUTORING_COLS,
  TUTORING_ROWS,
} from '../shared';

const TX = 100;
const TY = 330;
const G = geom(TUTORING_COLS, TX, TY);
const RX = 780;

// 0.4 the rule · 3.0 student, subject → tutor passes · 6.5 tutor → subject fails · 10.4 3NF allowed it
// (prime attribute) · 18.5 update anomaly: Pérez changes subject, three rows · 23.4 split ·
// 28.9 the price
const BCNFInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const check = 1 - prog(f, 23.0, 23.6);
  const anomaly = window01(f, 18.6, 23.2);
  const dim = 1 - 0.7 * prog(f, 23.0, 23.8);
  const ts = prog(f, 25.0, 25.8);
  const tb = prog(f, 26.4, 27.2);
  return (
    <SceneShell style={style}>
      <Narration scene="bcnf" />
      <Heading name="Heading" premountFor={fps}>
        Boyce–Codd normal form (BCNF)
      </Heading>
      <DataTable
        name="Tutoring (3NF)"
        title="Tutoring"
        x={TX}
        y={TY}
        columns={TUTORING_COLS}
        rows={TUTORING_ROWS}
        style={{opacity: dim}}
        header={(c) => (c === 2 ? {outline: window01(f, 6.5, 10.2)} : undefined)}
        cell={(r, c) => {
          if (r > 2 || c === 0 || anomaly <= 0) return undefined;
          // Pérez moves to Statistics: the change has to be repeated row by row.
          const changed = c === 1 && f >= (19.8 + r * 0.5) * fps;
          return {bg: TONES.orange.soft, outline: anomaly, content: changed ? 'Statistics' : undefined};
        }}
      />
      <DependencyArrow
        name="tutor → subject"
        from={{x: G.cx(2), y: G.bottom(4) + 6}}
        to={{x: G.cx(1), y: G.bottom(4) + 6}}
        bend={-50}
        progress={prog(f, 0.2, 1.4)}
        opacity={dim}
        color={TONES.maroon.strong}
        label="tutor → subject"
      />
      <InfoCard name="BCNF rule" title="BCNF rule" x={RX} y={200} width={1040} tone="maroon" opacity={prog(f, 0.4, 1.2)}>
        Every <b>determinant</b> must be a <b>candidate key</b>. No exceptions.
      </InfoCard>
      <div style={{opacity: check}}>
        <CheckLine name="Check student, subject" x={RX} y={420} dep="student, subject → tutor" verdict="key ✓" ok opacity={prog(f, 3.0, 3.8)} />
        <CheckLine name="Check tutor" x={RX} y={500} dep="tutor → subject" verdict="not a key ✗" ok={false} opacity={prog(f, 6.5, 7.3)} />
        <Chip tone="blue" size={30} style={{left: RX, top: 610, opacity: prog(f, 11.2, 11.9)}}>
          3NF: allowed, subject is prime (in a key)
        </Chip>
        <Chip tone="orange" size={30} style={{left: RX, top: 690, opacity: prog(f, 16.2, 16.9)}}>
          BCNF: not allowed
        </Chip>
      </div>
      <InfoCard name="Update anomaly" title="Update anomaly" x={TX} y={790} width={640} tone="orange" opacity={anomaly} titleSize={32} size={28}>
        Pérez changes subject → 3 rows
      </InfoCard>
      <DataTable
        name="TutorSubject"
        title="TutorSubject"
        x={RX}
        y={450}
        columns={TUTOR_SUBJECT_COLS}
        rows={TUTOR_SUBJECT_ROWS}
        style={{opacity: ts, translate: `${(1 - ts) * 40}px 0px`}}
      />
      <DataTable
        name="Tutoring (BCNF)"
        title="Tutoring"
        x={1300}
        y={450}
        columns={TUTORING_BCNF_COLS}
        rows={TUTORING_BCNF_ROWS}
        style={{opacity: tb, translate: `${(1 - tb) * 40}px 0px`}}
      />
      <Chip tone="teal" style={{left: RX, top: 670, opacity: prog(f, 27.4, 28.0), scale: `${0.7 + 0.3 * prog(f, 27.4, 28.0)}`}}>
        BCNF ✓
      </Chip>
      <InfoCard name="The price" title="The price" x={RX} y={800} width={1040} tone="yellow" opacity={prog(f, 29.0, 29.8)} titleSize={32} size={28}>
        <b>student, subject → tutor</b> now spans two tables: no key enforces it.
      </InfoCard>
    </SceneShell>
  );
};

export const AdvBCNFScene = Interactive.withSchema({
  Component: BCNFInner,
  componentName: '<AdvBCNFScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
