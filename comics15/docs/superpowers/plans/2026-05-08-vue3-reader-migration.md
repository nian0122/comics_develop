# Vue3 Reader Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 将主漫画阅读器迁移到 Vue3 + Pinia + Vue Router，工具页继续 Vanilla，视觉与阅读行为保持兼容。

**Architecture:** index.html 挂载 Vue 应用；tools.html 继续引用 js/tools-main.js。Vue 代码放入 frontend/src/，复用 js/services、js/utils、js/config 和 css；Pinia 拆分状态，Vue Router 保持原 URL。

**Tech Stack:** Vue 3, Pinia, Vue Router 4, Vite 5, Vitest 2, Vue Test Utils, ESLint 9.

---

## 固定约束
- 只迁移 index.html 主阅读器；不迁移 tools.html。
- 不改 UI、后端 API、localStorage 键名、媒体路径契约。
- Vue 组件不得手写媒体 URL；必须走现有 api / media-url。
- 保留中文路径分段编码、LQ 204 回退 HQ、GIF/video /video/、双击 HQ、跳页、键盘切章、阅读进度恢复。

## Task 1: Vue 工具链
**Files:** frontend/package.json, vite.config.js, vitest.config.js, eslint.config.js.
- [x] 安装依赖：npm install vue@^3 pinia@^2 vue-router@^4；npm install -D @vitejs/plugin-vue @vue/test-utils @vue/compiler-sfc eslint-plugin-vue vue-eslint-parser。
- [x] vite.config.js 加 @vitejs/plugin-vue，plugins 为 [vue(), comicStaticPlugin()]，保留 main/tools 双入口。
- [x] vitest.config.js include/coverage 覆盖 src/**/*.test.js、src/**/*.js、src/**/*.vue，排除 src/main.js。
- [x] eslint.config.js 支持 .vue，保留现有 semi/quotes/no-var/prefer-const 等规则。
- [x] package.json lint 改为 eslint js/ src/ --ext .js,.vue。
- [x] 验证：npm test && npm run lint && npm run build。

## Task 2: 旧系列页保护测试
**Files:** create frontend/js/app/series-view.test.js.
- [x] 测试 SeriesView：系列渲染、阅读提示、搜索过滤、点击回调、错误重试、空态。
- [x] 命令：npx vitest run js/app/series-view.test.js js/app/reader-shell.test.js js/app/chapter-meta-cache.test.js。
- [x] Expected: PASS；只在测试暴露真实 bug 时改 series-view.js。

## Task 3: 旧目录页保护测试
**Files:** create frontend/js/app/directory-view.test.js.
- [x] 测试 DirectoryView：目录行、章节卡片、目录点击、章节点击、根返回系列、子层返回父目录。
- [x] 命令：npx vitest run js/app/directory-view.test.js js/utils/chapter-tree.test.js js/utils/lazy-cover.test.js js/utils/request-queue.test.js。
- [x] Expected: PASS；只在测试暴露真实 bug 时改 directory-view.js。

## Task 4: Vue 入口与路由骨架
**Files:** create src/main.js, src/App.vue, src/router/index.js, placeholder pages, router test; modify index.html.
- [x] 先写 src/router/index.test.js 验证 toSeriesUrl、toDirectoryUrl、toReaderUrl、Windows 反斜杠规范化，且路径不含 %2F。
- [x] 实现 encodePathSegments, toSeriesListUrl, toSeriesUrl, toDirectoryUrl, toReaderUrl, routes, router。
- [x] 创建占位 SeriesPage.vue, DirectoryPage.vue, ReaderPage.vue，保留 mobile-view / reader-view。
- [x] App.vue 用 RouterView；main.js 安装 Pinia 和 router。
- [x] index.html body 改为 div#app + /src/main.js；不改 tools.html。
- [x] 验证：npx vitest run src/router/index.test.js && npm run build。

## Task 5: Pinia stores
**Files:** create src/stores/{series,chapter,reader,progress}-store.js and tests.
- [x] series-store: loadSeries, setCurrentSeries, restoreLastSeries；mock api/persistence 测试。
- [x] chapter-store: flatChapters, chapterTree, currentChapterIndex, levelCache, ChapterMetaCache；测试章节加载、层级缓存、当前章节。
- [x] reader-store: files/loading/scale/lazy observer/retry map；测试 resetLazyLoad disconnect 和清 timer。
- [x] progress-store: current/total/scroll；委托旧 progressState 和 storage 保持兼容。
- [x] 验证：npx vitest run src/stores js/state/store.test.js js/state/progress-state.test.js。

## Task 6: SeriesPage
**Files:** src/pages/SeriesPage.vue, SeriesPage.test.js.
- [x] 测试：系列与阅读提示、搜索过滤、点击系列兼容 URL、错误重试。
- [x] 实现：onMounted(loadSeries), v-model 搜索, computed filter, storage.getSeriesLastReading, router.push(toSeriesUrl(name))，保留旧 CSS 类名和文案。
- [x] 验证：npx vitest run src/pages/SeriesPage.test.js src/stores/series-store.test.js。

## Task 7: DirectoryPage + ChapterCard
**Files:** src/components/ChapterCard.vue, src/pages/DirectoryPage.vue and tests.
- [x] ChapterCard 测试/实现：显示名称、进度、路径标签，emit open(path_id)，保留 chapter-card-v2 等类名。
- [x] DirectoryPage 测试/实现：加载 chapters/level nodes；目录/章节渲染；根返回 /；子层返回父目录；用 toDirectoryUrl/toReaderUrl。
- [x] 验证：npx vitest run src/components/ChapterCard.test.js src/pages/DirectoryPage.test.js src/stores/chapter-store.test.js。

## Task 8: 目录封面懒加载
**Files:** modify ChapterCard.vue, DirectoryPage.vue and tests.
- [x] ChapterCard 加 cover prop，测试 img 和 无预览。
- [x] DirectoryPage 加 IntersectionObserver + RequestQueue(LAZY_LOAD_CONFIG.COVER_MAX_CONCURRENT) + token；调用 chapterMetaCache.getOrFetchByPathId(pathId)。
- [x] onBeforeUnmount disconnect observer 并 clear queue。
- [x] 验证：npx vitest run src/components/ChapterCard.test.js src/pages/DirectoryPage.test.js。

## Task 9: ReaderShell + JumpPageModal
**Files:** create src/components/JumpPageModal.vue, ReaderShell.vue and tests.
- [x] Modal 测试/实现：保留 jumpModal, jumpPageInput, jumpCancelBtn, jumpConfirmBtn, totalPages；confirm emits page number。
- [x] Shell 测试/实现：保留 readerMenuBtn, readerActions, prevBtn, nextBtn, backToDirectoryBtn, progressStatus；emit prev/next/back/jump；keydown ArrowLeft/ArrowRight/G 并 unmount cleanup。
- [x] 验证：npx vitest run src/components/JumpPageModal.test.js src/components/ReaderShell.test.js。

## Task 10: ReaderMediaItem
**Files:** create src/components/ReaderMediaItem.vue and test.
- [x] 测试：coverSource=lq/hq 走对应 URL；缺失走 resolveImageUrl；gif/video 走 buildVideoUrl；双击 LQ 检查并切 HQ。
- [x] 实现：lazy-image-container、骨架屏、img/video、defineExpose loadMedia、IMAGE_RETRY_CONFIG、LQ error fallback HQ、最终失败 emit failed、成功 emit loaded 并 increment loaded count。
- [x] 验证：npx vitest run src/components/ReaderMediaItem.test.js js/components/reader.test.js js/services/api.test.js。

## Task 11: ReaderPage
**Files:** src/pages/ReaderPage.vue, ReaderPage.test.js.
- [x] 测试：route series/path 加载章节文件，渲染媒体项，初始化进度，next/back 使用兼容 URL。
- [x] 实现：确保章节列表已加载；定位 chapter index；set return path；load files；progressStore.init/restore；persistence.saveCurrentPosition；observer 触发 media load；预加载下一章；jumpToPage；滚动计算当前页。
- [x] route change/unmount 清理 lazy observer。
- [x] 验证：npx vitest run src/pages/ReaderPage.test.js src/components/ReaderMediaItem.test.js src/components/ReaderShell.test.js。

## Task 12: 根路由恢复
**Files:** src/App.vue, src/App.test.js.
- [x] 测试：/ 时 load series，若 saved series/chapter 有效，router.replace(toReaderUrl(...))；只有 series 则 replace toSeriesUrl。
- [x] 实现 App.vue onMounted 恢复逻辑，无效保存则留在 /。
- [x] 验证：npx vitest run src/App.test.js src/router/index.test.js src/pages/SeriesPage.test.js。

## Task 13: 完整验证
- [ ] npm test：全部旧/新 Vitest 通过。
- [ ] npm run lint：零 error。
- [ ] npm run build：同时构建 Vue 主阅读器和 Vanilla 工具页。
- [ ] npm run dev 浏览器 smoke：验证 /, /series/..., /series/.../read/..., /tools.html。无后端/媒体数据时记录限制。
- [ ] 不要提交，除非用户明确要求。

## Self-review
- 覆盖规格：工具链、Vue 入口、Router、Pinia、系列页、目录页、封面懒加载、阅读器控制、媒体项、阅读页、根恢复、工具页保留和完整验证。
- 每个行为迁移任务都有测试和目标命令。
- 兼容点明确：路径编码、localStorage、LQ/HQ、GIF/video、快捷键、进度恢复、双入口构建。
- 范围保持为主阅读器迁移，不含后端、工具页迁移或视觉重设。
