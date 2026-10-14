import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {Pointer} from '../../common/ui';
import {GRADE_COLS, GRADES, Mono, Narration, RecordBox, StepStrip} from '../shared';

const CODE = `DECLARE
  CURSOR c_grades IS
    SELECT student_id, course_id, grade
    FROM enrolment
    ORDER BY course_id, student_id;
  r c_grades%ROWTYPE;
BEGIN
  OPEN c_grades;
  LOOP
    FETCH c_grades INTO r;
    EXIT WHEN c_grades%NOTFOUND;
    -- work with r
  END LOOP;
  CLOSE c_grades;
END;`;

const T = {x: 1250, y: 300};
const gT = geom(GRADE_COLS, T.x, T.y);

const OPEN_AT = 9.2;
/* The six FETCHes that return a row, then the seventh that finds nothing. */
const FETCHES = [16.2, 19.4, 20.4, 21.3, 22.2, 23.1];
const FAIL_AT = 25.2;
const NOTFOUND_AT = 27.4;
const CLOSE_AT = 32.6;

const fetched = (f: number) => FETCHES.filter((t) => f >= t * 30).length;

// 0.8 a fixed lifecycle · 4.1 declare it: a name and its query · 8.4 OPEN runs the query, the pointer
// waits before the first row · 15 each FETCH copies the current row into r and moves the pointer down
// · 24 after the last row FETCH finds nothing; NOTFOUND is true, EXIT WHEN leaves · 32.4 CLOSE
const LifecycleInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  // Pointer row: -0.5 (before row 1) after OPEN, row k-1 after the k-th FETCH, 6 (past the end) after the failed one.
  const moves = [...FETCHES, FAIL_AT].map((t, k) => prog(f, t, t + 0.4) * (k === 0 ? 0.5 : 1));
  const row = -0.5 + moves.reduce((a, b) => a + b, 0);
  const n = fetched(f);
  const current = n > 0 ? GRADES[n - 1] : null;
  const flash = n > 0 ? 1 - prog(f, FETCHES[n - 1] + 0.2, FETCHES[n - 1] + 0.9) : 0;
  const closed = prog(f, CLOSE_AT + 0.4, CLOSE_AT + 1.2);
  const pOn = prog(f, OPEN_AT + 0.6, OPEN_AT + 1.2) * (1 - closed);
  const hl = (from: number, to: number) => prog(f, from, from + 0.5) * (1 - prog(f, to, to + 0.5));
  const step = (i: number) =>
    i === 0 ? hl(4.1, 8.4) : i === 1 ? hl(8.4, 15) : i === 2 ? hl(15, 32.4) : prog(f, CLOSE_AT, CLOSE_AT + 0.5);
  return (
    <SceneShell style={style}>
      <Narration scene="lifecycle" />
      <Heading name="Heading" premountFor={fps}>
        The explicit cursor lifecycle
      </Heading>
      <SqlCode
        name="Explicit cursor"
        code={CODE}
        x={100}
        y={210}
        width={760}
        size={26}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({
          opacity: i <= 5 ? prog(f, 1 + i * 0.3, 1.5 + i * 0.3) : i <= 7 ? prog(f, 8.4, 9) : i <= 12 ? prog(f, 15, 15.6) : prog(f, 15.2, 15.8),
          highlight:
            i >= 1 && i <= 4
              ? hl(4.1, 8.4)
              : i === 7
                ? hl(8.4, 15)
                : i === 9
                  ? hl(15.6, 26.2)
                  : i === 10
                    ? hl(NOTFOUND_AT, 32.2)
                    : i === 13
                      ? prog(f, CLOSE_AT, CLOSE_AT + 0.5)
                      : 0,
        })}
      />
      <DataTable
        name="Result set"
        title="Result of the query"
        x={T.x}
        y={T.y}
        columns={GRADE_COLS}
        rows={GRADES.map((r) => [...r])}
        style={{opacity: prog(f, OPEN_AT, OPEN_AT + 0.8) * (1 - 0.6 * closed)}}
        cell={(r) => (r === n - 1 && n > 0 && f < FAIL_AT * 30 ? {bg: TONES.orange.soft, outline: 1} : undefined)}
      />
      <Pointer name="Cursor pointer" x={T.x - 56} y={gT.rowCy(row)} opacity={pOn} />
      <Chip tone="neutral" size={24} style={{left: T.x - 300, top: gT.rowCy(-0.5) - 24, opacity: pOn * (1 - prog(f, FETCHES[0], FETCHES[0] + 0.3))}}>
        before row 1
      </Chip>
      <Chip tone="neutral" size={24} style={{left: T.x - 250, top: gT.rowCy(6) - 24, opacity: pOn * prog(f, FAIL_AT + 0.3, FAIL_AT + 0.8)}}>
        no row
      </Chip>
      <RecordBox
        name="Record r"
        label="r"
        values={current ? [...current] : ['', '', '']}
        widths={[150, 150, 110]}
        x={T.x - 4}
        y={780}
        opacity={prog(f, 15.6, 16.2) * (1 - 0.6 * closed)}
        flash={flash}
      />
      <Chip tone="orange" size={28} style={{left: 1040, top: 880, opacity: prog(f, NOTFOUND_AT, NOTFOUND_AT + 0.6) * (1 - prog(f, CLOSE_AT, CLOSE_AT + 0.4))}}>
        <span>
          <Mono size={28}>c_grades%NOTFOUND</Mono> = TRUE → EXIT
        </span>
      </Chip>
      <StepStrip name="Lifecycle steps" x={100} y={900} active={step} opacity={prog(f, 1.2, 2)} />
      <Chip tone="maroon" size={28} style={{left: 1040, top: 880, opacity: prog(f, CLOSE_AT + 0.4, CLOSE_AT + 1)}}>
        Closed: memory freed
      </Chip>
    </SceneShell>
  );
};

export const LifecycleScene = Interactive.withSchema({
  Component: LifecycleInner,
  componentName: '<LifecycleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
