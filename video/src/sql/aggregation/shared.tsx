import type React from 'react';
import {Interactive} from 'remotion';
import {lerp} from '../../anim';
import {HEAD_H, ROW_H} from '../../components/DataTable';
import {C, FONT, TONES, type Tone} from '../../theme';
import {MONO} from '../common/SqlCode';

export {Narration} from './narration';

/* ---- Piles: rows of a table sorted into groups (GROUP BY) ----------------------------------------- */

/** Extra vertical space between two piles. */
export const PILE_GAP = 28;

/**
 * Layout of rows sorted into piles. piles: the original row indices of each pile, in display order.
 * Rows left out of every pile keep their place (offset 0).
 */
export const pileLayout = (piles: readonly (readonly number[])[]) => {
  const slot: Record<number, {readonly slot: number; readonly pile: number}> = {};
  let n = 0;
  piles.forEach((rows, p) => rows.forEach((r) => (slot[r] = {slot: n++, pile: p})));
  /** Top of a row inside the table (from the table top) once sorted. */
  const sortedTop = (r: number) => HEAD_H + slot[r].slot * ROW_H + slot[r].pile * PILE_GAP;
  return {
    pileOf: (r: number): number => (r in slot ? slot[r].pile : -1),
    /** rowOffset for <DataTable>: 0 in the original order, t = 1 sorted into piles. */
    offset: (r: number, t: number) => (r in slot ? (sortedTop(r) - (HEAD_H + r * ROW_H)) * t : 0),
    sortedTop,
    /** Vertical centre of pile p, from the table top. */
    pileCy: (p: number) => {
      const rows = piles[p];
      return (sortedTop(rows[0]) + sortedTop(rows[rows.length - 1]) + ROW_H) / 2;
    },
  };
};

/** Soft tint of each pile (C10, C11, C20). */
export const PILE_TONES: readonly Tone[] = ['blue', 'yellow', 'teal'];

/* ---- Fold: rows sliding into one result row ------------------------------------------------------- */

export type FoldRow = {
  readonly x1: number;
  readonly y1: number;
  readonly w1: number;
  readonly x2: number;
  readonly y2: number;
  readonly w2: number;
  /** 0..1 progress of the move. */
  readonly t: number;
  readonly tone?: Tone;
};

/** Ghost rows (outlined bars) that travel from a table to a result row and fade as they land. */
export const Fold: React.FC<{readonly name: string; readonly rows: readonly FoldRow[]}> = ({name, rows}) => (
  <Interactive.Div name={name} style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, pointerEvents: 'none'}}>
    {rows.map((g, i) =>
      g.t > 0 && g.t < 1 ? (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: lerp(g.t, g.x1, g.x2),
            top: lerp(g.t, g.y1, g.y2),
            width: lerp(g.t, g.w1, g.w2),
            height: ROW_H,
            boxSizing: 'border-box',
            borderRadius: 8,
            backgroundColor: TONES[g.tone ?? 'orange'].soft,
            border: `3px solid ${C.accent}`,
            opacity: 0.9 * (1 - g.t * g.t),
          }}
        />
      ) : null,
    )}
  </Interactive.Div>
);

/* ---- A supermarket receipt: many lines, one total -------------------------------------------------- */

export const Receipt: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly lines: readonly (readonly [string, string])[];
  readonly total: string;
  readonly opacity?: number;
  readonly lineOpacity?: (i: number) => number;
  readonly totalOpacity?: number;
  /** 0..1 orange outline around the total. */
  readonly totalOutline?: number;
}> = ({name, x, y, width = 480, lines, total, opacity = 1, lineOpacity, totalOpacity = 1, totalOutline = 0}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      boxSizing: 'border-box',
      padding: '28px 36px 30px',
      backgroundColor: C.surface,
      border: `2px solid ${C.rule}`,
      borderRadius: 6,
      boxShadow: '0 4px 18px rgba(26, 31, 108, 0.08)',
      fontFamily: MONO,
      fontSize: 30,
      color: C.ink,
      opacity,
    }}
  >
    <div style={{fontFamily: FONT, fontSize: 26, fontWeight: 700, letterSpacing: 4, color: C.muted, textAlign: 'center', marginBottom: 18}}>SUPERMARKET</div>
    {lines.map(([item, price], i) => (
      <div key={item} style={{display: 'flex', justifyContent: 'space-between', height: 48, alignItems: 'center', opacity: lineOpacity?.(i) ?? 1}}>
        <span>{item}</span>
        <span>{price}</span>
      </div>
    ))}
    <div style={{borderTop: `3px dashed ${C.rule}`, margin: '14px 0 12px', opacity: totalOpacity}} />
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 64,
        padding: '0 12px',
        margin: '0 -12px',
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 36,
        opacity: totalOpacity,
        boxShadow: totalOutline > 0 ? `inset 0 0 0 ${4 * totalOutline}px ${C.accent}` : undefined,
        backgroundColor: totalOutline > 0 ? TONES.orange.soft : undefined,
      }}
    >
      <span>TOTAL</span>
      <span>{total}</span>
    </div>
  </Interactive.Div>
);

/* ---- A small round counter badge (1, 2, 3 …) beside a row ----------------------------------------- */

export const Badge: React.FC<{
  readonly name: string;
  readonly x: number;
  readonly cy: number;
  readonly opacity: number;
  readonly tone?: Tone;
  readonly children: React.ReactNode;
}> = ({name, x, cy, opacity, tone = 'blue', children}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: x,
      top: cy - 22,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: TONES[tone].strong,
      color: C.surface,
      fontFamily: FONT,
      fontSize: 26,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
      scale: `${0.6 + 0.4 * opacity}`,
    }}
  >
    {children}
  </Interactive.Div>
);

/** A cell value that fades in with t (the cell itself, borders included, stays visible). */
export const reveal = (value: React.ReactNode, t: number): React.ReactNode => <span style={{opacity: t}}>{value}</span>;
