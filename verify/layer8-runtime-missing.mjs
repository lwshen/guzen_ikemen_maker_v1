// 运行时漏翻检查（verify:missing）：在构建产物上真实操作页面（英/中两种
// 界面语言 × 多个职业），收割应用自己上报的「查不到翻译的字段」，与
// 欠账台账对账——出现台账之外的新字段就报错。
//
// 与其他检查的分工：翻译表对账（verify:i18n）管「表和总清单的静态对
// 账」，界面残留扫描（verify:en）管「界面框架文字无日文残留」；本检查
// 管的是它们都看不到的「渲染出来的内容值」——生成器现场拼装的句子
// （内在资料、宣传语等）没有任何表能静态对账，只有运行时能抓到。
//
// 对账粒度是【字段】（语言:表:字段名，如 zh:values:innerText）而不是
// 精确词条：拼装句里带随机姓名/日期/金额，词条级台账在随机序列变化
// （如上游移植）后会大面积假报警；字段名是有限稳定的集合，且直接指出
// 「哪个显示位置在漏」。精确词条留在 window.__i18nMissing 供人工排查。
//
// 台账 verify/golden/runtime-missing-fields.json 纪律与其他台账一致：
// 文件缺失/损坏即报错、只能 --write-baseline 显式重建、字段修复后
// 自动收紧并要求提交。运行前需 npm run build。
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GAP_FILE = path.join(ROOT, "verify/golden/runtime-missing-fields.json");

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

// 固定随机数种子 + 冻结时间：同一套代码必然收割出同一组字段
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

// 职业覆盖面沿用界面残留扫描的选择：无指定 + 制服系 + 运动系 + 传统服装系
const OCCUPATIONS = [null, "警察官", "プロスポーツ選手", "僧侶"];
const LANGS = ["en", "zh"];

const browser = await chromium.launch();
const harvested = new Set();
let jsErrors = 0;

for (const lang of LANGS) {
  for (const occ of OCCUPATIONS) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.addInitScript(INIT);
    await page.goto(`http://127.0.0.1:${server.address().port}/?i18ndebug`, {
      waitUntil: "load",
    });
    await page.selectOption("#makerLanguage", lang);
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
      (p) =>
        document.getElementById("promptBox").value !== p &&
        document.getElementById("promptBox").value !== "",
      before,
    );
    // 展开内在资料全部类别 + 三种派生面板（条件面板只有打开才渲染）
    await page.evaluate(() => {
      const b = document.querySelector("[data-icat-all]");
      if (b && b.dataset.icatAll === "1") b.click();
    });
    for (const d of [
      "偶然足元強調場面シート",
      "キャラクタープロフィールシート",
      "トレーディングカード",
    ])
      await page.evaluate(
        (x) =>
          document
            .querySelector(`#derivedTypeGrid [data-dtype="${x}"]`)
            ?.click(),
        d,
      );
    await page.waitForTimeout(120);
    // 打开档案行编辑器和槽位编辑器——逐项编辑器渲染整个词库，
    // 是唯一能暴露全部候选词的表面
    await page.evaluate(() => {
      for (const btn of document.querySelectorAll("[data-p-edit]")) {
        const kv = btn.closest(".kv");
        btn.click();
        kv?.querySelector(".pf-editor")?.remove();
      }
      for (const btn of document.querySelectorAll(".slot [data-edit]")) {
        const slot = btn.closest(".slot");
        btn.click();
        slot?.querySelector(".slot-editor")?.remove();
      }
    });
    await page.waitForTimeout(80);
    const fields = await page.evaluate(() => [
      ...(window.__i18nMissingFields || []),
    ]);
    for (const f of fields) harvested.add(f);
    if (errors.length) {
      jsErrors++;
      console.log(`${lang}/${occ ?? "默认职业"}: JS 错误:`, errors.join("; "));
    }
    await page.close();
  }
}
await browser.close();
server.close();

// 收割结果里只保留英/中界面的字段（日语界面不需要翻译，防御性过滤）
const current = [...harvested].filter((f) => !f.startsWith("ja:")).sort();
let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`FAIL ${msg}`);
};

const writeBaseline = () =>
  fs.writeFileSync(
    GAP_FILE,
    JSON.stringify(
      {
        note: "运行时收割到的「查不到翻译」字段（语言:表:字段名）。欠账台账：存量记录在案，新增字段报错，修复后自动收紧。重建只能用 --write-baseline。",
        fields: current,
      },
      null,
      1,
    ) + "\n",
  );

if (process.argv.includes("--write-baseline")) {
  writeBaseline();
  console.log(
    `运行时漏翻台账：已重建基线（--write-baseline），${current.length} 个已知漏翻字段`,
  );
} else if (!fs.existsSync(GAP_FILE)) {
  fail(
    `运行时漏翻台账：${path.relative(ROOT, GAP_FILE)} 缺失——提交它，或确需重建时用 --write-baseline`,
  );
} else {
  let known;
  try {
    known = JSON.parse(fs.readFileSync(GAP_FILE, "utf8")).fields;
    if (!Array.isArray(known)) throw new Error("缺 fields 数组");
  } catch (e) {
    known = null;
    fail(
      `运行时漏翻台账：${path.relative(ROOT, GAP_FILE)} 无法读取（${e.message}）——修复或用 --write-baseline 重建`,
    );
  }
  if (known) {
    const frozen = new Set(known);
    const fresh = current.filter((f) => !frozen.has(f));
    for (const f of fresh.slice(0, 30)) fail(`新漏翻字段：${f}（不在台账中）`);
    if (!fresh.length) {
      const fixed = known.filter((f) => !current.includes(f)).length;
      console.log(
        `运行时漏翻检查：无新增字段（台账剩 ${current.length}` +
          (fixed > 0 ? `，${fixed} 个已修复）` : "）"),
      );
      if (fixed > 0 && !failures) {
        writeBaseline();
        fail(
          `运行时漏翻台账：${fixed} 个字段已修复——台账已收紧，提交 ${path.relative(ROOT, GAP_FILE)} 后重跑`,
        );
      }
    }
  }
}

console.log(failures || jsErrors ? "RESULT: FAIL" : "RESULT: ALL PASS");
process.exit(failures || jsErrors ? 1 : 0);
