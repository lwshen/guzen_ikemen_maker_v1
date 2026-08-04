# Astro 迁移验证方案（基线清单）

基于 commit `07a4795` 的 `index.html`（915KB / 7296 行）生成。迁移过程中任何一项对不上，即说明有遗漏。

## 0. 项目形态（迁移对象）

单文件、零依赖的纯客户端应用：

| 区段       | 行号     | 内容                                                                                                                       |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `<head>`   | 1–6      | `lang="ja"`、charset、viewport、`<title>Guzen Ikemen Maker V3.0.0</title>`（无 favicon、无任何 `<link>`/meta description） |
| `<style>`  | 7–129    | 唯一样式块，约 200 条规则                                                                                                  |
| 静态 HTML  | 130–427  | 4 个主 tab + 初始设置面板 + 页脚版权（425 行）                                                                             |
| `<script>` | 428–7294 | 单个 IIFE（立即执行函数），约 862KB / 312 个函数 / 146 个数据常量                                                          |

已确认为**零**的项（迁移后也必须为零）：外部请求（fetch/XHR/WebSocket）、外部资源（CDN/图片/字体/`<link>`）、`DOMContentLoaded`/window 级监听、HTML 注释、内联事件属性（`onclick=`）、URL/query 参数处理、`<noscript>`、print 样式。

持久化仅两个 localStorage key（字节级不可改动）：

- `guzen-ikemen-maker-v1.results` — 历史记录数组（上限 50，含 `appVersion:'V3.0.0'`、`fav`、`friendOf`/`friendBase`）
- `guzen-ikemen-maker-v1.presets` — 预设快照对象 `{presetName: {selects:{...}, checks:{...}}}`

注意：key 里是 "v1" 而应用版本是 V3.0.0，**这不是笔误，不要顺手改名**，改了老用户历史全部丢失。

## 1. 验证策略：四层防线

### 第 1 层 — 结构等价（静态 diff，全部可脚本化）

对「原 index.html」和「Astro 构建产物 dist/index.html」各跑一遍提取脚本，集合必须相等：

```bash
# id 集合（基线 176 个，无重复）
grep -o 'id="[^"]*"' <file> | sort -u

# data-* 属性名集合（基线 32 个，见附录 C）
grep -o 'data-[a-z-]*[=" ]' <file> | sort -u

# localStorage key 必须原样存在
grep -c "guzen-ikemen-maker-v1.results\|guzen-ikemen-maker-v1.presets" <js>

# head 四要素字节级一致
grep -c 'lang="ja"' ; grep -c '<meta charset="utf-8"' ; grep -c '<title>Guzen Ikemen Maker V3.0.0</title>'

# 页脚版权行字节级一致（注意混用的半角 ( 和全角 ）括号）
grep -c '© DAZ_だいすけ：FOOTHOUSE(AI男子） / Guzen Ikemen Maker V3.0.0'

# 构建后的 CSS 不得被 Astro scope 化
! grep -q ':where(.astro-' dist/**/*.css dist/index.html

# 超长数据行未被格式化工具重排（NAMES_BY_YEAR 单行 10,898 字符）
awk 'length($0)>10000' <js> | wc -l   # 基线 ≥1
```

数据表逐一比对：若把常量抽成模块，写一个 Node 脚本把「旧文件中提取的常量」与「新模块导出」做 deep-equal，并核对附录 A 的条目数（例如 `Object.keys(pools).length === 100`、`OCCUPATIONS.length === 100`、`valueTranslations` 829 个唯一 key、`NAMES_BY_YEAR` 26 个年份）。

### 第 2 层 — 行为等价（种子对拍，金标准）

全应用的非确定性来源只有三处，全部可在测试里固定：

- `Math.random`（生成逻辑全部依赖它）
- `Date.now()` — 仅 `uniqId()`（549 行）
- `new Date().toISOString()` — 仅 `createdAt`（5722–5725 行）

用 Playwright 的 `addInitScript` 在**旧页面和新页面**注入同一个种子化 PRNG（伪随机数生成器，如 mulberry32）替换 `Math.random`，并把 `Date.now`/`Date` 固定为常量，然后：

1. 勾选「instant mode」→ 点 SLOT START；
2. 抓取 7 个 prompt textarea 内容 + `#profileView` 的 innerHTML + rarity 分数；
3. 新旧两边**逐字节比对**；
4. 循环 ≥50 个种子 × ja/en 两种 UI 语言 × 4 种生成模式（full/face/outfit/rare）。

任何数据表被漏抄一行、任何函数被重排（见风险 8），对拍立刻发现。这一层是唯一能证明「6900 行生成逻辑没有语义漂移」的手段。

### 第 3 层 — 视觉回归

断点在 `@media 980px`（×4）、`@media 760px`、`@container 560px`，所以至少两个视口（390px 移动、1280px 桌面）× 4 个主 tab × ja/en，新旧截图 pixel diff。注意：`initialCard` 子卡片静态标记里有 `class="hidden"` 但启动时被 `syncCardSettingsVisibility()` 无条件显示——像素对比必须以**运行后**状态为准，不能拿静态 HTML 说事。

### 第 4 层 — 存量数据兼容

1. 在旧版本保存一条历史 + 一个预设；
2. 同一浏览器、同一 origin 打开迁移后的构建产物；
3. 历史面板必须列出旧记录，预设下拉必须出现旧预设。

⚠️ localStorage 按 origin 隔离：换域名/子域名、或从 `file://` 换到服务器，老数据都拿不回来。路径变化（`/` → `/guzen/`）安全。上线前想清楚部署 origin。

## 2. Astro 特有的高危点（已逐一在源码中确认，非猜测）

| #   | 风险                                                                                                                                                                                                                                                                                             | 源码证据                                                                              | 验证方法                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **高** Astro 默认把 `<script>` 改成 module 打包：strict mode + defer + 可能被提升                                                                                                                                                                                                                | 全文 0 处 DOMContentLoaded；243 处 `getElementById` 依赖脚本位于 body 末尾（7294 行） | 用 `<script is:inline>` 且保持在 body 末尾；构建后开页面，控制台 0 个 `Cannot read properties of null`                                    |
| 2   | **高** Astro scoped style 会废掉大部分 UI：`.history-item`、`.profile-card`、`.subcard` 等约 50 个类**只**出现在运行时 innerHTML（25 处），拿不到 scope class                                                                                                                                    | 样式块 7–129 行 vs 静态 HTML 中零次出现                                               | 必须 `<style is:global>` 或全局 .css 原样引入；断言产物无 `:where(.astro-`；保存一条历史后 `getComputedStyle` 验证 `.history-item` 有样式 |
| 3   | **高** localStorage key 被"现代化"或换 origin                                                                                                                                                                                                                                                    | 430 / 7186 行                                                                         | 第 4 层验证 + grep 两个 key 字节一致                                                                                                      |
| 4   | **中** Prettier / format-on-save 重排数据：49 行超 1000 字符，最长 10,898 字符                                                                                                                                                                                                                   | 1461 行 `NAMES_BY_YEAR`                                                               | 迁移文件加进 `.prettierignore`；格式化后 `git diff` 必须为空；awk 长行检查                                                                |
| 5   | **中** 模板字面量在搬运中被二次包裹损坏：555 行含 `${}`、486 行含反引号、54 行含 `</` 序列                                                                                                                                                                                                       | 如 7074 行 history 渲染器                                                             | JS 移到独立 `.js` 文件（经典 script 引入），**不要**粘进 .astro 模板体（`{}` 会被当表达式）；`node --check` + astro build 零警告          |
| 6   | **中** head 元数据被 starter layout 覆盖：`lang="ja"` 影响汉字字形（Han unification）与字体选择，不是装饰                                                                                                                                                                                        | 2–6 行                                                                                | 构建后断言 lang/charset/viewport/title 四项；注意 starter 会**添加** favicon 和 meta——原文件没有，加不加要显式决定并记录                  |
| 7   | **低** ClientRouter / ViewTransitions 会让所有按钮失灵（事件是一次性命令式绑定，7285–7291 行）                                                                                                                                                                                                   | `[data-fav]` 等在每次 innerHTML 后重绑（7076 行）                                     | 不要引入 ClientRouter；若将来引入，必须在 `astro:page-load` 重新初始化并验证往返导航后按钮仍响应                                          |
| 8   | **高（隐蔽）** 7 组同名函数声明靠 hoisting「后者覆盖前者」：`generateInnerProfile`(4493↔4875)、`buildInnerSection`(4522↔4926)、`chooseInnerLove`(4483↔5283)、`chooseInnerBirthplace`(4708↔5301)、`chooseInnerPast`(4355↔5340)、`chooseInnerResidence`(4823↔5363)、`chooseInnerFriend`(4839↔5385) | 4874 行注释明说「完全版…旧定義を上書き」                                              | 拆模块、重排函数、或 linter 自动修 `no-redeclare` 都会**静默换掉实现**。约 500 行是故意保留的死代码。第 2 层对拍是唯一可靠的捕获手段      |

另两个容易踩的小坑：

- 版本号 `V3.0.0` 除了 4 处静态 HTML，还硬编码在 JS 里并在**启动时覆写 DOM**（1172–1173 行 `applyUiLanguage()` 重写 `.badge` 和 `.title`），只改 HTML 会被启动逻辑悄悄改回去。
- `slotLabelMap` 62 项 vs `slotDefs` 63 项不是漏抄：`skinDetail`/`skinDetail2` 本来就没有 {ja,en} 条目，且 map 里有 1 个不在 slotDefs 的 key。迁移后数字对不上时先查这里。

## 3. 建议的迁移路线（让验证可行）

- **Phase 1 — 原样搬运（lift-and-shift）**：一个 Astro 页面，body HTML 逐字节复制，`<style is:global>` 原样，JS 原样放 `public/app.js` 用经典 `<script src>`（或 `is:inline`）在 body 末尾引入。此时 dist 与原文件可近似 diff，四层验证全部跑通后 commit。已知局限：还没享受任何 Astro 组件化好处——但这是零遗漏风险的锚点。
- **Phase 2 — 数据抽离**：146 个常量逐个（或按组）抽成模块，每抽一个跑 deep-equal + 对拍。注意风险 8 的函数不许动。
- **Phase 3 — 组件化拆分**：HTML 拆组件，每步跑第 1 层 id/data-\* 集合 diff + 第 3 层截图。

每个 Phase 结束提交一次 commit（不要直接提交到 main，先开分支）。

## 3.1 Phase 1 执行结果（2026-08-04，分支 `astro-migration`）

**已完成**：Astro 5 静态项目，`src/pages/index.astro`（head + `<style is:inline>` CSS + body 全部原样）+ `public/app.js`（429–7293 行 JS 原样，经典脚本引入）。提取由 `verify/phase1-extract.py` 机械完成，内置字节级断言，可重跑。`astro.config.mjs` 关闭了 `compressHTML`（默认开启会压缩空白，破坏字节对比——文档此前未列出的坑，已踩实）。

**验证结果（全部通过）**：

| 层               | 结果                                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 第 1 层 结构等价 | 16/16 通过（`npm run verify:structure`）：176 id、data-\* 集合、CSS/body/JS 区域逐字节、footer、双 storage key、无 `:where(.astro-`、10,898 字节长行完好 |
| 第 2 层 行为对拍 | 90/90 场景逐字节一致，0 个 JS 错误（`npm run verify:behavior`）：50 seeds × ja/full + 各 10 seeds 的 en、rare、full+face、full+outfit                    |
| 第 3 层 视觉回归 | 8/8 截图 PNG 字节级相同（390px/1280px × 4 tab）                                                                                                          |
| 第 4 层 存量数据 | 旧版写入的历史+预设在同 origin 的新版中完整呈现，`appVersion:'V3.0.0'` 保留                                                                              |

**与原版的已知差异（HTML 语义等价，非内容丢失）**：

1. Astro 将 void 元素的 `/>` 规范化为 `>`（`<meta ... />` → `<meta ...>`），doctype 变大写 `<!DOCTYPE html>`。
2. JS 从内联 `<script>` 变为同源外链 `/app.js`（多一个 HTTP 请求；总字节数不变）。首屏解析行为一致（经典脚本、位于 body 末尾，第 2 层已验证零空引用错误）。

**已知局限**：尚未组件化、未拆数据模块（Phase 2/3）；verify 脚本依赖仓库根的原版 `index.html` 作为对照基线，勿删；「10,898 字符」实为 awk 按 UTF-8 字节计数，按字符约 4,400——第 1 层脚本已按字节校验。

**注意（本次为 awk/字符差异的教训）**：文档中出现的"字符数"如果来源是 `awk length()`，实际单位是字节。

## 附录 A — 146 个数据常量基线表

| 行号 | 常量                     | 类型    | 条目数 | 内容                                                                                                                                                                 |
| ---- | ------------------------ | ------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 430  | `STORAGE_KEY`            | string  | 0      | 'guzen-ikemen-maker-v1.results' localStorage key name                                                                                                                |
| 504  | `C_MEASUREMENT_VALUES`   | array   | 6      | profile measurement-C label strings                                                                                                                                  |
| 512  | `C_MEASUREMENT_EN`       | map     | 6      | measurement-C JA label -> EN label                                                                                                                                   |
| 524  | `measurementDeckState`   | object  | 6      | runtime state: decks A/B/C (built by deck functions) + indexA/indexB/indexC counters                                                                                 |
| 551  | `pools`                  | object  | 100    | master random pools: surnames, givenByEra, mbtis, ages, heights, bodyType, face parts, hair, outfit, brands, scenes etc. (100 keys, many large arrays/weight tables) |
| 666  | `slotDefs`               | array   | 63     | slot definitions [key, JA label, group] for the 63 character fields                                                                                                  |
| 682  | `slotLabelMap`           | map     | 62     | slot key -> {ja,en} label pairs                                                                                                                                      |
| 689  | `fixedFieldLabelMap`     | map     | 8      | fixed-setting field key -> {ja,en} labels                                                                                                                            |
| 692  | `uiText`                 | object  | 2      | UI string table {ja:{105 keys}, en:{105 keys}}                                                                                                                       |
| 742  | `valueTranslations`      | map     | 829    | JA value -> EN translation string map; literal has 839 key:value pairs but 10 duplicate keys collapse to 829 unique at runtime                                       |
| 867  | `sceneTranslations`      | map     | 41     | JA scene sentence -> EN scene sentence                                                                                                                               |
| 941  | `captionFieldLabelMap`   | map     | 9      | caption field key -> {ja,en} labels                                                                                                                                  |
| 944  | `cardFieldLabelMap`      | map     | 18     | card field key -> {ja,en} labels                                                                                                                                     |
| 947  | `uiCardTitles`           | map     | 7      | data-ui-card id -> {ja,en} panel titles                                                                                                                              |
| 1250 | `els`                    | object  | 9      | DOM element reference lookup (slotGrid, statusPill, rarity, etc.) - not persistable data                                                                             |
| 1461 | `NAMES_BY_YEAR`          | map     | 26     | birth year 2000-2025 -> array of ~49-110 JA male given names (single huge line)                                                                                      |
| 1490 | `NATION_NAMES`           | map     | 23     | nationality -> name pools (given/surname arrays) for non-JP characters                                                                                               |
| 1722 | `OCC_SCENES`             | map     | 100    | occupation -> array of encounter-scene sentences                                                                                                                     |
| 1824 | `OCC_CAT_SCENES`         | map     | 13     | occupation category -> fallback scene sentences                                                                                                                      |
| 2109 | `VIBE_AGE_MAX`           | map     | 9      | vibe type -> max age cap                                                                                                                                             |
| 2126 | `OCCUPATIONS`            | array   | 100    | [name, category, weight..., ageMin, ageMax] tuples for 100 occupations                                                                                               |
| 2147 | `OCC_CAT`                | derived | 100    | initialized {} then filled from OCCUPATIONS.forEach: occupation name -> category (100 entries at runtime)                                                            |
| 2148 | `OCC_CAT_LABELS`         | map     | 13     | category id -> JA label                                                                                                                                              |
| 2149 | `OCC_CAT_ORDER`          | array   | 13     | category display order                                                                                                                                               |
| 2163 | `OCC_MBTI_CAT`           | map     | 4      | category group -> MBTI weight list                                                                                                                                   |
| 2169 | `ATHLETIC_OCC`           | array   | 9      | occupations forcing athletic body                                                                                                                                    |
| 2170 | `SUIT_TYPES`             | array   | 3      | suit outfit names                                                                                                                                                    |
| 2171 | `SCHOOL_TYPES`           | array   | 3      | school uniform outfit names                                                                                                                                          |
| 2183 | `UNIFORM_WORKWEAR`       | map     | 48     | occupation -> uniform/workwear outfit description                                                                                                                    |
| 2233 | `UNIFORM_VARIANTS`       | map     | 5      | occupation -> array of weighted uniform variants                                                                                                                     |
| 2321 | `SPORTS`                 | array   | 16     | sport names                                                                                                                                                          |
| 2322 | `SPORT_BODY`             | map     | 28     | sport -> body-type weight adjustments                                                                                                                                |
| 2359 | `VIBE_OCC`               | map     | 14     | vibe -> occupation weight table                                                                                                                                      |
| 2410 | `ETHNIC_HAIR_WEIGHTS`    | map     | 16     | ethnicity -> hair color/style weights                                                                                                                                |
| 2428 | `STRICT_HAIR_OCC`        | array   | 16     | occupations with conservative hair rules                                                                                                                             |
| 2429 | `FREE_HAIR_OCC`          | array   | 11     | occupations allowing free hair styles                                                                                                                                |
| 2460 | `SPORT_EXP_POOL`         | array   | 27     | sports-history sport names                                                                                                                                           |
| 2461 | `SPORT_STAGES`           | array   | 6      | school stages for sports history                                                                                                                                     |
| 2489 | `SPORT_EXP_WEIGHTS`      | array   | 27     | [sport, weight] pairs for sports history                                                                                                                             |
| 2542 | `SPORT_MUSCLE`           | map     | 27     | sport -> muscle development description                                                                                                                              |
| 2571 | `SPORT_SKELETON`         | map     | 12     | sport -> skeleton/build description                                                                                                                                  |
| 2638 | `TRAINING_LEVELS`        | array   | 10     | [level name, weight] training level table                                                                                                                            |
| 2644 | `TRAINING_DESC`          | map     | 9      | training level -> {ja,en} description                                                                                                                                |
| 2675 | `TRAINING_BODY`          | map     | 6      | training level -> body-type weight adjustments                                                                                                                       |
| 2683 | `TRAINING_EXCL`          | map     | 5      | training level -> excluded body types                                                                                                                                |
| 2697 | `BODY_ASYMS`             | array   | 7      | [body asymmetry text, weight] pairs                                                                                                                                  |
| 2698 | `POSTURES`               | array   | 6      | [posture text, weight] pairs                                                                                                                                         |
| 2699 | `BODY_ASYM_EN`           | map     | 6      | asymmetry JA -> EN                                                                                                                                                   |
| 2700 | `POSTURE_EN`             | map     | 6      | posture JA -> EN                                                                                                                                                     |
| 2758 | `SPORT_MEM`              | map     | 28     | sport -> memory/anecdote phrases for catchphrase                                                                                                                     |
| 2788 | `CULT_MEM`               | map     | 12     | culture club -> memory phrases                                                                                                                                       |
| 2802 | `MBTI_INTRO`             | map     | 16     | MBTI -> intro phrase                                                                                                                                                 |
| 2812 | `OCC_HOOK`               | map     | 18     | occupation -> catchphrase hook                                                                                                                                       |
| 2832 | `OCC_CAT_HOOK`           | map     | 11     | occupation category -> catchphrase hook                                                                                                                              |
| 2845 | `ERA_HOOK`               | map     | 8      | era band -> catchphrase hook                                                                                                                                         |
| 2855 | `BRIDGE_HOOK`            | map     | 10     | bridge phrases for catchphrase                                                                                                                                       |
| 2862 | `TRAIN_HOOK`             | map     | 7      | training level -> catchphrase hook                                                                                                                                   |
| 3032 | `EYE_MIGRATION`          | map     | 6      | legacy eye value -> new value migration map                                                                                                                          |
| 3156 | `BRAND_SINCE`            | map     | 127    | clothing brand -> founding year (era-consistency filter)                                                                                                             |
| 3382 | `UNDERWEAR_COLOR_EN`     | map     | 13     | underwear color JA -> EN                                                                                                                                             |
| 3412 | `FOOT_CFG_AXES`          | array   | 8      | [axisKey, JA label, EN label] foot-config axes                                                                                                                       |
| 3413 | `FOOT_SCENES`            | array   | 14     | foot scene options                                                                                                                                                   |
| 3416 | `FOOT_COZY`              | array   | 7      | cozy scenes allowing relaxed postures                                                                                                                                |
| 3417 | `FOOT_POSTURES`          | array   | 13     | sitting posture options                                                                                                                                              |
| 3420 | `FOOT_SHOE_STATES`       | array   | 7      | shoe placement states                                                                                                                                                |
| 3421 | `FOOT_FABRICS`           | array   | 5      | sock fabric options                                                                                                                                                  |
| 3428 | `FOOT_SOCK_STATES`       | array   | 4      | sock wear states                                                                                                                                                     |
| 3431 | `FOOT_ANGLES`            | array   | 3      | camera angle options                                                                                                                                                 |
| 3432 | `FOOT_OCC_SCENES`        | map     | 5      | occupation -> foot scene pools                                                                                                                                       |
| 3455 | `FOOT_SCENE_MIGRATION`   | map     | 6      | legacy foot scene -> new scene migration                                                                                                                             |
| 3463 | `FOOT_OCC_CAT_SCENES`    | map     | 3      | occupation category -> foot scenes                                                                                                                                   |
| 3474 | `FOOT_PROPS`             | map     | 3      | scene key ('generic' + 2 scenes) -> prop lists (single long line)                                                                                                    |
| 3524 | `POSTER_FOOT`            | map     | 7      | occupation -> poster-style foot scene config                                                                                                                         |
| 3635 | `FOOT_WIDTHS`            | array   | 4      | foot width options with weights                                                                                                                                      |
| 3659 | `FOOT_FEATURES`          | array   | 25     | foot feature descriptions                                                                                                                                            |
| 3686 | `SOLE_TYPES`             | array   | 12     | sole type descriptions                                                                                                                                               |
| 3700 | `SOLE_WRINKLES`          | array   | 3      | sole wrinkle levels                                                                                                                                                  |
| 3705 | `TOE_LINES`              | array   | 10     | toe line shapes                                                                                                                                                      |
| 3717 | `TOE_CURLS`              | array   | 3      | toe curl states                                                                                                                                                      |
| 3861 | `FACE_EXTRA_DEFAULTS`    | object  | 12     | default values for extended face fields (jawChin, ear, forehead, hairline...)                                                                                        |
| 4245 | `INNER_DISPLAY_KEYS`     | array   | 12     | inner-life field keys shown in profile                                                                                                                               |
| 4259 | `INNER_DREAMS`           | map     | 5      | dream category -> dream string pools                                                                                                                                 |
| 4266 | `INNER_DREAM_CAT`        | map     | 6      | occupation category -> dream category                                                                                                                                |
| 4267 | `INNER_DESIRES`          | array   | 41     | weighted desire entries                                                                                                                                              |
| 4271 | `INNER_WEAK_MIND`        | array   | 40     | mental weakness entries                                                                                                                                              |
| 4275 | `INNER_WEAK_BODY`        | array   | 31     | physical weakness entries                                                                                                                                            |
| 4279 | `INNER_TALENTS`          | array   | 48     | hidden talent entries                                                                                                                                                |
| 4282 | `INNER_UPBRINGINGS`      | array   | 30     | upbringing entries                                                                                                                                                   |
| 4286 | `INNER_TRAUMAS`          | array   | 24     | past trauma entries                                                                                                                                                  |
| 4289 | `INNER_PRONOUNS_BASE`    | array   | 14     | [pronoun, weight] first-person pronoun table                                                                                                                         |
| 4290 | `INNER_LOVE_BASE`        | array   | 7      | [orientation, weight(, rareFlag)] table                                                                                                                              |
| 4291 | `INNER_LOVE_NOTES`       | array   | 28     | weighted love preference notes                                                                                                                                       |
| 4292 | `INNER_ORIGINS`          | array   | 36     | origin/backstory entries                                                                                                                                             |
| 4295 | `INNER_COMPLEX_GENERIC`  | array   | 40     | complex/insecurity entries                                                                                                                                           |
| 4299 | `INNER_BLOOD_DIST`       | map     | 27     | nationality -> blood type distribution weights                                                                                                                       |
| 4302 | `INNER_RHNEG`            | derived | 0      | arrow fn: nationality regex (10 Asian nations) -> Rh- probability; data encoded in regex                                                                             |
| 4378 | `INNER_INCOME_TABLE`     | array   | 36     | [matcher, incomeMin, incomeMax] income lookup rows                                                                                                                   |
| 4540 | `INNER_EDIT_POOLS`       | derived | 14     | ()=>({...}) factory returning 14 edit pools for inner-field re-roll UI                                                                                               |
| 4570 | `INNER_HOBBY_GENERIC`    | array   | 60     | [hobby, weight] generic hobby table                                                                                                                                  |
| 4571 | `INNER_HOBBY_BY_VIBE`    | map     | 14     | vibe -> hobby weight table                                                                                                                                           |
| 4572 | `INNER_MYBOOM_MODERN`    | array   | 20     | weighted modern my-boom entries                                                                                                                                      |
| 4573 | `INNER_MYBOOM_COMMON`    | array   | 18     | weighted era-neutral my-boom entries                                                                                                                                 |
| 4574 | `INNER_MYBOOM_RETRO`     | array   | 8      | weighted retro my-boom entries                                                                                                                                       |
| 4575 | `INNER_FOOD_LIKE`        | array   | 50     | [food, weight] liked foods                                                                                                                                           |
| 4576 | `INNER_FOOD_HATE`        | array   | 40     | [food, weight] disliked foods                                                                                                                                        |
| 4577 | `INNER_HEALTH_BASE`      | array   | 8      | weighted health status (young)                                                                                                                                       |
| 4578 | `INNER_HEALTH_MID`       | array   | 9      | weighted health status (middle-aged)                                                                                                                                 |
| 4579 | `INNER_LIVING_SINGLE`    | array   | 8      | weighted living situation (single)                                                                                                                                   |
| 4580 | `INNER_LIVING_MARRIED`   | array   | 6      | weighted living situation (married)                                                                                                                                  |
| 4581 | `INNER_FRIEND_MEET`      | array   | 17     | weighted how-met-best-friend entries                                                                                                                                 |
| 4582 | `INNER_FRIEND_NAMES`     | array   | 18     | friend name (katakana) pool                                                                                                                                          |
| 4583 | `INNER_FRIEND_FREQ`      | array   | 8      | weighted friend meet frequency                                                                                                                                       |
| 4584 | `INNER_LOVER_NONE`       | array   | 7      | weighted no-lover statuses                                                                                                                                           |
| 4585 | `INNER_LOVER_YES`        | array   | 7      | weighted has-lover statuses                                                                                                                                          |
| 4586 | `INNER_MEMORY_BASE`      | array   | 19     | weighted school memory entries                                                                                                                                       |
| 4587 | `INNER_JP_PREFS`         | array   | 47     | [prefecture, [cities], weight, tags] all 47 JP prefectures                                                                                                           |
| 4596 | `INNER_NATION_CITIES`    | map     | 26     | nationality -> array of home cities                                                                                                                                  |
| 4597 | `INNER_DIALECTS`         | map     | 9      | dialect region key -> dialect info                                                                                                                                   |
| 4598 | `INNER_SPEECH_REGISTER`  | map     | 3      | speech register key -> description                                                                                                                                   |
| 4599 | `INNER_SPEECH_VOICE`     | array   | 12     | weighted voice quality entries                                                                                                                                       |
| 4600 | `INNER_SPEECH_HABITS`    | array   | 32     | weighted verbal habit entries                                                                                                                                        |
| 4850 | `INNER_DEPS`             | map     | 11     | inner field -> dependent fields (re-roll cascade graph)                                                                                                              |
| 4922 | `INNER_CATS`             | array   | 6      | [catKey, JA title, EN title, cssId] inner-profile categories                                                                                                         |
| 5114 | `INNER_PRINCIPLES`       | array   | 35     | personal principle/motto entries                                                                                                                                     |
| 5119 | `INNER_UNFORGIVABLES`    | array   | 30     | things-he-cannot-forgive entries                                                                                                                                     |
| 5279 | `INNER_LOVE_NOTE_ANY`    | array   | 31     | weighted love notes (any orientation)                                                                                                                                |
| 5280 | `INNER_LOVE_NOTE_F`      | array   | 12     | weighted love notes (likes women)                                                                                                                                    |
| 5281 | `INNER_LOVE_NOTE_M`      | array   | 12     | weighted love notes (likes men)                                                                                                                                      |
| 5282 | `INNER_LOVE_NOTE_BI`     | array   | 6      | weighted love notes (bi)                                                                                                                                             |
| 5400 | `INNER_KANA2KANJI`       | map     | 18     | katakana friend name -> kanji spelling candidates                                                                                                                    |
| 5476 | `INNER_FIELD_GEN`        | map     | 40     | inner field key -> generator function (re-roll dispatch table, single long line)                                                                                     |
| 6157 | `DICE_GROUPS`            | map     | 8      | dice button group -> slot keys re-rolled together                                                                                                                    |
| 6167 | `FRIEND_RELATIONS`       | map     | 6      | relation name -> constraint config (sameRole, age delta...)                                                                                                          |
| 6175 | `FRIEND_HIER_DELTA`      | map     | 4      | hierarchy label -> age delta range                                                                                                                                   |
| 6176 | `FRIEND_REL_EN`          | map     | 6      | relation JA -> EN                                                                                                                                                    |
| 6177 | `FRIEND_HIER_EN`         | map     | 4      | hierarchy JA -> EN                                                                                                                                                   |
| 6295 | `RARE_RULES`             | array   | 31     | [label, points, matcher] rarity scoring rules                                                                                                                        |
| 6334 | `IKEMEN_DELTAS`          | map     | 17     | face/body axis -> handsome-score value deltas (weight table)                                                                                                         |
| 6353 | `IKEMEN_AXIS_LABELS`     | map     | 17     | axis key -> {ja,en} labels                                                                                                                                           |
| 6387 | `BODYHAIR_KEYS`          | array   | 11     | body hair slot keys (overall + 10 areas)                                                                                                                             |
| 6664 | `UNIFORM_NAME_MIGRATION` | map     | 5      | legacy uniform name -> new name migration map                                                                                                                        |
| 6745 | `FRIEND_PAIR_COUNTS`     | array   | 5      | friend-pair image count options '1枚'-'5枚'                                                                                                                          |
| 7083 | `PROMPT_PANES`           | array   | 7      | [paneKey, elementId] prompt tab definitions                                                                                                                          |
| 7174 | `accCollapsed`           | object  | 0      | runtime UI state: accordion collapse flags, starts empty                                                                                                             |
| 7185 | `catCollapsed`           | object  | 0      | runtime UI state: category collapse flags, starts empty                                                                                                              |
| 7186 | `PRESET_KEY`             | string  | 0      | 'guzen-ikemen-maker-v1.presets' localStorage key name                                                                                                                |

## 附录 B — 功能清单（迁移后逐项人工/自动走查）

迁移后每项打勾（建议优先做成 Playwright 用例，其余人工走查）：

- [ ] **Slot-machine character generation (SLOT START)**（Slot tab / command bar）— startBtn -> spin(): generateCharacter(mode) honoring fixed conditions + initial settings; per-slot animation of 8 random preview frames at 35ms then final value with 80ms stagger; status pill cycles 待機中/Waiting -> 回転中/Spinning -> 完成/Done; auto-switches to Result tab when done; guarded by `spinning` flag
- [ ] **Slot grid: 63 slots in 7 collapsible categories**（Slot tab）— slotDefs: basic(10 incl. name/age/era/nationality/ethnicity/role/sportsHistory/sportName/vibe/mbti), body(5), bodyhair(11), face(21 incl. skinDetail 1&2), hair(2), outfit(7), feet(7 socks/shoes). Category headers (data-cathead) toggle collapse; state kept in catCollapsed across re-renders
- [ ] **Instant mode (skip animation)**（Command bar）— instantMode checkbox; when checked spin() writes values immediately without the spin animation
- [ ] **Per-slot LOCK**（Slot tab）— data-lock button toggles locks[key]; locked slots keep current value on spin; button text LOCK/LOCKED; slot gets .locked class; resetLocksBtn clears all locks; rerollUnlockedBtn re-spins only unlocked
- [ ] **Per-slot dice reroll**（Slot tab）— data-dice -> rerollOne(key): generates a fresh character and copies DICE_GROUPS[key] cascade (height->heightRaw/weight/footSize; bodyType->weight; sockType->color/shape/material; outfitType->entire outfit+socks; holidayOutfitType likewise; mbti->personality; nationality->ethnicity+name; age->ageAppearance+name); sportsHistory has dedicated regenerator
- [ ] **Per-slot inline editor**（Slot tab）— data-edit (all slots except name-only has no ✎? actually name excluded) -> openSlotEditor: inline <select> from slotEditPool (name: 12 generated candidates by nationality/era; height 155-196cm; weight 45-110kg; footSize 25.5-31cm step .5; role uses grouped occupation options); onchange -> applySlotEdit with side-effects (height recalcs weight+footSize unless footSizeManual; bodyType recalcs weight; mbti updates personality; age/role/nationality regenerate dependent inner-profile fields); blur closes
- [ ] **sportsHistory structured editor**（Slot tab + profile）— Special editor: 2 sport rows x (sport / start stage / end stage / body-influence strength incl. auto), stages capped by age; Save/Cancel buttons; note that fixed height/body type are unchanged
- [ ] **Generation modes**（Slot tab aside 'Modes'）— data-mode buttons full/face/outfit/rare (完全ランダム/顔だけ/服装だけ/レア設定); active button restyled (blue for full, primary otherwise); modeNote shows current mode; face/outfit modes animate only their categories but a full new character is generated for other fields
- [ ] **Rarity panel**（Slot tab aside）— scoreRarity sums ~30 RARE_RULES (tall 183+, big feet 29/30/31cm+, rare socks, pre-war era, foreign nationality, 8-head proportions, parallel double eyelid x almond eyes, rare MBTI/occupations, etc.); tiers NORMAL <10, RARE >=10, SUPER RARE >=24, LEGEND >=40; shows pt score pill + tier + tier note
- [ ] **Group generation (2+ members)**（Initial settings 生成モード + spin）— If groupSize>1 and mode=full: picks group setting by age/era (e.g. サークル仲間), members generated with buildGroupCtx (age center, leader nationality/vibe, MBTI-weighted picks, avoid-lists) and a too-similar retry (>=3 identical of facePreset/eyes/nose/faceLine/hairStyle, up to 2 retries); assignPositions gives unique roles (リーダー格/ムードメーカー/クール担当/しっかり者/いじられ役/マイペース担当); currentGroup.promptMode from initialGroupPromptMode
- [ ] **Member tabs**（Result tab）— memberTabs shows 👤N firstname｜position buttons when currentGroup has 2+ members; clicking sets activeMember and current=that member; hidden otherwise
- [ ] **Group prompt output modes**（Result tab prompts）— Separate mode: extra 👥集合写真 prompt tab with buildGroupPrompt (group photo, member blocks, distinction block, era/scene). Combined mode (1つの指示文にまとめて生成): main/outfit/outfitHoliday/scene/derived boxes are replaced by group variants (buildGroupMainPrompt lineup sheet, buildGroupOutfitPrompt weekday/holiday, buildGroupCardPrompt for trading card) and the group tab/section hides
- [ ] **Completed profile view**（Result tab）— renderProfile: catchphrase line (per catchphraseMode), bio hook with 🎲 reroll + name-kana/height/weight/foot line, A/B/C measurements panel (profile-only, per-row 🎲, never in prompts), badge row (MBTI, prompt target, card style/rarity), rarity breakdown card with +pt pills, optional Handsome Index card (0-100 from 19 facial axes with per-axis pills, opt-in via initialIkemenIndex), then profile cards: basic / inner / face / body / bodyhair / main clothing / outfit / output / scene; also backfills missing fields on legacy/imported characters (migration defaults)
- [ ] **Per-profile-row edit and reroll**（Result tab profile）— Each row can carry data-p-edit (multi-key editor: one select per key + OK/✕ buttons, applied via applySlotEdit) and data-p-dice (rerollProfile with ~40 field-specific rerollers: skin details pair, sceneIdea, faceSpacing, footFeature, face extras, trainingLevel, sportsHistory, bioText, measurements A/B/C, baseWearType/boxerColor, sole/toe axes, muscleTone recompute, frame axes, hipShape, teeth, bodyHairAll, ~40 inner-profile fields, role cascade re-rolling entire occupation+outfit)
- [ ] **Inner (hidden) profile with 6 categories**（Result tab, above prompt tabs）— 32-item inner profile (birthdate, hometown, blood type, pronoun, speech, nickname, marital, partner, family, living, residence, roots, education, income, assets, health, hobby, my-boom, foods, principle, dream, desire, weaknesses, talent, complex, unforgivable, past, friend, lover, adult-topics etc.) grouped into 🪪basic/🏠life/☕daily/💭mind/🕰past/🌙adult; data-icat buttons toggle each category, data-icat-all shows/hides all; per-row 🎲; all default hidden
- [ ] **Create inner friend for real**（Inner profile 'friend' row）— data-make-friend button (only when current has no friendOf) -> makeInnerFriend(): parses relation from friendText/\_friendSeed, presets the friend panel selects, calls createFriend with seeded age/name, and sets nickname (given-name kana, 呼び捨て) on the new character
- [ ] **Friend creation panel**（Result tab toolbar 👥友人を作成）— friendBtn toggles panel (alert saveFirst if no result); relation select (同僚/同期/同級生/幼なじみ/趣味仲間/学生時代からの友人) with conditional hierarchy select (上司/先輩/同い年/後輩; hidden for fixed-hier relations); friendGoBtn -> createFriend: age delta by hierarchy (e.g. 上司 +6..15), 90% same nationality, same role when relation demands (retry up to 8 for different role otherwise), original auto-saved to history, new character gets friendOf + friendBase, panel hides, status shows friendDone
- [ ] **Friend two-shot prompt pane**（Prompt tab 🤝友人ツーショット）— Tab appears only when current.friendBase exists; wear select 私服/職業服装 and output count 1-5枚 stored on current (friendPairWear/friendPairCount); warn pill '⚠ attach both base card images'; buildFriendPairPrompt; own copy button + char count
- [ ] **Prompt tabs bar**（Result tab）— renderPromptTabs: 🪪main / 🎨derived / 👔outfit / 👕outfitHoliday / 🎬scene / 🤝friendPair (conditional) / 👥group (conditional: group of 2+ with separate mode); active tab falls back to main if its condition disappears; per-pane description text from T('promptDescs'); STEP1→STEP2 flow guide highlights step 1 for main, step 2 otherwise
- [ ] **Derived output type picker**（Derived pane）— 10 grid buttons with icon+label+description (trading card, magazine page, character profile sheet, street-work sheet, street-off sheet, poster, outfit reference sheet, foot-focus scene sheet, blueprint sheet, handoff reference sheet) + 'other formats…' select for remaining outputTypes; selection stored in `derivedType` (defaults to non-16:9 initial outputType, else trading card); label line shows icon+name+description; copy button caption changes to the selected type (unless mid-copied-flash)
- [ ] **Card settings relocation + conditional panels**（Derived pane）— manualCard settings subcard is physically appended into derivedCardSettingsSlot and only visible when derived type = trading card; profileSheetCfg (wear: 職業服装/私服 -> current.profileSheetWear) only for profile sheet; footSceneCfg only when refSheetKind===feet
- [ ] **Foot-focus scene detail config**（Derived pane footSceneCfg）— Per-axis selects built from FOOT_CFG_AXES, each defaulting ランダム (left to the image AI); changes stored in current.footScene; footCfgDiceBtn 🎲 rolls all axes with situation-aware weights (barefoot/mid-removal low probability) via resolveFootCfg; footCfgResetBtn ↺ sets footScene=null (all random)
- [ ] **Copy buttons with flash state**（All prompt panes）— 7 copy buttons (copyPromptBtn, copyDerivedBtn, copyOutfitBtn, copyOutfitHolidayBtn, copySceneBtn, copyFriendPairBtn, copyGroupBtn) use navigator.clipboard.writeText then flashCopied: text -> '✓ コピーしました/✓ Copied!', .copied class, reverts to T('copyLabel') after 1600ms (note: derived button reverts to generic label, later re-labelled by renderPromptTabs)
- [ ] **Character counts under prompt boxes**（All prompt panes）— updateCharCounts writes '{len}文字' / '{len} chars' under each of the 7 textareas; empty when box empty
- [ ] **Manual output settings (post-spin)**（Result tab right column subcards）— manualOutputType/Count/Quality/Background/Lighting/PromptLanguage/PromptTarget/CaptionMode selects + caption-field checkboxes + card settings (style, rarity incl. おすすめ自動→suggestCardRarity, theme, layout, wear mode, effect select disabled & auto-derived from rarity) + card-field checkboxes; every change writes onto `current` and re-renders all prompts; values synced back from current on each renderProfile
- [ ] **Initial settings panel**（Above tabs (visible on slot & settings tabs)）— 4 subcards: 基本設定 (~17 selects: nationality, ethnicity, age min/max with auto swap if min>max, vibe, 生成モード group size, occupation + occupation influence, catchphrase mode, derived prompt mode 参照画像前提/単体完結, season, イケメン指数 show/hide, body-hair mode detailed/simple, training habit, sports body influence x0.5/x1.5/off, height base +6/+10cm, group prompt mode, era year), 出力設定 (background, lighting, quality, output type, base underwear mode incl. 時代に合った下着 which generates era underwear, count, prompt language 日本語/English, prompt target), 画像内プロフィール表記 (caption mode, prompt optimization auto/full/compressed, bio caption, 9 caption-field checkboxes), カード差分プロンプト設定 (5 selects + disabled effect + 12 card-field checkboxes); not randomized — flows directly into prompts
- [ ] **Settings chips (command bar summary)**（Command bar）— renderSettingChips shows 5 chips: Era/年代, Mode/モード, Underwear/下着, Output/出力 (truncated), Occupation influence/職業影響; clicking any chip smooth-scrolls to the initial-settings panel; refreshed on change of any select/input inside section.panel
- [ ] **Presets (initial settings snapshots)**（Initial settings preset bar）— presetName input (max 24 chars) + 設定を保存 (alert if name empty, snapshot all [id^=initial] selects/inputs + initial-scope caption/card checkboxes, alert saved) + preset select + 読み込み (applySnapshot) + 削除; stored in localStorage 'guzen-ikemen-maker-v1.presets'
- [ ] **Accordions**（All .subcard h3 headers）— initAccordions appends ▼ arrow and click-to-toggle .collapsed on each subcard; state kept in accCollapsed keyed by data-ui-card so it survives language re-init
- [ ] **Main app tabs**（Nav）— 4 tabs: スロット/結果・画像指示文/保存結果/条件固定; switchTab toggles .active and hides other panels; initialPanel only visible on slot & settings tabs; slotAside only on slot tab
- [ ] **Save result to history**（Result toolbar 結果を保存）— saveCurrent: alert saveFirst if none; unshifts {...current, appVersion:'V3.0.0'} into localStorage 'guzen-ikemen-maker-v1.results', capped at 50; alert saved; re-renders history
- [ ] **History list with favorites**（保存結果 tab）— renderHistory: favorites (fav flag) sorted first, then insertion order; each item: ★ prefix + name/age/height/bodyType, face/outfit/sock/rarity summary, version mini-badge, ☆/★ toggle button (persists immediately), 読み込む button (loads as current, clears group, switches to result tab); empty-state notice
- [ ] **Clear history**（保存結果 tab）— clearHistoryBtn -> confirm(T('confirmClear')) then localStorage.removeItem(STORAGE_KEY) and re-render
- [ ] **Export JSON**（Result toolbar）— downloadJson: Blob of current (pretty JSON) via URL.createObjectURL + a.click(), filename guzen-ikemen-result.json, URL revoked after
- [ ] **Import JSON**（Result toolbar）— importBtn clicks hidden file input; FileReader.readAsText; array -> merged in front of history (cap 50); single object with height/name -> loaded as current + switch to result; alert importedMsg on success, 'JSON parse error' alert on failure; input value reset so same file can be re-imported
- [ ] **Restore from prompt text**（保存結果 tab top）— restoreCodeInput textarea + 読み込む: parseCharFromPrompt regex-extracts name/era/age/height/weight/footSize/MBTI/tearBags/etc. from a pasted Japanese base-card prompt; temporarily sets occupation/era selects, generates a full character then overlays parsed fields, new id, switches to result, status restoreDone; alerts restoreNotFound/restoreFailed; JA prompts only (EN and derived formats unsupported per note)
- [ ] **Fixed-condition form**（条件固定 tab）— initFixedForm builds 8 selects (age, nationality, ethnicity, bodyType, facePreset, vibe, MBTI, outfitType), each defaulting ランダム and re-populated preserving selection on language switch; getFixed() feeds non-random values into generateCharacter on SLOT START
- [ ] **Language toggle (app UI)**（Header メーカー言語 select）— makerLanguage ja/en sets uiLang and calls applyUiLanguage: sets <html lang>, re-labels every static element (tabs, buttons, titles, notices, field labels via T('fieldLabels'), checkbox labels, subcard titles), then rebuilds initSlots/initFixedForm/initManualControls/initInitialSettings and renderAll; separate from prompt language (指示文言語 controls generated prompt text JA/EN)
- [ ] **Prompt target chip**（Prompt area header）— promptAreaTarget pill shows '⚡ {promptTarget} ・ {language}' when a result exists, hidden otherwise
- [ ] **Scene idea free-text editor**（Profile 偶然見かけた場面 card）— ✎ button swaps the scene value for a textarea seeded with current.sceneIdea; blur commits trimmed text, Escape cancels via renderAll; 🎲 regenerates via buildEncounterScene
- [ ] **Uniform / headwear inline selects**（Profile outfit card）— data-uniform-edit select applies uniform variant (applyUniformVariant); data-headwear-edit select toggles current.headwearOn (着帽する/着帽しない)
- [ ] **Main underwear mode side-effects**（Initial settings 基準服装（下着））— onchange with a current result: sets current.mainWearMode; selecting 時代に合った下着の種類 generates era-appropriate underwearType/Color, otherwise clears them
- [ ] **Card rarity auto-suggestion**（Card settings）— cardRarity 'おすすめ自動' resolves via suggestCardRarity (score-based N/R/SR/SSR/UR/Secret/Legendary); effect select is always disabled and derived via cardEffectByRarity (ホログラム風/箔押し風/キラ加工風/光沢風/フレーム強調/角丸カード風/なし); initial-panel rarity change updates the disabled effect select
- [ ] **Empty-result state**（Result tab）— Without a spin: profile shows 'まだ結果がありません。/No result yet.', prompt boxes emptied; save/copy-dependent actions alert saveFirst
- [ ] **Status pill / done styling**（Slot tab header）— statusPill text driven by T(waiting/spinning/done/friendDone/restoreDone); slots get .spin during animation and .done after reveal

## 附录 C — DOM 契约基线

- 静态唯一 id：**176**；JS 字面量引用 id：**143** + 3 个动态前缀族（`tab-`+、`slot-`+、`desc-`+）
- JS 引用但静态 HTML 不存在的 id：`cardPromptBox`（6927 行，有 null guard，属遗留引用，无害）；`slot-<key>` 族由 1570 行模板动态创建
- 内联事件属性（onclick= 等）：**0**
- 无障碍属性（aria-\*/role/tabindex/alt）：**0**（已确认，迁移不必"补上"，但也不能声称是回归）
- 导入文件输入框的 `accept="application/json"`（280 行）需保留

data-\* 属性全集（32 个，其中 `data-acc-bound` 只经 JS 的 dataset 设置、`data-chip` 等 5 个是模板字面量里的无值属性，纯 grep 静态 HTML 找不到）：

`data-acc-bound`, `data-caption-field`, `data-caption-label`, `data-caption-scope`, `data-card-field`, `data-card-label`, `data-card-scope`, `data-cat`, `data-cathead`, `data-chip`, `data-dice`, `data-dtype`, `data-edit`, `data-fav`, `data-fixed`, `data-flow`, `data-foot-axis`, `data-headwear-edit`, `data-icat`, `data-icat-all`, `data-load`, `data-lock`, `data-make-friend`, `data-member`, `data-mode`, `data-p-dice`, `data-p-edit`, `data-ptab`, `data-scene-edit`, `data-tab`, `data-ui-card`, `data-uniform-edit`

动态渲染宿主（innerHTML 目标，样式类必须保持全局可见）：`#slotGrid`、`#fixedForm`、`#historyList`、`#profileView`、`#promptTabs`、`#memberTabs`、`#innerAboveTabs`、`#footCfgForm`、`#derivedTypeGrid`/`#derivedTypeSel`、`#settingChips`，另有约 21 处 insertAdjacentHTML/createElement。

动态拼接的类名家族（grep 单个完整类名找不到，重构时最易误删）：`pc-${key}`、`icat-${k}`、`icv-${k}`、`rarity-${r}`、以及字符串拼接的 ` active`、` on`、` collapsed` 后缀。

## 附录 D — CSS 基线

- 规则数 ≈ **200**（209 个 `{` − 7 个 at-rule − 2 个 keyframe step）
- `:root` 变量 12 个（`--bg`…`--white`）+ 非 root 的 `--accent`；注意 `--gold` 被 **JS 注入的内联样式**引用（7035 行），变量必须留在全局
- `@media(min-width:980px)`×4、`@media(min-width:760px)`×1、`@container(min-width:560px)`×1（依赖 `.profile-card` 的 `container-type:inline-size`）、`@keyframes pulse`×1
- 版本注释标记 3 个：`V1.9.1 A案 UI`（16 行）、`V1.6.1 graphical UI`（53 行）、`V2.8 線画プレビュー`（128 行，空标记，代码在 JS 里）
- `.faved` 类被 JS 使用但**没有** CSS 规则——迁移后别当 bug"修"出样式来
