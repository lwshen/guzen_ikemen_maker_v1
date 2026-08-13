// i18next runtime (source-string-keyed). The data tables in src/data remain
// the single source of truth — resources are built FROM them at init, so L5
// still pins the tables and upstream ports keep their line-by-line diffs.
// Japanese strings ARE the keys (gettext msgid model), hence:
//   - keySeparator/nsSeparator false (keys contain ASCII ':' e.g. 16:9, and
//     '.' e.g. ×0.5 — any separator would shred them)
//   - interpolation prefix/suffix set to strings that can never occur, so a
//     future value containing {{ }} can't trigger interpolation
//   - missing key => the key itself (== the Japanese source), preserving the
//     legacy `vt[v] || v` graceful degradation exactly
// This module must stay importable in plain Node (no DOM, no app modules) —
// the layer-7½ equivalence sweep imports it directly.
import i18next from 'i18next';
import {
  uiText, valueTranslations, valueTranslationsZh, sceneTranslations, sceneTranslationsZh,
} from '../data/index.js';

// missing-translation collector (i18next saveMissing + manual reports from
// presence-style lookups). Vite statically replaces import.meta.env.DEV; the
// typeof guard keeps the module loadable in plain Node.
const DEV = typeof import.meta !== 'undefined' && import.meta.env
  ? !!import.meta.env.DEV
  : false;
// 运行时开关：网址加 ?i18ndebug 也能开启收集——「运行时漏翻检查」
// （verify:missing）靠它在构建产物上收割；不带参数时与线上行为完全一致
const COLLECT = DEV || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('i18ndebug'));
export const missingI18nKeys = new Set();
// 字段级汇总（语言:表:字段名）：拼装句含随机姓名/日期，精确词条跨运行
// 不稳定；字段名是有限稳定集合，自动检查按它对账。只记录值里真的含
// 日文（假名或汉字）的落空——MBTI 码、数字这类纯 ASCII 值原样显示
// 即正确，不算漏翻
const JA_SCRIPT_RE = /[぀-ゟ゠-ヿ一-鿿]/;
export const missingI18nFields = new Set();
export function reportMissingI18n(lng, ns, key, field) {
  if (!COLLECT || !key) return;
  missingI18nKeys.add(`${lng}:${ns}:${key}`);
  if (field && JA_SCRIPT_RE.test(key)) missingI18nFields.add(`${lng}:${ns}:${field}`);
}
if (COLLECT && typeof window !== 'undefined') {
  window.__i18nMissing = missingI18nKeys;
  window.__i18nMissingFields = missingI18nFields;
}

i18next.init({
  // resources built from the existing tables; ja carries only the ui
  // namespace — ja IS the internal representation, so ja "translations" of
  // values/scenes don't exist and must resolve to the key itself
  resources: {
    ja: { ui: uiText.ja },
    en: { ui: uiText.en, values: valueTranslations, scenes: sceneTranslations },
    zh: { ui: uiText.zh, values: valueTranslationsZh, scenes: sceneTranslationsZh },
  },
  fallbackLng: 'ja',
  defaultNS: 'ui',
  keySeparator: false,
  nsSeparator: false,
  returnObjects: true, // T('rows') / T('promptDescs') return whole sub-tables
  // returnEmptyString/returnNull only affect the t() path (uiT — always
  // exists()-guarded, and L7d bans empty translations anyway); the values
  // path uses getResource and returns stored values verbatim
  returnEmptyString: false,
  returnNull: false,
  // prefix/suffix + nesting markers set to strings that can never occur in
  // the tables, so translations containing {{ }} or $t( are returned verbatim
  interpolation: {
    escapeValue: false,
    prefix: '⁅⁅', suffix: '⁆⁆',
    nestingPrefix: '⁅⁅$', nestingSuffix: '$⁆⁆',
  },
  saveMissing: COLLECT,
  saveMissingTo: 'current', // default 'fallback' would label every miss 'ja'
  missingKeyHandler: (lngs, ns, key) => reportMissingI18n(lngs[0], ns, key),
  parseMissingKeyHandler: (key) => key,
  initImmediate: false, // synchronous init — must not reorder app startup
});

export const i18n = i18next;

// Blank keys must behave like the legacy `table['']` (undefined / pass-through):
// i18next.getResource(lng, ns, '') returns the WHOLE namespace object, which is
// truthy and stringifies to [object Object] — style-note fields are '' all the
// time, so this guard is load-bearing, not defensive fluff.

// value lookup with EXACT legacy `vt[String(v)] ?? v` semantics: a miss
// returns the ORIGINAL v — undefined stays undefined, 0 stays 0 — never the
// stringified key. (t() would return the string 'undefined' for a missing
// promptValue(undefined), which is truthy and defeats downstream `|| fallback`
// guards: "Season: undefined." / "a undefined".) Misses are reported manually
// since getResource bypasses saveMissing.
export function valueT(lang, v) {
  const key = String(v);
  if (!key) return v;
  const r = i18next.getResource(lang, 'values', key);
  if (r !== undefined) return r;
  reportMissingI18n(lang, 'values', key, 'promptValue');
  return v;
}

// presence-style lookups: missing => undefined (legacy `table[k]`), for the
// `vt[a] || vt[b] || c` chains and `if(table[raw])` guards where a returned
// key would be truthy and short-circuit the chain. getResource bypasses
// saveMissing, so callers that end on a raw fallback report manually.
export function valueRes(lang, k) {
  const key = String(k);
  if (!key) return undefined;
  return i18next.getResource(lang, 'values', key);
}
export function sceneRes(lang, k) {
  const key = String(k);
  if (!key) return undefined;
  return i18next.getResource(lang, 'scenes', key);
}

// ui lookup with legacy T() semantics: lang table -> ja fallback ->
// undefined when the key exists nowhere (t() would return the key string).
export function uiT(lang, key) {
  if (!i18next.exists(key, { lng: lang, ns: 'ui' })) return undefined;
  return i18next.t(key, { lng: lang, ns: 'ui' });
}
