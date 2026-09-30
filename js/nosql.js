'use strict';

/* ==========================================================================
   Non-relational databases: overview only, for now. The section's routes
   (#/nosql/...) are ready for exercises once the course material exists.
   ========================================================================== */

const NoSqlSection = (() => {
  const FAMILIES = [
    { name: 'Key-value', examples: 'Redis, Amazon DynamoDB', text: 'Each item is a unique key and an opaque value. Lookups by key are extremely fast; queries by the content of the value are not the point.', use: 'Caches, sessions, shopping carts, counters.' },
    { name: 'Document', examples: 'MongoDB', text: 'Each item is a self-describing document (JSON-like) with nested fields and arrays. Documents in the same collection do not need the same structure.', use: 'Catalogues, content management, user profiles.' },
    { name: 'Wide-column', examples: 'Apache Cassandra, HBase', text: 'Rows are grouped into column families, and each row can have its own set of columns. Built to spread huge volumes of writes across many machines.', use: 'Time series, event logs, IoT data.' },
    { name: 'Graph', examples: 'Neo4j', text: 'Data is stored as nodes and the relationships between them, both with properties. Following connections is cheap, however deep they go.', use: 'Social networks, recommendations, fraud detection.' },
  ];

  function render() {
    $('#view').innerHTML = `
      <header class="section-head">
        <h2>Non-relational (NoSQL) databases</h2>
        <p class="story">The relational model stores everything in tables with a fixed structure. NoSQL systems give up part of that structure, and often some consistency guarantees, in exchange for flexible schemas and scaling out over many machines. They fall into four main families.</p>
      </header>
      <div class="families">${FAMILIES.map((f) => `
        <article class="family">
          <h3>${esc(f.name)}</h3>
          <p class="meta">${esc(f.examples)}</p>
          <p>${esc(f.text)}</p>
          <p class="use"><strong>Typical uses.</strong> ${esc(f.use)}</p>
        </article>`).join('')}
      </div>
      <section class="block soon" aria-labelledby="soon-h">
        <h3 id="soon-h">Coming soon</h3>
        <p class="how">Practice for this course (document modelling, embedding versus referencing, queries) will be added here. Meanwhile, the relational course is complete.</p>
        <p class="actions"><a class="btn ghost" href="#/relational/er">Go to Relational databases</a></p>
      </section>`;
    return 'Non-relational databases';
  }

  return { render };
})();
