import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {Arrow, OraError} from '../../common/ui';
import {Ghost, Narration, StepBadge} from '../shared';

const WRONG = `CREATE TABLE player (
  -- other columns
  team_id   NUMBER(4)    NOT NULL,
  CONSTRAINT fk_player_team FOREIGN KEY (team_id)
    REFERENCES team (team_id)
);`;

const DROPS = `DROP TABLE player;
DROP TABLE team;`;

const TEAM_COLS: Column[] = [
  {key: 'team_id', label: 'team_id', width: 150, tone: 'teal', pk: true},
  {key: 'name', label: 'name', width: 140, tone: 'teal'},
  {key: 'city', label: 'city', width: 120, tone: 'teal'},
];
const PLAYER_COLS: Column[] = [
  {key: 'player_id', label: 'player_id', width: 160, tone: 'blue', pk: true},
  {key: 'full_name', label: 'full_name', width: 170, tone: 'blue'},
  {key: 'team_id', label: 'team_id', width: 140, tone: 'teal', fk: true},
];
const TEAM = {x: 1230, y: 330};
const PLAYER = {x: 1230, y: 600};
const gTeam = geom(TEAM_COLS, TEAM.x, TEAM.y);
const gPlayer = geom(PLAYER_COLS, PLAYER.x, PLAYER.y);
const HEAD_BOX = 114;
const FK_FROM = {x: gPlayer.cx(2), y: PLAYER.y - 8};
const FK_TO = {x: gTeam.cx(0) + 20, y: gTeam.headBottom + 10};

// 0.8 an FK can only reference an existing table · 5.3 player before team: Oracle stops you
// · 9.9 ORA-00942 · 15.8 parent first, then the child · 19 dropping: children first
const ParentInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fixed = prog(f, 15.8, 16.6);
  const wrongStep = prog(f, 5.3, 5.9);
  return (
    <SceneShell style={style}>
      <Narration scene="parent" />
      <Heading name="Heading" premountFor={fps}>
        The parent table comes first
      </Heading>
      <SqlCode
        name="Child first"
        code={WRONG}
        x={100}
        y={230}
        width={1000}
        size={28}
        opacity={prog(f, 0.8, 1.4) * (1 - 0.6 * fixed)}
        line={(i) => ({highlight: i === 4 ? prog(f, 2.8, 3.4) : 0})}
      />
      <OraError name="ORA-00942" code="ORA-00942" message="table or view does not exist" x={100} y={580} width={1000} opacity={prog(f, 9.9, 10.5) * (1 - 0.6 * fixed)} />
      <SqlCode name="Drop order" code={DROPS} x={100} y={730} width={1000} size={28} opacity={prog(f, 19.2, 19.8)} line={(i) => ({opacity: prog(f, 19.4 + i * 0.6, 19.9 + i * 0.6)})} />

      <Ghost name="No team yet" x={TEAM.x} y={TEAM.y - 50} width={420} height={HEAD_BOX} opacity={wrongStep * (1 - fixed)}>
        team does not exist yet
      </Ghost>
      <DataTable name="Team" title="team (parent)" x={TEAM.x} y={TEAM.y} columns={TEAM_COLS} rows={[]} style={{opacity: fixed}} />
      <DataTable name="Player" title="player (child)" x={PLAYER.x} y={PLAYER.y} columns={PLAYER_COLS} rows={[]} style={{opacity: wrongStep}} />
      <Arrow name="FK to nowhere" from={FK_FROM} to={FK_TO} progress={prog(f, 6, 7)} dashed color={TONES.orange.strong} opacity={1 - fixed} />
      <Arrow name="FK to team" from={FK_FROM} to={FK_TO} progress={prog(f, 16.4, 17.4)} color={TONES.teal.strong} />

      <StepBadge name="Player first (wrong)" n="1" x={1150} y={PLAYER.y - 54} tone="orange" opacity={wrongStep * (1 - fixed)} />
      <StepBadge name="Player second" n="2" x={1150} y={PLAYER.y - 54} tone="teal" opacity={fixed} />
      <StepBadge name="Team first" n="1" x={1150} y={TEAM.y - 54} tone="teal" opacity={fixed} />

      <Chip tone="teal" size={32} style={{left: 1150, top: 760, opacity: prog(f, 17, 17.6)}}>
        Create: parent first
      </Chip>
      <Chip tone="maroon" size={32} style={{left: 1150, top: 860, opacity: prog(f, 19.2, 19.8)}}>
        Drop: children first
      </Chip>
    </SceneShell>
  );
};

export const ParentScene = Interactive.withSchema({
  Component: ParentInner,
  componentName: '<ParentScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
