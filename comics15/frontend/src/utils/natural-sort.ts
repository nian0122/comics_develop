const collator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base'
})

export function naturalSort(left: string, right: string): number {
  return collator.compare(left, right)
}
