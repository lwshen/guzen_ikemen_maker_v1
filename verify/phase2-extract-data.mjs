// Phase 2 migration script: split pure-literal data constants out of the
// monolithic public/app.js (produced by verify/phase1-extract.py) into grouped
// classic scripts under public/data/, loaded before app.js via GUZEN_DATA.
//
// Design constraints (see MIGRATION_VERIFICATION.md risks #1/#5/#8):
// - stays classic-script / sloppy-mode: NO ES modules, NO strict mode
// - only mechanically-proven pure data moves: the initializer must evaluate in
//   an empty vm sandbox and contain no functions; everything else stays put
// - app.js logic (incl. the hoisting-order-dependent duplicate function
//   declarations) is never reordered — only const declarations are removed and
//   one destructuring line is inserted at the top of the IIFE
//
// Pipeline: python3 verify/phase1-extract.py && node verify/phase2-extract-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIN_LITERAL_LEN = 40;

// --- string/template/comment-aware scanner -------------------------------
// Returns index just past the initializer's terminating `;` (or null if the
// statement is a multi-declarator / unterminated — caller must skip it).
export function sliceInitializer(src, start) {
  let i = start;
  const stack = []; // '(', '[', '{', '`' (template), 'T' (${ inside template)
  while (i < src.length) {
    const c = src[i], next = src[i + 1];
    const inTemplate = stack[stack.length - 1] === '`';
    if (inTemplate) {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { stack.pop(); i++; continue; }
      if (c === '$' && next === '{') { stack.push('T'); i += 2; continue; }
      i++; continue;
    }
    if (c === "'" || c === '"') { // plain string
      i++;
      while (i < src.length && src[i] !== c) i += src[i] === '\\' ? 2 : 1;
      i++; continue;
    }
    if (c === '`') { stack.push('`'); i++; continue; }
    if (c === '/' && next === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && next === '*') { i = src.indexOf('*/', i + 2) + 2; if (i < 2) return null; continue; }
    if (c === '(' || c === '[' || c === '{') { stack.push(c); i++; continue; }
    if (c === ')' || c === ']' || c === '}') {
      const open = stack.pop();
      if (c === '}' && open === 'T') { i++; continue; }
      const pair = { ')': '(', ']': '[', '}': '{' };
      if (open !== pair[c]) return null;
      i++; continue;
    }
    if (stack.length === 0) {
      if (c === ';') return i + 1;
      if (c === ',') return null; // multi-declarator statement — skip
    }
    i++;
  }
  return null;
}

export function parseTopLevelConsts(src) {
  const found = [];
  const re = /^ {2}const ([A-Za-z_$][\w$]*)\s*=\s*/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const initStart = m.index + m[0].length;
    const end = sliceInitializer(src, initStart);
    if (end === null) continue;
    found.push({
      name: m[1],
      declStart: m.index,
      initStart,
      end, // just past `;`
      init: src.slice(initStart, end - 1),
      line: src.slice(0, m.index).split('\n').length,
    });
  }
  return found;
}

function hasFunction(v, seen = new Set()) {
  if (typeof v === 'function') return true;
  if (v === null || typeof v !== 'object' || seen.has(v)) return false;
  seen.add(v);
  return Object.values(v).some(x => hasFunction(x, seen));
}

export function classify(consts) {
  const extracted = [], skipped = [];
  for (const c of consts) {
    if (c.init.length < MIN_LITERAL_LEN) { skipped.push({ name: c.name, reason: 'tiny literal / config' }); continue; }
    let value;
    try {
      value = vm.runInNewContext(`(${c.init})`, {}, { timeout: 2000 });
    } catch (e) {
      skipped.push({ name: c.name, reason: `not a pure literal (${e.constructor.name})` });
      continue;
    }
    if (hasFunction(value)) { skipped.push({ name: c.name, reason: 'contains function(s)' }); continue; }
    extracted.push(c);
  }
  return { extracted, skipped };
}

// --- grouping rules (first match wins; cosmetic only) ---------------------
const GROUPS = [
  [/^(NAMES_BY_YEAR|NATION_NAMES)$/, 'data-names.js'],
  [/^(OCCUPATIONS$|OCC_|UNIFORM_|VIBE_|ATHLETIC_OCC|SUIT_TYPES|SCHOOL_TYPES|STRICT_HAIR_OCC|FREE_HAIR_OCC|BRAND_SINCE)/, 'data-occupations.js'],
  [/^(uiText|valueTranslations|sceneTranslations|slotLabelMap|fixedFieldLabelMap|captionFieldLabelMap|cardFieldLabelMap|uiCardTitles|UNDERWEAR_COLOR_EN|C_MEASUREMENT_EN)/, 'data-i18n.js'],
  [/^(SPORTS$|SPORT_|TRAINING_|BODY_|POSTURE|C_MEASUREMENT_VALUES|CULT_MEM)/, 'data-body-sports.js'],
  [/^(INNER_|MBTI_INTRO|ERA_HOOK|BRIDGE_HOOK|TRAIN_HOOK)/, 'data-inner.js'],
  [/^(FOOT_|SOLE_|TOE_|POSTER_FOOT)/, 'data-foot.js'],
];
const FALLBACK = 'data-core.js';
const fileFor = name => (GROUPS.find(([re]) => re.test(name)) || [null, FALLBACK])[1];

// --- main ------------------------------------------------------------------
function main() {
  const appPath = path.join(ROOT, 'public', 'app.js');
  const src = fs.readFileSync(appPath, 'utf-8');
  if (src.includes('window.GUZEN_DATA')) {
    console.error('app.js already transformed — run verify/phase1-extract.py first to regenerate the monolith.');
    process.exit(1);
  }
  const consts = parseTopLevelConsts(src);
  const { extracted, skipped } = classify(consts);

  // data files, constants in original source order
  const byFile = new Map();
  for (const c of extracted) {
    const f = fileFor(c.name);
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f).push(c);
  }
  const dataDir = path.join(ROOT, 'public', 'data');
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.mkdirSync(dataDir, { recursive: true });
  const fileNames = [...byFile.keys()].sort();
  for (const f of fileNames) {
    const parts = [
      `// Generated by verify/phase2-extract-data.mjs — pure data tables extracted`,
      `// verbatim from index.html. Safe to edit; run \`npm run verify\` afterwards`,
      `// (layer 5 compares against the original baseline and will flag any edit —`,
      `// that is expected once you change data intentionally).`,
      `window.GUZEN_DATA = window.GUZEN_DATA || {};`,
      '',
    ];
    for (const c of byFile.get(f)) {
      parts.push(`// index.html:${c.line + 428}`);
      parts.push(`GUZEN_DATA.${c.name} = ${c.init};`);
      parts.push('');
    }
    fs.writeFileSync(path.join(dataDir, f), parts.join('\n'));
  }

  // rewrite app.js: strip extracted declarations (back to front), inject destructure
  let out = src;
  for (const c of [...extracted].sort((a, b) => b.declStart - a.declStart)) {
    const lineStart = out.lastIndexOf('\n', c.declStart) + 1;
    let end = c.end;
    const restOfLine = out.slice(end, out.indexOf('\n', end) === -1 ? out.length : out.indexOf('\n', end));
    if (restOfLine.trim() === '') end = out.indexOf('\n', end) + 1 || out.length; // drop the emptied line
    out = out.slice(0, lineStart) + out.slice(end);
  }
  const names = extracted.map(c => c.name);
  const destructure = [];
  for (let i = 0; i < names.length; i += 8) destructure.push('    ' + names.slice(i, i + 8).join(', ') + ',');
  const header = [
    '  // Phase 2: pure data tables live in /data/*.js (loaded before this file),',
    '  // exposed via window.GUZEN_DATA. Extraction is mechanical and verified —',
    '  // see verify/phase2-extract-data.mjs and verify/layer5-data-equal.mjs.',
    '  const {',
    ...destructure,
    '  } = window.GUZEN_DATA;',
  ].join('\n');
  out = out.replace(/^\(function\(\)\{\n/, `(function(){\n${header}\n`);
  if (!out.includes('window.GUZEN_DATA')) throw new Error('failed to inject destructure header');
  fs.writeFileSync(appPath, out);

  // patch the Astro page: data scripts (any order) before app.js
  const astroPath = path.join(ROOT, 'src', 'pages', 'index.astro');
  const astro = fs.readFileSync(astroPath, 'utf-8');
  const tags = fileNames.map(f => `<script is:inline src="/data/${f}"></script>`).join('\n');
  const patched = astro.replace('<script is:inline src="/app.js"></script>', `${tags}\n<script is:inline src="/app.js"></script>`);
  if (patched === astro) throw new Error('could not find app.js script tag in index.astro');
  fs.writeFileSync(astroPath, patched);

  // manifest for layer 1 / layer 5
  const manifest = {
    extracted: extracted.map(c => ({ name: c.name, file: fileFor(c.name), indexHtmlLine: c.line + 428 })),
    skipped: skipped,
    dataFiles: fileNames,
  };
  fs.writeFileSync(path.join(ROOT, 'verify', 'data-manifest.json'), JSON.stringify(manifest, null, 1));

  console.log(`extracted ${extracted.length} constants into ${fileNames.length} files:`);
  for (const f of fileNames) console.log(`  ${f}: ${byFile.get(f).length} constants, ${fs.statSync(path.join(dataDir, f)).size} bytes`);
  console.log(`kept in app.js: ${skipped.length}`);
  for (const s of skipped) console.log(`  - ${s.name}: ${s.reason}`);
  console.log(`app.js: ${src.length} -> ${out.length} bytes`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
