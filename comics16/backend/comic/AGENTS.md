# Backend - Comic 模块开发指南

**位置**: `backend/comic/`  
**技术栈**: Spring Boot 4.0.2 + Java 21 + Redis 7.x + Lombok

## 模块概述
Spring Boot 后端核心模块，提供漫画系列扫描、章节索引、图片/视频流媒体服务。

## 目录结构
```
comic/
├── pom.xml                     # Maven 配置 (Spring Boot 4.0.2, Java 21)
├── Dockerfile                  # 容器化构建配置
├── src/main/java/com/nianer/comic/
│   ├── ComicApplication.java   # Spring Boot 启动类
│   ├── Controller/
│   │   └── ComicController.java    # REST API 控制器 (所有端点)
│   ├── Config/
│   │   └── ComicConfig.java        # @ConfigurationProperties 配置绑定
│   └── Component/
│       └── RedisValidator.java     # Redis 连接检测 + 降级开关
├── src/main/resources/
│   └── application.yml         # 应用配置 (端口、Redis、漫画路径)
└── src/test/java/com/nianer/comic/
    └── ComicApplicationTests.java  # 单元测试
```

## 核心组件

### ComicController (298 行)
**职责**: 漫画资源管理 + API 端点

| 端点 | 方法 | 描述 | 缓存键 |
|------|------|------|--------|
| `GET /api/series` | listSeries() | 扫描 HQ 根目录获取漫画系列 | `series_list` |
| `GET /api/chapters/{seriesName}` | listChapters() | 递归扫描章节 | `chapters_list:{series}` |
| `GET /api/chapter/{seriesName}` | listChapterFiles() | 获取章节文件列表 | `chapter_files:{series}:{chapter}` |
| `GET /api/image/{seriesName}/{filename}` | serveImage() | 智能图片服务 (LQ 优先，HQ 降级) | 无 (直接文件流) |

**关键逻辑**:
- 自然排序：使用 `CaseInsensitiveSimpleNaturalComparator`
- 递归章节发现：`findChaptersRecursive()` 方法
- LQ/HQ 降级：优先返回 WebP，不存在则回退原图
- 支持格式：`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.mp4`, `.mov`

### ComicConfig (28 行)
**职责**: 类型安全配置绑定

```java
@ConfigurationProperties(prefix = "comic")
// 绑定配置：
// comic.root-dir, hq-sub-dir, lq-sub-dir, cache-expiration
// 提供 getHqPath() 和 getLqPath() 辅助方法
```

### RedisValidator (55 行)
**职责**: Redis 可用性检测 + 降级开关

```java
@PostConstruct
public void validateRedisConnection() {
    // PING 测试 → REDIS_ENABLED 静态开关
    // true: 使用 Redis 缓存
    // false: 降级到文件系统扫描
}
```

## 配置说明

### application.yml
```yaml
server:
  port: 500
comic:
  root-dir: ${COMICS_ROOT_DIR:E:/comics}
  hq-sub-dir: ${HQ_SUB_DIR:h_photograph}
  lq-sub-dir: ${LQ_SUB_DIR:l_photograph}
  cache-expiration: ${CACHE_EXPIRATION:604800}  # 7 天
spring:
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      database: 1
```

### 环境变量
| 变量 | 默认值 | 说明 |
|------|--------|------|
| `REDIS_HOST` | localhost | Redis 服务器地址 |
| `REDIS_PORT` | 6379 | Redis 端口 |
| `COMICS_ROOT_DIR` | E:/comics | 漫画根目录 (物理路径) |
| `HQ_SUB_DIR` | h_photograph | 高质量图片子目录 |
| `LQ_SUB_DIR` | l_photograph | 低质量 WebP 子目录 |
| `CACHE_EXPIRATION` | 604800 | 缓存过期时间 (秒) |

## 缓存策略

### 缓存键模式
- `series_list` - 漫画系列列表
- `chapters_list:{seriesName}` - 系列章节列表
- `chapter_files:{seriesName}:{chapterPath}` - 章节文件列表

### 降级逻辑
```
Redis 可用 → 读取缓存 → 未命中 → 扫描文件系统 → 写入缓存
Redis 不可用 → 直接扫描文件系统 (无缓存)
```

## 开发规范

### 必须遵守
- **Swagger 注解**: 所有 API 必须包含 `@Operation` (中文描述), `@Parameter`, `@ApiResponse`
- **Lombok**: 必须使用 `@Slf4j` (日志), `@Data` (getter/setter), `@Builder` (构建器)
- **导入顺序**: `java.*` → `jakarta.*` → `org.*` → `com.*` → `static` (组间空行)
- **日志**: 使用 `log.info("消息：{}", 变量)` 占位符，禁止 `"消息：" + 变量`
- **REST 响应**: 返回 `ResponseEntity<T>` 或具体类型，统一错误结构

### 禁止模式
- ❌ `catch (Exception e) {}` - 空异常捕获
- ❌ 使用 `File` 类 - 强制 NIO `Path`/`Files`
- ❌ 日志字符串拼接
- ❌ 抑制类型错误 (`@SuppressWarnings` 滥用)

### 异常处理
```java
// 推荐：自定义业务异常 + 全局异常处理器
try {
    // 业务逻辑
} catch (IOException e) {
    log.error("文件操作失败：{}", e.getMessage());
    throw new ResourceNotFoundException("文件不存在");
}
```

## 测试指南

### 运行测试
```bash
./mvnw test                           # 所有测试
./mvnw test -Dtest=ComicApplicationTests  # 单个测试类
./mvnw test jacoco:report            # 生成覆盖率报告
```

### 测试要求
新功能必须包含:
1. Controller 方法单元测试 (`@WebMvcTest`)
2. Redis 缓存行为测试 (`@DataRedisTest`)
3. 文件系统降级测试
4. Swagger 文档完整性验证

### 测试示例
```java
@SpringBootTest
class ComicApplicationTests {
    @Test
    void contextLoads() {
        // Spring 上下文加载测试
    }
}
```

## 构建命令
```bash
./mvnw clean compile          # 编译
./mvnw clean package          # 打包 (含测试)
./mvnw clean package -DskipTests  # 跳过测试打包
./mvnw spring-boot:run        # 直接运行
```

## Docker 构建
```bash
# 从项目根目录
docker compose up --build -d

# 开发环境 (带远程调试端口 5005)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

# 生产环境 (资源限制 + 健康检查)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## 常见问题

### Redis 连接失败
- 检查 Redis 服务状态
- 验证 `REDIS_HOST` 和 `REDIS_PORT` 环境变量
- 系统自动降级到文件系统模式 (查看日志确认)

### 图片加载 404
- 确认 HQ/LQ 目录结构正确
- 检查 `COMICS_ROOT_DIR` 路径映射
- 验证 Nginx `/hq_image/` 和 `/video/` 路由配置

### 缓存未更新
- 调整 `CACHE_EXPIRATION` 环境变量
- 手动清除 Redis 键：`redis-cli DEL series_list`
- 重启应用强制刷新缓存

## 已知问题
1. **RedisValidator 第 50 行**: `catch (Exception e)` 应改为具体异常类型
2. **测试覆盖率低**: 仅有 `contextLoads()` 基础测试
3. **无集成测试**: 缺少端到端 API 测试
4. **无 CI/CD 配置**: 未配置 GitHub Actions

## 快速查找
| 任务 | 位置 | 说明 |
|------|------|------|
| 添加 API 接口 | `ComicController.java` | 需添加 Swagger 注解 |
| 修改缓存行为 | `ComicConfig.java` | 调整过期时间 |
| 修改 Redis 降级逻辑 | `RedisValidator.java` | 启动时检测 Redis 可用性 |

## 项目层级
```
./AGENTS.md (根)
└── backend/comic/AGENTS.md (本文件 - 208 行)
```
## 相关文档
- 根目录 [`../../AGENTS.md`](../../AGENTS.md) - 项目全局指南
- [`../../README.md`](../../README.md) - 项目说明
- Swagger UI: `http://localhost:500/swagger-ui.html` (运行时)
