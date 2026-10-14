import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {ENROLMENT_COLS, Null} from '../../common/school';
import {MONO, SqlCode} from '../../common/SqlCode';
import {Arrow} from '../../common/ui';
import {Narration} from '../shared';

const TY = 260;
const OLD_X = 160;
const NEW_X = 1290;
const gOld = geom(ENROLMENT_COLS, OLD_X, TY);

const GRID_COLS: Column[] = [
  {key: 'stmt', label: 'statement', width: 360, tone: 'neutral'},
  {key: 'old', label: ':OLD.grade', width: 340, tone: 'maroon'},
  {key: 'new', label: ':NEW.grade', width: 340, tone: 'maroon'},
];
const GX = 440;
const GY = 500;

/* statement, :OLD.grade, :NEW.grade (null = no such row), and when the row appears / its NULL lights up. */
const GRID = [
  {stmt: 'UPDATE', old: '6.5', nu: '7.0', at: 11, nullAt: 0},
  {stmt: 'INSERT', old: null, nu: '8.0', at: 12.4, nullAt: 14.6},
  {stmt: 'DELETE', old: '5.5', nu: null, at: 16.4, nullAt: 18.8},
] as const;

// 0.8 a row trigger sees two versions of the row · 4 :OLD before the change · 6.8 :NEW after it
// · 10.8 an update has both · 12.4 insert: :OLD is null · 16.4 delete: :NEW is null · 21.4 inside WHEN, no colon
const OldNewInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <Narration scene="oldnew" />
      <Heading name="Heading" premountFor={fps}>
        :OLD and :NEW
      </Heading>
      <DataTable
        name="OLD row"
        title=":OLD (before)"
        x={OLD_X}
        y={TY}
        columns={ENROLMENT_COLS}
        rows={[['S02', 'C10', '6.5']]}
        style={{opacity: prog(f, 4, 4.6)}}
      />
      <Chip tone="orange" size={30} style={{left: 790, top: 250, opacity: prog(f, 6.6, 7.2)}}>
        UPDATE
      </Chip>
      <Arrow name="Change" from={{x: gOld.left(0) + gOld.width + 30, y: gOld.rowCy(0)}} to={{x: NEW_X - 30, y: gOld.rowCy(0)}} progress={prog(f, 6.8, 7.6)} />
      <DataTable
        name="NEW row"
        title=":NEW (after)"
        x={NEW_X}
        y={TY}
        columns={ENROLMENT_COLS}
        rows={[['S02', 'C10', '7.0']]}
        style={{opacity: prog(f, 7.4, 8)}}
        cell={(_, c) => (c === 2 ? {bg: TONES.orange.soft, outline: prog(f, 7.8, 8.4)} : undefined)}
      />
      <DataTable
        name="OLD and NEW per statement"
        x={GX}
        y={GY}
        columns={GRID_COLS}
        rows={GRID.map((g) => [<b key="s" style={{fontFamily: MONO}}>{g.stmt}</b>, g.old ?? <Null key="o" />, g.nu ?? <Null key="n" />])}
        style={{opacity: prog(f, 10.6, 11.2)}}
        rowOpacity={(r) => prog(f, GRID[r].at, GRID[r].at + 0.6)}
        cell={(r, c) => {
          const g = GRID[r];
          const isNull = (c === 1 && g.old === null) || (c === 2 && g.nu === null);
          return isNull ? {bg: TONES.orange.soft, outline: prog(f, g.nullAt, g.nullAt + 0.6)} : undefined;
        }}
      />
      <Chip tone="orange" size={28} style={{left: GX + 1060, top: GY + 64 + 58 + 8, opacity: prog(f, 15, 15.6)}}>
        no old row
      </Chip>
      <Chip tone="orange" size={28} style={{left: GX + 1060, top: GY + 64 + 116 + 8, opacity: prog(f, 19.2, 19.8)}}>
        no new row
      </Chip>
      <SqlCode name="WHEN without colon" code="WHEN (NEW.grade <> OLD.grade)" x={GX} y={800} width={600} size={30} opacity={prog(f, 21.6, 22.2)} />
      <Chip tone="teal" size={30} style={{left: GX + 640, top: 815, opacity: prog(f, 22.8, 23.4)}}>
        Inside WHEN: no colon
      </Chip>
    </SceneShell>
  );
};

export const OldNewScene = Interactive.withSchema({
  Component: OldNewInner,
  componentName: '<OldNewScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
