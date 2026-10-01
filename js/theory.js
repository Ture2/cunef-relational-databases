'use strict';

/* ==========================================================================
   Relational databases › Theory (Topic 1): concept cards with worked examples,
   figures and interactive examples, plus the Quiz 1 questions. Built on
   js/concept-section.js. Data: data/<lang>/theory.js (THEORY_CONCEPTS,
   THEORY_QUIZ, THEORY_QUIZ_TOPICS). Figures: js/theory-figures.js; interactive
   examples: js/theory-widgets.js.
   Routes: #/relational/theory[/<conceptId>], #/relational/theory/quiz[/<topic>]
   ========================================================================== */

const TheorySection = ConceptSection({
  base: '#/relational/theory',
  title: () => t('Theory'),
  badge: 'DB',
  /* Hubs in teaching order; each card names its hub in `hub`. */
  groups: [
    { key: 'info', label: 'Information systems', icon: 'pyramid' },
    { key: 'files', label: 'Files vs databases', icon: 'files' },
    { key: 'dbms', label: 'The DBMS', icon: 'dbms' },
    { key: 'acid', label: 'Transactions (ACID)', icon: 'acid' },
    { key: 'levels', label: 'Abstraction levels', icon: 'levels' },
    { key: 'storage', label: 'Storage and efficiency', icon: 'storage' },
    { key: 'index', label: 'File organization and indexes', icon: 'index' },
    { key: 'lifecycle', label: 'Data lifecycle', icon: 'lifecycle' },
  ],
  concepts: THEORY_CONCEPTS,
  quiz: THEORY_QUIZ,
  topics: THEORY_QUIZ_TOPICS,
  quizKey: 'theory-quiz-v1',
  figure: (item) => (item.figure ? TheoryFigures.svg(item.figure) : ''),
  extra: (card) => (card.widget ? TheoryWidgets.html(card.widget) : ''),
  perfectText: () => t('You did not miss any. Move on to the ER concepts.'),
  nextLink: { href: '#/relational/er', label: () => t('Go to ER concepts') },
  onClick: (el) => TheoryWidgets.onClick(el),
  onInput: (e) => TheoryWidgets.onInput(e),
  onChange: (e) => TheoryWidgets.onChange(e),
});
