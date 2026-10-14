import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C, TONES} from '../../../theme';
import {MONO, SqlCode} from '../../common/SqlCode';
import {Arrow} from '../../common/ui';
import {Box, Narration} from '../shared';

const BLOCK = `DECLARE
  v_total NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM enrolment;
  DBMS_OUTPUT.PUT_LINE(v_total || ' enrolments');
EXCEPTION
  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE(SQLERRM);
END;
/`;

/* The four section keywords and when the voice says each one. */
const SECTIONS = [
  {line: 0, at: 3.9},
  {line: 2, at: 4.6},
  {line: 5, at: 5.3},
  {line: 8, at: 6.2},
];

const DB = {x: 1060, y: 230, w: 760, h: 330};
const APPS = ['Web app', 'Mobile app', 'Report'];
const APP_W = 220;
const APP_Y = 650;
const appX = (i: number) => DB.x + i * 270;

// 0.8 anonymous blocks: DECLARE, BEGIN, EXCEPTION, END · 7.5 runs once · 9 gone · 11.5 nothing is stored
// · 13.8 give it a name: a subprogram · 17 stored in the database · 18.3 compiled once
// · 19.6 every application can call it · 22 GRANT EXECUTE
const NamedInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const gone = prog(f, 9, 10);
  return (
    <SceneShell style={style}>
      <Narration scene="named" />
      <Heading name="Heading" premountFor={fps}>
        From block to subprogram
      </Heading>
      <SqlCode
        name="Anonymous block"
        title="Anonymous block"
        code={BLOCK}
        x={100}
        y={250}
        width={820}
        size={26}
        opacity={prog(f, 0.8, 1.6) * (1 - 0.55 * gone)}
        line={(i) => {
          const s = SECTIONS.find((x) => x.line === i);
          return {highlight: s ? prog(f, s.at, s.at + 0.4) * (1 - prog(f, s.at + 1.6, s.at + 2.2)) : 0};
        }}
      />
      <Chip tone="neutral" size={32} style={{left: 100, top: 730, opacity: prog(f, 7.5, 8.2)}}>
        Runs once
      </Chip>
      <Chip tone="orange" size={32} style={{left: 330, top: 730, opacity: prog(f, 11.4, 12.1)}}>
        Not stored
      </Chip>
      <Arrow name="Name it" from={{x: 930, y: 470}} to={{x: 1045, y: 400}} progress={prog(f, 13.8, 14.8)} />
      <Box name="Database" x={DB.x} y={DB.y} width={DB.w} height={DB.h} tone="blue" opacity={prog(f, 14.2, 15)}>
        <div style={{position: 'absolute', left: 26, top: 18, fontSize: 32, fontWeight: 700}}>Database</div>
        <div
          style={{
            position: 'absolute',
            left: 90,
            top: 90,
            width: 580,
            height: 90,
            borderRadius: 14,
            backgroundColor: C.surface,
            border: `3px solid ${TONES.orange.strong}`,
            boxShadow: `0 0 0 ${5 * prog(f, 16.3, 16.9) * (1 - prog(f, 18.6, 19.2))}px ${C.accent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            fontFamily: MONO,
            fontSize: 34,
            opacity: prog(f, 15, 15.8),
          }}
        >
          <span style={{color: TONES.teal.strong, fontWeight: 700}}>PROCEDURE</span>
          <span style={{color: C.ink}}>enrol_student</span>
        </div>
      </Box>
      <div style={{position: 'absolute', left: DB.x, top: DB.y + 220, width: DB.w, display: 'flex', justifyContent: 'center', gap: 24}}>
        {[
          {label: 'Stored', at: 17},
          {label: 'Compiled once', at: 18.2},
          {label: 'Reusable', at: 19.4},
        ].map((c) => (
          <Chip key={c.label} tone="teal" size={28} style={{position: 'relative', opacity: prog(f, c.at, c.at + 0.6)}}>
            {c.label}
          </Chip>
        ))}
      </div>
      {APPS.map((a, i) => {
        const t = prog(f, 19.6 + i * 0.35, 20.2 + i * 0.35);
        return (
          <div key={a}>
            <Box name={`App ${a}`} x={appX(i)} y={APP_Y} width={APP_W} height={84} opacity={t}>
              <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700}}>{a}</div>
            </Box>
            <Arrow
              name={`Call from ${a}`}
              from={{x: appX(i) + APP_W / 2, y: APP_Y - 8}}
              to={{x: DB.x + 380 + (i - 1) * 150, y: DB.y + DB.h + 12}}
              progress={prog(f, 19.9 + i * 0.35, 20.6 + i * 0.35)}
              width={4}
            />
          </div>
        );
      })}
      <SqlCode
        name="Grant"
        code="GRANT EXECUTE ON enrol_student TO web_app;"
        x={DB.x}
        y={810}
        width={DB.w}
        size={28}
        opacity={prog(f, 21.8, 22.5)}
        line={() => ({highlight: prog(f, 22.4, 23)})}
      />
    </SceneShell>
  );
};

export const NamedScene = Interactive.withSchema({
  Component: NamedInner,
  componentName: '<NamedScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
