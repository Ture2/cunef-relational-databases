'use strict';

/* ==========================================================================
   Relational databases › ER concepts: concept cards and a concept quiz,
   built on the shared engine in js/concept-section.js.
   Data: data/<lang>/er-concepts.js (ER_CONCEPTS) and data/<lang>/er-quiz.js (ER_QUIZ, ER_QUIZ_TOPICS).
   Routes: #/relational/er[/<conceptId>], #/relational/er/quiz[/<topic>]
   ========================================================================== */

const ErSection = ConceptSection({
  base: '#/relational/er',
  title: () => t('ER concepts'),
  badge: 'E/R',
  pdf: 'er',
  /* Hubs in teaching order, each with an icon in Chen notation. */
  groups: [
    { key: 'basics', label: 'Basics', icon: 'entity', ids: ['entity', 'attributes', 'keys'] },
    { key: 'relationships', label: 'Relationships', icon: 'relationship', ids: ['relationships', 'correspondence', 'cardinality'] },
    { key: 'weak', label: 'Weak entities and constraints', icon: 'weak', ids: ['weak-entity', 'relationship-constraints'] },
    { key: 'eer', label: 'Extended ER model', icon: 'isa', ids: ['hierarchy', 'category', 'aggregation'] },
    { key: 'building', label: 'Building the model', icon: 'steps', ids: ['time', 'steps'] },
  ],
  concepts: ER_CONCEPTS,
  quiz: ER_QUIZ,
  topics: ER_QUIZ_TOPICS,
  quizKey: 'er-quiz-v1',
  figure: (item) => (item.diagram ? ErDiagram.chenSvg(item.diagram) : ''),
  perfectText: () => t('You did not miss any. Move on to transforming ER models into tables.'),
  nextLink: { href: '#/relational/logical', label: () => t('Go to ER → Logical') },
});
