# 漫画阅读器图片加载重构设计

**日期**：2026-05-27  
**目标**：解决手机端（WiFi）漫画阅读时图片加载不流畅、滚动卡顿问题  
**范围**：前端分段渲染引擎（后端不改，只改前端）

---

## 1. 问题诊断

| 问题 | 根因 | 严重度 |
|------|------|:---:|
| 1000 页章节首次进入卡顿 | 1000 个 `<img>` DOM 节点 + IntersectionObserver，手机浏览器 layout/reflow 开销巨大 | 🔴 |
| 手机滚动卡顿 | 1000 个 DOM 节点常驻内存，滚动时持续触发 layout | 🔴 |
| 可见页和远距离页面抢带宽 | 所有 img 无优先级区分，WiFi 并发争抢 | 🟡 |
| 图片出现白屏空档 | 预加载窗口太小（±1 页），快速滚动时跟不上 | 🟡 |

**不改的**：Nginx（本地 SSD，磁盘 IO 非瓶颈）、后端 LQ/HQ URL 构建逻辑、Go 工具。

---

## 2. 解决方案概览

```
┌─────────────┐   全量 JSON（不变）    ┌──────────────────────┐
│  后端 API    │ ──────────────────▶   │  reader-store.ts     │
│  （不动）     │                      │  一次性 fetch，不动     │
└─────────────┘                      └────────┬─────────────┘
                                              │ mediaItems[] (JS对象，~50KB)
                                     ┌────────▼─────────────┐
                                     │  segment-manager.ts   │
                                     │  分段状态机             │
                                     │  COLLAPSED/WARM/ACTIVE │
                                     │  DOM img 恒定 ≤ 25 个   │
                                     └────────┬─────────────┘
                                              │ slots[]
                             ┌────────────────┼────────────────┐
                    ┌────────▼──────┐  ┌──────▼──────┐  ┌─────▼─────┐
                    │ ReaderPage.vue │  │preload-pool │  │ReaderMedia│
                    │ 按段渲染 DOM    │  │ 预加载调度器  │  │Item.vue   │
                    │ 折叠段→占位div  │  │ 优先级队列   │  │ 纯展示     │
                    └───────────────┘  └─────────────┘  └───────────┘
```

---

## 3. 前端改动

### 3.1 segment-manager.ts（新增）

分段状态机，管理每个页面的渲染状态。

```typescript
type PageState = 'collapsed' | 'warm' | 'active'

interface PageSlot {
  index: number        // 页码 0-based
  height: number       // 该页高度（估算/实际）
  state: PageState
  loaded: boolean      // 图片是否已加载
}

// 配置常量
const ACTIVE_PADDING = 2   // 视口前后各保留 2 页为 ACTIVE（共 ~5 页）
const WARM_PADDING = 10    // ACTIVE 前后各扩展 10 页为 WARM（共 ~25 页）
```

**状态切换规则**：

| 触发条件 | 动作 |
|---------|------|
| 页进入 `activeRange` | `state → 'active'`，`img.src` 设为 url，高优先级加载 |
| 页进入 `warmRange`（非 active） | `state → 'warm'`，`img.src` 设为 url，低优先级 preload |
| 页离开 `warmRange` | `state → 'collapsed'`，清空 `img.src`，替换为占位 div |

**折叠段高度管理**：
- 初始：用已加载页平均高度 × 折叠页数估算
- 该段展开后：回写实际累计高度，修正滚动条位置

### 3.2 preload-pool.ts（新增）

图片预加载调度器，负责控制网络请求优先级。

```typescript
class PreloadPool {
  private maxConcurrent = 4       // 并发上限
  private active: Map<string, AbortController>  // 正在进行的请求

  // 按优先级插入预加载队列
  enqueue(url: string, priority: 'high' | 'normal' | 'low'): void

  // 取消所有低优先级请求（当有新页面进入 active 范围时）
  cancelLowPriority(): void

  // 取消指定 URL 的请求
  cancel(url: string): void
}
```

- **高优先级**：ACTIVE 页面的图片
- **普通优先级**：WARM 且靠近视口的页面
- **低优先级**：WARM 且远离视口的页面

**工作原理**：用 `fetch(url)` 将图片资源提前拉入浏览器 HTTP 缓存，当 img 标签的 `src` 被设置为同一 URL 时，浏览器从缓存命中，零等待显示。不是替代 img 加载，而是预热缓存。不使用 `<link rel="prefetch">`，改用 `fetch()` + `AbortController`，可主动取消远离视口的请求。

### 3.3 ReaderPage.vue（重写模板）

**当前**：`v-for="media in mediaItems"` 渲染全部页面  
**改为**：按段渲染

```vue
<template>
  <!-- 顶部折叠段：一个占位 div -->
  <div v-if="collapsedTopHeight > 0" :style="{ height: collapsedTopHeight + 'px' }" />

  <!-- 预热 + 活跃段：逐个渲染 img，共 ~25 个 -->
  <template v-for="slot in visibleSlots" :key="slot.index">
    <img
      v-if="slot.state !== 'collapsed'"
      :src="slot.state === 'active' ? getUrl(slot.index) : getUrl(slot.index)"
      :loading="slot.state === 'active' ? 'eager' : 'lazy'"
      :data-page-index="slot.index"
      @load="onImageLoad(slot.index, $event)"
      @error="onImageError(slot.index)"
    />
  </template>

  <!-- 底部折叠段 -->
  <div v-if="collapsedBottomHeight > 0" :style="{ height: collapsedBottomHeight + 'px' }" />
</template>
```

**关键逻辑**：
- `visibleSlots` 是一个 computed，从 `segmentManager.slots` 中筛选出非 COLLAPSED 的页
- 总 DOM 中 `<img>` 数量恒为 ~25 个（ACTIVE ~5 + WARM ~20）
- `IntersectionObserver` 只观察每个 img，用于触发状态切换，不再观察全部 1000 页

### 3.4 ReaderMediaItem.vue（简化）

去掉组件内的 `IntersectionObserver` 和 `visible` 状态管理，改为纯展示：

```vue
<script setup lang="ts">
defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
  kind: 'image' | 'video'
  eager: boolean
}>()

function onError() { /* fallback 逻辑保留 */ }
</script>

<template>
  <img v-if="kind === 'image'" :src="url" :loading="eager ? 'eager' : 'lazy'" @error="onError" />
  <video v-else :src="url" controls playsinline />
</template>
```

### 3.5 reader-store.ts（微调）

现有 `loadChapter` 一次性获取全量文件的行为不变。新增对 segmentManager 的支持：

```typescript
async loadChapter(seriesName: string, chapterPath: string) {
  // 现有逻辑不变：一次性 fetch 全量
  const response = await fetchChapter(seriesName, chapterPath)
  this.mediaItems = response.files
  this.totalPages = response.total ?? this.mediaItems.length
  
  // 新增：通知 segmentManager 初始化 slots 数组
  segmentManager.init(this.totalPages)
}
```

改动极小——多了一行 `segmentManager.init(totalPages)`。`loadChapter` 本身、API 调用、返回结构都不变。

### 3.6 lazy-image.ts（删除）

其职责被 `segment-manager.ts` 的状态管理取代。

---

## 4. 关键细节说明

### 4.1 初始高度估算

API 只返回文件列表和 total，没有每张图片的尺寸。在图片真正加载前，需要估算页高：

- **默认值**：首次加载使用 `window.innerHeight`（或 800px）作为单页估算高度
- **渐进修正**：每加载一张图片，用其实际高度更新该页的 `slot.height`，并重新计算所在折叠段的高度
- **滚动条校正**：修正折叠段高度后，用 `scrollBy` 补偿偏移量，保证用户视觉位置不变

### 4.2 快速滚动降级处理

当用户快速滑动时，WARM 段可能来不及渲染。此时：
- 不阻塞渲染——COLLAPSED 占位 div 直接显示估算高度
- 图片加载完成后回写高度
- 不会白屏崩溃，只有短暂的高度跳动（影响微乎其微）

### 4.3 已加载图片的内存释放

当页面离开 WARM 范围 → 转为 COLLAPSED：
- `img.src = ''` 释放图片解码内存
- DOM 节点本身销毁（`v-if` 控制，占位 div 替代）
- 浏览器 HTTP 缓存中的图片数据保留（回滚时缓存命中）

---

## 5. 文件变更清单

| 文件 | 操作 | 说明 |
|------|:---:|------|
| `segment-manager.ts` | **新增** | 分段状态机 |
| `preload-pool.ts` | **新增** | 预加载调度器 |
| `ReaderPage.vue` | 重写 | 按段渲染，去掉全量 v-for |
| `ReaderMediaItem.vue` | 简化 | 去掉内部 Observer/visible 逻辑 |
| `reader-store.ts` | 微调 | 新增 `segmentManager.init(totalPages)` 一行 |
| `lazy-image.ts` | 删除 | 被 segment-manager 取代 |

**后端零改动。**

---

## 6. 测试要点

- [ ] 6 页小章节：所有页在 WARM 范围内，无折叠段，行为正常
- [ ] 200 页中章节：滚动时 COLLAPSED ↔ WARM ↔ ACTIVE 切换正确
- [ ] 1000+ 页大章节：折叠段高度估算与回写正确，滚动条不跳动
- [ ] 快速滚动：WARM 段跟不上时，显示空白占位而非白屏崩溃
- [ ] 往上回滚：之前折叠的段能正确展开
- [ ] 图片加载失败：fallbackUrl 回退逻辑仍然有效
- [ ] 视频页面：不参与图片 preload，`controls` 正常

---

## 7. 不变的部分

- 后端所有代码不动（Controller、Service、LQ/HQ URL 逻辑）
- Nginx 配置不动
- Go 工具不动
- 漫画目录/层级 API 不动
- `ComicCacheService` 不动
- `media-url.ts` 不动
- 路由逻辑不动
- `api.ts` 不动
