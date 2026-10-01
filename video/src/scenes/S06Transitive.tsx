import type React from 'react';
import {SceneNarration} from '../components/Narration';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {Caption} from '../components/Caption';
import {DataTable, geom} from '../components/DataTable';
import {DependencyArrow} from '../components/DependencyArrow';
import {Chip, Heading, SceneShell} from '../components/Shell';
import {cols, rowsOf, type ColKey} from '../data';
import {prog} from '../anim';
import {TONES} from '../theme';

const KEYS: ColKey[] = ['course_id', 'course_name', 'dept_id', 'dept_name'];
const COLUMNS = cols(KEYS, ['course_id']);
const ROWS = rowsOf(KEYS);
const TX = 600;
const TY = 380;
const G = geom(COLUMNS, TX, TY);

const TransitiveSceneInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame;
  const hi = prog(f, 6.3, 7);
  return (
    <SceneShell style={style}>
      <SceneNarration scene="transitive" />
      <Heading name="Heading" premountFor={fps}>
        Transitive dependency
      </Heading>
      <DataTable
        name="Enrollment (course columns)"
        x={TX}
        y={TY}
        columns={COLUMNS}
        rows={ROWS}
        rowOpacity={(r) => prog(f, 0.2 + r * 0.12, 0.7 + r * 0.12)}
        cell={(r, c) => (c >= 2 && r !== 1 && hi > 0 ? {bg: TONES.maroon.soft, outline: hi * 0.6} : undefined)}
      />
      <DependencyArrow
        name="course_id → dept_id"
        from={{x: G.cx(0), y: TY - 6}}
        to={{x: G.cx(2) - 20, y: TY - 6}}
        bend={80}
        progress={prog(f, 1, 3)}
        color={TONES.orange.strong}
      />
      <DependencyArrow
        name="dept_id → dept_name"
        from={{x: G.cx(2) + 20, y: TY - 6}}
        to={{x: G.cx(3), y: TY - 6}}
        bend={60}
        progress={prog(f, 3, 4.5)}
        color={TONES.maroon.strong}
      />
      <DependencyArrow
        name="course_id ⇢ dept_name (transitive)"
        from={{x: G.cx(0) - 30, y: TY - 6}}
        to={{x: G.cx(3) + 70, y: TY - 6}}
        bend={190}
        progress={prog(f, 12.3, 14)}
        dashed
        color={TONES.maroon.strong}
        label="only via dept_id"
        labelSize={32}
      />
      <Chip tone="maroon" style={{left: 1540, top: 70, opacity: prog(f, 19.2, 20), scale: `${0.8 + 0.2 * prog(f, 19.2, 20)}`}}>
        → 3NF
      </Chip>

      <Caption name="C1 chain" from={0} durationInFrames={180} premountFor={fps}>
        Now follow a chain: `course_id → dept_id → dept_name`.
      </Caption>
      <Caption name="C2 describes department" from={180} durationInFrames={180} premountFor={fps}>
        dept_name describes the department, not the course.
      </Caption>
      <Caption name="C3 only through" from={360} durationInFrames={210} premountFor={fps}>
        It depends on the key only through `dept_id`, which is not a key attribute.
      </Caption>
      <Caption name="C4 transitive" from={570} durationInFrames={180} premountFor={fps}>
        That is a transitive dependency. 3NF removes it.
      </Caption>
    </SceneShell>
  );
};

export const TransitiveScene = Interactive.withSchema({
  Component: TransitiveSceneInner,
  componentName: '<TransitiveScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
