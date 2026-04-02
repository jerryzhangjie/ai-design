# Vue 2 组件生成技能

## 组件模板

### 页面组件 (views/)

```vue
<template>
  <div class="page-name">
    <!-- 页面内容 -->
  </div>
</template>

<script>
export default {
  name: 'PageName',
  data() {
    return {
      // 响应式数据
    }
  },
  computed: {
    // 计算属性
  },
  methods: {
    // 方法
  },
  created() {
    // 初始化逻辑
  }
}
</script>

<style scoped>
.page-name {
  /* 页面样式 */
}
</style>
```

### 可复用组件 (components/)

```vue
<template>
  <div class="component-name">
    <!-- 组件内容 -->
  </div>
</template>

<script>
export default {
  name: 'ComponentName',
  props: {
    // 属性定义
  },
  data() {
    return {
      // 内部状态
    }
  },
  methods: {
    // 方法
  }
}
</script>

<style scoped>
.component-name {
  /* 组件样式 */
}
</style>
```

## 常用模式

### 列表 + 分页

```javascript
data() {
  return {
    list: [],
    pagination: {
      currentPage: 1,
      pageSize: 10,
      total: 0
    }
  }
}
```

### 搜索表单

```javascript
data() {
  return {
    searchForm: {
      keyword: ''
    }
  }
}
```

### 加载状态

```javascript
data() {
  return {
    loading: false,
    empty: false
  }
}
```

## 最佳实践

1. 组件必须声明 name
2. Props 必须定义类型
3. 使用 scoped 样式
4. Flexbox 布局优先
5. 中文注释
6. 不使用分号
7. 单引号
8. 2 空格缩进
