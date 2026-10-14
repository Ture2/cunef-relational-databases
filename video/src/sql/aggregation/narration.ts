// Voice-over of the aggregation video. Source of truth: src/sql/aggregation/narration.json (edit the
// text there, then run `python scripts/tts.py --video sql/aggregation`).
import {makeNarration} from '../common/narration';
import data from './narration.json';
import {TIMELINE} from './timeline';

export const {segmentsOf, SPEECH_INTERVALS, Narration} = makeNarration(data.segments, TIMELINE);
