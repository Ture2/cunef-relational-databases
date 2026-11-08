// Uploads the competitive bank to Supabase (docs/game-quiz.md §15.5): every question of tools/comp/private/<mode>.json
// with its texts (tools/comp/private/texts/) into public.comp_questions, and the datasets into public.comp_meta
// (main_setup, hidden_setup, schema, version). It validates first (tools/comp-build.mjs, both datasets) and uploads
// nothing when a question has a problem. Upserts by id: run it again after any edit. --prune also deletes the rows
// of questions no longer in the private files. --dry-run validates and prints what it would send.
//
// The secrets come from the environment only, never from a file:
//   SUPABASE_URL               https://mbumfoxhmsrlytjwuypb.supabase.co   (or http://127.0.0.1:54321 for the local stack)
//   SUPABASE_SERVICE_ROLE_KEY  Dashboard → Project Settings → API Keys: the service_role key (legacy JWT) or a secret
//                              key (sb_secret_…). It bypasses RLS: never commit it, never put it in the site.
//
//   bash:        cd tools && SUPABASE_URL=https://mbumfoxhmsrlytjwuypb.supabase.co SUPABASE_SERVICE_ROLE_KEY=… node comp-upload.mjs
//   PowerShell:  cd tools; $env:SUPABASE_URL='https://mbumfoxhmsrlytjwuypb.supabase.co'; $env:SUPABASE_SERVICE_ROLE_KEY='…'; node comp-upload.mjs
//   local stack: node comp-upload.mjs --local   (reads the local URL and demo key from `npx supabase status`)
// After an upload the function picks the new bank up within a minute (its cache follows comp_meta.version).
//
// The teacher's deploy, step by step (region, SMTP, email code, login, link, db push, functions deploy, auth hook,
// upload, teacher role, anon key): supabase/README-deploy.md.
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { collect } from './comp-build.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* The local stack's URL and keys (npx supabase status): { API_URL, ANON_KEY, SERVICE_ROLE_KEY, MAILPIT_URL, … }.
   These are the CLI's fixed local demo keys, not secrets of the real project. */
export function localStack() {
  const out = execSync(`npx supabase status -o json --workdir "${ROOT}"`, { cwd: dirname(fileURLToPath(import.meta.url)), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return JSON.parse(out.slice(out.indexOf('{')));
}

export function headersFor(key) {
  const h = { apikey: key, 'Content-Type': 'application/json' };
  if (/^eyJ/.test(key)) h.Authorization = `Bearer ${key}`;   // a legacy JWT key; an sb_secret_ key goes in apikey only
  return h;
}

/* The comp_questions rows: hidden_traps become ordinary traps (wrong under the server's two-dataset grading). */
export function uploadRows(rows) {
  return rows.map(({ hidden_traps: ht, ...r }) => ({ ...r, traps: [...r.traps, ...(ht || [])], updated_at: new Date().toISOString() }));
}

/* comp_meta.version: a content hash of exactly what is uploaded (every question field, both setups, the schema), so
   any change gives a new version. The function also reloads on any updated_at change (see its bank()). */
export function versionOf(rows, meta) {
  const strip = rows.map(({ updated_at: _u, ...r }) => r).sort((a, b) => a.id.localeCompare(b.id));
  return createHash('sha256').update(JSON.stringify([strip, meta.main_setup, meta.hidden_setup, meta.schema])).digest('hex').slice(0, 16);
}

// mutate(rows) => rows: for tests only (check-comp-server --e2e changes a question and uploads it).
export async function upload({ url, key, prune = false, log = console.log, mutate = null }) {
  const c = await collect();
  if (c.problems.length) {
    c.problems.forEach((p) => log(`FAIL ${p}`));
    throw new Error(`${c.problems.length} problem(s): nothing uploaded (node comp-build.mjs for the report)`);
  }
  if (!c.meta.hidden_setup) throw new Error('no hidden dataset: run node comp-hidden.mjs first');
  const H = headersFor(key);
  const rest = `${url.replace(/\/+$/, '')}/rest/v1`;
  const send = async (method, path, body, prefer) => {
    const r = await fetch(`${rest}/${path}`, { method, headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await r.text();
    if (!r.ok) throw new Error(`${method} ${path}: HTTP ${r.status} ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  };
  const rows = mutate ? mutate(uploadRows(c.rows)) : uploadRows(c.rows);
  c.meta.version = versionOf(rows, c.meta);
  await send('POST', 'comp_questions?on_conflict=id', rows, 'resolution=merge-duplicates,return=minimal');
  log(`upserted ${rows.length} question(s)`);
  if (prune) {
    const ids = rows.map((r) => r.id);
    const gone = await send('DELETE', `comp_questions?id=not.in.(${ids.join(',')})`, undefined, 'return=representation');
    log(`pruned ${gone.length} question(s) no longer in the private files`);
  }
  const meta = Object.entries(c.meta).map(([k, value]) => ({ key: k, value, updated_at: new Date().toISOString() }));
  // The version last, so that a function instance never sees a new version with old datasets.
  const ordered = [...meta.filter((m) => m.key !== 'version'), ...meta.filter((m) => m.key === 'version')];
  for (const m of ordered) await send('POST', 'comp_meta?on_conflict=key', [m], 'resolution=merge-duplicates,return=minimal');
  log(`comp_meta: ${ordered.map((m) => m.key).join(', ')} (version ${c.meta.version})`);
  const main = rows.filter((r) => r.main_only).map((r) => r.id);
  log(`main_only (${main.length}): ${main.join(', ') || 'none'}`);
  return { version: c.meta.version, count: rows.length };
}

async function main(argv) {
  let url = process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (argv.includes('--local')) {   // the local Docker stack (npx supabase start): no environment needed
    const L = localStack();
    url = L.API_URL;
    key = L.SERVICE_ROLE_KEY;
  }
  if (argv.includes('--dry-run')) {
    const c = await collect();
    c.problems.forEach((p) => console.log(`FAIL ${p}`));
    console.log(`${c.rows.length} question(s), version ${c.meta.version}, hidden dataset ${c.meta.hidden_setup ? 'present' : 'MISSING'}`);
    return c.problems.length ? 1 : 0;
  }
  if (!url || !key) {
    console.log('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (see the top of this file).');
    return 1;
  }
  if (!/^https:\/\//.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url)) {
    console.log('SUPABASE_URL must be https:// (or http://127.0.0.1 / localhost for the local stack).');
    return 1;
  }
  await upload({ url, key, prune: argv.includes('--prune') });
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(e.message || e); process.exit(1); });
}
