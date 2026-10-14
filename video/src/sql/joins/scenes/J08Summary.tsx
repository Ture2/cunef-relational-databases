import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Heading, SceneShell} from '../../../components/Shell';
import {FONT, TONES} from '../../../theme';
import {InfoCard} from '../../common/ui';
import {Narration, Venn} from '../shared';

const W = 540;
const H = 350;
const XS = [100, 690, 1280];
const YS = [240, 640];

type Join = {
  readonly name: string;
  readonly text: string;
  readonly at: number;
  /** a, both, b shading of the Venn diagram, or a glyph instead of it. */
  readonly venn?: readonly [number, number, number];
  readonly glyph?: string;
};

const JOINS: readonly Join[] = [
  {name: 'INNER JOIN', text: 'only the rows that match', venn: [0, 1, 0], at: 1.4},
  {name: 'LEFT JOIN', text: '+ unmatched rows of the left table', venn: [1, 1, 0], at: 4.2},
  {name: 'RIGHT JOIN', text: '+ unmatched rows of the right table', venn: [0, 1, 1], at: 4.8},
  {name: 'FULL OUTER JOIN', text: '+ unmatched rows of both', venn: [1, 1, 1], at: 5.4},
  {name: 'CROSS JOIN', text: 'every row × every row', glyph: '3 × 4 = 12', at: 8.4},
  {name: 'Self-join', text: 'a table with itself, two aliases', glyph: 'a ⋈ b', at: 10.2},
];

// 0.8 inner keeps the matches · left, right, full also keep the rows without a partner · cross · self
const SummaryInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <Narration scene="summary" />
      <Heading name="Heading" premountFor={fps}>
        The join types
      </Heading>
      {JOINS.map((j, i) => {
        const x = XS[i % 3];
        const y = YS[Math.floor(i / 3)];
        const t = prog(f, j.at, j.at + 0.6);
        return (
          <div key={j.name}>
            <InfoCard name={`Card ${j.name}`} title={j.name} x={x} y={y} width={W} height={H} tone="teal" opacity={t} titleSize={36} size={28}>
              {j.text}
            </InfoCard>
            {j.venn ? (
              <Venn name={`Venn ${j.name}`} x={x + 128} y={y + 150} scale={0.55} labels={['', '']} a={j.venn[0]} both={j.venn[1]} b={j.venn[2]} opacity={t} />
            ) : (
              <Interactive.Div
                name={`Glyph ${j.name}`}
                style={{position: 'absolute', left: x, top: y + 200, width: W, textAlign: 'center', fontFamily: FONT, fontSize: 56, fontWeight: 700, color: TONES.yellow.strong, opacity: t}}
              >
                {j.glyph}
              </Interactive.Div>
            )}
          </div>
        );
      })}
    </SceneShell>
  );
};

export const SummaryScene = Interactive.withSchema({
  Component: SummaryInner,
  componentName: '<SummaryScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
