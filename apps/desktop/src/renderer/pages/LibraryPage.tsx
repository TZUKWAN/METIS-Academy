import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useGame } from "../store.js";
import { SKILL_DOMAIN_LABEL, type KnowledgeAtom } from "@metis/content-schema";

/** 方法库（G008/F001）：搜索知识卡；三层深度，默认只显示 30 秒 */
export function LibraryPage(): React.JSX.Element {
  const { index, state } = useGame();
  const [q, setQ] = useState("");
  const unlocked = new Set(state?.knowledge ?? []);

  const results = useMemo(() => {
    const all = [...index.knowledge.values()];
    if (!q.trim()) return all;
    const kw = q.trim().toLowerCase();
    return all.filter(
      (k) =>
        k.title.includes(kw) ||
        k.problem.includes(kw) ||
        k.wrongPattern.includes(kw) ||
        k.correctBehavior.includes(kw) ||
        k.depth30s.includes(kw) ||
        SKILL_DOMAIN_LABEL[k.domain].includes(kw),
    );
  }, [index.knowledge, q]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-1 font-serif text-2xl font-bold">方法库</h1>
      <p className="mb-4 text-sm text-paper-400">
        {index.knowledge.size} 张知识卡。试试搜索："Agent 忘记前面的要求怎么办？" 每张卡回答：遇到什么问题 → 别怎么做 → 该怎么做 → 怎么验收。
      </p>
      <div className="mb-4 flex items-center gap-2">
        <Search size={16} className="text-paper-400" />
        <input className="input max-w-lg" placeholder="用你遇到的问题来搜，例如：AI给的文献查不到" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="tag">{results.length} 张</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {results.map((k) => (
          <KnowledgeCard key={k.id} k={k} unlocked={unlocked.has(k.id)} />
        ))}
      </div>
    </div>
  );
}

function KnowledgeCard({ k, unlocked }: { k: KnowledgeAtom; unlocked: boolean }): React.JSX.Element {
  const [depth, setDepth] = useState<0 | 1 | 2>(0);
  const labels = ["30 秒", "3 分钟", "10 分钟"];
  return (
    <div className={`card ${unlocked ? "" : "opacity-80"}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className="tag">{SKILL_DOMAIN_LABEL[k.domain]}</span>
        {!unlocked && <span className="tag bg-amber/20 text-amber">未解锁（剧情中会触发）</span>}
      </div>
      <h3 className="mb-2 text-sm font-semibold">{k.title}</h3>
      <div className="mb-2 flex gap-1">
        {labels.map((label, i) => (
          <button
            key={label}
            className={`rounded px-2 py-0.5 text-[11px] ${depth === i ? "bg-accent text-white" : "bg-ink-700 text-paper-400 hover:text-paper-200"}`}
            onClick={() => setDepth(i as 0 | 1 | 2)}
          >
            {label}
          </button>
        ))}
      </div>
      {depth === 0 && <p className="text-sm leading-relaxed text-paper-100">{k.depth30s}</p>}
      {depth === 1 && (
        <div className="space-y-1 text-xs leading-relaxed text-paper-200">
          <p>{k.depth3m}</p>
        </div>
      )}
      {depth === 2 && (
        <div className="space-y-2 text-xs leading-relaxed text-paper-200">
          <p className="whitespace-pre-wrap">{k.depth10m}</p>
          <div>
            <p className="font-semibold text-paper-400">常见问题</p>
            <p>{k.problem}</p>
            <p className="mt-1 font-semibold text-paper-400">错误模式</p>
            <p className="text-rose">{k.wrongPattern}</p>
            <p className="mt-1 font-semibold text-paper-400">正确行为</p>
            <p className="text-mint">{k.correctBehavior}</p>
            <p className="mt-1 font-semibold text-paper-400">操作步骤</p>
            <ol className="list-decimal pl-4">
              {k.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <p className="mt-1 font-semibold text-paper-400">工具映射</p>
            {k.toolMappings.claudeCode && <p>Claude Code → {k.toolMappings.claudeCode}</p>}
            {k.toolMappings.codex && <p>Codex → {k.toolMappings.codex}</p>}
            {k.toolMappings.deepseekHarness && <p>DeepSeek Harness → {k.toolMappings.deepseekHarness}</p>}
            <p className="mt-1 font-semibold text-paper-400">验收信号</p>
            <p className="text-mint">成功：{k.successSignals.join("；")}</p>
            <p className="text-rose">危险：{k.failureSignals.join("；")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
