# AGENTS.md - Frontend App Views

## OVERVIEW
`frontend/js/app/` 是主阅读器的页面级视图编排层。它位于 `main.js` 总编排与 `components/` 纯渲染组件之间，负责 DOM 页面、状态订阅和用户交互回调。

## STRUCTURE
```text
app/
├── index.js                 # barrel export
├── series-view.js           # 系列列表、搜索、错误态
├── directory-view.js        # 目录树、章节卡片、封面懒加载
├── reader-shell.js          # 阅读器控制壳、跳页、进度、章节导航
├── chapter-meta-cache.js    # 章节元数据缓存与相邻章节预加载
├── reader-shell.test.js
└── chapter-meta-cache.test.js
```

## WHERE TO LOOK
| 任务 | 位置 | Notes |
|------|------|-------|
| 系列列表 UI | `series-view.js` | 搜索过滤、加载/错误/空态 |
| 目录/章节页面 | `directory-view.js` | 章节树渲染、封面懒加载、RequestQueue 并发 |
| 阅读器顶部/底部控制 | `reader-shell.js` | 返回目录、上一章/下一章、跳页 modal、进度 |
| 章节元数据缓存 | `chapter-meta-cache.js` | 缓存章节文件/封面信息；供预加载和目录封面使用 |
| 导出入口 | `index.js` | 被 `../main.js` 导入 |

## BOUNDARIES
- `main.js`：应用总编排、路由选择、服务调用顺序。
- `app/`：页面级视图状态、DOM 渲染、用户交互回调。
- `components/reader.js`：具体媒体渲染和图片/视频懒加载。
- `services/`：网络请求、媒体 URL、持久化；app 层不要直接拼 API URL。

## CONVENTIONS
- 构造器采用 `constructor(container, callbacks)`；外部通过 callback 注入行为。
- 事件绑定集中在 `bindEvents()` 或 render 后局部绑定；保持现有 `onclick = () => ...` 风格。
- DOM 输出使用 `innerHTML` 时必须先 `escapeHtml` 处理用户/文件名内容。
- 懒加载封面走 `IntersectionObserver` + `RequestQueue`；并发限制来自 `LAZY_LOAD_CONFIG.COVER_MAX_CONCURRENT`。
- 目录/阅读器状态通过 `store.subscribe(...)` 订阅，不要在视图里复制全局状态结构。

## TESTS
- 当前测试：`reader-shell.test.js`, `chapter-meta-cache.test.js`。
- 新增 view 行为时同目录补 `*.test.js`。
- DOM 测试用 `document.body.innerHTML` 建容器，mock callback 用 `vi.fn()`。

## ANTI-PATTERNS
- 不要把 API 请求或媒体 URL 拼接放进 view；使用 services。
- 不要在 `DirectoryView` 绕过 RequestQueue 直接批量加载全部封面。
- 不要把 `components/reader.js` 的媒体渲染职责搬到 `ReaderShell`。
