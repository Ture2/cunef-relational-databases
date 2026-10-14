// Voice-over of the keys video. Source of truth: src/sql/keys/narration.json (edit the text there,
// then run `python scripts/tts.py --video sql/keys`).
import {makeNarration} from '../common/narration';
import data from './narration.json';
import {TIMELINE} from './timeline';

export const {segmentsOf, SPEECH_INTERVALS, Narration} = makeNarration(data.segments, TIMELINE);
