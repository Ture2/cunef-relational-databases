// Checks the texts of Query for a Million (data/{en,es}/game.js and data/{en,es}/game-q-<mode>.js) against
// docs/game-quiz.md §6 and §13.
//  1. Shape: the same keys in both languages; the top-level keys, host lines (host.modes too), bands, lifelines,
//     the six stage tiles (modes: name, keyword, blurb, welcome), stage and end; one entry per question of every
//     bank file present (data/game-bank*.js), with prompt, clause, templateNote and explain; the contract names.
//  2. Text: md() rules (only **bold** and `code`, balanced, paragraphs as \n\n); word limits; sentence case.
//  3. Prompts: each names the plain columns of its solution in `code`, quotes its text values ('Puzzle') and
//     numbers, asks for 2 decimals when the solution rounds, and says how to sort when the question is ordered.
//  4. Our own show: none of the TV quiz's name or catchphrases, in either language (other game files: warnings).
// Run from tools/: node check-game-text.mjs   (VERBOSE=1 prints the passing checks too)
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let bad = 0;
let good = 0;
const expect = (ok, what) => {
  if (ok) good++; else bad++;
  if (!ok || process.env.VERBOSE) console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  return ok;
};
const section = (name) => console.log(`\n## ${name}`);

/* ---- Load ------------------------------------------------------------------------------------- */
const ctx = { DATA: { en: {}, es: {} }, console };
vm.createContext(ctx);
const MODE_FILES = ['insert', 'update', 'delete', 'ddl'];
// As index.html loads them: data/<lang>/game.js, then each mode's texts (those that exist yet).
['en', 'es'].forEach((l) => {
  const files = [`data/${l}/game.js`, ...MODE_FILES.map((m) => `data/${l}/game-q-${m}.js`)].filter((f) => existsSync(join(ROOT, f)));
  files.forEach((f) => vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f }));
});
const T = { en: ctx.DATA.en.GAME_TEXT, es: ctx.DATA.es.GAME_TEXT };
const BANK = require(join(ROOT, 'data/game-bank.js'));
MODE_FILES.forEach((m) => { if (existsSync(join(ROOT, `data/game-bank-${m}.js`))) require(join(ROOT, `data/game-bank-${m}.js`)); });
const O = require(join(ROOT, 'js/oracle-dialect.js'));
const LANGS = ['en', 'es'];
const modeOf = (q) => q.mode || 'select';

const TOP = ['title', 'tagline', 'intro', 'host', 'bands', 'modes', 'stage', 'lifelines', 'questions', 'end'];
const HOST = ['welcome', 'ask', 'lock', 'suspense', 'correct', 'wrong', 'rescue', 'safe', 'walk', 'win', 'bands', 'modes'];
const MODES = ['select', 'insert', 'update', 'delete', 'ddl', 'mixed'];
const MODE_NAMES = {
  en: { select: 'Query', insert: 'Insert', update: 'Update', delete: 'Delete', ddl: 'Structure', mixed: 'Mixed' },
  es: { select: 'Consultar', insert: 'Insertar', update: 'Modificar', delete: 'Borrar', ddl: 'Estructura', mixed: 'Mixto' },
};
const KEYWORDS = { select: 'SELECT', insert: 'INSERT', update: 'UPDATE', delete: 'DELETE', ddl: 'CREATE', mixed: 'MIX' };
const BANDS = ['easy', 'medium', 'hard'];
const LIFE = ['clause', 'template', 'review'];
const QFIELDS = ['prompt', 'clause', 'templateNote', 'explain'];
const END = ['won', 'lost', 'walked', 'best', 'review', 'again'];
const CONTRACT = {
  en: { title: 'Query for a Million', lock: 'Lock it in?', suspense: 'Let\'s ask the database…', life: { clause: 'Key clause', template: 'Template', review: 'Review' } },
  es: { title: 'Una consulta por un millón', lock: '¿La fijamos?', suspense: 'Veamos qué dice la base de datos…', life: { clause: 'Cláusula clave', template: 'Plantilla', review: 'Revisión' } },
};
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const filled = (s) => typeof s === 'string' && s.trim().length > 0;
const keysAre = (o, keys) => !!o && typeof o === 'object' && JSON.stringify(Object.keys(o).sort()) === JSON.stringify([...keys].sort());
// Every string with its path.
const strings = (v, path, out = []) => {
  if (typeof v === 'string') out.push([path, v]);
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => strings(x, `${path}.${k}`, out));
  return out;
};

/* ---- 1. Shape --------------------------------------------------------------------------------- */
section('Shape');
LANGS.forEach((l) => expect(T[l] && typeof T[l] === 'object', `DATA.${l}.GAME_TEXT is defined`));
if (!T.en || !T.es) { console.log(`\n${bad} check(s) failed`); process.exit(1); }

// The structure of a value: the same keys (objects), the same lengths (arrays) and the same kinds of leaves.
const shape = (v) => (Array.isArray(v) ? v.map(shape)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape(v[k])]))
    : typeof v);
expect(JSON.stringify(shape(T.en)) === JSON.stringify(shape(T.es)), 'identical key structure in English and Spanish');

const IDS = BANK.questions.map((q) => q.id);
LANGS.forEach((l) => {
  const g = T[l];
  const c = CONTRACT[l];
  expect(keysAre(g, TOP), `[${l}] top-level keys are exactly ${TOP.join(', ')}`);
  ['title', 'tagline', 'intro'].forEach((k) => expect(filled(g[k]), `[${l}] ${k} is filled`));
  expect(g.title === c.title, `[${l}] title is "${c.title}"`);
  expect(!/\n/.test(g.tagline) && words(g.tagline) <= 12, `[${l}] tagline is one short line`);

  const h = g.host || {};
  expect(keysAre(h, HOST), `[${l}] host has exactly ${HOST.join(', ')}`);
  ['ask', 'correct'].forEach((k) => expect(Array.isArray(h[k]) && h[k].length >= 3 && h[k].every(filled) && new Set(h[k]).size === h[k].length, `[${l}] host.${k}: at least 3 different lines`));
  ['welcome', 'lock', 'suspense', 'wrong', 'rescue', 'safe', 'walk', 'win'].forEach((k) => expect(filled(h[k]), `[${l}] host.${k} is filled`));
  expect(h.lock === c.lock && h.suspense === c.suspense, `[${l}] host.lock and host.suspense are the contract lines`);
  ['safe', 'walk'].forEach((k) => expect(/\{prize\}/.test(h[k] || ''), `[${l}] host.${k} has {prize}`));
  expect(keysAre(h.bands, BANDS) && BANDS.every((b) => filled(h.bands[b])), `[${l}] host.bands: a line for easy, medium and hard`);
  expect(keysAre(g.bands, BANDS) && BANDS.every((b) => filled(g.bands[b])), `[${l}] bands: easy, medium, hard`);
  expect(keysAre(g.lifelines, LIFE) && LIFE.every((k) => keysAre(g.lifelines[k], ['name', 'blurb']) && filled(g.lifelines[k].blurb)), `[${l}] lifelines: clause, template, review with name and blurb`);
  LIFE.forEach((k) => expect(g.lifelines[k] && g.lifelines[k].name === c.life[k], `[${l}] lifelines.${k}.name is "${c.life[k]}"`));
  expect(keysAre(g.end, END) && END.every((k) => filled(g.end[k])), `[${l}] end: ${END.join(', ')}, all filled`);

  // Modes (§13): the stage tiles and SQL-Bot's first line in each mode (modes.<m>.welcome repeats host.modes.<m>).
  expect(keysAre(h.modes, MODES) && MODES.every((m) => filled(h.modes[m])), `[${l}] host.modes: a line for ${MODES.join(', ')}`);
  expect(keysAre(g.modes, MODES), `[${l}] modes: exactly ${MODES.join(', ')}`);
  MODES.forEach((m) => {
    const t = (g.modes || {})[m] || {};
    const keys = Object.keys(t).sort().join();
    expect((keys === 'blurb,keyword,name' || keys === 'blurb,keyword,name,welcome') && filled(t.blurb), `[${l}] modes.${m}: name, keyword, blurb (and welcome)`);
    expect(t.name === MODE_NAMES[l][m] && t.keyword === KEYWORDS[m], `[${l}] modes.${m} is "${MODE_NAMES[l][m]}" / ${KEYWORDS[m]}`);
    expect(t.welcome === undefined || t.welcome === (h.modes || {})[m], `[${l}] modes.${m}.welcome is host.modes.${m}`);
    expect(words(t.blurb || '') <= 12 && !/\n/.test(t.blurb || ''), `[${l}] modes.${m}.blurb ≤ 12 words (${words(t.blurb || '')})`);
  });
  expect(keysAre(g.stage, ['title', 'locked']) && filled(g.stage.title) && filled(g.stage.locked) && words(g.stage.title) <= 5 && words(g.stage.locked) <= 14, `[${l}] stage: a short title and locked line`);

  // One text per question of every bank file present (the select bank first, then insert, update, delete, ddl).
  const qs = g.questions || {};
  const missing = IDS.filter((id) => !qs[id]);
  const extra = Object.keys(qs).filter((id) => !IDS.includes(id));
  expect(!missing.length && !extra.length, `[${l}] questions: the ${IDS.length} ids of the banks${missing.length ? `; missing ${missing.join(', ')}` : ''}${extra.length ? `; not in a bank ${extra.join(', ')}` : ''}`);
  MODES.slice(0, 5).forEach((m) => console.log(`${l} ${m}: ${BANK.questions.filter((q) => modeOf(q) === m && qs[q.id]).length} question texts`));
  IDS.filter((id) => qs[id]).forEach((id) => expect(keysAre(qs[id], QFIELDS) && QFIELDS.every((f) => filled(qs[id][f])), `[${l}:${id}] ${QFIELDS.join(', ')}, all filled`));
  // {prize} only where js/game.js fills it.
  strings(g, l).filter(([p]) => !/^\w+\.host\.(safe|walk)$/.test(p)).forEach(([p, s]) => expect(!/[{}]/.test(s), `${p}: no placeholder`));
});

/* ---- 2. Text ---------------------------------------------------------------------------------- */
section('Text');
// Every string is rendered through md(): only **bold** and `code`, both balanced.
LANGS.forEach((l) => strings(T[l], l).forEach(([path, s]) => {
  const ticks = (s.match(/`/g) || []).length;
  expect(ticks % 2 === 0, `${path}: balanced backticks`);
  const outside = s.replace(/`[^`]*`/g, '');
  expect(((outside.match(/\*\*/g) || []).length) % 2 === 0, `${path}: balanced **`);
  expect(!/\*\*/.test((s.match(/`[^`]*`/g) || []).join('')), `${path}: no ** inside code`);
  expect(!/(^|[^*])\*([^*]|$)/.test(outside), `${path}: no single * outside code (md() only knows **bold**)`);
  expect(!/^\s*[-#>]\s/m.test(s) && !/\[[^\]]*\]\(/.test(s) && !/<[a-z/]/i.test(s), `${path}: no lists, headings, links or HTML`);
  expect(!/\n(?!\n)/.test(s.replace(/\n\n/g, '')), `${path}: line breaks only as paragraph breaks (\\n\\n)`);
  expect(s === s.trim() && !/ {2,}/.test(s), `${path}: no stray spaces`);
}));

// Word limits (§6; Spanish runs about 15% longer than English, so it gets that much room).
const LIMIT = {
  // host: SQL-Bot's lines sit in the marquee next to the title (round 4: short lines, at most two rows).
  en: { prompt: 45, clause: 22, templateNote: 25, explain: 40, intro: 95, host: 12, blurb: 20 },
  es: { prompt: 52, clause: 25, templateNote: 29, explain: 46, intro: 110, host: 14, blurb: 23 },
};
LANGS.forEach((l) => {
  const g = T[l];
  const L = LIMIT[l];
  const have = IDS.filter((id) => g.questions[id] && QFIELDS.every((f) => typeof g.questions[id][f] === 'string'));
  have.forEach((id) => QFIELDS.forEach((f) => {
    const n = words(g.questions[id][f]);
    expect(n <= L[f], `[${l}:${id}] ${f} ≤ ${L[f]} words (${n})`);
  }));
  expect(words(g.intro) <= L.intro && g.intro.split('\n\n').length === 2, `[${l}] intro: 2 paragraphs, ≤ ${L.intro} words (${words(g.intro)})`);
  strings(g.host, `${l}.host`).forEach(([p, s]) => expect(words(s) <= L.host && !/\n/.test(s), `${p} ≤ ${L.host} words, one line (${words(s)})`));
  LIFE.forEach((k) => expect(words(g.lifelines[k].blurb) <= L.blurb, `[${l}] lifelines.${k}.blurb ≤ ${L.blurb} words`));
  have.forEach((id) => ['prompt', 'clause', 'templateNote', 'explain'].forEach((f) => expect(!/\n/.test(g.questions[id][f]), `[${l}:${id}] ${f} is one paragraph`)));
});

// Sentence case. Outside `code`, no all-caps words except SQL keywords (written in bold, as in "**LEFT JOIN**");
// labels and headings capitalise only their first word (and names); every sentence starts with a capital.
const SQL_WORDS = new Set(('SELECT FROM WHERE ORDER GROUP HAVING JOIN LEFT RIGHT INNER OUTER DISTINCT NULL LIKE BETWEEN FETCH FIRST '
  + 'ROWS ONLY DESC COUNT ROUND EXTRACT LIMIT EXISTS UNION MINUS WITH CASE WHEN THEN ELSE '
  + 'INSERT INTO VALUES UPDATE DELETE TRUNC GREATEST LEAST COMMIT CHECK UNIQUE PRIMARY FOREIGN REFERENCES CREATE TABLE '
  + 'ALTER DROP VIEW INDEX DEFAULT DATE COLUMN CONSTRAINT CASCADE').split(' '));
const NAMES = ['SQL-Bot', 'Oracle', 'SQL', 'VIP', 'Review', 'Revisión', 'Spain', 'España', 'France', 'Francia', 'Italy', 'Italia', 'Mexico', 'México'];
LANGS.forEach((l) => {
  strings(T[l], l).forEach(([path, s]) => {
    const plain = s.replace(/`[^`]*`/g, '');
    const caps = (plain.match(/\b[A-ZÁÉÍÓÚÑ]{4,}\b/g) || []).filter((w) => !SQL_WORDS.has(w));
    expect(!caps.length, `${path}: sentence case, no all-caps words${caps.length ? ` (${caps.join(', ')})` : ''}`);
    expect(/^[¿¡"“«(`*]*[A-ZÁÉÍÓÚÑ0-9`]/.test(s.replace(/^\*\*/, '')), `${path}: starts with a capital`);
  });
  const labels = [
    ...BANDS.map((b) => [`${l}.bands.${b}`, T[l].bands[b]]),
    ...LIFE.map((k) => [`${l}.lifelines.${k}.name`, T[l].lifelines[k].name]),
    ...END.map((k) => [`${l}.end.${k}`, T[l].end[k]]),
    ...MODES.map((m) => [`${l}.modes.${m}.name`, ((T[l].modes || {})[m] || {}).name || '']),
    [`${l}.stage.title`, (T[l].stage || {}).title || ''],
  ];
  labels.forEach(([path, s]) => {
    const rest = s.replace(/^[¿¡]/, '').split(/\s+/).slice(1).filter((w) => !NAMES.includes(w.replace(/[^\p{L}-]/gu, '')));
    expect(rest.every((w) => !/^[A-ZÁÉÍÓÚÑ]/.test(w)), `${path}: sentence case ("${s}")`);
  });
});

/* ---- 3. Prompts ------------------------------------------------------------------------------- */
section('Prompts');
// The items of the outer SELECT list, split on the commas at depth 0.
function selectItems(sql) {
  const { out } = O.mask(sql);
  let d = 0;
  let flat = '';
  for (const ch of out) { if (ch === '(') d++; flat += d ? '_' : ch; if (ch === ')') d--; }
  const s = /\bSELECT\s+(?:DISTINCT\s+)?/i.exec(flat);
  const f = s && /\bFROM\b/i.exec(flat.slice(s.index + s[0].length));
  if (!f) return [];
  const from = s.index + s[0].length;
  const items = [];
  let start = from;
  for (let i = from; i <= from + f.index; i++) {
    if (i === from + f.index || flat[i] === ',') { items.push(out.slice(start, i).trim()); start = i + 1; }
  }
  return items;
}
// The plain columns among them (col or t.col, aliases aside).
const COLS = new Set(Object.values(BANK.schema).flat());
const selectColumns = (sql) => selectItems(sql).map((x) => x.replace(/^\w+\./, '').split(/\s+/)[0]).filter((x) => COLS.has(x));
const ORDER_WORDS = {
  en: /\b(order|sort|sorted|first|highest|lowest|most|cheapest|oldest|newest|alphabetical)\b/i,
  es: /\b(orden|ordena|ordenados|ordenadas|primero|primera|mayor|menor|más|reciente|antigua|alfabético)\b/i,
};
// DML prompts pin every value: each text and date literal of the solution appears in the prompt (texts as
// written, quotes undoubled; DATE '2025-09-01' as `2025-09-01`), in both languages.
BANK.questions.filter((q) => ['insert', 'update', 'delete'].includes(modeOf(q))).forEach((q) => {
  const lits = (q.solution.match(/'(?:[^']|'')*'/g) || []).map((x) => x.slice(1, -1).replace(/''/g, '\''));
  LANGS.forEach((l) => {
    const t = T[l].questions[q.id];
    if (!t || typeof t.prompt !== 'string') return;
    lits.forEach((v) => expect(t.prompt.includes(v), `[${l}:${q.id}] the prompt gives the value ${v}`));
    expect(!/`'(Acción|Aventura|Puzles?|Carreras|Deportes|Estrategia|España|Francia|Italia|México|Alemania|Suecia|Bélgica)'`/.test(t.prompt), `[${l}:${q.id}] values stay in English`);
  });
});
BANK.questions.filter((q) => modeOf(q) === 'select').forEach((q) => {
  const lits = (q.solution.match(/'(?:[^']|'')*'/g) || []);
  // Numbers the student must read in the prompt: not the 1 of SELECT 1 / FETCH FIRST 1, not the 2 of ROUND(x, 2).
  const nums = (q.solution.replace(/'(?:[^']|'')*'/g, '').replace(/\bSELECT\s+1\b/gi, '').replace(/\bFETCH\s+FIRST\s+1\s+ROWS?\b/gi, '')
    .replace(/,\s*2\s*\)/g, ')').replace(/\b[a-z_]\w*\.\w+\b|\b[a-z_]+\d\b/gi, '').match(/\b\d+(?:\.\d+)?\b/g) || []);
  const rounds = selectItems(q.solution).some((x) => /^ROUND\s*\(/i.test(x));
  LANGS.forEach((l) => {
    const p = T[l].questions[q.id].prompt;
    const code = (p.match(/`[^`]*`/g) || []).join(' ');
    selectColumns(q.solution).forEach((c) => expect(code.includes(`\`${c}\``), `[${l}:${q.id}] the prompt names the column \`${c}\``));
    lits.forEach((lit) => {
      const v = lit.replace(/%/g, '').slice(1, -1);
      expect(code.includes(lit) || (lit.includes('%') && code.includes(`\`${v}\``)), `[${l}:${q.id}] the prompt quotes the value ${lit} in code`);
    });
    nums.forEach((n) => expect(new RegExp(`(^|[^\\d.])${n.replace('.', '\\.')}(?![\\d])`).test(p), `[${l}:${q.id}] the prompt gives the number ${n}`));
    if (rounds) expect(l === 'en' ? /2 decimals/.test(p) : /2 decimales/.test(p), `[${l}:${q.id}] the prompt asks for 2 decimals`);
    if (q.ordered) expect(ORDER_WORDS[l].test(p.replace(/`[^`]*`/g, '')), `[${l}:${q.id}] the prompt says how to sort`);
    // The values stay in English: no translated value in code.
    expect(!/`'(Acción|Aventura|Puzles?|Carreras|Deportes|Estrategia|España|Francia|Italia|México|Alemania)'`/.test(p), `[${l}:${q.id}] values stay in English`);
  });
});

/* ---- 4. Our own show -------------------------------------------------------------------------- */
section('Our own show');
// The TV quiz this game nods to keeps its name, catchphrases and lifelines: none of them here.
const BANNED = [
  /millionaire/i, /millonario/i, /who wants to be/i, /quién quiere ser/i, /final answer/i, /respuesta (final|definitiva)/i,
  /última palabra/i, /phone[- ]a[- ]friend/i, /\bllamada\b/i, /llamar a un amigo/i, /ask the audience/i, /\baudience\b/i,
  /\bpúblico\b/i, /50\s*[:/-]\s*50/, /fifty[- ]fifty/i, /\b50\s*%/, /cincuenta por ciento/i, /is that your final/i, /lock(ed)? in your answer\?$/i,
];
LANGS.forEach((l) => strings(T[l], l).forEach(([path, s]) => {
  const hit = BANNED.find((re) => re.test(s));
  expect(!hit, `${path}: no TV-show name or catchphrase${hit ? ` (${hit})` : ''}`);
}));
// The other game files are not ours to fail on, but say so if a catchphrase slips into them.
['data/en/game-tour.js', 'data/es/game-tour.js', 'i18n/es-game.js', 'js/game.js', 'js/game-intro.js'].forEach((f) => {
  const file = join(ROOT, f);
  if (!existsSync(file)) return;
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  const hits = BANNED.filter((re) => re.test(text)).map(String);
  if (hits.length) console.log(`warn ${f}: ${hits.join(', ')}`);
});

console.log(bad ? `\n${bad} check(s) failed, ${good} ok` : `\nall game text checks ok (${good})`);
process.exit(bad ? 1 : 0);
