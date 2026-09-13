/** AI 调用错误分类（TASK-D006）：玩家看到自然语言错误 */
export type AIErrorKind =
  | "auth"
  | "model_not_found"
  | "timeout"
  | "rate_limit"
  | "network"
  | "malformed"
  | "unknown";

export class AIError extends Error {
  readonly kind: AIErrorKind;
  readonly raw?: string;

  constructor(kind: AIErrorKind, message: string, raw?: string) {
    super(message);
    this.name = "AIError";
    this.kind = kind;
    this.raw = raw;
  }
}

/** 把任意错误/响应归一化为 AIError（含自然语言说明） */
export function classifyAIError(status: number | undefined, bodyText: string): AIError {
  const t = (bodyText || "").toLowerCase();
  if (status === 401 || status === 403 || t.includes("invalid api key") || t.includes("unauthorized") || t.includes("authentication")) {
    return new AIError("auth", "API Key 无效或没有权限。请到 设置 → AI 服务 检查 Key 是否正确、是否有余额。", bodyText);
  }
  if (status === 404 || t.includes("model_not_found") || t.includes("does not exist") || t.includes("not found")) {
    return new AIError("model_not_found", "找不到这个模型。请确认模型名称拼写与服务商一致（区分大小写）。", bodyText);
  }
  if (status === 429 || t.includes("rate limit") || t.includes("too many requests")) {
    return new AIError("rate_limit", "请求太频繁或额度不足。稍等几十秒再试，或检查账户额度。", bodyText);
  }
  if (status !== undefined && status >= 500) {
    return new AIError("network", "服务商服务器暂时有问题（5xx）。等一会儿再试即可。", bodyText);
  }
  if (t.includes("timeout") || t.includes("timed out")) {
    return new AIError("timeout", "请求超时。网络不稳定或服务响应慢，可重试或换模型。", bodyText);
  }
  return new AIError("unknown", `调用失败（HTTP ${status ?? "?"}）。${bodyText.slice(0, 160)}`, bodyText);
}

export function classifyNetworkError(err: unknown): AIError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/abort/i.test(msg)) {
    return new AIError("timeout", "请求被取消或超时。", msg);
  }
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|certificate|SSL|EAI_AGAIN/i.test(msg)) {
    return new AIError("network", "连不上服务商：请检查网络、代理设置与 Base URL 是否正确。", msg);
  }
  return new AIError("unknown", `调用失败：${msg}`, msg);
}

export function classifyMalformed(bodyText: string): AIError {
  return new AIError("malformed", "服务返回了无法解析的内容。若反复出现，请检查 Base URL 是否指向了正确的兼容接口。", bodyText);
}
