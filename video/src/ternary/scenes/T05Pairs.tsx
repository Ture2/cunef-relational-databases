import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog, window01} from '../../anim';
import {DataTable} from '../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../components/Shell';
import {TONES} from '../../theme';
import {Caption, COLS, FACTS, Narration} from '../shared';

const PAIRS = ['student – course', 'course – instructor', 'student – instructor'];

// 0.8 Mike: two courses; Physics: two instructors · 8.5 two by two they are M:N; a pair rule is separate
const PairsInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const mike = window01(f, 2.6, 5.4);
  const physics = window01(f, 5.4, 8.4);
  return (
    <SceneShell style={style}>
      <Narration scene="pairs" />
      <Heading name="Heading" premountFor={fps}>
        Pairs are many-to-many
      </Heading>
      <DataTable
        name="Takes"
        title="takes"
        x={100}
        y={360}
        columns={COLS}
        rows={FACTS.map((r) => [...r])}
        style={{opacity: prog(f, 0.2, 0.8)}}
        cell={(r, c) => {
          if (mike > 0 && r < 2 && c < 2) return {bg: TONES.blue.soft, outline: mike};
          if (physics > 0 && r !== 1 && c > 0) return {bg: TONES.orange.soft, outline: physics};
          return undefined;
        }}
      />
      <Chip tone="blue" size={36} style={{left: 100, top: 640, opacity: mike}}>
        Mike: two courses
      </Chip>
      <Chip tone="orange" size={36} style={{left: 100, top: 640, opacity: physics}}>
        Physics: two instructors
      </Chip>
      {PAIRS.map((p, i) => (
        <Chip key={p} tone="teal" size={40} style={{left: 900, top: 330 + i * 110, opacity: prog(f, 9 + i * 0.7, 9.6 + i * 0.7)}}>
          {p}: M:N
        </Chip>
      ))}
      <Caption name="Pair rule" top={720} left={860} width={980} opacity={prog(f, 12.6, 13.4)} size={40}>
        “One instructor per course” is a rule about a <b>pair</b>:
        <br />
        state it on its own.
      </Caption>
    </SceneShell>
  );
};

export const PairsScene = Interactive.withSchema({
  Component: PairsInner,
  componentName: '<PairsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
