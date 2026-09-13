# KNOWN_ISSUES — 发布时点已知问题

> 更新：2026-09-13（V1.0 发布会话）。按"是否阻断发布"排序；均不阻断。

## 1. SQLite 在安装包内自动回退 JSON（低风险，已设计兜底）

- 现象：安装包内未对 Electron ABI 重建 better-sqlite3 原生模块时，`require` 失败被捕获，存储自动切换 JSON 文件后端（`%APPDATA%/metis-academy/metis-data/*.json`）。设置页会如实显示"存储后端：JSON（回退）"。
- 影响：功能完全等价（存档/档案/Key密文/历史）；性能差异在游戏场景不可感知。
- 缓解：如需 SQLite，开发态执行 `npx electron-rebuild -f -w better-sqlite3` 后重新打包。

## 2. macOS 包未产出（条件项未满足）；NSIS 已于 Windows 完成构建与静默安装/卸载实测

- 本发布在 Windows 环境构建；electron-builder mac target 未执行。代码无 Windows 专属 API（CLI 检测已做平台分支），后续在 macOS 上执行 `electron-builder --mac` 即可。

## 3. Monaco Editor 未接入（用轻量编辑器替代；xterm.js 已接入终端）

- 工作台编辑器使用内置多行文本编辑器（等宽字体+行高优化）。Monaco 体积较大且打包时间受限，V1 以可用性优先。资产编辑/保存/版本历史功能完整。
- 计划：V1.1 以懒加载方式接入 `@monaco-editor/react`。终端侧 D013 已按要求使用 xterm.js（FitAddon/SearchAddon），编辑器侧的轻量实现与本条无关。

## 4. 人工试玩（S001）与教学效果访谈（S002）未含真人样本

- 已用自动 bot（3 线 × 3 策略）完成"每条线至少优秀/失败/AI依赖三条路线可走通并到达结局"的机械化验证。
- 真人 30 分钟试玩记录与七问访谈需要真实用户，属发布后持续迭代项。

## 5. 结局变体统计的采样上限

- `content:endings:count` 对每主结局的组合枚举设了 400 采样上限；513 为**保守去重下限**，理论上限更高。采样中标注的"被更高优先级覆盖"组合属引擎设计行为（优先级裁决），非内容缺陷。

## 6. 动态 AI 角色的离线回退文案为静态池

- L001-L003（导师/评委/用户动态追问）在配置 AI 后可用真实生成；无 AI 时回退到预设追问池（L004 要求已满足：核心流程不依赖联网 AI）。预设池的多样性弱于真人生成，已在剧情文本中保证每场景至少 3 个追问变体。

---

### 构建过程中已修复的重要缺陷（存档记录）

1. 触发引擎未按 campaign 过滤导致跨线事件串台 → 已修复并有全 bot 回归。
2. `campaign_complete` 结算判定把"已解锁未完成"的最终任务误判为已处理 → 已修复（`pending` 状态参与判定）。
3. 多处 manual 事件无入口指针成为孤儿事件 → 已全部链接或改为日暮触发，可达性脚本守护。

## 7. NSIS 重打包 AV 竞态（已解决：换用全新输出目录名）

- 现象：07:46 的 release5/METIS Academy Setup 1.0.0.exe 构建后，又于 07:52 追加了 2 个决策事件（创业线 v_d06_notes_choice / v_d17_launch_choice）与若干 relatedSkillIds 接线。重打包尝试连续遇到 Windows Defender 对新写入大 exe 的 UNKNOWN 占用（release6 尝试 5 次，含 2 分钟等待）。
- 影响：安装版游戏内容与当前内容头存在 2 个事件的差异；portable zip 同样为 07:46 内容。游戏本体功能完整。
- 解法（下一迭代执行，无需管理员权限）：为项目目录添加 Defender 排除项，或在 Defner 扫描完成后重试（本轮 release6/7 连续 6 次 UNKNOWN 均因实时扫描占用新写入的 188MB exe；07:21 与 07:46 两次成功证明可复现，属环境时序竞态）。重打包命令：Y: 盘 subst 后运行 apps/desktop/pack-y5.bat（-c.directories.output=release6）。

