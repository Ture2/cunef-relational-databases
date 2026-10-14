// Voice-over of the triggers video. Source of truth: src/sql/triggers/narration.json (edit the text there,
// then run `python scripts/tts.py --video sql/triggers`).
import {makeNarration} from '../common/narration';
import data from './narration.json';
import {TIMELINE} from './timeline';

export const {segmentsOf, SPEECH_INTERVALS, Narration} = makeNarration(data.segments, TIMELINE);
