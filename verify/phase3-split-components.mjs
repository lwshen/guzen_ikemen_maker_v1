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

const L = n => lines[n - 1]; // 1-indexed accessor

// [name, startLine, endLine, startAnchor, endAnchor] — inclusive verbatim ranges
const COMPONENTS = [
  ['Hero', 133, 156, '    <header class="hero">', '    </header>'],
  ['TabsNav', 158, 163, '    <nav class="tabs">', '    </nav>'],
  ['InitialPanel', 165, 251, '    <section class="panel" id="initialPanel"', '    </section>'],
  ['SlotTab', 253, 276, '    <main class="grid cols">', '    </main>'],
  ['ResultTab', 278, 408, '    <section id="tab-result"', '    </section>'],
  ['HistoryTab', 410, 417, '    <section id="tab-history"', '    </section>'],
  ['SettingsTab', 419, 423, '    <section id="tab-settings"', '    </section>'],
];

// anchor assertions: refuse to cut if the layout shifted
const fail = msg => { console.error(`anchor mismatch: ${msg}`); process.exit(1); };
if (L(132) !== '  <div class="wrap">') fail('line 132 is not the .wrap opener');
if (!L(425).startsWith('    <p class="footer">')) fail('line 425 is not the footer');
if (L(426) !== '  </div>') fail('line 426 is not the .wrap closer');
for (const [name, a, b, sa, ea] of COMPONENTS) {
  if (!L(a).startsWith(sa)) fail(`${name} start ${a}: ${L(a).slice(0, 60)}`);
  if (L(b) !== ea) fail(`${name} end ${b}: ${L(b).slice(0, 60)}`);
  if (L(b + 1) !== '') fail(`${name}: line ${b + 1} after end is not blank`);
}

const compDir = path.join(ROOT, 'src', 'components');
fs.rmSync(compDir, { recursive: true, force: true });
fs.mkdirSync(compDir, { recursive: true });
for (const [name, a, b] of COMPONENTS) {
  // verbatim range + trailing newline (becomes part of the rendered output)
  fs.writeFileSync(path.join(compDir, `${name}.astro`), lines.slice(a - 1, b).join('\n') + '\n');
}

const frontmatter = [
  '---',
  ...COMPONENTS.map(([name]) => `import ${name} from '../components/${name}.astro';`),
  '---',
];
const page = [
  ...frontmatter,
  ...lines.slice(0, 132),                       // doctype … `  <div class="wrap">`
  ...COMPONENTS.flatMap(([name]) => [`    <${name} />`, '']), // page-side indent + blank line
  ...lines.slice(424),                          // footer line 425 … EOF
].join('\n');
fs.writeFileSync(pagePath, page);

console.log(`split into ${COMPONENTS.length} components:`);
for (const [name, a, b] of COMPONENTS) console.log(`  src/components/${name}.astro  (lines ${a}-${b}, ${b - a + 1} lines)`);
console.log(`index.astro: ${lines.length} -> ${page.split('\n').length} lines`);
