// Voice-over of the "Beyond 3NF" video. Source of truth: src/nfadv/narration.json (edit the text
// there, then run `python scripts/tts.py --video nfadv`).
import {makeNarration} from '../sql/common/narration';
import data from './narration.json';
import {TIMELINE} from './timeline';

export const {segmentsOf, SPEECH_INTERVALS, Narration} = makeNarration(data.segments, TIMELINE);
