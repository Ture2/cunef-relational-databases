'use strict';

/* ==========================================================================
   ER practice checker. No DOM: it also runs in Node for checks.
   The student builds an ER / EER model from a statement; check() compares it
   with the official model of the exercise (and its accepted alternatives) and
   explains every difference in the course's terms (look-across cardinalities).

   Student work (the builder's state, js/er-practice.js):
     { entities:      [{ uid, name, weak, attrs: [{ uid, name, kind, parts }] }],
       relationships: [{ uid, name, identifying, ends: [{ entity: uid, min, max, role }], attrs: [{ uid, name, kind }] }],
       hierarchies:   [{ uid, super: uid, subs: [uid], disjoint, total, discriminator }] }
     kind: '' | 'key' | 'partial' | 'multivalued' | 'derived' | 'composite'; parts: 'a, b, c'.
   Official model: the shape drawn by ErDiagram.modelSvg (data/<lang>/logical.js, or inline in
   data/<lang>/er-practice.js). The exercise metadata names elements with keys built from the
   English names, in both languages:
     Entity · Entity.attr · Rel · Rel.attr · Rel@Entity (Rel@role for an end of a unary relationship) · HierarchyId
   Feedback never names an official entity or relationship the student has not modelled:
   a missing element is described with a quote from the statement instead.
   ========================================================================== */

const ErPracticeEngine = (() => {
  // Interface text: t() from js/i18n.js in the browser; a plain fallback (English + placeholders) elsewhere.
  const tr = typeof t === 'function' ? t : (s, p) => (p ? s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k]) : m)) : s);

  /* Every feedback message, so that tools/check-er-practice.mjs can verify their translations. */
  const MSG = {
    formEmpty: 'Add at least one entity before checking.',
    formEntityName: 'Entity {n} has no name.',
    formDupEntity: 'Two entities are called `{name}`: each entity needs a name of its own.',
    formDupAttr: '`{owner}` has two attributes called `{attr}`.',
    formParts: '`{attr}` in `{owner}` is composite: list its parts, separated by commas.',
    formRelName: 'Relationship {n} has no name: give it a verb, such as `Places`.',
    formRelEnds: '`{rel}` needs at least two participants: choose an entity at each end.',
    formCard: 'Choose the min and the max at every end of `{rel}`.',
    formCardOrder: 'In `{rel}`, the min at `{at}` is bigger than its max.',
    formHierSuper: 'Hierarchy {n} has no supertype.',
    formHierSubs: 'The hierarchy of `{super}` needs at least one subtype.',
    formHierProps: 'Choose disjoint or overlapping, and total or partial, for the hierarchy of `{super}`.',

    okEntities: 'All the entities the statement needs are there.',
    missingEntity: 'An entity is missing. The statement says: “{quote}”',
    missingEntityPlain: 'An entity the statement needs is missing: look for nouns that you have not modelled yet.',
    missingEntityAsAttr: '`{attr}` in `{owner}` should be an entity of its own: it has data of its own or takes part in relationships.',
    missingOptional: 'The reference also has `{name}`, which is optional here: {why}',
    missingOptionalPlain: 'The reference also has `{name}`, which is optional here.',
    extraEntityIsAttr: '`{name}` is not an entity: it is an attribute of `{owner}`.',
    extraEntityIsRel: '`{name}` is not an entity: the reference models it as a relationship between {between}.',
    extraEntityNot: '`{name}` should not be in the model: {why}',
    extraEntity: '`{name}` is not needed: nothing in the statement asks for it.',
    renamed: 'Your `{yours}` is the reference\'s `{ref}`.',

    okAttrs: 'Every attribute is in the right place.',
    missingAttr: '`{owner}` is missing the attribute `{attr}`.',
    misplacedToRel: '`{attr}` is not an attribute of `{owner}`: it belongs to the relationship between {between}, because it depends on both.',
    misplacedToEntity: '`{attr}` belongs to `{target}`, not to `{owner}`.',
    misplacedRelToEntity: '`{attr}` belongs to the entity `{target}`, not to the relationship `{owner}`.',
    fkAttr: '`{attr}` in `{owner}` repeats data of `{other}`: in a conceptual model the relationship already links them (foreign keys only appear in the logical model).',
    attrIsEntity: '`{attr}` in `{owner}` should be an entity of its own, linked to `{owner}` by a relationship.',
    kindWrong: '`{attr}` in `{owner}` should be {ref}, not {yours}.',
    kindAccepted: '`{attr}` in `{owner}`: the reference makes it {ref}; {yours} is also accepted.',
    partsAsAttrs: 'In `{owner}`, you list {parts} as separate attributes; the reference groups them in the composite `{attr}`. Both are accepted.',
    compositeAsParts: 'In `{owner}`, your composite `{attr}` groups attributes that the reference keeps separate. Both are accepted.',
    partsMissing: '`{attr}` in `{owner}` is composite: the reference splits it into {parts}.',
    extraAttr: '`{owner}` has `{attr}`, which the reference does not have: make sure the statement asks for it.',
    renamedAttr: 'In `{owner}`, your `{yours}` is the reference\'s `{ref}`.',
    subtypeRepeats: '`{sub}` repeats `{attr}`, which it already inherits from `{super}`.',

    okKeys: 'Every key is right.',
    noKey: '`{owner}` has no key: mark the attribute that identifies each occurrence.',
    keyMissingPart: 'The key of `{owner}` also needs `{attr}`.',
    keyExtraPart: '`{attr}` is not part of the key of `{owner}`.',
    subtypeKey: '`{sub}` is a subtype: it inherits the key of `{super}` and has no key of its own.',

    okWeak: 'Weak entities and identifying relationships are right.',
    shouldBeWeak: '`{owner}` should be a weak entity: it cannot be identified on its own, only within the entity it depends on.',
    reread: 'Re-read: “{quote}”',
    shouldNotBeWeak: '`{owner}` should not be weak: it has a key of its own.',
    weakFullKey: '`{owner}` is weak: the attribute that tells its occurrences apart is a partial key (dashed underline), not a full key.',
    weakNoPartial: '`{owner}` is weak, so it needs a partial key: the attribute that tells apart the occurrences that belong to the same owner.',
    strongPartial: '`{owner}` is not weak, so `{attr}` is a full key, not a partial key.',
    shouldBeIdentifying: '`{rel}` should be an identifying relationship (double diamond): it gives `{weak}` its identity.',
    shouldNotBeIdentifying: '`{rel}` should not be identifying: no weak entity depends on it.',
    acceptedWeak: '`{owner}`: the reference makes it {ref}; your choice is also accepted: {why}',

    okRels: 'All the relationships are there, between the right entities.',
    missingRel: 'A relationship is missing. The statement says: “{quote}”',
    missingRelBetween: 'A relationship between {between} is missing.',
    missingRelPlain: 'A relationship the statement needs is missing.',
    wrongLevel: '`{rel}` should link `{should}`, not `{yours}`: {why}',
    wrongLevelPlain: '`{rel}` should link `{should}`, not `{yours}`.',
    wrongArity: '`{rel}` links {yours}, but the reference links {ref}.',
    extraRel: '`{rel}` (between {between}) is not in the reference: check that the statement asks for it, and that no other relationship already says the same.',
    roleMissing: '`{rel}` links `{owner}` with itself: name the role of each end (the reference uses {roles}).',
    extraRelAttr: '`{owner}` has `{attr}`, which the reference does not have: make sure the statement asks for it.',

    okCards: 'Every cardinality is right.',
    lookHere: 'In `{rel}`, the two cardinalities are swapped. They are read across: the (min,max) next to `{a}` says how many `{a}` go with one `{b}`.',
    wrongMax: 'In `{rel}`, the max at `{at}` is wrong. Your {yours} says: {read}.',
    wrongMin: 'In `{rel}`, the min at `{at}` is wrong. Your {yours} says: {read}.',
    acceptedCard: 'In `{rel}`, the reference has {ref} at `{at}`; your {yours} is also accepted.',

    okHier: 'The hierarchies are right.',
    missingHier: 'A hierarchy is missing. The statement says: “{quote}”',
    missingHierPlain: '`{super}` should be specialized into subtypes.',
    extraHier: 'The hierarchy of `{super}` is not in the reference: its subtypes have no attributes or relationships of their own, or the statement does not distinguish them.',
    hierSubMissing: 'The hierarchy of `{super}` is missing a subtype.',
    hierSubExtra: '`{sub}` is not a subtype of `{super}`.',
    hierDisjoint: 'The hierarchy of `{super}` should be disjoint (d): an occurrence belongs to one subtype at most.',
    hierOverlap: 'The hierarchy of `{super}` should be overlapping (o): an occurrence can belong to several subtypes.',
    hierTotal: 'The hierarchy of `{super}` should be total: every `{super}` belongs to some subtype.',
    hierPartial: 'The hierarchy of `{super}` should be partial: some `{super}` belong to no subtype.',
    hierAccepted: 'The hierarchy of `{super}`: the reference makes it {ref}; your choice is also accepted.',
    hierDiscr: 'The reference names the discriminator of the hierarchy of `{super}` `{name}`.',

    usedVariant: 'You used an accepted alternative: {label}.',
    pendingRels: 'More relationships will be checked once the missing entities are in your model.',
    pendingHier: 'Hierarchies will be checked once their supertype is in your model.',
  };
  const say = (code, p) => tr(MSG[code], p);

  /* Range words of a (min,max), used to read a cardinality back to the student. */
  const RANGE = {
    '0,1': 'at most one',
    '1,1': 'exactly one',
    '0,N': 'any number of (possibly no)',
    '1,N': 'at least one',
    kN: 'at least {min}',
    km: 'between {min} and {max}',
  };
  const READ = 'for one `{other}`, {range} `{at}`';
  const READ_N = 'for each combination of {others}, {range} `{at}`';
  const KIND = { '': 'a simple attribute', key: 'a key', partial: 'a partial key', multivalued: 'multivalued', derived: 'derived', composite: 'composite' };

  /* ---- Names ----------------------------------------------------------------- */

  const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'el', 'la', 'los', 'las', 'de', 'del', 'un', 'una', 'y', 'e']);
  const singular = (w) => {
    if (w.length <= 3) return w;
    if (/ies$/.test(w)) return `${w.slice(0, -3)}y`;
    if (/(ses|xes|zes|ches|shes)$/.test(w)) return w.slice(0, -2);
    if (/[^aeiou]es$/.test(w) && /(ones|res|les|des|nes)$/.test(w)) return w.slice(0, -2);
    if (/s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  };
  const tokens = (s) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ').trim()
    .split(' ').filter((w) => w && !STOP.has(w)).map(singular);
  const norm = (s) => tokens(s).join(' ');

  /* Damerau–Levenshtein distance (optimal string alignment), for typos. */
  function dist(a, b) {
    const d = [];
    for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (let j = 0; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }

  /* How well a student's name matches one reference name: 1 same, 0.9 same words, 0.75 typo, 0 different. */
  function nameScore(a, b) {
    const ta = tokens(a);
    const tb = tokens(b);
    if (!ta.length || !tb.length) return 0;
    const na = ta.join(' ');
    const nb = tb.join(' ');
    if (na === nb) return 1;
    if (na.replace(/ /g, '') === nb.replace(/ /g, '')) return 0.95;
    if (ta.length === tb.length && [...ta].sort().join(' ') === [...tb].sort().join(' ')) return 0.9;
    const longest = Math.max(na.length, nb.length);
    if (longest >= 5 && dist(na, nb) <= (longest >= 8 ? 2 : 1)) return 0.8;
    // One word more or less ("date" / "declaration date", "Park" / "NaturalPark").
    const [short, long] = ta.length < tb.length ? [ta, tb] : [tb, ta];
    if (long.length - short.length === 1 && short.every((w) => long.includes(w))) return 0.76;
    return 0;
  }
  /* Best score against a list of names; aliases count almost as much as the name itself. */
  const bestScore = (name, names) => names.reduce((best, n, i) => Math.max(best, nameScore(name, n) * (i === 0 ? 1 : 0.97)), 0);
  const MATCH = 0.75;

  /* ---- Cardinalities ----------------------------------------------------------- */

  function parseCard(card) {
    const m = String(card || '').match(/\(?\s*(\d+)\s*[,.;]\s*(\d+|[NnMm*])\s*\)?/);
    if (!m) return null;
    return { min: +m[1], max: /^\d+$/.test(m[2]) ? +m[2] : Infinity };
  }
  const cardText = (c) => (c ? `(${c.min},${c.max === Infinity ? 'N' : c.max})` : '(?,?)');
  const sameCard = (a, b) => !!a && !!b && a.min === b.min && a.max === b.max;

  function rangeText(c) {
    const k = `${c.min},${c.max === Infinity ? 'N' : c.max}`;
    if (RANGE[k]) return tr(RANGE[k]);
    return c.max === Infinity ? tr(RANGE.kN, { min: c.min }) : tr(RANGE.km, { min: c.min, max: c.max });
  }
  /* "for one Product, any number of (possibly no) Customer": the look-across reading of the card at `at`. */
  function readCard(card, at, others) {
    const range = rangeText(card);
    return others.length === 1
      ? tr(READ, { other: others[0], range, at })
      : tr(READ_N, { others: others.map((o) => `\`${o}\``).join(' + '), range, at });
  }

  /* ---- Models ------------------------------------------------------------------- */

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const isUnary = (r) => new Set(r.ends.map((e) => e.entity)).size < r.ends.length;

  /* The official model of an exercise: its own (inline) or the one of the ER → Logical exercise it shares. */
  function baseModel(ex, logical) {
    if (ex.model && typeof ex.model === 'object') return ex.model;
    const lx = (logical || []).find((x) => x.id === ex.model);
    if (!lx) throw new Error(`ER practice “${ex.id}”: no ER → Logical exercise “${ex.model}”`);
    return lx;
  }

  /* Tags every element of a (cloned) model with its key, built from the English names (same structure). */
  function tagKeys(model, en) {
    model.entities.forEach((e, i) => {
      const ee = en && en.entities[i];
      e._key = ee ? ee.id : e.id;
      e._en = ee && ee.id !== e.id ? ee.id : null;
      e.attrs.forEach((a, j) => {
        const ea = ee && ee.attrs[j];
        a._key = `${e._key}.${ea ? ea.name : a.name}`;
        a._en = ea && ea.name !== a.name ? ea.name : null;
      });
    });
    model.relationships.forEach((r, i) => {
      const er = en && en.relationships[i];
      r._key = er ? er.id : r.id;
      r._en = er && er.id !== r.id ? er.id : null;
      const unary = isUnary(r);
      r.ends.forEach((x, k) => {
        const ex = er && er.ends[k];
        const ent = model.entities.find((e) => e.id === x.entity);
        x._key = `${r._key}@${unary ? ((ex && ex.role) || x.role) : (ent ? ent._key : x.entity)}`;
        x._enRole = ex && ex.role && ex.role !== x.role ? ex.role : null;
      });
      (r.attrs || []).forEach((a, j) => {
        const ea = er && er.attrs && er.attrs[j];
        a._key = `${r._key}.${ea ? ea.name : a.name}`;
        a._en = ea && ea.name !== a.name ? ea.name : null;
      });
    });
    (model.hierarchies || []).forEach((h, i) => {
      const eh = en && en.hierarchies && en.hierarchies[i];
      h._key = eh ? eh.id : h.id;
    });
    return model;
  }

  /* Applies an alternative's patch: { remove: [key], set: { key: props }, add: { entities, relationships, hierarchies, attrs: { key: [attr] } } }.
     Keys use the English names; elements added by the patch are named (and keyed) in the exercise's language. */
  function applyPatch(model, patch) {
    if (!patch) return model;
    const m = model;
    m.hierarchies = m.hierarchies || [];
    const entByKey = (k) => m.entities.find((e) => e._key === k);
    (patch.remove || []).forEach((k) => {
      const [owner, attr] = k.split('.');
      if (attr !== undefined) {
        const e = entByKey(owner);
        if (e) e.attrs = e.attrs.filter((a) => a._key !== k);
        const r = m.relationships.find((x) => x._key === owner);
        if (r) r.attrs = (r.attrs || []).filter((a) => a._key !== k);
        return;
      }
      const e = entByKey(k);
      if (e) {
        m.entities = m.entities.filter((x) => x !== e);
        m.relationships = m.relationships.filter((r) => !r.ends.some((x) => x.entity === e.id));
        m.hierarchies = m.hierarchies.filter((h) => h.super !== e.id);
        m.hierarchies.forEach((h) => { h.subs = h.subs.filter((s) => s !== e.id); });
      }
      m.relationships = m.relationships.filter((r) => r._key !== k);
      m.hierarchies = m.hierarchies.filter((h) => h._key !== k);
    });
    const add = patch.add || {};
    (add.entities || []).forEach((e) => {
      const ne = clone(e);
      ne._key = ne.id;
      ne.attrs = ne.attrs || [];
      ne.attrs.forEach((a) => { a._key = `${ne._key}.${a.name}`; });
      m.entities.push(ne);
    });
    Object.entries(add.attrs || {}).forEach(([k, list]) => {
      const owner = entByKey(k) || m.relationships.find((r) => r._key === k);
      if (!owner) throw new Error(`patch: no element “${k}” to add attributes to`);
      owner.attrs = owner.attrs || [];
      list.forEach((a) => owner.attrs.push({ ...clone(a), _key: `${owner._key}.${a.name}` }));
    });
    Object.entries(patch.set || {}).forEach(([k, props]) => {
      const el = findByKey(m, k);
      if (!el) throw new Error(`patch: no element “${k}” to change`);
      Object.assign(el, props);
    });
    (add.relationships || []).forEach((r) => {
      const nr = clone(r);
      nr._key = nr.id;
      const unary = isUnary(nr);
      nr.ends.forEach((x) => {
        const ent = m.entities.find((e) => e.id === x.entity);
        if (!ent) throw new Error(`patch: relationship “${nr.id}” uses an unknown entity “${x.entity}”`);
        x._key = `${nr._key}@${unary ? x.role : ent._key}`;
      });
      (nr.attrs || []).forEach((a) => { a._key = `${nr._key}.${a.name}`; });
      m.relationships.push(nr);
    });
    (add.hierarchies || []).forEach((h) => m.hierarchies.push({ ...clone(h), _key: h.id }));
    return m;
  }

  function findByKey(m, k) {
    const at = k.indexOf('@');
    if (at > 0) {
      const r = m.relationships.find((x) => x._key === k.slice(0, at));
      return r ? r.ends.find((x) => x._key === k) : null;
    }
    const dot = k.indexOf('.');
    if (dot > 0) {
      const owner = m.entities.find((e) => e._key === k.slice(0, dot)) || m.relationships.find((r) => r._key === k.slice(0, dot));
      return owner ? (owner.attrs || []).find((a) => a._key === k) : null;
    }
    return m.entities.find((e) => e._key === k) || m.relationships.find((r) => r._key === k) || (m.hierarchies || []).find((h) => h._key === k);
  }

  /* Metadata lookups of one variant (the exercise's, plus the alternative's own). */
  function makeMeta(ex, alt) {
    const names = { ...(ex.names || {}), ...((alt && alt.names) || {}) };
    const accept = { ...(ex.accept || {}), ...((alt && alt.accept) || {}) };
    const optional = new Set([...(ex.optional || []), ...((alt && alt.optional) || [])]);
    const why = { ...(ex.why || {}), ...((alt && alt.why) || {}) };
    const quote = { ...(ex.quote || {}), ...((alt && alt.quote) || {}) };
    return {
      names: (el) => [el.id || el.name, ...(names[el._key] || []), el._en].filter(Boolean),
      aliases: (key) => names[key] || [],
      accept: (el) => accept[el._key],
      optional: (el) => optional.has(el._key),
      why: (el) => why[el._key] || '',
      quote: (el) => quote[el._key] || '',
      notIn: ex.notInModel || [],
    };
  }

  /* Every accepted model of an exercise: the reference first, then each alternative. */
  function variants(ex, ctx = {}) {
    const local = baseModel(ex, ctx.logical);
    const en = ctx.en ? baseModel(ctx.en, ctx.logicalEn) : null;
    const make = (alt) => {
      const m = tagKeys(clone({ entities: local.entities, relationships: local.relationships, hierarchies: local.hierarchies || [] }), en);
      applyPatch(m, ex.patch);
      if (alt) applyPatch(m, alt.patch);
      m.title = ex.title;
      return { id: alt ? alt.id : null, label: alt ? alt.label : null, why: alt ? alt.why : null, model: m, meta: makeMeta(ex, alt) };
    };
    return [make(null), ...(ex.alternatives || []).map(make)];
  }

  /* The reference model of an exercise, ready to draw. */
  const referenceModel = (ex, ctx) => variants(ex, ctx)[0].model;

  /* ---- Student work ------------------------------------------------------------- */

  const KINDS = ['', 'key', 'partial', 'multivalued', 'derived', 'composite'];
  const splitParts = (s) => String(s || '').split(/[,;]/).map((p) => p.trim()).filter(Boolean);

  /* The student's work as a model (named, complete elements only), plus the problems that kept elements out. */
  function toModel(work) {
    const w = work || {};
    const entities = [];
    const byUid = {};
    const seen = new Set();
    (w.entities || []).forEach((e) => {
      const name = String(e.name || '').trim();
      if (!name || seen.has(norm(name) || name)) return;
      seen.add(norm(name) || name);
      const attrs = [];
      const seenA = new Set();
      (e.attrs || []).forEach((a) => {
        const an = String(a.name || '').trim();
        if (!an || seenA.has(an.toLowerCase())) return;
        seenA.add(an.toLowerCase());
        const kind = KINDS.includes(a.kind) ? a.kind : '';
        const at = { name: an, kind: kind || undefined, _uid: a.uid };
        if (kind === 'composite') at.parts = splitParts(a.parts);
        attrs.push(at);
      });
      const ent = { id: name, weak: !!e.weak, attrs, _uid: e.uid };
      byUid[e.uid] = ent;
      entities.push(ent);
    });
    const relationships = [];
    const seenR = {};
    (w.relationships || []).forEach((r, i) => {
      const ends = (r.ends || []).filter((x) => byUid[x.entity]).map((x) => {
        const card = (x.min !== '' && x.min != null && x.max !== '' && x.max != null) ? parseCard(`(${x.min},${x.max})`) : null;
        return { entity: byUid[x.entity].id, card: cardText(card), _card: card, role: String(x.role || '').trim() || undefined };
      });
      if (ends.length < 2) return;
      let name = String(r.name || '').trim() || `?${i + 1}`;
      if (seenR[name]) name = `${name} (${++seenR[name]})`; else seenR[name] = 1;
      const attrs = [];
      (r.attrs || []).forEach((a) => {
        const an = String(a.name || '').trim();
        if (an && !attrs.some((x) => x.name.toLowerCase() === an.toLowerCase())) attrs.push({ name: an, kind: KINDS.includes(a.kind) && a.kind ? a.kind : undefined, _uid: a.uid });
      });
      relationships.push({ id: name, identifying: !!r.identifying, ends, attrs, _uid: r.uid, _unnamed: !String(r.name || '').trim() });
    });
    const hierarchies = [];
    (w.hierarchies || []).forEach((h, i) => {
      const sup = byUid[h.super];
      const subs = [...new Set((h.subs || []).map((s) => byUid[s]).filter((s) => s && s !== sup).map((s) => s.id))];
      if (!sup || !subs.length) return;
      if (hierarchies.some((x) => x.super === sup.id)) return;
      hierarchies.push({ id: `H${i + 1}`, super: sup.id, subs, disjoint: h.disjoint, total: h.total, discriminator: String(h.discriminator || '').trim() || undefined, _uid: h.uid });
    });
    return { entities, relationships, hierarchies, title: '' };
  }

  /* Problems with the form of the work (unnamed, incomplete or duplicated elements). */
  function validate(work) {
    const w = work || {};
    const out = [];
    const bad = (code, p) => out.push({ status: 'bad', area: 'form', code, text: say(code, p) });
    const ents = w.entities || [];
    const named = ents.filter((e) => String(e.name || '').trim());
    if (!named.length) { bad('formEmpty'); return out; }
    const nameOf = {};
    ents.forEach((e, i) => {
      const name = String(e.name || '').trim();
      nameOf[e.uid] = name || String(i + 1);
      if (!name) {
        if ((e.attrs || []).some((a) => String(a.name || '').trim()) || e.weak) bad('formEntityName', { n: i + 1 });
        return;
      }
      const seen = new Set();
      (e.attrs || []).forEach((a) => {
        const an = String(a.name || '').trim();
        if (!an) return;
        if (seen.has(an.toLowerCase())) bad('formDupAttr', { owner: name, attr: an });
        seen.add(an.toLowerCase());
        if (a.kind === 'composite' && splitParts(a.parts).length < 2) bad('formParts', { owner: name, attr: an });
      });
    });
    const counts = {};
    named.forEach((e) => { const k = norm(e.name) || e.name.trim(); counts[k] = (counts[k] || 0) + 1; });
    Object.entries(counts).forEach(([k, n]) => { if (n > 1) bad('formDupEntity', { name: named.find((e) => (norm(e.name) || e.name.trim()) === k).name.trim() }); });
    (w.relationships || []).forEach((r, i) => {
      const name = String(r.name || '').trim();
      const ends = (r.ends || []).filter((x) => x.entity && nameOf[x.entity] !== undefined && String((ents.find((e) => e.uid === x.entity) || {}).name || '').trim());
      const used = name || (r.ends || []).some((x) => x.entity) || (r.attrs || []).some((a) => String(a.name || '').trim());
      if (!used) return;
      if (!name) bad('formRelName', { n: i + 1 });
      const label = name || String(i + 1);
      if (ends.length < 2) { bad('formRelEnds', { rel: label }); return; }
      if (ends.some((x) => x.min === '' || x.min == null || x.max === '' || x.max == null)) bad('formCard', { rel: label });
      ends.forEach((x) => {
        const c = parseCard(`(${x.min},${x.max})`);
        if (c && c.min > c.max) bad('formCardOrder', { rel: label, at: nameOf[x.entity] });
      });
    });
    (w.hierarchies || []).forEach((h, i) => {
      const used = h.super || (h.subs || []).length;
      if (!used) return;
      if (!h.super || !nameOf[h.super]) { bad('formHierSuper', { n: i + 1 }); return; }
      const sup = nameOf[h.super];
      if (!(h.subs || []).filter((s) => s !== h.super && nameOf[s]).length) bad('formHierSubs', { super: sup });
      if (h.disjoint == null || h.total == null) bad('formHierProps', { super: sup });
    });
    return out;
  }

  /* An official model as builder state (Load into my design). */
  function fromModel(model) {
    let n = 0;
    const uid = (p) => `${p}${++n}`;
    const idOf = {};
    const entities = model.entities.map((e) => {
      const u = uid('e');
      idOf[e.id] = u;
      return { uid: u, name: e.id, weak: !!e.weak, attrs: e.attrs.map((a) => ({ uid: uid('a'), name: a.name, kind: a.kind || '', parts: (a.parts || []).join(', ') })) };
    });
    const relationships = model.relationships.map((r) => ({
      uid: uid('r'),
      name: r.id,
      identifying: !!r.identifying,
      ends: r.ends.map((x) => {
        const c = parseCard(x.card);
        return { entity: idOf[x.entity], min: c ? String(c.min) : '', max: c ? (c.max === Infinity ? 'N' : String(c.max)) : '', role: x.role || '' };
      }),
      attrs: (r.attrs || []).map((a) => ({ uid: uid('a'), name: a.name, kind: a.kind || '' })),
    }));
    const hierarchies = (model.hierarchies || []).map((h) => ({
      uid: uid('h'), super: idOf[h.super], subs: h.subs.map((s) => idOf[s]), disjoint: !!h.disjoint, total: !!h.total, discriminator: h.discriminator || '',
    }));
    return { entities, relationships, hierarchies, next: n + 1 };
  }

  /* Grid positions for a model without them (the student's preview): entities on even cells,
     placed breadth-first from the most connected one; relationships between their entities. */
  function autoLayout(model) {
    const m = clone(model);
    const ents = m.entities;
    if (!ents.length) return m;
    const nb = Object.fromEntries(ents.map((e) => [e.id, new Set()]));
    m.relationships.forEach((r) => r.ends.forEach((a) => r.ends.forEach((b) => { if (a.entity !== b.entity) nb[a.entity].add(b.entity); })));
    const superOf = {};
    (m.hierarchies || []).forEach((h) => h.subs.forEach((s) => { superOf[s] = h.super; nb[h.super].add(s); nb[s].add(h.super); }));
    const pos = {};
    const used = new Set();
    const cell = (x, y) => `${x},${y}`;
    const OFFS = [[2, 0], [0, 2], [-2, 0], [0, -2], [2, 2], [-2, 2], [2, -2], [-2, -2], [4, 0], [0, 4], [-4, 0], [4, 2], [-4, 2], [2, 4], [-2, 4], [4, 4], [-4, 4], [6, 0], [0, 6]];
    const place = (id, x, y) => { pos[id] = [x, y]; used.add(cell(x, y)); };
    const order = [...ents].sort((a, b) => nb[b.id].size - nb[a.id].size);
    const queue = [];
    order.forEach((start) => {
      if (pos[start.id]) return;
      if (!Object.keys(pos).length) place(start.id, 0, 0);
      else {
        // A new group of entities goes to the right of everything placed so far.
        const maxX = Math.max(...Object.values(pos).map((p) => p[0]));
        place(start.id, maxX + 2, 0);
      }
      queue.push(start.id);
      while (queue.length) {
        const id = queue.shift();
        [...nb[id]].sort((a, b) => nb[b].size - nb[a].size).forEach((n) => {
          if (pos[n]) return;
          const placedNb = [...nb[n]].filter((x) => pos[x]);
          const prefer = superOf[n] === id ? [[0, 2], [-2, 2], [2, 2], [-4, 2], [4, 2]] : [];
          const [bx, by] = pos[id];
          let best = null;
          let bestScore = Infinity;
          [...prefer, ...OFFS].forEach(([dx, dy], i) => {
            const x = bx + dx;
            const y = by + dy;
            if (used.has(cell(x, y))) return;
            const d = placedNb.reduce((s, p) => s + Math.hypot(pos[p][0] - x, pos[p][1] - y), 0) + i * 0.01 + (i < prefer.length ? -5 : 0);
            if (d < bestScore) { bestScore = d; best = [x, y]; }
          });
          if (!best) { let x = bx + 2; while (used.has(cell(x, by))) x += 2; best = [x, by]; }
          place(n, best[0], best[1]);
          queue.push(n);
        });
      }
    });
    ents.forEach((e) => { e.at = pos[e.id]; });
    const taken = new Set(ents.map((e) => cell(e.at[0], e.at[1])));
    m.relationships.forEach((r) => {
      const ats = r.ends.map((x) => pos[x.entity]);
      let at;
      if (isUnary(r) && new Set(r.ends.map((x) => x.entity)).size === 1) at = [ats[0][0] + 1, ats[0][1] + 1];
      else at = [ats.reduce((s, a) => s + a[0], 0) / ats.length, ats.reduce((s, a) => s + a[1], 0) / ats.length];
      const tries = [[0, 0], [0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
      const k = tries.map(([dx, dy]) => [at[0] + dx, at[1] + dy]).find(([x, y]) => !taken.has(cell(x, y)));
      r.at = k || at;
      taken.add(cell(r.at[0], r.at[1]));
    });
    (m.hierarchies || []).forEach((h) => {
      const sp = pos[h.super];
      const below = h.subs.every((s) => pos[s][1] > sp[1]);
      const at = below ? [sp[0], sp[1] + 1] : [sp[0] + 1, sp[1]];
      h.at = taken.has(cell(at[0], at[1])) ? [at[0] + 0.5, at[1]] : at;
      taken.add(cell(h.at[0], h.at[1]));
    });
    return m;
  }

  /* ---- Comparison ------------------------------------------------------------------ */

  function compare(variant, stu) {
    const ref = variant.model;
    const meta = variant.meta;
    const checks = [];
    const notes = [];
    // A quote from the statement can follow the message, to send the student back to the right sentence.
    const bad = (area, code, p, quote) => checks.push({ status: 'bad', area, code, params: p, text: quote ? `${say(code, p)} ${say('reread', { quote })}` : say(code, p) });
    const note = (area, code, p) => notes.push({ status: 'note', area, code, params: p, text: say(code, p) });
    const hiers = ref.hierarchies || [];
    let points = 0;
    let total = 0;
    const award = (n, ok) => { total += n; if (ok) points += n; };
    const penalty = () => { points -= 1; };
    const split = new Set();       // official composites the student split into separate attributes
    const misplaced = new Set();   // official attributes the student put somewhere else
    const pending = new Set();     // areas with checks left for later (they depend on missing entities)

    /* Optional elements: listed in the metadata, or attached to an optional entity / hierarchy. */
    const optEnt = new Set(ref.entities.filter((e) => meta.optional(e)).map((e) => e.id));
    hiers.forEach((h) => { if (meta.optional(h)) h.subs.forEach((s) => optEnt.add(s)); });
    const isOptRel = (r) => meta.optional(r) || r.ends.some((x) => optEnt.has(x.entity));
    const superOf = {};
    hiers.forEach((h) => h.subs.forEach((s) => { superOf[s] = h.super; }));
    const refEnt = Object.fromEntries(ref.entities.map((e) => [e.id, e]));
    const stuEnt = Object.fromEntries(stu.entities.map((e) => [e.id, e]));

    /* -- Entities: name, then shared attributes, then position in the relationships. -- */
    const attrNames = (o) => o.attrs.flatMap((a) => [[a, meta.names(a)], ...(a.parts || []).map((p) => [a, [p]])]);
    const overlap = (o, s) => {
      const list = attrNames(o);
      const hits = s.attrs.filter((sa) => list.some(([, names]) => bestScore(sa.name, names) >= MATCH)).length;
      return { n: hits, score: hits / Math.max(1, Math.max(o.attrs.length, s.attrs.length)) };
    };
    const map = {};      // ref entity id -> student entity
    const back = {};     // student entity id -> ref entity
    const pairs = [];
    ref.entities.forEach((o) => stu.entities.forEach((s) => {
      const nm = bestScore(s.id, meta.names(o));
      const ov = overlap(o, s);
      if (nm < MATCH && !(ov.n >= 2 && ov.score >= 0.5)) return;
      pairs.push({ o, s, nm, score: 3 * nm + 2 * ov.score + (!!o.weak === !!s.weak ? 0.2 : 0) });
    }));
    pairs.sort((a, b) => b.score - a.score).forEach(({ o, s }) => {
      if (map[o.id] || back[s.id]) return;
      map[o.id] = s;
      back[s.id] = o;
    });
    // Second chance: an unmatched entity in the same place of the relationships (same mapped neighbours).
    const neighbours = (model, id) => new Set(model.relationships.filter((r) => r.ends.some((x) => x.entity === id)).flatMap((r) => r.ends.map((x) => x.entity)).filter((x) => x !== id));
    ref.entities.filter((o) => !map[o.id]).forEach((o) => {
      const want = [...neighbours(ref, o.id)].map((x) => map[x] && map[x].id).filter(Boolean);
      if (!want.length) return;
      const cand = stu.entities.filter((s) => !back[s.id]).map((s) => {
        const have = neighbours(stu, s.id);
        return { s, n: want.filter((x) => have.has(x)).length, extra: [...have].filter((x) => !want.includes(x)).length };
      }).filter((c) => c.n === want.length && c.extra === 0);
      if (cand.length === 1) { map[o.id] = cand[0].s; back[cand[0].s.id] = o; }
    });
    ref.entities.forEach((o) => {
      const s = map[o.id];
      if (s && bestScore(s.id, meta.names(o)) < 0.95) note('entities', 'renamed', { yours: s.id, ref: o.id });
    });
    const sName = (refId) => (map[refId] ? map[refId].id : null);

    const usedAttr = new Set();   // official attributes accounted for (found or reported)
    const STRICT = 0.9;           // name match required to claim that an attribute belongs elsewhere

    /* Entities missing in the student's model. A missing subtype is reported with its hierarchy,
       and the relationships of a missing entity are not listed one by one (they come after it). */
    const missingEnt = new Set(ref.entities.filter((o) => !map[o.id] && !optEnt.has(o.id)).map((o) => o.id));
    const hierOf = {};
    hiers.forEach((h) => h.subs.forEach((s) => { hierOf[s] = h; }));
    ref.entities.filter((o) => !map[o.id]).forEach((o) => {
      if (optEnt.has(o.id)) {
        if (!hierOf[o.id] || !meta.optional(hierOf[o.id])) note('entities', meta.why(o) ? 'missingOptional' : 'missingOptionalPlain', { name: o.id, why: meta.why(o) });
        return;
      }
      award(2, false);
      if (hierOf[o.id] && !stu.hierarchies.some((x) => x.super === sName(hierOf[o.id].super))) return;
      // Modelled as an attribute somewhere?
      for (const s of stu.entities) {
        const sa = s.attrs.find((a) => bestScore(a.name, meta.names(o)) >= STRICT);
        if (sa) { sa._explained = true; bad('entities', 'missingEntityAsAttr', { attr: sa.name, owner: s.id }); return; }
      }
      const q = meta.quote(o);
      bad('entities', q ? 'missingEntity' : 'missingEntityPlain', { quote: q });
    });

    /* Attributes of each matched pair. */
    const attrMatch = (offAttrs, stuAttrs, ownerName, area = 'attributes') => {
      const res = new Map();     // official attr -> student attr
      const cand = [];
      offAttrs.forEach((oa) => stuAttrs.forEach((sa) => {
        const sc = bestScore(sa.name, meta.names(oa));
        if (sc >= MATCH) cand.push({ oa, sa, sc });
      }));
      cand.sort((a, b) => b.sc - a.sc).forEach(({ oa, sa, sc }) => {
        if (res.has(oa) || [...res.values()].includes(sa)) return;
        res.set(oa, sa);
        // Different wording is fine; only a likely typo is worth a note.
        if (sc < 0.9 && sc >= 0.8) note(area, 'renamedAttr', { owner: ownerName, yours: sa.name, ref: oa.name });
      });
      return res;
    };

    const kindOf = (a) => a.kind || '';
    const keyish = (k) => k === 'key' || k === 'partial';

    ref.entities.forEach((o) => {
      const s = map[o.id];
      if (!s) return;
      award(2, true);
      const optE = optEnt.has(o.id);
      const res = attrMatch(o.attrs, s.attrs, s.id);
      const taken = () => new Set(res.values());
      // A single key (or partial key) on both sides matches whatever its name.
      ['key', 'partial'].forEach((k) => {
        const ok = o.attrs.filter((a) => kindOf(a) === k);
        const sk = s.attrs.filter((a) => keyish(kindOf(a)));
        if (ok.length === 1 && !res.has(ok[0])) {
          const free = sk.filter((a) => !taken().has(a));
          if (free.length === 1 && sk.length === 1) res.set(ok[0], free[0]);
        }
      });
      // Composite attributes split into separate attributes, or the other way round.
      o.attrs.filter((a) => kindOf(a) === 'composite' && !res.has(a)).forEach((oa) => {
        const parts = s.attrs.filter((sa) => !taken().has(sa) && (oa.parts || []).some((p) => nameScore(sa.name, p) >= MATCH));
        if (parts.length >= 2) {
          parts.forEach((p) => { p._explained = true; });
          res.set(oa, parts[0]);
          split.add(oa);
          note('attributes', 'partsAsAttrs', { owner: s.id, attr: oa.name, parts: parts.map((p) => `\`${p.name}\``).join(', ') });
        }
      });
      s.attrs.filter((sa) => kindOf(sa) === 'composite' && !taken().has(sa)).forEach((sa) => {
        const covered = o.attrs.filter((oa) => !res.has(oa) && (sa.parts || []).some((p) => bestScore(p, meta.names(oa)) >= MATCH));
        if (covered.length >= 2) {
          covered.forEach((oa) => res.set(oa, sa));
          note('attributes', 'compositeAsParts', { owner: s.id, attr: sa.name });
        }
      });
      o.attrs.forEach((oa) => {
        const sa = res.get(oa);
        const opt = optE || meta.optional(oa);
        if (!sa) {
          if (keyish(kindOf(oa))) return;          // reported with the keys
          if (opt) { usedAttr.add(oa); return; }
          award(1, false);
          bad('attributes', 'missingAttr', { owner: s.id, attr: oa.name });
          usedAttr.add(oa);
          return;
        }
        usedAttr.add(oa);
        sa._explained = true;
        if (!opt) award(1, true);
        // Kinds: keys are checked below; the others here.
        const ok = kindOf(oa);
        const sk = kindOf(sa);
        if (split.has(oa) || ok === sk || (keyish(ok) && keyish(sk)) || keyish(ok) || keyish(sk)) { if (!opt && !keyish(ok)) award(0.5, true); return; }
        const acc = meta.accept(oa);
        const kinds = acc && acc.kinds;
        if (opt || (kinds && kinds.includes(sk)) || (ok === 'composite' && sk === '' && opt)) {
          note('attributes', 'kindAccepted', { owner: s.id, attr: sa.name, ref: tr(KIND[ok]), yours: tr(KIND[sk]) });
          return;
        }
        if (ok === 'composite' && sk === '') {
          // A simple attribute where the reference has a composite: only the parts are missing.
          award(0.5, false);
          note('attributes', 'partsMissing', { owner: s.id, attr: sa.name, parts: (oa.parts || []).map((p) => `\`${p}\``).join(', ') });
          return;
        }
        award(0.5, false);
        bad('attributes', 'kindWrong', { owner: s.id, attr: sa.name, ref: tr(KIND[ok]), yours: tr(KIND[sk]) });
      });

      // Keys, weak entities.
      const isSub = !!superOf[o.id];
      const acceptW = meta.accept(o);
      const weakEither = acceptW && acceptW.weak === 'either';
      const refKeys = o.attrs.filter((a) => kindOf(a) === (o.weak ? 'partial' : 'key'));
      const stuKeys = s.attrs.filter((a) => keyish(kindOf(a)));
      if (isSub) {
        stuKeys.forEach((sa) => { sa._explained = true; bad('keys', 'subtypeKey', { sub: s.id, super: sName(superOf[o.id]) || superOf[o.id] }); });
        return;
      }
      if (!!o.weak !== !!s.weak) {
        if (weakEither) note('weak', 'acceptedWeak', { owner: s.id, ref: o.weak ? tr('weak') : tr('strong'), why: meta.why(o) });
        else {
          award(1, false);
          if (o.weak) { s._notWeak = true; bad('weak', 'shouldBeWeak', { owner: s.id }, meta.quote(o)); } else bad('weak', 'shouldNotBeWeak', { owner: s.id });
        }
      } else if (o.weak) award(1, true);
      if (!stuKeys.length) {
        if (refKeys.length) { award(1, false); bad(s.weak ? 'weak' : 'keys', s.weak ? 'weakNoPartial' : 'noKey', { owner: s.id }); }
        return;
      }
      // Kind of key: weak entities have partial keys, strong ones full keys.
      if (s.weak && stuKeys.some((a) => kindOf(a) === 'key') && (o.weak || weakEither)) bad('weak', 'weakFullKey', { owner: s.id });
      if (!s.weak && !o.weak && stuKeys.some((a) => kindOf(a) === 'partial')) bad('weak', 'strongPartial', { owner: s.id, attr: stuKeys.find((a) => kindOf(a) === 'partial').name });
      const want = new Set(refKeys.map((a) => res.get(a)).filter(Boolean));
      let keyOk = true;
      refKeys.forEach((oa) => {
        const sa = res.get(oa);
        if (!sa) { keyOk = false; bad('keys', 'keyMissingPart', { owner: s.id, attr: oa.name }); return; }
        if (!keyish(kindOf(sa))) { keyOk = false; bad('keys', 'keyMissingPart', { owner: s.id, attr: sa.name }); }
      });
      stuKeys.forEach((sa) => {
        if (want.has(sa)) return;
        sa._explained = true;
        // An extra key part: an official attribute (non-key) or something else.
        const offA = o.attrs.find((oa) => res.get(oa) === sa);
        if (offA || !weakEither) { keyOk = false; bad('keys', 'keyExtraPart', { owner: s.id, attr: sa.name }); }
      });
      award(1, keyOk);
    });

    /* Relationships of the reference, with their (official) attributes. */
    const relAttrOwner = new Map();
    ref.relationships.forEach((r) => (r.attrs || []).forEach((a) => relAttrOwner.set(a, r)));
    const entAttrOwner = new Map();
    ref.entities.forEach((e) => e.attrs.forEach((a) => entAttrOwner.set(a, e)));
    const between = (ids) => ids.map((id) => `\`${id}\``).join(` ${tr('and')} `);

    /* Student attributes still unexplained: misplaced, foreign-key-like or extra. */
    const explainLoose = (sa, ownerName, ownerRef, ownerIsRel) => {
      // 1. It belongs to a relationship of the reference.
      for (const [oa, r] of relAttrOwner) {
        if (usedAttr.has(oa) || (ownerIsRel && ownerRef === r)) continue;
        if (bestScore(sa.name, meta.names(oa)) >= STRICT && (!ownerRef || ownerIsRel || r.ends.some((x) => x.entity === ownerRef.id))) {
          usedAttr.add(oa);
          misplaced.add(oa);
          const ids = r.ends.map((x) => sName(x.entity) || x.entity);
          bad('attributes', 'misplacedToRel', { owner: ownerName, attr: sa.name, between: between([...new Set(ids)]) });
          return;
        }
      }
      // 2. It belongs to another entity of the reference.
      for (const [oa, e] of entAttrOwner) {
        if (usedAttr.has(oa) || (!ownerIsRel && ownerRef === e) || keyish(kindOf(oa))) continue;
        if (bestScore(sa.name, meta.names(oa)) >= STRICT) {
          const target = sName(e.id);
          if (!target) continue;
          usedAttr.add(oa);
          misplaced.add(oa);
          if (!ownerIsRel && ownerRef && superOf[ownerRef.id] === e.id) bad('hierarchies', 'subtypeRepeats', { sub: ownerName, attr: sa.name, super: target });
          else if (ownerIsRel) bad('attributes', 'misplacedRelToEntity', { owner: ownerName, attr: sa.name, target });
          else bad('attributes', 'misplacedToEntity', { owner: ownerName, attr: sa.name, target });
          return;
        }
      }
      if (!ownerIsRel && ownerRef) {
        // 3. It repeats a related entity: its key, its name, or "<entity> <attribute>".
        const related = ref.relationships.filter((r) => r.ends.some((x) => x.entity === ownerRef.id)).flatMap((r) => r.ends.map((x) => x.entity)).filter((x) => x !== ownerRef.id);
        const all = [...new Set([...related, ...ref.entities.map((e) => e.id).filter((x) => x !== ownerRef.id)])];
        for (const id of all) {
          const e = refEnt[id];
          const enames = meta.names(e);
          const viaKey = e.attrs.some((a) => keyish(kindOf(a)) && related.includes(id) && bestScore(sa.name, meta.names(a)) >= 0.95);
          const viaName = bestScore(sa.name, enames) >= STRICT;
          const viaCombo = e.attrs.some((a) => enames.some((en) => meta.names(a).some((an) => nameScore(sa.name, `${en} ${an}`) >= MATCH)));
          if (viaKey || viaName || viaCombo) {
            if (sName(id)) bad('attributes', 'fkAttr', { owner: ownerName, attr: sa.name, other: sName(id) });
            else if (viaName && !optEnt.has(id)) bad('attributes', 'attrIsEntity', { owner: ownerName, attr: sa.name });
            else continue;
            return;
          }
        }
      }
      note('attributes', ownerIsRel ? 'extraRelAttr' : 'extraAttr', { owner: ownerName, attr: sa.name });
    };

    stu.entities.forEach((s) => {
      const o = back[s.id];
      if (!o) return;
      s.attrs.forEach((sa) => { if (!sa._explained) explainLoose(sa, s.id, o, false); });
    });

    /* Student entities with no counterpart. */
    // Subtypes of a hierarchy the reference does not have are reported with that hierarchy.
    const extraSubs = new Set(stu.hierarchies.filter((x) => !hiers.some((h) => sName(h.super) === x.super)).flatMap((x) => x.subs));
    stu.entities.filter((s) => !back[s.id]).forEach((s) => {
      penalty();
      if (extraSubs.has(s.id) && !s.attrs.length) return;
      for (const [oa, e] of entAttrOwner) {
        if (bestScore(s.id, meta.names(oa)) >= MATCH) { bad('entities', 'extraEntityIsAttr', { name: s.id, owner: sName(e.id) || tr('another entity') }); return; }
      }
      const rr = ref.relationships.find((r) => bestScore(s.id, meta.names(r)) >= MATCH);
      if (rr) { bad('entities', 'extraEntityIsRel', { name: s.id, between: between([...new Set(rr.ends.map((x) => sName(x.entity) || x.entity))]) }); return; }
      const ni = meta.notIn.find((x) => (x.names || []).some((n) => nameScore(s.id, n) >= MATCH));
      if (ni) { bad('entities', 'extraEntityNot', { name: s.id, why: ni.why }); return; }
      bad('entities', 'extraEntity', { name: s.id });
    });

    /* -- Relationships: matched by their participants, not by name. -- */
    const mapped = (sr) => sr.ends.map((x) => (back[x.entity] ? back[x.entity].id : null));
    const bag = (ids) => [...ids].sort().join('|');
    const rmap = new Map();    // ref rel -> student rel
    const rback = new Map();
    const cardAgree = (o, s) => {
      const a = o.ends.map((x) => parseCard(x.card));
      const b = s.ends.map((x) => x._card);
      return a.reduce((n, c, i) => n + (sameCard(c, b[i]) ? 1 : 0), 0) / a.length;
    };
    const rpairs = [];
    ref.relationships.forEach((o) => stu.relationships.forEach((s) => {
      const ids = mapped(s);
      if (ids.includes(null) || bag(ids) !== bag(o.ends.map((x) => x.entity))) return;
      const ov = (o.attrs || []).filter((oa) => (s.attrs || []).some((sa) => bestScore(sa.name, meta.names(oa)) >= MATCH)).length;
      rpairs.push({ o, s, score: 3 * bestScore(s.id, meta.names(o)) + cardAgree(o, s) + ov + (!!o.identifying === !!s.identifying ? 0.3 : 0) });
    }));
    rpairs.sort((a, b) => b.score - a.score).forEach(({ o, s }) => {
      if (rmap.has(o) || rback.has(s)) return;
      rmap.set(o, s);
      rback.set(s, o);
    });
    // Near misses: the right relationship one level up or down a hierarchy, or with one participant more or less.
    const near = new Map();    // ref rel -> { s, kind }
    ref.relationships.filter((o) => !rmap.has(o)).forEach((o) => {
      const want = o.ends.map((x) => x.entity);
      const free = stu.relationships.filter((s) => !rback.has(s) && ![...near.values()].some((n) => n.s === s));
      const lift = (id) => [id, superOf[id], ...hiers.filter((h) => h.super === id).flatMap((h) => h.subs)].filter(Boolean);
      const level = free.find((s) => {
        const ids = mapped(s);
        if (ids.includes(null) || ids.length !== want.length) return false;
        const pool = [...ids];
        return want.every((w) => { const i = pool.findIndex((x) => lift(w).includes(x)); if (i < 0) return false; pool.splice(i, 1); return true; });
      });
      if (level) { near.set(o, { s: level, kind: 'level' }); return; }
      const arity = free.find((s) => {
        const ids = mapped(s).filter(Boolean);
        const common = want.filter((w) => ids.includes(w)).length;
        return bestScore(s.id, meta.names(o)) >= MATCH && common >= 1 && Math.abs(ids.length - want.length) <= 1 && common >= Math.min(ids.length, want.length) - 1;
      });
      if (arity) near.set(o, { s: arity, kind: 'arity' });
    });

    const notWeakOwners = new Set(stu.entities.filter((s) => s._notWeak).map((s) => s.id));
    const endsAlign = (o, s) => {
      // Pairs each official end with a student end: by entity, or by role for a unary relationship.
      if (!isUnary(o)) {
        const pool = [...s.ends];
        return o.ends.map((x) => {
          const i = pool.findIndex((y) => back[y.entity] && (back[y.entity].id === x.entity || superOf[x.entity] === back[y.entity].id || superOf[back[y.entity].id] === x.entity));
          return i < 0 ? null : pool.splice(i, 1)[0];
        });
      }
      const byRole = o.ends.map((x) => s.ends.find((y) => y.role && bestScore(y.role, [x.role, ...meta.aliases(x._key), x._enRole].filter(Boolean)) >= MATCH));
      if (byRole.every(Boolean) && byRole[0] !== byRole[1]) return byRole;
      const straight = [s.ends[0], s.ends[1]];
      const crossed = [s.ends[1], s.ends[0]];
      const agree = (al) => o.ends.reduce((n, x, i) => n + (al[i] && sameCard(parseCard(x.card), al[i]._card) ? 1 : 0), 0);
      return agree(crossed) > agree(straight) ? crossed : straight;
    };

    const cardChecks = (o, s) => {
      const al = endsAlign(o, s);
      const offC = o.ends.map((x) => parseCard(x.card));
      const stuC = al.map((y) => (y ? y._card : null));
      const atName = (i) => (al[i] ? (isUnary(o) ? `${al[i].entity}${al[i].role ? ` (${al[i].role})` : ''}` : al[i].entity) : o.ends[i].entity);
      const wrong = offC.map((c, i) => !sameCard(c, stuC[i]));
      if (o.ends.length === 2 && wrong[0] && wrong[1] && sameCard(offC[0], stuC[1]) && sameCard(offC[1], stuC[0])) {
        award(3, false);
        bad('cards', 'lookHere', { rel: s.id, a: atName(0), b: atName(1) });
        return;
      }
      offC.forEach((c, i) => {
        const yc = stuC[i];
        if (!yc) return;
        if (!wrong[i]) { award(1.5, true); return; }
        const acc = meta.accept(o.ends[i]);
        if (Array.isArray(acc) && acc.some((a) => sameCard(parseCard(a), yc))) {
          award(1.5, true);
          note('cards', 'acceptedCard', { rel: s.id, at: atName(i), ref: cardText(c), yours: cardText(yc) });
          return;
        }
        const others = al.filter((y, k) => k !== i && y).map((y, k) => (isUnary(o) ? `${y.entity}${y.role ? ` (${y.role})` : ''}` : y.entity) || String(k));
        const read = readCard(yc, atName(i), others);
        award(1.5, false);
        const maxWrong = c.max !== yc.max && !(c.max > 1 && yc.max > 1);
        bad('cards', maxWrong ? 'wrongMax' : 'wrongMin', { rel: s.id, at: atName(i), yours: cardText(yc), read }, meta.quote(o));
      });
    };

    const relAttrChecks = (o, s) => {
      const res = attrMatch(o.attrs || [], s.attrs || [], s.id);
      (o.attrs || []).forEach((oa) => {
        const sa = res.get(oa);
        if (sa) { sa._explained = true; usedAttr.add(oa); award(1, true); return; }
        if (misplaced.has(oa)) return;
        if (meta.optional(oa) || isOptRel(o)) return;
        award(1, false);
        bad('attributes', 'missingAttr', { owner: s.id, attr: oa.name });
        usedAttr.add(oa);
      });
    };

    ref.relationships.forEach((o) => {
      const s = rmap.get(o);
      const opt = isOptRel(o);
      if (!s) {
        const nm = near.get(o);
        if (nm) {
          award(2, false);
          const ids = mapped(nm.s);
          if (nm.kind === 'level') {
            const pool = [...o.ends.map((x) => x.entity)];
            const diff = ids.find((id) => { const i = pool.indexOf(id); if (i >= 0) { pool.splice(i, 1); return false; } return true; });
            const should = pool[0];
            const p = { rel: nm.s.id, should: sName(should) || should, yours: sName(diff) || diff, why: meta.why(o) };
            bad('relationships', p.why ? 'wrongLevel' : 'wrongLevelPlain', p);
            cardChecks(o, nm.s);
          } else {
            bad('relationships', 'wrongArity', { rel: nm.s.id, yours: between(nm.s.ends.map((x) => x.entity)), ref: between(o.ends.map((x) => sName(x.entity) || x.entity)) });
          }
          relAttrChecks(o, nm.s);
          return;
        }
        if (opt) { note('relationships', meta.why(o) ? 'missingOptional' : 'missingOptionalPlain', { name: o.id, why: meta.why(o) }); return; }
        award(2, false);
        o.ends.forEach(() => award(1.5, false));
        if (o.ends.some((x) => missingEnt.has(x.entity))) { pending.add('relationships'); return; }
        const q = meta.quote(o);
        const ids = [...new Set(o.ends.map((x) => sName(x.entity)))];
        if (q) bad('relationships', 'missingRel', { quote: q });
        else if (ids.every(Boolean)) bad('relationships', 'missingRelBetween', { between: between(ids) });
        else bad('relationships', 'missingRelPlain', {});
        return;
      }
      award(2, true);
      if (bestScore(s.id, meta.names(o)) < 0.95 && !s._unnamed) note('relationships', 'renamed', { yours: s.id, ref: o.id });
      if (isUnary(o) && s.ends.some((x) => !x.role)) note('relationships', 'roleMissing', { rel: s.id, owner: s.ends[0].entity, roles: o.ends.map((x) => `\`${x.role}\``).join(` ${tr('and')} `) });
      cardChecks(o, s);
      // Identifying relationships.
      if (!!o.identifying !== !!s.identifying) {
        const acc = meta.accept(o);
        const weakEnd = o.ends.find((x) => refEnt[x.entity] && refEnt[x.entity].weak);
        const skip = (acc && acc.identifying === 'either') || (weakEnd && notWeakOwners.has(sName(weakEnd.entity)));
        if (!skip) {
          award(0.5, false);
          if (o.identifying) bad('weak', 'shouldBeIdentifying', { rel: s.id, weak: sName(weakEnd ? weakEnd.entity : o.ends[1].entity) || '?' });
          else bad('weak', 'shouldNotBeIdentifying', { rel: s.id });
        }
      } else if (o.identifying) award(0.5, true);
      relAttrChecks(o, s);
    });
    stu.relationships.filter((s) => !rback.has(s) && ![...near.values()].some((n) => n.s === s)).forEach((s) => {
      penalty();
      bad('relationships', 'extraRel', { rel: s.id, between: between([...new Set(s.ends.map((x) => x.entity))]) });
    });
    // Attributes of relationships not explained yet.
    stu.relationships.forEach((s) => (s.attrs || []).forEach((sa) => {
      if (sa._explained) return;
      const o = rback.get(s);
      explainLoose(sa, s.id, o || null, true);
    }));

    /* -- Hierarchies, matched by their supertype. -- */
    const hmatched = new Set();
    hiers.forEach((h) => {
      const sup = sName(h.super);
      const sh = sup ? stu.hierarchies.find((x) => x.super === sup) : null;
      if (!sh) {
        if (meta.optional(h) || optEnt.has(h.super)) { note('hierarchies', meta.why(h) ? 'missingOptional' : 'missingOptionalPlain', { name: `${h.super} → ${h.subs.join(', ')}`, why: meta.why(h) }); return; }
        award(2, false);
        if (missingEnt.has(h.super)) { pending.add('hierarchies'); return; }
        const q = meta.quote(h);
        if (q) bad('hierarchies', 'missingHier', { quote: q });
        else bad('hierarchies', 'missingHierPlain', { super: sup || h.super });
        return;
      }
      hmatched.add(sh);
      award(2, true);
      const want = h.subs.map((x) => sName(x)).filter(Boolean);
      const missing = h.subs.filter((x) => !sName(x) || !sh.subs.includes(sName(x)));
      const extra = sh.subs.filter((x) => !want.includes(x));
      const subsOk = !missing.filter((x) => !optEnt.has(x) || sName(x)).length && !extra.length;
      award(1, subsOk);
      if (missing.length && missing.some((x) => sName(x) || !optEnt.has(x))) bad('hierarchies', 'hierSubMissing', { super: sup });
      extra.forEach((x) => bad('hierarchies', 'hierSubExtra', { sub: x, super: sup }));
      const acc = meta.accept(h) || {};
      [['disjoint', 'hierDisjoint', 'hierOverlap'], ['total', 'hierTotal', 'hierPartial']].forEach(([prop, yes, no]) => {
        if (!!h[prop] === !!sh[prop]) { award(0.5, true); return; }
        if (acc[prop] === 'either') { award(0.5, true); note('hierarchies', 'hierAccepted', { super: sup, ref: prop === 'disjoint' ? (h.disjoint ? tr('disjoint') : tr('overlapping')) : (h.total ? tr('total') : tr('partial')) }); return; }
        award(0.5, false);
        bad('hierarchies', h[prop] ? yes : no, { super: sup });
      });
      if (h.discriminator && !sh.discriminator) note('hierarchies', 'hierDiscr', { super: sup, name: h.discriminator });
    });
    stu.hierarchies.filter((x) => !hmatched.has(x)).forEach((x) => { penalty(); bad('hierarchies', 'extraHier', { super: x.super }); });

    const score = total > 0 ? Math.max(0, Math.round((100 * points) / total)) : 0;
    return { checks, notes, score, pending };
  }

  const AREAS = ['form', 'entities', 'attributes', 'keys', 'weak', 'relationships', 'cards', 'hierarchies'];
  const OK = { entities: 'okEntities', attributes: 'okAttrs', keys: 'okKeys', weak: 'okWeak', relationships: 'okRels', cards: 'okCards', hierarchies: 'okHier' };

  /* Compares the student's work with every accepted variant of the exercise and reports on the closest one.
     ctx: { logical, en, logicalEn, vars } (vars: the result of variants(), to avoid rebuilding it). */
  function check(ex, work, ctx = {}) {
    const form = validate(work);
    const vars = ctx.vars || variants(ex, ctx);
    let best = null;
    vars.forEach((v) => {
      const stu = toModel(work);
      const r = compare(v, stu);
      const nBad = r.checks.length;
      if (!best || nBad < best.nBad || (nBad === best.nBad && r.score > best.score)) best = { ...r, nBad, variant: v };
    });
    const ref = best.variant.model;
    const usesWeak = ref.entities.some((e) => e.weak) || (work.entities || []).some((e) => e.weak);
    const usesHier = (ref.hierarchies || []).length || (work.hierarchies || []).length;
    const all = [...form, ...best.checks];
    const out = [];
    AREAS.forEach((area) => {
      const bads = all.filter((c) => c.area === area);
      const ns = best.notes.filter((c) => c.area === area);
      if (area === 'weak' && !usesWeak && !bads.length) return;
      if (area === 'hierarchies' && !usesHier && !bads.length) return;
      const later = best.pending.has(area) || (area === 'cards' && best.pending.has('relationships'));
      if (area !== 'form' && !bads.length && !later && !form.some((c) => c.code === 'formEmpty')) out.push({ status: 'ok', area, text: say(OK[area]) });
      out.push(...bads, ...ns);
      if (best.pending.has(area)) out.push({ status: 'note', area, code: area === 'relationships' ? 'pendingRels' : 'pendingHier', text: say(area === 'relationships' ? 'pendingRels' : 'pendingHier') });
    });
    if (best.variant.id) out.push({ status: 'note', area: 'variant', code: 'usedVariant', text: say('usedVariant', { label: best.variant.label }) });
    const nBad = all.length;
    return { ok: nBad === 0, nBad, score: nBad === 0 ? 100 : Math.min(best.score, 99), checks: out, variant: best.variant };
  }

  return { MSG, RANGE, READ, READ_N, KIND, tokens, norm, nameScore, parseCard, cardText, readCard, variants, referenceModel, applyPatch, toModel, fromModel, validate, autoLayout, check, isUnary };
})();

if (typeof module !== 'undefined') module.exports = ErPracticeEngine;
