/* ---- Account menu: the round button at the right end of the app bar --------------------------------
   One button for who you are, how far you have got and the settings:
   - the centre is an outline person when signed out, your initials on ink when signed in
     (the competition's session, kept by supabase-js in localStorage['game-comp-auth']);
   - its border carries the course progress as an arc (same box as the search field and the Claude button);
   - the panel shows the account (and today's competitive attempts), the progress and the
     settings (language, course, theme: their logic stays in js/main.js).
   It never loads supabase-js: it reads the stored session and the last `status` the game cached
   (localStorage['game-comp-status']), and redraws on the game's 'comp-auth-change' event. */

const AccountMenu = (() => {
  const AUTH_KEY = 'game-comp-auth';
  const STATUS_KEY = 'game-comp-status';
  const btn = $('#account-btn');
  const who = $('#account-who');
  const comp = $('#account-comp');
  const prog = $('#account-progress');
  const out = $('#account-out');
  let pct = 0;

  const read = (store, key) => { try { return JSON.parse(store.getItem(key) || 'null'); } catch (e) { return null; } };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

  /* The stored session: signed in while it holds a refresh token (the library renews the access token). */
  function account() {
    const s = read(localStorage, AUTH_KEY);
    if (!s || !s.refresh_token || !s.user) return null;
    const email = String(s.user.email || '');
    const st = read(localStorage, STATUS_KEY);
    const mine = st && st.email === email ? st : null;   // a cache left by another account is ignored
    return { email, name: (mine && mine.name) || '', role: (mine && mine.role) || '', status: mine };
  }

  /* Two initials: from the name ("Ana García" → AG), else from the address (ana.garcia@ → AG). */
  function initials(a) {
    const words = (a.name || a.email.split('@')[0].replace(/[._-]+/g, ' ')).trim().split(/\s+/).filter(Boolean);
    const first = (w) => (w ? Array.from(w)[0] : '');
    return (first(words[0]) + (words.length > 1 ? first(words[words.length - 1]) : '')).toUpperCase() || '?';
  }

  const PERSON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 19.5c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6"/></svg>';

  function label(a) {
    return a
      ? t('Account and settings: {name}, progress {pct}%', { name: a.name || a.email, pct })
      : t('Account and settings: not signed in, progress {pct}%', { pct });
  }

  function drawButton(a) {
    btn.classList.toggle('is-in', !!a);
    btn.querySelector('.account-face').innerHTML = a ? `<span>${esc(initials(a))}</span>` : PERSON;
    btn.setAttribute('aria-label', label(a));
    btn.title = label(a);
  }

  function drawWho(a) {
    if (!a) {
      who.innerHTML = `<p class="account-name">${esc(t('You are not signed in'))}</p>
        <p class="account-note">${esc(t('Sign in with your @cunef.edu email to play Competitive and keep your attempts.'))}</p>
        <a class="btn btn-sm account-cta" href="#/game/entrar">${esc(t('Sign in'))}</a>`;
      return;
    }
    who.innerHTML = `${a.name ? `<p class="account-name">${esc(a.name)}</p>` : ''}
      <p class="account-mail">${esc(a.email)}</p>`;
  }

  /* Today's attempts per mode, from the last status the game cached today; otherwise a way to it. */
  function drawComp(a) {
    comp.hidden = !a;
    if (!a) { comp.innerHTML = ''; return; }
    const st = a.status;
    const h = `<p class="account-h">${esc(t('Competitive'))}</p>`;
    if (a.role === 'teacher') {
      comp.innerHTML = `${h}<a class="account-link" href="#/game/profesor">${esc(t('Teacher mode'))}</a>`;
      return;
    }
    const links = `<a class="account-link" href="#/game/historial">${esc(t('My attempts'))}</a>`;
    if (!st || st.day !== today() || !Array.isArray(st.modes)) {
      comp.innerHTML = `${h}<p class="account-note"><a href="#/game/entrar">${esc(t('Open the arcade to see today\'s attempts'))}</a></p>${links}`;
      return;
    }
    const got = st.modes.filter((m) => m.badge).length;
    const rows = st.modes.map((m) => `<li>
        <span class="account-kw">${esc(m.kw)}</span>
        <span class="account-left">${esc(t('{n} of {total} left', { n: m.left, total: st.daily }))}</span>
        <span class="account-badge${m.badge ? ' is-earned' : ''}" title="${esc(m.badge ? t('Badge earned') : t('No badge yet'))}"><span class="sr-only">${esc(m.badge ? t('Badge earned') : t('No badge yet'))}</span></span>
      </li>`).join('');
    comp.innerHTML = `${h}<p class="account-sub">${esc(t('Attempts left today'))}</p>
      <ul class="account-modes">${rows}</ul>
      <p class="account-sub">${esc(t('{n} of 5 badges', { n: got }))}</p>${links}`;
  }

  /* The button's progress: an arc laid over its 1.5px border (the border is the track), so the
     button keeps the size and edge of the search box and the Claude button beside it. The 3px arc
     covers the border (r 20.5 ± 1.5 reaches the 44px edge) and nothing is drawn at 0%. */
  function edgeRing() {
    const r = 20.5;
    const c = 2 * Math.PI * r;
    return `<svg class="pring" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <circle class="pring-fill" cx="22" cy="22" r="${r}" stroke-width="3" stroke-dasharray="${c}"
          stroke-dashoffset="${c * (1 - pct / 100)}" transform="rotate(-90 22 22)"${pct > 0 ? '' : ' opacity="0"'}/>
      </svg>`;
  }

  function drawProgress() {
    const ring = typeof ProgressPage !== 'undefined' ? ProgressPage.ring : null;
    btn.querySelector('.account-ring').innerHTML = edgeRing();
    prog.innerHTML = `<p class="account-h">${esc(t('Progress'))}</p>
      <a class="account-prog" href="#/progress"${location.hash === '#/progress' ? ' aria-current="page"' : ''}>
        ${ring ? ring(pct, 28) : ''}<span><b>${esc(t('{pct}% of the course', { pct }))}</b><span class="account-link">${esc(t('See your progress'))}</span></span>
      </a>`;
  }

  function draw() {
    const a = account();
    drawButton(a);
    drawWho(a);
    drawComp(a);
    out.hidden = !a;
    drawProgress();
  }

  /* Called by ProgressPage.updateButton whenever the overall percentage changes. */
  function setProgress(p) {
    pct = p;
    drawButton(account());
    drawProgress();
  }

  /* Sign out: through the game when it is loaded (it also ends the session on the server). */
  async function logout() {
    try {
      if (typeof GamePage !== 'undefined' && GamePage.logout) await GamePage.logout();
    } finally {
      try { localStorage.removeItem(AUTH_KEY); localStorage.removeItem(STATUS_KEY); } catch (e) { /* no storage */ }
      draw();
      announce(t('Signed out'));
    }
  }
  out.addEventListener('click', (e) => { if (e.target.closest('[data-account="logout"]')) logout(); });

  window.addEventListener('comp-auth-change', draw);
  // Another tab signed in or out.
  window.addEventListener('storage', (e) => { if (e.key === AUTH_KEY || e.key === STATUS_KEY || e.key === null) draw(); });
  window.addEventListener('hashchange', drawProgress);

  draw();
  return { draw, setProgress };
})();
