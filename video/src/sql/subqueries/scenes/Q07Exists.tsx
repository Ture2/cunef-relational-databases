import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, type Column} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {COURSE, COURSE_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {CodeBox, codeSpan, Narration} from '../shared';

const EXISTS = `SELECT c.title FROM course c
WHERE EXISTS (SELECT 1 FROM enrolment e
              WHERE e.course_id = c.course_id);`;
const NOT_EXISTS = `SELECT c.title FROM course c
WHERE NOT EXISTS (SELECT 1 FROM enrolment e
                  WHERE e.course_id = c.course_id);`;

const CX = 100;
const CY = 200;
const SELECT1 = codeSpan(CX, CY, 1, 14, 8);
const SELECT1_NOT = codeSpan(CX, CY, 1, 18, 8);

const Y = 560;
const CO_COLS = COURSE_COLS.slice(0, 2);
/* Enrolment rows the subquery finds for each course (Databases 3, Python 2, Statistics 1, Marketing 0). */
const FOUND = [3, 2, 1, 0];
const CHECK_COLS: Column[] = [
  {key: 'found', label: 'rows found', width: 200, tone: 'maroon'},
  {key: 'exists', label: 'EXISTS', width: 230, tone: 'teal'},
];
const RESULT_COLS: Column[] = [{key: 'title', label: 'title', width: 220, tone: 'orange'}];

// 0.8 a yes or no question: at least one row? what it selects does not matter: SELECT 1
// · 11.6 Databases, Python, Statistics have enrolments; Marketing none: NOT EXISTS → Marketing
// · 20.8 not fooled by NULLs
const ExistsInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const toNot = prog(f, 16.4, 17);
  const flip = f >= 17.2 * fps;
  const some = prog(f, 11.8, 12.4) * (1 - prog(f, 16, 16.6));
  const none = prog(f, 15, 15.6);
  const s1 = prog(f, 8.6, 9.2);
  const fx = (r: number) => (r === 3 && none > 0 ? {bg: TONES.orange.soft, outline: none} : r < 3 && some > 0 ? {bg: TONES.teal.soft, outline: some} : undefined);
  return (
    <SceneShell style={style}>
      <Narration scene="exists" />
      <Heading name="Heading" premountFor={fps}>
        EXISTS and NOT EXISTS
      </Heading>
      <SqlCode name="EXISTS query" code={EXISTS} x={CX} y={CY} width={1000} opacity={prog(f, 0.8, 1.4) * (1 - toNot)} />
      <SqlCode name="NOT EXISTS query" code={NOT_EXISTS} x={CX} y={CY} width={1000} opacity={toNot} line={(i) => ({highlight: i === 1 ? prog(f, 17, 17.6) : 0})} />
      <CodeBox name="SELECT 1" box={SELECT1} outline={s1 * (1 - toNot)} />
      <CodeBox name="SELECT 1 (NOT)" box={SELECT1_NOT} outline={s1 * toNot * (1 - prog(f, 17.6, 18.2))} />
      <DataTable
        name="Course"
        title="course c"
        x={100}
        y={Y}
        columns={CO_COLS}
        rows={COURSE.map((r) => [r[0], r[1]])}
        style={{opacity: prog(f, 2, 2.6)}}
        cell={fx}
      />
      <DataTable
        name="Check"
        title="For each course"
        titleOpacity={prog(f, 3, 3.6)}
        x={480}
        y={Y}
        columns={CHECK_COLS}
        rows={FOUND.map((n) => [n === 1 ? '1 row' : `${n} rows`, ''])}
        style={{opacity: prog(f, 3, 3.6)}}
        header={(c) => (c === 1 && flip ? {label: 'NOT EXISTS'} : undefined)}
        cell={(r, c) => {
          if (c === 0) return {opacity: prog(f, 3.6 + r * 0.4, 4.1 + r * 0.4)};
          const yes = flip ? FOUND[r] === 0 : FOUND[r] > 0;
          const t = flip ? prog(f, 17.2 + r * 0.15, 17.7 + r * 0.15) : prog(f, 5 + r * 0.35, 5.5 + r * 0.35);
          return {
            content: <b style={{color: yes ? TONES.teal.strong : TONES.orange.strong}}>{yes ? 'true' : 'false'}</b>,
            opacity: t,
            bg: yes && t > 0 ? TONES.teal.soft : undefined,
          };
        }}
      />
      <DataTable
        name="Result"
        title="Result: 1 row"
        x={1300}
        y={Y}
        columns={RESULT_COLS}
        rows={[['Marketing']]}
        style={{opacity: prog(f, 18.4, 19)}}
      />
      <Chip tone="maroon" size={32} style={{left: 1160, top: 220, opacity: prog(f, 7, 7.6)}}>
        What it selects does not matter
      </Chip>
      <Chip tone="teal" size={32} style={{left: 1160, top: 315, opacity: prog(f, 21.4, 22)}}>
        Not fooled by NULLs
      </Chip>
    </SceneShell>
  );
};

export const ExistsScene = Interactive.withSchema({
  Component: ExistsInner,
  componentName: '<ExistsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
