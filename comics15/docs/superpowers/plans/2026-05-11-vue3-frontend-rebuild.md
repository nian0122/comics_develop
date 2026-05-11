# Vue3 前端重建 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重建 `frontend/`，交付 Vue3/Vite/Pinia/Router/Vitest 前端，使漫画主流程可用，并保留 `/tools` 工具页基础框架。

**Architecture:** 前端按页面、组件、状态、服务、工具函数拆分。组件只负责渲染和交互，Pinia 管理跨页面状态，`services/` 统一封装后端 API 和本地存储，`utils/` 承载可测试纯逻辑。主流程为系列页 → 目录页 → 阅读页，工具页通过 `/tools` 直接访问但不出现在主导航。

**Spec:** `docs/superpowers/specs/2026-05-11-vue3-frontend-design.md`

**References:**

- `docs/project-architecture.md`
- `docs/frontend-design.md`
- `docs/backend-api.md`
- `AGENTS.md`

## Constraints

- 全程使用中文注释、文档和提交信息。
- 不修改后端 API、Nginx alias 或 Docker 边界。
- 不引入 TypeScript。
- 不添加本地 Tailwind 配置；Tailwind 继续通过 CDN 使用。
- 禁止 `as any`、`@ts-ignore`、`@ts-expect-error`。
- 禁止空 `catch`。
- 未收到用户明确提交请求时，不创建 git commit。

## File Structure

### 项目根文件

- `frontend/package.json`：前端依赖、构建、测试、lint 脚本。
- `frontend/index.html`：Vite SPA 入口，加载 Tailwind CDN。
- `frontend/vite.config.js`：Vue 插件、dev server 代理、Vitest/jsdom 配置。

### 应用入口

- `frontend/src/main.js`：创建 Vue app、Pinia、Router。
- `frontend/src/App.vue`：根布局和路由出口。
- `frontend/src/config/index.js`：API base、存储 key、媒体常量。

### 路由

- `frontend/src/router/index.js`：路由表、分段路径编码/跳转辅助。

### 服务层

- `frontend/src/services/api.js`：`/api/series`、`/api/levels`、`/api/chapter`。
- `frontend/src/services/tools-api.js`：`/api/tools` 相关调用。
- `frontend/src/services/media-url.js`：媒体源选择、LQ 回退辅助。
- `frontend/src/services/storage.js`：localStorage 安全读写。

### 状态层

- `frontend/src/stores/series-store.js`：系列列表状态。
- `frontend/src/stores/chapter-store.js`：当前系列、目录路径、层级节点。
- `frontend/src/stores/reader-store.js`：章节媒体、当前章节导航状态。
- `frontend/src/stores/progress-store.js`：阅读进度持久化和卡片状态。
- `frontend/src/stores/tools-store.js`：工具列表、执行状态、轮询。

### 页面和组件

- `frontend/src/pages/SeriesPage.vue`：首页系列列表。
- `frontend/src/pages/DirectoryPage.vue`：逐级目录浏览。
- `frontend/src/pages/ReaderPage.vue`：纵向阅读页。
- `frontend/src/pages/ToolsPage.vue`：工具管理基础页。
- `frontend/src/components/ChapterCard.vue`：章节横向卡片。
- `frontend/src/components/ReaderShell.vue`：阅读页浮层、进度、快捷按钮。
- `frontend/src/components/ReaderMediaItem.vue`：图片/视频/GIF 媒体项。
- `frontend/src/components/JumpPageModal.vue`：页码输入跳转弹窗。
- `frontend/src/components/tools/ToolList.vue`：工具列表。
- `frontend/src/components/tools/ToolConfig.vue`：工具参数表单基础结构。
- `frontend/src/components/tools/ExecutionPanel.vue`：当前执行状态。
- `frontend/src/components/tools/ExecutionHistory.vue`：执行历史。

### 工具函数与测试

- `frontend/src/utils/natural-sort.js`：自然排序。
- `frontend/src/utils/route-path.js`：中文路径分段编码/解码。
- `frontend/src/utils/file-type.js`：媒体类型判断。
- `frontend/src/utils/lazy-image.js`：图片懒加载观察器辅助。
- `frontend/src/utils/dom.js`：视口中心页计算辅助。
- `frontend/src/**/*.test.js`：Vitest 单元测试，与源文件同目录。

## Implementation Tasks

### 1. 创建基础工程

- [ ] 写入 `frontend/package.json`，添加 Vue3、Pinia、Vue Router、Vite、Vitest、jsdom、Vue Test Utils 依赖和脚本。
- [ ] 写入 `frontend/index.html`，挂载 `#app`，通过 CDN 加载 Tailwind。
- [ ] 写入 `frontend/vite.config.js`，配置 Vue、dev server 代理 `/api` 到 `http://localhost:500`、测试环境为 jsdom。
- [ ] 写入 `frontend/src/main.js`、`frontend/src/App.vue`、`frontend/src/config/index.js`。
- [ ] 运行 `npm install`。
- [ ] 运行 `npm run build`，确认空壳应用可构建。

### 2. 先写纯逻辑测试

- [ ] 为 `utils/natural-sort.js` 写失败测试：`第 1 话`、`第 2 话`、`第 10 话` 顺序正确。
- [ ] 运行对应测试，确认失败。
- [ ] 实现 `natural-sort.js`，使用 `Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })`。
- [ ] 运行对应测试，确认通过。
- [ ] 为 `utils/route-path.js` 写失败测试：中文路径逐段编码，斜杠保留为层级分隔。
- [ ] 实现 `route-path.js`。
- [ ] 为 `services/media-url.js` 写失败测试：图片优先 preferred source、LQ 失败可回退 HQ、视频优先 `videoUrl`。
- [ ] 实现 `media-url.js`。
- [ ] 为 `services/storage.js` 写失败测试：JSON 读写、损坏 JSON 有明确回退且不空 catch。
- [ ] 实现 `storage.js`。
- [ ] 为 `utils/lazy-image.js` 写失败测试：图片进入视口附近才触发加载回调，并能清理观察器。
- [ ] 实现 `lazy-image.js`。
- [ ] 运行 `npm test`，确认所有纯逻辑测试通过。

### 3. 实现 API 服务层

- [ ] 为 `services/api.js` 写 URL 构造测试，覆盖 `seriesName` 和 `path/chapterPath` 中文参数。
- [ ] 实现 `fetchJson` 辅助，非 2xx 抛出带状态码的错误。
- [ ] 实现 `fetchSeries`、`fetchLevel`、`fetchChapter`。
- [ ] 为 `services/tools-api.js` 写基础 URL 构造测试。
- [ ] 实现工具列表、启动、状态、取消、删除接口函数。
- [ ] 运行 `npm test`。

### 4. 实现路由

- [ ] 写入 `router/index.js`，定义 `/`、`/series/:series/dir/:path*`、`/series/:series/read/:path*`、`/tools`。
- [ ] 添加跳转辅助函数：进入系列根目录、进入子目录、进入章节阅读、返回目录。
- [ ] 写路由辅助测试，确保中文路径和空路径处理正确。
- [ ] 运行 `npm test`。

### 5. 实现 Pinia stores

- [ ] 实现 `series-store.js`：加载系列、错误和重试状态。
- [ ] 实现 `chapter-store.js`：加载当前层级、目录/章节节点自然排序、记录最近目录路径。
- [ ] 实现 `progress-store.js`：按 `series + chapterPath` 保存当前页、总页数、完成状态。
- [ ] 实现 `reader-store.js`：加载章节媒体、保存当前页、暴露上一话/下一话占位计算入口。
- [ ] 实现 `tools-store.js`：加载工具、启动执行、轮询状态、停止轮询。
- [ ] 为关键 store 写单元测试，mock service 函数。
- [ ] 运行 `npm test`。

### 6. 实现系列页

- [ ] 写 `SeriesPage.vue` 的基础渲染测试：加载中、错误、空列表、有列表。
- [ ] 实现 `SeriesPage.vue`，包含标题、系列列表、重试按钮。
- [ ] 点击系列时跳转到目录根路径。
- [ ] 运行页面测试。

### 7. 实现目录页和章节卡片

- [ ] 写 `ChapterCard.vue` 测试：封面懒加载、页数、进度文案、点击事件、封面失败占位。
- [ ] 实现 `ChapterCard.vue`。
- [ ] 写 `DirectoryPage.vue` 基础测试：目录节点、章节节点、返回上一级、错误/空状态。
- [ ] 实现 `DirectoryPage.vue`，按当前路由加载 `/api/levels`。
- [ ] 目录节点点击进入下一层；章节卡片点击进入阅读页。
- [ ] 返回阅读页来源目录时，高亮最近阅读章节。
- [ ] 运行相关测试。

### 8. 实现阅读页

- [ ] 写 `ReaderMediaItem.vue` 测试：图片懒加载、视频/GIF、LQ 失败回退 HQ、双击切 HQ、加载前占位。
- [ ] 实现 `ReaderMediaItem.vue`。
- [ ] 写 `JumpPageModal.vue` 测试：显示当前页/总页数、限制页码范围、确认与关闭事件。
- [ ] 实现 `JumpPageModal.vue`。
- [ ] 写 `ReaderShell.vue` 测试：进度胶囊、点击胶囊打开跳页弹窗、浮动菜单、按钮禁用态。
- [ ] 实现 `ReaderShell.vue`。
- [ ] 写 `ReaderPage.vue` 测试：加载章节、渲染媒体流、更新阅读进度、确认页码后滚动到目标媒体项。
- [ ] 实现 `ReaderPage.vue`，使用 IntersectionObserver 或视口中心计算更新当前页。
- [ ] 实现跳页确认逻辑：校验目标页码，滚动到对应媒体项，关闭弹窗并同步阅读进度。
- [ ] 上一话/下一话先基于目录上下文内章节列表计算；不可用时禁用按钮。
- [ ] 返回目录跳回章节所在层级。
- [ ] 运行相关测试。

### 9. 实现工具页基础框架

- [ ] 写 `ToolList.vue` 测试：工具列表和选中事件。
- [ ] 实现 `ToolList.vue`。
- [ ] 写 `ToolConfig.vue` 测试：根据参数配置渲染输入项。
- [ ] 实现 `ToolConfig.vue`。
- [ ] 实现 `ExecutionPanel.vue` 和 `ExecutionHistory.vue` 的基础状态展示。
- [ ] 实现 `ToolsPage.vue`，组合工具列表、配置、执行状态。
- [ ] 运行相关测试。

### 10. 样式与移动端体验收口

- [ ] 统一深色主题、触控面积、卡片圆角、加载骨架、错误状态样式。
- [ ] 确认主应用没有工具入口。
- [ ] 确认阅读页无常规导航，只有低干扰进度和快捷按钮。
- [ ] 用浏览器手动检查 375px 宽度下首页、目录页、阅读页布局。

### 11. 全量验证

- [ ] 运行 `npm test`。
- [ ] 运行 `npm run build`。
- [ ] 如后端可用，运行 `npm run dev` 并手动验证：系列页 → 目录页 → 阅读页 → 返回目录。
- [ ] 手动访问 `/tools`，确认工具页不依赖主导航且页面可打开。
- [ ] 记录任何后端数据或本地漫画目录缺失导致的不可验证项。

## Risk Notes

- `frontend/` 当前为空，首轮实现文件多，必须按任务逐步验证，避免一次性大改后难以定位问题。
- `/api/levels` 返回字段中章节路径是 `path_id`，目录路径是 `path`，组件必须区分。
- 纯视频/GIF 章节可能没有 `cover_url`，章节卡片需要占位状态。
- LQ 可能不存在，图片组件不能假设 `/lq_image` 一定返回有效图片。
- 阅读页章节可能包含大量图片，必须懒加载并清理观察器，避免一次性请求和内存泄漏。
- 中文路径必须分段编码，否则多级目录会被错误折叠或过度编码。

## Completion Criteria

- `npm test` 通过。
- `npm run build` 通过。
- 主要页面和组件均存在并与设计文档一致。
- 主应用不暴露工具入口，`/tools` 可直接访问。
- 后端 API 调用集中在 `services/`，组件不直接拼接接口。
