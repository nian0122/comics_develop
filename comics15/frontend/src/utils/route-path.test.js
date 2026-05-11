import { describe, expect, it } from 'vitest'
import { decodeRoutePath, encodeRoutePath, splitRoutePath } from './route-path.js'

describe('route-path', () => {
  it('逐段编码中文路径并保留斜杠层级', () => {
    expect(encodeRoutePath('系列 一/第 10 话/番外 篇')).toBe(
      '%E7%B3%BB%E5%88%97%20%E4%B8%80/%E7%AC%AC%2010%20%E8%AF%9D/%E7%95%AA%E5%A4%96%20%E7%AF%87'
    )
  })

  it('解码逐段编码后的路径', () => {
    expect(decodeRoutePath('%E7%B3%BB%E5%88%97%20%E4%B8%80/%E7%AC%AC%2010%20%E8%AF%9D')).toBe(
      '系列 一/第 10 话'
    )
  })

  it('过滤空路径片段', () => {
    expect(splitRoutePath('/系列//第 1 话/')).toEqual(['系列', '第 1 话'])
  })
})
