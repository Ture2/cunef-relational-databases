import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {type Tone} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {Arrow, InfoCard} from '../../common/ui';
import {customerRow, Narration} from '../shared';

const NEW = customerRow(50001);
const CODE = `INSERT INTO customer VALUES (${NEW[0]}, '${NEW[1]}', '${NEW[2]}', DATE '${NEW[3]}');`;

const CARD_Y = 470;
const CARD_W = 400;
const CARD_H = 190;

type Target = {readonly title: string; readonly body: string; readonly tone: Tone; readonly x: number; readonly at: number; readonly plus: string};
const TARGETS: readonly Target[] = [
  {title: 'customer', body: 'the table row', tone: 'blue', x: 100, at: 3.4, plus: '+1 row'},
  {title: 'PK index', body: 'customer_id · automatic', tone: 'teal', x: 540, at: 5, plus: '+1 entry'},
  {title: 'idx_customer_email', body: '(email)', tone: 'teal', x: 980, at: 5.8, plus: '+1 entry'},
  {title: 'idx_city_date', body: '(city, signup_date)', tone: 'teal', x: 1420, at: 6.6, plus: '+1 entry'},
];

// 0.8 not free (2.5): every insert, update or delete (4.7) must also change each index (8.1)
// · 9.6 disk space (11.6); index what you filter, join or sort by (16.1), not every column (17.3)
const CostInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <SceneShell style={style}>
      <Narration scene="cost" />
      <Heading name="Heading" premountFor={fps}>
        What indexes cost
      </Heading>
      <SqlCode name="Insert" code={CODE} x={100} y={200} width={1720} size={26} opacity={prog(f, 2.4, 3)} />
      {TARGETS.map((t) => {
        const cx = t.x + CARD_W / 2;
        const done = prog(f, t.at + 0.5, t.at + 1);
        return (
          <div key={t.title}>
            <Arrow name={`Write ${t.title}`} from={{x: cx, y: 300}} to={{x: cx, y: CARD_Y - 6}} progress={prog(f, t.at, t.at + 0.6)} />
            <InfoCard name={`Card ${t.title}`} title={t.title} x={t.x} y={CARD_Y} width={CARD_W} height={CARD_H} tone={t.tone} titleSize={30} size={26} opacity={prog(f, 1.2, 2)} outline={done}>
              {t.body}
            </InfoCard>
            <Chip tone="orange" size={26} style={{left: t.x + 28, top: CARD_Y + CARD_H - 70, opacity: done}}>
              {t.plus}
            </Chip>
          </div>
        );
      })}
      <Chip tone="neutral" size={30} style={{left: 100, top: 710, opacity: prog(f, 3, 3.6)}}>
        INSERT · UPDATE · DELETE
      </Chip>
      <Chip tone="orange" size={30} style={{left: 620, top: 710, opacity: prog(f, 7.4, 8.2)}}>
        1 row = 1 table write + 3 index writes
      </Chip>
      <Chip tone="yellow" size={30} style={{left: 100, top: 810, opacity: prog(f, 10.2, 11)}}>
        Each index also takes disk space
      </Chip>
      <Chip tone="teal" size={30} style={{left: 100, top: 910, opacity: prog(f, 13.2, 14)}}>
        ✓ Index what you filter, join or sort by
      </Chip>
      <Chip tone="orange" size={30} style={{left: 900, top: 910, opacity: prog(f, 16.4, 17.2)}}>
        ✗ Not every column
      </Chip>
    </SceneShell>
  );
};

export const CostScene = Interactive.withSchema({
  Component: CostInner,
  componentName: '<CostScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
