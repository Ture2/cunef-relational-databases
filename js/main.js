'use strict';

/* ==========================================================================
   Router and start-up. Hash routes:
     #/relational/er[/quiz[/topic]]           ER concepts and quiz
     #/relational/logical[/N]                 ER → logical exercises
     #/relational/normalization[/N | /diagnose[/advanced]]
     #/nosql                                  Non-relational overview
   Old links (#/normalize/N, #/diagnose...) are redirected.
   ========================================================================== */

(() => {
  const COURSES = {
    relational: {
      title: 'Relational databases',
      lede: 'From the ER model to well-designed tables: learn the concepts, transform ER diagrams into logical models and normalize them.',
      sections: [
        { id: 'er', href: '#/relational/er', label: 'ER concepts', module: ErSection },
        { id: 'logical', href: '#/relational/logical', label: 'ER → Logical', module: LogicalSection },
        { id: 'normalization', href: '#/relational/normalization', label: 'Normalization', module: Normalization },
      ],
    },
    nosql: {
      title: 'Non-relational databases',
      lede: 'Document, key-value, wide-column and graph databases.',
      sections: [{ id: 'overview', href: '#/nosql', label: 'Overview', module: NoSqlSection }],
    },
  };

  const view = $('#view');
  let current = null;           // module handling #view

  function legacy(hash) {
    let m = hash.match(/^#\/normalize(?:\/(\d+))?$/);
    if (m) return `#/relational/normalization${m[1] ? `/${m[1]}` : ''}`;
    m = hash.match(/^#\/diagnose(\/advanced)?$/);
    if (m) return `#/relational/normalization/diagnose${m[1] || ''}`;
    return null;
  }

  function parse() {
    const hash = location.hash;
    const old = legacy(hash);
    if (old) { history.replaceState(null, '', old); return parse(); }
    let m = hash.match(/^#\/relational\/(er|logical|normalization)(?:\/(.*))?$/);
    if (m) return { course: 'relational', section: m[1], rest: m[2] || '' };
    m = hash.match(/^#\/nosql(?:\/(.*))?$/);
    if (m) return { course: 'nosql', section: 'overview', rest: m[1] || '' };
    return null;
  }

  function header(route) {
    const course = COURSES[route.course];
    $('#course-title').textContent = course.title;
    $('#course-lede').textContent = course.lede;
    document.querySelectorAll('.course-switch a').forEach((a) => {
      if (a.dataset.course === route.course) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $('#section-nav').innerHTML = course.sections.length > 1
      ? course.sections.map((s, i) => `<a href="${s.href}"${s.id === route.section ? ' aria-current="page"' : ''}><span class="step-n">${i + 1}</span>${esc(s.label)}</a>`).join('')
      : '';
    $('#section-nav').hidden = course.sections.length < 2;
  }

  function render() {
    const route = parse();
    if (!route) { history.replaceState(null, '', '#/relational/er'); render(); return; }
    header(route);
    const section = COURSES[route.course].sections.find((s) => s.id === route.section);
    current = section.module;
    const title = current.render(route.rest);
    document.title = `${title} · Databases practice`;
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
  view.addEventListener('submit', (e) => {
    e.preventDefault();
    if (current && current.onSubmit) current.onSubmit(e.target);
  });

  window.addEventListener('hashchange', () => {
    render();
    try { window.scrollTo(0, 0); } catch (e) { /* environments without scrolling */ }
  });

  render();
  LogicalSection.selfTest();
})();
