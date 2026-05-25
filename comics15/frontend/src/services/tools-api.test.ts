import { describe, expect, it, vi } from 'vitest'
import {
  cancelExecution,
  cleanupExecutions,
  fetchExecutions,
  fetchToolStatus,
  fetchTools,
  executeTool
} from './tools-api'

describe('tools-api', () => {
  it('构造工具列表接口 URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })

    await fetchTools()

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/tools', undefined)
  })

  it('构造执行接口 URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    await executeTool('image-optimizer', { rootDir: 'D:/demo' })

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/tools/image-optimizer/execute', expect.objectContaining({
      method: 'POST'
    }))
  })

  it('构造状态接口 URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    await fetchToolStatus('exec-1')

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/tools/status/exec-1', undefined)
  })

  it('构造取消与清理接口 URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    await cancelExecution('exec-1')
    await cleanupExecutions()

    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, '/api/tools/cancel/exec-1', expect.objectContaining({ method: 'POST' }))
    expect(globalThis.fetch).toHaveBeenNthCalledWith(2, '/api/tools/cleanup', expect.objectContaining({ method: 'POST' }))
  })

  it('构造执行记录接口 URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    await fetchExecutions()

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/tools/executions', undefined)
  })
})
