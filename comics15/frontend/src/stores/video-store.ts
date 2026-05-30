import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchChapter } from '@/services/api'
import type { MediaItem } from '@/types/api'

const CACHE_MAX = 10

function cacheKey(series: string, chapterPath: string): string {
  return `${series}::${chapterPath}`
}

export const useVideoStore = defineStore('video', () => {
  const videos = ref<MediaItem[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const cache = ref<Map<string, MediaItem[]>>(new Map())

  function evictCache() {
    while (cache.value.size > CACHE_MAX) {
      const oldest = cache.value.keys().next().value as string
      cache.value.delete(oldest)
    }
  }

  function setVideos(items: MediaItem[], series: string, chapterPath: string) {
    videos.value = items
    total.value = items.length
    cache.value.set(cacheKey(series, chapterPath), items)
    evictCache()
  }

  async function fetchVideos(series: string, chapterPath: string) {
    const key = cacheKey(series, chapterPath)
    const cached = cache.value.get(key)
    if (cached) {
      videos.value = cached
      total.value = cached.length
      return
    }

    loading.value = true
    error.value = ''

    try {
      const response = await fetchChapter(series, chapterPath)
      const videoItems = response.files.filter((f) => f.type === 'video')
      setVideos(videoItems, series, chapterPath)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载视频失败'
      videos.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  async function prefetchNext(series: string, nextChapterPath: string) {
    try {
      const response = await fetchChapter(series, nextChapterPath)
      const videoItems = response.files.filter((f) => f.type === 'video')
      cache.value.set(cacheKey(series, nextChapterPath), videoItems)
      evictCache()
    } catch {
      // silently ignore errors during prefetch
    }
  }

  function clear() {
    videos.value = []
    total.value = 0
    loading.value = false
    error.value = ''
    cache.value.clear()
  }

  return { videos, total, loading, error, cache, setVideos, fetchVideos, prefetchNext, clear }
})
