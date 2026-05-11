import { defineStore } from 'pinia'
import { STORAGE_KEYS } from '../config/index.js'
import { readLocalStorageJson, writeLocalStorageJson } from '../services/storage.js'

function makeKey(seriesName, chapterPath) {
  return `${seriesName}::${chapterPath}`
}

export const useProgressStore = defineStore('progress', {
  state: () => ({
    items: readLocalStorageJson(STORAGE_KEYS.readingProgress, {}) ?? {}
  }),
  actions: {
    hydrate() {
      this.items = readLocalStorageJson(STORAGE_KEYS.readingProgress, {}) ?? {}
    },
    persist() {
      writeLocalStorageJson(STORAGE_KEYS.readingProgress, this.items)
    },
    setProgress(seriesName, chapterPath, progress) {
      const key = makeKey(seriesName, chapterPath)
      this.items = {
        ...this.items,
        [key]: progress
      }
      this.persist()
    },
    getProgress(seriesName, chapterPath) {
      return this.items[makeKey(seriesName, chapterPath)] ?? null
    }
  }
})
