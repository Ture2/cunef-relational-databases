'use strict';

/* ==========================================================================
   Progress across the relational course: cards read, exercises solved and
   best quiz scores, read fresh from what each section saves (this device
   only). Route: #/progress. Also draws the ring of the app-bar button.
   Sources: read-v1 (js/concept-section.js), theory-quiz-v1, er-quiz-v1,
   sql-quiz-v1, er-logical-v1 (js/logical.js), normalization-en-v1 (js/normalization.js).
   ========================================================================== */

const ProgressPage = (() => {
  const load = (key) => makeStore(key).load();
  const list = (v) => (Array.isArray(v) ? v : []);

  /* Best score of a concept-section quiz: the "all topics" run or the sum of the topic runs. */
  function quizScore(key, total) {
    const best = load(key);
    const byTopic = Object.entries(best).filter(([k]) => k !== 'all').reduce((s, [, v]) => s + (+v || 0), 0);
    return Math.min(total, Math.max(+best.all || 0, byTopic));
  }

  const cardHref = (base, cards, k) => (k === 0 ? base : `${base}/${cards[k].id}`);

  /* One entry per section, in teaching order: { id, title, base, parts: [{ label, done, total, next? }] }. */
  function sections() {
    const read = load('read-v1');
    const readPart = (base, cards) => {
      const mine = read[base] || {};
      const k = cards.findIndex((c) => !mine[c.id]);
      return { label: t('Reading'), done: cards.filter((c) => mine[c.id]).length, total: cards.length, next: k < 0 ? null : { href: cardHref(base, cards, k), label: cards[k].title } };
    };
    const quizPart = (base, key, quiz) => {
      const n = list(quiz).length;
      return { label: t('Quiz'), done: quizScore(key, n), total: n, next: { href: `${base}/quiz`, label: t('Test yourself') } };
    };
    const solvedPart = (label, items, solved, href) => {
      const k = items.findIndex((x) => !solved[x.e.id]);
      return { label, done: items.filter((x) => solved[x.e.id]).length, total: items.length, next: k < 0 ? null : { href: href(items[k].i), label: items[k].e.title } };
    };

    const out = [];
    out.push({ id: 'theory', title: t('Theory'), base: '#/relational/theory', parts: [readPart('#/relational/theory', THEORY_CONCEPTS), quizPart('#/relational/theory', 'theory-quiz-v1', THEORY_QUIZ)] });
    const erSolved = load('er-practice-v1').solved || {};
    out.push({ id: 'er', title: t('ER concepts'), base: '#/relational/er', parts: [
      readPart('#/relational/er', ER_CONCEPTS),
      solvedPart(t('Modelling exercises'), list(ER_PRACTICE).map((e, i) => ({ e, i })), erSolved, (i) => `#/relational/er/practice/${i + 1}`),
      quizPart('#/relational/er', 'er-quiz-v1', ER_QUIZ),
    ] });

    const logicalSolved = load('er-logical-v1').solved || {};
    const lx = LOGICAL_EXERCISES.map((e, i) => ({ e, i }));
    const lHref = (i) => `#/relational/logical/practice/${i + 1}`;
    out.push({ id: 'logical', title: t('ER → Logical'), base: '#/relational/logical', parts: [
      readPart('#/relational/logical', LOGICAL_RULES),
      solvedPart(t('Level 1 exercises'), lx.filter((x) => x.e.level === 1), logicalSolved, lHref),
      solvedPart(t('Level 2 exercises'), lx.filter((x) => x.e.level === 2), logicalSolved, lHref),
    ] });

    const norm = load('normalization-en-v1');
    const nBasic = QUESTIONS.filter((q) => !q.adv).length;
    const nAdv = QUESTIONS.length - nBasic;
    out.push({ id: 'normalization', title: t('Normalization'), base: '#/relational/normalization', parts: [
      readPart('#/relational/normalization', NORM_THEORY),
      solvedPart(t('Normalize exercises'), EXERCISES.map((e, i) => ({ e, i })), norm.solved || {}, (i) => `#/relational/normalization/practice/${i + 1}`),
      { label: t('Diagnose · {a} to {b}', { a: nfLabel('1NF'), b: nfLabel('3NF') }), done: Math.min(nBasic, +norm.quizBest || 0), total: nBasic, next: { href: '#/relational/normalization/diagnose', label: t('Diagnose') } },
      { label: t('Diagnose · {a} to {b}', { a: nfLabel('BCNF'), b: nfLabel('5NF') }), done: Math.min(nAdv, +norm.quizBestAdv || 0), total: nAdv, next: { href: '#/relational/normalization/diagnose/advanced', label: t('Diagnose (advanced)') } },
    ] });

    const sqlCards = list(SQL_CONCEPTS);
    if (sqlCards.length) {
      const chSolved = load('sql-challenges-v1').solved || {};
      const cx = list(SQL_CHALLENGES).map((e, i) => ({ e, i }));
      out.push({ id: 'sql', title: t('SQL'), base: '#/relational/sql', parts: [
        readPart('#/relational/sql', sqlCards),
        quizPart('#/relational/sql', 'sql-quiz-v1', SQL_QUIZ),
        ...(cx.length ? [solvedPart(t('SQL challenges'), cx, chSolved, (i) => `#/relational/sql/practice/${i + 1}`)] : []),
      ] });
    }
    return out;
  }

  function summary() {
    const secs = sections();
    let done = 0;
    let total = 0;
    secs.forEach((s) => s.parts.forEach((p) => { done += p.done; total += p.total; }));
    return { secs, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  /* A ring showing pct (0–100). size in px; the label is for the big ring only. */
  function ring(pct, size, label = '') {
    const r = size / 2 - (size > 40 ? 6 : 3);
    const c = 2 * Math.PI * r;
    const w = size > 40 ? 8 : 3.5;
    return `<svg class="pring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false">
        <circle class="pring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${w}"/>
        <circle class="pring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${w}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
        ${label ? `<text x="50%" y="50%" class="pring-text" dominant-baseline="central" text-anchor="middle">${esc(label)}</text>` : ''}
      </svg>`;
  }

  const bar = (p) => {
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    return `<div class="prow${p.done >= p.total && p.total ? ' is-done' : ''}">
        <span class="prow-label" id="pl-${esc(p.key)}">${esc(p.label)}</span>
        <div class="pbar" role="progressbar" aria-labelledby="pl-${esc(p.key)}" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"><span style="width:${pct}%"></span></div>
        <span class="prow-n">${p.done}/${p.total}</span>
      </div>`;
  };

  function sectionHtml(s) {
    let done = 0;
    let total = 0;
    s.parts.forEach((p, k) => { done += p.done; total += p.total; p.key = `${s.id}-${k}`; });
    const pct = total ? Math.round((done / total) * 100) : 0;
    const next = s.parts.find((p) => p.done < p.total && p.next);
    return `<article class="pcard" aria-labelledby="pc-${s.id}">
        <header class="pcard-head">
          <h2 id="pc-${s.id}"><a href="${s.base}">${esc(s.title)}</a></h2>
          <a class="pcard-pdf" href="${summaryPdf(s.id)}" download title="${esc(t('Download the summary of {section} (PDF)', { section: s.title }))}">PDF</a>
          <span class="pcard-pct">${pct}%</span>
        </header>
        ${s.parts.map(bar).join('')}
        <p class="pcard-next">${next
          ? `<a class="btn" href="${next.next.href}">${esc(t('Continue'))}</a><span class="pcard-what">${esc(next.label)}: ${esc(next.next.label)}</span>`
          : `<span class="pcard-done">${ICON.ok}${esc(t('Section complete'))}</span>`}</p>
      </article>`;
  }

  function render() {
    const s = summary();
    $('#view').innerHTML = `
      <section class="progress-page" aria-labelledby="progress-h">
        <header class="progress-head">
          ${ring(s.pct, 112, `${s.pct}%`)}
          <div>
            <h1 id="progress-h" tabindex="-1">${esc(t('Your progress'))}</h1>
            <p class="story">${esc(t('{done} of {total} steps: cards read, exercises solved and quiz answers right.', { done: s.done, total: s.total }))}</p>
          </div>
        </header>
        <div class="pgrid">${s.secs.map(sectionHtml).join('')}</div>
        <footer class="progress-foot">
          <p class="meta">${esc(t('Saved in this browser only. It is never sent anywhere, and another device starts from zero.'))}</p>
          <button type="button" class="btn ghost" data-action="clear-progress" data-fid="clear-progress">${esc(t('Clear all progress'))}</button>
        </footer>
      </section>`;
    return t('Your progress');
  }

  /* Progress and saved work of every section; the language, theme and rail layout stay. */
  const PROGRESS_KEYS = ['read-v1', 'theory-quiz-v1', 'er-quiz-v1', 'sql-quiz-v1', 'er-practice-v1', 'er-logical-v1', 'normalization-en-v1', 'sql-challenges-v1'];
  /* Saved work is kept per language: <key>-<lang> (langKey in js/core.js), and the plain key for English. */
  const WORK_KEYS = ['er-practice-work-v1', 'er-logical-work-v1', 'normalization-en-work-v1', 'sql-challenges-work-v1'].flatMap((k) => [k, ...Object.keys(DATA).map((l) => `${k}-${l}`)]);
  const KEYS = [...PROGRESS_KEYS, ...WORK_KEYS, 'sql-sandbox-v1'];

  function onClick(el) {
    if (el.dataset.action !== 'clear-progress') return;
    if (!window.confirm(t('Clear your progress and saved work in every section on this device? This cannot be undone.'))) return;
    KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* no storage available */ } });
    location.reload();               // every section keeps its state in memory
  }

  /* The app-bar button: a small ring and the overall percentage. */
  let shownPct = null;
  function updateButton() {
    const btn = $('#progress-btn');
    if (!btn) return;
    const s = summary();
    if (s.pct === shownPct) return;
    shownPct = s.pct;
    btn.querySelector('.progress-ring').innerHTML = ring(s.pct, 28);
    btn.querySelector('.progress-pct').textContent = `${s.pct}%`;
    btn.setAttribute('aria-label', t('Your progress: {pct}%', { pct: s.pct }));
    btn.title = t('Your progress: {pct}%', { pct: s.pct });
  }
  /* Only stores that count towards progress can change the ring (not saved work or layout). */
  window.addEventListener('progress-change', (e) => { if (PROGRESS_KEYS.includes(e.detail)) updateButton(); });

  return { render, onClick, updateButton, summary, ring };
})();
