# METIS Academy

> 剧情驱动 + 项目模拟 + AI Agent 能力训练的桌面游戏。
> 你不是在"学 AI"——你是在科研、竞赛、创业三条故事线里，学会让 Agent 真正为你工作：什么时候用、怎么配置、怎么给任务、怎么保持上下文、怎么检查结果、怎么修正错误。

## 安装（玩家）

1. 下载安装包（`apps/desktop/release/` 下的 `Setup .exe` 或 portable zip）。
2. 双击安装 → 启动 → 新建角色 → 选一条主线。
3. **不配置任何 AI 也能完整游玩。** 想接入真实模型或真实 CLI Agent，见下。

## AI 配置（可选）

设置 → AI 服务 → 添加：

| 字段 | 说明 |
|---|---|
| 类型 | OpenAI 兼容 / Anthropic 兼容 / DeepSeek 兼容 |
| Base URL | 官方地址或兼容中转（留空=官方） |
| 模型 | 与服务商拼写完全一致 |
| API Key | 系统安全存储加密保存，绝不明文落盘 |

保存后点"测试"验证连接。未配置时所有功能可用，仅动态 AI 对话使用离线预设。

## Agent CLI 配置（可选）

设置 → Agent CLI 工具 → 查看检测状态与官方安装指引 → 安装后"重新检测"。
支持：**Claude Code**（`claude`）、**Codex CLI**（`codex`）、**DeepSeek Harness**（`dsh`）。
没有安装任何 CLI？工作台里选"（教学模拟）"版本，输出有明确标注，流程教学完全一致。

### 使用真实 Agent 的安全规则

- 工作台 → 终端 → 先"选择工作目录"授权；只有你明确授权的目录内命令才会被执行。
- renderer 进程无任何 Shell 权限；命令经主进程白名单（adapter 构建）执行。
- 任何时刻可"停止"运行中的任务。

## 开始游戏

- **科研线**：学会把一句话需求变成可答辩的研究计划（Task Contract / 独立验证 / Compact / AGENTS.md / Handoff）。
- **竞赛线**：21 天把想法做成作品（规则提取 / 竞品矩阵 / Goal / 回归 / 数据一致性 / 路演取舍）。
- **创业线**：从 0 到第一个付费用户（信号池 / 行为访谈 / 假设板 / 人肉MVP / 定价实验 / 单位经济 / Pivot）。

新手引导只教四件事：继续剧情、做选择、进工作台、返回。剩下的，游戏会让你亲身经历。

## 隐私与数据

- 数据目录：`%APPDATA%/metis-academy/metis-data`
- 设置内可一键删除存档 / AI 配置 / 运行历史 / 完全重置
- 日志不含 API Key 与用户敏感文件内容

## 开发者

```bash
pnpm install
pnpm dev                 # 开发模式（Vite + Electron）
pnpm typecheck           # 严格 TS 检查
pnpm lint                # ESLint
pnpm test                # 单元测试（game-core 47 + content-schema 35）
pnpm content:validate    # 内容 schema+跨引用验证
pnpm content:endings:count   # 结局组合统计（≥200 达标）
pnpm content:reachability    # 剧情/结局可达性检查
pnpm bot                 # 剧情自动跑通（参数：research|competition|venture × first|last|random）
pnpm build               # 构建（esbuild main + vite renderer）
pnpm test:e2e            # Playwright + Electron E2E
pnpm dist                # Windows 安装包（NSIS + portable）
```

## 目录

```
apps/desktop          Electron 应用（main / preload / renderer）
packages/game-core    游戏核心引擎（纯函数，三线共享）
packages/content-schema 内容 Schema（Zod）
packages/ai-core      AI Provider 抽象 + 评分器
packages/agent-adapters CLI Agent Adapter + 教学模拟
content/              全部游戏内容（YAML，schema 校验）
docs/                 产品/架构/内容/测试/发布/进度文档
legacy/               历史素材索引
```
