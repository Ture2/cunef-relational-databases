import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlTitle} from '../../common/TitleOutro';
import {Narration} from '../shared';

const TitleInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlTitle
    style={style}
    narration={<Narration scene="title" />}
    title="Cursors"
    subtitle="Walking through the rows of a query, one at a time"
    sep="→"
    chips={[
      {label: 'DECLARE', tone: 'teal'},
      {label: 'OPEN', tone: 'blue'},
      {label: 'FETCH', tone: 'orange'},
      {label: 'CLOSE', tone: 'maroon'},
    ]}
  />
);

export const CursorsTitleScene = Interactive.withSchema({
  Component: TitleInner,
  componentName: '<CursorsTitleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
