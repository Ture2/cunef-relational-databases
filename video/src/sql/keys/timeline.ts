// Scene timing of the "Primary and foreign keys" video. Keep in sync with SCRIPT-sql-keys.md and the
// chapter list in js/sql.js (SQL_VIDEOS['sql-keys'].chapters). scripts/tts.py parses DURATIONS and HOLDS.
import {buildTimeline, s} from '../common/timeline';

const DURATIONS = {
  title: s(8),
  pk: s(24),
  composite: s(27),
  unique: s(26),
  fk: s(30),
  actions: s(31),
  named: s(24),
  manage: s(28),
  outro: s(9),
} as const;

const NAMES: Record<keyof typeof DURATIONS, string> = {
  title: '01 Title',
  pk: '02 PRIMARY KEY',
  composite: '03 Composite key',
  unique: '04 UNIQUE and NULL',
  fk: '05 FOREIGN KEY',
  actions: '06 ON DELETE',
  named: '07 Named constraints',
  manage: '08 Managing constraints',
  outro: '09 Outro',
};

// Extra seconds that hold a scene's final state (added for the narration).
const HOLDS: Partial<Record<keyof typeof DURATIONS, number>> = {};

export const {TIMELINE, TOTAL_FRAMES} = buildTimeline(DURATIONS, NAMES, HOLDS);
