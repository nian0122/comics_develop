import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ReaderMediaItem from './ReaderMediaItem.vue'

describe('ReaderMediaItem', () => {
  it('加载前显示占位，加载后渲染图片', async () => {
    const wrapper = mount(ReaderMediaItem, {
      props: { media: { type: 'image', lqUrl: '/lq.webp', hqUrl: '/hq.jpg' }, index: 0 }
    })

    expect(wrapper.text()).toContain('第 1 页')

    await wrapper.vm.markVisible()

    expect(wrapper.get('img').attributes('src')).toBe('/lq.webp')
  })

  it('图片失败时回退到 HQ', async () => {
    const wrapper = mount(ReaderMediaItem, {
      props: { media: { type: 'image', lqUrl: '/lq.webp', hqUrl: '/hq.jpg' }, index: 0 }
    })

    await wrapper.vm.markVisible()
    await wrapper.get('img').trigger('error')

    expect(wrapper.get('img').attributes('src')).toBe('/hq.jpg')
  })

  it('双击图片切换到 HQ', async () => {
    const wrapper = mount(ReaderMediaItem, {
      props: { media: { type: 'image', lqUrl: '/lq.webp', hqUrl: '/hq.jpg' }, index: 0 }
    })

    await wrapper.vm.markVisible()
    await wrapper.get('img').trigger('dblclick')

    expect(wrapper.get('img').attributes('src')).toBe('/hq.jpg')
  })

  it('视频使用 videoUrl', async () => {
    const wrapper = mount(ReaderMediaItem, {
      props: { media: { type: 'video', videoUrl: '/video.mp4' }, index: 0 }
    })

    await wrapper.vm.markVisible()

    expect(wrapper.get('video').attributes('src')).toBe('/video.mp4')
  })

  it('卸载时清空图片 src 以停止未完成请求', async () => {
    const wrapper = mount(ReaderMediaItem, {
      props: { media: { type: 'image', lqUrl: '/lq.webp', hqUrl: '/hq.jpg' }, index: 0 }
    })

    await wrapper.vm.markVisible()
    const image = wrapper.get('img').element

    wrapper.unmount()

    expect(image.getAttribute('src')).toBe('')
  })

  it('卸载时清空视频 src 并调用 load 停止请求', async () => {
    const wrapper = mount(ReaderMediaItem, {
      props: { media: { type: 'video', videoUrl: '/video.mp4' }, index: 0 }
    })

    await wrapper.vm.markVisible()
    const video = wrapper.get('video').element
    video.load = vi.fn()

    wrapper.unmount()

    expect(video.getAttribute('src')).toBe('')
    expect(video.load).toHaveBeenCalled()
  })
})
