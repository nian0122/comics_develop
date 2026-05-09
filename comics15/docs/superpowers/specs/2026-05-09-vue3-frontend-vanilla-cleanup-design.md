# Vue3 前端 Vanilla 遗留清理设计

## 背景

前端主阅读器已经从 Vanilla ES6/Vite 迁移到 Vue3：`frontend/index.html` 当前加载 `/src/main.js`，Vue3 页面、组件、Pinia store 和 Vue Router 已位于 `frontend/src/`。与此同时，`frontend/js/` 中仍保留旧 Vanilla 主阅读器视图层、路由层、阅读器 DOM 组件和部分测试。

工具页仍未迁移到 Vue3：`frontend/tools.html` 当前加载 `js/tools-main.js`，因此工具页入口及其依赖必须保留。

## 目标

删除已被 Vue3 主阅读器替代、且不再被入口、测试、工具页或共享模块引用的旧 Vanilla JS 代码；保留仍被 Vue3 或工具页复用的服务、工具、状态和配置模块。

## 硬边界

- 不删除 `frontend/css/**`。
- 不改动 CSS 引用、Tailwind CDN 引用、Vue 组件 class/token 使用方式。
- 不删除 `frontend/tools.html`、`frontend/js/tools-main.js` 或工具页运行所需模块。
- 不删除仍被 `frontend/src/**` 引用的 `frontend/js/**` 共享模块。
- 不做大规模迁移，例如本次不把 `js/services`、`js/utils` 迁到 `src/`。
- 不提交 Git commit，除非用户明确要求。

## 推荐方案

采用 **JS-only 保守清理**：只删除旧 Vanilla 主阅读器的页面层、路由层、阅读器 DOM 组件和只服务于这些旧代码的测试/辅助文件；保留共享 API、存储、媒体 URL、章节树、文件类型、请求队列、章节元数据缓存、工具页 API 等模块。

## 当前入口与保留模块

### 主阅读器入口

- `frontend/index.html` → `/src/main.js`
- `frontend/src/main.js` → Vue3 应用、Pinia、Vue Router

### 工具页入口

- `frontend/tools.html` → `js/tools-main.js`

### 必须保留的旧 `js/` 共享模块

- `frontend/js/tools-main.js`：工具页 Vanilla 入口。
- `frontend/js/services/**`：Vue3 store、组件测试和工具页仍复用 API、存储、媒体 URL、工具 API。
- `frontend/js/config/constants.js`：Vue3 reader store 仍引用懒加载和重试配置。
- `frontend/js/state/progress-state.js`：Vue3 progress store 仍复用进度状态逻辑。
- `frontend/js/state/store.js`：仍被章节元数据缓存等遗留共享层依赖时保留。
- `frontend/js/app/chapter-meta-cache.js`：Vue3 章节/目录逻辑仍复用章节元数据缓存。
- `frontend/js/utils/chapter-tree.js`、`file-type.js`、`chapter-cover-meta.js`、`natural-sort.js`、`request-queue.js` 及其有效测试：Vue3 页面/store 或共享服务仍需要。

## 删除候选范围

以下文件属于旧 Vanilla 主阅读器壳层，原则上删除：

- `frontend/js/main.js`
- `frontend/js/app/series-view.js`
- `frontend/js/app/series-view.test.js`
- `frontend/js/app/directory-view.js`
- `frontend/js/app/directory-view.test.js`
- `frontend/js/app/reader-shell.js`
- `frontend/js/app/reader-shell.test.js`
- `frontend/js/app/index.js`
- `frontend/js/app/AGENTS.md`
- `frontend/js/components/reader.js`
- `frontend/js/components/reader.test.js`
- `frontend/js/components/index.js`
- `frontend/js/components/index.test.js`
- `frontend/js/router/**`
- 仅断言旧 UI 文件存在的测试，例如 `frontend/js/utils/reader-ui-files.test.js`
- 只服务于已删除旧路由/旧视图 barrel export 的测试或索引文件

实际删除前必须用引用搜索确认没有 `src/**`、`tools.html`、`js/tools-main.js` 或保留模块仍引用这些文件。

## 配置与文档调整

- `frontend/vitest.config.js`：删除后若不存在 `js/main.js`，需移除 coverage exclude 中的 `js/main.js`；保留 `js/tools-main.js` exclude。
- `frontend/package.json`：lint 仍可覆盖 `js/ src/`，因为共享 `js/` 与工具页仍存在；无需改成只 lint `src/`。
- `frontend/AGENTS.md`：更新为 Vue3 主阅读器 + Vanilla 工具页 + 共享 `js/` 模块的现状，删除旧主阅读器 `js/app`、`js/router`、`js/components/reader.js` 指引。
- 根 `AGENTS.md`：更新前端概览和 code map 中旧 Vanilla 主阅读器描述。

## 验证标准

清理完成后必须在 `frontend/` 下运行：

1. `npm run lint`
2. `npm test`
3. `npm run build`

通过标准：三项命令退出码均为 0；构建产物仍包含主入口和工具入口；`tools.html` 仍能加载 `js/tools-main.js` 对应构建资源。

## 自检

- 设计没有要求删除 CSS，且明确把 CSS 作为硬边界。
- 设计没有要求迁移共享 `js/` 模块到 `src/`，避免扩大范围。
- 设计区分了 Vue3 主阅读器和仍为 Vanilla 的工具页。
- 删除候选均需在实施阶段再次用引用搜索验证，避免误删。
