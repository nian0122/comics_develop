export type SeriesListResponse = string[]

export interface LevelNode {
  name: string
  type: 'directory' | 'chapter'
  path: string
  path_id: string
  totalFiles?: number
  coverUrl?: string
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
  name?: string
  type?: string
  mediaType?: string
  hqUrl?: string
  lqUrl?: string
  videoUrl?: string
  video_url?: string
  url?: string
  hq?: { url: string }
  lq?: { url: string }
  preferredSource?: string
  preferredUrl?: string
}

export interface MediaSource {
  url: string
  fallbackUrl: string | null
  kind: 'image' | 'video'
  mediaType: string
}
