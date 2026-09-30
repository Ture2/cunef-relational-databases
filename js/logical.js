'use strict';

/* ==========================================================================
   Relational databases › ER → Logical.
   The student reads an ER model and builds its tables: names, columns,
   primary keys, foreign keys (with their target) and NOT NULL on each FK.
   js/logical-engine.js derives every accepted solution and checks the design.
   Data: data/logical.js (LOGICAL_EXERCISES). Routes: #/relational/logical[/N]
   ========================================================================== */

const LogicalSection = (() => {
  const BASE = '#/relational/logical';
  const MAX_TABLES = 16;
  const MAX_COLS = 16;
  const progressStore = makeStore('er-logical-v1');
  const workStore = makeStore('er-logical-work-v1');
  const progress = Object.assign({ solved: {} }, progressStore.load());
  const saved = workStore.load();
  const work = {};
  const cache = {};                     // exercise id -> { variants }
  let idx = 0;

  const view = () => $('#view');
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

  function exerciseNav() {
    const levels = [1, 2].map((lv) => {
      const items = LOGICAL_EXERCISES.map((e, i) => ({ e, i })).filter(({ e }) => e.level === lv);
      if (!items.length) return '';
      return `<div class="ex-group"><p class="ex-group-title">${lv === 1 ? 'Level 1 · one rule at a time' : 'Level 2 · complete models'}</p><ol>${items.map(({ e, i }) => `
          <li><a href="${BASE}/${i + 1}"${i === idx ? ' aria-current="page"' : ''}>
            <span class="n">${i + 1}</span><span>${esc(e.short || e.title)}</span>${progress.solved[e.id] ? `<span class="done" title="Solved">${ICON.ok}<span class="sr-only"> (solved)</span></span>` : ''}
          </a></li>`).join('')}</ol></div>`;
    }).join('');
    const done = LOGICAL_EXERCISES.filter((e) => progress.solved[e.id]).length;
    return `<nav class="ex-nav ex-nav-grouped" aria-label="Exercises">${levels}
        <p class="count">${done} of ${LOGICAL_EXERCISES.length} solved · <button type="button" class="link" data-action="clear-all" data-fid="clear-all">Clear my progress</button></p></nav>`;
  }

  function modelTextHtml(ex) {
    const attrs = (e) => e.attrs.map((a) => {
      const kind = { key: 'key', partial: 'partial key', multivalued: 'multivalued', derived: 'derived', composite: `composite: ${(a.parts || []).join(', ')}` }[a.kind];
      return `<code>${esc(a.name)}</code>${kind ? ` <span class="muted">(${esc(kind)})</span>` : ''}`;
    }).join(', ');
    const ents = ex.entities.map((e) => `<li><strong>${esc(e.id)}</strong>${e.weak ? ' <span class="tag-sm">weak</span>' : ''}: ${attrs(e) || '<span class="muted">no attributes of its own</span>'}</li>`).join('');
    const rels = ex.relationships.map((r) => {
      const ratio = LogicalEngine.ratioOf(r);
      const ends = r.ends.map((e) => `<code>${esc(e.entity)}</code>${e.role ? ` as ${esc(e.role)}` : ''} ${esc(e.card)}`).join(' — ');
      const at = (r.attrs || []).length ? `; attributes: ${r.attrs.map((a) => `<code>${esc(a.name)}</code>`).join(', ')}` : '';
      return `<li><strong>${esc(r.id)}</strong> <span class="tag-sm">${r.identifying ? 'identifying' : esc(ratio)}</span>: ${ends}${at}</li>`;
    }).join('');
    const hier = (ex.hierarchies || []).map((h) => `<li><strong>${esc(h.super)}</strong> is specialized into ${h.subs.map((s) => `<code>${esc(s)}</code>`).join(', ')} <span class="muted">(${h.disjoint ? 'disjoint' : 'overlapping'}, ${h.total ? 'total' : 'partial'}${h.discriminator ? `, discriminator ${esc(h.discriminator)}` : ''})</span></li>`).join('');
    return `<details class="model-text"><summary>The model as text</summary>
        <div class="model-text-body">
          <h4>Entities</h4><ul class="plain">${ents}</ul>
          <h4>Relationships</h4><ul class="plain">${rels}</ul>
          ${hier ? `<h4>Hierarchies</h4><ul class="plain">${hier}</ul>` : ''}
        </div></details>`;
  }

  const RULES_HTML = `
    <details class="how-step rules-logical">
      <summary>The transformation rules</summary>
      <ol>
        <li><strong>Every entity becomes a table</strong>, named after it.</li>
        <li><strong>Every attribute becomes a column</strong> of its table. Composite attributes are split into their parts; derived attributes are left out.</li>
        <li><strong>The identifier becomes the primary key.</strong></li>
        <li><strong>M:N relationship → its own table</strong>, whose PK combines the keys of both entities (each one also a FK). Relationship attributes go in it.</li>
        <li><strong>1:N relationship → foreign key on the N side</strong>, referencing the 1 side.</li>
        <li><strong>1:1 relationship → the key of either side passes to the other.</strong></li>
        <li><strong>(0,1)/(1,1) → the key passes to the optional side.</strong></li>
      </ol>
      <ul class="plain extra-rules">
        <li><strong>Weak entity:</strong> PK = owner's key (also a FK) + its partial key.</li>
        <li><strong>Multivalued attribute:</strong> its own table, PK = owner's key + the value.</li>
        <li><strong>Unary (recursive):</strong> 1:N → a FK to the same table, named after the role; M:N → a table with two FKs to it.</li>
        <li><strong>Ternary:</strong> a table with a FK to each of the three entities.</li>
        <li><strong>Hierarchy:</strong> supertype + one table per subtype (sharing the PK), a single table with a discriminator, or (if total) only the subtype tables.</li>
        <li><strong>NOT NULL:</strong> a FK is mandatory when the min at the opposite end is 1 (look-across), optional when it is 0.</li>
      </ul>
    </details>`;

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
    return `<option value="">no FK</option>${opts.map((o) => `<option value="${esc(o)}"${o === c.fk ? ' selected' : ''}>FK → ${esc(o)}</option>`).join('')}`;
  };

  function colRowHtml(ex, w, ti, ci, targets) {
    const c = w.tables[ti].cols[ci];
    const id = `${ti}-${ci}`;
    return `<li class="col-row${c.pk ? ' is-pk' : ''}${c.fk ? ' is-fk' : ''}">
        <input class="col-name" type="text" list="dl-attrs" placeholder="column" aria-label="Column ${ci + 1} of table ${esc(w.tables[ti].name || ti + 1)}" value="${esc(c.name)}" data-col="${id}" data-fid="cn-${id}" maxlength="40" autocomplete="off" spellcheck="false">
        <button type="button" class="tog${c.pk ? ' on' : ''}" aria-pressed="${c.pk}" data-action="toggle-pk" data-t="${ti}" data-c="${ci}" data-fid="pk-${id}" title="Part of the primary key">PK</button>
        <label class="fk-pick"><span class="sr-only">Foreign key target of column ${esc(c.name || ci + 1)}</span>
          <select data-fk="${id}" data-fid="fk-${id}">${fkOptionsHtml(c, targets)}</select></label>
        <button type="button" class="tog nn${c.nn || c.pk ? ' on' : ''}" aria-pressed="${c.nn || c.pk}" data-action="toggle-nn" data-t="${ti}" data-c="${ci}" data-fid="nn-${id}" title="NOT NULL"${!c.fk || c.pk ? ' disabled' : ''}>NOT NULL</button>
        <button type="button" class="rm" aria-label="Remove column ${esc(c.name || ci + 1)}" data-action="rm-col" data-t="${ti}" data-c="${ci}" data-fid="rmc-${id}">×</button>
      </li>`;
  }

  function tableCardHtml(ex, w, ti, targets) {
    const t = w.tables[ti];
    return `<section class="tcard c${(ti % 8) + 1}" aria-label="Table ${esc(t.name || ti + 1)}">
        <header class="tcard-head">
          <span class="badge">${ti + 1}</span>
          <input class="tname" type="text" list="dl-tables" placeholder="Table name" aria-label="Name of table ${ti + 1}" value="${esc(t.name)}" data-tname="${ti}" data-fid="tn-${ti}" maxlength="40" autocomplete="off" spellcheck="false">
          <button type="button" class="rm" aria-label="Remove table ${esc(t.name || ti + 1)}" data-action="rm-table" data-t="${ti}" data-fid="rmt-${ti}">×</button>
        </header>
        <ul class="cols">${t.cols.map((_, ci) => colRowHtml(ex, w, ti, ci, targets)).join('')}</ul>
        <p class="tcard-foot"><button type="button" class="link" data-action="add-col" data-t="${ti}" data-fid="addc-${ti}"${t.cols.length >= MAX_COLS ? ' disabled' : ''}>+ Add column</button></p>
      </section>`;
  }

  /* Relational notation: Table(pk, col, fk→Ref). */
  function notationHtml(tables) {
    const rows = tables.filter((t) => t.name.trim() || t.cols.some((c) => c.name.trim())).map((t) => {
      const cols = t.cols.filter((c) => c.name.trim()).map((c) => {
        const ref = c.fk ? `<span class="ref">→${esc(c.fk.slice(0, c.fk.lastIndexOf('.')))}</span>` : '';
        return `<span class="${c.pk ? 'pkc' : ''}${c.fk ? ' fkc' : ''}">${esc(c.name.trim())}</span>${ref}${c.fk && !c.pk && !c.nn ? '<span class="nullmark" title="can be NULL">?</span>' : ''}`;
      }).join(', ');
      return `<li><strong>${esc(t.name.trim() || '(no name)')}</strong> (${cols})</li>`;
    }).join('');
    return rows ? `<ul class="notation">${rows}</ul><p class="meta">Underlined: primary key. Italic with →: foreign key. <span class="nullmark">?</span> marks a foreign key that can be NULL.</p>` : '<p class="empty">Your tables will appear here in relational notation.</p>';
  }

  const variantToStudent = (v) => v.tables.map((t) => ({
    name: t.name,
    cols: t.cols.filter((c) => !c.optional).map((c) => ({ name: c.name, pk: !!c.pk, fk: c.fk ? `${c.fk.table}.${c.fk.col}` : '', nn: !!c.nn && !c.pk })),
  }));

  function solutionHtml(ex) {
    const v = variantsOf(ex)[0];
    const tables = variantToStudent(v);
    const why = v.tables.map((t) => `<li><strong>${esc(t.name)}</strong>: ${md(t.why)}</li>`).join('');
    const others = variantsOf(ex).length > 1 ? `<p class="meta">This exercise has ${variantsOf(ex).length - 1} other accepted solution${variantsOf(ex).length > 2 ? 's' : ''} (the other side for a 1:1 foreign key, or another hierarchy strategy). The checker accepts all of them.</p>` : '';
    return `<section class="block solution" aria-labelledby="sol-h">
        <h3 id="sol-h" tabindex="-1">Reference solution</h3>
        ${notationHtml(tables)}
        <h4>Where each table comes from</h4>
        <ul class="plain">${why}</ul>
        ${others}
        ${ex.note ? `<p class="meta">${md(ex.note)}</p>` : ''}
        <p class="actions"><button type="button" class="btn ghost" data-action="use-solution" data-fid="use-solution">Load into my design</button></p>
      </section>`;
  }

  function sqlFor(tables) {
    const clean = tables.filter((t) => t.name.trim()).map((t) => ({ name: t.name.trim(), cols: t.cols.filter((c) => c.name.trim()) }));
    const ident = (s) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(s) ? s : `"${s.replace(/"/g, '""')}"`);
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
    return `-- Column types are placeholders: choose the right type for each column.\n\n${out.map((t) => {
      const lines = t.cols.map((c) => `  ${ident(c.name)} VARCHAR(100)${c.pk || c.nn ? ' NOT NULL' : ''}`);
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
    }).join('\n\n')}`;
  }

  function feedbackHtml(ex, w) {
    const r = w.result;
    if (!r) return '';
    const cls = r.ok ? 'ok' : 'bad';
    const title = r.ok ? 'Correct transformation' : `${r.nBad} thing${r.nBad === 1 ? '' : 's'} to fix`;
    const next = idx < LOGICAL_EXERCISES.length - 1 ? `<p class="actions"><a class="btn" href="${BASE}/${idx + 2}">Next exercise</a></p>` : '';
    return `<section class="feedback ${cls}" aria-labelledby="fb-title">
        <h3 id="fb-title" tabindex="-1">${title}</h3>
        <ul class="checks">${r.checks.map(checkItem).join('')}</ul>
        ${r.notes.map((n) => `<p class="insight">${md(n)}</p>`).join('')}
        ${r.ok ? `<details class="sql"><summary>SQL for this design</summary><pre><code>${esc(sqlFor(w.tables))}</code></pre>
          <p class="actions"><button type="button" class="btn ghost" data-action="copy-sql" data-fid="copy-sql">Copy SQL</button></p></details>${next}` : ''}
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
          <h2 id="ex-title">${esc(ex.title)}</h2>
          <p class="goal">${ex.source ? `${esc(ex.source)} · ` : ''}Practises: ${(ex.focus || []).map((f) => `<span class="tag-sm">${esc(f)}</span>`).join(' ')}</p>
          <p class="story">${md(ex.statement)}</p>
        </header>

        <section class="block" aria-labelledby="er-h">
          <h3 id="er-h">ER model</h3>
          <div class="scroll er-wrap">${ErDiagram.modelSvg(ex)}</div>
          ${ErDiagram.LEGEND}
          ${modelTextHtml(ex)}
          ${RULES_HTML}
        </section>

        <section class="block" aria-labelledby="mine-h">
          <h3 id="mine-h">Your logical model</h3>
          <p class="how">Create one table for each element that needs it. For every column, type its name (suggestions come from the model), press <strong>PK</strong> if it is part of the primary key, choose the table it references if it is a foreign key, and mark <strong>NOT NULL</strong> on foreign keys that are mandatory.</p>
          <datalist id="dl-attrs">${attrNames.map((a) => `<option value="${esc(a)}"></option>`).join('')}</datalist>
          <datalist id="dl-tables">${tableNames.map((a) => `<option value="${esc(a)}"></option>`).join('')}</datalist>
          <div class="tcards">${w.tables.map((_, ti) => tableCardHtml(ex, w, ti, targets)).join('')}</div>
          <p class="add-row"><button type="button" class="btn ghost" data-action="add-table" data-fid="add-table"${w.tables.length >= MAX_TABLES ? ' disabled' : ''}>Add table</button></p>
          <h4>In relational notation</h4>
          <div id="notation">${notationHtml(w.tables)}</div>
        </section>

        <div class="actions">
          <button type="button" class="btn" data-action="check" data-fid="check">Check</button>
          <button type="button" class="btn ghost" data-action="hint" data-fid="hint"${w.hints >= hints.length ? ' disabled' : ''}>${w.hints ? (w.hints >= hints.length ? 'No more hints' : 'Another hint') : 'Show hint'}</button>
          <button type="button" class="btn ghost" data-action="solution" data-fid="solution" aria-expanded="${w.solution}">${w.solution ? 'Hide solution' : 'Show solution'}</button>
          <button type="button" class="btn ghost" data-action="reset" data-fid="reset">Start over</button>
        </div>
        ${w.hints ? `<div class="hints">${hints.slice(0, w.hints).map((h, i) => `<p><strong>Hint ${i + 1}.</strong> ${md(h)}</p>`).join('')}</div>` : ''}
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
    const t = el.dataset.t !== undefined ? w.tables[+el.dataset.t] : null;
    const c = t && el.dataset.c !== undefined ? t.cols[+el.dataset.c] : null;
    switch (el.dataset.action) {
      case 'add-table':
        if (w.tables.length >= MAX_TABLES) return;
        w.tables.push(newTable());
        touch(w);
        renderExercise();
        $(`[data-fid="tn-${w.tables.length - 1}"]`)?.focus();
        announce(`Table ${w.tables.length} added.`);
        break;
      case 'rm-table': {
        const ti = +el.dataset.t;
        const name = t.name.trim();
        w.tables.splice(ti, 1);
        if (name) w.tables.forEach((x) => x.cols.forEach((y) => { if (y.fk.startsWith(`${name}.`)) { y.fk = ''; y.nn = false; } }));
        if (!w.tables.length) w.tables.push(newTable());
        touch(w);
        renderExercise();
        $(`[data-fid="tn-${Math.min(ti, w.tables.length - 1)}"]`)?.focus();
        announce(`Table ${name || ti + 1} removed.`);
        break;
      }
      case 'add-col':
        if (t.cols.length >= MAX_COLS) return;
        t.cols.push(newCol());
        touch(w);
        renderExercise();
        $(`[data-fid="cn-${el.dataset.t}-${t.cols.length - 1}"]`)?.focus();
        break;
      case 'rm-col': {
        const ci = +el.dataset.c;
        const [gone] = t.cols.splice(ci, 1);
        if (gone && gone.pk && t.name.trim()) w.tables.forEach((x) => x.cols.forEach((y) => { if (y.fk === `${t.name.trim()}.${gone.name.trim()}`) { y.fk = ''; y.nn = false; } }));
        if (!t.cols.length) t.cols.push(newCol());
        touch(w);
        renderExercise();
        ($(`[data-fid="cn-${el.dataset.t}-${Math.min(ci, t.cols.length - 1)}"]`))?.focus();
        break;
      }
      case 'toggle-pk':
        c.pk = !c.pk;
        if (!c.pk && t.name.trim()) w.tables.forEach((x) => x.cols.forEach((y) => { if (y.fk === `${t.name.trim()}.${c.name.trim()}`) { y.fk = ''; y.nn = false; } }));
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
        announce(w.result.ok ? 'Correct transformation.' : `${w.result.nBad} things to fix.`);
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
        announce('Reference solution loaded into your design.');
        break;
      case 'reset':
        if (!window.confirm('Remove all your tables for this exercise?')) return;
        work[ex.id] = { tables: [newTable()], hints: 0, result: null, solution: false };
        renderExercise();
        $('[data-fid="tn-0"]')?.focus();
        break;
      case 'clear-all':
        if (!window.confirm('Clear your saved progress in every ER → Logical exercise on this device?')) return;
        Object.keys(work).forEach((k) => delete work[k]);
        Object.keys(saved).forEach((k) => delete saved[k]);
        progress.solved = {};
        workStore.clear();
        progressStore.save(progress);
        renderExercise();
        announce('Progress cleared.');
        return;
      case 'copy-sql': {
        const text = sqlFor(w.tables);
        const done = () => { el.textContent = 'Copied'; setTimeout(() => { el.textContent = 'Copy SQL'; }, 1600); };
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

  function render(rest) {
    const n = /^\d+$/.test(rest || '') ? parseInt(rest, 10) : 1;
    idx = Math.min(Math.max(n - 1, 0), LOGICAL_EXERCISES.length - 1);
    renderExercise();
    return `Exercise ${idx + 1}: ${LOGICAL_EXERCISES[idx].title} · ER → Logical`;
  }

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

  return { render, onClick, onInput, onChange, selfTest, sqlFor };
})();
