# guzen_ikemen_maker_v1

Guzen Ikemen Maker V3.0.0 — Astro 版。

- `index.html` — 迁移前的单文件原版，作为验证基线保留（verify 脚本以它为「旧版」对照，勿删）。
- `src/pages/index.astro` — 页面骨架：head + 原样内联 CSS + 组件调用 + 脚本标签。
- `src/components/*.astro` — 7 个区块组件（Hero / TabsNav / InitialPanel / SlotTab / ResultTab / HistoryTab / SettingsTab），内容为原版逐行切块（Phase 3）。**改界面改这里。**
- `public/data/*.js` — 132 个纯数据表（名字库/职业/翻译/内面设定等），按主题分 7 个文件，挂载到 `window.GUZEN_DATA`（Phase 2）。**改数据表改这里。**
- `public/app.js` — 应用逻辑（单 IIFE，经典脚本，从 GUZEN_DATA 解构数据）。
- `verify/` — 迁移验证脚本 + 提取管线，详见 `MIGRATION_VERIFICATION.md`。

```bash
npm install
npm run dev        # 本地开发
npm run build      # 构建到 dist/
npm run verify     # 构建后跑五层迁移验证（结构 / 数据 deep-equal / 行为对拍 / 视觉 / localStorage）
```

从原版 index.html 重建全部生成物：

```bash
python3 verify/phase1-extract.py && node verify/phase2-extract-data.mjs \
  && node verify/phase3-split-components.mjs && npm run build
```

⚠️ 注意事项：

- `index.html`、`public/app.js`、`src/pages/index.astro`、`src/components/`、`public/data/` 在 `.prettierignore` 中，不要格式化（10KB+ 单行数据表、依赖声明顺序的同名函数覆盖，见 MIGRATION_VERIFICATION.md 风险 #4/#8）。
- 迁移验收后若**有意**修改 `public/data/` 里的数据，第 5 层（`verify:data`）会如实报 FAIL——那是它和原版基线的对比，属预期。
- localStorage key（`guzen-ikemen-maker-v1.results`/`.presets`）和部署 origin 不可变，否则老用户丢历史。
