# 前端功能模块详细说明

> 本文档描述漫画阅读器前端 (`frontend/index.html`) 的所有功能模块实现细节。

## 目录

- [一、UI 布局与视觉系统](#一ui-布局与视觉系统)
- [二、侧边栏管理系统](#二侧边栏管理系统)
- [三、阅读器核心模块](#三阅读器核心模块)
- [四、懒加载系统](#四懒加载系统)
- [五、智能重试系统](#五智能重试系统)
- [六、预加载系统](#六预加载系统)
- [七、阅读进度管理系统](#七阅读进度管理系统)
- [八、缩放控制系统](#八缩放控制系统)
- [九、页码跳转系统](#九页码跳转系统)
- [十、高质量图片加载](#十高质量图片加载)
- [十一、键盘快捷键系统](#十一键盘快捷键系统)
- [十二、Header/Footer 自动隐藏](#十二headerfooter-自动隐藏)
- [十三、API 通信模块](#十三api-通信模块)
- [十四、状态持久化](#十四状态持久化)
- [十五、空状态与加载状态](#十五空状态与加载状态)
- [十六、响应式适配](#十六响应式适配)

---

## 一、UI 布局与视觉系统

### 1.1 整体布局架构

```
┌─────────────────────────────────────────────────────┐
│ ☰  [侧边栏切换按钮 - 固定悬浮]                       │
├──────────────────┬──────────────────────────────────┤
│                  │                                  │
│   侧边栏         │          主阅读区域              │
│   (固定 18rem)   │                                  │
│                  │    ┌──────────────────────┐      │
│   ┌──────────┐   │    │     Header          │      │
│   │ 系列列表  │   │    │  - 标题             │      │
│   │          │   │    │  - 缩放控制         │      │
│   │ ┌──────┐ │   │    │  - 章节导航         │      │
│   │ │章节树 │ │   │    └──────────────────────┘      │
│   │ └──────┘ │   │                                  │
│   └──────────┘   │    ┌──────────────────────┐      │
│                  │    │                      │      │
│                  │    │     阅读器内容区      │      │
│                  │    │   (图片/视频渲染)     │      │
│                  │    │                      │      │
│                  │    └──────────────────────┘      │
│                  │                                  │
│                  │    ┌──────────────────────┐      │
│                  │    │     Footer           │      │
│                  │    │  - 状态信息          │      │
│                  │    │  - 阅读进度          │      │
│                  │    │  - 重试按钮          │      │
│                  │    └──────────────────────┘      │
└──────────────────┴──────────────────────────────────┘
```

### 1.2 视觉设计系统

#### 背景渐变
```css
/* 燕麦色+象牙白有机柔和渐变 */
body {
    background: linear-gradient(135deg, #f5f0e6 0%, #e8dfd0 30%, #d4c9b8 60%, #c9b99a 100%);
    background-attachment: fixed;
    min-height: 100vh;
}
```

#### 玻璃拟态效果
| 类名 | 透明度 | 模糊度 | 阴影 |
|------|--------|--------|------|
| `.glass` | 20% | 12px | 0 8px 32px 0 rgba(139, 119, 101, 0.12) |
| `.glass-strong` | 28% | 20px | 0 8px 32px 0 rgba(139, 119, 101, 0.15) |

#### 字体系统
| CSS 变量 | 默认值 | 用途 |
|----------|--------|------|
| `--font-size-display` | 2.5rem (40px) | 大标题 |
| `--font-size-h1` | 1.875rem (30px) | 主标题 |
| `--font-size-h2` | 1.5rem (24px) | 次标题 |
| `--font-size-h3` | 1.25rem (20px) | 章节标题 |
| `--font-size-body` | 0.9375rem (15px) | 正文 |
| `--font-size-small` | 0.8125rem (13px) | 次要内容 |
| `--font-size-caption` | 0.75rem (12px) | 辅助文字 |

#### 字重系统
| CSS 变量 | 字重值 | 用途 |
|----------|--------|------|
| `--font-weight-light` | 300 | 正文、状态文字 |
| `--font-weight-regular` | 400 | 默认 |
| `--font-weight-medium` | 500 | 选中状态 |
| `--font-weight-semibold` | 600 | 标题 |
| `--font-weight-bold` | 700 | 强调 |

### 1.3 自定义组件样式

#### 列表项 (`.list-item`)
- 内边距: 10px 16px (左侧 20px)
- 圆角: 8px
- 悬停效果: 背景 rgba(255,255,255,0.25)，右移 3px
- 选中状态: 渐变背景 + 加粗

#### 章节圆点 (`.chapter-dot`)
- 尺寸: 6px x 6px
- 背景: rgba(139, 119, 101, 0.4)
- 圆角: 50%
- 选中时发光的阴影效果

#### 按钮样式
| 类型 | 类名 | 背景 | 阴影 |
|------|------|------|------|
| 玻璃按钮 | `.glass-btn` | rgba(255,255,250,0.25) | 0 4px 12px |
| 主按钮 | `.primary-btn` | linear-gradient(135deg, #c9b99a, #8b7765) | 0 4px 16px |

#### 输入框 (`.glass-input`)
- 背景: rgba(255,255,250,0.15)
- 焦点: 背景 rgba(255,255,250,0.3) + 边框发光
- 占位符颜色: rgba(92, 85, 71, 0.4)

#### 滑块 (`.glass-slider`)
- 高度: 4px
- 背景: rgba(139, 119, 101, 0.15)
- 滑块: 16px 圆形，渐变背景 + 阴影

---

## 二、侧边栏管理系统

### 2.1 系列列表模块

```javascript
// UI 元素
const seriesList = document.getElementById('seriesList');

// 核心函数
async function loadSeries() {
    // 从 /api/series 获取系列列表
    const res = await fetch('/api/series');
    series = await res.json();
    renderSeries(series);
}

function renderSeries(list) {
    seriesList.innerHTML = '';
    list.forEach(s => {
        const div = document.createElement('div');
        div.className = `list-item series-item ${s === currentSeries ? 'selected' : ''}`;
        div.textContent = s;
        div.onclick = () => selectSeries(s);
        seriesList.appendChild(div);
    });
}
```

**功能特性：**
- ✅ 异步加载，无阻塞 UI
- ✅ 选中状态高亮显示
- ✅ 点击切换系列
- ✅ localStorage 持久化当前系列

### 2.2 章节树形结构模块

```javascript
// 核心数据结构
let allFlatChapters = [];  // 扁平章节数组
let chapterTree = [];        // 树形结构

// 构建树形结构
function buildChapterTree(flatChapters) {
    const root = { name: 'root', children: {} };
    const expandedPaths = JSON.parse(localStorage.getItem('expandedPaths') || '{}');

    flatChapters.forEach((chapter, index) => {
        const parts = chapter.path_id.split(/[\\/]/).filter(p => p);
        let current = root;
        let fullPath = '';

        parts.forEach((part, i) => {
            fullPath = fullPath ? `${fullPath}/${part}` : part;

            if (!current.children[part]) {
                current.children[part] = {
                    name: part,
                    fullPath: fullPath,
                    children: {},
                    isChapter: (i === parts.length - 1),
                    flatIndex: (i === parts.length - 1) ? index : null,
                    path_id: (i === parts.length - 1) ? chapter.path_id : null,
                    isExpanded: expandedPaths[fullPath] !== false,
                };
            }
            current = current.children[part];
        });
    });

    return sortChildren(root).children;
}

// 自然排序算法
function naturalSort(text) {
    return text.split(/(\d+)/).map(c => parseInt(c) || c);
}
```

**树形结构示例：**
```
漫画系列/
├── 第1卷/
│   ├── 第1话/
│   │   ├── page001.jpg
│   │   └── page002.jpg
│   └── 第2话/
└── 第2卷/
    └── ...
```

**功能特性：**
- ✅ 路径解析：自动从 `path_id` 提取目录层级
- ✅ 自然排序：数字部分按数值排序 (第2话 < 第10话)
- ✅ 折叠/展开：卷标题可折叠，状态持久化
- ✅ 实时过滤：输入搜索实时过滤章节

---

## 三、阅读器核心模块

### 3.1 章节加载系统

```javascript
// 状态变量
let currentSeries = '';
let currentIndex = -1;
let allChapterFiles = [];
let isLoading = false;

async function openChapter(idx, isUiSelection = false) {
    if (isLoading || idx < 0 || idx >= allFlatChapters.length) return;

    currentIndex = idx;
    const chapterData = allFlatChapters[idx];

    // 更新 UI
    chapterTitle.textContent = chapterData.name;
    renderChapters(chapterTree, filterInput.value);

    // 加载章节数据
    await loadChapterDataAndRender(chapterData);

    // 保存阅读位置
    localStorage.setItem('currentSeries', currentSeries);
    localStorage.setItem('currentChapterPathId', chapterData.path_id);
}

async function loadChapterDataAndRender(chapterData) {
    isLoading = true;

    const chapterUrl = `/api/chapter/${encodeURIComponent(currentSeries)}?chapterPath=${encodeURIComponent(chapterData.path_id)}&page=1&per_page=${MAX_IMAGES_TO_FETCH}`;

    const res = await fetch(chapterUrl);
    const data = await res.json();

    allChapterFiles = data.files || [];

    // 使用懒加载渲染
    renderChapterWithLazyLoad(chapterData);

    isLoading = false;
}
```

**功能特性：**
- ✅ 章节切换动画 (滚动到顶部)
- ✅ 自动保存/恢复阅读位置
- ✅ 下一章预加载元数据缓存
- ✅ 错误处理与用户提示

### 3.2 媒体文件渲染

```javascript
// 支持的文件格式
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov'];
const GIF_EXTENSION = '.gif';

function isImageFile(filename) {
    const lowerFilename = filename.toLowerCase();
    return IMAGE_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
}

function isVideoFile(filename) {
    const lowerFilename = filename.toLowerCase();
    return VIDEO_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
}

function isGifFile(filename) {
    return filename.toLowerCase().endsWith(GIF_EXTENSION);
}

// URL 构建
function buildMediaUrl(filename, pathId, seriesName, isVideo) {
    if (isVideo) {
        if (pathId) {
            return `/video/${encodeURIComponent(seriesName)}/${encodeURIComponent(pathId)}/${encodeURIComponent(filename)}`;
        }
        return `/video/${encodeURIComponent(seriesName)}/${encodeURIComponent(filename)}`;
    }
    return `/api/image/${encodeURIComponent(seriesName)}/${encodeURIComponent(filename)}?chapterPath=${encodeURIComponent(pathId)}`;
}
```

**媒体类型处理：**
| 文件类型 | 扩展名 | 渲染标签 | URL 路径 |
|---------|--------|----------|----------|
| 图片 | .jpg, .jpeg, .png, .webp | `<img>` | `/api/image/` |
| 视频 | .mp4, .mov | `<video>` | `/video/` |
| GIF | .gif | `<img>` | `/video/` |

---

## 四、懒加载系统 (核心性能模块)

### 4.1 Intersection Observer 架构

```javascript
// 懒加载配置
const LAZY_LOAD_CONFIG = {
    ROOT_MARGIN: '1500px',     // 视窗外 1500px 开始加载
    INITIAL_BATCH: 10,         // 初始加载 10 张
    BATCH_SIZE: 10,            // 每批观察 10 个元素
};

// 懒加载状态
let lazyLoadState = {
    observer: null,           // Intersection Observer 实例
    nextToObserve: 0,          // 下一个要观察的索引
    loadedCount: 0,            // 已加载数量
    isObserving: false,        // 是否正在观察
};
```

### 4.2 懒加载核心实现

```javascript
// 初始化懒加载观察器
function initLazyObserver() {
    if (lazyLoadState.observer) {
        lazyLoadState.observer.disconnect();
    }

    lazyLoadState.observer = new IntersectionObserver(
        lazyLoadCallback,
        {
            rootMargin: LAZY_LOAD_CONFIG.ROOT_MARGIN,
            threshold: 0
        }
    );

    lazyLoadState.nextToObserve = 0;
    lazyLoadState.loadedCount = 0;
}

// 观察器回调
function lazyLoadCallback(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const container = entry.target;
            const retryState = imageRetryState.get(container);

            // 状态检查：跳过重复触发
            if (retryState?.status === 'retrying') return;
            if (retryState?.status === 'success') return;

            // 失败状态且有重试次数：进行重试
            if (retryState?.status === 'failed') {
                if (retryState.retries < IMAGE_RETRY_CONFIG.MAX_RETRIES) {
                    loadImageElement(container, { forceRetry: true });
                }
                return;
            }

            // 正常加载
            loadImageElement(container);
        }
    });
}

// 观察下一批元素
function observeNextBatch() {
    const allContainers = reader.querySelectorAll('.lazy-image-container');
    const totalContainers = allContainers.length;

    const endIndex = Math.min(
        lazyLoadState.nextToObserve + LAZY_LOAD_CONFIG.BATCH_SIZE,
        totalContainers
    );

    for (let i = lazyLoadState.nextToObserve; i < endIndex; i++) {
        const container = allContainers[i];
        if (container && container.dataset.loaded !== 'true') {
            lazyLoadState.observer.observe(container);
        }
        lazyLoadState.nextToObserve = i + 1;
    }
}
```

### 4.3 懒加载容器结构

```html
<!-- 未加载状态 -->
<div class="lazy-image-container" data-index="0" data-filename="page001.jpg" data-path_id="chapter1" data-seriesName="series1" data-loaded="false">
    <div class="skeleton-wrapper">
        <div class="skeleton-image skeleton"></div>
    </div>
</div>

<!-- 加载完成状态 -->
<div class="lazy-image-container loaded" data-index="0" data-loaded="true">
    <div class="skeleton-wrapper" style="display: none;">
        <div class="skeleton-image skeleton"></div>
    </div>
    <img class="reader-img loaded" src="..." style="width: 100%;">
</div>
```

**懒加载流程图：**
```
┌──────────────────┐
│  打开章节         │
└────────┬─────────┘
         ↓
┌──────────────────┐
│  创建所有容器     │
│  (骨架屏占位)     │
└────────┬─────────┘
         ↓
┌──────────────────┐
│  初始观察 10 个   │
└────────┬─────────┘
         ↓
    ┌────┴────┐
    ↓         ↓
 ┌──────┐  ┌──────┐
 │可见？│  │不可见│
 └──┬───┘  └──┬───┘
    ↓         ↓
 ┌──────┐  ┌──────┐
 │加载  │  │等待  │
 └──┬───┘  └──────┘
    ↓
 ┌──────┐
 │观察下一批│
 └───────┘
```

---

## 五、智能重试系统

### 5.1 重试配置与状态

```javascript
// 图片加载重试配置
const IMAGE_RETRY_CONFIG = {
    MAX_RETRIES: 3,             // 最大重试次数
    INITIAL_DELAY: 1000,         // 初始延迟 (ms)
    MAX_DELAY: 10000,            // 最大延迟 (ms)
    BACKOFF_MULTIPLIER: 2,       // 延迟倍数 (指数退避)
};

// 重试状态管理
const imageRetryState = new Map();

function getRetryState(container) {
    if (!imageRetryState.has(container)) {
        imageRetryState.set(container, {
            retries: 0,
            status: 'idle',     // idle | loading | retrying | failed | success
            lastError: null,
            timeoutId: null
        });
    }
    return imageRetryState.get(container);
}

// 计算指数退避延迟
function getRetryDelay(retries) {
    const delay = IMAGE_RETRY_CONFIG.INITIAL_DELAY *
        Math.pow(IMAGE_RETRY_CONFIG.BACKOFF_MULTIPLIER, retries);
    return Math.min(delay, IMAGE_RETRY_CONFIG.MAX_DELAY);
}
```

### 5.2 加载函数 (带重试)

```javascript
function loadImageElement(container, options = {}) {
    const { filename, pathId, seriesName } = container.dataset;
    const isVideo = isVideoFile(filename);
    const isImage = isImageFile(filename);
    const isGif = isGifFile(filename);

    const retryState = getRetryState(container);
    const forceRetry = options.forceRetry === true;

    // 状态检查
    if (retryState.status === 'success' && !forceRetry) return;
    if (retryState.retries >= IMAGE_RETRY_CONFIG.MAX_RETRIES &&
        retryState.status === 'failed' && !forceRetry) return;

    // 强制重置状态
    if (forceRetry) {
        retryState.retries = 0;
        retryState.status = 'loading';
        container.dataset.loaded = 'false';
        container.classList.remove('loaded', 'failed');
    }

    const url = buildMediaUrl(filename, pathId, seriesName, useVideoPath(filename));
    clearMediaElement(container);

    // 创建媒体元素
    let element;
    if (isVideo) {
        element = document.createElement('video');
        element.className = 'reader-img';
        element.controls = true;
        element.autoplay = false;
        element.loop = false;
        element.preload = 'metadata';
    } else {
        element = document.createElement('img');
        element.className = 'reader-img';
        element.loading = 'lazy';
        element.decoding = 'async';
    }
    element.style.width = scale + '%';

    // 成功回调
    const onSuccess = () => {
        if (retryState.timeoutId) {
            clearTimeout(retryState.timeoutId);
            retryState.timeoutId = null;
        }
        retryState.status = 'success';
        container.classList.add('loaded');
        lazyLoadState.loadedCount++;
        updateProgressStatus();
        observeNextBatch();
    };

    // 失败回调
    const onError = (error) => {
        retryState.lastError = error;
        retryState.retries++;

        if (retryState.retries >= IMAGE_RETRY_CONFIG.MAX_RETRIES) {
            // 达到最大重试次数
            retryState.status = 'failed';
            container.classList.add('loaded', 'failed');
            updateRetryStatus(container, retryState);
            console.warn(`[图片加载] 达到最大重试次数:`, { filename, pathId, seriesName });
            observeNextBatch();
        } else {
            // 指数退避重试
            retryState.status = 'retrying';
            const delay = getRetryDelay(retryState.retries);
            retryState.timeoutId = setTimeout(() => {
                retryState.timeoutId = null;
                retryState.status = 'loading';
                loadImageElement(container, { forceRetry: true });
            }, delay);
        }
    };

    // 超时保护 (10秒)
    const timeoutId = setTimeout(() => {
        if (retryState.status === 'loading') {
            element.src = '';
            onError('timeout');
        }
    }, 10000);

    container.appendChild(element);
    element.src = url;
    container.dataset.loaded = 'true';
}
```

### 5.3 批量重试功能

```javascript
function retryAllFailedImages() {
    const failedContainers = [];
    const containers = reader.querySelectorAll('.lazy-image-container');

    containers.forEach(container => {
        const state = imageRetryState.get(container);
        if (state?.status === 'failed' && state.retries >= IMAGE_RETRY_CONFIG.MAX_RETRIES) {
            failedContainers.push(container);
        }
    });

    if (failedContainers.length === 0) {
        setStatus('没有失败的图片需要重试');
        return;
    }

    setStatus(`正在重试 ${failedContainers.length} 张失败的图片...`);

    failedContainers.forEach((container, index) => {
        setTimeout(() => {
            loadImageElement(container, { forceRetry: true });
        }, index * 500); // 错开重试时间
    });
}
```

**重试时间线：**
```
时间线 (秒)
0s     1s     2s     4s     8s    10s
│      │      │      │      │      │
├──────┴──────┴──────┴──────┴──────┤
│  首次加载 → 失败 → 重试1 → 重试2 → 重试3 → 失败标记
│  (0ms)   (1s)  (2s)   (4s)   (8s)
└──────────────────────────────────┘
```

---

## 六、预加载系统

### 6.1 图片预加载

```javascript
const preloaderContainer = document.getElementById('preloader-container');

function preloadNextBatch(startIndex, count) {
    clearPreloader();

    const endIndex = Math.min(startIndex + count, allChapterFiles.length);
    const filesToPreload = allChapterFiles.slice(startIndex, endIndex);

    filesToPreload.forEach(filename => {
        if (isImageFile(filename)) {
            const fileUrl = `/api/image/${encodeURIComponent(currentSeries)}/${encodeURIComponent(filename)}?chapterPath=${encodeURIComponent(allFlatChapters[currentIndex].path_id)}`;

            const img = document.createElement('img');
            img.src = fileUrl;
            img.loading = 'eager';
            img.style.width = '1px';
            preloaderContainer.appendChild(img);
        }
    });
}
```

### 6.2 下一章元数据预加载

```javascript
let nextChapterFilesCache = null;
let nextChapterIndex = -1;

async function preloadNextChapterMetadata() {
    nextChapterIndex = currentIndex + 1;

    if (nextChapterIndex >= allFlatChapters.length) {
        nextChapterFilesCache = null;
        return;
    }

    const chapterData = allFlatChapters[nextChapterIndex];
    const chapterUrl = `/api/chapter/${encodeURIComponent(currentSeries)}?chapterPath=${encodeURIComponent(chapterData.path_id)}&page=1&per_page=${MAX_IMAGES_TO_FETCH}`;

    try {
        const res = await fetch(chapterUrl);
        if (!res.ok) throw new Error('Failed to load next chapter metadata');

        const data = await res.json();
        nextChapterFilesCache = data.files || [];
        console.log(`[预加载] 下一章元数据已缓存: ${nextChapterFilesCache.length} 个文件`);
    } catch (error) {
        nextChapterFilesCache = null;
        console.error('[预加载] 下一章元数据失败:', error);
    }
}

// 在章节打开时使用缓存
async function openChapter(idx, isUiSelection = false) {
    // ...

    // 检查是否可以使用预加载的元数据
    if (idx === nextChapterIndex && nextChapterFilesCache) {
        allChapterFiles = nextChapterFilesCache;
        nextChapterFilesCache = null; // 使用后清空缓存
        renderChapterWithLazyLoad(chapterData);
    } else {
        await loadChapterDataAndRender(chapterData);
    }
}
```

---

## 七、阅读进度管理系统

### 7.1 进度状态对象

```javascript
const progressState = {
    // 状态变量
    currentPage: 1,           // 当前页码 (1-based)
    totalPages: 0,            // 总页数
    loadedPages: 0,           // 已加载页数
    scrollPercent: 0,         // 滚动百分比
    lastReadTime: 0,          // 最后阅读时间戳

    // 初始化
    init(total) {
        this.totalPages = total;
        this.currentPage = 1;
        this.loadedPages = 0;
        this.scrollPercent = 0;
        this.lastReadTime = Date.now();
    },

    // 设置当前页码
    setCurrentPage(page) {
        this.currentPage = Math.max(1, Math.min(page, this.totalPages));
        this.lastReadTime = Date.now();
        this.saveToStorage();
    },

    // 更新滚动进度
    updateScrollPercent(percent) {
        this.scrollPercent = Math.max(0, Math.min(100, percent));
        this.lastReadTime = Date.now();
    },

    // 获取显示文本
    getDisplayText() {
        const percent = this.totalPages > 0
            ? Math.round((this.currentPage / this.totalPages) * 100)
            : 0;
        return `${this.currentPage} / ${this.totalPages} (${percent}%)`;
    },

    getBriefText() {
        return `${this.currentPage} / ${this.totalPages}`;
    },

    // 持久化
    saveToStorage() {
        if (!currentSeries || currentIndex < 0) return;
        const key = `progress_${currentSeries}_${currentIndex}`;
        localStorage.setItem(key, JSON.stringify({
            page: this.currentPage,
            scrollPercent: this.scrollPercent,
            timestamp: this.lastReadTime
        }));
    },

    // 恢复
    restoreFromStorage(series, index) {
        if (!series || index < 0) return null;
        const key = `progress_${series}_${index}`;
        try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data) {
                this.currentPage = data.page || 1;
                this.scrollPercent = data.scrollPercent || 0;
                this.lastReadTime = data.timestamp || 0;
                return data;
            }
        } catch (e) {
            console.warn('恢复阅读进度失败:', e);
        }
        return null;
    },

    // 获取系列所有进度
    getSeriesProgress(seriesName) {
        if (!seriesName) return {};
        const progress = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(`progress_${seriesName}_`)) {
                    const data = JSON.parse(localStorage.getItem(key));
                    const chapterIndex = parseInt(key.split('_').pop());
                    progress[chapterIndex] = {
                        page: data.page,
                        percent: data.scrollPercent,
                        timestamp: data.timestamp
                    };
                }
            }
        } catch (e) {
            console.warn('获取系列阅读进度失败:', e);
        }
        return progress;
    }
};
```

### 7.2 页码计算

```javascript
// 计算当前可视区域中最上面的图片索引
function calculateCurrentPage() {
    const containers = reader.querySelectorAll('.lazy-image-container');
    if (containers.length === 0) return 1;

    const readerRect = reader.getBoundingClientRect();
    const viewportCenter = readerRect.top + readerRect.height / 2;

    let minDistance = Infinity;
    let closestIndex = 0;

    containers.forEach((container, index) => {
        const rect = container.getBoundingClientRect();
        const containerCenter = rect.top + rect.height / 2;
        const distance = Math.abs(containerCenter - viewportCenter);

        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    });

    return closestIndex + 1;
}

// 滚动时更新当前页码 (防抖)
let scrollUpdateTimer = null;
function updateCurrentPageOnScroll() {
    if (scrollUpdateTimer) return;

    scrollUpdateTimer = setTimeout(() => {
        const currentPage = calculateCurrentPage();
        if (currentPage !== progressState.currentPage) {
            progressState.setCurrentPage(currentPage);
            progressStatusEl.textContent = progressState.getBriefText();
        }
        updateProgressStatus();
        scrollUpdateTimer = null;
    }, 100);
}
```

---

## 八、缩放控制系统

```javascript
let scale = 100;

scaleRange.addEventListener('input', () => {
    scale = scaleRange.value;
    scaleLabel.textContent = scale + '%';

    // 全局应用缩放
    reader.querySelectorAll('.reader-img').forEach(img => {
        img.style.width = scale + '%';
    });
});

// 初始化缩放滑块
const scaleRange = document.getElementById('scaleRange');
const scaleLabel = document.getElementById('scaleLabel');

// 配置
// 最小值: 30%
// 最大值: 150%
// 默认值: 100%
```

---

## 九、页码跳转系统

### 9.1 跳转弹窗

```javascript
const jumpModal = document.getElementById('jumpModal');
const jumpPageInput = document.getElementById('jumpPageInput');
const totalPagesEl = document.getElementById('totalPages');

function showJumpModal() {
    if (allChapterFiles.length === 0) return;

    totalPagesEl.textContent = allChapterFiles.length;
    jumpPageInput.value = '';
    jumpPageInput.max = allChapterFiles.length;
    jumpModal.classList.remove('hidden');
    jumpModal.classList.add('flex');

    setTimeout(() => jumpPageInput.focus(), 100);
}

function hideJumpModal() {
    jumpModal.classList.add('hidden');
    jumpModal.classList.remove('flex');
}
```

### 9.2 跳转实现 (懒加载版本)

```javascript
const JUMP_CONFIG = {
    PRELOAD_AROUND: 3,      // 跳转后预加载周围图片数量
    LOAD_TIMEOUT: 5000,     // 加载超时时间
};

function jumpToPageWithLazyLoad(pageNum) {
    if (pageNum < 1 || pageNum > allChapterFiles.length) return;

    const targetIndex = pageNum - 1;
    const targetElement = reader.querySelector(`.lazy-image-container[data-index="${targetIndex}"]`);

    if (targetElement) {
        setStatus(`正在跳转至第 ${pageNum} 页...`);

        // 1. 强制加载目标图片
        loadImageAtIndexWithForce(targetIndex);

        // 2. 预加载周围图片
        preloadImagesAround(targetIndex);

        // 3. 直接跳转到目标位置
        targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });

        // 4. 更新状态
        setTimeout(() => {
            updateProgressStatus();
            setStatus(`已跳转至第 ${pageNum} 页`);
        }, 100);
    }
}

function loadImageAtIndexWithForce(index) {
    const container = reader.querySelector(`.lazy-image-container[data-index="${index}"]`);
    if (container && container.dataset.loaded === 'false') {
        loadImageElement(container);
    }
}

function preloadImagesAround(targetIndex) {
    if (allChapterFiles.length === 0) return;

    const start = Math.max(0, targetIndex - JUMP_CONFIG.PRELOAD_AROUND);
    const end = Math.min(allChapterFiles.length - 1, targetIndex + JUMP_CONFIG.PRELOAD_AROUND);

    for (let i = start; i <= end; i++) {
        if (i !== targetIndex) {
            loadImageAtIndexWithForce(i);
        }
    }
}
```

### 9.3 输入验证与错误反馈

```javascript
function jumpToPage() {
    const pageNum = parseInt(jumpPageInput.value, 10);

    if (isNaN(pageNum) || pageNum < 1) {
        showInputError('请输入有效的页码');
        return;
    }
    if (pageNum > allChapterFiles.length) {
        showInputError(`页码超出范围，最大为 ${allChapterFiles.length}`);
        return;
    }

    hideJumpModal();
    jumpToPageWithLazyLoad(pageNum);
}

function showInputError(message) {
    jumpPageInput.classList.add('border-red-500', 'ring-2', 'ring-red-200');
    jumpPageInput.title = message;

    // 晃动动画
    jumpPageInput.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(0)' }
    ], {
        duration: 300,
        easing: 'ease-in-out'
    });

    setTimeout(() => {
        jumpPageInput.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
        jumpPageInput.title = '';
    }, 500);
}
```

---

## 十、高质量图片加载 (HQ/LQ 双模式)

### 10.1 双击触发机制

```javascript
let lastClickTime = 0;
const DOUBLE_CLICK_TIME_THRESHOLD = 300; // 300ms

reader.addEventListener('click', handleImageClick);

function handleImageClick(e) {
    // 确保点击的是图片元素
    if (!e.target.classList.contains('reader-img') || e.target.tagName !== 'IMG') {
        return;
    }

    const currentTime = Date.now();

    // 判断是否为快速点击 (连击)
    if (currentTime - lastClickTime < DOUBLE_CLICK_TIME_THRESHOLD) {
        // 是连击，触发 HQ 加载逻辑
        e.preventDefault();

        const img = e.target;
        const originalSrc = img.src;

        // 检查是否已经是 HQ 图片
        if (originalSrc.includes('/hq_image/') || !originalSrc.includes('/api/image/')) {
            return;
        }

        const hqSrc = getHQImageUrl(originalSrc);
        console.log(`[HQ] 双击加载高质量图片: ${hqSrc}`);

        img.style.pointerEvents = 'none';
        img.src = hqSrc;

        img.onload = () => {
            img.style.pointerEvents = 'auto';
            console.log('[HQ] 高质量图片加载成功');
        };

        img.onerror = () => {
            img.style.pointerEvents = 'auto';
            console.error('[HQ] 高质量图片加载失败，回退到低质量版本');
            img.src = originalSrc;
        };

        lastClickTime = 0;
    } else {
        lastClickTime = currentTime;
    }
}
```

### 10.2 HQ URL 转换

```javascript
function getHQImageUrl(lowQualityUrl) {
    // 将 /api/image/ 替换为 /hq_image/，移除查询参数使用静态路径
    if (!lowQualityUrl.includes('/api/image/')) return lowQualityUrl;

    try {
        const url = new URL(lowQualityUrl, window.location.origin);

        // 先解码再编码，避免双重编码
        const seriesName = decodeURIComponent(url.pathname.split('/')[3]);
        const filename = decodeURIComponent(url.pathname.split('/')[4]);
        const chapterPath = url.searchParams.get('chapterPath')
            ? decodeURIComponent(url.searchParams.get('chapterPath'))
            : '';

        if (chapterPath) {
            return `/hq_image/${encodeURIComponent(seriesName)}/${encodeURIComponent(chapterPath)}/${encodeURIComponent(filename)}`;
        } else {
            return `/hq_image/${encodeURIComponent(seriesName)}/${encodeURIComponent(filename)}`;
        }
    } catch (e) {
        console.error('[HQ] URL 解析错误:', e);
        return lowQualityUrl.replace('/api/image/', '/hq_image/');
    }
}
```

**URL 转换示例：**
```
// 低质量图片 URL (动态服务)
https://example.com/api/image/火影忍者/第1话/page001.jpg?chapterPath=%E7%AC%AC%E5%8D%97%E5%8C%97%E5%88%86%E6%9F%93

// 高质量图片 URL (静态服务)
https://example.com/hq_image/火影忍者/第1话/page001.jpg
```

---

## 十一、键盘快捷键系统

```javascript
document.addEventListener('keydown', e => {
    // 保护规则：输入框中不触发
    if (document.activeElement === filterInput ||
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA') {
        return;
    }

    // 方向键导航
    if (e.key === 'ArrowLeft') {
        prevBtn.click();
        e.preventDefault();
    }
    if (e.key === 'ArrowRight') {
        nextBtn.click();
        e.preventDefault();
    }

    // Home 回到顶部
    if (e.key === 'Home') {
        scrollTopBtn.click();
        e.preventDefault();
    }

    // G 键打开页码跳转
    if ((e.key === 'g' || e.key === 'G') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        showJumpModal();
        e.preventDefault();
    }

    // Page Up/Down 翻页滚动
    if (e.key === 'PageDown') {
        reader.scrollBy({ top: reader.clientHeight * 0.9, behavior: 'smooth' });
        e.preventDefault();
    }
    if (e.key === 'PageUp') {
        reader.scrollBy({ top: reader.clientHeight * -0.9, behavior: 'smooth' });
        e.preventDefault();
    }

    // ESC 关闭弹窗 (在输入框中)
    if (e.key === 'Escape') {
        hideJumpModal();
    }
});
```

**快捷键速查表：**
| 按键 | 功能 | 说明 |
|------|------|------|
| `←` | 上一章 | |
| `→` | 下一章 | |
| `Home` | 回到顶部 | |
| `G` | 打开跳转 | 需在非输入状态 |
| `PageDown` | 下翻页 | 90% 视口高度 |
| `PageUp` | 上翻页 | 90% 视口高度 |
| `Enter` | 确认跳转 | 跳转弹窗中 |
| `Escape` | 关闭弹窗 | |

---

## 十二、Header/Footer 自动隐藏

```javascript
let lastScrollPos = 0;
const SCROLL_DIRECTION_THRESHOLD = 50;

reader.addEventListener('scroll', () => {
    const st = reader.scrollTop;
    const deltaY = st - lastScrollPos;

    // Header/Footer 隐藏逻辑
    if (Math.abs(deltaY) > SCROLL_DIRECTION_THRESHOLD) {
        const isHeaderHidden = header.classList.contains('hidden');

        if (st < 10) {
            // 顶部位置：始终显示
            header.classList.remove('hidden');
            footer.classList.remove('hidden');
        }
        else if (deltaY > 0 && !isHeaderHidden) {
            // 向下滚动：隐藏
            header.classList.add('hidden');
            footer.classList.add('hidden');
        }
        else if (deltaY < 0 && isHeaderHidden) {
            // 向上滚动：显示
            header.classList.remove('hidden');
            footer.classList.remove('hidden');
        }

        lastScrollPos = st;
    }

    // 更新阅读进度
    updateCurrentPageOnScroll();
});
```

**行为逻辑：**
```
滚动状态                    Header      Footer
───────────────────────────────────────────────
初始状态                   显示         显示
向下滚动 > 50px            隐藏         隐藏
向上滚动 (无论距离)         显示         显示
滚动到顶部 (< 10px)        显示         显示
```

---

## 十三、API 通信模块

### 13.1 接口列表

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/series` | 获取所有漫画系列列表 |
| GET | `/api/chapters/{series}` | 获取指定系列的章节列表 |
| GET | `/api/chapter/{series}?chapterPath={path}` | 获取章节文件列表 |
| GET | `/api/image/{series}/{filename}?chapterPath={path}` | 智能图片服务 (LQ) |
| GET | `/hq_image/{series}/{chapter}/{filename}` | 高质量图片静态服务 |
| GET | `/video/{series}/{chapter}/{filename}` | 视频文件静态服务 |

### 13.2 错误处理

```javascript
async function loadSeries() {
    try {
        seriesList.innerHTML = '<div class="p-3 text-center">正在加载...</div>';
        const res = await fetch('/api/series');

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        series = await res.json();
        renderSeries(series);
        setStatus(`已加载系列：${series.length}`);
    } catch (error) {
        seriesList.innerHTML = '<div class="p-2 text-red-400">错误：无法连接到后端或加载系列列表。</div>';
        setStatus('错误：无法加载系列列表');
        console.error('[API] 加载系列失败:', error);
    }
}
```

---

## 十四、状态持久化

### 14.1 存储键名规范

```javascript
// 系列和章节状态
'currentSeries'           // 当前选中的系列名称
'currentChapterPathId'   // 当前章节的 path_id

// 阅读进度 (按系列和章节索引)
// 格式: progress_{seriesName}_{chapterIndex}
'progress_火影忍者_0'    // 火影忍者第1话的阅读进度
'progress_火影忍者_5'    // 火影忍者第6话的阅读进度

// UI 状态
'expandedPaths'          // 章节树折叠状态 (JSON)
// 格式: { "/path/to/volume": true, "/path/to/volume2": false }
'currentScale'           // 缩放比例 (已集成到 scaleRange)
```

### 14.2 存储数据结构

```javascript
// 阅读进度存储格式
localStorage.setItem('progress_系列名_章节索引', JSON.stringify({
    page: 5,              // 当前页码 (1-based)
    scrollPercent: 25,    // 滚动百分比 (0-100)
    timestamp: 1699999999 // 最后阅读时间戳
}));

// 章节树折叠状态存储格式
localStorage.setItem('expandedPaths', JSON.stringify({
    "第1卷": true,
    "第2卷": false,
    "第3卷/外传": true
}));
```

---

## 十五、空状态与加载状态

### 15.1 状态展示

```javascript
// 系列列表
// 加载中
<div class="p-3 text-center">正在加载...</div>

// 空状态
<div class="status-text">未找到漫画系列</div>

// 错误状态
<div class="p-2 text-red-400">错误：无法连接到后端或加载系列列表。</div>


// 章节列表
// 加载中
<div class="status-text">正在加载章节...</div>

// 未选择系列
<div class="status-text">请先选择漫画系列</div>

// 空状态
<div class="status-text">暂无章节</div>


// 阅读器
// 未选择章节
<div id="empty" class="empty-state">
    <svg>...</svg>
    <div class="empty-state-title">请先选择漫画系列和章节</div>
    <div class="empty-state-desc">侧边栏包含您所有的本地漫画系列和章节</div>
</div>

// 加载中
<div class="loading-indicator">
    <svg class="animate-spin">...</svg>
    <div>加载中...</div>
</div>
```

### 15.2 骨架屏动画

```css
/* shimmer 动画 */
@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

.skeleton {
    background: linear-gradient(
        90deg,
        rgba(201, 185, 154, 0.1) 25%,
        rgba(201, 185, 154, 0.3) 50%,
        rgba(201, 185, 154, 0.1) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
}
```

---

## 十六、响应式适配

### 16.1 布局响应式

```css
/* 侧边栏 - 桌面端 */
#sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 18rem;  /* 288px */
    z-index: 50;
    transform: translateX(0);
    transition: transform 0.3s ease-in-out;
}

/* 侧边栏 - 隐藏状态 */
#sidebar.hidden {
    transform: translateX(-100%);
}

/* 切换按钮 - 始终显示 */
#toggleSidebarBtn {
    position: fixed;
    left: 16px;
    top: 16px;
    z-index: 100;
    display: flex !important;
}

/* 阅读器 - 全屏模式 */
.main {
    position: fixed;
    inset: 0;
    z-index: 10;
    margin: 0;
}
```

### 16.2 布局比例

```css
/* 侧边栏内部比例 */
.series-ratio-2 {
    flex: 2;
    min-height: 0;
}

.chapters-ratio-3 {
    flex: 3;
    min-height: 0;
}
```

---

## 模块依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│                    用户交互层                                │
├─────────────────────────────────────────────────────────────┤
│  侧边栏点击 │ 章节选择 │ 缩放控制 │ 键盘快捷键 │ 跳转弹窗    │
│      ↓      │    ↓     │    ↓     │     ↓       │    ↓      │
│  selectSeries│ openChapter│ scaleRange │ keydown │ showJump  │
└────────────┴─────────┴──────────┴───────────┴────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    业务逻辑层                                │
├─────────────────────────────────────────────────────────────┤
│  loadSeries    │  fetchAndRenderChapters  │  progressState │
│      ↓         │           ↓               │       ↓        │
│  renderSeries  │    buildChapterTree      │  setCurrentPage │
│                │           ↓               │  saveToStorage  │
│                │    renderChapters        │  restoreFrom    │
│                │           ↓               │       Storage   │
│                │    toggleVolume          │       ↓        │
│                │    containsFiltered      │  calculate      │
│                │           ↓               │  CurrentPage    │
│                │    filterInput           │                 │
├───────────────┬┴─────────────┬─────────────┴─────────────────┤
│  loadChapterData │ renderChapter │ lazyLoadState           │
│  AndRender      │ WithLazyLoad │                          │
│       ↓         │      ↓       │  imageRetryState         │
│  allChapterFiles│      ↓       │                          │
│       ↓         │  observeNext │  retryAllFailedImages    │
│  preloadNext    │  Batch       │                          │
│  Batch          │      ↓       │                          │
│       ↓         │  lazyLoad    │                          │
│  preloadNext    │  Callback    │                          │
│  ChapterMetadata│      ↓       │                          │
│                 │  loadImage   │                          │
│                 │  Element     │                          │
└─────────────────┴─────────────┴────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    渲染层                                    │
├─────────────────────────────────────────────────────────────┤
│  HTML 结构: .reader (主容器)                                │
│           ├── .lazy-image-container (懒加载容器)           │
│           │   ├── .skeleton-wrapper (骨架屏)                │
│           │   └── .reader-img (图片/视频)                   │
│           └── #end-marker (底部标记)                       │
│                                                               │
│  CSS 样式: Tailwind CSS + 自定义样式                         │
│           ├── .glass (玻璃拟态)                             │
│           ├── .glass-btn (玻璃按钮)                         │
│           ├── .glass-input (玻璃输入框)                     │
│           ├── .skeleton (骨架屏动画)                        │
│           └── .hidden (显隐控制)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 技术栈总结

| 类别 | 技术 | 说明 |
|------|------|------|
| 语言 | Vanilla JavaScript (ES6+) | 无框架依赖 |
| 样式 | Tailwind CSS + Custom CSS | 原子化 CSS + 自定义动画 |
| 渲染 | 原生 DOM 操作 | 无虚拟 DOM |
| 加载 | Intersection Observer API | 浏览器原生懒加载 |
| 存储 | localStorage | 状态持久化 |
| 通信 | Fetch API | 异步请求 |

---

## 文件统计

| 指标 | 数值 |
|------|------|
| 总代码行数 | ~2291 行 |
| JavaScript 函数 | 50+ 个 |
| CSS 类定义 | 40+ 个 |
| API 接口调用 | 4 个 |
| 键盘快捷键 | 8 个 |

---

*文档生成时间: 2026-02-11*
