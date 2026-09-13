import { useState } from "react";

/** 新手引导：只教最低限度——继续剧情、做选择、进工作台、返回 */
export function Onboarding({ onDone }: { onDone: () => void }): React.JSX.Element {
  const steps = [
    {
      title: "欢迎来到 METIS Academy",
      body: "这里不教你 AI 原理，只教一件事：怎么让 Agent 真正为你完成复杂任务——通过科研、竞赛、创业三条故事线。",
      hint: "剧情里做的每个选择都会真实地影响结局。",
    },
    {
      title: "怎么玩剧情",
      body: "剧情页：点击空白处推进对话；出现选项时，选你想做的行为。选项不会显示数值好坏——就像现实一样。",
      hint: "结束一天：点右下角「结束这一天」。某些行为会消耗行动点。",
    },
    {
      title: "工作台",
      body: "顶部导航的「工作台」是你的真实操作区：左侧资产、中间编辑器与终端、右侧 AI Agent。没有安装真实 CLI？用「教学模拟」模式，界面会明确标注。",
      hint: "按 M 键可随时返回本页提示。",
    },
    {
      title: "开始",
      body: "去首页选一条主线，新建角色。30 天后见。",
      hint: "记住：游戏可以存档重来，但你学到的方法会留下来。",
    },
  ];
  const [i, setI] = useState(0);
  const s = steps[i]!;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="card w-[520px]">
        <p className="mb-1 text-xs uppercase tracking-widest text-accent">
          新手引导 {i + 1}/{steps.length}
        </p>
        <h2 className="mb-3 font-serif text-xl font-bold">{s.title}</h2>
        <p className="mb-2 text-sm leading-relaxed text-paper-200">{s.body}</p>
        <p className="mb-5 rounded border border-ink-600 bg-ink-900 px-3 py-2 text-xs text-paper-400">{s.hint}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, j) => (
              <span key={j} className={`h-1.5 w-6 rounded ${j <= i ? "bg-accent" : "bg-ink-600"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs" onClick={onDone}>
              跳过
            </button>
            {i < steps.length - 1 ? (
              <button className="btn-primary text-xs" onClick={() => setI(i + 1)}>
                下一步
              </button>
            ) : (
              <button className="btn-primary text-xs" onClick={onDone}>
                开始游戏
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
