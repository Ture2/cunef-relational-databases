import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlTitle} from '../../sql/common/TitleOutro';
import {Narration} from '../shared';

const TitleInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlTitle
    style={style}
    narration={<Narration scene="title" />}
    kicker="NORMALIZATION"
    title="Beyond 3NF"
    subtitle="Boyce–Codd, fourth and fifth normal forms"
    sep="→"
    chips={[
      {label: 'BCNF', tone: 'maroon'},
      {label: '4NF', tone: 'teal'},
      {label: '5NF', tone: 'orange'},
    ]}
  />
);

export const AdvTitleScene = Interactive.withSchema({
  Component: TitleInner,
  componentName: '<AdvTitleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
