import type React from 'react';
import {SceneNarration} from '../components/Narration';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {Heading, SceneShell} from '../components/Shell';
import {prog} from '../anim';
import {C, TONES} from '../theme';

const PROS = ['Less redundancy', 'Integrity: no anomalies', 'Simpler updates', 'Less storage'];
const CONS = ['More tables and joins', 'Slower reads for some queries', 'More design effort'];
const PROS_AT = [11, 12.5, 14, 15.5];
const CONS_AT = [19, 20.5, 22];

const List: React.FC<{
  readonly title: string;
  readonly items: readonly string[];
  readonly at: readonly number[];
  readonly tone: 'teal' | 'orange';
  readonly mark: string;
  readonly frame: number;
  readonly left: number;
}> = ({title, items, at, tone, mark, frame, left}) => {
  const head = prog(frame, at[0] - 0.4, at[0] + 0.2);
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: 390,
        width: 790,
        height: 350,
        backgroundColor: C.surface,
        borderRadius: 18,
        borderTop: `10px solid ${TONES[tone].strong}`,
        padding: '22px 36px',
        boxSizing: 'border-box',
        opacity: head,
        boxShadow: '0 6px 24px rgba(26, 31, 108, 0.08)',
      }}
    >
      <div style={{fontSize: 44, fontWeight: 700, color: TONES[tone].strong, marginBottom: 12}}>{title}</div>
      {items.map((item, i) => {
        const t = prog(frame, at[i], at[i] + 0.6);
        return (
          <div
            key={item}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              fontSize: 40,
              lineHeight: '60px',
              opacity: t,
              translate: `${(1 - t) * 30}px 0px`,
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: TONES[tone].soft,
                color: TONES[tone].strong,
                fontWeight: 700,
                fontSize: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {mark}
            </span>
            {item}
          </div>
        );
      })}
    </div>
  );
};

const WhatIsSceneInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const card = prog(frame, 0.3, 1.2);
  const bar = prog(frame, 6.8, 8);
  const banner = prog(frame, 27.2, 28.2);
  return (
    <SceneShell style={style}>
      <SceneNarration scene="whatIs" />
      <Heading name="Heading" premountFor={fps}>
        What is normalization?
      </Heading>
      <Interactive.Div
        name="Definition card"
        style={{
          position: 'absolute',
          left: 100,
          top: 200,
          width: 1720,
          height: 150,
          boxSizing: 'border-box',
          backgroundColor: C.surface,
          borderRadius: 18,
          padding: '24px 40px',
          fontSize: 44,
          lineHeight: 1.4,
          opacity: card,
          boxShadow: '0 6px 24px rgba(26, 31, 108, 0.08)',
        }}
      >
        <b>Decompose tables</b>, guided by functional dependencies,
        <br />
        so that{' '}
        <span style={{position: 'relative', fontWeight: 700}}>
          each fact is stored once
          <span
            style={{
              position: 'absolute',
              left: 0,
              bottom: -4,
              height: 6,
              width: `${bar * 100}%`,
              backgroundColor: C.accent,
              borderRadius: 3,
            }}
          />
        </span>
        .
      </Interactive.Div>
      <List title="Pros" items={PROS} at={PROS_AT} tone="teal" mark="+" frame={frame} left={100} />
      <List title="Cons" items={CONS} at={CONS_AT} tone="orange" mark="–" frame={frame} left={1030} />
      <Interactive.Div
        name="Denormalization banner"
        style={{
          position: 'absolute',
          left: 100,
          top: 762,
          width: 1720,
          textAlign: 'center',
          boxSizing: 'border-box',
          padding: '14px 26px',
          borderRadius: 14,
          backgroundColor: TONES.maroon.soft,
          border: `3px solid ${TONES.maroon.strong}`,
          fontSize: 36,
          lineHeight: 1.3,
          color: C.ink,
          opacity: banner,
          translate: `0px ${(1 - banner) * 24}px`,
        }}
      >
        <b>Denormalization</b>: a deliberate trade-off for read-heavy analytics.
      </Interactive.Div>
    
    </SceneShell>
  );
};

export const WhatIsScene = Interactive.withSchema({
  Component: WhatIsSceneInner,
  componentName: '<WhatIsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
