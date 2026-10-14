import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {Mono, Narration} from '../shared';

const COLS: Column[] = [
  {key: 'attribute', label: 'Attribute', width: 330, tone: 'teal'},
  {key: 'means', label: 'Means', width: 580, tone: 'blue'},
  {key: 'use', label: 'Typical use', width: 730, tone: 'maroon'},
];

/* The card's table of cursor attributes, each row shown when the voice names it. */
const ROWS = [
  {attr: 'c%ISOPEN', means: 'The cursor is open', use: 'IF NOT c%ISOPEN THEN OPEN c; END IF;', code: true, at: 2.9},
  {attr: 'c%FOUND', means: 'The last FETCH returned a row', use: 'Process the row', code: false, at: 5.4},
  {attr: 'c%NOTFOUND', means: 'The last FETCH found nothing', use: 'EXIT WHEN c%NOTFOUND;', code: true, at: 9.3},
  {attr: 'c%ROWCOUNT', means: 'Rows fetched so far', use: 'Number the lines of a report', code: false, at: 13.4},
  {attr: 'SQL%ROWCOUNT', means: 'Rows changed by the last statement', use: 'Report how many rows changed', code: false, at: 16.4},
];

// 0.8 four attributes · 2.9 ISOPEN · 5.4 FOUND · 9.3 NOTFOUND · 13.4 ROWCOUNT · 16.4 the implicit cursor: SQL in front
const AttributesInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const on = (r: number) => {
    const next = r + 1 < ROWS.length ? ROWS[r + 1].at : 99;
    return prog(f, ROWS[r].at, ROWS[r].at + 0.5) * (1 - prog(f, next, next + 0.5));
  };
  return (
    <SceneShell style={style}>
      <Narration scene="attributes" />
      <Heading name="Heading" premountFor={fps}>
        Cursor attributes
      </Heading>
      <Chip tone="neutral" size={30} style={{left: 140, top: 250, opacity: prog(f, 0.8, 1.4)}}>
        <span>
          <Mono size={30}>c</Mono> = the cursor&apos;s name
        </span>
      </Chip>
      <DataTable
        name="Attributes"
        x={140}
        y={380}
        columns={COLS}
        rows={ROWS.map((r) => [
          <Mono key="a" size={28} color={TONES.teal.strong}>
            {r.attr}
          </Mono>,
          r.means,
          r.code ? (
            <Mono key="u" size={24}>
              {r.use}
            </Mono>
          ) : (
            r.use
          ),
        ])}
        style={{opacity: prog(f, 1.2, 2)}}
        rowOpacity={(r) => prog(f, ROWS[r].at - 0.2, ROWS[r].at + 0.4)}
        cell={(r) => (on(r) > 0 ? {bg: TONES.orange.soft, outline: on(r)} : undefined)}
      />
      <Chip tone="teal" size={30} style={{left: 140, top: 820, opacity: prog(f, 16.8, 17.4)}}>
        <span>
          Explicit cursor: <Mono size={30}>c_grades%FOUND</Mono>
        </span>
      </Chip>
      <Chip tone="orange" size={30} style={{left: 900, top: 820, opacity: prog(f, 17.2, 17.8)}}>
        <span>
          Implicit cursor: <Mono size={30}>SQL%FOUND</Mono>
        </span>
      </Chip>
    </SceneShell>
  );
};

export const AttributesScene = Interactive.withSchema({
  Component: AttributesInner,
  componentName: '<AttributesScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
