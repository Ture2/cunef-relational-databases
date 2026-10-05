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
    $('#section-nav').innerHTML = course.sections.length > 1
      ? home + course.sections.map((s) => `<a href="${s.href}"${s.id === route.section ? ' aria-current="page"' : ''}>${esc(s.label)}</a>`).join('')
      : '';
    $('#section-nav').hidden = course.sections.length < 2;
    $('#section-nav').setAttribute('aria-label', t('{course}: sections', { course: course.title }));
  }

  function render() {
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
