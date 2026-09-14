import React, { useEffect, useState, useCallback } from "react";

/* ===== METIS Academy V2 Game Shell =====
 * Root component that replaces SaaS navigation with game flow:
 * TITLE → HUB → DAY_LOOP → SCENE → TERMINAL → ENDING
 */

export type GameScreen =
  | "title"
  | "newGame"
  | "hub"
  | "scene"
  | "terminal"
  | "archive"
  | "skills"
  | "codex"
  | "messages"
  | "settings"
  | "pause"
  | "saveLoad"
  | "ending"
  | "fateReview"
  | "endingArchive"
  | "credits";

export interface GameShellProps {
  screen: GameScreen;
  onNavigate: (screen: GameScreen) => void;
  children: React.ReactNode;
  hudData?: {
    day?: number;
    totalDays?: number;
    actionPoints?: number;
    maxActionPoints?: number;
    campaignName?: string;
    missionTitle?: string;
    hasUnread?: boolean;
    agentStatus?: "idle" | "running" | "done" | "error";
  };
}

/* ===== Minimal HUD for gameplay screens ===== */
export function HUD({ data }: { data?: GameShellProps["hudData"] }) {
  if (!data) return null;
  return (
    <div
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-2"
      style={{
        background: "linear-gradient(180deg, rgba(7,10,18,0.9), rgba(7,10,18,0.7), transparent)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--accent-text)" }}>
          {data.campaignName}
        </span>
        {data.day && data.totalDays && (
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            DAY {data.day} / {data.totalDays}
          </span>
        )}
        {data.missionTitle && (
          <span className="text-xs truncate max-w-[300px]" style={{ color: "var(--text-muted)" }}>
            {data.missionTitle}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {data.actionPoints !== undefined && data.maxActionPoints !== undefined && (
          <div className="flex items-center gap-1">
            {Array.from({ length: data.maxActionPoints }).map((_, i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: i < (data.actionPoints ?? 0) ? "var(--accent)" : "rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </div>
        )}
        {data.agentStatus && (
          <StatusIndicator status={data.agentStatus} />
        )}
      </div>
    </div>
  );
}

/* ===== Status Indicator ===== */
export function StatusIndicator({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "rgba(255,255,255,0.3)",
    running: "var(--cyan)",
    done: "var(--success)",
    error: "var(--danger)",
  };
  return (
    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[status] ?? "rgba(255,255,255,0.3)" }} />
      AGENT
    </span>
  );
}

/* ===== Pause Menu (ESC) ===== */
export function PauseMenu({
  open,
  onClose,
  onNavigate,
  hasSave,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (screen: GameScreen) => void;
  hasSave?: boolean;
}) {
  if (!open) return null;
  const items: { label: string; action: () => void }[] = [
    { label: "继续", action: onClose },
    { label: "任务", action: () => onNavigate("hub") },
    { label: "资产", action: () => onNavigate("archive") },
    { label: "技能", action: () => onNavigate("skills") },
    { label: "知识库", action: () => onNavigate("codex") },
    { label: hasSave ? "读取存档" : "保存游戏", action: () => onNavigate("saveLoad") },
    { label: "设置", action: () => onNavigate("settings") },
    { label: "返回标题", action: () => onNavigate("title") },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div
        className="w-72 rounded-2xl border p-6"
        style={{
          background: "var(--glass-bg-overlay)",
          borderColor: "var(--glass-border)",
          backdropFilter: "blur(34px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
        }}
      >
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
          PAUSED
        </p>
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.action(); if (item.label !== "继续") onClose(); }}
              className="w-full rounded-lg px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/6"
              style={{ color: "var(--text-secondary)" }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===== Hook: ESC to toggle pause ===== */
export function useEscapeKey(onEscape: () => void) {
  const [paused, setPaused] = useState(false);
  const toggle = useCallback(() => setPaused((p) => !p), []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPaused((p) => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const PauseOverlay = paused ? (
    <PauseMenu open={paused} onClose={() => setPaused(false)} onNavigate={onEscape} />
  ) : null;
  return { paused, setPaused, PauseOverlay };
}

/* ===== Scene Frame (Story background + ambient) ===== */
export function SceneFrame({ location, children }: { location: string; children: React.ReactNode }) {
  const gradients: Record<string, string> = {
    workspace: "linear-gradient(180deg,#1a1e2e,#0d1220)", dorm: "linear-gradient(180deg,#1c1a2e,#0f0d1a)",
    library: "linear-gradient(180deg,#1a2820,#0e1510)", lab: "linear-gradient(180deg,#1a2030,#0e1218)",
    office: "linear-gradient(180deg,#251e2e,#120e16)", defense_hall: "linear-gradient(180deg,#2e1e28,#160e12)",
    classroom: "linear-gradient(180deg,#1e2430,#10141c)", canteen: "linear-gradient(180deg,#2e241c,#161210)",
    corridor: "linear-gradient(180deg,#1c2230,#0e1216)",
  };
  return (
    <div className="relative flex h-full flex-col overflow-hidden" style={{ background: gradients[location] ?? gradients.workspace }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 80%, rgba(108,124,255,0.04), transparent)" }} />
      {children}
    </div>
  );
}