// The "Subqueries" video: composition SqlSubqueries. Script: SCRIPT-sql-subqueries.md.
import {defineSqlVideo} from '../common/SqlVideo';
import {SPEECH_INTERVALS} from './narration';
import {SubqTitleScene} from './scenes/Q01Title';
import {ScalarScene} from './scenes/Q02Scalar';
import {InScene} from './scenes/Q03In';
import {AnyAllScene} from './scenes/Q04AnyAll';
import {NotInScene} from './scenes/Q05NotIn';
import {CorrelatedScene} from './scenes/Q06Correlated';
import {ExistsScene} from './scenes/Q07Exists';
import {FromScene} from './scenes/Q08From';
import {SubqOutroScene} from './scenes/Q09Outro';
import {TIMELINE, TOTAL_FRAMES} from './timeline';

export const SUBQUERIES_VIDEO = defineSqlVideo(
  'SqlSubqueries',
  [
    {key: 'title', id: 'SubqTitle', Component: SubqTitleScene},
    {key: 'scalar', id: 'SubqScalar', Component: ScalarScene},
    {key: 'in', id: 'SubqIn', Component: InScene},
    {key: 'anyall', id: 'SubqAnyAll', Component: AnyAllScene},
    {key: 'notin', id: 'SubqNotIn', Component: NotInScene},
    {key: 'correlated', id: 'SubqCorrelated', Component: CorrelatedScene},
    {key: 'exists', id: 'SubqExists', Component: ExistsScene},
    {key: 'from', id: 'SubqFrom', Component: FromScene},
    {key: 'outro', id: 'SubqOutro', Component: SubqOutroScene},
  ],
  TIMELINE,
  TOTAL_FRAMES,
  SPEECH_INTERVALS,
);
