import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {SqlCode} from '../../common/SqlCode';
import {InfoCard, OraError} from '../../common/ui';
import {Narration} from '../shared';

/* A row trigger that reads its own table: every UPDATE of grade fails with ORA-04091. */
const BAD = `CREATE OR REPLACE TRIGGER trg_grade_avg
AFTER UPDATE OF grade ON enrolment
FOR EACH ROW
DECLARE
  v_avg NUMBER;
BEGIN
  SELECT AVG(grade) INTO v_avg FROM enrolment;
END;`;

const CHECK = `ALTER TABLE enrolment ADD CONSTRAINT ck_grade
  CHECK (grade BETWEEN 0 AND 10);`;

const RX = 1040;
const RW = 800;

// 0.8 two warnings · 2 a row trigger cannot query its own table · 5.6 ORA-04091 table is mutating
// · 11.8 triggers are invisible · 13.6 another developer wonders where the changes came from
// · 19.8 keep them small · 21.2 use a check constraint when it can do the job
const PitfallsInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <Narration scene="pitfalls" />
      <Heading name="Heading" premountFor={fps}>
        Pitfalls
      </Heading>
      <SqlCode
        name="Trigger that reads its own table"
        code={BAD}
        x={80}
        y={200}
        width={880}
        size={26}
        opacity={prog(f, 1.8, 2.4)}
        line={(i) => ({
          opacity: prog(f, 1.8 + i * 0.2, 2.3 + i * 0.2),
          highlight: i === 2 ? prog(f, 3.2, 3.7) : i === 6 ? prog(f, 4, 4.5) : 0,
        })}
      />
      <OraError
        name="ORA-04091"
        code="ORA-04091"
        message="table SCHOOL.ENROLMENT is mutating, trigger/function may not see it"
        x={80}
        y={600}
        width={880}
        size={26}
        opacity={prog(f, 6, 6.6)}
      />
      <InfoCard name="Hidden logic" title="Hidden logic" x={RX} y={220} width={RW} height={270} tone="maroon" opacity={prog(f, 12, 12.6)} size={32}>
        One UPDATE also checks, rounds, writes grade_audit and prints a notice. None of it is in the statement.
      </InfoCard>
      <Chip tone="teal" size={36} style={{left: 80, top: 790, opacity: prog(f, 20, 20.6)}}>
        Keep triggers small
      </Chip>
      <InfoCard name="Prefer a constraint" title="Prefer a constraint" x={RX} y={540} width={RW} height={360} tone="teal" opacity={prog(f, 21.4, 22)} size={32}>
        The grade limit needs no trigger:
      </InfoCard>
      <SqlCode name="CHECK constraint" code={CHECK} x={RX + 30} y={700} width={RW - 60} size={24} opacity={prog(f, 22.2, 22.8)} />
    </SceneShell>
  );
};

export const PitfallsScene = Interactive.withSchema({
  Component: PitfallsInner,
  componentName: '<PitfallsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
