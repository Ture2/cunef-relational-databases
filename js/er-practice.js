'use strict';

/* ==========================================================================
   Relational databases › ER concepts › Practice.
   The student reads a lab-session statement and builds its ER / EER model:
   entities (weak or not) with their attributes, relationships with the
   (min,max) of every end, and hierarchies. js/er-practice-engine.js compares
   the model with the official one (and its accepted alternatives) and explains
   every difference; the official diagram, with the reasons behind it, can be revealed.
   Data: data/<lang>/er-practice.js (ER_PRACTICE). Routes: #/relational/er/practice[/N],
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
  const progress = Object.assign({ solved: {}, best: {} }, progressStore.load());
  const saved = workStore.load();
  const work = {};
  const cache = {};
  let idx = 0;
  let previewTimer = null;

  const LIST = ER_PRACTICE;
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
      work[ex.id] = {
        model: (same && cleanModel(s.model)) || emptyModel(),
        hints: same ? Math.min(+s.hints || 0, (ex.hints || []).length) : 0,
        result: null,
        solution: false,
      };
    }
    return work[ex.id];
  }

  function persist(ex) {
    const w = work[ex.id];
    if (!w) return;
    saved[ex.id] = { sig: sigOf(ex), model: w.model, hints: w.hints };
    workStore.save(saved);
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

  /* Other tools to practise with, outside the page. */
  function toolsHtml() {
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

  /* The student's model drawn with the course notation (laid out automatically). */
  function previewHtml(ex, w) {
    try {
      const model = ErPracticeEngine.toModel(w.model);
      if (!model.entities.length) return `<p class="empty">${esc(t('Your diagram will appear here as you build the model.'))}</p>`;
      const laid = ErPracticeEngine.autoLayout(model);
      laid.title = t('your model');
      return `<div class="scroll er-wrap">${readableSvg(ErDiagram.modelSvg(laid))}</div>`;
    } catch (e) {
      return `<p class="empty">${esc(t('Your diagram will appear here as you build the model.'))}</p>`;
    }
  }
  function schedulePreview(ex, w) {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => { const el = $('#erp-preview'); if (el) el.innerHTML = previewHtml(ex, w); }, 400);
  }

  const toFix = (n) => (n === 1 ? t('1 thing to fix') : t('{n} things to fix', { n }));

  /* What the last draw.io import read, and what it could not. */
  function importNoteHtml(w) {
    const r = w.importNote;
    if (!r) return '';
    if (r.error) return `<p class="insight erp-import-bad">${esc(r.error)}</p>`;
    const head = t('Imported {entities} entities and {rels} relationships. Press Check to compare them with the official solution.', { entities: r.entities, rels: r.rels });
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

          <h4 class="erp-h">${esc(t('Entities'))} <span class="muted">(${m.entities.length})</span></h4>
          <div class="tcards">${m.entities.map((e, i) => entityCardHtml(m, e, i)).join('')}</div>
          <p class="add-row"><button type="button" class="btn ghost" data-action="add-ent" data-fid="add-ent"${m.entities.length >= MAX.entities ? ' disabled' : ''}>${esc(t('Add entity'))}</button></p>

          <h4 class="erp-h">${esc(t('Relationships'))} <span class="muted">(${m.relationships.length})</span></h4>
          ${m.relationships.length ? `<div class="tcards">${m.relationships.map((r, i) => relCardHtml(m, r, i)).join('')}</div>` : `<p class="empty">${esc(t('No relationships yet.'))}</p>`}
          <p class="add-row"><button type="button" class="btn ghost" data-action="add-rel" data-fid="add-rel"${m.relationships.length >= MAX.rels ? ' disabled' : ''}>${esc(t('Add relationship'))}</button></p>

          <h4 class="erp-h">${esc(t('Hierarchies'))} <span class="muted">(${m.hierarchies.length})</span></h4>
          ${m.hierarchies.length ? `<div class="tcards">${m.hierarchies.map((h, i) => hierCardHtml(m, h, i)).join('')}</div>` : `<p class="empty">${esc(t('No hierarchies. Most exercises do not need one.'))}</p>`}
          <p class="add-row"><button type="button" class="btn ghost" data-action="add-hier" data-fid="add-hier"${m.hierarchies.length >= MAX.hiers ? ' disabled' : ''}>${esc(t('Add hierarchy'))}</button></p>

          <details class="er-preview" open>
            <summary>${esc(t('Your model as a diagram'))}</summary>
            <div id="erp-preview">${previewHtml(ex, w)}</div>
            ${ErDiagram.LEGEND}
          </details>
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
    // On narrow screens the preview starts closed: the builder comes first.
    if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 640px)').matches) {
      const d = $('.er-preview');
      if (d) d.open = false;
    }
  }

  /* ---- Events ---------------------------------------------------------------- */

  const rerender = () => keepFocus(renderExercise);
  const findEnt = (m, uid) => m.entities.find((e) => e.uid === uid);
  const findRel = (m, uid) => m.relationships.find((r) => r.uid === uid);
  const findHier = (m, uid) => m.hierarchies.find((h) => h.uid === uid);
  const focusFid = (fid) => { const el = $(`#view [data-fid="${CSS.escape(fid)}"]`); if (el) el.focus(); };

  function onClick(el) {
    const ex = LIST[idx];
    const w = getWork(ex);
    const m = w.model;
    const e = el.dataset.e ? findEnt(m, el.dataset.e) : null;
    const r = el.dataset.r ? findRel(m, el.dataset.r) : null;
    const h = el.dataset.h ? findHier(m, el.dataset.h) : null;
    switch (el.dataset.action) {
      case 'add-ent': {
        if (m.entities.length >= MAX.entities) return;
        const ne = newEntity(m);
        m.entities.push(ne);
        touch(w);
        renderExercise();
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
        if (!m.entities.length) m.entities.push(newEntity(m));
        touch(w);
        renderExercise();
        focusFid(`en-${m.entities[Math.min(i, m.entities.length - 1)].uid}`);
        announce(t('Entity {name} removed.', { name }));
        break;
      }
      case 'add-attr': {
        if (!e || e.attrs.length >= MAX.attrs) return;
        const na = newAttr(m);
        e.attrs.push(na);
        touch(w);
        renderExercise();
        focusFid(`an-${e.uid}-${na.uid}`);
        break;
      }
      case 'rm-attr': {
        if (!e) return;
        const i = e.attrs.findIndex((a) => a.uid === el.dataset.a);
        e.attrs.splice(i, 1);
        touch(w);
        renderExercise();
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
        touch(w);
        renderExercise();
        focusFid(`rn-${nr.uid}`);
        announce(t('Relationship {n} added.', { n: m.relationships.length }));
        break;
      }
      case 'rm-rel': {
        if (!r) return;
        const i = m.relationships.indexOf(r);
        m.relationships.splice(i, 1);
        touch(w);
        renderExercise();
        const next = m.relationships[Math.min(i, m.relationships.length - 1)];
        focusFid(next ? `rn-${next.uid}` : 'add-rel');
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
        renderExercise();
        focusFid(`ee-${r.uid}-${r.ends.length - 1}`);
        break;
      case 'rm-end': {
        if (!r || r.ends.length <= 2) return;
        const k = +el.dataset.k;
        r.ends.splice(k, 1);
        touch(w);
        renderExercise();
        focusFid(`ee-${r.uid}-${Math.min(k, r.ends.length - 1)}`);
        break;
      }
      case 'add-rattr': {
        if (!r || r.attrs.length >= MAX.rattrs) return;
        const na = { uid: uidOf(m, 'a'), name: '', kind: '' };
        r.attrs.push(na);
        touch(w);
        renderExercise();
        focusFid(`rn-${r.uid}-${na.uid}`);
        break;
      }
      case 'rm-rattr': {
        if (!r) return;
        r.attrs = r.attrs.filter((a) => a.uid !== el.dataset.a);
        touch(w);
        renderExercise();
        focusFid(`raa-${r.uid}`);
        break;
      }
      case 'add-hier': {
        if (m.hierarchies.length >= MAX.hiers) return;
        const nh = newHier(m);
        m.hierarchies.push(nh);
        touch(w);
        renderExercise();
        focusFid(`hsup-${nh.uid}`);
        break;
      }
      case 'rm-hier': {
        if (!h) return;
        m.hierarchies.splice(m.hierarchies.indexOf(h), 1);
        touch(w);
        renderExercise();
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
        renderExercise();
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
        touch(w);
        renderExercise();
        $('[data-fid="check"]')?.focus();
        announce(t('Official solution loaded into your design.'));
        break;
      case 'reset':
        if (!window.confirm(t('Remove your whole model for this exercise?'))) return;
        work[ex.id] = { model: emptyModel(), hints: 0, result: null, solution: false };
        renderExercise();
        focusFid(`en-${work[ex.id].model.entities[0].uid}`);
        break;
      case 'clear-all':
        if (!window.confirm(t('Clear your saved progress in every ER practice exercise on this device?'))) return;
        Object.keys(work).forEach((k) => delete work[k]);
        Object.keys(saved).forEach((k) => delete saved[k]);
        progress.solved = {};
        progress.best = {};
        workStore.clear();
        progressStore.save(progress);
        renderExercise();
        announce(t('Progress cleared.'));
        return;
      case 'dl-drawio':
        downloadText(`${ex.id}.drawio`, ErDrawio.starter(ex), 'application/xml');
        return;
      case 'dl-mine': {
        const model = ErPracticeEngine.toModel(m);
        if (!model.entities.length) { w.importNote = { error: t('Add at least one entity before checking.') }; rerender(); return; }
        downloadText(`${ex.id}-my-model.drawio`, ErDrawio.toXml(ErPracticeEngine.autoLayout(model), { title: ex.title, source: ex.source, statement: ex.statement, layout: m.layout }), 'application/xml');
        return;
      }
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
    const ex = LIST[idx];
    const w = getWork(ex);
    const m = w.model;
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
    persist(ex);
  }

  /* Reads a .drawio chosen by the student into the builder (it replaces the current model). */
  async function importFile(input) {
    const ex = LIST[idx];
    const w = getWork(ex);
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    try {
      const { work: read, unread } = await ErDrawio.fromXml(await file.text());
      if (!read.entities.length) throw new Error(t('No entities were found in the file.'));
      if (!window.confirm(t('Replace your model with the one in the file?'))) return;
      w.model = cleanModel(read) || emptyModel();
      w.importNote = { entities: read.entities.length, rels: read.relationships.length, unread };
    } catch (err) {
      w.importNote = { error: err.message };
    }
    touch(w);
    persist(ex);
    renderExercise();
    reveal($('#erp-import-note'));
  }

  function onChange(e) {
    const el = e.target;
    const f = el.dataset.f;
    if (!f) return;
    if (f === 'import') { importFile(el); return; }
    const ex = LIST[idx];
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

  /* rest: what follows #/relational/er/practice ('' or 'N'). */
  function render(rest) {
    const n = /^\d+$/.test(rest || '') ? parseInt(rest, 10) : (LIST.findIndex((x) => !progress.solved[x.id]) + 1 || 1);
    idx = Math.min(Math.max(n - 1, 0), LIST.length - 1);
    renderExercise();
    return t('Exercise {n}: {title}', { n: idx + 1, title: LIST[idx].title });
  }

  /* Rail links of the practice hub, one per exercise set; `current` marks the set being shown. */
  function links(onPage) {
    return Object.keys(GROUPS).map((g) => {
      const items = LIST.map((e, i) => ({ e, i })).filter((x) => x.e.group === g);
      const target = (items.find((x) => !progress.solved[x.e.id]) || items[0]).i;
      const done = items.filter((x) => progress.solved[x.e.id]).length;
      return {
        href: `${BASE}/${target + 1}`,
        label: t(GROUPS[g]),
        current: onPage && LIST[idx].group === g,
        extra: `<span class="rail-count" title="${esc(t('{done} of {total} solved', { done, total: items.length }))}">${done}/${items.length}</span>`,
      };
    });
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

  return { render, links, onClick, onInput, onChange, selfTest, importFile };
})();
