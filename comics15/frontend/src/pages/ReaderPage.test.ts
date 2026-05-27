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
    emits: ['update'],
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

import { useReaderStore as _useReaderStore } from '@/stores/reader-store'
const useReaderStore = _useReaderStore as unknown as ReturnType<typeof vi.fn>

describe('ReaderPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    routeMock.route.params.series = '系列 A'
    routeMock.route.params.pathMatch = '目录/第 1 话'
  })

  it('加载章节并渲染媒体流', () => {
    useReaderStore.mockReturnValue({
      mediaItems: [{ url: '/1.jpg', name: '1.jpg', type: 'image', fallbackUrl: null }, { url: '/2.jpg', name: '2.jpg', type: 'image', fallbackUrl: null }],
      currentPage: 1,
      totalPages: 2,
      previousChapterPath: '',
      nextChapterPath: '',
      loading: false,
      error: '',
      loadChapter: vi.fn(),
      setCurrentPage: vi.fn()
    })

    const wrapper = mount(ReaderPage)

    expect(wrapper.findAll('.media-item')).toHaveLength(2)
  })

  it('跳页时更新当前页', async () => {
    const setCurrentPage = vi.fn()
    useReaderStore.mockReturnValue({
      mediaItems: [{ url: '/1.jpg', name: '1.jpg', type: 'image', fallbackUrl: null }, { url: '/2.jpg', name: '2.jpg', type: 'image', fallbackUrl: null }],
      currentPage: 1,
      totalPages: 2,
      previousChapterPath: '',
      nextChapterPath: '',
      loading: false,
      error: '',
      loadChapter: vi.fn(),
      setCurrentPage
    })

    const wrapper = mount(ReaderPage)
    await wrapper.get('button[data-jump="true"]').trigger('click')

    expect(setCurrentPage).toHaveBeenCalledWith(2)
  })

  it('返回目录时跳回章节所在层级', async () => {
    useReaderStore.mockReturnValue({
      mediaItems: [],
      currentPage: 1,
      totalPages: 0,
      previousChapterPath: '',
      nextChapterPath: '',
      loading: false,
      error: '',
      loadChapter: vi.fn(),
      setCurrentPage: vi.fn()
    })

    const wrapper = mount(ReaderPage)
    await wrapper.get('button[data-back="true"]').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/dir/系列 A/目录/第 1 话')
  })

  it('点击上一话下一话时进入对应阅读路由', async () => {
    useReaderStore.mockReturnValue({
      mediaItems: [],
      currentPage: 1,
      totalPages: 0,
      previousChapterPath: '目录/第 0 话',
      nextChapterPath: '目录/第 2 话',
      loading: false,
      error: '',
      loadChapter: vi.fn(),
      setCurrentPage: vi.fn()
    })

    const wrapper = mount(ReaderPage)

    await wrapper.get('button[data-prev="true"]').trigger('click')
    await wrapper.get('button[data-next="true"]').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/read/系列 A/目录/第 0 话')
    expect(routerMock.push).toHaveBeenCalledWith('/read/系列 A/目录/第 2 话')
  })

  it('阅读路由变化时重新加载章节', async () => {
    const loadChapter = vi.fn()
    useReaderStore.mockReturnValue({
      mediaItems: [],
      currentPage: 1,
      totalPages: 0,
      previousChapterPath: '',
      nextChapterPath: '',
      loading: false,
      error: '',
      loadChapter,
      setCurrentPage: vi.fn()
    })

    mount(ReaderPage)

    expect(loadChapter).toHaveBeenCalledWith('系列 A', '目录/第 1 话')

    routeMock.route.params.pathMatch = '目录/第 2 话'
    await nextTick()

    expect(loadChapter).toHaveBeenCalledWith('系列 A', '目录/第 2 话')
  })
})
