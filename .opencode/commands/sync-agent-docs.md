# 同步 Agent 文档

同步所有 Agent 定义文件到架构文档和设计文档。

## 使用方式

```bash
bash ~/.config/opencode/skills/agent-doc-sync/scripts/sync.sh
```

## 触发条件

- 手动执行此命令
- 当 `~/.config/opencode/agents/*.md` 文件发生变化时

## 同步内容

1. 更新 `~/.config/opencode/agent-architecture-design/多Agent架构规划.md` 中的角色架构表
2. 为每个 Agent 生成/更新对应的设计文档：
   - 项目经理 → 项目经理Agent设计文档.md
   - 产品经理 → 产品经理Agent设计文档.md
   - UI设计师 → UI设计师Agent设计文档.md
   - 前端技术经理 → 前端技术经理Agent设计文档.md
   - 前端组件专家 → 前端组件专家Agent设计文档.md
   - 前端模块开发 → 前端模块开发Agent设计文档.md
   - 测试专家 → 测试专家Agent设计文档.md

## 注意事项

- 所有输出必须使用中文
- 同步前会先备份原文档到 `docs/backups/docs/`
- 同步是幂等操作，可重复执行
