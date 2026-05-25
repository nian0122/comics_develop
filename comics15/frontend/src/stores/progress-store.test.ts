import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgressStore } from './progress-store'

vi.mock('@/services/storage', () => ({
  readLocalStorageJson: vi.fn(),
  writeLocalStorageJson: vi.fn()
}))

import { readLocalStorageJson as _readLocalStorageJson, writeLocalStorageJson as _writeLocalStorageJson } from '@/services/storage'
const readLocalStorageJson = _readLocalStorageJson as unknown as ReturnType<typeof vi.fn>
const writeLocalStorageJson = _writeLocalStorageJson as unknown as ReturnType<typeof vi.fn>

describe('progress-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('保存并读取进度', () => {
    const store = useProgressStore()
    store.setProgress('系列 A', '目录/第 1 话', { currentPage: 3, completed: false })

    expect(writeLocalStorageJson).toHaveBeenCalledWith('comics:reading-progress', expect.any(Object))
    expect(store.getProgress('系列 A', '目录/第 1 话')).toEqual({ currentPage: 3, completed: false })
  })

  it('可以从存储恢复进度', () => {
    readLocalStorageJson.mockReturnValue({
      '系列 A::目录/第 1 话': { currentPage: 2, completed: true }
    })

    const store = useProgressStore()
    store.hydrate()

    expect(store.getProgress('系列 A', '目录/第 1 话')).toEqual({ currentPage: 2, completed: true })
  })
})
