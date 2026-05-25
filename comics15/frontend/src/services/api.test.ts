import { describe, expect, it, vi } from 'vitest'
import { fetchChapter, fetchLevel, fetchSeries, fetchJson } from './api'

describe('api', () => {
  it('构造系列接口 URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ['A'] })

    await fetchSeries()

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/series', undefined)
  })

  it('构造章节接口 URL 并编码中文参数', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    await fetchChapter('系列 一', '第 10 话/番外 篇')

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/chapter/%E7%B3%BB%E5%88%97%20%E4%B8%80?chapterPath=%E7%AC%AC%2010%20%E8%AF%9D%2F%E7%95%AA%E5%A4%96%20%E7%AF%87',
      undefined
    )
  })

  it('构造层级接口 URL 并编码中文参数', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    await fetchLevel('系列 一', '目录/第 1 层')

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/levels/%E7%B3%BB%E5%88%97%20%E4%B8%80?path=%E7%9B%AE%E5%BD%95%2F%E7%AC%AC%201%20%E5%B1%82',
      undefined
    )
  })

  it('非 2xx 时抛出包含状态码的错误', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => 'not found' })

    await expect(fetchJson('/api/series')).rejects.toMatchObject({ status: 404 })
  })
})
