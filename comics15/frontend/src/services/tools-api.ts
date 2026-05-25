import { fetchJson } from './api'
import type { ExecutionResult, ExecutionStatus, ExecutionsMap, ToolInfo } from '@/types/tools'

export function fetchTools(): Promise<ToolInfo[]> {
  return fetchJson<ToolInfo[]>('/api/tools')
}

/** 启动异步工具执行，返回包含 executionId 的结果，之后可轮询状态 */
export function executeTool(toolName: string, params: Record<string, string> = {}): Promise<ExecutionResult> {
  return fetchJson<ExecutionResult>(`/api/tools/${encodeURIComponent(toolName)}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  })
}

/** 轮询工具执行进度（状态、处理数、耗时、日志） */
export function fetchToolStatus(executionId: string): Promise<ExecutionStatus> {
  return fetchJson<ExecutionStatus>(`/api/tools/status/${encodeURIComponent(executionId)}`)
}

export function fetchExecutions(): Promise<ExecutionsMap> {
  return fetchJson<ExecutionsMap>('/api/tools/executions')
}

export function cancelExecution(executionId: string): Promise<unknown> {
  return fetchJson(`/api/tools/cancel/${encodeURIComponent(executionId)}`, {
    method: 'POST'
  })
}

export function cleanupExecutions(): Promise<unknown> {
  return fetchJson('/api/tools/cleanup', {
    method: 'POST'
  })
}
