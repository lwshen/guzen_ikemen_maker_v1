# guzen_ikemen_maker_v1

Guzen Ikemen Maker V3.0.0 — Astro 版。

- `index.html` — 冻结的单文件原版（upstream V3.2.0），作为验证基线保留（verify 脚本以它为「旧版」对照，勿删）。
- `src/pages/index.astro` — 页面骨架：head + 原样内联 CSS + 组件调用 + 模块脚本。
- `src/components/*.astro` — 7 个区块组件（Hero / TabsNav / InitialPanel / SlotTab / ResultTab / HistoryTab / SettingsTab）。**改界面改这里。**
- `src/data/*.js` — 139 个纯数据表（名字库/职业/翻译/内面设定等）的 ES module，按主题分 7 个文件。**改数据表改这里。**
- `src/app/*.js` — 应用逻辑 ES modules（Phase 4）：`state.js`（共享状态 ST + els）、`core`（随机/测量）、`i18n`、`generate`、`inner`、`flow`、`prompts`、`ui`、入口 `main.js`（数据补丁 + 事件绑定 + init，保持基线原序）。**改逻辑改这里。**
- `verify/` — 迁移验证脚本（提取管线已归档于 `verify/archive/`），详见 `MIGRATION_VERIFICATION.md`。

```bash
npm install
npm run dev        # 本地开发
npm run build      # 构建到 dist/
npm run verify     # 构建后跑五层迁移验证（结构 / 数据 deep-equal / 行为对拍 / 视觉 / localStorage）
```

**基线已冻结（Phase 4，2026-08-05）**：`index.html` 固定为 upstream `7438239`（V3.2.0），只作为验证对照基线，不再从它重建代码；提取管线脚本归档于 `verify/archive/`。功能开发直接改 Astro 版源码。

⚠️ 注意事项：

- `index.html`、`public/app.js`、`src/pages/index.astro`、`src/components/`、`public/data/` 在 `.prettierignore` 中，不要格式化（10KB+ 单行数据表、依赖声明顺序的同名函数覆盖，见 MIGRATION_VERIFICATION.md 风险 #4/#8）。
- 迁移验收后若**有意**修改 `public/data/` 里的数据，第 5 层（`verify:data`）会如实报 FAIL——那是它和原版基线的对比，属预期。
- localStorage key（`guzen-ikemen-maker-v1.results`/`.presets`）和部署 origin 不可变，否则老用户丢历史。
