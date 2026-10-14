// The SCHOOL schema of the SQL section of the website (data/en/sql.js, SCHOOL): the running example of
// every SQL video. Colour coding: blue = student, orange = course, teal = department, maroon = enrolment.
// Marketing (C30) has no students, Eva (S03) has no email: the standard outer-join and NULL examples.
import type React from 'react';
import type {Column} from '../../components/DataTable';
import {C} from '../../theme';

/** A NULL cell: grey italic, as on the website's result grids. */
export const Null: React.FC = () => <span style={{color: C.muted, fontStyle: 'italic'}}>NULL</span>;

export const DEPARTMENT = [
  ['D01', 'Computing'],
  ['D02', 'Maths'],
] as const;

export const STUDENT = [
  ['S01', 'Ana Ruiz', 'ana@uni.es'],
  ['S02', 'Luis Gil', 'luis@uni.es'],
  ['S03', 'Eva Sanz', null],
] as const;

export const COURSE = [
  ['C10', 'Databases', '6', 'D01'],
  ['C11', 'Python', '4.5', 'D01'],
  ['C20', 'Statistics', '6', 'D02'],
  ['C30', 'Marketing', '3', 'D02'],
] as const;

export const ENROLMENT = [
  ['S01', 'C10', '8.5'],
  ['S01', 'C20', '7.0'],
  ['S02', 'C10', '6.5'],
  ['S02', 'C11', '9.0'],
  ['S03', 'C10', '5.0'],
  ['S03', 'C11', '7.5'],
] as const;

/** Rows ready for <DataTable rows>: null becomes a NULL cell. */
export const cells = (rows: readonly (readonly (string | null)[])[]): React.ReactNode[][] =>
  rows.map((r) => r.map((v) => (v === null ? <Null /> : v)));

export const DEPARTMENT_COLS: Column[] = [
  {key: 'dept_id', label: 'dept_id', width: 150, tone: 'teal', pk: true},
  {key: 'name', label: 'name', width: 210, tone: 'teal'},
];

export const STUDENT_COLS: Column[] = [
  {key: 'student_id', label: 'student_id', width: 180, tone: 'blue', pk: true},
  {key: 'name', label: 'name', width: 190, tone: 'blue'},
  {key: 'email', label: 'email', width: 210, tone: 'blue'},
];

export const COURSE_COLS: Column[] = [
  {key: 'course_id', label: 'course_id', width: 170, tone: 'orange', pk: true},
  {key: 'title', label: 'title', width: 190, tone: 'orange'},
  {key: 'credits', label: 'credits', width: 130, tone: 'orange'},
  {key: 'dept_id', label: 'dept_id', width: 140, tone: 'teal', fk: true},
];

export const ENROLMENT_COLS: Column[] = [
  {key: 'student_id', label: 'student_id', width: 180, tone: 'blue', pk: true, fk: true},
  {key: 'course_id', label: 'course_id', width: 170, tone: 'orange', pk: true, fk: true},
  {key: 'grade', label: 'grade', width: 120, tone: 'maroon'},
];

/** Student and course names by id, for result tables. */
export const STUDENT_NAME: Record<string, string> = {S01: 'Ana Ruiz', S02: 'Luis Gil', S03: 'Eva Sanz'};
export const COURSE_TITLE: Record<string, string> = {C10: 'Databases', C11: 'Python', C20: 'Statistics', C30: 'Marketing'};

/** The SHOP schema of the index cards: 50,000 customers, 100,000 orders. */
export const SHOP = {customers: 50000, orders: 100000, cities: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao']} as const;
