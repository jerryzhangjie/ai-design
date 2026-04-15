# agent_schedule.json Schema 规范 v8

> **只通过 schedule 工具操作，禁止手动编辑 JSON 文件。**
> **枚举权威源在 schedule.ts 中硬编码**，本文档是可读版本。

---

## 枚举速查

| 类别 | 枚举值 |
|------|--------|
| 步骤状态 | `pending` → `in_progress` → `completed` / `failed` / `cancelled` |
| 产出物状态 | `pending` / `verified` |
| 步骤模式 | `primary` / `user_gate` / `parallel` / `single` / `terminal` |
| 流程状态 | `in_progress` / `done` / `cancelled` |
| 步骤组 | `plan` / `design` / `dev` |
| gate 选项动作 | `continue` / `reset_to_plan` / `partial_reset` / `redo_previous` / `cancel` |

---

## 核心变更（v7 → v8）

1. **淘汰 planType**：不再根据固定的 planType 路径执行，改为基于步骤组动态组装
2. **新增 options 字段**：user_gate 步骤的选项定义在步骤本身，不再硬编码
3. **新增步骤组概念**：plan / design / dev 三个组，组内步骤必选，组间可选
4. **dispatch 命令更新**：需要指定 stepId，不再硬编码 agent→step 映射

---

## 顶层字段

| # | 字段 | 类型 | 必填 | 说明 |
|---|------|------|------|------|
| 1 | task | string | ✅ | 项目名称 |
| 2 | requirement | string | ✅ | 需求描述 |
| 3 | workflow | string | ✅ | 固定 `"prototype"` |
| 4 | workflowVersion | string | ✅ | 固定 `"8"` |
| 5 | currentState | string | ✅ | 流程状态：`in_progress`/`done`/`cancelled` |
| 6 | currentStep | string | ✅ | 当前步骤id 或 `"done"` |
| 7 | lastUpdate | string | ✅ | 更新时间 `yyyy-MM-dd HH:mm:ss` |
| 8 | qa_fix_count | number | ✅ | QA修复次数 ≥ 0 |
| 9 | steps | array | ✅ | 步骤列表 |
| 10 | agentFlow | array | ✅ | agent分发记录 |

> **注意**：v8 中移除了 `planType` 字段。流程由实际存在的步骤决定。

---

## steps 内字段

| # | 字段 | 类型 | 必填 | 说明 |
|---|------|------|------|------|
| 1 | id | string | ✅ | 步骤唯一标识 |
| 2 | name | string | ✅ | 步骤显示名称 |
| 3 | mode | string | ✅ | 执行模式：`primary`/`user_gate`/`parallel`/`single`/`terminal` |
| 4 | status | string | ✅ | 步骤状态 |
| 5 | startedAt | string\|null | ✅ | 开始时间 `yyyy-MM-dd HH:mm:ss` |
| 6 | completedAt | string\|null | ✅ | 完成时间 |
| 7 | userDecision | string\|null | ✅ | 用户在 user_gate 步骤的选择（A/B/C/D） |
| 8 | agents | array | ✅ | agent列表 |
| 9 | artifacts | array | ✅ | 产出物列表 |
| 10 | options | array | ✅ | user_gate 步骤的可选操作列表 |
| 11 | next | string\|null | ✅ | 下一步骤id，`null` 表示流程结束 |

---

## steps.options 内字段（user_gate 步骤）

| # | 字段 | 类型 | 必填 | 说明 |
|---|------|------|------|------|
| 1 | key | string | ✅ | 选项标识：`A`/`B`/`C`/`D` |
| 2 | label | string | ✅ | 选项显示文本 |
| 3 | action | string | ✅ | 执行动作类型 |
| 4 | targetStep | string | 条件必填 | `redo_previous`/`partial_reset` 动作的目标步骤id |
| 5 | targetAgent | string | 条件必填 | `partial_reset` 动作的目标 agent 名 |
| 6 | targetArtifact | string | 条件必填 | `partial_reset` 动作的目标产出物路径 |

### action 类型说明

| action | 说明 | 附加字段 |
|--------|------|---------|
| `continue` | 继续下一步 | — |
| `reset_to_plan` | 重置到 plan 步骤 | — |
| `partial_reset` | 部分重置（只重置特定 agent/artifact） | targetStep, targetAgent, targetArtifact |
| `redo_previous` | 重做前置步骤 | targetStep |
| `cancel` | 取消任务，设置 currentState=cancelled | — |

---

## steps.agents 内字段

| # | 字段 | 类型 | 必填 | 说明 |
|---|------|------|------|------|
| 1 | name | string | ✅ | agent标识，如 `product-manager` |
| 2 | description | string | ✅ | 职责描述 |
| 3 | status | string | ✅ | agent状态：`pending`/`in_progress`/`completed`/`failed` |
| 4 | dispatchedAt | string\|null | ✅ | 分发时间 |
| 5 | completedAt | string\|null | ✅ | 完成时间 |

---

## steps.artifacts 内字段

| # | 字段 | 类型 | 必填 | 说明 |
|---|------|------|------|------|
| 1 | path | string | ✅ | 产出物路径，支持通配符如 `src/*` |
| 2 | producedBy | string | ✅ | 产出agent名 |
| 3 | status | string | ✅ | 状态：`pending`/`verified` |

---

## agentFlow 内字段

| # | 字段 | 类型 | 必填 | 说明 |
|---|------|------|------|------|
| 1 | from | string | ✅ | 固定 `"project-manager"` |
| 2 | to | string | ✅ | 目标agent |
| 3 | step | string | ✅ | 所属步骤id |
| 4 | timestamp | string | ✅ | 分发时间 |

---

## 步骤组定义

### plan 组（必选）

包含步骤：`plan` → `user_gate_plan`

```json
{
  "id": "plan",
  "name": "需求分析与计划",
  "mode": "primary",
  "agents": [],
  "artifacts": [],
  "options": [{ "key": "A", "label": "继续", "action": "continue" }],
  "next": "user_gate_plan"
}
```

```json
{
  "id": "user_gate_plan",
  "name": "用户确认计划",
  "mode": "user_gate",
  "agents": [],
  "artifacts": [],
  "options": [
    { "key": "A", "label": "确认计划，开始执行", "action": "continue" },
    { "key": "B", "label": "调整需求（重新分析）", "action": "reset_to_plan" },
    { "key": "C", "label": "取消任务", "action": "cancel" }
  ],
  "next": "parallel_design_prd"
}
```

### design 组（可选）

包含步骤：`parallel_design_prd` → `user_gate_design_prd`

```json
{
  "id": "parallel_design_prd",
  "name": "PRD与UI设计并行",
  "mode": "parallel",
  "agents": [
    { "name": "product-manager", "description": "需求分析与PRD输出", "status": "pending" },
    { "name": "ui-designer", "description": "UI设计规范", "status": "pending" }
  ],
  "artifacts": [
    { "path": "docs/prd.md", "producedBy": "product-manager", "status": "pending" },
    { "path": "docs/prd-mindmap.json", "producedBy": "product-manager", "status": "pending" },
    { "path": "docs/prd-converted.json", "producedBy": "product-manager", "status": "pending" },
    { "path": "docs/design.md", "producedBy": "ui-designer", "status": "pending" }
  ],
  "options": [{ "key": "A", "label": "继续", "action": "continue" }],
  "next": "user_gate_design_prd"
}
```

```json
{
  "id": "user_gate_design_prd",
  "name": "用户确认PRD和设计",
  "mode": "user_gate",
  "agents": [],
  "artifacts": [],
  "options": [
    { "key": "A", "label": "确认，进入开发", "action": "continue" },
    { "key": "B", "label": "调整需求", "action": "reset_to_plan" },
    { "key": "C", "label": "仅调样式", "action": "partial_reset", "targetStep": "parallel_design_prd", "targetAgent": "ui-designer", "targetArtifact": "docs/design.md" },
    { "key": "D", "label": "返回上一步", "action": "redo_previous", "targetStep": "parallel_design_prd" }
  ],
  "next": "frontend_dev"
}
```

### dev 组（可选）

包含步骤：`frontend_dev` → `qa` → `serve`

```json
{
  "id": "frontend_dev",
  "name": "前端开发",
  "mode": "single",
  "agents": [{ "name": "frontend-developer", "description": "前端全栈开发", "status": "pending" }],
  "artifacts": [
    { "path": "src/*", "producedBy": "frontend-developer", "status": "pending" },
    { "path": "docs/frontend-plan.md", "producedBy": "frontend-developer", "status": "pending" },
    { "path": "docs/.build-success", "producedBy": "frontend-developer", "status": "pending" }
  ],
  "options": [{ "key": "A", "label": "继续", "action": "continue" }],
  "next": "qa"
}
```

```json
{
  "id": "qa",
  "name": "质量验证",
  "mode": "single",
  "agents": [{ "name": "qa-engineer", "description": "构建验证和功能检查", "status": "pending" }],
  "artifacts": [{ "path": "docs/qa-report.md", "producedBy": "qa-engineer", "status": "pending" }],
  "options": [{ "key": "A", "label": "继续", "action": "continue" }],
  "next": "serve"
}
```

```json
{
  "id": "serve",
  "name": "启动服务",
  "mode": "primary",
  "agents": [],
  "artifacts": [],
  "options": [{ "key": "A", "label": "继续", "action": "continue" }],
  "next": "done"
}
```

---

## 校验规则（schedule 工具自动检查）

| 规则 | 说明 |
|------|------|
| 顶层字段完整 | 10个必填字段不可缺失（v8 移除了 planType） |
| step.id 唯一 | 不允许重复 |
| currentStep 有效 | 必须指向存在的步骤或 `"done"` |
| next 链有效 | 指向存在的步骤或 `null` |
| 状态一致性 | currentStep 对应步骤 status 必须是 `in_progress` |
| artifact.verified | 状态为 verified 时文件必须存在且非空（通配符路径除外） |
| options 完整性 | user_gate 步骤必须有 options 数组，每个 option 必须有 key/label/action |

---

## 完整示例（plan + design + dev 完整流程）

```json
{
  "task": "银行官网",
  "requirement": "设计一个银行官网",
  "workflow": "prototype",
  "workflowVersion": "8",
  "currentState": "in_progress",
  "currentStep": "plan",
  "lastUpdate": "2026-04-14 10:00:00",
  "qa_fix_count": 0,
  "steps": [
    {
      "id": "plan",
      "name": "需求分析与计划",
      "mode": "primary",
      "status": "in_progress",
      "startedAt": "2026-04-14 10:00:00",
      "completedAt": null,
      "userDecision": null,
      "agents": [],
      "artifacts": [],
      "options": [{ "key": "A", "label": "继续", "action": "continue" }],
      "next": "user_gate_plan"
    },
    {
      "id": "user_gate_plan",
      "name": "用户确认计划",
      "mode": "user_gate",
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "userDecision": null,
      "agents": [],
      "artifacts": [],
      "options": [
        { "key": "A", "label": "确认计划，开始执行", "action": "continue" },
        { "key": "B", "label": "调整需求（重新分析）", "action": "reset_to_plan" },
        { "key": "C", "label": "取消任务", "action": "cancel" }
      ],
      "next": "parallel_design_prd"
    },
    {
      "id": "parallel_design_prd",
      "name": "PRD与UI设计并行",
      "mode": "parallel",
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "userDecision": null,
      "agents": [
        { "name": "product-manager", "description": "需求分析与PRD输出", "status": "pending", "dispatchedAt": null, "completedAt": null },
        { "name": "ui-designer", "description": "UI设计规范", "status": "pending", "dispatchedAt": null, "completedAt": null }
      ],
      "artifacts": [
        { "path": "docs/prd.md", "producedBy": "product-manager", "status": "pending" },
        { "path": "docs/prd-mindmap.json", "producedBy": "product-manager", "status": "pending" },
        { "path": "docs/prd-converted.json", "producedBy": "product-manager", "status": "pending" },
        { "path": "docs/design.md", "producedBy": "ui-designer", "status": "pending" }
      ],
      "options": [{ "key": "A", "label": "继续", "action": "continue" }],
      "next": "user_gate_design_prd"
    },
    {
      "id": "user_gate_design_prd",
      "name": "用户确认PRD和设计",
      "mode": "user_gate",
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "userDecision": null,
      "agents": [],
      "artifacts": [],
      "options": [
        { "key": "A", "label": "确认，进入开发", "action": "continue" },
        { "key": "B", "label": "调整需求", "action": "reset_to_plan" },
        { "key": "C", "label": "仅调样式", "action": "partial_reset", "targetStep": "parallel_design_prd", "targetAgent": "ui-designer", "targetArtifact": "docs/design.md" },
        { "key": "D", "label": "返回上一步", "action": "redo_previous", "targetStep": "parallel_design_prd" }
      ],
      "next": "frontend_dev"
    },
    {
      "id": "frontend_dev",
      "name": "前端开发",
      "mode": "single",
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "userDecision": null,
      "agents": [
        { "name": "frontend-developer", "description": "前端全栈开发", "status": "pending", "dispatchedAt": null, "completedAt": null }
      ],
      "artifacts": [
        { "path": "src/*", "producedBy": "frontend-developer", "status": "pending" },
        { "path": "docs/frontend-plan.md", "producedBy": "frontend-developer", "status": "pending" },
        { "path": "docs/.build-success", "producedBy": "frontend-developer", "status": "pending" }
      ],
      "options": [{ "key": "A", "label": "继续", "action": "continue" }],
      "next": "qa"
    },
    {
      "id": "qa",
      "name": "质量验证",
      "mode": "single",
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "userDecision": null,
      "agents": [
        { "name": "qa-engineer", "description": "构建验证和功能检查", "status": "pending", "dispatchedAt": null, "completedAt": null }
      ],
      "artifacts": [
        { "path": "docs/qa-report.md", "producedBy": "qa-engineer", "status": "pending" }
      ],
      "options": [{ "key": "A", "label": "继续", "action": "continue" }],
      "next": "serve"
    },
    {
      "id": "serve",
      "name": "启动服务",
      "mode": "primary",
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "userDecision": null,
      "agents": [],
      "artifacts": [],
      "options": [{ "key": "A", "label": "继续", "action": "continue" }],
      "next": "done"
    },
    {
      "id": "done",
      "name": "完成",
      "mode": "terminal",
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "userDecision": null,
      "agents": [],
      "artifacts": [],
      "options": [],
      "next": null
    }
  ],
  "agentFlow": []
}
```