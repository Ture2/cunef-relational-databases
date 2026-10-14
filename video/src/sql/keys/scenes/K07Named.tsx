import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {SqlCode} from '../../common/SqlCode';
import {Narration} from '../shared';

const CREATE = `CREATE TABLE enrolment (
  student_id VARCHAR2(3),
  course_id  VARCHAR2(3),
  grade      NUMBER(4,2),
  CONSTRAINT pk_enrolment PRIMARY KEY (student_id, course_id),
  CONSTRAINT fk_enrolment_student FOREIGN KEY (student_id)
    REFERENCES student (student_id) ON DELETE CASCADE,
  CONSTRAINT ck_enrolment_grade CHECK (grade BETWEEN 0 AND 10)
);`;
const ADD = `ALTER TABLE enrolment ADD CONSTRAINT fk_enrolment_course
  FOREIGN KEY (course_id) REFERENCES course (course_id);`;

/* The CONSTRAINT lines of CREATE (line -> order of its highlight); line 6 continues the FK of line 5. */
const NAMED: Record<number, number> = {4: 0, 5: 1, 6: 1, 7: 2};

// 0.8 name your constraints with CONSTRAINT · 4 otherwise Oracle makes up SYS_C… · 9 ALTER TABLE …
// ADD CONSTRAINT on an existing table · 14.8 the existing rows are checked first · 19.1 course id must exist
const NamedInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const named = (i: number) => {
    const j = NAMED[i];
    return j === undefined ? 0 : prog(f, 1.8 + j * 0.5, 2.3 + j * 0.5) * (1 - prog(f, 8.8, 9.4));
  };
  return (
    <SceneShell style={style}>
      <Narration scene="named" />
      <Heading name="Heading" premountFor={fps}>
        Named constraints
      </Heading>
      <SqlCode
        name="Create with names"
        code={CREATE}
        x={100}
        y={210}
        width={1000}
        size={26}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({highlight: named(i)})}
      />
      <SqlCode
        name="Add constraint"
        code={ADD}
        x={100}
        y={680}
        width={1000}
        size={26}
        opacity={prog(f, 9.2, 9.8)}
        line={(i) => ({highlight: i === 0 ? prog(f, 12.2, 12.8) * (1 - prog(f, 18.8, 19.2)) : prog(f, 19.4, 20)})}
      />
      <Chip tone="teal" size={30} style={{left: 1180, top: 260, opacity: prog(f, 2, 2.6)}}>
        Named: pk_enrolment
      </Chip>
      <Chip tone="neutral" size={30} style={{left: 1180, top: 360, opacity: prog(f, 5.2, 5.8)}}>
        Unnamed: SYS_C008123
      </Chip>
      <Chip tone="yellow" size={30} style={{left: 1180, top: 700, opacity: prog(f, 15, 15.6)}}>
        The existing rows are checked first
      </Chip>
      <Chip tone="orange" size={30} style={{left: 1180, top: 800, opacity: prog(f, 19.6, 20.2)}}>
        Every course_id must exist in course
      </Chip>
    </SceneShell>
  );
};

export const NamedScene = Interactive.withSchema({
  Component: NamedInner,
  componentName: '<NamedScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
