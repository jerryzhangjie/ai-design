---
workflow: prototype
version: 2
---

# 原型设计流程

## Agent 配置总览

| Agent | 模式 | 描述 | 颜色 |
|-------|------|------|------|
| project-manager | primary | 项目经理 - 流程总指挥 | primary |
| product-manager | subagent | 产品经理 - 需求分析和PRD输出 | info |
| ui-designer | subagent | UI设计师 - 视觉风格定义 | accent |
| frontend-expert | subagent | 前端专家 - Vue 2组件开发 | success |
| qa-engineer | subagent | 测试专家 - 构建验证和功能检查 | warning |

## 步骤定义

### 1. [plan] 需求分析与计划
- agent: project-manager
- 产出: 执行计划（对话中展示）
- 下一: user_gate_plan

### 2. [user_gate_plan] 用户确认计划
- type: user_gate
- 下一: parallel_design_prd
- 选项: A确认 / B调整需求 / C取消

### 3. [parallel_design_prd] PRD与设计并行执行
- type: parallel
- agents: [product-manager, ui-designer]
- 并行产出:
  - product-manager: prd.md, prd-mindmap.json, prd-converted.json
  - ui-designer: design.md
- 下一: user_gate_design_prd

### 4. [user_gate_design_prd] 用户确认PRD和设计
- type: user_gate
- 下一: code
- 选项: A确认 / B调整需求 / C仅调样式 / D返回上一步

### 5. [code] 代码生成
- agent: frontend-expert
- 依赖: prd.md, design.md
- 产出: src/views/, src/components/, router/index.js, .build-success
- 下一: qa

### 6. [qa] 质量验证
- agent: qa-engineer
- 依赖: src/, .build-success（如存在则跳过构建）
- 产出: qa-report.md
- 下一: done

### 7. [serve] 启动服务
- agent: project-manager
- 触发: QA验证通过后用户确认

### 8. [done] 完成
- type: terminal

## 并行工作模式

在 `parallel_design_prd` 步骤中，产品经理和UI设计师同时工作：
- 都基于**相同的用户需求**独立产出
- 两者**不相互依赖**
- 产品经理不知道UI设计，UI设计师不知道PRD
- 前端专家在code阶段同时依赖两者产出

## 构建状态管理

| 步骤 | 行为 |
|------|------|
| frontend-expert | 构建成功 → 创建 `.opencode/work/.build-success` 标记 |
| qa-engineer | 检查标记，存在则跳过构建验证 |
