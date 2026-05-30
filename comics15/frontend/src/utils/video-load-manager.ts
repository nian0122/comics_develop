/**
 * VideoLoadManager — centralized video preload scheduler for comic reader.
 *
 * Responsibilities:
 * - Owns a single IntersectionObserver shared by all registered video containers
 * - Ensures only ONE video preloads metadata at a time (browser connection pool limits)
 * - Aborts active preload when video leaves viewport, auto-dequeues next
 * - Playback mutual exclusion: pauses currently playing video when new video plays
 *
 * No more &lt;source&gt; element hack — directly manipulates video.src.
 * Abort via video.removeAttribute('src') + load() triggers resource selection algorithm re-run.
 */

export interface VideoEntryOptions {
  url: string
  onLoaded: () => void
  onError: (fallback: () => void) => void
  onAborted: () => void
}

interface VideoEntry extends VideoEntryOptions {
  video: HTMLVideoElement
  container: HTMLElement
}

export class VideoLoadManager {
  private observer: IntersectionObserver | null = null
  private registry = new Map<HTMLVideoElement, VideoEntry>()
  private activePreload: VideoEntry | null = null
  private waitQueue: VideoEntry[] = []
  private playingVideo: HTMLVideoElement | null = null
  private refCount = 0

  /**
   * Register a video element and its container. Manager observes container for viewport enter/leave.
   * Re-registering the same video first unregisters then registers fresh (DynamicScroller recycling).
   */
  register(video: HTMLVideoElement, container: HTMLElement, options: VideoEntryOptions): void {
    if (this.registry.has(video)) {
      this.unregister(video)
    }

    const entry: VideoEntry = { video, container, ...options }
    this.registry.set(video, entry)
    this.ensureObserver()
    this.observer!.observe(container)
    this.refCount++

    video.addEventListener('loadedmetadata', this.onMetadataLoaded)
    video.addEventListener('error', this.onVideoError)
  }

  /** Unregister a video element, cleaning up observer and event listeners. */
  unregister(video: HTMLVideoElement): void {
    const entry = this.registry.get(video)
    if (!entry) return

    this.observer?.unobserve(entry.container)
    this.registry.delete(video)
    this.refCount--

    video.removeEventListener('loadedmetadata', this.onMetadataLoaded)
    video.removeEventListener('error', this.onVideoError)

    if (this.activePreload?.video === video) {
      this.abortActive()
    }

    this.waitQueue = this.waitQueue.filter(e => e.video !== video)

    if (this.refCount <= 0) {
      this.observer?.disconnect()
      this.observer = null
      this.refCount = 0
    }
  }

  /** Called when user clicks play — releases preload slot + playback mutual exclusion */
  onUserPlayed(video: HTMLVideoElement): void {
    if (this.playingVideo && this.playingVideo !== video && !this.playingVideo.paused) {
      this.playingVideo.pause()
    }
    this.playingVideo = video

    if (this.activePreload?.video === video) {
      this.activePreload = null
      this.dequeueNext()
    }
  }

  // ── Private ──────────────────────────────────────────────

  private ensureObserver(): void {
    if (this.observer) return
    this.observer = new IntersectionObserver(
      (entries) => this.onObserverChange(entries),
      { rootMargin: '300px 0px' },
    )
  }

  private onObserverChange(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const videoEntry = this.findEntryByContainer(entry.target as HTMLElement)
      if (!videoEntry) continue

      if (entry.isIntersecting) {
        this.onEnterViewport(videoEntry)
      } else {
        this.onLeaveViewport(videoEntry)
      }
    }
  }

  private findEntryByContainer(container: HTMLElement): VideoEntry | undefined {
    for (const entry of this.registry.values()) {
      if (entry.container === container) return entry
    }
    return undefined
  }

  private onEnterViewport(entry: VideoEntry): void {
    if (this.activePreload?.video === entry.video) return
    if (this.waitQueue.some(e => e.video === entry.video)) return

    if (this.activePreload === null) {
      this.startPreload(entry)
    } else {
      this.waitQueue.push(entry)
    }
  }

  private onLeaveViewport(entry: VideoEntry): void {
    if (this.activePreload?.video === entry.video) {
      this.abortActive()
    }
    this.waitQueue = this.waitQueue.filter(e => e.video !== entry.video)
    if (this.playingVideo === entry.video && !entry.video.paused) {
      entry.video.pause()
    }
  }

  private startPreload(entry: VideoEntry): void {
    this.activePreload = entry
    entry.video.preload = 'metadata'
    entry.video.src = entry.url
    entry.video.load()
  }

  private abortActive(): void {
    if (!this.activePreload) return
    const video = this.activePreload.video
    video.removeAttribute('src')
    video.load()
    this.activePreload = null
    this.dequeueNext()
  }

  private dequeueNext(): void {
    const next = this.waitQueue.shift()
    if (next) {
      this.startPreload(next)
    }
  }

  private onMetadataLoaded = (event: Event): void => {
    const video = event.target as HTMLVideoElement
    const entry = this.registry.get(video)
    entry?.onLoaded()
  }

  private onVideoError = (event: Event): void => {
    const video = event.target as HTMLVideoElement
    const entry = this.registry.get(video)
    if (!entry) return

    entry.onError(() => {
      this.startPreload(entry)
    })
  }
}

/** Module-level singleton */
export const videoLoadManager = new VideoLoadManager()
