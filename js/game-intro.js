'use strict';

/* ==========================================================================
   Query for a Million: the onboarding ("How to play"), an overlay over the live
   game page. Contract: docs/game-quiz.md §9 and docs/game-visual.md, "Onboarding".
   Styles: game-intro.css.

   GameIntro.open({ onClose })  shows the overlay inside section.wr-game;
                                onClose(reason: 'play' | 'skip') is called once
   GameIntro.close()            closes at once, without calling onClose
   GameIntro.isOpen() → bool
   GameIntro.seen() → bool      localStorage 'game-intro-seen' === '1' (false if storage is blocked)
   GameIntro.markSeen()

   Screens  attract: the title over the blurred game, a pixel prize ladder, Start the briefing /
            Skip to the game. Then, numbered: game (15 questions, 3 bands, safe rungs, walk away) ·
            modes (the five modes, Mixed and how it unlocks) · comp (study and competitive: badges, one
            hour, no paste, the diploma by form; only over the select screen) · loop (Read → Query → Lock in) ·
            spot (the screen and controls: a spotlight on each real element, a clip-path hole in
            the blur layer, a caption next to it; only when a run is on screen, not on the mode
            select screen) · options (lifelines and walking away) · example (a mini console types
            example.sql, shows its live result, presses a fake Lock in, SQL-Bot says the suspense
            line, rung 1 of a mini ladder lights up; Replay; Play).
   Keys     ← → move (spot by spot on screen 3), Esc skips, Tab stays inside the dialog.
   Texts    GAME_TOUR (data/en/game-tour.js, data/es/game-tour.js), button labels included. The
            title, tagline, band names, lifeline names and the suspense line come from GAME_TEXT.
   Events   listeners on the overlay's own root, with data-intro attributes (never data-action:
            js/main.js forwards every [data-action] click in #view to the page module).
   Motion   ~280 ms fades and slides; with prefers-reduced-motion nothing moves and the example
            shows its end state.
   Loads in Node without throwing (no window or document at the top level).
   ========================================================================== */

const GameIntro = (() => {
  const KEY = 'game-intro-seen';
  // The screens in order (S.order, built when the tour opens; 'spot' only over a run). S.screen is an index into it.
  const ORDER = ['attract', 'game', 'modes', 'comp', 'loop', 'spot', 'options', 'example'];
  const MODE_KEYS = ['select', 'insert', 'update', 'delete', 'ddl', 'mixed'];
  // Mode names and keywords until GAME_TEXT.modes exists (docs/game-quiz.md §13).
  const MODE_DEF = {
    select: [['Query', 'Consultar'], 'SELECT'], insert: [['Insert', 'Insertar'], 'INSERT'], update: [['Update', 'Modificar'], 'UPDATE'],
    delete: [['Delete', 'Borrar'], 'DELETE'], ddl: [['Structure', 'Estructura'], 'CREATE'], mixed: [['Mixed', 'Mixto'], 'MIX'],
  };
  const PAD = 8;                         // px of clear space around a spotlighted element
  const GAP = 14;                        // px between the cut-out and its caption
  const EDGE = 12;                       // px the caption keeps from the viewport edges
  const ROWS = 4;                        // rows of the example's result shown in the mini console
  const MINI_RUNGS = 5;                  // rungs of the example's mini ladder
  const LADDER = [100, 250, 500, 1000, 2500, 5000, 10000, 20000, 40000, 75000, 125000, 250000, 400000, 600000, 1000000];
  const SAFE = [5, 10];
  const BANDS = [{ key: 'easy', from: 1, to: 5 }, { key: 'medium', from: 6, to: 10 }, { key: 'hard', from: 11, to: 15 }];
  const LIVES = ['clause', 'template', 'review'];

  // Spotlight targets per spot id (GAME_TOUR.screen.spots), first visible match wins. On phones the ladder is a
  // compact card whose full list is folded away (Show prizes), so the card is the fallback.
  const TARGETS = {
    ladder: ['#wr-ladder', '#wr-ladder-card', '.wr-ladder-card', '.wr-side'],
    question: ['#wr-question'],
    lifelines: ['#wr-lifelines'],
    console: ['.wr-console'],
    lock: ['[data-fid="game-lock"]'],
    schema: ['#wr-schema'],
  };

  let S = null;                          // the open overlay's state

  const hasDom = () => typeof window !== 'undefined' && typeof document !== 'undefined';
  const tour = () => (typeof GAME_TOUR !== 'undefined' && GAME_TOUR) || null;
  const text = () => (typeof GAME_TEXT !== 'undefined' && GAME_TEXT) || {};
  const still = () => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return typeof reduceMotion !== 'undefined' && !!reduceMotion; }
  };
  const h = (s) => (typeof esc === 'function' ? esc(s) : String(s));
  const m = (s) => (typeof md === 'function' ? md(s) : h(s));
  const fill = (tpl, p) => String(tpl).replace(/\{(\w+)\}/g, (x, k) => (k in p ? String(p[k]) : x));
  const say = (s) => { if (typeof announce === 'function') announce(s); };
  const lang = () => (typeof LANG !== 'undefined' ? LANG : 'en');

  // The ladder and safe rungs of the game (js/game-core.js), with the contract's values as a fallback.
  const ladder = () => (typeof GameCore !== 'undefined' && GameCore && Array.isArray(GameCore.LADDER) && GameCore.LADDER.length === 15 ? GameCore.LADDER : LADDER);
  const safe = () => (typeof GameCore !== 'undefined' && GameCore && Array.isArray(GameCore.SAFE) ? GameCore.SAFE : SAFE);
  // Prizes as the page writes them (docs/game-quiz.md §8).
  function money(v) {
    try {
      return new Intl.NumberFormat(lang() === 'es' ? 'es-ES' : 'en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' }).format(v);
    } catch (e) { return `${v} €`; }
  }
  const prizes = () => ({ low: money(ladder()[0]), top: money(ladder()[14]), prize: money(ladder()[0]) });
  const bandName = (k) => ((text().bands || {})[k]) || k;
  const lifeName = (k, fallback) => (((text().lifelines || {})[k] || {}).name) || fallback || k;
  const modeT = (k) => (((text().modes || {})[k]) || {});
  const modeName = (k) => modeT(k).name || MODE_DEF[k][0][lang() === 'es' ? 1 : 0];
  const modeKw = (k) => modeT(k).keyword || MODE_DEF[k][1];
  const nm = () => (S ? S.order[S.screen] : '');      // the name of the screen on show
  const total = () => (S ? S.order.length - 1 : ORDER.length - 1);

  /* ---- Seen flag ------------------------------------------------------------------------- */

  function seen() {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* no storage available */ }
  }

  /* ---- Markup ---------------------------------------------------------------------------- */

  const btn = (key, label, cls = '', extra = '') => `<button type="button" class="gi-btn${cls ? ` ${cls}` : ''}" data-intro="${key}"${extra}>${h(label)}</button>`;
  const play = '<svg class="gi-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l6 5-6 5zM9 3l6 5-6 5z"/></svg>';
  // Pixel icons on a 16 × 16 grid (even-odd holes): the lifelines' key, stencil sheet and magnifier, and a door.
  const ICONS = {
    clause: 'M1 5h6v6H1zM3 7v2h2V7zM7 7h8v2H7zM11 9h2v2h-2zM14 9h1v3h-1z',
    template: 'M2 1h12v14H2zM4 3v2h8V3zM4 7v2h5V7zM4 11v2h7v-2z',
    review: 'M1 1h9v9H1zM3 3v5h5V3zM9 9h2v2H9zM11 11h2v2h-2zM13 13h2v2h-2z',
    walk: 'M1 1h8v14H1zM3 3v10h4V3zM10 7h3V5h1v1h1v1h1v2h-1v1h-1v1h-1V9h-3z',
    check: 'M2 8h2v2h2v2h2V10h2V8h2V6h2V4h2v2h-2v2h-2v2h-2v2H8v2H6v-2H4v-2H2z',
  };
  const icon = (k, cls = 'gi-pix') => `<svg class="${cls}" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path fill-rule="evenodd" d="${ICONS[k]}"/></svg>`;

  function dots(n) {
    let out = '';
    for (let i = 1; i <= total(); i++) out += `<li class="${i < n ? 'is-done' : i === n ? 'is-on' : ''}"></li>`;
    return `<ol class="gi-dots" aria-hidden="true">${out}</ol>`;
  }

  // The yellow bar on top of a card: step number, title, Skip.
  function bar(n, title) {
    const T = tour();
    return `<header class="gi-bar">
        <span class="gi-num" aria-hidden="true">${n}</span>
        <h2 id="gi-h" tabindex="-1">${h(title)}</h2>
        ${btn('skip', T.nav.skip, 'is-ghost', ` aria-label="${h(T.nav.skipLabel)}"`)}
      </header>`;
  }

  function foot(n) {
    const T = tour();
    const last = n === total();
    return `<footer class="gi-foot">
        <div class="gi-progress" role="group" aria-label="${h(T.nav.progress)}">${dots(n)}<span class="gi-count">${h(fill(T.nav.step, { n, total: total() }))}</span></div>
        <div class="gi-nav">
          ${btn('back', T.nav.back)}
          ${last ? `<button type="button" class="gi-btn is-start" data-intro="play">${h(T.nav.play)}${play}</button>` : btn('next', T.nav.next, 'is-primary')}
        </div>
      </footer>`;
  }

  // The attract screen's ladder: 15 steps rising to the top prize, safe steps marked, a marker on rung 1.
  function climbHtml() {
    const T = tour();
    const L = ladder();
    const sf = safe();
    let steps = '';
    for (let i = 1; i <= L.length; i++) {
      steps += `<span class="gi-climb-step${sf.includes(i) ? ' is-safe' : ''}${i === L.length ? ' is-top' : ''}${i === 1 ? ' is-here' : ''}" style="--i:${i}"></span>`;
    }
    return `<figure class="gi-climb" role="img" aria-label="${h(fill(T.attract.ladder, prizes()))}">
        <div class="gi-climb-steps">${steps}</div>
        <figcaption class="gi-climb-ends" aria-hidden="true"><span>${h(money(L[0]))}</span><span>${h(money(L[L.length - 1]))}</span></figcaption>
      </figure>`;
  }

  function attractHtml() {
    const T = tour();
    const G = text();
    return `<p class="gi-kicker">${h(T.attract.kicker)}</p>
        <div class="gi-marquee-wrap"><h2 class="gi-marquee" id="gi-h" tabindex="-1">${h(G.title || '')}</h2></div>
        <p class="gi-tagline">${h(G.tagline || '')}</p>
        ${climbHtml()}
        <div class="gi-actions">
          <button type="button" class="gi-btn is-start is-big" data-intro="start">${h(T.attract.start)}${play}</button>
          ${btn('skip', T.attract.skip, 'is-big')}
        </div>
        <p class="gi-note">${m(T.attract.note)}</p>`;
  }

  function gameHtml() {
    const T = tour().game;
    const p = prizes();
    const bands = BANDS.map((b) => {
      let pips = '';
      for (let i = b.from; i <= b.to; i++) pips += `<span class="${safe().includes(i) ? 'is-safe' : ''}"></span>`;
      return `<li class="gi-band is-${b.key}">
          <span class="gi-pips" aria-hidden="true">${pips}</span>
          <strong>${h(bandName(b.key))}</strong>
          <span class="gi-band-r">${h(fill(T.rungs, { from: b.from, to: b.to }))}</span>
          <span class="gi-band-t">${m(T.bands[b.key])}</span>
        </li>`;
    }).join('');
    return `${bar(S.screen, T.title)}
      <div class="gi-body">
        <p class="gi-lead">${m(T.lead)}</p>
        <ol class="gi-bands">${bands}</ol>
        <dl class="gi-facts">${T.facts.map((f, i) => `<div class="f-${i}"><dt>${h(f.head)}</dt><dd>${m(fill(f.text, p))}</dd></div>`).join('')}</dl>
      </div>
      ${foot(S.screen)}`;
  }

  // A pixel padlock for the locked Mixed mode.
  const LOCK = '<svg class="gi-pix" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path fill-rule="evenodd" d="M5 1h6v2h1v4h2v8H2V7h2V3h1zM6 3v4h4V3zM7 9v3h2V9z"/></svg>';

  function modesHtml() {
    const T = tour().modes;
    const items = MODE_KEYS.map((k) => `<li class="gi-mode is-${k}">
        <span class="gi-kw" aria-hidden="true">${k === 'mixed' ? LOCK : ''}${h(modeKw(k))}</span>
        <div><strong class="gi-opt-n">${h(modeName(k))}</strong><p class="gi-opt-t">${m((T.kinds || {})[k] || '')}</p></div>
      </li>`).join('');
    return `${bar(S.screen, T.title)}
      <div class="gi-body">
        <p class="gi-lead">${m(T.lead)}</p>
        <ul class="gi-modes">${items}</ul>
        <p class="gi-aside">${m(T.unlock)}</p>
      </div>
      ${foot(S.screen)}`;
  }

  // Study and competitive (round 6): badges, one hour, no paste, the diploma by form.
  const MEDAL = '<svg class="gi-pix gi-medal" viewBox="0 0 16 18" aria-hidden="true" shape-rendering="crispEdges"><path class="r" d="M3 0h4v6H6v1H4V6H3zM9 0h4v6h-1v1h-2V6H9z"/><path class="o" d="M5 6h6v1h2v2h1v4h-1v2h-2v1H5v-1H3v-2H2V9h1V7h2z"/><path class="d" d="M5 7h6v1h1v1h1v4h-1v1h-1v1H5v-1H4v-1H3V9h1V8h1z"/><path class="o" d="M7 9h2v1h1v1H9v2H7v-2H6v-1h1z"/></svg>';

  function compHtml() {
    const T = tour().comp;
    return `${bar(S.screen, T.title)}
      <div class="gi-body">
        <p class="gi-lead">${m(T.lead)}</p>
        <div class="gi-comp">
          ${MEDAL}
          <ul class="gi-comp-list">${(T.items || []).map((x) => `<li>${m(x)}</li>`).join('')}</ul>
        </div>
      </div>
      ${foot(S.screen)}`;
  }

  function loopHtml() {
    const T = tour();
    const L = T.loop;
    const shows = [
      `<span class="gi-rungtag" aria-hidden="true"><b>1</b>${h(money(ladder()[0]))}</span>`,
      `<span class="gi-row" aria-hidden="true"><code class="gi-chip">${h(L.steps[1].code || 'SELECT')}</code><span class="gi-fake is-run is-small">${h(T.buttons.run)}</span></span>`,
      `<span class="gi-fake is-lock is-small" aria-hidden="true">${h(T.buttons.lock)}${play}</span>`,
    ];
    const steps = L.steps.map((s, i) => `<li class="gi-step">
        <span class="gi-step-n" aria-hidden="true">${i + 1}</span>
        <strong class="gi-step-name">${h(s.name)}</strong>
        ${shows[i] || ''}
        <span class="gi-step-text">${m(s.text)}</span>
      </li>`).join('');
    return `${bar(S.screen, L.title)}
      <div class="gi-body">
        <p class="gi-lead">${m(L.lead)}</p>
        <ol class="gi-loop">${steps}</ol>
        <p class="gi-aside">${m(L.note)}</p>
      </div>
      ${foot(S.screen)}`;
  }

  function spotHtml() {
    const T = tour();
    const spots = T.screen.spots;
    const s = spots[S.spot];
    const sub = spots.map((x, i) => `<li class="${i < S.spot ? 'is-done' : i === S.spot ? 'is-on' : ''}"></li>`).join('');
    return `${bar(S.screen, T.screen.title)}
      <div class="gi-body" aria-live="polite">
        <div class="gi-spot-k"><ol class="gi-dots is-mini" aria-hidden="true">${sub}</ol><span>${h(fill(T.nav.step, { n: S.spot + 1, total: spots.length }))}</span></div>
        <h3 class="gi-spot-h">${h(s.title)}</h3>
        <p class="gi-spot-t">${m(s.text)}</p>
      </div>
      ${foot(S.screen)}`;
  }

  function optionsHtml() {
    const T = tour().options;
    const items = T.items.map((o) => {
      const life = o.life && LIVES.includes(o.life);
      const name = life ? lifeName(o.life, o.name) : o.name;
      // A square key like the page's lifeline buttons (a door for Walk away), then the name and what it does.
      return `<li class="${life ? 'is-life' : 'is-walk'}"><span class="gi-life" aria-hidden="true">${icon(life ? o.life : 'walk')}</span>
          <div><strong class="gi-opt-n">${h(name)}</strong><p class="gi-opt-t">${m(o.text)}</p></div></li>`;
    }).join('');
    return `${bar(S.screen, T.title)}
      <div class="gi-body">
        <p class="gi-lead">${m(T.lead)}</p>
        <ul class="gi-opts">${items}</ul>
        <p class="gi-aside">${m(T.note)}</p>
      </div>
      ${foot(S.screen)}`;
  }

  function miniLadderHtml() {
    const T = tour().example;
    const L = ladder();
    let rungs = '';
    for (let i = MINI_RUNGS; i >= 1; i--) {
      rungs += `<li data-level="${i}" class="${safe().includes(i) ? 'is-safe' : ''}${i === 1 ? ' is-current' : ''}">
          <span class="gi-ml-n">${i}</span><span class="gi-ml-p">${h(money(L[i - 1]))}</span><span class="gi-ml-mark">${icon('check', 'gi-pix is-check')}</span>
        </li>`;
    }
    return `<ol class="gi-ml" role="img" aria-label="${h(T.ladder)}">${rungs}</ol>`;
  }

  function exampleHtml() {
    const T = tour();
    const E = T.example;
    const host = ((text().host || {}).suspense) || '…';
    return `${bar(S.screen, E.title)}
      <div class="gi-body">
        <p class="gi-lead">${m(fill(E.lead, prizes()))}</p>
        <div class="gi-ex" data-phase="start">
          <div class="gi-term">
            <div class="gi-q"><span class="gi-rungtag"><b>1</b>${h(money(ladder()[0]))}</span><p>${m(E.question)}</p></div>
            <div class="gi-screen">
              <p class="gi-line"><span class="gi-prompt" aria-hidden="true">SQL&gt;</span><code class="gi-typed"></code><span class="gi-caret" aria-hidden="true"></span></p>
              <div class="gi-out" hidden></div>
            </div>
            <div class="gi-ex-actions" aria-hidden="true">
              <span class="gi-fake is-run">${h(T.buttons.run)}</span>
              <span class="gi-fake is-lock">${h(T.buttons.lock)}${play}</span>
            </div>
            <p class="gi-host" hidden><b>SQL-Bot</b> <span>${h(host)}</span></p>
          </div>
          ${miniLadderHtml()}
        </div>
        <div class="gi-ex-foot">
          <p class="gi-cap" aria-live="polite"></p>
          ${btn('replay', T.nav.replay)}
        </div>
      </div>
      ${foot(S.screen)}`;
  }

  const SCREEN_HTML = { attract: attractHtml, game: gameHtml, modes: modesHtml, comp: compHtml, loop: loopHtml, spot: spotHtml, options: optionsHtml, example: exampleHtml };

  /* ---- Screens --------------------------------------------------------------------------- */

  function render(dir) {
    const old = S.card;
    const el = document.createElement('div');
    el.className = `gi-card is-screen-${S.screen} is-${nm()}${S.screen === 0 ? ' gi-attract' : ''}${nm() === 'spot' ? ' is-caption' : ''}`;
    el.innerHTML = SCREEN_HTML[nm()]();
    if (!still() && dir) el.classList.add(dir > 0 ? 'is-in-next' : 'is-in-back');
    if (old) old.remove();
    S.stage.appendChild(el);
    S.card = el;
    S.root.classList.toggle('is-spot', nm() === 'spot');
    S.root.classList.toggle('is-attract', S.screen === 0);
    place();
    if (nm() === 'spot') showSpot(true);
    if (nm() === 'example') runExample();
  }

  function go(screen, dir) {
    if (!S) return;
    stopExample();
    const from = S.screen;
    S.screen = Math.max(0, Math.min(total(), screen));
    if (nm() === 'spot') S.spot = from > S.screen ? tour().screen.spots.length - 1 : 0;
    const focusKey = S.screen === 0 ? 'start' : dir > 0 ? (S.screen === total() ? 'play' : 'next') : 'back';
    render(dir);
    focusIn(focusKey);
    const title = S.card.querySelector('#gi-h');
    if (title && S.screen > 0) say(`${title.textContent}. ${fill(tour().nav.step, { n: S.screen, total: total() })}`);
  }

  function step(dir) {
    if (!S) return;
    if (nm() === 'spot') {
      const n = tour().screen.spots.length;
      const next = S.spot + dir;
      if (next >= 0 && next < n) {
        S.spot = next;
        const body = S.card.querySelector('.gi-body');
        const tmp = document.createElement('div');
        tmp.innerHTML = spotHtml();
        body.innerHTML = tmp.querySelector('.gi-body').innerHTML;
        showSpot(false);
        return;
      }
    }
    if (S.screen === 0 && dir < 0) return;
    if (S.screen === total() && dir > 0) return;
    go(S.screen + dir, dir);
  }

  // Moves focus to the button with the given data-intro key, or to the screen's heading.
  function focusIn(key) {
    if (!S) return;
    const b = key && S.card.querySelector(`[data-intro="${key}"]:not([disabled])`);
    const target = b || S.card.querySelector('#gi-h');
    if (target) target.focus({ preventScroll: true });
  }

  /* ---- Spotlight ------------------------------------------------------------------------- */

  // The element for the current spot: the first match that is rendered with a size.
  function spotTarget() {
    const id = tour().screen.spots[S.spot].id;
    const host = S.host || document;
    for (const sel of TARGETS[id] || []) {
      const el = host.querySelector(sel) || document.querySelector(sel);
      if (el && !S.root.contains(el)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
      }
    }
    return null;
  }

  function showSpot(first) {
    const el = spotTarget();
    S.target = el;
    S.lifted = false;
    if (el && el.scrollIntoView) {
      try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: still() ? 'auto' : 'smooth' }); } catch (e) { el.scrollIntoView(); }
    }
    if (!first) S.card.classList.toggle('is-flip', !S.card.classList.contains('is-flip'));   // restarts the caption fade
    track();
  }

  // Re-measures every frame for a short while (smooth scrolling has no reliable end event).
  function track() {
    if (!S) return;
    const until = performance.now() + (still() ? 60 : 900);
    cancelAnimationFrame(S.raf);
    const tick = () => {
      if (!S) return;
      place();
      if (performance.now() < until) S.raf = requestAnimationFrame(tick);
    };
    S.raf = requestAnimationFrame(tick);
  }

  function schedule() {
    if (!S) return;
    if (!S.root.isConnected) { teardown(); return; }
    if (S.pending) return;
    S.pending = requestAnimationFrame(() => { if (S) { S.pending = 0; place(); } });
  }

  // The blur layer with a rectangular hole (an even-odd polygon: the outer box, then the hole).
  function hole(r) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const L = r ? r.left : W / 2;
    const T = r ? r.top : H / 2;
    const R = r ? r.right : W / 2;
    const B = r ? r.bottom : H / 2;
    const p = (x, y) => `${Math.round(x)}px ${Math.round(y)}px`;
    return `polygon(evenodd, ${p(0, 0)}, ${p(W, 0)}, ${p(W, H)}, ${p(0, H)}, ${p(0, 0)}, ${p(L, T)}, ${p(L, B)}, ${p(R, B)}, ${p(R, T)}, ${p(L, T)})`;
  }

  function place() {
    if (!S) return;
    const card = S.card;
    if (nm() !== 'spot') {
      S.veil.style.clipPath = hole(null);
      S.ring.hidden = true;
      return;
    }
    const W = window.innerWidth;
    const H = window.innerHeight;
    const el = S.target && S.target.isConnected ? S.target : spotTarget();
    S.target = el;
    const r0 = el ? el.getBoundingClientRect() : null;
    if (!r0 || !r0.width || !r0.height) {
      S.veil.style.clipPath = hole(null);
      S.ring.hidden = true;
      card.classList.add('is-center');
      card.style.left = '';
      card.style.top = '';
      card.dataset.side = 'none';
      return;
    }
    const r = {
      left: Math.max(4, r0.left - PAD),
      top: Math.max(4, r0.top - PAD),
      right: Math.min(W - 4, r0.right + PAD),
      bottom: Math.min(H - 4, r0.bottom + PAD),
    };
    if (r.right <= r.left || r.bottom <= r.top) {        // scrolled out of view: no hole yet
      S.veil.style.clipPath = hole(null);
      S.ring.hidden = true;
    } else {
      S.veil.style.clipPath = hole(r);
      S.ring.hidden = false;
      Object.assign(S.ring.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.right - r.left}px`, height: `${r.bottom - r.top}px` });
    }
    // The caption: below, above, right or left of the hole; otherwise pinned to the bottom edge.
    card.classList.remove('is-center');
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const cx = (r.left + r.right) / 2;
    const clampX = (x) => Math.max(EDGE, Math.min(W - EDGE - cw, x));
    const clampY = (y) => Math.max(EDGE, Math.min(H - EDGE - ch, y));
    let side = 'bottom';
    let left = (W - cw) / 2;
    let top = H - EDGE - ch;
    if (r.bottom + GAP + ch <= H - EDGE) { side = 'below'; top = r.bottom + GAP; left = clampX(cx - cw / 2); }
    else if (r.top - GAP - ch >= EDGE) { side = 'above'; top = r.top - GAP - ch; left = clampX(cx - cw / 2); }
    else if (r.right + GAP + cw <= W - EDGE) { side = 'right'; left = r.right + GAP; top = clampY(r.top); }
    else if (r.left - GAP - cw >= EDGE) { side = 'left'; left = r.left - GAP - cw; top = clampY(r.top); }
    else if (!S.lifted && (r0.height + 2 * PAD) + GAP + ch <= H - 2 * EDGE && Math.abs(r0.top - PAD - EDGE) > 2) {
      // Tall target on a short screen (the console on a phone): scroll it to the top so the caption fits below.
      S.lifted = true;
      window.scrollBy({ top: r0.top - PAD - EDGE, behavior: still() ? 'auto' : 'smooth' });
      track();
    }
    card.dataset.side = side;
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
    const arrow = side === 'below' || side === 'above' ? cx - left : (r.top + r.bottom) / 2 - top;
    card.style.setProperty('--gi-arrow', `${Math.round(Math.max(18, Math.min((side === 'below' || side === 'above' ? cw : ch) - 18, arrow)))}px`);
  }

  /* ---- The little example ---------------------------------------------------------------- */

  // The example's result, run once per open on the game's own database (a fresh copy, so nothing changes).
  // Resolves to { cols, rows } or null (engine missing, slow or failing: the static fallback line shows).
  function exampleResult() {
    if (S.exResult) return S.exResult;
    const sql = tour().example.sql;
    const can = typeof SqlRunner !== 'undefined' && SqlRunner && typeof SqlRunner.execute === 'function'
      && typeof GAME_BANK !== 'undefined' && GAME_BANK && typeof GAME_BANK.setup === 'string';
    const run = can
      ? Promise.resolve().then(() => SqlRunner.execute(GAME_BANK.setup, sql)).then((r) => (r && !r.error && r.rows && r.rows.length ? r : null), () => null)
      : Promise.resolve(null);
    const slow = new Promise((ok) => { setTimeout(() => ok(null), 4000); });
    S.exResult = Promise.race([run, slow]);
    S.exResult.then((r) => { if (S) S.exData = r; });
    return S.exResult;
  }

  function resultHtml(r) {
    const E = tour().example;
    if (!r) return `<p class="gi-fallback">${m(E.fallback)}</p>`;
    const cell = (v) => (v === null || v === undefined ? '' : String(v));
    const rows = r.rows.slice(0, ROWS);
    const more = r.rows.length - rows.length;
    return `<table class="gi-res"><thead><tr>${r.cols.map((c) => `<th>${h(String(c).toUpperCase())}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((v) => `<td class="${typeof v === 'number' ? 'is-num' : ''}">${h(cell(v))}</td>`).join('')}</tr>`).join('')}</tbody></table>
        ${more > 0 ? `<p class="gi-more">${h(fill(E.more, { n: more }))}</p>` : ''}`;
  }

  function stopExample() {
    if (!S) return;
    S.run++;
    S.timers.forEach(clearTimeout);
    S.timers = [];
  }

  function runExample() {
    stopExample();
    const run = S.run;
    const E = tour().example;
    const card = S.card;
    const q = (sel) => card.querySelector(sel);
    const ex = q('.gi-ex');
    const line = q('.gi-line');
    const code = q('.gi-typed');
    const out = q('.gi-out');
    const host = q('.gi-host');
    const cap = q('.gi-cap');
    const runBtn = q('.gi-fake.is-run');
    const lockBtn = q('.gi-fake.is-lock');
    const quiet = still();
    const sql = E.sql;
    const result = exampleResult();
    const later = (ms, fn) => { S.timers.push(setTimeout(() => { if (S && S.run === run) fn(); }, ms)); };
    const phase = (name, html) => { ex.dataset.phase = name; cap.innerHTML = html; };
    const showResult = () => {
      out.hidden = false;
      out.innerHTML = resultHtml(S.exData);
      if (S.exData === undefined) result.then(() => { if (S && S.run === run && S.card === card) out.innerHTML = resultHtml(S.exData); });
    };
    const press = (el, done) => {
      el.classList.add('is-pressed');
      later(quiet ? 200 : 180, () => { el.classList.remove('is-pressed'); done(); });
    };
    // SQL-Bot's lines: the suspense line while the database is asked, then the first "correct" line.
    const H = text().host || {};
    const hostSay = (s) => { host.querySelector('span').textContent = s || '…'; };
    const cheer = () => hostSay((Array.isArray(H.correct) ? H.correct[0] : H.correct) || H.suspense);
    const typeInto = (done) => {
      line.classList.add('is-typing');
      if (quiet) { code.textContent = sql; line.classList.remove('is-typing'); done(); return; }
      let i = 0;
      const tick = () => {
        i = Math.min(sql.length, i + 2);
        code.textContent = sql.slice(0, i);
        if (i < sql.length) later(28, tick); else { line.classList.remove('is-typing'); later(250, done); }
      };
      tick();
    };
    // Reset to the start position.
    ex.classList.remove('is-won', 'is-asking');
    ex.dataset.phase = 'start';
    code.textContent = '';
    line.classList.remove('is-typing');
    out.hidden = true;
    out.innerHTML = '';
    host.hidden = true;
    hostSay(H.suspense);
    [runBtn, lockBtn].forEach((b) => b.classList.remove('is-pressed'));
    cap.innerHTML = '';

    if (quiet && !S.replayed) {            // reduced motion, first view: the end state at once
      code.textContent = sql;
      showResult();
      host.hidden = false;
      ex.classList.add('is-won');
      cheer();
      phase('done', m(E.done));
      return;
    }
    const gap = quiet ? 1100 : 800;          // reduced motion: each step appears whole, nothing moves
    phase('read', m(E.read));
    later(gap + 400, () => {
      phase('query', m(E.query));
      later(quiet ? 400 : 300, () => typeInto(() => press(runBtn, () => {
        showResult();
        later(gap + 600, () => {
          phase('lock', m(E.lock));
          later(quiet ? 400 : 500, () => press(lockBtn, () => {
            host.hidden = false;
            ex.classList.add('is-asking');
            later(quiet ? 900 : 1200, () => {
              ex.classList.remove('is-asking');
              ex.classList.add('is-won');
              cheer();
              phase('done', m(E.done));
            });
          }));
        });
      })));
    });
  }

  /* ---- Open, close, events --------------------------------------------------------------- */

  function onClick(e) {
    e.stopPropagation();
    const b = e.target.closest('[data-intro]');
    if (!b || b.disabled || !S) return;
    const k = b.dataset.intro;
    if (k === 'start') go(1, 1);
    else if (k === 'skip') finish('skip');
    else if (k === 'play') finish('play');
    else if (k === 'next') step(1);
    else if (k === 'back') step(-1);
    else if (k === 'replay') { S.replayed = true; runExample(); }
  }

  function focusables() {
    return [...S.root.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  function onKey(e) {
    e.stopPropagation();                   // keeps the page's and the site's shortcuts out of the dialog
    if (!S) return;
    if (e.key === 'Escape') { e.preventDefault(); finish('skip'); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (S.screen === 0) { if (e.key === 'ArrowRight') go(1, 1); return; }
      step(e.key === 'ArrowRight' ? 1 : -1);
      if (S && document.activeElement && !S.root.contains(document.activeElement)) focusIn('next');
      return;
    }
    if (e.key === 'Tab') {
      const list = focusables();
      if (!list.length) { e.preventDefault(); return; }
      const first = list[0];
      const last = list[list.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && (at === first || !list.includes(at) && !S.card.contains(at))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
    }
  }

  // Focus that leaves the dialog (a page update, a click through) comes back to it.
  function onFocusIn(e) {
    if (!S) return;
    if (!S.root.isConnected) { teardown(); return; }
    if (!S.root.contains(e.target)) focusIn(S.screen === 0 ? 'start' : 'next');
  }

  function open(opts = {}) {
    if (!hasDom() || !tour()) return;
    if (S && S.root.isConnected) { S.onClose = opts.onClose || S.onClose; focusIn(null); return; }
    if (S) teardown();
    const host = document.querySelector('#view section.wr-game') || document.querySelector('section.wr-game') || document.body;
    const active = document.activeElement;
    const root = document.createElement('div');
    root.className = `gi${still() ? ' is-still' : ''}`;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'gi-h');
    root.innerHTML = '<div class="gi-veil" aria-hidden="true"></div><div class="gi-ring" aria-hidden="true" hidden></div><div class="gi-stage"></div>';
    S = {
      root,
      host,
      veil: root.firstElementChild,
      ring: root.children[1],
      stage: root.children[2],
      card: null,
      screen: 0,
      // The spotlight screen points at the run's controls, so it is left out over the mode select screen.
      // Over a run the spotlight screen is in and the competitive screen is out; over the select screen, the opposite.
      order: ORDER.filter((x) => (x === 'spot' ? !!document.querySelector('#view #wr-question')
        : x === 'comp' ? !document.querySelector('#view #wr-question') && !!(tour() || {}).comp : true)),
      spot: 0,
      target: null,
      onClose: typeof opts.onClose === 'function' ? opts.onClose : null,
      back: active && active !== document.body ? active : null,
      backFid: active && active.dataset ? active.dataset.fid : null,
      timers: [],
      run: 0,
      raf: 0,
      pending: 0,
      replayed: false,
      exResult: null,
      exData: undefined,
      inert: [],
    };
    // The rest of the game is out of reach while the dialog is open.
    if (host !== document.body) {
      [...host.children].forEach((c) => { if (!c.inert) { c.inert = true; S.inert.push(c); } });
    }
    host.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    S.listeners = [
      [window, 'resize', schedule, { passive: true }],
      [window, 'scroll', schedule, { passive: true, capture: true }],
      [window, 'hashchange', () => teardown(), false],
      [document, 'focusin', onFocusIn, true],
    ];
    S.listeners.forEach(([t, ev, fn, o]) => t.addEventListener(ev, fn, o));
    render(0);
    focusIn('start');
  }

  function teardown() {
    if (!S) return null;
    const s = S;
    S = null;
    s.run++;
    s.timers.forEach(clearTimeout);
    cancelAnimationFrame(s.raf);
    cancelAnimationFrame(s.pending);
    (s.listeners || []).forEach(([t, ev, fn, o]) => t.removeEventListener(ev, fn, o));
    s.root.removeEventListener('click', onClick);
    s.root.removeEventListener('keydown', onKey);
    s.inert.forEach((c) => { c.inert = false; });
    if (s.root.isConnected && !still()) {
      s.root.classList.add('is-leaving');
      setTimeout(() => s.root.remove(), 200);
    } else s.root.remove();
    // Focus back to the control that opened the tour (How to play), else the game title.
    let to = s.back && s.back.isConnected && !s.back.disabled ? s.back : null;
    if (!to && s.backFid) to = document.querySelector(`#view [data-fid="${CSS.escape(s.backFid)}"]`);
    if (!to) to = document.getElementById('wr-h');
    if (to && to.focus) to.focus({ preventScroll: true });
    return s;
  }

  function finish(reason) {
    markSeen();
    const s = teardown();
    if (s && s.onClose) {
      try { s.onClose(reason); } catch (e) { if (typeof console !== 'undefined') console.error(e); }
    }
  }

  function close() { teardown(); }

  function isOpen() { return !!S && S.root.isConnected; }

  return { open, close, isOpen, seen, markSeen };
})();

if (typeof module !== 'undefined') module.exports = GameIntro;
