// The "Cursors" video: composition SqlCursors. Script: SCRIPT-sql-cursors.md.
import {defineSqlVideo} from '../common/SqlVideo';
import {SPEECH_INTERVALS} from './narration';
import {CursorsTitleScene} from './scenes/C01Title';
import {SetsScene} from './scenes/C02Sets';
import {ImplicitScene} from './scenes/C03Implicit';
import {LifecycleScene} from './scenes/C04Lifecycle';
import {AttributesScene} from './scenes/C05Attributes';
import {ForLoopScene} from './scenes/C06ForLoop';
import {CurveScene} from './scenes/C07Curve';
import {MistakeScene} from './scenes/C08Mistake';
import {CursorsOutroScene} from './scenes/C09Outro';
import {TIMELINE, TOTAL_FRAMES} from './timeline';

export const CURSORS_VIDEO = defineSqlVideo(
  'SqlCursors',
  [
    {key: 'title', id: 'CurTitle', Component: CursorsTitleScene},
    {key: 'sets', id: 'CurSets', Component: SetsScene},
    {key: 'implicit', id: 'CurImplicit', Component: ImplicitScene},
    {key: 'lifecycle', id: 'CurLifecycle', Component: LifecycleScene},
    {key: 'attributes', id: 'CurAttributes', Component: AttributesScene},
    {key: 'forloop', id: 'CurForLoop', Component: ForLoopScene},
    {key: 'curve', id: 'CurCurve', Component: CurveScene},
    {key: 'mistake', id: 'CurMistake', Component: MistakeScene},
    {key: 'outro', id: 'CurOutro', Component: CursorsOutroScene},
  ],
  TIMELINE,
  TOTAL_FRAMES,
  SPEECH_INTERVALS,
);
