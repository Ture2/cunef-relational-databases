import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../anim';
import {DataTable, HEAD_H, ROW_H} from '../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../components/Shell';
import {InfoCard} from '../../sql/common/ui';
import {TONES, type Tone} from '../../theme';
import {
  COURSE_CAMPUS_COLS,
  COURSE_CAMPUS_ROWS,
  Edges,
  LECTURER_CAMPUS_COLS,
  LECTURER_CAMPUS_ROWS,
  LECTURER_COURSE_COLS,
  LECTURER_COURSE_ROWS,
  Narration,
  Note,
  SPURIOUS,
  TEACHING_COLS,
  TEACHING_ROWS,
  TWO_PAIR_JOIN_ROWS,
} from '../shared';

const TX = 100;
const TY = 330;
const S = 0.8; // scale of the pair tables and of the join result
const PY = 260;
const JX = 780;
const JY = 570;

/** The cyclic rule as a triangle: node centres. */
const NODES: readonly {readonly label: string; readonly tone: Tone; readonly x: number; readonly y: number}[] = [
  {label: 'lecturer', tone: 'blue', x: 960, y: 330},
  {label: 'course', tone: 'orange', x: 1560, y: 330},
  {label: 'campus', tone: 'maroon', x: 1260, y: 590},
];
const EDGES = [
  {a: 0, b: 1, label: 'teaches', at: 6.0},
  {a: 1, b: 2, label: 'runs on', at: 7.9},
  {a: 0, b: 2, label: 'works at', at: 9.9},
];

const PAIRS = [
  {name: 'LecturerCourse', x: 780, columns: LECTURER_COURSE_COLS, rows: LECTURER_COURSE_ROWS, at: 19.0},
  {name: 'CourseCampus', x: 1130, columns: COURSE_CAMPUS_COLS, rows: COURSE_CAMPUS_ROWS, at: 19.5},
  {name: 'LecturerCampus', x: 1480, columns: LECTURER_CAMPUS_COLS, rows: LECTURER_CAMPUS_ROWS, at: 20.0},
];

// 0.4 Teaching · 5.4 the cyclic rule (triangle) · 13.4 join dependency · 18.8 the three pairs ·
// 21.4 join only two: five rows · 24.3 the invented row · 29.1 the third pair removes it ·
// 31.3 only if the rule always holds
const FifthInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rule = 1 - prog(f, 18.4, 19.0);
  const twoOnly = prog(f, 21.4, 22.0) * (1 - prog(f, 29.0, 29.6));
  const third = prog(f, 29.2, 29.8);
  const fake = prog(f, 24.6, 25.3);
  const strike = prog(f, 30.0, 30.8);
  const spuriousY = JY + (HEAD_H + SPURIOUS * ROW_H + ROW_H / 2) * S;
  return (
    <SceneShell style={style}>
      <Narration scene="nf5" />
      <Heading name="Heading" premountFor={fps}>
        Fifth normal form (5NF)
      </Heading>
      <DataTable
        name="Teaching"
        title="Teaching"
        x={TX}
        y={TY}
        columns={TEACHING_COLS}
        rows={TEACHING_ROWS}
        style={{opacity: Math.min(prog(f, 0.2, 1), 1 - 0.4 * prog(f, 18.8, 19.6))}}
      />
      <div style={{opacity: rule}}>
        <Edges
          name="Rule triangle"
          edges={EDGES.map((e) => ({
            x1: NODES[e.a].x,
            y1: NODES[e.a].y,
            x2: NODES[e.b].x,
            y2: NODES[e.b].y,
            t: prog(f, e.at, e.at + 0.8),
            label: e.label,
          }))}
        />
        {NODES.map((n) => (
          <Chip key={n.label} tone={n.tone} style={{left: n.x, top: n.y, translate: '-50% -50%', opacity: prog(f, 5.4, 6.0)}}>
            {n.label}
          </Chip>
        ))}
        <Chip tone="neutral" size={26} style={{left: 1260, top: 385, translate: '-50% -50%', opacity: prog(f, 11.3, 11.9)}}>
          ⇒ all three together
        </Chip>
        <InfoCard name="Join dependency" title="Join dependency" x={820} y={700} width={1000} tone="orange" opacity={prog(f, 13.4, 14.2)} titleSize={36} size={30}>
          Teaching = LecturerCourse ⋈ CourseCampus ⋈ LecturerCampus: the table is <i>exactly</i> the join of its pieces.
        </InfoCard>
      </div>
      {PAIRS.map((p, i) => {
        const t = prog(f, p.at, p.at + 0.6);
        const on = i < 2 ? twoOnly : third;
        return (
          <DataTable
            key={p.name}
            name={p.name}
            title={p.name}
            x={p.x}
            y={PY}
            columns={p.columns}
            rows={p.rows}
            style={{scale: `${S}`, transformOrigin: '0 0', opacity: t, translate: `0px ${(1 - t) * 30}px`}}
            header={() => (on > 0 ? {outline: on} : undefined)}
            cell={(r) => (i === 2 && r === 2 && third > 0 ? {bg: TONES.maroon.soft, outline: third} : undefined)}
          />
        );
      })}
      <Note name="Gil only at Madrid" x={1480} y={PY + (HEAD_H + 3 * ROW_H) * S + 16} width={300} size={26} opacity={third}>
        Gil works only at <b>Madrid</b>
      </Note>
      <DataTable
        name="Two-pair join"
        title="LecturerCourse ⋈ CourseCampus"
        x={JX}
        y={JY}
        columns={TEACHING_COLS}
        rows={TWO_PAIR_JOIN_ROWS}
        style={{scale: `${S}`, transformOrigin: '0 0', opacity: prog(f, 21.6, 22.2)}}
        rowOpacity={(r) => prog(f, 22.0 + r * 0.35, 22.4 + r * 0.35)}
        cell={(r) => (r === SPURIOUS && fake > 0 ? {bg: TONES.orange.soft, outline: fake, strike} : undefined)}
      />
      <Note name="Never happened" x={JX + 550 * S + 24} y={spuriousY - 22} size={30} color={TONES.orange.strong} opacity={fake}>
        <b>invented row ✗</b>
      </Note>
      <Chip tone="teal" style={{left: JX + 550 * S + 24, top: JY + 40, opacity: prog(f, 30.6, 31.2), scale: `${0.7 + 0.3 * prog(f, 30.6, 31.2)}`}}>
        5NF ✓ = Teaching
      </Chip>
      <InfoCard name="Only if the rule holds" title="Only if the rule always holds" x={TX} y={720} width={580} tone="yellow" opacity={prog(f, 31.3, 32.0)} titleSize={30} size={26}>
        Not just because today&apos;s rows happen to fit: the next insert could break it.
      </InfoCard>
    </SceneShell>
  );
};

export const FifthNFScene = Interactive.withSchema({
  Component: FifthInner,
  componentName: '<FifthNFScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
