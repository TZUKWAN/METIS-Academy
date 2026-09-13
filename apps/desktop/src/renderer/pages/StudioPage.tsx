import { useState } from "react";
import { useGame } from "../store.js";
import { ASSET_TYPE_CATALOG, type AssetType } from "@metis/content-schema";
import { assetsByCategory } from "@metis/game-core";

/** 工作室（G006）：按 Research/Competition/Venture/Agent/通用 分类展示玩家资产 */
export function StudioPage(): React.JSX.Element {
  const { state } = useGame();
  const categories = ["Research", "Competition", "Venture", "Agent", "通用"];
  const [open, setOpen] = useState<string | null>(null);
  const asset = state?.assets.find((a) => a.id === open);

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-1 font-serif text-2xl font-bold">工作室</h1>
      <p className="mb-5 text-sm text-paper-400">
        你的可持续资产库（共 {state?.assets.length ?? 0} 件，{Object.keys(ASSET_TYPE_CATALOG).length} 种类型可用）。资产跨天继承、带版本历史，是本周目真正的产出。
      </p>
      {state?.assets.length === 0 && <p className="text-sm text-paper-400">还没有资产——开始剧情，在决策中产生它们。</p>}
      <div className="space-y-5">
        {categories.map((cat) => {
          const list = state ? assetsByCategory(state, cat) : [];
          if (list.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-paper-400">
                {cat}（{list.length}）
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {list.map((a) => (
                  <button key={a.id} className="card text-left hover:border-accent" onClick={() => setOpen(a.id)}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="tag">{ASSET_TYPE_CATALOG[a.type as AssetType]?.label ?? a.type}</span>
                      <span className="tag">v{a.version}</span>
                      <span className="ml-auto text-xs text-paper-400">D{a.createdAtDay}</span>
                    </div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-paper-400">{a.description}</p>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {asset && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70" onClick={() => setOpen(null)}>
          <div className="card max-h-[80vh] w-[680px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center gap-2">
              <span className="tag">{ASSET_TYPE_CATALOG[asset.type as AssetType]?.label ?? asset.type}</span>
              <span className="tag">v{asset.version}</span>
              <span className="text-xs text-paper-400">创建于第 {asset.createdAtDay} 天</span>
              {asset.missionId && <span className="tag">任务 {asset.missionId}</span>}
            </div>
            <h3 className="mb-2 font-serif text-lg font-bold">{asset.name}</h3>
            <p className="mb-3 text-sm text-paper-400">{asset.description}</p>
            <pre className="whitespace-pre-wrap rounded bg-ink-900 p-3 font-mono text-xs leading-relaxed">{asset.content || "（无正文）"}</pre>
            <h4 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wider text-paper-400">版本历史</h4>
            <div className="space-y-1 text-xs text-paper-400">
              {asset.history.map((h, i) => (
                <p key={i}>
                  第 {h.day} 天 · {h.action}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
