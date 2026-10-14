import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {SqlCode} from '../../common/SqlCode';
import {Narration, PlanPanel, planHeight, TARGET_EMAIL} from '../shared';

const CODE = `EXPLAIN PLAN FOR SELECT * FROM customer WHERE email = '${TARGET_EMAIL}';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);`;

const BEFORE = ['| Id | Operation         | Name     |', '|  0 | SELECT STATEMENT  |          |', '|  1 |  TABLE ACCESS FULL| CUSTOMER |'];
const AFTER = [
  '| Id | Operation                   | Name               |',
  '|  0 | SELECT STATEMENT            |                    |',
  '|  1 |  TABLE ACCESS BY INDEX ROWID| CUSTOMER           |',
  '|* 2 |   INDEX RANGE SCAN          | IDX_CUSTOMER_EMAIL |',
];
const PLAN_Y = 430;
const AFTER_X = 820;
const AFTER_BOTTOM = PLAN_Y + planHeight(AFTER.length);

// 0.8 EXPLAIN PLAN shows how Oracle will run a query · 5.4 before: TABLE ACCESS FULL (8.2), every row (10.1)
// · 10.6 after: INDEX RANGE SCAN (11.6) finds the ROWID (13.8), TABLE ACCESS BY INDEX ROWID (14.8) fetches that row (18.7)
// · 19.4 same result (22.1); PK and UNIQUE get an index automatically (23.5–27.5)
const PlanInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const after = prog(f, 10.6, 11.2);
  return (
    <SceneShell style={style}>
      <Narration scene="plan" />
      <Heading name="Heading" premountFor={fps}>
        EXPLAIN PLAN
      </Heading>
      <SqlCode
        name="Explain"
        code={CODE}
        x={100}
        y={200}
        width={1720}
        size={28}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({opacity: prog(f, 0.8 + i * 1.2, 1.4 + i * 1.2)})}
      />
      <PlanPanel
        name="Plan before"
        title="Before the index"
        lines={BEFORE}
        x={100}
        y={PLAN_Y}
        width={640}
        opacity={prog(f, 5.4, 6) * (1 - 0.45 * after)}
        line={(i) => ({highlight: i === 2 ? prog(f, 6.8, 7.4) : 0})}
      />
      <Chip tone="orange" size={30} style={{left: 100, top: PLAN_Y + planHeight(BEFORE.length) + 30, opacity: prog(f, 8.6, 9.2) * (1 - 0.45 * after)}}>
        every row: 50,000
      </Chip>
      <PlanPanel
        name="Plan after"
        title="After CREATE INDEX"
        lines={AFTER}
        x={AFTER_X}
        y={PLAN_Y}
        width={1020}
        opacity={after}
        line={(i) => ({highlight: i === 3 ? prog(f, 11.6, 12.2) : i === 2 ? prog(f, 14.8, 15.4) : 0, tone: 'teal'})}
      />
      <Chip tone="teal" size={30} style={{left: AFTER_X, top: AFTER_BOTTOM + 30, opacity: prog(f, 12.8, 13.6)}}>
        ① INDEX RANGE SCAN → the ROWID
      </Chip>
      <Chip tone="blue" size={30} style={{left: AFTER_X, top: AFTER_BOTTOM + 120, opacity: prog(f, 16.4, 17.2)}}>
        ② TABLE ACCESS BY INDEX ROWID → that one row
      </Chip>
      <Chip tone="neutral" size={32} style={{left: 100, top: 880, opacity: prog(f, 20, 20.8)}}>
        Same result
      </Chip>
      <Chip tone="yellow" size={32} style={{left: 420, top: 880, opacity: prog(f, 23.6, 24.4)}}>
        PRIMARY KEY · UNIQUE → index created automatically
      </Chip>
    </SceneShell>
  );
};

export const PlanScene = Interactive.withSchema({
  Component: PlanInner,
  componentName: '<PlanScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
