# 本地漫画阅读器

一个现代化的高性能本地漫画阅读器，支持图片和视频混合阅读，提供流畅的阅读体验。

## 技术栈

### 后端

- **框架**: Spring Boot 4.0.2
- **语言**: Java 21
- **缓存**: Redis 7.x (主缓存) + 文件系统降级
- **文档**: SpringDoc OpenAPI 3 (Swagger UI)
- **构建**: Maven
- **容器化**: Docker + Docker Compose
- **媒体处理**: 自然排序文件目录、智能图片加载

### 前端

- **语言**: Vanilla JavaScript (ES6+)
- **样式**: Tailwind CSS + 自定义动画
- **特性**: 响应式设计、图片懒加载、虚拟滚动、本地存储进度

## 核心特性

| 特性 | 描述 |
|------|------|
| 高性能缓存 | Redis 缓存 + 文件系统降级策略 |
| 智能图片加载 | HQ/LQ 双模式，双击加载原图 |
| 多媒体支持 | 图片和视频混合阅读 |
| 响应式设计 | 完美适配桌面端和移动端 |
| 阅读进度 | 自动保存本地存储 |
| 预加载系统 | 下一章元数据和图片预加载 |

## 支持格式

- **图片**: .jpg, .jpeg, .png, .webp
- **视频**: .mp4, .mov

## 快速开始

### 环境要求

| 依赖 | 版本要求 |
|------|----------|
| Java | JDK 21+ |
| Redis | 7.x |
| Docker | 20.10+ |
| Docker Compose | 2.0+ |

### Docker 部署 (推荐)

#### 1. 克隆项目

```bash
git clone <repository-url>
cd comics13
```

#### 2. 配置漫画目录

编辑 `docker-compose.yml` 中的漫画路径映射：

```yaml
volumes:
  - /path/to/your/comics:/comics:ro
```

#### 3. 启动服务

**开发环境** (带远程调试):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```

**生产环境** (资源优化):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

#### 4. 访问应用

| 服务 | 地址 |
|------|------|
| 前端界面 | http://localhost:5000 |
| Swagger API | http://localhost:500/swagger-ui.html |
| 远程调试 | port 5005 (仅开发环境) |

### 本地开发

1. **启动 Redis**

   ```bash
   docker run -p 6379:6379 redis:7-alpine
   ```

2. **启动后端**

   ```bash
   cd backend/comic
   ./mvnw spring-boot:run
   ```

3. **启动前端**

   ```bash
   cd frontend
   python -m http.server 8080
   # 或
   npx serve .
   ```

## 项目结构

```
comics13/
├── backend/
│   └── comic/
│       ├── pom.xml
│       └── src/main/java/com/nianer/comic/
│           ├── ComicApplication.java
│           ├── Controller/
│           │   └── ComicController.java
│           ├── Config/
│           │   └── ComicConfig.java
│           └── Component/
│               └── RedisValidator.java
├── frontend/
│   └── index.html
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── nginx.conf
└── AGENTS.md
```

## 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `REDIS_HOST` | localhost | Redis 服务器地址 |
| `REDIS_PORT` | 6379 | Redis 端口 |
| `COMICS_ROOT_DIR` | /comics | 漫画根目录 (容器内路径) |
| `HQ_SUB_DIR` | h_photograph | 高质量图片子目录 |
| `LQ_SUB_DIR` | l_photograph | 低质量 WebP 子目录 |
| `CACHE_EXPIRATION` | 604800 | 缓存过期时间(秒，默认7天) |

### 文件组织

```
COMICS_ROOT/
├── HQ_SUB_DIR/           # 默认: h_photograph/
│   └── {series}/
│       └── {chapter}/
│           ├── image001.jpg      # 原始高质量图片
│           ├── image002.png
│           ├── video001.mp4      # 视频文件
│           └── ...
└── LQ_SUB_DIR/           # 默认: l_photograph/
    └── {series}/
        └── {chapter}/
            ├── image001.webp     # WebP 格式低质量预览
            ├── image002.webp
            └── ...
```

### Nginx 静态文件服务

| 路径模式 | 映射目标 |
|----------|----------|
| `/hq_image/{series}/{chapter}/{filename}` | `/comics/h_photograph/{series}/{chapter}/{filename}` |
| `/video/{series}/{chapter}/{filename}` | `/comics/h_photograph/{series}/{chapter}/{filename}` |
| `/api/image/` | LQ 预览图动态服务 |

## API 接口

### 系列管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/series` | 获取所有漫画系列 |
| GET | `/api/chapters/{series}` | 获取指定系列的章节列表 |

### 文件服务

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/chapter/{series}?chapterPath={path}` | 获取章节文件列表 |
| GET | `/api/image/{series}/{filename}?chapterPath={path}` | 智能图片服务(LQ/HQ) |
| GET | `/hq_image/{series}/{chapter}/{filename}` | 高质量图片静态服务 |
| GET | `/video/{series}/{chapter}/{filename}` | 视频文件静态服务 |

## 开发指南

### 后端开发

```bash
cd backend/comic

# 编译
./mvnw clean compile

# 运行测试
./mvnw test

# 生成覆盖率报告
./mvnw test jacoco:report

# 打包
./mvnw clean package -DskipTests

# 运行应用
./mvnw spring-boot:run
```

### 前端开发

#### 核心功能模块

- **侧边栏管理**: 系列列表 + 章节树形结构
- **阅读器**: 图片/视频渲染，懒加载，缩放控制
- **预加载系统**: 下一章元数据 + 图片预加载
- **响应式布局**: 桌面端 + 移动端适配
- **状态管理**: 阅读进度，界面状态本地存储

#### 关键技术点

- **虚拟滚动**: 大文件列表分批加载 (每批5个文件)
- **智能缓存**: Redis 优先，文件系统降级
- **HQ/LQ 切换**: 双击图片加载高质量版本
- **键盘控制**: 方向键切换章节，Home 回顶部

## Docker 部署配置

### 环境配置文件

| 文件 | 用途 | 特点 |
|------|------|------|
| `docker-compose.yml` | 基础配置 | 定义所有服务的共同配置 |
| `docker-compose.dev.yml` | 开发环境 | 远程调试、热重载、调试友好 |
| `docker-compose.prod.yml` | 生产环境 | 资源限制、健康检查、优化镜像 |

### 常用命令

**启动服务**:

```bash
# 开发环境
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

# 生产环境
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

**停止服务**:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

**查看日志**:

```bash
# 开发环境
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# 生产环境
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

### 环境特性

**开发环境**:

- 远程调试: 端口 5005
- 热重载: 代码变更自动生效
- 详细日志: 完整的应用日志输出

**生产环境**:

- 资源限制: CPU 和内存使用上限
- 健康检查: 自动检测服务健康状态
- 自动重启: 服务异常时自动重启
- Redis 优化: LRU 缓存策略，内存限制 256MB

## 测试

```bash
# 运行所有测试
./mvnw test

# 运行特定测试类
./mvnw test -Dtest=ComicApplicationTests

# 集成测试
./mvnw verify
```

### 测试覆盖范围

1. Controller 方法单元测试
2. Redis 缓存行为测试
3. 文件系统降级测试
4. Swagger 文档完整性测试
5. Docker 容器化测试

## 常见问题

### 图片加载失败

1. 确认漫画目录路径配置正确
2. 验证 HQ_SUB_DIR 和 LQ_SUB_DIR 目录是否存在对应文件
3. 检查 Redis 连接状态
4. 查看 Nginx 配置是否正确映射静态文件路径

### 移动端侧边栏无法显示

1. 检查 CSS 媒体查询配置
2. 验证触摸事件处理
3. 检查 viewport meta 标签设置

### 双击图片无法加载 HQ 版本

1. 确认 HQ 图片文件存在于 `h_photograph` 目录
2. 验证 Nginx `/hq_image/` 路径映射
3. 检查图片文件格式支持 (.jpg, .jpeg, .png, .webp)

### Redis 连接失败

1. 确认 Redis 服务运行状态
2. 检查网络连接和防火墙设置
3. 验证 Redis 连接参数配置
4. 系统会自动降级到文件系统缓存

### 视频无法播放

1. 确认视频文件存放在 `h_photograph` 目录
2. 验证 Nginx `/video/` 路径映射和 CORS 配置
3. 检查视频文件格式支持 (.mp4, .mov)

## 配置优化建议

- **内存**: Java 堆内存建议 1GB+，根据漫画文件数量调整
- **Redis**: 根据缓存数据量调整 maxmemory 策略
- **Nginx**: 已启用 gzip 压缩和静态文件缓存
- **存储**: 使用 SSD 提升文件读取性能

## 代码规范

### 后端规范

- **包结构**: `com.nianer.comic.*`
- **命名**: 类 PascalCase，方法和变量 camelCase，常量 UPPER_SNAKE_CASE
- **注解**: 使用 Lombok (`@Slf4j`, `@Data`, `@Builder`)
- **API**: 完整的 Swagger/OpenAPI 注解，中文描述
- **错误处理**: 文件存在性验证，适当 HTTP 状态码，结构化日志

### 前端规范

- **语法**: ES6+ (async/await, 箭头函数，解构)
- **样式**: Tailwind CSS，CSS 类名使用 kebab-case
- **性能**: 图片懒加载，虚拟滚动，本地存储进度
- **命名**: 变量和函数 camelCase，DOM 元素以 `El` 结尾

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范

- 遵循现有代码风格和架构模式
- 新功能必须包含完整测试用例
- 更新相关 API 文档
- 确保 Docker 部署正常工作
- 保持中文注释和文档

## 相关资源

- **开发者指南**: [AGENTS.md](AGENTS.md)
- **Swagger API**: http://localhost:500/swagger-ui.html (运行时)
- **问题反馈**: 创建 Issue

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

如果这个项目对您有帮助，请给个 Star！        