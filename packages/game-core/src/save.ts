import type { GameState } from "./state.js";

/** 存档（C015/C016/C017）：版本化 + 迁移；槽位 ≥10 */
export const SAVE_VERSION = 1;
export const SAVE_SLOT_COUNT = 10;

export interface SaveEnvelope {
  saveVersion: number;
  contentVersion: string;
  appVersion: string;
  slot: number;
  label: string;
  savedAt: string;
  state: GameState;
}

export type Migrator = (state: Record<string, unknown>) => Record<string, unknown>;

/** 旧版本存档迁移表：新增版本时在此追加 */
export const MIGRATIONS: Record<number, Migrator> = {
  // 例：0 → 1：补默认字段
  0: (s) => ({ ...s }),
};

export function serializeSave(
  state: GameState,
  opts: { slot: number; label: string; contentVersion: string; appVersion: string },
): SaveEnvelope {
  return {
    saveVersion: SAVE_VERSION,
    contentVersion: opts.contentVersion,
    appVersion: opts.appVersion,
    slot: opts.slot,
    label: opts.label,
    savedAt: new Date().toISOString(),
    state: structuredClone(state),
  };
}

export function migrateSave(envelope: SaveEnvelope): SaveEnvelope {
  let version = envelope.saveVersion;
  let state: Record<string, unknown> = envelope.state as unknown as Record<string, unknown>;
  while (version < SAVE_VERSION) {
    const migrator = MIGRATIONS[version];
    if (!migrator) break;
    state = migrator(state);
    version += 1;
  }
  return { ...envelope, saveVersion: version, state: state as unknown as GameState };
}

export function validateSave(raw: unknown): { ok: boolean; envelope?: SaveEnvelope; error?: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "存档格式无效" };
  const e = raw as Partial<SaveEnvelope>;
  if (typeof e.saveVersion !== "number") return { ok: false, error: "缺少 saveVersion" };
  if (typeof e.state !== "object" || e.state === null) return { ok: false, error: "缺少 state" };
  const s = e.state as unknown as GameState;
  if (typeof s.campaignId !== "string" || typeof s.nums !== "object") {
    return { ok: false, error: "state 结构损坏" };
  }
  if (e.saveVersion > SAVE_VERSION) {
    return { ok: false, error: `存档版本 (${e.saveVersion}) 高于当前应用支持版本 (${SAVE_VERSION})` };
  }
  return { ok: true, envelope: migrateSave(raw as SaveEnvelope) };
}

/** 自动存档触发点（C015） */
export function shouldAutosaveOnAction(action: string): boolean {
  return ["choose", "endDay", "missionComplete", "beforeEnding"].includes(action);
}

export const AUTOSAVE_SLOT = 0;
