import type { AIProviderConfig } from "./types.js";
import { DEFAULT_BASE_URLS } from "./types.js";
import { OpenAICompatibleProvider } from "./openai.js";

/**
 * DeepSeek 兼容 Provider（TASK-D005）。
 * DeepSeek 官方接口是 OpenAI 兼容协议（/chat/completions），支持官方与自定义 base URL。
 */
export class DeepSeekCompatibleProvider extends OpenAICompatibleProvider {
  constructor(config: AIProviderConfig) {
    super({
      ...config,
      baseURL: config.baseURL?.trim() ? config.baseURL : DEFAULT_BASE_URLS["deepseek-compatible"],
    });
  }
}
