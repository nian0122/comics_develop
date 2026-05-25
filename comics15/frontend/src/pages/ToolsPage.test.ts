import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ToolsPage from './ToolsPage.vue'

vi.mock('@/stores/tools-store', () => ({
  useToolsStore: vi.fn()
}))

import { useToolsStore as _useToolsStore } from '@/stores/tools-store'
const useToolsStore = _useToolsStore as unknown as ReturnType<typeof vi.fn>

describe('ToolsPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('组合工具列表、配置和执行状态', () => {
    useToolsStore.mockReturnValue({
      tools: [{ name: 'image-optimizer', displayName: '图片优化器', params: [] }],
      executions: {},
      executionStatus: null,
      loadTools: vi.fn(),
      startExecution: vi.fn()
    })

    const wrapper = mount(ToolsPage)

    expect(wrapper.text()).toContain('工具管理')
    expect(wrapper.text()).toContain('图片优化器')
    expect(wrapper.text()).toContain('当前执行')
  })

  it('展示后端真实执行字段', () => {
    useToolsStore.mockReturnValue({
      tools: [],
      executions: {},
      executionStatus: {
        executionId: 'exec-1',
        status: 'RUNNING',
        processedCount: 10,
        skippedCount: 2,
        errorCount: 1,
        durationSeconds: 8,
        finished: false,
        logs: ['开始执行']
      },
      loadTools: vi.fn(),
      startExecution: vi.fn()
    })

    const wrapper = mount(ToolsPage)

    expect(wrapper.text()).toContain('已处理：10')
    expect(wrapper.text()).toContain('跳过：2')
    expect(wrapper.text()).toContain('错误：1')
    expect(wrapper.text()).toContain('耗时：8 秒')
    expect(wrapper.text()).toContain('开始执行')
  })
})
