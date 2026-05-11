import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useReaderStore } from './reader-store.js'

vi.mock('../services/api.js', () => ({
  fetchChapter: vi.fn()
}))

import { fetchChapter } from '../services/api.js'

describe('reader-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('加载章节媒体并保留当前页', async () => {
    fetchChapter.mockResolvedValue({
      path: '目录/第 1 话',
      files: [{ url: '/1.jpg' }, { url: '/2.jpg' }],
      total: 2
    })

    const store = useReaderStore()
    await store.loadChapter('系列 A', '目录/第 1 话')

    expect(store.seriesName).toBe('系列 A')
    expect(store.chapterPath).toBe('目录/第 1 话')
    expect(store.mediaItems).toHaveLength(2)
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
    fetchChapter.mockImplementation((seriesName, chapterPath) => Promise.resolve({
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
})
