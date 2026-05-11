# 阅读页懒加载优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化阅读页懒加载，使长章节不会一次性请求全部媒体，并在退出阅读页或切换章节时停止旧请求。

**Architecture:** `ReaderPage.vue` 统一维护页面激活窗口和单个 IntersectionObserver；`ReaderMediaItem.vue` 只在 `active` 为真时绑定真实媒体源，并在失活/卸载时清空媒体请求。测试先覆盖 inactive、active 切换、章节切换清理和窗口预加载行为。

**Tech Stack:** Vue 3、Vue Test Utils、Vitest、Vite。

---

## File Structure

- Modify: `frontend/src/components/ReaderMediaItem.vue`：新增 `active` prop，控制真实媒体源绑定；失活和卸载时清空 `src`。
- Modify: `frontend/src/components/ReaderMediaItem.test.js`：覆盖 inactive 不请求、active 后请求、active 变 false 清理。
- Modify: `frontend/src/pages/ReaderPage.vue`：维护 `activePageIndexes`，使用单个页面观察器更新当前页和激活窗口，章节变化时清理旧状态。
- Modify: `frontend/src/pages/ReaderPage.test.js`：覆盖激活窗口和章节切换清理。

## Task 1: ReaderMediaItem 支持 active 控制

**Files:**
- Modify: `frontend/src/components/ReaderMediaItem.vue`
- Modify: `frontend/src/components/ReaderMediaItem.test.js`

- [ ] **Step 1: 写 inactive 不绑定 src 的失败测试**

Add to `frontend/src/components/ReaderMediaItem.test.js`:

```js
it('active 为 false 时不绑定图片 src', async () => {
  const wrapper = mount(ReaderMediaItem, {
    props: { media: { type: 'image', lqUrl: '/lq.webp', hqUrl: '/hq.jpg' }, index: 0, active: false }
  })

  await wrapper.vm.markVisible()

  expect(wrapper.get('img').attributes('src')).toBe('')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/components/ReaderMediaItem.test.js`

Expected: FAIL, because the component currently binds `/lq.webp` as soon as visible.

- [ ] **Step 3: 实现 active prop 和 safeUrl**

Update `frontend/src/components/ReaderMediaItem.vue`:

```js
const props = defineProps({
  media: { type: Object, required: true },
  index: { type: Number, required: true },
  active: { type: Boolean, default: true }
})

const safeUrl = computed(() => (props.active ? activeUrl.value : ''))
```

Bind `:src="safeUrl"` on both `<img>` and `<video>`.

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- src/components/ReaderMediaItem.test.js`

Expected: PASS.

## Task 2: ReaderMediaItem 失活时停止媒体请求

**Files:**
- Modify: `frontend/src/components/ReaderMediaItem.vue`
- Modify: `frontend/src/components/ReaderMediaItem.test.js`

- [ ] **Step 1: 写 active 从 true 变 false 的失败测试**

Add to `frontend/src/components/ReaderMediaItem.test.js`:

```js
it('active 变 false 时清空媒体 src', async () => {
  const wrapper = mount(ReaderMediaItem, {
    props: { media: { type: 'image', lqUrl: '/lq.webp', hqUrl: '/hq.jpg' }, index: 0, active: true }
  })

  await wrapper.vm.markVisible()
  const image = wrapper.get('img').element
  expect(image.getAttribute('src')).toBe('/lq.webp')

  await wrapper.setProps({ active: false })

  expect(image.getAttribute('src')).toBe('')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/components/ReaderMediaItem.test.js`

Expected: FAIL, because active changes are not watched yet.

- [ ] **Step 3: 监听 active 变化并停止媒体请求**

Update `frontend/src/components/ReaderMediaItem.vue`:

```js
watch(() => props.active, (active) => {
  if (!active) {
    stopMediaRequest()
  }
})
```

Ensure `watch` is imported from `vue`.

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- src/components/ReaderMediaItem.test.js`

Expected: PASS.

## Task 3: ReaderPage 维护激活窗口

**Files:**
- Modify: `frontend/src/pages/ReaderPage.vue`
- Modify: `frontend/src/pages/ReaderPage.test.js`

- [ ] **Step 1: 扩展 ReaderMediaItem mock 记录 active prop**

Update mock in `frontend/src/pages/ReaderPage.test.js`:

```js
vi.mock('../components/ReaderMediaItem.vue', () => ({
  default: {
    props: ['media', 'index', 'active'],
    template: '<article class="media-item" :data-active="active">{{ index }}</article>'
  }
}))
```

- [ ] **Step 2: 写激活窗口失败测试**

Add to `frontend/src/pages/ReaderPage.test.js`:

```js
it('只激活当前页附近窗口', () => {
  useReaderStore.mockReturnValue({
    mediaItems: [{ url: '/1.jpg' }, { url: '/2.jpg' }, { url: '/3.jpg' }, { url: '/4.jpg' }, { url: '/5.jpg' }],
    currentPage: 1,
    totalPages: 5,
    previousChapterPath: '',
    nextChapterPath: '',
    loading: false,
    error: '',
    loadChapter: vi.fn(),
    setCurrentPage: vi.fn()
  })

  const wrapper = mount(ReaderPage)
  const states = wrapper.findAll('.media-item').map((item) => item.attributes('data-active'))

  expect(states).toEqual(['true', 'true', 'true', 'false', 'false'])
})
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npm test -- src/pages/ReaderPage.test.js`

Expected: FAIL, because ReaderPage does not pass `active` yet.

- [ ] **Step 4: 实现 activePageIndexes**

Update `frontend/src/pages/ReaderPage.vue`:

```js
const activePageIndexes = ref(new Set())

function updateActiveWindow(page) {
  const currentIndex = Math.max(page - 1, 0)
  const nextActiveIndexes = new Set()
  const start = Math.max(currentIndex - 1, 0)
  const end = Math.min(currentIndex + 2, readerStore.mediaItems.length - 1)

  for (let index = start; index <= end; index += 1) {
    nextActiveIndexes.add(index)
  }

  activePageIndexes.value = nextActiveIndexes
}

function isPageActive(index) {
  return activePageIndexes.value.has(index)
}
```

Call `updateActiveWindow(readerStore.currentPage)` after media items change and after page changes. Pass `:active="isPageActive(index)"` to `ReaderMediaItem`.

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- src/pages/ReaderPage.test.js`

Expected: PASS.

## Task 4: ReaderPage 切换章节时清理旧激活状态

**Files:**
- Modify: `frontend/src/pages/ReaderPage.vue`
- Modify: `frontend/src/pages/ReaderPage.test.js`

- [ ] **Step 1: 写章节变化清理失败测试**

Add to `frontend/src/pages/ReaderPage.test.js`:

```js
it('阅读路由变化时清理旧页面引用并重新加载', async () => {
  const loadChapter = vi.fn()
  useReaderStore.mockReturnValue({
    mediaItems: [{ url: '/1.jpg' }, { url: '/2.jpg' }],
    currentPage: 1,
    totalPages: 2,
    previousChapterPath: '',
    nextChapterPath: '',
    loading: false,
    error: '',
    loadChapter,
    setCurrentPage: vi.fn()
  })

  const wrapper = mount(ReaderPage)
  expect(wrapper.vm.pageElementsLengthForTest()).toBe(2)

  routeMock.route.params.pathMatch = '目录/第 2 话'
  await nextTick()

  expect(loadChapter).toHaveBeenCalledWith('系列 A', '目录/第 2 话')
  expect(wrapper.vm.pageElementsLengthForTest()).toBe(0)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/pages/ReaderPage.test.js`

Expected: FAIL, because `pageElementsLengthForTest` and cleanup do not exist.

- [ ] **Step 3: 实现清理函数**

Update `frontend/src/pages/ReaderPage.vue`:

```js
function cleanupPageTracking() {
  pageObserver?.disconnect()
  pageObserver = null
  pageElements.value = []
  activePageIndexes.value = new Set()
}

defineExpose({
  pageElementsLengthForTest: () => pageElements.value.length
})
```

Call `cleanupPageTracking()` before loading a new route chapter and in `onBeforeUnmount()`.

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- src/pages/ReaderPage.test.js`

Expected: PASS.

## Task 5: 最终验证

**Files:**
- Verify only.

- [ ] **Step 1: 运行聚焦测试**

Run: `npm test -- src/components/ReaderMediaItem.test.js src/pages/ReaderPage.test.js`

Expected: PASS.

- [ ] **Step 2: 运行全量测试**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: 运行构建**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: 运行反模式检查**

Run from `frontend/`: `rg "as any|@ts-ignore|@ts-expect-error|catch\\s*\\([^)]*\\)\\s*\\{\\s*\\}|console\\.log" src`

Expected: no matches.

---

## Self-Review

- Spec coverage: 激活窗口、退出清理、章节切换清理、保留现有行为均有任务覆盖。
- Placeholder scan: 无 TBD/TODO/占位步骤。
- Type consistency: `active`、`activePageIndexes`、`cleanupPageTracking`、`pageElementsLengthForTest` 在计划中命名一致。
