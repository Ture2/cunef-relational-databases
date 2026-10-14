import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {Narration} from '../shared';

const CODE = 'CREATE INDEX idx_city_date ON customer (city, signup_date);';

const COLS: Column[] = [
  {key: 'city', label: 'city', width: 200, tone: 'teal'},
  {key: 'signup_date', label: 'signup_date', width: 220, tone: 'teal'},
];
/* Index entries sorted by city, then date (real SHOP rows: ids 526, 1156, 324, 1319, 400, 1030, 1210, 1415, 1223). */
const ROWS = [
  ['Barcelona', '2021-06-10'],
  ['Barcelona', '2023-03-02'],
  ['Bilbao', '2020-11-20'],
  ['Bilbao', '2023-08-12'],
  ['Madrid', '2021-02-04'],
  ['Madrid', '2022-10-27'],
  ['Madrid', '2023-04-25'],
  ['Madrid', '2023-11-16'],
  ['Sevilla', '2023-05-08'],
];
const T = {x: 100, y: 380};
const QX = 620;
const QW = 700;
const VX = 1350;

type Query = {
  readonly code: string;
  readonly y: number;
  readonly at: number;
  /** When its rows light up in the index, and until when. */
  readonly on: number;
  readonly off: number;
  readonly rows: readonly number[];
  readonly ok: boolean;
  readonly verdict: string;
  readonly verdictAt: number;
};

const QUERIES: readonly Query[] = [
  {code: "WHERE city = 'Madrid'\n  AND signup_date >= DATE '2023-01-01'", y: 400, at: 11.8, on: 12.6, off: 14.8, rows: [6, 7], ok: true, verdict: '✓ goes straight there', verdictAt: 13.4},
  {code: "WHERE city = 'Madrid'", y: 590, at: 14.8, on: 15.4, off: 17.6, rows: [4, 5, 6, 7], ok: true, verdict: '✓ goes straight there', verdictAt: 16.2},
  {code: "WHERE signup_date >= DATE '2023-01-01'", y: 730, at: 17.8, on: 18.8, off: 99, rows: [1, 3, 6, 7, 8], ok: false, verdict: '✗ spread across every city', verdictAt: 21.6},
];

// 0.8 an index on several columns (3.0): by city (5.2), then signup date (6.7), like a phone book (10.8)
// · 11.8 Madrid from 2023 (14.6), Madrid alone (17.0) · 17.8 a date alone (19.7) is spread across every city (21.3),
// the index cannot go straight to it (23.9) · leftmost prefix rule (26.0)
const CompositeInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lit = (r: number) => {
    let best = 0;
    for (const q of QUERIES) {
      if (q.rows.indexOf(r) < 0) continue;
      const k = q.ok ? 0 : q.rows.indexOf(r) * 0.3;
      best = Math.max(best, prog(f, q.on + k, q.on + k + 0.5) * (1 - prog(f, q.off, q.off + 0.5)));
    }
    return best;
  };
  return (
    <SceneShell style={style}>
      <Narration scene="composite" />
      <Heading name="Heading" premountFor={fps}>
        Composite index
      </Heading>
      <SqlCode name="Create index" code={CODE} x={100} y={200} width={1100} opacity={prog(f, 0.8, 1.4)} />
      <DataTable
        name="Index entries"
        title="idx_city_date (sorted)"
        x={T.x}
        y={T.y}
        columns={COLS}
        rows={ROWS}
        style={{opacity: prog(f, 3.2, 4)}}
        header={(c) => ({outline: c === 0 ? prog(f, 4.4, 5) * (1 - prog(f, 6, 6.6)) : prog(f, 6.2, 6.8) * (1 - prog(f, 8, 8.6))})}
        cell={(r) => {
          const t = lit(r);
          return t > 0 ? {bg: TONES.orange.soft, outline: t} : undefined;
        }}
      />
      <Chip tone="neutral" size={30} style={{left: QX, top: 400, opacity: prog(f, 7.6, 8.4) * (1 - prog(f, 11, 11.6))}}>
        Like a phone book: surname, then first name
      </Chip>
      {QUERIES.map((q, i) => {
        const active = prog(f, q.on, q.on + 0.5) * (1 - prog(f, q.off, q.off + 0.5));
        return (
          <div key={i}>
            <SqlCode name={`Query ${i + 1}`} code={q.code} x={QX} y={q.y} width={QW} size={28} opacity={prog(f, q.at, q.at + 0.6) * (1 - 0.4 * prog(f, q.off, q.off + 0.5))} line={() => ({highlight: active})} />
            <Chip tone={q.ok ? 'teal' : 'orange'} size={28} style={{left: VX, top: q.y + 16, opacity: prog(f, q.verdictAt, q.verdictAt + 0.6)}}>
              {q.verdict}
            </Chip>
          </div>
        );
      })}
      <Chip tone="yellow" size={32} style={{left: QX, top: 880, opacity: prog(f, 24.2, 25)}}>
        Leftmost prefix rule: city, or city + signup_date
      </Chip>
    </SceneShell>
  );
};

export const CompositeScene = Interactive.withSchema({
  Component: CompositeInner,
  componentName: '<CompositeScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
