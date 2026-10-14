import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom, HEAD_H, ROW_H, type Column} from '../../../components/DataTable';
import {Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {Arrow} from '../../common/ui';
import {Fold, Narration, Receipt} from '../shared';

const CODE = `SELECT COUNT(*), AVG(grade)
FROM enrolment;`;

const ITEMS = [
  ['Bread', '1.20'],
  ['Milk', '0.95'],
  ['Eggs', '2.40'],
  ['Apples', '1.80'],
  ['Coffee', '4.50'],
  ['Rice', '1.15'],
] as const;

const Y = 470;
const EN = {x: 760, cols: ENROLMENT_COLS};
const gE = geom(EN.cols, EN.x, Y);
const RES_X = 1430;
const RESULT_COLS: Column[] = [
  {key: 'count', label: 'COUNT(*)', width: 170, tone: 'neutral'},
  {key: 'avg', label: 'AVG(grade)', width: 200, tone: 'maroon'},
];
const FOLD_AT = 12.4;

// 0.8 a supermarket receipt: many lines, one total · 7.2 an aggregate does the same with rows ·
// ~10.4 COUNT(*) and the average grade · ~12.6 six enrolments become a single row
const ReceiptInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const landed = prog(f, FOLD_AT + 1.4, FOLD_AT + 2);
  return (
    <SceneShell style={style}>
      <Narration scene="receipt" />
      <Heading name="Heading" premountFor={fps}>
        Many rows, one value
      </Heading>
      <Receipt
        name="Receipt"
        x={120}
        y={240}
        lines={ITEMS}
        total="12.00"
        opacity={prog(f, 0.8, 1.4)}
        lineOpacity={(i) => prog(f, 1.2 + i * 0.4, 1.7 + i * 0.4)}
        totalOpacity={prog(f, 4.2, 4.8)}
        totalOutline={prog(f, 4.8, 5.4)}
      />
      <SqlCode
        name="Query"
        code={CODE}
        x={EN.x}
        y={220}
        width={1060}
        opacity={prog(f, 7.2, 7.8)}
        line={(i) => ({highlight: i === 0 ? prog(f, 10.2, 10.8) : 0})}
      />
      <DataTable
        name="Enrolment"
        title="enrolment: 6 rows"
        x={EN.x}
        y={Y}
        columns={EN.cols}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 7.6, 8.4)}}
        header={(c) => ({outline: c === 2 ? prog(f, 11, 11.6) : 0})}
        cell={(r, c) => (c === 2 && prog(f, 11, 11.6) > 0 ? {bg: TONES.maroon.soft} : undefined)}
      />
      <Fold
        name="Rows fold into one"
        rows={ENROLMENT.map((_, r) => ({
          x1: EN.x,
          y1: Y + HEAD_H + r * ROW_H,
          w1: gE.width,
          x2: RES_X,
          y2: Y + HEAD_H,
          w2: 370,
          t: prog(f, FOLD_AT + r * 0.12, FOLD_AT + 1.4 + r * 0.12),
          tone: 'maroon',
        }))}
      />
      <Arrow name="Into one row" from={{x: gE.left(0) + gE.width + 20, y: gE.rowCy(2.5)}} to={{x: RES_X - 20, y: gE.rowCy(0)}} progress={prog(f, FOLD_AT, FOLD_AT + 1)} />
      <DataTable
        name="Result"
        title="Result: 1 row"
        x={RES_X}
        y={Y}
        columns={RESULT_COLS}
        rows={[['6', '7.25']]}
        style={{opacity: prog(f, FOLD_AT - 0.4, FOLD_AT + 0.2)}}
        rowOpacity={() => landed}
        cell={() => ({outline: landed * (1 - prog(f, 16.4, 17))})}
      />
    </SceneShell>
  );
};

export const AggReceiptScene = Interactive.withSchema({
  Component: ReceiptInner,
  componentName: '<AggReceiptScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
