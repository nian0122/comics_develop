# 漫画阅读器视频加载重构设计 v2

**日期**：2026-05-30
**目标**：推翻前端视频加载功能，重新实现。引入独立 VideoStore + VideoLoadManager 集中调度。
**范围**：前端 ReaderVideoItem、ReaderPage、reader-store、VideoStore（新建）、VideoLoadManager（新建）；后端不动。

---

## 1. 动机

- 当前 ReaderVideoItem 每个实例持有独立 IntersectionObserver，资源浪费。
- 视频数据和图片数据在 reader-store 中混管，无法独立缓存和预取。
- `sourceMounted` hack 和模块级 `currentPlaying` 跨组件 DOM 操作，封装性差。
- 本章节通常 5+ 视频，混合大小，需要一个可扩展的架构。

## 2. 需求确认

| 维度 | 决策 |
|------|------|
| 视频在阅读流中的位置 | 与图片混合，同一 DynamicScroller 滚动 |
| 进入视口 | 自动加载 metadata，不自动播放 |
| 并发 | 所有可见视频同时加载 metadata |
| 离开视口 | 中止加载中的，保留已加载的 |
| 播放 | 用户手动点击，同时只播一个，滚走暂停 |
| 视频数据 | 独立于图片数据管理，有独立 store/缓存 |
| 视频无 fallback | 只有 `/video/` 直出，无 LQ 版本 |
| 改动范围 | ReaderPage + reader-store + ReaderVideoItem + 新建 VideoStore + VideoLoadManager |
| 规模 | 每章节 5+ 视频，混合大小 |

## 3. 方案选择

选择 **方案 B：集中调度 + 独立数据层**。

理由：
- VideoLoadManager 持有唯一 IntersectionObserver，消除多 Observer 浪费
- VideoStore 独立管理视频数据生命周期，支持缓存和预取
- reader-store 回归纯图片职责，职责单一
- 改动量可控（约 6 个文件），架构收益明确

淘汰方案：
- 方案 A（最小修复）：不改架构，不符合"视频数据独立管理"需求
- 方案 C（视频脱离 DynamicScroller）：过于激进，改动量大，体验割裂

## 4. 架构

```
ReaderPage.vue
 │
 ├─ 图片管线（不变）
 │   ├─ useReaderStore  → API /api/chapter → MediaItem[]（仅图片）
 │   └─ DynamicScroller → ReaderMediaItem(kind='image') → ReaderImageItem
 │
 └─ 视频管线（新增/重写）
     ├─ useVideoStore        → API /api/chapter → MediaItem[]（仅视频）
     │                         独立状态：loading、error、缓存
     ├─ VideoLoadManager     → 唯一 IntersectionObserver
     │                         注册表、加载/中止调度、播放互斥
     └─ DynamicScroller      → ReaderMediaItem(kind='video') → ReaderVideoItem
```

| 模块 | 类型 | 职责 | 对外暴露 |
|------|------|------|----------|
| `useVideoStore` | Pinia store（新建） | 独立拉取章节视频列表，缓存策略，加载状态 | `videos: MediaItem[]`, `total`, `loading`, `error`, `fetchVideos()`, `prefetchNext()`, `clear()` |
| `VideoLoadManager` | 工具单例（新建） | 视口检测、加载/中止调度、播放互斥 | `register(el, config)`, `unregister(el)` |
| `ReaderVideoItem` | Vue 组件（重写） | 纯展示：骨架屏、video 元素、状态响应 | props: `url`, `alt` |
| `ReaderPage` | Vue 页面（改动） | 引入 VideoStore，双管线合并渲染 | 不变 |
| `ReaderMediaItem` | dispatcher（微调） | 按 kind 分发，video 分支不传 fallbackUrl | 不变 |
| `ReaderImageItem` | 组件（不变） | 图片展示 | 不变 |
| `reader-store` | Pinia store（简化） | 去掉视频相关，`mediaItems` → `imageItems` | `imageItems` 只含图片 |

### 数据流

```
章节切换
  │
  ├── readerStore.loadChapter()     → API → 图片 MediaItem[]
  └── videoStore.fetchVideos()      → API → 视频 MediaItem[]
                                          │
                              VideoLoadManager
                              （接收视频 DOM 注册）
                                          │
                              IntersectionObserver 回调
                                          │
                              ┌─ 进入视口 → loadMetadata()
                              ├─ 离开视口 → 加载中? abort() : 忽略
                              └─ 播放     → pauseOthers()
```

VideoStore 和 reader-store **各自调同一 API**（`/api/chapter`），各自过滤自己的类型。API 层不拆分（后端不动）。

## 5. 各模块详细设计

### 5.1 VideoLoadManager (`utils/video-load-manager.ts`)

模块级单例：`export const videoLoadManager = new VideoLoadManager()`。

#### 内部状态

```typescript
type VideoStatus = 'idle' | 'loading' | 'loaded' | 'error'

interface VideoEntry {
  video: HTMLVideoElement
  container: HTMLElement
  url: string
  status: VideoStatus
  onStatusChange: (status: VideoStatus) => void
}

class VideoLoadManager {
  private observer: IntersectionObserver | null = null
  private registry = new Map<HTMLVideoElement, VideoEntry>()
  private playingVideo: HTMLVideoElement | null = null
  private refCount = 0
}
```

#### 公开 API

```typescript
register(videoEl: HTMLVideoElement, containerEl: HTMLElement, config: {
  url: string
  onStatusChange: (status: VideoStatus) => void
}): void

unregister(videoEl: HTMLVideoElement): void
onPlay(videoEl: HTMLVideoElement): void
```

#### Observer 回调逻辑（核心）

```
for each entry in registry:
  if entry.isIntersecting:
    ├─ status === 'idle'    → startLoad(entry)
    ├─ status === 'loading' → 保持
    └─ status === 'loaded' | 'error' → 不操作

  else (离开视口):
    ├─ status === 'loading' → abort(entry) → status = 'idle'
    ├─ status === 'loaded'  → 不操作（保留已加载的）
    └─ 如果正在播放        → video.pause()
```

#### 加载 / 中止 / 播放

```typescript
private startLoad(entry: VideoEntry): void {
  entry.video.preload = 'metadata'
  entry.video.src = entry.url
  entry.video.load()
  entry.status = 'loading'
  entry.onStatusChange('loading')

  entry.video.onloadedmetadata = () => {
    entry.status = 'loaded'
    entry.onStatusChange('loaded')
  }
  entry.video.onerror = () => {
    entry.status = 'error'
    entry.onStatusChange('error')
  }
}

private abort(entry: VideoEntry): void {
  entry.video.removeAttribute('src')
  entry.video.load()
  entry.status = 'idle'
  entry.onStatusChange('idle')
}

onPlay(videoEl: HTMLVideoElement): void {
  if (this.playingVideo && this.playingVideo !== videoEl) {
    this.playingVideo.pause()
  }
  this.playingVideo = videoEl
}
```

#### Observer 生命周期

- 第一个 `register()` → 创建 IntersectionObserver（`rootMargin: '300px 0px'`）
- 最后一个 `unregister()` → 销毁 Observer
- 通过 `refCount` 计数管理

### 5.2 VideoStore (`stores/video-store.ts`)

```typescript
interface VideoStoreState {
  seriesName: string
  chapterPath: string
  videos: MediaItem[]
  total: number
  loading: boolean
  error: string
  cache: Map<string, MediaItem[]>   // key: "series::path"
}

actions: {
  async fetchVideos(series: string, chapterPath: string): Promise<void>
  async prefetchNext(series: string, nextChapterPath: string): Promise<void>
  clear(): void
}
```

**缓存逻辑：**

```
fetchVideos(series, path):
  cacheKey = `${series}::${path}`
  if cache.has(cacheKey):
    this.videos = cache.get(cacheKey)
    return

  try:
    response = await fetchChapter(series, path)
    this.videos = response.files.filter(f => f.type === 'video')
    this.total = this.videos.length
    cache.set(cacheKey, this.videos)
  catch:
    this.error = "..."
  finally:
    this.loading = false
```

LRU 淘汰：缓存 Map 保留最近 10 个章节，超出淘汰最旧的。

### 5.3 ReaderVideoItem (重写 `components/ReaderVideoItem.vue`)

#### Props

```typescript
defineProps<{
  url: string
  alt: string
}>()
```

不再接收 `fallbackUrl`。

#### 状态机

```
        Manager.startLoad()
idle ────────────────────────► loading
  ▲                              │
  │ Manager.abort()               │ onloadedmetadata
  │ (离开视口)                     ▼
  │                            loaded
  │                              │
  │                              │ onerror
  ▼                              ▼
                            error
```

#### 脚本

```typescript
const status = ref<VideoStatus>('idle')

function register() {
  videoLoadManager.register(videoRef.value!, containerRef.value!, {
    url: props.url,
    onStatusChange: (s) => { status.value = s },
  })
}

onMounted(() => register())

onBeforeUnmount(() => {
  videoLoadManager.unregister(videoRef.value!)
})

// DynamicScroller 回收
watch(() => props.url, () => {
  videoLoadManager.unregister(videoRef.value!)
  status.value = 'idle'
  register()
})
```

#### 模板

```html
<div ref="containerRef" class="relative w-full">
  <!-- loading 骨架屏 -->
  <div v-show="status === 'loading'"
       class="absolute inset-0 z-10 bg-slate-800 animate-pulse flex items-center justify-center"
       style="min-height: 400px">
    <span class="text-sm text-slate-500 select-none">加载中…</span>
  </div>

  <!-- error 占位 -->
  <div v-show="status === 'error'"
       class="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center gap-2"
       style="min-height: 400px">
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
    @play="videoLoadManager.onPlay($event.target)"
  />
</div>
```

注意：`src` 不做模板绑定——由 VideoLoadManager 在 JS 中直接设置，避免 Vue 响应式与浏览器 video 内部状态冲突。

### 5.4 ReaderPage 改动

```typescript
const allMediaItems = computed(() => {
  const images = readerStore.imageItems.map(item => ({
    ...item,
    // 按 name 标记原始顺序用于合并排序
  }))
  const videos = videoStore.videos.map(item => ({...item}))
  // 按自然排序合并，恢复 API 的混合顺序
  return [...images, ...videos].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  )
})
```

`readerStore.totalPages` = 图片数 + 视频数，进度计算不变。

章节切换时同时触发两条管线：

```typescript
readerStore.loadChapter(series, chapterPath)
videoStore.fetchVideos(series, chapterPath)
```

### 5.5 reader-store 简化

```diff
- mediaItems: MediaItem[]     // 所有媒体混合
+ imageItems: MediaItem[]     // 只保留图片

  loadChapter:
-   this.mediaItems = response.files
+   this.imageItems = response.files.filter(f => f.type === 'image')
-   this.totalPages = response.total
+   this.totalPages = this.imageItems.length
```

### 5.6 ReaderMediaItem 微调

```diff
  <ReaderVideoItem
-   :fallback-url="fallbackUrl"
    :alt="alt"
  />
```

### 5.7 改动范围汇总

| 文件 | 操作 | 估行 |
|------|------|:--:|
| `utils/video-load-manager.ts` | 新建 | ~110 |
| `stores/video-store.ts` | 新建 | ~80 |
| `components/ReaderVideoItem.vue` | 重写 | ~90 |
| `components/ReaderMediaItem.vue` | 微调 | ~2 |
| `pages/ReaderPage.vue` | 引入 VideoStore，合并双管线 | ~20 |
| `stores/reader-store.ts` | 简化 | ~5 |
| `stores/reader-store.test.ts` | 适配 | ~10 |
| `components/ReaderImageItem.vue` | 不变 | — |
| `utils/preload-engine.ts` | 不变 | — |
| `services/api.ts` | 不变 | — |
| `types/api.ts` | 不变 | — |

**删除的代码：**
- `ReaderVideoItem.vue` 中：`IntersectionObserver`、`startLoad`、`onError`、`onPlay`、`currentPlaying` 模块变量、`watch(url)` 中的手动 load 逻辑
- `reader-store.ts` 中：`mediaItems` 重命名为 `imageItems`，过滤掉视频类型

## 6. 错误处理

| 场景 | 处理 |
|------|------|
| 视频 URL 404/网络错误 | `@error` → `status = 'error'`，显示错误占位。无 fallback，不重试 |
| Manager register 时 video 元素为 null | 静默跳过（DynamicScroller 回收场景） |
| DynamicScroller 回收给新 item | `watch(url)` → unregister + re-register，重置状态 |
| 用户快速滚动 | Observer 回调保证最终一致性；离开视口即 abort 加载中的 |
| 视频 API 请求失败 | VideoStore 设置 `error`，ReaderPage 可展示错误提示 |

## 7. 与现有系统的交互

- **PreloadEngine**：只处理图片（`new Image()`），视频不受影响。不改动。
- **DynamicScroller**：视频组件通过 `url` 变化感知回收。Manager 的 Observer 更精准，不依赖 `active` prop。
- **阅读进度保存**：不改动，`ReaderPage.vue` 逻辑不变。
- **Nginx 视频服务**：不改动，`/video/` → `h_photograph` alias，CORS + Range 保持不变。
- **后端 API**：不改动，`/api/chapter` 返回格式不变。

## 8. 测试策略

| 目标 | 类型 | 内容 |
|------|------|------|
| VideoLoadManager 注册/注销 | 单元 | register → entry 入 registry；unregister → 移除；最后一个 unregister → Observer 销毁 |
| VideoLoadManager 加载调度 | 单元 | entry 进入视口 → idle→loading；离开 → loading→idle；loaded 离开不变 |
| VideoLoadManager 播放互斥 | 单元 | A.play → B.play → A.pause() 被调用 |
| VideoLoadManager 错误 | 单元 | onerror → status: error |
| VideoStore 缓存 | 单元 | 命中缓存不调 API；新章节调 API 写缓存 |
| ReaderVideoItem 生命周期 | 组件 | mounted → register；unmounted → unregister；url 变更 → re-register |
| ReaderVideoItem 状态 UI | 组件 | idle→loading→loaded→error 各状态 DOM 断言 |
| ReaderPage 双管线 | 组件 | 各自获取后正确合并排序 |
| reader-store 过滤 | 单元 | loadChapter 只保留 type === 'image' |

## 9. 回退方案

如果新实现出现问题：
1. 保留旧 `ReaderVideoItem.vue` 为 `ReaderVideoItem.legacy.vue`
2. ReaderMediaItem 中可快速切换回旧组件
3. VideoLoadManager 和 VideoStore 独立于图片管线，不影响图片阅读

## 10. 不做的

- 不改动后端、Nginx、Go 工具
- 不在 PreloadEngine 中加入视频预加载
- 不实现视频缩略图/封面预览
- 不处理音频文件
- 视频不实现 fallback 机制（无 LQ 版本）
