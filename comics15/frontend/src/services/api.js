export async function fetchJson(url, options) {
  const response = await fetch(url, options)

  if (!response.ok) {
    const error = new Error(`请求失败：${response.status}`)
    error.status = response.status
    error.body = await response.text()
    throw error
  }

  return response.json()
}

export function fetchSeries() {
  return fetchJson('/api/series')
}

export function fetchLevel(seriesName, path = '') {
  const encodedSeries = encodeURIComponent(seriesName)
  const encodedPath = path ? `?path=${encodeURIComponent(path)}` : ''

  return fetchJson(`/api/levels/${encodedSeries}${encodedPath}`)
}

export function fetchChapter(seriesName, chapterPath = '') {
  const encodedSeries = encodeURIComponent(seriesName)
  const encodedChapterPath = chapterPath ? `?chapterPath=${encodeURIComponent(chapterPath)}` : ''

  return fetchJson(`/api/chapter/${encodedSeries}${encodedChapterPath}`)
}
