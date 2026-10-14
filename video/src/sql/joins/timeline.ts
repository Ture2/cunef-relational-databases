// Scene timing of the "Joins" video. Keep in sync with SCRIPT-sql-joins.md and the chapter list
// in js/sql.js (SQL_VIDEOS['sql-joins'].chapters). scripts/tts.py parses DURATIONS and HOLDS.
import {buildTimeline, s} from '../common/timeline';

const DURATIONS = {
  title: s(8),
  why: s(22),
  inner: s(30),
  left: s(30),
  rightfull: s(24),
  cross: s(18),
  self: s(22),
  summary: s(16),
  outro: s(9),
} as const;

const NAMES: Record<keyof typeof DURATIONS, string> = {
  title: '01 Title',
  why: '02 Why join',
  inner: '03 INNER JOIN',
  left: '04 LEFT JOIN and anti-join',
  rightfull: '05 RIGHT and FULL',
  cross: '06 CROSS JOIN',
  self: '07 Self-join',
  summary: '08 Summary',
  outro: '09 Outro',
};

// Extra seconds that hold a scene's final state (added for the narration).
const HOLDS: Partial<Record<keyof typeof DURATIONS, number>> = {};

export const {TIMELINE, TOTAL_FRAMES} = buildTimeline(DURATIONS, NAMES, HOLDS);
