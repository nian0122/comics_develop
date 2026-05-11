import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SeriesPage from './SeriesPage.vue'

const routerMock = vi.hoisted(() => ({
  push: vi.fn()
}))

vi.mock('../stores/series-store.js', () => ({
  useSeriesStore: vi.fn()
}))

vi.mock('../router/index.js', () => ({
  createSeriesRootRoute: vi.fn((series) => `/series/${series}/dir`)
}))

vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => routerMock)
}))

import { useSeriesStore } from '../stores/series-store.js'

describe('SeriesPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('显示加载中状态', () => {
    useSeriesStore.mockReturnValue({ series: [], loading: true, error: '', loadSeries: vi.fn() })

    const wrapper = mount(SeriesPage)

    expect(wrapper.text()).toContain('加载中')
  })

  it('显示错误和重试按钮', async () => {
    const loadSeries = vi.fn()
    useSeriesStore.mockReturnValue({ series: [], loading: false, error: '网络错误', loadSeries })

    const wrapper = mount(SeriesPage)

    await wrapper.get('button').trigger('click')

    expect(wrapper.text()).toContain('网络错误')
    expect(loadSeries).toHaveBeenCalled()
  })

  it('空列表时显示空状态', () => {
    useSeriesStore.mockReturnValue({ series: [], loading: false, error: '', loadSeries: vi.fn() })

    const wrapper = mount(SeriesPage)

    expect(wrapper.text()).toContain('暂无系列')
  })

  it('点击系列进入目录页', async () => {
    useSeriesStore.mockReturnValue({ series: ['系列 A'], loading: false, error: '', loadSeries: vi.fn() })

    const wrapper = mount(SeriesPage)

    await wrapper.get('button[data-series="系列 A"]').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/series/系列 A/dir')
  })
})
