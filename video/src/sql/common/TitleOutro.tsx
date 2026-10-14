import type React from 'react';
import {CanvasImage, Interactive, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {prog} from '../../anim';
import {Chip, SceneShell} from '../../components/Shell';
import {C, type Tone} from '../../theme';

/** Title scene of a SQL video (as src/ternary/scenes/T01Title.tsx): logo, title, bar, subtitle, chips. */
export const SqlTitle: React.FC<{
  readonly style?: React.CSSProperties;
  readonly narration: React.ReactNode;
  readonly title: string;
  readonly subtitle: string;
  readonly chips: readonly {readonly label: string; readonly tone: Tone}[];
  /** Separator between chips (default none). */
  readonly sep?: string;
}> = ({style, narration, title, subtitle, chips, sep}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      {narration}
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
        name="Kicker"
        style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', fontSize: 34, fontWeight: 700, letterSpacing: 4, color: C.muted, opacity: prog(f, 0.3, 1.6)}}
      >
        SQL
      </Interactive.Div>
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
        {title}
      </Interactive.Div>
      <Interactive.Div
        name="Title bar"
        style={{position: 'absolute', left: 860, top: 530, height: 10, width: 200, borderRadius: 5, backgroundColor: C.accent, scale: `${prog(f, 1.8, 3)} 1`}}
      />
      <Interactive.Div
        name="Subtitle"
        style={{position: 'absolute', left: 0, right: 0, top: 580, textAlign: 'center', fontSize: 48, color: C.ink, opacity: prog(f, 2.5, 3.8)}}
      >
        {subtitle}
      </Interactive.Div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 730, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22}}>
        {chips.map((c, i) => {
          const t = prog(f, 3.6 + i * 0.4, 4.2 + i * 0.4);
          return (
            <div key={c.label} style={{display: 'flex', alignItems: 'center', gap: 22, opacity: t, scale: `${0.6 + 0.4 * t}`}}>
              {i > 0 && sep ? <div style={{fontSize: 48, color: C.accent, fontWeight: 700}}>{sep}</div> : null}
              <Chip tone={c.tone} size={38} style={{position: 'relative'}}>
                {c.label}
              </Chip>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};

/** Outro scene of a SQL video (as src/ternary/scenes/T08Outro.tsx). */
export const SqlOutro: React.FC<{
  readonly style?: React.CSSProperties;
  readonly narration: React.ReactNode;
  /** The card title on the website, e.g. "Inner join". */
  readonly card: string;
}> = ({style, narration, card}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      {narration}
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
        <b>{card}</b> in the <b>SQL</b> section of the
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
