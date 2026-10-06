import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../anim';
import {DataTable, type Column} from '../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../components/Shell';
import {TONES} from '../../theme';
import {COLS, FACTS, Narration, SPURIOUS} from '../shared';

const W = 170;
const col = (i: number): Column => ({...COLS[i], width: W});
/* The three pair tables: which columns of a fact they keep, where they sit, when they appear,
   and which of their rows the spurious row comes from (Mike–Physics, Physics–Song, Mike–Song). */
const PAIRS = [
  {name: 'student – course', cols: [0, 1], x: 760, at: 7.6, hit: 0},
  {name: 'course – instructor', cols: [1, 2], x: 1140, at: 9.6, hit: 2},
  {name: 'student – instructor', cols: [0, 2], x: 1520, at: 11.4, hit: 1},
];
const JOINED = [...FACTS.map((r) => [...r]), [...SPURIOUS]];

// 0.8 can binaries replace it? · 6.2 split into pairs · 14 join back: Mike, Physics, Song appears
// · 22.5 it never happened: keep the ternary
const SplitInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const orig = 1 - prog(f, 14, 14.6);
  const hit = prog(f, 17.6, 18.4);
  const bad = prog(f, 23, 23.8);
  return (
    <SceneShell style={style}>
      <Narration scene="split" />
      <Heading name="Heading" premountFor={fps}>
        Not three binaries
      </Heading>
      <DataTable
        name="Takes"
        title="takes: 3 real facts"
        x={100}
        y={380}
        columns={COLS}
        rows={FACTS.map((r) => [...r])}
        style={{opacity: Math.min(prog(f, 0.6, 1.2), orig)}}
      />
      {PAIRS.map((p) => (
        <DataTable
          key={p.name}
          name={`Pair ${p.name}`}
          title={p.name}
          x={p.x}
          y={380}
          columns={p.cols.map(col)}
          rows={FACTS.map((r) => p.cols.map((c) => r[c]))}
          style={{opacity: prog(f, p.at, p.at + 0.6)}}
          rowOffset={() => (1 - prog(f, p.at, p.at + 0.6)) * 24}
          cell={(r) => (r === p.hit && hit > 0 ? {bg: TONES.orange.soft, outline: hit} : undefined)}
        />
      ))}
      <DataTable
        name="Joined"
        title="join of the pairs"
        x={100}
        y={380}
        columns={COLS}
        rows={JOINED}
        style={{opacity: prog(f, 14.6, 15.2)}}
        rowOpacity={(r) => (r < 3 ? 1 : prog(f, 16.4, 17))}
        cell={(r) => (r === 3 ? {bg: TONES.orange.soft, outline: Math.max(hit, bad)} : undefined)}
      />
      <Chip tone="orange" size={38} style={{left: 100, top: 760, opacity: bad}}>
        Mike never took Physics with Song
      </Chip>
      <Chip tone="teal" size={44} style={{left: 1040, top: 760, opacity: prog(f, 26.6, 27.4)}}>
        Keep the ternary
      </Chip>
    </SceneShell>
  );
};

export const SplitScene = Interactive.withSchema({
  Component: SplitInner,
  componentName: '<SplitScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
