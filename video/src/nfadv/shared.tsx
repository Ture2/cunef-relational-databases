import type React from 'react';
import {Interactive} from 'remotion';
import type {Column} from '../components/DataTable';
import {C, FONT, TONES, type Tone} from '../theme';

export {Narration} from './narration';

/* ---- The case: a department's teaching schema, already in 3NF ----------------------------------------
   Same data as the bcnf, mvd/nf4 and jd/nf5 cards of data/<lang>/normalization-theory.js.
   Colour coding: blue = people (student, teacher, lecturer), orange = subject/course,
   maroon = tutor/campus, teal = book. */

const STUDENT: Column = {key: 'student', label: 'student', width: 170, tone: 'blue'};
const SUBJECT: Column = {key: 'subject', label: 'subject', width: 190, tone: 'orange'};
const TUTOR: Column = {key: 'tutor', label: 'tutor', width: 190, tone: 'maroon'};

/** Tutoring(student, subject, tutor): student, subject → tutor and tutor → subject. */
export const TUTORING_COLS: Column[] = [{...STUDENT, pk: true}, {...SUBJECT, pk: true}, TUTOR];
export const TUTORING_ROWS = [
  ['Ana', 'Maths', 'Pérez'],
  ['Luis', 'Maths', 'Pérez'],
  ['Eva', 'Maths', 'Pérez'],
  ['Ana', 'Physics', 'Gómez'],
];
/** BCNF split: TutorSubject(tutor, subject) and Tutoring(student, tutor). */
export const TUTOR_SUBJECT_COLS: Column[] = [{...TUTOR, pk: true}, SUBJECT];
export const TUTOR_SUBJECT_ROWS = [
  ['Pérez', 'Maths'],
  ['Gómez', 'Physics'],
];
export const TUTORING_BCNF_COLS: Column[] = [{...STUDENT, pk: true}, {...TUTOR, pk: true, fk: true}];
export const TUTORING_BCNF_ROWS = [
  ['Ana', 'Pérez'],
  ['Luis', 'Pérez'],
  ['Eva', 'Pérez'],
  ['Ana', 'Gómez'],
];

const COURSE: Column = {key: 'course', label: 'course', width: 210, tone: 'orange'};
const TEACHER: Column = {key: 'teacher', label: 'teacher', width: 170, tone: 'blue'};
const BOOK: Column = {key: 'book', label: 'book', width: 220, tone: 'teal'};

/** CourseMaterial(course, teacher, book): course ↠ teacher | book, all key. */
export const MATERIAL_COLS: Column[] = [{...COURSE, pk: true}, {...TEACHER, pk: true}, {...BOOK, pk: true}];
export const MATERIAL_ROWS = [
  ['Databases', 'Ruiz', 'Elmasri'],
  ['Databases', 'Ruiz', 'Date'],
  ['Databases', 'Gil', 'Elmasri'],
  ['Databases', 'Gil', 'Date'],
  // The two rows a third book needs before 4NF.
  ['Databases', 'Ruiz', 'Silberschatz'],
  ['Databases', 'Gil', 'Silberschatz'],
];
export const COURSE_TEACHER_COLS: Column[] = [{...COURSE, pk: true}, {...TEACHER, pk: true}];
export const COURSE_TEACHER_ROWS = [
  ['Databases', 'Ruiz'],
  ['Databases', 'Gil'],
];
export const COURSE_BOOK_COLS: Column[] = [{...COURSE, pk: true}, {...BOOK, pk: true}];
export const COURSE_BOOK_ROWS = [
  ['Databases', 'Elmasri'],
  ['Databases', 'Date'],
  ['Databases', 'Silberschatz'],
];

const LECTURER: Column = {key: 'lecturer', label: 'lecturer', width: 170, tone: 'blue'};
const CAMPUS: Column = {key: 'campus', label: 'campus', width: 170, tone: 'maroon'};

/**
 * Teaching(lecturer, course, campus) under the cyclic rule: it equals the join of its three pairs,
 * and of no two of them (LecturerCourse ⋈ CourseCampus adds Gil · Databases · Online).
 */
export const TEACHING_COLS: Column[] = [{...LECTURER, pk: true}, {...COURSE, pk: true}, {...CAMPUS, pk: true}];
export const TEACHING_ROWS = [
  ['Ruiz', 'Databases', 'Online'],
  ['Ruiz', 'Statistics', 'Madrid'],
  ['Gil', 'Databases', 'Madrid'],
  ['Ruiz', 'Databases', 'Madrid'],
];
export const LECTURER_COURSE_COLS: Column[] = [{...LECTURER, pk: true}, {...COURSE, pk: true}];
export const LECTURER_COURSE_ROWS = [
  ['Ruiz', 'Databases'],
  ['Ruiz', 'Statistics'],
  ['Gil', 'Databases'],
];
export const COURSE_CAMPUS_COLS: Column[] = [{...COURSE, pk: true}, {...CAMPUS, pk: true}];
export const COURSE_CAMPUS_ROWS = [
  ['Databases', 'Online'],
  ['Statistics', 'Madrid'],
  ['Databases', 'Madrid'],
];
export const LECTURER_CAMPUS_COLS: Column[] = [{...LECTURER, pk: true}, {...CAMPUS, pk: true}];
export const LECTURER_CAMPUS_ROWS = [
  ['Ruiz', 'Online'],
  ['Ruiz', 'Madrid'],
  ['Gil', 'Madrid'],
];
/** LecturerCourse ⋈ CourseCampus. Row SPURIOUS never existed. */
export const TWO_PAIR_JOIN_ROWS = [
  ['Ruiz', 'Databases', 'Online'],
  ['Ruiz', 'Databases', 'Madrid'],
  ['Ruiz', 'Statistics', 'Madrid'],
  ['Gil', 'Databases', 'Online'],
  ['Gil', 'Databases', 'Madrid'],
];
export const SPURIOUS = 3;

/* ---- Small pieces ---------------------------------------------------------------------------------- */

/** A block of text placed absolutely, rising slightly as it fades in. */
export const Note: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly opacity: number;
  readonly size?: number;
  readonly color?: string;
  readonly align?: 'left' | 'center';
  readonly children: React.ReactNode;
}> = ({name, x, y, width, opacity, size = 32, color = C.ink, align = 'left', children}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      fontFamily: FONT,
      fontSize: size,
      lineHeight: 1.3,
      color,
      textAlign: align,
      opacity,
      translate: `0px ${(1 - opacity) * 12}px`,
    }}
  >
    {children}
  </Interactive.Div>
);

/** A dependency written out, e.g. "tutor → subject", followed by its verdict pill (✓ / ✗). */
export const CheckLine: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly dep: React.ReactNode;
  readonly verdict: React.ReactNode;
  readonly ok: boolean;
  readonly opacity: number;
  readonly depWidth?: number;
}> = ({name, x, y, dep, verdict, ok, opacity, depWidth = 430}) => {
  const tone: Tone = ok ? 'teal' : 'orange';
  return (
    <Interactive.Div
      name={name}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        fontFamily: FONT,
        opacity,
        translate: `${(1 - opacity) * 16}px 0px`,
      }}
    >
      <div style={{fontSize: 34, fontWeight: 700, color: C.ink, width: depWidth, whiteSpace: 'nowrap'}}>{dep}</div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          color: TONES[tone].strong,
          backgroundColor: TONES[tone].soft,
          border: `3px solid ${TONES[tone].strong}`,
          borderRadius: 999,
          padding: '6px 20px',
        }}
      >
        {verdict}
      </div>
    </Interactive.Div>
  );
};

/** Straight lines between points in scene coordinates, each drawn on with its own progress. */
export const Edges: React.FC<{
  readonly name: string;
  readonly edges: readonly {readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly t: number; readonly label?: string}[];
  readonly color?: string;
  readonly opacity?: number;
}> = ({name, edges, color = C.ink, opacity = 1}) => (
  <Interactive.Svg
    name={name}
    width={1920}
    height={1080}
    viewBox="0 0 1920 1080"
    style={{position: 'absolute', left: 0, top: 0, opacity, overflow: 'visible', pointerEvents: 'none'}}
  >
    {edges.map((e, i) =>
      e.t > 0 ? (
        <g key={i}>
          <line x1={e.x1} y1={e.y1} x2={e.x1 + (e.x2 - e.x1) * e.t} y2={e.y1 + (e.y2 - e.y1) * e.t} stroke={color} strokeWidth={5} strokeLinecap="round" />
          {e.label ? (
            <text
              x={(e.x1 + e.x2) / 2}
              y={(e.y1 + e.y2) / 2 - 14}
              textAnchor="middle"
              fontFamily={FONT}
              fontSize={28}
              fontStyle="italic"
              fill={C.muted}
              opacity={Math.max(0, (e.t - 0.6) / 0.4)}
              paintOrder="stroke"
              stroke={C.bg}
              strokeWidth={8}
            >
              {e.label}
            </text>
          ) : null}
        </g>
      ) : null,
    )}
  </Interactive.Svg>
);
