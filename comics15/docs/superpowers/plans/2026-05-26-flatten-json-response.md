# 扁平化 JSON 响应 + 后端预计算最优 URL

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将后端 JSON 响应扁平化——文件元数据由后端预计算最终 URL（hq/lq 选择前置），层级节点统一 camelCase，前端删除所有 snake_case 兼容代码和 hq/lq 嵌套判断。

**Architecture:** ComicMediaService 的 `buildFileMetadata` 改为直接输出 `{name, type, url, fallbackUrl}`，不再构建 hq/lq 嵌套对象。`buildLevelChapterNode` / `buildDirectoryNode` 字段改为 camelCase。前端 types/api.ts 与 stores 同步更新，`media-url.ts` 大幅简化。

## 影响范围

| 层 | 文件 | 改动类型 |
|----|------|----------|
| 后端 | `ComicMediaService.java` | 重写 `buildFileMetadata`，改 `buildLevelChapterNode`/`buildDirectoryNode` 字段名 |
| 后端 | `ComicCatalogService.java` | 无逻辑改动（委托 ComicMediaService） |
| 后端 | `ComicController.java` | 无改动 |
| 前端 | `types/api.ts` | 更新 `MediaItem`、`LevelNode`、`ChapterResponse` |
| 前端 | `services/media-url.ts` | 简化 `getMediaSource`，删 hq/lq 嵌套逻辑和 snake_case 兜底 |
| 前端 | `stores/reader-store.ts` | 对齐新 `MediaItem` 字段 |
| 前端 | `stores/chapter-store.ts` | 对齐 `LevelNode` camelCase 字段 |

## 文件结构

```
backend/src/main/java/com/nianer/comic/Service/
├── ComicMediaService.java   ← 核心改动：buildFileMetadata, buildLevelChapterNode, buildDirectoryNode
├── ComicCatalogService.java ← 无逻辑改动
└── ComicMediaServiceTest.java ← 需要新增或更新测试

frontend/src/
├── types/api.ts             ← MediaItem 简化、LevelNode camelCase
├── services/media-url.ts    ← 删除双命名兼容、嵌套解析
├── services/media-url.test.ts ← 对齐新结构
├── stores/reader-store.ts   ← MediaItem 接口对齐
└── stores/chapter-store.ts  ← LevelNode 字段对齐
```

---

## Task 1: 后端 — 扁平化文件元数据 `buildFileMetadata`

### 1.1 备份并定位目标代码

- [ ] 用 `git stash` 确保工作区干净
- [ ] 打开 `backend/src/main/java/com/nianer/comic/Service/ComicMediaService.java`
- [ ] 定位 `buildFileMetadata` 方法（约 L215–L233）

### 1.2 重写 `buildFileMetadata` 方法

**当前代码**（约 L215–L233）：

```java
private Map<String, Object> buildFileMetadata(String seriesName, String chapterPath,
        Path chapterPathResolved, String filename) throws IOException {
    String baseName = stripExtension(filename);
    boolean imageFile = isImageFile(filename);
    Path hqFile = chapterPathResolved.resolve(filename);
    String lqFilename = baseName + ".webp";
    Path lqFile = config.getLqPath().resolve(seriesName).resolve(chapterPath).resolve(lqFilename);

    Map<String, Object> fileMeta = new HashMap<>();
    fileMeta.put("name", filename);
    fileMeta.put("baseName", baseName);
    fileMeta.put("mediaType", imageFile ? "image" : "video");
    fileMeta.put("preferredSource", Files.exists(lqFile) ? "lq" : "hq");
    fileMeta.put("hq", buildHqInfo(seriesName, chapterPath, filename, hqFile));
    fileMeta.put("lq", buildLqInfo(seriesName, chapterPath, lqFilename, lqFile));
    if (!imageFile) {
        fileMeta.put("videoUrl", buildVideoUrl(seriesName, chapterPath, filename));
    }
    return fileMeta;
}
```

**替换为**（扁平化版本）：

```java
/**
 * 构建单个媒体文件的扁平展示元数据。后端预计算最优 URL：
 * 图片优先 LQ（存在时），fallback 到 HQ；视频直接指向 /video/。
 *
 * @param seriesName         漫画系列名称
 * @param chapterPath        系列内章节相对路径
 * @param chapterPathResolved 章节物理目录
 * @param filename           媒体文件名
 * @return 扁平化的文件元数据 {name, type, url, fallbackUrl}
 */
private Map<String, Object> buildFileMetadata(String seriesName, String chapterPath,
        Path chapterPathResolved, String filename) throws IOException {
    String baseName = stripExtension(filename);
    boolean imageFile = isImageFile(filename);

    Map<String, Object> fileMeta = new HashMap<>();
    fileMeta.put("name", filename);

    if (!imageFile) {
        fileMeta.put("type", "video");
        fileMeta.put("url", buildVideoUrl(seriesName, chapterPath, filename));
        fileMeta.put("fallbackUrl", null);
    } else {
        String lqFilename = baseName + ".webp";
        Path lqFile = config.getLqPath().resolve(seriesName).resolve(chapterPath).resolve(lqFilename);
        fileMeta.put("type", "image");
        if (Files.exists(lqFile)) {
            fileMeta.put("url", buildLQUrl(seriesName, chapterPath, lqFilename));
            fileMeta.put("fallbackUrl", buildHQUrl(seriesName, chapterPath, filename));
        } else {
            fileMeta.put("url", buildHQUrl(seriesName, chapterPath, filename));
            fileMeta.put("fallbackUrl", null);
        }
    }
    return fileMeta;
}
```

- [ ] 确认不再调用 `buildHqInfo` 和 `buildLqInfo`

### 1.3 删除不再使用的私有方法

- [ ] 搜索 `buildHqInfo` 的所有引用 → 确认只在 `buildFileMetadata` 中被调用
- [ ] 搜索 `buildLqInfo` 的所有引用 → 确认只在 `buildFileMetadata` 中被调用
- [ ] 删除 `buildHqInfo` 方法（~L244–L251）
- [ ] 删除 `buildLqInfo` 方法（~L262–L267）

### 1.4 验证编译

- [ ] 运行 `cd backend && ./mvnw clean compile`
- [ ] 确认编译通过，无未使用 import 警告

---

## Task 2: 后端 — 层级节点字段 camelCase 化

### 2.1 修改 `buildLevelChapterNode`

**定位** `ComicMediaService.java` 的 `buildLevelChapterNode` 方法（~L169–L183）

**改动**：
- `"path_id"` → `"pathId"`
- `"total_files"` → `"fileCount"`
- `"cover_url"` → `"coverUrl"`

```java
public Map<String, Object> buildLevelChapterNode(String seriesName, String name,
        String relativePath, ChapterPreview preview) {
    Map<String, Object> node = new HashMap<>();
    String normalizedPath = normalizePath(relativePath);
    node.put("type", "chapter");
    node.put("name", name);
    node.put("pathId", normalizedPath);       // was: path_id
    node.put("fileCount", preview.totalFiles()); // was: total_files

    Optional<String> coverFile = preview.firstImageFile();
    if (coverFile.isPresent()) {
        node.put("coverUrl", buildCoverUrl(seriesName, normalizedPath, coverFile.get())); // was: cover_url
    }
    return node;
}
```

### 2.2 修改 `buildDirectoryNode`

**定位** `ComicMediaService.java` 的 `buildDirectoryNode` 方法（~L150–L158）

**改动**：
- `"has_children"` → `"hasChildren"`

```java
public Map<String, Object> buildDirectoryNode(Path directory, String name,
        String relativePath) throws IOException {
    Map<String, Object> node = new HashMap<>();
    node.put("type", "directory");
    node.put("name", name);
    node.put("path", relativePath);
    node.put("hasChildren", hasChildDirectories(directory)); // was: has_children
    return node;
}
```

### 2.3 检查 `buildChapterData` 是否需要同步修改

- [ ] 搜索 `buildChapterData` 的所有调用点
- [ ] 如果被调用 → 同步更改 `"path_id"` → `"pathId"`, `"total_files"` → `"fileCount"`, `"cover_url"` → `"coverUrl"`
- [ ] 如果没有调用点 → 标记为待清理死代码（暂不动，避免扩范围）

### 2.4 验证编译

- [ ] 运行 `cd backend && ./mvnw clean compile`

---

## Task 3: 后端 — 运行测试确保无回归

### 3.1 定位现有测试

- [ ] 查找 `backend/src/test/` 下涉及 `ComicMediaService` 或 `ComicCatalogService` 的测试
- [ ] 检查测试是否依赖旧的 JSON 字段名（`baseName`, `mediaType`, `preferredSource`, `hq`, `lq`, `path_id` 等）

### 3.2 更新或修复测试

- [ ] 将所有测试中的旧字段名替换为新字段名
- [ ] 断言 `fileMeta.containsKey("hq")` → 改为断言 `fileMeta.containsKey("url")` 和 `fileMeta.containsKey("fallbackUrl")`
- [ ] 断言 `fileMeta.containsKey("preferredSource")` → 删除该断言

### 3.3 运行全部后端测试

- [ ] `cd backend && ./mvnw test`
- [ ] 确认全部通过

---

## Task 4: 前端 — 更新类型定义

### 4.1 简化 `MediaItem` 接口

**文件** `frontend/src/types/api.ts`

**旧定义**:
```ts
export interface MediaItem {
  name?: string
  type?: string
  mediaType?: string
  hqUrl?: string
  lqUrl?: string
  videoUrl?: string
  video_url?: string
  url?: string
  hq?: { url: string }
  lq?: { url: string }
  preferredSource?: string
  preferredUrl?: string
}
```

**新定义**:
```ts
export interface MediaItem {
  name: string
  type: 'image' | 'video'
  url: string
  fallbackUrl: string | null
}
```

### 4.2 更新 `LevelNode` 接口

**旧定义**:
```ts
export interface LevelNode {
  name: string
  type: 'directory' | 'chapter'
  path: string
  path_id: string
  totalFiles?: number
  coverUrl?: string
}
```

**新定义**:
```ts
export interface LevelNode {
  name: string
  type: 'directory' | 'chapter'
  path: string
  pathId: string
  hasChildren?: boolean   // directory 节点
  fileCount?: number       // chapter 节点
  coverUrl?: string        // chapter 节点
}
```

### 4.3 确认 `ChapterResponse` 和 `LevelResponse` 无需改动

- [ ] `ChapterResponse` = `{ path: string, files: MediaItem[], total: number }` — 不变
- [ ] `LevelResponse` = `{ path: string, nodes: LevelNode[] }` — 不变

---

## Task 5: 前端 — 简化 `media-url.ts`

### 5.1 重写 `getMediaSource`

**文件** `frontend/src/services/media-url.ts`

**当前代码**:
```ts
export function getMediaSource(media: MediaItem = {}): MediaSource {
  const mediaType = media.mediaType ?? media.type ?? 'image'
  const videoUrl = media.videoUrl ?? media.video_url ?? ''
  const hqUrl = media?.hq?.url ?? media.hqUrl ?? ''
  const lqUrl = media?.lq?.url ?? media.lqUrl ?? ''
  const preferredSource = media.preferredSource ?? (media.preferredUrl ? 'hq' : '')

  if (mediaType === 'video' || videoUrl) {
    return { url: videoUrl || hqUrl, fallbackUrl: null, kind: 'video', mediaType: 'video' }
  }

  const preferredUrl = media.preferredUrl || (preferredSource === 'hq'
    ? hqUrl || lqUrl
    : lqUrl || hqUrl)

  return {
    url: preferredUrl,
    fallbackUrl: media.preferredUrl ? null : preferredSource === 'hq' ? lqUrl || null : hqUrl || null,
    kind: 'image',
    mediaType: 'image'
  }
}
```

**新代码**（大幅简化）:
```ts
export function getMediaSource(media: MediaItem): MediaSource {
  if (media.type === 'video') {
    return { url: media.url, fallbackUrl: null, kind: 'video', mediaType: 'video' }
  }
  return {
    url: media.url,
    fallbackUrl: media.fallbackUrl,
    kind: 'image',
    mediaType: 'image'
  }
}
```

### 5.2 删除不再使用的函数参数默认值

- [ ] 移除 `getMediaSource` 的 `= {}` 默认参数（新 MediaItem 所有字段必需）

---

## Task 6: 前端 — 更新 stores

### 6.1 更新 `reader-store.ts`

**文件** `frontend/src/stores/reader-store.ts`

**旧接口**（store 内部定义）:
```ts
interface MediaItem {
  name?: string
  type?: string
  mediaType?: string
  hqUrl?: string
  lqUrl?: string
  videoUrl?: string
  url?: string
  hq?: { url: string }
  lq?: { url: string }
  preferredSource?: string
  preferredUrl?: string
}
```

**替换为**（直接从 types/api 导入）:
```ts
import type { MediaItem } from '@/types/api'
```

- [ ] 删除 store 内部的 `MediaItem` interface
- [ ] 从 `@/types/api` 导入
- [ ] 检查所有 `mediaItems` 相关逻辑是否有字段名依赖

### 6.2 更新 `chapter-store.ts`

**文件** `frontend/src/stores/chapter-store.ts`

- [ ] 检查所有 `node.path_id` → 改为 `node.pathId`
- [ ] 检查所有 `node.totalFiles` → 改为 `node.fileCount`
- [ ] 检查 `node.cover_url` → 改为 `node.coverUrl`
- [ ] 检查 `node.has_children` → 改为 `node.hasChildren`

### 6.3 搜索前端所有 snake_case 字段引用

- [ ] 在 `frontend/src/` 下搜索 `path_id`、`cover_url`、`total_files`、`has_children`、`video_url`、`hq_url`、`lq_url`
- [ ] 全部替换为 camelCase 版本
- [ ] 搜索 `preferredSource`、`baseName`、`mediaType`（文件级别）— 确认这些字段不再被前端使用后删除引用

---

## Task 7: 前端 — 更新测试

### 7.1 更新 `media-url.test.ts`

- [ ] 将测试 mock 数据改为扁平格式：`{ name, type, url, fallbackUrl }`
- [ ] 视频 case: `{ name: 'test.mp4', type: 'video', url: '/video/...', fallbackUrl: null }`
- [ ] 图片 LQ case: `{ name: 'test.jpg', type: 'image', url: '/lq_image/...', fallbackUrl: '/hq_image/...' }`
- [ ] 图片 HQ only case: `{ name: 'test.jpg', type: 'image', url: '/hq_image/...', fallbackUrl: null }`

### 7.2 检查其他测试文件

- [ ] 搜索 `chapter-store.test.ts`、`reader-store.test.ts`、`api.test.ts` 中的旧字段引用
- [ ] 全部替换

### 7.3 运行前端测试

- [ ] `cd frontend && npm test`
- [ ] 确认全部通过

### 7.4 运行前端 lint

- [ ] `cd frontend && npm run lint`
- [ ] 确保无新增 lint 错误

---

## Task 8: 集成验证

### 8.1 启动后端确认 API 返回格式

- [ ] 启动后端 `cd backend && ./mvnw spring-boot:run`
- [ ] `curl http://localhost:500/api/series` — 确认还是 `string[]`（未改）
- [ ] `curl "http://localhost:500/api/chapter/{series_name}?chapterPath=..."` — 确认 files 数组元素为 `{name, type, url, fallbackUrl}`
- [ ] `curl "http://localhost:500/api/levels/{series_name}"` — 确认 nodes 使用 `pathId`、`fileCount`、`coverUrl`、`hasChildren`

### 8.2 启动前端确认页面正常

- [ ] 启动前端 `cd frontend && npm run dev`
- [ ] 访问系列列表页 → 正常显示
- [ ] 进入目录页 → 节点正常渲染，封面正常加载
- [ ] 进入阅读页 → 图片/视频正常加载，点击翻页正常

### 8.3 Redis 缓存清理

- [ ] 清理旧格式缓存：`redis-cli KEYS "v2:*" | xargs redis-cli DEL`（或重启 Redis）
- [ ] 确认新缓存写入后格式正确

---

## 回滚方案

如果集成验证失败：

1. `git checkout -- backend/src/main/java/com/nianer/comic/Service/ComicMediaService.java`
2. `git checkout -- frontend/src/types/api.ts`
3. `git checkout -- frontend/src/services/media-url.ts`
4. `git checkout -- frontend/src/stores/`
5. `git checkout -- frontend/src/services/media-url.test.ts`
6. 清理 Redis 缓存

---

## 注意事项

- **缓存键不变**：`v2:chapter_files:*` 和 `v2:level:*` 键名不变，但值结构变了 → 旧缓存会导致前端解析失败 → **必须清理 Redis 缓存**
- **`buildChapterData` 方法**：暂时不动，确认无调用后可在后续清理
- **系列接口**：暂不增强（属方案一范围），保持 `string[]` 不变
- **后端测试**：如果当前没有 `ComicMediaService` 相关测试，Task 3 可能需要新增基础测试
