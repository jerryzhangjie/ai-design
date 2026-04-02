# OpenCode 深度解析文档

## 一、项目概述

**OpenCode** 是由 [Anomaly](https://anoma.ly) 团队开发的开源 AI 编码代理（AI Coding Agent）。它提供多种交互界面，支持 75+ LLM 提供商，旨在帮助开发者高效地完成编程任务。

- **GitHub**: https://github.com/anomalyco/opencode
- **文档**: https://opencode.ai/docs/
- **Discord**: https://opencode.ai/discord
- **技术栈**: TypeScript + Effect (函数式编程框架)
- **架构**: 基于 Effect 的 ServiceMap 依赖注入系统

---

## 二、安装方式

### 2.1 推荐安装（安装脚本）
```bash
curl -fsSL https://opencode.ai/install | bash
```

### 2.2 Node.js 生态
| 包管理器 | 命令 |
|---------|------|
| npm | `npm install -g opencode-ai` |
| Bun | `bun install -g opencode-ai` |
| pnpm | `pnpm install -g opencode-ai` |
| Yarn | `yarn global add opencode-ai` |

### 2.3 系统包管理器
- **Homebrew (macOS/Linux)**: `brew install anomalyco/tap/opencode`
- **Arch Linux**: `sudo pacman -S opencode` 或 `paru -S opencode-bin`
- **Chocolatey (Windows)**: `choco install opencode`
- **Scoop (Windows)**: `scoop install opencode`

### 2.4 其他方式
- **Docker**: `docker run -it --rm ghcr.io/anomalyco/opencode`
- **Mise**: `mise use -g github:anomalyco/opencode`
- **直接下载二进制**: 从 [Releases](https://github.com/anomalyco/opencode/releases) 页面

---

## 三、配置系统

### 3.1 配置格式
支持 **JSON** 和 **JSONC**（带注释的 JSON）格式。Schema 定义在 `https://opencode.ai/config.json`。

### 3.2 配置优先级（从低到高，合并而非替换）

| 优先级 | 配置源 | 用途 |
|--------|--------|------|
| 1 | 远程配置 (`.well-known/opencode`) | 组织默认值 |
| 2 | 全局配置 (`~/.config/opencode/opencode.json`) | 用户偏好 |
| 3 | 自定义配置 (`OPENCODE_CONFIG` 环境变量) | 自定义覆盖 |
| 4 | 项目配置 (`opencode.json`) | 项目特定设置 |
| 5 | `.opencode` 目录 | 代理、命令、插件 |
| 6 | 内联配置 (`OPENCODE_CONFIG_CONTENT` 环境变量) | 运行时覆盖 |

> **关键**: 配置是**合并**的，不是替换。数组字段（如 `instructions`）会去重合并，对象字段会深合并。

### 3.3 变量替换
```jsonc
{
  "model": "{env:OPENCODE_MODEL}",
  "provider": {
    "openai": {
      "options": {
        "apiKey": "{file:~/.secrets/openai-key}"
      }
    }
  }
}
```
- `{env:VARIABLE_NAME}` — 环境变量替换
- `{file:path/to/file}` — 文件内容替换（支持相对路径、绝对路径、`~` 路径）

### 3.4 核心配置项

#### TUI 配置
```jsonc
{
  "tui": {
    "scroll_speed": 3,           // 滚动速度倍率（默认 3，最小 1）
    "scroll_acceleration": {
      "enabled": true            // macOS 风格滚动加速（优先于 scroll_speed）
    },
    "diff_style": "auto"         // "auto" | "stacked"
  }
}
```

#### 服务器配置
```jsonc
{
  "server": {
    "port": 4096,
    "hostname": "0.0.0.0",
    "mdns": true,
    "mdnsDomain": "myproject.local",
    "cors": ["http://localhost:5173"]
  }
}
```

#### 模型配置
```jsonc
{
  "model": "anthropic/claude-sonnet-4-5",
  "small_model": "anthropic/claude-haiku-4-5",  // 用于标题生成等轻量任务
  "provider": {
    "anthropic": {
      "options": {
        "timeout": 600000,       // 请求超时（毫秒），false 禁用
        "setCacheKey": true      // 强制设置缓存键
      }
    }
  }
}
```

#### 代理配置
```jsonc
{
  "agent": {
    "code-reviewer": {
      "description": "Reviews code for best practices",
      "model": "anthropic/claude-sonnet-4-5",
      "prompt": "You are a code reviewer. Focus on security, performance, and maintainability.",
      "permission": {
        "edit": { "*": "deny" },
        "write": { "*": "deny" }
      }
    }
  },
  "default_agent": "plan"        // 默认代理（必须是 primary mode 且非 hidden）
}
```

#### 命令配置
```jsonc
{
  "command": {
    "test": {
      "template": "Run the full test suite with coverage report.",
      "description": "Run tests with coverage",
      "agent": "build",
      "model": "anthropic/claude-haiku-4-5"
    },
    "component": {
      "template": "Create a new React component named $ARGUMENTS with TypeScript support.",
      "description": "Create a new component"
    }
  }
}
```

#### 权限配置
```jsonc
{
  "permission": {
    "edit": "ask",    // "ask" 需要用户确认
    "bash": "ask"
  }
}
```

#### 压缩配置
```jsonc
{
  "compaction": {
    "auto": true,       // 上下文满时自动压缩
    "prune": true,      // 删除旧工具输出节省 Token
    "reserved": 10000   // 压缩时的 Token 缓冲区
  }
}
```

#### 文件监视器配置
```jsonc
{
  "watcher": {
    "ignore": ["node_modules/**", "dist/**", ".git/**"]
  }
}
```

#### 分享配置
```jsonc
{
  "share": "manual"    // "manual"（默认）| "auto" | "disabled"
}
```

#### 格式化程序配置
```jsonc
{
  "formatter": {
    "prettier": {
      "disabled": true
    },
    "custom-prettier": {
      "command": ["npx", "prettier", "--write", "$FILE"],
      "environment": { "NODE_ENV": "development" },
      "extensions": [".js", ".ts", ".jsx", ".tsx"]
    }
  }
}
```

#### 提供商控制
```jsonc
{
  "disabled_providers": ["openai", "gemini"],    // 禁用特定提供商
  "enabled_providers": ["anthropic", "openai"]   // 白名单（仅启用这些）
}
```
> `disabled_providers` 优先级高于 `enabled_providers`。

#### 指令配置
```jsonc
{
  "instructions": ["CONTRIBUTING.md", "docs/guidelines.md", ".cursor/rules/*.md"]
}
```

#### 插件配置
```jsonc
{
  "plugin": ["opencode-helicone-session", "@my-org/custom-plugin"]
}
```

#### 自动更新
```jsonc
{
  "autoupdate": true     // true | false | "notify"
}
```

---

## 四、提供商系统

### 4.1 凭据存储
凭据存储在 `~/.local/share/opencode/auth.json`，通过 `/connect` 命令添加。

### 4.2 支持的提供商（35+）

| 提供商 | 认证方式 | 特殊说明 |
|--------|---------|---------|
| **OpenCode Zen** | API Key | 官方推荐，精选模型 |
| **OpenCode Go** | API Key | 低成本订阅（$5/月首月，$10/月之后） |
| **Anthropic** | OAuth / API Key | 支持 Claude Pro/Max 订阅认证 |
| **OpenAI** | OAuth / API Key | 支持 ChatGPT Plus/Pro 订阅认证 |
| **Amazon Bedrock** | AWS 凭证链 | 支持 IAM、Profile、Bearer Token、EKS IRSA |
| **Azure OpenAI** | API Key + 资源名 | 需注意内容过滤器设置 |
| **Azure Cognitive Services** | API Key + 资源名 | 类似 Azure OpenAI |
| **Google Vertex AI** | 服务账户 / gcloud | 支持 global 端点 |
| **GitHub Copilot** | Device Flow OAuth | 需要 Pro+ 订阅部分模型 |
| **GitLab Duo** | OAuth / PAT | 支持自托管，有专用插件 |
| **Ollama** | 本地 | 需设置 `num_ctx` 16k-32k |
| **Ollama Cloud** | API Key | 需先 `ollama pull` 模型 |
| **OpenRouter** | API Key | 支持提供商路由排序 |
| **Vercel AI Gateway** | API Key | 支持提供商路由 |
| **Cloudflare AI Gateway** | API Token | 统一计费 |
| **Helicone** | API Key | 可观测性平台 |
| **DeepSeek** | API Key | |
| **Groq** | API Key | |
| **Hugging Face** | API Token | 17+ 子提供商 |
| **Together AI** | API Key | |
| **Fireworks AI** | API Key | |
| **Cerebras** | API Key | |
| **xAI** | API Key | |
| **Scaleway** | API Key | |
| **OVHcloud AI Endpoints** | API Key | |
| **STACKIT** | 认证令牌 | 欧洲主权托管 |
| **SAP AI Core** | 服务密钥 JSON | 40+ 模型 |
| **Baseten** | API Key | |
| **Cortecs** | API Key | |
| **Deep Infra** | API Key | |
| **Firmware** | API Key | |
| **IO.NET** | API Key | 17 个优化模型 |
| **LM Studio** | 本地 | OpenAI 兼容 |
| **llama.cpp** | 本地 | OpenAI 兼容 |
| **Moonshot AI** | API Key | Kimi K2 |
| **MiniMax** | API Key | M2.1 等 |
| **Nebius Token Factory** | API Key | |
| **Venice AI** | API Key | |
| **Z.AI** | API Key | GLM 系列 |
| **ZenMux** | API Key | 类似 OpenRouter |
| **302.AI** | API Key | |

### 4.3 自定义提供商
任何 **OpenAI 兼容** 的 API 都可以作为自定义提供商：

```jsonc
{
  "provider": {
    "myprovider": {
      "npm": "@ai-sdk/openai-compatible",    // 或 @ai-sdk/openai（/v1/responses）
      "name": "My AI Provider",
      "options": {
        "baseURL": "https://api.myprovider.com/v1",
        "apiKey": "{env:MY_API_KEY}",
        "headers": { "Authorization": "Bearer custom-token" }
      },
      "models": {
        "my-model-name": {
          "name": "My Model Display Name",
          "limit": {
            "context": 200000,    // 最大输入 Token
            "output": 65536       // 最大输出 Token
          }
        }
      }
    }
  }
}
```

### 4.4 Amazon Bedrock 认证优先级
1. **Bearer Token** — `AWS_BEARER_TOKEN_BEDROCK` 或 `/connect`
2. **AWS 凭证链** — 配置文件、访问密钥、IAM 角色、Web Identity Token（EKS IRSA）、实例元数据

### 4.5 模型引用格式
`<providerId>/<modelId>`，例如：
- `openai/gpt-4.1`
- `openrouter/google/gemini-2.5-flash`
- `opencode/kimi-k2`
- `amazon-bedrock/anthropic-claude-sonnet-4-5`

---

## 五、OpenCode Go

低成本订阅服务，提供精选开源编程模型。

### 5.1 定价
- **首月**: $5
- **之后**: $10/月

### 5.2 支持模型
- GLM-5
- Kimi K2.5
- MiniMax M2.5
- MiniMax M2.7

### 5.3 使用限制
| 限制 | 额度 |
|------|------|
| 5 小时 | $12 |
| 每周 | $30 |
| 每月 | $60 |

### 5.4 预估请求数
| 模型 | 每 5 小时 | 每周 | 每月 |
|------|----------|------|------|
| GLM-5 | 1,150 | 2,880 | 5,750 |
| Kimi K2.5 | 1,850 | 4,630 | 9,250 |
| MiniMax M2.7 | 14,000 | 35,000 | 70,000 |
| MiniMax M2.5 | 20,000 | 50,000 | 100,000 |

### 5.5 API 端点
- OpenAI 兼容模型（GLM-5, Kimi K2.5）: `https://opencode.ai/zen/go/v1/chat/completions`
- Anthropic 兼容模型（MiniMax M2.5/M2.7）: `https://opencode.ai/zen/go/v1/messages`

---

## 六、交互界面

### 6.1 TUI（终端用户界面）

#### 启动
```bash
opencode                    # 当前目录
opencode /path/to/project   # 指定目录
```

#### 核心交互
- **直接输入**: 向 AI 提问或下达指令
- **`@` 文件引用**: 模糊搜索并引用文件内容，如 `@packages/functions/src/api/index.ts`
- **`!` Bash 命令**: 以 `!` 开头直接执行 shell 命令，如 `!ls -la`
- **Tab 键**: 切换**计划模式**和**构建模式**
- **图片拖放**: 将图片拖入终端作为上下文

#### 模式
| 模式 | 说明 |
|------|------|
| **计划模式** (Plan) | 不进行修改，只建议如何实现功能 |
| **构建模式** (Build) | 实际执行代码修改 |

#### TUI 斜杠命令

| 命令 | 别名 | 快捷键 | 说明 |
|------|------|--------|------|
| `/connect` | | | 添加提供商并配置 API 密钥 |
| `/compact` | `/summarize` | `ctrl+x c` | 压缩当前会话 |
| `/details` | | `ctrl+x d` | 切换工具执行详情显示 |
| `/editor` | | `ctrl+x e` | 打开外部编辑器编写消息 |
| `/exit` | `/quit`, `/q` | `ctrl+x q` | 退出 OpenCode |
| `/export` | | `ctrl+x x` | 导出对话为 Markdown |
| `/help` | | `ctrl+x h` | 显示帮助对话框（命令面板） |
| `/init` | | `ctrl+x i` | 创建/更新 `AGENTS.md` |
| `/models` | | `ctrl+x m` | 列出可用模型 |
| `/new` | `/clear` | `ctrl+x n` | 开始新会话 |
| `/redo` | | `ctrl+x r` | 重做之前撤销的消息 |
| `/sessions` | `/resume`, `/continue` | `ctrl+x l` | 列出/切换会话 |
| `/share` | | `ctrl+x s` | 分享当前会话 |
| `/themes` | | `ctrl+x t` | 列出可用主题 |
| `/thinking` | | | 切换思考/推理块可见性 |
| `/undo` | | `ctrl+x u` | 撤销最后一条消息及文件更改 |
| `/unshare` | | | 取消分享当前会话 |

> `/undo` 和 `/redo` 使用 Git 管理文件更改，项目**需要是 Git 仓库**。

#### 编辑器设置
`/editor` 和 `/export` 使用 `EDITOR` 环境变量：
```bash
export EDITOR="code --wait"    # VS Code（需要 --wait）
export EDITOR="vim"            # Vim
export EDITOR="nvim"           # Neovim
export EDITOR="cursor"         # Cursor
export EDITOR="windsurf"       # Windsurf
```

### 6.2 CLI（命令行界面）
```bash
opencode run "描述你的任务"
opencode run "解释 @src/main.ts 中的认证逻辑"
```

### 6.3 服务器模式
```bash
opencode serve                    # 启动 HTTP 服务器
opencode serve --hostname 0.0.0.0 --port 4096
OPENCODE_SERVER_PASSWORD=xxx opencode serve --hostname 0.0.0.0
```

### 6.4 Web 模式
```bash
opencode web
opencode web --hostname 0.0.0.0
```

### 6.5 桌面应用
- 基于 Tauri/WebView2 构建
- 后台运行本地 OpenCode 服务器
- 支持连接远程服务器
- macOS 支持 Wayland/X11，Windows 需要 WebView2 Runtime

### 6.6 IDE 扩展
- 支持 VS Code、Cursor、Windsurf、Zed 等编辑器
- 通过 IDE 插件集成

---

## 七、工具系统

### 7.1 内置工具
OpenCode 为 LLM 提供多种工具，可通过权限系统启用/禁用：

| 工具 | 说明 | 权限名称 |
|------|------|---------|
| `bash` | 执行 shell 命令 | bash |
| `edit` | 编辑文件内容 | edit |
| `write` | 写入/创建文件 | edit |
| `read` | 读取文件内容 | read |
| `grep` | 内容搜索 | grep |
| `glob` | 文件匹配 | glob |
| `list` | 目录列表 | list |
| `task` | 调用子 agent | task |
| `webfetch` | 网页抓取 | webfetch |
| `websearch` | 网络搜索 | websearch |
| `codesearch` | 代码搜索 | codesearch |
| `lsp` | 语言服务器协议 | lsp |
| `skill` | 技能调用 | skill |
| `todowrite` | 任务列表写入 | todowrite |

### 7.2 权限系统（核心机制）

> **重要**: `tools` 字段已被标记为 `@deprecated`，应使用 `permission` 字段。

#### 权限规则结构
```typescript
{
  permission: "edit",        // 权限名称
  pattern: "*",              // 匹配模式（支持通配符）
  action: "allow" | "deny" | "ask"
}
```

#### 评估逻辑
- 规则按定义顺序排列，**最后匹配的规则获胜** (`findLast`)
- 无匹配时默认为 `"ask"`（需要用户确认）
- 使用通配符匹配 (`Wildcard.match`)
- `write`、`edit`、`apply_patch`、`multiedit` 工具统一映射到 `edit` 权限

#### 配置格式
```jsonc
{
  "permission": {
    "read": "allow",                    // 所有 read 操作允许
    "edit": {                           // edit 操作按路径细分
      "*": "deny",                      // 默认禁止编辑
      "src/**/*.ts": "allow",           // 但允许编辑 TypeScript 源文件
      "*.env": "ask"                    // .env 文件需要确认
    },
    "bash": "ask",                      // bash 命令需要确认
    "external_directory": {
      "/tmp/*": "allow",
      "*": "ask"
    }
  }
}
```

#### 默认权限规则
```
"*": "allow"                           // 默认允许所有操作
doom_loop: "ask"                       // 死循环检测需要确认
external_directory: { "*": "ask" }     // 外部目录访问需要确认
question: "deny"                       // 禁止提问工具
plan_enter: "deny"                     // 禁止进入计划模式
plan_exit: "deny"                      // 禁止退出计划模式
read: { "*": "allow", "*.env": "ask" } // .env 文件读取需要确认
```

### 7.3 自定义工具
可通过 MCP 服务器或插件系统扩展自定义工具。

---

## 八、代理（Agents）系统

### 8.1 Agent 配置完整 Schema

```typescript
{
  model: string,           // "anthropic/claude-sonnet-4-5"
  variant: string,         // 模型变体
  temperature: number,     // 温度参数
  top_p: number,           // top_p 参数
  prompt: string,          // 自定义系统提示词
  tools: Record<string, boolean>,  // @deprecated 旧版工具权限
  disable: boolean,        // 禁用该 agent
  description: string,     // 何时使用该 agent 的描述
  mode: "subagent" | "primary" | "all",  // 模式
  hidden: boolean,         // 在 @ 自动补全中隐藏
  options: Record<string, any>,  // 自定义选项
  color: string,           // hex 颜色或主题色名
  steps: number,           // 最大 agentic 迭代次数
  maxSteps: number,        // @deprecated 使用 steps
  permission: Permission,  // 权限规则集
}
```

### 8.2 代理定义方式
1. **JSON 配置**: 在 `opencode.json` 的 `agent` 字段中定义
2. **Markdown 文件**: 放在 `~/.config/opencode/agents/` 或 `.opencode/agents/` 目录

### 8.3 Markdown Agent 文件解析规则

根据源码 `loadAgent()` 函数：
1. 扫描 `{agent,agents}/**/*.md` 路径
2. 使用 `gray-matter` 解析 YAML frontmatter
3. 文件名（去扩展名）作为 agent `name`
4. frontmatter 中的字段合并到配置
5. **Markdown 正文作为 `prompt` 字段**

```yaml
---
model: anthropic/claude-sonnet-4-5
mode: primary
color: "#44BA81"
permission:
  edit:
    "*": deny
  task: allow
---

你是项目经理，负责...（这里是完整的系统提示词）
```

### 8.4 内置代理

OpenCode 内置了 **7 个 Agent**:

| Agent | Mode | 描述 | 权限特点 |
|-------|------|------|---------|
| `build` | primary | 默认 agent，完整工具访问权限 | question: allow, plan_enter: allow |
| `plan` | primary | 计划模式，禁止编辑工具 | edit: deny, plan_exit: allow |
| `general` | subagent | 通用子 agent，研究和多步任务 | todowrite: deny |
| `explore` | subagent | 快速代码库探索 | 只读工具: allow, 其他: deny |
| `compaction` | primary (hidden) | 上下文压缩专用 | 全部: deny |
| `title` | primary (hidden) | 会话标题生成 | 全部: deny, temperature: 0.5 |
| `summary` | primary (hidden) | 会话摘要生成 | 全部: deny |

### 8.5 代理特性
- 每个代理可配置独立模型、提示词、工具集
- 支持主代理和子代理
- `default_agent` 设置默认使用的代理（必须是 primary mode 且非 hidden）
- 命令可指定特定代理执行

### 8.6 Agent 间通信机制

**没有直接的 Agent-to-Agent 消息传递**。通信完全通过：

1. **`task` 工具** -- 父 agent 调用 task 工具创建子 session
2. **Session 父子关系** -- 子 session 有 `parentID` 指向父 session
3. **结果返回** -- 子 session 的产出通过 `task_result` 标签返回给父 agent

```typescript
// task 工具参数
{
  description: "任务简短描述 (3-5词)",
  prompt: "要执行的任务",
  subagent_type: "使用的子 agent 类型 (如 general, explore)",
  task_id: "可选，恢复之前的任务",
  command: "可选，触发此任务的命令"
}
```

### 8.7 系统提示词组装顺序

最终 system prompt 由以下来源按顺序组装：

1. **Provider 特定提示词** -- 根据模型选择（anthropic.txt, gpt.txt, gemini.txt 等）
2. **Agent 自定义 prompt** -- `agent.prompt` 字段
3. **环境信息** -- 工作目录、平台、日期等
4. **Instructions 文件** -- AGENTS.md、CLAUDE.md 等指令文件
5. **Skills 信息** -- 可用 skills 列表
6. **Plan mode 提醒** -- 如果是 plan agent
7. **Plugin hooks** -- 插件通过 `experimental.chat.system.transform` 注入

---

## 九、规则与指令

### 9.1 AGENTS.md
通过 `/init` 命令在项目根目录生成，包含：
- 项目结构分析
- 编码规范
- 技术栈信息

> 建议将 `AGENTS.md` 提交到 Git。

### 9.2 指令文件
通过 `instructions` 配置指定额外指令文件路径，支持 glob 模式：
```jsonc
{
  "instructions": ["CONTRIBUTING.md", "docs/guidelines.md", ".cursor/rules/*.md"]
}
```

---

## 十、MCP / LSP / ACP

### 10.1 MCP 服务器 (Model Context Protocol)
```jsonc
{
  "mcp": {
    "jira": {
      "type": "remote",
      "url": "https://jira.example.com/mcp",
      "enabled": true
    },
    "local-tool": {
      "type": "local",
      "command": ["npx", "-y", "@some/mcp-server"],
      "environment": { "API_KEY": "xxx" },
      "timeout": 10000
    }
  }
}
```
- 支持本地和远程 MCP 服务器
- 可扩展 LLM 的工具能力
- 每个 MCP 工具执行前都需要权限确认
- 远程服务器支持 OAuth 2.0 自动检测

### 10.2 LSP 服务器 (Language Server Protocol)
```jsonc
{
  "lsp": {
    "typescript": {
      "command": ["typescript-language-server", "--stdio"],
      "extensions": [".ts", ".tsx", ".js", ".jsx"],
      "env": { "NODE_PATH": "..." },
      "initialization": { /* 自定义初始化选项 */ }
    },
    "pyright": { "disabled": true }  // 禁用特定 LSP
  }
}
```
- 提供 hover、definition、references、implementation、diagnostics 等能力
- 自定义 LSP 服务器必须提供 `extensions` 数组

### 10.3 ACP 支持 (Agent Client Protocol)
- **不是 agent 间通信协议**，而是外部 API 接口
- 允许外部客户端（如 IDE 插件）通过 HTTP API 驱动 OpenCode agent
- 本质上是 OpenCode server 模式的外部 API 封装

---

## 十一、命令（Commands）系统

### 11.1 Command Schema

```typescript
{
  name: string,
  description: string,
  agent: string,           // 指定使用哪个 agent
  model: string,           // 指定使用哪个模型
  template: string,        // 提示词模板
  subtask: boolean,        // 是否作为子任务运行
  hints: string[]          // 参数提示（从模板中自动提取）
}
```

### 11.2 参数替换

- `$ARGUMENTS` -- 用户输入的全部参数
- `$1`, `$2`, `$3`... -- 按位置编号的参数
- `hints()` 函数从模板中提取所有参数占位符，用于 UI 提示

### 11.3 Command 加载路径

```
{command,commands}/**/*.md
// 即: .opencode/command/*.md, .opencode/commands/*.md, command/*.md, commands/*.md
```

### 11.4 Command 来源

Command 可以从三个来源加载：
1. **配置文件**: `.opencode/command/*.md` 中的 markdown 文件
2. **MCP 服务器**: 从 MCP server 的 prompts 动态生成
3. **Skills**: 从 skill 定义生成

---

## 十二、插件系统

### 12.1 插件来源
- **npm 包**: 通过 `plugin` 配置项加载
- **本地文件**: 放在 `.opencode/plugins/` 或 `~/.config/opencode/agents/plugins/`

### 12.2 已知插件
| 插件 | 功能 |
|------|------|
| `opencode-helicone-session` | 自动将每个对话记录为 Helicone 会话 |
| `opencode-gitlab-plugin` | GitLab MR 审查、Issue 跟踪、流水线监控 |

### 12.3 插件能力
- 自定义工具
- 钩子（hooks）
- 集成扩展

### 12.4 Plugin Hooks

```typescript
// 可用 hooks
"tool.execute.before"          // 工具执行前
"tool.execute.after"           // 工具执行后
"experimental.chat.system.transform"  // 系统提示词转换
"experimental.chat.messages.transform" // 消息转换
"experimental.session.compacting"      // 压缩过程定制
"shell.env"                    // Shell 环境变量注入
"config"                       // 配置变更通知
"event"                        // 总线事件通知
```

---

## 十三、主题与快捷键

### 13.1 主题
- 通过 `/themes` 命令切换
- 可在配置中设置默认主题
- 支持自定义主题（`.opencode/themes/` 或 `~/.config/opencode/themes/`）

### 13.2 快捷键
- 默认前导键: `ctrl+x`
- 可通过 `keybinds` 配置自定义
- [详见快捷键文档](https://opencode.ai/docs/zh-cn/keybinds/)

---

## 十四、分享功能

### 14.1 分享模式
| 模式 | 说明 |
|------|------|
| `manual` | 手动通过 `/share` 命令分享（默认） |
| `auto` | 自动分享新会话 |
| `disabled` | 完全禁用分享 |

### 14.2 取消分享
使用 `/unshare` 命令。

### 14.3 隐私
- 对话默认不会被分享
- 分享后生成链接并复制到剪贴板
- 企业版建议禁用分享

---

## 十五、数据持久化

### 15.1 存储位置
| 平台 | 路径 |
|------|------|
| macOS/Linux | `~/.local/share/opencode/` |
| Windows | `%USERPROFILE%\.local\share\opencode\` |

### 15.2 目录结构
```
~/.local/share/opencode/
├── auth.json              # 认证数据（API 密钥、OAuth Token）
├── log/                   # 应用日志（保留最近 10 个）
└── project/
    ├── <project-slug>/storage/   # Git 项目的会话数据
    └── global/storage/           # 非 Git 项目的会话数据
```

### 15.3 缓存
- **macOS/Linux**: `~/.cache/opencode/`
- **Windows**: `%USERPROFILE%\.cache\opencode\`
- 存储提供商包缓存

### 15.4 日志
- 以时间戳命名（如 `2025-01-09T123456.log`）
- 通过 `--log-level DEBUG` 获取详细调试信息
- 通过 `--print-logs` 在终端中查看

---

## 十六、网络配置

### 16.1 代理支持
```bash
export HTTPS_PROXY=https://proxy.example.com:8080
export HTTP_PROXY=http://proxy.example.com:8080
export NO_PROXY=localhost,127.0.0.1   # 必须绕过本地服务器
```

### 16.2 代理认证
```bash
export HTTPS_PROXY=http://username:password@proxy.example.com:8080
```

### 16.3 自定义 CA 证书
```bash
export NODE_EXTRA_CA_CERTS=/path/to/ca-cert.pem
```

---

## 十七、企业版

### 17.1 核心特性
- **零数据存储**: OpenCode 不存储任何代码或上下文数据
- **集中式配置**: 通过 `.well-known/opencode` 端点统一管理
- **SSO 集成**: 与组织身份管理系统集成
- **内部 AI 网关**: 强制所有请求走内部网关
- **自托管分享**: 可在自有基础设施上托管分享页面（路线图）

### 17.2 定价
- 按席位定价
- 自带 LLM 网关不收取 Token 费用
- 联系 contact@anoma.ly 获取报价

### 17.3 私有 NPM 注册表
支持通过 `.npmrc` 文件配置私有注册表（JFrog Artifactory、Nexus 等）。

### 17.4 系统级配置目录
```
macOS:    /Library/Application Support/opencode
Windows:  C:\ProgramData\opencode
Linux:    /etc/opencode
```
系统级配置优先级最高，由管理员控制。

---

## 十八、Windows WSL 支持

### 18.1 推荐配置
- 使用 WSL 获得最佳体验
- 通过 `/mnt/c/` 等路径访问 Windows 文件
- 建议将项目克隆到 WSL 文件系统以获得更好性能

### 18.2 桌面应用 + WSL 服务器
```bash
# WSL 中启动服务器
OPENCODE_SERVER_PASSWORD=your-password opencode serve --hostname 0.0.0.0 --port 4096

# 桌面应用连接 http://localhost:4096
```

### 18.3 Web 客户端 + WSL
```bash
# 在 WSL 终端中运行
opencode web --hostname 0.0.0.0

# Windows 浏览器访问 http://localhost:<port>
```

---

## 十九、故障排除

### 19.1 常见问题

| 问题 | 解决方法 |
|------|---------|
| OpenCode 无法启动 | 检查日志、`--print-logs`、`opencode upgrade` |
| 身份验证问题 | `/connect` 重新认证、检查 API 密钥 |
| 模型不可用 | 检查认证、验证模型名称格式 `<provider>/<model>` |
| ProviderInitError | 验证提供商配置、清除 `~/.local/share/opencode/` |
| AI_APICallError | 清除 `~/.cache/opencode/` 重新安装包 |
| Linux 复制/粘贴 | 安装 `xclip`/`xsel`（X11）或 `wl-clipboard`（Wayland） |

### 19.2 桌面应用问题排查流程
1. 完全退出并重新启动
2. 禁用插件（检查配置和插件目录）
3. 清除缓存（`~/.cache/opencode/`）
4. 检查服务器连接设置
5. 重置桌面应用存储（最后手段）

---

## 二十、开发相关

### 20.1 SDK
OpenCode 提供 SDK 供开发者集成。

### 20.2 服务器
- 支持 HTTP API 交互
- mDNS 服务发现
- CORS 配置

### 20.3 生态系统
- 插件生态系统
- 社区贡献的提供商和工具

---

## 二十一、核心工作流示例

### 21.1 初始化项目
```bash
cd /path/to/project
opencode
/init          # 创建 AGENTS.md
```

### 21.2 提问（引用文件）
```
How is authentication handled in @packages/functions/src/api/index.ts?
```

### 21.3 计划模式添加功能
1. 按 **Tab** 切换到计划模式
2. 描述需求
3. 可附加图片作为设计参考
4. 迭代计划
5. 按 **Tab** 切换回构建模式
6. 让 AI 实施

### 21.4 直接修改
```
We need to add authentication to the /settings route.
Take a look at how this is handled in the /notes route in @packages/functions/src/notes.ts
and implement the same logic in @packages/functions/src/settings.ts
```

### 21.5 撤销/重做
```
/undo     # 撤销最后修改
/redo     # 重做
```

### 21.6 分享对话
```
/share    # 生成分享链接
```

---

## 二十二、环境变量汇总

| 变量 | 用途 |
|------|------|
| `OPENCODE_CONFIG` | 自定义配置文件路径 |
| `OPENCODE_CONFIG_DIR` | 自定义配置目录 |
| `OPENCODE_CONFIG_CONTENT` | 内联配置（JSON 字符串） |
| `OPENCODE_PORT` | 服务器端口 |
| `OPENCODE_SERVER_PASSWORD` | 服务器访问密码 |
| `EDITOR` | 外部编辑器 |
| `HTTPS_PROXY` / `HTTP_PROXY` | 代理服务器 |
| `NO_PROXY` | 绕过代理的地址 |
| `NODE_EXTRA_CA_CERTS` | 自定义 CA 证书 |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Bedrock 认证 |
| `AWS_PROFILE` | AWS 命名配置文件 |
| `AWS_REGION` | AWS 区域 |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock Bearer Token |
| `GOOGLE_APPLICATION_CREDENTIALS` | Vertex AI 服务账户 |
| `GOOGLE_CLOUD_PROJECT` | GCP 项目 ID |
| `AZURE_RESOURCE_NAME` | Azure OpenAI 资源名 |
| `GITLAB_INSTANCE_URL` | 自托管 GitLab URL |
| `GITLAB_TOKEN` | GitLab PAT |
| `AICORE_SERVICE_KEY` | SAP AI Core 服务密钥 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |
| `CLOUDFLARE_GATEWAY_ID` | Cloudflare 网关 ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| `OC_ALLOW_WAYLAND` | 允许 Wayland（Linux 桌面） |

---

## 二十三、目录结构约定

### 全局配置目录 (`~/.config/opencode/`)
```
~/.config/opencode/
├── opencode.json(c)       # 全局配置文件
├── agents/                # 全局代理定义
├── commands/              # 全局命令
├── modes/                 # 全局模式
├── plugins/               # 全局插件
├── skills/                # 全局技能
├── themes/                # 全局主题
└── tools/                 # 全局工具
```

### 项目配置目录 (`.opencode/`)
```
.opencode/
├── agents/                # 项目级代理
├── commands/              # 项目级命令
├── modes/                 # 项目级模式
├── plugins/               # 项目级插件
├── skills/                # 项目级技能
├── themes/                # 项目级主题
└── tools/                 # 项目级工具
```

> 子目录使用**复数名称**。为向后兼容，也支持单数名称。

---

## 二十四、关键设计理念

1. **零数据存储**: OpenCode 不存储用户的代码或上下文数据，所有处理在本地或通过直接 API 调用完成
2. **配置合并**: 多层配置合并而非替换，灵活且可覆盖
3. **Git 集成**: `/undo` 和 `/redo` 依赖 Git 管理文件变更
4. **OpenAI 兼容**: 任何 OpenAI 兼容的 API 都可以作为提供商
5. **模块化**: 通过 MCP、LSP、ACP、插件系统实现高度可扩展性
6. **多界面**: TUI、CLI、Web、Desktop、IDE 多种交互方式
7. **企业就绪**: 支持集中式配置、SSO、内部 AI 网关、私有 NPM

---

## 二十五、源码架构深度解析

### 25.1 核心架构

OpenCode 基于 **Effect** 函数式编程框架构建，采用 ServiceMap 依赖注入模式：

```
Effect Runtime
  ├── Config.Service      # 配置服务
  ├── Agent.Service       # Agent 服务
  ├── Provider.Service    # 提供商服务
  ├── Permission.Service  # 权限服务
  ├── Session.Service     # 会话服务
  ├── Command.Service     # 命令服务
  ├── MCP.Service         # MCP 服务
  ├── LSP.Service         # LSP 服务
  ├── Plugin.Service      # 插件服务
  └── Skill.Service       # 技能服务
```

### 25.2 权限系统源码解析

**文件**: `packages/opencode/src/permission/index.ts` 和 `evaluate.ts`

```typescript
// 三种动作
export const Action = z.enum(["allow", "deny", "ask"])

// 单条规则
export const Rule = z.object({
  permission: z.string(),   // 权限名称
  pattern: z.string(),      // 匹配模式（支持通配符）
  action: Action,           // allow / deny / ask
})

// 评估逻辑：findLast - 最后匹配的规则获胜
export function evaluate(permission, pattern, ...rulesets) {
  const rules = rulesets.flat()
  const match = rules.findLast(
    (rule) => Wildcard.match(permission, rule.permission) && 
              Wildcard.match(pattern, rule.pattern)
  )
  return match ?? { action: "ask", permission, pattern: "*" }  // 默认 ask
}
```

**关键设计**:
- 既不是纯白名单也不是纯黑名单 -- 是基于规则的优先级匹配系统
- 规则按定义顺序排列，**最后匹配的规则获胜**
- 无匹配时默认为 `"ask"`（需要用户确认）
- 使用通配符匹配 (`Wildcard.match`)

### 25.3 权限合并逻辑

每个 Agent 的权限 = `defaults` + `agent-specific` + `user-config` 三层合并：

```typescript
// build agent 的权限构建
permission: Permission.merge(
  defaults,                              // 全局默认规则
  Permission.fromConfig({                // build 特有规则
    question: "allow",
    plan_enter: "allow",
  }),
  user,                                  // 用户自定义配置
)
```

### 25.4 子 Session 权限继承

子 session 创建时自动继承/限制权限：

```typescript
return await Session.create({
  parentID: ctx.sessionID,
  title: params.description + ` (@${agent.name} subagent)`,
  permission: [
    // 如果子 agent 没有 todowrite 权限，显式 deny
    ...(hasTodoWritePermission ? [] : [{ permission: "todowrite", pattern: "*", action: "deny" }]),
    // 如果子 agent 没有 task 权限，显式 deny（防止递归调用）
    ...(hasTaskPermission ? [] : [{ permission: "task", pattern: "*", action: "deny" }]),
  ],
})
```

### 25.5 上下文压缩机制

**文件**: `packages/opencode/src/session/compaction.ts`

```typescript
export const PRUNE_MINIMUM = 20_000   // 至少需要修剪这么多才执行
export const PRUNE_PROTECT = 40_000   // 保留最近 40k tokens 不修剪
const PRUNE_PROTECTED_TOOLS = ["skill"]  // skill 工具输出不被修剪
```

**压缩过程**:
1. **Prune (修剪)**: 向后遍历 tool 输出，删除超过 40,000 tokens 的旧 tool 输出
2. **Compact (压缩)**: 使用专用的 `compaction` agent 生成对话摘要
3. **Replay**: 如果压缩后还有未处理的用户消息，重新播放

### 25.6 Plan Mode 工作流

这是 OpenCode 中最接近 "orchestration" 的机制：

```
Phase 1: 理解 -- 启动最多 3 个 explore agents 并行探索代码库
Phase 2: 设计 -- 启动 general agent(s) 设计实现方案
Phase 3: 审查 -- 审查计划并确保符合用户意图
Phase 4: 最终计划 -- 写入 plan 文件
Phase 5: 调用 plan_exit -- 通知用户计划完成
```

### 25.7 多 Agent 编排真相

OpenCode **没有**内置的通用 workflow/orchestration 引擎。多 agent 协作完全通过：

1. `task` 工具手动编排
2. Plan mode 的固定 5 阶段工作流
3. 提示词中的指令（如 "launch up to 3 explore agents in parallel"）

**这意味着**：要实现自定义多 agent 工作流，需要在 agent 的 prompt 中明确指示编排逻辑。

---

## 二十六、多 Agent 架构最佳实践

### 26.1 Agent 设计原则

1. **职责单一**: 每个 agent 只负责一个明确的任务
2. **权限最小化**: 只授予完成工作所需的最小权限
3. **使用 permission 而非 tools**: `tools` 已 deprecated
4. **设置合理的 steps**: 防止 agent 陷入无限循环
5. **利用 color 字段**: 增强 TUI 中的视觉区分

### 26.2 上下文传递策略

由于没有直接的 agent-to-agent 通信：

| 策略 | 适用场景 | 优缺点 |
|------|---------|--------|
| 文件系统传递 | 结构化产出物 | 可靠，但需要约定路径 |
| Task tool prompt | 简短上下文 | 简单，但有 token 限制 |
| 共享工作目录 | 多步骤协作 | 灵活，但需要状态管理 |

### 26.3 错误处理策略

```
构建失败 → QA报告问题 → 项目经理读取错误 → 前端专家修复 → 重新验证
                                                    ↓
                                              最多重试 3 次
                                                    ↓
                                              仍失败 → 通知用户
```

---

*文档基于 OpenCode 官方文档 + 源码深度分析整理*
*最后更新时间：2026年4月2日*
*源码分析基于 packages/opencode/src/ 目录 (agent/, config/, permission/, command/, session/, mcp/, lsp/, plugin/)*
