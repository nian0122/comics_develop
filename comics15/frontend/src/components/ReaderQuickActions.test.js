import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReaderQuickActions from './ReaderQuickActions.vue'

describe('ReaderQuickActions', () => {
  it('默认只显示 ⋯ 并可展开菜单', async () => {
    const wrapper = mount(ReaderQuickActions, {
      props: { previousDisabled: false, nextDisabled: false }
    })

    expect(wrapper.get('button[data-menu-toggle="true"]').text()).toBe('⋯')
    expect(wrapper.find('button[data-prev="true"]').exists()).toBe(false)

    await wrapper.get('button[data-menu-toggle="true"]').trigger('click')

    expect(wrapper.get('button[data-prev="true"]').isVisible()).toBe(true)
    expect(wrapper.get('button[data-next="true"]').isVisible()).toBe(true)
    expect(wrapper.get('button[data-back="true"]').isVisible()).toBe(true)
  })

  it('点击空白处收起菜单', async () => {
    const wrapper = mount(ReaderQuickActions, {
      props: { previousDisabled: false, nextDisabled: false }
    })

    await wrapper.get('button[data-menu-toggle="true"]').trigger('click')
    await wrapper.get('[data-reader-overlay="true"]').trigger('click')

    expect(wrapper.find('button[data-prev="true"]').exists()).toBe(false)
  })

  it('禁用态保留按钮并向外冒泡事件', async () => {
    const wrapper = mount(ReaderQuickActions, {
      props: { previousDisabled: true, nextDisabled: true }
    })

    await wrapper.get('button[data-menu-toggle="true"]').trigger('click')

    expect(wrapper.get('button[data-prev="true"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[data-next="true"]').attributes('disabled')).toBeDefined()

    await wrapper.get('button[data-back="true"]').trigger('click')

    expect(wrapper.emitted('back')).toBeTruthy()
  })
})
