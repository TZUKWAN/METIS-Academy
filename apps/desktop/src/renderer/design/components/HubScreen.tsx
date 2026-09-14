import React from "react";
import { Terminal, FolderOpen, Network, BookOpen, MessageSquare, Calendar, Settings, Save } from "lucide-react";

/* ===== METIS Academy V2 — Player Hub =====
 * The central "base" where the player navigates to game systems.
 * NOT a dashboard. Interactive objects in a space.
 */

export interface HubObject {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
}

export function HubScreen({
  characterName,
  campaignName,
  day,
  totalDays,
  objects,
  onSettings,
}: {
  characterName: string;
  campaignName: string;
  day: number;
  totalDays: number;
  objects: HubObject[];
  onSettings?: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0" style={{ background: "var(--bg-raised)" }} />
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 50% 35% at 50% 30%, rgba(108,124,255,0.06), transparent 70%)",
      }} />

      {/* Header */}
      <div className="relative z-10 px-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-text)" }}>
              METIS STUDIO
            </p>
            <h2 className="mt-1 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              {characterName} · {campaignName}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
              DAY {day}/{totalDays}
            </span>
            {onSettings && (
              <button onClick={onSettings} className="rounded-md p-2 transition-colors hover:bg-white/6" title="设置">
                <Settings size={16} style={{ color: "var(--text-muted)" }} />
              </button>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (day / totalDays) * 100)}%`, background: "linear-gradient(90deg, var(--accent), var(--cyan))" }}
          />
        </div>
      </div>

      {/* Hub Grid — interactive objects */}
      <div className="relative z-10 mt-8 flex-1 overflow-y-auto px-8 pb-8">
        <div className="grid grid-cols-4 gap-4">
          {objects.map((obj) => (
            <HubObjectCard key={obj.id} object={obj} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HubObjectCard({ object }: { object: HubObject }) {
  return (
    <button
      onClick={object.onClick}
      className="group relative flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: "rgba(13, 20, 34, 0.5)",
        borderColor: "var(--glass-border)",
        backdropFilter: "blur(16px)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-border)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
    >
      <div className="flex w-full items-center justify-between">
        <div className="rounded-lg p-2" style={{ background: "var(--accent-dim)" }}>
          {object.icon}
        </div>
        {object.badge && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: "var(--danger-dim)", color: "var(--danger)" }}>
            {object.badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{object.label}</p>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{object.description}</p>
      </div>
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 h-0.5 w-0 rounded-full transition-all duration-300 group-hover:w-full"
        style={{ background: "linear-gradient(90deg, var(--accent), var(--cyan))" }} />
    </button>
  );
}

/* Export icon set for Hub */
export const HubIcons = {
  terminal: <Terminal size={20} style={{ color: "var(--accent-text)" }} />,
  archive: <FolderOpen size={20} style={{ color: "var(--accent-text)" }} />,
  skills: <Network size={20} style={{ color: "var(--accent-text)" }} />,
  codex: <BookOpen size={20} style={{ color: "var(--accent-text)" }} />,
  messages: <MessageSquare size={20} style={{ color: "var(--accent-text)" }} />,
  calendar: <Calendar size={20} style={{ color: "var(--accent-text)" }} />,
  save: <Save size={20} style={{ color: "var(--accent-text)" }} />,
};
