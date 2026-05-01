# PROJECT KNOWLEDGE BASE - Comic Reader

**Generated:** 2026-05-01
**Commit:** 7a53da3
**Branch:** main
**语言**: 始终使用中文对话、注释、提交信息。

## OVERVIEW
本地漫画阅读器：Spring Boot 4.0.2 + Java 21 后端，Vanilla ES6/Vite 前端，Nginx 静态媒体服务，Redis 缓存优先并可文件系统降级。
项目另含 Go CLI 工具集，由后端工具 API 异步调度。

## STRUCTURE
```
comics15/
├── backend/                 # Spring Boot API、Redis 缓存、工具执行
├── frontend/                # 双入口 Vite 前端：阅读器 + 工具页
├── tools/                   # 独立 Go CLI：图片优化/叶目录查找/清空文件
├── docs/                    # 架构、移动端设计、启动说明
├── nginx.conf               # API 反代 + HQ/LQ/video 静态媒体 alias
└── docker-compose.yml       # nginx + web + redis；漫画目录只读挂载
```

## WHERE TO LOOK
| 任务 | 位置 | Notes |
|------|------|-------|
| 漫画目录/文件 API | `backend/src/main/java/com/nianer/comic/Controller/ComicController.java` | Redis 键：`series_list`, `chapters_list:{series}`, `chapter_files:{series}:{chapter}` |
| 外部工具 API | `backend/.../Controller/ToolController.java` | `/api/tools`，异步执行、状态轮询、取消、清理 |
| 工具进程调度 | `backend/.../Service/ToolExecutor.java` | `ProcessBuilder` 调用 `tools/*/*.exe` |
| 漫画/工具路径配置 | `backend/.../resources/application.yml` + `Config/*Config.java` | `COMICS_ROOT_DIR`, `TOOL_ROOT_DIR` |
| 主阅读器入口 | `frontend/index.html` + `frontend/js/main.js` | 移动优先目录浏览、封面懒加载、章节打开 |
| 工具页入口 | `frontend/tools.html` + `frontend/js/tools-main.js` | 工具表单、执行记录、1 秒轮询 |
| 图片 URL 构建 | `frontend/js/services/api.js` | 中文路径必须编码；LQ/HQ/video 静态路径 |
| 阅读器懒加载 | `frontend/js/components/reader.js` | IntersectionObserver、重试、双击 LQ→HQ |
| 全局状态 | `frontend/js/state/store.js` | 简单发布订阅；`window.__appState` 暴露调试 |
| Go 工具说明 | `tools/*/readme.md` | 每个工具独立 go.mod/readme/exe |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `ComicApplication` | Spring Boot app | `backend/.../ComicApplication.java` | 后端启动入口 |
| `ComicController` | REST controller | `backend/.../Controller/ComicController.java` | 系列、章节、章节文件扫描 API |
| `ToolController` | REST controller | `backend/.../Controller/ToolController.java` | 工具列表、执行、状态、取消、清理 API |
| `RedisValidator.REDIS_ENABLED` | Static switch | `backend/.../Component/RedisValidator.java` | Redis 不可用时让控制器走文件系统扫描 |
| `ToolExecutor` | Service | `backend/.../Service/ToolExecutor.java` | 异步执行 Go 工具并解析日志进度 |
| `App` | Frontend class | `frontend/js/main.js` | 主阅读器页面编排 |
| `Reader` | Frontend component | `frontend/js/components/reader.js` | 图片/视频渲染、懒加载、进度事件 |
| `ToolsPage` | Frontend class | `frontend/js/tools-main.js` | 工具管理页面编排 |
| `api` | Service object | `frontend/js/services/api.js` | 阅读器 API 与静态媒体 URL |
| `toolsApi` | Service object | `frontend/js/services/tools-api.js` | `/api/tools` 封装 |

## COMMANDS
```bash
# Backend: from backend/
./mvnw spring-boot:run
./mvnw test
./mvnw test -Dtest=ComicApplicationTests
./mvnw test -Dtest=ComicApplicationTests#contextLoads
./mvnw clean package -DskipTests

# Frontend: from frontend/
npm run dev
npm run build
npm run preview
npm test
npm run test:watch
npm run test:coverage
npm run lint
npm run lint:fix
vitest run js/utils/dom.test.js

# Docker: from repo root
docker compose up --build
docker compose down
docker compose logs -f
```

## RUNTIME BOUNDARIES
| Path | Handler | Behavior |
|------|---------|----------|
| `/api/*` | Nginx → `web:500` | 后端目录元数据与工具执行 API |
| `/lq_image/*` | Nginx alias `/comics/l_photograph/` | 缺失返回 204，前端回退 HQ |
| `/hq_image/*` | Nginx alias `/comics/h_photograph/` | HQ 原图，60 天缓存 |
| `/video/*` | Nginx alias `/comics/h_photograph/` | 视频/GIF，带 CORS/Range 支持 |
| `/` | Nginx static `/usr/share/nginx/html` | Vite 构建输出 |

## CONVENTIONS
- 子目录有本地知识库：先读 `backend/AGENTS.md`、`frontend/AGENTS.md`、`tools/AGENTS.md`。
- README 提到 `docker-compose.dev.yml` / `docker-compose.prod.yml`，实际仓库只有 `docker-compose.yml`。
- Tailwind 通过 CDN 引入；没有本地 `tailwind.config.js`。
- 测试文件：后端在 `backend/src/test/...`；前端 `*.test.js` 与源文件同目录。
- 新功能必须补测试，并更新相关 API/文档说明。

## ANTI-PATTERNS (THIS PROJECT)
- 禁止 `as any`, `@ts-ignore`, `@ts-expect-error`。
- 禁止空 catch；异常要记录或有明确忽略理由。
- Java 文件操作优先 NIO `Path`/`Files`；`ProcessBuilder.directory(...toFile())` 是必要例外。
- 禁止日志字符串拼接；使用 `log.info("...{}", value)`。
- 禁止 `var`；使用 `const`/`let`。
- Nginx 静态漫画路径用 `alias`，不要改成 `rewrite + root`。

## NOTES
- 非标准端口：后端 500，Vite dev 3000，Vite preview 4173，Docker 前端 5000:80，Redis 6379。
- 漫画目录默认本机 `F:\games\comics`，容器内 `/comics`，只读挂载。
- 文件组织：`h_photograph/{series}/{chapter}` 为 HQ，`l_photograph/{series}/{chapter}` 为 LQ WebP。
- 支持媒体：图片 `.jpg/.jpeg/.png/.webp`，视频/GIF `.mp4/.mov/.gif`；GIF 走 `/video/`。
