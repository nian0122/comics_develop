import { defineStore } from 'pinia'
import {
  cancelExecution as cancelToolExecution,
  cleanupExecutions,
  executeTool,
  fetchExecutions,
  fetchToolStatus,
  fetchTools
} from '../services/tools-api.js'

export const useToolsStore = defineStore('tools', {
  state: () => ({
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
    async startExecution(toolName, params = {}) {
      const result = await executeTool(toolName, params)
      this.activeExecutionId = result.executionId ?? ''
      if (this.activeExecutionId) {
        await this.refreshExecutionStatus(this.activeExecutionId)
      }
      return result
    },
    async refreshExecutionStatus(executionId) {
      this.executionStatus = await fetchToolStatus(executionId)
      return this.executionStatus
    },
    async loadExecutions() {
      this.executions = await fetchExecutions()
      return this.executions
    },
    async cancelExecution(executionId) {
      return cancelToolExecution(executionId)
    },
    async cleanupExecutions() {
      return cleanupExecutions()
    }
  }
})
