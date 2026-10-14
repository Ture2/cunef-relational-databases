import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {SqlCode} from '../../common/SqlCode';
import {Narration, PlanPanel} from '../shared';

const QUERY = `SELECT * FROM customer
WHERE LOWER(email) = 'user77@mail.com';`;
const FIX = `CREATE INDEX idx_email_lower
  ON customer (LOWER(email));`;

const IDX_COLS: Column[] = [{key: 'email', label: 'email (sorted)', width: 340, tone: 'teal'}];
const IDX_ROWS = [['user1@mail.com'], ['user10@mail.com'], ['⋮'], ['user77@mail.com']];

const BEFORE = ['| Id | Operation         | Name     |', '|  0 | SELECT STATEMENT  |          |', '|  1 |  TABLE ACCESS FULL| CUSTOMER |'];
const AFTER = [
  '| Id | Operation                   | Name            |',
  '|  0 | SELECT STATEMENT            |                 |',
  '|  1 |  TABLE ACCESS BY INDEX ROWID| CUSTOMER        |',
  '|* 2 |   INDEX RANGE SCAN          | IDX_EMAIL_LOWER |',
];
const RX = 1080;

// 0.8 one more trap (1.9): a function on the column (4.0), LOWER(email) (5.4), the index on email (7.1) can't be used (8.5)
// · 9.8 the index is sorted by email (12.0), not by LOWER(email) (13.8), so Oracle scans again (16.0)
// · 17.2 the fix (18.2): a function-based index (19.7) on exactly that expression (21.7)
const FunctionsInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <Narration scene="functions" />
      <Heading name="Heading" premountFor={fps}>
        Functions hide the index
      </Heading>
      <SqlCode
        name="Query"
        code={QUERY}
        x={100}
        y={200}
        width={900}
        size={28}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({highlight: i === 1 ? prog(f, 3.4, 4) : 0})}
      />
      <DataTable
        name="Index on email"
        title="idx_customer_email"
        x={100}
        y={430}
        columns={IDX_COLS}
        rows={IDX_ROWS}
        style={{opacity: prog(f, 6.2, 6.8)}}
        header={() => ({outline: prog(f, 10.6, 11.2) * (1 - prog(f, 13.4, 14))})}
      />
      <Chip tone="teal" size={30} style={{left: 480, top: 450, opacity: prog(f, 10.8, 11.6)}}>
        ✓ sorted by email
      </Chip>
      <Chip tone="orange" size={30} style={{left: 480, top: 545, opacity: prog(f, 12.6, 13.4)}}>
        ✗ not by LOWER(email)
      </Chip>
      <PlanPanel
        name="Plan before"
        title="Plan"
        lines={BEFORE}
        x={RX}
        y={250}
        width={640}
        opacity={prog(f, 7, 7.6) * (1 - 0.45 * prog(f, 19.6, 20.2))}
        line={(i) => ({highlight: i === 2 ? prog(f, 14.4, 15) : 0})}
      />
      <Chip tone="orange" size={30} style={{left: RX, top: 445, opacity: prog(f, 14.8, 15.6) * (1 - 0.45 * prog(f, 19.6, 20.2))}}>
        Full scan again
      </Chip>
      <SqlCode
        name="Function-based index"
        title="The fix: a function-based index"
        code={FIX}
        x={100}
        y={820}
        width={900}
        size={28}
        opacity={prog(f, 17.6, 18.2)}
        line={(i) => ({highlight: i === 1 ? prog(f, 20, 20.6) : 0})}
      />
      <PlanPanel
        name="Plan after"
        title="Plan with idx_email_lower"
        lines={AFTER}
        x={RX}
        y={820}
        width={760}
        size={24}
        opacity={prog(f, 19.4, 20)}
        line={(i) => ({highlight: i === 3 ? prog(f, 20.4, 21) : 0, tone: 'teal'})}
      />
    </SceneShell>
  );
};

export const FunctionsScene = Interactive.withSchema({
  Component: FunctionsInner,
  componentName: '<FunctionsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
