// Voice-over of the DDL video. Source of truth: src/sql/ddl/narration.json (edit the text there,
// then run `python scripts/tts.py --video sql/ddl`).
import {makeNarration} from '../common/narration';
import data from './narration.json';
import {TIMELINE} from './timeline';

export const {segmentsOf, SPEECH_INTERVALS, Narration} = makeNarration(data.segments, TIMELINE);
