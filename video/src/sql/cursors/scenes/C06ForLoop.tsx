import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {SqlCode} from '../../common/SqlCode';
import {Narration} from '../shared';

const DECL = `DECLARE
  CURSOR c_list IS
    SELECT student_id, course_id, grade FROM enrolment ORDER BY course_id, student_id;`;

const EXPLICIT = `  r c_list%ROWTYPE;
BEGIN
  OPEN c_list;
  LOOP
    FETCH c_list INTO r;
    EXIT WHEN c_list%NOTFOUND;
    DBMS_OUTPUT.PUT_LINE(r.student_id || ': ' || r.grade);
  END LOOP;
  CLOSE c_list;
END;`;

const FOR_LOOP = `BEGIN
  FOR r IN c_list LOOP
    DBMS_OUTPUT.PUT_LINE(r.student_id || ': ' || r.grade);
  END LOOP;
END;`;

/* Lines of EXPLICIT the FOR loop writes for you: OPEN, FETCH, EXIT, CLOSE (when the voice names each), and r. */
const AUTO: Record<number, number> = {2: 1.2, 4: 1.7, 5: 2.1, 8: 2.6};

// 0.8 OPEN, FETCH, EXIT and CLOSE every time is tedious · 4.9 the cursor FOR loop does all four
// · 10 r is declared automatically · 12.2 stops after the last row · 14.7 always closed, even after an error
const ForLoopInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dim = prog(f, 5.4, 6.2);
  return (
    <SceneShell style={style}>
      <Narration scene="forloop" />
      <Heading name="Heading" premountFor={fps}>
        The cursor FOR loop
      </Heading>
      <SqlCode name="Declaration" code={DECL} x={80} y={205} width={1240} size={24} opacity={prog(f, 0.4, 1)} />
      <SqlCode
        name="Explicit loop"
        code={EXPLICIT}
        title="By hand"
        x={80}
        y={470}
        width={840}
        size={24}
        opacity={prog(f, 0.6, 1.2)}
        line={(i) => {
          const at = AUTO[i];
          if (at !== undefined) return {highlight: prog(f, at, at + 0.4), opacity: 1 - 0.3 * dim};
          if (i === 0) return {highlight: prog(f, 10, 10.5), opacity: 1 - 0.3 * dim};
          return {opacity: 1 - 0.5 * dim};
        }}
      />
      <SqlCode
        name="Cursor FOR loop"
        code={FOR_LOOP}
        title="Cursor FOR loop"
        x={1000}
        y={470}
        width={840}
        size={24}
        opacity={prog(f, 4.9, 5.6)}
        line={(i) => ({highlight: i === 1 ? prog(f, 5.6, 6.2) : 0})}
      />
      <Chip tone="teal" size={28} style={{left: 1000, top: 740, opacity: prog(f, 6.2, 6.8)}}>
        OPEN, FETCH, EXIT, CLOSE: automatic
      </Chip>
      <Chip tone="maroon" size={28} style={{left: 1000, top: 820, opacity: prog(f, 10.4, 11)}}>
        r is declared for you
      </Chip>
      <Chip tone="orange" size={28} style={{left: 1000, top: 900, opacity: prog(f, 15, 15.6)}}>
        Always closed, even after an error
      </Chip>
    </SceneShell>
  );
};

export const ForLoopScene = Interactive.withSchema({
  Component: ForLoopInner,
  componentName: '<ForLoopScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
