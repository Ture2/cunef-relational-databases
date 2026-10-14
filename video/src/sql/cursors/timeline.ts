// Scene timing of the "Cursors" video. Keep in sync with SCRIPT-sql-cursors.md and the chapter list
// in js/sql.js (SQL_VIDEOS['sql-cursors'].chapters). scripts/tts.py parses DURATIONS and HOLDS.
import {buildTimeline, s} from '../common/timeline';

const DURATIONS = {
  title: s(8),
  sets: s(24),
  implicit: s(22),
  lifecycle: s(36),
  attributes: s(22),
  forloop: s(22),
  curve: s(36),
  mistake: s(27),
  outro: s(9),
} as const;

const NAMES: Record<keyof typeof DURATIONS, string> = {
  title: '01 Title',
  sets: '02 Sets and rows',
  implicit: '03 Implicit cursors',
  lifecycle: '04 Explicit cursor lifecycle',
  attributes: '05 Cursor attributes',
  forloop: '06 Cursor FOR loop',
  curve: '07 FOR UPDATE and WHERE CURRENT OF',
  mistake: '08 Prefer set-based SQL',
  outro: '09 Outro',
};

// Extra seconds that hold a scene's final state (added for the narration).
const HOLDS: Partial<Record<keyof typeof DURATIONS, number>> = {};

export const {TIMELINE, TOTAL_FRAMES} = buildTimeline(DURATIONS, NAMES, HOLDS);
