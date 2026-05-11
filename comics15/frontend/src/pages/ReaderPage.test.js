import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReaderPage from './ReaderPage.vue'

const routerMock = vi.hoisted(() => ({ push: vi.fn() }))
const routeMock = vi.hoisted(() => ({ route: null }))

vi.mock('vue-router', async () => {
  const vue = await vi.importActual('vue')
  routeMock.route = vue.reactive({
    params: vue.reactive({ series: '系列 A', pathMatch: '目录/第 1 话' })
  })

  return {
    useRoute: vi.fn(() => routeMock.route),
    useRouter: vi.fn(() => routerMock)
  }
})

vi.mock('../stores/reader-store.js', () => ({
  useReaderStore: vi.fn()
}))

vi.mock('../router/index.js', () => ({
  createParentDirectoryRoute: vi.fn((series, path) => `/dir/${series}/${path}`),
  createSeriesReadRoute: vi.fn((series, path) => `/read/${series}/${path}`)
}))

vi.mock('../components/ReaderMediaItem.vue', () => ({
  default: {
    props: ['media', 'index', 'active'],
    template: '<article class="media-item" :data-active="active" :data-page-index="index">{{ index }}</article>'
  }
}))

vi.mock('../components/ReaderShell.vue', () => ({
  default: {
    props: ['currentPage', 'totalPages', 'previousDisabled', 'nextDisabled'],
    emits: ['jump', 'back', 'previous', 'next'],
    template: '<nav><button data-jump="true" @click="$emit(\'jump\', 2)">jump</button><button data-back="true" @click="$emit(\'back\')">back</button><button data-prev="true" @click="$emit(\'previous\')">prev</button><button data-next="true" @click="$emit(\'next\')">next</button></nav>'
  }
}))

import { useReaderStore } from '../stores/reader-store.js'

describe('ReaderPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    routeMock.route.params.series = '系列 A'
    routeMock.route.params.pathMatch = '目录/第 1 话'
  })

  it('加载章节并渲染媒体流', () => {
    useReaderStore.mockReturnValue({
      mediaItems: [{ url: '/1.jpg' }, { url: '/2.jpg' }],
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
      mediaItems: [{ url: '/1.jpg' }, { url: '/2.jpg' }],
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

  it('只激活当前页附近窗口', () => {
    useReaderStore.mockReturnValue({
      mediaItems: [{ url: '/1.jpg' }, { url: '/2.jpg' }, { url: '/3.jpg' }, { url: '/4.jpg' }, { url: '/5.jpg' }],
      currentPage: 1,
      totalPages: 5,
      previousChapterPath: '',
      nextChapterPath: '',
      loading: false,
      error: '',
      loadChapter: vi.fn(),
      setCurrentPage: vi.fn()
    })

    const wrapper = mount(ReaderPage)
    const states = wrapper.findAll('.media-item').map((item) => item.attributes('data-active'))

    expect(states).toEqual(['true', 'true', 'true', 'false', 'false'])
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

  it('阅读路由变化时清理旧页面跟踪状态', async () => {
    const loadChapter = vi.fn()
    useReaderStore.mockReturnValue({
      mediaItems: [{ url: '/1.jpg' }, { url: '/2.jpg' }],
      currentPage: 1,
      totalPages: 2,
      previousChapterPath: '',
      nextChapterPath: '',
      loading: false,
      error: '',
      loadChapter,
      setCurrentPage: vi.fn()
    })

    const wrapper = mount(ReaderPage)

    routeMock.route.params.pathMatch = '目录/第 2 话'
    await nextTick()
    await nextTick()
    await nextTick()

    expect(loadChapter).toHaveBeenCalledWith('系列 A', '目录/第 2 话')
  })
})
