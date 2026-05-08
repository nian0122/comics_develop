# AGENTS.md - Frontend

## OVERVIEW
Vite + Vanilla ES6 模块前端。双入口：主漫画阅读器与工具管理页；Tailwind CDN + 自定义 CSS 变量/组件/动画。

## STRUCTURE
```text
frontend/
├── index.html              # 主阅读器入口，加载 js/main.js
├── tools.html              # 工具管理入口，加载 js/tools-main.js
├── js/
│   ├── main.js             # App 类，路由 + 页面编排
│   ├── tools-main.js       # ToolsPage 类，工具执行 UI
│   ├── app/                # 页面级视图：Series/Directory/ReaderShell
│   ├── router/             # URL parse/build + History API
│   ├── components/         # Reader + index.js
│   ├── services/           # catalog-api, media-url, api兼容层, storage, tools-api
│   ├── state/              # store, progress-state + index.js
│   ├── utils/              # 纯函数 + 同目录 *.test.js
│   └── config/constants.js # 懒加载/章节数量等常量
└── css/                    # main imports variables/components/animations
```

## WHERE TO LOOK
| 任务 | 位置 | Notes |
|------|------|-------|
| 主流程/页面切换 | `js/main.js` | `App` 管理路由、系列、目录、阅读器 |
| 页面级视图编排 | `js/app/` | 先读 `js/app/AGENTS.md` |
| URL 路由/导航 | `js/router/` | 先读 `js/router/AGENTS.md` |
| 工具管理页 | `js/tools-main.js` | 表单、执行状态、1 秒轮询 |
| 阅读器媒体渲染 | `js/components/reader.js` | 懒加载、重试、双击 LQ→HQ |
| 目录 API 封装 | `js/services/catalog-api.js` | `/api/series`, `/api/chapters`, 层级节点 |
| 媒体 URL 构建 | `js/services/media-url.js` | `/lq_image`/`/hq_image`/`/video`，中文路径分段编码 |
| 兼容 API 对象 | `js/services/index.js` / `api.js` | 合并 `catalogApi` + `mediaUrl`，保留旧导入 |
| 工具 API 封装 | `js/services/tools-api.js` | `/api/tools/*` |
| 本地存储 | `js/services/storage.js` + `persistence.js` | 阅读进度、当前系列/章节、展开状态 |
| 状态管理 | `js/state/store.js` | 简单 store + subscribe/notify |
| 阅读进度 | `js/state/progress-state.js` | 当前页、已加载页、滚动百分比 |
| 章节树 | `js/utils/chapter-tree.js` | 扁平章节转多级目录 |
| 文件类型 | `js/utils/file-type.js` | GIF 视作 video 路径 |
| 懒加载参数 | `js/config/constants.js` | `MAX_IMAGES_TO_FETCH`, `LAZY_LOAD_CONFIG` |
| 样式变量 | `css/variables.css` | 主题 token |
| 组件样式 | `css/components.css` | 页面/卡片/按钮等 |

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
vitest run js/utils/dom.test.js
```

## CONVENTIONS
- `package.json` 设置 `"type": "module"`；全部使用 ES module import/export。
- 每个模块目录保留 `index.js` barrel export；覆盖率排除 `js/**/index.js`。
- 实际 DOM 属性命名多为 `this.container`, `this.seriesList`, `this.elements.reader`；不要强制改成 `El` 后缀。
- 事件绑定集中在 `bindEvents()`；现有代码常用 callback 注入和 `onclick = () => ...`。
- 中文系列名、章节路径、文件名进入 URL 前必须 `encodeURIComponent()`；多级路径按段编码，不能整体编码 `/`。
- LQ 图缺失返回 204；前端通过 `HEAD /lq_image/...` 判断并回退 HQ。
- GIF 走 `/video/`，因为 Nginx 将 video alias 到 HQ 目录。
- Tailwind 使用 CDN；没有 `tailwind.config.js`，自定义 CSS 只放变量、组件、动画。
- `vite.config.js` 的 `comicStaticPlugin` 在开发环境直接服务漫画静态文件。

## TESTS
- Vitest 2 + jsdom；配置在 `vitest.config.js`。
- 测试文件与源文件同目录：`js/**/*.test.js`；不要迁移到 `__tests__/`。
- 覆盖率包含 `js/**/*.js`，排除 `main.js`、`tools-main.js`、`index.js`、测试文件。
- DOM 测试用 `document.body.innerHTML` 设置环境；mock 用 `vi.fn()`/`vi.stubGlobal()`。
- 常见 mock：`fetch`, `localStorage`, `IntersectionObserver`, fake timers, `history.replaceState`。

## ESLINT
- ESLint 9 flat config：`eslint.config.js`，不是 `.eslintrc`。
- 必须分号；必须单引号，允许 escape 时例外。
- `console` 允许。
- 未使用变量是 warn；参数 `_` 前缀忽略。
- `no-var`, `prefer-const`, `object-shorthand`, `prefer-template` 是 error。

## ANTI-PATTERNS
- 不要新增 `var`。
- 不要把测试迁移到 `__tests__/`；当前约定是同目录。
- 不要绕过 `media-url.js` / `api.js` 拼接媒体 URL；否则中文路径和 LQ/HQ 回退容易坏。
- 不要假设只有图片；阅读器支持图片、视频、GIF 混合。
- 不要把 `node_modules/`, `dist/`, `coverage/` 纳入文档或代码搜索结论。

## DEV SERVER GOTCHAS
- Vite dev 默认端口 5173；`VITE_DEV_PORT` 可覆盖。旧文档里的 3000 不一定准确。
- API 代理到 `http://localhost:500`。
- dev 中 `/lq_image/` 缺失返回 204，和 Nginx 生产行为对齐。
