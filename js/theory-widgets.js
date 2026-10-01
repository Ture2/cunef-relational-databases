'use strict';

/* ==========================================================================
   Interactive examples for the Theory cards. html(name) returns the widget;
   the section forwards delegated events: onClick(el) for elements with a
   data-action starting with "w-", onInput(e) and onChange(e) for raw events.
   Each widget lives in [data-widget="name"]: clicks re-render its body (focus
   kept through data-fid), slider/number input only re-renders its outputs so
   dragging is not interrupted. Results are announced in the widget's own
   aria-live region. State is module-level (resets on reload).

   access-time    Ts = α + β·b, HDD vs SSD (worked example of the notes).
   index-search   block reads to find one record: scan, binary search, B+ tree.
   acid-transfer  atomicity / durability with a log, and isolation (lost update).
   files-vs-db    the same employee in two files vs one shared table.
   ========================================================================== */

const TheoryWidgets = (() => {
  const loc = () => (LANG === 'es' ? 'es-ES' : 'en-GB');
  const num = (n, max = 2, min = 0) => Number(n).toLocaleString(loc(), { maximumFractionDigits: max, minimumFractionDigits: min });
  /* n rounded to `sig` significant digits (for very small times). */
  const sig = (n, s = 3) => {
    if (!n) return num(0);
    const d = Math.max(0, s - 1 - Math.floor(Math.log10(Math.abs(n))));
    return num(Number(n.toFixed(Math.min(d, 12))), Math.min(d, 12));
  };
  const euro = (n) => t('€{n}', { n: num(n) });
  /* A time in ms, in readable units. */
  function time(ms) {
    if (ms < 1) return t('{n} ms', { n: sig(ms, 3) });
    if (ms < 1000) return t('{n} ms', { n: num(ms, ms < 100 ? 3 : 1) });
    const s = ms / 1000;
    if (s < 120) return t('{n} s', { n: num(s, 2) });
    if (s < 7200) return t('{n} s ({m} min)', { n: num(s, 1), m: num(s / 60, 1) });
    return t('{n} s ({h} h)', { n: num(s, 0), h: num(s / 3600, 1) });
  }
  const times = (r) => (r >= 10 ? num(r, 0) : num(r, 1));

  const $w = (name) => document.querySelector(`[data-widget="${name}"]`);
  const say = (name, text) => { const el = $w(name)?.querySelector('[data-live]'); if (el) el.textContent = text; };

  /* Re-renders the body of a widget, keeping focus on the control that had it. */
  function refresh(name) {
    const box = $w(name);
    if (!box) return;
    const body = box.querySelector('[data-body]');
    keepFocus(() => { body.innerHTML = BODY[name](); });
    say(name, LIVE[name] ? LIVE[name]() : '');
  }
  function refreshOut(name) {
    const out = $w(name)?.querySelector('[data-out]');
    if (out) out.innerHTML = OUT[name]();
    say(name, LIVE[name] ? LIVE[name]() : '');
  }

  const seg = (label, action, items, current, fidBase) => `<div class="tw-seg" role="group" aria-label="${esc(label)}">${items.map(([v, txt]) =>
    `<button type="button" class="tw-segbtn" data-action="${action}" data-v="${esc(v)}" data-fid="${fidBase}-${esc(v)}" aria-pressed="${v === current}">${esc(txt)}</button>`).join('')}</div>`;
  const btn = (action, label, { fid = action, ghost = false, disabled = false, extra = '' } = {}) =>
    `<button type="button" class="btn${ghost ? ' ghost' : ''}" data-action="${action}" data-fid="${fid}"${disabled ? ' disabled' : ''} ${extra}>${esc(label)}</button>`;
  const bar = (label, value, frac, cls, note = '') => `<div class="tw-barrow">
      <span class="tw-barlabel">${esc(label)}</span>
      <span class="tw-track" aria-hidden="true"><span class="tw-fill ${cls}" style="width:${Math.max(0.6, Math.min(100, frac * 100)).toFixed(2)}%"></span></span>
      <span class="tw-barval">${esc(value)}${note ? ` <span class="muted small">${esc(note)}</span>` : ''}</span>
    </div>`;

  /* ======================================================================
     1. Access time: Ts = α + β·b
     ====================================================================== */

  /* α in ms, rate in MB/s, b in MB (1 KB = 0.001 MB, as in the notes). */
  const PRESETS = {
    example: { hdd: { a: 10, rate: 80 }, ssd: { a: 0.05, rate: 300 }, kb: 2 },   // "Worked example: HDD vs SSD"
    slides: { hdd: { a: 8, rate: 100 }, ssd: { a: 0.1, rate: 500 }, kb: 4 },     // the HDD / SSD slides
  };
  const acc = { preset: 'example', n: 1, pattern: 'random', qph: 100000 };
  const N_MAX = 1000000;

  function accCalc() {
    const p = PRESETS[acc.preset];
    const b = p.kb / 1000;
    const one = (d) => {
      const beta = 1000 / d.rate;                     // ms per MB
      const single = d.a + beta * b;                   // one block
      const total = acc.pattern === 'seq' ? d.a + beta * b * acc.n : acc.n * single;
      return { ...d, beta, single, total, tb: beta * b };
    };
    return { p, b, hdd: one(p.hdd), ssd: one(p.ssd) };
  }

  function accFormula(d, label, b) {
    const n = acc.n;
    const head = `<strong>${esc(label)}</strong> α = ${esc(num(d.a, 3))} ms, β = 1 / ${esc(num(d.rate))} MB/s = ${esc(sig(d.beta, 4))} ms/MB`;
    let line;
    if (acc.pattern === 'seq') {
      line = `T = α + β·(n·b) = ${esc(num(d.a, 3))} + ${esc(sig(d.beta, 4))} × (${esc(num(n))} × ${esc(num(b, 3))}) = ${esc(num(d.a, 3))} + ${esc(sig(d.beta * b * n, 4))} = <strong>${esc(time(d.total))}</strong>`;
    } else {
      line = `T = n·(α + β·b) = ${esc(num(n))} × (${esc(num(d.a, 3))} + ${esc(sig(d.tb, 3))}) = ${esc(num(n))} × ${esc(sig(d.single, 5))} = <strong>${esc(time(d.total))}</strong>`;
    }
    return `<p class="tw-formula">${head}<br>${line}</p>`;
  }

  function accOut() {
    const c = accCalc();
    const max = Math.max(c.hdd.total, c.ssd.total);
    const ratio = c.hdd.total / c.ssd.total;
    const loadRow = (label, d) => {
      const busy = acc.qph * d.single;               // ms of disk time per hour
      const pct = (busy / 3600000) * 100;
      return `<tr><th scope="row">${esc(label)}</th><td>${esc(num(acc.qph))} × ${esc(sig(d.single, 5))} ms = ${esc(time(busy))}</td><td class="${pct <= 100 ? 'is-ok' : 'is-bad'}">${esc(t('{p}% of the hour', { p: num(pct, pct < 1 ? 3 : 2) }))} · ${esc(pct <= 100 ? t('feasible') : t('not feasible'))}</td></tr>`;
    };
    return `
      ${accFormula(c.hdd, 'HDD', c.b)}
      ${accFormula(c.ssd, 'SSD', c.b)}
      <div class="tw-bars">
        ${bar('HDD', time(c.hdd.total), c.hdd.total / max, 'is-c3')}
        ${bar('SSD', time(c.ssd.total), c.ssd.total / max, 'is-c1')}
      </div>
      <p class="tw-result">${esc(t('SSD is ×{r} faster here.', { r: times(ratio) }))} ${esc(acc.pattern === 'seq'
        ? t('One long sequential read pays α once, so the transfer rate dominates as n grows.')
        : t('Each random read pays the seek time α again, which dominates on the HDD.'))}</p>
      <h4 class="tw-h4">${esc(t('Load check (question 2 of the worked example)'))}</h4>
      <p class="tw-row">
        <label class="tw-lab" for="w-acc-q">${esc(t('Queries per hour, one random record each'))}</label>
        <input id="w-acc-q" class="tw-num" type="number" min="1" max="100000000" step="1000" value="${acc.qph}" data-w="acc-q" data-fid="w-acc-q-n">
      </p>
      <div class="scroll"><table class="tw-table"><tbody>${loadRow('HDD', c.hdd)}${loadRow('SSD', c.ssd)}</tbody></table></div>
      ${acc.preset === 'example' ? `<p class="small muted">${esc(t('The notes round the times to 10 ms and 0.05 ms, which gives 1,000 s (27.78%) and 5 s (0.14%) for 100,000 queries. Note that β·b = 0.000025 s = 0.025 ms for the HDD and 0.0000067 s ≈ 0.0067 ms for the SSD.'))}</p>` : ''}`;
  }

  const accBody = () => {
    const p = PRESETS[acc.preset];
    return `
      <div class="tw-ctl">
        <div class="tw-field"><span class="tw-lab" id="w-acc-pl">${esc(t('Disk figures'))}</span>
          ${seg(t('Disk figures'), 'w-acc-preset', [['example', t('Worked example')], ['slides', t('Slides')]], acc.preset, 'w-acc-p')}
          <span class="small muted">${esc(t('HDD α = {ha} ms, {hr} MB/s · SSD α = {sa} ms, {sr} MB/s · block b = {kb} KB', { ha: num(p.hdd.a, 3), hr: num(p.hdd.rate), sa: num(p.ssd.a, 3), sr: num(p.ssd.rate), kb: p.kb }))}</span>
        </div>
        <div class="tw-field"><span class="tw-lab">${esc(t('Access pattern'))}</span>
          ${seg(t('Access pattern'), 'w-acc-pattern', [['random', t('n random reads')], ['seq', t('One sequential read of n blocks')]], acc.pattern, 'w-acc-pt')}
        </div>
        <div class="tw-field">
          <label class="tw-lab" for="w-acc-n">${esc(t('Number of blocks n'))}</label>
          <div class="tw-row">
            <input id="w-acc-n" class="tw-range" type="range" min="1" max="1000" step="1" value="${Math.min(acc.n, 1000)}" data-w="acc-n" data-fid="w-acc-n-r" aria-describedby="w-acc-nhint">
            <input class="tw-num" type="number" min="1" max="${N_MAX}" step="1" value="${acc.n}" data-w="acc-n" data-fid="w-acc-n-n" aria-label="${esc(t('Number of blocks n'))}">
          </div>
          <span id="w-acc-nhint" class="small muted">${esc(t('The slider goes to 1,000; type up to 1,000,000.'))}</span>
        </div>
      </div>
      <div data-out>${accOut()}</div>`;
  };
  const accLive = () => {
    const c = accCalc();
    return t('HDD {h}, SSD {s}. SSD is ×{r} faster.', { h: time(c.hdd.total), s: time(c.ssd.total), r: times(c.hdd.total / c.ssd.total) });
  };

  /* ======================================================================
     2. Index search: block reads to find one record
     ====================================================================== */

  const N_STEPS = [1e3, 2e3, 5e3, 1e4, 2e4, 5e4, 1e5, 2e5, 5e5, 1e6, 2e6, 5e6, 1e7];
  const idx = { i: 9, rpb: 20, f: 100, step: 0 };

  function idxCalc() {
    const N = N_STEPS[idx.i];
    const B = Math.ceil(N / idx.rpb);
    let h = 1;
    let cap = idx.f;
    while (cap < N) { cap *= idx.f; h++; }           // h = ⌈log_f N⌉ without floating-point surprises
    const key = Math.max(1, Math.round(N * 0.62) + 7);
    // Path: level L (0 = root) covers ranges of f^(h−L) keys.
    const path = [];
    for (let L = 0; L < h; L++) {
      const size = idx.f ** (h - L);
      const child = size / idx.f;
      const start = Math.floor((key - 1) / size) * size + 1;
      const end = Math.min(N, start + size - 1);
      const j = Math.floor((key - start) / child);
      path.push({ L, start, end, j });
    }
    return { N, B, h, key, path, scanAvg: Math.ceil(B / 2), scanMax: B, bin: Math.ceil(Math.log2(Math.max(2, B))), binRec: Math.ceil(Math.log2(N)), tree: h };
  }

  function idxTreeSvg(c) {
    const rows = c.h;
    const rh = 46;
    const W = 340;
    const H = rows * rh + 8;
    const out = [];
    const nodeCls = (k) => (idx.step === k + 1 ? 'tw-node is-on' : idx.step > k ? 'tw-node is-done' : 'tw-node');
    for (let r = 0; r < rows; r++) {
      const y = 6 + r * rh;
      const isLeaf = r === c.h - 1;
      const on = idx.step >= r + 1;
      if (r > 0) out.push(`<line class="${on ? 'tw-edge is-on' : 'tw-edge'}" x1="170" y1="${y - 14}" x2="170" y2="${y}"/>`);
      if (r > 0) {
        out.push(`<rect class="tw-ghost" x="18" y="${y}" width="70" height="30" rx="2"/><text class="tw-svgt" x="53" y="${y + 20}" text-anchor="middle">…</text>`);
        out.push(`<rect class="tw-ghost" x="252" y="${y}" width="70" height="30" rx="2"/><text class="tw-svgt" x="287" y="${y + 20}" text-anchor="middle">…</text>`);
      }
      const p = c.path[r];
      const label = r === 0 && !isLeaf ? t('root: {a}–{b}', { a: num(p.start), b: num(p.end) })
        : isLeaf ? t('leaf: {a}–{b}', { a: num(p.start), b: num(p.end) })
          : t('level {l}: {a}–{b}', { l: r + 1, a: num(p.start), b: num(p.end) });
      out.push(`<rect class="${nodeCls(r)}${isLeaf ? ' is-data' : ''}" x="96" y="${y}" width="148" height="30" rx="2"/>`);
      out.push(`<text class="tw-svgt" x="170" y="${y + 20}" text-anchor="middle">${esc(label)}</text>`);
    }
    return `<svg class="tw-tree" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" role="img" aria-label="${esc(t('B+ tree search path for key {k}: {n} levels from the root to the leaf.', { k: num(c.key), n: c.h }))}"><title>${esc(t('B+ tree search path'))}</title>${out.join('')}</svg>`;
  }

  function idxStepText(c) {
    if (!idx.step) return t('Press “Step” to follow the search for key {k} from the root.', { k: num(c.key) });
    const p = c.path[idx.step - 1];
    return idx.step === c.h
      ? t('Read {r} of {t}: leaf with keys {a}–{b}; key {k} is entry {j}, and the leaf holds its record. Done.', { r: idx.step, t: c.tree, a: num(p.start), b: num(p.end), k: num(c.key), j: num(p.j + 1) })
      : t('Read {r} of {t}: node covering keys {a}–{b}; follow pointer {j} of {f}.', { r: idx.step, t: c.tree, a: num(p.start), b: num(p.end), j: num(p.j + 1), f: num(idx.f) });
  }

  function idxOut() {
    const c = idxCalc();
    const lg = (v) => Math.log10(v + 1);
    const max = lg(c.scanMax);
    const items = [
      [t('Full scan, worst case'), c.scanMax, 'is-c3', t('= N blocks')],
      [t('Full scan, on average'), c.scanAvg, 'is-c5', t('≈ blocks / 2')],
      [t('Binary search (sorted file)'), c.bin, 'is-c6', t('= ⌈log₂ blocks⌉')],
      [t('B+ tree'), c.tree, 'is-c1', t('= ⌈log_f N⌉')],
    ];
    return `
      <p class="tw-formula">${esc(t('N = {N} records, {r} per block → {B} blocks.', { N: num(c.N), r: num(idx.rpb), B: num(c.B) }))}<br>
        ${esc(t('Binary search: ⌈log₂ {B}⌉ = {v} block reads (⌈log₂ N⌉ = {r} if you count records).', { B: num(c.B), v: num(c.bin), r: num(c.binRec) }))}<br>
        ${esc(t('B+ tree: ⌈log_{f} {N}⌉ = {v} reads, one node per level from the root to the leaf, which holds the record.', { f: num(idx.f), N: num(c.N), v: c.tree }))}</p>
      <p class="small muted">${esc(t('If the leaves only store the address of the record (a secondary index), add 1 read for the data block.'))}</p>
      <div class="tw-bars">${items.map(([l, v, cls, note]) => bar(l, t('{n} reads', { n: num(v) }), lg(v) / max, cls, note)).join('')}</div>
      <p class="small muted">${esc(t('Bars use a logarithmic scale: otherwise the index bars would be invisible.'))}</p>
      <p class="tw-result">${esc(t('The B+ tree needs {x}× fewer reads than an average scan.', { x: num(Math.round(c.scanAvg / c.tree)) }))}</p>
      <div class="tw-stepper">
        <div class="tw-steptree">${idxTreeSvg(c)}</div>
        <div>
          <p class="tw-steptext">${esc(idxStepText(c))}</p>
          <p class="tw-actions">${btn('w-idx-step', idx.step >= c.h ? t('Start again') : t('Step'), { fid: 'w-idx-step' })}</p>
        </div>
      </div>`;
  }

  const idxBody = () => `
      <div class="tw-ctl">
        <div class="tw-field">
          <label class="tw-lab" for="w-idx-n">${esc(t('Records N'))}: <strong data-idx-n>${esc(num(N_STEPS[idx.i]))}</strong></label>
          <input id="w-idx-n" class="tw-range" type="range" min="0" max="${N_STEPS.length - 1}" step="1" value="${idx.i}" data-w="idx-n" data-fid="w-idx-n" aria-valuetext="${esc(num(N_STEPS[idx.i]))}">
        </div>
        <div class="tw-row">
          <div class="tw-field"><label class="tw-lab" for="w-idx-r">${esc(t('Records per block'))}</label>
            <select id="w-idx-r" class="tw-select" data-w="idx-r" data-fid="w-idx-r">${[10, 20, 50, 100].map((v) => `<option value="${v}"${v === idx.rpb ? ' selected' : ''}>${num(v)}</option>`).join('')}</select></div>
          <div class="tw-field"><label class="tw-lab" for="w-idx-f">${esc(t('B+ tree fan-out f'))}</label>
            <select id="w-idx-f" class="tw-select" data-w="idx-f" data-fid="w-idx-f">${[10, 50, 100, 200].map((v) => `<option value="${v}"${v === idx.f ? ' selected' : ''}>${num(v)}</option>`).join('')}</select></div>
        </div>
      </div>
      <div data-out>${idxOut()}</div>`;
  const idxLive = () => {
    const c = idxCalc();
    return idx.step ? idxStepText(c) : t('{N} records: scan {s} reads on average, binary search {b}, B+ tree {t}.', { N: num(c.N), s: num(c.scanAvg), b: num(c.bin), t: num(c.tree) });
  };

  /* ======================================================================
     3. ACID: a bank transfer with a log, and two concurrent withdrawals
     ====================================================================== */

  const acid = { tab: 'atom', run: null, iso: 'none', isoStep: 0 };

  /* Rows: { op, a, b, log, kind } — balances as seen on recovery / on disk. */
  function atomRows(run) {
    const L = (s) => s;
    const rows = [
      { op: 'BEGIN TRANSACTION', a: 500, b: 200, log: L('<T1, BEGIN>') },
      { op: "UPDATE cuentas SET saldo = saldo - 100 WHERE id = 'A'", a: 400, b: 200, log: L('<T1, A, 500 → 400>') },
    ];
    if (run === 'crash-debit') {
      rows.push({ op: t('CRASH: power failure before the credit'), a: 400, b: 200, log: '', kind: 'bad' });
      rows.push({ op: t('RECOVERY: T1 has no COMMIT in the log → UNDO, A takes its old value 500'), a: 500, b: 200, log: L('<T1, ABORT>'), kind: 'ok' });
      return rows;
    }
    rows.push({ op: "UPDATE cuentas SET saldo = saldo + 100 WHERE id = 'B'", a: 400, b: 300, log: L('<T1, B, 200 → 300>') });
    rows.push({ op: 'COMMIT', a: 400, b: 300, log: L('<T1, COMMIT>'), kind: 'ok', note: t('the log is written to disk before COMMIT returns') });
    if (run === 'crash-commit') {
      rows.push({ op: t('CRASH right after COMMIT: the new balances were still only in memory'), a: 500, b: 200, log: '', kind: 'bad', note: t('balances on disk') });
      rows.push({ op: t('RECOVERY: T1 has COMMIT in the log → REDO, A = 400 and B = 300'), a: 400, b: 300, log: '', kind: 'ok' });
    }
    return rows;
  }

  function atomPanel() {
    const rows = acid.run ? atomRows(acid.run) : [];
    const last = rows.length ? rows[rows.length - 1] : { a: 500, b: 200 };
    const sum = last.a + last.b;
    const okSum = sum === 700;
    const verdict = !acid.run ? t('Choose what happens to the transfer of €100 from A to B.')
      : acid.run === 'run' ? t('Committed: A = {a}, B = {b}. All or nothing: here, all.', { a: euro(400), b: euro(300) })
        : acid.run === 'crash-debit' ? t('Atomicity: the half-done transfer was undone with the log. A = {a}, B = {b}, as before it started.', { a: euro(500), b: euro(200) })
          : t('Durability: the committed transfer was redone from the log. A = {a}, B = {b}.', { a: euro(400), b: euro(300) });
    return `
      <div class="tw-accounts">
        <div class="tw-acct"><span>${esc(t('Account A'))}</span><strong>${esc(euro(last.a))}</strong></div>
        <div class="tw-acct"><span>${esc(t('Account B'))}</span><strong>${esc(euro(last.b))}</strong></div>
        <div class="tw-acct ${okSum ? 'is-ok' : 'is-bad'}"><span>${esc(t('Consistency check A + B'))}</span><strong>${esc(euro(sum))} ${okSum ? '✓' : '✗'}</strong></div>
      </div>
      <p class="tw-actions">
        ${btn('w-acid-run', t('Run'), { fid: 'w-acid-run' })}
        ${btn('w-acid-crash', t('Crash after debit'), { fid: 'w-acid-crash', ghost: true })}
        ${btn('w-acid-crash2', t('Crash after COMMIT'), { fid: 'w-acid-crash2', ghost: true })}
        ${btn('w-acid-reset', t('Reset'), { fid: 'w-acid-reset', ghost: true, disabled: !acid.run })}
      </p>
      ${rows.length ? `<div class="scroll"><table class="tw-table tw-timeline">
        <caption>${esc(t('Timeline of T1 and the log'))}</caption>
        <thead><tr><th scope="col">#</th><th scope="col">${esc(t('Operation'))}</th><th scope="col">A</th><th scope="col">B</th><th scope="col">A + B</th><th scope="col">${esc(t('Log entry'))}</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr class="${r.kind ? `is-${r.kind}` : ''}"><td>${i + 1}</td><td>${r.kind ? esc(r.op) : `<code>${esc(r.op)}</code>`}${r.note ? `<br><span class="small">${esc(r.note)}</span>` : ''}</td><td>${esc(num(r.a))}</td><td>${esc(num(r.b))}</td><td>${esc(num(r.a + r.b))}${r.a + r.b === 700 ? '' : r.kind === 'bad' ? ' ✗' : `<br><span class="small">${esc(t('in progress'))}</span>`}</td><td><code>${esc(r.log)}</code></td></tr>`).join('')}</tbody>
      </table></div>` : ''}
      <p class="tw-result">${esc(verdict)}</p>`;
  }

  const ISO = {
    none: [
      { t1: t('read A → 500'), t2: '', a: 500 },
      { t1: '', t2: t('read A → 500'), a: 500 },
      { t1: t('write A = 500 − 100 = 400; COMMIT'), t2: '', a: 400 },
      { t1: '', t2: t('write A = 500 − 50 = 450; COMMIT'), a: 450, bad: true },
    ],
    lock: [
      { t1: t('lock A; read A → 500'), t2: '', a: 500 },
      { t1: '', t2: t('lock A → waits for T1'), a: 500, wait: true },
      { t1: t('write A = 500 − 100 = 400; COMMIT, unlock A'), t2: t('(waiting)'), a: 400 },
      { t1: '', t2: t('gets the lock; read A → 400'), a: 400 },
      { t1: '', t2: t('write A = 400 − 50 = 350; COMMIT, unlock A'), a: 350, good: true },
    ],
  };

  function isoPanel() {
    const steps = ISO[acid.iso];
    const shown = steps.slice(0, acid.isoStep);
    const done = acid.isoStep >= steps.length;
    const a = shown.length ? shown[shown.length - 1].a : 500;
    const verdict = !done ? t('Start: A = {a}. T1 withdraws {x} and T2 withdraws {y} at the same time.', { a: euro(500), x: euro(100), y: euro(50) })
      : acid.iso === 'none' ? t('Lost update: final A = {a}, but it should be {b}. T2 overwrote T1’s write because it had read A before T1 wrote it.', { a: euro(450), b: euro(350) })
        : t('Isolated: final A = {a}, the same as running T1 and then T2 (serializable).', { a: euro(350) });
    return `
      ${seg(t('Concurrency control'), 'w-iso-mode', [['none', t('No isolation')], ['lock', t('With locks (serializable)')]], acid.iso, 'w-iso-m')}
      <div class="scroll"><table class="tw-table tw-timeline">
        <caption>${esc(t('Interleaving of two withdrawals from account A'))}</caption>
        <thead><tr><th scope="col">${esc(t('Step'))}</th><th scope="col">${esc(t('T1: withdraw {x}', { x: euro(100) }))}</th><th scope="col">${esc(t('T2: withdraw {x}', { x: euro(50) }))}</th><th scope="col">${esc(t('A in the database'))}</th></tr></thead>
        <tbody>${steps.map((s, i) => (i < acid.isoStep
          ? `<tr class="${s.bad ? 'is-bad' : s.good ? 'is-ok' : ''}${i === acid.isoStep - 1 ? ' is-current' : ''}"><td>${i + 1}</td><td>${esc(s.t1)}</td><td>${esc(s.t2)}</td><td>${esc(euro(s.a))}</td></tr>`
          : `<tr class="is-future"><td>${i + 1}</td><td></td><td></td><td></td></tr>`)).join('')}</tbody>
      </table></div>
      <div class="tw-accounts"><div class="tw-acct ${done ? (acid.iso === 'none' ? 'is-bad' : 'is-ok') : ''}"><span>${esc(t('Account A'))}</span><strong>${esc(euro(a))}</strong></div></div>
      <p class="tw-actions">
        ${btn('w-iso-next', t('Next step'), { fid: 'w-iso-next', disabled: done })}
        ${btn('w-iso-reset', t('Reset'), { fid: 'w-iso-reset', ghost: true, disabled: !acid.isoStep })}
      </p>
      <p class="tw-result">${esc(verdict)}</p>`;
  }

  const acidBody = () => `
      ${seg(t('Property'), 'w-acid-tab', [['atom', t('Atomicity and durability')], ['iso', t('Isolation')]], acid.tab, 'w-acid-t')}
      <div class="tw-panel">${acid.tab === 'atom' ? atomPanel() : isoPanel()}</div>`;
  const acidLive = () => {
    if (acid.tab === 'atom') {
      if (!acid.run) return '';
      const rows = atomRows(acid.run);
      const r = rows[rows.length - 1];
      return t('A = {a}, B = {b}, A + B = {s}.', { a: euro(r.a), b: euro(r.b), s: euro(r.a + r.b) });
    }
    const steps = ISO[acid.iso];
    if (!acid.isoStep) return '';
    const s = steps[acid.isoStep - 1];
    const who = s.t1 ? `T1: ${s.t1}` : `T2: ${s.t2}`;
    return `${t('Step {n}', { n: acid.isoStep })}. ${who}. ${t('A = {a}.', { a: euro(s.a) })}`;
  };

  /* ======================================================================
     4. Files vs database: one address stored twice or once
     ====================================================================== */

  const ADDR0 = 'C/ Mayor 3, Madrid';
  const fdb = { mode: 'files', payroll: ADDR0, hr: ADDR0, db: ADDR0, draft: '', last: null, error: false };

  function fdbTable(caption, cols, row, hlCol, hlCls) {
    return `<div class="tw-file"><div class="scroll"><table class="tw-table">
      <caption>${caption}</caption>
      <thead><tr>${cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
      <tbody><tr>${row.map((v, i) => `<td class="${i === hlCol ? hlCls : ''}">${esc(v)}</td>`).join('')}</tr></tbody>
    </table></div></div>`;
  }

  function fdbBody() {
    const files = fdb.mode === 'files';
    const differ = fdb.payroll !== fdb.hr;
    const input = `<div class="tw-field">
        <label class="tw-lab" for="w-fdb-in">${esc(t('New address for Ana López'))}</label>
        <input id="w-fdb-in" class="tw-text" type="text" autocomplete="off" value="${esc(fdb.draft)}" placeholder="${esc(t('e.g. Calle Almansa 101, Madrid'))}" data-w="fdb-in" data-fid="w-fdb-in"${fdb.error ? ' aria-invalid="true" aria-describedby="w-fdb-err"' : ''}>
        ${fdb.error ? `<span id="w-fdb-err" class="tw-err">${esc(t('Type an address first.'))}</span>` : ''}
      </div>`;
    let body;
    if (files) {
      const hl = (which) => (differ ? 'is-bad' : fdb.last === which ? 'is-ok' : 'is-dup');
      body = `
        ${input}
        <p class="tw-actions">
          ${btn('w-fdb-save', t('Save in Payroll'), { fid: 'w-fdb-save-payroll', extra: 'data-v="payroll"' })}
          ${btn('w-fdb-save', t('Save in HR'), { fid: 'w-fdb-save-hr', extra: 'data-v="hr"' })}
        </p>
        <div class="tw-files">
          ${fdbTable(`<span class="tw-tag">${esc(t('Payroll app'))}</span> payroll.xlsx`, [t('Employee'), t('Address'), t('Salary')], ['Ana López', fdb.payroll, euro(2100)], 1, hl('payroll'))}
          ${fdbTable(`<span class="tw-tag">${esc(t('HR app'))}</span> staff.csv`, [t('Employee'), t('Address'), t('Department')], ['Ana López', fdb.hr, t('Marketing')], 1, hl('hr'))}
        </div>
        <p class="tw-result ${differ ? 'is-bad' : ''}">${esc(differ
          ? t('Inconsistent: Payroll says “{p}” and HR says “{h}”. Which one is right? Nothing in the files can tell.', { p: fdb.payroll, h: fdb.hr })
          : t('The two files agree, for now: each change has to be made twice, by hand.'))}</p>
        <p class="small">${esc(t('Duplicated values: {n} (the name and the address are stored in both files).', { n: 2 }))}</p>`;
    } else {
      const hl = fdb.last ? 'is-ok' : '';
      body = `
        ${input}
        <p class="tw-actions">
          ${btn('w-fdb-save', t('Save from the Payroll app'), { fid: 'w-fdb-save-payroll', extra: 'data-v="payroll"' })}
          ${btn('w-fdb-save', t('Save from the HR app'), { fid: 'w-fdb-save-hr', extra: 'data-v="hr"' })}
        </p>
        ${fdbTable(`<span class="tw-tag">${esc(t('DBMS'))}</span> ${esc(t('EMPLOYEE table, stored once'))}`, ['id', t('Employee'), t('Address'), t('Department'), t('Salary')], ['E07', 'Ana López', fdb.db, t('Marketing'), euro(2100)], 2, hl)}
        <div class="tw-files">
          ${fdbTable(`<span class="tw-tag">${esc(t('Payroll app'))}</span> ${esc(t('its view'))}`, [t('Employee'), t('Address'), t('Salary')], ['Ana López', fdb.db, euro(2100)], 1, hl)}
          ${fdbTable(`<span class="tw-tag">${esc(t('HR app'))}</span> ${esc(t('its view'))}`, [t('Employee'), t('Address'), t('Department')], ['Ana López', fdb.db, t('Marketing')], 1, hl)}
        </div>
        <p class="tw-result is-ok">${esc(t('Consistent: both applications read the same row through the DBMS, so one change updates both views.'))}</p>
        <p class="small">${esc(t('Duplicated values: {n}.', { n: 0 }))}</p>`;
    }
    return `
      <p class="tw-actions">
        <button type="button" class="tw-switch" role="switch" aria-checked="${!files}" data-action="w-fdb-mode" data-fid="w-fdb-mode"><span class="tw-switch-ui" aria-hidden="true"></span>${esc(t('Use a database'))}</button>
        ${btn('w-fdb-reset', t('Reset'), { fid: 'w-fdb-reset', ghost: true })}
      </p>
      ${body}`;
  }
  const fdbLive = () => {
    if (fdb.mode === 'files') {
      return fdb.payroll !== fdb.hr
        ? t('Inconsistent: Payroll says “{p}” and HR says “{h}”.', { p: fdb.payroll, h: fdb.hr })
        : t('Both files have “{a}”.', { a: fdb.payroll });
    }
    return t('Both views show “{a}”.', { a: fdb.db });
  };

  /* ======================================================================
     Wiring
     ====================================================================== */

  const TITLE = {
    'access-time': () => t('Try it: access time T = α + β·b'),
    'index-search': () => t('Try it: how many block reads to find one record?'),
    'acid-transfer': () => t('Try it: a transfer and two withdrawals'),
    'files-vs-db': () => t('Try it: change Ana López’s address'),
  };
  const BODY = { 'access-time': accBody, 'index-search': idxBody, 'acid-transfer': acidBody, 'files-vs-db': fdbBody };
  const OUT = { 'access-time': accOut, 'index-search': idxOut };
  const LIVE = { 'access-time': accLive, 'index-search': idxLive, 'acid-transfer': acidLive, 'files-vs-db': fdbLive };

  function html(name) {
    if (!BODY[name]) {
      console.warn(`[theory] unknown widget: ${name}`);
      return '';
    }
    return `<section class="tw" data-widget="${esc(name)}" aria-labelledby="tw-${esc(name)}-h">
        <h3 class="tw-title" id="tw-${esc(name)}-h">${esc(TITLE[name]())}</h3>
        <div data-body>${BODY[name]()}</div>
        <p class="sr-only" aria-live="polite" data-live></p>
      </section>`;
  }

  function onClick(el) {
    const a = el.dataset.action || '';
    if (!a.startsWith('w-')) return;
    const v = el.dataset.v;
    switch (a) {
      case 'w-acc-preset': acc.preset = v; refresh('access-time'); break;
      case 'w-acc-pattern': acc.pattern = v; refresh('access-time'); break;
      case 'w-idx-step': {
        const c = idxCalc();
        idx.step = idx.step >= c.h ? 0 : idx.step + 1;
        refreshOut('index-search');
        $w('index-search')?.querySelector('[data-fid="w-idx-step"]')?.focus({ preventScroll: true });
        break;
      }
      case 'w-acid-tab': acid.tab = v; refresh('acid-transfer'); break;
      case 'w-acid-run': acid.run = 'run'; refresh('acid-transfer'); break;
      case 'w-acid-crash': acid.run = 'crash-debit'; refresh('acid-transfer'); break;
      case 'w-acid-crash2': acid.run = 'crash-commit'; refresh('acid-transfer'); break;
      case 'w-acid-reset':
        acid.run = null; refresh('acid-transfer');
        $w('acid-transfer')?.querySelector('[data-fid="w-acid-run"]')?.focus({ preventScroll: true });
        break;
      case 'w-iso-mode': acid.iso = v; acid.isoStep = 0; refresh('acid-transfer'); break;
      case 'w-iso-next':
        acid.isoStep = Math.min(ISO[acid.iso].length, acid.isoStep + 1);
        refresh('acid-transfer');
        if (acid.isoStep >= ISO[acid.iso].length) $w('acid-transfer')?.querySelector('[data-fid="w-iso-reset"]')?.focus({ preventScroll: true });
        break;
      case 'w-iso-reset':
        acid.isoStep = 0; refresh('acid-transfer');
        $w('acid-transfer')?.querySelector('[data-fid="w-iso-next"]')?.focus({ preventScroll: true });
        break;
      case 'w-fdb-mode': fdb.mode = fdb.mode === 'files' ? 'db' : 'files'; fdb.last = null; fdb.error = false; refresh('files-vs-db'); break;
      case 'w-fdb-reset': Object.assign(fdb, { payroll: ADDR0, hr: ADDR0, db: ADDR0, draft: '', last: null, error: false }); refresh('files-vs-db'); break;
      case 'w-fdb-save': {
        const val = fdb.draft.trim();
        if (!val) {
          fdb.error = true; refresh('files-vs-db');
          $w('files-vs-db')?.querySelector('#w-fdb-in')?.focus();
          return;
        }
        fdb.error = false;
        if (fdb.mode === 'files') fdb[v] = val; else fdb.db = val;
        fdb.last = v;
        refresh('files-vs-db');
        break;
      }
      default: break;
    }
  }

  const clampInt = (s, lo, hi, dflt) => {
    const n = Math.round(Number(s));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
  };

  function onInput(e) {
    const el = e.target;
    const w = el && el.dataset ? el.dataset.w : null;
    if (!w) return;
    switch (w) {
      case 'acc-n': {
        if (el.value === '') return;                     // still typing
        acc.n = clampInt(el.value, 1, N_MAX, acc.n);
        $w('access-time')?.querySelectorAll('[data-w="acc-n"]').forEach((o) => { if (o !== el) o.value = String(Math.min(acc.n, o.type === 'range' ? 1000 : N_MAX)); });
        refreshOut('access-time');
        break;
      }
      case 'acc-q': {
        if (el.value === '') return;
        acc.qph = clampInt(el.value, 1, 100000000, acc.qph);
        const out = $w('access-time')?.querySelector('[data-out]');
        // Only the load table and its text depend on qph; re-render the outputs but keep this input (and caret) alive.
        if (out) {
          const tmp = document.createElement('div');
          tmp.innerHTML = accOut();
          const newTable = tmp.querySelector('.tw-table');
          const oldTable = out.querySelector('.tw-table');
          if (newTable && oldTable) oldTable.replaceWith(newTable);
        }
        say('access-time', accLive());
        break;
      }
      case 'idx-n': {
        idx.i = clampInt(el.value, 0, N_STEPS.length - 1, idx.i);
        idx.step = 0;
        const box = $w('index-search');
        const lab = box?.querySelector('[data-idx-n]');
        if (lab) lab.textContent = num(N_STEPS[idx.i]);
        el.setAttribute('aria-valuetext', num(N_STEPS[idx.i]));
        refreshOut('index-search');
        break;
      }
      case 'fdb-in': fdb.draft = el.value; break;
      default: break;
    }
  }

  function onChange(e) {
    const el = e.target;
    const w = el && el.dataset ? el.dataset.w : null;
    if (!w) return;
    if (w === 'idx-r' || w === 'idx-f') {
      idx[w === 'idx-r' ? 'rpb' : 'f'] = Number(el.value);
      idx.step = 0;
      refreshOut('index-search');
    } else if (w === 'acc-n' || w === 'acc-q') {
      // On blur/commit, show the clamped value in the field that was typed in.
      if (w === 'acc-n') el.value = String(Math.min(acc.n, el.type === 'range' ? 1000 : N_MAX));
      else el.value = String(acc.qph);
    }
  }

  return { html, onClick, onInput, onChange };
})();
