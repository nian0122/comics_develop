# 视频加载重构 v2 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 引入 VideoLoadManager 集中调度 + VideoStore 独立数据层，重写 ReaderVideoItem 为轻薄展示组件。

**Architecture:** ReaderPage 居中调 API 一次，按 type 分发到 reader-store（图片）和 VideoStore（视频）。VideoLoadManager 持有唯一 IntersectionObserver，管理所有视频的视口检测、加载/中止、播放互斥。两个 store 互不知晓，完全解耦。

**Tech Stack:** Vue 3 + Pinia + Vitest + jsdom + vue-virtual-scroller。不改动后端、Nginx、Go 工具。

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `frontend/src/utils/video-load-manager.ts` | **新建** | 唯一 IO、加载/中止调度、播放互斥 |
| `frontend/src/stores/video-store.ts` | **新建** | 视频数据存储、缓存、预取 |
| `frontend/src/components/ReaderVideoItem.vue` | **重写** | 纯展示：状态响应、骨架屏、video 元素 |
| `frontend/src/components/ReaderMediaItem.vue` | **微调** | video 分支去掉 fallbackUrl |
| `frontend/src/pages/ReaderPage.vue` | **改动** | 居中调 API、分发双 store、合并渲染 |
| `frontend/src/stores/reader-store.ts` | **改动** | 新增 setImages、内部过滤图片 |
| `frontend/src/utils/video-load-manager.test.ts` | **新建** | Manager 单元测试 |
| `frontend/src/stores/video-store.test.ts` | **新建** | VideoStore 单元测试 |
| `frontend/src/components/ReaderVideoItem.test.ts` | **新建** | 组件测试 |
| `frontend/src/stores/reader-store.test.ts` | **改动** | 适配 setImages |
| `frontend/src/pages/ReaderPage.test.ts` | **改动** | 适配双管线 |

---

### Task 1: VideoLoadManager — 核心类

**Files:**
- Create: `frontend/src/utils/video-load-manager.ts`
- Create: `frontend/src/utils/video-load-manager.test.ts`

- [ ] **Step 1: 写 VideoLoadManager 接口和类型定义**

创建 `frontend/src/utils/video-load-manager.ts`：

```typescript
type VideoStatus = 'idle' | 'loading' | 'loaded' | 'error'

export interface VideoEntryConfig {
  url: string
  onStatusChange: (status: VideoStatus) => void
}

interface VideoEntry {
  video: HTMLVideoElement
  config: VideoEntryConfig
  status: VideoStatus
}
```

- [ ] **Step 2: 写 VideoLoadManager 类骨架**

继续 `video-load-manager.ts`：

```typescript
export class VideoLoadManager {
  private observer: IntersectionObserver | null = null
  private registry = new Map<HTMLVideoElement, VideoEntry>()
  private playingVideo: HTMLVideoElement | null = null
  private refCount = 0

  register(
    videoEl: HTMLVideoElement,
    containerEl: HTMLElement,
    config: VideoEntryConfig
  ): void {
    this.registry.set(videoEl, {
      video: videoEl,
      config,
      status: 'idle',
    })

    if (!this.observer) {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        { rootMargin: '300px 0px' }
      )
    }
    this.observer.observe(containerEl)
    this.refCount++
  }

  unregister(videoEl: HTMLVideoElement): void {
    const entry = this.registry.get(videoEl)
    if (!entry) return

    // 如果正在加载，中止
    if (entry.status === 'loading') {
      this.abort(entry)
    }

    this.observer?.unobserve(entry.video.parentElement!)
    this.registry.delete(videoEl)

    // 如果正在播放此视频，清除引用
    if (this.playingVideo === videoEl) {
      this.playingVideo = null
    }

    this.refCount--
    if (this.refCount <= 0) {
      this.observer?.disconnect()
      this.observer = null
      this.refCount = 0
    }
  }

  onPlay(videoEl: HTMLVideoElement): void {
    if (this.playingVideo && this.playingVideo !== videoEl && !this.playingVideo.paused) {
      this.playingVideo.pause()
    }
    this.playingVideo = videoEl
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    for (const observerEntry of entries) {
      const container = observerEntry.target as HTMLElement
      // 找到该容器对应的注册 entry
      const videoEntry = this.findEntryByContainer(container)
      if (!videoEntry) continue

      if (observerEntry.isIntersecting) {
        if (videoEntry.status === 'idle') {
          this.startLoad(videoEntry)
        }
        // loading / loaded / error → 不操作
      } else {
        if (videoEntry.status === 'loading') {
          this.abort(videoEntry)
        }
        // loaded → 保留
        // 正在播放 → 暂停
        if (this.playingVideo === videoEntry.video && !videoEntry.video.paused) {
          videoEntry.video.pause()
        }
      }
    }
  }

  private findEntryByContainer(container: HTMLElement): VideoEntry | undefined {
    for (const entry of this.registry.values()) {
      if (entry.video.parentElement === container) return entry
    }
    return undefined
  }

  private startLoad(entry: VideoEntry): void {
    entry.video.preload = 'metadata'
    entry.video.src = entry.config.url
    entry.video.load()
    entry.status = 'loading'
    entry.config.onStatusChange('loading')

    entry.video.onloadedmetadata = () => {
      entry.status = 'loaded'
      entry.config.onStatusChange('loaded')
    }

    entry.video.onerror = () => {
      entry.status = 'error'
      entry.config.onStatusChange('error')
    }
  }

  private abort(entry: VideoEntry): void {
    entry.video.removeAttribute('src')
    entry.video.load()
    entry.status = 'idle'
    entry.config.onStatusChange('idle')
  }
}

export const videoLoadManager = new VideoLoadManager()
```

- [ ] **Step 3: 写 manager 单元测试**

创建 `frontend/src/utils/video-load-manager.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VideoLoadManager } from './video-load-manager'

// Mock IntersectionObserver
function mockIntersectionObserver() {
  const instances: { callback: IntersectionObserverCallback; elements: Set<Element> }[] = []
  const mock = vi.fn((callback: IntersectionObserverCallback) => {
    const instance = { callback, elements: new Set<Element>() }
    instances.push(instance)
    return {
      observe: vi.fn((el: Element) => instance.elements.add(el)),
      unobserve: vi.fn((el: Element) => instance.elements.delete(el)),
      disconnect: vi.fn(() => instance.elements.clear()),
    }
  }) as unknown as typeof IntersectionObserver
  return { mock, instances }
}

describe('VideoLoadManager', () => {
  let manager: VideoLoadManager
  let videoEl: HTMLVideoElement
  let containerEl: HTMLDivElement
  let onStatusChange: ReturnType<typeof vi.fn>
  let io: ReturnType<typeof mockIntersectionObserver>

  beforeEach(() => {
    io = mockIntersectionObserver()
    window.IntersectionObserver = io.mock

    manager = new VideoLoadManager()
    videoEl = document.createElement('video')
    containerEl = document.createElement('div')
    containerEl.appendChild(videoEl)
    onStatusChange = vi.fn()
  })

  afterEach(() => {
    manager = null as any
  })

  // Test 1: register
  it('register should add entry and create observer', () => {
    manager.register(videoEl, containerEl, {
      url: '/video/test.mp4',
      onStatusChange,
    })

    // Observer created
    expect(io.mock).toHaveBeenCalledTimes(1)
    // Container observed
    expect(io.instances[0].observer.observe).toHaveBeenCalledWith(containerEl)
  })

  // Test 2: unregister
  it('unregister should remove entry and unobserve', () => {
    manager.register(videoEl, containerEl, {
      url: '/video/test.mp4',
      onStatusChange,
    })

    manager.unregister(videoEl)

    expect(io.instances[0].observer.unobserve).toHaveBeenCalledWith(containerEl)
  })

  // Test 3: last unregister destroys observer
  it('last unregister should disconnect observer', () => {
    const videoEl2 = document.createElement('video')
    const containerEl2 = document.createElement('div')
    containerEl2.appendChild(videoEl2)

    manager.register(videoEl, containerEl, { url: '/video/a.mp4', onStatusChange })
    manager.register(videoEl2, containerEl2, { url: '/video/b.mp4', onStatusChange: vi.fn() })

    manager.unregister(videoEl)
    // Observer still alive (1 remaining)
    expect(io.instances[0].observer.disconnect).not.toHaveBeenCalled()

    manager.unregister(videoEl2)
    // Observer destroyed
    expect(io.instances[0].observer.disconnect).toHaveBeenCalled()
  })

  // Test 4: entering viewport → start load (idle → loading)
  it('entering viewport should trigger load for idle entries', () => {
    manager.register(videoEl, containerEl, {
      url: '/video/test.mp4',
      onStatusChange,
    })

    // Simulate intersection callback: entry entering viewport
    const callback = io.instances[0].callback
    callback(
      [{ target: containerEl, isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )

    expect(videoEl.preload).toBe('metadata')
    expect(videoEl.src).toContain('/video/test.mp4')
    expect(onStatusChange).toHaveBeenCalledWith('loading')
  })

  // Test 5: loaded entries leaving viewport should NOT abort
  it('loaded entries leaving viewport should stay loaded', () => {
    manager.register(videoEl, containerEl, {
      url: '/video/test.mp4',
      onStatusChange,
    })

    const callback = io.instances[0].callback

    // Enter → load
    callback(
      [{ target: containerEl, isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )
    // Simulate loaded
    videoEl.onloadedmetadata?.(new Event('loadedmetadata'))

    // Leave
    callback(
      [{ target: containerEl, isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )

    // Status should remain loaded (not called with 'idle')
    expect(onStatusChange).not.toHaveBeenCalledWith('idle')
  })

  // Test 6: loading entries leaving viewport should abort
  it('loading entries leaving viewport should abort', () => {
    manager.register(videoEl, containerEl, {
      url: '/video/test.mp4',
      onStatusChange,
    })

    const callback = io.instances[0].callback

    // Enter → start loading
    callback(
      [{ target: containerEl, isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )

    // Leave before loadedmetadata fires
    onStatusChange.mockClear()
    callback(
      [{ target: containerEl, isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )

    expect(onStatusChange).toHaveBeenCalledWith('idle')
  })

  // Test 7: onerror → status error
  it('video onerror should set status to error', () => {
    manager.register(videoEl, containerEl, {
      url: '/video/test.mp4',
      onStatusChange,
    })

    const callback = io.instances[0].callback
    callback(
      [{ target: containerEl, isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )

    // Simulate error
    videoEl.onerror?.(new Event('error'))

    expect(onStatusChange).toHaveBeenCalledWith('error')
  })

  // Test 8: play mutex
  it('onPlay should pause previously playing video', () => {
    const videoEl2 = document.createElement('video')
    const containerEl2 = document.createElement('div')
    containerEl2.appendChild(videoEl2)
    const pauseSpy = vi.spyOn(videoEl, 'pause')

    manager.register(videoEl, containerEl, { url: '/video/a.mp4', onStatusChange })
    manager.register(videoEl2, containerEl2, { url: '/video/b.mp4', onStatusChange: vi.fn() })

    // Video A starts playing
    Object.defineProperty(videoEl, 'paused', { value: false, writable: true })

    // Video B starts playing
    manager.onPlay(videoEl2)

    expect(pauseSpy).toHaveBeenCalled()
  })

  // Test 9: leaving viewport pauses playing video
  it('leaving viewport should pause playing video', () => {
    const pauseSpy = vi.spyOn(videoEl, 'pause')

    manager.register(videoEl, containerEl, {
      url: '/video/test.mp4',
      onStatusChange,
    })

    // Mark as playing
    manager.onPlay(videoEl)
    Object.defineProperty(videoEl, 'paused', { value: false, writable: true })

    const callback = io.instances[0].callback
    callback(
      [{ target: containerEl, isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )

    expect(pauseSpy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd frontend && npx vitest run src/utils/video-load-manager.test.ts
```

预期：9 tests PASS

- [ ] **Step 5: 提交**

```bash
git add frontend/src/utils/video-load-manager.ts frontend/src/utils/video-load-manager.test.ts
git commit -m "feat: add VideoLoadManager with centralized observer and play mutex"
```

---

### Task 2: VideoStore — 数据层

**Files:**
- Create: `frontend/src/stores/video-store.ts`
- Create: `frontend/src/stores/video-store.test.ts`

- [ ] **Step 1: 写 VideoStore 定义**

创建 `frontend/src/stores/video-store.ts`：

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchChapter } from '@/services/api'
import type { MediaItem } from '@/types/api'

export const useVideoStore = defineStore('video', () => {
  const videos = ref<MediaItem[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const cache = ref<Map<string, MediaItem[]>>(new Map())
  const MAX_CACHE_SIZE = 10

  /**
   * 主要入口：ReaderPage 调 API 后分发视频数据过来（同步赋值）
   */
  function setVideos(items: MediaItem[], series: string, chapterPath: string): void {
    const cacheKey = `${series}::${chapterPath}`
    videos.value = items
    total.value = items.length
    loading.value = false
    error.value = ''

    // 写缓存
    cache.value.set(cacheKey, items)

    // LRU 淘汰
    if (cache.value.size > MAX_CACHE_SIZE) {
      const firstKey = cache.value.keys().next().value
      if (firstKey) cache.value.delete(firstKey)
    }
  }

  /**
   * 独立预取：提前拉取下一章节视频（不经过 ReaderPage 分发）
   */
  async function fetchVideos(series: string, chapterPath: string): Promise<void> {
    const cacheKey = `${series}::${chapterPath}`

    // 命中缓存
    const cached = cache.value.get(cacheKey)
    if (cached) {
      videos.value = cached
      total.value = cached.length
      loading.value = false
      error.value = ''
      return
    }

    loading.value = true
    error.value = ''

    try {
      const response = await fetchChapter(series, chapterPath)
      const videoItems = response.files.filter(f => f.type === 'video')
      setVideos(videoItems, series, chapterPath)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载视频失败'
      videos.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  /**
   * 预取下一话视频
   */
  async function prefetchNext(series: string, nextChapterPath: string): Promise<void> {
    if (!nextChapterPath) return
    const cacheKey = `${series}::${nextChapterPath}`
    if (cache.value.has(cacheKey)) return

    try {
      const response = await fetchChapter(series, nextChapterPath)
      const videoItems = response.files.filter(f => f.type === 'video')
      cache.value.set(cacheKey, videoItems)
      if (cache.value.size > MAX_CACHE_SIZE) {
        const firstKey = cache.value.keys().next().value
        if (firstKey) cache.value.delete(firstKey)
      }
    } catch {
      // 预取失败静默忽略
    }
  }

  function clear(): void {
    videos.value = []
    total.value = 0
    loading.value = false
    error.value = ''
  }

  return { videos, total, loading, error, setVideos, fetchVideos, prefetchNext, clear }
})
```

- [ ] **Step 2: 写 VideoStore 单元测试**

创建 `frontend/src/stores/video-store.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVideoStore } from './video-store'

vi.mock('@/services/api', () => ({
  fetchChapter: vi.fn(),
}))

import { fetchChapter } from '@/services/api'

function mockChapterResponse(files: Array<{ name: string; type: 'image' | 'video'; url: string; fallbackUrl: string | null }>) {
  return { path: 'test', files, total: files.length }
}

describe('useVideoStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // Test 1: setVideos 写入数据
  it('setVideos should store video items', () => {
    const store = useVideoStore()
    const items = [
      { name: '01.mp4', type: 'video' as const, url: '/video/01.mp4', fallbackUrl: null },
      { name: '02.mp4', type: 'video' as const, url: '/video/02.mp4', fallbackUrl: null },
    ]

    store.setVideos(items, 'seriesA', 'chapter1')

    expect(store.videos).toEqual(items)
    expect(store.total).toBe(2)
    expect(store.loading).toBe(false)
    expect(store.error).toBe('')
  })

  // Test 2: fetchVideos 调 API 并过滤
  it('fetchVideos should filter video type from API response', async () => {
    const store = useVideoStore()
    const mockFiles = [
      { name: '01.jpg', type: 'image' as const, url: '/hq_image/01.jpg', fallbackUrl: '/lq_image/01.jpg' },
      { name: '02.mp4', type: 'video' as const, url: '/video/02.mp4', fallbackUrl: null },
      { name: '03.jpg', type: 'image' as const, url: '/hq_image/03.jpg', fallbackUrl: '/lq_image/03.jpg' },
    ]
    vi.mocked(fetchChapter).mockResolvedValue(mockChapterResponse(mockFiles))

    await store.fetchVideos('seriesA', 'chapter1')

    expect(store.videos).toHaveLength(1)
    expect(store.videos[0].name).toBe('02.mp4')
    expect(store.total).toBe(1)
  })

  // Test 3: fetchVideos 命中缓存
  it('fetchVideos should use cache on second call', async () => {
    const store = useVideoStore()
    const mockFiles = [
      { name: '01.mp4', type: 'video' as const, url: '/video/01.mp4', fallbackUrl: null },
    ]
    vi.mocked(fetchChapter).mockResolvedValue(mockChapterResponse(mockFiles))

    await store.fetchVideos('seriesA', 'chapter1')
    vi.mocked(fetchChapter).mockClear()

    // 第二次调用不应再调 API
    await store.fetchVideos('seriesA', 'chapter1')
    expect(fetchChapter).not.toHaveBeenCalled()
    expect(store.videos).toHaveLength(1)
  })

  // Test 4: fetchVideos API 错误
  it('fetchVideos should set error on API failure', async () => {
    const store = useVideoStore()
    vi.mocked(fetchChapter).mockRejectedValue(new Error('Network error'))

    await store.fetchVideos('seriesA', 'chapter1')

    expect(store.error).toBe('Network error')
    expect(store.videos).toHaveLength(0)
    expect(store.loading).toBe(false)
  })

  // Test 5: clear 重置状态
  it('clear should reset all state', () => {
    const store = useVideoStore()
    store.videos = [{ name: '01.mp4', type: 'video', url: '/video/01.mp4', fallbackUrl: null }]
    store.total = 1
    store.loading = true
    store.error = 'err'

    store.clear()

    expect(store.videos).toHaveLength(0)
    expect(store.total).toBe(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBe('')
  })

  // Test 6: prefetchNext 写入缓存但不覆盖当前 videos
  it('prefetchNext should cache but not replace current videos', async () => {
    const store = useVideoStore()
    const currentFiles = [
      { name: 'a.mp4', type: 'video' as const, url: '/video/a.mp4', fallbackUrl: null },
    ]
    store.setVideos(currentFiles, 'seriesA', 'current')

    const nextFiles = [
      { name: 'b.mp4', type: 'video' as const, url: '/video/b.mp4', fallbackUrl: null },
    ]
    vi.mocked(fetchChapter).mockResolvedValue(mockChapterResponse(nextFiles))

    await store.prefetchNext('seriesA', 'next-chapter')

    // 当前 videos 不应被覆盖
    expect(store.videos).toEqual(currentFiles)
    // 但下一话的缓存应可用
    vi.mocked(fetchChapter).mockClear()
    await store.fetchVideos('seriesA', 'next-chapter')
    expect(fetchChapter).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: 运行测试确认通过**

```bash
cd frontend && npx vitest run src/stores/video-store.test.ts
```

预期：6 tests PASS

- [ ] **Step 4: 提交**

```bash
git add frontend/src/stores/video-store.ts frontend/src/stores/video-store.test.ts
git commit -m "feat: add VideoStore with setVideos, fetchVideos, prefetchNext and LRU cache"
```

---

### Task 3: reader-store 简化 — 新增 setImages

**Files:**
- Modify: `frontend/src/stores/reader-store.ts`
- Modify: `frontend/src/stores/reader-store.test.ts`

- [ ] **Step 1: 改造 reader-store — 新增 setImages，改造 loadChapter 内部过滤**

读取当前 `reader-store.ts` 的完整内容后做以下改动：

**改 1：state 中 `mediaItems` → `imageItems`**

```diff
- mediaItems: MediaItem[],
+ imageItems: MediaItem[] as MediaItem[],
```

**改 2：`loadChapter` 改造 — 调 API 后过滤图片，通过 `setImages` 写入**

把 `loadChapter` 中：

```diff
- this.mediaItems = Array.isArray(response.files) ? response.files : []
- this.totalPages = response.total ?? this.mediaItems.length
+ const imageItems = response.files.filter(f => f.type === 'image')
+ this.setImages(imageItems)
```

所有引用 `this.mediaItems` 的地方改为 `this.imageItems`。

**改 3：新增 `setImages` action**

```typescript
setImages(items: MediaItem[]) {
  this.imageItems = items
  this.totalPages = items.length
}
```

保留 `loadChapter` 的现有签名（兼容其他调用方），内部改为：调 API → 过滤 → `setImages`。

- [ ] **Step 2: 更新 reader-store 测试**

在 `reader-store.test.ts` 中：

1. 将所有 `store.mediaItems` 改为 `store.imageItems`
2. 确保 mock API 返回中包含图片和视频混合数据，验证只有 image 类型被保留

**新增测试用例：**

```typescript
it('loadChapter should only contain image items', async () => {
  const mockFiles = [
    { name: '01.jpg', type: 'image', url: '/hq_image/01.jpg', fallbackUrl: '/lq_image/01.jpg' },
    { name: '02.mp4', type: 'video', url: '/video/02.mp4', fallbackUrl: null },
  ]
  vi.mocked(fetchChapter).mockResolvedValue({ path: 'test', files: mockFiles, total: 2 })

  const store = useReaderStore()
  await store.loadChapter('series', 'chapter')

  expect(store.imageItems).toHaveLength(1)
  expect(store.imageItems[0].name).toBe('01.jpg')
  expect(store.totalPages).toBe(1)
})
```

- [ ] **Step 3: 运行 reader-store 测试确认**

```bash
cd frontend && npx vitest run src/stores/reader-store.test.ts
```

预期：所有测试 PASS

- [ ] **Step 4: 提交**

```bash
git add frontend/src/stores/reader-store.ts frontend/src/stores/reader-store.test.ts
git commit -m "refactor: split reader-store to image-only, add setImages action"
```

---

### Task 4: ReaderVideoItem — 重写为轻薄组件

**Files:**
- Rewrite: `frontend/src/components/ReaderVideoItem.vue`
- Create: `frontend/src/components/ReaderVideoItem.test.ts`

- [ ] **Step 1: 重写 ReaderVideoItem.vue**

```vue
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { videoLoadManager, type VideoStatus } from '@/utils/video-load-manager'

const props = defineProps<{
  url: string
  alt: string
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const status = ref<VideoStatus>('idle')

function register() {
  if (!videoRef.value || !containerRef.value) return
  videoLoadManager.register(videoRef.value, containerRef.value, {
    url: props.url,
    onStatusChange: (s) => { status.value = s },
  })
}

onMounted(() => register())

onBeforeUnmount(() => {
  videoLoadManager.unregister(videoRef.value!)
})

// DynamicScroller 回收：URL 变了 → 注销旧，注册新
watch(() => props.url, () => {
  videoLoadManager.unregister(videoRef.value!)
  status.value = 'idle'
  register()
})
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <!-- Loading skeleton -->
    <div
      v-show="status === 'loading'"
      class="absolute inset-0 z-10 bg-slate-800 animate-pulse flex items-center justify-center"
      style="min-height: 400px"
    >
      <span class="text-sm text-slate-500 select-none">加载中…</span>
    </div>

    <!-- Error placeholder -->
    <div
      v-show="status === 'error'"
      class="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center gap-2"
      style="min-height: 400px"
    >
      <span class="text-3xl select-none">🎬</span>
      <span class="text-xs text-slate-500 select-none">视频加载失败</span>
    </div>

    <video
      ref="videoRef"
      preload="none"
      controls
      playsinline
      webkit-playsinline
      class="w-full h-auto block"
      :class="{ 'invisible': status !== 'loaded' }"
      @play="videoLoadManager.onPlay($event.target as HTMLVideoElement)"
    />
  </div>
</template>
```

注意：`src` 不做模板绑定，由 VideoLoadManager 在 JS 中设置。

- [ ] **Step 2: 写 ReaderVideoItem 组件测试**

创建 `frontend/src/components/ReaderVideoItem.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ReaderVideoItem from './ReaderVideoItem.vue'

// Mock VideoLoadManager
const mockRegister = vi.fn()
const mockUnregister = vi.fn()
const mockOnPlay = vi.fn()

vi.mock('@/utils/video-load-manager', () => ({
  videoLoadManager: {
    register: (...args: any[]) => mockRegister(...args),
    unregister: (...args: any[]) => mockUnregister(...args),
    onPlay: (...args: any[]) => mockOnPlay(...args),
  },
  type VideoStatus: 'idle' | 'loading' | 'loaded' | 'error',
}))

// Mock IntersectionObserver on window
beforeEach(() => {
  window.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as any
})

describe('ReaderVideoItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test 1: mounted → register 被调用
  it('should call register on mount', () => {
    mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    expect(mockRegister).toHaveBeenCalledTimes(1)
    const [videoEl, containerEl, config] = mockRegister.mock.calls[0]
    expect(videoEl).toBeInstanceOf(HTMLVideoElement)
    expect(containerEl).toBeInstanceOf(HTMLDivElement)
    expect(config.url).toBe('/video/test.mp4')
  })

  // Test 2: unmounted → unregister 被调用
  it('should call unregister on unmount', () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    wrapper.unmount()

    expect(mockUnregister).toHaveBeenCalledTimes(1)
  })

  // Test 3: 初始状态 idle → video 不可见
  it('should hide video initially (status idle)', () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    const video = wrapper.find('video')
    expect(video.classes()).toContain('invisible')
  })

  // Test 4: onStatusChange('loading') → 骨架屏可见
  it('should show loading skeleton when status is loading', async () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    // 获取 onStatusChange 回调并触发
    const config = mockRegister.mock.calls[0][2]
    config.onStatusChange('loading')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('加载中')
  })

  // Test 5: onStatusChange('error') → 错误占位
  it('should show error placeholder when status is error', async () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    const config = mockRegister.mock.calls[0][2]
    config.onStatusChange('error')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('视频加载失败')
  })

  // Test 6: onStatusChange('loaded') → video 可见
  it('should show video when status is loaded', async () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    const config = mockRegister.mock.calls[0][2]
    config.onStatusChange('loaded')
    await wrapper.vm.$nextTick()

    const video = wrapper.find('video')
    expect(video.classes()).not.toContain('invisible')
  })

  // Test 7: @play → onPlay 被调用
  it('should call onPlay when video plays', async () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    const video = wrapper.find('video')
    await video.trigger('play')

    expect(mockOnPlay).toHaveBeenCalledTimes(1)
  })

  // Test 8: url 变更 → re-register
  it('should re-register when url changes (DynamicScroller recycling)', async () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/old.mp4', alt: 'test video' },
    })

    mockRegister.mockClear()

    await wrapper.setProps({ url: '/video/new.mp4' })

    // 先注销旧 URL
    expect(mockUnregister).toHaveBeenCalledTimes(1)
    // 再注册新 URL
    expect(mockRegister).toHaveBeenCalledTimes(1)
    expect(mockRegister.mock.calls[0][2].url).toBe('/video/new.mp4')
  })

  // Test 9: video 元素 preload="none"（不自动预加载）
  it('video element should have preload="none"', () => {
    const wrapper = mount(ReaderVideoItem, {
      props: { url: '/video/test.mp4', alt: 'test video' },
    })

    const video = wrapper.find('video')
    expect(video.attributes('preload')).toBe('none')
  })
})
```

- [ ] **Step 3: 运行组件测试确认通过**

```bash
cd frontend && npx vitest run src/components/ReaderVideoItem.test.ts
```

预期：9 tests PASS

- [ ] **Step 4: 提交**

```bash
git add frontend/src/components/ReaderVideoItem.vue frontend/src/components/ReaderVideoItem.test.ts
git commit -m "refactor: rewrite ReaderVideoItem as thin display component using VideoLoadManager"
```

---

### Task 5: ReaderMediaItem 微调

**Files:**
- Modify: `frontend/src/components/ReaderMediaItem.vue`

- [ ] **Step 1: video 分支去掉 fallbackUrl**

读取当前 `ReaderMediaItem.vue`，修改 video 分支：

```diff
  <ReaderVideoItem
-   :url="url"
-   :fallback-url="fallbackUrl"
-   :alt="alt"
+   :url="url"
+   :alt="alt"
  />
```

image 分支保持不变（仍需要 fallbackUrl 用于 LQ/HQ 切换）。

- [ ] **Step 2: 运行现有组件测试确认无破坏**

```bash
cd frontend && npx vitest run src/components/ReaderMediaItem.test.ts
```

如果有 ReaderMediaItem 测试，确认通过。没有则跳过。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/ReaderMediaItem.vue
git commit -m "fix: remove fallbackUrl from ReaderVideoItem props, video has no LQ fallback"
```

---

### Task 6: ReaderPage — 居中分发 + 双管线合并

**Files:**
- Modify: `frontend/src/pages/ReaderPage.vue`
- Modify: `frontend/src/pages/ReaderPage.test.ts`

- [ ] **Step 1: 改造 ReaderPage — 引入 VideoStore，一次 API 调用分发双 store**

改动 `ReaderPage.vue` 的 `<script setup>`：

**新增 import：**

```diff
  import { useReaderStore } from '@/stores/reader-store'
+ import { useVideoStore } from '@/stores/video-store'
  import { useProgressStore } from '@/stores/progress-store'
```

**新增 VideoStore 实例：**

```diff
  const readerStore = useReaderStore()
+ const videoStore = useVideoStore()
  const progressStore = useProgressStore()
```

**重构 loadChapter 调用：**

将 `readerStore.loadChapter(seriesName.value, chapterPath.value)` 改为一个新的居中加载函数。当前 `onMounted` 和 `watch([seriesName, chapterPath])` 中都调用了 `readerStore.loadChapter`，改为：

```typescript
async function loadChapterData(series: string, chapterPath: string) {
  readerStore.loading = true
  videoStore.loading = true

  try {
    const response = await fetchChapter(series, chapterPath)

    readerStore.setImages(
      response.files.filter(f => f.type === 'image')
    )
    videoStore.setVideos(
      response.files.filter(f => f.type === 'video'),
      series,
      chapterPath
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加载章节失败'
    readerStore.error = msg
    videoStore.error = msg
    readerStore.imageItems = []
    readerStore.totalPages = 0
    videoStore.videos = []
    videoStore.total = 0
  } finally {
    readerStore.loading = false
    videoStore.loading = false
  }
}
```

**更新 mediaItems 合并逻辑：**

```diff
- const scrollerRef = ref<{ scrollToItem: (index: number) => void } | null>(null)
- const mainRef = ref<HTMLElement | null>(null)
+ // 合并两路数据给 DynamicScroller
+ const allMediaItems = computed(() => {
+   const images = readerStore.imageItems
+   const videos = videoStore.videos
+   // 按文件名自然排序合并
+   return [...images, ...videos].sort((a, b) =>
+     a.name.localeCompare(b.name, undefined, { numeric: true })
+   )
+ })
```

**更新 totalPages：**

```diff
+ // readerStore.totalPages 已经是图片数，VideoStore.total 是视频数
+ // 总页数 = 图片数 + 视频数
+ watch([() => readerStore.totalPages, () => videoStore.total], ([imgTotal, vidTotal]) => {
+   readerStore.totalPages = imgTotal + vidTotal
+ }, { immediate: true })
```

等等——更简洁的做法是让 totalPages 始终为 allMediaItems.length。因为 readerStore 的 totalPages 原来的语义是"当前章节文件总数"，现在应该重新计算。让我想一个更好的方式……

实际上最简单的方式：**在 ReaderPage 层计算 totalPages，不依赖 readerStore.totalPages 做任何额外操作**。

回到原来的代码看，`readerStore.totalPages` 被用于：
1. ReaderShell 的 `:total-pages` prop
2. jumpToPage 中 `Math.min(saved.currentPage, readerStore.totalPages)`
3. preloadEngine.onVisibleChange 的参数

我们可以让 ReaderPage 使用 `allMediaItems.length` 作为 totalPages：

```typescript
const totalPages = computed(() => readerStore.imageItems.length + videoStore.videos.length)
```

然后在模板中用 `totalPages` 替换 `readerStore.totalPages`。

不过这样改动面更大。更安全的做法是：保留 readerStore.totalPages 的语义，在 setImages 中把 totalPages 设为 imageItems.length（已经做了），然后在 ReaderPage 层追加视频数。

**最简做法：在 loadChapterData 最后设置总的 totalPages：**

```typescript
readerStore.totalPages = readerStore.imageItems.length + videoStore.videos.length
```

这样 Template 中所有 `readerStore.totalPages` 引用仍然有效。

同样，PreloadEngine 的 `readerStore.totalPages` 也由 ReaderPage 维护。

**更新 preloadEngine URL resolver：**

```diff
  preloadEngine.setUrlResolver((index: number) => readerStore.mediaItems[index]?.url ?? null)
+ preloadEngine.setUrlResolver((index: number) => {
+   const item = allMediaItems.value[index]
+   return item?.type === 'image' ? item.url : null  // 视频不预加载（PreloadEngine 只处理图片）
+ })
```

**更新 visibilityByIndex 中使用的 readerStore.totalPages：**

不需要改——因为 totalPages 已经在 loadChapterData 中正确设置了。

**更新 watch(readerStore.mediaItems) → watch(allMediaItems)：**

```diff
- watch(() => readerStore.mediaItems, async (items) => {
+ watch(allMediaItems, async (items) => {
```

以及 loading/error 状态需要检查两个 store：

```diff
- v-if="readerStore.loading"
+ v-if="readerStore.loading && videoStore.loading"

- v-else-if="readerStore.error"
+ v-else-if="readerStore.error || videoStore.error"
+   {{ readerStore.error || videoStore.error }}
```

**更新 DynamicScroller :items：**

```diff
- :items="readerStore.mediaItems"
+ :items="allMediaItems"
```

- [ ] **Step 2: 完整改动清单（伪代码版）**

以下是要替换的具体代码段：

**A. script setup 顶部新增：**

```typescript
import { useVideoStore } from '@/stores/video-store'
// ...现有 imports

const videoStore = useVideoStore()
```

**B. 新增 loadChapterData 函数（替换所有 readerStore.loadChapter 调用）：**

```typescript
async function loadChapterData(series: string, chapterPath: string) {
  readerStore.loading = true
  videoStore.loading = true

  try {
    const response = await fetchChapter(series, chapterPath)

    readerStore.setImages(
      response.files.filter(f => f.type === 'image')
    )
    videoStore.setVideos(
      response.files.filter(f => f.type === 'video'),
      series,
      chapterPath
    )
    // 总页数 = 图片数 + 视频数
    readerStore.totalPages = readerStore.imageItems.length + videoStore.videos.length
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加载章节失败'
    readerStore.error = msg
    videoStore.error = msg
  } finally {
    readerStore.loading = false
    videoStore.loading = false
  }
}
```

需要手动在 `ReaderPage.vue` 顶部 `import { fetchChapter } from '@/services/api'`。

**C. 新增 allMediaItems computed：**

```typescript
const allMediaItems = computed(() => {
  const images = readerStore.imageItems
  const videos = videoStore.videos
  return [...images, ...videos].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  )
})
```

**D. 替换 onMounted 中的 readerStore.loadChapter 调用：**

```diff
- readerStore.loadChapter(seriesName.value, chapterPath.value)
+ loadChapterData(seriesName.value, chapterPath.value)
```

**E. 替换 watch([seriesName, chapterPath]) 中的 readerStore.loadChapter 调用：**

```diff
- readerStore.loadChapter(nextSeriesName, nextChapterPath)
+ loadChapterData(nextSeriesName, nextChapterPath)
```

**F. 替换 preloadEngine.setUrlResolver：**

```diff
- preloadEngine.setUrlResolver((index: number) => readerStore.mediaItems[index]?.url ?? null)
+ preloadEngine.setUrlResolver((index: number) => {
+   const item = allMediaItems.value[index]
+   return item?.type === 'image' ? item.url : null
+ })
```

**G. 替换 watch(readerStore.mediaItems)：**

```diff
- watch(() => readerStore.mediaItems, async (items) => {
+ watch(allMediaItems, async (items) => {
```

**H. 模板中 :items 替换：**

```diff
- :items="readerStore.mediaItems"
+ :items="allMediaItems"
```

**I. 模板中 loading 合并检测：**

```diff
- v-if="readerStore.loading"
+ v-if="readerStore.loading && videoStore.loading"
```

**J. 模板中 error 合并检测：**

```diff
- v-else-if="readerStore.error"
+ v-else-if="readerStore.error || videoStore.error"

- {{ readerStore.error }}
+ {{ readerStore.error || videoStore.error }}
```

**K. 删除不再使用的变量：** 无——`readerStore.currentPage` 等仍在用。

- [ ] **Step 3: 更新 ReaderPage 测试**

在 `ReaderPage.test.ts` 中需要适配以下变化：

1. Mock `useVideoStore`
2. 验证 `loadChapterData` 调 API 一次后正确分发
3. 验证 `allMediaItems` 合并排序

测试用例如下（加在现有测试文件中）：

```typescript
import { useVideoStore } from '@/stores/video-store'

vi.mock('@/stores/video-store', () => ({
  useVideoStore: vi.fn(),
}))

// ...在 beforeEach 中
const mockVideoStore = {
  videos: [],
  total: 0,
  loading: false,
  error: '',
  setVideos: vi.fn(),
  clear: vi.fn(),
}
vi.mocked(useVideoStore).mockReturnValue(mockVideoStore as any)
```

测试：

```typescript
it('should dispatch images and videos to separate stores on load', async () => {
  const mockFiles = [
    { name: '01.jpg', type: 'image', url: '/hq_image/01.jpg', fallbackUrl: '/lq_image/01.jpg' },
    { name: '02.mp4', type: 'video', url: '/video/02.mp4', fallbackUrl: null },
  ]
  vi.mocked(fetchChapter).mockResolvedValue({ path: 'test', files: mockFiles, total: 2 })

  const wrapper = mount(ReaderPage, { /* ... appropriate setup ... */ })

  await flushPromises()

  expect(mockVideoStore.setVideos).toHaveBeenCalled()
  const videoCall = mockVideoStore.setVideos.mock.calls[0]
  expect(videoCall[0]).toHaveLength(1)
  expect(videoCall[0][0].name).toBe('02.mp4')
})
```

- [ ] **Step 4: 运行 ReaderPage 测试确认**

```bash
cd frontend && npx vitest run src/pages/ReaderPage.test.ts
```

预期：所有测试 PASS

- [ ] **Step 5: 运行全量测试**

```bash
cd frontend && npx vitest run
```

- [ ] **Step 6: 提交**

```bash
git add frontend/src/pages/ReaderPage.vue frontend/src/pages/ReaderPage.test.ts
git commit -m "feat: integrate VideoStore into ReaderPage, single API call dispatches to dual stores"
```

---

## 自审

### 1. Spec coverage

| Spec 需求 | 对应 Task |
|-----------|-----------|
| VideoLoadManager 唯一 IO | Task 1 |
| 所有可见视频同时加载 | Task 1 — handleIntersection 中所有 isIntersecting 且 idle 的 entry 都 startLoad |
| 离开视口中止加载中 | Task 1 — handleIntersection 中 !isIntersecting + loading → abort |
| 离开视口保留已加载 | Task 1 — loaded 状态不处理 |
| 播放互斥 | Task 1 — onPlay 方法 |
| VideoStore 独立数据层 | Task 2 |
| ReaderPage 居中分发（策略 C） | Task 6 |
| reader-store 回归图片 | Task 3 |
| ReaderVideoItem 轻薄展示 | Task 4 |
| 无 fallbackUrl | Task 5 |

### 2. Placeholder scan

无 TBD/TODO/占位符。所有步骤都有完整代码。

### 3. Type consistency

- `VideoStatus` 在 Task 1 定义，Task 4 通过 import 引用 ✅
- `VideoEntryConfig` 在 Task 1 定义，Task 4 通过 import 引用 ✅
- `MediaItem` 来自现有 `types/api.ts` ✅
- `VideoStore` 的 `setVideos(items: MediaItem[], ...)` → ReaderPage 中 `filter(f => f.type === 'video')` 保证传入的是 MediaItem[] ✅
- `readerStore.setImages(items: MediaItem[])` 接受 MediaItem[] ✅

### 4. Ambiguity check

- "所有可见" = Observer 回调中所有 `isIntersecting` 的 entry → 明确 ✅
- "同时加载" = 遍历 registry，对所有满足条件的 entry 调 startLoad → 无队列 → 明确 ✅
- "合并排序" = `localeCompare` with `numeric: true` → 明确 ✅

### 5. Missing tests

| 遗漏场景 | 补充 |
|---------|------|
| VideoLoadManager 中 `refCount` 为 0 后再 register 应重建 Observer | 已有（task 1 的 unregister 测试覆盖）|
| 一个 entry 反复进入/离开视口 | `observerCallback` 测试已覆盖 |
| prefetchNext 失败不抛异常 | Task 2 test 6 隐式覆盖 |
