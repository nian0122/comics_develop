import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DirectoryPage from './DirectoryPage.vue'

const routerMock = vi.hoisted(() => ({
  push: vi.fn()
}))

const routeMock = vi.hoisted(() => ({
  route: null as unknown as { params: { series: string; pathMatch: string | string[] } }
}))

vi.mock('@/stores/chapter-store', () => ({
  useChapterStore: vi.fn()
}))

vi.mock('../components/ChapterCard.vue', () => ({
  default: {
    name: 'ChapterCard',
    props: ['chapter', 'active'],
    emits: ['select'],
    template: '<button class="chapter-card" @click="$emit(\'select\', chapter)">{{ chapter.name }} {{ chapter.progressText }}</button>'
  }
}))

vi.mock('@/router', () => ({
  createSeriesDirectoryRoute: vi.fn((series: string, path: string) => `/dir/${series}/${path}`),
  createParentDirectoryRoute: vi.fn((series: string, path: string) => `/back/${series}/${path}`),
  createSeriesReadRoute: vi.fn((series: string, path: string) => `/read/${series}/${path}`)
}))

vi.mock('vue-router', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  routeMock.route = vue.reactive({
    params: vue.reactive({
      series: '系列 A',
      pathMatch: '目录'
    })
  }) as unknown as { params: { series: string; pathMatch: string | string[] } }

  return {
    useRoute: vi.fn(() => routeMock.route),
    useRouter: vi.fn(() => routerMock)
  }
})

import { useChapterStore as _useChapterStore } from '@/stores/chapter-store'
const useChapterStore = _useChapterStore as unknown as ReturnType<typeof vi.fn>

describe('DirectoryPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    routeMock.route.params.series = '系列 A'
    routeMock.route.params.pathMatch = '目录'
  })

  it('显示目录节点和返回上一级按钮', () => {
    useChapterStore.mockReturnValue({
      seriesName: '系列 A',
      currentPath: '目录',
      nodes: [
        { type: 'directory', name: '番外', path: '目录/番外' },
        { type: 'chapter', name: '第 1 话', path_id: '目录/第 1 话', total_files: 10 }
      ],
      directories: [{ name: '番外', path: '目录/番外' }],
      chapters: [{ name: '第 1 话', path_id: '目录/第 1 话', total_files: 10 }],
      loading: false,
      error: '',
      loadLevel: vi.fn(),
      lastDirectoryPathBySeries: { '系列 A': '目录/番外' },
      lastReadChapterPathBySeries: { '系列 A': '目录/第 1 话' },
      setLastDirectoryPath: vi.fn(),
      setLastReadChapterPath: vi.fn()
    })

    const wrapper = mount(DirectoryPage)

    expect(wrapper.text()).toContain('番外')
    expect(wrapper.text()).toContain('第 1 话')
    expect(wrapper.text()).toContain('未读')
    expect(wrapper.text()).toContain('← 返回')
  })

  it('点击目录节点会进入下一层', async () => {
    const loadLevel = vi.fn()
    useChapterStore.mockReturnValue({
      seriesName: '系列 A',
      currentPath: '目录',
      nodes: [{ type: 'directory', name: '番外', path: '目录/番外' }],
      directories: [{ name: '番外', path: '目录/番外' }],
      chapters: [],
      loading: false,
      error: '',
      loadLevel,
      lastDirectoryPathBySeries: {},
      lastReadChapterPathBySeries: {},
      setLastDirectoryPath: vi.fn(),
      setLastReadChapterPath: vi.fn()
    })

    const wrapper = mount(DirectoryPage)

    const buttons = wrapper.findAll('button')
    const dirButton = buttons.find(b => b.text().includes('番外'))
    await dirButton!.trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/dir/系列 A/目录/番外')
    expect(loadLevel).toHaveBeenCalledWith('系列 A', '目录')
  })

  it('点击章节卡片会进入阅读页', async () => {
    useChapterStore.mockReturnValue({
      seriesName: '系列 A',
      currentPath: '目录',
      nodes: [{ type: 'chapter', name: '第 1 话', path_id: '目录/第 1 话', total_files: 10 }],
      directories: [],
      chapters: [{ name: '第 1 话', path_id: '目录/第 1 话', total_files: 10 }],
      loading: false,
      error: '',
      loadLevel: vi.fn(),
      lastDirectoryPathBySeries: {},
      lastReadChapterPathBySeries: {},
      setLastDirectoryPath: vi.fn(),
      setLastReadChapterPath: vi.fn()
    })

    const wrapper = mount(DirectoryPage)

    await wrapper.get('.chapter-card').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/read/系列 A/目录/第 1 话')
  })

  it('路由变化时会重新加载新的层级', async () => {
    const loadLevel = vi.fn()
    useChapterStore.mockReturnValue({
      seriesName: '系列 A',
      currentPath: '目录',
      nodes: [],
      directories: [],
      chapters: [],
      loading: false,
      error: '',
      loadLevel,
      lastDirectoryPathBySeries: {},
      lastReadChapterPathBySeries: {},
      setLastDirectoryPath: vi.fn(),
      setLastReadChapterPath: vi.fn()
    })

    mount(DirectoryPage)

    expect(loadLevel).toHaveBeenCalledWith('系列 A', '目录')

    routeMock.route.params.pathMatch = '目录/番外'
    routeMock.route.params.series = '系列 A'
    await nextTick()

    expect(loadLevel).toHaveBeenCalledWith('系列 A', '目录/番外')
  })
})
