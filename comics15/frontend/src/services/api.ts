import type { ChapterResponse, LevelResponse } from '@/types/api'

export interface FetchError extends Error {
  status: number
  body: string
}

/**
 * 通用 JSON 请求封装。非 2xx 响应会抛出包含 status 和 body 的 FetchError。
 */
export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)

  if (!response.ok) {
    const error = new Error(`请求失败：${response.status}`) as FetchError
    error.status = response.status
    error.body = await response.text()
    throw error
  }

  return response.json() as Promise<T>
}

/** 获取根层级节点（所有漫画系列），中文路径自动编码 */
export function fetchRootLevel(): Promise<LevelResponse> {
  return fetchJson<LevelResponse>('/api/levels')
}

/** 获取某系列的目录层级（目录 + 章节节点），中文路径自动编码 */
export function fetchLevel(seriesName: string, path = ''): Promise<LevelResponse> {
  const encodedSeries = encodeURIComponent(seriesName)
  const encodedPath = path ? `?path=${encodeURIComponent(path)}` : ''

  return fetchJson<LevelResponse>(`/api/levels/${encodedSeries}${encodedPath}`)
}

/** 获取某个章节的媒体文件列表（图片/视频），中文路径自动编码 */
export function fetchChapter(seriesName: string, chapterPath = ''): Promise<ChapterResponse> {
  const encodedSeries = encodeURIComponent(seriesName)
  const encodedChapterPath = chapterPath ? `?chapterPath=${encodeURIComponent(chapterPath)}` : ''

  return fetchJson<ChapterResponse>(`/api/chapter/${encodedSeries}${encodedChapterPath}`)
}
