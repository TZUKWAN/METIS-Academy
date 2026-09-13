/** 角色/Agent 头像（TASK-O002）：统一 SVG 插画风格，克制非萌系；每个主要 NPC 独立视觉 */
export function Portrait({ portrait, mood, size = 120 }: { portrait: string; mood?: string; size?: number }): React.JSX.Element {
  const palettes: Record<string, [string, string, string]> = {
    mentor_male_50s: ["#3a4a6b", "#8fa3c7", "#2a3450"],
    senior_female_20s: ["#5b4a6b", "#c7a3c8", "#3f3450"],
    senior_male_20s: ["#3a6b5b", "#8fc7b0", "#2a5044"],
    peer_female_20s: ["#6b5a3a", "#d8c48f", "#4f432a"],
    evaluator_male_60s: ["#555b66", "#a8b0bd", "#3d424b"],
    evaluator_female_30s: ["#6b3a4a", "#d19fae", "#502a36"],
    ai_agent: ["#2f4f6b", "#6fd3e8", "#20384a"],
    c_tech: ["#3a5a6b", "#9fc7d8", "#2a4350"],
    c_design: ["#6b3a5a", "#d8a3c1", "#502a43"],
    c_advisor: ["#4a4a3a", "#c1c19f", "#37372a"],
    c_rival: ["#6b3232", "#d8a3a3", "#502525"],
    c_judge_prelim: ["#4d4d55", "#b0b0bd", "#39393f"],
    c_judge_final: ["#3d3d55", "#a3a3d8", "#2d2d40"],
    v_user_student: ["#3a6b6b", "#a3d8d0", "#2a5050"],
    v_user_club: ["#5a6b3a", "#c9d8a3", "#435028"],
    v_partner: ["#50506b", "#b5b5e0", "#3b3b50"],
    v_mentor: ["#6b5a2a", "#e0cf8f", "#50431e"],
    v_user_shop: ["#6b4a2a", "#d8b98f", "#503720"],
    v_family: ["#5a3a6b", "#c9a3d8", "#432a50"],
  };
  const [bg, skin, dark] = palettes[portrait] ?? ["#39415a", "#a3b2d8", "#2a3044"];
  const smile = mood === "happy" || mood === "pleased";
  const angry = mood === "angry" || mood === "serious";
  const worried = mood === "worried";
  const isAI = portrait === "ai_agent";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="rounded-xl border border-ink-600 shadow-lg" aria-label={`portrait-${portrait}`}>
      <rect width="100" height="100" rx="12" fill={bg} />
      {!isAI ? (
        <g>
          <circle cx="50" cy="42" r="20" fill={skin} />
          <path d="M28 92 Q50 68 72 92 Z" fill={dark} />
          <path d="M30 38 Q50 16 70 38 L70 34 Q50 10 30 34 Z" fill={dark} />
          {angry ? (
            <g stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round">
              <line x1="40" y1="38" x2="46" y2="40" />
              <line x1="60" y1="38" x2="54" y2="40" />
            </g>
          ) : null}
          <circle cx="43" cy="44" r="2.2" fill="#1a1a1a" />
          <circle cx="57" cy="44" r="2.2" fill="#1a1a1a" />
          {smile ? (
            <path d="M42 52 Q50 59 58 52" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
          ) : worried ? (
            <path d="M43 55 Q50 51 57 55" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
          ) : (
            <line x1="44" y1="54" x2="56" y2="54" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
          )}
        </g>
      ) : (
        <g>
          <rect x="30" y="30" width="40" height="40" rx="8" fill="#0f1115" stroke="#6fd3e8" strokeWidth="2" />
          <circle cx="42" cy="46" r="4" fill="#6fd3e8">
            <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="58" cy="46" r="4" fill="#6fd3e8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <rect x="38" y="58" width="24" height="3" rx="1.5" fill="#6fd3e8" opacity="0.7" />
          <text x="50" y="86" textAnchor="middle" fill="#9aa3b2" fontSize="9">
            SIM/CLI
          </text>
        </g>
      )}
    </svg>
  );
}
