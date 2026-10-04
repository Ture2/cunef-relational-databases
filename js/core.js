'use strict';

/* ==========================================================================
   Shared helpers for every section.
   ========================================================================== */

/* Course data in the current language (see js/i18n.js). English fills any gap, with a warning. */
const langData = (key) => {
  if (DATA[LANG] && DATA[LANG][key]) return DATA[LANG][key];
  console.warn(`[i18n] no ${LANG} data for ${key}; using English`);
  return DATA.en[key];
};
const NF_INFO = langData('NF_INFO');
const EXERCISES = langData('EXERCISES');
const ADV_OPTIONS = langData('ADV_OPTIONS');
const QUESTIONS = langData('QUESTIONS');
const ER_CONCEPTS = langData('ER_CONCEPTS');
const ER_QUIZ_TOPICS = langData('ER_QUIZ_TOPICS');
const ER_QUIZ = langData('ER_QUIZ');
const LOGICAL_EXERCISES = langData('LOGICAL_EXERCISES');
const THEORY_CONCEPTS = langData('THEORY_CONCEPTS');
const THEORY_QUIZ_TOPICS = langData('THEORY_QUIZ_TOPICS');
const THEORY_QUIZ = langData('THEORY_QUIZ');
const LOGICAL_RULES = langData('LOGICAL_RULES');
const NORM_THEORY = langData('NORM_THEORY');
const SQL_CONCEPTS = langData('SQL_CONCEPTS');
const SQL_QUIZ_TOPICS = langData('SQL_QUIZ_TOPICS');
const SQL_QUIZ = langData('SQL_QUIZ');
const SQL_SANDBOX = langData('SQL_SANDBOX');

/* Storage key for work that depends on the language (tables built with translated names). */
const langKey = (key) => (LANG === 'en' ? key : `${key}-${LANG}`);

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Escapes a text and then turns the only markup allowed in the data, **bold** and `code`, into HTML. */
const md = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/`(.+?)`/g, '<code>$1</code>');

const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICON = {
  ok: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" style="fill:var(--ok)"/><path d="M5.5 10.5l3 3 6-6.5" fill="none" style="stroke:var(--on-status)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bad: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" style="fill:var(--bad)"/><path d="M6.6 6.6l6.8 6.8M13.4 6.6l-6.8 6.8" fill="none" style="stroke:var(--on-status)" stroke-width="2" stroke-linecap="round"/></svg>',
  note: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" style="stroke:var(--muted)" stroke-width="1.6"/><path d="M10 9v5" style="stroke:var(--muted)" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="6.2" r="1.1" style="fill:var(--muted)"/></svg>',
  key: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5" cy="8" r="2.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7.6 8H14M11.6 8v2.6M14 8v2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
};

/* Saves text as a file on the viewer's device; it is built in the browser and never uploaded. */
function downloadText(filename, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Runs author self-checks (console warnings only) after the page has painted. */
const whenIdle = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => fn(), { timeout: 3000 }) : setTimeout(fn, 200));

/* Path of a section's summary PDF in the current language (built by tools/build-pdfs.mjs). */
const summaryPdf = (id) => `assets/pdf/${id}-${LANG}.pdf`;

/* Tells the progress view (js/progress.js) that something saved changed. */
const progressChanged = (key) => {
  try { window.dispatchEvent(new CustomEvent('progress-change', { detail: key })); } catch (e) { /* old browser */ }
};

/* A JSON value saved in the browser (this device only). Works, without saving, when storage is blocked. */
function makeStore(key) {
  return {
    load() {
      try { const d = JSON.parse(localStorage.getItem(key)); return d && typeof d === 'object' ? d : {}; } catch (e) { return {}; }
    },
    save(data) {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* no storage available */ }
      progressChanged(key);
    },
    clear() {
      try { localStorage.removeItem(key); } catch (e) { /* no storage available */ }
    },
  };
}

/* Short hash of any JSON value: saved work is discarded when the exercise it belongs to changes. */
function hashOf(value) {
  const s = JSON.stringify(value);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function announce(text) {
  const el = $('#sr-status');
  if (el) el.textContent = text;
}

/* Moves focus to an element and scrolls it into view if needed. */
function reveal(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
  if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}

/* Runs a full re-render and gives focus back to the control that had it (matched by data-fid). */
function keepFocus(fn) {
  const active = document.activeElement;
  const id = active && active.dataset ? active.dataset.fid : null;
  fn();
  if (id) {
    const el = document.querySelector(`#view [data-fid="${CSS.escape(id)}"]`);
    if (el && !el.disabled) el.focus({ preventScroll: true });
  }
}

/* A strip of numbered tabs, one per exercise, with previous / next arrows.
   items: [{ n, href, title, done, extra? }]; current: index into items, or -1;
   prev / next: { href, title } or null. */
function numberTabsHtml({ label, items, current, prev, next }) {
  const arrow = (to, glyph, isPrev) => (to
    ? `<a class="arrow-btn" href="${to.href}" aria-label="${esc(isPrev ? t('Previous exercise: {title}', { title: to.title }) : t('Next exercise: {title}', { title: to.title }))}" title="${esc(isPrev ? t('Previous: {title}', { title: to.title }) : t('Next: {title}', { title: to.title }))}">${glyph}</a>`
    : `<span class="arrow-btn" aria-hidden="true">${glyph}</span>`);
  const tabs = items.map((it, k) => `<li><a class="numtab${it.done ? ' is-done' : ''}" href="${it.href}"${k === current ? ' aria-current="page"' : ''} title="${esc(`${it.n} · ${it.title}`)}"><span aria-hidden="true">${it.n}</span><span class="sr-only">${esc(t('Exercise {n}: {title}', { n: it.n, title: it.title }))}${it.done ? ` ${esc(t('(solved)'))}` : ''}</span>${it.extra || ''}</a></li>`).join('');
  return `<div class="numtabs-row">
      <nav class="numtabs" aria-label="${esc(label)}"><ol>${tabs}</ol></nav>
      <div class="arrows">${arrow(prev, '‹', true)}${arrow(next, '›', false)}</div>
    </div>`;
}

/* One item of a check list: { status: 'ok' | 'bad' | 'note', text }; the text may use the bold and code markup of md(). */
const checkItem = (c) => `<li>${ICON[c.status]}<span><span class="sr-only">${esc(c.status === 'ok' ? t('Correct: ') : c.status === 'bad' ? t('Problem: ') : t('Note: '))}</span>${md(c.text)}</span></li>`;
