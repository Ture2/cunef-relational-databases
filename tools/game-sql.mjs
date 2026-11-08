// The game's SQL engine in Node, the same as the browser's (js/sql-runner.js): sql.js from tools/node_modules,
// OracleDialect for the translation, its functions registered, foreign keys on and LIKE case-sensitive (Oracle's).
// Shared by tools/check-game-bank.mjs and any other game test.
//
//   import { loadGame } from './game-sql.mjs';
//   const { O, G, BANK, SQL, build, execute, executeChecks, reversedSetup } = await loadGame();
//
//   build(setup)                       a sql.js database with `setup` run (as SqlRunner's freshDb)
//   execute(db, text)                  { cols, rows } of the last statement, or { error: {code?, text}, raw }
//   executeChecks(setup, text, checks) { error?, changes, results } on a fresh copy, after GameCore.oracleCheck (as judge)
//   reversedSetup(setup)               the setup with each table's INSERTs in reverse order (ties, order bugs)
//   BANK                               GAME_BANK with the four mode files appended (data/game-bank-*.js)
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const require = createRequire(import.meta.url);
export const MODE_FILES = ['insert', 'update', 'delete', 'ddl'];

export async function loadGame() {
  const O = require(join(ROOT, 'js/oracle-dialect.js'));
  const G = require(join(ROOT, 'js/game-core.js'));
  const BANK = require(join(ROOT, 'data/game-bank.js'));
  MODE_FILES.forEach((m) => require(join(ROOT, `data/game-bank-${m}.js`)));   // each appends to BANK.questions
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs({ locateFile: (f) => join(HERE, 'node_modules/sql.js/dist', f) });

  const connect = (db) => {
    Object.entries(O.functions).forEach(([name, fn]) => db.create_function(name, fn));
    db.run('PRAGMA foreign_keys = ON;');
    db.run('PRAGMA case_sensitive_like = ON;');
    return db;
  };
  const images = new Map();
  function build(setup) {
    if (!images.has(setup)) {
      const d = connect(new SQL.Database());
      try {
        O.script(setup, { finish: true }).forEach((u) => u.sqls.forEach((q) => d.run(q)));
        images.set(setup, d.export());
      } finally { d.close(); }
    }
    return connect(new SQL.Database(images.get(setup)));
  }
  function execute(db, text) {
    try {
      let res = null;
      for (const u of O.script(text)) {
        if (u.unsupported) return { error: { text: `unsupported: ${u.unsupported}` }, raw: 'unsupported' };
        let r = [];
        u.sqls.forEach((q) => { r = db.exec(q); });
        if (u.sqls.length) res = r.length ? r[0] : null;
      }
      return { cols: res ? res.columns : [], rows: res ? res.values : [] };
    } catch (e) {
      const ora = O.oraError(e.message, text, db);
      return { error: ora ? { code: ora.code, text: ora.text } : { text: e.message }, raw: e.message };
    }
  }
  // As the page grades a DML or DDL answer (js/game.js judge): what Oracle would refuse (GameCore.oracleCheck) is
  // the answer's error; { oracle: false } skips that, to see what SQLite alone does.
  function executeChecks(setup, text, checks, { oracle = true } = {}) {
    const ora = oracle && text ? G.oracleCheck(text, BANK.schema) : null;
    if (ora) return { error: { code: ora.code, text: ora.text, column: ora.column || null, quoted: !!ora.quoted }, changes: 0, results: [] };
    const db = build(setup);
    try { return O.runChecks(db, text, checks || []); } finally { db.close(); }
  }
  function reversedSetup(setup) {
    const lines = setup.split('\n');
    const head = lines.filter((l) => !/^INSERT INTO/.test(l));
    const byTable = {};
    lines.filter((l) => /^INSERT INTO/.test(l)).forEach((l) => { const tb = /^INSERT INTO (\w+)/.exec(l)[1]; (byTable[tb] = byTable[tb] || []).push(l); });
    return [...head, ...Object.values(byTable).flatMap((ls) => [...ls].reverse())].join('\n');
  }
  return { O, G, BANK, SQL, ROOT, build, execute, executeChecks, reversedSetup };
}
