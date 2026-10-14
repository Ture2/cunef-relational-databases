import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlTitle} from '../../common/TitleOutro';
import {Narration} from '../shared';

const TitleInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlTitle
    style={style}
    narration={<Narration scene="title" />}
    title="Joins"
    subtitle="Putting the rows of several tables back together"
    chips={[
      {label: 'INNER', tone: 'teal'},
      {label: 'LEFT', tone: 'orange'},
      {label: 'RIGHT', tone: 'maroon'},
      {label: 'FULL', tone: 'blue'},
      {label: 'CROSS', tone: 'yellow'},
      {label: 'SELF', tone: 'neutral'},
    ]}
  />
);

export const JoinsTitleScene = Interactive.withSchema({
  Component: TitleInner,
  componentName: '<JoinsTitleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
