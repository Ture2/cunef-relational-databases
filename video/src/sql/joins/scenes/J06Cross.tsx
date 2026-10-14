import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, TONES} from '../../../theme';
import {COURSE, STUDENT} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {Narration} from '../shared';

const CODE = `SELECT s.name, c.title
FROM student s
CROSS JOIN course c;`;

const GX = 520;
const GY = 540;
const CW = 290;
const RH = 100;

// 0.8 no condition: every row with every row · 3 students × 4 courses = 12 · 11.2 forget the join
// condition and you get it by accident
const CrossInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <Narration scene="cross" />
      <Heading name="Heading" premountFor={fps}>
        CROSS JOIN
      </Heading>
      <SqlCode name="Query" code={CODE} x={100} y={200} width={760} opacity={prog(f, 0.8, 1.4)} line={(i) => ({highlight: i === 2 ? prog(f, 1.6, 2.2) : 0})} />
      {COURSE.map((c, i) => (
        <Interactive.Div
          key={c[0]}
          name={`Course ${c[1]}`}
          style={{
            position: 'absolute',
            left: GX + i * CW,
            top: GY - 70,
            width: CW - 20,
            textAlign: 'center',
            fontSize: 32,
            fontWeight: 700,
            color: TONES.orange.strong,
            opacity: prog(f, 3 + i * 0.2, 3.5 + i * 0.2),
          }}
        >
          {c[1]}
        </Interactive.Div>
      ))}
      {STUDENT.map((st, r) => (
        <Interactive.Div
          key={st[0]}
          name={`Student ${st[1]}`}
          style={{
            position: 'absolute',
            left: 140,
            top: GY + r * RH,
            width: 340,
            height: RH - 20,
            display: 'flex',
            alignItems: 'center',
            fontSize: 32,
            fontWeight: 700,
            color: TONES.blue.strong,
            opacity: prog(f, 3 + r * 0.2, 3.5 + r * 0.2),
          }}
        >
          {st[1]}
        </Interactive.Div>
      ))}
      {STUDENT.flatMap((st, r) =>
        COURSE.map((c, i) => {
          const n = r * 4 + i;
          const t = prog(f, 4.6 + n * 0.3, 5 + n * 0.3);
          return (
            <Interactive.Div
              key={st[0] + c[0]}
              name={`Pair ${st[0]} ${c[0]}`}
              style={{
                position: 'absolute',
                left: GX + i * CW,
                top: GY + r * RH,
                width: CW - 20,
                height: RH - 20,
                borderRadius: 12,
                backgroundColor: TONES.yellow.soft,
                border: `2px solid ${TONES.yellow.strong}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 34,
                fontWeight: 700,
                color: C.ink,
                opacity: t,
                scale: `${0.7 + 0.3 * t}`,
              }}
            >
              {n + 1}
            </Interactive.Div>
          );
        }),
      )}
      <Chip tone="yellow" size={40} style={{left: 760, top: 870, opacity: prog(f, 9, 9.8)}}>
        3 × 4 = 12 rows
      </Chip>
      <SqlCode
        name="Old style"
        title="Forgot the condition?"
        code="FROM student s, course c"
        x={1000}
        y={260}
        width={760}
        opacity={prog(f, 11.4, 12)}
        line={() => ({highlight: prog(f, 12.4, 13)})}
      />
      <Chip tone="orange" size={32} style={{left: 1000, top: 380, opacity: prog(f, 13, 13.8)}}>
        An accidental CROSS JOIN
      </Chip>
    </SceneShell>
  );
};

export const CrossScene = Interactive.withSchema({
  Component: CrossInner,
  componentName: '<CrossScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
