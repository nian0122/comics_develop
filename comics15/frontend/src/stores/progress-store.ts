import { defineStore } from 'pinia'
import { STORAGE_KEYS } from '@/config'
import { readLocalStorageJson, writeLocalStorageJson } from '@/services/storage'
import type { ReadingProgress } from '@/types/progress'

function makeKey(seriesName: string, chapterPath: string): string {
  return `${seriesName}::${chapterPath}`
}

interface ProgressState {
  items: Record<string, ReadingProgress>
}

export const useProgressStore = defineStore('progress', {
  state: (): ProgressState => ({
    items: readLocalStorageJson<Record<string, ReadingProgress>>(STORAGE_KEYS.readingProgress, {}) ?? {}
  }),
  actions: {
    hydrate() {
      this.items = readLocalStorageJson<Record<string, ReadingProgress>>(STORAGE_KEYS.readingProgress, {}) ?? {}
    },
    persist() {
      writeLocalStorageJson(STORAGE_KEYS.readingProgress, this.items)
    },
    setProgress(seriesName: string, chapterPath: string, progress: ReadingProgress) {
      const key = makeKey(seriesName, chapterPath)
      this.items = {
        ...this.items,
        [key]: progress
      }
      this.persist()
    },
    getProgress(seriesName: string, chapterPath: string): ReadingProgress | null {
      return this.items[makeKey(seriesName, chapterPath)] ?? null
    }
  }
})
