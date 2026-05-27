# AGENTS.md - Frontend

## OVERVIEW
Vue 3.5 + Vite 6 + TypeScript 6 单页应用。Pinia 状态管理，Vue Router 路由。漫画瀑布流浏览、目录树、阅读器、工具管理四个页面。

## STRUCTURE
```text
frontend/
├── index.html                  # 入口 HTML，CDN Tailwind
├── vite.config.ts              # Vite + Vitest 配置，@ 别名，dev proxy 到 :500
├── tsconfig.json
├── package.json
├── eslint.config.js
└── src/
    ├── main.ts                 # createApp → Pinia → Router → mount
    ├── App.vue                 # 根组件，路由状态恢复
    ├── config/index.ts         # STORAGE_KEYS 常量
    ├── pages/                  # 页面级组件
    │   ├── WaterfallPage.vue   # 首页瀑布流，系列浏览
    │   ├── DirectoryPage.vue   # 章节树，封面懒加载
    │   ├── ReaderPage.vue      # 漫画阅读，图片/视频浏览
    │   └── ToolsPage.vue       # 工具管理页
    ├── components/             # 可复用组件
    │   ├── ReaderShell.vue     # 阅读器控制壳（跳页、进度、章节导航）
    │   ├── ReaderMediaItem.vue # 媒体项渲染（图片/视频）
    │   ├── ChapterCard.vue     # 章节卡片
    │   ├── WaterfallChapterCard.vue
    │   ├── JumpPageModal.vue   # 跳页弹窗
    │   ├── ReaderProgressBadge.vue
    │   ├── ReaderQuickActions.vue
    │   └── tools/              # 工具页专用组件（5 个）
    ├── stores/                 # Pinia stores（每个 store 配 *.test.ts）
    │   ├── series-store.ts     # 系列列表状态
    │   ├── chapter-store.ts    # 章节/目录状态
    │   ├── reader-store.ts     # 阅读器状态
    │   ├── progress-store.ts   # 阅读进度持久化
    │   └── tools-store.ts      # 工具执行状态与轮询
    ├── services/               # API 调用与工具函数
    │   ├── api.ts              # HTTP 客户端（fetch, 错误处理）
    │   ├── media-url.ts        # HQ/LQ/video URL 构建，LQ 缺失 204 回退 HQ
    │   ├── tools-api.ts        # 工具 CRUD API
    │   └── storage.ts          # localStorage 封装
    ├── router/index.ts         # 路由定义 + URL 构建函数（中文路径分段编码）
    ├── utils/                  # 纯工具函数
    │   ├── route-path.ts       # 路径编码/分割
    │   ├── natural-sort.ts     # 自然排序
    │   ├── lazy-image.ts       # 懒加载
    │   └── 对应 *.test.ts
    └── types/                  # TypeScript 类型定义
        ├── api.ts              # API 响应类型
        ├── progress.ts         # 进度类型
        └── tools.ts            # 工具类型
```

## WHERE TO LOOK
| 任务 | 位置 | Notes |
|------|------|-------|
| 添加页面 | `src/pages/` → `src/router/index.ts` 注册路由 | 页面用 `<script setup lang="ts">` |
| 添加 Pinia store | `src/stores/` | 同步创建 `*-store.test.ts`；store 不直接调 fetch |
| 添加 API 调用 | `src/services/api.ts` | 复用已有 `fetch` 封装；错误统一处理 |
| 构建媒体 URL | `src/services/media-url.ts` | LQ 路径缺失时自动回退 HQ |
| 修改路由/URL | `src/router/index.ts` | 中文路径逐段 `encodeURIComponent` |
| 添加工具页组件 | `src/components/tools/` | 工具页子组件，由 `ToolsPage.vue` 编排 |
| 添加类型 | `src/types/` | 接口/类型定义，不包含运行时逻辑 |

## ROUTES
| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | `WaterfallPage` | 首页，漫画系列瀑布流 |
| `/series/:series/dir/:pathMatch(.*)*` | `DirectoryPage` | 系列目录树，中文路径分段编码 |
| `/series/:series/read/:pathMatch(.*)*` | `ReaderPage` | 漫画阅读器 |
| `/tools` | `ToolsPage` | 工具管理 |

路由构建函数（`createSeriesRootRoute`, `createSeriesDirectoryRoute`, `createSeriesReadRoute`, `createParentDirectoryRoute`）统一处理中文编码，不要手动拼接 URL。

## COMMANDS
```bash
npm run dev              # Vite dev server（默认 5173，实际配 5000）
npm run build            # vue-tsc 类型检查 + Vite 构建
npm run type-check       # 仅类型检查
npm run preview          # 预览构建产物（4173）
npm test                 # vitest run
npm run test:watch       # vitest 监听模式
npm run test:coverage    # vitest + v8 coverage
npm run lint             # ESLint 检查
npm run lint:fix         # ESLint 自动修复
```

## CONVENTIONS
- 所有 `.vue` 使用 `<script setup lang="ts">`。
- 所有 `.ts` 文件使用 ES module（`package.json` 设 `"type": "module"`）。
- 测试文件 `*.test.ts` 与源文件同目录，框架：Vitest + jsdom + @vue/test-utils。
- Store 不直接调用 fetch，通过 services 层；store 方法返回 Promise 供组件 await。
- `@/` 别名指向 `src/`，不要用相对路径导入跨目录模块。
- Tailwind 通过 CDN 引入，无本地 `tailwind.config.js`；类名直接用 utility class。
- 媒体 URL：`/hq_image/` 直接访问，`/lq_image/` 缺失时 Nginx 返回 204，前端自动回退到 `/hq_image/`。
- `localStorage` 键名统一前缀 `comics:`（见 `config/index.ts` → `STORAGE_KEYS`）。
- 工具页通过 `tools-store.ts` 轮询后端任务状态，不要自行实现轮询逻辑。

## ANTI-PATTERNS
- 禁止 `as any`、`@ts-ignore`、`@ts-expect-error`。
- 禁止 `var`；使用 `const`/`let`。
- 禁止空 catch；异常要记录或有明确忽略理由。
- 禁止手动拼接中文 URL；必须通过 `router/index.ts` 提供的路由构建函数。
- Store 不要直接操作 DOM 或使用 `window`（测试环境 jsdom 兼容）。
- 不要新增全局 CSS 文件；样式用 Tailwind utility class 或 `<style scoped>`。
- 组件间通信优先 props/emits，不要滥用 Pinia store 替代组件通信。

## NOTES
- Vite dev server 实际端口 5000（`vite.config.ts`），与 `VITE_DEV_PORT` 默认 5173 不同；proxy `/api` → `localhost:500`。
- `local-media-dev-server.ts` 是自定义 Vite 插件，开发环境提供本地漫画静态文件服务；构建时不包含。
- 前端 Dockerfile 多阶段构建：Node 构建 → Nginx 静态服务。
- 阅读进度存储在 localStorage key `comics:reading-progress`。
