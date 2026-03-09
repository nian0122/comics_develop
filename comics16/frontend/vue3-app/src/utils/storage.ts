/**
 * localStorage 封装工具
 */

export interface ProgressData {
  page: number
  scrollPercent: number
  timestamp: number
}

export interface ExpandedPaths {
  [path: string]: boolean
}

/**
 * 保存阅读进度
 */
export function saveProgress(
  seriesName: string,
  chapterIndex: number,
  data: ProgressData
): void {
  try {
    const key = `progress_${seriesName}_${chapterIndex}`
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.warn('保存阅读进度失败:', e)
  }
}

/**
 * 读取阅读进度
 */
export function loadProgress(
  seriesName: string,
  chapterIndex: number
): ProgressData | null {
  try {
    const key = `progress_${seriesName}_${chapterIndex}`
    const data = localStorage.getItem(key)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.warn('读取阅读进度失败:', e)
  }
  return null
}

/**
 * 清除指定章节的阅读进度
 */
export function clearProgress(seriesName: string, chapterIndex: number): void {
  try {
    const key = `progress_${seriesName}_${chapterIndex}`
    localStorage.removeItem(key)
  } catch (e) {
    console.warn('清除阅读进度失败:', e)
  }
}

/**
 * 获取指定系列的所有阅读进度
 */
export function getSeriesProgress(seriesName: string): {
  [chapterIndex: number]: ProgressData
} {
  const progress: { [chapterIndex: number]: ProgressData } = {}
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`progress_${seriesName}_`)) {
        const chapterIndex = parseInt(key.split('_').pop() || '-1', 10)
        if (!isNaN(chapterIndex)) {
          const data = localStorage.getItem(key)
          if (data) {
            progress[chapterIndex] = JSON.parse(data)
          }
        }
      }
    }
  } catch (e) {
    console.warn('获取系列阅读进度失败:', e)
  }
  
  return progress
}

/**
 * 保存展开的卷/目录状态
 */
export function saveExpandedPaths(paths: ExpandedPaths): void {
  try {
    localStorage.setItem('expandedPaths', JSON.stringify(paths))
  } catch (e) {
    console.warn('保存展开状态失败:', e)
  }
}

/**
 * 读取展开的卷/目录状态
 */
export function loadExpandedPaths(): ExpandedPaths {
  try {
    const data = localStorage.getItem('expandedPaths')
    return data ? JSON.parse(data) : {}
  } catch (e) {
    console.warn('读取展开状态失败:', e)
    return {}
  }
}

/**
 * 保存当前选择的系列
 */
export function saveCurrentSeries(seriesName: string): void {
  try {
    localStorage.setItem('currentSeries', seriesName)
  } catch (e) {
    console.warn('保存当前系列失败:', e)
  }
}

/**
 * 读取当前选择的系列
 */
export function loadCurrentSeries(): string | null {
  try {
    return localStorage.getItem('currentSeries')
  } catch (e) {
    console.warn('读取当前系列失败:', e)
    return null
  }
}

/**
 * 保存当前选择的章节路径
 */
export function saveCurrentChapterPathId(pathId: string): void {
  try {
    localStorage.setItem('currentChapterPathId', pathId)
  } catch (e) {
    console.warn('保存当前章节路径失败:', e)
  }
}

/**
 * 读取当前选择的章节路径
 */
export function loadCurrentChapterPathId(): string | null {
  try {
    return localStorage.getItem('currentChapterPathId')
  } catch (e) {
    console.warn('读取当前章节路径失败:', e)
    return null
  }
}

/**
 * 清除所有阅读相关的本地存储
 */
export function clearAllReadingData(): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('progress_') ||
        key === 'currentSeries' ||
        key === 'currentChapterPathId' ||
        key === 'expandedPaths'
      )) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (e) {
    console.warn('清除阅读数据失败:', e)
  }
}
