import type { AIProvider, AIProviderConfig, AIProviderKind } from "./types.js";
import { OpenAICompatibleProvider } from "./openai.js";
import { AnthropicCompatibleProvider } from "./anthropic.js";
import { DeepSeekCompatibleProvider } from "./deepseek.js";

/** AI Provider Registry（TASK-D001）：增删改查/测试/默认 Provider。存储层由宿主（Electron main）注入 */
export interface ProviderStore {
  load(): Promise<Omit<AIProviderConfig, "apiKey">[]>;
  save(configs: Omit<AIProviderConfig, "apiKey">[]): Promise<void>;
}

export class ProviderRegistry {
  private configs: AIProviderConfig[] = [];
  private defaultId: string | null = null;

  constructor(private store: ProviderStore) {}

  async init(): Promise<void> {
    this.configs = (await this.store.load()).map((c) => ({ ...c, apiKey: "" }) as AIProviderConfig); // Key 不常驻内存明文——调用时注入
    this.defaultId = this.configs.find((c) => c.isDefault)?.id ?? this.configs[0]?.id ?? null;
  }

  list(): AIProviderConfig[] {
    return this.configs.map((c) => ({ ...c, apiKey: "" })); // 列表永远不回传 Key
  }

  async upsert(config: Omit<AIProviderConfig, "apiKey"> & { apiKey?: string }): Promise<void> {
    const i = this.configs.findIndex((c) => c.id === config.id);
    if (i >= 0) {
      this.configs[i] = { ...this.configs[i]!, ...config, apiKey: config.apiKey || this.configs[i]!.apiKey };
    } else {
      this.configs.push({ ...config, apiKey: config.apiKey ?? "" } as AIProviderConfig);
    }
    if (!this.defaultId) this.defaultId = this.configs[0]?.id ?? null;
    await this.persist();
  }

  async remove(id: string): Promise<void> {
    this.configs = this.configs.filter((c) => c.id !== id);
    if (this.defaultId === id) this.defaultId = this.configs[0]?.id ?? null;
    await this.persist();
  }

  async setDefault(id: string): Promise<void> {
    this.defaultId = id;
    await this.persist();
  }

  getDefaultId(): string | null {
    return this.defaultId;
  }

  private async persist(): Promise<void> {
    // Key 由主进程 safeStorage 单独加密保存，store.save 只收非敏感段
    await this.store.save(this.configs.map(({ apiKey: _apiKey, ...rest }) => rest));
  }

  create(config: AIProviderConfig): AIProvider {
    switch (config.kind) {
      case "anthropic-compatible":
        return new AnthropicCompatibleProvider(config);
      case "deepseek-compatible":
        return new DeepSeekCompatibleProvider(config);
      default:
        return new OpenAICompatibleProvider(config);
    }
  }

  get(id: string): AIProvider | null {
    const cfg = this.configs.find((c) => c.id === id);
    return cfg ? this.create(cfg) : null;
  }

  /** 主进程在安全存储解密后注入 Key（内存态） */
  attachKey(id: string, apiKey: string): void {
    const cfg = this.configs.find((c) => c.id === id);
    if (cfg) cfg.apiKey = apiKey;
  }

  kindLabel(kind: AIProviderKind): string {
    return kind === "anthropic-compatible" ? "Anthropic 兼容" : kind === "deepseek-compatible" ? "DeepSeek 兼容" : "OpenAI 兼容";
  }
}
