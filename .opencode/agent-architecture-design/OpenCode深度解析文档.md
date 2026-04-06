# OpenCode 深度解析文档

> 基于官方文档全量爬取 + GitHub 源码深度分析整理
> 分析日期：2026年4月6日
> 源码分支：v1.3.17 (最新稳定版)
> 文档版本：v2.1

---

## 目录

- [一、项目概述](#一项目概述)
- [二、整体架构设计](#二整体架构设计)
- [三、核心技术栈](#三核心技术栈)
- [四、源码目录结构全景](#四源码目录结构全景)
- [五、核心模块深度解析](#五核心模块深度解析)
- [六、数据流与请求生命周期](#六数据流与请求生命周期)
- [七、扩展系统架构](#七扩展系统架构)
- [八、多端架构设计](#八多端架构设计)
- [九、安全与权限体系](#九安全与权限体系)
- [十、配置系统深度解析](#十配置系统深度解析)
- [十一、Agent 系统架构](#十一agent-系统架构)
- [十二、工具系统架构](#十二工具系统架构)
- [十三、会话管理系统](#十三会话管理系统)
- [十四、插件系统架构](#十四插件系统架构)
- [十五、MCP/LSP/ACP 协议集成](#十五mcplspacp-协议集成)
- [十六、Provider 提供商系统](#十六provider-提供商系统)
- [十七、TUI 终端界面架构](#十七tui-终端界面架构)
- [十八、Web/Desktop 应用架构](#十八webdesktop-应用架构)
- [十九、GitHub/GitLab CI 集成](#十九githubgitlab-ci-集成)
- [二十、商业化产品矩阵](#二十商业化产品矩阵)
- [二十一、生态系统与社区](#二十一生态系统与社区)
- [二十二、设计模式与最佳实践](#二十二设计模式与最佳实践)
- [二十三、与竞品对比分析](#二十三与竞品对比分析)
- [二十四、未来发展趋势](#二十四未来发展趋势)
- [二十五、开发者上手指南](#二十五开发者上手指南)

---

## 一、项目概述

### 1.1 产品定位

**OpenCode** 是由 [Anomaly](https://anoma.ly) 团队开发的开源 AI 编码代理（AI Coding Agent）。它提供多种交互界面，支持 75+ LLM 提供商，旨在帮助开发者高效地完成编程任务。

- **GitHub**: https://github.com/anomalyco/opencode
- **文档**: https://opencode.ai/docs/
- **Discord**: https://opencode.ai/discord
- **开源协议**: 见仓库 LICENSE
- **技术栈**: TypeScript + Bun + Effect (函数式编程框架)
- **架构**: 基于 Effect 的 ServiceMap 依赖注入系统

### 1.2 核心价值主张

1. **开源开放**: 完全开源，社区驱动
2. **多提供商支持**: 75+ LLM 提供商，不绑定任何单一供应商
3. **多界面交互**: TUI、CLI、Web、Desktop、IDE 扩展、ACP
4. **企业就绪**: 零数据存储、集中式配置、SSO 集成
5. **高度可扩展**: 插件、MCP、LSP、自定义工具、技能系统

### 1.3 安装方式

| 方式 | 命令 |
|------|------|
| 安装脚本（推荐） | `curl -fsSL https://opencode.ai/install \| bash` |
| npm | `npm install -g opencode-ai` |
| Bun | `bun install -g opencode-ai` |
| pnpm | `pnpm install -g opencode-ai` |
| Yarn | `yarn global add opencode-ai` |
| Homebrew | `brew install anomalyco/tap/opencode` |
| Arch Linux | `sudo pacman -S opencode` 或 `paru -S opencode-bin` |
| Chocolatey | `choco install opencode` |
| Scoop | `scoop install opencode` |
| Docker | `docker run -it --rm ghcr.io/anomalyco/opencode` |
| Mise | `mise use -g github:anomalyco/opencode` |
| Nix | `nix run nixpkgs#opencode` |

### 1.4 版本信息 (v1.3.17)

- **GitHub Stars**: 138k+
- **Forks**: 15.2k+
- **Contributors**: 843+
- **Commits**: 10,890+
- **语言分布**: TypeScript 57.8%, MDX 38.4%, CSS 2.9%, Rust 0.5%

---

## 二、整体架构设计

### 2.1 架构全景图

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层 (Clients)                         │
├─────────────┬──────────┬──────────┬──────────┬────────┬─────────┤
│    TUI      │   CLI    │   Web    │ Desktop  │  IDE   │   ACP   │
│  (终端界面)  │ (命令行)  │ (浏览器)  │ (Tauri)  │ (插件)  │ (协议)  │
└──────┬──────┴────┬─────┴────┬─────┴────┬─────┴───┬────┴────┬────┘
       │           │          │          │         │         │
       └───────────┴──────────┴──────────┴─────────┴─────────┘
                              │
                    HTTP API / SSE Events
                              │
┌─────────────────────────────┴─────────────────────────────────┐
│                      服务器层 (Server)                          │
├───────────────────────────────────────────────────────────────┤
│                    OpenAPI 3.1 REST API                       │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬────────┐ │
│  │ Session │ Message │  File   │  Agent  │  Config │  MCP   │ │
│  │ Routes  │ Routes  │ Routes  │ Routes  │ Routes  │ Routes │ │
│  └─────────┴─────────┴─────────┴─────────┴─────────┴────────┘ │
└─────────────────────────────┬─────────────────────────────────┘
                              │
┌─────────────────────────────┴─────────────────────────────────┐
│                      核心引擎层 (Core)                          │
├──────────┬──────────┬──────────┬──────────┬──────────┬────────┤
│ Session  │  Agent   │  Tool    │ Provider │ Permission│ Plugin │
│ Manager  │ Manager  │ Registry │ Manager  │  Engine  │ Loader │
├──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│   LSP    │   MCP    │  Skill   │ Command  │  Format  │  Bus   │
│ Manager  │ Manager  │ Manager  │ Manager  │  Manager │ (事件)  │
└──────────┴──────────┴──────────┴──────────┴──────────┴────────┘
                              │
┌─────────────────────────────┴─────────────────────────────────┐
│                      基础设施层 (Infrastructure)                 │
├──────────┬──────────┬──────────┬──────────┬──────────┬────────┤
│ SQLite   │  File    │  Git     │  Shell   │  Ripgrep │  LSP   │
│ (存储)   │ Watcher  │  (VCS)   │ (Bash)   │ (搜索)   │ Server │
└──────────┴──────────┴──────────┴──────────┴──────────┴────────┘
```

### 2.2 分层架构说明

| 层级 | 职责 | 关键技术 |
|------|------|---------|
| **客户端层** | 用户交互界面，多种终端形态 | SolidJS (Web/TUI), Tauri (Desktop), VS Code API (IDE) |
| **API 层** | HTTP REST API + SSE 事件流 | Hono (路由), OpenAPI 3.1 规范 |
| **核心引擎层** | 业务逻辑处理，AI 交互编排 | Effect (函数式编程), Bun 运行时 |
| **基础设施层** | 底层系统能力 | SQLite, ripgrep, Git, LSP 协议 |

### 2.3 核心设计原则

1. **零数据存储**: OpenCode 不存储用户的代码或上下文数据，所有处理在本地完成或通过直接 API 调用
2. **配置合并**: 多层配置合并而非替换，灵活且可覆盖
3. **Git 集成**: `/undo` 和 `/redo` 依赖 Git 管理文件变更
4. **OpenAI 兼容**: 任何 OpenAI 兼容的 API 都可以作为提供商
5. **模块化**: 通过 MCP、LSP、ACP、插件系统实现高度可扩展性
6. **多界面**: TUI、CLI、Web、Desktop、IDE 多种交互方式

---

## 三、核心技术栈

### 3.1 运行时与框架

| 技术 | 用途 | 说明 |
|------|------|------|
| **Bun** | JavaScript 运行时 | 高性能运行时，内置包管理、测试、打包 |
| **Effect** | 函数式编程框架 | 类型安全的错误处理、依赖注入、并发控制 |
| **TypeScript** | 编程语言 | 全量类型安全 |
| **Zod** | Schema 验证 | 运行时类型校验 |
| **SQL.js / BetterSQLite3** | 数据存储 | 本地 SQLite 数据库 |

### 3.2 AI SDK 生态

| 技术 | 用途 |
|------|------|
| **AI SDK (ai-sdk.dev)** | 统一的 LLM 调用接口 |
| **Models.dev** | 模型元数据服务 |
| **@ai-sdk/openai** | OpenAI 兼容接口 |
| **@ai-sdk/anthropic** | Anthropic 接口 |
| **@ai-sdk/google** | Google 接口 |
| **@ai-sdk/openai-compatible** | 通用 OpenAI 兼容接口 |

### 3.3 前端技术栈

| 技术 | 用途 |
|------|------|
| **SolidJS** | Web 应用和 TUI 的响应式 UI 框架 |
| **Vite** | 构建工具 |
| **Tailwind CSS** | 样式系统 |
| **xterm.js** | 终端模拟 |

### 3.4 桌面与 IDE

| 技术 | 用途 |
|------|------|
| **Tauri** | 桌面应用框架 (基于 WebView2) |
| **VS Code Extension API** | IDE 插件 |
| **ACP (Agent Client Protocol)** | 编辑器集成协议 |

---

## 四、源码目录结构全景

基于 `dev` 分支的完整源码结构分析：

```
opencode/
├── .github/                    # GitHub 工作流与模板
│   ├── workflows/              # CI/CD 流水线 (15+ workflows)
│   ├── ISSUE_TEMPLATE/         # Issue 模板
│   └── actions/                # 自定义 Actions
├── .opencode/                  # OpenCode 自身配置
│   ├── agent/                  # 内部 Agent 定义 (triage, translator, duplicate-pr)
│   ├── command/                # 内部命令 (commit, changelog, issues 等)
│   ├── glossary/               # 多语言术语表 (16 种语言)
│   ├── themes/                 # 主题配置
│   └── opencode.jsonc          # 自身配置文件
├── github/                     # GitHub Action 包
│   ├── action.yml              # Action 定义
│   └── index.ts                # Action 入口
├── infra/                      # 基础设施代码 (SST)
│   ├── app.ts                  # 应用基础设施
│   ├── console.ts              # 官网基础设施
│   └── enterprise.ts           # 企业版基础设施
├── packages/                   # Monorepo 包
│   ├── opencode/               # ★ 核心引擎包
│   │   └── src/
│   │       ├── account/        # 账户管理
│   │       ├── acp/            # ACP 协议实现
│   │       ├── agent/          # Agent 系统
│   │       ├── auth/           # 认证系统
│   │       ├── bus/            # 事件总线
│   │       ├── cli/            # 命令行接口
│   │       │   └── cmd/
│   │       │       ├── tui/    # TUI 实现 (核心交互界面)
│   │       │       ├── run.ts  # 非交互模式
│   │       │       ├── serve.ts# 服务器模式
│   │       │       └── web.ts  # Web 模式
│   │       ├── command/        # 命令系统
│   │       ├── config/         # 配置系统
│   │       ├── control-plane/  # 控制平面
│   │       ├── effect/         # Effect 运行时适配
│   │       ├── env/            # 环境变量
│   │       ├── file/           # 文件系统
│   │       ├── format/         # 格式化器
│   │       ├── lsp/            # LSP 服务器管理
│   │       ├── mcp/            # MCP 服务器管理
│   │       ├── npm/            # NPM 包管理
│   │       ├── patch/          # 补丁系统
│   │       ├── permission/     # 权限系统
│   │       ├── plugin/         # 插件系统
│   │       ├── project/        # 项目管理
│   │       ├── provider/       # 提供商系统
│   │       │   └── sdk/        # 各提供商 SDK
│   │       │       └── copilot/# GitHub Copilot SDK
│   │       ├── pty/            # PTY 终端
│   │       ├── question/       # 提问工具
│   │       ├── server/         # HTTP 服务器
│   │       │   └── routes/     # API 路由
│   │       ├── session/        # 会话管理
│   │       │   └── prompt/     # 系统提示词模板
│   │       ├── share/          # 分享功能
│   │       ├── shell/          # Shell 执行
│   │       ├── skill/          # 技能系统
│   │       ├── snapshot/       # 快照系统
│   │       ├── storage/        # 存储层
│   │       ├── sync/           # 同步系统
│   │       ├── tool/           # 工具注册与执行
│   │       └── util/           # 工具函数
│   ├── app/                    # Web 桌面应用 (SolidJS)
│   │   ├── src/
│   │   │   ├── components/     # UI 组件
│   │   │   ├── context/        # 状态管理
│   │   │   ├── pages/          # 页面组件
│   │   │   └── i18n/           # 国际化 (16 种语言)
│   │   └── e2e/                # Playwright 端到端测试
│   ├── console/                # 官网 (opencode.ai)
│   │   └── app/                # SolidJS 官网应用
│   ├── sdk/                    # JavaScript SDK
│   │   └── js/                 # @opencode-ai/sdk
│   └── web/                    # 文档站点 (Starlight/Astro)
│       └── src/content/docs/   # 多语言文档内容
├── nix/                        # Nix 包管理配置
├── install                     # 安装脚本
├── bun.lock                    # Bun 锁文件
├── package.json                # 根 package.json
└── flake.nix                   # Nix Flake 配置
```

---

## 五、核心模块深度解析

### 5.1 CLI 入口 (index.ts)

```typescript
// 核心流程
args → hideBin(process.argv) → yargs 解析 → middleware 初始化 → 命令执行

// 全局选项
--print-logs    // 打印日志到 stderr
--log-level     // 日志级别 DEBUG|INFO|WARN|ERROR
--pure          // 不加载外部插件

// 初始化中间件关键操作
1. 设置环境变量 (OPENCODE_PURE, AGENT, OPENCODE, OPENCODE_PID)
2. Log.init() - 初始化日志系统
3. Heap.start() - 启动堆内存监控
4. JsonMigration.run() - 首次运行时执行数据库迁移

// 注册的命令 (20+)
RunCommand, GenerateCommand, AttachCommand, McpCommand, DbCommand, 
ServeCommand, WebCommand, AgentCommand, ModelsCommand, etc.
```

### 5.2 Effect 函数式编程架构

OpenCode 的核心基于 **Effect** 框架构建，这是其最独特的技术选型。

#### 5.2.1 为什么选择 Effect？

- **类型安全的错误处理**: 所有错误都在类型系统中显式声明
- **依赖注入**: ServiceMap 模式提供编译时依赖检查
- **并发控制**: 内置的并发原语（Fiber、Queue、Hub）
- **资源管理**: 自动的 Scope 管理和资源清理
- **可组合性**: 所有 Effect 程序都是可组合的

#### 5.2.2 核心 Effect 模块

```
packages/opencode/src/effect/
├── cross-spawn-spawner.ts   # 跨平台进程生成
├── instance-ref.ts          # 实例引用管理
├── instance-registry.ts     # 实例注册表
├── instance-state.ts        # 实例状态管理
├── run-service.ts           # 服务运行器
└── runner.ts                # Effect 运行器
```

#### 5.2.3 ServiceMap 模式

```typescript
// Agent Service 示例
export class Service extends ServiceMap.Service<Service, Interface>()("@opencode/Agent") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function*() {
    // 创建服务实现
    return Service.of({
      get: Effect.fn("Agent.get")(function*(agent: string) { ... }),
      list: Effect.fn("Agent.list")(function*() { ... }),
    })
  })
)

// 运行时创建
const { runPromise } = makeRuntime(Service, defaultLayer)
export async function get(agent: string) {
  return runPromise((svc) => svc.get(agent))
}
```

### 5.3 Agent 核心 (agent/agent.ts)

#### 5.3.1 Agent.Info 数据结构

```typescript
{
  name: string,                    // Agent 名称
  description?: string,           // 描述
  mode: "subagent"|"primary"|"all", // 运行模式
  native?: boolean,                // 是否内置
  hidden?: boolean,               // 是否隐藏 (UI 中隐藏)
  topP?: number,                   // Top P 采样
  temperature?: number,           // 温度
  color?: string,                 // UI 颜色
  permission: Permission.Ruleset,  // 权限规则
  model?: { modelID, providerID }, // 指定模型
  variant?: string,              // 模型变体
  prompt?: string,               // 系统提示词
  options?: Record,              // 自定义选项
  steps?: number,                // 最大步数
}
```

#### 5.3.2 内置 Agent 详解

| Agent | Mode | 描述 | 权限配置 |
|-------|------|------|----------|
| `build` | primary | 默认执行 Agent | 允许大部分工具，询问危险操作 |
| `plan` | primary | 计划模式 | 禁止 edit/bash，允许读取 |
| `general` | subagent | 通用研究 | 禁止 todowrite |
| `explore` | subagent | 代码库探索 | 只读工具允许 |
| `compaction` | hidden | 上下文压缩 | 禁止所有工具 |
| `title` | hidden | 标题生成 | 禁止所有工具，温度 0.5 |
| `summary` | hidden | 总结生成 | 禁止所有工具 |

### 5.4 Session 管理 (session/index.ts)

#### 5.4.1 Session 数据结构

```typescript
{
  id: SessionID,           // 会话唯一标识
  slug: string,           // URL 友好标识
  projectID: ProjectID,    // 所属项目
  directory: string,      // 工作目录
  parentID?: SessionID,   // 父会话 (用于派生)
  title: string,          // 会话标题
  summary?: { ... },     // 变更摘要
  share?: { url },       // 分享链接
  time: { created, updated, compacting?, archived? }
}
```

#### 5.4.2 核心方法

- `Session.create()` - 创建新会话
- `Session.fork()` - 从现有会话派生
- `Session.updateMessage()` - 更新消息并发布同步事件
- `Session.updatePart()` - 更新消息部件 (text/tool/reasoning)
- `Session.share()/unshare()` - 管理分享链接

### 5.5 LLM 调用 (session/llm.ts)

#### 5.5.1 流式请求参数

```typescript
{
  user: MessageV2.User,           // 用户消息
  sessionID: string,              // 会话 ID
  parentSessionID?: string,      // 父会话 ID
  model: Provider.Model,         // 模型信息
  agent: Agent.Info,             // Agent 配置
  permission?: Permission.Ruleset,
  system: string[],              // 系统提示词
  messages: ModelMessage[],     // 历史消息
  small?: boolean,              // 是否使用小模型
  tools: Record<string, Tool>,  // 可用工具
}
```

#### 5.5.2 处理流程

1. 系统提示词构建 (Agent prompt → Provider prompt → User prompt)
2. 模型参数合并 (base → model.options → agent.options → variant)
3. 消息格式化 (根据 Provider 类型调整)
4. 工具处理 (权限过滤 + LiteLLM 兼容)
5. 特殊处理 (OpenTelemetry, Headers, 会话亲和性)

### 5.6 消息处理器 (session/processor.ts)

#### 5.6.1 事件处理

| 事件类型 | 处理逻辑 |
|----------|----------|
| `start` | 设置会话状态为 busy |
| `reasoning-start/delta/end` | 处理推理过程 |
| `tool-call` | 更新工具调用，检测死循环 |
| `tool-result` | 处理工具执行结果 |
| `text-start/delta/end` | 处理文本输出 |
| `error` | 抛出错误 |

#### 5.6.2 关键机制

- **死循环检测**: 连续 3 次相同工具调用触发询问
- **快照追踪**: 步骤开始前捕获快照，结束后对比差异
- **溢出检测**: 检查 token 使用量是否超过阈值

### 5.7 上下文压缩 (session/compaction.ts)

#### 5.7.1 常量

```typescript
PRUNE_MINIMUM = 20_000   // 最小裁剪 token 数
PRUNE_PROTECT = 40_000   // 保护 token 数 (保留最近 40k)
PRUNE_PROTECTED_TOOLS = ["skill"]  // 保护的工具
```

#### 5.7.2 压缩流程

1. 溢出检测 → 调用 overflow() 检查 token 数量
2. 裁剪 (prune) → 从后向前遍历，删除超过保护值的旧工具输出
3. 压缩 (process) → 调用 compaction agent 生成摘要
4. replay → 如果还有未处理消息，重新播放

### 5.8 工具注册 (tool/registry.ts)

#### 5.8.1 内置工具

```typescript
// 核心工具
invalid, ask, bash, read, glob, grep, 
edit, write, task, fetch, todo, search, 
code, skill, patch, lsp, batch, plan
```

#### 5.8.2 工具加载流程

1. 扫描配置目录的 `{tool,tools}/*.{js,ts}` 文件
2. 等待依赖安装完成
3. 动态导入模块
4. 从插件加载自定义工具
5. 根据模型过滤可用工具

### 5.9 配置系统 (config/config.ts)

#### 5.9.1 配置加载优先级

1. 远程配置 (`.well-known/opencode`)
2. 全局配置 (`~/.config/opencode/opencode.json`)
3. 自定义配置 (`OPENCODE_CONFIG` 环境变量)
4. 项目配置 (`opencode.json`)
5. `.opencode` 目录 (代理/命令/插件)
6. 内联配置 (`OPENCODE_CONFIG_CONTENT`)

#### 5.9.2 核心配置项

```typescript
{
  model: string,            // 默认模型
  small_model: string,     // 轻量模型
  provider: object,        // 提供商配置
  agent: object,           // 代理配置
  permission: object,      // 权限配置
  mcp: object,             // MCP 配置
  lsp: object,             // LSP 配置
  formatter: object,       // 格式化器配置
  plugin: string[],        // 插件列表
  instructions: string[],  // 指令文件
  theme: string,           // 主题
  tui: object,             // TUI 配置
  server: object,           // 服务器配置
  experimental: object     // 实验性功能
}
```
packages/opencode/src/effect/
├── cross-spawn-spawner.ts   # 跨平台进程生成
├── instance-ref.ts          # 实例引用管理
├── instance-registry.ts     # 实例注册表
├── instance-state.ts        # 实例状态管理
├── run-service.ts           # 服务运行器
└── runner.ts                # Effect 运行器
```

### 5.2 事件总线系统 (Bus)

```
packages/opencode/src/bus/
├── bus-event.ts    # 事件类型定义
├── global.ts       # 全局事件
└── index.ts        # 总线核心
```

事件总线是 OpenCode 内部各模块通信的核心机制，支持以下事件类别：

| 类别 | 事件 |
|------|------|
| **命令事件** | `command.executed` |
| **文件事件** | `file.edited`, `file.watcher.updated` |
| **安装事件** | `installation.updated` |
| **LSP 事件** | `lsp.client.diagnostics`, `lsp.updated` |
| **消息事件** | `message.part.updated`, `message.updated`, `message.removed` |
| **权限事件** | `permission.asked`, `permission.replied` |
| **服务器事件** | `server.connected` |
| **会话事件** | `session.created`, `session.compacted`, `session.idle`, `session.status` |
| **工具事件** | `tool.execute.before`, `tool.execute.after` |
| **TUI 事件** | `tui.prompt.append`, `tui.command.execute`, `tui.toast.show` |

### 5.3 存储系统

```
packages/opencode/src/storage/
├── db.bun.ts          # Bun 环境数据库适配
├── db.node.ts         # Node.js 环境数据库适配
├── db.ts              # 数据库核心
├── json-migration.ts  # JSON 存储迁移
├── schema.sql.ts      # SQL Schema 定义
├── schema.ts          # 数据 Schema
└── storage.ts         # 存储核心
```

**存储位置**:
- macOS/Linux: `~/.local/share/opencode/`
- Windows: `%USERPROFILE%\.local\share\opencode\`

**存储内容**:
- `auth.json` - 认证数据
- `log/` - 应用日志（保留最近 10 个）
- `project/<project-slug>/storage/` - Git 项目的会话数据
- `global/storage/` - 非 Git 项目的会话数据

### 5.4 文件系统

```
packages/opencode/src/file/
├── ignore.ts     # 忽略模式处理
├── index.ts      # 文件操作核心
├── protected.ts  # 受保护文件
├── ripgrep.ts    # ripgrep 集成
├── time.ts       # 文件时间处理
└── watcher.ts    # 文件监视器
```

底层使用 **ripgrep** 实现高效的文件搜索和目录遍历，默认遵循 `.gitignore` 规则。

---

## 六、数据流与请求生命周期

### 6.1 用户输入到 AI 响应的完整流程

```
用户输入 (TUI/CLI/Web)
       │
       ▼
┌──────────────┐
│  输入解析     │  解析 @文件引用、!bash命令、/斜杠命令
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  会话管理     │  Session.prompt() 创建消息
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  系统提示词组装 │  Provider提示 + Agent提示 + 环境信息 + Instructions
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  工具注册     │  内置工具 + MCP工具 + 插件工具 + 技能
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  权限检查     │  Permission.evaluate() 检查每个操作
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  LLM 调用     │  Provider → AI SDK → LLM API
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  工具执行     │  解析 tool_call → 执行工具 → 返回结果
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  响应处理     │  格式化 → 文件变更 → 事件广播
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  格式化处理   │  自动运行对应语言的格式化器
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  客户端更新   │  SSE 事件推送 → UI 更新
└──────────────┘
```

### 6.2 系统提示词组装顺序

最终 system prompt 由以下来源按顺序组装：

1. **Provider 特定提示词** — 根据模型选择（anthropic.txt, gpt.txt, gemini.txt 等）
2. **Agent 自定义 prompt** — `agent.prompt` 字段
3. **环境信息** — 工作目录、平台、日期等
4. **Instructions 文件** — AGENTS.md、CLAUDE.md 等指令文件
5. **Skills 信息** — 可用 skills 列表
6. **Plan mode 提醒** — 如果是 plan agent
7. **Plugin hooks** — 插件通过 `experimental.chat.system.transform` 注入

---

## 七、扩展系统架构

OpenCode 提供四层扩展能力：

```
扩展能力层级（从内到外）
┌─────────────────────────────────────────┐
│  Layer 4: 插件 (Plugins)                 │  ← 最强大，可访问所有内部 API
├─────────────────────────────────────────┤
│  Layer 3: MCP 服务器                     │  ← 外部工具集成
├─────────────────────────────────────────┤
│  Layer 2: 自定义工具 (Custom Tools)       │  ← TypeScript/JS 函数
├─────────────────────────────────────────┤
│  Layer 1: 技能 (Skills)                  │  ← SKILL.md 指令文件
└─────────────────────────────────────────┘
```

### 7.1 各层对比

| 特性 | Skills | Custom Tools | MCP | Plugins |
|------|--------|-------------|-----|---------|
| **定义方式** | SKILL.md 文件 | TypeScript/JS 函数 | 本地/远程服务器 | TypeScript/JS 模块 |
| **能力** | 指令注入 | 任意代码执行 | 外部服务集成 | 全系统访问 |
| **加载位置** | `.opencode/skills/` | `.opencode/tools/` | 配置定义 | `.opencode/plugins/` |
| **npm 支持** | ❌ | ❌ | ✅ | ✅ |
| **权限控制** | ✅ | ✅ | ✅ | ✅ |
| **复杂度** | 低 | 中 | 中 | 高 |

---

## 八、多端架构设计

### 8.1 六种交互界面

| 界面 | 技术栈 | 启动命令 | 适用场景 |
|------|--------|---------|---------|
| **TUI** | Bun + Ink (React-like) | `opencode` | 终端用户日常开发 |
| **CLI** | Bun | `opencode run "..."` | 脚本自动化、CI/CD |
| **Web** | SolidJS + HTTP Server | `opencode web` | 浏览器访问、远程协作 |
| **Desktop** | Tauri (WebView2) | 桌面应用 | 独立桌面应用体验 |
| **IDE** | VS Code Extension | 编辑器内调用 | IDE 内嵌使用 |
| **ACP** | stdio JSON-RPC | `opencode acp` | 第三方编辑器集成 |

### 8.2 服务器模式

```
opencode serve                    # 无界面 HTTP 服务器
opencode serve --hostname 0.0.0.0 --port 4096  # 网络访问
opencode serve --cors http://localhost:5173     # 允许 CORS
OPENCODE_SERVER_PASSWORD=xxx opencode serve    # 密码保护
```

**API 规范**: OpenAPI 3.1，可通过 `http://<host>:<port>/doc` 查看

### 8.3 服务器 API 端点概览

| 分类 | 端点 | 说明 |
|------|------|------|
| **全局** | `GET /global/health` | 健康检查 |
| | `GET /global/event` | SSE 全局事件流 |
| **项目** | `GET /project` | 列出所有项目 |
| | `GET /project/current` | 获取当前项目 |
| **配置** | `GET /config` | 获取配置 |
| | `PATCH /config` | 更新配置 |
| | `GET /config/providers` | 列出提供商 |
| **会话** | `GET/POST /session` | 列出/创建会话 |
| | `GET /session/:id` | 获取会话详情 |
| | `POST /session/:id/message` | 发送消息 |
| | `POST /session/:id/prompt_async` | 异步发送消息 |
| | `POST /session/:id/command` | 执行斜杠命令 |
| | `POST /session/:id/shell` | 运行 shell 命令 |
| | `GET /session/:id/diff` | 获取差异 |
| | `POST /session/:id/share` | 分享会话 |
| **文件** | `GET /find?pattern=<pat>` | 文本搜索 |
| | `GET /find/file?query=<q>` | 文件搜索 |
| | `GET /find/symbol?query=<q>` | 符号查找 |
| | `GET /file/content?path=<p>` | 读取文件 |
| | `GET /file/status` | Git 状态 |
| **代理** | `GET /agent` | 列出所有代理 |
| **LSP** | `GET /lsp` | LSP 服务器状态 |
| **MCP** | `GET /mcp` | MCP 服务器状态 |
| | `POST /mcp` | 动态添加 MCP |

### 8.4 SDK 编程接口

```typescript
import { createOpencode } from "@opencode-ai/sdk"
const { client } = await createOpencode()

// 创建会话
const session = await client.session.create({ body: { title: "My session" } })

// 发送提示词
const result = await client.session.prompt({
  path: { id: session.id },
  body: { parts: [{ type: "text", text: "Hello!" }] },
})
```

---

## 九、安全与权限体系

### 9.1 权限系统核心

```
packages/opencode/src/permission/
├── arity.ts        # 元数处理
├── evaluate.ts     # 权限评估引擎
├── index.ts        # 权限核心
└── schema.ts       # Schema 定义
```

#### 9.1.1 权限评估逻辑

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
- 基于规则的优先级匹配系统（最后匹配获胜）
- 无匹配时默认为 `"ask"`（需要用户确认）
- 使用通配符匹配 (`Wildcard.match`)
- `write`、`edit`、`patch`、`multiedit` 工具统一映射到 `edit` 权限

### 9.2 可用权限列表

| 权限 | 说明 | 匹配内容 |
|------|------|---------|
| `read` | 读取文件 | 文件路径 |
| `edit` | 所有文件修改 | 文件路径 |
| `glob` | 文件通配 | 通配模式 |
| `grep` | 内容搜索 | 正则表达式 |
| `list` | 列出目录 | 目录路径 |
| `bash` | 运行 shell 命令 | 解析后的命令 |
| `task` | 启动子代理 | 子代理类型 |
| `skill` | 加载技能 | 技能名称 |
| `lsp` | LSP 查询 | - |
| `webfetch` | 获取 URL | URL |
| `websearch`/`codesearch` | 网页/代码搜索 | 查询内容 |
| `external_directory` | 外部目录访问 | 路径 |
| `doom_loop` | 死循环检测 | 重复调用 |

### 9.3 默认权限

```
"*": "allow"                           // 默认允许所有操作
doom_loop: "ask"                       // 死循环检测需要确认
external_directory: { "*": "ask" }     // 外部目录访问需要确认
read: { "*": "allow", "*.env": "deny", "*.env.*": "deny", "*.env.example": "allow" }
```

### 9.4 细粒度权限配置

使用对象语法根据工具输入应用不同操作：

```jsonc
{
  "permission": {
    "bash": {
      "*": "ask",           // 默认询问
      "git *": "allow",     // git 命令允许
      "npm *": "allow",     // npm 命令允许
      "rm *": "deny",       // 删除命令拒绝
      "grep *": "allow"     // 搜索允许
    },
    "edit": {
      "*": "deny",                          // 默认拒绝编辑
      "packages/web/src/content/docs/*.mdx": "allow"  // 文档目录允许
    }
  }
}
```

**评估规则**: 最后匹配的规则优先级最高

### 9.5 权限操作说明

当设置为 `"ask"` 时，界面提供三种选择：
- `once` — 仅批准本次请求
- `always` — 批准匹配的后续请求（当前会话有效）
- `reject` — 拒绝请求

---

## 十、配置系统深度解析

### 10.1 配置优先级（从低到高，合并而非替换）

| 优先级 | 配置源 | 用途 |
|--------|--------|------|
| 1 | 远程配置 (`.well-known/opencode`) | 组织默认值 |
| 2 | 全局配置 (`~/.config/opencode/opencode.json`) | 用户偏好 |
| 3 | 自定义配置 (`OPENCODE_CONFIG` 环境变量) | 自定义覆盖 |
| 4 | 项目配置 (`opencode.json`) | 项目特定设置 |
| 5 | `.opencode` 目录 | 代理、命令、插件 |
| 6 | 内联配置 (`OPENCODE_CONFIG_CONTENT` 环境变量) | 运行时覆盖 |

**关键**: 配置是**合并**的，不是替换。数组字段会去重合并，对象字段会深合并。

### 10.2 变量替换

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

### 10.3 核心配置项速查

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `model` | string | 默认模型 (`provider/model`) |
| `small_model` | string | 轻量任务模型 |
| `provider` | object | 提供商配置 |
| `agent` | object | 代理配置 |
| `default_agent` | string | 默认代理 |
| `permission` | object | 权限配置 |
| `command` | object | 命令配置 |
| `mcp` | object | MCP 服务器配置 |
| `lsp` | object | LSP 服务器配置 |
| `formatter` | object | 格式化器配置 |
| `plugin` | string[] | 插件列表 |
| `instructions` | string[] | 指令文件 |
| `share` | string | 分享模式 |
| `theme` | string | 主题 |
| `keybinds` | object | 快捷键 |
| `autoupdate` | boolean | 自动更新 |
| `compaction` | object | 压缩配置 |
| `watcher` | object | 文件监视器 |
| `disabled_providers` | string[] | 禁用提供商 |
| `enabled_providers` | string[] | 启用提供商白名单 |
| `tui` | object | TUI 配置 |
| `server` | object | 服务器配置 |
| `experimental` | object | 实验性功能 |

---

## 十一、Agent 系统架构

### 11.1 内置 Agent

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

### 11.2 Agent 配置方式

#### JSON 配置
```jsonc
{
  "agent": {
    "code-reviewer": {
      "description": "Reviews code for best practices",
      "model": "anthropic/claude-sonnet-4-5",
      "prompt": "You are a code reviewer.",
      "mode": "subagent",
      "permission": {
        "edit": { "*": "deny" }
      }
    }
  }
}
```

#### Markdown 文件
```yaml
---
description: Code review agent
mode: subagent
model: anthropic/claude-sonnet-4-5
permission:
  edit: deny
---

You are a code reviewer. Focus on security, performance, and maintainability.
```

### 11.3 Agent 间通信机制

**没有直接的 Agent-to-Agent 消息传递**。通信完全通过：

1. **`task` 工具** — 父 agent 调用 task 工具创建子 session
2. **Session 父子关系** — 子 session 有 `parentID` 指向父 session
3. **结果返回** — 子 session 的产出通过 `task_result` 标签返回给父 agent

### 11.4 Plan Mode 工作流

这是 OpenCode 中最接近 "orchestration" 的机制：

```
Phase 1: 理解 — 启动最多 3 个 explore agents 并行探索代码库
Phase 2: 设计 — 启动 general agent(s) 设计实现方案
Phase 3: 审查 — 审查计划并确保符合用户意图
Phase 4: 最终计划 — 写入 plan 文件
Phase 5: 调用 plan_exit — 通知用户计划完成
```

---

## 十二、工具系统架构

### 12.1 内置工具

```
packages/opencode/src/tool/
├── registry.ts        # 工具注册表
├── tool.ts            # 工具核心
├── schema.ts          # 工具Schema
├── bash.ts            # Shell 命令执行
├── edit.ts            # 文件编辑
├── write.ts           # 文件写入
├── read.ts            # 文件读取
├── grep.ts            # 内容搜索
├── glob.ts            # 文件匹配
├── ls.ts              # 目录列表
├── lsp.ts             # LSP 查询
├── task.ts            # 子 agent 调用
├── skill.ts           # 技能加载
├── webfetch.ts        # 网页获取
├── websearch.ts       # 网络搜索
├── codesearch.ts      # 代码搜索
├── question.ts        # 向用户提问
├── todo.ts            # 待办事项
├── todowrite.ts       # 待办写入
├── apply_patch.ts     # 补丁应用
├── multiedit.ts       # 多文件编辑
├── plan.ts            # 计划模式
├── batch.ts           # 批量操作
├── truncate.ts        # 截断处理
└── external-directory.ts # 外部目录
```

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
| `question` | 向用户提问 | question |

### 12.2 自定义工具

```typescript
// .opencode/tools/database.ts
import { tool } from "@opencode-ai/plugin"
export default tool({
  description: "Query the project database",
  args: {
    query: tool.schema.string().describe("SQL query to execute"),
  },
  async execute(args, context) {
    const { directory, worktree } = context
    return `Executed query: ${args.query}`
  },
})
```

### 12.3 工具优先级与拦截

OpenCode 工具调用链：
1. 检查权限 (`permission.evaluate`)
2. 触发 `tool.execute.before` 插件钩子
3. 执行工具逻辑
4. 触发 `tool.execute.after` 插件钩子
5. 通过 SSE 推送结果到客户端

### 12.4 工具权限与 MCP 工具

MCP 服务器工具命名规则：`mcp_server_name_*`

禁用特定 MCP 的所有工具：
```jsonc
{
  "tools": {
    "sentry_*": false,
    "context7_*": false
  }
}
```

---

## 十三、会话管理系统

### 13.1 会话核心

```
packages/opencode/src/session/
├── index.ts           # 会话核心
├── session.sql.ts     # SQL 定义
├── schema.ts          # Schema
├── message.ts         # 消息处理
├── message-v2.ts      # 消息 V2
├── prompt.ts          # 提示词处理
├── processor.ts       # 消息处理器
├── compaction.ts      # 上下文压缩
├── summary.ts         # 会话摘要
├── revert.ts          # 撤回/恢复
├── retry.ts           # 重试逻辑
├── overflow.ts        # 溢出处理
├── llm.ts             # LLM 交互
├── system.ts          # 系统提示词
├── instruction.ts     # 指令处理
├── todo.ts            # 待办事项
├── status.ts          # 状态管理
├── projectors.ts      # 投影器
└── prompt/            # 提示词模板
    ├── anthropic.txt  # Anthropic 提示词
    ├── gpt.txt        # GPT 提示词
    ├── gemini.txt     # Gemini 提示词
    ├── default.txt    # 默认提示词
    ├── plan.txt       # 计划模式提示词
    └── ...
```

### 13.2 上下文压缩机制

```typescript
export const PRUNE_MINIMUM = 20_000   // 至少需要修剪这么多才执行
export const PRUNE_PROTECT = 40_000   // 保留最近 40k tokens 不修剪
const PRUNE_PROTECTED_TOOLS = ["skill"]  // skill 工具输出不被修剪
```

**压缩过程**:
1. **Prune (修剪)**: 向后遍历 tool 输出，删除超过 40,000 tokens 的旧 tool 输出
2. **Compact (压缩)**: 使用专用的 `compaction` agent 生成对话摘要
3. **Replay**: 如果压缩后还有未处理的用户消息，重新播放

### 13.3 会话状态

会话通过 SSE (Server-Sent Events) 实时推送状态更新：
- `session.created` — 会话创建
- `session.updated` — 会话更新
- `session.idle` — 会话空闲（AI 响应完成）
- `session.compacted` — 会话压缩
- `session.error` — 会话错误

---

## 十四、插件系统架构

### 14.1 插件加载

```
packages/opencode/src/plugin/
├── index.ts        # 插件核心
├── loader.ts       # 插件加载器
├── install.ts      # 插件安装
├── meta.ts         # 插件元数据
├── shared.ts       # 共享工具
└── codex.ts         # Codex 集成
```

**加载顺序**:
1. 全局配置 (`~/.config/opencode/opencode.json`)
2. 项目配置 (`opencode.json`)
3. 全局插件目录 (`~/.config/opencode/plugins/`)
4. 项目插件目录 (`.opencode/plugins/`)

### 14.2 插件 Hooks

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

### 14.3 插件上下文

```typescript
export const MyPlugin = async ({ project, client, $, directory, worktree }) => {
  // project: 当前项目信息
  // directory: 当前工作目录
  // worktree: git 工作树路径
  // client: OpenCode SDK 客户端
  // $: Bun Shell API
  return {
    // Hook implementations
  }
}
```

---

## 十五、MCP/LSP/ACP 协议集成

### 15.1 MCP (Model Context Protocol)

```
packages/opencode/src/mcp/
├── index.ts         # MCP 核心
├── auth.ts          # MCP 认证
├── oauth-provider.ts# OAuth 提供商
└── oauth-callback.ts# OAuth 回调
```

**支持类型**:
- **本地 MCP**: 通过命令启动 (`type: "local"`)
- **远程 MCP**: 通过 URL 连接 (`type: "remote"`)
- **OAuth 认证**: 自动检测和处理 OAuth 2.0 流程

**配置示例**:

```jsonc
{
  "mcp": {
    "sentry": {
      "type": "remote",
      "url": "https://mcp.sentry.dev/mcp",
      "oauth": {}
    },
    "context7": {
      "type": "remote", 
      "url": "https://mcp.context7.com/mcp"
    },
    "local-mcp": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-everything"],
      "environment": {
        "MY_ENV_VAR": "value"
      }
    }
  }
}
```

**MCP 管理命令**:
- `opencode mcp list` - 列出所有 MCP 服务器
- `opencode mcp auth <name>` - 触发 OAuth 认证
- `opencode mcp logout <name>` - 删除凭据
- `opencode mcp debug <name>` - 调试连接

### 15.2 LSP (Language Server Protocol)

```
packages/opencode/src/lsp/
├── index.ts         # LSP 核心
├── client.ts        # LSP 客户端
├── server.ts        # LSP 服务器
├── launch.ts        # LSP 启动
└── language.ts      # 语言映射
```

**内置支持的 LSP**: TypeScript, Python (pyright), Go (gopls), Rust (rust-analyzer), Java (jdtls), PHP, Vue, Astro, Svelte, Terraform 等 30+ 语言。

### 15.3 ACP (Agent Client Protocol)

```
packages/opencode/src/acp/
├── README.md        # 协议说明
├── agent.ts         # ACP Agent
├── session.ts       # ACP Session
└── types.ts         # 类型定义
```

**不是 agent 间通信协议**，而是外部 API 接口，允许外部客户端（如 IDE 插件）通过 stdio JSON-RPC 驱动 OpenCode agent。

支持编辑器: Zed, JetBrains IDEs, Avante.nvim, CodeCompanion.nvim

---

## 十六、Provider 提供商系统

### 15.1 提供商架构

```
packages/opencode/src/provider/
├── provider.ts        # 提供商核心
├── auth.ts            # 认证管理
├── models.ts          # 模型管理
├── schema.ts          # Schema 定义
├── error.ts           # 错误处理
├── transform.ts       # 消息转换
└── sdk/               # 各提供商 SDK
    └── copilot/       # GitHub Copilot SDK
```

### 15.2 支持的提供商（75+）

| 类别 | 提供商 |
|------|--------|
| **官方** | OpenCode Zen, OpenCode Go |
| **主流** | Anthropic, OpenAI, Google Vertex AI, Amazon Bedrock, Azure OpenAI |
| **聚合** | OpenRouter, Vercel AI Gateway, Cloudflare AI Gateway, Helicone, ZenMux |
| **开源** | Ollama, Ollama Cloud, LM Studio, llama.cpp |
| **中国** | DeepSeek, Moonshot AI (Kimi), MiniMax, Z.AI (GLM), 302.AI |
| **企业** | GitHub Copilot, GitLab Duo, SAP AI Core, STACKIT |
| **其他** | Groq, Together AI, Fireworks AI, Cerebras, xAI, Scaleway, OVHcloud, Baseten, Cortecs, Deep Infra, Nebius, Venice AI, IO.NET, Firmware, Hugging Face (17+ 子提供商) |

### 15.3 自定义提供商

任何 **OpenAI 兼容** 的 API 都可以作为自定义提供商：

```jsonc
{
  "provider": {
    "myprovider": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "My AI Provider",
      "options": {
        "baseURL": "https://api.myprovider.com/v1",
        "apiKey": "{env:MY_API_KEY}"
      },
      "models": {
        "my-model-name": {
          "name": "My Model",
          "limit": { "context": 200000, "output": 65536 }
        }
      }
    }
  }
}
```

---

## 十七、TUI 终端界面架构

### 17.1 TUI 源码结构

```
packages/opencode/src/cli/cmd/tui/
├── app.tsx              # 应用入口
├── worker.ts            # 工作线程
├── thread.ts            # 线程管理
├── event.ts             # 事件处理
├── win32.ts             # Windows 适配
├── component/           # UI 组件
│   ├── prompt/          # 输入框组件
│   ├── dialog-*.tsx     # 对话框组件
│   ├── logo.tsx         # Logo
│   └── spinner.tsx      # 加载指示器
├── context/             # 上下文管理
│   ├── theme/           # 主题配置 (30+ 内置主题)
│   └── ...
├── routes/              # 路由
│   ├── home.tsx         # 首页
│   └── session/         # 会话页面
├── ui/                  # 基础 UI
├── util/                # 工具函数
└── feature-plugins/     # 功能插件
    ├── home/            # 首页插件
    ├── sidebar/         # 侧边栏插件
    └── system/          # 系统插件
```

### 17.2 TUI 斜杠命令

| 命令 | 快捷键 | 说明 |
|------|--------|------|
| `/connect` | - | 添加提供商 API 密钥 |
| `/compact` | `ctrl+x c` | 压缩会话（别名：`/summarize`） |
| `/details` | `ctrl+x d` | 切换工具执行详情显示 |
| `/editor` | `ctrl+x e` | 打开外部编辑器编辑消息 |
| `/exit` | `ctrl+x q` | 退出（别名：`/quit`, `/q`） |
| `/export` | `ctrl+x x` | 导出对话为 Markdown |
| `/help` | `ctrl+x h` | 显示帮助对话框 |
| `/init` | `ctrl+x i` | 创建或更新 AGENTS.md |
| `/models` | `ctrl+x m` | 列出可用模型 |
| `/new` | `ctrl+x n` | 开始新会话（别名：`/clear`） |
| `/redo` | `ctrl+x r` | 重做之前撤销的消息 |
| `/sessions` | `ctrl+x l` | 列出会话并切换（别名：`/resume`, `/continue`） |
| `/share` | `ctrl+x s` | 分享当前会话 |
| `/themes` | `ctrl+x t` | 列出并切换主题 |
| `/thinking` | - | 切换思考/推理块可见性 |
| `/undo` | `ctrl+x u` | 撤销对话中的最后一条消息 |
| `/unshare` | - | 取消分享当前会话 |

### 17.3 TUI 输入语法

```
# 文件引用 - 使用 @ 引用文件，自动模糊搜索并添加内容
@packages/functions/src/api/index.ts

# Bash 命令 - 使用 ! 执行 shell 命令
!ls -la

# 斜杠命令 - 使用 / 执行内置命令
/new
```

### 17.4 TUI 配置选项

```jsonc
{
  "tui": {
    "scroll_speed": 3,                    // 滚动速度（最小值1）
    "scroll_acceleration": {              // macOS 风格滚动加速
      "enabled": true
    },
    "diff_style": "auto"                  // 差异渲染方式：auto/stacked
  }
}
```

---

## 十八、Web/Desktop 应用架构

### 18.1 Web 应用 (packages/app)

基于 **SolidJS** 构建的现代化 Web 应用：

```
packages/app/src/
├── app.tsx              # 应用根组件
├── entry.tsx            # 入口文件
├── components/          # UI 组件
│   ├── prompt-input/    # 提示词输入
│   ├── session/         # 会话组件
│   ├── dialog-*.tsx     # 对话框
│   └── settings-*.tsx   # 设置页面
├── context/             # 状态管理 (Solid Context)
│   ├── sync.tsx         # 同步上下文
│   ├── models.tsx       # 模型上下文
│   ├── permission.tsx   # 权限上下文
│   └── ...
├── pages/               # 页面组件
│   ├── home.tsx         # 首页
│   ├── session.tsx      # 会话页
│   └── layout.tsx       # 布局
├── i18n/                # 国际化 (16 种语言)
└── utils/               # 工具函数
```

### 18.2 桌面应用

- 基于 **Tauri** 构建 (WebView2)
- 后台运行本地 OpenCode 服务器
- 支持连接远程服务器
- macOS 支持 Wayland/X11，Windows 需要 WebView2 Runtime

---

## 十九、GitHub/GitLab CI 集成

### 19.1 GitHub Integration

```
github/
├── action.yml           # GitHub Action 定义
├── index.ts             # Action 入口
└── package.json
```

**支持的事件**:
- `issue_comment` — 在 Issue/PR 评论中触发
- `pull_request_review_comment` — PR 代码审查评论
- `issues` — Issue 创建/编辑
- `pull_request` — PR 创建/更新
- `schedule` — 定时任务
- `workflow_dispatch` — 手动触发

**使用方式**:
```yaml
- uses: anomalyco/opencode/github@latest
  with:
    model: anthropic/claude-sonnet-4-5
    # share: true
    # prompt: |
    #   Review this pull request
```

### 19.2 GitLab Integration

通过 GitLab CI/CD 流水线或 GitLab Duo 集成：
- 社区组件: `nagyv/gitlab-opencode`
- GitLab Duo: 通过 `@opencode` 提及触发

**GitLab OAuth 配置** (自托管实例):
1. 创建应用，回调 URL: `http://127.0.0.1:8080/callback`
2. 范围: `api`, `read_user`, `read_repository`
3. 设置环境变量: `GITLAB_OAUTH_CLIENT_ID`

### 19.3 网络配置

```bash
# 代理配置
export HTTPS_PROXY=https://proxy.example.com:8080
export HTTP_PROXY=http://proxy.example.com:8080
export NO_PROXY=localhost,127.0.0.1

# 自定义证书
export NODE_EXTRA_CA_CERTS=/path/to/ca-cert.pem

# 认证代理
export HTTPS_PROXY=http://username:password@proxy.example.com:8080
```

---

## 二十、商业化产品矩阵

### 20.1 OpenCode Zen

官方精选模型网关，经过测试和验证的模型。

**定价** (每 1M tokens):
- 免费模型: Big Pickle, MiMo V2 Pro/Omni Free, Qwen3.6 Plus Free, Nemotron 3 Super Free, MiniMax M2.5 Free, GPT 5 Nano
- Claude Sonnet 4.5: 输入 $3.00 / 输出 $15.00
- Claude Opus 4.5: 输入 $5.00 / 输出 $25.00
- GPT 5.4: 输入 $2.50 / 输出 $15.00

**团队功能**: 角色管理 (Admin/Member)、模型访问控制、自带密钥、月度限额

### 20.2 OpenCode Go

低成本订阅服务，精选开源编程模型。

- **定价**: 首月 $5，之后 $10/月
- **支持模型**: GLM-5, Kimi K2.5, MiniMax M2.5, MiniMax M2.7
- **使用限制**: 5小时 $12 / 每周 $30 / 每月 $60

### 20.3 企业版

- **零数据存储**: 不存储任何代码或上下文数据
- **集中式配置**: 通过 `.well-known/opencode` 端点统一管理
- **SSO 集成**: 与组织身份管理系统集成
- **内部 AI 网关**: 强制所有请求走内部网关
- **按席位定价**: 自带 LLM 网关不收取 Token 费用
- **系统级配置目录**: macOS `/Library/Application Support/opencode`, Windows `C:\ProgramData\opencode`, Linux `/etc/opencode`

### 20.4 企业部署架构

```
┌─────────────────────────────────────────────────────────┐
│                    企业网络                              │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ 开发者终端   │    │  CI/CD 服务器│    │   IDE       │ │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘ │
│         │                  │                  │        │
│         └──────────────────┼──────────────────┘        │
│                            │                            │
│                     ┌──────▼──────┐                    │
│                     │ .well-known │                    │
│                     │ /opencode   │ ← 集中配置         │
│                     └──────┬──────┘                    │
│                            │                            │
│                     ┌──────▼──────┐                    │
│                     │ 内部 AI 网关  │                    │
│                     │ (强制代理)    │                    │
│                     └──────┬──────┘                    │
│                            │                            │
│         ┌──────────────────┼──────────────────┐        │
│         │                  │                  │        │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐ │
│  │ Anthropic  │    │  OpenAI     │    │  其他提供商  │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 二十一、生态系统与社区

### 21.1 社区项目

| 类别 | 项目 | 说明 |
|------|------|------|
| **插件** | opencode-helicone-session | Helicone 会话追踪 |
| **插件** | opencode-wakatime | Wakatime 时间追踪 |
| **插件** | opencode-daytona | Daytona 沙箱运行 |
| **插件** | opencode-devcontainers | Dev Containers 集成 |
| **项目** | opencode.nvim | Neovim 集成 |
| **项目** | kimaki | Discord 机器人控制 |
| **项目** | OpenChamber | Web/桌面/VS Code 扩展 |
| **代理** | Agentic | 结构化开发代理 |

### 21.2 社区资源

- **awesome-opencode**: https://github.com/awesome-opencode/awesome-opencode
- **opencode.cafe**: 社区聚合站
- **Discord**: https://opencode.ai/discord

---

## 二十二、设计模式与最佳实践

### 22.1 核心设计模式

| 模式 | 应用场景 | 说明 |
|------|---------|------|
| **ServiceMap (依赖注入)** | 全系统 | Effect 框架的依赖注入模式 |
| **事件驱动** | 模块通信 | Bus 事件总线解耦模块 |
| **策略模式** | Provider/Formatter/LSP | 不同提供商/格式化的统一接口 |
| **观察者模式** | 文件监视/会话状态 | Watcher 和 SSE 推送 |
| **责任链** | 权限评估 | 规则按顺序评估，最后匹配获胜 |
| **工厂模式** | Tool/Agent 创建 | 统一的创建接口 |

### 22.2 Agent 设计原则

1. **职责单一**: 每个 agent 只负责一个明确的任务
2. **权限最小化**: 只授予完成工作所需的最小权限
3. **使用 permission 而非 tools**: `tools` 已 deprecated
4. **设置合理的 steps**: 防止 agent 陷入无限循环
5. **利用 color 字段**: 增强 TUI 中的视觉区分

### 22.3 上下文传递策略

| 策略 | 适用场景 | 优缺点 |
|------|---------|--------|
| 文件系统传递 | 结构化产出物 | 可靠，但需要约定路径 |
| Task tool prompt | 简短上下文 | 简单，但有 token 限制 |
| 共享工作目录 | 多步骤协作 | 灵活，但需要状态管理 |

---

## 二十三、与竞品对比分析

### 23.1 竞品对比矩阵

| 特性 | OpenCode | Cursor | Claude Code | GitHub Copilot |
|------|----------|--------|-------------|----------------|
| **开源** | ✅ | ❌ | ❌ | ❌ |
| **提供商数量** | 75+ | 有限 | 仅 Anthropic | 有限 |
| **TUI** | ✅ | ❌ | ✅ | ❌ |
| **Web 界面** | ✅ | ❌ | ❌ | ❌ |
| **Desktop** | ✅ | ✅ | ❌ | ❌ |
| **IDE 插件** | ✅ | 本身就是 IDE | ❌ | ✅ |
| **自定义 Agent** | ✅ | ❌ | ❌ | ❌ |
| **MCP 支持** | ✅ | ✅ | ✅ | ❌ |
| **LSP 集成** | ✅ | ✅ | ❌ | ❌ |
| **插件系统** | ✅ | 有限 | ❌ | 有限 |
| **企业版** | ✅ | ✅ | ✅ | ✅ |
| **零数据存储** | ✅ | ❌ | ❌ | ❌ |
| **离线使用** | ✅ (本地模型) | ❌ | ❌ | ❌ |
| **GitHub CI** | ✅ | ❌ | ❌ | ✅ |
| **GitLab CI** | ✅ | ❌ | ❌ | ❌ |
| **ACP 协议** | ✅ | ❌ | ❌ | ❌ |
| **多界面** | 6种 | 1种 | 2种 | 2种 |
| **多语言文档** | 20种 | - | - | - |

### 23.2 与 Claude Code 对比

| 维度 | OpenCode | Claude Code |
|------|----------|-------------|
| **架构** | 客户端/服务器 | 单一 CLI |
| **扩展性** | 4层扩展系统 | 有限 |
| **本地模型** | Ollama/LM Studio | 不支持 |
| **企业功能** | 零数据存储/SSO | 无 |
| **协议** | ACP/MCP/LSP | 仅 MCP |

### 23.3 OpenCode 的核心优势

1. **完全开源**: 代码透明，社区驱动，无供应商锁定
2. **最大的提供商生态**: 75+ 提供商，任何 OpenAI 兼容 API 都能用
3. **最丰富的交互方式**: 6 种界面，覆盖所有使用场景
4. **最强大的扩展系统**: 4 层扩展能力 (Skills → Tools → MCP → Plugins)
5. **企业就绪**: 零数据存储、集中配置、SSO、私有 NPM
6. **Effect 函数式架构**: 类型安全、可组合、可测试
7. **多平台支持**: 桌面端、Web 端、IDE 插件、CI/CD

---

## 二十四、未来发展趋势

### 24.1 技术趋势

1. **多 Agent 编排**: 当前通过 task 工具手动编排，未来可能出现更自动化的编排引擎
2. **上下文管理优化**: 压缩机制持续改进，更智能的上下文利用
3. **本地模型增强**: Ollama 等本地模型支持持续增强
4. **协议标准化**: ACP 协议推动编辑器集成标准化
5. **MCP 生态扩展**: MCP 服务器数量快速增长

### 24.2 产品趋势

1. **企业市场**: 零数据存储和集中配置是核心竞争力
2. **CI/CD 集成**: GitHub/GitLab 自动化工作流
3. **团队协作**: Zen 团队功能、工作区管理
4. **移动端**: 社区已有 Portal 等移动优先方案

---

## 二十五、开发者上手指南

### 25.1 环境搭建

```bash
# 克隆仓库
git clone https://github.com/anomalyco/opencode.git
cd opencode

# 安装依赖
bun install

# 开发模式
bun run dev

# 构建
bun run build
```

### 25.2 创建自定义 Agent

```bash
# 交互式创建
opencode agent create

# 或手动创建 Markdown 文件
# .opencode/agents/review.md
```

### 25.3 创建自定义工具

```typescript
// .opencode/tools/my-tool.ts
import { tool } from "@opencode-ai/plugin"
export default tool({
  description: "My custom tool",
  args: { input: tool.schema.string() },
  async execute(args, context) {
    return `Result: ${args.input}`
  },
})
```

### 25.4 创建插件

```typescript
// .opencode/plugins/my-plugin.ts
import type { Plugin } from "@opencode-ai/plugin"
export const MyPlugin: Plugin = async ({ project, client }) => {
  return {
    "tool.execute.before": async (input, output) => {
      // 工具执行前钩子
    },
    event: async ({ event }) => {
      // 事件监听
    },
  }
}
```

### 25.5 使用 SDK 编程

```typescript
import { createOpencode } from "@opencode-ai/sdk"

const { client } = await createOpencode()

// 创建会话并发送消息
const session = await client.session.create({ body: { title: "Test" } })
const result = await client.session.prompt({
  path: { id: session.id },
  body: {
    parts: [{ type: "text", text: "Explain this codebase" }],
  },
})

// 监听事件
const events = await client.event.subscribe()
for await (const event of events.stream) {
  console.log(event.type, event.properties)
}
```

---

## 附录

### A. 环境变量汇总

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
| `OPENCODE_ENABLE_EXA` | 启用 Exa 网络搜索工具 |
| `OPENCODE_EXPERIMENTAL` | 启用所有实验性功能 |
| `OPENCODE_EXPERIMENTAL_LSP_TOOL` | 启用实验性 LSP 工具 |
| `OPENCODE_DISABLE_CLAUDE_CODE` | 禁用 .claude 兼容 |
| `OPENCODE_DISABLE_LSP_DOWNLOAD` | 禁用 LSP 自动下载 |

### B. 目录结构约定

**全局配置** (`~/.config/opencode/`):
```
~/.config/opencode/
├── opencode.json(c)       # 全局配置
├── agents/                # 全局代理
├── commands/              # 全局命令
├── plugins/               # 全局插件
├── skills/                # 全局技能
├── themes/                # 全局主题
└── tools/                 # 全局工具
```

**项目配置** (`.opencode/`):
```
.opencode/
├── agents/                # 项目级代理
├── commands/              # 项目级命令
├── plugins/               # 项目级插件
├── skills/                # 项目级技能
├── themes/                # 项目级主题
└── tools/                 # 项目级工具
```

---

*文档基于 OpenCode 官方文档全量爬取 + GitHub v1.3.17 分支源码深度分析整理*
*分析日期：2026年4月6日*
*文档版本：v2.1*
