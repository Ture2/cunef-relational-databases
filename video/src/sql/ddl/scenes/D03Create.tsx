import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog, window01} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {InfoCard} from '../../common/ui';
import {Mono, Narration, PLAYER_CODE, PLAYER_PANEL} from '../shared';

/* Left edge of a character column of the code panel (Consolas advance ≈ 0.55 em). */
const charX = (col: number) => PLAYER_PANEL.x + 26 + col * PLAYER_PANEL.size * 0.55;

type TypeCard = {
  readonly type: string;
  readonly text: React.ReactNode;
  readonly at: number;
};

const TYPES: readonly TypeCard[] = [
  {type: 'VARCHAR2(60)', text: 'text, up to 60 characters', at: 9.4},
  {type: 'NUMBER(p, s)', text: <>p digits, s of them decimals</>, at: 13.6},
  {type: 'CHAR(1)', text: 'a fixed-length code', at: 20},
  {type: 'DATE', text: 'a date, and the time too', at: 22.2},
  {type: 'GENERATED ALWAYS AS IDENTITY', text: 'an auto-numbered key', at: 26.6},
];

const CARD = {x: 1110, w: 710, h: 138, y0: 210, gap: 15};

/* When each code line is the one being talked about. */
const lineHighlight = (f: number, i: number) => {
  if (i === 2) return window01(f, 9.4, 13.4);
  if (i === 3 || i === 6) return window01(f, 13.6, 18.8);
  if (i === 4) return window01(f, 20, 22.2);
  if (i === 5) return window01(f, 22.2, 25.4);
  if (i === 1) return Math.max(window01(f, 13.6, 18.8), prog(f, 26.6, 27.2));
  return 0;
};

// 0.8 CREATE TABLE: each column gets a name, a type and constraints · 9.4 VARCHAR2(60)
// · 13.6 NUMBER: digits and decimals · 20 CHAR · 22.2 DATE · 26.6 identity · 31.4 no AUTOINCREMENT
const CreateInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <Narration scene="create" />
      <Heading name="Heading" premountFor={fps}>
        CREATE TABLE
      </Heading>
      <SqlCode
        name="Create player"
        code={PLAYER_CODE}
        x={PLAYER_PANEL.x}
        y={PLAYER_PANEL.y}
        width={PLAYER_PANEL.width}
        size={PLAYER_PANEL.size}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({
          opacity: i >= 7 && i <= 10 ? 0.3 * prog(f, 7, 7.8) : prog(f, 1 + Math.min(i, 7) * 0.25, 1.5 + Math.min(i, 7) * 0.25),
          highlight: lineHighlight(f, i),
          tone: 'teal',
        })}
      />
      <Chip tone="blue" size={30} style={{left: charX(2) - 27, top: 810, opacity: prog(f, 4.6, 5.2)}}>
        name
      </Chip>
      <Chip tone="teal" size={30} style={{left: charX(12) - 27, top: 810, opacity: prog(f, 5.6, 6.2)}}>
        type
      </Chip>
      <Chip tone="maroon" size={30} style={{left: charX(25) - 27, top: 810, opacity: prog(f, 7, 7.6)}}>
        constraints
      </Chip>
      {TYPES.map((t, i) => {
        const o = prog(f, t.at, t.at + 0.6);
        return (
          <InfoCard
            key={t.type}
            name={`Type ${t.type}`}
            title={<Mono>{t.type}</Mono>}
            x={CARD.x}
            y={CARD.y0 + i * (CARD.h + CARD.gap)}
            width={CARD.w}
            height={CARD.h}
            tone={i === 4 ? 'orange' : 'teal'}
            opacity={o}
            titleSize={32}
            size={28}
            style={{translate: `${(1 - o) * 30}px 0px`}}
          >
            {t.text}
            {i === 1 ? (
              <span style={{color: C.muted, opacity: prog(f, 16.2, 16.8)}}>
                {' · '}
                <Mono>NUMBER(5,2)</Mono> ≤ 999.99
              </span>
            ) : null}
            {i === 4 ? (
              <span style={{color: C.muted, opacity: prog(f, 31.4, 32)}}>
                {' · no '}
                <Mono>AUTOINCREMENT</Mono>
              </span>
            ) : null}
          </InfoCard>
        );
      })}
    </SceneShell>
  );
};

export const CreateScene = Interactive.withSchema({
  Component: CreateInner,
  componentName: '<CreateScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
