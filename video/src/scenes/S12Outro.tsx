import type React from 'react';
import {SceneNarration} from '../components/Narration';
import {
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import {SceneShell} from '../components/Shell';
import {C} from '../theme';

const OutroSceneInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <SceneNarration scene="outro" />
      <Interactive.Div
        name="Practise it"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 250,
          textAlign: 'center',
          fontSize: 110,
          fontWeight: 700,
          color: C.ink,
          opacity: interpolate(frame, [0, 1.5 * fps], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Practise it
      </Interactive.Div>
      <Interactive.Div
        name="Practice site line"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 410,
          textAlign: 'center',
          fontSize: 50,
          lineHeight: 1.35,
          color: C.ink,
          opacity: interpolate(frame, [0.5 * fps, 2 * fps], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        the <b>Normalization</b> section of the
        <br />
        Databases practice site
      </Interactive.Div>
      <CanvasImage
        name="CUNEF logo"
        src={staticFile('cunef-logo-hires.png')}
        premountFor={fps}
        width={1906}
        height={1037}
        fit="contain"
        style={{
          position: 'absolute',
          left: 760,
          top: 640,
          width: 400,
          height: 218,
          opacity: interpolate(frame, [1 * fps, 2.5 * fps], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      />
    </SceneShell>
  );
};

export const OutroScene = Interactive.withSchema({
  Component: OutroSceneInner,
  componentName: '<OutroScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
