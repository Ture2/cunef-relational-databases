import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {cells, STUDENT, STUDENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {Narration, Op} from '../shared';

const CODE = `CREATE TABLE student (
  student_id VARCHAR2(3)  PRIMARY KEY,
  name       VARCHAR2(40) NOT NULL,
  email      VARCHAR2(40) UNIQUE
);`;

const EQ_Y = 580;

// 0.8 a primary key identifies each row · 4.5 in student, the student id · 8.2 two rules:
// 9.6 unique · 11.3 never NULL · 14 many unique columns, but one primary key · 18.6 an index
const PrimaryKeyInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const idCol = prog(f, 4.8, 5.4) * (1 - prog(f, 13.6, 14.2));
  const unique = prog(f, 9.8, 10.4);
  const notNull = prog(f, 11.5, 12.1);
  return (
    <SceneShell style={style}>
      <Narration scene="pk" />
      <Heading name="Heading" premountFor={fps}>
        PRIMARY KEY
      </Heading>
      <SqlCode
        name="Create student"
        code={CODE}
        x={100}
        y={220}
        width={820}
        line={(i) => ({
          opacity: prog(f, 0.8 + i * 0.3, 1.3 + i * 0.3),
          highlight: i === 1 ? prog(f, 4.6, 5.2) * (1 - prog(f, 14, 14.6)) : i === 3 ? prog(f, 14.6, 15.2) : 0,
          tone: i === 3 ? 'blue' : 'orange',
        })}
      />
      <DataTable
        name="Student"
        title="student"
        x={1180}
        y={300}
        columns={STUDENT_COLS}
        rows={cells(STUDENT)}
        style={{opacity: prog(f, 1.6, 2.4)}}
        header={(c) => ({pk: c === 0 ? prog(f, 5, 5.8) : 0, outline: c === 2 ? prog(f, 14.8, 15.4) * (1 - prog(f, 17.8, 18.4)) : 0})}
        cell={(_r, c) => (c === 0 && idCol > 0 ? {bg: TONES.orange.soft, outline: Math.max(unique, notNull) * idCol} : undefined)}
      />
      <Interactive.Div name="Equation" style={{position: 'absolute', left: 100, top: EQ_Y, display: 'flex', alignItems: 'center', gap: 26}}>
        <Chip tone="orange" size={40} style={{position: 'relative', opacity: prog(f, 8.2, 8.8)}}>
          PRIMARY KEY
        </Chip>
        <Op opacity={prog(f, 8.6, 9.2)}>=</Op>
        <Chip tone="blue" size={40} style={{position: 'relative', opacity: unique}}>
          UNIQUE
        </Chip>
        <Op opacity={prog(f, 11.1, 11.6)}>+</Op>
        <Chip tone="teal" size={40} style={{position: 'relative', opacity: notNull}}>
          NOT NULL
        </Chip>
      </Interactive.Div>
      <Chip tone="neutral" size={34} style={{left: 1180, top: 600, opacity: prog(f, 12, 12.6)}}>
        S01, S02, S03: no repeats, no NULL
      </Chip>
      <Chip tone="maroon" size={36} style={{left: 100, top: 740, opacity: prog(f, 16.4, 17)}}>
        Many UNIQUE columns · one PRIMARY KEY per table
      </Chip>
      <Chip tone="neutral" size={36} style={{left: 100, top: 860, opacity: prog(f, 18.8, 19.4)}}>
        Oracle builds an index on it: duplicates are found fast
      </Chip>
    </SceneShell>
  );
};

export const PrimaryKeyScene = Interactive.withSchema({
  Component: PrimaryKeyInner,
  componentName: '<PrimaryKeyScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
