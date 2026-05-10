# 项目架构记录

本文档记录漫画阅读器当前架构、数据流和图片加载规则，供后续开发前快速确认上下文。

**更新日期**: 2026-05-10  
**版本**: 2.0 (适配 Vue3 重构)

---

## 1. 技术栈

### 后端

- **Spring Boot** 4.0.2
- **Java** 21
- **Redis** 7.x (缓存，database=1)
- **Springdoc OpenAPI** 3 (Swagger UI)
- **NIO** `Path` / `Files` 扫描本地漫画目录

### 前端

- **Vite** 5.x
- **Vue** 3.5.x (Composition API + `<script setup>`)
- **Pinia** 2.3.x (状态管理)
- **Vue Router** 4.6.x (路由管理)
- **Tailwind CSS** (CDN 引入)
- **Vitest** + jsdom (单元测试)

### 工具

- **Go** 1.21+ (CLI 工具)
  - `image-optimizer`: HQ → LQ WebP 转换
  - `replace_files_with_empty`: 文件清空
  - `leaf-image-finder`: 叶目录首图查找

### 部署

- **Docker Compose**: nginx + backend + redis
- **Nginx**: 静态文件服务、图片服务、API 反向代理

---

## 2. 项目结构

```text
comics15/
├── backend/
│   └── src/main/java/com/nianer/comic/
│       ├── ComicApplication.java
│       ├── Controller/
│       │   ├── ComicController.java      # 漫画目录 API
│       │   └── ToolController.java       # 工具管理 API
│       ├── Service/
│       │   ├── ComicCatalogService.java  # 目录扫描、章节树
│       │   ├── ComicCacheService.java    # Redis 缓存操作
│       │   ├── ComicMediaService.java    # 媒体文件处理
│       │   └── ToolExecutor.java         # 异步工具执行
│       ├── Config/
│       │   ├── ComicConfig.java          # 漫画路径配置
│       │   ├── ToolConfig.java           # 工具路径配置
│       │   └── CorsConfig.java           # 跨域配置
│       ├── Model/
│       │   └── ToolExecution.java        # 工具执行状态模型
│       └── Component/
│           └── RedisValidator.java       # Redis 可用性检测
├── frontend/
│   ├── index.html                        # SPA 入口
│   ├── vite.config.js                    # Vite 配置
│   └── src/
│       ├── main.js                       # Vue3 + Pinia + Router 启动
│       ├── App.vue                       # 根组件、状态恢复
│       ├── router/
│       │   └── index.js                  # 路由配置、URL 构建
│       ├── stores/                       # Pinia 状态
│       │   ├── series-store.js           # 系列列表状态
│       │   ├── chapter-store.js          # 章节状态
│       │   ├── reader-store.js           # 阅读器状态
│       │   ├── progress-store.js         # 阅读进度
│       │   └── tools-store.js            # 工具执行状态
│       ├── pages/                        # 页面级视图
│       │   ├── SeriesPage.vue            # 系列列表页
│       │   ├── DirectoryPage.vue         # 目录浏览页
│       │   ├── ReaderPage.vue            # 阅读页
│       │   └── ToolsPage.vue             # 工具管理页
│       ├── components/                   # 复用组件
│       │   ├── ReaderShell.vue           # 阅读器控制壳
│       │   ├── ReaderMediaItem.vue       # 媒体项渲染
│       │   ├── ChapterCard.vue           # 章节卡片
│       │   ├── JumpPageModal.vue         # 跳页弹窗
│       │   └── tools/                    # 工具页组件
│       │       ├── ToolList.vue
│       │       ├── ToolConfig.vue
│       │       ├── ExecutionPanel.vue
│       │       └── ExecutionHistory.vue
│       ├── services/                     # 服务层
│       │   ├── api.js                    # 漫画目录 API
│       │   ├── media-url.js              # 媒体 URL 构建
│       │   ├── storage.js                # localStorage 封装
│       │   ├── chapter-meta-cache.js     # 章节元数据缓存
│       │   └── tools-api.js              # 工具 API
│       ├── utils/                        # 工具函数
│       │   ├── chapter-tree.js           # 章节树操作
│       │   ├── chapter-cover-meta.js     # 封面元数据
│       │   ├── natural-sort.js           # 自然排序
│       │   ├── file-type.js              # 文件类型判断
│       │   ├── lazy-cover.js             # 封面懒加载
│       │   ├── request-queue.js          # 请求队列
│       │   ├── debounce.js               # 防抖
│       │   └── dom.js                    # DOM 工具
│       ├── composables/                  # 组合式函数
│       │   └── index.js
│       └── config/                       # 常量配置
│           └── index.js
├── tools/                                # Go CLI 工具
│   ├── image-optimizer/
│   ├── replace_files_with_empty/
│   └── leaf-image-finder/
├── docs/                                 # 文档
├── nginx.conf                            # Nginx 配置
└── docker-compose.yml                    # Docker Compose
```

---

## 3. 漫画文件存储模型

根目录默认是：

```text
F:/games/comics            # Windows 开发
/comics                    # Docker 容器
```

目录结构：

```text
COMICS_ROOT/
├── h_photograph/{series}/{chapter}/     # HQ 原图
└── l_photograph/{series}/{chapter}/     # LQ WebP 压缩图
```

### HQ 目录

`h_photograph` 是文件名索引的权威来源。

- 后端系列扫描从 HQ 顶层目录获取系列列表
- 后端章节扫描从 HQ 目录查找包含媒体文件的目录
- 后端章节文件列表只扫描 HQ 章节目录
- HQ 中通常存完整原图
- 部分文件在 HQ 中只是空白占位文件，用来保留文件名

### LQ 目录

`l_photograph` 存低质量 WebP 压缩图。

- LQ 文件与 HQ 文件名基础名一一对应
- LQ 文件扩展名统一为 `.webp`
- 例如 HQ 文件 `001.jpg` 对应 LQ 文件 `001.webp`
- 不是所有 HQ 图片都有 LQ 备份
- 也存在 HQ 是空白占位、LQ 才是真图的情况

---

## 4. 后端 API 架构

核心 Controller：`backend/src/main/java/com/nianer/comic/Controller/`

### `/api/series` - 获取系列列表

**用途**: 返回所有漫画系列

**行为**:
- 扫描 HQ 根目录下的一级目录
- 使用自然排序
- Redis 缓存键：`v2:series_list`

**响应**:
```json
["系列A", "系列B"]
```

### `/api/chapter/{seriesName}?chapterPath=` - 获取章节文件

**用途**: 返回章节内所有媒体文件元数据

**行为**:
- 支持多级目录（通过 URL 编码的 `chapterPath` 参数）
- 返回文件元数据（HQ/LQ 存在状态、URL 等）
- 图片+视频混合章节会返回所有媒体文件
- Redis 缓存键：`v2:chapter_files:{series}:{path}`

**响应**:
```json
{
  "path": "第01话",
  "files": [
    {
      "name": "001.jpg",
      "baseName": "001",
      "mediaType": "image",
      "preferredSource": "lq",
      "hq": {
        "exists": true,
        "size": 1234567,
        "url": "/hq_image/系列A/第01话/001.jpg"
      },
      "lq": {
        "exists": true,
        "url": "/lq_image/系列A/第01话/001.webp"
      }
    }
  ],
  "total": 36
}
```

### `/api/levels/{seriesName}?path=` - 获取层级节点

**用途**: 按需加载目录层级节点（替代旧版 `/api/chapters` 的递归加载）

**行为**:
- 只返回当前层级的直接子节点
- 目录节点：`type=directory`，`has_children` 标记是否有子目录
- 章节节点：`type=chapter`，包含 `total_files`、`cover_file`、`cover_source`
- 纯视频/GIF 章节不返回 `cover_file` 和 `cover_source`
- Redis 缓存键：`v2:level:{series}` 或 `v2:level:{series}:{path}`

**响应**:
```json
{
  "path": "合集/卷1",
  "nodes": [
    {
      "type": "directory",
      "name": "第01册",
      "path": "合集/卷1/第01册",
      "has_children": true
    },
    {
      "type": "chapter",
      "name": "第02话",
      "path_id": "合集/卷1/第02话",
      "total_files": 36,
      "cover_file": "001.jpg",
      "cover_source": "lq"
    }
  ]
}
```

### `/api/tools` - 工具管理 API

**用途**: 管理和执行外部 Go CLI 工具

**端点**:
- `GET /api/tools` - 获取可用工具列表
- `POST /api/tools/{toolName}/execute` - 执行工具
- `GET /api/tools/status/{executionId}` - 查询执行状态
- `GET /api/tools/executions` - 获取所有执行记录
- `POST /api/tools/cancel/{executionId}` - 取消执行
- `POST /api/tools/cleanup` - 清理已完成记录

---

## 5. Service 层架构

### ComicCatalogService

**职责**: 漫画目录业务流程

**核心方法**:
- `listSeries()` - 扫描系列列表
- `getChapterFiles(series, chapterPath)` - 获取章节文件
- `listLevelNodes(series, path)` - 获取层级节点

**内部 Record**:
```java
record ChapterFilesResult(HttpStatus status, Map<String, Object> body)
record LevelNodesResult(HttpStatus status, Map<String, Object> body)
```

### ComicCacheService

**职责**: Redis 缓存边界

**行为**:
- 检查 `REDIS_ENABLED` 静态标志
- Redis 不可用时跳过缓存
- 负责 JSON 序列化和 TTL 管理

### ComicMediaService

**职责**: 媒体文件处理

**核心方法**:
- `listSupportedMediaFiles(path)` - 列出支持格式的文件
- `inspectChapterPreview(path)` - 检查章节预览信息
- `buildFileMetadata(...)` - 构建文件元数据
- `buildChapterFilesResponse(...)` - 构建章节文件响应

**支持格式**:
```java
SUPPORTED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov"]
IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"]  // 封面候选
```

### ToolExecutor

**职责**: 异步执行 Go CLI 工具

**行为**:
- 使用 `ExecutorService` + `ProcessBuilder`
- 解析中文进度日志（"处理成功: X"、"跳过文件: X"、"失败数量: X"）
- 支持取消和清理操作
- 执行记录保存在内存中

---

## 6. 前端架构

### 状态管理 (Pinia)

| Store | 职责 |
|-------|------|
| `series-store` | 系列列表、搜索过滤、加载状态 |
| `chapter-store` | 章节树、层级节点、加载状态 |
| `reader-store` | 当前章节文件、阅读位置、视图状态 |
| `progress-store` | 阅读进度持久化、localStorage |
| `tools-store` | 工具列表、执行记录、轮询状态 |

### 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | `SeriesPage` | 系列列表 |
| `/series/:series/dir/:path?` | `DirectoryPage` | 目录浏览 |
| `/series/:series/read/:path?` | `ReaderPage` | 阅读页 |
| `/tools` | `ToolsPage` | 工具管理 |

### 关键组件

**ReaderShell.vue**:
- 阅读器控制壳
- 跳页输入
- 进度显示 (`currentPage / total`)
- 章节导航（上一话/下一话/返回目录）
- 悬浮快捷按钮

**ReaderMediaItem.vue**:
- 图片渲染（LQ 加载，双击切换 HQ）
- 视频/GIF 渲染
- 加载失败回退逻辑

**ChapterCard.vue**:
- 横向卡片布局（首图 + 信息）
- 阅读进度显示
- 当前阅读章节高亮

---

## 7. 静态资源服务

### 本地开发 (Vite)

**配置**: `frontend/vite.config.js`

**规则**:
```text
/api      -> http://localhost:500 (Spring Boot)
/hq_image -> COMICS_ROOT_DIR/h_photograph (本地文件)
/lq_image -> COMICS_ROOT_DIR/l_photograph (本地文件)
/video    -> COMICS_ROOT_DIR/h_photograph (本地文件)
```

**注意**: 使用自定义 Vite 插件读取本地文件，不使用 `file://` proxy（Windows 路径解析问题）。

### 生产/Docker (Nginx)

**配置**: `nginx.conf`

**API 代理**:
```nginx
location /api/ {
    proxy_pass http://web:500;
}
```

**LQ 图片**:
```nginx
location ^~ /lq_image/ {
    alias /comics/l_photograph/;
    try_files $uri @lq_not_found;
}
location @lq_not_found {
    return 204;  # 前端回退到 HQ
}
```

**HQ 图片**:
```nginx
location ^~ /hq_image/ {
    alias /comics/h_photograph/;
    try_files $uri =404;
}
```

**视频**:
```nginx
location /video/ {
    alias /comics/h_photograph/;
    try_files $uri =404;
    add_header Accept-Ranges bytes;  # 支持视频拖拽
}
```

---

## 8. 图片加载策略

完整设计见：[章节图片源策略设计](./chapter-source-strategy-design.md)

### 基本原则

```
章节首图 cover_source → 普通图片优先按章节级来源加载 → 异常时兜底
```

**规则**:
- `cover_source = lq`: 普通图片默认直接构建 LQ WebP URL
- `cover_source = hq`: 普通图片默认直接构建 HQ URL
- `cover_source` 缺失: 回退到逐张 HEAD 探测
- 视频/GIF 始终走 `/video/`，不参与 LQ/HQ 策略

### 阅读器图片加载

1. `ReaderPage` 获取当前章节，提取 `cover_source`
2. 为每个媒体容器设置 `data-cover-source`
3. `ReaderMediaItem` 根据 `data-cover-source` 构建初始 URL
4. 图片加载失败 (`onerror`) 时回退到另一源

### 章节卡片首图

1. `DirectoryPage` 加载层级节点
2. 章节节点包含 `cover_file` 和 `cover_source`
3. `ChapterCard` 直接使用 `cover_source` 构建首图 URL
4. 懒加载触发（`IntersectionObserver`）

---

## 9. 缓存策略

### Redis 缓存

| 数据 | 缓存键 | TTL |
|------|--------|-----|
| 系列列表 | `v2:series_list` | 7天 |
| 章节文件 | `v2:chapter_files:{series}:{path}` | 7天 |
| 层级节点 | `v2:level:{series}[:{path}]` | 7天 |

### 降级策略

1. `RedisValidator` 启动时检测 Redis 可用性
2. 设置静态 `REDIS_ENABLED` 标志
3. `ComicCacheService` 检查该标志，不可用时跳过缓存
4. 直接读取文件系统

### 浏览器缓存

- 章节元数据：`chapter-meta-cache.js` 内存缓存
- 阅读进度：`localStorage` 持久化

---

## 10. 配置说明

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `COMICS_ROOT_DIR` | `F:/games/comics` | 漫画根目录 |
| `HQ_SUB_DIR` | `h_photograph` | HQ 子目录 |
| `LQ_SUB_DIR` | `l_photograph` | LQ 子目录 |
| `TOOL_ROOT_DIR` | `.../tools` | Go 工具根目录 |
| `REDIS_HOST` | `localhost` | Redis 主机 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `CACHE_EXPIRATION` | `604800` | 缓存 TTL（秒）|
| `VITE_DEV_PORT` | `5173` | 前端开发端口 |

### 端口说明

| 服务 | 端口 | 访问地址 |
|------|------|----------|
| 后端 | 500 | `http://localhost:500` |
| 前端开发 | 5173 | `http://localhost:5173` |
| 前端预览 | 4173 | `http://localhost:4173` |
| Docker Nginx | 5000 | `http://localhost:5000` |
| Redis | 6379 | - |

---

## 11. 开发流程

### 本地开发启动

```bash
# 1. 启动 Redis
docker run --name comic15-redis -p 6379:6379 -d redis:7-alpine

# 2. 启动后端
cd backend
./mvnw spring-boot:run

# 3. 启动前端
cd frontend
npm install
npm run dev
```

### Docker 部署

```bash
docker compose up --build
```

---

## 12. 相关文档

- [后端 API 文档](./backend-api.md)
- [项目需求文档](./project-requirements.md)
- [移动端前端设计](./mobile-frontend-design.md)
- [章节图片源策略设计](./chapter-source-strategy-design.md)
- [启动指南](./start-frontend-backend.md)

---

## 13. 变更历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 2.0 | 2026-05-10 | 适配 Vue3 重构：更新目录结构、API 描述、Service 层说明 |
| 1.0 | - | 初始版本 |
