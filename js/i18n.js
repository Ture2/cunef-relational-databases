'use strict';

/* ==========================================================================
   Language: Spanish or English. Loaded first.
   - LANG comes from ?lang=es|en (which is also remembered), then the saved
     choice, then the browser language.
   - DATA[lang] is filled by data/en/*.js and data/es/*.js; js/core.js binds the
     globals the modules use (EXERCISES, ER_CONCEPTS...) to DATA[LANG].
   - t('English text', { name }) translates interface text: the English text is
     the key, and the Spanish dictionaries in i18n/*.js add to UI.es.
   ========================================================================== */

const LANGS = ['es', 'en'];
const DATA = { en: {}, es: {} };
const UI = { es: {} };

const LANG = (() => {
  let fromUrl = null;
  try { fromUrl = new URLSearchParams(location.search).get('lang'); } catch (e) { /* old browser */ }
  if (LANGS.includes(fromUrl)) {
    try { localStorage.setItem('lang', fromUrl); } catch (e) { /* no storage available */ }
    return fromUrl;
  }
  try {
    const saved = localStorage.getItem('lang');
    if (LANGS.includes(saved)) return saved;
  } catch (e) { /* no storage available */ }
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return /^es\b/i.test(nav) ? 'es' : 'en';
})();
document.documentElement.lang = LANG;

/* Theme: 'light' | 'dark' | 'system' (default). Applied here, before the page paints. */
const THEMES = ['light', 'dark', 'system'];
let THEME = 'system';
try { const saved = localStorage.getItem('theme'); if (THEMES.includes(saved)) THEME = saved; } catch (e) { /* no storage available */ }
function applyTheme(theme) {
  THEME = THEMES.includes(theme) ? theme : 'system';
  if (THEME === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = THEME;
}
applyTheme(THEME);
function setTheme(theme) {
  applyTheme(theme);
  try { localStorage.setItem('theme', THEME); } catch (e) { /* no storage available */ }
}

const tMissing = new Set();

/* Interface text in the current language. {name} placeholders are filled from params. */
function t(text, params) {
  let s = text;
  if (LANG !== 'en') {
    const dict = UI[LANG] || {};
    if (Object.prototype.hasOwnProperty.call(dict, text)) s = dict[text];
    else if (!tMissing.has(text)) { tMissing.add(text); console.warn(`[i18n] missing ${LANG}: ${text}`); }
  }
  return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : s;
}

/* Normal-form names: the internal ids stay '2NF', 'BCNF'...; Spanish shows 2FN, FNBC... */
function nfLabel(nf) {
  if (LANG !== 'es') return nf;
  return { '1NF': '1FN', '2NF': '2FN', '3NF': '3FN', BCNF: 'FNBC', '4NF': '4FN', '5NF': '5FN' }[nf] || nf;
}

/* Changes the language: remembered on this device, then the page reloads on the same route. */
function setLang(lang) {
  if (!LANGS.includes(lang) || lang === LANG) return;
  try { localStorage.setItem('lang', lang); } catch (e) { /* no storage available */ }
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  url.searchParams.set('lang', lang);          // also works when storage is blocked
  location.replace(url.toString());
}
