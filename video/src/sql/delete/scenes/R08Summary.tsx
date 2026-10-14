import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, tableWidth, type Column} from '../../../components/DataTable';
import {Caption, Heading, SceneShell} from '../../../components/Shell';
import {C, TONES} from '../../../theme';
import {CMD_TONE, Narration} from '../shared';

const COLS: Column[] = [
  {key: 'what', label: '', width: 300, tone: 'neutral'},
  {key: 'delete', label: 'DELETE', width: 320, tone: CMD_TONE.DELETE},
  {key: 'truncate', label: 'TRUNCATE', width: 300, tone: CMD_TONE.TRUNCATE},
  {key: 'drop', label: 'DROP', width: 340, tone: CMD_TONE.DROP},
];
const X = (1920 - tableWidth(COLS)) / 2;
const Y = 260;

type Row = {
  readonly what: string;
  readonly cells: readonly [string, string, string];
  /** When each cell appears: DELETE, TRUNCATE, DROP (local seconds). */
  readonly at: readonly [number, number, number];
  /** Which cells are "good news" (teal) — the others are orange. */
  readonly good: readonly [boolean, boolean, boolean];
};

const ROWS: readonly Row[] = [
  {what: 'Language', cells: ['DML', 'DDL', 'DDL'], at: [2.2, 10, 10.3], good: [true, false, false]},
  {what: 'WHERE', cells: ['optional', 'no', 'no'], at: [3.6, 11.4, 11.7], good: [true, false, false]},
  {what: 'Row triggers', cells: ['fire', 'no', 'no'], at: [5.2, 12.4, 12.7], good: [true, false, false]},
  {what: 'ROLLBACK', cells: ['yes, until COMMIT', 'no: commits', 'no: commits'], at: [6.4, 13.6, 13.9], good: [true, false, false]},
  {what: 'Table kept', cells: ['yes', 'yes, empty', 'no'], at: [7.2, 15.6, 17], good: [true, true, false]},
  {what: 'Speed', cells: ['row by row', 'fast', 'fast'], at: [7.4, 16, 17.3], good: [false, true, true]},
];
const ROLLBACK_ROW = 3;

// 0.8 DELETE is DML: WHERE, fires triggers, can be rolled back · 8.6 TRUNCATE and DROP are DDL: no
// WHERE, no triggers, implicit commit; TRUNCATE keeps the empty table, DROP removes it, unless you
// flash it back · 20 when in doubt, DELETE, and check before you COMMIT
const SummaryInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const flash = prog(f, 18.6, 19.2);
  const rows = ROWS.map((r) => [
    <b key="w">{r.what}</b>,
    ...r.cells.map((v, i) => (
      <span key={i} style={{color: r.good[i] ? TONES.teal.strong : TONES.orange.strong, fontWeight: 700}}>
        {v}
      </span>
    )),
  ]);
  return (
    <SceneShell style={style}>
      <Narration scene="summary" />
      <Heading name="Heading" premountFor={fps}>
        DELETE vs TRUNCATE vs DROP
      </Heading>
      <DataTable
        name="Comparison"
        x={X}
        y={Y}
        columns={COLS}
        rows={rows}
        style={{opacity: prog(f, 0.8, 1.4)}}
        header={(c) => ({outline: c === 1 ? prog(f, 1.6, 2.2) * (1 - prog(f, 8, 8.6)) : c > 1 ? prog(f, 9.2, 9.8) * (1 - prog(f, 18, 18.6)) : 0})}
        cell={(r, c) => {
          if (c === 0) return {opacity: prog(f, ROWS[r].at[0] - 0.4, ROWS[r].at[0] + 0.2), bg: TONES.neutral.soft};
          const op = prog(f, ROWS[r].at[c - 1], ROWS[r].at[c - 1] + 0.5);
          if (r === ROLLBACK_ROW && c === 3 && flash > 0) {
            return {
              opacity: op,
              outline: flash,
              content: <span style={{color: TONES.orange.strong, fontWeight: 700}}>no, but FLASHBACK</span>,
            };
          }
          return {opacity: op};
        }}
      />
      <Caption name="When in doubt" top={760} opacity={prog(f, 20, 20.8)} size={50}>
        When in doubt: <b style={{color: TONES.teal.strong}}>DELETE</b>, check, then <b>COMMIT</b>
      </Caption>
      <Interactive.Div
        name="Bar"
        style={{position: 'absolute', left: 860, top: 850, height: 8, width: 200, borderRadius: 4, backgroundColor: C.accent, scale: `${prog(f, 20.6, 21.6)} 1`}}
      />
    </SceneShell>
  );
};

export const DeleteSummaryScene = Interactive.withSchema({
  Component: SummaryInner,
  componentName: '<DeleteSummaryScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
