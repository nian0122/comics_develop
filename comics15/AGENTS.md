# PROJECT KNOWLEDGE BASE - Comic Reader

**Generated:** 2026-05-10
**Commit:** d11dd16
**Branch:** 不做ios适配
**语言**: 始终使用中文对话、注释、提交信息。

## OVERVIEW
本地漫画阅读器：Spring Boot 4.0.2 + Java 21 后端，Vue3/Vite 单页前端，Nginx 静态媒体服务，Redis 缓存优先并可文件系统降级。
项目另含 3 个独立 Go CLI 工具，由后端工具 API 异步调度。

## STRUCTURE
```text
comics15/
├── backend/                 # Spring Boot API、Service 拆分、Redis 降级、工具执行
├── frontend/                # Vue3：阅读器与工具管理页
├── tools/                   # 独立 Go CLI：图片优化/叶目录查找/清空文件
├── docs/                    # 架构、移动端设计、启动说明；只作设计参考
├── nginx.conf               # API 反代 + HQ/LQ/video 静态媒体 alias
└── docker-compose.yml       # 唯一 compose 文件；nginx + backend + redis
```

## WHERE TO LOOK
| 任务 | 位置 | Notes |
|------|------|-------|
| 漫画目录/章节/文件 API | `backend/.../Controller/ComicController.java` | Controller 只编排；业务在 Service |
| 目录扫描业务 | `backend/.../Service/ComicCatalogService.java` | 系列、章节树、层级节点；虚拟线程池扫描 |
| Redis 缓存读写 | `backend/.../Service/ComicCacheService.java` | `v2:series_list`, `v2:chapter_files:{series}:{path}`, `v2:level:{series}[:{path}]` |
| 媒体文件处理 | `backend/.../Service/ComicMediaService.java` | 文件过滤、自然排序、HQ/LQ/video URL 构建 |
| 外部工具 API | `backend/.../Controller/ToolController.java` | `/api/tools`，执行、状态轮询、取消、清理 |
| 工具进程调度 | `backend/.../Service/ToolExecutor.java` | `ProcessBuilder` 调用 `tools/*/*.exe`，解析中文日志 |
| 前端入口 | `frontend/index.html` + `frontend/src/main.js` | Vue3 + Pinia + Vue Router |
| 页面级视图 | `frontend/src/pages/` | `SeriesPage`, `DirectoryPage`, `ReaderPage`, `ToolsPage` |
| Vue 组件 | `frontend/src/components/` | 阅读器组件 + `components/tools/` 工具页组件 |
| 路由/URL 构建 | `frontend/src/router/index.js` | `/series/{series}/dir|read/{path}`、`/tools`；中文路径分段编码 |
| 媒体 URL 构建 | `frontend/src/services/media-url.js` + `api.js` | `/hq_image`、`/lq_image`、`/video`；LQ 缺失 204 回退 HQ |
| 工具页状态/API | `frontend/src/stores/tools-store.js` + `frontend/src/services/tools-api.js` | 工具列表、执行记录、轮询 |
| Go 工具说明 | `tools/*/readme.md` | UI/后端参数契约；每个工具独立 go.mod |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `ComicApplication` | Spring Boot app | `backend/.../ComicApplication.java` | 后端启动入口，端口 500 |
| `ComicController` | REST controller | `backend/.../Controller/ComicController.java` | 漫画目录 API，委托 catalog service |
| `ToolController` | REST controller | `backend/.../Controller/ToolController.java` | 工具列表、执行、状态、取消、清理 API |
| `ComicCatalogService` | Service | `backend/.../Service/ComicCatalogService.java` | 目录扫描业务、层级节点、章节文件结果封装 |
| `ComicCacheService` | Service | `backend/.../Service/ComicCacheService.java` | Redis JSON 读写抽象，检查 `REDIS_ENABLED` |
| `ComicMediaService` | Service | `backend/.../Service/ComicMediaService.java` | 媒体过滤、自然排序、URL/元数据构建 |
| `ToolExecutor` | Service | `backend/.../Service/ToolExecutor.java` | 异步执行 Go 工具并解析日志进度 |
| `App` | Vue component | `frontend/src/App.vue` | 根组件与路由状态恢复 |
| `SeriesPage` | Vue page | `frontend/src/pages/SeriesPage.vue` | 系列列表、错误展示 |
| `DirectoryPage` | Vue page | `frontend/src/pages/DirectoryPage.vue` | 章节树、封面懒加载、目录渲染 |
| `ReaderShell` | Vue component | `frontend/src/components/ReaderShell.vue` | 阅读器控制壳、跳页、进度、章节导航 |
| `ToolsPage` | Vue page | `frontend/src/pages/ToolsPage.vue` | 工具管理页编排 |
| `router` | Vue Router module | `frontend/src/router/index.js` | Vue Router、URL 构建、中文路径分段编码 |

## COMMANDS
```bash
# Backend: from backend/
./mvnw spring-boot:run
./mvnw test
./mvnw test -Dtest=ComicControllerTest
./mvnw test -Dtest=ComicCatalogServiceTest
./mvnw clean compile
./mvnw clean package -DskipTests

# Frontend: from frontend/
npm run dev              # 默认 5173；VITE_DEV_PORT 可覆盖
npm run build
npm run preview          # preview 4173
npm test
npm run test:watch
npm run test:coverage
npm run lint
npm run lint:fix
vitest run src/utils/dom.test.js

# Go tools: from each tools/* directory
go build -o image-optimizer.exe .        # tools/image-optimizer
go build -o leaf-image-finder.exe        # tools/leaf-image-finder
go build -o clean_files.exe .            # tools/replace_files_with_empty

# Docker: from repo root
docker compose up --build
docker compose down
docker compose logs -f
```

## RUNTIME BOUNDARIES
| Path | Handler | Behavior |
|------|---------|----------|
| `/api/*` | Nginx → `backend:500` | 后端目录元数据与工具执行 API |
| `/lq_image/*` | Nginx alias `/comics/l_photograph/` | 缺失返回 204，前端回退 HQ |
| `/hq_image/*` | Nginx alias `/comics/h_photograph/` | HQ 原图，60 天缓存 |
| `/video/*` | Nginx alias `/comics/h_photograph/` | 视频/GIF，带 CORS/Range 支持 |
| `/` | Nginx static `/usr/share/nginx/html` | Vite 构建输出 |

## CONFIG / ENV
| 变量 | 默认值 | 说明 |
|------|--------|------|
| `COMICS_ROOT_DIR` | `F:\games\comics` / 容器 `/comics` | 漫画根目录；Vite dev 也读取它提供本地静态文件 |
| `HQ_SUB_DIR` | `h_photograph` | HQ 子目录；Nginx `/hq_image` 与 `/video` alias 到这里 |
| `LQ_SUB_DIR` | `l_photograph` | LQ WebP 子目录；缺失返回 204 |
| `CACHE_EXPIRATION` | `604800` | Redis TTL 秒 |
| `REDIS_HOST` / `REDIS_PORT` | `localhost:6379` / 容器 `redis:6379` | Redis 连接；database 固定为 `1` |
| `TOOL_ROOT_DIR` | `D:/projects/comics_develop/comics15/tools` | 后端查找 Go 工具可执行文件 |
| `VITE_DEV_PORT` | `5173` | 前端 dev server 端口 |

## DESIGN DOCUMENTS
| 文档 | 用途 | 何时查阅 |
|------|------|----------|
| `docs/project-architecture.md` | 完整架构、图片加载规则、坑点 | 修改 API 或图片策略前 |
| `docs/chapter-source-strategy-design.md` | `cover_source` 与 LQ/HQ 加载策略 | 改章节封面/阅读器图片源前 |
| `docs/mobile-frontend-design.md` | 移动端优先页面流与交互 | 改页面流/移动布局前 |
| `docs/start-frontend-backend.md` | 本地开发启动说明 | 环境配置或新人上手 |
| `docs/superpowers/specs/*` | 详细设计稿 | 大重构前参考；必须对照实际代码验证 |

## CONVENTIONS
- 子目录有本地知识库：先读 `backend/AGENTS.md`、`frontend/AGENTS.md`、`tools/AGENTS.md`。
- README 仍含旧信息：`comics13`、`backend/comic/`、`docker-compose.dev.yml`、`docker-compose.prod.yml`、`LICENSE`；实际仓库不同。
- Tailwind 通过 CDN 引入；没有本地 `tailwind.config.js`。
- 测试文件：后端在 `backend/src/test/...`；前端 `*.test.js` 与源文件同目录；Go 工具暂无 `_test.go`。
- Redis 缓存键前缀为 `v2:`；不要恢复旧 `series_list` / `chapters_list:*` 键。
- `.sisyphus/` 是工作流产物，不作为项目知识库来源；不要把计划代码当最终实现。

## ANTI-PATTERNS (THIS PROJECT)
- 禁止 `as any`, `@ts-ignore`, `@ts-expect-error`。
- 禁止空 catch；异常要记录或有明确忽略理由。
- Java 文件操作优先 NIO `Path`/`Files`；`ProcessBuilder.directory(...toFile())` 是必要例外。
- 禁止日志字符串拼接；使用 `log.info("...{}", value)`。
- 禁止 `var`；使用 `const`/`let`。
- Nginx 静态漫画路径用 `alias`，不要改成 `rewrite + root`。

## NOTES
- 非标准端口：后端 500，Vite dev 默认 5173，Vite preview 4173，Docker 前端 5000:80，Redis 6379。
- 漫画目录默认本机 `F:\games\comics`，容器内 `/comics`，只读挂载。
- 文件组织：`h_photograph/{series}/{chapter}` 为 HQ，`l_photograph/{series}/{chapter}` 为 LQ WebP。
- 支持媒体：图片 `.jpg/.jpeg/.png/.webp`，视频/GIF `.mp4/.mov/.gif`；GIF 走 `/video/`。
