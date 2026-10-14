import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, tableWidth, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {Narration, PILE_TONES, pileLayout} from '../shared';

const CODE = `SELECT course_id, COUNT(*) AS grades_6_or_more
FROM enrolment
WHERE grade >= 6
GROUP BY course_id
HAVING COUNT(*) >= 2
ORDER BY course_id;`;

const Y = 560;
const EN_X = 100;
const EN_W = tableWidth(ENROLMENT_COLS);
/* WHERE grade >= 6 drops S03 C10 5.0 (row 4); the piles: C10 (8.5, 6.5), C11 (9.0, 7.5), C20 (7.0). */
const EVA = 4;
const PILES = [
  [0, 2],
  [3, 5],
  [1],
];
const P = pileLayout(PILES);
const COUNTS = ['COUNT(*) = 2', 'COUNT(*) = 2', 'COUNT(*) = 1'];
const C20 = 2;

const RX = 980;
const RESULT_COLS: Column[] = [
  {key: 'course_id', label: 'course_id', width: 170, tone: 'orange'},
  {key: 'grades_6_or_more', label: 'grades_6_or_more', width: 280, tone: 'neutral'},
];

// 0.8 two places to filter; WHERE filters rows before grouping: grades under 6 dropped · 8.9 Eva's 5
// never reaches a pile · 12.8 HAVING filters groups after grouping; COUNT(*) >= 2 drops the C20 pile
// · 21 C10 and C11 remain · 27.2 aggregates in HAVING, the rest in WHERE
const HavingInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const evaHit = prog(f, 6.4, 7);
  const evaGone = prog(f, 9.6, 10.6);
  const sort = prog(f, 10.4, 12);
  const counts = prog(f, 15.6, 16.2);
  const c20 = prog(f, 18.2, 18.8);
  const c20Gone = prog(f, 19.6, 20.4);
  const pileOp = (p: number) => (p === C20 ? 1 - 0.8 * c20Gone : 1);
  return (
    <SceneShell style={style}>
      <Narration scene="having" />
      <Heading name="Heading" premountFor={fps}>
        WHERE and HAVING
      </Heading>
      <SqlCode
        name="Query"
        code={CODE}
        x={100}
        y={200}
        width={780}
        size={26}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({
          highlight:
            i === 2 ? prog(f, 3.2, 3.8) * (1 - prog(f, 9.8, 10.4)) : i === 3 ? prog(f, 10.2, 10.8) * (1 - prog(f, 12.6, 13.2)) : i === 4 ? prog(f, 13, 13.6) * (1 - prog(f, 20.6, 21.2)) : 0,
          tone: i === 4 ? 'maroon' : 'teal',
        })}
      />
      <Chip tone="teal" size={30} style={{left: RX, top: 214, opacity: prog(f, 3.6, 4.4)}}>
        WHERE: rows, before grouping
      </Chip>
      <Chip tone="maroon" size={30} style={{left: RX, top: 304, opacity: prog(f, 13.4, 14.2)}}>
        HAVING: groups, after grouping
      </Chip>
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={EN_X}
        y={Y}
        columns={ENROLMENT_COLS}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 1.4, 2.2)}}
        rowOffset={(r) => P.offset(r, sort)}
        rowOpacity={(r) => (r === EVA ? 1 - evaGone : pileOp(P.pileOf(r)))}
        cell={(r, c) => {
          if (r === EVA) return evaHit > 0 ? {bg: TONES.orange.soft, outline: evaHit, strike: c === 2 ? prog(f, 7.2, 8) : 0} : undefined;
          const p = P.pileOf(r);
          if (sort <= 0) return undefined;
          return {bg: TONES[PILE_TONES[p]].soft, outline: p === C20 ? c20 : 0, strike: p === C20 ? prog(f, 18.8, 19.6) : 0};
        }}
      />
      {COUNTS.map((label, p) => (
        <Chip
          key={p}
          tone={p === C20 ? 'orange' : PILE_TONES[p]}
          size={26}
          style={{left: EN_X + EN_W + 24, top: Y + P.pileCy(p) - 28, opacity: counts * pileOp(p)}}
        >
          {label}
        </Chip>
      ))}
      <DataTable
        name="Result"
        title="Result"
        x={RX}
        y={500}
        columns={RESULT_COLS}
        rows={[
          ['C10', '2'],
          ['C11', '2'],
        ]}
        style={{opacity: prog(f, 21, 21.6)}}
        rowOpacity={(i) => prog(f, 21.8 + i * 1.2, 22.4 + i * 1.2)}
        cell={(i) => ({bg: TONES[PILE_TONES[i]].soft})}
      />
      <Chip tone="maroon" size={32} style={{left: RX, top: 760, opacity: prog(f, 27.6, 28.4)}}>
        Condition on an aggregate: HAVING
      </Chip>
      <Chip tone="teal" size={32} style={{left: RX, top: 860, opacity: prog(f, 29.6, 30.4)}}>
        Everything else: WHERE
      </Chip>
    </SceneShell>
  );
};

export const AggHavingScene = Interactive.withSchema({
  Component: HavingInner,
  componentName: '<AggHavingScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
