import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {cells, STUDENT, STUDENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {Badge, Narration, reveal} from '../shared';

const CODE = `SELECT COUNT(*)     AS students,
       COUNT(email) AS with_email
FROM student;`;

const Y = 480;
const ST = {x: 100, cols: STUDENT_COLS};
const gS = geom(ST.cols, ST.x, Y);
const RESULT_COLS: Column[] = [
  {key: 'students', label: 'students', width: 170, tone: 'blue'},
  {key: 'with_email', label: 'with_email', width: 200, tone: 'blue'},
];
const STAR_AT = [1.9, 2.5, 3.1];
const EMAIL_AT = [8.2, 8.8];
const EVA = 2;

// 0.8 COUNT(*) counts rows: three · 6.4 COUNT(email) counts the values that are not NULL ·
// ~10.4 Eva has no email · ~12 two · 14.6 count the column for values that may be missing
const CountInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const starOff = 1 - prog(f, 6.2, 6.8);
  const eva = prog(f, 10.4, 11);
  const star = (r: number) => prog(f, STAR_AT[r], STAR_AT[r] + 0.4) * starOff;
  return (
    <SceneShell style={style}>
      <Narration scene="count" />
      <Heading name="Heading" premountFor={fps}>
        COUNT(*) and COUNT(column)
      </Heading>
      <SqlCode
        name="Query"
        code={CODE}
        x={100}
        y={200}
        width={1000}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({highlight: i === 0 ? prog(f, 1, 1.6) * starOff : i === 1 ? prog(f, 6.6, 7.2) : 0})}
      />
      <DataTable
        name="Student"
        title="student"
        x={ST.x}
        y={Y}
        columns={ST.cols}
        rows={cells(STUDENT)}
        style={{opacity: prog(f, 1.2, 1.8)}}
        header={(c) => ({outline: c === 2 ? prog(f, 7.4, 8) : 0})}
        cell={(r, c) => {
          if (c === 2 && r === EVA && eva > 0) return {bg: TONES.orange.soft, outline: eva, strike: prog(f, 11, 11.6)};
          if (c === 2 && r < 2) {
            const t = prog(f, EMAIL_AT[r], EMAIL_AT[r] + 0.4);
            if (t > 0) return {bg: TONES.blue.soft, outline: t};
          }
          const t = star(r);
          return t > 0 ? {bg: TONES.blue.soft} : undefined;
        }}
      />
      {STAR_AT.map((_, r) => (
        <Badge key={`s${r}`} name={`Row ${r + 1}`} x={gS.left(0) + gS.width + 16} cy={gS.rowCy(r)} opacity={star(r)}>
          {r + 1}
        </Badge>
      ))}
      {EMAIL_AT.map((at, r) => (
        <Badge key={`e${r}`} name={`Email ${r + 1}`} x={gS.left(0) + gS.width + 16} cy={gS.rowCy(r)} tone="orange" opacity={prog(f, at, at + 0.4)}>
          {r + 1}
        </Badge>
      ))}
      <DataTable
        name="Result"
        title="Result"
        x={800}
        y={Y}
        columns={RESULT_COLS}
        rows={[['3', '2']]}
        style={{opacity: prog(f, 3.6, 4.2)}}
        cell={(_, c) => {
          const t = c === 0 ? prog(f, 4.6, 5.2) : prog(f, 12, 12.6);
          return {content: reveal(c === 0 ? '3' : '2', t), outline: t * (1 - prog(f, c === 0 ? 6.2 : 14, c === 0 ? 6.8 : 14.6))};
        }}
      />
      <Chip tone="blue" size={32} style={{left: 800, top: 680, opacity: prog(f, 14.8, 15.6)}}>
        COUNT(*): every row
      </Chip>
      <Chip tone="orange" size={32} style={{left: 800, top: 780, opacity: prog(f, 16.6, 17.4)}}>
        COUNT(column): skips NULLs
      </Chip>
    </SceneShell>
  );
};

export const AggCountScene = Interactive.withSchema({
  Component: CountInner,
  componentName: '<AggCountScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
