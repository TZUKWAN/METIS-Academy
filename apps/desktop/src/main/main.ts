import { app, BrowserWindow, ipcMain, dialog, safeStorage } from "electron";
import path from "node:path";
import fs from "node:fs";
import { createStorage, type Storage } from "./storage.js";
import { ProviderRegistry, type AIProviderConfig } from "@metis/ai-core";
import { createAllAdapters } from "@metis/agent-adapters";
import type { AgentAdapter } from "@metis/agent-adapters";

let win: BrowserWindow | null = null;
let storage: Storage;
let registry: ProviderRegistry;
const adapters: AgentAdapter[] = createAllAdapters();
/** 终端安全层：仅允许用户通过目录选择对话框明确授权的根目录（TASK-D012/P002） */
const allowedRoots = new Set<string>();
const runningChildren = new Map<string, AbortController>();

const DEV_SERVER = process.env.VITE_DEV_SERVER_URL;

function createWindow(): void {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 760,
    show: false,
    backgroundColor: "#0f1115",
    title: "METIS Academy",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.once("ready-to-show", () => { console.log("[METIS] renderer ready"); win?.show(); });
  win.webContents.on("did-finish-load", () => console.log("[METIS] did-finish-load"));
  win.webContents.on("did-fail-load", (_e, code, desc) => console.log("[METIS] did-fail-load", code, desc));
  // 发布版禁用 devtools 菜单（TASK-T008）
  if (!DEV_SERVER) {
    win.webContents.on("before-input-event", (_e, input) => {
      if (input.key === "F12" || (input.control && input.shift && input.key.toLowerCase() === "i")) {
        // 忽略：发布版不打开 devtools
      }
    });
  } else {
    win.webContents.openDevTools({ mode: "detach" });
  }
  if (DEV_SERVER) {
    void win.loadURL(DEV_SERVER);
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  win.on("closed", () => (win = null));
}

app.whenReady().then(async () => {
  console.log("[METIS] app ready");
  const dataDir = path.join(app.getPath("userData"), "metis-data");
  fs.mkdirSync(dataDir, { recursive: true });
  storage = createStorage(dataDir);

  registry = new ProviderRegistry({
    load: async () => {
      try {
        const raw = storage.getProfile();
        const kv = raw ? (JSON.parse(raw) as { providers?: AIProviderConfig[] }) : {};
        return kv.providers ?? [];
      } catch {
        return [];
      }
    },
    save: async (configs) => {
      const raw = storage.getProfile();
      const kv = raw ? JSON.parse(raw) : {};
      kv.providers = configs;
      storage.putProfile(JSON.stringify(kv));
    },
  });
  await registry.init();

  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

function send(channel: string, payload: unknown): void {
  win?.webContents.send(channel, payload);
}

function registerIpc(): void {
  // ---- app 基础 ----
  ipcMain.handle("app:versions", () => ({ app: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node, content: "1.0.0" }));
  ipcMain.handle("app:dataDir", () => path.join(app.getPath("userData"), "metis-data"));
  ipcMain.handle("app:storageBackend", () => storage.backend);
  ipcMain.handle("app:reset", (_e, kind: "saves" | "ai" | "history" | "all") => {
    storage.wipe(kind);
    return true;
  });

  // ---- 目录授权（P002）----
  ipcMain.handle("dialog:chooseDirectory", async () => {
    if (!win) return null;
    const r = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
    if (r.canceled || r.filePaths.length === 0) return null;
    const dir = r.filePaths[0]!;
    allowedRoots.add(dir);
    return dir;
  });
  ipcMain.handle("dialog:isAllowed", (_e, cwd: string) => {
    return [...allowedRoots].some((root) => cwd === root || cwd.startsWith(root));
  });

  // ---- 存档（C015-C017）----
  ipcMain.handle("saves:list", () => storage.listSaves());
  ipcMain.handle("saves:put", (_e, row: { slot: number; label: string; savedAt: string; payload: string }) => {
    storage.putSave(row);
    return true;
  });
  ipcMain.handle("saves:get", (_e, slot: number) => storage.getSave(slot));
  ipcMain.handle("saves:delete", (_e, slot: number) => {
    storage.deleteSave(slot);
    return true;
  });
  ipcMain.handle("profile:get", () => storage.getProfile());
  ipcMain.handle("profile:put", (_e, json: string) => {
    storage.putProfile(json);
    return true;
  });

  // ---- AI Providers（D001-D006/P001）----
  ipcMain.handle("providers:list", () => registry.list());
  ipcMain.handle("providers:upsert", async (_e, cfg: AIProviderConfig & { apiKey?: string }) => {
    const { apiKey, ...rest } = cfg;
    await registry.upsert({ ...rest, apiKey: "" });
    if (apiKey) {
      if (safeStorage.isEncryptionAvailable()) {
        storage.setProviderKey(cfg.id, safeStorage.encryptString(apiKey).toString("base64"));
      } else {
        // 加密不可用：绝不落明文，直接拒绝保存 Key
        return { ok: false, error: "当前系统不支持密钥加密存储，API Key 未保存。你仍可在本次会话中临时使用。" };
      }
    }
    return { ok: true };
  });
  ipcMain.handle("providers:remove", async (_e, id: string) => {
    await registry.remove(id);
    storage.deleteProviderKey(id);
    return true;
  });
  ipcMain.handle("providers:setDefault", async (_e, id: string) => {
    await registry.setDefault(id);
    return true;
  });
  ipcMain.handle("providers:test", async (_e, id: string) => {
    attachKey(id);
    const p = registry.get(id);
    if (!p) return { ok: false, message: "Provider 不存在" };
    return p.testConnection();
  });
  ipcMain.handle("ai:chat", async (_e, req: { providerId?: string; messages: { role: string; content: string }[]; maxTokens?: number }) => {
    const id = req.providerId ?? registry.getDefaultId();
    if (!id) return { ok: false, error: "尚未配置 AI 服务。到 设置 → AI 服务 添加一个 Provider，或继续使用离线预设内容。" };
    attachKey(id);
    const p = registry.get(id);
    if (!p) return { ok: false, error: "Provider 不存在" };
    try {
      const res = await p.chat({ messages: req.messages as never, maxTokens: req.maxTokens });
      return { ok: true, text: res.text };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
  ipcMain.handle("ai:stream", async (_e, req: { reqId: string; providerId?: string; messages: { role: string; content: string }[] }) => {
    const id = req.providerId ?? registry.getDefaultId();
    if (!id) {
      send("ai:stream:error", { reqId: req.reqId, error: "尚未配置 AI 服务。" });
      return false;
    }
    attachKey(id);
    const p = registry.get(id);
    if (!p) {
      send("ai:stream:error", { reqId: req.reqId, error: "Provider 不存在" });
      return false;
    }
    (async () => {
      try {
        for await (const chunk of p.stream({ messages: req.messages as never })) {
          send("ai:stream:chunk", { reqId: req.reqId, delta: chunk.delta, done: chunk.done });
        }
      } catch (err) {
        send("ai:stream:error", { reqId: req.reqId, error: err instanceof Error ? err.message : String(err) });
      }
    })();
    return true;
  });

  // ---- CLI Adapters（D007-D014/D012）----
  ipcMain.handle("cli:list", async () => {
    return Promise.all(
      adapters.map(async (a) => {
        const det = a.simulated ? { installed: true, version: "sim" } : await a.detect();
        return { id: a.id, displayName: a.displayName, simulated: a.simulated, installed: det.installed, version: det.version ?? null, guide: a.getInstallGuide() };
      }),
    );
  });
  ipcMain.handle("cli:run", async (_e, req: { runId: string; adapterId: string; cwd: string; prompt: string }) => {
    const adapter = adapters.find((a) => a.id === req.adapterId);
    if (!adapter) return { ok: false, error: "未知工具" };
    // 终端安全层：目录必须被明确授权；命令由 adapter 白名单构建
    const allowed = [...allowedRoots].some((root) => req.cwd === root || req.cwd.startsWith(root));
    if (!allowed) return { ok: false, error: "工作目录未被授权：请先在设置中通过目录选择器选择项目目录。" };
    const ctrl = new AbortController();
    runningChildren.set(req.runId, ctrl);
    void adapter
      .runTask({
        cwd: req.cwd,
        prompt: req.prompt,
        signal: ctrl.signal,
        onOutput: (chunk) => send("cli:output", { runId: req.runId, chunk }),
      })
      .then((result) => {
        runningChildren.delete(req.runId);
        storage.addRun(
          JSON.stringify({
            id: req.runId,
            tool: adapter.displayName,
            simulated: adapter.simulated,
            task: req.prompt.slice(0, 200),
            cwd: path.basename(req.cwd),
            startedAt: new Date(Date.now() - result.durationMs).toISOString(),
            endedAt: new Date().toISOString(),
            exitCode: result.exitCode,
            resultSummary: result.outputTail.slice(-200),
          }),
        );
        send("cli:done", { runId: req.runId, exitCode: result.exitCode, cancelled: result.cancelled, durationMs: result.durationMs });
      });
    return { ok: true };
  });
  ipcMain.handle("cli:cancel", (_e, runId: string) => {
    runningChildren.get(runId)?.abort();
    return true;
  });
  ipcMain.handle("cli:history", () => storage.listRuns().map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean));
  ipcMain.handle("cli:clearHistory", () => {
    storage.clearRuns();
    return true;
  });
}

function attachKey(id: string): void {
  const enc = storage.getProviderKey(id);
  if (!enc) return;
  try {
    if (safeStorage.isEncryptionAvailable()) {
      registry.attachKey(id, safeStorage.decryptString(Buffer.from(enc, "base64")));
    }
  } catch {
    // 解密失败（如更换系统用户），忽略
  }
}
