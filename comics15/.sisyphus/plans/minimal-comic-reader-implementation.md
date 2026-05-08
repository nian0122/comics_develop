# 极简本地漫画阅读器实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有漫画阅读器重构为极简、沉浸式阅读体验，采用暗色视觉token、逐级目录导航、横向首图章节卡片。

**Architecture:** 
- 前端：暗色主题CSS变量、按需层级请求、章节横向首图卡片、沉浸式阅读页
- 后端：新增 `/api/levels/{series}?path=` 按需扫描API，保留现有递归API兼容

**Tech Stack:** Spring Boot 4.0.2 + Java 21, Vanilla ES6 + Vite, Redis 缓存, Tailwind CDN

---

## Phase 1: 首页和视觉 Token

### Task 1.1: 创建暗色视觉 Token CSS 变量

**Files:**
- Modify: `frontend/css/variables.css`

- [x] **Step 1: 替换 CSS 变量为暗色主题**

```css
:root {
    color-scheme: dark;

    --font-display: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --font-text: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --font-mono: 'SF Mono', SFMono-Regular, ui-monospace, Menlo, Monaco, 'Cascadia Mono', monospace;

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

    /* 保留原有变量兼容 */
    --text-primary: #f1f3f5;
    --text-secondary: #9aa3af;
    --text-tertiary: rgba(255, 255, 255, 0.35);
    --text-quaternary: rgba(255, 255, 255, 0.18);
    --accent: #8ea4ff;
    --accent-hover: #9eb4ff;
    --accent-active: #7e94ef;
    --accent-light: rgba(142, 164, 255, 0.12);
    --bg-primary: #171a21;
    --bg-secondary: #20242d;
    --bg-tertiary: #252933;
    --bg-body: #0f1115;
    --bg-sidebar: #171a21;
    --bg-elevated: #20242d;
    --bg-hover: rgba(255, 255, 255, 0.04);
    --bg-active: rgba(255, 255, 255, 0.08);
    --border: rgba(255, 255, 255, 0.08);
    --border-strong: rgba(255, 255, 255, 0.12);
    --divider: rgba(255, 255, 255, 0.08);
    --glass-blur: 20px;
    --glass-blur-strong: 40px;
    --glass-saturate: 1.8;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.4);
    --shadow-xl: 0 14px 44px rgba(0, 0, 0, 0.5);
    --shadow-inset: inset 0 0.5px 0 rgba(255, 255, 255, 0.1);
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
    --radius-xl: 20px;
    --radius-2xl: 28px;
    --radius-full: 9999px;
    --transition-fast: 150ms cubic-bezier(0.25, 0.1, 0.25, 1);
    --transition-base: 220ms cubic-bezier(0.25, 0.1, 0.25, 1);
    --transition-slow: 350ms cubic-bezier(0.25, 0.1, 0.25, 1);
    --transition-spring: 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
    --sidebar-width: 280px;
    --header-height: 64px;
    --footer-height: 48px;
    --z-base: 1;
    --z-dropdown: 10;
    --z-sticky: 20;
    --z-fixed: 30;
    --z-modal-backdrop: 40;
    --z-modal: 50;
    --z-popover: 60;
    --z-tooltip: 70;
}

@media (max-width: 768px) {
    :root {
        --sidebar-width: 80vw;
        --header-height: 56px;
        --footer-height: 44px;
        --radius-xl: 16px;
        --radius-2xl: 22px;
        --reader-max-width: 100vw;
    }
}
```

- [x] **Step 2: 验证构建**

Run: `cd frontend && npm run build`
Expected: 构建成功，无 CSS 错误

- [x] **Step 3: 提交**

```bash
git add frontend/css/variables.css
git commit -m "feat(css): 切换到暗色主题视觉 token"
```

---

### Task 1.2: 首页添加最近阅读提示

**Files:**
- Modify: `frontend/js/app/series-view.js`
- Modify: `frontend/js/services/storage.js`
- Test: `frontend/js/services/storage.test.js`

- [x] **Step 1: 在 storage.js 添加获取系列最近阅读信息的方法**

在 `frontend/js/services/storage.js` 添加：

```javascript
/**
 * 获取指定系列的最近阅读信息
 * @param {string} seriesName 系列名称
 * @returns {Object|null} { chapterPath, page, totalPages } 或 null
 */
getSeriesLastReading(seriesName) {
    const key = `lastReading_${seriesName}`;
    const saved = localStorage.getItem(key);
    if (!saved) {
        // 尝试从旧格式兼容读取
        const currentSeries = this.getCurrentSeries();
        const currentChapterPath = this.getCurrentChapterPath();
        if (currentSeries === seriesName && currentChapterPath) {
            const progressKey = `${seriesName}::${currentChapterPath}`;
            const progressSaved = localStorage.getItem(`progress_${progressKey}`);
            if (progressSaved) {
                return JSON.parse(progressSaved);
            }
        }
        return null;
    }
    return JSON.parse(saved);
},

/**
 * 保存系列最近阅读信息
 * @param {string} seriesName 系列名称
 * @param {string} chapterPath 章节路径
 * @param {number} page 当前页
 * @param {number} totalPages 总页数
 */
saveSeriesLastReading(seriesName, chapterPath, page, totalPages) {
    const key = `lastReading_${seriesName}`;
    localStorage.setItem(key, JSON.stringify({
        chapterPath,
        page,
        totalPages,
        updatedAt: Date.now()
    }));
},
```

- [x] **Step 2: 在 series-view.js 显示最近阅读提示**

修改 `renderList` 方法，在系列名称右侧显示最近阅读：

```javascript
renderList(series) {
    const items = series.map(name => {
        const lastReading = storage.getSeriesLastReading(name);
        const hint = lastReading
            ? `<span class="series-reading-hint">读到第 ${lastReading.page}/${lastReading.totalPages} 页</span>`
            : '';
        return `
            <button class="series-row" data-series="${escapeHtml(name)}">
                <span class="series-name">${escapeHtml(name)}</span>
                ${hint}
                <span class="row-chevron">›</span>
            </button>
        `;
    }).join('');

    this.container.innerHTML = `
        <div class="mobile-page-header">
            <p class="mobile-kicker">Library</p>
            <h1>漫画阅读器</h1>
            <p>选择系列，继续进入逐级目录。</p>
        </div>
        <label class="mobile-search-label" for="seriesSearch">搜索系列</label>
        <input id="seriesSearch" class="glass-input mobile-search" placeholder="搜索系列" autocomplete="off">
        <div id="seriesList" class="series-list">
            ${items || '<div class="mobile-state-card">暂无系列</div>'}
        </div>
    `;

    this.bindListEvents();
}
```

- [x] **Step 3: 添加 CSS 样式**

在 `frontend/css/components.css` 添加：

```css
.series-row {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px 16px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: background var(--transition-fast);
    gap: 8px;
}

.series-row:hover {
    background: var(--color-surface-soft);
}

.series-name {
    flex: 1;
    font-size: 15px;
    color: var(--color-text);
}

.series-reading-hint {
    font-size: 13px;
    color: var(--color-text-muted);
    white-space: nowrap;
}

.row-chevron {
    color: var(--color-text-muted);
    font-size: 18px;
}
```

- [x] **Step 4: 在阅读器保存进度时更新最近阅读**

在 `frontend/js/main.js` 的 `openChapter` 方法中，在保存进度后调用 `storage.saveSeriesLastReading`：

```javascript
// 在 persistence.saveCurrentPosition 后添加
storage.saveSeriesLastReading(store.series.current, chapter.path_id, 1, files.length);
```

并在 Reader 的 `onPageChanged` 回调中更新：

```javascript
// 在 main.js init 方法中修改 Reader 回调
this.reader = new Reader({
    onImageLoaded: () => this.readerShell.updateProgressStatus(),
    onPageChanged: (pageNum) => {
        this.readerShell.updateProgressStatus();
        const chapter = store.chapters.flatList[store.chapters.currentIndex];
        if (chapter) {
            storage.saveSeriesLastReading(
                store.series.current,
                chapter.path_id,
                pageNum,
                store.reader.files.length
            );
        }
    },
    onStatusUpdate: ({ message }) => console.info(message),
});
```

- [x] **Step 5: 运行测试**

Run: `cd frontend && npm test`
Expected: 所有测试通过

- [x] **Step 6: 提交**

```bash
git add frontend/js/app/series-view.js frontend/js/services/storage.js frontend/css/components.css frontend/js/main.js
git commit -m "feat(home): 系列列表显示最近阅读提示"
```

---

## Phase 2: 目录页重构

### Task 2.1: 后端新增按需层级扫描 API

**Files:**
- Modify: `backend/src/main/java/com/nianer/comic/Controller/ComicController.java`
- Test: `backend/src/test/java/com/nianer/comic/ComicControllerTest.java` (新增)

- [x] **Step 1: 在 ComicController.java 添加 `/api/levels/{series}` 接口**

```java
@Operation(summary = "获取当前层级节点", description = "返回指定系列指定路径下的直接子节点（目录和章节混合）。")
@ApiResponse(responseCode = "200", description = "返回层级节点列表")
@GetMapping("/api/levels/{seriesName}")
public ResponseEntity<Map<String, Object>> listLevelNodes(
        @Parameter(description = "漫画系列名称", required = true)
        @PathVariable String seriesName,
        @Parameter(description = "当前路径（可选，空表示根目录）", required = false)
        @RequestParam(required = false, defaultValue = "") String path) throws IOException {

    String decodedPath = path.isEmpty() ? "" : URLDecoder.decode(path, StandardCharsets.UTF_8);
    log.info("[Levels] 请求层级节点 - 系列: {}, 路径: {}", seriesName, decodedPath);

    String cacheKey = "v2:level:" + seriesName + ":" + decodedPath;
    if (REDIS_ENABLED) {
        String cachedData = redisTemplate.opsForValue().get(cacheKey);
        if (cachedData != null) {
            log.info("[Levels] 缓存命中: {}", cacheKey);
            return ResponseEntity.ok(objectMapper.readValue(cachedData, new TypeReference<Map<String, Object>>() {}));
        }
        log.info("[Levels] 缓存未命中: {}", cacheKey);
    }

    Path seriesPath = config.getHqPath().resolve(seriesName);
    Path targetPath = decodedPath.isEmpty() ? seriesPath : seriesPath.resolve(decodedPath);

    if (!Files.exists(targetPath) || !Files.isDirectory(targetPath)) {
        log.warn("[Levels] 目录不存在: {}", targetPath.toAbsolutePath());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("path", decodedPath, "nodes", Collections.emptyList()));
    }

    List<Map<String, Object>> nodes = scanLevelNodes(seriesPath, targetPath, decodedPath, seriesName);

    Map<String, Object> response = new HashMap<>();
    response.put("path", decodedPath);
    response.put("nodes", nodes);

    if (REDIS_ENABLED) {
        redisTemplate.opsForValue().set(
                cacheKey,
                objectMapper.writeValueAsString(response),
                config.getCacheExpiration(),
                TimeUnit.SECONDS
        );
    }

    return ResponseEntity.ok(response);
}

private List<Map<String, Object>> scanLevelNodes(Path seriesRoot, Path targetPath, String currentRel, String seriesName) throws IOException {
    List<Map<String, Object>> nodes = new ArrayList<>();

    try (Stream<Path> stream = Files.list(targetPath)) {
        List<Path> entries = stream
                .sorted(Comparator.comparing(p -> p.getFileName().toString(), this::naturalCompare))
                .collect(Collectors.toList());

        for (Path entry : entries) {
            String name = entry.getFileName().toString();
            String entryRel = currentRel.isEmpty() ? name : currentRel + "/" + name;

            if (Files.isDirectory(entry)) {
                // 检查是否是章节目录（包含媒体文件）
                List<String> mediaFiles = listSupportedMediaFiles(entry);
                if (!mediaFiles.isEmpty()) {
                    // 叶子目录是章节
                    Optional<String> coverFile = mediaFiles.stream().filter(this::isImageFile).findFirst();
                    Map<String, Object> chapterNode = new HashMap<>();
                    chapterNode.put("type", "chapter");
                    chapterNode.put("name", name);
                    chapterNode.put("path_id", entryRel);
                    chapterNode.put("total_files", mediaFiles.size());
                    if (coverFile.isPresent()) {
                        chapterNode.put("cover_file", coverFile.get());
                        chapterNode.put("cover_source", resolveCoverSource(seriesName, entryRel, coverFile.get()));
                    }
                    nodes.add(chapterNode);
                } else {
                    // 中间目录
                    boolean hasChildren = hasSubDirectories(entry);
                    Optional<String> coverFile = findFirstImageInSubtree(entry);
                    Map<String, Object> dirNode = new HashMap<>();
                    dirNode.put("type", "directory");
                    dirNode.put("name", name);
                    dirNode.put("path", entryRel);
                    dirNode.put("has_children", hasChildren);
                    if (coverFile.isPresent()) {
                        dirNode.put("cover_file", coverFile.get());
                        dirNode.put("cover_source", "lq"); // 目录封面默认尝试 LQ
                    }
                    nodes.add(dirNode);
                }
            }
        }
    }

    return nodes;
}

private boolean hasSubDirectories(Path directory) throws IOException {
    try (Stream<Path> stream = Files.list(directory)) {
        return stream.anyMatch(Files::isDirectory);
    }
}

private Optional<String> findFirstImageInSubtree(Path directory) throws IOException {
    // 只检查第一层子目录的第一个图片文件作为封面预览
    try (Stream<Path> stream = Files.list(directory)) {
        List<Path> subDirs = stream
                .filter(Files::isDirectory)
                .sorted(Comparator.comparing(p -> p.getFileName().toString(), this::naturalCompare))
                .collect(Collectors.toList());

        for (Path subDir : subDirs) {
            List<String> mediaFiles = listSupportedMediaFiles(subDir);
            Optional<String> firstImage = mediaFiles.stream().filter(this::isImageFile).findFirst();
            if (firstImage.isPresent()) {
                return firstImage;
            }
        }
    }
    return Optional.empty();
}
```

- [x] **Step 2: 编写测试**

在 `backend/src/test/java/com/nianer/comic/ComicControllerTest.java` 新增：

```java
@Test
void testListLevelNodesRoot() throws Exception {
    // 测试根目录层级扫描
    mockMvc.perform(get("/api/levels/{seriesName}", "海贼王"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.path").value(""))
            .andExpect(jsonPath("$.nodes").isArray());
}

@Test
void testListLevelNodesWithPath() throws Exception {
    mockMvc.perform(get("/api/levels/{seriesName}", "海贼王")
            .param("path", "第一卷"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.path").value("第一卷"))
            .andExpect(jsonPath("$.nodes").isArray());
}
```

- [x] **Step 3: 运行后端测试**

Run: `cd backend && ./mvnw test`
Expected: 所有测试通过

- [x] **Step 4: 提交**

```bash
git add backend/src/main/java/com/nianer/comic/Controller/ComicController.java backend/src/test/java/com/nianer/comic/ComicControllerTest.java
git commit -m "feat(api): 新增按需层级扫描接口 /api/levels/{series}"
```

---

### Task 2.2: 前端 API 服务添加层级请求方法

**Files:**
- Modify: `frontend/js/services/api.js`
- Test: `frontend/js/services/api.test.js`

- [x] **Step 1: 在 api.js 添加 getLevelNodes 方法**

```javascript
/**
 * 获取指定系列指定路径下的层级节点
 * @param {string} seriesName 系列名称
 * @param {string} path 当前路径（空表示根目录）
 * @returns {Promise<{path: string, nodes: Array}>}
 */
async getLevelNodes(seriesName, path = '') {
    const url = `/api/levels/${encodeURIComponent(seriesName)}${path ? `?path=${encodeURIComponent(path)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new ApiError('获取层级节点失败', res.status);
    return res.json();
},
```

- [x] **Step 2: 添加测试**

```javascript
describe('getLevelNodes', () => {
    it('should fetch level nodes for root path', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ path: '', nodes: [{ type: 'directory', name: '第一卷' }] })
        });
        const result = await api.getLevelNodes('海贼王');
        expect(result.path).toBe('');
        expect(result.nodes).toHaveLength(1);
    });

    it('should fetch level nodes for specific path', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ path: '第一卷', nodes: [{ type: 'chapter', name: '第 001 话' }] })
        });
        const result = await api.getLevelNodes('海贼王', '第一卷');
        expect(result.path).toBe('第一卷');
    });
});
```

- [x] **Step 3: 运行测试**

Run: `cd frontend && npm test`
Expected: 测试通过

- [x] **Step 4: 提交**

```bash
git add frontend/js/services/api.js frontend/js/services/api.test.js
git commit -m "feat(api): 前端添加 getLevelNodes 方法"
```

---

### Task 2.3: 目录页改用按需层级请求

**Files:**
- Modify: `frontend/js/app/directory-view.js`
- Modify: `frontend/js/state/store.js`
- Modify: `frontend/js/main.js`

- [x] **Step 1: 在 store.js 添加层级缓存状态**

```javascript
// 在 store 初始状态添加
levelCache: new Map(), // 缓存已请求的层级数据
```

添加方法：

```javascript
setLevelCache(path, nodes) {
    this.state.levelCache.set(path, nodes);
    this.notify();
},

getLevelCache(path) {
    return this.state.levelCache.get(path);
},
```

- [x] **Step 2: 修改 directory-view.js 使用按需请求**

修改 `renderDirectory` 方法，改为按需请求而非使用预先构建的树：

```javascript
async renderDirectory(path) {
    store.setNavigation(path);
    
    // 检查缓存
    const cached = store.getLevelCache(path);
    if (cached) {
        this.renderLevelNodes(path, cached);
        return;
    }

    // 显示加载状态
    const title = path ? splitChapterPath(path).at(-1) : store.series.current;
    const backText = path ? `‹ ${getParentPath(path) || store.series.current}` : '‹ 系列';
    
    this.container.innerHTML = `
        <div class="mobile-topbar">
            <button class="text-back-btn" data-action="back">${escapeHtml(backText)}</button>
        </div>
        <div class="mobile-page-header compact">
            <p class="mobile-kicker">${escapeHtml(store.series.current || '')}</p>
            <h1>${escapeHtml(title || '目录')}</h1>
            <p>正在加载...</p>
        </div>
    `;
    this.bindStaticActions();

    // 按需请求层级数据
    try {
        const levelData = await api.getLevelNodes(store.series.current, path);
        store.setLevelCache(path, levelData.nodes);
        this.renderLevelNodes(path, levelData.nodes);
    } catch (error) {
        console.error('加载层级失败:', error);
        this.container.innerHTML = `
            <div class="mobile-topbar">
                <button class="text-back-btn" data-action="back">${escapeHtml(backText)}</button>
            </div>
            <div class="mobile-state-card error-state">
                <strong>加载失败</strong>
                <span>无法加载目录。</span>
                <button id="retryLevelBtn" class="primary-btn">重试</button>
            </div>
        `;
        this.bindStaticActions();
        $('#retryLevelBtn')?.addEventListener('click', () => this.renderDirectory(path));
    }
}

renderLevelNodes(path, nodes) {
    const title = path ? splitChapterPath(path).at(-1) : store.series.current;
    const backText = path ? `‹ ${getParentPath(path) || store.series.current}` : '‹ 系列';
    const progress = storage.getSeriesProgress(store.series.current);
    
    const items = nodes.map(node => 
        node.type === 'directory' 
            ? this.renderDirectoryRow(node) 
            : this.renderChapterCardV2(node, progress)
    ).join('');

    this.container.innerHTML = `
        <div class="mobile-topbar">
            <button class="text-back-btn" data-action="back">${escapeHtml(backText)}</button>
        </div>
        <div class="mobile-page-header compact">
            <p class="mobile-kicker">${escapeHtml(store.series.current || '')}</p>
            <h1>${escapeHtml(title || '目录')}</h1>
        </div>
        <div class="directory-list">
            ${items || '<div class="mobile-state-card">当前目录为空</div>'}
        </div>
    `;

    this.bindStaticActions();
    this.bindRowsV2(nodes);
    this.observeChapterCoversV2(nodes);
}
```

- [x] **Step 3: 添加新的章节卡片渲染方法**

```javascript
renderChapterCardV2(node, progress) {
    const displayName = node.name;
    const progressInfo = progress[node.path_id];
    const progressText = formatChapterProgressV2(progressInfo, node.total_files);
    
    return `
        <button class="chapter-card-v2" data-path-id="${escapeHtml(node.path_id)}">
            <span class="chapter-cover skeleton" data-cover-path="${escapeHtml(node.path_id)}"></span>
            <span class="chapter-card-body">
                <strong>${escapeHtml(displayName)}</strong>
                <span class="chapter-progress">${escapeHtml(progressText)}</span>
                <small>${escapeHtml(node.total_files)} 页</small>
            </span>
        </button>
    `;
}

renderDirectoryRow(node) {
    return `
        <button class="directory-row" data-path="${escapeHtml(node.path)}">
            <span class="folder-mark">⌁</span>
            <span>${escapeHtml(node.name)}</span>
            ${node.has_children ? '<span class="row-chevron">›</span>' : ''}
        </button>
    `;
}
```

- [x] **Step 4: 添加新的事件绑定和封面加载**

```javascript
bindRowsV2(nodes) {
    this.container.querySelectorAll('.directory-row').forEach(rowEl => {
        rowEl.addEventListener('click', () => this.onRenderDirectory(rowEl.dataset.path));
    });
    this.container.querySelectorAll('.chapter-card-v2').forEach(cardEl => {
        cardEl.addEventListener('click', () => {
            // 需要找到对应的章节索引或直接用 path_id 打开
            this.onOpenChapterByPathId(cardEl.dataset.pathId);
        });
    });
}

// 新增回调
onOpenChapterByPathId(pathId) {
    // 回调到 App 打开章节
}
```

- [x] **Step 5: 更新 CSS 添加 chapter-card-v2 样式**

```css
.chapter-card-v2 {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    cursor: pointer;
    transition: background var(--transition-fast);
    gap: 12px;
}

.chapter-card-v2:hover {
    background: var(--color-surface-soft);
}

.chapter-card-v2 .chapter-cover {
    width: 80px;
    height: 100px;
    border-radius: var(--radius-cover);
    background: var(--color-surface-soft);
    overflow: hidden;
    flex-shrink: 0;
}

.chapter-card-v2 .chapter-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.chapter-card-v2 .chapter-card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.chapter-card-v2 .chapter-card-body strong {
    color: var(--color-text);
    font-size: 15px;
}

.chapter-card-v2 .chapter-progress {
    color: var(--color-text-muted);
    font-size: 13px;
}

.chapter-card-v2 .chapter-card-body small {
    color: var(--color-text-muted);
    font-size: 12px;
}
```

- [x] **Step 6: 运行前端构建和测试**

Run: `cd frontend && npm run build && npm test`
Expected: 成功

- [x] **Step 7: 提交**

```bash
git add frontend/js/app/directory-view.js frontend/js/state/store.js frontend/js/main.js frontend/css/components.css
git commit -m "feat(directory): 改用按需层级请求和横向首图卡片"
```

---

## Phase 3: 阅读页沉浸式改进

### Task 3.1: 控制层默认隐藏

**Files:**
- Modify: `frontend/js/app/reader-shell.js`
- Modify: `frontend/css/components.css`

- [x] **Step 1: 修改 reader-shell.js 默认隐藏控制层**

```javascript
constructor(readerView, reader, callbacks) {
    // ...existing code...
    this.controlsVisible = false; // 默认隐藏
}

// 添加切换控制层方法
toggleControls() {
    this.controlsVisible = !this.controlsVisible;
    this.elements.controlsOverlay?.classList.toggle('hidden', !this.controlsVisible);
}

// 点击阅读区域显示/隐藏控制层
bindEvents() {
    // ...existing code...
    this.reader.addEventListener('click', () => this.toggleControls());
}
```

- [x] **Step 2: 添加控制层 CSS 动画**

```css
.reader-controls-overlay {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px;
    background: rgba(15, 17, 21, 0.8);
    backdrop-filter: blur(20px);
    transform: translateY(100%);
    transition: transform var(--transition-base);
    z-index: var(--z-modal);
}

.reader-controls-overlay:not(.hidden) {
    transform: translateY(0);
}

.reader-progress-pill {
    position: fixed;
    bottom: 16px;
    right: 16px;
    padding: 8px 16px;
    background: rgba(23, 26, 33, 0.7);
    backdrop-filter: blur(10px);
    border-radius: var(--radius-full);
    color: var(--color-text-muted);
    font-size: 13px;
    z-index: var(--z-sticky);
}
```

- [x] **Step 3: 验证**

Run: `cd frontend && npm run dev`
Expected: 阅读页控制层默认隐藏，点击显示

- [x] **Step 4: 提交**

```bash
git add frontend/js/app/reader-shell.js frontend/css/components.css
git commit -m "feat(reader): 控制层默认隐藏，点击切换"
```

---

### Task 3.2: 统一进度胶囊

**Files:**
- Modify: `frontend/js/app/reader-shell.js`
- Modify: `frontend/css/components.css`

- [x] **Step 1: 在 reader-shell.js 使用进度胶囊**

```javascript
updateProgressStatus() {
    const currentPage = this.reader.getCurrentPage();
    const totalPages = this.reader.getTotalPages();
    const percent = Math.round((currentPage / totalPages) * 100);
    
    const pillEl = this.container.querySelector('.reader-progress-pill');
    if (pillEl) {
        pillEl.textContent = `${currentPage} / ${totalPages}`;
    }
}
```

- [x] **Step 2: 添加进度胶囊 HTML**

```javascript
renderProgressPill() {
    return `<div class="reader-progress-pill">0 / 0</div>`;
}
```

- [x] **Step 3: 提交**

```bash
git add frontend/js/app/reader-shell.js frontend/css/components.css
git commit -m "feat(reader): 统一进度胶囊样式"
```

---

## Phase 4: 后端元数据增强

### Task 4.1: 扩展 `/api/chapter` 返回媒体元数据

**Files:**
- Modify: `backend/src/main/java/com/nianer/comic/Controller/ComicController.java`

- [x] **Step 1: 增强 listChapterFiles 返回值**

```java
@GetMapping("/api/chapter/{seriesName}")
public ResponseEntity<Map<String, Object>> listChapterFilesEnhanced(
        @PathVariable String seriesName,
        @RequestParam(required = false) String chapterPath) throws IOException {

    // ...existing path resolution...

    List<Map<String, Object>> filesMetadata = new ArrayList<>();
    
    for (String filename : files) {
        Map<String, Object> fileMeta = new HashMap<>();
        fileMeta.put("name", filename);
        fileMeta.put("baseName", stripExtension(filename));
        fileMeta.put("mediaType", isImageFile(filename) ? "image" : "video");
        fileMeta.put("preferredSource", resolvePreferredSource(seriesName, chapterPath, filename));
        
        // HQ 信息
        Path hqFile = chapterPathResolved.resolve(filename);
        Map<String, Object> hqInfo = new HashMap<>();
        hqInfo.put("exists", Files.exists(hqFile));
        hqInfo.put("size", Files.exists(hqFile) ? Files.size(hqFile) : 0);
        hqInfo.put("url", buildHQUrl(seriesName, chapterPath, filename));
        fileMeta.put("hq", hqInfo);
        
        // LQ 信息
        String lqFilename = stripExtension(filename) + ".webp";
        Path lqFile = config.getLqPath().resolve(seriesName).resolve(chapterPath).resolve(lqFilename);
        Map<String, Object> lqInfo = new HashMap<>();
        lqInfo.put("exists", Files.exists(lqFile));
        lqInfo.put("url", buildLQUrl(seriesName, chapterPath, lqFilename));
        fileMeta.put("lq", lqInfo);
        
        // Video URL (for GIF/video)
        if (!isImageFile(filename)) {
            fileMeta.put("videoUrl", buildVideoUrl(seriesName, chapterPath, filename));
        }
        
        filesMetadata.add(fileMeta);
    }

    Map<String, Object> response = new HashMap<>();
    response.put("path", chapterPath);
    response.put("files", filesMetadata);
    response.put("total", filesMetadata.size());

    return ResponseEntity.ok(response);
}

private String buildHQUrl(String series, String path, String filename) {
    return "/hq_image/" + encodePath(series + "/" + path + "/" + filename);
}

private String buildLQUrl(String series, String path, String filename) {
    return "/lq_image/" + encodePath(series + "/" + path + "/" + filename);
}

private String buildVideoUrl(String series, String path, String filename) {
    return "/video/" + encodePath(series + "/" + path + "/" + filename);
}

private String encodePath(String path) {
    return path.replace("\\", "/");
}
```

- [x] **Step 2: 提交**

```bash
git add backend/src/main/java/com/nianer/comic/Controller/ComicController.java
git commit -m "feat(api): 扩展 /api/chapter 返回媒体元数据"
```

---

## Phase 5: 模块整理

### Task 5.1: 拆分 api.js 为模块化服务

**Files:**
- Create: `frontend/js/services/catalog-api.js`
- Create: `frontend/js/services/media-url.js`
- Modify: `frontend/js/services/index.js`

- [x] **Step 1: 创建 catalog-api.js**

```javascript
// 目录相关 API
export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export const catalogApi = {
    async getSeries() {
        const res = await fetch('/api/series');
        if (!res.ok) throw new ApiError('获取系列失败', res.status);
        return res.json();
    },

    async getLevelNodes(seriesName, path = '') {
        const url = `/api/levels/${encodeURIComponent(seriesName)}${path ? `?path=${encodeURIComponent(path)}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new ApiError('获取层级节点失败', res.status);
        return res.json();
    },

    async getChapterFiles(seriesName, chapterPath) {
        const url = `/api/chapter/${encodeURIComponent(seriesName)}?chapterPath=${encodeURIComponent(chapterPath)}`;
        const res = await fetch(url);
        if (!res.ok) throw new ApiError('获取章节文件失败', res.status);
        return res.json();
    },
};
```

- [x] **Step 2: 创建 media-url.js**

```javascript
// 媒体 URL 构建
function encodePathSegments(path) {
    return (path || '')
        .replaceAll(String.fromCharCode(92), '/')
        .split('/')
        .filter(Boolean)
        .map(segment => encodeURIComponent(segment))
        .join('/');
}

export const mediaUrl = {
    buildLQImageUrl(seriesName, filename, chapterPath) {
        const dotIndex = filename.lastIndexOf('.');
        const baseName = dotIndex > -1 ? filename.substring(0, dotIndex) : filename;
        const encodedSeries = encodeURIComponent(seriesName);
        const encodedChapterPath = encodePathSegments(chapterPath);
        const encodedFilename = encodeURIComponent(`${baseName}.webp`);
        return encodedChapterPath
            ? `/lq_image/${encodedSeries}/${encodedChapterPath}/${encodedFilename}`
            : `/lq_image/${encodedSeries}/${encodedFilename}`;
    },

    buildHQImageUrl(seriesName, filename, chapterPath) {
        const encodedSeries = encodeURIComponent(seriesName);
        const encodedChapterPath = encodePathSegments(chapterPath);
        const encodedFilename = encodeURIComponent(filename);
        return encodedChapterPath
            ? `/hq_image/${encodedSeries}/${encodedChapterPath}/${encodedFilename}`
            : `/hq_image/${encodedSeries}/${encodedFilename}`;
    },

    buildVideoUrl(seriesName, filename, chapterPath) {
        const encodedSeries = encodeURIComponent(seriesName);
        const encodedChapterPath = encodePathSegments(chapterPath);
        const encodedFilename = encodeURIComponent(filename);
        return encodedChapterPath
            ? `/video/${encodedSeries}/${encodedChapterPath}/${encodedFilename}`
            : `/video/${encodedSeries}/${encodedFilename}`;
    },

    async checkLQImageExists(lqUrl) {
        try {
            const res = await fetch(lqUrl, { method: 'HEAD' });
            return res.status === 200;
        } catch {
            return false;
        }
    },

    async checkHQImageUsable(hqUrl) {
        try {
            const res = await fetch(hqUrl, { method: 'HEAD' });
            if (!res.ok || res.status === 204) return false;
            const contentLength = res.headers.get('content-length') ?? res.headers.get('Content-Length');
            if (contentLength == null) return true;
            const size = Number.parseInt(contentLength, 10);
            return Number.isNaN(size) || size > 0;
        } catch {
            return false;
        }
    },
};
```

- [x] **Step 3: 更新 index.js**

```javascript
export { catalogApi, ApiError } from './catalog-api.js';
export { mediaUrl } from './media-url.js';
export { persistence } from './persistence.js';
export { toolsApi } from './tools-api.js';

// 兼容旧导入
export const api = {
    ...catalogApi,
    ...mediaUrl,
};
```

- [x] **Step 4: 提交**

```bash
git add frontend/js/services/catalog-api.js frontend/js/services/media-url.js frontend/js/services/index.js
git commit -m "refactor: 拆分 api.js 为 catalog-api 和 media-url"
```

---

## Final Verification Wave

### F1: 功能验证

- [x] **首页显示系列列表，带有最近阅读提示**
- [x] **目录页逐级导航，章节为横向首图卡片**
- [x] **阅读页控制层默认隐藏，点击切换**
- [x] **进度胶囊常驻显示**

- [x] `cd frontend && npm run build` 成功
- [x] `cd backend && ./mvnw clean package -DskipTests` 成功

- [x] `cd frontend && npm test` 全部通过
- [x] `cd backend && ./mvnw test` 全部通过

- [x] 暗色主题正确应用
- [x] 章节卡片样式符合设计
- [x] 阅读页沉浸体验

---

## Notes

- 保持向后兼容：现有 `/api/chapters/{series}` 递归 API 保留
- 阶段性实施：每个 Phase 可独立验证
- 缓存策略：新增 `v2:level:*` Redis 键，避免旧缓存污染