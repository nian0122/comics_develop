# 重构章节封面：整合 cover_file/cover_source 为 cover_url 实现计划

> **Goal:** 后端直接生成封面 URL，前端直接使用，不做来源判断

## 背景

当前章节节点（`buildLevelChapterNode`）和旧章节列表（`buildChapterData`）返回：`cover_file` + `cover_source`（"lq"/"hq"），前端需要根据来源拼接 URL。目标是后端直接返回 `cover_url`，前端直接使用。

## 文件结构

### 后端（Java）
- `backend/src/main/java/com/nianer/comic/Service/ComicMediaService.java`
  - `buildLevelChapterNode()` - 层级接口章节节点构建（第 170 行）
  - `buildChapterData()` - 旧章节列表章节数据构建（第 128 行）
  - `resolveCoverSource()` - 判断封面来源（第 327 行，修改后不再返回 source 字符串）
  - 新增 `buildCoverUrl()` - 直接生成封面 URL

### 后端测试（Java）
- `backend/src/test/java/com/nianer/comic/Controller/ComicControllerTest.java`
  - 测试断言需要更新（第 85-86、110-111、130-131 行）

### 前端（JavaScript）
- `frontend/src/utils/chapter-cover-meta.js` - 章节封面元数据处理
- `frontend/src/utils/chapter-cover-meta.test.js` - 对应测试
- `frontend/src/utils/chapter-tree.test.js` - 章节树测试（第 67-68 行）
- `frontend/src/components/ReaderMediaItem.vue` - 可能使用 `cover_source`
- `frontend/src/services/chapter-meta-cache.test.js` - 缓存测试

## 任务清单

### 后端修改

- [ ] **任务 1**: 修改 `ComicMediaService.java` - 添加 `buildCoverUrl()` 方法
  - 根据 LQ 是否存在，直接返回 LQ 或 HQ 的完整 URL
  - URL 格式与现有 `buildLQUrl`/`buildHQUrl` 保持一致

- [ ] **任务 2**: 修改 `buildLevelChapterNode()` 方法
  - 移除 `cover_file` 和 `cover_source` 字段
  - 添加 `cover_url` 字段，值为 `buildCoverUrl()` 结果

- [ ] **任务 3**: 修改 `buildChapterData()` 方法
  - 同样移除 `cover_file` 和 `cover_source`
  - 添加 `cover_url` 字段

- [ ] **任务 4**: 更新后端测试 `ComicControllerTest.java`
  - 更新 `listLevelNodesReturnsDirectDirectoriesAndChapters` 测试断言
  - 更新 `listLevelNodesDecodesPathAndReturnsCurrentLevelChildren` 测试断言
  - 更新 `listLevelNodesUsesChapterPreviewWithoutFullMediaList` 测试断言

### 前端修改

- [ ] **任务 5**: 修改 `chapter-cover-meta.js`
  - 简化逻辑：直接使用 `chapter.cover_url`，不再判断 `cover_source`
  - 移除 `coverSource` 返回字段（或保留为空字符串向后兼容）

- [ ] **任务 6**: 更新前端测试 `chapter-cover-meta.test.js`
  - 更新测试用例的输入数据，使用 `cover_url` 替代 `cover_file`/`cover_source`
  - 更新预期输出

- [ ] **任务 7**: 更新 `chapter-tree.test.js`
  - 更新测试数据（第 61 行）和断言（第 67-68 行）

- [ ] **任务 8**: 检查并更新其他使用 `cover_file`/`cover_source` 的文件
  - `chapter-meta-cache.test.js`
  - `ReaderMediaItem.vue`

## 实现细节

### 后端 `buildCoverUrl()` 伪代码

```java
private String buildCoverUrl(String seriesName, String chapterPath, String coverFile) {
    String baseName = stripExtension(coverFile);
    Path lqCoverPath = config.getLqPath().resolve(seriesName).resolve(chapterPath).resolve(baseName + ".webp");
    if (Files.exists(lqCoverPath)) {
        return buildLQUrl(seriesName, chapterPath, baseName + ".webp");
    } else {
        return buildHQUrl(seriesName, chapterPath, coverFile);
    }
}
```

### 前端简化后的 `getChapterCoverMeta()`

```javascript
export function getChapterCoverMeta(chapter, seriesName) {
    const totalPages = Number.parseInt(chapter?.total_files, 10);
    if (!chapter?.cover_url) {
        return {
            totalPages: Number.isNaN(totalPages) ? 0 : total_pages,
            files: [],
            coverUrl: '',
            coverSource: '',
        };
    }

    return {
        totalPages: Number.isNaN(totalPages) ? 0 : total_pages,
        files: [],
        coverUrl: chapter.cover_url,
        coverSource: '',  // 保持向后兼容但为空
    };
}
```

## 验证步骤

1. 运行后端测试：`./mvnw test -Dtest=ComicControllerTest`
2. 运行前端测试：`npm test`
3. 手动验证层级接口返回的章节节点包含 `cover_url` 且无 `cover_file`/`cover_source`
4. 手动验证目录页章节封面正常加载

## 注意事项

- 保持 URL 编码逻辑一致，中文路径需要正确编码
- 确保 LQ 不存在时回退到 HQ 的逻辑正确
- 前端保持 `coverSource` 字段向后兼容（虽然为空）
