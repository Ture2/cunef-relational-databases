// Scene timing of the "Aggregation" video. Keep in sync with SCRIPT-sql-aggregation.md and the chapter
// list in js/sql.js (SQL_VIDEOS['sql-aggregation'].chapters). scripts/tts.py parses DURATIONS and HOLDS.
import {buildTimeline, s} from '../common/timeline';

const DURATIONS = {
  title: s(8),
  receipt: s(18),
  count: s(21),
  functions: s(22),
  groupby: s(34),
  having: s(33),
  order: s(21),
  errors: s(30),
  outro: s(9),
} as const;

const NAMES: Record<keyof typeof DURATIONS, string> = {
  title: '01 Title',
  receipt: '02 Many rows, one value',
  count: '03 COUNT(*) and COUNT(column)',
  functions: '04 SUM, AVG, MIN, MAX',
  groupby: '05 GROUP BY',
  having: '06 WHERE and HAVING',
  order: '07 Logical order',
  errors: '08 Common errors',
  outro: '09 Outro',
};

// Extra seconds that hold a scene's final state (added for the narration).
const HOLDS: Partial<Record<keyof typeof DURATIONS, number>> = {};

export const {TIMELINE, TOTAL_FRAMES} = buildTimeline(DURATIONS, NAMES, HOLDS);
