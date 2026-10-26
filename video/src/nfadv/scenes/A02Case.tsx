import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../anim';
import {DataTable, type Column} from '../../components/DataTable';
import {Caption, Chip, Heading, SceneShell} from '../../components/Shell';
import type {Tone} from '../../theme';
import {MATERIAL_COLS, MATERIAL_ROWS, Narration, TEACHING_COLS, TEACHING_ROWS, TUTORING_COLS, TUTORING_ROWS} from '../shared';

const SCALE = 0.85;
const Y = 330;

type Table = {
  readonly name: string;
  readonly x: number;
  readonly columns: Column[];
  readonly rows: readonly (readonly string[])[];
  /** The normal form this table is checked against later, and its tone. */
  readonly next: string;
  readonly tone: Tone;
};

const TABLES: readonly Table[] = [
  {name: 'Tutoring', x: 100, columns: TUTORING_COLS, rows: TUTORING_ROWS, next: 'BCNF?', tone: 'maroon'},
  {name: 'CourseMaterial', x: 670, columns: MATERIAL_COLS, rows: MATERIAL_ROWS.slice(0, 4), next: '4NF?', tone: 'teal'},
  {name: 'Teaching', x: 1270, columns: TEACHING_COLS, rows: TEACHING_ROWS, next: '5NF?', tone: 'orange'},
];

// 0.5 "As a database engineer…" three tables, 3NF ✓ each · 8.4 "Are we done?" · 10.6 each hides redundancy
const CaseInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const question = prog(f, 8.4, 9.2);
  return (
    <SceneShell style={style}>
      <Narration scene="case" />
      <Heading name="Heading" premountFor={fps}>
        The case: a teaching schema in 3NF
      </Heading>
      {TABLES.map((tb, i) => {
        const appear = prog(f, 1.0 + i * 0.8, 1.8 + i * 0.8);
        const ok = prog(f, 5.4 + i * 0.4, 6.0 + i * 0.4);
        const next = prog(f, 10.6 + i * 0.6, 11.2 + i * 0.6);
        return (
          <div key={tb.name}>
            <DataTable
              name={tb.name}
              title={tb.name}
              x={tb.x}
              y={Y}
              columns={tb.columns}
              rows={tb.rows}
              style={{scale: `${SCALE}`, transformOrigin: '0 0', opacity: appear, translate: `0px ${(1 - appear) * 30}px`}}
            />
            <Chip tone="blue" style={{left: tb.x, top: 620, opacity: ok, scale: `${0.7 + 0.3 * ok}`}}>
              3NF ✓
            </Chip>
            <Chip tone={tb.tone} style={{left: tb.x + 185, top: 620, opacity: next, scale: `${0.7 + 0.3 * next}`}}>
              {tb.next}
            </Chip>
          </div>
        );
      })}
      <Caption name="Are we done?" top={780} opacity={question} size={60}>
        <b>Are we done?</b> Not quite.
      </Caption>
    </SceneShell>
  );
};

export const CaseScene = Interactive.withSchema({
  Component: CaseInner,
  componentName: '<CaseScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
