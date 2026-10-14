// Scene timing of the "DDL" video. Keep in sync with SCRIPT-sql-ddl.md and the chapter list
// in js/sql.js (SQL_VIDEOS['sql-ddl'].chapters). scripts/tts.py parses DURATIONS and HOLDS.
import {buildTimeline, s} from '../common/timeline';

const DURATIONS = {
  title: s(8),
  families: s(26),
  create: s(35),
  constraints: s(26),
  parent: s(24),
  alter: s(33),
  commit: s(15),
  dictionary: s(27),
  outro: s(9),
} as const;

const NAMES: Record<keyof typeof DURATIONS, string> = {
  title: '01 Title',
  families: '02 DDL, DML, DCL, TCL',
  create: '03 CREATE TABLE and types',
  constraints: '04 Inline and out-of-line constraints',
  parent: '05 Parent table first',
  alter: '06 ALTER TABLE',
  commit: '07 DDL commits',
  dictionary: '08 Data dictionary and DROP',
  outro: '09 Outro',
};

// Extra seconds that hold a scene's final state (added for the narration).
const HOLDS: Partial<Record<keyof typeof DURATIONS, number>> = {};

export const {TIMELINE, TOTAL_FRAMES} = buildTimeline(DURATIONS, NAMES, HOLDS);
