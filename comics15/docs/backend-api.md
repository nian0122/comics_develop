# 后端 API 文档

本文档整理 `backend/` 当前 Spring Boot 后端公开的 HTTP API。后端默认监听 `500` 端口，业务接口统一以 `/api` 开头，Swagger UI 地址为 `/swagger-ui.html`，OpenAPI JSON 地址为 `/v3/api-docs`。

## 通用说明

- 默认基础地址：`http://localhost:500`
- 请求与响应格式：除静态资源外，业务 API 均使用 JSON。
- 字符编码：路径和查询参数支持中文；前端通常会对章节路径做 URL 编码，后端在 Controller 中解码。
- 目录路径约定：`seriesName` 表示漫画系列名，`chapterPath` / `path` 表示系列内相对路径，多级目录使用 `/` 分隔。
- 媒体静态路径：API 响应中的媒体 URL 指向 Nginx 静态资源入口，包括 `/hq_image/*`、`/lq_image/*`、`/video/*`。
- 缓存：系列、章节文件、层级节点会优先读取 Redis 缓存；Redis 不可用时后端会走文件系统扫描。

## 漫画目录 API

### 获取所有漫画系列

```http
GET /api/series
```

扫描 HQ 根目录下的一级目录，返回自然排序后的漫画系列名称数组。

#### 响应

`200 OK`

```json
[
  "系列A",
  "系列B"
]
```

#### 说明

- 对应缓存键：`v2:series_list`。
- 如果 HQ 根目录不存在，返回空数组。

### 获取章节文件列表

```http
GET /api/chapter/{seriesName}?chapterPath={chapterPath}
```

返回指定章节目录下支持的媒体文件元数据。文件按大小写不敏感的自然排序排列。

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `seriesName` | string | 是 | 漫画系列名称。 |

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `chapterPath` | string | 否 | `""` | 系列内章节相对路径。允许 URL 编码后的多级中文路径。 |

#### 响应

`200 OK`

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
    },
    {
      "name": "002.mp4",
      "baseName": "002",
      "mediaType": "video",
      "preferredSource": "hq",
      "hq": {
        "exists": true,
        "size": 9876543,
        "url": "/hq_image/系列A/第01话/002.mp4"
      },
      "lq": {
        "exists": false,
        "url": "/lq_image/系列A/第01话/002.webp"
      },
      "videoUrl": "/video/系列A/第01话/002.mp4"
    }
  ],
  "total": 2
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `path` | string | 当前章节相对路径。 |
| `files` | array | 媒体文件元数据列表。 |
| `total` | number | 返回的媒体文件数量。 |
| `files[].name` | string | HQ 原始文件名。 |
| `files[].baseName` | string | 去除最后一个扩展名后的文件基础名。 |
| `files[].mediaType` | string | `image` 或 `video`；`.gif` 当前归为 `video`。 |
| `files[].preferredSource` | string | LQ 同名 WebP 存在时为 `lq`，否则为 `hq`。 |
| `files[].hq.exists` | boolean | HQ 文件是否存在。 |
| `files[].hq.size` | number | HQ 文件字节数；不存在时为 `0`。 |
| `files[].hq.url` | string | HQ 静态资源 URL。 |
| `files[].lq.exists` | boolean | LQ WebP 是否存在。 |
| `files[].lq.url` | string | LQ 静态资源 URL。 |
| `files[].videoUrl` | string | 非图片媒体才返回，指向 `/video/*`。 |

#### 错误响应

`404 Not Found`

当目标章节目录不存在或不是目录时返回空文件列表：

```json
{
  "path": "不存在的章节",
  "files": [],
  "total": 0
}
```

#### 说明

- 支持媒体扩展名：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.mp4`、`.mov`。
- 图片封面格式只包含：`.jpg`、`.jpeg`、`.png`、`.webp`。
- 对应缓存键：`v2:chapter_files:{seriesName}:{chapterPath}`。

### 按需获取层级节点

```http
GET /api/levels/{seriesName}?path={path}
```

返回指定系列相对路径下的直接子目录节点。目录内包含受支持媒体文件时视为章节节点，否则视为可展开目录节点。

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `seriesName` | string | 是 | 漫画系列名称。 |

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `path` | string | 否 | `""` | 系列内相对路径。空字符串表示系列根目录。 |

#### 响应

`200 OK`

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
      "cover_url": "/lq_image/系列A/合集/卷1/第02话/001.webp"
    }
  ]
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `path` | string | 当前层级相对路径。 |
| `nodes` | array | 当前层级的直接子节点。 |
| `nodes[].type` | string | `directory` 或 `chapter`。 |
| `nodes[].name` | string | 节点展示名。 |
| `nodes[].path` | string | 目录节点路径，仅 `directory` 返回。 |
| `nodes[].has_children` | boolean | 目录节点是否包含直接子目录，仅 `directory` 返回。 |
| `nodes[].path_id` | string | 章节节点路径，仅 `chapter` 返回。 |
| `nodes[].total_files` | number | 章节内受支持媒体文件数量，仅 `chapter` 返回。 |
| `nodes[].cover_url` | string | 章节封面 URL；LQ 存在时返回 LQ URL，否则返回 HQ URL；纯视频/GIF 章节可能没有该字段。 |

#### 错误响应

`400 Bad Request`

当 `path` 经过规范化后逃逸出当前系列目录时返回：

```json
{
  "path": "../非法路径",
  "nodes": []
}
```

`404 Not Found`

当目标目录不存在或不是目录时返回：

```json
{
  "path": "不存在的路径",
  "nodes": []
}
```

#### 说明

- 接口只扫描当前层级的直接子目录，不递归展开整棵目录树。
- 对应缓存键：根路径为 `v2:level:{seriesName}`，非根路径为 `v2:level:{seriesName}:{path}`。

## 工具管理 API

工具 API 用于启动和管理后端封装的外部 Go CLI 工具。所有工具执行均为异步执行，启动接口只返回执行 ID，执行进度通过状态接口轮询。

### 获取可用工具列表

```http
GET /api/tools
```

返回后端内置的工具元数据及前端表单参数配置。

#### 响应

`200 OK`

```json
[
  {
    "name": "image-optimizer",
    "displayName": "图片优化器",
    "description": "将 HQ 图片转换为 LQ WebP 格式",
    "params": [
      { "key": "rootDir", "label": "根目录", "type": "text", "required": false, "default": "" },
      { "key": "customDir", "label": "自定义扫描目录", "type": "text", "required": false, "default": "" },
      { "key": "series", "label": "或选择系列", "type": "select", "required": false, "default": "" },
      { "key": "workers", "label": "并发数", "type": "number", "required": false, "default": "8" },
      { "key": "quality", "label": "WebP质量", "type": "number", "required": false, "default": "15" },
      { "key": "force", "label": "强制重处理", "type": "select", "required": false, "default": "" }
    ]
  }
]
```

#### 当前工具

| 工具名 | 展示名 | 说明 |
| --- | --- | --- |
| `image-optimizer` | 图片优化器 | 将 HQ 图片转换为 LQ WebP 格式。 |
| `replace_files_with_empty` | 清空文件内容 | 将文件截断为 0 字节，保留文件。 |
| `leaf-image-finder` | 叶目录图片查找 | 查找目标路径下所有叶目录的第一张图片。 |

### 执行工具

```http
POST /api/tools/{toolName}/execute
Content-Type: application/json
```

异步启动指定工具并返回执行 ID。请求体可省略；省略时按空参数处理。

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `toolName` | string | 是 | 工具名称，必须是 `GET /api/tools` 返回的 `name`。 |

#### 请求体

请求体类型为 `Map<string,string>`，不同工具支持的参数不同。

`image-optimizer` 示例：

```json
{
  "rootDir": "F:/games/comics",
  "series": "系列A",
  "workers": "8",
  "quality": "15",
  "force": "true"
}
```

`replace_files_with_empty` 示例：

```json
{
  "dir": "F:/games/comics/h_photograph/系列A",
  "ext": ".jpg,.jpeg,.png,.gif,.bmp,.webp",
  "workers": "8",
  "minSize": "0",
  "dryRun": "true"
}
```

`leaf-image-finder` 示例：

```json
{
  "dir": "F:/games/comics/h_photograph/系列A",
  "ext": ".jpg,.jpeg,.png,.webp,.gif,.bmp",
  "json": "true"
}
```

#### 参数到 CLI 的映射

| 工具 | 参数 | CLI 行为 |
| --- | --- | --- |
| `image-optimizer` | `customDir` | 非空时使用 `-scan-dir {customDir}`，并跳过 `rootDir`/`series` 模式。 |
| `image-optimizer` | `rootDir` | 空值时使用后端 `comic.root-dir`；映射为 `-root`。 |
| `image-optimizer` | `series` | 非空时映射为 `-series`。 |
| `image-optimizer` | `workers` | 非空时映射为 `-workers`。 |
| `image-optimizer` | `quality` | 非空时映射为 `-quality`。 |
| `image-optimizer` | `force` | 值为 `true` 或 `1` 时追加 `-force`。 |
| `replace_files_with_empty` | `dir` | 空值时使用后端 `comic.root-dir`；映射为 `-dir`。 |
| `replace_files_with_empty` | `ext` | 非空时映射为 `-ext`。 |
| `replace_files_with_empty` | `workers` | 非空时映射为 `-workers`。 |
| `replace_files_with_empty` | `minSize` | 非空且不是 `0` 时映射为 `-min-size`。 |
| `replace_files_with_empty` | `dryRun` | 值为 `true` 或 `1` 时追加 `-dry-run`。 |
| `leaf-image-finder` | `dir` | 空值时使用后端 `comic.root-dir`；映射为 `-dir`。 |
| `leaf-image-finder` | `ext` | 非空时映射为 `-ext`。 |
| `leaf-image-finder` | `json` | 值为 `true` 或 `1` 时追加 `-json`。 |

#### 响应

`200 OK`

```json
{
  "executionId": "a1b2c3d4",
  "toolName": "image-optimizer",
  "message": "执行已启动"
}
```

#### 错误响应

`400 Bad Request`

```json
{
  "error": "工具不存在: unknown-tool"
}
```

### 获取执行状态

```http
GET /api/tools/status/{executionId}
```

查询指定执行记录的状态、日志、计数和耗时。

#### 响应

`200 OK`

```json
{
  "executionId": "a1b2c3d4",
  "toolName": "image-optimizer",
  "status": "RUNNING",
  "logs": [
    "开始执行工具: image-optimizer",
    "工具路径: D:/projects/comics_develop/comics15/tools/image-optimizer/image-optimizer.exe"
  ],
  "startTime": "2026-05-10T18:30:00.123456",
  "endTime": null,
  "processedCount": 10,
  "skippedCount": 2,
  "errorCount": 0,
  "durationSeconds": 12,
  "finished": false
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `executionId` | string | 执行 ID，当前由 UUID 截断为 8 位字符串。 |
| `toolName` | string | 工具名称。 |
| `status` | string | `PENDING`、`RUNNING`、`COMPLETED`、`FAILED`、`CANCELLED`。 |
| `logs` | array | 工具 stdout 与后端追加日志。 |
| `startTime` | string | 执行记录创建时间。 |
| `endTime` | string/null | 完成、失败或取消时间。 |
| `processedCount` | number | 从中文日志中解析出的处理数量。 |
| `skippedCount` | number | 从中文日志中解析出的跳过数量。 |
| `errorCount` | number | 从中文日志中解析出的失败数量。 |
| `durationSeconds` | number | Lombok/Jackson 序列化 `getDurationSeconds()` 得到的耗时秒数。 |
| `finished` | boolean | Lombok/Jackson 序列化 `isFinished()` 得到的是否终态。 |

#### 错误响应

`404 Not Found`

响应体为空。

### 获取所有执行记录

```http
GET /api/tools/executions
```

返回当前内存中的所有执行记录，包括未完成与已完成记录。

#### 响应

`200 OK`

```json
{
  "a1b2c3d4": {
    "executionId": "a1b2c3d4",
    "toolName": "image-optimizer",
    "status": "COMPLETED",
    "logs": [],
    "startTime": "2026-05-10T18:30:00.123456",
    "endTime": "2026-05-10T18:31:00.123456",
    "processedCount": 100,
    "skippedCount": 3,
    "errorCount": 0,
    "durationSeconds": 60,
    "finished": true
  }
}
```

#### 说明

- 执行记录保存在后端进程内存中，服务重启后会丢失。

### 取消执行

```http
POST /api/tools/cancel/{executionId}
```

将未完成的执行记录标记为取消。

#### 响应

`200 OK`

```json
{
  "message": "执行已取消"
}
```

#### 错误响应

`404 Not Found`

```json
{
  "error": "执行记录不存在"
}
```

`400 Bad Request`

```json
{
  "error": "执行已完成，无法取消"
}
```

#### 说明

- 当前实现会更新执行记录状态为 `CANCELLED` 并追加日志 `用户取消执行`。
- 当前实现没有保存并销毁底层 `Process` 对象，因此取消更像状态层面的取消标记；已经启动的外部进程可能仍会继续运行。

### 清理已完成记录

```http
POST /api/tools/cleanup
```

删除所有已完成、失败或已取消的执行记录。

#### 响应

`200 OK`

```json
{
  "message": "已完成记录已清理"
}
```

## 配置与运行时相关端点

### Swagger UI

```http
GET /swagger-ui.html
```

由 springdoc 提供 Swagger UI 页面。

### OpenAPI JSON

```http
GET /v3/api-docs
```

由 springdoc 提供 OpenAPI JSON。

## 相关配置

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `server.port` | `500` | 后端监听端口。 |
| `comic.root-dir` | `${COMICS_ROOT_DIR:F:\games\comics}` | 漫画根目录。 |
| `comic.hq-sub-dir` | `${HQ_SUB_DIR:h_photograph}` | HQ 原图子目录。 |
| `comic.lq-sub-dir` | `${LQ_SUB_DIR:l_photograph}` | LQ WebP 子目录。 |
| `comic.cache-expiration` | `${CACHE_EXPIRATION:604800}` | Redis 缓存 TTL，单位秒。 |
| `tool.root-dir` | `${TOOL_ROOT_DIR:D:/projects/comics_develop/comics15/tools}` | 外部工具根目录。 |
| `spring.data.redis.host` | `${REDIS_HOST:localhost}` | Redis 主机。 |
| `spring.data.redis.port` | `${REDIS_PORT:6379}` | Redis 端口。 |
| `spring.data.redis.database` | `1` | Redis database。 |

## 错误处理注意事项

- 当前后端没有独立的全局异常处理器；Controller 方法抛出的 `IOException` 等异常会交给 Spring 默认错误响应处理。
- 漫画目录类接口对“目录不存在”这类业务情况会返回结构化空结果，并通过 HTTP 状态码区分 `404` 或 `400`。
- 工具执行启动成功只表示后端已创建执行记录并提交异步任务；工具可执行文件不存在、进程退出非零等情况会在后续状态查询中体现为 `FAILED`。
