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
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECKS = [
  { lang: "en", pattern: /[぀-ゟ゠-ヿ一-鿿]/, what: "Japanese" },
  // U+30FB ・ (interpunct) is excluded: it is punctuation, legitimately used in
  // the Chinese copy; real untranslated Japanese always carries kana LETTERS
  { lang: "zh", pattern: /[぀-ゟ゠-ヺー-ヿ]/, what: "kana" },
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};
const server = http.createServer((req, res) => {
  const f = path.join(
    ROOT,
    "dist",
    req.url.split("?")[0] === "/" ? "index.html" : req.url.split("?")[0],
  );
  fs.readFile(f, (e, d) => {
    if (e) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[path.extname(f)] || "application/octet-stream",
    });
    res.end(d);
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));

// seeded PRNG + frozen Date: without this the scanned character differs per
// run and conditional profile rows (suit/uniform) appear nondeterministically
const FIXED_TIME = 1754269200000;
const INIT = `(() => {
  let s = 1 >>> 0;
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
// spin once per occupation so the conditional row families (plain / suit /
// uniform+headwear) all render deterministically
const OCCUPATIONS = [null, "銀行員", "警察官"];

const browser = await chromium.launch();
let failures = 0,
  jsErrors = 0;
for (const { lang, pattern, what } of CHECKS) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(INIT);
  await page.goto(`http://127.0.0.1:${server.address().port}/`, {
    waitUntil: "load",
  });
  await page.selectOption("#makerLanguage", lang);
  await page.check("#instantMode");
  const spin = async (occ) => {
    if (occ)
      await page.evaluate((o) => {
        const sel = document.getElementById("initialOccupation");
        sel.value = o;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }, occ);
    const before = await page.$eval("#promptBox", (el) => el.value);
    await page.click("#startBtn");
    await page.waitForFunction(
      (p) =>
        document.getElementById("promptBox").value !== p &&
        document.getElementById("promptBox").value !== "",
      before,
    );
  };
  await spin(OCCUPATIONS[0]);

  // conditional panels only exist in the DOM once their derived type is picked;
  // the foot-focus config panel hid an untranslated axis/option family for
  // several rounds because nothing ever rendered it during the scan
  const openConditionalPanels = async () => {
    // inner-profile category headings render only once the categories are
    // shown ([data-icat-all]="1" means "show all"; guard keeps it idempotent)
    await page.evaluate(() => {
      const b = document.querySelector("[data-icat-all]");
      if (b && b.dataset.icatAll === "1") b.click();
    });
    await page.waitForTimeout(60);
    await scan();
    for (const dtype of [
      "偶然足元強調場面シート",
      "キャラクタープロフィールシート",
      "トレーディングカード",
    ]) {
      await page.evaluate(
        (d) =>
          document
            .querySelector(`#derivedTypeGrid [data-dtype="${d}"]`)
            ?.click(),
        dtype,
      );
      await page.waitForTimeout(60);
      await scan();
    }
  };

  const problemSet = new Set();
  const scan = async () =>
    (
      await page.evaluate((patSrc) => {
        const PAT = new RegExp(patSrc);
        const out = [];
        // 1. every select option label (language picker excluded: bilingual by design)
        for (const s of document.querySelectorAll("select")) {
          if (s.id === "makerLanguage") continue;
          for (const o of s.options)
            if (PAT.test(o.textContent))
              out.push(
                `select#${s.id || "data-fixed=" + s.dataset.fixed} option: ${o.textContent.trim().slice(0, 40)}`,
              );
          for (const og of s.querySelectorAll("optgroup"))
            if (PAT.test(og.label))
              out.push(`select#${s.id} optgroup: ${og.label.slice(0, 40)}`);
        }
        // 2. field labels, buttons, headings, pane descriptions, chips, and
        //    profile ROW LABELS (.kv b — values are character data, labels are chrome)
        for (const el of document.querySelectorAll(
          "label > span, button, h2, h3, .pane-desc, .chip, .flow-step, .dtype-btn, #profileView .kv b, .field > span, .inner-cat, .pill, .slot small",
        )) {
          if (el.id === "makerLanguageLabel") continue; // bilingual by design
          if (el.id === "promptAreaTarget") continue; // shows the prompt-language name (日本語/English) natively by design
          const t = el.textContent.trim();
          if (t && PAT.test(t))
            out.push(
              `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}: ${t.slice(0, 40)}`,
            );
        }
        // 3. placeholder/title attributes — chrome the textContent scans miss
        //    (the restore-box placeholder hid here for several rounds)
        for (const el of document.querySelectorAll("[placeholder], [title]")) {
          for (const attr of ["placeholder", "title"]) {
            const v = el.getAttribute(attr);
            if (v && PAT.test(v))
              out.push(
                `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}[${attr}]: ${v.slice(0, 40)}`,
              );
          }
        }
        return [...new Set(out)];
      }, pattern.source)
    ).forEach((f) => problemSet.add(f));

  await scan();
  await openConditionalPanels();
  for (const occ of OCCUPATIONS.slice(1)) {
    await spin(occ);
    await scan();
    await openConditionalPanels();
  }
  const problems = [...problemSet];
  await page.close();

  if (errors.length) {
    jsErrors++;
    console.log(`${lang}: JS errors:`, errors.join("; "));
  }
  if (problems.length) {
    failures++;
    console.log(problems.slice(0, 30).join("\n"));
    console.log(`${lang}: ${problems.length} ${what} remnants`);
  } else {
    console.log(
      `${lang} mode: no ${what} remnants in selects/labels/buttons/headings`,
    );
  }
}
await browser.close();

// ---------------------------------------------------------------------------
// 6b. Editor-pool ratchet (zh).
//
// The checks above only see the ONE value a character happens to have. The
// slot editors and the profile-row ✎ editors render the WHOLE pool, so they are
// the only surface that exposes every option — and nothing ever opened them,
// which is how the sports-history editor kept showing raw Japanese sport names.
//
// The inner-profile *composed* sentences (birthdate wareki, speech style,
// friend lines, ...) are built inline inside ~30 generator functions and are
// still Japanese in zh mode; translating them is its own phase. So this is a
// RATCHET, not a pass/fail gate: the known gap is frozen in
// verify/golden/zh-composed-gap.json and only NEW untranslated options fail.
const GAP_FILE = path.join(ROOT, "verify/golden/zh-composed-gap.json");
const EDITOR_OCCS = [null, "警察官", "プロスポーツ選手", "僧侶"];
const editorFound = new Map();
{
  const browser2 = await chromium.launch();
  for (const occ of EDITOR_OCCS) {
    const page = await browser2.newPage();
    await page.addInitScript(INIT);
    await page.goto(`http://127.0.0.1:${server.address().port}/`, {
      waitUntil: "load",
    });
    await page.selectOption("#makerLanguage", "zh");
    await page.check("#instantMode");
    if (occ)
      await page.evaluate((o) => {
        const s = document.getElementById("initialOccupation");
        s.value = o;
        s.dispatchEvent(new Event("change", { bubbles: true }));
      }, occ);
    const before = await page.$eval("#promptBox", (el) => el.value);
    await page.click("#startBtn");
    await page.waitForFunction(
      (v) => document.getElementById("promptBox").value !== v,
      before,
    );
    await page.evaluate(() =>
      document.querySelector("[data-icat-all]")?.click(),
    );
    for (const d of [
      "キャラクタープロフィールシート",
      "偶然足元強調場面シート",
    ])
      await page.evaluate(
        (x) =>
          document
            .querySelector(`#derivedTypeGrid [data-dtype="${x}"]`)
            ?.click(),
        d,
      );
    await page.waitForTimeout(150);
    const found = await page.evaluate((patSrc) => {
      const PAT = new RegExp(patSrc);
      const out = [];
      for (const btn of document.querySelectorAll("[data-p-edit]")) {
        const kv = btn.closest(".kv");
        const label =
          kv?.querySelector("b")?.textContent?.trim() || btn.dataset.pEdit;
        btn.click();
        for (const sel of kv?.querySelectorAll(".pf-editor select") || [])
          for (const o of sel.options)
            if (PAT.test(o.textContent))
              out.push([label, o.textContent.trim()]);
        kv?.querySelector(".pf-editor")?.remove();
      }
      for (const btn of document.querySelectorAll(".slot [data-edit]")) {
        const slot = btn.closest(".slot");
        const label =
          slot.querySelector("small")?.textContent?.trim() || slot.id;
        btn.click();
        for (const sel of slot.querySelectorAll(".slot-editor select"))
          for (const o of sel.options)
            if (PAT.test(o.textContent))
              out.push([label, o.textContent.trim()]);
        slot.querySelector(".slot-editor")?.remove();
      }
      return out;
    }, CHECKS[1].pattern.source);
    for (const [l, v] of found) if (!editorFound.has(v)) editorFound.set(v, l);
    await page.close();
  }
  await browser2.close();
}
const known = fs.existsSync(GAP_FILE)
  ? new Set(JSON.parse(fs.readFileSync(GAP_FILE, "utf8")).values)
  : null;
if (!known) {
  fs.writeFileSync(
    GAP_FILE,
    JSON.stringify(
      {
        note: "Known-untranslated zh editor-pool options (inner-profile composed sentences). Ratchet baseline: new entries fail layer 6.",
        values: [...editorFound.keys()].sort(),
      },
      null,
      1,
    ) + "\n",
  );
  console.log(
    `zh editor pools: baseline written, ${editorFound.size} known-untranslated options`,
  );
} else {
  const fresh = [...editorFound.keys()].filter((v) => !known.has(v));
  if (fresh.length) {
    failures++;
    console.log(
      fresh
        .slice(0, 20)
        .map(
          (v) =>
            `  NEW untranslated option: ${editorFound.get(v)} :: ${v.slice(0, 50)}`,
        )
        .join("\n"),
    );
    console.log(
      `zh editor pools: ${fresh.length} NEW untranslated options (not in the frozen gap)`,
    );
  } else {
    const fixed = known.size - editorFound.size;
    console.log(
      `zh editor pools: no new untranslated options (${editorFound.size} known remain` +
        (fixed > 0
          ? `, ${fixed} newly translated — rerun with the gap file deleted to tighten the ratchet)`
          : ")"),
    );
  }
}

server.close();
console.log(failures || jsErrors ? "RESULT: FAIL" : "RESULT: ALL PASS");
process.exit(failures || jsErrors ? 1 : 0);
