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

**当前未配置测试和 lint 脚本。** 如需添加：
- 测试: `npm i -D vitest @vue/test-utils jsdom` 然后添加 `"test": "vitest"`
- Lint: `npm i -D eslint eslint-plugin-vue` 然后添加 `"lint": "eslint src/ --ext .js,.vue"`

## 架构

```
src/
├── main.js              # Vue 应用入口
├── App.vue              # 根组件 (<router-view />)
├── router/index.js      # Vue Router 3 (history 模式)
├── store/index.js       # Vuex 3 store
├── views/               # 页面级组件
│   └── Home.vue
└── components/          # 可复用组件 (当前为空)
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

## 添加新功能

### 新页面
1. 创建 `src/views/PageName.vue`
2. 在 `src/router/index.js` 中添加路由

### 新组件
1. 创建 `src/components/ComponentName.vue`
2. 在父组件中局部注册 `components: {}`

### 新 Vuex 模块
1. 在 `src/store/index.js` 中添加模块，或拆分到 `src/store/modules/`
2. 在 `modules: {}` 中注册

## 多 Agent 协作

### Agent 架构

| Agent | 模式 | 职责 |
|-------|------|------|
| `project-manager` | primary | 流程编排，用户第一接触点 |
| `product-manager` | subagent | 需求分析，PRD 输出 |
| `ui-designer` | subagent | 视觉设计，组件树，布局 |
| `frontend-expert` | subagent | Vue 2 组件开发 |
| `qa-engineer` | subagent | 构建验证，代码审查 |

### 工作流

```
用户请求 → project-manager (计划) → 用户确认
  → product-manager (PRD) → 用户确认
  → ui-designer (设计规范) → 用户确认
  → frontend-expert (代码) → qa-engineer (验证) → 完成
```

- 每步完成后等待用户确认
- 产出物写入 `.opencode/doc/` 目录
- 进度追踪在 `.opencode/worker/process.md`
- 流程定义在 `~/.config/opencode/worker/workflow.md` (不可变)

### 代码生成规则

- 所有生成代码必须遵循本文件规范
- 组件遵循 Vue 2 SFC 规范 (Options API, scoped 样式)
- 修改文件前先备份到 `.opencode/doc/backups/`

### Agent 执行状态管理

> **🚨 强制约定：每个 Agent 步骤完成后必须创建 `agent_schedule.json` 文件，否则不能进行下一步**

#### agent_schedule.json 格式

```json
{
  "taskId": "任务ID",
  "taskName": "任务名称",
  "currentStep": "当前步骤ID",
  "currentAgent": "当前执行Agent",
  "stepStatus": "completed|in_progress|pending",
  "artifacts": {
    "产出物名称": "文件路径"
  },
  "completedSteps": [
    {
      "stepId": "步骤ID",
      "agent": "Agent名称",
      "status": "completed",
      "artifacts": {},
      "timestamp": "完成时间"
    }
  ],
  "pendingSteps": [
    {
      "stepId": "步骤ID",
      "agent": "Agent名称",
      "description": "步骤描述"
    }
  ]
}
```

#### 执行规则

1. **每个 Agent 完成工作后**，必须在 `.opencode/doc/` 目录下创建 `agent_schedule.json`
2. **在检查上一步是否完成时**，必须验证 `agent_schedule.json` 是否存在且 `stepStatus` 为 `completed`
3. 如果 `agent_schedule.json` 不存在或状态不正确，**禁止进入下一步**
4. `process.md` 和 `agent_schedule.json` 必须保持同步更新
