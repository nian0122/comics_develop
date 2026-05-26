export interface LevelNode {
  name: string
  type: 'directory' | 'chapter' | 'series'
  path: string
  pathId: string
  hasChildren?: boolean   // directory or series node only
  fileCount?: number       // chapter or series node only
  coverUrl?: string        // chapter or series node only
}

export interface LevelResponse {
  path: string
  nodes: LevelNode[]
}

export interface ChapterResponse {
  path: string
  files: MediaItem[]
  total: number
}

export interface MediaItem {
  name: string
  type: 'image' | 'video'
  url: string
  fallbackUrl: string | null
}

export interface MediaSource {
  url: string
  fallbackUrl: string | null
  kind: 'image' | 'video'
  mediaType: string
}
