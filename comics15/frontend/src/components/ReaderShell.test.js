import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReaderShell from './ReaderShell.vue'

describe('ReaderShell', () => {
  it('显示进度胶囊并点击打开跳页弹窗', async () => {
    const wrapper = mount(ReaderShell, {
      props: { currentPage: 2, totalPages: 10 }
    })

    expect(wrapper.text()).toContain('2 / 10')

    await wrapper.get('button[data-progress="true"]').trigger('click')

    expect(wrapper.text()).toContain('跳转页码')
  })

  it('确认跳页时触发事件', async () => {
    const wrapper = mount(ReaderShell, {
      props: { currentPage: 2, totalPages: 10 }
    })

    await wrapper.get('button[data-progress="true"]').trigger('click')
    await wrapper.get('input').setValue('5')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('jump')).toEqual([[5]])
  })

  it('上一话下一话按钮支持禁用态', async () => {
    const wrapper = mount(ReaderShell, {
      props: { currentPage: 2, totalPages: 10, previousDisabled: true, nextDisabled: true }
    })

    await wrapper.get('button[data-menu-toggle="true"]').trigger('click')

    expect(wrapper.get('button[data-prev="true"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[data-next="true"]').attributes('disabled')).toBeDefined()
  })

  it('默认只显示右下角快捷按钮，点击后展开菜单', async () => {
    const wrapper = mount(ReaderShell, {
      props: { currentPage: 2, totalPages: 10 }
    })

    expect(wrapper.get('button[data-menu-toggle="true"]').text()).toBe('⋯')
    expect(wrapper.find('button[data-prev="true"]').exists()).toBe(false)

    await wrapper.get('button[data-menu-toggle="true"]').trigger('click')

    expect(wrapper.get('button[data-prev="true"]').isVisible()).toBe(true)
    expect(wrapper.get('button[data-next="true"]').isVisible()).toBe(true)
    expect(wrapper.get('button[data-back="true"]').isVisible()).toBe(true)
  })

  it('点击空白处收起菜单，轻触阅读区重新显示快捷按钮', async () => {
    const wrapper = mount(ReaderShell, {
      props: { currentPage: 2, totalPages: 10 }
    })

    await wrapper.get('button[data-menu-toggle="true"]').trigger('click')
    await wrapper.get('[data-reader-overlay="true"]').trigger('click')

    expect(wrapper.find('button[data-prev="true"]').exists()).toBe(false)
    expect(wrapper.get('button[data-menu-toggle="true"]').isVisible()).toBe(true)
  })
})
