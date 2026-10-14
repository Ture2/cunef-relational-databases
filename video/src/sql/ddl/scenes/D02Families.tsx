import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog, window01} from '../../../anim';
import {DataTable, geom} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, TONES, type Tone} from '../../../theme';
import {cells, STUDENT, STUDENT_COLS} from '../../common/school';
import {MONO} from '../../common/SqlCode';
import {Arrow, InfoCard} from '../../common/ui';
import {Narration} from '../shared';

type Family = {
  readonly name: string;
  readonly full: string;
  readonly statements: string;
  readonly target: string;
  readonly tone: Tone;
  /** Local seconds when the narration talks about it [from, to]. */
  readonly talk: readonly [number, number];
};

const FAMILIES: readonly Family[] = [
  {name: 'DDL', full: 'data definition', statements: 'CREATE ALTER DROP TRUNCATE RENAME', target: 'the schema', tone: 'teal', talk: [7.4, 13.4]},
  {name: 'DML', full: 'data manipulation', statements: 'SELECT INSERT UPDATE DELETE MERGE', target: 'the rows', tone: 'blue', talk: [13.6, 18.4]},
  {name: 'DCL', full: 'data control', statements: 'GRANT REVOKE', target: 'privileges', tone: 'maroon', talk: [18.6, 20.8]},
  {name: 'TCL', full: 'transaction control', statements: 'COMMIT ROLLBACK SAVEPOINT', target: 'when changes are permanent', tone: 'yellow', talk: [20.8, 24.6]},
];

const CARD_W = 400;
const CARD_X = [100, 540, 980, 1420];
const CARD_Y = 210;
const TABLE = {x: 200, y: 680};
const gT = geom(STUDENT_COLS, TABLE.x, TABLE.y);

// 0.8 one language, four sub-languages · 7.4 DDL defines the structure: tables, columns, constraints
// · 13.6 DML reads and changes the rows · 18.6 DCL permissions · 20.8 TCL when changes become permanent
const FamiliesInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const structure = prog(f, 9.6, 10.4);
  const rows = prog(f, 14.6, 15.4);
  return (
    <SceneShell style={style}>
      <Narration scene="families" />
      <Heading name="Heading" premountFor={fps}>
        The sub-languages of SQL
      </Heading>
      {FAMILIES.map((fam, i) => {
        const t = prog(f, 1.6 + i * 0.6, 2.4 + i * 0.6);
        const on = i === 0 ? Math.max(window01(f, fam.talk[0], fam.talk[1]), prog(f, 24.6, 25.2)) : window01(f, fam.talk[0], fam.talk[1]);
        return (
          <InfoCard
            key={fam.name}
            name={`Card ${fam.name}`}
            title={fam.name}
            x={CARD_X[i]}
            y={CARD_Y}
            width={CARD_W}
            height={330}
            tone={fam.tone}
            opacity={t}
            outline={on}
            titleSize={48}
            size={26}
            style={{translate: `0px ${(1 - t) * 20}px`}}
          >
            <div style={{color: C.muted, fontWeight: 700, marginTop: -8}}>{fam.full}</div>
            <div style={{fontFamily: MONO, fontSize: 25, color: TONES[fam.tone].strong, fontWeight: 700, margin: '14px 0', lineHeight: 1.45}}>{fam.statements}</div>
            <div>
              acts on <b>{fam.target}</b>
            </div>
          </InfoCard>
        );
      })}
      <DataTable
        name="Student"
        title="student"
        x={TABLE.x}
        y={TABLE.y}
        columns={STUDENT_COLS}
        rows={cells(STUDENT)}
        style={{opacity: prog(f, 8.4, 9.2)}}
        header={() => ({outline: structure})}
        cell={() => (rows > 0 ? {bg: TONES.blue.soft, outline: rows} : undefined)}
      />
      <Arrow name="To structure" from={{x: 1000, y: gT.headTop + 32}} to={{x: gT.left(0) + gT.width + 16, y: gT.headTop + 32}} progress={prog(f, 10, 10.8)} color={TONES.teal.strong} />
      <Chip tone="teal" size={34} style={{left: 1020, top: gT.headTop + 3, opacity: prog(f, 10, 10.8)}}>
        DDL defines the structure
      </Chip>
      <Arrow name="To rows" from={{x: 1000, y: gT.rowCy(1)}} to={{x: gT.left(0) + gT.width + 16, y: gT.rowCy(1)}} progress={prog(f, 15, 15.8)} color={TONES.blue.strong} />
      <Chip tone="blue" size={34} style={{left: 1020, top: gT.rowCy(1) - 29, opacity: prog(f, 15, 15.8)}}>
        DML reads and changes the rows
      </Chip>
    </SceneShell>
  );
};

export const FamiliesScene = Interactive.withSchema({
  Component: FamiliesInner,
  componentName: '<FamiliesScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
