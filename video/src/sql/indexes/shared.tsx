import type React from 'react';
import {Interactive} from 'remotion';
import {C, FONT, TONES, type Tone} from '../../theme';
import {MONO} from '../common/SqlCode';

export {Narration} from './narration';

/* ---- The SHOP customer table (data/en/sql.js, SHOP): id, 'user' || id || '@mail.com', city, date ---- */

const CITIES = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao'];
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** A customer row of the SHOP schema, generated exactly as the site's CONNECT BY LEVEL setup does. */
export const customerRow = (id: number): [string, string, string, string] => {
  const d = new Date(Date.UTC(2020, 0, 1) + (id % 1500) * 86400000);
  return [String(id), `user${id}@mail.com`, CITIES[id % 5], `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`];
};

export const TARGET_EMAIL = 'user43210@mail.com';

/* ---- An execution plan as DBMS_XPLAN.DISPLAY prints it (Id | Operation | Name) -------------------- */

export type PlanLineFx = {
  readonly opacity?: number;
  /** 0..1 soft highlight bar behind the line. */
  readonly highlight?: number;
  readonly tone?: Tone;
};

export const planLineHeight = (size: number) => Math.round(size * 1.5);
const PLAN_PAD = 22;

/** Height of a PlanPanel with n lines. */
export const planHeight = (n: number, size = 26) => n * planLineHeight(size) + PLAN_PAD * 2;

/** A monospace plan table; line 0 is the header (bold, ruled below). */
export const PlanPanel: React.FC<{
  readonly name: string;
  readonly lines: readonly string[];
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly size?: number;
  readonly title?: string;
  readonly opacity?: number;
  readonly line?: (i: number) => PlanLineFx | undefined;
}> = ({name, lines, x, y, width, size = 26, title, opacity = 1, line}) => {
  const lh = planLineHeight(size);
  return (
    <Interactive.Div
      name={name}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height: planHeight(lines.length, size),
        boxSizing: 'border-box',
        backgroundColor: '#f8f6f2',
        border: `2px solid ${C.rule}`,
        borderRadius: 14,
        boxShadow: '0 4px 18px rgba(26, 31, 108, 0.08)',
        opacity,
      }}
    >
      {title ? (
        <div style={{position: 'absolute', left: 0, top: -50, fontFamily: FONT, fontSize: 32, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap'}}>{title}</div>
      ) : null}
      {lines.map((text, i) => {
        const fx = line?.(i);
        const hl = fx?.highlight ?? 0;
        const tone = TONES[fx?.tone ?? 'orange'];
        return (
          <div key={i} style={{position: 'absolute', left: 0, right: 0, top: PLAN_PAD + i * lh, height: lh, opacity: fx?.opacity ?? 1}}>
            {hl > 0 ? (
              <div style={{position: 'absolute', inset: '0 8px', borderRadius: 8, backgroundColor: tone.soft, opacity: hl}}>
                <div
                  style={{position: 'absolute', left: 0, top: 5, bottom: 5, width: 6, borderRadius: 3, backgroundColor: fx?.tone === 'teal' ? tone.strong : C.accent}}
                />
              </div>
            ) : null}
            <div
              style={{
                position: 'absolute',
                left: PLAN_PAD,
                top: 0,
                height: lh,
                display: 'flex',
                alignItems: 'center',
                fontFamily: MONO,
                fontSize: size,
                fontWeight: i === 0 || hl > 0.5 ? 700 : 400,
                color: hl > 0.5 ? tone.strong : C.ink,
                whiteSpace: 'pre',
              }}
            >
              {text}
            </div>
            {i === 0 ? <div style={{position: 'absolute', left: PLAN_PAD, right: PLAN_PAD, bottom: 0, height: 2, backgroundColor: C.rule}} /> : null}
          </div>
        );
      })}
    </Interactive.Div>
  );
};

/* ---- B-tree pieces: a node of keys and the edges between nodes ------------------------------------ */

export const BRANCH_H = 60;
export const LEAF_ROW = 36;
export const LEAF_PAD = 8;

/** Scene y of the centre of key i of a leaf node at y. */
export const leafKeyY = (y: number, i: number) => y + 3 + LEAF_PAD + i * (LEAF_ROW + 2) + LEAF_ROW / 2;

/** A B-tree node: keys in a row (root/branch) or a column (leaf), centred on cx. */
export const BNode: React.FC<{
  readonly name: string;
  readonly keys: readonly string[];
  readonly cx: number;
  readonly y: number;
  readonly width: number;
  readonly leaf?: boolean;
  readonly opacity?: number;
  /** 0..1 orange outline (the node on the search path). */
  readonly outline?: number;
  /** Index of the key to highlight, and its progress. */
  readonly hit?: {readonly i: number; readonly t: number};
  readonly faint?: boolean;
  readonly size?: number;
}> = ({name, keys, cx, y, width, leaf = false, opacity = 1, outline = 0, hit, faint = false, size = 24}) => (
  <Interactive.Div
    name={name}
    style={{
      position: 'absolute',
      left: cx - width / 2,
      top: y,
      width,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: leaf ? 'column' : 'row',
      justifyContent: 'center',
      alignItems: 'stretch',
      gap: leaf ? 2 : 0,
      padding: leaf ? `${LEAF_PAD}px 10px` : '0 6px',
      height: leaf ? undefined : BRANCH_H,
      borderRadius: 12,
      backgroundColor: leaf ? (faint ? '#eef5f5' : TONES.teal.soft) : C.surface,
      border: `3px solid ${faint ? C.rule : TONES.teal.strong}`,
      boxShadow: outline > 0 ? `0 0 0 ${6 * outline}px ${C.accent}` : '0 4px 14px rgba(26, 31, 108, 0.08)',
      fontFamily: MONO,
      fontSize: size,
      color: faint ? C.muted : C.ink,
      opacity,
    }}
  >
    {keys.map((k, i) => {
      const t = hit && hit.i === i ? hit.t : 0;
      return (
        <div
          key={`${k}${i}`}
          style={{
            flex: leaf ? undefined : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: leaf ? LEAF_ROW : undefined,
            borderLeft: !leaf && i > 0 ? `2px solid ${C.rule}` : undefined,
            borderRadius: 6,
            backgroundColor: t > 0 ? `rgba(255, 87, 0, ${0.22 * t})` : undefined,
            fontWeight: t > 0.5 ? 700 : 400,
            color: t > 0.5 ? TONES.orange.strong : undefined,
            whiteSpace: 'nowrap',
          }}
        >
          {k}
        </div>
      );
    })}
  </Interactive.Div>
);

export type Edge = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  /** 0..1 draw-on progress of the grey edge. */
  readonly t: number;
  /** 0..1 progress of the orange search path along the edge. */
  readonly hot?: number;
  readonly dashed?: boolean;
  /** Draw an arrow head at the end (leaf chain). */
  readonly head?: boolean;
};

/** Straight edges between tree nodes, each drawn on with its own progress; `hot` edges turn orange. */
export const Edges: React.FC<{readonly name: string; readonly edges: readonly Edge[]; readonly opacity?: number}> = ({name, edges, opacity = 1}) => (
  <Interactive.Svg
    name={name}
    width={1920}
    height={1080}
    viewBox="0 0 1920 1080"
    style={{position: 'absolute', left: 0, top: 0, opacity, overflow: 'visible', pointerEvents: 'none'}}
  >
    {edges.map((e, i) => {
      if (e.t <= 0) return null;
      const hot = e.hot ?? 0;
      const ex = e.x1 + (e.x2 - e.x1) * e.t;
      const ey = e.y1 + (e.y2 - e.y1) * e.t;
      const len = Math.hypot(e.x2 - e.x1, e.y2 - e.y1) || 1;
      const ux = (e.x2 - e.x1) / len;
      const uy = (e.y2 - e.y1) / len;
      return (
        <g key={i}>
          <line x1={e.x1} y1={e.y1} x2={ex} y2={ey} stroke={e.dashed ? C.rule : TONES.teal.strong} strokeWidth={4} strokeLinecap="round" strokeDasharray={e.dashed ? '10 10' : undefined} opacity={e.dashed ? 1 : 0.55} />
          {e.head && e.t >= 1 ? (
            <polygon
              points={`${e.x2},${e.y2} ${e.x2 - ux * 16 - uy * 9},${e.y2 - uy * 16 + ux * 9} ${e.x2 - ux * 16 + uy * 9},${e.y2 - uy * 16 - ux * 9}`}
              fill={TONES.teal.strong}
              opacity={0.55}
            />
          ) : null}
          {hot > 0 ? (
            <line x1={e.x1} y1={e.y1} x2={e.x1 + (e.x2 - e.x1) * hot} y2={e.y1 + (e.y2 - e.y1) * hot} stroke={C.accent} strokeWidth={8} strokeLinecap="round" />
          ) : null}
        </g>
      );
    })}
  </Interactive.Svg>
);
