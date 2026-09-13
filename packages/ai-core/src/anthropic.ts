import type { AIProvider, AIProviderConfig, ChatChunk, ChatRequest, ChatResponse, ConnectionResult } from "./types.js";
import { classifyAIError, classifyMalformed, classifyNetworkError } from "./errors.js";

/** Anthropic 兼容 Provider（TASK-D004）：/v1/messages，独立协议与错误面 */
export class AnthropicCompatibleProvider implements AIProvider {
  constructor(readonly config: AIProviderConfig) {}

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.config.apiKey,
      "anthropic-version": "2023-06-01",
      ...(this.config.headers ?? {}),
    };
  }

  private endpoint(): string {
    const base = this.config.baseURL.replace(/\/+$/, "");
    return base.endsWith("/v1/messages") ? base : `${base}/v1/messages`;
  }

  private body(req: ChatRequest, stream: boolean): string {
    const system = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const messages = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    return JSON.stringify({
      model: req.model ?? this.config.model,
      max_tokens: req.maxTokens ?? 2048,
      temperature: req.temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages,
      stream,
    });
  }

  async testConnection(): Promise<ConnectionResult> {
    const start = Date.now();
    try {
      const res = await fetch(this.endpoint(), {
        method: "POST",
        headers: this.headers(),
        body: this.body({ messages: [{ role: "user", content: "ping" }], maxTokens: 5 }, false),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        return { ok: false, message: classifyAIError(res.status, await res.text()).message };
      }
      await res.json();
      return { ok: true, message: "连接成功", latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, message: classifyNetworkError(err).message };
    }
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    let res: Response;
    try {
      res = await fetch(this.endpoint(), {
        method: "POST",
        headers: this.headers(),
        body: this.body(req, false),
        signal: req.signal ?? AbortSignal.timeout(120000),
      });
    } catch (err) {
      throw classifyNetworkError(err);
    }
    if (!res.ok) throw classifyAIError(res.status, await res.text());
    let data: { content?: { type: string; text?: string }[]; model?: string; usage?: { input_tokens?: number; output_tokens?: number } };
    try {
      data = await res.json();
    } catch {
      throw classifyMalformed(await res.text().catch(() => ""));
    }
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    if (!text) throw classifyMalformed(JSON.stringify(data).slice(0, 400));
    return {
      text,
      model: data.model ?? this.config.model,
      usage: data.usage
        ? { inputTokens: data.usage.input_tokens ?? 0, outputTokens: data.usage.output_tokens ?? 0 }
        : undefined,
    };
  }

  async *stream(req: ChatRequest): AsyncIterable<ChatChunk> {
    let res: Response;
    try {
      res = await fetch(this.endpoint(), {
        method: "POST",
        headers: this.headers(),
        body: this.body(req, true),
        signal: req.signal ?? AbortSignal.timeout(180000),
      });
    } catch (err) {
      throw classifyNetworkError(err);
    }
    if (!res.ok) throw classifyAIError(res.status, await res.text());
    if (!res.body) throw classifyMalformed("(empty stream)");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        try {
          const json = JSON.parse(payload) as { type?: string; delta?: { type?: string; text?: string } };
          if (json.type === "content_block_delta" && json.delta?.text) {
            yield { delta: json.delta.text, done: false };
          }
          if (json.type === "message_stop") {
            yield { delta: "", done: true };
            return;
          }
        } catch {
          // 忽略不完整分片
        }
      }
    }
    yield { delta: "", done: true };
  }
}
