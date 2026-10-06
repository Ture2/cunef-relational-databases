import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../anim';
import {DataTable} from '../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../components/Shell';
import type {Tone} from '../../theme';
import {Caption, COLS, FACTS, Narration} from '../shared';

const SHAPES: {label: string; at: number; tone: Tone}[] = [
  {label: '1 : 1 : 1', at: 3.0, tone: 'neutral'},
  {label: '1 : 1 : N', at: 4.3, tone: 'neutral'},
  {label: '1 : M : N', at: 5.6, tone: 'neutral'},
  {label: 'M : N : P', at: 6.9, tone: 'neutral'},
];

// 0.8 the four shapes · 8.7 a "1" means the others decide it: they are the key · 15.5 student + course
const KeysInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const key = prog(f, 16, 17);
  return (
    <SceneShell style={style}>
      <Narration scene="keys" />
      <Heading name="Heading" premountFor={fps}>
        Ratios and keys
      </Heading>
      <div style={{position: 'absolute', left: 100, top: 240, display: 'flex', gap: 28}}>
        {SHAPES.map((s) => (
          <div key={s.label} style={{opacity: prog(f, s.at, s.at + 0.5), scale: `${0.7 + 0.3 * prog(f, s.at, s.at + 0.5)}`}}>
            <Chip tone={s.tone} size={44} style={{position: 'relative'}}>
              {s.label}
            </Chip>
          </div>
        ))}
      </div>
      <Caption name="A one means a key" top={410} left={100} width={1720} opacity={prog(f, 9, 9.8)} size={46}>
        A <b>1</b> at an end: the <b>other</b> entities decide it, so together they form the <b>key</b>.
      </Caption>
      <DataTable
        name="Takes"
        title="takes  (M : N : 1)"
        titleOpacity={prog(f, 11.5, 12.2)}
        x={665}
        y={600}
        columns={COLS}
        rows={FACTS.map((r) => [...r])}
        style={{opacity: prog(f, 11.5, 12.2)}}
        rowOpacity={(r) => prog(f, 12 + r * 0.4, 12.5 + r * 0.4)}
        header={(c) => ({pk: c < 2 ? key : 0})}
      />
      <Chip tone="orange" size={38} style={{left: 1320, top: 660, opacity: key}}>
        key: (student, course)
      </Chip>
    </SceneShell>
  );
};

export const KeysScene = Interactive.withSchema({
  Component: KeysInner,
  componentName: '<KeysScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
