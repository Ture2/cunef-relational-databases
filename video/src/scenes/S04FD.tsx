import type React from 'react';
import {SceneNarration} from '../components/Narration';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {DataTable, geom} from '../components/DataTable';
import {DependencyArrow} from '../components/DependencyArrow';
import {Heading, SceneShell} from '../components/Shell';
import {cols, rowsOf, type ColKey} from '../data';
import {prog, window01} from '../anim';
import {C, TONES} from '../theme';

const KEYS: ColKey[] = ['student_id', 'course_id', 'student_name', 'course_name', 'grade'];
const COLUMNS = cols(KEYS, ['student_id', 'course_id']);
const ROWS = rowsOf(KEYS);
const TX = 120;
const TY = 330;
const G = geom(COLUMNS, TX, TY);

const Statement: React.FC<{readonly t: number; readonly ok: boolean; readonly children: React.ReactNode}> = ({t, ok, children}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '64px',
      opacity: t,
      translate: `${(1 - t) * 24}px 0px`,
      whiteSpace: 'nowrap',
    }}
  >
    <span
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: ok ? TONES.teal.soft : TONES.orange.soft,
        color: ok ? TONES.teal.strong : TONES.orange.strong,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 30,
        flexShrink: 0,
      }}
    >
      {ok ? '✓' : '✗'}
    </span>
    {children}
  </div>
);

/** "does not determine" arrow (↛), drawn so it renders the same in every font. */
const NotArrow: React.FC = () => (
  <span style={{position: 'relative', display: 'inline-block'}}>
    →
    <span
      style={{
        position: 'absolute',
        left: '50%',
        top: '8%',
        height: '84%',
        width: 4,
        backgroundColor: 'currentColor',
        rotate: '25deg',
        translate: '-50% 0px',
      }}
    />
  </span>
);

const FDSceneInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame;
  const groupOn = (r: number) => {
    const start = r <= 1 ? 6.3 : r <= 3 ? 12.5 : 15.5;
    return Math.min(prog(f, start, start + 0.6), 1 - prog(f, 24.5, 25.2));
  };
  const groupOutline = (r: number) => {
    const start = r <= 1 ? 6.3 : r <= 3 ? 12.5 : 15.5;
    const end = r <= 1 ? 12.5 : r <= 3 ? 15.5 : 18.5;
    return window01(f, start, end, 0.3);
  };
  const gradeBad = window01(f, 25.3, 32.5);
  const gradeFull = prog(f, 33.5, 34.5);
  const keyBracket = prog(f, 32.5, 33.3);
  const bracketY = TY - 26;
  const midKey = (G.cx(0) + G.cx(1)) / 2;
  const labels = prog(f, 18.7, 19.5);

  return (
    <SceneShell style={style}>
      <SceneNarration scene="fd" />
      <Heading name="Heading" premountFor={fps}>
        Functional dependency X → Y
      </Heading>
      <DataTable
        name="Enrollment (5 columns)"
        x={TX}
        y={TY}
        columns={COLUMNS}
        rows={ROWS}
        rowOpacity={(r) => prog(f, 0.4 + r * 0.15, 0.9 + r * 0.15)}
        cell={(r, c) => {
          if ((c === 0 || c === 2) && groupOn(r) > 0) {
            return {bg: TONES.blue.soft, outline: groupOutline(r)};
          }
          if (c === 4 && r <= 1 && gradeBad > 0) return {bg: TONES.maroon.soft, outline: gradeBad};
          if (c === 4 && gradeFull > 0) return {bg: TONES.teal.soft};
          return undefined;
        }}
      />
      <DependencyArrow
        name="student_id → student_name"
        from={{x: G.cx(0), y: TY - 6}}
        to={{x: G.cx(2), y: TY - 6}}
        bend={70}
        progress={prog(f, 14, 16.5)}
        opacity={1 - 0.7 * prog(f, 32.2, 32.8)}
        color={C.accent}
      />
      <DependencyArrow
        name="student_id ↛ grade"
        from={{x: G.cx(0) - 30, y: TY - 6}}
        to={{x: G.cx(4), y: TY - 6}}
        bend={140}
        progress={prog(f, 26, 28)}
        crossed={prog(f, 28, 28.6)}
        opacity={1 - prog(f, 32.2, 32.8)}
        color={TONES.maroon.strong}
      />
      {/* Composite-key bracket and arrow: (student_id, course_id) → grade */}
      <Interactive.Svg
        name="Key bracket"
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{position: 'absolute', left: 0, top: 0, opacity: keyBracket}}
      >
        <path
          d={`M ${G.cx(0)} ${TY - 6} L ${G.cx(0)} ${bracketY} L ${G.cx(1)} ${bracketY} L ${G.cx(1)} ${TY - 6}`}
          fill="none"
          stroke={TONES.teal.strong}
          strokeWidth={5}
          strokeLinejoin="round"
        />
      </Interactive.Svg>
      <DependencyArrow
        name="key → grade"
        from={{x: midKey, y: bracketY}}
        to={{x: G.cx(4), y: TY - 6}}
        bend={110}
        progress={prog(f, 33.2, 35)}
        color={TONES.teal.strong}
      />
      <Interactive.Div
        name="Determinant / dependent labels"
        style={{position: 'absolute', left: 0, top: G.bottom(6) + 14, width: 1920, opacity: labels}}
      >
        <div style={{position: 'absolute', left: G.cx(0) - 150, width: 300, whiteSpace: 'nowrap', textAlign: 'center', fontSize: 32, fontWeight: 700, color: C.ink}}>
          ▲ determinant
        </div>
        <div style={{position: 'absolute', left: G.cx(2) - 150, width: 300, whiteSpace: 'nowrap', textAlign: 'center', fontSize: 32, fontWeight: 700, color: C.ink}}>
          ▲ dependent
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="FD card"
        style={{
          position: 'absolute',
          left: 1060,
          top: TY,
          width: 760,
          height: 412,
          boxSizing: 'border-box',
          padding: '26px 36px',
          backgroundColor: C.surface,
          borderRadius: 18,
          borderTop: `10px solid ${C.accent}`,
          boxShadow: '0 6px 24px rgba(26, 31, 108, 0.08)',
          opacity: prog(f, 0.3, 1.1),
        }}
      >
        <div style={{fontSize: 72, fontWeight: 700}}>X → Y</div>
        <div style={{fontSize: 32, lineHeight: 1.3, marginTop: 6, marginBottom: 14}}>
          Same X in two rows ⇒ same Y.
        </div>
        <Statement t={prog(f, 17, 17.6)} ok>
          student_id → student_name
        </Statement>
        <Statement t={prog(f, 29, 29.6)} ok={false}>
          student_id <NotArrow /> grade
        </Statement>
        <Statement t={prog(f, 34.5, 35.1)} ok>
          (student_id, course_id) → grade
        </Statement>
      </Interactive.Div>
      
    </SceneShell>
  );
};

export const FDScene = Interactive.withSchema({
  Component: FDSceneInner,
  componentName: '<FDScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
