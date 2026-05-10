# 前端目录结构优化实施计划（混合方案C）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化 Vue3 前端项目目录结构，合并冗余目录，明确各目录职责，提升代码可维护性和可扩展性。

**Architecture:** 采用混合方案（Domain + Feature分层），保持现有 pages/components/services/stores/utils 分层结构，同时创建 composables/ 目录分离 Vue 组合式逻辑。

**Stack:** Vue 3 + Pinia + Vue Router + Vite

---

## 背景分析

### 当前问题
1. **冗余目录**: `state/` 和 `stores/` 功能重叠，`app/` 与 `utils/` 边界模糊
2. **命名不清晰**: `js/` 目录实际存放工具页入口，命名误导
3. **职责混杂**: `utils/` 中既有纯工具函数，又有 Vue 相关的逻辑
4. **测试文件分散**: 与源文件同级，虽符合 Vite 惯例但视觉上较乱

### 预期目标结构
```
frontend/
├── index.html
├── tools.html
├── src/
│   ├── main.js / App.vue
│   ├── pages/              # 页面级组件
│   ├── components/         # 可复用组件 (tools/ 子目录保留)
│   ├── composables/        # Vue3 组合式函数 (新增)
│   ├── stores/             # Pinia 状态管理 (合并 state/)
│   ├── services/           # API + 持久化服务
│   ├── utils/              # 纯工具函数 (Vue无关)
│   ├── router/             # 路由配置
│   └── config/             # 常量配置
├── tools/                  # 重命名: 原 js/ (工具页入口)
└── css/
```

---

## Phase 1: 创建新目录结构

### Task 1.1: 创建 composables/ 目录
- [ ] 创建 `frontend/src/composables/` 目录
- [ ] 创建 `frontend/src/composables/index.js` 入口文件（初始为空，仅导出）
- [ ] 验证目录创建成功

**文件:** `frontend/src/composables/index.js`
```javascript
// Vue3 组合式函数统一导出
// 本目录存放与 Vue 相关的组合式逻辑

export {};
```

### Task 1.2: 创建 tools/ 目录（重命名 js/）
- [ ] 创建 `frontend/tools/` 目录
- [ ] 复制原 `frontend/js/` 所有内容到 `frontend/tools/`
- [ ] 验证复制成功

**注意:** 保留原 `js/` 目录，Phase 4 再删除（保证迁移过程中可回退）

### Task 1.3: 更新 tools.html 引用
- [ ] 修改 `frontend/tools.html` 中的 script src 从 `js/tools-main.js` 改为 `tools/main.js`

**文件:** `frontend/tools.html`
```html
<!-- 找到 script src="js/tools-main.js" -->
<!-- 改为 -->
<script type="module" src="tools/main.js"></script>
```

---

## Phase 2: 迁移 utils/ 中的 Vue 相关逻辑

### Task 2.1: 分析 utils/ 中 Vue 相关文件
检查以下文件是否有 Vue 依赖：
- `debounce.js` - 纯函数，保留在 utils/
- `dom.js` - 可能含 Vue 相关，检查
- `lazy-cover.js` - 可能含 Vue 相关，检查
- `request-queue.js` - 检查

**命令:** 检查每个文件是否 import vue
```bash
grep -l "from 'vue'" frontend/src/utils/*.js
```

### Task 2.2: 创建 debounce 组合式函数
- [ ] 在 `composables/` 中创建 `useDebounce.js`
- [ ] 将 `utils/debounce.js` 中与 Vue 相关的逻辑（如果有）迁移至此
- [ ] 原 `utils/debounce.js` 保留（纯函数版本）

**文件:** `frontend/src/composables/useDebounce.js`
```javascript
import { ref, watch } from 'vue';

/**
 * Vue3 组合式防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟毫秒数
 * @returns {Object} { value, setValue, flush, cancel }
 */
export function useDebounce(fn, delay = 300) {
    // 实现...
}
```

**文件:** `frontend/src/composables/index.js`
```javascript
export { useDebounce } from './useDebounce.js';
```

### Task 2.3: 迁移 lazy-cover.js 中的 Vue 逻辑（如需要）
- [ ] 检查 `utils/lazy-cover.js` 内容
- [ ] 如果包含 Vue 组合式逻辑，创建 `composables/useLazyCover.js`
- [ ] 更新原文件或保持原样（视具体情况）

---

## Phase 3: 合并 state/ 到 stores/

### Task 3.1: 分析 state/ 内容
- [ ] 读取 `frontend/src/state/index.js`
- [ ] 读取 `frontend/src/state/progress-state.js`
- [ ] 读取 `frontend/src/state/store.js`

**分析:** 
- `progress-state.js` - 阅读进度状态管理
- `store.js` - 通用存储工具

### Task 3.2: 迁移 progress-state.js
- [ ] 将 `state/progress-state.js` 移动到 `stores/progress-state.js`
- [ ] 更新 `stores/index.js` 导出
- [ ] 更新所有引用 `state/progress-state` 的文件

**文件:** `frontend/src/stores/index.js`
```javascript
export { useSeriesStore } from './series-store.js';
export { useChapterStore } from './chapter-store.js';
export { useReaderStore } from './reader-store.js';
export { useProgressStore } from './progress-store.js';
export { useToolsStore } from './tools-store.js';

// 从 state/ 迁移来的
export { progressState } from './progress-state.js';
```

### Task 3.3: 迁移 store.js
- [ ] 将 `state/store.js` 移动到 `stores/store.js`（或合并到现有文件）
- [ ] 更新引用

### Task 3.4: 更新引用路径
检查并更新以下文件中的引用：
- `src/App.vue`
- `src/pages/*.vue`
- `src/components/*.vue`

**命令:** 查找所有引用 state/ 的文件
```bash
grep -r "from.*state/" frontend/src/ --include="*.js" --include="*.vue"
```

### Task 3.5: 删除空 state/ 目录
- [ ] 确认所有引用已更新
- [ ] 删除 `frontend/src/state/` 目录

---

## Phase 4: 清理 app/ 目录

### Task 4.1: 分析 app/ 内容
- [ ] 读取 `frontend/src/app/chapter-meta-cache.js`

### Task 4.2: 决定归属
**选择A:** 将 `chapter-meta-cache.js` 移动到 `services/`
**选择B:** 将 `chapter-meta-cache.js` 移动到 `utils/`
**选择C:** 保持不动（如果它是运行时模块）

推荐 **选择A**（移到 services/），因为 chapter-meta-cache 是数据缓存服务：
- [ ] 移动 `app/chapter-meta-cache.js` 到 `services/chapter-meta-cache.js`
- [ ] 更新 `services/index.js` 导出
- [ ] 更新所有引用

**文件:** `frontend/src/services/index.js`
```javascript
// ...现有导出
export { chapterMetaCache } from './chapter-meta-cache.js';
```

### Task 4.3: 删除 app/ 目录
- [ ] 确认所有引用已更新
- [ ] 删除 `frontend/src/app/` 目录

---

## Phase 5: 更新 tools/ 目录引用

### Task 5.1: 更新 tools-main.js 中的引用
- [ ] 读取 `frontend/tools/main.js`（原 js/tools-main.js）
- [ ] 检查是否有引用 `../src/` 路径的导入
- [ ] 确保引用路径正确

### Task 5.2: 验证 tools.html 加载
- [ ] 检查 `tools.html` 中的 script src 指向正确

---

## Phase 6: 验证和测试

### Task 6.1: 运行 ESLint
- [ ] 运行 `npm run lint`
- [ ] 修复任何路径相关的 lint 错误

### Task 6.2: 运行单元测试
- [ ] 运行 `npm test`
- [ ] 确保所有测试通过

### Task 6.3: 验证开发服务器
- [ ] 运行 `npm run dev`
- [ ] 访问主阅读器 (index.html)
- [ ] 访问工具页 (tools.html)
- [ ] 检查各页面功能正常

### Task 6.4: 验证构建
- [ ] 运行 `npm run build`
- [ ] 确保构建成功，无路径错误

---

## Phase 7: 清理旧文件

### Task 7.1: 删除旧的 js/ 目录
- [ ] 确认 tools/ 目录工作正常
- [ ] 删除 `frontend/js/` 目录

### Task 7.2: 最终验证
- [ ] 再次运行 `npm test`
- [ ] 再次运行 `npm run build`
- [ ] 再次运行 `npm run lint`

---

## 最终目录结构

```
frontend/
├── index.html
├── tools.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── App.test.js
│   ├── pages/
│   │   ├── SeriesPage.vue
│   │   ├── SeriesPage.test.js
│   │   ├── DirectoryPage.vue
│   │   ├── DirectoryPage.test.js
│   │   ├── ReaderPage.vue
│   │   ├── ReaderPage.test.js
│   │   └── ToolsPage.vue
│   ├── components/
│   │   ├── ChapterCard.vue
│   │   ├── ChapterCard.test.js
│   │   ├── ReaderShell.vue
│   │   ├── ReaderShell.test.js
│   │   ├── ReaderMediaItem.vue
│   │   ├── ReaderMediaItem.test.js
│   │   ├── JumpPageModal.vue
│   │   ├── JumpPageModal.test.js
│   │   └── tools/
│   │       ├── ExecutionHistory.vue
│   │       ├── ExecutionPanel.vue
│   │       ├── ToolConfig.vue
│   │       └── ToolList.vue
│   ├── composables/              # 新增
│   │   ├── index.js
│   │   ├── useDebounce.js
│   │   └── useDebounce.test.js
│   ├── stores/                   # 合并 state/
│   │   ├── index.js
│   │   ├── series-store.js
│   │   ├── series-store.test.js
│   │   ├── chapter-store.js
│   │   ├── chapter-store.test.js
│   │   ├── reader-store.js
│   │   ├── reader-store.test.js
│   │   ├── progress-store.js
│   │   ├── progress-store.test.js
│   │   ├── progress-state.js     # 从 state/ 迁移
│   │   ├── progress-state.test.js
│   │   ├── tools-store.js
│   │   ├── store.js                # 从 state/ 迁移
│   │   └── store.test.js
│   ├── services/                 # 合并 app/
│   │   ├── index.js
│   │   ├── catalog-api.js
│   │   ├── catalog-api.test.js
│   │   ├── tools-api.js
│   │   ├── tools-api.test.js
│   │   ├── media-url.js
│   │   ├── storage.js
│   │   ├── storage.test.js
│   │   ├── persistence.js
│   │   ├── persistence.test.js
│   │   ├── api.js
│   │   ├── api.test.js
│   │   └── chapter-meta-cache.js # 从 app/ 迁移
│   ├── utils/                    # 纯工具函数
│   │   ├── index.js
│   │   ├── debounce.js
│   │   ├── debounce.test.js
│   │   ├── dom.js
│   │   ├── dom.test.js
│   │   ├── file-type.js
│   │   ├── file-type.test.js
│   │   ├── natural-sort.js
│   │   ├── natural-sort.test.js
│   │   ├── chapter-tree.js
│   │   ├── chapter-tree.test.js
│   │   ├── request-queue.js
│   │   ├── request-queue.test.js
│   │   ├── lazy-cover.js
│   │   ├── lazy-cover.test.js
│   │   ├── chapter-cover-meta.js
│   │   └── chapter-cover-meta.test.js
│   ├── router/
│   │   ├── index.js
│   │   └── index.test.js
│   └── config/
│       └── constants.js
├── tools/                        # 重命名: 原 js/
│   └── main.js                   # 原 tools-main.js 重命名
└── css/
    ├── variables.css
    ├── components.css
    ├── animations.css
    └── main.css
```

---

## 风险与注意事项

1. **导入路径更新**: 移动文件时必须同步更新所有 import 语句
2. **测试文件**: 测试文件应与源文件保持同级（Vite/Vitest 约定）
3. **git 历史**: 使用 `git mv` 保留文件历史（如果在意）
4. **回退策略**: 每个 Phase 后提交，方便回退

---

## 提交建议

每个 Phase 完成后提交一次：

```bash
git add .
git commit -m "Phase X: [具体描述]"
```

建议提交信息：
1. "Phase 1: 创建 composables/ 和 tools/ 目录结构"
2. "Phase 2: 迁移 Vue 相关逻辑到 composables/"
3. "Phase 3: 合并 state/ 到 stores/"
4. "Phase 4: 移动 app/ 内容到 services/"
5. "Phase 5: 更新 tools/ 目录引用"
6. "Phase 6: 验证测试和构建"
7. "Phase 7: 清理旧 js/ 目录"
