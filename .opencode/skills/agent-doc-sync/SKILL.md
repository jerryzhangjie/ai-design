---
name: agent-doc-sync
description: Agent 文档同步工具 - 当 Agent 定义变化时自动同步架构文档和设计文档
---

# Agent Doc Sync

当 `.opencode/agents/` 目录下的 Agent 定义文件发生变化时，自动同步更新相关架构文档。

## 触发条件

### 自动触发
当以下文件发生变化时自动触发同步：
- `.opencode/agents/*.md` - 任意 Agent 定义文件
- `opencode.json` 中的 `agent` 配置段
- `AGENTS.md` 中的多 Agent 协作章节

### 手动触发
使用命令：`/sync-agent-docs`

## 同步逻辑

### 1. 任何 Agent 变化 → 更新总览文档
更新 `.opencode/agent-architecture-design/多Agent架构规划.md`：
- 角色架构总览表（名称、职责、模型、Mode、权限）
- 角色职责边界图
- 各角色详细定义章节
- Subagent 职责清单
- 文件清单

### 2. 特定 Agent 变化 → 更新对应设计文档

| Agent | 设计文档 |
|-------|---------|
| `project-manager` | `项目经理Agent设计文档.md` |
| `product-manager` | `产品经理Agent设计文档.md` |
| `ui-designer` | `UI设计师Agent设计文档.md` |
| `frontend-expert` | `前端专家Agent设计文档.md` |
| `qa-engineer` | `测试专家Agent设计文档.md` |

所有设计文档位于 `.opencode/agent-architecture-design/` 目录。

## 如何使用

### 方式一：手动同步

```bash
# 运行同步脚本
bash .opencode/skills/agent-doc-sync/scripts/sync.sh
```

### 方式二：使用命令

```
/sync-agent-docs
```

### 同步内容

每个 Agent 设计文档包含以下章节：

1. **角色定位** - Mode, Steps, Color, 模型选择
2. **核心职责** - 职责列表
3. **权限配置** - 完整配置 + 设计原则 + 合并逻辑
4. **输入/输出规范** - 数据来源和产出物
5. **工作流程** - 流程图 + 步骤说明
6. **沟通风格与约束**
7. **完整 Agent Markdown 文件** - frontmatter + prompt
8. **opencode.json 配置片段**
9. **关键设计决策**

## 同步规则

### 总览文档更新规则
- 角色架构总览表：从所有 agent 的 frontmatter 提取
- 角色职责边界图：从 agent prompt 的角色定位提取
- 各角色详细定义：完整复制 agent 定义内容
- Subagent 职责清单：从项目经理定义中提取

### 设计文档更新规则
- 从对应 agent 定义文件提取 frontmatter 和正文
- 按照统一模板结构生成/更新
- 保留文档版本号和时间戳
- 新增字段追加，删除字段标注

### 备份规则
- 同步前先将原文档备份到 `.opencode/work/backups/docs/`
- 备份命名：`{原文件名}.{时间戳}.md`
- 同步完成后保留备份（手动清理）

## 注意事项

- 所有输出必须使用中文
- 同步是幂等操作，可重复执行
- 不会删除任何现有文档内容，只会更新或追加
- 如果 agent 定义文件不存在，跳过对应文档生成
