'use strict';

/* ==========================================================================
   Relational databases › SQL: querying (joins, aggregation, subqueries and
   functions), the sub-languages (DDL, DML, DCL, TCL), constraints, views and
   schema objects, PL/SQL, indexes, clustering, partitioning and efficiency, as
   concept cards with runnable examples (js/sql-runner.js; PL/SQL is static
   code for FreeSQL), a quiz, and a free SQL sandbox in the practice slot.
   Data: data/<lang>/sql.js (SQL_CONCEPTS, SQL_QUIZ, SQL_QUIZ_TOPICS, SQL_SANDBOX).
   Routes: #/relational/sql[/<cardId> | /quiz[/<topic>] | /practice]
   ========================================================================== */

/* The course videos on SQL cards (video/src/sql/<topic>, rendered to assets/video/<id>.mp4): card.video -> video.
   Chapter starts in seconds: the scene offsets of video/src/sql/<topic>/timeline.ts. */
const SQL_VIDEOS = {
  'sql-ddl': { title: 'Video: DDL, defining the schema', minutes: 3, size: 11, chapters: [[0, 'Introduction'], [8, 'DDL, DML, DCL, TCL'], [34, 'CREATE TABLE and data types'], [69, 'Inline and out-of-line constraints'], [95, 'Parent table first'], [119, 'ALTER TABLE'], [152, 'DDL commits'], [167, 'Data dictionary and DROP']] },
  'sql-keys': { title: 'Video: primary and foreign keys', minutes: 3, size: 11, chapters: [[0, 'Introduction'], [8, 'PRIMARY KEY'], [32, 'Composite key'], [59, 'UNIQUE and NULL'], [85, 'FOREIGN KEY'], [115, 'ON DELETE'], [146, 'Named constraints'], [170, 'Managing constraints']] },
  'sql-delete': { title: 'Video: DELETE, TRUNCATE and DROP', minutes: 3, size: 10, chapters: [[0, 'Introduction'], [8, 'Three levels'], [28, 'DELETE and ROLLBACK'], [58, 'TRUNCATE'], [84, 'TRUNCATE a parent table'], [104, 'DROP and the recycle bin'], [132, 'CASCADE CONSTRAINTS'], [152, 'Summary']] },
  'sql-joins': { title: 'Video: joins', minutes: 3, size: 9, chapters: [[0, 'Introduction'], [8, 'Why join?'], [30, 'INNER JOIN'], [60, 'LEFT JOIN and anti-join'], [90, 'RIGHT and FULL'], [114, 'CROSS JOIN'], [132, 'Self-join'], [154, 'Summary']] },
  'sql-aggregation': { title: 'Video: aggregation, GROUP BY and HAVING', minutes: 3, size: 10, chapters: [[0, 'Introduction'], [8, 'Many rows, one value'], [26, 'COUNT(*) and COUNT(column)'], [47, 'SUM, AVG, MIN and MAX'], [69, 'GROUP BY'], [103, 'WHERE and HAVING'], [136, 'The logical order'], [157, 'Common errors']] },
  'sql-subqueries': { title: 'Video: subqueries', minutes: 3, size: 11, chapters: [[0, 'Introduction'], [8, 'A subquery in WHERE'], [34, 'IN with a list'], [58, 'ANY and ALL'], [87, 'The NOT IN trap'], [119, 'Correlated subquery'], [148, 'EXISTS and NOT EXISTS'], [173, 'Inline view in FROM']] },
  'sql-indexes': { title: 'Video: indexes', minutes: 3, size: 10, chapters: [[0, 'Introduction'], [8, 'Like a phone book'], [26, 'Full table scan'], [48, 'CREATE INDEX and the B-tree'], [80, 'EXPLAIN PLAN before and after'], [109, 'Composite index and leftmost prefix'], [137, 'What indexes cost'], [157, 'Functions hide the index']] },
  'sql-procedures': { title: 'Video: stored procedures and functions', minutes: 3, size: 10, chapters: [[0, 'Introduction'], [8, 'From block to subprogram'], [34, 'CREATE PROCEDURE'], [63, 'Calling it'], [87, 'Handling errors'], [111, 'A function'], [140, 'Procedure or function'], [168, 'Packages']] },
  'sql-cursors': { title: 'Video: cursors', minutes: 3, size: 11, chapters: [[0, 'Introduction'], [8, 'Sets and rows'], [32, 'Implicit cursors'], [54, 'Explicit cursor lifecycle'], [90, 'Cursor attributes'], [112, 'Cursor FOR loop'], [134, 'FOR UPDATE and WHERE CURRENT OF'], [170, 'Prefer set-based SQL']] },
  'sql-triggers': { title: 'Video: triggers', minutes: 3, size: 10, chapters: [[0, 'Introduction'], [8, 'What is a trigger?'], [33, 'BEFORE row trigger'], [65, 'AFTER row trigger: audit'], [100, ':OLD and :NEW'], [126, 'Statement vs row level'], [157, 'Pitfalls']] },
};

/* The video of a SQL card, above its runnable example ('' when the card has none). */
function sqlVideoHtml(card) {
  const v = card.video && SQL_VIDEOS[card.video];
  if (!v) return '';
  return courseVideoHtml({
    id: `${card.video}-video`,
    src: `assets/video/${card.video}.mp4`,
    poster: `assets/video/${card.video}-poster.jpg`,
    chapters: v.chapters,
    title: t(v.title),
    meta: t('{n} minutes · English narration.', { n: v.minutes }),
    download: t('Download (MP4, {size} MB)', { size: v.size }),
  });
}

const SqlSection = (() => {
  const SANDBOX = '#/relational/sql/practice';
  /* Cards and the sandbox both use the runner's editors. */
  const RUNNER_EVENTS = { onClick: SqlRunner.onClick, onInput: SqlRunner.onInput, onKeydown: SqlRunner.onKeydown };
  /* The practice slot holds the sandbox (…/practice) and the challenges (…/practice/N); their events are told apart by name. */
  const PRACTICE_EVENTS = {
    onClick: (el) => (/^ch-/.test(el.dataset.action || '') ? SqlChallenges.onClick(el) : SqlRunner.onClick(el)),
    onInput: (e) => (e.target.closest('textarea[data-ch]') ? SqlChallenges.onInput(e) : SqlRunner.onInput(e)),
    onKeydown: (e) => (e.target.closest('textarea[data-ch]') ? SqlChallenges.onKeydown(e) : SqlRunner.onKeydown(e)),
  };

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
    pdf: 'sql',
    /* Summary sheet: the example itself; its setup (tables and sample rows) stays on the website. */
    summaryExtra: (card) => (card.sql
      ? `<p class="ss-label">${esc(t('Example you can run on the website'))}</p><pre class="concept-code"><code>${esc(card.sql.query)}</code></pre>`
      : '') + (card.video ? `<p class="meta">${esc(t('Watch the video on the website, in the SQL section.'))}</p>` : ''),
    groups: [
      { key: 'oracle', label: 'Oracle and FreeSQL', icon: 'code' },
      { key: 'querying', label: 'Querying', icon: 'code' },
      { key: 'joins', label: 'Combining tables', icon: 'venn' },
      { key: 'aggregation', label: 'Aggregation', icon: 'sigma' },
      { key: 'subqueries', label: 'Subqueries & sets', icon: 'nested' },
      { key: 'functions', label: 'Functions', icon: 'fx' },
      { key: 'languages', label: 'SQL languages', icon: 'code' },
      { key: 'constraints', label: 'Constraints', icon: 'key' },
      { key: 'objects', label: 'Views & schema objects', icon: 'view' },
      { key: 'plsql', label: 'PL/SQL', icon: 'braces' },
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
    extra: (card) => sqlVideoHtml(card) + SqlRunner.html(card),
    perfectText: () => t('You did not miss any. Try the SQL challenges or your own queries in the SQL sandbox.'),
    nextLink: { href: `${SANDBOX}/1`, label: () => t('Try the SQL challenges') },
    ...RUNNER_EVENTS,
    onClick: (el) => seekCourseVideo(el) || SqlRunner.onClick(el),
    practice: {
      label: 'Practice',
      icon: 'practice',
      match: (r) => /^practice(?:\/\d+)?$/.test(r),
      links: (rest) => [
        ...SqlChallenges.links(rest !== null && rest !== 'practice').map((l) => ({ ...l, current: l.current && rest !== 'practice' })),
        { href: SANDBOX, label: t('SQL sandbox'), current: rest === 'practice' },
      ],
      render: (r) => (r === 'practice' ? sandboxPage() : SqlChallenges.render(r.replace(/^practice\/?/, ''))),
      ...PRACTICE_EVENTS,
    },
  });
})();
