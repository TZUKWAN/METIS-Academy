export type AIProviderKind = "openai-compatible" | "anthropic-compatible" | "deepseek-compatible";

export interface ConnectionResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface ChatResponse {
  text: string;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface ChatChunk {
  delta: string;
  done: boolean;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  kind: AIProviderKind;
  baseURL: string;
  apiKey: string; // 运行时注入，禁止落盘明文
  model: string;
  headers?: Record<string, string>;
  isDefault?: boolean;
}

export interface AIProvider {
  readonly config: AIProviderConfig;
  testConnection(): Promise<ConnectionResult>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  stream(request: ChatRequest): AsyncIterable<ChatChunk>;
}

export const DEFAULT_MODELS: Record<AIProviderKind, string> = {
  "openai-compatible": "gpt-4o-mini",
  "anthropic-compatible": "claude-3-5-haiku-latest",
  "deepseek-compatible": "deepseek-chat",
};

export const DEFAULT_BASE_URLS: Record<AIProviderKind, string> = {
  "openai-compatible": "https://api.openai.com/v1",
  "anthropic-compatible": "https://api.anthropic.com",
  "deepseek-compatible": "https://api.deepseek.com",
};
