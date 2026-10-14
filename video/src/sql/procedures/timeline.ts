// Scene timing of the "Procedures and functions" video. Keep in sync with SCRIPT-sql-procedures.md and
// the chapter list in js/sql.js. scripts/tts.py parses DURATIONS and HOLDS.
import {buildTimeline, s} from '../common/timeline';

const DURATIONS = {
  title: s(8),
  named: s(26),
  procedure: s(29),
  call: s(24),
  errors: s(24),
  func: s(29),
  compare: s(28),
  packages: s(19),
  outro: s(9),
} as const;

const NAMES: Record<keyof typeof DURATIONS, string> = {
  title: '01 Title',
  named: '02 From block to subprogram',
  procedure: '03 CREATE PROCEDURE',
  call: '04 Calling it',
  errors: '05 Handling errors',
  func: '06 A function',
  compare: '07 Procedure or function',
  packages: '08 Packages',
  outro: '09 Outro',
};

// Extra seconds that hold a scene's final state (added for the narration).
const HOLDS: Partial<Record<keyof typeof DURATIONS, number>> = {};

export const {TIMELINE, TOTAL_FRAMES} = buildTimeline(DURATIONS, NAMES, HOLDS);
