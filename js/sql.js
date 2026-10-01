'use strict';

/* ==========================================================================
   Relational databases › SQL: the sub-languages (DDL, DML, DCL, TCL),
   constraints, indexes, clustering, partitioning and efficiency, as concept
   cards with runnable examples (js/sql-runner.js), a quiz, and a free SQL
   sandbox in the practice slot.
   Data: data/<lang>/sql.js (SQL_CONCEPTS, SQL_QUIZ, SQL_QUIZ_TOPICS, SQL_SANDBOX).
   Routes: #/relational/sql[/<cardId> | /quiz[/<topic>] | /practice]
   ========================================================================== */

const SqlSection = (() => {
  const SANDBOX = '#/relational/sql/practice';

  function sandboxPage() {
    const sb = SQL_SANDBOX;
    $('#practice-slot').innerHTML = `
      <header class="ex-head">
        <h2 id="sb-title">${esc(t('SQL sandbox'))}</h2>
        <p class="story">${md(sb.intro)}</p>
      </header>
      <section class="block" aria-labelledby="sb-ex-h">
        <h3 id="sb-ex-h">${esc(t('Start from an example'))}</h3>
        <div class="sb-examples">${sb.examples.map((ex, i) => `<button type="button" class="btn ghost" data-action="sql-example" data-i="${i}" data-fid="sbex-${i}">${esc(ex.label)}</button>`).join('')}</div>
        ${SqlRunner.sandboxHtml()}
        <p class="meta">${esc(t('Your text is kept in this browser. Every run starts again from the sample tables, so you cannot break anything.'))}</p>
      </section>`;
    return t('SQL sandbox');
  }

  return ConceptSection({
    base: '#/relational/sql',
    title: () => t('SQL'),
    badge: 'SQL',
    groups: [
      { key: 'languages', label: 'SQL languages', icon: 'code' },
      { key: 'constraints', label: 'Constraints', icon: 'key' },
      { key: 'indexes', label: 'Indexes', icon: 'index' },
      { key: 'clustering', label: 'Clustering', icon: 'cluster' },
      { key: 'partitioning', label: 'Partitioning', icon: 'split' },
      { key: 'efficiency', label: 'Efficiency', icon: 'speed' },
    ],
    concepts: SQL_CONCEPTS,
    quiz: SQL_QUIZ,
    topics: SQL_QUIZ_TOPICS,
    quizKey: 'sql-quiz-v1',
    codeDownload: true,
    extra: (card) => SqlRunner.html(card),
    perfectText: () => t('You did not miss any. Try your own queries in the SQL sandbox.'),
    nextLink: { href: SANDBOX, label: () => t('Open the SQL sandbox') },
    onClick: (el) => SqlRunner.onClick(el),
    onInput: (e) => SqlRunner.onInput(e),
    onKeydown: (e) => SqlRunner.onKeydown(e),
    practice: {
      label: 'Practice',
      icon: 'practice',
      match: (r) => r === 'practice',
      links: (rest) => [{ href: SANDBOX, label: t('SQL sandbox'), current: rest !== null }],
      render: sandboxPage,
      onClick: (el) => SqlRunner.onClick(el),
      onInput: (e) => SqlRunner.onInput(e),
      onKeydown: (e) => SqlRunner.onKeydown(e),
    },
  });
})();
