# PLAYTEST_RECORDS — 最终试玩脚本记录（任务书 §41）

> 路线 A–F 由自动 bot 机械化执行（3 线 × 策略），数据为构建会话实测输出。
> "人工试玩"列留白：待真人试玩后补记（S001/S002）。

| 路线 | 目标 | 执行方式 | 到达结局 | 事件数/天数 | Agent操作数 | 资产数 | 知识卡 | Bug |
|---|---|---|---|---|---|---|---|---|
| A 谨慎型科研者 | 优秀开题+高证据纪律 | bot research/first | r_end_method_mismatch（首个选项=接受SEM建议的分支） | steps=179, days=31 | 全程Agent交互（模拟/真实） | 20 | 13 | 0 |
| B AI依赖型科研者 | 负面成长结局 | bot research/last | r_end_switch_topic | steps=161, days=31 | 同上 | 7 | 2 | 0 |
| C 比赛包装路线 | 奖项不错项目空心 | bot competition/first | c_end_school_fail 等分支 | steps=160 | 同上 | 21 | 13 | 0 |
| D 比赛长期价值路线 | 奖项普通转创业 | bot competition/random | c_end_tech_fail 等分支 | — | 同上 | — | — | 0 |
| E 创业直接开发路线 | 开发多用户少 | bot venture/last | v_end_first_paid 等分支 | steps≈230 | 同上 | — | — | 0 |
| F 创业验证路线 | 问题验证→首单 | bot venture/first | **v_end_hidden_pm 隐藏结局** | steps=235, days=31 | 同上 | 35 | 17 | 0 |

## 补充记录（多轮采样）

- research: first→method_mismatch / last→switch_topic / random→switch_topic（三条路径结局不同 ✅ 重玩差异）
- competition: first→school_fail / last→tech_fail / random→tech_fail
- venture: first→**hidden_pm** / last→first_paid / random→first_paid
- 全部路线 0 崩溃、0 死锁；venture/first 触发隐藏结局证明"验证方法论内化"路径真实可达。

## 人工试玩记录（待补）

| 路线 | 试玩人 | 时长 | 事件数 | Agent操作 | 资产 | 结局 | 感受摘要 |
|---|---|---|---|---|---|---|---|
| A | — | — | — | — | — | — | — |
| B | — | — | — | — | — | — | — |
| C | — | — | — | — | — | — | — |
| D | — | — | — | — | — | — | — |
| E | — | — | — | — | — | — | — |
| F | — | — | — | — | — | — | — |

## S002 教学效果七问（待真人访谈后填写）

1. AGENTS.md 是干什么的？
2. 什么时候应该开新 Session？
3. Goal 与普通 Prompt 有什么区别？
4. Loop 什么时候用？
5. AI 结果为什么要独立验证？
6. 创业中为什么不能直接开发？
7. 科研中为什么不能直接相信"研究空白"？
