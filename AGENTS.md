# AGENTS.md

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
