import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSeriesStore } from './series-store'

vi.mock('@/services/api', () => ({
  fetchRootLevel: vi.fn()
}))

import { fetchRootLevel as _fetchRootLevel } from '@/services/api'
const fetchRootLevel = _fetchRootLevel as unknown as ReturnType<typeof vi.fn>

describe('series-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('加载系列成功时过滤出 series 节点', async () => {
    fetchRootLevel.mockResolvedValue({
      nodes: [
        { name: '系列 A', type: 'series', path: '系列 A', pathId: '系列 A' },
        { name: '系列 B', type: 'series', path: '系列 B', pathId: '系列 B' }
      ]
    })
    const store = useSeriesStore()

    await store.loadSeries()

    expect(store.series).toHaveLength(2)
    expect(store.series[0].name).toBe('系列 A')
    expect(store.series[1].name).toBe('系列 B')
    expect(store.loading).toBe(false)
    expect(store.error).toBe('')
  })

  it('加载失败时保存错误', async () => {
    fetchRootLevel.mockRejectedValue(new Error('网络错误'))
    const store = useSeriesStore()

    await store.loadSeries()

    expect(store.series).toEqual([])
    expect(store.error).toBe('网络错误')
    expect(store.loading).toBe(false)
  })
})
