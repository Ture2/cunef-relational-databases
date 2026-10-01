'use strict';

/* ==========================================================================
   Concept section engine, shared by Theory, ER concepts, ER → Logical and
   Normalization: a navigation rail with hubs (the active hub lists its pages,
   the others open a flyout; the rail collapses to icons), one concept card per
   page with Previous / Next, an optional quiz (multiple choice, true/false,
   fill in the blank) with the best score per topic, and an optional practice
   module drawn inside the same layout.
   Routes, below cfg.base: '' or <conceptId> (a card), quiz[/<topic>], and
   whatever cfg.practice.match(rest) accepts.

   Card fields: id, title, summary, body[], points[], table { caption, head, rows },
   tables [table, …], code, example, mistake, caption, practice { href, label?, sub? },
   plus whatever cfg.figure / cfg.extra read.
   cfg: { base, title(), badge, groups: [{ key, label, icon, ids? }] (without ids, a
          hub takes the cards whose `hub` is its key), concepts,
          quiz?, topics?, quizKey?, figure(item) → svg | '', extra(card) → html,
          perfectText(), nextLink: { href, label() }, onClick(el), onChange(e),
          onInput(e),
          practice?: { label, icon, match(rest), links(rest | null) → [{ href, label, current, extra? }],
                       render(rest) → title (draws into #practice-slot),
                       onClick(el, e), onInput(e), onChange(e), onSubmit(form) } }
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
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 1c0 1.8-2.5 2.2-2.5 3.7"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/>',
  collapse: '<path d="M14 6l-6 6 6 6"/><path d="M20 6l-6 6 6 6"/>',
  expand: '<path d="M10 6l6 6-6 6"/><path d="M4 6l6 6-6 6"/>',
};

function ConceptSection(cfg) {
  const BASE = cfg.base;
  const CONCEPTS = cfg.concepts;
  const QUIZ = cfg.quiz || [];
  const TOPICS = cfg.topics || {};
  const HAS_QUIZ = QUIZ.length > 0;
  const PRACTICE = cfg.practice || null;
  const store = makeStore(cfg.quizKey || 'no-quiz');
  const best = Object.assign({}, store.load());       // topic ('all' or a key) -> best score
  const quiz = { topic: null, order: [], i: 0, score: 0, picked: null, typed: '', missed: [], done: false };
  let route = { page: 'concept', concept: 0, topic: 'all', rest: '' };
  let lastPage = null;                                  // to move focus only when navigating inside the section
  const uiStore = makeStore('er-ui-v1');                // this viewer's layout choice, shared by every concept section
  const ui = Object.assign({ sideCollapsed: false }, uiStore.load());

  const view = () => $('#view');

  /* ---- Layout: sidebar (a dropdown on narrow screens) + main area ------------ */

  const conceptHref = (i) => (i === 0 ? BASE : `${BASE}/${CONCEPTS[i].id}`);

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

  function sideHtml() {
    const onQuiz = route.page !== 'concept';         // a quiz or a practice page: no card is current
    const collapsed = ui.sideCollapsed;
    const conceptLink = (k) => `<li><a href="${conceptHref(k)}"${!onQuiz && k === route.concept ? ' aria-current="page"' : ''}><span class="rail-n">${k + 1}</span><span class="rail-text">${esc(CONCEPTS[k].title)}</span></a></li>`;

    const hubHtml = (h) => {
      const active = !onQuiz && h.items.includes(route.concept);
      const label = esc(t(h.label));
      return `<li class="rail-hub${active ? ' is-active' : ''}">
          <a class="rail-head" href="${conceptHref(h.items[0])}"${active ? ' aria-current="true"' : ''} title="${label}">${icon(h.icon)}<span class="rail-label">${label}</span></a>
          <div class="rail-pages">
            <p class="rail-fly-title" aria-hidden="true">${label}</p>
            <ol>${h.items.map(conceptLink).join('')}</ol>
          </div>
        </li>`;
    };

    const topics = ['all', ...Object.keys(TOPICS).filter((tp) => pool(tp).length)];
    const quizLink = (tp) => {
      const n = pool(tp).length;
      const b = best[tp] ? `<span class="rail-score" title="${esc(t('Best: {score} of {total}', { score: best[tp], total: n }))}">${best[tp]}/${n}</span>` : `<span class="rail-count">${n}</span>`;
      const cur = onQuiz && route.topic === tp;
      return `<li><a href="${BASE}/quiz${tp === 'all' ? '' : `/${tp}`}"${cur ? ' aria-current="page"' : ''}><span class="rail-text">${esc(tp === 'all' ? t('All topics') : TOPICS[tp])}</span>${b}</a></li>`;
    };
    const quizLabel = esc(t('Test yourself'));
    const quizHub = !HAS_QUIZ ? '' : `<li class="rail-hub rail-quiz${onQuiz ? ' is-active' : ''}">
        <a class="rail-head" href="${BASE}/quiz"${onQuiz ? ' aria-current="true"' : ''} title="${quizLabel}">${icon('quiz')}<span class="rail-label">${quizLabel}</span></a>
        <div class="rail-pages">
          <p class="rail-fly-title" aria-hidden="true">${quizLabel}</p>
          <ol>${topics.map(quizLink).join('')}</ol>
        </div>
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
    const options = CONCEPTS.map((c, k) => `<option value="${conceptHref(k)}"${!onQuiz && k === route.concept ? ' selected' : ''}>${k + 1} · ${esc(c.title)}</option>`).join('');
    const quizOption = esc(t('Quiz: {n} questions', { n: QUIZ.length }));
    return `
      <nav class="rail" id="er-side" aria-label="${esc(cfg.title())}">
        <a class="rail-top" href="${BASE}" title="${esc(cfg.title())}"><span class="rail-badge" aria-hidden="true">${esc(cfg.badge)}</span><span class="rail-label">${esc(cfg.title())}</span></a>
        <ul class="rail-hubs">${hubs().map(hubHtml).join('')}</ul>
        <ul class="rail-hubs rail-hubs-end">${practiceHub}${quizHub}</ul>
        <button type="button" class="rail-toggle" data-action="toggle-side" data-fid="toggle-side" aria-expanded="${!collapsed}" title="${esc(toggle)}">${icon(collapsed ? 'expand' : 'collapse')}<span class="rail-label">${esc(toggle)}</span></button>
      </nav>
      <div class="side-select">
        <label for="side-go">${esc(t('Go to'))}</label>
        <select id="side-go">
          <optgroup label="${esc(t('Concepts'))}">${options}</optgroup>
          ${PRACTICE ? `<optgroup label="${pLabel}">${pLinks.map((l) => `<option value="${l.href}"${l.current ? ' selected' : ''}>${esc(l.label)}</option>`).join('')}</optgroup>` : ''}
          ${HAS_QUIZ ? `<optgroup label="${esc(t('Test yourself'))}"><option value="${BASE}/quiz"${route.page === 'quiz' ? ' selected' : ''}>${quizOption}</option></optgroup>` : ''}
        </select>
      </div>`;
  }

  const layout = (main) => `<div class="er-layout${ui.sideCollapsed ? ' is-collapsed' : ''}"><aside class="er-aside">${sideHtml()}</aside><div class="er-main">${main}</div></div>`;

  /* Collapses the rail to its icons, or expands it, in place; the choice is remembered. */
  function toggleSide() {
    ui.sideCollapsed = !ui.sideCollapsed;
    uiStore.save(ui);
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

  function cardHtml(c) {
    const n = QUIZ.filter((q) => q.topic === c.topic).length;
    const fig = cfg.figure ? cfg.figure(c) : '';
    const topic = TOPICS[c.topic] || c.topic;
    // The figure floats right after the summary, so the body text wraps around it instead of leaving a
    // tall empty column; widgets, results and call-outs below clear the float and use the full width.
    return `
      <article class="concept${fig ? '' : ' no-fig'}" id="c-${esc(c.id)}" aria-labelledby="c-${esc(c.id)}-h">
        <div class="concept-text">
          <h2 id="c-${esc(c.id)}-h" tabindex="-1">${esc(c.title)}</h2>
          <p class="summary">${md(c.summary)}</p>
          ${fig ? `<figure class="concept-fig"><div class="scroll">${fig}</div>${c.caption ? `<figcaption>${md(c.caption)}</figcaption>` : ''}</figure>` : ''}
          ${(c.body || []).map((p) => `<p>${md(p)}</p>`).join('')}
          ${c.points && c.points.length ? `<ul class="plain">${c.points.map((p) => `<li>${md(p)}</li>`).join('')}</ul>` : ''}
          ${c.example ? `<p class="example"><strong>${esc(t('Example.'))}</strong> ${md(c.example)}</p>` : ''}
          ${c.table ? tableHtml(c.table) : ''}
          ${(c.tables || []).map(tableHtml).join('')}
          ${c.code ? `<pre class="concept-code"><code>${esc(c.code)}</code></pre>` : ''}
          ${c.mistake ? `<p class="mistake"><strong>${esc(t('Common mistake.'))}</strong> ${md(c.mistake)}</p>` : ''}
        </div>
        ${cfg.extra ? cfg.extra(c) : ''}
        ${c.practice ? `<aside class="concept-quiz concept-practice" aria-labelledby="cp-${esc(c.id)}">
            <svg class="cq-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${RAIL_ICON.practice}</svg>
            <div class="cq-text">
              <p class="cq-title" id="cp-${esc(c.id)}">${esc(t('Practise it'))}</p>
              ${c.practice.sub ? `<p class="cq-sub">${md(c.practice.sub)}</p>` : ''}
            </div>
            <a class="btn" href="${c.practice.href}">${esc(c.practice.label || t('Start the exercise'))}</a>
          </aside>` : ''}
        ${n ? `<aside class="concept-quiz" aria-labelledby="cq-${esc(c.id)}">
            ${RAIL_ICON.quiz ? `<svg class="cq-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${RAIL_ICON.quiz}</svg>` : ''}
            <div class="cq-text">
              <p class="cq-title" id="cq-${esc(c.id)}">${esc(t('Test yourself'))}</p>
              <p class="cq-sub">${esc(n === 1 ? t('1 question on {topic}', { topic }) : t('{n} questions on {topic}', { n, topic }))}</p>
            </div>
            <a class="btn" href="${BASE}/quiz/${esc(c.topic)}">${esc(t('Start the quiz'))}</a>
          </aside>` : ''}
      </article>`;
  }

  /* A small data table inside a card: { caption?, head: [...], rows: [[...]] }; cells use md(). */
  const tableHtml = (tb) => `<div class="scroll concept-table"><table class="src">${tb.caption ? `<caption>${md(tb.caption)}</caption>` : ''}
      <thead><tr>${tb.head.map((h) => `<th scope="col">${md(h)}</th>`).join('')}</tr></thead>
      <tbody>${tb.rows.map((r) => `<tr>${r.map((v, k) => (k === 0 ? `<th scope="row">${md(v)}</th>` : `<td>${md(v)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;

  function renderConcept() {
    const i = route.concept;
    const c = CONCEPTS[i];
    const prev = i > 0 ? { href: conceptHref(i - 1), label: `${i} · ${CONCEPTS[i - 1].title}`, kind: t('Previous') } : null;
    let last = { href: `${BASE}/quiz`, label: t('Test yourself') };
    if (!HAS_QUIZ && PRACTICE) last = { href: PRACTICE.links(null)[0].href, label: t(PRACTICE.label) };
    else if (!HAS_QUIZ) last = cfg.nextLink ? { href: cfg.nextLink.href, label: cfg.nextLink.label() } : null;
    const next = i < CONCEPTS.length - 1
      ? { href: conceptHref(i + 1), label: `${i + 2} · ${CONCEPTS[i + 1].title}`, kind: t('Next') }
      : last && { ...last, kind: t('Finished reading?') };
    view().innerHTML = layout(`
      <p class="concept-count">${esc(t('Concept {n} of {total}', { n: i + 1, total: CONCEPTS.length }))}</p>
      ${cardHtml(c)}
      <nav class="pager" aria-label="${esc(t('Concepts'))}">
        ${prev ? `<a class="prev" href="${prev.href}"><span>← ${esc(prev.kind)}</span>${esc(prev.label)}</a>` : ''}
        ${next ? `<a class="next" href="${next.href}"><span>${esc(next.kind)} →</span>${esc(next.label)}</a>` : ''}
      </nav>`);
  }

  /* ---- Quiz ---------------------------------------------------------------- */

  const pool = (topic) => QUIZ.map((q, k) => k).filter((k) => topic === 'all' || QUIZ[k].topic === topic);

  function startQuiz(topic) {
    Object.assign(quiz, { topic, order: shuffle(pool(topic)), i: 0, score: 0, picked: null, typed: '', missed: [], done: false });
  }

  const normAnswer = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const isRight = (q, picked) => {
    if (q.type === 'fib') return q.accept.some((a) => normAnswer(a) === normAnswer(picked));
    if (q.type === 'tf') return picked === (q.answer ? 1 : 0);
    return picked === q.answer;
  };
  const answerText = (q) => (q.type === 'fib' ? q.accept[0] : q.type === 'tf' ? (q.answer ? t('True') : t('False')) : q.choices[q.answer]);

  function topicsHtml() {
    const topics = ['all', ...Object.keys(TOPICS).filter((tp) => pool(tp).length)];
    return `<div class="topic-pick">
        <label for="quiz-topic">${esc(t('Topic'))}</label>
        <select id="quiz-topic">${topics.map((tp) => `<option value="${tp}"${quiz.topic === tp ? ' selected' : ''}>${esc(t('{topic} ({n} questions)', { topic: tp === 'all' ? t('All topics') : TOPICS[tp], n: pool(tp).length }))}</option>`).join('')}</select>
      </div>`;
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
         </section>
         <p class="actions"><button type="button" class="btn" data-action="next" data-fid="next">${esc(last ? t('See result') : t('Next question'))}</button></p>`
      : '';

    const kind = { mc: t('Multiple choice'), tf: t('True or false'), fib: t('Fill in the blank') }[q.type];
    view().innerHTML = layout(`
      ${topicsHtml()}
      <article class="quiz" aria-labelledby="q-title">
        <p class="q-progress">${esc(t('Question {n} of {total} · {kind} · {topic}. Correct: {score}.', { n: quiz.i + 1, total: quiz.order.length, kind, topic: TOPICS[q.topic] || '', score: quiz.score }))}</p>
        <h2 id="q-title" class="q-text">${md(q.q).replace(/_{3,}/g, '<span class="blank">_____</span>')}</h2>
        ${cfg.figure && cfg.figure(q) ? `<figure class="quiz-fig"><div class="scroll">${cfg.figure(q)}</div></figure>` : ''}
        ${answerUi}
        <div id="q-fb">${verdict}</div>
      </article>`);
  }

  function renderQuizEnd() {
    const total = quiz.order.length;
    const missed = quiz.missed.map((k) => QUIZ[k]);
    view().innerHTML = layout(`
      ${topicsHtml()}
      <article class="quiz" aria-labelledby="q-title">
        <h2 id="q-title" tabindex="-1">${esc(t('You got {score} of {total} right', { score: quiz.score, total }))}</h2>
        <p class="meta">${esc(t('Best result on this device for this topic: {best} of {total}.', { best: best[quiz.topic] || 0, total }))}</p>
        ${missed.length
          ? `<h3>${esc(t('To review'))}</h3><ul class="plain review">${missed.map((q) => `<li>${md(q.q).replace(/_{3,}/g, '_____')} <strong>${md(t('Answer: {answer}.', { answer: answerText(q) }))}</strong> ${md(q.why || '')}</li>`).join('')}</ul>`
          : `<p class="story">${esc(cfg.perfectText())}</p>`}
        <p class="actions">
          <button type="button" class="btn" data-action="restart" data-fid="restart">${esc(t('Repeat in a different order'))}</button>
          <a class="btn ghost" href="${BASE}">${esc(t('Review the concepts'))}</a>
          ${cfg.nextLink ? `<a class="btn ghost" href="${cfg.nextLink.href}">${esc(cfg.nextLink.label())}</a>` : ''}
        </p>
      </article>`);
    $('#q-title')?.focus({ preventScroll: true });
  }

  function answer(value) {
    if (quiz.picked !== null) return;
    const qi = quiz.order[quiz.i];
    quiz.picked = value;
    if (isRight(QUIZ[qi], value)) quiz.score++; else quiz.missed.push(qi);
    renderQuiz();
    reveal($('#qf-title'));
  }

  function onClick(el, e) {
    if (el.dataset.action === 'toggle-side') { toggleSide(); return; }
    if (route.page === 'practice') { if (PRACTICE.onClick) PRACTICE.onClick(el, e); return; }
    switch (el.dataset.action) {
      case 'answer': answer(+el.dataset.i); break;
      case 'next':
        if (quiz.i < quiz.order.length - 1) { quiz.i++; quiz.picked = null; quiz.typed = ''; }
        else {
          quiz.done = true;
          if (quiz.score > (best[quiz.topic] || 0)) { best[quiz.topic] = quiz.score; store.save(best); }
        }
        renderQuiz();
        (quiz.done ? $('#q-title') : $('#fib-in') || $('.options .opt'))?.focus({ preventScroll: true });
        break;
      case 'restart':
        startQuiz(quiz.topic);
        renderQuiz();
        $('#q-title')?.focus({ preventScroll: true });
        break;
      default:
        if (cfg.onClick) cfg.onClick(el);
    }
  }

  function onSubmit(form) {
    if (route.page === 'practice') { if (PRACTICE.onSubmit) PRACTICE.onSubmit(form); return; }
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
    if (route.page === 'practice') { if (PRACTICE.onChange) PRACTICE.onChange(e); return; }
    if (cfg.onChange) cfg.onChange(e);
    if (el.id === 'quiz-topic') location.hash = `${BASE}/quiz${el.value === 'all' ? '' : `/${el.value}`}`;
  }

  function render(rest) {
    const r = rest || '';
    const m = r.match(/^quiz(?:\/([a-z-]+))?$/);
    const from = lastPage;
    if (PRACTICE && PRACTICE.match(r)) {
      route = { page: 'practice', concept: route.concept, topic: 'all', rest: r };
      lastPage = 'practice';
      view().innerHTML = layout('<div id="practice-slot"></div>');
      return `${PRACTICE.render(r)} · ${cfg.title()}`;
    }
    if (m && HAS_QUIZ) {
      route = { page: 'quiz', concept: route.concept, topic: m[1] && TOPICS[m[1]] ? m[1] : 'all', rest: r };
      lastPage = 'quiz';
      renderQuiz();
      return `${t('Test yourself')}${route.topic !== 'all' ? `: ${TOPICS[route.topic]}` : ''} · ${cfg.title()}`;
    }
    const i = CONCEPTS.findIndex((c) => c.id === r);
    route = { page: 'concept', concept: i < 0 ? 0 : i, topic: 'all', rest: r };
    lastPage = `concept-${route.concept}`;
    renderConcept();
    // Moving between concepts: put screen readers on the new heading (the router already scrolled to the top).
    if (from && from !== lastPage) $('.concept h2')?.focus({ preventScroll: true });
    return `${CONCEPTS[route.concept].title} · ${cfg.title()}`;
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

  function onInput(e) {
    if (route.page === 'practice') { if (PRACTICE.onInput) PRACTICE.onInput(e); return; }
    if (cfg.onInput) cfg.onInput(e);
  }

  return { render, onClick, onChange, onInput, onSubmit };
}
