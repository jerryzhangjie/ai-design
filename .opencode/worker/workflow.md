---
workflow: prototype
version: 2
---

# 原型设计流程

## 步骤定义

1. [plan] 需求分析与计划
   - agent: project-manager
   - 产出: 执行计划（对话中展示）
   - 下一: user_gate_plan

2. [user_gate_plan] 用户确认计划
   - type: user_gate
   - 下一: parallel_design_prd

3. [parallel_design_prd] PRD与设计并行执行
   - type: parallel
   - agents: [product-manager, ui-designer]
   - 并行产出:
     - product-manager: .opencode/work/prd.md
     - ui-designer: .opencode/work/design.md
   - 下一: user_gate_design_prd
   - 说明: 产品经理和UI设计师同时工作，都基于用户需求

4. [user_gate_design_prd] 用户确认PRD和设计
   - type: user_gate
   - 下一: code

5. [code] 代码生成
   - agent: frontend-expert
   - 依赖: .opencode/work/prd.md, .opencode/work/design.md
   - 产出: src/ 下的 .vue 文件
   - 下一: qa

6. [qa] 质量验证
   - agent: qa-engineer
   - 产出: .opencode/work/qa-report.md
   - 下一: done

7. [done] 完成
   - type: terminal
