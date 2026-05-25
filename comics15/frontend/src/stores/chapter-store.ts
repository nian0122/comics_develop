import { defineStore } from 'pinia'
import { fetchLevel } from '@/services/api'
import { naturalSort } from '@/utils/natural-sort'
import type { LevelNode } from '@/types/api'

function sortNodes(nodes: LevelNode[], type: 'directory' | 'chapter'): LevelNode[] {
  return nodes
    .filter((node) => node.type === type)
    .slice()
    .sort((left, right) => naturalSort(left.name, right.name))
}

interface ChapterState {
  seriesName: string
  currentPath: string
  nodes: LevelNode[]
  directories: LevelNode[]
  chapters: LevelNode[]
  loading: boolean
  error: string
  lastDirectoryPathBySeries: Record<string, string>
  lastReadChapterPathBySeries: Record<string, string>
}

export const useChapterStore = defineStore('chapter', {
  state: (): ChapterState => ({
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
    async loadLevel(seriesName: string, path = '') {
      this.loading = true
      this.error = ''
      this.seriesName = seriesName

      try {
        const response = await fetchLevel(seriesName, path)
        const nodes = Array.isArray(response.nodes) ? response.nodes : []
        const sortedNodes = nodes.slice().sort((left, right) => naturalSort(left.name, right.name))

        this.currentPath = response.path ?? path
        this.nodes = sortedNodes as LevelNode[]
        this.directories = sortNodes(sortedNodes as LevelNode[], 'directory')
        this.chapters = sortNodes(sortedNodes as LevelNode[], 'chapter')
      } catch (error) {
        this.error = error instanceof Error ? error.message : '加载目录失败'
        this.nodes = []
        this.directories = []
        this.chapters = []
      } finally {
        this.loading = false
      }
    },
    setLastDirectoryPath(seriesName: string, path: string) {
      this.lastDirectoryPathBySeries = {
        ...this.lastDirectoryPathBySeries,
        [seriesName]: path
      }
    },
    setLastReadChapterPath(seriesName: string, pathId: string) {
      this.lastReadChapterPathBySeries = {
        ...this.lastReadChapterPathBySeries,
        [seriesName]: pathId
      }
    }
  }
})
