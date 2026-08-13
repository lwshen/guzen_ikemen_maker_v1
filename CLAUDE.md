# CLAUDE.md

## 文档与沟通的语言规则

面向人的文字（MIGRATION_VERIFICATION.md、PR 描述、提交信息、对话回复）不使用内部代号和黑话，写给没读过本项目历史的人也能懂：

- 自动检查按**描述性名称**称呼，不用层号：结构检查（`verify:structure`）、行为比对（`verify:behavior`）、截图比对与存量数据检查（`verify:visual`）、数据表核对（`verify:data`）、界面残留扫描（`verify:en`）、翻译表对账（`verify:i18n`）。完整对照表见 MIGRATION_VERIFICATION.md 开头的「检查体系一览」。脚本文件名沿用历史的 `layerN` 编号，仅作为文件名引用。
- 「ratchet／棘轮」写成**欠账台账**（存量先记录在案不报错、新增立即报错、只减不增）；「golden」写成**基准快照**（目录沿用历史名 `verify/golden/`）。
- 缩写与行话首次出现加中文括注，例如：PRNG（伪随机数生成器）、shim（登记在案的有意差异）。
- 代码内的注释不受此限——注释面向维护者，精确优先，可沿用 ratchet、subset mode 等既有称呼。

## 提交与验证

- 提交前确认不在 main 分支；提交信息用中文，结论平实（改了什么、验证过什么）。
- 任何改动合并前跑 `npm run verify`（全部自动检查）；改了英/中文显示属于有意变更时，按文档流程重录基准快照（`node verify/layer2-behavior.mjs --update-golden`），日语场景必须保持逐字节不变。
