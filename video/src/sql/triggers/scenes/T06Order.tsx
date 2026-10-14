import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, FONT, TONES} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {Narration, Step} from '../shared';

const CODE = `CREATE OR REPLACE TRIGGER trg_grade_notice
AFTER UPDATE OF grade ON enrolment
BEGIN
  DBMS_OUTPUT.PUT_LINE('Grades updated at '
                       || TO_CHAR(SYSDATE, 'HH24:MI'));
END;`;

const STMT = `UPDATE enrolment
SET grade = grade + 0.5
WHERE course_id = 'C10';`;

/* Firing-order diagram geometry. */
const DY = 540;
const DH = 330;
const SW = 280;
const GW = 360;
const GAP = 30;
const BS_X = 80;
const GX = [0, 1, 2].map((i) => BS_X + SW + GAP + i * (GW + GAP));
const AS_X = GX[2] + GW + GAP;
const PILL_H = 76;
const PILL_Y = [600, 690, 780];

const ROWS = [
  {id: 'S01', change: '8.5 → 9.0'},
  {id: 'S02', change: '6.5 → 7.0'},
  {id: 'S03', change: '5.0 → 5.5'},
];
/* When each row's BEFORE row, change and AFTER row light up (the first row follows the voice). */
const ROW_AT = [
  [23, 24, 25.1],
  [25.7, 25.9, 26.1],
  [26.3, 26.5, 26.7],
];
const BS_AT = 19.9;
const AS_AT = 27.1;

// 0.8 without FOR EACH ROW: statement level; grade_notice fires once per update · 10 one update, three
// C10 rows: statement trigger once, row trigger three times · 18.2 the order: BEFORE statement · for every
// row BEFORE row, the change, AFTER row · AFTER statement last
const OrderInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const skeleton = prog(f, 11.4, 12);
  const lit = (at: number) => prog(f, at, at + 0.3);
  const glow = (at: number, next: number) => prog(f, at, at + 0.3) * (1 - prog(f, next, next + 0.3));
  return (
    <SceneShell style={style}>
      <Narration scene="order" />
      <Heading name="Heading" premountFor={fps}>
        Statement level vs row level
      </Heading>
      <SqlCode
        name="trg_grade_notice"
        code={CODE}
        x={80}
        y={200}
        width={880}
        size={26}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({
          opacity: prog(f, 0.8 + i * 0.25, 1.3 + i * 0.25),
          highlight: i === 0 ? prog(f, 4.8, 5.3) * (1 - prog(f, 9.4, 9.9)) : i === 1 ? prog(f, 2.4, 2.9) * (1 - prog(f, 9.4, 9.9)) : 0,
        })}
      />
      <Chip tone="orange" size={28} style={{left: 1020, top: 230, opacity: prog(f, 2.6, 3.2) * (1 - prog(f, 9.6, 10))}}>
        No FOR EACH ROW → statement level
      </Chip>
      <Chip tone="neutral" size={28} style={{left: 1020, top: 320, opacity: prog(f, 5.6, 6.2) * (1 - prog(f, 9.6, 10))}}>
        Fires once per UPDATE
      </Chip>
      <SqlCode name="UPDATE C10" code={STMT} x={1020} y={200} width={820} size={28} opacity={prog(f, 10, 10.6)} />
      <Chip tone="neutral" size={28} style={{left: 1020, top: 410, opacity: prog(f, 11, 11.6)}}>
        3 rows
      </Chip>

      <Step name="BEFORE statement" x={BS_X} y={DY} width={SW} height={DH} tone="teal" opacity={skeleton} lit={lit(BS_AT)} glow={glow(BS_AT, ROW_AT[0][0])} size={32}>
        BEFORE
        <br />
        statement
      </Step>
      {ROWS.map((r, i) => (
        <div key={r.id}>
          <Interactive.Div
            name={`Row ${r.id}`}
            style={{
              position: 'absolute',
              left: GX[i],
              top: DY,
              width: GW,
              height: DH,
              boxSizing: 'border-box',
              borderRadius: 16,
              border: `3px dashed ${C.rule}`,
              backgroundColor: 'rgba(255,255,255,0.4)',
              opacity: skeleton,
            }}
          >
            <div style={{position: 'absolute', left: 0, right: 0, top: 12, textAlign: 'center', fontFamily: FONT, fontSize: 28, fontWeight: 700, color: TONES.blue.strong}}>
              row {r.id}
            </div>
          </Interactive.Div>
          <Step name={`${r.id} BEFORE row`} x={GX[i] + 20} y={PILL_Y[0]} width={GW - 40} height={PILL_H} tone="teal" opacity={skeleton} lit={lit(ROW_AT[i][0])} glow={glow(ROW_AT[i][0], ROW_AT[i][1])} size={26} sub="trg_grade_check">
            BEFORE row
          </Step>
          <Step name={`${r.id} change`} x={GX[i] + 20} y={PILL_Y[1]} width={GW - 40} height={PILL_H} tone="orange" opacity={skeleton} lit={lit(ROW_AT[i][1])} glow={glow(ROW_AT[i][1], ROW_AT[i][2])} size={30}>
            {r.change}
          </Step>
          <Step name={`${r.id} AFTER row`} x={GX[i] + 20} y={PILL_Y[2]} width={GW - 40} height={PILL_H} tone="maroon" opacity={skeleton} lit={lit(ROW_AT[i][2])} glow={glow(ROW_AT[i][2], i < 2 ? ROW_AT[i + 1][0] : AS_AT)} size={26} sub="trg_grade_audit">
            AFTER row
          </Step>
        </div>
      ))}
      <Step name="AFTER statement" x={AS_X} y={DY} width={SW} height={DH} tone="maroon" opacity={skeleton} lit={lit(AS_AT)} glow={glow(AS_AT, 99)} size={32} sub="trg_grade_notice">
        AFTER
        <br />
        statement
      </Step>
      <Interactive.Svg name="Chevrons" width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0, opacity: skeleton, pointerEvents: 'none'}}>
        {[BS_X + SW, ...GX.map((x) => x + GW)].map((x) => (
          <polygon key={x} points={`${x + 7},${DY + DH / 2 - 12} ${x + 23},${DY + DH / 2} ${x + 7},${DY + DH / 2 + 12}`} fill={C.accent} />
        ))}
      </Interactive.Svg>
      <Chip tone="teal" size={30} style={{left: 80, top: 920, opacity: prog(f, 13.2, 13.8)}}>
        Statement trigger: once
      </Chip>
      <Chip tone="maroon" size={30} style={{left: 560, top: 920, opacity: prog(f, 15.2, 15.8)}}>
        Each row trigger: 3 times
      </Chip>
    </SceneShell>
  );
};

export const OrderScene = Interactive.withSchema({
  Component: OrderInner,
  componentName: '<OrderScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
