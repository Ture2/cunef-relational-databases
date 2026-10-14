// Scene timing of the "Subqueries" video. Keep in sync with SCRIPT-sql-subqueries.md and the chapter
// list in js/sql.js. scripts/tts.py parses DURATIONS and HOLDS.
import {buildTimeline, s} from '../common/timeline';

const DURATIONS = {
  title: s(8),
  scalar: s(26),
  in: s(24),
  anyall: s(29),
  notin: s(32),
  correlated: s(29),
  exists: s(25),
  from: s(27),
  outro: s(9),
} as const;

const NAMES: Record<keyof typeof DURATIONS, string> = {
  title: '01 Title',
  scalar: '02 A subquery in WHERE',
  in: '03 IN with a list',
  anyall: '04 ANY and ALL',
  notin: '05 The NOT IN trap',
  correlated: '06 Correlated subquery',
  exists: '07 EXISTS and NOT EXISTS',
  from: '08 Inline view in FROM',
  outro: '09 Outro',
};

// Extra seconds that hold a scene's final state (added for the narration).
const HOLDS: Partial<Record<keyof typeof DURATIONS, number>> = {};

export const {TIMELINE, TOTAL_FRAMES} = buildTimeline(DURATIONS, NAMES, HOLDS);
