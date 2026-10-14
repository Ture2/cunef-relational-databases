'use strict';

/* ==========================================================================
   Concept section engine, shared by Theory, ER concepts, ER → Logical,
   Normalization and SQL: a navigation rail with hubs (the active hub lists its
   concepts, the others open a flyout; the rail collapses to icons), a section
   overview (every group with its concepts and their one-sentence definitions,
   and the section's videos), one page per group with its concepts as an
   accordion (the video of the group first, "Try it" boxes closed), Previous /
   Next between groups, an optional quiz (multiple choice, true/false, fill in
   the blank) with the best score per topic, and an optional practice module
   drawn inside the same layout.
   Routes, below cfg.base: '' (the overview), <conceptId> (its group page, that
   concept open), quiz[/<topic>], summary (the printable summary sheet, source of
   the section's PDF), and whatever cfg.practice.match(rest) accepts.

   Card fields: id, title, summary, body[], points[], table { caption, head, rows },
   tables [table, …], code, dialect, example, mistake, caption, practice { href, label?, sub? },
   plus whatever cfg.figure / cfg.extra / cfg.tryIt read.
   cfg: { base, title(), blurb(), badge, groups: [{ key, label, icon, ids?, part? }] (without ids, a
          hub takes the cards whose `hub` is its key; consecutive groups with the same `part`
          share a heading in the rail), concepts,
          videos?: [{ id, group (hub key), title, mp4, poster, duration, chapters: [{ t, title }] }],
          quiz?, topics?, quizKey?, figure(item) → svg | '', extra(card) → html,
          tryIt(card) → { html, label } | null (a closed "Try it" box at the end of the card),
          perfectText(), nextLink: { href, label() }, onClick(el), onChange(e),
          onInput(e), onKeydown(e), codeDownload (code blocks get a "Download .sql" button),
          pdf: id of the pre-built summary PDF (assets/pdf/<id>-<lang>.pdf, made by tools/build-pdfs.mjs),
          summaryExtra(card) → html for the summary sheet,
          practice?: { label, icon, match(rest), links(rest | null) → [{ href, label, current, extra? }],
                       menu?() → [{ href, label }] (the top bar's shorter list; default: links),
                       render(rest) → title (draws into #practice-slot),
                       onClick(el, e), onInput(e), onChange(e), onKeydown(e), onSubmit(form) } }
   ========================================================================== */

/* Rail icons (24×24, stroked). ER hubs use Chen shapes; Theory hubs use plain pictograms. */
const RAIL_ICON = {
  entity: '<rect x="3" y="7" width="18" height="10" rx="1"/>',
  relationship: '<path d="M12 4 21 12 12 20 3 12Z"/>',
  weak: '<rect x="2" y="6" width="20" height="12" rx="1"/><rect x="5" y="9" width="14" height="6"/>',
  isa: '<path d="M12 4 21 19H3Z"/><path d="M12 1v3" />',
  steps: '<path d="M4 18h5v-4h5v-4h6"/><path d="M4 21h16"/>',
  pyramid: '<path d="M12 3 21 20H3Z"/><path d="M7.5 12h9M5.2 16h13.6"/>',
  files: '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v4h4"/><path d="M4 7v14h11"/>',
  dbms: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  acid: '<rect x="5" y="10" width="14" height="10" rx="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2"/>',
  levels: '<path d="M12 3 21 8 12 13 3 8Z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/>',
  storage: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M17 16h.01"/>',
  index: '<rect x="9" y="3" width="6" height="4"/><rect x="3" y="15" width="6" height="4"/><rect x="15" y="15" width="6" height="4"/><path d="M12 7v4M6 15v-4h12v4"/>',
  lifecycle: '<path d="M20 12a8 8 0 0 1-14.3 4.9"/><path d="M4 12A8 8 0 0 1 18.3 7.1"/><path d="M18.5 3v4.2h-4.2"/><path d="M5.5 21v-4.2h4.2"/>',
  practice: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="M13.5 6.5l4 4"/><path d="M14 20h6"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M3 14.5h18M9 9v11"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  special: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  split: '<rect x="3" y="4" width="8" height="16" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="6" rx="1"/>',
  arrow: '<path d="M4 8h12"/><path d="M13 5l3 3-3 3"/><path d="M20 16H8"/><path d="M11 13l-3 3 3 3"/>',
  forms: '<path d="M4 20h4v-4H4Z"/><path d="M10 20h4v-8h-4Z"/><path d="M16 20h4V8h-4Z"/>',
  why: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  code: '<path d="M8 7l-5 5 5 5"/><path d="M16 7l5 5-5 5"/><path d="M13.5 4l-3 16"/>',
  cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 18.5Z"/><path d="M10 15l2-2 2 2"/><path d="M12 13v4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
  quad: '<rect x="3" y="3.5" width="7.5" height="7.5" rx="1"/><rect x="13.5" y="3.5" width="7.5" height="7.5" rx="1"/><rect x="3" y="13" width="7.5" height="7.5" rx="1"/><rect x="13.5" y="13" width="7.5" height="7.5" rx="1"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
  cluster: '<rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/><path d="M7 6h.01M7 12h.01M7 18h.01"/>',
  speed: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4.5-6"/><path d="M4 18h16"/>',
  venn: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
  sigma: '<path d="M18 5H6l6 7-6 7h12"/>',
  nested: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><rect x="8" y="9" width="9" height="7" rx="1"/><path d="M6 7h5"/>',
  fx: '<path d="M14 4h-1.5A2.5 2.5 0 0 0 10 6.5V20"/><path d="M7 10h6"/><path d="M15 13l5 6M20 13l-5 6"/>',
  view: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  braces: '<path d="M8 4H7a2 2 0 0 0-2 2v4l-2 2 2 2v4a2 2 0 0 0 2 2h1"/><path d="M16 4h1a2 2 0 0 1 2 2v4l2 2-2 2v4a2 2 0 0 1-2 2h-1"/>',
  pdf: '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v4h4"/><path d="M12.5 10v6"/><path d="M10 13.8l2.5 2.5 2.5-2.5"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 1c0 1.8-2.5 2.2-2.5 3.7"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/>',
  collapse: '<path d="M14 6l-6 6 6 6"/><path d="M20 6l-6 6 6 6"/>',
  expand: '<path d="M10 6l6 6-6 6"/><path d="M4 6l6 6-6 6"/>',
};

/* This viewer's layout choices, shared by every concept section: the rail collapsed (sideCollapsed),
   every concept of a group shown (allOpen), "Try it" boxes open (tryOpen). */
const railUi = (() => {
  const store = makeStore('er-ui-v1');
  const ui = Object.assign({ sideCollapsed: false }, store.load());
  return { ui, save: () => store.save(ui) };
})();

function ConceptSection(cfg) {
  const BASE = cfg.base;
  const CONCEPTS = cfg.concepts;
  const QUIZ = cfg.quiz || [];
  const TOPICS = cfg.topics || {};
  const HAS_QUIZ = QUIZ.length > 0;
  const PRACTICE = cfg.practice || null;
  const VIDEOS = cfg.videos || [];
  const store = makeStore(cfg.quizKey || 'no-quiz');
  const best = Object.assign({}, store.load());       // topic ('all' or a key) -> best score
  const quiz = { topic: null, order: [], i: 0, score: 0, picked: null, typed: '', missed: [], skipped: [], results: {}, done: false, retry: false };
  let route = { page: 'overview', concept: 0, topic: 'all', rest: '' };
  let lastPage = null;                                  // to move focus only when navigating inside the section
  const readStore = makeStore('read-v1');               // concepts read, per section: { [base]: { [cardId]: 1 } }
  const { ui } = railUi;

  const view = () => $('#view');

  /* ---- Layout: sidebar (a dropdown on narrow screens) + main area ------------ */

  /* The section root is the overview; every concept, the first included, has its own route (its group page). */
  const conceptHref = (i) => `${BASE}/${CONCEPTS[i].id}`;

  const icon = (k) => `<svg class="rail-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${RAIL_ICON[k] || ''}</svg>`;

  /* Hubs with their concept indexes; a concept missing from GROUPS joins the last hub. */
  function hubs() {
    const used = new Set();
    const list = cfg.groups.map((g) => {
      const items = g.ids
        ? g.ids.map((id) => CONCEPTS.findIndex((c) => c.id === id)).filter((k) => k >= 0)
        : CONCEPTS.map((c, k) => (c.hub === g.key ? k : -1)).filter((k) => k >= 0);   // cards may name their hub
      items.forEach((k) => used.add(k));
      return { ...g, items };
    });
    CONCEPTS.forEach((c, k) => { if (!used.has(k)) list[list.length - 1].items.push(k); });
    return list.filter((g) => g.items.length);
  }
  const HUBS = hubs();
  const hubOf = (k) => HUBS.findIndex((h) => h.items.includes(k));
  /* A concept's number in the rail: group, then place in the group ("3.2"), as on the group page. */
  const numberOf = (k) => `${hubOf(k) + 1}.${HUBS[hubOf(k)].items.indexOf(k) + 1}`;
  /* The videos of a group (cfg.videos entries whose `group` is its key), and the page of a video. */
  const videosOf = (h) => VIDEOS.filter((v) => v.group === h.key);
  const videoHref = (v) => {
    const h = HUBS.find((x) => x.key === v.group);
    return h ? conceptHref(h.items[0]) : BASE;
  };
  const watched = (id) => VideoPlayer.state().watched(id);
  VideoPlayer.register(VIDEOS.map((v) => ({ video: v, href: videoHref(v) })));

  /* Parts (cfg.groups[].part): consecutive groups with the same part label, shown under one heading in the rail.
     The part of the concept being read (or last read) is open; the reader can open or close the others. */
  const PARTS = (() => {
    if (!HUBS.some((h) => h.part)) return [];
    const list = [];
    HUBS.forEach((h) => {
      const last = list[list.length - 1];
      if (last && last.label === h.part) last.hubs.push(h); else list.push({ label: h.part || '', hubs: [h] });
    });
    return list;
  })();
  const partOf = (k) => PARTS.findIndex((pt) => pt.hubs.some((h) => h.items.includes(k)));
  const openParts = new Set();                          // parts opened by hand on this visit

  function partHtml(pt, i, hubHtml) {
    const open = openParts.has(i) || partOf(route.concept) === i;
    const label = esc(t(pt.label));
    return `<li class="rail-part${open ? ' is-open' : ''}">
        <button type="button" class="rail-part-head" data-action="toggle-part" data-part="${i}" data-fid="part-${i}" aria-expanded="${open}" aria-controls="rail-part-${i}"><span class="rail-label">${label}</span><span class="rail-part-n" aria-hidden="true">${pt.hubs.length}</span><svg class="rail-part-chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"/></svg></button>
        <ul class="rail-part-hubs" id="rail-part-${i}">${pt.hubs.map(hubHtml).join('')}</ul>
      </li>`;
  }

  /* Opens or closes a part of the rail in place. */
  function togglePart(btn) {
    const i = +btn.dataset.part;
    const li = btn.closest('.rail-part');
    const open = !li.classList.contains('is-open');
    if (open) openParts.add(i); else openParts.delete(i);
    li.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  }

  function sideHtml() {
    const noConcept = route.page !== 'concept';      // the overview, a quiz or a practice page: no concept is current
    const onQuizPage = route.page === 'quiz';
    const collapsed = ui.sideCollapsed;
    const conceptLink = (k) => `<li><a href="${conceptHref(k)}"${!noConcept && k === route.concept ? ' aria-current="page"' : ''}><span class="rail-n">${numberOf(k)}</span><span class="rail-text">${esc(CONCEPTS[k].title)}</span></a></li>`;

    const hubHtml = (h) => {
      const active = !noConcept && h.items.includes(route.concept);
      const label = esc(t(h.label));
      return `<li class="rail-hub${active ? ' is-active' : ''}">
          <a class="rail-head" href="${conceptHref(h.items[0])}"${active ? ' aria-current="true"' : ''} title="${label}">${icon(h.icon)}<span class="rail-label">${label}</span></a>
          <div class="rail-pages">
            <p class="rail-fly-title" aria-hidden="true">${label}</p>
            <ol>${h.items.map(conceptLink).join('')}</ol>
          </div>
        </li>`;
    };

    /* The quiz is one row: the run in progress, else the number of questions. Topics are chosen on the quiz page. */
    const answered = Object.keys(quiz.results).length;
    const live = !quiz.done && answered > 0;
    const quizBadge = live
      ? `<span class="rail-live" title="${esc(t('In progress: {n} of {total} answered', { n: answered, total: quiz.order.length }))}">${answered}/${quiz.order.length}</span>`
      : `<span class="rail-count">${QUIZ.length}</span>`;
    const quizLabel = esc(t('Test yourself'));
    const quizHub = !HAS_QUIZ ? '' : `<li class="rail-hub rail-quiz${onQuizPage ? ' is-active' : ''}">
        <a class="rail-head" href="${BASE}/quiz"${onQuizPage ? ' aria-current="page"' : ''} title="${quizLabel}">${icon('quiz')}<span class="rail-label">${quizLabel}</span>${quizBadge}</a>
      </li>`;

    /* The practice hub: links supplied by the practice module (exercise sets, quizzes). */
    const onPractice = route.page === 'practice';
    const pLinks = PRACTICE ? PRACTICE.links(onPractice ? route.rest : null) : [];
    const pLabel = PRACTICE ? esc(t(PRACTICE.label)) : '';
    const practiceHub = !PRACTICE ? '' : `<li class="rail-hub rail-practice${onPractice ? ' is-active' : ''}">
        <a class="rail-head" href="${pLinks[0].href}"${onPractice ? ' aria-current="true"' : ''} title="${pLabel}">${icon(PRACTICE.icon || 'practice')}<span class="rail-label">${pLabel}</span></a>
        <div class="rail-pages">
          <p class="rail-fly-title" aria-hidden="true">${pLabel}</p>
          <ol>${pLinks.map((l) => `<li><a href="${l.href}"${l.current ? ' aria-current="page"' : ''}><span class="rail-text">${esc(l.label)}</span>${l.extra || ''}</a></li>`).join('')}</ol>
        </div>
      </li>`;

    const toggle = collapsed ? t('Expand') : t('Collapse');
    const groupOption = (h) => `<option value="${conceptHref(h.items[0])}"${!noConcept && h.items.includes(route.concept) ? ' selected' : ''}>${HUBS.indexOf(h) + 1}. ${esc(t(h.label))}</option>`;
    const groupOptions = PARTS.length
      ? PARTS.map((pt) => `<optgroup label="${esc(t(pt.label))}">${pt.hubs.map(groupOption).join('')}</optgroup>`).join('')
      : `<optgroup label="${esc(t('Groups'))}">${HUBS.map(groupOption).join('')}</optgroup>`;
    const quizOption = esc(t('Quiz: {n} questions', { n: QUIZ.length }));
    return `
      <nav class="rail" id="er-side" aria-label="${esc(cfg.title())}">
        <a class="rail-top" href="${BASE}" title="${esc(cfg.title())}"${route.page === 'overview' ? ' aria-current="page"' : ''}><span class="rail-badge" aria-hidden="true">${esc(cfg.badge)}</span><span class="rail-label">${esc(cfg.title())}</span></a>
        ${pdfLink('rail-pdf')}
        ${PARTS.length ? `<ul class="rail-hubs rail-parts">${PARTS.map((pt, i) => partHtml(pt, i, hubHtml)).join('')}</ul>` : `<ul class="rail-hubs">${HUBS.map(hubHtml).join('')}</ul>`}
        <ul class="rail-hubs rail-hubs-end">${practiceHub}${quizHub}</ul>
        <button type="button" class="rail-toggle" data-action="toggle-side" data-fid="toggle-side" aria-expanded="${!collapsed}" title="${esc(toggle)}">${icon(collapsed ? 'expand' : 'collapse')}<span class="rail-label">${esc(toggle)}</span></button>
      </nav>
      <div class="side-select">
        <label for="side-go">${esc(t('Go to'))}</label>
        <div class="side-row">
        <select id="side-go">
          <option value="${BASE}"${route.page === 'overview' ? ' selected' : ''}>${esc(t('Overview'))}</option>
          ${groupOptions}
          ${PRACTICE ? `<optgroup label="${pLabel}">${pLinks.map((l) => `<option value="${l.href}"${l.current ? ' selected' : ''}>${esc(l.label)}</option>`).join('')}</optgroup>` : ''}
          ${HAS_QUIZ ? `<optgroup label="${esc(t('Test yourself'))}"><option value="${BASE}/quiz"${route.page === 'quiz' ? ' selected' : ''}>${quizOption}</option></optgroup>` : ''}
        </select>
        ${pdfLink('side-pdf', t('PDF'))}
        </div>
      </div>`;
  }

  /* Download link of the section's summary PDF, in the current language. */
  function pdfLink(cls, short) {
    if (!cfg.pdf) return '';
    const label = short || t('Summary (PDF)');
    const title = t('Download the summary of {section} (PDF)', { section: cfg.title() });
    return `<a class="${cls}" href="${summaryPdf(cfg.pdf)}" download title="${esc(title)}" aria-label="${esc(title)}">${icon('pdf')}<span class="rail-label">${esc(label)}</span></a>`;
  }

  const layout = (main, cls = '') => `<div class="er-layout${ui.sideCollapsed ? ' is-collapsed' : ''}"><aside class="er-aside">${sideHtml()}</aside><div class="er-main${cls ? ` ${cls}` : ''}">${main}</div></div>`;

  /* Collapses the rail to its icons, or expands it, in place; the choice is remembered. */
  function toggleSide() {
    ui.sideCollapsed = !ui.sideCollapsed;
    railUi.save();
    const label = ui.sideCollapsed ? t('Expand') : t('Collapse');
    $('.er-layout')?.classList.toggle('is-collapsed', ui.sideCollapsed);
    const btn = $('.rail-toggle');
    if (btn) {
      btn.setAttribute('aria-expanded', String(!ui.sideCollapsed));
      btn.title = label;
      btn.innerHTML = `${icon(ui.sideCollapsed ? 'expand' : 'collapse')}<span class="rail-label">${esc(label)}</span>`;
    }
    announce(ui.sideCollapsed ? t('Navigation collapsed') : t('Navigation expanded'));
  }

  /* ---- Concept cards ------------------------------------------------------- */

  /* ---- Parts shared by the concept card and the summary sheet ------------------- */

  const pointsHtml = (c) => (c.points && c.points.length ? `<ul class="plain">${c.points.map((p) => `<li>${md(p)}</li>`).join('')}</ul>` : '');
  const noteHtml = (cls, label, text) => (text ? `<p class="${cls}"><strong>${esc(t(label))}</strong> ${md(text)}</p>` : '');
  const tablesHtml = (c) => [c.table, ...(c.tables || [])].filter(Boolean).map(tableHtml).join('');
  const figHtml = (c, cls, fig) => (fig ? `<figure class="${cls}">${cls === 'concept-fig' ? `<div class="scroll">${fig}</div>` : fig}${c.caption ? `<figcaption>${md(c.caption)}</figcaption>` : ''}</figure>` : '');

  const CHEVRON = '<svg class="cc-chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"/></svg>';

  /* A "Try it" box (cfg.tryIt: the SQL runner) is a disclosure. It starts closed until the reader
     opens one; from then on they start open on this device (closing one makes them start closed). */
  const tryHtml = (box) => (!box ? '' : `<details class="try"${ui.tryOpen ? ' open' : ''}>
      <summary><span class="tool-badge">${esc(t('Try it'))}</span><span class="try-label">${esc(box.label)}</span>${CHEVRON}</summary>
      ${box.html}
    </details>`);

  /* On a group page (g = { n, open, next? }) a concept is a disclosure: its title (a button)
     and its definition always show, the rest is a panel that opens one concept at a time.
     hidden="until-found" lets find-in-page reach a closed panel (beforematch opens it).
     The quiz call-out comes once, at the end of the group (groupQuizHtml). */
  function cardHtml(c, g) {
    const fig = cfg.figure ? cfg.figure(c) : '';
    const id = esc(c.id);
    // The figure floats right at the top of the panel, so the body text wraps around it instead of leaving a
    // tall empty column; widgets, results and call-outs below clear the float and use the full width.
    return `
      <article class="concept cc${g.open ? ' is-open' : ''}" id="c-${id}" aria-labelledby="c-${id}-h">
        <h2 id="c-${id}-h" class="cc-h"><button type="button" class="cc-toggle" data-action="concept-toggle" data-id="${id}" data-fid="cc-${id}" aria-expanded="${g.open}" aria-controls="c-${id}-p"><span class="cc-n" aria-hidden="true">${g.n}</span><span class="cc-title">${esc(c.title)}</span>${CHEVRON}</button></h2>
        <p class="summary">${md(c.summary)}</p>
        <div class="concept-panel" id="c-${id}-p"${g.open ? '' : ' hidden="until-found"'}>
        <div class="concept-text">
          ${figHtml(c, 'concept-fig', fig)}
          ${(c.body || []).map((p) => `<p>${md(p)}</p>`).join('')}
          ${pointsHtml(c)}
          ${noteHtml('example', 'Example.', c.example)}
          ${tablesHtml(c)}
          ${c.code ? codeHtml(c, cfg.codeDownload) : ''}
          ${noteHtml('mistake', 'Common mistake.', c.mistake)}
        </div>
        ${cfg.extra ? cfg.extra(c) : ''}
        ${tryHtml(cfg.tryIt ? cfg.tryIt(c) : null)}
        ${c.practice ? `<aside class="concept-quiz concept-practice" aria-labelledby="cp-${esc(c.id)}">
            <svg class="cq-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${RAIL_ICON.practice}</svg>
            <div class="cq-text">
              <p class="cq-title" id="cp-${esc(c.id)}">${esc(t('Practise it'))}</p>
              ${c.practice.sub ? `<p class="cq-sub">${md(c.practice.sub)}</p>` : ''}
            </div>
            <a class="btn" href="${c.practice.href}">${esc(c.practice.label || t('Start the exercise'))}</a>
          </aside>` : ''}
        ${g.next ? `<p class="cc-next"><button type="button" class="btn ghost" data-action="concept-next" data-id="${esc(g.next.id)}">${esc(t('Next: {title}', { title: g.next.title }))} ↓</button></p>` : ''}
        <span class="concept-end" data-read="${id}" aria-hidden="true"></span>
        </div>
      </article>`;
  }

  /* A code block with its dialect label; with download, a bar with "Download .sql" (cfg.codeDownload). */
  const codeHtml = (c, download = false) => {
    const pre = `<pre class="concept-code"><code>${esc(c.code)}</code></pre>`;
    const dialect = c.dialect ? `<span class="dialect">${esc(c.dialect)}</span>` : '';
    if (!download) return `${dialect ? `<p class="ss-label">${dialect}</p>` : ''}${pre}`;
    return `<div class="code-block">
        <div class="code-bar">${dialect}
          <button type="button" class="code-dl" data-action="dl-code" data-card="${esc(c.id)}" data-fid="dl-${esc(c.id)}">${esc(t('Download .sql'))}</button></div>
        ${pre}
      </div>`;
  };

  function downloadCode(id) {
    const c = CONCEPTS.find((x) => x.id === id);
    if (c) downloadText(`${c.id}.sql`, `${c.dialect ? `-- ${c.dialect}
` : ''}${c.code.trim()}
`, 'application/sql');
  }

  /* A small data table inside a card: { caption?, head: [...], rows: [[...]] }; cells use md(). */
  const tableHtml = (tb) => `<div class="scroll concept-table"><table class="src">${tb.caption ? `<caption>${md(tb.caption)}</caption>` : ''}
      <thead><tr>${tb.head.map((h) => `<th scope="col">${md(h)}</th>`).join('')}</tr></thead>
      <tbody>${tb.rows.map((r) => `<tr>${r.map((v, k) => (k === 0 ? `<th scope="row">${md(v)}</th>` : `<td>${md(v)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;

  /* A concept counts as read when it is opened or the end of it scrolls into view (js/progress.js). */
  function markRead(id) {
    const all = readStore.load();
    const mine = all[BASE] && typeof all[BASE] === 'object' ? all[BASE] : {};
    if (mine[id]) return;
    all[BASE] = { ...mine, [id]: 1 };
    readStore.save(all);
    ProgressPage.updateButton();
  }

  /* Reading time: the card's own text (not the runnable examples), at 200 words a minute. */
  const plain = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&\w+;/g, ' ').replace(/\*\*|`/g, '');
  const wordsOf = (c) => plain([c.summary, ...(c.body || []), ...(c.points || []), c.example, c.mistake].join(' ')).split(/\s+/).filter(Boolean).length;
  const minutes = (ks) => Math.max(1, Math.round(ks.reduce((n, k) => n + wordsOf(CONCEPTS[k]), 0) / 200));
  const ALL = CONCEPTS.map((c, k) => k);
  const tryCount = (ks) => (cfg.tryIt ? ks.filter((k) => cfg.tryIt(CONCEPTS[k])).length : 0);
  const count = (n, one, many) => (n === 1 ? t(one) : t(many, { n }));
  const groupMeta = (h) => {
    const n = tryCount(h.items);
    const v = videosOf(h).length;
    return [
      count(h.items.length, '1 concept', '{n} concepts'),
      t('about {n} min', { n: minutes(h.items) }),
      v ? count(v, '1 video', '{n} videos') : '',
      n ? count(n, '1 example to run', '{n} examples to run') : '',
    ].filter(Boolean).join(' · ');
  };

  /* Where the section goes when the last group is done. */
  function afterLastGroup() {
    if (HAS_QUIZ) return { href: `${BASE}/quiz`, label: t('Test yourself') };
    if (PRACTICE) return { href: PRACTICE.links(null)[0].href, label: t(PRACTICE.label) };
    return cfg.nextLink ? { href: cfg.nextLink.href, label: cfg.nextLink.label() } : null;
  }

  /* One "Test yourself" per group, with a button per quiz topic its concepts belong to. */
  function groupQuizHtml(h) {
    const topics = [...new Set(h.items.map((k) => CONCEPTS[k].topic).filter((tp) => tp && TOPICS[tp] && pool(tp).length))];
    if (!topics.length) return '';
    const n = topics.reduce((sum, tp) => sum + pool(tp).length, 0);
    const one = topics.length === 1;
    const tried = one && best[topics[0]] ? ` · ${t('Best: {score} of {total}', { score: best[topics[0]], total: n })}` : '';
    const sub = one
      ? (n === 1 ? t('1 question on {topic}', { topic: TOPICS[topics[0]] }) : t('{n} questions on {topic}', { n, topic: TOPICS[topics[0]] })) + tried
      : t('{n} questions on this group', { n });
    return `<aside class="concept-quiz" aria-labelledby="gq-title">
        <svg class="cq-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${RAIL_ICON.quiz}</svg>
        <div class="cq-text">
          <p class="cq-title" id="gq-title">${esc(t('Test yourself'))}</p>
          <p class="cq-sub">${esc(sub)}</p>
        </div>
        <div class="gq-actions">${topics.map((tp) => `<a class="btn${one ? '' : ' ghost'}" href="${BASE}/quiz/${esc(tp)}">${esc(one ? t('Start the quiz') : `${TOPICS[tp]} (${pool(tp).length})`)}</a>`).join('')}</div>
      </aside>`;
  }

  /* The section root: its videos, then every group with its concepts and their one-sentence definitions. */
  function renderOverview() {
    const blurb = cfg.blurb ? cfg.blurb() : '';
    view().innerHTML = layout(`
      <header class="group-head">
        <h1 id="ov-h" tabindex="-1">${esc(cfg.title())}</h1>
        ${blurb ? `<p class="story">${esc(blurb)}</p>` : ''}
        <p class="group-meta">${esc([
          count(HUBS.length, '1 group', '{n} groups'),
          count(CONCEPTS.length, '1 concept', '{n} concepts'),
          t('about {n} min of reading', { n: minutes(ALL) }),
          VIDEOS.length ? count(VIDEOS.length, '1 video', '{n} videos') : '',
        ].filter(Boolean).join(' · '))}</p>
        <p class="ov-actions">
          <a class="btn" href="${conceptHref(HUBS[0].items[0])}">${esc(t('Start with {group}', { group: t(HUBS[0].label) }))}</a>
          ${PRACTICE ? `<a class="btn ghost" href="${PRACTICE.links(null)[0].href}">${esc(t(PRACTICE.label))}</a>` : ''}
          ${HAS_QUIZ ? `<a class="btn ghost" href="${BASE}/quiz">${esc(t('Test yourself'))}</a>` : ''}
          ${cfg.pdf ? `<a class="btn ghost" href="${summaryPdf(cfg.pdf)}" download>${esc(t('Summary (PDF)'))}</a>` : ''}
        </p>
      </header>
      ${VideoHtml.list(VIDEOS, { t, hrefFor: videoHref, watched })}
      <ol class="ov-groups">
        ${HUBS.map((h, g) => `<li class="ov-group">
            <h2><span class="ov-n" aria-hidden="true">${g + 1}</span><a href="${conceptHref(h.items[0])}">${esc(t(h.label))}</a></h2>
            <p class="group-meta">${esc(groupMeta(h))}</p>
            <ul class="ov-list">${h.items.map((k) => `<li><a href="${conceptHref(k)}">${esc(CONCEPTS[k].title)}</a><span class="ov-sum">${md(CONCEPTS[k].summary)}</span></li>`).join('')}</ul>
          </li>`).join('')}
      </ol>`, 'is-overview');
  }

  /* A group page: its videos, its concepts one after another, then its quiz and the next group. */
  function renderGroup() {
    const g = hubOf(route.concept);
    const h = HUBS[g];
    const prev = g > 0 ? { href: conceptHref(HUBS[g - 1].items[0]), label: t(HUBS[g - 1].label), kind: t('Previous') } : null;
    const last = afterLastGroup();
    const next = g < HUBS.length - 1
      ? { href: conceptHref(HUBS[g + 1].items[0]), label: t(HUBS[g + 1].label), kind: t('Next') }
      : last && { ...last, kind: t('Finished reading?') };
    const st = VideoPlayer.state();
    view().innerHTML = layout(`
      <header class="group-head">
        <p class="concept-count"><a href="${BASE}">${esc(cfg.title())}</a> · ${esc(t('Group {n} of {total}', { n: g + 1, total: HUBS.length }))}</p>
        <h1 id="group-h" tabindex="-1">${esc(t(h.label))}</h1>
        <div class="group-head-row">
          <p class="group-meta">${esc(groupMeta(h))}</p>
          ${h.items.length > 1 ? `<p class="group-tools"><button type="button" class="all-toggle" data-action="concepts-all" data-fid="concepts-all" aria-pressed="${!!ui.allOpen}"><span class="sw" aria-hidden="true"></span>${esc(t('Show all concepts'))}</button></p>` : ''}
        </div>
      </header>
      ${videosOf(h).map((v) => VideoHtml.figure(v, { t, watched: st.watched(v.id), rec: st.rec })).join('')}
      <div class="group-body">${h.items.map((k, j) => cardHtml(CONCEPTS[k], {
        n: j + 1,
        open: !!ui.allOpen || h.items.length === 1 || k === route.concept,
        next: j < h.items.length - 1 ? CONCEPTS[h.items[j + 1]] : null,
      })).join('')}</div>
      <div class="group-end">${groupQuizHtml(h)}</div>
      <nav class="pager" aria-label="${esc(t('Groups'))}">
        ${prev ? `<a class="prev" href="${prev.href}"><span>← ${esc(prev.kind)}</span>${esc(prev.label)}</a>` : ''}
        ${next ? `<a class="next" href="${next.href}"><span>${esc(next.kind)} →</span>${esc(next.label)}</a>` : ''}
      </nav>`, 'is-group');
    markRead(CONCEPTS[route.concept].id);
    VideoPlayer.mountAll(view());
    watchGroup();
  }

  /* While a group page is open: mark each concept read when its end is seen, and keep the
     rail, the dropdown and the address on the concept being read (without a new history entry). */
  let observers = [];
  function watchGroup() {
    observers.forEach((o) => o.disconnect());
    observers = [];
    // Find-in-page reached a closed panel: open it the same way a click would.
    view().querySelectorAll('.concept-panel').forEach((p) => p.addEventListener('beforematch', () => openConcept(p.closest('.concept'), false)));
    // The last choice becomes the default for every "Try it". A newly opened one measures itself again.
    view().querySelectorAll('details.try').forEach((d) => d.addEventListener('toggle', () => {
      if (!!ui.tryOpen !== d.open) { ui.tryOpen = d.open; railUi.save(); }
      if (d.open) window.dispatchEvent(new Event('resize'));
    }));
    if (typeof IntersectionObserver === 'undefined') return;
    const ends = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting && e.target.offsetParent) markRead(e.target.dataset.read);
    }), { rootMargin: '-120px 0px 0px 0px' });   // not the end of the concept just above a jump target
    view().querySelectorAll('.concept-end').forEach((el) => ends.observe(el));
    // The open concept crossing the top quarter of the screen is the current one.
    const spy = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting && e.target.classList.contains('is-open')).pop();
      if (hit && hit.target.isConnected) setCurrent(CONCEPTS.findIndex((c) => `c-${c.id}` === hit.target.id));
    }, { rootMargin: '0px 0px -75% 0px' });
    view().querySelectorAll('.group-body > .concept').forEach((el) => spy.observe(el));
    observers = [ends, spy];
  }

  /* Rail, dropdown and address follow the current concept (no new history entry). */
  function setCurrent(k) {
    if (k < 0 || k === route.concept || route.page !== 'concept') return;
    route = { ...route, concept: k, rest: CONCEPTS[k].id };
    view().querySelectorAll('.rail-pages a[aria-current="page"]').forEach((a) => a.removeAttribute('aria-current'));
    view().querySelector(`.rail-pages a[href="${conceptHref(k)}"]`)?.setAttribute('aria-current', 'page');
    const sel = $('#side-go');
    if (sel) sel.value = conceptHref(HUBS[hubOf(k)].items[0]);
    try { history.replaceState(null, '', conceptHref(k)); } catch (e) { /* file:// or sandbox */ }
  }

  function setOpen(art, open) {
    art.classList.toggle('is-open', open);
    art.querySelector('.cc-toggle').setAttribute('aria-expanded', String(open));
    const panel = art.querySelector('.concept-panel');
    if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', 'until-found');
  }

  /* Opens one concept and, unless every concept is shown, closes the others. Closing a long
     concept above it moves the page, so the opened title is brought back to the top. */
  function openConcept(art, scroll) {
    if (!ui.allOpen) view().querySelectorAll('.group-body > .cc.is-open').forEach((o) => { if (o !== art) setOpen(o, false); });
    setOpen(art, true);
    const k = CONCEPTS.findIndex((c) => `c-${c.id}` === art.id);
    setCurrent(k);
    if (k >= 0) markRead(CONCEPTS[k].id);
    window.dispatchEvent(new Event('resize'));   // widgets and scrollers measure again now that they are visible
    const top = art.getBoundingClientRect().top;
    if (scroll && (top < 0 || top > innerHeight / 3)) art.scrollIntoView({ block: 'start' });
  }

  function toggleConcept(el) {
    const art = el.closest('.concept');
    if (art.classList.contains('is-open')) setOpen(art, false);
    else openConcept(art, true);
  }

  /* "Show all concepts": every panel open (to read straight through or print), remembered. */
  function toggleAll(btn) {
    ui.allOpen = !ui.allOpen;
    railUi.save();
    btn.setAttribute('aria-pressed', String(ui.allOpen));
    const arts = [...view().querySelectorAll('.group-body > .cc')];
    if (ui.allOpen) arts.forEach((a) => setOpen(a, true));
    else arts.forEach((a) => setOpen(a, a.id === `c-${CONCEPTS[route.concept].id}`));
    window.dispatchEvent(new Event('resize'));
    announce(ui.allOpen ? t('All concepts shown') : t('One concept at a time'));
  }

  /* Called by the router after it scrolled to the top: a link to a concept that is not the
     first of its group scrolls to it. Focus goes to the heading the reader lands on. */
  let target = null;
  function afterNavigate() {
    const t0 = target;
    target = null;
    if (!t0) return;
    const el = $(t0.selector);
    if (!el) return;
    if (t0.scroll) el.closest('.concept')?.scrollIntoView({ block: 'start' });
    if (t0.focus) el.focus({ preventScroll: true });
  }

  /* ---- Summary sheet (print source of the section PDF) ------------------------- */

  /* The card without its long paragraphs, widgets and call-outs. */
  const summaryCard = (c) => `<article class="ss-card">
      <h3>${esc(c.title)}</h3>
      <p class="summary">${md(c.summary)}</p>
      ${pointsHtml(c)}
      ${figHtml(c, 'ss-fig', cfg.figure ? cfg.figure(c) : '')}
      ${tablesHtml(c)}
      ${c.code ? codeHtml(c) : ''}
      ${cfg.summaryExtra ? cfg.summaryExtra(c) : ''}
      ${noteHtml('example', 'Example.', c.example)}
      ${noteHtml('mistake', 'Common mistake.', c.mistake)}
    </article>`;

  function renderSummary() {
    const list = HUBS;
    view().innerHTML = `
      <div class="summary-sheet">
        <header class="ss-head">
          <img src="assets/cunef-logo.png" width="114" height="40" alt="CUNEF Universidad">
          <div>
            <p class="ss-course">${esc(t('Relational databases'))} · ${esc(t('Databases practice'))}</p>
            <h1>${esc(cfg.title())}: ${esc(t('summary'))}</h1>
          </div>
        </header>
        <nav class="ss-toc" aria-label="${esc(t('Contents'))}"><ol>${list.map((h) => `<li><strong>${esc(t(h.label))}</strong>: ${h.items.map((k) => esc(CONCEPTS[k].title)).join(' · ')}</li>`).join('')}</ol></nav>
        ${list.map((h) => `<section class="ss-hub"><h2>${esc(t(h.label))}</h2>${h.items.map((k) => summaryCard(CONCEPTS[k])).join('')}</section>`).join('')}
      </div>`;
    return `${t('Summary')} · ${cfg.title()}`;
  }

  /* ---- Quiz ---------------------------------------------------------------- */

  const pool = (topic) => QUIZ.map((q, k) => k).filter((k) => topic === 'all' || QUIZ[k].topic === topic);

  /* A run over the topic's pool, or over `only` (the questions missed in the last run: no best score is saved). */
  function startQuiz(topic, only) {
    Object.assign(quiz, {
      topic, order: shuffle(only || pool(topic)), i: 0, score: 0, picked: null, typed: '',
      missed: [], skipped: [], results: {}, done: false, retry: !!only,
    });
  }

  const normAnswer = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const isRight = (q, picked) => {
    if (q.type === 'fib') return q.accept.some((a) => normAnswer(a) === normAnswer(picked));
    if (q.type === 'tf') return picked === (q.answer ? 1 : 0);
    return picked === q.answer;
  };
  const answerText = (q) => (q.type === 'fib' ? q.accept[0] : q.type === 'tf' ? (q.answer ? t('True') : t('False')) : q.choices[q.answer]);

  /* 'all' plus every topic that has questions. */
  const quizTopics = () => ['all', ...Object.keys(TOPICS).filter((tp) => pool(tp).length)];

  /* A topic in the dropdown: its name, its size and, once tried, the best score on this device. */
  function topicOption(tp) {
    const n = pool(tp).length;
    const topic = tp === 'all' ? t('All topics') : TOPICS[tp];
    if (!best[tp]) return t('{topic} ({n} questions)', { topic, n });
    return t('{topic} ({n} questions) · best {score}/{n}', { topic, n, score: best[tp] }) + (best[tp] >= n ? ' ✓' : '');
  }

  function topicsHtml() {
    return `<div class="topic-pick">
        <label for="quiz-topic">${esc(t('Topic'))}</label>
        <select id="quiz-topic">${quizTopics().map((tp) => `<option value="${tp}"${quiz.topic === tp ? ' selected' : ''}>${esc(topicOption(tp))}</option>`).join('')}</select>
      </div>`;
  }

  const wrongCount = () => Object.values(quiz.results).filter((r) => r === 'bad').length;
  const pendingSkips = () => quiz.skipped.filter((k) => !quiz.results[k]).length;

  /* One cell per question in run order: right, wrong, skipped (still to answer) or pending; the current one is outlined. */
  function stripHtml() {
    const answered = Object.keys(quiz.results).length;
    const label = t('{right} right, {wrong} wrong, {left} to go', { right: quiz.score, wrong: wrongCount(), left: quiz.order.length - answered });
    return `<div class="q-strip" role="img" aria-label="${esc(label)}">${quiz.order.map((k, p) => {
      const r = quiz.results[k];
      let cls = r === 'ok' ? 'ok' : r === 'bad' ? 'bad' : quiz.skipped.includes(k) ? 'skip' : '';
      if (!quiz.done && p === quiz.i) cls += ' cur';
      return `<span class="q-cell ${cls}"></span>`;
    }).join('')}</div>`;
  }

  /* Topic, Start over, the running score and the strip. */
  function quizHead() {
    const topic = quiz.topic === 'all' ? t('All topics') : TOPICS[quiz.topic];
    const title = quiz.retry ? t('{topic}: the ones you missed', { topic }) : topic;
    const skips = pendingSkips();
    return `<header class="q-head">
        <div class="q-head-row">
          <p class="q-topic">${esc(title)}</p>
          ${quiz.done ? '' : `<button type="button" class="btn ghost btn-sm" data-action="restart" data-fid="restart-top">${esc(t('Start over'))}</button>`}
        </div>
        <div class="q-stats">
          <span class="q-pos">${esc(quiz.done ? t('{total} questions', { total: quiz.order.length }) : t('Question {n} of {total}', { n: quiz.i + 1, total: quiz.order.length }))}</span>
          <span class="q-counts">
            <span class="q-ok">${esc(t('{n} right', { n: quiz.score }))}</span>
            <span class="q-bad">${esc(t('{n} wrong', { n: wrongCount() }))}</span>
            ${skips ? `<span class="q-skip">${esc(t('{n} skipped', { n: skips }))}</span>` : ''}
          </span>
        </div>
        ${stripHtml()}
      </header>`;
  }

  /* Keys that answer the current question: letters (or 1–7) for multiple choice, the initials of True / False. */
  function keysHint(q) {
    if (q.type === 'mc') return t('Keys: {keys} to answer, Enter for next', { keys: `A–${'ABCDEFG'[q.choices.length - 1]}` });
    if (q.type === 'tf') return t('Keys: {keys} to answer, Enter for next', { keys: `${t('True')[0]} / ${t('False')[0]}` });
    return '';
  }

  function renderQuiz() {
    if (quiz.topic !== route.topic || !quiz.order.length) startQuiz(route.topic);
    if (!quiz.order.length) {
      view().innerHTML = layout(`<p class="story">${esc(t('There are no questions for this topic yet.'))}</p>`);
      return;
    }
    if (quiz.done) { renderQuizEnd(); return; }
    const q = QUIZ[quiz.order[quiz.i]];
    const answered = quiz.picked !== null;
    const right = answered && isRight(q, quiz.picked);
    const last = quiz.i === quiz.order.length - 1;

    let answerUi;
    if (q.type === 'fib') {
      answerUi = `<form class="fib" data-action="fib-form">
          <label for="fib-in">${esc(t('Your answer'))}</label>
          <div class="fib-row">
            <input id="fib-in" type="text" autocomplete="off" spellcheck="false" value="${esc(quiz.typed)}"${answered ? ' disabled' : ''}>
            <button type="submit" class="btn" data-fid="fib-go"${answered ? ' disabled' : ''}>${esc(t('Check'))}</button>
          </div>
        </form>`;
    } else {
      const labels = q.type === 'tf' ? [t('False'), t('True')] : q.choices;
      const order = q.type === 'tf' ? [1, 0] : labels.map((_, k) => k);
      const correctIdx = q.type === 'tf' ? (q.answer ? 1 : 0) : q.answer;
      answerUi = `<div class="options" role="group" aria-label="${esc(t('Choose an answer'))}">${order.map((k) => {
        let cls = 'opt';
        let tag = '';
        if (answered) {
          if (k === correctIdx) { cls += ' correct'; tag = `<span class="tag">${esc(t('Correct'))}</span>`; }
          else if (k === quiz.picked) { cls += ' wrong'; tag = `<span class="tag">${esc(t('Your answer'))}</span>`; }
        }
        const letter = q.type === 'mc' ? `<span class="letter">${'ABCDEFG'[k]}</span>` : '';
        return `<button type="button" class="${cls}" data-action="answer" data-i="${k}"${answered ? ' disabled' : ''}><span class="opt-text">${letter}<span>${md(labels[k])}</span></span>${tag}</button>`;
      }).join('')}</div>`;
    }

    const verdict = answered
      ? `<section class="feedback ${right ? 'ok' : 'bad'}" aria-labelledby="qf-title">
           <h3 id="qf-title" tabindex="-1">${esc(right ? t('Correct') : t('Not quite'))}</h3>
           <p>${right ? '' : `${md(t('The answer is “{answer}”.', { answer: answerText(q) }))} `}${md(q.why || '')}</p>
         </section>`
      : '';
    // Skip sends the question to the end of the run; not offered when it is the only one left.
    const action = answered
      ? `<button type="button" class="btn" data-action="next" data-fid="next">${esc(last ? t('See result') : t('Next question'))}</button>`
      : (last ? '' : `<button type="button" class="btn ghost" data-action="skip" data-fid="skip">${esc(t('Skip for now'))}</button>`);
    const hint = keysHint(q);

    const kind = { mc: t('Multiple choice'), tf: t('True or false'), fib: t('Fill in the blank') }[q.type];
    const topic = quiz.topic === 'all' && TOPICS[q.topic] ? ` · ${TOPICS[q.topic]}` : '';
    view().innerHTML = layout(`
      ${topicsHtml()}
      <article class="quiz" aria-labelledby="q-title">
        ${quizHead()}
        <h2 id="q-title" class="q-text">${md(q.q).replace(/_{3,}/g, '<span class="blank">_____</span>')}</h2>
        <p class="q-kind">${esc(kind + topic)}</p>
        ${cfg.figure && cfg.figure(q) ? `<figure class="quiz-fig"><div class="scroll">${cfg.figure(q)}</div></figure>` : ''}
        ${answerUi}
        <div id="q-fb">${verdict}</div>
        ${action || hint ? `<div class="q-actions">${action}${hint ? `<span class="q-keys">${esc(hint)}</span>` : ''}</div>` : ''}
      </article>`);
  }

  function renderQuizEnd() {
    const total = quiz.order.length;
    const missed = quiz.missed.map((k) => QUIZ[k]);
    const bestLine = quiz.retry ? '' : `<p class="meta">${esc(t('Best result on this device for this topic: {best} of {total}.', { best: best[quiz.topic] || 0, total }))}</p>`;
    view().innerHTML = layout(`
      ${topicsHtml()}
      <article class="quiz" aria-labelledby="q-title">
        ${quizHead()}
        <h2 id="q-title" class="q-result" tabindex="-1"><span class="q-result-n">${quiz.score}<span> / ${total}</span></span>${esc(t('right answers'))}</h2>
        ${bestLine}
        <p class="actions">
          ${missed.length ? `<button type="button" class="btn" data-action="retry-missed" data-fid="retry-missed">${esc(t('Retry the {n} I missed', { n: missed.length }))}</button>` : ''}
          <button type="button" class="btn${missed.length ? ' ghost' : ''}" data-action="restart" data-fid="restart">${esc(t('Repeat in a different order'))}</button>
          <a class="btn ghost" href="${BASE}">${esc(t('Review the concepts'))}</a>
          ${cfg.nextLink ? `<a class="btn ghost" href="${cfg.nextLink.href}">${esc(cfg.nextLink.label())}</a>` : ''}
        </p>
        ${missed.length
          ? `<h3>${esc(t('To review'))}</h3><ul class="plain review">${missed.map((q) => `<li>${md(q.q).replace(/_{3,}/g, '_____')} <strong>${md(t('Answer: {answer}.', { answer: answerText(q) }))}</strong> ${md(q.why || '')}</li>`).join('')}</ul>`
          : `<p class="story">${esc(cfg.perfectText())}</p>`}
      </article>`);
    $('#q-title')?.focus({ preventScroll: true });
  }

  function answer(value) {
    if (quiz.picked !== null) return;
    const qi = quiz.order[quiz.i];
    quiz.picked = value;
    if (isRight(QUIZ[qi], value)) { quiz.score++; quiz.results[qi] = 'ok'; } else { quiz.missed.push(qi); quiz.results[qi] = 'bad'; }
    renderQuiz();
    $('#qf-title')?.focus({ preventScroll: true });
    $('.q-actions')?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  const focusQuestion = () => (quiz.done ? $('#q-title') : $('#fib-in') || $('.options .opt'))?.focus({ preventScroll: true });

  function nextQuestion() {
    if (quiz.i < quiz.order.length - 1) { quiz.i++; quiz.picked = null; quiz.typed = ''; }
    else {
      quiz.done = true;
      if (!quiz.retry && quiz.score > (best[quiz.topic] || 0)) { best[quiz.topic] = quiz.score; store.save(best); }
    }
    renderQuiz();
    focusQuestion();
  }

  function skipQuestion() {
    const [k] = quiz.order.splice(quiz.i, 1);
    quiz.order.push(k);
    if (!quiz.skipped.includes(k)) quiz.skipped.push(k);
    quiz.typed = '';
    renderQuiz();
    focusQuestion();
    announce(t('Skipped. It comes back at the end.'));
  }

  /* Events of a practice page go to the practice module; the others to cfg's hooks. */
  function forward(name, ...args) {
    const f = (route.page === 'practice' ? PRACTICE : cfg)[name];
    if (f) f(...args);
  }

  function onClick(el, e) {
    if (el.dataset.action === 'toggle-side') { toggleSide(); return; }
    if (route.page === 'practice') { forward('onClick', el, e); return; }
    switch (el.dataset.action) {
      case 'answer': answer(+el.dataset.i); break;
      case 'next': nextQuestion(); break;
      case 'skip': skipQuestion(); break;
      case 'dl-code': downloadCode(el.dataset.card); break;
      case 'concept-toggle': toggleConcept(el); break;
      case 'concept-next': {
        const art = $(`#c-${CSS.escape(el.dataset.id)}`);
        if (art) { openConcept(art, true); art.querySelector('.cc-toggle').focus({ preventScroll: true }); }
        break;
      }
      case 'concepts-all': toggleAll(el); break;
      case 'toggle-part': togglePart(el); break;
      case 'video-watched': break;              // js/video-player.js saves it
      case 'restart':
      case 'retry-missed':
        startQuiz(quiz.topic, el.dataset.action === 'retry-missed' ? quiz.missed.slice() : null);
        renderQuiz();
        focusQuestion();
        break;
      default:
        forward('onClick', el, e);
    }
  }

  /* Quiz keys: A–G or 1–7 pick an option, the initials of True / False answer those, Enter moves on. */
  function quizKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || quiz.done || !quiz.order.length) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const q = QUIZ[quiz.order[quiz.i]];
    if (quiz.picked !== null) {
      if (e.key === 'Enter' && !e.target.closest('button, a')) { e.preventDefault(); nextQuestion(); }
      return;
    }
    const key = e.key.toLowerCase();
    let pick = -1;
    if (q.type === 'mc') {
      pick = 'abcdefg'.indexOf(key);
      if (pick < 0 && /^[1-7]$/.test(key)) pick = +key - 1;
      if (pick >= q.choices.length) pick = -1;
    } else if (q.type === 'tf') {
      if (key === t('True')[0].toLowerCase() || key === '1') pick = 1;
      else if (key === t('False')[0].toLowerCase() || key === '2') pick = 0;
    }
    if (pick >= 0 && key.length === 1) { e.preventDefault(); answer(pick); }
  }

  function onSubmit(form) {
    if (route.page === 'practice') { forward('onSubmit', form); return; }
    if (form.dataset.action !== 'fib-form') return;
    const input = $('#fib-in');
    const v = input ? input.value.trim() : '';
    if (!v) { input?.focus(); return; }
    quiz.typed = v;
    answer(v);
  }

  /* The two dropdowns navigate as soon as a new option is picked. */
  function onChange(e) {
    const el = e.target;
    if (el.id === 'side-go') { location.hash = el.value; return; }
    forward('onChange', e);
    if (route.page === 'practice') return;
    if (el.id === 'quiz-topic') location.hash = `${BASE}/quiz${el.value === 'all' ? '' : `/${el.value}`}`;
  }

  function render(rest) {
    const r = rest || '';
    const m = r.match(/^quiz(?:\/([a-z-]+))?$/);
    const from = lastPage;
    observers.forEach((o) => o.disconnect());
    observers = [];
    target = null;
    if (PRACTICE && PRACTICE.match(r)) {
      route = { page: 'practice', concept: route.concept, topic: 'all', rest: r };
      lastPage = 'practice';
      view().innerHTML = layout('<div id="practice-slot"></div>');
      return `${PRACTICE.render(r)} · ${cfg.title()}`;
    }
    if (r === 'summary') {
      route = { page: 'summary', concept: route.concept, topic: 'all', rest: r };
      lastPage = 'summary';
      return renderSummary();
    }
    if (m && HAS_QUIZ) {
      route = { page: 'quiz', concept: route.concept, topic: m[1] && TOPICS[m[1]] ? m[1] : 'all', rest: r };
      lastPage = 'quiz';
      renderQuiz();
      return `${t('Test yourself')}${route.topic !== 'all' ? `: ${TOPICS[route.topic]}` : ''} · ${cfg.title()}`;
    }
    const i = CONCEPTS.findIndex((c) => c.id === r);
    if (i < 0) {
      route = { page: 'overview', concept: route.concept, topic: 'all', rest: '' };
      lastPage = 'overview';
      renderOverview();
      target = from && from !== lastPage ? { selector: '#ov-h', focus: true } : null;
      return cfg.title();
    }
    route = { page: 'concept', concept: i, topic: 'all', rest: r };
    const g = hubOf(i);
    const h = HUBS[g];
    const first = h.items[0] === i;
    const page = `group-${g}`;
    renderGroup();
    // Put screen readers on the heading the reader lands on: the group's, or the concept's.
    target = { selector: first ? '#group-h' : `#c-${CSS.escape(CONCEPTS[i].id)}-h .cc-toggle`, scroll: !first, focus: !!from && (from !== page || !first) };
    lastPage = page;
    return `${first ? t(h.label) : CONCEPTS[i].title} · ${cfg.title()}`;
  }

  /* Console warnings for inconsistent quiz data. */
  (function selfTest() {
    QUIZ.forEach((q, i) => {
      const where = `${cfg.quizKey} question ${i}`;
      if (!TOPICS[q.topic]) console.warn(`${where}: unknown topic ${q.topic}`);
      if (q.type === 'mc' && !(q.answer >= 0 && q.answer < q.choices.length)) console.warn(`${where}: answer out of range`);
      if (q.type === 'fib' && !(q.accept && q.accept.length)) console.warn(`${where}: no accepted answers`);
    });
  })();

  const onInput = (e) => forward('onInput', e);
  const onKeydown = (e) => (route.page === 'quiz' ? quizKey(e) : forward('onKeydown', e));

  /* The section's menu in the top bar: its destinations, not its groups (the rail and the overview list those):
     the overview, its practice pages (cfg.practice.menu, else the rail's practice links) and its quiz. */
  function tools() {
    const out = [{ href: BASE, label: t('Overview') }];
    if (PRACTICE) out.push(...(PRACTICE.menu ? PRACTICE.menu() : PRACTICE.links(null)).map((l) => ({ href: l.href, label: l.label })));
    if (HAS_QUIZ) out.push({ href: `${BASE}/quiz`, label: t('Test yourself') });
    return out;
  }

  /* For the home page: the groups, their size and the reading time. */
  function outline() {
    return {
      groups: HUBS.map((h) => ({ label: t(h.label), href: conceptHref(h.items[0]), n: h.items.length })),
      concepts: CONCEPTS.length,
      minutes: minutes(ALL),
      videos: VIDEOS.length,
      blurb: cfg.blurb ? cfg.blurb() : '',
    };
  }

  return { render, afterNavigate, onClick, onChange, onInput, onKeydown, onSubmit, tools, outline, wide: true };
}
