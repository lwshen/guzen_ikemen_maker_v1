// Layer 7: static cross-language i18n parity (source-level, no browser).
// Complements layer 6, which asks "does the RENDERED UI show untranslated
// Japanese?" but only sees surfaces the scan happens to open. Layer 7 asks
// "are the translation TABLES themselves mutually complete?" — every string
// translated in one language must be translated in the others, so a
// translation pass can never again ship one language and silently skip
// another (the V3.9.6 port shipped zh for values the en table never got).
//
// Checks:
//   7a. uiText deep key parity — ja is the reference language; en/zh must
//       contain every ja key path and no orphan paths.
//   7b. label maps (slotLabelMap, fixedFieldLabelMap, captionFieldLabelMap,
//       cardFieldLabelMap, uiCardTitles) — every key needs ja+en+zh. The zh
//       side is merged with `if (map[k])` guards in data-i18n-zh.js, so a
//       typo'd merge key silently no-ops; this is the check that catches it.
//   7c. paired ja→xx value tables — the union of both languages' keys defines
//       the translatable set; a key covered by one language but not the other
//       is a gap. zh gaps fail strictly. en gaps are a RATCHET: the en table
//       froze at the V3.2.0 baseline while the post-freeze zh pack shipped
//       with far wider coverage, so that backlog is frozen in
//       verify/golden/en-i18n-gap.json and only NEW en gaps fail. The gate
//       never mints its own baseline: a missing/corrupt gap file FAILS, and
//       the baseline is (re)written only via `--write-baseline` or the
//       auto-tighten path below. When a frozen key gains an en translation,
//       the file is rewritten without it and the run FAILS once with a
//       "commit the tightened baseline" message — so a later regression of
//       that same key can never hide behind the stale frozen set.
//   7d. translation values must be non-empty strings.
//
// Blind spot (by design): a ja value translated in NEITHER en nor zh is
// invisible here — no table knows the key exists. L6's runtime scan is the
// backstop for those.
//
// Run directly on source (no build needed): npm run verify:i18n
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  uiText,
  slotLabelMap,
  fixedFieldLabelMap,
  captionFieldLabelMap,
  cardFieldLabelMap,
  uiCardTitles,
  valueTranslations,
  sceneTranslations,
  valueTranslationsZh,
  sceneTranslationsZh,
  FRIEND_REL_EN,
  FRIEND_REL_ZH,
  FRIEND_HIER_EN,
  FRIEND_HIER_ZH,
} from "../src/data/index.js";
import { VALUE_POOLS, SCENE_POOLS, KEY_PAIRS } from "./i18n-pool-registry.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GAP_FILE = path.join(ROOT, "verify/golden/en-i18n-gap.json");
const LANGS = ["ja", "en", "zh"];

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`FAIL ${msg}`);
};

// ---------------------------------------------------------------------------
// 7a. uiText deep key parity (ja = reference)
const keyPaths = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      // an empty subtree must still contribute its own path — otherwise a
      // language omitting the whole subtree would show identical path sets
      const inner = keyPaths(v, p);
      return inner.length ? inner : [p];
    }
    return [p];
  });

{
  const missingLangs = LANGS.filter((l) => !uiText[l]);
  if (missingLangs.length) fail(`uiText: no table for [${missingLangs}]`);
  const jaPaths = new Set(keyPaths(uiText.ja));
  for (const lang of LANGS.filter((l) => l !== "ja" && uiText[l])) {
    const langPaths = new Set(keyPaths(uiText[lang]));
    const missing = [...jaPaths].filter((p) => !langPaths.has(p));
    const orphan = [...langPaths].filter((p) => !jaPaths.has(p));
    for (const p of missing.slice(0, 20))
      fail(`uiText.${lang}: missing key ${p}`);
    for (const p of orphan.slice(0, 20))
      fail(`uiText.${lang}: orphan key ${p} (not in ja)`);
    if (!missing.length && !orphan.length)
      console.log(`uiText.${lang}: ${langPaths.size} key paths, parity OK`);
  }
}

// ---------------------------------------------------------------------------
// 7b. label maps: each key must carry every language
const LABEL_MAPS = {
  slotLabelMap,
  fixedFieldLabelMap,
  captionFieldLabelMap,
  cardFieldLabelMap,
  uiCardTitles,
};
for (const [name, map] of Object.entries(LABEL_MAPS)) {
  let bad = 0;
  for (const [key, entry] of Object.entries(map))
    for (const lang of LANGS)
      if (typeof entry[lang] !== "string" || entry[lang].trim() === "") {
        fail(`${name}.${key}: missing ${lang} label`);
        bad++;
      }
  if (!bad)
    console.log(`${name}: ${Object.keys(map).length} keys × ${LANGS.length} languages OK`);
}

// ---------------------------------------------------------------------------
// 7c. paired ja→xx value tables (en ↔ zh key parity)
const PAIRED = {
  valueTranslations: { en: valueTranslations, zh: valueTranslationsZh },
  sceneTranslations: { en: sceneTranslations, zh: sceneTranslationsZh },
  FRIEND_REL: { en: FRIEND_REL_EN, zh: FRIEND_REL_ZH },
  FRIEND_HIER: { en: FRIEND_HIER_EN, zh: FRIEND_HIER_ZH },
};

// zh side: strict — anything en can translate, zh must too
for (const [family, { en, zh }] of Object.entries(PAIRED)) {
  const zhMissing = Object.keys(en).filter((k) => !(k in zh));
  for (const k of zhMissing.slice(0, 20))
    fail(`${family}: '${k}' has en but no zh translation`);
  if (!zhMissing.length)
    console.log(
      `${family}: zh covers all ${Object.keys(en).length} en-translated keys`,
    );
}

// en side: ratchet — the pre-existing backlog is frozen; only NEW gaps fail
const enGaps = {};
for (const [family, { en, zh }] of Object.entries(PAIRED))
  enGaps[family] = Object.keys(zh)
    .filter((k) => !(k in en))
    .sort();

const writeBaseline = () =>
  fs.writeFileSync(
    GAP_FILE,
    JSON.stringify(
      {
        note: "Known ja values translated in zh but not in the en valueTranslations/sceneTranslations tables (en froze at the V3.2.0 baseline; zh shipped post-freeze with wider coverage). Ratchet baseline: NEW en gaps fail layer 7. Auto-tightened when keys gain en translations. Recreate only via: node verify/layer7-i18n-parity.mjs --write-baseline",
        families: enGaps,
      },
      null,
      1,
    ) + "\n",
  );

if (process.argv.includes("--write-baseline")) {
  writeBaseline();
  const total = Object.values(enGaps).reduce((n, a) => n + a.length, 0);
  console.log(
    `en gap ratchet: baseline written (--write-baseline), ${total} known en-untranslated keys`,
  );
} else if (!fs.existsSync(GAP_FILE)) {
  // the gate never mints its own baseline on the enforcement path — a fresh
  // clone missing the committed file must fail loudly, not silently absorb
  // every current gap into a new baseline
  fail(
    `en gap ratchet: ${path.relative(ROOT, GAP_FILE)} missing — commit it, or recreate deliberately with --write-baseline`,
  );
} else {
  let known;
  try {
    known = JSON.parse(fs.readFileSync(GAP_FILE, "utf8")).families;
    if (!known || typeof known !== "object") throw new Error("no 'families' key");
  } catch (e) {
    known = null;
    fail(`en gap ratchet: ${path.relative(ROOT, GAP_FILE)} unreadable (${e.message}) — fix or recreate with --write-baseline`);
  }
  let totalFixed = 0;
  for (const [family, gaps] of known ? Object.entries(enGaps) : []) {
    const frozen = new Set(known[family] || []);
    const fresh = gaps.filter((k) => !frozen.has(k));
    for (const k of fresh.slice(0, 20))
      fail(`${family}: '${k}' has zh but no en translation (NEW, not in frozen gap)`);
    if (!fresh.length) {
      const fixed = (known[family] || []).filter(
        (k) => !gaps.includes(k),
      ).length;
      totalFixed += fixed;
      console.log(
        `${family}: no new en gaps (${gaps.length} known remain` +
          (fixed > 0 ? `, ${fixed} newly translated)` : ")"),
      );
    }
  }
  // auto-tighten: keys that gained en translations leave the frozen set NOW,
  // so a later regression of the same key cannot hide behind a stale baseline.
  // Rewriting alone isn't enough — the tightened file must be committed, so
  // this run fails once with instructions.
  if (known && !failures && totalFixed > 0) {
    writeBaseline();
    fail(
      `en gap ratchet: ${totalFixed} keys newly translated — baseline tightened, commit ${path.relative(ROOT, GAP_FILE)} and rerun`,
    );
  }
}

// ---------------------------------------------------------------------------
// 7d. every translation value must be a non-empty string
for (const [family, tables] of Object.entries(PAIRED))
  for (const [lang, table] of Object.entries(tables))
    for (const [k, v] of Object.entries(table))
      if (typeof v !== "string" || v.trim() === "")
        fail(`${family}.${lang}: '${k}' has empty/non-string translation`);
for (const lang of LANGS.filter((l) => uiText[l])) {
  const walk = (obj, prefix) => {
    for (const [k, v] of Object.entries(obj)) {
      const p = `${prefix}.${k}`;
      if (v && typeof v === "object" && !Array.isArray(v)) walk(v, p);
      else if (typeof v !== "string" || v.trim() === "")
        fail(`uiText.${lang}: ${p} has empty/non-string value`);
    }
  };
  walk(uiText[lang], `uiText.${lang}`);
}

// ---------------------------------------------------------------------------
// 词库覆盖检查：总清单（i18n-pool-registry.mjs）里每个含日文的值，必须
// 同时有英文和中文翻译（场景句池对场景表）。两种语言都没翻的词条此前
// 没有任何表知道它存在（'ベンチのある床' 就是这么漏的）——本检查专堵
// 这个盲区。键对账部分直接报错；值缺口走欠账台账 pool-gap.json，纪律
// 与上面的英文欠账台账一致：文件缺失/损坏即报错、只能 --write-baseline
// 显式重建、有词条补齐后自动收紧并要求提交。
const POOL_GAP_FILE = path.join(ROOT, "verify/golden/pool-gap.json");
// 只有含日文字符（假名或汉字）的值才需要翻译；纯 ASCII 值原样显示即正确
const JA_SCRIPT = /[぀-ゟ゠-ヿ一-鿿]/;

for (const pair of KEY_PAIRS) {
  let bad = 0;
  for (const k of pair.keys())
    for (const msg of pair.check(k)) {
      fail(`${pair.name}: ${msg}`);
      bad++;
    }
  if (!bad) console.log(`${pair.name}: ${pair.keys().length} 键齐全`);
}

const poolGapSets = {
  values_en: new Set(),
  values_zh: new Set(),
  scenes_en: new Set(),
  scenes_zh: new Set(),
};
for (const pool of VALUE_POOLS)
  for (const raw of pool.values()) {
    const v = String(raw);
    if (!JA_SCRIPT.test(v)) continue;
    if (!(v in valueTranslations)) poolGapSets.values_en.add(v);
    if (!(v in valueTranslationsZh)) poolGapSets.values_zh.add(v);
  }
for (const pool of SCENE_POOLS)
  for (const raw of pool.values()) {
    const v = String(raw);
    if (!JA_SCRIPT.test(v)) continue;
    if (!(v in sceneTranslations)) poolGapSets.scenes_en.add(v);
    if (!(v in sceneTranslationsZh)) poolGapSets.scenes_zh.add(v);
  }
const poolGaps = Object.fromEntries(
  Object.entries(poolGapSets).map(([k, s]) => [k, [...s].sort()]),
);

const writePoolBaseline = () =>
  fs.writeFileSync(
    POOL_GAP_FILE,
    JSON.stringify(
      {
        note: "词库总清单（i18n-pool-registry.mjs）里尚未翻译的显示值。欠账台账：存量记录在案，新增缺口报错，补齐后自动收紧。重建只能用 --write-baseline。",
        families: poolGaps,
      },
      null,
      1,
    ) + "\n",
  );

if (process.argv.includes("--write-baseline")) {
  writePoolBaseline();
  const total = Object.values(poolGaps).reduce((n, a) => n + a.length, 0);
  console.log(
    `词库覆盖台账：已重建基线（--write-baseline），${total} 个已知未翻译显示值`,
  );
} else if (!fs.existsSync(POOL_GAP_FILE)) {
  fail(
    `词库覆盖台账：${path.relative(ROOT, POOL_GAP_FILE)} 缺失——提交它，或确需重建时用 --write-baseline`,
  );
} else {
  let known;
  try {
    known = JSON.parse(fs.readFileSync(POOL_GAP_FILE, "utf8")).families;
    if (!known || typeof known !== "object") throw new Error("缺 families 键");
  } catch (e) {
    known = null;
    fail(
      `词库覆盖台账：${path.relative(ROOT, POOL_GAP_FILE)} 无法读取（${e.message}）——修复或用 --write-baseline 重建`,
    );
  }
  const beforePool = failures;
  let poolFixed = 0;
  for (const [family, gaps] of known ? Object.entries(poolGaps) : []) {
    const frozen = new Set(known[family] || []);
    const fresh = gaps.filter((k) => !frozen.has(k));
    for (const k of fresh.slice(0, 20))
      fail(`词库覆盖 ${family}: '${k}' 未翻译（新增，不在台账中）`);
    if (!fresh.length) {
      const fixed = (known[family] || []).filter(
        (k) => !gaps.includes(k),
      ).length;
      poolFixed += fixed;
      console.log(
        `词库覆盖 ${family}: 无新增缺口（台账剩 ${gaps.length}` +
          (fixed > 0 ? `，${fixed} 条已补齐）` : "）"),
      );
    }
  }
  if (known && failures === beforePool && poolFixed > 0) {
    writePoolBaseline();
    fail(
      `词库覆盖台账：${poolFixed} 条已补齐——台账已收紧，提交 ${path.relative(ROOT, POOL_GAP_FILE)} 后重跑`,
    );
  }
}

console.log(failures ? `\n${failures} failures` : "");
console.log(failures ? "RESULT: FAIL" : "RESULT: ALL PASS");
process.exit(failures ? 1 : 0);
