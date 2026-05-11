const collator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base'
})

export function naturalSort(left, right) {
  return collator.compare(left, right)
}
