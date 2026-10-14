import type React from 'react';
import {Interactive} from 'remotion';
import {C, FONT, TONES, type Tone} from '../../theme';

export const MONO = 'Consolas, "Courier New", monospace';

/* Oracle SQL and PL/SQL keywords, coloured when written in capitals (as on the website). */
const KEYWORDS = new Set(
  (
    'SELECT FROM WHERE AND OR NOT IN IS NULL AS ON JOIN INNER LEFT RIGHT FULL OUTER CROSS NATURAL USING GROUP BY ' +
    'HAVING ORDER ASC DESC DISTINCT UNION ALL INTERSECT MINUS EXISTS ANY SOME BETWEEN LIKE CASE WHEN THEN ELSE END ' +
    'INSERT INTO VALUES UPDATE SET DELETE MERGE CREATE ALTER DROP TRUNCATE RENAME TABLE VIEW INDEX UNIQUE PRIMARY KEY ' +
    'FOREIGN REFERENCES CONSTRAINT CHECK DEFAULT ADD MODIFY COLUMN TO CASCADE CONSTRAINTS PURGE FLASHBACK BEFORE AFTER ' +
    'INSTEAD OF FOR EACH ROW TRIGGER PROCEDURE FUNCTION PACKAGE BODY RETURN RETURNS IS DECLARE BEGIN EXCEPTION ' +
    'RAISE_APPLICATION_ERROR LOOP EXIT OPEN FETCH CLOSE CURSOR IF ELSIF REPLACE OUT NOCOPY COMMIT ROLLBACK SAVEPOINT ' +
    'GRANT REVOKE EXPLAIN PLAN DISABLE ENABLE GENERATED ALWAYS IDENTITY FETCH FIRST ROWS ONLY CURRENT EXEC WITH ' +
    'VARCHAR2 NUMBER DATE CHAR INTEGER BOOLEAN COUNT SUM AVG MIN MAX NVL ROUND UPPER LOWER SYSDATE TYPE ROWTYPE ' +
    'OTHERS DUP_VAL_ON_INDEX NO_DATA_FOUND TOO_MANY_ROWS DBMS_OUTPUT PUT_LINE NOTFOUND FOUND ROWCOUNT ISOPEN IF EXISTS'
  ).split(' '),
);

const TOKEN = /(--.*$)|('(?:[^']|'')*')|(:(?:NEW|OLD)\b)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_$#]*)|(\s+)|(.)/g;

const colourLine = (line: string): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line)) !== null) {
    const [tok, comment, str, bind, num, word] = m;
    let style: React.CSSProperties | undefined;
    if (comment) style = {color: C.muted, fontStyle: 'italic'};
    else if (str) style = {color: TONES.orange.strong};
    else if (bind) style = {color: TONES.maroon.strong, fontWeight: 700};
    else if (num) style = {color: TONES.yellow.strong};
    else if (word && KEYWORDS.has(word)) style = {color: TONES.teal.strong, fontWeight: 700};
    out.push(
      <span key={i++} style={style}>
        {tok}
      </span>,
    );
    if (tok === '') break;
  }
  return out;
};

export type LineFx = {
  readonly opacity?: number;
  /** 0..1 soft highlight bar behind the line. */
  readonly highlight?: number;
  /** Tone of the highlight bar (default orange). */
  readonly tone?: Tone;
  /** 0..1 strike-through progress. */
  readonly strike?: number;
};

export const lineHeight = (size: number) => Math.round(size * 1.5);
export const CODE_PAD = 26;

/** Scene y of the vertical centre of line i of a SqlCode panel at y (for arrows and labels). */
export const codeLineY = (y: number, i: number, size = 30) => y + CODE_PAD + i * lineHeight(size) + lineHeight(size) / 2;

/**
 * An Oracle SQL code panel: keywords, strings, numbers, comments and :NEW/:OLD coloured,
 * every line revealed, highlighted or struck through on its own.
 */
export const SqlCode: React.FC<{
  readonly name: string;
  readonly code: string;
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly size?: number;
  readonly title?: string;
  readonly opacity?: number;
  readonly line?: (i: number) => LineFx | undefined;
  readonly style?: React.CSSProperties;
}> = ({name, code, x, y, width = 900, size = 30, title, opacity = 1, line, style}) => {
  const lines = code.replace(/\n$/, '').split('\n');
  const lh = lineHeight(size);
  return (
    <Interactive.Div
      name={name}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height: lines.length * lh + CODE_PAD * 2,
        backgroundColor: C.surface,
        border: `2px solid ${C.rule}`,
        borderRadius: 14,
        boxSizing: 'border-box',
        boxShadow: '0 4px 18px rgba(26, 31, 108, 0.08)',
        opacity,
        ...style,
      }}
    >
      {title ? (
        <div style={{position: 'absolute', left: 0, top: -50, fontFamily: FONT, fontSize: 32, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap'}}>
          {title}
        </div>
      ) : null}
      {lines.map((text, i) => {
        const fx = line?.(i);
        const tone = TONES[fx?.tone ?? 'orange'];
        const hl = fx?.highlight ?? 0;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: CODE_PAD + i * lh,
              height: lh,
              opacity: fx?.opacity ?? 1,
            }}
          >
            {hl > 0 ? (
              <div style={{position: 'absolute', inset: '0 8px', borderRadius: 8, backgroundColor: tone.soft, opacity: hl}}>
                <div style={{position: 'absolute', left: 0, top: 6, bottom: 6, width: 6, borderRadius: 3, backgroundColor: C.accent}} />
              </div>
            ) : null}
            <div
              style={{
                position: 'absolute',
                left: CODE_PAD,
                top: 0,
                height: lh,
                display: 'flex',
                alignItems: 'center',
                fontFamily: MONO,
                fontSize: size,
                color: C.ink,
                whiteSpace: 'pre',
              }}
            >
              {colourLine(text)}
              {(fx?.strike ?? 0) > 0 ? (
                <div style={{position: 'absolute', left: 0, top: lh / 2 - 2, height: 4, width: `${(fx?.strike ?? 0) * 100}%`, backgroundColor: C.accent}} />
              ) : null}
            </div>
          </div>
        );
      })}
    </Interactive.Div>
  );
};
