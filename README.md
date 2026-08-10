# guzen_ikemen_maker_v1

Guzen Ikemen Maker — [上游单文件原版](https://github.com/FOOTHOUSE-art/guzen_ikemen_maker_v1)的 Astro 模块化版本，当前追踪至 **V3.9.6**。

界面语言：日本語 / English / 中文（提示词语言另有 日本語 / English 两档，与界面语言互相独立）。

## 目录结构

- `index.html` — 冻结的单文件原版基线（upstream `ab4c058` / V3.9.6）。verify 脚本以它为「旧版」对照做逐字节行为对拍，**勿删勿格式化**。
- `src/pages/index.astro` — 页面骨架：head + 原样内联 CSS + 组件调用 + 模块脚本。
- `src/components/*.astro` — 7 个区块组件（Hero / TabsNav / InitialPanel / SlotTab / ResultTab / HistoryTab / SettingsTab）。**改界面改这里**（注意 body 与基线逐字节比对，改动需过第 1 层验证）。
- `src/data/*.js` — 143 个纯数据表的 ES module + 中文语言包 `data-i18n-zh.js`。翻译规模：值翻译 en 1430 / zh 2759 条，场景句 zh 572 条，界面文案三语各 116 键。**改数据表/翻译改这里。**
- `src/app/*.js` — 应用逻辑 ES modules：`state.js`（共享状态 ST + els）、`core`（随机/测量）、`i18n`（T/LT/displayValue/promptValue，见下）、`generate`、`inner`、`flow`、`prompts`、`ui`、入口 `main.js`（数据补丁 + 事件绑定 + init，保持基线原序）。**改逻辑改这里。**
- `verify/` — 六层验证脚本（一次性提取管线已归档于 `verify/archive/`），全部约定与历史见 `MIGRATION_VERIFICATION.md`。

```bash
npm install
npm run dev        # 本地开发
npm run build      # 构建到 dist/
npm run verify     # 构建后跑六层验证（结构 / 数据 / 行为对拍 / 视觉 / localStorage / EN·ZH 无残留）
npm run verify:options  # 选项全扫描（760+ 选项点逐一对拍，约 5-10 分钟；CI 里手动触发）
```

## 与上游的关系

上游是持续更新的单文件应用；本仓库按版本**整批移植**（方法见 MIGRATION_VERIFICATION.md §7/§12）：把根目录 `index.html` 重锚为新上游版本，把 diff 以声明为粒度合并进 `src/`，然后用第 2 层对拍当移植正确性判定器——**日文模式输出必须与上游逐字节一致**。上游只写日文，en/zh 翻译在移植时一并补齐。已完成的移植：V3.2.0 → V3.2.2（§7）、V3.2.2 → V3.9.6（§12）。

## i18n 约定（改代码前必读）

- 日文字符串是内部表示：选项 value、localStorage、提示词解析全部依赖日文原文。翻译只发生在显示层。
- 界面文案走 `T('key')`（uiText 三语表）；行内三语用 `LT(ja, en, zh)`（参数急切求值，**禁止**传消耗随机数的调用）；显示值走 `displayValue(key, value)` 查表，缺条目回退日文。
- **提示词内容只依赖提示词语言，绝不读 `ST.uiLang`**：英文提示词分支查表一律用 `promptValue(v)`（uiLang 无关），日文分支用原文。违反会把界面语言泄漏进提示词（详见 §11.3）。
- 静态 `<option>` 若不写 value，翻译前会被自动固定为日文原文（§11.2）；新增静态下拉记得登记进 `translateStaticSelectOptions` 的 id 清单。
- 内在资料的组合句（生日和历、语气拼装等）是已记账的翻译缺口，由棘轮文件 `verify/golden/zh-composed-gap.json` 冻结——只有**新增**未翻译词条才会让第 6 层失败。

## ⚠️ 注意事项

- `index.html`、`src/app/`、`src/data/`、`src/pages/index.astro`、`src/components/` 在 `.prettierignore` 中，**不要格式化**（10KB+ 单行数据表、与基线逐行对应的可 diff 性，见 MIGRATION_VERIFICATION.md 风险 #4）。
- 日文模式行为被 105+ 个种子化场景逐字节锁定；任何生成逻辑改动都必须过 `npm run verify`。en/zh 显示有意变更时按 §5 流程 `--update-golden` 重录并逐条核对。
- localStorage key（`guzen-ikemen-maker-v1.results` / `.presets`）和部署 origin 不可变，否则老用户丢历史；历史缩略图存于 IndexedDB，同样受 origin 约束。
