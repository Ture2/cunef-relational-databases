import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES, type Tone} from '../../../theme';
import {ENROLMENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {changed, Narration} from '../shared';

const CODE = `CREATE OR REPLACE TRIGGER trg_grade_audit
AFTER UPDATE OF grade ON enrolment
FOR EACH ROW
WHEN (NEW.grade <> OLD.grade
      OR (OLD.grade IS NULL AND NEW.grade IS NOT NULL))
BEGIN
  INSERT INTO grade_audit (student_id, course_id, old_grade, new_grade)
  VALUES (:OLD.student_id, :OLD.course_id, :OLD.grade, :NEW.grade);
END;`;

const RAISE = `UPDATE enrolment
SET grade = grade + 0.5
WHERE course_id = 'C10';`;

const AGAIN = `UPDATE enrolment
SET grade = 9
WHERE student_id = 'S01'
  AND course_id = 'C10';`;

/* The C10 enrolments before and after the raise. */
const ROWS = [
  ['S01', 'C10', '8.5', '9.0'],
  ['S02', 'C10', '6.5', '7.0'],
  ['S03', 'C10', '5.0', '5.5'],
] as const;

const AUDIT_COLS: Column[] = [
  {key: 'student_id', label: 'student_id', width: 170, tone: 'blue'},
  {key: 'course_id', label: 'course_id', width: 160, tone: 'orange'},
  {key: 'old_grade', label: 'old_grade', width: 172, tone: 'maroon'},
  {key: 'new_grade', label: 'new_grade', width: 178, tone: 'maroon'},
];

const Y = 680;
const CHANGE_AT = 21.8;
const AUDIT_AT = 23.0;

/* Highlight windows of the trigger's lines: [line, from, to, tone]. */
const HL: readonly (readonly [number, number, number, Tone])[] = [
  [1, 1.4, 7.6, 'orange'],
  [2, 8.8, 10.6, 'orange'],
  [6, 10.2, 18.4, 'orange'],
  [7, 12.6, 18.4, 'orange'],
  [3, 26.2, 36, 'teal'],
  [4, 26.2, 36, 'teal'],
];

// 0.8 an AFTER trigger: the place for an audit trail · 8.8 for each row, a line in grade_audit with
// :OLD.grade and :NEW.grade · 18.8 raise every C10 grade by 0.5: three rows, three audit lines
// · 26 WHEN skips rows whose grade does not change · 29.8 Ana's grade to 9 again writes nothing
const AuditInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const skip = prog(f, 30.8, 31.4);
  return (
    <SceneShell style={style}>
      <Narration scene="audit" />
      <Heading name="Heading" premountFor={fps}>
        AFTER row trigger: an audit trail
      </Heading>
      <SqlCode
        name="trg_grade_audit"
        code={CODE}
        x={80}
        y={200}
        width={1040}
        size={24}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => {
          const w = HL.filter(([l, a]) => l === i && f >= a * fps).pop();
          return {
            opacity: prog(f, 0.8 + i * 0.2, 1.3 + i * 0.2),
            highlight: w ? prog(f, w[1], w[1] + 0.5) * (1 - prog(f, w[2] - 0.5, w[2])) : 0,
            tone: w?.[3],
          };
        }}
      />
      <SqlCode name="Raise C10" code={RAISE} x={1170} y={200} width={670} size={28} opacity={prog(f, 18.8, 19.4) * (1 - prog(f, 29.2, 29.8))} />
      <SqlCode name="Set S01 to 9" code={AGAIN} x={1170} y={200} width={670} size={28} opacity={prog(f, 29.8, 30.4)} />
      <DataTable
        name="Enrolment C10"
        title="enrolment (C10)"
        x={80}
        y={Y}
        columns={ENROLMENT_COLS}
        rows={ROWS.map((r) => [r[0], r[1], r[2]])}
        style={{opacity: prog(f, 3, 3.6)}}
        cell={(r, c) => {
          if (c !== 2) return undefined;
          if (r === 0 && skip > 0) return {content: '9.0', bg: TONES.teal.soft, outline: skip};
          const t = prog(f, CHANGE_AT + r * 0.4, CHANGE_AT + r * 0.4 + 0.6) * (1 - prog(f, 28.8, 29.4));
          return f >= (CHANGE_AT + r * 0.4) * fps ? {...changed(ROWS[r][2], ROWS[r][3], 1), outline: t, bg: t > 0.05 ? TONES.orange.soft : undefined} : undefined;
        }}
      />
      <DataTable
        name="grade_audit"
        title="grade_audit"
        x={650}
        y={Y}
        columns={AUDIT_COLS}
        rows={ROWS.map((r) => [r[0], r[1], r[2], r[3]])}
        style={{opacity: prog(f, 5.4, 6)}}
        header={(c) => ({outline: c === 2 ? prog(f, 12.8, 13.4) * (1 - prog(f, 17.6, 18.2)) : c === 3 ? prog(f, 15, 15.6) * (1 - prog(f, 17.6, 18.2)) : 0})}
        rowOpacity={(r) => prog(f, AUDIT_AT + r * 0.4, AUDIT_AT + r * 0.4 + 0.5)}
        cell={() => {
          const t = prog(f, AUDIT_AT, AUDIT_AT + 0.5) * (1 - prog(f, 28.8, 29.4));
          return t > 0 ? {bg: TONES.maroon.soft} : undefined;
        }}
      />
      <Chip tone="orange" size={28} style={{left: 1380, top: 700, opacity: prog(f, 24, 24.6)}}>
        3 rows → 3 audit lines
      </Chip>
      <Chip tone="teal" size={28} style={{left: 1380, top: 800, opacity: prog(f, 31.4, 32)}}>
        9.0 → 9.0: WHEN is false
      </Chip>
      <Chip tone="neutral" size={28} style={{left: 1380, top: 885, opacity: prog(f, 32, 32.6)}}>
        No audit line
      </Chip>
    </SceneShell>
  );
};

export const AuditScene = Interactive.withSchema({
  Component: AuditInner,
  componentName: '<AuditScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
