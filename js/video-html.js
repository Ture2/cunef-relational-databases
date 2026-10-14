'use strict';

/* ==========================================================================
   Course videos (no DOM): the HTML of one video on its group page and of the
   "Videos" list on a section overview. Entries come from each section's
   cfg.videos (js/sql.js, js/er.js, js/normalization-section.js):
   { id, group, title, mp4, poster, duration: 'm:ss', chapters: [{ t, title }], hook?, size? }.
   Used by js/concept-section.js; playback is js/video-player.js.
   The videos carry no captions of any kind.
   ========================================================================== */
const VideoHtml = (() => {
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tr = (t, key, vars) => (t ? t(key, vars) : key.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m)));

  /* ---- Playback state (pure) ----
     A saved position is { t: seconds, d: duration, at: timestamp }; t is 0 once a video has been finished. */
  const FINISHED = 0.9;
  const SHORTCUTS = [['k', 'play or pause'], ['j / l', 'back or forward 10 seconds'], ['< / >', 'slower or faster'], ['f', 'full screen']];

  /* "2:48" -> 168 */
  function parseDuration(s) {
    const parts = String(s || '').split(':').map(Number);
    return parts.length && parts.every((n) => Number.isFinite(n)) ? parts.reduce((a, n) => a * 60 + n, 0) : 0;
  }
  /* 168 -> "2:48" */
  function fmtTime(sec) {
    const s = Math.max(0, Math.round(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  /* Seconds from the start, 0 unless the video is part-way through. */
  function resumeAt(r, watched) {
    return !watched && r && r.t > 1 && r.d && r.t / r.d < FINISHED ? r.t : 0;
  }

  /* Up to n videos not yet watched, in course order after the current one (wrapping round). */
  function upNext(entries, currentId, state = {}, n = 3) {
    const watched = state.watched || (() => false);
    const at = entries.findIndex((e) => e.video.id === currentId);
    const ordered = at < 0 ? entries : [...entries.slice(at + 1), ...entries.slice(0, at)];
    return ordered.filter((e) => e.video.id !== currentId && !watched(e.video.id)).slice(0, n);
  }

  /* ---- Chapters (pure) ---- chapters = [{ t: seconds, title }]. */
  /* Index of the chapter playing at `time` (the last one that has started), -1 before the first. */
  function chapterAt(chapters, time) {
    let at = -1;
    (chapters || []).forEach((c, i) => { if (time + 0.25 >= c.t) at = i; });
    return at;
  }
  /* One segment per chapter, the last one up to the end. [{ start, end }] in seconds. */
  function segments(chapters, duration) {
    const n = (chapters || []).length;
    return (chapters || []).map((c, i) => ({
      start: i === 0 ? 0 : c.t,
      end: i + 1 < n ? chapters[i + 1].t : Math.max(duration, c.t + 1),
    }));
  }
  /* How much of a segment has been played at `time`, 0 to 1. */
  function segFill(seg, time) {
    return Math.max(0, Math.min(1, (time - seg.start) / Math.max(1e-6, seg.end - seg.start)));
  }

  /* The duration and where you are, for the briefing card: { text, at, pct }.
     pct is the share already watched (0 unless part-way), drawn as the bar along the thumbnail. */
  function briefStatus(v, { t, watched, rec } = {}) {
    const r = rec && rec(v.id);
    const at = resumeAt(r, watched);
    const parts = [v.duration || '', watched ? tr(t, 'Watched') : '', at ? tr(t, 'Resume at {time}', { time: fmtTime(at) }) : ''].filter(Boolean);
    return { text: parts.join(', '), at, pct: at ? Math.max(3, Math.round((at / r.d) * 100)) : 0 };
  }

  /* The inside of .tv-meta: duration, then the state. Rewritten by js/video-player.js when the state changes. */
  function metaHtml(v, state = {}) {
    const { t } = state;
    const done = state.watched;
    const { at } = briefStatus(v, state);
    return `${v.duration ? `<span class="tv-dur">${esc(v.duration)}</span>` : ''}${at ? `<span class="tv-state is-resume">${esc(tr(t, 'Resume at {time}', { time: fmtTime(at) }))}</span>` : ''}${done ? `<span class="tv-state is-done">${esc(tr(t, 'Watched'))}</span>` : ''}`;
  }

  const PLAY_GLYPH = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M6 3.8v12.4L16.4 10z" fill="currentColor"/></svg>';

  /* One video, at the top of the group page it explains. It starts as a briefing card (data-state="card"):
     the poster as a play thumbnail, the hook and the chapter titles; Play expands it in place into the player
     (data-state="open"), with a chapter line under it. js/video-player.js does the switching. */
  function figure(v, { t, watched, rec } = {}) {
    const keys = `<details class="tv-keys"><summary>${esc(tr(t, 'Keyboard shortcuts'))}</summary><dl>${SHORTCUTS.map(([k, what]) => `<dt><kbd>${esc(k)}</kbd></dt><dd>${esc(tr(t, what))}</dd>`).join('')}</dl></details>`;
    const download = `<a class="tv-dl" href="${esc(v.mp4)}" download>${esc(v.size ? tr(t, 'Download (MP4, {size} MB)', { size: v.size }) : tr(t, 'Download it (MP4)'))}</a>`;
    const label = tr(t, 'Video: {title}', { title: v.title });
    const chapters = v.chapters && v.chapters.length ? v.chapters : [];
    const segs = segments(chapters, parseDuration(v.duration));
    const jumps = chapters.length
      ? `<nav class="tv-chline" aria-label="${esc(tr(t, 'Chapters'))}"><ol>${chapters.map((c, i) => `<li style="flex-grow:${Math.max(1, Math.round(segs[i].end - segs[i].start))}"><button type="button" data-tv="chapter" data-t="${esc(c.t)}" data-fid="video-chapter-${esc(v.id)}-${i}"><span class="tv-seg" aria-hidden="true"><i></i></span><span class="tv-seg-t"><span class="tv-jump-t">${esc(fmtTime(c.t))}</span> ${esc(c.title)}</span></button></li>`).join('')}</ol><p class="tv-chnow" aria-hidden="true"></p></nav>`
      : '';
    const shows = chapters.length
      ? `<div class="tv-shows"><p class="tv-shows-h" id="tvs-${esc(v.id)}">${esc(tr(t, 'What it shows'))}</p><ul aria-labelledby="tvs-${esc(v.id)}">${chapters.map((c) => `<li>${esc(c.title)}</li>`).join('')}</ul></div>`
      : '';
    const { pct } = briefStatus(v, { watched, rec });
    const state = { t, watched, rec };
    const thumb = `<button type="button" class="tv-thumb" data-tv="play" data-fid="video-expand-${esc(v.id)}" aria-label="${esc(tr(t, 'Play video: {title}', { title: v.title }))}"><img src="${esc(v.poster)}" alt="" loading="lazy" width="640" height="360"><span class="tv-glyph">${PLAY_GLYPH}</span><span class="tv-bar" aria-hidden="true"${pct ? '' : ' hidden'}><span style="width:${pct}%"></span></span></button>`;
    return `<figure class="topic-video" id="video-${esc(v.id)}" data-video="${esc(v.id)}" data-state="card" data-collapsible>
        <div class="tv-frame">${thumb}<video controls preload="none" playsinline poster="${esc(v.poster)}" aria-label="${esc(label)}" hidden><source src="${esc(v.mp4)}" type="video/mp4"></video>${jumps}</div>
        <div class="tv-info">
          <figcaption class="tv-cap"><span class="tv-title">${esc(v.title)}</span><span class="tv-meta">${metaHtml(v, state)}</span></figcaption>
          ${v.hook ? `<p class="tv-hook">${esc(v.hook)}</p>` : ''}
          ${shows}
          <div class="tv-actions">
            <button type="button" class="btn tv-play" data-tv="play" data-fid="video-play-here-${esc(v.id)}">${PLAY_GLYPH}<span>${esc(tr(t, 'Play'))}</span></button><button type="button" class="btn ghost tv-collapse" data-tv="collapse" data-fid="video-collapse-${esc(v.id)}">${esc(tr(t, 'Collapse'))}</button>
            <label class="tv-watch"><input type="checkbox" data-action="video-watched" data-id="${esc(v.id)}" data-fid="video-watched-${esc(v.id)}"${watched ? ' checked' : ''}> ${esc(tr(t, 'Mark as watched'))}</label>
          </div>
          <div class="tv-next" aria-live="polite"></div>
          <div class="tv-more">${download}${keys}</div>
        </div>
      </figure>`;
  }

  /* The compact list on the section overview: poster, title and duration, linking to the group page. */
  function list(videos, { t, hrefFor, watched } = {}) {
    if (!videos || !videos.length) return '';
    const items = videos.map((v) => {
      const done = watched && watched(v.id);
      return `<li class="vl-item"><a href="${esc(hrefFor(v))}"><img class="vl-thumb" src="${esc(v.poster)}" alt="" loading="lazy" width="160" height="90"><span class="vl-text"><span class="vl-title">${esc(v.title)}</span><span class="vl-meta">${esc([v.duration, done ? tr(t, 'Watched') : ''].filter(Boolean).join(' · '))}</span></span></a></li>`;
    }).join('');
    return `<section class="video-list" aria-labelledby="vl-h"><h2 id="vl-h">${esc(tr(t, 'Videos'))}</h2><ul class="vl-items">${items}</ul></section>`;
  }

  return { figure, list, chapterAt, segments, segFill, briefStatus, metaHtml, upNext, parseDuration, fmtTime, resumeAt, FINISHED };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = VideoHtml;
