import type React from 'react';
import {CanvasImage, Interactive, staticFile, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../anim';
import {Chip, SceneShell} from '../../components/Shell';
import {C} from '../../theme';
import {Narration} from '../shared';

const ENTITIES = [
  {label: 'STUDENT', tone: 'blue'},
  {label: 'COURSE', tone: 'orange'},
  {label: 'INSTRUCTOR', tone: 'teal'},
] as const;

const TitleInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <Narration scene="title" />
      <CanvasImage
        name="CUNEF logo"
        src={staticFile('cunef-logo-hires.png')}
        premountFor={fps}
        width={1906}
        height={1037}
        fit="contain"
        style={{position: 'absolute', left: 790, top: 70, width: 340, height: 185, opacity: prog(f, 0, 1.5)}}
      />
      <Interactive.Div
        name="Title"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 380,
          textAlign: 'center',
          fontSize: 110,
          fontWeight: 700,
          color: C.ink,
          opacity: prog(f, 0.6, 2),
          translate: `0px ${(1 - prog(f, 0.6, 2)) * 40}px`,
        }}
      >
        Ternary relationships
      </Interactive.Div>
      <Interactive.Div
        name="Title bar"
        style={{position: 'absolute', left: 860, top: 530, height: 10, width: 200, borderRadius: 5, backgroundColor: C.accent, scale: `${prog(f, 1.8, 3)} 1`}}
      />
      <Interactive.Div
        name="Subtitle"
        style={{position: 'absolute', left: 0, right: 0, top: 580, textAlign: 'center', fontSize: 48, color: C.ink, opacity: prog(f, 2.5, 3.8)}}
      >
        When one fact needs three entities at once
      </Interactive.Div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 730, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22}}>
        {ENTITIES.map((e, i) => {
          const t = prog(f, 3.6 + i * 0.5, 4.2 + i * 0.5);
          return (
            <div key={e.label} style={{display: 'flex', alignItems: 'center', gap: 22, opacity: t, scale: `${0.6 + 0.4 * t}`}}>
              {i > 0 ? <div style={{fontSize: 48, color: C.accent, fontWeight: 700}}>+</div> : null}
              <Chip tone={e.tone} size={40} style={{position: 'relative'}}>
                {e.label}
              </Chip>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};

export const TernaryTitleScene = Interactive.withSchema({
  Component: TitleInner,
  componentName: '<TernaryTitleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
