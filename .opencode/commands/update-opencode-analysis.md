---
description: 定期更新 OpenCode 深度解析文档（爬取官网+源码+整合输出）
agent: build
model: opencode/qwen3.6-plus-free
---

执行 OpenCode 深度解析文档的定期更新任务。

## 任务目标

更新 `.opencode/agent-architecture-design/OpenCode深度解析文档.md` 文件，确保内容基于最新的官方文档和源码。

## 执行步骤

### 第一阶段：爬取官网文档

并行爬取所有中文文档路由：

核心页面：
- https://opencode.ai/docs/zh-cn/
- https://opencode.ai/docs/zh-cn/config/
- https://opencode.ai/docs/zh-cn/providers/
- https://opencode.ai/docs/zh-cn/tools/
- https://opencode.ai/docs/zh-cn/agents/
- https://opencode.ai/docs/zh-cn/permissions/
- https://opencode.ai/docs/zh-cn/rules/
- https://opencode.ai/docs/zh-cn/models/
- https://opencode.ai/docs/zh-cn/themes/
- https://opencode.ai/docs/zh-cn/keybinds/
- https://opencode.ai/docs/zh-cn/commands/
- https://opencode.ai/docs/zh-cn/formatters/
- https://opencode.ai/docs/zh-cn/lsp/
- https://opencode.ai/docs/zh-cn/mcp-servers/
- https://opencode.ai/docs/zh-cn/acp/
- https://opencode.ai/docs/zh-cn/skills/
- https://opencode.ai/docs/zh-cn/custom-tools/

使用页面：
- https://opencode.ai/docs/zh-cn/go/
- https://opencode.ai/docs/zh-cn/tui/
- https://opencode.ai/docs/zh-cn/cli/
- https://opencode.ai/docs/zh-cn/web/
- https://opencode.ai/docs/zh-cn/ide/
- https://opencode.ai/docs/zh-cn/zen/
- https://opencode.ai/docs/zh-cn/share/
- https://opencode.ai/docs/zh-cn/github/
- https://opencode.ai/docs/zh-cn/gitlab/

开发页面：
- https://opencode.ai/docs/zh-cn/sdk/
- https://opencode.ai/docs/zh-cn/server/
- https://opencode.ai/docs/zh-cn/plugins/
- https://opencode.ai/docs/zh-cn/ecosystem/

其他页面：
- https://opencode.ai/docs/zh-cn/network/
- https://opencode.ai/docs/zh-cn/enterprise/
- https://opencode.ai/docs/zh-cn/troubleshooting/
- https://opencode.ai/docs/zh-cn/windows-wsl

使用 webfetch 工具，format 为 markdown。

### 第二阶段：获取 GitHub 源码结构

使用 curl 获取 dev 分支的完整文件树：
```
curl -s "https://api.github.com/repos/anomalyco/opencode/git/trees/dev?recursive=1"
```

重点关注 packages/opencode/src/ 下的核心模块结构。

如果 API 调用失败，至少重试 3 次，每次间隔 5 秒。

### 第三阶段：对比分析并更新文档

1. 读取现有文档 `.opencode/agent-architecture-design/OpenCode深度解析文档.md`
2. 对比官网最新内容和源码结构
3. 识别以下变更类型：
   - **新增内容**：新功能、新配置项、新提供商、新工具等
   - **变更内容**：API 变更、配置项变更、架构调整等
   - **废弃内容**：已移除的功能或配置
4. 更新文档，保持原有结构不变
5. 更新文档底部的"分析日期"和"文档版本"

### 更新原则

- 保持文档的 25 个章节结构
- 只更新有变更的部分，避免不必要的重写
- 确保所有代码示例、配置示例、命令示例都是最新的
- 如果发现有重大架构变更，在文档开头添加"更新说明"段落
- 版本号按日期递增（如 v2.0 → v2.1）

### 输出要求

更新完成后，输出变更摘要：
- 本次更新的主要内容
- 新增/变更/废弃的项目数量
- 文档当前版本号
