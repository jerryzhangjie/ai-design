#!/bin/bash
# Agent 文档同步脚本
# 功能：当 Agent 定义文件变化时，同步更新架构文档和设计文档

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
AGENTS_DIR="$PROJECT_ROOT/.opencode/agents"
DESIGN_DIR="$PROJECT_ROOT/.opencode/agent-architecture-design"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

# Agent 列表
AGENTS="project-manager product-manager ui-designer frontend-expert qa-engineer"

echo "=== Agent 文档同步开始 ==="
echo "项目根目录: $PROJECT_ROOT"
echo "时间戳: $TIMESTAMP"

# 确保目录存在
mkdir -p "$DESIGN_DIR"

# 备份函数
backup_file() {
  local file="$1"
  if [ -f "$file" ]; then
    local filename=$(basename "$file")
    local name="${filename%.*}"
    local ext="${filename##*.}"
    cp "$file" "$BACKUP_DIR/${name}.${TIMESTAMP}.${ext}"
    echo "已备份: $file"
  fi
}

# 解析 frontmatter 字段
parse_frontmatter() {
  local file="$1"
  local field="$2"
  sed -n '/^---$/,/^---$/p' "$file" | grep "^${field}:" | sed "s/^${field}: *//" | tr -d '"' | tr -d "'"
}

# 提取 frontmatter 中的 permission 块为 JSON 格式
extract_permission_json() {
  local file="$1"
  # 提取 permission 块
  local perm_block=$(awk '
    /^---/ { count++; next }
    count == 1 && /^permission:/ { in_perm=1; next }
    count >= 2 { exit }
    in_perm { print }
  ' "$file")

  # 转换为 JSON 格式
  echo "$perm_block" | awk '
    BEGIN { print "{" }
    {
      # 计算缩进
      match($0, /^[[:space:]]*/);
      indent = RLENGTH;

      # 去掉首尾空格
      gsub(/^[[:space:]]+|[[:space:]]+$/, "");

      # 跳过空行
      if (length($0) == 0) next;

      # 处理键值对
      if (match($0, /^([^:]+):(.*)$/, arr)) {
        key = arr[1];
        val = arr[2];
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", key);
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", val);

        if (val == "" || val == "{" || val == "}") {
          # 嵌套对象
          if (val == "{") {
            printf "%s\"%s\": {\n", (indent > 2 ? "      " : "    "), key;
          } else if (val == "}") {
            printf "      }\n";
          } else {
            printf "    \"%s\": {\n", key;
          }
        } else {
          # 简单键值对
          gsub(/"/, "", val);
          printf "      \"%s\": \"%s\"", key, val;
          # 检查下一行是否是同级
          print ",";
        }
      }
    }
    END { print "  }" }
  '
}

# 生成 Agent 设计文档（使用 Agent 特有逻辑）
generate_agent_doc() {
  local agent_name="$1"
  local agent_file="$AGENTS_DIR/${agent_name}.md"

  if [ ! -f "$agent_file" ]; then
    echo "跳过: $agent_file 不存在"
    return
  fi

  # 解析 frontmatter
  local model=$(parse_frontmatter "$agent_file" "model")
  local description=$(parse_frontmatter "$agent_file" "description")
  local mode=$(parse_frontmatter "$agent_file" "mode")
  local color=$(parse_frontmatter "$agent_file" "color")
  local steps=$(parse_frontmatter "$agent_file" "steps")

  local agent_cn_name=""
  local doc_file=""

  case "$agent_name" in
    project-manager)
      agent_cn_name="🎯 项目经理"
      doc_file="$DESIGN_DIR/项目经理Agent设计文档.md"
      ;;
    product-manager)
      agent_cn_name="💼 产品经理"
      doc_file="$DESIGN_DIR/产品经理Agent设计文档.md"
      ;;
    ui-designer)
      agent_cn_name="🎨 UI设计师"
      doc_file="$DESIGN_DIR/UI设计师Agent设计文档.md"
      ;;
    frontend-expert)
      agent_cn_name="💻 前端专家"
      doc_file="$DESIGN_DIR/前端专家Agent设计文档.md"
      ;;
    qa-engineer)
      agent_cn_name="🧪 测试专家"
      doc_file="$DESIGN_DIR/测试专家Agent设计文档.md"
      ;;
  esac

  echo "生成/更新: $doc_file"

  # 读取完整 agent 文件内容
  local agent_content=$(cat "$agent_file")

  # 生成设计文档
  cat > "$doc_file" << DOCEOF
# ${agent_cn_name} 设计文档

## 一、角色定位

**${description}**

- **Mode**: \`${mode}\`
$(if [ -n "$steps" ]; then echo "- **Steps**: ${steps}（允许最多 ${steps} 次 agentic 迭代）"; fi)
- **Color**: \`${color}\`
- **模型**: \`${model}\`

---

## 二、核心职责

$(echo "$agent_content" | awk '
  /^## 核心职责/ { in_section=1; next }
  /^## / && in_section { in_section=0 }
  in_section && /^[0-9]+\./ { print $0 }
')

---

## 三、权限配置

### 3.1 完整权限配置

\`\`\`yaml
permission:
$(echo "$agent_content" | awk '
  /^---/ { count++; next }
  count == 1 && /^permission:/ { in_perm=1; next }
  count >= 2 { exit }
  in_perm { print }
')
\`\`\`

### 3.2 设计原则

- 权限配置遵循最小权限原则
- 编辑权限限制在工作目录内
- 通过 task 工具调用子 agent 完成具体工作

---

## 四、输入/输出规范

### 4.1 输入

| 输入 | 来源 | 格式 |
|------|------|------|
| 任务指令 | 项目经理 | prompt 参数 |
| 上下文文件 | .opencode/doc/ | Markdown |

### 4.2 输出

| 输出 | 目标 | 格式 |
|------|------|------|
| 工作产出 | .opencode/doc/ | Markdown |

---

## 五、工作流程

$(echo "$agent_content" | awk '
  /^## 工作流程/ { in_section=1; next }
  /^## / && in_section { in_section=0 }
  in_section { print }
')

---

## 六、沟通风格与约束

### 6.1 沟通风格

$(echo "$agent_content" | awk '
  /^## 沟通风格/ { in_section=1; next }
  /^## / && in_section { in_section=0 }
  in_section { print }
')

### 6.2 约束

$(echo "$agent_content" | awk '
  /^## 约束/ { in_section=1; next }
  /^## / && in_section { in_section=0 }
  in_section { print }
')

---

## 七、完整 Agent Markdown 文件

\`\`\`markdown
${agent_content}
\`\`\`

---

## 八、opencode.json 配置片段

\`\`\`jsonc
{
  "agent": {
    "${agent_name}": {
      "model": "${model}",
      "description": "${description}",
      "mode": "${mode}",
      "color": "${color}"$(if [ -n "$steps" ]; then echo ",
      \"steps\": ${steps}"; fi)
    }
  }
}
\`\`\`

---

## 九、关键设计决策

| 决策 | 原因 |
|------|------|
| 使用 \`${mode}\` 模式 | ${mode} agent 负责$(if [ "$mode" = "primary" ]; then echo "流程调度和用户沟通"; else echo "专项任务执行"; fi) |
| 权限限制在工作目录 | 确保职责分离，防止意外修改其他文件 |

---

*文档版本: v1.0*
*最后同步: $(date +"%Y-%m-%d %H:%M:%S")*
*自动生成为 agent-doc-sync skill*
DOCEOF

  echo "✓ 完成: $doc_file"
}

# 主流程
echo ""
echo "--- 开始同步 Agent 设计文档 ---"

for agent_name in $AGENTS; do
  generate_agent_doc "$agent_name"
done

echo ""
echo "=== Agent 文档同步完成 ==="
echo "设计文档目录: $DESIGN_DIR"
