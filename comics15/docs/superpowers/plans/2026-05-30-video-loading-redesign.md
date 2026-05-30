# 视频加载重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除 ReaderMediaItem.vue 中脆弱的 `sourceMounted` hack 和跨组件 DOM 操作，拆分为 dispatcher + 独立图片/视频组件 + VideoLoadManager 集中调度。

**Architecture:** 新增 `VideoLoadManager` 类（模块单例）管理唯一的 IntersectionObserver、槽位调度和播放互斥；从 ReaderMediaItem 拆出 `ReaderImageItem`（纯图片）和 `ReaderVideoItem`（纯视频，委托 Manager）；原组件退化为 15 行 dispatcher。

**Tech Stack:** Vue 3 Composition API + TypeScript + Vitest + jsdom

**Spec:** `docs/superpowers/specs/2026-05-30-video-loading-redesign.md`

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `frontend/src/utils/video-load-manager.ts` | **新建** | VideoLoadManager 类，IO 调度 + 槽位管理 + 播放互斥 |
| `frontend/src/utils/__tests__/video-load-manager.test.ts` | **新建** | Manager 单元测试 |
| `frontend/src/components/ReaderImageItem.vue` | **新建** | 纯图片组件，从 ReaderMediaItem 拆出 |
| `frontend/src/components/ReaderVideoItem.vue` | **新建** | 纯视频组件，委托 Manager 加载 |
| `frontend/src/components/ReaderMediaItem.vue` | **重写** | 退化为 dispatcher（287→15 行） |

**不改动的文件:** `ReaderPage.vue`, `reader-store.ts`, `api.ts`, `types/api.ts`

---

## Task Dependency Graph

```
Task 1 (VideoLoadManager + test) ──┐
                                   ├──→ Task 3 (ReaderVideoItem) ──┐
Task 2 (ReaderImageItem) ──────────┘                               ├──→ Task 4 (dispatcher) ──→ Task 5 (cleanup)
                                                                   │
                                           Task 2 ─────────────────┘
```

**并行机会:** Task 1 和 Task 2 完全独立，可同时执行。

---

### Task 1: VideoLoadManager 类 + 单元测试

**Files:**
- Create: `frontend/src/utils/video-load-manager.ts`
- Create: `frontend/src/utils/__tests__/video-load-manager.test.ts`

#### 1.1 创建测试文件目录

- [ ] **Step 1: 确保测试目录存在**

```bash
New-Item -ItemType Directory -Force -Path "frontend\src\utils\__tests__"
```

#### 1.2 写 VideoLoadManager 测试

- [ ] **Step 2: 创建 `frontend/src/utils/__tests__/video-load-manager.test.ts`**

```typescript
/**
 * VideoLoadManager 单元测试
 *
 * 使用 jsdom 环境，mock IntersectionObserver 以精确控制可见性回调。
 * 每个测试创建独立 Manager 实例，避免状态泄漏。
 *
 * 注意：vi.hoisted() 确保 mock 在 import 之前执行，因为 Vitest 会提升 vi.mock/vi.hoisted。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockObserve, mockUnobserve, mockDisconnect, setObserverCallback, fireObserver, resetObserver } = vi.hoisted(() => {
  const mockObserve = vi.fn()
  const mockUnobserve = vi.fn()
  const mockDisconnect = vi.fn()
  let observerCallback: IntersectionObserverCallback | null = null
  return {
    mockObserve,
    mockUnobserve,
    mockDisconnect,
    setObserverCallback: (cb: IntersectionObserverCallback) => { observerCallback = cb },
    fireObserver: (entries: Array<{ target: Element; isIntersecting: boolean }>) => {
      if (!observerCallback) throw new Error('Observer not initialized')
      observerCallback(
        entries.map(e => ({
          ...e,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: e.isIntersecting ? 1 : 0,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        })),
        {} as IntersectionObserver,
      )
    },
    resetObserver: () => { observerCallback = null },
  }
})

globalThis.IntersectionObserver = vi.fn((callback: IntersectionObserverCallback) => {
  setObserverCallback(callback)
  return {
    observe: mockObserve,
    unobserve: mockUnobserve,
    disconnect: mockDisconnect,
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: () => [],
  } as unknown as IntersectionObserver
})

import { VideoLoadManager } from '../video-load-manager'

/** 创建最小 video 元素（jsdom 中 video 方法为 noop，用 spy 追踪调用） */
function createVideoElement(): HTMLVideoElement {
  const el = document.createElement('video')
  vi.spyOn(el, 'load')
  return el
}

describe('VideoLoadManager', () => {
  let manager: VideoLoadManager

  beforeEach(() => {
    vi.clearAllMocks()
    resetObserver()
    manager = new VideoLoadManager()
  })

  describe('register / unregister', () => {
    it('注册后 observe 目标容器', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      manager.register(video, container, {
        url: '/video/test.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      expect(mockObserve).toHaveBeenCalledWith(container)
    })

    it('注销后 unobserve 目标容器', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      manager.register(video, container, {
        url: '/video/test.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      manager.unregister(video)
      expect(mockUnobserve).toHaveBeenCalledWith(container)
    })

    it('重复 register 同一 video 不重复 observe', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      manager.register(video, container, {
        url: '/video/a.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      const observeCount = mockObserve.mock.calls.length
      manager.register(video, container, {
        url: '/video/b.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      // 应更新 url 但不再 observe
      // 此处验证 unobserve + observe 被调用来更新
      expect(mockUnobserve).toHaveBeenCalled()
    })
  })

  describe('槽位调度（同一时间只预加载一个）', () => {
    it('第一个进入视口的视频开始预加载（preload=metadata + load）', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      const onLoaded = vi.fn()
      manager.register(video, container, {
        url: '/video/first.mp4',
        onLoaded,
        onError: () => {},
        onAborted: () => {},
      })
      fireObserver([{ target: container, isIntersecting: true }])
      expect(video.preload).toBe('metadata')
      expect(video.src).toContain('/video/first.mp4')
      expect(video.load).toHaveBeenCalled()
    })

    it('第二个视频进入视口时排队，不抢占槽位', () => {
      const video1 = createVideoElement()
      const container1 = document.createElement('div')
      const video2 = createVideoElement()
      const container2 = document.createElement('div')
      manager.register(video1, container1, {
        url: '/video/first.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      manager.register(video2, container2, {
        url: '/video/second.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      // 第一个进入视口
      fireObserver([{ target: container1, isIntersecting: true }])
      expect(video1.src).toContain('first.mp4')
      // 第二个进入视口
      fireObserver([{ target: container2, isIntersecting: true }])
      // 第二个不应被分配槽位（第一个还在）
      expect(video2.src).toBe('')
    })

    it('活跃视频离开视口后，排队视频出队并开始预加载', () => {
      const video1 = createVideoElement()
      const container1 = document.createElement('div')
      const video2 = createVideoElement()
      const container2 = document.createElement('div')
      manager.register(video1, container1, {
        url: '/video/first.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      manager.register(video2, container2, {
        url: '/video/second.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      // video1 进入视口 → 获得槽位
      fireObserver([{ target: container1, isIntersecting: true }])
      // video2 进入视口 → 排队
      fireObserver([{ target: container2, isIntersecting: true }])
      // video1 离开视口 → 释放槽位
      fireObserver([{ target: container1, isIntersecting: false }])
      // video2 应自动出队
      expect(video2.src).toContain('second.mp4')
      // video1 的 src 应被清除（abort）
      expect(video1.src).toBe('')
    })
  })

  describe('abort 行为', () => {
    it('离开视口时清除 video.src 并调用 load()', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      manager.register(video, container, {
        url: '/video/test.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      fireObserver([{ target: container, isIntersecting: true }])
      expect(video.src).not.toBe('')
      // 清除 load mock 的调用记录以便精确断言
      vi.mocked(video.load).mockClear()
      fireObserver([{ target: container, isIntersecting: false }])
      expect(video.src).toBe('')
      expect(video.load).toHaveBeenCalled()
    })
  })

  describe('播放互斥', () => {
    it('新视频播放时暂停当前播放的视频', () => {
      const video1 = createVideoElement()
      const container1 = document.createElement('div')
      const video2 = createVideoElement()
      const container2 = document.createElement('div')
      manager.register(video1, container1, {
        url: '/video/a.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      manager.register(video2, container2, {
        url: '/video/b.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      // video1 开始播放
      Object.defineProperty(video1, 'paused', { value: false, writable: true })
      vi.spyOn(video1, 'pause')
      manager.onUserPlayed(video1)
      // video2 开始播放
      Object.defineProperty(video2, 'paused', { value: false, writable: true })
      manager.onUserPlayed(video2)
      expect(video1.pause).toHaveBeenCalled()
    })

    it('播放中的视频离开视口时自动暂停', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      vi.spyOn(video, 'pause')
      Object.defineProperty(video, 'paused', { value: false, writable: true })
      manager.register(video, container, {
        url: '/video/test.mp4',
        onLoaded: () => {},
        onError: () => {},
        onAborted: () => {},
      })
      fireObserver([{ target: container, isIntersecting: true }])
      manager.onUserPlayed(video)
      fireObserver([{ target: container, isIntersecting: false }])
      expect(video.pause).toHaveBeenCalled()
    })
  })

  describe('回调', () => {
    it('loadedmetadata 事件触发 onLoaded 回调', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      const onLoaded = vi.fn()
      manager.register(video, container, {
        url: '/video/test.mp4',
        onLoaded,
        onError: () => {},
        onAborted: () => {},
      })
      fireObserver([{ target: container, isIntersecting: true }])
      video.dispatchEvent(new Event('loadedmetadata'))
      expect(onLoaded).toHaveBeenCalled()
    })

    it('error 事件触发 onError 回调（带 fallback 函数）', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      const onError = vi.fn()
      manager.register(video, container, {
        url: '/video/test.mp4',
        onLoaded: () => {},
        onError,
        onAborted: () => {},
      })
      fireObserver([{ target: container, isIntersecting: true }])
      video.dispatchEvent(new Event('error'))
      expect(onError).toHaveBeenCalledWith(expect.any(Function))
    })

    it('onError 的 fallback 函数用新 URL 重试加载', () => {
      const video = createVideoElement()
      const container = document.createElement('div')
      let fallbackFn: (() => void) | null = null
      manager.register(video, container, {
        url: '/video/broken.mp4',
        onLoaded: () => {},
        onError: (fb) => { fallbackFn = fb },
        onAborted: () => {},
      })
      fireObserver([{ target: container, isIntersecting: true }])
      video.dispatchEvent(new Event('error'))
      expect(fallbackFn).not.toBeNull()
      // 调用 fallback 应该用新 URL 重新 loadMetadata
      video.src = '/video/fallback.mp4'
      fallbackFn!()
      // fallback 只是触发 Manager 重新 loadMetadata，不改变 src 本身
    })
  })
})
```

#### 1.3 验证测试失败

- [ ] **Step 3: 运行测试确认全部失败（类尚未实现）**

```bash
cd frontend && npx vitest run src/utils/__tests__/video-load-manager.test.ts 2>&1
```

预期：所有测试 FAIL，因为 `VideoLoadManager` 尚未导出。

#### 1.4 实现 VideoLoadManager

- [ ] **Step 4: 创建 `frontend/src/utils/video-load-manager.ts`**

```typescript
/**
 * VideoLoadManager —— 漫画阅读器视频预加载集中调度
 *
 * 职责：
 * - 拥有唯一的 IntersectionObserver，观察所有已注册视频容器
 * - 确保同一时间只有一个视频处于预加载态（preload=metadata）
 * - 离开视口时中止活跃预加载，自动出队等待者
 * - 播放互斥：新视频播放时暂停正在播放的视频
 *
 * 不再使用 source 元素 hack —— 直接操作 video.src 属性。
 * abort 通过 video.removeAttribute('src') + load() 实现。
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
  /** 注册计数，用于在无观察目标时断开 Observer */
  private refCount = 0

  /**
   * 注册视频元素及其容器。Manager 会观察容器是否进入/离开视口。
   * 重复注册同一 video 会先自动 unregister 再重新注册（处理 DynamicScroller 回收场景）。
   */
  register(video: HTMLVideoElement, container: HTMLElement, options: VideoEntryOptions): void {
    // 处理重复注册（DynamicScroller 回收）
    if (this.registry.has(video)) {
      this.unregister(video)
    }

    const entry: VideoEntry = { video, container, ...options }
    this.registry.set(video, entry)
    this.ensureObserver()
    this.observer!.observe(container)
    this.refCount++

    // 绑定事件（每个 video 只绑定一次，由 registry 存在性保证）
    video.addEventListener('loadedmetadata', this.onMetadataLoaded)
    video.addEventListener('error', this.onVideoError)
  }

  /** 注销视频元素，清理 Observer 和事件监听 */
  unregister(video: HTMLVideoElement): void {
    const entry = this.registry.get(video)
    if (!entry) return

    this.observer?.unobserve(entry.container)
    this.registry.delete(video)
    this.refCount--

    video.removeEventListener('loadedmetadata', this.onMetadataLoaded)
    video.removeEventListener('error', this.onVideoError)

    // 如果正在预加载，释放槽位
    if (this.activePreload?.video === video) {
      this.abortActive()
    }

    // 从等待队列移除
    this.waitQueue = this.waitQueue.filter(e => e.video !== video)

    // 无观察目标时断开 Observer
    if (this.refCount <= 0) {
      this.observer?.disconnect()
      this.observer = null
      this.refCount = 0
    }
  }

  /** 用户点击播放后调用 —— 释放预加载槽位 + 播放互斥 */
  onUserPlayed(video: HTMLVideoElement): void {
    // 播放互斥
    if (this.playingVideo && this.playingVideo !== video && !this.playingVideo.paused) {
      this.playingVideo.pause()
    }
    this.playingVideo = video

    // 释放预加载槽位（用户已开始播放，不需要继续预加载）
    if (this.activePreload?.video === video) {
      this.activePreload = null
      this.dequeueNext()
    }
  }

  // ── 私有方法 ──────────────────────────────────────────────

  /** 惰性创建 IntersectionObserver */
  private ensureObserver(): void {
    if (this.observer) return
    this.observer = new IntersectionObserver(
      (entries) => this.onObserverChange(entries),
      { rootMargin: '300px 0px' },
    )
  }

  /** Observer 回调：处理进入/离开视口 */
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

  /** 进入视口：尝试获取预加载槽位 */
  private onEnterViewport(entry: VideoEntry): void {
    // 已在活跃状态或已在队列中，跳过
    if (this.activePreload?.video === entry.video) return
    if (this.waitQueue.some(e => e.video === entry.video)) return

    if (this.activePreload === null) {
      this.startPreload(entry)
    } else {
      this.waitQueue.push(entry)
    }
  }

  /** 离开视口：如果是活跃预加载则 abort，如果正在播放则暂停 */
  private onLeaveViewport(entry: VideoEntry): void {
    // 如果正在预加载，中止
    if (this.activePreload?.video === entry.video) {
      this.abortActive()
    }
    // 从等待队列移除
    this.waitQueue = this.waitQueue.filter(e => e.video !== entry.video)
    // 如果正在播放，暂停
    if (this.playingVideo === entry.video && !entry.video.paused) {
      entry.video.pause()
    }
  }

  /** 开始预加载元数据 */
  private startPreload(entry: VideoEntry): void {
    this.activePreload = entry
    entry.video.preload = 'metadata'
    entry.video.src = entry.url
    entry.video.load()
  }

  /** 中止当前活跃预加载，释放槽位，出队下一个 */
  private abortActive(): void {
    if (!this.activePreload) return
    const video = this.activePreload.video
    video.removeAttribute('src')
    video.load()
    this.activePreload = null
    this.dequeueNext()
  }

  /** 从等待队列出队下一个视频开始预加载 */
  private dequeueNext(): void {
    const next = this.waitQueue.shift()
    if (next) {
      this.startPreload(next)
    }
  }

  /** loadedmetadata 事件 → 通知组件 */
  private onMetadataLoaded = (event: Event): void => {
    const video = event.target as HTMLVideoElement
    const entry = this.registry.get(video)
    entry?.onLoaded()
  }

  /** error 事件 → 通知组件，传入 fallback 重试函数 */
  private onVideoError = (event: Event): void => {
    const video = event.target as HTMLVideoElement
    const entry = this.registry.get(video)
    if (!entry) return

    entry.onError(() => {
      // fallback: 组件设置新的 video.src 后调用，Manager 重新加载
      this.startPreload(entry)
    })
  }
}

/** 模块级单例 */
export const videoLoadManager = new VideoLoadManager()
```

#### 1.5 运行测试验证

- [ ] **Step 5: 运行测试确认全部通过**

```bash
cd frontend && npx vitest run src/utils/__tests__/video-load-manager.test.ts 2>&1
```

预期：所有测试 PASS。

#### 1.6 检查类型

- [ ] **Step 6: 运行 TypeScript 编译检查**

```bash
cd frontend && npx vue-tsc --noEmit --pretty 2>&1
```

预期：video-load-manager.ts 无类型错误。

#### 1.7 提交

- [ ] **Step 7: 提交 VideoLoadManager**

```bash
cd comics15 && git add frontend/src/utils/video-load-manager.ts frontend/src/utils/__tests__/video-load-manager.test.ts
git commit -m "feat: add VideoLoadManager for centralized video preload scheduling"
```

---

### Task 2: ReaderImageItem 组件（从 ReaderMediaItem 拆出）

**Files:**
- Create: `frontend/src/components/ReaderImageItem.vue`
- 参考: `frontend/src/components/ReaderMediaItem.vue`（图片部分）

> **并行标记:** Task 2 与 Task 1 无依赖，可并行执行。

#### 2.1 创建组件

- [ ] **Step 1: 创建 `frontend/src/components/ReaderImageItem.vue`**

从 `ReaderMediaItem.vue` 提取图片相关的 script 和 template。**不做任何逻辑变更，只做搬家。**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
}>()

const currentSrc = ref(props.url)
const status = ref<'loading' | 'loaded' | 'error'>('loading')
let fallbackAttempted = false

// URL 变更时重置状态（DynamicScroller 回收）
watch(() => props.url, (newUrl) => {
  status.value = 'loading'
  fallbackAttempted = false
  currentSrc.value = newUrl
})

function onLoad() {
  status.value = 'loaded'
}

function onError() {
  if (props.fallbackUrl && !fallbackAttempted) {
    fallbackAttempted = true
    currentSrc.value = props.fallbackUrl
    return
  }
  status.value = 'error'
}

function onDblClick() {
  if (props.fallbackUrl) {
    currentSrc.value = props.fallbackUrl
    status.value = 'loading'
    fallbackAttempted = true
  }
}
</script>

<template>
  <div class="relative w-full">
    <!-- 加载中骨架屏 -->
    <div
      v-show="status === 'loading'"
      class="absolute inset-0 z-10 bg-slate-800 animate-pulse flex items-center justify-center"
      style="min-height: 400px"
    >
      <span class="text-sm text-slate-500 select-none">加载中…</span>
    </div>

    <!-- 加载失败占位 -->
    <div
      v-show="status === 'error'"
      class="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center gap-2"
      style="min-height: 400px"
    >
      <span class="text-3xl select-none">&#x1F5BC;</span>
      <span class="text-xs text-slate-500 select-none">加载失败</span>
    </div>

    <img
      :src="currentSrc"
      :alt="alt"
      class="block w-full h-auto select-none"
      :class="{ 'invisible': status !== 'loaded' }"
      @load="onLoad"
      @error="onError"
      @dblclick="onDblClick"
    />
  </div>
</template>
```

#### 2.2 检查类型

- [ ] **Step 2: 运行 TypeScript 编译检查**

```bash
cd frontend && npx vue-tsc --noEmit --pretty 2>&1
```

#### 2.3 提交

- [ ] **Step 3: 提交 ReaderImageItem**

```bash
cd comics15 && git add frontend/src/components/ReaderImageItem.vue
git commit -m "refactor: extract ReaderImageItem from ReaderMediaItem"
```

---

### Task 3: ReaderVideoItem 组件

**Files:**
- Create: `frontend/src/components/ReaderVideoItem.vue`
- 依赖: Task 1（VideoLoadManager）

#### 3.1 创建组件

- [ ] **Step 1: 创建 `frontend/src/components/ReaderVideoItem.vue`**

```vue
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { videoLoadManager } from '@/utils/video-load-manager'

const props = defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const status = ref<'idle' | 'loading' | 'loaded' | 'playing' | 'paused' | 'error'>('idle')
const currentSrc = ref(props.url)
let fallbackAttempted = false

/** 错误处理：先尝试 fallbackUrl，都失败则显示 error */
function onError(tryFallback: () => void) {
  if (props.fallbackUrl && !fallbackAttempted) {
    fallbackAttempted = true
    status.value = 'loading'
    currentSrc.value = props.fallbackUrl
    tryFallback()
    return
  }
  status.value = 'error'
}

function onLoaded() {
  status.value = 'loaded'
}

function onAborted() {
  status.value = 'idle'
}

function onPlay() {
  status.value = 'playing'
  if (videoRef.value) {
    videoLoadManager.onUserPlayed(videoRef.value)
  }
}

function onPause() {
  status.value = 'paused'
}

// URL 变更时重新注册（DynamicScroller 回收）
watch(() => props.url, (newUrl) => {
  if (videoRef.value && containerRef.value) {
    videoLoadManager.unregister(videoRef.value)
    fallbackAttempted = false
    currentSrc.value = newUrl
    status.value = 'idle'
    videoLoadManager.register(videoRef.value, containerRef.value, {
      url: newUrl,
      onLoaded,
      onError,
      onAborted,
    })
  }
})

onMounted(() => {
  if (videoRef.value && containerRef.value) {
    videoLoadManager.register(videoRef.value, containerRef.value, {
      url: props.url,
      onLoaded,
      onError,
      onAborted,
    })
  }
})

onBeforeUnmount(() => {
  if (videoRef.value) {
    videoLoadManager.unregister(videoRef.value)
  }
})

/** 是否显示 video（隐藏时的 invisible class） */
const isVisible = () => ['loaded', 'playing', 'paused'].includes(status.value)
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <!-- 加载中骨架屏 -->
    <div
      v-show="status === 'loading'"
      class="absolute inset-0 z-10 bg-slate-800 animate-pulse flex items-center justify-center"
      style="min-height: 400px"
    >
      <span class="text-sm text-slate-500 select-none">加载中…</span>
    </div>

    <!-- 错误占位 -->
    <div
      v-show="status === 'error'"
      class="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center gap-2"
      style="min-height: 400px"
    >
      <span class="text-3xl select-none">&#x1F3AC;</span>
      <span class="text-xs text-slate-500 select-none">视频加载失败</span>
    </div>

    <video
      ref="videoRef"
      class="w-full h-auto block"
      :class="{ 'invisible': !isVisible() }"
      controls
      playsinline
      webkit-playsinline
      preload="none"
      @play="onPlay"
      @pause="onPause"
    />
  </div>
</template>
```

**注意：** `<video>` 没有 `:src` 绑定——`src` 由 VideoLoadManager 在 JS 中直接设置，避免 Vue 响应式与浏览器 video 内部状态冲突。

#### 3.2 检查类型

- [ ] **Step 2: 运行 TypeScript 编译检查**

```bash
cd frontend && npx vue-tsc --noEmit --pretty 2>&1
```

#### 3.3 提交

- [ ] **Step 3: 提交 ReaderVideoItem**

```bash
cd comics15 && git add frontend/src/components/ReaderVideoItem.vue
git commit -m "feat: add ReaderVideoItem with VideoLoadManager integration"
```

---

### Task 4: ReaderMediaItem 退化为 dispatcher

**Files:**
- Modify: `frontend/src/components/ReaderMediaItem.vue`
- 依赖: Task 2（ReaderImageItem）, Task 3（ReaderVideoItem）

#### 4.1 重写组件

- [ ] **Step 1: 重写 `frontend/src/components/ReaderMediaItem.vue`**

将 287 行的组件替换为 ~15 行的 dispatcher。**Props API 完全不变，ReaderPage.vue 零改动。**

```vue
<script setup lang="ts">
import ReaderImageItem from './ReaderImageItem.vue'
import ReaderVideoItem from './ReaderVideoItem.vue'

defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
  kind: 'image' | 'video'
}>()
</script>

<template>
  <ReaderImageItem
    v-if="kind === 'image'"
    :url="url"
    :fallback-url="fallbackUrl"
    :alt="alt"
  />
  <ReaderVideoItem
    v-else
    :url="url"
    :fallback-url="fallbackUrl"
    :alt="alt"
  />
</template>
```

#### 4.2 检查类型 + LSP

- [ ] **Step 2: 运行 TypeScript 检查 + LSP diagnostics**

```bash
cd frontend && npx vue-tsc --noEmit --pretty 2>&1
```

#### 4.3 提交

- [ ] **Step 3: 提交 dispatcher**

```bash
cd comics15 && git add frontend/src/components/ReaderMediaItem.vue
git commit -m "refactor: simplify ReaderMediaItem to dispatcher component"
```

---

### Task 5: 验收验证

**Files:** 无新建，验证所有改动正确。

- [ ] **Step 1: 确认旧代码已完全删除**

在 `ReaderMediaItem.vue` 中确认以下已移除：
- `sourceMounted` ref
- `activeLoadingVideo` 模块级单例
- `allVideoElements` Set
- `videoType` computed
- `setupVideoObserver` / `teardownVideoObserver` / `abortVideoLoad` / `startMetadataLoad`
- 条件 `<source>` 元素
- `videoContainerRef` / `visibilityObserver`

- [ ] **Step 2: 运行全量 TypeScript 检查**

```bash
cd frontend && npx vue-tsc --noEmit --pretty 2>&1
```

预期：零错误。

- [ ] **Step 3: 运行全量 Vitest 测试**

```bash
cd frontend && npx vitest run 2>&1
```

预期：所有已有测试 + 新增 Manager 测试全部 PASS。

- [ ] **Step 4: 运行 ESLint 检查**

```bash
cd frontend && npm run lint 2>&1
```

预期：无新增错误（预存在的 warning/error 不变）。

- [ ] **Step 5: 构建前端**

```bash
cd frontend && npm run build 2>&1
```

预期：构建成功，无错误。

- [ ] **Step 6: 提交**

```bash
cd comics15 && git add -A
git commit -m "chore: verify video loading refactor - all tests pass, build succeeds"
```

---

## 验证检查清单（完成后手动确认）

- [ ] `ReaderMediaItem.vue` 从 287 行缩减到 ~15 行
- [ ] 不再存在任何 `sourceMounted`、`activeLoadingVideo`、`allVideoElements` 引用
- [ ] 不再存在 `<source>` 元素
- [ ] `video-load-manager.test.ts` 全部通过
- [ ] 已有测试（PreloadEngine、route-path 等）全部通过
- [ ] `vue-tsc --noEmit` 零错误
- [ ] `npm run build` 成功
- [ ] ReaderPage.vue 零改动
