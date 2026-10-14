import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlTitle} from '../../common/TitleOutro';
import {Narration} from '../shared';

const TitleInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlTitle
    style={style}
    narration={<Narration scene="title" />}
    title="Primary and foreign keys"
    subtitle="How Oracle defines them, and how you manage them"
    chips={[
      {label: 'PRIMARY KEY', tone: 'orange'},
      {label: 'UNIQUE', tone: 'blue'},
      {label: 'FOREIGN KEY', tone: 'maroon'},
      {label: 'ON DELETE', tone: 'teal'},
      {label: 'CONSTRAINT', tone: 'yellow'},
    ]}
  />
);

export const KeysTitleScene = Interactive.withSchema({
  Component: TitleInner,
  componentName: '<KeysTitleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
