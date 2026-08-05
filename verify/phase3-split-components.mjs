// Phase 3 migration script: split the monolithic src/pages/index.astro
// (phase-2 output) into verbatim Astro components under src/components/.
//
// Fidelity contract: the built dist/index.html must stay BYTE-IDENTICAL to the
// phase-2 build. Astro trims a component template's leading and trailing
// whitespace-only text (first-line indent, trailing newline), so the page
// supplies both: invocations are indented `    <X />` and separated by blank
// lines, reproducing the original inter-region blank lines and indentation.
// Verified by layer 1's "body region verbatim" check.
//
// Regions are located by anchor lines, not hardcoded numbers. A coverage
// assertion requires the components to tile the .wrap interior exactly
// (blank-line-separated, nothing in between) — if upstream adds a new
// top-level region, this script fails loudly instead of dropping content.
//
// Pipeline:
//   python3 verify/phase1-extract.py && node verify/phase2-extract-data.mjs
//     && node verify/phase3-split-components.mjs && npm run build && npm run verify
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagePath = path.join(ROOT, 'src', 'pages', 'index.astro');
const src = fs.readFileSync(pagePath, 'utf-8');
const lines = src.split('\n');

if (src.startsWith('---')) {
  console.error('index.astro already componentized — re-run the pipeline from phase 1 to regenerate.');
  process.exit(1);
}
if (!src.includes('<script is:inline src="/data/')) {
  console.error('index.astro has no data script tags — run verify/phase2-extract-data.mjs first.');
  process.exit(1);
}

const fail = msg => { console.error(`anchor mismatch: ${msg}`); process.exit(1); };
const findLine = (pred, from, desc) => {
  const i = lines.findIndex((l, idx) => idx >= from && pred(l));
  if (i === -1) fail(`${desc} not found`);
  return i;
};

// [name, startAnchorPrefix, endAnchorExact] — regions located in document order
const SPECS = [
  ['Hero', '    <header class="hero">', '    </header>'],
  ['TabsNav', '    <nav class="tabs">', '    </nav>'],
  ['InitialPanel', '    <section class="panel" id="initialPanel"', '    </section>'],
  ['SlotTab', '    <main class="grid cols">', '    </main>'],
  ['ResultTab', '    <section id="tab-result"', '    </section>'],
  ['HistoryTab', '    <section id="tab-history"', '    </section>'],
  ['SettingsTab', '    <section id="tab-settings"', '    </section>'],
];

const wrapOpen = findLine(l => l === '  <div class="wrap">', 0, '.wrap opener');
const components = []; // {name, a, b} 0-indexed inclusive
let cursor = wrapOpen + 1;
for (const [name, startPrefix, endExact] of SPECS) {
  const a = findLine(l => l.startsWith(startPrefix), cursor, `${name} start`);
  const b = findLine(l => l === endExact, a, `${name} end`);
  components.push({ name, a, b });
  cursor = b + 1;
}

// coverage: components tile the .wrap interior, separated by single blank lines
if (components[0].a !== wrapOpen + 1) fail('content before the first component');
for (let i = 1; i < components.length; i++) {
  const prev = components[i - 1], cur = components[i];
  if (cur.a !== prev.b + 2 || lines[prev.b + 1] !== '')
    fail(`unexpected content between ${prev.name} and ${cur.name} (lines ${prev.b + 2}-${cur.a})`);
}
const last = components[components.length - 1];
const footer = last.b + 2;
if (lines[last.b + 1] !== '') fail('missing blank line before footer');
if (!lines[footer].startsWith('    <p class="footer">')) fail(`footer expected at line ${footer + 1}`);
if (lines[footer + 1] !== '  </div>') fail('.wrap closer expected right after footer');

const compDir = path.join(ROOT, 'src', 'components');
fs.rmSync(compDir, { recursive: true, force: true });
fs.mkdirSync(compDir, { recursive: true });
for (const { name, a, b } of components) {
  // verbatim range + trailing newline (becomes part of the rendered output)
  fs.writeFileSync(path.join(compDir, `${name}.astro`), lines.slice(a, b + 1).join('\n') + '\n');
}

const page = [
  '---',
  ...components.map(({ name }) => `import ${name} from '../components/${name}.astro';`),
  '---',
  ...lines.slice(0, wrapOpen + 1),                          // doctype … `  <div class="wrap">`
  ...components.flatMap(({ name }) => [`    <${name} />`, '']), // page-side indent + blank line
  ...lines.slice(footer),                                   // footer … EOF
].join('\n');
fs.writeFileSync(pagePath, page);

console.log(`split into ${components.length} components:`);
for (const { name, a, b } of components)
  console.log(`  src/components/${name}.astro  (lines ${a + 1}-${b + 1}, ${b - a + 1} lines)`);
console.log(`index.astro: ${lines.length} -> ${page.split('\n').length} lines`);
