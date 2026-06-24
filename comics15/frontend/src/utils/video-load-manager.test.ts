import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { videoLoadManager, VideoLoadManager } from './video-load-manager'

describe('VideoLoadManager', () => {
  let manager: VideoLoadManager
  let mockObserve: ReturnType<typeof vi.fn>
  let mockUnobserve: ReturnType<typeof vi.fn>
  let mockDisconnect: ReturnType<typeof vi.fn>
  let observerCallback: IntersectionObserverCallback | null
  let capturedRootMargin: string | undefined
  let capturedThreshold: number[] | undefined

  function stubIntersectionObserver() {
    mockObserve = vi.fn()
    mockUnobserve = vi.fn()
    mockDisconnect = vi.fn()
    capturedRootMargin = undefined
    capturedThreshold = undefined
    observerCallback = null

    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn().mockImplementation(
        (cb: IntersectionObserverCallback, options?: IntersectionObserverInit) => {
          observerCallback = cb
          capturedRootMargin = options?.rootMargin
          capturedThreshold = options?.threshold
            ? (Array.isArray(options.threshold) ? Array.from(options.threshold) : [options.threshold])
            : undefined
          return {
            observe: mockObserve,
            unobserve: mockUnobserve,
            disconnect: mockDisconnect,
            root: null,
            rootMargin: options?.rootMargin ?? '0px',
            scrollMargin: '',
            thresholds: [],
            takeRecords: () => [],
          } as IntersectionObserver
        },
      ),
    )
  }

  function createEntryDefaults() {
    return {
      boundingClientRect: { width: 100, height: 100 } as DOMRectReadOnly,
      intersectionRect: { width: 100, height: 100 } as DOMRectReadOnly,
      rootBounds: null,
      time: 0,
    }
  }

  function fireIntersection(
    items: { target: Element; isIntersecting: boolean }[],
  ) {
    if (!observerCallback) throw new Error('Observer not created')
    const defaults = createEntryDefaults()
    const entries = items.map((item) => {
      return {
        ...defaults,
        target: item.target,
        isIntersecting: item.isIntersecting,
        intersectionRatio: item.isIntersecting ? 1 : 0,
      } as IntersectionObserverEntry
    })
    observerCallback(entries, {} as IntersectionObserver)
  }

  function createVideo(): HTMLVideoElement {
    const video = document.createElement('video')
    vi.spyOn(video, 'load').mockImplementation(() => {})
    vi.spyOn(video, 'pause').mockImplementation(() => {})
    vi.spyOn(video, 'removeAttribute')
    return video
  }

  beforeEach(() => {
    manager = new VideoLoadManager()
    stubIntersectionObserver()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('register', () => {
    it('创建 IntersectionObserver 并开始观察容器', () => {
      const container = document.createElement('div')
      const video = createVideo()
      const onStatusChange = vi.fn()

      manager.register(container, video, {
        url: '/video/test.mp4',
        onStatusChange,
      })

      // Observer rootMargin must be '300px 0px'
      expect(capturedRootMargin).toBe('300px 0px')
      // Must call observe on the container element
      expect(mockObserve).toHaveBeenCalledWith(container)
    })

    it('首次 register 创建 observer，多次复用同一 observer', () => {
      const container1 = document.createElement('div')
      const container2 = document.createElement('div')
      const video1 = createVideo()
      const video2 = createVideo()

      manager.register(container1, video1, {
        url: '/video/1.mp4',
        onStatusChange: vi.fn(),
      })
      expect(mockObserve).toHaveBeenCalledTimes(1)

      manager.register(container2, video2, {
        url: '/video/2.mp4',
        onStatusChange: vi.fn(),
      })
      // Still the same observer, observe called again
      expect(mockObserve).toHaveBeenCalledTimes(2)
    })
  })

  describe('unregister and last-unregister lifecycle', () => {
    it('unregister 停止观察容器', () => {
      const container = document.createElement('div')
      const video = createVideo()

      manager.register(container, video, {
        url: '/video/test.mp4',
        onStatusChange: vi.fn(),
      })
      manager.unregister(container)

      expect(mockUnobserve).toHaveBeenCalledWith(container)
    })

    it('最后一个 unregister 销毁 IntersectionObserver', () => {
      const container1 = document.createElement('div')
      const container2 = document.createElement('div')
      const video1 = createVideo()
      const video2 = createVideo()

      manager.register(container1, video1, {
        url: '/video/1.mp4',
        onStatusChange: vi.fn(),
      })
      manager.register(container2, video2, {
        url: '/video/2.mp4',
        onStatusChange: vi.fn(),
      })

      // Unregister first — observer should still be alive
      manager.unregister(container1)
      expect(mockDisconnect).not.toHaveBeenCalled()

      // Unregister last — observer should be destroyed
      manager.unregister(container2)
      expect(mockDisconnect).toHaveBeenCalled()

      // Subsequent register should create a NEW observer
      const container3 = document.createElement('div')
      const video3 = createVideo()
      manager.register(container3, video3, {
        url: '/video/3.mp4',
        onStatusChange: vi.fn(),
      })
      // observe called on new observer
      expect(mockObserve).toHaveBeenCalledWith(container3)
    })
  })

  describe('entering viewport — idle to loading', () => {
    it('idle 状态的视频进入视口时转为 loading 并开始加载', () => {
      const container = document.createElement('div')
      const video = createVideo()
      const onStatusChange = vi.fn()

      manager.register(container, video, {
        url: '/video/test.mp4',
        onStatusChange,
      })

      // Simulate container entering viewport
      fireIntersection([{ target: container, isIntersecting: true }])

      // Should call onStatusChange with 'loading'
      expect(onStatusChange).toHaveBeenCalledWith('loading')
      // Should set preload to metadata
      expect(video.preload).toBe('metadata')
      // Should set src
      expect(video.src).toContain('/video/test.mp4')
      // Should call load()
      expect(video.load).toHaveBeenCalled()
    })
  })

  describe('loaded stays loaded on leave', () => {
    it('已加载的视频离开视口时保持加载状态', () => {
      const container = document.createElement('div')
      const video = createVideo()
      const onStatusChange = vi.fn()

      manager.register(container, video, {
        url: '/video/test.mp4',
        onStatusChange,
      })

      // Enter → start loading
      fireIntersection([{ target: container, isIntersecting: true }])

      // Simulate browser loadedmetadata event
      video.dispatchEvent(new Event('loadedmetadata'))

      // Leave — loaded video should NOT be aborted
      fireIntersection([{ target: container, isIntersecting: false }])

      // src should still be set
      expect(video.src).toContain('/video/test.mp4')
      // removeAttribute should NOT have been called (no abort)
      expect(video.removeAttribute).not.toHaveBeenCalled()
    })
  })

  describe('loading aborts on leave', () => {
    it('加载中的视频离开视口时中止加载回到 idle', () => {
      const container = document.createElement('div')
      const video = createVideo()
      const onStatusChange = vi.fn()

      manager.register(container, video, {
        url: '/video/test.mp4',
        onStatusChange,
      })

      // Enter → start loading
      fireIntersection([{ target: container, isIntersecting: true }])
      expect(onStatusChange).toHaveBeenCalledWith('loading')

      // Leave while still loading (before loadedmetadata)
      fireIntersection([{ target: container, isIntersecting: false }])

      // Should abort: remove src attribute and call load()
      expect(video.removeAttribute).toHaveBeenCalledWith('src')
      // onStatusChange should report 'idle'
      expect(onStatusChange).toHaveBeenCalledWith('idle')
    })
  })

  describe('error on video error event', () => {
    it('视频加载出错时状态变为 error', () => {
      const container = document.createElement('div')
      const video = createVideo()
      const onStatusChange = vi.fn()

      manager.register(container, video, {
        url: '/video/broken.mp4',
        onStatusChange,
      })

      // Enter → start loading (binds onerror handler)
      fireIntersection([{ target: container, isIntersecting: true }])

      // Simulate video load error
      video.dispatchEvent(new Event('error'))

      expect(onStatusChange).toHaveBeenCalledWith('error')
    })
  })

  describe('play mutex — one video at a time', () => {
    it('播放新视频时暂停之前的播放视频', () => {
      const container1 = document.createElement('div')
      const container2 = document.createElement('div')
      const video1 = createVideo()
      const video2 = createVideo()
      const s1 = vi.fn()
      const s2 = vi.fn()

      manager.register(container1, video1, {
        url: '/video/1.mp4',
        onStatusChange: s1,
      })
      manager.register(container2, video2, {
        url: '/video/2.mp4',
        onStatusChange: s2,
      })

      // Load both
      fireIntersection([{ target: container1, isIntersecting: true }])
      fireIntersection([{ target: container2, isIntersecting: true }])
      video1.dispatchEvent(new Event('loadedmetadata'))
      video2.dispatchEvent(new Event('loadedmetadata'))

      // Make video1 appear as not-paused by overriding the getter
      vi.spyOn(video1, 'paused', 'get').mockReturnValue(false)

      // Play video1
      manager.onPlay(video1)

      // Play video2 → should pause video1
      manager.onPlay(video2)

      expect(video1.pause).toHaveBeenCalled()
    })
  })

  describe('leave pauses playing video', () => {
    it('播放中的视频离开视口时暂停', () => {
      const container = document.createElement('div')
      const video = createVideo()

      manager.register(container, video, {
        url: '/video/test.mp4',
        onStatusChange: vi.fn(),
      })

      // Load
      fireIntersection([{ target: container, isIntersecting: true }])
      video.dispatchEvent(new Event('loadedmetadata'))

      // Mark as playing
      manager.onPlay(video)

      // Leave viewport → should pause
      fireIntersection([{ target: container, isIntersecting: false }])

      expect(video.pause).toHaveBeenCalled()
    })
  })

  describe('metadata load timeout', () => {
    it('超过 2 秒未 loadedmetadata 则超时变 error', () => {
      vi.useFakeTimers()

      const container = document.createElement('div')
      const video = createVideo()
      const onStatusChange = vi.fn()

      manager.register(container, video, {
        url: '/video/slow.mp4',
        onStatusChange,
      })

      // Enter → start loading
      fireIntersection([{ target: container, isIntersecting: true }])
      expect(onStatusChange).toHaveBeenCalledWith('loading')

      // Advance past 2 second timeout
      vi.advanceTimersByTime(2000)

      // Should report error
      expect(onStatusChange).toHaveBeenCalledWith('error')
      // Should abort (remove src)
      expect(video.removeAttribute).toHaveBeenCalledWith('src')

      vi.useRealTimers()
    })

    it('loadedmetadata 在超时前触发则清除定时器', () => {
      vi.useFakeTimers()

      const container = document.createElement('div')
      const video = createVideo()
      const onStatusChange = vi.fn()

      manager.register(container, video, {
        url: '/video/ok.mp4',
        onStatusChange,
      })

      fireIntersection([{ target: container, isIntersecting: true }])
      expect(onStatusChange).toHaveBeenCalledWith('loading')

      // loadedmetadata fires before timeout
      vi.advanceTimersByTime(1000)
      video.dispatchEvent(new Event('loadedmetadata'))

      // Advance past where timeout would fire
      vi.advanceTimersByTime(5000)

      // Should still be loaded, not error
      expect(onStatusChange).not.toHaveBeenCalledWith('error')
      expect(onStatusChange).toHaveBeenCalledWith('loaded')

      vi.useRealTimers()
    })
  })

  describe('videoLoadManager singleton', () => {
    it('videoLoadManager 是 VideoLoadManager 实例', () => {
      expect(videoLoadManager).toBeInstanceOf(VideoLoadManager)
    })
  })
})
