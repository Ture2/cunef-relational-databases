// Scene timing of the "Beyond 3NF" video (BCNF, 4NF, 5NF). Keep in sync with
// SCRIPT-normalization-advanced.md and the chapter list in js/normalization-section.js
// (VIDEO_ADVANCED.chapters). scripts/tts.py parses DURATIONS and HOLDS.
import {buildTimeline, s} from '../sql/common/timeline';

const DURATIONS = {
  title: s(6),
  case: s(14),
  concepts: s(26),
  bcnf: s(35),
  nf4: s(26),
  nf5: s(35),
  summary: s(9),
  questions: s(21),
  outro: s(7),
} as const;

const NAMES: Record<keyof typeof DURATIONS, string> = {
  title: '01 Title',
  case: '02 The case: a 3NF schema',
  concepts: '03 Determinant and candidate key',
  bcnf: '04 BCNF',
  nf4: '05 4NF',
  nf5: '06 5NF',
  summary: '07 Recap',
  questions: '08 Open questions',
  outro: '09 Outro',
};

// Extra seconds that hold a scene's final state (added for the narration).
const HOLDS: Partial<Record<keyof typeof DURATIONS, number>> = {};

export const {TIMELINE, TOTAL_FRAMES} = buildTimeline(DURATIONS, NAMES, HOLDS);
