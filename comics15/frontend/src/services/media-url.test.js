import { describe, expect, it } from 'vitest'
import { getMediaSource } from './media-url.js'

describe('media-url', () => {
  it('图片优先使用 preferred source', () => {
    const media = {
      type: 'image',
      preferredUrl: '/preferred.jpg',
      lqUrl: '/lq.webp',
      hqUrl: '/hq.jpg'
    }

    expect(getMediaSource(media)).toMatchObject({ url: '/preferred.jpg', fallbackUrl: null, kind: 'image', mediaType: 'image' })
  })

  it('图片可回退到 HQ', () => {
    const media = {
      type: 'image',
      lqUrl: '/lq.webp',
      hqUrl: '/hq.jpg'
    }

    expect(getMediaSource(media)).toMatchObject({ url: '/lq.webp', fallbackUrl: '/hq.jpg', kind: 'image', mediaType: 'image' })
  })

  it('视频优先使用 videoUrl', () => {
    const media = {
      type: 'video',
      videoUrl: '/video.mp4',
      hqUrl: '/hq.jpg'
    }

    expect(getMediaSource(media)).toMatchObject({ url: '/video.mp4', fallbackUrl: null, kind: 'video', mediaType: 'video' })
  })
})
