# AGENTS.md - Frontend

## OVERVIEW
Vite + Vanilla ES6 模块前端。双入口：主漫画阅读器与工具管理页；Tailwind CDN + 自定义 CSS 变量/动画。

## STRUCTURE
```
frontend/
├── index.html              # 主阅读器入口，加载 js/main.js
├── tools.html              # 工具管理入口，加载 js/tools-main.js
├── js/
│   ├── main.js             # App 类，移动优先目录/阅读流程
│   ├── tools-main.js       # ToolsPage 类，工具执行 UI
│   ├── components/         # Reader + index.js
│   ├── services/           # api, storage, tools-api + index.js
│   ├── state/              # store, progress-state + index.js
│   ├── utils/              # 纯函数 + 同目录 *.test.js
│   └── config/constants.js
└── css/                    # main imports variables/components/animations
```

## WHERE TO LOOK
| 任务 | 位置 | Notes |
|------|------|-------|
| 主流程/页面切换 | `js/main.js` | `App` 管理系列、目录、阅读器 |
| 工具管理页 | `js/tools-main.js` | 表单、执行状态、1 秒轮询 |
| 阅读器媒体渲染 | `js/components/reader.js` | 懒加载、重试、双击 LQ→HQ |
| 后端 API 封装 | `js/services/api.js` | `/api/*` + `/lq_image`/`/hq_image`/`/video` |
| 工具 API 封装 | `js/services/tools-api.js` | `/api/tools/*` |
| 本地存储 | `js/services/storage.js` | 阅读进度、当前系列/章节、展开状态 |
| 状态管理 | `js/state/store.js` | 简单 store + subscribe/notify |
| 阅读进度 | `js/state/progress-state.js` | 当前页、已加载页、滚动百分比 |
| 章节树 | `js/utils/chapter-tree.js` | 扁平章节转多级目录 |
| 文件类型 | `js/utils/file-type.js` | GIF 视作 video 路径 |
| 样式变量 | `css/variables.css` | 主题 token |
| 组件样式 | `css/components.css` | 页面/卡片/按钮等 |

## COMMANDS
```bash
npm run dev
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
- 每个模块目录保留 `index.js` barrel export。
- 实际 DOM 属性命名多为 `this.container`, `this.seriesList`, `this.elements.reader`；不要强制改成 `El` 后缀。
- 事件绑定集中在 `bindEvents()`；现有代码常用 `onclick = () => ...`。
- 中文系列名、章节路径、文件名进入 URL 前必须 `encodeURIComponent()`；多级路径按段编码。
- LQ 图缺失返回 204；前端通过 `HEAD /lq_image/...` 判断并回退 HQ。
- GIF 走 `/video/`，因为 Nginx 将 video alias 到 HQ 目录。
- Tailwind 使用 CDN；没有 `tailwind.config.js`，自定义 CSS 只放变量、组件、动画。

## TESTS
- Vitest 2 + jsdom；配置在 `vitest.config.js`。
- 测试文件与源文件同目录：`js/utils/file-type.test.js`、`js/services/api.test.js`。
- 覆盖率包含 `js/**/*.js`，排除 `main.js`、测试文件。
- DOM 测试用 `document.body.innerHTML` 设置环境；mock 用 `vi.fn()`/`vi.stubGlobal()`。

## ESLINT
- 必须分号。
- 必须单引号，允许 escape 时例外。
- `console` 允许。
- 未使用变量是 warn；参数 `_` 前缀忽略。

## ANTI-PATTERNS
- 不要新增 `var`。
- 不要把测试迁移到 `__tests__/`；当前约定是同目录。
- 不要绕过 `api.js` 拼接媒体 URL；否则中文路径和 LQ/HQ 回退容易坏。
- 不要假设只有图片；阅读器支持图片、视频、GIF 混合。
- 不要把 `node_modules/`, `dist/`, `coverage/` 纳入文档或代码搜索结论。

## DEV SERVER GOTCHAS
- Vite dev 端口 3000，API 代理到 `http://localhost:500`。
- Vite 自定义 `comicStaticPlugin` 在开发环境直接服务 `/hq_image/`, `/lq_image/`, `/video/`。
- dev 中 `/lq_image/` 缺失返回 204，和 Nginx 生产行为对齐。
