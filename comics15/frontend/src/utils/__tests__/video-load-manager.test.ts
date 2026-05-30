/**
 * VideoLoadManager unit tests
 * Uses jsdom environment with mocked IntersectionObserver for precise visibility control.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockObserve, mockUnobserve, mockDisconnect, setObserverCallback, fireObserver, resetObserver } = vi.hoisted(() => {
  let observerCallback: IntersectionObserverCallback | null = null
  const mockObserve = vi.fn()
  const mockUnobserve = vi.fn()
  const mockDisconnect = vi.fn()
  return {
    mockObserve,
    mockUnobserve,
    mockDisconnect,
    setObserverCallback: (cb: IntersectionObserverCallback) => { observerCallback = cb },
    fireObserver: (entries: Array<{ target: Element; isIntersecting: boolean }>) => {
      if (!observerCallback) throw new Error('Observer not initialized')
      observerCallback(
        entries.map(e => ({
          ...e,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: e.isIntersecting ? 1 : 0,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        })),
        {} as IntersectionObserver,
      )
    },
    resetObserver: () => { observerCallback = null },
  }
})

globalThis.IntersectionObserver = vi.fn((callback: IntersectionObserverCallback) => {
  setObserverCallback(callback)
  return {
    observe: mockObserve,
    unobserve: mockUnobserve,
    disconnect: mockDisconnect,
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: () => [],
  } as unknown as IntersectionObserver
})

import { VideoLoadManager } from '../video-load-manager'

function createVideoElement(): HTMLVideoElement {
  const el = document.createElement('video')
  vi.spyOn(el, 'load')
  return el
}

describe('VideoLoadManager', () => {
  let manager: VideoLoadManager

  beforeEach(() => {
    vi.clearAllMocks()
    resetObserver()
    manager = new VideoLoadManager()
  })

  describe('register / unregister', () => {
    it('observes container after register', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      manager.register(video, container, {
        url: '/video/test.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      expect(mockObserve).toHaveBeenCalledWith(container)
    })

    it('unobserves container after unregister', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      manager.register(video, container, {
        url: '/video/test.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      manager.unregister(video)
      expect(mockUnobserve).toHaveBeenCalledWith(container)
    })
  })

  describe('slot scheduling', () => {
    it('first video entering viewport starts preloading (preload=metadata + load)', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      manager.register(video, container, {
        url: '/video/first.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      fireObserver([{ target: container, isIntersecting: true }])
      expect(video.preload).toBe('metadata')
      expect(video.src).toContain('/video/first.mp4')
      expect(video.load).toHaveBeenCalled()
    })

    it('second video entering viewport queues, does not take slot', () => {
      const video1 = createVideoElement()
      const container1 = document.createElement('div')
      const video2 = createVideoElement()
      const container2 = document.createElement('div')
      manager.register(video1, container1, {
        url: '/video/first.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      manager.register(video2, container2, {
        url: '/video/second.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      fireObserver([{ target: container1, isIntersecting: true }])
      expect(video1.src).toContain('first.mp4')
      fireObserver([{ target: container2, isIntersecting: true }])
      expect(video2.src).toBe('')
    })

    it('queued video starts preloading when active video leaves viewport', () => {
      const video1 = createVideoElement()
      const container1 = document.createElement('div')
      const video2 = createVideoElement()
      const container2 = document.createElement('div')
      manager.register(video1, container1, {
        url: '/video/first.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      manager.register(video2, container2, {
        url: '/video/second.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      fireObserver([{ target: container1, isIntersecting: true }])
      fireObserver([{ target: container2, isIntersecting: true }])
      fireObserver([{ target: container1, isIntersecting: false }])
      expect(video2.src).toContain('second.mp4')
      expect(video1.src).toBe('')
    })
  })

  describe('abort behavior', () => {
    it('clears video.src and calls load() when leaving viewport', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      manager.register(video, container, {
        url: '/video/test.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      fireObserver([{ target: container, isIntersecting: true }])
      expect(video.src).not.toBe('')
      vi.mocked(video.load).mockClear()
      fireObserver([{ target: container, isIntersecting: false }])
      expect(video.src).toBe('')
      expect(video.load).toHaveBeenCalled()
    })
  })

  describe('playback mutual exclusion', () => {
    it('pauses currently playing video when new video plays', () => {
      const video1 = createVideoElement()
      const container1 = document.createElement('div')
      const video2 = createVideoElement()
      const container2 = document.createElement('div')
      manager.register(video1, container1, {
        url: '/video/a.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      manager.register(video2, container2, {
        url: '/video/b.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      Object.defineProperty(video1, 'paused', { value: false, writable: true })
      vi.spyOn(video1, 'pause')
      manager.onUserPlayed(video1)
      Object.defineProperty(video2, 'paused', { value: false, writable: true })
      manager.onUserPlayed(video2)
      expect(video1.pause).toHaveBeenCalled()
    })

    it('pauses playing video when it leaves viewport', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      vi.spyOn(video, 'pause')
      Object.defineProperty(video, 'paused', { value: false, writable: true })
      manager.register(video, container, {
        url: '/video/test.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      fireObserver([{ target: container, isIntersecting: true }])
      manager.onUserPlayed(video)
      fireObserver([{ target: container, isIntersecting: false }])
      expect(video.pause).toHaveBeenCalled()
    })
  })

  describe('callbacks', () => {
    it('fires onLoaded callback on loadedmetadata event', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      const onLoaded = vi.fn()
      manager.register(video, container, {
        url: '/video/test.mp4',
        onLoaded,
        onError: () => {},
        onAborted: () => {},
      })
      fireObserver([{ target: container, isIntersecting: true }])
      video.dispatchEvent(new Event('loadedmetadata'))
      expect(onLoaded).toHaveBeenCalled()
    })

    it('fires onError callback with fallback function on error event', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      const onError = vi.fn()
      manager.register(video, container, {
        url: '/video/test.mp4',
        onLoaded: () => {},
        onError,
        onAborted: () => {},
      })
      fireObserver([{ target: container, isIntersecting: true }])
      video.dispatchEvent(new Event('error'))
      expect(onError).toHaveBeenCalledWith(expect.any(Function))
    })

    it('onError fallback retries loading with new url', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      let fb: (() => void) | null = null
      manager.register(video, container, {
        url: '/video/broken.mp4',
        onLoaded: () => {},
        onError: (f) => { fb = f },
        onAborted: () => {},
      })
      fireObserver([{ target: container, isIntersecting: true }])
      video.dispatchEvent(new Event('error'))
      // Clear load spy to verify re-load
      vi.mocked(video.load).mockClear()
      video.src = '/video/fallback.mp4'
      fb!()
      // After fallback, video.load() is called by startPreload
      expect(video.load).toHaveBeenCalled()
    })
  })

  describe('onUserPlayed', () => {
    it('releases preload slot when user plays the active preload video', () => {
      const video1 = createVideoElement()
      const container1 = document.createElement('div')
      const video2 = createVideoElement()
      const container2 = document.createElement('div')
      manager.register(video1, container1, {
        url: '/video/first.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      manager.register(video2, container2, {
        url: '/video/second.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      fireObserver([{ target: container1, isIntersecting: true }])
      fireObserver([{ target: container2, isIntersecting: true }])
      // video2 is queued, video1 is active preload
      expect(video2.src).toBe('')
      // User plays video1 → slot released, video2 dequeued
      manager.onUserPlayed(video1)
      expect(video2.src).toContain('second.mp4')
    })
  })
})
