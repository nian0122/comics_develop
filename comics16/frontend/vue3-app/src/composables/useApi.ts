/**
 * API 调用封装
 */


export interface ApiError {
  message: string
  status?: number
}

/**
 * 处理 fetch 响应
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = {
      message: `HTTP ${response.status}: ${response.statusText}`,
      status: response.status,
    }
    throw error
  }
  return response.json()
}

/**
 * 系列相关 API
 */
export function useSeriesApi() {
  // const seriesStore = useSeriesStore()
  async function fetchSeries(): Promise<string[]> {
    try {
      const response = await fetch('/api/series')
      const data = await handleResponse<string[]>(response)
      return data
    } catch (error) {
      console.error('Failed to fetch series:', error)
      throw error
    }
  }

  return {
    fetchSeries,
  }
}

/**
 * 章节相关 API
 */
export function useChapterApi() {
  // const chapterStore = useChapterStore()
  async function fetchChapters(seriesName: string) {
    try {
      const response = await fetch(`/api/chapters/${encodeURIComponent(seriesName)}`)
      const data = await handleResponse(response)
      return data
    } catch (error) {
      console.error('Failed to fetch chapters:', error)
      throw error
    }
  }

  async function fetchChapterFiles(
    seriesName: string,
    chapterPath: string,
    perPage: number = 500
  ) {
    try {
      const url = `/api/chapter/${encodeURIComponent(seriesName)}?chapterPath=${encodeURIComponent(chapterPath)}&page=1&per_page=${perPage}`
      const response = await fetch(url)
      const data = await handleResponse<{ files: string[] }>(response)
      return data.files
    } catch (error) {
      console.error('Failed to fetch chapter files:', error)
      throw error
    }
  }

  return {
    fetchChapters,
    fetchChapterFiles,
  }
}

/**
 * 图片 URL 构建工具
 */
export function useImageUrlBuilder() {
  /**
   * 构建 LQ 图片 URL
   */
  function buildLQImageUrl(seriesName: string, filename: string, chapterPath?: string): string {
    const url = `/api/image/${encodeURIComponent(seriesName)}/${encodeURIComponent(filename)}`
    // 空字符串也是有效的路径（表示根目录），只排除 undefined 和 null
    if (chapterPath !== undefined && chapterPath !== null) {
      return `${url}?chapterPath=${encodeURIComponent(chapterPath)}`
    }
    return url
  }

  /**
   * 构建 HQ 图片 URL
   */
  function buildHQImageUrl(seriesName: string, filename: string, chapterPath?: string): string {
    // 空字符串也是有效的路径（表示根目录），只排除 undefined 和 null
    if (chapterPath !== undefined && chapterPath !== null) {
      return `/hq_image/${encodeURIComponent(seriesName)}/${encodeURIComponent(chapterPath)}/${encodeURIComponent(filename)}`
    }
    return `/hq_image/${encodeURIComponent(seriesName)}/${encodeURIComponent(filename)}`
  }

  /**
   * 构建视频 URL
   */
  function buildVideoUrl(seriesName: string, filename: string, chapterPath?: string): string {
    // 空字符串也是有效的路径（表示根目录），只排除 undefined 和 null
    if (chapterPath !== undefined && chapterPath !== null) {
      return `/video/${encodeURIComponent(seriesName)}/${encodeURIComponent(chapterPath)}/${encodeURIComponent(filename)}`
    }
    return `/video/${encodeURIComponent(seriesName)}/${encodeURIComponent(filename)}`
  }

  /**
   * 从 LQ URL 转换为 HQ URL
   */
  function convertLQToHQ(lowQualityUrl: string): string {
    if (!lowQualityUrl.includes('/api/image/')) {
      return lowQualityUrl
    }

    try {
      const url = new URL(lowQualityUrl, window.location.origin)
      const seriesName = decodeURIComponent(url.pathname.split('/')[3] ?? '')
      const filename = decodeURIComponent(url.pathname.split('/')[4] ?? '')
      const chapterPathParam = url.searchParams.get('chapterPath') ?? ''
      const chapterPath = chapterPathParam ? decodeURIComponent(chapterPathParam) : ''

      return buildHQImageUrl(seriesName, filename, chapterPath)
    } catch (e) {
      console.error('Error parsing URL for HQ image:', e)
      return lowQualityUrl.replace('/api/image/', '/hq_image/')
    }
  }

  return {
    buildLQImageUrl,
    buildHQImageUrl,
    buildVideoUrl,
    convertLQToHQ,
  }
}
