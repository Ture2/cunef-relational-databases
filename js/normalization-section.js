'use strict';

/* ==========================================================================
   Relational databases › Normalization: the theory as concept cards (anomalies,
   dependencies, each normal form, decomposition, the course video), plus the
   Normalize exercises and the Diagnose quizzes of js/normalization.js drawn
   inside the same rail layout.
   Data: data/<lang>/normalization-theory.js (NORM_THEORY); the steps of each
   normal form come from NF_INFO, the same text the exercises show.
   Routes: #/relational/normalization[/<conceptId>],
           #/relational/normalization/practice[/N], …/diagnose[/advanced]
   ========================================================================== */

const NormalizationSection = (() => {
  const VIDEO = {
    src: 'assets/video/normalization.mp4',
    poster: 'assets/video/normalization-poster.jpg',
    captions: 'assets/video/normalization.en.vtt',
    /* Chapter starts in seconds: the scene offsets of video/src/timeline.ts. */
    chapters: [
      [0, 'Introduction'], [12, 'The problem: anomalies'], [65, 'What normalization is'],
      [100, 'Functional dependency'], [145, 'Full and partial dependency'], [175, 'Transitive dependency'],
      [200, '1NF'], [225, '2NF'], [265, '3NF'], [300, 'BCNF'], [325, 'Lossless join and recap'],
    ],
  };
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const chapterLabel = (name) => (/^(\dNF|BCNF)$/.test(name) ? nfLabel(name) : t(name));

  function videoHtml() {
    return `<section class="concept-video" data-widget="video" aria-label="${esc(t('Video: normalization step by step'))}">
        <div class="video-frame">
          <video id="norm-video" controls preload="metadata" playsinline poster="${VIDEO.poster}">
            <source src="${VIDEO.src}" type="video/mp4">
            <track kind="captions" src="${VIDEO.captions}" srclang="en" label="English"${LANG !== 'en' ? ' default' : ''}>
            <p>${esc(t('Your browser cannot play this video.'))} <a href="${VIDEO.src}">${esc(t('Download it (MP4)'))}</a></p>
          </video>
        </div>
        <h3 class="video-ch-h">${esc(t('Chapters'))}</h3>
        <ol class="video-chapters">${VIDEO.chapters.map(([s, name]) => `<li><button type="button" class="chapter" data-action="v-seek" data-t="${s}" data-fid="ch-${s}"><span class="ch-time">${clock(s)}</span><span>${esc(chapterLabel(name))}</span></button></li>`).join('')}</ol>
        <p class="meta">${esc(t('6 minutes · English narration with captions.'))} <a href="${VIDEO.src}" download>${esc(t('Download (MP4, 19 MB)'))}</a></p>
      </section>`;
  }

  /* The steps of a normal form, as in the exercises (NF_INFO[nf].how). */
  function howHtml(card) {
    const info = card.nf && NF_INFO[card.nf];
    if (!info) return '';
    return `<section class="nf-how" aria-labelledby="how-${esc(card.id)}">
        <h3 id="how-${esc(card.id)}">${esc(t('How to reach {nf}', { nf: nfLabel(card.nf) }))}</h3>
        <ol>${info.how.map((h) => `<li>${md(h)}</li>`).join('')}</ol>
      </section>`;
  }

  function onClick(el) {
    if (el.dataset.action !== 'v-seek') return;
    const v = $('#norm-video');
    if (!v) return;
    try {
      v.currentTime = +el.dataset.t;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* metadata not loaded yet */ }
    v.focus({ preventScroll: true });
    reveal(v);
  }

  /* Normal-form cards link to an exercise of that form; 1NF (no exercise of its own) to the basic quiz. */
  const cards = NORM_THEORY.map((c) => {
    if (!c.nf) return c;
    if (c.nf === '1NF') {
      return { ...c, practice: { href: '#/relational/normalization/diagnose', label: t('Diagnose tables'), sub: t('Decide which normal form each table reaches, from {a} to {b}.', { a: nfLabel('1NF'), b: nfLabel('3NF') }) } };
    }
    return { ...c, practice: { href: Normalization.hrefFor(c.nf), label: t('Normalize a table'), sub: t('Split a table into {nf} yourself and check it.', { nf: nfLabel(c.nf) }) } };
  });

  return ConceptSection({
    base: '#/relational/normalization',
    title: () => t('Normalization'),
    badge: 'NF',
    groups: [
      { key: 'why', label: 'Why normalize', icon: 'why' },
      { key: 'deps', label: 'Dependencies', icon: 'arrow' },
      { key: 'forms', label: 'Normal forms', icon: 'forms' },
      { key: 'decomp', label: 'Decomposition', icon: 'split' },
    ],
    concepts: cards,
    extra: (card) => `${card.video ? videoHtml() : ''}${howHtml(card)}`,
    onClick,
    practice: {
      label: 'Practice',
      icon: 'practice',
      match: (r) => /^(?:practice(?:\/\d+)?|diagnose(?:\/advanced)?)$/.test(r),
      links: (rest) => Normalization.links(rest !== null),
      render: (r) => Normalization.render(r.replace(/^practice\/?/, '')),
      onClick: (el) => Normalization.onClick(el),
      onInput: (e) => Normalization.onInput(e),
    },
  });
})();
