import type React from 'react';
import {SceneNarration} from '../components/Narration';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../anim';
import {DataTable} from '../components/DataTable';
import {Ladder} from '../components/Ladder';
import {Chip, Heading, SceneShell} from '../components/Shell';
import {cols, rowsOf, WIDE_KEYS} from '../data';
import {C, type Tone} from '../theme';

const COLUMNS = cols(WIDE_KEYS, ['student_id', 'course_id']);
const ROWS = rowsOf(WIDE_KEYS);
const FORMULA: {label: string; tone: Tone}[] = [
  {label: 'Enrollment', tone: 'teal'},
  {label: 'Student', tone: 'blue'},
  {label: 'Course', tone: 'orange'},
  {label: 'Department', tone: 'maroon'},
];

const LosslessSceneInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame;
  const out = 1 - prog(f, 10.4, 11);
  return (
    <SceneShell style={style}>
      <SceneNarration scene="lossless" />
      <Heading name="Heading lossless" durationInFrames={330} premountFor={fps}>
        Lossless join
      </Heading>
      <Heading name="Heading recap" from={330} durationInFrames={360} premountFor={fps}>
        Recap
      </Heading>
      <Interactive.Div
        name="Join formula"
        style={{
          position: 'absolute',
          left: 100,
          top: 190,
          height: 70,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: out,
        }}
      >
        {FORMULA.map((item, i) => {
          const t = prog(f, 0.4 + i * 0.7, 0.9 + i * 0.7);
          return (
            <div key={item.label} style={{display: 'flex', alignItems: 'center', gap: 16, opacity: t}}>
              {i > 0 ? (
                <svg width={44} height={36} viewBox="0 0 44 36">
                  {/* natural join symbol ⋈ drawn as two triangles */}
                  <path d="M 4 4 L 22 18 L 4 32 Z M 40 4 L 22 18 L 40 32 Z" fill="none" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
                </svg>
              ) : null}
              <Chip tone={item.tone} style={{position: 'relative'}}>
                {item.label}
              </Chip>
            </div>
          );
        })}
      </Interactive.Div>
      <DataTable
        name="Rebuilt Enrollment"
        title="Result"
        titleOpacity={prog(f, 5.5, 6)}
        x={290}
        y={360}
        columns={COLUMNS}
        rows={ROWS}
        style={{opacity: out}}
        rowOpacity={(r) => prog(f, 5.8 + r * 0.45, 6.3 + r * 0.45)}
        rowOffset={(r) => (1 - prog(f, 5.8 + r * 0.45, 6.3 + r * 0.45)) * 24}
      />
      <Chip tone="teal" style={{left: 1340, top: 290, opacity: Math.min(prog(f, 8.8, 9.4), out)}}>
        6 rows = original 6 ✓
      </Chip>
      <Ladder name="Ladder" from={330} durationInFrames={360} premountFor={fps} stagger={20} />
   
    </SceneShell>
  );
};

export const LosslessScene = Interactive.withSchema({
  Component: LosslessSceneInner,
  componentName: '<LosslessScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
