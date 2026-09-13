import type { AIProvider, AIProviderConfig, ChatChunk, ChatRequest, ChatResponse, ConnectionResult } from "./types.js";
import { classifyAIError, classifyMalformed, classifyNetworkError } from "./errors.js";

/** OpenAI 兼容 Provider（TASK-D003）：/chat/completions，支持流式 */
export class OpenAICompatibleProvider implements AIProvider {
  constructor(readonly config: AIProviderConfig) {}

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
      ...(this.config.headers ?? {}),
    };
  }

  private endpoint(): string {
    const base = this.config.baseURL.replace(/\/+$/, "");
    return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
  }

  async testConnection(): Promise<ConnectionResult> {
    const start = Date.now();
    try {
      const res = await fetch(this.endpoint(), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        const body = await res.text();
        const e = classifyAIError(res.status, body);
        return { ok: false, message: e.message };
      }
      await res.json();
      return { ok: true, message: "连接成功", latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, message: classifyNetworkError(err).message };
    }
  }

  private body(req: ChatRequest, stream: boolean): string {
    return JSON.stringify({
      model: req.model ?? this.config.model,
      messages: req.messages,
      max_tokens: req.maxTokens ?? 2048,
      temperature: req.temperature ?? 0.7,
      stream,
    });
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
    let data: { choices?: { message?: { content?: string } }[]; model?: string; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    try {
      data = await res.json();
    } catch {
      throw classifyMalformed(await res.text().catch(() => ""));
    }
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw classifyMalformed(JSON.stringify(data).slice(0, 400));
    return {
      text,
      model: data.model ?? this.config.model,
      usage: data.usage
        ? { inputTokens: data.usage.prompt_tokens ?? 0, outputTokens: data.usage.completion_tokens ?? 0 }
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
        if (payload === "[DONE]") {
          yield { delta: "", done: true };
          return;
        }
        try {
          const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield { delta, done: false };
        } catch {
          // 忽略不完整分片
        }
      }
    }
    yield { delta: "", done: true };
  }
}
