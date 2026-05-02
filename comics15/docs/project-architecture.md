# 项目架构记录

本文档记录漫画阅读器当前架构、数据流和图片加载规则，供后续开发前快速确认上下文。

## 1. 技术栈

### 后端

- Spring Boot 4.0.2
- Java 21
- Redis 缓存
- Springdoc Swagger UI
- NIO `Path` / `Files` 扫描本地漫画目录

### 前端

- Vite
- ES6 模块化 JavaScript
- Tailwind CSS + 自定义 CSS
- Vitest + jsdom
- 移动端优先页面流

### 部署

- Docker Compose 启动 `nginx`、`web`、`redis`
- Nginx 负责前端静态文件、图片静态服务和 API 反向代理

## 2. 目录结构

```text
comics15/
├── backend/
│   └── src/main/java/com/nianer/comic/
│       ├── ComicApplication.java
│       ├── Controller/ComicController.java
│       ├── Config/ComicConfig.java
│       ├── Config/CorsConfig.java
│       └── Component/RedisValidator.java
├── frontend/
│   ├── index.html
│   ├── js/
│   │   ├── main.js
│   │   ├── components/reader.js
│   │   ├── services/api.js
│   │   ├── services/storage.js
│   │   ├── state/store.js
│   │   ├── state/progress-state.js
│   │   └── utils/
│   └── css/
├── docs/
├── nginx.conf
└── docker-compose.yml
```

## 3. 漫画文件存储模型

根目录默认是：

```text
F:/games/comics
```

容器内挂载为：

```text
/comics
```

目录结构：

```text
COMICS_ROOT/
├── h_photograph/{series}/{chapter}/
└── l_photograph/{series}/{chapter}/
```

### HQ 目录

`h_photograph` 是文件名索引的权威来源。

- 后端系列扫描从 HQ 顶层目录获取系列列表。
- 后端章节扫描从 HQ 目录递归查找包含媒体文件的目录。
- 后端章节文件列表只扫描 HQ 章节目录。
- HQ 中通常存完整原图。
- 部分文件在 HQ 中只是空白占位文件，用来保留文件名，实际可显示图片在 LQ 中。

### LQ 目录

`l_photograph` 存低质量 WebP 压缩图。

- LQ 文件与 HQ 文件名一一对应。
- LQ 文件扩展名统一为 `.webp`。
- 例如 HQ 文件 `001.jpg` 对应 LQ 文件 `001.webp`。
- 不是所有 HQ 图片都有 LQ 备份。
- 也存在 HQ 是空白占位、LQ 才是真图的情况。

## 4. 后端 API 架构

核心文件：`backend/src/main/java/com/nianer/comic/Controller/ComicController.java`

### `/api/series`

用途：返回所有漫画系列。

数据来源：

```text
config.getHqPath()
```

行为：

- 扫描 HQ 根目录下的一级目录。
- 使用自然排序。
- Redis 缓存键：`series_list`。

### `/api/chapters/{seriesName}`

用途：返回某个系列的章节路径列表。

数据来源：

```text
config.getHqPath()/{seriesName}
```

返回结构：

```json
[
  {
    "path_id": "第一卷/第 001 话",
    "name": "第 001 话",
    "total_files": "120",
    "cover_file": "001.jpg",
    "cover_source": "lq"
  }
]
```

字段说明：

- `path_id`：章节相对路径，使用 `/` 作为多级目录分隔符。
- `name`：章节显示名，取章节路径最后一级。
- `total_files`：章节内支持媒体文件总数，包含图片、视频和 GIF。
- `cover_file`：自然排序后的第一张普通图片，仅章节包含 `.jpg/.jpeg/.png/.webp` 时返回。
- `cover_source`：`cover_file` 的推荐来源，`lq` 表示对应 LQ WebP 存在，`hq` 表示没有对应 LQ。

行为：

- 递归扫描 HQ 系列目录。
- 包含媒体文件的目录被视为叶子章节。
- 图片+视频混合章节会跳过 `.mp4/.mov/.gif`，使用第一张普通图片作为首图。
- 纯视频/GIF 章节不返回 `cover_file` 和 `cover_source`，前端目录页显示“无预览”。
- Redis 缓存键：`chapters_list:{series}`。

### `/api/chapter/{seriesName}?chapterPath=`

用途：返回章节内的文件名列表。

数据来源：

```text
config.getHqPath()/{seriesName}/{chapterPath}
```

返回结构：

```json
{
  "files": ["001.jpg", "002.jpg", "003.mp4"]
}
```

重要约束：

- 当前只返回文件名数组。
- 不返回文件大小。
- 不判断 HQ 是否为空白占位。
- 不扫描 LQ 目录。
- 前端必须基于 HQ 文件名推导 LQ 文件路径。
- 阅读器的章节级图片源策略来自 `/api/chapters/{seriesName}` 的 `cover_source`，不是这个接口。
- Redis 缓存键：`chapter_files:{series}:{chapter}`。

## 5. 静态资源服务

生产和本地开发的静态资源服务方式不同。

- 生产 / Docker：由 Nginx 提供 `/hq_image`、`/lq_image`、`/video` 静态路径。
- 本地开发：不经过 Nginx；Spring Boot 只提供 `/api`，不提供静态图片服务；Vite dev server 直接从本地 `COMICS_ROOT_DIR` 读取图片。

### 本地 Vite 静态服务

核心文件：`frontend/vite.config.js`

本地开发规则：

```text
/api      -> http://localhost:500，走 Vite proxy
/hq_image -> COMICS_ROOT_DIR/HQ_SUB_DIR，走 Vite middleware 读本地文件
/lq_image -> COMICS_ROOT_DIR/LQ_SUB_DIR，走 Vite middleware 读本地文件
/video    -> COMICS_ROOT_DIR/HQ_SUB_DIR，走 Vite middleware 读本地文件
```

注意：不要用 Vite proxy 的 `file://` target 代理 Windows 本地文件。`file://F:/...` 会被 http-proxy 当成主机解析，导致 `getaddrinfo ENOTFOUND f`。

默认路径：

```text
COMICS_ROOT_DIR = F:/games/comics
HQ_SUB_DIR = h_photograph
LQ_SUB_DIR = l_photograph
```

### 生产 Nginx 静态服务

核心文件：`nginx.conf`

### API 代理

```nginx
location /api/ {
    proxy_pass http://web:500;
}
```

### LQ 图片

```nginx
location ^~ /lq_image/ {
    alias /comics/l_photograph/;
    try_files $uri @lq_not_found;
}

location @lq_not_found {
    return 204;
}
```

规则：

- LQ 存在：返回 200。
- LQ 不存在：返回 204。
- 前端用 HEAD 请求判断 LQ 是否存在。

### HQ 图片

```nginx
location ^~ /hq_image/ {
    alias /comics/h_photograph/;
    try_files $uri =404;
}
```

规则：

- HQ 存在：返回 200。
- HQ 不存在：返回 404。
- 如果 HQ 是空白占位，可能仍返回 200，但 `content-length` 为 0。

### 视频

```nginx
location /video/ {
    alias /comics/h_photograph/;
    try_files $uri =404;
}
```

视频从 HQ 目录服务。

## 6. 前端页面架构

核心文件：`frontend/js/main.js`

当前页面流：

```text
seriesList -> directoryBrowser -> reader
```

### seriesList

职责：

- 显示漫画系列列表。
- 支持搜索过滤。
- 点击系列后进入目录页。

### directoryBrowser

职责：

- 逐级浏览目录。
- 当前层级同时展示目录节点和章节卡片。
- 节点按自然排序。
- 目录节点点击进入下一层。
- 章节卡片点击进入阅读页。

相关工具：

- `frontend/js/utils/chapter-tree.js`
- `buildChapterTree()`
- `getLevelNodes()`
- `getParentPath()`
- `formatChapterProgress()`

### reader

职责：

- 纵向沉浸式阅读。
- 图片和视频按文件顺序排列。
- 支持懒加载。
- 底部显示阅读进度。
- 右下角悬浮按钮提供上一话、下一话、返回目录、隐藏按钮。
- 双击 LQ 图片尝试加载 HQ 原图。

核心文件：

```text
frontend/js/components/reader.js
```

## 7. 图片 URL 构建规则

核心文件：`frontend/js/services/api.js`

### 路径分段编码

多级章节路径不能整体 `encodeURIComponent()`，否则 `/` 会变成 `%2F`，Nginx 无法按真实目录层级匹配文件。

当前规则：

- 先把 Windows 反斜杠转为 `/`。
- 再按 `/` 分段。
- 每个路径段单独 `encodeURIComponent()`。
- 最后用 `/` 拼回 URL。

示例：

```text
第一卷/第 001 话
```

应该生成：

```text
%E7%AC%AC%E4%B8%80%E5%8D%B7/%E7%AC%AC%20001%20%E8%AF%9D
```

不能生成：

```text
%E7%AC%AC%E4%B8%80%E5%8D%B7%2F%E7%AC%AC%20001%20%E8%AF%9D
```

### LQ URL

```text
/lq_image/{series}/{chapterPath}/{baseName}.webp
```

示例：

```text
HQ: 001.jpg
LQ: 001.webp
```

### HQ URL

```text
/hq_image/{series}/{chapterPath}/{filename}
```

### 视频 URL

```text
/video/{series}/{chapterPath}/{filename}
```

## 8. 图片加载策略

图片加载策略必须符合本项目的 HQ/LQ 存储模型。章节级图片源策略的完整设计见：[章节图片源策略设计](./chapter-source-strategy-design.md)。

### 基本原则

```text
/api/chapters 返回首张普通图片的 cover_source -> 普通图片优先按章节级来源加载 -> 异常时兜底
```

- `cover_source = lq`：本章普通图片默认直接构建 LQ WebP URL。
- `cover_source = hq`：本章普通图片默认直接构建 HQ URL。
- `cover_source` 缺失或异常：回退旧 `api.resolveImageUrl()`，逐张 HEAD 探测。
- 视频/GIF 始终走 `/video/`，不参与 LQ/HQ 图片策略。

### 章节卡片首图

入口：`frontend/js/utils/chapter-cover-meta.js` 的 `getChapterCoverMeta()`，由 `DirectoryView.loadCover()` 懒加载触发。

流程：

1. `api.getChapters(series)` 获取章节列表，后端已返回 `cover_file` 和 `cover_source`。
2. `cover_source = lq` 时直接调用 `api.buildLQImageUrl(series, cover_file, path_id)`。
3. `cover_source = hq` 时直接调用 `api.buildHQImageUrl(series, cover_file, path_id)`。
4. 缺少 `cover_file` 或 `cover_source` 时显示“无预览”。
5. 目录首图不调用 `/api/chapter/{seriesName}`，也不调用 `api.resolveImageUrl()`，因此不产生 LQ HEAD 探测。

### 阅读页图片

入口：`reader.js` 的 `loadChapter()` 和 `loadImageElement()`。

流程：

1. `loadChapter()` 把当前章节的合法 `cover_source` 写入每个媒体容器的 `data-cover-source`。
2. `loadImageElement()` 对普通图片读取 `data-cover-source`。
3. `cover_source = lq` 时直接调用 `api.buildLQImageUrl()`。
4. `cover_source = hq` 时直接调用 `api.buildHQImageUrl()`。
5. `cover_source` 缺失或异常时回退旧 `api.resolveImageUrl()`，通过 `HEAD /lq_image/...` 判断 LQ 是否存在。
6. 默认 LQ 加载失败时，图片 `onerror` 会再次调用 `loadImageElement(container, true)` 回退 HQ。
7. 视频和 GIF 使用 `api.buildVideoUrl()`，不读取 `cover_source`。

### 双击加载 HQ

入口：`reader.js` 的 `handleImageClick()`

规则：

- 只有当前图片来自 `/lq_image/` 时才允许双击切 HQ。
- 切 HQ 前调用 `api.checkHQImageUsable()`。
- 如果 HQ 返回 200 且 `content-length > 0`，才切到 HQ。
- 如果 HQ 是空白占位文件，不切换，继续显示 LQ。
- 如果 HQ 加载失败，回退到原 LQ。

### 空白 HQ 占位文件

当前判断位置：

```text
api.checkHQImageUsable(hqUrl)
```

规则：

- `HEAD /hq_image/...`
- 非 2xx 或 204：不可用。
- `content-length: 0`：不可用。
- 缺少 `content-length`：保守认为可用，避免误杀有效静态文件。

## 9. 状态与缓存

### 前端内存状态

核心文件：`frontend/js/state/store.js`

主要状态：

- `currentView`
- `navigation.currentPath`
- `navigation.returnPath`
- `series.list`
- `series.current`
- `chapters.flatList`
- `chapters.tree`
- `chapters.currentIndex`
- `reader.files`
- `reader.loadedCount`
- `lazyLoad.observer`
- `imageRetry`

### 阅读进度

核心文件：`frontend/js/state/progress-state.js`

本地存储：

```text
progress_{series}_{chapterIndex}
```

记录：

- 当前页码
- 滚动百分比
- 更新时间戳

### 后端 Redis 缓存

缓存键：

```text
series_list
chapters_list:{series}
chapter_files:{series}:{chapter}
```

默认过期：

```text
604800 秒（7 天）
```

Redis 不可用时后端会降级为直接文件系统扫描。

## 10. 重要约束与坑点

### 不能把章节路径整体编码

错误：

```js
encodeURIComponent(chapterPath)
```

正确：按路径段分别编码。

### 后端文件列表以 HQ 为准

即使 LQ 有图片，只要 HQ 没有对应文件名，当前 API 就不会返回该图片。

因此如果未来要支持“只有 LQ，没有 HQ 占位文件”的资源，需要修改后端，扫描 HQ 与 LQ 的并集。

### LQ 缺失返回 204

前端不要把 204 当成图片可用。

`checkLQImageExists()` 只在 `status === 200` 时返回 true。该逐张 HEAD 探测现在只用于 `cover_source` 缺失或异常时的兼容兜底；正常章节阅读优先复用 `/api/chapters` 返回的 `cover_source`。

### HQ 空白占位不能直接显示

空白 HQ 文件用于索引，不一定代表可显示图片。

双击切 HQ 前必须检查 `content-length`。

### 目录卡片和阅读页必须共用章节级来源语义

目录卡片和阅读页都以 `/api/chapters/{seriesName}` 返回的 `cover_source` 作为章节级图片来源判断，避免两条链路各自探测导致结果不一致。

使用规则：

```text
cover_source = lq → buildLQImageUrl()
cover_source = hq → buildHQImageUrl()
cover_source 缺失 → resolveImageUrl() 兜底
```

不要在新代码中重新逐文件设计 LQ 探测逻辑；如果必须兜底，应复用 `api.resolveImageUrl()`。

## 11. 测试与验证

前端相关测试：

```bash
cd frontend
npm test
npm run lint
npm run build
```

关键测试文件：

```text
backend/src/test/java/com/nianer/comic/Controller/ComicControllerTest.java
frontend/js/components/reader.test.js
frontend/js/services/api.test.js
frontend/js/utils/chapter-cover-meta.test.js
frontend/js/utils/chapter-tree.test.js
frontend/js/utils/file-type.test.js
```

图片加载相关测试必须覆盖：

- `/api/chapters` 为图片+视频混合章节返回第一张普通图片的 `cover_file` 和 `cover_source`。
- 纯视频/GIF 章节返回 `total_files`，但不返回 `cover_file` 和 `cover_source`。
- 多级中文路径不生成 `%2F`。
- Windows 反斜杠路径会规范化。
- 目录首图根据 `cover_source` 直接构建 LQ/HQ URL。
- 阅读器在 `cover_source = lq/hq` 时跳过逐张 LQ HEAD 探测。
- `cover_source` 缺失时阅读器回退 `api.resolveImageUrl()`。
- 视频/GIF 始终走 `/video/`，不读取 `cover_source`。
- HQ `content-length: 0` 被视为不可用。
- 缺少 `content-length` 时不误杀 HQ。

## 12. 后续可能演进

如果未来需要更完整的媒体索引，可以考虑修改后端 `/api/chapter` 返回结构：

```json
{
  "files": [
    {
      "name": "001.jpg",
      "hqExists": true,
      "hqSize": 0,
      "lqExists": true,
      "lqSize": 123456
    }
  ]
}
```

这样可以减少前端 HEAD 请求，并明确区分：

- HQ 真图
- HQ 空白占位
- LQ 压缩图
- 仅 HQ
- 仅 LQ

当前实现保持后端简单：`/api/chapters` 只提供章节级 `cover_source`，阅读器优先复用该字段；只有旧缓存、异常数据或缺失字段时，前端才通过 HEAD 请求完成 LQ 优先和 HQ 可用性判断。
