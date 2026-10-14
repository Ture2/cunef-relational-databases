import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, FONT} from '../../../theme';
import {MONO, SqlCode} from '../../common/SqlCode';
import {Arrow, InfoCard} from '../../common/ui';
import {BNode, BRANCH_H, Edges, leafKeyY, Narration, TARGET_EMAIL, type Edge} from '../shared';

const CODE = 'CREATE INDEX idx_customer_email ON customer (email);';

const NODE_W = 300;
const ROOT = {cx: 690, y: 340, keys: ['user3', 'user6']};
const BRANCHES = [
  {cx: 290, keys: ['user15', 'user2']},
  {cx: 690, keys: ['user36', 'user42']},
  {cx: 1090, keys: ['user7', 'user8']},
];
const BRANCH_Y = 480;
const LEAF_W = 340;
const LEAF_Y = 630;
/* The leaves of the middle branch (string order: 'user3…' < 'user36…' < 'user42…' < 'user6'). */
const LEAVES = [
  {cx: 290, keys: ['user3@mail.com', 'user30@mail.com', 'user300@mail.com', '…', 'user35999@mail.com']},
  {cx: 690, keys: ['user36@mail.com', 'user360@mail.com', 'user3600@mail.com', '…', 'user41999@mail.com']},
  {cx: 1090, keys: ['…', 'user43209@mail.com', TARGET_EMAIL, 'user43211@mail.com', '…']},
];
const TARGET_LEAF = 2;
const TARGET_KEY = 2;
const LEAF_BOTTOM = LEAF_Y + 6 + 16 + 5 * 36 + 4 * 2;

/* A node's 3 pointers leave from its left edge, its middle divider and its right edge. */
const ptrX = (cx: number, k: number) => cx - NODE_W / 2 + 14 + k * (NODE_W / 2 - 14);

const RIGHT = 1340;

// 0.8 create an index on email · 5.4 Oracle builds a B-tree (6.8): sorted emails in leaf blocks (8.9),
// a few levels of guide keys above (12.1) · 13.8 find our email (15.2): root (16.9), one branch (17.9), the right leaf (19.6)
// · 21.2 the leaf stores the ROWID (23.5), the address of the row in the table (26.5); a few steps (27.5), not 50,000 rows (30.1)
const BTreeInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const leafT = (i: number) => prog(f, 7.6 + i * 0.4, 8.3 + i * 0.4);
  const branchT = (i: number) => prog(f, 9.8 + i * 0.25, 10.4 + i * 0.25);
  const rootT = prog(f, 11, 11.6);
  const path = {
    root: prog(f, 15.8, 16.4),
    e1: prog(f, 16.6, 17.4),
    branch: prog(f, 17.4, 17.9),
    e2: prog(f, 18.2, 19),
    leaf: prog(f, 19, 19.5),
    key: prog(f, 19.4, 20),
  };
  const edges: Edge[] = [
    ...BRANCHES.map((b, i) => ({x1: ptrX(ROOT.cx, i), y1: ROOT.y + BRANCH_H, x2: b.cx, y2: BRANCH_Y, t: prog(f, 11.4, 12.2), hot: i === 1 ? path.e1 : 0})),
    ...LEAVES.map((l, i) => ({x1: ptrX(BRANCHES[1].cx, i), y1: BRANCH_Y + BRANCH_H, x2: l.cx, y2: LEAF_Y, t: prog(f, 10.4, 11.2), hot: i === TARGET_LEAF ? path.e2 : 0})),
    /* the other branches have leaves of their own, off to the sides */
    {x1: ptrX(BRANCHES[0].cx, 0), y1: BRANCH_Y + BRANCH_H, x2: ptrX(BRANCHES[0].cx, 0) - 40, y2: BRANCH_Y + BRANCH_H + 44, t: prog(f, 10.4, 11.2), dashed: true},
    {x1: ptrX(BRANCHES[2].cx, 2), y1: BRANCH_Y + BRANCH_H, x2: ptrX(BRANCHES[2].cx, 2) + 40, y2: BRANCH_Y + BRANCH_H + 44, t: prog(f, 10.4, 11.2), dashed: true},
    /* the leaves are chained, in order */
    ...[0, 1].map((i) => ({
      x1: LEAVES[i].cx + LEAF_W / 2 + 4,
      y1: (LEAF_Y + LEAF_BOTTOM) / 2,
      x2: LEAVES[i + 1].cx - LEAF_W / 2 - 4,
      y2: (LEAF_Y + LEAF_BOTTOM) / 2,
      t: prog(f, 8.8 + i * 0.3, 9.4 + i * 0.3),
      head: true,
    })),
  ];
  const keyY = leafKeyY(LEAF_Y, TARGET_KEY);
  return (
    <SceneShell style={style}>
      <Narration scene="btree" />
      <Heading name="Heading" premountFor={fps}>
        A B-tree index
      </Heading>
      <SqlCode name="Create index" code={CODE} x={100} y={200} width={1060} size={28} opacity={prog(f, 0.8, 1.4)} line={() => ({highlight: prog(f, 1.6, 2.2) * (1 - prog(f, 4.6, 5.2))})} />
      <Edges name="Tree edges" edges={edges} />
      <BNode name="Root" keys={ROOT.keys} cx={ROOT.cx} y={ROOT.y} width={NODE_W} opacity={rootT} outline={path.root} />
      <Interactive.Div name="Root label" style={{position: 'absolute', left: ROOT.cx + NODE_W / 2 + 20, top: ROOT.y + 14, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: C.muted, opacity: rootT}}>
        root
      </Interactive.Div>
      {BRANCHES.map((b, i) => (
        <BNode key={b.cx} name={`Branch ${i}`} keys={b.keys} cx={b.cx} y={BRANCH_Y} width={NODE_W} opacity={branchT(i)} outline={i === 1 ? path.branch : 0} faint={i !== 1} />
      ))}
      <Interactive.Div
        name="Simplified label"
        style={{position: 'absolute', left: 660, top: 914, fontFamily: FONT, fontSize: 24, fontStyle: 'italic', color: C.muted, opacity: rootT}}
      >
        (simplified: real blocks hold hundreds of keys)
      </Interactive.Div>
      {LEAVES.map((l, i) => (
        <BNode
          key={l.cx}
          name={`Leaf ${i}`}
          keys={l.keys}
          cx={l.cx}
          y={LEAF_Y}
          width={LEAF_W}
          leaf
          opacity={leafT(i)}
          outline={i === TARGET_LEAF ? path.leaf : 0}
          hit={i === TARGET_LEAF ? {i: TARGET_KEY, t: path.key} : undefined}
        />
      ))}
      <Interactive.Div name="Leaf label" style={{position: 'absolute', left: 120, top: LEAF_BOTTOM + 14, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: C.muted, opacity: leafT(0)}}>
        leaf blocks: every email, sorted, chained
      </Interactive.Div>
      <Chip tone="neutral" size={28} style={{left: RIGHT, top: ROOT.y, opacity: prog(f, 13.8, 14.4)}}>
        find
        <span style={{fontFamily: MONO, fontWeight: 400}}>{TARGET_EMAIL}</span>
      </Chip>
      <Arrow name="Leaf to ROWID" from={{x: LEAVES[TARGET_LEAF].cx + LEAF_W / 2 + 6, y: keyY}} to={{x: RIGHT - 6, y: keyY}} progress={prog(f, 22.4, 23.2)} />
      <InfoCard name="ROWID" title="ROWID" x={RIGHT} y={600} width={500} tone="blue" titleSize={34} opacity={prog(f, 23, 23.6)}>
        <div style={{fontFamily: MONO, fontSize: 32, fontWeight: 700}}>AAAR5kAAEAAAAJ7AAK</div>
        <div style={{fontSize: 24, color: C.muted, marginTop: 4}}>object · file · block · row</div>
      </InfoCard>
      <Arrow name="ROWID to row" from={{x: RIGHT + 250, y: 778}} to={{x: RIGHT + 250, y: 836}} progress={prog(f, 25.2, 25.8)} />
      <InfoCard name="Customer row" title="customer row" x={RIGHT} y={840} width={500} tone="blue" titleSize={30} size={26} opacity={prog(f, 25.6, 26.2)} outline={prog(f, 26.2, 26.8)}>
        43210 · Madrid · 2023-04-25
        <br />
        <span style={{fontFamily: MONO}}>{TARGET_EMAIL}</span>
      </InfoCard>
      <Chip tone="teal" size={32} style={{left: 120, top: 900, opacity: prog(f, 27.4, 28.2)}}>
        A few steps, not 50,000 rows
      </Chip>
    </SceneShell>
  );
};

export const BTreeScene = Interactive.withSchema({
  Component: BTreeInner,
  componentName: '<BTreeScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
