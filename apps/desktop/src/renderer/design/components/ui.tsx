import React from "react";

/* ===== GlassPanel ===== */
export function GlassPanel({ children, className = "", overlay = false }: { children: React.ReactNode; className?: string; overlay?: boolean }) {
  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{
        background: overlay ? "var(--glass-bg-overlay)" : "var(--glass-bg)",
        borderColor: "var(--glass-border)",
        backdropFilter: `blur(${overlay ? "var(--glass-blur-overlay)" : "var(--glass-blur)"}) saturate(125%)`,
        boxShadow: "var(--glass-shadow), var(--glass-inset)",
      }}
    >
      {children}
    </div>
  );
}

/* ===== GlassCard ===== */
export function GlassCard({ children, className = "", onClick, hover = true }: { children: React.ReactNode; className?: string; onClick?: () => void; hover?: boolean }) {
  return (
    <div
      className={`rounded-lg border transition-colors ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        background: "rgba(13, 20, 34, 0.45)",
        borderColor: "var(--border-subtle)",
        backdropFilter: "blur(12px)",
      }}
      onClick={onClick}
      onMouseEnter={(e) => { if (hover) { e.currentTarget.style.borderColor = "var(--glass-border-hover)"; e.currentTarget.style.background = "rgba(16, 24, 42, 0.6)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "rgba(13, 20, 34, 0.45)"; }}
    >
      {children}
    </div>
  );
}

/* ===== PageHeader ===== */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h1>
        {subtitle && <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

/* ===== EmptyState ===== */
export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-3 text-3xl opacity-30">{icon}</div>}
      <p className="mb-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{title}</p>
      <p className="max-w-sm text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ===== StatusDot ===== */
export function StatusDot({ color, size = 8 }: { color: string; size?: number }) {
  return <span className="inline-block rounded-full" style={{ width: size, height: size, backgroundColor: color }} />;
}

/* ===== Badge ===== */
export function Badge({ children, tone = "neutral", className = "" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "success" | "warning" | "danger"; className?: string }) {
  const tones: Record<string, React.CSSProperties> = {
    neutral: { background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" },
    accent: { background: "var(--accent-dim)", color: "var(--accent-text)" },
    success: { background: "var(--success-dim)", color: "var(--success)" },
    warning: { background: "var(--warning-dim)", color: "var(--warning)" },
    danger: { background: "var(--danger-dim)", color: "var(--danger)" },
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`} style={tones[tone]}>
      {children}
    </span>
  );
}

/* ===== Aurora Background ===== */
export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: -1 }}>
      <div style={{ position: "absolute", inset: 0, background: "var(--bg-base)" }} />
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 80% 60% at 70% 20%, rgba(108,124,255,0.06), transparent)`,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 60% 50% at 30% 80%, rgba(70,200,255,0.04), transparent)`,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        opacity: 0.4,
      }} />
    </div>
  );
}
