// Scene timing of the "Indexes" video. Keep in sync with SCRIPT-sql-indexes.md and the chapter list
// in js/sql.js (SQL_VIDEOS['sql-indexes'].chapters). scripts/tts.py parses DURATIONS and HOLDS.
import {buildTimeline, s} from '../common/timeline';

const DURATIONS = {
  title: s(8),
  phonebook: s(18),
  scan: s(22),
  btree: s(32),
  plan: s(29),
  composite: s(28),
  cost: s(20),
  functions: s(24),
  outro: s(9),
} as const;

const NAMES: Record<keyof typeof DURATIONS, string> = {
  title: '01 Title',
  phonebook: '02 Phone book',
  scan: '03 Full table scan',
  btree: '04 CREATE INDEX and the B-tree',
  plan: '05 EXPLAIN PLAN',
  composite: '06 Composite index',
  cost: '07 What indexes cost',
  functions: '08 Functions hide the index',
  outro: '09 Outro',
};

// Extra seconds that hold a scene's final state (added for the narration).
const HOLDS: Partial<Record<keyof typeof DURATIONS, number>> = {};

export const {TIMELINE, TOTAL_FRAMES} = buildTimeline(DURATIONS, NAMES, HOLDS);
