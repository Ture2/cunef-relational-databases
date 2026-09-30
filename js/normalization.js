'use strict';

/* ==========================================================================
   Normalization practice (Relational databases › Normalization).
   Data lives in data/normalization.js. This file has three parts:
     1. Dependency engine (functional, multivalued and join) and checker
     2. "Normalize" mode (attribute/table matrix, step by step)
     3. "Diagnose" mode (normal-form quiz)
   Routing lives in js/main.js, which calls Normalization.render(route).
   ========================================================================== */

const Normalization = (() => {

const BASE = '#/relational/normalization';
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MAX_TABLES = 8;
const LEVELS = ['2NF', '3NF', 'BCNF', '4NF', '5NF'];
const levelIdx = (nf) => LEVELS.indexOf(nf);
const OPTIONS = ['Fails 1NF', 'Meets 1NF, but not 2NF', 'Meets 2NF, but not 3NF', 'Meets 3NF'];
const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICON = {
  ok: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#1D7A4A"/><path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bad: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#B42318"/><path d="M6.6 6.6l6.8 6.8M13.4 6.6l-6.8 6.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
  note: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" stroke="#58627D" stroke-width="1.6"/><path d="M10 9v5" stroke="#58627D" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="6.2" r="1.1" fill="#58627D"/></svg>',
  key: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5" cy="8" r="2.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7.6 8H14M11.6 8v2.6M14 8v2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
};

/* Progress saved in the browser (this device only). */
const store = {
  key: 'normalization-en-v1',
  load() {
    try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { return {}; }
  },
  save(data) {
    try { localStorage.setItem(this.key, JSON.stringify(data)); } catch (e) { /* no storage available */ }
  },
};
const progress = Object.assign({ solved: {}, quizBest: 0, quizBestAdv: 0 }, store.load());

/* Intermediate exercise state (tables, current step and completed steps). It is saved with a
   signature of each exercise: if you change its attributes, dependencies or steps, the old state is discarded. */
const workStore = {
  key: 'normalization-en-work-v1',
  load() {
    try { const d = JSON.parse(localStorage.getItem(this.key)); return d && typeof d === 'object' ? d : {}; } catch (e) { return {}; }
  },
  save(data) {
    try { localStorage.setItem(this.key, JSON.stringify(data)); } catch (e) { /* no storage available */ }
  },
  clear() {
    try { localStorage.removeItem(this.key); } catch (e) { /* no storage available */ }
  },
};
const savedWork = workStore.load();

const exSignature = (ex) => {
  const s = JSON.stringify([ex.attrs, ex.fds, ex.mvds || [], ex.jds || [], ex.rows.length, ex.steps.map((st) => st.nf)]);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

/* ==========================================================================
   1. Dependency engine
   Attribute sets are bit masks (one bit per attribute).
   Multivalued dependencies are two-sided join dependencies.
   ========================================================================== */

const popcount = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
const parseList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const depEntry = (d) => (typeof d === 'string' ? { def: d } : d);

/* '{a, b} → c' when the left-hand side has several attributes. */
const fdText = (text) => {
  const [l, r] = text.split('->').map(parseList);
  return `${l.length > 1 ? `{${l.join(', ')}}` : l[0]} → ${r.join(', ')}`;
};

function buildEngine(ex) {
  const n = ex.attrs.length;
  const index = new Map(ex.attrs.map((a, i) => [a, i]));
  const bit = (name) => {
    if (!index.has(name)) throw new Error(`Unknown attribute in “${ex.id}”: ${name}`);
    return 1 << index.get(name);
  };
  const maskOf = (names) => names.reduce((m, a) => m | bit(a), 0);
  const namesOf = (mask) => ex.attrs.filter((_, i) => mask & (1 << i));
  const cols = (mask) => { const out = []; for (let i = 0; i < n; i++) if (mask & (1 << i)) out.push(i); return out; };
  const full = (1 << n) - 1;
  const setText = (m) => (popcount(m) > 1 ? `{${namesOf(m).join(', ')}}` : namesOf(m).join(', '));

  const fds = (ex.fds || []).map((text) => {
    const [l, r] = text.split('->');
    return { text, lhs: maskOf(parseList(l)), rhs: maskOf(parseList(r)) };
  });

  /* Multivalued and join dependencies, all expressed as a join of several sides. */
  const jds = [];
  (ex.mvds || []).map(depEntry).forEach((d) => {
    const [l, r] = d.def.split('->>');
    const X = maskOf(parseList(l));
    const Y = maskOf(parseList(r)) & ~X;
    const Z = full & ~X & ~Y;
    if (!Y || !Z) throw new Error(`The multivalued dependency “${d.def}” is trivial in “${ex.id}”`);
    jds.push({
      kind: 'mvd', def: d.def, X, Y, Z, comps: [X | Y, X | Z],
      show: d.show || `${setText(X)} ↠ ${namesOf(Y).join(', ')} | ${namesOf(Z).join(', ')}`,
    });
  });
  (ex.jds || []).map(depEntry).forEach((d) => {
    const comps = d.def.split('|').map((s) => maskOf(parseList(s)));
    if (comps.reduce((a, b) => a | b, 0) !== full) throw new Error(`The sides of the join dependency “${d.def}” do not cover every attribute of “${ex.id}”`);
    jds.push({ kind: 'jd', def: d.def, comps, show: d.show || comps.map(setText).join(' ⋈ ') });
  });

  /* Closure of a set of attributes under the functional dependencies. */
  function closure(x) {
    let res = x;
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of fds) {
        if ((f.lhs & res) === f.lhs && (f.rhs & ~res) !== 0) { res |= f.rhs; changed = true; }
      }
    }
    return res;
  }

  const subsets = (mask) => {
    const out = [];
    for (let s = mask; s > 0; s = (s - 1) & mask) out.push(s);
    return out;
  };

  /* Candidate keys of a relation (minimal subsets whose closure covers it). */
  function candidateKeys(rel) {
    const keys = [];
    const subs = subsets(rel).sort((a, b) => popcount(a) - popcount(b));
    for (const s of subs) {
      if ((closure(s) & rel) === rel && !keys.some((k) => (k & s) === k)) keys.push(s);
    }
    return keys;
  }

  /* Violations based on functional dependencies: '2NF', '3NF' or 'BCNF'. */
  function violations(rel, level) {
    const keys = candidateKeys(rel);
    const prime = keys.reduce((m, k) => m | k, 0);
    const found = [];
    for (const x of subsets(rel)) {
      const cl = closure(x) & rel;
      if (cl === rel) continue;                                   // x is a superkey
      const dep = level === 'BCNF' ? cl & ~x : cl & ~x & ~prime;  // BCNF: any attribute; 3NF: only non-prime ones
      if (!dep) continue;
      const partial = keys.some((k) => (x & k) === x && x !== k);
      found.push({ lhs: x, rhs: dep, type: level === 'BCNF' ? 'bcnf' : partial ? 'partial' : 'transitive' });
    }
    const minimal = found.filter(
      (v) => !found.some((w) => w !== v && (w.lhs & v.lhs) === w.lhs && (w.rhs & v.rhs) === v.rhs),
    );
    return level === '2NF' ? minimal.filter((v) => v.type === 'partial') : minimal;
  }

  /* Projection of a join dependency onto a table. Returns the resulting sides,
     or null if the dependency cannot be carried over to that table. */
  function projectJD(jd, rel) {
    const det = closure(rel);
    const cs = jd.comps;
    for (let i = 0; i < cs.length; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        if ((cs[i] & cs[j] & ~rel & ~det) !== 0) return null;   // the overlap is not determined by the table
      }
    }
    const comps = cs.map((c) => c & rel).filter((c) => c !== 0);
    return comps.filter((c, i) => !comps.some((d, j) => j !== i && (c & d) === c && (c !== d || j < i)));
  }

  /* Problems of a table for reaching a normal form (includes the previous ones). */
  function problems(rel, nf) {
    const k = levelIdx(nf);
    const out = [];
    violations(rel, k >= 2 ? 'BCNF' : nf).forEach((v) => out.push(v));
    if (k >= 3) {
      for (const jd of jds) {
        const comps = projectJD(jd, rel);
        if (!comps || comps.length !== 2 || comps.includes(rel)) continue;
        const X = comps[0] & comps[1];
        if ((closure(X) & rel) === rel) continue;
        out.push({ type: 'mvd', lhs: X, rhs: comps[0] & ~X, rest: comps[1] & ~X });
      }
    }
    if (k >= 4) {
      for (const jd of jds) {
        const comps = projectJD(jd, rel);
        if (!comps || comps.length < 3 || comps.includes(rel)) continue;
        if (!lossless(comps, { jd: false })) out.push({ type: 'jd', comps });
      }
    }
    return out;
  }

  /* Highest normal form met by all the tables (null: not even 2NF). */
  function bestLevel(rels) {
    let best = null;
    for (const nf of LEVELS) {
      if (rels.every((r) => problems(r, nf).length === 0)) best = nf; else break;
    }
    return best;
  }

  /* Lossless join: the tableau algorithm (chase) with functional dependencies
     and, unless opts.jd is false, with multivalued and join dependencies. */
  function lossless(rels, opts = {}) {
    const useJD = opts.jd !== false;
    const U = rels.reduce((a, b) => a | b, 0);
    const T = rels.map((m, i) => Array.from({ length: n }, (_, j) => ((m >> j) & 1 ? j : n + i * n + j)));
    const jdCols = jds.map((jd) => jd.comps.map(cols));
    let changed = true;
    let guard = 0;
    while (changed && guard++ < 100) {
      changed = false;
      for (const f of fds) {
        const L = cols(f.lhs);
        const R = cols(f.rhs);
        for (let i = 0; i < T.length; i++) {
          for (let k = i + 1; k < T.length; k++) {
            if (!L.every((c) => T[i][c] === T[k][c])) continue;
            for (const c of R) {
              const a = T[i][c];
              const b = T[k][c];
              if (a === b) continue;
              const keep = Math.min(a, b);
              const drop = Math.max(a, b);
              for (const row of T) if (row[c] === drop) row[c] = keep;
              changed = true;
            }
          }
        }
      }
      if (!useJD) continue;
      const seen = new Set(T.map((r) => r.join(',')));
      jdCols.forEach((comps) => {
        const k = comps.length;
        const overlap = comps.map((ci) => comps.map((cj) => ci.filter((c) => cj.includes(c))));
        const made = [];
        const chosen = [];
        const pick = (i) => {
          if (T.length + made.length > 500) return;
          if (i === k) {
            const s = new Array(n).fill(-1);
            chosen.forEach((row, idx) => comps[idx].forEach((c) => { s[c] = row[c]; }));
            const key = s.join(',');
            if (!seen.has(key)) { seen.add(key); made.push(s); }
            return;
          }
          for (const row of T) {
            if (chosen.every((r2, j) => overlap[i][j].every((c) => row[c] === r2[c]))) {
              chosen.push(row);
              pick(i + 1);
              chosen.pop();
            }
          }
        };
        pick(0);
        if (made.length) { T.push(...made); changed = true; }
      });
    }
    return T.some((row) => row.every((v, j) => !((U >> j) & 1) || v === j));
  }

  /* Functional dependencies that no combination of tables lets you check. */
  function lostDependencies(rels) {
    const lost = [];
    for (const f of fds) {
      let z = f.lhs;
      let changed = true;
      while (changed) {
        changed = false;
        for (const r of rels) {
          const add = closure(z & r) & r;
          if ((add & ~z) !== 0) { z |= add; changed = true; }
        }
      }
      const missing = f.rhs & ~z;
      if (missing) lost.push({ lhs: f.lhs, rhs: missing });
    }
    return lost;
  }

  return { n, full, fds, jds, maskOf, namesOf, setText, closure, candidateKeys, violations, problems, bestLevel, lossless, lostDependencies };
}

function projectRows(ex, attrs) {
  const idx = attrs.map((a) => ex.attrs.indexOf(a));
  const seen = new Set();
  const out = [];
  for (const r of ex.rows) {
    const row = idx.map((k) => r[k]);
    const key = JSON.stringify(row);
    if (!seen.has(key)) { seen.add(key); out.push(row); }
  }
  return out;
}

/* Joins (natural join) the projected data of the tables and compares it with the
   original table. Returns the rows that appear in excess, or null if it is huge. */
function dataJoin(ex, E, tables) {
  const parts = tables.map((t) => {
    const attrs = E.namesOf(t.attrs);
    return { attrs, rows: projectRows(ex, attrs).map((r) => Object.fromEntries(attrs.map((a, i) => [a, r[i]]))) };
  });
  if (!parts.length) return null;
  const first = parts.shift();
  const have = new Set(first.attrs);
  let rows = first.rows;
  while (parts.length) {
    let bi = 0;
    let best = -1;
    parts.forEach((p, i) => {
      const c = p.attrs.filter((a) => have.has(a)).length;
      if (c > best) { best = c; bi = i; }
    });
    const p = parts.splice(bi, 1)[0];
    const common = p.attrs.filter((a) => have.has(a));
    const next = [];
    for (const r of rows) {
      for (const s of p.rows) {
        if (common.every((a) => r[a] === s[a])) {
          next.push({ ...r, ...s });
          if (next.length > 5000) return null;
        }
      }
    }
    rows = next;
    p.attrs.forEach((a) => have.add(a));
  }
  const orig = new Set(ex.rows.map((r) => JSON.stringify(r)));
  const seen = new Set();
  const spurious = [];
  rows.forEach((r) => {
    const vals = ex.attrs.map((a) => r[a]);
    const k = JSON.stringify(vals);
    if (seen.has(k)) return;
    seen.add(k);
    if (!orig.has(k)) spurious.push(vals);
  });
  return { spurious, total: seen.size };
}

/* Validates a decomposition for the given step. tables: [{ label, attrs, pk }] (bit masks). */
function evaluate(ex, step, E, tables) {
  const checks = [];
  const notes = [];
  const push = (status, text) => checks.push({ status, text });
  const names = (m) => E.namesOf(m).join(', ');
  const fd = (l, r) => `${E.setText(l)} → ${names(r)}`;
  const q = (t) => `“${t.label}”`;
  const nf = step.nf;
  const rels = tables.map((t) => t.attrs);

  // Coverage
  const missing = E.full & ~rels.reduce((a, b) => a | b, 0);
  if (missing) push('bad', `Missing attributes: ${names(missing)}. Every attribute of the original table must appear in some table.`);
  else push('ok', 'All the attributes of the original table appear in some table.');

  // Primary keys
  const keyProblems = [];
  for (const t of tables) {
    if (!t.pk) { keyProblems.push(`${q(t)} has no primary key. Mark the attributes that identify each row.`); continue; }
    const determined = E.closure(t.pk) & t.attrs;
    if (determined !== t.attrs) {
      keyProblems.push(`In ${q(t)}, the key (${names(t.pk)}) does not identify each row: it does not determine ${names(t.attrs & ~determined)}.`);
      continue;
    }
    const removable = E.namesOf(t.pk).find((a) => (E.closure(t.pk & ~E.maskOf([a])) & t.attrs) === t.attrs);
    if (removable) keyProblems.push(`In ${q(t)}, the key is not minimal: without ${removable} it still identifies each row.`);
  }
  if (keyProblems.length) keyProblems.forEach((t) => push('bad', t));
  else push('ok', 'Every table has a valid primary key.');

  // Normal form
  const nfProblems = [];
  for (const t of tables) {
    for (const v of E.problems(t.attrs, nf)) {
      const many = popcount(v.rhs || 0) > 1;
      if (v.type === 'partial') {
        nfProblems.push(`${q(t)} does not meet 2NF: ${fd(v.lhs, v.rhs)}. ${many ? 'These attributes depend' : 'This attribute depends'} on only part of the key.`);
      } else if (v.type === 'transitive') {
        nfProblems.push(`${q(t)} does not meet 3NF: ${fd(v.lhs, v.rhs)}. ${many ? 'These attributes depend' : 'This attribute depends'} on ${names(v.lhs)}, which is not a key.`);
      } else if (v.type === 'bcnf') {
        nfProblems.push(`${q(t)} does not meet BCNF: ${fd(v.lhs, v.rhs)}. ${E.setText(v.lhs)} determines ${names(v.rhs)}, but does not identify each row of the table.`);
      } else if (v.type === 'mvd') {
        nfProblems.push(`${q(t)} does not meet 4NF: ${E.setText(v.lhs)} ↠ ${names(v.rhs)} | ${names(v.rest)}. For each ${E.setText(v.lhs)}, the values of ${names(v.rhs)} and of ${names(v.rest)} are independent of each other, which is why all their combinations are repeated in the same table.`);
      } else if (v.type === 'jd') {
        nfProblems.push(`${q(t)} does not meet 5NF: it can be rebuilt by joining ${v.comps.map((c) => E.setText(c)).join(', ')}. The table stores information that is already implied by those parts.`);
      }
    }
  }
  if (nfProblems.length) nfProblems.forEach((t) => push('bad', t));
  else push('ok', `Every table meets ${nf}.`);

  // Lossless join and dependencies (only meaningful if no attributes are missing)
  let lostAllowed = false;
  if (!missing) {
    if (E.lossless(rels)) {
      push('ok', 'No information is lost: joining the tables recovers the original table.');
    } else {
      const join = dataJoin(ex, E, tables);
      const example = join && join.spurious.length
        ? ` For example, the row (${join.spurious[0].join(', ')}) would appear, and it was not there.`
        : join
          ? ' It is not visible with the sample rows, but the decomposition does not guarantee recovering the original.'
          : '';
      const cause = levelIdx(nf) >= 3
        ? 'That split does not let you rebuild the original table: check which groups of attributes you keep together.'
        : 'A common attribute that links them (a foreign key) is usually missing.';
      push('bad', `Information is lost: joining the tables produces rows that were not in the original.${example} ${cause}`);
    }

    const lost = E.lostDependencies(rels);
    if (!lost.length) push('ok', 'All the functional dependencies are preserved.');
    else if (step.allowLoss) {
      lostAllowed = true;
      lost.forEach((d) => push('note', `The dependency ${fd(d.lhs, d.rhs)} is lost: no table contains those attributes together. In ${nf} this is sometimes unavoidable, and here it is worth it.`));
    } else lost.forEach((d) => push('bad', `The dependency ${fd(d.lhs, d.rhs)} is lost: no table contains those attributes together.`));
  }

  const ok = !checks.some((c) => c.status === 'bad');
  const fks = [];
  let reached = null;

  if (ok) {
    reached = E.bestLevel(rels);
    // Redundant tables
    tables.forEach((a, i) => tables.forEach((b, j) => {
      if (i !== j && (a.attrs & b.attrs) === a.attrs && (a.attrs !== b.attrs || i < j)) {
        notes.push(`${q(a)} is already contained in ${q(b)}: it is redundant.`);
      }
    }));
    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        const a = tables[i];
        const b = tables[j];
        const common = a.attrs & b.attrs;
        if (a.pk && a.pk === b.pk && common !== a.attrs && common !== b.attrs && E.problems(a.attrs | b.attrs, nf).length === 0) {
          notes.push(`${q(a)} and ${q(b)} have the same key: they can be merged without breaking ${nf}. Split a table only when a dependency justifies it.`);
        }
      }
    }
    // Foreign keys: B’s key is inside A
    tables.forEach((a) => tables.forEach((b) => {
      if (a !== b && a.pk && b.pk && a.pk !== b.pk && (a.attrs & b.pk) === b.pk) {
        fks.push(`${a.label} (${names(b.pk)}) references ${b.label}`);
      }
    }));
  }

  return { ok, checks, notes, fks, nf, reached, lostAllowed };
}

/* Data consistency checks: they only write to the console. */
function checkData(ex, E, label) {
  ex.rows.forEach((r, i) => {
    if (r.length !== ex.attrs.length) console.warn(`[${label}] row ${i + 1} has ${r.length} values but there are ${ex.attrs.length} attributes`);
  });
  (ex.fds || []).forEach((text) => {
    const [l, r] = text.split('->').map(parseList);
    const li = l.map((a) => ex.attrs.indexOf(a));
    const ri = r.map((a) => ex.attrs.indexOf(a));
    const seen = new Map();
    ex.rows.forEach((row, i) => {
      const k = li.map((p) => row[p]).join('\u0000');
      const v = ri.map((p) => row[p]).join('\u0000');
      if (seen.has(k) && seen.get(k) !== v) console.warn(`[${label}] the data violates “${text}” (row ${i + 1})`);
      seen.set(k, v);
    });
  });
  E.jds.forEach((jd) => {
    const comps = jd.comps.map((c) => ({ attrs: E.namesOf(c), mask: c }));
    const j = dataJoin(ex, E, comps.map((c) => ({ attrs: c.mask })));
    if (j && j.spurious.length) console.warn(`[${label}] the data violates “${jd.show}”: the join invents rows, for example (${j.spurious[0].join(', ')})`);
  });
}

function selfTest() {
  EXERCISES.forEach((ex) => {
    try {
      const E = buildEngine(ex);
      checkData(ex, E, ex.id);
      let prev = null;
      let lastIdx = -1;
      ex.steps.forEach((step, i) => {
        if (levelIdx(step.nf) <= lastIdx) console.warn(`[${ex.id}] steps must go in increasing normal-form order (step ${i + 1})`);
        lastIdx = levelIdx(step.nf);
        const sol = step.solution.map((t) => ({ label: t.name, attrs: E.maskOf(t.attrs), pk: E.maskOf(t.pk) }));
        const res = evaluate(ex, step, E, sol);
        if (!res.ok) console.warn(`[${ex.id}] the solution of step ${step.nf} does not pass the check:`, res.checks.filter((c) => c.status === 'bad').map((c) => c.text));
        const start = i === 0 ? [E.full] : prev;
        const needs = start.some((rel) => E.problems(rel, step.nf).length > 0);
        if (!needs && !step.vacuous) console.warn(`[${ex.id}] step ${step.nf} requires no change: remove it or mark it as vacuous`);
        if (needs && step.vacuous) console.warn(`[${ex.id}] step ${step.nf} is marked as vacuous, but it requires changes`);
        if (!step.hints || !step.hints.length) console.warn(`[${ex.id}] step ${step.nf} has no hints`);
        prev = sol.map((t) => t.attrs);
      });
    } catch (err) {
      console.warn(`[${ex.id}]`, err.message);
    }
  });

  QUESTIONS.forEach((qn) => {
    try {
      if (!qn.fds && !qn.adv) return;      // 1NF questions: they have no dependencies
      const pseudo = { id: `question ${qn.name}`, attrs: qn.cols, fds: qn.fds || [], mvds: qn.mvds, jds: qn.jds, rows: qn.rows };
      const E = buildEngine(pseudo);
      checkData(pseudo, E, pseudo.id);
      const best = E.bestLevel([E.full]);
      let expected;
      if (qn.adv) expected = ['3NF', 'BCNF', '4NF', '5NF'][qn.answer];
      else expected = [null, null, '2NF', '3NF'][qn.answer];
      const okAnswer = qn.adv ? best === expected : qn.answer === 3 ? levelIdx(best) >= 1 : best === expected;
      if (!okAnswer) console.warn(`[${pseudo.id}] the marked answer does not match the engine (engine: ${best})`);
    } catch (err) {
      console.warn(`[question ${qn.name}]`, err.message);
    }
  });
}

/* ==========================================================================
   2. "Normalize" mode
   ========================================================================== */

const view = $('#view');
const pane = () => $('#norm-pane') || view;   // renderExercise/renderQuiz redraw only this part
const work = {};                       // state of each exercise during the session
let route = { mode: 'normalize', ex: 0, adv: false };

const newTable = () => ({ name: '', cells: {} });      // cells: attribute -> 1 (included) | 2 (key)
const cloneTable = (t) => ({ name: t.name, cells: { ...t.cells } });
const tableLabel = (t, i) => t.name.trim() || `Table ${i + 1}`;
const isEmptyTable = (t) => !Object.keys(t.cells).length;

/* State of a step: the first starts empty; the following ones start from the previous step’s tables. */
function newStepState(w, k) {
  let tables;
  if (k === 0) tables = [newTable(), newTable()];
  else {
    tables = w.steps[k - 1].tables.filter((t) => !isEmptyTable(t)).map(cloneTable);
    if (tables.length < MAX_TABLES) tables.push(newTable());
  }
  return { tables, hints: 0, result: null, solution: false, done: false };
}

/* Rebuilds an exercise’s saved state, or returns null if it is not valid. */
function restoreWork(ex, w, saved) {
  if (!saved || saved.sig !== exSignature(ex) || !Array.isArray(saved.steps) || saved.steps.length !== ex.steps.length) return null;
  const cleanTable = (t) => {
    if (!t || typeof t.name !== 'string' || !t.cells || typeof t.cells !== 'object') return null;
    const cells = {};
    for (const [k, v] of Object.entries(t.cells)) {
      if (!ex.attrs.includes(k) || (v !== 1 && v !== 2)) return null;
      cells[k] = v;
    }
    return { name: t.name.slice(0, 24), cells };
  };
  const steps = saved.steps.map((s, k) => {
    if (!s || !Array.isArray(s.tables) || s.tables.length < 1 || s.tables.length > MAX_TABLES) return null;
    if (k > 0 && !(saved.steps[k - 1] && saved.steps[k - 1].done)) return null;
    const tables = s.tables.map(cleanTable);
    if (tables.some((t) => !t)) return null;
    return { tables, hints: Math.min(Math.max(+s.hints || 0, 0), ex.steps[k].hints.length), result: null, solution: !!s.solution, done: !!s.done };
  });
  if (!steps[0]) return null;
  w.steps = steps;
  w.fds = saved.fds !== false;
  w.step = Number.isInteger(saved.step) && saved.step >= 0 && saved.step < steps.length && steps[saved.step] ? saved.step : 0;
  // Steps marked as done are checked again: saved data is not trusted.
  for (let k = 0; k < steps.length; k++) {
    const s = steps[k];
    if (!s || !s.done) continue;
    w.step = k;
    const tables = collectTables(ex, w);
    const res = tables.length ? evaluate(ex, ex.steps[k], w.engine, tables) : null;
    if (!res || !res.ok) {
      s.done = false;
      for (let j = k + 1; j < steps.length; j++) steps[j] = null;
      break;
    }
    if (k === saved.step) s.result = res;
  }
  w.step = Number.isInteger(saved.step) && saved.step >= 0 && saved.step < steps.length && steps[saved.step] ? saved.step : 0;
  return w;
}

function getWork(i) {
  const ex = EXERCISES[i];
  if (!work[ex.id]) {
    const fresh = { step: 0, steps: ex.steps.map(() => null), fds: true, engine: buildEngine(ex) };
    fresh.steps[0] = newStepState(fresh, 0);
    let w = fresh;
    try {
      const probe = { ...fresh, steps: fresh.steps.slice() };
      w = restoreWork(ex, probe, savedWork[ex.id]) || fresh;
    } catch (err) { w = fresh; }
    work[ex.id] = w;
  }
  return work[ex.id];
}

/* Saves the open exercise’s state. */
function persist() {
  const ex = EXERCISES[route.ex];
  const w = work[ex.id];
  if (!w) return;
  savedWork[ex.id] = {
    sig: exSignature(ex),
    step: w.step,
    fds: w.fds,
    steps: w.steps.map((s) => s && { tables: s.tables, hints: s.hints, solution: s.solution, done: s.done }),
  };
  workStore.save(savedWork);
}

const cur = (w) => w.steps[w.step];

/* Changing the tables invalidates the result of this step and the following ones. */
function touch(w) {
  const s = cur(w);
  s.result = null;
  s.done = false;
  for (let j = w.step + 1; j < w.steps.length; j++) w.steps[j] = null;
}

function announce(text) {
  const el = $('#sr-status');
  if (el) el.textContent = text;
}

function doneCount(ex) {
  const w = work[ex.id];
  if (w) return w.steps.filter((s) => s && s.done).length;
  const saved = savedWork[ex.id];
  return saved && saved.sig === exSignature(ex) && Array.isArray(saved.steps) ? saved.steps.filter((s) => s && s.done).length : 0;
}

function exerciseNav() {
  const done = EXERCISES.filter((e) => progress.solved[e.id]).length;
  const items = EXERCISES.map((e, i) => {
    const frac = e.steps.length > 1 && !progress.solved[e.id] && doneCount(e) > 0 ? `<span class="frac">${doneCount(e)}/${e.steps.length}</span>` : '';
    return `
      <li><a href="${BASE}/${i + 1}"${i === route.ex ? ' aria-current="page"' : ''}>
        <span class="n">${i + 1}</span><span>${esc(e.short)}</span>${frac}${progress.solved[e.id] ? `<span class="done" title="Solved">${ICON.ok}<span class="sr-only"> (solved)</span></span>` : ''}
      </a></li>`;
  }).join('');
  return `<nav class="ex-nav" aria-label="Exercises"><ol>${items}</ol><p class="count">${done} of ${EXERCISES.length} solved · <button type="button" class="link" data-action="clear-all" data-fid="clear-all">Clear my progress</button></p></nav>`;
}

const cellHtml = (v, num) =>
  v === null || v === '' ? '<td class="nul">—</td>' : `<td${num ? ' class="num"' : ''}>${esc(v)}</td>`;

/* A column is numeric if all its values are: it is right-aligned, header included. */
const numericCols = (rows, n) => Array.from({ length: n }, (_, k) => rows.length > 0 && rows.every((r) => typeof r[k] === 'number'));
const rowHtml = (r, num, cls = '') => `<tr${cls}>${r.map((v, k) => cellHtml(v, num[k])).join('')}</tr>`;
const thClass = (pk, num) => { const c = [pk && 'pk', num && 'num'].filter(Boolean).join(' '); return c ? ` class="${c}"` : ''; };

function sourceHtml(ex, w) {
  const owners = ex.attrs.map((a) => cur(w).tables.map((t, i) => (t.cells[a] ? i : -1)).filter((i) => i >= 0));
  const num = numericCols(ex.rows, ex.attrs.length);
  const head = ex.attrs.map((a, j) => {
    const dots = owners[j].length ? owners[j].map((i) => `<i class="dot c${i + 1}"></i>`).join('') : '<i class="dot none"></i>';
    return `<th scope="col"${thClass(ex.pk.includes(a), num[j])}><span class="id">${esc(a)}</span><span class="dots" aria-hidden="true">${dots}</span></th>`;
  }).join('');
  const body = ex.rows.map((r) => rowHtml(r, num)).join('');
  return `<table class="src"><caption class="sr-only">Original table</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/* Dependencies: functional ones always; multivalued from 4NF and join ones at 5NF. */
function depsHtml(ex, w) {
  const E = w.engine;
  const k = levelIdx(ex.steps[w.step].nf);
  const list = (items) => `<ul>${items.map((t) => `<li><code>${esc(t)}</code></li>`).join('')}</ul>`;
  let body = '<p class="muted">Work out the dependencies from the table’s data.</p>';
  if (w.fds) {
    const mvds = E.jds.filter((j) => j.kind === 'mvd');
    const jds = E.jds.filter((j) => j.kind === 'jd');
    body = `<p class="fds-title">Functional</p>${ex.fds.length ? list(ex.fds.map(fdText)) : '<p class="muted">There are no functional dependencies.</p>'}`;
    if (k >= 3 && mvds.length) {
      body += `<p class="fds-title">Multivalued</p>${list(mvds.map((j) => j.show))}
        <p class="muted small">X ↠ Y | Z reads: for each X, the values of Y and Z are independent and all their combinations occur.</p>`;
    }
    if (k >= 4 && jds.length) {
      body += `<p class="fds-title">Join</p>${list(jds.map((j) => j.show))}
        <p class="muted small">⋈ is the join: the table is obtained by joining those parts.</p>`;
    }
  }
  return `<div class="fds">
      <button type="button" class="link" data-action="toggle-fds" data-fid="fds" aria-expanded="${w.fds}">${w.fds ? 'Hide' : 'Show'} dependencies</button>
      ${body}
    </div>`;
}

const CELL_STATE = ['not included. Press to include it', 'included. Press to mark it as primary key', 'primary key. Press to remove it'];

function matrixHtml(ex, w) {
  const T = cur(w).tables;
  const head = T.map((t, i) => `
      <th scope="col" class="tcol c${i + 1}">
        <div class="thi">
          <span class="badge" aria-hidden="true">${i + 1}</span>
          <input type="text" data-name="${i}" value="${esc(t.name)}" placeholder="Table ${i + 1}" aria-label="Name of table ${i + 1}" maxlength="24" autocomplete="off" spellcheck="false">
          ${T.length > 1 ? `<button type="button" class="rm" data-action="remove-table" data-t="${i}" data-fid="rm-${i}" aria-label="Remove table ${i + 1}">×</button>` : ''}
        </div>
      </th>`).join('');
  const rows = ex.attrs.map((a, r) => `
      <tr>
        <th scope="row" class="attr${ex.pk.includes(a) ? ' pk' : ''}"><span class="id">${esc(a)}</span></th>
        ${T.map((t, i) => {
          const s = t.cells[a] || 0;
          return `<td class="c${i + 1} s${s}"><button type="button" class="cell s${s}" data-action="cycle" data-a="${r}" data-t="${i}" data-fid="c-${r}-${i}" aria-label="${esc(`${a} in ${tableLabel(t, i)}: ${CELL_STATE[s]}`)}"><span class="mark">${s === 2 ? ICON.key : ''}</span></button></td>`;
        }).join('')}
      </tr>`).join('');
  return `<table class="matrix"><caption class="sr-only">Assignment of attributes to the new tables</caption><thead><tr><th scope="col" class="corner">Attribute</th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

/* Table with the projected data (no repeated rows). cols: [{ a, key }] */
function previewHtml(ex, title, ci, cols) {
  const ordered = [...cols.filter((c) => c.key), ...cols.filter((c) => !c.key)];
  const rows = projectRows(ex, ordered.map((c) => c.a));
  const keyPos = ordered.map((c, k) => (c.key ? k : -1)).filter((k) => k >= 0);
  const keyOf = (r) => keyPos.map((p) => r[p]).join('\u0000');
  const count = new Map();
  if (keyPos.length) rows.forEach((r) => count.set(keyOf(r), (count.get(keyOf(r)) || 0) + 1));
  const isDup = (r) => keyPos.length > 0 && count.get(keyOf(r)) > 1;
  const anyDup = rows.some(isDup);

  const num = numericCols(rows, ordered.length);
  const head = ordered.map((c, k) => `<th scope="col"${thClass(c.key, num[k])}><span class="id">${esc(c.a)}</span></th>`).join('');
  const body = rows.map((r) => rowHtml(r, num, isDup(r) ? ' class="dup"' : '')).join('');
  const total = ex.rows.length;
  const foot = `${rows.length} ${rows.length === 1 ? 'row' : 'rows'}${rows.length < total ? ` (the original has ${total})` : ''}`;
  return `<figure class="pv c${ci + 1}">
      <figcaption><span class="badge" aria-hidden="true">${ci + 1}</span><span class="pv-name">${esc(title)}</span></figcaption>
      <div class="scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      <div class="foot"><span>${foot}</span>${anyDup ? `<span class="warn">${ICON.bad}The key repeats with different data: that key does not identify each row.</span>` : ''}</div>
    </figure>`;
}

function previewsHtml(ex, w) {
  const items = cur(w).tables
    .map((t, i) => ({ t, i, attrs: ex.attrs.filter((a) => t.cells[a]) }))
    .filter((x) => x.attrs.length);
  if (!items.length) return '<p class="empty">Include attributes in a table and you will see here how its data looks.</p>';
  return items.map(({ t, i, attrs }) => previewHtml(ex, tableLabel(t, i), i, attrs.map((a) => ({ a, key: t.cells[a] === 2 })))).join('');
}

/* Live check: does joining the student’s tables give back the original rows? */
function joinHtml(ex, w) {
  const tables = collectTables(ex, w);
  const covered = tables.reduce((a, t) => a | t.attrs, 0);
  if (covered !== w.engine.full) {
    return '<p class="muted small">Once you include all the attributes you will see here whether joining your tables recovers the original’s rows.</p>';
  }
  const j = dataJoin(ex, w.engine, tables);
  if (!j) return '';
  if (!j.spurious.length) return `<p class="joincheck ok">${ICON.ok}<span>Joining your tables recovers exactly the ${ex.rows.length} rows of the original.</span></p>`;
  const one = j.spurious.length === 1 ? 'was not' : 'were not';
  return `<p class="joincheck bad">${ICON.bad}<span>Joining your tables gives ${j.total} rows, and ${j.spurious.length} ${one} in the original. For example: (${esc(j.spurious[0].join(', '))}).</span></p>`;
}

function stepperHtml(ex, w) {
  if (ex.steps.length < 2) return '';
  const items = ex.steps.map((st, k) => {
    const reachable = k === 0 || (w.steps[k - 1] && w.steps[k - 1].done);
    const done = w.steps[k] && w.steps[k].done;
    const current = k === w.step;
    return `<li class="${done ? 'is-done' : ''}${current ? ' is-current' : ''}">
        <button type="button" data-action="goto-step" data-s="${k}" data-fid="step-${k}"${reachable ? '' : ' disabled'}${current ? ' aria-current="step"' : ''}>
          <span class="sn">${done ? ICON.ok : k + 1}</span><span class="sl">${st.nf}</span><span class="sr-only">${done ? ' (done)' : current ? ' (current step)' : reachable ? '' : ' (locked)'}</span>
        </button>
      </li>`;
  }).join('');
  return `<nav class="stepper" aria-label="Exercise steps"><ol>${items}</ol></nav>`;
}

function stepCardHtml(ex, w) {
  const st = ex.steps[w.step];
  const info = NF_INFO[st.nf];
  const multi = ex.steps.length > 1;
  const from = w.step === 0 ? null : ex.steps[w.step - 1].nf;
  const title = multi ? `Step ${w.step + 1} of ${ex.steps.length}: reach ${st.nf}` : `What ${st.nf} asks for`;
  return `<section class="block step-card" aria-labelledby="step-h">
      <h3 id="step-h" tabindex="-1">${title}</h3>
      <p class="rule"><strong>${esc(info.name)}.</strong> ${esc(info.rule)}</p>
      ${from ? `<p class="from">You start from the tables you left in ${from}. Modify them: remove attributes from one table and put them in a new one.</p>` : ''}
      <details class="how-step">
        <summary>How to take this step</summary>
        <ol>${info.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
      </details>
    </section>`;
}


/* ---- SQL for the student’s design ------------------------------------------ */

const noAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function sqlName(label, i, used) {
  let n = noAccents(label).replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (!n || /^\d/.test(n)) n = `table_${i + 1}`;
  let u = n;
  let k = 2;
  while (used.has(u.toLowerCase())) u = `${n}_${k++}`;
  used.add(u.toLowerCase());
  return u;
}

/* Type inferred from the sample data. */
function sqlType(ex, a) {
  const k = ex.attrs.indexOf(a);
  const vals = ex.rows.map((r) => r[k]).filter((v) => v !== null && v !== '');
  if (vals.length && vals.every((v) => Number.isInteger(v))) return 'INTEGER';
  if (vals.length && vals.every((v) => typeof v === 'number')) return 'DECIMAL(10, 2)';
  if (vals.length && vals.every((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))) return 'DATE';
  const len = Math.max(1, ...vals.map((v) => String(v).length));
  return `VARCHAR(${[20, 50, 100, 255].find((s) => len <= s) || 255})`;
}

function sqlFor(ex, w) {
  const E = w.engine;
  const used = new Set();
  const items = collectTables(ex, w).map((t, i) => ({ t, name: sqlName(t.label, i, used), refs: [] }));
  items.forEach((a) => items.forEach((b) => {
    if (a !== b && a.t.pk && b.t.pk && a.t.pk !== b.t.pk && (a.t.attrs & b.t.pk) === b.t.pk) a.refs.push(b);
  }));
  // Referenced tables go first (if there is a cycle, the rest follows in its order)
  const ordered = [];
  const rest = items.slice();
  while (rest.length) {
    const i = rest.findIndex((x) => x.refs.every((r) => ordered.includes(r)));
    ordered.push(...rest.splice(i < 0 ? 0 : i, 1));
  }
  const body = ordered.map(({ t, name, refs }) => {
    const cols = [...E.namesOf(t.pk), ...E.namesOf(t.attrs & ~t.pk)];
    const lines = cols.map((c) => `  ${c} ${sqlType(ex, c)} NOT NULL`);
    lines.push(`  PRIMARY KEY (${E.namesOf(t.pk).join(', ')})`);
    refs.forEach((r) => lines.push(`  FOREIGN KEY (${E.namesOf(r.t.pk).join(', ')}) REFERENCES ${r.name} (${E.namesOf(r.t.pk).join(', ')})`));
    return `CREATE TABLE ${name} (\n${lines.join(',\n')}\n);`;
  });
  return `-- Standard SQL (works on PostgreSQL, MySQL and SQLite with few changes).\n-- Types were inferred from the sample rows: review them.\n\n${body.join('\n\n')}\n`;
}

function sqlHtml(ex, w) {
  return `<details class="sql">
      <summary>SQL for this design</summary>
      <pre tabindex="0"><code>${esc(sqlFor(ex, w))}</code></pre>
      <p class="actions"><button type="button" class="btn ghost" data-action="copy-sql" data-fid="copy-sql">Copy SQL</button></p>
    </details>`;
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true, () => false);
  }
  return Promise.resolve(false);
}

function feedbackHtml(ex, w) {
  const r = cur(w).result;
  if (!r) return '';
  const last = w.step === ex.steps.length - 1;
  const st = ex.steps[w.step];
  const tone = r.ok ? (r.notes.length ? 'mixed' : 'ok') : 'bad';
  const title = r.ok ? (r.notes.length ? 'Correct, though it could be better' : 'Correct') : 'Not yet';
  let lead = 'Review these points and check again.';
  if (r.ok) {
    lead = `The decomposition meets ${r.nf}, ${r.lostAllowed ? 'loses no information' : 'loses no information and preserves the dependencies'}.`;
    if (!last && r.reached && levelIdx(r.reached) >= levelIdx(ex.steps[w.step + 1].nf)) {
      lead += ` It also already meets ${ex.steps[w.step + 1].nf}: the next step will only ask you to check it.`;
    }
  }
  const checks = r.checks.map((c) => `<li>${ICON[c.status]}<span>${esc(c.text)}</span></li>`).join('');
  const notes = r.notes.map((t) => `<li>${ICON.note}<span>${esc(t)}</span></li>`).join('');
  const fks = r.fks.length
    ? `<h4>Relationships between tables</h4><ul class="plain">${r.fks.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
    : '';
  let after = '';
  if (r.ok && !last) {
    after = `<p class="actions"><button type="button" class="btn" data-action="next-step" data-fid="next-step">Next step: reach ${ex.steps[w.step + 1].nf}</button></p>`;
  } else if (r.ok && last) {
    const idx = route.ex;
    after = `${ex.steps.length > 1 ? `<p class="done-msg">You have completed the exercise: from 1NF to ${st.nf}.</p>` : ''}
      ${idx < EXERCISES.length - 1 ? `<p class="actions"><a class="btn" href="${BASE}/${idx + 2}">Next exercise</a></p>` : ''}`;
  }
  return `<section class="feedback ${tone}" aria-labelledby="fb-title">
      <h3 id="fb-title" tabindex="-1">${title}</h3>
      <p>${esc(lead)}</p>
      <ul class="checks">${checks}${notes}</ul>
      ${r.ok ? `<p class="insight">${esc(st.insight)}</p>${fks}${sqlHtml(ex, w)}` : ''}
      ${after}
    </section>`;
}

function solutionHtml(ex, w) {
  const st = ex.steps[w.step];
  const tables = st.solution.map((t, i) => previewHtml(ex, t.name, i, t.attrs.map((a) => ({ a, key: t.pk.includes(a) }))));
  return `<section class="block solution" aria-labelledby="sol-h">
      <h3 id="sol-h">Reference solution${ex.steps.length > 1 ? ` (${st.nf})` : ''}</h3>
      <div class="previews">${tables.join('')}</div>
      <p class="insight">${esc(st.insight)}</p>
      <p class="muted">There may be other valid solutions. What matters is that it passes the check.</p>
      <p class="actions"><button type="button" class="btn ghost" data-action="use-solution" data-fid="use-solution">Load into my design</button></p>
    </section>`;
}

function hintsHtml(ex, w) {
  const s = cur(w);
  if (!s.hints) return '';
  return `<div class="hints">${ex.steps[w.step].hints.slice(0, s.hints).map((h, i) => `<p><strong>Hint ${i + 1}.</strong> ${esc(h)}</p>`).join('')}</div>`;
}

function renderExercise() {
  const ex = EXERCISES[route.ex];
  const w = getWork(route.ex);
  const s = cur(w);
  const st = ex.steps[w.step];
  const noMoreHints = s.hints >= st.hints.length;
  const finalNf = ex.steps[ex.steps.length - 1].nf;
  const goal = ex.steps.length > 1
    ? `Goal: reach <strong>${finalNf}</strong> in ${ex.steps.length} steps`
    : `Goal: reach <strong>${finalNf}</strong>`;
  pane().innerHTML = `
    ${exerciseNav()}
    <article class="exercise" aria-labelledby="ex-title">
      <header class="ex-head">
        <h2 id="ex-title">${esc(ex.title)}</h2>
        <p class="goal">${goal}</p>
        <p class="story">${esc(ex.story)}</p>
      </header>

      ${stepperHtml(ex, w)}

      <section class="block" aria-labelledby="src-h">
        <h3 id="src-h">Original table</h3>
        <div class="scroll" id="source">${sourceHtml(ex, w)}</div>
        <p class="meta">${ex.rows.length} rows. Primary key: <code>${esc(ex.pk.join(', '))}</code>. The colored dots under each column show which new tables contain that attribute.</p>
        ${depsHtml(ex, w)}
      </section>

      ${stepCardHtml(ex, w)}

      <section class="block" aria-labelledby="mine-h">
        <h3 id="mine-h">Your decomposition</h3>
        <p class="how">Each column is a table. Press a cell to include the attribute, press again to mark it as primary key (<span class="keyhint">${ICON.key}</span>) and a third time to remove it.</p>
        <div class="scroll">${matrixHtml(ex, w)}</div>
        <p class="add-row"><button type="button" class="btn ghost" data-action="add-table" data-fid="add"${s.tables.length >= MAX_TABLES ? ' disabled' : ''}>Add table</button></p>
        <h4>How your tables look</h4>
        <div class="previews" id="previews">${previewsHtml(ex, w)}</div>
        <div id="joincheck">${joinHtml(ex, w)}</div>
      </section>

      <div class="actions">
        <button type="button" class="btn" data-action="check" data-fid="check">Check</button>
        <button type="button" class="btn ghost" data-action="hint" data-fid="hint"${noMoreHints ? ' disabled' : ''}>${s.hints ? (noMoreHints ? 'No more hints' : 'Another hint') : 'Show hint'}</button>
        <button type="button" class="btn ghost" data-action="solution" data-fid="solution" aria-expanded="${s.solution}">${s.solution ? 'Hide solution' : 'Show solution'}</button>
        <button type="button" class="btn ghost" data-action="reset" data-fid="reset">${ex.steps.length > 1 ? 'Redo this step' : 'Start over'}</button>
      </div>
      ${hintsHtml(ex, w)}
      <div id="feedback">${feedbackHtml(ex, w)}</div>
      ${s.solution ? solutionHtml(ex, w) : ''}
    </article>`;
}

function collectTables(ex, w) {
  const E = w.engine;
  const tables = [];
  cur(w).tables.forEach((t, i) => {
    const names = ex.attrs.filter((a) => t.cells[a]);
    if (!names.length) return;
    tables.push({
      label: tableLabel(t, i),
      attrs: E.maskOf(names),
      pk: E.maskOf(names.filter((a) => t.cells[a] === 2)),
    });
  });
  return tables;
}

/* Moves focus to the message and scrolls it into view if needed. */
function reveal(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
  if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}

function withFocus(fn) {
  const active = document.activeElement;
  const id = active && active.dataset ? active.dataset.fid : null;
  fn();
  if (id) {
    const el = view.querySelector(`[data-fid="${id}"]`);
    if (el && !el.disabled) el.focus({ preventScroll: true });
  }
}

const sameTables = (a, b) => JSON.stringify(a.map((t) => [t.name, t.cells])) === JSON.stringify(b.map((t) => [t.name, t.cells]));

function handleExerciseAction(el) {
  const ex = EXERCISES[route.ex];
  const w = getWork(route.ex);
  const s = cur(w);
  const st = ex.steps[w.step];
  switch (el.dataset.action) {
    case 'cycle': {
      const a = ex.attrs[+el.dataset.a];
      const ti = +el.dataset.t;
      const t = s.tables[ti];
      const v = ((t.cells[a] || 0) + 1) % 3;
      if (v === 0) delete t.cells[a]; else t.cells[a] = v;
      touch(w);
      announce(`${a} in ${tableLabel(t, ti)}: ${['removed', 'included', 'primary key'][v]}`);
      withFocus(renderExercise);
      break;
    }
    case 'add-table':
      if (s.tables.length < MAX_TABLES) {
        s.tables.push(newTable());
        touch(w);
        announce(`Table ${s.tables.length} added`);
        withFocus(renderExercise);
      }
      break;
    case 'remove-table':
      if (s.tables.length > 1) {
        s.tables.splice(+el.dataset.t, 1);
        touch(w);
        announce('Table removed');
        renderExercise();
        $('[data-action="add-table"]', view)?.focus({ preventScroll: true });
      }
      break;
    case 'clear-all':
      if (typeof window.confirm === 'function' && !window.confirm('Clear all your progress saved in this browser (exercises, steps and quiz results)?')) return;
      workStore.clear();
      store.save({ solved: {}, quizBest: 0, quizBestAdv: 0 });
      Object.keys(savedWork).forEach((k) => delete savedWork[k]);
      Object.keys(work).forEach((k) => delete work[k]);
      progress.solved = {};
      progress.quizBest = 0;
      progress.quizBestAdv = 0;
      announce('Progress cleared');
      renderExercise();
      return;
    case 'copy-sql': {
      const code = $('.sql code', view);
      if (!code) return;
      const finish = (okCopy) => {
        el.textContent = okCopy ? 'Copied' : 'Select the text and copy';
        announce(okCopy ? 'SQL copied to the clipboard' : 'Could not copy automatically. The text is selected: copy it with the keyboard.');
      };
      copyText(code.textContent).then((okCopy) => {
        if (okCopy) { finish(true); return; }
        // Fallback: select the text and use the browser’s classic copy
        let copied = false;
        try {
          const range = document.createRange();
          range.selectNodeContents(code);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          copied = typeof document.execCommand === 'function' && document.execCommand('copy');
        } catch (err) { copied = false; }
        finish(copied);
      });
      return;
    }
    case 'toggle-fds':
      w.fds = !w.fds;
      withFocus(renderExercise);
      break;
    case 'hint':
      if (s.hints < st.hints.length) s.hints++;
      withFocus(renderExercise);
      break;
    case 'solution':
      s.solution = !s.solution;
      withFocus(renderExercise);
      break;
    case 'use-solution': {
      s.tables = st.solution.map((t) => ({
        name: t.name,
        cells: Object.fromEntries(t.attrs.map((a) => [a, t.pk.includes(a) ? 2 : 1])),
      }));
      if (s.tables.length < MAX_TABLES) s.tables.push(newTable());
      touch(w);
      announce('Solution loaded into your design. Press Check to continue.');
      renderExercise();
      $('[data-action="check"]', view)?.focus({ preventScroll: true });
      break;
    }
    case 'reset': {
      const fresh = newStepState(w, w.step);
      if (!sameTables(s.tables, fresh.tables) && typeof window.confirm === 'function' && !window.confirm(ex.steps.length > 1 ? 'Discard your attempt at this step and redo it?' : 'Discard your attempt and start over?')) return;
      w.steps[w.step] = fresh;
      for (let j = w.step + 1; j < w.steps.length; j++) w.steps[j] = null;
      renderExercise();
      break;
    }
    case 'check': {
      const tables = collectTables(ex, w);
      s.result = tables.length
        ? evaluate(ex, st, w.engine, tables)
        : { ok: false, nf: st.nf, notes: [], fks: [], checks: [{ status: 'bad', text: 'There is no table with attributes yet. Press the cells of the matrix to include them.' }] };
      s.done = s.result.ok;
      if (s.done && w.step === ex.steps.length - 1 && !progress.solved[ex.id]) {
        progress.solved[ex.id] = true;
        store.save(progress);
      }
      renderExercise();
      reveal($('#fb-title'));
      break;
    }
    case 'next-step':
      if (s.done && w.step < ex.steps.length - 1) {
        w.step++;
        if (!w.steps[w.step]) w.steps[w.step] = newStepState(w, w.step);
        announce(`Step ${w.step + 1} of ${ex.steps.length}: reach ${ex.steps[w.step].nf}`);
        renderExercise();
        reveal($('#step-h'));
      }
      break;
    case 'goto-step': {
      const k = +el.dataset.s;
      const reachable = k === 0 || (w.steps[k - 1] && w.steps[k - 1].done);
      if (reachable && k !== w.step) {
        w.step = k;
        if (!w.steps[k]) w.steps[k] = newStepState(w, k);
        if (w.steps[k].done && !w.steps[k].result) {
          const tables = collectTables(ex, w);
          if (tables.length) w.steps[k].result = evaluate(ex, ex.steps[k], w.engine, tables);
        }
        announce(`Step ${k + 1} of ${ex.steps.length}: reach ${ex.steps[k].nf}`);
        renderExercise();
        reveal($('#step-h'));
      }
      break;
    }
    default:
  }
  persist();
}

/* ==========================================================================
   3. "Diagnose" mode
   ========================================================================== */

const quiz = { adv: false, order: [], i: 0, score: 0, picked: null, missed: [], done: false };

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const quizPool = () => QUESTIONS.map((qn, k) => k).filter((k) => !!QUESTIONS[k].adv === quiz.adv);
const optionsOf = (qn) => (qn.adv ? ADV_OPTIONS : OPTIONS);

function startQuiz() {
  Object.assign(quiz, { order: shuffle(quizPool()), i: 0, score: 0, picked: null, missed: [], done: false });
}

function quizTableHtml(qn) {
  const num = numericCols(qn.rows, qn.cols.length);
  const head = qn.cols.map((c, k) => `<th scope="col"${thClass(qn.pk.includes(c), num[k])}><span class="id">${esc(c)}</span></th>`).join('');
  const body = qn.rows.map((r) => rowHtml(r, num)).join('');
  return `<table class="src"><caption class="sr-only">Table ${esc(qn.name)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function quizLevelsHtml() {
  return `<nav class="levels" aria-label="Quiz level">
      <a href="${BASE}/diagnose"${!quiz.adv ? ' aria-current="page"' : ''}>Basic <span>1NF to 3NF</span></a>
      <a href="${BASE}/diagnose/advanced"${quiz.adv ? ' aria-current="page"' : ''}>Advanced <span>BCNF to 5NF</span></a>
    </nav>`;
}

function renderQuiz() {
  if (quiz.adv !== route.adv || !quiz.order.length) { quiz.adv = route.adv; startQuiz(); }
  if (quiz.done) { renderQuizEnd(); return; }
  const qn = QUESTIONS[quiz.order[quiz.i]];
  const opts = optionsOf(qn);
  const answered = quiz.picked !== null;
  const last = quiz.i === quiz.order.length - 1;

  const options = opts.map((label, k) => {
    let cls = 'opt';
    let tag = '';
    if (answered) {
      if (k === qn.answer) { cls += ' correct'; tag = '<span class="tag">Correct</span>'; }
      else if (k === quiz.picked) { cls += ' wrong'; tag = '<span class="tag">Your answer</span>'; }
    }
    return `<button type="button" class="${cls}" data-action="answer" data-i="${k}"${answered ? ' disabled' : ''}><span>${label}</span>${tag}</button>`;
  }).join('');

  const verdict = answered
    ? `<section class="feedback ${quiz.picked === qn.answer ? 'ok' : 'bad'}" aria-labelledby="qf-title">
         <h3 id="qf-title" tabindex="-1">${quiz.picked === qn.answer ? 'Correct' : 'Not that one'}</h3>
         <p>${quiz.picked === qn.answer ? '' : `The answer is “${opts[qn.answer]}”. `}${esc(qn.why)}</p>
       </section>
       <p class="actions"><button type="button" class="btn" data-action="next" data-fid="next">${last ? 'See result' : 'Next table'}</button></p>`
    : '';

  pane().innerHTML = `
    ${quizLevelsHtml()}
    <article class="quiz" aria-labelledby="q-title">
      <p class="q-progress">Table ${quiz.i + 1} of ${quiz.order.length}. Correct: ${quiz.score}.</p>
      <h2 id="q-title">Which normal form does <span class="tname">${esc(qn.name)}</span> reach?</h2>
      <div class="scroll">${quizTableHtml(qn)}</div>
      <p class="meta">Primary key: <code>${esc(qn.pk.join(', '))}</code></p>
      ${qn.fds && qn.fds.length ? `<div class="fds"><p class="fds-title">Functional dependencies</p><ul>${qn.fds.map((f) => `<li><code>${esc(fdText(f))}</code></li>`).join('')}</ul></div>` : ''}
      ${qn.adv && (!qn.fds || !qn.fds.length) ? '<p class="meta">This table has no functional dependencies between its attributes.</p>' : ''}
      ${qn.note ? `<p class="meta">${esc(qn.note)}</p>` : ''}
      <div class="options" role="group" aria-label="Choose an answer">${options}</div>
      <div id="q-fb">${verdict}</div>
    </article>`;
}

function renderQuizEnd() {
  const total = quiz.order.length;
  const missed = quiz.missed.map((k) => QUESTIONS[k]);
  const best = quiz.adv ? progress.quizBestAdv : progress.quizBest;
  pane().innerHTML = `
    ${quizLevelsHtml()}
    <article class="quiz" aria-labelledby="q-title">
      <h2 id="q-title" tabindex="-1">You got ${quiz.score} of ${total} right</h2>
      <p class="meta">Best result on this device: ${best} of ${total}.</p>
      ${missed.length
        ? `<h3>To review</h3><ul class="plain review">${missed.map((qn) => `<li><strong>${esc(qn.name)}</strong> (${optionsOf(qn)[qn.answer]}). ${esc(qn.why)}</li>`).join('')}</ul>`
        : '<p class="story">You did not miss any. Move on to normalizing tables.</p>'}
      <p class="actions">
        <button type="button" class="btn" data-action="restart" data-fid="restart">Repeat in a different order</button>
        <a class="btn ghost" href="${BASE}">Go to Normalize</a>
      </p>
    </article>`;
  $('#q-title')?.focus({ preventScroll: true });
}

function handleQuizAction(el) {
  switch (el.dataset.action) {
    case 'answer': {
      if (quiz.picked !== null) return;
      const k = +el.dataset.i;
      const qi = quiz.order[quiz.i];
      quiz.picked = k;
      if (k === QUESTIONS[qi].answer) quiz.score++; else quiz.missed.push(qi);
      renderQuiz();
      reveal($('#qf-title'));
      break;
    }
    case 'next':
      if (quiz.i < quiz.order.length - 1) {
        quiz.i++;
        quiz.picked = null;
      } else {
        quiz.done = true;
        const key = quiz.adv ? 'quizBestAdv' : 'quizBest';
        if (quiz.score > progress[key]) { progress[key] = quiz.score; store.save(progress); }
      }
      renderQuiz();
      break;
    case 'restart':
      startQuiz();
      renderQuiz();
      $('#q-title')?.focus({ preventScroll: true });
      break;
    default:
  }
}

/* ==========================================================================
   Section shell: the rules, the Normalize/Diagnose switch and the hooks for js/main.js
   ========================================================================== */

const RULES_HTML = `
    <details class="rules">
      <summary>The rules in one sentence</summary>
      <dl>
        <div><dt>1NF</dt><dd><strong>One cell, one value.</strong> No lists or repeating groups in a cell or a row.</dd></div>
        <div><dt>2NF</dt><dd><strong>The whole key.</strong> Every attribute depends on the entire key, not on part of it. It only matters with composite keys.</dd></div>
        <div><dt>3NF</dt><dd><strong>Nothing but the key.</strong> No attribute depends on another attribute that is not a key.</dd></div>
        <div><dt>BCNF</dt><dd><strong>Every determinant is a key.</strong> If something determines other attributes, it must identify each row.</dd></div>
        <div><dt>4NF</dt><dd><strong>One fact per table.</strong> Two independent pieces of data about the same thing do not share a table.</dd></div>
        <div><dt>5NF</dt><dd><strong>Nothing that can be rebuilt from its parts.</strong> If a table comes from joining smaller ones, store it as those parts.</dd></div>
      </dl>
    </details>`;

function subNavHtml() {
  const on = (m) => (route.mode === m ? ' aria-current="page"' : '');
  return `<nav class="subnav" aria-label="Normalization mode">
      <a href="${BASE}"${on('normalize')}>Normalize</a>
      <a href="${BASE}/diagnose"${on('diagnose')}>Diagnose</a>
    </nav>`;
}

/* Route segments after #/relational/normalization: '', 'N', 'diagnose', 'diagnose/advanced'. */
function parseRoute(rest) {
  const m = rest.match(/^(?:(\d+)|diagnose(?:\/(advanced))?)?$/);
  if (m && rest.startsWith('diagnose')) return { mode: 'diagnose', ex: 0, adv: m[2] === 'advanced' };
  const n = m && m[1] ? parseInt(m[1], 10) : 1;
  return { mode: 'normalize', ex: Math.min(Math.max(n - 1, 0), EXERCISES.length - 1), adv: false };
}

function render(rest) {
  route = parseRoute(rest || '');
  view.innerHTML = `${subNavHtml()}${RULES_HTML}<div id="norm-pane"></div>`;
  if (route.mode === 'diagnose') renderQuiz(); else renderExercise();
  return route.mode === 'diagnose'
    ? `Diagnose${route.adv ? ' (advanced)' : ''} · Normalization`
    : `Exercise ${route.ex + 1}: ${EXERCISES[route.ex].title} · Normalization`;
}

function onClick(el) {
  if (route.mode === 'diagnose') handleQuizAction(el); else handleExerciseAction(el);
}

function onInput(e) {
  const input = e.target.closest('input[data-name]');
  if (!input || route.mode !== 'normalize') return;
  const w = getWork(route.ex);
  cur(w).tables[+input.dataset.name].name = input.value;
  $('#previews').innerHTML = previewsHtml(EXERCISES[route.ex], w);
  persist();
}

selfTest();

return { render, onClick, onInput };
})();
