import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../anim';
import {Heading, SceneShell} from '../../components/Shell';
import {InfoCard} from '../../sql/common/ui';
import type {Tone} from '../../theme';
import {Narration} from '../shared';

const QUESTIONS: readonly {readonly text: React.ReactNode; readonly tone: Tone; readonly at: number}[] = [
  {
    text: (
      <>
        BCNF split Tutoring and lost the check <b>student, subject → tutor</b>. How would you enforce it? Is the split worth it?
      </>
    ),
    tone: 'maroon',
    at: 3.0,
  },
  {
    text: (
      <>
        If each teacher used only <b>their own</b> books, would you still split CourseMaterial in two? Why?
      </>
    ),
    tone: 'teal',
    at: 8.6,
  },
  {
    text: (
      <>
        If the campus rule <b>stopped holding</b>, would joining the three pairs still give back exactly Teaching? What would you store?
      </>
    ),
    tone: 'orange',
    at: 13.9,
  },
];

// 0.4 your turn · 3.0, 8.6, 13.9 one open question each (no answers)
const QuestionsInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <Narration scene="questions" />
      <Heading name="Heading" kicker="Your turn" premountFor={fps}>
        Think about it
      </Heading>
      {QUESTIONS.map((q, i) => {
        const t = prog(f, q.at, q.at + 0.7);
        return (
          <InfoCard
            key={i}
            name={`Question ${i + 1}`}
            title={`Question ${i + 1}`}
            x={100}
            y={240 + i * 260}
            width={1720}
            height={220}
            tone={q.tone}
            opacity={t}
            titleSize={34}
            size={36}
            style={{translate: `${(1 - t) * 30}px 0px`}}
          >
            {q.text}
          </InfoCard>
        );
      })}
    </SceneShell>
  );
};

export const QuestionsScene = Interactive.withSchema({
  Component: QuestionsInner,
  componentName: '<QuestionsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
