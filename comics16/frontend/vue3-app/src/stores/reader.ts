/**
 * 阅读器状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProgressData } from '@/utils/storage'
import { saveProgress, loadProgress } from '@/utils/storage'

export interface ReaderProgress {
  currentPage: number
  totalPages: number
  loadedPages: number
  scrollPercent: number
  lastReadTime: number
}

export const useReaderStore = defineStore('reader', () => {
  // State
  const progress = ref<ReaderProgress>({
    currentPage: 1,
    totalPages: 0,
    loadedPages: 0,
    scrollPercent: 0,
    lastReadTime: 0,
  })
  
  const scale = ref(100)
  const isSidebarOpen = ref(true)
  const isHeaderVisible = ref(true)
  const isFooterVisible = ref(true)
  
  // 懒加载状态
  const lazyLoadState = ref({
    nextToObserve: 0,
    loadedCount: 0,
    isObserving: false,
  })

  // 预加载状态
  const nextChapterFilesCache = ref<string[] | null>(null)
  const nextChapterIndex = ref(-1)

  // Computed
  const progressText = computed(() => {
    const { currentPage, totalPages } = progress.value
    if (totalPages === 0) return '0 / 0'
    const percent = Math.round((currentPage / totalPages) * 100)
    return `${currentPage} / ${totalPages} (${percent}%)`
  })

  const briefProgressText = computed(() => {
    const { currentPage, totalPages } = progress.value
    if (totalPages === 0) return '0 / 0'
    return `${currentPage} / ${totalPages}`
  })

  const currentScalePercent = computed(() => `${scale.value}%`)

  // Actions
  function initProgress(total: number): void {
    progress.value = {
      currentPage: 1,
      totalPages: total,
      loadedPages: 0,
      scrollPercent: 0,
      lastReadTime: Date.now(),
    }
  }

  function setCurrentPage(page: number): void {
    const { totalPages } = progress.value
    progress.value.currentPage = Math.max(1, Math.min(page, totalPages))
    progress.value.lastReadTime = Date.now()
  }

  function setLoadedPages(count: number): void {
    const { totalPages } = progress.value
    progress.value.loadedPages = Math.min(count, totalPages)
  }

  function updateScrollPercent(percent: number): void {
    progress.value.scrollPercent = Math.max(0, Math.min(100, percent))
    progress.value.lastReadTime = Date.now()
  }

  function saveReaderProgress(seriesName: string, chapterIndex: number): void {
    if (!seriesName || chapterIndex < 0) return
    
    const data: ProgressData = {
      page: progress.value.currentPage,
      scrollPercent: progress.value.scrollPercent,
      timestamp: progress.value.lastReadTime,
    }
    saveProgress(seriesName, chapterIndex, data)
  }

  function restoreReaderProgress(seriesName: string, chapterIndex: number): ProgressData | null {
    if (!seriesName || chapterIndex < 0) return null
    return loadProgress(seriesName, chapterIndex)
  }

  function setScale(value: number): void {
    scale.value = Math.max(30, Math.min(150, value))
  }

  function resetProgress(): void {
    progress.value = {
      currentPage: 1,
      totalPages: 0,
      loadedPages: 0,
      scrollPercent: 0,
      lastReadTime: 0,
    }
    lazyLoadState.value = {
      nextToObserve: 0,
      loadedCount: 0,
      isObserving: false,
    }
  }

  function setLazyLoadLoadedCount(count: number): void {
    lazyLoadState.value.loadedCount = count
    setLoadedPages(count)
  }

  function incrementLazyLoadLoadedCount(): void {
    lazyLoadState.value.loadedCount++
    setLoadedPages(lazyLoadState.value.loadedCount)
  }

  function cacheNextChapter(files: string[], index: number): void {
    nextChapterFilesCache.value = files
    nextChapterIndex.value = index
  }

  function clearNextChapterCache(): void {
    nextChapterFilesCache.value = null
    nextChapterIndex.value = -1
  }

  function toggleSidebar(): void {
    isSidebarOpen.value = !isSidebarOpen.value
  }

  function setHeaderVisibility(visible: boolean): void {
    isHeaderVisible.value = visible
  }

  function setFooterVisibility(visible: boolean): void {
    isFooterVisible.value = visible
  }

  return {
    // State
    progress,
    scale,
    isSidebarOpen,
    isHeaderVisible,
    isFooterVisible,
    lazyLoadState,
    nextChapterFilesCache,
    nextChapterIndex,
    // Computed
    progressText,
    briefProgressText,
    currentScalePercent,
    // Actions
    initProgress,
    setCurrentPage,
    setLoadedPages,
    updateScrollPercent,
    saveReaderProgress,
    restoreReaderProgress,
    setScale,
    resetProgress,
    setLazyLoadLoadedCount,
    incrementLazyLoadLoadedCount,
    cacheNextChapter,
    clearNextChapterCache,
    toggleSidebar,
    setHeaderVisibility,
    setFooterVisibility,
  }
})
