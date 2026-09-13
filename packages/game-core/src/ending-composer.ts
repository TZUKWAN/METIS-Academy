import type { Character, Ending, ContentIndex } from "@metis/content-schema";
import { relationshipTier, RELATIONSHIP_TIER_LABEL } from "@metis/content-schema";
import type { GameState } from "./state.js";
import { num } from "./state.js";
import { evaluateCondition } from "./conditions.js";
import { interpolate } from "@metis/shared";

export interface EndingSection {
  heading: string;
  text: string;
}

export interface ComposedEnding {
  endingId: string;
  title: string;
  mainResult: string;
  sections: EndingSection[];
  reflection: string;
  specialTags: string[];
  fingerprint: string;
}

/**
 * Ending Composer（C012）：
 * 人工骨架 + 模块化段落 + 变量插值。AI 只能润色，不能改变事实（润色属可选后处理，不改数据）。
 * 相同主结果、不同状态 → 产出明显不同文本。
 */
export function composeEnding(
  state: GameState,
  ending: Ending,
  index: ContentIndex,
  characters: Map<string, Character>,
): ComposedEnding {
  const sections: EndingSection[] = [];
  const vars: Record<string, string | number> = {
    characterName: state.characterName,
    day: num(state, "day"),
    money: Math.round(num(state, "money")),
    users: num(state, "users"),
    revenue: Math.round(num(state, "revenue")),
    literatureCount: num(state, "literatureCount"),
    progress: num(state, "progress"),
  };

  sections.push({ heading: "结局", text: interpolate(ending.baseText, vars) });

  // 1. 成长变体（按隐藏状态）
  for (const rule of ending.growthVariantRules) {
    const dimKey = dimensionToStateKey(rule.dimension);
    if (!dimKey) continue;
    const v = num(state, dimKey);
    // 区间命中优先（同时给出 gte/lte 的段最精确），其次单边档位
    const hit =
      rule.variants.find(
        (x) =>
          (x.gte !== undefined || x.lte !== undefined) &&
          (x.gte === undefined || v >= x.gte) &&
          (x.lte === undefined || v <= x.lte),
      ) ??
      rule.variants.find((x) => x.gte !== undefined && v >= x.gte) ??
      rule.variants.find((x) => x.lte !== undefined && v <= x.lte);
    if (hit) sections.push({ heading: "你的成长", text: interpolate(hit.text, vars) });
  }

  // 2. NPC 后日谈（按关系分档）
  for (const rule of ending.characterEpilogueRules) {
    if (rule.condition && !evaluateCondition(state, rule.condition, index)) continue;
    const score = state.relationships[rule.characterId] ?? 50;
    const tier = relationshipTier(score);
    const ch = characters.get(rule.characterId);
    const text = tier === "trusting" || tier === "deep_trust" ? rule.positive : tier === "neutral" ? rule.neutral : rule.negative;
    sections.push({
      heading: `${ch?.displayName ?? rule.characterId}（${RELATIONSHIP_TIER_LABEL[tier]}）`,
      text: interpolate(text, vars),
    });
  }

  // 3. 项目未来
  for (const rule of ending.projectFutureRules) {
    if (evaluateCondition(state, rule.condition, index)) {
      sections.push({ heading: "项目之后", text: interpolate(rule.text, vars) });
      break;
    }
  }

  // 4. 特殊 flag 段
  for (const rule of ending.specialFlagSections) {
    if (state.flags[rule.flag] !== undefined) {
      sections.push({ heading: "被记住的事", text: interpolate(rule.text, vars) });
    }
  }

  const fingerprint = sections.map((s) => s.text).join("|");
  return {
    endingId: ending.id,
    title: ending.title,
    mainResult: ending.mainResult,
    sections,
    reflection: interpolate(ending.reflection, vars),
    specialTags: ending.specialTags,
    fingerprint,
  };
}

function dimensionToStateKey(dimension: string): string | null {
  switch (dimension) {
    case "independence":
      return "independence";
    case "aiDependence":
      return "aiDependence";
    case "execution_vs_judgment":
      return "execution";
    case "judgment_vs_execution":
      return "evidenceDiscipline";
    case "evidenceDiscipline":
      return "evidenceDiscipline";
    case "technicalDebt":
      return "technicalDebt";
    case "academicDebt":
      return "academicDebt";
    case "balanced":
      return "execution";
    default:
      return null;
  }
}
