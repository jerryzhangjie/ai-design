# Element UI 使用技能

## 常用组件

### 按钮 (el-button)

```vue
<el-button type="primary">主要按钮</el-button>
<el-button type="success">成功按钮</el-button>
<el-button type="danger">危险按钮</el-button>
```

### 输入框 (el-input)

```vue
<el-input v-model="keyword" placeholder="请输入搜索关键词" />
```

### 表格 (el-table)

```vue
<el-table :data="list" v-loading="loading">
  <el-table-column prop="name" label="姓名" />
  <el-table-column prop="email" label="邮箱" />
  <el-table-column prop="status" label="状态" />
</el-table>
```

### 分页 (el-pagination)

```vue
<el-pagination
  :current-page="pagination.currentPage"
  :page-size="pagination.pageSize"
  :total="pagination.total"
  @current-change="handlePageChange"
/>
```

### 对话框 (el-dialog)

```vue
<el-dialog :visible.sync="dialogVisible" title="标题">
  <!-- 对话框内容 -->
</el-dialog>
```

### 表单 (el-form)

```vue
<el-form :model="form" :rules="rules" ref="formRef">
  <el-form-item label="名称" prop="name">
    <el-input v-model="form.name" />
  </el-form-item>
</el-form>
```

## 注意事项

1. 本项目未安装 Element UI，如需使用需先安装
2. 安装命令：`npm i element-ui`
3. 在 main.js 中引入：`import ElementUI from 'element-ui'` + `Vue.use(ElementUI)`
4. 当前项目使用原生 Flexbox 布局，不依赖 UI 框架
