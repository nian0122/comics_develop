import type { ChapterResponse, LevelResponse, SeriesListResponse } from '@/types/api'

export interface FetchError extends Error {
  status: number
  body: string
}

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

export function fetchSeries(): Promise<SeriesListResponse> {
  return fetchJson<SeriesListResponse>('/api/series')
}

export function fetchLevel(seriesName: string, path = ''): Promise<LevelResponse> {
  const encodedSeries = encodeURIComponent(seriesName)
  const encodedPath = path ? `?path=${encodeURIComponent(path)}` : ''

  return fetchJson<LevelResponse>(`/api/levels/${encodedSeries}${encodedPath}`)
}

export function fetchChapter(seriesName: string, chapterPath = ''): Promise<ChapterResponse> {
  const encodedSeries = encodeURIComponent(seriesName)
  const encodedChapterPath = chapterPath ? `?chapterPath=${encodeURIComponent(chapterPath)}` : ''

  return fetchJson<ChapterResponse>(`/api/chapter/${encodedSeries}${encodedChapterPath}`)
}
