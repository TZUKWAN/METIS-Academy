import React from "react";

/* ===== METIS Academy V2 — Title Screen ===== */

export function TitleScreen({
  hasSave,
  onContinue,
  onNewGame,
  onEndingArchive,
  onSettings,
  onCredits,
}: {
  hasSave?: boolean;
  onContinue?: () => void;
  onNewGame: () => void;
  onEndingArchive?: () => void;
  onSettings?: () => void;
  onCredits?: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0" style={{ background: "var(--bg-base)" }} />
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 70% 50% at 50% 60%, rgba(108,124,255,0.08), transparent 70%)",
      }} />
      <div className="absolute inset-0" style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      {/* Subtle animated accent line */}
      <div className="absolute left-1/2 top-[38%] h-px w-0 -translate-x-1/2" style={{
        background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
        animation: "titleLine 3s var(--ease-out) forwards",
      }} />
      <style>{`
        @keyframes titleLine {
          to { width: 60%; }
        }
      `}</style>

      {/* Title */}
      <div className="relative z-10 flex flex-col items-center">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.5em]" style={{ color: "var(--text-muted)" }}>
          AI Agent Growth Simulator
        </p>
        <h1
          className="text-5xl font-bold tracking-tight"
          style={{
            color: "var(--text-primary)",
            textShadow: "0 0 40px rgba(108,124,255,0.2)",
          }}
        >
          METIS Academy
        </h1>
        <div className="mt-3 h-px w-16" style={{ background: "var(--accent)" }} />
        <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          在真实任务里，学会让 Agent 真正为你工作
        </p>
      </div>

      {/* Menu */}
      <div className="relative z-10 mt-16 flex w-64 flex-col gap-2">
        {hasSave && onContinue && (
          <TitleMenuItem label="继续" onClick={onContinue} primary />
        )}
        <TitleMenuItem label="新的开始" onClick={onNewGame} primary={!hasSave} />
        <TitleMenuItem label="结局档案" onClick={onEndingArchive} />
        <TitleMenuItem label="设置" onClick={onSettings} />
        <TitleMenuItem label="制作人员" onClick={onCredits} />
      </div>

      {/* Bottom */}
      <div className="absolute bottom-6 text-[10px]" style={{ color: "var(--text-muted)" }}>
        <p>© 2026 METIS Academy · Open Source (MIT)</p>
      </div>
    </div>
  );
}

function TitleMenuItem({ label, onClick, primary }: { label: string; onClick?: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full rounded-lg px-6 py-3 text-center text-sm font-medium transition-all duration-200"
      style={{
        background: primary ? "var(--accent-dim)" : "transparent",
        border: primary ? "1px solid var(--accent-border)" : "1px solid transparent",
        color: primary ? "var(--accent-text)" : "var(--text-secondary)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--text-primary)";
        e.currentTarget.style.background = "rgba(108,124,255,0.1)";
        e.currentTarget.style.borderColor = "var(--accent-border)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = primary ? "var(--accent-text)" : "var(--text-secondary)";
        e.currentTarget.style.background = primary ? "var(--accent-dim)" : "transparent";
        e.currentTarget.style.borderColor = primary ? "var(--accent-border)" : "transparent";
      }}
    >
      {label}
      <span
        className="absolute left-4 top-1/2 h-px w-0 -translate-y-1/2 transition-all duration-200 group-hover:w-4"
        style={{ background: "var(--accent)" }}
      />
    </button>
  );
}
