// Layer 3: visual regression (old vs Astro build, same seeded state) and
// Layer 4: localStorage continuity (history + preset saved in the old app must
// survive when the Astro build is served from the SAME origin).
// Usage: node verify/layer3-4-visual-storage.mjs [--outdir DIR]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv.includes('--outdir')
  ? process.argv[process.argv.indexOf('--outdir') + 1]
  : path.join(ROOT, 'verify', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
function makeServer(rootDir, port) {
  const server = http.createServer((req, res) => {
    const file = path.join(rootDir, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () =>
    resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(r => server.close(r)) })));
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

let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL'), name, detail);
  if (!cond) failures++;
};

const browser = await chromium.launch();

// ---------- Layer 3: screenshots ----------
const VIEWPORTS = [{ w: 390, h: 844 }, { w: 1280, h: 900 }];
const TABS = ['slot', 'result', 'history', 'settings'];

async function shoot(baseURL, tag) {
  const shots = {};
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await context.newPage();
    await page.addInitScript(initScript(1));
    await page.goto(baseURL, { waitUntil: 'load' });
    await page.check('#instantMode');
    const before = await page.$eval('#promptBox', el => el.value);
    await page.click('#startBtn');
    await page.waitForFunction(prev => document.getElementById('promptBox').value !== prev
      && document.getElementById('promptBox').value !== '', before);
    for (const tab of TABS) {
      await page.click(`.tab[data-tab="${tab}"]`);
      await page.waitForTimeout(150);
      const file = path.join(OUT, `${tag}-${vp.w}-${tab}.png`);
      await page.screenshot({ path: file, fullPage: true });
      shots[`${vp.w}-${tab}`] = file;
    }
    await context.close();
  }
  return shots;
}

{
  const oldSrv = await makeServer(ROOT, 0);
  const newSrv = await makeServer(path.join(ROOT, 'dist'), 0);
  const [oldShots, newShots] = [await shoot(oldSrv.url, 'old'), await shoot(newSrv.url, 'new')];
  for (const key of Object.keys(oldShots)) {
    const a = fs.readFileSync(oldShots[key]), b = fs.readFileSync(newShots[key]);
    ok(`layer3 screenshot ${key}`, a.equals(b), a.equals(b) ? '' : `differs (${oldShots[key]} vs ${newShots[key]})`);
  }
  await oldSrv.close(); await newSrv.close();
}

// ---------- Layer 4: localStorage continuity on the same origin ----------
{
  const PORT = 45991;
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('dialog', d => d.accept());
  await page.addInitScript(initScript(7));

  // 1. old app: generate, save to history, save a preset
  let srv = await makeServer(ROOT, PORT);
  await page.goto(srv.url, { waitUntil: 'load' });
  await page.check('#instantMode');
  const before = await page.$eval('#promptBox', el => el.value);
  await page.click('#startBtn');
  await page.waitForFunction(prev => document.getElementById('promptBox').value !== prev
    && document.getElementById('promptBox').value !== '', before);
  await page.click('#saveBtn');
  // preset bar lives in #initialPanel, hidden after the auto-switch to the result tab
  await page.click('.tab[data-tab="slot"]');
  await page.fill('#presetName', 'migration-check');
  await page.click('#savePresetBtn');
  const oldState = await page.evaluate(() => ({
    results: localStorage.getItem('guzen-ikemen-maker-v1.results'),
    presets: localStorage.getItem('guzen-ikemen-maker-v1.presets'),
  }));
  ok('layer4 old app wrote history', JSON.parse(oldState.results || '[]').length === 1);
  ok('layer4 old app wrote preset', 'migration-check' in JSON.parse(oldState.presets || '{}'));
  await srv.close();

  // 2. swap the SAME origin to the Astro build; storage must surface in the UI
  srv = await makeServer(path.join(ROOT, 'dist'), PORT);
  await page.goto(srv.url, { waitUntil: 'load' });
  const newState = await page.evaluate(() => ({
    results: localStorage.getItem('guzen-ikemen-maker-v1.results'),
    presets: localStorage.getItem('guzen-ikemen-maker-v1.presets'),
    historyItems: document.querySelectorAll('#historyList .history-item').length,
    presetOptions: [...document.querySelectorAll('#presetSelect option')].map(o => o.value),
  }));
  ok('layer4 storage bytes identical', newState.results === oldState.results && newState.presets === oldState.presets);
  ok('layer4 history rendered in new app', newState.historyItems === 1, `items=${newState.historyItems}`);
  ok('layer4 preset listed in new app', newState.presetOptions.includes('migration-check'), JSON.stringify(newState.presetOptions));
  // and the loaded history entry must carry the original appVersion stamp
  const version = await page.evaluate(() => JSON.parse(localStorage.getItem('guzen-ikemen-maker-v1.results'))[0].appVersion);
  ok('layer4 appVersion preserved', version === 'V3.0.0', version);
  await srv.close();
  await context.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
