# METIS Academy 内容制作指南（内容 Agent 必读）

> 本文件是三条 Campaign 剧情内容的**唯一制作规范**。所有内容为 YAML，放在 `content/` 下，由 `pnpm content:validate` 验证（Zod schema + 跨引用检查）。**写出任何 schema 错误都必须修复到验证通过为止。**

## 0. 文件与目录约定

```text
content/
├─ campaigns/
│  ├─ research/      # 科研线（你的目录）
│  │  ├─ campaign.yaml       # Campaign 定义（1 个）
│  │  ├─ characters.yaml     # 角色定义
│  │  ├─ missions.yaml       # 全部 Mission
│  │  ├─ events_d01_d10.yaml # 事件按天分文件
│  │  ├─ events_d11_d20.yaml
│  │  ├─ events_d21_d30.yaml
│  │  ├─ endings.yaml        # 主结局
│  │  └─ knowledge.yaml      # 本线知识卡
│  ├─ competition/   # 同上结构
│  └─ venture/       # 同上结构
```

一个 YAML 文件可含多个集合键（`campaigns:` `missions:` `events:` `endings:` `knowledge:` `characters:`），但推荐按上面拆分。

## 1. campaign.yaml 示例（科研线）

```yaml
campaigns:
  - id: research_30d_proposal
    title: 《30天：从一句话到开题答辩》
    subtitle: 科研主线
    description: 你接下导师一句模糊的需求，要在30个游戏日内完成一份可答辩的研究计划。
    type: research
    cover: research
    startMissionId: r_m01
    endingPool: [r_end_001, r_end_002]   # 全部主结局 id
    defaultState: { money: 800, timeBudget: 4, actionPoints: 4 }
    skillFocus: [task_contract, verification, context]
    estimatedMinutes: 150
    totalDays: 30
```

## 2. Mission（任务）规范

- `campaignId` 只能是 `research` / `competition` / `venture`（campaign type，不是完整 id）
- `completionConditions` 至少 1 条；`entryEventId` 必须指向存在的事件
- `nextMissionRules` 用 `when: null` 表示默认走向；`goto` 必须存在
- 每 2~5 天一个 Mission；最后一个 Mission 是最终结算任务（完成/失败后进入 Ending Resolver）
- 必填 `skillTraining`：回答"玩家完成这个任务后真实多会了一件什么事？"

```yaml
missions:
  - id: r_m01
    campaignId: research
    stage: 1
    day: 1
    title: 模糊的问题
    objective: 把导师的一句话需求变成可工作的研究简报
    briefing: 陈教授在走廊里说："生成式AI影响很大，你看看有没有能研究的。"
    prerequisites: []
    entryEventId: r_d01_mentor
    completionConditions:
      - kind: assetType
        type: research_brief
        minCount: 1
    failureConditions:
      - kind: and
        conditions:
          - { kind: "state", key: "academicDebt", op: "gte", value: 90 }
          - { kind: "state", key: "day", op: "gte", value: 5 }
    rewards:
      - { kind: "add", key: "progress", value: 5 }
      - { kind: "relationship", characterId: r_mentor, delta: 5 }
    requiredAssets: []
    recommendedSkills: [task_contract.contract_basics]
    nextMissionRules:
      - { when: null, goto: r_m02 }
    skillTraining: 学会把模糊需求拆成"已确认/待澄清/下一步"三部分，而不是直接丢给AI
    knowledge: []
```

## 3. Event（事件）规范 —— 每日骨架的六要素

每个"游戏日"至少 3 个事件，且必须满足：
1. 一个现实问题；2. 一个玩家决策；3. 一个可执行动作；4. 一个资产或状态变化；5. 一个即时反馈或延迟后果；6. 一个明确能力训练目标。

```yaml
events:
  # ---- 日开始剧情事件（无选择）----
  - id: r_d01_mentor
    campaign: research            # research|competition|venture|global
    day: 1
    type: story                   # story|decision|system|npc|evaluation|delayed
    trigger: { kind: missionEntry, mission: r_m01 }
    purpose:
      narrative: 导师给出模糊需求
      learning: 模糊需求不能直接交给Agent执行
    scene: { location: corridor, characters: [r_mentor] }
    dialogue:
      - { speaker: 陈教授, text: "生成式AI对知识工作影响很大。你看看有没有什么能研究的。", mood: neutral }
      - { speaker: 陈教授, text: "下个月开题。别让我失望。", mood: serious }
    next: r_d01_desk

  # ---- 决策事件（有 choices）----
  - id: r_d01_desk
    campaign: research
    day: 1
    type: decision
    keyDecision: true             # 关键决策（进 fate review + 统计）
    trigger: { kind: manual }
    scene: { location: dorm, characters: [] }
    setup: ["你回到桌前，打开电脑。光标在空白文档里闪。"]
    dialogue:
      - { speaker: 系统, text: "距离开题答辩还有 30 天。" }
    choices:
      - id: ask_ai_topics
        text: "直接让AI给我10个选题"
        visibleResponse: AI半分钟吐出10个题目，个个看起来都很新。
        hiddenEffects:
          - { kind: "add", key: "aiDependence", value: 8 }
          - { kind: "add", key: "academicDebt", value: 6 }
        delayed:
          - { eventId: r_d28_citation_crisis, offsetDays: 27, condition: { kind: "flag", key: "used_fake_citation" } }
        next: r_d01_ai_topics
      - id: clarify_first
        text: "先把'能研究的'到底指什么写下来，明天去问师兄"
        visibleResponse: 你写下三个待澄清的问题。
        hiddenEffects:
          - { kind: "add", key: "independence", value: 6 }
          - { kind: "relationship", characterId: r_senior_theory, delta: 4 }
        unlockKnowledge: [kc_task_framing]      # 只能引用本线 knowledge.yaml 里存在的 id
      - id: do_nothing
        text: "先打两把游戏，明天再说"
        visibleResponse: 晚上你睡得很晚，问题原封不动。
        hiddenEffects:
          - { kind: "subtract", key: "actionPoints", value: 0 }
          - { kind: "add", key: "academicDebt", value: 3 }
    learningPoint: Task Framing——先澄清，再执行
    terminal: true                # 当天流程到此为止（不再有 next）
```

### 硬性规则
- **choices 只显示行为**：`text` 禁止出现"导师信任+5"这类数值；效果全部放 `hiddenEffects`。
- **decision 事件验收**：至少满足一项——改变后续剧情(next/delayed)、产生/修改资产、延迟后果、解锁知识卡、改变角色关系。什么都不改变的"看完一段话"不要做成 decision。
- **NPC 台词**：单句 5–80 字；单事件单 NPC 连续不超过 4 段。
- **每个事件**：`id` 全局唯一（建议前缀 `r_`/`c_`/`v_`）；`trigger` 用 `manual` 表示"由 next 指针进入"，`missionEntry` 只给任务的入口事件，`day`+`phase` 给日固定事件。
- **延迟后果**：每条线至少 8 处 `delayed`（跨 5 天以上），重大 flag（如假引用）必须有 Day 26+/最后阶段的爆雷事件。
- **BAD END**：`failureConditions` 用隐藏状态阈值（如 academicDebt ≥ 90）；失败分支要有对应低优先级结局。
- **随机事件**：`trigger: {kind: random, weight: N}`，每个 campaign 3~6 个，用于重玩差异。
- 状态键只能用：`day,timeBudget,actionPoints,money,progress,users,revenue,literatureCount,productVersion,competitionRank,reputation,energy`（可见）+ `evidenceDiscipline,aiDependence,independence,execution,userUnderstanding,technicalDebt,academicDebt,perfectionism,riskTolerance,mentorTrust,teamTrust,credibility`（隐藏，0–100）。
- 资产类型只能用：`document,dataset,prompt,task_contract,agents_md,claude_md,goal,loop,research_matrix,literature_library,interview_notes,prototype,code_project,pitch_deck,business_model,user_feedback,revenue_report,test_report,handoff,custom,keyword_tree,evidence_matrix,research_brief,concept_table,mechanism_map,argument_map,state_file,compact_checkpoint,agent_environment_profile,session_summary,hypothesis_board,checklist`

## 4. Ending 规范

禁止手写 200 个独立结局。用"主结局骨架 × 变体规则"组合：

```yaml
endings:
  - id: r_end_pass_excellent
    campaign: research            # type 或 global
    title: 《优秀开题》
    mainResult: 开题答辩优秀通过
    requirements:
      kind: and
      conditions:
        - { kind: "state", key: "progress", op: "gte", value: 75 }
        - { kind: "state", key: "academicDebt", op: "lte", value: 40 }
    priority: 80                  # 数字越大越优先
    tier: main                    # main|special|hidden
    baseText: |
      答辩室里，{{characterName}} 合上最后一页幻灯片。
      评委A在纸上写了什么，然后抬头："研究问题很清楚。第12页的证据链，你自己核过吗？"
      你点头。这一次，你确实核过。
    growthVariantRules:           # 按隐藏状态分段，引擎自动拼接
      - dimension: independence
        variants:
          - { gte: 70, text: "整个准备过程中，你逐渐学会了自己判断什么时候该信AI、什么时候必须自己查证。" }
          - { lte: 30, text: "只有你自己知道，这份计划里有多少判断其实是工具替你做的。" }
      - dimension: evidenceDiscipline
        variants:
          - { gte: 70, text: "每一处引用你都能指出原文页码。" }
          - { lte: 40, text: "有几处引用，你其实没回头翻过原文。" }
    characterEpilogueRules:       # 主要NPC各 positive/neutral/negative 三档
      - characterId: r_mentor
        positive: 陈教授把你拉进了他的课题组："下学期，跟我做。" 
        neutral: 陈教授在名单上勾了你的名字，仅此而已。
        negative: 陈教授在走廊遇见你，第一次没有停下脚步。
    projectFutureRules:           # 项目未来（引擎取第一条满足的）
      - { key: strong, condition: { kind: "state", key: "progress", op: "gte", value: 85 }, text: "这份开题报告后来成了你硕士论文的第一章。" }
      - { key: stable, condition: { kind: "always" }, text: "研究计划进入执行阶段，前路还长。" }
    specialFlagSections:          # 特殊 flag 追加段（有 flag 才显示）
      - { flag: used_fake_citation, text: "没人发现那篇不存在的文献。但你每次翻到那页，心里都咯噔一下。" }
    specialTags: [excellent]
    reflection: 开题通过不是终点——它只是证明你的问题值得研究。
    lessonHint: 证据纪律决定研究能走多远
```

**变体数量要求**：每个主结局至少 3 条 growthVariantRules（各≥2 档）+ 主要 NPC 后日谈 + ≥3 条 projectFutureRules + ≥2 条 specialFlagSections。统计脚本会按组合计算可显示结局（科研≥70、竞赛≥50、创业≥80 变体）。

## 5. Knowledge 卡（知识卡）规范

每条线 25~35 张，放在本线 `knowledge.yaml`。id 前缀 `kc_r_` / `kc_c_` / `kc_v_`。

```yaml
knowledge:
  - id: kc_r_fake_citation
    title: AI会编造看起来可信的文献
    domain: verification          # environment|initialization|task_contract|goal|loop|context|agent_organization|verification
    trigger: first_failure        # first_failure|skill_unlock|npc_advice|player_search|event
    problem: AI给的参考文献在数据库里查不到，或作者/年份对不上
    wrongPattern: 直接复制AI输出的引用进文献综述
    correctBehavior: 每条引用先去原始数据库核对，查不到就丢弃
    why: 语言模型生成的是"像引用的文本"，不是数据库查询结果
    steps: [复制标题与DOI, 到学术数据库检索, 比对作者/年份/期刊, 查不到就标记为待核实并告知AI不许再用]
    toolMappings:
      claudeCode: 把核对过的文献放进本地 literature.md，并在 CLAUDE.md 写明"只准引用该文件中的文献"
      codex: 同样用项目文件白名单方式约束
      deepseekHarness: 在任务上下文中附上已核实文献列表
    successSignals: [文献列表全部可检索, 综述里没有"幽灵文献"]
    failureSignals: [答辩/评审时被指出引用不存在]
    transferScenarios: [竞赛调研数据, 创业市场规模判断]
    depth30s: AI会给出不存在的文献。先查证，再引用。
    depth3m: 模型生成引用时靠的是"统计上像"，不是"数据库里在"。任何要写进正式材料的事实，都要回到原始来源。三步：检索→比对→标记。
    depth10m: |
      完整操作流程：
      1. 让AI输出引用时附带DOI；
      2. 用DOI反查（而不是搜标题）；
      3. 建立"已核实/待核实/已证伪"三个清单；
      4. 在项目规则文件里写死"只准引用已核实清单"；
      5. 每次生成后抽查三条。
    relatedSkillIds: [verification.source_check]
```

**内容红线（自动+人工审查）**：禁止大段解释 Transformer/attention/token 采样/embedding 数学/agent 内核原理；depth3m/depth10m 以"做什么、怎么做、怎么验收"为主。

## 6. Character 规范

```yaml
characters:
  - id: r_mentor
    displayName: 陈教授
    role: 导师
    portrait: mentor_male_50s
    baseRelationship: 50
    traits: [严格, 话少, 重视证据]
    goals: 希望你形成独立研究能力，而不是替他跑腿
    personality: 出言谨慎，用反问代替直接回答
    offers: 方向把关、组会反馈、有限的计算资源
    conflicts: 反感不核实的数据；反感"AI说所以我对"
    relationshipRules: ["核实数据/主动汇报坏消息 +", "引用出错被发现 -"]
    campaignAvailability: [research]
    dynamicRules: [academicDebt高时追问更尖锐]
    dialogueStyle: 短句、反问、不安慰
```

## 7. 验证与跑通（交稿前必须全部通过）

```bash
pnpm content:validate      # schema + 跨引用 + 重复ID（必须 0 issue，exit 0）
node scripts/bot.mjs research first    # 首选策略 bot 能从头走到结局
node scripts/bot.mjs research last     # 末选策略 bot 能走到结局
node scripts/bot.mjs research random   # 随机策略 bot 能走到结局
```

三个 bot 都必须：无崩溃、能推进到最终结算（Ending Resolver 被触发）、事件遍历覆盖率 ≥ 80%（脚本会打印）。
