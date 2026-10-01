import type React from 'react';
import {Interactive} from 'remotion';
import {C, FONT, TONES, type Tone} from '../theme';

export type Column = {
  readonly key: string;
  readonly label: string;
  readonly width: number;
  readonly tone?: Tone;
  readonly pk?: boolean;
  readonly fk?: boolean;
};

export type CellFx = {
  /** Soft background tint. */
  readonly bg?: string;
  /** 0..1 strength of the orange outline. */
  readonly outline?: number;
  readonly opacity?: number;
  /** 0..1 strike-through progress. */
  readonly strike?: number;
  /** Replace the cell content. */
  readonly content?: React.ReactNode;
  readonly color?: string;
  readonly dashed?: boolean;
};

export type HeaderFx = {
  readonly label?: React.ReactNode;
  readonly outline?: number;
  /** Override pk underline progress 0..1 (default: 1 when column.pk). */
  readonly pk?: number;
  /** FK badge opacity 0..1 (default: 1 when column.fk). */
  readonly fk?: number;
  /** Tint strength of the header tone 0..1 (default 1). */
  readonly tint?: number;
};

export const ROW_H = 58;
export const HEAD_H = 64;

export const tableWidth = (columns: readonly Column[]) =>
  columns.reduce((a, c) => a + c.width, 0);

export const colX = (columns: readonly Column[], index: number) =>
  columns.slice(0, index).reduce((a, c) => a + c.width, 0);

/** Geometry helpers in scene coordinates, for arrows. */
export const geom = (columns: readonly Column[], x: number, y: number) => ({
  cx: (i: number) => x + colX(columns, i) + columns[i].width / 2,
  left: (i: number) => x + colX(columns, i),
  headTop: y,
  headBottom: y + HEAD_H,
  rowCy: (r: number) => y + HEAD_H + r * ROW_H + ROW_H / 2,
  bottom: (rows: number) => y + HEAD_H + rows * ROW_H,
  width: tableWidth(columns),
});

const mixHex = (hex: string, t: number) => {
  // blend from neutral soft towards hex by t
  const a = [0xe7, 0xe2, 0xda];
  const b = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${m[0]}, ${m[1]}, ${m[2]})`;
};

type Props = {
  readonly name: string;
  readonly title?: string;
  readonly titleOpacity?: number;
  readonly columns: readonly Column[];
  readonly rows: readonly (readonly React.ReactNode[])[];
  readonly x: number;
  readonly y: number;
  readonly colOffset?: (c: number) => {x: number; y: number};
  readonly colOpacity?: (c: number) => number;
  readonly rowOffset?: (r: number) => number;
  readonly rowOpacity?: (r: number) => number;
  readonly cell?: (r: number, c: number) => CellFx | undefined;
  readonly header?: (c: number) => HeaderFx | undefined;
  readonly showHeader?: boolean;
  readonly style?: React.CSSProperties;
};

/**
 * Absolutely positioned table. Every cell is placed individually so columns
 * and rows can move, fade, highlight and split frame by frame.
 */
export const DataTable: React.FC<Props> = ({
  name,
  title,
  titleOpacity = 1,
  columns,
  rows,
  x,
  y,
  colOffset,
  colOpacity,
  rowOffset,
  rowOpacity,
  cell,
  header,
  showHeader = true,
  style,
}) => {
  const width = tableWidth(columns);
  return (
    <Interactive.Div
      name={name}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height: HEAD_H + rows.length * ROW_H,
        fontFamily: FONT,
        ...style,
      }}
    >
      {title ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: -50,
            fontSize: 32,
            fontWeight: 700,
            color: C.ink,
            whiteSpace: 'nowrap',
            opacity: titleOpacity,
          }}
        >
          {title}
        </div>
      ) : null}
      {columns.map((col, c) => {
        const off = colOffset?.(c) ?? {x: 0, y: 0};
        const op = colOpacity?.(c) ?? 1;
        const hx = header?.(c);
        const tone = TONES[col.tone ?? 'neutral'];
        const tint = hx?.tint ?? 1;
        const pk = hx?.pk ?? (col.pk ? 1 : 0);
        const fk = hx?.fk ?? (col.fk ? 1 : 0);
        const left = colX(columns, c);
        return (
          <div key={col.key + c}>
            {showHeader ? (
              <div
                style={{
                  position: 'absolute',
                  left,
                  top: 0,
                  width: col.width,
                  height: HEAD_H,
                  translate: `${off.x}px ${off.y}px`,
                  opacity: op,
                  backgroundColor: mixHex(tone.soft, tint),
                  borderTop: `2px solid ${C.rule}`,
                  borderRight: `2px solid ${C.rule}`,
                  borderBottom: `2px solid ${C.rule}`,
                  borderLeft: c === 0 || off.x !== 0 ? `2px solid ${C.rule}` : undefined,
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontSize: 28,
                  fontWeight: 700,
                  color: tone.strong,
                  fontStyle: fk > 0.5 ? 'italic' : 'normal',
                  whiteSpace: 'nowrap',
                  boxShadow:
                    (hx?.outline ?? 0) > 0
                      ? `inset 0 0 0 ${4 * (hx?.outline ?? 0)}px ${C.accent}`
                      : undefined,
                }}
              >
                <span style={{position: 'relative'}}>
                  {hx?.label ?? col.label}
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      bottom: -7,
                      height: 4,
                      width: `${pk * 100}%`,
                      backgroundColor: C.accent,
                      borderRadius: 2,
                    }}
                  />
                </span>
                {fk > 0 ? (
                  <span
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: -16,
                      fontSize: 20,
                      fontStyle: 'normal',
                      fontWeight: 700,
                      color: C.surface,
                      backgroundColor: C.ink,
                      borderRadius: 6,
                      padding: '2px 7px',
                      opacity: fk,
                    }}
                  >
                    FK
                  </span>
                ) : null}
              </div>
            ) : null}
            {rows.map((row, r) => {
              const fx = cell?.(r, c);
              const rOff = rowOffset?.(r) ?? 0;
              const rOp = rowOpacity?.(r) ?? 1;
              const outline = fx?.outline ?? 0;
              return (
                <div
                  key={r}
                  style={{
                    position: 'absolute',
                    left,
                    top: HEAD_H + r * ROW_H,
                    width: col.width,
                    height: ROW_H,
                    translate: `${off.x}px ${off.y + rOff}px`,
                    opacity: op * rOp * (fx?.opacity ?? 1),
                    backgroundColor: fx?.bg ?? C.surface,
                    borderLeft:
                      c === 0 || off.x !== 0 || fx?.dashed
                        ? `2px ${fx?.dashed ? 'dashed' : 'solid'} ${C.rule}`
                        : undefined,
                    borderRight: `2px ${fx?.dashed ? 'dashed' : 'solid'} ${C.rule}`,
                    borderBottom: `2px ${fx?.dashed ? 'dashed' : 'solid'} ${C.rule}`,
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    fontSize: 28,
                    color: fx?.color ?? C.ink,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    boxShadow:
                      outline > 0
                        ? `inset 0 0 0 ${4 * outline}px ${C.accent}`
                        : undefined,
                  }}
                >
                  {fx?.content ?? row[c]}
                  {(fx?.strike ?? 0) > 0 ? (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: ROW_H / 2 - 2,
                        height: 4,
                        width: `${(fx?.strike ?? 0) * 100}%`,
                        backgroundColor: C.accent,
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </Interactive.Div>
  );
};
