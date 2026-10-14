import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Caption, Chip, Heading, SceneShell} from '../../../components/Shell';
import type {Tone} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {InfoCard} from '../../common/ui';
import {MotionLight, Narration} from '../shared';

/* The header of trg_grade_check, one idea per line (the body comes in the next scene). */
const CODE = `CREATE OR REPLACE TRIGGER trg_grade_check
BEFORE
INSERT OR UPDATE OF grade ON enrolment
FOR EACH ROW
BEGIN
  NULL;  -- the PL/SQL body
END;`;

type Part = {readonly title: string; readonly text: string; readonly tone: Tone; readonly line: number; readonly at: number};
const PARTS: readonly Part[] = [
  {title: 'Event', text: 'INSERT, UPDATE or DELETE on a table', tone: 'orange', line: 2, at: 11.6},
  {title: 'Timing', text: 'BEFORE or AFTER the change', tone: 'teal', line: 1, at: 15.8},
  {title: 'Level', text: 'once per statement, or FOR EACH ROW', tone: 'maroon', line: 3, at: 18.8},
];
const CARD_W = 390;
const CARD_X = [620, 1035, 1450];

// 0.8 PL/SQL that Oracle runs automatically · 5 nobody calls it · 6.2 a motion-sensor light, the event
// switches it on · 11.2 event · 15.6 timing · 18.6 level
const WhatInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const walk = prog(f, 8, 9.2);
  const on = prog(f, 9.1, 9.5);
  return (
    <SceneShell style={style}>
      <Narration scene="what" />
      <Heading name="Heading" premountFor={fps}>
        What is a trigger?
      </Heading>
      <SqlCode
        name="Trigger header"
        code={CODE}
        x={620}
        y={220}
        width={1220}
        size={30}
        opacity={prog(f, 1, 1.6)}
        line={(i) => {
          const part = PARTS.find((p) => p.line === i);
          return {opacity: prog(f, 1 + i * 0.25, 1.5 + i * 0.25), highlight: part ? prog(f, part.at, part.at + 0.6) : 0, tone: part?.tone};
        }}
      />
      <MotionLight name="Motion-sensor light" x={100} y={230} on={on} opacity={prog(f, 5.8, 6.6)} />
      <Chip tone="orange" size={30} style={{left: -180 + 330 * walk, top: 680, opacity: prog(f, 7.8, 8.2)}}>
        UPDATE
      </Chip>
      <Caption name="Nobody calls it" top={850} left={80} width={480} size={40} opacity={prog(f, 5, 5.8)}>
        <b>Nobody calls it</b>
      </Caption>
      {PARTS.map((p, i) => (
        <InfoCard
          key={p.title}
          name={`Card ${p.title}`}
          title={p.title}
          x={CARD_X[i]}
          y={640}
          width={CARD_W}
          height={250}
          tone={p.tone}
          opacity={prog(f, p.at, p.at + 0.6)}
          titleSize={40}
          size={32}
        >
          {p.text}
        </InfoCard>
      ))}
    </SceneShell>
  );
};

export const WhatScene = Interactive.withSchema({
  Component: WhatInner,
  componentName: '<WhatScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
