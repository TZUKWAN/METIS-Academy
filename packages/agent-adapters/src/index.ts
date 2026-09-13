export * from "./adapters.js";
export * from "./simulated.js";

import type { AgentAdapter } from "./adapters.js";
import { ClaudeCodeAdapter, CodexAdapter, DeepSeekHarnessAdapter } from "./adapters.js";
import { SimulatedClaudeCodeAdapter, SimulatedCodexAdapter, SimulatedDeepSeekHarnessAdapter } from "./simulated.js";

export function createAllAdapters(): AgentAdapter[] {
  return [
    new ClaudeCodeAdapter(),
    new CodexAdapter(),
    new DeepSeekHarnessAdapter(),
    new SimulatedClaudeCodeAdapter(),
    new SimulatedCodexAdapter(),
    new SimulatedDeepSeekHarnessAdapter(),
  ];
}
