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
        if (a.kind === 'composite') (a.parts || []).forEach((p) => out.push({ name: p, why: `\`${a.name}\` is a composite attribute of \`${e.id}\`: store its parts as separate columns.`, composite: a.name }));
        else out.push({ name: a.name, why: why || `Rule 2: every attribute of \`${e.id}\` becomes a column of its table.` });
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
          cols.push(...fkColsTo(hs.super, { pk: true, why: `\`${e.id}\` is a subtype of \`${hs.super}\` (supertype + subtypes strategy): its PK is the supertype's PK, which is also a FK to \`${hs.super}\`.` }));
        } else { // 'subs': the subtype copies the supertype's key and attributes
          cols.push(...pkCols(hs.super).map((c) => ({ name: c.name, pk: true })));
          cols.push(...plainCols(ents[hs.super], `With one table per subtype, \`${e.id}\` also stores the attributes of \`${hs.super}\`.`));
        }
      } else if (e.weak) {
        const owner = ownerOf(e.id);
        const idr = identifyingOf(e.id);
        pkCols(e.id).forEach((c) => {
          if (c.refEntity) cols.push({ name: c.name, pk: true, nn: true, fk: { table: tableOf(c.refEntity), col: c.refCol }, why: `\`${e.id}\` is a weak entity identified by \`${owner}\` (\`${idr.id}\`): its PK starts with the owner's key, which is also a FK.` });
          else cols.push({ name: c.name, pk: true });
        });
      } else {
        pkCols(e.id).forEach((c) => cols.push({ name: c.name, pk: true }));
      }
      cols.push(...plainCols(e));
      if (hp && strat(hp) === 'single') {
        hp.subs.forEach((s) => cols.push(...plainCols(ents[s], `With a single table for the hierarchy, \`${e.id}\` also stores the attributes of subtype \`${s}\`.`)));
        cols.push({ name: hp.discriminator || 'type', why: `With a single table for the hierarchy, a discriminator column says which subtype each row belongs to.` });
      } else if (hp && hp.discriminator) {
        cols.push({ name: hp.discriminator, optional: true, why: 'Discriminator of the hierarchy.' });
      }
      const pkWhy = e.weak
        ? `Weak entity \`${e.id}\`: PK = owner's key + partial key (${e.attrs.filter((a) => a.kind === 'partial').map((a) => `\`${a.name}\``).join(', ')}).`
        : hs ? `Subtype \`${e.id}\` shares the key of \`${hs.super}\`.`
        : `Rule 3: the identifier of \`${e.id}\` becomes the PK.`;
      addTable({
        name: e.id, kind: e.weak ? 'weak' : hs ? 'sub' : 'entity', element: e.id, cols, pkWhy,
        why: e.weak ? `\`${e.id}\` is a weak entity: it still becomes a table (rule 1), identified through \`${ownerOf(e.id)}\`.`
          : hs ? `\`${e.id}\` is a subtype of \`${hs.super}\`; with the ${strat(hs) === 'subs' ? 'one-table-per-subtype' : 'supertype + subtypes'} strategy it has its own table.`
          : `Rule 1: entity \`${e.id}\` becomes a table.`,
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
          why: `\`${a.name}\` is multivalued: it needs its own table with the key of \`${e.id}\` plus the value.`,
          pkWhy: `A multivalued attribute's table has PK = owner's key + the value.`,
          cols: [
            ...fkColsTo(e.id, { pk: true, why: `The table of multivalued \`${a.name}\` references its owner \`${e.id}\`.` }),
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
        if (holder) (r.attrs || []).forEach((a) => holder.cols.push({ name: a.name, why: `Attribute of relationship \`${r.id}\`.` }));
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
        const nn = cards[1 - manyIdx].min >= 1;
        const rule = ratio === '1:N'
          ? `\`${r.id}\` is 1:N: rule 5, the key of the one side (\`${oneEnd.entity}\`) goes to the many side (\`${holderEnd.entity}\`).`
          : `\`${r.id}\` is 1:1: the key of one side passes to the other (rules 6–7${unary ? '' : `; here \`${holderEnd.entity}\` holds it`}).`;
        const nnWhy = nn
          ? `The min at \`${oneEnd.entity}\`'s end is 1: every \`${holderEnd.entity}\` must have one (NOT NULL).`
          : `The min at \`${oneEnd.entity}\`'s end is 0: a \`${holderEnd.entity}\` may have none (NULL allowed).`;
        const baseName = (c) => (unary ? (pkCols(oneEnd.entity).length > 1 ? `${oneEnd.role || r.id} ${c.name}` : (oneEnd.role || `${r.id} ${c.name}`)) : c.name);
        const cols = fkColsTo(oneEnd.entity, { nn, why: `${rule} ${nnWhy}` }).map((c, i) => ({ ...c, name: uniqueName(holder, baseName(pkCols(oneEnd.entity)[i]), r.id), rel: r.id, nnWhy }));
        holder.cols.push(...cols);
        (r.attrs || []).forEach((a) => holder.cols.push({ name: a.name, why: `\`${a.name}\` belongs to \`${r.id}\` (${ratio}), so it goes with the foreign key, in \`${holder.name}\`.` }));
        return;
      }
      // M:N, unary M:N and ternary: a table of their own.
      // A ternary's PK: all three keys (the course's reference) or, if an end has max 1, only the N ends.
      const pkEnds = ratio === 'ternary' && choice[`ternaryKey:${r.id}`] === 'many' ? r.ends.map((e, i) => (cards[i].many ? i : -1)).filter((i) => i >= 0) : r.ends.map((_, i) => i);
      const usePk = pkEnds.length >= 2 ? pkEnds : r.ends.map((_, i) => i);
      const t = {
        name: r.id, kind: ratio === 'ternary' ? 'ternary' : 'mn', element: r.id, cols: [],
        why: ratio === 'ternary'
          ? `\`${r.id}\` is a ternary relationship: it becomes a table with a FK to each of the three entities.`
          : `\`${r.id}\` is M:N: rule 4, it becomes a table of its own.`,
        pkWhy: ratio === 'ternary'
          ? `The PK of ternary \`${r.id}\` combines the keys of its entities${choice[`ternaryKey:${r.id}`] === 'many' ? ' whose end has max N' : ''}.`
          : `Rule 4: the PK of \`${r.id}\` combines the keys of both entities.`,
      };
      r.ends.forEach((end, i) => {
        const names = (c) => (unary ? (pkCols(end.entity).length > 1 ? `${end.role || i} ${c.name}` : (end.role || `${c.name} ${i + 1}`)) : c.name);
        const fks = fkColsTo(end.entity, { pk: usePk.includes(i), nn: true, names, why: `${t.why} It references \`${end.entity}\`.` })
          .map((c) => ({ ...c, name: uniqueName(t, c.name, end.role || r.id), rel: r.id }));
        t.cols.push(...fks);
      });
      (r.attrs || []).forEach((a) => t.cols.push({ name: a.name, why: `\`${a.name}\` is an attribute of \`${r.id}\`, so it goes in its table.` }));
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
    stu.forEach((s) => { if (seen.has(s.key)) bad(`There are two tables called \`${s.name}\`.`, 'tables'); seen.add(s.key); });

    // Missing tables.
    exp.forEach((e) => { if (!sOf.has(e.name)) bad(`Missing a table. ${e.why}`, 'tables'); });

    // Extra tables.
    stu.forEach((s) => {
      if (eOf.has(s.i)) return;
      const r = ex.relationships.find((x) => norm(x.id) === s.key);
      if (r && ratioOf(r) !== 'M:N' && ratioOf(r) !== 'ternary') {
        bad(`\`${s.name}\`: \`${r.id}\` is ${r.identifying ? 'an identifying relationship' : ratioOf(r)}, so it does not need a table of its own; ${r.identifying ? 'the owner key goes into the weak entity’s PK.' : 'it becomes a foreign key in one of its tables.'}`, 'tables');
      } else {
        const ent = ex.entities.find((x) => norm(x.id) === s.key);
        bad(ent
          ? `\`${s.name}\`: with the strategy you chose for the hierarchy, \`${ent.id}\` does not get a table of its own (or its columns do not match it).`
          : `Table \`${s.name}\` does not correspond to any entity, M:N relationship or multivalued attribute of the model.`, 'tables');
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
          if (x.fk) bad(`${label}: \`${x.name}\` is not a foreign key.`, 'fks');
          return;
        }
        if (c.optional) return;
        if (c.composite) {
          const whole = s.cols.find((y) => !used.has(y) && y.key === norm(c.composite));
          if (whole) { used.add(whole); if (!composites.has(c.composite)) bad(`${label}: ${c.why}`, 'cols'); composites.add(c.composite); return; }
          if (composites.has(c.composite)) return;
        }
        if (c.pk) pkWanted.add(c.name);
        bad(`${label} is missing column \`${c.name}\`. ${c.why || ''}`.trim(), 'cols');
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
          if (plain) { used.add(plain); if (plain.pk) pkGot.add(tag); bad(`${label}: \`${plain.name}\` must be marked as a foreign key to \`${c.fk.table}.${c.fk.col}\`. ${c.why}`, 'fks'); return; }
          bad(`${label} needs a foreign key to \`${c.fk.table}.${c.fk.col}\`. ${c.why}`, 'fks');
          return;
        }
        used.add(x);
        if (x.pk) pkGot.add(tag);
        if (!c.pk && !x.pk && x.nn !== !!c.nn) {
          bad(`${label}: the foreign key \`${x.name}\` should be ${c.nn ? 'NOT NULL' : 'NULL-able'}. ${c.nnWhy || ''}`.trim(), 'nulls');
        }
      });

      // PK comparison.
      const same = pkWanted.size === pkGot.size && [...pkWanted].every((k) => pkGot.has(k));
      const extraPk = s.cols.filter((y) => y.pk && !used.has(y));
      if (!same || extraPk.length) {
        const want = e.cols.filter((c) => c.pk).map((c) => `\`${c.name}\``).join(' + ');
        bad(`${label}: the primary key should be ${want}. ${e.pkWhy || ''}`.trim(), 'pks');
      }

      // Columns that should not be there.
      s.cols.filter((y) => !used.has(y)).forEach((y) => {
        const owner = ents[e.element];
        const attr = owner && owner.attrs.find((a) => norm(a.name) === y.key);
        if (attr && attr.kind === 'derived') { note(`${label}: \`${y.name}\` is derived, so it is normally omitted (it can be computed).`, 'cols'); return; }
        if (attr && attr.kind === 'multivalued') { bad(`${label}: \`${y.name}\` is multivalued, it cannot be a single column: it needs its own table.`, 'cols'); return; }
        if (y.fk) {
          const tgt = expOfStuName(y.fk.table);
          const reverse = tgt && tgt.cols.find((c) => c.fk && c.fk.table === e.name && c.rel);
          if (reverse) {
            const r = relById[reverse.rel];
            bad(`${label}: the foreign key \`${y.name}\` is on the wrong side. ${reverse.why.split(' It ')[0]}`, 'fks');
            return;
          }
          bad(`${label}: unexpected foreign key \`${y.name}\` → \`${y.fk.table}\`. No relationship of the model puts it there.`, 'fks');
          return;
        }
        bad(`${label}: column \`${y.name}\` does not come from the model (check the attribute names).`, 'cols');
      });
    });

    // Every FK must point at the PK of the referenced table.
    stu.forEach((s) => s.cols.forEach((y) => {
      if (!y.fk) return;
      const t = stu.find((x) => x.name === y.fk.table);
      const col = t && t.cols.find((x) => x.name === y.fk.col);
      if (!t || !col) bad(`\`${s.name}\`: \`${y.name}\` references \`${y.fk.table}.${y.fk.col}\`, which does not exist.`, 'fks');
      else if (!col.pk) bad(`\`${s.name}\`: \`${y.name}\` references \`${y.fk.table}.${y.fk.col}\`, which is not a primary key column.`, 'fks');
    }));

    return issues;
  }

  function describeChoice(key, value) {
    const [kind, id] = key.split(':');
    if (kind === 'oneToOne') return `the foreign key of 1:1 \`${id}\` in \`${value}\``;
    if (kind === 'ternaryKey') return value === 'all' ? `a PK made of all three keys for ternary \`${id}\`` : `a PK made only of the keys of the N ends for ternary \`${id}\``;
    return `the ${{ 'super+subs': 'supertype + subtypes', single: 'single-table', subs: 'one-table-per-subtype' }[value]} strategy for hierarchy \`${id}\``;
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
    if (unnamed) checks.push({ status: 'bad', text: `${unnamed} table${unnamed > 1 ? 's have' : ' has'} no name.` });
    const areas = [
      ['tables', 'Every table of the model is there, and nothing else.'],
      ['cols', 'The attributes are in the right tables.'],
      ['pks', 'The primary keys are right.'],
      ['fks', 'The foreign keys are on the right side and point to the right keys.'],
      ['nulls', 'NULL / NOT NULL on the foreign keys follows the minimum cardinalities.'],
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
          notes.push(`You used ${describeChoice(k, best.v.choice[k])}; the course's reference uses ${describeChoice(k, pref.choice[k])}. Both are valid.`);
        }
      });
    }
    return { ok, checks, notes, variant: best.v, nBad: best.nBad };
  }

  return { variants, check, ratioOf, parseCard, norm };
})();

if (typeof module !== 'undefined') module.exports = LogicalEngine;
