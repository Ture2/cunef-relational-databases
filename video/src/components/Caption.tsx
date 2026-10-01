import type React from 'react';
import {
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import {C, FONT} from '../theme';
import {RichText} from './RichText';

type CaptionProps = {
  /** Caption text. Wrap identifiers in backticks to render them as chips. */
  readonly children: string;
  readonly style?: React.CSSProperties;
};

const CaptionInner: React.FC<CaptionProps> = ({children, style}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const fade = Math.min(
    interpolate(frame, [0, 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
    interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  return (
    <Interactive.Div
      name="Caption box"
      style={{
        position: 'absolute',
        left: 140,
        right: 140,
        bottom: 60,
        display: 'flex',
        justifyContent: 'center',
        fontFamily: FONT,
        ...style,
      }}
    >
      <div
        style={{
          opacity: fade,
          translate: `0px ${(1 - fade) * 12}px`,
          backgroundColor: C.surface,
          borderLeft: `10px solid ${C.accent}`,
          borderRadius: 14,
          padding: '20px 40px',
          fontSize: 42,
          lineHeight: 1.35,
          color: C.ink,
          maxWidth: 1640,
          boxShadow: '0 6px 24px rgba(26, 31, 108, 0.10)',
        }}
      >
        <RichText text={children} />
      </div>
    </Interactive.Div>
  );
};

const captionSchema = {
  children: {type: 'text-content', default: '', description: 'Caption text'},
} as const satisfies InteractivitySchema;

export const Caption = Interactive.withSchema({
  Component: CaptionInner,
  componentName: '<Caption>',
  schema: captionSchema,
  wrapInSequence: true,
});
