#!/usr/bin/env node

/**
 * agent_schedule.json 校验脚本
 * 
 * 用法：node ~/.config/opencode/tools/validate-schedule.js [schedule文件路径]
 * 默认路径：docs/agent_schedule.json
 * 
 * 校验规则：
 * 1. JSON 格式合法
 * 2. currentStep 对应的步骤 status 是 in_progress
 * 3. currentState 不是 done 时，currentStep 不能是 done
 * 4. 所有 status 值只有：pending / in_progress / completed / failed / cancelled
 * 5. 所有 artifact status 值只有：pending / verified
 * 6. agent.completedAt 不为 null 时，agent.status 必须是 completed
 * 7. step.completedAt 不为 null 时，step.status 必须是 completed
 * 8. artifact.status 为 verified 时，对应文件必须存在且非空
 * 9. qa_fix_count >= 0 且为整数
 * 10. 顶层字段顺序正确
 * 11. step 字段顺序正确
 * 12. 时间字段是 ISO 8601 格式或 null
 */

const fs = require('fs')
const path = require('path')

const VALID_STEP_STATUSES = ['pending', 'in_progress', 'completed', 'failed', 'cancelled']
const VALID_ARTIFACT_STATUSES = ['pending', 'verified']
const VALID_MODES = ['primary', 'user_gate', 'parallel', 'sequential', 'single', 'terminal']

// 定义正确的字段顺序
const TOP_LEVEL_ORDER = ['task', 'requirement', 'planType', 'workflow', 'workflowVersion', 'currentState', 'currentStep', 'startTime', 'lastUpdate', 'qa_fix_count', 'steps', 'agentFlow']
const STEP_ORDER = ['id', 'name', 'mode', 'status', 'startedAt', 'completedAt', 'userDecision', 'agents', 'artifacts', 'next']
const AGENT_ORDER = ['name', 'description', 'status', 'dispatchedAt', 'completedAt']
const ARTIFACT_ORDER = ['path', 'producedBy', 'status']

function checkFieldOrder(obj, expectedOrder, path) {
  const errors = []
  const actualKeys = Object.keys(obj).filter(k => expectedOrder.includes(k))
  const sortedKeys = actualKeys.filter(k => expectedOrder.includes(k)).sort((a, b) => expectedOrder.indexOf(a) - expectedOrder.indexOf(b))
  
  for (let i = 0; i < actualKeys.length; i++) {
    if (actualKeys[i] !== sortedKeys[i]) {
      errors.push(`${path} 字段顺序错误："${actualKeys[i]}" 出现在位置 ${i+1}，但应在位置 ${expectedOrder.indexOf(actualKeys[i])+1}`)
    }
  }
  return errors
}

function isISO8601(value) {
  if (value === null || value === undefined) return true
  if (typeof value !== 'string') return false
  // 允许的格式：2026-04-09T10:00:00Z 或 2026-04-09T10:00:00.000Z
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
}

function validateSchedule(schedulePath) {
  const resolvedPath = path.resolve(schedulePath)
  
  // 规则1：JSON 格式合法
  let content
  let schedule
  try {
    content = fs.readFileSync(resolvedPath, 'utf-8')
    schedule = JSON.parse(content)
  } catch (e) {
    return { valid: false, errors: [`JSON格式错误: ${e.message}`] }
  }

  const errors = []

  // 规则10：顶层字段顺序
  const topLevelErrors = checkFieldOrder(schedule, TOP_LEVEL_ORDER, '顶层')
  errors.push(...topLevelErrors)

  // 基本结构检查
  if (!schedule.steps || !Array.isArray(schedule.steps)) {
    return { valid: false, errors: ['缺少 steps 数组'] }
  }

  // 规则9：qa_fix_count
  if (schedule.qa_fix_count !== undefined) {
    if (!Number.isInteger(schedule.qa_fix_count) || schedule.qa_fix_count < 0) {
      errors.push(`qa_fix_count 必须是非负整数，当前值: ${schedule.qa_fix_count}`)
    }
  }

  // 时间字段格式检查
  const timeFields = ['startTime', 'lastUpdate']
  for (const field of timeFields) {
    if (schedule[field] !== undefined && schedule[field] !== null && schedule[field] !== '') {
      if (!isISO8601(schedule[field])) {
        errors.push(`顶层 ${field} 时间格式错误: "${schedule[field]}"，应为 yyyy-MM-dd HH:mm:ss 格式（如 2026-04-09 15:30:45）`)
      }
    }
  }

  // 查找 currentStep 对应的步骤
  const currentStep = schedule.steps.find(s => s.id === schedule.currentStep)

  // 规则2：currentStep 对应的步骤 status 是 in_progress
  if (currentStep && schedule.currentState !== 'done') {
    if (currentStep.status !== 'in_progress') {
      errors.push(`currentStep "${schedule.currentStep}" 的 status 是 "${currentStep.status}"，应该是 "in_progress"`)
    }
  }

  // 规则3：currentState 不是 done 时，currentStep 不能是 done
  if (schedule.currentState !== 'done' && schedule.currentStep === 'done') {
    errors.push('currentState 不是 done 但 currentStep 是 done')
  }

  // 遍历所有步骤
  for (let i = 0; i < schedule.steps.length; i++) {
    const step = schedule.steps[i]
    const stepPath = `steps[${i}].${step.id || i}`

    // 规则11：step 字段顺序
    const stepErrors = checkFieldOrder(step, STEP_ORDER, stepPath)
    errors.push(...stepErrors)

    // 规则4：步骤 status 枚举值
    if (!VALID_STEP_STATUSES.includes(step.status)) {
      errors.push(`${stepPath} 的 status "${step.status}" 不合法，允许值: ${VALID_STEP_STATUSES.join(', ')}`)
    }

    // 时间字段格式检查
    for (const field of ['startedAt', 'completedAt']) {
      if (step[field] !== undefined && step[field] !== null) {
        if (!isISO8601(step[field])) {
          errors.push(`${stepPath}.${field} 时间格式错误: "${step[field]}"`)
        }
      }
    }

    // 规则7：step.completedAt 与 status 一致性
    if (step.completedAt !== null && step.completedAt !== undefined && step.completedAt !== '') {
      if (step.status !== 'completed') {
        errors.push(`${stepPath} 有 completedAt 但 status 不是 completed`)
      }
    }

    // 检查 agents
    if (step.agents && Array.isArray(step.agents)) {
      for (let j = 0; j < step.agents.length; j++) {
        const agent = step.agents[j]
        const agentPath = `${stepPath}.agents[${j}].${agent.name || j}`

        // agent 字段顺序
        const agentErrors = checkFieldOrder(agent, AGENT_ORDER, agentPath)
        errors.push(...agentErrors)

        // 规则4：agent status 枚举值
        if (!VALID_STEP_STATUSES.includes(agent.status)) {
          errors.push(`${agentPath} 的 status "${agent.status}" 不合法`)
        }

        // 规则6：agent.completedAt 与 status 一致性
        if (agent.completedAt !== null && agent.completedAt !== undefined && agent.completedAt !== '') {
          if (agent.status !== 'completed') {
            errors.push(`${agentPath} 有 completedAt 但 status 不是 completed`)
          }
        }

        // 时间字段格式检查
        for (const field of ['dispatchedAt', 'completedAt']) {
          if (agent[field] !== undefined && agent[field] !== null) {
            if (!isISO8601(agent[field])) {
              errors.push(`${agentPath}.${field} 时间格式错误: "${agent[field]}"`)
            }
          }
        }
      }
    }

    // 检查 artifacts
    if (step.artifacts && Array.isArray(step.artifacts)) {
      for (let k = 0; k < step.artifacts.length; k++) {
        const artifact = step.artifacts[k]
        const artifactPath = `${stepPath}.artifacts[${k}]`

        // artifact 字段顺序
        const artifactErrors = checkFieldOrder(artifact, ARTIFACT_ORDER, artifactPath)
        errors.push(...artifactErrors)

        // 规则5：artifact status 枚举值
        if (!VALID_ARTIFACT_STATUSES.includes(artifact.status)) {
          errors.push(`${artifactPath} 的 status "${artifact.status}" 不合法`)
        }

        // 规则8：artifact.status 为 verified 时，对应文件必须存在且非空
        if (artifact.status === 'verified') {
          const artifactFilePath = path.resolve(artifact.path)
          if (!fs.existsSync(artifactFilePath)) {
            errors.push(`${artifactPath} "${artifact.path}" status 为 verified 但文件不存在`)
          } else {
            const fileContent = fs.readFileSync(artifactFilePath, 'utf-8')
            if (fileContent.trim().length === 0) {
              errors.push(`${artifactPath} "${artifact.path}" status 为 verified 但文件为空`)
            }
          }
        }
      }
    }

  }

  return {
    valid: errors.length === 0,
    errors: errors,
    summary: {
      totalSteps: schedule.steps.length,
      currentState: schedule.currentState,
      currentStep: schedule.currentStep,
      planType: schedule.planType,
      qaFixCount: schedule.qa_fix_count
    }
  }
}

// 主程序
const schedulePath = process.argv[2] || 'docs/agent_schedule.json'
console.log(`校验文件: ${schedulePath}\n`)

const result = validateSchedule(schedulePath)

if (result.errors.length === 0) {
  console.log('✅ 校验通过')
  console.log(`\n摘要:`)
  console.log(`  - 总步骤数: ${result.summary.totalSteps}`)
  console.log(`  - 当前状态: ${result.summary.currentState}`)
  console.log(`  - 当前步骤: ${result.summary.currentStep}`)
  console.log(`  - 计划类型: ${result.summary.planType}`)
  console.log(`  - QA修复次数: ${result.summary.qaFixCount}`)
} else {
  console.log('❌ 校验失败')
  console.log(`\n错误列表 (${result.errors.length} 个):`)
  result.errors.forEach((err, i) => {
    console.log(`  ${i + 1}. ${err}`)
  })
  process.exit(1)
}
