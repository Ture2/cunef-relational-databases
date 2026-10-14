import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {OraError} from '../../common/ui';
import {Narration} from '../shared';

const CODE = `CREATE TABLE enrolment (
  student_id VARCHAR2(3),
  course_id  VARCHAR2(3),
  grade      NUMBER(4,2),
  PRIMARY KEY (student_id, course_id)
);`;
const INSERT = `INSERT INTO enrolment VALUES ('S01', 'C10', 9.0);`;

// 0.8 two columns identify a row · 5 a composite primary key · 8.4 each id repeats:
// 10.2 S01 twice · 11.6 C10 three times · 13.4 each pair only once · 16.9 Ana in Databases again: ORA-00001
const CompositeInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const repeats = 1 - prog(f, 13.2, 13.8);
  const s01 = prog(f, 10.2, 10.8) * repeats;
  const c10 = prog(f, 11.6, 12.2) * repeats;
  const pairs = (r: number) => prog(f, 13.6 + r * 0.3, 14 + r * 0.3) * (1 - prog(f, 16.6, 17.2));
  const pulse = (r: number) => prog(f, 13.6 + r * 0.3, 13.9 + r * 0.3) * (1 - prog(f, 14.3 + r * 0.3, 14.6 + r * 0.3));
  const clash = prog(f, 19, 19.6);
  return (
    <SceneShell style={style}>
      <Narration scene="composite" />
      <Heading name="Heading" premountFor={fps}>
        Composite primary key
      </Heading>
      <SqlCode
        name="Create enrolment"
        code={CODE}
        x={100}
        y={220}
        width={820}
        line={(i) => ({
          opacity: prog(f, 0.8 + i * 0.3, 1.3 + i * 0.3),
          highlight: i === 4 ? prog(f, 5, 5.6) : 0,
        })}
      />
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={1220}
        y={300}
        columns={ENROLMENT_COLS}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 1.6, 2.4)}}
        header={(c) => ({pk: c < 2 ? prog(f, 5.4 + c * 0.4, 6.2 + c * 0.4) : 0, fk: 0})}
        cell={(r, c) => {
          if (c === 0 && r < 2 && s01 > 0) return {bg: TONES.blue.soft, outline: s01};
          if (c === 1 && r % 2 === 0 && c10 > 0) return {bg: TONES.orange.soft, outline: c10};
          if (c < 2 && pairs(r) > 0) return {bg: TONES.yellow.soft, outline: pulse(r)};
          if (r === 0 && c < 2 && clash > 0) return {bg: TONES.orange.soft, outline: clash};
          return undefined;
        }}
      />
      <Chip tone="blue" size={30} style={{left: 1200, top: 740, opacity: s01}}>
        S01 × 2
      </Chip>
      <Chip tone="orange" size={30} style={{left: 1400, top: 740, opacity: c10}}>
        C10 × 3
      </Chip>
      <Chip tone="yellow" size={30} style={{left: 1200, top: 740, opacity: prog(f, 14, 14.6)}}>
        Each (student_id, course_id) pair: once
      </Chip>
      <SqlCode name="Duplicate pair" code={INSERT} x={100} y={640} width={940} opacity={prog(f, 17, 17.6)} />
      <OraError name="ORA-00001" code="ORA-00001" message="unique constraint violated" x={100} y={780} width={940} opacity={prog(f, 19.8, 20.4)} />
    </SceneShell>
  );
};

export const CompositeScene = Interactive.withSchema({
  Component: CompositeInner,
  componentName: '<CompositeScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
