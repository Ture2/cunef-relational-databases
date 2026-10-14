import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom} from '../../../components/DataTable';
import {Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {ChipRow, CMD_TONE, MEMBER, MEMBER_COLS, Narration, RecycleBin} from '../shared';

const CODE = `DROP TABLE member;
FLASHBACK TABLE member TO BEFORE DROP;
DROP TABLE member PURGE;`;

const TX = 100;
const TY = 560;
const g = geom(MEMBER_COLS, TX, TY);
const T_CX = TX + g.width / 2;
const T_CY = TY + (g.bottom(MEMBER.length) - TY) / 2;
const BIN = {x: 1380, y: 470};
const BIN_C = {x: BIN.x + 210, y: BIN.y + 205};

// 0.8 DROP removes everything: rows, columns, indexes and constraints · 7.9 it goes to the recycle
// bin · 14.5 FLASHBACK TABLE … TO BEFORE DROP brings it back, rows included · 20.6 PURGE skips the
// bin: gone for good
const DropInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const into = prog(f, 10.2, 11.4) * (1 - prog(f, 16.6, 17.8));
  const rowsBack = prog(f, 18.4, 19) * (1 - prog(f, 20.4, 21));
  const purge = prog(f, 22.6, 23.6);
  const parts = 1 - prog(f, 9.6, 10.2);
  const lineFx = (i: number) => {
    const at = [1, 14.5, 20.8][i];
    const next = [14.3, 20.6, 99][i];
    return {opacity: prog(f, at, at + 0.5), highlight: prog(f, at + 0.2, at + 0.7) * (1 - prog(f, next, next + 0.4)), tone: CMD_TONE.DROP};
  };
  return (
    <SceneShell style={style}>
      <Narration scene="drop" />
      <Heading name="Heading" premountFor={fps}>
        DROP and the recycle bin
      </Heading>
      <SqlCode name="Drop" code={CODE} x={100} y={200} width={900} opacity={prog(f, 0.8, 1.4)} line={lineFx} />
      <ChipRow name="DROP facts" x={1060} y={215} chips={[{label: 'DDL', tone: CMD_TONE.DROP, opacity: prog(f, 1.6, 2.2)}]} />
      <RecycleBin name="Recycle bin" x={BIN.x} y={BIN.y} opacity={prog(f, 8.4, 9.2)} glow={prog(f, 10.4, 11) * (1 - prog(f, 12.6, 13.2))} />
      <DataTable
        name="Member"
        title="member"
        x={TX}
        y={TY}
        columns={MEMBER_COLS}
        rows={MEMBER.map((r) => [...r])}
        style={{
          opacity: prog(f, 1.4, 2.2) * (1 - purge),
          transformOrigin: `${T_CX - TX}px ${T_CY - TY}px`,
          translate: `${(BIN_C.x - T_CX) * into}px ${(BIN_C.y - T_CY) * into + purge * 30}px`,
          scale: `${1 - 0.5 * into - 0.2 * purge}`,
        }}
        cell={() => (rowsBack > 0 ? {bg: TONES.orange.soft, outline: rowsBack} : purge > 0 ? {strike: purge} : undefined)}
      />
      <ChipRow
        name="What goes"
        x={100}
        y={790}
        size={28}
        chips={[
          {label: 'rows', tone: 'neutral', opacity: prog(f, 3.2, 3.8) * parts},
          {label: 'columns', tone: 'neutral', opacity: prog(f, 4, 4.6) * parts},
          {label: 'indexes', tone: 'neutral', opacity: prog(f, 5.4, 6) * parts},
          {label: 'constraints', tone: 'neutral', opacity: prog(f, 6.2, 6.8) * parts},
        ]}
      />
      <ChipRow
        name="Back again"
        x={100}
        y={790}
        size={28}
        chips={[{label: 'back again, rows included', tone: 'teal', opacity: prog(f, 18.4, 19) * (1 - prog(f, 20.4, 21))}]}
      />
      <ChipRow
        name="Purge"
        x={100}
        y={790}
        size={28}
        chips={[
          {label: 'PURGE skips the bin', tone: CMD_TONE.DROP, opacity: prog(f, 22.8, 23.4)},
          {label: 'gone for good', tone: 'orange', opacity: prog(f, 24.2, 24.8)},
        ]}
      />
    </SceneShell>
  );
};

export const DeleteDropScene = Interactive.withSchema({
  Component: DropInner,
  componentName: '<DeleteDropScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
