# 极简本地漫画阅读器详细设计

## 1. 系统目标

本系统是面向个人局域网使用的本地漫画阅读器，运行在本地 Windows 电脑上，漫画文件继续保存在本地目录中。系统不追求复杂漫画平台能力，而是优先保证前端体验统一、目录导航清楚、阅读页沉浸和本地文件结构稳定。

核心体验：

```text
打开应用 → 搜索或选择漫画 → 逐级进入目录 → 点击章节 → 沉浸阅读
```

设计优先级：

1. 前端体验统一。
2. 导航清楚。
3. 阅读页沉浸。
4. 本地文件结构稳定。
5. 后端只做索引和元数据。
6. 工具页独立，不干扰阅读。

## 2. 整体系统架构

```text
Windows 本地漫画目录
  ↓
Spring Boot 后端：系列索引、章节索引、媒体元数据、Redis 缓存降级、工具调度
  ↓
Nginx / Vite 静态媒体服务：/hq_image、/lq_image、/video
  ↓
极简前端阅读器：首页、目录页、阅读页、工具页
```

职责划分：

| 层 | 职责 |
|---|---|
| 文件系统 | 保存真实漫画资源 |
| Spring Boot | 扫描目录、返回索引、生成元数据 |
| Redis | 缓存目录和章节信息 |
| Nginx/Vite | 提供图片和视频静态访问 |
| 前端 | 展示、导航、阅读、进度 |
| localStorage | 阅读进度、最近阅读、UI 偏好 |
| Go 工具 | 图片压缩、叶目录首图、维护任务 |

## 3. 文件存储设计

保留现有结构：

```text
F:\games\comics
├── h_photograph
│   └── 海贼王
│       ├── 第一卷
│       │   ├── 第 001 话
│       │   │   ├── 001.jpg
│       │   │   ├── 002.jpg
│       │   │   └── 003.mp4
│       │   └── 第 002 话
│       └── 番外篇
└── l_photograph
    └── 海贼王
        ├── 第一卷
        │   ├── 第 001 话
        │   │   ├── 001.webp
        │   │   └── 002.webp
```

规则：

- `h_photograph` 是权威目录来源。
- `l_photograph` 是低质量 WebP 预览图。
- 包含媒体文件的叶目录是章节。
- 中间目录是导航节点，例如卷、篇、番外、合集。
- 文件和目录统一自然排序。
- HQ 可能存在 0 字节占位文件。
- LQ 不一定存在。
- GIF 走 `/video/`。

## 4. 后端详细设计

### 4.1 目录扫描策略

目录扫描不采用对整个系列的递归全量搜索，而是和前端的逐级导航一致，按需分级扫描。

扫描原则：

- 首页只扫描根目录下的系列列表。
- 进入某个系列后，只扫描该系列当前层级的直接子节点。
- 进入某个目录后，只扫描该目录下一层的直接子节点。
- 点击章节后，只扫描该章节目录内的媒体文件。
- 不在首次加载时递归遍历整个系列的所有章节。

推荐数据流：

```text
首页 → GET /api/series
系列页 → GET /api/levels/{series}?path=
目录页 → GET /api/levels/{series}?path=第一卷/第二卷
章节页 → GET /api/chapter/{series}?chapterPath=第一卷/第二卷/第 001 话
```

这样后端每次只处理当前用户正在浏览的层级，避免递归扫描大目录带来的启动延迟和无效 I/O。

### 4.2 模块划分

建议逐步整理为：

```text
backend/src/main/java/com/nianer/comic
├── Controller
│   ├── ComicController.java
│   └── ToolController.java
├── Service
│   ├── CatalogService.java
│   ├── ChapterService.java
│   ├── MediaMetadataService.java
│   ├── CacheService.java
│   └── ToolExecutor.java
├── Model
│   ├── SeriesDto.java
│   ├── ChapterDto.java
│   ├── MediaFileDto.java
│   └── ToolExecution.java
└── Config
```

后端短期不需要推倒重做。第一阶段可以继续保留现有控制器，只在新增或重构时把目录扫描、媒体元数据、缓存逻辑逐步移入 Service。

### 4.3 API 设计

#### 获取系列列表

```http
GET /api/series
```

返回：

```json
[
  "海贼王",
  "火影忍者",
  "电锯人"
]
```

短期保持简单，最近阅读由前端 localStorage 计算。后续如需扩展系列元数据，应保持向后兼容。

#### 获取当前层级节点

```http
GET /api/levels/{series}?path=第一卷/第二卷
```

返回当前层级的直接子节点，目录节点和章节节点混合排列：

```json
{
  "path": "第一卷/第二卷",
  "nodes": [
    {
      "type": "directory",
      "name": "番外篇",
      "path": "第一卷/第二卷/番外篇",
      "has_children": true,
      "cover_file": "001.jpg",
      "cover_source": "lq"
    },
    {
      "type": "chapter",
      "name": "第 001 话",
      "path_id": "第一卷/第二卷/第 001 话",
      "total_files": 48,
      "cover_file": "001.jpg",
      "cover_source": "lq"
    }
  ]
}
```

字段含义：

| 字段 | 说明 |
|---|---|
| `type` | `directory` 或 `chapter` |
| `path` | 当前节点完整相对路径 |
| `has_children` | 目录节点是否还有下一层 |
| `path_id` | 章节相对路径 |
| `total_files` | 媒体文件数量 |
| `cover_file` | 首张普通图片 |
| `cover_source` | `lq` 或 `hq` |

该接口是目录页核心数据源。

#### 获取章节媒体文件

当前接口：

```http
GET /api/chapter/{series}?chapterPath=第一卷/第 001 话
```

当前返回：

```json
{
  "files": ["001.jpg", "002.jpg", "003.mp4"]
}
```

后续推荐增强为返回媒体元数据，让前端只负责展示，不再猜测媒体来源。增强字段包括：`name`、`baseName`、`mediaType`、`preferredSource`、`hq.exists`、`hq.size`、`hq.url`、`lq.exists`、`lq.url`、`video.url`。

### 4.4 缓存设计

当前缓存键：

```text
series_list
chapters_list:{series}
chapter_files:{series}:{chapter}
```

未来建议引入版本前缀，并把缓存粒度和当前浏览层级绑定：

```text
v2:series:list
v2:level:{series}:{path}
v2:chapter-media:{series}:{chapter}
```

其中 `level` 缓存只保存当前层级的直接子节点，不保存整个系列的递归树。

这样接口结构变更后，不会被旧缓存污染。

## 5. 前端详细设计

### 5.1 目标模块结构

```text
frontend/js
├── app
│   ├── App.js
│   ├── router.js
│   └── layout.js
├── features
│   ├── library
│   │   ├── SeriesList.js
│   │   └── SeriesSearch.js
│   ├── directory
│   │   ├── DirectoryView.js
│   │   ├── DirectoryNode.js
│   │   ├── ChapterCard.js
│   │   └── CoverLoader.js
│   ├── reader
│   │   ├── Reader.js
│   │   ├── ReaderControls.js
│   │   ├── LazyMediaLoader.js
│   │   └── ProgressOverlay.js
│   └── tools
├── services
│   ├── catalog-api.js
│   ├── media-url.js
│   ├── storage.js
│   └── tools-api.js
├── state
│   ├── app-store.js
│   └── progress-store.js
├── ui
│   ├── button.js
│   ├── card.js
│   ├── cover.js
│   ├── loading.js
│   └── empty-state.js
└── utils
```

该结构是演进目标，不要求一次性迁移。短期可以在现有结构中先完成视觉和导航体验，再逐步移动模块。

### 5.2 前端目录数据模型

按需分级扫描后，前端不再要求一次性持有完整 `flatList`、完整 `tree` 和全局 `currentIndex`。目录状态改为围绕当前层级组织：

```js
{
  currentSeries: '海贼王',
  currentPath: '第一卷',
  levelNodes: [
    { type: 'directory', name: '番外篇', path: '第一卷/番外篇' },
    { type: 'chapter', name: '第 001 话', pathId: '第一卷/第 001 话' }
  ],
  cachedLevels: {
    '': [],
    '第一卷': []
  },
  currentChapter: {
    pathId: '第一卷/第 001 话'
  }
}
```

上一话和下一话不再通过 `currentIndex ± 1` 计算，而应由后端在章节详情中返回相邻章节路径，或由前端在已访问层级缓存中懒构建导航关系。阅读进度键也应优先使用 `series + chapterPath`，避免依赖全量列表索引。

## 6. 页面详细设计

### 6.1 首页：极简系列入口

首页只负责选漫画。

```text
漫画阅读器

[搜索漫画]

火影忍者              读到第 35 话
海贼王
电锯人
咒术回战
...
```

规则：

- 不做封面墙。
- 不放工具入口。
- 不放分类、标签、统计。
- 搜索只过滤漫画名。
- 最近阅读只在对应系列右侧轻量显示。
- 点击系列进入目录页。

首页状态：

```js
{
  seriesList: [],
  searchKeyword: '',
  lastReadingMap: {
    '火影忍者': {
      chapterPath: '第一部/第 035 话',
      page: 12,
      totalPages: 48
    }
  }
}
```

### 6.2 目录页：逐级目录浏览

章节不使用树形展开，而是采用逐级进入。每一页只展示当前层级节点。目录页的数据不是一次性构建整棵树，而是随着用户进入不同层级按需请求对应层级节点。

系列根目录：

```text
< 返回上一级
海贼王

第一卷        >
第二卷        >
番外篇        >
```

点击第一卷后：

```text
< 海贼王
第一卷

第 001 话    [章节卡片]
第 002 话    [章节卡片]
番外篇        >
第 003 话    [章节卡片]
```

当前层级展示规则：

- 不分目录区和章节区。
- 所有节点混合展示。
- 按名称自然排序。
- 目录节点显示为列表项，右侧有进入提示。
- 叶子章节显示为横向首图卡片。

#### 目录节点

形式：

```text
第一卷        >
```

#### 章节卡片

横向首图卡片：

```text
[首图] 第 001 话
       48 页 · 读到 12 / 48
```

完整形式：

```text
[首图] 第 001 话
       48 页 · 读到 12 / 48
       第一卷 / 第 001 话
```

章节节点模型：

```js
{
  type: 'chapter',
  name: '第 001 话',
  pathId: '第一卷/第 001 话',
  totalFiles: 48,
  coverFile: '001.jpg',
  coverSource: 'lq',
  progress: {
    page: 12,
    totalPages: 48,
    status: 'reading'
  }
}
```

阅读状态：

| 状态 | 显示 |
|---|---|
| 未读 | `48 页` |
| 阅读中 | `读到 12 / 48` |
| 已读完 | `已读完` |
| 当前章节 | 轻微高亮 |

### 6.3 阅读页：沉浸阅读

默认状态：

```text
[图片]
[图片]
[图片]

底部：12 / 48
右下角：⋯
```

轻触后显示控制层：

```text
上一话
下一话
返回目录
回到顶部
隐藏按钮
```

规则：

- 图片和视频纵向排列。
- 控制层默认隐藏。
- 底部进度胶囊常驻但低干扰。
- 支持上一话和下一话。
- 返回目录时保持当前路径并高亮章节。
- 保留双击 LQ 切 HQ。
- 保留懒加载和错误重试。

阅读页状态：

```js
{
  series: '海贼王',
  chapterPath: '第一卷/第 001 话',
  files: [],
  currentPage: 12,
  totalPages: 48,
  controlsVisible: false,
  returnPath: '第一卷'
}
```

## 7. 路由设计

推荐保留 URL 驱动，这样刷新页面不会丢失位置。

```text
/                                首页
/series/{series}                 系列根目录
/series/{series}/dir/{path}      当前目录层级
/series/{series}/read/{path}     阅读章节
```

示例：

```text
/series/海贼王
/series/海贼王/dir/第一卷
/series/海贼王/read/第一卷/第 001 话
```

注意：

- URL 构建必须按路径段编码。
- 不能整体 `encodeURIComponent(chapterPath)`。
- 返回目录时根据 `chapterPath` 计算父目录。

## 8. 状态与持久化设计

localStorage 建议保存：

```js
{
  lastReading: {
    series: '海贼王',
    chapterPath: '第一卷/第 001 话',
    page: 12,
    totalPages: 48,
    scrollPercent: 0.35,
    updatedAt: 1710000000000
  },

  progress: {
    '海贼王::第一卷/第 001 话': {
      page: 12,
      totalPages: 48,
      scrollPercent: 0.35,
      updatedAt: 1710000000000
    }
  },

  ui: {
    readerControlsHidden: false
  }
}
```

建议未来把进度键从 `chapterIndex` 逐步迁移到 `chapterPath`，因为路径比索引更稳定。

## 9. 媒体加载设计

### 9.1 章节封面加载

```text
chapter.cover_file + cover_source
→ buildLQImageUrl / buildHQImageUrl
→ IntersectionObserver 懒加载
→ 加载失败显示无预览
```

### 9.2 阅读器图片加载

```text
cover_source = lq
→ 优先 LQ
→ LQ 失败回退 HQ

cover_source = hq
→ 直接 HQ

视频/GIF
→ /video/
```

### 9.3 双击 HQ

```text
当前图片来自 /lq_image/
→ 双击
→ HEAD /hq_image/
→ content-length > 0
→ 切换 HQ
```

如果 `content-length = 0`，说明 HQ 是占位文件，不切换。

## 10. 视觉设计

整体风格：安静、克制、阅读优先。

建议 token：

```css
:root {
  --color-bg: #0f1115;
  --color-surface: #171a21;
  --color-surface-soft: #20242d;
  --color-text: #f1f3f5;
  --color-text-muted: #9aa3af;
  --color-border: rgba(255, 255, 255, 0.08);
  --color-accent: #8ea4ff;

  --radius-card: 16px;
  --radius-cover: 8px;
  --radius-button: 999px;

  --space-page: 16px;
  --reader-max-width: 960px;
}
```

原则：

- 首页列表紧凑。
- 目录页小封面，不做大卡片瀑布。
- 阅读页背景深色，图片居中。
- 控制按钮半透明。
- 动画短，不抢注意力。

## 11. 工具页设计

工具页继续独立：

```text
/tools.html
```

规则：

- 不进入首页导航。
- 不进入目录页。
- 不进入阅读页控制层。
- 只作为维护入口。
- 视觉 token 和主站统一。

## 12. 分阶段实施

### Phase 1：首页和视觉 token

- 统一 CSS 变量。
- 首页改成极简系列列表。
- 搜索样式统一。
- 系列右侧显示最近阅读提示。

### Phase 2：目录页

- 将 `chapter-tree.js` 从“整棵树构建器”改为“当前层级节点整理器”或按需请求缓存层。
- 当前层级混合展示目录和章节。
- 章节改为横向首图卡片。
- 增加阅读进度显示。
- 返回目录时高亮当前章节。
- 页面切换时只请求当前层级所需数据，不递归预取整系列。

### Phase 3：阅读页

- 控制层默认隐藏。
- 统一进度胶囊。
- 优化上一话、下一话、返回目录。
- 保留双击 HQ。

### Phase 4：后端元数据增强

- 扩展 `/api/chapter`。
- 增加媒体类型、HQ/LQ 状态、优先来源。
- 引入 `v2:*` Redis 键。

### Phase 5：模块整理

- 拆分 `api.js`。
- 拆分 `reader.js`。
- 抽出 `ChapterCard`、`DirectoryNode`、`CoverLoader`。
- 增加测试。

## 13. 关键风险

| 风险 | 处理 |
|---|---|
| 中文路径编码错误 | 统一由 `media-url.js` 处理 |
| HQ 空白占位 | `content-length = 0` 视为不可用 |
| LQ 缺失 | `/lq_image` 204 后回退 HQ |
| Redis 旧缓存污染 | 后续使用 `v2:*` 缓存键 |
| 前端重构过大 | 分阶段改，不一次迁移所有模块 |
| 封面请求竞态 | 封面加载器统一管理 token 或 AbortController |
| 阅读进度不稳定 | 优先使用 `chapterPath` 而不是 `chapterIndex` |
| 递归全量扫描过慢 | 只做当前层级按需扫描，避免整系列预扫描 |

## 14. 最终结论

详细设计方向是：

```text
首页极简选漫画
目录逐级找章节
章节横向首图卡片
阅读页沉浸少控制
文件系统继续做事实源
后端逐步增强媒体元数据
前端逐步模块化和视觉统一
```
