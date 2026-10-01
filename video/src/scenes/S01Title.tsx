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
import {C, TONES} from '../theme';

const CHIPS = [
  {label: '1NF', tone: TONES.yellow},
  {label: '2NF', tone: TONES.blue},
  {label: '3NF', tone: TONES.maroon},
  {label: 'BCNF', tone: TONES.teal},
];

const TitleSceneInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <SceneNarration scene="title" />
      <CanvasImage
        name="CUNEF logo"
        src={staticFile('cunef-logo-hires.png')}
        premountFor={fps}
        width={1906}
        height={1037}
        fit="contain"
        style={{
          position: 'absolute',
          left: 790,
          top: 70,
          width: 340,
          height: 185,
          opacity: interpolate(frame, [0, 1.5 * fps], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      />
      <Interactive.Div
        name="Title"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 360,
          textAlign: 'center',
          fontSize: 104,
          fontWeight: 700,
          color: C.ink,
          opacity: interpolate(frame, [1 * fps, 2.5 * fps], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [1 * fps, 2.5 * fps], ['0px 40px', '0px 0px'], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Database normalization,
        <br />
        step by step
      </Interactive.Div>
      <Interactive.Div
        name="Title bar"
        style={{
          position: 'absolute',
          left: 860,
          top: 640,
          height: 10,
          width: 200,
          borderRadius: 5,
          backgroundColor: C.accent,
          scale: interpolate(frame, [2.5 * fps, 4 * fps], ['0 1', '1 1'], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      />
      <Interactive.Div
        name="Subtitle"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 690,
          textAlign: 'center',
          fontSize: 48,
          color: C.ink,
          opacity: interpolate(frame, [3.5 * fps, 5 * fps], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        From one wide table to a clean relational design
      </Interactive.Div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 820,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 22,
        }}
      >
        {CHIPS.map((chip, i) => {
          const t = interpolate(frame, [(5 + i * 0.5) * fps, (5.6 + i * 0.5) * fps], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          });
          return (
            <div key={chip.label} style={{display: 'flex', alignItems: 'center', gap: 22}}>
              {i > 0 ? (
                <div style={{fontSize: 44, color: C.accent, fontWeight: 700, opacity: t}}>→</div>
              ) : null}
              <div
                style={{
                  opacity: t,
                  scale: `${0.6 + 0.4 * t}`,
                  padding: '12px 30px',
                  borderRadius: 999,
                  backgroundColor: chip.tone.soft,
                  border: `3px solid ${chip.tone.strong}`,
                  color: chip.tone.strong,
                  fontSize: 40,
                  fontWeight: 700,
                }}
              >
                {chip.label}
              </div>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};

export const TitleScene = Interactive.withSchema({
  Component: TitleSceneInner,
  componentName: '<TitleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
