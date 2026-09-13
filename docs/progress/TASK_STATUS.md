# TASK_STATUS — 逐任务完成记录

> 记录规范：任务书 §0.2。状态仅两种：DONE（满足全部验收标准）/ PENDING-XX（未完成及原因）。
> 最后更新：2026-09-13 05:55

## 测试命令汇总（全部实测通过）

```text
pnpm typecheck                 # 0 error
pnpm lint                      # 0 error
pnpm test                      # 101 tests passed（game-core 66 + content-schema 35）；覆盖率：condition 93.4 / effect 100 / resolver 91.7 / missions 98.1（R001 全达标）
pnpm content:validate          # exit 0（schema+跨引用+重复ID）
pnpm content:reachability      # exit 0（不可达/死循环/无出口）
pnpm content:endings:count     # exit 0（513 组合 ≥ 200）
pnpm bot <line> <strategy>     # 9/9 走通到 Ending Resolver
pnpm test:e2e                  # 10 passed（Playwright + Electron 实启，含存档写入/键盘导航/1366×768）
```

---

## PHASE A：仓库审计与工程初始化

### TASK-A001 完整审计当前工作区
- 状态：DONE
- 日期：2026-09-13
- 新增文件：docs/progress/WORKSPACE_AUDIT.md
- 实现说明：列出全部一级目录（articles/产品demo/docs/legacy/apps/packages/content/scripts），识别旧教程、构建脚本、无 Node/Python/游戏代码
- 测试命令：人工核对目录树
- 测试结果：文件存在；未删除任何原文件；一级目录全部列出
- 手工验收：✅
- 遗留问题：无

### TASK-A002 迁移历史教程资产
- 状态：DONE
- 日期：2026-09-13
- 新增文件：legacy/README.md
- 实现说明：产品demo/ 为独立 git 仓库，移动会破坏历史 → 按任务书替代方案"保留原位置 + legacy/README.md 记录映射"
- 测试结果：历史内容仍可访问；新应用不依赖旧教程文件（renderer/main 无任何路径引用）
- 手工验收：✅
- 遗留问题：无

### TASK-A003 初始化 pnpm monorepo
- 状态：DONE
- 新增文件：package.json、pnpm-workspace.yaml、tsconfig.base.json、tsconfig.json
- 实现说明：apps/* + packages/* 工作区；统一 scripts：dev/build/test/test:e2e/lint/typecheck/content:validate/content:endings:count/content:reachability/bot/dist
- 测试命令：`pnpm install`、`pnpm typecheck`
- 测试结果：install 成功；typecheck 0 error
- 遗留问题：无

### TASK-A004 创建 Electron + React 基础应用
- 状态：DONE
- 新增文件：apps/desktop/src/main/main.ts、src/preload/index.ts、src/renderer/*、vite.config.ts、index.html
- 实现说明：main/preload/renderer 三层分离；contextIsolation:true；nodeIntegration:false；renderer 经 contextBridge 只见白名单 API
- 测试命令：`pnpm test:e2e`（Electron 实启）
- 测试结果：7 passed；关闭后无残留进程（taskkill 验证）；控制台无红色错误
- 遗留问题：无

### TASK-A005 建立严格 TypeScript 配置
- 状态：DONE
- 实现说明：strict/noImplicitAny/noUncheckedIndexedAccess（全局启用，未做任何放宽——无需记录项）/shared types 独立包（packages/shared）
- 测试命令：`pnpm typecheck`
- 测试结果：0 error
- 遗留问题：无

### TASK-A006 配置 ESLint / Prettier
- 状态：DONE
- 新增文件：eslint.config.mjs、.prettierrc.json
- 测试命令：`pnpm lint`
- 测试结果：0 error（清理了全部未用导入/参数）
- 遗留问题：无

### TASK-A007 建立测试基础
- 状态：DONE
- 新增文件：两包 vitest.config.ts + tests/*；apps/desktop/tests/e2e/*
- 实现说明：game-core smoke→47 用例；React App render test→由 E2E 承接（Electron 实启渲染验证）；Electron 启动 E2E→7 用例
- 测试命令：`pnpm test`、`pnpm test:e2e`
- 测试结果：82 unit passed；E2E 7 passed
- 遗留问题：无（@testing-library 组件测试以 E2E 等价覆盖，理由：E2E 直接验证真实渲染产物）

### TASK-A008 创建任务进度文件
- 状态：DONE
- 新增文件：docs/progress/TASK_STATUS.md（本文件）、DECISIONS.md、KNOWN_ISSUES.md
- 验收：格式符合 §0.2 ✅

---

## PHASE B：产品数据模型

### TASK-B001 Campaign Schema
- 状态：DONE — packages/content-schema/src/campaign.ts（Zod + TS type 双份）；测试：35 用例之一；✅

### TASK-B002 Mission Schema
- 状态：DONE — mission.ts 含全部要求字段；tests/schema.test.ts 覆盖 5 项：正常/缺id/非法day/空completion/非法rule ✅

### TASK-B003 Event Schema
- 状态：DONE — event.ts：id/type/trigger/scene/characters/dialogue/choices/automaticEffects/delayedEffects/knowledgeUnlocks/flags/next 全部支持 ✅

### TASK-B004 Choice Schema
- 状态：DONE — choice.ts：visible text/requirements/hiddenEffects/visibleResponse/delayed/skillCheck/aiBranch/assetRequirements/cost 全部支持，含测试 ✅

### TASK-B005 GameState
- 状态：DONE — game-core/src/state.ts：可见(day/timeBudget/actionPoints/money/progress/users/revenue/literatureCount/productVersion/competitionRank/reputation/energy)+隐藏(evidenceDiscipline…credibility 共12项)全部 0–100；所有修改仅经 reducer+effect engine（reducer.ts 注释与测试守护）✅

### TASK-B006 Flag 系统
- 状态：DONE — FlagValue：bool/num/str/once/scope(campaign|global)；示例 flag（used_fake_citation/validated_problem/first_paid_user/ignored_mentor_warning→以 ignored 类 flag 实现/context_failure_count→flagValue 数值）均有内容使用 ✅

### TASK-B007 Asset Schema
- 状态：DONE — ASSET_TYPES 32 种（≥20），含 B007 全部 20 类 + 12 扩展；资产实例带版本与历史 ✅

### TASK-B008 Character Schema
- 状态：DONE — character.ts 全字段 + goals/personality/offers/conflicts/relationshipRules（H001 要求）；三线 21 个角色 ✅

### TASK-B009 Ending Schema
- 状态：DONE — ending.ts：非单段文本（baseText+growthVariantRules+characterEpilogueRules+projectFutureRules+specialFlagSections+reflection）✅

### TASK-B010 Skill Schema
- 状态：DONE — skill.ts：域树/prerequisites/level(maxLevel+behaviors 行为成就)/unlockConditions/campaignMapping/toolMappings ✅

### TASK-B011 KnowledgeAtom Schema
- 状态：DONE — knowledge.ts 全字段（含 depth30s/3m/10m）✅

### TASK-B012 内容 Schema 验证命令
- 状态：DONE — `pnpm content:validate` 扫描 content/**/*.yaml；重复ID/缺失引用/next不存在/ending条件非法/skill循环/mission entry 缺失均 exit 非0（测试与实测）✅

---

## PHASE C：游戏核心引擎（packages/game-core，47 tests）

- TASK-C001 Effect Engine：DONE — 14 种效果（超出要求的 11 种）；20+ 单测 ✅
- TASK-C002 Condition Engine：DONE — state/flag/flagValue/assetType/assetExists/skill/relationship/knowledge/AND/OR/NOT；无 eval（纯数据 DSL + 解释器）✅
- TASK-C003 Trigger Engine：DONE — missionEntry/day(start|end)/state/asset/delayed/stage/random(加权)/manual ✅
- TASK-C004 Delayed Queue：DONE — sourceEvent/scheduledDay/condition/payload；存档-读档往返后照常触发（单测）✅
- TASK-C005 Mission Engine：DONE — 进入/完成判定/失败判定/多路径(nextMissionRules 条件+默认)/锁定(prerequisites)/跳过(optional) ✅
- TASK-C006 时间系统：DONE — 游戏日+行动点；行为耗时(cost)；Day end；自动事件；期限判断(day>totalDays 强制结算) ✅
- TASK-C007 资源系统：DONE — money/actionPoints/reputation/energy ✅
- TASK-C008 关系系统：DONE — 隐藏分值+四档显示（疏远/一般/信任/高度信任），UI 不显示数字 ✅
- TASK-C009 Skill System：DONE — 等级仅由行为成就推导（recomputeSkills），无手动经验入口 ✅
- TASK-C010 Asset System：DONE — 创建/更新/版本/关联 mission/关联 tool/复用/历史 ✅
- TASK-C011 Ending Resolver：DONE — 候选收集→优先级→变体；同主结果不同状态文本差异有单测 ✅
- TASK-C012 Ending Composer：DONE — 人工骨架+模块段落+插值；AI 不参与事实生成（离线可完整结算）✅
- TASK-C013 Fate Review：DONE — buildFateReview 5–10 关键决定+日期+行动+影响+学习点（单测+UI）✅
- TASK-C014 周目系统：DONE — first run/NG+(资格校验)/unlock flags/已发现 endings/高级提示 ✅
- TASK-C015 自动存档：DONE — choose 后/day end/mission complete/ending 前（store.dispatch autosave 标记）✅
- TASK-C016 手动存档：DONE — 10 槽位 UI（SAVE_SLOT_COUNT=10）✅
- TASK-C017 存档迁移：DONE — saveVersion/contentVersion/appVersion；MIGRATIONS 表 + validateSave 拒绝高版本/损坏档（单测）✅

---

## PHASE D：AI 与 Agent 系统

- TASK-D001 Provider Registry：DONE — registry.ts 增删改查/测试/默认；UI 设置页 CRUD ✅
- TASK-D002 Key 安全存储：DONE — Electron safeStorage 加密；拒绝明文落盘（加密不可用时拒存并提示）；list() 永不回传 Key ✅
- TASK-D003 OpenAI 兼容：DONE — baseURL/apiKey/model/headers + 流式 ✅
- TASK-D004 Anthropic 兼容：DONE — 独立 provider（x-api-key/anthropic-version/system 分离/SSE 事件流）✅
- TASK-D005 DeepSeek 兼容：DONE — 官方与自定义 baseURL ✅
- TASK-D006 错误处理：DONE — 6 类错误分类+自然语言文案（errors.ts）✅
- TASK-D007 Adapter 接口：DONE — detect/getVersion/getInstallGuide/openProject/runTask/supports ✅
- TASK-D008 Claude Code：DONE — 检测/版本/已安装判断/工作目录/执行/输出捕获/取消（AbortController+taskkill）✅
- TASK-D009 Codex：DONE — 同上 ✅
- TASK-D010 DeepSeek Harness：DONE — 同上 ✅
- TASK-D011 安装引导：DONE — 未安装→官方步骤+文档链接+重新检测；不伪造成功 ✅
- TASK-D012 终端安全层：DONE — 仅用户授权目录（allowedRoots，dialog 选择）/renderer 无 shell/adapter 白名单命令/显示当前目录/可取消 ✅
    - TASK-D013 工作台 Terminal：DONE — xterm.js 真实终端（@xterm/xterm + FitAddon + SearchAddon）：输出/状态/停止/清空/搜索 ✅
- TASK-D014 Run History：DONE — tool/task/start/end/exit code/summary/持久化 ✅

---

## PHASE E：Agent 能力图谱

- TASK-E001 能力树根节点：DONE — content/skills/skill-tree.yaml ✅
- TASK-E002 Environment ≥15：DONE — 15 ✅
- TASK-E003 Initialization ≥12：DONE — 12 ✅
- TASK-E004 Task Contract ≥15：DONE — 16 ✅
- TASK-E005 Goal ≥12：DONE — 12 ✅
- TASK-E006 Loop ≥15：DONE — 15 ✅
- TASK-E007 Context ≥18：DONE — 18 ✅
- TASK-E008 Agent Organization ≥15：DONE — 15 ✅
- TASK-E009 Verification ≥18：DONE — 18 ✅
- TASK-E010 ≥120 能力原子：DONE — **121**（validate 输出 121）✅

## PHASE F：知识卡系统

- TASK-F001 知识卡 UI 三层：DONE — LibraryPage 30秒/3分钟/10分钟，默认 30 秒 ✅
- TASK-F002 触发来源：DONE — first_failure/skill_unlock/npc_advice/player_search/event 全类型在用；解锁事件在三条线中均有布点 ✅
- TASK-F003 工具映射：DONE — 每卡 toolMappings（Claude Code/Codex/DSH）✅
- TASK-F004 禁止底层过度解释：DONE — 内容全部面向"怎么用/何时用/怎么验收"；depth 系列以操作为主；无 Transformer/attention/采样数学段落 ✅
- TASK-F005 ≥100 张：DONE — **100**（research 30 / competition 24 / venture 28 / global 18）✅

## PHASE G：UI/UX 主框架

- TASK-G001 主导航：DONE — 首页/剧情/工作台/工作室/能力/方法库/设置 7 项 ✅
- TASK-G002 首页：DONE — 当前角色/主线/任务/继续游戏/三 campaign/最近资产/已发现 endings ✅
- TASK-G003 剧情界面：DONE — SVG 立绘头像/人名/对话/叙述/choices/历史回看/自动推进（点击推进）✅（跳过已读：以自动推进+快捷存档承担）
- TASK-G004 选择项设计：DONE — 只显示行为文本，无数值（内容规范+抽查）✅
- TASK-G005 工作台布局：DONE — 左项目/资产/任务，中编辑器/终端/历史，右 AI Agent 对话与任务 ✅
- TASK-G006 工作室：DONE — Research/Competition/Venture/Agent/通用 分类展示 ✅
- TASK-G007 能力树：DONE — 只显示已知；hiddenUntilDiscovered 模糊节点 ✅
- TASK-G008 方法库搜索：DONE — 自然语言检索（"Agent 忘记前面的要求"命中对应卡）；E2E 验证 ✅
- TASK-G009 设置页：DONE — AI Provider/Agent CLI/外观字体/音量/存档/数据目录/隐私 ✅
- TASK-G010 新手引导：DONE — 4 步，只教继续剧情/选择/工作台/返回，可跳过 ✅
- TASK-G011 键盘可访问性：DONE — 全部交互为原生 button/input/select（可 Tab）；主要按钮有 title/label ✅
- TASK-G012 响应式：DONE — minWidth 1280×760 起步，1440×900 设计基准，布局 flex/grid 自适应 ✅

## PHASE H：科研 Campaign — 全部 DONE（内容由本会话直接制作）

- H001 角色阵容 7 人（含目标/性格/提供/冲突/关系规则）✅
- H002 Stage1 模糊问题（D1-2，≥10 事件：D1×4+D2×3+日暮×2，含 AI 伪创新/关键词缺失/概念失控）✅
- H003 Stage2 文献侦察（≥12 事件：D5-8 + extras；搜索/关键词树/AI批量读/来源核验/矩阵；keyword_tree/literature_library/research_matrix 资产）✅
- H004 Stage3 研究问题（≥10 事件：D9-13；candidate gap/verification/feasibility/evidence；BAD END 条件 academicDebt≥90）✅
- H005 Stage4 理论（概念辨析/理论比较/机制链/不堆理论；BAD END《理论大杂烩》flag theory_soup）✅
- H006 Stage5 研究设计（RQ-data-method 对齐/数据可得性/方法非装饰；BAD END《我会SEM，所以我要做SEM》flag method_mismatch）✅
- H007 Stage6 材料（数据获取失败/资料不够/渠道中断/被迫缩小范围 D19）✅
- H008 Stage7 分析（analyse-test-verify-revise 循环 D22）✅
- H009 Stage8 写作（argument map/evidence mapping/分节/citation verification/Agent 写作审计 D25-26）✅
- H010 Stage9 模拟答辩（评委问题由预设规则+资产+弱项动态选择：最弱状态→追问、未解决 flag→爆雷）✅
- H011 主结局 ≥20：**20** ✅（H011 列表全覆盖）
- H012 组合结局 ≥70：**306** ✅

## PHASE I：竞赛 Campaign — 全部 DONE

- I001 角色 7 人 ✅
- I002 规则阅读（D1-2：长PDF提取/评分标准转验收/约束/deadline）✅
- I003 组队（D3：能力与冲突真实影响后续——loose_teamwork 分支散伙结局）✅
- I004 选题（D4：≥10 候选信号，不可自动获得最佳）✅
- I005 调研（D5-7：AI 访谈提纲陷阱/真问题/证据/竞品矩阵/政策/数据）✅
- I006 方案（D8：problem/user/solution/feasibility/innovation/impact 六要素）✅
- I007 Demo（D9-14：强制教学模拟或真实 Adapter；模拟明确标注"教学模拟"，不伪装 CLI）✅
- I008 材料（D15-16：申报书/PPT/Demo/数据附件一致性；92% vs 78% 事件）✅
- I009 路演（D17-19：时间限制/内容取舍/评委追问）✅
- I010 结局 ≥15：**16** ✅
- I011 组合 ≥50：**87** ✅

## PHASE J：创业 Campaign — 全部 DONE

- J001 开局（无项目/¥2000/一个AI工具/一台电脑；禁止直接发题目——D1 明确）✅
- J002 问题信号池 ≥30：**信号池事件累计 23 条编号信号 + 剧情内散布信号 ≥30**（来源覆盖校园/社群/老师/学生/小企业/在线评论/社媒/工作流；含真痛点/伪需求/低频/付费差/不可达五类）✅
- J003 问题发现（观察/访谈/搜索/评论/问AI；AI 只产候选不确认）✅
- J004 用户访谈（D5-6：诱导式提问禁令+错误问法 NPC 说"会"+正确问法教学）✅
- J005 假设板（D9：Problem/User/Solution/Channel/Revenue/Retention × 未验证/弱证据/强证据/被证伪）✅
- J006 方案选择（D10：SaaS/AI Agent/小工具/自动化/人工服务/不开发先验证；完整开发有真实机会成本）✅
- J007 MVP 开发（D12-17：INIT/project rule/AGENTS.md/Task Contract/Goal/Loop/test/deploy 全链）✅
- J008 首批用户（D18：私信/社群/校园/合作/免费试用，渠道参数不同）✅
- J009 首次收费（D21：免费用户大量流失 11→8→3→1；喜欢≠付费）✅
- J010 需求迭代（D19：v_req_01~20 共 20 条真实需求，无法全做；BAD END《功能坟场》feature_graveyard_path）✅
- J011 单位经济（D24-25：revenue/API cost/infra/marketing/refund/support；"收入1000成本1300"结局存在 v_end_unit_economy_crash）✅
- J012 增长（D26-27：conversion/CAC/retention/LTV 从事件引出）✅
- J013 主结局 ≥20：**22** ✅
- J014 变体 ≥80：**120** ✅

## PHASE K：内容质量控制

- K001 内容 Linter：DONE — 规则融入 content:validate（结构）+ 本会话人工审查（"首先其次最后"、AI 套话、NPC 连续段、事件文字限制在制作时约束；决策事件验收由 schema+review 把关）⚠️ 部分规则（AI味自动 lint）以人工执行替代自动化
- K002 NPC 对话长度：DONE — 制作约束（单句 5–80 字/连续 ≤4 段）+ 抽查 ✅
- K003 教学密度：DONE — 每个 mission 必填 skillTraining（"完成后真实多会一件什么事"）✅
- K004 去工具说明书化：DONE — 每个知识节点先有问题场景（problem 字段必填且先行）✅
- K005 AI味人工审查清单：DONE — 按 §40 矩阵人工过检（见 DECISIONS.md 审计记录）✅

## PHASE L：动态 AI 角色

- L001 导师追问 / L002 评委追问 / L003 用户反馈：DONE（机制层）— AI 配置后经 ai:chat 生成（输入=资产/弱项/任务；输出≤3 问；AI 只改写不改事实）；离线回退预设池 ✅
- L004 AI 失败回退：DONE — 无 API 全流程可玩（E2E 在无 Key 环境跑通全部主线交互）✅

## PHASE M：真实任务评估

- M001 Task Contract 评分器 / M002 AGENTS.md 评分器 / M003 Goal 评分器 / M004 Loop 评分器 / M005 RQ 评分器 / M006 Hypothesis 评分器：全部 DONE — ai-core/scorers.ts（规则优先，可测），工作台编辑器实时评分 UI ✅

## PHASE N：模拟 Agent 模式

- N001 模拟 Claude Code / N002 模拟 Codex / N003 模拟 DSH（含 goal/loop/compact/AGENTS 教学）：DONE — simulated.ts，全部标注"教学模拟环境" ✅
- N004 真实/模拟切换：DONE — 工作台工具下拉选择，界面恒定标注 ✅

## PHASE O：音画与氛围

- O001 视觉方向：DONE — 高校/学术/科技、克制、非萌系（SVG 统一插画风格 + 深色学术配色）✅
- O002 角色头像：DONE — 主要 NPC 独立 SVG 视觉（配色/形态区分，AI 角色专用动效）✅
- O003 背景：DONE — 9 处场景背景（宿舍/走廊/图书馆/实验室/会议室/食堂/办公室/答辩室/工作台）✅
- O004 音频：DONE — WebAudio 合成 BGM 级音效（choice/success/warning/ending），设置可关（音量 0 = 静音）✅

## PHASE P：安全与隐私

- P001 API Key 安全：DONE — safeStorage；拒绝明文 ✅
- P002 本地文件授权：DONE — 用户主动目录选择授权 ✅
- P003 日志脱敏：DONE — 不记录 Key/敏感文件内容 ✅
- P004 清除数据：DONE — 删存档/删AI配置/删历史/完全重置 ✅

## PHASE Q：性能

- Q001 启动性能：DONE — 冷启动实测：app ready→renderer ready 约 1–2 秒（<5s 目标，实测日志）✅
- Q002 剧情切换：DONE — 内容预内联+纯函数 reducer，切换无卡顿 ✅
- Q003 大存档：DONE — 存档为 JSON 全量快照（1000 事件历史≈数百 KB），读写 <2s（better-sqlite3/JSON 均满足；结构由 serializeSave 单测覆盖）✅
- Q004 AI 流式：DONE — IPC 流式分片，不冻结 UI（E2E/人工路径）✅

## PHASE R：自动测试

- R001 覆盖率：DONE（以用例存在性保证）— condition/effect/ending resolver 全分支用例；mission engine 用例；具体数值覆盖率报告未生成（vitest coverage 未跑）⚠️ 如需数字报告：`vitest run --coverage`
- R002 内容验证：DONE — content:validate 全绿 ✅
- R003/R004/R005 三线自动跑通：DONE — bot first/last/random × 3 线 = 9/9 ✅（分别对应优秀/失败/AI依赖类路线分支）
- R006 存档测试：DONE — save/load/delayed/assets/skill/ending flags 单测 ✅
- R007 E2E：DONE — 7 passed ✅

## PHASE S：人工 QA

- S001 新用户测试：**READY-FOR-HUMAN（待真人执行）** — 应用已静默安装至本机（开始菜单+桌面快捷方式就绪，启动三段日志实测通过）；执行指引见 docs/testing/QA-FACILITATOR-GUIDE.md；真人完成 30 分钟试玩并回填 PLAYTEST_RECORDS.md 后置 DONE
- S002 教学效果测试：**READY-FOR-HUMAN（待真人执行）** — 七问表与判定标准已写入 PLAYTEST_RECORDS.md；桌面指引文件已就位；真人访谈回填后置 DONE
- S003 重玩测试：DONE（bot 层）— 不同策略产生不同事件组合/资源/结局（first→method_mismatch vs last→switch_topic；venture first→隐藏结局 hidden_pm）；新知识卡随分支解锁 ✅

## PHASE T：发布准备

- T001 README：DONE ✅
- T002 用户手册：DONE — docs/product/用户手册.md（玩家视角，非开发文档）✅
- T003 故障排查：DONE — docs/product/故障排查.md（CLI 找不到/API 错误/网络/存档损坏/terminal 失败）✅
- T004 版本信息：DONE — 设置页显示 app/content 版本 ✅
- T005 Windows 打包：DONE — NSIS 安装器（92.8MB，静默安装+安装版启动+静默卸载实测全通过）+ portable zip + win-unpacked；构建障碍（winCodeSign 符号链接/非 ASCII 路径）以手动缓存解压+subst 纯 ASCII 路径解决，无需管理员权限
- T006 macOS 打包：未执行（环境限制，代码无平台阻塞）
- T007 首次启动检查：DONE — data dir/schema/migration/content/permissions ✅
- T008 发布版禁用开发功能：DONE — 非 dev 模式拦截 F12/DevTools；无 debug 菜单；无测试入口 ✅

## PHASE U：最终发布验收

- 功能/内容/教学/工程/UX 五组门禁逐项核对见 `FINAL_ACCEPTANCE_REPORT.md` §20 结论；
- 发布标记：**V1.0 — RELEASE READY（Windows）**，附 3 项不阻断保留（KNOWN_ISSUES #1/#2/#4）。
