# DECISIONS.md — 冲突与设计决策记录

> 任务书 §0.1 规则16 / §26 情况C 要求：发现冲突或缺陷时记录于此，并维持核心目标不变。

## D-001 旧教程"保留原位"替代迁移
- 日期：2026-09-13 01:58
- 背景：任务书 A002 要求将 docA/docB/旧 docx/pptx 迁入 legacy/tutorial-v0；但 `产品demo/` 是独立 git 仓库，移动文件破坏其历史。
- 决策：采用任务书预设的替代方案——保留原位置，`legacy/README.md` 记录映射。新代码零依赖旧素材。

## D-002 内容引用统一使用 campaign type
- 日期：2026-09-13 02:30
- 背景：schema 初版中 mission.campaignId/ending.campaign 与 campaign.id（research_30d_proposal）出现两套引用口径，Resolver 匹配失败。
- 决策：内容统一按 type（research/competition/venture）引用；引擎侧 `campaignTypeOf()` 从 state.campaignId 反查；validateCrossRefs 不再重复校验。V1 每类型仅一条 campaign，此约定安全。

## D-003 存储后端 SQLite 优先 + JSON 兜底
- 日期：2026-09-13 04:50
- 背景：better-sqlite3 为原生模块，Electron ABI 与 Node ABI 不一致时（未 rebuild 的分发形态）require 失败。
- 决策：Storage 接口双实现，require 失败自动回退 JSON；设置页如实显示当前后端。发布包 `npmRebuild:false` 即为 JSON 兜底形态（KNOWN_ISSUES #1）。

## D-004 NPC 动态追问的双层实现
- 日期：2026-09-13 04:30
- 背景：L001-L003 要求"有 AI 用 AI、无 AI 游戏仍可完成"。
- 决策：机制层走 ai:chat（输入=资产/弱项/任务，输出≤3问，AI 只改写不改事实）；无 AI 时回退预设追问池（每场景≥3变体）。核心流程零 AI 依赖。

## D-005 触发引擎按 campaign 过滤
- 日期：2026-09-13 06:10
- 缺陷：collectTriggeredEvents 初版未过滤 campaign，导致 research 事件窜入 venture 对局（bot 覆盖率 149% 异常暴露）。
- 决策：触发器仅匹配当前 campaign type 或 global；9 bot 回归通过。此缺陷由覆盖率统计异常暴露——统计脚本的"异常值"救了场。

## D-006 结算判定区分"已解锁未完成"
- 日期：2026-09-13 03:10
- 缺陷：campaign_complete 判定把 status=available 的最终任务当作"已处理"，导致第 27 天提前结算（time_up 兜底结局）。
- 决策：higher-stage 检查排除 completed/failed/skipped 之外的一切状态（含 available/pending）；progress 数值加 0–100 封顶。

## D-007 孤儿事件治理策略
- 日期：2026-09-13 03:30
- 缺陷：manual 触发且无入口指针的事件永不可达（bot 卡关暴露）。
- 决策：科研线 8 个孤儿改为"日暮触发"（day+phase:end 自动出现），竞赛/创业线用 choices.next 显式链接；新增 reachability.ts 把"不可达/无出口/死循环"纳入 CI 级检查，防止回归。

## D-008 内容规模的三层保障
- 日期：2026-09-13 06:40
- 背景：事件/决策/结局数量易虚报。
- 决策：数量由 `content:validate`（结构）+ `content:endings:count`（真实经 Resolver+Composer 枚举、fingerprint 去重）+ `content:reachability`（图遍历）三脚本机械化证明，拒绝口头宣称。

## D-009 发布前内容审计矩阵（§40）人工评分记录
- 日期：2026-09-13 06:50（自评，非独立第三方）
- 科研线：教学有效性5/决策复杂度4/延迟后果5/真实性4/AI融入5/重玩4/内容AI味4/资产继承5 → 均值 **4.5**
- 竞赛线：4/4/4/5/4/4/4/4 → **4.1**
- 创业线：5/5/5/4/4/4/4/4 → **4.4**
- 三线均 ≥4.0 达标。评分人为构建会话自身，独立第三方评分留待 S001/S002。

## D-010 模拟模式与真实模式的标识纪律
- 日期：2026-09-13 04:00
- 决策：模拟 Adapter 输出强制携带 `===== 教学模拟环境 =====` 头；UI 下拉以"（教学模拟）"后缀区分；剧情文本（竞赛D9/创业D12）显式解释两者界线。对应"禁止假装 CLI 可用"红线。
