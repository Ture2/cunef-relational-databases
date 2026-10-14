import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlTitle} from '../../common/TitleOutro';
import {Narration} from '../shared';

const TitleInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlTitle
    style={style}
    narration={<Narration scene="title" />}
    title="Indexes"
    subtitle="How the database finds rows fast"
    chips={[
      {label: 'Full scan', tone: 'orange'},
      {label: 'B-tree', tone: 'teal'},
      {label: 'ROWID', tone: 'blue'},
      {label: 'EXPLAIN PLAN', tone: 'yellow'},
      {label: 'Composite', tone: 'maroon'},
    ]}
  />
);

export const IndexesTitleScene = Interactive.withSchema({
  Component: TitleInner,
  componentName: '<IndexesTitleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
