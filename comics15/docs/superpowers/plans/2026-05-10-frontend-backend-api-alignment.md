# 前端后端接口完整对接实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复前端与后端 API 契约不一致问题，使前端直接使用后端返回的 URL 字段，移除手动 URL 构建逻辑。

**Architecture:** 
- 后端 `/api/chapter/{seriesName}` 返回的每个文件对象包含 `hq.url`, `lq.url`, `videoUrl`, `preferredSource` 字段
- 前端应直接使用这些字段，而非手动拼接 URL
- Nginx 负责静态资源服务，`/hq_image/`, `/lq_image/`, `/video/` 路径保持不变

**TDD:** 每个修改都需要先更新测试，确保测试反映新的接口契约。

---

## 任务清单

### 任务 1: 统一 API 服务 - 合并 api.js 和 catalog-api.js

**目标:** 消除重复定义，统一漫画目录 API 调用

**文件映射:**
- `frontend/src/services/api.js` - 主 API 服务，保留所有方法
- `frontend/src/services/catalog-api.js` - 将被删除，方法合并到 api.js
- `frontend/src/services/index.js` - 更新导出

**具体步骤:**

1. **检查重复方法**
   - [ ] 确认 `api.js` 和 `catalog-api.js` 中重复的方法:
     - `getSeries()` - 两者都有
     - `getChapterFiles()` - 两者都有
     - `getLevelNodes()` - 两者都有

2. **更新 api.js**
   - [ ] 确认 api.js 中的方法实现正确（使用 `/api/series`, `/api/chapter/`, `/api/levels/`）
   - [ ] 保留 `buildHQImageUrl()`, `buildLQImageUrl()`, `buildVideoUrl()` 供其他组件临时使用
   - [ ] 标记这些 URL 构建方法为 `@deprecated`

3. **更新 index.js**
   - [ ] 从 `index.js` 中移除 `catalogApi` 导出
   - [ ] 确保所有导入 `catalogApi` 的地方改为导入 `api`

4. **更新调用方**
   - [ ] `chapter-store.js:2` - 从 `catalog-api.js` 改为 `api.js`
   - [ ] `chapter-store.js:61` - 调用从 `catalogApi.getLevelNodes` 改为 `api.getLevelNodes`

5. **删除 catalog-api.js**
   - [ ] 确认所有引用已更新后，删除 `catalog-api.js`
   - [ ] 删除 `catalog-api.test.js` 或合并到 `api.test.js`

**测试验证:**
- [ ] 运行 `npm test` 确保所有测试通过
- [ ] 确认 `api.getSeries()`, `api.getChapterFiles()`, `api.getLevelNodes()` 工作正常

---

### 任务 2: 重构 ReaderMediaItem 使用后端返回的 URL

**目标:** 修改阅读器组件，直接使用后端返回的 `hq.url`, `lq.url`, `videoUrl`

**文件映射:**
- `frontend/src/components/ReaderMediaItem.vue` - 需要重构的组件
- `frontend/src/components/ReaderMediaItem.test.js` - 需要更新的测试

**当前问题:**
```javascript
// 当前代码 (ReaderMediaItem.vue:140-151)
if (isVideoPath) {
    url = api.buildVideoUrl(props.seriesName, props.filename, props.pathId);
} else {
    if (forceHQ || props.coverSource === 'hq') {
        url = api.buildHQImageUrl(props.seriesName, props.filename, props.pathId);
    } else if (props.coverSource === 'lq') {
        url = api.buildLQImageUrl(props.seriesName, props.filename, props.pathId);
    } else {
        const imageSource = await api.resolveImageUrl(...); // 手动 HEAD 检查
        url = imageSource.url;
    }
}
```

**期望行为:**
- 组件接收完整的文件对象，包含 `hq.url`, `lq.url`, `videoUrl`, `preferredSource`, `mediaType`
- 根据 `mediaType` 和 `preferredSource` 直接使用对应的 URL

**具体步骤:**

1. **更新 Props 定义**
   - [ ] 将 `filename`, `pathId`, `seriesName`, `coverSource` props 改为接收完整的 `file` 对象
   - [ ] 新的 props: `file: Object` (包含 hq, lq, videoUrl, preferredSource, mediaType, name 等)
   - [ ] 保留 `index`, `scale` props

2. **重构 loadMedia 方法**
   - [ ] 移除 `api.buildHQImageUrl()`, `api.buildLQImageUrl()`, `api.buildVideoUrl()` 调用
   - [ ] 根据 `file.mediaType` 选择 URL:
     - `mediaType === 'video'` → 使用 `file.videoUrl`
     - `mediaType === 'gif'` → 使用 `file.videoUrl` (后端将 gif 归为 video)
     - `mediaType === 'image'` → 根据 `preferredSource` 选择 `file.lq.url` 或 `file.hq.url`
   - [ ] 保留 `forceHQ` 逻辑: 当 `forceHQ` 为 true 时直接使用 `file.hq.url`
   - [ ] 保留 LQ 加载失败回退 HQ 逻辑

3. **更新模板中的数据绑定**
   - [ ] 更新 `:data-filename="file.name"`
   - [ ] 更新 `:alt="file.name"`
   - [ ] 其他使用 props.filename 的地方改为 file.name

4. **更新错误处理**
   - [ ] LQ 加载失败时，回退到 `file.hq.url`（而非手动构建）
   - [ ] 视频加载失败保持现有行为

5. **更新父组件 ReaderPage**
   - [ ] `:filename="file.filename"` → `:file="file"`
   - [ ] 移除 `:path-id`, `:series-name`, `:cover-source` 绑定

6. **更新测试**
   - [ ] 修改测试用例，提供完整的 file 对象 mock 数据
   - [ ] 验证使用 `file.hq.url`, `file.lq.url`, `file.videoUrl`
   - [ ] 移除对 `api.buildHQImageUrl`, `api.buildLQImageUrl`, `api.buildVideoUrl` 的 mock

**测试验证:**
- [ ] 图片类型使用正确的 URL (LQ 优先或 HQ 优先)
- [ ] 视频类型使用 videoUrl
- [ ] LQ 加载失败正确回退 HQ
- [ ] forceHQ 强制使用 HQ

---

### 任务 3: 重构章节封面使用后端返回的 URL

**目标:** 修改章节封面获取逻辑，使用后端返回的 cover URL

**文件映射:**
- `frontend/src/utils/chapter-cover-meta.js` - 封面元数据工具
- `frontend/src/utils/chapter-cover-meta.test.js` - 测试
- `frontend/src/services/chapter-meta-cache.js` - 缓存封装

**当前问题:**
```javascript
// chapter-cover-meta.js:14-16
const coverUrl = chapter.cover_source === 'lq'
    ? api.buildLQImageUrl(seriesName, chapter.cover_file, chapter.path_id)
    : api.buildHQImageUrl(seriesName, chapter.cover_file, chapter.path_id);
```

**期望行为:**
- 后端 `/api/levels/{seriesName}` 返回的 chapter 节点应包含 `coverUrl` 字段
- 或者前端使用 `cover_source` + `cover_file` 构建 URL，但需要确保与后端契约一致

**注意:** 根据 backend-api.md，后端返回的是 `cover_file` 和 `cover_source`，没有直接的 `coverUrl`。因此这个任务需要：
1. 要么后端 API 增加 `coverUrl` 字段
2. 要么前端继续构建 URL，但使用与后端一致的 URL 格式

**决策:** 保持现状，因为后端确实没有提供 coverUrl。但需要确认 URL 构建格式正确。

**具体步骤:**

1. **验证 URL 格式一致性**
   - [ ] 确认 `api.buildLQImageUrl()` 和 `api.buildHQImageUrl()` 构建的 URL 格式与 Nginx 配置匹配
   - [ ] 格式: `/hq_image/{series}/{chapterPath}/{filename}`
   - [ ] 确保中文路径分段编码

2. **更新章节 store（如需要）**
   - [ ] 如果章节数据结构变化，更新 `chapter-store.js` 中的字段访问

**测试验证:**
- [ ] 封面图片正确加载
- [ ] 中文系列名和章节路径正确编码

---

### 任务 4: 移除冗余的 LQ/HQ 检查逻辑

**目标:** 移除 `api.resolveImageUrl()` 中的手动 HEAD 检查，依赖后端的 `preferredSource`

**文件映射:**
- `frontend/src/services/api.js` - 包含 resolveImageUrl 方法
- `frontend/src/services/media-url.js` - 包含 checkLQImageExists

**当前问题:**
```javascript
// api.js:106-121
async resolveImageUrl(seriesName, filename, chapterPath) {
    const lqUrl = this.buildLQImageUrl(seriesName, filename, chapterPath);
    const lqExists = await this.checkLQImageExists(lqUrl); // 手动 HEAD 请求
    if (lqExists) {
        return { url: lqUrl, source: 'lq' };
    }
    return { url: this.buildHQImageUrl(...), source: 'hq' };
}
```

**期望行为:**
- 后端已经通过 `preferredSource` 字段告知前端应该使用哪个版本
- 前端不应再发送额外的 HEAD 请求检查 LQ 存在性

**具体步骤:**

1. **标记方法为废弃**
   - [ ] 在 `api.js` 和 `media-url.js` 中的相关方法添加 `@deprecated` 注释
   - [ ] 说明这些方法不再被 ReaderMediaItem 使用

2. **确认无其他调用方**
   - [ ] 搜索所有使用 `resolveImageUrl`, `checkLQImageExists`, `checkHQImageUsable` 的地方
   - [ ] 确认 ReaderMediaItem 重构后不再使用这些方法

3. **可选：完全删除**
   - [ ] 如果确认无其他调用方，可以删除这些方法
   - [ ] 或者保留但标记为废弃，供其他用途使用

**测试验证:**
- [ ] 确认没有其他组件依赖这些方法
- [ ] 阅读器正常工作，无额外 HEAD 请求

---

### 任务 5: 修复 tools-api.js 缺失的方法

**目标:** 修复或移除 `tools-api.js` 中调用不存在的 `api.getChapters()`

**文件映射:**
- `frontend/src/services/tools-api.js` - 包含错误调用

**当前问题:**
```javascript
// tools-api.js:67-73
async getChapters(seriesName) {
    try {
        return await api.getChapters(seriesName); // api.js 中没有此方法
    } catch (error) {
        throw new ToolsApiError('获取章节列表失败', error.status);
    }
}
```

**分析:** 
- `tools-api.js:84-90` 中 `loadSeries()` 调用 `toolsApi.getSeries()`，该方法又调用 `api.getSeries()` - 这是正确的
- 但 `getChapters` 方法调用 `api.getChapters()` 不存在

**检查调用方:**
- [ ] 搜索 `toolsApi.getChapters` 的使用
- [ ] 如果无调用方，直接删除该方法
- [ ] 如果有调用方，需要实现正确的章节获取逻辑（可能是调用 `api.getLevelNodes`）

**具体步骤:**

1. **查找调用方**
   - [ ] `grep -r "getChapters" frontend/src --include="*.js" --include="*.vue"`

2. **决策并实施**
   - [ ] 如果无调用方：删除 `getChapters` 方法
   - [ ] 如果有调用方：实现 `api.getChapters()` 或使用现有方法替代

**测试验证:**
- [ ] 工具页面正常工作
- [ ] 无运行时错误

---

### 任务 6: 更新测试文件适配新接口

**目标:** 更新所有受影响的测试文件

**文件映射:**
- `frontend/src/services/api.test.js` - 可能需要更新（如果修改了 api.js）
- `frontend/src/components/ReaderMediaItem.test.js` - 必须更新
- `frontend/src/services/chapter-meta-cache.test.js` - 可能需要更新
- `frontend/src/utils/chapter-cover-meta.test.js` - 可能需要更新

**具体步骤:**

1. **ReaderMediaItem.test.js**
   - [ ] 更新 mock 数据，提供完整的 file 对象结构
   - [ ] 移除对 `api.buildHQImageUrl`, `api.buildLQImageUrl`, `api.buildVideoUrl` 的 mock
   - [ ] 添加 `file.hq.url`, `file.lq.url`, `file.videoUrl` mock
   - [ ] 更新测试用例验证新的 URL 使用方式

2. **api.test.js**
   - [ ] 如果保留了 URL 构建方法，确保测试覆盖
   - [ ] 如果删除了方法，移除对应测试

3. **其他测试**
   - [ ] 检查并更新所有受影响的测试

**测试验证:**
- [ ] 运行 `npm test` 所有测试通过
- [ ] 运行 `npm run test:coverage` 检查覆盖率

---

### 任务 7: 运行测试并验证修复

**目标:** 全面验证所有修改

**具体步骤:**

1. **单元测试**
   - [ ] `cd frontend && npm test` - 所有测试通过
   - [ ] `npm run test:coverage` - 覆盖率不低于修改前

2. **构建测试**
   - [ ] `npm run build` - 构建成功，无错误
   - [ ] `npm run preview` - 预览版本正常工作

3. **Lint 检查**
   - [ ] `npm run lint` - 无错误
   - [ ] `npm run lint:fix` - 自动修复可修复的问题

4. **开发环境测试** (如可能)
   - [ ] 启动后端 (`./mvnw spring-boot:run`)
   - [ ] 启动前端 (`npm run dev`)
   - [ ] 测试系列列表加载
   - [ ] 测试目录浏览
   - [ ] 测试阅读器图片加载（LQ 和 HQ）
   - [ ] 测试视频加载
   - [ ] 测试 LQ 缺失时回退 HQ

**测试验证:**
- [ ] 所有测试通过
- [ ] 构建成功
- [ ] 开发环境功能正常

---

## 文件变更汇总

### 修改的文件
1. `frontend/src/services/api.js` - 标记废弃方法
2. `frontend/src/services/index.js` - 移除 catalogApi 导出
3. `frontend/src/services/tools-api.js` - 修复/移除 getChapters
4. `frontend/src/stores/chapter-store.js` - 导入改为 api.js
5. `frontend/src/components/ReaderMediaItem.vue` - 重构使用 file 对象
6. `frontend/src/pages/ReaderPage.vue` - 更新 props 传递

### 删除的文件
1. `frontend/src/services/catalog-api.js`
2. `frontend/src/services/catalog-api.test.js`

### 更新的测试文件
1. `frontend/src/components/ReaderMediaItem.test.js`
2. `frontend/src/services/api.test.js` (如需要)

---

## 依赖关系

```
任务 1 (统一 API) → 任务 2 (ReaderMediaItem) → 任务 6 (测试更新) → 任务 7 (验证)
                ↘ 任务 3 (封面) ↗
                ↘ 任务 4 (移除冗余) ↗
                ↘ 任务 5 (修复 tools-api) ↗
```

**关键路径:** 任务 1 → 任务 2 → 任务 6 → 任务 7

---

## 注意事项

1. **向后兼容性:** ReaderMediaItem 的 props 变更是破坏性变更，需要同时更新 ReaderPage
2. **Nginx 配置:** 保持现有的 `/hq_image/`, `/lq_image/`, `/video/` 静态路径配置
3. **中文编码:** 确保 URL 中的中文路径分段编码正确
4. **LQ 回退:** ReaderMediaItem 仍需保留 LQ 加载失败回退 HQ 的逻辑（通过 onerror 事件）

---

## 预期结果

完成后，前端将：
1. ✅ 直接使用后端返回的 `hq.url`, `lq.url`, `videoUrl`
2. ✅ 根据 `preferredSource` 选择图片版本
3. ✅ 不再发送额外的 HEAD 请求检查 LQ 存在性
4. ✅ 消除重复 API 定义
5. ✅ 消除缺失方法调用错误
6. ✅ 所有测试通过
