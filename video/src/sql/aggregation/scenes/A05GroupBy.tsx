import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, HEAD_H, ROW_H, tableWidth, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {Fold, Narration, PILE_TONES, pileLayout, reveal} from '../shared';

const CODE = `SELECT course_id, COUNT(*) AS students, ROUND(AVG(grade), 2) AS average
FROM enrolment
GROUP BY course_id
ORDER BY course_id;`;

const Y = 510;
const EN_X = 100;
const EN_W = tableWidth(ENROLMENT_COLS);
/* C10: S01 8.5, S02 6.5, S03 5.0 · C11: S02 9.0, S03 7.5 · C20: S01 7.0 */
const PILES = [
  [0, 2, 4],
  [3, 5],
  [1],
];
const P = pileLayout(PILES);
const PILE_LABELS = ['C10 · 3 rows', 'C11 · 2 rows', 'C20 · 1 row'];
const PILE_AT = [11.4, 13, 14.4];

const RES_X = 1120;
const RESULT_COLS: Column[] = [
  {key: 'course_id', label: 'course_id', width: 170, tone: 'orange'},
  {key: 'students', label: 'students', width: 160, tone: 'neutral'},
  {key: 'average', label: 'average', width: 170, tone: 'maroon'},
];
/* COUNT(*) and ROUND(AVG(grade), 2) per pile: 20 / 3 = 6.67, 16.5 / 2 = 8.25, 7 */
const RESULT = [
  ['C10', '3', '6.67'],
  ['C11', '2', '8.25'],
  ['C20', '1', '7'],
];
const FOLD_AT = [19, 19.6, 20.2];
/* When the voice reads each pile's count and average. */
const VALUE_AT = [
  [24.6, 26.2],
  [28.2, 28.6],
  [30.8, 31.2],
];
/* Each result row sits beside its pile. */
const resTop = (i: number) => P.pileCy(i) - ROW_H / 2;

// 0.8 an average per course; GROUP BY = sorting the laundry into piles · 7.8 one pile per course:
// C10 ×3, C11 ×2, C20 ×1 · 16.2 the aggregates per pile; each pile becomes one row · 23.4 the values
const GroupByInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sort = prog(f, 8.6, 10.4);
  const pileT = (p: number) => prog(f, PILE_AT[p], PILE_AT[p] + 0.5);
  return (
    <SceneShell style={style}>
      <Narration scene="groupby" />
      <Heading name="Heading" premountFor={fps}>
        GROUP BY
      </Heading>
      <SqlCode
        name="Query"
        code={CODE}
        x={100}
        y={190}
        width={1200}
        size={28}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({highlight: i === 2 ? prog(f, 8, 8.6) * (1 - prog(f, 15.6, 16.2)) : i === 0 ? prog(f, 16.4, 17) * (1 - prog(f, 22.4, 23)) : 0})}
      />
      <Chip tone="neutral" size={30} style={{left: 1340, top: 214, opacity: prog(f, 4.6, 5.4)}}>
        Sort into piles
      </Chip>
      <Chip tone="neutral" size={30} style={{left: 1340, top: 304, opacity: prog(f, 19.6, 20.4)}}>
        One row per pile
      </Chip>
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={EN_X}
        y={Y}
        columns={ENROLMENT_COLS}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 1.6, 2.4)}}
        rowOffset={(r) => P.offset(r, sort)}
        header={(c) => ({outline: c === 1 ? prog(f, 8, 8.6) * (1 - prog(f, 10.6, 11.2)) : 0})}
        cell={(r, c) => {
          const p = P.pileOf(r);
          const t = pileT(p);
          if (t <= 0) return undefined;
          const live = prog(f, PILE_AT[p], PILE_AT[p] + 0.5) * (1 - prog(f, PILE_AT[p] + 1.4, PILE_AT[p] + 2));
          return {bg: TONES[PILE_TONES[p]].soft, outline: c === 1 ? live : 0};
        }}
      />
      <Fold
        name="Piles fold into rows"
        rows={PILES.flatMap((rows, p) =>
          rows.map((r, k) => ({
            x1: EN_X,
            y1: Y + P.sortedTop(r),
            w1: EN_W,
            x2: RES_X,
            y2: Y + resTop(p),
            w2: tableWidth(RESULT_COLS),
            t: prog(f, FOLD_AT[p] + k * 0.12, FOLD_AT[p] + 1.3 + k * 0.12),
            tone: PILE_TONES[p],
          })),
        )}
      />
      {PILE_LABELS.map((label, p) => (
        <Chip key={label} tone={PILE_TONES[p]} size={26} style={{left: EN_X + EN_W + 24, top: Y + P.pileCy(p) - 28, opacity: pileT(p)}}>
          {label}
        </Chip>
      ))}
      <DataTable
        name="Result"
        title="Result: one row per pile"
        x={RES_X}
        y={Y}
        columns={RESULT_COLS}
        rows={RESULT}
        style={{opacity: prog(f, 17.4, 18)}}
        rowOffset={(i) => resTop(i) - (HEAD_H + i * ROW_H)}
        rowOpacity={(i) => prog(f, FOLD_AT[i] + 1.1, FOLD_AT[i] + 1.6)}
        cell={(i, c) => {
          const bg = TONES[PILE_TONES[i]].soft;
          if (c === 0) return {bg};
          const t = prog(f, VALUE_AT[i][c - 1], VALUE_AT[i][c - 1] + 0.5);
          return {bg, content: reveal(RESULT[i][c], t), outline: t * (1 - prog(f, VALUE_AT[i][c - 1] + 1.4, VALUE_AT[i][c - 1] + 2))};
        }}
      />
    </SceneShell>
  );
};

export const AggGroupByScene = Interactive.withSchema({
  Component: GroupByInner,
  componentName: '<AggGroupByScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
