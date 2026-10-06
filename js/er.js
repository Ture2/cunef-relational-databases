'use strict';

/* ==========================================================================
   Relational databases › ER concepts: concept cards and a concept quiz,
   built on the shared engine in js/concept-section.js.
   Data: data/<lang>/er-concepts.js (ER_CONCEPTS) and data/<lang>/er-quiz.js (ER_QUIZ, ER_QUIZ_TOPICS).
   Routes: #/relational/er[/<conceptId>], #/relational/er/quiz[/<topic>],
   #/relational/er/practice[/N | /draw] (modelling exercises and a blank diagram, js/er-practice.js)
   ========================================================================== */

/* Cards that end with a modelling exercise: card id -> exercise id (data/<lang>/er-practice.js). */
const ER_PRACTICE_FOR = { cardinality: 'bedroom-installer', ternary: 'electronics', 'weak-entity': 'banking', hierarchy: 'publishing', steps: 'products-suppliers' };

/* The course video on the ternary card (video/src/ternary, rendered to assets/video). */
const TERNARY_VIDEO = {
  id: 'ternary-video',
  src: 'assets/video/ternary.mp4',
  poster: 'assets/video/ternary-poster.jpg',
  /* Chapter starts in seconds: the scene offsets of video/src/ternary/timeline.ts. */
  chapters: [
    [0, 'Introduction'], [8, 'One fact, three entities'], [32, 'Fix two, look at the third'], [62, 'Ratios and keys'],
    [84, 'Pairs are many-to-many'], [103, 'Not three binaries'], [135, 'To tables'],
  ],
};

const ErSection = ConceptSection({
  base: '#/relational/er',
  title: () => t('ER concepts'),
  badge: 'E/R',
  pdf: 'er',
  /* Hubs in teaching order, each with an icon in Chen notation. */
  groups: [
    { key: 'basics', label: 'Basics', icon: 'entity', ids: ['entity', 'attributes', 'keys'] },
    { key: 'relationships', label: 'Relationships', icon: 'relationship', ids: ['relationships', 'correspondence', 'cardinality', 'ternary'] },
    { key: 'weak', label: 'Weak entities and constraints', icon: 'weak', ids: ['weak-entity', 'relationship-constraints'] },
    { key: 'eer', label: 'Extended ER model', icon: 'isa', ids: ['hierarchy', 'category', 'aggregation'] },
    { key: 'building', label: 'Building the model', icon: 'steps', ids: ['time', 'steps'] },
  ],
  concepts: ER_CONCEPTS.map((c) => {
    const i = ER_PRACTICE.findIndex((e) => e.id === ER_PRACTICE_FOR[c.id]);
    return i < 0 ? c : {
      ...c,
      practice: {
        href: `#/relational/er/practice/${i + 1}`,
        label: t('Exercise {n}', { n: i + 1 }),
        sub: t('{title}: model it yourself and compare it with the official solution.', { title: ER_PRACTICE[i].title }),
      },
    };
  }),
  quiz: ER_QUIZ,
  topics: ER_QUIZ_TOPICS,
  quizKey: 'er-quiz-v1',
  figure: (item) => (item.diagram ? ErDiagram.chenSvg(item.diagram) : ''),
  extra: (card) => (card.video ? courseVideoHtml({
    ...TERNARY_VIDEO,
    title: t('Video: ternary relationships'),
    meta: t('{n} minutes · English narration.', { n: 3 }),
    download: t('Download (MP4, {size} MB)', { size: 8 }),
  }) : ''),
  summaryExtra: (card) => (card.video ? `<p class="meta">${esc(t('Watch the video on the website, in the ER concepts section.'))}</p>` : ''),
  onClick: seekCourseVideo,
  perfectText: () => t('You did not miss any. Move on to transforming ER models into tables.'),
  nextLink: { href: '#/relational/logical', label: () => t('Go to ER → Logical') },
  practice: {
    label: 'Practice',
    icon: 'practice',
    match: (r) => /^practice(?:\/(?:\d+|draw))?$/.test(r),
    links: (rest) => ErPractice.links(rest),
    render: (r) => ErPractice.render(r.replace(/^practice\/?/, '')),
    onClick: (el) => ErPractice.onClick(el),
    onInput: (e) => ErPractice.onInput(e),
    onChange: (e) => ErPractice.onChange(e),
    onKeydown: (e) => ErPractice.onKeydown(e),
  },
});
