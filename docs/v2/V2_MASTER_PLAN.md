# V2 Master Plan — METIS Academy 产品化重构

## 目标

把 METIS Academy 从"功能骨架已存在但产品质感和真实验收明显不足"的状态，持续重构到真正可以公开发布的高质量桌面游戏状态。

## 里程碑

| ID | 名称 | 状态 |
|---|---|---|
| M0 | Baseline Audit | ✅ 完成 |
| M1 | Design System（tokens/glass/typography） | ✅ 完成 |
| M2 | App Shell 重构 | ✅ 完成 |
| M3 | Home 页面 5-Pass | ✅ 完成 |
| M4 | Story 页面 5-Pass | ✅ 完成 |
| M5 | Workbench 5-Pass（最高优先级） | ✅ 完成 |
| M6 | Studio 5-Pass | ✅ 完成 |
| M7 | Skills 5-Pass | ✅ 完成 |
| M8 | Library 5-Pass | ✅ 完成 |
| M9 | Settings 5-Pass | ✅ 完成 |
| M10 | Onboarding/Ending/Save | ✅ 完成 |
| M11 | Gameplay polish | ✅ 完成 |
| M12 | Agent polish | ✅ 完成 |
| M13 | Visual regression | ✅ 完成 |
| M14 | Package QA | ✅ 完成 |
| M15 | Final acceptance | ✅ 完成 |

## 核心变更清单

### 设计系统
- 新增 `design/tokens.css` 统一色彩/间距/圆角/阴影/动效
- 三层毛玻璃材质 Glass-0/1/2/3
- 冷蓝偏靛主色 `#6C7CFF` + 辅助 `#46C8FF`
- 三层背景（深蓝黑 + Aurora 渐变 + 噪点网格）
- 统一 4/8px 间距系统

### App Shell
- 新增 Aurora 背景层
- 导航 Rail 加 Tooltip + 主线状态 + 分离器
- 顶栏 Day/Mission 状态
- 页面切换动画

### 组件库
- GlassPanel / GlassCard / PageHeader / EmptyState / StatusDot
- Badge / Tabs / Progress / SegmentedControl

### 页面重构（全部 10+ 页面）
- Home / Story / Workbench / Studio / Skills / Library / Settings
- 统一 PageHeader + GlassPanel + 空状态引导

### 工程质量
- 清理 UI 中暴露的开发编号 `(G002)` / `(D014)` 等
- 清理工程注释式文案（"渲染进程无Shell权限，命令经主进程白名单执行"等）
- 全部 101 单元测试 + 10 E2E + bot 9/9 持续通过
