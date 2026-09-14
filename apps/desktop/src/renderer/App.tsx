import { useEffect, useState } from "react";
import { Home, BookOpen, Hammer, FolderKanban, Network, Library, Settings2, X, Terminal, FolderOpen, Network as NetworkIcon, BookOpen as BookIcon, MessageSquare, Calendar, Save } from "lucide-react";
import { useGame, type Page } from "./store.js";
import { HomePage } from "./pages/HomePage.js";
import { StoryPage } from "./pages/StoryPage.js";
import { WorkbenchPage } from "./pages/WorkbenchPage.js";
import { StudioPage } from "./pages/StudioPage.js";
import { SkillsPage } from "./pages/SkillsPage.js";
import { LibraryPage } from "./pages/LibraryPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { Onboarding } from "./pages/Onboarding.js";
import { sfx, startBGM } from "./audio.js";
import { AuroraBackground } from "./design/components/ui.js";
import { TitleScreen } from "./design/components/TitleScreen.js";
import { HubScreen, HubIcons } from "./design/components/HubScreen.js";

type GamePhase = "title" | "hub" | "ingame" | "settings" | "credits";

const NAV: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "首页", icon: <Home size={18} /> },
  { id: "story", label: "剧情", icon: <BookOpen size={18} /> },
  { id: "workbench", label: "工作台", icon: <Hammer size={18} /> },
  { id: "studio", label: "工作室", icon: <FolderKanban size={18} /> },
  { id: "skills", label: "能力", icon: <Network size={18} /> },
  { id: "library", label: "方法库", icon: <Library size={18} /> },
  { id: "settings", label: "设置", icon: <Settings2 size={18} /> },
];

export function App(): React.JSX.Element {
  const { page, setPage, toast, contentIssues, index, onboardingDone, state, composed } = useGame();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [gamePhase, setGamePhase] = useState<GamePhase>("title");
  const [showPause, setShowPause] = useState(false);

  useEffect(() => {
    if (!onboardingDone && index.campaigns.size > 0) setShowOnboarding(true);
  }, [index.campaigns.size, onboardingDone]);

  useEffect(() => {
    const once = (): void => startBGM();
    window.addEventListener('pointerdown', once, { once: true });
    window.addEventListener('keydown', once, { once: true });
    return () => {
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('keydown', once);
    };
  }, []);

  // ESC toggles pause during gameplay
  useEffect(() => {
    if (gamePhase !== "ingame") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPause((p) => !p);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gamePhase]);

  const startNewGame = (campaignId: string) => {
    setGamePhase("ingame");
    setPage("story");
  };

  const continueGame = () => {
    setGamePhase("ingame");
    setPage("story");
  };

  const gotoHub = () => {
    setGamePhase("hub");
  };

  const gotoSettings = () => {
    setGamePhase("settings");
    setPage("settings");
  };

  // ===== TITLE SCREEN =====
  if (gamePhase === "title") {
    return (
      <>
        <AuroraBackground />
        <TitleScreen
          hasSave={!!state}
          onContinue={continueGame}
          onNewGame={() => { setGamePhase("hub"); }}
          onEndingArchive={() => { setGamePhase("hub"); }}
          onSettings={gotoSettings}
          onCredits={() => { setGamePhase("credits"); }}
        />
        {toast && (
          <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-md bg-ink-700 px-4 py-2 text-sm shadow-lg">{toast}</div>
        )}
      </>
    );
  }

  // ===== SETTINGS SCREEN =====
  if (gamePhase === "settings") {
    return (
      <>
        <AuroraBackground />
        <div className="flex h-full">
          <nav className="flex w-14 flex-col items-center justify-start pt-4">
            <button onClick={() => setGamePhase("title")} className="btn-ghost text-xs">← 返回</button>
          </nav>
          <main className="min-w-0 flex-1 overflow-hidden"><SettingsPage /></main>
        </div>
      </>
    );
  }

  // ===== CREDITS SCREEN =====
  if (gamePhase === "credits") {
    return (
      <>
        <AuroraBackground />
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>制作人员</h2>
          <div className="mt-4 max-w-md space-y-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            <p>游戏设计、代码、内容 — METIS Academy Team</p>
            <p>设计系统 — V2 Glass Design</p>
            <p>Icons — Lucide (ISC)</p>
            <p>Engine — Electron + React + TypeScript</p>
            <p className="pt-4 text-xs" style={{ color: "var(--text-muted)" }}>
              本项目以 MIT License 开源发布
            </p>
          </div>
          <button onClick={() => setGamePhase("title")} className="btn-ghost mt-6 text-xs">返回标题</button>
        </div>
      </>
    );
  }

  // ===== HUB SCREEN =====
  if (gamePhase === "hub") {
    const hubObjects = [
      { id: "story", label: "剧情", description: "继续当前故事线", icon: <BookIcon size={20} style={{ color: "var(--accent-text)" }} />, onClick: () => { setGamePhase("ingame"); setPage("story"); } },
      { id: "terminal", label: "终端", description: "Agent 工作台与终端", icon: <Terminal size={20} style={{ color: "var(--accent-text)" }} />, onClick: () => { setGamePhase("ingame"); setPage("workbench"); } },
      { id: "archive", label: "档案", description: "查看你的资产和成果", icon: <FolderOpen size={20} style={{ color: "var(--accent-text)" }} />, onClick: () => { setGamePhase("ingame"); setPage("studio"); } },
      { id: "skills", label: "能力", description: "Agent 能力图谱", icon: <NetworkIcon size={20} style={{ color: "var(--accent-text)" }} />, onClick: () => { setGamePhase("ingame"); setPage("skills"); } },
      { id: "codex", label: "知识库", description: "方法和知识点", icon: <BookIcon size={20} style={{ color: "var(--accent-text)" }} />, onClick: () => { setGamePhase("ingame"); setPage("library"); } },
    ];
    return (
      <>
        <AuroraBackground />
        <HubScreen
          characterName={state?.characterName ?? "新玩家"}
          campaignName={state?.campaignId ?? "未选择"}
          day={state?.nums?.day ?? 1}
          totalDays={30}
          objects={hubObjects}
          onSettings={gotoSettings}
        />
        {toast && (
          <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-md bg-ink-700 px-4 py-2 text-sm shadow-lg">{toast}</div>
        )}
      </>
    );
  }

  // ===== IN-GAME (with sidebar nav) =====
  return (
    <>
      <AuroraBackground />
      <div className="flex h-full">
        <nav className="flex w-14 flex-col items-center gap-1 border-r border-ink-700/50 py-3" style={{ background: "rgba(7,10,18,0.8)", backdropFilter: "blur(8px)" }}>
          <button onClick={() => setGamePhase("title")} className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-serif text-sm font-bold text-white" title="返回标题">M</button>
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`flex w-12 flex-col items-center gap-1 rounded-md py-2 text-[10px] transition-colors ${
                page === n.id ? "bg-white/8 text-white" : "text-paper-400 hover:bg-white/5 hover:text-paper-200"
              }`}
              title={n.label}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
          {contentIssues > 0 && (
            <span className="mt-auto rounded bg-rose px-1 text-[10px] text-white" title={`内容问题 ${contentIssues} 条`}>
              内容{contentIssues}
            </span>
          )}
        </nav>

        <main className="min-w-0 flex-1 overflow-hidden">
          {page === "home" && <HomePage />}
          {page === "story" && (state ? <StoryPage /> : <HomePage />)}
          {page === "workbench" && <WorkbenchPage />}
          {page === "studio" && <StudioPage />}
          {page === "skills" && <SkillsPage />}
          {page === "library" && <LibraryPage />}
          {page === "settings" && <SettingsPage />}
          {composed && <EndingOverlay />}
        </main>

        {showPause && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="w-72 rounded-2xl border p-6" style={{
              background: "var(--glass-bg-overlay)", borderColor: "var(--glass-border)",
              backdropFilter: "blur(34px)", boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
            }}>
              <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>PAUSED</p>
              <div className="space-y-1">
                {[
                  { label: "返回游戏", action: () => setShowPause(false) },
                  { label: "标题画面", action: () => { setShowPause(false); setGamePhase("title"); } },
                  { label: "设置", action: () => { setShowPause(false); gotoSettings(); } },
                ].map((item) => (
                  <button key={item.label} onClick={() => { item.action(); setShowPause(false); }}
                    className="w-full rounded-lg px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/6"
                    style={{ color: "var(--text-secondary)" }}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-md bg-ink-700 px-4 py-2 text-sm shadow-lg">{toast}</div>
        )}
      </div>
    </>
  );
}

function EndingOverlay(): React.JSX.Element {
  const { composed, fateReview, closeEnding, setPage } = useGame();
  if (!composed) return <div />;
  sfx.ending();
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-6">
      <div className="card max-h-full w-full max-w-3xl overflow-y-auto">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">Ending</p>
            <h1 className="font-serif text-2xl font-bold">{composed.title}</h1>
            <p className="text-sm text-paper-400">主结果：{composed.mainResult}</p>
          </div>
          <button className="btn-ghost" onClick={() => { closeEnding(); setPage("home"); }} title="返回首页">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {composed.sections.map((s, i) => (
            <div key={i}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-paper-400">{s.heading}</p>
              <p className="whitespace-pre-wrap font-serif leading-relaxed text-paper-50">{s.text}</p>
            </div>
          ))}
          <div className="rounded-md border border-accent/40 bg-accent/10 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">反思</p>
            <p className="font-serif leading-relaxed">{composed.reflection}</p>
          </div>
        </div>
        {fateReview && fateReview.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold">命运回溯——影响结局的关键决定</p>
            <div className="space-y-2">
              {fateReview.map((f, i) => (
                <div key={i} className="rounded-md border border-ink-600 bg-ink-900 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="tag">第 {f.day} 天</span>
                    <span className="font-medium">{f.eventTitle}</span>
                  </div>
                  <p className="mt-1 text-paper-200">你的行动：{f.action}</p>
                  <p className="text-paper-400">学习点：{f.learningPoint}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-5 flex gap-2">
          <button className="btn-primary" onClick={() => { closeEnding(); setPage("home"); }}>返回首页</button>
        </div>
      </div>
    </div>
  );
}
