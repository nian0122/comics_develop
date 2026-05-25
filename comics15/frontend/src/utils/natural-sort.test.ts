import { describe, expect, it } from 'vitest'
import { naturalSort } from './natural-sort'

describe('naturalSort', () => {
  it('按中文数字顺序排序章节标题', () => {
    const items = ['第 10 话', '第 2 话', '第 1 话']

    expect(items.sort(naturalSort)).toEqual(['第 1 话', '第 2 话', '第 10 话'])
  })
})
