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

type Props = {
  readonly title: string;
  readonly children: string;
  readonly style?: React.CSSProperties;
};

const AnomalyCalloutInner: React.FC<Props> = ({title, children, style}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const t = Math.min(
    interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
    interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  return (
    <Interactive.Div
      name="Anomaly callout"
      style={{
        position: 'absolute',
        left: 290,
        top: 700,
        fontFamily: FONT,
        color: C.ink,
        ...style,
      }}
    >
      <div
        style={{
          opacity: t,
          scale: `${0.94 + 0.06 * t}`,
          transformOrigin: 'left center',
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          backgroundColor: C.surface,
          border: `3px solid ${C.accent}`,
          borderRadius: 16,
          padding: '14px 28px',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: C.accent,
            color: C.surface,
            fontSize: 36,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          !
        </div>
        <div style={{fontSize: 34, fontWeight: 700, whiteSpace: 'nowrap'}}>{title}</div>
        <div style={{fontSize: 30, whiteSpace: 'nowrap'}}>
          <RichText text={children} />
        </div>
      </div>
    </Interactive.Div>
  );
};

const schema = {
  title: {type: 'text-content', default: 'Anomaly', description: 'Title'},
  children: {type: 'text-content', default: '', description: 'Text'},
} as const satisfies InteractivitySchema;

export const AnomalyCallout = Interactive.withSchema({
  Component: AnomalyCalloutInner,
  componentName: '<AnomalyCallout>',
  schema,
  wrapInSequence: true,
});
