import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ReaderVideoItem from './ReaderVideoItem.vue'

// Mock VideoLoadManager
const mockRegister = vi.fn()
const mockUnregister = vi.fn()
const mockOnPlay = vi.fn()

vi.mock('@/utils/video-load-manager', () => ({
  videoLoadManager: {
    register: (...args: unknown[]) => mockRegister(...args),
    unregister: (...args: unknown[]) => mockUnregister(...args),
    onPlay: (...args: unknown[]) => mockOnPlay(...args),
  },
}))

// Mock IntersectionObserver on window
beforeEach(() => {
  window.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof IntersectionObserver
  vi.clearAllMocks()
})

describe('ReaderVideoItem', () => {
  // Test 1: mounted → register 被调用
  it('should call register on mount', () => {
    mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    expect(mockRegister).toHaveBeenCalledTimes(1)
    const [videoEl, containerEl, config] = mockRegister.mock.calls[0] as [
      HTMLVideoElement,
      HTMLDivElement,
      { url: string; onStatusChange: (s: string) => void },
    ]
    expect(videoEl).toBeInstanceOf(HTMLVideoElement)
    expect(containerEl).toBeInstanceOf(HTMLDivElement)
    expect(config.url).toBe('/video/test.mp4')
  })

  // Test 2: unmounted → unregister 被调用
  it('should call unregister on unmount', () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    wrapper.unmount()

    expect(mockUnregister).toHaveBeenCalledTimes(1)
  })

  // Test 3: 初始状态 idle → video 不可见
  it('should hide video initially (status idle)', () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    const video = wrapper.find('video')
    expect(video.classes()).toContain('invisible')
  })

  // Test 4: onStatusChange('loading') → 骨架屏可见
  it('should show loading skeleton when status is loading', async () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    const config = mockRegister.mock.calls[0][2] as {
      url: string
      onStatusChange: (s: string) => void
    }
    config.onStatusChange('loading')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('加载中')
  })

  // Test 5: onStatusChange('error') → 错误占位
  it('should show error placeholder when status is error', async () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    const config = mockRegister.mock.calls[0][2] as {
      url: string
      onStatusChange: (s: string) => void
    }
    config.onStatusChange('error')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('视频加载失败')
  })

  // Test 6: onStatusChange('loaded') → video 可见
  it('should show video when status is loaded', async () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    const config = mockRegister.mock.calls[0][2] as {
      url: string
      onStatusChange: (s: string) => void
    }
    config.onStatusChange('loaded')
    await wrapper.vm.$nextTick()

    const video = wrapper.find('video')
    expect(video.classes()).not.toContain('invisible')
  })

  // Test 7: @play → onPlay 被调用
  it('should call onPlay when video plays', async () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    const video = wrapper.find('video')
    await video.trigger('play')

    expect(mockOnPlay).toHaveBeenCalledTimes(1)
  })

  // Test 8: url 变更 → re-register
  it('should re-register when url changes (DynamicScroller recycling)', async () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/old.mp4', alt: 'test video' },
    })

    mockRegister.mockClear()

    await wrapper.setProps({ url: '/video/new.mp4' })

    // 先注销旧 URL
    expect(mockUnregister).toHaveBeenCalledTimes(1)
    // 再注册新 URL
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const config = mockRegister.mock.calls[0][2] as { url: string }
    expect(config.url).toBe('/video/new.mp4')
  })

  // Test 9: video 元素 preload="none"（不自动预加载）
  it('video element should have preload="none"', () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    const video = wrapper.find('video')
    expect(video.attributes('preload')).toBe('none')
  })
})
