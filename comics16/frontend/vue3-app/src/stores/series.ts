/**
 * 系列数据状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadCurrentSeries, saveCurrentSeries } from '@/utils/storage'

export interface ChapterData {
  name: string
  path_id: string
}

export interface ChapterTreeNode {
  name: string
  fullPath: string
  children: ChapterTreeNode[] | Record<string, ChapterTreeNode>
  isChapter: boolean
  flatIndex?: number | null
  path_id?: string | null
  isExpanded: boolean
}

export const useSeriesStore = defineStore('series', () => {
  // State
  const seriesList = ref<string[]>([])
  const currentSeries = ref<string>('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const hasSeries = computed(() => seriesList.value.length > 0)
  const hasSelectedSeries = computed(() => currentSeries.value !== '')

  // Actions
  async function loadSeries(): Promise<void> {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await fetch('/api/series')
      if (!response.ok) {
        throw new Error('Failed to load series list')
      }
      
      const data = await response.json()
      seriesList.value = data
      
      // 尝试恢复上次选择的系列
      const savedSeries = loadCurrentSeries()
      if (savedSeries && data.includes(savedSeries)) {
        currentSeries.value = savedSeries
      } else if (data.length > 0) {
        currentSeries.value = data[0]
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载系列列表失败'
      console.error('Error loading series:', e)
    } finally {
      isLoading.value = false
    }
  }

  function selectSeries(name: string): void {
    if (seriesList.value.includes(name)) {
      currentSeries.value = name
      saveCurrentSeries(name)
    }
  }

  function clearSeries(): void {
    currentSeries.value = ''
  }

  return {
    // State
    seriesList,
    currentSeries,
    isLoading,
    error,
    // Computed
    hasSeries,
    hasSelectedSeries,
    // Actions
    loadSeries,
    selectSeries,
    clearSeries,
  }
})
