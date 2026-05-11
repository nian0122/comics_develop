import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { observeLazyImage } from './lazy-image.js'

describe('observeLazyImage', () => {
  let observerInstance

  beforeEach(() => {
    globalThis.IntersectionObserver = vi.fn((callback, options) => {
      observerInstance = {
        callback,
        options,
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn()
      }
      return observerInstance
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('图片进入视口附近时触发加载回调', () => {
    const element = document.createElement('img')
    const onLoad = vi.fn()

    observeLazyImage(element, onLoad)
    observerInstance.callback([{ isIntersecting: true, target: element }])

    expect(onLoad).toHaveBeenCalledWith(element)
    expect(observerInstance.unobserve).toHaveBeenCalledWith(element)
  })

  it('可以清理观察器', () => {
    const element = document.createElement('img')
    const cleanup = observeLazyImage(element, vi.fn())

    cleanup()

    expect(observerInstance.disconnect).toHaveBeenCalled()
  })
})
