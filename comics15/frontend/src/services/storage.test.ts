import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readLocalStorageJson, writeLocalStorageJson } from './storage'

describe('storage', () => {
  const storage = new Map<string, string>()
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    storage.clear()
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    globalThis.localStorage = {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, String(value))
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key)
      }),
      length: 0,
      clear: vi.fn(),
      key: vi.fn()
    }
  })

  it('读写 JSON 数据', () => {
    writeLocalStorageJson('demo', { a: 1 })

    expect(readLocalStorageJson('demo', null)).toEqual({ a: 1 })
  })

  it('损坏 JSON 时返回默认值', () => {
    storage.set('broken', '{not-json')

    expect(readLocalStorageJson('broken', { ok: false })).toEqual({ ok: false })
    expect(warnSpy).toHaveBeenCalled()
  })
})
