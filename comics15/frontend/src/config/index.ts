export const API_BASE = '/api' as const

export const STORAGE_KEYS = {
  readingProgress: 'comics:reading-progress',
  readerLayout: 'comics:reader-layout'
} as const

export const MEDIA_EXTENSIONS: readonly string[] = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov']
