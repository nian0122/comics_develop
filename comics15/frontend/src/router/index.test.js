import { describe, expect, it } from 'vitest'
import {
  createReaderRoute,
  createSeriesDirectoryRoute,
  createSeriesReadRoute,
  createSeriesRootRoute,
  createParentDirectoryRoute,
  routes
} from './index.js'

describe('router', () => {
  it('定义基础路由', () => {
    expect(routes.map((route) => route.path)).toEqual([
      '/',
      '/series/:series/dir/:pathMatch(.*)*',
      '/series/:series/read/:pathMatch(.*)*',
      '/tools'
    ])
  })

  it('构造系列根目录路由', () => {
    expect(createSeriesRootRoute('系列 一')).toBe('/series/%E7%B3%BB%E5%88%97%20%E4%B8%80/dir')
  })

  it('构造目录路由并保留层级', () => {
    expect(createSeriesDirectoryRoute('系列 一', '目录/第 1 层')).toBe(
      '/series/%E7%B3%BB%E5%88%97%20%E4%B8%80/dir/%E7%9B%AE%E5%BD%95/%E7%AC%AC%201%20%E5%B1%82'
    )
  })

  it('构造阅读路由并保留层级', () => {
    expect(createSeriesReadRoute('系列 一', '目录/第 10 话')).toBe(
      '/series/%E7%B3%BB%E5%88%97%20%E4%B8%80/read/%E7%9B%AE%E5%BD%95/%E7%AC%AC%2010%20%E8%AF%9D'
    )
  })

  it('空路径时返回系列根目录', () => {
    expect(createSeriesDirectoryRoute('系列 一', '')).toBe('/series/%E7%B3%BB%E5%88%97%20%E4%B8%80/dir')
    expect(createSeriesReadRoute('系列 一', '')).toBe('/series/%E7%B3%BB%E5%88%97%20%E4%B8%80/read')
  })

  it('返回目录时去掉最后一级', () => {
    expect(createParentDirectoryRoute('系列 一', '目录/第 10 话')).toBe(
      '/series/%E7%B3%BB%E5%88%97%20%E4%B8%80/dir/%E7%9B%AE%E5%BD%95'
    )
  })

  it('目录为空时返回系列列表首页', () => {
    expect(createParentDirectoryRoute('系列 一', '')).toBe('/')
  })

  it('一级目录返回系列根目录', () => {
    expect(createParentDirectoryRoute('系列 一', '目录')).toBe('/series/%E7%B3%BB%E5%88%97%20%E4%B8%80/dir')
  })
})
