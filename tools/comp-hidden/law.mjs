// The HIDDEN dataset of the law-firm database (data/game-comp-db-law.js), for tools/comp-hidden.mjs --db law
// (docs/game-quiz.md §15.5, §16). The server grades every answer on the public setup AND on this one, so an answer
// that hard-codes what the public data looks like (a list of ids, a typed rate or total, a fixed date) fails.
//
// What stays: the four tables and their constraints, every id, lawyer name, client name and case title, every key
// relationship (each case keeps its client and its lead lawyer, each time entry its lawyer and its case), which
// cases are still open (closed NULL), which entries are billable and their write-down, the NULL count of
// review_score, and the multisets of hours, fees and review scores (so a value a question cuts at still exists).
// What changes (seeded, reproducible):
//   lawyers       practice_area and role deranged among the lawyers with time entries (the idle ones keep theirs);
//                 hourly_rate = a public rate of the lawyer's new role, moved ±5–15 (never the lawyer's public rate,
//                 all different); review_score deranged (NULLs included); hire_date regenerated, before the
//                 lawyer's first time entry
//   clients       sector, country and tier deranged; client_since regenerated, before the client's first case
//   cases         area deranged among the cases with time entries (case 30, never worked on, keeps its area); fee
//                 deranged; opened regenerated, before the case's first time entry; closed (when not NULL)
//                 regenerated, after its last entry and before 2026
//   time_entries  hours deranged; work_date deranged, then moved ±0–40 days (2024-01-10 … 2025-12-20, all
//                 different); amount = hours × the new hourly_rate × the public write-down (0 when not billable)
// Every column the public data keeps free of ties stays free of ties (the billed amounts, the amount billed per case
// and year and the average review_score per practice area too). Two more conditions, or
// the attempt is drawn again: the highest hourly_rate belongs to a lead lawyer (a question looks for the clients of
// that lawyer's cases), and the largest number of different case areas one lawyer worked on is not the public one
// (a question looks for those lawyers, and a typed threshold must not pass).
export function hiddenSetup(publicSetup, seedText, H) {
  const r = H.rngFrom(seedText);
  const { head, rows } = H.parseSetup(publicSetup);
  for (let attempt = 0; attempt < 500; attempt++) {
    const out = attemptOnce(r, rows, H);
    if (out) return H.writeSetup(head, out);
  }
  throw new Error('law: no valid hidden dataset after 500 attempts');
}

// A derangement of a list with repeated values: no position keeps a value equal to its own (H.derange gives up
// after 200 random tries, which happens with few distinct values). The positions, grouped by value in a random
// order, take the value found s places further on, with max multiplicity ≤ s ≤ n − max multiplicity.
function derangeAll(r, shuffle, xs) {
  const n = xs.length;
  const key = (v) => JSON.stringify(v);
  const rank = new Map(shuffle(r, [...new Set(xs.map(key))]).map((k, i) => [k, i]));
  const order = shuffle(r, xs.map((_, i) => i)).sort((a, b) => rank.get(key(xs[a])) - rank.get(key(xs[b])));
  const counts = {};
  xs.forEach((v) => { counts[key(v)] = (counts[key(v)] || 0) + 1; });
  const m = Math.max(...Object.values(counts));
  if (2 * m > n) throw new Error('derangeAll: one value fills more than half of the list');
  const s = m + Math.floor(r() * (n - 2 * m + 1));
  const out = new Array(n);
  order.forEach((pos, i) => { out[pos] = xs[order[(i + s) % n]]; });
  return out;
}

function attemptOnce(r, rows, H) {
  const { shuffle, round2, toDay, fromDay, DAY } = H;
  const derange = (rr, xs) => derangeAll(rr, shuffle, xs);
  const L = rows.lawyers.map((x) => [...x]);      // lawyer_id, name, practice_area, role, hire_date, hourly_rate, review_score
  const C = rows.clients.map((x) => [...x]);      // client_id, name, sector, country, client_since, tier
  const K = rows.cases.map((x) => [...x]);        // case_id, client_id, lead_lawyer_id, title, area, opened, closed, fee
  const T = rows.time_entries.map((x) => [...x]); // entry_id, lawyer_id, case_id, work_date, hours, billable, amount
  const pick = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

  // Lawyers: area, role, rate, score.
  const pubRate = new Map(L.map((l) => [l[0], l[5]]));
  const pubRole = new Map(L.map((l) => [l[0], l[3]]));
  // A lawyer without time entries keeps area and role, so every area and role can keep an idle lawyer.
  const busy = L.filter((l) => T.some((t) => t[1] === l[0]));
  const areas = derange(r, busy.map((l) => l[2]));
  const roles = derange(r, busy.map((l) => l[3]));
  busy.forEach((l, i) => { l[2] = areas[i]; l[3] = roles[i]; });
  const scores = derange(r, L.map((l) => l[6]));
  L.forEach((l, i) => { l[6] = scores[i]; });
  const pool = {};
  L.forEach((l) => { const pr = pubRole.get(l[0]); (pool[pr] = pool[pr] || []).push(pubRate.get(l[0])); });
  Object.keys(pool).forEach((k) => { pool[k] = shuffle(r, pool[k]); });
  const usedR = new Set();
  for (const l of L) {
    const base = pool[l[3]].pop();
    let p = null;
    for (let k = 0; k < 60; k++) {
      const c = base + pick(1, 3) * 5 * (r() < 0.5 ? -1 : 1);
      if (c >= 50 && c !== pubRate.get(l[0]) && !usedR.has(c)) { p = c; break; }
    }
    if (p === null) return null;
    usedR.add(p);
    l[5] = p;
  }
  const rate = new Map(L.map((l) => [l[0], l[5]]));
  const top = L.reduce((a, b) => (b[5] > a[5] ? b : a));
  if (!K.some((k) => k[2] === top[0])) return null;

  // Time entries: hours and dates moved, amounts recomputed with the public write-down.
  const pubAmt = T.map((t) => t[6]);
  const pubH = T.map((t) => t[4]);
  const pubRateOf = T.map((t) => pubRate.get(t[1]));
  const hours = derange(r, T.map((t) => t[4]));
  const discOf = (i) => { const x = pubAmt[i] / (pubH[i] * pubRateOf[i]); return Math.abs(x - 1) < 0.005 ? 1 : x; };
  const amountOf = (i) => (T[i][5] === 'Y' ? round2(hours[i] * rate.get(T[i][1]) * discOf(i)) : 0);
  // Two billable entries with the same amount (often the same lawyer and the same hours): swap the hours of one
  // of them with another entry's, as long as neither gets back its public hours.
  for (let pass = 0; pass < 400; pass++) {
    const seen = new Map();
    let clash = -1;
    T.forEach((t, i) => { const a = amountOf(i); if (a && clash < 0) { if (seen.has(a)) clash = i; else seen.set(a, i); } });
    if (clash < 0) break;
    const k = Math.floor(r() * T.length);
    if (k !== clash && hours[k] !== pubH[clash] && hours[clash] !== pubH[k]) [hours[k], hours[clash]] = [hours[clash], hours[k]];
  }
  const dates = derange(r, T.map((t) => t[3].date));
  const usedD = new Set();
  const lo = toDay('2024-01-10');
  const hi = toDay('2025-12-20');
  for (const [i, t] of T.entries()) {
    let d = null;
    for (let k = 0; k < 60; k++) {
      const c = Math.min(hi, Math.max(lo, toDay(dates[i]) + (Math.floor(r() * 81) - 40) * DAY));
      if (!usedD.has(c)) { d = c; break; }
    }
    if (d === null) return null;
    usedD.add(d);
    t[3] = { date: fromDay(d) };
    t[4] = hours[i];
    t[6] = amountOf(i);
  }

  // Cases: area and fee deranged; opened before the first entry, closed after the last one (when closed).
  // A case without time entries keeps its area (an area keeps a case nobody worked on).
  const worked = K.filter((k) => T.some((t) => t[2] === k[0]));
  const kAreas = derange(r, worked.map((k) => k[4]));
  worked.forEach((k, i) => { k[4] = kAreas[i]; });
  const fees = derange(r, K.map((k) => k[7]));
  const usedO = new Set();
  const usedC = new Set();
  const end = toDay('2025-12-31');
  for (const [i, k] of K.entries()) {
    k[7] = fees[i];
    const ds = T.filter((t) => t[2] === k[0]).map((t) => toDay(t[3].date));
    const first = ds.length ? Math.min(...ds) : null;
    const last = ds.length ? Math.max(...ds) : null;
    let o = null;
    for (let n = 0; n < 60; n++) {
      const c = first !== null ? Math.max(toDay('2024-01-02'), first - pick(3, 60) * DAY) : toDay('2024-01-02') + pick(0, 690) * DAY;
      if (!usedO.has(c) && (first === null || c <= first)) { o = c; break; }
    }
    if (o === null) return null;
    usedO.add(o);
    k[5] = { date: fromDay(o) };
    if (k[6] !== null) {
      let c = null;
      for (let n = 0; n < 60; n++) {
        const x = Math.min(end, (last !== null ? last : o) + pick(3, last !== null ? 90 : 300) * DAY);
        if (x > o && (last === null || x > last) && !usedC.has(x)) { c = x; break; }
      }
      if (c === null) return null;
      usedC.add(c);
      k[6] = { date: fromDay(c) };
    }
  }

  // Lawyers' hire dates: before their first entry (or any day of 2009–2025 without entries), all different.
  const usedH = new Set();
  for (const l of L) {
    const ds = T.filter((t) => t[1] === l[0]).map((t) => toDay(t[3].date));
    let h = null;
    for (let n = 0; n < 60; n++) {
      const c = ds.length ? Math.min(...ds) - pick(30, 4000) * DAY : toDay('2009-01-12') + pick(0, 6100) * DAY;
      if (!usedH.has(c)) { h = c; break; }
    }
    if (h === null) return null;
    usedH.add(h);
    l[4] = { date: fromDay(h) };
  }

  // Clients: sector, country and tier deranged; client_since before the first case (or 2012–2025 without one).
  const sectors = derange(r, C.map((c) => c[2]));
  const countries = derange(r, C.map((c) => c[3]));
  const tiers = derange(r, C.map((c) => c[5]));
  const usedS = new Set();
  for (const [i, c] of C.entries()) {
    c[2] = sectors[i];
    c[3] = countries[i];
    c[5] = tiers[i];
    const ds = K.filter((k) => k[1] === c[0]).map((k) => toDay(k[5].date));
    let s = null;
    for (let n = 0; n < 60; n++) {
      const x = ds.length ? Math.min(...ds) - pick(30, 3000) * DAY : toDay('2012-01-09') + pick(0, 5000) * DAY;
      if (!usedS.has(x)) { s = x; break; }
    }
    if (s === null) return null;
    usedS.add(s);
    c[4] = { date: fromDay(s) };
  }
  // Billed amounts stay free of ties, and the most case areas a lawyer worked on is not the public number.
  const billed = T.filter((t) => t[6] !== 0).map((t) => t[6]);
  if (new Set(billed).size !== billed.length) return null;
  if (maxAreas(T, K) === maxAreas(rows.time_entries, rows.cases)) return null;
  // Aggregates that questions sort or cut by stay free of ties too: the amount billed per case and year, and the
  // average review_score per practice area.
  const perCase = {};
  T.forEach((t) => { const k = `${t[2]}/${t[3].date.slice(0, 4)}`; perCase[k] = round2((perCase[k] || 0) + t[6]); });
  const sums = Object.values(perCase).filter((x) => x !== 0);
  if (new Set(sums).size !== sums.length) return null;
  const sc = {};
  L.filter((l) => l[6] !== null).forEach((l) => { (sc[l[2]] = sc[l[2]] || []).push(l[6]); });
  const avgs = Object.values(sc).map((xs) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10000));
  if (new Set(avgs).size !== avgs.length) return null;
  return { lawyers: L, clients: C, cases: K, time_entries: T };
}

// The largest number of different case areas one lawyer logged hours on.
function maxAreas(T, K) {
  const area = new Map(K.map((k) => [k[0], k[4]]));
  const by = {};
  T.forEach((t) => { (by[t[1]] = by[t[1]] || new Set()).add(area.get(t[2])); });
  return Math.max(...Object.values(by).map((x) => x.size));
}
