import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom} from '../../../components/DataTable';
import {DependencyArrow} from '../../../components/DependencyArrow';
import {Heading, SceneShell} from '../../../components/Shell';
import {C} from '../../../theme';
import {cells, ENROLMENT_COLS, STUDENT, STUDENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {OraError} from '../../common/ui';
import {ChipRow, CMD_TONE, Narration} from '../shared';

const CODE = 'TRUNCATE TABLE student;';

const Y = 430;
const ST = {x: 100, cols: STUDENT_COLS};
const EN = {x: 1300, cols: ENROLMENT_COLS};
const gS = geom(ST.cols, ST.x, Y);
const gE = geom(EN.cols, EN.x, Y);

// 0.8 you cannot truncate a parent · 4.2 enrolment is empty now · 5.6 its FK to student is still
// enabled · 9 Oracle refuses: ORA-02266 · 13.6 disable the FK first, or use DELETE
const ParentInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const err = prog(f, 9.2, 9.8);
  return (
    <SceneShell style={style}>
      <Narration scene="parent" />
      <Heading name="Heading" premountFor={fps}>
        TRUNCATE a parent table?
      </Heading>
      <SqlCode
        name="Truncate student"
        code={CODE}
        x={100}
        y={200}
        width={720}
        opacity={prog(f, 0.8, 1.4)}
        line={() => ({highlight: err, tone: 'orange'})}
      />
      <DataTable
        name="Student"
        title="student (parent)"
        x={ST.x}
        y={Y}
        columns={ST.cols}
        rows={cells(STUDENT)}
        style={{opacity: prog(f, 1.6, 2.4)}}
        header={(c) => ({outline: c === 0 ? prog(f, 7.6, 8.2) : 0})}
      />
      <DataTable
        name="Enrolment"
        title="enrolment (child)"
        x={EN.x}
        y={Y}
        columns={EN.cols}
        rows={[]}
        style={{opacity: prog(f, 3.6, 4.4)}}
        header={(c) => ({outline: c === 0 ? prog(f, 6.6, 7.2) : 0})}
      />
      <Interactive.Div
        name="Empty"
        style={{position: 'absolute', left: EN.x, top: gE.headBottom + 20, width: gE.width, textAlign: 'center', fontSize: 32, fontStyle: 'italic', color: C.muted, opacity: prog(f, 4.6, 5.2)}}
      >
        0 rows
      </Interactive.Div>
      <DependencyArrow
        name="FK enabled"
        from={{x: gE.cx(0), y: gE.headTop - 54}}
        to={{x: gS.cx(0), y: gS.headTop - 54}}
        bend={14}
        progress={prog(f, 6.2, 7.6)}
        label="foreign key: ENABLED"
        labelSize={30}
      />
      <OraError
        name="ORA-02266"
        code="ORA-02266"
        message="unique/primary keys in table referenced by enabled foreign keys"
        x={100}
        y={720}
        width={1720}
        opacity={err}
      />
      <ChipRow
        name="Ways out"
        x={100}
        y={860}
        chips={[
          {label: 'disable the foreign key first', tone: 'neutral', opacity: prog(f, 14.6, 15.2)},
          {label: 'or use DELETE', tone: CMD_TONE.DELETE, opacity: prog(f, 16, 16.6)},
        ]}
      />
    </SceneShell>
  );
};

export const DeleteParentScene = Interactive.withSchema({
  Component: ParentInner,
  componentName: '<DeleteParentScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
