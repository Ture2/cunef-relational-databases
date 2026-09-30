'use strict';

/* ==========================================================================
   Shared helpers for every section (ER concepts, ER → logical, NoSQL).
   The normalization module keeps its own copies so it stays self-contained.
   ========================================================================== */

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Escapes a text and then turns the only markup allowed in the data, **bold** and `code`, into HTML. */
const md = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/`(.+?)`/g, '<code>$1</code>');

const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICON = {
  ok: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#1D7A4A"/><path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bad: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#B42318"/><path d="M6.6 6.6l6.8 6.8M13.4 6.6l-6.8 6.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
  note: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" stroke="#58627D" stroke-width="1.6"/><path d="M10 9v5" stroke="#58627D" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="6.2" r="1.1" fill="#58627D"/></svg>',
  key: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5" cy="8" r="2.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7.6 8H14M11.6 8v2.6M14 8v2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
};

/* A JSON value saved in the browser (this device only). Works, without saving, when storage is blocked. */
function makeStore(key) {
  return {
    load() {
      try { const d = JSON.parse(localStorage.getItem(key)); return d && typeof d === 'object' ? d : {}; } catch (e) { return {}; }
    },
    save(data) {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* no storage available */ }
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

/* One item of a check list: { status: 'ok' | 'bad' | 'note', text }; the text may use the bold and code markup of md(). */
const checkItem = (c) => `<li>${ICON[c.status]}<span><span class="sr-only">${c.status === 'ok' ? 'Correct: ' : c.status === 'bad' ? 'Problem: ' : 'Note: '}</span>${md(c.text)}</span></li>`;
