import type React from 'react';
import {SceneNarration} from '../components/Narration';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {DataTable, geom, HEAD_H} from '../components/DataTable';
import {DependencyArrow} from '../components/DependencyArrow';
import {Chip, Heading, SceneShell} from '../components/Shell';
import {cols, WIDE_KEYS} from '../data';
import {prog} from '../anim';
import {C, TONES} from '../theme';

const COLUMNS = cols(WIDE_KEYS, ['student_id', 'course_id']);
const TX = 290;
const TY = 400;
const G = geom(COLUMNS, TX, TY);
const BELOW = TY + HEAD_H + 6;
const BUS_Y = BELOW + 170;

const PartialSceneInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame;
  const bracketY = TY - 30;
  const midKey = (G.cx(0) + G.cx(1)) / 2;
  const courseTargets = [3, 4, 6, 7];
  return (
    <SceneShell style={style}>
      <SceneNarration scene="partial" />
      <Heading name="Heading" premountFor={fps}>
        Full vs partial dependency
      </Heading>
      <DataTable
        name="Enrollment header"
        x={TX}
        y={TY}
        columns={COLUMNS}
        rows={[]}
        style={{opacity: prog(f, 0.2, 1)}}
        header={(c) => {
          if (c === 5) return {outline: prog(f, 6.5, 7) * (1 - prog(f, 11.5, 12))};
          if (c === 2) return {outline: prog(f, 13, 13.5) * (1 - prog(f, 18, 18.5))};
          if (c === 3 || c === 4 || c === 6 || c === 7) return {outline: prog(f, 19, 19.5) * (1 - prog(f, 24.5, 25))};
          return undefined;
        }}
      />
      <Interactive.Svg
        name="Key bracket"
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{position: 'absolute', left: 0, top: 0, opacity: prog(f, 1, 2)}}
      >
        <path
          d={`M ${G.left(0) + 16} ${TY - 8} L ${G.left(0) + 16} ${bracketY} L ${G.left(2) - 16} ${bracketY} L ${G.left(2) - 16} ${TY - 8}`}
          fill="none"
          stroke={C.accent}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        <text x={midKey} y={bracketY - 14} textAnchor="middle" fontSize={30} fontWeight={700} fill={C.ink} fontFamily="Arial">
          key
        </text>
      </Interactive.Svg>
      <DependencyArrow
        name="key → grade (full)"
        from={{x: midKey + 60, y: bracketY}}
        to={{x: G.cx(5), y: TY - 8}}
        bend={130}
        progress={prog(f, 6.5, 8.5)}
        color={TONES.teal.strong}
        label="full"
        labelSize={34}
      />
      <DependencyArrow
        name="student_id → student_name (partial)"
        from={{x: G.cx(0), y: BELOW}}
        to={{x: G.cx(2), y: BELOW}}
        bend={-80}
        progress={prog(f, 12.5, 14.5)}
        color={TONES.blue.strong}
      />
      <Interactive.Div
        name="Student partial label"
        style={{
          position: 'absolute',
          left: G.cx(0) - 120,
          top: BELOW + 96,
          width: 240,
          textAlign: 'center',
          fontSize: 34,
          fontWeight: 700,
          color: C.ink,
          opacity: prog(f, 14, 14.6),
        }}
      >
        partial
      </Interactive.Div>
      {/* course_id → course_name, credits, dept_id, dept_name: one "bus" with four arrow heads */}
      <Interactive.Svg
        name="course_id → course columns (partial)"
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{position: 'absolute', left: 0, top: 0}}
      >
        <path
          d={`M ${G.cx(1)} ${BELOW} L ${G.cx(1)} ${BUS_Y} L ${G.cx(7)} ${BUS_Y}`}
          fill="none"
          stroke={TONES.orange.strong}
          strokeWidth={5}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - prog(f, 19, 20.6)}
        />
        {courseTargets.map((target, i) => {
          const t = prog(f, 20.4 + i * 0.25, 21 + i * 0.25);
          const x = G.cx(target);
          return (
            <g key={target} opacity={t}>
              <line x1={x} y1={BUS_Y} x2={x} y2={BELOW + 22 + (1 - t) * 40} stroke={TONES.orange.strong} strokeWidth={5} />
              <polygon
                points={`${x},${BELOW + (1 - t) * 40} ${x - 12},${BELOW + 24 + (1 - t) * 40} ${x + 12},${BELOW + 24 + (1 - t) * 40}`}
                fill={TONES.orange.strong}
              />
            </g>
          );
        })}
        <text
          x={(G.cx(3) + G.cx(7)) / 2}
          y={BUS_Y + 46}
          textAnchor="middle"
          fontSize={34}
          fontWeight={700}
          fill={C.ink}
          fontFamily="Arial"
          opacity={prog(f, 21, 21.6)}
        >
          partial
        </text>
      </Interactive.Svg>
      <Chip tone="blue" style={{left: 1540, top: 70, opacity: prog(f, 25.2, 26), scale: `${0.8 + 0.2 * prog(f, 25.2, 26)}`}}>
        → 2NF
      </Chip>
    
    </SceneShell>
  );
};

export const PartialScene = Interactive.withSchema({
  Component: PartialSceneInner,
  componentName: '<PartialScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
