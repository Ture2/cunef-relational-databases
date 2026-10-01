import type React from 'react';
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import {C, FONT, TONES, type Tone} from '../theme';

/** Scene background + a short fade in/out of all content (keeps the beige constant). */
export const SceneShell: React.FC<{
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}> = ({children, style}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const fade = Math.min(
    interpolate(frame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
    interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink, ...style}}>
      <AbsoluteFill style={{opacity: fade}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

type HeadingProps = {
  readonly children: string;
  readonly kicker?: string;
  readonly style?: React.CSSProperties;
};

const HeadingInner: React.FC<HeadingProps> = ({children, kicker, style}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <Interactive.Div
      name="Heading"
      style={{
        position: 'absolute',
        left: 100,
        top: 56,
        fontFamily: FONT,
        color: C.ink,
        ...style,
      }}
    >
      <div style={{opacity: t, translate: `${(1 - t) * -20}px 0px`}}>
        {kicker ? (
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: C.muted,
              marginBottom: 6,
            }}
          >
            {kicker}
          </div>
        ) : null}
        <div style={{fontSize: 64, fontWeight: 700, whiteSpace: 'nowrap'}}>{children}</div>
        <div
          style={{
            marginTop: 10,
            height: 6,
            width: 120 * t,
            backgroundColor: C.accent,
            borderRadius: 3,
          }}
        />
      </div>
    </Interactive.Div>
  );
};

const headingSchema = {
  children: {type: 'text-content', default: '', description: 'Heading'},
  kicker: {type: 'text-content', default: '', description: 'Kicker'},
} as const satisfies InteractivitySchema;

export const Heading = Interactive.withSchema({
  Component: HeadingInner,
  componentName: '<Heading>',
  schema: headingSchema,
  wrapInSequence: true,
});

/** Small rounded label, e.g. "→ 2NF" or "1NF ✓". */
export const Chip: React.FC<{
  readonly children: React.ReactNode;
  readonly tone?: Tone;
  readonly style?: React.CSSProperties;
  readonly size?: number;
}> = ({children, tone = 'teal', style, size = 34}) => (
  <div
    style={{
      position: 'absolute',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 24px',
      borderRadius: 999,
      backgroundColor: TONES[tone].soft,
      border: `3px solid ${TONES[tone].strong}`,
      color: tone === 'neutral' ? C.ink : TONES[tone].strong,
      fontSize: size,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      fontFamily: FONT,
      ...style,
    }}
  >
    {children}
  </div>
);
