import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChapterStore } from './chapter-store.js'

vi.mock('../services/api.js', () => ({
  fetchLevel: vi.fn()
}))

import { fetchLevel } from '../services/api.js'

describe('chapter-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('按自然顺序排序目录和章节节点', async () => {
    fetchLevel.mockResolvedValue({
      path: '目录',
      nodes: [
        { type: 'chapter', name: '第 10 话', path_id: '目录/第 10 话' },
        { type: 'directory', name: '番外 2', path: '目录/番外 2' },
        { type: 'chapter', name: '第 2 话', path_id: '目录/第 2 话' },
        { type: 'directory', name: '番外 1', path: '目录/番外 1' }
      ]
    })

    const store = useChapterStore()
    await store.loadLevel('系列 A', '目录')

    expect(store.directories.map((node) => node.name)).toEqual(['番外 1', '番外 2'])
    expect(store.chapters.map((node) => node.name)).toEqual(['第 2 话', '第 10 话'])
    expect(store.currentPath).toBe('目录')
  })

  it('记录最近目录路径', () => {
    const store = useChapterStore()

    store.setLastDirectoryPath('系列 A', '目录/番外 1')

    expect(store.lastDirectoryPathBySeries['系列 A']).toBe('目录/番外 1')
  })
})
