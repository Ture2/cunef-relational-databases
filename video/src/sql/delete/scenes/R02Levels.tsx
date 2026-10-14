import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable, HEAD_H, ROW_H, tableWidth} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {CMD_TONE, Narration} from '../shared';

const W = tableWidth(ENROLMENT_COLS);
const XS = [100, 725, 1350];
const Y = 390;
const ROWS = ENROLMENT.map((r) => [...r]);
/* The rows a WHERE picks: the Python enrolments. */
const PICKED = [3, 5];

const LEVELS = [
  {cmd: 'DELETE', what: 'some rows', at: 2.2},
  {cmd: 'TRUNCATE', what: 'all the rows', at: 3.2},
  {cmd: 'DROP', what: 'the table itself', at: 4.2},
] as const;

// 0.8 three tools, three levels · 7.8 DELETE: some rows, the ones its WHERE picks · 11.4 TRUNCATE:
// all the rows, keeps the empty table · 16.2 DROP: the table itself
const LevelsInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pick = prog(f, 9.6, 10.2);
  const del = prog(f, 10.4, 11.2);
  const trunc = prog(f, 12, 12.8);
  const kept = prog(f, 13.6, 14.4);
  const drop = prog(f, 16.6, 17.6);
  return (
    <SceneShell style={style}>
      <Narration scene="levels" />
      <Heading name="Heading" premountFor={fps}>
        Three tools, three levels
      </Heading>
      {LEVELS.map((l, i) => {
        const x = XS[i];
        const t = prog(f, l.at, l.at + 0.6);
        const said = [prog(f, 7.8, 8.4) * (1 - prog(f, 11.2, 11.8)), prog(f, 11.4, 12) * (1 - prog(f, 16, 16.6)), prog(f, 16.2, 16.8)][i];
        return (
          <div key={l.cmd}>
            <Chip tone={CMD_TONE[l.cmd]} size={40} style={{left: x + W / 2, top: 205, translate: '-50% 0px', opacity: t, scale: `${1 + 0.1 * said}`}}>
              {l.cmd}
            </Chip>
            <DataTable
              name={`Enrolment ${l.cmd}`}
              title="enrolment"
              x={x}
              y={Y}
              columns={ENROLMENT_COLS}
              rows={ROWS}
              style={{
                opacity: prog(f, 0.8 + i * 0.3, 1.6 + i * 0.3) * (i === 2 ? 1 - drop : 1),
                scale: i === 2 ? `${1 - 0.15 * drop}` : undefined,
                translate: i === 2 ? `0px ${drop * 40}px` : undefined,
              }}
              header={() => (i === 1 ? {outline: kept} : undefined)}
              rowOpacity={(r) => (i === 0 ? (PICKED.indexOf(r) >= 0 ? 1 - 0.85 * del : 1) : i === 1 ? 1 - trunc : 1)}
              cell={(r) =>
                i === 0 && PICKED.indexOf(r) >= 0 && pick > 0
                  ? {bg: TONES.orange.soft, outline: pick, strike: del}
                  : i === 1 && trunc > 0
                    ? {bg: TONES.orange.soft, strike: trunc}
                    : undefined
              }
            />
            {i === 2 ? (
              <Interactive.Div
                name="Dropped table"
                style={{position: 'absolute', left: x, top: Y, width: W, height: HEAD_H + ROWS.length * ROW_H, boxSizing: 'border-box', border: `4px dashed ${C.rule}`, borderRadius: 12, opacity: drop}}
              />
            ) : null}
            <Interactive.Div
              name={`What ${l.cmd}`}
              style={{
                position: 'absolute',
                left: x,
                top: 870,
                width: W,
                textAlign: 'center',
                fontSize: 40,
                fontWeight: 700,
                color: C.ink,
                opacity: i === 0 ? prog(f, 8.2, 8.8) : i === 1 ? prog(f, 11.8, 12.4) : prog(f, 16.6, 17.2),
              }}
            >
              {l.what}
            </Interactive.Div>
          </div>
        );
      })}
      <Chip tone="neutral" size={28} style={{left: XS[0] + W / 2, top: 950, translate: '-50% 0px', opacity: prog(f, 9.2, 9.8)}}>
        WHERE course_id = 'C11'
      </Chip>
      <Chip tone="neutral" size={28} style={{left: XS[1] + W / 2, top: 950, translate: '-50% 0px', opacity: kept}}>
        empty table kept
      </Chip>
    </SceneShell>
  );
};

export const DeleteLevelsScene = Interactive.withSchema({
  Component: LevelsInner,
  componentName: '<DeleteLevelsScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
