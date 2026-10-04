'use strict';

/* ==========================================================================
   Runnable SQL examples for the SQL section. SQLite compiled to WebAssembly
   (sql.js, from cdnjs) is loaded the first time something runs.
   Every run starts a fresh in-memory database: the card's setup, then the
   editor's text, statement by statement. Nothing leaves the browser.

   html(card)          editor + Run / Reset / Download for cards with sql: { setup, query }
   sandboxHtml()       the free editor of the practice page (SQL_SANDBOX)
   onClick, onInput, onKeydown   delegated events (data-action starts with "sql-")
   ========================================================================== */

const SqlRunner = (() => {
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.2/';
  const MAX_ROWS = 50;
  const texts = {};                     // box id -> current editor text (this session)
  const boxes = {};                     // box id -> { setup, query, file }
  const sandboxStore = makeStore('sql-sandbox-v1');
  const images = new Map();             // setup SQL -> its database image, built once (the 150k-row shop takes ~0.3 s)
  const running = new Set();            // box ids with a run in progress
  let engine = null;                    // Promise<SQL>

  function load() {
    if (engine) return engine;
    engine = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `${CDN}sql-wasm.js`;
      s.crossOrigin = 'anonymous';
      s.onload = () => window.initSqlJs({ locateFile: (f) => `${CDN}${f}` }).then(resolve, reject);
      s.onerror = () => reject(new Error('load'));
      document.head.appendChild(s);
    });
    engine.catch(() => { engine = null; });   // let a later click retry
    return engine;
  }

  const rowsFor = (text) => Math.min(Math.max(String(text).split('\n').length + 1, 4), 24);

  function boxHtml(id, { setup, query, file }) {
    boxes[id] = { setup, query, file };
    const text = texts[id] !== undefined ? texts[id] : query;
    return `<section class="sql-runner${id === 'sandbox' ? ' is-sandbox' : ''}" data-widget="sql-${esc(id)}" aria-label="${esc(t('SQL example you can run'))}">
        <p class="sql-tag">${esc(t('SQLite · runs in your browser'))}</p>
        ${setup ? `<details class="sql-setup"><summary>${esc(t('Setup: tables and sample rows'))}</summary><pre><code>${esc(setup)}</code></pre></details>` : ''}
        <label class="sr-only" for="sqled-${esc(id)}">${esc(t('SQL to run'))}</label>
        <textarea class="sql-editor" id="sqled-${esc(id)}" data-sql="${esc(id)}" data-fid="sqled-${esc(id)}" rows="${rowsFor(text)}" spellcheck="false" autocomplete="off" autocapitalize="off">${esc(text)}</textarea>
        <div class="sql-actions">
          <button type="button" class="btn" data-action="sql-run" data-box="${esc(id)}" data-fid="sqlrun-${esc(id)}">${esc(t('Run'))}</button>
          <button type="button" class="btn ghost" data-action="sql-reset" data-box="${esc(id)}" data-fid="sqlreset-${esc(id)}">${esc(t('Reset'))}</button>
          <button type="button" class="btn ghost" data-action="sql-download" data-box="${esc(id)}" data-fid="sqldl-${esc(id)}">${esc(t('Download .sql'))}</button>
          <span class="sql-kbd">${esc(t('or Ctrl + Enter'))}</span>
        </div>
        <div class="sql-out" data-out aria-live="polite"></div>
      </section>`;
  }

  const html = (card) => (card.sql ? boxHtml(card.id, { setup: card.sql.setup || '', query: card.sql.query, file: `${card.id}.sql` }) : '');

  function sandboxHtml() {
    const sb = SQL_SANDBOX;
    const saved = sandboxStore.load();
    if (texts.sandbox === undefined && typeof saved.text === 'string') texts.sandbox = saved.text;
    return boxHtml('sandbox', { setup: sb.setup, query: sb.examples[0].sql, file: 'sql-sandbox.sql' });
  }

  /* ---- Output ---------------------------------------------------------------- */

  const cell = (v) => (v === null ? '<td class="nul">NULL</td>' : `<td${typeof v === 'number' ? ' class="num"' : ''}>${esc(v instanceof Uint8Array ? `[${v.length} bytes]` : v)}</td>`);

  function tableHtml(cols, rows) {
    const shown = rows.slice(0, MAX_ROWS);
    return `<div class="scroll"><table class="src sql-table"><thead><tr>${cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${shown.map((r) => `<tr>${r.map(cell).join('')}</tr>`).join('')}</tbody></table></div>
      ${rows.length > MAX_ROWS ? `<p class="meta">${esc(t('Showing {n} of {total} rows.', { n: MAX_ROWS, total: rows.length }))}</p>` : ''}`;
  }

  /* EXPLAIN QUERY PLAN rows (id, parent, notused, detail) as an indented tree. */
  function planHtml(rows) {
    const kids = {};
    rows.forEach(([id, parent, , detail]) => { (kids[parent] = kids[parent] || []).push({ id, detail }); });
    const walk = (p) => (kids[p] || []).map((n) => `<li><code class="${/^SEARCH/.test(n.detail) ? 'plan-good' : /^SCAN/.test(n.detail) ? 'plan-scan' : ''}">${esc(n.detail)}</code>${kids[n.id] ? `<ul>${walk(n.id)}</ul>` : ''}</li>`).join('');
    return `<ul class="sql-plan">${walk(0)}</ul>`;
  }

  const firstLine = (sql) => {
    const line = sql.trim().split('\n').find((l) => l.trim() && !l.trim().startsWith('--')) || sql.trim();
    return line.length > 70 ? `${line.slice(0, 68)}…` : line;
  };

  /* A fresh database with the setup already run: from a cached image after the first time. */
  function freshDb(SQL, setup) {
    if (setup && !images.has(setup)) {
      const d = new SQL.Database();
      d.run('PRAGMA foreign_keys = ON;');
      try { d.exec(setup); images.set(setup, d.export()); } finally { d.close(); }
    }
    const db = setup ? new SQL.Database(images.get(setup)) : new SQL.Database();
    db.run('PRAGMA foreign_keys = ON;');    // per connection: set it again on every copy
    return db;
  }

  async function run(id) {
    const box = document.querySelector(`[data-widget="sql-${CSS.escape(id)}"]`);
    const out = box && box.querySelector('[data-out]');
    if (!out || running.has(id)) return;
    running.add(id);
    try { await runIn(id, out); } finally { running.delete(id); }
  }

  async function runIn(id, out) {
    out.innerHTML = `<p class="meta">${esc(t('Loading the SQL engine…'))}</p>`;
    let SQL;
    try { SQL = await load(); } catch (e) {
      out.innerHTML = `<section class="feedback bad"><p>${esc(t('The SQL engine could not load (are you offline?). You can still read and download the code.'))}</p></section>`;
      return;
    }
    const cfg = boxes[id];
    const text = texts[id] !== undefined ? texts[id] : cfg.query;
    const parts = [];
    let failed = false;
    let db;
    try { db = freshDb(SQL, cfg.setup); } catch (e) {
      out.innerHTML = `<section class="feedback bad"><h4>${esc(t('The setup failed'))}</h4><p><code>${esc(e.message)}</code></p></section>`;
      return;
    }
    const t0 = performance.now();
    let n = 0;
    try {
      for (const stmt of db.iterateStatements(text)) {
        n++;
        const s0 = performance.now();
        const sql = stmt.getSQL();
        const cols = stmt.getColumnNames();
        const rows = [];
        while (stmt.step()) rows.push(stmt.get());
        const took = performance.now() - s0;
        const head = `<p class="sql-stmt"><span class="sql-n">${n}</span><code>${esc(firstLine(sql))}</code><span class="sql-ms">${esc(t('{ms} ms', { ms: took < 10 ? took.toFixed(1) : Math.round(took) }))}</span></p>`;
        if (cols.length && /^\s*EXPLAIN\s+QUERY\s+PLAN/i.test(sql)) parts.push(`${head}${planHtml(rows)}`);
        else if (cols.length) parts.push(`${head}${rows.length ? tableHtml(cols, rows) : `<p class="meta">${esc(t('No rows.'))}</p>`}`);
        else {
          const changed = db.getRowsModified();
          parts.push(`${head}<p class="meta">${esc(/^\s*(INSERT|UPDATE|DELETE|REPLACE)/i.test(sql) ? (changed === 1 ? t('OK · 1 row changed.') : t('OK · {n} rows changed.', { n: changed })) : t('OK.'))}</p>`);
        }
      }
    } catch (e) {
      failed = true;
      parts.push(`<section class="feedback bad"><h4>${esc(n ? t('Statement {n} failed', { n }) : t('The SQL failed'))}</h4><p><code>${esc(e.message)}</code></p></section>`);
    }
    const ms = performance.now() - t0;
    db.close();
    out.innerHTML = `${parts.join('') || `<p class="meta">${esc(t('Nothing to run.'))}</p>`}
      <p class="sql-time">${esc(failed ? t('Stopped after {ms} ms.', { ms: ms.toFixed(1) }) : t('{n} statements in {ms} ms.', { n, ms: ms.toFixed(1) }))}</p>`;
    announce(failed ? t('The SQL failed') : t('{n} statements in {ms} ms.', { n, ms: ms.toFixed(1) }));
  }

  /* The file holds the setup and the current editor text, so it runs as it is in SQLite. */
  function download(id) {
    const cfg = boxes[id];
    const text = texts[id] !== undefined ? texts[id] : cfg.query;
    const body = cfg.setup
      ? `-- ${t('Setup: tables and sample rows')}\n${cfg.setup.trim()}\n\n-- ${t('Example')}\n${text.trim()}\n`
      : `${text.trim()}\n`;
    downloadText(cfg.file, `-- ${t('SQLite · Databases practice, CUNEF Universidad')}\n${body}`, 'application/sql');
  }

  function onClick(el) {
    const id = el.dataset.box;
    switch (el.dataset.action) {
      case 'sql-run': run(id); break;
      case 'sql-reset': {
        delete texts[id];
        if (id === 'sandbox') sandboxStore.save({});
        const ed = document.getElementById(`sqled-${id}`);
        if (ed) { ed.value = boxes[id].query; ed.rows = rowsFor(ed.value); ed.focus(); }
        const out = el.closest('.sql-runner')?.querySelector('[data-out]');
        if (out) out.innerHTML = '';
        break;
      }
      case 'sql-download': download(id); break;
      case 'sql-example': {
        const ex = SQL_SANDBOX.examples[+el.dataset.i];
        const ed = document.getElementById('sqled-sandbox');
        if (!ex || !ed) return;
        ed.value = ex.sql;
        texts.sandbox = ex.sql;
        ed.rows = rowsFor(ex.sql);
        sandboxStore.save({ text: ex.sql });
        run('sandbox');
        break;
      }
      default:
    }
  }

  function onInput(e) {
    const ed = e.target.closest('textarea[data-sql]');
    if (!ed) return;
    texts[ed.dataset.sql] = ed.value;
    ed.rows = rowsFor(ed.value);
    if (ed.dataset.sql === 'sandbox') sandboxStore.save({ text: ed.value });
  }

  function onKeydown(e) {
    const ed = e.target.closest('textarea[data-sql]');
    if (!ed) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(ed.dataset.sql); }
  }

  return { html, sandboxHtml, onClick, onInput, onKeydown };
})();
