// The HIDDEN dataset of the Formula 1 team database (data/game-comp-db-f1.js), docs/game-quiz.md §15.5, §16.
// Called by tools/comp-hidden.mjs (node comp-hidden.mjs --db f1) with the public setup, the private seed and the
// helpers H. The server grades every answer on the public setup AND on this one, so an answer that hard-codes what
// the public data looks like (a list of ids, a literal total, a fixed date) fails.
//
// What stays: the three tables and their constraints, every id, driver name and grand prix name, and every key
// relationship (each result keeps its driver and its race, so who raced where and which races were never run stay);
// the NULL counts of track_temp, grid and position.
// What changes (seeded, reproducible):
//   drivers  country, role and penalty_points shuffled among drivers; joined_on regenerated (a driver who raced
//            joined 2–13 months before his first race; the others at a random day of mid-2022 to 2025), all different
//   races    region and total_laps shuffled among races; race_date shuffled among the races run (2 dates of the
//            busier season first moved to free Sundays of the other one, so each season holds another number of
//            races) and among the races without results, then moved ±0–9 days; length_km shuffled among the races
//            run (and among the races without results), then moved ±0.011–0.089 km; all dates and lengths different;
//            track_temp: still NULL on the races without results, the "not recorded" NULL moves to another race run,
//            the other values shuffled among the races run and moved ±0.1–0.9, all different
//   results  grid (NULLs included), position (NULLs included) and pit_stops shuffled, with no two cars of the same
//            race on the same grid slot or position, then a quarter of the pit_stops moved by one (0–3);
//            points follow the new position (25-18-15-12-10-8-6-4-2-1);
//            laps = the race's new total_laps (one less from P11 down), or a random lap before the end for a DNF
// Every column the public data keeps free of ties stays free of ties.

const PTS = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };

export function hiddenSetup(publicSetup, seedText, H) {
  const r = H.rngFrom(seedText);
  const { head, rows } = H.parseSetup(publicSetup);
  const D = rows.drivers.map((x) => [...x]);   // driver_id, name, country, role, joined_on, penalty_points
  const RA = rows.races.map((x) => [...x]);    // race_id, grand_prix, region, race_date, total_laps, length_km, track_temp
  const RS = rows.results.map((x) => [...x]);  // result_id, driver_id, race_id, grid, position, laps, pit_stops, points

  const ranRace = new Set(RS.map((x) => x[2]));
  const runIdx = RA.map((x, i) => i).filter((i) => ranRace.has(RA[i][0]));
  const idleIdx = RA.map((x, i) => i).filter((i) => !ranRace.has(RA[i][0]));
  // Shuffles column c among the rows of idx (a derangement where it can).
  const shuffleIn = (idx, c) => { const v = H.derange(r, idx.map((i) => RA[i][c])); idx.forEach((i, k) => { RA[i][c] = v[k]; }); };

  // Races: region and laps among all; dates and lengths within each group (run / never run).
  const pubLen = new Map(RA.map((x) => [x[0], x[5]]));
  shuffleIn(RA.map((x, i) => i), 2);
  shuffleIn(RA.map((x, i) => i), 4);
  const usedD = new Set();
  const usedL = new Set();
  // Dates: those of the races run, with 2 of the busier season moved to free Sundays of the other one (so each
  // season holds another number of races), shuffled among the races run; those of the races without results
  // shuffled among them. Then every date moved ±0–9 days, all different.
  const runDates = runIdx.map((i) => RA[i][3].date);
  const per = (y) => runDates.filter((d) => d.startsWith(y)).length;
  const [from, to] = per('2024') >= per('2025') ? ['2024', '2025'] : ['2025', '2024'];
  const taken = new Set(runDates);
  const free = [];
  for (let d = H.toDay(`${to}-03-02`); d <= H.toDay(`${to}-11-09`); d += H.DAY) {
    if (new Date(d).getUTCDay() === 0 && !taken.has(H.fromDay(d))) free.push(H.fromDay(d));
  }
  const movable = H.shuffle(r, runDates.filter((d) => d.startsWith(from))).slice(0, 2);
  const newFree = H.shuffle(r, free);
  movable.forEach((d, k) => { runDates[runDates.indexOf(d)] = newFree[k]; });
  const runShuffled = H.derange(r, runDates);
  runIdx.forEach((i, k) => { RA[i][3] = { date: runShuffled[k] }; });
  shuffleIn(idleIdx, 3);
  for (const idx of [runIdx, idleIdx]) {
    shuffleIn(idx, 5);
    idx.forEach((i) => {
      let d;
      for (let k = 0; k < 50; k++) {
        d = Math.min(H.toDay('2025-12-30'), Math.max(H.toDay('2024-03-01'), H.toDay(RA[i][3].date) + (Math.floor(r() * 19) - 9) * H.DAY));
        if (!usedD.has(d)) break;
      }
      usedD.add(d);
      RA[i][3] = { date: H.fromDay(d) };
      let l;
      for (let k = 0; k < 50; k++) {
        l = Math.round((RA[i][5] + (r() < 0.5 ? -1 : 1) * (11 + Math.floor(r() * 79)) / 1000) * 1000) / 1000;
        if (!usedL.has(l) && l !== pubLen.get(RA[i][0]) && l > 3) break;
      }
      usedL.add(l);
      RA[i][5] = l;
    });
  }
  // Track temperature: NULL on the races never run; among the races run, one NULL (moved) and the rest shuffled.
  const runNulls = runIdx.filter((i) => RA[i][6] === null).length;
  const temps = H.derange(r, runIdx.map((i) => RA[i][6]).filter((v) => v !== null));
  const pubNull = new Set(runIdx.filter((i) => RA[i][6] === null));
  const pool = runIdx.filter((i) => !pubNull.has(i));
  const newNull = new Set();
  while (newNull.size < runNulls) newNull.add(pool[Math.floor(r() * pool.length)]);
  const usedT = new Set();
  let t = 0;
  runIdx.forEach((i) => {
    if (newNull.has(i)) { RA[i][6] = null; return; }
    let v;
    for (let k = 0; k < 50; k++) {
      v = H.round2(temps[t] + (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 9)) / 10);
      v = Math.round(v * 10) / 10;
      if (!usedT.has(v)) break;
    }
    usedT.add(v);
    RA[i][6] = v;
    t++;
  });
  idleIdx.forEach((i) => { RA[i][6] = null; });
  const race = new Map(RA.map((x) => [x[0], x]));

  // Results: grid and position shuffled with no clash inside a race; pit stops shuffled.
  const noClash = (vals) => {
    const seen = new Set();
    return RS.every((x, i) => { if (vals[i] === null) return true; const k = `${x[2]}:${vals[i]}`; if (seen.has(k)) return false; seen.add(k); return true; });
  };
  const shuffleRes = (c) => {
    let v;
    for (let k = 0; k < 5000; k++) { v = H.derange(r, RS.map((x) => x[c])); if (noClash(v)) break; }
    if (!noClash(v)) throw new Error(`f1 hidden: no clash-free shuffle of results column ${c}`);
    RS.forEach((x, i) => { x[c] = v[i]; });
  };
  shuffleRes(3);
  shuffleRes(4);
  const pits = H.derange(r, RS.map((x) => x[6]));
  RS.forEach((x, i) => {
    x[6] = r() < 0.25 ? Math.min(3, Math.max(0, pits[i] + (r() < 0.5 ? -1 : 1))) : pits[i];
    const total = race.get(x[2])[4];
    x[5] = x[4] === null ? 1 + Math.floor(r() * (total - 2)) : total - (x[4] >= 11 ? 1 : 0);
    x[7] = x[4] === null ? 0 : (PTS[x[4]] || 0);
  });

  // Drivers: country, role and penalty points shuffled; joined_on before the first race (or at random).
  const countries = H.derange(r, D.map((x) => x[2]));
  const roles = H.derange(r, D.map((x) => x[3]));
  const pens = H.derange(r, D.map((x) => x[5]));
  const usedJ = new Set();
  D.forEach((x, i) => {
    x[2] = countries[i];
    x[3] = roles[i];
    x[5] = pens[i];
    const firsts = RS.filter((s) => s[1] === x[0]).map((s) => H.toDay(race.get(s[2])[3].date));
    let d;
    for (let k = 0; k < 50; k++) {
      d = firsts.length ? Math.min(...firsts) - (60 + Math.floor(r() * 340)) * H.DAY : H.toDay('2022-06-01') + Math.floor(r() * 1200) * H.DAY;
      if (!usedJ.has(d)) break;
    }
    usedJ.add(d);
    x[4] = { date: H.fromDay(d) };
  });
  return H.writeSetup(head, { drivers: D, races: RA, results: RS });
}
