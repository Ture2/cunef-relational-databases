import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, FONT, TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {MONO, SqlCode} from '../../common/SqlCode';
import {CodeBox, codeSpan, Narration, Val, ValuePanel} from '../shared';

const CODE = `SELECT student_id, course_id, grade
FROM enrolment
WHERE grade NOT IN (SELECT grade FROM enrolment
                    WHERE course_id = 'C11');`;
const INSERT = `INSERT INTO enrolment VALUES ('S01', 'C11', NULL);`;

const CX = 100;
const CY = 200;
const NOT_IN = codeSpan(CX, CY, 2, 12, 6);
/* The grades not in (9.0, 7.5): every row but the two Python ones. */
const KEPT = [0, 1, 2, 4];

/* "8.5 <> 9.0 AND 8.5 <> 7.5 AND 8.5 <> NULL", piece by piece, with the truth value under each test. */
const EX_SIZE = 34;
const EX_X = 100;
const EX_Y = 660;
const PIECES = [
  {text: '8.5 <> 9.0', col: 0, at: 19.4, truth: 'true', truthAt: 20.6},
  {text: ' AND ', col: 10, at: 20, truth: '', truthAt: 0},
  {text: '8.5 <> 7.5', col: 15, at: 20.2, truth: 'true', truthAt: 21},
  {text: ' AND ', col: 25, at: 20.8, truth: '', truthAt: 0},
  {text: '8.5 <> NULL', col: 30, at: 21, truth: 'unknown', truthAt: 22.6},
];
const CH = 0.55 * EX_SIZE;

// 0.8 a trap: NOT IN keeps the grades not in the list; Python's 9 and 7.5 → 4 rows · 11.2 one Python
// enrolment without a grade: the list holds a NULL; no rows · 18.9 different from NULL is unknown,
// never true · 27.3 filter out the NULLs, or NOT EXISTS
const NotInInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const gone = prog(f, 16.4, 17.2);
  return (
    <SceneShell style={style}>
      <Narration scene="notin" />
      <Heading name="Heading" premountFor={fps}>
        The NOT IN trap
      </Heading>
      <SqlCode name="Query" code={CODE} x={CX} y={CY} width={1000} opacity={prog(f, 0.8, 1.4)} line={(i) => ({opacity: prog(f, 0.8 + i * 0.3, 1.3 + i * 0.3)})} />
      <CodeBox name="NOT IN" box={NOT_IN} outline={prog(f, 2.4, 3)} />
      <SqlCode
        name="Insert"
        code={INSERT}
        x={CX}
        y={470}
        width={1000}
        opacity={prog(f, 11.4, 12)}
        line={() => ({highlight: prog(f, 12.2, 12.8)})}
      />
      <ValuePanel name="The list" title="The list: Python grades" x={1160} y={200} width={500} opacity={prog(f, 5, 5.6)} outline={prog(f, 14.8, 15.4) * (1 - prog(f, 18, 18.6))}>
        <Val t={prog(f, 6.6, 7.2)}>9.0</Val>
        <span style={{display: 'inline-block', width: 40}} />
        <Val t={prog(f, 7.6, 8.2)}>7.5</Val>
        <span style={{display: 'inline-block', width: 40}} />
        <Val t={prog(f, 14.8, 15.4)} color={TONES.orange.strong}>
          <b>NULL</b>
        </Val>
      </ValuePanel>
      <DataTable
        name="Result"
        title={gone > 0.5 ? 'Result: 0 rows' : 'Result: 4 rows'}
        x={1260}
        y={600}
        columns={ENROLMENT_COLS}
        rows={KEPT.map((r) => [...ENROLMENT[r]])}
        style={{opacity: prog(f, 8.4, 9)}}
        rowOpacity={(i) => prog(f, 8.6 + i * 0.35, 9.2 + i * 0.35) * (1 - gone)}
      />
      <Chip tone="orange" size={30} style={{left: 1260, top: 690, opacity: prog(f, 17.2, 17.8), fontFamily: MONO}}>
        no rows selected
      </Chip>
      {/* For the row with 8.5: grade NOT IN (9.0, 7.5, NULL) */}
      <Interactive.Div name="Expansion title" style={{position: 'absolute', left: EX_X, top: EX_Y - 54, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: C.muted, opacity: prog(f, 19, 19.6)}}>
        8.5 NOT IN (9.0, 7.5, NULL) means:
      </Interactive.Div>
      {PIECES.map((p) => (
        <Interactive.Div
          key={p.col}
          name={`Piece ${p.col}`}
          style={{position: 'absolute', left: EX_X + p.col * CH, top: EX_Y, fontFamily: MONO, fontSize: EX_SIZE, whiteSpace: 'pre', color: p.truth ? C.ink : TONES.teal.strong, fontWeight: p.truth ? 400 : 700, opacity: prog(f, p.at, p.at + 0.5)}}
        >
          {p.text}
        </Interactive.Div>
      ))}
      {PIECES.filter((p) => p.truth).map((p) => {
        const unknown = p.truth === 'unknown';
        const tone = unknown ? TONES.orange : TONES.teal;
        return (
          <Interactive.Div
            key={p.col}
            name={`Truth ${p.col}`}
            style={{
              position: 'absolute',
              left: EX_X + p.col * CH,
              top: EX_Y + 60,
              width: p.text.length * CH,
              textAlign: 'center',
              fontFamily: FONT,
              fontSize: 30,
              fontWeight: 700,
              color: tone.strong,
              opacity: prog(f, p.truthAt, p.truthAt + 0.5),
              borderTop: `4px solid ${tone.strong}`,
              paddingTop: 6,
            }}
          >
            {p.truth}
          </Interactive.Div>
        );
      })}
      <Chip tone="orange" size={32} style={{left: EX_X, top: 800, opacity: prog(f, 24.6, 25.2)}}>
        Never true: no row passes
      </Chip>
      <Chip tone="teal" size={30} style={{left: EX_X, top: 910, opacity: prog(f, 27.6, 28.2)}}>
        <span style={{fontFamily: MONO}}>AND grade IS NOT NULL</span>
      </Chip>
      <Chip tone="teal" size={30} style={{left: 560, top: 910, opacity: prog(f, 29.2, 29.8)}}>
        or <span style={{fontFamily: MONO}}>NOT EXISTS</span>
      </Chip>
    </SceneShell>
  );
};

export const NotInScene = Interactive.withSchema({
  Component: NotInInner,
  componentName: '<NotInScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
