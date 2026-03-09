/**
 * 自然排序算法
 * 用于对章节名和文件名进行符合人类直觉的排序
 */

export function naturalSortKey(text: string): (string | number)[] {
  return text.split(/(\d+)/).map(part => {
    const num = parseInt(part, 10)
    return isNaN(num) ? part : num
  })
}

export function naturalSort(a: string, b: string): number {
  const aKeys = naturalSortKey(a)
  const bKeys = naturalSortKey(b)
  
  const minLength = Math.min(aKeys.length, bKeys.length)
  
  for (let i = 0; i < minLength; i++) {
    const aPart = aKeys[i]
    const bPart = bKeys[i]
    
    if (typeof aPart === 'number' && typeof bPart === 'number') {
      if (aPart !== bPart) return aPart - bPart
    } else {
      const aStr = String(aPart)
      const bStr = String(bPart)
      if (aStr !== bStr) return aStr.localeCompare(bStr)
    }
  }
  
  return aKeys.length - bKeys.length
}

/**
 * 对文件数组进行自然排序
 */
export function naturalSortFiles(files: string[]): string[] {
  return [...files].sort(naturalSort)
}
