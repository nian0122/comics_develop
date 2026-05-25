const collator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base'
})

/** 中文自然排序比较器。按拼音 + 数字顺序排列（如"第 2 话"排在"第 10 话"之前）。 */
export function naturalSort(left: string, right: string): number {
  return collator.compare(left, right)
}
