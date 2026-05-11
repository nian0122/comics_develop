import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readLocalStorageJson, writeLocalStorageJson } from './storage.js'

describe('storage', () => {
  const storage = new Map()
  let warnSpy

  beforeEach(() => {
    storage.clear()
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    globalThis.localStorage = {
      getItem: vi.fn((key) => storage.get(key) ?? null),
      setItem: vi.fn((key, value) => {
        storage.set(key, String(value))
      }),
      removeItem: vi.fn((key) => {
        storage.delete(key)
      })
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
