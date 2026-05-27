type PreloadTask = {
  url: string
  index: number
  image: HTMLImageElement
  priority: 'immediate' | 'cascade'
}

export class PreloadEngine {
  private urlResolver: ((index: number) => string | null) | null = null
  private total = 0
  private active = new Map<string, PreloadTask>()
  private cascadeTimers: ReturnType<typeof setTimeout>[] = []
  private destroyed = false

  setUrlResolver(resolver: (index: number) => string | null): void {
    this.urlResolver = resolver
  }

  reset(total: number): void {
    this.cancelAll()
    this.total = total
    this.active.clear()
    this.destroyed = false
  }

  onVisibleChange(visibleStart: number, visibleEnd: number, total: number): void {
    if (this.destroyed) return
    if (!this.urlResolver) return
    if (total <= 0) return
    if (this.total !== total) {
      this.total = total
    }

    const start = Math.max(0, visibleStart)
    const end = Math.min(visibleEnd, this.total - 1)

    if (start > end) return

    // 清除上一轮 onVisibleChange 遗留的 cascade 定时器，
    // 防止快速滚动时旧回调触发生成无效预加载
    this.clearCascadeTimers()
    this.cancelFarIndices(start, end)
    this.loadImmediate(start, end)
    // loadImmediate 已覆盖 [start-1, end+1]，cascade 从边界外侧开始避免重叠
    this.loadCascadeForward(end + 2)
    this.loadCascadeBackward(start - 2)
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

  private loadCascadeForward(fromIndex: number): void {
    const cascadeCount = 10
    const end = Math.min(fromIndex + cascadeCount - 1, this.total - 1)

    if (fromIndex > end) return

    for (let i = fromIndex; i <= end; i++) {
      const delay = (i - fromIndex) * 80
      this.cascadeTimers.push(
        setTimeout(() => {
          this.enqueue(i, 'cascade')
        }, delay),
      )
    }
  }

  private loadCascadeBackward(fromIndex: number): void {
    const cascadeCount = 10
    const end = Math.max(fromIndex - cascadeCount + 1, 0)

    if (fromIndex < end) return

    for (let i = fromIndex; i >= end; i--) {
      const delay = (fromIndex - i) * 80
      this.cascadeTimers.push(
        setTimeout(() => {
          this.enqueue(i, 'cascade')
        }, delay),
      )
    }
  }

  private enqueue(index: number, priority: 'immediate' | 'cascade'): void {
    if (this.destroyed) return
    if (!this.urlResolver) return

    const url = this.urlResolver(index)
    if (!url) return
    if (this.active.has(url)) return

    // 使用 new Image() 预热浏览器图片解码缓存（下载 + 解码），
    // 而非 fetch() 仅预热 HTTP 缓存。虚拟滚动组件渲染同名 URL 时直接命中，零解码成本。
    const img = new Image()

    img.onerror = () => {
      this.active.delete(url)
    }
    img.src = url

    const task: PreloadTask = { url, index, image: img, priority }
    this.active.set(url, task)
  }

  private clearCascadeTimers(): void {
    for (const timer of this.cascadeTimers) {
      clearTimeout(timer)
    }
    this.cascadeTimers = []
  }

  private cancelFarIndices(_visibleStart: number, _visibleEnd: number): void {
    const retainMargin = 10
    const visibleStart = Math.max(0, _visibleStart)
    const visibleEnd = Math.max(0, _visibleEnd)
    const keepAbove = Math.max(0, visibleStart - retainMargin)
    const keepBelow = Math.min(this.total - 1, visibleEnd + retainMargin)

    for (const [url, task] of this.active) {
      if (task.priority !== 'cascade') continue
      if (task.index < keepAbove || task.index > keepBelow) {
        task.image.src = ''
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
      task.image.src = ''
    }
    this.active.clear()
  }
}

export const preloadEngine = new PreloadEngine()
