// The "Procedures and functions" video: composition SqlProcedures. Script: SCRIPT-sql-procedures.md.
import {defineSqlVideo} from '../common/SqlVideo';
import {SPEECH_INTERVALS} from './narration';
import {ProceduresTitleScene} from './scenes/P01Title';
import {NamedScene} from './scenes/P02Named';
import {ProcedureScene} from './scenes/P03Procedure';
import {CallScene} from './scenes/P04Call';
import {ErrorsScene} from './scenes/P05Errors';
import {FunctionScene} from './scenes/P06Function';
import {CompareScene} from './scenes/P07Compare';
import {PackagesScene} from './scenes/P08Packages';
import {ProceduresOutroScene} from './scenes/P09Outro';
import {TIMELINE, TOTAL_FRAMES} from './timeline';

export const PROCEDURES_VIDEO = defineSqlVideo(
  'SqlProcedures',
  [
    {key: 'title', id: 'ProcTitle', Component: ProceduresTitleScene},
    {key: 'named', id: 'ProcNamed', Component: NamedScene},
    {key: 'procedure', id: 'ProcProcedure', Component: ProcedureScene},
    {key: 'call', id: 'ProcCall', Component: CallScene},
    {key: 'errors', id: 'ProcErrors', Component: ErrorsScene},
    {key: 'func', id: 'ProcFunction', Component: FunctionScene},
    {key: 'compare', id: 'ProcCompare', Component: CompareScene},
    {key: 'packages', id: 'ProcPackages', Component: PackagesScene},
    {key: 'outro', id: 'ProcOutro', Component: ProceduresOutroScene},
  ],
  TIMELINE,
  TOTAL_FRAMES,
  SPEECH_INTERVALS,
);
