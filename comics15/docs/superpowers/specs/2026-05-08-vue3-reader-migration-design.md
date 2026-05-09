# Vue3 主阅读器迁移设计

## 背景与目标

当前前端是 Vite + Vanilla ES6 双入口应用：`index.html`/`js/main.js` 是主漫画阅读器，`tools.html`/`js/tools-main.js` 是工具管理页。本次只迁移主阅读器，工具页继续保持 Vanilla。迁移后的主阅读器采用 Vue3 + Pinia + Vue Router，视觉保持不变，继续复用现有 `css/`、`js/services/`、`js/utils/` 和 `js/config/`。

目标：
- 主阅读器由手写 DOM 迁移为 Vue3 组件。
- 当前 `store.js` 与 `progress-state.js` 的跨组件状态迁移为 Pinia。
- Vue Router 接管现有主阅读器 URL，并保持中文路径分段编码兼容。
- 保留系列搜索、逐级目录、章节封面懒加载、图片/视频/GIF 混合阅读、LQ/HQ 回退、双击 HQ、跳页、键盘导航和阅读进度恢复。
- `tools.html` 与 `js/tools-main.js` 不迁移，但必须继续构建和运行。

不做：不迁移工具页；不重新设计 UI；不改后端 API；不改 localStorage 键名；不引入虚拟滚动；不改变 `/hq_image/`、`/lq_image/`、`/video/` 契约。

## 采用方案

采用“完整替换主阅读器入口”：`index.html` 挂载 Vue 应用，新增 Vue Router、Pinia stores 和 SFC 组件；`tools.html` 继续引用 `js/tools-main.js`。不采用“Vue 壳包旧 Vanilla 类”，避免 Vue 和旧类同时拥有 DOM 生命周期导致重复绑定、清理不完整和状态不同步。

## 目标结构

```text
frontend/
├── index.html
├── tools.html                  # 保持 Vanilla
├── js/                         # 共享逻辑和工具页继续使用
│   ├── services/
│   ├── utils/
│   ├── config/
│   └── tools-main.js
└── src/
    ├── main.js
    ├── App.vue
    ├── router/index.js
    ├── stores/
    │   ├── series-store.js
    │   ├── chapter-store.js
    │   ├── reader-store.js
    │   └── progress-store.js
    ├── pages/
    │   ├── SeriesPage.vue
    │   ├── DirectoryPage.vue
    │   └── ReaderPage.vue
    └── components/
        ├── ChapterCard.vue
        ├── ReaderMediaItem.vue
        ├── ReaderShell.vue
        └── JumpPageModal.vue
```

`index.html` 改为 Vue 挂载点和 `/src/main.js`；`tools.html` 不改。`vite.config.js` 继续保留 `main: './index.html'` 与 `tools: './tools.html'` 双入口，并保留 dev server 静态媒体插件。

## 路由设计

Vue Router 兼容现有 URL：

| 页面 | URL |
| --- | --- |
| 系列列表 | `/` |
| 系列目录根层级 | `/series/{series}` |
| 指定目录层级 | `/series/{series}/dir/{path...}` |
| 阅读章节 | `/series/{series}/read/{path...}` |

建议路由：

```js
const routes = [
  { path: '/', name: 'seriesList', component: SeriesPage },
  { path: '/series/:series', name: 'directory', component: DirectoryPage },
  { path: '/series/:series/dir/:path(.*)', name: 'directoryPath', component: DirectoryPage },
  { path: '/series/:series/read/:path(.*)', name: 'reader', component: ReaderPage },
];
```

必须复用或移植现有 URL builder：`encodePathSegments()`、`toSeriesUrl()`、`toDirectoryUrl()`、`toReaderUrl()`。章节路径先把 Windows 反斜杠规范化为 `/`，再按段 `encodeURIComponent()`；禁止整体编码包含 `/` 的路径。打开 `/` 时继续读取 `persistence.getCurrentSeries()` 和 `persistence.getCurrentChapterPath()`，用 `router.replace()` 恢复上次位置。

## Pinia 状态设计

- `series-store.js`：`seriesList`、`currentSeries`、加载状态、错误状态；负责 `loadSeries()` 和当前系列恢复。
- `chapter-store.js`：`flatChapters`、`chapterTree`、`currentChapter`、`currentChapterIndex`、`currentPath`、`returnPath`、`levelCache`、`chapterMetaCache`；负责章节列表、层级目录和章节元数据缓存。
- `reader-store.js`：`files`、`isLoading`、`scale`、`lazyObserver`、`nextToObserve`、`loadedCount`、`imageRetryMap`；负责阅读器文件、懒加载和重试状态。`resetLazyLoad()` 必须断开 observer 并清理 timeout。
- `progress-store.js`：`currentPage`、`totalPages`、`scrollPercent`；负责页码计算、滚动百分比、阅读进度保存与恢复。

`ChapterMetaCache` 可保留为纯类，由 `chapter-store` 持有，降低目录封面和相邻章节预加载改动。

## 页面组件设计

`SeriesPage.vue` 对应旧 `SeriesView`：保留加载、错误、空态、搜索过滤、上次阅读提示和点击系列导航。复用 `mobile-page-header`、`glass-input`、`series-row`、`series-reading-hint` 等类名。

`DirectoryPage.vue` 对应旧 `DirectoryView`：根据路由加载当前系列和层级；目录节点使用 `directory-row`，章节节点使用 `chapter-card-v2`；返回逻辑继续用 `getParentPath()`；章节封面继续用 IntersectionObserver + `RequestQueue(LAZY_LOAD_CONFIG.COVER_MAX_CONCURRENT)`；保留 token 防止旧封面请求污染新目录。

`ReaderPage.vue` 负责阅读章节编排：确保章节列表已加载，定位章节索引，加载章节文件，优先使用章节元数据缓存，保存当前位置，预加载下一章，找不到章节时回目录。

`ReaderShell.vue` 负责右下角快捷菜单、上一话、下一话、返回目录、进度胶囊和跳页入口。保留 `G` 键跳页、左/右方向键切章。

`JumpPageModal.vue` 保留旧跳页弹窗文案与视觉。

`ReaderMediaItem.vue` 对应旧 `Reader` 的单媒体加载逻辑：骨架屏、IntersectionObserver 触发加载、图片/视频/GIF 类型分流、失败重试、LQ 加载失败回 HQ、双击 LQ 切 HQ、加载成功后通知进度更新。

## 媒体契约

Vue 组件不得手写媒体 URL，必须通过现有服务层：

- 普通图片 `cover_source = lq` 时走 `api.buildLQImageUrl()`。
- 普通图片 `cover_source = hq` 时走 `api.buildHQImageUrl()`。
- `cover_source` 缺失或异常时走 `api.resolveImageUrl()`，保留 HEAD 探测 LQ。
- LQ 单图失败时自动回退 HQ。
- 视频和 GIF 永远走 `api.buildVideoUrl()`。
- 双击 LQ 图片时先 `api.checkHQImageUsable()`，可用再切 HQ。
- 中文系列、章节、文件名保持分段编码。

## 测试策略

迁移遵循测试先行。迁移前补旧视图保护性测试：

- `js/app/series-view.test.js`：系列渲染、阅读提示、搜索过滤、点击回调、错误重试、空态。
- `js/app/directory-view.test.js`：目录行和章节卡片渲染、目录点击、章节点击、返回父级、封面懒加载、token 防污染、无预览。

迁移后新增 Vue 测试：

```text
src/pages/SeriesPage.test.js
src/pages/DirectoryPage.test.js
src/pages/ReaderPage.test.js
src/components/ReaderMediaItem.test.js
src/components/ReaderShell.test.js
src/components/JumpPageModal.test.js
src/stores/*.test.js
src/router/index.test.js
```

继续保留并运行 `js/utils/**/*.test.js`、`js/services/**/*.test.js`、`js/router/route-builder.test.js`、`js/router/route-parser.test.js`。

最终验证：

```bash
npm test
npm run lint
npm run build
```

## 实施顺序

1. 安装 Vue3、Pinia、Vue Router、Vue Test Utils 及必要 ESLint/Vitest 支持。
2. 更新测试、lint、覆盖率配置，覆盖 `src/**/*.js` 与 `src/**/*.vue`，并保持工具页入口可构建。
3. 补旧 `SeriesView` 和 `DirectoryView` 保护性测试。
4. 新建 Vue 入口、`App.vue`、Router 和空页面组件。
5. 迁移路由 builder/decoder 兼容逻辑并补 Vue Router 测试。
6. 迁移 Pinia stores 并补 store 测试。
7. 迁移 `SeriesPage.vue`。
8. 迁移 `DirectoryPage.vue`、`ChapterCard.vue` 和封面懒加载。
9. 迁移 `ReaderPage.vue`、`ReaderShell.vue`、`JumpPageModal.vue`。
10. 迁移 `ReaderMediaItem.vue`，保留媒体加载、重试、双击 HQ、滚动页码计算。
11. 更新 `index.html` 指向 Vue 入口，保留 `tools.html`。
12. 跑完整测试、lint、build 并修复问题。

## 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 中文路径编码错误 | 复用 `encodePathSegments()` 并保留 route-builder 测试 |
| localStorage 进度丢失 | 不改 `storage.js` 键名，迁移前后验证恢复 |
| LQ/HQ 策略回归 | 保留 `api.resolveImageUrl()` 和媒体组件测试 |
| Observer 清理不完整 | Vue `onBeforeUnmount()` 中断开 observer 和 timeout |
| 工具页构建受影响 | `tools.html` 入口不改，build 验证双入口 |
| 视觉漂移 | 复用现有 CSS 类名，不做 UI 重设 |
| 半迁移 DOM 冲突 | 主阅读器 DOM 由 Vue 单独拥有，不嵌入旧 View 类 |

## 完成标准

- `npm test` 通过。
- `npm run lint` 无 error。
- `npm run build` 通过，并同时产出主阅读器和工具页。
- 主阅读器原 URL 可直接访问和刷新。
- `/` 能恢复上次阅读位置。
- 系列列表、目录逐级浏览、章节封面、阅读器懒加载、跳页、键盘切章、返回目录正常。
- LQ 缺失回退 HQ、GIF/video 路径、双击 HQ 正常。
- `tools.html` 仍能加载工具列表、执行工具并轮询状态。
