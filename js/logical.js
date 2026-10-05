'use strict';

/* ==========================================================================
   Relational databases › ER → Logical.
   The student reads an ER model and builds its tables: names, columns,
   primary keys, foreign keys (with their target) and NOT NULL on each FK.
   js/logical-engine.js derives every accepted solution and checks the design.
   Data: data/<lang>/logical.js (LOGICAL_EXERCISES). Routes: #/relational/logical/practice[/N],
   drawn inside the rules section (js/logical-section.js), which owns #/relational/logical.
   ========================================================================== */

const LogicalSection = (() => {
  const ROOT = '#/relational/logical';
  const BASE = `${ROOT}/practice`;
  const MAX_TABLES = 16;
  const MAX_COLS = 16;
  const progressStore = makeStore('er-logical-v1');
  const workStore = makeStore(langKey('er-logical-work-v1'));
  const progress = Object.assign({ solved: {} }, progressStore.load());
  const saved = workStore.load();
  const work = {};
  const cache = {};                     // exercise id -> { variants }
  let idx = 0;

  const view = () => $('#practice-slot') || $('#view');
  const sigOf = (ex) => hashOf([ex.entities, ex.relationships, ex.hierarchies || [], ex.prefer || {}]);
  const variantsOf = (ex) => (cache[ex.id] || (cache[ex.id] = { variants: LogicalEngine.variants(ex) })).variants;

  const newCol = () => ({ name: '', pk: false, fk: '', nn: false });
  const newTable = () => ({ name: '', cols: [newCol()] });

  function cleanTables(list) {
    if (!Array.isArray(list) || !list.length || list.length > MAX_TABLES) return null;
    const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
    return list.map((t) => ({
      name: str(t && t.name, 40),
      cols: (t && Array.isArray(t.cols) ? t.cols.slice(0, MAX_COLS) : []).map((c) => ({ name: str(c && c.name, 40), pk: !!(c && c.pk), fk: str(c && c.fk, 90), nn: !!(c && c.nn) })),
    }));
  }

  function getWork(ex) {
    if (!work[ex.id]) {
      const s = saved[ex.id];
      const tables = s && s.sig === sigOf(ex) ? cleanTables(s.tables) : null;
      work[ex.id] = { tables: tables || [newTable()], hints: s && s.sig === sigOf(ex) ? Math.min(+s.hints || 0, (ex.hints || []).length) : 0, result: null, solution: false };
    }
    return work[ex.id];
  }

  function persist(ex) {
    const w = work[ex.id];
    if (!w) return;
    saved[ex.id] = { sig: sigOf(ex), tables: w.tables, hints: w.hints };
    workStore.save(saved);
  }

  const touch = (w) => { w.result = null; };

  /* ---- Pieces of the page -------------------------------------------------- */

  /* Level tabs (segmented), then numbered tabs for the exercises of the current level. */
  function exerciseNav() {
    const LEVELS = { 1: t('one rule at a time'), 2: t('complete models') };
    const all = LOGICAL_EXERCISES.map((e, i) => ({ e, i }));
    const level = LOGICAL_EXERCISES[idx].level;
    const solved = (x) => !!progress.solved[x.e.id];
    const levelTabs = Object.keys(LEVELS).map(Number).map((lv) => {
      const items = all.filter((x) => x.e.level === lv);
      if (!items.length) return '';
      const target = lv === level ? idx : (items.find((x) => !solved(x)) || items[0]).i;
      return `<a href="${BASE}/${target + 1}"${lv === level ? ' aria-current="page"' : ''}>${esc(t('Level {n}', { n: lv }))} <span>${esc(t('{level} · {done}/{total} solved', { level: LEVELS[lv], done: items.filter(solved).length, total: items.length }))}</span></a>`;
    }).join('');
    const items = all.filter((x) => x.e.level === level);
    const link = (i) => (i >= 0 && i < LOGICAL_EXERCISES.length ? { href: `${BASE}/${i + 1}`, title: `${i + 1} · ${LOGICAL_EXERCISES[i].short || LOGICAL_EXERCISES[i].title}` } : null);
    const done = all.filter(solved).length;
    return `<div class="ex-nav">
        <nav class="levels" aria-label="${esc(t('Exercise level'))}">${levelTabs}</nav>
        ${numberTabsHtml({
          label: t('Level {n} exercises', { n: level }),
          items: items.map((x) => ({ n: x.i + 1, href: `${BASE}/${x.i + 1}`, title: x.e.short || x.e.title, done: solved(x) })),
          current: items.findIndex((x) => x.i === idx),
          prev: link(idx - 1),
          next: link(idx + 1),
        })}
        <p class="count">${esc(t('{done} of {total} solved', { done, total: LOGICAL_EXERCISES.length }))} · <button type="button" class="link" data-action="clear-all" data-fid="clear-all">${esc(t('Clear my progress'))}</button></p>
      </div>`;
  }

  /* The rule cards (js/logical-section.js) this exercise practises, as links back to the theory. */
  function rulesLinkHtml(ex) {
    const cards = (typeof LOGICAL_RULES !== 'undefined' ? LOGICAL_RULES : []).filter((r) => r.exercise === ex.id);
    const links = cards.length
      ? cards.map((r) => `<a href="${ROOT}/${r.id}">${esc(r.title)}</a>`).join(' · ')
      : `<a href="${ROOT}">${esc(t('The transformation rules'))}</a>`;
    return `<p class="rule-back">${RULE_ICON}<span>${esc(cards.length ? t('Review the rule:') : t('Review:'))} ${links}</span></p>`;
  }
  const RULE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>';

  /* Every PK column of every table, as FK targets. */
  function fkTargets(w) {
    const out = [];
    w.tables.forEach((t) => {
      if (!t.name.trim()) return;
      t.cols.forEach((c) => { if (c.pk && c.name.trim()) out.push(`${t.name.trim()}.${c.name.trim()}`); });
    });
    return out;
  }

  const fkOptionsHtml = (c, targets) => {
    const opts = [...new Set(c.fk && !targets.includes(c.fk) ? [...targets, c.fk] : targets)];
    return `<option value="">${esc(t('no FK'))}</option>${opts.map((o) => `<option value="${esc(o)}"${o === c.fk ? ' selected' : ''}>FK → ${esc(o)}</option>`).join('')}`;
  };

  function colRowHtml(ex, w, ti, ci, targets) {
    const c = w.tables[ti].cols[ci];
    const id = `${ti}-${ci}`;
    return `<li class="col-row${c.pk ? ' is-pk' : ''}${c.fk ? ' is-fk' : ''}">
        <input class="col-name" type="text" list="dl-attrs" placeholder="${esc(t('column'))}" aria-label="${esc(t('Column {n} of table {table}', { n: ci + 1, table: w.tables[ti].name || ti + 1 }))}" value="${esc(c.name)}" data-col="${id}" data-fid="cn-${id}" maxlength="40" autocomplete="off" spellcheck="false">
        <button type="button" class="tog${c.pk ? ' on' : ''}" aria-pressed="${c.pk}" data-action="toggle-pk" data-t="${ti}" data-c="${ci}" data-fid="pk-${id}" title="${esc(t('Part of the primary key'))}">PK</button>
        <label class="fk-pick"><span class="sr-only">${esc(t('Foreign key target of column {col}', { col: c.name || ci + 1 }))}</span>
          <select data-fk="${id}" data-fid="fk-${id}">${fkOptionsHtml(c, targets)}</select></label>
        <button type="button" class="tog nn${c.nn || c.pk ? ' on' : ''}" aria-pressed="${c.nn || c.pk}" data-action="toggle-nn" data-t="${ti}" data-c="${ci}" data-fid="nn-${id}" title="NOT NULL"${!c.fk || c.pk ? ' disabled' : ''}>NOT NULL</button>
        <button type="button" class="rm" aria-label="${esc(t('Remove column {col}', { col: c.name || ci + 1 }))}" data-action="rm-col" data-t="${ti}" data-c="${ci}" data-fid="rmc-${id}">×</button>
      </li>`;
  }

  function tableCardHtml(ex, w, ti, targets) {
    const tb = w.tables[ti];
    return `<section class="tcard c${(ti % 8) + 1}" aria-label="${esc(t('Table {table}', { table: tb.name || ti + 1 }))}">
        <header class="tcard-head">
          <span class="badge">${ti + 1}</span>
          <input class="tname" type="text" list="dl-tables" placeholder="${esc(t('Table name'))}" aria-label="${esc(t('Name of table {n}', { n: ti + 1 }))}" value="${esc(tb.name)}" data-tname="${ti}" data-fid="tn-${ti}" maxlength="40" autocomplete="off" spellcheck="false">
          <button type="button" class="rm" aria-label="${esc(t('Remove table {table}', { table: tb.name || ti + 1 }))}" data-action="rm-table" data-t="${ti}" data-fid="rmt-${ti}">×</button>
        </header>
        <ul class="cols">${tb.cols.map((_, ci) => colRowHtml(ex, w, ti, ci, targets)).join('')}</ul>
        <p class="tcard-foot"><button type="button" class="link" data-action="add-col" data-t="${ti}" data-fid="addc-${ti}"${tb.cols.length >= MAX_COLS ? ' disabled' : ''}>+ ${esc(t('Add column'))}</button></p>
      </section>`;
  }

  /* Relational notation: Table(pk, col, fk→Ref). */
  function notationHtml(tables) {
    const rows = tables.filter((tb) => tb.name.trim() || tb.cols.some((c) => c.name.trim())).map((tb) => {
      const cols = tb.cols.filter((c) => c.name.trim()).map((c) => {
        const ref = c.fk ? `<span class="ref">→${esc(c.fk.slice(0, c.fk.lastIndexOf('.')))}</span>` : '';
        return `<span class="${c.pk ? 'pkc' : ''}${c.fk ? ' fkc' : ''}">${esc(c.name.trim())}</span>${ref}${c.fk && !c.pk && !c.nn ? `<span class="nullmark" title="${esc(t('can be NULL'))}">?</span>` : ''}`;
      }).join(', ');
      return `<li><strong>${esc(tb.name.trim() || t('(no name)'))}</strong> (${cols})</li>`;
    }).join('');
    return rows
      ? `<ul class="notation">${rows}</ul><p class="meta">${esc(t('Underlined: primary key. Italic with →: foreign key.'))} ${t('{mark} marks a foreign key that can be NULL.', { mark: '<span class="nullmark">?</span>' })}</p>`
      : `<p class="empty">${esc(t('Your tables will appear here in relational notation.'))}</p>`;
  }

  const variantToStudent = (v) => v.tables.map((t) => ({
    name: t.name,
    cols: t.cols.filter((c) => !c.optional).map((c) => ({ name: c.name, pk: !!c.pk, fk: c.fk ? `${c.fk.table}.${c.fk.col}` : '', nn: !!c.nn && !c.pk })),
  }));

  function solutionHtml(ex) {
    const v = variantsOf(ex)[0];
    const tables = variantToStudent(v);
    const why = v.tables.map((t) => `<li><strong>${esc(t.name)}</strong>: ${md(t.why)}</li>`).join('');
    const nOthers = variantsOf(ex).length - 1;
    const others = nOthers > 0 ? `<p class="meta">${esc(nOthers > 1
      ? t('This exercise has {n} other accepted solutions (the other side for a 1:1 foreign key, or another hierarchy strategy). The checker accepts all of them.', { n: nOthers })
      : t('This exercise has 1 other accepted solution (the other side for a 1:1 foreign key, or another hierarchy strategy). The checker accepts all of them.'))}</p>` : '';
    return `<section class="block solution" aria-labelledby="sol-h">
        <h3 id="sol-h" tabindex="-1">${esc(t('Reference solution'))}</h3>
        ${notationHtml(tables)}
        <h4>${esc(t('Where each table comes from'))}</h4>
        <ul class="plain">${why}</ul>
        ${others}
        ${ex.note ? `<p class="meta">${md(ex.note)}</p>` : ''}
        <p class="actions"><button type="button" class="btn ghost" data-action="use-solution" data-fid="use-solution">${esc(t('Load into my design'))}</button></p>
      </section>`;
  }

  function sqlFor(tables) {
    const clean = tables.filter((t) => t.name.trim()).map((t) => ({ name: t.name.trim(), cols: t.cols.filter((c) => c.name.trim()) }));
    const ident = (s) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(s) ? (OracleDialect.isReserved(s) ? `"${s.toUpperCase()}"` : s) : `"${s.replace(/"/g, '""')}"`);
    // Referenced tables first.
    const out = [];
    const done = new Set();
    const visit = (t, stack = new Set()) => {
      if (done.has(t.name) || stack.has(t.name)) return;
      stack.add(t.name);
      t.cols.forEach((c) => { if (c.fk) { const ref = clean.find((x) => x.name === c.fk.slice(0, c.fk.lastIndexOf('.'))); if (ref) visit(ref, stack); } });
      done.add(t.name);
      out.push(t);
    };
    clean.forEach((t) => visit(t));
    const body = out.map((t) => {
      const lines = t.cols.map((c) => `  ${ident(c.name)} VARCHAR2(100)${c.pk || c.nn ? ' NOT NULL' : ''}`);
      const pk = t.cols.filter((c) => c.pk).map((c) => ident(c.name));
      if (pk.length) lines.push(`  PRIMARY KEY (${pk.join(', ')})`);
      const groups = {};
      t.cols.filter((c) => c.fk).forEach((c) => {
        const dot = c.fk.lastIndexOf('.');
        const key = c.fk.slice(0, dot);
        // Columns that reference the same table through a composite key form one constraint.
        const g = (groups[key] = groups[key] || []);
        const slot = g.find((x) => !x.refs.includes(c.fk.slice(dot + 1)));
        if (slot) { slot.cols.push(ident(c.name)); slot.refs.push(c.fk.slice(dot + 1)); } else g.push({ cols: [ident(c.name)], refs: [c.fk.slice(dot + 1)] });
      });
      Object.entries(groups).forEach(([ref, list]) => list.forEach((g) => lines.push(`  FOREIGN KEY (${g.cols.join(', ')}) REFERENCES ${ident(ref)} (${g.refs.map(ident).join(', ')})`)));
      return `CREATE TABLE ${ident(t.name)} (\n${lines.join(',\n')}\n);`;
    }).join('\n\n');
    const drops = OracleDialect.cleanup(body);
    const quoted = [...new Set(body.match(/"[A-Z_]+"/g) || [])].filter((q) => OracleDialect.isReserved(q.slice(1, -1)));
    const note = quoted.length ? `-- ${t('Quoted names are Oracle reserved words: rename them (for example DATE to SALE_DATE) to avoid quoting them in every query.')} ${quoted.join(', ')}\n` : '';
    return `-- ${t('Oracle SQL: run it in FreeSQL (choose 23ai or 26ai).')}\n-- ${t('Column types are placeholders: choose the right type for each column.')}\n${note}${drops ? `\n${drops}\n` : ''}\n${body}\n`;
  }

  const toFix = (n) => (n === 1 ? t('1 thing to fix') : t('{n} things to fix', { n }));

  function feedbackHtml(ex, w) {
    const r = w.result;
    if (!r) return '';
    const cls = r.ok ? 'ok' : 'bad';
    const title = r.ok ? t('Correct transformation') : toFix(r.nBad);
    const next = idx < LOGICAL_EXERCISES.length - 1 ? `<p class="actions"><a class="btn" href="${BASE}/${idx + 2}">${esc(t('Next exercise'))}</a></p>` : '';
    return `<section class="feedback ${cls}" aria-labelledby="fb-title">
        <h3 id="fb-title" tabindex="-1">${esc(title)}</h3>
        <ul class="checks">${r.checks.map(checkItem).join('')}</ul>
        ${r.notes.map((n) => `<p class="insight">${md(n)}</p>`).join('')}
        ${r.ok ? `<details class="sql"><summary>${esc(t('SQL for this design'))}</summary><pre><code>${esc(sqlFor(w.tables))}</code></pre>
          <p class="actions"><button type="button" class="btn ghost" data-action="copy-sql" data-fid="copy-sql">${esc(t('Copy SQL'))}</button>
          <button type="button" class="btn ghost" data-action="freesql-sql" data-fid="freesql-sql">${esc(t('Copy and open FreeSQL'))}</button></p></details>${next}` : ''}
      </section>`;
  }

  function renderExercise() {
    const ex = LOGICAL_EXERCISES[idx];
    const w = getWork(ex);
    const hints = ex.hints || [];
    const targets = fkTargets(w);
    const attrNames = [...new Set([
      ...ex.entities.flatMap((e) => e.attrs.flatMap((a) => (a.kind === 'composite' ? [a.name, ...(a.parts || [])] : [a.name]))),
      ...ex.relationships.flatMap((r) => [...(r.attrs || []).map((a) => a.name), ...r.ends.map((e) => e.role).filter(Boolean)]),
      ...(ex.hierarchies || []).map((h) => h.discriminator).filter(Boolean),
    ])];
    const tableNames = [...new Set([...ex.entities.map((e) => e.id), ...ex.relationships.map((r) => r.id)])];

    view().innerHTML = `
      ${exerciseNav()}
      <article class="exercise logical" aria-labelledby="ex-title">
        <header class="ex-head">
          <h2 id="ex-title">${idx + 1} · ${esc(ex.title)}</h2>
          <p class="goal">${ex.source ? `${esc(ex.source)} · ` : ''}${esc(t('Practises:'))} ${(ex.focus || []).map((f) => `<span class="tag-sm">${esc(f)}</span>`).join(' ')}</p>
          <p class="story">${md(ex.statement)}</p>
          ${rulesLinkHtml(ex)}
        </header>

        <section class="block" aria-labelledby="er-h">
          <h3 id="er-h">${esc(t('ER model'))}</h3>
          <div class="scroll er-wrap">${ErDiagram.modelSvg(ex)}</div>
          ${ErDiagram.LEGEND}
          ${ErDiagram.modelTextHtml(ex)}
        </section>

        <section class="block" aria-labelledby="mine-h">
          <h3 id="mine-h">${esc(t('Your logical model'))}</h3>
          <p class="how">${t('Create one table for each element that needs it. For every column, type its name (suggestions come from the model), press <strong>PK</strong> if it is part of the primary key, choose the table it references if it is a foreign key, and mark <strong>NOT NULL</strong> on foreign keys that are mandatory.')}</p>
          <datalist id="dl-attrs">${attrNames.map((a) => `<option value="${esc(a)}"></option>`).join('')}</datalist>
          <datalist id="dl-tables">${tableNames.map((a) => `<option value="${esc(a)}"></option>`).join('')}</datalist>
          <div class="tcards">${w.tables.map((_, ti) => tableCardHtml(ex, w, ti, targets)).join('')}</div>
          <p class="add-row"><button type="button" class="btn ghost" data-action="add-table" data-fid="add-table"${w.tables.length >= MAX_TABLES ? ' disabled' : ''}>${esc(t('Add table'))}</button></p>
          <h4>${esc(t('In relational notation'))}</h4>
          <div id="notation">${notationHtml(w.tables)}</div>
        </section>

        <div class="actions">
          <button type="button" class="btn" data-action="check" data-fid="check">${esc(t('Check'))}</button>
          <button type="button" class="btn ghost" data-action="hint" data-fid="hint"${w.hints >= hints.length ? ' disabled' : ''}>${esc(w.hints ? (w.hints >= hints.length ? t('No more hints') : t('Another hint')) : t('Show hint'))}</button>
          <span class="spacer"></span>
          <button type="button" class="link" data-action="solution" data-fid="solution" aria-expanded="${w.solution}">${esc(w.solution ? t('Hide solution') : t('Show solution'))}</button>
          <button type="button" class="link" data-action="reset" data-fid="reset">${esc(t('Start over'))}</button>
        </div>
        ${w.hints ? `<div class="hints">${hints.slice(0, w.hints).map((h, i) => `<p><strong>${esc(t('Hint {n}.', { n: i + 1 }))}</strong> ${md(h)}</p>`).join('')}</div>` : ''}
        <div id="feedback">${feedbackHtml(ex, w)}</div>
        ${w.solution ? solutionHtml(ex) : ''}
      </article>`;
  }

  /* ---- Events -------------------------------------------------------------- */

  const rerender = () => keepFocus(renderExercise);

  function renameRefs(w, from, to, colFrom, colTo) {
    w.tables.forEach((t) => t.cols.forEach((c) => {
      if (!c.fk) return;
      const dot = c.fk.lastIndexOf('.');
      const tn = c.fk.slice(0, dot);
      const cn = c.fk.slice(dot + 1);
      if (colFrom === undefined && tn === from) c.fk = `${to}.${cn}`;
      if (colFrom !== undefined && tn === from && cn === colFrom) c.fk = `${tn}.${colTo}`;
    }));
  }

  function onClick(el) {
    const ex = LOGICAL_EXERCISES[idx];
    const w = getWork(ex);
    const tb = el.dataset.t !== undefined ? w.tables[+el.dataset.t] : null;
    const c = tb && el.dataset.c !== undefined ? tb.cols[+el.dataset.c] : null;
    switch (el.dataset.action) {
      case 'add-table':
        if (w.tables.length >= MAX_TABLES) return;
        w.tables.push(newTable());
        touch(w);
        renderExercise();
        $(`[data-fid="tn-${w.tables.length - 1}"]`)?.focus();
        announce(t('Table {n} added.', { n: w.tables.length }));
        break;
      case 'rm-table': {
        const ti = +el.dataset.t;
        const name = tb.name.trim();
        w.tables.splice(ti, 1);
        if (name) w.tables.forEach((x) => x.cols.forEach((y) => { if (y.fk.startsWith(`${name}.`)) { y.fk = ''; y.nn = false; } }));
        if (!w.tables.length) w.tables.push(newTable());
        touch(w);
        renderExercise();
        $(`[data-fid="tn-${Math.min(ti, w.tables.length - 1)}"]`)?.focus();
        announce(t('Table {table} removed.', { table: name || ti + 1 }));
        break;
      }
      case 'add-col':
        if (tb.cols.length >= MAX_COLS) return;
        tb.cols.push(newCol());
        touch(w);
        renderExercise();
        $(`[data-fid="cn-${el.dataset.t}-${tb.cols.length - 1}"]`)?.focus();
        break;
      case 'rm-col': {
        const ci = +el.dataset.c;
        const [gone] = tb.cols.splice(ci, 1);
        if (gone && gone.pk && tb.name.trim()) w.tables.forEach((x) => x.cols.forEach((y) => { if (y.fk === `${tb.name.trim()}.${gone.name.trim()}`) { y.fk = ''; y.nn = false; } }));
        if (!tb.cols.length) tb.cols.push(newCol());
        touch(w);
        renderExercise();
        ($(`[data-fid="cn-${el.dataset.t}-${Math.min(ci, tb.cols.length - 1)}"]`))?.focus();
        break;
      }
      case 'toggle-pk':
        c.pk = !c.pk;
        if (!c.pk && tb.name.trim()) w.tables.forEach((x) => x.cols.forEach((y) => { if (y.fk === `${tb.name.trim()}.${c.name.trim()}`) { y.fk = ''; y.nn = false; } }));
        touch(w);
        rerender();
        break;
      case 'toggle-nn':
        c.nn = !c.nn;
        touch(w);
        rerender();
        break;
      case 'check': {
        w.result = LogicalEngine.check(ex, w.tables, variantsOf(ex));
        if (w.result.ok && !progress.solved[ex.id]) { progress.solved[ex.id] = true; progressStore.save(progress); }
        renderExercise();
        reveal($('#fb-title'));
        announce(w.result.ok ? t('Correct transformation.') : `${toFix(w.result.nBad)}.`);
        break;
      }
      case 'hint':
        if (w.hints < (ex.hints || []).length) w.hints++;
        rerender();
        break;
      case 'solution':
        w.solution = !w.solution;
        rerender();
        if (w.solution) reveal($('#sol-h'));
        break;
      case 'use-solution':
        w.tables = variantToStudent(variantsOf(ex)[0]);
        w.solution = false;
        touch(w);
        renderExercise();
        $('[data-fid="check"]')?.focus();
        announce(t('Reference solution loaded into your design.'));
        break;
      case 'reset':
        if (!window.confirm(t('Remove all your tables for this exercise?'))) return;
        work[ex.id] = { tables: [newTable()], hints: 0, result: null, solution: false };
        renderExercise();
        $('[data-fid="tn-0"]')?.focus();
        break;
      case 'clear-all':
        if (!window.confirm(t('Clear your saved progress in every ER → Logical exercise on this device?'))) return;
        Object.keys(work).forEach((k) => delete work[k]);
        Object.keys(saved).forEach((k) => delete saved[k]);
        progress.solved = {};
        workStore.clear();
        progressStore.save(progress);
        renderExercise();
        announce(t('Progress cleared.'));
        return;
      case 'freesql-sql':
        copyToFreeSql(sqlFor(w.tables), el, 'er-to-oracle.sql');
        return;
      case 'copy-sql': {
        const text = sqlFor(w.tables);
        const done = () => { el.textContent = t('Copied'); setTimeout(() => { el.textContent = t('Copy SQL'); }, 1600); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => {});
        return;
      }
      default:
        return;
    }
    persist(ex);
  }

  /* Typing never re-renders the builder (focus would jump): it refreshes the notation and the FK lists in place. */
  function refreshInPlace(w) {
    const targets = fkTargets(w);
    document.querySelectorAll('#view select[data-fk]').forEach((sel) => {
      const [ti, ci] = sel.dataset.fk.split('-').map(Number);
      const c = w.tables[ti] && w.tables[ti].cols[ci];
      if (c) sel.innerHTML = fkOptionsHtml(c, targets);
    });
    $('#notation').innerHTML = notationHtml(w.tables);
    const fb = $('#feedback');
    if (fb) fb.innerHTML = '';
  }

  function onInput(e) {
    const ex = LOGICAL_EXERCISES[idx];
    const w = getWork(ex);
    const el = e.target;
    if (el.dataset.tname !== undefined) {
      const t = w.tables[+el.dataset.tname];
      const old = t.name.trim();
      t.name = el.value;
      if (old && old !== t.name.trim()) renameRefs(w, old, t.name.trim());
    } else if (el.dataset.col !== undefined) {
      const [ti, ci] = el.dataset.col.split('-').map(Number);
      const t = w.tables[ti];
      const c = t.cols[ci];
      const old = c.name.trim();
      c.name = el.value;
      if (c.pk && old && t.name.trim()) renameRefs(w, t.name.trim(), null, old, c.name.trim());
    } else return;
    touch(w);
    refreshInPlace(w);
    persist(ex);
  }

  function onChange(e) {
    const ex = LOGICAL_EXERCISES[idx];
    const w = getWork(ex);
    const el = e.target;
    if (el.dataset.fk !== undefined) {
      const [ti, ci] = el.dataset.fk.split('-').map(Number);
      const c = w.tables[ti].cols[ci];
      c.fk = el.value;
      if (!c.fk) c.nn = false;
      else if (!c.name.trim()) c.name = c.fk.slice(c.fk.lastIndexOf('.') + 1);
      touch(w);
      persist(ex);
      rerender();
    }
  }

  /* rest: what follows #/relational/logical/practice ('' or 'N'). */
  function render(rest) {
    const n = /^\d+$/.test(rest || '') ? parseInt(rest, 10) : 1;
    idx = Math.min(Math.max(n - 1, 0), LOGICAL_EXERCISES.length - 1);
    renderExercise();
    return t('Exercise {n}: {title}', { n: idx + 1, title: LOGICAL_EXERCISES[idx].title });
  }

  /* Rail links of the practice hub, one per level; `current` marks the level being shown. */
  function links(onPage) {
    const LEVELS = { 1: t('Level 1 · one rule at a time'), 2: t('Level 2 · complete models') };
    return Object.keys(LEVELS).map(Number).map((lv) => {
      const items = LOGICAL_EXERCISES.map((e, i) => ({ e, i })).filter((x) => x.e.level === lv);
      const target = (items.find((x) => !progress.solved[x.e.id]) || items[0]).i;
      const done = items.filter((x) => progress.solved[x.e.id]).length;
      return {
        href: `${BASE}/${target + 1}`,
        label: LEVELS[lv],
        current: onPage && LOGICAL_EXERCISES[idx].level === lv,
        extra: `<span class="rail-count" title="${esc(t('{done} of {total} solved', { done, total: items.length }))}">${done}/${items.length}</span>`,
      };
    });
  }

  /* Index of an exercise by id, for links from the rule cards. */
  const hrefOf = (id) => {
    const i = LOGICAL_EXERCISES.findIndex((e) => e.id === id);
    return i < 0 ? BASE : `${BASE}/${i + 1}`;
  };

  /* Console warnings: the derived solution must match the course's reference (ex.expect). */
  function selfTest() {
    LOGICAL_EXERCISES.forEach((ex, i) => {
      const where = `LOGICAL_EXERCISES[${i}] “${ex.id}”`;
      try {
        const vars = variantsOf(ex);
        const pref = variantToStudent(vars[0]);
        const own = LogicalEngine.check(ex, pref, vars);
        if (!own.ok) console.warn(`${where}: the derived solution does not pass its own check`, own.checks.filter((c) => c.status === 'bad').map((c) => c.text));
        if (ex.expect) {
          const ref = ex.expect.map((t) => ({ name: t.name, cols: t.cols.map((c) => ({ name: c.n, pk: !!c.pk, fk: c.fk || '', nn: !!c.nn })) }));
          const r = LogicalEngine.check(ex, ref, vars);
          if (!r.ok) console.warn(`${where}: the course reference (expect) does not match the derived solution`, r.checks.filter((c) => c.status === 'bad').map((c) => c.text));
        }
      } catch (err) {
        console.warn(`${where}: ${err.message}`);
      }
    });
  }

  return { render, links, hrefOf, onClick, onInput, onChange, selfTest, sqlFor, notationHtml, variantToStudent };
})();
