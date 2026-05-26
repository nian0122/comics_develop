import { describe, expect, it } from 'vitest'
import { getMediaSource } from './media-url'

describe('media-url', () => {
  it('图片使用 HQ 作为 fallback', () => {
    const media = {
      name: 'test.jpg',
      type: 'image' as const,
      url: '/lq_image/test.webp',
      fallbackUrl: '/hq_image/test.jpg'
    }

    expect(getMediaSource(media)).toMatchObject({
      url: '/lq_image/test.webp',
      fallbackUrl: '/hq_image/test.jpg',
      kind: 'image',
      mediaType: 'image'
    })
  })

  it('图片无 fallback 时 fallbackUrl 为 null', () => {
    const media = {
      name: 'test.jpg',
      type: 'image' as const,
      url: '/hq_image/test.jpg',
      fallbackUrl: null
    }

    expect(getMediaSource(media)).toMatchObject({
      url: '/hq_image/test.jpg',
      fallbackUrl: null,
      kind: 'image',
      mediaType: 'image'
    })
  })

  it('视频 fallbackUrl 为 null', () => {
    const media = {
      name: 'test.mp4',
      type: 'video' as const,
      url: '/video/test.mp4',
      fallbackUrl: null
    }

    expect(getMediaSource(media)).toMatchObject({
      url: '/video/test.mp4',
      fallbackUrl: null,
      kind: 'video',
      mediaType: 'video'
    })
  })
})
