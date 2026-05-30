import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useReaderStore } from './reader-store'

vi.mock('@/services/api', () => ({
  fetchChapter: vi.fn()
}))

vi.mock('@/utils/preload-engine', () => ({
  preloadEngine: { reset: vi.fn() }
}))

import { fetchChapter as _fetchChapter } from '@/services/api'
const fetchChapter = _fetchChapter as unknown as ReturnType<typeof vi.fn>

describe('reader-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('加载章节媒体并保留当前页', async () => {
    fetchChapter.mockResolvedValue({
      path: '目录/第 1 话',
      files: [
        { name: '1.jpg', type: 'image', url: '/1.jpg', fallbackUrl: null },
        { name: '2.jpg', type: 'image', url: '/2.jpg', fallbackUrl: null }
      ],
      total: 2
    })

    const store = useReaderStore()
    await store.loadChapter('系列 A', '目录/第 1 话')

    expect(store.seriesName).toBe('系列 A')
    expect(store.chapterPath).toBe('目录/第 1 话')
    expect(store.imageItems).toHaveLength(2)
    expect(store.currentPage).toBe(1)
  })

  it('可以更新当前页并保存占位上下话信息', () => {
    const store = useReaderStore()
    store.setChapterContext({ previousChapterPath: '前一话', nextChapterPath: '下一话' })
    store.setCurrentPage(3)

    expect(store.currentPage).toBe(3)
    expect(store.previousChapterPath).toBe('前一话')
    expect(store.nextChapterPath).toBe('下一话')
  })

  it('加载不同章节时根据目录上下文推进上一话下一话', async () => {
    fetchChapter.mockImplementation((_seriesName: string, chapterPath: string) => Promise.resolve({
      path: chapterPath,
      files: [],
      total: 0
    }))
    const store = useReaderStore()

    store.setChapterContext({
      chapterPaths: ['目录/第 1 话', '目录/第 2 话', '目录/第 3 话']
    })

    await store.loadChapter('系列 A', '目录/第 1 话')
    expect(store.previousChapterPath).toBe('')
    expect(store.nextChapterPath).toBe('目录/第 2 话')

    await store.loadChapter('系列 A', '目录/第 2 话')
    expect(store.previousChapterPath).toBe('目录/第 1 话')
    expect(store.nextChapterPath).toBe('目录/第 3 话')
  })

  it('过滤掉视频文件，只保留图片', async () => {
    fetchChapter.mockResolvedValue({
      path: '目录/第 1 话',
      files: [
        { name: '1.jpg', type: 'image', url: '/1.jpg', fallbackUrl: null },
        { name: '2.mp4', type: 'video', url: '/2.mp4', fallbackUrl: null },
        { name: '3.jpg', type: 'image', url: '/3.jpg', fallbackUrl: null },
        { name: '4.mov', type: 'video', url: '/4.mov', fallbackUrl: null }
      ],
      total: 4
    })

    const store = useReaderStore()
    await store.loadChapter('系列 A', '目录/第 1 话')

    expect(store.imageItems).toHaveLength(2)
    expect(store.totalPages).toBe(2)
    expect(store.imageItems.every(item => item.type === 'image')).toBe(true)
  })

  it('setImages 同步设置图片列表和总页数', () => {
    const store = useReaderStore()
    const items = [
      { name: '1.jpg', type: 'image' as const, url: '/1.jpg', fallbackUrl: null },
      { name: '2.jpg', type: 'image' as const, url: '/2.jpg', fallbackUrl: null }
    ]

    store.setImages(items)

    expect(store.imageItems).toEqual(items)
    expect(store.totalPages).toBe(2)
  })
})
