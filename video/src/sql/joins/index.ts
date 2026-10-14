// The "Joins" video: composition SqlJoins. Script: SCRIPT-sql-joins.md.
import {defineSqlVideo} from '../common/SqlVideo';
import {SPEECH_INTERVALS} from './narration';
import {JoinsTitleScene} from './scenes/J01Title';
import {WhyScene} from './scenes/J02Why';
import {InnerScene} from './scenes/J03Inner';
import {LeftScene} from './scenes/J04Left';
import {RightFullScene} from './scenes/J05RightFull';
import {CrossScene} from './scenes/J06Cross';
import {SelfScene} from './scenes/J07Self';
import {SummaryScene} from './scenes/J08Summary';
import {JoinsOutroScene} from './scenes/J09Outro';
import {TIMELINE, TOTAL_FRAMES} from './timeline';

export const JOINS_VIDEO = defineSqlVideo(
  'SqlJoins',
  [
    {key: 'title', id: 'JoinsTitle', Component: JoinsTitleScene},
    {key: 'why', id: 'JoinsWhy', Component: WhyScene},
    {key: 'inner', id: 'JoinsInner', Component: InnerScene},
    {key: 'left', id: 'JoinsLeft', Component: LeftScene},
    {key: 'rightfull', id: 'JoinsRightFull', Component: RightFullScene},
    {key: 'cross', id: 'JoinsCross', Component: CrossScene},
    {key: 'self', id: 'JoinsSelf', Component: SelfScene},
    {key: 'summary', id: 'JoinsSummary', Component: SummaryScene},
    {key: 'outro', id: 'JoinsOutro', Component: JoinsOutroScene},
  ],
  TIMELINE,
  TOTAL_FRAMES,
  SPEECH_INTERVALS,
);
