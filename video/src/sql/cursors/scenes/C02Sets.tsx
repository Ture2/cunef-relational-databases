import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom} from '../../../components/DataTable';
import {Caption, Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {Pointer} from '../../common/ui';
import {GRADE_COLS, gradeRows, Narration} from '../shared';

const UPDATE = `UPDATE enrolment
SET grade = grade + 0.5
WHERE course_id = 'C10';`;

const Y = 470;
const L = {x: 160};
const R = {x: 1250};
const gR = geom(GRADE_COLS, R.x, Y);

/* The pointer visits the rows twice: once while the voice says "one at a time", again on "a finger running down". */
const WALKS = [
  {at: 8.6, step: 0.75},
  {at: 18.9, step: 0.5},
];

/** Pointer row (fractional) for the walks; -1 before it starts. */
const pointerRow = (f: number) => {
  const second = prog(f, WALKS[1].at - 0.4, WALKS[1].at);
  const walk = second > 0 ? WALKS[1] : WALKS[0];
  let r = 0;
  for (let k = 1; k < 6; k++) r += prog(f, walk.at + k * walk.step, walk.at + k * walk.step + 0.35);
  return second > 0 && second < 1 ? 5 * (1 - second) : r;
};

// 0.8 SQL works on whole sets; one UPDATE changes every matching row at once · 7.6 a program must
// visit the rows one at a time · 15 a cursor: a pointer over the result of a query · 18.9 a finger on the class list
const SetsInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const all = prog(f, 4.2, 4.8) * (1 - prog(f, 7.6, 8.2));
  const row = pointerRow(f);
  const near = (r: number) => Math.max(0, 1 - Math.abs(row - r) * 2);
  const pOn = prog(f, 8.2, 8.8);
  return (
    <SceneShell style={style}>
      <Narration scene="sets" />
      <Heading name="Heading" premountFor={fps}>
        Sets and rows
      </Heading>
      <SqlCode name="Set-based update" code={UPDATE} x={L.x - 60} y={210} width={600} size={28} opacity={prog(f, 1.6, 2.4)} />
      <DataTable
        name="Whole set"
        title="SQL: the whole set at once"
        titleOpacity={prog(f, 2.6, 3.2)}
        x={L.x}
        y={Y}
        columns={GRADE_COLS}
        rows={gradeRows()}
        style={{opacity: prog(f, 0.8, 1.6)}}
        cell={(r) => (r < 3 && all > 0 ? {bg: TONES.orange.soft, outline: all} : undefined)}
      />
      <DataTable
        name="One row at a time"
        title="A cursor: one row at a time"
        titleOpacity={prog(f, 8.4, 9)}
        x={R.x}
        y={Y}
        columns={GRADE_COLS}
        rows={gradeRows()}
        style={{opacity: prog(f, 7.8, 8.6)}}
        cell={(r) => (near(r) > 0 && pOn > 0 ? {bg: TONES.orange.soft, outline: near(r) * pOn} : undefined)}
      />
      <Pointer name="Cursor" x={R.x - 56} y={gR.rowCy(row)} opacity={pOn} />
      <Chip tone="orange" size={30} style={{left: L.x, top: 900, opacity: prog(f, 5, 5.6)}}>
        3 rows changed by one statement
      </Chip>
      <Caption name="Cursor definition" left={1100} width={800} top={260} opacity={prog(f, 15.6, 16.4)} size={44}>
        A <b>cursor</b> is a pointer over
        <br />
        the result of a query
      </Caption>
      <Chip tone="teal" size={30} style={{left: R.x, top: 900, opacity: prog(f, 18.9, 19.6)}}>
        A finger on the class list
      </Chip>
    </SceneShell>
  );
};

export const SetsScene = Interactive.withSchema({
  Component: SetsInner,
  componentName: '<SetsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
