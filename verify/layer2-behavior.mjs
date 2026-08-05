// Layer 2: seeded behavioral equivalence — old single-file app vs Astro build.
// Both pages get the same seeded PRNG (mulberry32) in place of Math.random and a
// frozen Date, then run identical action scripts; every prompt textarea, the
// rendered profile HTML, and the rarity readout must match byte-for-byte.
// Usage: node verify/layer2-behavior.mjs [--seeds N]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEEDS = Number(process.argv.includes('--seeds') ? process.argv[process.argv.indexOf('--seeds') + 1] : 50);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
function serve(rootDir) {
  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    const file = path.join(rootDir, urlPath === '/' ? 'index.html' : urlPath);
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

async function runScenario(browser, baseURL, { seed, lang, modes, group, friend }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  await page.addInitScript(initScript(seed));
  await page.goto(baseURL, { waitUntil: 'load' });

  if (lang === 'en') await page.selectOption('#makerLanguage', 'en');
  if (group) await page.selectOption('#initialGroupSize', '3人グループ');
  await page.check('#instantMode');

  const captures = [];
  for (const mode of modes) {
    if (mode !== 'full') {
      // mode buttons live in #slotAside, hidden after auto-switch to the result tab
      await page.click('.tab[data-tab="slot"]');
      await page.click(`[data-mode="${mode}"]`);
    }
    const before = await page.$eval('#promptBox', el => el.value);
    await page.click('#startBtn');
    await page.waitForFunction(
      prev => document.getElementById('promptBox').value !== prev && document.getElementById('promptBox').value !== '',
      before, { timeout: 30000 });
    captures.push(await page.evaluate(ids => ({
      prompts: Object.fromEntries(ids.map(id => [id, document.getElementById(id).value])),
      profile: document.getElementById('profileView').innerHTML,
      rareScore: document.getElementById('rareScore').textContent,
      rarity: document.getElementById('rarity').textContent,
    }), PROMPT_IDS));
  }
  if (friend) {
    // create a friend from the current result (auto-saves the original to history)
    await page.click('#friendBtn');
    await page.click('#friendGoBtn');
    await page.waitForFunction(() => document.getElementById('friendPairPromptBox').value !== '', null, { timeout: 30000 });
    captures.push(await page.evaluate(ids => ({
      prompts: Object.fromEntries(ids.map(id => [id, document.getElementById(id).value])),
      profile: document.getElementById('profileView').innerHTML,
      rareScore: document.getElementById('rareScore').textContent,
      rarity: document.getElementById('rarity').textContent,
      history: localStorage.getItem('guzen-ikemen-maker-v1.results'),
    }), PROMPT_IDS));
  }
  await context.close();
  return { captures, errors };
}

const scenarios = [];
for (let s = 1; s <= SEEDS; s++) scenarios.push({ seed: s, lang: 'ja', modes: ['full'] });
for (let s = 1; s <= Math.min(10, SEEDS); s++) {
  scenarios.push({ seed: 100 + s, lang: 'en', modes: ['full'] });
  scenarios.push({ seed: 200 + s, lang: 'ja', modes: ['rare'] });
  scenarios.push({ seed: 300 + s, lang: 'ja', modes: ['full', 'face'] });
  scenarios.push({ seed: 400 + s, lang: 'ja', modes: ['full', 'outfit'] });
}
for (let s = 1; s <= Math.min(5, SEEDS); s++) {
  scenarios.push({ seed: 500 + s, lang: 'ja', modes: ['full'], group: true });
  scenarios.push({ seed: 600 + s, lang: 'ja', modes: ['full'], friend: true });
}

const oldSrv = await serve(path.join(ROOT));        // original index.html (self-contained)
const newSrv = await serve(path.join(ROOT, 'dist')); // Astro build output
const browser = await chromium.launch();

let failures = 0, jsErrors = 0;
const CONCURRENCY = 6;
for (let i = 0; i < scenarios.length; i += CONCURRENCY) {
  const batch = scenarios.slice(i, i + CONCURRENCY);
  const results = await Promise.all(batch.map(async sc => {
    const [a, b] = await Promise.all([
      runScenario(browser, oldSrv.url, sc),
      runScenario(browser, newSrv.url, sc),
    ]);
    return { sc, a, b };
  }));
  for (const { sc, a, b } of results) {
    const label = `seed=${sc.seed} lang=${sc.lang} modes=${sc.modes.join('+')}`
      + (sc.group ? ' group' : '') + (sc.friend ? ' friend' : '');
    const same = JSON.stringify(a.captures) === JSON.stringify(b.captures);
    if (a.errors.length || b.errors.length) {
      jsErrors++;
      console.log(`ERR  ${label} old=[${a.errors.join('; ')}] new=[${b.errors.join('; ')}]`);
    }
    if (!same) {
      failures++;
      console.log(`DIFF ${label}`);
      for (const [i, [ca, cb]] of a.captures.map((c, i) => [i, [c, b.captures[i]]])) {
        for (const id of PROMPT_IDS) if (ca.prompts[id] !== cb.prompts[id])
          console.log(`  capture[${i}] ${id}: old ${ca.prompts[id].length}ch vs new ${cb.prompts[id].length}ch`);
        if (ca.profile !== cb.profile) console.log(`  capture[${i}] profileView differs`);
        if (ca.rareScore !== cb.rareScore || ca.rarity !== cb.rarity) console.log(`  capture[${i}] rarity differs`);
      }
    } else {
      console.log(`OK   ${label}`);
    }
  }
}

await browser.close(); oldSrv.close(); newSrv.close();
console.log(`\n${scenarios.length} scenarios: ${scenarios.length - failures} identical, ${failures} diffs, ${jsErrors} scenarios with JS errors`);
process.exit(failures || jsErrors ? 1 : 0);
