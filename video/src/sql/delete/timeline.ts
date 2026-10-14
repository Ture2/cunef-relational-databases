// Scene timing of the "DELETE vs TRUNCATE vs DROP" video. Keep in sync with SCRIPT-sql-delete.md and
// the chapter list in js/sql.js (SQL_VIDEOS['sql-delete'].chapters). scripts/tts.py parses DURATIONS and HOLDS.
import {buildTimeline, s} from '../common/timeline';

const DURATIONS = {
  title: s(8),
  levels: s(20),
  delete: s(30),
  truncate: s(26),
  parent: s(20),
  drop: s(28),
  cascade: s(20),
  summary: s(25),
  outro: s(9),
} as const;

const NAMES: Record<keyof typeof DURATIONS, string> = {
  title: '01 Title',
  levels: '02 Three levels',
  delete: '03 DELETE',
  truncate: '04 TRUNCATE',
  parent: '05 TRUNCATE a parent',
  drop: '06 DROP and the recycle bin',
  cascade: '07 CASCADE CONSTRAINTS',
  summary: '08 Summary',
  outro: '09 Outro',
};

// Extra seconds that hold a scene's final state (added for the narration).
const HOLDS: Partial<Record<keyof typeof DURATIONS, number>> = {};

export const {TIMELINE, TOTAL_FRAMES} = buildTimeline(DURATIONS, NAMES, HOLDS);
