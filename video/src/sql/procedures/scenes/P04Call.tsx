import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {cells} from '../../common/school';
import {codeLineY, SqlCode} from '../../common/SqlCode';
import {Arrow} from '../../common/ui';
import {ENROL_COLS, ENROL_ROWS, NEW_ROW, Narration, OutputBox} from '../shared';

const BLOCK = `DECLARE
  v_msg VARCHAR2(100);
BEGIN
  enrol_student('S03', 'C20', v_msg);
  DBMS_OUTPUT.PUT_LINE(v_msg);
END;
/`;
const SCRIPT = `VARIABLE msg VARCHAR2(100)
EXEC enrol_student('S03', 'C20', :msg)`;

const BY = 250;
const SY = 680;
const TB = {x: 1240, y: 300};
const gT = geom(ENROL_COLS, TB.x, TB.y);
const win = (f: number, a: number, b: number) => prog(f, a, a + 0.5) * (1 - prog(f, b, b + 0.5));

// 0.8 call it from a block · 2.2 declare a variable for the message · 4.3 pass it as the third argument
// · 8 in a script, EXEC in one line · 11.2 with a bind variable · 13.4 the table gains a row: S03 in C20
// · 17.6 no grade yet · 19.3 the variable holds the message
const CallInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const added = prog(f, 14.6, 15.4);
  const nullHl = prog(f, 17.8, 18.4);
  return (
    <SceneShell style={style}>
      <Narration scene="call" />
      <Heading name="Heading" premountFor={fps}>
        Calling a procedure
      </Heading>
      <SqlCode
        name="Block call"
        title="From a block"
        code={BLOCK}
        x={100}
        y={BY}
        width={820}
        size={28}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({
          highlight: i === 1 ? win(f, 2.4, 4.4) : i === 3 ? win(f, 4.6, 7) + prog(f, 13.6, 14.1) * (1 - prog(f, 16, 16.5)) : 0,
        })}
      />
      <SqlCode
        name="Script call"
        title="Or, in a script"
        code={SCRIPT}
        x={100}
        y={SY}
        width={820}
        size={28}
        opacity={prog(f, 8, 8.6)}
        line={(i) => ({highlight: i === 1 ? win(f, 9, 12.4) : i === 0 ? win(f, 11.2, 12.4) : 0, tone: i === 0 ? 'maroon' : 'orange'})}
      />
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={TB.x}
        y={TB.y}
        columns={ENROL_COLS}
        rows={cells(ENROL_ROWS)}
        style={{opacity: prog(f, 1.6, 2.4)}}
        rowOpacity={(r) => (r === NEW_ROW ? added : 1)}
        rowOffset={(r) => (r === NEW_ROW ? (1 - added) * 30 : 0)}
        cell={(r, c) =>
          r === NEW_ROW ? {bg: c === 2 && nullHl > 0 ? TONES.orange.soft : TONES.yellow.soft, outline: c === 2 ? Math.max(added * (1 - nullHl), nullHl) : added} : undefined
        }
      />
      <Arrow
        name="Call adds a row"
        from={{x: 930, y: codeLineY(BY, 3, 28)}}
        to={{x: TB.x - 14, y: gT.rowCy(NEW_ROW)}}
        progress={prog(f, 13.8, 14.8)}
        opacity={1 - prog(f, 19, 19.6)}
      />
      <Chip tone="yellow" size={30} style={{left: TB.x, top: gT.bottom(7) + 30, opacity: prog(f, 15.2, 15.9)}}>
        + 1 row
      </Chip>
      <Chip tone="orange" size={30} style={{left: TB.x + 180, top: gT.bottom(7) + 30, opacity: prog(f, 18, 18.7)}}>
        grade: NULL, not set yet
      </Chip>
      <OutputBox name="Message" label="v_msg" text="S03 enrolled in C20" x={100} y={880} width={820} opacity={prog(f, 20.2, 20.9)} />
    </SceneShell>
  );
};

export const CallScene = Interactive.withSchema({
  Component: CallInner,
  componentName: '<CallScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
