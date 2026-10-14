import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom} from '../../../components/DataTable';
import {DependencyArrow} from '../../../components/DependencyArrow';
import {Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {cells, ENROLMENT, ENROLMENT_COLS, STUDENT, STUDENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {ChipRow, CMD_TONE, Narration} from '../shared';

const CODE = `DELETE FROM student
WHERE student_id = 'S03';
ROLLBACK;`;

const Y = 590;
const ST = {x: 100, cols: STUDENT_COLS};
const EN = {x: 1300, cols: ENROLMENT_COLS};
const gS = geom(ST.cols, ST.x, Y);
const gE = geom(EN.cols, EN.x, Y);
const EVA = 2;
const EVA_ENROLMENTS = [4, 5];

// 0.8 DELETE is DML; it removes S03, Eva Sanz · 7.6 the FK says ON DELETE CASCADE: her two enrolments go
// · 14.4 row by row, fires the delete triggers; without a WHERE every row · 22.6 nothing is final
// until COMMIT; undo is kept; ROLLBACK brings the three rows back
const DeleteInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rb = prog(f, 27, 28);
  const evaPick = prog(f, 4.4, 5);
  const evaGone = prog(f, 6, 6.8) * (1 - rb);
  const cascade = prog(f, 11.8, 12.4);
  const cascadeGone = prog(f, 12.6, 13.4) * (1 - rb);
  const back = prog(f, 28, 28.6) * (1 - prog(f, 29.2, 29.8));
  const fx = (picked: number, gone: number) => ({bg: TONES.orange.soft, outline: picked * (1 - rb) + back, strike: gone, opacity: 1 - 0.6 * gone});
  return (
    <SceneShell style={style}>
      <Narration scene="delete" />
      <Heading name="Heading" premountFor={fps}>
        DELETE
      </Heading>
      <SqlCode
        name="Delete"
        code={CODE}
        x={100}
        y={200}
        width={820}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) =>
          i < 2
            ? {opacity: prog(f, 0.8 + i * 0.5, 1.3 + i * 0.5), highlight: i === 1 ? Math.max(evaPick * (1 - prog(f, 9, 9.6)), prog(f, 19.6, 20.2) * (1 - prog(f, 22, 22.6))) : 0, tone: 'teal'}
            : {opacity: prog(f, 26.2, 26.8), highlight: prog(f, 26.6, 27.2)}
        }
      />
      <ChipRow
        name="DELETE facts"
        x={980}
        y={215}
        chips={[
          {label: 'DML', tone: CMD_TONE.DELETE, opacity: prog(f, 1.4, 2)},
          {label: 'WHERE optional', tone: 'neutral', opacity: prog(f, 20, 20.6)},
        ]}
      />
      <ChipRow
        name="DELETE how"
        x={980}
        y={305}
        chips={[
          {label: 'row by row', tone: 'neutral', opacity: prog(f, 15.4, 16)},
          {label: 'fires DELETE triggers', tone: 'neutral', opacity: prog(f, 17.4, 18)},
        ]}
      />
      <ChipRow
        name="Undo"
        x={980}
        y={395}
        chips={[{label: 'undo kept: ROLLBACK restores', tone: 'teal', opacity: prog(f, 25, 25.6)}]}
      />
      <DataTable
        name="Student"
        title="student"
        x={ST.x}
        y={Y}
        columns={ST.cols}
        rows={cells(STUDENT)}
        style={{opacity: prog(f, 2.4, 3.2)}}
        cell={(r) => (r === EVA && evaPick > 0 ? fx(evaPick, evaGone) : undefined)}
      />
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={EN.x}
        y={Y}
        columns={EN.cols}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 3, 3.8)}}
        cell={(r) => (EVA_ENROLMENTS.indexOf(r) >= 0 && cascade > 0 ? fx(cascade, cascadeGone) : undefined)}
      />
      <DependencyArrow
        name="FK on delete cascade"
        from={{x: gE.cx(0), y: gE.headTop - 54}}
        to={{x: gS.cx(0), y: gS.headTop - 54}}
        bend={14}
        progress={prog(f, 8.2, 9.6)}
        label="ON DELETE CASCADE"
        labelSize={30}
      />
    </SceneShell>
  );
};

export const DeleteRowsScene = Interactive.withSchema({
  Component: DeleteInner,
  componentName: '<DeleteRowsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
