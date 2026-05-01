# AGENTS.md - Backend

## OVERVIEW
Spring Boot 4.0.2 + Java 21 后端。职责：漫画目录索引、Redis 缓存降级、外部 Go 工具异步执行。

## STRUCTURE
```
backend/
├── pom.xml
├── Dockerfile
└── src/main/
    ├── java/com/nianer/comic/
    │   ├── ComicApplication.java
    │   ├── Controller/       # 注意：包名首字母大写，沿用现状
    │   ├── Config/
    │   ├── Component/
    │   ├── Service/
    │   └── Model/
    └── resources/application.yml
```

## WHERE TO LOOK
| 任务 | 位置 | Notes |
|------|------|-------|
| 添加漫画 API | `src/main/java/com/nianer/comic/Controller/ComicController.java` | 必须 Swagger 注解 |
| 添加工具 API | `.../Controller/ToolController.java` | 路径前缀 `/api/tools` |
| 修改缓存策略 | `ComicController.java` | Redis 优先；`REDIS_ENABLED` false 时直接文件扫描 |
| 漫画路径配置 | `Config/ComicConfig.java` + `application.yml` | `comic.root-dir`, `hq-sub-dir`, `lq-sub-dir` |
| 工具路径配置 | `Config/ToolConfig.java` + `application.yml` | `tool.root-dir`, `tool.executables.*` |
| 执行外部工具 | `Service/ToolExecutor.java` | `ExecutorService` + `ProcessBuilder` |
| 执行状态模型 | `Model/ToolExecution.java` | 状态、日志、计数、耗时 |
| Redis 启用检查 | `Component/RedisValidator.java` | 设置静态 `REDIS_ENABLED` |

## COMMANDS
```bash
./mvnw spring-boot:run
./mvnw test
./mvnw test -Dtest=ComicApplicationTests
./mvnw test -Dtest=ComicApplicationTests#contextLoads
./mvnw clean package -DskipTests
```

## CONVENTIONS
- 包名已固化为 `com.nianer.comic.Controller/Config/Component/Service/Model`，不要“顺手”改成小写包。
- 实际导入顺序：项目 `com.nianer.*` → 第三方库 → `java.*` → static；保持周边文件风格。
- 控制器公开方法必须有 `@Operation`、`@Parameter`、`@ApiResponse`；类上加 `@Tag`。
- 日志用 `@Slf4j` 和 `{}` 占位符：`log.info("key={}", key)`。
- 文件扫描使用 `Path`/`Files`、try-with-resources 的 `Stream<Path>`。
- 自然排序统一用 `CaseInsensitiveSimpleNaturalComparator`，不要字典序排序漫画文件。
- Redis 缓存键保持：`series_list`、`chapters_list:{series}`、`chapter_files:{series}:{chapter}`。

## ANTI-PATTERNS
- 不要新增 `java.io.File` 文件操作；`ProcessBuilder.directory(toolPath.getParent().toFile())` 是 API 要求的例外。
- `ToolConfig.java` 如需检查文件存在，优先 `Files.exists(path)`，不要再用 `.toFile().exists()`。
- 禁止空 catch；若确实忽略，变量命名 `ignored` 并限于明确可丢弃场景。
- 不要拼接日志字符串，不要吞掉工具执行异常。
- 不要把 Redis 不可用当致命错误；项目设计是自动降级。

## TESTS
- 框架：JUnit 5 + Spring Boot Test。
- 当前仅有 `src/test/java/com/nianer/comic/ComicApplicationTests.java`。
- 新增 controller/service 行为时补对应测试；需要 Redis 场景时覆盖启用和降级两条路径。

## ENV
| 变量 | 默认值 | 说明 |
|------|--------|------|
| `COMICS_ROOT_DIR` | `F:\games\comics` / 容器 `/comics` | 漫画根目录 |
| `HQ_SUB_DIR` | `h_photograph` | HQ 子目录 |
| `LQ_SUB_DIR` | `l_photograph` | LQ 子目录 |
| `CACHE_EXPIRATION` | `604800` | Redis TTL 秒 |
| `REDIS_HOST` | `localhost` / 容器 `redis` | Redis 主机 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `TOOL_ROOT_DIR` | `D:/projects/comics_develop/comics15/tools` | Go 工具根目录 |
