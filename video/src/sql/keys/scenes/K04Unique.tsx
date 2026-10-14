import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {cells, STUDENT, STUDENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {OraError} from '../../common/ui';
import {Narration} from '../shared';

const ROWS = cells([...STUDENT, ['S04', 'Marta Paz', null]]);
const OK_INSERT = `INSERT INTO student VALUES ('S04', 'Marta Paz', NULL);`;
const NULL_INSERT = `INSERT INTO student VALUES (NULL, 'Pablo Ruiz', NULL);`;

// 0.8 email is UNIQUE, not the key: it may be NULL · 5 Eva has no email · 7.9 a second NULL is accepted
// · 10.2 NULL is never a duplicate · 15.5 a primary key is never NULL · 17.6 insert without an id: ORA-01400
const UniqueInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const eva = prog(f, 5.2, 5.8);
  const marta = prog(f, 9.6, 10.2);
  const pkNull = prog(f, 15.6, 16.2);
  return (
    <SceneShell style={style}>
      <Narration scene="unique" />
      <Heading name="Heading" premountFor={fps}>
        UNIQUE and NULL
      </Heading>
      <DataTable
        name="Student"
        title="student"
        x={100}
        y={290}
        columns={STUDENT_COLS}
        rows={ROWS}
        style={{opacity: prog(f, 0.8, 1.6)}}
        rowOpacity={(r) => (r === 3 ? prog(f, 9.4, 10) : 1)}
        header={(c) => ({outline: c === 2 ? prog(f, 1, 1.6) * (1 - prog(f, 14.6, 15.2)) : c === 0 ? pkNull : 0})}
        cell={(r, c) => {
          if (c === 2 && r === 2 && eva > 0) return {bg: TONES.blue.soft, outline: eva};
          if (c === 2 && r === 3 && marta > 0) return {bg: TONES.blue.soft, outline: marta};
          return undefined;
        }}
      />
      <SqlCode name="Second NULL e-mail" code={OK_INSERT} x={780} y={260} width={1000} size={28} opacity={prog(f, 7.9, 8.5)} />
      <Chip tone="teal" size={30} style={{left: 780, top: 380, opacity: prog(f, 9.4, 10)}}>
        1 row inserted
      </Chip>
      <Chip tone="blue" size={32} style={{left: 100, top: 650, opacity: prog(f, 11, 11.6)}}>
        UNIQUE: NULL is never a duplicate
      </Chip>
      <SqlCode name="NULL key" code={NULL_INSERT} x={780} y={560} width={1000} size={28} opacity={prog(f, 17.6, 18.2)} />
      <OraError
        name="ORA-01400"
        code="ORA-01400"
        message={'cannot insert NULL into ("STUDENT"."STUDENT_ID")'}
        x={780}
        y={690}
        width={1000}
        size={26}
        opacity={prog(f, 20, 20.6)}
      />
      <Chip tone="orange" size={32} style={{left: 100, top: 760, opacity: prog(f, 15.8, 16.4)}}>
        PRIMARY KEY: never NULL
      </Chip>
    </SceneShell>
  );
};

export const UniqueScene = Interactive.withSchema({
  Component: UniqueInner,
  componentName: '<UniqueScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
