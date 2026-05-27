# 漫画阅读器图片加载重构设计

**日期**：2026-05-27
**目标**：解决手机端（WiFi）漫画阅读时图片加载不流畅、滚动卡顿问题
**范围**：引入 `vue-virtual-scroller` + 自研预加载引擎（纯前端，后端不动）

---

## 1. 问题诊断

| 问题 | 根因 | 严重度 |
|------|------|:---:|
| 1000 页章节首次进入卡顿 | 1000 个 `<img>` DOM + 1000 个 IntersectionObserver，手机浏览器 layout 爆炸 | 🔴 |
| 手机滚动持续卡顿 | DOM 节点常驻内存，滚动时持续触发 reflow | 🔴 |
| 可见页和远处页面抢带宽 | 所有 img 无优先级区分，WiFi 并发争抢 | 🟡 |
| 快速滚动出现白屏 | 预加载窗口太小（±1 页），来不及加载 | 🟡 |

**不改的**：Nginx、后端 API、LQ/HQ URL 逻辑、Go 工具。瓶颈只在**手机浏览器渲染**和 **WiFi 带宽分配**。

---

## 2. 方案选型

选择 `vue-virtual-scroller`（`DynamicScroller`）+ 自研 `PreloadEngine`，理由：

- `DynamicScroller` 原生支持**不定高列表**——漫画页高度天然不一致，跨页大图 vs 单页竖图 vs 封面
- DOM 节点恒定为 buffer 大小（~30），离开 buffer 的节点**真正销毁**，图片解码内存释放
- 跨平台（不依赖 `content-visibility` 的 Safari 17.4+ 要求）
- 9k+ GitHub star，比手写状态机更可靠
- 自研 PreloadEngine 接管"何时加载、以什么优先级加载"——WiFi 带宽分配是核心体验问题

### 备选方案对比

| 方案 | 1000页性能 | 滚动条准确性 | 兼容性 | 复杂度 | 选定 |
|------|:---:|:---:|:---:|:---:|:---:|
| `content-visibility: auto` | ⚠️ DOM 仍在内存 | ✅ 原生处理 | Chromium + Safari 17.4+ | 极低 | ❌ |
| **vue-virtual-scroller + Engine** | ✅ DOM 恒 ≤ 30 | ✅ DynamicScroller 自动探测 | 全平台 | 中 | ✅ |
| 手写分段状态机 | ✅ DOM ≤ 25 | ❌ 需估算+回写，必跳动 | 全平台 | 高 | ❌ |
| Service Worker 缓存 | ⚠️ 首次仍慢 | — | 全平台 | 中 | 可选叠加 |

---

## 3. 架构

```
┌──────────────┐   全量 JSON（不变）   ┌──────────────────────┐
│  后端 API     │ ──────────────────▶  │  reader-store.ts     │
│  （不动）      │                     │  一次性 fetch，暴露 total│
└──────────────┘                     └────────┬─────────────┘
                                              │ mediaItems[]
                                     ┌────────▼──────────────────┐
                                     │  DynamicScroller（库）      │
                                     │  - 自动管理 DOM 创建/销毁   │
                                     │  - 自动探测每页实际高度      │
                                     │  - DOM 恒定为 buffer 大小   │
                                     │  - 滚动条始终准确           │
                                     └────────┬──────────────────┘
                                              │
                              ┌───────────────┼───────────────┐
                              │               │               │
                     ┌────────▼──────┐  ┌─────▼──────┐  ┌────▼──────┐
                     │ PreloadEngine │  │ReaderMedia │  │ReaderShell│
                     │ 预加载调度      │  │Item.vue   │  │（不变）    │
                     │ 优先级+并发控制 │  │ 纯展示      │  │           │
                     └──────────────┘  └────────────┘  └───────────┘
```

---

## 4. 各模块设计

### 4.1 PreloadEngine（新增 `preload-engine.ts`）

**职责**：控制图片的加载时机和优先级，WiFi 带宽分配给最重要的图片。

```typescript
class PreloadEngine {
  private maxConcurrent = 4              // 并发上限
  private active: Map<string, AbortController>

  // 可见页变化时调用，Engine 自主决定加载策略
  onVisibleChange(visibleStart: number, visibleEnd: number, total: number): void

  // 获取某页的 URL（委托给 store）
  setUrlResolver(resolver: (index: number) => string | null): void

  // 取消所有
  destroy(): void
}
```

**内部策略**：

| 优先级 | 范围 | 策略 |
|--------|------|------|
| 🔴 立即 | `visibleStart-1` ~ `visibleEnd+1` | `new Image().src = url`（让浏览器立即发起请求） |
| 🟡 级联 | 下方 15 页 | 从近到远逐个发起，最多 4 并发 |
| 🟢 保留 | 上方 5 页 | 已加载的保留，不主动取消（回滚用） |
| ⚪ 放弃 | 其他范围 | 取消未完成的请求，释放带宽 |

**关键细节**：
- 用 `new Image().src = url` 而非 `fetch()`——浏览器原生图片解码管道，自动命中 HTTP 缓存
- 当用户快速往下滚时，自动取消已滚过很远的上方预加载请求
- 当用户往上回滚时，上方保留的图片已在浏览器缓存，秒出

### 4.2 ReaderPage.vue（重写）

**当前**：`v-for="media in mediaItems"` 全量渲染，每个带 IntersectionObserver
**改为**：`<DynamicScroller>` 管理渲染，只绑一个 Observer 追踪可见页

```vue
<script setup lang="ts">
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { preloadEngine } from '@/utils/preload-engine'

// 初始化 Engine，告诉它怎么从 index 拿到 url
preloadEngine.setUrlResolver((index) => readerStore.mediaItems[index]?.url ?? null)

// 单个 IntersectionObserver：只追踪当前可见的第一页和最后一页
// 滚动时 → 更新 readerStore.currentPage → 驱动 ReaderShell
//          更新 preloadEngine.onVisibleChange() → 驱动预加载

const onScrollerUpdate = (startIndex: number, endIndex: number) => {
  readerStore.setCurrentPage(startIndex + 1)
  preloadEngine.onVisibleChange(startIndex, endIndex, readerStore.totalPages)
}
</script>

<template>
  <main class="min-h-screen bg-black pb-24 text-slate-100">
    <div v-if="readerStore.loading">加载中…</div>
    <div v-else-if="readerStore.error">{{ readerStore.error }}</div>

    <DynamicScroller
      v-else
      :items="readerStore.mediaItems"
      :min-item-size="400"
      key-field="url"
      @update="onScrollerUpdate"
    >
      <template #default="{ item, index, active }">
        <DynamicScrollerItem :item="item" :active="active" :data-index="index">
          <ReaderMediaItem
            :url="item.url"
            :fallback-url="item.fallbackUrl"
            :kind="item.type === 'video' ? 'video' : 'image'"
            :alt="`第 ${index + 1} 页`"
          />
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>

    <ReaderShell ... />
  </main>
</template>
```

### 4.3 ReaderMediaItem.vue（简化）

去掉 `IntersectionObserver`、`visible` 状态、`active` 控制逻辑，改为纯展示：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  url: string
  fallbackUrl: string | null
  alt: string
  kind: 'image' | 'video'
}>()

const currentSrc = ref(props.url)

function onError() {
  if (props.fallbackUrl && currentSrc.value !== props.fallbackUrl) {
    currentSrc.value = props.fallbackUrl
  }
}

function onDblClick() {
  if (props.fallbackUrl) {
    currentSrc.value = props.fallbackUrl
  }
}
</script>

<template>
  <img v-if="kind === 'image'" :src="currentSrc" :alt="alt"
       loading="lazy" class="w-full select-none block"
       @error="onError" @dblclick="onDblClick" />
  <video v-else :src="currentSrc" controls playsinline class="w-full" />
</template>
```

**为什么保留 `loading="lazy"`**：DynamicScroller 管理 DOM 创建/销毁，`loading="lazy"` 管理"DOM 存在但 src 要不要立即请求"。两者互补——DynamicScroller 销毁远离视口的 DOM（释放内存），`loading="lazy"` 让 buffer 内但尚未可见的 img 延迟请求（释放带宽）。

### 4.4 reader-store.ts（微调）

现有 `loadChapter` 逻辑不变。新增一行，在数据加载完成后通知 Engine：

```typescript
async loadChapter(seriesName: string, chapterPath: string) {
  // ... 现有 fetch + 赋值逻辑不变 ...
  this.mediaItems = response.files
  this.totalPages = response.total ?? this.mediaItems.length

  // 新增：Engine 需要知道总页数来规划预加载范围
  preloadEngine.reset(this.totalPages)
}
```

### 4.5 lazy-image.ts（删除）

其职责被 `DynamicScroller`（DOM 管理）+ `PreloadEngine`（加载调度）完全取代。

---

## 5. 文件变更清单

| 文件 | 操作 | 说明 |
|------|:---:|------|
| `package.json` | 修改 | 新增 `vue-virtual-scroller` |
| `preload-engine.ts` | **新增** | 预加载引擎 |
| `ReaderPage.vue` | 重写 | `<DynamicScroller>` + Engine 集成 |
| `ReaderMediaItem.vue` | 简化 | 去掉 Observer/visible，纯展示 |
| `reader-store.ts` | 微调 | 新增 `preloadEngine.reset(totalPages)` |
| `lazy-image.ts` | 删除 | 被替代 |

**后端、Nginx、Go 工具、API 结构 —— 全部不动。**

---

## 6. 测试要点

- [ ] 6 页章节：所有页在 DynamicScroller buffer 内，无异常
- [ ] 200 页章节：DOM 节点恒 ≤ 30，滚动时动态创建/销毁
- [ ] 1000+ 页章节：长时间滚动到底部再回滚到顶部，内存不泄漏，滚动条准确
- [ ] 快速往下滚：Engine 级联预加载下方图片，不出现白屏
- [ ] 往上回滚：之前看过的图片从浏览器缓存秒出
- [ ] 图片加载失败 → fallbackUrl 回退有效
- [ ] 视频页：DynamicScroller 正常管理，`controls` 正常
- [ ] ReaderShell 导航（上一话/下一话/跳页）正常
- [ ] `npm run build` 成功，无新增 lint 错误
