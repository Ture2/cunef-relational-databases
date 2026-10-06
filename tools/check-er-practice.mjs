// Checks the ER practice (#/relational/er/practice): data, checker and page, in both languages.
//  1. Data: same ids, order and structure in data/en and data/es; every metadata key names an element.
//  2. Checker: every official model and accepted alternative passes its own check; typical mistakes are caught.
//  3. ER → Logical: every exercise (they share models with the practice) still derives its reference tables.
//  4. Translations: every checker message and interface text has Spanish, with the same placeholders.
//  5. Page (skipped with --no-browser): load the official solution and check it; a stray entity fails;
//     no page errors, no [i18n] warnings, no author warnings, no horizontal scroll on a phone.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let bad = 0;
const expect = (ok, what) => { if (!ok) bad++; if (!ok || process.env.VERBOSE) console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };
const section = (name) => console.log(`\n## ${name}`);

/* ---- Load the data, the dictionaries and the engines in one context ---------------------------- */
const ctx = { DATA: { en: {}, es: {} }, UI: { es: {} }, console };
vm.createContext(ctx);
const run = (file) => vm.runInContext(readFileSync(join(ROOT, file), 'utf8'), ctx, { filename: file });
readdirSync(join(ROOT, 'i18n')).forEach((f) => run(`i18n/${f}`));
['en', 'es'].forEach((l) => ['logical', 'er-practice'].forEach((f) => run(`data/${l}/${f}.js`)));
const { DATA, UI } = ctx;
const E = require(join(ROOT, 'js/er-practice-engine.js'));
const LE = require(join(ROOT, 'js/logical-engine.js'));
// The diagram module needs esc() and t() from the page; plain stand-ins are enough to render.
vm.runInContext(`var esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  var t = (s, p) => (p ? s.replace(/\\{(\\w+)\\}/g, (m, k) => (k in p ? String(p[k]) : m)) : s);`, ctx);
run('js/er-diagram.js');
const ErDiagram = vm.runInContext('ErDiagram', ctx);

const ctxOf = (lang, ex) => ({ logical: DATA[lang].LOGICAL_EXERCISES, en: DATA.en.ER_PRACTICE.find((x) => x.id === ex.id), logicalEn: DATA.en.LOGICAL_EXERCISES });
const keysOf = (m) => new Set([
  ...m.entities.flatMap((e) => [e._key, ...e.attrs.map((a) => a._key)]),
  ...m.relationships.flatMap((r) => [r._key, ...r.ends.map((x) => x._key), ...(r.attrs || []).map((a) => a._key)]),
  ...(m.hierarchies || []).map((h) => h._key),
]);
const META = ['names', 'optional', 'accept', 'why', 'quote'];
const metaKeys = (ex, f) => (Array.isArray(ex[f]) ? ex[f] : Object.keys(ex[f] || {}));

/* ---- 1. Data ------------------------------------------------------------------------------------ */
section('Data');
const en = DATA.en.ER_PRACTICE;
const es = DATA.es.ER_PRACTICE;
expect(Array.isArray(en) && en.length === 15, `15 exercises in English (${en && en.length})`);
expect(Array.isArray(es) && es.length === en.length, 'the same number in Spanish');
expect(new Set(en.map((x) => x.id)).size === en.length, 'unique ids');
en.forEach((a, i) => {
  const b = es[i] || {};
  const id = a.id;
  expect(b.id === id, `[${id}] same id and order in Spanish`);
  ['title', 'short', 'source', 'statement', 'hints', 'focus', 'group'].forEach((f) => expect(a[f] && b[f], `[${id}] has ${f} in both languages`));
  expect(a.group === b.group && ['handson', 'solved'].includes(a.group), `[${id}] same group`);
  expect(typeof a.model === typeof b.model && (typeof a.model !== 'string' || a.model === b.model), `[${id}] same model source`);
  expect(a.statement.length === b.statement.length && a.statement.every((l, k) => /^- /.test(l) === /^- /.test(b.statement[k])), `[${id}] same statement lines and lists`);
  expect(a.hints.length === b.hints.length, `[${id}] same number of hints`);
  expect((a.alternatives || []).map((x) => x.id).join() === (b.alternatives || []).map((x) => x.id).join(), `[${id}] same alternatives`);
  ['optional', 'accept', 'why', 'quote'].forEach((f) => {
    const ka = metaKeys(a, f).sort().join('|');
    const kb = metaKeys(b, f).sort().join('|');
    expect(ka === kb, `[${id}] same ${f} keys in both languages${ka === kb ? '' : `: ${ka} ≠ ${kb}`}`);
  });
  expect(JSON.stringify(a.accept || {}) === JSON.stringify(b.accept || {}), `[${id}] same accepted alternatives`);
  ['assumptions', 'corrections'].forEach((f) => expect((a[f] || []).length === (b[f] || []).length, `[${id}] same number of ${f}`));
  if (typeof a.model === 'object') {
    const shape = (m) => JSON.stringify({
      e: m.entities.map((x) => [x.at, !!x.weak, x.attrs.map((y) => [y.kind || '', (y.parts || []).length])]),
      r: m.relationships.map((x) => [x.at || null, !!x.identifying, x.ends.map((y) => [m.entities.findIndex((z) => z.id === y.entity), y.card, !!y.role]), (x.attrs || []).length]),
      h: (m.hierarchies || []).map((x) => [m.entities.findIndex((z) => z.id === x.super), x.subs.map((s) => m.entities.findIndex((z) => z.id === s)), x.disjoint, x.total, x.at]),
    });
    expect(shape(a.model) === shape(b.model), `[${id}] the inline model has the same structure in both languages`);
  }
});
['en', 'es'].forEach((lang) => DATA[lang].ER_PRACTICE.forEach((ex) => {
  let vars;
  try { vars = E.variants(ex, ctxOf(lang, ex)); } catch (e) { expect(false, `[${lang}:${ex.id}] variants: ${e.message}`); return; }
  const all = new Set(vars.flatMap((v) => [...keysOf(v.model)]));
  META.forEach((f) => metaKeys(ex, f).forEach((k) => expect(all.has(k), `[${lang}:${ex.id}] ${f} key “${k}” names an element`)));
  (ex.alternatives || []).forEach((alt, j) => Object.keys(alt.names || {}).forEach((k) => expect(keysOf(vars[j + 1].model).has(k), `[${lang}:${ex.id}] alternative ${alt.id}: names key “${k}” names an element`)));
  expect(vars[0].model.entities.every((e) => Array.isArray(e.at)), `[${lang}:${ex.id}] every entity of the official model has a grid position`);
}));

/* ---- 2. Checker --------------------------------------------------------------------------------- */
section('Checker');
const codes = (r) => r.checks.filter((c) => c.status === 'bad').map((c) => c.code);
const clone = (v) => JSON.parse(JSON.stringify(v));
['en', 'es'].forEach((lang) => DATA[lang].ER_PRACTICE.forEach((ex) => {
  const c = ctxOf(lang, ex);
  const vars = E.variants(ex, c);
  const opts = { ...c, vars };
  const tag = `[${lang}:${ex.id}]`;
  vars.forEach((v) => {
    const r = E.check(ex, E.fromModel(v.model), opts);
    const extra = r.checks.filter((x) => x.status !== 'ok');
    expect(r.ok && r.score === 100 && extra.length === (v.id ? 1 : 0), `${tag} ${v.id ? `alternative ${v.id}` : 'official model'} passes its own check${r.ok ? '' : `: ${r.checks.filter((x) => x.status === 'bad').map((x) => x.text).join(' | ')}`}`);
  });
  const ref = vars[0].model;
  const base = E.fromModel(ref);
  const optional = new Set(ex.optional || []);
  const hierSubs = new Set((ref.hierarchies || []).flatMap((h) => h.subs));
  // An entity removed.
  const k = ref.entities.findIndex((e) => !optional.has(e._key) && !hierSubs.has(e.id));
  const w1 = clone(base);
  const gone = w1.entities.splice(k, 1)[0];
  w1.relationships = w1.relationships.filter((r) => !r.ends.some((x) => x.entity === gone.uid));
  w1.hierarchies = w1.hierarchies.filter((h) => h.super !== gone.uid);
  const r1 = E.check(ex, w1, opts);
  expect(!r1.ok && codes(r1).some((x) => /^missingEntity/.test(x)), `${tag} a missing entity is caught`);
  // A max changed, and the two ends of a binary relationship swapped.
  const bi = ref.relationships.findIndex((r) => r.ends.length === 2 && !E.isUnary(r) && r.ends.some((x) => /,\s*1\)/.test(x.card)) && !(ex.accept || {})[r.ends[0]._key] && !(ex.accept || {})[r.ends[1]._key]);
  if (bi >= 0) {
    const w2 = clone(base);
    const end = w2.relationships[bi].ends.find((x) => x.max === '1');
    end.max = 'N';
    const r2 = E.check(ex, w2, opts);
    expect(!r2.ok && codes(r2).some((x) => x === 'wrongMax' || x === 'lookHere'), `${tag} a wrong max is caught`);
    const w3 = clone(base);
    const [a, b] = w3.relationships[bi].ends;
    if (a.min + a.max !== b.min + b.max) {
      [a.min, a.max, b.min, b.max] = [b.min, b.max, a.min, a.max];
      const r3 = E.check(ex, w3, opts);
      expect(!r3.ok && codes(r3).includes('lookHere'), `${tag} swapped (look-here) cardinalities are caught`);
    }
  }
  // A weak entity made strong.
  const wk = ref.entities.findIndex((e) => e.weak && !((ex.accept || {})[e._key] || {}).weak);
  if (wk >= 0) {
    const w4 = clone(base);
    w4.entities[wk].weak = false;
    const r4 = E.check(ex, w4, opts);
    expect(!r4.ok && codes(r4).includes('shouldBeWeak'), `${tag} a weak entity left strong is caught`);
  }
  // A relationship attribute moved onto one of its entities.
  const ra = ref.relationships.findIndex((r) => (r.attrs || []).length && !E.isUnary(r));
  if (ra >= 0) {
    const w5 = clone(base);
    const rel = w5.relationships[ra];
    const moved = rel.attrs.shift();
    w5.entities.find((e) => e.uid === rel.ends[0].entity).attrs.push({ uid: 'mv1', name: moved.name, kind: '', parts: '' });
    const r5 = E.check(ex, w5, opts);
    expect(!r5.ok && codes(r5).includes('misplacedToRel'), `${tag} a relationship attribute put on an entity is caught`);
  }
  // A foreign key written as an attribute.
  const fk = ref.relationships.find((r) => r.ends.length === 2 && !E.isUnary(r) && !r.identifying);
  if (fk) {
    const w6 = clone(base);
    const [x, y] = fk.ends.map((e) => w6.entities.find((z) => z.name === e.entity));
    const key = y.attrs.find((a) => a.kind === 'key');
    if (key && !x.attrs.some((a) => a.name === key.name)) {
      x.attrs.push({ uid: 'fk1', name: key.name, kind: '', parts: '' });
      const r6 = E.check(ex, w6, opts);
      expect(!r6.ok && codes(r6).includes('fkAttr'), `${tag} a foreign key written as an attribute is caught`);
    }
  }
  // Aliases instead of the official names still pass.
  const w7 = clone(base);
  let renamed = 0;
  ref.entities.forEach((e, i) => {
    const alias = ((ex.names || {})[e._key] || []).find((a) => !ref.entities.some((o) => E.nameScore(a, o.id) > 0.7));
    if (alias) { w7.entities[i].name = alias; renamed++; }
  });
  const r7 = E.check(ex, w7, opts);
  expect(r7.ok, `${tag} the official model with ${renamed} entities renamed to aliases passes${r7.ok ? '' : `: ${r7.checks.filter((q) => q.status === 'bad').map((q) => q.text).join(' | ')}`}`);
  // The layout of the student preview: no two entities share a cell, and the diagram draws.
  const laid = E.autoLayout(E.toModel(base));
  const cells = laid.entities.map((e) => e.at.join(','));
  expect(new Set(cells).size === cells.length, `${tag} the preview layout puts each entity in its own cell`);
  let svg = '';
  try { svg = ErDiagram.modelSvg({ ...laid, title: 'x' }) + ErDiagram.modelSvg(ref); } catch (e) { svg = ''; }
  expect(svg.includes('<svg'), `${tag} the official model and the preview draw`);
}));
{
  // The empty model and an unfinished one: form problems, no crash.
  const ex = DATA.en.ER_PRACTICE[0];
  const r = E.check(ex, { entities: [{ uid: 'e1', name: '', weak: false, attrs: [] }], relationships: [], hierarchies: [] }, ctxOf('en', ex));
  expect(!r.ok && codes(r).includes('formEmpty'), 'an empty model asks for an entity');
  const half = { entities: [{ uid: 'e1', name: 'Customer', weak: false, attrs: [] }], relationships: [{ uid: 'r1', name: 'Buys', identifying: false, ends: [{ entity: 'e1', min: '', max: '', role: '' }, { entity: '', min: '', max: '', role: '' }], attrs: [] }], hierarchies: [] };
  const r2 = E.check(ex, half, ctxOf('en', ex));
  expect(!r2.ok && codes(r2).includes('formRelEnds'), 'a relationship with one end is reported');
}
{
  // N-ary relationships: degree and ratio tags, a quaternary round trip, a wrong ternary end, repeated entities.
  const rel = (...cards) => ({ ends: cards.map((card) => ({ card })) });
  expect(ErDiagram.naryRatio(rel('(1,N)', '(0,N)', '(1,1)')) === 'M:N:1', 'naryRatio of (1,N) (0,N) (1,1) is M:N:1');
  expect(ErDiagram.naryRatio(rel('(0,N)', '(0,N)', '(0,N)', '(1,N)')) === 'M:N:P:Q', 'naryRatio of four "many" ends is M:N:P:Q');
  expect(ErDiagram.degreeName(rel('', '', '')) === 'ternary' && ErDiagram.degreeName(rel('', '', '', '')) === 'quaternary', 'degreeName: ternary, quaternary');
  expect(ErDiagram.ratioTag(rel('(1,1)', '(0,N)')) === '1:N' && ErDiagram.ratioTag(rel('(1,1)', '(1,1)', '(0,N)')) === 'ternary · 1:1:M', 'ratioTag of a binary and a ternary');
  const quad = {
    entities: ['A', 'B', 'C', 'D'].map((id, i) => ({ id, at: [i * 2, 0], attrs: [{ name: `${id} id`, kind: 'key' }] })),
    relationships: [{ id: 'Meets', ends: [{ entity: 'A', card: '(0,N)' }, { entity: 'B', card: '(0,N)' }, { entity: 'C', card: '(1,1)' }, { entity: 'D', card: '(0,N)' }], attrs: [] }],
  };
  const qw = E.fromModel(quad);
  const back = E.toModel(qw);
  expect(!E.validate(qw).some((c) => c.status === 'bad'), 'a quaternary relationship is a valid model');
  expect(back.relationships[0].ends.map((x) => `${x.entity}${x.card}`).join() === quad.relationships[0].ends.map((x) => `${x.entity}${x.card}`).join(), 'a quaternary relationship survives fromModel → toModel');
  expect(ErDiagram.modelTextHtml(quad).includes('quaternary · M:N:1:P'), 'the model text tags it "quaternary · M:N:1:P"');
  // The electronics exercise has the ternary Supplies; a "many" at Manufacturer is reported at that end.
  const ex = DATA.en.ER_PRACTICE.find((x) => x.id === 'electronics');
  const c = ctxOf('en', ex);
  const vars = E.variants(ex, c);
  const w = E.fromModel(vars[0].model);
  const ter = w.relationships.find((r) => r.ends.length === 3);
  const man = ter.ends.find((x) => w.entities.find((e) => e.uid === x.entity).name === 'Manufacturer');
  man.max = 'N';
  const r = E.check(ex, w, { ...c, vars });
  const hit = r.checks.find((x) => x.status === 'bad' && x.code === 'wrongMax');
  expect(!r.ok && hit && /Manufacturer/.test(hit.text), `a wrong max at one end of a ternary is reported at that end${hit ? '' : `: ${codes(r).join()}`}`);
  // An entity at two of three ends: the legs are drawn apart and the third end is a plain line.
  const twice = {
    entities: [{ id: 'Person', at: [0, 0], attrs: [] }, { id: 'Court', at: [2, 0], attrs: [] }],
    relationships: [{ id: 'Sues', ends: [{ entity: 'Person', card: '(0,N)', role: 'plaintiff' }, { entity: 'Person', card: '(0,N)', role: 'defendant' }, { entity: 'Court', card: '(1,1)' }] }],
  };
  let svg = '';
  try { svg = ErDiagram.modelSvg(twice); } catch (e) { svg = ''; }
  const lines = [...svg.matchAll(/<line[^>]*x1="([\d.-]+)" y1="([\d.-]+)"/g)].map((m) => `${m[1]},${m[2]}`);
  expect(svg.includes('<svg') && lines.length === 3 && new Set(lines).size === 3, 'a relationship with one entity at two of three ends draws three separate legs');
}

/* ---- 3. ER → Logical ------------------------------------------------------------------------------ */
section('ER → Logical');
const toStudent = (v) => v.tables.map((tb) => ({ name: tb.name, cols: tb.cols.filter((c) => !c.optional).map((c) => ({ name: c.name, pk: !!c.pk, fk: c.fk ? `${c.fk.table}.${c.fk.col}` : '', nn: !!c.nn && !c.pk })) }));
['en', 'es'].forEach((lang) => DATA[lang].LOGICAL_EXERCISES.forEach((ex) => {
  try {
    const vars = LE.variants(ex);
    expect(LE.check(ex, toStudent(vars[0]), vars).ok, `[${lang}:${ex.id}] the derived tables pass their own check`);
    if (ex.expect) {
      const ref = ex.expect.map((tb) => ({ name: tb.name, cols: tb.cols.map((c) => ({ name: c.n, pk: !!c.pk, fk: c.fk || '', nn: !!c.nn })) }));
      const r = LE.check(ex, ref, vars);
      expect(r.ok, `[${lang}:${ex.id}] the course reference matches the derived tables${r.ok ? '' : `: ${r.checks.filter((c) => c.status === 'bad').map((c) => c.text).join(' | ')}`}`);
    }
  } catch (e) { expect(false, `[${lang}:${ex.id}] ${e.message}`); }
}));

/* ---- 4. Translations ------------------------------------------------------------------------------ */
section('Translations');
const holes = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();
const strings = new Set([...Object.values(E.MSG), ...Object.values(E.RANGE), E.READ, E.READ_N, ...Object.values(E.KIND)]);
['js/er-practice.js', 'js/er.js', 'js/er-diagram.js', 'js/er-drawio.js', 'js/concept-section.js'].forEach((f) => {
  const src = readFileSync(join(ROOT, f), 'utf8');
  for (const m of src.matchAll(/\btr?\(\s*'((?:[^'\\]|\\.)*)'/g)) strings.add(m[1].replace(/\\'/g, "'"));
});
['Hands-on exercises', 'Solved activities', 'simple', 'and', 'strong', 'another entity'].forEach((s) => strings.add(s));
strings.forEach((s) => {
  const tr = UI.es[s];
  expect(typeof tr === 'string', `Spanish for “${s.slice(0, 70)}”`);
  if (typeof tr === 'string') expect(holes(tr) === holes(s), `same placeholders in “${s.slice(0, 50)}”`);
});

/* ---- 5. Page -------------------------------------------------------------------------------------- */
if (!process.argv.includes('--no-browser')) {
  section('Page');
  const { chromium } = await import('playwright');
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
  const server = createServer((req, res) => {
    let file = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const candidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
  const executablePath = candidates.find((p) => p && existsSync(p));
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  for (const lang of ['en', 'es']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const problems = [];
    page.on('pageerror', (e) => problems.push(e.message));
    page.on('console', (m) => { if (/\[i18n\]|ER_PRACTICE|LOGICAL_EXERCISES/.test(m.text())) problems.push(m.text()); });
    page.on('dialog', (d) => d.accept());
    await page.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('lang', l); sessionStorage.setItem('seeded', '1'); } }, lang);
    await page.goto(`${base}#/relational/er/practice/1`);
    await page.waitForSelector('.er-practice');
    expect(await page.$('.rail-practice'), `[${lang}] the rail has a Practice hub`);
    for (let n = 1; n <= DATA[lang].ER_PRACTICE.length; n++) {
      await page.goto(`${base}#/relational/er/practice/${n}`);
      await page.waitForSelector('#ex-title');
      await page.click('[data-action="solution"]');
      await page.waitForSelector('#sol-h');
      await page.click('[data-action="use-solution"]');
      await page.click('[data-action="check"]');
      await page.waitForSelector('.feedback');
      expect(await page.$('.feedback.ok'), `[${lang}] exercise ${n}: the official solution, loaded into the builder, checks as correct`);
      await page.click('[data-action="add-ent"]');
      await page.keyboard.type('Zzyzx');
      await page.click('[data-action="check"]');
      await page.waitForSelector('.feedback');
      expect(await page.$('.feedback.bad'), `[${lang}] exercise ${n}: a stray entity is reported`);
    }
    // draw.io: every official model goes out and comes back (plain and compressed) and still checks as correct.
    const trips = await page.evaluate(async () => {
      const pack = async (xml) => {
        const m = xml.match(/<diagram([^>]*)>([\s\S]*)<\/diagram>/);
        const bytes = new TextEncoder().encode(encodeURIComponent(m[2]));
        const z = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
        let bin = '';
        z.forEach((b) => { bin += String.fromCharCode(b); });
        return `<mxfile><diagram${m[1]}>${btoa(bin)}</diagram></mxfile>`;
      };
      const out = [];
      for (const ex of ER_PRACTICE) {
        const ctx = { logical: LOGICAL_EXERCISES, en: DATA.en.ER_PRACTICE.find((x) => x.id === ex.id), logicalEn: DATA.en.LOGICAL_EXERCISES };
        const vars = ErPracticeEngine.variants(ex, ctx);
        const xml = ErDrawio.toXml(vars[0].model, { title: ex.title, statement: ex.statement });
        const a = await ErDrawio.fromXml(xml);
        const r = ErPracticeEngine.check(ex, a.work, { ...ctx, vars });
        const b = await ErDrawio.fromXml(await pack(xml));
        const r2 = ErPracticeEngine.check(ex, b.work, { ...ctx, vars });
        out.push({ id: ex.id, ok: r.ok, ok2: r2.ok, unread: a.unread.map((u) => `${u.label}: ${u.reason}`), why: r.checks.filter((c) => c.status === 'bad').map((c) => c.text).join(' | ') });
      }
      return out;
    });
    trips.forEach((x) => {
      expect(x.ok && !x.unread.length, `[${lang}] ${x.id}: the official model exported to draw.io and imported back checks as correct${x.ok ? '' : `: ${x.why}`}${x.unread.length ? ` (unread: ${x.unread.join('; ')})` : ''}`);
      expect(x.ok2, `[${lang}] ${x.id}: the same, from a compressed .drawio`);
    });
    const hand = await page.evaluate(async (xml) => {
      const ex = ER_PRACTICE.find((x) => x.id === 'banking');
      const ctx = { logical: LOGICAL_EXERCISES, en: DATA.en.ER_PRACTICE.find((x) => x.id === ex.id), logicalEn: DATA.en.LOGICAL_EXERCISES };
      const { work, unread } = await ErDrawio.fromXml(xml);
      const r = ErPracticeEngine.check(ex, work, ctx);
      return { ok: r.ok, ents: work.entities.length, rels: work.relationships.length, unread: unread.map((u) => u.label), why: r.checks.filter((c) => c.status === 'bad').map((c) => c.text).join(' | ') };
    }, readFileSync(join(ROOT, 'tools/fixtures/hand-drawn.drawio'), 'utf8'));
    expect(hand.ents === 4 && hand.rels === 3, `[${lang}] a hand-drawn .drawio is read: ${hand.ents} entities, ${hand.rels} relationships`);
    // The fixture uses English names, so it is compared with the English exercise only.
    expect(lang === 'es' || hand.ok, `[${lang}] the hand-drawn banking model checks as correct${hand.ok ? '' : `: ${hand.why}`}`);
    expect(hand.unread.length === 1 && hand.unread[0] === 'notes', `[${lang}] the stray shape of the hand-drawn file is listed (${hand.unread.join(', ')})`);
    await page.goto(`${base}#/relational/er/practice/10`);
    await page.waitForSelector('#ex-title');
    await page.click('[data-action="solution"]');
    await page.click('[data-action="use-solution"]');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="dl-mine"]')]);
    const mine = readFileSync(await download.path(), 'utf8');
    expect(/<mxfile/.test(mine) && /er-kind="entity"/.test(mine), `[${lang}] "Download my model" gives a .drawio with the student's model`);
    await page.setInputFiles('input[data-f="import"]', { name: 'mine.drawio', mimeType: 'application/xml', buffer: Buffer.from(mine) });
    await page.waitForSelector('#erp-import-note .insight');
    await page.click('[data-action="check"]');
    await page.waitForSelector('.feedback');
    expect(await page.$('.feedback.ok'), `[${lang}] the downloaded model, imported back through the page, checks as correct`);
    await page.goto(`${base}#/relational/er/practice/7`);
    await page.waitForSelector('#ex-title');
    await page.click('[data-action="reset"]');
    await page.fill('[data-f="ent-name"]', lang === 'en' ? 'Customer' : 'Cliente');
    await page.waitForTimeout(500);
    expect(await page.$('#erp-preview svg'), `[${lang}] the preview draws the student's model`);
    // The builder is a canvas: every item has a shape and a row in the list, and the selected one a form.
    const before = await page.$$eval('#erp-preview [data-sel]', (l) => l.length);
    await page.click('[data-action="add-rel"]');
    expect((await page.$$eval('#erp-preview [data-sel]', (l) => l.length)) === before + 1 && await page.$('#erp-insp .erp-rel'), `[${lang}] a relationship is added to the canvas and its form opens`);
    // The list beside the canvas and the canvas share one selection.
    await page.keyboard.press('Escape');   // stops connecting
    await page.keyboard.press('Escape');   // closes the form
    const ent = await page.$eval('#erp-preview [data-kind="entity"]', (g) => g.dataset.sel);
    const rel = await page.$eval('#erp-preview [data-kind="relationship"]', (g) => g.dataset.sel);
    expect(!(await page.$('#erp-insp')), `[${lang}] Escape closes the form`);
    await page.click('#erp-tab-ents');
    await page.click(`.erp-row[data-sel="${ent}"]`);
    expect(await page.$(`#erp-preview [data-sel="${ent}"][aria-expanded="true"]`) && await page.$('#erp-insp [data-f="ent-name"]'), `[${lang}] a row of the list selects its shape and opens its form`);
    await page.click('[data-action="close-insp"]');
    await page.click(`#erp-preview [data-sel="${rel}"]`);
    expect(await page.$('#erp-tab-rels[aria-selected="true"]') && await page.$(`.erp-item.is-open .erp-row[data-sel="${rel}"][aria-expanded="true"]`), `[${lang}] a shape on the canvas marks its row in the list`);
    // "Edit in the list": the form opens under the row, not over the canvas.
    await page.click('[data-action="edit-mode"][data-mode="list"]');
    expect(await page.$(`#erp-form-${rel} .erp-rel`) && !(await page.$('#erp-insp')), `[${lang}] in "Edit in the list" the form opens under its row and nothing floats over the canvas`);
    await page.keyboard.press('Escape');
    expect(!(await page.$(`#erp-form-${rel}`)) && await page.evaluate((r) => document.activeElement && document.activeElement.dataset.sel === r, rel), `[${lang}] Escape closes the form in the list and gives the focus back to its row`);
    // The splitter widens the list by dragging and with the arrows; the width survives a redraw.
    const listW = () => page.$eval('.erp-work', (p) => Math.round(p.getBoundingClientRect().width));
    const w0 = await listW();
    const bar = await page.$eval('.erp-split', (b) => { const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.move(bar.x, bar.y);
    await page.mouse.down();
    await page.mouse.move(bar.x + 120, bar.y, { steps: 4 });
    await page.mouse.up();
    const w1 = await listW();
    await page.focus('.erp-split');
    await page.keyboard.press('ArrowLeft');
    const w2 = await listW();
    await page.click('#erp-tab-ents');
    expect(Math.abs(w1 - w0 - 120) <= 2 && w1 - w2 === 24 && await listW() === w2, `[${lang}] the splitter resizes the list by dragging (${w0} → ${w1}) and with the arrows (${w2}), and keeps it after a redraw`);
    await page.dblclick('.erp-split');
    expect(await listW() === w0, `[${lang}] a double click on the splitter resets the list's width`);
    // + zooms in from the canvas; the legend lists the shortcuts.
    const zoomOf = () => page.$eval('#erp-preview .erp-stage', (s) => +(/scale\(([\d.]+)\)/.exec(s.style.transform) || [0, 0])[1]);
    const z0 = await zoomOf();
    await page.focus(`#erp-preview [data-sel="${rel}"]`);
    await page.keyboard.press('+');
    expect(await zoomOf() > z0 && (await page.$$('.erp-keys li')).length >= 8, `[${lang}] + zooms the canvas in, and the shortcuts are listed under it`);
    await page.click('[data-action="edit-mode"][data-mode="diagram"]');
    // Delete removes the focused shape; Ctrl+Z puts it back.
    await page.focus(`#erp-preview [data-sel="${ent}"]`);
    await page.keyboard.press('Delete');
    const gone = !(await page.$(`#erp-preview [data-sel="${ent}"]`));
    await page.keyboard.press('Control+z');
    const back = await page.$eval(`#erp-preview [data-sel="${ent}"]`, (g) => g.getAttribute('aria-label')).catch(() => '');
    expect(gone && back.includes(lang === 'en' ? 'Customer' : 'Cliente'), `[${lang}] Delete removes an entity and Ctrl+Z restores it`);
    await page.keyboard.press('Control+Shift+z');
    expect(!(await page.$(`#erp-preview [data-sel="${ent}"]`)), `[${lang}] Ctrl+Shift+Z redoes the removal`);
    expect(await page.$('.erp-draw-link a[href="#/relational/er/practice/draw"]'), `[${lang}] the exercise links to the blank diagram`);
    // The blank diagram: the builder with no statement and nothing to check; the work is kept.
    await page.goto(`${base}#/relational/er/practice/draw`);
    await page.waitForSelector('#ex-title');
    expect(!(await page.$('.statement')) && !(await page.$('[data-action="check"]')) && !(await page.$('[data-action="solution"]')) && await page.$('#erp-preview svg'), `[${lang}] the blank diagram has the builder, no statement and no Check`);
    expect(await page.$('.rail-practice a[href="#/relational/er/practice/draw"][aria-current="page"]'), `[${lang}] the rail marks the blank diagram`);
    await page.fill('[data-f="draw-title"]', 'Shop');
    await page.fill('[data-f="ent-name"]', 'Supplier');
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForSelector('#ex-title');
    expect((await page.$eval('[data-f="draw-title"]', (i) => i.value)) === 'Shop' && (await page.$$eval('.erp-row', (l) => l.map((r) => r.textContent).join(' '))).includes('Supplier'), `[${lang}] the blank diagram keeps its title and a typed entity after a reload`);
    const [drawDl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="dl-mine"]')]);
    const drawXml = readFileSync(await drawDl.path(), 'utf8');
    const drawRead = await page.evaluate(async (xml) => { const { work } = await ErDrawio.fromXml(xml); return work.entities.map((e) => e.name); }, drawXml);
    expect(drawDl.suggestedFilename() === 'shop.drawio' && drawRead.join() === 'Supplier' && !/er-kind="statement"/.test(drawXml), `[${lang}] its .drawio download reads back with the import reader (${drawRead.join()})`);
    const [svgDl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="dl-svg"]')]);
    const svgText = readFileSync(await svgDl.path(), 'utf8');
    expect(/^<\?xml[\s\S]*<svg xmlns=/.test(svgText) && /\.er-ent\s*\{[^}]*fill:\s*rgb|\.er-ent\s*\{[^}]*fill:\s*#/i.test(svgText) && svgText.includes('Supplier') && !/aria-expanded|tabindex|data-sel/.test(svgText), `[${lang}] its image download is a standalone SVG with the diagram styles`);
    await page.goto(`${base}#/relational/er/cardinality`);
    await page.waitForSelector('.concept-practice');
    expect(await page.$('.concept-practice a[href^="#/relational/er/practice/"]'), `[${lang}] the cardinality card links to an exercise`);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`${base}#/relational/er/practice/15`);
    await page.waitForSelector('#ex-title');
    await page.click('[data-action="solution"]');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow <= 1, `[${lang}] no horizontal page scroll on a phone (${overflow}px)`);
    await page.click('[data-action="edit-mode"][data-mode="list"]');
    await page.click('#erp-preview [data-kind="relationship"]');
    const overflowList = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflowList <= 1 && await page.$('.erp-inline .erp-rel'), `[${lang}] no horizontal page scroll on a phone with a form open in the list (${overflowList}px)`);
    await page.click('[data-action="edit-mode"][data-mode="diagram"]');
    await page.goto(`${base}#/relational/er/practice/draw`);
    await page.waitForSelector('#ex-title');
    const overflowDraw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflowDraw <= 1, `[${lang}] no horizontal page scroll on the blank diagram on a phone (${overflowDraw}px)`);
    await page.waitForTimeout(3500);   // the author self-tests run when the page is idle
    expect(problems.length === 0, `[${lang}] no page errors, missing translations or author warnings${problems.length ? `: ${problems.slice(0, 5).join(' | ')}` : ''}`);
    await page.close();
  }
  await browser.close();
  server.close();
}

console.log(bad ? `\n${bad} check(s) failed` : '\nAll ER practice checks passed');
process.exit(bad ? 1 : 0);
