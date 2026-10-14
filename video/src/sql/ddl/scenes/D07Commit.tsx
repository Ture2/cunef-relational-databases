import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog, window01} from '../../../anim';
import {DataTable, geom, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, TONES} from '../../../theme';
import {cells} from '../../common/school';
import {codeLineY, SqlCode} from '../../common/SqlCode';
import {Narration} from '../shared';

const CODE = `INSERT INTO member VALUES (3, 'Eva Sanz', 'eva@uni.es');
-- implicit COMMIT
ALTER TABLE member ADD CONSTRAINT uq_member_email UNIQUE (email);
-- implicit COMMIT
ROLLBACK;`;
const PANEL = {x: 100, y: 220, size: 28};

const COLS: Column[] = [
  {key: 'member_id', label: 'member_id', width: 180, tone: 'blue', pk: true},
  {key: 'member_name', label: 'member_name', width: 240, tone: 'blue'},
  {key: 'email', label: 'email', width: 210, tone: 'blue'},
];
const ROWS = cells([
  ['1', 'Ana Ruiz', null],
  ['2', 'Luis Gil', null],
  ['3', 'Eva Sanz', 'eva@uni.es'],
]);
const TABLE = {x: 100, y: 620};
const gT = geom(COLS, TABLE.x, TABLE.y);

// 0.8 every DDL commits the open transaction · 4.9 before · 5.8 and after it
// · 7.4 the waiting insert is made permanent (8.4) · 10.8 a ROLLBACK cannot undo the DDL
const CommitInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const committed = prog(f, 8.4, 9);
  const sideLabel = (key: string, line: number, at: number, text: string, color: string) => (
    <Interactive.Div
      key={key}
      name={`Label ${key}`}
      style={{position: 'absolute', left: 1250, top: codeLineY(PANEL.y, line, PANEL.size) - 20, height: 40, display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 700, whiteSpace: 'nowrap', color, opacity: prog(f, at, at + 0.5)}}
    >
      ← {text}
    </Interactive.Div>
  );
  return (
    <SceneShell style={style}>
      <Narration scene="commit" />
      <Heading name="Heading" premountFor={fps}>
        DDL commits
      </Heading>
      <SqlCode
        name="Session"
        code={CODE}
        x={PANEL.x}
        y={PANEL.y}
        width={1120}
        size={PANEL.size}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => {
          if (i === 0) return {opacity: prog(f, 0.8, 1.3)};
          if (i === 2) return {opacity: prog(f, 1.8, 2.3), highlight: window01(f, 1.8, 4.6), tone: 'teal'};
          if (i === 1) return {opacity: prog(f, 4.9, 5.4), highlight: window01(f, 4.9, 7.4)};
          if (i === 3) return {opacity: prog(f, 5.8, 6.3), highlight: window01(f, 5.8, 7.4)};
          return {opacity: prog(f, 10.8, 11.3), highlight: prog(f, 10.8, 11.4), tone: 'maroon'};
        }}
      />
      {sideLabel('before', 1, 5.1, 'automatic, before the DDL', TONES.orange.strong)}
      {sideLabel('after', 3, 6, 'automatic, after it', TONES.orange.strong)}
      {sideLabel('rollback', 4, 11.8, 'nothing to undo', TONES.maroon.strong)}
      <DataTable
        name="Member"
        title="member"
        x={TABLE.x}
        y={TABLE.y}
        columns={COLS}
        rows={ROWS}
        style={{opacity: prog(f, 1, 1.6)}}
        cell={(r) =>
          r === 2
            ? {dashed: committed < 1, color: committed < 0.5 ? C.muted : undefined, bg: committed > 0 ? TONES.orange.soft : undefined, outline: committed * (1 - prog(f, 11, 11.6))}
            : undefined
        }
      />
      <Chip tone="maroon" size={30} style={{left: gT.left(0) + gT.width + 30, top: gT.rowCy(2) - 28, opacity: prog(f, 1.4, 2) * (1 - committed)}}>
        not committed yet
      </Chip>
      <Chip tone="teal" size={30} style={{left: gT.left(0) + gT.width + 30, top: gT.rowCy(2) - 28, opacity: committed}}>
        made permanent by the DDL
      </Chip>
      <Chip tone="neutral" size={34} style={{left: 1100, top: 900, opacity: prog(f, 12, 12.6)}}>
        A DDL cannot be rolled back
      </Chip>
    </SceneShell>
  );
};

export const CommitScene = Interactive.withSchema({
  Component: CommitInner,
  componentName: '<CommitScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
