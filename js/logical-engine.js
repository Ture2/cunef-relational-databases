'use strict';

/* ==========================================================================
   ER → logical transformation engine. No DOM: it also runs in Node for checks.

   variants(ex)          every accepted relational schema for an exercise
                         (one per combination of the free choices: side of each
                         1:1 foreign key and strategy of each hierarchy).
   check(ex, tables)     compares a student's tables with the closest variant.

   A table: { name, why, kind, cols: [{ name, pk, fk: { table, col } | null, nn, why, optional }] }
   Course rules (Topic 3):
     1 every entity becomes a table · 2 every attribute a column · 3 the identifier the PK
     4 every M:N relationship becomes a table whose PK combines both keys
     5 in 1:N the key of the one side goes to the many side
     6 in 1:1 the key of either side can pass to the other
     7 in (0,1)/(1,1) the key passes to the optional side
   ========================================================================== */

const LogicalEngine = (() => {
  // Interface text: t() from js/i18n.js in the browser; a plain fallback (English + placeholders) elsewhere.
  const tr = typeof t === 'function' ? t : (s, p) => (p ? s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k]) : m)) : s);
  const norm = (s) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
  const pascal = (s) => String(s).split(/[\s_-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');

  const parseCard = (card) => {
    const m = String(card).match(/\(\s*([01])\s*,\s*([1NnMm*])\s*\)/);
    if (!m) throw new Error(`Bad cardinality “${card}”`);
    return { min: +m[1], many: m[2] !== '1', text: card };
  };

  const ratioOf = (r) => {
    if (r.ends.length > 2) return 'ternary';
    const [a, b] = r.ends.map((e) => parseCard(e.card));
    if (a.many && b.many) return 'M:N';
    if (!a.many && !b.many) return '1:1';
    return '1:N';
  };

  /* Free choices of an exercise: which side holds each 1:1 FK, which strategy each hierarchy uses. */
  function choiceSpace(ex) {
    const out = [];
    ex.relationships.forEach((r) => {
      if (r.identifying || r.ends.length !== 2 || ratioOf(r) !== '1:1') return;
      const sides = [...new Set(r.ends.map((e) => e.entity))];
      out.push({ kind: 'oneToOne', id: r.id, options: sides });
    });
    ex.relationships.forEach((r) => {
      if (r.ends.length > 2 && r.ends.some((e) => !parseCard(e.card).many)) out.push({ kind: 'ternaryKey', id: r.id, options: ['all', 'many'] });
    });
    (ex.hierarchies || []).forEach((h) => {
      const inRel = ex.relationships.some((r) => r.ends.some((e) => e.entity === h.super));
      const ownsMv = (ex.entities.find((e) => e.id === h.super) || { attrs: [] }).attrs.some((a) => a.kind === 'multivalued');
      const options = ['super+subs', 'single'];
      if (h.total && !inRel && !ownsMv) options.push('subs');
      out.push({ kind: 'hierarchy', id: h.id, options });
    });
    return out;
  }

  /* The course's default when the exercise does not say: FK on the optional side, supertype + subtypes. */
  function preferredChoice(ex, c) {
    const p = (ex.prefer && ex.prefer[c.kind]) || {};
    if (p[c.id] && c.options.includes(p[c.id])) return p[c.id];
    if (c.kind === 'hierarchy') return 'super+subs';
    if (c.kind === 'ternaryKey') return 'all';
    const r = ex.relationships.find((x) => x.id === c.id);
    const [a, b] = r.ends;
    // The optional side is the entity whose participation is partial: min 0 at the opposite end.
    if (parseCard(b.card).min === 0 && parseCard(a.card).min === 1) return a.entity;
    if (parseCard(a.card).min === 0 && parseCard(b.card).min === 1) return b.entity;
    return b.entity;
  }

  function derive(ex, choice) {
    const ents = Object.fromEntries(ex.entities.map((e) => [e.id, e]));
    const hierOfSub = {};
    const hierOfSuper = {};
    (ex.hierarchies || []).forEach((h) => { hierOfSuper[h.super] = h; h.subs.forEach((s) => { hierOfSub[s] = h; }); });
    const strat = (h) => choice[`hierarchy:${h.id}`];

    /* Table that stores the rows of an entity (null if the entity has none). */
    const tableOf = (id) => {
      const hs = hierOfSub[id];
      if (hs && strat(hs) === 'single') return tableOf(hs.super);
      const hp = hierOfSuper[id];
      if (hp && strat(hp) === 'subs') return null;
      return id;
    };

    /* The weak side of an identifying relationship is its N end (a weak entity may also own another one). */
    const weakEnd = (r) => r.ends.find((e) => ents[e.entity].weak && parseCard(e.card).many) || r.ends.find((e) => ents[e.entity].weak);
    const identifyingOf = (id) => ex.relationships.find((r) => r.identifying && weakEnd(r).entity === id);
    const ownerOf = (id) => {
      const r = identifyingOf(id);
      return r ? r.ends.find((e) => e.entity !== id).entity : null;
    };

    const tables = {};
    const order = [];
    const addTable = (t) => { tables[t.name] = t; order.push(t.name); return t; };
    const plainCols = (e, why) => {
      const out = [];
      e.attrs.forEach((a) => {
        if (a.kind === 'key' || a.kind === 'partial' || a.kind === 'derived' || a.kind === 'multivalued') return;
        if (a.kind === 'composite') (a.parts || []).forEach((p) => out.push({ name: p, why: tr('`{attr}` is a composite attribute of `{entity}`: store its parts as separate columns.', { attr: a.name, entity: e.id }), composite: a.name }));
        else out.push({ name: a.name, why: why || tr('Rule 2: every attribute of `{entity}` becomes a column of its table.', { entity: e.id }) });
      });
      return out;
    };

    /* Primary-key columns of an entity's table, resolved recursively (weak entities, subtypes). */
    const pkMemo = {};
    function pkCols(id, seen = new Set()) {
      if (pkMemo[id]) return pkMemo[id];
      if (seen.has(id)) throw new Error(`Cyclic identification at ${id}`);
      seen.add(id);
      const e = ents[id];
      const hs = hierOfSub[id];
      let cols;
      if (hs) {
        cols = pkCols(hs.super, seen).map((c) => ({ name: c.name, from: c.from }));
      } else if (e.weak) {
        const owner = ownerOf(id);
        if (!owner) throw new Error(`Weak entity ${id} has no identifying relationship`);
        const ownerPk = pkCols(owner, seen);
        cols = [
          ...ownerPk.map((c) => ({ name: c.name, refEntity: owner, refCol: c.name })),
          ...e.attrs.filter((a) => a.kind === 'partial').map((a) => ({ name: a.name })),
        ];
      } else {
        cols = e.attrs.filter((a) => a.kind === 'key').flatMap((a) => (a.parts && a.parts.length ? a.parts : [a.name])).map((name) => ({ name }));
      }
      pkMemo[id] = cols;
      return cols;
    }

    /* Columns that reference the PK of `target` (an entity id), resolved to its table. */
    function fkColsTo(target, { names, nn, why, pk = false }) {
      const tt = tableOf(target);
      return pkCols(target).map((c, i) => ({
        name: names ? names(c, i) : c.name,
        pk, nn: pk || nn, fk: { table: tt, col: c.name }, why,
      }));
    }

    // 1. Entities (rules 1–3), weak entities and hierarchies.
    ex.entities.forEach((e) => {
      const t = tableOf(e.id);
      if (t !== e.id) return;
      const hs = hierOfSub[e.id];
      const hp = hierOfSuper[e.id];
      const cols = [];
      if (hs) {
        const s = strat(hs);
        if (s === 'super+subs') {
          cols.push(...fkColsTo(hs.super, { pk: true, why: tr('`{sub}` is a subtype of `{super}` (supertype + subtypes strategy): its PK is the supertype\'s PK, which is also a FK to `{super}`.', { sub: e.id, super: hs.super }) }));
        } else { // 'subs': the subtype copies the supertype's key and attributes
          cols.push(...pkCols(hs.super).map((c) => ({ name: c.name, pk: true })));
          cols.push(...plainCols(ents[hs.super], tr('With one table per subtype, `{sub}` also stores the attributes of `{super}`.', { sub: e.id, super: hs.super })));
        }
      } else if (e.weak) {
        const owner = ownerOf(e.id);
        const idr = identifyingOf(e.id);
        pkCols(e.id).forEach((c) => {
          if (c.refEntity) cols.push({ name: c.name, pk: true, nn: true, fk: { table: tableOf(c.refEntity), col: c.refCol }, why: tr('`{entity}` is a weak entity identified by `{owner}` (`{rel}`): its PK starts with the owner\'s key, which is also a FK.', { entity: e.id, owner, rel: idr.id }) });
          else cols.push({ name: c.name, pk: true });
        });
      } else {
        pkCols(e.id).forEach((c) => cols.push({ name: c.name, pk: true }));
      }
      cols.push(...plainCols(e));
      if (hp && strat(hp) === 'single') {
        hp.subs.forEach((s) => cols.push(...plainCols(ents[s], tr('With a single table for the hierarchy, `{entity}` also stores the attributes of subtype `{sub}`.', { entity: e.id, sub: s }))));
        cols.push({ name: hp.discriminator || tr('type'), why: tr('With a single table for the hierarchy, a discriminator column says which subtype each row belongs to.') });
      } else if (hp && hp.discriminator) {
        cols.push({ name: hp.discriminator, optional: true, why: tr('Discriminator of the hierarchy.') });
      }
      const pkWhy = e.weak
        ? tr('Weak entity `{entity}`: PK = owner\'s key + partial key ({partial}).', { entity: e.id, partial: e.attrs.filter((a) => a.kind === 'partial').map((a) => `\`${a.name}\``).join(', ') })
        : hs ? tr('Subtype `{sub}` shares the key of `{super}`.', { sub: e.id, super: hs.super })
        : tr('Rule 3: the identifier of `{entity}` becomes the PK.', { entity: e.id });
      addTable({
        name: e.id, kind: e.weak ? 'weak' : hs ? 'sub' : 'entity', element: e.id, cols, pkWhy,
        why: e.weak ? tr('`{entity}` is a weak entity: it still becomes a table (rule 1), identified through `{owner}`.', { entity: e.id, owner: ownerOf(e.id) })
          : hs ? (strat(hs) === 'subs'
            ? tr('`{sub}` is a subtype of `{super}`; with the one-table-per-subtype strategy it has its own table.', { sub: e.id, super: hs.super })
            : tr('`{sub}` is a subtype of `{super}`; with the supertype + subtypes strategy it has its own table.', { sub: e.id, super: hs.super }))
          : tr('Rule 1: entity `{entity}` becomes a table.', { entity: e.id }),
      });
    });

    // 2. Multivalued attributes: one table each.
    ex.entities.forEach((e) => {
      const owner = tableOf(e.id);
      e.attrs.filter((a) => a.kind === 'multivalued').forEach((a) => {
        if (!owner) return;
        const name = `${e.id}${pascal(a.name)}`;
        addTable({
          name, kind: 'multivalued', element: `${e.id}.${a.name}`, aliases: [a.name, pascal(a.name)],
          why: tr('`{attr}` is multivalued: it needs its own table with the key of `{entity}` plus the value.', { attr: a.name, entity: e.id }),
          pkWhy: tr('A multivalued attribute\'s table has PK = owner\'s key + the value.'),
          cols: [
            ...fkColsTo(e.id, { pk: true, why: tr('The table of multivalued `{attr}` references its owner `{entity}`.', { attr: a.name, entity: e.id }) }),
            { name: a.name, pk: true },
          ],
        });
      });
    });

    const uniqueName = (t, base, rel) => (t.cols.some((c) => norm(c.name) === norm(base)) ? `${rel} ${base}` : base);

    // 3. Relationships (rules 4–7).
    ex.relationships.forEach((r) => {
      if (r.identifying) {
        const weak = weakEnd(r);
        const holder = tables[tableOf(weak.entity)];
        if (holder) (r.attrs || []).forEach((a) => holder.cols.push({ name: a.name, why: tr('Attribute of relationship `{rel}`.', { rel: r.id }) }));
        return;
      }
      const ratio = ratioOf(r);
      const cards = r.ends.map((e) => parseCard(e.card));
      const unary = new Set(r.ends.map((e) => e.entity)).size < r.ends.length;
      if (ratio === '1:N' || ratio === '1:1') {
        let manyIdx;
        if (ratio === '1:N') manyIdx = cards[0].many ? 0 : 1;
        else manyIdx = unary ? 1 : r.ends.findIndex((e) => e.entity === choice[`oneToOne:${r.id}`]);
        const holderEnd = r.ends[manyIdx];
        const oneEnd = r.ends[1 - manyIdx];
        const holder = tables[tableOf(holderEnd.entity)];
        if (!holder) return;
        // A subtype stored in its supertype's table shares it with the other subtypes, so its FK must allow NULL.
        const folded = holder.name !== holderEnd.entity;
        const nn = cards[1 - manyIdx].min >= 1 && !folded;
        const rule = ratio === '1:N'
          ? tr('`{rel}` is 1:N: rule 5, the key of the one side (`{one}`) goes to the many side (`{many}`).', { rel: r.id, one: oneEnd.entity, many: holderEnd.entity })
          : unary
            ? tr('`{rel}` is 1:1: the key of one side passes to the other (rules 6–7).', { rel: r.id })
            : tr('`{rel}` is 1:1: the key of one side passes to the other (rules 6–7; here `{holder}` holds it).', { rel: r.id, holder: holderEnd.entity });
        const nnWhy = folded && cards[1 - manyIdx].min >= 1
          ? tr('`{holder}` is stored in the `{table}` table with the other subtypes, so the FK must allow NULL for the rows that are not `{holder}`.', { holder: holderEnd.entity, table: holder.name })
          : nn ? tr('The min at `{one}`\'s end is 1: every `{holder}` must have one (NOT NULL).', { one: oneEnd.entity, holder: holderEnd.entity })
          : tr('The min at `{one}`\'s end is 0: a `{holder}` may have none (NULL allowed).', { one: oneEnd.entity, holder: holderEnd.entity });
        const baseName = (c) => (unary ? (pkCols(oneEnd.entity).length > 1 ? `${oneEnd.role || r.id} ${c.name}` : (oneEnd.role || `${r.id} ${c.name}`)) : c.name);
        const cols = fkColsTo(oneEnd.entity, { nn, why: `${rule} ${nnWhy}` }).map((c, i) => ({ ...c, name: uniqueName(holder, baseName(pkCols(oneEnd.entity)[i]), r.id), rel: r.id, nnWhy, sideWhy: `${rule} ${nnWhy}` }));
        holder.cols.push(...cols);
        (r.attrs || []).forEach((a) => holder.cols.push({ name: a.name, why: tr('`{attr}` belongs to `{rel}` ({ratio}), so it goes with the foreign key, in `{table}`.', { attr: a.name, rel: r.id, ratio, table: holder.name }) }));
        return;
      }
      // M:N, unary M:N and ternary: a table of their own.
      // A ternary's PK: all three keys (the course's reference) or, if an end has max 1, only the N ends.
      const pkEnds = ratio === 'ternary' && choice[`ternaryKey:${r.id}`] === 'many' ? r.ends.map((e, i) => (cards[i].many ? i : -1)).filter((i) => i >= 0) : r.ends.map((_, i) => i);
      const usePk = pkEnds.length >= 2 ? pkEnds : r.ends.map((_, i) => i);
      const t = {
        name: r.id, kind: ratio === 'ternary' ? 'ternary' : 'mn', element: r.id, cols: [],
        why: ratio === 'ternary'
          ? (r.ends.length === 3
            ? tr('`{rel}` is a ternary relationship: it becomes a table with a FK to each of the three entities.', { rel: r.id })
            : tr('`{rel}` relates {n} entities: it becomes a table with a FK to each of them.', { rel: r.id, n: r.ends.length }))
          : tr('`{rel}` is M:N: rule 4, it becomes a table of its own.', { rel: r.id }),
        pkWhy: ratio === 'ternary'
          ? (choice[`ternaryKey:${r.id}`] === 'many'
            ? tr('The PK of ternary `{rel}` combines the keys of its entities whose end has max N.', { rel: r.id })
            : tr('The PK of ternary `{rel}` combines the keys of its entities.', { rel: r.id }))
          : tr('Rule 4: the PK of `{rel}` combines the keys of both entities.', { rel: r.id }),
      };
      r.ends.forEach((end, i) => {
        const names = (c) => (unary ? (pkCols(end.entity).length > 1 ? `${end.role || i} ${c.name}` : (end.role || `${c.name} ${i + 1}`)) : c.name);
        const fks = fkColsTo(end.entity, { pk: usePk.includes(i), nn: true, names, why: `${t.why} ${tr('It references `{entity}`.', { entity: end.entity })}` })
          .map((c) => ({ ...c, name: uniqueName(t, c.name, end.role || r.id), rel: r.id, sideWhy: t.why }));
        t.cols.push(...fks);
      });
      (r.attrs || []).forEach((a) => t.cols.push({ name: a.name, why: tr('`{attr}` is an attribute of `{rel}`, so it goes in its table.', { attr: a.name, rel: r.id }) }));
      addTable(t);
    });

    return order.map((n) => tables[n]);
  }

  function variants(ex) {
    const space = choiceSpace(ex);
    let combos = [{}];
    space.forEach((c) => {
      combos = combos.flatMap((base) => c.options.map((o) => ({ ...base, [`${c.kind}:${c.id}`]: o })));
    });
    combos = combos.slice(0, 96);
    const pref = Object.fromEntries(space.map((c) => [`${c.kind}:${c.id}`, preferredChoice(ex, c)]));
    return combos.map((choice) => ({
      choice,
      preferred: Object.keys(pref).every((k) => pref[k] === choice[k]),
      tables: derive(ex, choice),
    })).sort((a, b) => b.preferred - a.preferred);
  }

  /* ---- Checking a student's tables ----------------------------------------- */

  /* Student tables: [{ name, cols: [{ name, pk, fk: 'Table.col' | '', nn }] }] */
  function prepare(tables) {
    return tables.map((t, i) => ({
      i, name: t.name.trim(), key: norm(t.name),
      cols: t.cols.filter((c) => c.name.trim()).map((c) => {
        const dot = c.fk ? c.fk.lastIndexOf('.') : -1;
        return { name: c.name.trim(), key: norm(c.name), pk: !!c.pk, nn: !!c.nn || !!c.pk, fk: dot > 0 ? { table: c.fk.slice(0, dot), col: c.fk.slice(dot + 1) } : null };
      }),
    }));
  }

  function tableScore(s, e) {
    let score = 0;
    const names = [e.name, ...(e.aliases || [])].map(norm);
    if (names.includes(s.key)) score += 6;
    else if (names.some((n) => n && (s.key.includes(n) || n.includes(s.key)) && s.key.length > 2)) score += 2;
    e.cols.forEach((c) => {
      if (c.fk) { if (s.cols.some((x) => x.fk && norm(x.fk.table) === norm(c.fk.table))) score += 1.5; }
      else if (s.cols.some((x) => x.key === norm(c.name))) score += 2;
    });
    return score;
  }

  function matchTables(stu, exp) {
    const pairs = [];
    stu.forEach((s) => exp.forEach((e) => { const sc = tableScore(s, e); if (sc >= 3) pairs.push({ s, e, sc }); }));
    pairs.sort((a, b) => b.sc - a.sc);
    const sOf = new Map();
    const eOf = new Map();
    pairs.forEach(({ s, e }) => { if (!sOf.has(e.name) && !eOf.has(s.i)) { sOf.set(e.name, s); eOf.set(s.i, e); } });
    return { sOf, eOf };
  }

  function compare(ex, stu, exp) {
    const issues = [];
    const bad = (text, area) => issues.push({ status: 'bad', text, area });
    const note = (text, area) => issues.push({ status: 'note', text, area });
    const { sOf, eOf } = matchTables(stu, exp);
    const expOfStuName = (name) => { const s = stu.find((x) => x.name === name); return s ? eOf.get(s.i) : null; };
    const ents = Object.fromEntries(ex.entities.map((e) => [e.id, e]));
    const relById = Object.fromEntries(ex.relationships.map((r) => [r.id, r]));

    // Duplicated names.
    const seen = new Set();
    stu.forEach((s) => { if (seen.has(s.key)) bad(tr('There are two tables called `{table}`.', { table: s.name }), 'tables'); seen.add(s.key); });

    // Missing tables.
    exp.forEach((e) => { if (!sOf.has(e.name)) bad(tr('Missing a table. {why}', { why: e.why }), 'tables'); });

    // Extra tables.
    stu.forEach((s) => {
      if (eOf.has(s.i)) return;
      const r = ex.relationships.find((x) => norm(x.id) === s.key);
      if (r && ratioOf(r) !== 'M:N' && ratioOf(r) !== 'ternary') {
        bad(r.identifying
          ? tr('`{table}`: `{rel}` is an identifying relationship, so it does not need a table of its own; the owner key goes into the weak entity’s PK.', { table: s.name, rel: r.id })
          : tr('`{table}`: `{rel}` is {ratio}, so it does not need a table of its own; it becomes a foreign key in one of its tables.', { table: s.name, rel: r.id, ratio: ratioOf(r) }), 'tables');
      } else {
        const ent = ex.entities.find((x) => norm(x.id) === s.key);
        bad(ent
          ? tr('`{table}`: with the strategy you chose for the hierarchy, `{entity}` does not get a table of its own (or its columns do not match it).', { table: s.name, entity: ent.id })
          : tr('Table `{table}` does not correspond to any entity, M:N relationship or multivalued attribute of the model.', { table: s.name }), 'tables');
      }
    });

    // Columns of every matched table.
    exp.forEach((e) => {
      const s = sOf.get(e.name);
      if (!s) return;
      const used = new Set();
      const label = `\`${s.name}\``;
      const pkWanted = new Set();
      const pkGot = new Set();

      // Plain columns, by name.
      const composites = new Set();
      e.cols.filter((c) => !c.fk).forEach((c) => {
        const x = s.cols.find((y) => !used.has(y) && y.key === norm(c.name));
        if (x) {
          used.add(x);
          if (c.pk) pkWanted.add(c.name);
          if (x.pk) pkGot.add(c.name);
          if (x.fk) bad(tr('{table}: `{col}` is not a foreign key.', { table: label, col: x.name }), 'fks');
          return;
        }
        if (c.optional) return;
        if (c.composite) {
          const whole = s.cols.find((y) => !used.has(y) && y.key === norm(c.composite));
          if (whole) { used.add(whole); if (!composites.has(c.composite)) bad(`${label}: ${c.why}`, 'cols'); composites.add(c.composite); return; }
          if (composites.has(c.composite)) return;
        }
        if (c.pk) pkWanted.add(c.name);
        bad(tr('{table} is missing column `{col}`. {why}', { table: label, col: c.name, why: c.why || '' }).trim(), 'cols');
      });

      // Foreign keys, by the table and column they reference.
      e.cols.filter((c) => c.fk).forEach((c) => {
        const cands = s.cols.filter((y) => !used.has(y) && y.fk && (() => {
          const tgt = expOfStuName(y.fk.table);
          return tgt && tgt.name === c.fk.table && norm(y.fk.col) === norm(c.fk.col);
        })());
        const x = cands.find((y) => y.key === norm(c.name)) || cands[0];
        const tag = `fk:${c.fk.table}.${c.fk.col}:${c.name}`;
        if (c.pk) pkWanted.add(tag);
        if (!x) {
          const plain = s.cols.find((y) => !used.has(y) && !y.fk && y.key === norm(c.name));
          if (plain) { used.add(plain); if (plain.pk) pkGot.add(tag); bad(tr('{table}: `{col}` must be marked as a foreign key to `{ref}`. {why}', { table: label, col: plain.name, ref: `${c.fk.table}.${c.fk.col}`, why: c.why }), 'fks'); return; }
          bad(tr('{table} needs a foreign key to `{ref}`. {why}', { table: label, ref: `${c.fk.table}.${c.fk.col}`, why: c.why }), 'fks');
          return;
        }
        used.add(x);
        if (x.pk) pkGot.add(tag);
        if (!c.pk && !x.pk && x.nn !== !!c.nn) {
          bad((c.nn
            ? tr('{table}: the foreign key `{col}` should be NOT NULL. {why}', { table: label, col: x.name, why: c.nnWhy || '' })
            : tr('{table}: the foreign key `{col}` should allow NULL. {why}', { table: label, col: x.name, why: c.nnWhy || '' })).trim(), 'nulls');
        }
      });

      // PK comparison.
      const same = pkWanted.size === pkGot.size && [...pkWanted].every((k) => pkGot.has(k));
      const extraPk = s.cols.filter((y) => y.pk && !used.has(y));
      if (!same || extraPk.length) {
        const want = e.cols.filter((c) => c.pk).map((c) => `\`${c.name}\``).join(' + ');
        bad(tr('{table}: the primary key should be {pk}. {why}', { table: label, pk: want, why: e.pkWhy || '' }).trim(), 'pks');
      }

      // Columns that should not be there.
      s.cols.filter((y) => !used.has(y)).forEach((y) => {
        const owner = ents[e.element];
        const attr = owner && owner.attrs.find((a) => norm(a.name) === y.key);
        if (attr && attr.kind === 'derived') { note(tr('{table}: `{col}` is derived, so it is normally omitted (it can be computed).', { table: label, col: y.name }), 'cols'); return; }
        if (attr && attr.kind === 'multivalued') { bad(tr('{table}: `{col}` is multivalued, it cannot be a single column: it needs its own table.', { table: label, col: y.name }), 'cols'); return; }
        if (y.fk) {
          const tgt = expOfStuName(y.fk.table);
          const reverse = tgt && tgt.cols.find((c) => c.fk && c.fk.table === e.name && c.rel);
          if (reverse) {
            const r = relById[reverse.rel];
            bad(tr('{table}: the foreign key `{col}` is on the wrong side. {why}', { table: label, col: y.name, why: reverse.sideWhy || reverse.why }), 'fks');
            return;
          }
          bad(tr('{table}: unexpected foreign key `{col}` → `{ref}`. No relationship of the model puts it there.', { table: label, col: y.name, ref: y.fk.table }), 'fks');
          return;
        }
        bad(tr('{table}: column `{col}` does not come from the model (check the attribute names).', { table: label, col: y.name }), 'cols');
      });
    });

    // Every FK must point at the PK of the referenced table.
    stu.forEach((s) => s.cols.forEach((y) => {
      if (!y.fk) return;
      const t = stu.find((x) => x.name === y.fk.table);
      const col = t && t.cols.find((x) => x.name === y.fk.col);
      if (!t || !col) bad(tr('`{table}`: `{col}` references `{ref}`, which does not exist.', { table: s.name, col: y.name, ref: `${y.fk.table}.${y.fk.col}` }), 'fks');
      else if (!col.pk) bad(tr('`{table}`: `{col}` references `{ref}`, which is not a primary key column.', { table: s.name, col: y.name, ref: `${y.fk.table}.${y.fk.col}` }), 'fks');
    }));

    return issues;
  }

  function describeChoice(key, value) {
    const [kind, id] = key.split(':');
    if (kind === 'oneToOne') return tr('the foreign key of 1:1 `{rel}` in `{entity}`', { rel: id, entity: value });
    if (kind === 'ternaryKey') return value === 'all' ? tr('a PK made of all three keys for ternary `{rel}`', { rel: id }) : tr('a PK made only of the keys of the N ends for ternary `{rel}`', { rel: id });
    if (value === 'single') return tr('the single-table strategy for hierarchy `{id}`', { id });
    if (value === 'subs') return tr('the one-table-per-subtype strategy for hierarchy `{id}`', { id });
    return tr('the supertype + subtypes strategy for hierarchy `{id}`', { id });
  }

  function check(ex, studentTables, vars = variants(ex)) {
    const stu = prepare(studentTables.filter((t) => t.name.trim() || t.cols.some((c) => c.name.trim())));
    const unnamed = studentTables.filter((t) => !t.name.trim() && t.cols.some((c) => c.name.trim())).length;
    let best = null;
    vars.forEach((v) => {
      const issues = compare(ex, stu, v.tables);
      const nBad = issues.filter((i) => i.status === 'bad').length;
      if (!best || nBad < best.nBad) best = { v, issues, nBad };
    });
    const checks = [];
    if (unnamed) checks.push({ status: 'bad', text: unnamed > 1 ? tr('{n} tables have no name.', { n: unnamed }) : tr('1 table has no name.') });
    const areas = [
      ['tables', tr('Every table of the model is there, and nothing else.')],
      ['cols', tr('The attributes are in the right tables.')],
      ['pks', tr('The primary keys are right.')],
      ['fks', tr('The foreign keys are on the right side and point to the right keys.')],
      ['nulls', tr('NULL / NOT NULL on the foreign keys follows the minimum cardinalities.')],
    ];
    areas.forEach(([area, okText]) => {
      const list = best.issues.filter((i) => i.area === area);
      if (!list.some((i) => i.status === 'bad')) checks.push({ status: 'ok', text: okText });
      checks.push(...list);
    });
    const ok = !checks.some((c) => c.status === 'bad');
    const notes = [];
    if (ok && !best.v.preferred) {
      const pref = vars.find((v) => v.preferred);
      Object.keys(best.v.choice).forEach((k) => {
        if (pref && pref.choice[k] !== best.v.choice[k]) {
          notes.push(tr('You used {yours}; the course\'s reference uses {reference}. Both are valid.', { yours: describeChoice(k, best.v.choice[k]), reference: describeChoice(k, pref.choice[k]) }));
        }
      });
    }
    return { ok, checks, notes, variant: best.v, nBad: best.nBad };
  }

  return { variants, check, ratioOf, parseCard, norm };
})();

if (typeof module !== 'undefined') module.exports = LogicalEngine;
