import type React from 'react';
import {Interactive, type InteractivitySchema} from 'remotion';
import {SqlTitle} from '../../common/TitleOutro';
import {Narration} from '../shared';

const TitleInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => (
  <SqlTitle
    style={style}
    narration={<Narration scene="title" />}
    title="Procedures and functions"
    subtitle="Named PL/SQL blocks, stored in the database"
    chips={[
      {label: 'PROCEDURE', tone: 'orange'},
      {label: 'FUNCTION', tone: 'teal'},
      {label: 'IN · OUT', tone: 'blue'},
      {label: 'EXCEPTION', tone: 'maroon'},
      {label: 'PACKAGE', tone: 'yellow'},
    ]}
  />
);

export const ProceduresTitleScene = Interactive.withSchema({
  Component: TitleInner,
  componentName: '<ProceduresTitleScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
