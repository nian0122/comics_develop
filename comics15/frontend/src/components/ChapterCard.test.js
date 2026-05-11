import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ChapterCard from './ChapterCard.vue'

describe('ChapterCard', () => {
  it('显示页数和进度文案', () => {
    const wrapper = mount(ChapterCard, {
      props: {
        chapter: {
          name: '第 1 话',
          totalFiles: 18,
          progressText: '已读 6/18',
          coverUrl: '/cover.jpg'
        }
      }
    })

    expect(wrapper.text()).toContain('第 1 话')
    expect(wrapper.text()).toContain('18 页')
    expect(wrapper.text()).toContain('已读 6/18')
  })

  it('点击时触发事件', async () => {
    const wrapper = mount(ChapterCard, {
      props: {
        chapter: {
          name: '第 1 话',
          totalFiles: 18,
          coverUrl: '/cover.jpg'
        }
      }
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[{ name: '第 1 话', totalFiles: 18, coverUrl: '/cover.jpg' }]])
  })

  it('封面失败时显示占位', async () => {
    const wrapper = mount(ChapterCard, {
      props: {
        chapter: {
          name: '第 1 话',
          totalFiles: 18,
          coverUrl: '/cover.jpg'
        }
      }
    })

    await wrapper.vm.onCoverError()

    expect(wrapper.text()).toContain('暂无封面')
  })

  it('封面加载前显示骨架状态', () => {
    const wrapper = mount(ChapterCard, {
      props: {
        chapter: {
          name: '第 1 话',
          totalFiles: 18,
          coverUrl: '/cover.jpg',
          loading: true
        }
      }
    })

    expect(wrapper.find('[data-cover-skeleton="true"]').exists()).toBe(true)
  })
})
