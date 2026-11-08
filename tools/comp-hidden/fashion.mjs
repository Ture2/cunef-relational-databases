// The HIDDEN dataset of the fashion retail chain (docs/game-quiz.md §15.5, §16), derived from the public setup of
// data/game-comp-db-fashion.js. Called by tools/comp-hidden.mjs (node comp-hidden.mjs --db fashion) with the seed of
// tools/comp/private/fashion/hidden-seed.txt and the helpers H of comp-hidden.mjs.
//
// What stays: the three tables and their constraints, every id, city and product name, and every key relationship
// (each sale keeps its store and its product), the NULL count of rating, the zero count of stock, which sales were
// discounted and by how much.
// What changes (seeded, reproducible):
//   stores    country and floors shuffled among stores; opened_on regenerated (2–14 months before the first sale;
//             a store without sales opens on a random day of 2020–2025), every date different
//   products  category, section, stock and rating (NULLs included) shuffled among products; price shuffled, then
//             moved ±1–3 (it keeps its cents, stays above 3 and every price stays different)
//   sales     units shuffled; sale_date shuffled, then moved ±0–9 days (2024–2025, all different);
//             amount = units × the hidden price × the sale's discount in the public data (rounded to cents)
// Every column the public data keeps free of ties stays free of ties.

export function hiddenSetup(publicSetup, seedText, H) {
  const r = H.rngFrom(`fashion:${seedText}`);
  const { head, rows } = H.parseSetup(publicSetup);
  const St = rows.stores.map((x) => [...x]);     // store_id, city, country, opened_on, floors
  const P = rows.products.map((x) => [...x]);    // product_id, name, category, section, price, stock, rating
  const S = rows.sales.map((x) => [...x]);       // sale_id, store_id, product_id, sale_date, units, amount

  // Products.
  const cats = H.derange(r, P.map((p) => p[2]));
  const secs = H.derange(r, P.map((p) => p[3]));
  const stocks = H.derange(r, P.map((p) => p[5]));
  const ratings = H.derange(r, P.map((p) => p[6]));
  const pubPrice = new Map(P.map((p) => [p[0], p[4]]));
  const prices = H.derange(r, P.map((p) => p[4]));
  const usedP = new Set();
  P.forEach((p, i) => {
    p[2] = cats[i];
    p[3] = secs[i];
    p[5] = stocks[i];
    p[6] = ratings[i];
    let x;
    for (let k = 0; k < 50; k++) {
      const d = (1 + Math.floor(r() * 3)) * (r() < 0.5 ? -1 : 1);
      x = H.round2(prices[i] + d);
      if (x > 3 && x < 1000 && !usedP.has(x) && x !== pubPrice.get(p[0])) break;
    }
    usedP.add(x);
    p[4] = x;
  });
  const price = new Map(P.map((p) => [p[0], p[4]]));

  // Sales: units and dates shuffled; amounts recomputed with the public discount of the sale.
  const units = H.derange(r, S.map((s) => s[4]));
  const dates = H.derange(r, S.map((s) => s[3].date));
  const usedD = new Set();
  const lo = H.toDay('2024-01-02');
  const hi = H.toDay('2025-12-30');
  S.forEach((s, i) => {
    const disc = s[5] / (s[4] * pubPrice.get(s[2]));
    let d;
    for (let k = 0; k < 50; k++) {
      d = Math.min(hi, Math.max(lo, H.toDay(dates[i]) + (Math.floor(r() * 19) - 9) * H.DAY));
      if (!usedD.has(d)) break;
    }
    usedD.add(d);
    s[3] = { date: H.fromDay(d) };
    s[4] = units[i];
    s[5] = H.round2(s[4] * price.get(s[2]) * (Math.abs(disc - 1) < 0.005 ? 1 : Math.round(disc * 100) / 100));
  });

  // Stores: country and floors shuffled; opened 2–14 months before the first sale (or, with no sale, on a random
  // day of 2020–2025), every date different.
  const countries = H.derange(r, St.map((x) => x[2]));
  const floors = H.derange(r, St.map((x) => x[4]));
  const usedO = new Set();
  St.forEach((x, i) => {
    x[2] = countries[i];
    x[4] = floors[i];
    const firsts = S.filter((s) => s[1] === x[0]).map((s) => H.toDay(s[3].date));
    let d;
    for (let k = 0; k < 50; k++) {
      d = firsts.length ? Math.min(...firsts) - (60 + Math.floor(r() * 365)) * H.DAY : H.toDay('2020-01-10') + Math.floor(r() * 2150) * H.DAY;
      if (!usedO.has(d)) break;
    }
    usedO.add(d);
    x[3] = { date: H.fromDay(d) };
  });
  return H.writeSetup(head, { stores: St, products: P, sales: S });
}
