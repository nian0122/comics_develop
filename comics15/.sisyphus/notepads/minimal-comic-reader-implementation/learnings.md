# Minimal Comic Reader Implementation - Learnings

## 2026-05-07 - Task 1.2: 首页添加最近阅读提示

### 实现要点
- localStorage key 格式：`lastReading_${seriesName}`，简洁明了
- storage.js 方法命名：`getSeriesLastReading` 和 `saveSeriesLastReading`，遵循现有命名约定
- 显示格式："读到第 X/Y 页"，只有 page > 0 时才显示
- CSS 使用 `var(--text-secondary)` 而非 `var(--color-text-muted)`（项目实际变量名）

### 关键发现
- storage.js 和 persistence.js 是不同模块：
  - storage.js: localStorage 封装，通用存储
  - persistence.js: 阅读进度、当前位置等特定持久化
- progressState 管理阅读器进度状态：
  - `currentPage`: 当前页码
  - `totalPages`: 总页数
  - `saveToStorage()` 已自动保存章节进度
- series-view.js 使用模板字符串渲染列表，可灵活添加元素
- CSS 变量使用 `var(--text-secondary)` 表示次要文本，非 `--color-text-muted`

### 测试验证
- `npm test` 全部通过（148 个测试）
- LSP diagnostics 无错误
- 新功能不影响现有测试

### 代码位置
- storage.js: 新增方法在 `getSeriesProgress` 之后
- series-view.js: 导入 storage，renderList 中使用 `getSeriesLastReading`
- main.js: 导入 progressState 和 storage，`onPageChanged` 中调用 `saveSeriesLastReading`
- components.css: `.series-reading-hint` 样式在 `.row-chevron` 之后
## 2026-05-07 - Task 2.2: 前端 API 服务添加层级请求方法

### 实现要点
- 新增方法命名：getLevelNodes，遵循现有命名约定
- URL 编码：seriesName 和 path 都必须 encodeURIComponent
- 路径参数构建：使用条件判断构建查询字符串，空路径不添加 ?path=
- 错误处理：与现有方法保持一致，使用 ApiError 抛出错误
- 测试覆盖：至少测试 root path 和 specific path 两种场景

### 关键发现
- api.js 方法风格：大多数方法没有 JSDoc 注释，只有 checkLQImageExists 有简短注释
- 项目约定：新增方法应遵循现有风格，避免添加不必要的 JSDoc
- 测试结构：每个 describe 块独立，使用 beforeEach/afterEach 设置全局 fetch mock
- 中文编码验证：测试中检查 encodeURIComponent 是否正确编码中文字符

### 测试验证
- npm test 全部通过（151 个测试，从 21 个增加到 24 个 api 测试）
- 新增 3 个测试：root path、specific path、失败场景

### 代码位置
- api.js: 新增方法在 resolveImageUrl 之后，作为最后一个方法
- api.test.js: 新增 describe 块在文件末尾，与其他测试保持一致结构

## 2026-05-08 - Task 2.1: 后端新增按需层级扫描 API

### 实现要点
- 新增 `GET /api/levels/{seriesName}`，返回 `{path, nodes}`，`path` 先按要求使用 `URLDecoder.decode(..., StandardCharsets.UTF_8)`。
- 缓存键使用 `v2:level:{series}:{path}`，仍受 `RedisValidator.REDIS_ENABLED` 控制；Redis 关闭时直接文件系统扫描。
- 层级扫描只读取当前目录直接子目录：包含媒体文件的目录返回 `chapter`，否则返回 `directory`。
- `chapter.total_files` 在新 API 中是数字，与旧 `/api/chapters/{series}` 的字符串保持隔离。
- 章节封面继续复用 `listSupportedMediaFiles`、`isImageFile`、`resolveCoverSource`；目录节点当前只返回 `has_children`，不递归挑封面。

### 测试验证
- `./mvnw -Dtest=ComicControllerTest test` 通过：6 个测试，0 失败。
- `./mvnw test` 通过：7 个测试，0 失败。
- LSP diagnostics 无法运行：本机缺少 `jdtls` 命令，已用 Maven 编译/测试覆盖验证。

### 代码位置
- `ComicController.java`: 新增 `listLevelNodes` 及 `scanLevelNodes`、`buildDirectoryNode`、`buildLevelChapterNode` 等 helper，插入在章节文件 API 后。
- `ComicControllerTest.java`: 新增根层级混合节点测试和编码子路径测试。

## 2026-05-08 - Task 2.3: 目录页改用按需层级请求

### 实现要点
- store.js 添加 `levelCache: new Map()` 状态和 `setLevelCache/getLevelCache/clearLevelCache` 方法
- directory-view.js 移除从 `store.chapters.tree` 预构建章节树的依赖
- `renderDirectory(path)` 改为异步方法，先检查缓存，不存在则调用 `api.getLevelNodes()`
- 新增 `renderDirectoryLoading/Error` 处理加载和错误状态
- 新增 `renderChapterCardV2()` 渲染新章节卡片，使用 `path_id` 而非 `flatIndex`
- chapter-meta-cache.js 添加 `pathIdCache` 和 `getOrFetchByPathId()` 方法支持 path_id 缓存
- main.js `selectSeries()` 添加 `clearLevelCache()`，更新 `onOpenChapter` 回调使用 `pathId`
- CSS 添加 `.chapter-card-v2` 样式，横向布局，响应式适配

### 关键发现
- 保持 `chapter-tree.js` 不删除（其他功能依赖），但实际目录视图不再使用
- 使用 `path_id` 替代 `flatIndex` 进行章节标识，与后端 API 一致
- 缓存按路径键值存储，支持层级导航缓存，切换系列时清理
- 章节卡片封面懒加载与原有系统兼容，使用 `data-cover-path` 替代 `data-cover-index`

### 测试验证
- `npm test` - 151 个测试全部通过
- `npm run build` - 构建成功，36 模块转换完成

### 代码位置
- store.js: 添加 levelCache 相关状态和方法在文件底部
- directory-view.js: 全面重构 renderDirectory 为异步，添加新渲染方法
- chapter-meta-cache.js: 添加 pathIdCache 和 getOrFetchByPathId 方法
- main.js: selectSeries 添加 clearLevelCache，更新 DirectoryView 回调
- components.css: .chapter-card-v2 样式在 .chapter-card 之后

## Service Module Refactoring (Task 5.1)

**Date**: 2026-05-08

**Changes**:
- Created `catalog-api.js` with ApiError and directory-related APIs (getSeries, getLevelNodes, getChapterFiles)
- Created `media-url.js` with URL building utilities (buildLQImageUrl, buildHQImageUrl, buildVideoUrl, etc.)
- Updated `index.js` to export new modules while maintaining backward-compatible `api` object
- All 151 tests passed, no functionality broken

**Key Decisions**:
1. Kept `api.js` as compatibility layer (not deleted)
2. Used spread operator in `index.js` to merge `catalogApi` and `mediaUrl` into `api` object
3. Preserved all imports (MAX_IMAGES_TO_FETCH) and function signatures
4. Module comments added to clarify responsibilities (necessary for maintainability)

**Verification**:
- `npm test` passes (23 test files, 151 tests)
- `api` object exports 12 methods: catalog + media functions
- Backward compatibility verified via node import check

**Impact**: Zero breaking changes - existing code using `api` continues to work


## 2026-05-08 Vite dev server EACCES
-  的根因是 Windows TCP excluded port range 包含 2966-3065，3000 被系统保留，不是普通端口占用。
- 修复：frontend/vite.config.js dev server 绑定 ，默认端口改为 ，并支持  覆盖。
- 验证： 通过； 151 tests passed；Vite 能在  监听。

## 2026-05-08 - Vite dev server EACCES
- listen EACCES on ::1:3000 was caused by Windows TCP excluded port range 2966-3065 including port 3000, not a normal occupied-port conflict.
- Fixed frontend/vite.config.js by binding dev server to 127.0.0.1 and using default dev port 5173, with VITE_DEV_PORT override support.
- Verification: npm run build passed; npm test passed with 151 tests; Vite successfully listened on 127.0.0.1:5173 during manual check.
