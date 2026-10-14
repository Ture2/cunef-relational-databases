import type React from 'react';
import {interpolate, Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {FPS} from '../../common/timeline';
import {C, FONT, TONES} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {Pointer} from '../../common/ui';
import {customerRow, Narration, PlanPanel, TARGET_EMAIL} from '../shared';

const COLS: Column[] = [
  {key: 'customer_id', label: 'customer_id', width: 190, tone: 'blue', pk: true},
  {key: 'email', label: 'email', width: 320, tone: 'blue'},
  {key: 'city', label: 'city', width: 170, tone: 'blue'},
  {key: 'signup_date', label: 'signup_date', width: 200, tone: 'blue'},
];
const GAP = ['⋮', '⋮', '⋮', '⋮'];
const ROWS = [customerRow(1), customerRow(2), customerRow(3), GAP, customerRow(43210), GAP, customerRow(50000)];
/* How many rows have been read when the scan reaches each displayed row. */
const COUNT_AT = [1, 2, 3, 21000, 43210, 46600, 50000];
const MATCH = 4;
const T = {x: 140, y: 330};
const g = geom(COLS, T.x, T.y);

const QUERY = `SELECT * FROM customer
WHERE email = '${TARGET_EMAIL}';`;

const PLAN = ['| Id | Operation         | Name     |', '|  0 | SELECT STATEMENT  |          |', '|  1 |  TABLE ACCESS FULL| CUSTOMER |'];

const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const SCAN = {from: 11.8, to: 16.4};

// 0.8 the customer table: 50,000 rows (5.0) · we want the customer with one email (8.1)
// · 8.8 without an index, no choice (11.4): reads every row (13), first to last (15.2), checks each email (16.7)
// · 17.8 the plan calls this TABLE ACCESS FULL
const ScanInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pos = interpolate(f, [SCAN.from * FPS, SCAN.to * FPS], [0, ROWS.length - 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const scanning = f >= SCAN.from * FPS;
  const count = scanning ? Math.round(interpolate(pos, COUNT_AT.map((_, i) => i), COUNT_AT)) : 0;
  const matchT = interpolate(pos, [MATCH - 0.15, MATCH + 0.1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <SceneShell style={style}>
      <Narration scene="scan" />
      <Heading name="Heading" premountFor={fps}>
        Without an index
      </Heading>
      <DataTable
        name="Customer"
        title="customer"
        x={T.x}
        y={T.y}
        columns={COLS}
        rows={ROWS}
        style={{opacity: prog(f, 0.8, 1.6)}}
        header={(c) => ({outline: c === 1 ? prog(f, 15.6, 16.2) * (1 - prog(f, 17.6, 18.2)) : 0})}
        cell={(r) => {
          if (r === MATCH && matchT > 0) return {bg: TONES.orange.soft, outline: matchT};
          if (scanning && pos >= r - 0.3) return {bg: TONES.yellow.soft};
          return undefined;
        }}
      />
      <Pointer name="Scan pointer" x={86} y={g.rowCy(Math.min(pos, ROWS.length - 1))} opacity={prog(f, SCAN.from - 0.4, SCAN.from) * (1 - prog(f, SCAN.to + 0.6, SCAN.to + 1.2))} />
      <Chip tone="blue" size={32} style={{left: T.x, top: g.bottom(ROWS.length) + 40, opacity: prog(f, 4, 4.8)}}>
        50,000 rows
      </Chip>
      <SqlCode name="Query" code={QUERY} x={1080} y={T.y} width={760} opacity={prog(f, 5.6, 6.4)} line={(i) => ({highlight: i === 1 ? prog(f, 6.4, 7) * (1 - prog(f, 11, 11.6)) : 0})} />
      <Interactive.Div
        name="Rows read"
        style={{position: 'absolute', left: 1080, top: 530, width: 760, fontFamily: FONT, color: C.ink, opacity: prog(f, 11.4, 12)}}
      >
        <div style={{fontSize: 30, fontWeight: 700, color: C.muted}}>Rows read</div>
        <div style={{fontSize: 84, fontWeight: 700, color: count >= 50000 ? TONES.orange.strong : C.ink, fontVariantNumeric: 'tabular-nums'}}>
          {thousands(count)} <span style={{fontSize: 40, color: C.muted}}>/ 50,000</span>
        </div>
      </Interactive.Div>
      <PlanPanel
        name="Plan"
        title="The plan"
        lines={PLAN}
        x={1080}
        y={790}
        width={640}
        opacity={prog(f, 18, 18.6)}
        line={(i) => ({highlight: i === 2 ? prog(f, 18.8, 19.4) : 0})}
      />
    </SceneShell>
  );
};

export const ScanScene = Interactive.withSchema({
  Component: ScanInner,
  componentName: '<ScanScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
