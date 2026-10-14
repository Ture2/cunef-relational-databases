'use strict';

/* ==========================================================================
   Playback of the course videos on group pages: the briefing card opens into
   the player in place (and collapses back), remembers where you stopped
   (video-progress-v1, this device only), marks a video watched at 90 %
   (video-watched-v2), adds keyboard shortcuts and, when one ends, links to
   the next video of the course. The HTML comes from js/video-html.js; each
   ConceptSection registers its videos with register().
   ========================================================================== */

const VideoPlayer = (() => {
  const progressStore = makeStore('video-progress-v1');
  const watchedStore = makeStore('video-watched-v2');
  const SAVE_EVERY = 5000;         // ms between saves while playing
  const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
  const ENTRIES = [];              // every video of the course in learning order: { video, href }
  const BY_ID = new Map();

  /* Called by each section when it is built (script order is the course order). */
  function register(list) {
    list.forEach((e) => { ENTRIES.push(e); BY_ID.set(e.video.id, e.video); });
  }

  /* A snapshot of what is watched and where each video stopped, in the shape js/video-html.js expects. */
  function state() {
    const w = watchedStore.load();
    const p = progressStore.load();
    return { watched: (id) => !!w[id], rec: (id) => p[id] };
  }

  function save(id, time, duration, finished) {
    const p = progressStore.load();
    p[id] = { t: finished ? 0 : Math.floor(time), d: Math.round(duration), at: Date.now() };
    progressStore.save(p);
  }

  function setWatched(id, on) {
    const w = watchedStore.load();
    if (!!w[id] === on) return;
    if (on) w[id] = true; else delete w[id];
    watchedStore.save(w);
    const fig = document.querySelector(`.topic-video[data-video="${CSS.escape(id)}"]`);
    if (fig) refreshBrief(fig);
  }

  /* When a video ends: a link to the group page of the next one not yet watched. */
  function showNext(holder, id) {
    const next = VideoHtml.upNext(ENTRIES, id, state(), 1)[0];
    if (!next) { holder.innerHTML = `<p class="tv-next-text">${esc(t('You have watched every video.'))}</p>`; return; }
    holder.innerHTML = `<p class="tv-next-text">${esc(t('Next: {title}', { title: next.video.title }))}</p><a class="btn" href="${esc(next.href)}">${esc(t('Watch next'))}</a>`;
  }

  /* ---- The briefing card: collapsed card <-> expanded player, in place ---- */

  /* Rewrite what the card says about this device's state: duration, "Resume at 1:12" or "Watched", the bar on the thumbnail. */
  function refreshBrief(fig) {
    const v = BY_ID.get(fig.dataset.video);
    if (!v) return;
    const st = state();
    const s = { t, watched: st.watched(v.id), rec: st.rec };
    const meta = fig.querySelector('.tv-meta');
    if (meta) meta.innerHTML = VideoHtml.metaHtml(v, s);
    const bar = fig.querySelector('.tv-bar');
    if (bar) {
      const { pct } = VideoHtml.briefStatus(v, s);
      bar.hidden = !pct;
      bar.firstElementChild.style.width = `${pct}%`;
    }
    const box = fig.querySelector('input[data-action="video-watched"]');
    if (box) box.checked = s.watched;
    const play = fig.querySelector('.tv-play span');
    if (play) play.textContent = VideoHtml.briefStatus(v, s).at ? t('Resume') : t('Play');
  }

  function expand(fig, play) {
    const video = fig.querySelector('video');
    fig.dataset.state = 'open';
    video.hidden = false;
    video.preload = 'metadata';
    if (!reduceMotion && fig.animate) {
      fig.querySelector('.tv-frame').animate([{ opacity: 0.4, transform: 'scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2, .7, .2, 1)' });
      fig.querySelector('.tv-info').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
    }
    video.focus({ preventScroll: true });
    if (play) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
    fig.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function collapse(fig) {
    const video = fig.querySelector('video');
    video.pause();
    if (Number.isFinite(video.duration) && video.currentTime > 0 && !video.ended) save(fig.dataset.video, video.currentTime, video.duration, false);   // the pause event comes too late for the card below
    if (document.fullscreenElement) document.exitFullscreen();
    fig.dataset.state = 'card';
    video.hidden = true;
    refreshBrief(fig);
    if (!reduceMotion && fig.animate) fig.querySelector('.tv-info').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
    const back = fig.querySelector('.tv-play');
    if (back) back.focus({ preventScroll: true });
  }

  function wireCard(fig) {
    if (fig.dataset.tvWired) return;
    fig.dataset.tvWired = '1';
    const video = fig.querySelector('video');
    fig.addEventListener('click', (e) => {
      const el = e.target.closest('[data-tv]');
      if (!el || !fig.contains(el)) return;
      if (el.dataset.tv === 'play') expand(fig, true);
      else if (el.dataset.tv === 'collapse') collapse(fig);
    });
    fig.addEventListener('change', (e) => {
      const box = e.target.closest('input[data-action="video-watched"]');
      if (box) setWatched(box.dataset.id, box.checked);
    });
    video.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) collapse(fig);
    });
  }

  /* ---- The chapter line under the player: segments filled as it plays, the current chapter marked, a click jumps ---- */
  function wireChapters(video, fig, id) {
    const line = fig && fig.querySelector('.tv-chline');
    if (!line) return;
    const btns = [...line.querySelectorAll('button[data-tv="chapter"]')];
    const chapters = btns.map((b) => ({ t: Number(b.dataset.t) || 0, title: b.querySelector('.tv-seg-t').lastChild.textContent.trim() }));
    const fills = btns.map((b) => b.querySelector('.tv-seg i'));
    const now = line.querySelector('.tv-chnow');
    const total = () => (Number.isFinite(video.duration) && video.duration) || VideoHtml.parseDuration((BY_ID.get(id) || {}).duration);
    let current = -2;
    function paint(time) {
      const d = total();
      if (d) VideoHtml.segments(chapters, d).forEach((sg, i) => { fills[i].style.width = `${(VideoHtml.segFill(sg, time) * 100).toFixed(1)}%`; });
      const at = time > 0.5 ? VideoHtml.chapterAt(chapters, time) : -1;
      if (at === current) return;
      current = at;
      btns.forEach((b, i) => { if (i === at) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      const k = Math.max(0, at);
      if (now) now.textContent = t('Chapter {n} of {total}: {title}', { n: k + 1, total: chapters.length, title: chapters[k].title });
    }
    line.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tv="chapter"]');
      if (!b) return;
      video.currentTime = Number(b.dataset.t) || 0;
      paint(video.currentTime);
      const p = video.play(); if (p && p.catch) p.catch(() => {});
    });
    video.addEventListener('timeupdate', () => paint(video.currentTime));
    video.addEventListener('seeked', () => paint(video.currentTime));
    video.addEventListener('ended', () => paint(total()));
    /* Before it plays: the saved point shows in the segments. */
    paint(VideoHtml.resumeAt(progressStore.load()[id], !!watchedStore.load()[id]));
  }

  function onShortcut(video, e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.key) {
      case 'k': if (video.paused) video.play(); else video.pause(); break;
      case 'j': video.currentTime = Math.max(0, video.currentTime - 10); break;
      case 'l': video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10); break;
      case '<': case '>': {
        const k = RATES.indexOf(video.playbackRate);
        const at = k < 0 ? RATES.indexOf(1) : k;
        video.playbackRate = RATES[Math.max(0, Math.min(RATES.length - 1, at + (e.key === '>' ? 1 : -1)))];
        break;
      }
      case 'f':
        if (document.fullscreenElement) document.exitFullscreen();
        else if (video.requestFullscreen) video.requestFullscreen();
        break;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();           // the page module must not read these keys
  }

  function attach(video, id) {
    if (video.dataset.vp) return;
    video.dataset.vp = '1';
    const duration = () => (Number.isFinite(video.duration) ? video.duration : 0);
    let lastSave = 0;

    video.addEventListener('loadedmetadata', () => {
      const at = VideoHtml.resumeAt(progressStore.load()[id], !!watchedStore.load()[id]);
      if (at && duration() && at < duration() - 3 && !video.currentTime) video.currentTime = at;
    });
    video.addEventListener('timeupdate', () => {
      const now = Date.now();
      if (now - lastSave < SAVE_EVERY || !duration()) return;
      lastSave = now;
      save(id, video.currentTime, duration(), false);
      if (video.currentTime / duration() >= VideoHtml.FINISHED) setWatched(id, true);
    });
    video.addEventListener('pause', () => {
      if (!video.ended && duration() && video.currentTime > 0) save(id, video.currentTime, duration(), false);
    });
    video.addEventListener('ended', () => {
      save(id, 0, duration(), true);
      setWatched(id, true);
      const holder = video.closest('.topic-video').querySelector('.tv-next');
      if (holder) showNext(holder, id);
    });
    video.addEventListener('keydown', (e) => onShortcut(video, e));
    wireChapters(video, video.closest('.topic-video'), id);
  }

  /* Wire every course video inside root (after a group page is drawn). */
  function mountAll(root) {
    root.querySelectorAll('.topic-video[data-video]').forEach((fig) => {
      const video = fig.querySelector('video');
      if (!video) return;
      attach(video, fig.dataset.video);
      wireCard(fig);
      refreshBrief(fig);
    });
  }

  return { register, state, mountAll };
})();
