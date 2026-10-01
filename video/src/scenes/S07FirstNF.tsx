import type React from 'react';
import {SceneNarration} from '../components/Narration';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {Caption} from '../components/Caption';
import {DataTable, ROW_H, type Column} from '../components/DataTable';
import {Chip, Heading, SceneShell} from '../components/Shell';
import {prog, window01} from '../anim';
import {TONES} from '../theme';

const COLUMNS: Column[] = [
  {key: 'student_id', label: 'student_id', width: 170, tone: 'blue', pk: true},
  {key: 'student_name', label: 'student_name', width: 210, tone: 'blue'},
  {key: 'phones', label: 'phones', width: 420, tone: 'yellow'},
];

const ROWS = [
  ['S01', 'Ana Ruiz', '611 111 111'],
  ['S01', 'Ana Ruiz', '622 222 222'],
  ['S02', 'Luis Gil', '633 333 333'],
  ['S03', 'Eva Sanz', '644 444 444'],
];

const FirstNFSceneInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame;
  const split = prog(f, 12.5, 14);
  const isSplit = f >= 12.5 * fps;
  const bad = window01(f, 6.3, 13, 0.3);
  const after = window01(f, 13.5, 19.5);
  return (
    <SceneShell style={style}>
      <SceneNarration scene="nf1" />
      <Heading name="Heading" premountFor={fps}>
        First normal form (1NF)
      </Heading>
      <DataTable
        name="Student phones"
        title="Student"
        x={560}
        y={360}
        columns={COLUMNS}
        rows={ROWS}
        style={{opacity: prog(f, 0.2, 1)}}
        rowOpacity={(r) => (r === 1 ? split : 1)}
        rowOffset={(r) => (r === 0 ? 0 : -ROW_H * (1 - split))}
        header={(c) =>
          c === 2
            ? {label: f >= 14 * fps ? 'phone' : 'phones', pk: prog(f, 14.5, 15.5)}
            : undefined
        }
        cell={(r, c) => {
          if (c !== 2) return undefined;
          if (r === 0 && !isSplit) {
            return {content: '611 111 111, 622 222 222', bg: TONES.yellow.soft, outline: bad};
          }
          if (r <= 1 && after > 0) return {bg: TONES.yellow.soft, outline: after * 0.6};
          return undefined;
        }}
      />
      <Chip tone="yellow" style={{left: 1400, top: 470, opacity: prog(f, 19.3, 20), scale: `${0.8 + 0.2 * prog(f, 19.3, 20)}`}}>
        1NF ✓
      </Chip>

      <Caption name="C1 rule" from={0} durationInFrames={180} premountFor={fps}>
        1NF: every cell holds a single, atomic value. No lists, no repeating groups.
      </Caption>
      <Caption name="C2 violation" from={180} durationInFrames={180} premountFor={fps}>
        Here one cell holds two phone numbers. That breaks 1NF.
      </Caption>
      <Caption name="C3 split" from={360} durationInFrames={210} premountFor={fps}>
        Split it: one row per phone. Now every value is atomic.
      </Caption>
      <Caption name="C4 enrollment" from={570} durationInFrames={180} premountFor={fps}>
        Our Enrollment table already met 1NF: one value in every cell.
      </Caption>
    </SceneShell>
  );
};

export const FirstNFScene = Interactive.withSchema({
  Component: FirstNFSceneInner,
  componentName: '<FirstNFScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
