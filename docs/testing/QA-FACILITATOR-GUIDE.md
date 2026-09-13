# QA-FACILITATOR-GUIDE — S001/S002 执行指引（给测试主持人）

> 目的：PHASE S 需要一位**未接触过本项目**的真实用户完成 30 分钟试玩与七问访谈。
> 本指引让任何人（或未来的你）拿到即可执行。注意：构建 Agent 不能代替真人或伪造记录。

## 你需要准备

1. 安装包：`apps/desktop/release-v2/METIS Academy Setup 1.0.0.exe`（92.8 MB，NSIS 安装器）
   - 或免安装版：`apps/desktop/release-v2/METIS Academy-1.0.0-win.zip`（解压即用）
2. 一台 Windows 10/11 电脑（无需任何开发环境、无需 AI Key）
3. 本文件 + `PLAYTEST_RECORDS.md`（打印或分屏）

## S001：30 分钟试玩流程

1. **不要提前讲解任何玩法。** 只说："这是一款关于使用 AI 完成任务的游戏，请从『科研主线』开始，玩 30 分钟，遇到不明白的地方大声说出来。"
2. 全程记录（另一人观察或录屏）：
   - 不知道点哪里的时刻（第几分钟、在哪个界面）
   - 不懂的术语（原文记下）
   - 卡住超过 1 分钟的地方
   - 错过/跳过的教学时刻
   - 出现"无聊"情绪的时间段
3. 30 分钟到点即停，无论进度。
4. 填写 `PLAYTEST_RECORDS.md` 的人工试玩表对应行。

## S002：七问访谈（试玩后立即进行，不提示答案）

逐题口头提问，记录原话回答，**不打分不打断**：

1. AGENTS.md 是干什么的？
2. 什么时候应该开新 Session？
3. Goal 与普通 Prompt 有什么区别？
4. Loop 什么时候用？
5. AI 结果为什么要独立验证？
6. 创业中为什么不能直接开发？
7. 科研中为什么不能直接相信"研究空白"？

判定：≥5 题回答含"核心意思"即教学达标；≤3 题则按任务书要求迭代内容。

## 结果回填

- 试玩表 → `docs/testing/PLAYTEST_RECORDS.md`
- 七问原话 → 同文件 S002 表格
- 发现的 Bug → `docs/progress/KNOWN_ISSUES.md`
- 每题判定 → 更新 `docs/progress/TASK_STATUS.md` 的 S001/S002 为 DONE

## 常见安装问题

- SmartScreen 提示：点"仍要运行"（未购买代码签名证书，属正常）
- 静默安装：`"METIS Academy Setup 1.0.0.exe" /S`
- 卸载：安装目录内 `Uninstall METIS Academy.exe`（已实测：文件全数移除）
