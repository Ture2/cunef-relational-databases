import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {codeLineY, SqlCode} from '../../common/SqlCode';
import {Narration} from '../shared';

export const PROCEDURE = `CREATE OR REPLACE PROCEDURE enrol_student (
  p_student IN  VARCHAR2,
  p_course  IN  VARCHAR2,
  p_message OUT VARCHAR2
) IS
BEGIN
  INSERT INTO enrolment (student_id, course_id)
  VALUES (p_student, p_course);
  p_message := p_student || ' enrolled in ' || p_course;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    p_message := p_student || ' was already enrolled in ' || p_course;
END enrol_student;
/`;

const Y = 200;
const SIZE = 28;
const CX = 1290;
const win = (f: number, a: number, b: number) => prog(f, a, a + 0.5) * (1 - prog(f, b, b + 0.5));

// 0.8 a stored procedure, enrol student · 3.6 CREATE OR REPLACE stores it, compiled
// · 8.8 two IN parameters: student and course, read only · 14 the third, p_message, is OUT: written, handed back
// · 21.2 parameter types have no length · 23.5 the body inserts the enrolment · 25.5 then sets the message
const ProcedureInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const hl = (i: number) => {
    if (i === 0) return win(f, 3.6, 7.6);
    if (i === 1 || i === 2) return win(f, 9.6, 13.6);
    if (i === 3) return win(f, 14.4, 20);
    if (i === 6 || i === 7) return win(f, 23.5, 25.4);
    if (i === 8) return prog(f, 25.6, 26.1);
    return 0;
  };
  return (
    <SceneShell style={style}>
      <Narration scene="procedure" />
      <Heading name="Heading" premountFor={fps}>
        CREATE PROCEDURE
      </Heading>
      <SqlCode
        name="Procedure"
        code={PROCEDURE}
        x={100}
        y={Y}
        width={1150}
        size={SIZE}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({
          opacity: i >= 9 && i <= 11 ? 0.3 : prog(f, 0.8 + Math.min(i, 9) * 0.12, 1.3 + Math.min(i, 9) * 0.12),
          highlight: hl(i),
          tone: i === 3 ? 'maroon' : i === 1 || i === 2 ? 'blue' : 'orange',
        })}
      />
      <Chip tone="neutral" size={30} style={{left: CX, top: codeLineY(Y, 0, SIZE) - 30, opacity: prog(f, 4.6, 5.3)}}>
        Stored, compiled
      </Chip>
      <Chip tone="blue" size={30} style={{left: CX, top: codeLineY(Y, 2, SIZE) - 30, opacity: prog(f, 10.2, 10.9)}}>
        IN · read only
      </Chip>
      <Chip tone="maroon" size={30} style={{left: CX, top: codeLineY(Y, 3, SIZE) + 10, opacity: prog(f, 15.6, 16.3)}}>
        OUT · written, handed back
      </Chip>
      <Chip tone="neutral" size={30} style={{left: CX, top: codeLineY(Y, 6.5, SIZE) - 30, opacity: prog(f, 21.4, 22.1)}}>
        VARCHAR2, not VARCHAR2(40)
      </Chip>
      <Chip tone="orange" size={30} style={{left: CX, top: codeLineY(Y, 8, SIZE) + 10, opacity: prog(f, 23.6, 24.3)}}>
        INSERT, then the message
      </Chip>
    </SceneShell>
  );
};

export const ProcedureScene = Interactive.withSchema({
  Component: ProcedureInner,
  componentName: '<ProcedureScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
