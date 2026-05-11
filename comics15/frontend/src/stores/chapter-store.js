import { defineStore } from 'pinia'
import { fetchLevel } from '../services/api.js'
import { naturalSort } from '../utils/natural-sort.js'

function sortNodes(nodes, type) {
  return nodes
    .filter((node) => node.type === type)
    .slice()
    .sort((left, right) => naturalSort(left.name, right.name))
}

export const useChapterStore = defineStore('chapter', {
  state: () => ({
    seriesName: '',
    currentPath: '',
    nodes: [],
    directories: [],
    chapters: [],
    loading: false,
    error: '',
    lastDirectoryPathBySeries: {},
    lastReadChapterPathBySeries: {}
  }),
  actions: {
    async loadLevel(seriesName, path = '') {
      this.loading = true
      this.error = ''
      this.seriesName = seriesName

      try {
        const response = await fetchLevel(seriesName, path)
        const nodes = Array.isArray(response.nodes) ? response.nodes : []
        const sortedNodes = nodes.slice().sort((left, right) => naturalSort(left.name, right.name))

        this.currentPath = response.path ?? path
        this.nodes = sortedNodes
        this.directories = sortNodes(sortedNodes, 'directory')
        this.chapters = sortNodes(sortedNodes, 'chapter')
      } catch (error) {
        this.error = error instanceof Error ? error.message : '加载目录失败'
        this.nodes = []
        this.directories = []
        this.chapters = []
      } finally {
        this.loading = false
      }
    },
    setLastDirectoryPath(seriesName, path) {
      this.lastDirectoryPathBySeries = {
        ...this.lastDirectoryPathBySeries,
        [seriesName]: path
      }
    },
    setLastReadChapterPath(seriesName, pathId) {
      this.lastReadChapterPathBySeries = {
        ...this.lastReadChapterPathBySeries,
        [seriesName]: pathId
      }
    }
  }
})
