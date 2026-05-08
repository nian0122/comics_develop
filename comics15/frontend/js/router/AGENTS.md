# AGENTS.md - Frontend Router

## OVERVIEW
`frontend/js/router/` 是主阅读器 SPA 路由层。职责：URL 解析、URL 构建、History API 导航、中文路径安全编码/解码。

## STRUCTURE
```text
router/
├── index.js              # barrel export
├── router.js             # Router class: navigate/replace/start
├── route-parser.js       # URL → route object
├── route-builder.js      # route data → URL
├── router.test.js
├── route-parser.test.js
└── route-builder.test.js
```

## ROUTE SHAPES
| Route name | URL | Data |
|------------|-----|------|
| `seriesList` | `/` | 无 |
| `directory` | `/series/{series}` | `{ series }` |
| `directory` | `/series/{series}/dir/{path}` | `{ series, path }` |
| `reader` | `/series/{series}/read/{path}` | `{ series, path }` |
| `notFound` | 解析失败 | 保底错误态 |

## WHERE TO LOOK
| 任务 | 位置 | Notes |
|------|------|-------|
| 监听 popstate/导航 | `router.js` | `Router` 构造器接收 `onRouteChange` |
| 解析 URL | `route-parser.js` | `parseRoute(location.pathname)` |
| 构建 URL | `route-builder.js` | `toSeriesUrl`, `toDirectoryUrl`, `toReaderUrl` |
| 导出入口 | `index.js` | 被 `../main.js` 导入 |

## CONVENTIONS
- Route 对象结构固定：`{ name, series, path }`。
- 中文系列名和章节路径必须分段编码；不能把包含 `/` 的章节路径整体编码成 `%2F`。
- 解码失败返回 `notFound`，不要抛异常中断应用初始化。
- `navigate()` 使用 `history.pushState`；`replace()` 用 `history.replaceState` 恢复/同步状态。
- 路由层只处理 URL，不读取 store、不调用 API、不渲染 DOM。

## TESTS
- 现有 3 个测试文件覆盖解析、构建、History 导航。
- 新增 URL 模式时必须同时改 parser、builder、三处测试。
- 测试中用 `history.replaceState` 重置 URL，mock `window.addEventListener` 时记得恢复。

## ANTI-PATTERNS
- 不要在路由层拼媒体 URL；媒体 URL 属于 `services/media-url.js`。
- 不要让 parser 依赖当前 store；URL 必须可独立解析。
- 不要删除 `safeDecodeURIComponent` 的容错路径。
