# 后端 Cache 优化设计

## 背景

当前后端缓存集中在 `ComicCacheService`，由 `ComicCatalogService` 调用。缓存介质是 Redis 字符串，值为 JSON，默认 TTL 为 604800 秒；Redis 不可用时通过 `RedisValidator.REDIS_ENABLED` 降级到文件系统扫描。

现有缓存键包括：

- `series_list`
- `chapter_files:{series}:{chapter}`
- `v2:level:{series}:{path}`

文档中仍记录了历史键 `chapters_list:{series}`，但当前主代码未使用。

## 目标

本次优化优先做低风险缓存边界增强，不改变现有 API 契约和前端调用方式。

成功标准：

1. Redis 读取、写入、JSON 反序列化失败时，后端能够记录明确日志并降级到文件系统扫描。
2. 脏缓存或旧结构缓存不会直接导致接口失败。
3. 缓存键生成逻辑集中，避免后续新增缓存时手写字符串分散。
4. 保持 Redis 不可用时的现有行为：直接扫描文件系统并返回结果。
5. 增加针对缓存命中、缓存损坏降级、缓存写入失败不影响主流程的后端测试。

## 非目标

- 不引入新缓存中间件。
- 不改变接口响应字段。
- 不改变 Nginx 静态资源策略。
- 不在本次实现文件系统事件监听或自动增量索引。
- 不修改前端图片来源判断逻辑。

## 备选方案

### 方案 A：只调整 TTL 和配置

优点是改动极小，几乎没有兼容风险。缺点是无法解决脏缓存、Redis 异常、键分散和日志不足的问题。

### 方案 B：增强现有缓存服务（推荐）

在 `ComicCacheService` 内部统一处理 Redis 访问异常、JSON 解析异常和写入异常；读取失败返回 `Optional.empty()`，由调用方继续走文件扫描。新增缓存键构造辅助方法或常量类，保留当前键名兼容已有 Redis 数据。该方案收益明确，改动集中，适合当前阶段。

### 方案 C：引入目录索引和主动失效

建立章节/文件索引，提供刷新 API 或后台扫描任务。性能上限最高，但会引入状态同步、刷新时机、并发一致性和工具执行后的失效策略，适合在方案 B 稳定后单独设计。

## 推荐设计

采用方案 B。

### 缓存服务行为

`ComicCacheService.get(...)` 保持返回 `Optional<T>`，但内部捕获 Redis 连接错误、读取错误和 JSON 反序列化错误。出现异常时记录带缓存键和业务前缀的警告日志，并返回 `Optional.empty()`。

`ComicCacheService.put(...)` 捕获 Redis 写入和 JSON 序列化异常。写缓存失败只记录警告，不影响接口主流程。

### 缓存键管理

新增集中式缓存键方法，建议放在 `ComicCacheService` 中作为静态方法，或新增轻量 `ComicCacheKeys`。为减少文件数量和过度设计，首选在 `ComicCacheService` 中提供：

- `seriesListKey()`
- `chapterFilesKey(String seriesName, String chapterPath)`
- `levelNodesKey(String seriesName, String decodedPath)`

这些方法必须返回与当前实现完全一致的键名，避免破坏已有 Redis 缓存。

### Catalog 调用方调整

`ComicCatalogService` 不再手写缓存键字符串，改用统一方法。业务流程不变：先读缓存，未命中或读取失败后扫描文件系统，再尝试写缓存。

### 日志策略

缓存命中和未命中保留 `info`。异常降级使用 `warn`，日志使用 `{}` 占位符，包含业务前缀、缓存键和异常摘要。

### 测试策略

新增或扩展 `ComicCatalogServiceTest` / `ComicCacheServiceTest`：

1. Redis 返回有效 JSON 时命中缓存，不触发对应扫描结果变化。
2. Redis 返回非法 JSON 时接口仍返回文件系统扫描结果。
3. Redis 读取抛异常时接口仍返回文件系统扫描结果。
4. Redis 写入抛异常时接口仍返回扫描结果。
5. 缓存键方法输出与旧键名一致。

## 风险与缓解

- 风险：捕获过宽可能隐藏真实代码错误。缓解：只在缓存边界捕获 Redis/Jackson 相关异常，业务扫描异常仍向上抛出。
- 风险：键集中化时拼写变化导致旧缓存失效。缓解：测试固定三个键名输出。
- 风险：日志过多。缓解：正常命中/未命中维持当前粒度，异常才新增 `warn`。

## 实施边界

预计改动文件：

- `backend/src/main/java/com/nianer/comic/Service/ComicCacheService.java`
- `backend/src/main/java/com/nianer/comic/Service/ComicCatalogService.java`
- `backend/src/test/java/com/nianer/comic/Service/ComicCatalogServiceTest.java`
- 可能新增 `backend/src/test/java/com/nianer/comic/Service/ComicCacheServiceTest.java`

验证命令：

```bash
cd backend
./mvnw test -Dtest=ComicCatalogServiceTest,ComicCacheServiceTest
./mvnw test
./mvnw clean compile
```

## 自检

- 无占位符或待补字段。
- 设计保持现有 API 和缓存键兼容。
- 设计没有要求修改前端或部署拓扑。
- 风险、测试和验证命令已明确。
