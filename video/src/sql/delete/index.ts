// The "DELETE vs TRUNCATE vs DROP" video: composition SqlDelete. Script: SCRIPT-sql-delete.md.
import {defineSqlVideo} from '../common/SqlVideo';
import {SPEECH_INTERVALS} from './narration';
import {DeleteTitleScene} from './scenes/R01Title';
import {DeleteLevelsScene} from './scenes/R02Levels';
import {DeleteRowsScene} from './scenes/R03Delete';
import {DeleteTruncateScene} from './scenes/R04Truncate';
import {DeleteParentScene} from './scenes/R05Parent';
import {DeleteDropScene} from './scenes/R06Drop';
import {DeleteCascadeScene} from './scenes/R07Cascade';
import {DeleteSummaryScene} from './scenes/R08Summary';
import {DeleteOutroScene} from './scenes/R09Outro';
import {TIMELINE, TOTAL_FRAMES} from './timeline';

export const DELETE_VIDEO = defineSqlVideo(
  'SqlDelete',
  [
    {key: 'title', id: 'DeleteTitle', Component: DeleteTitleScene},
    {key: 'levels', id: 'DeleteLevels', Component: DeleteLevelsScene},
    {key: 'delete', id: 'DeleteRows', Component: DeleteRowsScene},
    {key: 'truncate', id: 'DeleteTruncate', Component: DeleteTruncateScene},
    {key: 'parent', id: 'DeleteParent', Component: DeleteParentScene},
    {key: 'drop', id: 'DeleteDrop', Component: DeleteDropScene},
    {key: 'cascade', id: 'DeleteCascade', Component: DeleteCascadeScene},
    {key: 'summary', id: 'DeleteSummary', Component: DeleteSummaryScene},
    {key: 'outro', id: 'DeleteOutro', Component: DeleteOutroScene},
  ],
  TIMELINE,
  TOTAL_FRAMES,
  SPEECH_INTERVALS,
);
