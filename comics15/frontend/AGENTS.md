# AGENTS.md - Frontend

## OVERVIEW
Vite + Vue3 单页前端。主阅读器与工具管理页都在 `src/` 内实现，使用 Vue Router、Pinia、`.vue` 单文件组件；Tailwind 通过 CDN 引入，`css/**` 仍是有效样式资产。

## STRUCTURE
```text
frontend/
├── index.html              # SPA 入口，加载 src/main.js
├── src/
│   ├── main.js             # Vue3 + Pinia + Router 启动入口
│   ├── App.vue             # 根组件与路由恢复逻辑
│   ├── router/             # Vue Router 路由配置与 URL 构建
│   ├── stores/             # Pinia：series/chapter/reader/progress/tools
│   ├── pages/              # SeriesPage / DirectoryPage / ReaderPage / ToolsPage
│   ├── components/         # 阅读器组件；tools/ 为工具页组件
│   ├── composables/        # 组合式函数出口，当前预留
│   ├── services/           # API、媒体 URL、缓存、storage、tools-api
│   ├── utils/              # 章节树、文件类型、自然排序、请求队列等
│   └── config/             # 常量配置
├── css/                    # main imports variables/components/animations
└── dist/                   # Vite 构建输出
```

## WHERE TO LOOK
| 任务 | 位置 | Notes |
|------|------|-------|
| 主应用启动 | `src/main.js` | Vue3、Pinia、Router 挂载 |
| 根组件/恢复状态 | `src/App.vue` | 根据持久化状态恢复系列/章节/阅读位置 |
| 页面路由 | `src/router/index.js` | Vue Router 配置与 URL 构建函数 |
| 媒体 URL 构建 | `src/services/media-url.js` | `/hq_image`、`/lq_image`、`/video` 分段编码 |
| 系列列表页 | `src/pages/SeriesPage.vue` | 系列加载、搜索、错误展示 |
| 目录页 | `src/pages/DirectoryPage.vue` | 章节树、封面加载、目录导航 |
| 阅读页 | `src/pages/ReaderPage.vue` | 阅读器页面编排 |
| 工具管理页 | `src/pages/ToolsPage.vue` | 工具列表、配置、执行面板、历史记录编排 |
| 阅读器控制壳 | `src/components/ReaderShell.vue` | 跳页、章节导航、进度展示 |
| 媒体项渲染 | `src/components/ReaderMediaItem.vue` | 图片/视频/GIF 渲染与回退 |
| 工具页组件 | `src/components/tools/` | `ToolList`, `ToolConfig`, `ExecutionPanel`, `ExecutionHistory` |
| 状态管理 | `src/stores/` | Pinia stores + 迁移兼容的 `store.js`/`progress-state.js` |
| 后端 API 封装 | `src/services/api.js`, `catalog-api.js` | 漫画目录/章节请求 |
| 工具 API 封装 | `src/services/tools-api.js` | `/api/tools/*` |
| 章节元数据缓存 | `src/services/chapter-meta-cache.js` | DirectoryPage/chapter-store 复用 |
| 本地存储 | `src/services/storage.js`, `persistence.js` | 阅读进度、当前系列/章节、展开状态 |
| 样式变量 | `css/variables.css` | 主题 token，禁止删除 |
| 组件样式 | `css/components.css` | 页面/卡片/按钮等，禁止删除 |

## COMMANDS
```bash
npm run dev              # 默认 5173；VITE_DEV_PORT 可覆盖
npm run build
npm run preview          # 默认 4173
npm test
npm run test:watch
npm run test:coverage
npm run lint
npm run lint:fix
vitest run src/pages/DirectoryPage.test.js
vitest run src/components/ReaderMediaItem.test.js
```

## CONVENTIONS
- `package.json` 设置 `"type": "module"`；全部使用 ES module import/export。
- 新功能写在 `src/`；不要恢复旧 Vanilla 主阅读器壳层或虚构 `frontend/js/` 入口。
- 工具页现在是 Vue 路由页面；修改工具页时看 `ToolsPage.vue`、`components/tools/*`、`stores/tools-store.js`、`services/tools-api.js`。
- `src/services`、`src/utils`、`src/stores` 为共享模块；测试通常与源文件同目录。
- CSS 不是迁移清理对象；`css/**`、Tailwind CDN 引用、Vue 组件 class/token 使用方式不要作为冗余删除。
- Vite dev server 自带漫画静态中间件：`/hq_image` 404、`/lq_image` 204、`/video` 404；不要用 `file://` proxy。
- 中文系列名、章节路径、文件名进入 URL 前必须 `encodeURIComponent()`；多级路径按段编码，不能整体编码 `/`。
- LQ 图缺失返回 204；前端通过 `HEAD /lq_image/...` 判断并回退 HQ。
- GIF 走 `/video/`，因为 Nginx 将 video alias 到 HQ 目录。
- ESLint 9 flat config：单引号、分号、`no-var`、`prefer-const`、object shorthand；未用参数用 `_` 前缀。

## TESTS
- Vitest 配置在 `vitest.config.js`：globals + jsdom + v8 coverage。
- 测试文件集中在 `src/**/*.test.js`；重点覆盖 stores、services、utils、`App`、`DirectoryPage`。
- API/service 测试 mock `fetch`；store 测试常用 fake timers 和 Pinia 测试实例。
- 新增工具页行为优先补 `tools-api.test.js` 或 `tools-store` 相关测试。

## ANTI-PATTERNS
- 禁止 `var`；使用 `const`/`let`。
- 禁止空 catch；异常要记录或有明确忽略理由。
- 禁止为了迁移清理删除仍有业务价值的共享模块测试。
- 禁止把 `css/**` 当作 Vanilla 冗余代码删除。
- 禁止整体编码带 `/` 的章节路径。
- 不要新增 `tools.html`、`js/tools-main.js` 等旧工具页入口；当前实际入口是 Vue SPA。
