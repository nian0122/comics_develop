import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReaderPage from './ReaderPage.vue'

const routerMock = vi.hoisted(() => ({ push: vi.fn() }))
const routeMock = vi.hoisted(() => ({
  route: null as unknown as { params: { series: string; pathMatch: string | string[] } }
}))

vi.mock('vue-router', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  routeMock.route = vue.reactive({
    params: vue.reactive({ series: '系列 A', pathMatch: '目录/第 1 话' })
  }) as unknown as { params: { series: string; pathMatch: string | string[] } }

  return {
    useRoute: vi.fn(() => routeMock.route),
    useRouter: vi.fn(() => routerMock)
  }
})

vi.mock('@/stores/reader-store', () => ({
  useReaderStore: vi.fn()
}))

vi.mock('@/stores/video-store', () => ({
  useVideoStore: vi.fn()
}))

vi.mock('@/services/api', () => ({
  fetchChapter: vi.fn()
}))

vi.mock('@/router', () => ({
  createParentDirectoryRoute: vi.fn((series: string, path: string) => `/dir/${series}/${path}`),
  createSeriesReadRoute: vi.fn((series: string, path: string) => `/read/${series}/${path}`)
}))

vi.mock('../components/ReaderMediaItem.vue', () => ({
  default: {
    props: ['url', 'fallbackUrl', 'alt', 'kind'],
    template: '<article class="media-item">{{ alt }}</article>'
  }
}))

vi.mock('../components/ReaderShell.vue', () => ({
  default: {
    props: ['currentPage', 'totalPages', 'previousDisabled', 'nextDisabled'],
    emits: ['jump', 'back', 'previous', 'next'],
    template: '<nav><button data-jump="true" @click="$emit(\'jump\', 2)">jump</button><button data-back="true" @click="$emit(\'back\')">back</button><button data-prev="true" @click="$emit(\'previous\')">prev</button><button data-next="true" @click="$emit(\'next\')">next</button></nav>'
  }
}))

vi.mock('vue-virtual-scroller', () => ({
  DynamicScroller: {
    props: ['items', 'keyField', 'minItemSize'],
    emits: ['visible'],
    methods: {
      scrollToItem() {}
    },
    template: `<div class="dynamic-scroller">
      <slot v-for="(it, idx) in items" :key="idx" :item="it" :index="idx" :active="true" :itemWithSize="{ item: it, id: idx, size: undefined }" />
    </div>`
  },
  DynamicScrollerItem: {
    props: ['item', 'active', 'dataIndex'],
    template: '<div class="scroller-item"><slot /></div>'
  }
}))

vi.mock('vue-virtual-scroller/dist/vue-virtual-scroller.css', () => ({}))

vi.mock('@/utils/preload-engine', () => ({
  preloadEngine: {
    setUrlResolver: vi.fn(),
    reset: vi.fn(),
    onVisibleChange: vi.fn(),
    destroy: vi.fn()
  }
}))

globalThis.IntersectionObserver = vi.fn().mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}) as unknown as typeof IntersectionObserver

import { useReaderStore as _useReaderStore } from '@/stores/reader-store'
import { useVideoStore as _useVideoStore } from '@/stores/video-store'
import { fetchChapter as _fetchChapter } from '@/services/api'
const useReaderStore = _useReaderStore as unknown as ReturnType<typeof vi.fn>
const useVideoStore = _useVideoStore as unknown as ReturnType<typeof vi.fn>
const fetchChapter = _fetchChapter as unknown as ReturnType<typeof vi.fn>

function mockReaderStore(overrides = {}) {
  return {
    imageItems: [],
    currentPage: 1,
    totalPages: 0,
    previousChapterPath: '',
    nextChapterPath: '',
    loading: false,
    error: '',
    loadChapter: vi.fn(),
    setImages: vi.fn(),
    setCurrentPage: vi.fn(),
    ...overrides
  }
}

function mockVideoStore(overrides = {}) {
  return {
    videos: [],
    total: 0,
    loading: false,
    error: '',
    setVideos: vi.fn(),
    clear: vi.fn(),
    ...overrides
  }
}

function mockFetchChapterResponse(files: Array<{
  name: string; type: 'image' | 'video'; url: string; fallbackUrl: string | null
}>) {
  return { path: 'test', files, total: files.length }
}

describe('ReaderPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    routeMock.route.params.series = '系列 A'
    routeMock.route.params.pathMatch = '目录/第 1 话'

    fetchChapter.mockResolvedValue(mockFetchChapterResponse([
      { name: '01.jpg', type: 'image', url: '/hq/01.jpg', fallbackUrl: '/lq/01.jpg' },
      { name: '02.mp4', type: 'video', url: '/video/02.mp4', fallbackUrl: null },
      { name: '03.jpg', type: 'image', url: '/hq/03.jpg', fallbackUrl: '/lq/03.jpg' },
    ]))
  })

  it('加载章节并渲染媒体流（图片+视频合并）', async () => {
    useReaderStore.mockReturnValue(mockReaderStore({
      imageItems: [
        { name: '01.jpg', type: 'image', url: '/hq/01.jpg', fallbackUrl: '/lq/01.jpg' },
        { name: '03.jpg', type: 'image', url: '/hq/03.jpg', fallbackUrl: '/lq/03.jpg' },
      ]
    }))
    useVideoStore.mockReturnValue(mockVideoStore({
      videos: [
        { name: '02.mp4', type: 'video', url: '/video/02.mp4', fallbackUrl: null },
      ]
    }))

    const wrapper = mount(ReaderPage)
    await nextTick()
    await nextTick()

    const mediaItems = wrapper.findAll('.media-item')
    // 3 total items: 2 images + 1 video, merged and sorted
    expect(mediaItems).toHaveLength(3)
    expect(mediaItems[0].text()).toBe('01.jpg')
    expect(mediaItems[1].text()).toBe('02.mp4')
    expect(mediaItems[2].text()).toBe('03.jpg')
  })

  it('fetchChapter 被调用一次，数据分发到两个 store', async () => {
    const setImages = vi.fn()
    const setVideos = vi.fn()

    useReaderStore.mockReturnValue(mockReaderStore({ setImages }))
    useVideoStore.mockReturnValue(mockVideoStore({ setVideos }))

    mount(ReaderPage)
    await nextTick()
    await nextTick()

    expect(fetchChapter).toHaveBeenCalledTimes(1)
    expect(fetchChapter).toHaveBeenCalledWith('系列 A', '目录/第 1 话')
    expect(setImages).toHaveBeenCalled()
    const imageCall = setImages.mock.calls[0][0]
    expect(imageCall).toHaveLength(2) // only images
    expect(setVideos).toHaveBeenCalled()
    const videoCall = setVideos.mock.calls[0][0]
    expect(videoCall).toHaveLength(1) // only videos
  })

  it('跳页时更新当前页', async () => {
    const setCurrentPage = vi.fn()
    useReaderStore.mockReturnValue(mockReaderStore({
      imageItems: [
        { name: '01.jpg', type: 'image', url: '/hq/01.jpg', fallbackUrl: '/lq/01.jpg' },
      ],
      setCurrentPage,
    }))
    useVideoStore.mockReturnValue(mockVideoStore())

    const wrapper = mount(ReaderPage)
    await nextTick()

    await wrapper.get('button[data-jump="true"]').trigger('click')

    expect(setCurrentPage).toHaveBeenCalledWith(2)
  })

  it('返回目录时跳回章节所在层级', async () => {
    useReaderStore.mockReturnValue(mockReaderStore())
    useVideoStore.mockReturnValue(mockVideoStore())

    const wrapper = mount(ReaderPage)
    await nextTick()

    await wrapper.get('button[data-back="true"]').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/dir/系列 A/目录/第 1 话')
  })

  it('点击上一话下一话时进入对应阅读路由', async () => {
    useReaderStore.mockReturnValue(mockReaderStore({
      previousChapterPath: '目录/第 0 话',
      nextChapterPath: '目录/第 2 话',
    }))
    useVideoStore.mockReturnValue(mockVideoStore())

    const wrapper = mount(ReaderPage)
    await nextTick()

    await wrapper.get('button[data-prev="true"]').trigger('click')
    await wrapper.get('button[data-next="true"]').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/read/系列 A/目录/第 0 话')
    expect(routerMock.push).toHaveBeenCalledWith('/read/系列 A/目录/第 2 话')
  })

  it('阅读路由变化时重新加载章节', async () => {
    useReaderStore.mockReturnValue(mockReaderStore())
    useVideoStore.mockReturnValue(mockVideoStore())

    mount(ReaderPage)
    await nextTick()
    await nextTick()

    // Wait for initial load, then clear to isolate route-change effect
    fetchChapter.mockClear()

    routeMock.route.params.pathMatch = '目录/第 2 话'
    await nextTick()
    await nextTick()

    // Verify fetchChapter was called with the new path
    const calls = fetchChapter.mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall).toEqual(['系列 A', '目录/第 2 话'])
  })
})
