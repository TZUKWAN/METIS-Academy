# METIS Academy 可发布版本——全量产品构建任务书

> 文档用途：本文件不是概念方案，而是给执行型 AGENT 使用的**逐项施工任务书**。  
> 执行原则：**严格按任务顺序执行；每个任务完成后必须自测并满足验收标准；未通过验收不得进入后续任务。**
>
> 目标：当本文档中所有 `TASK-*` 均完成并验收通过后，项目必须达到“可公开发布的 V1.0 桌面游戏”状态，而不是 Demo、原型、PPT 或静态网页。
>
> 产品暂定名：**METIS Academy**  
> 产品类型：**剧情驱动 + 项目模拟 + AI Agent 能力训练的桌面游戏**  
> 核心场景：科研、竞赛、创业  
> 核心学习目标：让用户在游戏过程中学会如何实际使用 Claude Code、Codex、DeepSeek Harness 及其他 Agent 工具完成复杂任务。  
> 教学原则：只教“怎么用、什么时候用、怎么验收”，不要求用户理解底层算法和实现原理。

---

# 0. AGENT 执行总规则

## 0.1 必须遵守的执行规则

执行本任务书的 AGENT 必须遵守以下规则：

1. **先检查工作区，后修改。**
2. 不允许假设某个文件存在，必须实际确认。
3. 不允许一次同时实现多个无关任务。
4. 每完成一个 `TASK-*`：
   - 运行对应测试；
   - 检查验收标准；
   - 在 `docs/progress/TASK_STATUS.md` 中记录结果；
   - 写清楚修改了哪些文件；
   - 写清楚使用了什么测试命令；
   - 记录测试结果；
   - 若失败，继续修复直到通过。
5. 不允许为了“先跑起来”写大量 TODO、mock、占位函数后直接标记完成。
6. 任何页面中的按钮、菜单、输入框都必须有实际行为；暂未实现功能必须明确禁用并显示原因。
7. 禁止伪造：
   - 测试通过；
   - AI 调用结果；
   - CLI 可用性；
   - API 状态；
   - 用户数据；
   - 结局数量。
8. 不允许删除用户已有内容，除非本任务明确要求。
9. 原 `metis-aisop` 中的教程内容视为**历史素材库**，不得直接覆盖，应迁移到 `legacy/` 或保留原目录。
10. 每次对核心状态机、存档格式、剧情 DSL、AI Adapter 做修改，都必须补测试。
11. 所有重要业务逻辑必须可测试，不可全部塞在 React 组件中。
12. 先保证逻辑正确，再做视觉精修。
13. 避免过度设计，不允许为了“看起来复杂”而引入不必要技术。
14. UI 文案必须面向普通大学生/研究生，不得出现大段底层工程术语解释。
15. 玩家真正需要理解的是：
    - 什么时候该用什么能力；
    - 如何配置；
    - 如何给任务；
    - 如何让 Agent 持续工作；
    - 如何保持上下文；
    - 如何检查结果；
    - 如何修正错误。
16. 如果执行过程中发现本任务书与已有代码发生冲突：
    - 优先保存数据与已有可用能力；
    - 在 `docs/progress/DECISIONS.md` 中记录冲突；
    - 选择对 V1 最稳妥的实现；
    - 不得静默改变产品目标。

---

## 0.2 每个任务的统一完成格式

完成任何任务后，在 `docs/progress/TASK_STATUS.md` 增加：

```md
## TASK-XXX
- 状态：DONE
- 日期：
- 修改文件：
- 新增文件：
- 实现说明：
- 测试命令：
- 测试结果：
- 手工验收：
- 遗留问题：无 / 明确列出
```

只有满足任务全部验收标准时，状态才能写 `DONE`。

---

# 1. 产品最终验收定义

整个项目最终必须满足以下条件。

## 1.1 产品体验

玩家启动游戏后必须可以：

1. 新建角色。
2. 进入统一主界面。
3. 看到三条主线：
   - 科研；
   - 竞赛；
   - 创业。
4. 至少完整游玩：
   - 科研主线；
   - 竞赛主线；
   - 创业主线。
5. 在游戏过程中：
   - 接任务；
   - 阅读剧情；
   - 选择行动；
   - 使用工作台；
   - 调用内置 AI；
   - 配置外部 Agent 工具；
   - 产生项目资产；
   - 遇到延迟后果；
   - 失败；
   - 修正；
   - 形成结局；
   - 查看命运回溯。
6. 游戏支持：
   - 自动存档；
   - 手工存档；
   - 读取；
   - 新周目；
   - 多存档槽位。

---

## 1.2 教学结果

完整游玩后，玩家至少必须理解并实际操作过：

- AI 模型/API 基本配置；
- 工作目录概念；
- CLI Agent 的安装检测；
- 项目 INIT；
- 项目规则文件；
- `AGENTS.md`；
- `CLAUDE.md`；
- Task Contract；
- Prompt 的任务化设计；
- Goal；
- Loop；
- Context 管理；
- Compact；
- 新 Session；
- Handoff；
- 多 Agent / Subagent；
- 自动测试；
- 验收条件；
- AI 结果独立验证；
- 长任务分阶段执行；
- Research / Competition / Venture 三类工作流。

---

## 1.3 内容规模最低标准

V1 最低要求：

### 科研线
- 30 个“游戏日”或等价阶段；
- 不少于 90 个事件；
- 不少于 30 个关键决策；
- 不少于 20 个主结局；
- 不少于 70 个可见组合结局变体。

### 竞赛线
- 21 个“游戏日”或等价阶段；
- 不少于 70 个事件；
- 不少于 25 个关键决策；
- 不少于 15 个主结局；
- 不少于 50 个组合结局变体。

### 创业线
- 30 个“游戏日”或等价阶段；
- 不少于 100 个事件；
- 不少于 35 个关键决策；
- 不少于 20 个主结局；
- 不少于 80 个组合结局变体。

### 总体
- 主结局 ≥ 55；
- 经状态、角色、资产、特殊 Flag 组合后，可显示的最终 Ending ≥ 200；
- Agent 能力原子 ≥ 120；
- 知识卡 ≥ 100；
- 可持续使用的玩家资产类型 ≥ 20。

---

# 2. 固定技术路线

除非已有项目存在成熟等价实现，否则 V1 统一采用以下技术栈。

## 2.1 桌面端

- Electron
- React
- TypeScript
- Vite

理由：
- 需要本地文件访问；
- 需要 CLI 检测与终端；
- 需要调用 Claude Code / Codex / DeepSeek Harness；
- 需要跨 Windows/macOS；
- 比 Tauri 对轻量模型更容易维护。

---

## 2.2 UI

- Tailwind CSS
- shadcn/ui 或 Radix primitives
- Lucide icons
- Framer Motion 仅用于必要转场
- Monaco Editor：文本/配置编辑
- xterm.js：终端输出

禁止：
- 大量自制 UI 基础组件；
- 页面级花哨动画；
- 影响可读性的玻璃拟态堆叠。

---

## 2.3 状态

- Zustand：前端 UI 状态
- SQLite：持久游戏数据
- better-sqlite3：Electron 主进程使用
- Zod：运行时 schema 校验

---

## 2.4 AI

统一抽象 Provider 层：

```ts
interface AIProvider {
  id: string
  name: string
  testConnection(): Promise<ConnectionResult>
  chat(request: ChatRequest): Promise<ChatResponse>
  stream(request: ChatRequest): AsyncIterable<ChatChunk>
}
```

V1 至少支持：

- OpenAI-compatible
- Anthropic-compatible
- DeepSeek-compatible

CLI Agent 另做 Adapter：

- Claude Code
- Codex CLI
- DeepSeek Harness

---

## 2.5 测试

- Vitest：单元测试
- React Testing Library：组件
- Playwright：E2E
- ESLint
- TypeScript strict
- Prettier

---

## 2.6 打包

- electron-builder
- Windows installer
- macOS dmg（条件允许时）
- portable zip

---

# 3. 目标目录结构

最终至少形成：

```text
/
├─ apps/
│  └─ desktop/
│     ├─ src/
│     │  ├─ main/
│     │  ├─ preload/
│     │  └─ renderer/
│     ├─ tests/
│     └─ package.json
│
├─ packages/
│  ├─ game-core/
│  ├─ content-schema/
│  ├─ ai-core/
│  ├─ agent-adapters/
│  ├─ skill-system/
│  └─ shared/
│
├─ content/
│  ├─ campaigns/
│  │  ├─ research/
│  │  ├─ competition/
│  │  └─ venture/
│  ├─ events/
│  ├─ endings/
│  ├─ skills/
│  ├─ knowledge/
│  ├─ characters/
│  └─ assets/
│
├─ legacy/
│
├─ docs/
│  ├─ product/
│  ├─ architecture/
│  ├─ content/
│  ├─ testing/
│  ├─ release/
│  └─ progress/
│
├─ scripts/
│
├─ package.json
├─ pnpm-workspace.yaml
└─ README.md
```

---

# 4. PHASE A：仓库审计与工程初始化

## TASK-A001：完整审计当前工作区

### 目标
确认已有项目和内容，避免覆盖历史文件。

### 操作
1. 列出根目录文件。
2. 识别：
   - 文档；
   - Markdown；
   - 构建脚本；
   - Node 项目；
   - Python 项目；
   - 已有游戏代码。
3. 生成：
   `docs/progress/WORKSPACE_AUDIT.md`
4. 内容至少包括：
   - 当前目录树；
   - 可复用资产；
   - 需保留内容；
   - 需迁移内容；
   - 潜在冲突。

### 验收
- 文件存在。
- 没有删除任何原文件。
- 审计列出全部一级目录。

---

## TASK-A002：迁移历史教程资产

### 目标
将旧教程保留为素材，不参与新游戏核心结构。

### 操作
如当前仓库存在：
- `docA/`
- `docB/`
- 旧 `.docx`
- 旧 `.pptx`
- 旧 build 脚本

则移动或复制到：

```text
legacy/tutorial-v0/
```

如果移动可能破坏 Git 历史，则保留原位置，并在 `legacy/README.md` 记录映射。

### 验收
- 历史内容仍可访问。
- 新应用不直接依赖旧教程文件。
- `legacy/README.md` 解释用途。

---

## TASK-A003：初始化 pnpm monorepo

### 操作
1. 创建根 `package.json`。
2. 创建 `pnpm-workspace.yaml`。
3. 建立 `apps/` 和 `packages/`。
4. 配置统一 scripts：
   - `dev`
   - `build`
   - `test`
   - `test:e2e`
   - `lint`
   - `typecheck`

### 验收
```bash
pnpm install
pnpm typecheck
```
可执行且无错误。

---

## TASK-A004：创建 Electron + React 基础应用

### 要求
- main / preload / renderer 明确分离；
- `contextIsolation: true`；
- `nodeIntegration: false`；
- renderer 不可直接调用 Node API。

### 验收
- `pnpm dev` 启动桌面窗口；
- 关闭后无残留异常进程；
- 控制台无红色错误。

---

## TASK-A005：建立严格 TypeScript 配置

### 要求
- `strict: true`
- noImplicitAny
- noUncheckedIndexedAccess（允许按需调整但必须记录）
- shared types 独立包

### 验收
`pnpm typecheck` = 0 error。

---

## TASK-A006：配置 ESLint / Prettier

### 验收
`pnpm lint` 0 error。

---

## TASK-A007：建立测试基础

### 操作
分别创建：
- unit test；
- component test；
- Playwright。

建立最小测试：
1. game-core smoke test；
2. React App render test；
3. Electron 启动 E2E。

### 验收
`pnpm test` 全过。

---

## TASK-A008：创建任务进度文件

新增：
- `docs/progress/TASK_STATUS.md`
- `docs/progress/DECISIONS.md`
- `docs/progress/KNOWN_ISSUES.md`

### 验收
格式符合本任务书要求。

---

# 5. PHASE B：产品数据模型

## TASK-B001：定义 Campaign Schema

创建 `packages/content-schema/src/campaign.ts`

字段至少：

```ts
Campaign {
  id
  title
  subtitle
  description
  type
  cover
  startMissionId
  endingPool
  defaultState
  skillFocus
  estimatedMinutes
}
```

### 验收
Zod schema + TypeScript type 同时存在。

---

## TASK-B002：定义 Mission Schema

必须支持：

- id
- campaignId
- stage
- day
- title
- objective
- briefing
- prerequisites
- entryEventId
- completionConditions
- failureConditions
- rewards
- requiredAssets
- recommendedSkills
- nextMissionRules

### 验收
至少写 5 个测试：
- 正常 mission；
- 缺 id；
- 非法 day；
- 空 completion；
- 非法 rule。

---

## TASK-B003：定义 Event Schema

字段：

```ts
Event {
  id
  type
  trigger
  scene
  characters
  dialogue
  choices
  automaticEffects
  delayedEffects
  knowledgeUnlocks
  flags
  next
}
```

---

## TASK-B004：定义 Choice Schema

必须支持：

- visible text；
- requirements；
- hidden effects；
- visible response；
- delayed consequences；
- skill checks；
- AI evaluation branch；
- asset requirements；
- time/resource cost。

---

## TASK-B005：定义 GameState

必须区分：

### 可见状态
- day
- timeBudget
- money
- progress
- users
- revenue
- literatureCount
- productVersion
- competitionRank

### 隐藏状态
- evidenceDiscipline
- aiDependence
- independence
- execution
- userUnderstanding
- technicalDebt
- academicDebt
- perfectionism
- riskTolerance
- mentorTrust
- teamTrust
- credibility

值统一定义范围，例如 0–100。

### 验收
所有 state 修改只能经过 reducer/effect engine，不允许 UI 任意改。

---

## TASK-B006：定义 Flag 系统

要求支持：

- boolean flags
- numeric counters
- string tags
- one-time flags
- campaign scope
- global scope

例：
- `used_fake_citation`
- `validated_problem`
- `first_paid_user`
- `ignored_mentor_warning`
- `context_failure_count`

---

## TASK-B007：定义 Asset Schema

玩家资产至少支持：

- document
- dataset
- prompt
- task_contract
- agents_md
- claude_md
- goal
- loop
- research_matrix
- literature_library
- interview_notes
- prototype
- code_project
- pitch_deck
- business_model
- user_feedback
- revenue_report
- test_report
- handoff
- custom

---

## TASK-B008：定义 Character Schema

字段：

- id
- displayName
- role
- portrait
- baseRelationship
- traits
- campaignAvailability
- dynamicRules
- dialogueStyle

---

## TASK-B009：定义 Ending Schema

Ending 必须不是单段文本。

结构：

```ts
Ending {
  id
  title
  mainResult
  requirements
  priority
  growthVariantRules
  characterEpilogueRules
  projectFutureRules
  specialTags
  reflection
}
```

---

## TASK-B010：定义 Skill Schema

支持：
- skill tree
- prerequisites
- level
- behaviors
- unlock conditions
- campaign mapping
- tool adapter mapping

---

## TASK-B011：定义 KnowledgeAtom Schema

至少字段：

- id
- title
- domain
- trigger
- problem
- wrongPattern
- correctBehavior
- why
- steps
- toolMappings
- successSignals
- failureSignals
- transferScenarios
- depth30s
- depth3m
- depth10m

---

## TASK-B012：建立内容 Schema 验证命令

新增：

```bash
pnpm content:validate
```

必须扫描 `content/**/*.yaml|json`。

发现以下问题必须退出非 0：
- 重复 ID；
- 缺失引用；
- next 指向不存在事件；
- ending 条件字段非法；
- skill dependency 循环；
- mission 找不到 entry event。

---

# 6. PHASE C：游戏核心引擎

## TASK-C001：实现 Effect Engine

Effect 必须支持：

- set
- add
- subtract
- clamp
- setFlag
- unsetFlag
- addAsset
- removeAsset
- unlockSkill
- unlockKnowledge
- scheduleEvent

### 验收
至少 20 个单元测试。

---

## TASK-C002：实现 Condition Engine

支持：
- state comparison
- flag
- asset exists
- skill level
- relationship
- AND
- OR
- NOT

禁止直接 `eval()`。

---

## TASK-C003：实现 Event Trigger Engine

触发来源：
- mission entry；
- day；
- choice；
- state threshold；
- asset creation；
- delayed event；
- campaign stage；
- random weighted event。

---

## TASK-C004：实现 Delayed Consequence Queue

必须能支持：

“第 3 天做出的选择在第 17 天触发”。

字段：
- source event；
- scheduled day；
- condition；
- payload。

### 验收
保存/读档后仍能继续触发。

---

## TASK-C005：实现 Mission Engine

功能：
- 进入任务；
- 判断完成；
- 判断失败；
- 多种完成路径；
- 任务分支；
- 任务锁定；
- 任务跳过规则。

---

## TASK-C006：实现时间系统

V1 使用“游戏日 + 行动点”。

每个 Day：
- 默认行动点；
- 某些行为耗时；
- Day end；
- 自动事件；
- 期限判断。

---

## TASK-C007：实现资源系统

至少：
- money
- actionPoints
- reputation
- optional energy

不要让资源系统过度游戏化。

---

## TASK-C008：实现关系系统

每个主要 NPC：
- hidden relationship score
- trust flags
- conflict flags

玩家不直接看到数字。

UI 只显示：
- 疏远
- 一般
- 信任
- 高度信任

---

## TASK-C009：实现 Skill System

Skill 等级不可手动加经验。

升级由“行为成就”触发。

例：

```text
Context Lv.1:
成功进行一次 handoff 后在新 session 恢复工作。

Verification Lv.1:
发现并修复一次 AI 假引用。
```

---

## TASK-C010：实现 Asset System

支持：
- 创建；
- 更新；
- 版本；
- 关联 mission；
- 关联 tool；
- 后续复用；
- 查看历史。

---

## TASK-C011：实现 Ending Resolver

顺序：

1. 主结果候选；
2. 高优先 Ending；
3. 状态变体；
4. NPC 后日谈；
5. 项目未来；
6. 特殊 Flag；
7. 反思。

### 验收
相同主结果，因状态不同能生成明显不同 Ending。

---

## TASK-C012：实现 Ending Composer

不得直接让 LLM 临时生成所有结局。

使用：
- 人工骨架；
- 模块化段落；
- 变量插值；
- 可选 AI 润色。

AI 不可改变结局事实。

---

## TASK-C013：实现 Fate Review

结局后显示：
- 5–10 个关键决定；
- 决定日期；
- 当时行为；
- 后续影响；
- 对应学习点。

---

## TASK-C014：实现周目系统

支持：
- first run；
- NG+；
- unlock flags；
- 已发现 ending；
- 已解锁高级提示。

---

## TASK-C015：实现自动存档

触发点：
- choice 后；
- day end；
- mission complete；
- ending 前。

---

## TASK-C016：实现手工存档

至少 10 槽位。

---

## TASK-C017：实现存档迁移版本

Save 中必须有：

```ts
saveVersion
contentVersion
appVersion
```

未来 schema 改变必须可迁移。

---

# 7. PHASE D：AI 与 Agent 系统

## TASK-D001：实现 AI Provider Registry

UI 中可：
- 添加 provider；
- 编辑；
- 删除；
- 测试连接；
- 设置默认。

---

## TASK-D002：安全存储 API Key

优先使用 Electron `safeStorage`。

禁止：
- 明文写入 JSON；
- 明文写 SQLite；
- 输出到日志。

---

## TASK-D003：OpenAI-compatible Provider

字段：
- baseURL
- apiKey
- model
- optional headers

支持流式。

---

## TASK-D004：Anthropic-compatible Provider

实现独立 provider。

---

## TASK-D005：DeepSeek-compatible Provider

允许：
- 官方；
- compatible base URL。

---

## TASK-D006：AI 调用错误处理

必须区分：
- auth error；
- model not found；
- timeout；
- rate limit；
- network；
- malformed response。

玩家看到自然语言错误。

---

## TASK-D007：建立 Agent Adapter 接口

```ts
interface AgentAdapter {
  id
  detect()
  getVersion()
  getInstallGuide()
  openProject()
  runTask()
  supports(feature)
}
```

---

## TASK-D008：Claude Code Adapter

至少：
- 检测命令；
- 获取 version；
- 判断是否已安装；
- 打开工作目录；
- 执行任务；
- 捕获输出；
- 取消任务。

不要求解析 Claude Code 内部实现。

---

## TASK-D009：Codex Adapter

同上。

---

## TASK-D010：DeepSeek Harness Adapter

同上。

---

## TASK-D011：Agent 安装引导

如果检测不到：

UI 显示：
1. 未安装；
2. 官方推荐安装方式；
3. 安装后“重新检测”。

禁止假装安装成功。

---

## TASK-D012：终端安全层

通过 main process 调用 CLI。

要求：
- 仅允许用户明确选择的工作目录；
- 不允许 renderer 任意 shell；
- 命令白名单/adapter 控制；
- 显示当前目录；
- 用户可取消。

---

## TASK-D013：工作台 Terminal

使用 xterm.js。

支持：
- 输出；
- 状态；
- 停止；
- 清空；
- 搜索日志。

---

## TASK-D014：Agent Run History

保存：
- tool；
- task；
- start/end；
- exit code；
- result summary；
- related asset。

---

# 8. PHASE E：Agent 能力图谱

建立 8 大域：

1. Environment
2. Initialization
3. Task Contract
4. Goal Engineering
5. Loop Engineering
6. Context Engineering
7. Agent Organization
8. Verification

## TASK-E001：建立能力树根节点

创建：
`content/skills/skill-tree.yaml`

---

## TASK-E002：Environment 最小能力节点

至少 15 个：
- CLI 概念；
- 工作目录；
- API Key；
- Base URL；
- 模型；
- Provider；
- 环境变量；
- 安装检测；
- 版本；
- 权限；
- 网络；
- 项目目录；
- 配置文件；
- 日志；
- 失败诊断。

---

## TASK-E003：Initialization 节点

至少 12 个：
- read-before-write；
- scan repo；
- README；
- project rules；
- init；
- create AGENTS；
- create CLAUDE；
- existing assets；
- run command；
- test command；
- constraints；
- handover context。

---

## TASK-E004：Task Contract 节点

至少 15 个：
- context；
- objective；
- non-goals；
- constraints；
- sources；
- deliverable；
- acceptance；
- examples；
- scope；
- order；
- inspect first；
- execution；
- report；
- uncertainty；
- stop condition。

---

## TASK-E005：Goal 节点

至少 12 个：
- 何时用 goal；
- goal state；
- completion；
- milestone；
- constraint；
- update；
- pause；
- resume；
- change goal；
- goal drift；
- verification；
- handoff。

---

## TASK-E006：Loop 节点

至少 15 个：
- build-test-fix；
- search-verify-search；
- draft-judge-revise；
- iteration cap；
- stop rule；
- regression；
- evaluator；
- evidence loop；
- debugging loop；
- content loop；
- experiment loop；
- feedback loop；
- convergence；
- runaway prevention；
- final check。

---

## TASK-E007：Context 节点

至少 18 个：
- context budget；
- context relevance；
- context pollution；
- compact；
- session；
- new session；
- handoff；
- project memory；
- temporary memory；
- state file；
- summaries；
- source selection；
- stale context；
- contradiction；
- context reset；
- checkpoint；
- recovery；
- long project continuity。

---

## TASK-E008：Agent Organization 节点

至少 15 个：
- single agent；
- subagent；
- task decomposition；
- role；
- parallel；
- sequential；
- review agent；
- aggregation；
- conflict；
- shared context；
- isolated context；
- delegation；
- dependency；
- cost tradeoff；
- orchestration。

---

## TASK-E009：Verification 节点

至少 18 个：
- test；
- citation；
- source；
- reproducibility；
- diff；
- regression；
- independent check；
- reverse verification；
- adversarial review；
- checklist；
- acceptance criteria；
- factual claims；
- data consistency；
- file integrity；
- build；
- human check；
- stop gate；
- release gate。

---

## TASK-E010：达到 120+ 能力原子

运行脚本统计。

验收：
```text
skill atoms >= 120
```

---

# 9. PHASE F：知识卡系统

## TASK-F001：实现知识卡 UI

三层：
- 30 秒；
- 3 分钟；
- 10 分钟。

默认只显示 30 秒。

---

## TASK-F002：实现知识触发

来源：
- 首次失败；
- 首次能力解锁；
- NPC 建议；
- 玩家主动搜索。

---

## TASK-F003：建立工具映射

每张卡可显示：

```text
这个能力在：
Claude Code → ...
Codex → ...
DeepSeek Harness → ...
```

---

## TASK-F004：禁止底层过度解释

自动 lint 内容：
禁止大段介绍：
- Transformer；
- attention 数学；
- token sampling；
- embedding 数学；
- agent loop 内核。

允许简短必要解释。

---

## TASK-F005：完成 100+ 知识卡

每张必须有：
- 实际问题；
- 错误模式；
- 正确行为；
- 操作；
- 验收。

---

# 10. PHASE G：UI/UX 主框架

## TASK-G001：主导航

至少：
- 首页
- 剧情
- 工作台
- 工作室
- 能力
- 方法库
- 设置

---

## TASK-G002：首页

显示：
- 当前角色；
- 当前主线；
- 当前任务；
- 继续游戏；
- 三条 campaign；
- 最近资产；
- 已发现 endings。

---

## TASK-G003：剧情界面

必须支持：
- 人物立绘/头像；
- 人名；
- 对话；
- 叙述；
- choices；
- 历史回看；
- 自动播放可选；
- 跳过已读；
- 快捷保存。

---

## TASK-G004：选择项设计

不允许显示：
- `导师信任 +5`
- `研究质量 -10`

只显示行为。

---

## TASK-G005：工作台布局

桌面宽屏建议：

左：
- 项目 / 文件 / 任务。

中：
- 文档 / 浏览器式内容 / Editor / Terminal。

右：
- AI Agent 对话与任务。

---

## TASK-G006：工作室

分类展示：
- Research；
- Competition；
- Venture；
- Agent；
- 通用资产。

---

## TASK-G007：能力树

只显示玩家已知信息。

隐藏未发现高级能力，或显示模糊节点。

---

## TASK-G008：方法库

支持搜索：
“Agent 忘记前面的要求怎么办？”

返回对应 Knowledge Card。

---

## TASK-G009：设置页

包括：
- AI Provider
- Agent CLI
- 外观
- 字体
- 音量
- 存档
- 数据目录
- 隐私

---

## TASK-G010：新手引导

不能一次讲完。

只教：
- 怎么继续剧情；
- 怎么选；
- 怎么进入工作台；
- 怎么返回。

---

## TASK-G011：键盘可访问性

主要按钮可 tab。

---

## TASK-G012：响应式最小要求

支持：
- 1366×768；
- 1920×1080；
- 2560×1440。

V1 不要求手机。

---

# 11. PHASE H：科研 Campaign

Campaign 名：
**《30天：从一句话到开题答辩》**

核心研究示例：
“生成式 AI 如何影响青年知识工作者的技能形成？”

必须允许未来替换案例。

---

## TASK-H001：科研角色阵容

至少：
- 导师；
- 理论型师姐；
- 数据型师兄；
- 同级同门；
- 开题评委 A；
- 开题评委 B；
- AI Agent。

每人写：
- 目标；
- 性格；
- 能提供什么；
- 常见冲突；
- 关系变化规则。

---

## TASK-H002：Stage 1 模糊问题

目标：
让玩家理解不能直接“让AI给10个选题”。

事件至少 10 个。

必须包含失败：
- AI 提供伪创新；
- 玩家不知道关键词；
- 概念范围失控。

---

## TASK-H003：Stage 2 文献侦察

至少 12 个事件。

必须训练：
- 搜索；
-关键词扩展；
- 文献判断；
- AI批量读；
- 来源核验；
- 结构化矩阵。

资产：
- keyword tree；
- literature library；
- evidence matrix。

---

## TASK-H004：Stage 3 研究问题

至少 10 事件。

训练：
- candidate gap；
- verification；
- feasibility；
- evidence。

BAD END 条件之一：
- `academicDebt` 过高；
- 伪 gap 未核实。

---

## TASK-H005：Stage 4 理论

训练：
- 概念辨析；
- 理论比较；
- 机制；
- 不堆理论。

设计 BAD END：
《理论大杂烩》。

---

## TASK-H006：Stage 5 研究设计

训练：
- RQ-data-method alignment；
- 数据可得性；
- 方法不是装饰。

BAD END：
《我会SEM，所以我要做SEM》。

---

## TASK-H007：Stage 6 材料

加入：
- 数据获取失败；
- 资料不够；
- API受限；
- 被迫缩小范围。

---

## TASK-H008：Stage 7 分析

训练 Loop：
- analyse；
- test；
- verify；
- revise。

---

## TASK-H009：Stage 8 写作

训练：
- argument map；
- evidence mapping；
- 分节；
- citation verification；
- Agent写作审计。

---

## TASK-H010：Stage 9 模拟答辩

评委问题应由：
- 预设规则；
- 当前玩家资产；
- 当前弱项

动态选择。

---

## TASK-H011：科研主结局 ≥20

至少包含：
1. 开题失败；
2. 勉强通过；
3. 顺利通过；
4. 优秀通过；
5. 换题；
6. 数据崩溃；
7. 理论崩溃；
8. 方法失配；
9. 时间耗尽；
10. AI依赖过高；
11. 研究能力真正形成；
12. 被导师纳入课题；
13. 独立方向；
14. 意外新发现；
15. 研究成果转竞赛；
16. 研究成果转创业；
17. 证据危机；
18. 高完成度低独立性；
19. 低完成度高成长；
20. 隐藏结局。

---

## TASK-H012：科研 Ending 变体 ≥70

通过：
- growth；
- mentor；
- project future；
- special flags

组合。

---

# 12. PHASE I：竞赛 Campaign

Campaign：
**《21天：第一次AI创新竞赛》**

---

## TASK-I001：竞赛角色

至少：
- 队长/玩家；
- 技术队友；
- 设计/表达队友；
- 指导老师；
- 对手团队；
- 初赛评委；
- 决赛评委。

---

## TASK-I002：规则阅读阶段

训练：
- 长 PDF 摘要；
- 评分标准提取；
- 约束；
- deadline。

---

## TASK-I003：组队阶段

不同队友的能力与冲突真实影响后续。

---

## TASK-I004：选题阶段

至少 10 个候选问题信号。

玩家不能直接获得“最佳选题”。

---

## TASK-I005：调研阶段

训练：
- AI生成访谈只是第一步；
- 真问题；
- 证据；
- 竞品；
- 政策；
- 数据。

---

## TASK-I006：方案阶段

建立：
- problem；
- user；
- solution；
- feasibility；
- innovation；
- impact。

---

## TASK-I007：Demo阶段

强制至少使用一次本地 Agent Adapter。

若玩家未安装：
- 提供模拟模式；
- 明确标注“教学模拟”；
- 不伪装真实 CLI。

---

## TASK-I008：材料阶段

要求：
- 申报书；
- PPT；
- Demo；
- 数据附件。

训练多文件一致性。

---

## TASK-I009：路演

加入：
- 时间限制；
- 内容取舍；
- 评委追问。

---

## TASK-I010：结局 ≥15

包括：
- 校赛失败；
- 校赛奖；
- 省赛；
- 国赛；
- 奖项高但项目空心；
- 奖项一般但后续创业；
- 团队解散；
- 技术失败；
- 研究转化；
- 商业验证成功等。

---

## TASK-I011：组合 Ending ≥50

---

# 13. PHASE J：创业 Campaign

Campaign：
**《30天：从0到第一个付费用户》**

---

## TASK-J001：创业开局

玩家初始：
- 没有项目；
- 少量预算；
- 一个AI工具；
- 一台电脑。

禁止直接发产品题目。

---

## TASK-J002：问题信号池

至少 30 个观察信号。

来源：
- 校园；
- 社群；
- 老师；
- 学生；
- 小企业；
- 在线评论；
- 社媒；
- 招聘；
- 工作流程。

其中：
- 有真痛点；
- 有伪需求；
- 有低频需求；
- 有付费差需求；
- 有不可达用户。

---

## TASK-J003：问题发现

玩家可以：
- 观察；
- 访谈；
- 搜索；
- 查看评论；
- 问AI。

AI 只能产生候选解释，不替玩家确认需求。

---

## TASK-J004：用户访谈

教学重点：
禁止诱导式提问。

必须设计：
错误问法：
“如果有AI工具你会不会用？”

正确问法：
“你上一次遇到这个问题是什么时候？”

---

## TASK-J005：假设板

实现真实 UI。

包含：
- Problem
- User
- Solution
- Channel
- Revenue
- Retention

状态：
- 未验证；
- 弱证据；
- 强证据；
- 被证伪。

---

## TASK-J006：方案选择

允许：
- SaaS；
- AI Agent；
- 小工具；
- 自动化；
- 人工服务；
- 不开发先验证。

“直接写完整产品”必须可能导致失败。

---

## TASK-J007：MVP 开发

强训练：
- INIT；
- project rule；
- AGENTS.md；
- Task Contract；
- Goal；
- Loop；
- test；
- deploy。

---

## TASK-J008：首批用户

渠道：
- 私信；
- 社群；
- 校园；
- 内容；
- 合作；
- 免费试用。

每个渠道参数不同。

---

## TASK-J009：首次收费

必须设计：
免费用户大量流失。

教学：
喜欢 ≠ 付费。

---

## TASK-J010：需求迭代

至少 20 条用户需求。

玩家无法全部实现。

训练：
- priority；
- core user；
- scope；
- product debt。

BAD END：
《功能坟场》。

---

## TASK-J011：单位经济

模拟：
- revenue；
- API cost；
- infra；
- marketing；
- refund；
- support。

必须可能出现：
“收入 1000，成本 1300”。

---

## TASK-J012：增长

教学：
- conversion；
- CAC；
- retention；
- LTV。

不得先背定义。

必须从事件中引出。

---

## TASK-J013：创业主结局 ≥20

至少：
- 无人用；
- 有人用无人付费；
- 首单；
- 小而盈利；
- 增长亏损；
- 单位经济崩；
- 功能坟场；
- 用户群转型；
- SaaS；
- 服务；
- 工作室；
- 副业；
- 创业团队；
- 爆发增长；
- 被收购；
- 合伙人分裂；
- 平台依赖崩溃；
- 获客失败；
- 产品转竞赛；
- 产品转研究。

---

## TASK-J014：创业 Ending 变体 ≥80

---

# 14. PHASE K：内容质量控制

## TASK-K001：建立内容 Linter

检查：
- “首先其次最后”过度；
- 大段 AI 套话；
- “就像……一样”过多；
- NPC 连续解释 > 300 字；
- 单事件文字 > 限制；
- 选择只有正确/错误二元过多；
- 选择数过多；
- 缺 delayed consequence。

---

## TASK-K002：NPC 对话长度限制

默认：
- 单句 5–80 字；
- 单事件单 NPC 连续不超过 4 段。

---

## TASK-K003：教学密度检查

每个 mission 必须回答：

> 玩家完成后真实多会了一件什么事？

如果无法回答，删除或重写。

---

## TASK-K004：去工具说明书化

任何知识节点必须先有问题场景。

---

## TASK-K005：AI味人工审查清单

检查：
- 是否过度总结；
- 是否过度类比；
- 是否过度完美；
- 是否缺冲突；
- 是否所有 NPC 都说同一种话；
- 是否“完成任务”太轻松；
- 是否结果立即反馈；
- 是否没有延迟代价。

---

# 15. PHASE L：动态 AI 角色系统

## TASK-L001：导师动态追问

输入：
- 当前研究资产；
- 隐藏弱项；
- 当前任务。

输出：
最多 3 个追问。

要求：
AI 只选择/改写问题，不修改游戏事实。

---

## TASK-L002：评委动态追问

同上。

---

## TASK-L003：用户动态反馈

创业线可以依据：
- user persona；
- 产品状态；
- price；
- feature。

生成自然反馈。

---

## TASK-L004：AI失败回退

没有 API 时：
- 使用预设内容；
- 游戏仍可完成。

游戏核心流程不能依赖联网AI才可玩。

---

# 16. PHASE M：真实任务评估

## TASK-M001：Task Contract 评分器

评估：
- goal；
- context；
- constraint；
- deliverable；
- acceptance。

使用规则优先，AI补充。

---

## TASK-M002：AGENTS.md 评分器

检查：
- 项目目标；
- 约束；
- 工作方式；
- 测试；
- 验收；
- 不必要长文。

---

## TASK-M003：Goal 评分器

检查：
- final state；
- measurable completion；
- scope；
- stop condition。

---

## TASK-M004：Loop 评分器

检查：
- iteration；
- evaluator；
- stop；
- max cycles；
- rollback。

---

## TASK-M005：Research Question 评分器

检查：
- clear；
- researchable；
- evidence；
- scope；
- method compatibility。

---

## TASK-M006：Startup Hypothesis 评分器

检查：
- 用户；
- 问题；
- 证据；
- 可验证性；
- 付费假设。

---

# 17. PHASE N：模拟 Agent 模式

为了没有真实 CLI 的玩家也能完整学习。

## TASK-N001：模拟 Claude Code

模拟：
- INIT；
- 项目规则；
- task；
- fail；
- test；
- revise。

必须标：
“模拟环境”。

---

## TASK-N002：模拟 Codex

---

## TASK-N003：模拟 DSH

至少教学：
- goal；
- loop；
- compact；
- AGENTS。

---

## TASK-N004：真实/模拟模式切换

用户可选：
- 教学模拟；
- 本机工具。

---

# 18. PHASE O：音画与氛围

## TASK-O001：建立视觉方向

要求：
- 高校 / 学术 / 科技；
- 克制；
- 非二次元萌系；
- 可以有 Galgame 对话感；
- 不做恋爱游戏审美。

---

## TASK-O002：角色头像

V1 可先使用统一插画风格。

至少主要 NPC 有独立视觉。

---

## TASK-O003：背景

至少：
- 宿舍/工作室；
- 导师办公室；
- 图书馆；
- 实验室；
- 竞赛教室；
- 创业空间；
- 答辩现场。

---

## TASK-O004：音频

最低：
- BGM；
- choice；
- success；
- warning；
- ending。

设置可关闭。

---

# 19. PHASE P：安全与隐私

## TASK-P001：API Key 安全

前述 safeStorage。

---

## TASK-P002：本地文件授权

玩家必须主动选择项目目录。

---

## TASK-P003：日志脱敏

不记录：
- key；
-完整用户敏感文件内容。

---

## TASK-P004：清除数据

设置中提供：
- 删除存档；
- 删除AI配置；
- 删除运行历史；
- 完全重置。

---

# 20. PHASE Q：性能

## TASK-Q001：启动性能

目标：
普通电脑冷启动 < 5 秒。

---

## TASK-Q002：剧情切换

无明显卡顿。

---

## TASK-Q003：大存档

模拟 1000 事件历史，读取 < 2 秒。

---

## TASK-Q004：AI流式

流式内容不冻结 UI。

---

# 21. PHASE R：自动测试

## TASK-R001：Game Core 单元测试

覆盖率目标：
- condition engine ≥ 90%
- effect engine ≥ 90%
- ending resolver ≥ 90%
- mission engine ≥ 85%

---

## TASK-R002：内容验证测试

所有内容通过 schema。

---

## TASK-R003：科研线自动跑通

编写 bot：
走至少：
- 1 条优秀路线；
- 1 条失败路线；
- 1 条AI依赖路线。

---

## TASK-R004：竞赛线自动跑通

同上。

---

## TASK-R005：创业线自动跑通

同上。

---

## TASK-R006：存档测试

覆盖：
- save；
- load；
- delayed events；
- assets；
- skill；
- ending flags。

---

## TASK-R007：E2E

至少覆盖：
- 新游戏；
- 剧情；
- choice；
- 工作台；
- AI设置；
- 存档；
- ending。

---

# 22. PHASE S：人工 QA

## TASK-S001：新用户测试

让完全不知道项目的人进行 30 分钟试玩。

记录：
- 不知道点哪里；
- 不懂术语；
- 卡住；
- 错过教学；
- 觉得无聊。

---

## TASK-S002：教学效果测试

试玩后询问：

1. AGENTS.md 是干什么的？
2. 什么时候应该开新 Session？
3. Goal 与普通 Prompt 有什么区别？
4. Loop 什么时候用？
5. AI结果为什么要独立验证？
6. 创业中为什么不能直接开发？
7. 科研中为什么不能直接相信“研究空白”？

若大部分答不出，教学失败。

---

## TASK-S003：重玩测试

第二次游玩是否出现：
- 不同事件；
- 不同资源；
- 不同结局；
- 新知识。

---

# 23. PHASE T：发布准备

## TASK-T001：README

包括：
- 产品定位；
- 安装；
- AI配置；
- Agent配置；
- 隐私；
- 开始游戏。

---

## TASK-T002：用户手册

不能写成开发文档。

---

## TASK-T003：故障排查

包含：
- CLI找不到；
- API错误；
- 网络；
- 存档损坏；
- terminal失败。

---

## TASK-T004：版本信息

显示：
- app version；
- content version。

---

## TASK-T005：Windows 打包

生成安装包。

---

## TASK-T006：macOS 打包

可行时生成。

---

## TASK-T007：首次启动检查

启动时检查：
- data dir；
- schema；
- migration；
- content；
- permissions。

---

## TASK-T008：发布版禁用开发功能

- devtools 默认关闭；
- debug 菜单隐藏；
- 测试入口移除。

---

# 24. PHASE U：最终发布验收

只有以下全部满足才允许标记 V1.0。

## 功能
- [ ] 三条主线全部可从开始走到结局。
- [ ] 没有阻断流程 bug。
- [ ] 存档可正常恢复。
- [ ] 延迟事件可恢复。
- [ ] 200+ Ending 变体可实际触发。
- [ ] AI 未配置时仍可完整游玩。
- [ ] AI 配置后可用。
- [ ] 至少一种真实 CLI Agent 可完整跑通。
- [ ] 其他 Agent 至少可检测和引导。

## 内容
- [ ] skill atoms ≥120。
- [ ] knowledge cards ≥100。
- [ ] Research events ≥90。
- [ ] Competition events ≥70。
- [ ] Venture events ≥100。
- [ ] 主结局 ≥55。
- [ ] Ending 组合 ≥200。

## 教学
- [ ] 所有关键能力至少在剧情中实际使用一次。
- [ ] 不是纯阅读教学。
- [ ] 不是选择题网课。
- [ ] 存在真实失败和延迟后果。
- [ ] 玩家可实际创建 AGENTS.md。
- [ ] 玩家可实际设计 Goal。
- [ ] 玩家可实际设计 Loop。
- [ ] 玩家可实际完成至少一次 Context Handoff。
- [ ] 玩家可实际完成至少一次独立验证。

## 工程
- [ ] lint 通过。
- [ ] typecheck 通过。
- [ ] unit tests 通过。
- [ ] E2E 通过。
- [ ] content validate 通过。
- [ ] Windows 打包成功。
- [ ] 安装后启动成功。
- [ ] 卸载正常。
- [ ] API Key 未明文保存。

## UX
- [ ] 1366×768 正常。
- [ ] 1920×1080 正常。
- [ ] 无明显文本截断。
- [ ] 主要操作可键盘导航。
- [ ] 不存在不可点击假按钮。
- [ ] 失败错误信息可理解。

---

# 25. AGENT 每轮工作方式

执行本任务书时，一次只处理 1–3 个强相关最小任务。

每轮开始：

1. 读取 `TASK_STATUS.md`。
2. 找到第一个未完成任务。
3. 阅读该任务前置依赖。
4. 检查相关代码。
5. 实现。
6. 测试。
7. 验收。
8. 更新状态。
9. 再进入下一任务。

禁止：
- 跳过中间任务；
- 一次声称完成几十个任务；
- 未跑测试标 DONE；
- 仅创建空文件标 DONE。

---

# 26. Agent 遇到问题时的决策规则

如果出现三种情况：

## 情况 A：实现方式有多种

选择：
- 最简单；
- 最稳定；
- 最容易测试；
- 最少依赖；
- 最符合固定技术栈。

## 情况 B：当前任务缺信息

优先从：
- 本文档；
- 当前代码；
- docs；
- content schema

推断。

不要因为小问题停止整个项目。

## 情况 C：发现设计缺陷

记录到：
`docs/progress/DECISIONS.md`

然后修正，但必须维持核心目标：

> 让用户通过科研、竞赛、创业的真实任务，形成高级 Agent 使用能力。

---

# 27. 最终产品绝对不能变成什么

以下任何一种结果都视为失败：

### 失败 1
“一个带剧情皮肤的AI教程。”

### 失败 2
“大量选择题 + 经验值。”

### 失败 3
“只是Galgame文字故事，没有真实工作台。”

### 失败 4
“Agent工具说明书。”

### 失败 5
“只有 Claude Code 使用教程。”

### 失败 6
“只有一个Prompt聊天框。”

### 失败 7
“所有选择马上显示加减分。”

### 失败 8
“玩家只需要选正确选项就能通关。”

### 失败 9
“创业线等于AI接单赚钱。”

### 失败 10
“科研线等于AI写论文。”

---

# 28. 最终产品应该让玩家形成的思维

完成 V1 后，一个合格玩家看到复杂任务时，应该自然想到：

1. 我真正的目标是什么？
2. 什么叫完成？
3. 我需要哪些事实和材料？
4. 哪些事情适合交给 Agent？
5. 哪些判断必须验证？
6. 要不要先 INIT？
7. 有没有项目级规则？
8. 这是单次 Task 还是 Goal？
9. 需要 Loop 吗？
10. 上下文会不会污染？
11. 什么时候 Compact？
12. 什么时候换 Session？
13. 要不要 Handoff？
14. 需不需要多 Agent？
15. 怎么测试？
16. 怎么验收？
17. 如果 Agent 错了，我怎么发现？
18. 最终成果能不能复现？

如果游戏通关后玩家没有形成上述思维，则即使游戏很好玩，也视为教学目标未达成。

---

# 29. 最终执行要求

AGENT 必须一直执行到：

1. 所有任务状态为 DONE；
2. 所有最终验收项通过；
3. 形成可安装 Release；
4. 从全新用户环境安装并成功启动；
5. 至少完整跑通三条 Campaign；
6. 输出：
   - `FINAL_ACCEPTANCE_REPORT.md`
   - `RELEASE_NOTES.md`
   - `KNOWN_ISSUES.md`
   - 安装包。

最终验收报告中不得写模糊表述：

禁止：
- “基本完成”
- “大致可用”
- “应该没问题”
- “理论上通过”

必须提供实际证据：
- 测试命令；
- 测试结果；
- 文件；
- 截图；
- Ending 统计；
- Event 统计；
- Skill 统计；
- Build hash；
- 安装测试记录。

只有全部满足，项目才允许标记：

# METIS Academy V1.0 — Release Ready


---

# 30. 三条 Campaign 的逐日内容蓝图

> 本节不是“建议”，而是内容制作时必须遵循的最低剧情骨架。  
> AGENT 可以扩写事件、对白和支线，但不得删除这些核心学习节点。  
> 每一个“日”都必须至少存在：
>
> 1. 一个现实问题；
> 2. 一个玩家决策；
> 3. 一个可执行动作；
> 4. 一个资产变化或状态变化；
> 5. 一个即时反馈或延迟后果标记；
> 6. 一个明确的能力训练目标。
>
> 不要求每天等于现实中的自然日，可理解为游戏节奏单位。

---

# 31. 科研 Campaign：30 日逐日施工表

Campaign ID：

```text
research_30d_proposal
```

默认案例：

```text
生成式 AI 如何影响青年知识工作者的技能形成？
```

最终目标：

```text
完成一份可答辩的研究计划，并通过模拟开题答辩。
```

---

## R-DAY-01：导师的一句话

### 剧情
导师在走廊里告诉玩家：

> “生成式AI对知识工作影响很大，你看看有没有什么能研究的。”

### 玩家可选行为
- 直接问AI生成题目；
- 搜索；
- 找师兄；
- 先记录问题；
- 什么都不做。

### 必教能力
`Task Framing`

### 关键教学
模糊需求不能直接交给 Agent 执行。

### 必须产生
`research_brief_v0`

### 隐藏后果
直接采用 AI 题目：
- `aiDependence +`
- `academicDebt +`

先澄清：
- `independence +`

### 验收
至少有 3 条不同后续路径。

---

## R-DAY-02：第一次问AI

### 剧情
玩家尝试让AI生成选题。

### 系统必须故意给出
若干“看起来合理”的研究方向，其中至少：
- 1 个已经有人研究；
- 1 个概念含混；
- 1 个数据不可得；
- 1 个真正值得继续。

### 必教能力
候选生成 ≠ 事实确认。

### 解锁
Knowledge Card：
`AI产生候选，不产生事实`

---

## R-DAY-03：Agent 环境

### 目标
让玩家第一次接触真正 Agent 工具。

### 玩家选择
- 教学模拟模式；
- Claude Code；
- Codex；
- DeepSeek Harness。

### 训练
- 工作目录；
- CLI 检测；
- Provider；
- API；
- 模型。

### 资产
`agent_environment_profile`

### 验收
即便玩家没有安装任何 CLI，模拟模式也可完成。

---

## R-DAY-04：把资料扔给Agent之后

### 剧情
玩家把一堆文献/资料扔进去，让 Agent “帮我研究”。

### 系统表现
结果结构混乱、任务边界不清。

### 教学
Task Contract 初次引入。

### 玩家必须重新定义
- Context
- Goal
- Constraints
- Deliverables
- Acceptance

### 资产
`task_contract_research_scan_v1`

---

## R-DAY-05：关键词失灵

### 问题
只搜索：
`generative AI + young knowledge workers`

结果不足且偏。

### 玩家发现
学术语言与日常语言不同。

### 教学
关键词树：
- generative AI
- LLM
- AI augmentation
- early-career
- novice professionals
- expertise development
- skill formation
- workplace learning

### 资产
`keyword_tree_v1`

---

## R-DAY-06：文献太多

### 冲突
玩家得到几十/上百条结果。

### 决策
- 全部读；
- 只读高被引；
- AI全部总结；
- 分层筛选；
- 找综述和代表作。

### 教学
“检索策略”与“筛选策略”分离。

### 隐藏后果
只按引用：
`evidenceBias +`

---

## R-DAY-07：第一次批量阅读

### Agent能力
批量任务拆解。

### 教学
不要让 Agent 一次：
“读完50篇然后告诉我答案”。

应该：
- metadata；
- abstract；
- methods；
- findings；
- evidence；
- limitations；
- relevance。

### 资产
`literature_matrix_v1`

---

## R-DAY-08：假引用事件

### 强制事件
AI给出一篇不存在或信息错误的文献。

### 玩家选择
- 直接采用；
- 搜索；
- 查 DOI；
- 查原文；
- 让另一个 AI 判断。

### 教学
独立验证。

### 必须可触发延迟后果
若采用假引用：
Day 26/28 答辩时爆雷。

---

## R-DAY-09：项目越来越长

### 问题
Agent开始忘记前几日的研究范围。

### 教学
Context Engineering 初级：
- 当前上下文；
- 重要约束；
- 项目状态；
- 不相关历史。

### 玩家资产
`research_state.md`

---

## R-DAY-10：第一次 Compact

### 场景
上下文膨胀。

### 玩家需要
整理：
- 已确认事实；
- 尚未确认；
- 当前研究范围；
- 关键文献；
- 下一任务。

### 教学
Compact不是“随便总结聊天”。

### 资产
`compact_checkpoint_01`

---

## R-DAY-11：研究空白生成

### 场景
AI生成 5 个 gap。

### 必须设计
只有部分成立。

### 玩家要建立
`gap_validation_table`

字段：
- gap claim
- supporting literature
- counter evidence
- confidence
- feasibility

---

## R-DAY-12：研究空白被推翻

### 强制事件
玩家至少有一个候选 gap 被检索推翻。

### 教学
失败验证也是进展。

### 关键反馈
不能给予“你错了”式简单惩罚。

---

## R-DAY-13：研究问题收敛

### 玩家从多个方向中选择

系统应允许：
- 稳妥；
- 激进；
- 宽泛；
- 窄；
- 数据友好；
- 理论强。

### 教学
Research Question trade-off。

---

## R-DAY-14：AGENTS.md / CLAUDE.md

### 触发
Agent反复忘记：
- 研究范围；
- 输出格式；
- 引用要求；
- 不允许伪造文献。

### 玩家建立项目规则。

### 最低内容
- project goal；
- research scope；
- source rules；
- citation rules；
- workflow；
- acceptance。

### 资产
`AGENTS.md` 或 `CLAUDE.md`

---

## R-DAY-15：理论太多

### 场景
AI一次给出 7 个理论。

### 玩家决策
- 都用；
- 选最著名；
- 依据机制筛；
- 依据RQ筛。

### BAD END flag
`theory_soup`

---

## R-DAY-16：概念冲突

### 场景
不同论文对“skill”“expertise”“learning”定义不同。

### 教学
概念不是同义词堆积。

### 资产
`concept_comparison_table`

---

## R-DAY-17：建立理论机制

### 目标
从“理论名词”转向“机制链”。

### 资产
`mechanism_map`

必须包含：
- actor
- condition
- mechanism
- outcome
- evidence

---

## R-DAY-18：方法诱惑

### NPC
数据师兄建议：
“你做SEM吧，看着高级。”

### 玩家可选
- 跟；
- 回到RQ；
- 先看数据；
- 换问题配方法。

### 教学
方法服务于问题。

---

## R-DAY-19：数据可得性危机

### 强制事件
原计划数据有障碍。

### 玩家选择
- 改数据；
- 改方法；
- 改RQ；
- 编造可得性；
- 延期。

### 后果必须影响结局。

---

## R-DAY-20：第一次 Goal

### 场景
任务变为：
“在5个游戏日内形成完整研究设计。”

### 教学
普通 Task vs Goal。

### 玩家设计 Goal
必须包含：
- final state；
- milestones；
- completion；
- constraints；
- evidence gate。

### 资产
`goal_research_design`

---

## R-DAY-21：Goal 跑偏

### 场景
Agent追求“完成文档”，忽略证据。

### 教学
Goal需要明确质量门槛。

### 玩家修订
Acceptance Criteria。

---

## R-DAY-22：Loop：研究设计审查

### Loop
Draft
→ Critique
→ Evidence check
→ Revise
→ Re-evaluate

### 教学
不要让AI一次写完。

### 资产
`research_design_v2`

---

## R-DAY-23：Subagent初次出现

### 场景
需要同时：
- 查方法文献；
- 查数据；
- 查理论。

### 教学
并行不等于无脑开多个Agent。

### 玩家定义
任务边界和汇总方式。

---

## R-DAY-24：Subagent冲突

### 强制事件
两个 Agent 输出冲突结论。

### 教学
主 Agent 不能“投票决定真相”。

### 需要
回到来源。

---

## R-DAY-25：论文结构

### 教学
论文结构 = 论证结构。

### 玩家建立
`argument_map`

而不是：
“请AI生成论文目录”。

---

## R-DAY-26：写作中的证据映射

### 强制要求
每个核心命题必须链接证据。

### 资产
`claim_evidence_map`

### 若 Day 8 假引用未处理
这里第一次出现 warning。

---

## R-DAY-27：新Session与Handoff

### 场景
写作阶段需要清洁上下文。

### 玩家必须完成
- old session summary；
- handoff；
- new session；
- recovery check。

### 验收
新会话能回答：
- 当前RQ；
- 当前方法；
- 当前缺口；
- 当前下一步。

---

## R-DAY-28：模拟导师预审

### 动态问题
基于：
- 最弱状态；
- 未解决flag；
- 资产缺失。

### 可能爆雷
- 假引用；
- theory_soup；
- data feasibility；
- method mismatch。

---

## R-DAY-29：最后一天

### 玩家必须做取舍
行动点不够修全部问题。

### 教学
优先级和风险管理。

---

## R-DAY-30：开题答辩

### 评委问题至少覆盖
- 为什么重要；
- 文献做到了哪里；
- 你的问题是什么；
- 为什么这个理论；
- 为什么这个方法；
- 数据从哪来；
- 证据是否可靠；
- 创新是什么。

### 结算
进入 Ending Resolver。

---

# 32. 竞赛 Campaign：21 日逐日施工表

Campaign ID：

```text
competition_21d_ai
```

---

## C-DAY-01：看到比赛通知
训练长文档规则提取。

## C-DAY-02：评分标准
玩家必须把评分标准转为项目验收标准。

## C-DAY-03：找队友
训练角色分工与任务边界。

## C-DAY-04：十个选题
AI产生候选，但不可自动选择。

## C-DAY-05：问题真实性
进行快速桌面研究。

## C-DAY-06：第一次用户访谈
发现AI想象出的需求与现实不同。

## C-DAY-07：竞品
训练Agent批量搜索和结构化比较。

## C-DAY-08：方案收敛
形成Problem-Solution Fit初稿。

## C-DAY-09：初始化Demo工程
训练INIT与项目读取。

## C-DAY-10：项目规则
训练AGENTS.md/CLAUDE.md。

## C-DAY-11：Task Contract
把“做个漂亮网页”改为工程任务。

## C-DAY-12：Goal
目标是完成可演示 MVP。

## C-DAY-13：Loop
Build-Test-Fix。

## C-DAY-14：回归错误
新增功能破坏旧功能，训练Regression。

## C-DAY-15：多Agent分工
代码/调研/PPT。

## C-DAY-16：材料一致性
申报书、PPT、Demo数据发生冲突。

## C-DAY-17：第一次路演
时间超时。

## C-DAY-18：评委追问
创新性和真实性被挑战。

## C-DAY-19：最后迭代
资源不足，需要取舍。

## C-DAY-20：比赛
根据前20天真实状态评分。

## C-DAY-21：赛后
选择：
- 结束；
- 转科研；
- 转创业；
- 继续比赛。

---

# 33. 创业 Campaign：30 日逐日施工表

Campaign ID：

```text
venture_30d_first_paid_user
```

---

## V-DAY-01：没有项目

不允许系统推荐“最佳创业方向”。

玩家只有观察工具。

---

## V-DAY-02：问题信号

展示至少 8 条混合信号。

---

## V-DAY-03：AI帮你想创业点子

系统必须生成若干诱人的垃圾点子。

教学：
idea ≠ opportunity。

---

## V-DAY-04：选一个问题调查

玩家必须决定：
找谁调查。

---

## V-DAY-05：错误访谈

如果玩家问：
“你会不会用？”

NPC大概率说会。

系统记录：
`weakDemandEvidence`

---

## V-DAY-06：真实行为访谈

训练问过去行为：
- 上次什么时候；
- 怎么解决；
- 花了多久；
- 花没花钱。

---

## V-DAY-07：问题被证伪

至少一个方向必须被证伪。

---

## V-DAY-08：用户细分

同一个问题，对不同人严重程度不同。

---

## V-DAY-09：假设板

创建六类假设。

---

## V-DAY-10：不要开发

玩家可：
- 先手工服务；
- landing page；
- prototype；
- 完整开发。

必须让完整开发具有真实机会成本。

---

## V-DAY-11：选择MVP

判断最便宜的验证方式。

---

## V-DAY-12：安装Agent

模拟/真实皆可。

---

## V-DAY-13：INIT

Agent读取项目。

---

## V-DAY-14：AGENTS.md

解决持续规则。

---

## V-DAY-15：Task Contract

定义MVP这一轮到底完成什么。

---

## V-DAY-16：Goal

创建 MVP Goal。

---

## V-DAY-17：Loop

Build-Test-Fix。

---

## V-DAY-18：第一次用户试用

出现：
- 不会用；
- 找不到入口；
- 需求不同；
- bug。

---

## V-DAY-19：需求洪水

20条需求出现。

玩家必须选择优先级。

---

## V-DAY-20：上下文污染

Agent开始混淆旧需求与新需求。

训练Context / Compact。

---

## V-DAY-21：第一次收费

免费用户转付费。

多数消失。

---

## V-DAY-22：第一个付费用户

只有满足正确条件才获得。

不能剧情强送。

---

## V-DAY-23：退款/投诉

验证“付费”也不等于产品稳定。

---

## V-DAY-24：成本

出现真实 API 成本。

---

## V-DAY-25：单位经济

首次计算：
Revenue - Variable Cost。

---

## V-DAY-26：获客渠道

不同渠道成本不同。

---

## V-DAY-27：留存问题

用户来了但第二天不回来。

---

## V-DAY-28：Pivot

允许：
- 坚持；
- 换人群；
- 换问题；
- 换产品形态；
- 结束项目。

---

## V-DAY-29：最后资源分配

时间/钱有限。

---

## V-DAY-30：项目命运

Ending Resolver 结算。

---

# 34. Agent 能力首次教学映射表

| 能力 | 科研首次 | 竞赛首次 | 创业首次 | 必须真实操作 |
|---|---:|---:|---:|---|
| 工作目录 | R3 | C9 | V12 | 是 |
| API配置 | R3 | C9 | V12 | 是 |
| INIT | R14前后 | C9 | V13 | 是 |
| Task Contract | R4 | C11 | V15 | 是 |
| AGENTS.md | R14 | C10 | V14 | 是 |
| CLAUDE.md | R14 | C10 | V14 | 可选工具映射 |
| Goal | R20 | C12 | V16 | 是 |
| Loop | R22 | C13 | V17 | 是 |
| Verification | R8 | C6 | V6 | 是 |
| Context | R9 | C15 | V20 | 是 |
| Compact | R10 | C16 | V20 | 是 |
| Handoff | R27 | C15 | V20后 | 是 |
| New Session | R27 | C15 | V20 | 是 |
| Subagent | R23 | C15 | V26可选 | 是 |
| Regression | R22 | C14 | V17 | 是 |
| Acceptance Criteria | R4 | C2/C11 | V15 | 是 |

---

# 35. Event 内容制作模板

任何新 Event 都必须按模板制作：

```yaml
id: research_d08_fake_citation
campaign: research
day: 8
type: decision

purpose:
  narrative: "制造一次看起来可信的AI假引用"
  learning: "训练独立来源验证"

trigger:
  mission: research_literature_scan

scene:
  location: workspace
  characters:
    - ai_agent

setup:
  - "AI给出一篇高度相关但无法检索到的论文。"

choices:
  - id: accept
    text: "先放进文献表，之后再说"
    immediate_feedback: "你的矩阵更完整了。"
    hidden_effects:
      academicDebt: 15
      flags:
        - accepted_unverified_citation
    delayed:
      - event: research_d28_citation_crisis

  - id: verify
    text: "去原始数据库核查"
    cost:
      actionPoints: 1
    hidden_effects:
      evidenceDiscipline: 10
    unlock:
      knowledge:
        - verification_source_001

learning:
  skill: verification.source_check
  success_behavior: "独立检索原始来源"
```

### Event 验收
一个 Decision Event 必须满足至少一项：
- 改变后续剧情；
- 产生/修改资产；
- 产生延迟后果；
- 解锁能力；
- 改变角色关系。

如果什么都不改变，只是“看完一段话”，不应做 Event。

---

# 36. Ending 数量实现方法

禁止手写 200 个完全独立的 Ending 文件。

采用：

```text
主结局
× 玩家成长变体
× NPC关系后日谈
× 项目未来
× 特殊Flag
```

## 36.1 主结局骨架

至少 55。

## 36.2 Growth Variant

至少 8 类：

1. 高独立性；
2. 高AI依赖；
3. 高执行低判断；
4. 高判断低执行；
5. 高证据纪律；
6. 高技术债；
7. 高学术债；
8. 均衡成长。

## 36.3 Character Epilogue

主要NPC至少每人：
- positive；
- neutral；
- negative。

## 36.4 Project Future

至少：
- dead；
- stable；
- growing；
- transformed；
- transferred；
- rediscovered。

## 36.5 Ending 统计脚本

新增：

```bash
pnpm content:endings:count
```

输出：
- 主Ending；
- 可组合变体理论数；
- 实际可达变体；
- 不可达冲突组合。

必须证明 ≥200 个**可达**组合。

---

# 37. 内容可达性检查

新增脚本：

```bash
pnpm content:reachability
```

要求：

1. 从每个 Campaign 起点遍历；
2. 检查 Mission/Event 图；
3. 找出：
   - 永远不可达 Event；
   - 永远不可达 Ending；
   - 死循环；
   - 无出口节点；
   - 无前置来源的资产要求。

发现上述问题，CI失败。

---

# 38. 弱模型执行时的代码约束

为了降低执行错误：

1. 单文件建议 < 500 行。
2. 一个 React 页面不可包含核心状态规则。
3. Condition/Effect/Ending 独立纯函数。
4. Content 与 Code 分离。
5. YAML/JSON 内容由 schema 验证。
6. 不在组件内写 SQL。
7. 不在 renderer 直接 child_process。
8. 不允许到处复制 Agent Adapter 逻辑。
9. 不允许每个 Campaign 写一套独立状态机。
10. 三条线必须共享 game-core。

---

# 39. 提交/修改粒度

建议每完成以下类型任务形成一次独立提交：

```text
feat(game-core): implement condition engine
test(game-core): cover delayed effects
feat(content): add research day 01-05
feat(agent): add codex adapter
fix(save): migrate v2 save format
```

禁止：
“update project”
“fix stuff”
“finish game”

---

# 40. 发布前内容审计矩阵

对三条 Campaign 分别人工审计：

| 维度 | 1分 | 3分 | 5分 |
|---|---|---|---|
| 教学有效性 | 看完仍不会 | 知道原则 | 能实际操作 |
| 决策复杂度 | 明显正确答案 | 有取舍 | 多种合理路径 |
| 延迟后果 | 无 | 少量 | 高频且合理 |
| 真实性 | 教科书化 | 部分真实 | 接近真实项目 |
| AI融入 | 聊天框 | 辅助工具 | 工作流核心 |
| 重玩价值 | 无 | 有分支 | 路径显著不同 |
| 内容AI味 | 强 | 一般 | 像真实人和项目 |
| 资产继承 | 无 | 局部 | 全程继承 |

每条 Campaign 平均不得低于 4.0。

---

# 41. 最终试玩脚本

发布前必须人工完整执行：

## 路线 A：谨慎型科研者
目标：
优秀开题 + 高证据纪律。

## 路线 B：AI依赖型科研者
目标：
表面完成但触发负面成长结局。

## 路线 C：比赛包装路线
目标：
奖项不错但项目死亡。

## 路线 D：比赛长期价值路线
目标：
奖项普通但转创业。

## 路线 E：创业直接开发路线
目标：
开发很多、用户很少。

## 路线 F：创业验证路线
目标：
从问题验证到首个付费用户。

每条路线记录：
- 实际游戏时长；
- 事件数；
- Agent操作数；
- 资产数；
- Ending；
- Bug。

---

# 42. 最终验收报告固定结构

`FINAL_ACCEPTANCE_REPORT.md` 必须包含：

```md
# 1. Build 信息
# 2. 技术栈
# 3. 三条 Campaign 状态
# 4. Event 数量
# 5. Skill 数量
# 6. Knowledge Card 数量
# 7. Ending 数量与可达性
# 8. Unit Test
# 9. E2E
# 10. Content Validation
# 11. Windows 安装测试
# 12. macOS 测试（若支持）
# 13. AI Provider 测试
# 14. Claude Code Adapter 测试
# 15. Codex Adapter 测试
# 16. DeepSeek Harness Adapter 测试
# 17. 模拟模式测试
# 18. 六条完整试玩路线
# 19. 已知问题
# 20. 发布结论
```

若任一 Release Gate 未通过：

```text
发布结论：NOT RELEASE READY
```

不得为了结束任务写 Release Ready。

---

# 43. 本任务书的最高优先级排序

如果出现实现冲突，按以下顺序决策：

1. 教学有效性；
2. 游戏因果真实性；
3. 状态/存档正确；
4. 内容可达；
5. Agent实际使用价值；
6. UX清晰；
7. 视觉美观；
8. 动画；
9. 装饰性功能。

任何时候不得为了视觉效果牺牲前六项。

---

# 44. 最终一句验收问题

在整个项目完成后，请让一个从未接触本项目的用户试玩，然后只问：

> “如果现在给你一个真正复杂的科研、竞赛或者产品任务，你知不知道应该怎样让 Agent 开始工作、持续工作、检查工作、发现错误并最终交付？”

如果用户仍然只会回答：

> “我会给 ChatGPT 写一个更好的提示词。”

则本产品没有完成使命，必须继续迭代。
