# NEXT WORK PACKET — 会话交接

> 本文件由持续执行循环自动生成/维护。下次 session 启动时必须先读本文件 + quality/state.yaml + quality/backlog.yaml，然后运行 `pnpm quality:release-lock` 确认当前状态，再继续最高优先工作包。

## 当前快照（2026-09-16 04:40 前后, HEAD 见 state.yaml）
- 结局: 359/480（research 119 / competition 130 / venture 110）
- 事件: 1507+（要求 ≥1060 ✅）
- 决策: 389/450（research 154 ✅ / competition 118 / venture 117）
- 延迟: 166/240（venture 38/90 最缺）
- hidden: research 24/40, competition 30/35, venture 18/45
- NG+: research 16/30, competition 17/25, venture 12/30
- NPC: research ✅ / competition ✅ / venture 83/130
- witness: 49/359 已生成（后台求解器持续运行 scripts/witness-generate.ts）

## 下一步工作包（按优先级）
1. WP-A witness 补全：`npx tsx scripts/witness-generate.ts --campaign <line> --attempts 12` 三线并行跑（跳过已有）。
   - 对反复失败的 legacy 通用结局（r_end_fail/pass/excellent/barely 等）：
     方案 A：给 witness-generate 加 vanilla 模式已做，仍失败则
     方案 B：内容修复——给这些结局补独有区分条件（如"零特殊旗标"无法表达，则加一条低门槛专署旗标由早期普通选择设置），或调低其 requirement 区间。
2. WP-B venture 补完：结局 104→160（孤儿旗标已基本回收，需新 chains：写 events_v2_07/v2_08 + endings）、延迟 38→90、hidden 18→45、NPC 83→130。
3. WP-C competition 补完：结局 130→160、决策 118→140、延迟 57→70。
4. WP-D research 补完：结局 119→160、hidden 24→40、延迟 71→80。
5. WP-E 每批完成后：validate → metrics → quality:sync → commit → push。

## 已知引擎/工具事实（新 session 必读）
- resolver 已改为特异性排序（ending-resolver.ts）：唯一旗标(1个事件设置)score=2 > ngPlus/ultraRare=1 > 纯数值/里程碑=0；同级比 priority。
- 通用接盘结局（纯数值/里程碑旗标守卫）已批量封顶 88/89。
- witness-generate 已有 vanilla 模式：目标 specScore=0 时惩罚设置旗标的选择（-3）。
- YAML 常见坑：值内 ASCII 双引号（用全角"" 替代）、ASCII ": " 冒号、flow map 缺逗号。修数脚本模式见 git log 中多次 quote fixer。
- 内容校验: `npx tsx scripts/validate-content.ts`（exit 0 通过）；指标: `pnpm quality:metrics`；同步: `npx tsx scripts/quality-controller.ts sync`。

## 禁止事项
- 不得宣称 RELEASE READY / 全部完成 —— 唯一判据是 `pnpm quality:release-lock` exit 0。
- macOS 不可作为阻断项。外部真人试玩不阻断。

## 深层设计问题（下一轮叙事手术的核心，2026-09-16 凌晨分析）
**必经选择设独占旗标 → 遮蔽通用结局**：
- D24/D26/D28/D30 等必经决策的每个选项都 setFlag（如 rv2_honest_nervous/rv2_fake_calm），
  且这些旗标是唯一旗标（单事件设置）→ specScore=2。
- 于是所有通关的 run 都携带若干 score=2 的姿态旗标，对应的姿态结局（93-98）
  永远压过 score 0-2 的通用结局（r_end_pass/excellent/barely 等，88-89）。
- 结果：~8-10 个 legacy 通用结局实际不可达（witness-generate 16 次尝试也失败）。
**候选修复方案（下一轮执行）**：
1. 把"姿态类"必经选择的旗标从"结局守卫"降级为"epilogue 修饰"（specialFlagSections），
   对应姿态结局改用组合守卫：姿态旗标 + 核心完成条件 + 关键数值区间。
2. 或给通用结局配专属"平淡路线"旗标链（早期选择设置），并要求姿态旗标 NOT 同时存在
   （NOT 条件列全所有姿态旗标，约 6-8 个，可接受）。
3. 修改后需对每线跑 witness-generate 验证全部可解。
