# V2 Baseline Audit — METIS Academy

## 日期
2026-09-15 01:47

## 现状

### 已完成（可复用）
- 引擎：Effect/Condition/Trigger/DelayedQueue/Mission/EndingResolver+Composer/FateReview/NG+/版本化存档
- 内容：276 事件 / 122 决策 / 58 主结局 / 513 组合结局 / 121 技能原子 / 100 知识卡 / 21 角色
- 测试：112 通过（引擎 77 + Schema 35），覆盖率达标
- E2E：10/10
- NSIS 安装器 + Portable zip（全链路实测）
- UI：7 页面 + Aurora 背景 + 设计 tokens

### 主要问题（V2 需要解决）

| 问题 | 严重度 | 描述 |
|---|---|---|
| App Residue | BLOCKER | 整个产品仍按 SaaS/IDE 信息架构组织：左侧导航→页面切换，不是游戏流程 |
| 缺 Hub | CRITICAL | 没有 Player Hub / METIS Studio，玩家不知道"身处哪里" |
| 缺 Title Screen | CRITICAL | 没有真正的游戏标题画面 |
| 缺 Pause Menu | MAJOR | 没有 ESC 游戏菜单 |
| 缺 Scene Presentation | MAJOR | 剧情没有场景感（背景/角色/Ambient 层缺失） |
| 缺 Day Loop UI | MAJOR | 没有 Day Start / Day End 反馈画面 |
| 缺 Messages | MAJOR | 没有 in-game 消息系统 |
| 缺 Mission Overlay | MINOR | 没有 MISSION RECEIVED 独立反馈 |
| 缺 Skill Constellation | MINOR | Skills 是卡片墙，不是星座图 |
| 缺 Ending Archive | MINOR | 没有结局收藏馆（??? / 已发现） |
| 缺 Audio | MINOR | 只有简单 SFX，没有 BGM/Ambient |
| 缺 Monaco | MINOR | 编辑器用 textarea 而非 Monaco |
| SQLite 回退 | MINOR | 安装包使用 JSON 而非 SQLite |
| 结局数量 | CRITICAL | 58 主结局远低于 V2 要求的 480+ |
| 事件数量 | CRITICAL | 276 事件远低于 V2 要求的 1060+ |

### 可保留
- game-core 全部引擎逻辑
- content-schema 全部类型定义
- ai-core Provider 抽象
- agent-adapters CLI 集成
- 存档 schema（需 migration）
- 现有 YAML 内容（需大幅扩展）
- E2E 测试框架
- NSIS 打包配置

### 必须推翻
- App Shell（左侧导航 → 页面切换 → 改为 Title → Hub → Day Loop → Scene → Terminal）
- 导航方式（左导航 → 改为 Hub 内点击对象 + ESC Pause Menu）
- 页面组织（React Page → 改为 Game Screen 状态机）
- Story 呈现（简单卡片 → 改为 Scene + Dialogue + Choice + Ambient）
