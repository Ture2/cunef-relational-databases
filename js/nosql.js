'use strict';

/* ==========================================================================
   Non-relational databases: overview only, for now. The section's routes
   (#/nosql/...) are ready for exercises once the course material exists.
   ========================================================================== */

const NoSqlSection = (() => {
  const FAMILIES = [
    { name: t('Key-value'), examples: 'Redis, Amazon DynamoDB', text: t('Each item is a unique key and an opaque value. Lookups by key are extremely fast; queries by the content of the value are not the point.'), use: t('Caches, sessions, shopping carts, counters.') },
    { name: t('Document'), examples: 'MongoDB', text: t('Each item is a self-describing document (JSON-like) with nested fields and arrays. Documents in the same collection do not need the same structure.'), use: t('Catalogues, content management, user profiles.') },
    { name: t('Wide-column'), examples: 'Apache Cassandra, HBase', text: t('Rows are grouped into column families, and each row can have its own set of columns. Built to spread huge volumes of writes across many machines.'), use: t('Time series, event logs, IoT data.') },
    { name: t('Graph'), examples: 'Neo4j', text: t('Data is stored as nodes and the relationships between them, both with properties. Following connections is cheap, however deep they go.'), use: t('Social networks, recommendations, fraud detection.') },
  ];

  function render() {
    $('#view').innerHTML = `
      <header class="section-head">
        <h2>${esc(t('Non-relational (NoSQL) databases'))}</h2>
        <p class="story">${esc(t('The relational model stores everything in tables with a fixed structure. NoSQL systems give up part of that structure, and often some consistency guarantees, in exchange for flexible schemas and scaling out over many machines. They fall into four main families.'))}</p>
      </header>
      <div class="families">${FAMILIES.map((f) => `
        <article class="family">
          <h3>${esc(f.name)}</h3>
          <p class="meta">${esc(f.examples)}</p>
          <p>${esc(f.text)}</p>
          <p class="use"><strong>${esc(t('Typical uses.'))}</strong> ${esc(f.use)}</p>
        </article>`).join('')}
      </div>
      <section class="block soon" aria-labelledby="soon-h">
        <h3 id="soon-h">${esc(t('Coming soon'))}</h3>
        <p class="how">${esc(t('Practice for this course (document modelling, embedding versus referencing, queries) will be added here. Meanwhile, the relational course is complete.'))}</p>
        <p class="actions"><a class="btn ghost" href="#/relational/er">${esc(t('Go to Relational databases'))}</a></p>
      </section>`;
    return t('Non-relational databases');
  }

  return { render };
})();
