// Fails when the repository (every file git tracks or would add: tracked + untracked not ignored) holds a secret of
// the competitive server (docs/game-quiz.md §15.7):
//   - a Supabase service-role key: a JWT whose payload says "role": "service_role" (decoded, or the encoded
//     fragment), or a secret key sb_secret_…; a Supabase access token sbp_…; a Brevo (xkeysib-…) or Resend (re_…)
//     key;
//   - a postgres:// or postgresql:// URL with a password;
//   - a private file: anything under tools/comp/ except tools/comp/solutions.enc (solutions, texts, the hidden dataset
//     and its seed), a .env file, supabase/.temp or supabase/.branches;
//   - when the private files are on this machine, their content in any other file: the SQL of a solution or alt
//     (normalized, 12 characters or more), a prompt (30 or more), a row of the hidden dataset. Not compared: the
//     templates (public by design: the Insert template lifeline shows them), the traps (wrong answers), the short
//     clause hints and template notes (generic sentences shared with the study texts).
// The anon key (role "anon") and the publishable key (sb_publishable_…) are public by design and allowed.
//
//   cd tools && node check-no-secrets.mjs        (VERBOSE=1 lists the files scanned)
// Run it before every commit that touches supabase/, tools/ or data/.
//
// The teacher's deploy, step by step (region, SMTP, email code, login, link, db push, functions deploy, auth hook,
// upload, teacher role, anon key): supabase/README-deploy.md.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPrivate, readTexts, MODES } from './comp-build.mjs';
import { readHidden, publicSetup } from './comp-hidden.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const files = [...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean))]
  .filter((f) => existsSync(join(ROOT, f)) && statSync(join(ROOT, f)).isFile());
const problems = [];

const PRIVATE_PATH = /^(tools\/comp\/(?!solutions\.enc$)|supabase\/\.temp\/|supabase\/\.branches\/)|(^|\/)\.env(\.|$)/;
files.filter((f) => PRIVATE_PATH.test(f)).forEach((f) => problems.push(`${f}: a private file is tracked or not ignored`));
for (const p of ['tools/comp/private/select.json', 'tools/comp/private/hidden-seed.txt', 'tools/comp/private/texts/en-select.js', 'supabase/.temp/x']) {
  try { git('check-ignore', '-q', p); } catch (e) { problems.push(`${p}: not ignored by git (.gitignore)`); }
}

// The private content (normalized: whitespace collapsed, lower case), when this machine has the private files.
const norm = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();
const secrets = [];
MODES.forEach((m) => (readPrivate(m) || []).forEach((q) => {
  // Right answers only: traps are wrong answers, often the same common mistakes as in the public study bank.
  [['solution', [q.solution]], ['alt', q.alts || []]].forEach(([what, list]) => list.forEach((s) => {
    if (norm(s).length >= 12) secrets.push([`${what} of ${q.id}`, norm(s)]);
  }));
}));
const texts = readTexts();
// The prompts (the clause hints and template notes are short generic sentences, shared with the study texts).
['en', 'es'].forEach((l) => Object.entries(texts[l]).forEach(([id, t]) => {
  if (norm(t.prompt || '').length >= 30) secrets.push([`${l} prompt of ${id}`, norm(t.prompt)]);
}));
const hidden = readHidden();
if (hidden) {
  const pub = new Set(publicSetup().split('\n').map(norm));
  hidden.split('\n').filter((l) => /^INSERT INTO/.test(l) && !pub.has(norm(l))).forEach((l) => secrets.push(['row of the hidden dataset', norm(l).replace(/;$/, '')]));
}
// A secret that is also public study material (the same short SQL in a public card) is not a leak of the bank.
const publicCorpus = norm(files.filter((f) => /^(data|js|i18n)\//.test(f) && !/game-comp/.test(f)).map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n'));
const shared = new Set(secrets.filter(([, s]) => s.length < 30 && publicCorpus.includes(s)).map(([, s]) => s));

const b64json = (s) => { try { return JSON.parse(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch (e) { return null; } };
const BINARY = /\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|otf|mp4|webm|mp3|wav|zip|gz|wasm|pptx|docx|xlsx)$/i;
let scanned = 0;
for (const f of files) {
  if (BINARY.test(f)) continue;
  const buf = readFileSync(join(ROOT, f));
  if (buf.includes(0)) continue;
  const text = buf.toString('utf8');
  scanned++;
  if (process.env.VERBOSE) console.log(`scan ${f}`);
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{10,}/g)) {
    const payload = b64json(m[1]);
    if ((payload && payload.role === 'service_role') || /InNlcnZpY2Vfcm9sZS|JzZXJ2aWNlX3JvbGUi|ic2VydmljZV9yb2xlI/.test(m[1])) problems.push(`${f}: a service_role JWT (${m[0].slice(0, 16)}…)`);
  }
  const KEYS = [
    [/\bsb_secret_[A-Za-z0-9_-]{8,}/g, 'a Supabase secret key'],
    [/\bsbp_[A-Za-z0-9]{20,}/g, 'a Supabase access token'],
    [/\bxkeysib-[A-Za-z0-9]{20,}(?:-[A-Za-z0-9]{8,})?/g, 'a Brevo API key'],
    [/\bxsmtpsib-[A-Za-z0-9]{20,}(?:-[A-Za-z0-9]{8,})?/g, 'a Brevo SMTP key'],
    [/\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/g, 'a Resend API key'],
  ];
  KEYS.forEach(([re, what]) => { for (const m of text.matchAll(re)) problems.push(`${f}: ${what} (${m[0].slice(0, 12)}…)`); });
  for (const m of text.matchAll(/\bpostgres(?:ql)?:\/\/[^\s:@/'"`]+:([^\s@/'"`]+)@/g)) {
    if (!/^(\[?YOUR[-_]|<|\$\{|\*+$|\.\.\.|…)/i.test(m[1])) problems.push(`${f}: a postgres URL with a password (${m[0].slice(0, 24)}…)`);
  }
  if (secrets.length && !f.startsWith('tools/comp/')) {
    const t = norm(text);
    secrets.forEach(([what, s]) => { if (!shared.has(s) && t.includes(s)) problems.push(`${f}: contains the ${what}`); });
  }
}

problems.forEach((p) => console.log(`FAIL ${p}`));
if (shared.size) console.log(`note: ${shared.size} short bank SQL text(s) also appear in the public study material (not counted as leaks)`);
console.log(`${scanned} files scanned${secrets.length ? `, ${secrets.length} private texts compared` : ' (no private files here: content not compared)'}: ${problems.length ? `${problems.length} problem(s)` : 'no secret found'}`);
process.exit(problems.length ? 1 : 0);
