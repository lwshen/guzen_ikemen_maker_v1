// Layer 5: per-constant deep-equal — every extracted data constant, as loaded
// from public/data/*.js, must equal the literal in the ORIGINAL index.html.
// Comparison is key-order-sensitive: Object.keys iteration order feeds option
// lists and weighted picks, so reordered keys are a real behavioral change.
// Run after verify/phase2-extract-data.mjs. See MIGRATION_VERIFICATION.md.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT, parseTopLevelConsts } from './phase2-extract-data.mjs';

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'verify', 'data-manifest.json'), 'utf-8'));

// original literals: same parser over the script region of index.html
// (region located by marker lines, same shape contract as phase1-extract.py)
const orig = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
const origLines = orig.split('\n');
const region = origLines.slice(origLines.indexOf('<script>') + 1, origLines.indexOf('</script>')).join('\n');
const origConsts = new Map(parseTopLevelConsts(region).map(c => [c.name, c.init]));

// load the shipped data files into one sandbox (window === global, classic-script style)
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of manifest.dataFiles) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public', 'data', f), 'utf-8'), sandbox, { filename: f });
}

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
  if (literal === undefined) { console.log(`FAIL ${name}: not found in original index.html`); fails++; continue; }
  const expected = vm.runInNewContext(`(${literal})`, {}, { timeout: 5000 });
  const actual = sandbox.GUZEN_DATA?.[name];
  if (!deepEqual(expected, actual)) { console.log(`FAIL ${name}: deep-equal mismatch vs original`); fails++; }
}
const extraKeys = Object.keys(sandbox.GUZEN_DATA ?? {}).filter(k => !manifest.extracted.some(e => e.name === k));
if (extraKeys.length) { console.log(`FAIL unexpected GUZEN_DATA keys: ${extraKeys}`); fails++; }

console.log(`\n${manifest.extracted.length} constants checked, ${fails} failures`);
console.log(fails ? 'RESULT: FAIL' : 'RESULT: ALL PASS');
process.exit(fails ? 1 : 0);
