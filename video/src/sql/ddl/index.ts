// The "DDL" video: composition SqlDdl. Script: SCRIPT-sql-ddl.md.
import {defineSqlVideo} from '../common/SqlVideo';
import {SPEECH_INTERVALS} from './narration';
import {DdlTitleScene} from './scenes/D01Title';
import {FamiliesScene} from './scenes/D02Families';
import {CreateScene} from './scenes/D03Create';
import {ConstraintsScene} from './scenes/D04Constraints';
import {ParentScene} from './scenes/D05Parent';
import {AlterScene} from './scenes/D06Alter';
import {CommitScene} from './scenes/D07Commit';
import {DictionaryScene} from './scenes/D08Dictionary';
import {DdlOutroScene} from './scenes/D09Outro';
import {TIMELINE, TOTAL_FRAMES} from './timeline';

export const DDL_VIDEO = defineSqlVideo(
  'SqlDdl',
  [
    {key: 'title', id: 'DdlTitle', Component: DdlTitleScene},
    {key: 'families', id: 'DdlFamilies', Component: FamiliesScene},
    {key: 'create', id: 'DdlCreate', Component: CreateScene},
    {key: 'constraints', id: 'DdlConstraints', Component: ConstraintsScene},
    {key: 'parent', id: 'DdlParent', Component: ParentScene},
    {key: 'alter', id: 'DdlAlter', Component: AlterScene},
    {key: 'commit', id: 'DdlCommit', Component: CommitScene},
    {key: 'dictionary', id: 'DdlDictionary', Component: DictionaryScene},
    {key: 'outro', id: 'DdlOutro', Component: DdlOutroScene},
  ],
  TIMELINE,
  TOTAL_FRAMES,
  SPEECH_INTERVALS,
);
