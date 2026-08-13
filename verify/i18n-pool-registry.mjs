// 待翻译词汇总清单：登记所有「值会显示到界面上」的数据词库。
// 翻译表对账（verify:i18n）依据本清单做词库覆盖检查——清单内每个含
// 日文的值，必须同时存在于英文表（valueTranslations）和中文表
// （valueTranslationsZh）；场景句池对场景表（sceneTranslations 系）。
// 缺口进欠账台账 verify/golden/pool-gap.json（存量记录在案、新增报错）。
//
// 摸底方式：2026-08-13 用并行 agent 逐一追踪 133 个数据导出在
// src/app 里的用途，人工复核后落表。三类不进值表清单：
//   - 宣传语素材池（SPORT_MEM/CULT_MEM/MBTI_INTRO/各 HOOK）：值从不
//     单独显示，只拼进整句宣传语，表条目治不了——修复方案第 4 步在
//     生成器侧解决
//   - 只进提示词、不进界面的值（POSTER_FOOT 等）
//   - 人名词库（NAMES_BY_YEAR 等，汉字+假名是产品设计）、纯 ASCII/
//     数字/权重配置
//
// 已知局限：src/app/main.js 在运行时给 SPORT_MUSCLE/SPORT_BODY 等
// 追加的词条，静态导入取不到，本清单覆盖不了——由修复方案第 2 步的
// 运行时落空收割兜底。
import {
  pools,
  slotDefs,
  FVOCAB,
  ETHNIC_HAIR_WEIGHTS,
  EYE_MIGRATION,
  FACE_EXTRA_DEFAULTS,
  HIGH_TRAIN,
  FRIEND_RELATIONS,
  IKEMEN_AXIS_LABELS,
  SMILE_EYES,
  SMILE_STYLES,
  CHEEK_SMILES,
  MOUTH_CORNERS,
  FOOT_CFG_AXES,
  FOOT_SCENES,
  FOOT_POSTURES,
  FOOT_SHOE_STATES,
  FOOT_FABRICS,
  FOOT_SOCK_STATES,
  FOOT_ANGLES,
  FOOT_OCC_SCENES,
  FOOT_OCC_CAT_SCENES,
  FOOT_PROPS,
  FOOT_WIDTHS,
  FOOT_FEATURES,
  SOLE_TYPES,
  SOLE_WRINKLES,
  TOE_LINES,
  TOE_CURLS,
  OCC_SCENES,
  OCC_CAT_SCENES,
  OCCUPATIONS,
  UNIFORM_WORKWEAR,
  UNIFORM_VARIANTS,
  C_MEASUREMENT_VALUES,
  SPORTS,
  SPORT_BODY,
  SPORT_EXP_POOL,
  SPORT_EXP_WEIGHTS,
  SPORT_MUSCLE,
  TRAINING_LEVELS,
  TRAINING_BODY,
  INNER_DREAMS,
  INNER_DREAM_CAT,
  INNER_DESIRES,
  INNER_WEAK_MIND,
  INNER_WEAK_BODY,
  INNER_TALENTS,
  INNER_UPBRINGINGS,
  INNER_TRAUMAS,
  INNER_PRONOUNS_BASE,
  INNER_LOVE_BASE,
  INNER_LOVE_NOTES,
  INNER_ORIGINS,
  INNER_COMPLEX_GENERIC,
  INNER_HOBBY_GENERIC,
  INNER_HOBBY_BY_VIBE,
  INNER_MYBOOM_MODERN,
  INNER_MYBOOM_COMMON,
  INNER_MYBOOM_RETRO,
  INNER_FOOD_LIKE,
  INNER_FOOD_HATE,
  INNER_HEALTH_BASE,
  INNER_HEALTH_MID,
  INNER_LIVING_SINGLE,
  INNER_LIVING_MARRIED,
  INNER_FRIEND_MEET,
  INNER_FRIEND_FREQ,
  INNER_LOVER_NONE,
  INNER_LOVER_YES,
  INNER_MEMORY_BASE,
  INNER_JP_PREFS,
  INNER_NATION_CITIES,
  INNER_DIALECTS,
  INNER_SPEECH_REGISTER,
  INNER_SPEECH_VOICE,
  INNER_SPEECH_HABITS,
  INNER_PRINCIPLES,
  INNER_UNFORGIVABLES,
  INNER_FASHION_SENSE,
  INNER_LOVE_NOTE_ANY,
  INNER_LOVE_NOTE_F,
  INNER_LOVE_NOTE_M,
  INNER_LOVE_NOTE_BI,
  slotLabelMap,
  FOOT_AXIS_LABEL_ZH,
  FRIEND_REL_EN,
  FRIEND_REL_ZH,
  FRIEND_HIER_EN,
  FRIEND_HIER_ZH,
} from "../src/data/index.js";

const first = (arr) => arr.map((x) => (Array.isArray(x) ? x[0] : x));

// 人名词库直接显示（产品设计）；MBTI 码纯 ASCII；年龄/年代是数字
const POOLS_EXEMPT_KEYS = [
  "surnames",
  "surnamesRare",
  "givenByEra",
  "mbtis",
  "ages",
  "eraYears",
];

// —— 值表清单：值经 displayValue / 下拉选项 / 编辑器词库直接显示，
//    翻译走 valueTranslations（英）/ valueTranslationsZh（中）
export const VALUE_POOLS = [
  {
    name: "pools.*",
    values: () =>
      Object.entries(pools)
        .filter(([k]) => !POOLS_EXEMPT_KEYS.includes(k))
        .flatMap(([, arr]) => first(arr)),
  },
  {
    name: "FVOCAB",
    values: () =>
      Object.values(FVOCAB)
        .flat()
        .map((x) => x[0]),
  },
  {
    name: "ETHNIC_HAIR_WEIGHTS",
    values: () =>
      Object.values(ETHNIC_HAIR_WEIGHTS)
        .flat()
        .map((x) => x[0]),
  },
  {
    name: "EYE_MIGRATION",
    values: () =>
      Object.values(EYE_MIGRATION).flatMap((o) => [
        o.eyelid,
        o.eyeShape,
        o.eyes,
      ]),
  },
  {
    name: "FACE_EXTRA_DEFAULTS",
    values: () => Object.values(FACE_EXTRA_DEFAULTS),
  },
  { name: "HIGH_TRAIN", values: () => HIGH_TRAIN },
  {
    name: "IKEMEN_AXIS_LABELS",
    values: () => Object.values(IKEMEN_AXIS_LABELS),
  },
  { name: "SMILE_EYES", values: () => SMILE_EYES },
  { name: "SMILE_STYLES", values: () => SMILE_STYLES },
  { name: "CHEEK_SMILES", values: () => CHEEK_SMILES },
  { name: "MOUTH_CORNERS", values: () => MOUTH_CORNERS },
  { name: "FOOT_SCENES", values: () => FOOT_SCENES.map((x) => x[0]) },
  { name: "FOOT_POSTURES", values: () => FOOT_POSTURES.map((x) => x[0]) },
  { name: "FOOT_SHOE_STATES", values: () => FOOT_SHOE_STATES },
  { name: "FOOT_FABRICS", values: () => FOOT_FABRICS.map((x) => x[0]) },
  { name: "FOOT_SOCK_STATES", values: () => FOOT_SOCK_STATES.map((x) => x[0]) },
  { name: "FOOT_ANGLES", values: () => FOOT_ANGLES },
  {
    name: "FOOT_OCC_SCENES",
    values: () =>
      Object.values(FOOT_OCC_SCENES)
        .flat()
        .flatMap((r) => [r[0], ...(r[3] || [])]),
  },
  {
    name: "FOOT_OCC_CAT_SCENES",
    values: () =>
      Object.values(FOOT_OCC_CAT_SCENES)
        .flat()
        .flatMap((r) => [r[0], ...(r[3] || [])]),
  },
  { name: "FOOT_PROPS", values: () => Object.values(FOOT_PROPS).flat() },
  { name: "FOOT_WIDTHS", values: () => FOOT_WIDTHS.map((x) => x[0]) },
  { name: "FOOT_FEATURES", values: () => FOOT_FEATURES.map((x) => x[0]) },
  { name: "SOLE_TYPES", values: () => SOLE_TYPES.map((x) => x[0]) },
  { name: "SOLE_WRINKLES", values: () => SOLE_WRINKLES.map((x) => x[0]) },
  { name: "TOE_LINES", values: () => TOE_LINES.map((x) => x[0]) },
  { name: "TOE_CURLS", values: () => TOE_CURLS.map((x) => x[0]) },
  { name: "OCCUPATIONS", values: () => OCCUPATIONS.map((o) => o[0]) },
  {
    name: "UNIFORM_WORKWEAR",
    values: () =>
      Object.values(UNIFORM_WORKWEAR).flatMap((v) =>
        [v[0], v[2], v[3], v[4]].filter(Boolean),
      ),
  },
  {
    name: "UNIFORM_VARIANTS",
    values: () =>
      Object.values(UNIFORM_VARIANTS)
        .flat()
        .flatMap((v) => [v[0], v[2], v[3], v[4], v[7], v[8]].filter(Boolean)),
  },
  { name: "C_MEASUREMENT_VALUES", values: () => C_MEASUREMENT_VALUES },
  { name: "SPORTS", values: () => SPORTS },
  {
    name: "SPORT_BODY",
    values: () =>
      Object.values(SPORT_BODY)
        .flat()
        .map((x) => x[0]),
  },
  { name: "SPORT_EXP_POOL", values: () => SPORT_EXP_POOL },
  {
    name: "SPORT_EXP_WEIGHTS",
    values: () => SPORT_EXP_WEIGHTS.map((x) => x[0]),
  },
  {
    name: "SPORT_MUSCLE",
    values: () =>
      Object.values(SPORT_MUSCLE).flatMap((v) => [v[0], v[2]].filter(Boolean)),
  },
  { name: "TRAINING_LEVELS", values: () => TRAINING_LEVELS.map((x) => x[0]) },
  {
    name: "TRAINING_BODY",
    values: () =>
      Object.values(TRAINING_BODY)
        .flat()
        .map((x) => x[0]),
  },
  {
    name: "INNER_DREAMS",
    values: () =>
      Object.values(INNER_DREAMS)
        .flat()
        .map((x) => x[0]),
  },
  {
    name: "INNER_DREAM_CAT",
    values: () =>
      Object.values(INNER_DREAM_CAT)
        .flat()
        .map((x) => x[0]),
  },
  { name: "INNER_DESIRES", values: () => INNER_DESIRES.map((x) => x[0]) },
  { name: "INNER_WEAK_MIND", values: () => INNER_WEAK_MIND.map((x) => x[0]) },
  { name: "INNER_WEAK_BODY", values: () => INNER_WEAK_BODY.map((x) => x[0]) },
  { name: "INNER_TALENTS", values: () => INNER_TALENTS.map((x) => x[0]) },
  {
    name: "INNER_UPBRINGINGS",
    values: () => INNER_UPBRINGINGS.map((x) => x[0]),
  },
  { name: "INNER_TRAUMAS", values: () => INNER_TRAUMAS.map((x) => x[0]) },
  {
    name: "INNER_PRONOUNS_BASE",
    values: () => INNER_PRONOUNS_BASE.map((x) => x[0]),
  },
  { name: "INNER_LOVE_BASE", values: () => INNER_LOVE_BASE.map((x) => x[0]) },
  { name: "INNER_LOVE_NOTES", values: () => INNER_LOVE_NOTES.map((x) => x[0]) },
  { name: "INNER_ORIGINS", values: () => INNER_ORIGINS.map((x) => x[0]) },
  {
    name: "INNER_COMPLEX_GENERIC",
    values: () => INNER_COMPLEX_GENERIC.map((x) => x[0]),
  },
  {
    name: "INNER_HOBBY_GENERIC",
    values: () => INNER_HOBBY_GENERIC.map((x) => x[0]),
  },
  {
    name: "INNER_HOBBY_BY_VIBE",
    values: () =>
      Object.values(INNER_HOBBY_BY_VIBE)
        .flat()
        .map((x) => x[0]),
  },
  {
    name: "INNER_MYBOOM_MODERN",
    values: () => INNER_MYBOOM_MODERN.map((x) => x[0]),
  },
  {
    name: "INNER_MYBOOM_COMMON",
    values: () => INNER_MYBOOM_COMMON.map((x) => x[0]),
  },
  {
    name: "INNER_MYBOOM_RETRO",
    values: () => INNER_MYBOOM_RETRO.map((x) => x[0]),
  },
  { name: "INNER_FOOD_LIKE", values: () => INNER_FOOD_LIKE.map((x) => x[0]) },
  { name: "INNER_FOOD_HATE", values: () => INNER_FOOD_HATE.map((x) => x[0]) },
  {
    name: "INNER_HEALTH_BASE",
    values: () => INNER_HEALTH_BASE.map((x) => x[0]),
  },
  { name: "INNER_HEALTH_MID", values: () => INNER_HEALTH_MID.map((x) => x[0]) },
  {
    name: "INNER_LIVING_SINGLE",
    values: () => INNER_LIVING_SINGLE.map((x) => x[0]),
  },
  {
    name: "INNER_LIVING_MARRIED",
    values: () => INNER_LIVING_MARRIED.map((x) => x[0]),
  },
  {
    name: "INNER_FRIEND_MEET",
    values: () => INNER_FRIEND_MEET.map((x) => x[0]),
  },
  {
    name: "INNER_FRIEND_FREQ",
    values: () => INNER_FRIEND_FREQ.map((x) => x[0]),
  },
  { name: "INNER_LOVER_NONE", values: () => INNER_LOVER_NONE.map((x) => x[0]) },
  { name: "INNER_LOVER_YES", values: () => INNER_LOVER_YES.map((x) => x[0]) },
  {
    name: "INNER_MEMORY_BASE",
    values: () => INNER_MEMORY_BASE.map((x) => x[0]),
  },
  {
    name: "INNER_JP_PREFS",
    values: () => INNER_JP_PREFS.flatMap((p) => [p[0], ...p[1]]),
  },
  {
    name: "INNER_NATION_CITIES",
    values: () =>
      Object.entries(INNER_NATION_CITIES).flatMap(([n, cs]) => [n, ...cs]),
  },
  {
    name: "INNER_DIALECTS",
    values: () =>
      Object.values(INNER_DIALECTS).flatMap(([n, ps]) => [n, ...ps]),
  },
  {
    name: "INNER_SPEECH_REGISTER",
    values: () =>
      Object.values(INNER_SPEECH_REGISTER)
        .flat()
        .map((x) => x[0]),
  },
  {
    name: "INNER_SPEECH_VOICE",
    values: () => INNER_SPEECH_VOICE.map((x) => x[0]),
  },
  {
    name: "INNER_SPEECH_HABITS",
    values: () => INNER_SPEECH_HABITS.map((x) => x[0]),
  },
  { name: "INNER_PRINCIPLES", values: () => INNER_PRINCIPLES.map((x) => x[0]) },
  {
    name: "INNER_UNFORGIVABLES",
    values: () => INNER_UNFORGIVABLES.map((x) => x[0]),
  },
  {
    name: "INNER_FASHION_SENSE",
    values: () => INNER_FASHION_SENSE.map((x) => x[0]),
  },
  {
    name: "INNER_LOVE_NOTE_ANY",
    values: () => INNER_LOVE_NOTE_ANY.map((x) => x[0]),
  },
  {
    name: "INNER_LOVE_NOTE_F",
    values: () => INNER_LOVE_NOTE_F.map((x) => x[0]),
  },
  {
    name: "INNER_LOVE_NOTE_M",
    values: () => INNER_LOVE_NOTE_M.map((x) => x[0]),
  },
  {
    name: "INNER_LOVE_NOTE_BI",
    values: () => INNER_LOVE_NOTE_BI.map((x) => x[0]),
  },
  // generate.js 足部面板里硬编码的下拉选项字面量（generate.js:2606-2610），
  // 不在任何数据词库里，单独收录
  {
    name: "hardcoded-foot-options",
    values: () => ["職業服装のまま", "私服", "なし"],
  },
];

// —— 场景句清单：值经 sceneDisplay 显示，翻译走场景表
//    （sceneTranslations 英 / sceneTranslationsZh 中）
export const SCENE_POOLS = [
  { name: "OCC_SCENES", values: () => Object.values(OCC_SCENES).flat() },
  {
    name: "OCC_CAT_SCENES",
    values: () => Object.values(OCC_CAT_SCENES).flat(),
  },
];

// —— 键对账清单：这些词库的翻译走专用映射表而非值表；检查「每个键
//    在映射表里语言齐全」（槽位标签缺键正是 2026-08-13 修过的真 bug）
export const KEY_PAIRS = [
  {
    name: "slotDefs → slotLabelMap",
    keys: () => slotDefs.map((d) => d[0]),
    check: (k) =>
      ["ja", "en", "zh"]
        .filter((lang) => typeof slotLabelMap[k]?.[lang] !== "string")
        .map((lang) => `槽位 ${k} 缺 ${lang} 标签`),
  },
  {
    name: "FOOT_CFG_AXES → FOOT_AXIS_LABEL_ZH",
    keys: () => FOOT_CFG_AXES.map((x) => x[0]),
    check: (k) =>
      typeof FOOT_AXIS_LABEL_ZH[k] === "string"
        ? []
        : [`足部配置轴 ${k} 缺中文标签（英文在元组第 3 位、日文在第 2 位）`],
  },
  {
    name: "FRIEND_RELATIONS → FRIEND_REL_EN/ZH",
    keys: () => Object.keys(FRIEND_RELATIONS),
    check: (k) => [
      ...(typeof FRIEND_REL_EN[k] === "string" ? [] : [`好友关系 ${k} 缺英文`]),
      ...(typeof FRIEND_REL_ZH[k] === "string" ? [] : [`好友关系 ${k} 缺中文`]),
    ],
  },
  {
    name: "FRIEND_RELATIONS.hier → FRIEND_HIER_EN/ZH",
    keys: () => [
      ...new Set(
        Object.values(FRIEND_RELATIONS).flatMap((r) =>
          (r.hier || []).concat(r.fixedHier ? [r.fixedHier] : []),
        ),
      ),
    ],
    check: (k) => [
      ...(typeof FRIEND_HIER_EN[k] === "string"
        ? []
        : [`上下关系 ${k} 缺英文`]),
      ...(typeof FRIEND_HIER_ZH[k] === "string"
        ? []
        : [`上下关系 ${k} 缺中文`]),
    ],
  },
];
