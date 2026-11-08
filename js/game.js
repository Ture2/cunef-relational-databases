'use strict';

/* ==========================================================================
   Query for a Million (#/game): the page of the SQL quiz-ladder game.
   Contract: docs/game-quiz.md (§8 the page, §13 the modes) and
   docs/game-visual.md ("Round 4: game-first, light only"). The rules live in
   js/game-core.js (GameCore, pure); the questions in data/game-bank*.js
   (GAME_BANK); the texts in data/{en,es}/game*.js (GAME_TEXT). This module
   draws the page, runs SQL on a fresh copy of the shop database, and saves.

   Routes   #/game          the mode select screen ("choose your stage")
            #/game/<mode>   a run: select, insert, update, delete, ddl, mixed
                            (js/main.js passes the mode as `rest`)
   Layout   marquee (title, SQL-Bot's line, ← Modes, How to play, EN|ES);
            the stage (the question and the console), the schema;
            side: the lifelines, the prize ladder, Walk away.
   Flow     Run: free, any statement, on a fresh copy (DML: a diff of the
            touched tables; DDL: the new columns or the view's rows).
            Lock in: checkAnswer → confirm → suspense → grade (select: grade;
            DML and DDL: executeChecks + gradeChecks) → pass, rescue or fail.
   Saved    makeStore('game-quiz-v2'): { v: 2, runs, best, reached } per mode;
            'game-quiz-draft-v2' and 'game-quiz-pending-v2': { <mode>: … }.
            The v1 keys are migrated once, then deleted (§13.4).
   ========================================================================== */

const GamePage = (() => {
  const store = makeStore('game-quiz-v2');
  const draftStore = makeStore('game-quiz-draft-v2');
  const pendingStore = makeStore('game-quiz-pending-v2');
  // Competitive side (§15): the attempts live on the server; here only the console drafts, the telemetry of the
  // question on screen, and the Study | Competitive choice.
  const compDraftStore = makeStore('game-comp-draft-v2');
  const teleStore = makeStore('game-comp-tele-v2');
  const sideStore = makeStore('game-side-v1');
  const START_SQL = 'SELECT *\nFROM games\nFETCH FIRST 5 ROWS ONLY;';
  const SUSPENSE_MS = 1200;
  const LIVES = ['clause', 'template', 'review'];
  const PLAY_MODES = ['select', 'insert', 'update', 'delete', 'ddl'];
  const MODES = [...PLAY_MODES, 'mixed'];
  // Names and tile keywords until GAME_TEXT.modes exists (§13; local, so that short words such as "Delete"
  // or "Play" do not clash with the same keys elsewhere in the site's dictionaries).
  const MODE_DEF = {
    select: { name: ['Query', 'Consultar'], kw: 'SELECT' }, insert: { name: ['Insert', 'Insertar'], kw: 'INSERT' },
    update: { name: ['Update', 'Modificar'], kw: 'UPDATE' }, delete: { name: ['Delete', 'Borrar'], kw: 'DELETE' },
    ddl: { name: ['Structure', 'Estructura'], kw: 'CREATE' }, mixed: { name: ['Mixed', 'Mixto'], kw: 'MIX' },
  };
  const loc = (pair) => (LANG === 'es' ? pair[1] : pair[0]);

  /* ---- Module state (kept while the student visits other pages) ------------------------- */

  let ready = false;                  // the SQL engine loaded
  let data = null;                    // the study save: { v: 2, runs, best, reached }
  const compRuns = {};                // competitive attempts on screen, as GameCore-like states built from the server's view
  const testRuns = {};                // the same for the teacher's test attempts
  let side = 'study';                 // the world of the run on screen: 'study' | 'comp' | 'test'
  let mode = null;                    // the mode being played, or null on the other screens
  let state = null;                   // GameCore state of that run
  let view = '';                      // what the page shows: 'select' | 'start' | 'run' | 'teacher' (data-view)
  let curRoute = '';                  // the route it belongs to ('' | 'insert' | 'comp/insert' | 'profesor')
  let consoleText = START_SQL;
  let output = '';                    // the console's last output (HTML)
  let outVersion = 0;                 // bumped with each new console output: #wr-out is rewritten only then
  let busy = false;                   // a lock-in is being judged
  let loading = null;
  let loadFailed = false;
  let lastError = null;
  let hostText = '';                  // SQL-Bot's current line
  let promptShown = null;             // the question whose prompt has been typed
  let typer = null;
  let trayLife = null;                // the lifeline output the tray shows (the most recent by default)
  let ladderOpen = false;             // phones: the full ladder is open
  let last = null;                    // the last Run or lock-in on this question: { id, sql, res }
  let review = null;                  // the Review output: { id, items }
  let lifeMsg = null;                 // a lifeline note that spends nothing: { id, k }
  let dialog = null;                  // { kind: 'lock' | 'walk' | 'rescue', sql?, back }
  let flash = null;                   // { level, cls }: a rung that flashes once after a verdict
  let endInfo = null;                 // { best, newBest } for the end screen
  const memo = {};                    // per side and mode: the transient values above, kept while another run is shown
  const refs = new Map();             // question id → Promise of the reference result (select) or checks (DML, DDL)
  let baseline = null;                // Promise of the setup's snapshot (the Run diff compares against it)

  /* The game route: '' (select screen), 'insert', 'comp/insert', 'profesor', or null when the page is not the game. */
  const routeMode = () => { const r = /^#\/game(?:\/((?:comp\/)?[a-z]+))?$/.exec(location.hash); return r ? (r[1] || '') : null; };
  const onRoute = () => routeMode() !== null;
  // The page on screen is the one this module state describes (the same route and the same view).
  const onPage = () => {
    const s = document.querySelector('#view section.wr-game');
    return !!s && !!s.querySelector('#wr-hud') && s.dataset.view === view && routeMode() === curRoute;
  };
  const isRun = () => view === 'run';
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const paras = (s) => String(s || '').split(/\n\n+/).map((p) => `<p>${md(p)}</p>`).join('');
  const money = (n) => new Intl.NumberFormat(LANG === 'es' ? 'es-ES' : 'en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' }).format(n || 0);
  // Study questions come from GAME_BANK; a competitive question comes from the server's view (prompt, and the
  // clause and template once their lifeline is used; never its solution).
  const isComp = () => side === 'comp' || side === 'test';
  const question = (id) => (isComp() ? compQuestion(id) : GAME_BANK.questions.find((q) => q.id === id) || null);
  const qMode = (q) => (q && q.mode) || 'select';
  const qText = (id) => (isComp() ? compText(id) : ((GAME_TEXT.questions || {})[id] || {}));
  const currentId = () => (state && state.ids ? state.ids[state.level - 1] : null);
  const curKind = () => qMode(question(currentId()));               // the kind of statement the rung asks for
  const playing = () => !!state && state.status === 'playing';
  const locked = () => busy || !!dialog;          // a lock-in is being judged, or a game dialog is open
  const TOOL_SEL = '#view [data-action="game-help"], #view [data-action="game-lang"], #view [data-action="game-modes"], #view [data-action="game-side"]';
  const H = () => GAME_TEXT.host || {};
  const fill = (s, p) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (p && k in p ? String(p[k]) : m));
  const delay = (ms) => new Promise((ok) => { setTimeout(ok, ms); });
  const modeText = (m) => ((GAME_TEXT.modes || {})[m]) || {};
  const modeName = (m) => modeText(m).name || loc(MODE_DEF[m].name);
  const modeKw = (m) => modeText(m).keyword || MODE_DEF[m].kw;
  const cfg = () => (typeof GAME_COMP_CONFIG !== 'undefined' ? GAME_COMP_CONFIG : { supabaseUrl: '', anonKey: '', limitMinutes: 60, dailyAttempts: 3 });

  /* One of SQL-Bot's lines; arrays are picked with the run's seed (the same run says the same things). */
  function line(v, salt = 0) {
    if (!Array.isArray(v)) return String(v || '');
    if (!v.length) return '';
    const seed = ((Number(state && state.seed) || 1) + Math.imul(salt + 1, 2654435761)) >>> 0;
    return String(v[Math.floor(GameCore.rng(seed)() * v.length)]);
  }

  /* ---- Worlds: where a run of each side lives ----------------------------------------------- */

  // Study (v2 store); competitive and the teacher's tests: the server keeps the attempt, the pending rescue and the
  // badges, so their runs here are views (nothing to save) and only the console draft stays in the browser.
  const noPending = { load: () => ({}), save: () => {} };
  const WORLDS = {
    study: { runs: () => data.runs, save: () => saveData(), draft: draftStore, pending: pendingStore },
    comp: { runs: () => compRuns, save: () => {}, draft: compDraftStore, pending: noPending },
    test: { runs: () => testRuns, save: () => {}, draft: compDraftStore, pending: noPending },
  };
  const W = (sd = side) => WORLDS[sd];

  /* ---- Start-up and saving -------------------------------------------------------------- */

  /* Every field this page relies on; anything else starts a fresh run of that mode. */
  function validState(s, m, bk = GAME_BANK) {
    const n = GameCore.LADDER.length;
    const known = new Map(bk.questions.map((q) => [q.id, q]));
    const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
    const fits = (q, i) => !!q && q.level === i + 1 && (m === 'mixed' ? PLAY_MODES.includes(qMode(q)) : qMode(q) === m);
    const idOrNull = (v) => v === null || (typeof v === 'string' && known.has(v));
    return isObj(s) && s.v === 1 && Number.isFinite(s.seed) && (s.mode === undefined || s.mode === m)
      && Array.isArray(s.ids) && s.ids.length === n && s.ids.every((id, i) => typeof id === 'string' && fits(known.get(id), i))
      && Number.isInteger(s.level) && s.level >= 1 && s.level <= n
      && ['playing', 'won', 'lost', 'walked'].includes(s.status) && Number.isFinite(s.prize)
      && isObj(s.used) && LIVES.every((k) => typeof s.used[k] === 'boolean')
      && Array.isArray(s.answers) && s.answers.every((a) => isObj(a) && known.has(a.id) && typeof a.sql === 'string' && typeof a.ok === 'boolean')
      && isObj(s.shown) && idOrNull(s.shown.clause) && idOrNull(s.shown.template);
  }

  /* The rungs answered right in a run: every rung below the current one (all 15 after a win). */
  const answeredOf = (s) => (!s ? 0 : s.status === 'won' ? GameCore.LADDER.length : Math.max(0, (s.level || 1) - 1));
  const answered = () => answeredOf(state);

  /* A wrong lock-in waiting for the rescue answer (Review unused): saved before the dialog shows, so a
     reload, Back or a link out cannot undo the verdict; the dialog opens again on the next visit. */
  function pendingNow() {
    if (!mode || !isRun()) return null;
    if (isComp()) return att && att.status === 'pending' ? { sql: pendingSql } : null;   // the server keeps it
    const all = W().pending.load();
    const p = all[mode];
    const ok = p && p.v === 1 && playing() && !state.used.review && p.seed === state.seed && p.level === state.level
      && p.id === currentId() && typeof p.sql === 'string';
    if (!ok && p) { delete all[mode]; W().pending.save(all); }
    return ok ? p : null;
  }
  function setPending(m, p, sd = side) {
    const all = W(sd).pending.load();
    if (p) all[m] = p; else delete all[m];
    W(sd).pending.save(all);
  }

  /* localStorage 'game-seed' (a number) fixes the questions, for the browser checks; else random. */
  function newSeed() {
    let n = NaN;
    try { const v = localStorage.getItem('game-seed'); if (v !== null && v.trim() !== '') n = Number(v); } catch (e) { /* no storage */ }
    return Number.isFinite(n) ? (Math.floor(n) >>> 0) : (Math.floor(Math.random() * 4294967296) >>> 0);
  }

  const saveData = () => { if (data) store.save(data); };
  /* Saves the run of `m` in its world (default: the run on screen); study also keeps its best rung. */
  function save(m = mode, s = state, sd = side) {
    if (!m || !s) return;
    if (sd === 'study') {
      if (!data) return;
      data.runs[m] = s;
      data.reached[m] = Math.max(Number(data.reached[m]) || 0, answeredOf(s));
    } else W(sd).runs()[m] = s;
    W(sd).save();
  }
  function saveDraft() {
    if (!mode || !isRun()) return;
    const all = W().draft.load();
    all[mode] = consoleText;
    W().draft.save(all);
  }

  /* A new study run of a mode: GameCore.newRun(bank, seed, mode). */
  function makeRun(m, seed) {
    const s = GameCore.newRun(GAME_BANK, seed, m);
    return s.mode === m ? s : { ...s, mode: m };
  }
  const ready_ = {};
  /* Can a run of this mode be drawn from the bank (all 15 rungs have a question)? */
  function modeReady(m) {
    if (!(m in ready_)) {
      try { ready_[m] = GameCore.ready(GAME_BANK, m) && validState(makeRun(m, 1), m); } catch (e) { ready_[m] = false; }
    }
    return ready_[m];
  }
  const reached = () => (data && data.reached) || {};
  function mixedOpen() {
    if (typeof GameCore.mixedUnlocked === 'function') return !!GameCore.mixedUnlocked(reached());
    return PLAY_MODES.every((k) => (Number(reached()[k]) || 0) >= 5);
  }

  /* The v2 store; on the first load the v1 run, best score, draft and pending rescue move to the select mode. */
  function loadData() {
    const d0 = store.load();
    const d = d0 && d0.v === 2 ? d0 : { v: 2, runs: {}, best: {}, reached: {} };
    ['runs', 'best', 'reached'].forEach((k) => { if (!d[k] || typeof d[k] !== 'object' || Array.isArray(d[k])) d[k] = {}; });
    const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
    let had = false;
    try { had = ['game-quiz-v1', 'game-best-v1', 'game-quiz-draft-v1', 'game-quiz-pending-v1'].some((k) => localStorage.getItem(k) !== null); } catch (e) { /* no storage */ }
    if (had) {
      const s1 = read('game-quiz-v1');
      if (s1 && typeof s1 === 'object') {
        const s = { ...s1, mode: 'select' };
        if (!d.runs.select && validState(s, 'select')) d.runs.select = s;
        d.reached.select = Math.max(Number(d.reached.select) || 0, answeredOf(s1));
      }
      const b1 = read('game-best-v1');
      // The best score proves a rung too (an earlier run may have gone further than the last one).
      if (b1 && Number.isFinite(b1.prize)) d.reached.select = Math.max(Number(d.reached.select) || 0, GameCore.LADDER.filter((x) => x <= b1.prize).length);
      if (b1 && Number.isFinite(b1.prize) && !(d.best.select && d.best.select.prize >= b1.prize)) d.best.select = b1;
      const dr = read('game-quiz-draft-v1');
      if (dr && typeof dr.sql === 'string') { const all = draftStore.load(); if (all.select === undefined) { all.select = dr.sql; draftStore.save(all); } }
      const p1 = read('game-quiz-pending-v1');
      if (p1 && p1.v === 1) setPending('select', p1, 'study');
      ['game-quiz-v1', 'game-best-v1', 'game-quiz-draft-v1', 'game-quiz-pending-v1'].forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* no storage */ } });
    }
    MODES.forEach((m) => { if (d.runs[m] && !validState(d.runs[m], m)) delete d.runs[m]; });
    data = d;
    saveData();
  }

  function start() {
    // The old war game's save, and the static competitive side of round 6 (§15 replaces it).
    ['game-v1', 'game-comp-v1', 'game-comp-draft-v1', 'game-comp-pending-v1'].forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* no storage */ } });
    loadData();
  }

  const memoKey = (sd, m) => `${sd}:${m}`;
  /* Keeps the transient values of the run on screen, and brings back those of side `sd`, mode `m` (no run:
     m null). A study run that does not exist yet starts; a competitive attempt starts only from its rules dialog. */
  function enter(sd, m) {
    if (side === sd && mode === m && (m === null || state)) return;
    if (mode) memo[memoKey(side, mode)] = { consoleText, output, last, review, lifeMsg, trayLife, hostText, promptShown, endInfo, ladderOpen };
    if (typer) { typer.finish(); typer = null; }
    side = sd;
    mode = m;
    outVersion++;
    if (!m) { state = null; hostText = ''; return; }        // no run: SQL-Bot says the tagline
    const k = memo[memoKey(sd, m)];
    if (k) ({ consoleText, output, last, review, lifeMsg, trayLife, hostText, promptShown, endInfo, ladderOpen } = k);
    else {
      const d = W().draft.load();
      consoleText = typeof d[m] === 'string' ? d[m] : START_SQL;
      output = ''; last = null; review = null; lifeMsg = null; trayLife = null; promptShown = null; endInfo = null; ladderOpen = false;
    }
    state = W().runs()[m] || null;
    if (!state) {
      if (sd === 'study') newRun();
      return;
    }
    if (!k) {
      hostText = playing() ? (state.answers.length ? line(H().ask, state.level) : welcomeLine()) : '';
      if (pendingNow()) hostText = String(H().wrong || '');
    }
  }

  /* SQL-Bot's first line in a mode (GAME_TEXT.modes[m].welcome when the texts give one). */
  const welcomeLine = () => String(modeText(mode).welcome || H().welcome || '');

  function resetTransient() {
    output = '';
    outVersion++;
    last = null;
    review = null;
    lifeMsg = null;
    trayLife = null;
    flash = null;
    endInfo = null;
    promptShown = null;
    hostText = welcomeLine();
  }

  function newRun() {
    state = makeRun(mode, newSeed());
    resetTransient();
    setPending(mode, null);
    save();
  }

  function boot() {
    if (loading) return;
    loadFailed = false;
    loading = SqlRunner.load().then(() => {
      ready = true;
      try { start(); } catch (e) { showBroken(e); return; }
      if (onRoute()) show(routeMode());
    }, () => {
      loading = null;
      loadFailed = true;
      if (onRoute()) $('#view').innerHTML = loadingHtml();
    });
  }

  /* Routes (§13.4, §14.1): '' the select screen; a study mode; 'comp/<mode>' a competitive attempt (its rules
     first, when no attempt is running); 'profesor' teacher mode; 'historial' My attempts; 'entrar' the Competitive
     side (sign-in), from the header's account menu. Anything that cannot be shown goes back to
     the select screen. */
  function show(rest) {
    const r = rest || '';
    const back = () => { history.replaceState(null, '', '#/game'); return show(''); };
    let sd = 'study';
    let m = null;
    let v = 'select';
    if (r === 'entrar') {                  // the header's Sign in: the Competitive side, which signs in first
      sideStore.save({ side: 'comp' });
      return back();
    }
    if (r === 'historial') {               // My attempts: after sign-in, loaded fresh on every visit
      hist = { data: null, loading: false };
      compOpen(r);
      return undefined;
    }
    if (r === 'profesor') {
      if (teacherRun && testRuns[teacherRun]) { sd = 'test'; m = teacherRun; v = 'run'; } else { compOpen(r); return undefined; }
    } else if (r.startsWith('comp/')) {
      if (!PLAY_MODES.includes(r.slice(5))) return back();
      // The server decides: an attempt running in this mode shows; else its rules (after sign-in).
      sideStore.save({ side: 'comp' });
      compOpen(r);
      return undefined;
    } else if (!r && pickedSide() === 'comp' && configured() && (!sb || (session && !srv))) {
      compOpen('');
      return undefined;
    } else if (r) {
      if (!MODES.includes(r) || !modeReady(r) || (r === 'mixed' && !mixedOpen())) return back();
      sd = 'study'; m = r; v = 'run';
    }
    try { enter(sd, m); } catch (e) { showBroken(e); return undefined; }
    if (v === 'run' && !state) v = 'start';
    view = v;
    curRoute = r;
    showPage();
    return undefined;
  }

  /* The page; if any part of it cannot be built, the error card instead. */
  function showPage() {
    teardown();
    if (!onRoute()) return;
    let html;
    try {
      html = view === 'run' ? pageHtml() : view === 'start' ? startHtml() : view === 'teacher' ? teacherHtml() : view === 'history' ? historyHtml() : view === 'wait' ? waitHtml() : selectHtml();
    } catch (e) { showBroken(e); return; }
    $('#view').innerHTML = html;
    flash = null;
    if (view === 'run') { bindEditor(); afterChange(); if (isComp()) startClock(); }
    if (view === 'start') { const b = document.querySelector('#view [data-fid="game-comp-start"]'); if (b) b.focus({ preventScroll: true }); }
    if (document.getElementById('wr-captcha')) guard(mountCaptcha);
    // A verdict waiting for the rescue answer comes back first; else the first visit opens the tour.
    const p = pendingNow();
    if (p && onPage()) openDialog({ kind: 'rescue', sql: p.sql, back: 'game-lock' });
    else if (onPage() && view !== 'start' && view !== 'teacher' && view !== 'history' && hasIntro() && !introCall('seen')) openIntro();
  }

  /* ---- Onboarding (js/game-intro.js, global GameIntro; it may be missing) ------------------ */

  const hasIntro = () => typeof GameIntro !== 'undefined' && !!GameIntro && typeof GameIntro.open === 'function';
  function introCall(name, ...args) {
    if (!hasIntro() || typeof GameIntro[name] !== 'function') return undefined;
    try { return GameIntro[name](...args); } catch (e) { return undefined; }
  }

  function openIntro() {
    if (!hasIntro()) return false;
    if (introCall('isOpen')) return true;
    introCall('open', {
      onClose: () => {
        introCall('markSeen');
        if (!onPage()) return;
        const back = document.querySelector('#view [data-fid="game-help"]') || document.getElementById('wr-h');
        if (back) back.focus({ preventScroll: true });
      },
    });
    return true;
  }

  function showBroken(e) {
    lastError = e;
    busy = false;
    teardown();
    if (typeof console !== 'undefined') console.error(e);
    if (onRoute()) $('#view').innerHTML = brokenHtml(e);
  }

  /* Wraps an event handler: an exception shows the error card, never a half-drawn page. */
  function guard(fn) {
    try {
      const p = fn();
      if (p && typeof p.catch === 'function') p.catch(showBroken);
    } catch (e) { showBroken(e); }
  }

  /* ---- Markup: loading, error, page ------------------------------------------------------ */

  function brokenHtml(e) {
    const msg = e && e.message ? String(e.message).slice(0, 300) : String(e || '');
    return `<section class="wr-game wr-loading" aria-labelledby="wr-h">
        <h1 id="wr-h" class="wr-title" tabindex="-1">${esc(GAME_TEXT.title)}</h1>
        <p class="wr-load-msg is-bad" role="alert">${esc(t('The game could not be shown ({error}). Start a new game to keep playing.', { error: msg }))}</p>
        <p class="wr-end-actions">
          <button type="button" class="wr-btn is-primary" data-action="game-again" data-fid="game-again">${esc(t('New game'))}</button>
        </p>
      </section>`;
  }

  function loadingHtml() {
    const body = loadFailed
      ? `<p class="wr-load-msg is-bad">${esc(t('The SQL engine could not load (are you offline?). The game needs it: check your connection and try again.'))}</p>
         <button type="button" class="wr-btn is-primary" data-action="game-retry" data-fid="game-retry">${esc(t('Try again'))}</button>`
      : `<div class="wr-loader" aria-hidden="true"><span></span><span></span><span></span></div>
         <p class="wr-load-msg" role="status">${esc(t('Loading the SQL engine…'))}</p>`;
    return `<section class="wr-game wr-loading" aria-labelledby="wr-h">
        <h1 id="wr-h" class="wr-title" tabindex="-1">${esc(GAME_TEXT.title)}</h1>
        <p class="wr-tagline">${esc(GAME_TEXT.tagline)}</p>
        ${body}
      </section>`;
  }

  /* The game screen. Main column: the stage (the question and the console in one card), then the schema.
     Side column: the lifeline buttons, then the prize ladder. On phones (game.css) the two columns open
     up into one: the ladder strip, the stage, the lifelines, the schema. */
  function pageHtml() {
    const test = side === 'test';
    return `<section class="wr-game is-run${isComp() ? ' is-comp' : ''}${test ? ' is-test' : ''}" data-mode="${mode}" data-side="${side}" data-view="run" data-route="${esc(curRoute)}" aria-labelledby="wr-h">
        <header class="wr-hud" id="wr-hud">${hudHtml()}</header>
        ${test ? testBarHtml() : ''}
        <div class="wr-grid">
          <div class="wr-main" id="wr-main">${mainHtml()}</div>
          <div class="wr-side">
            <section class="wr-lifelines" id="wr-lifelines" aria-label="${esc(t('Lifelines'))}"${playing() ? '' : ' hidden'}>${playing() ? lifelinesHtml() : ''}</section>
            <section class="wr-ladder-card${ladderOpen ? ' is-open' : ''}" id="wr-ladder-card" aria-label="${esc(t('Prize ladder'))}">${ladderHtml()}</section>
          </div>
        </div>
        <div id="wr-dialogs">${dialogHtml()}</div>
      </section>`;
  }

  /* The marquee: title, SQL-Bot's line, ← Modes (in a run), How to play and the language. */
  function hudHtml() {
    return `<div class="wr-marquee">
        <h1 id="wr-h" class="wr-title" tabindex="-1">${esc(GAME_TEXT.title)}</h1>
        <p class="wr-host" id="wr-host" aria-live="polite" data-text="${esc(hostText)}">${hostHtml()}</p>
        <div class="wr-tools">${toolsHtml()}</div>
      </div>`;
  }

  const BOT = '<svg class="wr-bot" viewBox="0 0 12 12" aria-hidden="true"><path d="M5 0h2v2h3v1h1v6h-1v1H2V9H1V3h1V2h3z"/><path class="wr-bot-face" d="M3 4h2v2H3zM7 4h2v2H7zM4 7h4v1H4z"/></svg>';

  function hostHtml() {
    return `<span class="wr-host-name">${BOT}<span class="sr-only">SQL-Bot: </span></span><span class="wr-host-line" id="wr-host-line">${md(hostText || GAME_TEXT.tagline)}</span>`;
  }

  /* How to play (it opens the tour) and the language (EN | ES), on the marquee. */
  const BACK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7 3h2v2H7v2h7v2H7v2h2v2H7v-2H5V9H3V7h2V5h2z"/></svg>';

  function toolsHtml() {
    const back = mode || view === 'teacher' || view === 'history' ? `<button type="button" class="wr-btn is-back" data-action="game-modes" data-fid="game-modes"${locked() ? ' disabled' : ''}>${BACK}${esc(t('Modes'))}</button>` : '';
    const clock = view === 'run' && isComp() ? clockHtml() : '';
    const lang = (v, short, name) => `<button type="button" class="wr-seg-btn" data-action="game-lang" data-value="${v}" data-fid="game-lang-${v}" lang="${v}" aria-pressed="${LANG === v}" title="${esc(name)}"${locked() ? ' disabled' : ''}>${short}<span class="sr-only"> ${esc(name)}</span></button>`;
    return `${clock}${back}<button type="button" class="wr-btn is-help" data-action="game-help" data-fid="game-help"${locked() ? ' disabled' : ''}><span class="wr-q" aria-hidden="true">?</span>${esc(t('How to play'))}</button>
      <div class="wr-seg" role="group" aria-label="${esc(t('Language'))}">${lang('en', 'EN', 'English')}${lang('es', 'ES', 'Español')}</div>`;
  }

  function teardown() {
    if (typer) { typer.finish(); typer = null; }
    stopClock();
    if (introCall('isOpen')) introCall('close');
  }

  /* ---- The select screen ("choose your stage") -------------------------------------------- */

  const LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M5 1h6v2h1v4h2v8H2V7h2V3h1zM6 3v4h4V3zM7 9v3h2V9z"/></svg>';
  const TICK = '<svg viewBox="0 0 9 8" aria-hidden="true"><path d="M0 3h2v1h1v1h1V4h1V3h1V2h1V1h1V0h1v3H8v1H7v1H6v1H5v1H4v1H3V7H2V6H1V5H0z"/></svg>';

  function tileHtml(m) {
    const run = data.runs[m];
    const best = data.best[m];
    const live = run && run.status === 'playing' && (run.level > 1 || run.answers.length);
    const go = live ? t('Continue · rung {n}', { n: run.level }) : loc(['Play', 'Jugar']);
    const bestLine = best && best.prize > 0 ? `<span class="wr-tile-best">${esc(t('Best {prize}', { prize: money(best.prize) }))}</span>` : '';
    if (!modeReady(m)) {
      return `<li class="wr-tile-li"><div class="wr-tile is-${m} is-off" data-fid="game-mode-${m}" aria-disabled="true">
          <span class="wr-tile-kw">${esc(modeKw(m))}</span><span class="wr-tile-name">${esc(modeName(m))}</span>
          <span class="wr-tile-go">${esc(loc(['Coming soon', 'Muy pronto']))}</span></div></li>`;
    }
    if (m === 'mixed') {
      const open = mixedOpen();
      const ticks = PLAY_MODES.map((k) => {
        const ok = (Number(reached()[k]) || 0) >= 5;
        return `<li class="${ok ? 'is-on' : ''}"><span class="wr-box" aria-hidden="true">${ok ? TICK : ''}</span>${esc(modeKw(k))}<span class="sr-only">: ${esc(ok ? t('rung 5 reached') : t('rung 5 not reached yet'))}</span></li>`;
      }).join('');
      const body = `<span class="wr-tile-kw">${open ? '' : LOCK}${esc(modeKw(m))}</span>
          <span class="wr-tile-name">${esc(modeName(m))}</span>
          ${open ? `<span class="wr-tile-go">${esc(go)}</span>${bestLine}` : `<span class="wr-tile-need">${esc(t('Reach rung 5 in every mode'))}</span>`}
          <ul class="wr-ticks" aria-label="${esc(t('Rung 5 in each mode'))}">${ticks}</ul>`;
      return open
        ? `<li class="wr-tile-li is-boss"><a class="wr-tile is-mixed" href="#/game/mixed" data-fid="game-mode-mixed">${body}</a></li>`
        : `<li class="wr-tile-li is-boss"><div class="wr-tile is-mixed is-locked" data-fid="game-mode-mixed" aria-disabled="true">${body}</div></li>`;
    }
    return `<li class="wr-tile-li"><a class="wr-tile is-${m}${live ? ' is-live' : ''}" href="#/game/${m}" data-fid="game-mode-${m}">
        <span class="wr-tile-kw">${esc(modeKw(m))}</span>
        <span class="wr-tile-name">${esc(modeName(m))}</span>
        <span class="wr-tile-go">${esc(go)}</span>
        ${bestLine}
      </a></li>`;
  }

  const pickedSide = () => (sideStore.load().side === 'comp' ? 'comp' : 'study');

  /* The select screen: the Study | Competitive switch, then the tiles of that side. */
  function selectHtml() {
    const sd = pickedSide();
    const seg = (v, label) => `<button type="button" class="wr-side-btn" data-action="game-side" data-value="${v}" data-fid="game-side-${v}" aria-pressed="${sd === v}">${esc(label)}</button>`;
    const body = sd === 'comp' ? compSelectHtml()
      : `<ul class="wr-modes" id="wr-modes" aria-labelledby="wr-modes-h">${MODES.map(tileHtml).join('')}</ul>`;
    return `<section class="wr-game is-chooser" data-mode="" data-view="select" data-route="" aria-labelledby="wr-h">
        <header class="wr-hud" id="wr-hud">${hudHtml()}</header>
        <div class="wr-select">
          <div class="wr-sides" role="group" aria-label="${esc(t('Study or competitive'))}">${seg('study', t('Study'))}${seg('comp', t('Competitive'))}</div>
          <h2 class="sr-only" id="wr-modes-h">${esc(sd === 'comp' ? t('Competitive') : t('Choose a mode'))}</h2>
          ${body}
        </div>
        <div id="wr-dialogs"></div>
      </section>`;
  }

  /* ---- The main column ------------------------------------------------------------------- */

  function mainHtml() {
    if (!playing()) return endHtml();
    return `<div class="wr-stage">
        <section class="wr-question" id="wr-question" aria-labelledby="wr-q-h">${questionHtml()}</section>
        ${consoleHtml()}
      </div>
      <section class="wr-schema" id="wr-schema" aria-label="${esc(t('The shop database'))}">${schemaHtml()}</section>`;
  }

  /* The hero: the rung and its prize, the band, the question. */
  function questionHtml() {
    const id = currentId();
    const lvl = state.level;
    const band = GameCore.band(lvl);
    return `<header class="wr-q-head">
        <span class="wr-q-rung" aria-hidden="true">${lvl}</span>
        <h2 id="wr-q-h" class="wr-q-prize"><span class="sr-only">${esc(t('Question {n} of {total}', { n: lvl, total: GameCore.LADDER.length }))}: </span>${esc(money(GameCore.prize(lvl)))}</h2>
        <span class="wr-q-tags">
          <span class="wr-band is-${band}">${esc((GAME_TEXT.bands || {})[band] || band)}</span>
          ${kindChip(curKind(), mode === 'mixed')}
        </span>
      </header>
      <div class="wr-prompt-text" id="wr-prompt" data-action="game-prompt">${paras(qText(id).prompt)}</div>`;
  }

  /* The keyword of a mode as a chip: what kind of statement the rung asks for. */
  function kindChip(k, big) {
    return `<span class="wr-kind is-${k}${big ? ' is-big' : ''}" title="${esc(modeName(k))}"><span class="sr-only">${esc(t('Statement:'))} </span>${esc(modeKw(k))}</span>`;
  }

  // Pixel icons, 16×16, drawn with even-odd holes.
  const ICONS = {
    clause: '<path d="M1 5h5v1h1v4H6v1H1v-1H0V6h1zM2 7v2h3V7zM7 7h9v2h-1v3h-2V9h-1v2h-2V9H7z"/>',
    template: '<path d="M2 0h9l3 3v13H2zM4 2v12h8V5H9V2zM5 7h6v2H5zM5 10h6v2H5z"/>',
    review: '<path d="M3 0h5v1h1v1h1v1h1v5h-1v1H9v1H8v1H3v-1H2V9H1V8H0V3h1V2h1V1h1zM4 2v1H3v1H2v3h1v1h1v1h3V8h1V7h1V4H8V3H7V2zM10 10h2v1h1v1h1v1h1v1h1v2h-2v-1h-1v-1h-1v-1h-1v-1h-1z"/>',
  };
  const lifeIcon = (k) => `<svg viewBox="0 0 16 16" fill-rule="evenodd" aria-hidden="true">${ICONS[k]}</svg>`;

  /* Three square arcade buttons; what each does is in the tooltip and, for screen readers, in a
     visually hidden description (the tour explains them in full). */
  function lifelinesHtml() {
    const L = GAME_TEXT.lifelines || {};
    return `<ul class="wr-life-row">${LIVES.map((k) => {
      const used = !!state.used[k];
      const name = (L[k] && L[k].name) || k;
      const blurb = (L[k] && L[k].blurb) || '';
      const tip = used ? `${name}: ${t('used')}` : `${name}: ${blurb.replace(/\*\*|`/g, '')}`;
      return `<li><button type="button" class="wr-life${used ? ' is-used' : ''}" data-action="game-lifeline" data-life="${k}" data-fid="game-life-${k}"${used || busy ? ' disabled' : ''} title="${esc(tip)}" aria-describedby="wr-life-d-${k}">
          <span class="wr-life-icon">${lifeIcon(k)}</span>
          <span class="wr-life-name">${esc(name)}</span>
        </button><span class="sr-only" id="wr-life-d-${k}">${esc(used ? t('used') : blurb.replace(/\*\*|`/g, ''))}</span></li>`;
    }).join('')}</ul>`;
  }

  /* The lifelines this question has an output for, oldest first. */
  function trayItems() {
    const id = currentId();
    const out = [];
    if (state.shown && state.shown.clause === id) out.push('clause');
    if (state.shown && state.shown.template === id) out.push('template');
    if (review && review.id === id && review.items) out.push('review');
    return out;
  }

  /* The lifeline tray under the console: the most recent output, with small tabs for the others. */
  function lifeOutHtml() {
    const id = currentId();
    const L = GAME_TEXT.lifelines || {};
    const name = (k) => (L[k] && L[k].name) || k;
    const items = trayItems();
    const note = lifeMsg && lifeMsg.id === id ? `<div class="wr-msg is-warn"><p>${esc(t(lifeMsg.k))}</p></div>` : '';
    if (!items.length) return note;
    const k = items.includes(trayLife) ? trayLife : items[items.length - 1];
    const tabs = items.length > 1
      ? `<div class="wr-tray-tabs" role="group" aria-label="${esc(t('Lifeline outputs'))}">${items.map((x) => `<button type="button" class="wr-tray-tab" data-action="game-tray" data-life="${x}" data-fid="game-tray-${x}" aria-pressed="${x === k}">${lifeIcon(x)}${esc(name(x))}</button>`).join('')}</div>`
      : '';
    let body = '';
    if (k === 'clause') {
      body = `<div class="wr-life-body">${paras(qText(id).clause)}</div>
        <p class="wr-shape" id="wr-shape" data-q="${esc(id)}"></p>`;
    } else if (k === 'template') {
      const q = question(id);
      body = `<p class="wr-life-body">${md(qText(id).templateNote || '')}</p>
        <div class="wr-tpl"><pre class="wr-code"><code>${esc(q ? q.template : '')}</code></pre>
        <button type="button" class="wr-btn is-small" data-action="game-insert-template" data-fid="game-insert-template">${esc(t('Insert template'))}</button></div>`;
    } else {
      body = `<ul class="wr-review">${review.items.map((d) => `<li class="${d.code === 'match' ? 'is-ok' : ''}">${md(diagText(d, review.checks))}</li>`).join('')}</ul>`;
    }
    const head = items.length > 1 ? '' : `<p class="wr-out-h"><span class="wr-life-mini">${lifeIcon(k)}</span>${esc(name(k))}</p>`;
    return `${note}<div class="wr-life-card is-${k}">${tabs}${head}${body}</div>`;
  }

  // Why a DML or DDL answer failed on a constraint (Review, §13.2).
  const CONSTRAINT_MSG = {
    'ORA-00001': 'ORA-00001: a row with that key already exists (primary key or unique).',
    'ORA-01400': 'ORA-01400: a NOT NULL column got no value.',
    'ORA-02290': 'ORA-02290: a value breaks a CHECK constraint.',
    'ORA-02291': 'ORA-02291: the foreign key points to a row that does not exist.',
    'ORA-02292': 'ORA-02292: other rows still point to the row you delete or change.',
  };

  /* GameCore.diagnose codes as sentences (they never reveal values of the answer). */
  function diagText(d, checks) {
    switch (d.code) {
      case 'limit': return t('You used `LIMIT`, which Oracle does not have. Use `FETCH FIRST n ROWS ONLY`.');
      case 'unknown-name': {
        const name = String(d.name || '').toLowerCase();
        if (d.tables && d.tables.length) return t('`{name}` is a column of {tables}: is that table in your `FROM`?', { name, tables: d.tables.map((x) => `\`${x}\``).join(', ') });
        if (d.quoted) return t('`"{name}"` is read as a column name: in Oracle, double quotes are for names. Write text values in single quotes, such as `\'Puzzle\'`.', { name: String(d.name || '') });
        if (d.suggest) return t('`{name}` is not in this database. Did you mean `{suggest}`?', { name, suggest: d.suggest });
        return name ? t('`{name}` is not in this database. Check the names in the schema.', { name })
          : t('A table or column name is not in this database. Check the names in the schema.');
      }
      case 'group-by': return d.column && d.column !== '*'
        ? t('`{column}` is selected but not in `GROUP BY`. Group it, or put it inside an aggregate such as `COUNT` or `SUM`.', { column: String(d.column).toLowerCase() })
        : t('A column you select is not in `GROUP BY`. Group it, or put it inside an aggregate such as `COUNT` or `SUM`.');
      case 'error': return d.text || d.ora
        ? t('The query failed with {error}. Run it to see the whole message.', { error: [d.ora, d.text].filter(Boolean).join(': ') })
        : t('The query failed. Run it to see the error.');
      case 'cols': return t('Column count: yours {got}, the answer {want}.', { got: d.got, want: d.want });
      case 'rows': return t('Row count: yours {got}, the answer {want}.', { got: d.got, want: d.want });
      case 'order': return t('The rows are right but in the wrong order. Check `ORDER BY` and its direction.');
      case 'values': return t('The shape is right, but some values differ. Check your filters and calculations.');
      case 'match': return t('Your last query gives the right answer. Lock it in.');
      case 'table': return t('`{table}` ends with {got} rows; the answer leaves {want}.', { table: String(d.table || '').toLowerCase(), got: d.got, want: d.want });
      case 'table-values': return t('`{table}` has the right rows, but some values differ.', { table: String(d.table || '').toLowerCase() });
      case 'constraint': return t(CONSTRAINT_MSG[d.ora] || 'A constraint refused your statement ({ora}).', { ora: d.ora || '' });
      case 'probe': {
        const probe = (checks || [])[d.index];
        if (!probe) return d.expectError ? t('Your structure accepts something it should refuse.') : t('Your structure behaves differently from the answer.');
        return d.expectError ? t('This should fail, but your structure accepts it: `{sql}`', { sql: probe }) : t('This gives another result with your structure: `{sql}`', { sql: probe });
      }
      default: return String(d.code || '');
    }
  }

  /* Runs SQL on a fresh copy of the shop; a query Oracle would reject for its GROUP BY (SQLite accepts it)
     comes back as that ORA error, so Run, Lock in and Review agree with Oracle. */
  async function runSql(sql) {
    const res = await SqlRunner.execute(GAME_BANK.setup, sql);
    if (res && !res.error) {
      const ora = GameCore.oracleCheck(sql);
      if (ora) return { error: { code: ora.code, text: ora.text, column: ora.column || null }, raw: null };
    }
    return res;
  }

  /* ---- Console --------------------------------------------------------------------------- */

  // Ready SQL for the console; the SQL stays in English (the schema is English in both languages).
  const SNIPPETS = [
    { v: 'customers', label: () => 'customers', code: true, sql: () => 'SELECT *\nFROM customers\nFETCH FIRST 5 ROWS ONLY;' },
    { v: 'games', label: () => 'games', code: true, sql: () => 'SELECT *\nFROM games\nFETCH FIRST 5 ROWS ONLY;' },
    { v: 'sales', label: () => 'sales', code: true, sql: () => 'SELECT *\nFROM sales\nFETCH FIRST 5 ROWS ONLY;' },
    { v: 'count', label: () => t('Count rows'), sql: () => 'SELECT COUNT(*)\nFROM <table>;' },
    { v: 'join', label: () => t('Join two tables'), sql: () => 'SELECT <columns>\nFROM sales s\nJOIN games g ON g.game_id = s.game_id;' },
  ];

  function snippetsHtml() {
    return `<div class="wr-snips" role="group" aria-label="${esc(t('Quick queries'))}">
        ${SNIPPETS.map((s) => `<button type="button" class="wr-chip${s.code ? ' is-table' : ''}" data-action="game-snippet" data-snip="${s.v}" data-value="${s.v}" data-fid="game-snippet-${s.v}">${esc(s.label())}</button>`).join('')}
      </div>`;
  }

  const RUN_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h2v2h2v2h2v2h-2v2H6v2H4z"/></svg>';
  const LOCK_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h2v2h2v2h2v2H6v2H4v2H2zM9 3h2v2h2v2h2v2h-2v2h-2v2H9z"/></svg>';

  function consoleHtml() {
    return `<section class="wr-console" aria-label="${esc(t('Your query'))}">
        ${snippetsHtml()}
        <div class="wr-crt">
          <span class="wr-prompt" aria-hidden="true">SQL&gt;</span>
          <label class="sr-only" for="wr-sql">${esc(t('Your SQL query'))}</label>
          <textarea id="wr-sql" class="wr-sql" data-fid="wr-sql" rows="5" spellcheck="false" autocomplete="off" autocapitalize="off">${esc(consoleText)}</textarea>
        </div>
        <div class="wr-console-actions">
          <button type="button" class="wr-btn is-run" data-action="game-run" data-fid="game-run" aria-keyshortcuts="Control+Enter"${busy ? ' disabled' : ''}>${RUN_ICON}${esc(t('Run'))}<kbd class="wr-kbd" aria-hidden="true">Ctrl+Enter</kbd></button>
          <button type="button" class="wr-btn is-primary is-lock" data-action="game-lock" data-fid="game-lock"${busy ? ' disabled' : ''}>${esc(t('Lock in'))}${LOCK_ICON}</button>
        </div>
        <div class="wr-life-out" id="wr-life-out">${lifeOutHtml()}</div>
        <div class="wr-out" id="wr-out" data-v="${outVersion}">${output}</div>
      </section>`;
  }

  /* The three tables: every name is a button that types itself into the console at the cursor. */
  function schemaHtml() {
    const tables = Object.keys(GAME_BANK.schema);
    const pk = Object.fromEntries(tables.map((n) => [n, GAME_BANK.schema[n][0]]));
    const fkOf = (n, c) => tables.find((o) => o !== n && pk[o] === c);
    const block = (n) => `<li class="wr-tbl">
        <button type="button" class="wr-tbl-h" data-action="game-name" data-name="${esc(n)}" data-fid="game-name-${esc(n)}" title="${esc(t('Insert {name}', { name: n }))}"><code>${esc(n)}</code></button>
        <ul class="wr-cols">${GAME_BANK.schema[n].map((c, i) => {
          const fk = fkOf(n, c);
          const type = ((GAME_BANK.types || {})[n] || [])[i] || '';
          const key = c === pk[n] ? `<abbr class="wr-key is-pk" title="${esc(t('primary key'))}">PK</abbr>`
            : fk ? `<abbr class="wr-key is-fk" title="${esc(t('foreign key to {table}', { table: fk }))}">FK</abbr>` : '';
          return `<li><button type="button" class="wr-col" data-action="game-name" data-name="${esc(c)}" data-fid="game-name-${esc(n)}-${esc(c)}" title="${esc(`${c} ${type}`)}"><code>${esc(c)}</code>${key}<span class="sr-only"> ${esc(type)}</span></button></li>`;
        }).join('')}</ul>
      </li>`;
    return `<ul class="wr-tables">${tables.map(block).join('')}</ul>`;
  }

  /* Types a table or column name into the console at the cursor (at the end if the console was not used yet). */
  function insertName(name) {
    const ed = document.getElementById('wr-sql');
    if (!ed || !name) return;
    const touched = ed.dataset.touched === '1';
    const a = touched ? ed.selectionStart : ed.value.length;
    const b = touched ? ed.selectionEnd : ed.value.length;
    const before = ed.value.slice(0, a);
    const after = ed.value.slice(b);
    const pre = /[\w)*]$/.test(before) ? ' ' : '';
    const post = /^[\w(]/.test(after) ? ' ' : '';
    ed.setRangeText(`${pre}${name}${post}`, a, b, 'end');
    ed.dataset.touched = '1';
    consoleText = ed.value;
    saveDraft();
    ed.focus({ preventScroll: true });
    announce(t('{name} typed in the console.', { name }));
  }

  /* ---- The ladder ------------------------------------------------------------------------ */

  const CHECK = '<svg viewBox="0 0 9 8" aria-hidden="true"><path d="M0 3h2v1h1v1h1V4h1V3h1V2h1V1h1V0h1v3H8v1H7v1H6v1H5v1H4v1H3V7H2V6H1V5H0z"/></svg>';
  const ARROW = '<svg viewBox="0 0 6 10" aria-hidden="true"><path d="M0 0h2v1h1v1h1v1h1v1h1v2H5v1H4v1H3v1H2v1H0z"/></svg>';
  const CROSS = '<svg viewBox="0 0 8 8" aria-hidden="true"><path d="M0 0h2v1h1v1h2V1h1V0h2v2H7v1H6v2h1v1h1v2H6V7H5V6H3v1H2v1H0V6h1V5h1V3H1V2H0z"/></svg>';


  function ladderHtml() {
    const n = GameCore.LADDER.length;
    const done = answered();
    const lost = state && state.status === 'lost';
    const rungs = [];
    for (let lvl = n; lvl >= 1; lvl--) {
      const safe = GameCore.SAFE.includes(lvl);
      const cur = playing() && lvl === state.level;
      const isDone = lvl <= done;
      const missed = lost && lvl === state.level;
      const cls = ['wr-rung', cur ? 'is-current' : '', isDone ? 'is-done' : '', safe ? 'is-safe' : '', lvl === n ? 'is-top' : '', missed ? 'is-missed' : '',
        flash && flash.level === lvl ? flash.cls : ''].filter(Boolean).join(' ');
      const status = [cur ? t('current question') : isDone ? t('answered') : missed ? t('missed') : '', safe ? t('safe') : ''].filter(Boolean).join(', ');
      rungs.push(`<li class="${cls}" data-level="${lvl}"${cur ? ' aria-current="step"' : ''}>
          <span class="wr-rung-mark" aria-hidden="true">${cur ? ARROW : isDone ? CHECK : missed ? CROSS : ''}</span>
          <span class="wr-rung-n">${lvl}</span>
          <span class="wr-rung-p">${esc(money(GameCore.LADDER[lvl - 1]))}</span>
          ${status ? `<span class="sr-only">(${esc(status)})</span>` : ''}
        </li>`);
    }
    // Walk away appears once there is something to take (from rung 2).
    const walk = playing() && state.level > 1
      ? `<button type="button" class="wr-btn is-walk" data-action="game-walk" data-fid="game-walk"${locked() ? ' disabled' : ''}>${esc(t('Walk away with {prize}', { prize: money(GameCore.prize(state.level - 1)) }))}</button>`
      : '';
    const best = side === 'study' ? data.best[mode] : null;
    const hasBest = best && Number.isFinite(best.prize) && best.prize > 0;
    return `<div class="wr-ladder-top">
        <p class="wr-ladder-sum">${esc(summaryText())}</p>
        <button type="button" class="wr-ladder-toggle" data-action="game-ladder" data-fid="game-ladder" aria-expanded="${ladderOpen}" aria-controls="wr-ladder">${esc(ladderOpen ? t('Hide prizes') : t('Show prizes'))}</button>
      </div>
      <ol class="wr-ladder" id="wr-ladder" reversed>${rungs.join('')}</ol>
      ${walk ? `<div class="wr-walk">${walk}</div>` : ''}
      ${hasBest ? `<p class="wr-best">${esc(t('Best {prize}', { prize: money(best.prize) }))}</p>` : ''}`;
  }

  /* Phones: one line for the folded ladder ("Rung 7: 10,000 €. Safe: 2,500 €"). */
  function summaryText() {
    if (!playing()) return t('Final prize: {prize}', { prize: money(state.prize) });
    const safe = GameCore.safePrize(state.level - 1);
    return t('Rung {n}: {prize}. Safe: {safe}', { n: state.level, prize: money(GameCore.prize(state.level)), safe: money(safe) });
  }

  /* ---- The end screen -------------------------------------------------------------------- */

  function endHtml() {
    if (isComp()) return state.status === 'won' ? certHtml() : compEndHtml();
    const E = GAME_TEXT.end || {};
    const status = state.status;
    const prize = money(state.prize);
    const info = endInfo || { best: data.best[mode], newBest: false };
    const heading = String(E[status] || status);
    // A lost run says why the prize is what it is (the safe rung); a win or a walk needs no words.
    const lead = status !== 'lost' ? ''
      : state.prize ? t('You missed question {n}. You keep {prize}, the prize of your last safe rung.', { n: state.level, prize })
          : t('You missed question {n} before reaching a safe rung, so you leave with nothing this time.', { n: state.level });
    const items = state.answers.map((a, i) => {
      const q = question(a.id);
      const tx = qText(a.id);
      const lvl = state.ids.indexOf(a.id) + 1;
      return `<li class="wr-rev ${a.ok ? 'is-ok' : 'is-miss'}">
          <header class="wr-rev-h"><span class="wr-rev-n">${lvl}</span><span class="wr-rev-p">${esc(money(GameCore.prize(lvl)))}</span>
            <span class="wr-rev-v">${a.ok ? `${CHECK}${esc(t('Right'))}` : `${CROSS}${esc(t('Wrong'))}`}</span></header>
          <div class="wr-rev-q">${paras(tx.prompt)}</div>
          <div class="wr-rev-sql">
            <div><p class="wr-rev-k">${esc(t('Your SQL'))}</p><pre class="wr-code is-small"><code>${esc(a.sql || '')}</code></pre></div>
            <div><p class="wr-rev-k">${esc(t('Reference solution'))}</p><pre class="wr-code is-small"><code>${esc(q ? q.solution : '')}</code></pre></div>
          </div>
          <div class="wr-rev-x">${paras(tx.explain)}</div>
        </li>`;
    });
    // Each answer is one card; a rescued miss and the retry on the same rung both appear.
    const best = info.best && Number.isFinite(info.best.prize) ? info.best : null;
    return `<section class="wr-end" id="wr-end" data-status="${status}" aria-labelledby="wr-end-h">
        <div class="wr-end-plate">
          <p class="wr-end-k">${esc(status === 'won' ? t('You take home') : status === 'walked' ? t('You walk away with') : t('You leave with'))}</p>
          <p class="wr-end-prize" id="wr-end-prize">${esc(prize)}</p>
        </div>
        <div class="wr-card wr-end-card">
          <h2 id="wr-end-h" class="wr-end-title" tabindex="-1">${esc(heading)}</h2>
          ${lead ? `<div class="wr-end-lead">${paras(lead)}</div>` : ''}
          <p class="wr-end-best">${info.newBest ? `<span class="wr-new">${esc(t('New best'))}</span>` : ''}${best ? `<span>${esc(E.best || '')}: <b>${esc(money(best.prize))}</b></span>` : ''}</p>
          <p class="wr-end-actions"><button type="button" class="wr-btn is-primary" data-action="game-again" data-fid="game-again">${esc(E.again || '')}</button>
            <a class="wr-btn" href="#/game" data-fid="game-choose">${esc(t('Choose another mode'))}</a></p>
        </div>
        ${items.length ? `<section class="wr-end-review" aria-labelledby="wr-rev-h">
          <h2 id="wr-rev-h" class="wr-h2">${esc(E.review || '')}</h2>
          <ol class="wr-rev-list">${items.join('')}</ol>
        </section>` : ''}
      </section>`;
  }

  /* ---- Dialogs --------------------------------------------------------------------------- */

  function dialogHtml() {
    if (!dialog) return '';
    const head = (title) => `<header class="wr-modal-h"><span class="wr-host-name">${BOT}SQL-Bot</span><h2 id="wr-modal-h">${esc(title)}</h2></header>`;
    if (dialog.kind === 'rescue') {
      return `<div class="wr-scrim">
          <div class="wr-modal is-rescue" id="wr-rescue" role="dialog" aria-modal="true" aria-labelledby="wr-modal-h" aria-describedby="wr-modal-d">
            ${head(t('That is not the answer'))}
            <div class="wr-modal-b" id="wr-modal-d">
              ${paras(H().rescue || t('You still have Review. Use it to see what went wrong and try this question again.'))}
              <p class="wr-modal-note">${esc(t('If you end the game now, you leave with {prize}.', { prize: money(GameCore.safePrize(state.level - 1)) }))}</p>
            </div>
            <div class="wr-modal-a">
              <button type="button" class="wr-btn is-primary" data-action="game-rescue-yes" data-fid="game-rescue-yes">${esc(t('Use Review and try again'))}</button>
              <button type="button" class="wr-btn" data-action="game-rescue-no" data-fid="game-rescue-no">${esc(t('End the game'))}</button>
            </div>
          </div>
        </div>`;
    }
    if (dialog.kind === 'walk') {
      const prize = money(GameCore.prize(state.level - 1));
      return `<div class="wr-scrim">
          <div class="wr-modal" id="wr-confirm" data-kind="walk" role="dialog" aria-modal="true" aria-labelledby="wr-modal-h" aria-describedby="wr-modal-d">
            ${head(t('Walk away with {prize}?', { prize }))}
            <div class="wr-modal-b" id="wr-modal-d"><p>${esc(t('The game ends here and you keep {prize}. You will not see question {n}.', { prize, n: state.level }))}</p></div>
            <div class="wr-modal-a">
              <button type="button" class="wr-btn is-primary" data-action="game-confirm-yes" data-fid="game-confirm-yes">${esc(t('Walk away'))}</button>
              <button type="button" class="wr-btn" data-action="game-confirm-no" data-fid="game-confirm-no">${esc(t('Keep playing'))}</button>
            </div>
          </div>
        </div>`;
    }
    const safe = GameCore.safePrize(state.level - 1);
    const risk = !state.used.review ? t('If it is wrong, you can still use Review to try again.')
      : t('If it is wrong, the game ends and you leave with {prize}.', { prize: money(safe) });
    return `<div class="wr-scrim">
        <div class="wr-modal" id="wr-confirm" data-kind="lock" role="dialog" aria-modal="true" aria-labelledby="wr-modal-h" aria-describedby="wr-modal-d">
          ${head(H().lock || t('Lock it in?'))}
          <div class="wr-modal-b" id="wr-modal-d">
            <p>${esc(t('Your answer for {prize}:', { prize: money(GameCore.prize(state.level)) }))}</p>
            <pre class="wr-code is-small"><code>${esc(dialog.sql)}</code></pre>
            <p class="wr-modal-note">${esc(risk)}</p>
          </div>
          <div class="wr-modal-a">
            <button type="button" class="wr-btn is-primary" data-action="game-confirm-yes" data-fid="game-confirm-yes">${esc(t('Lock it in'))}</button>
            <button type="button" class="wr-btn" data-action="game-confirm-no" data-fid="game-confirm-no">${esc(t('Not yet'))}</button>
          </div>
        </div>
      </div>`;
  }

  const modalEl = () => document.querySelector('#view .wr-modal');

  function openDialog(d) {
    dialog = d;
    const box = document.getElementById('wr-dialogs');
    if (!box) return;
    box.innerHTML = dialogHtml();
    setInert(true);
    syncTools();
    const first = d.kind === 'walk' ? '[data-fid="game-confirm-no"]' : '.wr-modal .is-primary';
    const el = box.querySelector(first);
    if (el) el.focus();
  }

  function closeDialog(focusBack = true) {
    const d = dialog;
    dialog = null;
    const box = document.getElementById('wr-dialogs');
    if (box) box.innerHTML = '';
    setInert(false);
    syncTools();
    if (focusBack && d && d.back) {
      const el = document.querySelector(`#view [data-fid="${d.back}"]`);
      if (el && !el.disabled) el.focus({ preventScroll: true });
      else { const h = document.getElementById('wr-h'); if (h) h.focus({ preventScroll: true }); }
    }
  }

  function setInert(on) {
    document.querySelectorAll('#view .wr-hud, #view .wr-grid').forEach((el) => {
      if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    });
  }

  /* Tab stays inside the dialog. */
  function trapFocus(e) {
    const m = modalEl();
    if (!m) return;
    const items = [...m.querySelectorAll('button:not([disabled]), [href], textarea, input, [tabindex]:not([tabindex="-1"])')];
    if (!items.length) return;
    const first = items[0];
    const lastEl = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); } else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); } else if (!m.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }

  /* ---- Refreshing parts of the page ----------------------------------------------------- */

  function refresh() {
    if (!onPage()) return;
    const main = document.getElementById('wr-main');
    const wasPlaying = !!document.getElementById('wr-question');
    let parts;
    try {
      parts = {
        ladder: ladderHtml(),
        host: hostHtml(),
        main: playing() && wasPlaying ? null : mainHtml(),
        question: playing() && wasPlaying ? questionHtml() : null,
        life: playing() ? lifelinesHtml() : '',
        tray: playing() && wasPlaying ? lifeOutHtml() : null,
      };
    } catch (e) { showBroken(e); return; }
    keepFocus(() => {
      $('#wr-ladder-card').innerHTML = parts.ladder;
      $('#wr-ladder-card').classList.toggle('is-open', ladderOpen);
      const host = $('#wr-host');
      if (host.dataset.text !== hostText) { host.innerHTML = parts.host; host.dataset.text = hostText; }
      const lives = $('#wr-lifelines');
      lives.innerHTML = parts.life;
      lives.hidden = !playing();
      if (parts.main !== null) main.innerHTML = parts.main;
      else {
        $('#wr-question').innerHTML = parts.question;
        $('#wr-life-out').innerHTML = parts.tray;
        const out = $('#wr-out');
        if (out && out.dataset.v !== String(outVersion)) { out.innerHTML = output; out.dataset.v = String(outVersion); }
        document.querySelectorAll('#view [data-fid="game-run"], #view [data-fid="game-lock"]').forEach((b) => { b.disabled = busy; });
      }
    });
    flash = null;                                    // a rung flashes once, not again on the next refresh
    syncTools();
    bindEditor();
    afterChange();
  }

  /* The console remembers that the student placed the cursor (schema names go there, else at the end). */
  function bindEditor() {
    const ed = document.getElementById('wr-sql');
    if (!ed || ed.dataset.bound) return;
    ed.dataset.bound = '1';
    ed.addEventListener('focus', () => { ed.dataset.touched = '1'; });
    // Competitive: paste and drop are off in the editor; each try is counted (§14.2). Snippets, schema names
    // and Insert template still type text.
    if (isComp()) {
      const block = (e) => { e.preventDefault(); guard(pasteBlocked); };
      ed.addEventListener('paste', block);
      ed.addEventListener('drop', block);
      ed.addEventListener('beforeinput', (e) => { if (/^insertFrom(Paste|Drop)/.test(e.inputType || '')) block(e); });
    }
  }

  /* After the page or a part of it changed: type a new prompt, fill the answer's shape. */
  function afterChange() {
    if (!onPage()) return;
    const id = currentId();
    if (playing() && id !== promptShown) { promptShown = id; typePrompt(); }
    const shape = document.getElementById('wr-shape');
    if (shape) fillShape(shape);
  }

  /* The Key clause line under the hint: "The answer has n columns and m rows." */
  function fillShape(el) {
    const id = el.dataset.q;
    const k = qMode(question(id));
    if (isComp()) { compShape(el); return; }       // the server measured it
    reference(id).then((r) => {
      if (!el.isConnected) return;
      if (r.error || k === 'ddl') { el.textContent = ''; return; }
      if (k !== 'select') {
        // DML: how many rows the answer changes (a count, never which ones).
        const n = Number(r.changes) || 0;
        const key = { insert: ['The answer inserts 1 row.', 'The answer inserts {n} rows.'], update: ['The answer updates 1 row.', 'The answer updates {n} rows.'], delete: ['The answer deletes 1 row.', 'The answer deletes {n} rows.'] }[k];
        el.textContent = key ? t(key[n === 1 ? 0 : 1], { n }) : '';
        return;
      }
      el.textContent = t('The answer has {cols} and {rows}.', {
        cols: r.cols.length === 1 ? t('1 column') : t('{n} columns', { n: r.cols.length }),
        rows: r.rows.length === 1 ? t('1 row') : t('{n} rows', { n: r.rows.length }),
      });
    }, () => { if (el.isConnected) el.textContent = ''; });
  }

  /* The reference solution's result, run once per question. */
  function reference(id) {
    if (!refs.has(id)) {
      const q = question(id);
      const sol = q ? q.solution : 'SELECT 1 FROM dual';
      const p = qMode(q) === 'select' ? SqlRunner.execute(GAME_BANK.setup, sol) : SqlRunner.executeChecks(GAME_BANK.setup, sol, checksOf(q));
      refs.set(id, p);
      p.then((r) => { if (r && r.error) refs.delete(id); }, () => refs.delete(id));
    }
    return refs.get(id);
  }

  /* Prompt typewriter: text nodes are filled in again, a few characters per frame (~1.2 s). */
  function typePrompt() {
    if (typer) { typer.finish(); typer = null; }
    const el = document.getElementById('wr-prompt');
    if (!el || reduceMotion) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      // The elements around a text node (<p>, <code>, <strong>) stay hidden until it starts typing.
      const wrap = [];
      for (let a = node.parentElement; a && a !== el; a = a.parentElement) wrap.push(a);
      nodes.push([node, node.textContent, wrap]);
      node.textContent = '';
    }
    nodes.forEach(([, , wrap]) => wrap.forEach((a) => { a.hidden = true; }));
    const total = nodes.reduce((a, [, s]) => a + s.length, 0);
    const caret = document.createElement('span');
    caret.className = 'wr-caret';
    caret.setAttribute('aria-hidden', 'true');
    el.setAttribute('aria-busy', 'true');
    const rate = Math.max(total / 1200, 0.2);       // characters per millisecond
    const t0 = performance.now();
    let raf = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      nodes.forEach(([n, s, wrap]) => { n.textContent = s; wrap.forEach((a) => { a.hidden = false; }); });
      caret.remove();
      el.removeAttribute('aria-busy');
    };
    const step = (now) => {
      if (done) return;
      if (!el.isConnected) { finish(); return; }
      let left = Math.floor((now - t0) * rate);
      for (const [n, s, wrap] of nodes) {
        const k = Math.min(s.length, Math.max(0, left));
        n.textContent = s.slice(0, k);
        if (k > 0) wrap.forEach((a) => { a.hidden = false; });
        left -= s.length;
        if (k < s.length) { if (n.parentNode) n.parentNode.insertBefore(caret, n.nextSibling); break; }
      }
      if (left >= 0) { finish(); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    typer = { finish };
  }

  function say(text) {
    hostText = text;
    const el = document.getElementById('wr-host');
    if (el && onPage()) { el.innerHTML = hostHtml(); el.dataset.text = hostText; }
  }

  function setBusy(v) {
    busy = v;
    if (!onPage()) return;
    document.querySelectorAll('#view .wr-game button[data-action="game-run"], #view .wr-game button[data-action="game-lock"], #view .wr-game button[data-action="game-walk"]').forEach((b) => { b.disabled = v; });
    document.querySelectorAll('#view .wr-life').forEach((b) => { b.disabled = v || b.classList.contains('is-used'); });
    syncTools();
  }

  /* How to play, EN|ES and Light|Dark wait while a lock-in is judged or a dialog is open: the tour or a
     reload would otherwise break the dialog's focus trap or leave in the middle of a verdict. */
  function syncTools() {
    document.querySelectorAll(TOOL_SEL).forEach((b) => { b.disabled = locked(); });
  }

  /* ---- Run ------------------------------------------------------------------------------- */

  const editorText = () => {
    const ed = document.getElementById('wr-sql');
    if (ed) consoleText = ed.value;
    return consoleText;
  };

  function lintHtml(sql) {
    const lint = OracleDialect.lint(sql);
    if (!lint.length) return '';
    return `<div class="wr-msg is-warn">${lint.map((l) => `<p>${esc(t(l.msg))} ${esc(l.fix ? t(l.fix) : '')}</p>`).join('')}</div>`;
  }

  const isQueryText = (sql) => {
    const units = OracleDialect.script(sql).filter((u) => !u.silent);
    const u = units[units.length - 1];
    return !u || /^\s*(SELECT|WITH|\()/i.test(String(u.text || '').replace(/^\s*(--[^\n]*\n\s*)*/, ''));
  };

  /* The result of a run: a table, "no rows selected", a done line, or the ORA error. */
  function resultHtml(res, sql) {
    if (res.error) {
      const e = res.error;
      return `<div class="wr-msg is-err"><p><code>${esc(e.code ? `${e.code}: ${e.text}` : e.text)}</code></p></div>`;
    }
    if (res.cols && res.cols.length) {
      const n = res.rows.length;
      if (!n) return `<p class="wr-done-msg">${esc(t('no rows selected'))}</p>`;
      return SqlRunner.tableHtml(res.cols.map((c) => String(c).toUpperCase()), res.rows);
    }
    if (isQueryText(sql)) return `<p class="wr-done-msg">${esc(t('no rows selected'))}</p>`;
    return `<p class="wr-done-msg">${esc(t('Done. The database resets on every run.'))}</p>`;
  }

  /* ---- Run: DML diff and DDL view (§13.5) -------------------------------------------------------- */

  const TABLES = () => Object.keys(GAME_BANK.schema);
  const snapSql = (tb) => `SELECT * FROM ${tb} ORDER BY ${GAME_BANK.schema[tb][0]}`;

  /* The verbs of the statements in a text, upper case (comments and strings ignored). */
  function verbsOf(sql) {
    let units = [];
    try { units = OracleDialect.script(sql); } catch (e) { units = []; }
    return units.filter((u) => !u.silent).map((u) => {
      const bare = String(u.text || '').replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, ' ').trim().replace(/^\(+\s*/, '');
      return ((/^[A-Za-z]+/.exec(bare) || [''])[0]).toUpperCase();
    });
  }
  const DML = ['INSERT', 'UPDATE', 'DELETE', 'MERGE'];
  const DDL = ['CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'RENAME', 'COMMENT'];

  /* The three tables as the setup leaves them (one snapshot, kept). */
  function baseSnap() {
    if (!baseline) {
      baseline = Promise.all(TABLES().map((tb) => SqlRunner.execute(GAME_BANK.setup, snapSql(tb))));
      baseline.catch(() => { baseline = null; });
    }
    return baseline;
  }

  const cellText = (v) => (v === null || v === undefined ? 'NULL' : String(v));
  const cellHtml = (v) => (v === null || v === undefined ? '<span class="nul">NULL</span>' : esc(v));

  /* One table: the rows the text added, changed or deleted, against the setup; unchanged rows are counted. */
  function diffTable(tb, before, after) {
    const cols = (after.cols && after.cols.length ? after.cols : before.cols) || [];
    const key = (r) => cellText(r[0]);
    const was = new Map((before.rows || []).map((r) => [key(r), r]));
    const now = new Map((after.rows || []).map((r) => [key(r), r]));
    const rows = [];
    let same = 0;
    const counts = { add: 0, chg: 0, del: 0 };
    const keys = [...new Set([...was.keys(), ...now.keys()])];
    const num = keys.every((k) => k !== 'NULL' && !Number.isNaN(Number(k)));
    keys.sort((a, b) => (num ? Number(a) - Number(b) : a.localeCompare(b)));
    for (const k of keys) {
      const a = was.get(k);
      const b = now.get(k);
      if (a && !b) { counts.del++; rows.push(`<tr class="is-del">${a.map((v) => `<td>${cellHtml(v)}</td>`).join('')}</tr>`); continue; }
      if (!a && b) { counts.add++; rows.push(`<tr class="is-add">${b.map((v) => `<td>${cellHtml(v)}</td>`).join('')}</tr>`); continue; }
      const diff = b.map((v, i) => cellText(v) !== cellText(a[i]));
      if (!diff.some(Boolean)) { same++; continue; }
      counts.chg++;
      rows.push(`<tr class="is-chg">${b.map((v, i) => (diff[i]
        ? `<td class="is-cell" title="${esc(t('was {value}', { value: cellText(a[i]) }))}"><mark>${cellHtml(v)}</mark></td>`
        : `<td>${cellHtml(v)}</td>`)).join('')}</tr>`);
    }
    if (!rows.length) return { counts, html: '' };
    const tags = [
      counts.add ? `<span class="wr-dtag is-add">${esc(t(counts.add === 1 ? '+1 added' : '+{n} added', { n: counts.add }))}</span>` : '',
      counts.chg ? `<span class="wr-dtag is-chg">${esc(t(counts.chg === 1 ? '1 changed' : '{n} changed', { n: counts.chg }))}</span>` : '',
      counts.del ? `<span class="wr-dtag is-del">${esc(t(counts.del === 1 ? '1 deleted' : '{n} deleted', { n: counts.del }))}</span>` : '',
    ].join('');
    return {
      counts,
      html: `<div class="wr-diff">
        <p class="wr-diff-h"><code>${esc(tb)}</code>${tags}</p>
        <div class="scroll"><table class="src sql-table wr-diff-t"><thead><tr>${cols.map((c) => `<th scope="col">${esc(String(c).toUpperCase())}</th>`).join('')}</tr></thead>
        <tbody>${rows.join('')}</tbody></table></div>
        ${same ? `<p class="wr-diff-same">${esc(same === 1 ? t('1 unchanged row hidden') : t('{n} unchanged rows hidden', { n: same }))}</p>` : ''}
      </div>`,
    };
  }

  /* A DML Run: the text runs on a fresh copy, then each table is compared with the setup. */
  async function runDml(sql, verbs) {
    const [before, ...after] = await Promise.all([baseSnap(), ...TABLES().map((tb) => SqlRunner.execute(GAME_BANK.setup, sql, snapSql(tb)))]);
    const err = after.find((r) => r.error);
    if (err) return { res: err, html: resultHtml(err, sql) };
    const parts = TABLES().map((tb, i) => diffTable(tb, before[i], after[i]));
    const sum = parts.reduce((a, p) => ({ add: a.add + p.counts.add, chg: a.chg + p.counts.chg, del: a.del + p.counts.del }), { add: 0, chg: 0, del: 0 });
    const kinds = [...new Set(verbs.filter((v) => DML.includes(v)))];
    const one = (n, a, b) => (n === 1 ? t(a) : t(b, { n }));
    const head = kinds.length !== 1 ? one(sum.add + sum.chg + sum.del, '1 row changed', '{n} rows changed')
      : kinds[0] === 'INSERT' ? one(sum.add, '1 row inserted', '{n} rows inserted')
        : kinds[0] === 'UPDATE' ? one(sum.chg, '1 row updated', '{n} rows updated')
          : kinds[0] === 'DELETE' ? one(sum.del, '1 row deleted', '{n} rows deleted')
            : one(sum.add + sum.chg + sum.del, '1 row changed', '{n} rows changed');
    const body = parts.map((p) => p.html).join('');
    return { res: { cols: [], rows: [] }, head, html: `<p class="wr-done-msg">${esc(head)}</p>${body}` };
  }

  /* A DDL Run: the columns of each created or altered table, the first rows of each view, each new index. */
  async function runDdl(sql) {
    const text = String(sql).replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, ' ');
    const names = (re) => [...new Set([...text.matchAll(re)].map((x) => x[1].toUpperCase()))];
    const tables = names(/\b(?:CREATE|ALTER)\s+TABLE\s+(\w+)/gi);
    const views = names(/\bCREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(\w+)/gi);
    const indexes = names(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(\w+)/gi);
    const probes = [
      ...tables.map((n) => ({ n, kind: 'table', sql: `SELECT column_name, nullable FROM user_tab_columns WHERE table_name = '${n}' ORDER BY column_id` })),
      ...views.map((n) => ({ n, kind: 'view', sql: `SELECT * FROM ${n} FETCH FIRST 5 ROWS ONLY` })),
      ...indexes.map((n) => ({ n, kind: 'index', sql: `SELECT index_name, table_name FROM user_indexes WHERE index_name = '${n}'` })),
    ];
    const first = await SqlRunner.execute(GAME_BANK.setup, sql);
    if (first.error) return { res: first, html: resultHtml(first, sql) };
    const got = await Promise.all(probes.map((p) => SqlRunner.execute(GAME_BANK.setup, sql, p.sql)));
    const label = { table: 'columns', view: 'first rows', index: 'index' };
    const html = probes.map((p, i) => {
      const r = got[i];
      const body = r.error ? `<div class="wr-msg is-err"><p><code>${esc(r.error.code ? `${r.error.code}: ${r.error.text}` : r.error.text)}</code></p></div>`
        : r.rows && r.rows.length ? SqlRunner.tableHtml((r.cols || []).map((c) => String(c).toUpperCase()), r.rows)
          : `<p class="wr-done-msg">${esc(t('no rows selected'))}</p>`;
      return `<div class="wr-diff"><p class="wr-diff-h"><code>${esc(p.n.toLowerCase())}</code><span class="wr-dtag">${esc(t(label[p.kind]))}</span></p>${body}</div>`;
    }).join('');
    return { res: { cols: [], rows: [] }, html: `<p class="wr-done-msg">${esc(t('Done. The database resets on every run.'))}</p>${html}` };
  }

  async function runConsole() {
    if (locked() || !playing()) return;
    const sql = editorText();
    saveDraft();
    if (!sql.trim()) {
      output = `<p class="wr-done-msg">${esc(t('Write a query first.'))}</p><p class="wr-time"></p>`;
      outVersion++;
      refresh();
      announce(t('Write a query first.'));
      return;
    }
    const risk = unsafeText(sql);
    if (risk) {
      output = `<div class="wr-msg is-warn"><p>${esc(risk)}</p></div><p class="wr-time"></p>`;
      outVersion++;
      refresh();
      announce(risk);
      return;
    }
    const id = currentId();
    const m = mode;
    if (isComp()) bumpTele('runs');
    const t0 = performance.now();
    const verbs = verbsOf(sql);
    let res;
    let html;
    let say1 = '';
    if (verbs.some((v) => DML.includes(v))) {
      const r = await runDml(sql, verbs);
      res = r.res; html = r.html; say1 = r.head || '';
    } else if (verbs.some((v) => DDL.includes(v))) {
      const r = await runDdl(sql);
      res = r.res; html = r.html; say1 = t('Done.');
    } else {
      res = await runSql(sql);
      html = resultHtml(res, sql);
    }
    const ms = performance.now() - t0;
    if (mode !== m || !playing() || currentId() !== id) return;
    last = { id, sql, res, run: true };
    if (isComp()) lastRun = { id, sql };
    const n = !res.error && res.cols && res.cols.length ? res.rows.length : -1;
    const took = n < 0 ? t('{ms} ms', { ms: ms.toFixed(0) })
      : n === 1 ? t('1 row in {ms} ms', { ms: ms.toFixed(0) }) : t('{n} rows in {ms} ms', { n, ms: ms.toFixed(0) });
    output = `${lintHtml(sql)}${html}<p class="wr-time">${esc(took)}</p>`;
    outVersion++;
    refresh();
    announce(res.error ? `${res.error.code || ''} ${res.error.text || ''}`.trim() : say1 || (n >= 0 ? (n === 1 ? t('1 row selected.') : t('{n} rows selected.', { n })) : t('Done.')));
  }

  /* ---- Lock in --------------------------------------------------------------------------- */

  const CHECK_MSG = {
    empty: 'Write a query first.',
    many: 'Lock in takes one statement.',
    'not-query': 'Lock in takes a SELECT query.',
    unsupported: 'This statement cannot run here.',
    lint: 'Oracle would reject this:',
  };

  // What each kind of rung accepts at Lock in (reason 'wrong-kind', §13).
  const KIND_MSG = {
    select: 'This question takes a SELECT query.',
    insert: 'This question takes INSERT statements.',
    update: 'This question takes UPDATE statements.',
    delete: 'This question takes DELETE statements.',
    ddl: 'This question takes CREATE, ALTER or DROP statements.',
  };

  /* GameCore.checkAnswer(sql, kind) (§13); before it exists, checkQuery for select and the statement verbs for the rest. */
  function checkAnswer(sql, kind) {
    if (typeof GameCore.checkAnswer === 'function') return GameCore.checkAnswer(sql, kind) || { ok: false, reason: 'unsupported' };
    if (kind === 'select') return GameCore.checkQuery(sql);
    const verbs = verbsOf(sql).filter((v) => v !== 'COMMIT');
    if (!verbs.length) return { ok: false, reason: 'empty' };
    const want = { insert: ['INSERT'], update: ['UPDATE'], delete: ['DELETE'], ddl: ['CREATE', 'ALTER', 'DROP'] }[kind] || [];
    if (!verbs.every((v) => want.includes(v))) return { ok: false, reason: 'wrong-kind', expected: kind };
    const lint = OracleDialect.lint(sql);
    return lint.length ? { ok: false, reason: 'lint', detail: lint } : { ok: true };
  }

  function askLock() {
    if (locked() || !playing()) return;
    const sql = editorText();
    saveDraft();
    const kind = curKind();
    const chk = checkAnswer(sql, kind);
    if (!chk.ok) {
      const lint = chk.reason === 'lint' ? lintHtml(sql) : '';
      const why = chk.reason === 'unsupported' && chk.detail ? `<p>${esc(detailText(chk.detail))}</p>` : '';
      const msg = chk.reason === 'wrong-kind' || (chk.reason === 'not-query' && kind !== 'select') ? t(KIND_MSG[kind]) : t(CHECK_MSG[chk.reason] || CHECK_MSG.unsupported);
      output = `<div class="wr-msg is-warn wr-check"><p>${esc(msg)}</p>${why}</div>${lint}`;
      outVersion++;
      refresh();
      announce(msg);
      return;
    }
    const risk = unsafeText(sql);
    if (risk) {
      output = `<div class="wr-msg is-warn wr-check"><p>${esc(risk)}</p></div>`;
      outVersion++;
      refresh();
      announce(risk);
      return;
    }
    openDialog({ kind: 'lock', sql: sql.trim(), back: 'game-lock' });
  }

  /* Why checkQuery refused a statement: a full sentence (GameCore) or a fragment naming what the sandbox cannot simulate (OracleDialect). */
  const detailText = (d) => (/[.!?]$/.test(d) ? t(d) : t('The sandbox cannot simulate {what}. It is valid Oracle: copy it to FreeSQL to run it.', { what: t(d) }));

  /* GameCore.unsafe (when present): SQL that could freeze the tab (a recursive WITH) is never run. */
  function unsafeText(sql) {
    if (typeof GameCore.unsafe !== 'function') return '';
    const u = GameCore.unsafe(sql);
    if (!u) return '';
    return u.reason === 'recursive'
      ? t('Not run: a recursive WITH could freeze the page.')
      : t('Not run: this query could freeze the page.');
  }

  /* The probes a DML or DDL answer is graded with (§13.1): its own, or the snapshot of the three tables. */
  const checksOf = (q) => (q && q.checks) || (typeof GameCore.defaultChecks === 'function' ? GameCore.defaultChecks(q) : [
    'SELECT * FROM customers ORDER BY customer_id', 'SELECT * FROM games ORDER BY game_id', 'SELECT * FROM sales ORDER BY sale_id']);

  /* The answer against the reference (study only: the competitive side is judged by the server). Returns
     { res, grade, ok }. */
  async function judge(id, sql) {
    const q = GAME_BANK.questions.find((x) => x.id === id);
    const isSelect = qMode(q) === 'select';
    // DML and DDL: what Oracle would refuse (GameCore.oracleCheck, statement by statement) is the answer's error,
    // as runSql does for a query; otherwise the probes run on a fresh copy.
    const checked = () => {
      const ora = GameCore.oracleCheck(sql);
      if (ora) return { error: { code: ora.code, text: ora.text, column: ora.column || null, quoted: !!ora.quoted }, changes: 0, results: [] };
      return SqlRunner.executeChecks(GAME_BANK.setup, sql, checksOf(q));
    };
    const [res, ref] = await Promise.all([isSelect ? runSql(sql) : checked(), reference(id)]);
    if (ref.error) throw new Error(`reference ${id}: ${ref.error.text}`);
    const grade = res.error ? null : isSelect ? GameCore.grade(res, ref, !!q.ordered) : GameCore.gradeChecks(res, ref);
    return { res, grade, ok: !!(grade && grade.ok) };
  }

  /* Lock in. The verdict is saved as soon as it is known, before the suspense ends and before
     anything shows it: a reload, Back or a link out during the suspense or the rescue dialog
     cannot undo it (a pass or a loss is in the saved state; a miss with Review unused is saved as
     the pending rescue, which opens again). Leaving before grading ends just cancels the lock-in:
     nothing was revealed, and grading takes a few milliseconds. The run is the one of the side and
     mode where Lock in was pressed (`sd`, `m`), even if the student moves to another screen meanwhile.
     The competitive side goes to the server (compLock). */
  async function lockIn(sql) {
    if (isComp()) return compLock(sql);
    const m = mode;
    const sd = side;
    const here = () => side === sd && mode === m;
    const key = memoKey(sd, m);
    const id = currentId();
    const lvl = state.level;
    const t0 = performance.now();
    setBusy(true);
    flash = null;
    say(String(H().suspense || ''));                 // #wr-host is the live region for SQL-Bot's lines
    const rung = document.querySelector(`#wr-ladder li[data-level="${lvl}"]`);
    if (rung) {
      if (!reduceMotion) rung.classList.add('is-suspense');
      rung.setAttribute('tabindex', '-1');           // Lock in is disabled now: focus waits on the rung
      rung.focus({ preventScroll: true });
    }
    let j;
    try { j = await judge(id, sql); } catch (e) { busy = false; throw e; }
    let st = W(sd).runs()[m];
    if (!st || st.status !== 'playing' || st.ids[st.level - 1] !== id) { busy = false; if (onPage()) setBusy(false); return; }
    const tried = { id, sql, res: j.res };
    if (here()) last = tried; else if (memo[key]) memo[key].last = tried;
    // Commit the verdict.
    let outcome;
    if (j.ok) { st = GameCore.pass(st, sql); outcome = st.status === 'won' ? 'end' : 'pass'; } else if (!st.used.review) {
      setPending(m, { v: 1, seed: st.seed, level: lvl, id, sql }, sd);
      outcome = 'rescue';
    } else { st = GameCore.fail(st, sql); outcome = 'end'; }
    if (here()) state = st;
    save(m, st, sd);
    if (outcome === 'end') recordBest(m, st);
    await delay(reduceMotion ? 0 : Math.max(0, SUSPENSE_MS - (performance.now() - t0)));
    document.querySelectorAll('#wr-ladder li.is-suspense').forEach((li) => li.classList.remove('is-suspense'));
    busy = false;
    if (!here()) {                                    // the student moved on: the run shows its verdict on return
      if (memo[key]) { memo[key].output = ''; memo[key].review = null; memo[key].lifeMsg = null; }
      if (onPage()) setBusy(false);
      return;
    }
    if (outcome === 'end') { flash = { level: lvl, cls: state.status === 'won' ? 'is-flash-ok' : 'is-flash-bad' }; finish(); return; }
    if (outcome === 'pass') {
      const safe = GameCore.SAFE.includes(lvl);
      const bandStart = GameCore.BANDS.find((b) => b.from === state.level);
      let text = safe ? fill(H().safe, { prize: money(GameCore.prize(lvl)) }) : line(H().correct, state.answers.length);
      if (bandStart && H().bands && H().bands[bandStart.key]) text = `${text} ${H().bands[bandStart.key]}`;
      hostText = text;
      flash = { level: lvl, cls: 'is-flash-ok' };
      output = '';
      outVersion++;
      review = null;
      lifeMsg = null;
      if (!onPage()) return;
      refresh();
      // The next question is at the top of the column: bring it into view and give it focus
      // (its heading reads "Question n of 15: For …"; SQL-Bot's line comes through #wr-host).
      const card = document.getElementById('wr-question');
      const h = document.getElementById('wr-q-h');
      if (card && card.scrollIntoView) card.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      return;
    }
    // Wrong with Review unused (a runtime error counts: it was confirmed): offer the rescue.
    flash = { level: lvl, cls: 'is-flash-bad' };
    hostText = String(H().wrong || '');
    output = `${j.res.error ? resultHtml(j.res, sql) : ''}<div class="wr-msg is-err"><p>${esc(t('That is not the answer'))}</p></div>`;
    outVersion++;
    if (!onPage()) return;                           // the dialog opens when the page shows again
    refresh();
    if (!dialog) openDialog({ kind: 'rescue', sql, back: 'game-lock' });
  }

  /* The last attempt again, graded the same way as Lock in (after a reload, `last` is gone). */
  async function attemptOf(id, sql) {
    const q = question(id);
    if (qMode(q) === 'select') return { id, sql, res: await runSql(sql) };
    const ora = GameCore.oracleCheck(sql);   // the same rule as judge: what Oracle refuses is the error
    if (ora) return { id, sql, res: { error: { code: ora.code, text: ora.text, column: ora.column || null, quoted: !!ora.quoted }, changes: 0, results: [] } };
    return { id, sql, res: await SqlRunner.executeChecks(GAME_BANK.setup, sql, checksOf(q)) };
  }

  /* Review spends itself and stays on the same rung (GameCore.rescue). */
  async function rescueYes() {
    const d = dialog;
    if (!d || d.kind !== 'rescue' || !playing()) return;
    if (isComp()) { await compRescue(true); return; }
    const id = currentId();
    closeDialog(false);
    state = GameCore.rescue(state, d.sql);
    save();
    setPending(mode, null);
    hostText = t('Review is used. Fix your query and lock it in again.');
    if (!last || last.id !== id || last.sql !== d.sql || last.run) last = await attemptOf(id, d.sql);   // after a reload
    await showReview(true);
  }

  async function rescueNo() {
    const d = dialog;
    if (!d || d.kind !== 'rescue' || !playing()) return;
    if (isComp()) { await compRescue(false); return; }
    closeDialog(false);
    state = GameCore.fail(state, d.sql);
    save();
    setPending(mode, null);
    recordBest();
    finish();
  }

  /* The best score of a study mode, kept as soon as a run ends. */
  function recordBest(m = mode, st = state) {
    const before = data.best[m];
    const had = !!before && Number.isFinite(before.prize);
    const newBest = !had || st.prize > before.prize;
    if (newBest) data.best[m] = { prize: st.prize, date: new Date().toISOString() };
    save(m, st, 'study');
    const info = { best: data.best[m], newBest: newBest && (had || st.prize > 0) };
    if (side === 'study' && m === mode) endInfo = info; else if (memo[memoKey('study', m)]) memo[memoKey('study', m)].endInfo = info;
  }

  /* The run is over: show the end screen. Its heading takes the focus; SQL-Bot's line comes
     through #wr-host and the prize is announced once. */
  function finish() {
    stopClock();
    const clk = document.getElementById('wr-clock');
    if (clk) clk.remove();
    hostText = state.status === 'won' ? String(H().win || '')
      : state.status === 'walked' ? fill(H().walk, { prize: money(state.prize) })
        : state.timeout ? t('Time is up.') : String(H().wrong || '');
    dialog = null;
    if (typer) { typer.finish(); typer = null; }
    if (!onPage()) return;
    closeDialog(false);
    refresh();
    const h = document.getElementById('wr-end-h');
    if (h) reveal(h);
    const plate = document.querySelector('#wr-end .wr-end-plate, #wr-end .wr-cert');
    if (plate && plate.scrollIntoView) plate.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    announce(t('Final prize: {prize}', { prize: money(state.prize) }));
  }

  async function walkAway() {
    if (!playing()) return;
    if (isComp()) { await compWalk(); return; }
    closeDialog(false);
    state = GameCore.walkAway(state);
    save();
    recordBest();
    finish();
  }

  function playAgain() {
    closeDialog(false);
    if (isComp()) { startScreen(); return; }       // a competitive attempt starts from its rules
    newRun();
    if (!onRoute()) return;
    if (!onPage()) { showPage(); return; }
    refresh();
    const h = document.getElementById('wr-h');
    if (h) h.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    announce(t('Question {n} of {total}', { n: 1, total: GameCore.LADDER.length }));
  }

  /* ---- Lifelines ------------------------------------------------------------------------- */

  /* A lifeline's output card takes the focus, so a screen reader reads it there (no extra announce). */
  function focusCard(name) {
    const card = document.querySelector(`#wr-life-out .wr-life-card.is-${name}`);
    if (!card) return;
    card.setAttribute('tabindex', '-1');
    reveal(card);
  }

  function useLife(name) {
    if (locked() || !playing() || !LIVES.includes(name) || state.used[name]) return;
    if (isComp()) { guard(() => compLife(name)); return; }
    const id = currentId();
    lifeMsg = null;
    if (name === 'review') { guard(() => showReview(false)); return; }
    state = GameCore.useLifeline(state, name);
    state = { ...state, shown: { ...state.shown, [name]: id } };
    trayLife = name;
    save();
    refresh();
    focusCard(name);
  }

  /* Review: GameCore.diagnose on the last Run or lock-in of this question.
     spent: true after a rescue (GameCore.rescue already used it). */
  async function showReview(spent) {
    const id = currentId();
    const a = last && last.id === id ? last : null;
    if (!a) {
      if (spent) { refresh(); return; }
      lifeMsg = { id, k: 'Review checks your last Run or Lock in on this question. Run a query first: Review is still unused.' };
      refresh();
      announce(t(lifeMsg.k));
      return;
    }
    setBusy(true);
    const q = question(id);
    const isSelect = qMode(q) === 'select';
    const tried = !isSelect && a.run ? await attemptOf(id, a.sql) : a;      // a DML or DDL Run is graded as Lock in would
    const ref = await reference(id);
    setBusy(false);
    if (!playing() || currentId() !== id) return;
    const grade = tried.res.error || ref.error ? null : isSelect ? GameCore.grade(tried.res, ref, !!q.ordered) : GameCore.gradeChecks(tried.res, ref);
    const items = GameCore.diagnose(isSelect
      ? { sql: tried.sql, error: tried.res.error ? { ...tried.res.error, raw: tried.res.raw || '' } : null, grade, schema: GAME_BANK.schema }
      : { sql: tried.sql, error: tried.res.error || null, grade: null, schema: GAME_BANK.schema, checks: { got: tried.res, want: ref, probes: checksOf(q) } });
    if (!spent) state = GameCore.useLifeline(state, 'review');
    review = { id, sql: tried.sql.trim(), items, checks: isSelect ? null : checksOf(q) };
    trayLife = 'review';
    save();
    refresh();
    focusCard('review');
  }

  /* ---- Console helpers ------------------------------------------------------------------- */

  function putSql(sql, announceText) {
    const ed = document.getElementById('wr-sql');
    if (!ed) return;
    ed.value = sql;
    consoleText = sql;
    saveDraft();
    ed.focus({ preventScroll: true });
    const hole = sql.indexOf('<');                 // select the first placeholder, ready to type over
    if (hole >= 0) ed.setSelectionRange(hole, sql.indexOf('>', hole) + 1);
    else ed.setSelectionRange(sql.length, sql.length);
    if (ed.scrollIntoView) ed.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    announce(announceText);
  }

  function insertSnippet(v) {
    const s = SNIPPETS.find((x) => x.v === v);
    if (!s) return;
    const sql = s.sql();
    putSql(sql, sql.includes('<')
      ? t('"{name}" typed in the console: replace the parts in angle brackets, then run it.', { name: s.label() })
      : t('"{name}" typed in the console: edit it if needed, then run it.', { name: s.label() }));
  }

  /* ---- Competitive side on the server (§15) ---------------------------------------------------- */

  // @supabase/supabase-js, pinned, loaded only when Competitive opens.
  const SB_SRC = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  // Subresource Integrity of that exact file (sha384, computed from the downloaded file): a changed file is refused.
  const SB_SRI = 'sha384-0w2KAL2YHP6wKOkUDzkCDGgVvfmHnj02DHeQ6XcHOgTfFsGyonKOpShMH1x6nk9o';
  const TIMEOUT_MS = 20000;
  // Cloudflare Turnstile (optional CAPTCHA at sign-in, when GAME_COMP_CONFIG.captchaSiteKey is set). No SRI is
  // possible: Cloudflare serves this script unversioned and updates it in place, so a fixed hash would break it.
  const TS_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  let tsLoading = null;
  let tsWidget = null;                // the widget id on screen
  let tsToken = '';                   // the token of the last solved challenge (one use)
  let sbLoading = null;               // Promise of the Supabase client
  let sb = null;
  let session = null;
  let srv = null;                     // the last `status`: { who, limits, modes }
  let att = null;                     // the attempt view on screen (competitive or test)
  let offset = 0;                     // serverTime − Date.now(): the server's clock, applied locally
  let compMsg = '';                   // a message on the competitive screens (sign-in, errors)
  let compWait = '';                  // what the waiting screen says
  let pendingRoute = null;            // the route to show once signed in and the status is known
  let login = { step: 'email', email: '' };
  let lastRun = { id: null, sql: '' };   // the last Run of this question (Review sends it)
  let pendingSql = '';                // the answer waiting for the rescue choice
  let teacherRun = null;              // the mode of the teacher's test attempt on screen (route profesor)
  const freshTeacher = () => ({ tab: 'students', list: null, attempts: null, detail: null, oral: null, oralFor: null, loading: false, filter: { role: 'all', kind: 'all' }, q: '', sel: null });
  let teacher = freshTeacher();
  let hist = { data: null, loading: false }; // My attempts (route historial): the last `my-stats`
  let clock = null;                   // { timer, last, saved, onBlur, onVis } while an attempt is on screen
  let tele = null;                    // { a: attemptId, l: level, ms, runs, paste, blur } of the question on screen

  const configured = () => !!(cfg().supabaseUrl && cfg().anonKey);
  const DOMAIN = 'cunef.edu';
  // The server's rule: letters, digits, dots, hyphens and underscores before @cunef.edu (no plus-addressing).
  const emailOk = (e) => /^[a-z0-9._-]+@cunef\.edu$/.test(String(e || '').trim().toLowerCase());
  const now = () => Date.now() + offset;
  const fmtDate = (iso) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.toLocaleString(LANG === 'es' ? 'es-ES' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'; };
  const fmtDay = (iso) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.toLocaleDateString(LANG === 'es' ? 'es-ES' : 'en-GB', { dateStyle: 'medium' }) : '—'; };
  const minutesOf = (a, b) => { const x = (Date.parse(b) - Date.parse(a)) / 60000; return Number.isFinite(x) ? Math.max(0, Math.round(x)) : null; };
  const live = (v) => !!v && (v.status === 'playing' || v.status === 'pending');
  const daily = () => (srv && srv.limits && srv.limits.daily) || Number(cfg().dailyAttempts) || 3;
  const minutes = () => (srv && srv.limits && srv.limits.minutes) || Number(cfg().limitMinutes) || 60;
  const L = (o) => (o ? o[LANG] || o.en || '' : '');

  class CompError extends Error {
    constructor(code, message, status) { super(message || code); this.code = code; this.status = status || 0; }
  }
  // What each failure says (the server's own messages are English: these are the page's words).
  const ERR = {
    offline: 'The competition server is not responding (it may be paused). Try again in a few minutes.',
    auth: 'Your session has expired: sign in again.',
    domain: 'Only @cunef.edu accounts can play the competition.',
    limit: 'You have used today\'s attempts for this mode. Come back tomorrow.',
    expired: 'Time is up: the attempt has ended.',
    state: 'The attempt changed meanwhile: it has been reloaded.',
    other: 'Something went wrong on the server. Try again in a moment.',
  };
  const errText = (e) => t(ERR[e && e.code] || ERR.other);

  /* The header's account menu (js/account.js) reads the stored session itself; this keeps it a summary of the last
     `status` (name, role, today's attempts left and the badges per mode) and tells it when either changes. */
  const STATUS_CACHE = 'game-comp-status';
  function publish(st) {
    try {
      const email = session && session.user && session.user.email;
      if (!session) localStorage.removeItem(STATUS_CACHE);
      else if (email && st && st.who) {
        const d = new Date();
        localStorage.setItem(STATUS_CACHE, JSON.stringify({
          email, name: st.who.name || '', role: st.who.role || '', day: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
          daily: (st.limits && st.limits.daily) || daily(),
          modes: PLAY_MODES.map((m) => { const x = (st.modes && st.modes[m]) || {}; return { m, kw: modeKw(m), left: Number(x.left) || 0, badge: !!x.badge }; }),
        }));
      }
    } catch (e) { /* no storage: the menu shows the session only */ }
    try { window.dispatchEvent(new CustomEvent('comp-auth-change')); } catch (e) { /* old browsers */ }
  }

  /* The client, loaded once (script tag from jsDelivr), with the session kept by the library. */
  function loadSb() {
    if (sb) return Promise.resolve(sb);
    if (!sbLoading) {
      sbLoading = new Promise((ok, no) => {
        const make = () => {
          try {
            sb = window.supabase.createClient(cfg().supabaseUrl, cfg().anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'game-comp-auth' } });
            sb.auth.onAuthStateChange((ev, s) => { session = s; publish(s ? srv : null); });
            sb.auth.getSession().then((r) => { session = r.data.session; ok(sb); }, no);
          } catch (e) { no(e); }
        };
        if (window.supabase && window.supabase.createClient) { make(); return; }
        const tag = document.createElement('script');
        tag.src = SB_SRC;
        tag.integrity = SB_SRI;
        tag.crossOrigin = 'anonymous';
        tag.onload = make;
        tag.onerror = () => no(new CompError('offline', 'load'));
        document.head.appendChild(tag);
      });
      sbLoading.catch(() => { sbLoading = null; });
    }
    return sbLoading;
  }

  const captchaKey = () => String(cfg().captchaSiteKey || '');
  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!tsLoading) {
      tsLoading = new Promise((ok, no) => {
        const tag = document.createElement('script');
        tag.src = TS_SRC;
        tag.async = true;
        tag.onload = () => ok(window.turnstile);
        tag.onerror = () => no(new CompError('offline', 'turnstile'));
        document.head.appendChild(tag);
      });
      tsLoading.catch(() => { tsLoading = null; });
    }
    return tsLoading;
  }
  /* The challenge in the email step (re-rendered with the page). */
  async function mountCaptcha() {
    const box = document.getElementById('wr-captcha');
    if (!box || !captchaKey()) return;
    let ts;
    try { ts = await loadTurnstile(); } catch (e) { box.textContent = t(ERR.offline); return; }
    if (!box.isConnected) return;
    if (tsWidget !== null) { try { ts.remove(tsWidget); } catch (e) { /* already gone */ } }
    tsToken = '';
    tsWidget = ts.render(box, {
      sitekey: captchaKey(), language: LANG, theme: 'light',
      callback: (tok) => { tsToken = tok; },
      'expired-callback': () => { tsToken = ''; },
      'error-callback': () => { tsToken = ''; },
    });
  }
  function resetCaptcha() {
    tsToken = '';
    if (tsWidget !== null && window.turnstile) { try { window.turnstile.reset(tsWidget); } catch (e) { /* re-rendered later */ } }
  }

  /* One call to the `comp` Edge Function: { op, ... } with the user's token; every answer carries serverTime. */
  async function api(op, body = {}) {
    await loadSb();
    const r = await sb.auth.getSession();
    session = r.data.session;
    if (!session) throw new CompError('auth');
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctl) ctl.abort(); }, TIMEOUT_MS);
    let res;
    try {
      res = await fetch(`${cfg().supabaseUrl.replace(/\/+$/, '')}/functions/v1/comp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: cfg().anonKey },
        body: JSON.stringify({ op, ...body }),
        signal: ctl ? ctl.signal : undefined,
      });
    } catch (e) { throw new CompError('offline', String(e && e.message)); } finally { clearTimeout(timer); }
    let out = null;
    try { out = await res.json(); } catch (e) { throw new CompError(res.status >= 500 || !res.status ? 'offline' : 'other', '', res.status); }
    if (out && out.serverTime) { const st = Date.parse(out.serverTime); if (Number.isFinite(st)) offset = st - Date.now(); }
    if (out && out.error) throw new CompError(out.error.code, out.error.message, res.status);
    if (!res.ok) throw new CompError(res.status >= 500 ? 'offline' : 'other', '', res.status);
    if (op === 'status') publish(out);
    return out;
  }

  /* submit, rescue and lifeline: the server keeps one SQL slot per user every 2 s ('limit' with "Too fast"); such a
     refusal is waited out (~2.2 s) and the call is tried once more. The daily limit of `start` is another 'limit'
     ("Come back tomorrow") and is never retried here. */
  const tooFast = (e) => e instanceof CompError && e.code === 'limit' && /too fast/i.test(String(e.message || ''));
  async function apiSlot(op, body) {
    try { return await api(op, body); } catch (e) {
      if (!tooFast(e)) throw e;
      await delay(2200);
      return api(op, body);
    }
  }

  /* After a failure: a lost session goes back to sign-in; anything else is said where the student is. */
  function onCompError(e, where = 'msg') {
    if (!(e instanceof CompError)) throw e;
    if (e.code === 'auth') { session = null; srv = null; }
    compMsg = errText(e);
    if (where === 'out' && view === 'run' && onPage()) {
      output = `<div class="wr-msg is-err wr-srv"><p>${esc(compMsg)}</p></div>`;
      outVersion++;
      refresh();
    } else if (where !== 'quiet') showPage();
    announce(compMsg);
  }

  /* ---- The attempt as a GameCore-like state (the page's run screens read it) --------------------------- */

  function stateFromView(v) {
    const q = v.question;
    const n = GameCore.LADDER.length;
    return {
      v: 1, mode: v.mode, seed: 0, level: v.level, prize: v.prize,
      ids: Array.from({ length: n }, (_, i) => (q && i === v.level - 1 ? q.id : `-${i + 1}`)),
      status: v.status === 'pending' ? 'playing' : v.status === 'expired' ? 'lost' : v.status,
      used: { clause: !!(v.used || {}).clause, template: !!(v.used || {}).template, review: !!(v.used || {}).review },
      shown: { clause: q && q.clause ? q.id : null, template: q && q.template ? q.id : null },
      answers: (v.answered || []).map((x) => ({ id: '', sql: '', ok: !!x.ok })),
      timeout: v.status === 'expired', test: !!v.test, deadline: v.deadline, started: v.startedAt, ended: v.finishedAt,
    };
  }
  function compQuestion(id) {
    const q = att && att.question;
    if (!q || q.id !== id) return null;
    return { id: q.id, mode: q.mode, level: q.level, ordered: !!q.ordered, template: q.template ? q.template.sql : '', checks: null };
  }
  function compText(id) {
    const q = att && att.question;
    if (!q || q.id !== id) return {};
    return { prompt: L(q.prompt), clause: q.clause ? L(q.clause.text) : '', templateNote: q.template ? L(q.template.note) : '' };
  }

  /* A new view from the server: the run on screen follows it; the telemetry starts over on a new question. */
  function applyView(v, sd = side) {
    if (!v) return;
    const st = stateFromView(v);
    (sd === 'test' ? testRuns : compRuns)[v.mode] = st;
    if (side === sd && mode === v.mode) { att = v; state = st; }
    if (!tele || tele.a !== v.id || tele.l !== v.level) {
      const saved = teleStore.load();
      tele = saved && saved.a === v.id && saved.l === v.level ? saved : { a: v.id, l: v.level, ms: 0, runs: 0, paste: 0, blur: 0 };
      if (lastRun.id !== (v.question && v.question.id)) lastRun = { id: null, sql: '' };
    }
  }
  function bumpTele(k) {
    if (!tele || !isComp() || !playing()) return;
    tele[k] = (Number(tele[k]) || 0) + 1;
    teleStore.save(tele);
  }
  const teleOut = () => (tele ? { ms: Math.round(tele.ms), runs: tele.runs, paste: tele.paste, blur: tele.blur } : { ms: 0, runs: 0, paste: 0, blur: 0 });

  /* ---- Opening the competitive side: library, session, status ----------------------------------------- */

  /* Is everything known to show this competitive route at once (signed in, status loaded)? */
  const compReadyFor = () => configured() && !!sb && !!session && !!srv && !!(srv.who && srv.who.name);

  /* Loads what Competitive needs, then shows `route` (a mode's attempt, the select screen or teacher mode). */
  async function compOpen(route = '') {
    pendingRoute = route;
    if (!configured()) { view = viewOf(route); curRoute = route.startsWith('comp/') ? '' : route; if (route.startsWith('comp/')) history.replaceState(null, '', '#/game'); showPage(); return; }
    if (!sb || !srv) { compWait = t('Connecting to the competition…'); view = 'wait'; curRoute = route; showPage(); }
    try {
      await loadSb();
      if (session && !srv) srv = await api('status');
    } catch (e) {
      if (!(e instanceof CompError)) throw e;
      if (e.code === 'auth') { session = null; srv = null; } else compMsg = errText(e);
    }
    if (routeMode() !== route) return;            // the student went elsewhere meanwhile
    if (route.startsWith('comp/') && compReadyFor()) {
      const m = route.slice(5);
      const act = srv.modes[m] && srv.modes[m].active;
      if (act) { enter('comp', m); applyView(act, 'comp'); state = compRuns[m]; att = act; }
      else enter('comp', m);
      view = compRuns[m] && act ? 'run' : 'start';
      curRoute = route;
      showPage();
      return;
    }
    if (route.startsWith('comp/')) history.replaceState(null, '', '#/game');
    enter('study', null);
    view = viewOf(route);
    curRoute = view === 'select' ? '' : route;
    showPage();
    if (view === 'teacher' && isTeacher() && teacher.tab === 'students' && !teacher.list) teacherLoad();
    if (view === 'history' && compReadyFor() && !hist.data && !hist.loading) historyLoad();
  }
  const viewOf = (route) => (route === 'profesor' ? 'teacher' : route === 'historial' ? 'history' : 'select');

  function waitHtml() {
    return `<section class="wr-game is-chooser" data-mode="" data-view="wait" data-route="${esc(curRoute)}" aria-labelledby="wr-h">
        <header class="wr-hud" id="wr-hud">${hudHtml()}</header>
        <div class="wr-select"><div class="wr-loader" aria-hidden="true"><span></span><span></span><span></span></div>
          <p class="wr-load-msg" role="status">${esc(compWait)}</p></div>
        <div id="wr-dialogs"></div>
      </section>`;
  }

  /* ---- Sign-in: email, the 6-digit code, the name once ------------------------------------------------ */

  function signInHtml() {
    const code = login.step === 'code';
    return `<div class="wr-id" role="group" aria-labelledby="wr-id-h">
        <h3 class="wr-id-h" id="wr-id-h">${esc(t('Sign in to compete'))}</h3>
        <p class="wr-id-t">${esc(code ? t('We sent a 6-digit code to {email}.', { email: login.email }) : t('We send a 6-digit code to your @{domain} email.', { domain: DOMAIN }))}</p>
        <div class="wr-id-f">
          ${!code && captchaKey() ? '<div class="wr-captcha" id="wr-captcha"></div>' : ''}
          ${code
    ? `<label for="wr-login-code">${esc(t('Code'))}</label>
            <input id="wr-login-code" class="wr-input wr-otp" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-describedby="wr-id-msg">`
    : `<label for="wr-login-email">${esc(t('Email'))}</label>
            <input id="wr-login-email" class="wr-input" type="email" autocomplete="email" inputmode="email" maxlength="120" placeholder="${esc(`name@${DOMAIN}`)}" value="${esc(login.email)}" aria-describedby="wr-id-msg">`}
        </div>
        <p class="wr-id-msg" id="wr-id-msg" role="alert">${esc(compMsg)}</p>
        <details class="wr-privacy"><summary>${esc(t('What we store'))}</summary>
          <p>${esc(t('Your email, your name, your SQL answers and their times. During an attempt, pasting and leaving the tab are also recorded.'))}</p>
          <p>${esc(t('Only your teacher sees it, to award the lab badge. It is deleted once the grades are final.'))}</p></details>
        <p class="wr-id-a">${code
    ? `<button type="button" class="wr-btn is-primary" data-action="game-login-verify" data-fid="game-login-verify">${esc(t('Sign in'))}</button>
            <button type="button" class="wr-btn" data-action="game-login-back" data-fid="game-login-back">${esc(t('Use another email'))}</button>`
    : `<button type="button" class="wr-btn is-primary" data-action="game-login-send" data-fid="game-login-send">${esc(t('Send the code'))}</button>`}</p>
      </div>`;
  }

  function nameHtml() {
    return `<div class="wr-id" role="group" aria-labelledby="wr-id-h">
        <h3 class="wr-id-h" id="wr-id-h">${esc(t('Your name'))}</h3>
        <p class="wr-id-t">${esc(t('It goes on your badges, as your teacher sees it.'))}</p>
        <div class="wr-id-f"><label for="wr-name">${esc(t('Name'))}</label>
          <input id="wr-name" class="wr-input" type="text" autocomplete="name" maxlength="80" value="${esc((srv && srv.who && srv.who.name) || '')}" aria-describedby="wr-id-msg"></div>
        <p class="wr-id-msg" id="wr-id-msg" role="alert">${esc(compMsg)}</p>
        <p class="wr-id-a"><button type="button" class="wr-btn is-primary" data-action="game-name-save" data-fid="game-name-save">${esc(t('Save'))}</button></p>
      </div>`;
  }

  const fieldVal = (id) => String((document.getElementById(id) || {}).value || '').trim();
  const focusField = (id) => { const el = document.getElementById(id); if (el) el.focus(); };

  async function loginSend() {
    const email = fieldVal('wr-login-email').toLowerCase();
    login.email = email;
    if (!emailOk(email)) { compMsg = t('Use your university email: name@{domain}, with letters, digits, dots, hyphens or underscores only (no +).', { domain: DOMAIN }); showPage(); focusField('wr-login-email'); return; }
    if (captchaKey() && !tsToken) { compMsg = t('Complete the check above first.'); showPage(); focusField('wr-login-email'); return; }
    compMsg = '';
    busy = true;
    try {
      await loadSb();
      const options = { shouldCreateUser: true };
      if (captchaKey()) options.captchaToken = tsToken;
      const r = await sb.auth.signInWithOtp({ email, options });
      if (r.error) throw r.error;
      login.step = 'code';
    } catch (e) {
      compMsg = e instanceof CompError || /fetch|network/i.test(String(e && e.message)) ? t(ERR.offline)
        : /captcha/i.test(String(e && e.message)) ? t('The check failed. Complete it again and resend.') : t('The code could not be sent. Check the email and try again.');
    } finally { busy = false; resetCaptcha(); }
    showPage();
    focusField(login.step === 'code' ? 'wr-login-code' : 'wr-login-email');
  }

  async function loginVerify() {
    const token = fieldVal('wr-login-code').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(token)) { compMsg = t('The code has 6 digits.'); showPage(); focusField('wr-login-code'); return; }
    busy = true;
    try {
      const r = await sb.auth.verifyOtp({ email: login.email, token, type: 'email' });
      if (r.error) { compMsg = t('That code is not right, or it has expired.'); busy = false; showPage(); focusField('wr-login-code'); return; }
      session = r.data.session;
      srv = await api('status');
      compMsg = '';
      login = { step: 'email', email: '' };
    } catch (e) {
      busy = false;
      onCompError(e);
      return;
    }
    busy = false;
    compOpen(routeMode() || '');
  }

  async function saveName() {
    const name = fieldVal('wr-name').replace(/\s+/g, ' ');
    if (name.length < 2) { compMsg = t('Write your name.'); showPage(); focusField('wr-name'); return; }
    busy = true;
    try {
      const uid = session && session.user && session.user.id;
      const r = await sb.from('profiles').update({ name }).eq('user_id', uid);
      if (r.error) throw new CompError('other', r.error.message);
      srv = await api('status');
      compMsg = '';
    } catch (e) { busy = false; onCompError(e); return; }
    busy = false;
    compOpen(routeMode() || '');
  }

  async function logout() {
    // From the header's account menu the library may not be loaded yet: load it so the server ends the session too.
    try { if (!sb && configured()) await loadSb(); } catch (e) { /* offline: signed out locally below */ }
    try { if (sb) await sb.auth.signOut(); } catch (e) { /* signed out locally anyway */ }
    session = null;
    srv = null;
    att = null;
    Object.keys(compRuns).forEach((k) => delete compRuns[k]);
    Object.keys(testRuns).forEach((k) => delete testRuns[k]);
    teacher = freshTeacher();
    hist = { data: null, loading: false };
    compMsg = '';
    publish(null);
    showPage();
  }

  /* ---- My attempts (route historial): the student's own competitive record ---------------------------------
     Per mode: the medal, the best rung as a strip of the 15 ladder cells (safe rungs marked), the count and the last
     start; then every real attempt, newest first, in the teacher's row language. From the op my-stats (§15.3). */

  async function historyLoad() {
    hist.loading = true;
    try { hist.data = await api('my-stats'); compMsg = ''; } catch (e) { hist.loading = false; onCompError(e); return; }
    hist.loading = false;
    if (view === 'history' && onPage()) showPage();
  }

  function rungStrip(best) {
    const n = GameCore.LADDER.length;
    const cells = Array.from({ length: n }, (_, i) => {
      const lvl = i + 1;
      return `<li class="wr-hcell${lvl <= best ? ' is-done' : ''}${GameCore.SAFE.includes(lvl) ? ' is-safe' : ''}"></li>`;
    }).join('');
    return `<ol class="wr-hstrip" aria-hidden="true">${cells}</ol>`;
  }

  function historyBody() {
    const d = hist.data;
    const modes = PLAY_MODES.map((m) => {
      const x = (d.modes && d.modes[m]) || { count: 0, last: null, best: 0, badge: null };
      const best = x.badge ? GameCore.LADDER.length : x.best;
      const bestText = x.count
        ? t('Best: rung {n} of {total} ({prize})', { n: best, total: GameCore.LADDER.length, prize: money(GameCore.prize(best)) })
        : t('Not played yet');
      const count = x.count ? t(x.count === 1 ? '1 attempt, on {date}' : '{n} attempts, the last on {date}', { n: x.count, date: fmtDay(x.last) }) : '';
      return `<li class="wr-hmode is-${m}${x.badge ? ' is-earned' : ''}">
          ${medal(m, x.badge ? 'earned' : 'none')}
          <span class="wr-hmode-id"><span class="wr-hmode-name"><span class="wr-hmode-kw">${esc(modeKw(m))}</span> ${esc(modeName(m))}</span>
            <span class="wr-hmode-best">${esc(bestText)}${x.badge ? `<span class="sr-only">. ${esc(t('Badge earned on {date}', { date: fmtDay(x.badge.earned_at) }))}</span>` : ''}</span></span>
          ${rungStrip(best)}
          <span class="wr-hmode-count">${esc(count)}</span>
        </li>`;
    }).join('');
    const atts = d.attempts || [];
    const rows = atts.map((a) => {
      const mins = minutesOf(a.started_at, a.finished_at);
      return `<li class="wr-trow"><div class="wr-trow-main">
          <span class="wr-tr-date">${esc(fmtDate(a.started_at))}</span>
          ${kindChip(a.mode)}
          <span class="wr-tr-res is-${esc(a.status)}">${a.badge ? medal(a.mode, 'earned') : ''}${esc(statusText(a.status))}</span>
          <span class="wr-tr-num">${esc(t('Rung {n}', { n: a.rung }))}</span>
          <span class="wr-tr-num">${esc(money(a.prize))}</span>
          <span class="wr-tr-num">${esc(t('{right}/{answered} right', { right: a.right, answered: a.answered }))}</span>
          <span class="wr-tr-num">${esc(mins === null ? '—' : t('{n} min', { n: mins }))}</span>
        </div></li>`;
    }).join('');
    return `<ul class="wr-hmodes" aria-label="${esc(t('Best rung per mode'))}">${modes}</ul>
      <h3 class="wr-hist-t">${esc(t('Attempts ({n})', { n: atts.length }))}</h3>
      ${atts.length
        ? `<ol class="wr-tatts wr-hatts">${rows}</ol>`
        : `<div class="wr-card wr-hempty"><p>${esc(t('You have no competitive attempts yet.'))}</p>
            <p class="wr-id-a"><a class="wr-btn is-primary" href="#/game/entrar" data-fid="game-history-play">${esc(t('Play Competitive'))}</a></p></div>`}`;
  }

  function historyHtml() {
    let body;
    if (!configured()) body = `<div class="wr-card wr-srv-off"><p>${esc(t('The competition is not set up yet.'))}</p></div>`;
    else if (!session || !srv || !srv.who.name) body = compSelectHtml();   // sign-in, the retry card or the name form
    else if (!hist.data) {
      body = hist.loading || !compMsg
        ? `<p class="wr-load-msg" role="status">${esc(t('Loading…'))}</p>`
        : `<div class="wr-card wr-srv-off"><p class="wr-msg is-err">${esc(compMsg)}</p>
            <p class="wr-id-a"><button type="button" class="wr-btn is-primary" data-action="game-history-retry" data-fid="game-history-retry">${esc(t('Try again'))}</button></p></div>`;
    } else {
      body = `<div class="wr-who"><span class="wr-who-n">${esc(srv.who.name)}</span><span class="wr-who-e">${esc(srv.who.email)}</span></div>${historyBody()}`;
    }
    return `<section class="wr-game is-chooser is-history" data-mode="" data-view="history" data-route="historial" aria-labelledby="wr-h">
        <header class="wr-hud" id="wr-hud">${hudHtml()}</header>
        <div class="wr-select"><h2 class="wr-h2 wr-hist-h">${esc(t('My attempts'))}</h2>${body}</div>
        <div id="wr-dialogs"></div>
      </section>`;
  }

  /* ---- The competitive select screen -------------------------------------------------------------- */

  // The badge: a pixel medal on a ribbon in the mode's colour; grey until the server records it.
  function medal(m, st, big = false) {
    return `<svg class="wr-medal is-${st}${big ? ' is-big' : ''}" viewBox="0 0 16 18" aria-hidden="true" shape-rendering="crispEdges">
        <path class="wr-medal-r" d="M3 0h4v6H6v1H4V6H3zM9 0h4v6h-1v1h-2V6H9z"/>
        <path class="wr-medal-o" d="M5 6h6v1h2v2h1v4h-1v2h-2v1H5v-1H3v-2H2V9h1V7h2z"/>
        <path class="wr-medal-d" d="M5 7h6v1h1v1h1v4h-1v1h-1v1H5v-1H4v-1H3V9h1V8h1z"/>
        <path class="wr-medal-s" d="M7 9h2v1h1v1H9v2H7v-2H6v-1h1z"/>
      </svg>`;
  }

  function compSelectHtml() {
    if (!configured()) return `<div class="wr-card wr-srv-off"><p>${esc(t('The competition is not set up yet.'))}</p></div>`;
    if (!session) return signInHtml();
    if (!srv) {
      return `<div class="wr-card wr-srv-off"><p class="wr-msg is-err">${esc(compMsg || t(ERR.offline))}</p>
        <p class="wr-id-a"><button type="button" class="wr-btn is-primary" data-action="game-comp-retry" data-fid="game-comp-retry">${esc(t('Try again'))}</button></p></div>`;
    }
    if (!srv.who.name) return nameHtml();
    const tiles = PLAY_MODES.map((m) => {
      const x = srv.modes[m] || { badge: null, left: 0, active: null };
      const st = x.badge ? 'earned' : 'none';
      const go = x.active ? t('Continue · rung {n}', { n: x.active.level }) : x.left > 0 ? loc(['Start', 'Empezar']) : t('Come back tomorrow');
      const off = !x.active && x.left <= 0;
      const left = t('{n} of {total} left today', { n: x.left, total: daily() });
      const badge = x.badge ? t('Badge earned on {date}', { date: fmtDay(x.badge.earned_at) }) : t('No badge yet');
      const inner = `${medal(m, st)}
          <span class="wr-tile-kw">${esc(modeKw(m))}</span>
          <span class="wr-tile-name">${esc(modeName(m))}</span>
          <span class="wr-tile-go">${esc(go)}</span>
          <span class="wr-tile-left">${esc(left)}</span>
          <span class="sr-only">${esc(badge)}</span>
          ${x.badge ? `<span class="wr-tile-badge">${esc(badge)}</span>` : ''}`;
      return off
        ? `<li class="wr-tile-li"><div class="wr-tile is-comp is-${m} is-${st} is-off" data-fid="game-comp-${m}" aria-disabled="true">${inner}</div></li>`
        : `<li class="wr-tile-li"><a class="wr-tile is-comp is-${m} is-${st}${x.active ? ' is-live' : ''}" href="#/game/comp/${m}" data-fid="game-comp-${m}">${inner}</a></li>`;
    }).join('');
    const got = PLAY_MODES.filter((m) => srv.modes[m] && srv.modes[m].badge).length;
    return `<div class="wr-who"><span class="wr-who-n">${esc(srv.who.name)}</span><span class="wr-who-e">${esc(srv.who.email)}</span>
        <a class="wr-btn is-small" href="#/game/historial" data-fid="game-history">${esc(t('My attempts'))}</a>
        <button type="button" class="wr-btn is-small" data-action="game-logout" data-fid="game-logout">${esc(t('Sign out'))}</button>
        <span class="wr-who-badges">${esc(t('{n} of 5 badges', { n: got }))}</span></div>
      ${compMsg ? `<p class="wr-msg is-err wr-srv">${esc(compMsg)}</p>` : ''}
      <ul class="wr-modes is-comp" id="wr-modes" aria-labelledby="wr-modes-h">${tiles}</ul>`;
  }

  /* ---- An attempt: rules, start, clock, telemetry ----------------------------------------------------- */

  function startScreen() {
    view = 'start';
    showPage();
  }

  /* The rules before the clock starts (4 short lines), as a dialog over the empty stage. */
  function startHtml() {
    const x = side === 'comp' && srv ? srv.modes[mode] : null;
    const left = x ? x.left : daily();
    const rules = [
      t('You have {n} minutes from the moment you start.', { n: minutes() }),
      t('Paste is off: type your SQL.'),
      t('The three lifelines work once each, as in study.'),
      t('Reach the million for the badge. No solutions are shown at the end.'),
    ];
    const can = side === 'test' || left > 0;
    return `<section class="wr-game is-chooser is-comp" data-mode="${mode}" data-side="${side}" data-view="start" data-route="${esc(curRoute)}" aria-labelledby="wr-h">
        <header class="wr-hud" id="wr-hud">${hudHtml()}</header>
        <div class="wr-start">
          <div class="wr-modal is-rules" role="dialog" aria-modal="true" aria-labelledby="wr-rules-h">
            <header class="wr-modal-h">${kindChip(mode, true)}<h2 id="wr-rules-h">${esc(side === 'test' ? t('Teacher test') : t('{n} of {total} left today', { n: left, total: daily() }))}</h2></header>
            <div class="wr-modal-b"><ol class="wr-rules">${rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
              ${compMsg ? `<p class="wr-msg is-err wr-srv">${esc(compMsg)}</p>` : ''}</div>
            <div class="wr-modal-a">
              ${can ? `<button type="button" class="wr-btn is-primary" data-action="game-comp-start" data-fid="game-comp-start">${esc(t('Start the attempt'))}</button>`
    : `<p class="wr-tomorrow">${esc(t('Come back tomorrow'))}</p>`}
              <button type="button" class="wr-btn" data-action="game-comp-cancel" data-fid="game-comp-cancel">${esc(t('Back to modes'))}</button>
            </div>
          </div>
        </div>
      </section>`;
  }

  /* Tab inside a container (the rules dialog). */
  function trapIn(e, box) {
    if (!box) return;
    const items = [...box.querySelectorAll('button:not([disabled]), [href], input, textarea')];
    if (!items.length) return;
    const first = items[0];
    const lastEl = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); } else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); } else if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }

  /* A new attempt: the server draws the questions and starts the clock. */
  async function startAttempt() {
    if (!isComp() || !mode || busy) return;
    const m = mode;
    const sd = side;
    busy = true;
    compMsg = '';
    let r;
    try { r = await api('start', { mode: m, test: sd === 'test' }); } catch (e) {
      busy = false;
      if (e instanceof CompError && e.code === 'state') { await reloadCurrent(sd, m); return; }   // one is running: continue it
      if (e instanceof CompError && e.code === 'limit' && srv && srv.modes[m]) { srv.modes[m].left = 0; publish(srv); }
      onCompError(e);
      return;
    }
    busy = false;
    if (side !== sd || mode !== m) return;
    if (sd === 'comp' && srv && srv.modes[m]) { srv.modes[m].left = Math.max(0, srv.modes[m].left - 1); srv.modes[m].active = r.attempt; publish(srv); }
    if (sd === 'test' && srv && srv.modes[m]) srv.modes[m].testActive = r.attempt;
    consoleText = START_SQL;
    resetTransient();
    lastRun = { id: null, sql: '' };
    tele = null;
    applyView(r.attempt, sd);
    view = 'run';
    showPage();
    const h = document.getElementById('wr-q-h');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    announce(t('The attempt has started: {n} minutes.', { n: minutes() }));
  }

  /* The server's view again (after a conflict, or when the clock runs out). */
  async function reloadCurrent(sd = side, m = mode) {
    const id = (sd === 'test' ? testRuns : compRuns)[m] && att ? att.id : (srv && srv.modes[m] && (sd === 'test' ? srv.modes[m].testActive : srv.modes[m].active) || {}).id;
    try {
      if (id) { const r = await api('current', { attemptId: id }); applyView(r.attempt, sd); } else { srv = await api('status'); const v = srv.modes[m] && (sd === 'test' ? srv.modes[m].testActive : srv.modes[m].active); if (v) applyView(v, sd); }
    } catch (e) { onCompError(e, 'out'); return; }
    if (side !== sd || mode !== m) return;
    view = state ? 'run' : 'start';
    if (state && !playing()) { showPage(); finish(); return; }
    showPage();
  }

  const clockText = () => {
    if (!att || !att.deadline) return '';
    const ms = Math.max(0, Date.parse(att.deadline) - now());
    const mm = Math.floor(ms / 60000);
    const ss = Math.floor((ms % 60000) / 1000);
    return `${mm}:${String(ss).padStart(2, '0')}`;
  };
  const clockLow = () => !!att && Date.parse(att.deadline) - now() < 5 * 60000;
  const CLOCK_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M5 1h6v2h2v2h2v6h-2v2h-2v2H5v-2H3v-2H1V5h2V3h2zM5 4v1H4v6h1v1h6v-1h1V5h-1V4zM7 5h2v3h2v2H7z"/></svg>';
  const clockHtml = () => (playing() && att
    ? `<span class="wr-clock${clockLow() ? ' is-low' : ''}" id="wr-clock" role="timer" aria-label="${esc(t('Time left'))}">${CLOCK_ICON}<span id="wr-clock-t">${esc(clockText())}</span></span>`
    : '');

  /* The clock of an attempt on screen: the countdown from the server's deadline, the time spent on the question
     (only while the page is visible), leaving the tab, and the end when the deadline passes. */
  function startClock() {
    stopClock();
    if (!isComp() || !playing()) return;
    const onBlur = () => { if (playing() && onPage()) bumpTele('blur'); };
    const onVis = () => { if (document.visibilityState === 'hidden') onBlur(); };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    clock = { timer: setInterval(() => guard(tick), 1000), last: Date.now(), saved: Date.now(), onBlur, onVis, ending: false };
  }
  function stopClock() {
    if (!clock) return;
    clearInterval(clock.timer);
    window.removeEventListener('blur', clock.onBlur);
    document.removeEventListener('visibilitychange', clock.onVis);
    clock = null;
  }
  function tick() {
    if (!isComp() || !att || !onPage()) return;
    const t0 = Date.now();
    if (clock && tele && playing() && document.visibilityState === 'visible') tele.ms = (Number(tele.ms) || 0) + (t0 - clock.last);
    if (clock) clock.last = t0;
    const el = document.getElementById('wr-clock');
    if (el) { el.classList.toggle('is-low', clockLow()); const tx = document.getElementById('wr-clock-t'); if (tx) tx.textContent = clockText(); }
    if (playing() && !busy && clock && !clock.ending && now() > Date.parse(att.deadline)) {
      clock.ending = true;                         // the server ends it; the page asks once
      return reloadCurrent();
    }
    if (clock && tele && t0 - clock.saved > 5000) { clock.saved = t0; teleStore.save(tele); }
    return undefined;
  }

  /* A paste or a drop into the editor in an attempt: refused, counted, and said once. */
  function pasteBlocked() {
    bumpTele('paste');
    const box = document.querySelector('#view .wr-console');
    if (!box) return;
    let note = document.getElementById('wr-paste');
    if (!note) {
      note = document.createElement('p');
      note.id = 'wr-paste';
      note.className = 'wr-msg is-warn wr-paste';
      note.setAttribute('role', 'status');
      box.insertBefore(note, box.querySelector('.wr-console-actions'));
    }
    note.textContent = t('Paste is off here: type your SQL.');
    clearTimeout(note.hideTimer);
    note.hideTimer = setTimeout(() => { if (note.isConnected) note.remove(); }, 4000);
  }

  /* ---- Lock in, rescue, walk away, lifelines: the server judges ------------------------------------- */

  /* Why the server refused a statement before running it (it costs nothing): the study wording. */
  function refusalHtml(r) {
    if (!r) return '';
    if (r.reason === 'oracle') {
      const d = r.detail || {};
      return `<div class="wr-msg is-err wr-check"><p>${esc(t('Oracle would reject this:'))} <code>${esc([d.code, d.text].filter(Boolean).join(': '))}</code></p></div>`;
    }
    const msg = r.reason === 'wrong-kind' ? t(KIND_MSG[curKind()] || KIND_MSG.select) : t(CHECK_MSG[r.reason] || CHECK_MSG.unsupported);
    let extra = '';
    if (r.reason === 'lint' && Array.isArray(r.detail)) extra = `<div class="wr-msg is-warn">${r.detail.map((l) => `<p>${esc(t(l.msg))} ${esc(l.fix ? t(l.fix) : '')}</p>`).join('')}</div>`;
    else if (r.reason === 'unsupported' && typeof r.detail === 'string') extra = `<p>${esc(detailText(r.detail))}</p>`;
    return `<div class="wr-msg is-warn wr-check"><p>${esc(msg)}</p>${r.reason === 'unsupported' ? extra : ''}</div>${r.reason === 'lint' ? extra : ''}`;
  }

  async function compLock(sql) {
    const m = mode;
    const sd = side;
    const here = () => side === sd && mode === m;
    const lvl = state.level;
    const t0 = performance.now();
    setBusy(true);
    flash = null;
    say(String(H().suspense || ''));
    const rung = document.querySelector(`#wr-ladder li[data-level="${lvl}"]`);
    if (rung) {
      if (!reduceMotion) rung.classList.add('is-suspense');
      rung.setAttribute('tabindex', '-1');
      rung.focus({ preventScroll: true });
    }
    let r;
    try {
      r = await apiSlot('submit', { attemptId: att.id, sql, tele: teleOut() });
    } catch (e) {
      busy = false;
      document.querySelectorAll('#wr-ladder li.is-suspense').forEach((li) => li.classList.remove('is-suspense'));
      if (onPage()) setBusy(false);
      if (e instanceof CompError && (e.code === 'expired' || e.code === 'state')) { await reloadCurrent(sd, m); return; }
      if (tooFast(e)) { hostText = t('Too fast: wait a moment and lock in again.'); output = `<div class="wr-msg is-warn"><p>${esc(hostText)}</p></div>`; outVersion++; if (onPage()) refresh(); return; }
      onCompError(e, 'out');
      return;
    }
    await delay(reduceMotion ? 0 : Math.max(0, SUSPENSE_MS - (performance.now() - t0)));
    document.querySelectorAll('#wr-ladder li.is-suspense').forEach((li) => li.classList.remove('is-suspense'));
    busy = false;
    applyView(r.attempt, sd);
    if (!here()) { if (onPage()) setBusy(false); return; }
    if (r.verdict === 'refused') {
      hostText = String(line(H().ask, lvl));
      output = refusalHtml(r.refusal);
      outVersion++;
      if (onPage()) { refresh(); setBusy(false); }
      announce(document.querySelector('#wr-out') ? document.querySelector('#wr-out').textContent.trim() : '');
      return;
    }
    if (r.verdict === 'won' || r.verdict === 'lost') {
      flash = { level: lvl, cls: r.verdict === 'won' ? 'is-flash-ok' : 'is-flash-bad' };
      if (sd === 'comp' && srv && srv.modes[m]) { srv.modes[m].active = null; if (r.verdict === 'won' && !r.attempt.test) { srv.modes[m].badge = { earned_at: r.attempt.finishedAt || new Date(now()).toISOString() }; publish(srv); } }
      finish();
      return;
    }
    if (r.verdict === 'pass') {
      const safe = GameCore.SAFE.includes(lvl);
      const bandStart = GameCore.BANDS.find((b) => b.from === state.level);
      let text = safe ? fill(H().safe, { prize: money(GameCore.prize(lvl)) }) : line(H().correct, lvl);
      if (bandStart && H().bands && H().bands[bandStart.key]) text = `${text} ${H().bands[bandStart.key]}`;
      hostText = text;
      flash = { level: lvl, cls: 'is-flash-ok' };
      output = '';
      outVersion++;
      review = null;
      lifeMsg = null;
      trayLife = null;
      if (!onPage()) return;
      refresh();
      const card = document.getElementById('wr-question');
      const h = document.getElementById('wr-q-h');
      if (card && card.scrollIntoView) card.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      return;
    }
    // pending: wrong, with Review unused: the rescue.
    pendingSql = sql;
    flash = { level: lvl, cls: 'is-flash-bad' };
    hostText = String(H().wrong || '');
    output = `<div class="wr-msg is-err"><p>${esc(t('That is not the answer'))}</p></div>`;
    outVersion++;
    if (!onPage()) return;
    refresh();
    if (!dialog) openDialog({ kind: 'rescue', sql, back: 'game-lock' });
  }

  async function compRescue(use) {
    if (!att || busy) return;
    const sd = side;
    busy = true;
    // The dialog stays open (its buttons busy) until the server answers.
    document.querySelectorAll('#wr-rescue button').forEach((b) => { b.disabled = true; });
    let r;
    try { r = await apiSlot('rescue', { attemptId: att.id, use }); } catch (e) {
      busy = false;
      document.querySelectorAll('#wr-rescue button').forEach((b) => { b.disabled = false; });
      if (e instanceof CompError && (e.code === 'expired' || e.code === 'state')) { closeDialog(false); await reloadCurrent(); return; }
      if (tooFast(e)) { const n = document.querySelector('#wr-rescue .wr-modal-note'); if (n) n.textContent = t('Too fast: wait a moment and lock in again.'); return; }
      closeDialog(false);
      onCompError(e, 'out');
      return;
    }
    busy = false;
    closeDialog(false);
    applyView(r.attempt, sd);
    if (!use) { if (srv && srv.modes[mode] && sd === 'comp') srv.modes[mode].active = null; finish(); return; }
    hostText = t('Review is used. Fix your query and lock it in again.');
    review = { id: currentId(), sql: pendingSql, items: r.diag || [], checks: r.checks || null };
    trayLife = 'review';
    pendingSql = '';
    if (!onPage()) return;
    refresh();
    focusCard('review');
  }

  async function compWalk() {
    if (!att) return;
    closeDialog(false);
    busy = true;
    let r;
    try { r = await api('walk', { attemptId: att.id }); } catch (e) {
      busy = false;
      if (e instanceof CompError && (e.code === 'expired' || e.code === 'state')) { await reloadCurrent(); return; }
      onCompError(e, 'out');
      return;
    }
    busy = false;
    applyView(r.attempt);
    if (srv && srv.modes[mode] && side === 'comp') srv.modes[mode].active = null;
    finish();
  }

  async function compLife(name) {
    if (!att || locked() || !playing() || state.used[name]) return;
    const id = currentId();
    lifeMsg = null;
    let sql;
    if (name === 'review') {
      sql = lastRun.id === id ? lastRun.sql : '';
      if (!sql.trim()) {
        lifeMsg = { id, k: 'Review checks your last Run or Lock in on this question. Run a query first: Review is still unused.' };
        refresh();
        announce(t(lifeMsg.k));
        return;
      }
    }
    setBusy(true);
    let r;
    try { r = await apiSlot('lifeline', { attemptId: att.id, name, ...(sql ? { sql } : {}) }); } catch (e) {
      busy = false;
      if (onPage()) setBusy(false);
      if (tooFast(e)) { lifeMsg = { id, k: 'Too fast: wait a moment and lock in again.' }; refresh(); return; }
      if (e instanceof CompError && (e.code === 'expired' || e.code === 'state')) { await reloadCurrent(); return; }
      onCompError(e, 'out');
      return;
    }
    setBusy(false);
    applyView(r.attempt);
    if (name === 'review') {
      if (!r.diag) { lifeMsg = { id, k: 'Review checks your last Run or Lock in on this question. Run a query first: Review is still unused.' }; refresh(); return; }
      review = { id, sql, items: r.diag, checks: r.checks || null };
    }
    trayLife = name;
    if (!onPage()) return;
    refresh();
    focusCard(name);
  }

  /* Key clause: the shape the server measured (select: columns and rows; DML: rows changed; DDL: none). */
  function compShape(el) {
    const q = att && att.question;
    const sh = q && q.clause ? q.clause.shape : null;
    if (!sh) { el.textContent = ''; return; }
    if (Number.isFinite(sh.cols)) {
      el.textContent = t('The answer has {cols} and {rows}.', {
        cols: sh.cols === 1 ? t('1 column') : t('{n} columns', { n: sh.cols }),
        rows: sh.rows === 1 ? t('1 row') : t('{n} rows', { n: sh.rows }),
      });
      return;
    }
    const n = Number(sh.changes) || 0;
    const k = q.mode;
    const key = { insert: ['The answer inserts 1 row.', 'The answer inserts {n} rows.'], update: ['The answer updates 1 row.', 'The answer updates {n} rows.'], delete: ['The answer deletes 1 row.', 'The answer deletes {n} rows.'] }[k];
    el.textContent = key ? t(key[n === 1 ? 0 : 1], { n }) : '';
  }

  /* ---- The end of an attempt: no badge, or the certificate ------------------------------------------- */

  function compEndHtml() {
    const E = GAME_TEXT.end || {};
    const status = att ? att.status : state.status;
    const heading = status === 'expired' ? t('Time is up') : String(E[state.status] || state.status);
    const x = side === 'comp' && srv ? srv.modes[mode] : null;
    const left = x ? x.left : 1;
    const back = side === 'test'
      ? `<button type="button" class="wr-btn" data-action="game-modes" data-fid="game-choose">${esc(t('Back to teacher mode'))}</button>`
      : `<a class="wr-btn" href="#/game" data-fid="game-choose">${esc(t('Choose another mode'))}</a>`;
    const again = side === 'test' || left > 0
      ? `<button type="button" class="wr-btn is-primary" data-action="game-comp-again" data-fid="game-again">${esc(t('Try again (new questions)'))}</button>`
      : `<span class="wr-tomorrow">${esc(t('Come back tomorrow'))}</span>`;
    return `<section class="wr-end" id="wr-end" data-status="${state.status}" aria-labelledby="wr-end-h">
        <div class="wr-end-plate is-comp">
          <p class="wr-end-k">${esc(t('Rungs answered'))}</p>
          <p class="wr-end-prize" id="wr-end-prize">${answered()} / ${GameCore.LADDER.length}</p>
        </div>
        <div class="wr-card wr-end-card">
          <h2 id="wr-end-h" class="wr-end-title" tabindex="-1">${esc(heading)}</h2>
          <div class="wr-end-lead"><p>${esc(side === 'test' ? t('A teacher test: no badge.') : t('No badge this time. A new attempt draws new questions.'))}</p>
            ${side === 'comp' ? `<p class="wr-end-left">${esc(t('{n} of {total} left today', { n: left, total: daily() }))}</p>` : ''}</div>
          <p class="wr-end-actions">${again}${back}</p>
        </div>
      </section>`;
  }

  /* The certificate: for information (the badge itself is the server's record), printable. */
  function certHtml() {
    const test = side === 'test' || !!state.test;
    const who = (srv && srv.who) || {};
    const mins = minutesOf(att && att.startedAt, att && att.finishedAt);
    const back = test
      ? `<button type="button" class="wr-btn" data-action="game-modes" data-fid="game-choose">${esc(t('Back to teacher mode'))}</button>`
      : `<a class="wr-btn" href="#/game" data-fid="game-choose">${esc(t('Choose another mode'))}</a>`;
    return `<section class="wr-end is-diploma" id="wr-end" data-status="won" aria-labelledby="wr-end-h">
        <article class="wr-cert is-${mode}${test ? ' is-test' : ''}">
          <header class="wr-cert-top"><span>${esc(GAME_TEXT.title)}</span><span class="wr-cert-kind">${esc(t('Certificate'))}</span></header>
          <div class="wr-cert-body">
            ${medal(mode, 'earned', true)}
            <div class="wr-cert-who">
              <h2 id="wr-end-h" class="wr-cert-name" tabindex="-1">${esc(who.name || '')}</h2>
              <p class="wr-cert-mail">${esc(who.email || '')}</p>
              <p class="wr-cert-line">${esc(t('reached {prize} in {mode}', { prize: money(GameCore.LADDER[GameCore.LADDER.length - 1]), mode: modeKw(mode) }))}</p>
            </div>
            <span class="wr-stamp${test ? ' is-test' : ''}" aria-hidden="true">${test ? 'TEST' : esc(modeKw(mode))}</span>
          </div>
          <dl class="wr-cert-meta">
            <div><dt>${esc(t('Date'))}</dt><dd>${esc(fmtDate(att && att.finishedAt))}</dd></div>
            <div><dt>${esc(t('Time'))}</dt><dd>${esc(mins === null ? '—' : t('{n} min', { n: mins }))}</dd></div>
          </dl>
          <p class="wr-cert-rec">${esc(test ? t('A teacher test: no badge is recorded.') : t('Your badge is recorded. This certificate is for your information.'))}</p>
          <p class="wr-cert-actions"><button type="button" class="wr-btn" data-action="game-print" data-fid="game-print">${esc(t('Print'))}</button></p>
        </article>
        <p class="wr-end-actions">${back}</p>
      </section>`;
  }

  /* ---- Teacher mode (#/game/profesor, not linked anywhere) -------------------------------------------- */

  const isTeacher = () => !!(srv && srv.who && srv.who.role === 'teacher');
  const FLAG_TEXT = {
    fast: 'Under 60 s on a hard rung',
    'no-runs': 'No Run before Lock in',
    pasted: 'Tried to paste',
    'left-tab': 'Left the tab 3 times or more',
    'no-table': 'Reads no table',
    'literal-list': 'A list of literal ids',
    'no-clause': 'None of the key clause words',
    forced: 'Forced by the teacher',
    streak: 'Three fast answers in a row',
  };
  // Flags the browser reports (Runs, pastes, leaving the tab) are indicative only; the rest are measured by the server.
  // A flag is a code, or { code, selfReported } (accepted both ways).
  const SELF_REPORTED = ['no-runs', 'pasted', 'left-tab'];
  function flagsHtml(f) {
    if (!f || !f.length) return '';
    // 'self:pasted' (the server's way of storing a browser report), a plain code, or { code, selfReported }.
    const all = f.map((x) => {
      if (typeof x === 'string') { const self = /^self:/.test(x); const code = x.replace(/^self:/, ''); return { code, self: self || SELF_REPORTED.includes(code) }; }
      const code = String((x && x.code) || '').replace(/^self:/, '');
      return { code, self: x && x.selfReported !== undefined ? !!x.selfReported : SELF_REPORTED.includes(code) };
    });
    const li = (x) => `<li>${esc(t(FLAG_TEXT[x.code] || String(x.code)))}</li>`;
    const srv = all.filter((x) => !x.self);
    const self = all.filter((x) => x.self);
    return `${srv.length ? `<p class="wr-flag-k">${esc(t('Measured by the server'))}</p><ul class="wr-flags">${srv.map(li).join('')}</ul>` : ''}
      ${self.length ? `<p class="wr-flag-k is-self">${esc(t('Self-reported (indicative)'))}</p><ul class="wr-flags is-self">${self.map(li).join('')}</ul>` : ''}`;
  }

  /* Teacher mode: a bar (who, Try a mode, Export, Refresh, Sign out), then the board: the accounts on the left (search,
     role filter, five badge dots each) and the selected account's record on the right (badges, the oral check, its
     attempts with a real/test filter; an attempt opens in place, under its row, and closes with Close or Esc). */
  function teacherHtml() {
    let body;
    if (!configured()) body = `<div class="wr-card wr-srv-off"><p>${esc(t('The competition is not set up yet.'))}</p></div>`;
    else if (!session) body = signInHtml();
    else if (!srv) body = compSelectHtml();
    else if (!isTeacher()) body = `<div class="wr-card wr-srv-off"><p>${esc(t('This area is for teachers.'))}</p></div>`;
    else {
      const testing = teacher.tab === 'test';
      const toggle = testing
        ? `<button type="button" class="wr-btn is-small" data-action="game-teacher-tab" data-value="students" data-fid="game-teacher-tab-students">${esc(t('Back to the panel'))}</button>`
        : `<button type="button" class="wr-btn is-small" data-action="game-teacher-tab" data-value="test" data-fid="game-teacher-tab-test">${esc(t('Try a mode'))}</button>`;
      body = `<div class="wr-tbar">
          <p class="wr-tbar-who"><span class="wr-who-n">${esc(srv.who.name || '')}</span><span class="wr-who-e">${esc(srv.who.email)}</span></p>
          <div class="wr-tbar-acts">${toggle}
            ${testing ? '' : `<details class="wr-menu" id="wr-export"><summary class="wr-btn is-small" data-fid="game-teacher-export">${esc(t('Export'))}</summary>
              <div class="wr-menu-list">
                <button type="button" class="wr-menu-item" data-action="game-teacher-csv" data-value="summary" data-fid="game-teacher-csv">${esc(t('Summary per account (CSV)'))}<span>${esc(t('Badges, attempts and best rung per mode'))}</span></button>
                <button type="button" class="wr-menu-item" data-action="game-teacher-csv" data-value="answers" data-fid="game-teacher-csv-answers">${esc(t('Every answer (CSV)'))}<span>${esc(t('One line per answer, real and test'))}</span></button>
              </div></details>
            <button type="button" class="wr-btn is-small" data-action="game-teacher-refresh" data-fid="game-teacher-refresh">${esc(t('Refresh'))}</button>`}
            <button type="button" class="wr-btn is-small" data-action="game-logout" data-fid="game-logout">${esc(t('Sign out'))}</button>
          </div>
        </div>
        ${compMsg ? `<p class="wr-msg is-err wr-srv">${esc(compMsg)}</p>` : ''}
        <div class="wr-tpanel" id="wr-tpanel">${testing ? testPanelHtml() : boardHtml()}</div>`;
    }
    return `<section class="wr-game is-chooser is-teacher" data-mode="" data-view="teacher" data-route="profesor" aria-labelledby="wr-h">
        <header class="wr-hud" id="wr-hud">${hudHtml()}</header>
        <div class="wr-select"><h2 class="wr-h2 wr-teacher-h">${esc(t('Teacher mode'))}</h2>${body}</div>
        <div id="wr-dialogs"></div>
      </section>`;
  }

  const STATUS_TEXT = { playing: 'Playing', pending: 'Rescue pending', won: 'Won', lost: 'Lost', walked: 'Walked away', expired: 'Out of time' };
  const statusText = (s) => t(STATUS_TEXT[s] || String(s));
  const badgeCount = (s) => PLAY_MODES.filter((m) => s.badges[m]).length;

  /* The accounts that pass the role filter and the search: students first, then teachers. */
  function peopleOf() {
    const f = teacher.filter;
    const q = teacher.q.trim().toLowerCase();
    const all = teacher.list || [];
    return [...all.filter((s) => s.role !== 'teacher'), ...all.filter((s) => s.role === 'teacher')]
      .filter((s) => f.role === 'all' || (f.role === 'teacher' ? s.role === 'teacher' : s.role !== 'teacher'))
      .filter((s) => !q || `${s.name || ''} ${s.email}`.toLowerCase().includes(q));
  }
  /* The account on the right: the chosen one while it passes the role filter, otherwise the first listed. */
  function selectedOf(people) {
    const all = teacher.list || [];
    const f = teacher.filter;
    const chosen = all.find((s) => s.user_id === teacher.sel);
    if (chosen && (f.role === 'all' || (f.role === 'teacher') === (chosen.role === 'teacher'))) return chosen;
    return people[0] || null;
  }

  function boardHtml() {
    if (teacher.loading && !teacher.list) return `<p class="wr-load-msg" role="status">${esc(t('Loading…'))}</p>`;
    const f = teacher.filter;
    const people = peopleOf();
    const sel = selectedOf(people);
    if (sel) teacher.sel = sel.user_id;
    const seg = (v, label) => `<button type="button" class="wr-side-btn" data-action="game-teacher-filter" data-group="role" data-value="${v}" data-fid="game-tf-role-${v}" aria-pressed="${f.role === v}">${esc(label)}</button>`;
    return `<div class="wr-board">
        <aside class="wr-people" aria-label="${esc(t('Accounts'))}">
          <label class="sr-only" for="wr-tsearch">${esc(t('Search by name or email'))}</label>
          <input id="wr-tsearch" class="wr-input wr-tsearch" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(t('Search by name or email'))}" value="${esc(teacher.q)}">
          <div class="wr-sides is-small" role="group" aria-label="${esc(t('Who'))}">${seg('all', t('Everyone'))}${seg('student', t('Students'))}${seg('teacher', t('Teachers'))}</div>
          <ul class="wr-plist" id="wr-plist">${peopleListHtml(people, sel)}</ul>
        </aside>
        <div class="wr-ficha" id="wr-ficha">${sel ? fichaHtml(sel) : `<p class="wr-tag">${esc((teacher.list || []).length ? t('No account matches.') : t('No students yet.'))}</p>`}</div>
      </div>`;
  }

  function peopleListHtml(people, sel) {
    if (!people.length) return `<li class="wr-pnone">${esc(t('No account matches.'))}</li>`;
    return people.map((s) => {
      const n = badgeCount(s);
      const on = sel && sel.user_id === s.user_id;
      return `<li><button type="button" class="wr-person${s.all_five ? ' is-five' : ''}" data-action="game-teacher-person" data-value="${esc(s.user_id)}" data-fid="game-tp-${esc(s.user_id)}"${on ? ' aria-current="true"' : ''}>
          <span class="wr-person-n">${esc(s.name || '—')}${s.role === 'teacher' ? ` <span class="wr-dtag">${esc(t('Teacher'))}</span>` : ''}</span>
          <span class="wr-who-e">${esc(s.email)}</span>
          <span class="wr-pdots" role="img" aria-label="${esc(t('{n} of 5 badges', { n }))}">${PLAY_MODES.map((m) => `<i class="wr-pdot is-${m}${s.badges[m] ? ' is-on' : ''}" title="${esc(modeKw(m))}"></i>`).join('')}</span>
        </button></li>`;
    }).join('');
  }

  /* The selected account: who, the five badges, the oral check, the attempts. */
  function fichaHtml(s) {
    const f = teacher.filter;
    const n = badgeCount(s);
    const mine = (teacher.attempts || []).filter((a) => a.user_id === s.user_id);
    const atts = mine.filter((a) => f.kind === 'all' || (f.kind === 'test' ? a.test : !a.test));
    const seg = (v, label) => `<button type="button" class="wr-side-btn" data-action="game-teacher-filter" data-group="kind" data-value="${v}" data-fid="game-tf-kind-${v}" aria-pressed="${f.kind === v}">${esc(label)}</button>`;
    const badges = PLAY_MODES.map((m) => {
      const b = s.badges[m];
      const a = s.attempts[m] || { count: 0, best: 0 };
      const info = t('{n} attempts, best rung {best}', { n: a.count, best: a.best });
      return `<li class="wr-fb is-${m}${b ? ' is-on' : ''}">${b
        ? `<button type="button" class="wr-fb-in" data-action="game-teacher-attempt" data-value="${esc(b.attempt_id)}" data-fid="game-tatt-${esc(b.attempt_id)}" title="${esc(info)}">${medal(m, 'earned')}<span class="wr-fb-k">${esc(modeKw(m))}</span><span class="wr-fb-v">${esc(fmtDay(b.earned_at))}</span></button>`
        : `<span class="wr-fb-in" title="${esc(info)}">${medal(m, 'none')}<span class="wr-fb-k">${esc(modeKw(m))}</span><span class="wr-fb-v">${esc(a.count ? t('best {n}', { n: a.best }) : t('Not played'))}</span></span>`}</li>`;
    }).join('');
    const oral = teacher.oral && teacher.oralFor === s.user_id ? oralHtml() : '';
    return `<header class="wr-fhead">
          <div class="wr-fwho"><h3 class="wr-fname" id="wr-fh" tabindex="-1">${esc(s.name || s.email)}</h3>${s.role === 'teacher' ? `<span class="wr-dtag">${esc(t('Teacher'))}</span>` : ''}
            <span class="wr-who-e">${esc(s.email)}</span></div>
          ${n ? `<button type="button" class="wr-btn is-small" data-action="game-teacher-oral" data-value="${esc(s.user_id)}" data-fid="game-oral-${esc(s.user_id)}">${esc(t('Pick 2 at random'))}</button>` : ''}
        </header>
        <div class="wr-fbadges-row"><ul class="wr-fbadges" aria-label="${esc(t('{n} of 5 badges', { n }))}">${badges}</ul>
          <p class="wr-fcount${s.all_five ? ' is-five' : ''}">${s.all_five ? `${CHECK}${esc(t('All five'))}` : esc(t('{n} of 5 badges', { n }))}</p></div>
        ${oral}
        <div class="wr-fatt-h"><h4 class="wr-fatt-t">${esc(t('Attempts ({n})', { n: atts.length }))}</h4>
          <div class="wr-sides is-small" role="group" aria-label="${esc(t('Attempt kind'))}">${seg('all', t('All attempts'))}${seg('real', t('Real'))}${seg('test', t('Test'))}</div></div>
        ${atts.length ? `<ol class="wr-tatts">${atts.map(attemptRowHtml).join('')}</ol>` : `<p class="wr-tag">${esc(mine.length ? t('No attempts match the filters.') : t('No attempts yet.'))}</p>`}`;
  }

  function attemptRowHtml(a) {
    const open = !!(teacher.detail && teacher.detail.attempt && teacher.detail.attempt.id === a.id);
    const mins = minutesOf(a.started_at, a.finished_at);
    return `<li class="wr-trow${open ? ' is-open' : ''}${a.test ? ' is-test' : ''}">
        <div class="wr-trow-main">
          <span class="wr-tr-date">${esc(fmtDate(a.started_at))}</span>
          ${kindChip(a.mode)}
          ${a.test ? '<span class="wr-stamp is-test is-small">TEST</span>' : ''}
          <span class="wr-tr-res is-${esc(a.status)}">${a.badge ? medal(a.mode, 'earned') : ''}${esc(statusText(a.status))}</span>
          <span class="wr-tr-num">${esc(t('Rung {n}', { n: a.rung }))}</span>
          <span class="wr-tr-num">${esc(t('{right}/{answered} right', { right: a.right, answered: a.answered }))}</span>
          <span class="wr-tr-num">${esc(mins === null ? '—' : t('{n} min', { n: mins }))}</span>
          <button type="button" class="wr-btn is-small wr-tr-open" data-action="game-teacher-attempt" data-value="${esc(a.id)}" data-fid="game-tatt-row-${esc(a.id)}" aria-expanded="${open}">${esc(open ? t('Close') : t('Open'))}</button>
        </div>
        ${open ? detailHtml() : ''}
      </li>`;
  }

  function oralHtml() {
    const picks = teacher.oral || [];
    return `<section class="wr-card wr-oral-card" aria-labelledby="wr-oral-h">
        <header class="wr-tdetail-bar"><h4 class="wr-tdetail-t" id="wr-oral-h" tabindex="-1">${esc(t('Questions for the oral check'))}</h4>
          <button type="button" class="wr-btn is-small" data-action="game-teacher-oral" data-value="${esc(teacher.oralFor)}" data-fid="game-oral-again">${esc(t('Pick 2 others'))}</button>
          <button type="button" class="wr-btn is-small" data-action="game-teacher-oral-close" data-fid="game-oral-close">${esc(t('Close'))}</button></header>
        ${picks.length ? `<ol class="wr-vlist">${picks.map((p) => `<li class="wr-va is-oral">
          <header class="wr-rev-h">${kindChip(p.mode)}<span class="wr-rev-n">${esc(p.level)}</span></header>
          <div class="wr-rev-q">${paras(L(p.prompt))}</div>
          <p class="wr-rev-k">${esc(t('Student SQL'))}</p><pre class="wr-code is-small"><code>${esc(p.sql)}</code></pre>
          <p class="wr-rev-k">${esc(t('Reference solution'))}</p><pre class="wr-code is-small"><code>${esc(p.solution)}</code></pre>
          ${flagsHtml(p.flags)}</li>`).join('')}</ol>` : `<p>${esc(t('No badge answers to pick from.'))}</p>`}
      </section>`;
  }

  function detailHtml() {
    const d = teacher.detail;
    const a = d.attempt;
    const items = d.questions.map((q) => `<li class="wr-va${q.answers.some((x) => x.ok) ? ' is-ok' : q.answers.length ? ' is-bad' : ''}">
        <header class="wr-rev-h"><span class="wr-rev-n">${esc(q.level)}</span>${q.main_only ? `<span class="wr-dtag">${esc(t('main data only'))}</span>` : ''}</header>
        <div class="wr-rev-q">${paras(L(q.prompt))}</div>
        ${q.answers.map((x) => {
          const secs = Date.parse(x.answered_at) - Date.parse(x.shown_at);
          return `<div class="wr-tans ${x.ok ? 'is-ok' : 'is-bad'}">
            <p class="wr-rev-k">${x.ok ? `${CHECK}${esc(t('Right'))}` : `${CROSS}${esc(t('Wrong'))}`}${Number.isFinite(secs) ? ` · ${esc(t('{n} s', { n: Math.round(secs / 1000) }))}` : ''}${x.tele ? ` · ${esc(t('{n} runs', { n: x.tele.runs || 0 }))}` : ''}</p>
            <pre class="wr-code is-small"><code>${esc(x.sql || '')}</code></pre>${flagsHtml(x.flags)}</div>`;
        }).join('')}
        <p class="wr-rev-k">${esc(t('Reference solution'))}</p><pre class="wr-code is-small is-ref"><code>${esc(q.solution || '')}</code></pre>
      </li>`).join('');
    const mins = minutesOf(a.started_at, a.finished_at);
    return `<section class="wr-tdetail" aria-labelledby="wr-td-h">
        <p class="wr-tdetail-m" id="wr-td-h" tabindex="-1">${esc(fmtDate(a.started_at))} → ${esc(a.finished_at ? fmtDate(a.finished_at) : '—')} · ${esc(mins === null ? '—' : t('{n} min', { n: mins }))}</p>
        <ol class="wr-vlist">${items}</ol>
      </section>`;
  }

  function testPanelHtml() {
    return `<div class="wr-card wr-test-in">
        <p class="wr-id-t">${esc(t('A test attempt is marked TEST everywhere and never gives a badge.'))}</p>
        <ul class="wr-test-modes">${PLAY_MODES.map((m) => {
          const act = srv.modes[m] && srv.modes[m].testActive;
          return `<li><button type="button" class="wr-btn" data-action="game-test-start" data-value="${m}" data-fid="game-test-${m}">${kindChip(m)}${esc(act ? t('Continue · rung {n}', { n: act.level }) : modeName(m))}</button></li>`;
        }).join('')}</ul>
      </div>`;
  }

  /* Loads the accounts and every attempt (t-list). */
  async function teacherLoad() {
    teacher.loading = true;
    try { const r = await api('t-list'); teacher.list = r.students || []; teacher.attempts = r.attempts || []; compMsg = ''; } catch (e) { teacher.loading = false; onCompError(e); return; }
    teacher.loading = false;
    if (view === 'teacher' && onPage()) showPage();
  }
  const focusFid = (fid) => { const b = document.querySelector(`#view [data-fid="${fid}"]`); if (b) b.focus({ preventScroll: false }); return b; };
  /* Opens an attempt under its row (or closes it when it is the open one). */
  async function teacherAttempt(id) {
    if (teacher.detail && teacher.detail.attempt && teacher.detail.attempt.id === id) { teacherClose(); return; }
    let d;
    try { d = await api('t-attempt', { attemptId: id }); } catch (e) { onCompError(e); return; }
    teacher.detail = d;
    teacher.sel = d.attempt.user_id;
    const row = (teacher.attempts || []).find((x) => x.id === id);
    const isTest = row ? row.test : !!d.attempt.test;
    if ((teacher.filter.kind === 'real' && isTest) || (teacher.filter.kind === 'test' && !isTest)) teacher.filter.kind = 'all';
    showPage();
    const el = document.getElementById('wr-td-h');
    if (el) reveal(el);
  }
  function teacherClose() {
    const id = teacher.detail && teacher.detail.attempt && teacher.detail.attempt.id;
    teacher.detail = null;
    showPage();
    if (id) focusFid(`game-tatt-row-${id}`);
  }
  async function teacherOral(userId) {
    try { const r = await api('t-oral', { userId }); teacher.oral = r.picks || []; teacher.oralFor = userId; teacher.sel = userId; } catch (e) { onCompError(e); return; }
    showPage();
    const el = document.getElementById('wr-oral-h');
    if (el) reveal(el);
  }
  function teacherOralClose() {
    const id = teacher.oralFor;
    teacher.oral = null;
    teacher.oralFor = null;
    showPage();
    if (id) focusFid(`game-oral-${id}`);
  }
  function teacherPerson(id) {
    if (teacher.sel !== id) { teacher.sel = id; teacher.detail = null; }
    showPage();
    const el = document.getElementById('wr-fh');
    // On a phone the record is under the list: bring it into view; on a desktop it is beside it.
    if (el) { if (window.matchMedia('(max-width: 899px)').matches) reveal(el); else el.focus({ preventScroll: true }); }
  }
  /* The search re-draws the list only, so the field keeps the focus and the caret. */
  function teacherSearch(value) {
    teacher.q = String(value || '').slice(0, 80);
    const ul = document.getElementById('wr-plist');
    if (!ul) return;
    const people = peopleOf();
    ul.innerHTML = peopleListHtml(people, (teacher.list || []).find((s) => s.user_id === teacher.sel) || null);
  }
  async function teacherCsv(kind) {
    const k = kind === 'answers' ? 'answers' : 'summary';
    const day = new Date().toISOString().slice(0, 10);
    try {
      const r = await api('t-csv', { kind: k });
      downloadText(`query-for-a-million-${k === 'answers' ? 'answers' : 'summary'}-${day}.csv`, r.csv || '', 'text/csv');
      announce(t('CSV downloaded.'));
    } catch (e) { onCompError(e); }
  }

  /* Test: a server attempt of any mode, marked test (never a badge), with jump and force. */
  async function testStart(m) {
    if (!isTeacher() || !PLAY_MODES.includes(m)) return;
    teacherRun = m;
    enter('test', m);
    curRoute = 'profesor';
    const act = srv.modes[m] && srv.modes[m].testActive;
    if (act && live(act)) { applyView(act, 'test'); view = 'run'; showPage(); return; }
    delete testRuns[m];
    state = null;
    startScreen();
  }
  async function testJump() {
    if (side !== 'test' || !playing() || locked() || !att) return;
    busy = true;
    try { const r = await api('t-jump', { attemptId: att.id, level: GameCore.LADDER.length }); applyView(r.attempt); } catch (e) { busy = false; onCompError(e, 'out'); return; }
    busy = false;
    resetTransient();
    showPage();
  }
  async function testForce() {
    if (side !== 'test' || !playing() || locked() || !att) return;
    busy = true;
    let r;
    try { r = await api('t-force', { attemptId: att.id }); } catch (e) { busy = false; onCompError(e, 'out'); return; }
    busy = false;
    applyView(r.attempt);
    if (r.verdict === 'won') { finish(); return; }
    resetTransient();
    showPage();
  }

  function testBarHtml() {
    return `<div class="wr-testbar" role="group" aria-label="${esc(t('Teacher test'))}">
        <span class="wr-stamp is-test is-small" aria-hidden="true">TEST</span>
        <span class="wr-testbar-t">${esc(t('Teacher test'))}</span>
        ${playing() ? `<button type="button" class="wr-btn is-small" data-action="game-test-jump" data-fid="game-test-jump">${esc(t('Jump to rung 15'))}</button>
        <button type="button" class="wr-btn is-small" data-action="game-test-force" data-fid="game-test-force">${esc(t('Force right'))}</button>` : ''}
      </div>`;
  }

  /* ---- Events (delegated by js/main.js) -------------------------------------------------- */

  function onClick(el) { guard(() => click(el)); }

  function click(el) {
    switch (el.dataset.action) {
      case 'game-run': return runConsole();
      case 'game-lock': askLock(); break;
      case 'game-walk':
        if (locked() || !playing()) return;
        openDialog({ kind: 'walk', back: 'game-walk' });
        break;
      case 'game-confirm-yes': {
        const d = dialog;
        if (!d) return;
        if (d.kind === 'walk') { walkAway(); break; }
        closeDialog(false);
        const lock = document.querySelector('#view [data-fid="game-lock"]');
        if (lock) lock.focus({ preventScroll: true });
        return lockIn(d.sql);
      }
      case 'game-confirm-no': closeDialog(true); break;
      case 'game-rescue-yes': return rescueYes();
      case 'game-rescue-no': rescueNo(); break;
      case 'game-lifeline': useLife(el.dataset.life); break;
      case 'game-insert-template': {
        const q = question(currentId());
        if (q) putSql(q.template, t('Template typed in the console: change it to answer the question, then run it.'));
        break;
      }
      case 'game-again': if (mode && state) playAgain(); else show(routeMode() || ''); break;
      case 'game-modes':
        if (locked()) break;
        if (side === 'test' && (view === 'run' || view === 'start')) { teacherRun = null; enter('study', null); show('profesor'); break; }
        location.hash = '#/game';
        break;
      case 'game-side': {
        const v = el.dataset.value === 'comp' ? 'comp' : 'study';
        sideStore.save({ side: v });
        if (view !== 'select') break;
        if (v === 'comp' && configured() && (!sb || (session && !srv))) { compOpen('').then(() => { const b = document.querySelector('#view [data-fid="game-side-comp"]'); if (b) b.focus({ preventScroll: true }); }); break; }
        showPage();
        { const b = document.querySelector(`#view [data-fid="game-side-${v}"]`); if (b) b.focus({ preventScroll: true }); }
        break;
      }
      case 'game-login-send': if (!busy) return loginSend(); break;
      case 'game-login-verify': if (!busy) return loginVerify(); break;
      case 'game-login-back': login = { step: 'email', email: login.email }; compMsg = ''; showPage(); focusField('wr-login-email'); break;
      case 'game-name-save': if (!busy) return saveName(); break;
      case 'game-logout': return logout();
      case 'game-comp-retry': compMsg = ''; srv = null; return compOpen(routeMode() || '');
      case 'game-history-retry': compMsg = ''; hist = { data: null, loading: false }; return historyLoad();
      case 'game-comp-start': return startAttempt();
      case 'game-comp-cancel':
        if (side === 'test') { teacherRun = null; enter('study', null); show('profesor'); break; }
        location.hash = '#/game';
        break;
      case 'game-comp-again': startScreen(); break;
      case 'game-print': window.print(); break;
      case 'game-teacher-tab':
        teacher.tab = el.dataset.value === 'test' ? 'test' : 'students';
        showPage();
        focusFid(teacher.tab === 'test' ? 'game-teacher-tab-students' : 'game-teacher-tab-test');
        if (teacher.tab === 'students' && !teacher.list) return teacherLoad();
        break;
      case 'game-teacher-refresh': teacher.list = null; teacher.attempts = null; teacher.detail = null; teacher.oral = null; return teacherLoad();
      case 'game-teacher-attempt': return teacherAttempt(el.dataset.value);
      case 'game-teacher-oral': return teacherOral(el.dataset.value);
      case 'game-teacher-csv': { const menu = document.getElementById('wr-export'); if (menu) menu.open = false; return teacherCsv(el.dataset.value); }
      case 'game-teacher-oral-close': teacherOralClose(); break;
      case 'game-teacher-person': teacherPerson(el.dataset.value); break;
      case 'game-teacher-filter': {
        const g = el.dataset.group;
        const ok = { role: ['all', 'student', 'teacher'], kind: ['all', 'real', 'test'] };
        if (ok[g] && ok[g].includes(el.dataset.value)) teacher.filter[g] = el.dataset.value;
        showPage();
        focusFid(`game-tf-${g}-${teacher.filter[g]}`);
        break;
      }
      case 'game-test-start': return testStart(el.dataset.value);
      case 'game-test-jump': testJump(); break;
      case 'game-test-force': return testForce();
      case 'game-snippet': insertSnippet(el.dataset.snip || el.dataset.value); break;
      case 'game-ladder': {
        ladderOpen = !ladderOpen;
        const card = document.getElementById('wr-ladder-card');
        if (card) card.classList.toggle('is-open', ladderOpen);
        el.setAttribute('aria-expanded', String(ladderOpen));
        el.textContent = ladderOpen ? t('Hide prizes') : t('Show prizes');
        break;
      }
      case 'game-help': if (!locked()) openIntro(); break;
      case 'game-lang':
        if (el.dataset.value === LANG || locked()) break;
        editorText();
        saveDraft();
        save();
        setLang(el.dataset.value);
        break;
      case 'game-name': if (!locked()) insertName(el.dataset.name); break;
      case 'game-tray': {
        trayLife = el.dataset.life;
        const box = document.getElementById('wr-life-out');
        if (box) box.innerHTML = lifeOutHtml();
        afterChange();
        const b = document.querySelector(`#view [data-fid="game-tray-${trayLife}"]`);
        if (b) b.focus({ preventScroll: true });
        break;
      }
      case 'game-prompt': if (typer) { typer.finish(); typer = null; } break;
      case 'game-retry': render(); break;
      default:
    }
    return undefined;
  }

  function onInput(e) {
    if (e.target.id === 'wr-sql') { consoleText = e.target.value; saveDraft(); }
    else if (e.target.id === 'wr-tsearch') teacherSearch(e.target.value);
  }

  function onKeydown(e) {
    if (view === 'start' && e.key === 'Escape') { e.preventDefault(); location.hash = '#/game'; return; }
    // Teacher mode: Esc closes the Export menu, then the open attempt, then the oral check.
    if (view === 'teacher' && e.key === 'Escape' && !dialog) {
      const menu = document.getElementById('wr-export');
      if (menu && menu.open) { e.preventDefault(); menu.open = false; focusFid('game-teacher-export'); return; }
      if (teacher.detail) { e.preventDefault(); teacherClose(); return; }
      if (teacher.oral) { e.preventDefault(); teacherOralClose(); return; }
    }
    if (view === 'start' && e.key === 'Tab') { trapIn(e, document.querySelector('#view .wr-modal')); return; }
    if (e.key === 'Enter' && e.target.id === 'wr-login-email') { e.preventDefault(); if (!busy) guard(loginSend); return; }
    if (e.key === 'Enter' && e.target.id === 'wr-login-code') { e.preventDefault(); if (!busy) guard(loginVerify); return; }
    if (e.key === 'Enter' && e.target.id === 'wr-name') { e.preventDefault(); if (!busy) guard(saveName); return; }
    if (dialog && modalEl()) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (dialog.kind !== 'rescue') closeDialog(true);     // the rescue needs an answer: no silent choice
        return;
      }
      if (e.key === 'Tab') trapFocus(e);
      return;
    }
    if (e.target.id === 'wr-sql' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); guard(runConsole); }
  }

  /* ---- Page ------------------------------------------------------------------------------- */

  function render(rest) {
    teardown();
    dialog = null;
    const v = $('#view');
    if (!ready) {
      v.innerHTML = loadingHtml();
      boot();
    } else if (!data) {
      showBroken(lastError || new Error('no game'));
    } else show(rest || '');
    return mode ? `${modeName(mode)}: ${GAME_TEXT.title}` : GAME_TEXT.title;
  }

  // Leaving #/game: stop the typewriter and the theme observers; the run itself stays in memory.
  window.addEventListener('hashchange', () => { if (!onRoute()) { teardown(); dialog = null; } });

  /* Tests only: a deep copy of the state. */
  const debug = () => (state ? clone(state) : null);
  return { render, onClick, onInput, onKeydown, debug, logout, wide: true };
})();
