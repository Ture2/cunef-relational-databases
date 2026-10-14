import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog, window01} from '../../../anim';
import {DataTable, type CellFx, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, TONES, type Tone} from '../../../theme';
import {Null} from '../../common/school';
import {codeLineY, SqlCode} from '../../common/SqlCode';
import {Mono, Narration} from '../shared';

const CODE = `ALTER TABLE member ADD (email VARCHAR2(60),
  fee NUMBER(5,2) DEFAULT 20 NOT NULL);
ALTER TABLE member MODIFY (full_name VARCHAR2(80));
ALTER TABLE member RENAME COLUMN full_name TO member_name;
ALTER TABLE member DROP COLUMN fee;`;
const PANEL = {x: 100, y: 210, size: 28};

/* Each statement: its code lines, when the narration reaches it and its house metaphor. */
const STEPS: readonly {readonly lines: readonly number[]; readonly at: number; readonly label: string; readonly tone: Tone}[] = [
  {lines: [0, 1], at: 8.6, label: 'add a room', tone: 'teal'},
  {lines: [2], at: 17.3, label: 'enlarge a room', tone: 'yellow'},
  {lines: [3], at: 21.8, label: 'relabel a door', tone: 'blue'},
  {lines: [4], at: 25, label: 'knock a wall down', tone: 'maroon'},
];
const stepOf = (line: number) => STEPS.filter((st) => st.lines.indexOf(line) >= 0)[0];
const ENDS = [17.1, 21.6, 24.8, 28.2];

const COLS: Column[] = [
  {key: 'member_id', label: 'member_id', width: 180, tone: 'blue', pk: true},
  {key: 'name', label: 'full_name', width: 250, tone: 'blue'},
  {key: 'email', label: 'email', width: 210, tone: 'blue'},
  {key: 'fee', label: 'fee', width: 170, tone: 'blue'},
];
const TABLE = {x: 580, y: 620};
const typeCell = (t: string) => <Mono style={{fontSize: 22, color: C.muted}}>{t}</Mono>;
const TYPES = ['NUMBER(4)', 'VARCHAR2(40)', 'VARCHAR2(60)', 'NUMBER(5,2)'];
const ROWS: React.ReactNode[][] = [
  TYPES.map(typeCell),
  ['1', 'Ana Ruiz', <Null key="n" />, '20'],
  ['2', 'Luis Gil', <Null key="n" />, '20'],
];

// 0.8 ALTER changes a table that holds data; 4.3 renovating a house · 8.6 ADD: email NULL (12), fee 20 (14.6)
// · 17.3 MODIFY to 80 characters · 21.8 RENAME COLUMN · 25 DROP COLUMN · 28 the rows stay
const AlterInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dropFee = prog(f, 26.6, 27.4);
  const stay = prog(f, 28.4, 29);
  const cell = (r: number, c: number): CellFx | undefined => {
    if (r === 0) {
      const mod = c === 1 ? window01(f, 18.4, 21.6) : 0;
      return {
        bg: '#f7f4ef',
        outline: mod,
        content: c === 1 && f >= 19.4 * fps ? typeCell('VARCHAR2(80)') : undefined,
        strike: c === 3 ? prog(f, 25.8, 26.6) : 0,
      };
    }
    if (c === 2 && f < 17 * fps) return {bg: prog(f, 12, 12.6) > 0 ? TONES.orange.soft : undefined, outline: window01(f, 12, 16.8)};
    if (c === 3) return {bg: window01(f, 15, 16.8) > 0 ? TONES.orange.soft : undefined, outline: window01(f, 15, 16.8), strike: prog(f, 25.8, 26.6)};
    if (stay > 0) return {bg: TONES.orange.soft, outline: stay};
    return undefined;
  };
  return (
    <SceneShell style={style}>
      <Narration scene="alter" />
      <Heading name="Heading" premountFor={fps}>
        ALTER TABLE
      </Heading>
      <SqlCode
        name="Alter statements"
        code={CODE}
        x={PANEL.x}
        y={PANEL.y}
        width={1000}
        size={PANEL.size}
        opacity={prog(f, 1.2, 1.8)}
        line={(i) => {
          const st = stepOf(i);
          const k = STEPS.indexOf(st);
          return {opacity: 0.25 + 0.75 * prog(f, st.at, st.at + 0.5), highlight: window01(f, st.at, ENDS[k]), tone: st.tone};
        }}
      />
      {STEPS.map((st) => {
        const cy = st.lines.length > 1 ? (codeLineY(PANEL.y, 0, PANEL.size) + codeLineY(PANEL.y, 1, PANEL.size)) / 2 : codeLineY(PANEL.y, st.lines[0], PANEL.size);
        return (
          <Interactive.Div
            key={st.label}
            name={`Label ${st.label}`}
            style={{position: 'absolute', left: 1130, top: cy - 20, height: 40, display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 700, whiteSpace: 'nowrap', color: TONES[st.tone].strong, opacity: prog(f, st.at + 0.3, st.at + 0.9)}}
          >
            ← {st.label}
          </Interactive.Div>
        );
      })}
      <DataTable
        name="Member"
        title="member"
        x={TABLE.x}
        y={TABLE.y}
        columns={COLS}
        rows={ROWS}
        style={{opacity: prog(f, 0.8, 1.6)}}
        colOpacity={(c) => (c === 2 ? prog(f, 10.4, 11) : c === 3 ? prog(f, 14, 14.6) * (1 - dropFee) : 1)}
        header={(c) => ({
          label: c === 1 && f >= 22.8 * fps ? 'member_name' : undefined,
          outline: c === 1 ? window01(f, 22.6, 25) : 0,
        })}
        cell={cell}
      />
      <Chip tone="neutral" size={32} style={{left: 100, top: 900, opacity: prog(f, 4.3, 5)}}>
        Renovating a house with people living in it
      </Chip>
      <Chip tone="orange" size={32} style={{left: 1250, top: TABLE.y + 64 + 58 * 2 - 29, opacity: stay}}>
        The rows stay
      </Chip>
    </SceneShell>
  );
};

export const AlterScene = Interactive.withSchema({
  Component: AlterInner,
  componentName: '<AlterScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
