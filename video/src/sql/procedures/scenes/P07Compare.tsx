import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, FONT, TONES, type Tone} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {CalculatorIcon, Narration, VendingIcon} from '../shared';

const W = 820;
const H = 560;
const Y = 220;

type Side = {
  readonly x: number;
  readonly tone: Tone;
  readonly title: string;
  readonly analogy: string;
  readonly at: number;
  readonly items: readonly {readonly label: string; readonly text: string; readonly at: number}[];
  readonly code: string;
  readonly codeAt: number;
};

const SIDES: readonly Side[] = [
  {
    x: 100,
    tone: 'orange',
    title: 'PROCEDURE',
    analogy: 'a vending machine',
    at: 0.9,
    items: [
      {label: 'IN', text: 'a coin and a choice', at: 3.4},
      {label: 'Does', text: 'something: drops a can', at: 5.3},
      {label: 'OUT', text: 'hands back change', at: 7.6},
    ],
    code: "enrol_student('S03', 'C20', v_msg);",
    codeAt: 8.4,
  },
  {
    x: 1000,
    tone: 'teal',
    title: 'FUNCTION',
    analogy: 'a calculator',
    at: 12.2,
    items: [
      {label: 'IN', text: 'some numbers', at: 14},
      {label: 'RETURN', text: 'one answer', at: 15.1},
      {label: 'Use it', text: 'inside expressions, even SQL', at: 16.4},
    ],
    code: 'SELECT letter_grade(grade) FROM enrolment;',
    codeAt: 18.2,
  },
];

// 0.8 a procedure is a vending machine · 3.2 coin and choice in · 5.3 does something · 6.5 change back via OUT
// · 12.2 a function is a calculator · 13.9 numbers in, one answer out · 16.2 inside expressions, even SELECT
// · 20.8 action → procedure · 23.5 value → function
const CompareInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pick = [prog(f, 21, 21.6), prog(f, 23.6, 24.2)];
  return (
    <SceneShell style={style}>
      <Narration scene="compare" />
      <Heading name="Heading" premountFor={fps}>
        Procedure or function?
      </Heading>
      {SIDES.map((s, k) => {
        const t = prog(f, s.at, s.at + 0.7);
        const tone = TONES[s.tone];
        return (
          <div key={s.title}>
            <Interactive.Div
              name={`Card ${s.title}`}
              style={{
                position: 'absolute',
                left: s.x,
                top: Y,
                width: W,
                height: H,
                boxSizing: 'border-box',
                borderRadius: 16,
                backgroundColor: C.surface,
                border: `2px solid ${C.rule}`,
                borderTop: `10px solid ${tone.strong}`,
                boxShadow: pick[k] > 0 ? `0 0 0 ${5 * pick[k]}px ${C.accent}` : '0 4px 18px rgba(26, 31, 108, 0.08)',
                fontFamily: FONT,
                opacity: t,
              }}
            >
              <div style={{position: 'absolute', left: 32, top: 24, fontSize: 46, fontWeight: 700, color: tone.strong}}>{s.title}</div>
              <div style={{position: 'absolute', left: 32, top: 84, fontSize: 32, color: C.muted, fontStyle: 'italic'}}>{s.analogy}</div>
              {s.items.map((it, i) => (
                <div
                  key={it.label}
                  style={{position: 'absolute', left: 32, top: 160 + i * 66, display: 'flex', alignItems: 'baseline', gap: 16, opacity: prog(f, it.at, it.at + 0.6)}}
                >
                  <span style={{fontSize: 30, fontWeight: 700, color: tone.strong, minWidth: 120}}>{it.label}</span>
                  <span style={{fontSize: 32, color: C.ink}}>{it.text}</span>
                </div>
              ))}
            </Interactive.Div>
            {k === 0 ? (
              <VendingIcon name="Vending machine" x={s.x + W - 190} y={Y + 40} opacity={t} drop={prog(f, 5.6, 6.6)} />
            ) : (
              <CalculatorIcon name="Calculator" x={s.x + W - 190} y={Y + 40} opacity={t} answer={prog(f, 15.1, 15.4) > 0.5 ? 'B' : ''} />
            )}
            <SqlCode name={`Code ${s.title}`} code={s.code} x={s.x + 30} y={Y + H - 130} width={W - 60} size={26} opacity={prog(f, s.codeAt, s.codeAt + 0.6)} />
          </div>
        );
      })}
      <Chip tone="orange" size={36} style={{left: 100, top: 840, opacity: pick[0]}}>
        An action? Write a procedure
      </Chip>
      <Chip tone="teal" size={36} style={{left: 1000, top: 840, opacity: pick[1]}}>
        A value? Write a function
      </Chip>
    </SceneShell>
  );
};

export const CompareScene = Interactive.withSchema({
  Component: CompareInner,
  componentName: '<CompareScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
