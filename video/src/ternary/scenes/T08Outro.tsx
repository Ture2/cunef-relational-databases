import type React from 'react';
import {CanvasImage, Interactive, staticFile, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../anim';
import {SceneShell} from '../../components/Shell';
import {C} from '../../theme';
import {Narration} from '../shared';

const OutroInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <Narration scene="outro" />
      <Interactive.Div
        name="Practise it"
        style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', fontSize: 110, fontWeight: 700, color: C.ink, opacity: prog(f, 0, 1.5)}}
      >
        Practise it
      </Interactive.Div>
      <Interactive.Div
        name="Practice site line"
        style={{position: 'absolute', left: 0, right: 0, top: 410, textAlign: 'center', fontSize: 50, lineHeight: 1.35, color: C.ink, opacity: prog(f, 0.5, 2)}}
      >
        the <b>ER concepts</b> section of the
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
        style={{position: 'absolute', left: 760, top: 640, width: 400, height: 218, opacity: prog(f, 1, 2.5)}}
      />
    </SceneShell>
  );
};

export const TernaryOutroScene = Interactive.withSchema({
  Component: OutroInner,
  componentName: '<TernaryOutroScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
