// Voice-over of the subqueries video. Source of truth: src/sql/subqueries/narration.json (edit the
// text there, then run `python scripts/tts.py --video sql/subqueries`).
import {makeNarration} from '../common/narration';
import data from './narration.json';
import {TIMELINE} from './timeline';

export const {segmentsOf, SPEECH_INTERVALS, Narration} = makeNarration(data.segments, TIMELINE);
