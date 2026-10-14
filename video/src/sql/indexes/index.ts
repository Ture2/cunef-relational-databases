// The "Indexes" video: composition SqlIndexes. Script: SCRIPT-sql-indexes.md.
import {defineSqlVideo} from '../common/SqlVideo';
import {SPEECH_INTERVALS} from './narration';
import {IndexesTitleScene} from './scenes/I01Title';
import {PhoneBookScene} from './scenes/I02PhoneBook';
import {ScanScene} from './scenes/I03Scan';
import {BTreeScene} from './scenes/I04BTree';
import {PlanScene} from './scenes/I05Plan';
import {CompositeScene} from './scenes/I06Composite';
import {CostScene} from './scenes/I07Cost';
import {FunctionsScene} from './scenes/I08Functions';
import {IndexesOutroScene} from './scenes/I09Outro';
import {TIMELINE, TOTAL_FRAMES} from './timeline';

export const INDEXES_VIDEO = defineSqlVideo(
  'SqlIndexes',
  [
    {key: 'title', id: 'IdxTitle', Component: IndexesTitleScene},
    {key: 'phonebook', id: 'IdxPhoneBook', Component: PhoneBookScene},
    {key: 'scan', id: 'IdxScan', Component: ScanScene},
    {key: 'btree', id: 'IdxBTree', Component: BTreeScene},
    {key: 'plan', id: 'IdxPlan', Component: PlanScene},
    {key: 'composite', id: 'IdxComposite', Component: CompositeScene},
    {key: 'cost', id: 'IdxCost', Component: CostScene},
    {key: 'functions', id: 'IdxFunctions', Component: FunctionsScene},
    {key: 'outro', id: 'IdxOutro', Component: IndexesOutroScene},
  ],
  TIMELINE,
  TOTAL_FRAMES,
  SPEECH_INTERVALS,
);
