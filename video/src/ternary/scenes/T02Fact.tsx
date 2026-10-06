import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../anim';
import {Chip, Heading, SceneShell} from '../../components/Shell';
import {Narration, TernaryDiagram} from '../shared';

const WORDS = [
  {label: 'Mike', tone: 'blue'},
  {label: 'Physics', tone: 'orange'},
  {label: 'Jones', tone: 'teal'},
] as const;

// 0.8 two entities, a third appears · 7.4 the fact, then one is dropped · 15.3 the third line: ternary · ~20 quaternary
const FactInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const drop = Math.min(prog(f, 10.6, 11.2), 1 - prog(f, 13.4, 14));
  return (
    <SceneShell style={style}>
      <Narration scene="fact" />
      <Heading name="Heading" premountFor={fps}>
        One fact, three entities
      </Heading>
      <TernaryDiagram
        name="Diagram"
        x={300}
        y={220}
        scale={0.86}
        show={[prog(f, 0.4, 1.2), prog(f, 0.8, 1.6), prog(f, 3.6, 4.6)]}
        spoke={[prog(f, 1.4, 2.4), prog(f, 1.8, 2.8), prog(f, 15.6, 16.8)]}
      />
      <div style={{position: 'absolute', left: 300, top: 860, width: 946, display: 'flex', justifyContent: 'center', gap: 18}}>
        {WORDS.map((w, i) => {
          const t = prog(f, 7.6 + i * 0.6, 8.2 + i * 0.6);
          const gone = i === 2 ? drop : 0;
          return (
            <div key={w.label} style={{opacity: t * (1 - 0.6 * gone), scale: `${0.7 + 0.3 * t}`}}>
              <Chip tone={gone > 0.5 ? 'neutral' : w.tone} size={40} style={{position: 'relative'}}>
                {gone > 0.5 ? '?' : w.label}
              </Chip>
            </div>
          );
        })}
      </div>
      <Chip tone="orange" style={{left: 1320, top: 866, opacity: drop}}>
        not a complete fact
      </Chip>
      <Chip tone="teal" size={40} style={{left: 1390, top: 360, opacity: prog(f, 17, 17.8)}}>
        3 entities: ternary
      </Chip>
      <Chip tone="neutral" size={40} style={{left: 1390, top: 470, opacity: prog(f, 20.3, 21.1)}}>
        4 entities: quaternary
      </Chip>
    </SceneShell>
  );
};

export const FactScene = Interactive.withSchema({
  Component: FactInner,
  componentName: '<FactScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
