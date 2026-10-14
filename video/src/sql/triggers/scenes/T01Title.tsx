import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlTitle} from '../../common/TitleOutro';
import {Narration} from '../shared';

const TitleInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlTitle
    style={style}
    narration={<Narration scene="title" />}
    title="Triggers"
    subtitle="Code that runs by itself when data changes"
    chips={[
      {label: 'BEFORE', tone: 'teal'},
      {label: 'AFTER', tone: 'orange'},
      {label: 'FOR EACH ROW', tone: 'maroon'},
      {label: ':OLD · :NEW', tone: 'blue'},
    ]}
  />
);

export const TriggersTitleScene = Interactive.withSchema({
  Component: TitleInner,
  componentName: '<TriggersTitleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
