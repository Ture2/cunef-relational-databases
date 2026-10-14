import type React from 'react';
import {Interactive} from 'remotion';
import {C, FONT, TONES, type Tone} from '../../theme';
import {MONO} from '../common/SqlCode';

export {Narration} from './narration';

/** The player table of the website card `create-table` (columns trimmed to fit, still valid Oracle). */
export const PLAYER_CODE = `CREATE TABLE player (
  player_id NUMBER(6)    GENERATED ALWAYS AS IDENTITY,
  full_name VARCHAR2(60) NOT NULL,
  shirt     NUMBER(2)    CHECK (shirt BETWEEN 1 AND 99),
  pos       CHAR(1)      DEFAULT 'M' NOT NULL,
  born      DATE,
  team_id   NUMBER(4)    NOT NULL,
  CONSTRAINT pk_player PRIMARY KEY (player_id),
  CONSTRAINT fk_player_team FOREIGN KEY (team_id)
    REFERENCES team (team_id),
  CONSTRAINT uq_team_shirt UNIQUE (team_id, shirt)
);`;

/** Where the player code panel sits in scenes 3 and 4 (same place, so the cut feels continuous). */
export const PLAYER_PANEL = {x: 100, y: 210, width: 960, size: 28} as const;

/** Monospace text inside a card or chip. */
export const Mono: React.FC<{readonly children: React.ReactNode; readonly style?: React.CSSProperties}> = ({children, style}) => (
  <span style={{fontFamily: MONO, ...style}}>{children}</span>
);

/** A round numbered badge (creation order). */
export const StepBadge: React.FC<{
  readonly name: string;
  readonly n: React.ReactNode;
  readonly x: number;
  readonly y: number;
  readonly tone?: Tone;
  readonly opacity?: number;
}> = ({name, n, x, y, tone = 'teal', opacity = 1}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: TONES[tone].strong,
      color: C.surface,
      fontFamily: FONT,
      fontSize: 32,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
      scale: `${0.6 + 0.4 * opacity}`,
    }}
  >
    {n}
  </Interactive.Div>
);

/** A dashed placeholder box: an object that does not exist (yet). */
export const Ghost: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly opacity?: number;
  readonly children: React.ReactNode;
}> = ({name, x, y, width, height, opacity = 1, children}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      boxSizing: 'border-box',
      border: `3px dashed ${C.muted}`,
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT,
      fontSize: 30,
      fontStyle: 'italic',
      color: C.muted,
      opacity,
    }}
  >
    {children}
  </Interactive.Div>
);
