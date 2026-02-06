# 本地漫画阅读器

一个基于 Spring Boot 4.0.2 + Java 21 后端，vanilla JavaScript + Tailwind CSS 前端，Redis 缓存的现代化本地漫画阅读器。支持图片和视频文件的智能加载，提供高质量的阅读体验。

## 🏗️ 技术架构

### 后端技术栈
- **框架**: Spring Boot 4.0.2
- **Java版本**: Java 21
- **缓存**: Redis 7.x (主缓存) + 文件系统降级
- **文档**: SpringDoc OpenAPI 3 (Swagger UI)
- **构建工具**: Maven
- **容器化**: Docker + Docker Compose
- **媒体处理**: 自然排序文件目录、智能图片加载

### 前端技术栈
- **语言**: Vanilla JavaScript (ES6+)
- **样式**: Tailwind CSS + 自定义动画
- **特性**: 响应式设计、图片懒加载、虚拟滚动、本地存储进度
- **支持格式**: 图片 (.jpg, .jpeg, .png, .webp)、视频 (.mp4, .mov)

### 核心特性
- 🚀 **高性能**: Redis 缓存 + 文件系统降级策略
- 📱 **响应式**: 桌面端 + 移动端完美适配
- 🖼️ **智能加载**: HQ/LQ 图片智能选择，双击加载原图
- 🎬 **多媒体支持**: 图片 + 视频文件混合阅读
- 🔍 **自然排序**: 章节和文件按自然顺序排列
- 💾 **阅读进度**: 本地存储阅读状态
- ⚡ **预加载**: 下一章元数据和图片预加载

## 📁 项目结构

```
comics11/
├── backend/
│   └── comic/
│       ├── pom.xml                    # Maven 配置
│       └── src/main/java/com/nianer/comic/
│           ├── ComicApplication.java   # Spring Boot 启动类
│           ├── Controller/
│           │   └── ComicController.java # REST API 控制器
│           ├── Config/
│           │   └── ComicConfig.java    # 配置类
│           └── Component/
│               └── RedisValidator.java # Redis 健康检查
├── frontend/
│   └── index.html                     # 单页应用入口
├── docker-compose.yml                 # 容器编排配置
├── nginx.conf                         # Nginx 静态文件服务配置
└── AGENTS.md                          # 开发者指南
```

## 🚀 快速开始

### 环境要求
- **Java**: JDK 21+
- **Node.js**: 16+ (可选，用于前端开发)
- **Redis**: 7.x
- **Docker**: 20.10+ & Docker Compose 2.0+

### 方法一: Docker 部署 (推荐)

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd comics11
   ```

2. **配置漫画目录**
   
   编辑 `docker-compose.yml` 中的漫画路径映射：
   ```yaml
   volumes:
     - /path/to/your/comics:/comics:ro
   ```

3. **启动所有服务**
   ```bash
   docker compose up --build -d
   ```

4. **访问应用**
   - 前端界面: http://localhost:5000
   - Swagger API: http://localhost:500/swagger-ui.html

### 方法二: 本地开发

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

4. **访问应用**
   - 前端界面: http://localhost:8080
   - 后端API: http://localhost:500/swagger-ui.html

## ⚙️ 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `REDIS_HOST` | `localhost` | Redis 服务器地址 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `COMICS_ROOT_DIR` | `/comics` | 漫画根目录 (容器内路径) |
| `HQ_SUB_DIR` | `h_photograph` | 高质量图片子目录 |
| `LQ_SUB_DIR` | `l_photograph` | 低质量 WebP 子目录 |
| `CACHE_EXPIRATION` | `604800` | 缓存过期时间(秒，默认7天) |

### 文件组织结构

```
COMICS_ROOT/
├── HQ_SUB_DIR/           # 默认: h_photograph/
│   └── {series}/
│       └── {chapter}/
│           ├── image001.jpg      # 原始高质量图片
│           ├── image002.png
│           ├── video001.mp4      # 视频文件也存放在HQ目录
│           └── ...
└── LQ_SUB_DIR/           # 默认: l_photograph/
    └── {series}/
        └── {chapter}/
            ├── image001.webp     # WebP 格式的低质量预览图
            ├── image002.webp
            └── ...
```

### Nginx 静态文件服务

- **HQ 图片**: `/hq_image/{series}/{chapter}/{filename}` → `/comics/h_photograph/{series}/{chapter}/{filename}`
- **视频文件**: `/video/{series}/{chapter}/{filename}` → `/comics/h_photograph/{series}/{chapter}/{filename}`
- **LQ 预览**: 通过 Spring Boot API 动态提供 `/api/image/` 路径

## 🔧 开发指南

### 后端开发

#### 编译和测试
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

#### 代码规范
- **包结构**: `com.nianer.comic.*`
- **命名**: 类 PascalCase，方法和变量 camelCase，常量 UPPER_SNAKE_CASE
- **注解**: 使用 Lombok (`@Slf4j`, `@Data`, `@Builder`)
- **API**: 完整的 Swagger/OpenAPI 注解，中文描述
- **错误处理**: 文件存在性验证，适当 HTTP 状态码，结构化日志

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

### API 接口

#### 系列管理
- `GET /api/series` - 获取所有漫画系列
- `GET /api/chapters/{series}` - 获取指定系列的章节列表

#### 文件服务
- `GET /api/chapter/{series}?chapterPath={path}` - 获取章节文件列表
- `GET /api/image/{series}/{filename}?chapterPath={path}` - 智能图片服务(LQ/HQ)
- `GET /hq_image/{series}/{chapter}/{filename}` - 高质量图片静态服务
- `GET /video/{series}/{chapter}/{filename}` - 视频文件静态服务

## 🧪 测试

### 运行所有测试
```bash
./mvnw test
```

### 运行特定测试类
```bash
./mvnw test -Dtest=ComicApplicationTests
```

### 集成测试
```bash
./mvnw verify
```

### 测试覆盖的新功能
1. Controller 方法单元测试
2. Redis 缓存行为测试  
3. 文件系统降级测试
4. Swagger 文档完整性测试
5. Docker 容器化测试

## 📦 部署

### Docker 生产部署

1. **构建生产镜像**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
   ```

2. **服务健康检查**
   ```bash
   docker compose ps
   docker compose logs -f
   ```

3. **更新部署**
   ```bash
   # 停止并移除旧容器
   docker compose down
   
   # 重建镜像并启动新服务  
   docker compose up --build -d
   ```

### 配置优化建议
- **内存**: Java 堆内存建议 1GB+，根据漫画文件数量调整
- **Redis**: 根据缓存数据量调整 maxmemory 策略
- **Nginx**: 已启用 gzip 压缩和静态文件缓存
- **存储**: 使用 SSD 提升文件读取性能

## 🐛 常见问题

### Q: 图片加载失败
**A**: 检查以下几点：
1. 确认漫画目录路径配置正确
2. 验证 HQ_SUB_DIR 和 LQ_SUB_DIR 目录是否存在对应文件
3. 检查 Redis 连接状态
4. 查看 Nginx 配置是否正确映射静态文件路径

### Q: 移动端侧边栏无法显示
**A**: 确认以下设置：
1. 检查 CSS 媒体查询配置
2. 验证触摸事件处理
3. 检查 viewport meta 标签设置

### Q: 双击图片无法加载 HQ 版本
**A**: 检查配置：
1. 确认 HQ 图片文件存在于 `h_photograph` 目录
2. 验证 Nginx `/hq_image/` 路径映射
3. 检查图片文件格式支持 (.jpg, .jpeg, .png, .webp)

### Q: Redis 连接失败
**A**: 排查步骤：
1. 确认 Redis 服务运行状态
2. 检查网络连接和防火墙设置
3. 验证 Redis 连接参数配置
4. 系统会自动降级到文件系统缓存

### Q: 视频无法播放
**A**: 检查配置：
1. 确认视频文件存放在 `h_photograph` 目录
2. 验证 Nginx `/video/` 路径映射和 CORS 配置
3. 检查视频文件格式支持 (.mp4, .mov)

## 🤝 贡献指南

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

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 创建 Issue
- 提交 Pull Request
- 查看 [AGENTS.md](AGENTS.md) 获取详细开发指南

---

⭐ 如果这个项目对您有帮助，请给个 Star！        