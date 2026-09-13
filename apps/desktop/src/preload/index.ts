import { contextBridge, ipcRenderer } from "electron";

/** Preload：以 contextBridge 暴露受限 API（TASK-A004：renderer 不可直接调用 Node） */
const api = {
  app: {
    versions: () => ipcRenderer.invoke("app:versions"),
    dataDir: () => ipcRenderer.invoke("app:dataDir"),
    storageBackend: () => ipcRenderer.invoke("app:storageBackend"),
    reset: (kind: "saves" | "ai" | "history" | "all") => ipcRenderer.invoke("app:reset", kind),
  },
  dialog: {
    chooseDirectory: () => ipcRenderer.invoke("dialog:chooseDirectory"),
    isAllowed: (cwd: string) => ipcRenderer.invoke("dialog:isAllowed", cwd),
  },
  saves: {
    list: () => ipcRenderer.invoke("saves:list"),
    put: (row: { slot: number; label: string; savedAt: string; payload: string }) => ipcRenderer.invoke("saves:put", row),
    get: (slot: number) => ipcRenderer.invoke("saves:get", slot),
    delete: (slot: number) => ipcRenderer.invoke("saves:delete", slot),
  },
  profile: {
    get: () => ipcRenderer.invoke("profile:get"),
    put: (json: string) => ipcRenderer.invoke("profile:put", json),
  },
  providers: {
    list: () => ipcRenderer.invoke("providers:list"),
    upsert: (cfg: unknown) => ipcRenderer.invoke("providers:upsert", cfg),
    remove: (id: string) => ipcRenderer.invoke("providers:remove", id),
    setDefault: (id: string) => ipcRenderer.invoke("providers:setDefault", id),
    test: (id: string) => ipcRenderer.invoke("providers:test", id),
  },
  ai: {
    chat: (req: { providerId?: string; messages: { role: string; content: string }[]; maxTokens?: number }) =>
      ipcRenderer.invoke("ai:chat", req),
    stream: (req: { reqId: string; providerId?: string; messages: { role: string; content: string }[] }) =>
      ipcRenderer.invoke("ai:stream", req),
    onChunk: (cb: (p: { reqId: string; delta: string; done: boolean }) => void) => {
      const listener = (_e: unknown, p: { reqId: string; delta: string; done: boolean }): void => cb(p);
      ipcRenderer.on("ai:stream:chunk", listener);
      return () => ipcRenderer.removeListener("ai:stream:chunk", listener);
    },
    onStreamError: (cb: (p: { reqId: string; error: string }) => void) => {
      const listener = (_e: unknown, p: { reqId: string; error: string }): void => cb(p);
      ipcRenderer.on("ai:stream:error", listener);
      return () => ipcRenderer.removeListener("ai:stream:error", listener);
    },
  },
  cli: {
    list: () => ipcRenderer.invoke("cli:list"),
    run: (req: { runId: string; adapterId: string; cwd: string; prompt: string }) => ipcRenderer.invoke("cli:run", req),
    cancel: (runId: string) => ipcRenderer.invoke("cli:cancel", runId),
    history: () => ipcRenderer.invoke("cli:history"),
    clearHistory: () => ipcRenderer.invoke("cli:clearHistory"),
    onOutput: (cb: (p: { runId: string; chunk: string }) => void) => {
      const listener = (_e: unknown, p: { runId: string; chunk: string }): void => cb(p);
      ipcRenderer.on("cli:output", listener);
      return () => ipcRenderer.removeListener("cli:output", listener);
    },
    onDone: (cb: (p: { runId: string; exitCode: number | null; cancelled: boolean; durationMs: number }) => void) => {
      const listener = (_e: unknown, p: { runId: string; exitCode: number | null; cancelled: boolean; durationMs: number }): void => cb(p);
      ipcRenderer.on("cli:done", listener);
      return () => ipcRenderer.removeListener("cli:done", listener);
    },
  },
};

contextBridge.exposeInMainWorld("metis", api);

export type MetisApi = typeof api;
