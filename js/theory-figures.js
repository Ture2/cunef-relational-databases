'use strict';

/* ==========================================================================
   Figures for the Theory cards, as inline SVG (same conventions as
   js/er-diagram.js: role="img", aria-label + <title>, viewBox, width 100%
   with a max-width at native size). Colours only through classes styled in
   theory.css with the tokens of styles.css, so the dark theme applies.

   svg({ kind, ... }) → '<svg …>' | ''. Kinds:
     pyramid · files-vs-db · dbms-architecture · ansi-sparc · storage-hierarchy
     record-layout   { variant: 'fixed' | 'variable' }
     file-organization { org: 'sequential' | 'heap' | 'hash' | 'clustered' | 'isam' }
     btree           { key?: number }  (search key whose path is highlighted; 62 by default)
     lifecycle       data modelling lifecycle
   ========================================================================== */

const TheoryFigures = (() => {
  let uid = 0;
  const r1 = (n) => Math.round(n * 10) / 10;
  /* Two-line labels are one key, with the lines separated by '|', so each language can break them its own way. */
  const tl = (s) => t(s).split('|');
  const nf = (n) => Number(n).toLocaleString(LANG === 'es' ? 'es-ES' : 'en-GB');

  /* ---- Drawing helpers ------------------------------------------------------ */

  const T = (x, y, s, cls = 'tf-t', anchor = 'middle') =>
    `<text class="${cls}" x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}">${esc(s)}</text>`;
  /* Lines of text centred vertically on cy. */
  const TC = (x, cy, lines, cls = 'tf-t', anchor = 'middle', lh = 15) =>
    lines.map((s, i) => T(x, cy + 4.5 + (i - (lines.length - 1) / 2) * lh, s, cls, anchor)).join('');
  const R = (x, y, w, h, cls = 'tf-box') =>
    `<rect class="${cls}" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="2"/>`;
  const L = (x1, y1, x2, y2, cls = 'tf-line', extra = '') =>
    `<line class="${cls}" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" ${extra}/>`;
  const P = (d, cls = 'tf-line', extra = '') => `<path class="${cls}" d="${d}" ${extra}/>`;
  const vText = (x, y, s, cls = 'tf-s') =>
    `<text class="${cls}" x="${r1(x)}" y="${r1(y)}" text-anchor="middle" transform="rotate(-90 ${r1(x)} ${r1(y)})">${esc(s)}</text>`;
  /* A disk drum: body + top ellipse. */
  function cylinder(x, y, w, h, cls = 'tf-disk') {
    const rx = w / 2;
    const ry = Math.min(10, h / 6);
    return `<path class="${cls}" d="M${r1(x)} ${r1(y + ry)} a${r1(rx)} ${r1(ry)} 0 0 0 ${r1(w)} 0 v${r1(h - 2 * ry)} a${r1(rx)} ${r1(ry)} 0 0 1 ${r1(-w)} 0 Z"/>
      <ellipse class="${cls}" cx="${r1(x + rx)}" cy="${r1(y + ry)}" rx="${r1(rx)}" ry="${r1(ry)}"/>`;
  }
  /* A document with a folded corner. */
  const doc = (x, y, w, h, cls = 'tf-box') =>
    P(`M${x} ${y}h${w - 14}l14 14v${h - 14}h${-w}Z M${x + w - 14} ${y}v14h14`, cls);

  /* draw(m) gets m.a / m.h: marker attributes for a normal and a highlighted arrow head. */
  function wrap(w, h, alt, draw) {
    const id = `tf${++uid}`;
    const m = { a: `marker-end="url(#${id}-a)"`, h: `marker-end="url(#${id}-h)"`, both: `marker-start="url(#${id}-a)" marker-end="url(#${id}-a)"` };
    const mk = (k, cls) => `<marker id="${id}-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="${cls}" d="M0 0L10 5L0 10Z"/></marker>`;
    return `<svg class="tf-svg" viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px" role="img" aria-label="${esc(alt)}">
      <title>${esc(alt)}</title><defs>${mk('a', 'tf-head')}${mk('h', 'tf-head-hl')}</defs>${draw(m)}</svg>`;
  }

  /* ---- Information-system pyramid --------------------------------------------- */

  function pyramid() {
    const ax = 190;
    const top = 24;
    const base = 304;
    const hw = (y) => ((y - top) / (base - top)) * 150;
    const cuts = [top, 94, 164, 234, base];
    const levels = [
      { cls: 'tf-c2', name: t('Strategic'), sys: 'EIS / ESS', who: t('Senior management · years'), ex: t('e.g. executive KPI dashboard') },
      { cls: 'tf-c6', name: t('Tactical'), sys: 'DSS', who: t('Middle management · months to years'), ex: t('e.g. what-if price simulation') },
      { cls: 'tf-c1', name: t('Knowledge'), sys: 'MIS', who: t('Supervisors, analysts · days to weeks'), ex: t('e.g. weekly sales report') },
      { cls: 'tf-c3', name: t('Operational'), sys: 'TPS / OLTP', who: t('Operational staff · real time'), ex: t('e.g. shop till, bank transfer') },
    ];
    const alt = t('Information-system pyramid. From the base up: {list}. Information is more summarised at each higher level.', {
      list: levels.slice().reverse().map((l) => `${l.name} (${l.sys})`).join(', '),
    });
    return wrap(620, 324, alt, (m) => {
      const out = [];
      levels.forEach((l, i) => {
        const y0 = cuts[i];
        const y1 = cuts[i + 1];
        const pts = i === 0
          ? `${ax},${y0} ${r1(ax + hw(y1))},${y1} ${r1(ax - hw(y1))},${y1}`
          : `${r1(ax - hw(y0))},${y0} ${r1(ax + hw(y0))},${y0} ${r1(ax + hw(y1))},${y1} ${r1(ax - hw(y1))},${y1}`;
        out.push(`<polygon class="${l.cls}" points="${pts}"/>`);
        const mid = (y0 + y1) / 2 + (i === 0 ? 14 : 0);
        out.push(L(ax + hw(mid) + 4, mid, 352, mid, 'tf-lead'));
        out.push(T(358, mid - 12, `${l.name} · ${l.sys}`, 'tf-t tf-b', 'start'));
        out.push(T(358, mid + 4, l.who, 'tf-t', 'start'));
        out.push(T(358, mid + 19, l.ex, 'tf-s', 'start'));
      });
      out.push(L(26, 296, 26, 30, 'tf-line', m.a));
      out.push(vText(16, 164, t('More summarised, less volume and detail')));
      return out.join('');
    });
  }

  /* ---- Separate files vs one database ------------------------------------------ */

  function filesVsDb() {
    const alt = t('Above: the payroll, HR and sales applications each keep their own file, and the same employee appears in all three, once with a different spelling. Below: the three applications use one database through the DBMS, where the employee is stored once.');
    return wrap(520, 432, alt, (m) => {
      const out = [];
      const cols = [90, 260, 430];
      const apps = [t('Payroll app'), t('HR app'), t('Sales app')];
      const files = [
        { name: 'payroll.xlsx', rows: ['Ana López', 'C/ Mayor 3', t('salary 2,100')], dup: [0, 1] },
        { name: 'staff.csv', rows: ['Ana López', 'C/ Mayor 3', t('dept. Marketing')], dup: [0, 1] },
        { name: 'sales.txt', rows: ['A. López', 'Calle Mayor, 3', t('sales rep')], dup: [0, 1], odd: true },
      ];
      out.push(T(10, 18, t('Separate files: each department keeps its own copy'), 'tf-t tf-b', 'start'));
      cols.forEach((cx, i) => {
        out.push(R(cx - 70, 30, 140, 30, 'tf-box'));
        out.push(T(cx, 50, apps[i]));
        out.push(L(cx, 60, cx, 82, 'tf-line', m.a));
        out.push(doc(cx - 70, 84, 140, 90));
        const f = files[i];
        out.push(T(cx - 60, 102, f.name, 'tf-m tf-b', 'start'));
        f.rows.forEach((r, k) => {
          if (f.dup.includes(k)) out.push(R(cx - 64, 110 + k * 20, 128, 18, f.odd ? 'tf-bad' : 'tf-dup'));
          out.push(T(cx - 60, 123 + k * 20, r, 'tf-m', 'start'));
        });
      });
      out.push(T(260, 194, t('The same employee is stored three times (redundancy)'), 'tf-t tf-badtext'));
      out.push(T(260, 210, t('and one copy is written differently (inconsistency).'), 'tf-t tf-badtext'));
      out.push(L(10, 224, 510, 224, 'tf-rule'));
      out.push(T(10, 246, t('One database shared through the DBMS'), 'tf-t tf-b', 'start'));
      cols.forEach((cx, i) => {
        out.push(R(cx - 70, 258, 140, 30, 'tf-box'));
        out.push(T(cx, 278, apps[i]));
        out.push(L(cx, 288, 260 + (cx - 260) * 0.45, 318, 'tf-line', m.both));
      });
      out.push(R(160, 320, 200, 32, 'tf-ink'));
      out.push(T(260, 341, t('DBMS'), 'tf-t tf-b tf-inv'));
      out.push(L(260, 352, 260, 370, 'tf-line', m.both));
      out.push(cylinder(160, 372, 200, 56, 'tf-disk'));
      out.push(T(260, 404, t('Employee: Ana López · C/ Mayor 3'), 'tf-t'));
      out.push(T(260, 420, t('stored once'), 'tf-s tf-oktext'));
      return out.join('');
    });
  }

  /* ---- DBMS internal architecture ---------------------------------------------- */

  function dbmsArchitecture() {
    const alt = t('DBMS architecture. Users at the top send work to the query processor (DDL interpreter, DML compiler, embedded DML precompiler, query evaluation engine), which uses the storage manager (transaction, buffer and file managers), which reads and writes the data files, data dictionary, indexes and statistics on disk.');
    return wrap(560, 500, alt, (m) => {
      const out = [];
      const users = [
        tl('Database|administrator'),
        tl('Sophisticated|users'),
        tl('Application|programmers'),
        tl('End users|(clerks, ATMs…)'),
      ];
      out.push(T(8, 16, t('Users'), 'tf-t tf-b', 'start'));
      users.forEach((u, i) => {
        const x = 8 + i * 138;
        out.push(R(x, 24, 130, 44, 'tf-c1'));
        out.push(TC(x + 65, 46, u, 'tf-t'));
        out.push(L(x + 65, 68, x + 65, 98, 'tf-line', m.a));
      });
      // Query processor
      out.push(R(4, 100, 552, 140, 'tf-zone'));
      out.push(T(14, 120, t('Query processor'), 'tf-t tf-b', 'start'));
      const qp = [tl('DDL|interpreter'), tl('DML|compiler'), tl('Embedded DML|precompiler')];
      qp.forEach((q, i) => {
        const x = 24 + i * 176;
        out.push(R(x, 130, 160, 42, 'tf-box'));
        out.push(TC(x + 80, 151, q));
      });
      out.push(L(376, 151, 362, 151, 'tf-line', m.a));
      out.push(R(200, 188, 160, 42, 'tf-box'));
      out.push(TC(280, 209, tl('Query evaluation|engine')));
      out.push(L(280, 172, 280, 186, 'tf-line', m.a));
      out.push(L(280, 230, 280, 268, 'tf-line', m.both));
      // Storage manager
      out.push(R(4, 270, 552, 108, 'tf-zone'));
      out.push(T(14, 290, t('Storage manager'), 'tf-t tf-b', 'start'));
      const sm = [tl('Transaction|manager'), tl('Buffer|manager'), tl('File|manager')];
      sm.forEach((q, i) => {
        const x = 24 + i * 176;
        out.push(R(x, 300, 160, 42, 'tf-box'));
        out.push(TC(x + 80, 321, q));
      });
      out.push(L(184, 321, 198, 321, 'tf-line', m.both));
      out.push(L(360, 321, 374, 321, 'tf-line', m.both));
      out.push(T(280, 366, t('concurrency, recovery, reading blocks into memory'), 'tf-s'));
      out.push(L(456, 342, 456, 400, 'tf-line', m.both));
      // Disk
      out.push(cylinder(4, 396, 552, 100, 'tf-disk'));
      out.push(T(14, 430, t('Disk storage'), 'tf-t tf-b', 'start'));
      const disk = [t('Data files'), t('Data dictionary'), t('Indexes'), t('Statistical data')];
      disk.forEach((d, i) => {
        const x = 16 + i * 134;
        out.push(R(x, 440, 126, 32, 'tf-box'));
        out.push(T(x + 63, 461, d));
      });
      return out.join('');
    });
  }

  /* ---- ANSI/SPARC three-schema architecture --------------------------------------- */

  function ansiSparc() {
    const alt = t('ANSI/SPARC architecture. Three external views map to one conceptual schema (logical independence sits between them), which maps to the internal schema (physical independence sits between them), which describes the physical storage on disk.');
    return wrap(560, 404, alt, (m) => {
      const out = [];
      const views = [tl('View 1|Payroll app'), tl('View 2|HR app'), tl('View 3|Web portal')];
      const vx = [160, 292, 424];
      views.forEach((v, i) => {
        out.push(R(vx[i], 18, 120, 46, 'tf-c5'));
        out.push(TC(vx[i] + 60, 41, v));
        out.push(L(vx[i] + 60, 64, 352 + (i - 1) * 60, 128, 'tf-line', m.a));
      });
      out.push(R(222, 130, 260, 54, 'tf-c2'));
      out.push(TC(352, 157, tl('Conceptual schema|entities, relationships, constraints'), 'tf-t'));
      out.push(L(352, 184, 352, 230, 'tf-line', m.a));
      out.push(R(222, 232, 260, 54, 'tf-c6'));
      out.push(TC(352, 259, tl('Internal schema|files, records, indexes'), 'tf-t'));
      out.push(L(352, 286, 352, 316, 'tf-line', m.a));
      out.push(cylinder(262, 318, 180, 70, 'tf-disk'));
      out.push(T(352, 362, t('Physical storage'), 'tf-t tf-b'));
      // Level labels on the left, and between them the two independences with the mapping that provides each.
      const lab = (y, lines) => TC(8, y, lines, 'tf-t tf-b', 'start');
      out.push(lab(41, tl('External|level')));
      out.push(lab(157, tl('Conceptual|level')));
      out.push(lab(259, tl('Internal|level')));
      out.push(TC(8, 353, [t('Disk')], 'tf-t tf-b', 'start'));
      const indep = (y, name, map) => `${R(4, y - 32, 140, 64, 'tf-ok')}${TC(74, y - 13, name, 'tf-s tf-oktext tf-b', 'middle', 13)}${TC(74, y + 15, map, 'tf-s', 'middle', 13)}`;
      out.push(indep(97, tl('Logical|independence'), tl('external/conceptual|mapping')));
      out.push(L(144, 97, 214, 97, 'tf-dashline'));
      out.push(indep(208, tl('Physical|independence'), tl('conceptual/internal|mapping')));
      out.push(L(144, 208, 340, 208, 'tf-dashline'));
      return out.join('');
    });
  }

  /* ---- Storage hierarchy -------------------------------------------------------- */

  function storageHierarchy() {
    const rows = [
      tl('Registers|≈1 ns · bytes'),
      tl('Cache (L1–L3)|≈1–10 ns · MB'),
      tl('Main memory (RAM)|≈100 ns · GB'),
      ['SSD', t('≈0.05–0.1 ms · TB')],
      tl('Hard disk (HDD)|≈8–10 ms · TB'),
      tl('Tape / cloud archive|seconds to minutes · PB'),
    ];
    const alt = t('Storage hierarchy from fastest to largest: {list}. Higher levels are faster and more expensive per GB; lower levels hold more. Registers, cache and RAM are volatile; SSD, HDD and tape are non-volatile.', { list: rows.map((r) => r[0]).join(', ') });
    return wrap(580, 330, alt, (m) => {
      const out = [];
      rows.forEach((r, i) => {
        const w = 190 + i * 52;
        const y = 22 + i * 48;
        out.push(R(290 - w / 2, y, w, 40, i < 3 ? 'tf-c3' : 'tf-c1'));
        out.push(T(290, y + 17, r[0], 'tf-t tf-b'));
        out.push(T(290, y + 33, r[1], 'tf-s'));
      });
      const cut = 22 + 3 * 48 - 4;
      out.push(L(54, cut, 526, cut, 'tf-dashline tf-acc'));
      out.push(T(540, cut - 8, t('Volatile'), 'tf-t tf-b', 'end'));
      out.push(T(540, cut + 18, t('Non-volatile'), 'tf-t tf-b', 'end'));
      out.push(L(28, 306, 28, 26, 'tf-line', m.a));
      out.push(vText(16, 166, t('Faster and more expensive per GB')));
      out.push(L(552, 26, 552, 306, 'tf-line', m.a));
      out.push(vText(566, 166, t('More capacity')));
      return out.join('');
    });
  }

  /* ---- Record layout ------------------------------------------------------------- */

  /* One strip of cells: [{ label, bytes, value, used?, cls }] from x0 with the given widths.
     Draws names above (unless group labels are used), value inside, bytes and offsets below. */
  function strip(cells, x0, y, widths, { names = true } = {}) {
    const out = [];
    let x = x0;
    let off = 0;
    cells.forEach((c, i) => {
      const w = widths[i];
      out.push(R(x, y, w, 34, c.cls || 'tf-box'));
      if (c.used != null && c.used < c.bytes) {
        const uw = Math.max(8, (w * c.used) / c.bytes);
        out.push(R(x + uw, y + 1, w - uw - 1, 32, 'tf-pad'));
      }
      out.push(T(c.used != null ? x + 5 : x + w / 2, y + 22, c.value, 'tf-m', c.used != null ? 'start' : 'middle'));
      if (names) out.push(T(x + w / 2, y - 7, c.label, 'tf-s tf-b'));
      out.push(T(x + w / 2, y + 50, `${nf(c.bytes)} B`, 'tf-s'));
      out.push(T(x, y + 66, nf(off), 'tf-m tf-off'));
      x += w;
      off += c.bytes;
    });
    out.push(T(x, y + 66, nf(off), 'tf-m tf-off'));
    return { svg: out.join(''), end: x, total: off };
  }
  function recordLayout(variant) {
    const name = t('name');
    const email = t('email');
    const phone = t('phone');
    const bal = t('balance');
    const len = t('len');
    if (variant !== 'variable') {
      const cells = [
        { label: 'id', bytes: 4, value: '123' },
        { label: `${name} CHAR(30)`, bytes: 30, value: 'Juan Pérez', used: 10 },
        { label: `${email} CHAR(40)`, bytes: 40, value: 'juan@email.com', used: 14 },
        { label: `${phone} (15)`, bytes: 15, value: '555-1234', used: 8 },
        { label: bal, bytes: 8, value: nf(1250.75) },
      ];
      const alt = t('Fixed-length record of 97 bytes: id 4 bytes at offset 0, name 30 bytes at offset 4, email 40 bytes at offset 34, phone 15 bytes at offset 74 and balance 8 bytes at offset 89. The unused part of each text field is padding.');
      return wrap(580, 176, alt, () => {
        const s = strip(cells, 20, 34, [40, 146, 186, 96, 72]);
        return `${s.svg}
          ${R(20, 128, 18, 14, 'tf-pad')}${T(44, 139, t('unused space (padding): 20 + 26 + 7 = 53 bytes'), 'tf-s', 'start')}
          ${T(20, 162, t('Every record takes 97 bytes, so record i starts at byte i × 97.'), 'tf-t', 'start')}`;
      });
    }
    const a = [
      { label: 'id', bytes: 4, value: '123' },
      { label: len, bytes: 1, value: '10', cls: 'tf-c3' },
      { label: name, bytes: 10, value: 'Juan Pérez' },
      { label: len, bytes: 1, value: '14', cls: 'tf-c3' },
      { label: email, bytes: 14, value: 'juan@email.com' },
      { label: len, bytes: 1, value: '8', cls: 'tf-c3' },
      { label: phone, bytes: 8, value: '555-1234' },
      { label: bal, bytes: 8, value: nf(1250.75) },
    ];
    const b = [
      { bytes: 1, value: '00010', cls: 'tf-c4' },
      { bytes: 4, value: '25,10', cls: 'tf-c3' },
      { bytes: 4, value: '35,14', cls: 'tf-c3' },
      { bytes: 4, value: '0,0', cls: 'tf-c3' },
      { bytes: 4, value: '123' },
      { bytes: 8, value: nf(1250.75) },
      { bytes: 10, value: 'Juan Pérez' },
      { bytes: 14, value: 'juan@email.com' },
    ];
    const alt = t('Two variable-length layouts of the same record. A: each variable field is preceded by a 1-byte length (47 bytes in total). B: a header with a null bitmap and an offset table of (offset, length) pairs, then the fixed fields, then the variable data; phone is NULL (49 bytes in total).');
    return wrap(580, 330, alt, () => {
      const out = [];
      out.push(T(20, 18, t('A. Length prefix before each variable field: 47 bytes'), 'tf-t tf-b', 'start'));
      out.push(strip(a, 20, 44, [40, 28, 92, 28, 128, 28, 78, 72]).svg);
      out.push(T(20, 152, t('B. Header + fixed part + variable part: 49 bytes (phone is NULL)'), 'tf-t tf-b', 'start'));
      const wb = [72, 50, 50, 50, 40, 72, 90, 122];
      const x = (i) => 20 + wb.slice(0, i).reduce((s, w) => s + w, 0);
      const brace = (i, j, label) => `${P(`M${r1(x(i) + 2)} 188v-6h${r1(x(j) - x(i) - 4)}v6`, 'tf-lead')}${T((x(i) + x(j)) / 2, 176, label, 'tf-s tf-b')}`;
      out.push(T(x(0) + wb[0] / 2, 176, t('null bitmap'), 'tf-s tf-b'));
      out.push(brace(1, 4, t('offset table')));
      out.push(brace(4, 6, t('fixed part')));
      out.push(brace(6, 8, t('variable part')));
      out.push(strip(b, 20, 194, wb, { names: false }).svg);
      out.push(T(20, 294, t('Bitmap bits: id, name, email, phone, balance (1 = NULL). Offset table: (offset, length).'), 'tf-s', 'start'));
      out.push(T(20, 312, t('Record sizes vary, so the position of record i cannot be computed directly.'), 'tf-t', 'start'));
      return out.join('');
    });
  }

  /* ---- File organizations ---------------------------------------------------------- */

  /* A block of slots in a row (horizontal) or a column (vertical). slot: { text, cls } | null (free). */
  function block(x, y, slots, { sw = 74, sh = 28, vertical = false, label, cls = 'tf-block' } = {}) {
    const out = [];
    const w = vertical ? sw : sw * slots.length;
    const h = vertical ? sh * slots.length : sh;
    out.push(R(x - 3, y - 3, w + 6, h + 6, cls));
    slots.forEach((s, i) => {
      const sx = vertical ? x : x + i * sw;
      const sy = vertical ? y + i * sh : y;
      out.push(R(sx, sy, sw, sh, s ? s.cls || 'tf-box' : 'tf-free'));
      out.push(T(sx + sw / 2, sy + sh / 2 + 4.5, s ? s.text : t('free'), s ? 'tf-m' : 'tf-s'));
    });
    if (label) out.push(T(x - 3, y - 9, label, 'tf-s tf-b', 'start'));
    return out.join('');
  }
  const rec = (text, cls) => ({ text, cls });

  function orgSequential() {
    const alt = t('Sequential organization. Pile file: records stay in arrival order and the new record 25 goes at the end. Sorted file: the new record is added and the file is re-sorted, so 25 ends up between 20 and 30.');
    return wrap(540, 236, alt, () => {
      const nw = (k, n) => rec(`${k} · ${n}`, 'tf-new');
      const out = [];
      out.push(T(20, 18, t('Pile file: each new record goes to the end'), 'tf-t tf-b', 'start'));
      out.push(block(24, 46, [rec('30 · Ana'), rec('10 · Luis'), rec('50 · Eva')], { label: t('Block 1') }));
      out.push(block(276, 46, [rec('20 · Juan'), rec('40 · Sara'), nw(25, 'Pablo')], { label: t('Block 2') }));
      out.push(T(20, 118, t('Sorted file: added at the end, then the whole file is re-sorted'), 'tf-t tf-b', 'start'));
      out.push(block(24, 146, [rec('10 · Luis'), rec('20 · Juan'), nw(25, 'Pablo')], { label: t('Block 1') }));
      out.push(block(276, 146, [rec('30 · Ana'), rec('40 · Sara'), rec('50 · Eva')], { label: t('Block 2') }));
      out.push(T(20, 206, t('Reading in order is fast; finding one key means a full scan (pile)'), 'tf-s', 'start'));
      out.push(T(20, 222, t('or a binary search (sorted). Re-sorting rewrites the whole file.'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  function orgHeap() {
    const alt = t('Heap organization: three blocks with records in no particular order and some free slots. A new record R10 goes into free space at the end of the file. Finding R5 may require reading every block.');
    return wrap(540, 214, alt, (m) => {
      const out = [];
      const blocks = [
        [rec('R7 · Ana'), rec('R2 · Luis'), null],
        [rec('R9 · Eva'), rec('R1 · Juan'), rec('R5 · Sara')],
        [rec('R4 · Pablo'), null, null],
      ];
      const addr = ['0A40', '1F08', '2C10'];
      blocks.forEach((b, i) => out.push(block(24 + i * 172, 74, b, { vertical: true, sw: 150, sh: 28, label: t('Block {n} · address {a}', { n: i + 1, a: addr[i] }) })));
      out.push(R(366, 8, 154, 30, 'tf-new'));
      out.push(T(443, 28, t('INSERT R10 · Marta'), 'tf-m'));
      out.push(P('M520 23 H532 V116 H524', 'tf-line', m.a));
      out.push(T(20, 186, t('No order: a new record goes wherever there is space (usually the end).'), 'tf-s', 'start'));
      out.push(T(20, 202, t('To find R5 the DBMS may have to read every block.'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  function orgHash() {
    const alt = t('Hash organization: h(key) = key mod 4 gives the bucket. Bucket 0 holds 12 and 20, bucket 1 holds 33 and 9 and its overflow block holds 17, bucket 2 holds 26, bucket 3 holds 7 and 15.');
    return wrap(560, 286, alt, (m) => {
      const out = [];
      const buckets = [
        [rec('12 · Ana'), rec('20 · Luis')],
        [rec('33 · Eva'), rec('9 · Juan')],
        [rec('26 · Sara'), null],
        [rec('7 · Pablo'), rec('15 · Marta')],
      ];
      out.push(R(10, 106, 140, 58, 'tf-c5'));
      out.push(TC(80, 135, ['h(key) =', 'key mod 4'], 'tf-m tf-b', 'middle', 16));
      out.push(T(80, 190, t('h(17) = 17 mod 4 = 1'), 'tf-m'));
      buckets.forEach((b, i) => {
        const y = 24 + i * 62;
        out.push(T(180, y + 18, t('Bucket {n}', { n: i }), 'tf-t tf-b', 'start'));
        out.push(block(246, y, b, { sw: 82, sh: 28 }));
        out.push(L(150, 135, 166, y + 14, 'tf-lead'));
        out.push(L(166, y + 14, 172, y + 14, 'tf-line', m.a));
      });
      out.push(block(458, 86, [rec('17 · Raúl', 'tf-new')], { sw: 86, sh: 28, cls: 'tf-block tf-dashed' }));
      out.push(L(412, 100, 452, 100, 'tf-line', m.a));
      out.push(T(500, 136, t('overflow'), 'tf-s tf-b'));
      out.push(T(500, 152, t('(collision)'), 'tf-s'));
      out.push(T(20, 278, t('Direct access: compute h(key) and read one bucket (plus its overflow, if any).'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  function orgClustered() {
    const alt = t('Clustered organization: rows of COURSE and STUDENT share blocks by the cluster key course_id. Block 1: CS101 DBMS with students 100 Jack, 400 Shwetha and 600 Himanshu. Block 2: CS104 OOPS with 200 Raman. Block 3: CS305 OS with 300 Victor and 500 Johnny.');
    return wrap(560, 250, alt, () => {
      const out = [];
      const blocks = [
        ['CS101 · DBMS', ['100 · Jack', '400 · Shwetha', '600 · Himanshu']],
        ['CS104 · OOPS', ['200 · Raman']],
        ['CS305 · OS', ['300 · Victor', '500 · Johnny']],
      ];
      out.push(R(20, 10, 16, 14, 'tf-c3'));
      out.push(T(42, 22, t('COURSE row'), 'tf-s', 'start'));
      out.push(R(160, 10, 16, 14, 'tf-c1'));
      out.push(T(182, 22, t('STUDENT row'), 'tf-s', 'start'));
      blocks.forEach(([c, ss], i) => {
        const x = 24 + i * 178;
        const slots = [rec(c, 'tf-c3'), ...ss.map((s) => rec(s, 'tf-c1'))];
        while (slots.length < 4) slots.push(null);
        out.push(block(x, 62, slots, { vertical: true, sw: 160, sh: 28, label: t('Block {n} · key {k}', { n: i + 1, k: c.split(' ')[0] }) }));
      });
      out.push(T(20, 210, t('Related rows of two tables live in the same block (cluster key course_id):'), 'tf-s', 'start'));
      out.push(T(20, 226, t('the join COURSE ⋈ STUDENT for CS101 reads a single block.'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  function orgIsam() {
    const alt = t('ISAM: a two-level index over a sorted data file. The top index holds 1 and 40; the level-1 index nodes hold 1, 15, 27 and 40, 52, 66; each entry points to one data block. Key 22, inserted after the file was built, sits in the overflow area linked from block 2.');
    return wrap(560, 300, alt, (m) => {
      const out = [];
      const data = [[1, 8, 12], [15, 20, 24], [27, 31, 36], [40, 45, 49], [52, 58, 61], [66, 70, 75]];
      const bx = (i) => 22 + i * 88;
      const node = (cx, y, keys, cw = 30) => {
        const x = cx - (keys.length * cw) / 2;
        return { x, cw, svg: keys.map((k, j) => `${R(x + j * cw, y, cw, 26, 'tf-c2')}${T(x + j * cw + cw / 2, y + 17.5, nf(k), 'tf-m')}`).join('') };
      };
      const l1 = [[1, 15, 27], [40, 52, 66]].map((ks, g) => ({ ks, cx: (bx(g * 3) + bx(g * 3 + 2) + 78) / 2 }));
      const top = node(280, 28, [1, 40], 34);
      out.push(T(20, 46, t('Index (level 2)'), 'tf-s tf-b', 'start'));
      out.push(T(20, 116, t('Index (level 1)'), 'tf-s tf-b', 'start'));
      out.push(top.svg);
      l1.forEach((g, gi) => {
        const n = node(g.cx, 98, g.ks);
        out.push(L(top.x + gi * top.cw + top.cw / 2, 54, g.cx, 96, 'tf-line', m.a));
        out.push(n.svg);
        g.ks.forEach((k, j) => out.push(L(n.x + j * n.cw + n.cw / 2, 124, bx(gi * 3 + j) + 39, 176, 'tf-line', m.a)));
      });
      out.push(T(540, 244, t('Primary area: sorted data blocks'), 'tf-s tf-b', 'end'));
      data.forEach((ks, i) => {
        out.push(block(bx(i), 180, ks.map((k) => rec(nf(k))), { sw: 26, sh: 26 }));
        out.push(T(bx(i) + 39, 226, `B${i + 1}`, 'tf-s'));
      });
      out.push(block(bx(1) + 44, 252, [rec('22', 'tf-new'), null], { sw: 40, sh: 26, cls: 'tf-block tf-dashed' }));
      out.push(L(bx(1) + 70, 209, bx(1) + 70, 246, 'tf-line', m.a));
      out.push(T(bx(1) + 134, 263, t('Overflow area: key 22 was inserted later'), 'tf-s', 'start'));
      out.push(T(bx(1) + 134, 279, t('(the sorted blocks are not rewritten)'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  /* ---- B+ tree ------------------------------------------------------------------- */

  function btree(fig) {
    const key = Number.isFinite(+fig.key) ? +fig.key : 62;
    const leafKeys = [[5, 12], [20, 28], [35, 40], [45, 50], [55, 62], [70, 81]];
    const tree = { keys: [45], kids: [{ keys: [20, 35], kids: [0, 1, 2] }, { keys: [55, 70], kids: [3, 4, 5] }] };
    const pick = (keys) => keys.filter((k) => key >= k).length;
    const c1 = pick(tree.keys);
    const mid = tree.kids[c1];
    const leaf = mid.kids[pick(mid.keys)];
    const found = leafKeys[leaf].includes(key);
    const alt = t('B+ tree with three levels: root 45; internal nodes 20 | 35 and 55 | 70; leaves {leaves}, linked left to right. Search for {key}: root, then node {node}, then the leaf {leaf}.', {
      leaves: leafKeys.map((l) => l.join(', ')).join(' · '), key, node: mid.keys.join(' | '), leaf: leafKeys[leaf].join(', '),
    });
    return wrap(570, 252, alt, (m) => {
      const out = [];
      const lx = (i) => 24 + i * 90;
      const cell = 36;
      const nodeSvg = (x, y, keys, on, hlKey) => keys.map((k, j) => `${R(x + j * cell, y, cell, 28, on ? (k === hlKey ? 'tf-found' : 'tf-hl') : 'tf-c2')}${T(x + j * cell + cell / 2, y + 19, nf(k), 'tf-m')}`).join('');
      const rootX = 285 - cell / 2;
      const midCx = [lx(1) + cell, lx(4) + cell];
      // root → internal
      tree.kids.forEach((n, i) => {
        const on = i === c1;
        out.push(L(rootX + i * cell, 62, midCx[i], 98, on ? 'tf-path' : 'tf-line', on ? m.h : m.a));
        const x = midCx[i] - cell;
        n.kids.forEach((lf, j) => {
          const onLeaf = on && lf === leaf;
          out.push(L(x + j * cell, 128, lx(lf) + cell, 168, onLeaf ? 'tf-path' : 'tf-line', onLeaf ? m.h : m.a));
        });
      });
      out.push(nodeSvg(rootX, 34, tree.keys, true));
      tree.kids.forEach((n, i) => out.push(nodeSvg(midCx[i] - cell, 100, n.keys, i === c1)));
      leafKeys.forEach((ks, i) => {
        out.push(nodeSvg(lx(i), 170, ks, i === leaf, key));
        if (i < leafKeys.length - 1) out.push(L(lx(i) + 2 * cell, 184, lx(i + 1) - 2, 184, 'tf-line', m.a));
      });
      out.push(T(24, 20, t('Search {key}: {steps}', { key: nf(key), steps: `${tree.keys.join('')} → ${mid.keys.join(' | ')} → ${leafKeys[leaf].join(', ')}` }), 'tf-t tf-b', 'start'));
      out.push(T(24, 52, t('Root'), 'tf-s tf-b', 'start'));
      out.push(T(24, 118, t('Internal'), 'tf-s tf-b', 'start'));
      out.push(T(24, 222, t('Leaves: every key, with a pointer to its record; linked in key order for range scans.'), 'tf-s', 'start'));
      out.push(T(24, 240, found ? t('Found after reading 3 nodes (one per level).') : t('Not in the leaf: the key does not exist (3 nodes read).'), 'tf-s', 'start'));
      return out.join('');
    });
  }

  /* ---- Data modelling lifecycle ------------------------------------------------------ */

  function lifecycle() {
    const stages = [
      { l: tl('Semantics / requirements'), cls: 'tf-c5' },
      { l: tl('Conceptual design'), cls: 'tf-c2', model: tl('Conceptual model|ER diagram') },
      { l: tl('Logical design'), cls: 'tf-c2', model: tl('Logical model|relational tables') },
      { l: tl('Physical design'), cls: 'tf-c2', model: tl('Physical model|DBMS, files, indexes') },
      { l: tl('Implementation|DDL, data load'), cls: 'tf-c1' },
      { l: tl('Maintenance and evolution'), cls: 'tf-c3' },
    ];
    const alt = t('Data modelling lifecycle: semantics and requirements, conceptual design (conceptual model, ER), logical design (logical model, tables), physical design (physical model), implementation, and maintenance and evolution, which loops back to the requirements.');
    return wrap(560, 384, alt, (m) => {
      const out = [];
      const x = 86;
      const w = 220;
      const y = (i) => 14 + i * 62;
      stages.forEach((s, i) => {
        out.push(R(x, y(i), w, 40, s.cls));
        out.push(TC(x + w / 2, y(i) + 20, s.l, s.l.length > 1 ? 'tf-t' : 'tf-t tf-b'));
        if (i < stages.length - 1) out.push(L(x + w / 2, y(i) + 40, x + w / 2, y(i + 1) - 2, 'tf-line', m.a));
        if (s.model) {
          out.push(L(x + w, y(i) + 20, 354, y(i) + 20, 'tf-line', m.a));
          out.push(R(356, y(i), 196, 40, 'tf-box'));
          out.push(TC(454, y(i) + 20, s.model, 'tf-t'));
        }
      });
      out.push(T(x + w / 2 + 8, y(1) - 8, t('complex abstraction'), 'tf-s', 'start'));
      const yb = y(5) + 20;
      out.push(P(`M${x} ${yb} H44 V${y(0) + 20} H${x - 2}`, 'tf-path', m.h));
      out.push(vText(30, (y(0) + yb) / 2, t('New requirements: the cycle starts again')));
      return out.join('');
    });
  }

  /* ---- Dispatcher ------------------------------------------------------------------ */

  function svg(figure) {
    if (!figure) return '';
    const f = typeof figure === 'string' ? { kind: figure } : figure;
    switch (f.kind || f.type) {
      case 'pyramid': return pyramid();
      case 'files-vs-db': return filesVsDb();
      case 'dbms-architecture': return dbmsArchitecture();
      case 'ansi-sparc': return ansiSparc();
      case 'storage-hierarchy': return storageHierarchy();
      case 'record-layout': return recordLayout(f.variant);
      case 'file-organization':
        switch (f.org) {
          case 'heap': return orgHeap();
          case 'hash': return orgHash();
          case 'clustered': return orgClustered();
          case 'isam': return orgIsam();
          default: return orgSequential();
        }
      case 'btree': return btree(f);
      case 'lifecycle': return lifecycle();
      default:
        console.warn(`[theory] unknown figure kind: ${f.kind || f.type}`);
        return '';
    }
  }

  return { svg };
})();
