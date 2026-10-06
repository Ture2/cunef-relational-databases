'use strict';

/* ==========================================================================
   Router and start-up. Hash routes:
     #/relational/theory[/card | /quiz[/topic]]   Theory cards and quiz
     #/relational/er[/card | /quiz[/topic]]       ER concepts and quiz
     #/relational/logical[/rule | /practice[/N]]  ER → logical rules and exercises
     #/relational/normalization[/card | /practice[/N] | /diagnose[/advanced]]
     #/relational/sql[/card | /quiz[/topic] | /practice]  SQL concepts, quiz and sandbox
     #/                                           Landing page: resume, sections, shortcuts
     #/progress                                   Progress across every section
     #/nosql                                      Non-relational overview
   Old links (#/normalize/N, #/diagnose..., …/logical/N, …/normalization/N) are redirected.
   ========================================================================== */

(() => {
  const COURSES = {
    relational: {
      title: t('Relational databases'),
      sections: [
        { id: 'theory', href: '#/relational/theory', label: t('Theory'), module: TheorySection },
        { id: 'er', href: '#/relational/er', label: t('ER concepts'), module: ErSection },
        { id: 'logical', href: '#/relational/logical', label: t('ER → Logical'), module: LogicalRulesSection },
        { id: 'normalization', href: '#/relational/normalization', label: t('Normalization'), module: NormalizationSection },
        { id: 'sql', href: '#/relational/sql', label: t('SQL'), module: SqlSection },
      ],
    },
    nosql: {
      title: t('Non-relational databases'),
      sections: [{ id: 'overview', href: '#/nosql', label: t('Overview'), module: NoSqlSection }],
    },
  };

  const view = $('#view');
  let current = null;           // module handling #view

  /* The static shell in index.html is written in English: translate it once. */
  function translateShell() {
    $('.skip').textContent = t('Skip to content');
    $('.brand-name').textContent = t('Databases practice');
    $('.progress-label').textContent = t('Progress');
    $('#footer-course').textContent = t('Databases · Escuela Politécnica Superior');
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('Interactive databases practice: theory, ER concepts, ER to logical model transformation with instant checking, normalization up to 5NF and SQL you can run in the browser.'));
    $('#settings-label').textContent = t('Settings');
    $('#settings-btn').title = t('Settings');
    $('#settings-title').textContent = t('Settings');
    $('#set-lang-h').textContent = t('Language');
    $('#set-course-h').textContent = t('Course');
    $('#set-theme-h').textContent = t('Theme');
    const labels = { relational: t('Relational databases'), nosql: t('Non-relational databases'), light: t('Light'), dark: t('Dark'), system: t('System') };
    document.querySelectorAll('.settings-panel [data-set]').forEach((b) => { if (labels[b.dataset.value]) b.textContent = labels[b.dataset.value]; });
  }
  translateShell();

  /* ---- Settings menu: language, course and theme ------------------------------ */

  const settingsBtn = $('#settings-btn');
  const panel = $('#settings-panel');
  let currentCourse = 'relational';

  function markSettings() {
    const now = { lang: LANG, course: currentCourse, theme: THEME };
    panel.querySelectorAll('[data-set]').forEach((b) => b.setAttribute('aria-pressed', String(now[b.dataset.set] === b.dataset.value)));
  }
  function openSettings() {
    markSettings();
    panel.hidden = false;
    settingsBtn.setAttribute('aria-expanded', 'true');
    (panel.querySelector('[aria-pressed="true"]') || panel.querySelector('button')).focus();
  }
  function closeSettings(focusButton = true) {
    if (panel.hidden) return;
    panel.hidden = true;
    settingsBtn.setAttribute('aria-expanded', 'false');
    if (focusButton) settingsBtn.focus();
  }
  settingsBtn.addEventListener('click', () => (panel.hidden ? openSettings() : closeSettings()));
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-set]');
    if (!b) return;
    const v = b.dataset.value;
    if (b.dataset.set === 'lang') { setLang(v); return; }          // reloads on the same route
    if (b.dataset.set === 'theme') {
      setTheme(v);
      markSettings();
      announce(t('Theme: {theme}', { theme: b.textContent }));
      return;                                                        // stays open: the change is visible at once
    }
    closeSettings(false);
    location.hash = v === 'nosql' ? '#/nosql' : '#/relational/theory';
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) closeSettings(); });
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !e.target.closest('.settings')) closeSettings(false);
  });

  function legacy(hash) {
    let m = hash.match(/^#\/normalize(?:\/(\d+))?$/);
    if (m) return `#/relational/normalization/practice${m[1] ? `/${m[1]}` : ''}`;
    m = hash.match(/^#\/diagnose(\/advanced)?$/);
    if (m) return `#/relational/normalization/diagnose${m[1] || ''}`;
    // Exercises used to sit directly below the section; the section root now shows the theory.
    m = hash.match(/^#\/relational\/(logical|normalization)\/(\d+)$/);
    if (m) return `#/relational/${m[1]}/practice/${m[2]}`;
    return null;
  }

  /* Pages outside any section: they keep the relational tabs, with none marked as current. */
  const PAGES = { '#/progress': ProgressPage, '#/': HomePage, '#': HomePage, '': HomePage };

  function parse() {
    const hash = location.hash;
    const old = legacy(hash);
    if (old) { history.replaceState(null, '', old); return parse(); }
    if (PAGES[hash]) return { course: 'relational', section: null, rest: '', module: PAGES[hash] };
    let m = hash.match(/^#\/relational\/(theory|er|logical|normalization|sql)(?:\/(.*))?$/);
    if (m) return { course: 'relational', section: m[1], rest: m[2] || '' };
    m = hash.match(/^#\/nosql(?:\/(.*))?$/);
    if (m) return { course: 'nosql', section: 'overview', rest: m[1] || '' };
    return null;
  }

  function header(route) {
    const course = COURSES[route.course];
    currentCourse = route.course;
    const home = `<a href="#/"${route.module === HomePage ? ' aria-current="page"' : ''}>${esc(t('Home'))}</a>`;
    // Each section with tools has a chevron that opens its menu (also on hover with a mouse).
    const more = (s) => (s.module.tools && s.module.tools().length
      ? `<button type="button" class="mode-more" data-menu="${s.id}" aria-expanded="false" aria-controls="section-menu" aria-label="${esc(t('{section} tools', { section: s.label }))}"><svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg></button>`
      : '');
    $('#section-nav').innerHTML = course.sections.length > 1
      ? home + course.sections.map((s) => `<span class="mode" data-mode="${s.id}"><a href="${s.href}"${s.id === route.section ? ' aria-current="page"' : ''}>${esc(s.label)}</a>${more(s)}</span>`).join('')
      : '';
    $('#section-nav').hidden = course.sections.length < 2;
    $('#section-nav').setAttribute('aria-label', t('{course}: sections', { course: course.title }));
  }

  /* ---- Section menu: the tools of a section, under its tab ----------------------
     One panel for every section, outside the tabs (they scroll sideways on phones and would clip it).
     It opens from the chevron (click, tap, ArrowDown) or after a short hover with a mouse. */

  const menu = document.createElement('div');
  menu.className = 'section-menu';
  menu.id = 'section-menu';
  menu.hidden = true;
  $('.appbar').append(menu);
  let menuFor = null;
  let hoverTimer = 0;
  let leaveTimer = 0;
  const nav = $('#section-nav');
  const menuBtn = (id) => nav.querySelector(`.mode-more[data-menu="${id}"]`);

  function openMenu(id, focusFirst) {
    const s = COURSES[currentCourse].sections.find((x) => x.id === id);
    const btn = menuBtn(id);
    if (!s || !btn) return;
    if (menuFor && menuFor !== id) closeMenu();
    const items = [{ href: s.href, label: t('Read the cards') }, ...s.module.tools()];
    menu.setAttribute('aria-label', t('{section} tools', { section: s.label }));
    menu.innerHTML = `<ul>${items.map((x) => `<li><a href="${x.href}"${x.href === location.hash ? ' aria-current="page"' : ''}>${esc(x.label)}</a></li>`).join('')}</ul>`;
    menuFor = id;
    btn.setAttribute('aria-expanded', 'true');
    btn.closest('.mode').classList.add('is-open');
    menu.hidden = false;
    // Under its tab; on a phone, the full width under the tabs.
    const r = btn.closest('.mode').getBoundingClientRect();
    const phone = window.innerWidth <= 640;
    menu.classList.toggle('is-sheet', phone);
    menu.style.top = `${Math.round(r.bottom)}px`;
    menu.style.left = phone ? '' : `${Math.round(Math.max(8, Math.min(r.left - 12, window.innerWidth - menu.offsetWidth - 8)))}px`;
    if (focusFirst) menu.querySelector('a').focus();
  }

  function closeMenu(focusBtn) {
    clearTimeout(hoverTimer);
    clearTimeout(leaveTimer);
    if (!menuFor) return;
    const btn = menuBtn(menuFor);
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.closest('.mode').classList.remove('is-open');
      if (focusBtn) btn.focus();
    }
    menuFor = null;
    menu.hidden = true;
  }

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-more');
    if (!btn) return;
    if (menuFor === btn.dataset.menu) closeMenu(); else openMenu(btn.dataset.menu);
  });
  nav.addEventListener('keydown', (e) => {
    const btn = e.target.closest('.mode-more');
    if (btn && e.key === 'ArrowDown') { e.preventDefault(); openMenu(btn.dataset.menu, true); }
    if (e.key === 'Escape' && menuFor) closeMenu(true);
  });
  // A mouse resting on a tab opens its menu; moving to another tab switches at once; leaving closes after a moment.
  nav.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const mode = e.target.closest('.mode');
    clearTimeout(leaveTimer);
    clearTimeout(hoverTimer);
    if (!mode || !menuBtn(mode.dataset.mode)) return;
    if (menuFor === mode.dataset.mode) return;
    hoverTimer = setTimeout(() => openMenu(mode.dataset.mode), menuFor ? 0 : 150);
  });
  const leave = (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(hoverTimer);
    const to = e.relatedTarget;
    if (to && (menu.contains(to) || (to.closest && menuFor && to.closest(`.mode[data-mode="${menuFor}"]`)))) return;
    leaveTimer = setTimeout(() => closeMenu(), 250);
  };
  nav.addEventListener('pointerout', leave);
  menu.addEventListener('pointerout', leave);
  menu.addEventListener('pointerover', () => clearTimeout(leaveTimer));
  menu.addEventListener('keydown', (e) => {
    const links = [...menu.querySelectorAll('a')];
    const i = links.indexOf(document.activeElement);
    const j = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: links.length - 1 }[e.key];
    if (j !== undefined) { e.preventDefault(); links[(j + links.length) % links.length].focus(); }
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
  });
  menu.addEventListener('focusout', (e) => {
    if (!e.relatedTarget || (!menu.contains(e.relatedTarget) && !nav.contains(e.relatedTarget))) closeMenu();
  });
  document.addEventListener('pointerdown', (e) => { if (menuFor && !menu.contains(e.target) && !nav.contains(e.target)) closeMenu(); });
  window.addEventListener('resize', () => closeMenu());
  window.addEventListener('scroll', () => { if (menuFor && !menu.matches(':focus-within')) closeMenu(); }, { passive: true });

  function render() {
    closeMenu();
    const route = parse();
    if (!route) { history.replaceState(null, '', '#/'); render(); return; }
    if (!route.module) HomePage.saveLast(location.hash);
    header(route);
    current = route.module || COURSES[route.course].sections.find((s) => s.id === route.section).module;
    // Modules that draw a full-height rail on the left edge (ConceptSection) use the full width.
    $('#main').classList.toggle('is-wide', !!current.wide);
    $('#progress-btn').toggleAttribute('aria-current', current === ProgressPage);
    const title = current.render(route.rest);
    document.title = `${title} · ${t('Databases practice')}`;
    ProgressPage.updateButton();
    // Keep the current exercise tab visible when the strip scrolls sideways (phones).
    const tab = view.querySelector('.numtab[aria-current]');
    if (tab) { const strip = tab.closest('.numtabs'); strip.scrollLeft = tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2; }
  }

  view.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled || !current || !current.onClick) return;
    if (el.tagName === 'FORM') return;
    if (el.tagName === 'A') e.preventDefault();   // in-page links handled by the module, not the router
    current.onClick(el, e);
  });
  view.addEventListener('input', (e) => { if (current && current.onInput) current.onInput(e); });
  view.addEventListener('change', (e) => { if (current && current.onChange) current.onChange(e); });
  view.addEventListener('keydown', (e) => { if (current && current.onKeydown) current.onKeydown(e); });
  view.addEventListener('submit', (e) => {
    e.preventDefault();
    if (current && current.onSubmit) current.onSubmit(e.target);
  });

  window.addEventListener('hashchange', () => {
    render();
    try { window.scrollTo(0, 0); } catch (e) { /* environments without scrolling */ }
  });

  render();
  whenIdle(ErPractice.selfTest);
  whenIdle(LogicalSection.selfTest);     // author checks: console warnings only, after the first paint
})();
