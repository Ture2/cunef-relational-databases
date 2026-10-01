import type {Column} from './components/DataTable';

// The running example. Consistent with SCRIPT.md.
// student_id -> student_name ; course_id -> course_name, credits, dept_id ;
// dept_id -> dept_name ; (student_id, course_id) -> grade

export const COL = {
  student_id: {key: 'student_id', label: 'student_id', width: 170, tone: 'blue'},
  course_id: {key: 'course_id', label: 'course_id', width: 160, tone: 'orange'},
  student_name: {key: 'student_name', label: 'student_name', width: 210, tone: 'blue'},
  course_name: {key: 'course_name', label: 'course_name', width: 220, tone: 'orange'},
  credits: {key: 'credits', label: 'credits', width: 130, tone: 'orange'},
  grade: {key: 'grade', label: 'grade', width: 110, tone: 'teal'},
  dept_id: {key: 'dept_id', label: 'dept_id', width: 140, tone: 'maroon'},
  dept_name: {key: 'dept_name', label: 'dept_name', width: 200, tone: 'maroon'},
} as const satisfies Record<string, Column>;

export type ColKey = keyof typeof COL;

export const WIDE_KEYS: ColKey[] = [
  'student_id',
  'course_id',
  'student_name',
  'course_name',
  'credits',
  'grade',
  'dept_id',
  'dept_name',
];

type Row = Record<ColKey, string>;

export const ENROLLMENT: Row[] = [
  {student_id: 'S01', course_id: 'C10', student_name: 'Ana Ruiz', course_name: 'Databases', credits: '6', grade: '8.5', dept_id: 'D01', dept_name: 'Computing'},
  {student_id: 'S01', course_id: 'C20', student_name: 'Ana Ruiz', course_name: 'Statistics', credits: '6', grade: '7.0', dept_id: 'D02', dept_name: 'Maths'},
  {student_id: 'S02', course_id: 'C10', student_name: 'Luis Gil', course_name: 'Databases', credits: '6', grade: '6.5', dept_id: 'D01', dept_name: 'Computing'},
  {student_id: 'S02', course_id: 'C11', student_name: 'Luis Gil', course_name: 'Python', credits: '4.5', grade: '9.0', dept_id: 'D01', dept_name: 'Computing'},
  {student_id: 'S03', course_id: 'C10', student_name: 'Eva Sanz', course_name: 'Databases', credits: '6', grade: '5.0', dept_id: 'D01', dept_name: 'Computing'},
  {student_id: 'S03', course_id: 'C11', student_name: 'Eva Sanz', course_name: 'Python', credits: '4.5', grade: '7.5', dept_id: 'D01', dept_name: 'Computing'},
];

/** Columns with pk flags for a given key set. */
export const cols = (keys: ColKey[], pk: ColKey[] = [], fk: ColKey[] = []): Column[] =>
  keys.map((k) => ({...COL[k], pk: pk.includes(k), fk: fk.includes(k)}));

export const rowsOf = (keys: ColKey[], source: Row[] = ENROLLMENT): string[][] =>
  source.map((r) => keys.map((k) => r[k]));

export const LADDER = [
  {nf: '1NF', rule: 'One atomic value per cell', tone: 'yellow'},
  {nf: '2NF', rule: 'No partial dependencies', tone: 'blue'},
  {nf: '3NF', rule: 'No transitive dependencies', tone: 'maroon'},
  {nf: 'BCNF', rule: 'Every determinant is a candidate key', tone: 'teal'},
] as const;
