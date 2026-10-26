import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlOutro} from '../../sql/common/TitleOutro';
import {Narration} from '../shared';

const OutroInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlOutro style={style} narration={<Narration scene="outro" />} card="Normal forms" section="Normalization" />
);

export const AdvOutroScene = Interactive.withSchema({
  Component: OutroInner,
  componentName: '<AdvOutroScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
