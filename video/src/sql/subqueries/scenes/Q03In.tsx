import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS, STUDENT, STUDENT_COLS} from '../../common/school';
import {MONO, SqlCode} from '../../common/SqlCode';
import {OraError, Pointer} from '../../common/ui';
import {CodeBox, codeSpan, Mark, Narration, Val, ValuePanel} from '../shared';

const CODE = `SELECT name
FROM student
WHERE student_id IN (SELECT student_id
                     FROM enrolment
                     WHERE course_id = 'C11');`;

const CX = 100;
const CY = 200;
const IN_BOX = codeSpan(CX, CY, 2, 17, 2);
const INNER_LINE = codeSpan(CX, CY, 2, 20, 25);
const INNER = {...INNER_LINE, height: INNER_LINE.height * 3};

const Y = 600;
const EN_COLS = ENROLMENT_COLS.slice(0, 2);
const ST_COLS = STUDENT_COLS.slice(0, 2);
const ST_X = 900;
const gS = geom(ST_COLS, ST_X, Y);
const PYTHON = [3, 5];
/* The pointer at the door: each student, when it is checked, and whether the id is on the list. */
const DOOR = [
  {at: 6.8, ok: false},
  {at: 7.6, ok: true},
  {at: 8.4, ok: true},
];
const RESULT_COLS: Column[] = [{key: 'name', label: 'name', width: 220, tone: 'blue'}];

// 0.8 a subquery that returns a list: use IN · guest list at the door: is your id on the list?
// · 10.4 Python has two students: Luis Gil and Eva Sanz · 16.4 with =, ORA-01427; use IN
const InInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const py = prog(f, 3.6, 4.2);
  const pointerY = DOOR.reduce((y, d, i) => (i === 0 ? gS.rowCy(0) : y + (gS.rowCy(i) - gS.rowCy(i - 1)) * prog(f, d.at - 0.3, d.at)), 0);
  return (
    <SceneShell style={style}>
      <Narration scene="in" />
      <Heading name="Heading" premountFor={fps}>
        IN: a list of values
      </Heading>
      <SqlCode
        name="Query"
        code={CODE}
        x={CX}
        y={CY}
        width={950}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({opacity: prog(f, 0.8 + i * 0.3, 1.3 + i * 0.3)})}
      />
      <CodeBox name="Inner query" box={INNER} outline={prog(f, 1.8, 2.4) * (1 - prog(f, 2.8, 3.2))} />
      <CodeBox name="IN keyword" box={IN_BOX} outline={prog(f, 2.8, 3.4)} />
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={100}
        y={Y}
        columns={EN_COLS}
        rows={ENROLMENT.map((r) => [r[0], r[1]])}
        style={{opacity: prog(f, 3, 3.6)}}
        cell={(r) => (PYTHON.indexOf(r) >= 0 && py > 0 ? {bg: TONES.maroon.soft, outline: py * (1 - prog(f, 6, 6.6))} : undefined)}
      />
      <ValuePanel name="The list" title="The guest list" x={520} y={Y + 20} width={300} opacity={prog(f, 3.8, 4.4)} outline={prog(f, 4.8, 5.4) * (1 - prog(f, 6.2, 6.8))}>
        <Val t={prog(f, 4.2, 4.8)}>S02</Val>
        <br />
        <Val t={prog(f, 4.6, 5.2)}>S03</Val>
      </ValuePanel>
      <DataTable
        name="Student"
        title="student"
        x={ST_X}
        y={Y}
        columns={ST_COLS}
        rows={STUDENT.map((r) => [r[0], r[1]])}
        style={{opacity: prog(f, 5, 5.6)}}
        cell={(r) => (DOOR[r].ok && f >= DOOR[r].at * fps ? {bg: TONES.teal.soft} : undefined)}
      />
      <Pointer name="Door" x={ST_X - 52} y={pointerY} opacity={prog(f, 6.4, 6.8) * (1 - prog(f, 9.4, 10))} />
      {DOOR.map((d, r) => (
        <Mark key={r} name={`Door ${r}`} ok={d.ok} x={ST_X + gS.width + 20} y={gS.rowCy(r)} opacity={prog(f, d.at + 0.2, d.at + 0.6)} size={40} />
      ))}
      <DataTable
        name="Result"
        title="Result: 2 rows"
        titleOpacity={prog(f, 12.6, 13.2)}
        x={1460}
        y={Y}
        columns={RESULT_COLS}
        rows={[[STUDENT[1][1]], [STUDENT[2][1]]]}
        style={{opacity: prog(f, 12.4, 13)}}
        rowOpacity={(i) => prog(f, 13.8 + i * 1.1, 14.4 + i * 1.1)}
      />
      <Chip tone="neutral" size={30} style={{left: 1100, top: 210, opacity: prog(f, 16.6, 17.4), fontFamily: MONO}}>
        student_id = (SELECT …)
      </Chip>
      <OraError name="ORA-01427" code="ORA-01427" message="single-row subquery returns more than one row" x={1100} y={300} width={720} size={26} opacity={prog(f, 19.4, 20.2)} />
      <Chip tone="teal" size={34} style={{left: 1100, top: 430, opacity: prog(f, 22.4, 23)}}>
        A list needs IN
      </Chip>
    </SceneShell>
  );
};

export const InScene = Interactive.withSchema({
  Component: InInner,
  componentName: '<InScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
