import { useEffect, useMemo, useRef, useState } from "react";
import { History, Save, FastForward, ChevronRight, MoonStar } from "lucide-react";
import { useGame } from "../store.js";
import { relationshipTier, RELATIONSHIP_TIER_LABEL } from "@metis/content-schema";
import { Portrait } from "../components/Portrait.js";
import { QuickSaveModal } from "../components/QuickSaveModal.js";
import { sfx } from "../audio.js";
import type { DialogueLine } from "@metis/content-schema";

/** 剧情界面（G003/G004）：立绘/头像、人名、对话、choices（只显示行为）、历史回看、快捷保存、日终 */
export function StoryPage(): React.JSX.Element {
  const { state, index, dispatch, setPage } = useGame();
  const [showHistory, setShowHistory] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoRef = useRef(false);
  autoRef.current = autoPlay;

  // 自动播放：无选项时每 1.2s 自动推进
  useEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(() => {
      if (!autoRef.current) return;
      const st = useGame.getState().state;
      if (!st || st.ended) { setAutoPlay(false); return; }
      const ev = st.currentEventId ? index.events.get(st.currentEventId) : null;
      if (ev?.choices && ev.choices.length > 0) return; // 有选择时不自动
      if (!atLastLineRef.current) { setLineIdx((x) => x + 1); return; }
      dispatch({ type: 'advance' });
      setLineIdx(0);
    }, 1200);
    return () => clearInterval(t);
  }, [autoPlay]);

  const event = state?.currentEventId ? index.events.get(state.currentEventId) : null;
  const charMap = index.characters;
  const dialogue: DialogueLine[] = event?.dialogue ?? [];
  const [lineIdx, setLineIdx] = useState(0);
  const line = dialogue[Math.min(lineIdx, Math.max(0, dialogue.length - 1))];
  const visibleDialogue = useMemo(() => dialogue.slice(0, lineIdx + 1), [dialogue, lineIdx]);
  if (!state) return <div />;
  const atLastLine = lineIdx >= dialogue.length - 1;
  const atLastLineRef = useRef(false);
  atLastLineRef.current = atLastLine;
  const mission = state.currentMissionId ? index.missions.get(state.currentMissionId) : null;
  const campaign = index.campaigns.get(state.campaignId);

  const advanceOrNext = (): void => {
    if (!atLastLine) {
      setLineIdx(lineIdx + 1);
      return;
    }
    if (event && event.choices && event.choices.length > 0) return; // 等待选择
    const r = dispatch({ type: "advance" });
    if (r.error) setError(r.error);
    setLineIdx(0);
  };

  const choose = (choiceId: string): void => {
    sfx.choice();
    const r = dispatch({ type: "choose", choiceId });
    if (r.error) setError(r.error);
    else {
      setError(null);
      setLineIdx(0);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* 顶栏：天数/任务/资源 */}
      <div className="flex items-center justify-between border-b border-ink-700 bg-ink-950 px-4 py-2 text-sm">
        <div className="flex items-center gap-3">
          <span className="tag">第 {state.nums["day"]} / {campaign?.totalDays ?? "?"} 天</span>
          <span className="text-paper-200">{mission ? `任务：${mission.title}` : "自由时间"}</span>
          <span className="text-paper-400">{mission?.objective}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="tag" title="行动点：某些行为会消耗它们">行动点 {state.nums["actionPoints"]}/{state.nums["timeBudget"]}</span>
          <span className="tag" title="能量：疲劳会减少明天的行动点">能量 {state.nums["energy"]}</span>
          <button className={autoPlay ? 'btn-ghost text-mint' : 'btn-ghost'} onClick={() => setAutoPlay((v) => !v)} title="自动播放（可选）">
            {autoPlay ? '⏸ 自动中' : '▶ 自动'}
          </button>
          <button className="btn-ghost" onClick={() => { setLineIdx(Math.max(0, dialogue.length - 1)); }} title="跳过本事件已读文本">
            ⏭ 跳过已读
          </button>
          <button className="btn-ghost" onClick={() => setShowHistory(true)} title="历史回看">
            <History size={15} />
          </button>
          <button className="btn-ghost" onClick={() => setShowSave(true)} title="快捷保存">
            <Save size={15} />
          </button>
          <button className="btn-ghost" onClick={() => setPage("workbench")} title="前往工作台">
            <MoonStar size={15} />
          </button>
        </div>
      </div>

      {/* 场景 */}
      <div className="relative flex flex-1 flex-col overflow-hidden" onClick={advanceOrNext}>
        <SceneBackdrop location={event?.scene.location ?? "dorm"} />
        <div className="relative z-10 flex flex-1 items-end justify-center gap-6 px-8 pt-6">
          {(event?.scene.characters ?? []).map((cid) => {
            const c = charMap.get(cid);
            const tier = relationshipTier(state.relationships[cid] ?? 50);
            return (
              <div key={cid} className="flex flex-col items-center">
                <Portrait portrait={c?.portrait ?? cid} mood={line?.mood} size={150} />
                <p className="mt-2 text-sm font-semibold">{c?.displayName ?? cid}</p>
                <p className="text-xs text-paper-400">
                  {c?.role} · {RELATIONSHIP_TIER_LABEL[tier]}
                </p>
              </div>
            );
          })}
        </div>

        {/* 对话框 */}
        <div className="relative z-10 mx-auto mb-6 w-full max-w-4xl">
          {event?.setup && lineIdx === -1 + 0 && null}
          {visibleDialogue.length === 0 && (
            <div className="rounded-xl border p-5" style={{ background: 'rgba(10,15,28,0.82)', backdropFilter: 'blur(20px)', borderColor: 'var(--glass-border)' }}>
              <p className="font-serif text-paper-200">{event?.setup?.[0] ?? "……"}</p>
              <p className="mt-2 text-xs text-paper-400">点击空白处继续 →</p>
            </div>
          )}
          {visibleDialogue.map((l, i) => (
            <div
              key={i}
              className={`mb-2 rounded-xl border p-5 transition-all duration-200 ${i === visibleDialogue.length - 1 ? "border-white/10" : "border-white/5 opacity-40"}`}
              style={{ background: "rgba(10,15,28,0.82)", backdropFilter: "blur(20px) saturate(130%)", boxShadow: "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)" }}
            >
              <p className="mb-1 text-sm font-semibold" style={{ color: "var(--accent-text)" }}>{l.speaker}</p>
              <p className="font-serif leading-relaxed" style={{ color: "var(--text-primary)" }}>{l.text}</p>
            </div>
          ))}
          {!atLastLine && (
            <div className="flex justify-end pr-2">
              <ChevronRight size={18} className="animate-pulse text-paper-400" />
            </div>
          )}
        </div>
      </div>

      {/* 选择项（G004：只显示行为文本） */}
      {atLastLine && event?.choices && event.choices.length > 0 && (
        <div className="border-t border-ink-700 bg-ink-950 px-6 py-4">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3">
            {event.choices.map((c) => (
              <button
                key={c.id}
                className="rounded-xl border border-white/8 bg-white/4 px-4 py-3.5 text-left text-sm leading-relaxed transition-all duration-150 hover:border-accent/40 hover:bg-white/6 active:scale-[0.99] cursor-pointer" style={{ backdropFilter: 'blur(12px)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  choose(c.id);
                }}
              >
                {c.text}
                {c.cost?.actionPoints ? <span className="ml-2 tag" title="消耗行动点">AP -{c.cost.actionPoints}</span> : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 日终推进 */}
      {atLastLine && (!event?.choices || event.choices.length === 0) && (
        <div className="flex items-center justify-between border-t border-ink-700 bg-ink-950 px-6 py-3">
          <p className="text-xs text-paper-400">点击空白处继续剧情；当天剧情结束后，用下面的按钮进入下一天。</p>
          <button
            className="btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              const r = dispatch({ type: "endDay" });
              if (r.error && !r.error.includes("日末事件")) setError(r.error);
              else setError(null);
              setLineIdx(0);
            }}
          >
            <FastForward size={15} /> 结束这一天
          </button>
        </div>
      )}

      {state.lastFeedback && (
        <div className="border-t border-accent/30 bg-accent/10 px-6 py-2 text-sm text-paper-100" onClick={() => dispatch({ type: "dismissFeedback" })}>
          {state.lastFeedback}
          <span className="ml-2 text-xs text-paper-400">（点击关闭）</span>
        </div>
      )}
      {error && <div className="border-t border-rose/40 bg-rose/10 px-6 py-2 text-sm text-rose">{error}</div>}

      {showHistory && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70" onClick={() => setShowHistory(false)}>
          <div className="card max-h-[80vh] w-[640px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 font-serif text-lg font-bold">历史回看</h3>
            <div className="space-y-2 text-sm">
              {state.eventLog.slice(-60).map((l, i) => (
                <div key={i} className="rounded border border-ink-600 px-3 py-2">
                  <span className="tag mr-2">第 {l.day} 天</span>
                  {l.choiceText ?? index.events.get(l.eventId)?.setup?.[0] ?? l.eventId}
                  {l.response && <p className="mt-1 text-xs text-paper-400">{l.response}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showSave && (
        <QuickSaveModal
          onClose={() => setShowSave(false)}
          onSave={(slot) => {
            void useGame.getState().saveTo(slot, `第${state.nums["day"]}天·快捷保存`);
            setShowSave(false);
          }}
        />
      )}
    </div>
  );
}

function SceneBackdrop({ location }: { location: string }): React.JSX.Element {
  // 场景背景（TASK-O003）：CSS/SVG 渐变场景，克制的高校学术氛围
  const themes: Record<string, string> = {
    corridor: "linear-gradient(180deg,#1b2233 0%,#10141d 100%)",
    dorm: "linear-gradient(180deg,#23203a 0%,#12101f 100%)",
    library: "linear-gradient(180deg,#1d2b26 0%,#101713 100%)",
    lab: "linear-gradient(180deg,#20283a 0%,#101520 100%)",
    workbench: "linear-gradient(180deg,#252a38 0%,#131623 100%)",
    meeting_room: "linear-gradient(180deg,#2a2a22 0%,#16160f 100%)",
    canteen: "linear-gradient(180deg,#33261f 0%,#1a140f 100%)",
    office: "linear-gradient(180deg,#2b2333 0%,#151019 100%)",
    defense_hall: "linear-gradient(180deg,#33202b 0%,#191016 100%)",
  };
  return (
    <div
      className="absolute inset-0 opacity-90"
      style={{ background: themes[location] ?? themes["dorm"], transition: "background 0.6s" }}
    />
  );
}
