import type React from 'react';
import {SceneNarration} from '../components/Narration';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog, window01} from '../anim';
import {DataTable, geom, type Column} from '../components/DataTable';
import {DependencyArrow} from '../components/DependencyArrow';
import {Heading, SceneShell} from '../components/Shell';
import {TONES} from '../theme';

const STUDENT: Column = {key: 'student', label: 'student', width: 170, tone: 'blue'};
const SUBJECT: Column = {key: 'subject', label: 'subject', width: 210, tone: 'orange'};
const TEACHER: Column = {key: 'teacher', label: 'teacher', width: 210, tone: 'yellow'};

const TUTORING_COLS: Column[] = [{...STUDENT, pk: true}, {...SUBJECT, pk: true}, TEACHER];
const TUTORING_ROWS = [
  ['Ana', 'Databases', 'Prof. Mora'],
  ['Ana', 'Statistics', 'Prof. Vidal'],
  ['Luis', 'Databases', 'Prof. Mora'],
  ['Eva', 'Databases', 'Prof. Castro'],
];
const TEACHES_COLS: Column[] = [{...TEACHER, pk: true}, SUBJECT];
const TEACHES_ROWS = [
  ['Prof. Mora', 'Databases'],
  ['Prof. Vidal', 'Statistics'],
  ['Prof. Castro', 'Databases'],
];
const TUTORING2_COLS: Column[] = [{...STUDENT, pk: true}, {...TEACHER, pk: true, fk: true}];
const TUTORING2_ROWS = [
  ['Ana', 'Prof. Mora'],
  ['Ana', 'Prof. Vidal'],
  ['Luis', 'Prof. Mora'],
  ['Eva', 'Prof. Castro'],
];

const TX = 100;
const TY = 340;
const G = geom(TUTORING_COLS, TX, TY);

const BCNFSceneInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame;
  const mora = window01(f, 12.3, 18.3);
  const split = prog(f, 18.4, 19.4);
  const split2 = prog(f, 19.2, 20.2);
  return (
    <SceneShell style={style}>
      <SceneNarration scene="bcnf" />
      <Heading name="Heading" premountFor={fps}>
        Boyce–Codd normal form (BCNF)
      </Heading>
      <DataTable
        name="Tutoring (original)"
        title="Tutoring"
        x={TX}
        y={TY}
        columns={TUTORING_COLS}
        rows={TUTORING_ROWS}
        style={{opacity: Math.min(prog(f, 0.2, 1), 1 - 0.55 * split)}}
        cell={(r, c) => ((r === 0 || r === 2) && c >= 1 && mora > 0 ? {bg: TONES.yellow.soft, outline: mora} : undefined)}
      />
      <DependencyArrow
        name="teacher → subject"
        from={{x: G.cx(2), y: TY - 6}}
        to={{x: G.cx(1), y: TY - 6}}
        bend={70}
        progress={prog(f, 6.5, 8.5)}
        opacity={1 - 0.55 * split}
        color={TONES.yellow.strong}
        label="teacher → subject"
        labelSize={30}
      />
      <DataTable
        name="Teaches"
        title="Teaches"
        x={820}
        y={TY}
        columns={TEACHES_COLS}
        rows={TEACHES_ROWS}
        style={{opacity: split, translate: `${(1 - split) * 40}px 0px`}}
      />
      <DataTable
        name="Tutoring (BCNF)"
        title="Tutoring"
        x={1340}
        y={TY}
        columns={TUTORING2_COLS}
        rows={TUTORING2_ROWS}
        style={{opacity: split2, translate: `${(1 - split2) * 40}px 0px`}}
      />
   
    </SceneShell>
  );
};

export const BCNFScene = Interactive.withSchema({
  Component: BCNFSceneInner,
  componentName: '<BCNFScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
