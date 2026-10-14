import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, TONES} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {GRADE_COLS, gradeRows, Mono, Narration, Output} from '../shared';

const CODE = `BEGIN
  UPDATE enrolment SET grade = LEAST(grade + 0.25, 10)
  WHERE course_id = 'C11';
  DBMS_OUTPUT.PUT_LINE(SQL%ROWCOUNT || ' Python grade(s) raised');
END;`;

const DML = ['INSERT', 'UPDATE', 'DELETE'];
const PYTHON = 3;

// 0.8 cursors without knowing it · 4.3 an implicit cursor for every INSERT, UPDATE or DELETE
// · 9.6 after this update SQL%ROWCOUNT says how many rows changed: just one · 17.2 SQL%FOUND
const ImplicitInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const upd = prog(f, 10, 10.6);
  return (
    <SceneShell style={style}>
      <Narration scene="implicit" />
      <Heading name="Heading" premountFor={fps}>
        Implicit cursors
      </Heading>
      {DML.map((d, i) => (
        <Chip key={d} tone="blue" size={30} style={{left: 100 + i * 200, top: 220, opacity: prog(f, 5.6 + i * 0.4, 6.2 + i * 0.4)}}>
          {d}
        </Chip>
      ))}
      <Chip tone="teal" size={30} style={{left: 720, top: 220, opacity: prog(f, 7, 7.6)}}>
        <span>
          → an implicit cursor named <Mono size={30}>SQL</Mono>
        </span>
      </Chip>
      <SqlCode
        name="Update block"
        code={CODE}
        x={100}
        y={340}
        width={1060}
        size={26}
        opacity={prog(f, 8.6, 9.4)}
        line={(i) => ({highlight: i === 3 ? prog(f, 10.8, 11.4) : i === 1 || i === 2 ? prog(f, 9.8, 10.4) * (1 - prog(f, 10.8, 11.4)) : 0})}
      />
      <Output name="Output" lines={['1 Python grade(s) raised']} x={100} y={640} width={640} opacity={prog(f, 14.2, 14.8)} />
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={1280}
        y={400}
        columns={GRADE_COLS}
        rows={gradeRows()}
        style={{opacity: prog(f, 1.2, 2)}}
        cell={(r, c) =>
          r === PYTHON && upd > 0 ? {bg: TONES.orange.soft, outline: upd, content: c === 2 ? <b style={{color: TONES.orange.strong}}>7.75</b> : undefined} : undefined
        }
      />
      <Chip tone="orange" size={32} style={{left: 100, top: 830, opacity: prog(f, 14.4, 15)}}>
        <span>
          <Mono size={32}>SQL%ROWCOUNT</Mono> = 1
        </span>
      </Chip>
      <Chip tone="neutral" size={32} style={{left: 560, top: 830, opacity: prog(f, 17.6, 18.2)}}>
        <span>
          <Mono size={32} color={C.ink}>
            SQL%FOUND
          </Mono>{' '}
          = TRUE
        </span>
      </Chip>
    </SceneShell>
  );
};

export const ImplicitScene = Interactive.withSchema({
  Component: ImplicitInner,
  componentName: '<ImplicitScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
