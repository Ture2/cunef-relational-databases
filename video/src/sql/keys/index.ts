// The "Primary and foreign keys" video: composition SqlKeys. Script: SCRIPT-sql-keys.md.
import {defineSqlVideo} from '../common/SqlVideo';
import {SPEECH_INTERVALS} from './narration';
import {KeysTitleScene} from './scenes/K01Title';
import {PrimaryKeyScene} from './scenes/K02PrimaryKey';
import {CompositeScene} from './scenes/K03Composite';
import {UniqueScene} from './scenes/K04Unique';
import {ForeignKeyScene} from './scenes/K05ForeignKey';
import {OnDeleteScene} from './scenes/K06OnDelete';
import {NamedScene} from './scenes/K07Named';
import {ManageScene} from './scenes/K08Manage';
import {KeysOutroScene} from './scenes/K09Outro';
import {TIMELINE, TOTAL_FRAMES} from './timeline';

export const KEYS_VIDEO = defineSqlVideo(
  'SqlKeys',
  [
    {key: 'title', id: 'KeysTitle', Component: KeysTitleScene},
    {key: 'pk', id: 'KeysPrimaryKey', Component: PrimaryKeyScene},
    {key: 'composite', id: 'KeysComposite', Component: CompositeScene},
    {key: 'unique', id: 'KeysUnique', Component: UniqueScene},
    {key: 'fk', id: 'KeysForeignKey', Component: ForeignKeyScene},
    {key: 'actions', id: 'KeysOnDelete', Component: OnDeleteScene},
    {key: 'named', id: 'KeysNamed', Component: NamedScene},
    {key: 'manage', id: 'KeysManage', Component: ManageScene},
    {key: 'outro', id: 'KeysOutro', Component: KeysOutroScene},
  ],
  TIMELINE,
  TOTAL_FRAMES,
  SPEECH_INTERVALS,
);
