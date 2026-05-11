import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createLocalMediaResolver } from './local-media-dev-server.js'

describe('local-media-dev-server', () => {
  it('将 hq_image 映射到本地 HQ 目录', () => {
    const resolve = createLocalMediaResolver({ COMICS_ROOT_DIR: 'D:/comics', HQ_SUB_DIR: 'hq' })
    const result = resolve('/hq_image/系列A/第01话/001.jpg')

    expect(result.path).toBe(path.resolve('D:/comics/hq/系列A/第01话/001.jpg'))
    expect(result.missingStatus).toBe(404)
    expect(result.contentType).toBe('image/jpeg')
  })

  it('将 lq_image 映射到本地 LQ 目录，缺失时由中间件返回 204', () => {
    const resolve = createLocalMediaResolver({ COMICS_ROOT_DIR: 'D:/comics', LQ_SUB_DIR: 'lq' })
    const result = resolve('/lq_image/系列A/第01话/001.webp')

    expect(result.path).toBe(path.resolve('D:/comics/lq/系列A/第01话/001.webp'))
    expect(result.missingStatus).toBe(204)
    expect(result.contentType).toBe('image/webp')
  })

  it('将 video 映射到 HQ 目录', () => {
    const resolve = createLocalMediaResolver({ COMICS_ROOT_DIR: 'D:/comics', HQ_SUB_DIR: 'hq' })
    const result = resolve('/video/系列A/第01话/002.mp4')

    expect(result.path).toBe(path.resolve('D:/comics/hq/系列A/第01话/002.mp4'))
    expect(result.missingStatus).toBe(404)
    expect(result.contentType).toBe('video/mp4')
  })

  it('拒绝路径穿越', () => {
    const resolve = createLocalMediaResolver({ COMICS_ROOT_DIR: 'D:/comics', HQ_SUB_DIR: 'hq' })

    expect(resolve('/hq_image/%2E%2E/secret.txt')).toEqual({ status: 403 })
  })
})
