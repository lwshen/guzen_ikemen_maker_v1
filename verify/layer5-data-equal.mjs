// Layer 5: per-constant deep-equal — every data constant, as ACTUALLY exported
// by src/data (imported and evaluated), must equal the literal in the frozen
// index.html baseline. Key-order-sensitive: Object.keys iteration order feeds
// option lists and weighted picks, so reordered keys are a real behavioral
// change. See MIGRATION_VERIFICATION.md sections 1 and 4.
//
// NOTE (by design): once data is edited intentionally post-Phase 4, this layer
// reports the drift vs the frozen baseline — update/retire it at that point.
//
// First intentional divergence (2026-08-05, EN i18n fix): valueTranslations
// and uiText gained entries the upstream never shipped. For those two, the
// check is SUBSET mode — every baseline entry must survive byte-identical
// (additions allowed, edits/deletions still fail). Everything else stays exact.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL, fileURLToPath } from "node:url";
import { parseTopLevelConsts } from "./archive/phase2-extract-data.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, "verify", "data-manifest.json"), "utf-8"),
);

// original literals from the frozen baseline (region located by marker lines)
const orig = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
const origLines = orig.split("\n");
const region = origLines
  .slice(origLines.indexOf("<script>") + 1, origLines.indexOf("</script>"))
  .join("\n");
const origConsts = new Map(
  parseTopLevelConsts(region).map((c) => [c.name, c.init]),
);

// what actually ships: evaluate the real modules
const data = await import(
  pathToFileURL(path.join(ROOT, "src", "data", "index.js"))
);

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== typeof b ||
    typeof a !== "object" ||
    a === null ||
    b === null
  )
    return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a),
    kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return false; // key ORDER matters
  return ka.every((k) => deepEqual(a[k], b[k]));
}

// append-only vs baseline: value/uiText gained EN entries post-freeze, and the
// label maps gained a zh field per key when the Chinese UI language was added
const SUBSET_MODE = new Set([
  "valueTranslations",
  "uiText",
  "slotLabelMap",
  "fixedFieldLabelMap",
  "captionFieldLabelMap",
  "cardFieldLabelMap",
  "uiCardTitles",
  "OCC_CAT_LABELS",
  // 2026-08-13 词库覆盖检查上线：好友上下关系补了基线没有的 '同期'
  // 翻译（fixedHier 值此前在英/中界面显示日语原文）
  "FRIEND_HIER_EN",
]);
// post-freeze exports that never existed in the frozen baseline
const POST_FREEZE_EXPORTS = new Set([
  "valueTranslationsZh",
  "sceneTranslationsZh",
  "FRIEND_REL_ZH",
  "FRIEND_HIER_ZH",
  "INNER_CATS_ZH",
  "SPORT_MUSCLE_ZH",
  "SPORT_STAGES_ZH",
  "ERA_LABEL_ZH",
  "SCENE_MOD_ZH",
  "FOOT_AXIS_LABEL_ZH",
]);

// every baseline entry must exist unchanged in `cur`; additions are allowed;
// arrays are compared exactly (subset semantics are ambiguous for lists)
function subsetEqual(base, cur) {
  if (Object.is(base, cur)) return true;
  if (
    typeof base !== typeof cur ||
    typeof base !== "object" ||
    base === null ||
    cur === null
  )
    return false;
  if (Array.isArray(base) || Array.isArray(cur)) return deepEqual(base, cur);
  return Object.keys(base).every(
    (k) => k in cur && subsetEqual(base[k], cur[k]),
  );
}

let fails = 0;
for (const { name } of manifest.extracted) {
  const literal = origConsts.get(name);
  if (literal === undefined) {
    console.log(`FAIL ${name}: not found in frozen baseline`);
    fails++;
    continue;
  }
  const expected = vm.runInNewContext(`(${literal})`, {}, { timeout: 5000 });
  const ok = SUBSET_MODE.has(name)
    ? subsetEqual(expected, data[name])
    : deepEqual(expected, data[name]);
  if (!ok) {
    console.log(
      `FAIL ${name}: ${SUBSET_MODE.has(name) ? "baseline entries not preserved" : "deep-equal mismatch vs baseline"}`,
    );
    fails++;
  }
}
const extraKeys = Object.keys(data).filter(
  (k) =>
    !manifest.extracted.some((e) => e.name === k) &&
    !POST_FREEZE_EXPORTS.has(k),
);
if (extraKeys.length) {
  console.log(`FAIL unexpected src/data exports: ${extraKeys}`);
  fails++;
}

console.log(
  `\n${manifest.extracted.length} constants checked, ${fails} failures`,
);
console.log(fails ? "RESULT: FAIL" : "RESULT: ALL PASS");
process.exit(fails ? 1 : 0);
