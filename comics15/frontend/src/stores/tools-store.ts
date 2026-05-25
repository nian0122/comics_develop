import { defineStore } from 'pinia'
import {
  cancelExecution as cancelToolExecution,
  cleanupExecutions,
  executeTool,
  fetchExecutions,
  fetchToolStatus,
  fetchTools
} from '@/services/tools-api'
import type { ExecutionStatus, ExecutionsMap, ToolInfo } from '@/types/tools'

interface ToolsState {
  tools: ToolInfo[]
  executions: ExecutionsMap
  executionStatus: ExecutionStatus | null
  activeExecutionId: string
  loading: boolean
  error: string
}

export const useToolsStore = defineStore('tools', {
  state: (): ToolsState => ({
    tools: [],
    executions: {},
    executionStatus: null,
    activeExecutionId: '',
    loading: false,
    error: ''
  }),
  actions: {
    async loadTools() {
      this.loading = true
      try {
        this.tools = await fetchTools()
      } finally {
        this.loading = false
      }
    },
    async startExecution(toolName: string, params: Record<string, string> = {}) {
      const result = await executeTool(toolName, params)
      this.activeExecutionId = result.executionId ?? ''
      if (this.activeExecutionId) {
        await this.refreshExecutionStatus(this.activeExecutionId)
      }
      return result
    },
    async refreshExecutionStatus(executionId: string) {
      this.executionStatus = await fetchToolStatus(executionId)
      return this.executionStatus
    },
    async loadExecutions() {
      this.executions = await fetchExecutions()
      return this.executions
    },
    async cancelExecution(executionId: string) {
      return cancelToolExecution(executionId)
    },
    async cleanupExecutions() {
      return cleanupExecutions()
    }
  }
})
