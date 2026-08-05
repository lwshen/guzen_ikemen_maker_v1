// Layer 5: per-constant deep-equal — every data constant, as ACTUALLY exported
// by src/data (imported and evaluated), must equal the literal in the frozen
// index.html baseline. Key-order-sensitive: Object.keys iteration order feeds
// option lists and weighted picks, so reordered keys are a real behavioral
// change. See MIGRATION_VERIFICATION.md sections 1 and 4.
//
// NOTE (by design): once data is edited intentionally post-Phase 4, this layer
// reports the drift vs the frozen baseline — update/retire it at that point.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { parseTopLevelConsts } from './archive/phase2-extract-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'verify', 'data-manifest.json'), 'utf-8'));

// original literals from the frozen baseline (region located by marker lines)
const orig = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
const origLines = orig.split('\n');
const region = origLines.slice(origLines.indexOf('<script>') + 1, origLines.indexOf('</script>')).join('\n');
const origConsts = new Map(parseTopLevelConsts(region).map(c => [c.name, c.init]));

// what actually ships: evaluate the real modules
const data = await import(pathToFileURL(path.join(ROOT, 'src', 'data', 'index.js')));

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || typeof a !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return false; // key ORDER matters
  return ka.every(k => deepEqual(a[k], b[k]));
}

let fails = 0;
for (const { name } of manifest.extracted) {
  const literal = origConsts.get(name);
  if (literal === undefined) { console.log(`FAIL ${name}: not found in frozen baseline`); fails++; continue; }
  const expected = vm.runInNewContext(`(${literal})`, {}, { timeout: 5000 });
  if (!deepEqual(expected, data[name])) { console.log(`FAIL ${name}: deep-equal mismatch vs baseline`); fails++; }
}
const extraKeys = Object.keys(data).filter(k => !manifest.extracted.some(e => e.name === k));
if (extraKeys.length) { console.log(`FAIL unexpected src/data exports: ${extraKeys}`); fails++; }

console.log(`\n${manifest.extracted.length} constants checked, ${fails} failures`);
console.log(fails ? 'RESULT: FAIL' : 'RESULT: ALL PASS');
process.exit(fails ? 1 : 0);
