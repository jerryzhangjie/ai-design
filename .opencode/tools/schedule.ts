import { tool } from "@opencode-ai/plugin"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { resolve, dirname } from "path"

// ===================== 常量与映射 =====================

const SCHEDULE_FILE = "docs/agent_schedule.json"

const VALID_STEP_STATUSES = ["pending", "in_progress", "completed", "failed", "cancelled"] as const
const VALID_ARTIFACT_STATUSES = ["pending", "verified"] as const
const VALID_MODES = ["primary", "user_gate", "parallel", "single", "terminal"] as const
const VALID_STEP_GROUPS = ["plan", "design", "dev"] as const

const TOP_LEVEL_REQUIRED = ["task", "requirement", "workflow", "workflowVersion", "currentState", "currentStep", "lastUpdate", "qa_fix_count", "steps", "agentFlow"] as const
const STEP_REQUIRED = ["id", "name", "mode", "status", "agents", "artifacts", "next", "options"] as const
const AGENT_REQUIRED = ["name", "description", "status"] as const
const ARTIFACT_REQUIRED = ["path", "producedBy", "status"] as const
const FLOW_REQUIRED = ["from", "to", "step", "timestamp"] as const

const AGENT_NAMES: Record<string, string> = {
  "project-manager": "项目经理",
  "product-manager": "产品经理",
  "ui-designer": "UI设计师",
  "frontend-developer": "前端开发",
  "qa-engineer": "测试专家",
}

// 步骤模板定义（用于 add-step-group 自动创建）
const STEP_TEMPLATES: Record<string, any> = {
  "plan": {
    id: "plan",
    name: "需求分析与计划",
    mode: "primary",
    agents: [],
    artifacts: [],
    options: [
      { key: "A", label: "继续", action: "continue" }
    ]
  },
  "user_gate_plan": {
    id: "user_gate_plan",
    name: "用户确认计划",
    mode: "user_gate",
    agents: [],
    artifacts: [],
    options: [
      { key: "A", label: "确认计划，开始执行", action: "continue" },
      { key: "B", label: "调整需求（重新分析）", action: "reset_to_plan" },
      { key: "C", label: "取消任务", action: "cancel" }
    ]
  },
  "parallel_design_prd": {
    id: "parallel_design_prd",
    name: "PRD与UI设计并行",
    mode: "parallel",
    agents: [
      { name: "product-manager", description: "需求分析与PRD输出", status: "pending" },
      { name: "ui-designer", description: "UI设计规范", status: "pending" }
    ],
    artifacts: [
      { path: "docs/prd.md", producedBy: "product-manager", status: "pending" },
      { path: "docs/prd-mindmap.json", producedBy: "product-manager", status: "pending" },
      { path: "docs/prd-converted.json", producedBy: "product-manager", status: "pending" },
      { path: "docs/design.md", producedBy: "ui-designer", status: "pending" }
    ],
    options: [
      { key: "A", label: "继续", action: "continue" }
    ]
  },
  "user_gate_design_prd": {
    id: "user_gate_design_prd",
    name: "用户确认PRD和设计",
    mode: "user_gate",
    agents: [],
    artifacts: [],
    options: [
      { key: "A", label: "确认，进入开发", action: "continue" },
      { key: "B", label: "调整需求", action: "reset_to_plan" },
      { key: "C", label: "仅调样式", action: "partial_reset", targetStep: "parallel_design_prd", targetAgent: "ui-designer", targetArtifact: "docs/design.md" },
      { key: "D", label: "返回上一步", action: "redo_previous", targetStep: "parallel_design_prd" }
    ]
  },
  "frontend_dev": {
    id: "frontend_dev",
    name: "前端开发",
    mode: "single",
    agents: [
      { name: "frontend-developer", description: "前端全栈开发", status: "pending" }
    ],
    artifacts: [
      { path: "src/*", producedBy: "frontend-developer", status: "pending" },
      { path: "docs/frontend-plan.md", producedBy: "frontend-developer", status: "pending" },
      { path: "docs/.build-success", producedBy: "frontend-developer", status: "pending" }
    ],
    options: [
      { key: "A", label: "继续", action: "continue" }
    ]
  },
  "qa": {
    id: "qa",
    name: "质量验证",
    mode: "single",
    agents: [
      { name: "qa-engineer", description: "构建验证和功能检查", status: "pending" }
    ],
    artifacts: [
      { path: "docs/qa-report.md", producedBy: "qa-engineer", status: "pending" }
    ],
    options: [
      { key: "A", label: "继续", action: "continue" }
    ]
  },
  "serve": {
    id: "serve",
    name: "启动服务",
    mode: "primary",
    agents: [],
    artifacts: [],
    options: [
      { key: "A", label: "继续", action: "continue" }
    ]
  },
  "done": {
    id: "done",
    name: "完成",
    mode: "terminal",
    agents: [],
    artifacts: [],
    options: []
  }
}

// 步骤组定义：组名 -> 步骤ID数组
const STEP_GROUPS: Record<string, string[]> = {
  "plan": ["plan", "user_gate_plan"],
  "design": ["parallel_design_prd", "user_gate_design_prd"],
  "dev": ["frontend_dev", "qa", "serve"]
}

// ===================== 工具函数 =====================

function now(): string {
  return new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "")
}

function resolvePath(filePath: string, directory?: string): string {
  // 使用传入的 directory（用户项目目录），或 fallback 到当前工作目录
  const baseDir = directory || process.cwd()
  return resolve(baseDir, filePath || SCHEDULE_FILE)
}

function readSchedule(filePath: string, directory?: string): any | null {
  const resolved = resolvePath(filePath, directory)
  if (!existsSync(resolved)) return null
  try {
    return JSON.parse(readFileSync(resolved, "utf-8"))
  } catch (e: any) {
    throw new Error(`JSON 解析失败: ${e.message}`)
  }
}

function writeSchedule(filePath: string, data: any, directory?: string): string {
  const resolved = resolvePath(filePath, directory)
  const dir = dirname(resolved)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(resolved, JSON.stringify(data, null, 2) + "\n", "utf-8")
  return resolved
}

function findStep(schedule: any, stepId: string): any | null {
  if (!schedule || !schedule.steps) return null
  return schedule.steps.find((s: any) => s.id === stepId) ?? null
}

function findAgent(step: any, agentName: string): any | null {
  return step?.agents?.find((a: any) => a.name === agentName) ?? null
}

function findArtifact(step: any, artifactPath: string): any | null {
  return step?.artifacts?.find((a: any) => a.path === artifactPath) ?? null
}

function findOption(step: any, key: string): any | null {
  return step?.options?.find((o: any) => o.key === key) ?? null
}

function createStep(template: any, nextStepId: string | null): any {
  return {
    id: template.id,
    name: template.name,
    mode: template.mode,
    status: "pending",
    startedAt: null,
    completedAt: null,
    userDecision: null,
    agents: template.agents?.map((a: any) => ({
      name: a.name,
      description: a.description,
      status: "pending",
      dispatchedAt: null,
      completedAt: null
    })) || [],
    artifacts: template.artifacts?.map((a: any) => ({
      path: a.path,
      producedBy: a.producedBy,
      status: "pending"
    })) || [],
    options: template.options || [],
    next: nextStepId
  }
}

function getAgentCName(name: string): string {
  return AGENT_NAMES[name] || name
}

function isDateTimeStr(v: any): boolean {
  if (v === null || v === undefined) return true
  if (typeof v !== "string") return false
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v)
}

// ===================== 校验引擎 =====================

function validate(schedule: any, filePath: string, directory?: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const f of TOP_LEVEL_REQUIRED) {
    if (!(f in schedule)) errors.push(`缺少必要字段: ${f}`)
  }
  if (!schedule.steps || !Array.isArray(schedule.steps)) {
    return { valid: false, errors: [...errors, "steps 不是有效数组"] }
  }

  const stepIds: string[] = schedule.steps.map((s: any) => s.id)

  if (schedule.currentStep && schedule.currentStep !== "done" && !stepIds.includes(schedule.currentStep)) {
    errors.push(`currentStep "${schedule.currentStep}" 不存在于步骤列表中`)
  }
  const currentStep = schedule.steps.find((s: any) => s.id === schedule.currentStep)
  if (schedule.currentStep && schedule.currentStep !== "done" && currentStep) {
    if (currentStep.status === "completed" || currentStep.status === "failed" || currentStep.status === "cancelled") {
      errors.push(`currentStep "${schedule.currentStep}" status="${currentStep.status}"，进行中的任务不能指向已完成的步骤`)
    }
  }
  if (schedule.qa_fix_count !== undefined && (!Number.isInteger(schedule.qa_fix_count) || schedule.qa_fix_count < 0)) {
    errors.push(`qa_fix_count 必须是非负整数，当前: ${schedule.qa_fix_count}`)
  }
  if (schedule.lastUpdate && !isDateTimeStr(schedule.lastUpdate)) {
    errors.push(`lastUpdate 时间格式错误: "${schedule.lastUpdate}"`)
  }

  const idCount: Record<string, number> = {}
  for (const id of stepIds) { idCount[id] = (idCount[id] || 0) + 1 }
  for (const [id, count] of Object.entries(idCount)) {
    if (count > 1) errors.push(`步骤 id "${id}" 重复 (${count}次)`)
  }

  for (let i = 0; i < schedule.steps.length; i++) {
    const step = schedule.steps[i]
    const sp = `steps[${i}].${step.id || i}`
    for (const f of STEP_REQUIRED) { if (!(f in step)) errors.push(`${sp} 缺少: ${f}`) }
    if (step.status && !VALID_STEP_STATUSES.includes(step.status)) errors.push(`${sp} status 不合法: ${step.status}`)
    if (step.mode && !VALID_MODES.includes(step.mode)) errors.push(`${sp} mode 不合法: ${step.mode}`)
    if (step.completedAt && step.completedAt !== null && step.status !== "completed") errors.push(`${sp} 有 completedAt 但 status=${step.status}`)
    if (step.next !== null && step.next !== undefined && step.next !== "done" && !stepIds.includes(step.next)) errors.push(`${sp}.next="${step.next}" 不存在`)
    for (const f of ["startedAt", "completedAt"]) { if (step[f] && !isDateTimeStr(step[f])) errors.push(`${sp}.${f} 时间格式错误`) }

    if (step.agents && Array.isArray(step.agents)) {
      for (let j = 0; j < step.agents.length; j++) {
        const ag = step.agents[j]; const ap = `${sp}.agents[${j}].${ag.name || j}`
        for (const f of AGENT_REQUIRED) { if (!(f in ag)) errors.push(`${ap} 缺少: ${f}`) }
        if (ag.status && !VALID_STEP_STATUSES.includes(ag.status)) errors.push(`${ap} status 不合法: ${ag.status}`)
        if (ag.completedAt && ag.completedAt !== null && ag.status !== "completed") errors.push(`${ap} 有 completedAt 但 status=${ag.status}`)
        for (const f of ["dispatchedAt", "completedAt"]) { if (ag[f] && !isDateTimeStr(ag[f])) errors.push(`${ap}.${f} 时间格式错误`) }
      }
    }
    if (step.artifacts && Array.isArray(step.artifacts)) {
      for (let k = 0; k < step.artifacts.length; k++) {
        const art = step.artifacts[k]; const ap = `${sp}.artifacts[${k}]`
        for (const f of ARTIFACT_REQUIRED) { if (!(f in art)) errors.push(`${ap} 缺少: ${f}`) }
        if (art.status && !VALID_ARTIFACT_STATUSES.includes(art.status)) errors.push(`${ap} status 不合法: ${art.status}`)
        if (art.status === "verified") {
          if (art.path.endsWith("/*")) continue
          const fp = resolve(directory || process.cwd(), art.path)
          if (!existsSync(fp)) { errors.push(`${ap} "${art.path}" verified 但不存在`) }
          else { try { if (readFileSync(fp, "utf-8").trim().length === 0) errors.push(`${ap} "${art.path}" verified 但为空`) } catch { errors.push(`${ap} "${art.path}" 读取失败`) } }
        }
      }
    }
  }

  if (schedule.agentFlow && Array.isArray(schedule.agentFlow)) {
    schedule.agentFlow.forEach((flow: any, i: number) => {
      for (const f of FLOW_REQUIRED) { if (!flow[f]) errors.push(`agentFlow[${i}] 缺少必要字段: ${f}`) }
      const extraKeys = Object.keys(flow).filter((k: string) => !(FLOW_REQUIRED as readonly string[]).includes(k))
      if (extraKeys.length > 0) errors.push(`agentFlow[${i}] 包含多余字段: ${extraKeys.join(", ")}（agentFlow 严格只有 from/to/step/timestamp 4个字段）`)
    })
  }

  return { valid: errors.length === 0, errors }
}

// ===================== 显示 =====================

function showStatus(schedule: any): string {
  if (!schedule || !schedule.steps) return "📋 Schedule 为空"
  const lines: string[] = []
  lines.push("\n📋 执行计划概览")
  lines.push("━".repeat(50))
  lines.push(`  项目: ${schedule.task || "(未设置)"}`)
  lines.push(`  需求: ${schedule.requirement || "(无)"}`)
  lines.push(`  状态: ${schedule.currentState}  当前步骤: ${schedule.currentStep || "(无)"}`)
  lines.push(`  更新: ${schedule.lastUpdate || "(未设置)"}`)
  lines.push("━".repeat(50))
  for (const step of schedule.steps) {
    const icon = step.status === "completed" ? "✅" : step.status === "in_progress" ? "🔄" : step.status === "failed" ? "❌" : "⬜"
    const agentsStr = step.agents?.length > 0
      ? " " + step.agents.map((a: any) => { const si = a.status === "completed" ? "✓" : a.status === "in_progress" ? "⟳" : "○"; return `${a.name.split("-").pop()}${si}` }).join(" ")
      : ""
    lines.push(`  ${icon} ${step.id} [${step.mode}] ${step.name}${agentsStr}`)
    if (step.status === "in_progress") lines.push(`     ⏯  → ${step.next || "(结束)"}`)
  }
  lines.push("━".repeat(50))
  return lines.join("\n")
}

function showSteps(schedule: any): string {
  if (!schedule || !schedule.steps || schedule.steps.length === 0) return "📋 步骤为空"
  const lines: string[] = ["\n📋 步骤详情", "━".repeat(60)]
  for (const step of schedule.steps) {
    const si: Record<string, string> = { pending: "⬜", in_progress: "🔄", completed: "✅", failed: "❌", cancelled: "🚫" }
    lines.push(`\n${si[step.status] || "?"} ${step.id} — ${step.name}`)
    lines.push(`   mode: ${step.mode}  status: ${step.status}  next: ${step.next || "(结束)"}`)
    if (step.options?.length > 0) {
      lines.push(`   options: ${step.options.map((o: any) => `${o.key}:${o.label}`).join(" | ")}`)
    }
    if (step.agents?.length > 0) for (const a of step.agents) lines.push(`   👤 ${getAgentCName(a.name)}: ${a.status} ${a.description ? "— " + a.description : ""}`)
    if (step.artifacts?.length > 0) for (const a of step.artifacts) { const ai = a.status === "verified" ? "✓" : "○"; lines.push(`   📦 ${ai} ${a.path} (${a.producedBy})`) }
  }
  lines.push("\n" + "━".repeat(60))
  return lines.join("\n")
}

// ===================== 步骤链构建器 =====================

function buildStepsFromGroups(groups: string[]): any[] {
  const steps: any[] = []
  const allStepIds: string[] = []

  for (const group of groups) {
    const groupSteps = STEP_GROUPS[group]
    if (groupSteps) {
      allStepIds.push(...groupSteps)
    }
  }
  allStepIds.push("done")

  for (let i = 0; i < allStepIds.length - 1; i++) {
    const stepId = allStepIds[i]
    const nextId = allStepIds[i + 1]
    const template = STEP_TEMPLATES[stepId]
    if (template) {
      steps.push(createStep(template, nextId))
    }
  }

  const doneTemplate = STEP_TEMPLATES["done"]
  steps.push(createStep(doneTemplate, null))

  return steps
}

// ===================== 主逻辑 =====================

function doAction(action: string, args: string[], directory?: string): { message: string; json?: any } {
  // 使用传入的 directory 作为工作目录（用户项目目录）
  const workDir = directory || process.cwd()
  const schedule = readSchedule(SCHEDULE_FILE, workDir)
  let changed = false
  let message = ""

  function err(msg: string): never { throw new Error(msg) }
  function requireSchedule(): any { if (!schedule) err("❌ schedule 不存在，请先使用 init 初始化"); return schedule! }

  switch (action) {
    case "init": {
      const task = args[0] || "未命名任务"
      const requirement = args.slice(1).join(" ") || ""
      const ts = now()

      const newSchedule = {
        task,
        requirement,
        workflow: "prototype",
        workflowVersion: "8",
        currentState: "in_progress",
        currentStep: "plan",
        lastUpdate: ts,
        qa_fix_count: 0,
        steps: buildStepsFromGroups(["plan"]),
        agentFlow: []
      }

      writeSchedule(SCHEDULE_FILE, newSchedule, workDir)
      message = `📋 初始化 schedule: ${task}\n\n已创建 plan 组步骤（plan → user_gate_plan → done）。\n使用 'schedule add-step-group design' 添加设计组，\n或 'schedule add-step-group dev' 添加开发组。`
      changed = true
      break
    }

    case "init-full": {
      const task = args[0] || "未命名任务"
      const requirement = args.slice(1).join(" ") || ""
      const ts = now()

      const newSchedule = {
        task,
        requirement,
        workflow: "prototype",
        workflowVersion: "8",
        currentState: "in_progress",
        currentStep: "plan",
        lastUpdate: ts,
        qa_fix_count: 0,
        steps: buildStepsFromGroups(["plan", "design", "dev"]),
        agentFlow: []
      }

      writeSchedule(SCHEDULE_FILE, newSchedule, workDir)
      message = `📋 初始化完整 schedule: ${task}\n\n已创建完整流程：plan → user_gate_plan → parallel_design_prd → user_gate_design_prd → frontend_dev → qa → serve → done`
      changed = true
      break
    }

    case "setup-from-plan": {
      // 从虚拟规划阶段快速创建并启动：init + add-step-groups + complete plan/user_gate_plan + start first step
      const task = args[0] || "未命名任务"
      const requirement = args.slice(1).join(" ") || ""
      const ts = now()

      // 1. 初始化 schedule（只创建 plan 组）
      const newSchedule = {
        task,
        requirement,
        workflow: "prototype",
        workflowVersion: "8",
        currentState: "in_progress",
        currentStep: "plan",
        lastUpdate: ts,
        qa_fix_count: 0,
        steps: buildStepsFromGroups(["plan"]),
        agentFlow: []
      }

      writeSchedule(SCHEDULE_FILE, newSchedule, workDir)
      let s = readSchedule(SCHEDULE_FILE, workDir)!

      // 2. 添加 design 组（如果 workflow 中存在）
      if (findStep(s, "parallel_design_prd") === null) {
        // 需要添加 design 组
        const designGroupSteps = STEP_GROUPS["design"]
        if (designGroupSteps) {
          // 检查是否已存在
          const exists = designGroupSteps.some(id => findStep(s, id) !== null)
          if (!exists) {
            // 添加 design 组
            const doneIndex = s.steps.findIndex((st: any) => st.id === "done")
            const insertIndex = doneIndex > 0 ? doneIndex - 1 : s.steps.length - 1
            let nextPointer: string | null = "done"
            
            if (doneIndex > 0) {
              const beforeDone = s.steps[insertIndex]
              nextPointer = beforeDone.next
              beforeDone.next = designGroupSteps[0]
            }
            
            const newSteps: any[] = []
            for (let i = 0; i < designGroupSteps.length; i++) {
              const stepId = designGroupSteps[i]
              const nextId = i < designGroupSteps.length - 1 ? designGroupSteps[i + 1] : nextPointer
              const template = STEP_TEMPLATES[stepId]
              if (template) {
                newSteps.push(createStep(template, nextId))
              }
            }
            s.steps.splice(insertIndex + 1, 0, ...newSteps)
          }
        }
      }

      // 3. 添加 dev 组（如果 workflow 中存在）
      if (findStep(s, "frontend_dev") === null) {
        const devGroupSteps = STEP_GROUPS["dev"]
        if (devGroupSteps) {
          const exists = devGroupSteps.some(id => findStep(s, id) !== null)
          if (!exists) {
            const doneIndex = s.steps.findIndex((st: any) => st.id === "done")
            const insertIndex = doneIndex > 0 ? doneIndex - 1 : s.steps.length - 1
            let nextPointer: string | null = "done"
            
            if (doneIndex > 0) {
              const beforeDone = s.steps[insertIndex]
              nextPointer = beforeDone.next
              beforeDone.next = devGroupSteps[0]
            }
            
            const newSteps: any[] = []
            for (let i = 0; i < devGroupSteps.length; i++) {
              const stepId = devGroupSteps[i]
              const nextId = i < devGroupSteps.length - 1 ? devGroupSteps[i + 1] : nextPointer
              const template = STEP_TEMPLATES[stepId]
              if (template) {
                newSteps.push(createStep(template, nextId))
              }
            }
            s.steps.splice(insertIndex + 1, 0, ...newSteps)
          }
        }
      }

      // 重新读取以获取更新后的 steps
      writeSchedule(SCHEDULE_FILE, s, workDir)
      s = readSchedule(SCHEDULE_FILE, workDir)!

      // 4. 快速完成 plan 步骤
      const planStep = findStep(s, "plan")
      if (planStep) {
        planStep.status = "completed"
        planStep.completedAt = ts
        if (planStep.agents) {
          for (const agent of planStep.agents) {
            agent.status = "completed"
            agent.completedAt = ts
          }
        }
      }

      // 5. 快速完成 user_gate_plan 步骤
      const userGatePlanStep = findStep(s, "user_gate_plan")
      if (userGatePlanStep) {
        userGatePlanStep.status = "completed"
        userGatePlanStep.completedAt = ts
        userGatePlanStep.userDecision = "A"
        if (userGatePlanStep.agents) {
          for (const agent of userGatePlanStep.agents) {
            agent.status = "completed"
            agent.completedAt = ts
          }
        }
      }

      // 6. 确定第一个实际步骤
      let firstRealStep = null
      if (findStep(s, "parallel_design_prd")) {
        firstRealStep = "parallel_design_prd"
      } else if (findStep(s, "frontend_dev")) {
        firstRealStep = "frontend_dev"
      }

      if (firstRealStep) {
        const firstStep = findStep(s, firstRealStep)
        if (firstStep) {
          firstStep.status = "in_progress"
          firstStep.startedAt = ts
          s.currentStep = firstRealStep
          
          // 记录 agents 的 agentFlow
          if (firstStep.agents) {
            for (const agent of firstStep.agents) {
              if (agent.status === "pending") {
                agent.status = "in_progress"
                agent.dispatchedAt = ts
                s.agentFlow.push({ from: "project-manager", to: agent.name, step: firstRealStep, timestamp: ts })
              }
            }
          }
        }
      }

      s.lastUpdate = ts
      writeSchedule(SCHEDULE_FILE, s, workDir)
      
      const firstStepName = firstRealStep ? getAgentCName(firstRealStep) : "无"
      message = `✅ 从规划快速启动: ${task}\n\n已完成: plan ✅ → user_gate_plan ✅\n已创建步骤组: ${findStep(s, "parallel_design_prd") ? "design " : ""}${findStep(s, "frontend_dev") ? "dev" : ""}\n开始执行: ${firstStepName} (${firstRealStep})`
      changed = true
      break
    }

    case "start": {
      const s = requireSchedule()
      const stepId = args[0]
      const ts = now()

      if (!stepId) err("❌ 用法: start <stepId>")

      const step = findStep(s, stepId)
      if (!step) err(`❌ 步骤 "${stepId}" 不存在`)

      step.status = "in_progress"
      step.startedAt = ts
      s.currentStep = stepId
      s.lastUpdate = ts

      if (step.agents) {
        for (const agent of step.agents) {
          if (agent.status === "pending") {
            agent.status = "in_progress"
            agent.dispatchedAt = ts
            // 记录 agentFlow：每次调度 agent 时记录
            s.agentFlow.push({ from: "project-manager", to: agent.name, step: stepId, timestamp: ts })
          }
        }
      }

      writeSchedule(SCHEDULE_FILE, s, workDir)
      message = `🚀 开始步骤: ${step.name} (${stepId})`
      changed = true
      break
    }

    case "complete": {
      const s = requireSchedule()
      const stepId = args[0]
      const ts = now()

      if (!stepId) err("❌ 用法: complete <stepId>")

      const step = findStep(s, stepId)
      if (!step) err(`❌ 步骤 "${stepId}" 不存在`)

      step.status = "completed"
      step.completedAt = ts

      // 步骤完成时，自动将所有 agents 标记为 completed
      if (step.agents) {
        for (const agent of step.agents) {
          agent.status = "completed"
          agent.completedAt = ts
        }
      }

      if (step.artifacts) {
        for (const artifact of step.artifacts) {
          if (artifact.path.endsWith("/*")) {
            artifact.status = "verified"
          } else {
            const ap = resolve(workDir, artifact.path)
            if (existsSync(ap)) {
              artifact.status = "verified"
            }
          }
        }
      }

      s.currentStep = step.next || "done"
      s.lastUpdate = ts

      writeSchedule(SCHEDULE_FILE, s, workDir)
      message = `✅ 完成步骤: ${step.name} (${stepId}) → 下一步: ${step.next || "done"}`
      changed = true
      break
    }

    case "gate": {
      const s = requireSchedule()
      const stepId = args[0]
      const decision = args[1] || "A"
      const ts = now()

      if (!stepId) err("❌ 用法: gate <stepId> <A/B/C/D>")

      const step = findStep(s, stepId)
      if (!step) err(`❌ 步骤 "${stepId}" 不存在`)

      const option = findOption(step, decision)
      if (!option) err(`❌ 选项 "${decision}" 不存在于步骤 "${stepId}"`)

      step.status = "completed"
      step.completedAt = ts
      step.userDecision = decision
      s.lastUpdate = ts

      switch (option.action) {
        case "continue":
          s.currentStep = step.next
          break

        case "cancel":
          s.currentState = "cancelled"
          s.currentStep = "done"
          break

        case "reset_to_plan":
          s.currentStep = "plan"
          for (const st of s.steps) {
            if (st.id !== "plan") {
              st.status = "pending"
              st.startedAt = null
              st.completedAt = null
              st.userDecision = null
              for (const a of st.agents) {
                a.status = "pending"
                a.dispatchedAt = null
                a.completedAt = null
              }
              for (const a of st.artifacts) {
                a.status = "pending"
              }
            }
          }
          break

        case "partial_reset":
          if (option.targetAgent || option.targetArtifact) {
            const targetStep = option.targetStep ? findStep(s, option.targetStep) : step
            if (targetStep && option.targetAgent) {
              const agent = findAgent(targetStep, option.targetAgent)
              if (agent) {
                // 重置为 in_progress（表示要开始工作），而不是 pending
                agent.status = "in_progress"
                agent.dispatchedAt = ts
                agent.completedAt = null
              }
            }
            if (targetStep && option.targetArtifact) {
              const artifact = findArtifact(targetStep, option.targetArtifact)
              if (artifact) {
                artifact.status = "pending"
              }
            }
            if (targetStep) {
              // 设置为 in_progress，表示步骤正在工作中
              targetStep.status = "in_progress"
              targetStep.startedAt = ts
              targetStep.completedAt = null
              targetStep.userDecision = null
            }
            s.currentStep = option.targetStep || stepId
          }
          break

        case "redo_previous":
          if (option.targetStep) {
            const targetStep = findStep(s, option.targetStep)
            if (targetStep) {
              // 设置为 in_progress，表示步骤正在重新工作中
              targetStep.status = "in_progress"
              targetStep.startedAt = ts
              targetStep.completedAt = null
              targetStep.userDecision = null
              
              // 如果指定了 targetAgent，只重置该 agent 为 in_progress；否则重置所有 agents
              if (option.targetAgent) {
                const agent = findAgent(targetStep, option.targetAgent)
                if (agent) {
                  // 重置为 in_progress（要开始工作）
                  agent.status = "in_progress"
                  agent.dispatchedAt = ts
                  agent.completedAt = null
                }
                // 其他 agents 保持 completed 状态
                // 只有被重置的 agent 对应的 artifacts 重置
                if (option.targetArtifact) {
                  const artifact = findArtifact(targetStep, option.targetArtifact)
                  if (artifact) {
                    artifact.status = "pending"
                  }
                }
              } else {
                // 未指定 targetAgent，重置所有 agents 为 in_progress
                for (const a of targetStep.agents) {
                  a.status = "in_progress"
                  a.dispatchedAt = ts
                  a.completedAt = null
                }
                for (const a of targetStep.artifacts) {
                  a.status = "pending"
                }
              }
              s.currentStep = option.targetStep
            }
          }
          break

        default:
          s.currentStep = step.next
      }

      writeSchedule(SCHEDULE_FILE, s, workDir)
      message = `👥 用户确认: ${step.name} → 选择 ${decision} (${option.label})`
      changed = true
      break
    }

    case "finish": {
      const s = requireSchedule()
      const ts = now()
      s.currentState = "done"
      s.currentStep = "done"
      s.lastUpdate = ts
      writeSchedule(SCHEDULE_FILE, s, workDir)
      message = "🎉 任务完成！"
      changed = true
      break
    }

    case "agent-status": {
      const s = requireSchedule()
      const [stepId, agentName, status] = args
      if (!stepId || !agentName || !status) err("❌ 用法: agent-status <stepId> <agentName> <status>")

      const step = findStep(s, stepId)
      if (!step) err(`❌ 步骤 "${stepId}" 不存在`)

      const agent = findAgent(step, agentName)
      if (!agent) err(`❌ Agent "${agentName}" 不存在于步骤 "${stepId}"`)

      agent.status = status
      if (status === "completed") agent.completedAt = now()
      if (status === "pending") { agent.completedAt = null; agent.dispatchedAt = null }
      if (status === "in_progress") agent.dispatchedAt = now()

      s.lastUpdate = now()
      writeSchedule(SCHEDULE_FILE, s, workDir)
      message = `👤 ${getAgentCName(agentName)}: ${status}`
      changed = true
      break
    }

    case "artifact-status": {
      const s = requireSchedule()
      const [stepId, artPath, status] = args
      if (!stepId || !artPath || !status) err("❌ 用法: artifact-status <stepId> <artifactPath> <status>")

      const step = findStep(s, stepId)
      if (!step) err(`❌ 步骤 "${stepId}" 不存在`)

      const artifact = findArtifact(step, artPath)
      if (!artifact) err(`❌ Artifact "${artPath}" 不存在于步骤 "${stepId}"`)

      artifact.status = status
      s.lastUpdate = now()
      writeSchedule(SCHEDULE_FILE, s, workDir)
      message = `📦 产出物: ${artPath} → ${status}`
      changed = true
      break
    }

    case "reset-step": {
      const s = requireSchedule()
      const stepId = args[0]
      if (!stepId) err("❌ 用法: reset-step <stepId>")

      const step = findStep(s, stepId)
      if (!step) err(`❌ 步骤 "${stepId}" 不存在`)

      step.status = "pending"
      step.startedAt = null
      step.completedAt = null
      step.userDecision = null

      for (const a of step.agents) {
        a.status = "pending"
        a.dispatchedAt = null
        a.completedAt = null
      }

      for (const a of step.artifacts) {
        a.status = "pending"
      }

      s.currentStep = stepId
      s.lastUpdate = now()
      writeSchedule(SCHEDULE_FILE, s, workDir)
      message = `🔄 重置步骤: ${step.name} (${stepId})`
      changed = true
      break
    }

    case "set-field": {
      const s = requireSchedule()
      const [field, ...valueParts] = args
      const value = valueParts.join(" ")

      if (!field) err("❌ 用法: set-field <field> <value>")

      if (field === "currentStep") s.currentStep = value
      else if (field === "currentState") s.currentState = value
      else if (field === "task") s.task = value
      else if (field === "requirement") s.requirement = value
      else if (field === "qa_fix_count") {
        const num = parseInt(value)
        if (isNaN(num)) err("❌ qa_fix_count 必须是整数")
        s.qa_fix_count = num
      }
      else err(`❌ 不支持的字段: ${field}`)

      s.lastUpdate = now()
      writeSchedule(SCHEDULE_FILE, s, workDir)
      message = `📝 字段更新: ${field} = ${value}`
      changed = true
      break
    }

    case "dispatch": {
      const ts = now()
      const s = requireSchedule()
      const stepId = args[0]
      const agentName = args[1]
      const taskDesc = args.slice(2).join(" ") || "执行任务"

      if (!stepId || !agentName) err("❌ 用法: dispatch <stepId> <agentName> [taskDesc...]")

      const step = findStep(s, stepId)
      if (!step) err(`❌ 步骤 "${stepId}" 不存在`)

      let agent = findAgent(step, agentName)
      if (!agent) {
        agent = {
          name: agentName,
          description: getAgentCName(agentName),
          status: "pending",
          dispatchedAt: null,
          completedAt: null
        }
        step.agents.push(agent)
      }

      step.status = "in_progress"
      step.startedAt = step.startedAt || ts
      agent.status = "in_progress"
      agent.dispatchedAt = ts
      agent.completedAt = null

      s.currentStep = stepId
      s.lastUpdate = ts
      s.agentFlow.push({ from: "project-manager", to: agentName, step: stepId, timestamp: ts })

      writeSchedule(SCHEDULE_FILE, s, workDir)

      const result = {
        success: true,
        action: "dispatch",
        agentName,
        stepId,
        stepName: step.name,
        taskDesc,
        message: `⚡ @${getAgentCName(agentName)} 收到指令：${taskDesc}`
      }
      message = JSON.stringify(result, null, 2)
      changed = true
      break
    }

    case "add-step-group": {
      const s = requireSchedule()
      const groupName = args[0]

      if (!groupName) err("❌ 用法: add-step-group <groupName>")
      if (!VALID_STEP_GROUPS.includes(groupName as any)) err(`❌ 无效的步骤组: ${groupName}。支持的: ${VALID_STEP_GROUPS.join(", ")}`)

      const groupStepIds = STEP_GROUPS[groupName]
      if (!groupStepIds) err(`❌ 步骤组 "${groupName}" 未定义`)

      for (const stepId of groupStepIds) {
        if (findStep(s, stepId)) {
          err(`❌ 步骤 "${stepId}" 已存在，无法重复添加 ${groupName} 组`)
        }
      }

      let insertIndex = s.steps.length - 1
      let nextPointer: string | null = "done"

      const doneIndex = s.steps.findIndex((st: any) => st.id === "done")
      if (doneIndex > 0) {
        insertIndex = doneIndex - 1
        const beforeDone = s.steps[insertIndex]
        nextPointer = beforeDone.next
        beforeDone.next = groupStepIds[0]
      }

      const newSteps: any[] = []
      for (let i = 0; i < groupStepIds.length; i++) {
        const stepId = groupStepIds[i]
        const nextId = i < groupStepIds.length - 1 ? groupStepIds[i + 1] : nextPointer
        const template = STEP_TEMPLATES[stepId]
        if (template) {
          newSteps.push(createStep(template, nextId))
        }
      }

      s.steps.splice(insertIndex + 1, 0, ...newSteps)

      s.lastUpdate = now()
      writeSchedule(SCHEDULE_FILE, s, workDir)
      message = `➕ 添加步骤组: ${groupName}\n   步骤: ${groupStepIds.join(" → ")}\n   当前完整流程: ${s.steps.map((st: any) => st.id).join(" → ")}`
      changed = true
      break
    }

    case "remove-step-group": {
      const s = requireSchedule()
      const groupName = args[0]

      if (!groupName) err("❌ 用法: remove-step-group <groupName>")
      if (!VALID_STEP_GROUPS.includes(groupName as any)) err(`❌ 无效的步骤组: ${groupName}`)

      const groupStepIds = STEP_GROUPS[groupName]
      if (!groupStepIds) err(`❌ 步骤组 "${groupName}" 未定义`)

      const stepsToRemove = groupStepIds.map(id => findStep(s, id)).filter(Boolean)
      if (stepsToRemove.length === 0) {
        err(`❌ 步骤组 "${groupName}" 不存在于当前 schedule`)
      }

      for (const step of stepsToRemove) {
        if (s.currentStep === step.id) {
          err(`❌ 不能删除当前正在执行的步骤 "${step.id}"`)
        }
      }

      const firstStepId = groupStepIds[0]
      const prevStep = s.steps.find((st: any) => st.next === firstStepId)
      const lastStep = stepsToRemove[stepsToRemove.length - 1]

      if (prevStep && lastStep) {
        prevStep.next = lastStep.next
      }

      s.steps = s.steps.filter((st: any) => !groupStepIds.includes(st.id))

      s.lastUpdate = now()
      writeSchedule(SCHEDULE_FILE, s, workDir)
      message = `➖ 删除步骤组: ${groupName}\n   删除步骤: ${groupStepIds.join(", ")}`
      changed = true
      break
    }

    case "context": {
      const lines: string[] = []

      if (!schedule) {
        lines.push("📋 Schedule 不存在，这是一个新项目。")
        lines.push("")
        lines.push("📌 建议操作：")
        lines.push("1. 使用 brainstorm skill 分析需求")
        lines.push("2. 使用 schedule init <task> <requirement> 初始化（只创建 plan 组）")
        lines.push("3. plan 阶段内使用 add-step-group 添加需要的组")
        message = lines.join("\n")
        break
      }

      const stepInfo = schedule.currentStep && schedule.currentStep !== "done" ? findStep(schedule, String(schedule.currentStep)) : null

      lines.push("📋 当前上下文")
      lines.push("━".repeat(50))
      lines.push(`  项目: ${schedule.task}`)
      lines.push(`  需求: ${schedule.requirement || "(无)"}`)
      lines.push(`  流程状态: ${schedule.currentState}`)
      lines.push(`  当前步骤: ${schedule.currentStep || "(无)"}`)
      lines.push(`  QA修复次数: ${schedule.qa_fix_count}`)
      lines.push(`  更新时间: ${schedule.lastUpdate}`)

      if (stepInfo) {
        lines.push("")
        lines.push("━".repeat(50))
        lines.push("🔄 当前步骤")
        lines.push(`  ID: ${stepInfo.id}`)
        lines.push(`  名称: ${stepInfo.name}`)
        lines.push(`  模式: ${stepInfo.mode}`)
        lines.push(`  状态: ${stepInfo.status}`)
        lines.push(`  下一步: ${stepInfo.next || "完成"}`)
        if (stepInfo.options?.length > 0) {
          lines.push(`  可选操作:`)
          for (const opt of stepInfo.options) {
            lines.push(`    ${opt.key}. ${opt.label}`)
          }
        }
        if (stepInfo.agents?.length > 0) {
          lines.push(`  参与Agent:`)
          for (const a of stepInfo.agents) {
            lines.push(`    - ${getAgentCName(a.name)} (${a.status})${a.description ? " — " + a.description : ""}`)
          }
        }
        if (stepInfo.artifacts?.length > 0) {
          lines.push(`  产出物:`)
          for (const a of stepInfo.artifacts) {
            const icon = a.status === "verified" ? "✅" : "⬜"
            lines.push(`    ${icon} ${a.path} (${a.producedBy})`)
          }
        }
      } else if (schedule.currentStep === "done") {
        lines.push("")
        lines.push("📌 任务已完成！")
      } else if (schedule.currentStep === null) {
        lines.push("")
        lines.push("📌 已初始化但未开始，请 schedule start <stepId>")
      }

      if (schedule.steps?.length > 0) {
        lines.push("")
        lines.push("━".repeat(50))
        lines.push("📊 步骤进度")
        for (const step of schedule.steps) {
          const icon = step.status === "completed" ? "✅" : step.status === "in_progress" ? "🔄" : step.status === "failed" ? "❌" : "⬜"
          const agentsStr = step.agents?.length > 0 ? " " + step.agents.map((a: any) => `${a.name.split("-").pop()}${a.status === "completed" ? "✓" : a.status === "in_progress" ? "⟳" : "○"}`).join(" ") : ""
          lines.push(`  ${icon} ${step.id} [${step.mode}] ${step.name}${agentsStr}`)
        }
      }

      const allArtifacts: any[] = []
      for (const st of schedule.steps) { if (st.artifacts) for (const a of st.artifacts) allArtifacts.push(a) }
      if (allArtifacts.length > 0) {
        lines.push("")
        lines.push("━".repeat(50))
        lines.push("📦 产出物")
        const verified = allArtifacts.filter((a: any) => a.status === "verified").length
        const pending = allArtifacts.filter((a: any) => a.status === "pending").length
        lines.push(`  ✅ 已验证: ${verified}  ⬜ 待验证: ${pending}`)
        for (const a of allArtifacts) {
          const icon = a.status === "verified" ? "✅" : "⬜"
          lines.push(`  ${icon} ${a.path} (${a.producedBy})`)
        }
      }

      if (schedule.agentFlow && schedule.agentFlow.length > 0) {
        lines.push("")
        lines.push("━".repeat(50))
        lines.push("📤 最近调度")
        const recent = schedule.agentFlow.slice(-5)
        for (const f of recent) {
          lines.push(`  ${f.timestamp} ${getAgentCName(f.from)} → ${getAgentCName(f.to)} (@${f.step})`)
        }
      }

      lines.push("")
      lines.push("━".repeat(50))
      lines.push("💡 下一步行动建议")
      if (!schedule.currentStep || schedule.currentStep === null) {
        lines.push("  → schedule start <stepId>")
      } else if (schedule.currentStep === "done") {
        lines.push("  → 任务已完成，询问用户新需求")
      } else if (stepInfo) {
        const modeAdvice: Record<string, string> = {
          "primary": "自执行 → 项目经理直接执行此步骤",
          "user_gate": "等待用户确认 → 使用 schedule gate <stepId> <A/B/C/D>",
          "parallel": "并行执行 → dispatch 所有 agents: schedule dispatch <stepId> <agentName> <task>",
          "single": "调用 agent → schedule dispatch <stepId> <agentName> <task>",
          "terminal": "展示结果 → 向用户报告",
        }
        lines.push(`  → ${modeAdvice[stepInfo.mode] || "执行此步骤"}`)

        if (stepInfo.options?.length > 0) {
          lines.push(`  → 用户确认选项: ${stepInfo.options.map((o: any) => o.key).join("/")}`)
        }
      }

      message = lines.join("\n")
      break
    }

    case "validate": {
      const s = requireSchedule()
      const result = validate(s, SCHEDULE_FILE, workDir)
      if (result.valid) {
        message = `✅ 校验通过\n  步骤数: ${s.steps.length}  状态: ${s.currentState}  当前: ${s.currentStep}  QA修复: ${s.qa_fix_count}`
      } else {
        message = "❌ 校验失败:\n" + result.errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n")
      }
      break
    }

    case "show": {
      message = schedule ? showStatus(schedule) : "📋 Schedule 为空"
      break
    }

    case "show-steps": {
      message = schedule ? showSteps(schedule) : "📋 步骤为空"
      break
    }

    default:
      err(`❌ 未知操作: ${action}。支持: init, init-full, start, complete, gate, finish, agent-status, artifact-status, reset-step, set-field, dispatch, add-step-group, remove-step-group, context, validate, show, show-steps`)
  }

  if (changed) {
    const updated = readSchedule(SCHEDULE_FILE, workDir)
    if (updated) {
      const result = validate(updated, SCHEDULE_FILE, workDir)
      if (!result.valid) {
        message += "\n\n⚠️  校验失败:\n" + result.errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n")
      }
    }
  }

  return { message }
}

export default tool({
  description: `管理 agent_schedule.json 流程状态。可用操作：

状态更新：init, init-full, setup-from-plan, start, complete, gate, finish, agent-status, artifact-status, reset-step, set-field, dispatch
步骤组管理：add-step-group, remove-step-group
只读操作：context, validate, show, show-steps

关键命令：
- init: 初始化只含 plan 组的 schedule（plan 阶段动态添加其他组）
- init-full: 初始化包含所有组的完整流程
- setup-from-plan: 从虚拟规划快速启动（init + add-step-groups + complete plan/user_gate_plan + start first step）
- add-step-group <group>: 动态添加步骤组（plan/design/dev）
- dispatch <stepId> <agentName> [task]: 调度 agent 到指定步骤
- gate <stepId> <A/B/C/D>: 基于步骤 options 执行用户选择

写操作完成后自动校验。`,

  args: {
    action: tool.schema.string().describe(
      "操作名称: init/init-full/setup-from-plan/start/complete/gate/finish/agent-status/artifact-status/reset-step/set-field/dispatch/add-step-group/remove-step-group/context/validate/show/show-steps"
    ),
    args: tool.schema.string().describe(
      '操作参数，空格分隔。如: "start plan" / "gate user_gate_plan A" / "dispatch parallel_design_prd product-manager 写PRD" / "add-step-group design" / "setup-from-plan 我的项目 需求描述"'
    ),
  },

  async execute(args, context) {
    // 使用 context.directory 获取用户项目目录
    // 这是 opencode 提供的标准属性，指向用户当前打开的项目
    const directory = context.directory
    const action = args.action
    const rawArgs = args.args || ""

    const parsedArgs: string[] = []
    const regex = /[^\s"]+|"([^"]*)"/g
    let match
    while ((match = regex.exec(rawArgs)) !== null) {
      parsedArgs.push(match[1] !== undefined ? match[1] : match[0])
    }

    try {
      const result = doAction(action, parsedArgs, directory)
      return result.message
    } catch (error: any) {
      return `❌ ${error.message}`
    }
  },
})