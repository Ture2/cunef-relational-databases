import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {CODE_PAD, lineHeight, SqlCode} from '../../common/SqlCode';
import {OraError} from '../../common/ui';
import {Narration} from '../shared';

const SIZE = 28;
const LH = lineHeight(SIZE);
const panelH = (lines: number) => lines * LH + CODE_PAD * 2;
const ERR_H = 74;
const ERR_X = 1020;

type Case = {
  readonly code: string;
  readonly y: number;
  readonly at: number;
  readonly err: readonly [string, string];
  readonly errAt: number;
  /** [line, start] of each highlight. */
  readonly marks: readonly (readonly [number, number])[];
};

const CASES: readonly Case[] = [
  {code: `SELECT name, COUNT(*)\nFROM student;`, y: 210, at: 1, err: ['ORA-00937', 'not a single-group group function'], errAt: 6.6, marks: [[0, 3]]},
  {
    code: `SELECT student_id, COUNT(*)\nFROM enrolment\nGROUP BY course_id;`,
    y: 400,
    at: 12.6,
    err: ['ORA-00979', 'not a GROUP BY expression'],
    errAt: 17.4,
    marks: [
      [0, 13.4],
      [2, 15],
    ],
  },
  {
    code: `SELECT course_id FROM enrolment\nWHERE AVG(grade) > 7\nGROUP BY course_id;`,
    y: 640,
    at: 21.4,
    err: ['ORA-00934', 'group function is not allowed here'],
    errAt: 23.6,
    marks: [[1, 22.4]],
  },
];

// 0.8 three errors: plain column + aggregate without GROUP BY: ORA-00937 · 12.6 every column outside an
// aggregate must be in the GROUP BY: ORA-00979 · 21.4 aggregate in WHERE: ORA-00934; move it to HAVING
const ErrorsInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <Narration scene="errors" />
      <Heading name="Heading" premountFor={fps}>
        Three common errors
      </Heading>
      {CASES.map((cs, k) => {
        const lines = cs.code.split('\n').length;
        return (
          <div key={cs.err[0]}>
            <SqlCode
              name={`Query ${k + 1}`}
              code={cs.code}
              x={100}
              y={cs.y}
              width={880}
              size={SIZE}
              opacity={prog(f, cs.at, cs.at + 0.6)}
              line={(i) => {
                const m = cs.marks.filter(([l]) => l === i)[0];
                return {
                  highlight: m ? prog(f, m[1], m[1] + 0.6) : 0,
                  strike: k === 2 && i === 1 ? prog(f, 26, 26.8) : 0,
                };
              }}
            />
            <OraError
              name={`Error ${cs.err[0]}`}
              code={cs.err[0]}
              message={cs.err[1]}
              x={ERR_X}
              y={cs.y + (panelH(lines) - ERR_H) / 2}
              width={820}
              size={26}
              opacity={prog(f, cs.errAt, cs.errAt + 0.6)}
            />
          </div>
        );
      })}
      <Chip tone="teal" size={32} style={{left: ERR_X, top: 870, opacity: prog(f, 26.4, 27.2)}}>
        Fix: HAVING AVG(grade) &gt; 7
      </Chip>
    </SceneShell>
  );
};

export const AggErrorsScene = Interactive.withSchema({
  Component: ErrorsInner,
  componentName: '<AggErrorsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
