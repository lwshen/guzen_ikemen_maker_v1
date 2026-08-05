// Layer 6: EN-mode i18n completeness — with the UI switched to English, the
// controlled surfaces must contain no Japanese: every select option label,
// the initial-settings field labels, copy buttons, and the prompt-pane
// headings. (Character DATA such as names, the profile's Japanese free text,
// and the deliberately bilingual language-picker label are out of scope.)
//
// This is the check that would have caught the untranslated V3.1-V3.4
// options upstream. Run after `npm run build`.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JA = /[぀-ゟ゠-ヿ一-鿿]/;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, 'dist', req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(d);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load' });
await page.selectOption('#makerLanguage', 'en');
await page.check('#instantMode');
await page.click('#startBtn');
await page.waitForFunction(() => document.getElementById('promptBox').value !== '');

const problems = await page.evaluate(jaSrc => {
  const JA = new RegExp(jaSrc);
  const out = [];
  // 1. every select option label (language picker excluded: bilingual by design)
  for (const s of document.querySelectorAll('select')) {
    if (s.id === 'makerLanguage') continue;
    for (const o of s.options) if (JA.test(o.textContent))
      out.push(`select#${s.id || 'data-fixed=' + s.dataset.fixed} option: ${o.textContent.trim().slice(0, 40)}`);
  }
  // 2. field labels, buttons, headings, pane descriptions, chips
  for (const el of document.querySelectorAll('label > span, button, h2, h3, .pane-desc, .chip, .flow-step, .dtype-btn')) {
    if (el.id === 'makerLanguageLabel') continue; // bilingual by design
    const t = el.textContent.trim();
    if (t && JA.test(t)) out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}: ${t.slice(0, 40)}`);
  }
  return [...new Set(out)];
}, JA.source);

await browser.close(); server.close();
if (errors.length) { console.log('JS errors:', errors.join('; ')); }
if (problems.length) {
  console.log(problems.slice(0, 30).join('\n'));
  console.log(`\n${problems.length} Japanese remnants in EN mode\nRESULT: FAIL`);
  process.exit(1);
}
console.log('EN mode: no Japanese remnants in selects/labels/buttons/headings');
console.log('RESULT: ALL PASS');
process.exit(errors.length ? 1 : 0);
