# 漫画阅读器图片加载重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 引入 `vue-virtual-scroller` + 自研 `PreloadEngine`，DOM 恒 ≤ 30 个，图片加载有优先级，彻底解决手机滚动卡顿和白屏问题。

**Architecture:** `DynamicScroller`（库，不定高虚拟滚动）+ `PreloadEngine`（自研，优先级预加载）→ `ReaderPage.vue` → `ReaderMediaItem.vue`（纯展示）。reader-store 微调一行，lazy-image.ts 删除。后端不动。

**Spec:** `docs/superpowers/specs/2026-05-27-image-loading-redesign.md`

---

## Task 1: 安装依赖

- [ ] 进入 frontend 目录：`npm install vue-virtual-scroller`
- [ ] 验证安装：`npx vitest run` 确认无破坏

---

## Task 2: 实现 PreloadEngine

### 2.1 写测试

- [ ] 创建 `frontend/src/utils/preload-engine.test.ts`

```
describe('PreloadEngine', () => {
  it('setUrlResolver 注册回调后可以获取 URL')
  it('reset(total) 重置内部状态')
  it('onVisibleChange(start, end, total) → 可见页前后 1 页立即加载')
  it('onVisibleChange → 下方 15 页级联预加载（从近到远）')
  it('onVisibleChange → 不在范围内的未完成请求被取消')
  it('onVisibleChange → 上方 5 页的已加载请求不取消（回滚保留）')
  it('请求失败不影响其他请求继续')
  it('并发数不超过 maxConcurrent(4)')
  it('往上回滚 → onVisibleChange 回到上方时，已保留的请求从浏览器缓存命中')
  it('destroy() → 取消所有请求')
})
```

- [ ] `npx vitest run src/utils/preload-engine.test.ts` → 全部失败

### 2.2 实现

- [ ] 创建 `frontend/src/utils/preload-engine.ts`

```typescript
type PreloadTask = { url: string; index: number; priority: 'immediate' | 'cascade' | 'none' }

export class PreloadEngine {
  private maxConcurrent = 4
  private urlResolver: ((index: number) => string | null) | null = null
  private total = 0
  private activeUrls = new Set<string>()
  private retainedIndices = new Set<number>()  // 已加载的上方页，不取消

  setUrlResolver(resolver: (index: number) => string | null): void
  reset(total: number): void
  onVisibleChange(visibleStart: number, visibleEnd: number, total: number): void
  destroy(): void
}

export const preloadEngine = new PreloadEngine()
```

**关键逻辑**：
- `onVisibleChange` 每次可见页变化时调用，Engine 内部 diff 新旧范围
- 用 `new Image().src = url` 触发浏览器预加载（不是 `fetch`）
- 级联：对下方 15 页，timer 从近到远逐个启动 `new Image()`，间隔 50ms
- 取消：`img.src = ''` 中止，从 `activeUrls` 移除
- 保留：上方 5 页加载完成后不取消，标记到 `retainedIndices`

- [ ] `npx vitest run src/utils/preload-engine.test.ts` → 全部通过

### 2.3 提交

- [ ] `git add frontend/src/utils/preload-engine.ts frontend/src/utils/preload-engine.test.ts`
- [ ] `git commit -m "feat: 添加 PreloadEngine 预加载引擎"`

---

## Task 3: 简化 ReaderMediaItem.vue

### 3.1 重写

- [ ] 编辑 `frontend/src/components/ReaderMediaItem.vue`

**删除**：IntersectionObserver、`visible` ref、`observeLazyImage` 调用、`active` prop、`safeUrl` computed、`stopMediaRequest`、`mediaRef`、`activeMediaRef`

**保留**：`@error` fallback、`@dblclick` 手动切 HQ、video 渲染

**新增**：`currentSrc` ref 管理 fallback 切换

- [ ] 运行 `npx vitest run` 确认无破坏

### 3.2 提交

- [ ] `git add frontend/src/components/ReaderMediaItem.vue`
- [ ] `git commit -m "refactor: 简化 ReaderMediaItem 为纯展示组件"`

---

## Task 4: 微调 reader-store.ts

### 4.1 修改

- [ ] 编辑 `frontend/src/stores/reader-store.ts`
- [ ] 在 `loadChapter` 方法末尾新增一行：

```typescript
import { preloadEngine } from '@/utils/preload-engine'

// loadChapter 最后：
preloadEngine.reset(this.totalPages)
```

### 4.2 更新测试

- [ ] 编辑 `frontend/src/stores/reader-store.test.ts`
- [ ] mock `preload-engine`：

```typescript
vi.mock('@/utils/preload-engine', () => ({
  preloadEngine: { reset: vi.fn() }
}))
```

- [ ] `npx vitest run src/stores/reader-store.test.ts` → 通过

### 4.3 提交

- [ ] `git add frontend/src/stores/reader-store.ts frontend/src/stores/reader-store.test.ts`
- [ ] `git commit -m "feat: reader-store 集成 PreloadEngine"`

---

## Task 5: 重写 ReaderPage.vue

### 5.1 重写

- [ ] 重写 `frontend/src/pages/ReaderPage.vue`

**核心变更**：
- `v-for="media in mediaItems"` → `<DynamicScroller :items="mediaItems">`
- 删除：`pageElements`、`activePageIndexes`、`isPageActive`、`updateActiveWindow`、`initPageObserver`、`setPageRef`、`cleanupPageTracking`
- 新增：`onScrollerUpdate` 回调 → 更新 `readerStore.currentPage` + 调用 `preloadEngine.onVisibleChange()`
- 新增：`preloadEngine.setUrlResolver()` 在 `onMounted` 中注册

**模板结构**：

```vue
<template>
  <main class="min-h-screen bg-black pb-24 text-slate-100">
    <div v-if="readerStore.loading">加载中…</div>
    <div v-else-if="readerStore.error">{{ readerStore.error }}</div>
    <DynamicScroller v-else :items="readerStore.mediaItems"
                     :min-item-size="400" key-field="url"
                     @update="onScrollerUpdate" class="scroller">
      <template #default="{ item, index, active }">
        <DynamicScrollerItem :item="item" :active="active" :data-index="index">
          <ReaderMediaItem
            :url="item.url"
            :fallback-url="item.fallbackUrl"
            :kind="item.type === 'video' ? 'video' : 'image'"
            :alt="`第 ${index + 1} 页`" />
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>
    <ReaderShell ... />
  </main>
</template>

<style scoped>
.scroller { height: calc(100vh - 6rem); }
</style>
```

- [ ] 阅读现有 `ReaderShell.vue` 的 props/events，确保接口匹配
- [ ] 保留 `jumpToPage`、`goBackToDirectory`、`goToChapter` 导航逻辑
- [ ] `jumpToPage` 改用 `DynamicScroller.scrollToItem(n - 1)`

### 5.2 验证

- [ ] `npx vitest run` 确认现有测试通过
- [ ] `npm run dev`，手机浏览器访问，测试 6 / 200 / 1000+ 页章节

### 5.3 提交

- [ ] `git add frontend/src/pages/ReaderPage.vue`
- [ ] `git commit -m "feat: ReaderPage 改用 vue-virtual-scroller + PreloadEngine"`

---

## Task 6: 清理

### 6.1 删除 lazy-image

- [ ] `git rm frontend/src/utils/lazy-image.ts frontend/src/utils/lazy-image.test.ts`
- [ ] 全局搜索确认无残留：`grep -r "lazy-image\|observeLazyImage" frontend/src/`

### 6.2 最终验证

- [ ] `npx vitest run` 全部通过
- [ ] `npm run build` 构建成功
- [ ] `npm run lint` 无新增错误
- [ ] 手机浏览器实测各场景

### 6.3 提交

- [ ] `git commit -m "chore: 移除 lazy-image，已被 DynamicScroller + PreloadEngine 替代"`

---

## 验证清单

- [ ] `npx vitest run` 全部通过
- [ ] `npm run build` 成功
- [ ] 6 页 → 正常渲染
- [ ] 200 页 → DOM 恒定，滚动流畅，滚动条准确
- [ ] 1000 页 → 长时间操作不卡顿，内存不泄漏
- [ ] 快速下滚 → 级联预加载生效，无白屏
- [ ] 向上回滚 → 之前图片秒出（缓存命中）
- [ ] 图片加载失败 → fallback 回退
- [ ] 视频页 → 正常
- [ ] ReaderShell 导航正常
