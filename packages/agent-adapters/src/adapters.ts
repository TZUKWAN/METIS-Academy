import type { ChildProcess } from "node:child_process";

/** Agent Adapter 接口（TASK-D007） */
export interface DetectResult {
  installed: boolean;
  version?: string;
  path?: string;
  error?: string;
}

export interface RunTaskOptions {
  /** 用户在 UI 中明确选择的工作目录（主进程校验） */
  cwd: string;
  /** 任务指令（将作为 CLI 参数传递） */
  prompt: string;
  /** 额外参数（adapter 白名单内） */
  args?: string[];
  onOutput?: (chunk: string, stream: "stdout" | "stderr") => void;
  signal?: AbortSignal;
}

export interface RunTaskResult {
  exitCode: number | null;
  cancelled: boolean;
  durationMs: number;
  outputTail: string;
}

export type AgentFeature = "stream_output" | "cancel" | "version" | "project_open" | "task_run";

export interface AgentAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly commandName: string;
  readonly simulated: boolean;
  detect(): Promise<DetectResult>;
  getVersion(): Promise<string | null>;
  getInstallGuide(): { steps: string[]; docsUrl: string };
  openProject(cwd: string): Promise<void>;
  buildCommand(prompt: string): { command: string; args: string[] };
  runTask(options: RunTaskOptions): Promise<RunTaskResult>;
  supports(feature: AgentFeature): boolean;
}

/** 终端安全层（TASK-D012）：命令白名单，主进程与 adapter 共用 */
export const ALLOWED_COMMANDS = new Set(["claude", "codex", "dsh", "node", "npx", "git", "npm", "pnpm", "python"]);

export function isCommandAllowed(command: string): boolean {
  return ALLOWED_COMMANDS.has(command);
}

export interface RunHistoryEntry {
  id: string;
  tool: string;
  simulated: boolean;
  task: string;
  cwd: string;
  startedAt: string;
  endedAt: string;
  exitCode: number | null;
  resultSummary: string;
  relatedAssetId?: string;
}

/** Claude Code Adapter（TASK-D008） */
export class ClaudeCodeAdapter implements AgentAdapter {
  readonly id = "claude-code";
  readonly displayName = "Claude Code";
  readonly commandName = "claude";
  readonly simulated = false;
  private child: ChildProcess | null = null;

  async detect(): Promise<DetectResult> {
    return detectCommand(this.commandName);
  }
  async getVersion(): Promise<string | null> {
    const r = await detectCommand(this.commandName);
    return r.installed ? (r.version ?? null) : null;
  }
  getInstallGuide() {
    return {
      steps: [
        "需要 Node.js 18 或更高版本",
        "运行: npm install -g @anthropic-ai/claude-code",
        "安装后运行 claude --version 确认",
        "首次运行按提示登录或配置 API Key",
      ],
      docsUrl: "https://docs.anthropic.com/en/docs/claude-code",
    };
  }
  async openProject(_cwd: string): Promise<void> {
    /* Claude Code 无需预打开；由 runTask 的 cwd 决定 */
  }
  buildCommand(prompt: string): { command: string; args: string[] } {
    return { command: "claude", args: ["-p", prompt, "--output-format", "text"] };
  }
  async runTask(options: RunTaskOptions): Promise<RunTaskResult> {
    const { command, args } = this.buildCommand(options.prompt);
    return spawnAndCollect(command, args, options, (child) => (this.child = child));
  }
  supports(feature: AgentFeature): boolean {
    return ["stream_output", "cancel", "version", "project_open", "task_run"].includes(feature);
  }
}

/** Codex CLI Adapter（TASK-D009） */
export class CodexAdapter implements AgentAdapter {
  readonly id = "codex";
  readonly displayName = "Codex CLI";
  readonly commandName = "codex";
  readonly simulated = false;
  private child: ChildProcess | null = null;

  async detect(): Promise<DetectResult> {
    return detectCommand(this.commandName);
  }
  async getVersion(): Promise<string | null> {
    const r = await detectCommand(this.commandName);
    return r.installed ? (r.version ?? null) : null;
  }
  getInstallGuide() {
    return {
      steps: [
        "需要 Node.js 22 或更高版本",
        "运行: npm install -g @openai/codex",
        "安装后运行 codex --version 确认",
        "配置 OPENAI_API_KEY 环境变量或按官方登录",
      ],
      docsUrl: "https://developers.openai.com/codex/cli",
    };
  }
  async openProject(_cwd: string): Promise<void> {}
  buildCommand(prompt: string): { command: string; args: string[] } {
    return { command: "codex", args: ["exec", prompt] };
  }
  async runTask(options: RunTaskOptions): Promise<RunTaskResult> {
    const { command, args } = this.buildCommand(options.prompt);
    return spawnAndCollect(command, args, options, (child) => (this.child = child));
  }
  supports(feature: AgentFeature): boolean {
    return ["stream_output", "cancel", "version", "task_run"].includes(feature);
  }
}

/** DeepSeek Harness Adapter（TASK-D010） */
export class DeepSeekHarnessAdapter implements AgentAdapter {
  readonly id = "dsh";
  readonly displayName = "DeepSeek Harness";
  readonly commandName = "dsh";
  readonly simulated = false;
  private child: ChildProcess | null = null;

  async detect(): Promise<DetectResult> {
    return detectCommand(this.commandName);
  }
  async getVersion(): Promise<string | null> {
    const r = await detectCommand(this.commandName);
    return r.installed ? (r.version ?? null) : null;
  }
  getInstallGuide() {
    return {
      steps: [
        "从 DeepSeek Harness 官方仓库获取安装方式（pip 或 npm，随版本而定）",
        "安装后运行 dsh --version 确认",
        "配置 DEEPSEEK_API_KEY 环境变量",
        "用 dsh --cwd 指定工作目录",
      ],
      docsUrl: "https://github.com/deepseek-ai",
    };
  }
  async openProject(_cwd: string): Promise<void> {}
  buildCommand(prompt: string): { command: string; args: string[] } {
    return { command: "dsh", args: ["run", "--prompt", prompt] };
  }
  async runTask(options: RunTaskOptions): Promise<RunTaskResult> {
    const { command, args } = this.buildCommand(options.prompt);
    return spawnAndCollect(command, args, options, (child) => (this.child = child));
  }
  supports(feature: AgentFeature): boolean {
    return ["stream_output", "cancel", "version", "task_run"].includes(feature);
  }
}

// ---- 公共实现 ----

import { spawn } from "node:child_process";

export async function detectCommand(command: string): Promise<DetectResult> {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const child = spawn(isWin ? "where" : "which", [command], { shell: false });
    let out = "";
    child.on("error", () => resolve({ installed: false, error: "检测命令不可用" }));
    child.on("close", (code) => {
      if (code !== 0) return resolve({ installed: false });
      const p = out.trim().split(/\r?\n/)[0];
      const versionChild = spawn(command, ["--version"], { shell: false });
      let vout = "";
      const collect = (d: Buffer) => (vout += d.toString());
      versionChild.stdout?.on("data", collect);
      versionChild.stderr?.on("data", collect);
      versionChild.on("error", () => resolve({ installed: true, path: p }));
      versionChild.on("close", () => {
        resolve({ installed: true, path: p, version: vout.trim().split(/\r?\n/)[0] || undefined });
      });
      setTimeout(() => {
        if (!versionChild.killed) versionChild.kill();
        resolve({ installed: true, path: p });
      }, 8000);
    });
    child.stdout?.on("data", (d: Buffer) => (out += d.toString()));
  });
}

const CANCELLED_SENTINEL = "__METIS_CANCELLED__";

async function spawnAndCollect(
  command: string,
  args: string[],
  options: RunTaskOptions,
  register: (child: ChildProcess) => void,
): Promise<RunTaskResult> {
  const start = Date.now();
  return new Promise<RunTaskResult>((resolve) => {
    let output = "";
    let cancelled = false;
    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: process.platform === "win32",
      env: process.env,
    });
    register(child);
    const onData = (stream: "stdout" | "stderr") => (d: Buffer) => {
      const text = d.toString();
      output += text;
      if (output.length > 200000) output = output.slice(-200000);
      options.onOutput?.(text, stream);
    };
    child.stdout?.on("data", onData("stdout"));
    child.stderr?.on("data", onData("stderr"));
    const onAbort = () => {
      cancelled = true;
      output += `\n[${CANCELLED_SENTINEL}] 用户取消了任务`;
      if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"]);
      else child.kill("SIGKILL");
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });
    child.on("error", (err) => {
      options.signal?.removeEventListener("abort", onAbort);
      resolve({
        exitCode: null,
        cancelled,
        durationMs: Date.now() - start,
        outputTail: (output + `\n[启动失败] ${err.message}`).slice(-4000),
      });
    });
    child.on("close", (code) => {
      options.signal?.removeEventListener("abort", onAbort);
      resolve({ exitCode: code, cancelled, durationMs: Date.now() - start, outputTail: output.slice(-4000) });
    });
  });
}
