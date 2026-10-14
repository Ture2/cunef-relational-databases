import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom} from '../../../components/DataTable';
import {DependencyArrow} from '../../../components/DependencyArrow';
import {Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {cells, ENROLMENT, ENROLMENT_COLS, STUDENT, STUDENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {OraError} from '../../common/ui';
import {ChipRow, CMD_TONE, Narration} from '../shared';

const CODE = `DROP TABLE student;
DROP TABLE student CASCADE CONSTRAINTS;`;

const Y = 500;
const ST = {x: 100, cols: STUDENT_COLS};
const EN = {x: 1300, cols: ENROLMENT_COLS};
const gS = geom(ST.cols, ST.x, Y);
const gE = geom(EN.cols, EN.x, Y);

// 0.8 dropping a referenced parent fails: ORA-02449 · 8.6 CASCADE CONSTRAINTS also drops the
// foreign keys that point to it · 13.4 the enrolment rows stay, but nothing checks them any more
const CascadeInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const err = prog(f, 5, 5.6) * (1 - prog(f, 9.4, 10));
  const dropped = prog(f, 10.4, 11.4);
  const fkGone = prog(f, 12, 12.8);
  const stay = prog(f, 14, 14.6);
  return (
    <SceneShell style={style}>
      <Narration scene="cascade" />
      <Heading name="Heading" premountFor={fps}>
        Dropping a parent: CASCADE CONSTRAINTS
      </Heading>
      <SqlCode
        name="Drop student"
        code={CODE}
        x={100}
        y={200}
        width={900}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) =>
          i === 0
            ? {highlight: err, tone: 'orange', opacity: 1 - 0.5 * prog(f, 9, 9.6)}
            : {opacity: prog(f, 9, 9.6), highlight: prog(f, 9.6, 10.2), tone: CMD_TONE.DROP}
        }
      />
      <DataTable
        name="Student"
        title="student"
        x={ST.x}
        y={Y}
        columns={ST.cols}
        rows={cells(STUDENT)}
        style={{opacity: prog(f, 1.4, 2.2) * (1 - 0.85 * dropped), scale: `${1 - 0.1 * dropped}`}}
        cell={() => (dropped > 0 ? {strike: dropped} : undefined)}
      />
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={EN.x}
        y={Y}
        columns={EN.cols}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 2, 2.8)}}
        header={(c) => (c === 0 ? {fk: 1 - fkGone, outline: prog(f, 11.6, 12) * (1 - prog(f, 13.4, 14))} : undefined)}
        cell={(_, c) => (c === 0 && stay > 0 ? {bg: TONES.orange.soft, outline: stay} : undefined)}
      />
      <DependencyArrow
        name="FK to student"
        from={{x: gE.cx(0), y: gE.headTop - 54}}
        to={{x: gS.cx(0), y: gS.headTop - 54}}
        bend={14}
        progress={prog(f, 2.8, 4.2)}
        crossed={fkGone}
        opacity={1 - prog(f, 13.4, 14)}
        label="foreign key"
        labelSize={30}
      />
      <OraError
        name="ORA-02449"
        code="ORA-02449"
        message="unique/primary keys in table referenced by foreign keys"
        x={100}
        y={790}
        width={1150}
        opacity={err}
      />
      <ChipRow
        name="Result"
        x={100}
        y={820}
        chips={[
          {label: 'student dropped', tone: CMD_TONE.DROP, opacity: prog(f, 11, 11.6)},
          {label: 'the foreign keys to it dropped too', tone: 'neutral', opacity: prog(f, 12.4, 13)},
        ]}
      />
      <ChipRow
        name="Rows stay"
        x={100}
        y={910}
        chips={[
          {label: 'enrolment rows stay', tone: 'teal', opacity: stay},
          {label: 'nothing checks student_id any more', tone: 'orange', opacity: prog(f, 15.6, 16.2)},
        ]}
      />
    </SceneShell>
  );
};

export const DeleteCascadeScene = Interactive.withSchema({
  Component: CascadeInner,
  componentName: '<DeleteCascadeScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
