import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../anim';
import {Heading, SceneShell} from '../../components/Shell';
import {InfoCard} from '../../sql/common/ui';
import type {Tone} from '../../theme';
import {Narration, Note} from '../shared';

const STEPS: readonly {readonly nf: string; readonly rule: string; readonly tone: Tone; readonly at: number}[] = [
  {nf: '3NF', rule: 'No transitive dependencies', tone: 'blue', at: 0.3},
  {nf: 'BCNF', rule: 'Every determinant is a candidate key', tone: 'maroon', at: 1.4},
  {nf: '4NF', rule: 'No independent lists in one table', tone: 'teal', at: 3.3},
  {nf: '5NF', rule: 'Nothing rebuilt from smaller pairs', tone: 'orange', at: 4.9},
];

// 0.5 recap, one step per normal form · 7.0 the engineer's advice
const SummaryInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <Narration scene="summary" />
      <Heading name="Heading" premountFor={fps}>
        Recap
      </Heading>
      {STEPS.map((st, i) => {
        const t = prog(f, st.at, st.at + 0.6);
        return (
          <InfoCard
            key={st.nf}
            name={`Step ${st.nf}`}
            title={st.nf}
            x={100 + i * 440}
            y={560 - i * 110}
            width={400}
            height={230}
            tone={st.tone}
            opacity={t}
            titleSize={52}
            size={32}
            style={{translate: `0px ${(1 - t) * 40}px`}}
          >
            {st.rule}
          </InfoCard>
        );
      })}
      <Note name="Engineer's advice" x={0} y={880} width={1920} align="center" size={38} opacity={prog(f, 7.0, 7.8)}>
        In practice: aim for <b>BCNF</b>, and check <b>4NF</b> and <b>5NF</b> when a table is all key.
      </Note>
    </SceneShell>
  );
};

export const AdvSummaryScene = Interactive.withSchema({
  Component: SummaryInner,
  componentName: '<AdvSummaryScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
