import type { ContentIndex } from "@metis/content-schema";
import type { DecisionLogEntry, GameState } from "./state.js";

export interface FateItem {
  day: number;
  eventTitle: string;
  action: string;
  impact: string;
  learningPoint: string;
}

/** Fate Review（C013）：结局后回溯 5–10 个关键决定 */
export function buildFateReview(state: GameState, index: ContentIndex): FateItem[] {
  const keyDecisions = state.decisionLog.filter((d) => {
    const ev = index.events.get(d.eventId);
    return ev?.keyDecision || d.delayed;
  });
  const source = keyDecisions.length >= 5 ? keyDecisions : [...keyDecisions, ...state.decisionLog];
  const unique = new Map<string, DecisionLogEntry>();
  for (const d of source) {
    const k = `${d.eventId}:${d.choiceId}`;
    if (!unique.has(k)) unique.set(k, d);
  }
  const items = [...unique.values()].slice(-10).map((d) => {
    const ev = index.events.get(d.eventId);
    const delayedImpact = state.delayedQueue.some((q) => q.sourceEventId === d.eventId)
      ? "该选择的影响仍在持续发酵。"
      : ev?.learningPoint
        ? ""
        : "这个选择改变了后续的走向。";
    return {
      day: d.day,
      eventTitle: ev ? stripMarkdown(ev.setup?.[0] ?? d.eventTitle) : d.eventTitle,
      action: d.choiceText,
      impact: delayedImpact || (ev?.purpose?.learning ? `教学点：${ev.purpose.learning}` : "影响了后续剧情。"),
      learningPoint: d.learningPoint ?? ev?.learningPoint ?? ev?.purpose?.learning ?? "—",
    };
  });
  return items;
}

function stripMarkdown(s: string): string {
  return s.replace(/[#*`>]/g, "").trim();
}
