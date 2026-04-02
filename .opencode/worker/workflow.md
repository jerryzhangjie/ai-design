---
workflow: prototype
version: 1
---

# 原型设计流程

## 步骤定义

1. [plan] 需求分析与计划
   - agent: project-manager
   - 产出: 执行计划（对话中展示）
   - 下一: user_gate_plan

2. [user_gate_plan] 用户确认计划
   - type: user_gate
   - 下一: prd

3. [prd] 需求分析与PRD输出
   - agent: product-manager
   - 依赖: 用户确认的计划
   - 产出: .opencode/work/prd.md
   - 下一: user_gate_prd

4. [user_gate_prd] 用户确认PRD
   - type: user_gate
   - 下一: design

5. [design] UI设计与规范
   - agent: ui-designer
   - 依赖: .opencode/work/prd.md
   - 产出: .opencode/work/design.md
   - 下一: user_gate_design

6. [user_gate_design] 用户确认设计
   - type: user_gate
   - 下一: code

7. [code] 代码生成
   - agent: frontend-expert
   - 依赖: .opencode/work/design.md
   - 产出: src/ 下的 .vue 文件
   - 下一: qa

8. [qa] 质量验证
   - agent: qa-engineer
   - 产出: .opencode/work/qa-report.md
   - 下一: done

9. [done] 完成
   - type: terminal
