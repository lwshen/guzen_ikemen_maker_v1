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

## 3.2 Phase 2 执行结果（2026-08-04，分支 `astro-migration`）

**已完成**：数据与逻辑分离。`verify/phase2-extract-data.mjs` 用字符串/模板字面量感知的解析器扫描 app.js 的 160 个顶层 `const`，**机械判定**可抽取性（初始化器能在空 vm 沙箱求值 + 不含函数 + ≥40 字符），把 **132 个纯数据常量**（约 300KB）按主题抽入 7 个文件：

| 文件                              | 常量数 | 内容                                                   |
| --------------------------------- | ------ | ------------------------------------------------------ |
| `public/data/data-names.js`       | 2      | NAMES_BY_YEAR、NATION_NAMES                            |
| `public/data/data-occupations.js` | 17     | OCCUPATIONS、UNIFORM*\*、VIBE*\*、BRAND_SINCE 等       |
| `public/data/data-i18n.js`        | 10     | uiText、valueTranslations、各 LabelMap                 |
| `public/data/data-body-sports.js` | 17     | SPORT*\*、TRAINING*\*、BODY\_\*、POSTURE\*             |
| `public/data/data-inner.js`       | 53     | INNER\_\*、各 catchphrase hook 表                      |
| `public/data/data-foot.js`        | 19     | FOOT*\*、SOLE*\*、TOE\_\*、POSTER_FOOT                 |
| `public/data/data-core.js`        | 14     | pools、slotDefs、EYE_MIGRATION、FACE_EXTRA_DEFAULTS 等 |

28 个 const 留在 app.js，原因全部机械可查（`verify/data-manifest.json`）：函数（pick/weighted/RARE_RULES/INNER_EDIT_POOLS…）、DOM 引用（els）、运行时状态（measurementDeckState）、微型配置（STORAGE_KEY/PRESET_KEY/OCC_CAT={} 等）。

**关键设计决定**：仍是**经典脚本 + 非严格模式**——数据文件挂到 `window.GUZEN_DATA`，app.js 开头一次解构，`<script>` 按序加载。**没有**转 ES module，因为那会给 6800 行 sloppy-mode 代码强加 strict mode（风险 #1），且模块的词法作用域会改变风险 #8 的同名函数覆盖语义。逻辑代码除了删除 const 声明和插入解构头外**零改动、零重排**。

**验证结果（全部通过）**：

| 层                              | 结果                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 第 1 层 结构                    | ALL PASS（已适配拆分：132 个常量在数据文件中恰好出现一次、app.js 无残留声明、script 标签序正确且全为经典脚本）         |
| 第 5 层 数据 deep-equal（新增） | **132/132**：每个常量与原版 index.html 字面量深度相等，**含对象 key 顺序**（Object.keys 迭代序驱动下拉选项，属于行为） |
| 第 2 层 行为对拍                | **100/100 场景逐字节一致，0 JS 错误**（新增 5×群组生成 + 5×朋友生成场景，补上此前覆盖缺口）                            |
| 第 3/4 层 视觉+存储             | 8/8 截图 PNG 字节级相同；localStorage 无缝衔接                                                                         |

**重建管线**（全部可重跑）：`python3 verify/phase1-extract.py && node verify/phase2-extract-data.mjs && npm run build && npm run verify`。

**已知局限**：① 逻辑仍是单个 6000 行 IIFE（Phase 3）；② 第 5 层以原版 index.html 为基线——**迁移验收后**若开始有意修改数据，第 5 层报 FAIL 是预期行为，届时应把基线切换为「上一个已验收版本」或停用该层；③ TDZ（暂时性死区）语义差异理论上存在（常量从「声明行处生效」变为「IIFE 顶部生效」），但原代码若在声明前引用早已崩溃，故不可能有此依赖，第 2 层亦为兜底。

## 3.3 Phase 3 执行结果（2026-08-04，分支 `astro-migration`）

**已完成**：HTML 组件化。`verify/phase3-split-components.mjs` 带锚点断言地把页面 body 按区块机械切成 7 个 Astro 组件（内容逐行原样）：

| 组件                 | 原行号  | 内容                                                        |
| -------------------- | ------- | ----------------------------------------------------------- |
| `Hero.astro`         | 133–156 | 标题横幅 + commandBar（SLOT START/演出スキップ/设置 chips） |
| `TabsNav.astro`      | 158–163 | 4 个主 tab 按钮                                             |
| `InitialPanel.astro` | 165–251 | 初期設定面板（4 subcard + presetBar）                       |
| `SlotTab.astro`      | 253–276 | スロット页（slotGrid + Rarity/Modes 侧栏）                  |
| `ResultTab.astro`    | 278–408 | 結果・画像指示文页（プロフィール + 7 个 prompt 面板）       |
| `HistoryTab.astro`   | 410–417 | 保存結果页（復元コード + 履歴列表）                         |
| `SettingsTab.astro`  | 419–423 | 条件固定页（fixedForm）                                     |

`index.astro` 从 438 行缩到 169 行（head + 原样内联 CSS + 组件调用 + 脚本标签）。**未引入 Layout 层**——单页应用暂无第二页面，等有需求再抽。

**关键发现（Astro 组件空白语义）**：Astro 会裁掉组件模板**首部的空白文本**（第一行缩进）和**尾部的空白文本**（结尾换行）。补偿方式：页面侧提供这两处空白——调用写成 4 空格缩进的 `    <X />`、调用之间留空行。这样构建产物与拆分前**字节级一致**（第 1 层 body verbatim 仍然通过）。

**验证结果（全部通过）**：第 1 层 ALL PASS（含 body 区域逐字节）；第 5 层 132/132；第 2 层 100/100 场景逐字节一致、0 JS 错误；第 3/4 层 ALL PASS（连跑 3 次确认稳定）。

**顺手修复**：第 3 层截图此前偶发抖动——应用 CSS 有 0.15–0.2s transition，150ms 等待可能截到过渡中间帧。现在测试对新旧两侧同等注入 `transition:none/animation:none` 后再截图。

**已知局限**：① `public/app.js` 仍是单个约 6000 行 IIFE——**有意保留**：转 ES module 会强加 strict mode（风险 #1）并改变 7 组同名函数的覆盖语义（风险 #8），如确需模块化应作为独立 phase、配合逐函数测试进行；② 组件是「原样切块」，未做 props 化/复用抽象——那需要改动 markup，应在迁移验收后按需进行；③ 组件文件在 `.prettierignore` 中（verbatim 内容不可重排）。

**重建管线**：`python3 verify/phase1-extract.py && node verify/phase2-extract-data.mjs && node verify/phase3-split-components.mjs && npm run build && npm run verify`。

## 3.4 上游同步：V3.0.0 → V3.2.0（2026-08-04，分支 `astro-migration`）

**背景**：三个 phase 完成后发现 `origin/main` 有 3 个新提交——原作者在迁移期间把单文件原版更新到了 **V3.2.0**（+638/−60 行，7296 → 7874 行；新增「顔立ちプリセット出力」设置、measurement 逻辑改造、7 个新数据表等）。

**做法**：合并 `origin/main`（干净合并，上游只改了 `index.html`）→ 把管线和验证脚本从**硬编码行号**改为**标记行动态定位**（`<style>`/`</head>`/`<body>`/`^<script>$` 等，配唯一性断言）→ 原样重跑三段管线。phase3 另加了**覆盖性断言**：组件必须严丝合缝地铺满 `.wrap` 内部（空行分隔、无缝隙），上游将来新增顶层区块时脚本会大声失败而不是悄悄丢内容。版本字符串（title/footer/appVersion）的校验也全部改为从基线动态提取。

**结果**：管线对 V3.2.0 **零手工锚点修改**直接跑通；提取出 **139 个数据常量**（较 V3.0.0 多 7 个，进 data-core/data-inner）；app.js 934,990 字节。五层验证全绿：第 1 层 ALL PASS（含 body verbatim）、第 5 层 **139/139**、第 2 层 **100/100 逐字节一致 0 错误**、第 3/4 层 ALL PASS。

**注**：附录 A–D 的基线数字（146 个常量、176 个 id 等）反映的是 V3.0.0 首次盘点，未逐项更新；自动化校验已全部动态化，不再依赖这些静态数字。

## 4. Phase 4：app.js 逻辑模块化（**2026-08-05 已启动**）

### 4.0 启动记录

用户选择启动条件 2（与上游分道扬镳）。**基线冻结**：`index.html` = `upstream/main` @ `7438239`（V3.2.0），自此为永久行为基线——第 2/3/4/5 层永远以它为「旧版」对照；上游后续更新不再自动跟进（如确需跟进，需人肉移植 diff）。phase1–3 提取脚本移入 `verify/archive/` 归档；CI 的管线漂移检测同步退役（app 代码转为手工维护）。

### 4.1 启动条件（二选一，缺一不启动）

1. 原作者停止更新单文件原版；或
2. 决定与上游分道扬镳，此后功能开发都在 Astro 版进行、不再跟进上游。（**已满足**）

**理由**：现在 `app.js` 是从 `index.html` 机械提取的，上游更新的同步成本 = 一次 merge + 一次管线重跑（V3.0.0→V3.2.0 实测零手工修改）。模块化是语义级重构、无法机械化——做完之后同步管线即断，上游每发一版都要人肉移植 JS diff（V3.0.0→V3.2.0 一次就是 ±700 行）。在上游活跃期做 Phase 4，维护成本不可持续。

### 4.2 做什么（按顺序，每步独立验证、独立 commit）

1. **冻结基线**：宣布 `index.html` 基线冻结（记录冻结时的上游 commit）；phase1–3 提取脚本转为「一次性历史工具」归档；第 5 层的对照基线从 `index.html` 切换为冻结时的 `public/data/*.js`。
2. **清死代码**：删除 7 组同名函数中**被覆盖的早期定义**（约 500 行，V3.2 时代的旧实现，位置见风险 #8；V3.2.0 同步后行号有漂移，以 `grep -n 'function <名字>'` 现查为准）。行为不变的依据：函数声明提升让后者本来就赢——删除前后第 2 层 100 场景对拍必须逐字节一致。顺带清理幽灵引用（`cardPromptBox`）和无样式类（`.faved`——决定是补样式还是删写入）。
3. **strict mode 预检**：在 IIFE 首行加 `'use strict';` 构建一版，跑第 2 层全量 + 扩充场景（JSON 导入/导出、复元コード、预设增删、slot 编辑器、sportsHistory 编辑器——现有套件没覆盖的交互），抓隐式全局赋值等 sloppy 依赖。全绿后再进入下一步；此步本身可以合并（strict IIFE 是合法增强）。
4. **拆模块**：按主题切分——`data/`（数据访问，替代 window.GUZEN_DATA 桥接，public/data 移入 src/data 转 `export const`）、`gen/`（角色生成、权重抽取、rarity）、`prompt/`（各 prompt 构建器 + 翻译）、`ui/`（渲染、slot 编辑器、tab/accordion）、`storage/`（localStorage、导入导出、复元）、`i18n/`、入口 `main.js`（事件绑定 + init 顺序，保持现有 init 次序不变）。函数体零改动，只动归属和 import。
5. **打包决策**：交给 Astro/Vite 打包（`<script>` 不再 is:inline）。两个已知坑的对策：esbuild 把日文转义成 `\uXXXX` → `vite: { esbuild: { charset: 'utf8' } }`；模块脚本 deferred → DOM 查询本来就在函数内或 init 时执行，末尾 init 调用在 module 里等价成立，但需第 2 层确认无时序回归。
6. **验证体系随之调整**：第 2/3/4 层原样保留（行为级，old = 冻结的 index.html，永久有效）；第 1 层重写（script 标签变 hashed module、无 JS verbatim 检查，改为「构建产物无 \uXXXX 膨胀、无多余外部请求」）；第 5 层改为对照冻结基线的数据模块。**第 2 层是本 phase 的唯一金标准**——每个 commit 都必须 100/100。

### 4.3 风险清单（沿用第 2 节编号）

风险 #1（strict mode）由步骤 3 前置化解；风险 #8（同名函数）由步骤 2 前置化解；风险 #4（格式化）在模块化后解除（数据模块可以正常格式化，届时缩减 `.prettierignore`）；新增风险：Vite 代码分割可能改变模块求值顺序——入口显式 import 并保持 init 在最后，靠第 2 层兜底。

### 4.4 预估

步骤 1–3 各半天内；步骤 4–6 合计 2–4 天（312 个函数的归属划分是主要工作量）。全程第 2 层跑绿即可安全中断/回滚——每步独立 commit 保证任意点可停。

### 4.5 执行结果（2026-08-05，分支 `phase4`，全部完成）

| 步骤            | 结果                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 冻结基线      | `index.html` = upstream `7438239`（V3.2.0）永久行为基线；phase1–3 脚本归档 `verify/archive/`；CI 漂移检测退役                                                                                                                                                                                                                                                                                                                    |
| 2 清死代码      | 7 组同名函数的被覆盖旧定义共 **103 行**删除（比 V3.0.0 时代估算小）+ `cardPromptBox` 幽灵引用；第 2 层 100/100 逐字节不变——「后者覆盖前者」得到行为学证明                                                                                                                                                                                                                                                                        |
| 3 strict + 扩测 | acorn 作用域扫描：全库 strict-clean（0 隐式全局、可整体按 strict 解析）；`'use strict'` 落地。第 2 层新增 6 类交互流（slot 编辑器+骰子 / 预设存取删 / 履历存藏读清 / 导出→再导入 / 復元コード往返 / UI 语言往返），套件扩到 **118 场景**                                                                                                                                                                                         |
| 4–5 模块化      | 两段完成。**Stage A**：数据转 `src/data/*.js` 真 ES module（139 个 `export const`）、逻辑整体进 `src/app/main.js`、Vite 打包（`minify:false` + `charset:'utf8'`，零新增 `\uXXXX` 转义）。**Stage B**：AST codemod 把 11 个顶层 `let` 改写为 `ST.*`（840 处引用、含遮蔽检测），按源码区间切 8 个主题模块（core/i18n/generate/inner/flow/prompts/ui/state），73 条裸语句按原序集中到入口 `main.js`，import/export 图由实际引用计算 |
| 6 验证适配      | 第 1 层改查打包产物（单 hashed module script、无转义膨胀、数据导出唯一性）；第 5 层直接 `import` `src/data` 与冻结基线 deep-equal。**最终：五层全绿，第 2 层 118/118 逐字节一致、0 JS 错误**                                                                                                                                                                                                                                     |

**关键实现注记**：① ES module 不能对导入绑定赋值，故可重赋值状态住 `state.js` 的 `ST` 对象（命名避开了源码中 `const S = innerCatShow` 的两处遮蔽）；② 循环 import 安全的前提是「模块求值期无跨模块调用」——已逐一核实（仅 `measurementDeckState`/`els`/`FV_INDEX` 等 5 处求值期调用，全部同模块或 data/DOM 依赖）；③ 裸语句集中入口后与 5 处求值期初始化器的相对顺序有一处理论反转（模块先于入口语句求值），逐项核实无依赖冲突。

**已知局限**：① `generate.js` 仍有 2.8k 行——按依赖聚类进一步细分留给日常重构，行为套件继续护航；② 第 5 层与冻结基线绑定，首次有意改数据时按 §4.2-1 说明处理；③ 模块文件仍在 `.prettierignore`（正文与基线逐行对应，保持可 diff）。

## 5. 冻结后第一次有意变更：英文界面日文残留修复（2026-08-05，分支 `en-i18n-fix`）

**问题**（用户报告 + 机械扫描确认，上游 V3.2.0 继承）：英文模式下 12 个下拉框、8 个字段标签、2 个复制按钮、流程引导条、档案页多行仍显示日文。三层根因：① `valueTranslations` 缺 V3.1–V3.4 新增值的条目（27 职业等，静默回退原文）；② 8 个新 select 的选项是静态 HTML 写死、从不经过翻译函数；③ 档案页约 13 行「裸输出」字段没调 `displayValue`。另有三个小 bug：fixed-age 把 ランダム 哨兵模板化成「ランダム歳 / ランダム years old」；`captionModeDisplay` 漏映射「表記する」（错显 "No text overlay"）；`applyUiLanguage` 漏了 2 个复制按钮、集合写真标题和 STEP1/2 流程条。

**修复**：`valueTranslations` 追加约 205 条（append-only）+ `fieldLabels` 补 8 键（ja/en）+ `groupPromptTitle`/`flowStep1`/`flowStep2` 新键；新增 `translateStaticSelectOptions()`（静态选项经 `data-ja` 保留原文、按语言重标）；ランダム 哨兵特判（顺带修掉日文模式的「ランダム歳」）；档案裸输出行与稀有度/イケメン徽章接入 `displayValue`。

**验证体系演进**（本次起固化的架构）：

| 层                                   | 锚定                                                 | 说明                                                                                                            |
| ------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 第 2 层日文场景（105 个）            | 冻结基线                                             | **逐字节一致保持不变**——日文行为无恙的证明                                                                      |
| 第 2 层英文场景（13 个）             | **golden 快照**（`verify/golden/en-scenarios.json`） | 英文显示已有意偏离基线；`--update-golden` 再生成                                                                |
| 第 3 层 settings 页截图              | 基线 + **DOM 垫片**                                  | 截图必须同环境互比（PNG golden 跨平台字体不同会炸 CI）；旧页面上显式打上「ランダム歳→ランダム」垫片后逐字节对比 |
| 第 5 层 `valueTranslations`/`uiText` | **子集模式**                                         | 基线条目必须原样存活（只许增，改/删仍报错）；其余 137 常量严格相等                                              |
| **第 6 层（新增）`verify:en`**       | 无残留断言                                           | 英文模式下所有下拉选项/字段标签/按钮/标题**零日文**——上线即抓到我人工排查漏掉的 STEP1/2，防将来加数据再漏       |
| 选项扫描                             | 冻结基线                                             | 排除 2 个 promptLanguage select（英文 prompt 输出已有意变化，回归保护由 golden 场景承担）；其余 760 点 0 差异   |

**明确不翻译的**（设计如此）：人名（汉字+假名）、内面档案的日文长文本、语言选择器的双语标签、英文 prompt 中刻意保留的日文品牌/场景专名。

## 6. 新增中文界面语言（2026-08-05，分支 `zh-lang`）

**范围**：仅 UI 语言轴（第三种界面语言 zh）；prompt 语言轴保持 日本語/English 不变（63 处英文散文模板不扩展）。

**机制**（`src/data/data-i18n-zh.js` + `src/app/i18n.js`）：

- 查表通用化：`VALUE_I18N = {en, zh}`，`displayValue`/`displayOptionLabel`/静态选项重标按语言选表，缺条目回退日文（优雅降级是设计约定）；
- `LT(ja, en, zh)` 助手 + AST codemod 转换 54 处字面量三元；**含函数调用的三元保持惰性求值**——`LT` 参数急切求值，若分支函数消耗随机数会漂移种子序列（本次最重要的坑，已在助手注释中写明）；另一个坑：`renderProfile` 里基线局部量 `const L=T('rows')` 遮蔽——助手因此命名 `LT`；
- 词条量：`uiText.zh` 全量 107 键 + 5 个标签映射表 zh 字段（~160）+ **值翻译 1038/1038** + 场景句 41/41 + 结构专用表（派生类型磁贴 zh 列、朋友关系/上下关系/内面类别/职业类别 zh 映射）+ MBTI 短评 16 条。

**验证体系扩展**：

- 第 2 层：golden 判定改为 `lang !== 'ja'`；新增 5 个 zh 场景，langswitch 流程扩为 ja→en→zh→ja 三语往返；**105 个日文基线场景保持逐字节一致**（ja/en 行为无恙的证明）；
- 第 1 层：body verbatim 引入 **BODY_SHIMS 登记表**（同第 3 层 BASELINE_SHIM 模式）——首条登记：语言选择器新增 `<option value="zh">中文</option>`；
- 第 5 层：SUBSET_MODE 扩至全部标签映射表 + OCC_CAT_LABELS；POST_FREEZE_EXPORTS 允许 5 个 zh 专用导出；
- 第 6 层：双语言断言——en 零日文字符；**zh 零假名**（汉字中日共用无法区分，假名字母才是残留信号；间隔号「・」为标点已排除）；扫描补上了 optgroup label（此前盲区，职业下拉的分组标题就藏在这里）。

**已知局限**：中文文案为机器起草，建议母语者过目（好在审校者就是仓库主人）。其余深层结构的补全见 §6.1。

### 6.1 剩余 i18n 补全（同日续做）

**已完成**（在 §6 基础上继续，中文覆盖面从「界面 + 选项」扩展到「档案页几乎全部内容」）：

| 类别                                                                      | 数量     | 做法                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 服装单品（FVOCAB 全量：上装/下装/鞋/外套/西装廓形/衬衫/领带/商务鞋/大衣） | 293      | 追加 `valueTranslationsZh`，覆盖率对 FVOCAB 清零                                                                                                                                                                                                            |
| 场景句（`OCC_SCENES` + `OCC_CAT_SCENES` + 通用池 + 季节池 + 休日句）      | 572      | 追加 `sceneTranslationsZh`；**中文覆盖 572 条 > 英文的 41 条**                                                                                                                                                                                              |
| 制服部件与帽类（`UNIFORM_VARIANTS` 内部）                                 | 55       | 含防大/警察/自卫队等长描述串                                                                                                                                                                                                                                |
| 复合文本生成器 zh 分支                                                    | 8 个函数 | `buildBodyHairSummary`/`underwearDesc`/`muscleSummary`/`sportsHistoryText`/`friendRelationText`/`ikemenRank`/`accWorkNote`/`getCaptionFieldLabelsArray`（照 `mbtiDescription` 的 `english==='zh'` 模式扩展，ja/en 分支一字未动；prompt 侧布尔调用不受影响） |
| 数据侧辅助表                                                              | 4 个     | `SPORT_MUSCLE_ZH`（27 项肌肉描述）/`SPORT_STAGES_ZH`/`ERA_LABEL_ZH`/`SCENE_MOD_ZH`                                                                                                                                                                          |
| 穿搭笔记短语池、配饰、品牌伪名                                            | 约 30    | 含 `mbtiStyleNote`、时尚感/肌肉感附注、`無地ノーブランド` 等                                                                                                                                                                                                |

**结构性修复（英文模式同样受益）**：① **场景前缀**——`buildEncounterScene` 有 45% 概率给句子加天气/时段前缀（`朝の澄んだ空気の中、` 等 7 种），导致整句查表必然落空、572 条翻译形同失效；新增 `sceneDisplay()` 拆前缀分别翻译后再拼合。② 品牌插值（`B()` 助手、休日四行、下着行）此前全为裸输出，现统一走查表。③ 帽类名、`headwear` 行、`styleNote` 行接入查表。

**验证**：六层全绿；新增「多职业爬取」核查手法——种子化生成 20 个不同职业角色，扫描档案页每个值单元格的**假名**残留（汉字中日共用不可判别），从 35 处收敛到 2 处。

**明确保留的日文回退**（唯一剩余项，独立立项规模）：`catchphrase`（宣传语）与 `bio-hook`（一句话背景）两行。它们由 8 个短语池（`SPORT_MEM` 141 + `MBTI_INTRO` 32 + `OCC_HOOK` 36 + `CULT_MEM` 26 + `OCC_CAT_HOOK` 22 + `ERA_HOOK` 16 + `TRAIN_HOOK` 14 + `BRIDGE_HOOK` 10 ≈ **297 条口语化短语**）经模板组装而成，且英文分支自带独立句式模板——补中文需同时译 297 条短语并改写组装模板，属于与本次同量级的独立任务。这两行是趣味性 flavor text，不影响功能与 prompt 输出。

## 7. 上游 V3.2.1 / V3.2.2 移植（2026-08-06）

**背景**：Phase 4 冻结基线后，上游又发了两版（`720256a` = V3.2.1、`bc71d5d` = V3.2.2，合计 +149/−33 行）。冻结意味着旧的「merge + 重跑管线」通道失效，只能手工移植。

### 7.1 方法：把基线重锚成移植的验证器

关键洞察：**如果移植忠实，日文模式输出必然与上游逐字节相同**（同样的池、同样的模板、同样的 PRNG 消耗顺序）。于是先把 `index.html` 重锚到 `bc71d5d`，再把功能移植进 `src/`，然后用第 2 层对拍当**移植正确性的判定器**——错一处随机数消耗顺序就会全盘偏移，藏不住。

流程：机械化脚本按 hunk 套用上游 diff（对我们做过 `ST.*` 改写的行自动转换），45 个 hunk 中 35 个自动落地；其余手工。收尾时再写了一个**逐函数字节比对**（上游变更的 27 个函数 × 我们的实现，归一化掉 `ST.`/`LT()` 差异），把自动脚本漏掉的补齐。

### 7.2 移植内容

**V3.2.1**：① 笑容模块——4 个新字段（`smileEyes`/`smileStyle`/`cheekSmile`/`mouthCorner`）+ 27 条描述短语 + `chooseSmileTraits()` 按「可爱系/高冷系」加权 + `smileLine()` 写入基准卡与脸部 prompt + 档案页两行可编辑；② 新设置「撮影演出（派生）」（常规/他人抓拍风/自拍风）+ `snapLine()` 追加到派生 prompt；③ 池扩充：脸型预设 +3、发型收尾 +4、肤质 +1，并接入 vibe/年龄感的抽取权重。

**V3.2.2**：① 脸颊池 4→11 + `chooseCheek()` 综合年龄/体型/脸型/健身习惯（45 岁以上才解锁两项衰老描述）；② 笑容与脸颊的一致性（凹陷脸颊几乎不再抽到「苹果肌隆起」）；③ 内面新项「経験人数」+ `chooseInnerExpCount()`，与既有「童貞」「女性経験の少なさ」情结联动强制取值，并串入 `INNER_DEPS` 依赖图。

### 7.3 移植中被对拍抓出的两个真 bug（都是模块化的隐性代价）

1. **`typeof` 守卫在模块作用域静默失效**：上游 `chooseCheek` 写 `(typeof HIGH_TRAIN!=='undefined') && HIGH_TRAIN.includes(...)`——单文件 IIFE 里 `HIGH_TRAIN` 在作用域内，但我们的 `generate.js` 没导入它，`typeof` 安静地返回 `'undefined'`，于是健身者权重永远不生效。**症状只是某些角色脸颊值不同**，肉眼几乎不可能发现；第 2 层一跑就露。已导入修复。以后凡从上游搬 `typeof X` 守卫，必须确认 X 在本模块可见。
2. **自动脚本插入位置/顺序偏差**：编辑池 5 行被插成 9 行（重复）、`chooseInnerFirstExp`/`chooseInnerLoveCount` 的新一致性规则未落地——逐函数比对全部揪出，用基线函数体整体替换修正。

### 7.4 验证结果（六层全绿）

| 层                       | 结果                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 2 行为（**移植判定器**） | **105/105 日文基线场景与上游 V3.2.2 逐字节一致** + 18 个 en/zh golden 重录后全过                           |
| 1 结构                   | ALL PASS（新增 `initialSnapMode` 后 id/data-\* 集合、body verbatim 仍一致）                                |
| 5 数据                   | 143/143（4 个笑容数据表登记进 manifest，与基线字面量逐项比对）                                             |
| 3/4 视觉+存储            | ALL PASS                                                                                                   |
| 6 无残留                 | en 零日文、zh 零假名（新增 45 条 en + 45 条 zh 词条：笑容 27、脸颊 7、脸型 3、发型 4、肤质 1、拍摄演出 3） |

**新增 i18n 债务归零**：上游这两版的新值同样没写 en 翻译（延续它的老习惯），我们一并补齐了 en 与 zh。

## 8. 足部特写面板 i18n + 第 6 层条件面板盲区（2026-08-06）

**用户报告**：中文模式下「足部特写页 详细设置」面板整块仍是日文（8 个轴标签 + 全部选项值）。

**为什么前几轮都没抓到——两个原因叠加**：

1. **代码层**：`renderFootCfgPanel` 的轴标签取自 `FOOT_CFG_AXES`，它是 `[key, ja, en]` 的**两语三元组**，渲染写死 `uiLang==='en' ? en : ja`，中文落进 ja 分支；选项值则是裸输出 `${v}`，从不经过查表。这正是 zh codemod 当初**有意保留为三元**的 7 处之一（分支是变量而非字面量，自动转换不安全）。
2. **验证层盲区（更值得记的一条）**：该面板只在「派生输出 = 足部特写页」时才被渲染，其他情况下 `#footCfgForm` 是空的。第 6 层扫的是 DOM 里**现存**的 select——面板从未被渲染，于是整族值从未进入扫描范围。

**修复**：① `FOOT_AXIS_LABEL_ZH` 映射 + 轴标签走 `LT()`、选项值走 `displayValue()`；② **第 6 层现在主动点击派生类型磁贴**（足部特写页／档案页／集换卡）把条件面板渲染出来再扫描——这一步立刻又暴露出 9 条职业专属小物、随后连锁发现 65 条职业场景串，以及**英文侧同一批 138 条缺口**（上游从未提供英文）。

**本轮翻译量**：中文 +123 条（8 个轴标签 + 场景 14 + 坐姿 13 + 鞋状态 7 + 面料 5 + 袜状态 4 + 角度 3 + 小物 11 + 职业专属场景/小物 65），英文 +139 条。

**教训（已写入验证约定）**：凡「条件渲染」的 UI 区块，扫描器必须**主动触发它出现**，否则等于没扫。同理适用于将来新增的任何按需渲染面板。

## 9. 内在资料 i18n + 第 6 层编辑器池盲区（2026-08-07，分支 `inner-i18n`）

**起点**：用户要求「修复翻译，顺带看一下还有什么翻译是欠缺的」。前几轮都是「用户截图 → 发现一处 → 补一处」，这轮改成先建**权威动态审计**，再按审计结果修。

### 9.1 审计方法（`scratchpad/audit-ui.mjs`，未入库）

24 个角色（12 职业 × 4 时代 × 4 气质，各自固定种子），逐个：点 `[data-icat-all]` 展开内在资料全部分类 → 点齐派生类型磁贴 → 扫资料行 / 卡槽 / 全部 select。首跑报出 **623 条**含假名的已显示值——把「内在资料子系统」整体暴露成盲区（它默认折叠，此前从未被扫过）。

### 9.2 本轮修复

| 类别         | 内容                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------ |
| 内在资料标签 | 44 条行标签三元 `en?'EN':'JA'` → `LT('JA','EN', INNER_LABEL_ZH['JA'])`                           |
| 内在资料值   | 改为查表驱动 `V = (val,key)=>displayValue('innerText', val) …`；INNER\_\* 池 7 批约 780 条中文   |
| 组合值       | `displayValue` 支持 `／` 分段查表（整串查不到时逐段查再拼回）                                    |
| 徽章         | `★レア→★稀有`、`⚡ギャップ→⚡反差`                                                               |
| 制服/品牌    | 131 条工作服・制服・单品（`医療用スクラブ`／`ニッカポッカ風の作業ズボン`／`しまむら` …）中英双补 |
| 发型         | `坊主` → `buzz cut` / `板寸（近乎推光）`                                                         |
| 学段         | 6 条（幼稚園〜社会人）中英双补                                                                   |

**合计**：中文 +1072 条（1610 → 2682），英文 +138 条（1213 → 1351）。

### 9.3 抓出的两个真 bug（都在「运动经历」这一路上）

1. **`buildSportsHistoryEditor` 的选项标签从未过翻译**：竞技名、`なし`、5 个「体格影响」预设（`自動（期間から計算）`…）、学段全部直接把日文字面量当 `<option>` 文本。注意 `SPORTS` 池 16 项**早就有中文词条**——所以这不是数据缺口，是代码根本没调用 `displayValue`。修法：只改 label、`value` 仍保留日文键（保存端 `SPORT_STAGES.indexOf(v)` 依赖它）。
2. **`sportsHistoryText` 英文模式输出日文**：`if(english==='zh')` 之后的 return 被 ja 和 en 共用，英文界面显示 `野球（小学校〜社会人）`。补 EN 分支后为 `Baseball (elementary school–adult leagues)`。

三语现已一致：`野球（小学校〜社会人）` / `Baseball (elementary school–adult leagues)` / `棒球（小学〜社会人）`。

### 9.4 第 6 层新盲区：编辑器池（比第 8 节那条更深一层）

第 8 节的教训是「条件渲染的面板要主动触发」。这轮发现还有一层：**即使面板渲染了，扫到的也只是这个角色恰好取到的那一个值**。整个池只在**编辑器**里才铺开——卡槽的 `[data-edit]` 和资料行的 `[data-p-edit]`。两者此前从未被打开过，运动经历编辑器的日文竞技名就是这么活下来的。

**修复**：第 6 层新增 6b 段，遍历两类编辑器按钮、逐个展开、扫全部 `<option>`。

### 9.5 剩余缺口（**未修，诚实记账**）

6b 段首跑得到 **527 条**中文模式下仍是日文的编辑器选项，全部集中在内在资料的 `*Text` 字段：

```
67 pastUpbringing/pastTrauma   60 speechText   60 friendText   50 birthplaceText
28 birthdateText   19 weaknessMind/Body   19 complexText   17 nicknameText
17 assetText   16 weekFreqText   15 innerDesire   15 expCountText   14 drinkText …
```

这些**不是缺词条，是句子**——由约 30 个生成器函数内联拼装（生日的和历＋星座、语气由「语调＋口癖＋声音」三段拼合、好友由「姓名＋关系＋频率」拼合…）。量化验证过两条路都走不通：

- 把分段查表从 `／` 推广到 `（）：・〜、`：561 条里只有 18 条能整串还原，而那 18 条正是刚修好的竞技名；**374 条连一个可查表的片段都没有**。
- 逐函数补 zh 分支：需要改约 30 个函数并撰写 500+ 条新中文句子——与 `catchphrase`/`bio-hook`（约 297 条 + 模板重写）同级，应当单列一期。

**因此 6b 做成棘轮而非闸门**：已知缺口冻结在 `verify/golden/zh-composed-gap.json`，**只有新增**未翻译选项才让第 6 层失败；缺口变小时会提示删除该文件以收紧棘轮。这样既不假装通过，也不让将来的回退溜过去。

同时仍然待办、已知未做：`catchphrase`/`bio-hook` 中文化（第 7 节起就记账）；`pools.hairStyles` 是否加入 `坊主`／`スポーツ刈り`（需把 `pools` 登记为第 5 层的有意差异）。

### 9.6 验证结果（六层全绿）

| 层                        | 结果                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------- |
| L1 结构                   | ALL PASS                                                                                |
| L2 行为对拍               | 123 场景（105 基线 + 18 黄金）**0 差异** —— 日文侧字节不变，证明所有改动只走 en/zh 分支 |
| L3/L4 截图 + localStorage | ALL PASS                                                                                |
| L5 逐常量深比             | ALL PASS（`INNER_LABEL_ZH` 登记进 `POST_FREEZE_EXPORTS`）                               |
| L6 分语言零残留           | en / zh 均无残留；6b 棘轮基线 527，复跑无新增                                           |

`verify/golden/en-scenarios.json` 重锚一次：英文侧制服值与运动经历现在真的输出英文了，黄金快照随之更新（属修好而非退化）。

### 9.7 追加：发型编辑器读不到职业专属发型（用户截图复现）

**用户报告**：中文模式选自卫队员，发型下拉里没有「板寸（近乎推光）」（`坊主`）。

**实测**（`scratchpad/test-bozu-zh.mjs`）：

| 场景                     | 修复前              | 修复后            |
| ------------------------ | ------------------- | ----------------- |
| 生成器随机抽取 60 次     | 约 40% 给出坊主     | 不变              |
| 当前值就是坊主时开编辑器 | 29 项，含坊主       | 29 项，含坊主     |
| 换成别的发型后重开       | **28 项，不含坊主** | **29 项，含坊主** |

**根因——两个池子从未打通**：

- 生成侧 `pickHair()` 用 `OCC_HAIRSTYLE[role]`：`自衛官` 有 `boost=[['坊主',5],['短髪',5]]` 且 `only` 把候选**收窄到 5 种**，所以坊主是这个职业的主力发型。
- 编辑侧 `slotEditPool('hairStyle')` 直接返回全局 `pools.hairStyles`，**完全不看职业**，而全局池里没有坊主。

「当前是坊主时列表里有」只是 `flow.js` 那句 `if(cur && !opts.includes(cur)) opts.unshift(cur);` 的兜底效果；用户截图里当前值是 `ソフトツーブロック`（本就在全局池内），兜底不触发，于是坊主彻底不可达。

**修复**：把 `OCC_HAIRSTYLE` 从 `generateCharacter` 内提到模块作用域（纯字面量 IIFE，不涉及 PRNG／Date，提升是惰性的），`slotEditPool('hairStyle')` 改为「职业专属项在前 + 通用池在后」去重合并。**只加不减**——生成器的 `only` 用于约束随机生成，手动编辑不应被它锁死。

**为何不走另两条路**：给 `pools.hairStyles` 直接加 `坊主` 会让第 5 层的常量深比出现差异（需登记为有意分歧），且所有职业都会多出这一项；把编辑器收窄成职业 5 项则会砍掉用户已有的自由度。

**验证**：六层全绿，L2 **123 场景 0 差异**——证明生成逻辑分毫未动，改动只落在编辑器可选项上。

## 附录 A — 146 个数据常量基线表（V3.0.0 首次盘点）

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
