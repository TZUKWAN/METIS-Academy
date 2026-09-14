export interface MetisApi {
  app: {
    versions: () => Promise<{ app: string; electron: string; chrome: string; node: string; content: string }>;
    dataDir: () => Promise<string>;
    storageBackend: () => Promise<"sqlite" | "json">;
    reset: (kind: "saves" | "ai" | "history" | "all") => Promise<boolean>;
  };
  dialog: {
    chooseDirectory: () => Promise<string | null>;
    isAllowed: (cwd: string) => Promise<boolean>;
  };
  saves: {
    list: () => Promise<{ slot: number; label: string; savedAt: string; payload: string }[]>;
    put: (row: { slot: number; label: string; savedAt: string; payload: string }) => Promise<boolean>;
    get: (slot: number) => Promise<{ slot: number; label: string; savedAt: string; payload: string } | null>;
    delete: (slot: number) => Promise<boolean>;
  };
  profile: {
    get: () => Promise<string | null>;
    put: (json: string) => Promise<boolean>;
  };
  providers: {
    list: () => Promise<ProviderCfg[]>;
    upsert: (cfg: ProviderCfg & { apiKey?: string }) => Promise<{ ok: boolean; error?: string }>;
    remove: (id: string) => Promise<boolean>;
    setDefault: (id: string) => Promise<boolean>;
    test: (id: string) => Promise<{ ok: boolean; message: string; latencyMs?: number }>;
  };
  ai: {
    chat: (req: { providerId?: string; messages: { role: string; content: string }[]; maxTokens?: number }) => Promise<{ ok: boolean; text?: string; error?: string }>;
    stream: (req: { reqId: string; providerId?: string; messages: { role: string; content: string }[] }) => Promise<boolean>;
    onChunk: (cb: (p: { reqId: string; delta: string; done: boolean }) => void) => () => void;
    onStreamError: (cb: (p: { reqId: string; error: string }) => void) => () => void;
  };
  cli: {
    list: () => Promise<CliInfo[]>;
    run: (req: { runId: string; adapterId: string; cwd: string; prompt: string }) => Promise<{ ok: boolean; error?: string }>;
    cancel: (runId: string) => Promise<boolean>;
    history: () => Promise<RunRecord[]>;
    clearHistory: () => Promise<boolean>;
    onOutput: (cb: (p: { runId: string; chunk: string }) => void) => () => void;
    onDone: (cb: (p: { runId: string; exitCode: number | null; cancelled: boolean; durationMs: number }) => void) => () => void;
  };
}

export interface ProviderCfg {
  id: string;
  name: string;
  kind: "openai-compatible" | "anthropic-compatible" | "deepseek-compatible";
  baseURL: string;
  model: string;
  isDefault?: boolean;
  apiKey?: string;
}

export interface CliInfo {
  id: string;
  displayName: string;
  simulated: boolean;
  installed: boolean;
  version: string | null;
  guide: { steps: string[]; docsUrl: string };
}

export interface RunRecord {
  id: string;
  tool: string;
  simulated: boolean;
  task: string;
  cwd: string;
  startedAt: string;
  endedAt: string;
  exitCode: number | null;
  resultSummary: string;
}

declare global {
  interface Window {
    metis?: MetisApi;
  }
}

export function metis(): MetisApi {
  if (!window.metis) throw new Error("METIS API 不可用（preload 未加载）");
  return window.metis;
}


// ===== 浏览器模式 Mock（无 Electron 时自动启用） =====
function createBrowserMock(): MetisApi {
  const noop = () => Promise.resolve(undefined as never);
  const saves: Record<number, { slot: number; label: string; savedAt: string; payload: string }> = {};
  return {
    app: {
      versions: () => Promise.resolve({ app: 'browser-dev', electron: 'browser', chrome: 'browser', node: 'browser', content: '1.0.0' }),
      dataDir: () => Promise.resolve('/tmp/metis-browser'),
      storageBackend: () => Promise.resolve('json' as const),
      reset: () => Promise.resolve(true),
    },
    dialog: {
      chooseDirectory: () => Promise.resolve('/tmp/mock-project'),
      isAllowed: () => Promise.resolve(true),
    },
    saves: {
      list: () => Promise.resolve(Object.values(saves)),
      put: (row: { slot: number; label: string; savedAt: string; payload: string }) => { saves[row.slot] = row; return Promise.resolve(true); },
      get: (slot: number) => Promise.resolve(saves[slot] ?? null),
      delete: (slot: number) => { delete saves[slot]; return Promise.resolve(true); },
    },
    profile: {
      get: () => Promise.resolve(null),
      put: () => Promise.resolve(true),
    },
    providers: {
      list: () => Promise.resolve([]),
      upsert: () => Promise.resolve({ ok: true }),
      remove: () => Promise.resolve(true),
      setDefault: () => Promise.resolve(true),
      test: () => Promise.resolve({ ok: false, message: '浏览器模式不支持真实 API 调用' }),
    },
    ai: {
      chat: () => Promise.resolve({ ok: false, error: '浏览器模式不支持 AI 调用' }),
      stream: () => Promise.resolve(false),
      onChunk: () => () => {},
      onStreamError: () => () => {},
    },
    cli: {
      list: () => Promise.resolve([
        { id: 'claude-code-sim', displayName: 'Claude Code（教学模拟）', simulated: true, installed: true, version: 'sim', guide: { steps: [], docsUrl: '' } },
        { id: 'codex-sim', displayName: 'Codex CLI（教学模拟）', simulated: true, installed: true, version: 'sim', guide: { steps: [], docsUrl: '' } },
      ]),
      run: () => Promise.resolve({ ok: true }),
      cancel: () => Promise.resolve(true),
      history: () => Promise.resolve([]),
      clearHistory: () => Promise.resolve(true),
      onOutput: () => () => {},
      onDone: () => () => {},
    },
  } as unknown as MetisApi;
}

// 自动检测：如果是浏览器环境（无 Electron preload），使用 mock
if (typeof window !== 'undefined' && !window.metis) {
  (window as unknown as { metis: MetisApi }).metis = createBrowserMock();
}
