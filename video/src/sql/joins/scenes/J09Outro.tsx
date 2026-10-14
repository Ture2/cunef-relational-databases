import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlOutro} from '../../common/TitleOutro';
import {Narration} from '../shared';

const OutroInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlOutro style={style} narration={<Narration scene="outro" />} card="Combining tables" />
);

export const JoinsOutroScene = Interactive.withSchema({
  Component: OutroInner,
  componentName: '<JoinsOutroScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
