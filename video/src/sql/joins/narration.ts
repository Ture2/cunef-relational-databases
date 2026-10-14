// Voice-over of the joins video. Source of truth: src/sql/joins/narration.json (edit the text there,
// then run `python scripts/tts.py --video sql/joins`).
import {makeNarration} from '../common/narration';
import data from './narration.json';
import {TIMELINE} from './timeline';

export const {segmentsOf, SPEECH_INTERVALS, Narration} = makeNarration(data.segments, TIMELINE);
