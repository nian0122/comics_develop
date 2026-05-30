export type VideoStatus = 'idle' | 'loading' | 'loaded' | 'error'

export interface VideoEntryConfig {
  url: string
  onStatusChange: (status: VideoStatus) => void
}

export interface VideoEntry {
  video: HTMLVideoElement
  config: VideoEntryConfig
  status: VideoStatus
  loadTimer: ReturnType<typeof setTimeout> | null
}

const METADATA_TIMEOUT_MS = 2000

export class VideoLoadManager {
  private observer: IntersectionObserver | null = null
  private registry: Map<HTMLVideoElement, VideoEntry> = new Map()
  private containerToEntry: WeakMap<HTMLElement, VideoEntry> = new WeakMap()
  private playingVideo: HTMLVideoElement | null = null
  private refCount = 0

  register(
    container: HTMLElement,
    video: HTMLVideoElement,
    config: VideoEntryConfig,
  ): void {
    const entry: VideoEntry = {
      video,
      config,
      status: 'idle',
      loadTimer: null,
    }

    this.registry.set(video, entry)
    this.containerToEntry.set(container, entry)

    if (this.refCount === 0) {
      this.observer = new IntersectionObserver(
        (entries) => this.handleIntersection(entries),
        { rootMargin: '300px 0px' },
      )
    }

    this.refCount++
    this.observer!.observe(container)
  }

  unregister(container: HTMLElement): void {
    const entry = this.containerToEntry.get(container)
    if (!entry) return

    if (entry.loadTimer) {
      clearTimeout(entry.loadTimer)
      entry.loadTimer = null
    }

    this.observer?.unobserve(container)
    this.registry.delete(entry.video)
    this.containerToEntry.delete(container)

    if (this.playingVideo === entry.video) {
      this.playingVideo = null
    }

    this.refCount--
    if (this.refCount <= 0) {
      this.observer?.disconnect()
      this.observer = null
      this.refCount = 0
    }
  }

  onPlay(video: HTMLVideoElement): void {
    if (
      this.playingVideo &&
      this.playingVideo !== video &&
      !this.playingVideo.paused
    ) {
      this.playingVideo.pause()
    }
    this.playingVideo = video
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    for (const e of entries) {
      const container = e.target as HTMLElement
      const entry = this.containerToEntry.get(container)
      if (!entry) continue

      if (e.isIntersecting) {
        if (entry.status === 'idle') {
          this.startLoad(entry)
        }
      } else {
        if (entry.status === 'loading') {
          this.abort(entry)
        } else if (this.playingVideo === entry.video) {
          this.playingVideo.pause()
          this.playingVideo = null
        }
      }
    }
  }

  private startLoad(entry: VideoEntry): void {
    entry.status = 'loading'
    entry.config.onStatusChange('loading')

    entry.video.preload = 'metadata'

    entry.video.onloadedmetadata = () => {
      this.clearLoadTimer(entry)
      entry.status = 'loaded'
      entry.config.onStatusChange('loaded')
      entry.video.onloadedmetadata = null
      entry.video.onerror = null
    }

    entry.video.onerror = () => {
      this.clearLoadTimer(entry)
      entry.status = 'error'
      entry.config.onStatusChange('error')
      entry.video.onloadedmetadata = null
      entry.video.onerror = null
    }

    entry.loadTimer = setTimeout(() => {
      entry.loadTimer = null
      this.abort(entry)
      entry.status = 'error'
      entry.config.onStatusChange('error')
    }, METADATA_TIMEOUT_MS)

    entry.video.src = entry.config.url
    entry.video.load()
  }

  private clearLoadTimer(entry: VideoEntry): void {
    if (entry.loadTimer) {
      clearTimeout(entry.loadTimer)
      entry.loadTimer = null
    }
  }

  private abort(entry: VideoEntry): void {
    this.clearLoadTimer(entry)
    entry.video.removeAttribute('src')
    entry.video.load()
    entry.status = 'idle'
    entry.config.onStatusChange('idle')
  }

  private findEntryByContainer(
    container: HTMLElement,
  ): VideoEntry | undefined {
    return this.containerToEntry.get(container)
  }
}

export const videoLoadManager = new VideoLoadManager()
