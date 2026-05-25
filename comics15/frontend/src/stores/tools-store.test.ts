import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useToolsStore } from './tools-store'

vi.mock('@/services/tools-api', () => ({
  cancelExecution: vi.fn(),
  cleanupExecutions: vi.fn(),
  executeTool: vi.fn(),
  fetchExecutions: vi.fn(),
  fetchToolStatus: vi.fn(),
  fetchTools: vi.fn()
}))

import {
  cancelExecution as _cancelExecution,
  executeTool as _executeTool,
  fetchExecutions as _fetchExecutions,
  fetchToolStatus as _fetchToolStatus,
  fetchTools as _fetchTools
} from '@/services/tools-api'
const cancelExecution = _cancelExecution as unknown as ReturnType<typeof vi.fn>
const executeTool = _executeTool as unknown as ReturnType<typeof vi.fn>
const fetchExecutions = _fetchExecutions as unknown as ReturnType<typeof vi.fn>
const fetchToolStatus = _fetchToolStatus as unknown as ReturnType<typeof vi.fn>
const fetchTools = _fetchTools as unknown as ReturnType<typeof vi.fn>

describe('tools-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('加载工具列表', async () => {
    fetchTools.mockResolvedValue([{ name: 'image-optimizer' }])
    const store = useToolsStore()

    await store.loadTools()

    expect(store.tools).toEqual([{ name: 'image-optimizer' }])
  })

  it('启动执行后记录执行 ID', async () => {
    executeTool.mockResolvedValue({ executionId: 'exec-1', toolName: 'image-optimizer' })
    const store = useToolsStore()

    await store.startExecution('image-optimizer', { rootDir: 'D:/demo' })

    expect(executeTool).toHaveBeenCalledWith('image-optimizer', { rootDir: 'D:/demo' })
    expect(store.activeExecutionId).toBe('exec-1')
  })

  it('启动执行后立即刷新状态', async () => {
    executeTool.mockResolvedValue({ executionId: 'exec-1', toolName: 'image-optimizer' })
    fetchToolStatus.mockResolvedValue({ executionId: 'exec-1', status: 'RUNNING', processedCount: 10 })
    const store = useToolsStore()

    await store.startExecution('image-optimizer', {})

    expect(fetchToolStatus).toHaveBeenCalledWith('exec-1')
    expect(store.executionStatus!.processedCount).toBe(10)
  })

  it('读取执行状态和历史', async () => {
    fetchToolStatus.mockResolvedValue({ executionId: 'exec-1', status: 'running' })
    fetchExecutions.mockResolvedValue({ 'exec-1': { executionId: 'exec-1', status: 'running' } })
    const store = useToolsStore()

    await store.refreshExecutionStatus('exec-1')
    await store.loadExecutions()

    expect(store.executionStatus!.executionId).toBe('exec-1')
    expect(store.executions).toEqual({ 'exec-1': { executionId: 'exec-1', status: 'running' } })
  })

  it('可以取消执行', async () => {
    cancelExecution.mockResolvedValue({})
    const store = useToolsStore()

    await store.cancelExecution('exec-1')

    expect(cancelExecution).toHaveBeenCalledWith('exec-1')
  })
})
