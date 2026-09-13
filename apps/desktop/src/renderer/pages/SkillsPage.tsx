import { Lock } from "lucide-react";
import { useGame } from "../store.js";
import { SKILL_DOMAIN_LABEL, type SkillDomain } from "@metis/content-schema";

/** 能力树：只显示玩家已知信息；未发现的技能模糊显示 */
export function SkillsPage(): React.JSX.Element {
  const { index, state, profile } = useGame();
  const domains = Object.keys(SKILL_DOMAIN_LABEL) as SkillDomain[];
  const discovered = new Set(state ? Object.keys(state.skills).filter((k) => (state.skills[k] ?? 0) > 0) : []);
  const achievements = new Set(state?.achievements.map((a) => a.id) ?? []);
  // 已在过往周目见过的知识也揭示对应技能的模糊轮廓
  const hintKnown = new Set(profile.unlockedHints);

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-1 font-serif text-2xl font-bold">Agent 能力图谱</h1>
      <p className="mb-5 text-sm text-paper-400">
        8 大域 · {index.skills.size} 个能力原子。等级只能由<strong className="text-paper-200">真实行为成就</strong>解锁——做过，才会。
      </p>
      <div className="space-y-6">
        {domains.map((dom) => {
          const skills = [...index.skills.values()].filter((s) => s.domain === dom);
          const unlockedInDom = skills.filter((s) => discovered.has(s.id)).length;
          return (
            <section key={dom}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-paper-400">
                {SKILL_DOMAIN_LABEL[dom]}
                <span className="tag">
                  {unlockedInDom}/{skills.length}
                </span>
              </h2>
              <div className="grid grid-cols-4 gap-3">
                {skills.map((s) => {
                  const lvl = state?.skills[s.id] ?? 0;
                  const fog = s.hiddenUntilDiscovered && lvl === 0 && !hintKnown.has(s.id);
                  return (
                    <div key={s.id} className={`glass text-xs ${fog ? "opacity-50" : ""}`}>
                      <div className="mb-1 flex items-center gap-1">
                        {fog ? (
                          <>
                            <Lock size={11} />
                            <span className="font-semibold text-paper-400">未发现的能力</span>
                          </>
                        ) : (
                          <span className="font-semibold text-paper-100">{s.title}</span>
                        )}
                        {lvl > 0 && (
                          <span className="ml-auto flex">
                            {[1, 2, 3].map((i) => (
                              <span key={i} className={`ml-0.5 h-2 w-2 rounded-full ${i <= lvl ? "bg-accent" : "bg-ink-600"}`} />
                            ))}
                          </span>
                        )}
                      </div>
                      {fog ? (
                        <p className="text-paper-400">随着剧情推进，这里会显现一项你尚未掌握的能力。</p>
                      ) : (
                        <>
                          <p className="mb-1 leading-relaxed text-paper-200">{s.description}</p>
                          <p className="text-paper-400">何时用：{s.whenToUse}</p>
                          {s.behaviors.length > 0 && (
                            <div className="mt-2 space-y-0.5">
                              {s.behaviors.map((b) => (
                                <p key={b.id} className={achievements.has(b.achievementId) ? "text-mint" : "text-paper-400"}>
                                  {achievements.has(b.achievementId) ? "✓" : "○"} Lv.{b.level}：{b.description}
                                </p>
                              ))}
                            </div>
                          )}
                          {(s.toolMappings.claudeCode || s.toolMappings.codex || s.toolMappings.deepseekHarness || s.toolMappings.generic) && (
                            <div className="mt-2 border-t border-ink-700 pt-1 text-paper-400">
                              {s.toolMappings.claudeCode && <p>Claude Code → {s.toolMappings.claudeCode}</p>}
                              {s.toolMappings.codex && <p>Codex → {s.toolMappings.codex}</p>}
                              {s.toolMappings.deepseekHarness && <p>DSH → {s.toolMappings.deepseekHarness}</p>}
                              {!s.toolMappings.claudeCode && !s.toolMappings.codex && !s.toolMappings.deepseekHarness && s.toolMappings.generic && (
                                <p>通用 → {s.toolMappings.generic}</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
