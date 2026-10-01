// Writes WebVTT captions for the site's <video> from src/narration.json.
// Scene offsets come from the DURATIONS/HOLDS in src/timeline.ts (parsed, not imported, so no TS build is needed).
// Usage: node scripts/vtt.mjs [out.vtt]   (default ../assets/video/normalization.en.vtt)
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, process.argv[2] ?? '../assets/video/normalization.en.vtt');

const timeline = readFileSync(resolve(root, 'src/timeline.ts'), 'utf8');
const block = (name) => {
  const m = timeline.match(new RegExp(`const ${name}[^=]*=\\s*\\{([^}]*)\\}`));
  return m ? m[1] : '';
};
const pairs = (src) => [...src.matchAll(/(\w+):\s*(?:s\()?([\d.]+)\)?/g)].map(([, k, v]) => [k, Number(v)]);
const holds = Object.fromEntries(pairs(block('HOLDS')));
let from = 0;
const sceneStart = {};
for (const [id, sec] of pairs(block('DURATIONS'))) {
  sceneStart[id] = from;
  from += sec + (holds[id] ?? 0);
}

const stamp = (t) => {
  const ms = Math.round(t * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}.${p(ms % 1000, 3)}`;
};

const {segments} = JSON.parse(readFileSync(resolve(root, 'src/narration.json'), 'utf8'));
const cues = segments.map((seg, i) => {
  if (!(seg.scene in sceneStart)) throw new Error(`Unknown scene "${seg.scene}" in ${seg.id}`);
  const start = sceneStart[seg.scene] + seg.startSec;
  return `${i + 1}\n${stamp(start)} --> ${stamp(start + seg.durationSec)}\n${seg.text}`;
});
writeFileSync(out, `WEBVTT\n\n${cues.join('\n\n')}\n`);
console.log(`Wrote ${cues.length} cues to ${out} (video length ${from}s)`);
