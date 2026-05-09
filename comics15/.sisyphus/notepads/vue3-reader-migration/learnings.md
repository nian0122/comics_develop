## 2026-05-09 Task 8: 目录封面懒加载

### 实现内容

**ChapterCard.vue**
- 新增 `cover` prop（type: String, default: ''）
- 模板动态渲染：当 `cover` 有值时显示 `<img>`，否则显示 `.chapter-cover.skeleton` 占位

**DirectoryPage.vue**
- 导入 `ChapterMetaCache`、`RequestQueue`、`LAZY_LOAD_CONFIG`
- 新增响应式变量：`coverData`（封面 URL 映射）、`coverObserver`、`coverLoadQueue`、`coverLoadToken`、`chapterMetaCache`
- `loadData()` 中调用 `setupCoverObserver(currentToken)` 并更新 token
- `setupCoverObserver()` 创建 IntersectionObserver + RequestQueue，观察 `.chapter-cover[data-cover-path]` 元素
- Observer callback 通过 `coverLoadQueue.add()` 调用 `chapterMetaCache.getOrFetchByPathId(pathId)`
- 使用 `globalThis.IntersectionObserver` 确保测试环境兼容
- `onBeforeUnmount` disconnect observer 并 clear queue

### TDD 验证

- ChapterCard 测试：14 passed（新增封面渲染 3 个测试）
- DirectoryPage 测试：17 passed（新增懒加载 5 个测试）
- LSP diagnostics：clean

### Gotchas

- `vi.stubGlobal('IntersectionObserver', ...)` 设置的是 `globalThis`，代码需使用 `globalThis.IntersectionObserver` 检查和构造
- 测试中需保存 mock 函数引用（`intersectionObserverMock`），否则 `expect(IntersectionObserver).toHaveBeenCalled()` 不生效
- `flushPromises` + `nextTick` + `flushPromises` 组合等待异步渲染和 observer setup

## 2026-05-09 17:09 Task 9: ReaderShell + JumpPageModal

### 实现内容

**JumpPageModal.vue**
- Props: visible (Boolean), totalPages (Number)
- DOM ids: jumpModal, jumpPageInput, jumpCancelBtn, jumpConfirmBtn, totalPages
- Emits: confirm (带页码), cancel
- 使用 @click.self 代替 event.target 检查，简化背景点击逻辑
- 页码验证：1..totalPages，无效输入不 emit
- Enter/Escape 键支持

**ReaderShell.vue**
- Props: canPrev, canNext, progressText, menuVisible, actionsVisible
- DOM ids: readerMenuBtn, readerActions, backToDirectoryBtn, prevBtn, nextBtn, progressStatus
- Emits: prev, next, back, jump, toggle-menu
- 键盘监听：ArrowLeft/ArrowRight/G/g，在 onMounted 添加，onUnmounted 移除
- 检查 activeElement.tagName !== INPUT 避免输入时触发

### TDD 验证

- JumpPageModal 测试：14 passed
- ReaderShell 测试：16 passed
- 最终验证：30 passed
- LSP diagnostics：clean

### Gotchas

- Vue Test Utils 不允许在 trigger 中设置 	arget 属性，需使用 @click.self 代替 event.target 检查
- 测试键盘监听时需使用 ttachTo: document.body 以确保 document.dispatchEvent 能触发组件监听器
- unmount cleanup 测试使用 vi.spyOn(document, 'addEventListener/removeEventListener') 验证监听器移除
## 2026-05-09 17:35 Task 10: ReaderMediaItem

### 实现内容

**ReaderMediaItem.vue**
- Props: filename, pathId, seriesName, index, coverSource, scale
- DOM 结构: lazy-image-container + data 属性 + skeleton-wrapper/skeleton-image 骨架屏
- 模板: img (image/gif) 或 video (video) 元素，带 reader-img 类名
- 响应式状态: isLoaded, isFailed, currentUrl, useHQ, retryCount, loadStatus, timeoutId, lastClickTime
- computed: mediaType (getFileType), shouldRender (currentUrl + status)
- loadMedia 方法:
  - coverSource=lq → buildLQImageUrl
  - coverSource=hq → buildHQImageUrl
  - 缺失 → resolveImageUrl
  - GIF/video → buildVideoUrl
  - LQ error → HQ fallback
  - 重试机制遵循 IMAGE_RETRY_CONFIG
- 双击 LQ → checkHQImageUsable + 切换 HQ
- defineExpose: loadMedia 供 ReaderPage 调用
- emit: loaded/failed 事件通知父组件
- onBeforeUnmount: clearPendingTimeout + clearMediaElement

### TDD 验证

- RED: 测试文件导入不存在组件，预期失败
- GREEN: 14 tests passed
- 完整验证: 44 passed (reader.test.js 6 + api.test.js 24 + ReaderMediaItem.test.js 14)
- LSP diagnostics: clean

### Gotchas

- 自定义 clearTimeout 函数名与全局 clearTimeout 冲突导致递归，必须重命名为 clearPendingTimeout 并使用 globalThis.clearTimeout
- 测试双击行为需要 vi.useFakeTimers() 才能使用 vi.advanceTimersByTime()
- GIF 在 legacy 中走 video URL 但渲染为 img 元素（非 video 元素）

## 2026-05-09 Task 11: ReaderPage
### 实现内容

**ReaderPage.vue**
- 组合式 API：useRoute/useRouter 获取路由参数和导航方法
- 使用 Pinia stores：chapterStore, readerStore, progressStore, seriesStore
- `loadData()` 异步加载章节列表、定位当前章节、加载文件、初始化进度
- `setupLazyObserver()` 创建 IntersectionObserver 触发 ReaderMediaItem.loadMedia
- `handleScroll()` 更新 progressStore.scrollPercent 和 setCurrentPage
- 章节导航：openPrevChapter/openNextChapter 使用 toReaderUrl 构建 URL
- 返回目录：backToDirectory 使用 toDirectoryUrl
- 跳页：jumpToPage 滚动到目标页并触发 loadMedia
- watch route.params.path 监听路由变化重新加载
- onUnmounted cleanup observer

**ReaderPage.test.js**
- Mock vue-router useRoute/useRouter
- Mock stores：chapter-store, reader-store, progress-store, series-store
- Mock persistence.saveCurrentPosition
- Mock IntersectionObserver 使用 globalThis.IntersectionObserver
- 测试覆盖：加载流程、进度初始化、位置保存、章节导航、Observer cleanup、跳页

### TDD 验证

- ReaderPage 测试：16 passed
- 全量测试：276 passed
- Build：成功
- LSP diagnostics：clean

### Gotchas

- 测试中 mock store 的 files 等属性不是 Vue 响应式，computed 无法同步更新
- 需要使用 mock implementation 直接设置 mock 属性值，而不是依赖返回值
- chapterStore.currentIndex 在 loadData 中被 setCurrentChapterByPathId 重置，测试中需要调整 mock 保持目标值
- IntersectionObserver 测试使用 globalThis.IntersectionObserver 检查，不是 window.IntersectionObserver
- 组件中使用 loadFiles 返回值而不是 computed files.value.length，避免响应式同步问题
## 2026-05-09 19:45 Task 12: App.vue 根路径恢复逻辑

### 实现内容

**App.vue**
- 导入 useRouter, useRoute, useSeriesStore, persistence, toReaderUrl, toSeriesUrl
- onMounted 检查 oute.path !== '/' 早期返回，非根路径不触发恢复
- 根路径时调用 seriesStore.loadSeries() 等待系列列表
- 获取 persistence.getCurrentSeries() 和 persistence.getCurrentChapterPath()
- 验证 saved series 存在于 seriesStore.list，无效则留在根路径
- 有效 series + 有效 chapter → outer.replace(toReaderUrl(series, chapter))
- 有效 series + 无效 chapter → outer.replace(toSeriesUrl(series))
- catch block 使用 console.warn 记录 loadSeries 失败，非空 catch

### TDD 验证

- RED: 8 tests failed (loadSeries/replace 未调用)
- GREEN: 8 tests passed
- 最终验证: 21 tests passed (App + router + SeriesPage)
- LSP diagnostics: clean
- grep: 无 TODO/空 catch/console.log/@ts-ignore/as any

### 关键设计

- 使用 outer.replace() 而非 push() 避免历史记录污染
- 使用 oute.path !== '/' 检查而非 oute.name，更直接判断根路径
- 空字符串 chapter 视为无效（savedChapterPath.trim() !== ''）
- 失败时不恢复，用户看到空列表而非错误页面

### Gotchas

- 测试路径: src/App.test.js 导入 stores/router 使用 ./stores/ 和 ./router/（而非 ../stores/）
- flushPromises + nextTick + flushPromises 组合等待 async onMounted 完成
- 非根路径测试自然通过，因为 App.vue 当前无任何逻辑自然不调用 loadSeries
