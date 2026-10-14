import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom, type Column} from '../../../components/DataTable';
import {Caption, Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, FONT, TONES} from '../../../theme';
import {Arrow} from '../../common/ui';
import {Narration} from '../shared';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const TAB = {x: 100, y: 250, w: 50, gap: 6, h: 56};
const tabX = (i: number) => TAB.x + (i % 13) * (TAB.w + TAB.gap);
const tabY = (i: number) => TAB.y + Math.floor(i / 13) * (TAB.h + 14);
const R = LETTERS.indexOf('R');

const PAGE_COLS: Column[] = [
  {key: 'surname', label: 'surname', width: 200, tone: 'neutral'},
  {key: 'name', label: 'name', width: 180, tone: 'neutral'},
  {key: 'phone', label: 'phone', width: 240, tone: 'neutral'},
];
const PAGE = [
  ['Rojas', 'Pablo', '912 334 101'],
  ['Romero', 'Lucía', '913 870 245'],
  ['Rubio', 'Marta', '915 602 118'],
  ['Ruiz', 'Ana', '914 228 390'],
];
const PAGE_Y = 520;

const IDX_COLS: Column[] = [{key: 'email', label: 'email (sorted)', width: 290, tone: 'teal'}];
const CUS_COLS: Column[] = [
  {key: 'customer_id', label: 'customer_id', width: 190, tone: 'blue', pk: true},
  {key: 'email', label: 'email', width: 250, tone: 'blue'},
];
const IDX = {x: 920, y: 420};
const CUS = {x: 1400, y: 420};
const gI = geom(IDX_COLS, IDX.x, IDX.y);
const gT = geom(CUS_COLS, CUS.x, CUS.y);
const IDS = [1, 2, 3, 10];
/* String order: 'user1@' < 'user10@' < 'user2@' < 'user3@'. Index entry -> table row. */
const SORTED = [0, 3, 1, 2];

// 0.8 think of a phone book; to find Ruiz (3.6) you don't read every page (5.4); the names are sorted (6.8),
// jump straight to R (8.9) · 10 an index does the same for a table (12.8): separate, sorted (14.2), points to rows (15.9)
const PhoneBookInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const jump = prog(f, 7.6, 8.4);
  const ruiz = prog(f, 9, 9.6);
  return (
    <SceneShell style={style}>
      <Narration scene="phonebook" />
      <Heading name="Heading" premountFor={fps}>
        Like a phone book
      </Heading>
      <Interactive.Div
        name="Phone book title"
        style={{position: 'absolute', left: TAB.x, top: 196, fontSize: 32, fontWeight: 700, color: C.ink, opacity: prog(f, 0.8, 1.4)}}
      >
        Phone book
      </Interactive.Div>
      {LETTERS.map((l, i) => {
        const hot = i === R ? jump : 0;
        return (
          <Interactive.Div
            key={l}
            name={`Tab ${l}`}
            style={{
              position: 'absolute',
              left: tabX(i),
              top: tabY(i),
              width: TAB.w,
              height: TAB.h,
              boxSizing: 'border-box',
              borderRadius: 8,
              border: `2px solid ${C.rule}`,
              backgroundColor: hot > 0 ? TONES.orange.soft : C.surface,
              boxShadow: hot > 0 ? `0 0 0 ${5 * hot}px ${C.accent}` : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT,
              fontSize: 30,
              fontWeight: 700,
              color: hot > 0.5 ? TONES.orange.strong : C.ink,
              opacity: prog(f, 0.9 + i * 0.04, 1.4 + i * 0.04) * (1 - 0.55 * prog(f, 7.6, 8.4) * (i === R ? 0 : 1)),
            }}
          >
            {l}
          </Interactive.Div>
        );
      })}
      <Chip tone="orange" size={30} style={{left: TAB.x, top: 410, opacity: prog(f, 3.8, 4.4) * (1 - prog(f, 7, 7.6))}}>
        Read every page?
        <span style={{position: 'absolute', left: 16, right: 16, top: '50%', height: 4, marginTop: -2, backgroundColor: C.accent, scale: `${prog(f, 5, 5.8)} 1`, transformOrigin: '0 50%'}} />
      </Chip>
      <Arrow name="Jump to R" from={{x: tabX(R) + TAB.w / 2, y: tabY(R) + TAB.h + 8}} to={{x: tabX(R) + TAB.w / 2, y: PAGE_Y - 62}} progress={prog(f, 8, 8.8)} />
      <DataTable
        name="Page R"
        title="Page R"
        x={TAB.x}
        y={PAGE_Y}
        columns={PAGE_COLS}
        rows={PAGE}
        style={{opacity: prog(f, 8.4, 9)}}
        cell={(r) => (r === 3 && ruiz > 0 ? {bg: TONES.orange.soft, outline: ruiz} : undefined)}
      />
      <DataTable
        name="Index"
        title="index on email"
        x={IDX.x}
        y={IDX.y}
        columns={IDX_COLS}
        rows={SORTED.map((r) => [`user${IDS[r]}@mail.com`])}
        style={{opacity: prog(f, 10.6, 11.2)}}
        header={() => ({outline: prog(f, 13.4, 14) * (1 - prog(f, 15.4, 16))})}
      />
      <DataTable
        name="Customer"
        title="customer"
        x={CUS.x}
        y={CUS.y}
        columns={CUS_COLS}
        rows={IDS.map((id) => [String(id), `user${id}@mail.com`])}
        style={{opacity: prog(f, 11.6, 12.2)}}
      />
      {SORTED.map((r, i) => (
        <Arrow
          key={i}
          name={`Pointer ${i}`}
          from={{x: gI.left(0) + gI.width + 6, y: gI.rowCy(i)}}
          to={{x: gT.left(0) - 6, y: gT.rowCy(r)}}
          width={4}
          progress={prog(f, 14.6 + i * 0.25, 15.3 + i * 0.25)}
        />
      ))}
      <Caption name="Index caption" top={760} left={900} width={940} opacity={prog(f, 15, 15.8)} size={40}>
        <b>Index</b> = sorted values + pointers to the rows
      </Caption>
    </SceneShell>
  );
};

export const PhoneBookScene = Interactive.withSchema({
  Component: PhoneBookInner,
  componentName: '<PhoneBookScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
