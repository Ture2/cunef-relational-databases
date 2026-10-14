import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, TONES, type Tone} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {Narration, TypeRow} from '../shared';

const CODE = `SELECT constraint_name, constraint_type, status
FROM user_constraints
WHERE table_name = 'ENROLMENT';
ALTER TABLE enrolment DISABLE CONSTRAINT fk_enrolment_course;
ALTER TABLE enrolment ENABLE CONSTRAINT fk_enrolment_course;
ALTER TABLE enrolment DROP CONSTRAINT fk_enrolment_course;`;

const COLS: Column[] = [
  {key: 'name', label: 'constraint_name', width: 400, tone: 'maroon'},
  {key: 'type', label: 'constraint_type', width: 260, tone: 'maroon'},
  {key: 'status', label: 'status', width: 200, tone: 'maroon'},
];
const ROWS = [
  ['PK_ENROLMENT', 'P', 'ENABLED'],
  ['FK_ENROLMENT_STUDENT', 'R', 'ENABLED'],
  ['CK_ENROLMENT_GRADE', 'C', 'ENABLED'],
  ['FK_ENROLMENT_COURSE', 'R', 'ENABLED'],
];
const COURSE_FK = 3;

/* The legend: letter, meaning, tone, when it appears (and is outlined), and the result rows of that type. */
const TYPES: readonly {readonly letter: string; readonly text: string; readonly tone: Tone; readonly at: number; readonly rows: readonly number[]}[] = [
  {letter: 'P', text: 'primary key', tone: 'orange', at: 5.6, rows: [0]},
  {letter: 'R', text: 'foreign key (reference)', tone: 'maroon', at: 6.7, rows: [1, 3]},
  {letter: 'U', text: 'unique', tone: 'blue', at: 7.8, rows: []},
  {letter: 'C', text: 'check, NOT NULL included', tone: 'teal', at: 8.8, rows: [2]},
];

// 0.8 USER_CONSTRAINTS lists them · 5.6 P · 6.7 R · 7.8 U · 8.8 C, including NOT NULL
// · 12.4 DISABLE CONSTRAINT: status DISABLED · 19.5 ENABLE checks every row · 22.8 DROP CONSTRAINT
const ManageInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const on = (t: {readonly at: number}) => prog(f, t.at, t.at + 0.5) * (1 - prog(f, t.at + 1, t.at + 1.4));
  const disabled = prog(f, 16.4, 16.8) * (1 - prog(f, 20, 20.4));
  const dropped = prog(f, 23.6, 24.4);
  const lineAt = [0.8, 0.8, 0.8, 12.4, 19.5, 22.8];
  return (
    <SceneShell style={style}>
      <Narration scene="manage" />
      <Heading name="Heading" premountFor={fps}>
        Managing constraints
      </Heading>
      <SqlCode
        name="Dictionary and ALTER"
        code={CODE}
        x={100}
        y={210}
        width={980}
        size={26}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => {
          const at = lineAt[i];
          const next = i >= 3 && i < 5 ? lineAt[i + 1] : 99;
          return {opacity: prog(f, at + (i < 3 ? i * 0.3 : 0), at + 0.5 + (i < 3 ? i * 0.3 : 0)), highlight: i >= 3 ? prog(f, at, at + 0.5) * (1 - prog(f, next - 0.2, next + 0.2)) : 0};
        }}
      />
      <DataTable
        name="user_constraints"
        title="user_constraints"
        x={100}
        y={590}
        columns={COLS}
        rows={ROWS}
        style={{opacity: prog(f, 2, 2.8)}}
        rowOpacity={(r) => (r === COURSE_FK ? 1 - 0.75 * prog(f, 24.6, 25.4) : 1)}
        cell={(r, c) => {
          const type = TYPES.filter((t) => t.rows.indexOf(r) >= 0)[0];
          const typeHl = type && c === 1 ? on(type) : 0;
          if (r === COURSE_FK && c === 2 && disabled > 0)
            return {content: disabled > 0.5 ? 'DISABLED' : 'ENABLED', bg: TONES.orange.soft, outline: disabled, color: disabled > 0.5 ? TONES.orange.strong : C.ink, strike: dropped};
          if (r === COURSE_FK && dropped > 0) return {strike: dropped};
          if (typeHl > 0) return {bg: TONES[type.tone].soft, outline: typeHl};
          return undefined;
        }}
      />
      {TYPES.map((t, i) => (
        <TypeRow key={t.letter} name={`Type ${t.letter}`} letter={t.letter} tone={t.tone} x={1120} y={590 + i * 90} opacity={prog(f, t.at - 0.2, t.at + 0.4)} outline={on(t)}>
          {t.text}
        </TypeRow>
      ))}
      <Chip tone="orange" size={30} style={{left: 1120, top: 250, opacity: prog(f, 14.6, 15.2) * (1 - prog(f, 19.3, 19.7))}}>
        Off for a while: a bulk load
      </Chip>
      <Chip tone="teal" size={30} style={{left: 1120, top: 250, opacity: prog(f, 20.6, 21.2)}}>
        ENABLE checks every row
      </Chip>
      <Chip tone="neutral" size={30} style={{left: 1120, top: 350, opacity: prog(f, 24, 24.6)}}>
        DROP: gone for good
      </Chip>
    </SceneShell>
  );
};

export const ManageScene = Interactive.withSchema({
  Component: ManageInner,
  componentName: '<ManageScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
