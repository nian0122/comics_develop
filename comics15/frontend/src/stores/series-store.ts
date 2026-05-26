import { defineStore } from 'pinia'
import { fetchRootLevel } from '@/services/api'
import type { LevelNode } from '@/types/api'

interface SeriesState {
  series: LevelNode[]
  loading: boolean
  error: string
}

export const useSeriesStore = defineStore('series', {
  state: (): SeriesState => ({
    series: [],
    loading: false,
    error: ''
  }),
  actions: {
    async loadSeries() {
      this.loading = true
      this.error = ''

      try {
        const response = await fetchRootLevel()
        this.series = (response.nodes ?? []).filter(
          (node) => node.type === 'series'
        )
      } catch (error) {
        this.error = error instanceof Error ? error.message : '加载系列失败'
        this.series = []
      } finally {
        this.loading = false
      }
    }
  }
})
