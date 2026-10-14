import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Heading, SceneShell} from '../../../components/Shell';
import {C, FONT, TONES, type Tone} from '../../../theme';
import {MONO} from '../../common/SqlCode';
import {Arrow, InfoCard} from '../../common/ui';
import {Narration} from '../shared';

const W = 240;
const STEP = 296;
const BOX_Y = 300;
const BOX_H = 190;
const x0 = (i: number) => 100 + i * STEP;

type Step = {readonly kw: string; readonly what: string; readonly tone: Tone; readonly at: number};
const STEPS: readonly Step[] = [
  {kw: 'FROM', what: 'tables, joins', tone: 'maroon', at: 3.6},
  {kw: 'WHERE', what: 'filters rows', tone: 'maroon', at: 4.6},
  {kw: 'GROUP BY', what: 'makes groups', tone: 'teal', at: 5.4},
  {kw: 'HAVING', what: 'filters groups', tone: 'teal', at: 6.2},
  {kw: 'SELECT', what: 'columns, aliases', tone: 'blue', at: 7.2},
  {kw: 'ORDER BY', what: 'sorts', tone: 'blue', at: 8.2},
];
const WHERE = 1;
const SELECT = 4;
const ORDER = 5;
const CARD_Y = 620;

const code = (text: string, strike = 0) => (
  <span style={{position: 'relative', fontFamily: MONO, fontSize: 30, color: C.ink, whiteSpace: 'nowrap'}}>
    {text}
    {strike > 0 ? <span style={{position: 'absolute', left: 0, top: '50%', height: 4, marginTop: -2, width: `${strike * 100}%`, backgroundColor: C.accent}} /> : null}
  </span>
);

// 0.8 the logical order: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY · 9.8 WHERE runs before the
// groups exist: no aggregate · ~14.6 ORDER BY runs last: it can use the SELECT aliases
const OrderInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const where = prog(f, 10, 10.6);
  const order = prog(f, 14.6, 15.2);
  const outline = (i: number) =>
    i === WHERE ? where * (1 - prog(f, 14.2, 14.8)) : i === ORDER ? order : i === SELECT ? prog(f, 17.2, 17.8) : 0;
  return (
    <SceneShell style={style}>
      <Narration scene="order" />
      <Heading name="Heading" premountFor={fps}>
        The logical order
      </Heading>
      <Interactive.Div
        name="Band labels"
        style={{position: 'absolute', left: 0, top: BOX_Y - 56, width: 1920, height: 40, fontFamily: FONT, fontSize: 28, fontWeight: 700, opacity: prog(f, 1, 1.8)}}
      >
        {[
          {label: 'rows', i: 0, tone: 'maroon' as Tone},
          {label: 'groups', i: 2, tone: 'teal' as Tone},
          {label: 'output', i: 4, tone: 'blue' as Tone},
        ].map((b) => (
          <div
            key={b.label}
            style={{position: 'absolute', left: x0(b.i), width: STEP + W, textAlign: 'center', color: TONES[b.tone].strong, borderBottom: `4px solid ${TONES[b.tone].strong}`, paddingBottom: 4}}
          >
            {b.label}
          </div>
        ))}
      </Interactive.Div>
      {STEPS.map((st, i) => {
        const t = prog(f, st.at, st.at + 0.5);
        return (
          <InfoCard
            key={st.kw}
            name={`Step ${st.kw}`}
            title={st.kw}
            x={x0(i)}
            y={BOX_Y}
            width={W}
            height={BOX_H}
            tone={st.tone}
            titleSize={36}
            size={26}
            opacity={t}
            outline={outline(i)}
            style={{translate: `0px ${(1 - t) * 20}px`, padding: '18px 20px'}}
          >
            <span style={{color: C.muted, fontWeight: 700}}>{i + 1}</span> · {st.what}
          </InfoCard>
        );
      })}
      {STEPS.slice(0, -1).map((st, i) => (
        <Arrow
          key={st.kw}
          name={`Then ${i + 1}`}
          from={{x: x0(i) + W + 8, y: BOX_Y + BOX_H / 2}}
          to={{x: x0(i + 1) - 8, y: BOX_Y + BOX_H / 2}}
          progress={prog(f, STEPS[i + 1].at - 0.2, STEPS[i + 1].at + 0.3)}
        />
      ))}
      <Arrow name="WHERE note" from={{x: x0(WHERE) + W / 2, y: BOX_Y + BOX_H + 14}} to={{x: x0(WHERE) + W / 2, y: CARD_Y - 26}} progress={prog(f, 10.4, 11)} />
      <InfoCard name="WHERE card" title="WHERE: the groups do not exist yet" x={100} y={CARD_Y} width={840} height={230} tone="orange" titleSize={34} opacity={prog(f, 10.8, 11.4)}>
        <div style={{marginTop: 18}}>{code('WHERE AVG(grade) > 7', prog(f, 12.8, 13.6))}</div>
        <div style={{marginTop: 18, opacity: prog(f, 13, 13.6)}}>No aggregates in WHERE</div>
      </InfoCard>
      <Arrow name="ORDER BY note" from={{x: x0(ORDER) + W / 2, y: BOX_Y + BOX_H + 14}} to={{x: x0(ORDER) + W / 2, y: CARD_Y - 26}} progress={prog(f, 15, 15.6)} />
      <InfoCard name="ORDER BY card" title="ORDER BY: last of all" x={980} y={CARD_Y} width={840} height={230} tone="teal" titleSize={34} opacity={prog(f, 15.4, 16)}>
        <div style={{marginTop: 18}}>{code('ORDER BY average')}</div>
        <div style={{marginTop: 18, opacity: prog(f, 17.4, 18)}}>Can use the aliases of the SELECT</div>
      </InfoCard>
    </SceneShell>
  );
};

export const AggOrderScene = Interactive.withSchema({
  Component: OrderInner,
  componentName: '<AggOrderScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
