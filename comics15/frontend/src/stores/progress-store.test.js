import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgressStore } from './progress-store.js'

vi.mock('../services/storage.js', () => ({
  readLocalStorageJson: vi.fn(),
  writeLocalStorageJson: vi.fn()
}))

import { readLocalStorageJson, writeLocalStorageJson } from '../services/storage.js'

describe('progress-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('保存并读取进度', () => {
    const store = useProgressStore()
    store.setProgress('系列 A', '目录/第 1 话', { currentPage: 3, totalPages: 10, completed: false })

    expect(writeLocalStorageJson).toHaveBeenCalledWith('comics:reading-progress', expect.any(Object))
    expect(store.getProgress('系列 A', '目录/第 1 话')).toEqual({ currentPage: 3, totalPages: 10, completed: false })
  })

  it('可以从存储恢复进度', () => {
    readLocalStorageJson.mockReturnValue({
      '系列 A::目录/第 1 话': { currentPage: 2, totalPages: 8, completed: true }
    })

    const store = useProgressStore()
    store.hydrate()

    expect(store.getProgress('系列 A', '目录/第 1 话')).toEqual({ currentPage: 2, totalPages: 8, completed: true })
  })
})
