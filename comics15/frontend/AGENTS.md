# AGENTS.md - Frontend

## OVERVIEW
Vite + Vue3 主漫画阅读器 + Vanilla 工具管理页。主阅读器使用 Vue Router、Pinia、`.vue` 单文件组件；工具页仍由 `tools.html` 加载 `js/tools-main.js`。`js/` 目录保留共享服务、工具函数、状态兼容层和工具页入口。Tailwind 仍通过 CDN 引入，CSS 文件必须保留。

## STRUCTURE
```text
frontend/
├── index.html              # 主阅读器入口，加载 src/main.js
├── tools.html              # 工具管理入口，加载 js/tools-main.js
├── src/
│   ├── main.js             # Vue3 + Pinia + Router 启动入口
│   ├── App.vue             # 根组件与路由恢复逻辑
│   ├── router/             # Vue Router 路由配置与 URL 构建
│   ├── stores/             # Pinia：series/chapter/reader/progress
│   ├── pages/              # SeriesPage / DirectoryPage / ReaderPage
│   └── components/         # ChapterCard / ReaderShell / ReaderMediaItem / JumpPageModal
├── js/
│   ├── tools-main.js       # Vanilla 工具页入口
│   ├── app/                # 仅保留 ChapterMetaCache 等 Vue3 复用模块
│   ├── services/           # catalog-api, media-url, api, storage, tools-api
│   ├── state/              # progress-state 与兼容 store
│   ├── utils/              # 章节树、文件类型、自然排序、请求队列等共享函数
│   └── config/constants.js # 懒加载/章节数量等常量
└── css/                    # main imports variables/components/animations，禁止作为冗余删除
```

## WHERE TO LOOK
| 任务 | 位置 | Notes |
|------|------|-------|
| 主应用启动 | `src/main.js` | Vue3、Pinia、Router 挂载 |
| 根组件/恢复状态 | `src/App.vue` | 根据持久化状态恢复系列/章节/阅读位置 |
| 页面路由 | `src/router/index.js` | Vue Router 配置与 URL 构建函数 |
| 系列列表页 | `src/pages/SeriesPage.vue` | 系列加载、搜索、错误展示 |
| 目录页 | `src/pages/DirectoryPage.vue` | 章节树、封面加载、目录导航 |
| 阅读页 | `src/pages/ReaderPage.vue` | 阅读器页面编排 |
| 阅读器控制壳 | `src/components/ReaderShell.vue` | 跳页、章节导航、进度展示 |
| 媒体项渲染 | `src/components/ReaderMediaItem.vue` | 图片/视频/GIF 渲染与回退 |
| 状态管理 | `src/stores/` | Pinia stores，仍复用部分 `js/` 共享模块 |
| 工具管理页 | `js/tools-main.js` | Vanilla 工具表单、执行状态、1 秒轮询 |
| 目录 API 封装 | `js/services/catalog-api.js` | `/api/series`, `/api/chapters`, 层级节点 |
| 媒体 URL 构建 | `js/services/media-url.js` | `/lq_image`/`/hq_image`/`/video`，中文路径分段编码 |
| 兼容 API 对象 | `js/services/index.js` / `api.js` | 合并 `catalogApi` + `mediaUrl`，保留旧导入 |
| 工具 API 封装 | `js/services/tools-api.js` | `/api/tools/*` |
| 本地存储 | `js/services/storage.js` + `persistence.js` | 阅读进度、当前系列/章节、展开状态 |
| 阅读进度兼容层 | `js/state/progress-state.js` | Vue3 progress store 仍复用 |
| 章节元数据缓存 | `js/app/chapter-meta-cache.js` | DirectoryPage/chapter-store 仍复用 |
| 章节树 | `js/utils/chapter-tree.js` | 扁平章节转多级目录 |
| 文件类型 | `js/utils/file-type.js` | GIF 视作 video 路径 |
| 样式变量 | `css/variables.css` | 主题 token，禁止删除 |
| 组件样式 | `css/components.css` | 页面/卡片/按钮等，禁止删除 |

## COMMANDS
```bash
npm run dev              # 默认 5173；VITE_DEV_PORT 可覆盖
npm run build
npm run preview
npm test
npm run test:watch
npm run test:coverage
npm run lint
npm run lint:fix
vitest run src/pages/DirectoryPage.test.js
```

## CONVENTIONS
- `package.json` 设置 `"type": "module"`；全部使用 ES module import/export。
- 主阅读器新功能优先写在 `src/`，不要恢复旧 Vanilla 主阅读器壳层。
- 工具页仍是 Vanilla；修改工具页时看 `tools.html`、`js/tools-main.js`、`js/services/tools-api.js`。
- `js/services`、`js/utils`、`js/state` 中仍有 Vue3 复用模块，删除前必须做引用搜索。
- CSS 不是迁移清理对象；`css/**`、Tailwind CDN 引用、Vue 组件 class/token 使用方式不要作为冗余删除。
- 中文系列名、章节路径、文件名进入 URL 前必须 `encodeURIComponent()`；多级路径按段编码，不能整体编码 `/`。
- LQ 图缺失返回 204；前端通过 `HEAD /lq_image/...` 判断并回退 HQ。
- GIF 走 `/video/`，因为 Nginx 将 video alias 到 HQ 目录。
- Tailwind 通过 CDN 引入；没有本地 `tailwind.config.js`。

## ANTI-PATTERNS
- 禁止 `var`；使用 `const`/`let`。
- 禁止空 catch；异常要记录或有明确忽略理由。
- 禁止为了通过迁移清理而删除仍有业务价值的共享模块测试。
- 禁止把 `css/**` 当作 Vanilla 冗余代码删除。
- 禁止整体编码带 `/` 的章节路径。
