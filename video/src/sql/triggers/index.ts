// The "Triggers" video: composition SqlTriggers. Script: SCRIPT-sql-triggers.md.
import {defineSqlVideo} from '../common/SqlVideo';
import {SPEECH_INTERVALS} from './narration';
import {TriggersTitleScene} from './scenes/T01Title';
import {WhatScene} from './scenes/T02What';
import {BeforeScene} from './scenes/T03Before';
import {AuditScene} from './scenes/T04Audit';
import {OldNewScene} from './scenes/T05OldNew';
import {OrderScene} from './scenes/T06Order';
import {PitfallsScene} from './scenes/T07Pitfalls';
import {TriggersOutroScene} from './scenes/T08Outro';
import {TIMELINE, TOTAL_FRAMES} from './timeline';

export const TRIGGERS_VIDEO = defineSqlVideo(
  'SqlTriggers',
  [
    {key: 'title', id: 'TrgTitle', Component: TriggersTitleScene},
    {key: 'what', id: 'TrgWhat', Component: WhatScene},
    {key: 'before', id: 'TrgBefore', Component: BeforeScene},
    {key: 'audit', id: 'TrgAudit', Component: AuditScene},
    {key: 'oldnew', id: 'TrgOldNew', Component: OldNewScene},
    {key: 'order', id: 'TrgOrder', Component: OrderScene},
    {key: 'pitfalls', id: 'TrgPitfalls', Component: PitfallsScene},
    {key: 'outro', id: 'TrgOutro', Component: TriggersOutroScene},
  ],
  TIMELINE,
  TOTAL_FRAMES,
  SPEECH_INTERVALS,
);
