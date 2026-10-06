import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog, window01} from '../../anim';
import {Chip, Heading, SceneShell} from '../../components/Shell';
import {Caption, Narration, TernaryDiagram} from '../shared';

// 0.8 the rule · 6.4 fix student + course: (1,1) at Instructor · 15.3 fix course + instructor: (1,N)
// at Student · 22.8 Course too, and the ratio M:N:1
const ReadInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = window01(f, 6.4, 15.0);
  const b = window01(f, 15.3, 22.6);
  const role = a > 0 ? (['fixed', 'fixed', 'count'] as const) : b > 0 ? (['count', 'fixed', 'fixed'] as const) : ([undefined, undefined, undefined] as const);
  return (
    <SceneShell style={style}>
      <Narration scene="read" />
      <Heading name="Heading" premountFor={fps}>
        Fix two, look at the third
      </Heading>
      <TernaryDiagram
        name="Diagram"
        x={40}
        y={260}
        scale={0.95}
        cards={['(1,N)', '(1,N)', '(1,1)']}
        cardOp={[prog(f, 19.5, 20.2), prog(f, 24.5, 25.2), prog(f, 11.6, 12.3)]}
        role={role}
        roleT={Math.max(a, b)}
      />
      <Caption name="Rule" top={330} left={1160} width={720} opacity={window01(f, 0.8, 6.2)} size={48}>
        Fix the <b>other</b> entities,
        <br />
        then count this one.
      </Caption>
      <Caption name="Question 1" top={330} left={1160} width={720} opacity={a} size={44}>
        One <b>student</b> + one <b>course</b>:
        <br />
        how many instructors?
      </Caption>
      <Chip tone="orange" size={40} style={{left: 1330, top: 520, opacity: Math.min(a, prog(f, 10.4, 11))}}>
        exactly one: (1,1)
      </Chip>
      <Caption name="Question 2" top={330} left={1160} width={720} opacity={b} size={44}>
        One <b>course</b> + one <b>instructor</b>:
        <br />
        how many students?
      </Caption>
      <Chip tone="orange" size={40} style={{left: 1310, top: 520, opacity: Math.min(b, prog(f, 19, 19.6))}}>
        one or more: (1,N)
      </Chip>
      <Caption name="Ratio label" top={360} left={1160} width={720} opacity={prog(f, 25.6, 26.4)} size={44}>
        The maxima give the ratio
      </Caption>
      <Chip tone="teal" size={60} style={{left: 1380, top: 460, opacity: prog(f, 26.2, 27)}}>
        M : N : 1
      </Chip>
    </SceneShell>
  );
};

export const ReadScene = Interactive.withSchema({
  Component: ReadInner,
  componentName: '<ReadScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
