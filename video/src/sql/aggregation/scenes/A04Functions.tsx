import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {Narration, reveal} from '../shared';

const CODE = `SELECT MIN(grade) AS lowest, MAX(grade) AS highest,
       SUM(grade) AS total, ROUND(AVG(grade), 2) AS average
FROM enrolment;`;

const Y = 470;
const RES_X = 720;
const RESULT_COLS: Column[] = [
  {key: 'lowest', label: 'lowest', width: 150, tone: 'maroon'},
  {key: 'highest', label: 'highest', width: 160, tone: 'maroon'},
  {key: 'total', label: 'total', width: 140, tone: 'maroon'},
  {key: 'average', label: 'average', width: 170, tone: 'maroon'},
];
/* Grades 8.5 7.0 6.5 9.0 5.0 7.5: min 5, max 9, sum 43.5, avg 43.5 / 6 = 7.25 (Oracle prints 5 and 9). */
const VALUES = ['5', '9', '43.5', '7.25'];
const AT = [8.4, 9.6, 11, 13.2];
const LOWEST = 4;
const HIGHEST = 3;

// 0.8 SUM, AVG, MIN, MAX over the grades · 7.6 lowest five · highest nine · total 43.5 · average 7.25
// · 16.4 they skip NULLs: a missing grade is not a zero
const FunctionsInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const all = prog(f, 11, 11.6);
  return (
    <SceneShell style={style}>
      <Narration scene="functions" />
      <Heading name="Heading" premountFor={fps}>
        SUM, AVG, MIN and MAX
      </Heading>
      <SqlCode
        name="Query"
        code={CODE}
        x={100}
        y={200}
        width={1100}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({opacity: prog(f, 0.8 + i * 0.6, 1.3 + i * 0.6)})}
      />
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={100}
        y={Y}
        columns={ENROLMENT_COLS}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 3, 3.8)}}
        header={(c) => ({outline: c === 2 ? prog(f, 5, 5.6) * (1 - prog(f, 7.6, 8.2)) : 0})}
        cell={(r, c) => {
          if (c !== 2) return undefined;
          const lo = r === LOWEST ? prog(f, AT[0], AT[0] + 0.5) * (1 - prog(f, 9.4, 9.9)) : 0;
          const hi = r === HIGHEST ? prog(f, AT[1], AT[1] + 0.5) * (1 - prog(f, 10.8, 11.3)) : 0;
          const bg = all > 0 || lo > 0 || hi > 0 ? TONES.maroon.soft : undefined;
          return {bg, outline: Math.max(lo, hi)};
        }}
      />
      <DataTable
        name="Result"
        title="Result"
        x={RES_X}
        y={Y}
        columns={RESULT_COLS}
        rows={[VALUES]}
        style={{opacity: prog(f, 7.6, 8.2)}}
        cell={(_, c) => {
          const t = prog(f, AT[c] + 0.3, AT[c] + 0.9);
          return {content: reveal(VALUES[c], t), outline: t * (1 - prog(f, AT[c] + 1.6, AT[c] + 2.2))};
        }}
      />
      <Chip tone="neutral" size={30} style={{left: RES_X, top: 640, opacity: prog(f, 13.8, 14.6)}}>
        43.5 / 6 = 7.25
      </Chip>
      <Chip tone="orange" size={32} style={{left: RES_X, top: 760, opacity: prog(f, 16.6, 17.4)}}>
        NULLs are skipped
      </Chip>
      <Chip tone="orange" size={32} style={{left: RES_X, top: 860, opacity: prog(f, 18.4, 19.2)}}>
        A missing grade is not a 0
      </Chip>
    </SceneShell>
  );
};

export const AggFunctionsScene = Interactive.withSchema({
  Component: FunctionsInner,
  componentName: '<AggFunctionsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
