// Layer 6: non-Japanese-mode i18n completeness. For each UI language, the
// controlled surfaces (select option labels, field labels, buttons, headings)
// must contain no Japanese remnants:
//   en — no Japanese characters at all (kana or kanji)
//   zh — no KANA (kanji are shared between Chinese and Japanese, so kana is
//        the only reliable "untranslated Japanese" signal)
// Character DATA such as names, the profile's Japanese free text, and the
// deliberately bilingual language-picker label are out of scope.
//
// This is the check that would have caught the untranslated V3.1-V3.4
// options upstream. Run after `npm run build`.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECKS = [
  { lang: 'en', pattern: /[぀-ゟ゠-ヿ一-鿿]/, what: 'Japanese' },
  // U+30FB ・ (interpunct) is excluded: it is punctuation, legitimately used in
  // the Chinese copy; real untranslated Japanese always carries kana LETTERS
  { lang: 'zh', pattern: /[぀-ゟ゠-ヺー-ヿ]/, what: 'kana' },
];

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
let failures = 0, jsErrors = 0;
for (const { lang, pattern, what } of CHECKS) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load' });
  await page.selectOption('#makerLanguage', lang);
  await page.check('#instantMode');
  await page.click('#startBtn');
  await page.waitForFunction(() => document.getElementById('promptBox').value !== '');

  const problems = await page.evaluate(patSrc => {
    const PAT = new RegExp(patSrc);
    const out = [];
    // 1. every select option label (language picker excluded: bilingual by design)
    for (const s of document.querySelectorAll('select')) {
      if (s.id === 'makerLanguage') continue;
      for (const o of s.options) if (PAT.test(o.textContent))
        out.push(`select#${s.id || 'data-fixed=' + s.dataset.fixed} option: ${o.textContent.trim().slice(0, 40)}`);
      for (const og of s.querySelectorAll('optgroup')) if (PAT.test(og.label))
        out.push(`select#${s.id} optgroup: ${og.label.slice(0, 40)}`);
    }
    // 2. field labels, buttons, headings, pane descriptions, chips
    for (const el of document.querySelectorAll('label > span, button, h2, h3, .pane-desc, .chip, .flow-step, .dtype-btn')) {
      if (el.id === 'makerLanguageLabel') continue; // bilingual by design
      const t = el.textContent.trim();
      if (t && PAT.test(t)) out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}: ${t.slice(0, 40)}`);
    }
    return [...new Set(out)];
  }, pattern.source);
  await page.close();

  if (errors.length) { jsErrors++; console.log(`${lang}: JS errors:`, errors.join('; ')); }
  if (problems.length) {
    failures++;
    console.log(problems.slice(0, 30).join('\n'));
    console.log(`${lang}: ${problems.length} ${what} remnants`);
  } else {
    console.log(`${lang} mode: no ${what} remnants in selects/labels/buttons/headings`);
  }
}
await browser.close(); server.close();
console.log(failures || jsErrors ? 'RESULT: FAIL' : 'RESULT: ALL PASS');
process.exit(failures || jsErrors ? 1 : 0);
