import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSeriesStore } from './series-store'

vi.mock('@/services/api', () => ({
  fetchSeries: vi.fn()
}))

import { fetchSeries as _fetchSeries } from '@/services/api'
const fetchSeries = _fetchSeries as unknown as ReturnType<typeof vi.fn>

describe('series-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('加载系列成功时更新状态', async () => {
    fetchSeries.mockResolvedValue(['系列 A', '系列 B'])
    const store = useSeriesStore()

    await store.loadSeries()

    expect(store.series).toEqual(['系列 A', '系列 B'])
    expect(store.loading).toBe(false)
    expect(store.error).toBe('')
  })

  it('加载失败时保存错误', async () => {
    fetchSeries.mockRejectedValue(new Error('网络错误'))
    const store = useSeriesStore()

    await store.loadSeries()

    expect(store.series).toEqual([])
    expect(store.error).toBe('网络错误')
    expect(store.loading).toBe(false)
  })
})
