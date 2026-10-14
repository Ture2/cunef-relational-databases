import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable} from '../../../components/DataTable';
import {Heading, SceneShell} from '../../../components/Shell';
import {C, TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {ChipRow, CMD_TONE, Narration, Storage} from '../shared';

const CODE = `TRUNCATE TABLE enrolment;
ROLLBACK;`;

const TY = 480;

// 0.8 TRUNCATE is DDL; no WHERE; empties the whole table at once · 7.4 not row by row: frees the
// storage, very fast, no triggers; columns, constraints and indexes stay · 19.1 it commits; ROLLBACK
// cannot bring the rows back
const TruncateInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const flash = prog(f, 4.6, 5);
  const gone = prog(f, 5, 5.6);
  const freed = prog(f, 10.6, 11.4);
  const kept = prog(f, 16, 16.6);
  const retry = prog(f, 23.4, 24);
  return (
    <SceneShell style={style}>
      <Narration scene="truncate" />
      <Heading name="Heading" premountFor={fps}>
        TRUNCATE
      </Heading>
      <SqlCode
        name="Truncate"
        code={CODE}
        x={100}
        y={200}
        width={720}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => (i === 0 ? {highlight: prog(f, 4.4, 5) * (1 - prog(f, 8, 8.6)), tone: 'yellow'} : {opacity: prog(f, 22.6, 23.2), highlight: prog(f, 23, 23.6)})}
      />
      <ChipRow
        name="TRUNCATE facts"
        x={880}
        y={215}
        chips={[
          {label: 'DDL', tone: CMD_TONE.TRUNCATE, opacity: prog(f, 1.6, 2.2)},
          {label: 'no WHERE', tone: 'neutral', opacity: prog(f, 3, 3.6)},
          {label: 'implicit COMMIT', tone: 'orange', opacity: prog(f, 20.4, 21)},
        ]}
      />
      <ChipRow name="Still empty" x={880} y={305} chips={[{label: 'still 0 rows', tone: 'orange', opacity: retry}]} />
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={100}
        y={TY}
        columns={ENROLMENT_COLS}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 1, 1.8)}}
        header={() => ({outline: kept})}
        rowOpacity={() => 1 - gone}
        cell={() => (flash > 0 ? {bg: TONES.orange.soft} : undefined)}
      />
      <Interactive.Div
        name="Structure kept"
        style={{position: 'absolute', left: 100, top: TY + 100, width: 470, fontSize: 32, lineHeight: 1.4, color: C.ink, opacity: kept}}
      >
        <b>Structure kept:</b>
        <br />
        columns, constraints
        <br />
        and indexes stay
      </Interactive.Div>
      <Interactive.Div
        name="Storage title"
        style={{position: 'absolute', left: 820, top: TY - 50, fontSize: 32, fontWeight: 700, color: C.ink, opacity: prog(f, 7.6, 8.2)}}
      >
        the table&apos;s storage
      </Interactive.Div>
      <Storage name="Storage" x={820} y={TY} opacity={prog(f, 7.6, 8.2)} fill={1 - freed} cols={12} rows={5} cell={66} />
      <ChipRow
        name="Speed"
        x={820}
        y={TY + 400}
        chips={[
          {label: 'freed at once', tone: 'yellow', opacity: prog(f, 11, 11.6)},
          {label: 'very fast', tone: 'neutral', opacity: prog(f, 12.6, 13.2)},
          {label: 'no triggers', tone: 'neutral', opacity: prog(f, 14, 14.6)},
        ]}
      />
    </SceneShell>
  );
};

export const DeleteTruncateScene = Interactive.withSchema({
  Component: TruncateInner,
  componentName: '<DeleteTruncateScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
