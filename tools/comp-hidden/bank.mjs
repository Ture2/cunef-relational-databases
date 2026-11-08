// The HIDDEN dataset of the retail-bank database (docs/game-quiz.md §15.5, §16), derived from its public setup
// (data/game-comp-db-bank.js) by tools/comp-hidden.mjs with the helpers H (HELPERS there).
//
// What stays: the four tables and their constraints, every id, client name and branch name, every key relationship
// (each account keeps its client and its branch, each transaction its account), the NULL counts of risk_score and
// interest_rate, the zero count of monthly_fee.
// What changes (seeded, reproducible):
//   branches      (city, country) pairs shuffled among branches; staff shuffled, then moved ±1–3 (all different)
//   clients       country, segment and risk_score (NULLs included) shuffled; since regenerated (before the first
//                 account the client opened, or at random in 2015–2025 for a client without accounts; all different)
//   accounts      acc_type, monthly_fee and interest_rate (NULLs included) shuffled; balance shuffled, then moved
//                 ±3–12 % (all different, never below 400); opened regenerated (before the account's first
//                 transaction, or at random in 2023–2025 without transactions; all different)
//   transactions  (kind, amount) pairs shuffled, amount then moved ±1–9 % (all different); txn_date shuffled, then
//                 moved ±0–9 days (2024–2025, all different)
// Every column the public data keeps free of ties stays free of ties.

export function hiddenSetup(publicSetup, seedText, H) {
  const r = H.rngFrom(seedText);
  const { head, rows } = H.parseSetup(publicSetup);
  const B = rows.branches.map((x) => [...x]);       // branch_id, name, city, country, staff
  const C = rows.clients.map((x) => [...x]);        // client_id, name, country, segment, since, risk_score
  const A = rows.accounts.map((x) => [...x]);       // account_id, client_id, branch_id, acc_type, opened, balance, monthly_fee, interest_rate
  const T = rows.transactions.map((x) => [...x]);   // txn_id, account_id, txn_date, kind, amount
  const sign = () => (r() < 0.5 ? -1 : 1);

  // Branches.
  const places = H.derange(r, B.map((b) => [b[2], b[3]]));
  const staffs = H.derange(r, B.map((b) => b[4]));
  const usedStaff = new Set();
  B.forEach((b, i) => {
    [b[2], b[3]] = places[i];
    let s;
    for (let k = 0; k < 50; k++) {
      s = staffs[i] + (1 + Math.floor(r() * 3)) * sign();
      if (s >= 3 && s < 1000 && !usedStaff.has(s)) break;
    }
    usedStaff.add(s);
    b[4] = s;
  });

  // Transactions: (kind, amount) pairs shuffled and the amount moved; dates shuffled and moved.
  const pairs = H.derange(r, T.map((t) => [t[3], t[4]]));
  const dates = H.derange(r, T.map((t) => t[2].date));
  const usedAmt = new Set();
  const usedD = new Set();
  const lo = H.toDay('2024-01-02');
  const hi = H.toDay('2025-12-30');
  T.forEach((t, i) => {
    const [kind, amount] = pairs[i];
    let a;
    for (let k = 0; k < 50; k++) {
      a = H.round2(amount * (1 + (1 + Math.floor(r() * 9)) / 100 * sign()));
      if (a > 0 && !usedAmt.has(a)) break;
    }
    usedAmt.add(a);
    t[3] = kind;
    t[4] = a;
    let d;
    for (let k = 0; k < 50; k++) {
      d = Math.min(hi, Math.max(lo, H.toDay(dates[i]) + (Math.floor(r() * 19) - 9) * H.DAY));
      if (!usedD.has(d)) break;
    }
    usedD.add(d);
    t[2] = { date: H.fromDay(d) };
  });

  // Accounts: type, fee and rate shuffled; balance shuffled and moved; opened before the first transaction.
  const types = H.derange(r, A.map((a) => a[3]));
  const fees = H.derange(r, A.map((a) => a[6]));
  const rates = H.derange(r, A.map((a) => a[7]));
  const balances = H.derange(r, A.map((a) => a[5]));
  const usedBal = new Set();
  const usedO = new Set();
  A.forEach((a, i) => {
    a[3] = types[i];
    a[6] = fees[i];
    a[7] = rates[i];
    let b;
    for (let k = 0; k < 50; k++) {
      b = H.round2(balances[i] * (1 + (3 + Math.floor(r() * 10)) / 100 * sign()));
      if (b >= 400 && !usedBal.has(b)) break;
    }
    usedBal.add(b);
    a[5] = b;
    const firsts = T.filter((t) => t[1] === a[0]).map((t) => H.toDay(t[2].date));
    let d;
    for (let k = 0; k < 50; k++) {
      d = firsts.length
        ? Math.max(H.toDay('2023-01-02'), Math.min(...firsts) - (5 + Math.floor(r() * 400)) * H.DAY)
        : H.toDay('2023-01-02') + Math.floor(r() * 1000) * H.DAY;
      if (!usedO.has(d)) break;
    }
    usedO.add(d);
    a[4] = { date: H.fromDay(d) };
  });

  // Clients: country, segment and risk shuffled; since before the first account opened.
  const countries = H.derange(r, C.map((c) => c[2]));
  const segments = H.derange(r, C.map((c) => c[3]));
  const risks = H.derange(r, C.map((c) => c[5]));
  const usedS = new Set();
  C.forEach((c, i) => {
    c[2] = countries[i];
    c[3] = segments[i];
    c[5] = risks[i];
    const firsts = A.filter((a) => a[1] === c[0]).map((a) => H.toDay(a[4].date));
    let d;
    for (let k = 0; k < 50; k++) {
      d = firsts.length
        ? Math.min(...firsts) - (30 + Math.floor(r() * 2500)) * H.DAY
        : H.toDay('2015-01-10') + Math.floor(r() * 3900) * H.DAY;
      if (!usedS.has(d)) break;
    }
    usedS.add(d);
    c[4] = { date: H.fromDay(d) };
  });

  return H.writeSetup(head, { branches: B, clients: C, accounts: A, transactions: T });
}
