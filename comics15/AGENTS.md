# AGENTS.md - Comic Reader

**语言**: 始终使用中文对话、注释、提交信息。

## Overview
Spring Boot 4.0.2 + Java 21 后端，ES6 模块化 JS + Tailwind CSS 前端，Redis 缓存的漫画阅读器。

## Structure
```
├── backend/src/main/java/com/nianer/comic/
│   ├── ComicApplication.java      # 入口
│   ├── Controller/ComicController.java
│   ├── Config/ComicConfig.java, CorsConfig.java
│   └── Component/RedisValidator.java
├── frontend/
│   ├── js/main.js                 # 前端入口
│   ├── js/config/constants.js     # 配置常量
│   ├── js/services/api.js         # API 封装
│   ├── js/state/store.js          # 状态管理
│   ├── js/components/             # UI 组件
│   └── css/                       # 样式文件
└── nginx.conf                     # 静态文件服务配置
```

## Commands

### Backend (from `backend/` directory)
```bash
./mvnw spring-boot:run                         # 运行
./mvnw test                                    # 运行所有测试
./mvnw test -Dtest=ComicApplicationTests       # 运行单个测试类
./mvnw test -Dtest=ComicApplicationTests#contextLoads  # 运行单个测试方法
./mvnw clean package -DskipTests               # 打包
```

### Frontend (from `frontend/` directory)
```bash
npm run dev                     # 开发模式 (:3000)
npm run build                   # 生产构建
npm test                        # 运行所有测试
npm run test:watch              # 测试监听模式
vitest run js/utils/dom.test.js # 运行单个测试文件
npm run lint                    # ESLint 检查
npm run lint:fix                # 自动修复
```

### Docker
```bash
docker compose up --build       # 启动所有服务
```

## Where to Look
| 任务 | 位置 |
|------|------|
| 添加API端点 | `backend/.../Controller/ComicController.java` |
| 修改缓存策略 | `ComicController.java` 缓存键模式 |
| 配置漫画目录 | `application.yml` + `ComicConfig.java` |
| 前端状态管理 | `frontend/js/state/store.js` |
| 图片URL构建 | `frontend/js/services/api.js` |
| 懒加载逻辑 | `frontend/js/components/reader.js` |

## Conventions (Project-Specific)

### Java Backend
- **包**: `com.nianer.comic.*` (Controller/, Config/, Component/)
- **导入顺序**: `java.*` → `jakarta.*` → `org.*` → `com.*` → static (分组间空行)
- **API**: 必须有 Swagger 注解 (`@Operation`, `@Parameter`, `@ApiResponse`)
- **文件操作**: 只用 NIO `Path`/`Files`，禁止 `File` 类
- **缓存**: Redis 优先，文件系统降级 (`RedisValidator.REDIS_ENABLED`)
- **日志**: `@Slf4j` + `{}` 占位符，禁止字符串拼接
- **测试**: JUnit 5 + Spring Boot Test (`@SpringBootTest`)

### JavaScript Frontend
- **语法**: ES6+ (禁止 `var`)
- **命名**: 变量 camelCase，DOM 元素以 `El` 后缀 (`readerEl`)
- **事件处理**: `on` 前缀 (`onClick`, `onScroll`)
- **模块**: 每个目录有 `index.js` barrel export
- **URL编码**: 中文路径必须 `encodeURIComponent()`
- **测试**: Vitest + jsdom，`*.test.js` 与源文件同目录

### ESLint Rules
- `semi`: 必须分号
- `quotes`: 单引号 (`'single'`)
- `no-console`: 允许
- `no-unused-vars`: warn，`_` 前缀参数忽略

### CSS
- Tailwind 为主，自定义 CSS 仅用于动画
- 响应式: 移动优先 (`sm:`, `md:`, `lg:`)

## Anti-Patterns
- `as any`, `@ts-ignore`, `@ts-expect-error` — 禁止
- `catch (Exception e) {}` — 必须记录或抛出
- `File` 类 — 只用 `Path`/`Files`
- 字符串拼接日志 — 用 `{}` 占位符
- `var` — 用 `const`/`let`

## Architecture

### Cache Strategy
- Redis 主缓存，文件系统降级
- 缓存键: `series_list`, `chapters_list:{series}`, `chapter_files:{series}:{chapter}`
- 过期: 7天 (604800秒)

### File Organization
```
COMICS_ROOT/
├── h_photograph/{series}/{chapter}/   # HQ 原图
└── l_photograph/{series}/{chapter}/   # LQ WebP 预览
```

### API Paths
- `/api/series` — 系列列表
- `/api/chapters/{series}` — 章节列表
- `/api/chapter/{series}?chapterPath=` — 文件列表
- `/hq_image/...` — HQ 静态图片
- `/lq_image/...` — LQ 静态图片
- `/video/...` — 视频静态服务

## Nginx Config
```nginx
location /hq_image/ { alias /comics/h_photograph/; }
location /lq_image/ { alias /comics/l_photograph/; }
location /video/ { alias /comics/h_photograph/; }
```

## Env Variables
| 变量 | 默认值 |
|------|--------|
| `REDIS_HOST` | localhost |
| `REDIS_PORT` | 6379 |
| `COMICS_ROOT_DIR` | F:\games\comics |
| `HQ_SUB_DIR` | h_photograph |
| `LQ_SUB_DIR` | l_photograph |
| `CACHE_EXPIRATION` | 604800 |

## Gotchas
- Nginx 用 `alias` 非 `rewrite + root`
- 双击图片加载 HQ 版本 (`/lq_image/` → `/hq_image/`)
- Redis 不可用时自动降级文件扫描
- 后端端口 500，前端 dev 端口 3000