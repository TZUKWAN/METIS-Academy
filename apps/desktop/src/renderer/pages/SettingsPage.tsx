import { useEffect, useState } from "react";
import { Plus, Trash2, PlugZap, RefreshCw, AlertTriangle } from "lucide-react";
import { metis, type ProviderCfg, type CliInfo } from "../api.js";
import { useGame } from "../store.js";
import { SavesModal } from "./HomePage.js";
import { refreshBGM, setVolume as setAudioVolume, setAudioEnabled } from "../audio.js";

/** 设置页：AI Provider / Agent CLI / 外观 / 字体 / 音量 / 存档 / 数据目录 / 隐私 */
export function SettingsPage(): React.JSX.Element {
  const [providers, setProviders] = useState<ProviderCfg[]>([]);
  const [clis, setClis] = useState<CliInfo[]>([]);
  const [versions, setVersions] = useState<{ app: string; electron: string; content: string } | null>(null);
  const [dataDir, setDataDir] = useState("");
  const [backend, setBackend] = useState<"sqlite" | "json">("json");
  const [showSaves, setShowSaves] = useState(false);
  const [fontScale, setFontScale] = useState(100);
  const [volume, setVolume] = useState(60);
  const [editing, setEditing] = useState<Partial<ProviderCfg> & { apiKey?: string } | null>(null);
  const { showToast } = useGame();

  const refresh = (): void => {
    metis()
      .providers.list()
      .then((list) => setProviders(list.map((p) => ({ ...p, apiKey: "" }))))
      .catch(() => undefined);
    metis()
      .cli.list()
      .then(setClis)
      .catch(() => undefined);
  };

  useEffect(() => {
    refresh();
    void metis().app.versions().then(setVersions);
    void metis().app.dataDir().then(setDataDir);
    void metis().app.storageBackend().then(setBackend);
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-5 font-serif text-2xl font-bold">设置</h1>

      {/* AI Provider（D001-D006） */}
      <section className="card mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-paper-400">AI 服务（Provider）</h2>
          <button
            className="btn-primary text-xs"
            onClick={() =>
              setEditing({ kind: "openai-compatible", name: "新 Provider", baseURL: "", model: "", apiKey: "", id: `p_${Date.now().toString(36)}` })
            }
          >
            <Plus size={13} /> 添加
          </button>
        </div>
        <p className="mb-3 text-xs text-paper-400">
          API Key 通过系统安全存储加密保存，绝不写入明文文件或日志。未配置任何 Provider 时，游戏所有主线均可完整游玩。
        </p>
        <div className="space-y-2">
          {providers.length === 0 && <p className="text-sm text-paper-400">尚未配置。三条主线无需 AI 也可完整体验。</p>}
          {providers.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {p.name} {p.isDefault && <span className="tag ml-1 bg-accent/20 text-accent">默认</span>}
                </p>
                <p className="truncate text-xs text-paper-400">
                  {p.kind} · {p.model} · {p.baseURL}
                </p>
              </div>
              <button
                className="btn-ghost text-xs"
                onClick={async () => {
                  showToast("测试连接中…");
                  const r = await metis().providers.test(p.id);
                  showToast(r.ok ? `连接成功（${r.latencyMs ?? "?"}ms）` : `失败：${r.message}`);
                  setTimeout(() => useGame.getState().showToast(null), 4000);
                }}
              >
                <PlugZap size={13} /> 测试
              </button>
              {!p.isDefault && (
                <button className="btn-ghost text-xs" onClick={() => void metis().providers.setDefault(p.id).then(refresh)}>
                  设为默认
                </button>
              )}
              <button className="btn-ghost text-xs" onClick={() => setEditing({ ...p, apiKey: "" })}>
                编辑
              </button>
              <button className="btn-ghost text-xs text-rose" onClick={() => void metis().providers.remove(p.id).then(refresh)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CLI Agent */}
      <section className="card mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-paper-400">Agent CLI 工具</h2>
          <button className="btn-outline text-xs" onClick={refresh}>
            <RefreshCw size={13} /> 重新检测
          </button>
        </div>
        <div className="space-y-2">
          {clis.map((c) => (
            <div key={c.id} className="rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${c.installed ? "bg-mint" : c.simulated ? "bg-amber" : "bg-rose"}`} />
                <span className="font-medium">{c.displayName}</span>
                {c.simulated ? (
                  <span className="tag bg-amber/20 text-amber">教学模拟（始终可用）</span>
                ) : c.installed ? (
                  <span className="tag">已安装 {c.version}</span>
                ) : (
                  <span className="tag bg-rose/20 text-rose">未安装</span>
                )}
              </div>
              {!c.simulated && !c.installed && (
                <div className="mt-2 text-xs leading-relaxed text-paper-400">
                  <p className="mb-1 font-semibold text-paper-200">官方推荐安装方式：</p>
                  {c.guide.steps.map((s, i) => (
                    <p key={i}>
                      {i + 1}. {s}
                    </p>
                  ))}
                  <p className="mt-1">安装完成后点上方"重新检测"。本游戏不会假装安装成功——检测不到就是没有。</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 外观 / 音频 */}
      <section className="card mb-4 grid grid-cols-2 gap-6">
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-paper-400">外观与字体</h2>
          <label className="text-xs text-paper-400">界面缩放 {fontScale}%</label>
          <input type="range" min={90} max={130} value={fontScale} onChange={(e) => setFontScale(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-paper-400">音量（可关闭，O004）</h2>
          <label className="text-xs text-paper-400">音效音量 {volume}%</label>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => { const v = Number(e.target.value); setVolume(v); setAudioEnabled(v > 0); setAudioVolume(v); refreshBGM(); }}
            className="w-full"
          />
          <p className="mt-1 text-[11px] text-paper-400">音效由合成器实时生成，0 = 完全静音。</p>
        </div>
      </section>

      {/* 存档 / 数据 / 隐私 */}
      <section className="card mb-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-paper-400">存档与数据</h2>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <button className="btn-outline text-xs" onClick={() => setShowSaves(true)}>
            管理存档（10 槽位 + 自动存档）
          </button>
          <span className="tag">数据目录：{dataDir}</span>
          <span className="tag">存储后端：{backend === "sqlite" ? "SQLite" : "JSON（回退）"}</span>
          <span className="tag">
            版本：app {versions?.app} · content {versions?.content}
          </span>
        </div>
        <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold text-rose">
          <AlertTriangle size={13} /> 数据清除（P004，不可恢复）
        </h3>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["saves", "删除全部存档"],
              ["ai", "删除 AI 配置与密钥"],
              ["history", "删除运行历史与档案"],
              ["all", "完全重置"],
            ] as const
          ).map(([kind, label]) => (
            <button
              key={kind}
              className="btn-outline text-xs text-rose hover:border-rose"
              onClick={() => {
                if (confirm(`确认：${label}？此操作不可恢复。`)) {
                  void metis().app.reset(kind).then(() => {
                    showToast("已完成");
                    refresh();
                  });
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-paper-400">
          隐私：本游戏不记录 API Key、不记录你的敏感文件内容；日志只包含任务摘要与退出码。
        </p>
      </section>

      {editing && (
        <ProviderEditor
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={async (cfg) => {
            const r = await metis().providers.upsert(cfg);
            if (!r.ok) {
              showToast(r.error ?? "保存失败");
              setTimeout(() => useGame.getState().showToast(null), 5000);
            } else {
              showToast("已保存（Key 已加密存储）");
              setTimeout(() => useGame.getState().showToast(null), 2500);
            }
            setEditing(null);
            refresh();
          }}
        />
      )}
      {showSaves && <SavesModal onClose={() => setShowSaves(false)} />}
    </div>
  );
}

function ProviderEditor({
  draft,
  onClose,
  onSave,
}: {
  draft: Partial<ProviderCfg> & { apiKey?: string };
  onClose: () => void;
  onSave: (cfg: ProviderCfg & { apiKey?: string }) => void;
}): React.JSX.Element {
  const [cfg, setCfg] = useState(draft);
  const set = (k: string, v: string): void => setCfg((c) => ({ ...c, [k]: v }));
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="card w-[480px]" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 font-serif text-lg font-bold">{draft.name === "新 Provider" ? "添加 AI 服务" : "编辑 AI 服务"}</h3>
        <div className="space-y-2 text-sm">
          <input className="input" placeholder="名称（如：DeepSeek 官方）" value={cfg.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          <select className="input" value={cfg.kind} onChange={(e) => set("kind", e.target.value)}>
            <option value="openai-compatible">OpenAI 兼容</option>
            <option value="anthropic-compatible">Anthropic 兼容</option>
            <option value="deepseek-compatible">DeepSeek 兼容</option>
          </select>
          <input className="input" placeholder="Base URL（留空=官方地址；中转填兼容地址）" value={cfg.baseURL ?? ""} onChange={(e) => set("baseURL", e.target.value)} />
          <input className="input" placeholder="模型名（与服务商完全一致）" value={cfg.model ?? ""} onChange={(e) => set("model", e.target.value)} />
          <input className="input" type="password" placeholder="API Key（加密存储，留空=不修改）" value={cfg.apiKey ?? ""} onChange={(e) => set("apiKey", e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button
            className="btn-primary"
            onClick={() =>
              onSave({
                id: cfg.id!,
                name: cfg.name || "未命名",
                kind: (cfg.kind ?? "openai-compatible") as ProviderCfg["kind"],
                baseURL: cfg.baseURL ?? "",
                model: cfg.model || "gpt-4o-mini",
                apiKey: cfg.apiKey,
                isDefault: cfg.isDefault,
              })
            }
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
