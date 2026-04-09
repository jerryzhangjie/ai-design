# 工作流程定义

> 此文件为单一事实源，定义了多 Agent 流程的步骤顺序。不可被任何 Agent 修改。

## 流程步骤

| 步骤 | Agent | 描述 | 产出 |
|------|-------|------|------|
| plan | project-manager | 需求分析，生成执行计划 | 执行计划文档 |
| user_gate_plan | - | 用户确认执行计划 | 用户决策 |
| parallel_design_prd | product-manager + ui-designer | 并行生成PRD和设计规范 | prd.md / prd-mindmap.json / prd-converted.json / design.md |
| user_gate_design_prd | - | 用户确认PRD和设计 | 用户决策 |
| frontend_arch | frontend-manager | 搭建路由/状态基建及占位文件，输出开发计划 | router / store / views占位 / frontend-plan.md |
| frontend_common | frontend-component-expert | 开发公共组件与工具函数 | src/components/ / src/utils/ |
| frontend_modules | frontend-module-developer | 开发具体业务页面 | src/views/ 完善实现 |
| qa | qa-engineer | 构建验证与功能检查 | qa-report.md |
| serve | - | 启动开发服务器 | 运行状态 |

## 流程规则

1. **顺序执行**：必须按步骤顺序执行，禁止跳步
2. **用户确认**：每个 user_gate 步骤必须等待用户确认后才能继续
3. **产出验证**：每个 agent 步骤完成后必须验证产出物存在且非空
4. **状态更新**：process.md 必须在每个步骤完成后立即更新

## Agent 职责与文件边界

| Agent | 可写目录 | 产出文件 | 读取文件 |
|-------|---------|---------|---------|
| project-manager | .opencode/worker/ | process.md | workflow.md, process.md |
| product-manager | .opencode/work/ | prd.md, prd-mindmap.json, prd-converted.json | 用户需求 |
| ui-designer | .opencode/work/ | design.md | 用户需求 |
| frontend-manager | src/router/, src/store/, src/App.vue, src/views/*占位, .opencode/work/ | frontend-plan.md, 路由/状态基建, 占位文件 | prd.md, design.md |
| frontend-component-expert | src/components/, src/utils/ | 公共组件, 工具函数 | frontend-plan.md, design.md |
| frontend-module-developer | src/views/ | 业务页面 | prd.md, frontend-plan.md, design.md |
| qa-engineer | .opencode/work/ | qa-report.md | prd.md, frontend-plan.md, design.md, src/ |

## 修改循环

当用户在 user_gate_design_prd 步骤选择 B/C/D 时：

| 选择 | 操作 | 调用的 Agent |
|------|------|-------------|
| B（调整需求） | 清除所有产出物，回到 plan 步骤 | 项目经理重新分析 |
| C（仅调整设计） | 清除 design.md，保留 PRD | 重新调用 ui-designer（附带修改意见） |
| D（全部重来） | 清除所有产出物 | 重新并行调用 product-manager + ui-designer（附带修改意见） |

修改迭代完成后，回到 user_gate_design_prd 重新确认，最多循环 3 次。

## 动态规划

- 简单修改（如"修改按钮颜色"）：plan → frontend-manager(模式B) → qa
- 正常/复杂需求：完整走 frontend_arch → frontend_common → frontend_modules → qa
