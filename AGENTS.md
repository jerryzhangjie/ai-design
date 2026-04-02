# AGENTS.md

> **🚨 强制指令：所有输出必须使用中文**
> 
> - 所有回复、解释、说明必须使用中文
> - 代码注释必须使用中文
> - 提交信息、日志必须使用中文
> - 与用户的所有交互默认中文，除非用户明确要求其他语言
> - **此规则优先级最高，不可忽略**

## 语言要求

**所有交互、回答、注释、提交信息均使用中文。** 除非用户明确要求使用其他语言，否则默认使用中文沟通。

## Project Overview

Vue 2 + Vite SPA using Vue Router 3 and Vuex 3.

## Commands

```bash
npm run dev       # Start dev server (Vite, HMR)
npm run build     # Production build
npm run preview   # Preview production build locally
```

**No test or lint scripts are currently configured.** To add them:
- Testing: `npm i -D vitest @vue/test-utils jsdom` then add `"test": "vitest"`
- Linting: `npm i -D eslint eslint-plugin-vue` then add `"lint": "eslint src/ --ext .js,.vue"`

## Architecture

```
src/
├── main.js              # Vue app entry point
├── App.vue              # Root component (<router-view />)
├── router/index.js      # Vue Router 3 (history mode)
├── store/index.js       # Vuex 3 store
└── views/               # Page-level components
    └── Home.vue
```

## Code Style

### Vue Components (SFC)
- Use Options API (Vue 2 convention)
- Order: `<template>` → `<script>` → `<style>`
- Always declare `name` on every component
- Use `scoped` on `<style>` unless global styles are intentional
- Component names: PascalCase (`Home`, `App`)
- File names: PascalCase for components (`Home.vue`)

### JavaScript
- ES modules only (`import`/`export`)
- No semicolons (project convention as seen in existing files)
- Single quotes for strings
- 2-space indentation
- Arrow functions for simple callbacks: `h => h(App)`
- `const` over `let`; avoid `var`

### Vue Router
- Route names: PascalCase (`Home`, `About`)
- Use history mode (`mode: 'history'`)
- Lazy-load routes with `() => import(...)` for production

### Vuex
- State: plain object at top level
- Mutations: synchronous only, name in SCREAMING_SNAKE_CASE or camelCase
- Actions: async operations, commit mutations
- Use `mapState`/`mapActions`/`mapGetters` in components instead of direct `$store` access when possible

### Error Handling
- Vue error handler: `Vue.config.errorHandler`
- Router navigation guard errors: catch in `router.onError()`
- API calls: wrap in try/catch, commit error state to Vuex

### CSS
- Scoped styles per component
- Flexbox for layout (project convention)
- Global resets in `App.vue` only

## Adding New Features

### New Page
1. Create `src/views/PageName.vue`
2. Add route in `src/router/index.js`

### New Vuex Module
1. Add module object in `src/store/index.js` or split into `src/store/modules/`
2. Register in `modules: {}`

### New Component
1. Create `src/components/ComponentName.vue`
2. Import and register locally in parent's `components: {}`

## Multi-Agent Collaboration

### Agent Architecture

This project uses a multi-agent workflow orchestrated by OpenCode:

| Agent | Mode | Role |
|-------|------|------|
| `project-manager` | primary | Orchestrator, user's first contact point |
| `product-manager` | subagent | Requirements analysis, PRD output |
| `ui-designer` | subagent | Visual design, component tree, layout |
| `frontend-expert` | subagent | Vue 2 component development |
| `qa-engineer` | subagent | Build verification, code review |

### Workflow

```
User Request → project-manager (plan) → user confirm
  → product-manager (PRD) → user confirm
  → ui-designer (design spec) → user confirm
  → frontend-expert (code) → qa-engineer (verify) → done
```

- Each step pauses for user confirmation before proceeding
- Artifacts are written to `.opencode/work/` directory
- Progress is tracked in `.opencode/worker/process.md`
- Flow definition is in `.opencode/worker/workflow.md` (immutable)

### Starting the Workflow

Simply send your request in natural language to the project-manager:

```
做一个用户管理页面，有搜索、列表、分页
```

The project-manager will automatically:
1. Read the workflow definition
2. Generate an execution plan
3. Wait for your confirmation before each step

### Code Generation Rules

- All generated code must follow the code style defined in this file
- Components follow Vue 2 SFC conventions (Options API, scoped styles)
- File modifications are backed up to `.opencode/work/backups/` before changes
