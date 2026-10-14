import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, FONT} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {Narration} from '../shared';

const LOOP = `FOR r IN c_grades LOOP
  -- compute v_new for this row
  UPDATE enrolment SET grade = v_new
  WHERE CURRENT OF c_grades;
END LOOP;`;

const SET_BASED = `UPDATE enrolment
SET grade = LEAST(10, grade + CASE
    WHEN course_id = 'C10' AND grade < 5 THEN 1
    WHEN course_id = 'C10' AND grade < 7 THEN 0.5
    WHEN course_id = 'C20' THEN 1
    ELSE 0
  END);`;

const KEEP = [
  {label: 'Several steps per row', at: 20, x: 80},
  {label: 'Procedure calls', at: 21.6, x: 520},
  {label: 'Decisions that depend on earlier rows', at: 22.9, x: 880},
];

// 0.8 a cursor loop when one UPDATE would do · 6.4 a formula on its own values: one set-based
// statement, the whole table at once · 13.6 much faster · 16.6 keep cursors for: steps, calls, decisions
const MistakeInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dim = prog(f, 10, 10.8);
  return (
    <SceneShell style={style}>
      <Narration scene="mistake" />
      <Heading name="Heading" premountFor={fps}>
        Prefer one set-based UPDATE
      </Heading>
      <SqlCode name="Cursor loop" code={LOOP} title="Row by row" x={80} y={280} width={780} size={24} opacity={prog(f, 1.2, 1.8) * (1 - 0.45 * dim)} />
      <Chip tone="orange" size={28} style={{left: 80, top: 560, opacity: prog(f, 3.4, 4)}}>
        One UPDATE per row
      </Chip>
      <SqlCode
        name="Set-based update"
        code={SET_BASED}
        title="One statement"
        x={960}
        y={280}
        width={880}
        size={24}
        opacity={prog(f, 6.6, 7.4)}
        line={(i) => ({highlight: i === 1 ? prog(f, 7.4, 8) * (1 - prog(f, 15, 15.5)) : 0})}
      />
      <Chip tone="teal" size={28} style={{left: 960, top: 630, opacity: prog(f, 10.4, 11)}}>
        The whole table at once
      </Chip>
      <Chip tone="teal" size={28} style={{left: 1390, top: 630, opacity: prog(f, 13.6, 14.2)}}>
        Much faster
      </Chip>
      <Interactive.Div
        name="Keep cursors for"
        style={{position: 'absolute', left: 80, top: 770, fontFamily: FONT, fontSize: 36, fontWeight: 700, color: C.ink, opacity: prog(f, 16.8, 17.4)}}
      >
        Keep cursors for work one statement cannot express:
      </Interactive.Div>
      {KEEP.map((k) => (
        <Chip key={k.label} tone="blue" size={30} style={{left: k.x, top: 850, opacity: prog(f, k.at, k.at + 0.6)}}>
          {k.label}
        </Chip>
      ))}
    </SceneShell>
  );
};

export const MistakeScene = Interactive.withSchema({
  Component: MistakeInner,
  componentName: '<MistakeScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
