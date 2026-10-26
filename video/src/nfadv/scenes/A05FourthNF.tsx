import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog, window01} from '../../anim';
import {DataTable} from '../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../components/Shell';
import {InfoCard} from '../../sql/common/ui';
import {TONES} from '../../theme';
import {
  COURSE_BOOK_COLS,
  COURSE_BOOK_ROWS,
  COURSE_TEACHER_COLS,
  COURSE_TEACHER_ROWS,
  Edges,
  MATERIAL_COLS,
  MATERIAL_ROWS,
  Narration,
  Note,
} from '../shared';

const TX = 100;
const TY = 330;
const LX = 860; // teacher list
const BX = 1400; // book list
const LY = [320, 410];
const TEACHERS = ['Ruiz', 'Gil'];
const BOOKS = ['Elmasri', 'Date'];
/** Edge i pairs teacher i >> 1 with book i & 1: the same order as the first four table rows. */
const EDGE_AT = [2.4, 3.1, 3.8, 4.5];

// 0.4 every teacher uses every book: the four combinations · 7.0 multivalued dependency ·
// 15.0 a third book needs two rows · 18.8 4NF: CourseTeacher + CourseBook · 22.7 one row
const FourthInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const left = 1 - prog(f, 18.6, 19.2);
  const dim = 1 - 0.7 * prog(f, 18.8, 19.6);
  const extra = prog(f, 15.2, 15.9);
  const ct = prog(f, 19.4, 20.2);
  const cb = prog(f, 20.2, 21.0);
  const oneRow = prog(f, 22.8, 23.4);
  return (
    <SceneShell style={style}>
      <Narration scene="nf4" />
      <Heading name="Heading" premountFor={fps}>
        Fourth normal form (4NF)
      </Heading>
      <DataTable
        name="CourseMaterial"
        title="CourseMaterial"
        x={TX}
        y={TY}
        columns={MATERIAL_COLS}
        rows={MATERIAL_ROWS}
        style={{opacity: Math.min(prog(f, 0.2, 1), dim)}}
        rowOpacity={(r) => (r >= 4 ? extra : 1)}
        cell={(r, c) => {
          if (r >= 4) return {bg: TONES.orange.soft, outline: extra};
          const pair = window01(f, EDGE_AT[r], 6.6);
          return pair > 0 && c >= 1 ? {bg: TONES.teal.soft, outline: 0} : undefined;
        }}
      />
      <Chip tone="orange" size={30} style={{left: TX, top: 780, opacity: Math.min(extra, dim)}}>
        1 new book → 2 new rows
      </Chip>
      <div style={{opacity: left}}>
        <Note name="Every teacher × every book" x={LX} y={230} opacity={prog(f, 1.2, 2.0)}>
          <b>Databases</b>: every teacher × every book
        </Note>
        {TEACHERS.map((t, i) => (
          <Chip key={t} tone="blue" style={{left: LX, top: LY[i], opacity: prog(f, 1.6, 2.2)}}>
            {t}
          </Chip>
        ))}
        {BOOKS.map((b, i) => (
          <Chip key={b} tone="teal" style={{left: BX, top: LY[i], opacity: prog(f, 1.6, 2.2)}}>
            {b}
          </Chip>
        ))}
        <Edges
          name="Teacher × book"
          color={TONES.teal.strong}
          edges={EDGE_AT.map((at, i) => ({x1: 1000, y1: LY[i >> 1] + 32, x2: BX - 12, y2: LY[i & 1] + 32, t: prog(f, at, at + 0.6)}))}
        />
        <InfoCard name="Multivalued dependency" title="Multivalued dependency" x={820} y={540} width={1000} tone="teal" opacity={prog(f, 7.0, 7.8)} titleSize={36} size={30}>
          <b>course ↠ teacher | book</b>: a course fixes a <i>set</i> of teachers and, independently, a <i>set</i> of books.
          <div style={{marginTop: 10, fontSize: 28, opacity: prog(f, 10.5, 11.3)}}>No functional dependency at all, and the whole row is the key.</div>
        </InfoCard>
      </div>
      <DataTable
        name="CourseTeacher"
        title="CourseTeacher"
        x={900}
        y={300}
        columns={COURSE_TEACHER_COLS}
        rows={COURSE_TEACHER_ROWS}
        style={{opacity: ct, translate: `${(1 - ct) * 40}px 0px`}}
      />
      <DataTable
        name="CourseBook"
        title="CourseBook"
        x={900}
        y={570}
        columns={COURSE_BOOK_COLS}
        rows={COURSE_BOOK_ROWS}
        style={{opacity: cb, translate: `${(1 - cb) * 40}px 0px`}}
        cell={(r) => (r === 2 && oneRow > 0 ? {bg: TONES.teal.soft, outline: oneRow} : undefined)}
      />
      <Chip tone="teal" style={{left: 1420, top: 310, opacity: prog(f, 21.4, 22.0), scale: `${0.7 + 0.3 * prog(f, 21.4, 22.0)}`}}>
        4NF ✓
      </Chip>
      <Chip tone="teal" size={30} style={{left: 1420, top: 700, opacity: oneRow}}>
        1 new book → 1 row
      </Chip>
    </SceneShell>
  );
};

export const FourthNFScene = Interactive.withSchema({
  Component: FourthInner,
  componentName: '<FourthNFScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
