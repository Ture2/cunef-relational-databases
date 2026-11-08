// Checks the onboarding texts of Query for a Million (data/en/game-tour.js, data/es/game-tour.js) against
// docs/game-quiz.md §9.
//  1. Shape: DATA.<lang>.GAME_TOUR has the same structure in English and Spanish, every string filled, the six
//     spotlight ids in order, the three loop steps, the three lifelines plus Walk away, the placeholders.
//  2. Text: md rules (only **bold** and `code`, balanced), word limits per string, one-line strings, sentence case,
//     no TV-show catchphrases, and the lifeline names left to GAME_TEXT (checked against it when it exists).
//  3. Example: example.sql is the same in both languages, passes GameCore.checkQuery (js/game-core.js) and runs on
//     sql.js against GAME_BANK.setup (data/game-bank.js), returning rows. Skipped with a note while those files
//     do not exist yet.
//  4. Tour script: js/game-intro.js loads in Node without a DOM and knows a target for every spot id.
// Run from the repository root: node tools/check-game-tour.mjs   (VERBOSE=1 prints the passing checks too)
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let bad = 0;
const expect = (ok, what) => { if (!ok) bad++; if (!ok || process.env.VERBOSE) console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); return ok; };
const section = (name) => console.log(`\n## ${name}`);
const note = (s) => console.log(`note ${s}`);

/* ---- Load ------------------------------------------------------------------------------------- */
const ctx = { DATA: { en: {}, es: {} }, console };
vm.createContext(ctx);
const LANGS = ['en', 'es'];
LANGS.forEach((l) => vm.runInContext(readFileSync(join(ROOT, `data/${l}/game-tour.js`), 'utf8'), ctx, { filename: `data/${l}/game-tour.js` }));
const T = { en: ctx.DATA.en.GAME_TOUR, es: ctx.DATA.es.GAME_TOUR };
// GAME_TEXT (agent A's files): only to compare the lifeline names and the suspense line, when present.
const G = {};
LANGS.forEach((l) => {
  const file = join(ROOT, `data/${l}/game.js`);
  try {
    const c = { DATA: { en: {}, es: {} }, console };
    vm.createContext(c);
    vm.runInContext(readFileSync(file, 'utf8'), c, { filename: file });
    G[l] = c.DATA[l].GAME_TEXT || null;
  } catch { G[l] = null; }
});

const SPOT_IDS = ['ladder', 'question', 'lifelines', 'console', 'lock', 'schema'];
const LIVES = ['clause', 'template', 'review'];
const PARTS = {
  attract: ['kicker', 'start', 'skip', 'note', 'ladder'],
  nav: ['back', 'next', 'play', 'skip', 'skipLabel', 'step', 'progress', 'replay'],
  buttons: ['run', 'lock'],
  game: ['title', 'lead', 'rungs', 'bands', 'facts'],
  modes: ['title', 'lead', 'kinds', 'unlock'],
  comp: ['title', 'lead', 'items'],                                     // round 6: study and competitive                         // round 5: the modes and the Mixed unlock
  loop: ['title', 'lead', 'steps', 'note'],
  screen: ['title', 'spots'],
  options: ['title', 'lead', 'items', 'note'],
  example: ['title', 'lead', 'question', 'read', 'query', 'lock', 'done', 'fallback', 'more', 'ladder', 'sql'],
};
const WORDS = { en: 32, es: 38 };   // per string: short captions, not paragraphs
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const filled = (s) => typeof s === 'string' && s.trim().length > 0;
const strings = (v, path, out = []) => {
  if (typeof v === 'string') out.push([path, v]);
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => strings(x, `${path}.${k}`, out));
  return out;
};
const isSql = (path) => /\.sql$|\.code$|\.life$|\.id$/.test(path);

/* ---- 1. Shape --------------------------------------------------------------------------------- */
section('Shape');
LANGS.forEach((l) => expect(T[l] && typeof T[l] === 'object', `DATA.${l}.GAME_TOUR is defined`));
if (!T.en || !T.es) { console.log(`\n${bad} check(s) failed`); process.exit(1); }
const shape = (v) => (Array.isArray(v) ? v.map(shape)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape(v[k])]))
    : typeof v);
expect(JSON.stringify(shape(T.en)) === JSON.stringify(shape(T.es)), 'identical structure in English and Spanish');

LANGS.forEach((l) => {
  const t = T[l];
  expect(JSON.stringify(Object.keys(t).sort()) === JSON.stringify(Object.keys(PARTS).sort()), `[${l}] parts are exactly ${Object.keys(PARTS).join(', ')}`);
  Object.entries(PARTS).forEach(([part, keys]) => {
    expect(JSON.stringify(Object.keys(t[part] || {}).sort()) === JSON.stringify([...keys].sort()), `[${l}] ${part} has exactly ${keys.join(', ')}`);
  });
  strings(t, l).forEach(([path, s]) => expect(filled(s), `${path} is filled`));
  const spots = (t.screen || {}).spots || [];
  expect(JSON.stringify(spots.map((x) => x.id)) === JSON.stringify(SPOT_IDS), `[${l}] screen.spots are ${SPOT_IDS.join(', ')} in order`);
  spots.forEach((x) => expect(filled(x.title) && filled(x.text), `[${l}] screen.spots.${x.id} has title and text`));
  const steps = (t.loop || {}).steps || [];
  expect(steps.length === 3 && steps.every((s) => filled(s.name) && filled(s.text)), `[${l}] loop.steps: Read, Query, Lock in, with name and text`);
  expect(steps.length === 3 && !('code' in steps[0]) && steps[1].code === 'SELECT' && !('code' in steps[2]), `[${l}] loop.steps: the SELECT tag on Query only`);
  expect(steps.length === 3 && steps[2].name === t.buttons.lock, `[${l}] loop step 3 has the Lock in button's name`);
  expect(JSON.stringify(Object.keys((t.game || {}).bands || {}).sort()) === JSON.stringify(['easy', 'hard', 'medium']), `[${l}] game.bands: easy, medium, hard`);
  const facts = (t.game || {}).facts || [];
  expect(facts.length === 4 && facts.every((f) => filled(f.head) && filled(f.text)), `[${l}] game.facts: 4 facts with head and text`);
  expect(/\{low\}/.test(facts[0] && facts[0].text) && /\{top\}/.test(facts[0] && facts[0].text), `[${l}] game.facts[0] has {low} and {top}`);
  expect(/\{from\}/.test(t.game.rungs) && /\{to\}/.test(t.game.rungs), `[${l}] game.rungs has {from} and {to}`);
  const items = (t.options || {}).items || [];
  expect(JSON.stringify(items.map((x) => x.life || 'walk')) === JSON.stringify([...LIVES, 'walk']), `[${l}] options.items: ${LIVES.join(', ')}, then Walk away`);
  items.forEach((x) => expect(filled(x.text) && (x.life ? !('name' in x) : filled(x.name)), `[${l}] options.items.${x.life || 'walk'}: text, and a name only for Walk away (lifeline names come from GAME_TEXT)`));
  const comp = (t.comp || {}).items || [];
  expect(comp.length === 4 && comp.every(filled), `[${l}] comp.items: four lines (badges, one hour, no paste, the diploma by form)`);
  const kinds = (t.modes || {}).kinds || {};
  expect(JSON.stringify(Object.keys(kinds)) === JSON.stringify(['select', 'insert', 'update', 'delete', 'ddl', 'mixed']) && Object.values(kinds).every(filled),
    `[${l}] modes.kinds: one line for select, insert, update, delete, ddl and mixed, in tile order`);
  expect(!/(^|\D)5(\D|$)/.test((t.modes || {}).unlock || '') && /\*\*(Mixed|Mixto)\*\*/.test((t.modes || {}).unlock || ''), `[${l}] modes.unlock presents Mixed as open (no rung 5 gate)`);
  expect(/\{n\}/.test(t.nav.step) && /\{total\}/.test(t.nav.step), `[${l}] nav.step has {n} and {total}`);
  expect(/\{low\}/.test(t.attract.ladder) && /\{top\}/.test(t.attract.ladder), `[${l}] attract.ladder has {low} and {top}`);
  expect(/\{prize\}/.test(t.example.lead), `[${l}] example.lead has {prize}`);
  expect(/\{n\}/.test(t.example.more), `[${l}] example.more has {n}`);
});

/* ---- 2. Text ---------------------------------------------------------------------------------- */
section('Text');
// Banned: the TV show's name and catchphrases, in both languages (docs/game-quiz.md §1).
const BANNED = [/millionaire/i, /millonario/i, /final answer/i, /respuesta definitiva/i, /[uú]ltima respuesta/i, /phone a friend/i,
  /llamada? a un amigo/i, /ask the audience/i, /(pregunta|consulta|comod[ií]n del) p[uú]blico/i, /50\s*[:/-]\s*50/, /fifty[- ]fifty/i, /cincuenta por ciento/i];
LANGS.forEach((l) => {
  const all = strings(T[l], `${l}`);
  all.filter(([path]) => !isSql(path)).forEach(([path, s]) => {
    const ticks = (s.match(/`/g) || []).length;
    expect(ticks % 2 === 0, `${path}: balanced backticks`);
    const outside = s.replace(/`[^`]*`/g, '');
    expect(((outside.match(/\*\*/g) || []).length) % 2 === 0, `${path}: balanced **`);
    expect(!/(^|[^*])\*([^*]|$)/.test(outside), `${path}: no single * (md() only knows **bold**)`);
    expect(words(s) <= WORDS[l], `${path} ≤ ${WORDS[l]} words (${words(s)})`);
    expect(!/\n/.test(s), `${path} is one line`);
    const caps = outside.match(/\b[A-ZÁÉÍÓÚÑ]{4,}\b/g) || [];
    expect(!caps.length, `${path}: sentence case, no all-caps words${caps.length ? ` (${caps.join(', ')})` : ''}`);
    expect(!/^[a-záéíóúñ]/.test(s.replace(/^[¿¡]/, '').replace(/^\{\w+\}/, 'X').replace(/^`[^`]*`/, 'X')) || /\.(more|rungs)$|^..\.game\.bands\./.test(path), `${path}: starts with a capital`);
  });
  all.forEach(([path, s]) => {
    const hit = BANNED.find((re) => re.test(s));
    expect(!hit, `${path}: no TV-show catchphrase${hit ? ` (${hit})` : ''}`);
    // Round 4: the game is always light, so the tour never mentions a theme switch.
    expect(!/\b(themes?|temas?|dark|oscuro|light theme|tema claro)\b/i.test(s), `${path}: no theme switch mentioned (the game is always light)`);
  });
  // Spanish: tú, not usted (no "usted", no formal imperatives we would be likely to write).
  if (l === 'es') all.forEach(([path, s]) => expect(!/\busted(es)?\b|\bpulse\b|\bescriba\b|\bpruebe\b/i.test(s), `${path}: tú, not usted`));
});
// Lifeline names and the suspense line live in GAME_TEXT; the tour must not duplicate them, only find them.
LANGS.forEach((l) => {
  if (!G[l]) { note(`[${l}] data/${l}/game.js has no GAME_TEXT yet: lifeline names not compared`); return; }
  const lives = G[l].lifelines || {};
  LIVES.forEach((k) => expect(lives[k] && filled(lives[k].name), `[${l}] GAME_TEXT.lifelines.${k}.name exists for the tour (${lives[k] && lives[k].name})`));
  expect(G[l].host && filled(G[l].host.suspense), `[${l}] GAME_TEXT.host.suspense exists for the example`);
  expect(filled(G[l].title) && filled(G[l].tagline), `[${l}] GAME_TEXT.title and tagline exist for the attract screen`);
  expect(G[l].bands && ['easy', 'medium', 'hard'].every((k) => filled(G[l].bands[k])), `[${l}] GAME_TEXT.bands names the three bands`);
});

/* ---- 3. Example ------------------------------------------------------------------------------- */
section('Example');
const sql = T.en.example.sql;
expect(sql === T.es.example.sql, 'example.sql: the same SQL in English and Spanish');
const O = require(join(ROOT, 'js/oracle-dialect.js'));
LANGS.forEach((l) => {
  const units = O.script(T[l].example.sql, { finish: true });
  expect(units.length === 1 && units[0].sqls.length === 1 && !units[0].unsupported, `[${l}] example.sql is one statement OracleDialect supports`);
  const lint = O.lint(T[l].example.sql);
  expect(!lint.length, `[${l}] example.sql: lint finds nothing${lint.length ? ` (${lint.map((x) => x.msg).join('; ')})` : ''}`);
  expect(/^\s*SELECT\b/i.test(T[l].example.sql) && !/\bLIMIT\b/i.test(T[l].example.sql), `[${l}] example.sql is a SELECT without LIMIT`);
});
const coreFile = join(ROOT, 'js/game-core.js');
const bankFile = join(ROOT, 'data/game-bank.js');
let GameCore = null;
let BANK = null;
if (existsSync(coreFile)) {
  try { GameCore = require(coreFile); } catch (e) { expect(false, `js/game-core.js loads in Node (${e.message})`); }
} else note('js/game-core.js does not exist yet: checkQuery skipped');
if (existsSync(bankFile)) {
  try { BANK = require(bankFile); } catch (e) { expect(false, `data/game-bank.js loads in Node (${e.message})`); }
} else note('data/game-bank.js does not exist yet: the run on sql.js skipped');
if (GameCore && typeof GameCore.checkQuery === 'function') {
  const r = GameCore.checkQuery(sql);
  expect(r && r.ok === true, `GameCore.checkQuery(example.sql) is ok${r && !r.ok ? ` (${r.reason}${r.detail ? `: ${JSON.stringify(r.detail)}` : ''})` : ''}`);
  if (Array.isArray(GameCore.LADDER)) expect(GameCore.LADDER.length === 15, 'GameCore.LADDER has the 15 rungs the tour draws');
}
if (BANK && typeof BANK.setup === 'string') {
  const initSqlJs = require(join(ROOT, 'tools/node_modules/sql.js/dist/sql-wasm.js'));
  const SQL = await initSqlJs({ locateFile: (f) => join(ROOT, 'tools/node_modules/sql.js/dist', f) });
  const db = new SQL.Database();
  const run = (text) => {
    let res = null;
    for (const u of O.script(text, { finish: true })) {
      if (u.unsupported) throw new Error(`unsupported: ${u.text.split('\n')[0]}`);
      u.sqls.forEach((q) => { const r = db.exec(q); res = r.length ? r[0] : null; });
    }
    return res;
  };
  try {
    run(BANK.setup);
    const res = run(sql);
    const n = res ? res.values.length : 0;
    expect(n > 0, `example.sql returns rows on GAME_BANK.setup (${n} rows: ${res ? res.values.slice(0, 4).map((r) => r.join(' | ')).join('; ') : 'none'})`);
    expect(n >= 2 && n <= 8, `example.sql returns a small result, 2 to 8 rows (${n})`);
    expect(res && res.columns.length === 2, `example.sql returns the two columns the question names (${res ? res.columns.join(', ') : ''})`);
    // The example must not be the answer to one of the game's questions.
    const norm = (s) => String(s).replace(/;\s*$/, '').replace(/\s+/g, ' ').trim().toUpperCase();
    const clash = (BANK.questions || []).filter((q) => norm(q.solution) === norm(sql) || (q.traps || []).some((x) => norm(x) === norm(sql)));
    expect(!clash.length, `example.sql is not a solution or trap of the bank${clash.length ? ` (${clash.map((q) => q.id).join(', ')})` : ''}`);
    const same = (BANK.questions || []).filter((q) => {
      try {
        const want = run(q.solution);
        return want && GameCore && GameCore.grade && GameCore.grade({ cols: res.columns, rows: res.values }, { cols: want.columns, rows: want.values }, !!q.ordered).ok;
      } catch { return false; }
    });
    expect(!same.length, `example.sql does not answer any bank question${same.length ? ` (it grades ok on ${same.map((q) => q.id).join(', ')})` : ''}`);
  } catch (e) { expect(false, `example.sql runs on GAME_BANK.setup (${e.message})`); }
  db.close();
}

/* ---- 4. Tour script --------------------------------------------------------------------------- */
section('Tour script');
try {
  const GI = require(join(ROOT, 'js/game-intro.js'));
  expect(['open', 'close', 'isOpen', 'seen', 'markSeen'].every((k) => typeof GI[k] === 'function'), 'js/game-intro.js loads in Node and exports open, close, isOpen, seen, markSeen');
  expect(GI.seen() === false && GI.isOpen() === false, 'without a DOM: seen() is false and isOpen() is false');
} catch (e) { expect(false, `js/game-intro.js loads in Node (${e.message})`); }
const src = readFileSync(join(ROOT, 'js/game-intro.js'), 'utf8');
const targets = /const TARGETS = \{([\s\S]*?)\n {2}\};/.exec(src);
SPOT_IDS.forEach((id) => expect(targets && new RegExp(`\\b${id}:`).test(targets[1]), `TARGETS has a selector list for ${id}`));
expect(/'#wr-ladder'/.test(src) && /'#wr-question'/.test(src) && /'#wr-lifelines'/.test(src) && /'\.wr-console'/.test(src)
  && /'\[data-fid="game-lock"\]'/.test(src) && /'#wr-schema'/.test(src), 'TARGETS use the contract hooks (docs/game-quiz.md §9)');
expect(/'game-intro-seen'/.test(src), 'the seen flag is localStorage game-intro-seen');

console.log(bad ? `\n${bad} check(s) failed` : '\nall game tour checks ok');
process.exit(bad ? 1 : 0);
