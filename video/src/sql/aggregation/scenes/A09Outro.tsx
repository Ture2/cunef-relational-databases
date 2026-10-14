import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlOutro} from '../../common/TitleOutro';
import {Narration} from '../shared';

const OutroInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlOutro style={style} narration={<Narration scene="outro" />} card="Aggregation" />
);

export const AggOutroScene = Interactive.withSchema({
  Component: OutroInner,
  componentName: '<AggOutroScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
