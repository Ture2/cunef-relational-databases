'use strict';

/* ==========================================================================
   Relational databases › ER → Logical: the transformation rules as concept
   cards (each with a small ER model and the tables it produces), plus the
   exercises of js/logical.js drawn inside the same rail layout.
   Data: data/<lang>/logical-rules.js (LOGICAL_RULES). The tables of each card are
   derived by js/logical-engine.js, the same engine that checks the exercises.
   Routes: #/relational/logical[/<ruleId>], #/relational/logical/practice[/N]
   ========================================================================== */

const LogicalRulesSection = (() => {
  const picked = {};                     // card id -> index of the variant shown

  const variantsOf = (() => {
    const cache = {};
    return (card) => (cache[card.id] || (cache[card.id] = LogicalEngine.variants(card.model)));
  })();

  /* A short label for each free choice of a variant: 1:1 side, hierarchy strategy, ternary key. */
  function choiceLabel(choice) {
    return Object.entries(choice).map(([key, v]) => {
      const kind = key.slice(0, key.indexOf(':'));
      if (kind === 'oneToOne') return t('FK in {table}', { table: v });
      if (kind === 'ternaryKey') return v === 'all' ? t('PK: all three FKs') : t('PK: the "many" FKs');
      return { 'super+subs': t('Supertype + subtypes'), single: t('Single table'), subs: t('Subtypes only') }[v] || v;
    }).join(' · ');
  }

  function resultBody(card) {
    const vars = variantsOf(card);
    const v = vars[Math.min(picked[card.id] || 0, vars.length - 1)];
    const why = v.tables.map((tb) => `<li><strong>${esc(tb.name)}</strong>: ${md(tb.why)}</li>`).join('');
    return `${LogicalSection.notationHtml(LogicalSection.variantToStudent(v))}
      <details class="how-step"><summary>${esc(t('Where each table comes from'))}</summary><ul class="plain">${why}</ul></details>`;
  }

  function resultHtml(card) {
    if (!card.model) return '';
    const vars = variantsOf(card);
    const cur = Math.min(picked[card.id] || 0, vars.length - 1);
    const seg = vars.length > 1
      ? `<div class="tw-seg" role="group" aria-label="${esc(t('Accepted designs'))}">${vars.map((v, k) => `<button type="button" class="tw-segbtn" data-action="rr-pick" data-card="${esc(card.id)}" data-v="${k}" data-fid="rr-${esc(card.id)}-${k}" aria-pressed="${k === cur}">${esc(choiceLabel(v.choice))}${v.preferred ? ` <span class="rr-default">${esc(t('(course default)'))}</span>` : ''}</button>`).join('')}</div>`
      : '';
    return `<section class="rule-result" data-widget="rr-${esc(card.id)}" aria-labelledby="rr-${esc(card.id)}-h">
        <h3 id="rr-${esc(card.id)}-h"><svg class="rr-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${RAIL_ICON.arrow}</svg>${esc(t('Resulting tables'))}</h3>
        ${seg}
        <div data-body>${resultBody(card)}</div>
        <p class="sr-only" aria-live="polite" data-live></p>
      </section>`;
  }

  function onClick(el) {
    if (el.dataset.action !== 'rr-pick') return;
    const card = LOGICAL_RULES.find((c) => c.id === el.dataset.card);
    if (!card) return;
    picked[card.id] = +el.dataset.v;
    const box = document.querySelector(`[data-widget="rr-${CSS.escape(card.id)}"]`);
    if (!box) return;
    keepFocus(() => {
      box.querySelectorAll('.tw-segbtn').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === picked[card.id])));
      box.querySelector('[data-body]').innerHTML = resultBody(card);
    });
    const live = box.querySelector('[data-live]');
    if (live) live.textContent = t('Showing: {design}', { design: choiceLabel(variantsOf(card)[picked[card.id]].choice) });
  }

  /* Each card links to the Level 1 exercise that practises it. */
  const cards = LOGICAL_RULES.map((c) => {
    const i = LOGICAL_EXERCISES.findIndex((e) => e.id === c.exercise);
    return i < 0 ? c : {
      ...c,
      practice: {
        href: LogicalSection.hrefOf(c.exercise),
        label: t('Exercise {n}', { n: i + 1 }),
        sub: t('{title}: build the tables yourself and check them.', { title: LOGICAL_EXERCISES[i].title }),
      },
    };
  });

  return ConceptSection({
    base: '#/relational/logical',
    title: () => t('ER → Logical'),
    badge: '1:N',
    groups: [
      { key: 'basics', label: 'Entities and attributes', icon: 'entity' },
      { key: 'binary', label: 'Binary relationships', icon: 'relationship' },
      { key: 'special', label: 'Special cases', icon: 'weak' },
      { key: 'hierarchy', label: 'Hierarchies', icon: 'isa' },
    ],
    concepts: cards,
    figure: (item) => (item.model ? ErDiagram.modelSvg(item.model) : ''),
    extra: resultHtml,
    onClick,
    practice: {
      label: 'Practice',
      icon: 'practice',
      match: (r) => /^practice(?:\/\d+)?$/.test(r),
      links: (rest) => LogicalSection.links(rest !== null),
      render: (r) => LogicalSection.render(r.replace(/^practice\/?/, '')),
      onClick: (el) => LogicalSection.onClick(el),
      onInput: (e) => LogicalSection.onInput(e),
      onChange: (e) => LogicalSection.onChange(e),
    },
  });
})();
