// Scene timing of the "Triggers" video. Keep in sync with SCRIPT-sql-triggers.md and the chapter list
// in js/sql.js (SQL_VIDEOS['sql-triggers'].chapters). scripts/tts.py parses DURATIONS and HOLDS.
import {buildTimeline, s} from '../common/timeline';

const DURATIONS = {
  title: s(8),
  what: s(25),
  before: s(32),
  audit: s(35),
  oldnew: s(26),
  order: s(31),
  pitfalls: s(27),
  outro: s(9),
} as const;

const NAMES: Record<keyof typeof DURATIONS, string> = {
  title: '01 Title',
  what: '02 What is a trigger',
  before: '03 BEFORE row trigger',
  audit: '04 AFTER row trigger: audit',
  oldnew: '05 :OLD and :NEW',
  order: '06 Statement vs row, firing order',
  pitfalls: '07 Pitfalls',
  outro: '08 Outro',
};

// Extra seconds that hold a scene's final state (added for the narration).
const HOLDS: Partial<Record<keyof typeof DURATIONS, number>> = {};

export const {TIMELINE, TOTAL_FRAMES} = buildTimeline(DURATIONS, NAMES, HOLDS);
