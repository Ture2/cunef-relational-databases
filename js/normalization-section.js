'use strict';

/* ==========================================================================
   Relational databases › Normalization: the theory as concept cards (anomalies,
   dependencies, each normal form, decomposition) with the course video, plus the
   Normalize exercises and the Diagnose quizzes of js/normalization.js drawn
   inside the same rail layout.
   Data: data/<lang>/normalization-theory.js (NORM_THEORY); the steps of each
   normal form come from NF_INFO, the same text the exercises show.
   Routes: #/relational/normalization[/<conceptId>],
           #/relational/normalization/practice[/N], …/diagnose[/advanced]
   ========================================================================== */

const NormalizationSection = (() => {
  /* The course video (video/src, rendered to assets/video), at the top of the first group. */
  const VIDEO = {
    title: 'Video: normalization step by step',
    duration: '5:58',
    size: 18,
    chapterLabel: (name) => (/^(\dNF|BCNF)$/.test(name) ? nfLabel(name) : t(name)),
    /* Chapter starts in seconds: the scene offsets of video/src/timeline.ts. */
    chapters: [
      [0, 'Introduction'], [12, 'The problem: anomalies'], [65, 'What normalization is'],
      [100, 'Functional dependency'], [145, 'Full and partial dependency'], [175, 'Transitive dependency'],
      [200, '1NF'], [225, '2NF'], [265, '3NF'], [300, 'BCNF'], [325, 'Lossless join and recap'],
    ],
  };
  /* The second video (video/src/nfadv): BCNF, 4NF and 5NF from a 3NF schema, at the top of "Normal forms". */
  const VIDEO_ADVANCED = {
    title: 'Video: beyond 3NF (BCNF, 4NF and 5NF)',
    duration: '2:59',
    size: 10,
    chapterLabel: VIDEO.chapterLabel,
    /* Chapter starts in seconds: the scene offsets of video/src/nfadv/timeline.ts. */
    chapters: [
      [0, 'Introduction'], [6, 'The case: a 3NF schema'], [20, 'Determinant and candidate key'],
      [46, 'BCNF'], [81, '4NF'], [107, '5NF'], [142, 'Recap'], [151, 'Open questions'],
    ],
  };

  /* The steps of a normal form, as in the exercises (NF_INFO[nf].how). */
  function howHtml(card) {
    const info = card.nf && NF_INFO[card.nf];
    if (!info) return '';
    return `<section class="nf-how" aria-labelledby="how-${esc(card.id)}">
        <h3 id="how-${esc(card.id)}">${esc(t('How to reach {nf}', { nf: nfLabel(card.nf) }))}</h3>
        <ol>${info.how.map((h) => `<li>${md(h)}</li>`).join('')}</ol>
      </section>`;
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
    blurb: () => t('Functional dependencies and normal forms up to 5NF.'),
    badge: 'NF',
    pdf: 'normalization',
    summaryExtra: howHtml,
    groups: [
      { key: 'why', label: 'Why normalize', icon: 'why' },
      { key: 'deps', label: 'Dependencies', icon: 'arrow' },
      { key: 'forms', label: 'Normal forms', icon: 'forms' },
      { key: 'decomp', label: 'Decomposition', icon: 'split' },
    ],
    concepts: cards,
    videos: [
      courseVideo('norm-video', 'why', VIDEO, 'normalization'),
      courseVideo('norm-advanced-video', 'forms', VIDEO_ADVANCED, 'normalization-advanced'),
    ],
    extra: howHtml,
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
