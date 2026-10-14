import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {DataTable} from '../../../components/DataTable';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {ENROLMENT, ENROLMENT_COLS} from '../../common/school';
import {SqlCode} from '../../common/SqlCode';
import {InfoCard} from '../../common/ui';
import {Narration} from '../shared';

const CODE = `CREATE TABLE enrolment (
  student_id VARCHAR2(3) REFERENCES student (student_id) ON DELETE CASCADE,
  course_id  VARCHAR2(3) REFERENCES course (course_id),
  grade      NUMBER(4,2) CHECK (grade BETWEEN 0 AND 10),
  PRIMARY KEY (student_id, course_id)
);`;
const DELETE = `DELETE FROM student WHERE student_id = 'S01';`;

const CARD_Y = 720;
const CARD_W = 540;
const CARDS = [
  {title: 'ON DELETE CASCADE', text: 'the children are deleted too', at: 9, until: 16.2, tone: 'maroon'},
  {title: 'ON DELETE SET NULL', text: 'children kept, their FK becomes NULL', at: 16.2, until: 20.6, tone: 'blue'},
  {title: 'nothing (default)', text: 'delete rejected while children exist', at: 20.8, until: 99, tone: 'teal'},
] as const;

// 0.8 what happens to the children when a parent is deleted? · 4.4 the ON DELETE clause · 8.7 CASCADE
// · 11.8 delete Ana: her two enrolments disappear · 16.1 SET NULL · 20.6 nothing: rejected · 25.4 no ON UPDATE
const OnDeleteInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ana = prog(f, 12.6, 13.2);
  const strike = prog(f, 13.6, 14.4);
  const gone = prog(f, 14.6, 15.4);
  return (
    <SceneShell style={style}>
      <Narration scene="actions" />
      <Heading name="Heading" premountFor={fps}>
        ON DELETE
      </Heading>
      <SqlCode
        name="Create enrolment"
        code={CODE}
        x={100}
        y={210}
        width={1150}
        size={26}
        opacity={prog(f, 0.8, 1.4)}
        line={(i) => ({highlight: i === 1 ? prog(f, 5, 5.6) : 0, tone: 'maroon'})}
      />
      <SqlCode name="Delete Ana" code={DELETE} x={100} y={520} width={1150} size={26} opacity={prog(f, 11.8, 12.4)} />
      <DataTable
        name="Enrolment"
        title="enrolment"
        x={1340}
        y={270}
        columns={ENROLMENT_COLS}
        rows={ENROLMENT.map((r) => [...r])}
        style={{opacity: prog(f, 1.4, 2.2)}}
        rowOpacity={(r) => (r < 2 ? 1 - 0.8 * gone : 1)}
        cell={(r) => (r < 2 && ana > 0 ? {bg: TONES.maroon.soft, outline: ana * (1 - gone), strike} : undefined)}
      />
      {CARDS.map((c, i) => (
        <InfoCard
          key={c.title}
          name={`Card ${c.title}`}
          title={c.title}
          x={100 + i * (CARD_W + 30)}
          y={CARD_Y}
          width={CARD_W}
          height={190}
          tone={c.tone}
          titleSize={34}
          size={28}
          opacity={prog(f, c.at, c.at + 0.6)}
          outline={prog(f, c.at, c.at + 0.6) * (1 - prog(f, c.until, c.until + 0.4))}
        >
          {c.text}
        </InfoCard>
      ))}
      <Chip tone="neutral" size={30} style={{left: 100, top: 630, opacity: gone}}>
        Ana&apos;s 2 enrolments: gone
      </Chip>
      <Chip tone="orange" size={32} style={{left: 100, top: 935, opacity: prog(f, 25.6, 26.2)}}>
        Oracle has no ON UPDATE: primary keys should not change
      </Chip>
    </SceneShell>
  );
};

export const OnDeleteScene = Interactive.withSchema({
  Component: OnDeleteInner,
  componentName: '<OnDeleteScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
