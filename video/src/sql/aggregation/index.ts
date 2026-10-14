// The "Aggregation" video: composition SqlAggregation. Script: SCRIPT-sql-aggregation.md.
import {defineSqlVideo} from '../common/SqlVideo';
import {SPEECH_INTERVALS} from './narration';
import {AggTitleScene} from './scenes/A01Title';
import {AggReceiptScene} from './scenes/A02Receipt';
import {AggCountScene} from './scenes/A03Count';
import {AggFunctionsScene} from './scenes/A04Functions';
import {AggGroupByScene} from './scenes/A05GroupBy';
import {AggHavingScene} from './scenes/A06Having';
import {AggOrderScene} from './scenes/A07Order';
import {AggErrorsScene} from './scenes/A08Errors';
import {AggOutroScene} from './scenes/A09Outro';
import {TIMELINE, TOTAL_FRAMES} from './timeline';

export const AGGREGATION_VIDEO = defineSqlVideo(
  'SqlAggregation',
  [
    {key: 'title', id: 'AggTitle', Component: AggTitleScene},
    {key: 'receipt', id: 'AggReceipt', Component: AggReceiptScene},
    {key: 'count', id: 'AggCount', Component: AggCountScene},
    {key: 'functions', id: 'AggFunctions', Component: AggFunctionsScene},
    {key: 'groupby', id: 'AggGroupBy', Component: AggGroupByScene},
    {key: 'having', id: 'AggHaving', Component: AggHavingScene},
    {key: 'order', id: 'AggOrder', Component: AggOrderScene},
    {key: 'errors', id: 'AggErrors', Component: AggErrorsScene},
    {key: 'outro', id: 'AggOutro', Component: AggOutroScene},
  ],
  TIMELINE,
  TOTAL_FRAMES,
  SPEECH_INTERVALS,
);
