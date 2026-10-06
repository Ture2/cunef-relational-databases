import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../anim';
import {DataTable} from '../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../components/Shell';
import {Caption, COLS, FACTS, Narration} from '../shared';

const TABLE_COLS = COLS.map((c) => ({...c, width: 260}));

// 0.8 one table, a FK to each entity · 8 the PK: the ends with max N, student and course
const TablesInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pk = prog(f, 11, 12);
  return (
    <SceneShell style={style}>
      <Narration scene="tables" />
      <Heading name="Heading" premountFor={fps}>
        To tables
      </Heading>
      <DataTable
        name="Takes table"
        title="Takes"
        x={570}
        y={360}
        columns={TABLE_COLS}
        rows={FACTS.map((r) => [...r])}
        style={{opacity: prog(f, 0.6, 1.2)}}
        rowOpacity={(r) => prog(f, 1.2 + r * 0.3, 1.7 + r * 0.3)}
        header={(c) => ({fk: prog(f, 4 + c * 0.5, 4.5 + c * 0.5), pk: c < 2 ? pk : 0})}
      />
      <Caption name="FKs" top={720} opacity={prog(f, 5.4, 6.2)} size={42}>
        One table, a <b>foreign key</b> to each entity
      </Caption>
      <Chip tone="orange" size={40} style={{left: 610, top: 820, opacity: pk}}>
        PK = (student, course): the N ends
      </Chip>
    </SceneShell>
  );
};

export const TablesScene = Interactive.withSchema({
  Component: TablesInner,
  componentName: '<TablesScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
