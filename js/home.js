'use strict';

/* ==========================================================================
   Landing page: where to resume, the five sections with their progress,
   a link to each summary PDF and quick actions. Route: #/ (the default).
   Progress comes from ProgressPage; the last visited route is saved by
   js/main.js under 'last-v1' (this device only).
   ========================================================================== */

const HomePage = (() => {
  const LAST_KEY = 'last-v1';

  function lastRoute() {
    try { return localStorage.getItem(LAST_KEY) || ''; } catch (e) { return ''; }
  }
  function saveLast(hash) {
    try { localStorage.setItem(LAST_KEY, hash); } catch (e) { /* no storage available */ }
  }

  /* Short description, the "practice" entry point and its label, per section. */
  function meta(id) {
    return {
      theory: { text: t('What a database is, the relational model, keys and integrity.'), practice: '/quiz', action: t('Take the quiz') },
      er: { text: t('Entities, relationships, cardinalities, and modelling exercises compared with the official solution.'), practice: '/practice', action: t('Practice') },
      logical: { text: t('Turn an ER diagram into tables, with instant checking.'), practice: '/practice', action: t('Practice') },
      normalization: { text: t('Functional dependencies and normal forms up to 5NF.'), practice: '/practice', action: t('Practice') },
      sql: { text: t('Queries you can run in the browser, a quiz and challenges.'), practice: '/practice', action: t('Practice') },
    }[id];
  }

  /* Where "Continue" goes: the first unfinished step, else the last place visited. */
  function resume(s) {
    for (const sec of s.secs) {
      const p = sec.parts.find((x) => x.done < x.total && x.next);
      if (p && (s.done > 0 || !lastRoute())) return { href: p.next.href, what: `${sec.title}: ${p.next.label}`, started: s.done > 0 };
    }
    const last = lastRoute();
    if (last) return { href: last, what: '', started: true };
    return { href: '#/relational/theory', what: '', started: false };
  }

  function card(sec) {
    let done = 0;
    let total = 0;
    sec.parts.forEach((p) => { done += p.done; total += p.total; });
    const pct = total ? Math.round((done / total) * 100) : 0;
    const m = meta(sec.id);
    return `<article class="home-card${pct === 100 ? ' is-done' : ''}" aria-labelledby="hc-${sec.id}">
        <header class="home-card-head">
          <h2 id="hc-${sec.id}"><a href="${sec.base}">${esc(sec.title)}</a></h2>
          <span class="pcard-pct">${pct}%</span>
        </header>
        <p class="home-card-text">${esc(m.text)}</p>
        <div class="pbar" role="progressbar" aria-label="${esc(sec.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
        <p class="home-card-links">
          <a class="btn" href="${sec.base}">${esc(t('Read'))}</a>
          <a class="btn ghost" href="${sec.base}${m.practice}">${esc(m.action)}</a>
          <a class="pcard-pdf" href="${summaryPdf(sec.id)}" download title="${esc(t('Download the summary of {section} (PDF)', { section: sec.title }))}">PDF</a>
        </p>
      </article>`;
  }

  function render() {
    const s = ProgressPage.summary();
    const r = resume(s);
    $('#view').innerHTML = `
      <section class="home" aria-labelledby="home-h">
        <header class="home-hero">
          ${ProgressPage.ring(s.pct, 112, `${s.pct}%`)}
          <div>
            <h1 id="home-h" tabindex="-1">${esc(t('Databases practice'))}</h1>
            <p class="story">${esc(t('Read, test yourself and practise: from the relational model to SQL, all in your browser.'))}</p>
            <p class="home-resume">
              <a class="btn" href="${r.href}">${esc(r.started ? t('Continue') : t('Start with Theory'))}</a>
              ${r.what ? `<span class="pcard-what">${esc(r.what)}</span>` : ''}
            </p>
          </div>
        </header>
        <div class="home-grid">${s.secs.map(card).join('')}</div>
        <h2 class="home-h2">${esc(t('Shortcuts'))}</h2>
        <ul class="home-quick">
          <li><button type="button" class="home-q" data-action="focus-search"><strong>${esc(t('Search the course'))}</strong><span>${esc(t('Press / or Ctrl+K from any page.'))}</span></button></li>
          <li><a class="home-q" href="#/relational/er/practice/draw"><strong>${esc(t('Draw an ER diagram'))}</strong><span>${esc(t('Course notation; save it for diagrams.net.'))}</span></a></li>
          <li><a class="home-q" href="#/progress"><strong>${esc(t('Your progress'))}</strong><span>${esc(t('Every card, exercise and quiz in one place.'))}</span></a></li>
          <li><a class="home-q" href="#/relational/sql/practice"><strong>${esc(t('SQL sandbox'))}</strong><span>${esc(t('Needs an internet connection the first time it loads.'))}</span></a></li>
          <li><a class="home-q" href="#/nosql"><strong>${esc(t('Non-relational databases'))}</strong><span>${esc(t('Overview of the NoSQL families.'))}</span></a></li>
        </ul>
      </section>`;
    return t('Home');
  }

  function onClick(el) {
    if (el.dataset.action !== 'focus-search') return;
    const input = document.querySelector('#site-search input');
    if (input) input.focus();
  }

  return { render, onClick, saveLast };
})();
