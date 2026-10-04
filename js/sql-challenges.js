'use strict';

/* ==========================================================================
   SQL challenges: a goal, the sample tables, and an editor. "Check" runs the
   student's Oracle SQL and the reference solution on the same fresh database
   and compares the two results (or, for INSERT / UPDATE / DELETE / CREATE
   TABLE challenges, the SELECT in `verify` run afterwards). Rows are compared
   as a set unless the challenge says `ordered`; column names do not matter.
   A query that works in the browser but would fail on Oracle (LIMIT, EXCEPT…)
   is not accepted.
   Data: data/<lang>/sql-challenges.js (SQL_CHALLENGES, SQL_CHALLENGES_LEVELS).
   Routes: #/relational/sql/practice/N (the sandbox lives at …/practice).
   Saves: sql-challenges-v1 (solved ids) and the editor text per challenge.
   ========================================================================== */

const SqlChallenges = (() => {
  const BASE = '#/relational/sql/practice';
  const progressStore = makeStore('sql-challenges-v1');
  const workStore = makeStore(langKey('sql-challenges-work-v1'));
  const progress = Object.assign({ solved: {} }, progressStore.load());
  const saved = workStore.load();
  const work = {};                      // challenge id -> { text, hints, solution, feedback }
  let idx = 0;

  const view = () => $('#practice-slot') || $('#view');
  const levels = () => SQL_CHALLENGES_LEVELS;
  const solved = (ch) => !!progress.solved[ch.id];

  function getWork(ch) {
    if (!work[ch.id]) {
      const s = saved[ch.id] || {};
      work[ch.id] = { text: typeof s.text === 'string' ? s.text : '', hints: Math.min(+s.hints || 0, ch.hints.length), solution: false, feedback: '', result: '' };
    }
    return work[ch.id];
  }

  function persist(ch) {
    const w = work[ch.id];
    saved[ch.id] = { text: w.text, hints: w.hints };
    workStore.save(saved);
  }

  /* ---- Comparing results --------------------------------------------------------- */

  const norm = (v) => (v === null ? null : typeof v === 'number' ? Math.round(v * 10000) / 10000 : String(v));
  const key = (row) => JSON.stringify(row.map(norm));

  /* [{ status, text }] and whether the student's result matches the reference. */
  function compare(ch, got, want) {
    const out = [];
    if (got.cols.length !== want.cols.length) {
      out.push({ status: 'bad', text: t('Your query returns {n} columns; the answer has {m}.', { n: got.cols.length, m: want.cols.length }) });
      return { ok: false, out };
    }
    if (got.rows.length !== want.rows.length) {
      out.push({ status: 'bad', text: want.rows.length === 1 ? t('Your query returns {n} rows; the answer has 1 row.', { n: got.rows.length }) : t('Your query returns {n} rows; the answer has {m} rows.', { n: got.rows.length, m: want.rows.length }) });
      return { ok: false, out };
    }
    const a = got.rows.map(key);
    const b = want.rows.map(key);
    const same = (x, y) => x.length === y.length && x.every((k, i) => k === y[i]);
    if (same([...a].sort(), [...b].sort())) {
      if (ch.ordered && !same(a, b)) {
        out.push({ status: 'bad', text: t('The rows are right but not in the order the goal asks for.') });
        return { ok: false, out };
      }
      out.push({ status: 'ok', text: t('The result matches the expected one.') });
      return { ok: true, out };
    }
    out.push({ status: 'bad', text: t('You have the right number of rows and columns, but some values differ. Check the filter, the join and any rounding.') });
    return { ok: false, out };
  }

  async function check(ch) {
    const w = getWork(ch);
    const text = w.text.trim();
    if (!text) { w.feedback = `<section class="feedback bad"><h3 id="fb-title" tabindex="-1">${esc(t('Write your SQL first'))}</h3></section>`; return; }
    const checks = [];
    const lint = OracleDialect.lint(text);
    lint.forEach((l) => checks.push({ status: 'bad', text: `${t(l.msg)} ${t(l.fix)}` }));
    const setup = SQL_SANDBOX.setup;
    const missing = (ch.requires || []).filter((w) => !new RegExp(String.raw`\b${w}\b`, 'i').test(text));
    if (missing.length) checks.push({ status: 'bad', text: t('Your SQL must use: {words}.', { words: missing.join(', ') }) });
    const got = await SqlRunner.execute(setup, text, ch.verify);
    let ok = false;
    let table = '';
    if (got.error) {
      checks.unshift({ status: 'bad', text: `${got.error.code ? `\`${got.error.code}: ${got.error.text}\`` : esc(got.error.text)}` });
    } else {
      const want = await SqlRunner.execute(setup, ch.solution, ch.verify);
      const r = compare(ch, got, want);
      ok = r.ok && !lint.length && !missing.length;
      checks.push(...r.out.filter((c) => !(r.ok && lint.length && c.status === 'ok')));
      table = got.cols.length ? SqlRunner.tableHtml(got.cols.map((c) => c.toUpperCase()), got.rows) : '';
    }
    if (ok) {
      progress.solved[ch.id] = true;
      progressStore.save(progress);
    }
    const next = idx < SQL_CHALLENGES.length - 1 ? `<p class="actions"><a class="btn" href="${BASE}/${idx + 2}">${esc(t('Next challenge'))}</a></p>` : '';
    w.feedback = `<section class="feedback ${ok ? 'ok' : 'bad'}" aria-labelledby="fb-title">
        <h3 id="fb-title" tabindex="-1">${esc(ok ? t('Correct') : t('Not yet'))}</h3>
        <ul class="checks">${checks.map(checkItem).join('')}</ul>
        ${table ? `<h4>${esc(t('Your result'))}</h4>${table}` : ''}
        ${ok ? next : ''}
      </section>`;
    announce(ok ? t('Correct') : t('Not yet'));
  }

  /* "Run" shows the result without judging it. */
  async function run(ch) {
    const w = getWork(ch);
    const text = w.text.trim();
    if (!text) return;
    const got = await SqlRunner.execute(SQL_SANDBOX.setup, text, ch.verify);
    const lint = OracleDialect.lint(text);
    w.feedback = `<section class="feedback mixed" aria-labelledby="fb-title">
        <h3 id="fb-title" tabindex="-1">${esc(t('Your result'))}</h3>
        ${lint.map((l) => `<p>${esc(t(l.msg))} ${esc(t(l.fix))}</p>`).join('')}
        ${got.error ? `<p><code>${esc(got.error.code ? `${got.error.code}: ${got.error.text}` : got.error.text)}</code></p>`
    : got.cols.length ? SqlRunner.tableHtml(got.cols.map((c) => c.toUpperCase()), got.rows) : `<p class="meta">${esc(t('no rows selected'))}</p>`}
      </section>`;
  }

  /* ---- The page -------------------------------------------------------------------- */

  /* Tables and columns of the sample database, read from its CREATE TABLE statements. */
  function schemaLine() {
    const tables = [...SQL_SANDBOX.setup.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\n\);/g)].map((m) => {
      const cols = m[2].split('\n').map((l) => l.trim()).filter((l) => l && !/^(PRIMARY|FOREIGN|CONSTRAINT)/i.test(l)).map((l) => l.split(/\s+/)[0]);
      return `<code>${esc(m[1])}</code>(${cols.map(esc).join(', ')})`;
    });
    return tables.join(' · ');
  }

  function nav() {
    const ch = SQL_CHALLENGES[idx];
    const all = SQL_CHALLENGES.map((c, i) => ({ c, i }));
    const L = levels();
    const tabs = Object.keys(L).map(Number).map((lv) => {
      const items = all.filter((x) => x.c.level === lv);
      if (!items.length) return '';
      const target = lv === ch.level ? idx : (items.find((x) => !solved(x.c)) || items[0]).i;
      return `<a href="${BASE}/${target + 1}"${lv === ch.level ? ' aria-current="page"' : ''}>${esc(t('Level {n}', { n: lv }))} <span>${esc(t('{level} · {done}/{total} solved', { level: L[lv], done: items.filter((x) => solved(x.c)).length, total: items.length }))}</span></a>`;
    }).join('');
    const items = all.filter((x) => x.c.level === ch.level);
    const link = (i) => (i >= 0 && i < SQL_CHALLENGES.length ? { href: `${BASE}/${i + 1}`, title: `${i + 1} · ${SQL_CHALLENGES[i].short || SQL_CHALLENGES[i].title}` } : null);
    return `<div class="ex-nav">
        <nav class="levels" aria-label="${esc(t('Challenge level'))}">${tabs}</nav>
        ${numberTabsHtml({
    label: t('Level {n} exercises', { n: ch.level }),
    items: items.map((x) => ({ n: x.i + 1, href: `${BASE}/${x.i + 1}`, title: x.c.short || x.c.title, done: solved(x.c) })),
    current: items.findIndex((x) => x.i === idx),
    prev: link(idx - 1),
    next: link(idx + 1),
  })}
      </div>`;
  }

  function renderChallenge() {
    const ch = SQL_CHALLENGES[idx];
    const w = getWork(ch);
    view().innerHTML = `
      ${nav()}
      <article class="exercise sql-challenge" aria-labelledby="ex-title">
        <header class="ex-head">
          <h2 id="ex-title">${idx + 1} · ${esc(ch.title)}${solved(ch) ? ` <span class="tag-sm">${esc(t('(solved)'))}</span>` : ''}</h2>
          <p class="goal">${esc(t('Practises:'))} ${ch.focus.map((f) => `<span class="tag-sm">${esc(f)}</span>`).join(' ')}</p>
          <p class="story">${md(ch.statement)}</p>
        </header>
        <section class="block" aria-labelledby="ch-db-h">
          <h3 id="ch-db-h">${esc(t('The database'))}</h3>
          <p class="meta">${schemaLine()}</p>
          <details class="sql-setup"><summary>${esc(t('Setup: tables and sample rows'))}</summary><pre><code>${esc(SQL_SANDBOX.setup)}</code></pre></details>
        </section>
        <section class="block" aria-labelledby="ch-q-h">
          <h3 id="ch-q-h">${esc(t('Your Oracle SQL'))}</h3>
          <label class="sr-only" for="ch-editor">${esc(t('SQL to run'))}</label>
          <textarea class="sql-editor" id="ch-editor" data-ch="1" data-fid="ch-editor" rows="${Math.min(Math.max(w.text.split('\n').length + 2, 6), 18)}" spellcheck="false" autocomplete="off" autocapitalize="off">${esc(w.text)}</textarea>
        </section>
        <div class="actions">
          <button type="button" class="btn" data-action="ch-check" data-fid="ch-check">${esc(t('Check'))}</button>
          <button type="button" class="btn ghost" data-action="ch-run" data-fid="ch-run">${esc(t('Run'))}</button>
          <button type="button" class="btn ghost" data-action="ch-hint" data-fid="ch-hint"${w.hints >= ch.hints.length ? ' disabled' : ''}>${esc(w.hints ? (w.hints >= ch.hints.length ? t('No more hints') : t('Another hint')) : t('Show hint'))}</button>
          <button type="button" class="btn ghost" data-action="ch-freesql" data-fid="ch-freesql">${esc(t('Copy and open FreeSQL'))}</button>
          <span class="spacer"></span>
          <button type="button" class="link" data-action="ch-solution" data-fid="ch-solution" aria-expanded="${w.solution}">${esc(w.solution ? t('Hide solution') : t('Show solution'))}</button>
          <button type="button" class="link" data-action="ch-reset" data-fid="ch-reset">${esc(t('Start over'))}</button>
        </div>
        ${w.hints ? `<div class="hints">${ch.hints.slice(0, w.hints).map((h, i) => `<p><strong>${esc(t('Hint {n}.', { n: i + 1 }))}</strong> ${md(h)}</p>`).join('')}</div>` : ''}
        <div id="feedback" aria-live="polite">${w.feedback}</div>
        ${w.solution ? `<section class="block solution" aria-labelledby="sol-h"><h3 id="sol-h" tabindex="-1">${esc(t('Reference solution'))}</h3><pre class="concept-code"><code>${esc(ch.solution)}</code></pre></section>` : ''}
      </article>`;
  }

  /* ---- Events ---------------------------------------------------------------------- */

  const rerender = () => keepFocus(renderChallenge);

  function onClick(el) {
    const ch = SQL_CHALLENGES[idx];
    const w = getWork(ch);
    switch (el.dataset.action) {
      case 'ch-check': check(ch).then(() => { rerender(); const h = $('#fb-title'); if (h) h.focus({ preventScroll: false }); }); break;
      case 'ch-run': run(ch).then(rerender); break;
      case 'ch-hint': w.hints = Math.min(w.hints + 1, ch.hints.length); persist(ch); rerender(); break;
      case 'ch-solution': w.solution = !w.solution; rerender(); break;
      case 'ch-reset': w.text = ''; w.feedback = ''; w.hints = 0; w.solution = false; persist(ch); renderChallenge(); $('#ch-editor').focus(); break;
      case 'ch-freesql': {
        const text = w.text.trim() || '-- ' + t('Write your SQL here');
        const drops = OracleDialect.cleanup(SQL_SANDBOX.setup);
        copyToFreeSql(`-- ${t('Oracle · Databases practice, CUNEF Universidad (FreeSQL: choose 23ai or 26ai)')}\n-- ${t('Clean slate: drops the tables this script creates')}\n${drops}\n\n-- ${t('Setup: tables and sample rows')}\n${SQL_SANDBOX.setup.trim()}\n\n-- ${ch.title}\n${text}\n`, el, `${ch.id}.sql`);
        break;
      }
      default:
    }
  }

  function onInput(e) {
    const ed = e.target.closest('textarea[data-ch]');
    if (!ed) return;
    const ch = SQL_CHALLENGES[idx];
    const w = getWork(ch);
    w.text = ed.value;
    persist(ch);
  }

  function onKeydown(e) {
    const ed = e.target.closest('textarea[data-ch]');
    if (ed && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onClick({ dataset: { action: 'ch-check' } }); }
  }

  /* rest: what follows #/relational/sql/practice ('' or 'N'). */
  function render(rest) {
    const n = /^\d+$/.test(rest || '') ? parseInt(rest, 10) : 1;
    idx = Math.min(Math.max(n - 1, 0), SQL_CHALLENGES.length - 1);
    renderChallenge();
    return t('Challenge {n}: {title}', { n: idx + 1, title: SQL_CHALLENGES[idx].title });
  }

  /* Rail links of the practice hub, one per level; `current` marks the level being shown. */
  function links(onPage) {
    const L = levels();
    return Object.keys(L).map(Number).map((lv) => {
      const items = SQL_CHALLENGES.map((c, i) => ({ c, i })).filter((x) => x.c.level === lv);
      const target = (items.find((x) => !solved(x.c)) || items[0]).i;
      const done = items.filter((x) => solved(x.c)).length;
      return {
        href: `${BASE}/${target + 1}`,
        label: t('Challenges · level {n}', { n: lv }),
        current: onPage && SQL_CHALLENGES[idx].level === lv,
        extra: `<span class="rail-count" title="${esc(t('{done} of {total} solved', { done, total: items.length }))}">${done}/${items.length}</span>`,
      };
    });
  }

  return { render, links, onClick, onInput, onKeydown };
})();
