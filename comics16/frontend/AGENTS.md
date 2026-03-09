# Frontend - 漫画阅读器前端开发指南

**位置**: `frontend/`  
**技术栈**: Vanilla JavaScript (ES6+) + Tailwind CSS + HTML5  
**架构**: 单文件架构 (所有代码内联在 index.html)

## 模块概述

Vanilla JavaScript 实现的高性能漫画阅读器前端，采用独特的单文件架构，所有 HTML/CSS/JavaScript 内联在 `index.html` 中。

## 目录结构

```
frontend/
└── vue3-app/                  
```

## 核心架构

### 单文件设计决策

**原因**:
- 零构建依赖，直接部署
- 快速原型开发和调试
- 适合小型项目和本地工具

**代价**:
- 代码难以维护和测试
- 无模块化分离
- 团队协作困难

### 技术选型

| 技术 | 版本 | 用途 |
|------|------|------|
| JavaScript | ES6+ | 核心逻辑 (async/await, 箭头函数) |
| Tailwind CSS | CDN v3.x | 响应式布局和样式 |
| Google Fonts | Inter | 字体系统 |
| LocalStorage | Native | 阅读进度和本地状态持久化 |

## 核心功能模块

### 1. 侧边栏管理

**职责**: 漫画系列列表 + 章节树形结构

```javascript
// 关键功能
- toggleSidebar() - 侧边栏开关
- loadSeriesList() - 加载漫画系列
- loadChapters(series) - 加载章节树
- renderChapterTree() - 渲染章节结构
```

**状态存储**:
```javascript
localStorage.setItem('comic_reader_state', JSON.stringify({
  currentSeries: string,
  currentChapter: string,
  expandedChapters: string[]
}))
```

### 2. 阅读器核心

**职责**: 图片/视频渲染，懒加载，缩放控制

```javascript
// 关键功能
- renderChapter(files) - 渲染章节内容
- loadImage(file) - 智能图片加载 (LQ/HQ 切换)
- loadVideo(file) - 视频播放
- handleImageDoubleClick() - 双击加载 HQ 原图
- zoomIn() / zoomOut() - 缩放控制
```

**HQ/LQ 切换逻辑**:
```javascript
// 双击图片触发
getHQImageUrl(series, chapter, filename) {
  // 将 /api/image/ 转换为 /hq_image/ 路径
  return `/hq_image/${encodeURIComponent(series)}/${encodeURIComponent(chapter)}/${encodeURIComponent(filename)}`;
}
```

### 3. 预加载系统

**职责**: 下一章元数据 + 图片预加载

```javascript
// 预加载策略
- preloadNextChapter() - 预加载下一章元数据
- prefetchImages() - 预加载后续图片
- IntersectionObserver - 懒加载可见区域图片
```

### 4. 响应式布局

**断点**:
- Mobile: < 768px (侧边栏抽屉式)
- Tablet: 768px - 1024px
- Desktop: > 1024px (侧边栏固定)

**关键 CSS**:
```css
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    position: fixed;
  }
  .sidebar.open {
    transform: translateX(0);
  }
}
```

### 5. 键盘控制

| 按键 | 功能 |
|------|------|
| `←` / `A` | 上一章 |
| `→` / `D` | 下一章 |
| `Home` | 回顶部 |
| `End` | 去底部 |
| `+` / `=` | 放大 |
| `-` | 缩小 |
| `Esc` | 关闭侧边栏 |

## 文件组织

### index.html 结构

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Meta + Tailwind CDN + Google Fonts + Custom CSS -->
  <style>
    /* 自定义 CSS (动画、滚动条、玻璃效果) */
  </style>
</head>
<body>
  <!-- UI 结构 -->
  <div id="app">
    <aside class="sidebar">...</aside>
    <main class="reader">...</main>
  </div>
  
  <script>
    // 所有 JavaScript 逻辑 (约 2000 行)
    // 模块化组织 (功能分离，但无 ES6 modules)
  </script>
</body>
</html>
```

### JavaScript 模块划分 (逻辑分离)

```javascript
// 1. 状态管理
const state = {
  series: [],
  chapters: {},
  currentSeries: null,
  currentChapter: null,
  files: []
};

// 2. API 调用层
async function apiSeries() { ... }
async function apiChapters(series) { ... }
async function apiChapterFiles(series, chapter) { ... }

// 3. UI 渲染层
function renderSidebar() { ... }
function renderReader() { ... }
function updateProgress() { ... }

// 4. 事件处理
function onKeyDown(e) { ... }
function onImageClick(e) { ... }
function onSidebarToggle() { ... }

// 5. 工具函数
function naturalSort(a, b) { ... }
function debounce(fn, delay) { ... }
function saveState() { ... }
function loadState() { ... }
```

## 开发规范

### 必须遵守

- **语法**: ES6+ (const/let, async/await, 箭头函数)
- **命名**: 
  - 变量/函数: camelCase
  - DOM 元素: 以 `El` 或 `Element` 结尾 (例：`readerEl`)
  - 事件处理: 以 `on` 前缀 (例：`onClick`, `onScroll`)
  - CSS 类: kebab-case
- **注释**: 复杂逻辑必须注释，API 调用说明参数用途
- **错误处理**: 全局 `window.onerror` + `Promise.reject` 监听

### 禁止模式

- ❌ 使用 `var` - 必须使用 `const` 或 `let`
- ❌ 内联样式 (除动态计算值) - 使用 Tailwind 类
- ❌ 直接操作 DOM 不加缓存 - 缓存 DOM 引用
- ❌ 无错误处理的 async 操作 - 必须 try-catch

### 代码风格

```javascript
// ✅ 推荐
const readerEl = document.getElementById('reader');
const onClickImage = async (event) => {
  try {
    const file = event.target.dataset.file;
    await loadImage(file);
  } catch (error) {
    console.error('图片加载失败:', error);
  }
};

// ❌ 禁止
var reader = document.getElementById('reader');
function onClickImage(event) {
  var file = event.target.dataset.file;
  loadImage(file); // 无错误处理
}
```

## 性能优化

### 已实现

1. **图片懒加载**: Intersection Observer API
2. **虚拟滚动**: 大文件列表分批加载 (每批 5 个)
3. **本地缓存**: LocalStorage 持久化阅读进度
4. **防抖处理**: 搜索和滚动事件防抖
5. **预加载**: 下一章元数据预取

### 待优化

1. **图片预加载队列**: 当前章节后 3 张图片预加载
2. **内存管理**: 离开章节时释放 DOM 节点
3. **Service Worker**: 离线缓存支持

## 构建与部署

### 开发模式

```bash
cd frontend
python -m http.server 8080
# 访问 http://localhost:8080
```

### 生产部署

**Nginx 配置**:
```nginx
location / {
  root /app/frontend;
  index index.html;
  try_files $uri $uri/ /index.html;
}

# 静态资源缓存
location ~* \.(jpg|jpeg|png|webp|mp4)$ {
  expires 30d;
  add_header Cache-Control "public, immutable";
}
```

### Docker 部署

```yaml
# docker-compose.yml
services:
  frontend:
    image: nginx:alpine
    volumes:
      - ./frontend:/usr/share/nginx/html
    ports:
      - "5000:80"
```

## 测试指南

### 手动测试清单

1. **基础功能**:
   - [ ] 系列列表加载
   - [ ] 章节树展开/收起
   - [ ] 图片正常加载
   - [ ] 视频播放正常

2. **交互测试**:
   - [ ] 侧边栏开关动画
   - [ ] 双击图片加载 HQ
   - [ ] 键盘快捷键响应
   - [ ] 缩放功能正常

3. **响应式测试**:
   - [ ] 移动端侧边栏抽屉
   - [ ] 平板布局适配
   - [ ] 桌面端固定侧边栏

4. **持久化测试**:
   - [ ] 刷新后阅读进度保留
   - [ ] LocalStorage 数据正确

### ESLint 检查

```bash
npx eslint frontend/index.html
npx eslint frontend/ --fix  # 自动修复
```

## 常见问题

### 侧边栏在移动端无法显示

**检查**:
1. CSS 媒体查询断点是否正确
2. transform 属性是否被覆盖
3. z-index 层级是否足够

### 双击图片无法加载 HQ

**检查**:
1. HQ 图片文件是否存在于 `h_photograph` 目录
2. Nginx `/hq_image/` 路径映射是否正确
3. URL 编码是否处理中文字符

### 图片加载缓慢

**优化**:
1. 检查 LQ WebP 文件是否存在
2. 验证 Redis 缓存是否命中
3. 调整图片预加载策略

### LocalStorage 数据丢失

**排查**:
1. 检查浏览器隐私模式
2. 验证 localStorage 容量限制
3. 确认 JSON 序列化无循环引用

## 与后端集成

### API 接口

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/series` | GET | 获取漫画系列列表 |
| `/api/chapters/{series}` | GET | 获取章节列表 |
| `/api/chapter/{series}?chapterPath={path}` | GET | 获取章节文件列表 |
| `/api/image/{series}/{filename}?chapterPath={path}` | GET | 智能图片服务 |
| `/hq_image/{series}/{chapter}/{filename}` | GET | HQ 静态图片 |
| `/video/{series}/{chapter}/{filename}` | GET | 视频文件 |

### 错误处理

```javascript
async function fetchApi(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API 请求失败:', error);
    // 降级处理：显示错误提示或重试
    throw error;
  }
}
```

## 已知问题

1. **代码难以维护**: 单文件 2297 行，缺乏模块化
2. **无自动化测试**: 仅依赖手动测试
3. **全局命名空间污染**: 所有函数在全局作用域
4. **无类型检查**: 纯 JavaScript，无 TypeScript
5. **vue3-app 目录未使用**: 存在但未作为主前端使用
## 重构建议 (如果未来迁移)

### 推荐方案：Vue 3 + Vite

```bash
# 使用现有的 vue3-app 目录
cd frontend/vue3-app
npm install
npm run dev
```

**迁移优先级**:
1. 组件拆分 (Sidebar, Reader, ChapterTree)
2. 状态管理 (Pinia store)
3. TypeScript 类型定义
4. Vitest 单元测试

### 备选方案：React + Vite

- 组件化架构
- Zustand 状态管理
- React Query 数据获取

## 相关文档
- 根目录 [`../AGENTS.md`](../AGENTS.md) - 项目全局指南
- 后端 [`../backend/comic/AGENTS.md`](../backend/comic/AGENTS.md) - API 接口定义
- Nginx [`../nginx.conf`](../nginx.conf) - 静态文件服务配置

## 项目层级
```
./AGENTS.md (根)
├── frontend/AGENTS.md (本文件 - 416 行)
└── vue3-app/ (未使用)
