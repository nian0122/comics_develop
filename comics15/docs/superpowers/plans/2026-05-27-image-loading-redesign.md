# 漫画阅读器图片加载重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用分段渲染替代全量 DOM 渲染，无论章节多少页，前端 `<img>` DOM 恒定 ≤ 25 个，彻底解决手机端滚动卡顿和白屏问题。

**Architecture:** `segment-manager.ts`（状态机）+ `preload-pool.ts`（预加载调度）→ `ReaderPage.vue`（按段渲染）→ `ReaderMediaItem.vue`（纯展示）。reader-store 微调一行，lazy-image.ts 删除。后端不动。

**Spec:** `docs/superpowers/specs/2026-05-27-image-loading-redesign.md`

---

## 文件结构

```
frontend/src/
├── utils/
│   ├── segment-manager.ts       # NEW: 分段状态机
│   ├── segment-manager.test.ts  # NEW: 单元测试
│   ├── preload-pool.ts          # NEW: 预加载调度器
│   ├── preload-pool.test.ts     # NEW: 单元测试
│   └── lazy-image.ts            # DELETE: 被 segment-manager 替代
│       lazy-image.test.ts       # DELETE
├── components/
│   └── ReaderMediaItem.vue      # MODIFY: 简化为纯展示
├── pages/
│   └── ReaderPage.vue           # REWRITE: 按段渲染
└── stores/
    └── reader-store.ts          # TWEAK: 新增 init 调用
```

**依赖关系**：segment-manager 和 preload-pool 无外部依赖，先实现。ReaderMediaItem 独立简化。ReaderPage 最后组装。

---

## Task 1: 实现 segment-manager.ts（状态机）

### 1.1 写测试

- [ ] 创建 `frontend/src/utils/segment-manager.test.ts`
- [ ] 测试用例（用 vitest，中文描述）：

```
describe('SegmentManager', () => {
  it('init(size) 初始化所有页面为 collapsed 状态')
  it('setActivePage(n) → 将 page n 前后 ACTIVE_PADDING 设为 active，各扩展 WARM_PADDING 为 warm，其余保持 collapsed')
  it('getVisibleSlots() → 只返回 active+warm 的 slot，不包含 collapsed')
  it('updateSlotHeight(index, height) → 更新单页高度')
  it('getCollapsedTopHeight(beforeIndex) → 计算该索引之前所有 collapsed 页的累计估算高度')
  it('getCollapsedBottomHeight(afterIndex) → 计算该索引之后所有 collapsed 页的累计估算高度')
  it('只有 6 页时 → 全部在 warm 范围内，无 collapsed')
  it('第 1 页时 → 上方无 collapsed，下方有 collapsed（如果 > warm 范围）')
  it('最后一页时 → 下方无 collapsed，上方有 collapsed')
})
```

- [ ] 运行 `npx vitest run src/utils/segment-manager.test.ts`，确认全部失败

### 1.2 实现

- [ ] 创建 `frontend/src/utils/segment-manager.ts`
- [ ] 导出 `SegmentManager` 类，实现以下接口：

```typescript
export interface PageSlot {
  index: number
  height: number
  state: 'collapsed' | 'warm' | 'active'
}

export class SegmentManager {
  static readonly ACTIVE_PADDING = 2
  static readonly WARM_PADDING = 10

  init(total: number): void                              // 初始化 slots[]
  setActivePage(pageIndex: number): void                  // 更新所有 slot 的状态
  getVisibleSlots(): PageSlot[]                           // 返回 state !== 'collapsed' 的 slot
  updateSlotHeight(index: number, height: number): void   // 回写高度
  getCollapsedTopHeight(beforeIndex: number): number      // 上方折叠段估算高度
  getCollapsedBottomHeight(afterIndex: number): number    // 下方折叠段估算高度
}
```

**关键逻辑**：
- `setActivePage(n)` 计算 `activeRange = [n - ACTIVE_PADDING, n + ACTIVE_PADDING]` 和 `warmRange = [n - WARM_PADDING, n + WARM_PADDING]`，裁剪到 `[0, total-1]`
- 折叠段高度 = 折叠页数 × 800px（默认估算值），后续通过 `updateSlotHeight` 修正
- `getVisibleSlots()` 返回顺序：上方 warm → active → 下方 warm

- [ ] 运行 `npx vitest run src/utils/segment-manager.test.ts`，确认全部通过

### 1.3 提交

- [ ] `git add frontend/src/utils/segment-manager.ts frontend/src/utils/segment-manager.test.ts`
- [ ] `git commit -m "feat: 添加 segment-manager 分段状态机"`

---

## Task 2: 实现 preload-pool.ts（预加载调度器）

### 2.1 写测试

- [ ] 创建 `frontend/src/utils/preload-pool.test.ts`
- [ ] 测试用例：

```
describe('PreloadPool', () => {
  it('enqueue(url, "high") → 立即发起 fetch')
  it('enqueue(url, "low") → 入队等候，不超过 maxConcurrent')
  it('达到 maxConcurrent 时新 low 优先级请求排队')
  it('高优先级请求可以抢占低优先级的并发槽位')
  it('cancelLowPriority() → 取消所有 pending 的低优先级请求')
  it('cancel(url) → 取消指定 URL 的请求')
  it('请求失败不影响其他请求继续')
  it('destroy() → 取消所有请求，清理状态')
})
```

- [ ] 运行 `npx vitest run src/utils/preload-pool.test.ts`，确认全部失败

### 2.2 实现

- [ ] 创建 `frontend/src/utils/preload-pool.ts`
- [ ] 导出 `PreloadPool` 类：

```typescript
export type Priority = 'high' | 'normal' | 'low'

export class PreloadPool {
  constructor(maxConcurrent?: number)  // 默认 4

  enqueue(url: string, priority: Priority): void
  cancel(url: string): void
  cancelLowPriority(): void
  destroy(): void
}
```

**关键逻辑**：
- 用 `fetch(url, { signal })` + `AbortController`，不是 `new Image()`
- 高优先级直接执行，低优先级排队等槽位
- `cancelLowPriority()` 中止所有 `priority === 'low'` 且未完成的请求
- `destroy()` 中止所有请求，清空队列

- [ ] 运行 `npx vitest run src/utils/preload-pool.test.ts`，确认全部通过

### 2.3 提交

- [ ] `git add frontend/src/utils/preload-pool.ts frontend/src/utils/preload-pool.test.ts`
- [ ] `git commit -m "feat: 添加 preload-pool 预加载调度器"`

---

## Task 3: 简化 ReaderMediaItem.vue

### 3.1 检查现有测试

- [ ] 确认 `ReaderMediaItem.vue` 是否有单元测试文件（不存在则跳过）
- [ ] 阅读当前组件完整代码，确认要删除的逻辑：`IntersectionObserver`、`visible` ref、`observeLazyImage` 调用、`stopMediaRequest`、`active` watch 中的 src 清空逻辑

### 3.2 重写组件

- [ ] 重写 `frontend/src/components/ReaderMediaItem.vue`：

```vue
<script setup lang="ts">
defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
  kind: 'image' | 'video'
}>()

function onError(event: Event) {
  // fallback 逻辑（从 props 拿 fallbackUrl）
}
</script>

<template>
  <img v-if="kind === 'image'" :src="url" :alt="alt" @error="onError" @dblclick="onError" />
  <video v-else :src="url" controls playsinline />
</template>
```

**删除的逻辑**：
- `IntersectionObserver` / `observeLazyImage` 调用 → 由 segment-manager 的可见性控制替代
- `visible` ref + `markVisible` → 父组件通过分段控制是否渲染
- `active` prop + `safeUrl` computed + `stopMediaRequest` → 父组件控制 DOM 存在与否
- `mediaRef` + `activeMediaRef` → 不再需要

**保留的逻辑**：
- `fallbackUrl` 错误回退（`@error` → 切换 src 到 fallbackUrl）
- `@dblclick` → 手动切到 fallbackUrl（现有功能）
- 视频 `<video>` 渲染

### 3.3 验证

- [ ] 运行 `npx vitest run` 确认无破坏的测试
- [ ] 运行 `npx vue-tsc --noEmit`（如果有）确认类型正确

### 3.4 提交

- [ ] `git add frontend/src/components/ReaderMediaItem.vue`
- [ ] `git commit -m "refactor: 简化 ReaderMediaItem 为纯展示组件"`

---

## Task 4: 微调 reader-store.ts

### 4.1 修改

- [ ] 在 `loadChapter` 方法末尾，`this.loading = false` 之前，新增一行：

```typescript
// 通知 segmentManager 初始化
import { segmentManager } from '@/utils/segment-manager'

// 在 loadChapter 中:
segmentManager.init(this.totalPages)
```

**注意**：`segmentManager` 作为模块级单例导入，不需要通过 Pinia store 传递。

### 4.2 验证

- [ ] 运行 `npx vitest run src/stores/reader-store.test.ts`，如果报错缺少 segmentManager mock，更新测试：

```typescript
vi.mock('@/utils/segment-manager', () => ({
  segmentManager: { init: vi.fn() }
}))
```

### 4.3 提交

- [ ] `git add frontend/src/stores/reader-store.ts frontend/src/stores/reader-store.test.ts`
- [ ] `git commit -m "feat: reader-store 集成 segment-manager 初始化"`

---

## Task 5: 重写 ReaderPage.vue

### 5.1 写测试（关键逻辑）

- [ ] 创建或更新 `frontend/src/pages/ReaderPage.test.ts`（如果没有现有测试则新建）
- [ ] 核心测试用例：

```
describe('ReaderPage 分段渲染', () => {
  it('小章节(6页) → 渲染全部 6 个 img，无占位 div')
  it('大章节(200页) → 只渲染 warm 范围内的 img(~25个) + 上下折叠占位 div')
  it('滚动到中间 → collapsedTopHeight > 0 且 collapsedBottomHeight > 0')
  it('滚动到顶部 → collapsedTopHeight = 0')
  it('滚动到底部 → collapsedBottomHeight = 0')
  it('图片加载后回写高度，折叠段高度更新')
})
```

### 5.2 重写组件

- [ ] 重写 `frontend/src/pages/ReaderPage.vue`

**模板结构**：

```vue
<template>
  <main class="min-h-screen bg-black pb-24 text-slate-100">
    <!-- Loading / Error 状态不变 -->
    <div v-if="readerStore.loading">加载中…</div>
    <div v-else-if="readerStore.error">{{ readerStore.error }}</div>

    <section v-else>
      <!-- 顶部折叠段占位 -->
      <div v-if="collapsedTopHeight > 0"
           :style="{ height: collapsedTopHeight + 'px' }"
           class="w-full" />

      <!-- 可见段：只渲染 active+warm 页面，共 ~25 个 -->
      <template v-for="slot in visibleSlots" :key="slot.index">
        <div :data-page-index="slot.index" :ref="(el) => setSlotRef(el, slot.index)">
          <ReaderMediaItem
            :url="getMediaUrl(slot.index)"
            :fallback-url="getMediaFallbackUrl(slot.index)"
            :alt="`第 ${slot.index + 1} 页`"
            :kind="getMediaKind(slot.index)"
          />
        </div>
      </template>

      <!-- 底部折叠段占位 -->
      <div v-if="collapsedBottomHeight > 0"
           :style="{ height: collapsedBottomHeight + 'px' }"
           class="w-full" />
    </section>

    <ReaderShell ... />
  </main>
</template>
```

**脚本逻辑**：

```typescript
import { segmentManager, type PageSlot } from '@/utils/segment-manager'
import { preloadPool } from '@/utils/preload-pool'

// IntersectionObserver 只用于追踪当前可见页，触发 setActivePage
const scrollObserver = new IntersectionObserver((entries) => {
  const visible = entries.filter(e => e.isIntersecting)
  if (visible.length === 0) return
  const closest = visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
  const index = Number((closest.target as HTMLElement).dataset.pageIndex ?? '0')
  segmentManager.setActivePage(index)
  readerStore.setCurrentPage(index + 1)
}, { threshold: [0.25, 0.5, 0.75] })

// 观察所有非 collapsed 的 slot 元素
watch(visibleSlots, () => {
  nextTick(() => {
    scrollObserver.disconnect()
    document.querySelectorAll('[data-page-index]').forEach(el => scrollObserver.observe(el))
  })
})

const visibleSlots = computed(() => segmentManager.getVisibleSlots())
const collapsedTopHeight = computed(() => segmentManager.getCollapsedTopHeight(...))
const collapsedBottomHeight = computed(() => segmentManager.getCollapsedBottomHeight(...))

// 图片加载完成后回写高度
function onImageLoad(index: number, event: Event) {
  const img = event.target as HTMLImageElement
  segmentManager.updateSlotHeight(index, img.naturalHeight)
}

// 预加载调度：active 页面进入时触发 preload
watch(visibleSlots, (slots) => {
  slots.forEach(slot => {
    const priority = slot.state === 'active' ? 'high' : 'low'
    const url = getMediaUrl(slot.index)
    if (url) preloadPool.enqueue(url, priority)
  })
})
```

**删除的逻辑**：
- `v-for="media in readerStore.mediaItems"` 全量渲染
- `isPageActive()` 函数
- `updateActiveWindow()` 函数
- `pageElements` ref 数组
- `initPageObserver()` 函数
- `setPageRef()` 函数
- `cleanupPageTracking()` 函数 → 改为 `scrollObserver.disconnect()`

**保留的逻辑**：
- `goBackToDirectory()` 目录导航
- `goToChapter()` 章节导航
- `jumpToPage()` 跳页 → 改为 `segmentManager.setActivePage(n-1)` + `scrollIntoView`
- `ReaderShell` 集成

### 5.3 验证

- [ ] 运行 `npx vitest run` 确认全部测试通过
- [ ] 运行 `npx vue-tsc --noEmit`（如果有）确认类型正确
- [ ] 手动启动 `npm run dev`，用手机访问，验证 6 页、200 页、1000+ 页章节的滚动体验

### 5.4 提交

- [ ] `git add frontend/src/pages/ReaderPage.vue`
- [ ] `git commit -m "feat: ReaderPage 改用分段渲染，DOM img 恒定 ≤25 个"`

---

## Task 6: 清理代码

### 6.1 删除 lazy-image

- [ ] 删除 `frontend/src/utils/lazy-image.ts`
- [ ] 删除 `frontend/src/utils/lazy-image.test.ts`
- [ ] 搜索全局引用确认无残留：`grep -r "lazy-image" frontend/src/`

### 6.2 最终验证

- [ ] 运行 `npx vitest run` 确认全部通过
- [ ] 运行 `npm run build` 确认构建成功
- [ ] 运行 `npm run lint` 确认无新增 lint 错误

### 6.3 提交

- [ ] `git rm frontend/src/utils/lazy-image.ts frontend/src/utils/lazy-image.test.ts`
- [ ] `git commit -m "chore: 移除 lazy-image，已被 segment-manager 替代"`

---

## 验证清单

实施完成后逐项检查：

- [ ] `npx vitest run` 全部通过
- [ ] `npm run build` 成功
- [ ] 6 页章节 → 无折叠段，全部 img 正常渲染
- [ ] 200 页章节 → 顶部/底部有折叠段占位，滚动时折叠 ↔ warm ↔ active 正常切换
- [ ] 1000+ 页章节 → 内存占用低，滚动不卡顿
- [ ] 快速滚动 → 出现占位 div 而非白屏崩溃
- [ ] 往上回滚 → 折叠段正确展开为 img
- [ ] 图片加载失败 → fallbackUrl 回退有效
- [ ] 视频页 → controls 正常
- [ ] ReaderShell 导航（上一话/下一话/跳页）正常
