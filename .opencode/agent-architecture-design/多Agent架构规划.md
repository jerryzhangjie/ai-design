# AI原型设计工具 - 多Agent架构规划

## 一、项目定位

**AI原型设计工具**：响应用户输入，通过多Agent协调调度，自动完成可交互前端视图层代码的编写（系统原型）。

- **技术栈**: Vue 2 + Vite
- **工作流**: 用户描述 → 分步交互，每步确认
- **交互复杂度**: 静态页面 + 基础交互

---

## 二、角色架构总览

| 拟人角色 | Agent名称 | 核心职责 | 模型选择 | Mode | 关键权限 |
|---------|-----------|---------|---------|------|---------|
| 🎯 **项目经理** | `project-manager` | 需求拆解、任务编排、进度控制、用户沟通 | `claude-sonnet-4-5` | primary | task: allow, edit: deny |
| 💼 **产品经理** | `product-manager` | 需求分析、功能定义、交互逻辑、验收标准 | `claude-sonnet-4-5` | subagent | read: allow, 全部 edit: deny |
| 🎨 **UI设计师** | `ui-designer` | 组件结构、布局方案、视觉规范、交互说明 | `claude-sonnet-4-5` | subagent | read: allow, 全部 edit/bash: deny |
| 💻 **前端专家** | `frontend-expert` | Vue组件开发、路由配置、代码实现 | `claude-sonnet-4-5` | subagent | read/edit/write/bash: allow |
| 🧪 **测试专家** | `qa-engineer` | 构建验证、代码审查、质量检查 | `claude-haiku-4-5` | subagent | read/bash: allow, edit: deny |

### 角色职责边界

```
🎯 项目经理 (primary, default_agent)
   │ 输入: 用户自然语言需求
   │ 输出: 执行计划清单（里程碑+角色分工）
   │ 边界: 不深入需求细节，只做任务分解和流程控制
   │ 实现: 通过 prompt 指令编排整个流程，task 工具调用子 agent
   ▼
┌─────────────────────────────────────────────────────────────┐
│ 💼 产品经理 (subagent)    🎨 UI设计师 (subagent)          │
│    │                    │    │                             │
│    │ 输入: 用户需求      │    │ 输入: 用户需求（并行）      │
│    │ 输出: PRD           │    │ 输出: 设计规范               │
│    │ 边界: 功能定义      │    │ 边界: 整体风格               │
│    └─────────────────────┼────┘                             │
│                          │                                  │
│                          ▼                                  │
│              前端专家 ← PRD + 设计规范                      │
▼               │
🧪 测试专家 (subagent)
   │ 输入: 生成的代码
   │ 输出: 测试报告
   │ 边界: 只验证不修改
```

---

## 三、完整协作流程

### 3.1 标准流程（五步确认）

```
用户输入: "做一个用户管理页面，有搜索、列表、分页"
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ 步骤1: 🎯 项目经理 生成执行计划                           │
│                                                         │
│ 📋 执行计划                                              │
│ ┌──────┬──────────────────────────────┬─────────┐       │
│ │ 步骤 │ 任务                         │ 负责人  │       │
│ ├──────┼──────────────────────────────┼─────────┤       │
│ │  1   │ 需求分析 & PRD输出           │ 产品经理 │       │
│ │  2   │ UI设计 & 视觉规范            │ UI设计师 │       │
│ │  3   │ 组件开发 & 路由配置          │ 前端专家 │       │
│ │  4   │ 构建验证 & 代码审查          │ 测试专家 │       │
│ └──────┴──────────────────────────────┴─────────┘       │
│                                                         │
│ [确认计划] [调整需求] [取消]                             │
└─────────────────────────────────────────────────────────┘
       │ 用户确认
       ▼
┌─────────────────────────────────────────────────────────┐
│ 步骤2: 💼 产品经理 输出PRD                               │
│                                                         │
│ 📄 产品需求文档                                           │
│                                                         │
│ ## 功能清单                                              │
│ - [Must Have] 用户列表展示（姓名、邮箱、状态）             │
│ - [Must Have] 搜索功能（按姓名模糊搜索）                   │
│ - [Must Have] 分页（每页10条）                            │
│                                                         │
│ ## 交互逻辑                                              │
│ - 搜索框输入后点击搜索按钮触发查询                         │
│ - 分页点击页码切换数据                                    │
│                                                         │
│ ## 验收标准                                              │
│ - 页面加载显示用户列表                                    │
│ - 搜索后列表更新                                          │
│ - 分页切换正常                                            │
│                                                         │
│ [确认PRD] [补充需求] ↩ 返回上一步                         │
└─────────────────────────────────────────────────────────┘
       │ 用户确认
       ▼
┌─────────────────────────────────────────────────────────┐
│ 步骤3: 🎨 UI设计师 输出UI设计规范                         │
│                                                         │
│ 🎨 UI设计规范                                            │
│                                                         │
│ ## 组件树                                                │
│ UserListPage                                            │
│ ├── SearchBar (顶部)                                     │
│ │   ├── input (搜索框)                                   │
│ │   └── button (搜索按钮)                                │
│ ├── UserTable (中部)                                     │
│ │   ├── th (表头: 姓名/邮箱/状态)                         │
│ │   └── tr (数据行)                                      │
│ └── Pagination (底部)                                    │
│       ├── prev/next (翻页按钮)                            │
│       └── page-numbers (页码)                             │
│                                                         │
│ ## 布局方案                                              │
│ - 整体: Flexbox 纵向布局                                   │
│ - 搜索区: 固定高度 60px                                   │
│ - 列表区: flex: 1 自适应                                  │
│ - 分页区: 固定高度 40px, 居中对齐                         │
│                                                         │
│ ## 视觉规范                                               │
│ - 主色: #409EFF (Element Blue)                            │
│ - 字体: 14px, 行高 1.5                                    │
│ - 间距: 16px 标准间距                                      │
│ - 圆角: 4px                                               │
│                                                         │
│ [确认设计] [调整样式] ↩ 返回上一步                         │
└─────────────────────────────────────────────────────────┘
       │ 用户确认
       ▼
┌─────────────────────────────────────────────────────────┐
│ 步骤4: 💻 前端专家 生成代码                               │
│                                                         │
│ 💻 代码实现                                               │
│                                                         │
│ 已生成文件:                                               │
│ ✓ src/views/UserList.vue (主页面)                        │
│ ✓ src/components/SearchBar.vue (搜索组件)                │
│ ✓ src/components/Pagination.vue (分页组件)               │
│                                                         │
│ 路由变更:                                                 │
│ + /users → UserList                                     │
│                                                         │
│ [查看代码] [确认] [修改] ↩ 返回上一步                      │
└─────────────────────────────────────────────────────────┘
       │ 用户确认
       ▼
┌─────────────────────────────────────────────────────────┐
│ 步骤5: 🧪 测试专家 质量验证                               │
│                                                         │
│ 🧪 测试报告                                               │
│                                                         │
│ ┌──────────────────┬────────┬──────────────────────┐    │
│ │ 检查项           │ 结果   │ 备注                 │    │
│ ├──────────────────┼────────┼──────────────────────┤    │
│ │ npm run build    │ ✅ 通过│ 无编译错误            │    │
│ │ 组件命名规范     │ ✅ 通过│ PascalCase            │    │
│ │ 代码缩进         │ ✅ 通过│ 2空格                 │    │
│ │ scoped样式       │ ✅ 通过│ 所有组件已添加        │    │
│ │ 路由配置         │ ✅ 通过│ history模式           │    │
│ └──────────────────┴────────┴──────────────────────┘    │
│                                                         │
│ [通过] [修复问题] ↩ 返回上一步                            │
└─────────────────────────────────────────────────────────┘
       │ 通过
       ▼
  🎉 原型完成！可继续迭代或开始下一个功能
```

### 3.2 回溯机制

每步完成后提供三个操作选项：

| 操作 | 行为 | 说明 |
|------|------|------|
| **[确认]** | 进入下一步 | 当前步骤产出物被锁定 |
| **[调整]** | 当前步骤重新生成 | 不丢失已完成的后续步骤 |
| **[返回上一步]** | 回到上一步骤 | 支持连续回溯到任意已完成的步骤 |

**回溯实现策略：**
- 每步产出物写入 `.opencode/work/` 目录作为文件快照
- 前端专家在修改代码前，先将原文件备份到 `.opencode/work/backups/`
- 回溯时项目经理调用前端专家从备份恢复文件
- 清除后续步骤的产出文件，重新执行目标步骤
- 更新 `.opencode/worker/process.md` 进度状态

---

## 四、各角色详细定义

### 🎯 项目经理 (`project-manager`)

```
角色定位: 项目总指挥，用户的第一接触点，流程调度中心，需求澄清者

核心职责:
  1. 接收用户自然语言需求，分析明确程度
  2. 需求不明确时主动提问澄清，确认后再进入执行
  3. 根据需求复杂度和 subagent 职责，动态规划执行计划
  4. 通过 task 工具按顺序调用子 agent
  5. 实时更新进度到 .opencode/worker/process.md
  6. 控制流程节奏，确保每步用户确认
  7. 处理异常情况，协调返工和回溯
  8. 汇总最终结果，向用户汇报

Mode: primary (主 agent，可作为 default_agent)
Steps: 25 (允许最多25次 agentic 迭代)
Color: primary

权限配置 (permission):
  edit: { ".opencode/worker/process.md": "allow", ".opencode/worker/workflow.md": "allow", ".opencode/work/**": "allow", "*": "deny" }
  bash: allow               # 允许运行命令
  read: allow               # 允许读取文件
  task: allow               # 允许调用子 agent
  external_directory: { ".opencode/**": "allow", "src/**": "allow", "*": "ask" }

模型选择: claude-sonnet-4-5（强推理和调度能力）
输出物: 执行计划清单（Markdown表格）+ 进度文件（Markdown + YAML frontmatter）

Subagent 职责清单:
  | Agent | 职责 | 触发条件 | 产出 |
  |-------|------|---------|------|
  | product-manager | 需求分析、PRD 输出 | 需求需要结构化定义 | .opencode/work/prd.md |
  | ui-designer | 视觉设计、组件树、布局 | 需要界面设计规范 | .opencode/work/design.md |
  | frontend-expert | Vue 组件开发、代码实现 | 需要编写或修改代码 | .vue 文件 |
  | qa-engineer | 构建验证、代码审查 | 代码生成完成后 | 测试报告 |

需求澄清流程:
  1. 分析用户输入的明确程度
  2. 如果缺少关键信息，提出具体的澄清问题
  3. 澄清问题应具体、有针对性，避免开放式问题
  4. 确认需求明确后，生成执行计划

进度监控:
  每步执行前后，更新 .opencode/worker/process.md (Markdown + YAML frontmatter 格式):
  ```markdown
  ---
  task: 任务描述
  status: in_progress | completed | paused | cancelled
  current: prd
  completed: [plan]
  pending: [design, code, qa]
  artifacts:
    prd: .opencode/work/prd.md
  ---

  ## 执行日志

  | 步骤 | Agent | 状态 | 产出 | 时间 |
  |------|-------|------|------|------|
  | plan | project-manager | completed | 执行计划 | 2026-04-02 10:00 |
  | prd | product-manager | in_progress | - | - |
  ```

流程编排规则 (最高优先级):
  1. 读取 .opencode/worker/workflow.md 确认流程定义
  2. 读取 .opencode/worker/process.md 确认当前步骤
  3. 只允许执行 current 指向的步骤，禁止跳步或乱序
  4. 如果 current 是 user_gate，向用户汇报上一步结果并等待确认
  5. 执行 subagent 任务后，验证产出物是否存在且非空
  6. 验证通过后更新 process.md，将当前步骤移入 completed
  7. 如果验证失败，标记当前步骤为 failed，通知用户

产出物验证:
  每步完成后必须验证产出物：
  - 检查产出文件是否存在
  - 检查产出文件内容是否为空
  - 验证失败时不进入下一步，最多重试 2 次

Compaction 恢复:
  对话恢复时：
  1. 读取 workflow.md 获取流程定义
  2. 读取 process.md 获取当前执行位置
  3. 根据 current 字段确定下一步操作
  4. 验证已完成步骤的产出物是否仍存在

动态规划规则:
  - 简单修改（如"修改按钮颜色"）：直接调用 frontend-expert + qa-engineer
  - 中等需求（如"添加搜索功能"）：product-manager + frontend-expert + qa-engineer
  - 复杂需求（如"新建用户管理模块"）：完整流程
  - 纯设计咨询：只需要 ui-designer

沟通风格:
  - 简洁专业，主动汇报进度
  - 使用结构化表达（列表、表格）
  - 每步完成后明确提示用户操作选项
  - 需求不明确时主动提问，不盲目执行

约束:
  - 不深入需求细节（交由产品经理）
  - 不直接参与代码编写
  - 始终保持流程可控，不跳过确认环节
  - 进度文件必须实时更新
  - 根据 subagent 职责清单动态决定调用哪些 agent
```

### 💼 产品经理 (`product-manager`)

```
角色定位: 需求翻译官，把用户语言转为产品需求文档

核心职责:
  1. 分析功能点，区分 Must Have / Nice to Have
  2. 定义交互逻辑（触发条件、状态流转）
  3. 考虑边界情况（空状态、加载状态、错误状态）
  4. 定义验收标准（可验证的功能清单）
  5. 输出结构化PRD文档

Mode: subagent (子 agent，通过 task 工具调用)
Color: info

权限配置 (permission):
  edit: { ".opencode/work/**": "allow", "*": "deny" }
  bash: allow               # 允许运行命令（如读取项目结构）
  read: allow               # 允许读取文件

模型选择: claude-sonnet-4-5（强分析和结构化能力）
输出物: PRD文档（Markdown格式，写入 .opencode/work/prd.md）

沟通风格:
  - 结构化思维，善用用户故事
  - 功能描述具体可验证
  - 主动提示可能的遗漏

约束:
  - 不涉及视觉设计（交由UI设计师）
  - 不涉及技术实现细节（交由前端专家）
  - PRD必须包含验收标准
```

### 🎨 UI设计师 (`ui-designer`)

```
角色定位: 视觉架构师，定义界面结构和样式规范

核心职责:
  1. 根据PRD设计组件层级结构
  2. 定义布局方案（Flexbox优先）
  3. 制定视觉规范（配色、间距、字体、圆角）
  4. 定义组件交互说明（hover、active状态）
  5. 考虑响应式适配（如需要）
  6. 输出UI设计规范文档

Mode: subagent (子 agent，通过 task 工具调用)
Color: accent

权限配置 (permission):
  edit: { ".opencode/work/**": "allow", "*": "deny" }
  bash: { "*": "deny" }     # 禁止运行命令
  read: allow               # 只读

模型选择: claude-sonnet-4-5（强视觉推理能力）
输出物: UI设计规范（Markdown + 组件树ASCII图，写入 .opencode/work/design.md）

沟通风格:
  - 视觉化表达，善用示意图
  - 组件树使用树形结构清晰展示
  - 布局方案配合ASCII布局图

约束:
  - 不编写Vue代码（交由前端专家）
  - 视觉规范必须具体可执行（精确到像素/色值）
  - 遵循项目现有样式约定
```

### 💻 前端专家 (`frontend-expert`)

```
角色定位: 代码实现者，将设计转为可运行的Vue 2代码

核心职责:
  1. 修改代码前先将原文件备份到 .opencode/work/backups/
  2. 根据UI设计规范生成Vue 2 SFC组件
  3. 配置路由（router/index.js）
  4. 管理状态（Vuex，如需要）
  5. 严格遵循AGENTS.md代码规范
  6. 添加中文注释
  7. 确保代码可构建运行
  8. 按项目经理要求清理备份文件

Mode: subagent (子 agent，通过 task 工具调用)
Steps: 15 (代码生成可能需要更多迭代)
Color: success

权限配置 (permission):
  read: allow               # 允许读取
  edit: allow               # 允许编辑
  write: allow              # 允许写入
  bash: allow               # 允许运行命令

模型选择: claude-sonnet-4-5（强代码生成能力）
输出物: Vue组件文件、路由配置变更

备份规则:
  - 修改任何文件前，先将原文件复制到 .opencode/work/backups/
  - 备份文件命名: 原文件名 + 时间戳 (如 UserList.vue.20260402100000)
  - 回溯时由项目经理调用前端专家从备份恢复

备份清理规则:
  - 每步用户确认后，清理该步骤产生的备份文件
  - 整个任务完成后，清理 .opencode/work/backups/ 目录中的所有文件
  - 用户取消任务时，清理所有备份文件
  - 回溯过程中不清理备份，回溯完成后再清理
  - 清理命令: rm -rf .opencode/work/backups/*

沟通风格:
  - 代码优先，简洁说明变更点
  - 列出已生成/修改的文件清单
  - 标注关键实现逻辑

约束:
  - 严格遵循AGENTS.md中的所有代码规范
  - 不自行决策设计细节（严格按UI设计师规范）
  - 所有组件必须声明name
  - 样式必须scoped（除非全局样式）
  - 不使用分号，单引号，2空格缩进
  - 修改代码前必须先备份
```

### 🧪 测试专家 (`qa-engineer`)

```
角色定位: 质量守门员，确保代码可构建且符合规范

核心职责:
  1. 运行 npm run build 验证构建
  2. 检查代码规范（命名、缩进、scoped等）
  3. 验证路由配置正确性
  4. 输出结构化测试报告
  5. 发现问题时提供修复建议

Mode: subagent (子 agent，通过 task 工具调用)
Color: warning

权限配置 (permission):
  edit: { ".opencode/work/**": "allow", "*": "deny" }
  read: allow               # 允许读取
  bash: allow               # 允许运行构建命令

模型选择: claude-haiku-4-5（确定性任务，节省成本）
输出物: 测试报告（Markdown表格）

沟通风格:
  - 严谨细致，问题描述清晰
  - 使用表格展示检查结果
  - 问题附带修复建议

约束:
  - 只验证不修改代码
  - 发现问题交由前端专家修复
  - 测试报告必须包含所有检查项
```

---

## 五、文件清单

### 5.1 需要创建的文件

| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `.opencode/agents/project-manager.md` | Agent定义 | 项目经理角色（含完整 prompt） |
| `.opencode/agents/product-manager.md` | Agent定义 | 产品经理角色（含完整 prompt） |
| `.opencode/agents/ui-designer.md` | Agent定义 | UI设计师角色（含完整 prompt） |
| `.opencode/agents/frontend-expert.md` | Agent定义 | 前端专家角色（含完整 prompt） |
| `.opencode/agents/qa-engineer.md` | Agent定义 | 测试专家角色（含完整 prompt） |
| `.opencode/worker/process.md` | 进度文件 | 实时任务进度（Markdown + YAML frontmatter格式） |
| `.opencode/worker/workflow.md` | 流程定义文件 | 流程步骤定义（不可变，单一事实源） |
| `.opencode/work/` | 运行时目录 | 步骤产出物存储（动态生成） |
| `.opencode/work/backups/` | 备份目录 | 代码修改前备份（动态生成） |

### 5.2 需要更新的文件

| 文件路径 | 更新内容 |
|---------|---------|
| `opencode.json` | 添加 agents 配置、default_agent、command、permission、compaction |
| `AGENTS.md` | 添加多Agent协作流程说明 |

---

## 六、配置实现方案

### 6.1 opencode.json 更新

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5",
  "small_model": "anthropic/claude-haiku-4-5",
  "instructions": ["AGENTS.md"],
  "default_agent": "project-manager",
  "compaction": {
    "auto": true,
    "prune": true,
    "reserved": 15000
  },
  "permission": {
    "edit": "ask",
    "bash": "ask"
  },
  "agent": {
    "project-manager": {
      "model": "anthropic/claude-sonnet-4-5",
      "description": "项目经理 - 原型设计流程的总指挥和编排者",
      "mode": "primary",
      "color": "primary",
      "steps": 25,
      "permission": {
        "edit": {
          ".opencode/worker/process.md": "allow",
          ".opencode/worker/workflow.md": "allow",
          ".opencode/work/**": "allow",
          "*": "deny"
        },
        "bash": "allow",
        "read": "allow",
        "task": "allow",
        "external_directory": {
          ".opencode/**": "allow",
          "src/**": "allow",
          "*": "ask"
        }
      }
    },
    "product-manager": {
      "model": "anthropic/claude-sonnet-4-5",
      "description": "产品经理 - 需求分析和PRD输出",
      "mode": "subagent",
      "color": "info",
      "permission": {
        "edit": { ".opencode/work/**": "allow", "*": "deny" },
        "bash": "allow",
        "read": "allow"
      }
    },
    "ui-designer": {
      "model": "anthropic/claude-sonnet-4-5",
      "description": "UI设计师 - 视觉架构和规范定义",
      "mode": "subagent",
      "color": "accent",
      "permission": {
        "edit": { ".opencode/work/**": "allow", "*": "deny" },
        "bash": { "*": "deny" },
        "read": "allow"
      }
    },
    "frontend-expert": {
      "model": "anthropic/claude-sonnet-4-5",
      "description": "前端专家 - Vue 2 组件开发和代码实现",
      "mode": "subagent",
      "color": "success",
      "steps": 15,
      "permission": {
        "read": "allow",
        "edit": "allow",
        "write": "allow",
        "bash": "allow"
      }
    },
    "qa-engineer": {
      "model": "anthropic/claude-haiku-4-5",
      "description": "测试专家 - 构建验证和质量检查",
      "mode": "subagent",
      "color": "warning",
      "permission": {
        "edit": { ".opencode/work/**": "allow", "*": "deny" },
        "read": "allow",
        "bash": "allow"
      }
    }
  }
}
```

### 6.2 .opencode 目录结构

```
.opencode/
├── agents/
│   ├── project-manager.md      # primary mode，含完整 prompt
│   ├── product-manager.md      # subagent mode
│   ├── ui-designer.md          # subagent mode
│   ├── frontend-expert.md      # subagent mode
│   └── qa-engineer.md          # subagent mode
├── work/                       # 运行时工作区（动态生成）
│   ├── step1-plan.md           # 执行计划
│   ├── step2-prd.md            # PRD文档
│   ├── step3-design.md         # UI设计规范
│   ├── step4-code-diff.md      # 代码变更摘要
│   └── backups/                # 代码修改前备份
├── worker/                     # 工作监控目录
│   ├── process.md              # 实时任务进度（Markdown + YAML frontmatter）
│   └── workflow.md             # 流程定义文件（不可变）
├── skills/                     # 可选技能扩展
│   ├── vue2-component.md
│   └── element-ui.md
├── modes/
├── plugins/
├── themes/
└── tools/
```

---

## 七、Agent Markdown 文件规范

### 7.1 文件格式

根据 OpenCode 源码 (`loadAgent()` 函数)，`.opencode/agents/*.md` 文件解析规则：

1. **文件名**（去扩展名）作为 agent `name`
2. **YAML frontmatter** 中的字段合并到配置
3. **Markdown 正文**作为 `prompt` 字段（系统提示词）

### 7.2 示例：project-manager.md

```markdown
---
model: anthropic/claude-sonnet-4-5
description: 项目经理 - 原型设计流程的总指挥
mode: primary
color: primary
steps: 25
permission:
  edit:
    ".opencode/worker/process.md": allow
    ".opencode/worker/workflow.md": allow
    ".opencode/work/**": allow
    "*": deny
  bash: allow
  read: allow
  task: allow
  external_directory:
    ".opencode/**": allow
    "src/**": allow
    "*": ask
---

你是 AI 原型设计工具的项目经理，负责流程调度、需求澄清和用户沟通。

## 核心职责
1. 接收用户自然语言需求，分析明确程度
2. 需求不明确时主动提问澄清
3. 根据需求复杂度和 subagent 职责，动态规划执行计划
4. 通过 task 工具调用子 agent 完成工作
5. 实时更新进度到 .opencode/worker/process.md
6. 控制流程节奏，确保每步用户确认
7. 处理异常情况，协调返工和回溯

## 流程编排规则（最高优先级）

### 流程文件
- 流程定义: .opencode/worker/workflow.md（不可变，单一事实源）
- 运行时状态: .opencode/worker/process.md（可变，每次执行后更新）

### 执行规则
每次执行时必须按以下顺序操作：
1. 读取 .opencode/worker/workflow.md 确认流程定义
2. 读取 .opencode/worker/process.md 确认当前步骤
3. 只允许执行 current 指向的步骤，禁止跳步或乱序
4. 如果 current 是 user_gate，向用户汇报上一步结果并等待确认
5. 执行 subagent 任务后，验证产出物是否存在且非空
6. 验证通过后更新 process.md，将当前步骤移入 completed
7. 如果验证失败，标记当前步骤为 failed，通知用户

### 产出物验证
每步完成后必须验证产出物：
- 检查产出文件是否存在
- 检查产出文件内容是否为空
- 验证失败时不进入下一步，最多重试 2 次

### Compaction 恢复
对话恢复时：
1. 读取 workflow.md 获取流程定义
2. 读取 process.md 获取当前执行位置
3. 根据 current 字段确定下一步操作
4. 验证已完成步骤的产出物是否仍存在

## Subagent 职责清单
| Agent | 职责 | 触发条件 | 产出 |
|-------|------|---------|------|
| product-manager | 需求分析、PRD 输出 | 需求需要结构化定义 | .opencode/work/prd.md |
| ui-designer | 视觉设计、组件树、布局 | 需要界面设计规范 | .opencode/work/design.md |
| frontend-expert | Vue 组件开发、代码实现 | 需要编写或修改代码 | .vue 文件 |
| qa-engineer | 构建验证、代码审查 | 代码生成完成后 | .opencode/work/qa-report.md |

## 需求澄清流程
1. 分析用户输入的明确程度
2. 如果缺少关键信息，提出具体的澄清问题
3. 澄清问题应具体、有针对性，避免开放式问题
4. 确认需求明确后，生成执行计划

## 进度监控
每步执行前后，更新 .opencode/worker/process.md (Markdown + YAML frontmatter 格式):

```markdown
---
task: 任务描述
status: in_progress | completed | paused | cancelled
current: prd
completed: [plan]
pending: [design, code, qa]
artifacts:
  prd: .opencode/work/prd.md
---

## 执行日志

| 步骤 | Agent | 状态 | 产出 | 时间 |
|------|-------|------|------|------|
| plan | project-manager | completed | 执行计划 | 2026-04-02 10:00 |
| prd | product-manager | in_progress | - | - |
```

## 动态规划规则
- 简单修改（如"修改按钮颜色"）：直接调用 frontend-expert + qa-engineer
- 中等需求（如"添加搜索功能"）：product-manager + frontend-expert + qa-engineer
- 复杂需求（如"新建用户管理模块"）：完整流程
- 纯设计咨询：只需要 ui-designer

## 回溯处理
当用户要求返回上一步或调整当前步骤时：
1. 从 .opencode/work/ 目录恢复对应步骤的上下文
2. 调用前端专家从 .opencode/work/backups/ 恢复代码文件
3. 清除后续步骤的产出文件
4. 更新 .opencode/worker/process.md 进度状态
5. 重新调用对应角色 agent

## 备份清理规则
1. 每步用户确认后，调用前端专家清理该步骤产生的备份文件
2. 整个任务完成后，清理 .opencode/work/backups/ 目录中的所有文件
3. 用户取消任务时，清理所有备份文件
4. 回溯过程中不清理备份，回溯完成后再清理

## 沟通风格
- 简洁专业，主动汇报进度
- 使用结构化表达（列表、表格）
- 每步完成后明确提示用户操作选项
- 需求不明确时主动提问，不盲目执行

## 约束
- 不深入需求细节（交由产品经理）
- 不直接参与代码编写
- 始终保持流程可控，不跳过确认环节
- 进度文件必须实时更新
- 根据 subagent 职责清单动态决定调用哪些 agent
- 禁止跳过 workflow.md 中定义的任何步骤
```

---

## 八、使用示例

### 8.1 直接对话启动

```
用户: 做一个用户管理页面，有搜索、列表、分页
       │
       ▼
🎯 项目经理自动接管 → 读取 workflow.md → 生成执行计划 → 等待确认 → 逐步执行
```

### 8.2 流程中的回溯

```
步骤4完成后，用户发现设计有问题：

用户: 搜索框应该放在右侧，不是左侧
       │
       ▼
选择 [返回上一步] → 回到步骤3（UI设计师）
       │
       ▼
项目经理执行回溯流程：
  1. 调用前端专家从 .opencode/work/backups/ 恢复代码
  2. 清除步骤4和步骤5的产出文件
  3. 更新 .opencode/worker/process.md 进度状态
  4. 重新调用 UI设计师 → 确认 → 前端专家重新生成代码 → 测试专家重新验证
```

### 8.3 异常处理

```
构建失败处理：
  QA报告失败 → 项目经理读取错误信息 → 调用 frontend-expert 修复 → 重新验证
  最多重试 3 次，仍失败则通知用户手动介入

Agent 输出不符合预期：
  用户指出问题 → 项目经理重新调用对应 agent，附带用户反馈

用户中途取消：
   保留已完成的产出物到 .opencode/work/
   保留进度状态到 .opencode/worker/process.md
   下次直接对话即可从断点继续
```

### 8.4 进度监控示例

```
项目经理实时更新 .opencode/worker/process.md (Markdown + YAML frontmatter):

---
task: 用户管理页面开发
status: in_progress
current: design
completed: [plan, prd]
pending: [code, qa]
artifacts:
  prd: .opencode/work/prd.md
---

## 执行日志

| 步骤 | Agent | 状态 | 产出 | 时间 |
|------|-------|------|------|------|
| plan | project-manager | completed | 执行计划 | 2026-04-02 10:00 |
| prd | product-manager | completed | .opencode/work/prd.md | 2026-04-02 10:05 |
| design | ui-designer | in_progress | - | - |
| code | frontend-expert | pending | - | - |
| qa | qa-engineer | pending | - | - |
```

---

## 九、扩展规划

### 9.1 未来可增加的角色

| 角色 | 职责 | 触发场景 |
|------|------|---------|
| 🎭 动画设计师 | 定义过渡动画、交互动效 | 用户需要高级交互时 |
| 📱 响应式专家 | 移动端适配、断点设计 | 需要多端兼容时 |
| 🔌 API模拟师 | 生成Mock数据、模拟接口 | 需要真实数据交互时 |

### 9.2 技能扩展 (Skills)

在 `.opencode/skills/` 中可添加：
- `vue2-component.md` - Vue 2组件生成技能
- `element-ui-skill.md` - Element UI组件库使用技能
- `flexbox-layout-skill.md` - Flexbox布局技能

Skill 内容会被自动注入到 system prompt 中。

### 9.3 自定义命令扩展

在 `.opencode/commands/` 中可添加：
- `quick-component.md` - 快速生成单个组件
- `add-page.md` - 快速添加页面
- `refactor.md` - 代码重构流程

### 9.4 LSP 集成（可选）

```jsonc
{
  "lsp": {
    "vue-language-server": {
      "command": ["vue-language-server", "--stdio"],
      "extensions": [".vue"]
    },
    "typescript": {
      "command": ["typescript-language-server", "--stdio"],
      "extensions": [".ts", ".js"]
    }
  }
}
```

LSP 可为前端专家提供代码跳转定义、诊断等能力，提升代码生成质量。

---

## 十、Subagent 灵活插拔机制

### 10.1 设计原则

新增或移除 subagent 时，不需要修改项目经理的核心逻辑。通过以下机制实现：

1. **职责清单驱动**: 项目经理在 prompt 中维护 subagent 职责清单
2. **动态匹配**: 根据需求关键词自动匹配最合适的 subagent
3. **标准化接口**: 所有 subagent 遵循统一的输入/输出约定

### 10.2 新增 Subagent 步骤

```
1. 在 .opencode/agents/ 中添加新的 .md 文件
2. 在项目经理 prompt 的职责清单中添加一行
3. 在 .opencode/worker/process.md 的 agents.required 中添加新 agent
4. 无需修改项目经理的核心编排逻辑
```

### 10.3 Subagent 注册表示例

```jsonc
// .opencode/worker/agent-registry.json (可选)
{
  "agents": [
    {
      "name": "product-manager",
      "description": "需求分析和 PRD 输出",
      "keywords": ["需求", "PRD", "功能", "交互", "验收"],
      "output": ".opencode/work/prd.md"
    },
    {
      "name": "ui-designer",
      "description": "视觉架构和规范定义",
      "keywords": ["设计", "UI", "组件", "布局", "视觉", "样式"],
      "output": ".opencode/work/design.md"
    },
    {
      "name": "frontend-expert",
      "description": "Vue 2 组件开发和代码实现",
      "keywords": ["代码", "组件", "Vue", "路由", "实现"],
      "output": "src/"
    },
    {
      "name": "qa-engineer",
      "description": "构建验证和质量检查",
      "keywords": ["测试", "验证", "构建", "质量"],
      "output": "测试报告"
    }
  ]
}
```

### 10.4 动态规划示例

```
用户需求: "修改按钮颜色为红色"
关键词匹配: ["修改", "按钮", "颜色"] → 匹配 frontend-expert
规划结果: frontend-expert + qa-engineer

用户需求: "添加用户管理模块，有列表、搜索、分页"
关键词匹配: ["添加", "管理", "列表", "搜索", "分页"] → 完整流程
规划结果: product-manager → ui-designer → frontend-expert → qa-engineer

用户需求: "设计一个登录页面的布局"
关键词匹配: ["设计", "页面", "布局"] → 匹配 ui-designer
规划结果: ui-designer
```

---

## 十一、关键设计决策

### 11.1 为什么项目经理不拥有源代码编辑权限？

项目经理是编排者，不应直接修改项目源代码文件。所有代码变更由前端专家执行，确保职责分离和流程可控。项目经理仅有 `.opencode/worker/process.md`、`.opencode/worker/workflow.md` 和 `.opencode/work/**` 的写权限用于更新进度和产出物，`edit` 权限末尾添加 `"*": "deny"` 兜底确保不会意外修改其他文件。

### 11.2 为什么使用 permission 而非 tools 配置？

OpenCode 源码中 `tools` 字段已被标记为 `@deprecated`，会自动转换为 `permission` 规则集。`permission` 支持更细粒度的控制（如路径级别权限）。

### 11.3 为什么使用文件系统传递上下文？

OpenCode 没有内置的 agent-to-agent 消息传递机制。子 agent 通过 `task` 工具创建独立 session，无法直接共享状态。文件系统是最可靠的上下文传递方式。

### 11.4 为什么设置 steps 字段？

`steps` 控制最大 agentic 迭代次数，防止 agent 陷入无限 tool call 循环。项目经理需要较多步骤（25）来编排整个流程，前端专家需要中等步骤（15）来完成代码生成。

### 11.5 为什么使用双文件流程编排？

OpenCode 没有内置的 workflow/orchestration 引擎。通过 `workflow.md`（不可变流程定义）+ `process.md`（可变运行时状态）双文件机制：
- 流程定义与执行状态分离，compaction 后可完全恢复
- `workflow.md` 作为单一事实源，防止流程定义被意外修改
- `process.md` 记录当前执行位置，支持断点续传
- 每步完成后验证产出物存在性和非空，防止无效状态进入下一步
- Markdown 格式比 JSON 对 LLM 更友好，减少格式错误

### 11.6 为什么 compaction.reserved 设置为 15000？

多 agent 长对话中，项目经理需要维护整个流程状态、多个 subagent 的调用结果和产出物路径。10000 tokens 的缓冲区在复杂场景下可能不足，15000 提供更安全的余量。

### 11.7 为什么不使用 Git 进行回溯？

本项目不依赖 Git 操作。回溯通过文件备份机制实现：前端专家在修改代码前自动备份到 `.opencode/work/backups/`，回溯时从备份恢复。这使得项目可以在非 Git 仓库中正常工作。

### 11.8 为什么需要进度监控文件？

`.opencode/worker/process.md` 提供实时的任务状态追踪，支持：
- 用户随时了解当前进度
- 中断后可从断点继续
- 便于调试和问题排查
- 为未来可能的 UI 进度展示提供数据基础

---

*文档版本: v3.0*
*创建时间: 2026-04-02*
*基于 OpenCode 源码深度分析 (packages/opencode/src/agent/, config/, permission/, command/)*
