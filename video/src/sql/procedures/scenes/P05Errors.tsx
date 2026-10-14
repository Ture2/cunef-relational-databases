import type React from 'react';
import {interpolate, Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {cells} from '../../common/school';
import {codeLineY, SqlCode} from '../../common/SqlCode';
import {OraError, Pointer} from '../../common/ui';
import {ENROL_COLS, ENROL_ROWS, NEW_ROW, Narration, OutputBox} from '../shared';

/* The executable part of enrol_student (scene 3), from BEGIN to END. */
const BODY = `BEGIN
  INSERT INTO enrolment (student_id, course_id)
  VALUES (p_student, p_course);
  p_message := p_student || ' enrolled in ' || p_course;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    p_message := p_student || ' was already enrolled in ' || p_course;
END enrol_student;`;

const CY = 200;
const BY = 370;
const SIZE = 26;
const TB = {x: 1290, y: 370};
const gT = geom(ENROL_COLS, TB.x, TB.y);

// 0.8 the same call a second time · 3.4 the INSERT repeats the primary key · 6 Oracle raises DUP_VAL_ON_INDEX
// · 9.8 instead of crashing, execution jumps to EXCEPTION · 13.9 the handler sets a different message
// · 18.2 the caller gets a clear answer · 20.3 the table is unchanged
const ErrorsInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  /* The execution pointer: INSERT (line 1) → EXCEPTION (4) → WHEN (5) → message (6). */
  const ptrLine = interpolate(t, [3.4, 11.6, 12.4, 14.0, 14.5, 15.8, 16.3], [1, 1, 4, 4, 5, 5, 6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dup = prog(f, 4.4, 5.2);
  const caught = prog(f, 11.6, 12.4);
  const hl = (i: number) => {
    if (i === 1 || i === 2) return prog(f, 3.6, 4.1) * (1 - prog(f, 11.6, 12.1));
    if (i === 4) return prog(f, 12.2, 12.7) * (1 - prog(f, 14, 14.5));
    if (i === 5) return prog(f, 14.3, 14.8) * (1 - prog(f, 15.8, 16.3));
    if (i === 6) return prog(f, 16, 16.5);
    return 0;
  };
  return (
    <SceneShell style={style}>
      <Narration scene="errors" />
      <Heading name="Heading" premountFor={fps}>
        Handling the error
      </Heading>
      <SqlCode
        name="Second call"
        code="enrol_student('S03', 'C20', v_msg);   -- again"
        x={130}
        y={CY}
        width={1080}
        size={28}
        opacity={prog(f, 0.8, 1.4)}
        line={() => ({highlight: prog(f, 1.6, 2.1) * (1 - prog(f, 3.4, 3.9))})}
      />
      <SqlCode
        name="Procedure body"
        title="Inside enrol_student"
        code={BODY}
        x={130}
        y={BY}
        width={1080}
        size={SIZE}
        opacity={prog(f, 2, 2.6)}
        line={(i) => ({highlight: hl(i), tone: i === 1 || i === 2 ? 'orange' : 'teal', opacity: i === 3 ? 1 - 0.6 * prog(f, 12.2, 12.9) : 1})}
      />
      <Pointer name="Execution" x={70} y={codeLineY(BY, ptrLine, SIZE)} opacity={prog(f, 3.4, 3.9) * (1 - prog(f, 18.4, 19))} />
      <OraError
        name="Duplicate key"
        code="ORA-00001"
        message="unique constraint violated"
        x={130}
        y={770}
        width={1080}
        opacity={prog(f, 6.4, 7.1) * (1 - 0.6 * caught)}
      />
      <Chip tone="maroon" size={28} style={{left: 760, top: 778, opacity: prog(f, 7.2, 7.9) * (1 - caught)}}>
        DUP_VAL_ON_INDEX
      </Chip>
      <Chip tone="teal" size={28} style={{left: 760, top: 778, opacity: caught}}>
        caught, no crash
      </Chip>
      <OutputBox name="Message" label="v_msg" text="S03 was already enrolled in C20" x={130} y={880} width={1080} opacity={prog(f, 18.4, 19.1)} />
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={TB.x}
        y={TB.y}
        columns={ENROL_COLS}
        rows={cells(ENROL_ROWS)}
        style={{opacity: prog(f, 1.2, 2)}}
        cell={(r, c) => (r === NEW_ROW && c < 2 ? {bg: dup > 0 ? TONES.orange.soft : undefined, outline: dup * (1 - prog(f, 11.6, 12.2)) + prog(f, 20.4, 21)} : undefined)}
        header={(c) => ({outline: c < 2 ? dup * (1 - prog(f, 11.6, 12.2)) : 0})}
      />
      <Chip tone="neutral" size={30} style={{left: TB.x, top: gT.bottom(7) + 30, opacity: prog(f, 20.6, 21.3)}}>
        Unchanged: still 7 rows
      </Chip>
    </SceneShell>
  );
};

export const ErrorsScene = Interactive.withSchema({
  Component: ErrorsInner,
  componentName: '<ErrorsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
