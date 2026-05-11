import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReaderProgressBadge from './ReaderProgressBadge.vue'

describe('ReaderProgressBadge', () => {
  it('显示进度并打开跳页弹窗', async () => {
    const wrapper = mount(ReaderProgressBadge, {
      props: { currentPage: 2, totalPages: 10 }
    })

    expect(wrapper.text()).toContain('2 / 10')

    await wrapper.get('button[data-progress="true"]').trigger('click')

    expect(wrapper.text()).toContain('跳转页码')
  })

  it('确认跳页时触发事件', async () => {
    const wrapper = mount(ReaderProgressBadge, {
      props: { currentPage: 2, totalPages: 10 }
    })

    await wrapper.get('button[data-progress="true"]').trigger('click')
    await wrapper.get('input').setValue('5')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('jump')).toEqual([[5]])
  })
})
