import { defineStore } from 'pinia'
import { fetchChapter } from '@/services/api'
import type { ChapterResponse } from '@/types/api'

interface MediaItem {
  name?: string
  type?: string
  mediaType?: string
  hqUrl?: string
  lqUrl?: string
  videoUrl?: string
  url?: string
  hq?: { url: string }
  lq?: { url: string }
  preferredSource?: string
  preferredUrl?: string
}

interface ReaderState {
  seriesName: string
  chapterPath: string
  mediaItems: MediaItem[]
  currentPage: number
  totalPages: number
  previousChapterPath: string
  nextChapterPath: string
  chapterPaths: string[]
  loading: boolean
  error: string
}

interface ChapterContext {
  previousChapterPath?: string
  nextChapterPath?: string
  chapterPaths?: string[] | null
}

export const useReaderStore = defineStore('reader', {
  state: (): ReaderState => ({
    seriesName: '',
    chapterPath: '',
    mediaItems: [],
    currentPage: 1,
    totalPages: 0,
    previousChapterPath: '',
    nextChapterPath: '',
    chapterPaths: [],
    loading: false,
    error: ''
  }),
  actions: {
    async loadChapter(seriesName: string, chapterPath: string) {
      this.loading = true
      this.error = ''

      try {
        const response = await fetchChapter(seriesName, chapterPath) as ChapterResponse
        this.seriesName = seriesName
        this.chapterPath = response.path ?? chapterPath
        this.mediaItems = Array.isArray(response.files) ? response.files : []
        this.totalPages = response.total ?? this.mediaItems.length
        this.currentPage = 1
        this.updateChapterNavigation(this.chapterPath)
      } catch (error) {
        this.error = error instanceof Error ? error.message : '加载章节失败'
        this.mediaItems = []
        this.totalPages = 0
      } finally {
        this.loading = false
      }
    },
    setCurrentPage(page: number) {
      this.currentPage = page
    },
    setChapterContext({ previousChapterPath = '', nextChapterPath = '', chapterPaths }: ChapterContext = {}) {
      if (Array.isArray(chapterPaths)) {
        this.chapterPaths = chapterPaths
        this.updateChapterNavigation(this.chapterPath)
        return
      }

      this.previousChapterPath = previousChapterPath
      this.nextChapterPath = nextChapterPath
    },
    /**
     * 根据当前 chapterPath 在 chapterPaths 列表中定位，自动计算上一话 / 下一话。
     * 未找到或列表为空时清空导航信息。
     */
    updateChapterNavigation(chapterPath: string) {
      if (!this.chapterPaths.length) {
        return
      }

      const chapterIndex = this.chapterPaths.indexOf(chapterPath)

      if (chapterIndex === -1) {
        this.previousChapterPath = ''
        this.nextChapterPath = ''
        return
      }

      this.previousChapterPath = chapterIndex > 0 ? this.chapterPaths[chapterIndex - 1] : ''
      this.nextChapterPath = chapterIndex < this.chapterPaths.length - 1 ? this.chapterPaths[chapterIndex + 1] : ''
    }
  }
})
