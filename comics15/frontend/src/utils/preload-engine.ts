type PreloadTask = {
  url: string
  index: number
  controller: AbortController
  priority: 'immediate' | 'cascade'
}

export class PreloadEngine {
  private maxConcurrent: number
  private urlResolver: ((index: number) => string | null) | null = null
  private total = 0
  private active = new Map<string, PreloadTask>()
  private cascadeTimers: ReturnType<typeof setTimeout>[] = []
  private destroyed = false

  constructor(maxConcurrent = 4) {
    this.maxConcurrent = maxConcurrent
  }

  setUrlResolver(resolver: (index: number) => string | null): void {
    this.urlResolver = resolver
  }

  reset(total: number): void {
    this.cancelAll()
    this.total = total
    this.active.clear()
    this.destroyed = false
  }

  onVisibleChange(visibleStart: number, visibleEnd: number, _total: number): void {
    if (this.destroyed) return
    if (!this.urlResolver) return
    if (this.total <= 0) return

    const start = Math.max(0, visibleStart)
    const end = Math.min(visibleEnd, this.total - 1)

    if (start > end) return

    this.cancelFarIndices(start, end)
    this.loadImmediate(start, end)
    this.loadCascade(end + 1)
  }

  destroy(): void {
    this.destroyed = true
    this.cancelAll()
  }

  private loadImmediate(visibleStart: number, visibleEnd: number): void {
    const rangeStart = Math.max(0, visibleStart - 1)
    const rangeEnd = Math.min(visibleEnd + 1, this.total - 1)

    for (let i = rangeStart; i <= rangeEnd; i++) {
      this.enqueue(i, 'immediate')
    }
  }

  private loadCascade(fromIndex: number): void {
    const cascadeCount = 15
    const end = Math.min(fromIndex + cascadeCount - 1, this.total - 1)

    let delay = 0
    for (let i = fromIndex; i <= end; i++) {
      this.cascadeTimers.push(
        setTimeout(() => {
          this.enqueue(i, 'cascade')
        }, delay)
      )
      delay += 50
    }
  }

  private enqueue(index: number, priority: 'immediate' | 'cascade'): void {
    if (this.destroyed) return
    if (!this.urlResolver) return

    const url = this.urlResolver(index)
    if (!url) return
    if (this.active.has(url)) return

    if (priority === 'cascade' && this.active.size >= this.maxConcurrent) {
      return
    }

    const controller = new AbortController()
    fetch(url, { signal: controller.signal }).catch(() => {
      this.active.delete(url)
    })

    const task: PreloadTask = { url, index, controller, priority }
    this.active.set(url, task)
  }

  private cancelFarIndices(_visibleStart: number, _visibleEnd: number): void {
    const retainAbove = 5
    const visibleStart = Math.max(0, _visibleStart)
    const keepAbove = Math.max(0, visibleStart - retainAbove)

    for (const [url, task] of this.active) {
      if (task.priority === 'cascade' && task.index < keepAbove) {
        task.controller.abort()
        this.active.delete(url)
      }
    }
  }

  private cancelAll(): void {
    for (const timer of this.cascadeTimers) {
      clearTimeout(timer)
    }
    this.cascadeTimers = []

    for (const [, task] of this.active) {
      task.controller.abort()
    }
    this.active.clear()
  }
}

export const preloadEngine = new PreloadEngine()
