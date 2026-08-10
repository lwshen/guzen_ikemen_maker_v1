// Layer 2: seeded behavioral equivalence — frozen baseline vs Astro build.
// Both pages get the same seeded PRNG (mulberry32) in place of Math.random and a
// frozen Date, then run identical action scripts; every prompt textarea, the
// rendered profile HTML, and the rarity readout must match byte-for-byte.
//
// JA scenarios compare old-vs-new against the frozen index.html baseline.
// EN-involving scenarios (lang=en, langswitch flow) and every scenario that
// switches the PROMPT language to English (plang=English) compare the build
// against COMMITTED GOLDEN SNAPSHOTS instead: EN display intentionally
// diverged from the baseline when the missing V3.1-V3.4 translations were
// fixed post-freeze (see MIGRATION_VERIFICATION.md §4.2), and the English
// prompt templates are pinned by the plang golden matrix (uiLang ja/en/zh ×
// promptLanguage=English). Regenerate with --update-golden after an
// intentional EN-display or EN-prompt change.
// Usage: node verify/layer2-behavior.mjs [--seeds N] [--update-golden]
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

// Interaction flows beyond plain generation — each runs the same deterministic
// steps on both sides and snapshots after every meaningful state change.
const FLOWS = {
  // inline slot editor + per-slot dice reroll
  editor: async (page, snap) => {
    await page.click('.tab[data-tab="slot"]');
    await page.click('#slot-height [data-edit]');
    await page.waitForSelector('#slot-height .slot-editor select');
    await page.evaluate(() => {
      const sel = document.querySelector('#slot-height .slot-editor select');
      sel.value = sel.options[3].value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await snap();
    await page.click('.tab[data-tab="slot"]');
    await page.click('#slot-vibe [data-dice]');
    await snap();
  },
  // preset save / load / delete round-trip
  preset: async (page, snap) => {
    await page.click('.tab[data-tab="slot"]');
    const pick = (id, idx) => page.evaluate(([id, idx]) => {
      const sel = document.getElementById(id);
      sel.value = sel.options[idx].value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }, [id, idx]);
    await pick('initialVibe', 2);
    await page.fill('#presetName', 'p1');
    await page.click('#savePresetBtn');
    await pick('initialVibe', 4);
    await page.selectOption('#presetSelect', 'p1');
    await page.click('#loadPresetBtn');
    await snap();
    await page.click('#deletePresetBtn');
    await snap();
  },
  // save twice, favorite, load, clear
  history: async (page, snap) => {
    await page.click('#saveBtn');
    const b1 = await page.$eval('#promptBox', el => el.value);
    await page.click('#startBtn');
    await page.waitForFunction(p => document.getElementById('promptBox').value !== p, b1);
    await page.click('#saveBtn');
    await page.click('.tab[data-tab="history"]');
    await page.click('#historyList .history-item:nth-child(1) [data-fav]');
    await page.click('#historyList .history-item:nth-child(2) [data-load]');
    await snap();
    await page.click('.tab[data-tab="history"]');
    await page.click('#clearHistoryBtn');
    await snap();
  },
  // export current char, re-import a mutated copy (single), then an array
  importexport: async (page, snap) => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#jsonBtn')]);
    const chunks = [];
    for await (const c of await download.createReadStream()) chunks.push(c);
    const exported = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
    const before = await page.$eval('#promptBox', el => el.value);
    const single = Buffer.from(JSON.stringify({ ...exported, name: 'テスト' }), 'utf-8');
    await page.setInputFiles('#importFile', { name: 's.json', mimeType: 'application/json', buffer: single });
    await page.waitForFunction(p => document.getElementById('promptBox').value !== p, before);
    await snap();
    const arr = Buffer.from(JSON.stringify([{ ...exported, name: 'エーくん' }, { ...exported, name: 'ビーくん' }]), 'utf-8');
    await page.setInputFiles('#importFile', { name: 'a.json', mimeType: 'application/json', buffer: arr });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('guzen-ikemen-maker-v1.results') || '[]').length >= 2);
    await snap();
  },
  // restore-from-prompt round-trip using the app's own generated prompt
  restore: async (page, snap) => {
    const promptText = await page.$eval('#promptBox', el => el.value);
    await page.click('.tab[data-tab="history"]');
    await page.fill('#restoreCodeInput', promptText);
    await page.click('#restoreCodeBtn');
    await page.waitForFunction(p => document.getElementById('promptBox').value !== p, promptText);
    await snap();
  },
  // UI language round-trip with an existing result (re-init path, all 3 langs)
  langswitch: async (page, snap) => {
    await page.selectOption('#makerLanguage', 'en');
    await snap();
    await page.selectOption('#makerLanguage', 'zh');
    await snap();
    await page.selectOption('#makerLanguage', 'ja');
    await snap();
  },
};

async function runScenario(browser, baseURL, { seed, lang, modes, group, friend, flow, promptLang, dtype, snapMode }) {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  await page.addInitScript(initScript(seed));
  await page.goto(baseURL, { waitUntil: 'load' });

  if (lang !== 'ja') await page.selectOption('#makerLanguage', lang);
  if (group) await page.selectOption('#initialGroupSize', '3人グループ');
  // option VALUES stay Japanese in every UI language (labels are what get
  // translated), so these selectors work across the whole lang matrix
  if (promptLang) await page.selectOption('#initialPromptLanguage', promptLang);
  if (snapMode) await page.selectOption('#initialSnapMode', snapMode);
  await page.check('#instantMode');

  const captures = [];
  const snap = async () => captures.push(await page.evaluate(ids => ({
    prompts: Object.fromEntries(ids.map(id => [id, document.getElementById(id).value])),
    profile: document.getElementById('profileView').innerHTML,
    rareScore: document.getElementById('rareScore').textContent,
    rarity: document.getElementById('rarity').textContent,
    storage: {
      results: localStorage.getItem('guzen-ikemen-maker-v1.results'),
      presets: localStorage.getItem('guzen-ikemen-maker-v1.presets'),
    },
  }), PROMPT_IDS));

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
    await snap();
  }
  if (dtype) {
    // derived-type tiles exist only after a spin; clicking re-renders the
    // derived prompt synchronously (no async work in the app)
    await page.evaluate(d => document.querySelector(`#derivedTypeGrid [data-dtype="${d}"]`)?.click(), dtype);
    await page.waitForTimeout(120);
    await snap();
  }
  if (flow) await FLOWS[flow](page, snap);
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
  if (s <= 5) scenarios.push({ seed: 900 + s, lang: 'zh', modes: ['full'] });
  scenarios.push({ seed: 200 + s, lang: 'ja', modes: ['rare'] });
  scenarios.push({ seed: 300 + s, lang: 'ja', modes: ['full', 'face'] });
  scenarios.push({ seed: 400 + s, lang: 'ja', modes: ['full', 'outfit'] });
}
for (let s = 1; s <= Math.min(5, SEEDS); s++) {
  scenarios.push({ seed: 500 + s, lang: 'ja', modes: ['full'], group: true });
  scenarios.push({ seed: 600 + s, lang: 'ja', modes: ['full'], friend: true });
}
Object.keys(FLOWS).forEach((flow, fi) => {
  for (let s = 1; s <= Math.min(3, SEEDS); s++)
    scenarios.push({ seed: 700 + fi * 10 + s, lang: 'ja', modes: ['full'], flow });
});
// English PROMPT-language axis (~69 english-branch builders had zero behavior
// coverage before these). Full uiLang × promptLanguage=English matrix plus the
// derived-sheet / card / friend / group English builders; all golden-anchored.
for (let s = 1; s <= Math.min(5, SEEDS); s++) {
  scenarios.push({ seed: 800 + s, lang: 'ja', modes: ['full'], promptLang: 'English' });
  scenarios.push({ seed: 810 + s, lang: 'en', modes: ['full'], promptLang: 'English' });
  if (s <= 3) scenarios.push({ seed: 820 + s, lang: 'zh', modes: ['full'], promptLang: 'English' });
}
['キャラクタープロフィールシート', 'トレーディングカード', '偶然足元強調場面シート'].forEach((dtype, di) =>
  scenarios.push({ seed: 831 + di, lang: 'en', modes: ['full'], promptLang: 'English', dtype }));
scenarios.push({ seed: 834, lang: 'en', modes: ['full'], promptLang: 'English', friend: true });
scenarios.push({ seed: 835, lang: 'en', modes: ['full'], promptLang: 'English', group: true });

const UPDATE_GOLDEN = process.argv.includes('--update-golden');
const GOLDEN_PATH = path.join(ROOT, 'verify', 'golden', 'en-scenarios.json');
const isGolden = sc => sc.lang !== 'ja' || sc.flow === 'langswitch' || !!sc.promptLang || !!sc.snapMode;
const golden = fs.existsSync(GOLDEN_PATH) ? JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf-8')) : {};
const goldenOut = {};

const oldSrv = await serve(path.join(ROOT));        // frozen index.html baseline
const newSrv = await serve(path.join(ROOT, 'dist')); // Astro build output
const browser = await chromium.launch();

let failures = 0, jsErrors = 0, goldenCount = 0;
const CONCURRENCY = 6;
for (let i = 0; i < scenarios.length; i += CONCURRENCY) {
  const batch = scenarios.slice(i, i + CONCURRENCY);
  const results = await Promise.all(batch.map(async sc => {
    if (isGolden(sc)) return { sc, b: await runScenario(browser, newSrv.url, sc) };
    const [a, b] = await Promise.all([
      runScenario(browser, oldSrv.url, sc),
      runScenario(browser, newSrv.url, sc),
    ]);
    return { sc, a, b };
  }));
  for (const { sc, a, b } of results) {
    const label = `seed=${sc.seed} lang=${sc.lang} modes=${sc.modes.join('+')}`
      + (sc.promptLang ? ` plang=${sc.promptLang}` : '') + (sc.dtype ? ` dtype=${sc.dtype}` : '')
      + (sc.snapMode ? ` snap=${sc.snapMode}` : '')
      + (sc.group ? ' group' : '') + (sc.friend ? ' friend' : '') + (sc.flow ? ` flow=${sc.flow}` : '');
    if ((a?.errors.length || 0) + b.errors.length > 0) {
      jsErrors++;
      console.log(`ERR  ${label} old=[${a?.errors.join('; ') ?? ''}] new=[${b.errors.join('; ')}]`);
    }
    if (isGolden(sc)) {
      goldenCount++;
      if (UPDATE_GOLDEN) { goldenOut[label] = b.captures; console.log(`GOLD ${label} (recorded)`); continue; }
      const expect = golden[label];
      if (!expect) { failures++; console.log(`DIFF ${label} — no golden snapshot (run --update-golden)`); continue; }
      if (JSON.stringify(expect) !== JSON.stringify(b.captures)) {
        failures++;
        console.log(`DIFF ${label} vs golden snapshot`);
      } else console.log(`OK   ${label} (golden)`);
      continue;
    }
    const same = JSON.stringify(a.captures) === JSON.stringify(b.captures);
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
if (UPDATE_GOLDEN) {
  fs.mkdirSync(path.dirname(GOLDEN_PATH), { recursive: true });
  fs.writeFileSync(GOLDEN_PATH, JSON.stringify(goldenOut));
  console.log(`\ngolden snapshots written: ${Object.keys(goldenOut).length} -> ${GOLDEN_PATH}`);
}
console.log(`\n${scenarios.length} scenarios (${scenarios.length - goldenCount} baseline + ${goldenCount} golden): ${scenarios.length - failures} OK, ${failures} diffs, ${jsErrors} with JS errors`);
process.exit(failures || jsErrors ? 1 : 0);
