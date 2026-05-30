# 漫画阅读器视频加载重构设计

**日期**：2026-05-30
**目标**：重构 ReaderMediaItem.vue 的视频加载逻辑，消除 `sourceMounted` hack 和模块级单例跨组件 DOM 操作
**范围**：前端 ReaderMediaItem 拆分 + 新增 VideoLoadManager；后端不动

---

## 1. 问题诊断

| 问题 | 根因 | 严重度 |
|------|------|:---:|
| 视频加载卡死、进度不可控 | `sourceMounted` hack：动态挂载/卸载 `<source>` + `load()` 使浏览器进入不一致状态 | 🔴 |
| 跨组件 DOM 操作破坏封装 | `activeLoadingVideo` 单例通过 `querySelector('source')` 直接操纵其他组件的 DOM | 🔴 |
| abort 行为不可靠 | 移除 `<source>` 子元素触发 abort 不是规范行为，各浏览器表现不一 | 🟡 |
| 多个 IntersectionObserver 浪费 | 每个视频组件各自创建 Observer，而非共享一个 | 🟡 |

## 2. 方案选择

选择 **VideoLoadManager 集中调度** + **ReaderMediaItem 拆分为 dispatcher**。

理由：
- Manager 拥有唯一的 IntersectionObserver，集中管理视口检测和槽位调度
- 不再通过 `<source>` 条件渲染来控制请求——直接用 `video.src` 赋值，标准方式
- abort 改用 `video.removeAttribute('src')` + `load()`——W3C 资源选择算法重触发，跨浏览器可靠
- 组件拆分降低单个文件复杂度（287 → 15+120+100），图片和视频逻辑独立维护

## 3. 架构

```
ReaderPage.vue（不改动）
    │
    ▼
ReaderMediaItem.vue → dispatcher（~15行）
    │  kind==='image' → ReaderImageItem
    │  kind==='video' → ReaderVideoItem
    │
    ├── ReaderImageItem.vue（~120行，原图片逻辑直接搬出）
    │
    └── ReaderVideoItem.vue（~100行，新组件）
              │
              ▼
         VideoLoadManager（utils/video-load-manager.ts，~120行）
              │
              ├── 唯一的 IntersectionObserver（所有视频共享）
              ├── 注册表 Map<videoEl, config>
              ├── 活跃槽位 + 等待队列（同一时间只预加载一个）
              └── 播放互斥：维护 playingVideo 引用，新播放时暂停旧播放
```

## 4. 各模块设计

### 4.1 ReaderMediaItem.vue（dispatcher）

职责：根据 `kind` prop 分发到对应子组件。保持对外的 props API 不变，ReaderPage.vue 零改动。

```typescript
// Props 不变
defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
  kind: 'image' | 'video'
}>()
```

模板：
```html
<ReaderImageItem v-if="kind === 'image'" :url :fallback-url :alt />
<ReaderVideoItem v-else :url :fallback-url :alt />
```

### 4.2 ReaderImageItem.vue（从原组件拆出）

职责：纯图片展示。包含图片加载、fallback、双击切换 HQ/LQ、loading/error 骨架屏。

**行为与当前 ReaderMediaItem 的图片部分完全一致**，不新增任何功能。

Props：
```typescript
defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
}>()
```

状态：`status: 'loading' | 'loaded' | 'error'`

事件处理：
- `@load` → status = 'loaded'
- `@error` → 尝试 fallbackUrl，失败则 status = 'error'
- `@dblclick` → 切换到 fallbackUrl（手动切 HQ）

### 4.3 VideoLoadManager（新增 `utils/video-load-manager.ts`）

**职责**：集中管理所有视频的视口检测、预加载调度和播放互斥。模块级单例。

**内部状态：**
```typescript
interface VideoEntry {
  video: HTMLVideoElement
  container: HTMLElement
  url: string
  onLoaded: () => void
  onError: (fallback: () => void) => void  // fallback 由组件提供，Manager 调用
  onAborted: () => void
}

class VideoLoadManager {
  private observer: IntersectionObserver | null = null
  private registry = new Map<HTMLVideoElement, VideoEntry>()
  private activePreload: VideoEntry | null = null
  private waitQueue: VideoEntry[] = []
  private playingVideo: HTMLVideoElement | null = null
  private refCount = 0
}
```

**API：**
```typescript
register(videoEl: HTMLVideoElement, containerEl: HTMLElement, entry: Omit<VideoEntry, 'video' | 'container'>): void
unregister(videoEl: HTMLVideoElement): void
onUserPlayed(videoEl: HTMLVideoElement): void
```

**Observer 回调逻辑（先到先得）：**
```
forEach entry:
  if entry.isIntersecting:
    if this video is NOT already the active preload and NOT in waitQueue:
      if activePreload is null:
        make this video the active preload → loadMetadata()
      else:
        add to waitQueue
  else (leaving viewport):
    if this video === activePreload:
      abort() → dequeue next from waitQueue
    if playingVideo === this video:
      this video.pause()  // 用户离开视口，暂停播放
```

**rootMargin**: `300px 0px`，与当前行为一致。

**loadMetadata 实现：**
```typescript
private loadMetadata(video: HTMLVideoElement, url: string): void {
  video.preload = 'metadata'
  video.src = url
  // load() 由 src 赋值自动触发，也可显式调用确保
  video.load()
  this.activePreload = { element: video, url }
}
```

**abort 实现（不再用 source hack）：**
```typescript
private abort(video: HTMLVideoElement): void {
  video.removeAttribute('src')
  video.load()  // 触发资源选择算法重跑 → 浏览器取消请求
  if (this.activePreload?.element === video) {
    this.activePreload = null
  }
}
```

**播放互斥：**
```typescript
onUserPlayed(video: HTMLVideoElement): void {
  // 暂停前一个正在播放的视频
  if (this.playingVideo && this.playingVideo !== video && !this.playingVideo.paused) {
    this.playingVideo.pause()
  }
  this.playingVideo = video
  // 用户开始播放 → 预加载槽位可释放给下一个等待者
  if (this.activePreload?.element === video) {
    this.activePreload = null
    this.dequeueNext()
  }
}
```

**生命周期：**
- Manager 实例在模块顶层创建（`export const videoLoadManager = new VideoLoadManager()`）
- 第一个 `register()` 调用时创建 IntersectionObserver
- 最后一个 `unregister()` 调用时销毁 Observer
- 不需要显式 destroy——Observer 在无观察目标时是 inert 的

### 4.4 ReaderVideoItem.vue（新增）

**职责**：纯视频展示组件。依赖 VideoLoadManager 处理视口检测和加载调度。

**Props：**
```typescript
defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
}>()
```

**状态机：**
```
idle → loading → loaded → playing → paused
  │       │         │
  └───────┴──── error ──── (fallbackUrl?) → loading (retry)
```

**与 Manager 的协作：**
```typescript
onMounted(() => {
  videoLoadManager.register(videoRef.value!, containerRef.value!, {
    url: props.url,
    onMetadataLoaded: () => { status.value = 'loaded' },
    onError: () => { handleVideoError() },
    onAborted: () => { status.value = 'idle' },
  })
})

onBeforeUnmount(() => {
  videoLoadManager.unregister(videoRef.value!)
})
```

**错误处理 + fallback：**

组件的 `onError` 回调逻辑：
```typescript
let fallbackAttempted = false

function onError(tryFallback: () => void) {
  if (props.fallbackUrl && !fallbackAttempted) {
    fallbackAttempted = true
    status.value = 'loading'
    currentSrc.value = props.fallbackUrl
    tryFallback()  // 通知 Manager 用新 URL 重试
    return
  }
  status.value = 'error'
}
```

`tryFallback` 由 Manager 提供：Manager 内部用新 URL 替换 entry 中的 url，重新调用 `loadMetadata()`。

**URL 变更处理（DynamicScroller 回收）：**
```typescript
watch(() => props.url, (newUrl) => {
  videoLoadManager.unregister(videoRef.value!)
  fallbackAttempted = false
  currentSrc.value = newUrl
  status.value = 'idle'
  videoLoadManager.register(videoRef.value!, containerRef.value!, {
    url: newUrl, ...
  })
})
```

**模板骨架屏：**
- `status === 'loading'` → 带动画的骨架屏 + "加载中…"
- `status === 'error'` → 错误占位 + "视频加载失败"
- video 元素 `invisible` class 在 loaded/playing/paused 之外隐藏，避免显示破损图标

**video 元素属性：**
```html
<video
  ref="videoRef"
  preload="none"
  controls
  playsinline
  webkit-playsinline
  class="w-full h-auto block"
  :class="{ 'invisible': !['loaded','playing','paused'].includes(status) }"
/>
```

注意：`src` 不做模板绑定——由 VideoLoadManager 在 JS 中直接设置，避免 Vue 响应式系统与浏览器 video 内部状态冲突。

### 4.5 改动范围汇总

| 文件 | 操作 | 估计行数 |
|------|------|----------|
| `utils/video-load-manager.ts` | 新建 | ~120 |
| `components/ReaderVideoItem.vue` | 新建 | ~100 |
| `components/ReaderImageItem.vue` | 新建 | ~120 |
| `components/ReaderMediaItem.vue` | 重写为 dispatcher | 287→15 |
| `pages/ReaderPage.vue` | 不改动 | — |
| `stores/reader-store.ts` | 不改动 | — |
| `services/api.ts` | 不改动 | — |
| `types/api.ts` | 不改动 | — |

**删除的代码：**
- `sourceMounted` ref + 条件 `<source>` 元素
- `activeLoadingVideo` 模块级单例
- `allVideoElements` 全局 Set
- `videoType` computed
- `setupVideoObserver` / `teardownVideoObserver` / `abortVideoLoad` / `startMetadataLoad`
- `videoContainerRef`、`visibilityObserver`
- 视频相关的事件处理函数：`onVideoLoaded`、`onVideoError`、`onVideoPlay`

**删除的 template：**
- `<template>` 中 `v-else` 分支的整个视频 DOM（骨架屏 + `<video>` + `<source>`）

## 5. 错误处理

| 场景 | 处理 |
|------|------|
| 视频 URL 404/网络错误 | `@error` 触发 → 尝试 fallbackUrl → 失败则显示 error 占位 |
| fallbackUrl 也失败 | 显示 error 占位，不再重试 |
| Manager register 时 video 元素为 null | 静默跳过（组件可能被 DynamicScroller 回收） |
| DynamicScroller 回收组件给新 item | `watch(url)` 触发 unregister + re-register，重置所有状态 |
| 两个视频同时进入视口 | Manager 根据 intersectionRatio 选择更可见的，另一个入队 |
| 用户快速滚动（IO 回调未触发） | Observer 回调是异步的但浏览器保证最终一致性；等待队列兜底 |

## 6. 与现有系统的交互

- **PreloadEngine**：只处理图片（`new Image()`），视频不受影响。不需要改动。
- **DynamicScroller**：视频组件通过 `url` 变化感知回收；`active` prop 不直接使用（Manager 的 Observer 更精准）。
- **阅读进度保存**：不改动，`ReaderPage.vue` 逻辑不变。
- **Nginx 视频服务**：不改动，`/video/` → `h_photograph` alias 保持不变，Range 请求支持不变。

## 7. 测试策略

| 测试目标 | 类型 | 内容 |
|---------|------|------|
| VideoLoadManager 槽位调度 | 单元 | register → observer 触发 → activePreload 分配 → leave viewport → abort → dequeue |
| VideoLoadManager 播放互斥 | 单元 | 视频 A 播放 → 视频 B 播放 → A 被暂停 |
| VideoLoadManager 并发限制 | 单元 | 3 个视频进入视口 → 只有 1 个预加载，其余排队 |
| ReaderVideoItem 状态转换 | 组件 | idle→loading→loaded→playing→paused 全链路 |
| ReaderVideoItem 错误 fallback | 组件 | 主 URL 失败 → fallbackUrl 成功；两个都失败 → error 占位 |
| ReaderVideoItem URL 变更 | 组件 | 模拟 DynamicScroller 回收场景，确认旧请求中止、新请求发起 |
| ReaderMediaItem dispatcher | 组件 | kind=image 渲染 ImageItem，kind=video 渲染 VideoItem |
| 端到端 | E2E | 漫画阅读器中滚动到视频页 → 元数据预加载 → 点击播放 → 滚动离开 → 暂停 |

## 8. 回退方案

如果新实现出现问题，回退路径：
1. 保留旧 `ReaderMediaItem.vue` 为 `ReaderMediaItem.legacy.vue`
2. dispatcher 中可快速切换回旧组件渲染
3. VideoLoadManager 和 ReaderVideoItem 独立于图片逻辑，不影响图片阅读

## 9. 不做的

- 不改动后端、Nginx、Go 工具
- 不在 PreloadEngine 中加入视频预加载（`new Image()` 不能预加载视频）
- 不实现视频缩略图/封面预览（超出当前 bug 修复范围）
- 不处理音频文件（当前项目无此需求）
