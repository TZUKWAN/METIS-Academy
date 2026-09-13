# WORKSPACE_AUDIT — 工作区完整审计（TASK-A001）

- 审计日期：2026-09-13 01:55
- 审计人：执行 Agent
- 工作区：`D:\AISU项目`

## 1. 当前目录树（一级 + 关键二级）

```text
D:\AISU项目\
├─ METIS_Academy_全量产品构建任务书.md   # 本任务书（63KB，产品构建规格，必须保留）
├─ 项目清单.md                            # 个人项目跟踪清单（与游戏无关，保留）
├─ articles\
│  └─ 01-国内靠AI智能体赚到钱的人没有一个是卖智能体的.md   # 参考文章（保留）
├─ 产品demo\                              # 历史教程产物（独立 git 仓库，保留原位）
│  ├─ .git\ .gitignore
│  ├─ docA\  docA_outline.md              # 《哲社科科研Agent实战教程》章节稿
│  ├─ docB\  docB_outline.md              # 《文科生AI应用原型搭建训练营教程》章节稿
│  ├─ build\
│  ├─ 哲社科科研Agent实战教程.docx / -配套PPT.pptx
│  ├─ 文科生AI应用原型搭建训练营教程.docx / -配套PPT.pptx
│  ├─ README.md / 交付说明.md
├─ docs\          # 本次新建（progress 等）
├─ legacy\        # 本次新建（历史素材索引）
├─ apps\ packages\ content\ scripts\  # 本次新建（monorepo）
```

## 2. 识别结果

| 类别 | 内容 | 处置 |
|---|---|---|
| 文档/Markdown | 任务书、项目清单、docA/docB outline、articles | 全部保留 |
| 旧 .docx/.pptx | 产品demo 下 4 个教程文件 | 保留原位（见 §4） |
| 构建脚本 | 产品demo/build（docx/pptx 生成脚本） | 保留原位 |
| Node 项目 | 无（产品demo/build 为文档脚本） | — |
| Python 项目 | 无 | — |
| 已有游戏代码 | 无 | 从零构建 |

## 3. 可复用资产（历史素材库）

1. `产品demo/docA`：哲社科研 Agent 实战教程 → 科研线（research campaign）知识卡与事件文案素材。
2. `产品demo/docB`：文科生 AI 原型搭建训练营 → 创业/工作台教学内容素材。
3. 两套 docx/pptx：术语、案例、教学口径参考。
4. `articles/01-*.md`：AI 接单/副业真实案例 → 创业线事件素材。

以上均为**历史素材库**，新游戏不直接依赖其文件路径；如需引用由内容制作时人工摘录进 `content/`。

## 4. 需保留 / 需迁移 / 潜在冲突

- **需保留（原位）**：`产品demo/` 整体。原因：该目录自带 `.git` 仓库，移动文件会破坏其提交历史与内部相对引用。按任务书 A002 规则，改为"保留原位置 + `legacy/README.md` 记录映射"。
- **需迁移**：无（不存在与本方案冲突的同名目录/文件；`docs/ apps/ packages/ content/ scripts/ legacy/` 均为新建，不覆盖任何已有内容）。
- **潜在冲突**：
  1. 任务书目录结构要求根目录出现 `docA/ docB/` 的迁移判断 —— 实际它们位于 `产品demo/` 子目录内且带独立 git，已按"保留原位+映射"处理，记录于 `legacy/README.md` 与 `DECISIONS.md`。
  2. Windows 路径含中文（`D:\AISU项目`）：pnpm/electron-builder 均支持，但构建输出路径与脚本一律使用相对路径，避免硬编码。

## 5. 结论

- 未删除、未修改任何既有文件。
- 全部一级目录已列出：`articles / 产品demo / docs / legacy / apps / packages / content / scripts` + 根文件（任务书、项目清单）。
- 可以进入 TASK-A002。
