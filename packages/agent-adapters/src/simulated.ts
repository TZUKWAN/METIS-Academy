import type { AgentAdapter, AgentFeature, DetectResult, RunTaskOptions, RunTaskResult } from "./adapters.js";
import { scoreTaskContract } from "@metis/ai-core";

/**
 * 教学模拟 Agent（TASK-N001~N004）：
 * 不调用真实 CLI；按真实工具的典型阶段产出流式输出，全部标注"教学模拟"。
 * 行为由 Task Contract 质量驱动：契约越完整，模拟 Agent 表现越好（fail→test→revise 教学闭环）。
 */

const SIM_HEADER = "===== 教学模拟环境（Simulated Environment）=====";

interface SimScript {
  phases: { title: string; lines: string[] }[];
}

function buildScript(adapterName: string, prompt: string, cwd: string, quality: number, failMode: boolean): SimScript {
  const q = Math.max(0, Math.min(100, quality));
  const hasAcceptance = /验收|acceptance|完成标准/i.test(prompt);
  const hasConstraint = /约束|不许|禁止/i.test(prompt);
  const hasDeliverable = /交付|输出|deliverable/i.test(prompt);
  const phases: SimScript["phases"] = [
    {
      title: "INIT — 读取项目",
      lines: [
        `[init] 工作目录: ${cwd}`,
        `[init] 扫描项目结构…`,
        `[init] 发现目录: literature/ notes/（示例）`,
        `[init] 读取项目规则文件 AGENTS.md… ${hasConstraint ? "已加载 6 条项目规则" : "未找到项目规则文件（建议创建 AGENTS.md）"}`,
      ],
    },
    {
      title: "PLAN — 任务理解",
      lines: [
        `[plan] 任务目标: ${prompt.slice(0, 60)}${prompt.length > 60 ? "…" : ""}`,
        `[plan] 拆解为 3 个步骤：读取材料 → 执行 → 自查`,
        hasAcceptance ? `[plan] 检测到验收标准，将在结束时逐条自查` : `[plan][警告] 未检测到验收标准——将按我自己的理解判断"完成"`,
      ],
    },
    {
      title: "EXECUTE — 执行任务",
      lines: [
        `[exec] 第 1 步：读取材料… 完成（3 个文件）`,
        `[exec] 第 2 步：按任务要求处理…`,
        hasDeliverable ? `[exec] 第 3 步：生成交付物 output.md` : `[exec] 第 3 步：输出结果（未指定交付物，直接打印）`,
        `[exec] 完成。`,
      ],
    },
  ];
  if (failMode || q < 45) {
    phases.push({
      title: "SELF-CHECK — 自查（发现失败）",
      lines: [
        `[test] 运行自查……`,
        `[test][FAIL] 输出与任务目标存在偏差：${hasAcceptance ? "第 2 条验收未满足" : "任务缺少可检验的完成标准，无法确认正确性"}`,
        `[test] 这是教学模拟刻意展示的失败：契约不完整时 Agent 会"自信地做错"。`,
      ],
    });
    phases.push({
      title: "REVISE — 按反馈修订",
      lines: [
        `[revise] 根据失败原因修订：重新对齐目标……`,
        `[revise] 修订完成（第 2 轮）。真实工作中这一步由你驱动：给出明确的修正反馈。`,
      ],
    });
  } else {
    phases.push({
      title: "TEST — 验证",
      lines: [
        `[test] 按验收清单逐条自查：${hasAcceptance ? "5/5 通过" : "4/5 通过（验收标准缺失，建议补全 Task Contract）"}`,
        `[test] 全部关键项通过。`,
      ],
    });
  }
  phases.push({
    title: "REPORT — 汇报",
    lines: [
      `[report] 改动: ${hasDeliverable ? "output.md（新增）" : "对话内输出"}`,
      `[report] 验证: ${q >= 45 ? "自查通过" : "自查发现问题并已修订"}`,
      `[report] 遗留: 需要 ${adapterName} 真实环境复现验证（本会话为教学模拟）`,
      `[report] 提示: 本输出由教学模拟生成，不代表真实 CLI 行为。`,
    ],
  });
  return { phases };
}

export class SimulatedClaudeCodeAdapter implements AgentAdapter {
  readonly id = "claude-code-sim";
  readonly displayName = "Claude Code（教学模拟）";
  readonly commandName = "claude";
  readonly simulated = true;

  async detect(): Promise<DetectResult> {
    return { installed: true, version: "sim-1.0.0" };
  }
  async getVersion(): Promise<string | null> {
    return "sim-1.0.0";
  }
  getInstallGuide() {
    return {
      steps: ["教学模拟无需安装。要使用真实工具请选择 Claude Code（本机）。"],
      docsUrl: "https://docs.anthropic.com/en/docs/claude-code",
    };
  }
  async openProject(): Promise<void> {}
  buildCommand(prompt: string): { command: string; args: string[] } {
    return { command: "echo", args: [prompt] };
  }
  supports(feature: AgentFeature): boolean {
    return feature === "stream_output" || feature === "cancel" || feature === "task_run";
  }
  async runTask(options: RunTaskOptions): Promise<RunTaskResult> {
    return runSimulated("Claude Code", options);
  }
}

export class SimulatedCodexAdapter implements AgentAdapter {
  readonly id = "codex-sim";
  readonly displayName = "Codex CLI（教学模拟）";
  readonly commandName = "codex";
  readonly simulated = true;

  async detect(): Promise<DetectResult> {
    return { installed: true, version: "sim-1.0.0" };
  }
  async getVersion(): Promise<string | null> {
    return "sim-1.0.0";
  }
  getInstallGuide() {
    return { steps: ["教学模拟无需安装。要使用真实工具请选择 Codex CLI（本机）。"], docsUrl: "https://developers.openai.com/codex/cli" };
  }
  async openProject(): Promise<void> {}
  buildCommand(prompt: string): { command: string; args: string[] } {
    return { command: "echo", args: [prompt] };
  }
  supports(feature: AgentFeature): boolean {
    return feature === "stream_output" || feature === "task_run";
  }
  async runTask(options: RunTaskOptions): Promise<RunTaskResult> {
    return runSimulated("Codex", options);
  }
}

export class SimulatedDeepSeekHarnessAdapter implements AgentAdapter {
  readonly id = "dsh-sim";
  readonly displayName = "DeepSeek Harness（教学模拟）";
  readonly commandName = "dsh";
  readonly simulated = true;

  async detect(): Promise<DetectResult> {
    return { installed: true, version: "sim-1.0.0" };
  }
  async getVersion(): Promise<string | null> {
    return "sim-1.0.0";
  }
  getInstallGuide() {
    return { steps: ["教学模拟无需安装。要使用真实工具请选择 DeepSeek Harness（本机）。"], docsUrl: "https://github.com/deepseek-ai" };
  }
  async openProject(): Promise<void> {}
  buildCommand(prompt: string): { command: string; args: string[] } {
    return { command: "echo", args: [prompt] };
  }
  supports(feature: AgentFeature): boolean {
    return feature === "stream_output" || feature === "task_run";
  }
  async runTask(options: RunTaskOptions): Promise<RunTaskResult> {
    return runSimulated("DeepSeek Harness", options);
  }
}

async function runSimulated(adapterName: string, options: RunTaskOptions): Promise<RunTaskResult> {
  const start = Date.now();
  const score = scoreTaskContract(options.prompt);
  const failMode = score.total < 45;
  const script = buildScript(adapterName, options.prompt, options.cwd, score.total, failMode);
  let output = "";
  const emit = (line: string): void => {
    output += line + "\n";
    if (output.length > 200000) output = output.slice(-200000);
    options.onOutput?.(line + "\n", "stdout");
  };
  emit(SIM_HEADER);
  const cancelled = await new Promise<boolean>((resolve) => {
    let i = 0;
    let cancelledFlag = false;
    const onAbort = () => {
      cancelledFlag = true;
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const tick = (): void => {
      if (cancelledFlag) return resolve(true);
      if (i >= script.phases.length) {
        options.signal?.removeEventListener("abort", onAbort);
        return resolve(false);
      }
      const phase = script.phases[i]!;
      emit(`\n--- ${phase.title} ---`);
      let j = 0;
      const lineTick = (): void => {
        if (cancelledFlag) return resolve(true);
        if (j >= phase.lines.length) {
          i += 1;
          setTimeout(tick, 120);
          return;
        }
        emit(phase.lines[j]!);
        j += 1;
        setTimeout(lineTick, 60);
      };
      lineTick();
    };
    tick();
  });
  return { exitCode: cancelled ? 130 : 0, cancelled, durationMs: Date.now() - start, outputTail: output.slice(-4000) };
}
