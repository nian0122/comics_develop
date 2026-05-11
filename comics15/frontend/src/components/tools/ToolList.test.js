import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ToolList from './ToolList.vue'

describe('ToolList', () => {
  it('显示工具列表并触发选中事件', async () => {
    const wrapper = mount(ToolList, {
      props: {
        tools: [
          { name: 'image-optimizer', displayName: '图片优化器', description: '生成 LQ 图片' }
        ]
      }
    })

    expect(wrapper.text()).toContain('图片优化器')

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[{ name: 'image-optimizer', displayName: '图片优化器', description: '生成 LQ 图片' }]])
  })
})
