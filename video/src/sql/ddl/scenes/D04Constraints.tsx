import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, type Tone} from '../../../theme';
import {SqlCode, type LineFx} from '../../common/SqlCode';
import {InfoCard} from '../../common/ui';
import {Mono, Narration, PLAYER_CODE, PLAYER_PANEL} from '../shared';

const CARD = {x: 1110, w: 710};

// 0.8 rules every row must respect · 4 inline: next to its column · 7.2 NOT NULL · 8.2 CHECK on shirt
// · 11 out-of-line: after the last column · 14.3 several columns · 16 UNIQUE (team_id, shirt) · 20 name them
const ConstraintsInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const inlineOff = 1 - prog(f, 10.8, 11.4);
  const outline = prog(f, 11.4, 12) * (1 - prog(f, 19.4, 20));
  const named = prog(f, 20.4, 21);
  const line = (i: number): LineFx => {
    let highlight = 0;
    let tone: Tone = 'teal';
    if (i === 2 || i === 4 || i === 6) highlight = prog(f, 7, 7.6) * inlineOff;
    if (i === 3) highlight = prog(f, 8.2, 8.8) * inlineOff;
    if (i >= 7 && i <= 10) {
      tone = 'maroon';
      highlight = i === 10 ? Math.max(outline, prog(f, 16, 16.6) * (1 - named)) : outline * (1 - 0.7 * prog(f, 16, 16.6));
      if (named > 0 && i !== 9) {
        tone = 'orange';
        highlight = Math.max(highlight, named);
      }
    }
    return {highlight, tone};
  };
  return (
    <SceneShell style={style}>
      <Narration scene="constraints" />
      <Heading name="Heading" premountFor={fps}>
        Inline and out-of-line constraints
      </Heading>
      <SqlCode name="Create player" code={PLAYER_CODE} x={PLAYER_PANEL.x} y={PLAYER_PANEL.y} width={PLAYER_PANEL.width} size={PLAYER_PANEL.size} line={line} />
      <Chip tone="neutral" size={32} style={{left: PLAYER_PANEL.x, top: 810, opacity: prog(f, 1.2, 1.8)}}>
        Constraints: rules every row must respect
      </Chip>
      <InfoCard name="Inline" title="Inline" x={CARD.x} y={210} width={CARD.w} height={200} tone="teal" opacity={prog(f, 4, 4.6)} outline={prog(f, 4, 4.6) * inlineOff} titleSize={36} size={28}>
        right next to its column
        <div style={{marginTop: 10, opacity: prog(f, 7.2, 7.8)}}>
          <Mono>NOT NULL</Mono>
          <span style={{opacity: prog(f, 8.2, 8.8)}}>
            {' · '}
            <Mono>CHECK (shirt BETWEEN 1 AND 99)</Mono>
          </span>
        </div>
      </InfoCard>
      <InfoCard name="Out-of-line" title="Out-of-line" x={CARD.x} y={440} width={CARD.w} height={230} tone="maroon" opacity={prog(f, 11.2, 11.8)} outline={outline} titleSize={36} size={28}>
        after the last column
        <div style={{opacity: prog(f, 14.3, 14.9)}}>can cover several columns</div>
        <div style={{marginTop: 10, opacity: prog(f, 16, 16.6)}}>
          <Mono>UNIQUE (team_id, shirt)</Mono>
        </div>
      </InfoCard>
      <InfoCard name="Name them" title="Name them" x={CARD.x} y={700} width={CARD.w} height={200} tone="orange" opacity={prog(f, 20, 20.6)} outline={named} titleSize={36} size={28}>
        <Mono>CONSTRAINT fk_player_team</Mono>
        <div style={{marginTop: 10, color: C.muted, opacity: prog(f, 22, 22.6)}}>
          errors show this name, not <Mono>SYS_C008123</Mono>
        </div>
      </InfoCard>
    </SceneShell>
  );
};

export const ConstraintsScene = Interactive.withSchema({
  Component: ConstraintsInner,
  componentName: '<ConstraintsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
