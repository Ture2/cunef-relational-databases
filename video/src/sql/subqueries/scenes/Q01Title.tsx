import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlTitle} from '../../common/TitleOutro';
import {Narration} from '../shared';

const TitleInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlTitle
    style={style}
    narration={<Narration scene="title" />}
    title="Subqueries"
    subtitle="A query inside a query"
    chips={[
      {label: 'WHERE', tone: 'teal'},
      {label: 'IN · ANY · ALL', tone: 'orange'},
      {label: 'Correlated', tone: 'maroon'},
      {label: 'EXISTS', tone: 'blue'},
      {label: 'FROM', tone: 'yellow'},
    ]}
  />
);

export const SubqTitleScene = Interactive.withSchema({
  Component: TitleInner,
  componentName: '<SubqTitleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
