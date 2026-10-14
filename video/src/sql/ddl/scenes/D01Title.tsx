import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlTitle} from '../../common/TitleOutro';
import {Narration} from '../shared';

const TitleInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlTitle
    style={style}
    narration={<Narration scene="title" />}
    title="DDL"
    subtitle="Creating, changing and removing the structure"
    chips={[
      {label: 'CREATE', tone: 'teal'},
      {label: 'ALTER', tone: 'orange'},
      {label: 'DROP', tone: 'maroon'},
    ]}
  />
);

export const DdlTitleScene = Interactive.withSchema({
  Component: TitleInner,
  componentName: '<DdlTitleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
