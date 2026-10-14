import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable} from '../../../components/DataTable';
import {Heading, SceneShell} from '../../../components/Shell';
import {C, FONT, TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {CodeBox, codeSpan, Narration} from '../shared';

const ALL = `SELECT student_id, course_id, grade
FROM enrolment
WHERE grade > ALL (SELECT grade FROM enrolment
                   WHERE course_id = 'C10');`;
const ANY = `SELECT student_id, course_id, grade
FROM enrolment
WHERE course_id <> 'C10'
  AND grade > ANY (SELECT grade FROM enrolment
                   WHERE course_id = 'C10');`;

const CX = 100;
const CY = 200;
const INNER_LINE = codeSpan(CX, CY, 2, 18, 28);
const INNER = {...INNER_LINE, height: INNER_LINE.height * 2};

/* The number line: grade → scene x. */
const LY = 900;
const X = (v: number) => 420 + (v - 5) * 300;
const LANE_LIST = LY - 80;
const LANE_OTHER = LY - 190;
/* The list (Databases grades) and the other grades, with when each one appears. */
const LIST = [
  {v: 5, label: '5.0', at: 6.3},
  {v: 6.5, label: '6.5', at: 7.1},
  {v: 8.5, label: '8.5', at: 8.3},
];
const OTHERS = [
  {v: 7, label: '7.0', all: false, anyAt: 24.8},
  {v: 7.5, label: '7.5', all: false, anyAt: 25.2},
  {v: 9, label: '9.0', all: true, anyAt: 25.6},
];
const ANY_ROWS = [1, 3, 5];

const Dot: React.FC<{readonly x: number; readonly y: number; readonly label: string; readonly fill: string; readonly ring: number; readonly opacity: number; readonly side?: boolean}> = ({
  x,
  y,
  label,
  fill,
  ring,
  opacity,
  side = false,
}) => (
  <g opacity={opacity}>
    {ring > 0 ? <circle cx={x} cy={y} r={34} fill="none" stroke={TONES.teal.strong} strokeWidth={6} opacity={ring} /> : null}
    <circle cx={x} cy={y} r={22} fill={fill} />
    <text x={side ? x + 34 : x} y={side ? y + 11 : y - 40} textAnchor={side ? 'start' : 'middle'} fontFamily={FONT} fontSize={32} fontWeight={700} fill={C.ink}>
      {label}
    </text>
  </g>
);

// 0.8 ANY and ALL compare with a whole list; the Databases grades 5, 6.5, 8.5 · 10.4 > ALL: above the
// largest, 8.5; only Python's 9 passes · 19.2 > ANY: above the smallest, 5; the three other grades pass
const AnyAllInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const toAny = prog(f, 19.2, 19.8);
  const allZone = prog(f, 13.4, 14.4) * (1 - toAny);
  const anyZone = prog(f, 22.4, 23.4);
  const axis = prog(f, 2.6, 3.4);
  return (
    <SceneShell style={style}>
      <Narration scene="anyall" />
      <Heading name="Heading" premountFor={fps}>
        ANY and ALL
      </Heading>
      <SqlCode
        name="ALL query"
        code={ALL}
        x={CX}
        y={CY}
        width={1000}
        opacity={prog(f, 0.8, 1.4) * (1 - toAny)}
        line={(i) => ({highlight: i === 2 ? prog(f, 10.4, 11) : 0})}
      />
      <CodeBox name="The list" box={INNER} outline={prog(f, 4.8, 5.4) * (1 - prog(f, 9.6, 10.2))} />
      <SqlCode
        name="ANY query"
        code={ANY}
        x={CX}
        y={CY}
        width={1000}
        opacity={toAny}
        line={(i) => ({highlight: i === 3 ? prog(f, 19.8, 20.4) * (1 - prog(f, 24.4, 25)) : i === 2 ? prog(f, 25, 25.6) : 0})}
      />
      <DataTable
        name="ALL result"
        title="> ALL: 1 row"
        x={1200}
        y={260}
        columns={ENROLMENT_COLS}
        rows={[[...ENROLMENT[3]]]}
        style={{opacity: prog(f, 16.4, 17) * (1 - toAny)}}
      />
      <DataTable
        name="ANY result"
        title="> ANY: 3 rows"
        x={1200}
        y={260}
        columns={ENROLMENT_COLS}
        rows={ANY_ROWS.map((r) => [...ENROLMENT[r]])}
        style={{opacity: prog(f, 24.6, 25)}}
        rowOpacity={(i) => prog(f, OTHERS[0].anyAt + i * 0.4, OTHERS[0].anyAt + i * 0.4 + 0.6)}
      />
      <Interactive.Svg name="Number line" width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {/* Shaded zones: what passes > ALL, then > ANY. */}
        <rect x={X(8.5)} y={LY - 260} width={X(9.6) - X(8.5)} height={260} fill={TONES.teal.soft} opacity={allZone} />
        <rect x={X(5)} y={LY - 260} width={X(9.6) - X(5)} height={260} fill={TONES.teal.soft} opacity={anyZone} />
        <line x1={X(8.5)} y1={LY - 270} x2={X(8.5)} y2={LY} stroke={C.accent} strokeWidth={5} strokeDasharray="12 10" opacity={allZone} />
        <line x1={X(5)} y1={LY - 270} x2={X(5)} y2={LY} stroke={C.accent} strokeWidth={5} strokeDasharray="12 10" opacity={anyZone} />
        <text x={X(8.5) - 16} y={LY - 280} textAnchor="end" fontFamily={FONT} fontSize={34} fontWeight={700} fill={TONES.orange.strong} opacity={allZone}>
          {'> ALL: above the largest'}
        </text>
        <text x={X(5) + 16} y={LY - 280} fontFamily={FONT} fontSize={34} fontWeight={700} fill={TONES.orange.strong} opacity={anyZone}>
          {'> ANY: above the smallest'}
        </text>
        {/* Axis */}
        <g opacity={axis}>
          <line x1={X(4.6)} y1={LY} x2={X(9.6)} y2={LY} stroke={C.ink} strokeWidth={4} />
          {[5, 6, 7, 8, 9].map((v) => (
            <g key={v}>
              <line x1={X(v)} y1={LY - 10} x2={X(v)} y2={LY + 10} stroke={C.ink} strokeWidth={3} />
              <text x={X(v)} y={LY + 50} textAnchor="middle" fontFamily={FONT} fontSize={30} fill={C.muted}>
                {v}
              </text>
            </g>
          ))}
        </g>
        {/* Lanes */}
        <text x={X(4.6) - 20} y={LANE_LIST + 10} textAnchor="end" fontFamily={FONT} fontSize={30} fontWeight={700} fill={TONES.orange.strong} opacity={prog(f, 5.2, 5.8)}>
          Databases
        </text>
        <text x={X(4.6) - 20} y={LANE_OTHER + 10} textAnchor="end" fontFamily={FONT} fontSize={30} fontWeight={700} fill={TONES.blue.strong} opacity={prog(f, 9.2, 9.8)}>
          Others
        </text>
        {LIST.map((d) => (
          <Dot key={d.label} x={X(d.v)} y={LANE_LIST} label={d.label} fill={C.accent} ring={0} side opacity={prog(f, d.at, d.at + 0.5)} />
        ))}
        {OTHERS.map((d) => (
          <Dot
            key={d.label}
            x={X(d.v)}
            y={LANE_OTHER}
            label={d.label}
            fill={TONES.blue.strong}
            ring={d.all ? prog(f, 16, 16.6) * (1 - toAny) + (toAny > 0 ? prog(f, d.anyAt, d.anyAt + 0.5) : 0) : prog(f, d.anyAt, d.anyAt + 0.5)}
            opacity={prog(f, 9.2, 9.8)}
          />
        ))}
      </Interactive.Svg>
    </SceneShell>
  );
};

export const AnyAllScene = Interactive.withSchema({
  Component: AnyAllInner,
  componentName: '<AnyAllScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
