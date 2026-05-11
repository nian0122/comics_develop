import { defineStore } from 'pinia'
import { fetchSeries } from '../services/api.js'

export const useSeriesStore = defineStore('series', {
  state: () => ({
    series: [],
    loading: false,
    error: ''
  }),
  actions: {
    async loadSeries() {
      this.loading = true
      this.error = ''

      try {
        this.series = await fetchSeries()
      } catch (error) {
        this.error = error instanceof Error ? error.message : '加载系列失败'
        this.series = []
      } finally {
        this.loading = false
      }
    }
  }
})
