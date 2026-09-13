import path from "node:path";
import fs from "node:fs";

/**
 * 持久化层（TASK-D002/P003/P004）：
 * 优先 SQLite（better-sqlite3）；原生模块不可用时回退 JSON 文件（记录于 KNOWN_ISSUES）。
 * API Key 由 main 进程 safeStorage 加密后存储，此处只存密文。
 */

export interface SaveRow {
  slot: number;
  label: string;
  savedAt: string;
  payload: string;
}

export interface Storage {
  listSaves(): SaveRow[];
  getSave(slot: number): SaveRow | null;
  putSave(row: SaveRow): void;
  deleteSave(slot: number): void;
  getProfile(): string | null;
  putProfile(json: string): void;
  setProviderKey(id: string, encrypted: string): void;
  getProviderKey(id: string): string | null;
  deleteProviderKey(id: string): void;
  addRun(entry: string): void;
  listRuns(): string[];
  clearRuns(): void;
  wipe(kind: "saves" | "ai" | "history" | "all"): void;
  backend: "sqlite" | "json";
}

export function createStorage(dataDir: string): Storage {
  fs.mkdirSync(dataDir, { recursive: true });
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    return createSqlite(dataDir, Database);
  } catch {
    return createJson(dataDir);
  }
}

function createSqlite(dataDir: string, Database: new (p: string) => any): Storage {
  const db = new Database(path.join(dataDir, "metis.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS saves (slot INTEGER PRIMARY KEY, label TEXT, saved_at TEXT, payload TEXT);
    CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT);
    CREATE TABLE IF NOT EXISTS provider_keys (id TEXT PRIMARY KEY, encrypted TEXT);
    CREATE TABLE IF NOT EXISTS run_history (id INTEGER PRIMARY KEY AUTOINCREMENT, entry TEXT, created_at TEXT DEFAULT (datetime('now')));
  `);
  const stmts = {
    saves: db.prepare("SELECT slot,label,saved_at,payload FROM saves ORDER BY slot"),
    save: db.prepare("INSERT OR REPLACE INTO saves(slot,label,saved_at,payload) VALUES (?,?,?,?)"),
    get: db.prepare("SELECT slot,label,saved_at,payload FROM saves WHERE slot=?"),
    del: db.prepare("DELETE FROM saves WHERE slot=?"),
    kvGet: db.prepare("SELECT v FROM kv WHERE k=?"),
    kvPut: db.prepare("INSERT OR REPLACE INTO kv(k,v) VALUES (?,?)"),
    pkSet: db.prepare("INSERT OR REPLACE INTO provider_keys(id,encrypted) VALUES (?,?)"),
    pkGet: db.prepare("SELECT encrypted FROM provider_keys WHERE id=?"),
    pkDel: db.prepare("DELETE FROM provider_keys WHERE id=?"),
    runAdd: db.prepare("INSERT INTO run_history(entry) VALUES (?)"),
    runList: db.prepare("SELECT entry FROM run_history ORDER BY id DESC LIMIT 200"),
    runClear: db.prepare("DELETE FROM run_history"),
  };
  return {
    backend: "sqlite",
    listSaves: () => stmts.saves.all().map((r: any) => ({ slot: r.slot, label: r.label, savedAt: r.saved_at, payload: r.payload })),
    getSave: (slot) => {
      const r = stmts.get.get(slot) as any;
      return r ? { slot: r.slot, label: r.label, savedAt: r.saved_at, payload: r.payload } : null;
    },
    putSave: (row) => stmts.save.run(row.slot, row.label, row.savedAt, row.payload),
    deleteSave: (slot) => stmts.del.run(slot),
    getProfile: () => (stmts.kvGet.get("profile") as any)?.v ?? null,
    putProfile: (json) => stmts.kvPut.run("profile", json),
    setProviderKey: (id, encrypted) => stmts.pkSet.run(id, encrypted),
    getProviderKey: (id) => (stmts.pkGet.get(id) as any)?.encrypted ?? null,
    deleteProviderKey: (id) => stmts.pkDel.run(id),
    addRun: (entry) => stmts.runAdd.run(entry),
    listRuns: () => (stmts.runList.all() as any[]).map((r) => r.entry),
    clearRuns: () => stmts.runClear.run(),
    wipe: (kind) => {
      if (kind === "saves" || kind === "all") db.exec("DELETE FROM saves");
      if (kind === "ai" || kind === "all") {
        db.exec("DELETE FROM provider_keys");
        stmts.kvPut.run("providers", "[]");
      }
      if (kind === "history" || kind === "all") {
        db.exec("DELETE FROM run_history");
        stmts.kvPut.run("profile", "{}");
      }
    },
  };
}

function createJson(dataDir: string): Storage {
  const file = (n: string): string => path.join(dataDir, n);
  const read = <T>(n: string, d: T): T => {
    try {
      return JSON.parse(fs.readFileSync(file(n), "utf-8")) as T;
    } catch {
      return d;
    }
  };
  const write = (n: string, v: unknown): void => fs.writeFileSync(file(n), JSON.stringify(v, null, 2));
  const saves = (): Record<string, SaveRow> => read("saves.json", {});
  return {
    backend: "json",
    listSaves: () => Object.values(saves()).sort((a, b) => a.slot - b.slot),
    getSave: (slot) => saves()[String(slot)] ?? null,
    putSave: (row) => {
      const s = saves();
      s[String(row.slot)] = row;
      write("saves.json", s);
    },
    deleteSave: (slot) => {
      const s = saves();
      delete s[String(slot)];
      write("saves.json", s);
    },
    getProfile: () => (read<{ profile?: string }>("kv.json", {})).profile ?? null,
    putProfile: (json) => write("kv.json", { ...read<{ profile?: string }>("kv.json", {}), profile: json }),
    setProviderKey: (id, encrypted) => {
      const keys = read<Record<string, string>>("provider-keys.enc.json", {});
      keys[id] = encrypted;
      write("provider-keys.enc.json", keys);
    },
    getProviderKey: (id) => read<Record<string, string>>("provider-keys.enc.json", {})[id] ?? null,
    deleteProviderKey: (id) => {
      const keys = read<Record<string, string>>("provider-keys.enc.json", {});
      delete keys[id];
      write("provider-keys.enc.json", keys);
    },
    addRun: (entry) => {
      const runs = read<string[]>("runs.json", []);
      runs.unshift(entry);
      write("runs.json", runs.slice(0, 200));
    },
    listRuns: () => read<string[]>("runs.json", []),
    clearRuns: () => write("runs.json", []),
    wipe: (kind) => {
      if (kind === "saves" || kind === "all") write("saves.json", {});
      if (kind === "ai" || kind === "all") {
        write("provider-keys.enc.json", {});
        write("providers.json", []);
      }
      if (kind === "history" || kind === "all") {
        write("runs.json", []);
        write("kv.json", {});
      }
    },
  };
}
