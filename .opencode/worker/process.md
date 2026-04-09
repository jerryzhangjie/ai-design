---
# ===========================================
# process.md - 多Agent团队执行状态文件
# ===========================================
# 规则：
# 1. 此文件只包含 YAML frontmatter，不写正文
# 2. 每个步骤完成后立即更新，不能延迟到下一步
# 3. 字段值必须使用下方定义的枚举值，不能自创
# 4. 读取时直接解析 YAML，不依赖自然语言理解
# ===========================================

# ----- 核心状态 -----
# task: 必填，用户需求原话，不做任何修改
task: ""

# status: 流程整体状态
# 枚举值：
#   ""            - 未初始化（首次创建时）
#   in_progress    - 执行中
#   done           - 全部完成
#   cancelled      - 用户取消
status: ""

# current: 当前正在执行的步骤名称
# 枚举值（严格对应 workflow.md）：
#   plan                    - 需求分析
#   user_gate_plan          - 等待用户确认计划
#   parallel_design_prd     - 并行生成PRD和设计
#   user_gate_design_prd    - 等待用户确认PRD和设计
#   frontend_arch           - 前端架构基建
#   frontend_common         - 公共组件开发
#   frontend_modules        - 业务页面开发
#   qa                      - 质量验证
#   serve                    - 启动开发服务器
current: ""

# ----- 步骤进度 -----
# completed: 已完成的步骤名称列表（按执行顺序）
# 值必须是 current 枚举值中的子集
completed: []

# pending: 待执行的步骤名称列表
# 值必须是 current 枚举值中的子集，且与 completed 无交集
pending: []

# ----- 循环控制 -----
# qa_fix_count: QA修复循环计数
# 范围: 0-3，达到3时停止修复并通知用户
qa_fix_count: 0

# design_iteration: 设计迭代计数
# 范围: 0-3，达到3时停止迭代并通知用户
# 每次用户在 user_gate_design_prd 选 B/C/D 时 +1
design_iteration: 0

# ----- 产出物路径 -----
# artifacts: 各步骤产出文件的相对路径（相对于项目根目录）
# 值为文件路径字符串，未产出时保留默认值
# 文件存在 = 该步骤产出已完成，文件不存在 = 该步骤未完成或产出丢失
artifacts:
  prd: .opencode/work/prd.md
  prd_mindmap: .opencode/work/prd-mindmap.json
  prd_converted: .opencode/work/prd-converted.json
  design: .opencode/work/design.md
  frontend_plan: .opencode/work/frontend-plan.md
  qa_report: .opencode/work/qa-report.md
  build_success: .opencode/work/.build-success

# ----- 需求摘要 -----
# plan 步骤填充，后续步骤只读
requirement:
  # original: 用户需求原话，保留用户输入不做任何修改
  original: ""

  # clarity: 需求明确度
  # 枚举值：
  #   clear       - 明确（角色+目标都清楚，可直接执行）
  #   partial     - 部分明确（角色或目标有一个不清楚，需要1次澄清）
  #   unclear     - 不明确（角色和目标都不清楚，需要场景化引导）
  clarity: ""

  # role: 目标用户角色
  # 枚举值：
  #   visitor     - 访客（无需登录）
  #   customer     - 客户（需要登录）
  #   employee     - 员工（内部管理）
  #   unknown      - 未定（需进一步澄清）
  role: ""

  # goal: 核心目标一句话总结
  # 示例: "展示银行形象和业务信息"
  goal: ""

  # complexity: 需求复杂度，决定动态规划路径
  # 枚举值：
  #   simple       - 简单修改（如改按钮颜色），跳过PRD和设计
  #   medium       - 中等需求（如添加搜索功能），完整流程
  #   complex      - 复杂需求（如新建用户管理模块），完整流程
  #   design_only  - 纯设计咨询，只出设计规范
  complexity: ""

  # page_count: 预估页面数量
  # 范围: 0-20，0表示未定
  page_count: 0

# ----- 用户决策记录 -----
# 每次 user_gate 步骤完成后更新
decisions:
  # plan_choice: 用户在 user_gate_plan 的选择
  # 枚举值：
  #   A     - 确认计划，开始执行
  #   B     - 调整需求（回到 plan 重新分析）
  #   C     - 取消任务
  #   ""    - 尚未决策
  plan_choice: ""

  # plan_feedback: 用户在 plan 步骤补充的意见
  # 选 B 时填写用户的具体调整要求，选 A/C 时为空
  plan_feedback: ""

  # design_choice: 用户在 user_gate_design_prd 的选择
  # 枚举值：
  #   A     - 确认，开始生成代码工程
  #   B     - 调整需求（返回需求阶段重新分析）
  #   C     - 仅调整设计样式（保留PRD，重新生成design.md）
  #   D     - 重新生成PRD和设计（全部重来）
  #   ""    - 尚未决策
  design_choice: ""

  # design_feedback: 用户在设计确认步骤的修改意见原话
  # 选 C/D 时填写用户的具体修改意见，选 A/B 时为空
  # 此字段会原样附加到 subagent 的 prompt 中
  design_feedback: ""

# ----- 构建状态 -----
# build_verified: npm run build 是否已通过验证
# 枚举值：
#   false - 未验证或验证失败
#   true  - 验证通过（.build-success 文件存在）
build_verified: false
---
