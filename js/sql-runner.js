'use strict';

/* ==========================================================================
   Runnable SQL examples for the SQL section. The text on screen is Oracle (the
   course practises on freesql.com); js/oracle-dialect.js translates it to SQLite
   compiled to WebAssembly (sql.js, from cdnjs), which is loaded the first time
   something runs. Every run starts a fresh in-memory database: the card's setup,
   then the editor's text, statement by statement. Nothing leaves the browser.

   html(card)          editor + Run / Reset / FreeSQL / Download for cards with sql: { setup, query }
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
        <p class="sql-tag">${esc(t('Oracle syntax · simulated in your browser'))}</p>
        ${setup ? `<details class="sql-setup"><summary>${esc(t('Setup: tables and sample rows'))}</summary><pre><code>${esc(setup)}</code></pre></details>` : ''}
        <label class="sr-only" for="sqled-${esc(id)}">${esc(t('SQL to run'))}</label>
        <textarea class="sql-editor" id="sqled-${esc(id)}" data-sql="${esc(id)}" data-fid="sqled-${esc(id)}" rows="${rowsFor(text)}" spellcheck="false" autocomplete="off" autocapitalize="off">${esc(text)}</textarea>
        <div class="sql-actions">
          <button type="button" class="btn" data-action="sql-run" data-box="${esc(id)}" data-fid="sqlrun-${esc(id)}">${esc(t('Run'))}</button>
          <button type="button" class="btn ghost" data-action="sql-reset" data-box="${esc(id)}" data-fid="sqlreset-${esc(id)}">${esc(t('Reset'))}</button>
          <button type="button" class="btn ghost" data-action="sql-freesql" data-box="${esc(id)}" data-fid="sqlfs-${esc(id)}">${esc(t('Copy and open FreeSQL'))}</button>
          <button type="button" class="btn ghost" data-action="sql-download" data-box="${esc(id)}" data-fid="sqldl-${esc(id)}">${esc(t('Download .sql'))}</button>
          <span class="sql-kbd">${esc(t('or Ctrl + Enter'))}</span>
        </div>
        <div class="sql-lint" data-lint></div>
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

  /* EXPLAIN QUERY PLAN rows (id, parent, notused, detail) as an indented tree, worded as Oracle's plan. */
  function planHtml(rows) {
    const kids = {};
    rows.forEach(([id, parent, , detail]) => { (kids[parent] = kids[parent] || []).push({ id, detail }); });
    const cls = (d) => (/^SEARCH/.test(d) ? 'plan-good' : /^SCAN \w+$/.test(d) ? 'plan-scan' : '');
    const walk = (p) => (kids[p] || []).map((n) => `<li><code class="${cls(n.detail)}" title="${esc(n.detail)}">${esc(OracleDialect.planLine(n.detail))}</code>${kids[n.id] ? `<ul>${walk(n.id)}</ul>` : ''}</li>`).join('');
    return `<ul class="sql-plan">${walk(0)}</ul><p class="meta">${esc(t('Plan simulated with SQLite and worded as Oracle would. Real Oracle plans also show cost and cardinality: try it in FreeSQL.'))}</p>`;
  }

  const firstLine = (sql) => {
    const line = sql.trim().split('\n').find((l) => l.trim() && !l.trim().startsWith('--')) || sql.trim();
    return line.length > 70 ? `${line.slice(0, 68)}…` : line;
  };

  /* Warnings above the output: what the student typed would not work on Oracle. */
  function lintHtml(items) {
    if (!items.length) return '';
    return `<section class="feedback mixed sql-warn"><h4>${esc(t('This would not run on Oracle as written'))}</h4><ul>${items.map((i) => `<li>${esc(t(i.msg))} ${esc(t(i.fix))}</li>`).join('')}</ul></section>`;
  }

  /* A fresh database with the setup already run: from a cached image after the first time. */
  function freshDb(SQL, setup) {
    if (setup && !images.has(setup)) {
      const d = new SQL.Database();
      d.run('PRAGMA foreign_keys = ON;');
      try {
        OracleDialect.script(setup, { finish: true }).forEach((u) => u.sqls.forEach((q) => d.run(q)));
        images.set(setup, d.export());
      } finally { d.close(); }
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
    try { await runIn(id, out, box.querySelector('[data-lint]')); } finally { running.delete(id); }
  }

  /* What an Oracle client prints after a statement that returns no rows. */
  function doneText(sql, changed, note) {
    if (/^\s*(INSERT|UPDATE|DELETE)/i.test(sql) || /^\s*WITH[\s\S]*\b(INSERT|UPDATE|DELETE)\b/i.test(sql)) return changed === 1 ? t('1 row changed.') : t('{n} rows changed.', { n: changed });
    if (/^\s*CREATE/i.test(sql)) return /\bINDEX\b/i.test(sql) ? t('Index created.') : /\bVIEW\b/i.test(sql) ? t('View created.') : t('Table created.');
    if (/^\s*DROP/i.test(sql)) return t('Dropped.');
    if (/^\s*ALTER/i.test(sql)) return t('Table altered.');
    if (/^\s*COMMIT/i.test(sql)) return t('Commit complete.');
    if (/^\s*ROLLBACK/i.test(sql)) return t('Rollback complete.');
    if (/^\s*SAVEPOINT/i.test(sql)) return t('Savepoint created.');
    return note ? t(note) : t('OK.');
  }

  async function runIn(id, out, lintBox) {
    out.innerHTML = `<p class="meta">${esc(t('Loading the SQL engine…'))}</p>`;
    let SQL;
    try { SQL = await load(); } catch (e) {
      out.innerHTML = `<section class="feedback bad"><p>${esc(t('The SQL engine could not load (are you offline?). You can still read and download the code.'))}</p></section>`;
      return;
    }
    const cfg = boxes[id];
    const text = texts[id] !== undefined ? texts[id] : cfg.query;
    if (lintBox) lintBox.innerHTML = lintHtml(OracleDialect.lint(text));
    const parts = [];
    let failed = false;
    let db;
    try { db = freshDb(SQL, cfg.setup); } catch (e) {
      out.innerHTML = `<section class="feedback bad"><h4>${esc(t('The setup failed'))}</h4><p><code>${esc(e.message)}</code></p></section>`;
      return;
    }
    const t0 = performance.now();
    let n = 0;
    for (const u of OracleDialect.script(text)) {
      if (u.silent) continue;
      n++;
      const s0 = performance.now();
      const label = (took) => `<p class="sql-stmt"><span class="sql-n">${n}</span><code>${esc(firstLine(u.text))}</code>${took === null ? '' : `<span class="sql-ms">${esc(t('{ms} ms', { ms: took < 10 ? took.toFixed(1) : Math.round(took) }))}</span>`}</p>`;
      if (u.unsupported) {
        parts.push(`${label(null)}<section class="feedback mixed"><p>${esc(t('The sandbox cannot simulate {what}. It is valid Oracle: copy it to FreeSQL to run it.', { what: t(u.unsupported) }))}</p></section>`);
        continue;
      }
      if (!u.sqls.length) { parts.push(`${label(null)}<p class="meta">${esc(doneText('', 0, u.note))}</p>`); continue; }
      let res = [];
      let changed = 0;
      try {
        u.sqls.forEach((q) => { res = db.exec(q); changed = db.getRowsModified(); });
      } catch (e) {
        failed = true;
        const ora = OracleDialect.oraError(e.message, u.text);
        parts.push(`${label(null)}<section class="feedback bad"><h4>${esc(t('Statement {n} failed', { n }))}</h4><p><code>${esc(ora ? `${ora.code}: ${ora.text}` : e.message)}</code></p>${ora ? `<p class="meta">${esc(t('The browser engine (SQLite) said: {msg}', { msg: e.message }))}</p>` : ''}</section>`);
        break;
      }
      const took = performance.now() - s0;
      const last = u.sqls[u.sqls.length - 1];
      const isQuery = /^\s*(SELECT|EXPLAIN|VALUES)/i.test(last) || (/^\s*WITH/i.test(last) && !/\b(INSERT|UPDATE|DELETE)\b/i.test(last));
      let body;
      if (res.length && /^\s*EXPLAIN\s+QUERY\s+PLAN/i.test(last)) body = planHtml(res[0].values);
      else if (res.length) body = tableHtml(res[0].columns.map((c) => c.toUpperCase()), res[0].values);
      else if (isQuery) body = `<p class="meta">${esc(t('no rows selected'))}</p>`;
      else body = `<p class="meta">${esc(doneText(last, changed, u.note))}</p>`;
      parts.push(`${label(took)}${body}`);
    }
    const ms = performance.now() - t0;
    db.close();
    out.innerHTML = `${parts.join('') || `<p class="meta">${esc(t('Nothing to run.'))}</p>`}
      <p class="sql-time">${esc(failed ? t('Stopped after {ms} ms.', { ms: ms.toFixed(1) }) : t('{n} statements in {ms} ms.', { n, ms: ms.toFixed(1) }))}</p>`;
    announce(failed ? t('The SQL failed') : t('{n} statements in {ms} ms.', { n, ms: ms.toFixed(1) }));
  }

  /* Runs an Oracle script on a fresh copy of `setup` and returns the result of its last statement
     (or, when `verify` is given, of that SELECT run afterwards): { cols, rows } or { error: { code?, text }, raw }.
     Used by the SQL challenges to compare a student's query with the reference. */
  async function execute(setup, text, verify) {
    let SQL;
    try { SQL = await load(); } catch (e) { return { error: { text: t('The SQL engine could not load (are you offline?). You can still read and download the code.') }, raw: 'load' }; }
    const db = freshDb(SQL, setup);
    try {
      let res = null;
      for (const u of [...OracleDialect.script(text), ...(verify ? OracleDialect.script(verify) : [])]) {
        if (u.unsupported) return { error: { text: t('The sandbox cannot simulate {what}. It is valid Oracle: copy it to FreeSQL to run it.', { what: t(u.unsupported) }) }, raw: 'unsupported' };
        let r = [];
        u.sqls.forEach((q) => { r = db.exec(q); });
        if (u.sqls.length) res = r.length ? r[0] : null;
      }
      return { cols: res ? res.columns : [], rows: res ? res.values : [] };
    } catch (e) {
      const ora = OracleDialect.oraError(e.message, text);
      return { error: ora ? { code: ora.code, text: ora.text } : { text: e.message }, raw: e.message };
    } finally { db.close(); }
  }

  /* The script for FreeSQL: a clean slate, the setup and the editor text, all in Oracle. */
  function oracleScript(id) {
    const cfg = boxes[id];
    const text = texts[id] !== undefined ? texts[id] : cfg.query;
    const drops = OracleDialect.cleanup(cfg.setup ? `${cfg.setup}\n${text}` : text);
    const head = `-- ${t('Oracle · Databases practice, CUNEF Universidad (FreeSQL: choose 23ai or 26ai)')}\n`;
    const clean = drops ? `-- ${t('Clean slate: drops the tables this script creates')}\n${drops}\n\n` : '';
    const setup = cfg.setup ? `-- ${t('Setup: tables and sample rows')}\n${cfg.setup.trim()}\n\n-- ${t('Example')}\n` : '';
    return `${head}${clean}${setup}${text.trim()}\n`;
  }

  const download = (id) => downloadText(boxes[id].file, oracleScript(id), 'application/sql');

  function onClick(el) {
    const id = el.dataset.box;
    switch (el.dataset.action) {
      case 'sql-run': run(id); break;
      case 'sql-reset': {
        delete texts[id];
        if (id === 'sandbox') sandboxStore.save({});
        const ed = document.getElementById(`sqled-${id}`);
        if (ed) { ed.value = boxes[id].query; ed.rows = rowsFor(ed.value); ed.focus(); }
        const box = el.closest('.sql-runner');
        if (box) { box.querySelector('[data-out]').innerHTML = ''; box.querySelector('[data-lint]').innerHTML = ''; }
        break;
      }
      case 'sql-download': download(id); break;
      case 'sql-freesql': copyToFreeSql(oracleScript(id), el, boxes[id].file); break;
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

  return { html, sandboxHtml, onClick, onInput, onKeydown, execute, tableHtml };
})();
