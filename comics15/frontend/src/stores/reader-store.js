import { defineStore } from 'pinia'
import { fetchChapter } from '../services/api.js'

export const useReaderStore = defineStore('reader', {
  state: () => ({
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
    async loadChapter(seriesName, chapterPath) {
      this.loading = true
      this.error = ''

      try {
        const response = await fetchChapter(seriesName, chapterPath)
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
    setCurrentPage(page) {
      this.currentPage = page
    },
    setChapterContext({ previousChapterPath = '', nextChapterPath = '', chapterPaths = null } = {}) {
      if (Array.isArray(chapterPaths)) {
        this.chapterPaths = chapterPaths
        this.updateChapterNavigation(this.chapterPath)
        return
      }

      this.previousChapterPath = previousChapterPath
      this.nextChapterPath = nextChapterPath
    },
    updateChapterNavigation(chapterPath) {
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
