// Deno only: loads sql.js (WASM) and the synced game modules, and hands them to engine.js.
// oracle-dialect.js and game-core.js are byte-for-byte copies of js/ (tools/supabase-sync.mjs); loaded as ES
// modules they publish OracleDialect and GameCore on globalThis.
import initSqlJs from 'npm:sql.js@1.14.2';
import './oracle-dialect.js';
import './game-core.js';
import { makeEngine } from './engine.js';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/sql.js@1.14.2/dist/sql-wasm.wasm';

async function wasmBytes() {
  // Shipped with the function as a static file (supabase/config.toml [functions.comp] static_files).
  for (const where of [new URL('./sql-wasm.wasm', import.meta.url), './_shared/sql-wasm.wasm', './functions/_shared/sql-wasm.wasm']) {
    try { return { bytes: await Deno.readFile(where), from: String(where) }; } catch (_e) { /* try the next */ }
  }
  const r = await fetch(WASM_CDN);
  if (!r.ok) throw new Error(`sql-wasm.wasm: HTTP ${r.status} from ${WASM_CDN}`);
  return { bytes: new Uint8Array(await r.arrayBuffer()), from: WASM_CDN };
}

let SQL = null;
let wasmFrom = null;
export async function loadSql() {
  if (!SQL) {
    const w = await wasmBytes();
    wasmFrom = w.from;
    SQL = await initSqlJs({ wasmBinary: w.bytes });
  }
  return SQL;
}
export const wasmSource = () => wasmFrom;

export async function loadEngine(schema) {
  // deno-lint-ignore no-explicit-any
  const g = globalThis;
  return makeEngine({ SQL: await loadSql(), O: g.OracleDialect, G: g.GameCore, schema });
}
