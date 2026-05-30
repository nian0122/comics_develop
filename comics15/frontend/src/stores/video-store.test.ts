import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaItem } from '@/types/api'

vi.mock('@/services/api', () => ({
  fetchChapter: vi.fn()
}))

import { fetchChapter as _fetchChapter } from '@/services/api'
const fetchChapter = _fetchChapter as unknown as ReturnType<typeof vi.fn>

import { useVideoStore } from './video-store'

function makeVideo(name: string): MediaItem {
  return { name, type: 'video', url: `/video/${name}`, fallbackUrl: null }
}

function makeImage(name: string): MediaItem {
  return { name, type: 'image', url: `/image/${name}`, fallbackUrl: '/fallback.jpg' }
}

describe('video-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('setVideos stores data and caches it', () => {
    const store = useVideoStore()
    const items = [makeVideo('a.mp4'), makeVideo('b.mp4')]

    store.setVideos(items, 'MySeries', 'ch1')

    expect(store.videos).toEqual(items)
    expect(store.total).toBe(2)
  })

  it('fetchVideos filters video type from API response', async () => {
    fetchChapter.mockResolvedValue({
      path: 'ch1',
      files: [makeVideo('a.mp4'), makeImage('cover.jpg'), makeVideo('b.mp4')],
      total: 3
    })

    const store = useVideoStore()
    await store.fetchVideos('MySeries', 'ch1')

    expect(store.videos).toHaveLength(2)
    expect(store.videos[0].type).toBe('video')
    expect(store.videos[1].type).toBe('video')
    expect(store.loading).toBe(false)
  })

  it('fetchVideos uses cache on second call', async () => {
    fetchChapter.mockResolvedValue({
      path: 'ch1',
      files: [makeVideo('a.mp4')],
      total: 1
    })

    const store = useVideoStore()
    await store.fetchVideos('MySeries', 'ch1')
    expect(fetchChapter).toHaveBeenCalledTimes(1)

    await store.fetchVideos('MySeries', 'ch1')
    // 第二次调用应走缓存，不再请求 API
    expect(fetchChapter).toHaveBeenCalledTimes(1)
  })

  it('fetchVideos sets error on API failure', async () => {
    fetchChapter.mockRejectedValue(new Error('网络异常'))

    const store = useVideoStore()
    await store.fetchVideos('MySeries', 'ch1')

    expect(store.error).toBe('网络异常')
    expect(store.loading).toBe(false)
    expect(store.videos).toHaveLength(0)
  })

  it('clear resets all state', () => {
    const store = useVideoStore()
    const items = [makeVideo('a.mp4')]
    store.setVideos(items, 'MySeries', 'ch1')

    store.clear()

    expect(store.videos).toHaveLength(0)
    expect(store.total).toBe(0)
    expect(store.error).toBe('')
    expect(store.loading).toBe(false)
  })

  it('prefetchNext caches without replacing current videos', async () => {
    fetchChapter.mockResolvedValue({
      path: 'ch1',
      files: [makeVideo('ch1-a.mp4')],
      total: 1
    })

    const store = useVideoStore()
    await store.fetchVideos('MySeries', 'ch1')
    const currentVideos = store.videos

    fetchChapter.mockResolvedValue({
      path: 'ch2',
      files: [makeVideo('ch2-a.mp4')],
      total: 1
    })

    await store.prefetchNext('MySeries', 'ch2')

    // 当前视频不应被替换
    expect(store.videos).toEqual(currentVideos)
    expect(store.videos[0].name).toBe('ch1-a.mp4')
  })
})
