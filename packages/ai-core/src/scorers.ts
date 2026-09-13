/**
 * 真实任务评估评分器（PHASE M）：规则优先，AI 补充。
 * 返回分项得分 + 可执行的改进建议。规则可测、可解释。
 */

export interface ScoreItem {
  key: string;
  label: string;
  score: number; // 0-100
  passed: boolean;
  feedback: string;
}

export interface ScoreResult {
  total: number;
  items: ScoreItem[];
  summary: string;
}

function check(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/** TASK-M001 Task Contract 评分器 */
export function scoreTaskContract(text: string): ScoreResult {
  const t = text.trim();
  const items: ScoreItem[] = [
    {
      key: "goal",
      label: "目标",
      score: /目标|objective|goal/i.test(t) && t.length > 50 ? 80 : 30,
      passed: /目标|objective|goal/i.test(t),
      feedback: /目标|objective|goal/i.test(t) ? "" : "缺少明确的目标段：一句话说明做成什么样",
    },
    {
      key: "context",
      label: "背景",
      score: /背景|context|现状/i.test(t) ? 80 : 25,
      passed: /背景|context|现状/i.test(t),
      feedback: /背景|context|现状/i.test(t) ? "" : "缺少背景段：Agent 不了解项目现状",
    },
    {
      key: "constraint",
      label: "约束",
      score: check(t, [/约束|限制|不许|禁止|constraint/i]) ? 85 : 25,
      passed: check(t, [/约束|限制|不许|禁止|constraint/i]),
      feedback: check(t, [/约束|限制|不许|禁止|constraint/i]) ? "" : "没有约束：Agent 可能顺手改动不该动的部分",
    },
    {
      key: "deliverable",
      label: "交付物",
      score: check(t, [/交付|输出文件|deliverable|产出/i]) ? 85 : 25,
      passed: check(t, [/交付|输出文件|deliverable|产出/i]),
      feedback: check(t, [/交付|输出文件|deliverable|产出/i]) ? "" : "未写清交付什么文件/什么格式",
    },
    {
      key: "acceptance",
      label: "验收标准",
      score: check(t, [/验收|acceptance|完成标准|检查清单/i]) ? 90 : 20,
      passed: check(t, [/验收|acceptance|完成标准|检查清单/i]),
      feedback: check(t, [/验收|acceptance|完成标准|检查清单/i]) ? "" : "缺少验收标准：无法判断'完成'",
    },
  ];
  return finalize(items, t);
}

/** TASK-M002 AGENTS.md 评分器 */
export function scoreAgentsMd(text: string): ScoreResult {
  const t = text.trim();
  const tooLong = t.length > 3000;
  const items: ScoreItem[] = [
    { key: "purpose", label: "项目目标", score: /目标|purpose|这个项目/i.test(t) ? 85 : 25, passed: /目标|purpose|这个项目/i.test(t), feedback: /目标|purpose|这个项目/i.test(t) ? "" : "开头应说明项目是干什么的" },
    { key: "constraints", label: "约束", score: check(t, [/约束|不许|禁止|不要|never|must not/i]) ? 85 : 25, passed: check(t, [/约束|不许|禁止|不要|never|must not/i]), feedback: check(t, [/约束|不许|禁止|不要|never|must not/i]) ? "" : "缺少禁令：Agent 不知道什么不许做" },
    { key: "workflow", label: "工作方式", score: check(t, [/流程|步骤|工作方式|workflow|先.*再/i]) ? 80 : 30, passed: check(t, [/流程|步骤|工作方式|workflow|先.*再/i]), feedback: check(t, [/流程|步骤|工作方式|workflow|先.*再/i]) ? "" : "缺少工作方式：先读后写等流程约定" },
    { key: "test", label: "测试命令", score: check(t, [/test|测试|vitest|pytest|npm test/i]) ? 90 : 20, passed: check(t, [/test|测试|vitest|pytest|npm test/i]), feedback: check(t, [/test|测试|vitest|pytest|npm test/i]) ? "" : "写明测试命令，Agent 改完才知道跑什么" },
    { key: "acceptance", label: "验收", score: check(t, [/验收|acceptance|definition of done/i]) ? 85 : 25, passed: check(t, [/验收|acceptance|definition of done/i]), feedback: check(t, [/验收|acceptance|definition of done/i]) ? "" : "缺少完成定义" },
    { key: "length", label: "简洁度", score: tooLong ? 40 : 85, passed: !tooLong, feedback: tooLong ? "规则文件超过 3000 字：长规则没人读（包括 Agent）。精简到要点" : "" },
  ];
  return finalize(items, t);
}

/** TASK-M003 Goal 评分器 */
export function scoreGoal(text: string): ScoreResult {
  const t = text.trim();
  const items: ScoreItem[] = [
    { key: "final_state", label: "终态描述", score: /终态|最终|完成后|final state|变成/i.test(t) ? 85 : 30, passed: /终态|最终|完成后|final state|变成/i.test(t), feedback: /终态|最终|完成后|final state|变成/i.test(t) ? "" : "用'世界变成什么样'描述，而不是'你要做什么'" },
    { key: "measurable", label: "可衡量完成", score: check(t, [/\d+|通过.*测试|文件存在|发布|提交/i]) ? 85 : 25, passed: check(t, [/\d+|通过.*测试|文件存在|发布|提交/i]), feedback: check(t, [/\d+|通过.*测试|文件存在|发布|提交/i]) ? "" : "完成判据必须可观测：数字/测试/文件" },
    { key: "scope", label: "范围", score: /范围|不包括|不涉及|non-goal|仅限/i.test(t) ? 80 : 30, passed: /范围|不包括|不涉及|non-goal|仅限/i.test(t), feedback: /范围|不包括|不涉及|non-goal|仅限/i.test(t) ? "" : "写明不做什么，防止范围膨胀" },
    { key: "stop", label: "停止条件", score: /停止|暂停|如果.*失败|最多/i.test(t) ? 80 : 25, passed: /停止|暂停|如果.*失败|最多/i.test(t), feedback: /停止|暂停|如果.*失败|最多/i.test(t) ? "" : "什么情况要停下来？写出来" },
  ];
  return finalize(items, t);
}

/** TASK-M004 Loop 评分器 */
export function scoreLoop(text: string): ScoreResult {
  const t = text.trim();
  const items: ScoreItem[] = [
    { key: "iteration", label: "迭代步骤", score: check(t, [/循环|迭代|每轮|repeat|loop/i]) ? 85 : 25, passed: check(t, [/循环|迭代|每轮|repeat|loop/i]), feedback: check(t, [/循环|迭代|每轮|repeat|loop/i]) ? "" : "写清循环的每一步做什么" },
    { key: "evaluator", label: "评估方式", score: check(t, [/评估|检查|测试|评审|evaluat|check/i]) ? 90 : 20, passed: check(t, [/评估|检查|测试|评审|evaluat|check/i]), feedback: check(t, [/评估|检查|测试|评审|evaluat|check/i]) ? "" : "每轮怎么判断好坏？没有 evaluator 的循环是许愿" },
    { key: "stop", label: "停止条件", score: check(t, [/停止|收敛|不再|连续.*轮|直到/i]) ? 85 : 25, passed: check(t, [/停止|收敛|不再|连续.*轮|直到/i]), feedback: check(t, [/停止|收敛|不再|连续.*轮|直到/i]) ? "" : "什么时候停？" },
    { key: "max_cycles", label: "轮数上限", score: check(t, [/\d+\s*轮|最多|上限|max/i]) ? 85 : 25, passed: check(t, [/\d+\s*轮|最多|上限|max/i]), feedback: check(t, [/\d+\s*轮|最多|上限|max/i]) ? "" : "设定最多循环几轮" },
    { key: "rollback", label: "回退预案", score: check(t, [/回退|回滚|rollback|恢复|备份/i]) ? 80 : 25, passed: check(t, [/回退|回滚|rollback|恢复|备份/i]), feedback: check(t, [/回退|回滚|rollback|恢复|备份/i]) ? "" : "改坏了怎么办？写回退办法" },
  ];
  return finalize(items, t);
}

/** TASK-M005 Research Question 评分器 */
export function scoreResearchQuestion(text: string): ScoreResult {
  const t = text.trim();
  const isQuestion = /[？?]|如何|是否|怎样|什么/i.test(t);
  const items: ScoreItem[] = [
    { key: "clear", label: "清晰", score: t.length >= 15 && t.length <= 120 ? 85 : 40, passed: t.length >= 15 && t.length <= 120, feedback: t.length >= 15 && t.length <= 120 ? "" : "问题应一句话说清（15–120 字），太短太长都说明还没想清楚" },
    { key: "researchable", label: "可研究", score: isQuestion ? 85 : 30, passed: isQuestion, feedback: isQuestion ? "" : "研究问题应该是个可以问的问题（如何/是否/什么）" },
    { key: "evidence", label: "有证据路径", score: check(t, [/数据|文献|访谈|问卷|实验|案例/i]) ? 85 : 35, passed: check(t, [/数据|文献|访谈|问卷|实验|案例/i]), feedback: check(t, [/数据|文献|访谈|问卷|实验|案例/i]) ? "" : "你想用什么证据回答它？（数据/访谈/实验）" },
    { key: "scope", label: "范围适中", score: /([，,、]|在.*中|对.*而言)/.test(t) ? 80 : 40, passed: /([，,、]|在.*中|对.*而言)/.test(t), feedback: /([，,、]|在.*中|对.*而言)/.test(t) ? "" : "加限定词缩小范围：对什么人群、在什么场景" },
    { key: "method", label: "方法兼容", score: check(t, [/比较|影响|关系|变化|差异|机制/i]) ? 80 : 45, passed: check(t, [/比较|影响|关系|变化|差异|机制/i]), feedback: check(t, [/比较|影响|关系|变化|差异|机制/i]) ? "" : "问题里应隐含可操作的分析对象（比较/影响/差异）" },
  ];
  return finalize(items, t);
}

/** TASK-M006 Startup Hypothesis 评分器 */
export function scoreHypothesis(text: string): ScoreResult {
  const t = text.trim();
  const items: ScoreItem[] = [
    { key: "user", label: "具体用户", score: check(t, [/学生|老师|店主|团队|用户.*[：:]|人群/i]) && !/所有人|大家/i.test(t) ? 85 : 35, passed: check(t, [/学生|老师|店主|团队|用户.*[：:]|人群/i]) && !/所有人|大家/i.test(t), feedback: "所有人都是用户=没有用户。写具体：谁、在什么场景" },
    { key: "problem", label: "明确问题", score: check(t, [/问题|痛点|麻烦|因为|导致/i]) ? 85 : 30, passed: check(t, [/问题|痛点|麻烦|因为|导致/i]), feedback: check(t, [/问题|痛点|麻烦|因为|导致/i]) ? "" : "他们现在具体卡在哪？" },
    { key: "evidence", label: "证据", score: check(t, [/访谈|\d+\s*人|数据显示|观察到|反馈/i]) ? 90 : 25, passed: check(t, [/访谈|\d+\s*人|数据显示|观察到|反馈/i]), feedback: check(t, [/访谈|\d+\s*人|数据显示|观察到|反馈/i]) ? "" : "这个假设有什么真实证据？（访谈了几个人/看到了什么）" },
    { key: "verifiable", label: "可验证", score: check(t, [/如果.*那么|验证|实验|测试/i]) ? 80 : 30, passed: check(t, [/如果.*那么|验证|实验|测试/i]), feedback: check(t, [/如果.*那么|验证|实验|测试/i]) ? "" : "写清怎么验证/什么结果算证伪" },
    { key: "payment", label: "付费假设", score: check(t, [/付费|价格|花钱|订阅|\d+\s*元/i]) ? 85 : 30, passed: check(t, [/付费|价格|花钱|订阅|\d+\s*元/i]), feedback: check(t, [/付费|价格|花钱|订阅|\d+\s*元/i]) ? "" : "愿意付多少钱？喜欢≠付费" },
  ];
  return finalize(items, t);
}

function finalize(items: ScoreItem[], text: string): ScoreResult {
  const total = Math.round(items.reduce((s, i) => s + i.score, 0) / items.length);
  const missing = items.filter((i) => !i.passed);
  const summary =
    missing.length === 0
      ? "结构完整。让另一个会话独立检查内容质量，再交付。"
      : `缺 ${missing.length} 项：${missing.map((i) => i.label).join("、")}。${text.length < 30 ? "整体内容太短。" : ""}`;
  return { total, items, summary };
}
