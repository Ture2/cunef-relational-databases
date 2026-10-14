import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlTitle} from '../../common/TitleOutro';
import {Narration} from '../shared';

const TitleInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlTitle
    style={style}
    narration={<Narration scene="title" />}
    title="Aggregation"
    subtitle="From many rows to one value, per table or per group"
    chips={[
      {label: 'COUNT', tone: 'teal'},
      {label: 'SUM', tone: 'orange'},
      {label: 'AVG', tone: 'maroon'},
      {label: 'MIN', tone: 'blue'},
      {label: 'MAX', tone: 'yellow'},
      {label: 'GROUP BY', tone: 'neutral'},
      {label: 'HAVING', tone: 'neutral'},
    ]}
  />
);

export const AggTitleScene = Interactive.withSchema({
  Component: TitleInner,
  componentName: '<AggTitleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
