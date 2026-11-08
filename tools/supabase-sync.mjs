// Copies the game engine the Edge Function grades with into supabase/functions/_shared/ (docs/game-quiz.md §15.4):
//   js/oracle-dialect.js  → supabase/functions/_shared/oracle-dialect.js   (committed copy)
//   js/game-core.js       → supabase/functions/_shared/game-core.js        (committed copy)
//   tools/node_modules/sql.js/dist/sql-wasm.wasm → supabase/functions/_shared/sql-wasm.wasm (git-ignored; shipped
//                           with the function as a static file; without it the function fetches the same file
//                           from jsDelivr at cold start)
// The function must grade exactly as the study page does, so the copies must equal the originals.
//
//   cd tools && node supabase-sync.mjs           copy (run it before `npx supabase functions deploy comp`)
//   cd tools && node supabase-sync.mjs --check   only check: exit 1 when a copy differs or is missing
//
// The teacher's deploy, step by step (region, SMTP, email code, login, link, db push, functions deploy, auth hook,
// upload, teacher role, anon key): supabase/README-deploy.md.
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SHARED = join(ROOT, 'supabase/functions/_shared');
export const COPIES = [
  ['js/oracle-dialect.js', 'oracle-dialect.js'],
  ['js/game-core.js', 'game-core.js'],
];
const WASM = [join(HERE, 'node_modules/sql.js/dist/sql-wasm.wasm'), join(SHARED, 'sql-wasm.wasm')];

/* [{ file, ok }] for the two JS copies. */
export function compare() {
  return COPIES.map(([src, dst]) => {
    const d = join(SHARED, dst);
    return { file: `supabase/functions/_shared/${dst}`, ok: existsSync(d) && readFileSync(d, 'utf8') === readFileSync(join(ROOT, src), 'utf8') };
  });
}

function main(argv) {
  if (argv.includes('--check')) {
    const r = compare();
    r.forEach((x) => console.log(`${x.ok ? 'ok  ' : 'FAIL'} ${x.file} ${x.ok ? 'matches' : 'differs from'} its original`));
    return r.every((x) => x.ok) ? 0 : 1;
  }
  COPIES.forEach(([src, dst]) => {
    writeFileSync(join(SHARED, dst), readFileSync(join(ROOT, src), 'utf8'));
    console.log(`copied ${src} → supabase/functions/_shared/${dst}`);
  });
  if (existsSync(WASM[0])) { copyFileSync(WASM[0], WASM[1]); console.log('copied sql-wasm.wasm (sql.js 1.14.2) → supabase/functions/_shared/'); } else console.log('note: tools/node_modules/sql.js is missing (npm install): the function will fetch sql-wasm.wasm from jsDelivr');
  return compare().every((x) => x.ok) ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
