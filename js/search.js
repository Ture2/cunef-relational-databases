'use strict';

/* ==========================================================================
   Site search: a full-text index of the course content, in the app bar.

   SearchIndex   builds an inverted index in the browser from the data of every section
                 (concept cards, quiz questions, exercises, SQL challenges), in the current language.
                   term → { document → weighted frequency }, terms kept sorted so a typed prefix
                 is a binary search. Accents and case are ignored. Fields weigh differently
                 (title 6, summary 3, body 1) and are scored TF × IDF; every word of the query must
                 appear in a document (if none does, documents with some of the words are shown).
                 A word with no match in the index is retried with one typo allowed.
   SearchBar     the box, its result list (keyboard: ↑ ↓ Enter Esc, "/" or Ctrl+K to focus) and the
                 highlighting of the searched words in the page the result opens.
   The index is built the first time the box gets focus (a few milliseconds).
   ========================================================================== */

const SearchIndex = (() => {
  const WEIGHT = { title: 6, summary: 3, body: 1 };
  const SKIP = new Set(['id', 'hub', 'topic', 'icon', 'dialect', 'setup', 'model', 'nf', 'exercise', 'figure', 'practice', 'expectError', 'answer', 'accept', 'verify', 'level']);

  const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const plain = (s) => String(s).replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim();
  const tokenize = (s) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 1 || /\d/.test(w));

  /* Every string inside a card (arrays and nested objects included), minus the technical keys. */
  function strings(v, out = []) {
    if (typeof v === 'string') out.push(plain(v));
    else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (!SKIP.has(k)) strings(x, out); });
    return out;
  }

  let docs = [];
  let postings = new Map();             // term -> Map(doc index -> weighted frequency)
  let terms = [];                       // sorted keys of postings
  let built = false;
  let avgLen = 1;

  function add(doc) {
    const i = docs.push(doc) - 1;
    doc.len = 0;
    Object.entries(WEIGHT).forEach(([field, w]) => {
      tokenize(doc[field] || '').forEach((tok) => {
        doc.len++;
        let m = postings.get(tok);
        if (!m) postings.set(tok, (m = new Map()));
        m.set(i, (m.get(i) || 0) + w);
      });
    });
  }

  function build() {
    if (built) return;
    built = true;
    const L = (list) => (Array.isArray(list) ? list : []);
    const sections = [
      { id: 'theory', label: t('Theory'), base: '#/relational/theory', cards: L(THEORY_CONCEPTS), quiz: L(THEORY_QUIZ) },
      { id: 'er', label: t('ER concepts'), base: '#/relational/er', cards: L(ER_CONCEPTS), quiz: L(ER_QUIZ), exercises: L(ER_PRACTICE), exFields: ['statement', 'focus', 'hints', 'source'] },
      { id: 'logical', label: t('ER → Logical'), base: '#/relational/logical', cards: L(LOGICAL_RULES), exercises: L(LOGICAL_EXERCISES), exFields: ['statement', 'focus', 'hints', 'note'] },
      { id: 'normalization', label: t('Normalization'), base: '#/relational/normalization', cards: L(NORM_THEORY), exercises: L(EXERCISES), exFields: ['story'] },
      { id: 'sql', label: t('SQL'), base: '#/relational/sql', cards: L(SQL_CONCEPTS), quiz: L(SQL_QUIZ), exercises: L(SQL_CHALLENGES), exFields: ['statement', 'focus', 'hints'], exLabel: t('Challenge') },
    ];
    sections.forEach((s) => {
      s.cards.forEach((c, k) => {
        const rest = strings({ ...c, title: undefined, summary: undefined });
        add({ section: s.label, kind: t('Concept'), href: k === 0 ? s.base : `${s.base}/${c.id}`, title: plain(c.title || ''), summary: plain(c.summary || ''), body: rest.join(' · ') });
      });
      (s.quiz || []).forEach((q) => {
        add({ section: s.label, kind: t('Quiz'), href: `${s.base}/quiz${q.topic ? `/${q.topic}` : ''}`, title: plain(q.q), summary: '', body: strings([q.choices, q.why]).join(' · ') });
      });
      (s.exercises || []).forEach((e, k) => {
        add({ section: s.label, kind: s.exLabel || t('Exercise'), href: `${s.base}/practice/${k + 1}`, title: plain(e.title || ''), summary: plain(e.short || ''), body: strings(s.exFields.map((f) => e[f])).join(' · ') });
      });
    });
    add({ section: t('ER concepts'), kind: t('Tool'), href: '#/relational/er/practice/draw', title: t('Draw an ER diagram'), summary: t('Draw any ER model with the course notation and download it for diagrams.net or as an image.'), body: '' });
    docs.forEach((d) => { d.text = [d.summary, d.body].filter(Boolean).join(' · '); d.foldedTitle = fold(d.title); d.foldedText = fold(d.text); });
    avgLen = docs.reduce((s, d) => s + d.len, 0) / Math.max(docs.length, 1);
    terms = [...postings.keys()].sort();
  }

  /* Index of the first term >= prefix (binary search). */
  function lowerBound(prefix) {
    let lo = 0;
    let hi = terms.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (terms[mid] < prefix) lo = mid + 1; else hi = mid; }
    return lo;
  }

  const withPrefix = (p) => {
    const out = [];
    for (let i = lowerBound(p); i < terms.length && terms[i].startsWith(p); i++) out.push(terms[i]);
    return out;
  };

  /* True when a and b differ by at most one insertion, deletion, substitution or swap. */
  function near(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    const x = a.slice(i);
    const y = b.slice(i);
    return x.slice(1) === y.slice(1) || x.slice(1) === y || x === y.slice(1) || (x.length > 1 && y.length > 1 && x[0] === y[1] && x[1] === y[0] && x.slice(2) === y.slice(2));
  }

  /* Dictionary words a typed word stands for: itself as a prefix, else words one typo away. */
  function expand(word) {
    const hit = withPrefix(word);
    if (hit.length || word.length < 4) return { words: hit, fuzzy: false };
    return { words: terms.filter((w) => near(word, w) || near(word, w.slice(0, word.length))), fuzzy: true };
  }

  /* Text around the first occurrence of one of the words, as { before, hit, after }. */
  function snippet(doc, words) {
    const text = doc.text || doc.title;
    const folded = fold(text);
    let at = -1;
    let len = 0;
    for (const w of words) {
      const m = new RegExp(`(?<![a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z0-9]*`).exec(folded);
      if (m && (at < 0 || m.index < at)) { at = m.index; len = m[0].length; }
    }
    if (at < 0) return { before: text.slice(0, 120), hit: '', after: '' };
    const from = Math.max(0, at - 50);
    const to = Math.min(text.length, at + len + 80);
    return { before: `${from ? '… ' : ''}${text.slice(from, at)}`, hit: text.slice(at, at + len), after: `${text.slice(at + len, to)}${to < text.length ? ' …' : ''}` };
  }

  /* → { hits: [{ doc, score, snippet }], words: [searched words found in the index] } */
  function search(query, limit = 12) {
    build();
    const typed = tokenize(query);
    if (!typed.length) return { hits: [], words: [] };
    const N = docs.length;
    const per = typed.map((word) => {
      const { words, fuzzy } = expand(word);
      const scores = new Map();
      words.forEach((w) => {
        const post = postings.get(w);
        const idf = Math.log(1 + N / post.size);
        post.forEach((tf, d) => scores.set(d, (scores.get(d) || 0) + tf * idf * (w === word ? 1 : fuzzy ? 0.4 : 0.7)));
      });
      return { word, words, scores };
    });
    const known = per.filter((p) => p.scores.size);
    if (!known.length) return { hits: [], words: [] };
    let ids = [...known[0].scores.keys()].filter((d) => known.every((p) => p.scores.has(d)));
    if (!ids.length) ids = [...new Set(known.flatMap((p) => [...p.scores.keys()]))];     // no document has every word
    const phrase = typed.join(' ');
    const hits = ids.map((d) => {
      const doc = docs[d];
      let score = known.reduce((s, p) => s + (p.scores.get(d) || 0), 0) * (known.every((p) => p.scores.has(d)) ? 2 : 1);
      score /= Math.sqrt(1 + doc.len / avgLen);                       // long documents mention everything: damp them
      const titleWords = new Set(tokenize(doc.title));
      score *= 1 + known.filter((p) => p.words.some((w) => titleWords.has(w))).length / known.length;   // words in the title
      if (typed.length > 1 && fold(doc.title).includes(phrase)) score *= 3;      // the exact phrase in the title…
      else if (typed.length > 1 && doc.foldedText.includes(phrase)) score *= 1.5;  // …or in the text
      return { doc, score };
    }).sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title)).slice(0, limit);
    const words = [...new Set(known.flatMap((p) => (p.words.length > 12 ? [p.word] : p.words.length ? [p.word, ...p.words.filter((w) => !w.startsWith(p.word))] : [p.word])))];
    hits.forEach((h) => { h.snippet = snippet(h.doc, words); });
    return { hits, words };
  }

  return { search, fold, size: () => (build(), { docs: docs.length, terms: terms.length }) };
})();

const SearchBar = (() => {
  const form = document.getElementById('site-search');
  if (!form) return {};
  const input = form.querySelector('input');
  const list = form.querySelector('.search-list');
  let hits = [];
  let words = [];
  let active = -1;
  let pending = null;                   // words to highlight once the next page is drawn

  /* ---- Highlighting the searched words in the page ----------------------------------- */

  const CLASSES = { a: 'aáàäâã', e: 'eéèëê', i: 'iíìïî', o: 'oóòöôõ', u: 'uúùüû', n: 'nñ', c: 'cç' };
  const pattern = (word) => [...word].map((ch) => (CLASSES[ch] ? `[${CLASSES[ch]}]` : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('');

  function clearMarks(root) {
    root.querySelectorAll('mark.search-hit').forEach((m) => { m.replaceWith(document.createTextNode(m.textContent)); });
    root.normalize();
  }

  /* Wraps every occurrence (word starts) of the searched words in <mark>; returns the first one. */
  function highlight(list2) {
    const root = document.getElementById('view');
    if (!root || !list2.length) return null;
    clearMarks(root);
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${list2.map(pattern).join('|')})[\\p{L}\\p{N}]*`, 'giu');
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest('textarea, script, style, mark, .sr-only') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) { re.lastIndex = 0; if (re.test(n.nodeValue)) nodes.push(n); }
    let first = null;
    let count = 0;
    nodes.forEach((n) => {
      if (count > 400) return;
      const frag = document.createDocumentFragment();
      let last = 0;
      re.lastIndex = 0;
      for (let m = re.exec(n.nodeValue); m; m = re.exec(n.nodeValue)) {
        frag.append(n.nodeValue.slice(last, m.index));
        const mark = document.createElement('mark');
        mark.className = 'search-hit';
        mark.textContent = m[0];
        frag.append(mark);
        first = first || mark;
        last = m.index + m[0].length;
        count++;
      }
      frag.append(n.nodeValue.slice(last));
      n.replaceWith(frag);
    });
    if (first) {
      const details = first.closest('details');
      if (details) details.open = true;
      first.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      announce(count === 1 ? t('1 match highlighted on this page.') : t('{n} matches highlighted on this page.', { n: count }));
    }
    return first;
  }

  /* After the route draws the page (hashchange handlers run first), mark the searched words. */
  const afterRender = () => {
    if (!pending) return;
    const w = pending;
    pending = null;
    requestAnimationFrame(() => requestAnimationFrame(() => highlight(w)));
  };
  window.addEventListener('hashchange', afterRender);

  /* ---- The result list ------------------------------------------------------------------ */

  const esc2 = esc;
  function draw() {
    const q = input.value.trim();
    input.setAttribute('aria-expanded', String(!!q));
    if (!q) { list.hidden = true; list.innerHTML = ''; hits = []; return; }
    const r = SearchIndex.search(q);
    hits = r.hits;
    words = r.words;
    active = hits.length ? 0 : -1;
    list.hidden = false;
    list.innerHTML = hits.length
      ? hits.map((h, i) => `<li role="option" id="sr-${i}" class="search-item" data-i="${i}" aria-selected="${i === active}">
          <span class="search-meta">${esc2(h.doc.section)} · ${esc2(h.doc.kind)}</span>
          <span class="search-title">${esc2(h.doc.title)}</span>
          <span class="search-snip">${esc2(h.snippet.before)}${h.snippet.hit ? `<mark>${esc2(h.snippet.hit)}</mark>` : ''}${esc2(h.snippet.after)}</span>
        </li>`).join('')
      : `<li class="search-none" role="presentation">${esc2(t('No results for "{q}".', { q }))}</li>`;
    input.setAttribute('aria-activedescendant', hits.length ? 'sr-0' : '');
    announce(hits.length === 1 ? t('1 result.') : t('{n} results.', { n: hits.length }));
  }

  function mark(i) {
    active = i;
    list.querySelectorAll('.search-item').forEach((li, k) => {
      li.setAttribute('aria-selected', String(k === i));
      if (k === i) li.scrollIntoView({ block: 'nearest' });
    });
    input.setAttribute('aria-activedescendant', i >= 0 ? `sr-${i}` : '');
  }

  function open(i) {
    const h = hits[i];
    if (!h) return;
    const target = h.doc.href;
    pending = words.slice();
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    if (location.hash === target) { afterRender(); return; }          // already there: no hashchange
    location.hash = target;
  }

  input.addEventListener('focus', () => { SearchIndex.size(); if (input.value.trim()) draw(); });
  input.addEventListener('input', draw);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); mark((active + 1) % hits.length); }
    else if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); mark((active - 1 + hits.length) % hits.length); }
    else if (e.key === 'Enter') { e.preventDefault(); if (hits.length) open(Math.max(active, 0)); }
    else if (e.key === 'Escape') {
      if (!list.hidden) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); } else { input.value = ''; clearMarks(document.getElementById('view')); }
    }
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  list.addEventListener('mousedown', (e) => e.preventDefault());       // keep the focus in the box
  list.addEventListener('click', (e) => { const li = e.target.closest('.search-item'); if (li) open(+li.dataset.i); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#site-search')) list.hidden = true; });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); input.focus(); input.select(); }
  });

  /* Text of the box, in the current language. */
  input.placeholder = t('Search the course…');
  input.setAttribute('aria-label', t('Search the course'));
  form.querySelector('.search-kbd').textContent = '/';

  return { highlight };
})();
