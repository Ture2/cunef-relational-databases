// Shared geometry for the 2NF and 3NF scenes, so 3NF starts exactly where 2NF ends.
import {colX} from './components/DataTable';
import {cols, ENROLLMENT, rowsOf, WIDE_KEYS, type ColKey} from './data';

export const WIDE = {x: 290, y: 260, columns: cols(WIDE_KEYS, ['student_id', 'course_id'])};

export const STUDENT_KEYS: ColKey[] = ['student_id', 'student_name'];
export const COURSE_KEYS: ColKey[] = ['course_id', 'course_name', 'credits', 'dept_id', 'dept_name'];
export const ENROLL_KEYS: ColKey[] = ['student_id', 'course_id', 'grade'];
export const DEPT_KEYS: ColKey[] = ['dept_id', 'dept_name'];

export const STUDENT = {x: 85, y: 260, columns: cols(STUDENT_KEYS, ['student_id'])};
export const ENROLL = {
  x: 500,
  y: 260,
  columns: cols(ENROLL_KEYS, ['student_id', 'course_id'], ['student_id', 'course_id']),
};
export const COURSE = {x: 975, y: 260, columns: cols(COURSE_KEYS, ['course_id'])};
export const COURSE_3NF_COLUMNS = cols(['course_id', 'course_name', 'credits', 'dept_id'], ['course_id'], ['dept_id']);

const deptCol = COURSE_KEYS.indexOf('dept_id');
export const DEPT = {x: COURSE.x + colX(COURSE.columns, deptCol), y: 620, columns: cols(DEPT_KEYS, ['dept_id'])};

/** Rows of the wide table projected on some columns (6 rows, with duplicates). */
export const STUDENT_ROWS_RAW = rowsOf(STUDENT_KEYS);
export const COURSE_ROWS_RAW = rowsOf(COURSE_KEYS);
export const ENROLL_ROWS = rowsOf(ENROLL_KEYS);

/** Index of the first occurrence of each distinct row (dedupe), and its new position. */
export const dedupe = (rows: string[][]) => {
  const seen = new Map<string, number>();
  const newIndex: (number | null)[] = rows.map((r) => {
    const k = r.join('|');
    if (seen.has(k)) return null;
    seen.set(k, seen.size);
    return seen.get(k) as number;
  });
  return {newIndex, unique: rows.filter((_, i) => newIndex[i] !== null)};
};

export const STUDENT_DEDUPE = dedupe(STUDENT_ROWS_RAW);
export const COURSE_DEDUPE = dedupe(COURSE_ROWS_RAW);
export const STUDENT_ROWS = STUDENT_DEDUPE.unique;
export const COURSE_ROWS = COURSE_DEDUPE.unique;
export const DEPT_ROWS_RAW = COURSE_ROWS.map((r) => [r[3], r[4]]);
export const DEPT_DEDUPE = dedupe(DEPT_ROWS_RAW);

/** x of a column of the wide table, by key, in scene coordinates. */
export const wideColLeft = (key: ColKey) =>
  WIDE.x + colX(WIDE.columns, WIDE_KEYS.indexOf(key));

export {ENROLLMENT};
