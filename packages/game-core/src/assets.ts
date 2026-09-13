import type { AssetInstance, GameState } from "./state.js";

/** 资产系统（C010）：创建/更新/版本/关联/复用/历史 已由 effect engine 实现，这里提供查询 API */
export function assetsByType(state: GameState, type: string): AssetInstance[] {
  return state.assets.filter((a) => a.type === type);
}

export function findAsset(state: GameState, assetId: string): AssetInstance | undefined {
  return state.assets.find((a) => a.id === assetId);
}

export function assetHistory(asset: AssetInstance): { day: number; action: string; note?: string }[] {
  return [...asset.history].sort((a, b) => a.day - b.day);
}

export const ASSET_CATEGORY_MAP: Record<string, string[]> = {
  Research: ["dataset", "research_matrix", "literature_library", "keyword_tree", "evidence_matrix", "research_brief", "concept_table", "mechanism_map", "argument_map"],
  Competition: ["pitch_deck", "prototype", "test_report"],
  Venture: ["business_model", "user_feedback", "revenue_report", "hypothesis_board"],
  Agent: ["prompt", "task_contract", "agents_md", "claude_md", "goal", "loop", "handoff", "state_file", "compact_checkpoint", "agent_environment_profile", "session_summary"],
  通用: ["document", "interview_notes", "code_project", "custom", "checklist"],
};

export function assetsByCategory(state: GameState, category: string): AssetInstance[] {
  const types = ASSET_CATEGORY_MAP[category] ?? [];
  return state.assets.filter((a) => types.includes(a.type));
}
