import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES, type Tone} from '../../../theme';
import {ENROLMENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {OraError} from '../../common/ui';
import {Narration} from '../shared';

const CODE = `CREATE OR REPLACE TRIGGER trg_grade_check
BEFORE INSERT OR UPDATE OF grade ON enrolment
FOR EACH ROW
BEGIN
  IF :NEW.grade > 10 THEN
    RAISE_APPLICATION_ERROR(-20010, 'A grade cannot be above 10');
  END IF;
  :NEW.grade := ROUND(:NEW.grade, 1);  -- keep one decimal
END;`;

const stmt = (grade: string) => `UPDATE enrolment
SET grade = ${grade}
WHERE student_id = 'S01'
  AND course_id = 'C10';`;

const RX = 1220;

/* Highlight windows of the trigger's lines: [line, from, to, tone]. */
const HL: readonly (readonly [number, number, number, Tone])[] = [
  [1, 1.6, 5.6, 'orange'],
  [2, 1.6, 5.6, 'orange'],
  [4, 7.2, 11, 'orange'],
  [4, 14, 19.6, 'orange'],
  [5, 14.6, 19.6, 'orange'],
  [4, 22.8, 31, 'teal'],
  [7, 24.4, 31, 'teal'],
];

// 0.8 a BEFORE row trigger · 5.8 it sees the new value as :NEW.grade · 11.8 set a grade of 11
// · 14 RAISE_APPLICATION_ERROR · 16.5 the update is rejected · 20.4 7.46 instead · 22.7 passes the check
// · 24.1 rounds to one decimal · 26.6 7.5 is stored
const BeforeInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const first = prog(f, 11.8, 12.4) * (1 - prog(f, 19.8, 20.4));
  const second = prog(f, 20.4, 21);
  const rejected = prog(f, 16.8, 17.4) * (1 - prog(f, 19.8, 20.4));
  const stored = prog(f, 26.8, 27.4);
  return (
    <SceneShell style={style}>
      <Narration scene="before" />
      <Heading name="Heading" premountFor={fps}>
        BEFORE row trigger
      </Heading>
      <SqlCode
        name="trg_grade_check"
        code={CODE}
        x={80}
        y={200}
        width={1080}
        size={26}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => {
          const w = HL.filter(([l, a]) => l === i && f >= a * fps).pop();
          return {
            opacity: prog(f, 0.8 + i * 0.25, 1.3 + i * 0.25),
            highlight: w ? prog(f, w[1], w[1] + 0.5) * (1 - prog(f, w[2] - 0.5, w[2])) : 0,
            tone: w?.[3],
          };
        }}
      />
      <SqlCode name="UPDATE to 11" code={stmt('11')} x={RX} y={200} width={620} size={28} opacity={first} />
      <SqlCode name="UPDATE to 7.46" code={stmt('7.46')} x={RX} y={200} width={620} size={28} opacity={second} />
      <Chip tone="maroon" size={32} style={{left: RX, top: 460, opacity: prog(f, 13, 13.6) * (1 - prog(f, 19.8, 20.4))}}>
        :NEW.grade = 11
      </Chip>
      <Chip tone="maroon" size={32} style={{left: RX, top: 460, opacity: prog(f, 21.6, 22.2)}}>
        :NEW.grade = {f < 25 * fps ? '7.46' : '7.5'}
      </Chip>
      <OraError
        name="ORA-20010"
        code="ORA-20010"
        message="A grade cannot be above 10"
        x={80}
        y={650}
        width={1080}
        opacity={prog(f, 15.2, 15.8) * (1 - prog(f, 19.8, 20.4))}
      />
      <DataTable
        name="Enrolment row"
        title="enrolment"
        x={RX}
        y={680}
        columns={ENROLMENT_COLS}
        rows={[['S01', 'C10', '8.5']]}
        style={{opacity: prog(f, 3.4, 4)}}
        cell={(_, c) =>
          c === 2 && stored > 0
            ? {content: stored > 0.5 ? '7.5' : '8.5', bg: TONES.teal.soft, outline: stored}
            : c === 2 && rejected > 0
              ? {bg: TONES.orange.soft, outline: rejected}
              : undefined
        }
      />
      <Chip tone="orange" size={30} style={{left: RX, top: 850, opacity: rejected}}>
        Rejected: still 8.5
      </Chip>
      <Chip tone="teal" size={30} style={{left: RX, top: 850, opacity: prog(f, 27.2, 27.8)}}>
        Stored: 7.5
      </Chip>
    </SceneShell>
  );
};

export const BeforeScene = Interactive.withSchema({
  Component: BeforeInner,
  componentName: '<BeforeScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
