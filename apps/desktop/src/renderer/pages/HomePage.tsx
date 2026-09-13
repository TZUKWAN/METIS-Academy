import { useEffect, useState } from "react";
import { Plus, Play, Trophy, Save, FolderOpen } from "lucide-react";
import { useGame } from "../store.js";
import { metis } from "../api.js";

/** 首页：当前角色/主线/任务、继续游戏、三条 campaign、最近资产、已发现 endings、存档 */
export function HomePage(): React.JSX.Element {
  const { index, state, profile, newGame, setPage, loadFrom } = useGame();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [savesOpen, setSavesOpen] = useState(false);

  const campaigns = [...index.campaigns.values()];
  const recentAssets = state ? state.assets.slice(-4).reverse() : [];
  const currentMission =
    state && state.currentMissionId ? index.missions.get(state.currentMissionId) : null;
  const currentCampaign = state ? index.campaigns.get(state.campaignId) : null;

  return (
    <div className="h-full overflow-y-auto p-6">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">METIS Academy</h1>
          <p className="text-sm text-paper-400">在真实任务里，学会让 Agent 真正为你工作。</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => setSavesOpen(true)}>
            <Save size={15} /> 存档
          </button>
          {state && !state.ended && (
            <button className="btn-primary" onClick={() => setPage("story")}>
              <Play size={15} /> 继续游戏
            </button>
          )}
        </div>
      </header>

      {/* 当前进行中 */}
      {state && !state.ended && (
        <section className="glass mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-paper-400">当前进行中</p>
              <p className="text-lg font-semibold">
                {state.characterName} · {currentCampaign?.title ?? state.campaignId}
              </p>
              <p className="text-sm text-paper-400">
                第 {state.nums["day"]} 天 · 当前任务：{currentMission?.title ?? "（无）"}
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <Stat label="行动点" value={state.nums["actionPoints"] ?? 0} />
              <Stat label="资金" value={`¥${Math.round(state.nums["money"] ?? 0)}`} />
              <Stat label="资产" value={state.assets.length} />
              <Stat label="知识卡" value={state.knowledge.length} />
            </div>
          </div>
        </section>
      )}

      {/* 三条主线 */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-paper-400">三条主线</h2>
        <div className="grid grid-cols-3 gap-4">
          {campaigns.map((c) => {
            const completed = profile.completedCampaigns.includes(c.id);
            const endingsFound = profile.discoveredEndings.filter((e) =>
              index.endings.get(e)?.campaign === c.type,
            ).length;
            const poolCount = c.endingPool.length;
            return (
              <div key={c.id} className="glass flex flex-col">
                <div className={`mb-3 h-2 w-full rounded ${c.type === "research" ? "bg-accent" : c.type === "competition" ? "bg-amber" : "bg-mint"}`} />
                <h3 className="font-serif text-lg font-bold">{c.title}</h3>
                <p className="mb-2 text-xs uppercase tracking-wider text-paper-400">{c.subtitle}</p>
                <p className="mb-3 flex-1 text-sm leading-relaxed text-paper-200">{c.description}</p>
                <div className="mb-3 flex items-center gap-2 text-xs text-paper-400">
                  <span className="tag">约 {c.estimatedMinutes} 分钟</span>
                  <span className="tag">
                    <Trophy size={11} className="mr-1" />
                    结局 {endingsFound}/{poolCount}
                  </span>
                  {completed && <span className="tag bg-mint/20 text-mint">已通关</span>}
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary flex-1" onClick={() => { setSelected(c.id); setShowNew(true); }}>
                    <Plus size={14} /> 新周目
                  </button>
                  {completed && (
                    <button className="btn-outline" title="NG+ 继承提示与额外行动点" onClick={() => { setSelected(c.id); setName("你"); newGame(c.id, "你", true); }}>
                      NG+
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="glass">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-paper-400">最近资产</h2>
          {recentAssets.length === 0 && <p className="text-sm text-paper-400">还没有资产。开始一条主线，在工作台里创造它们。</p>}
          <div className="space-y-2">
            {recentAssets.map((a) => (
              <div key={a.id} className="rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm">
                <span className="tag mr-2">v{a.version}</span>
                {a.name}
                <span className="ml-2 text-xs text-paper-400">{a.type}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-paper-400">已发现的结局</h2>
          {profile.discoveredEndings.length === 0 && <p className="text-sm text-paper-400">暂无。结局由你的真实选择决定，无法被剧情强送。</p>}
          <div className="flex flex-wrap gap-2">
            {profile.discoveredEndings.map((e) => (
              <span key={e} className="tag">{index.endings.get(e)?.title ?? e}</span>
            ))}
          </div>
        </div>
      </section>

      {showNew && selected && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="glass w-96">
            <h3 className="mb-3 font-serif text-lg font-bold">新建角色</h3>
            <input className="input mb-3" placeholder="角色名（默认：你）" value={name} onChange={(e) => setName(e.target.value)} />
            <p className="mb-4 text-xs text-paper-400">
              提示：一周目建议直接开始。没有安装任何真实 CLI 也没关系——所有 Agent 操作都有"教学模拟"模式，界面会明确标注。
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setShowNew(false)}>取消</button>
              <button
                className="btn-primary"
                onClick={() => {
                  newGame(selected, name, false);
                  setShowNew(false);
                  setName("");
                }}
              >
                开始
              </button>
            </div>
          </div>
        </div>
      )}

      {savesOpen && <SavesModal onClose={() => setSavesOpen(false)} onLoad={async (slot) => { const r = await loadFrom(slot); if (r.ok) setSavesOpen(false); }} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }): React.JSX.Element {
  return (
    <div className="text-right">
      <p className="text-xs text-paper-400">{label}</p>
      <p className="font-mono text-lg">{value}</p>
    </div>
  );
}

export function SavesModal({ onClose, onLoad }: { onClose: () => void; onLoad?: (slot: number) => void }): React.JSX.Element {
  const [saves, setSaves] = useState<{ slot: number; label: string; savedAt: string }[]>([]);
  const { saveTo, state } = useGame();
  const refresh = (): void => {
    metis()
      .saves.list()
      .then((rows) => setSaves(rows.map((r) => ({ slot: r.slot, label: r.label, savedAt: r.savedAt }))))
      .catch(() => undefined);
  };
  useEffect(() => {
    refresh();
  }, []);
  const slots = Array.from({ length: 10 }, (_, i) => i);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
      <div className="glass max-h-[80vh] w-[560px] overflow-y-auto">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold">存档（0 号为自动存档）</h3>
          <button className="btn-ghost" onClick={onClose}>关闭</button>
        </div>
        <div className="space-y-2">
          {slots.map((slot) => {
            const s = saves.find((x) => x.slot === slot);
            return (
              <div key={slot} className="flex items-center justify-between rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm">
                <div>
                  <span className="tag mr-2">{slot === 0 ? "AUTO" : `#${slot}`}</span>
                  {s ? s.label : "（空）"}
                  {s && <span className="ml-2 text-xs text-paper-400">{new Date(s.savedAt).toLocaleString()}</span>}
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost text-xs" onClick={() => { void saveTo(slot, s ? s.label : `手动存档 ${slot}`); refresh(); }}>
                    <Save size={13} /> 存
                  </button>
                  {s && (
                    <>
                      <button className="btn-ghost text-xs" onClick={() => { void onLoad?.(slot); }}>
                        <FolderOpen size={13} /> 读
                      </button>
                      <button
                        className="btn-ghost text-xs text-rose"
                        onClick={() => {
                          void metis().saves.delete(slot).then(refresh);
                        }}
                      >
                        删
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {state && (
          <p className="mt-3 text-xs text-paper-400">
            自动存档在每次选择、结束一天、任务完成与结局前触发。存档含版本号，未来格式变更可迁移。
          </p>
        )}
      </div>
    </div>
  );
}
