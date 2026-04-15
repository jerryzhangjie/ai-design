---
workflow: prototype
version: 8
---

# 原型设计流程 v8 - 步骤模板池

> 本文件是**步骤模板池**，定义所有可能的步骤、agent 映射、产出物和核心规则。
> 本文件由 project-manager 读取，但**禁止修改**。
> 实际执行时的状态通过 schedule 工具操作 agent_schedule.json。

---

## Agent 注册表

| Agent | 角色 | mode | subagent_type | 默认产出 |
|-------|------|------|---------------|----------|
| project-manager | 流程总指挥、用户沟通 | primary | — | agent_schedule.json、执行计划 |
| product-manager | 需求分析、PRD输出 | subagent | `product-manager` | docs/prd.md 等 |
| ui-designer | 视觉风格定义 | subagent | `ui-designer` | docs/design.md |
| frontend-developer | 前端全栈开发 | subagent | `frontend-developer` | src/ 代码、docs/frontend-plan.md |
| qa-engineer | 构建验证、功能检查 | subagent | `qa-engineer` | docs/qa-report.md |

---

## 核心规则

### 1. subagent 调度必须使用 task 工具

项目经理在调度 subagent 时**必须同时做两件事**：
1. 调用 `schedule` 工具更新 JSON 状态（start/agent-status 等）
2. 调用 `task` 工具执行 subagent（不能只更新状态）

### 2. brainstorm 在需求不明确时使用

plan 步骤内部判断需求是否清晰：
- **需求明确**：用户提供了清晰的项目目标、涉及页面、核心功能描述
- **需求不明确**：用户描述模糊（如"做个网站"），此时应使用 brainstorm skill

### 3. 新项目的虚拟规划阶段

- schedule 不存在时，plan 和 user_gate_plan 是**虚拟步骤**
- 项目经理内部完成需求分析和计划确认
- **用户确认后才创建 schedule**，然后快速完成 plan/user_gate_plan，开始执行实际步骤

### 4. 步骤组绑定关系

| 组 | 步骤链 | 是否必选 | 说明 |
|----|--------|----------|------|
| **plan 组** | plan → user_gate_plan | **必选** | 新项目为虚拟步骤 |
| **design 组** | parallel_design_prd → user_gate_design_prd | 可选 | user_gate_design_prd 始终跟着 parallel_design_prd |
| **dev 组** | frontend_dev → qa → serve | 可选 | 三者绑定，全参与或全不参与 |

---

## Mode 执行行为定义

| mode | 含义 | 项目经理行为 | 步骤完成判定 |
|------|------|-------------|------------|
| `primary` | 项目经理自执行 | 不调用 subagent，自己完成任务 | 步骤逻辑执行完 |
| `user_gate` | 等待用户确认 | 展示产出，使用 question 工具询问，用户选择后 `schedule gate` | 用户做出选择 |
| `parallel` | 并行调用多 agent | `schedule start` → 同一轮中 `dispatch` 所有 agents | 所有 agent completed + 所有 artifact verified |
| `single` | 调用单个 agent | `schedule start` → `dispatch` agents[0] | 该 agent completed + artifact verified |
| `terminal` | 任务完成 | 展示最终结果 | 不适用 |

### user_gate 的 options 执行逻辑

| option key | 行为类型 | 说明 |
|------------|---------|------|
| A | continue | currentStep = step.next |
| B | reset_to_plan | currentStep 回到 plan，重置除 plan 外所有步骤为 pending |
| C | partial_reset | 只重置指定 agent/artifact，其他保持 completed；步骤状态变为 in_progress |
| D | redo_previous | 重做前置步骤；可指定 targetAgent 只重置特定 agent，或重置所有 agents |

### 状态回退逻辑

**核心原则**：状态回退时，步骤状态设为 **in_progress**（表示正在工作中），需要工作的 agent 也设为 **in_progress**，其他已完成的 agent 保持 **completed**。

**场景示例**：parallel_design_prd 完成后进入 user_gate_design_prd，用户不满意需要回退。

1. **选项 C（partial_reset）**：只改 UI，不改 PRD
   - parallel_design_prd 步骤状态变为 **in_progress**
   - ui-designer agent 状态变为 **in_progress**（需要重新工作）
   - product-manager agent 保持 **completed**（无需改动）
   - currentStep 指向 parallel_design_prd

2. **选项 D（redo_previous）**：全部重做
   - parallel_design_prd 步骤状态变为 **in_progress**
   - 所有 agents 状态变为 **in_progress**（都需要重新工作）
   - currentStep 指向 parallel_design_prd

3. **流程推进原则**：
   - 完成一个阶段后，必须使用 `schedule complete` 将当前步骤置为 **completed**
   - 然后使用 `schedule start` 或 `schedule gate` 开启下一个阶段
   - 确保状态流转完整，避免漏更新

---

## 步骤模板池

### [plan] 需求分析与计划

- **mode**: primary
- **agents**: []
- **artifacts**: []
- **两种情况**：
  - **schedule 不存在（虚拟规划）**：内部完成需求分析，不操作 schedule
  - **schedule 已存在**：正常执行，`start` → 分析 → `complete`
- **next**: user_gate_plan

### [user_gate_plan] 用户确认计划

- **mode**: user_gate
- **agents**: []
- **artifacts**: []
- **options**:
  - **A**: 确认计划 → 用户确认后，创建 schedule 并开始执行
  - **B**: 调整需求 → 回到 plan 重新分析
  - **C**: 取消任务 → 终止项目
- **next**: 取决于规划（parallel_design_prd / frontend_dev / done）

### [parallel_design_prd] PRD与UI设计并行执行

- **mode**: parallel
- **agents**:
  - product-manager: 需求分析与PRD输出
  - ui-designer: UI设计规范
- **artifacts**:
  - docs/prd.md (product-manager)
  - docs/prd-mindmap.json (product-manager)
  - docs/prd-converted.json (product-manager)
  - docs/design.md (ui-designer)
- **description**: 两者独立并行工作，项目经理同一轮中发出两个 task 调用
- **next**: [user_gate_design_prd, done]

### [user_gate_design_prd] 用户确认PRD和设计

- **mode**: user_gate
- **agents**: []
- **artifacts**: []
- **options**:
  - **A**: 确认设计 → 进入前端开发阶段
  - **B**: 调整需求 → 回到 plan 重新分析，清除所有设计产出
  - **C**: 仅调样式 → 只重置 UI 设计部分，PRD 保持不变
  - **D**: 返回上一步 → 回到 parallel_design_prd 重新设计（可全部重做或指定部分重做）
- **next**: [frontend_dev, done]

### [frontend_dev] 前端开发

- **mode**: single
- **agents**:
  - frontend-developer: 业务前端页面开发
- **artifacts**:
  - src/* (frontend-developer)
  - docs/frontend-plan.md (frontend-developer)
  - docs/.build-success (frontend-developer)
- **description**: 读取 docs/prd.md 和 docs/design.md（如有），生成前端界面
- **next**: qa

### [qa] 质量验证

- **mode**: single
- **agents**:
  - qa-engineer: 构建验证和功能检查
- **artifacts**:
  - docs/qa-report.md (qa-engineer)
- **description**: 运行构建验证，检查 .build-success 标记，有问题进入 QA 修复循环（最多3次）
- **next**: [serve, frontend_dev]

### [serve] 启动服务

- **mode**: primary
- **executor**: project-manager
- **agents**: []
- **artifacts**: []
- **description**: 检查端口 5173，启动 npm run dev，输出运行地址
- **next**: done

### [done] 完成

- **mode**: terminal
- **description**: 任务完成，展示最终结果

---

## 构建状态管理

| 步骤 | 行为 |
|------|------|
| frontend-developer | 构建成功 → 创建 `docs/.build-success` 标记 |
| qa-engineer | 检查标记，存在则跳过构建验证 |