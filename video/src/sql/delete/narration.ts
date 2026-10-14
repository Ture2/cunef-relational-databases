// Voice-over of the DELETE vs TRUNCATE vs DROP video. Source of truth: src/sql/delete/narration.json
// (edit the text there, then run `python scripts/tts.py --video sql/delete`).
import {makeNarration} from '../common/narration';
import data from './narration.json';
import {TIMELINE} from './timeline';

export const {segmentsOf, SPEECH_INTERVALS, Narration} = makeNarration(data.segments, TIMELINE);
