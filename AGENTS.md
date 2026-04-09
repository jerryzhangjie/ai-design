# AGENTS.md

> **🚨 强制指令：所有输出必须使用中文**
> 
> - 所有回复、解释、说明必须使用中文
> - 代码注释必须使用中文
> - 提交信息、日志必须使用中文
> - 与用户的所有交互默认中文，除非用户明确要求其他语言
> - **此规则优先级最高，不可忽略**

## 项目概述

Vue 2.7 + Vite 5 SPA，使用 Vue Router 3 和 Vuex 3。

## 命令

```bash
npm run dev       # 启动开发服务器 (Vite, HMR)
npm run build     # 生产构建
npm run preview   # 本地预览生产构建
```

## 架构

```
src/
├── main.js              # Vue 应用入口
├── App.vue              # 根组件 (<router-view />)
├── router/index.js      # Vue Router 3 (history 模式)
├── store/index.js       # Vuex 3 store
├── views/               # 页面级组件（由 frontend-module-developer 完善）
├── components/          # 公共可复用组件（由 frontend-component-expert 开发）
└── utils/               # 工具函数和 Mock 数据（由 frontend-component-expert 开发）
```

## 代码风格

### Vue 组件 (SFC)
- 使用 Options API (Vue 2 规范)
- 顺序: `<template>` → `<script>` → `<style>`
- 必须声明 `name` 属性
- 使用 `scoped` 样式，除非是全局样式
- 组件名: PascalCase (`Home`, `UserList`)
- 文件名: PascalCase (`Home.vue`, `UserList.vue`)

### JavaScript
- ES modules (`import`/`export`)
- 不使用分号
- 字符串使用单引号
- 2 空格缩进
- `const` 优先于 `let`，避免 `var`
- 简单回调使用箭头函数: `h => h(App)`

### Vue Router
- 路由名: PascalCase (`Home`, `About`)
- 使用 history 模式 (`mode: 'history'`)
- 路由懒加载: `() => import('../views/Page.vue')`

### Vuex
- State: 顶层普通对象
- Mutations: 仅同步操作，命名使用 SCREAMING_SNAKE_CASE 或 camelCase
- Actions: 异步操作，commit mutations
- 组件中使用 `mapState`/`mapActions`/`mapGetters` 而非直接访问 `$store`

### 错误处理
- Vue 错误处理器: `Vue.config.errorHandler`
- 路由导航守卫错误: 在 `router.onError()` 中捕获
- API 调用: 使用 try/catch，将错误状态提交到 Vuex

### CSS
- 组件级 scoped 样式
- 使用 Flexbox 布局
- 全局重置仅在 `App.vue` 中

## 多 Agent 协作

### Agent 架构（三段式前端开发）

| Agent | 模式 | 职责 | 文件边界 |
|-------|------|------|---------|
| `project-manager` | primary | 流程编排，用户第一接触点 | .opencode/worker/ |
| `product-manager` | subagent | 需求分析，PRD + 思维导图输出 | .opencode/work/prd* |
| `ui-designer` | subagent | 视觉风格定义（整体配色/字体/效果） | .opencode/work/design.md |
| `frontend-manager` | subagent | 工程架构、路由状态基建、任务拆分 | src/router/, src/store/, src/App.vue, src/views/*占位 |
| `frontend-component-expert` | subagent | 公共UI组件 + 工具函数 + Mock数据 | src/components/, src/utils/ |
| `frontend-module-developer` | subagent | 具体业务页面实现与逻辑集成 | src/views/ |
| `qa-engineer` | subagent | 构建验证，代码质量检查 | .opencode/work/qa-report.md |

### 工作流

```
用户请求 → project-manager (计划) → 用户确认
  → product-manager + ui-designer (并行: PRD + 设计) → 用户确认
  → frontend-manager (架构基建 + 开发计划)
  → frontend-component-expert (公共组件 + 工具函数)
  → frontend-module-developer (业务页面)
  → qa-engineer (质量验证) → 完成
```

### 文件边界规则（红线）

- **frontend-manager** 只创建路由、状态、布局和页面占位文件，不写业务逻辑
- **frontend-component-expert** 只写 src/components/ 和 src/utils/，不碰 views 和 router
- **frontend-module-developer** 只写 src/views/ 及其私有子组件，不碰 router、store、公共组件
- **qa-engineer** 只读不写代码，产出测试报告

### 代码修改规则

- 所有生成代码必须遵循本文件规范
- 组件遵循 Vue 2 SFC 规范 (Options API, scoped 样式)
- 修改文件前先备份到 `.opencode/work/backups/`

### 流程控制

- 流程定义: `.opencode/worker/workflow.md`（不可变）
- 运行时状态: `.opencode/doc/agent_schedule.json`
- 每步完成后等待用户确认（user_gate 步骤）
- 产出物写入 `.opencode/work/` 目录
