import type React from 'react';
import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  type InteractivitySchema,
} from 'remotion';
import {LADDER} from '../data';
import {C, FONT, TONES} from '../theme';

type LadderProps = {
  /** Frames between steps appearing. */
  readonly stagger: number;
  readonly style?: React.CSSProperties;
};

const STEP_W = 400;
const STEP_H = 190;
const DX = 420;
const DY = 110;

const LadderInner: React.FC<LadderProps> = ({stagger, style}) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Ladder"
      style={{
        position: 'absolute',
        left: 120,
        top: 220,
        width: DX * 3 + STEP_W,
        height: DY * 3 + STEP_H,
        fontFamily: FONT,
        ...style,
      }}
    >
      {LADDER.map((step, i) => {
        const t = interpolate(frame, [i * stagger, i * stagger + 18], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        const tone = TONES[step.tone];
        return (
          <div
            key={step.nf}
            style={{
              position: 'absolute',
              left: i * DX,
              top: (3 - i) * DY,
              width: STEP_W,
              height: STEP_H,
              opacity: t,
              translate: `0px ${(1 - t) * 40}px`,
              backgroundColor: C.surface,
              borderRadius: 18,
              borderTop: `10px solid ${tone.strong}`,
              boxShadow: '0 6px 24px rgba(26, 31, 108, 0.10)',
              padding: '20px 28px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{fontSize: 52, fontWeight: 700, color: tone.strong}}>{step.nf}</div>
            <div style={{fontSize: 32, color: C.ink, marginTop: 8, lineHeight: 1.25}}>
              {step.rule}
            </div>
          </div>
        );
      })}
    </Interactive.Div>
  );
};

const ladderSchema = {
  stagger: {type: 'number', default: 20, min: 0, step: 1, hiddenFromList: false, description: 'Frames between steps'},
} as const satisfies InteractivitySchema;

export const Ladder = Interactive.withSchema({
  Component: LadderInner,
  componentName: '<Ladder>',
  schema: ladderSchema,
  wrapInSequence: true,
});
