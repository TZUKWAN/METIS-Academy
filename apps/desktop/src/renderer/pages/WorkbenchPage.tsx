import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Square, Trash2, FolderOpen, FileText, Bot, Gauge } from "lucide-react";
import { useGame } from "../store.js";
import { metis, type CliInfo, type RunRecord } from "../api.js";
import { applyEffects } from "@metis/game-core";
import "@xterm/xterm/css/xterm.css";
import { scoreTaskContract, scoreAgentsMd, scoreGoal, scoreLoop, type ScoreResult } from "@metis/ai-core";

type CenterTab = "editor" | "terminal" | "history";

/** 工作台：左=项目/资产；中=编辑器/终端/运行历史；右=AI 对话与任务（D013/D014/M001-M006） */
export function WorkbenchPage(): React.JSX.Element {
  const { state, index } = useGame();
  const [tab, setTab] = useState<CenterTab>("editor");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const selectedAsset = state?.assets.find((a) => a.id === selectedAssetId) ?? null;
  const mission = state?.currentMissionId ? index.missions.get(state.currentMissionId) : null;

  return (
    <div className="flex h-full">
      {/* 左栏 */}
      <aside className="flex w-64 flex-col border-r border-ink-700 bg-ink-950">
        <div className="border-b border-ink-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-paper-400">任务</div>
        <div className="px-3 py-2 text-sm">
          {mission ? (
            <>
              <p className="font-medium">{mission.title}</p>
              <p className="mt-1 text-xs text-paper-400">{mission.objective}</p>
              <p className="mt-2 text-xs text-accent">训练目标：{mission.skillTraining}</p>
            </>
          ) : (
            <p className="text-xs text-paper-400">当前没有进行中的任务。</p>
          )}
        </div>
        <div className="border-y border-ink-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-paper-400">
          项目资产（{state?.assets.length ?? 0}）
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {(state?.assets ?? []).length === 0 && <p className="px-2 text-xs text-paper-400">暂无资产。资产在剧情决策中产生，也可在下方创建。</p>}
          {(state?.assets ?? []).map((a) => (
            <button
              key={a.id}
              className={`mb-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${selectedAssetId === a.id ? "bg-ink-700 text-white" : "hover:bg-ink-800 text-paper-200"}`}
              onClick={() => {
                setSelectedAssetId(a.id);
                setTab("editor");
              }}
            >
              <FileText size={14} className="shrink-0 text-paper-400" />
              <span className="truncate">{a.name}</span>
              <span className="ml-auto tag">v{a.version}</span>
            </button>
          ))}
        </div>
        <div className="p-2 text-[11px] leading-relaxed text-paper-400">
          工作台 = 你的真实项目目录。左侧资产是游戏内产出；右侧 Agent 可对真实目录执行任务（需先授权目录）。
        </div>
      </aside>

      {/* 中栏 */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex border-b border-ink-700 bg-ink-950 text-sm">
          {(
            [
              ["editor", "编辑器"],
              ["terminal", "终端"],
              ["history", "运行历史"],
            ] as [CenterTab, string][]
          ).map(([id, label]) => (
            <button key={id} className={`px-4 py-2 ${tab === id ? "border-b-2 border-accent text-white" : "text-paper-400 hover:text-paper-200"}`} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          {tab === "editor" && <AssetEditor asset={selectedAsset} />}
          {tab === "terminal" && <TerminalPanel />}
          {tab === "history" && <RunHistory />}
        </div>
      </section>

      {/* 右栏：AI 对话 + Agent 任务 + 评分器 */}
      <aside className="flex w-96 flex-col border-l border-ink-700 bg-ink-950">
        <AgentPanel selectedAsset={selectedAsset} />
      </aside>
    </div>
  );
}

function AssetEditor({ asset }: { asset: { id: string; name: string; content: string; type: string; version: number; description: string } | null }): React.JSX.Element {
  const [draft, setDraft] = useState("");
  useEffect(() => {
    setDraft(asset?.content ?? "");
  }, [asset?.id]);
  if (!asset) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-paper-400">
        选择左侧资产查看/编辑。推荐流程：让 Agent 生成草稿 → 你在编辑器里核对修改 → 用右侧评分器自检。
      </div>
    );
  }
  const score = scoreFor(asset.type, draft);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-700 px-3 py-2">
        <div>
          <p className="text-sm font-medium">{asset.name}</p>
          <p className="text-xs text-paper-400">{asset.description || asset.type} · v{asset.version}</p>
        </div>
        <div className="flex gap-2">
          {score && (
            <span className={`tag ${score.total >= 70 ? "text-mint" : score.total >= 45 ? "text-amber" : "text-rose"}`}>
              <Gauge size={12} className="mr-1" /> {labelFor(asset.type)}评分 {score.total}
            </span>
          )}
          <button
            className="btn-outline text-xs"
            onClick={() => {
              // 通过 effect 引擎更新资产（保持版本历史）
              const s = useGame.getState();
              if (!s.state) return;
              applyEffects(
                s.state,
                [{ kind: "updateAsset", assetId: asset.id, content: draft, bumpVersion: draft !== asset.content }],
                s.index,
                (s.state.nums["day"] ?? 1),
              );
              s.showToast("已保存（版本已记录）");
              setTimeout(() => s.showToast(null), 1800);
            }}
          >
            保存
          </button>
        </div>
      </div>
      <textarea
        className="min-h-0 flex-1 resize-none bg-ink-900 p-4 font-mono text-sm leading-relaxed outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
      />
      {score && (
        <div className="max-h-40 overflow-y-auto border-t border-ink-700 p-3 text-xs">
          {score.items.map((it) => (
            <div key={it.key} className="mb-1 flex items-start gap-2">
              <span className={it.passed ? "text-mint" : "text-rose"}>{it.passed ? "✓" : "✗"}</span>
              <span className="text-paper-200">
                {it.label}
                {it.feedback && !it.passed && <span className="text-paper-400">：{it.feedback}</span>}
              </span>
            </div>
          ))}
          <p className="mt-1 text-paper-400">规则优先评分（离线可用）。AI 只能补充建议，不能改变评分事实。</p>
        </div>
      )}
    </div>
  );
}

function labelFor(type: string): string {
  if (type === "task_contract") return "契约";
  if (type === "agents_md" || type === "claude_md") return "规则";
  if (type === "goal") return "Goal";
  if (type === "loop") return "Loop";
  return "内容";
}

function scoreFor(type: string, text: string): ScoreResult | null {
  if (!text.trim()) return null;
  switch (type) {
    case "task_contract":
      return scoreTaskContract(text);
    case "agents_md":
    case "claude_md":
      return scoreAgentsMd(text);
    case "goal":
      return scoreGoal(text);
    case "loop":
      return scoreLoop(text);
    default:
      return null;
  }
}

/** 终端：xterm.js 实现——输出/状态/停止/清空/搜索 */
function TerminalPanel(): React.JSX.Element {
  const [cwd, setCwd] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const { state } = useGame();
  const termHostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<{ write: (s: string) => void; writeln: (s: string) => void; clear: () => void } | null>(null);
  const searchRef = useRef<{ findNext: (s: string) => boolean } | null>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void (async () => {
      const [{ Terminal }, { FitAddon }, { SearchAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/addon-search"),
      ]);
      if (disposed) return;
      const term = new Terminal({ convertEol: true, fontSize: 12, theme: { background: "#0a0c10" } });
      const fit = new FitAddon();
      const search = new SearchAddon();
      term.loadAddon(fit);
      term.loadAddon(search);
      if (termHostRef.current) {
        term.open(termHostRef.current);
        fit.fit();
      }
      term.writeln("METIS 终端就绪。在右侧选择工具与任务后运行；教学模拟输出会明确标注。");
      termRef.current = term;
      searchRef.current = search;
      const onResize = (): void => fit.fit();
      window.addEventListener("resize", onResize);
      cleanup = () => {
        window.removeEventListener("resize", onResize);
        term.dispose();
      };
    })();
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const offOut = metis().cli.onOutput(({ chunk }) => {
      termRef.current?.write(chunk);
    });
    const offDone = metis().cli.onDone(({ runId, exitCode, cancelled, durationMs }) => {
      setRunningId((cur) => (cur === runId ? null : cur));
      const msg = cancelled
        ? "[进程已取消] run=" + runId
        : "[进程结束] exit=" + exitCode + " 用时 " + (durationMs / 1000).toFixed(1) + "s";
      termRef.current?.writeln(msg);
    });
    return () => {
      offOut();
      offDone();
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-ink-700 px-3 py-2">
        <button
          className="btn-outline text-xs"
          onClick={async () => {
            const dir = await metis().dialog.chooseDirectory();
            if (dir) {
              setCwd(dir);
              termRef.current?.writeln("[授权] 工作目录：" + dir + "（仅此目录内的操作被允许）");
            }
          }}
        >
          <FolderOpen size={13} /> 选择工作目录
        </button>
        <span className="truncate text-xs text-paper-400" title={cwd ?? "未授权目录（Agent 任务不可用）"}>
          {cwd ?? "未授权目录"}
        </span>
        <input
          className="input ml-auto w-40 text-xs"
          placeholder="搜索日志…"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            if (e.target.value.trim()) searchRef.current?.findNext(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filter.trim()) searchRef.current?.findNext(filter);
          }}
        />
        {runningId ? (
          <button className="btn-ghost text-xs text-rose" onClick={() => void metis().cli.cancel(runningId)}>
            <Square size={13} /> 停止
          </button>
        ) : null}
        <button className="btn-ghost text-xs" onClick={() => termRef.current?.clear()}>
          <Trash2 size={13} /> 清空
        </button>
      </div>
      <div ref={termHostRef} className="min-h-0 flex-1 bg-black/70 p-2" />
      {state && (
        <p className="border-t border-ink-700 px-3 py-1 text-[11px] text-paper-400">
          游戏日 第 {state.nums["day"]} 天 · 渲染进程无任何 Shell 权限，所有命令经主进程白名单执行。
        </p>
      )}
    </div>
  );
}

function RunHistory(): React.JSX.Element {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const refresh = (): void => {
    metis()
      .cli.history()
      .then(setRuns)
      .catch(() => undefined);
  };
  useMemo(() => refresh(), []);
  return (
    <div className="h-full overflow-y-auto p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Agent 运行历史</h3>
        <button
          className="btn-ghost text-xs"
          onClick={() => {
            void metis().cli.clearHistory().then(refresh);
          }}
        >
          清空历史
        </button>
      </div>
      {runs.length === 0 && <p className="text-paper-400">还没有运行记录。</p>}
      <div className="space-y-2">
        {runs.map((r, i) => (
          <div key={i} className="rounded border border-ink-600 p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="tag">{r.tool}</span>
              {r.simulated && <span className="tag bg-amber/20 text-amber">教学模拟</span>}
              <span className={r.exitCode === 0 ? "text-mint" : "text-rose"}>exit {r.exitCode ?? "?"}</span>
              <span className="ml-auto text-paper-400">{new Date(r.startedAt).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-paper-200">任务：{r.task}</p>
            <p className="text-paper-400">目录：{r.cwd}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 右栏：Agent 任务 + AI 对话 */
function AgentPanel({ selectedAsset }: { selectedAsset: { id: string; name: string; content: string; type: string } | null }): React.JSX.Element {
  const [tools, setTools] = useState<CliInfo[]>([]);
  const [toolId, setToolId] = useState<string>("");
  const [cwd, setCwd] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [chat, setChat] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const runCounter = useRef(0);

  useEffect(() => {
    metis()
      .cli.list()
      .then((list) => {
        setTools(list);
        const firstSim = list.find((t) => t.simulated);
        setToolId(firstSim?.id ?? list[0]?.id ?? "");
      })
      .catch(() => undefined);
    const offErr = metis().ai.onStreamError(({ error }) => {
      setChat((c) => [...c, { role: "assistant", text: `[AI 错误] ${error}` }]);
      setStreaming(false);
    });
    return offErr;
  }, []);

  const runTask = (): void => {
    if (!cwd) {
      setChat((c) => [...c, { role: "assistant", text: "请先到「终端」标签页选择并授权工作目录。" }]);
      return;
    }
    const runId = `run_${Date.now()}_${runCounter.current++}`;
    setRunning(true);
    void metis()
      .cli.run({ runId, adapterId: toolId, cwd, prompt })
      .then((r) => {
        if (!r.ok) {
          setRunning(false);
          setChat((c) => [...c, { role: "assistant", text: `[错误] ${r.error}` }]);
        }
      });
    const off = metis().cli.onDone(() => {
      setRunning(false);
      off();
    });
  };

  const sendChat = (): void => {
    const text = chatInput.trim();
    if (!text || streaming) return;
    setChat((c) => [...c, { role: "user", text }]);
    setChatInput("");
    setStreaming(true);
    const reqId = `chat_${Date.now()}`;
    let assistant = "";
    const offChunk = metis().ai.onChunk(({ reqId: rid, delta, done }) => {
      if (rid !== reqId) return;
      assistant += delta;
      setChat((c) => {
        const copy = [...c];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant" && last.text.startsWith("\u0000live")) {
          copy[copy.length - 1] = { role: "assistant", text: assistant };
        } else {
          copy.push({ role: "assistant", text: assistant });
        }
        return copy;
      });
      if (done) {
        setStreaming(false);
        offChunk();
      }
    });
    setChat((c) => [...c, { role: "assistant", text: "\u0000live" }]);
    const context = selectedAsset ? `\n\n[当前选中资产：${selectedAsset.name}（${selectedAsset.type}）]\n${selectedAsset.content.slice(0, 1200)}` : "";
    void metis().ai
      .stream({ reqId, messages: [{ role: "user", content: text + context }] })
      .then((ok) => {
        if (!ok) {
          setStreaming(false);
          offChunk();
          setChat((c) => [...c.slice(0, -1), { role: "assistant", text: "[AI 未配置或调用失败。到 设置 → AI 服务 配置 Provider；离线也能完成全部主线。]" }]);
        }
      });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-ink-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-paper-400">AI Agent</div>
      <div className="space-y-2 border-b border-ink-700 p-3">
        <div className="flex gap-2">
          <select className="input text-xs" value={toolId} onChange={(e) => setToolId(e.target.value)}>
            {tools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName}
                {!t.installed && !t.simulated ? "（未安装）" : ""}
              </option>
            ))}
          </select>
          <button className="btn-outline text-xs" title={cwd ?? "选择工作目录"} onClick={async () => setCwd(await metis().dialog.chooseDirectory())}>
            <FolderOpen size={13} />
          </button>
        </div>
        <textarea
          className="input h-20 resize-none text-xs"
          placeholder="任务描述（写 Task Contract：背景/目标/约束/交付/验收）"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-paper-400">
            {tools.find((t) => t.id === toolId)?.simulated ? "教学模拟：输出为脚本演示，标注明确" : "真实 CLI：将在你授权的目录内执行"}
          </span>
          <button className="btn-primary text-xs" disabled={running || !prompt.trim()} onClick={runTask}>
            <Play size={13} /> {running ? "运行中…" : "运行任务"}
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {chat.length === 0 && (
          <p className="text-xs leading-relaxed text-paper-400">
            AI 对话用于辅助思考（候选生成、润色）。记住第一课：AI 产生候选，不产生事实。
            未配置 AI 时一切功能照常可用。
          </p>
        )}
        {chat.map((m, i) => (
          <div key={i} className={`rounded-lg p-2 text-xs leading-relaxed ${m.role === "user" ? "bg-accent/15 text-paper-50" : "bg-ink-800 text-paper-200"}`}>
            <p className="mb-1 font-semibold text-paper-400">{m.role === "user" ? "你" : "AI"}</p>
            <p className="whitespace-pre-wrap">{m.text.replace(/^\u0000live/, "")}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-ink-700 p-2">
        <input
          className="input text-xs"
          placeholder={streaming ? "生成中…" : "问点什么…"}
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendChat();
          }}
        />
        <button className="btn-primary text-xs" disabled={streaming} onClick={sendChat}>
          <Bot size={13} />
        </button>
      </div>
    </div>
  );
}
