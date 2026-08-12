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

// dev-only missing-key collector (i18next saveMissing + manual reports from
// presence-style lookups). Vite statically replaces import.meta.env.DEV; the
// typeof guard keeps the module loadable in plain Node.
const DEV = typeof import.meta !== 'undefined' && import.meta.env
  ? !!import.meta.env.DEV
  : false;
export const missingI18nKeys = new Set();
export function reportMissingI18n(lng, ns, key) {
  if (!DEV || !key) return;
  missingI18nKeys.add(`${lng}:${ns}:${key}`);
}
if (DEV && typeof window !== 'undefined') window.__i18nMissing = missingI18nKeys;

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
  saveMissing: DEV,
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
  reportMissingI18n(lang, 'values', key);
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
