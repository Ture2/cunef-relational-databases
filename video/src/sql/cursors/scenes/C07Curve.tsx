import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, geom, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, TONES} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {InfoCard, Pointer} from '../../common/ui';
import {CURVED, GRADE_COLS, GRADES, Mono, Narration} from '../shared';

const CODE = `DECLARE
  CURSOR c_grades IS
    SELECT student_id, course_id, grade FROM enrolment
    ORDER BY course_id, student_id
    FOR UPDATE OF grade;
  v_new enrolment.grade%TYPE;
BEGIN
  FOR r IN c_grades LOOP
    v_new := CASE
      WHEN r.course_id = 'C10' AND r.grade < 5 THEN r.grade + 1
      WHEN r.course_id = 'C10' AND r.grade < 7 THEN r.grade + 0.5
      WHEN r.course_id = 'C20' THEN r.grade + 1
      ELSE r.grade END;
    UPDATE enrolment SET grade = LEAST(v_new, 10)
    WHERE CURRENT OF c_grades;
  END LOOP;
  COMMIT;
END;`;

const COLS: Column[] = [...GRADE_COLS, {key: 'curved', label: 'curved', width: 140, tone: 'orange'}];
const T = {x: 1210, y: 460};
const gT = geom(COLS, T.x, T.y);

const LOCK_AT = 15.4;
const POINTER_AT = 23.4;
/* When the pointer reaches each row (the voice reads the changes from 27). */
const VISITS = [26.6, 28.1, 29.4, 30.1, 31.2, 32.8];

// 0.8 a teacher curves the grades · 6 Databases: +1 or +0.5 · 10.5 Statistics: +1 · 14.8 FOR UPDATE locks
// the rows until the commit · 21.8 WHERE CURRENT OF updates the row under the pointer · 27 4 → 5, 6.5 → 7, 9.5 → 10
const CurveInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const row = VISITS.slice(1).reduce((a, t) => a + prog(f, t - 0.4, t), 0);
  const visited = (r: number) => prog(f, VISITS[r] + 0.2, VISITS[r] + 0.7);
  const hl = (from: number, to: number) => prog(f, from, from + 0.5) * (1 - prog(f, to, to + 0.5));
  const locked = prog(f, LOCK_AT + 0.4, LOCK_AT + 1);
  const pOn = prog(f, POINTER_AT, POINTER_AT + 0.6);
  const cardOut = prog(f, 14.4, 14.9);
  return (
    <SceneShell style={style}>
      <Narration scene="curve" />
      <Heading name="Heading" premountFor={fps}>
        FOR UPDATE and WHERE CURRENT OF
      </Heading>
      <SqlCode
        name="Curve block"
        code={CODE}
        x={80}
        y={210}
        width={940}
        size={24}
        opacity={prog(f, 0.8, 1.6)}
        line={(i) => ({
          highlight:
            i === 9 || i === 10
              ? hl(6, 10.4)
              : i === 11
                ? hl(10.4, 13.6)
                : i === 4
                  ? hl(LOCK_AT, 21.4)
                  : i === 14
                    ? hl(22, 34.6)
                    : 0,
        })}
      />
      <InfoCard name="The curve" title="The curve" x={1080} y={200} width={740} tone="orange" titleSize={30} size={26} opacity={prog(f, 2.2, 2.8) * (1 - cardOut)}>
        Databases: below 5 → +1, below 7 → +0.5
        <br />
        Statistics: +1 · never above 10
      </InfoCard>
      <Chip tone="yellow" size={28} style={{left: 1080, top: 220, opacity: prog(f, LOCK_AT, LOCK_AT + 0.6)}}>
        <span>
          <Mono size={28}>FOR UPDATE</Mono>: rows locked until COMMIT
        </span>
      </Chip>
      <Chip tone="orange" size={28} style={{left: 1080, top: 305, opacity: prog(f, 22.2, 22.8)}}>
        <span>
          <Mono size={28}>WHERE CURRENT OF</Mono>: the row under the pointer
        </span>
      </Chip>
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={T.x}
        y={T.y}
        columns={COLS}
        rows={GRADES.map((r, i) => [...r, CURVED[i]])}
        style={{opacity: prog(f, 1.6, 2.4)}}
        header={(c) => ({tint: c === 3 ? prog(f, 26, 26.6) : 1})}
        colOpacity={(c) => (c === 3 ? prog(f, 26, 26.6) : 1)}
        cell={(r, c) => {
          const changed = CURVED[r] !== GRADES[r][2];
          const here = pOn > 0 ? Math.max(0, 1 - Math.abs(row - r) * 2) * pOn : 0;
          if (c === 3) {
            return {
              opacity: visited(r),
              color: changed ? TONES.orange.strong : C.muted,
              content: changed ? <b>{CURVED[r]}</b> : '=',
              bg: here > 0 ? TONES.orange.soft : undefined,
              outline: here,
            };
          }
          return {
            bg: here > 0 ? TONES.orange.soft : locked > 0 ? TONES.yellow.soft : undefined,
            outline: here,
            strike: c === 2 && changed ? prog(f, VISITS[r] + 0.2, VISITS[r] + 0.6) : 0,
            color: c === 2 && changed && f >= (VISITS[r] + 0.2) * 30 ? C.muted : undefined,
          };
        }}
      />
      <Pointer name="Cursor pointer" x={T.x - 56} y={gT.rowCy(row)} opacity={pOn} />
    </SceneShell>
  );
};

export const CurveScene = Interactive.withSchema({
  Component: CurveInner,
  componentName: '<CurveScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
