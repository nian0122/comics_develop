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
  executing: boolean
  error: string
  _pollTimer: ReturnType<typeof setInterval> | null
}

const POLL_INTERVAL_MS = 2000

export const useToolsStore = defineStore('tools', {
  state: (): ToolsState => ({
    tools: [],
    executions: {},
    executionStatus: null,
    activeExecutionId: '',
    loading: false,
    executing: false,
    error: '',
    _pollTimer: null
  }),
  actions: {
    async loadTools() {
      this.loading = true
      this.error = ''
      try {
        this.tools = await fetchTools()
      } catch (e) {
        this.error = e instanceof Error ? e.message : '获取工具列表失败'
        console.error('加载工具列表失败:', e)
      } finally {
        this.loading = false
      }
    },
    async startExecution(toolName: string, params: Record<string, string> = {}) {
      this.error = ''
      this.executing = true
      try {
        const result = await executeTool(toolName, params)
        this.activeExecutionId = result.executionId ?? ''
        if (this.activeExecutionId) {
          this._startPolling(this.activeExecutionId)
        } else {
          this.error = '启动失败：未返回执行 ID'
        }
        return result
      } catch (e) {
        this.executing = false
        this.error = e instanceof Error ? e.message : '工具执行请求失败'
        console.error('启动工具执行失败:', e)
        throw e
      }
    },
    async refreshExecutionStatus(executionId: string) {
      try {
        this.executionStatus = await fetchToolStatus(executionId)
        return this.executionStatus
      } catch (e) {
        console.error('获取执行状态失败:', e)
        this.error = '获取执行状态失败'
        return null
      }
    },
    async loadExecutions() {
      try {
        this.executions = await fetchExecutions()
      } catch (e) {
        console.error('加载执行记录失败:', e)
      }
      return this.executions
    },
    async cancelExecution(executionId: string) {
      try {
        await cancelToolExecution(executionId)
        this._stopPolling()
        this.executing = false
        await this.refreshExecutionStatus(executionId)
        await this.loadExecutions()
      } catch (e) {
        console.error('取消执行失败:', e)
        this.error = '取消执行失败'
      }
    },
    async cleanupExecutions() {
      try {
        await cleanupExecutions()
        await this.loadExecutions()
      } catch (e) {
        console.error('清理执行记录失败:', e)
      }
    },
    _startPolling(executionId: string) {
      this._stopPolling()
      const tick = async () => {
        const status = await this.refreshExecutionStatus(executionId)
        if (!status || status.finished) {
          this._stopPolling()
          this.executing = false
          await this.loadExecutions()
        }
      }
      tick()
      this._pollTimer = setInterval(tick, POLL_INTERVAL_MS)
    },
    _stopPolling() {
      if (this._pollTimer !== null) {
        clearInterval(this._pollTimer)
        this._pollTimer = null
      }
    }
  }
})
