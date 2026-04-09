---
workflow: prototype
version: 3
---

# 原型设计流程

> 本文件是步骤模板池，定义所有可能的步骤、agent 映射和产出物。
> 运行时由 project-manager 从模板池中选取步骤，复制到 agent_schedule.json 中作为快照。
> 本文件不可变，禁止修改。

## Agent 注册表

| Agent | 角色 | mode | 默认产出 |
|-------|------|------|---------|
| project-manager | 流程总指挥、用户沟通 | primary | agent_schedule.json、执行计划 |
| product-manager | 需求分析、PRD输出 | subagent | .opencode/doc/prd.md 等 |
| ui-designer | 视觉风格定义 | subagent | .opencode/doc/design.md |
| frontend-manager | 路由/状态基建、占位文件 | subagent | router, store, views占位, frontend-plan.md |
| frontend-component-expert | 公共组件、工具函数 | subagent | components/*.vue, utils/*.js |
| frontend-module-developer | 业务页面实现 | subagent | views/*.vue |
| qa-engineer | 构建验证、功能检查 | subagent | .opencode/doc/qa-report.md |

---

## 步骤模板池

每个步骤定义了完整的元数据，schedule 实例化时从中复制。
schedule 生成后与本文档无运行时依赖关系。

---

### [plan] 需求分析与计划

- **mode**: primary
- **executor**: project-manager
- **agents**: []
- **artifacts**: []
- **description**: |
    项目经理分析用户需求，判定 planType，从步骤模板池中选取步骤，
    生成 agent_schedule.json 快照。同时生成执行计划展示给用户确认。
- **next_candidates**: [user_gate_plan, parallel_design_prd, frontend_arch]

---

### [user_gate_plan] 用户确认计划

- **mode**: user_gate
- **agents**: []
- **artifacts**: []
- **options**:
    - **A**: 确认 → 进入下一步（根据 planType 决定具体步骤）
    - **B**: 调整需求 → 清除 schedule，重新 plan
    - **C**: 取消任务 → currentState = cancelled
- **next_candidates**: [parallel_design_prd, frontend_arch]

---

### [parallel_design_prd] PRD与UI设计并行执行

- **mode**: parallel
- **agents**:
    - product-manager: 需求分析与PRD输出
    - ui-designer: UI设计规范
- **artifacts**:
    - path: .opencode/doc/prd.md
      producedBy: product-manager
    - path: .opencode/doc/prd-mindmap.json
      producedBy: product-manager
    - path: .opencode/doc/prd-converted.json
      producedBy: product-manager
    - path: .opencode/doc/design.md
      producedBy: ui-designer
- **description**: |
    产品经理和UI设计师基于相同的用户需求独立工作，并行产出。
    两者不相互依赖：产品经理不知道UI设计，UI设计师不知道PRD。
    前端阶段的代码同时依赖两者产出。
- **post_action**: |
    步骤完成后，项目经理输出预览地址供用户查看和确认：
    **预览地址：** [http://localhost:8080/preview-ui](http://localhost:8080/preview-ui)
    用户可通过此地址查看 PRD 和设计的可视化效果。
- **next_candidates**: [user_gate_design_prd, done]

---

### [user_gate_design_prd] 用户确认PRD和设计

- **mode**: user_gate
- **agents**: []
- **artifacts**: []
- **options**:
    - **A**: 确认 → 进入 frontend_arch 步骤
    - **B**: 调整需求 → 清除所有产出物，回到 plan
    - **C**: 仅调样式 → 清除 design.md，重新调用 ui-designer
    - **D**: 返回上一步 → 重新执行 parallel_design_prd
- **post_action**: |
    向用户展示预览地址，提醒用户确认：
    **预览地址：** [http://localhost:8080/preview-ui](http://localhost:8080/preview-ui)
- **next_candidates**: [frontend_arch, done]

---

### [frontend_arch] 前端架构搭建

- **mode**: single
- **agents**:
    - frontend-manager: 搭建路由/状态基建及占位文件，输出开发计划
- **depends_on**: [parallel_design_prd]
- **artifacts**:
    - path: .opencode/doc/frontend-plan.md
      producedBy: frontend-manager
    - path: .opencode/doc/.build-success
      producedBy: frontend-manager
- **description**: |
    frontend-manager 读取 prd.md 和 design.md，搭建 Vue 路由、Vuex Store，
    为所有页面创建空占位文件，输出前端开发计划书（frontend-plan.md），
    作为后续 frontend-component-expert 和 frontend-module-developer 的契约文件。
- **next_candidates**: [frontend_common]

---

### [frontend_common] 公共组件开发

- **mode**: single
- **agents**:
    - frontend-component-expert: 开发公共组件与工具函数
- **depends_on**: [frontend_arch]
- **artifacts**: []
- **description**: |
    frontend-component-expert 读取 frontend-plan.md 和 design.md，
    开发 src/components/ 下的公共 UI 组件和 src/utils/ 下的工具函数、Mock 数据引擎。
    严格遵循设计规范的色值映射，所有组件通过 props 传入数据。
- **next_candidates**: [frontend_modules]

---

### [frontend_modules] 业务页面开发

- **mode**: single
- **agents**:
    - frontend-module-developer: 开发具体业务页面
- **depends_on**: [frontend_common]
- **artifacts**: []
- **description**: |
    frontend-module-developer 读取 prd.md、frontend-plan.md、design.md，
    以及 frontend-component-expert 产出的公共组件和工具函数，
    将空白占位页面转化为功能完整的业务模块。
- **next_candidates**: [qa]

---

### [qa] 质量验证

- **mode**: single
- **agents**:
    - qa-engineer: 构建验证和功能检查
- **artifacts**:
    - path: .opencode/doc/qa-report.md
      producedBy: qa-engineer
- **description**: |
    运行构建验证和代码质量检查。
    如果存在 .build-success 标记则跳过构建验证。
    如有必须修复问题，进入 QA 修复循环（最多3次）。
- **next_candidates**: [serve, frontend_arch]

---

### [serve] 启动服务

- **mode**: primary
- **executor**: project-manager
- **agents**: []
- **artifacts**: []
- **description**: |
    检查端口 5173 是否已被占用，如未占用则后台启动 npm run dev，
    等待服务就绪后输出项目运行地址，以 markdown 超链接格式提供给用户。
- **post_action**: |
    步骤完成后，项目经理输出项目运行地址供用户查看：
    **运行地址：** [http://localhost:5173](http://localhost:5173)
- **next_candidates**: [done]

---

### [done] 完成

- **mode**: terminal
- **description**: 任务完成，展示最终结果给用户。

---

## PlanType 路径模板

项目经理在 plan 阶段根据需求复杂度选取路径，从步骤模板池中复制对应步骤到 schedule。

| planType | 路径 | 说明 | 开发步骤 |
|----------|------|------|---------|
| full | plan → user_gate_plan → parallel_design_prd → user_gate_design_prd → frontend_arch → frontend_common → frontend_modules → qa → serve → done | 完整流程：设计+确认+开发+测试 | 3个步骤：arch → common → modules |
| design_only | plan → user_gate_plan → parallel_design_prd → done | 仅设计咨询，无代码开发 | 无开发步骤 |
| simple_fix | plan → user_gate_plan → frontend_common → qa → serve → done | 快速修改，跳过设计阶段 | 1个步骤：仅 common（或按需调整） |
| design_review | plan → user_gate_plan → parallel_design_prd → user_gate_design_prd → done | 设计+确认，无代码开发 | 无开发步骤 |

simple_fix 场景的 agent 选择说明：
- 仅样式修改：frontend_common 步骤只包含 frontend-component-expert
- 需要新页面架构：frontend_arch → frontend_common → frontend_modules（等同于 mini full）

---

## Mode 执行行为定义

项目经理读取 schedule 中当前步骤的 mode，按以下行为执行：

| mode | 含义 | 项目经理行为 | 步骤完成判定 |
|------|------|-------------|------------|
| primary | 项目经理自执行 | 不调用 subagent，自己完成任务；如有 post_action 则执行 | 步骤逻辑执行完 |
| user_gate | 等待用户确认 | 展示产出摘要+预览地址，等待用户选择 A/B/C/D | 用户做出选择 |
| parallel | 并行调用多 agent | 同时 dispatch 当前步骤所有 agents | 所有 agent status=completed + 所有 artifact status=verified |
| single | 调用单个 agent | dispatch agents[0] | 该 agent status=completed + artifact status=verified |
| terminal | 任务完成 | 展示最终结果给用户；如有运行地址则输出超链接 | 不适用 |

---

## 构建状态管理

| 步骤 | 行为 |
|------|------|
| frontend-manager | 构建成功 → 创建 `.opencode/doc/.build-success` 标记 |
| qa-engineer | 检查标记，存在则跳过构建验证 |
