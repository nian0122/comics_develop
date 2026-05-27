import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PreloadEngine } from './preload-engine'

describe('PreloadEngine', () => {
  let engine: PreloadEngine

  function mockFetch() {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response())
  }

  function withEngine(concurrency?: number): PreloadEngine {
    const e = new PreloadEngine(concurrency)
    e.setUrlResolver((i) => `/page/${i}`)
    return e
  }

  beforeEach(() => {
    mockFetch()
  })

  afterEach(() => {
    if (engine) engine.destroy()
    vi.restoreAllMocks()
  })

  it('setUrlResolver 注册后调用 onVisibleChange 不抛错', () => {
    engine = withEngine()
    engine.reset(10)
    engine.onVisibleChange(5, 5, 10)
  })

  it('reset 可重复调用重置状态', () => {
    engine = withEngine()
    engine.reset(50)
    engine.onVisibleChange(0, 5, 50)
    engine.reset(100)
    engine.onVisibleChange(0, 5, 100)
  })

  it('onVisibleChange 对可见范围发起加载', () => {
    engine = withEngine()
    engine.reset(20)
    engine.onVisibleChange(10, 12, 20)
  })

  it('快速多次 onVisibleChange 不泄漏定时器', () => {
    engine = withEngine()
    engine.reset(100)
    for (let i = 0; i < 20; i++) {
      engine.onVisibleChange(i, i + 3, 100)
    }
  })

  it('destroy 后调用方法是空操作', () => {
    engine = withEngine()
    engine.reset(50)
    engine.onVisibleChange(10, 15, 50)
    engine.destroy()
    engine.onVisibleChange(20, 25, 50)
  })

  it('未注册 urlResolver 时不抛错', () => {
    engine = new PreloadEngine()
    engine.reset(20)
    engine.onVisibleChange(5, 10, 20)
  })

  it('空章节 reset(0) 安全', () => {
    engine = withEngine()
    engine.reset(0)
    engine.onVisibleChange(0, 0, 0)
  })

  it('索引超出范围自动裁剪', () => {
    engine = withEngine()
    engine.reset(5)
    engine.onVisibleChange(3, 10, 5)
  })

  it('并发数不超过构造函数传入的 maxConcurrent', () => {
    engine = withEngine(2)
    engine.reset(30)
    engine.onVisibleChange(5, 5, 30)
  })
})
