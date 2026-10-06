'use strict';

/* ==========================================================================
   Relational databases › ER concepts › Practice.
   The student reads a lab-session statement and builds its ER / EER model:
   entities (weak or not) with their attributes, relationships with the
   (min,max) of every end, and hierarchies. js/er-practice-engine.js compares
   the model with the official one (and its accepted alternatives) and explains
   every difference; the official diagram, with the reasons behind it, can be revealed.
   Data: data/<lang>/er-practice.js (ER_PRACTICE). Routes: #/relational/er/practice[/N],
   and #/relational/er/practice/draw (the same builder on a blank page, with nothing to check),
   drawn inside the ER concepts section (js/er.js).
   ========================================================================== */

const ErPractice = (() => {
  const ROOT = '#/relational/er';
  const BASE = `${ROOT}/practice`;
  const MAX = { entities: 24, attrs: 20, rels: 24, ends: 4, rattrs: 6, hiers: 6 };
  const GROUPS = { handson: 'Hands-on exercises', solved: 'Solved activities' };
  const KINDS = [['', 'simple'], ['key', 'key'], ['partial', 'partial key'], ['multivalued', 'multivalued'], ['derived', 'derived'], ['composite', 'composite']];
  const REL_KINDS = [['', 'simple'], ['multivalued', 'multivalued'], ['derived', 'derived']];
  const progressStore = makeStore('er-practice-v1');
  const workStore = makeStore(langKey('er-practice-work-v1'));
  const viewStore = makeStore('er-practice-view-v1');
  const progress = Object.assign({ solved: {}, best: {} }, progressStore.load());
  const saved = workStore.load();
  const work = {};
  const cache = {};
  let idx = 0;
  let previewTimer = null;
  const cams = {};          // pan and zoom of the canvas, per exercise: { x, y, z } (screen = model × z + x / y)
  const hist = {};          // undo / redo, per exercise and for this visit only: { undo: [json], redo: [json], last, key, at }
  const HISTORY = 50;
  const pointers = new Map();
  let drag = null;          // the pointer gesture in progress on the canvas
  let drawFrame = 0;
  /* Where the selected item's form opens: 'diagram' (floating over the canvas) or 'list' (under its row). */
  let editMode = viewStore.load().edit === 'list' ? 'list' : 'diagram';
  /* Width of the list beside the canvas, per edit mode, set with the splitter (0: the stylesheet's default). */
  const LIST_W = { diagram: 340, list: 430, min: 240, canvas: 320 };
  const listW = Object.assign({ diagram: 0, list: 0 }, viewStore.load().listW);
  const saveView = () => viewStore.save({ edit: editMode, listW });

  const LIST = ER_PRACTICE;
  /* The blank diagram page: a pseudo-exercise, so its work is kept like an exercise's. */
  const DRAW = { id: 'draw', statement: [], hints: [], title: '' };
  let current = null;       // LIST[idx] or DRAW
  const cur = () => current || LIST[idx];
  const isDraw = () => cur() === DRAW;
  const view = () => $('#practice-slot') || $('#view');
  const enOf = (ex) => (DATA.en.ER_PRACTICE || []).find((x) => x.id === ex.id);
  const ctxOf = (ex) => ({ logical: LOGICAL_EXERCISES, en: enOf(ex), logicalEn: DATA.en.LOGICAL_EXERCISES });
  const varsOf = (ex) => cache[ex.id] || (cache[ex.id] = ErPracticeEngine.variants(ex, ctxOf(ex)));
  /* Saved work survives corrections of the official model; it is dropped only when the statement changes. */
  const sigOf = (ex) => hashOf(ex.statement);

  /* ---- Builder state --------------------------------------------------------- */

  const uidOf = (w, p) => `${p}${w.next++}`;
  const newAttr = (w) => ({ uid: uidOf(w, 'a'), name: '', kind: '', parts: '' });
  const newEntity = (w) => ({ uid: uidOf(w, 'e'), name: '', weak: false, attrs: [newAttr(w)] });
  const newEnd = () => ({ entity: '', min: '', max: '', role: '' });
  const newRel = (w) => ({ uid: uidOf(w, 'r'), name: '', identifying: false, ends: [newEnd(), newEnd()], attrs: [] });
  const newHier = (w) => ({ uid: uidOf(w, 'h'), super: '', subs: [], disjoint: null, total: null, discriminator: '' });
  function emptyModel() {
    const w = { entities: [], relationships: [], hierarchies: [], next: 1 };
    w.entities.push(newEntity(w));
    return w;
  }

  /* Saved work is checked field by field: it may come from an older version of the page. */
  function cleanModel(m) {
    if (!m || typeof m !== 'object' || !Array.isArray(m.entities)) return null;
    const str = (v, n = 60) => (typeof v === 'string' ? v.slice(0, n) : '');
    const tri = (v) => (v === true || v === false ? v : null);
    const out = { entities: [], relationships: [], hierarchies: [], next: Math.max(1, +m.next || 1) };
    const kinds = KINDS.map((k) => k[0]);
    m.entities.slice(0, MAX.entities).forEach((e) => {
      if (!e || !e.uid) return;
      out.entities.push({ uid: str(e.uid, 12), name: str(e.name), weak: !!e.weak, attrs: (Array.isArray(e.attrs) ? e.attrs : []).slice(0, MAX.attrs).filter((a) => a && a.uid).map((a) => ({ uid: str(a.uid, 12), name: str(a.name), kind: kinds.includes(a.kind) ? a.kind : '', parts: str(a.parts, 160) })) });
    });
    const ids = new Set(out.entities.map((e) => e.uid));
    (Array.isArray(m.relationships) ? m.relationships : []).slice(0, MAX.rels).forEach((r) => {
      if (!r || !r.uid) return;
      out.relationships.push({
        uid: str(r.uid, 12), name: str(r.name), identifying: !!r.identifying,
        ends: (Array.isArray(r.ends) ? r.ends : []).slice(0, MAX.ends).map((x) => ({ entity: ids.has(x && x.entity) ? x.entity : '', min: /^\d$/.test(x && x.min) ? x.min : '', max: /^(1|N)$/.test(x && x.max) ? x.max : '', role: str(x && x.role, 40) })),
        attrs: (Array.isArray(r.attrs) ? r.attrs : []).slice(0, MAX.rattrs).filter((a) => a && a.uid).map((a) => ({ uid: str(a.uid, 12), name: str(a.name), kind: ['', 'multivalued', 'derived'].includes(a.kind) ? a.kind : '' })),
      });
    });
    (Array.isArray(m.hierarchies) ? m.hierarchies : []).slice(0, MAX.hiers).forEach((h) => {
      if (!h || !h.uid) return;
      out.hierarchies.push({ uid: str(h.uid, 12), super: ids.has(h.super) ? h.super : '', subs: (Array.isArray(h.subs) ? h.subs : []).filter((s) => ids.has(s)), disjoint: tri(h.disjoint), total: tri(h.total), discriminator: str(h.discriminator) });
    });
    // Positions of the shapes, kept from a draw.io import so that the next export keeps the student's arrangement.
    if (m.layout && typeof m.layout === 'object') {
      out.layout = {};
      Object.entries(m.layout).slice(0, 400).forEach(([k, v]) => { if (Array.isArray(v) && v.length === 2 && v.every(Number.isFinite)) out.layout[str(k, 12)] = [Math.round(v[0]), Math.round(v[1])]; });
    }
    if (!out.entities.length) return null;
    return out;
  }

  function getWork(ex) {
    if (!work[ex.id]) {
      const s = saved[ex.id];
      const same = s && s.sig === sigOf(ex);
      const model = (same && cleanModel(s.model)) || emptyModel();
      work[ex.id] = {
        model,
        hints: same ? Math.min(+s.hints || 0, (ex.hints || []).length) : 0,
        result: null,
        solution: false,
        sel: firstSel(model),
        connect: false,
        tab: 'ents',
        title: same && typeof s.title === 'string' ? s.title.slice(0, 80) : '',
      };
    }
    if (!hist[ex.id]) hist[ex.id] = { undo: [], redo: [], last: JSON.stringify(work[ex.id].model), key: '', at: 0 };
    return work[ex.id];
  }

  /* The item open in the form (a uid), the tab of the list and whether clicks on entities connect them to it are not saved.
     A model that is still the blank first entity opens it, so the form is there from the start. */
  const firstSel = (m) => (m.entities.length === 1 && !m.entities[0].name ? m.entities[0].uid : null);

  function store(ex) {
    const w = work[ex.id];
    if (!w) return;
    saved[ex.id] = { sig: sigOf(ex), model: w.model, hints: w.hints };
    if (ex === DRAW) saved[ex.id].title = w.title;
    workStore.save(saved);
  }

  /* Saves the work and records the step for undo. Steps with the same key a moment apart
     (typing in one field, nudging one shape with the arrows) are one step. */
  function persist(ex, key) {
    const w = work[ex.id];
    const h = hist[ex.id];
    if (!w) return;
    if (h) {
      const now = JSON.stringify(w.model);
      if (now !== h.last) {
        if (!key || key !== h.key || Date.now() - h.at > 1500) {
          h.undo.push(h.last);
          if (h.undo.length > HISTORY) h.undo.shift();
        }
        h.redo = [];
        h.last = now;
        h.key = key || '';
        h.at = Date.now();
      }
    }
    store(ex);
  }

  /* Ctrl+Z / Ctrl+Shift+Z: puts back the model as it was one step before (or after). */
  function undo(ex, again) {
    const w = getWork(ex);
    const h = hist[ex.id];
    const from = again ? h.redo : h.undo;
    if (!from.length) { announce(again ? t('Nothing to redo.') : t('Nothing to undo.')); return; }
    (again ? h.undo : h.redo).push(h.last);
    h.last = from.pop();
    h.key = '';
    w.model = JSON.parse(h.last);
    if (w.sel && !itemInfo(w.model, w.sel)) { w.sel = null; w.connect = false; }
    touch(w);
    store(ex);
    rerender();
    announce(again ? t('Redone.') : t('Undone.'));
  }

  const touch = (w) => { w.result = null; };

  /* ---- Pieces of the page ---------------------------------------------------- */

  const entName = (m, uid) => {
    const i = m.entities.findIndex((e) => e.uid === uid);
    if (i < 0) return '';
    return m.entities[i].name.trim() || t('Entity {n}', { n: i + 1 });
  };

  /* Group tabs (hands-on / solved activities), then numbered tabs for the exercises of the group. */
  function exerciseNav() {
    const all = LIST.map((e, i) => ({ e, i }));
    const group = LIST[idx].group;
    const solved = (x) => !!progress.solved[x.e.id];
    const groupTabs = Object.keys(GROUPS).map((g) => {
      const items = all.filter((x) => x.e.group === g);
      if (!items.length) return '';
      const target = g === group ? idx : (items.find((x) => !solved(x)) || items[0]).i;
      return `<a href="${BASE}/${target + 1}"${g === group ? ' aria-current="page"' : ''}>${esc(t(GROUPS[g]))} <span>${esc(t('{done} of {total} solved', { done: items.filter(solved).length, total: items.length }))}</span></a>`;
    }).join('');
    const items = all.filter((x) => x.e.group === group);
    const link = (i) => (i >= 0 && i < LIST.length ? { href: `${BASE}/${i + 1}`, title: `${i + 1} · ${LIST[i].short || LIST[i].title}` } : null);
    return `<div class="ex-nav">
        <nav class="levels" aria-label="${esc(t('Exercise set'))}">${groupTabs}</nav>
        ${numberTabsHtml({
          label: t(GROUPS[group]),
          items: items.map((x) => ({ n: x.i + 1, href: `${BASE}/${x.i + 1}`, title: x.e.short || x.e.title, done: solved(x) })),
          current: items.findIndex((x) => x.i === idx),
          prev: link(idx - 1),
          next: link(idx + 1),
        })}
        <p class="count">${esc(t('{done} of {total} solved', { done: all.filter(solved).length, total: LIST.length }))} · <button type="button" class="link" data-action="clear-all" data-fid="clear-all">${esc(t('Clear my progress'))}</button></p>
      </div>`;
  }

  /* The statement: paragraphs, and runs of "- " lines as lists. */
  function statementHtml(ex) {
    const out = [];
    let list = [];
    const flush = () => { if (list.length) { out.push(`<ul class="story-list">${list.map((l) => `<li>${md(l)}</li>`).join('')}</ul>`); list = []; } };
    ex.statement.forEach((line) => {
      if (/^- /.test(line)) { list.push(line.slice(2)); return; }
      flush();
      out.push(`<p class="story">${md(line)}</p>`);
    });
    flush();
    return `<div class="statement">${out.join('')}</div>`;
  }

  /* Links back to the concept cards that the exercise practises. */
  const FOCUS_CARDS = [
    [/^(1:N|M:N|1:1|ternary|ternaria|unary|unaria|several relationships|varias relaciones)$/, 'relationships'],
    [/^\(min,max\)|^\(mín,máx\)$/, 'cardinality'],
    [/^(weak|débil)$/, 'weak-entity'],
    [/^(hierarchy|jerarquía)$/, 'hierarchy'],
    [/^(multivalued|multivaluado|composite|compuesto|derived|derivado|composite key|clave compuesta)$/, 'attributes'],
    [/^(relationship attribute|atributo de relación)$/, 'relationships'],
    [/^(exclusion|exclusión)$/, 'relationship-constraints'],
  ];
  function conceptLinksHtml(ex) {
    const ids = [...new Set(['steps', 'cardinality', ...(ex.focus || []).map((f) => (FOCUS_CARDS.find(([re]) => re.test(f)) || [])[1]).filter(Boolean)])];
    const cards = ids.map((id) => ER_CONCEPTS.find((c) => c.id === id)).filter(Boolean);
    return `<p class="rule-back">${BOOK_ICON}<span>${esc(t('Review:'))} ${cards.map((c) => `<a href="${ROOT}/${c.id}">${esc(c.title)}</a>`).join(' · ')}</span></p>`;
  }
  const BOOK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>';

  /* Other tools to practise with, outside the page, and the blank diagram page. */
  function toolsHtml() {
    return `${elsewhereHtml()}
      <p class="rule-back erp-draw-link">${PEN_ICON}<span><a href="${BASE}/draw">${esc(t('Draw an ER diagram'))}</a>: ${esc(t('a blank page with the same tools, with no statement and nothing to check.'))}</span></p>`;
  }
  const PEN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="M13.5 6.5l4 4"/></svg>';

  function elsewhereHtml() {
    return `<details class="erp-tools">
        <summary>${esc(t('Practise elsewhere too'))}</summary>
        <div class="erp-tools-body">
          <p>${esc(t('Draw the diagram first, on paper or in a diagram tool, and then enter it here to check it.'))}</p>
          <ul class="plain">
            <li><strong>diagrams.net (draw.io)</strong>: ${esc(t('free, in the browser, and the tool of the lab sessions. The starter file has this statement and the course\'s Chen shapes to copy.'))}
              <span class="erp-tool-actions"><button type="button" class="btn ghost" data-action="dl-drawio" data-fid="dl-drawio">${esc(t('Download the starter file (.drawio)'))}</button>
              <a class="btn ghost" href="https://app.diagrams.net/" target="_blank" rel="noopener">${esc(t('Open diagrams.net'))}</a></span></li>
            <li><strong>ERDPlus</strong>: ${esc(t('free, in the browser, in Chen notation; it can also turn your ER diagram into a relational schema, a good bridge to ER → Logical.'))}
              <span class="erp-tool-actions"><a class="btn ghost" href="https://erdplus.com/" target="_blank" rel="noopener">${esc(t('Open ERDPlus'))}</a></span></li>
            <li><strong>${esc(t('Ask Claude'))}</strong>: ${esc(t('the button in the top bar copies this page, with your model, into a tutoring prompt that asks for hints, not for the solution.'))}</li>
          </ul>
        </div>
      </details>`;
  }

  const optionsHtml = (pairs, value) => pairs.map(([v, label]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(label)}</option>`).join('');
  const entityOptions = (m, value, blank) => `<option value="">${esc(blank)}</option>${m.entities.map((e) => `<option value="${e.uid}"${e.uid === value ? ' selected' : ''} data-opt="${e.uid}">${esc(entName(m, e.uid))}</option>`).join('')}`;

  function attrRowHtml(e, a, k) {
    const fid = `${e.uid}-${a.uid}`;
    const kind = a.kind || '';
    return `<li class="erp-attr kind-${kind || 'simple'}">
        <input class="col-name" type="text" placeholder="${esc(t('attribute'))}" aria-label="${esc(t('Attribute {n} of {entity}', { n: k + 1, entity: e.name || t('the entity') }))}" value="${esc(a.name)}" data-f="attr-name" data-e="${e.uid}" data-a="${a.uid}" data-fid="an-${fid}" maxlength="60" autocomplete="off" spellcheck="false">
        <label class="erp-kind"><span class="sr-only">${esc(t('Kind of attribute {attr}', { attr: a.name || k + 1 }))}</span>
          <select data-f="attr-kind" data-e="${e.uid}" data-a="${a.uid}" data-fid="ak-${fid}">${optionsHtml(KINDS.map(([v, l]) => [v, t(l)]), kind)}</select></label>
        <button type="button" class="rm" aria-label="${esc(t('Remove attribute {attr}', { attr: a.name || k + 1 }))}" data-action="rm-attr" data-e="${e.uid}" data-a="${a.uid}" data-fid="ar-${fid}">×</button>
        ${kind === 'composite' ? `<input class="col-name erp-parts" type="text" placeholder="${esc(t('parts, separated by commas'))}" aria-label="${esc(t('Parts of {attr}', { attr: a.name || k + 1 }))}" value="${esc(a.parts)}" data-f="attr-parts" data-e="${e.uid}" data-a="${a.uid}" data-fid="ap-${fid}" maxlength="160" autocomplete="off" spellcheck="false">` : ''}
      </li>`;
  }

  function entityCardHtml(m, e, i) {
    return `<section class="tcard erp-card c${(i % 8) + 1}${e.weak ? ' is-weak' : ''}" aria-label="${esc(t('Entity {name}', { name: entName(m, e.uid) }))}">
        <header class="tcard-head">
          <span class="badge" aria-hidden="true">${i + 1}</span>
          <input class="tname" type="text" placeholder="${esc(t('Entity name'))}" aria-label="${esc(t('Name of entity {n}', { n: i + 1 }))}" value="${esc(e.name)}" data-f="ent-name" data-e="${e.uid}" data-fid="en-${e.uid}" maxlength="60" autocomplete="off" spellcheck="false">
          <button type="button" class="tog${e.weak ? ' on' : ''}" aria-pressed="${e.weak}" data-action="tog-weak" data-e="${e.uid}" data-fid="ew-${e.uid}" title="${esc(t('Weak entity: identified only within another entity'))}">${esc(t('Weak'))}</button>
          <button type="button" class="rm" aria-label="${esc(t('Remove entity {name}', { name: entName(m, e.uid) }))}" data-action="rm-ent" data-e="${e.uid}" data-fid="er-${e.uid}">×</button>
        </header>
        <ul class="cols">${e.attrs.map((a, k) => attrRowHtml(e, a, k)).join('')}</ul>
        <p class="tcard-foot"><button type="button" class="link" data-action="add-attr" data-e="${e.uid}" data-fid="aa-${e.uid}"${e.attrs.length >= MAX.attrs ? ' disabled' : ''}>+ ${esc(t('Add attribute'))}</button></p>
      </section>`;
  }

  /* The look-across reading of one end, written out ("For one Branch: at least one Account"). */
  function endReading(m, r, k) {
    const x = r.ends[k];
    if (!x.entity || x.min === '' || x.max === '') return '';
    const card = ErPracticeEngine.parseCard(`(${x.min},${x.max})`);
    if (!card) return '';
    const label = (y) => `${entName(m, y.entity)}${y.role ? ` (${y.role})` : ''}`;
    const others = r.ends.filter((y, j) => j !== k && y.entity).map(label);
    if (!others.length) return '';
    const s = ErPracticeEngine.readCard(card, label(x), others);
    return md(s.charAt(0).toUpperCase() + s.slice(1));
  }

  function endRowHtml(m, r, k) {
    const x = r.ends[k];
    const fid = `${r.uid}-${k}`;
    const mins = [['', t('min')], ['0', '0'], ['1', '1'], ['2', '2'], ['3', '3']];
    const maxs = [['', t('max')], ['1', '1'], ['N', 'N']];
    return `<li class="end-row">
        <label class="end-ent"><span class="sr-only">${esc(t('Entity at end {n} of {rel}', { n: k + 1, rel: r.name || t('the relationship') }))}</span>
          <select data-f="end-ent" data-r="${r.uid}" data-k="${k}" data-fid="ee-${fid}">${entityOptions(m, x.entity, t('choose an entity'))}</select></label>
        <span class="card-pick" role="group" aria-label="${esc(t('Cardinality at this end'))}">(<select data-f="end-min" data-r="${r.uid}" data-k="${k}" data-fid="emin-${fid}" aria-label="${esc(t('Minimum'))}">${optionsHtml(mins, x.min)}</select>,<select data-f="end-max" data-r="${r.uid}" data-k="${k}" data-fid="emax-${fid}" aria-label="${esc(t('Maximum'))}">${optionsHtml(maxs, x.max)}</select>)</span>
        <input class="col-name end-role" type="text" placeholder="${esc(t('role (optional)'))}" aria-label="${esc(t('Role at end {n}', { n: k + 1 }))}" value="${esc(x.role)}" data-f="end-role" data-r="${r.uid}" data-k="${k}" data-fid="ero-${fid}" maxlength="40" autocomplete="off" spellcheck="false">
        <button type="button" class="rm" aria-label="${esc(t('Remove end {n}', { n: k + 1 }))}" data-action="rm-end" data-r="${r.uid}" data-k="${k}" data-fid="erm-${fid}"${r.ends.length <= 2 ? ' disabled' : ''}>×</button>
        <p class="end-read" data-read="${r.uid}-${k}">${endReading(m, r, k)}</p>
      </li>`;
  }

  function relAttrRowHtml(r, a, k) {
    const fid = `${r.uid}-${a.uid}`;
    return `<li class="erp-attr">
        <input class="col-name" type="text" placeholder="${esc(t('attribute'))}" aria-label="${esc(t('Attribute {n} of {rel}', { n: k + 1, rel: r.name || t('the relationship') }))}" value="${esc(a.name)}" data-f="rattr-name" data-r="${r.uid}" data-a="${a.uid}" data-fid="rn-${fid}" maxlength="60" autocomplete="off" spellcheck="false">
        <label class="erp-kind"><span class="sr-only">${esc(t('Kind of attribute {attr}', { attr: a.name || k + 1 }))}</span>
          <select data-f="rattr-kind" data-r="${r.uid}" data-a="${a.uid}" data-fid="rk-${fid}">${optionsHtml(REL_KINDS.map(([v, l]) => [v, t(l)]), a.kind || '')}</select></label>
        <button type="button" class="rm" aria-label="${esc(t('Remove attribute {attr}', { attr: a.name || k + 1 }))}" data-action="rm-rattr" data-r="${r.uid}" data-a="${a.uid}" data-fid="rr-${fid}">×</button>
      </li>`;
  }

  function relCardHtml(m, r, i) {
    return `<section class="tcard erp-card erp-rel c3${r.identifying ? ' is-identifying' : ''}" aria-label="${esc(t('Relationship {name}', { name: r.name || i + 1 }))}">
        <header class="tcard-head">
          <span class="badge erp-diamond" aria-hidden="true">${i + 1}</span>
          <input class="tname" type="text" placeholder="${esc(t('Relationship name (a verb)'))}" aria-label="${esc(t('Name of relationship {n}', { n: i + 1 }))}" value="${esc(r.name)}" data-f="rel-name" data-r="${r.uid}" data-fid="rn-${r.uid}" maxlength="60" autocomplete="off" spellcheck="false">
          <button type="button" class="tog${r.identifying ? ' on' : ''}" aria-pressed="${r.identifying}" data-action="tog-ident" data-r="${r.uid}" data-fid="ri-${r.uid}" title="${esc(t('Identifying relationship: it gives a weak entity its identity'))}">${esc(t('Identifying'))}</button>
          <button type="button" class="rm" aria-label="${esc(t('Remove relationship {name}', { name: r.name || i + 1 }))}" data-action="rm-rel" data-r="${r.uid}" data-fid="rx-${r.uid}">×</button>
        </header>
        <p class="erp-sub">${esc(t('Participants, with the look-across (min,max) of each end'))}</p>
        <ol class="cols ends">${r.ends.map((_, k) => endRowHtml(m, r, k)).join('')}</ol>
        <p class="tcard-foot"><button type="button" class="link" data-action="add-end" data-r="${r.uid}" data-fid="ra-${r.uid}"${r.ends.length >= MAX.ends ? ' disabled' : ''}>+ ${esc(t('Add a participant (ternary)'))}</button></p>
        ${r.attrs.length ? `<p class="erp-sub">${esc(t('Attributes of the relationship'))}</p><ul class="cols">${r.attrs.map((a, k) => relAttrRowHtml(r, a, k)).join('')}</ul>` : ''}
        <p class="tcard-foot"><button type="button" class="link" data-action="add-rattr" data-r="${r.uid}" data-fid="raa-${r.uid}"${r.attrs.length >= MAX.rattrs ? ' disabled' : ''}>+ ${esc(t('Add an attribute of the relationship'))}</button></p>
      </section>`;
  }

  function hierCardHtml(m, h, i) {
    const seg = (prop, yes, no) => `<span class="erp-seg" role="group" aria-label="${esc(prop === 'disjoint' ? t('Disjoint or overlapping') : t('Total or partial'))}">
        <button type="button" class="tog${h[prop] === true ? ' on' : ''}" aria-pressed="${h[prop] === true}" data-action="hier-prop" data-h="${h.uid}" data-p="${prop}" data-v="1" data-fid="h${prop}1-${h.uid}">${esc(yes)}</button><button type="button" class="tog${h[prop] === false ? ' on' : ''}" aria-pressed="${h[prop] === false}" data-action="hier-prop" data-h="${h.uid}" data-p="${prop}" data-v="0" data-fid="h${prop}0-${h.uid}">${esc(no)}</button></span>`;
    const subs = m.entities.filter((e) => e.uid !== h.super).map((e) => `<label class="erp-check"><input type="checkbox" data-f="hier-sub" data-h="${h.uid}" data-s="${e.uid}" data-fid="hs-${h.uid}-${e.uid}"${h.subs.includes(e.uid) ? ' checked' : ''}><span data-opt="${e.uid}">${esc(entName(m, e.uid))}</span></label>`).join('');
    return `<section class="tcard erp-card erp-hier c5" aria-label="${esc(t('Hierarchy {n}', { n: i + 1 }))}">
        <header class="tcard-head">
          <span class="badge erp-tri" aria-hidden="true">${i + 1}</span>
          <label class="erp-super"><span>${esc(t('Supertype'))}</span>
            <select data-f="hier-super" data-h="${h.uid}" data-fid="hsup-${h.uid}">${entityOptions(m, h.super, t('choose an entity'))}</select></label>
          <button type="button" class="rm" aria-label="${esc(t('Remove hierarchy {n}', { n: i + 1 }))}" data-action="rm-hier" data-h="${h.uid}" data-fid="hx-${h.uid}">×</button>
        </header>
        <div class="erp-hier-body">
          <fieldset class="subs-pick"><legend>${esc(t('Subtypes'))}</legend>${subs || `<p class="muted">${esc(t('Add the subtypes as entities first.'))}</p>`}</fieldset>
          <p class="erp-props">${seg('disjoint', t('d · disjoint'), t('o · overlapping'))}${seg('total', t('total'), t('partial'))}</p>
          <input class="col-name" type="text" placeholder="${esc(t('discriminator (optional)'))}" aria-label="${esc(t('Discriminator of hierarchy {n}', { n: i + 1 }))}" value="${esc(h.discriminator)}" data-f="hier-disc" data-h="${h.uid}" data-fid="hd-${h.uid}" maxlength="60" autocomplete="off" spellcheck="false">
        </div>
      </section>`;
  }

  /* Large models keep at least 80% of their size (the frame scrolls) instead of shrinking to unreadable text. */
  const readableSvg = (svg) => svg.replace(/style="max-width:(\d+)px"/, (m, w) => `style="max-width:${w}px;min-width:${Math.min(+w, Math.max(560, Math.round(w * 0.8)))}px"`);

  /* ---- Canvas: the diagram is the editor ----------------------------------------
     The student's model is drawn with the course notation; every shape can be selected
     (it opens its form in the inspector), dragged, or moved with the arrow keys.
     Positions go to model.layout (centres in pixels, as a draw.io import keeps them), so
     the next export keeps the arrangement. Until the student moves something, the
     layout is automatic; the first move fixes the entities where they are drawn (so that
     none jumps), and a relationship or hierarchy gets a position only once it is moved:
     until then it stays between its entities and follows them. */

  const relLabel = (m, r) => r.name.trim() || t('Relationship {name}', { name: m.relationships.indexOf(r) + 1 });
  const hasLayout = (m) => !!m.layout && m.entities.some((e) => m.layout[e.uid]);

  /* Name and one-line summary of an item, for the list, the shapes' accessible names and the inspector. */
  function itemInfo(m, uid) {
    const e = findEnt(m, uid);
    if (e) {
      const attrs = e.attrs.map((a) => a.name.trim()).filter(Boolean).join(', ');
      return { label: t('Entity {name}', { name: entName(m, uid) }), title: entName(m, uid), detail: [e.weak ? t('weak') : '', attrs].filter(Boolean).join(' · ') };
    }
    const r = findRel(m, uid);
    if (r) {
      const ends = r.ends.filter((x) => x.entity).map((x) => `${entName(m, x.entity)} (${x.min || '?'},${x.max || '?'})`);
      return { label: t('Relationship {name}', { name: relLabel(m, r) }), title: relLabel(m, r), detail: ends.join(t(' and ')) };
    }
    const h = findHier(m, uid);
    if (!h) return null;
    const n = t('Hierarchy {n}', { n: m.hierarchies.indexOf(h) + 1 });
    const detail = h.super ? t('{super} is specialized into {subs}', { super: entName(m, h.super), subs: h.subs.map((s) => entName(m, s)).join(', ') || '?' }) : '';
    return { label: n, title: n, detail };
  }

  /* The model as the canvas draws it: every item, also unnamed or unconnected ones, keyed by uid;
     `at` from the automatic layout, and `xy` once the student has placed the shapes. */
  function canvasModel(m) {
    const ids = new Set(m.entities.map((e) => e.uid));
    const parts = (s) => String(s || '').split(/[,;]/).map((p) => p.trim()).filter(Boolean);
    const model = {
      entities: m.entities.map((e) => ({
        id: e.uid, label: entName(m, e.uid), weak: e.weak,
        attrs: e.attrs.filter((a) => a.name.trim()).map((a) => ({ name: a.name.trim(), kind: a.kind || undefined, parts: a.kind === 'composite' ? parts(a.parts) : undefined })),
      })),
      relationships: m.relationships.map((r) => ({
        id: r.uid, label: relLabel(m, r), identifying: r.identifying,
        ends: r.ends.filter((x) => ids.has(x.entity)).map((x) => ({ entity: x.entity, card: `(${x.min || '?'},${x.max || '?'})`, role: x.role.trim() || undefined })),
        attrs: r.attrs.filter((a) => a.name.trim()).map((a) => ({ name: a.name.trim(), kind: a.kind || undefined })),
      })),
      hierarchies: m.hierarchies.map((h) => ({ id: h.uid, super: ids.has(h.super) ? h.super : '', subs: h.subs.filter((s) => ids.has(s) && s !== h.super), disjoint: h.disjoint, total: h.total, discriminator: h.discriminator.trim() || undefined })),
    };
    // Grid cells for everything connected; loose relationships and hierarchies wait in a row below.
    const laid = ErPracticeEngine.autoLayout({ entities: model.entities, relationships: model.relationships.filter((r) => r.ends.length), hierarchies: model.hierarchies.filter((h) => h.super) });
    const at = {};
    [...laid.entities, ...laid.relationships, ...laid.hierarchies].forEach((x) => { at[x.id] = x.at; });
    const cells = Object.values(at);
    const row = Math.max(0, ...cells.map((c) => c[1])) + 2;
    let col = Math.min(0, ...cells.map((c) => c[0]));
    [...model.relationships, ...model.hierarchies].forEach((x) => { x.at = at[x.id] || [(col += 2) - 2, row]; });
    model.entities.forEach((e) => { e.at = at[e.id]; });
    if (!hasLayout(m)) return model;

    // Placed by the student: stored centres; new entities go in a row below, relationships and
    // hierarchies not moved yet sit between their entities (and follow them).
    const L = m.layout;
    const byId = Object.fromEntries(model.entities.map((e) => [e.id, e]));
    const stored = model.entities.filter((e) => L[e.id]).map((e) => L[e.id]);
    const left = Math.min(...stored.map((p) => p[0]));
    const below = Math.max(...stored.map((p) => p[1])) + 200;
    let k = 0;
    const spot = () => [left + 230 * k++, below];
    model.entities.forEach((e) => { e.xy = L[e.id] || spot(); });
    model.relationships.forEach((r) => {
      const xs = [...new Set(r.ends.map((x) => x.entity))].map((id) => byId[id].xy);
      if (L[r.id]) r.xy = L[r.id];
      else if (xs.length === 1) r.xy = [xs[0][0] + 150, xs[0][1] + 110];
      else if (xs.length) r.xy = [xs.reduce((s, p) => s + p[0], 0) / xs.length, xs.reduce((s, p) => s + p[1], 0) / xs.length];
      else r.xy = spot();
    });
    model.hierarchies.forEach((h) => {
      const sup = byId[h.super];
      const subs = h.subs.map((s) => byId[s].xy);
      if (L[h.id]) h.xy = L[h.id];
      else if (!sup) h.xy = spot();
      else h.xy = [sup.xy[0], subs.length ? (sup.xy[1] + subs.reduce((s, p) => s + p[1], 0) / subs.length) / 2 : sup.xy[1] + 120];
    });
    return model;
  }

  /* Attributes of each shape: focusable, named, and pressed open while its form is in the inspector. */
  const shapeTag = (m, w) => (kind, item) => {
    const info = itemInfo(m, item.id);
    const name = info ? `${info.label}${info.detail ? `. ${info.detail}` : ''}` : item.id;
    return ` data-sel="${esc(item.id)}" data-fid="shape-${esc(item.id)}" tabindex="0" role="button" aria-expanded="${w.sel === item.id}" aria-label="${esc(name)}"`;
  };

  function canvasSvg(m, w) {
    try {
      return ErDiagram.modelSvg(canvasModel(m), { tag: shapeTag(m, w), alt: t('Your model as a diagram') });
    } catch (e) {
      return '';
    }
  }

  /* The diagram as a file of its own: drawn again without the canvas' selection and focus marks,
     with the course's diagram styles (light theme) written into it, so it looks the same anywhere. */
  function standaloneSvg(m, title) {
    const rules = [...document.styleSheets].flatMap((sh) => { try { return [...sh.cssRules]; } catch (e) { return []; } });
    const root = rules.find((r) => r.selectorText === ':root');
    const token = (name, depth = 0) => {
      const v = root ? root.style.getPropertyValue(name).trim() : '';
      return depth > 4 ? v : v.replace(/var\((--[\w-]+)\)/g, (s, n) => token(n, depth + 1));
    };
    const resolve = (css) => css.replace(/var\((--[\w-]+)\)/g, (s, n) => token(n));
    const SHAPES = ['.er-ent', '.er-ent-head', '.er-rel', '.er-att', '.er-isa', '.er-line', '.er-edge', '.er-name', '.er-label', '.er-attr', '.er-attr.derived', '.er-card'];
    const css = rules.filter((r) => SHAPES.includes(r.selectorText)).map((r) => resolve(r.cssText)).join('\n');
    const svg = ErDiagram.modelSvg(canvasModel(m), { tag: () => '', alt: title }).replace(/ data-(?:kind|cx|cy)="[^"]*"/g, '');
    const box = (svg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 100 100';
    const [x, y, w, h] = box.split(' ').map(Number);
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="${w}" height="${h}" font-family="${esc(token('--sans'))}">
<title>${esc(title)}</title>
<style>${css}</style>
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${esc(token('--surface') || '#fff')}"/>
${svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}
</svg>`;
  }

  /* A file name from the diagram's title. */
  const fileNameOf = (w) => w.title.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'er-diagram';

  const camOf = () => cams[cur().id];
  const viewBoxOf = (svg) => svg.getAttribute('viewBox').split(' ').map(Number);

  /* Puts the drawing where the camera says: the svg sits at its model coordinates inside the stage. */
  function applyCam() {
    const cv = $('#erp-preview');
    const svg = cv && cv.querySelector('svg');
    const c = camOf();
    if (!svg || !c) return;
    const [x, y, w, h] = viewBoxOf(svg);
    Object.assign(svg.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    svg.parentNode.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.z})`;
    const v = $('#erp-zoom-v');
    if (v) v.textContent = `${Math.round(c.z * 100)}%`;
  }

  /* The whole model in view, centred (not larger than 125%). On the first view of a big model the
     text would be too small to read: it starts at 60% instead, on the first entity (Fit still shows it all). */
  function fitCam(first) {
    const cv = $('#erp-preview');
    const svg = cv && cv.querySelector('svg');
    if (!svg) return;
    const [x, y, w, h] = viewBoxOf(svg);
    // The floating inspector hides the canvas' right side: the drawing fits in what is left, when that is enough.
    const insp = $('#erp-insp');
    const free = insp && getComputedStyle(insp).position === 'absolute' ? insp.getBoundingClientRect().left - cv.getBoundingClientRect().left - 12 : cv.clientWidth;
    const cw = free > cv.clientWidth * 0.4 ? free : cv.clientWidth;
    const ch = cv.clientHeight;
    const z = Math.max(ZMIN, Math.min(1.25, cw / w, ch / h));
    const ent = svg.querySelector('[data-kind="entity"]');
    if (first && z < 0.6 && ent) cams[cur().id] = { z: 0.6, x: cw / 2 - +ent.dataset.cx * 0.6, y: ch / 2 - +ent.dataset.cy * 0.6 };
    else cams[cur().id] = { z, x: (cw - w * z) / 2 - x * z, y: (ch - h * z) / 2 - y * z };
    applyCam();
  }
  const ZMIN = 0.2;

  /* Zooms by f, keeping the canvas point (px, py) still. */
  function zoomAt(px, py, f) {
    const c = camOf();
    if (!c) return;
    const z = Math.max(ZMIN, Math.min(2, c.z * f));
    c.x = px - ((px - c.x) * z) / c.z;
    c.y = py - ((py - c.y) * z) / c.z;
    c.z = z;
    applyCam();
  }

  function drawCanvas() {
    const stage = $('#erp-preview .erp-stage');
    if (!stage) return;
    const w = getWork(cur());
    stage.innerHTML = canvasSvg(w.model, w);
    applyCam();
  }

  /* Pans the canvas so that a shape is not hidden behind the inspector or past an edge;
     with `centre`, so that it sits in the middle of the free part of the canvas. */
  function ensureVisible(uid, centre) {
    const cv = $('#erp-preview');
    const el = cv && cv.querySelector(`[data-sel="${CSS.escape(uid)}"]`);
    const c = camOf();
    if (!el || !c) return;
    const a = cv.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const insp = $('#erp-insp');
    const right = insp && getComputedStyle(insp).position === 'absolute' ? insp.getBoundingClientRect().left - 12 : a.right;
    let dx = 0;
    let dy = 0;
    if (centre) {
      dx = (a.left + right) / 2 - (b.left + b.right) / 2;
      dy = (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2;
    } else {
      if (b.right > right) dx = right - 16 - b.right;
      if (b.left + dx < a.left) dx = a.left + 16 - b.left;
      if (b.bottom > a.bottom) dy = a.bottom - 16 - b.bottom;
      if (b.top + dy < a.top) dy = a.top + 16 - b.top;
    }
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    c.x += dx;
    c.y += dy;
    applyCam();
  }

  /* The first move fixes the entities where they are drawn now, so that none jumps when the automatic
     layout changes. Relationships and hierarchies are stored only when they are moved themselves. */
  function freezeLayout(m) {
    if (hasLayout(m)) return;
    m.layout = m.layout || {};
    document.querySelectorAll('#erp-preview [data-kind="entity"]').forEach((g) => { m.layout[g.dataset.sel] = [Math.round(+g.dataset.cx), Math.round(+g.dataset.cy)]; });
  }

  /* Moves a shape (and the attribute positions kept from an import, which go with it). */
  function moveShape(m, uid, x, y) {
    freezeLayout(m);
    const L = m.layout;
    const nx = Math.round(x);
    const ny = Math.round(y);
    const old = L[uid];
    const owner = findEnt(m, uid) || findRel(m, uid);
    if (old && owner) owner.attrs.forEach((a) => { if (L[a.uid]) L[a.uid] = [L[a.uid][0] + nx - old[0], L[a.uid][1] + ny - old[1]]; });
    L[uid] = [nx, ny];
  }

  /* Debounced redraw while typing: the canvas, the rows of the list and the tab counts follow the names
     (the rows are rewritten in place: the form below the open one keeps the focus). */
  function schedulePreview(ex, w) {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      keepFocus(drawCanvas);
      const m = w.model;
      document.querySelectorAll('#view .erp-row[data-sel]').forEach((row) => {
        const tab = tabOf(m, row.dataset.sel);
        const x = tab && listOf(m, tab).find((y) => y.uid === row.dataset.sel);
        if (x) row.innerHTML = rowInner(m, tab, x);
      });
      TABS.forEach(([k, label]) => { const b = $(`#erp-tab-${k}`); if (b) b.innerHTML = tabLabel(m, k, label); });
      titleTruncated();
    }, 400);
  }

  /* ---- Canvas pieces --------------------------------------------------------------- */

  /* The bar above the selected item's form: connect (relationships and hierarchies) and close. */
  function formBarHtml(m, w) {
    const conn = findRel(m, w.sel) || findHier(m, w.sel);
    return `<div class="erp-insp-bar">
          ${conn ? `<button type="button" class="tog${w.connect ? ' on' : ''}" aria-pressed="${w.connect}" data-action="connect" data-fid="connect">${esc(t('Connect entities'))}</button>` : ''}
          <span class="spacer"></span>
          <button type="button" class="link" data-action="close-insp" data-fid="close-insp">${esc(t('Close'))}</button>
        </div>`;
  }

  /* The form of an item: the same card in the floating inspector and under its row in the list. */
  function cardOf(m, uid) {
    const e = findEnt(m, uid);
    if (e) return entityCardHtml(m, e, m.entities.indexOf(e));
    const r = findRel(m, uid);
    if (r) return relCardHtml(m, r, m.relationships.indexOf(r));
    const h = findHier(m, uid);
    return h ? hierCardHtml(m, h, m.hierarchies.indexOf(h)) : '';
  }
  const hueOf = (m, uid) => { const i = m.entities.findIndex((e) => e.uid === uid); return i >= 0 ? `c${(i % 8) + 1}` : findRel(m, uid) ? 'c3' : 'c5'; };

  function inspectorHtml(m, w) {
    const card = cardOf(m, w.sel);
    if (!card) return '';
    return `<aside class="erp-insp ${hueOf(m, w.sel)}" id="erp-insp" aria-label="${esc(itemInfo(m, w.sel).label)}">
        ${formBarHtml(m, w)}
        ${card}
      </aside>`;
  }

  function statusText(m, w) {
    const r = w.connect && findRel(m, w.sel);
    if (r) return t('Click the entities of {rel}, in the diagram or in the list. Press Escape when you are done.', { rel: relLabel(m, r) });
    if (w.connect && findHier(m, w.sel)) return t('Click the supertype first, then each subtype. Press Escape when you are done.');
    return t('Select a shape or a row to edit it. With the keyboard, Tab to a shape and press Enter.');
  }

  /* ---- The list beside the canvas: a tab per kind of item, one line per item ------------ */

  const TABS = [['ents', 'Entities'], ['rels', 'Relationships'], ['hiers', 'Hierarchies']];
  const listOf = (m, tab) => ({ ents: m.entities, rels: m.relationships, hiers: m.hierarchies }[tab]);
  const tabOf = (m, uid) => TABS.map((x) => x[0]).find((k) => listOf(m, k).some((x) => x.uid === uid)) || '';
  /* The Chen shape of each kind of item, as the row's icon. */
  const GLYPH = {
    ents: '<svg class="erp-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="1.5" y="3.5" width="13" height="9"/></svg>',
    rels: '<svg class="erp-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 1.8 14.2 8 8 14.2 1.8 8Z"/></svg>',
    hiers: '<svg class="erp-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 2.2 14.4 13.8H1.6Z"/></svg>',
  };

  /* What an item still lacks before it can be checked (short, for the row). */
  function missingOf(m, tab, x) {
    const out = [];
    if (tab === 'ents') {
      if (!x.name.trim()) out.push(t('no name'));
      // Weak entities and subtypes take their identity from another entity: they need no key of their own.
      const sub = m.hierarchies.some((h) => h.subs.includes(x.uid));
      if (!x.weak && !sub && !x.attrs.some((a) => a.name.trim() && a.kind === 'key')) out.push(t('no key'));
    } else if (tab === 'rels') {
      if (!x.name.trim()) out.push(t('no name'));
      if (x.ends.some((y) => !y.entity)) out.push(t('an end has no entity'));
      if (x.ends.some((y) => y.min === '' || y.max === '')) out.push(t('a (min,max) is missing'));
    } else {
      if (!x.super) out.push(t('no supertype'));
      if (!x.subs.length) out.push(t('no subtypes'));
      if (x.disjoint === null || x.total === null) out.push(t('d/o or total/partial not set'));
    }
    return out;
  }

  /* One line in the course notation: ENTITY key · n attributes; Rel  A (1,1) · B (0,N); Super: subs · d, total. */
  function summaryHtml(m, tab, x) {
    if (tab === 'ents') {
      const named = x.attrs.filter((a) => a.name.trim());
      const keys = named.filter((a) => a.kind === 'key' || a.kind === 'partial');
      return `<span class="erp-nm${x.name.trim() ? '' : ' is-blank'}">${esc(entName(m, x.uid))}</span>${x.weak ? `<span class="tag-sm">${esc(t('weak'))}</span>` : ''}
        <span class="erp-det">${keys.map((a) => `<span class="${a.kind === 'key' ? 'pkc' : 'dash-u'}">${esc(a.name)}</span>`).join(', ')}${keys.length ? ' · ' : ''}${esc(named.length === 1 ? t('1 attribute') : t('{n} attributes', { n: named.length }))}</span>`;
    }
    if (tab === 'rels') {
      const ends = x.ends.map((y) => `${y.entity ? esc(entName(m, y.entity)) : '?'} <span class="erp-cd">(${esc(y.min || '?')},${esc(y.max || '?')})</span>`).join(' · ');
      return `<span class="erp-nm${x.name.trim() ? '' : ' is-blank'}">${esc(x.name.trim() || t('Unnamed relationship'))}</span>${x.identifying ? `<span class="tag-sm">${esc(t('identifying'))}</span>` : ''}
        <span class="erp-det">${ends}</span>`;
    }
    const props = [x.disjoint === null ? '' : x.disjoint ? 'd' : 'o', x.total === null ? '' : x.total ? t('total') : t('partial')].filter(Boolean).join(', ');
    return `<span class="erp-nm${x.super ? '' : ' is-blank'}">${esc(x.super ? entName(m, x.super) : t('no supertype'))}</span>
      <span class="erp-det">${x.subs.map((s) => esc(entName(m, s))).join(', ') || '?'}${props ? ` · ${esc(props)}` : ''}</span>`;
  }

  function rowInner(m, tab, x) {
    const miss = missingOf(m, tab, x);
    const todo = miss.length ? `<span class="erp-todo"><span aria-hidden="true">${esc(miss[0])}${miss.length > 1 ? ` +${miss.length - 1}` : ''}</span><span class="sr-only">${esc(t('To finish: {list}', { list: miss.join(', ') }))}</span></span>` : '';
    return `${GLYPH[tab]}<span class="erp-sum">${summaryHtml(m, tab, x)}</span>${todo}`;
  }

  function tabLabel(m, tab, label) {
    const list = listOf(m, tab);
    const todo = list.filter((x) => missingOf(m, tab, x).length).length;
    return `${esc(t(label))} <span class="erp-n">${list.length}</span>${todo ? `<span class="erp-dot" aria-hidden="true"></span><span class="sr-only">${esc(t('{n} to finish', { n: todo }))}</span>` : ''}`;
  }

  /* A row of the list. The selected one is marked; in list mode it carries its form below it. */
  function itemHtml(m, w, tab, x, i) {
    const open = w.sel === x.uid;
    const inline = open && editMode === 'list';
    const hue = tab === 'ents' ? `c${(i % 8) + 1}` : tab === 'rels' ? 'c3' : 'c5';
    const controls = !open ? '' : ` aria-controls="${inline ? `erp-form-${x.uid}` : 'erp-insp'}"`;
    return `<li class="erp-item ${hue}${open ? ' is-open' : ''}" data-item="${x.uid}">
        <button type="button" class="erp-row" data-action="select" data-sel="${x.uid}" data-fid="item-${x.uid}" aria-expanded="${open}"${controls}>${rowInner(m, tab, x)}</button>
        ${inline ? `<div class="erp-inline" id="erp-form-${x.uid}">${formBarHtml(m, w)}${cardOf(m, x.uid)}</div>` : ''}
      </li>`;
  }

  function panelHtml(m, w) {
    const tabs = TABS.map(([k, label]) => `<button type="button" role="tab" id="erp-tab-${k}" class="erp-tab" aria-selected="${w.tab === k}" aria-controls="erp-panel" tabindex="${w.tab === k ? 0 : -1}" data-action="tab" data-tab="${k}" data-fid="tab-${k}">${tabLabel(m, k, label)}</button>`).join('');
    const list = listOf(m, w.tab);
    const empty = { rels: t('No relationships yet.'), hiers: isDraw() ? t('No hierarchies yet.') : t('No hierarchies. Most exercises do not need one.') }[w.tab];
    return `<div class="erp-work">
          <div class="erp-tabs" role="tablist" aria-label="${esc(t('Parts of your model'))}">${tabs}</div>
          <div class="erp-panel" id="erp-panel" role="tabpanel" aria-labelledby="erp-tab-${w.tab}">
            ${list.length ? `<ul class="erp-items">${list.map((x, i) => itemHtml(m, w, w.tab, x, i)).join('')}</ul>` : `<p class="empty">${esc(empty)}</p>`}
          </div>
        </div>`;
  }

  /* Rows whose text is cut get the whole of it as a tooltip. */
  function titleTruncated() {
    document.querySelectorAll('#view .erp-row').forEach((row) => {
      const cut = [...row.querySelectorAll('.erp-nm, .erp-det')].some((s) => s.scrollWidth > s.clientWidth + 1);
      if (cut) row.title = row.querySelector('.erp-sum').textContent.replace(/\s+/g, ' ').trim();
      else row.removeAttribute('title');
    });
  }

  /* Brings the selected row into view inside the list (or the page, when the list does not scroll and its form is there). */
  function showItem(uid) {
    const li = $(`#view [data-item="${CSS.escape(uid)}"]`);
    const panel = $('#erp-panel');
    if (!li || !panel) return;
    if (panel.scrollHeight <= panel.clientHeight + 1) {
      if (editMode === 'list' && li.scrollIntoView) li.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }
    const r = li.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    if (r.top < p.top) panel.scrollTop += r.top - p.top;
    else if (r.bottom > p.bottom) panel.scrollTop += Math.min(r.bottom - p.bottom, r.top - p.top);
  }

  function builderHtml(m, w) {
    const mode = (k, label) => `<button type="button" class="tog${editMode === k ? ' on' : ''}" aria-pressed="${editMode === k}" data-action="edit-mode" data-mode="${k}" data-fid="mode-${k}">${esc(label)}</button>`;
    const add = (action, tab, label, full) => `<button type="button" class="btn ghost erp-add" data-action="${action}" data-fid="${action}"${full ? ' disabled' : ''}>${GLYPH[tab]}${esc(label)}</button>`;
    return `<div class="erp-toolbar" role="group" aria-label="${esc(t('Diagram tools'))}">
          ${add('add-ent', 'ents', t('Add entity'), m.entities.length >= MAX.entities)}
          ${add('add-rel', 'rels', t('Add relationship'), m.relationships.length >= MAX.rels)}
          ${add('add-hier', 'hiers', t('Add hierarchy'), m.hierarchies.length >= MAX.hiers)}
          <span class="spacer"></span>
          <span class="erp-mode" role="group" aria-label="${esc(t('Where to edit'))}">${mode('diagram', t('Edit on the diagram'))}${mode('list', t('Edit in the list'))}</span>
        </div>
        <div class="erp-board${editMode === 'list' ? ' is-list' : ''}"${listW[editMode] ? ` style="--erp-list:${listW[editMode]}px"` : ''}>
          ${panelHtml(m, w)}
          ${splitHtml()}
          <div class="erp-view">
            <div class="erp-canvas${w.connect ? ' is-connecting' : ''}" id="erp-preview"><div class="erp-stage">${canvasSvg(m, w)}</div></div>
            <div class="erp-zoom" role="group" aria-label="${esc(t('Zoom'))}">
              <button type="button" data-action="zoom-out" data-fid="zoom-out" aria-label="${esc(t('Zoom out'))}" title="${esc(t('Zoom out'))}">−</button>
              <output class="erp-zoom-v" id="erp-zoom-v" aria-live="off"></output>
              <button type="button" data-action="zoom-in" data-fid="zoom-in" aria-label="${esc(t('Zoom in'))}" title="${esc(t('Zoom in'))}">+</button>
              <button type="button" class="erp-zoom-fit" data-action="zoom-fit" data-fid="zoom-fit">${esc(t('Fit'))}</button>
            </div>
            ${w.sel && editMode === 'diagram' ? inspectorHtml(m, w) : ''}
          </div>
        </div>
        <p class="erp-status${w.connect ? ' is-connecting' : ''}" id="erp-status">${esc(statusText(m, w))}</p>
        ${keysHtml()}
        ${ErDiagram.LEGEND}`;
  }

  /* The bar between the list and the canvas: drag it, or focus it and use the arrow keys, to share the width. */
  function splitHtml() {
    const now = listW[editMode] || LIST_W[editMode];
    return `<div class="erp-split" role="separator" aria-orientation="vertical" aria-controls="erp-panel" aria-label="${esc(t('Width of the list'))}" aria-valuenow="${now}" aria-valuemin="${LIST_W.min}" tabindex="0" data-fid="split" title="${esc(t('Drag to resize. Double-click to reset.'))}"></div>`;
  }

  /* The shortcuts of the canvas, in a line under it; the mouse ones only where there is a mouse, pinch only on touch screens. */
  const MOD = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl';
  function keysHtml() {
    const k = (s) => `<kbd>${esc(s)}</kbd>`;
    const g = (s) => `<span class="erp-gesture">${esc(s)}</span>`;
    const item = (keys, what, cls) => `<li${cls ? ` class="${cls}"` : ''}><span class="erp-k">${keys}</span> ${esc(what)}</li>`;
    return `<ul class="erp-keys" aria-label="${esc(t('Canvas shortcuts'))}">
        ${item(`${k(MOD)} + ${g(t('wheel'))}`, t('zoom'), 'is-mouse')}
        ${item(g(t('pinch')), t('zoom'), 'is-touch')}
        ${item(`${k('+')} ${k('−')}`, t('zoom in or out'))}
        ${item(k('0'), t('fit'))}
        ${item(g(t('drag')), t('move a shape, or pan from the background'))}
        ${item(`${k('←')}${k('↑')}${k('→')}${k('↓')}`, t('nudge the selected shape'))}
        ${item(k(t('Delete')), t('remove it'))}
        ${item(`${k(MOD)} + ${k('Z')}`, t('undo'))}
        ${item(`${k(MOD)} + ${k('Shift')} + ${k('Z')}`, t('redo'))}
        ${item(k('Esc'), t('close'))}
      </ul>`;
  }

  const toFix = (n) => (n === 1 ? t('1 thing to fix') : t('{n} things to fix', { n }));

  /* What the last draw.io import read, and what it could not. */
  function importNoteHtml(w) {
    const r = w.importNote;
    if (!r) return '';
    if (r.error) return `<p class="insight erp-import-bad">${esc(r.error)}</p>`;
    const n = { entities: r.entities, rels: r.rels };
    const head = isDraw() ? t('Imported {entities} entities and {rels} relationships.', n) : t('Imported {entities} entities and {rels} relationships. Press Check to compare them with the official solution.', n);
    const list = r.unread.length ? `<p class="meta">${esc(r.unread.length === 1 ? t('1 shape could not be read:') : t('{n} shapes could not be read:', { n: r.unread.length }))}</p><ul class="plain">${r.unread.map((u) => `<li><strong>${esc(u.label)}</strong>: ${esc(u.reason)}</li>`).join('')}</ul>` : '';
    return `<p class="insight">${esc(head)}</p>${list}`;
  }

  function feedbackHtml(ex, w) {
    const r = w.result;
    if (!r) return '';
    const cls = r.ok ? 'ok' : 'bad';
    const title = r.ok ? t('Your model matches the official one') : toFix(r.nBad);
    const next = r.ok && idx < LIST.length - 1 ? `<a class="btn" href="${BASE}/${idx + 2}">${esc(t('Next exercise'))}</a>` : '';
    const logical = r.ok && typeof ex.model === 'string' ? `<a class="btn ghost" href="${LogicalSection.hrefOf(ex.model)}">${esc(t('Now transform it into tables'))}</a>` : '';
    return `<section class="feedback ${cls}" aria-labelledby="fb-title">
        <h3 id="fb-title" tabindex="-1">${esc(title)}</h3>
        <p class="score-line"><span class="score-text">${esc(t('Score: {score}%', { score: r.score }))}</span><span class="score-meter" aria-hidden="true"><span style="width:${r.score}%"></span></span></p>
        <ul class="checks">${r.checks.map(checkItem).join('')}</ul>
        ${r.ok ? `<p class="insight">${esc(t('Compare it with the official solution: its reasons may differ from yours even where the model is the same.'))}</p>` : ''}
        ${next || logical ? `<p class="actions">${next}${logical}</p>` : ''}
      </section>`;
  }

  /* Labels of the elements named by metadata keys, in the language of the page. */
  function keyLabels(model) {
    const out = {};
    model.entities.forEach((e) => {
      out[e._key] = e.id;
      e.attrs.forEach((a) => { out[a._key] = `${e.id} · ${a.name}`; });
    });
    model.relationships.forEach((r) => {
      out[r._key] = r.id;
      (r.attrs || []).forEach((a) => { out[a._key] = `${r.id} · ${a.name}`; });
    });
    (model.hierarchies || []).forEach((h) => { out[h._key] = t('hierarchy of {super}', { super: h.super }); });
    return out;
  }

  function solutionHtml(ex) {
    const vars = varsOf(ex);
    const ref = vars[0].model;
    const labels = keyLabels(ref);
    const why = Object.entries(ex.why || {}).filter(([k]) => labels[k]).map(([k, v]) => `<li><strong>${esc(labels[k])}</strong>: ${md(v)}</li>`).join('');
    const alts = vars.slice(1).map((v) => `<li>${md(v.label)}</li>`).join('');
    const list = (items) => items.map((x) => `<li>${md(x)}</li>`).join('');
    return `<section class="block solution" aria-labelledby="sol-h">
        <h3 id="sol-h" tabindex="-1">${esc(t('Official solution'))}</h3>
        <p class="actions"><button type="button" class="btn ghost" data-action="dl-solution" data-fid="dl-solution">${esc(t('Download the official solution (.drawio)'))}</button>
        <button type="button" class="btn ghost" data-action="use-solution" data-fid="use-solution">${esc(t('Load into my design'))}</button></p>
        <div class="scroll er-wrap">${readableSvg(ErDiagram.modelSvg(ref))}</div>
        ${ErDiagram.LEGEND}
        ${ErDiagram.modelTextHtml(ref)}
        ${why ? `<h4>${esc(t('Why the model is like this'))}</h4><ul class="plain why-list">${why}</ul>` : ''}
        ${alts ? `<h4>${esc(t('Also accepted'))}</h4><ul class="plain">${alts}</ul>` : ''}
        ${(ex.assumptions || []).length ? `<h4>${esc(t('Assumptions'))}</h4><ul class="plain">${list(ex.assumptions)}</ul>` : ''}
        ${(ex.corrections || []).length ? `<details class="model-text"><summary>${esc(t('Differences from the published course solution'))}</summary><div class="model-text-body"><p class="meta">${esc(t('This solution was reviewed before it was published here. These are the changes:'))}</p><ul class="plain">${list(ex.corrections)}</ul></div></details>` : ''}
        ${typeof ex.model === 'string' ? `<p class="actions"><a class="btn ghost" href="${LogicalSection.hrefOf(ex.model)}">${esc(t('Now transform it into tables'))}</a></p>` : ''}
      </section>`;
  }

  function renderExercise() {
    const ex = LIST[idx];
    const w = getWork(ex);
    const m = w.model;
    const hints = ex.hints || [];
    view().innerHTML = `
      ${exerciseNav()}
      <article class="exercise er-practice" aria-labelledby="ex-title">
        <header class="ex-head">
          <h2 id="ex-title">${idx + 1} · ${esc(ex.title)}</h2>
          <p class="goal">${esc(ex.source)} · ${esc(t('Practises:'))} ${(ex.focus || []).map((f) => `<span class="tag-sm">${esc(f)}</span>`).join(' ')}</p>
          ${statementHtml(ex)}
          ${conceptLinksHtml(ex)}
          ${toolsHtml()}
        </header>

        <section class="block" aria-labelledby="mine-h">
          <h3 id="mine-h">${esc(t('Your ER model'))}</h3>
          <p class="how">${t('Add an entity for each thing the statement keeps data about, with its attributes (mark the key). Then add the relationships: choose the entity at each end and its <strong>(min,max)</strong>, read across: the cardinality next to an entity says how many of it go with one occurrence of the other end. Add a hierarchy when the statement distinguishes types with data of their own.')}</p>

          ${builderHtml(m, w)}
          <div class="erp-drawio">
            <p class="erp-drawio-actions">
              <button type="button" class="btn ghost" data-action="dl-mine" data-fid="dl-mine">${esc(t('Download my model (.drawio)'))}</button>
              <label class="btn ghost erp-import" data-fid="import-label">${esc(t('Import from draw.io'))}<input type="file" class="sr-only" accept=".drawio,.xml,application/xml,text/xml" data-f="import" data-fid="import"></label>
            </p>
            <p class="meta">${esc(t('Edit your model in diagrams.net, save it and import it here to check it. Shapes drawn by hand are read too: boxes as entities, diamonds as relationships, ellipses as attributes, triangles as hierarchies, and a (min,max) on each line.'))}</p>
            <div id="erp-import-note" role="status">${importNoteHtml(w)}</div>
          </div>
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
    bindCanvas();
  }

  /* The blank diagram: a title, the builder and its files; no statement, checks or score. */
  function renderDraw() {
    const w = getWork(DRAW);
    const m = w.model;
    view().innerHTML = `
      <article class="exercise er-practice erp-draw" aria-labelledby="ex-title">
        <section class="block erp-draw-sheet">
          <h2 id="ex-title" class="erp-draw-h"><label class="sr-only" for="erp-draw-name">${esc(t('Diagram title'))}</label><input id="erp-draw-name" class="erp-draw-name" type="text" value="${esc(w.title)}" placeholder="${esc(t('Untitled diagram'))}" data-f="draw-title" data-fid="draw-title" maxlength="80" autocomplete="off" spellcheck="false"></h2>
          <p class="how">${esc(t('Draw any ER model with the course notation. Nothing is checked here; the diagram is saved on this device, and you can download it for diagrams.net or as an image.'))}</p>
          ${builderHtml(m, w)}
          <div class="erp-drawio">
            <p class="erp-drawio-actions">
              <button type="button" class="btn ghost" data-action="dl-mine" data-fid="dl-mine">${esc(t('Download (.drawio)'))}</button>
              <button type="button" class="btn ghost" data-action="dl-svg" data-fid="dl-svg">${esc(t('Download as image (.svg)'))}</button>
              <label class="btn ghost erp-import" data-fid="import-label">${esc(t('Import from draw.io'))}<input type="file" class="sr-only" accept=".drawio,.xml,application/xml,text/xml" data-f="import" data-fid="import"></label>
            </p>
            <p class="meta">${esc(t('Open the .drawio file in diagrams.net to go on there, and import it back here whenever you like. Shapes drawn by hand are read too: boxes as entities, diamonds as relationships, ellipses as attributes, triangles as hierarchies, and a (min,max) on each line.'))}</p>
            <div id="erp-import-note" role="status">${importNoteHtml(w)}</div>
          </div>
        </section>

        <div class="actions">
          <a class="btn ghost" href="${BASE}">${esc(t('Back to the exercises'))}</a>
          <span class="spacer"></span>
          <button type="button" class="link" data-action="reset" data-fid="reset">${esc(t('Start over'))}</button>
        </div>
      </article>`;
    bindCanvas();
  }

  const paint = () => (isDraw() ? renderDraw() : renderExercise());

  /* ---- Canvas gestures ------------------------------------------------------------
     One pointer on a shape drags it (a click selects it); on the background it pans
     (a click closes the inspector). Two pointers pinch to zoom; Ctrl + wheel zooms. */

  function bindCanvas() {
    const cv = $('#erp-preview');
    if (!cv) return;
    cv.addEventListener('pointerdown', onPointerDown);
    cv.addEventListener('pointermove', onPointerMove);
    cv.addEventListener('pointerup', onPointerUp);
    cv.addEventListener('pointercancel', onPointerUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    if (camOf()) applyCam(); else fitCam(true);
    titleTruncated();
    bindSplit();
  }

  /* ---- Splitter between the list and the canvas ------------------------------------ */

  const splitMax = (board) => Math.max(LIST_W.min, board.clientWidth - LIST_W.canvas);
  /* Sets the list's width (clamped so the canvas keeps room), without drawing the page again. */
  function setListW(px) {
    const board = $('.erp-board');
    const bar = $('.erp-split');
    if (!board || !bar) return;
    const v = Math.round(Math.min(splitMax(board), Math.max(LIST_W.min, px)));
    listW[editMode] = v;
    board.style.setProperty('--erp-list', `${v}px`);
    bar.setAttribute('aria-valuenow', v);
    titleTruncated();
  }
  const listWNow = () => { const p = $('.erp-work'); return p ? p.getBoundingClientRect().width : LIST_W[editMode]; };

  function bindSplit() {
    const bar = $('.erp-split');
    const board = $('.erp-board');
    if (!bar || !board) return;
    bar.setAttribute('aria-valuemax', Math.round(splitMax(board)));
    let drag = null;
    bar.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      ev.preventDefault();
      bar.setPointerCapture(ev.pointerId);
      drag = { x: ev.clientX, w: listWNow() };
      bar.classList.add('is-dragging');
      document.body.classList.add('erp-resizing');
    });
    bar.addEventListener('pointermove', (ev) => { if (drag) setListW(drag.w + ev.clientX - drag.x); });
    const end = () => {
      if (!drag) return;
      drag = null;
      bar.classList.remove('is-dragging');
      document.body.classList.remove('erp-resizing');
      saveView();
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
    bar.addEventListener('dblclick', () => resetListW());
  }
  function resetListW() {
    const board = $('.erp-board');
    listW[editMode] = 0;
    if (board) board.style.removeProperty('--erp-list');
    const bar = $('.erp-split');
    if (bar) bar.setAttribute('aria-valuenow', LIST_W[editMode]);
    saveView();
    titleTruncated();
  }

  const pinchOf = () => {
    const [a, b] = [...pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  function onPointerDown(ev) {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    const cv = ev.currentTarget;
    const c = camOf();
    if (!c) return;
    ev.preventDefault();
    cv.setPointerCapture(ev.pointerId);
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size === 2) { drag = { pinch: pinchOf() }; return; }
    const shape = ev.target.closest('[data-sel]');
    drag = { uid: shape ? shape.dataset.sel : null, sx: ev.clientX, sy: ev.clientY, moved: false, cx: shape ? +shape.dataset.cx : 0, cy: shape ? +shape.dataset.cy : 0, camX: c.x, camY: c.y };
  }

  function onPointerMove(ev) {
    if (!drag || !pointers.has(ev.pointerId)) return;
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const cv = ev.currentTarget;
    const c = camOf();
    if (drag.pinch) {
      if (pointers.size < 2) return;
      const p = pinchOf();
      const box = cv.getBoundingClientRect();
      c.x += p.x - drag.pinch.x;
      c.y += p.y - drag.pinch.y;
      zoomAt(p.x - box.left, p.y - box.top, p.d / drag.pinch.d);
      drag.pinch = p;
      return;
    }
    const dx = ev.clientX - drag.sx;
    const dy = ev.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    if (!drag.uid) {
      cv.classList.add('is-panning');
      c.x = drag.camX + dx;
      c.y = drag.camY + dy;
      applyCam();
      return;
    }
    moveShape(getWork(cur()).model, drag.uid, drag.cx + dx / c.z, drag.cy + dy / c.z);
    if (!drawFrame) drawFrame = requestAnimationFrame(() => { drawFrame = 0; drawCanvas(); });
  }

  function onPointerUp(ev) {
    pointers.delete(ev.pointerId);
    const d = drag;
    if (!d) return;
    if (d.pinch || pointers.size) { if (!pointers.size) drag = null; return; }
    drag = null;
    ev.currentTarget.classList.remove('is-panning');
    if (ev.type === 'pointercancel') return;
    const ex = cur();
    const w = getWork(ex);
    if (d.moved) {
      if (d.uid) persist(ex);
      return;
    }
    if (d.uid) pick(d.uid, 'shape');
    else if (w.sel) { w.sel = null; w.connect = false; paint(); }
  }

  function onWheel(ev) {
    if (!ev.ctrlKey && !ev.metaKey) return;   // a plain wheel scrolls the page
    ev.preventDefault();
    const box = ev.currentTarget.getBoundingClientRect();
    zoomAt(ev.clientX - box.left, ev.clientY - box.top, ev.deltaY < 0 ? 1.15 : 1 / 1.15);
  }

  /* Selects an item, from a shape ('shape'), a row of the list ('row') or the keyboard on a shape ('key'):
     the canvas and the list show the same selection. While connecting, an entity is added to the open item instead. */
  function pick(uid, how) {
    const ex = cur();
    const w = getWork(ex);
    const m = w.model;
    if (w.connect && w.sel !== uid && findEnt(m, uid)) { connect(ex, w, uid); return; }
    if (how === 'row' && w.sel === uid && !w.connect) { closeForm(w, true); return; }   // a second click on the open row closes it
    if (w.sel !== uid) { w.sel = uid; w.connect = false; }
    w.tab = tabOf(m, uid) || w.tab;
    paint();
    ensureVisible(uid, how === 'row');
    showItem(uid);
    const first = findEnt(m, uid) ? `en-${uid}` : findRel(m, uid) ? `rn-${uid}` : `hsup-${uid}`;
    const el = $(`#view [data-fid="${CSS.escape(how === 'key' ? first : how === 'row' ? `item-${uid}` : `shape-${uid}`)}"]`);
    if (el) el.focus({ preventScroll: how !== 'key' });
    // Below the canvas (narrow screens), the form scrolls into view.
    const insp = $('#erp-insp');
    if (insp && getComputedStyle(insp).position !== 'absolute' && insp.scrollIntoView) insp.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* Closes the open form and gives the focus back to its row (from the list) or its shape. */
  function closeForm(w, toRow) {
    const uid = w.sel;
    w.sel = null;
    w.connect = false;
    paint();
    const back = (toRow && $(`#view [data-fid="${CSS.escape(`item-${uid}`)}"]`)) || $(`#view [data-fid="${CSS.escape(`shape-${uid}`)}"]`);
    if (back) back.focus({ preventScroll: true });
  }

  /* Connecting: an entity fills the first empty end of the relationship (or a new one); for a hierarchy
     the first entity is the supertype and the next ones are toggled as subtypes. */
  function connect(ex, w, uid) {
    const m = w.model;
    const r = findRel(m, w.sel);
    const h = findHier(m, w.sel);
    const name = entName(m, uid);
    if (r) {
      const end = r.ends.find((x) => !x.entity);
      if (end) end.entity = uid;
      else if (r.ends.length < MAX.ends) r.ends.push({ ...newEnd(), entity: uid });
      else { announce(t('No more participants can be added.')); return; }
      announce(t('{entity} added to {rel}.', { entity: name, rel: relLabel(m, r) }));
    } else if (h) {
      if (h.super === uid) return;
      if (!h.super) { h.super = uid; h.subs = h.subs.filter((s) => s !== uid); announce(t('{entity} is now the supertype.', { entity: name })); }
      else if (h.subs.includes(uid)) { h.subs = h.subs.filter((s) => s !== uid); announce(t('{entity} removed from the subtypes.', { entity: name })); }
      else { h.subs.push(uid); announce(t('{entity} added as a subtype.', { entity: name })); }
    } else return;
    touch(w);
    persist(ex);
    rerender();
  }

  /* While connecting on the diagram, the list shows the entities, so that a row can be clicked as well. */
  const connectTab = (w) => { if (w.connect && editMode === 'diagram') w.tab = 'ents'; };

  /* Removes an item with its own remove button's action. */
  function removeItem(m, uid) {
    const action = findEnt(m, uid) ? 'rm-ent' : findRel(m, uid) ? 'rm-rel' : findHier(m, uid) ? 'rm-hier' : '';
    if (action) onClick({ dataset: { action, e: uid, r: uid, h: uid } });
  }

  function onKeydown(e) {
    const el = e.target;
    if (!el.closest || !$('#erp-preview')) return;
    const ex = cur();
    const w = getWork(ex);
    const m = w.model;
    const typing = el.matches('input:not([type="checkbox"]):not([type="file"]), select, textarea');
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    // Undo and redo; in a text field the field's own undo applies.
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (key === 'z' || key === 'y')) {
      if (typing) return;
      e.preventDefault();
      undo(ex, key === 'y' || e.shiftKey);
      return;
    }
    // The splitter: the arrows widen or narrow the list (Shift: in bigger steps), Home and End go to the limits, Enter resets it.
    if (el.classList.contains('erp-split')) {
      const step = e.shiftKey ? 96 : 24;
      const now = listWNow();
      const to = { ArrowLeft: now - step, ArrowRight: now + step, Home: 0, End: Infinity }[e.key];
      if (e.key === 'Enter') { e.preventDefault(); resetListW(); return; }
      if (to === undefined) return;
      e.preventDefault();
      setListW(to);
      saveView();
      return;
    }
    // + and − zoom the canvas, 0 fits it, from anywhere in the list or the canvas except the forms.
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && ['+', '=', '-', '0'].includes(e.key)
        && el.closest('.erp-board') && !el.closest('.erp-insp, .erp-inline')) {
      const cv = $('#erp-preview');
      e.preventDefault();
      if (e.key === '0') fitCam();
      else zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, e.key === '-' ? 0.8 : 1.25);
      return;
    }
    // Tabs of the list: the arrows move between them.
    if (el.dataset.action === 'tab') {
      const keys = TABS.map((x) => x[0]);
      const i = keys.indexOf(el.dataset.tab);
      const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: keys.length - 1 }[e.key];
      if (j === undefined) return;
      e.preventDefault();
      w.tab = keys[(j + keys.length) % keys.length];
      paint();
      focusFid(`tab-${w.tab}`);
      return;
    }
    // Delete or Backspace removes the focused shape or row, or else the selected item; never from inside a form.
    if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && !e.ctrlKey && !e.metaKey) {
      const on = el.closest('#erp-preview [data-sel], .erp-row[data-sel]');
      const uid = on ? on.dataset.sel : el === document.body || el.closest('#erp-preview') ? w.sel : null;
      if (uid && itemInfo(m, uid)) { e.preventDefault(); removeItem(m, uid); }
      return;
    }
    const shape = el.closest('#erp-preview [data-sel]');
    if (shape) {
      const uid = shape.dataset.sel;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(uid, 'key'); return; }
      const step = e.shiftKey ? 40 : 10;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (d) {
        e.preventDefault();
        moveShape(m, uid, +shape.dataset.cx + d[0], +shape.dataset.cy + d[1]);
        keepFocus(drawCanvas);
        ensureVisible(uid);
        persist(ex, `move-${uid}`);
        return;
      }
    }
    if (e.key !== 'Escape' || !(el === document.body || el.closest('.erp-board, .erp-toolbar'))) return;
    if (w.connect) { w.connect = false; rerender(); announce(t('Connecting stopped.')); return; }
    if (w.sel) closeForm(w, !!el.closest('.erp-work'));
  }
  // Keys pressed with nothing focused (after a click on the canvas background) reach the builder too.
  document.addEventListener('keydown', (e) => { if (e.target === document.body && $('#erp-preview')) onKeydown(e); });

  /* ---- Events ---------------------------------------------------------------- */

  const rerender = () => keepFocus(paint);
  const findEnt = (m, uid) => m.entities.find((e) => e.uid === uid);
  const findRel = (m, uid) => m.relationships.find((r) => r.uid === uid);
  const findHier = (m, uid) => m.hierarchies.find((h) => h.uid === uid);
  const focusFid = (fid) => { const el = $(`#view [data-fid="${CSS.escape(fid)}"]`); if (el) el.focus(); };

  function onClick(el) {
    const ex = cur();
    const w = getWork(ex);
    const m = w.model;
    const e = el.dataset.e ? findEnt(m, el.dataset.e) : null;
    const r = el.dataset.r ? findRel(m, el.dataset.r) : null;
    const h = el.dataset.h ? findHier(m, el.dataset.h) : null;
    if (ex === DRAW && /^(check|hint|solution|use-solution|clear-all|dl-drawio|dl-solution)$/.test(el.dataset.action)) return;
    switch (el.dataset.action) {
      case 'add-ent': {
        if (m.entities.length >= MAX.entities) return;
        const ne = newEntity(m);
        m.entities.push(ne);
        w.sel = ne.uid;
        w.connect = false;
        w.tab = 'ents';
        touch(w);
        paint();
        ensureVisible(ne.uid);
        showItem(ne.uid);
        focusFid(`en-${ne.uid}`);
        announce(t('Entity {n} added.', { n: m.entities.length }));
        break;
      }
      case 'rm-ent': {
        if (!e) return;
        const i = m.entities.indexOf(e);
        const name = entName(m, e.uid);
        m.entities.splice(i, 1);
        m.relationships.forEach((x) => x.ends.forEach((y) => { if (y.entity === e.uid) y.entity = ''; }));
        m.hierarchies.forEach((x) => { if (x.super === e.uid) x.super = ''; x.subs = x.subs.filter((s) => s !== e.uid); });
        if (m.layout) [e.uid, ...e.attrs.map((a) => a.uid)].forEach((k) => delete m.layout[k]);
        if (!m.entities.length) m.entities.push(newEntity(m));
        w.sel = null;
        touch(w);
        paint();
        focusFid(`shape-${m.entities[Math.min(i, m.entities.length - 1)].uid}`);
        announce(t('Entity {name} removed.', { name }));
        break;
      }
      case 'add-attr': {
        if (!e || e.attrs.length >= MAX.attrs) return;
        const na = newAttr(m);
        e.attrs.push(na);
        touch(w);
        paint();
        focusFid(`an-${e.uid}-${na.uid}`);
        break;
      }
      case 'rm-attr': {
        if (!e) return;
        const i = e.attrs.findIndex((a) => a.uid === el.dataset.a);
        e.attrs.splice(i, 1);
        touch(w);
        paint();
        const next = e.attrs[Math.min(i, e.attrs.length - 1)];
        focusFid(next ? `an-${e.uid}-${next.uid}` : `aa-${e.uid}`);
        break;
      }
      case 'tog-weak':
        e.weak = !e.weak;
        touch(w);
        rerender();
        break;
      case 'add-rel': {
        if (m.relationships.length >= MAX.rels) return;
        const nr = newRel(m);
        m.relationships.push(nr);
        // A new relationship starts in connect mode: the next entities clicked become its ends.
        w.sel = nr.uid;
        w.connect = true;
        w.tab = 'rels';
        connectTab(w);
        touch(w);
        paint();
        ensureVisible(nr.uid);
        showItem(nr.uid);
        focusFid(`rn-${nr.uid}`);
        announce(t('Relationship {n} added.', { n: m.relationships.length }));
        break;
      }
      case 'rm-rel': {
        if (!r) return;
        const i = m.relationships.indexOf(r);
        m.relationships.splice(i, 1);
        if (m.layout) [r.uid, ...r.attrs.map((a) => a.uid)].forEach((k) => delete m.layout[k]);
        w.sel = null;
        w.connect = false;
        touch(w);
        paint();
        const next = m.relationships[Math.min(i, m.relationships.length - 1)];
        focusFid(next ? `shape-${next.uid}` : 'add-rel');
        announce(t('Relationship removed.'));
        break;
      }
      case 'tog-ident':
        r.identifying = !r.identifying;
        touch(w);
        rerender();
        break;
      case 'add-end':
        if (!r || r.ends.length >= MAX.ends) return;
        r.ends.push(newEnd());
        touch(w);
        paint();
        focusFid(`ee-${r.uid}-${r.ends.length - 1}`);
        break;
      case 'rm-end': {
        if (!r || r.ends.length <= 2) return;
        const k = +el.dataset.k;
        r.ends.splice(k, 1);
        touch(w);
        paint();
        focusFid(`ee-${r.uid}-${Math.min(k, r.ends.length - 1)}`);
        break;
      }
      case 'add-rattr': {
        if (!r || r.attrs.length >= MAX.rattrs) return;
        const na = { uid: uidOf(m, 'a'), name: '', kind: '' };
        r.attrs.push(na);
        touch(w);
        paint();
        focusFid(`rn-${r.uid}-${na.uid}`);
        break;
      }
      case 'rm-rattr': {
        if (!r) return;
        r.attrs = r.attrs.filter((a) => a.uid !== el.dataset.a);
        touch(w);
        paint();
        focusFid(`raa-${r.uid}`);
        break;
      }
      case 'add-hier': {
        if (m.hierarchies.length >= MAX.hiers) return;
        const nh = newHier(m);
        m.hierarchies.push(nh);
        w.sel = nh.uid;
        w.connect = true;
        w.tab = 'hiers';
        connectTab(w);
        touch(w);
        paint();
        ensureVisible(nh.uid);
        showItem(nh.uid);
        focusFid(`hsup-${nh.uid}`);
        break;
      }
      case 'rm-hier': {
        if (!h) return;
        m.hierarchies.splice(m.hierarchies.indexOf(h), 1);
        if (m.layout) delete m.layout[h.uid];
        w.sel = null;
        w.connect = false;
        touch(w);
        paint();
        focusFid('add-hier');
        break;
      }
      case 'hier-prop':
        if (!h) return;
        h[el.dataset.p] = el.dataset.v === '1';
        touch(w);
        rerender();
        break;
      case 'check': {
        w.result = ErPracticeEngine.check(ex, m, { ...ctxOf(ex), vars: varsOf(ex) });
        if (w.result.ok && !progress.solved[ex.id]) progress.solved[ex.id] = true;
        if (w.result.score > (progress.best[ex.id] || 0)) progress.best[ex.id] = w.result.score;
        progressStore.save(progress);
        paint();
        reveal($('#fb-title'));
        announce(w.result.ok ? t('Your model matches the official one.') : `${toFix(w.result.nBad)}.`);
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
        if (!window.confirm(t('Replace your model with the official solution?'))) return;
        w.model = ErPracticeEngine.fromModel(varsOf(ex)[0].model);
        w.solution = false;
        w.sel = null;
        w.connect = false;
        delete cams[ex.id];
        touch(w);
        paint();
        $('[data-fid="check"]')?.focus();
        announce(t('Official solution loaded into your design.'));
        break;
      case 'reset':
        if (!window.confirm(ex === DRAW ? t('Remove your whole diagram?') : t('Remove your whole model for this exercise?'))) return;
        work[ex.id] = { model: emptyModel(), hints: 0, result: null, solution: false, sel: null, connect: false, tab: 'ents', title: w.title };
        work[ex.id].sel = firstSel(work[ex.id].model);
        delete cams[ex.id];
        paint();
        focusFid(`en-${work[ex.id].model.entities[0].uid}`);
        break;
      case 'clear-all':
        if (!window.confirm(t('Clear your saved progress in every ER practice exercise on this device?'))) return;
        // The blank diagram is not an exercise: it stays.
        Object.keys(work).forEach((k) => { if (k !== DRAW.id) { delete work[k]; delete hist[k]; } });
        Object.keys(saved).forEach((k) => { if (k !== DRAW.id) delete saved[k]; });
        progress.solved = {};
        progress.best = {};
        workStore.save(saved);
        progressStore.save(progress);
        paint();
        announce(t('Progress cleared.'));
        return;
      case 'dl-drawio':
        downloadText(`${ex.id}.drawio`, ErDrawio.starter(ex), 'application/xml');
        return;
      case 'dl-mine': {
        const model = ErPracticeEngine.toModel(m);
        if (!model.entities.length) { w.importNote = { error: ex === DRAW ? t('Name at least one entity first.') : t('Add at least one entity before checking.') }; rerender(); return; }
        // Shapes the student has not moved yet go where the canvas draws them.
        const layout = { ...(m.layout || {}) };
        if (hasLayout(m)) { const cm = canvasModel(m); [...cm.entities, ...cm.relationships, ...cm.hierarchies].forEach((x) => { if (!layout[x.id]) layout[x.id] = x.xy; }); }
        const opts = ex === DRAW ? { title: w.title.trim() || t('ER diagram'), layout } : { title: ex.title, source: ex.source, statement: ex.statement, layout };
        downloadText(ex === DRAW ? `${fileNameOf(w)}.drawio` : `${ex.id}-my-model.drawio`, ErDrawio.toXml(ErPracticeEngine.autoLayout(model), opts), 'application/xml');
        return;
      }
      case 'dl-svg':
        downloadText(`${fileNameOf(w)}.svg`, standaloneSvg(m, w.title.trim() || t('ER diagram')), 'image/svg+xml');
        return;
      case 'select':
        pick(el.dataset.sel, 'row');
        return;
      case 'tab':
        w.tab = el.dataset.tab;
        rerender();
        return;
      case 'edit-mode':
        editMode = el.dataset.mode === 'list' ? 'list' : 'diagram';
        saveView();
        if (w.sel) w.tab = tabOf(m, w.sel) || w.tab;
        rerender();
        if (w.sel) { showItem(w.sel); ensureVisible(w.sel); }
        announce(editMode === 'list' ? t('Forms open in the list.') : t('Forms open on the diagram.'));
        return;
      case 'connect':
        w.connect = !w.connect;
        connectTab(w);
        rerender();
        announce(w.connect ? statusText(m, w) : t('Connecting stopped.'));
        return;
      case 'close-insp':
        closeForm(w, !!el.closest('.erp-work'));
        return;
      case 'zoom-in':
      case 'zoom-out': {
        const cv = $('#erp-preview');
        if (cv) zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, el.dataset.action === 'zoom-in' ? 1.25 : 0.8);
        return;
      }
      case 'zoom-fit':
        fitCam();
        return;
      case 'dl-solution':
        downloadText(`${ex.id}-solution.drawio`, ErDrawio.toXml(varsOf(ex)[0].model, { title: `${ex.title} · ${t('Official solution')}`, source: ex.source, statement: ex.statement }), 'application/xml');
        return;
      default:
        return;
    }
    persist(ex);
  }

  /* Typing never re-renders the builder (focus would jump): names, readings and the preview are updated in place. */
  function refreshInPlace(ex, w) {
    const m = w.model;
    m.entities.forEach((e) => {
      document.querySelectorAll(`#view [data-opt="${CSS.escape(e.uid)}"]`).forEach((o) => { o.textContent = entName(m, e.uid); });
    });
    m.relationships.forEach((r) => r.ends.forEach((_, k) => {
      const p = $(`#view [data-read="${CSS.escape(`${r.uid}-${k}`)}"]`);
      if (p) p.innerHTML = endReading(m, r, k);
    }));
    const fb = $('#feedback');
    if (fb) fb.innerHTML = '';
    schedulePreview(ex, w);
  }

  function onInput(e) {
    const el = e.target;
    const f = el.dataset.f;
    if (!f || el.type === 'checkbox' || el.tagName === 'SELECT') return;
    const ex = cur();
    const w = getWork(ex);
    const m = w.model;
    if (f === 'draw-title') { w.title = el.value; store(ex); return; }
    const ent = el.dataset.e ? findEnt(m, el.dataset.e) : null;
    const rel = el.dataset.r ? findRel(m, el.dataset.r) : null;
    const hier = el.dataset.h ? findHier(m, el.dataset.h) : null;
    const attr = (ent || rel) && (ent || rel).attrs.find((a) => a.uid === el.dataset.a);
    const end = rel && rel.ends[+el.dataset.k];
    const target = {
      'ent-name': [ent, 'name'],
      'attr-name': [attr, 'name'],
      'attr-parts': [attr, 'parts'],
      'rel-name': [rel, 'name'],
      'end-role': [end, 'role'],
      'rattr-name': [attr, 'name'],
      'hier-disc': [hier, 'discriminator'],
    }[f];
    if (!target || !target[0]) return;
    target[0][target[1]] = el.value;
    touch(w);
    refreshInPlace(ex, w);
    persist(ex, el.dataset.fid);
  }

  /* Reads a .drawio chosen by the student into the builder (it replaces the current model). */
  async function importFile(input) {
    const ex = cur();
    const w = getWork(ex);
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    try {
      const { work: read, unread } = await ErDrawio.fromXml(await file.text());
      if (!read.entities.length) throw new Error(t('No entities were found in the file.'));
      if (!window.confirm(t('Replace your model with the one in the file?'))) return;
      w.model = cleanModel(read) || emptyModel();
      w.sel = null;
      w.connect = false;
      delete cams[ex.id];
      w.importNote = { entities: read.entities.length, rels: read.relationships.length, unread };
    } catch (err) {
      w.importNote = { error: err.message };
    }
    touch(w);
    persist(ex);
    paint();
    reveal($('#erp-import-note'));
  }

  function onChange(e) {
    const el = e.target;
    const f = el.dataset.f;
    if (!f) return;
    if (f === 'import') { importFile(el); return; }
    const ex = cur();
    const w = getWork(ex);
    const m = w.model;
    const ent = el.dataset.e ? findEnt(m, el.dataset.e) : null;
    const rel = el.dataset.r ? findRel(m, el.dataset.r) : null;
    const hier = el.dataset.h ? findHier(m, el.dataset.h) : null;
    const attr = (ent || rel) && (ent || rel).attrs.find((a) => a.uid === el.dataset.a);
    const end = rel && rel.ends[+el.dataset.k];
    let full = false;   // a change that adds or removes controls needs a full re-render
    switch (f) {
      case 'attr-kind':
        if (!attr) return;
        full = (attr.kind === 'composite') !== (el.value === 'composite');
        attr.kind = el.value;
        break;
      case 'rattr-kind': if (!attr) return; attr.kind = el.value; break;
      case 'end-ent': if (!end) return; end.entity = el.value; break;
      case 'end-min': if (!end) return; end.min = el.value; break;
      case 'end-max': if (!end) return; end.max = el.value; break;
      case 'hier-super':
        if (!hier) return;
        hier.super = el.value;
        hier.subs = hier.subs.filter((s) => s !== el.value);
        full = true;
        break;
      case 'hier-sub':
        if (!hier) return;
        hier.subs = el.checked ? [...new Set([...hier.subs, el.dataset.s])] : hier.subs.filter((x) => x !== el.dataset.s);
        break;
      default:
        return;
    }
    touch(w);
    persist(ex);
    if (full) rerender(); else refreshInPlace(ex, w);
  }

  /* The exercise a route shows: its index in LIST, or -1 for the blank diagram ('draw'). */
  const indexOf = (rest) => {
    if (rest === 'draw') return -1;
    const n = /^\d+$/.test(rest || '') ? parseInt(rest, 10) : (LIST.findIndex((x) => !progress.solved[x.id]) + 1 || 1);
    return Math.min(Math.max(n - 1, 0), LIST.length - 1);
  };

  /* rest: what follows #/relational/er/practice ('', 'N' or 'draw'). */
  function render(rest) {
    const i = indexOf(rest);
    current = i < 0 ? DRAW : null;
    if (i >= 0) idx = i;
    paint();
    return i < 0 ? t('Draw an ER diagram') : t('Exercise {n}: {title}', { n: idx + 1, title: LIST[idx].title });
  }

  /* Rail links of the practice hub: one per exercise set, and the blank diagram. route: the section's
     route ('practice', 'practice/N', 'practice/draw'), or null off the practice pages; `current` marks the page shown. */
  function links(route) {
    const at = route === null ? null : indexOf(route.replace(/^practice\/?/, ''));
    const sets = Object.keys(GROUPS).map((g) => {
      const items = LIST.map((e, i) => ({ e, i })).filter((x) => x.e.group === g);
      const target = (items.find((x) => !progress.solved[x.e.id]) || items[0]).i;
      const done = items.filter((x) => progress.solved[x.e.id]).length;
      return {
        href: `${BASE}/${target + 1}`,
        label: t(GROUPS[g]),
        current: at !== null && at >= 0 && LIST[at].group === g,
        extra: `<span class="rail-count" title="${esc(t('{done} of {total} solved', { done, total: items.length }))}">${done}/${items.length}</span>`,
      };
    });
    return [...sets, { href: `${BASE}/draw`, label: t('Draw an ER diagram'), current: at === -1 }];
  }

  /* Console warnings: every official model (and alternative) must pass its own check. */
  function selfTest() {
    LIST.forEach((ex, i) => {
      const where = `ER_PRACTICE[${i}] “${ex.id}”`;
      try {
        varsOf(ex).forEach((v) => {
          const r = ErPracticeEngine.check(ex, ErPracticeEngine.fromModel(v.model), { ...ctxOf(ex), vars: varsOf(ex) });
          if (!r.ok) console.warn(`${where}${v.id ? ` (${v.id})` : ''}: the official model does not pass its own check`, r.checks.filter((c) => c.status === 'bad').map((c) => c.text));
        });
      } catch (err) {
        console.warn(`${where}: ${err.message}`);
      }
    });
  }

  return { render, links, onClick, onInput, onChange, onKeydown, selfTest, importFile };
})();
