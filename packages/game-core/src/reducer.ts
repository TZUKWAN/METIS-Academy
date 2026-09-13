import type { ContentIndex } from "@metis/content-schema";
import type { GameState } from "./state.js";
import { evaluateCondition } from "./conditions.js";
import { applyEffects } from "./effects.js";
import { collectTriggeredEvents, missionEntryEvent } from "./triggers.js";
import { canSpend, nextDay, spendCost } from "./time.js";
import {
  completeMission,
  evaluateMission,
  failMission,
  pickNextMission,
  skipMission,
  startMission,
} from "./missions.js";
import { recomputeSkills } from "./skills.js";
import { resolveEnding, shouldResolveEnding } from "./ending-resolver.js";
import { num } from "./state.js";
import { mulberry32 } from "@metis/shared";

export type GameAction =
  | { type: "startMission"; missionId: string }
  | { type: "skipMission"; missionId: string }
  | { type: "advance" } // 无选择事件继续
  | { type: "choose"; choiceId: string }
  | { type: "endDay" }
  | { type: "dismissFeedback" };

export interface ReducerResult {
  state: GameState;
  autosave: boolean;
  endingResolved: boolean;
  error?: string;
}

function queueEvent(state: GameState, eventId: string): void {
  if (!state.pendingEvents.includes(eventId) && state.currentEventId !== eventId) {
    state.pendingEvents.push(eventId);
  }
}

function visit(state: GameState, eventId: string): void {
  state.currentEventId = eventId;
  if (!state.visitedEvents.includes(eventId)) state.visitedEvents.push(eventId);
}

function beginNextEvent(state: GameState, index: ContentIndex): void {
  const nextId = state.pendingEvents.shift();
  if (!nextId) {
    state.currentEventId = null;
    return;
  }
  visit(state, nextId);
  const event = index.events.get(nextId);
  if (!event) {
    state.currentEventId = null;
    return;
  }
  // 进入事件即应用自动效果
  applyEffects(state, event.automaticEffects, index, num(state, "day"));
  for (const f of event.flags ?? []) {
    applyEffects(state, [{ kind: "setFlag", key: f.key, value: f.value }], index, num(state, "day"));
  }
  for (const k of event.knowledgeUnlocks ?? []) {
    applyEffects(state, [{ kind: "unlockKnowledge", knowledgeId: k }], index, num(state, "day"));
  }
  for (const d of event.delayedEffects ?? []) {
    applyEffects(
      state,
      [
        {
          kind: "scheduleEvent",
          eventId: d.eventId,
          offsetDays: d.offsetDays,
          onDay: d.onDay,
          condition: d.condition,
        },
      ],
      index,
      num(state, "day"),
    );
  }
  recomputeSkills(state, index);
  // 无 choices 的 story 事件自动登记日志
  if (!event.choices || event.choices.length === 0) {
    state.eventLog.push({ day: num(state, "day"), eventId: event.id });
  }
}

function finishEventFlow(state: GameState, index: ContentIndex): void {
  state.currentEventId = null;
  if (state.pendingEvents.length > 0) {
    beginNextEvent(state, index);
  }
}

function checkEnding(state: GameState, index: ContentIndex, result: ReducerResult): void {
  const verdict = shouldResolveEnding(state, index);
  if (verdict.ended) {
    const ending = resolveEnding(state, index);
    state.ended = true;
    state.endingId = ending.id;
    state.pendingEvents = [];
    state.currentEventId = null;
    result.endingResolved = true;
    result.autosave = true;
  }
}

function checkMissionProgress(state: GameState, index: ContentIndex, result: ReducerResult): void {
  if (!state.currentMissionId || state.ended) return;
  const mission = index.missions.get(state.currentMissionId);
  if (!mission) return;
  const evalRes = evaluateMission(state, mission, index);
  if (evalRes.completed) {
    completeMission(state, mission);
    applyEffects(state, mission.rewards, index, num(state, "day"));
    recomputeSkills(state, index);
    const next = pickNextMission(state, mission, index);
    if (next.goto) {
      state.missionStates[next.goto] = { status: state.missionStates[next.goto]?.status ?? "available" };
    } else {
      checkEnding(state, index, result); // 最终任务完成 → 结算
    }
    result.autosave = true;
  } else if (evalRes.failed) {
    failMission(state, mission);
    const next = pickNextMission(state, mission, index);
    if (!next.goto) {
      checkEnding(state, index, result); // 失败且无分支 → 结算（BAD END）
    } else {
      state.missionStates[next.goto] = { status: "available" };
    }
    result.autosave = true;
  }
}

/** 主 reducer：所有状态修改唯一入口（C001 验收：不允许 UI 任意改状态） */
export function reducer(state: GameState, action: GameAction, index: ContentIndex): ReducerResult {
  const next = structuredClone(state) as GameState;
  const result: ReducerResult = { state: next, autosave: false, endingResolved: false };
  if (next.ended && action.type !== "dismissFeedback") return result;

  switch (action.type) {
    case "startMission": {
      const r = startMission(next, action.missionId, index);
      if (!r.ok) {
        result.error = r.reason;
        return result;
      }
      const entry = missionEntryEvent(next, index);
      if (entry) queueEvent(next, entry);
      if (next.currentEventId === null) beginNextEvent(next, index);
      result.autosave = true;
      break;
    }
    case "skipMission": {
      const mission = index.missions.get(action.missionId);
      if (!mission || !skipMission(next, mission)) {
        result.error = "该任务不可跳过";
        return result;
      }
      break;
    }
    case "advance": {
      if (!next.currentEventId) {
        // 无事件时尝试补充触发
        const triggered = collectTriggeredEvents(next, index, "dayStart");
        triggered.forEach((id) => queueEvent(next, id));
        if (next.pendingEvents.length > 0) beginNextEvent(next, index);
        else result.error = "当前没有剧情事件";
        return result;
      }
      const event = index.events.get(next.currentEventId);
      const after = event?.next;
      applyChoiceFeedback(next, null, event?.choices ? undefined : undefined);
      if (after) queueEvent(next, after);
      finishEventFlow(next, index);
      checkMissionProgress(next, index, result);
      checkEnding(next, index, result);
      break;
    }
    case "choose": {
      if (!next.currentEventId) {
        result.error = "当前没有待决策事件";
        return result;
      }
      const event = index.events.get(next.currentEventId);
      const choice = event?.choices?.find((c) => c.id === action.choiceId);
      if (!event || !choice) {
        result.error = "选择项不存在";
        return result;
      }
      if (choice.requirements && !evaluateCondition(next, choice.requirements, index)) {
        result.error = choice.requirementHint ?? "条件不满足";
        return result;
      }
      if (choice.cost && !canSpend(next, choice.cost)) {
        result.error = "行动点或资源不足";
        return result;
      }
      if (choice.assetRequirements) {
        for (const req of choice.assetRequirements) {
          if (next.assets.filter((a) => a.type === req.type).length < (req.minCount ?? 1)) {
            result.error = "缺少所需资产";
            return result;
          }
        }
      }
      spendCost(next, choice.cost ?? {});
      let effects = choice.hiddenEffects ?? [];
      let response = choice.visibleResponse;
      let nextEvent = choice.next;
      // 技能检定
      if (choice.skillCheck) {
        const level = next.skills[choice.skillCheck.skillId] ?? 0;
        const roll = mulberry32(next.rngSeed + next.decisionLog.length * 31 + next.visitedEvents.length)();
        const passed = roll * 100 + level * 12 >= choice.skillCheck.difficulty;
        next.lastChoiceSkillCheck = { skillId: choice.skillCheck.skillId, passed };
        effects = [...effects, ...(passed ? choice.skillCheck.onSuccess.effects ?? [] : choice.skillCheck.onFailure.effects ?? [])];
        response = passed
          ? choice.skillCheck.onSuccess.response ?? response
          : choice.skillCheck.onFailure.response ?? response;
        nextEvent = passed
          ? choice.skillCheck.onSuccess.next ?? nextEvent
          : choice.skillCheck.onFailure.next ?? nextEvent;
      }
      // AI 评估分支（无 AI 时走规则回退；真实 AI 分支在 UI 层先请求再进入 choose）
      if (choice.aiBranch) {
        const fallbackPass = choice.aiBranch.fallbackCondition
          ? evaluateCondition(next, choice.aiBranch.fallbackCondition, index)
          : false;
        const branch = fallbackPass ? choice.aiBranch.onPass : choice.aiBranch.onFail;
        effects = [...effects, ...(branch.effects ?? [])];
        response = branch.response ?? response;
        nextEvent = branch.next ?? nextEvent;
      }
      const day = num(next, "day");
      applyEffects(next, effects, index, day);
      for (const d of choice.delayed ?? []) {
        applyEffects(
          next,
          [{ kind: "scheduleEvent", eventId: d.eventId, offsetDays: d.offsetDays, onDay: d.onDay, condition: d.condition }],
          index,
          day,
        );
      }
      for (const k of choice.unlockKnowledge ?? []) {
        applyEffects(next, [{ kind: "unlockKnowledge", knowledgeId: k }], index, day);
      }
      recomputeSkills(next, index);
      next.lastFeedback = response ?? null;
      next.eventLog.push({
        day,
        eventId: event.id,
        choiceId: choice.id,
        choiceText: choice.text,
        response: response ?? undefined,
      });
      if (event.type === "decision" || event.keyDecision) {
        next.decisionLog.push({
          day,
          eventId: event.id,
          eventTitle: event.setup?.[0] ?? event.id,
          choiceId: choice.id,
          choiceText: choice.text,
          delayed: (choice.delayed?.length ?? 0) > 0,
          learningPoint: event.learningPoint,
        });
      }
      if (nextEvent) queueEvent(next, nextEvent);
      finishEventFlow(next, index);
      checkMissionProgress(next, index, result);
      checkEnding(next, index, result);
      result.autosave = true;
      break;
    }
    case "endDay": {
      if (next.currentEventId) {
        result.error = "还有剧情未处理完";
        return result;
      }
      const day = num(next, "day");
      // 白天追加的日末事件
      collectTriggeredEvents(next, index, "dayEnd").forEach((id) => queueEvent(next, id));
      if (next.pendingEvents.length > 0) {
        beginNextEvent(next, index);
        result.error = "日末事件需要先处理";
        return result;
      }
      const { dueDelayed, dayStarted } = nextDay(next, index);
      dueDelayed.forEach((id) => queueEvent(next, id));
      // 新的一天：mission entry / dayStart 事件
      const entry = missionEntryEvent(next, index);
      if (entry && !next.pendingEvents.includes(entry)) queueEvent(next, entry);
      collectTriggeredEvents(next, index, "dayStart")
        .filter((id) => !next.pendingEvents.includes(id))
        .forEach((id) => queueEvent(next, id));
      if (next.currentEventId === null && next.pendingEvents.length > 0) beginNextEvent(next, index);
      checkMissionProgress(next, index, result);
      checkEnding(next, index, result); // 日数耗尽 → 结算
      result.autosave = true;
      void dayStarted;
      void day;
      break;
    }
    case "dismissFeedback":
      next.lastFeedback = null;
      break;
  }
  return result;
}

function applyChoiceFeedback(_s: GameState, _c: unknown, _e: unknown): void {
  // 预留：无选择事件的反馈处理
}
