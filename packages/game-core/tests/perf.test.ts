import { describe, it, expect } from "vitest";
import { createState, serializeSave, validateSave } from "../src/index.js";

/** Q003：模拟 1000 事件历史的大存档，序列化+读取 < 2 秒 */
describe("大存档性能（Q003）", () => {
  it("1000 条事件历史 + 50 延迟 + 60 资产的存档往返 < 2 秒", () => {
    const state = createState(
      {
        id: "research_30d_proposal",
        title: "t",
        subtitle: "s",
        description: "d",
        type: "research",
        cover: "c",
        startMissionId: "m1",
        endingPool: [],
        defaultState: {},
        skillFocus: [],
        estimatedMinutes: 60,
        totalDays: 30,
      },
      "性能",
      "pt_perf",
    );
    for (let d = 1; d <= 1000; d++) {
      state.eventLog.push({ day: (d % 30) + 1, eventId: `e${d}`, choiceId: "c", choiceText: `选择${d}`, response: "反馈".repeat(20) });
      state.decisionLog.push({ day: (d % 30) + 1, eventId: `e${d}`, eventTitle: `事件${d}`, choiceId: "c", choiceText: `选择${d}`, delayed: d % 7 === 0, learningPoint: "学习点" });
      if (d % 20 === 0) {
        state.assets.push({ id: `a${d}`, type: "document", name: `资产${d}`, description: "d", content: "内容".repeat(50), version: 2, createdAtDay: d, history: [{ day: 1, action: "创建" }] });
      }
      if (d % 20 === 0) state.delayedQueue.push({ id: `q${d}`, sourceEventId: `e${d}`, eventId: `ev${d}`, scheduledDay: 29 });
    }
    const t0 = Date.now();
    const env = serializeSave(state, { slot: 9, label: "perf", contentVersion: "1.0.0", appVersion: "1.0.0" });
    const json = JSON.stringify(env);
    const parsed = JSON.parse(json);
    const r = validateSave(parsed);
    const elapsed = Date.now() - t0;
    expect(r.ok).toBe(true);
    expect(r.envelope!.state.eventLog.length).toBe(1000);
    expect(json.length).toBeGreaterThan(100000);
    expect(elapsed).toBeLessThan(2000);
  });
});
