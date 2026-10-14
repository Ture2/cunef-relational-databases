'use strict';

/* ==========================================================================
   Figures for the SQL cards, as inline SVG with the conventions of
   js/theory-figures.js: role="img", aria-label + <title>, viewBox, width 100%
   with a max-width at native size, and colours only through classes (tf-* and
   sf-* in theory.css), so the dark theme applies.

   The rows drawn are the SCHOOL sample data of data/<lang>/sql.js, so a figure
   shows what the card's editor returns when the student presses Run. The data
   is the same in both languages; only the labels go through t().

   svg({ kind }) → '<svg …>' | ''. Kinds:
     select-pick · clause-order · where-precedence · three-valued
     join-match · join-venn · cross-self
     aggregate-null · group-fold
     subquery-nest · in-any-all · correlated-loop · set-venn
     sql-families · tx-timeline · view-window · cte-pipeline
     plsql-block · cursor-life · exception-flow · proc-vs-func · trigger-timing · package-spec-body
   ========================================================================== */

const SqlFigures = (() => {
  let uid = 0;
  const r1 = (n) => Math.round(n * 10) / 10;
  /* Two-line labels are one key, with the lines separated by '|', so each language can break them its own way. */
  const tl = (s) => t(s).split('|');

  /* ---- Sample data (SCHOOL in data/en/sql.js) --------------------------------- */

  const COURSE = [['C10', 'Databases', 6, 'D01'], ['C11', 'Python', 4.5, 'D01'], ['C20', 'Statistics', 6, 'D02'], ['C30', 'Marketing', 3, 'D02']];
  const STUDENT = [['S01', 'Ana Ruiz', 'ana@uni.es'], ['S02', 'Luis Gil', 'luis@uni.es'], ['S03', 'Eva Sanz', null]];
  /* Sorted by course, as most figures group them. */
  const ENROL = [['S01', 'C10', 8.5], ['S02', 'C10', 6.5], ['S03', 'C10', 5], ['S02', 'C11', 9], ['S03', 'C11', 7.5], ['S01', 'C20', 7]];
  const g1 = (n) => (n == null ? null : Number(n).toFixed(1));
  const rowsN = (n) => (n === 1 ? t('1 row') : t('{n} rows', { n }));
  const DEPT_CLS = { D01: 'tf-c1', D02: 'tf-c3' };

  /* ---- Drawing helpers ------------------------------------------------------ */

  const T = (x, y, s, cls = 'tf-t', anchor = 'middle') =>
    `<text class="${cls}" x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}">${esc(s)}</text>`;
  /* Lines of text centred vertically on cy. */
  const TC = (x, cy, lines, cls = 'tf-t', anchor = 'middle', lh = 15) =>
    lines.map((s, i) => T(x, cy + 4.5 + (i - (lines.length - 1) / 2) * lh, s, cls, anchor)).join('');
  /* Lines of text from a first baseline y down. */
  const TL = (x, y, lines, cls = 'tf-s', anchor = 'start', lh = 15) => lines.map((s, i) => T(x, y + i * lh, s, cls, anchor)).join('');
  /* One line made of differently styled parts: [[text, cls], …]. */
  const TS = (x, y, parts, anchor = 'start') =>
    `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}">${parts.map(([s, cls]) => `<tspan class="${cls}">${esc(s)}</tspan>`).join('')}</text>`;
  const R = (x, y, w, h, cls = 'tf-box') =>
    `<rect class="${cls}" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="2"/>`;
  const L = (x1, y1, x2, y2, cls = 'tf-line', extra = '') =>
    `<line class="${cls}" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" ${extra}/>`;
  const P = (d, cls = 'tf-line', extra = '') => `<path class="${cls}" d="${d}" ${extra}/>`;
  const C = (cx, cy, r, cls) => `<circle class="${cls}" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}"/>`;
  const vText = (x, y, s, cls = 'tf-s') =>
    `<text class="${cls}" x="${r1(x)}" y="${r1(y)}" text-anchor="middle" transform="rotate(-90 ${r1(x)} ${r1(y)})">${esc(s)}</text>`;
  function cylinder(x, y, w, h, cls = 'tf-disk') {
    const rx = w / 2;
    const ry = Math.min(10, h / 6);
    return `<path class="${cls}" d="M${r1(x)} ${r1(y + ry)} a${r1(rx)} ${r1(ry)} 0 0 0 ${r1(w)} 0 v${r1(h - 2 * ry)} a${r1(rx)} ${r1(ry)} 0 0 1 ${r1(-w)} 0 Z"/>
      <ellipse class="${cls}" cx="${r1(x + rx)}" cy="${r1(y + ry)}" rx="${r1(rx)}" ry="${r1(ry)}"/>`;
  }

  /* draw(m) gets m.a / m.h: marker attributes for a normal and a highlighted arrow head. */
  function wrap(w, h, alt, draw) {
    const id = `sf${++uid}`;
    const m = { a: `marker-end="url(#${id}-a)"`, h: `marker-end="url(#${id}-h)"` };
    const mk = (k, cls) => `<marker id="${id}-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="${cls}" d="M0 0L10 5L0 10Z"/></marker>`;
    return `<svg class="tf-svg" viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px" role="img" aria-label="${esc(alt)}">
      <title>${esc(alt)}</title><defs>${mk('a', 'tf-head')}${mk('h', 'tf-head-hl')}</defs>${draw(m)}</svg>`;
  }

  /* ---- Tables --------------------------------------------------------------- */

  /* cols: [{ h: header, w: width, head?: header class }]. A cell value of null is drawn as NULL. */
  const gw = (cols) => cols.reduce((s, c) => s + c.w, 0);
  function cellsRow(x, y, cols, vals, h, cls, txt = 'tf-m') {
    let cx = x;
    return cols.map((c, j) => {
      const v = vals[j];
      const k = typeof cls === 'function' ? cls(j) : cls;
      const s = `${R(cx, y, c.w, h, k)}${T(cx + c.w / 2, y + h / 2 + 4.5, v == null ? 'NULL' : String(v), v == null ? 'tf-m sf-null' : txt)}`;
      cx += c.w;
      return s;
    }).join('');
  }
  /* A small table. cell(i, j) → class of a body cell (default sf-cell); strike: rows crossed out; label: name above it. */
  function grid(x, y, cols, rows, { rh = 22, hh = 24, head = 'tf-c2', cell, strike = [], label, labelCls = 'tf-s tf-b' } = {}) {
    const out = [];
    if (label) out.push(T(x, y - 8, label, labelCls, 'start'));
    out.push(cellsRow(x, y, cols, cols.map((c) => c.h), hh, (j) => cols[j].head || head, 'tf-m tf-b'));
    rows.forEach((row, i) => out.push(cellsRow(x, y + hh + i * rh, cols, row, rh, (j) => (cell && cell(i, j)) || 'sf-cell', strike.includes(i) ? 'tf-m sf-off' : 'tf-m')));
    strike.forEach((i) => {
      const sy = y + hh + i * rh + rh / 2;
      out.push(L(x + 4, sy, x + gw(cols) - 4, sy, 'sf-strike'));
    });
    return out.join('');
  }
  /* Centre (y) of body row i of a grid drawn at y. */
  const rowMid = (y, i, rh = 22, hh = 24) => y + hh + i * rh + rh / 2;

  /* ---- Sets ----------------------------------------------------------------- */

  /* Two circles of radius r, centres d apart, around (cx, cy). shade: which regions to fill ('a' only, 'ab' both, 'b' only). */
  function venn(cx, cy, r, d, shade) {
    const m = r1(cx);
    const hh = Math.sqrt(r * r - (d * d) / 4);
    const yt = r1(cy - hh);
    const yb = r1(cy + hh);
    const region = {
      a: `M${m} ${yt}A${r} ${r} 0 1 0 ${m} ${yb}A${r} ${r} 0 0 1 ${m} ${yt}Z`,
      ab: `M${m} ${yt}A${r} ${r} 0 0 1 ${m} ${yb}A${r} ${r} 0 0 1 ${m} ${yt}Z`,
      b: `M${m} ${yt}A${r} ${r} 0 1 1 ${m} ${yb}A${r} ${r} 0 0 0 ${m} ${yt}Z`,
    };
    return `${shade.map((k) => P(region[k], 'sf-shade')).join('')}${C(cx - d / 2, cy, r, 'sf-ring')}${C(cx + d / 2, cy, r, 'sf-ring')}`;
  }

  /* ---- Querying -------------------------------------------------------------- */

  function selectPick() {
    const alt = t('SELECT title, credits, credits * 25 AS hours FROM course: the columns title and credits are taken from the course table, a new column hours is computed, and all four rows are kept.');
    return wrap(550, 230, alt, (m) => {
      const out = [];
      const src = [{ h: 'course_id', w: 70 }, { h: 'title', w: 80 }, { h: 'credits', w: 60 }, { h: 'dept_id', w: 60 }];
      const res = [{ h: 'title', w: 80 }, { h: 'credits', w: 60 }, { h: 'hours', w: 60, head: 'tf-new' }];
      const y = 56;
      out.push(T(20, 20, 'SELECT title, credits, credits * 25 AS hours FROM course', 'tf-m tf-b', 'start'));
      out.push(grid(20, y, src, COURSE, { rh: 22, cell: (i, j) => (j === 1 || j === 2 ? 'sf-on' : '') , label: 'course' }));
      out.push(R(90, y, 140, 24 + 88, 'sf-pick'));
      out.push(L(296, rowMid(y, 1.5), 328, rowMid(y, 1.5), 'tf-path', m.h));
      out.push(grid(334, y, res, COURSE.map((c) => [c[1], c[2], c[2] * 25]), { cell: (i, j) => (j === 2 ? 'tf-new' : 'sf-on'), label: t('result: 4 rows') }));
      out.push(T(20, 196, t('SELECT chooses the columns and can compute new ones (hours = credits * 25).'), 'tf-s', 'start'));
      out.push(T(20, 214, t('Every row is kept: choosing rows is the job of WHERE.'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  function clauseOrder() {
    const written = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY'];
    const run = ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY'];
    const note = {
      FROM: t('tables and JOINs'), WHERE: t('keeps rows'), 'GROUP BY': t('makes groups'),
      HAVING: t('keeps groups'), SELECT: t('columns; aliases are born'), 'ORDER BY': t('sorts; can use aliases'),
    };
    const alt = t('A query is written SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, but evaluated FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY. WHERE runs before SELECT and cannot use its aliases; ORDER BY runs after it and can.');
    return wrap(550, 300, alt, (m) => {
      const out = [];
      const lx = 20;
      const rx = 250;
      const w = 110;
      const h = 26;
      const y = (i) => 40 + i * 36;
      out.push(T(lx, 24, t('As you write it'), 'tf-t tf-b', 'start'));
      out.push(T(rx, 24, t('As it runs'), 'tf-t tf-b', 'start'));
      written.forEach((k) => {
        const i = written.indexOf(k);
        const j = run.indexOf(k);
        const on = k === 'SELECT';
        out.push(L(lx + w + 2, y(i) + h / 2, rx - 3, y(j) + h / 2, on ? 'tf-path' : 'tf-lead', on ? m.h : m.a));
      });
      written.forEach((k, i) => {
        out.push(R(lx, y(i), w, h, k === 'SELECT' ? 'tf-hl' : 'tf-box'));
        out.push(T(lx + w / 2, y(i) + 17.5, k, 'tf-m tf-b'));
      });
      run.forEach((k, i) => {
        out.push(R(rx, y(i), w, h, k === 'SELECT' ? 'tf-hl' : 'tf-c2'));
        out.push(T(rx + w / 2, y(i) + 17.5, `${i + 1} · ${k}`, 'tf-m tf-b'));
        out.push(T(rx + w + 10, y(i) + 17.5, note[k], 'tf-s', 'start'));
      });
      out.push(T(lx, 272, t('WHERE runs before SELECT: it cannot use a column alias of the SELECT.'), 'tf-s', 'start'));
      out.push(T(lx, 290, t('ORDER BY runs after SELECT: it can.'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  function wherePrecedence() {
    const alt = t('Without parentheses, dept_id = D01 OR dept_id = D02 AND credits >= 6 is read as D01 OR (D02 AND credits >= 6) and keeps Databases, Python and Statistics. With (D01 OR D02) AND credits >= 6 it keeps only Databases and Statistics: Python, with 4.5 credits, makes the difference.');
    return wrap(550, 262, alt, () => {
      const out = [];
      const imp = 'tf-m sf-imp';
      out.push(T(20, 20, t('NOT first, then AND, then OR, like × before + in arithmetic'), 'tf-t tf-b', 'start'));
      out.push(T(20, 46, t('1 · As written: AND is evaluated first'), 'tf-s', 'start'));
      out.push(TS(20, 64, [["dept_id='D01' OR ", 'tf-m'], ['(', imp], ["dept_id='D02' AND credits >= 6", 'tf-m'], [')', imp]]));
      out.push(T(20, 90, t('2 · With the parentheses we meant'), 'tf-s', 'start'));
      out.push(T(20, 108, "(dept_id='D01' OR dept_id='D02') AND credits >= 6", 'tf-m', 'start'));
      const q1 = [true, true, true, false];
      const q2 = [true, false, true, false];
      const cols = [{ h: 'course_id', w: 72 }, { h: 'title', w: 80 }, { h: 'credits', w: 60 }, { h: 'dept_id', w: 60 }, { h: '1', w: 40 }, { h: '2', w: 40 }];
      const rows = COURSE.map((c, i) => [...c, q1[i] ? '✓' : '✗', q2[i] ? '✓' : '✗']);
      const y = 134;
      out.push(grid(20, y, cols, rows, {
        cell: (i, j) => (j === 4 ? (q1[i] ? 'tf-ok' : 'tf-bad') : j === 5 ? (q2[i] ? 'tf-ok' : 'tf-bad') : i === 1 ? 'sf-on' : ''),
      }));
      out.push(TL(384, rowMid(y, 1) - 11, tl('Python is in D01,|so query 1 keeps it;|it has 4.5 credits,|so query 2 drops it.')));
      return out.join('');
    });
  }

  function threeValued() {
    const V = { T: t('TRUE'), F: t('FALSE'), U: t('UNKNOWN') };
    const S = { T: t('T'), F: t('F'), U: t('U') };
    const VCLS = { T: 'tf-ok', F: 'sf-cell', U: 'sf-unk' };
    const alt = t('Three-valued logic. email = NULL is UNKNOWN for every student, so WHERE returns no row; email IS NULL is TRUE only for Eva Sanz. Truth tables: TRUE AND UNKNOWN is UNKNOWN, FALSE AND UNKNOWN is FALSE, TRUE OR UNKNOWN is TRUE, FALSE OR UNKNOWN is UNKNOWN.');
    return wrap(540, 300, alt, () => {
      const out = [];
      const y = 44;
      const rh = 26;
      const cols = [{ h: 'name', w: 76 }, { h: 'email', w: 84 }, { h: 'email = NULL', w: 104 }, { h: 'email IS NULL', w: 104 }];
      const eq = ['U', 'U', 'U'];
      const is = STUDENT.map((s) => (s[2] == null ? 'T' : 'F'));
      out.push(T(20, 20, t('WHERE keeps a row only when the test is TRUE'), 'tf-t tf-b', 'start'));
      out.push(grid(20, y, cols, STUDENT.map((s, i) => [s[1], s[2], V[eq[i]], V[is[i]]]), {
        rh, cell: (i, j) => (j === 2 ? VCLS[eq[i]] : j === 3 ? VCLS[is[i]] : ''),
      }));
      out.push(TL(20, 170, [
        t('= NULL is UNKNOWN for every row, even for Eva: no rows.'),
        t('IS NULL is the test that works: it returns Eva.'),
        t('NOT UNKNOWN is still UNKNOWN.'),
      ], 'tf-s', 'start', 17));
      /* Truth tables, in the order TRUE, UNKNOWN, FALSE. */
      const ord = ['T', 'U', 'F'];
      const AND = { TT: 'T', TU: 'U', TF: 'F', UU: 'U', UF: 'F', FF: 'F' };
      const OR = { TT: 'T', TU: 'T', TF: 'T', UU: 'U', UF: 'U', FF: 'F' };
      const val = (tab, a, b) => tab[a + b] || tab[b + a];
      const table = (x, ty, op, tab) => {
        const c = 28;
        const parts = [R(x, ty, c + 6, c, 'tf-c2'), T(x + (c + 6) / 2, ty + 18.5, op, 'tf-m tf-b')];
        ord.forEach((a, i) => {
          parts.push(R(x + c + 6 + i * c, ty, c, c, 'tf-c2'), T(x + c + 6 + i * c + c / 2, ty + 18.5, S[a], 'tf-m tf-b'));
          parts.push(R(x, ty + (i + 1) * c, c + 6, c, 'tf-c2'), T(x + (c + 6) / 2, ty + (i + 1) * c + 18.5, S[a], 'tf-m tf-b'));
          ord.forEach((b, j) => {
            const v = val(tab, a, b);
            parts.push(R(x + c + 6 + j * c, ty + (i + 1) * c, c, c, VCLS[v]), T(x + c + 6 + j * c + c / 2, ty + (i + 1) * c + 18.5, S[v], 'tf-m'));
          });
        });
        return parts.join('');
      };
      out.push(table(404, y, 'AND', AND));
      out.push(table(404, y + 128, 'OR', OR));
      out.push(T(20, 236, t('T true · F false · U unknown'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  /* ---- Joins --------------------------------------------------------------------- */

  function joinMatch() {
    const alt = t('INNER JOIN of course and department on dept_id: Databases and Python match Computing (D01), Statistics and Marketing match Maths (D02). Each course finds its department, so the result has 4 rows.');
    return wrap(540, 308, alt, () => {
      const out = [];
      const y = 56;
      const rh = 24;
      const cc = [{ h: 'course_id', w: 70 }, { h: 'title', w: 80 }, { h: 'dept_id', w: 62 }];
      const dc = [{ h: 'dept_id', w: 62 }, { h: 'name', w: 86 }];
      const DEPT = [['D01', 'Computing'], ['D02', 'Maths']];
      out.push(T(20, 20, 'FROM course c JOIN department d ON d.dept_id = c.dept_id', 'tf-m tf-b', 'start'));
      out.push(grid(20, y, cc, COURSE.map((c) => [c[0], c[1], c[3]]), { rh, cell: (i, j) => (j === 2 ? DEPT_CLS[COURSE[i][3]] : ''), label: 'course c' }));
      out.push(grid(330, y, dc, DEPT, { rh, cell: (i, j) => (j === 0 ? DEPT_CLS[DEPT[i][0]] : ''), label: 'department d' }));
      COURSE.forEach((c, i) => {
        const y1 = rowMid(y, i, rh);
        const y2 = rowMid(y, c[3] === 'D01' ? 0 : 1, rh);
        out.push(P(`M232 ${r1(y1)} C281 ${r1(y1)} 281 ${r1(y2)} 329 ${r1(y2)}`, c[3] === 'D01' ? 'sf-l1' : 'sf-l3'));
        out.push(C(232, y1, 3, c[3] === 'D01' ? 'sf-d1' : 'sf-d3'));
      });
      const res = [['Databases', 'Computing', 'D01'], ['Python', 'Computing', 'D01'], ['Marketing', 'Maths', 'D02'], ['Statistics', 'Maths', 'D02']];
      out.push(grid(330, 178, [{ h: 'title', w: 80 }, { h: 'department', w: 90 }], res.map((r) => [r[0], r[1]]), {
        rh, cell: (i, j) => (j === 1 ? DEPT_CLS[res[i][2]] : ''), label: t('result: 4 rows'),
      }));
      out.push(TL(20, 206, tl('Each course row is paired with|the department whose key|matches its dept_id.'), 'tf-s', 'start', 16));
      out.push(TL(20, 270, tl('A row with no partner would be|dropped: see the outer joins.'), 'tf-s', 'start', 16));
      return out.join('');
    });
  }

  function joinVenn() {
    const alt = t('Joins of course (left) and enrolment (right) as set diagrams: INNER keeps the 6 matching rows, LEFT 7, RIGHT 6, FULL 7, and the anti-join (LEFT JOIN … WHERE e.course_id IS NULL) 1. The LEFT JOIN result keeps Marketing, which has no enrolment, with NULL in the enrolment columns.');
    return wrap(540, 352, alt, () => {
      const out = [];
      const kinds = [
        { l: 'INNER', s: ['ab'], n: 6 },
        { l: 'LEFT', s: ['a', 'ab'], n: 7 },
        { l: 'RIGHT', s: ['ab', 'b'], n: 6 },
        { l: 'FULL', s: ['a', 'ab', 'b'], n: 7 },
        { l: t('anti-join'), s: ['a'], n: 1 },
      ];
      kinds.forEach((k, i) => {
        const cx = 70 + i * 100;
        out.push(T(cx, 20, k.l, 'tf-m tf-b'));
        out.push(venn(cx, 58, 24, 26, k.s));
        out.push(T(cx - 25, 62, 'c', 'tf-s'));
        out.push(T(cx + 25, 62, 'e', 'tf-s'));
        out.push(T(cx, 104, rowsN(k.n), 'tf-s tf-b'));
      });
      out.push(T(20, 132, t('c = course (left table) · e = enrolment (right table)'), 'tf-s', 'start'));
      const rows = [['Databases', 'S01', '8.5'], ['Databases', 'S02', '6.5'], ['Databases', 'S03', '5.0'], ['Marketing', null, null], ['Python', 'S02', '9.0'], ['Python', 'S03', '7.5'], ['Statistics', 'S01', '7.0']];
      const y = 176;
      const rh = 20;
      out.push(T(20, y - 8, 'course c LEFT JOIN enrolment e', 'tf-m tf-b', 'start'));
      out.push(grid(20, y, [{ h: 'title', w: 84 }, { h: 'student_id', w: 80 }, { h: 'grade', w: 56 }], rows, { rh, cell: (i) => (i === 3 ? 'sf-on' : '') }));
      out.push(R(20, y + 24 + 3 * rh, 220, rh, 'sf-pick'));
      out.push(T(260, 196, t('Marketing has no enrolment:'), 'tf-t tf-b', 'start'));
      out.push(TL(260, 216, [t('INNER drops it;'), t('LEFT keeps it, with NULL on the right;'), t('the anti-join keeps only it.')], 'tf-s', 'start', 16));
      out.push(TL(260, 280, [t('Careful: WHERE e.grade >= 5 removes it'), t('again (NULL >= 5 is UNKNOWN).'), t('Put that condition in the ON.')], 'tf-s', 'start', 16));
      return out.join('');
    });
  }

  function crossSelf() {
    const alt = t('Left: CROSS JOIN of 3 students and 4 courses gives 12 rows, every possible pair; filled dots are real enrolments. Right: a self-join of enrolment for course C10 pairs S01 with S02, S01 with S03 and S02 with S03, each pair once, because a.student_id < b.student_id.');
    return wrap(540, 234, alt, (m) => {
      const out = [];
      const enrolled = new Set(ENROL.map((e) => `${e[0]}${e[1]}`));
      out.push(T(20, 20, t('CROSS JOIN: every pair'), 'tf-t tf-b', 'start'));
      out.push(T(20, 38, t('3 students × 4 courses = 12 rows'), 'tf-s', 'start'));
      const x0 = 20;
      const y0 = 52;
      const hw = 56;
      const cw = 44;
      const ch = 30;
      out.push(R(x0, y0, hw, 24, 'tf-c2'));
      COURSE.forEach((c, j) => {
        out.push(R(x0 + hw + j * cw, y0, cw, 24, 'tf-c2'));
        out.push(T(x0 + hw + j * cw + cw / 2, y0 + 16.5, c[0], 'tf-m tf-b'));
      });
      STUDENT.forEach((s, i) => {
        const ry = y0 + 24 + i * ch;
        out.push(R(x0, ry, hw, ch, 'tf-c2'));
        out.push(T(x0 + hw / 2, ry + 19.5, s[0], 'tf-m tf-b'));
        COURSE.forEach((c, j) => {
          out.push(R(x0 + hw + j * cw, ry, cw, ch, 'sf-cell'));
          out.push(C(x0 + hw + j * cw + cw / 2, ry + ch / 2, 5, enrolled.has(`${s[0]}${c[0]}`) ? 'sf-dot' : 'sf-open'));
        });
      });
      out.push(T(20, 190, t('● enrolled · ○ not enrolled:'), 'tf-s', 'start'));
      out.push(T(20, 208, t('the CROSS JOIN lists both.'), 'tf-s', 'start'));
      out.push(L(270, 10, 270, 214, 'tf-rule'));
      out.push(T(290, 20, t('Self-join: enrolment a, enrolment b'), 'tf-t tf-b', 'start'));
      out.push(T(290, 38, t('Course C10: pairs of classmates'), 'tf-s', 'start'));
      const ids = ['S01', 'S02', 'S03'];
      const ay = (i) => 70 + i * 36;
      out.push(T(328, 62, 'a', 'tf-m tf-b'));
      out.push(T(478, 62, 'b', 'tf-m tf-b'));
      ids.forEach((id, i) => {
        out.push(R(300, ay(i), 56, 26, 'tf-c1'));
        out.push(T(328, ay(i) + 17.5, id, 'tf-m'));
        out.push(R(450, ay(i), 56, 26, 'tf-c1'));
        out.push(T(478, ay(i) + 17.5, id, 'tf-m'));
      });
      [[0, 1], [0, 2], [1, 2]].forEach(([i, j]) => out.push(L(357, ay(i) + 13, 447, ay(j) + 13, 'tf-line', m.a)));
      out.push(T(290, 190, 'a.student_id < b.student_id', 'tf-m', 'start'));
      out.push(TL(290, 208, tl('3 pairs, each one once;|nobody is paired with themselves.')));
      return out.join('');
    });
  }

  /* ---- Aggregation ---------------------------------------------------------------- */

  function aggregateNull() {
    const grades = [8.5, 7, 6.5, 9, 5, 7.5, null];
    const alt = t('Seven grades, one of them NULL. COUNT(*) is 7, COUNT(grade) is 6, AVG(grade) is 7.25 (43.5 / 6, the NULL is skipped) and AVG(NVL(grade, 0)) is 6.21 (43.5 / 7, the NULL counted as 0).');
    return wrap(540, 262, alt, (m) => {
      const out = [];
      const y = 44;
      out.push(grid(30, y, [{ h: 'grade', w: 70 }], grades.map((g) => [g1(g)]), { cell: (i) => (grades[i] == null ? 'sf-unk' : ''), label: 'enrolment.grade' }));
      const fns = [
        ['COUNT(*)', '7', t('every row, NULL included')],
        ['COUNT(grade)', '6', t('only the known grades')],
        ['AVG(grade)', '7.25', t('43.5 / 6: the NULL is skipped')],
        ['AVG(NVL(grade, 0))', '6.21', t('43.5 / 7: the NULL counts as 0')],
      ];
      fns.forEach(([f, v, note], i) => {
        const by = 46 + i * 44;
        out.push(L(104, y + 24 + 77, 146, by + 15, 'tf-lead', m.a));
        out.push(R(150, by, 140, 30, 'tf-c2'));
        out.push(T(220, by + 19.5, f, 'tf-m tf-b'));
        out.push(T(300, by + 20, `= ${v}`, 'tf-t tf-b', 'start'));
        out.push(T(356, by + 20, note, 'tf-s', 'start'));
      });
      out.push(T(150, 230, t('SUM, AVG, MIN and MAX skip NULLs too;'), 'tf-s', 'start'));
      out.push(T(150, 248, t('only COUNT(*) counts rows, whatever they hold.'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  function groupFold() {
    const alt = t('GROUP BY course_id folds the six enrolment rows into one row per course: C10 with 3 rows and average 6.67, C11 with 2 rows and average 8.25, C20 with 1 row and average 7.00. HAVING AVG(grade) >= 7 then drops the C10 group.');
    return wrap(540, 294, alt, (m) => {
      const out = [];
      const G = { C10: 'tf-c1', C11: 'tf-c3', C20: 'tf-c4' };
      const y = 72;
      out.push(T(20, 20, 'SELECT course_id, COUNT(*), AVG(grade) FROM enrolment', 'tf-m tf-b', 'start'));
      out.push(T(20, 38, 'GROUP BY course_id HAVING AVG(grade) >= 7', 'tf-m tf-b', 'start'));
      out.push(grid(20, y, [{ h: 'student_id', w: 76 }, { h: 'course_id', w: 72 }, { h: 'grade', w: 52 }], ENROL.map((e) => [e[0], e[1], g1(e[2])]), {
        cell: (i) => G[ENROL[i][1]], label: 'enrolment',
      }));
      const groups = [{ id: 'C10', from: 0, n: 3, avg: '6.67', keep: false }, { id: 'C11', from: 3, n: 2, avg: '8.25', keep: true }, { id: 'C20', from: 5, n: 1, avg: '7.00', keep: true }];
      const rc = [{ h: 'course_id', w: 66 }, { h: 'COUNT(*)', w: 70 }, { h: 'AVG(grade)', w: 84 }];
      out.push(T(290, y - 8, t('one row per group'), 'tf-s tf-b', 'start'));
      out.push(cellsRow(290, y, rc, rc.map((c) => c.h), 24, 'tf-c2', 'tf-m tf-b'));
      groups.forEach((g) => {
        const top = y + 24 + g.from * 22;
        const mid = top + (g.n * 22) / 2;
        out.push(P(`M224 ${top + 3} h7 v${g.n * 22 - 6} h-7`, 'tf-line'));
        out.push(L(233, mid, 286, mid, 'tf-line', m.a));
        out.push(cellsRow(290, mid - 11, rc, [g.id, g.n, g.avg], 22, G[g.id], g.keep ? 'tf-m' : 'tf-m sf-off'));
        if (!g.keep) out.push(L(294, mid, 286 + gw(rc), mid, 'sf-strike'));
        out.push(T(522, mid + 4.5, g.keep ? '✓' : '✗', g.keep ? 'tf-t tf-oktext tf-b' : 'tf-t tf-badtext tf-b'));
      });
      out.push(TL(20, 250, [
        t('GROUP BY folds the rows of each course into one row,'),
        t('and COUNT and AVG are computed once per group.'),
        t('HAVING then filters the groups: C10 (average 6.67) is dropped.'),
      ], 'tf-s', 'start', 16));
      return out.join('');
    });
  }

  /* ---- Subqueries and sets ---------------------------------------------------------- */

  function subqueryNest() {
    const alt = t('Where a subquery goes changes its role. In WHERE it returns one value to compare with (the average, 7.25). In FROM it is an inline view, a temporary table with one average per course. In SELECT it adds one value to every row.');
    return wrap(540, 324, alt, (m) => {
      const out = [];
      const tiles = [
        { l: t('In WHERE: one value to compare with'), outer: 'SELECT … FROM enrolment WHERE grade >', inner: 'SELECT AVG(grade) FROM enrolment' },
        { l: t('In FROM: an inline view, queried like a table'), outer: 'SELECT c.title, avg_c.average FROM', inner: 'SELECT course_id, AVG(grade) … GROUP BY' },
        { l: t('In SELECT: a scalar value added to every row'), outer: 'SELECT grade, grade − (…) AS above_average', inner: 'SELECT AVG(grade) FROM enrolment' },
      ];
      tiles.forEach((tile, i) => {
        const y0 = 8 + i * 106;
        out.push(T(20, y0 + 12, tile.l, 'tf-t tf-b', 'start'));
        out.push(R(20, y0 + 22, 330, 72, 'tf-box'));
        out.push(T(30, y0 + 42, tile.outer, 'tf-m', 'start'));
        out.push(R(30, y0 + 52, 310, 30, 'tf-hl'));
        out.push(T(40, y0 + 71.5, tile.inner, 'tf-m', 'start'));
        out.push(L(342, y0 + 67, 374, y0 + 67, 'tf-path', m.h));
        const sm = { rh: 17, hh: 18 };
        if (i === 0) {
          out.push(R(380, y0 + 52, 60, 30, 'tf-new'));
          out.push(T(410, y0 + 72, '7.25', 'tf-m tf-b'));
          out.push(TL(450, y0 + 64, tl('one value,|computed once')));
        } else if (i === 1) {
          out.push(grid(380, y0 + 26, [{ h: 'course_id', w: 70 }, { h: 'average', w: 70 }], [['C10', '6.67'], ['C11', '8.25'], ['C20', '7.00']], { ...sm, head: 'tf-new', label: 'avg_c' }));
        } else {
          out.push(grid(380, y0 + 26, [{ h: 'grade', w: 50 }, { h: 'above_average', w: 100 }], [['8.5', '1.25'], ['7.0', '−0.25'], ['6.5', '−0.75']], { ...sm, cell: (r, j) => (j === 1 ? 'tf-new' : '') }));
        }
      });
      return out.join('');
    });
  }

  function inAnyAll() {
    const alt = t('Grades on a line from 4 to 10. The Databases (C10) grades are 5.0, 6.5 and 8.5. > ANY of them means above the smallest, 5.0; > ALL means above the largest, 8.5. Of the other grades, 7.0, 7.5 and 9.0 pass > ANY, and only 9.0 passes > ALL.');
    return wrap(540, 232, alt, () => {
      const out = [];
      const x = (v) => 150 + (v - 4) * 60;
      const list = [5, 6.5, 8.5];
      const other = [7, 7.5, 9];
      out.push(T(20, 44, t('C10 grades'), 'tf-t tf-b', 'start'));
      list.forEach((v) => {
        out.push(T(x(v), 26, g1(v), 'tf-m'));
        out.push(C(x(v), 40, 6, 'sf-dot1'));
      });
      out.push(T(20, 72, t('Other grades'), 'tf-t tf-b', 'start'));
      other.forEach((v) => {
        out.push(T(x(v), 70, g1(v), 'tf-m tf-b'));
        out.push(L(x(v), 76, x(v), 152, 'tf-dashline tf-acc'));
      });
      const bars = [{ l: '> ANY (…)', s: t('above the smallest'), from: 5, y: 92 }, { l: '> ALL (…)', s: t('above the largest'), from: 8.5, y: 128 }];
      bars.forEach((b) => {
        out.push(T(20, b.y + 10, b.l, 'tf-m tf-b', 'start'));
        out.push(T(20, b.y + 25, b.s, 'tf-s', 'start'));
        out.push(R(x(b.from), b.y, x(10) - x(b.from), 14, 'tf-c1'));
        out.push(C(x(b.from), b.y + 7, 5, 'sf-open'));
        other.forEach((v) => out.push(C(x(v), b.y + 7, 4.5, v > b.from ? 'sf-dotok' : 'sf-dotno')));
      });
      out.push(L(x(4), 166, x(10), 166, 'tf-line'));
      for (let v = 4; v <= 10; v++) {
        out.push(L(x(v), 162, x(v), 170, 'tf-line'));
        out.push(T(x(v), 184, String(v), 'tf-s'));
      }
      out.push(T(20, 208, t('7.0, 7.5 and 9.0 pass > ANY; only 9.0 passes > ALL.'), 'tf-s', 'start'));
      out.push(T(20, 224, t('NOT IN (…, NULL) is never TRUE: one NULL in the list and no row passes.'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  function correlatedLoop() {
    const counts = { C10: 3, C11: 2, C20: 1, C30: 0 };
    const alt = t('A correlated subquery runs once per outer row. For each course, EXISTS (SELECT 1 FROM enrolment e WHERE e.course_id = c.course_id) is run with that course id: C10 finds 3 rows, C11 2, C20 1 and C30 none. EXISTS keeps Databases, Python and Statistics; NOT EXISTS keeps Marketing.');
    return wrap(540, 262, alt, (m) => {
      const out = [];
      const y = 56;
      const rh = 30;
      out.push(T(20, 20, t('The inner query runs again for each outer row'), 'tf-t tf-b', 'start'));
      out.push(grid(30, y, [{ h: 'course_id', w: 70 }, { h: 'title', w: 84 }], COURSE.map((c) => [c[0], c[1]]), { rh, label: 'course c' }));
      out.push(T(228, y - 8, 'SELECT 1 FROM enrolment e WHERE', 'tf-m', 'start'));
      COURSE.forEach((c, i) => {
        const cy = rowMid(y, i, rh);
        const n = counts[c[0]];
        out.push(L(186, cy, 225, cy, 'tf-line', m.a));
        out.push(R(228, cy - 12, 196, 24, 'sf-on'));
        out.push(T(326, cy + 4.5, `e.course_id = '${c[0]}'`, 'tf-m'));
        out.push(T(434, cy + 4.5, `${n ? '✓' : '✗'} ${rowsN(n)}`, n ? 'tf-t tf-oktext' : 'tf-t tf-badtext', 'start'));
      });
      out.push(L(18, rowMid(y, 0, rh) - 8, 18, rowMid(y, 3, rh) + 8, 'tf-path', m.h));
      out.push(vText(10, rowMid(y, 1.5, rh), t('row by row')));
      out.push(T(30, 228, 'EXISTS → Databases, Python, Statistics', 'tf-m', 'start'));
      out.push(T(30, 248, 'NOT EXISTS → Marketing', 'tf-m', 'start'));
      return out.join('');
    });
  }

  function setVenn() {
    const alt = t('Set operators on the students of Databases (C10: S01, S02, S03) and of Python (C11: S02, S03). UNION gives S01, S02, S03; INTERSECT gives S02, S03; MINUS gives S01. UNION ALL keeps the repeats: 5 rows.');
    return wrap(540, 222, alt, () => {
      const out = [];
      const ops = [{ l: 'UNION', s: ['a', 'ab', 'b'], r: 'S01, S02, S03' }, { l: 'INTERSECT', s: ['ab'], r: 'S02, S03' }, { l: 'MINUS', s: ['a'], r: 'S01' }];
      ops.forEach((o, i) => {
        const cx = 95 + i * 175;
        const cy = 88;
        out.push(T(cx, 18, o.l, 'tf-m tf-b'));
        out.push(venn(cx, cy, 46, 44, o.s));
        out.push(T(cx - 40, 38, 'C10', 'tf-s tf-b'));
        out.push(T(cx + 40, 38, 'C11', 'tf-s tf-b'));
        out.push(T(cx - 46, cy + 4.5, 'S01', 'tf-m'));
        out.push(T(cx, cy - 4, 'S02', 'tf-m'));
        out.push(T(cx, cy + 13, 'S03', 'tf-m'));
        out.push(T(cx, 160, `→ ${o.r}`, 'tf-m tf-b'));
      });
      out.push(T(20, 192, t('C10: students of Databases · C11: students of Python'), 'tf-s', 'start'));
      out.push(T(20, 210, t('UNION ALL keeps the repeats: 3 + 2 = 5 rows.'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  /* ---- SQL languages and transactions ----------------------------------------------- */

  function sqlFamilies() {
    const alt = t('The four sub-languages of SQL. DDL (CREATE, ALTER, DROP, TRUNCATE) acts on the schema; DML (SELECT, INSERT, UPDATE, DELETE, MERGE) acts on the rows; DCL (GRANT, REVOKE) acts on users and privileges; TCL (COMMIT, ROLLBACK, SAVEPOINT) decides when changes become permanent.');
    return wrap(540, 262, alt, () => {
      const out = [];
      const fam = [
        { k: 'DDL', n: t('data definition'), v: ['CREATE · ALTER', 'DROP · TRUNCATE'], on: tl('acts on: the schema'), cls: 'tf-c2', pic: 'schema' },
        { k: 'DML', n: t('data manipulation'), v: ['SELECT · INSERT', 'UPDATE · DELETE'], on: tl('acts on: the rows'), cls: 'tf-c1', pic: 'rows' },
        { k: 'DCL', n: t('data control'), v: ['GRANT · REVOKE'], on: tl('acts on: users and|privileges'), cls: 'tf-c4', pic: 'user' },
        { k: 'TCL', n: t('transaction control'), v: ['COMMIT · ROLLBACK', 'SAVEPOINT'], on: tl('acts on: when changes|become permanent'), cls: 'tf-c5', pic: 'time' },
      ];
      fam.forEach((f, i) => {
        const x = 20 + (i % 2) * 260;
        const y = 12 + Math.floor(i / 2) * 124;
        const w = 240;
        out.push(R(x, y, w, 112, f.cls));
        out.push(T(x + 12, y + 24, f.k, 'tf-t tf-b', 'start'));
        out.push(T(x + 50, y + 24, f.n, 'tf-s', 'start'));
        out.push(TL(x + 12, y + 48, f.v, 'tf-m', 'start', 17));
        out.push(TL(x + 12, y + 88, f.on, 'tf-s', 'start', 15));
        const px = x + w - 66;
        const py = y + 38;
        if (f.pic === 'schema') {
          out.push(R(px, py, 54, 12, 'tf-box'), R(px, py + 12, 54, 30, 'tf-free'));
          out.push(L(px + 18, py, px + 18, py + 42, 'tf-rule'), L(px + 36, py, px + 36, py + 42, 'tf-rule'));
        } else if (f.pic === 'rows') {
          out.push(R(px, py, 54, 12, 'tf-box'));
          [0, 1, 2].forEach((j) => out.push(R(px, py + 12 + j * 10, 54, 10, j === 2 ? 'tf-new' : 'sf-cell')));
        } else if (f.pic === 'user') {
          out.push(C(px + 18, py + 9, 8, 'tf-box'));
          out.push(P(`M${px + 4} ${py + 42} a14 14 0 0 1 28 0 Z`, 'tf-box'));
          out.push(C(px + 44, py + 24, 6, 'tf-box'), L(px + 44, py + 30, px + 44, py + 42, 'tf-line'), L(px + 44, py + 37, px + 49, py + 37, 'tf-line'));
        } else {
          out.push(L(px, py + 22, px + 54, py + 22, 'tf-line'));
          out.push(C(px + 6, py + 22, 4, 'tf-ok'), C(px + 22, py + 22, 4, 'tf-ok'), C(px + 38, py + 22, 4, 'tf-c5'), C(px + 52, py + 22, 6, 'tf-new'));
        }
      });
      return out.join('');
    });
  }

  function txTimeline() {
    const alt = t('Timeline of one transaction: DELETE and INSERT move S03 from Python to Statistics, SAVEPOINT before_grades marks a point, an UPDATE sets every grade to 10 by mistake, ROLLBACK TO the savepoint undoes only that UPDATE, and COMMIT makes the move permanent.');
    return wrap(540, 214, alt, (m) => {
      const out = [];
      const xs = [48, 136, 224, 312, 400, 488];
      const steps = [
        { k: 'DELETE', d: tl('S03 leaves|Python'), node: 'tf-ok' },
        { k: 'INSERT', d: tl('S03 joins|Statistics'), node: 'tf-ok' },
        { k: 'SAVEPOINT', d: tl('a mark:|before_grades'), node: 'tf-c5' },
        { k: 'UPDATE', d: tl('oops: every|grade = 10'), node: 'tf-bad', bad: true },
        { k: 'ROLLBACK TO', d: tl('undoes only|the UPDATE'), node: 'tf-c3' },
        { k: 'COMMIT', d: tl('the move is|permanent'), node: 'tf-new' },
      ];
      const by = 62;
      const ly = 116;
      out.push(P(`M${xs[4]} ${by - 2} C${xs[4]} 26 ${xs[2]} 26 ${xs[2]} ${by - 3}`, 'tf-path', m.h));
      out.push(T((xs[2] + xs[4]) / 2, 22, t('back to the mark'), 'tf-s tf-b'));
      out.push(L(10, ly, 530, ly, 'tf-line', m.a));
      steps.forEach((s, i) => {
        const x = xs[i];
        out.push(R(x - 42, by, 84, 28, s.bad ? 'tf-bad' : 'tf-box'));
        out.push(T(x, by + 18.5, s.k, 'tf-m tf-b'));
        if (s.bad) out.push(L(x - 36, by + 14, x + 36, by + 14, 'sf-strike'));
        out.push(L(x, by + 28, x, ly - 7, 'tf-lead'));
        out.push(C(x, ly, i === 5 ? 8 : 6, s.node));
        out.push(TL(x, ly + 24, s.d, s.bad ? 'tf-s sf-off' : 'tf-s', 'middle', 15));
      });
      out.push(P(`M10 170 v8 H${xs[5]} v-8`, 'tf-lead'));
      out.push(T(250, 198, t('One transaction: it opens with the first change and ends at COMMIT.'), 'tf-s'));
      return out.join('');
    });
  }

  /* ---- Views and CTEs ------------------------------------------------------------- */

  function viewWindow() {
    const alt = t('A view stores only its query. Reading course_average runs SELECT course_id, ROUND(AVG(grade), 2) FROM enrolment GROUP BY course_id on the current rows of enrolment and shows C10 6.67, C11 8.25 and C20 7.00; no rows are stored in the view.');
    return wrap(540, 300, alt, (m) => {
      const out = [];
      out.push(R(20, 12, 500, 86, 'tf-c2'));
      out.push(T(32, 30, t('Stored in the data dictionary: only the query'), 'tf-s tf-b', 'start'));
      out.push(T(32, 50, 'CREATE VIEW course_average AS', 'tf-m tf-b', 'start'));
      out.push(T(44, 68, 'SELECT course_id, ROUND(AVG(grade), 2) AS average', 'tf-m', 'start'));
      out.push(T(44, 86, 'FROM enrolment GROUP BY course_id;', 'tf-m', 'start'));
      const y = 142;
      out.push(grid(20, y, [{ h: 'course_id', w: 70 }, { h: 'grade', w: 56 }], ENROL.map((e) => [e[1], g1(e[2])]), { rh: 20, label: t('enrolment: rows stored') }));
      out.push(R(322, y - 26, 162, 124, 'sf-virt'));
      out.push(grid(330, y, [{ h: 'course_id', w: 70 }, { h: 'average', w: 76 }], [['C10', '6.67'], ['C11', '8.25'], ['C20', '7.00']], { cell: () => 'sf-virtcell', label: t('course_average: a view') }));
      out.push(L(400, 98, 400, y - 28, 'tf-line', m.a));
      out.push(P(`M152 ${y + 60} C230 ${y + 60} 240 ${y + 46} 318 ${y + 46}`, 'tf-path', m.h));
      out.push(TL(160, y + 86, tl('runs the query|on every read'), 'tf-s tf-b', 'start'));
      out.push(TL(322, 262, tl('Nothing is copied: change a grade in|enrolment and the next read shows it.'), 'tf-s', 'start', 16));
      return out.join('');
    });
  }

  function ctePipeline() {
    const alt = t('Chained common table expressions: per_student computes each student\'s average (S01 7.75, S02 7.75, S03 6.25); overall uses it to compute the class average, 7.25; the final SELECT uses both and returns Ana Ruiz and Luis Gil.');
    return wrap(530, 268, alt, (m) => {
      const out = [];
      out.push(R(20, 12, 330, 66, 'tf-c1'));
      out.push(T(32, 32, 'WITH per_student AS (', 'tf-m tf-b', 'start'));
      out.push(T(44, 50, 'SELECT student_id, AVG(grade) AS average', 'tf-m', 'start'));
      out.push(T(44, 68, 'FROM enrolment GROUP BY student_id),', 'tf-m', 'start'));
      out.push(R(20, 98, 330, 48, 'tf-c3'));
      out.push(T(32, 118, 'overall AS (', 'tf-m tf-b', 'start'));
      out.push(T(44, 136, 'SELECT AVG(average) FROM per_student)', 'tf-m', 'start'));
      out.push(R(20, 166, 330, 66, 'tf-c2'));
      out.push(T(32, 186, 'SELECT s.name, p.average', 'tf-m tf-b', 'start'));
      out.push(T(32, 204, 'FROM per_student p … CROSS JOIN overall o', 'tf-m', 'start'));
      out.push(T(32, 222, 'WHERE p.average > o.class_average', 'tf-m', 'start'));
      out.push(L(120, 78, 120, 96, 'tf-line', m.a));
      out.push(L(120, 146, 120, 164, 'tf-line', m.a));
      out.push(P('M350 30 H364 V194 H353', 'tf-line', m.a));
      const sm = { rh: 16, hh: 18 };
      out.push(grid(384, 12, [{ h: 'student_id', w: 72 }, { h: 'average', w: 64 }], [['S01', '7.75'], ['S02', '7.75'], ['S03', '6.25']], { ...sm, head: 'tf-c1' }));
      out.push(R(384, 106, 64, 28, 'tf-new'));
      out.push(T(416, 125, '7.25', 'tf-m tf-b'));
      out.push(T(384, 150, t('class average'), 'tf-s', 'start'));
      out.push(grid(384, 172, [{ h: 'name', w: 76 }, { h: 'average', w: 60 }], [['Ana Ruiz', '7.75'], ['Luis Gil', '7.75']], { ...sm, head: 'tf-c2', cell: () => 'tf-new' }));
      out.push(T(20, 258, t('Each named step can use the ones before it; the final SELECT uses both.'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  /* ---- PL/SQL --------------------------------------------------------------------- */

  function plsqlBlock() {
    const alt = t('Structure of a PL/SQL block: an optional DECLARE section with variables, a required BEGIN section with the statements, which can contain other blocks, an optional EXCEPTION section with the error handlers, and END;. A / alone on the next line runs it in a script.');
    return wrap(530, 330, alt, () => {
      const out = [];
      out.push(R(20, 12, 320, 286, 'tf-box'));
      const bands = [
        { k: 'DECLARE', y: 22, h: 56, cls: 'tf-c5', code: ['v_total NUMBER := 0;'], l: t('Ingredients'), d: tl('variables, constants,|cursors · optional') },
        { k: 'BEGIN', y: 86, h: 132, cls: 'tf-c2', code: ['SELECT name INTO v_name …;'], l: t('Steps'), d: tl('SQL and PL/SQL|statements · required') },
        { k: 'EXCEPTION', y: 226, h: 48, cls: 'tf-c3', code: ['WHEN NO_DATA_FOUND THEN …'], l: t('If something goes wrong'), d: tl('the error handlers|· optional') },
      ];
      bands.forEach((b) => {
        out.push(R(28, b.y, 304, b.h, b.cls));
        out.push(T(40, b.y + 20, b.k, 'tf-m tf-b', 'start'));
        out.push(TL(52, b.y + 40, b.code, 'tf-m', 'start'));
        out.push(T(356, b.y + 20, b.l, 'tf-t tf-b', 'start'));
        out.push(TL(356, b.y + 38, b.d, 'tf-s', 'start'));
      });
      out.push(R(52, 140, 268, 66, 'tf-box tf-dashed'));
      out.push(T(64, 162, 'BEGIN … EXCEPTION … END;', 'tf-m', 'start'));
      out.push(T(64, 184, t('a block can contain other blocks'), 'tf-s', 'start'));
      out.push(T(40, 290, 'END;', 'tf-m tf-b', 'start'));
      out.push(T(28, 320, '/', 'tf-m tf-b', 'start'));
      out.push(T(44, 320, t('alone on the next line: run the block'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  function cursorLife() {
    const rows = [['S01', 'C10', '4.0'], ['S02', 'C10', '6.5'], ['S03', 'C10', '8.5'], ['S03', 'C11', '7.5'], ['S01', 'C20', '9.5'], ['S02', 'C20', '3.0']];
    const alt = t('Lifecycle of an explicit cursor: DECLARE, OPEN, then FETCH in a loop until %NOTFOUND, then CLOSE. The cursor c_grades points at the second of six rows after two FETCHes; the first row has been processed (4.0 became 5.0), %ROWCOUNT is 2 and %FOUND is TRUE.');
    return wrap(540, 334, alt, (m) => {
      const out = [];
      const steps = ['DECLARE c_grades', 'OPEN c_grades', 'FETCH c_grades INTO r', 'EXIT WHEN %NOTFOUND', 'CLOSE c_grades'];
      const sy = (i) => 50 + i * 46;
      out.push(T(30, 30, t('Lifecycle'), 'tf-t tf-b', 'start'));
      steps.forEach((s, i) => {
        out.push(R(30, sy(i), 168, 30, i === 2 ? 'tf-hl' : 'tf-c2'));
        out.push(T(114, sy(i) + 19.5, s, 'tf-m tf-b'));
        if (i < steps.length - 1) out.push(L(114, sy(i) + 30, 114, sy(i + 1) - 2, 'tf-line', m.a));
      });
      out.push(P(`M30 ${sy(3) + 15} H16 V${sy(2) + 15} H27`, 'tf-path', m.h));
      out.push(vText(9, (sy(2) + sy(3)) / 2 + 15, t('loop')));
      const y = 50;
      const rh = 26;
      const cur = 1;
      out.push(grid(246, y, [{ h: 'student_id', w: 72 }, { h: 'course_id', w: 72 }, { h: 'grade', w: 52 }], rows, {
        rh, cell: (i) => (i === cur ? 'tf-hl' : i < cur ? 'tf-ok' : ''), label: t('c_grades: the rows of its SELECT'),
      }));
      const end = y + 24 + rows.length * rh;
      out.push(R(246, end, 196, rh, 'tf-free'));
      out.push(T(344, end + 17, t('end of the list'), 'tf-s'));
      const cy = rowMid(y, cur, rh);
      out.push(P(`M224 ${cy - 8} L240 ${cy} L224 ${cy + 8} Z`, 'tf-head-hl'));
      out.push(T(450, rowMid(y, 0, rh) + 4.5, '4.0 → 5.0', 'tf-m tf-oktext', 'start'));
      out.push(T(450, cy + 4.5, t('← current row'), 'tf-s tf-b', 'start'));
      out.push(T(246, 282, 'c_grades%ROWCOUNT = 2', 'tf-m', 'start'));
      out.push(T(246, 300, '%FOUND = TRUE · %NOTFOUND = FALSE', 'tf-m', 'start'));
      out.push(T(30, 326, t('A cursor FOR loop does the OPEN, FETCH, EXIT and CLOSE for you.'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  function exceptionFlow() {
    const alt = t('Exception propagation. Inside an inner block, SELECT INTO finds no row and raises NO_DATA_FOUND; the rest of the inner block is skipped. Its handler WHEN TOO_MANY_ROWS does not match, so the exception goes up to the outer block, whose WHEN NO_DATA_FOUND handler catches it. If no block handled it, the error would reach the caller.');
    return wrap(540, 346, alt, (m) => {
      const out = [];
      out.push(R(20, 12, 330, 296, 'tf-box'));
      out.push(T(32, 34, 'BEGIN', 'tf-m tf-b', 'start'));
      out.push(T(44, 56, 'v_count := v_count + 1;', 'tf-m', 'start'));
      out.push(R(40, 68, 296, 154, 'tf-zone'));
      out.push(T(52, 90, 'BEGIN', 'tf-m tf-b', 'start'));
      out.push(R(60, 98, 268, 26, 'tf-bad'));
      out.push(T(68, 116, 'SELECT name INTO v_name …;', 'tf-m', 'start'));
      out.push(T(68, 146, 'DBMS_OUTPUT.PUT_LINE(v_name);', 'tf-m sf-off', 'start'));
      out.push(T(52, 170, 'EXCEPTION', 'tf-m tf-b', 'start'));
      out.push(T(68, 192, 'WHEN TOO_MANY_ROWS THEN …', 'tf-m sf-off', 'start'));
      out.push(T(52, 212, 'END;', 'tf-m tf-b', 'start'));
      out.push(T(32, 246, 'EXCEPTION', 'tf-m tf-b', 'start'));
      out.push(R(40, 254, 296, 26, 'tf-ok'));
      out.push(T(52, 272, 'WHEN NO_DATA_FOUND THEN …', 'tf-m', 'start'));
      out.push(T(32, 300, 'END;', 'tf-m tf-b', 'start'));
      out.push(P('M329 111 H344 V267 H339', 'tf-path', m.h));
      out.push(C(344, 188, 4, 'tf-bad'));
      const notes = [
        { y: 108, l: tl('SELECT INTO finds no row:|NO_DATA_FOUND is raised') },
        { y: 144, l: tl('the rest of the block|is skipped') },
        { y: 186, l: tl('no handler matches:|it goes up one level') },
        { y: 264, l: tl('caught here: the outer|block ends normally') },
      ];
      notes.forEach((n, i) => {
        out.push(T(362, n.y, String(i + 1), 'tf-t tf-b', 'start'));
        out.push(TL(378, n.y, n.l, 'tf-s', 'start'));
      });
      out.push(T(20, 334, t('If no block handles it, the error reaches the caller and the script stops.'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  function procVsFunc() {
    const alt = t('A procedure such as enrol_student receives IN parameters, does something (inserts a row in enrolment) and hands a message back in an OUT parameter. A function such as letter_grade returns one value and can be used inside a SELECT: 8.5 gives B, 4.5 gives F and NULL gives -.');
    return wrap(540, 304, alt, (m) => {
      const out = [];
      out.push(T(20, 20, t('Procedure: does something'), 'tf-t tf-b', 'start'));
      out.push(R(20, 34, 230, 30, 'tf-box'));
      out.push(T(135, 53.5, t('caller: a block or EXEC'), 'tf-s'));
      out.push(L(40, 64, 40, 118, 'tf-line', m.a));
      out.push(L(110, 64, 110, 118, 'tf-line', m.a));
      out.push(L(200, 120, 200, 66, 'tf-path', m.h));
      out.push(T(46, 96, "IN 'S03'", 'tf-m', 'start'));
      out.push(T(116, 96, "IN 'C10'", 'tf-m', 'start'));
      out.push(T(206, 96, 'OUT', 'tf-m tf-b', 'start'));
      out.push(R(20, 120, 230, 40, 'tf-c2'));
      out.push(T(135, 145, 'enrol_student', 'tf-m tf-b'));
      out.push(L(135, 160, 135, 186, 'tf-line', m.a));
      out.push(T(143, 178, 'INSERT', 'tf-m', 'start'));
      out.push(cylinder(80, 188, 110, 48));
      out.push(T(135, 220, 'enrolment', 'tf-m'));
      out.push(TL(20, 264, tl('Called as a statement; it hands|results back in OUT parameters.'), 'tf-s', 'start', 16));
      out.push(L(270, 10, 270, 292, 'tf-rule'));
      out.push(T(290, 20, t('Function: returns a value'), 'tf-t tf-b', 'start'));
      out.push(T(290, 44, 'SELECT student_id, grade,', 'tf-m', 'start'));
      out.push(T(340, 60, 'letter_grade(grade)', 'tf-m tf-b', 'start'));
      out.push(T(290, 76, 'FROM enrolment;', 'tf-m', 'start'));
      out.push(R(290, 96, 230, 34, 'tf-c3'));
      out.push(T(405, 117.5, 'letter_grade → RETURN', 'tf-m tf-b'));
      const gx = 290;
      const cols = [{ h: 'student_id', w: 76 }, { h: 'grade', w: 60 }, { h: 'letter', w: 70 }];
      out.push(L(gx + 171, 130, gx + 171, 150, 'tf-path', m.h));
      out.push(grid(gx, 152, cols, [['S01', '8.5', 'B'], ['S02', '4.5', 'F'], ['S03', null, '-']], { cell: (i, j) => (j === 2 ? 'tf-new' : '') }));
      out.push(TL(290, 264, tl('One value per call, usable inside|expressions and SQL queries.'), 'tf-s', 'start', 16));
      return out.join('');
    });
  }

  function triggerTiming() {
    const alt = t('Firing order of triggers for an UPDATE that changes two rows: the BEFORE statement trigger once, then for each row a BEFORE row trigger, the change and an AFTER row trigger (S02 from 9.0 to 9.5, S03 from 7.5 to 8.0), and finally the AFTER statement trigger once.');
    return wrap(540, 240, alt, (m) => {
      const out = [];
      out.push(T(20, 20, "UPDATE enrolment SET grade = grade + 0.5 WHERE course_id = 'C11'", 'tf-m tf-b', 'start'));
      out.push(T(270, 50, t('Statement level: once per statement'), 'tf-s tf-b'));
      out.push(R(6, 58, 70, 40, 'tf-c2'));
      out.push(TC(41, 78, tl('BEFORE|statement'), 'tf-s tf-b'));
      out.push(R(464, 58, 70, 40, 'tf-c2'));
      out.push(TC(499, 78, tl('AFTER|statement'), 'tf-s tf-b'));
      out.push(T(270, 112, t('FOR EACH ROW: once per changed row'), 'tf-s tf-b'));
      const rowsChg = [['S02', '9.0', '9.5'], ['S03', '7.5', '8.0']];
      const bw = 56;
      const gap = 8;
      const gw3 = 3 * bw + 2 * gap;
      const ry = 122;
      rowsChg.forEach((r, g) => {
        const gx = 84 + g * (gw3 + 14);
        ['BEFORE', t('change'), 'AFTER'].forEach((k, j) => {
          const x = gx + j * (bw + gap);
          out.push(R(x, ry, bw, 30, j === 1 ? 'tf-box' : 'tf-c1'));
          out.push(T(x + bw / 2, ry + 19.5, k, 'tf-s'));
          if (j < 2) out.push(L(x + bw, ry + 15, x + bw + gap - 1, ry + 15, 'tf-line', m.a));
        });
        const cx = gx + gw3 / 2;
        out.push(T(cx, ry + 50, t('row {id}', { id: r[0] }), 'tf-s tf-b'));
        out.push(T(cx, ry + 66, `:OLD ${r[1]} → :NEW ${r[2]}`, 'tf-m'));
        if (g === 0) out.push(L(gx + gw3, ry + 15, gx + gw3 + 13, ry + 15, 'tf-line', m.a));
      });
      out.push(P(`M41 98 V${ry + 15} H81`, 'tf-line', m.a));
      out.push(P(`M${84 + 2 * gw3 + 14} ${ry + 15} H499 V101`, 'tf-line', m.a));
      out.push(T(20, 214, t('BEFORE row can check or change :NEW; AFTER row sees the final values,'), 'tf-s', 'start'));
      out.push(T(20, 232, t('for example to write a line in grade_audit.'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  function packageSpecBody() {
    const alt = t('A package grades_pkg. Its specification is public: letter, curve_course and the constant c_max_grade, which other programs can call. Its body is private: the code of letter and curve_course and the helper safe_points, which only curve_course can call; programs outside the package cannot reach it.');
    return wrap(540, 304, alt, (m) => {
      const out = [];
      out.push(R(20, 60, 104, 44, 'tf-box'));
      out.push(TC(72, 82, tl('other|programs'), 'tf-s tf-b'));
      out.push(R(160, 14, 360, 104, 'tf-c2'));
      out.push(T(172, 34, t('Specification (public): the menu'), 'tf-t tf-b', 'start'));
      out.push(T(184, 60, 'letter(p_grade) RETURN VARCHAR2', 'tf-m', 'start'));
      out.push(T(184, 82, 'curve_course(p_course, p_points)', 'tf-m', 'start'));
      out.push(T(184, 104, 'c_max_grade CONSTANT NUMBER := 10', 'tf-m', 'start'));
      out.push(L(124, 74, 178, 56, 'tf-line', m.a));
      out.push(L(124, 84, 178, 78, 'tf-line', m.a));
      out.push(R(160, 136, 360, 134, 'tf-c7'));
      out.push(T(172, 156, t('Body (private): the kitchen'), 'tf-t tf-b', 'start'));
      out.push(T(184, 180, 'FUNCTION letter … BEGIN … END;', 'tf-m', 'start'));
      out.push(T(184, 202, 'PROCEDURE curve_course … END;', 'tf-m', 'start'));
      out.push(R(180, 220, 320, 34, 'tf-box tf-dashed'));
      out.push(T(192, 241.5, 'safe_points(p_points)', 'tf-m tf-b', 'start'));
      out.push(TC(490, 237, tl('private: only the|body can call it'), 'tf-s', 'end', 14));
      out.push(P('M60 104 V237 H150', 'sf-block'));
      out.push(T(160, 242, '✗', 'tf-t tf-badtext tf-b'));
      out.push(TL(68, 170, tl('cannot|call it'), 'tf-s tf-badtext', 'start'));
      out.push(T(20, 294, t('Change the body without touching the specification: callers keep working.'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  /* ---- Dispatcher ------------------------------------------------------------------ */

  const KINDS = {
    'select-pick': selectPick,
    'clause-order': clauseOrder,
    'where-precedence': wherePrecedence,
    'three-valued': threeValued,
    'join-match': joinMatch,
    'join-venn': joinVenn,
    'cross-self': crossSelf,
    'aggregate-null': aggregateNull,
    'group-fold': groupFold,
    'subquery-nest': subqueryNest,
    'in-any-all': inAnyAll,
    'correlated-loop': correlatedLoop,
    'set-venn': setVenn,
    'sql-families': sqlFamilies,
    'tx-timeline': txTimeline,
    'view-window': viewWindow,
    'cte-pipeline': ctePipeline,
    'plsql-block': plsqlBlock,
    'cursor-life': cursorLife,
    'exception-flow': exceptionFlow,
    'proc-vs-func': procVsFunc,
    'trigger-timing': triggerTiming,
    'package-spec-body': packageSpecBody,
  };

  function svg(figure) {
    if (!figure) return '';
    const kind = typeof figure === 'string' ? figure : figure.kind;
    if (!KINDS[kind]) {
      console.warn(`[sql] unknown figure kind: ${kind}`);
      return '';
    }
    return KINDS[kind]();
  }

  return { svg, KINDS: Object.keys(KINDS) };
})();
