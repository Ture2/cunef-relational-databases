import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlTitle} from '../../common/TitleOutro';
import {CMD_TONE, Narration} from '../shared';

const TitleInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlTitle
    style={style}
    narration={<Narration scene="title" />}
    title="Three ways to delete"
    subtitle="Some rows, all the rows, or the whole table"
    chips={[
      {label: 'DELETE', tone: CMD_TONE.DELETE},
      {label: 'TRUNCATE', tone: CMD_TONE.TRUNCATE},
      {label: 'DROP', tone: CMD_TONE.DROP},
    ]}
    sep="·"
  />
);

export const DeleteTitleScene = Interactive.withSchema({
  Component: TitleInner,
  componentName: '<DeleteTitleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
