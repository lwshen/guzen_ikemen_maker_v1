// Layer 2 supplement: OPTION SWEEP — walk every select option / checkbox /
// derived-type button and byte-compare the resulting prompts+profile between
// the frozen index.html baseline and the Astro build. Closes the coverage gap
// where the main suite runs mostly under default settings.
//
// Runtime is dominated by re-spins (~600 per side); expect ~5-10 minutes.
// Selects with more than SAMPLE_CAP options are sampled evenly (logged);
// pass --full to sweep every option of every select.
// Usage: node verify/layer2-options-sweep.mjs [--full] [--only <substr>]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FULL = process.argv.includes('--full');
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const SAMPLE_CAP = 36;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
function serve(rootDir) {
  const server = http.createServer((req, res) => {
    const file = path.join(rootDir, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () =>
    resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() })));
}

const FIXED_TIME = 1754269200000;
const initScript = seed => `(() => {
  let s = ${seed} >>> 0;
  Math.random = function() {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const OrigDate = Date;
  class FakeDate extends OrigDate {
    constructor(...a) { a.length === 0 ? super(${FIXED_TIME}) : super(...a); }
    static now() { return ${FIXED_TIME}; }
  }
  FakeDate.parse = OrigDate.parse; FakeDate.UTC = OrigDate.UTC;
  globalThis.Date = FakeDate;
})();`;

const PROMPT_IDS = ['promptBox', 'outfitPromptBox', 'outfitHolidayPromptBox', 'scenePromptBox',
  'friendPairPromptBox', 'derivedPromptBox', 'groupPromptBox'];

// ---------- unit builders (inventory read once from the baseline) ----------
async function readInventory(browser, baseURL) {
  const page = await browser.newPage();
  await page.addInitScript(initScript(1));
  await page.goto(baseURL, { waitUntil: 'load' });
  await page.check('#instantMode');
  await page.click('#startBtn');
  await page.waitForFunction(() => document.getElementById('promptBox').value !== '');
  const inv = await page.evaluate(() => ({
    selects: [...document.querySelectorAll('select')].map(s => ({
      id: s.id || null, fixed: s.dataset.fixed || null,
      where: s.closest('#initialPanel') ? 'initial' : s.closest('#tab-settings') ? 'fixed'
        : s.closest('#tab-result') ? 'manual' : 'hero',
      values: [...s.options].map(o => o.value),
    })),
    checks: [...document.querySelectorAll('input[type="checkbox"]')]
      .filter(c => c.id !== 'instantMode')
      .map((c, i) => ({ idx: i, scope: c.closest('[data-ui-card]')?.dataset.uiCard || 'other' })),
    dtypes: [...document.querySelectorAll('#derivedTypeGrid [data-dtype]')].map(b => b.dataset.dtype),
  }));
  await page.close();
  return inv;
}

function sample(values) {
  if (FULL || values.length <= SAMPLE_CAP) return values;
  const out = [];
  for (let i = 0; i < SAMPLE_CAP; i++) out.push(values[Math.round(i * (values.length - 1) / (SAMPLE_CAP - 1))]);
  return [...new Set(out)];
}

function buildUnits(inv) {
  const units = [];
  const SKIP = new Set(['presetSelect', 'makerLanguage', 'friendRelation', 'friendHierarchy',
    'friendPairWearSel', 'friendPairCountSel', // covered by flows / need friend context
    // English prompt output intentionally diverged from the frozen baseline
    // (post-freeze i18n fix); EN regression coverage lives in the layer-2
    // golden scenarios, so these two stay out of the baseline-anchored sweep
    'initialPromptLanguage', 'manualPromptLanguage']);
  for (const s of inv.selects) {
    const key = s.id ?? `fixed:${s.fixed}`;
    if (s.id && SKIP.has(s.id)) continue;
    if (!s.values.length) continue;
    const values = sample(s.values);
    if (values.length < s.values.length)
      console.log(`  (sampling ${key}: ${values.length}/${s.values.length} options)`);
    if (s.where === 'initial') units.push({ name: `initial ${s.id}`, kind: 'respins', selector: `#${s.id}`, values });
    else if (s.where === 'fixed') units.push({ name: `fixed ${s.fixed}`, kind: 'respins', selector: `#fixedForm [data-fixed="${s.fixed}"]`, values, tab: 'settings' });
    else if (s.where === 'manual') units.push({ name: `manual ${s.id}`, kind: 'rerender', selector: `#${s.id}`, values });
  }
  for (const c of inv.checks)
    units.push({ name: `checkbox ${c.scope}#${c.idx}`, kind: c.scope.startsWith('initial') ? 'checkRespin' : 'checkRerender', idx: c.idx });
  units.push({ name: 'derived type grid', kind: 'dtypeButtons', values: inv.dtypes });
  return ONLY ? units.filter(u => u.name.includes(ONLY)) : units;
}

// ---------- per-unit runner (identical steps on both sides) ----------
async function runUnit(browser, baseURL, unit, seed) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  await page.addInitScript(initScript(seed));
  await page.goto(baseURL, { waitUntil: 'load' });
  await page.check('#instantMode');

  const captures = [];
  const snap = async () => captures.push(await page.evaluate(ids => ({
    prompts: Object.fromEntries(ids.map(id => [id, document.getElementById(id).value])),
    profile: document.getElementById('profileView').innerHTML,
    rarity: document.getElementById('rareScore').textContent + document.getElementById('rarity').textContent,
  }), PROMPT_IDS));
  const spin = async () => {
    const before = await page.$eval('#promptBox', el => el.value);
    await page.click('#startBtn');
    await page.waitForFunction(p => document.getElementById('promptBox').value !== p
      && document.getElementById('promptBox').value !== '', before, { timeout: 30000 });
  };
  const setSel = (selector, value) => page.evaluate(([sel, v]) => {
    const el = document.querySelector(sel);
    el.value = v;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  }, [selector, value]);
  // option lists themselves are part of the comparison
  const optionList = selector => page.$eval(selector, el => [...el.options].map(o => o.value));

  if (unit.kind === 'respins') {
    if (unit.tab) await page.click(`.tab[data-tab="${unit.tab}"]`);
    captures.push({ options: await optionList(unit.selector) });
    for (const v of unit.values) {
      if (unit.tab) await page.click(`.tab[data-tab="${unit.tab}"]`);
      await setSel(unit.selector, v);
      await spin();
      await snap();
    }
  } else if (unit.kind === 'rerender') {
    await spin();
    captures.push({ options: await optionList(unit.selector) });
    for (const v of unit.values) { await setSel(unit.selector, v); await snap(); }
  } else if (unit.kind === 'checkRespin' || unit.kind === 'checkRerender') {
    await spin();
    await page.evaluate(idx => {
      const c = [...document.querySelectorAll('input[type="checkbox"]')].filter(x => x.id !== 'instantMode')[idx];
      c.checked = !c.checked;
      c.dispatchEvent(new Event('change', { bubbles: true }));
    }, unit.idx);
    if (unit.kind === 'checkRespin') await spin();
    await snap();
  } else if (unit.kind === 'dtypeButtons') {
    await spin();
    for (const dt of unit.values) {
      await page.evaluate(d => document.querySelector(`#derivedTypeGrid [data-dtype="${d}"]`)?.click(), dt);
      await snap();
    }
  }
  await context.close();
  return { captures, errors };
}

// ---------- main ----------
const oldSrv = await serve(ROOT);
const newSrv = await serve(path.join(ROOT, 'dist'));
const browser = await chromium.launch();

console.log('reading option inventory from the baseline...');
const inv = await readInventory(browser, oldSrv.url);
const units = buildUnits(inv);
const totalPoints = units.reduce((a, u) => a + (u.values?.length ?? 1), 0);
console.log(`${units.length} sweep units, ${totalPoints} option points\n`);

let failures = 0, jsErrors = 0, done = 0;
const CONCURRENCY = 6;
for (let i = 0; i < units.length; i += CONCURRENCY) {
  const batch = units.slice(i, i + CONCURRENCY);
  const results = await Promise.all(batch.map(async (unit, j) => {
    const seed = 9000 + i + j;
    const [a, b] = await Promise.all([
      runUnit(browser, oldSrv.url, unit, seed),
      runUnit(browser, newSrv.url, unit, seed),
    ]);
    return { unit, a, b };
  }));
  for (const { unit, a, b } of results) {
    done++;
    const same = JSON.stringify(a.captures) === JSON.stringify(b.captures);
    if (a.errors.length || b.errors.length) {
      jsErrors++;
      console.log(`ERR  ${unit.name} old=[${a.errors[0] ?? ''}] new=[${b.errors[0] ?? ''}]`);
    }
    if (!same) {
      failures++;
      const idx = a.captures.findIndex((c, k) => JSON.stringify(c) !== JSON.stringify(b.captures[k]));
      const label = unit.values && idx > 0 ? ` at option ${JSON.stringify(unit.values[idx - 1])}` : ` at capture ${idx}`;
      console.log(`DIFF ${unit.name}${label}`);
    } else {
      console.log(`OK   ${unit.name} (${unit.values?.length ?? 1} points)`);
    }
  }
}

await browser.close(); oldSrv.close(); newSrv.close();
console.log(`\n${units.length} units / ${totalPoints} option points: ${units.length - failures} OK, ${failures} diffs, ${jsErrors} units with JS errors`);
process.exit(failures || jsErrors ? 1 : 0);
