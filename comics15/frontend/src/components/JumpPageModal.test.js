import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import JumpPageModal from './JumpPageModal.vue'

describe('JumpPageModal', () => {
  it('显示当前页和总页数', () => {
    const wrapper = mount(JumpPageModal, {
      props: { currentPage: 2, totalPages: 10 }
    })

    expect(wrapper.text()).toContain('当前 2 / 10')
  })

  it('限制页码范围并确认', async () => {
    const wrapper = mount(JumpPageModal, {
      props: { currentPage: 2, totalPages: 10 }
    })

    await wrapper.get('input').setValue('99')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('confirm')).toEqual([[10]])
  })

  it('点击关闭按钮触发关闭事件', async () => {
    const wrapper = mount(JumpPageModal, {
      props: { currentPage: 2, totalPages: 10 }
    })

    await wrapper.get('button[data-close="true"]').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
