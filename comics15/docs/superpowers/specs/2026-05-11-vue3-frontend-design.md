# Vue3 前端重建设计

**日期**：2026-05-11  
**范围**：重建 `frontend/`，实现 Vue3 技术栈、漫画主流程与工具页基础框架。  
**依据**：`docs/project-architecture.md`、`docs/frontend-design.md`、`docs/backend-api.md`。

## 目标

前端采用 Vite + Vue3 + Pinia + Vue Router + Vitest。核心体验是移动端优先的本地漫画阅读器：用户打开应用后直接选择系列，逐级进入目录，通过章节首图卡片进入纵向沉浸阅读。

主应用不展示工具入口；工具管理页保留为直接 URL 访问能力，例如 `/tools`，用于后续维护和执行后端 Go 工具。

## 设计方向

整体视觉选择“极简沉浸阅读器”：背景深色、层级清楚、控件低干扰、阅读页尽量减少视觉噪音。页面不追求复杂装饰，而追求手指点击舒适、路径清晰、图片加载反馈明确。

关键视觉规则：

- 首页只承载系列选择，不出现阅读器空状态、侧边栏或工具入口。
- 目录页每次只展示当前层级，目录节点和章节节点混排并自然排序。
- 章节节点使用移动端单列横向卡片，左侧封面，右侧名称、页数与阅读进度。
- 阅读页采用纵向媒体流，底部显示半透明进度胶囊，右下角提供可展开快捷菜单。
- 工具页与主流程视觉区隔，不从主导航暴露，避免干扰阅读体验。

## 应用结构

`frontend/` 将包含：

```text
frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js
    ├── App.vue
    ├── router/index.js
    ├── pages/
    │   ├── SeriesPage.vue
    │   ├── DirectoryPage.vue
    │   ├── ReaderPage.vue
    │   └── ToolsPage.vue
    ├── components/
    │   ├── ChapterCard.vue
    │   ├── ReaderMediaItem.vue
    │   ├── ReaderShell.vue
    │   └── tools/
    ├── stores/
    │   ├── series-store.js
    │   ├── chapter-store.js
    │   ├── reader-store.js
    │   ├── progress-store.js
    │   └── tools-store.js
    ├── services/
    │   ├── api.js
    │   ├── media-url.js
    │   ├── storage.js
    │   └── tools-api.js
    ├── utils/
    │   ├── natural-sort.js
    │   ├── route-path.js
    │   ├── file-type.js
    │   └── dom.js
    └── config/index.js
```

## 路由设计

路由使用 Vue Router 4：

- `/`：系列列表页。
- `/series/:series/dir/:path*`：目录浏览页，`path` 为空时表示系列根目录。
- `/series/:series/read/:path*`：阅读页，`path` 表示章节相对路径。
- `/tools`：工具管理页，仅直接访问，不在主应用中展示入口。

中文系列名和章节路径按路径分段编码，避免把 `/` 作为普通字符编码后破坏层级语义。

## API 对接

漫画主流程使用三个接口：

- `GET /api/series`：加载系列列表。
- `GET /api/levels/{seriesName}?path={path}`：按需加载当前目录层级节点。
- `GET /api/chapter/{seriesName}?chapterPath={chapterPath}`：加载章节媒体文件。

工具页使用：

- `GET /api/tools`：工具元数据。
- `POST /api/tools/{name}/execute`：启动执行。
- `GET /api/tools/executions/{id}`：轮询执行状态。
- `POST /api/tools/executions/{id}/cancel`：取消执行。
- `DELETE /api/tools/executions/{id}`：清理执行记录。

组件不直接拼接 API URL，统一通过 `services/` 层访问。

## 页面设计

### 系列页

系列页负责选择漫画系列。页面包含标题、系列列表、加载状态、错误状态、空状态和重试入口。

点击系列后进入该系列目录根路径。列表项需要有足够触控面积，并保持简洁，不承载阅读控制。

### 目录页

目录页按当前层级展示节点。目录节点显示为可进入列表项，章节节点显示为横向首图卡片。节点混排，按自然排序展示。

章节卡片显示：

- 封面图。
- 章节名称。
- 总页数。
- 阅读进度：未读、读到第 N 页、已读完。
- 可选路径提示。

章节卡片封面使用懒加载。封面进入视口附近后再请求图片，加载前显示骨架或占位，加载失败时显示占位状态，避免目录层级中章节较多时一次性请求大量封面。

返回上一级时保持当前系列上下文。用户从阅读页返回目录后，高亮最近阅读章节。

### 阅读页

阅读页加载章节文件后按顺序纵向渲染图片、视频和 GIF。图片必须懒加载：媒体项先渲染占位高度，接近视口时再加载图片资源。图片默认使用后端推荐源；LQ 图片加载失败时回退 HQ，双击图片切换到 HQ。

阅读页显示：

- 媒体流。
- 底部进度胶囊：`当前页 / 总页数`，点击后打开跳页弹窗。
- 右下角浮动按钮，展开后提供上一话、下一话、返回目录。

当前页根据视口中心最接近的媒体项计算，并写入本地阅读进度。

点击进度胶囊时，阅读页打开跳页弹窗。弹窗显示当前页和总页数，提供页码输入框与确认按钮；输入范围限制为 `1` 到章节总页数。确认后滚动到对应媒体项，关闭弹窗，并同步更新当前页与阅读进度。

### 工具页

工具页只通过 `/tools` 访问。首轮实现提供工具列表、参数表单结构、执行记录和状态展示，为后续完善工具交互保留清晰边界。

## 状态管理

Pinia 拆分职责：

- `series-store`：系列列表、加载与错误状态。
- `chapter-store`：当前系列、当前路径、层级节点、章节导航上下文。
- `reader-store`：当前章节、媒体文件、加载状态、上一话和下一话。
- `progress-store`：阅读进度持久化与已读状态计算。
- `tools-store`：工具元数据、执行状态、轮询与历史记录。

本地持久化通过 `services/storage.js` 封装，避免组件直接访问 `localStorage`。

## 媒体加载规则

媒体文件以 HQ 目录为权威文件名来源。前端遵守后端返回的媒体字段：

- 图片优先使用 `preferredSource` 对应 URL。
- LQ 图片失败时回退 HQ。
- 视频和 GIF 使用 `videoUrl` 或 HQ URL。
- 不在前端假设 LQ 一定存在。
- 章节封面和阅读页图片都使用懒加载，进入视口附近才发起图片请求。

## 测试策略

首轮测试重点覆盖纯逻辑和高风险边界：

- 自然排序。
- 中文路径分段编码与解码。
- 媒体源选择与 LQ 回退逻辑。
- 阅读进度存储与章节卡片状态计算。
- API service 的 URL 构造。

页面级交互在实现后通过 Vitest + jsdom 做基础渲染测试；若后续需要浏览器级验证，再补 Playwright。

## 非目标

本次不改变后端 API，不引入 TypeScript，不添加本地 Tailwind 配置，不把工具入口放入主应用导航，不实现复杂主题系统。

## 成功标准

- `frontend/` 可以通过 `npm install`、`npm run build`、`npm test`。
- 首页可以加载 `/api/series` 并进入目录页。
- 目录页可以按 `/api/levels` 逐级浏览并进入章节。
- 阅读页可以按 `/api/chapter` 纵向展示媒体，并记录阅读进度。
- `/tools` 可以直接访问并具备后续扩展工具执行 UI 的基础结构。
- 主流程符合 `docs/frontend-design.md` 的移动端优先和沉浸阅读方向。
