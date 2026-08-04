# guzen_ikemen_maker_v1

Guzen Ikemen Maker V3.0.0 — Astro 版。

- `index.html` — 迁移前的单文件原版，作为验证基线保留（verify 脚本以它为「旧版」对照，勿删）。
- `src/pages/index.astro` + `public/app.js` — Astro 页面（Phase 1：逐字节原样搬运）。
- `verify/` — 迁移验证脚本，详见 `MIGRATION_VERIFICATION.md`。

```bash
npm install
npm run dev        # 本地开发
npm run build      # 构建到 dist/
npm run verify     # 构建后跑四层迁移验证（结构 / 行为对拍 / 视觉 / localStorage）
```

⚠️ `index.html`、`public/app.js`、`src/pages/index.astro` 在 `.prettierignore` 中，
不要格式化（包含 10KB+ 单行数据表和依赖声明顺序的同名函数覆盖，见 MIGRATION_VERIFICATION.md 风险 #4/#8）。
